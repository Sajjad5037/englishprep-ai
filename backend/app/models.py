from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
    func,
)
from sqlalchemy import UniqueConstraint
from app.database import Base
class Passage(Base):
    """Reading passage belonging to one institution."""

    __tablename__ = "passages"

    id = Column(Integer, primary_key=True, index=True)

    institution_id = Column(
        Integer,
        ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    title = Column(String(200), nullable=False)
    category = Column(
        String(80),
        nullable=False,
        default="General",
    )
    content = Column(Text, nullable=False)

    status = Column(
        String(20),
        nullable=False,
        default="Draft",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

class Exam(Base):
    """An exam created by a teacher for their institution."""

    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)

    institution_id = Column(
        Integer,
        ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    title = Column(String(200), nullable=False)

    subject = Column(
        String(100),
        nullable=False,
        default="English Language",
    )

    level = Column(String(50), nullable=True)

    instructions = Column(Text, nullable=True)

    duration_minutes = Column(Integer, nullable=True)

    status = Column(
        String(20),
        nullable=False,
        default="Draft",
    )

    published_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class ExamQuestion(Base):
    """A question included in an exam, with its position and exam snapshot."""

    __tablename__ = "exam_questions"

    __table_args__ = (
        UniqueConstraint(
            "exam_id",
            "position",
            name="uq_exam_questions_position",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    exam_id = Column(
        Integer,
        ForeignKey("exams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    question_id = Column(
        Integer,
        ForeignKey("questions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    position = Column(Integer, nullable=False)

    # Optional exam-specific mark allocation.
    marks_override = Column(Integer, nullable=True)

    # Populated when the exam is published, preserving the version
    # of the question and its marking information used in the exam.
    published_snapshot = Column(JSON, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
class Question(Base):
    """Question belonging to an institution, optionally linked to a passage."""

    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)

    institution_id = Column(
        Integer,
        ForeignKey("institutions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    passage_id = Column(
        Integer,
        ForeignKey("passages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    prompt = Column(Text, nullable=False)

    question_type = Column(
        String(50),
        nullable=False,
        default="Short answer",
    )

    # Used for multiple-choice questions.
    options = Column(JSON, nullable=True)

    correct_answer = Column(Text, nullable=True)

    # Structured marking criteria for AI evaluation.
    # Example: [{"criterion": "Identifies the writer's intention", "marks": 1}]
    marking_criteria = Column(JSON, nullable=True)

    marks = Column(
        Integer,
        nullable=False,
        default=1,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

class Attempt(Base):
    """A student's attempt at an exam."""

    __tablename__ = "attempts"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    exam_id = Column(
        Integer,
        ForeignKey("exams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status = Column(
        String(30),
        nullable=False,
        default="in_progress",
    )

    started_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    submitted_at = Column(DateTime(timezone=True), nullable=True)

    completed_at = Column(DateTime(timezone=True), nullable=True)


class StudentAnswer(Base):
    """A student's saved response to a question in an exam attempt."""

    __tablename__ = "student_answers"

    __table_args__ = (
        UniqueConstraint(
            "attempt_id",
            "question_id",
            name="uq_student_answers_attempt_question",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    attempt_id = Column(
        Integer,
        ForeignKey("attempts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    question_id = Column(
        Integer,
        ForeignKey("questions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    answer_text = Column(Text, nullable=False, default="")

    answer_source = Column(
        String(30),
        nullable=False,
        default="typed",
    )

    saved_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    submitted_snapshot = Column(JSON, nullable=True)

class Evaluation(Base):
    """AI evaluation result for an individual student answer."""

    __tablename__ = "evaluations"

    __table_args__ = (
        UniqueConstraint(
            "student_answer_id",
            name="uq_evaluations_student_answer",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    student_answer_id = Column(
        Integer,
        ForeignKey("student_answers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # pending, completed, or failed
    status = Column(
        String(20),
        nullable=False,
        default="pending",
    )

    marks_awarded = Column(Integer, nullable=True)

    max_marks = Column(Integer, nullable=False)

    # Stores criterion-level decisions, evidence and feedback.
    criterion_results = Column(JSON, nullable=True)

    # Overall feedback provided to the student.
    feedback = Column(Text, nullable=True)

    # AI evaluation metadata.
    model_id = Column(String(100), nullable=True)

    prompt_version = Column(String(50), nullable=True)

    # Preserve the validated evaluation response.
    output_json = Column(JSON, nullable=True)

    # Store an error message if evaluation fails.
    error_message = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )
class Institution(Base):
    """A school or institution registered on EnglishPrep AI."""

    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(
        String(200),
        nullable=False,
    )

    code = Column(
        String(30),
        unique=True,
        index=True,
        nullable=False,
    )

    # The nominated main administrator's email.
    # Account creation and invitations will be implemented separately.
    admin_email = Column(
        String(320),
        nullable=False,
    )
    # Store a hash of the setup token, never the raw token.
    invitation_token_hash = Column(
        String(64),
        nullable=True,
    )

    invitation_expires_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    


class User(Base):
    """Database model for EnglishPrep AI user accounts."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # Platform owners have no institution association.
    # Institution administrators and other institution users
    # can be linked to their institution.
    institution_id = Column(
        Integer,
        ForeignKey("institutions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    full_name = Column(
        String(200),
        nullable=True,
    )

    # Invitation details for teacher and student account setup.
    invitation_token_hash = Column(
        String(64),
        nullable=True,
    )

    invitation_expires_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )
    email = Column(
        String(320),
        unique=True,
        index=True,
        nullable=False,
    )

    # Store a password hash, never the original password.
    password_hash = Column(
        String(255),
        nullable=False,
    )

    # Examples: "platform_owner", "admin", or "student"
    role = Column(
        String(30),
        nullable=False,
        default="student",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )