
import os

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Exam,
    ExamQuestion,
    Institution,
    Passage,
    Question,
    User,
)


router = APIRouter(
    prefix="/api/content",
    tags=["Content"],
)

bearer_scheme = HTTPBearer(auto_error=False)


class PassageCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    category: str = Field(default="General", max_length=80)
    content: str = Field(min_length=1)

class MarkingCriterion(BaseModel):
    criterion: str = Field(min_length=2, max_length=500)
    marks: int = Field(ge=1, le=100)


class QuestionCreate(BaseModel):
    passage_id: int | None = None
    prompt: str = Field(min_length=3)
    question_type: str = Field(min_length=2, max_length=50)
    options: list[str] | None = None
    correct_answer: str = Field(min_length=1)
    marking_criteria: list[MarkingCriterion] = Field(min_length=1)
    marks: int = Field(ge=1, le=100)

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
            detail="Institution teacher or administrator access required.",
        )

    institution = db.get(Institution, user.institution_id)

    if institution is None or not institution.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your institution is inactive.",
        )

    return user


def passage_to_dict(passage: Passage) -> dict:
    return {
        "id": passage.id,
        "title": passage.title,
        "category": passage.category,
        "content": passage.content,
        "status": passage.status,
        "institution_id": passage.institution_id,
        "created_by_user_id": passage.created_by_user_id,
        "created_at": passage.created_at,
        "updated_at": passage.updated_at,
    }


@router.get("/passages")
def list_passages(
    db: Session = Depends(get_db),
    user: User = Depends(require_institution_user),
):
    """List passages belonging only to the current institution."""

    passages = db.scalars(
        select(Passage)
        .where(Passage.institution_id == user.institution_id)
        .order_by(Passage.id.desc())
    ).all()

    return {
        "items": [passage_to_dict(passage) for passage in passages]
    }


@router.post("/passages", status_code=status.HTTP_201_CREATED)
def create_passage(
    request: PassageCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_institution_user),
):
    """Create a draft passage for the current institution."""

    title = request.title.strip()
    category = request.category.strip() or "General"
    content = request.content.strip()

    if len(title) < 2 or not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A title and passage content are required.",
        )

    passage = Passage(
        institution_id=user.institution_id,
        created_by_user_id=user.id,
        title=title,
        category=category,
        content=content,
        status="Draft",
    )

    db.add(passage)
    db.commit()
    db.refresh(passage)

    return passage_to_dict(passage)

def question_to_dict(question: Question) -> dict:
    return {
        "id": question.id,
        "passage_id": question.passage_id,
        "prompt": question.prompt,
        "question_type": question.question_type,
        "options": question.options,
        "correct_answer": question.correct_answer,
        "marking_criteria": question.marking_criteria,
        "marks": question.marks,
        "institution_id": question.institution_id,
        "created_by_user_id": question.created_by_user_id,
        "created_at": question.created_at,
    }


@router.get("/questions")
def list_questions(
    passage_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_institution_user),
):
    """List questions belonging to the logged-in user's institution."""

    # Identify questions already assigned to published exams.
    published_question_ids = (
        select(ExamQuestion.question_id)
        .join(Exam, Exam.id == ExamQuestion.exam_id)
        .where(
            Exam.institution_id == user.institution_id,
            Exam.status == "Published",
        )
    )

    # Only show questions that are not used in published exams.
    statement = select(Question).where(
        Question.institution_id == user.institution_id,
        ~Question.id.in_(published_question_ids),
    )

    if passage_id is not None:
        statement = statement.where(
            Question.passage_id == passage_id
        )

    questions = db.scalars(
        statement.order_by(Question.id.desc())
    ).all()

    return {
        "items": [
            question_to_dict(question)
            for question in questions
        ]
    }


@router.post("/questions", status_code=status.HTTP_201_CREATED)
def create_question(
    request: QuestionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_institution_user),
):
    """Create a question with a reference answer and marking criteria."""

    prompt = request.prompt.strip()
    correct_answer = request.correct_answer.strip()

    if not prompt or not correct_answer:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Question text and reference answer are required.",
        )

    # Require the marking criteria to account for all available marks.
    criteria_total = sum(
        criterion.marks
        for criterion in request.marking_criteria
    )

    if criteria_total != request.marks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "The marks assigned to marking criteria must add up "
                "to the question's maximum marks."
            ),
        )

    if request.passage_id is not None:
        passage = db.get(Passage, request.passage_id)

        if (
            passage is None
            or passage.institution_id != user.institution_id
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Passage not found in your institution.",
            )

    question = Question(
        institution_id=user.institution_id,
        passage_id=request.passage_id,
        created_by_user_id=user.id,
        prompt=prompt,
        question_type=request.question_type.strip(),
        options=request.options,
        correct_answer=correct_answer,
        marking_criteria=[
            criterion.model_dump()
            for criterion in request.marking_criteria
        ],
        marks=request.marks,
    )

    db.add(question)
    db.commit()
    db.refresh(question)

    return question_to_dict(question)



@router.put("/questions/{question_id}")
def update_question(
    question_id: int,
    request: QuestionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_institution_user),
):
    """Update a question belonging to the user's institution."""

    question = db.scalar(
        select(Question).where(
            Question.id == question_id,
            Question.institution_id == user.institution_id,
        )
    )

    if question is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found.",
        )

    # Prevent changes to questions used in published exams.
    published_assignment = db.scalar(
        select(ExamQuestion.id)
        .join(Exam, Exam.id == ExamQuestion.exam_id)
        .where(
            ExamQuestion.question_id == question_id,
            Exam.institution_id == user.institution_id,
            Exam.status == "Published",
        )
    )

    if published_assignment is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This question belongs to a published exam "
                "and cannot be modified."
            ),
        )

    prompt = request.prompt.strip()
    correct_answer = request.correct_answer.strip()
    question_type = request.question_type.strip()

    if not prompt or not correct_answer or not question_type:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Question text, type and reference answer are required.",
        )

    # Ensure marking criteria account for all available marks.
    criteria_total = sum(
        criterion.marks
        for criterion in request.marking_criteria
    )

    if criteria_total != request.marks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "The marks assigned to marking criteria must add up "
                "to the question's maximum marks."
            ),
        )

    # Validate that the selected passage belongs to this institution.
    if request.passage_id is not None:
        passage = db.get(Passage, request.passage_id)

        if (
            passage is None
            or passage.institution_id != user.institution_id
        ):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Passage not found in your institution.",
            )

    question.passage_id = request.passage_id
    question.prompt = prompt
    question.question_type = question_type
    question.options = request.options
    question.correct_answer = correct_answer
    question.marking_criteria = [
        criterion.model_dump()
        for criterion in request.marking_criteria
    ]
    question.marks = request.marks

    db.commit()
    db.refresh(question)

    return question_to_dict(question)
