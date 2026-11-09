
import os
from datetime import datetime, timezone
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.ai_exam_generation import generate_ai_exam
from app.sentence_construction_generation import (
    generate_sentence_construction_exam,
)
import logging

logger = logging.getLogger(__name__)
from app.classes import require_institution_admin
from app.sentence_construction_evaluation import (
    evaluate_submitted_sentence_construction_answer,
)

from sqlalchemy import func
from app.database import get_db
from app.models import (
    Attempt,
    RetestPermission,
    ClassEnrollment,
    ClassSubject,
    Evaluation,
    Exam,
    ExamClassAssignment,
    ExamClassSubjectAssignment,
    ExamQuestion,
    Institution,
    Passage,
    Question,
    SchoolClass,
    StudentAnswer,
    ExamQuestion,
    ExamQuestionGroup,
    Subject,
    User,
    ClassSubjectEnrollment,
)
from app.evaluation_service import evaluate_submitted_answer
router = APIRouter(
    prefix="/api/exams",
    tags=["Exams"],
)
from app.sentence_construction_evaluation import (
    evaluate_submitted_sentence_construction_answer,
)

bearer_scheme = HTTPBearer(auto_error=False)

class ExamQuestionCreate(BaseModel):
    question_id: int = Field(gt=0)
    marks_override: int | None = Field(default=None, gt=0)

class ExamQuestionGroupPartCreate(BaseModel):
    """An existing question assigned as a part of a grouped question."""

    question_id: int = Field(gt=0)

    marks_override: int | None = Field(
        default=None,
        gt=0,
    )


class ExamQuestionGroupCreate(BaseModel):
    """Create a parent question with multiple independently assessed parts."""

    prompt: str = Field(
        min_length=1,
        max_length=10000,
    )

    parts: list[ExamQuestionGroupPartCreate] = Field(
        min_length=2,
        max_length=26,
    )

class StudentAnswerSave(BaseModel):
    answer_text: str = Field(max_length=20000)

class ExamCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    subject: str = Field(
        default="English Language",
        min_length=2,
        max_length=100,
    )
    level: str | None = Field(default=None, max_length=50)
    instructions: str | None = None
    duration_minutes: int | None = Field(default=None, gt=0, le=600)
    class_subject_id: int = Field(gt=0)

class AIQuestionTypeConfig(BaseModel):
    question_type: str = Field(min_length=2, max_length=50)
    count: int = Field(gt=0, le=100)
    marks_per_question: int = Field(ge=1, le=100)


class AIPassageBlueprint(BaseModel):
    question_types: list[AIQuestionTypeConfig] = Field(min_length=1)

class SentenceConstructionWord(BaseModel):
    word: str = Field(
        min_length=1,
        max_length=100,
    )

    intended_meaning: str | None = Field(
        default=None,
        max_length=1000,
    )


class SentenceConstructionExamRequest(BaseModel):
    class_subject_id: int = Field(gt=0)

    level: str = Field(
        min_length=1,
        max_length=50,
    )

    difficulty: str = Field(
        min_length=1,
        max_length=30,
    )

    # Words supplied by the teacher or selected from saved lists.
    teacher_words: list[SentenceConstructionWord] = Field(
        default_factory=list,
        max_length=100,
    )

    # Additional words to be selected by AI.
    ai_generated_count: int = Field(
        default=0,
        ge=0,
        le=100,
    )

class AIGenerateExamRequest(BaseModel):
    class_subject_id: int = Field(gt=0)

    level: str = Field(min_length=1, max_length=50)
    topic: str = Field(min_length=2, max_length=500)

    include_passages: bool

    passage_count: int = Field(default=0, ge=0, le=10)

    # Used when include_passages is True.
    passages: list[AIPassageBlueprint] = Field(default_factory=list)

    # Used when include_passages is False.
    standalone_question_types: list[AIQuestionTypeConfig] = Field(
        default_factory=list
    )

VALID_AI_QUESTION_TYPES = {
    "Short answer",
    "Inference",
    "Multiple choice",
    "Language analysis",
    "Vocabulary",
    "Extended response",
}
def validate_sentence_construction_exam_request(
    request: SentenceConstructionExamRequest,
) -> int:
    """Validate the vocabulary blueprint for a sentence construction exam."""

    teacher_words = [
        item.word.strip()
        for item in request.teacher_words
    ]

    # Every teacher-provided word must contain actual text.
    if any(not word for word in teacher_words):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Teacher-provided vocabulary words cannot be empty.",
        )

    # Prevent duplicate teacher-provided vocabulary.
    normalised_words = [
        word.casefold()
        for word in teacher_words
    ]

    if len(normalised_words) != len(set(normalised_words)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Duplicate vocabulary words are not allowed.",
        )

    total_questions = (
        len(teacher_words) + request.ai_generated_count
    )

    if total_questions < 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Add at least one vocabulary word or request AI-generated words.",
        )

    if total_questions > 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="An examination cannot contain more than 100 questions.",
        )

    return total_questions


def validate_ai_exam_request(request: AIGenerateExamRequest):
    """Validate the teacher's AI examination blueprint."""

    if request.include_passages:
        if request.passage_count < 1:
            raise HTTPException(
                status_code=422,
                detail="At least one passage is required.",
            )

        if len(request.passages) != request.passage_count:
            raise HTTPException(
                status_code=422,
                detail="Passage count does not match the passage configuration.",
            )

        if request.standalone_question_types:
            raise HTTPException(
                status_code=422,
                detail="Standalone questions cannot be configured when passages are enabled.",
            )

        question_groups = [
            passage.question_types
            for passage in request.passages
        ]

    else:
        if request.passage_count != 0 or request.passages:
            raise HTTPException(
                status_code=422,
                detail="Passage configuration must be empty when passages are disabled.",
            )

        if not request.standalone_question_types:
            raise HTTPException(
                status_code=422,
                detail="At least one question type must be selected.",
            )

        question_groups = [request.standalone_question_types]

    total_questions = 0

    for group_index, question_types in enumerate(question_groups):

        if not question_types:
            raise HTTPException(
                status_code=422,
                detail=f"Question types are missing from configuration {group_index + 1}.",
            )

        selected_types = set()

        for item in question_types:

            if item.question_type not in VALID_AI_QUESTION_TYPES:
                raise HTTPException(
                    status_code=422,
                    detail=f"Unsupported question type: {item.question_type}",
                )

            if item.question_type in selected_types:
                raise HTTPException(
                    status_code=422,
                    detail=f"Duplicate question type: {item.question_type}",
                )

            selected_types.add(item.question_type)
            total_questions += item.count

    if total_questions > 30:
        raise HTTPException(
            status_code=422,
            detail="An AI-generated examination cannot exceed 100 questions.",
        )

    return total_questions

def require_institution_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Authenticate an active teacher or institution administrator."""

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    secret_key = os.getenv("JWT_SECRET_KEY")
    if not secret_key:
        raise RuntimeError("JWT_SECRET_KEY is not configured.")

    try:
        payload = jwt.decode(
            credentials.credentials,
            secret_key,
            algorithms=["HS256"],
        )
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )

    user = db.get(User, user_id)

    if (
        user is None
        or not user.is_active
        or user.role not in {"teacher", "admin"}
        or user.institution_id is None
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Institution access required.",
        )

    institution = db.get(Institution, user.institution_id)

    if institution is None or not institution.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your institution is inactive.",
        )

    return user


def require_student_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Authenticate an active student belonging to an active institution."""

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    secret_key = os.getenv("JWT_SECRET_KEY")
    if not secret_key:
        raise RuntimeError("JWT_SECRET_KEY is not configured.")

    try:
        payload = jwt.decode(
            credentials.credentials,
            secret_key,
            algorithms=["HS256"],
        )
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )

    user = db.get(User, user_id)

    if (
        user is None
        or not user.is_active
        or user.role != "student"
        or user.institution_id is None
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active student access required.",
        )

    institution = db.get(Institution, user.institution_id)

    if institution is None or not institution.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your institution is inactive.",
        )

    return user

def exam_to_dict(exam: Exam) -> dict:
    return {
        "id": exam.id,
        "title": exam.title,
        "subject": exam.subject,
        "exam_type": exam.exam_type,
        "level": exam.level,
        "instructions": exam.instructions,
        "duration_minutes": exam.duration_minutes,
        "status": exam.status,
        "institution_id": exam.institution_id,
        "created_by_user_id": exam.created_by_user_id,
        "published_at": exam.published_at,
        "created_at": exam.created_at,
        "updated_at": exam.updated_at,
    }


@router.get("")
def list_exams(
    db: Session = Depends(get_db),
    user: User = Depends(require_institution_user),
):
    """List exams assigned to the logged-in user's subjects."""

    statement = select(Exam).where(
        Exam.institution_id == user.institution_id
    )

    # Teachers only see exams assigned to subjects they currently teach.
    if user.role == "teacher":
        statement = (
            statement
            .join(
                ExamClassSubjectAssignment,
                ExamClassSubjectAssignment.exam_id == Exam.id,
            )
            .join(
                ClassSubject,
                ClassSubject.id
                == ExamClassSubjectAssignment.class_subject_id,
            )
            .join(
                SchoolClass,
                SchoolClass.id == ClassSubject.class_id,
            )
            .join(
                Subject,
                Subject.id == ClassSubject.subject_id,
            )
            .where(
                ClassSubject.teacher_id == user.id,
                SchoolClass.institution_id == user.institution_id,
                Subject.institution_id == user.institution_id,
            )
            .distinct()
        )

    exams = db.scalars(
        statement.order_by(Exam.id.desc())
    ).all()

    return {
        "items": [exam_to_dict(exam) for exam in exams]
    }



@router.post(
    "/{exam_id}/students/{student_id}/allow-retest",
    status_code=status.HTTP_201_CREATED,
)
def allow_student_retest(
    exam_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_institution_user),
):
    """Grant a student permission to retake a submitted examination."""

    # 1. Verify that the examination belongs to this institution.
    exam = db.scalar(
        select(Exam).where(
            Exam.id == exam_id,
            Exam.institution_id == user.institution_id,
        )
    )

    if exam is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Examination not found.",
        )

    # 2. Verify that the student belongs to this institution.
    student = db.scalar(
        select(User).where(
            User.id == student_id,
            User.institution_id == user.institution_id,
            User.role == "student",
            User.is_active.is_(True),
        )
    )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found in your institution.",
        )

    # 3. Verify that the student is enrolled in a class subject
    # to which this examination is assigned.
    access_query = (
        select(ClassSubject.id)
        .join(
            SchoolClass,
            SchoolClass.id == ClassSubject.class_id,
        )
        .join(
            Subject,
            Subject.id == ClassSubject.subject_id,
        )
        .join(
            ExamClassSubjectAssignment,
            ExamClassSubjectAssignment.class_subject_id
            == ClassSubject.id,
        )
        .join(
            ClassSubjectEnrollment,
            ClassSubjectEnrollment.class_subject_id
            == ClassSubject.id,
        )
        .where(
            ExamClassSubjectAssignment.exam_id == exam.id,
            ClassSubjectEnrollment.student_id == student.id,
            SchoolClass.institution_id == user.institution_id,
            Subject.institution_id == user.institution_id,
        )
    )

    # Teachers can only grant retests for subjects they currently teach.
    if user.role == "teacher":
        access_query = access_query.where(
            ClassSubject.teacher_id == user.id
        )
    elif user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not permitted to grant retests.",
        )

    eligible_class_subject = db.scalar(access_query.limit(1))

    if eligible_class_subject is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "The student is not enrolled in a class subject "
                "assigned to this examination, or you are not "
                "authorised to manage it."
            ),
        )

    # 4. Ensure that the student has already submitted this examination.
    submitted_attempt = db.scalar(
        select(Attempt.id)
        .where(
            Attempt.exam_id == exam.id,
            Attempt.user_id == student.id,
            Attempt.status == "submitted",
        )
        .limit(1)
    )

    if submitted_attempt is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The student has not submitted this examination yet.",
        )

    # 5. Prevent duplicate unused retest permissions.
    existing_permission = db.scalar(
        select(RetestPermission).where(
            RetestPermission.exam_id == exam.id,
            RetestPermission.student_id == student.id,
            RetestPermission.used_at.is_(None),
        )
    )

    if existing_permission is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An unused retest permission already exists for this student.",
        )

    # 6. Create the permission.
    permission = RetestPermission(
        student_id=student.id,
        exam_id=exam.id,
        granted_by_user_id=user.id,
    )

    db.add(permission)

    try:
        db.commit()
        db.refresh(permission)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A retest permission already exists for this student.",
        )

    return {
        "message": "Retest permission granted successfully.",
        "permission_id": permission.id,
        "student_id": student.id,
        "student_name": student.full_name,
        "exam_id": exam.id,
        "exam_title": exam.title,
        "granted_at": permission.granted_at,
    }


@router.get("/teacher/results")
def get_teacher_student_results(
    db: Session = Depends(get_db),
    user: User = Depends(require_institution_user),
):
    """Return submitted student results for subjects currently taught by the user."""

    statement = (
        select(
            Attempt,
            Exam,
            User,
            ClassSubject,
            SchoolClass,
            Subject,
        )
        .join(
            Exam,
            Exam.id == Attempt.exam_id,
        )
        .join(
            User,
            User.id == Attempt.user_id,
        )
        .join(
            ExamClassSubjectAssignment,
            ExamClassSubjectAssignment.exam_id == Exam.id,
        )
        .join(
            ClassSubject,
            ClassSubject.id
            == ExamClassSubjectAssignment.class_subject_id,
        )
        .join(
            SchoolClass,
            SchoolClass.id == ClassSubject.class_id,
        )
        .join(
            Subject,
            Subject.id == ClassSubject.subject_id,
        )
        .where(
            Exam.institution_id == user.institution_id,
            Attempt.status == "submitted",
            SchoolClass.institution_id == user.institution_id,
            Subject.institution_id == user.institution_id,
        )
    )

    # Teachers only see results for their currently assigned subjects.
    if user.role == "teacher":
        statement = statement.where(
            ClassSubject.teacher_id == user.id
        )

    rows = db.execute(
        statement.order_by(Attempt.submitted_at.desc())
    ).all()

    if not rows:
        return {"items": []}

    # Keep one result entry per attempt.
    attempts_by_id = {}

    for row in rows:
        attempt = row[0]
        attempts_by_id.setdefault(attempt.id, row)

    attempt_ids = list(attempts_by_id.keys())

    # Retrieve all submitted answers.
    answers = db.scalars(
        select(StudentAnswer)
        .where(StudentAnswer.attempt_id.in_(attempt_ids))
        .order_by(
            StudentAnswer.attempt_id,
            StudentAnswer.id,
        )
    ).all()

    answer_ids = [answer.id for answer in answers]

    # Retrieve evaluations associated with those answers.
    evaluations = []

    if answer_ids:
        evaluations = db.scalars(
            select(Evaluation).where(
                Evaluation.student_answer_id.in_(answer_ids)
            )
        ).all()

    evaluation_by_answer = {
        evaluation.student_answer_id: evaluation
        for evaluation in evaluations
    }

    answers_by_attempt = {}

    for answer in answers:
        answers_by_attempt.setdefault(
            answer.attempt_id, []
        ).append(answer)

    items = []

    for attempt_id, row in attempts_by_id.items():
        (
            attempt,
            exam,
            student,
            class_subject,
            school_class,
            subject,
        ) = row

        attempt_answers = answers_by_attempt.get(
            attempt_id, []
        )

        question_results = []

        completed = 0
        failed = 0
        pending = 0
        total_marks_awarded = 0
        total_max_marks = 0

        for answer in attempt_answers:
            evaluation = evaluation_by_answer.get(answer.id)

            snapshot = answer.submitted_snapshot or {}
            question_snapshot = snapshot.get("question", {})

            max_marks = (
                evaluation.max_marks
                if evaluation and evaluation.max_marks is not None
                else question_snapshot.get("marks", 0)
            )

            marks_awarded = None
            evaluation_status = (
                evaluation.status if evaluation else "pending"
            )

            if evaluation_status == "completed":
                completed += 1
                marks_awarded = evaluation.marks_awarded or 0
                total_marks_awarded += marks_awarded

            elif evaluation_status == "failed":
                failed += 1

            else:
                pending += 1

            total_max_marks += max_marks or 0

            
            question_results.append({
                "question_id": answer.question_id,
                "position": snapshot.get("position"),
                "prompt": question_snapshot.get("prompt"),
                "answer_text": snapshot.get(
                    "answer_text",
                    answer.answer_text,
                ),
                "reference_answer": question_snapshot.get("correct_answer"),
                "marking_criteria": question_snapshot.get("marking_criteria") or [],

                "evaluation_status": evaluation_status,
                "marks_awarded": marks_awarded,
                "max_marks": max_marks,

                "criterion_results": (
                    evaluation.criterion_results or []
                    if evaluation else []
                ),

                "feedback": (
                    evaluation.feedback
                    if evaluation else None
                ),

                # Sentence Construction assessment data
                "sentence_construction_data": (
                    question_snapshot.get("sentence_construction_data")
                ),
                "group_id": question_snapshot.get("group_id"),
                "group_prompt": question_snapshot.get("group_prompt"),
                "part_label": question_snapshot.get("part_label"),

                "sentence_construction_evaluation": (
                    evaluation.output_json
                    if (
                        evaluation
                        and isinstance(evaluation.output_json, dict)
                    )
                    else None
                ),
            })


        question_results.sort(
            key=lambda item: (
                item["position"] is None,
                item["position"] or 0,
            )
        )
        # Calculate display numbering, treating each group as one question.
        group_display_numbers = {}
        next_display_number = 0

        for item in question_results:
            group_id = item["group_id"]

            if group_id is not None:
                if group_id not in group_display_numbers:
                    next_display_number += 1
                    group_display_numbers[group_id] = next_display_number

                item["display_number"] = group_display_numbers[group_id]

            else:
                next_display_number += 1
                item["display_number"] = next_display_number

        if failed:
            overall_evaluation_status = "failed"
        elif pending:
            overall_evaluation_status = "pending"
        else:
            overall_evaluation_status = "completed"

        items.append({
            "attempt_id": attempt.id,
            "exam_id": exam.id,
            "exam_title": exam.title,
            "subject_name": subject.name,
            "class_name": school_class.name,
            "student_id": student.id,
            "student_name": student.full_name,
            "student_email": student.email,
            "attempt_status": attempt.status,
            "started_at": attempt.started_at,
            "submitted_at": attempt.submitted_at,
            "evaluation_status": overall_evaluation_status,
            "evaluation_summary": {
                "total": len(attempt_answers),
                "completed": completed,
                "failed": failed,
                "pending": pending,
                "marks_awarded": total_marks_awarded,
                "max_marks": total_max_marks,
            },
            "question_results": question_results,
        })

    return {"items": items}


