
import os
from datetime import datetime, timezone
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Attempt,
    Evaluation,
    Exam,
    ExamQuestion,
    Institution,
    Passage,
    Question,
    StudentAnswer,
    User,
)
from app.evaluation_service import evaluate_submitted_answer
router = APIRouter(
    prefix="/api/exams",
    tags=["Exams"],
)

bearer_scheme = HTTPBearer(auto_error=False)

class ExamQuestionCreate(BaseModel):
    question_id: int = Field(gt=0)
    marks_override: int | None = Field(default=None, gt=0)

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
    """List exams belonging to the logged-in user's institution."""

    exams = db.scalars(
        select(Exam)
        .where(Exam.institution_id == user.institution_id)
        .order_by(Exam.id.desc())
    ).all()

    return {
        "items": [exam_to_dict(exam) for exam in exams]
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_exam(
    request: ExamCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_institution_user),
):
    """Create a draft exam for the logged-in user's institution."""

    title = request.title.strip()
    subject = request.subject.strip()

    if not title or not subject:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Exam title and subject are required.",
        )

    exam = Exam(
        institution_id=user.institution_id,
        created_by_user_id=user.id,
        title=title,
        subject=subject,
        level=request.level.strip() if request.level else None,
        instructions=request.instructions,
        duration_minutes=request.duration_minutes,
        status="Draft",
    )

    db.add(exam)
    db.commit()
    db.refresh(exam)

    return exam_to_dict(exam)

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

    return {
        "items": [
            {
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
            }
            for assignment, question in rows
        ]
    }


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
    for assignment, question in rows:
        passage = (
            db.get(Passage, question.passage_id)
            if question.passage_id is not None
            else None
        )

        assignment.published_snapshot = {
            "question_id": question.id,
            "prompt": question.prompt,
            "question_type": question.question_type,
            "options": question.options,
            "correct_answer": question.correct_answer,
            "marking_criteria": question.marking_criteria or [],
            "marks": (
                assignment.marks_override
                if assignment.marks_override is not None
                else question.marks
            ),
            "position": assignment.position,
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
        .where(
            Exam.institution_id == user.institution_id,
            Exam.status == "Published",
        )
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
    if existing_attempt and existing_attempt.status == "submitted":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already submitted this exam. Please view your results.",
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
    attempt = Attempt(
        user_id=user.id,
        exam_id=exam.id,
        status="in_progress",
    )

    db.add(attempt)
    db.commit()
    db.refresh(attempt)

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
    for evaluation_id, submitted_snapshot in evaluation_jobs:
        try:
            evaluation = db.get(Evaluation, evaluation_id)

            evaluation.status = "processing"
            evaluation.error_message = None

            db.commit()

            result = evaluate_submitted_answer(
                submitted_snapshot
            )

            evaluation = db.get(Evaluation, evaluation_id)

            evaluation.status = "completed"
            evaluation.marks_awarded = result["marks_awarded"]
            evaluation.max_marks = result["max_marks"]
            evaluation.criterion_results = (
                result["criterion_results"]
            )
            evaluation.feedback = result["feedback"]
            evaluation.model_id = result["model_id"]
            evaluation.prompt_version = result["prompt_version"]
            evaluation.output_json = result["output_json"]
            evaluation.error_message = None
            evaluation.completed_at = datetime.now(timezone.utc)

            db.commit()

        except Exception as exc:
            # A failed evaluation must not undo the submitted exam.
            db.rollback()

            try:
                evaluation = db.get(Evaluation, evaluation_id)

                if evaluation is not None:
                    evaluation.status = "failed"
                    evaluation.error_message = str(exc)[:5000]

                    db.commit()

            except Exception:
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

        question_results.append({
            "question_id": answer.question_id,
            "position": snapshot.get("position"),
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
