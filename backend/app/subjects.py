from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    ClassEnrollment,
    ClassSubject,
    ClassSubjectEnrollment,
    SchoolClass,
    Subject,
    User,
)
from app.classes import require_institution_admin

class SubjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)


class ClassSubjectEnrollmentCreate(BaseModel):
    student_id: int = Field(gt=0)
class ClassSubjectCreate(BaseModel):
    class_id: int = Field(gt=0)
    subject_id: int = Field(gt=0)
    teacher_id: int = Field(gt=0)

class ClassSubjectTeacherUpdate(BaseModel):
    teacher_id: int = Field(gt=0)

router = APIRouter(
    prefix="/api/subjects",
    tags=["Subject Management"],
)
@router.post(
    "/class-subjects/{class_subject_id}/students",
    status_code=status.HTTP_201_CREATED,
)
def enroll_student_in_subject(
    class_subject_id: int,
    request: ClassSubjectEnrollmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_institution_admin),
):
    """Enrol an existing class student in a particular subject."""

    # Verify that the class-subject belongs to this institution.
    class_subject = db.scalar(
        select(ClassSubject)
        .join(
            SchoolClass,
            SchoolClass.id == ClassSubject.class_id,
        )
        .where(
            ClassSubject.id == class_subject_id,
            SchoolClass.institution_id == admin.institution_id,
        )
    )

    if class_subject is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class subject not found.",
        )

    # Verify that the student belongs to this institution.
    student = db.scalar(
        select(User).where(
            User.id == request.student_id,
            User.institution_id == admin.institution_id,
            User.role == "student",
            User.is_active.is_(True),
        )
    )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active student not found.",
        )

    # The student must already belong to this class.
    class_enrollment = db.scalar(
        select(ClassEnrollment).where(
            ClassEnrollment.class_id == class_subject.class_id,
            ClassEnrollment.student_id == student.id,
        )
    )

    if class_enrollment is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This student is not enrolled in the selected class.",
        )

    # Prevent duplicate enrolment in the same subject.
    existing_enrollment = db.scalar(
        select(ClassSubjectEnrollment).where(
            ClassSubjectEnrollment.class_subject_id == class_subject.id,
            ClassSubjectEnrollment.student_id == student.id,
        )
    )

    if existing_enrollment is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This student is already enrolled in this subject.",
        )

    enrollment = ClassSubjectEnrollment(
        class_subject_id=class_subject.id,
        student_id=student.id,
    )

    db.add(enrollment)

    try:
        db.commit()
        db.refresh(enrollment)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This student is already enrolled in this subject.",
        )

    return {
        "id": enrollment.id,
        "class_subject_id": class_subject.id,
        "student_id": student.id,
        "student_name": student.full_name,
        "message": "Student enrolled in subject successfully.",
    }
@router.get("")
def list_subjects(
    db: Session = Depends(get_db),
    admin: User = Depends(require_institution_admin),
):
    """List all subjects belonging to the administrator's institution."""

    subjects = db.scalars(
        select(Subject)
        .where(
            Subject.institution_id == admin.institution_id
        )
        .order_by(Subject.name.asc())
    ).all()

    return {
        "items": [
            {
                "id": subject.id,
                "name": subject.name,
                "created_at": subject.created_at,
            }
            for subject in subjects
        ]
    }
@router.post("", status_code=status.HTTP_201_CREATED)
def create_subject(
    request: SubjectCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_institution_admin),
):
    """Create a subject within the administrator's institution."""

    name = request.name.strip()

    if len(name) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Subject name must contain at least two characters.",
        )

    subject = Subject(
        institution_id=admin.institution_id,
        name=name,
    )

    db.add(subject)

    try:
        db.commit()
        db.refresh(subject)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This subject already exists in your institution.",
        )

    return {
        "id": subject.id,
        "name": subject.name,
        "institution_id": subject.institution_id,
        "created_at": subject.created_at,
    }

@router.post(
    "/class-subjects",
    status_code=status.HTTP_201_CREATED,
)
def assign_teacher_to_class_subject(
    request: ClassSubjectCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_institution_admin),
):
    """Assign a teacher to a subject within a class."""

    # Verify that the class belongs to this institution.
    school_class = db.scalar(
        select(SchoolClass).where(
            SchoolClass.id == request.class_id,
            SchoolClass.institution_id == admin.institution_id,
        )
    )

    if school_class is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found in your institution.",
        )

    # Verify that the subject belongs to this institution.
    subject = db.scalar(
        select(Subject).where(
            Subject.id == request.subject_id,
            Subject.institution_id == admin.institution_id,
        )
    )

    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found in your institution.",
        )

    # Verify that the teacher is active and belongs
    # to the same institution.
    teacher = db.scalar(
        select(User).where(
            User.id == request.teacher_id,
            User.institution_id == admin.institution_id,
            User.role == "teacher",
            User.is_active.is_(True),
        )
    )

    if teacher is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active teacher not found in your institution.",
        )

    class_subject = ClassSubject(
        class_id=school_class.id,
        subject_id=subject.id,
        teacher_id=teacher.id,
    )

    db.add(class_subject)

    try:
        db.commit()
        db.refresh(class_subject)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This subject has already been assigned to this class.",
        )

    return {
        "id": class_subject.id,
        "class_id": school_class.id,
        "class_name": school_class.name,
        "subject_id": subject.id,
        "subject_name": subject.name,
        "teacher_id": teacher.id,
        "teacher_name": teacher.full_name,
        "message": "Teacher assigned to class subject successfully.",
    }