@router.get("/institution/results")
def get_institution_student_results(
    db: Session = Depends(get_db),
    user: User = Depends(require_institution_admin),
):
    """Return all submitted student results in the institution."""

    statement = (
        select(
            Attempt,
            Exam,
            User,
            ClassSubject,
            SchoolClass,
            Subject,
        )
        .join(
            Exam,
            Exam.id == Attempt.exam_id,
        )
        .join(
            User,
            User.id == Attempt.user_id,
        )
        .join(
            ExamClassSubjectAssignment,
            ExamClassSubjectAssignment.exam_id == Exam.id,
        )
        .join(
            ClassSubject,
            ClassSubject.id
            == ExamClassSubjectAssignment.class_subject_id,
        )
        .join(
            SchoolClass,
            SchoolClass.id == ClassSubject.class_id,
        )
        .join(
            Subject,
            Subject.id == ClassSubject.subject_id,
        )
        .where(
            Exam.institution_id == user.institution_id,
            Attempt.status == "submitted",
            SchoolClass.institution_id == user.institution_id,
            Subject.institution_id == user.institution_id,
        )
        .order_by(Attempt.submitted_at.desc())
    )

    rows = db.execute(statement).all()

    if not rows:
        return {"items": []}

    # Keep one result entry per attempt, even if an exam
    # is associated with multiple class-subject assignments.
    attempts_by_id = {}

    for row in rows:
        attempt = row[0]
        attempts_by_id.setdefault(attempt.id, row)

    attempt_ids = list(attempts_by_id.keys())
    # Retrieve the teachers assigned to the relevant class subjects.
    teacher_ids = {
        row[3].teacher_id
        for row in attempts_by_id.values()
        if row[3].teacher_id is not None
    }

    teachers = []

    if teacher_ids:
        teachers = db.scalars(
            select(User).where(User.id.in_(teacher_ids))
        ).all()

    teacher_by_id = {
        teacher.id: teacher
        for teacher in teachers
    }

    # Retrieve all submitted answers.
    answers = db.scalars(
        select(StudentAnswer)
        .where(StudentAnswer.attempt_id.in_(attempt_ids))
        .order_by(
            StudentAnswer.attempt_id,
            StudentAnswer.id,
        )
    ).all()

    answer_ids = [answer.id for answer in answers]

    # Retrieve evaluations associated with those answers.
    evaluations = []

    if answer_ids:
        evaluations = db.scalars(
            select(Evaluation).where(
                Evaluation.student_answer_id.in_(answer_ids)
            )
        ).all()

    evaluation_by_answer = {
        evaluation.student_answer_id: evaluation
        for evaluation in evaluations
    }

    answers_by_attempt = {}

    for answer in answers:
        answers_by_attempt.setdefault(
            answer.attempt_id, []
        ).append(answer)

    items = []

    for attempt_id, row in attempts_by_id.items():
        (
            attempt,
            exam,
            student,
            class_subject,
            school_class,
            subject,
        ) = row
        teacher = teacher_by_id.get(class_subject.teacher_id)

        attempt_answers = answers_by_attempt.get(
            attempt_id, []
        )

        question_results = []

        completed = 0
        failed = 0
        pending = 0
        total_marks_awarded = 0
        total_max_marks = 0

        for answer in attempt_answers:
            evaluation = evaluation_by_answer.get(answer.id)

            snapshot = answer.submitted_snapshot or {}
            question_snapshot = snapshot.get("question", {})

            max_marks = (
                evaluation.max_marks
                if evaluation and evaluation.max_marks is not None
                else question_snapshot.get("marks", 0)
            )

            marks_awarded = None
            evaluation_status = (
                evaluation.status if evaluation else "pending"
            )

            if evaluation_status == "completed":
                completed += 1
                marks_awarded = evaluation.marks_awarded or 0
                total_marks_awarded += marks_awarded

            elif evaluation_status == "failed":
                failed += 1

            else:
                pending += 1

            total_max_marks += max_marks or 0

            question_results.append({
                "question_id": answer.question_id,
                "position": snapshot.get("position"),
                "prompt": question_snapshot.get("prompt"),
                "answer_text": snapshot.get(
                    "answer_text",
                    answer.answer_text,
                ),
                "reference_answer": question_snapshot.get("correct_answer"),
                "marking_criteria": question_snapshot.get("marking_criteria") or [],
                "evaluation_status": evaluation_status,
                "marks_awarded": marks_awarded,
                "max_marks": max_marks,
                "criterion_results": (
                    evaluation.criterion_results or []
                    if evaluation else []
                ),
                "feedback": (
                    evaluation.feedback
                    if evaluation else None
                ),
            })

        question_results.sort(
            key=lambda item: (
                item["position"] is None,
                item["position"] or 0,
            )
        )

        if failed:
            overall_evaluation_status = "failed"
        elif pending:
            overall_evaluation_status = "pending"
        else:
            overall_evaluation_status = "completed"

        items.append({
            "attempt_id": attempt.id,
            "exam_id": exam.id,
            "exam_title": exam.title,
            "subject_name": subject.name,
            "class_name": school_class.name,
            "teacher_id": class_subject.teacher_id,
            "teacher_name": (
                teacher.full_name if teacher else "Unassigned"
            ),
            "student_id": student.id,
            "student_name": student.full_name,
            "student_email": student.email,
            "attempt_status": attempt.status,
            "started_at": attempt.started_at,
            "submitted_at": attempt.submitted_at,
            "evaluation_status": overall_evaluation_status,
            "evaluation_summary": {
                "total": len(attempt_answers),
                "completed": completed,
                "failed": failed,
                "pending": pending,
                "marks_awarded": total_marks_awarded,
                "max_marks": total_max_marks,
            },
            "question_results": question_results,
        })




    return {"items": items}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_exam(
    request: ExamCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_institution_user),
):
    """Create a draft exam assigned to a specific class subject."""

    title = request.title.strip()

    if not title:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Exam title is required.",
        )

    # Retrieve the selected class subject and verify ownership.
    result = db.execute(
        select(ClassSubject, Subject)
        .join(
            SchoolClass,
            SchoolClass.id == ClassSubject.class_id,
        )
        .join(
            Subject,
            Subject.id == ClassSubject.subject_id,
        )
        .where(
            ClassSubject.id == request.class_subject_id,
            SchoolClass.institution_id == user.institution_id,
            Subject.institution_id == user.institution_id,
        )
    ).first()

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected class subject was not found.",
        )

    class_subject, subject = result

    # Teachers can only create exams for subjects they teach.
    if (
        user.role == "teacher"
        and class_subject.teacher_id != user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create exams for your assigned subjects.",
        )

    # Use the actual subject name from the database.
    exam = Exam(
        institution_id=user.institution_id,
        created_by_user_id=user.id,
        title=title,
        subject=subject.name,
        level=request.level.strip() if request.level else None,
        instructions=request.instructions,
        duration_minutes=request.duration_minutes,
        status="Draft",
    )

    db.add(exam)

    try:
        db.flush()

        # Associate the exam with the selected class subject.
        assignment = ExamClassSubjectAssignment(
            exam_id=exam.id,
            class_subject_id=class_subject.id,
        )

        db.add(assignment)

        db.commit()
        db.refresh(exam)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to create the exam assignment.",
        )

    response = exam_to_dict(exam)
    response["class_subject_id"] = class_subject.id

    return response




