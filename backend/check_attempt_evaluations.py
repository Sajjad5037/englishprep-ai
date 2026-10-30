from app.database import SessionLocal
from app.models import Attempt, StudentAnswer, Evaluation
from sqlalchemy import select

db = SessionLocal()

try:
    attempt_id = 5

    attempt = db.get(Attempt, attempt_id)

    print(f"\nAttempt ID: {attempt_id}")
    print(f"Attempt status: {attempt.status if attempt else 'NOT FOUND'}")

    answers = db.scalars(
        select(StudentAnswer).where(
            StudentAnswer.attempt_id == attempt_id
        )
    ).all()

    for answer in answers:
        evaluation = db.scalar(
            select(Evaluation).where(
                Evaluation.student_answer_id == answer.id
            )
        )

        print(f"\nStudent Answer ID: {answer.id}")
        print(f"Question ID: {answer.question_id}")

        if evaluation is None:
            print("Evaluation: NOT FOUND")
            continue

        print(f"Evaluation status: {evaluation.status}")
        print(
            f"Marks: {evaluation.marks_awarded}/"
            f"{evaluation.max_marks}"
        )
        print(f"Model: {evaluation.model_id}")
        print(f"Error: {evaluation.error_message}")

finally:
    db.close()