@router.get("/class-subjects")
def list_class_subjects(
    db: Session = Depends(get_db),
    admin: User = Depends(require_institution_admin),
):
    """List class subjects, assigned teachers and enrolled students."""

    statement = (
        select(ClassSubject, SchoolClass, Subject, User)
        .join(
            SchoolClass,
            SchoolClass.id == ClassSubject.class_id,
        )
        .join(
            Subject,
            Subject.id == ClassSubject.subject_id,
        )
        .join(
            User,
            User.id == ClassSubject.teacher_id,
        )
        .where(
            SchoolClass.institution_id == admin.institution_id
        )
        .order_by(
            SchoolClass.name,
            Subject.name,
        )
    )

    rows = db.execute(statement).all()

    class_subject_ids = [
        row[0].id for row in rows
    ]

    students_by_class_subject = {
        class_subject_id: []
        for class_subject_id in class_subject_ids
    }

    if class_subject_ids:
        enrollment_rows = db.execute(
            select(ClassSubjectEnrollment, User)
            .join(
                User,
                User.id == ClassSubjectEnrollment.student_id,
            )
            .where(
                ClassSubjectEnrollment.class_subject_id.in_(
                    class_subject_ids
                )
            )
            .order_by(User.full_name)
        ).all()

        for enrollment, student in enrollment_rows:
            students_by_class_subject[
                enrollment.class_subject_id
            ].append({
                "id": student.id,
                "full_name": student.full_name,
                "email": student.email,
                "enrolled_at": enrollment.enrolled_at,
            })

    return {
        "items": [
            {
                "id": class_subject.id,
                "class_id": school_class.id,
                "class_name": school_class.name,
                "subject_id": subject.id,
                "subject_name": subject.name,
                "teacher_id": teacher.id,
                "teacher_name": teacher.full_name,
                "student_count": len(
                    students_by_class_subject[class_subject.id]
                ),
                "students": students_by_class_subject[
                    class_subject.id
                ],
            }
            for class_subject, school_class, subject, teacher in rows
        ]
    }

@router.put("/class-subjects/{class_subject_id}/teacher")
def update_class_subject_teacher(
    class_subject_id: int,
    request: ClassSubjectTeacherUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_institution_admin),
):
    """Change the teacher assigned to a class subject."""

    # Find the class subject within this institution.
    class_subject = db.scalar(
        select(ClassSubject)
        .join(
            SchoolClass,
            SchoolClass.id == ClassSubject.class_id,
        )
        .where(
            ClassSubject.id == class_subject_id,
            SchoolClass.institution_id == admin.institution_id,
        )
    )

    if class_subject is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class subject not found.",
        )

    # Verify the replacement teacher.
    teacher = db.scalar(
        select(User).where(
            User.id == request.teacher_id,
            User.institution_id == admin.institution_id,
            User.role == "teacher",
            User.is_active.is_(True),
        )
    )

    if teacher is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active teacher not found in your institution.",
        )

    class_subject.teacher_id = teacher.id

    db.commit()
    db.refresh(class_subject)

    return {
        "id": class_subject.id,
        "teacher_id": teacher.id,
        "teacher_name": teacher.full_name,
        "message": "Subject teacher updated successfully.",
    }


@router.delete(
    "/class-subjects/{class_subject_id}/students/{student_id}"
)
def remove_student_from_subject(
    class_subject_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_institution_admin),
):
    """Remove a student from a subject without removing class membership."""

    # Verify that this class subject belongs to the institution.
    class_subject = db.scalar(
        select(ClassSubject)
        .join(
            SchoolClass,
            SchoolClass.id == ClassSubject.class_id,
        )
        .where(
            ClassSubject.id == class_subject_id,
            SchoolClass.institution_id == admin.institution_id,
        )
    )

    if class_subject is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class subject not found.",
        )

    # Find the student's subject enrolment.
    enrollment = db.scalar(
        select(ClassSubjectEnrollment).where(
            ClassSubjectEnrollment.class_subject_id == class_subject_id,
            ClassSubjectEnrollment.student_id == student_id,
        )
    )

    if enrollment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student is not enrolled in this subject.",
        )

    db.delete(enrollment)
    db.commit()

    return {
        "message": "Student removed from subject successfully.",
        "student_id": student_id,
        "class_subject_id": class_subject_id,
    }