@router.post("/ai-generate", status_code=status.HTTP_201_CREATED)
def generate_exam_with_ai(
    request: AIGenerateExamRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_institution_user),
):
    """Generate an examination using AI and save it as a draft."""

    # 1. Validate the teacher's examination blueprint.
    total_questions = validate_ai_exam_request(request)

    # 2. Verify the selected class subject belongs to the institution.
    result = db.execute(
        select(ClassSubject, Subject)
        .join(
            SchoolClass,
            SchoolClass.id == ClassSubject.class_id,
        )
        .join(
            Subject,
            Subject.id == ClassSubject.subject_id,
        )
        .where(
            ClassSubject.id == request.class_subject_id,
            SchoolClass.institution_id == user.institution_id,
            Subject.institution_id == user.institution_id,
        )
    ).first()

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected class subject was not found.",
        )

    class_subject, subject = result

    # Teachers can only generate exams for their assigned subjects.
    if (
        user.role == "teacher"
        and class_subject.teacher_id != user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only generate exams for your assigned subjects.",
        )

    # 3. Calculate the total marks independently in Python.
    if request.include_passages:
        total_marks = sum(
            item.count * item.marks_per_question
            for passage in request.passages
            for item in passage.question_types
        )
    else:
        total_marks = sum(
            item.count * item.marks_per_question
            for item in request.standalone_question_types
        )

    # 4. Generate and validate the examination before database writes.
    configuration = request.model_dump()

    try:
        generation_result = generate_ai_exam(configuration)
        generated = generation_result["exam"]

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI generated an invalid examination: {str(exc)}",
        )

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI examination generation failed. Please try again.",
        )

    # 5. Save the complete examination in one transaction.
    try:
        exam = Exam(
            institution_id=user.institution_id,
            created_by_user_id=user.id,
            title=generated["title"].strip(),
            subject=subject.name,
            level=request.level.strip(),
            instructions=generated.get("instructions"),
            duration_minutes=None,
            status="Draft",
        )

        db.add(exam)
        db.flush()

        # Associate the exam with the selected class subject.
        db.add(
            ExamClassSubjectAssignment(
                exam_id=exam.id,
                class_subject_id=class_subject.id,
            )
        )

        position = 1

        def save_question(question_data, passage_id=None):
            nonlocal position

            question = Question(
                institution_id=user.institution_id,
                passage_id=passage_id,
                created_by_user_id=user.id,
                prompt=question_data["prompt"].strip(),
                question_type=question_data["question_type"],
                options=question_data.get("options"),
                correct_answer=question_data["correct_answer"].strip(),
                marking_criteria=question_data["marking_criteria"],
                marks=question_data["marks"],
            )

            db.add(question)
            db.flush()

            exam_question = ExamQuestion(
                exam_id=exam.id,
                question_id=question.id,
                position=position,
                marks_override=None,
            )

            db.add(exam_question)

            saved_question = {
                "id": question.id,
                "position": position,
                "question_type": question.question_type,
                "prompt": question.prompt,
                "options": question.options,
                "correct_answer": question.correct_answer,
                "marking_criteria": question.marking_criteria,
                "marks": question.marks,
                "passage_id": passage_id,
            }

            position += 1

            return saved_question

        saved_passages = []
        saved_standalone_questions = []

        # 6. Save each passage and its associated questions.
        if request.include_passages:

            for generated_passage in generated["passages"]:

                passage = Passage(
                    institution_id=user.institution_id,
                    created_by_user_id=user.id,
                    title=generated_passage["title"].strip(),
                    category=generated_passage["category"].strip(),
                    content=generated_passage["content"].strip(),
                    status="Draft",
                )

                db.add(passage)
                db.flush()

                saved_questions = []

                for question_data in generated_passage["questions"]:
                    saved_questions.append(
                        save_question(
                            question_data,
                            passage_id=passage.id,
                        )
                    )

                saved_passages.append({
                    "id": passage.id,
                    "title": passage.title,
                    "category": passage.category,
                    "content": passage.content,
                    "questions": saved_questions,
                })

        # 7. Save standalone questions without passages.
        else:

            for question_data in generated["standalone_questions"]:
                saved_standalone_questions.append(
                    save_question(question_data)
                )

        # Commit the exam, assignments, passages and questions together.
        db.commit()
        db.refresh(exam)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to save the generated examination.",
        )

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while saving the generated examination.",
        )

    return {
        "message": "AI examination generated and saved successfully.",
        "exam": exam_to_dict(exam),
        "class_subject_id": class_subject.id,
        "passages": saved_passages,
        "standalone_questions": saved_standalone_questions,
        "total_questions": total_questions,
        "total_marks": total_marks,
        "model_id": generation_result["model_id"],
        "prompt_version": generation_result["prompt_version"],
        "status": "Draft",
    }


@router.post(
    "/sentence-construction/generate",
    status_code=status.HTTP_201_CREATED,
)
def generate_sentence_construction_exam_endpoint(
    request: SentenceConstructionExamRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_institution_user),
):
    """Generate a sentence-construction examination and save it as a draft."""

    # 1. Validate the teacher's vocabulary blueprint.
    total_questions = validate_sentence_construction_exam_request(
        request
    )

    # 2. Verify the selected class subject belongs to the institution.
    result = db.execute(
        select(ClassSubject, Subject)
        .join(
            SchoolClass,
            SchoolClass.id == ClassSubject.class_id,
        )
        .join(
            Subject,
            Subject.id == ClassSubject.subject_id,
        )
        .where(
            ClassSubject.id == request.class_subject_id,
            SchoolClass.institution_id == user.institution_id,
            Subject.institution_id == user.institution_id,
        )
    ).first()

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected class subject was not found.",
        )

    class_subject, subject = result

    # Teachers can only generate exams for their assigned subjects.
    if (
        user.role == "teacher"
        and class_subject.teacher_id != user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only generate exams for your assigned subjects.",
        )

    # 3. Every sentence-construction question carries four marks.
    total_marks = total_questions * 4

    # 4. Generate and validate the examination before database writes.
    configuration = request.model_dump()

    try:
        generation_result = generate_sentence_construction_exam(
            configuration
        )

        generated = generation_result["exam"]

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI generated an invalid examination: {str(exc)}",
        )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI examination generation failed. Please try again.",
        )

    # 5. Save the examination and all questions in one transaction.
    try:
        exam = Exam(
            institution_id=user.institution_id,
            created_by_user_id=user.id,
            title=generated["title"].strip(),
            subject=subject.name,
            exam_type="sentence_construction",
            level=request.level.strip(),
            instructions=generated["instructions"],
            duration_minutes=None,
            status="Draft",
        )

        db.add(exam)
        db.flush()

        # Associate the examination with its class and subject.
        db.add(
            ExamClassSubjectAssignment(
                exam_id=exam.id,
                class_subject_id=class_subject.id,
            )
        )

        saved_questions = []

        for position, question_data in enumerate(
            generated["questions"],
            start=1,
        ):
            # Preserve the four-level assessment framework.
            sentence_data = {
                "target_word": question_data["target_word"],
                "intended_meaning": question_data["intended_meaning"],
                "levels": question_data["levels"],
            }

            # Level 4 example is retained as the model reference answer.
            # Actual evaluation will use all four levels.
            reference_answer = next(
                item["example"]
                for item in question_data["levels"]
                if item["level"] == 4
            )

            question = Question(
                institution_id=user.institution_id,
                passage_id=None,
                created_by_user_id=user.id,
                prompt=question_data["prompt"].strip(),
                question_type="Sentence Construction",
                options=None,
                correct_answer=reference_answer,
                marking_criteria=[],
                sentence_construction_data=sentence_data,
                marks=4,
            )

            db.add(question)
            db.flush()

            exam_question = ExamQuestion(
                exam_id=exam.id,
                question_id=question.id,
                position=position,
                marks_override=None,
            )

            db.add(exam_question)

            saved_questions.append({
                "id": question.id,
                "position": position,
                "question_type": question.question_type,
                "prompt": question.prompt,
                "target_word": sentence_data["target_word"],
                "intended_meaning": sentence_data["intended_meaning"],
                "sentence_construction_data": sentence_data,
                "correct_answer": question.correct_answer,
                "marks": question.marks,
            })

        # Commit the exam, assignment and questions together.
        db.commit()
        db.refresh(exam)

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while saving the generated examination.",
        )

    return {
        "message": (
            "Sentence construction examination generated successfully."
        ),
        "exam": exam_to_dict(exam),
        "class_subject_id": class_subject.id,
        "questions": saved_questions,
        "total_questions": total_questions,
        "total_marks": total_marks,
        "model_id": generation_result["model_id"],
        "prompt_version": generation_result["prompt_version"],
        "status": "Draft",
    }

@router.post(
    "/{exam_id}/question-groups",
    status_code=status.HTTP_201_CREATED,
)
def create_exam_question_group(
    exam_id: int,
    request: ExamQuestionGroupCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_institution_user),
):
    """Create a grouped question and assign its individual parts."""

    # 1. Find the examination within the institution.
    exam = db.scalar(
        select(Exam).where(
            Exam.id == exam_id,
            Exam.institution_id == user.institution_id,
        )
    )

    if exam is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found.",
        )

    # 2. Verify teacher permissions.
    if user.role == "teacher":
        teacher_has_access = db.scalar(
            select(ClassSubject.id)
            .join(
                ExamClassSubjectAssignment,
                ExamClassSubjectAssignment.class_subject_id
                == ClassSubject.id,
            )
            .join(
                SchoolClass,
                SchoolClass.id == ClassSubject.class_id,
            )
            .join(
                Subject,
                Subject.id == ClassSubject.subject_id,
            )
            .where(
                ExamClassSubjectAssignment.exam_id == exam.id,
                ClassSubject.teacher_id == user.id,
                SchoolClass.institution_id == user.institution_id,
                Subject.institution_id == user.institution_id,
            )
            .limit(1)
        )

        if teacher_has_access is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this exam's subject.",
            )

    if exam.status != "Draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Questions can only be added to draft exams.",
        )

    # 3. Validate the parent question.
    group_prompt = request.prompt.strip()

    if not group_prompt:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The parent question cannot be empty.",
        )

    # 4. Prevent duplicate questions within the group.
    question_ids = [
        part.question_id for part in request.parts
    ]

    if len(question_ids) != len(set(question_ids)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The same question cannot appear twice in a group.",
        )

    # 5. Retrieve all selected questions from the institution.
    questions = db.scalars(
        select(Question).where(
            Question.id.in_(question_ids),
            Question.institution_id == user.institution_id,
        )
    ).all()

    question_lookup = {
        question.id: question
        for question in questions
    }

    if len(question_lookup) != len(question_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more selected questions were not found.",
        )

    # 6. Prevent questions already assigned to this exam
    # from being assigned again.
    existing_question_ids = db.scalars(
        select(ExamQuestion.question_id).where(
            ExamQuestion.exam_id == exam.id,
            ExamQuestion.question_id.in_(question_ids),
        )
    ).all()

    if existing_question_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="One or more questions are already assigned to this exam.",
        )

    # 7. Determine the next available examination position.
    last_position = db.scalar(
        select(func.max(ExamQuestion.position)).where(
            ExamQuestion.exam_id == exam.id
        )
    ) or 0

    first_position = last_position + 1

    # 8. Create the group and all its parts in one transaction.
    try:
        group = ExamQuestionGroup(
            exam_id=exam.id,
            prompt=group_prompt,
        )

        db.add(group)
        db.flush()

        saved_parts = []

        for index, part in enumerate(request.parts):

            question = question_lookup[part.question_id]

            position = first_position + index

            part_label = chr(ord("a") + index)

            assignment = ExamQuestion(
                exam_id=exam.id,
                question_id=question.id,
                position=position,
                marks_override=part.marks_override,
                group_id=group.id,
                part_label=part_label,
            )

            db.add(assignment)
            db.flush()

            part_marks = (
                assignment.marks_override
                if assignment.marks_override is not None
                else question.marks
            )

            saved_parts.append({
                "exam_question_id": assignment.id,
                "question_id": question.id,
                "part_label": part_label,
                "position": position,
                "prompt": question.prompt,
                "question_type": question.question_type,
                "marks": part_marks,
            })

        db.commit()
        db.refresh(group)

    except Exception:
        db.rollback()
        raise

    # 9. Return the complete grouped-question information.
    return {
        "id": group.id,
        "exam_id": exam.id,
        "prompt": group.prompt,
        "position": first_position,
        "total_marks": sum(
            part["marks"] for part in saved_parts
        ),
        "parts": saved_parts,
    }

@router.post("/{exam_id}/questions", status_code=status.HTTP_201_CREATED)
def add_question_to_exam(
    exam_id: int,
    request: ExamQuestionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_institution_user),
):
    """Attach an existing institution question to a draft exam."""

    # Find the exam within the user's institution.
    exam = db.scalar(
        select(Exam).where(
            Exam.id == exam_id,
            Exam.institution_id == user.institution_id,
        )
    )

    if exam is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found.",
        )
    # Only the currently assigned subject teacher or
    # an institution administrator can manage this exam.
    if user.role == "teacher":
        teacher_has_access = db.scalar(
            select(ClassSubject.id)
            .join(
                ExamClassSubjectAssignment,
                ExamClassSubjectAssignment.class_subject_id == ClassSubject.id,
            )
            .join(
                SchoolClass,
                SchoolClass.id == ClassSubject.class_id,
            )
            .join(
                Subject,
                Subject.id == ClassSubject.subject_id,
            )
            .where(
                ExamClassSubjectAssignment.exam_id == exam.id,
                ClassSubject.teacher_id == user.id,
                SchoolClass.institution_id == user.institution_id,
                Subject.institution_id == user.institution_id,
            )
            .limit(1)
        )

        if teacher_has_access is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this exam's subject.",
            )

    if exam.status != "Draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Questions can only be added to draft exams.",
        )

    # Find the question within the same institution.
    question = db.scalar(
        select(Question).where(
            Question.id == request.question_id,
            Question.institution_id == user.institution_id,
        )
    )

    if question is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found.",
        )

    # Prevent the same question from being added twice.
    existing = db.scalar(
        select(ExamQuestion).where(
            ExamQuestion.exam_id == exam.id,
            ExamQuestion.question_id == question.id,
        )
    )

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This question is already in the exam.",
        )

    # Place the question after the exam's current last question.
    last_position = db.scalar(
        select(ExamQuestion.position)
        .where(ExamQuestion.exam_id == exam.id)
        .order_by(ExamQuestion.position.desc())
        .limit(1)
    )

    next_position = (last_position or 0) + 1

    exam_question = ExamQuestion(
        exam_id=exam.id,
        question_id=question.id,
        position=next_position,
        marks_override=request.marks_override,
    )

    db.add(exam_question)
    db.commit()
    db.refresh(exam_question)

    return {
        "id": exam_question.id,
        "exam_id": exam_question.exam_id,
        "question_id": question.id,
        "question_prompt": question.prompt,
        "position": exam_question.position,
        "marks": (
            exam_question.marks_override
            if exam_question.marks_override is not None
            else question.marks
        ),
    }


@router.get("/{exam_id}/questions")
def list_exam_questions(
    exam_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_institution_user),
):
    """List questions assigned to an exam in the user's institution."""

    exam = db.scalar(
        select(Exam).where(
            Exam.id == exam_id,
            Exam.institution_id == user.institution_id,
        )
    )

    if exam is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found.",
        )

    rows = db.execute(
        select(ExamQuestion, Question)
        .join(
            Question,
            Question.id == ExamQuestion.question_id,
        )
        .where(ExamQuestion.exam_id == exam.id)
        .order_by(ExamQuestion.position.asc())
    ).all()

    
    # Retrieve the parent groups associated with these assignments.
    group_ids = {
        assignment.group_id
        for assignment, question in rows
        if assignment.group_id is not None
    }

    groups_by_id = {}

    if group_ids:
        groups = db.scalars(
            select(ExamQuestionGroup).where(
                ExamQuestionGroup.exam_id == exam.id,
                ExamQuestionGroup.id.in_(group_ids),
            )
        ).all()

        groups_by_id = {
            group.id: group
            for group in groups
        }

    # Build the question list with grouping information.
    items = []

    for assignment, question in rows:
        group = groups_by_id.get(assignment.group_id)

        items.append({
            "exam_question_id": assignment.id,
            "question_id": question.id,
            "prompt": question.prompt,
            "question_type": question.question_type,
            "position": assignment.position,
            "marks": (
                assignment.marks_override
                if assignment.marks_override is not None
                else question.marks
            ),
            "passage_id": question.passage_id,

            # Grouping information
            "group_id": assignment.group_id,
            "group_prompt": (
                group.prompt if group else None
            ),
            "part_label": assignment.part_label,
        })

    return {"items": items}



@router.post("/{exam_id}/publish")
def publish_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_institution_user),
):
    """Publish a draft exam with snapshots of its questions and passages."""

    # Find the exam within the logged-in user's institution.
    exam = db.scalar(
        select(Exam).where(
            Exam.id == exam_id,
            Exam.institution_id == user.institution_id,
        )
    )

    if exam is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found.",
        )
   # Only the currently assigned subject teacher or
# an institution administrator can publish this exam.
    if user.role == "teacher":
        teacher_has_access = db.scalar(
            select(ClassSubject.id)
            .join(
                ExamClassSubjectAssignment,
                ExamClassSubjectAssignment.class_subject_id == ClassSubject.id,
            )
            .join(
                SchoolClass,
                SchoolClass.id == ClassSubject.class_id,
            )
            .join(
                Subject,
                Subject.id == ClassSubject.subject_id,
            )
            .where(
                ExamClassSubjectAssignment.exam_id == exam.id,
                ClassSubject.teacher_id == user.id,
                SchoolClass.institution_id == user.institution_id,
                Subject.institution_id == user.institution_id,
            )
            .limit(1)
        )

        if teacher_has_access is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this exam's subject.",
            )

    if exam.status != "Draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only draft exams can be published.",
        )

    # Retrieve the questions in their assigned order.
    rows = db.execute(
        select(ExamQuestion, Question)
        .join(
            Question,
            Question.id == ExamQuestion.question_id,
        )
        .where(ExamQuestion.exam_id == exam.id)
        .order_by(ExamQuestion.position.asc())
    ).all()

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add at least one question before publishing.",
        )

    # Preserve the content that belongs to this published exam.
    # Preserve the content that belongs to this published exam.
    for assignment, question in rows:

        passage = (
            db.get(Passage, question.passage_id)
            if question.passage_id is not None
            else None
        )

        # Retrieve the parent question group, if this is a grouped part.
        group = (
            db.get(ExamQuestionGroup, assignment.group_id)
            if assignment.group_id is not None
            else None
        )

        assignment.published_snapshot = {
            "question_id": question.id,
            "prompt": question.prompt,
            "question_type": question.question_type,
            "options": question.options,
            "correct_answer": question.correct_answer,
            "marking_criteria": question.marking_criteria or [],
            "sentence_construction_data": (
                question.sentence_construction_data
            ),
            "marks": (
                assignment.marks_override
                if assignment.marks_override is not None
                else question.marks
            ),
            "position": assignment.position,

            # Grouping information
            "group_id": assignment.group_id,
            "group_prompt": (
                group.prompt if group else None
            ),
            "part_label": assignment.part_label,

            "passage": (
                {
                    "id": passage.id,
                    "title": passage.title,
                    "category": passage.category,
                    "content": passage.content,
                }
                if passage is not None
                else None
            ),
        }

    exam.status = "Published"
    exam.published_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(exam)

    return {
        "message": "Exam published successfully.",
        "exam": exam_to_dict(exam),
        "question_count": len(rows),
    }


@router.get("/student/available")
def list_available_exams(
    db: Session = Depends(get_db),
    user: User = Depends(require_student_user),
):
    """List published exams with the student's latest attempt status."""

    exams = db.scalars(
        select(Exam)
        .join(
            ExamClassSubjectAssignment,
            ExamClassSubjectAssignment.exam_id == Exam.id,
        )
        .join(
            ClassSubject,
            ClassSubject.id == ExamClassSubjectAssignment.class_subject_id,
        )
        .join(
            SchoolClass,
            SchoolClass.id == ClassSubject.class_id,
        )
        .join(
            Subject,
            Subject.id == ClassSubject.subject_id,
        )
        .join(
            ClassSubjectEnrollment,
            ClassSubjectEnrollment.class_subject_id == ClassSubject.id,
        )
        .where(
            Exam.institution_id == user.institution_id,
            Exam.status == "Published",
            SchoolClass.institution_id == user.institution_id,
            Subject.institution_id == user.institution_id,
            ClassSubjectEnrollment.student_id == user.id,
        )
        .distinct()
        .order_by(Exam.id.desc())
    ).all()

    if not exams:
        return {"items": []}

    exam_ids = [exam.id for exam in exams]

    # Retrieve this student's attempts for the available exams.
    attempts = db.scalars(
        select(Attempt)
        .where(
            Attempt.user_id == user.id,
            Attempt.exam_id.in_(exam_ids),
        )
        .order_by(
            Attempt.started_at.desc(),
            Attempt.id.desc(),
        )
    ).all()

    # Keep only the latest attempt for each exam.
    latest_attempt_by_exam = {}

    for attempt in attempts:
        if attempt.exam_id not in latest_attempt_by_exam:
            latest_attempt_by_exam[attempt.exam_id] = attempt

    # Count the questions assigned to each exam.
    assignments = db.scalars(
        select(ExamQuestion).where(
            ExamQuestion.exam_id.in_(exam_ids)
        )
    ).all()
    # Retrieve unused retest permissions for this student.
    retest_permissions = db.scalars(
        select(RetestPermission.exam_id).where(
            RetestPermission.student_id == user.id,
            RetestPermission.exam_id.in_(exam_ids),
            RetestPermission.used_at.is_(None),
        )
    ).all()

    retest_allowed_exam_ids = set(retest_permissions)

    question_counts = {}

    for assignment in assignments:
        question_counts[assignment.exam_id] = (
            question_counts.get(assignment.exam_id, 0) + 1
        )

    # Retrieve answers belonging to submitted latest attempts.
    submitted_attempt_ids = [
        attempt.id
        for attempt in latest_attempt_by_exam.values()
        if attempt.status == "submitted"
    ]

    answers = []

    if submitted_attempt_ids:
        answers = db.scalars(
            select(StudentAnswer).where(
                StudentAnswer.attempt_id.in_(
                    submitted_attempt_ids
                )
            )
        ).all()

    answer_ids = [answer.id for answer in answers]

    evaluations = []

    if answer_ids:
        evaluations = db.scalars(
            select(Evaluation).where(
                Evaluation.student_answer_id.in_(answer_ids)
            )
        ).all()

    evaluation_by_answer = {
        evaluation.student_answer_id: evaluation
        for evaluation in evaluations
    }

    answers_by_attempt = {}

    for answer in answers:
        answers_by_attempt.setdefault(
            answer.attempt_id, []
        ).append(answer)

    items = []

    for exam in exams:
        attempt = latest_attempt_by_exam.get(exam.id)

        item = {
            "id": exam.id,
            "title": exam.title,
            "subject": exam.subject,
            "level": exam.level,
            "instructions": exam.instructions,
            "duration_minutes": exam.duration_minutes,
            "published_at": exam.published_at,
            "attempt_id": attempt.id if attempt else None,
            "attempt_status": (
                attempt.status if attempt else "not_started"
            ),
            "retest_allowed": exam.id in retest_allowed_exam_ids,
            "evaluation_status": None,
            "evaluation_summary": None,
        }

        if attempt and attempt.status == "submitted":
            attempt_answers = answers_by_attempt.get(
                attempt.id, []
            )

            completed = 0
            failed = 0
            marks_awarded = 0
            total_max_marks = 0

            for answer in attempt_answers:
                evaluation = evaluation_by_answer.get(answer.id)

                snapshot = answer.submitted_snapshot or {}
                question_snapshot = snapshot.get("question", {})

                # Calculate maximum marks from the saved snapshot
                # so the result remains available even if evaluation fails.
                question_marks = question_snapshot.get("marks", 0)

                if (
                    isinstance(question_marks, int)
                    and not isinstance(question_marks, bool)
                ):
                    total_max_marks += question_marks

                if evaluation:
                    if evaluation.status == "completed":
                        completed += 1
                        marks_awarded += (
                            evaluation.marks_awarded or 0
                        )

                    elif evaluation.status == "failed":
                        failed += 1

            total_questions = question_counts.get(exam.id, 0)
            pending = max(
                total_questions - completed - failed,
                0,
            )

            if failed > 0:
                evaluation_status = "failed"
            elif pending > 0:
                evaluation_status = "pending"
            else:
                evaluation_status = "completed"

            item["evaluation_status"] = evaluation_status

            item["evaluation_summary"] = {
                "total": total_questions,
                "completed": completed,
                "failed": failed,
                "pending": pending,
                "marks_awarded": marks_awarded,
                "max_marks": total_max_marks,
            }

        items.append(item)

    return {"items": items}


@router.get("/student/{exam_id}")
def get_student_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_student_user),
):
    """Return published exam content without answer keys or marking criteria."""

    exam = db.scalar(
        select(Exam).where(
            Exam.id == exam_id,
            Exam.institution_id == user.institution_id,
            Exam.status == "Published",
        )
    )

    if exam is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Published exam not found.",
        )
    # Verify that the exam is assigned to one of the student's classes.
    # Verify that the student is enrolled in the subject
    # to which this exam is assigned.
    student_has_access = db.scalar(
        select(ClassSubjectEnrollment.id)
        .join(
            ClassSubject,
            ClassSubject.id == ClassSubjectEnrollment.class_subject_id,
        )
        .join(
            ExamClassSubjectAssignment,
            ExamClassSubjectAssignment.class_subject_id == ClassSubject.id,
        )
        .join(
            SchoolClass,
            SchoolClass.id == ClassSubject.class_id,
        )
        .join(
            Subject,
            Subject.id == ClassSubject.subject_id,
        )
        .where(
            ClassSubjectEnrollment.student_id == user.id,
            ExamClassSubjectAssignment.exam_id == exam.id,
            SchoolClass.institution_id == user.institution_id,
            Subject.institution_id == user.institution_id,
        )
        .limit(1)
    )

    if student_has_access is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Published exam not found.",
        )

    assignments = db.scalars(
        select(ExamQuestion)
        .where(ExamQuestion.exam_id == exam.id)
        .order_by(ExamQuestion.position.asc())
    ).all()

    if not assignments:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The published exam has no questions.",
        )

    items = []

    for assignment in assignments:
        snapshot = assignment.published_snapshot

        if not isinstance(snapshot, dict) or not snapshot.get("prompt"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Published question content is unavailable.",
            )

        items.append({
            "exam_question_id": assignment.id,
            "question_id": assignment.question_id,
            "position": snapshot.get("position", assignment.position),
            "prompt": snapshot["prompt"],
            "question_type": snapshot.get("question_type"),
            "options": snapshot.get("options"),
            "marks": snapshot.get("marks"),
            "passage": snapshot.get("passage"),

            # Grouped question information
            "group_id": snapshot.get("group_id"),
            "group_prompt": snapshot.get("group_prompt"),
            "part_label": snapshot.get("part_label"),
        })

    return {
        "exam": {
            "id": exam.id,
            "title": exam.title,
            "subject": exam.subject,
            "level": exam.level,
            "instructions": exam.instructions,
            "duration_minutes": exam.duration_minutes,
        },
        "items": items,
    }


@router.post(
    "/student/{exam_id}/attempts",
    status_code=status.HTTP_201_CREATED,
)
def start_student_attempt(
    exam_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_student_user),
):
    """Start a new attempt or resume an existing one."""

    exam = db.scalar(
        select(Exam).where(
            Exam.id == exam_id,
            Exam.institution_id == user.institution_id,
            Exam.status == "Published",
        )
    )

    if exam is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Published exam not found.",
        )
    # Verify that the exam is assigned to one of the student's classes.
    # Verify that the student is enrolled in the subject
    # to which this exam is assigned.
    student_has_access = db.scalar(
        select(ClassSubjectEnrollment.id)
        .join(
            ClassSubject,
            ClassSubject.id == ClassSubjectEnrollment.class_subject_id,
        )
        .join(
            ExamClassSubjectAssignment,
            ExamClassSubjectAssignment.class_subject_id == ClassSubject.id,
        )
        .join(
            SchoolClass,
            SchoolClass.id == ClassSubject.class_id,
        )
        .join(
            Subject,
            Subject.id == ClassSubject.subject_id,
        )
        .where(
            ClassSubjectEnrollment.student_id == user.id,
            ExamClassSubjectAssignment.exam_id == exam.id,
            SchoolClass.institution_id == user.institution_id,
            Subject.institution_id == user.institution_id,
        )
        .limit(1)
    )

    if student_has_access is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Published exam not found.",
        )

    # Find the student's latest attempt for this exam.
    existing_attempt = db.scalar(
        select(Attempt)
        .where(
            Attempt.user_id == user.id,
            Attempt.exam_id == exam.id,
        )
        .order_by(
            Attempt.started_at.desc(),
            Attempt.id.desc(),
        )
        .limit(1)
    )

    # Do not allow a submitted exam to be started again.
    # Check whether the student has permission to retake
    # an examination they have already submitted.
    retest_permission = None

    if existing_attempt and existing_attempt.status == "submitted":

        retest_permission = db.scalar(
            select(RetestPermission)
            .where(
                RetestPermission.student_id == user.id,
                RetestPermission.exam_id == exam.id,
                RetestPermission.used_at.is_(None),
            )
            .with_for_update()
        )

        if retest_permission is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "You have already submitted this exam. "
                    "Your teacher must allow a retest."
                ),
            )

    # Resume an existing unfinished attempt.
    if existing_attempt and existing_attempt.status == "in_progress":

        saved_answers = db.scalars(
            select(StudentAnswer).where(
                StudentAnswer.attempt_id == existing_attempt.id
            )
        ).all()

        return {
            "attempt_id": existing_attempt.id,
            "exam_id": existing_attempt.exam_id,
            "status": existing_attempt.status,
            "started_at": existing_attempt.started_at,
            "duration_minutes": exam.duration_minutes,
            "resumed": True,
            "answers": [
                {
                    "question_id": answer.question_id,
                    "answer_text": answer.answer_text,
                }
                for answer in saved_answers
            ],
        }

    assignments = db.scalars(
        select(ExamQuestion).where(
            ExamQuestion.exam_id == exam.id
        )
    ).all()

    if not assignments:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This exam has no questions.",
        )

    # Create a new attempt only when none exists.
    # Create a new attempt.
    attempt = Attempt(
        user_id=user.id,
        exam_id=exam.id,
        status="in_progress",
    )

    db.add(attempt)

    try:
        db.flush()

        # Consume the retest permission only after
        # the new attempt has been created successfully.
        if retest_permission is not None:
            retest_permission.used_at = func.now()
            retest_permission.used_attempt_id = attempt.id

        db.commit()
        db.refresh(attempt)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to create the examination attempt.",
        )

    return {
        "attempt_id": attempt.id,
        "exam_id": attempt.exam_id,
        "status": attempt.status,
        "started_at": attempt.started_at,
        "duration_minutes": exam.duration_minutes,
        "resumed": False,
        "answers": [],
    }


@router.put("/student/attempts/{attempt_id}/answers/{question_id}")
def save_student_answer(
    attempt_id: int,
    question_id: int,
    request: StudentAnswerSave,
    db: Session = Depends(get_db),
    user: User = Depends(require_student_user),
):
    """Save or update an answer belonging to the logged-in student's attempt."""

    # Find an attempt owned by the logged-in student.
    attempt = db.scalar(
        select(Attempt).where(
            Attempt.id == attempt_id,
            Attempt.user_id == user.id,
        )
    )

    if attempt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam attempt not found.",
        )
    # Verify that the exam is assigned to one of the student's classes.
    # Verify that the student is enrolled in the subject
    # assigned to this exam.
    student_has_access = db.scalar(
        select(ClassSubjectEnrollment.id)
        .join(
            ClassSubject,
            ClassSubject.id == ClassSubjectEnrollment.class_subject_id,
        )
        .join(
            ExamClassSubjectAssignment,
            ExamClassSubjectAssignment.class_subject_id == ClassSubject.id,
        )
        .join(
            SchoolClass,
            SchoolClass.id == ClassSubject.class_id,
        )
        .join(
            Subject,
            Subject.id == ClassSubject.subject_id,
        )
        .where(
            ClassSubjectEnrollment.student_id == user.id,
            ExamClassSubjectAssignment.exam_id == attempt.exam_id,
            SchoolClass.institution_id == user.institution_id,
            Subject.institution_id == user.institution_id,
        )
        .limit(1)
    )

    if student_has_access is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam attempt not found.",
        )

    if attempt.status != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This exam attempt is no longer accepting answers.",
        )

    # Confirm that this question belongs to the attempted exam.
    assignment = db.scalar(
        select(ExamQuestion).where(
            ExamQuestion.exam_id == attempt.exam_id,
            ExamQuestion.question_id == question_id,
        )
    )

    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found in this exam.",
        )

    # Update the existing answer or create a new one.
    answer = db.scalar(
        select(StudentAnswer).where(
            StudentAnswer.attempt_id == attempt.id,
            StudentAnswer.question_id == question_id,
        )
    )

    if answer is None:
        answer = StudentAnswer(
            attempt_id=attempt.id,
            question_id=question_id,
            answer_text=request.answer_text,
            answer_source="typed",
        )
        db.add(answer)
    else:
        answer.answer_text = request.answer_text
        answer.answer_source = "typed"

    db.commit()
    db.refresh(answer)

    return {
        "message": "Answer saved successfully.",
        "attempt_id": answer.attempt_id,
        "question_id": answer.question_id,
        "answer_text": answer.answer_text,
        "saved_at": answer.saved_at,
    }



@router.post("/student/attempts/{attempt_id}/submit")
def submit_student_attempt(
    attempt_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_student_user),
):
    """Submit an exam attempt and evaluate its answers."""

    attempt = db.scalar(
        select(Attempt).where(
            Attempt.id == attempt_id,
            Attempt.user_id == user.id,
        )
    )

    if attempt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam attempt not found.",
        )
    # Verify that the exam is assigned to one of the student's classes.
    # Verify that the student is enrolled in the subject
    # assigned to this exam.
    student_has_access = db.scalar(
        select(ClassSubjectEnrollment.id)
        .join(
            ClassSubject,
            ClassSubject.id == ClassSubjectEnrollment.class_subject_id,
        )
        .join(
            ExamClassSubjectAssignment,
            ExamClassSubjectAssignment.class_subject_id == ClassSubject.id,
        )
        .join(
            SchoolClass,
            SchoolClass.id == ClassSubject.class_id,
        )
        .join(
            Subject,
            Subject.id == ClassSubject.subject_id,
        )
        .where(
            ClassSubjectEnrollment.student_id == user.id,
            ExamClassSubjectAssignment.exam_id == attempt.exam_id,
            SchoolClass.institution_id == user.institution_id,
            Subject.institution_id == user.institution_id,
        )
        .limit(1)
    )

    if student_has_access is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam attempt not found.",
        )
    exam = db.get(Exam, attempt.exam_id)

    if exam is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found.",
        )

    if attempt.status != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This exam attempt has already been submitted.",
        )

    assignments = db.scalars(
        select(ExamQuestion)
        .where(ExamQuestion.exam_id == attempt.exam_id)
        .order_by(ExamQuestion.position.asc())
    ).all()

    if not assignments:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This exam has no assigned questions.",
        )

    # Validate every published question snapshot.
    for assignment in assignments:
        if (
            not isinstance(assignment.published_snapshot, dict)
            or not assignment.published_snapshot.get("prompt")
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Published question content is unavailable.",
            )

    submitted_at = datetime.now(timezone.utc)

    evaluation_jobs = []

    # Preserve an answer record and snapshot for every question.
    for assignment in assignments:
        answer = db.scalar(
            select(StudentAnswer).where(
                StudentAnswer.attempt_id == attempt.id,
                StudentAnswer.question_id == assignment.question_id,
            )
        )

        if answer is None:
            answer = StudentAnswer(
                attempt_id=attempt.id,
                question_id=assignment.question_id,
                answer_text="",
                answer_source="typed",
            )
            db.add(answer)

        answer.submitted_snapshot = {
            "exam_id": attempt.exam_id,
            "question": assignment.published_snapshot,
            "answer_text": answer.answer_text,
            "position": assignment.position,
            "submitted_at": submitted_at.isoformat(),
        }

        # Ensure the answer has a database ID.
        db.flush()

        question_max_marks = assignment.published_snapshot.get(
            "marks", 0
        )

        if (
            isinstance(question_max_marks, bool)
            or not isinstance(question_max_marks, int)
            or question_max_marks < 0
        ):
            question_max_marks = 0

        # Create one evaluation record per student answer.
        evaluation = db.scalar(
            select(Evaluation).where(
                Evaluation.student_answer_id == answer.id
            )
        )

        if evaluation is None:
            evaluation = Evaluation(
                student_answer_id=answer.id,
                status="pending",
                max_marks=question_max_marks,
            )
            db.add(evaluation)
        else:
            evaluation.status = "pending"
            evaluation.max_marks = question_max_marks
            evaluation.marks_awarded = None
            evaluation.criterion_results = None
            evaluation.feedback = None
            evaluation.model_id = None
            evaluation.prompt_version = None
            evaluation.output_json = None
            evaluation.error_message = None
            evaluation.completed_at = None

        db.flush()

        evaluation_jobs.append(
            (evaluation.id, answer.submitted_snapshot)
        )

    # Commit the exam submission and pending evaluations FIRST.
    attempt.status = "submitted"
    attempt.submitted_at = submitted_at

    db.commit()
    db.refresh(attempt)

    # Evaluate each answer independently.
    
    # Evaluate each answer using the appropriate evaluation service.
    for evaluation_id, submitted_snapshot in evaluation_jobs:
        try:
            evaluation = db.get(Evaluation, evaluation_id)

            if evaluation is None:
                raise ValueError(
                    f"Evaluation record {evaluation_id} not found."
                )

            evaluation.status = "processing"
            evaluation.error_message = None

            db.commit()

            # Select the evaluator based on the examination type.
            if exam.exam_type == "sentence_construction":

                result = evaluate_submitted_sentence_construction_answer(
                    submitted_snapshot
                )

            else:

                result = evaluate_submitted_answer(
                    submitted_snapshot
                )

            # Save the completed evaluation.
            evaluation = db.get(Evaluation, evaluation_id)

            if evaluation is None:
                raise ValueError(
                    f"Evaluation record {evaluation_id} not found."
                )

            evaluation.status = "completed"
            evaluation.marks_awarded = result["marks_awarded"]
            evaluation.max_marks = result["max_marks"]
            evaluation.criterion_results = (
                result.get("criterion_results", [])
            )
            evaluation.feedback = result["feedback"]
            evaluation.model_id = result["model_id"]
            evaluation.prompt_version = result["prompt_version"]
            evaluation.output_json = result["output_json"]
            evaluation.error_message = None
            evaluation.completed_at = datetime.now(timezone.utc)

            db.commit()

        except Exception as exc:

            logger.exception(
                "Evaluation failed. Exam ID: %s, Exam type: %s, "
                "Attempt ID: %s, Evaluation ID: %s",
                attempt.exam_id,
                exam.exam_type,
                attempt.id,
                evaluation_id,
            )

            # Preserve the submitted examination.
            db.rollback()

            try:
                evaluation = db.get(Evaluation, evaluation_id)

                if evaluation is not None:
                    evaluation.status = "failed"
                    evaluation.error_message = (
                        f"{type(exc).__name__}: {exc}"
                    )[:5000]

                    db.commit()

            except Exception:
                logger.exception(
                    "Could not save failed evaluation status. "
                    "Evaluation ID: %s",
                    evaluation_id,
                )
                db.rollback()

    # Collect final evaluation statuses.
    evaluation_ids = [
        evaluation_id
        for evaluation_id, _ in evaluation_jobs
    ]

    evaluations = db.scalars(
        select(Evaluation).where(
            Evaluation.id.in_(evaluation_ids)
        )
    ).all()

    completed_count = sum(
        1 for item in evaluations
        if item.status == "completed"
    )

    failed_count = sum(
        1 for item in evaluations
        if item.status == "failed"
    )

    pending_count = sum(
        1 for item in evaluations
        if item.status in ("pending", "processing")
    )
        # Prepare individual question evaluation results.
    answer_lookup = {
        answer.id: answer
        for answer in db.scalars(
            select(StudentAnswer).where(
                StudentAnswer.attempt_id == attempt.id
            )
        ).all()
    }

    question_results = []

    for evaluation in evaluations:
        answer = answer_lookup.get(
            evaluation.student_answer_id
        )

        question_results.append({
            "question_id": answer.question_id if answer else None,
            "position": (
                answer.submitted_snapshot.get("position")
                if answer and isinstance(answer.submitted_snapshot, dict)
                else None
            ),
            "status": evaluation.status,
            "marks_awarded": evaluation.marks_awarded,
            "max_marks": evaluation.max_marks,
            "criterion_results": evaluation.criterion_results or [],
            "feedback": evaluation.feedback,
        })

    question_results.sort(
        key=lambda item: (
            item["position"] is None,
            item["position"] or 0,
        )
    )

    return {
        "message": "Exam submitted successfully.",
        "attempt_id": attempt.id,
        "exam_id": attempt.exam_id,
        "status": attempt.status,
        "submitted_at": attempt.submitted_at,
        "question_count": len(assignments),
        "evaluation_summary": {
            "total": len(evaluations),
            "completed": completed_count,
            "failed": failed_count,
            "pending": pending_count,
        },
    }

@router.get("/student/attempts/{attempt_id}/results")
def get_student_attempt_results(
    attempt_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_student_user),
):
    """Retrieve previously saved evaluation results."""

    attempt = db.scalar(
        select(Attempt).where(
            Attempt.id == attempt_id,
            Attempt.user_id == user.id,
        )
    )

    if attempt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam attempt not found.",
        )
    # Verify that the exam is assigned to one of the student's classes.
    # Verify that the student is enrolled in the subject
    # assigned to this exam.
    student_has_access = db.scalar(
        select(ClassSubjectEnrollment.id)
        .join(
            ClassSubject,
            ClassSubject.id == ClassSubjectEnrollment.class_subject_id,
        )
        .join(
            ExamClassSubjectAssignment,
            ExamClassSubjectAssignment.class_subject_id == ClassSubject.id,
        )
        .join(
            SchoolClass,
            SchoolClass.id == ClassSubject.class_id,
        )
        .join(
            Subject,
            Subject.id == ClassSubject.subject_id,
        )
        .where(
            ClassSubjectEnrollment.student_id == user.id,
            ExamClassSubjectAssignment.exam_id == attempt.exam_id,
            SchoolClass.institution_id == user.institution_id,
            Subject.institution_id == user.institution_id,
        )
        .limit(1)
    )

    if student_has_access is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam attempt not found.",
        )

    if attempt.status != "submitted":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This exam has not been submitted.",
        )

    answers = db.scalars(
        select(StudentAnswer).where(
            StudentAnswer.attempt_id == attempt.id
        )
    ).all()

    question_results = []

    for answer in answers:
        evaluation = db.scalar(
            select(Evaluation).where(
                Evaluation.student_answer_id == answer.id
            )
        )

        snapshot = answer.submitted_snapshot or {}
        question = snapshot.get("question", {})

        
        sentence_construction_data = question.get(
            "sentence_construction_data"
        )

        evaluation_details = (
            evaluation.output_json
            if (
                evaluation
                and isinstance(evaluation.output_json, dict)
            )
            else None
        )

        question_results.append({
            "question_id": answer.question_id,
            "position": snapshot.get("position"),
            "answer_text": answer.answer_text or "",
            "status": (
                evaluation.status if evaluation else "pending"
            ),
            "marks_awarded": (
                evaluation.marks_awarded if evaluation else None
            ),
            "max_marks": (
                evaluation.max_marks
                if evaluation else question.get("marks", 0)
            ),
            "criterion_results": (
                evaluation.criterion_results or []
                if evaluation else []
            ),
            "feedback": (
                evaluation.feedback if evaluation else None
            ),
            "sentence_construction_data": (
                sentence_construction_data
            ),
            "sentence_construction_evaluation": (
                evaluation_details
            ),
        })


    question_results.sort(
        key=lambda item: item["position"] or 0
    )

    completed = sum(
        1 for item in question_results
        if item["status"] == "completed"
    )

    failed = sum(
        1 for item in question_results
        if item["status"] == "failed"
    )

    pending = len(question_results) - completed - failed

    return {
        "attempt_id": attempt.id,
        "exam_id": attempt.exam_id,
        "status": attempt.status,
        "evaluation_summary": {
            "total": len(question_results),
            "completed": completed,
            "failed": failed,
            "pending": pending,
        },
        "question_results": question_results,
    }

@router.get("/available-class-subjects")
def get_available_class_subjects(
    db: Session = Depends(get_db),
    user: User = Depends(require_institution_user),
):
    """Return class-subject combinations available to the current user."""

    statement = (
        select(ClassSubject, SchoolClass, Subject)
        .join(
            SchoolClass,
            SchoolClass.id == ClassSubject.class_id,
        )
        .join(
            Subject,
            Subject.id == ClassSubject.subject_id,
        )
        .where(
            SchoolClass.institution_id == user.institution_id
        )
    )

    # Teachers can only create exams for subjects they teach.
    if user.role == "teacher":
        statement = statement.where(
            ClassSubject.teacher_id == user.id
        )

    rows = db.execute(
        statement.order_by(
            SchoolClass.name,
            Subject.name,
        )
    ).all()

    return {
        "items": [
            {
                "id": class_subject.id,
                "class_id": school_class.id,
                "class_name": school_class.name,
                "subject_id": subject.id,
                "subject_name": subject.name,
                "teacher_id": class_subject.teacher_id,
            }
            for class_subject, school_class, subject in rows
        ]
    }
@router.get("/available-classes")
def get_available_exam_classes(
    db: Session = Depends(get_db),
    user: User = Depends(require_institution_user),
):
    """Return classes the current user is allowed to assign exams to."""

    statement = select(SchoolClass).where(
        SchoolClass.institution_id == user.institution_id
    )

    # Teachers can only see classes assigned to them.
    if user.role == "teacher":
        statement = statement.where(
            SchoolClass.teacher_id == user.id
        )

    classes = db.scalars(
        statement.order_by(SchoolClass.name)
    ).all()

    return [
        {
            "id": school_class.id,
            "name": school_class.name,
            "teacher_id": school_class.teacher_id,
        }
        for school_class in classes
    ]