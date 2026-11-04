import os

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    ClassEnrollment,
    Institution,
    SchoolClass,
    User,
)


router = APIRouter(
    prefix="/api/classes",
    tags=["Class Management"],
)

bearer_scheme = HTTPBearer(auto_error=False)

class ClassCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    teacher_id: int = Field(gt=0)

class ClassEnrollmentCreate(BaseModel):
    student_id: int = Field(gt=0)

class ClassTeacherUpdate(BaseModel):
    teacher_id: int = Field(gt=0)
class ClassRename(BaseModel):
    name: str = Field(min_length=2, max_length=100)

def require_institution_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Allow only active institution administrators to manage classes."""

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
        or user.role != "admin"
        or user.institution_id is None
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Institution administrator access required.",
        )

    institution = db.get(Institution, user.institution_id)

    if institution is None or not institution.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your institution is inactive.",
        )

    return user



@router.post("", status_code=status.HTTP_201_CREATED)
def create_class(
    request: ClassCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_institution_admin),
):
    """Create a class and assign an institution teacher."""

    class_name = request.name.strip()

    if len(class_name) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please provide a valid class name.",
        )

    # Verify that the selected teacher belongs to this institution.
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

    school_class = SchoolClass(
        institution_id=admin.institution_id,
        name=class_name,
        teacher_id=teacher.id,
    )

    db.add(school_class)

    try:
        db.commit()
        db.refresh(school_class)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A class with this name already exists.",
        )

    return {
        "id": school_class.id,
        "name": school_class.name,
        "institution_id": school_class.institution_id,
        "teacher_id": school_class.teacher_id,
        "teacher_name": teacher.full_name,
        "teacher_email": teacher.email,
        "created_at": school_class.created_at,
    }

    
@router.get("")
def list_classes(
    db: Session = Depends(get_db),
    admin: User = Depends(require_institution_admin),
):
    """List institution classes, assigned teachers and enrolled students."""

    classes = db.scalars(
        select(SchoolClass)
        .where(
            SchoolClass.institution_id == admin.institution_id
        )
        .order_by(SchoolClass.name.asc())
    ).all()

    if not classes:
        return {"items": []}

    class_ids = [school_class.id for school_class in classes]
    teacher_ids = list({
        school_class.teacher_id for school_class in classes
    })

    # Retrieve assigned teachers belonging to this institution.
    teachers = db.scalars(
        select(User).where(
            User.id.in_(teacher_ids),
            User.institution_id == admin.institution_id,
            User.role == "teacher",
        )
    ).all()

    teacher_lookup = {
        teacher.id: teacher for teacher in teachers
    }

    # Retrieve student enrollments for these classes.
    enrollments = db.scalars(
        select(ClassEnrollment).where(
            ClassEnrollment.class_id.in_(class_ids)
        )
    ).all()

    student_ids = list({
        enrollment.student_id for enrollment in enrollments
    })

    students = []

    if student_ids:
        students = db.scalars(
            select(User).where(
                User.id.in_(student_ids),
                User.institution_id == admin.institution_id,
                User.role == "student",
            )
        ).all()

    student_lookup = {
        student.id: student for student in students
    }

    enrollments_by_class = {}

    for enrollment in enrollments:
        enrollments_by_class.setdefault(
            enrollment.class_id, []
        ).append(enrollment.student_id)

    items = []

    for school_class in classes:
        teacher = teacher_lookup.get(school_class.teacher_id)

        enrolled_students = [
            student_lookup[student_id]
            for student_id in enrollments_by_class.get(
                school_class.id, []
            )
            if student_id in student_lookup
        ]

        items.append({
            "id": school_class.id,
            "name": school_class.name,
            "teacher_id": school_class.teacher_id,
            "teacher_name": (
                teacher.full_name if teacher else None
            ),
            "teacher_email": (
                teacher.email if teacher else None
            ),
            "student_count": len(enrolled_students),
            "students": [
                {
                    "id": student.id,
                    "full_name": student.full_name,
                    "email": student.email,
                    "is_active": student.is_active,
                }
                for student in enrolled_students
            ],
            "created_at": school_class.created_at,
        })

    return {"items": items}


@router.post(
    "/{class_id}/students",
    status_code=status.HTTP_201_CREATED,
)
def enroll_student(
    class_id: int,
    request: ClassEnrollmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_institution_admin),
):
    """Enrol an institution student in a class."""

    # Verify that the class belongs to this institution.
    school_class = db.scalar(
        select(SchoolClass).where(
            SchoolClass.id == class_id,
            SchoolClass.institution_id == admin.institution_id,
        )
    )

    if school_class is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found in your institution.",
        )

    # Verify that the student belongs to the same institution.
    student = db.scalar(
        select(User).where(
            User.id == request.student_id,
            User.institution_id == admin.institution_id,
            User.role == "student",
        )
    )

    if student is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found in your institution.",
        )


    # Prevent a student from belonging to multiple classes.
    existing_enrollment = db.scalar(
        select(ClassEnrollment)
        .join(
            SchoolClass,
            ClassEnrollment.class_id == SchoolClass.id,
        )
        .where(
            ClassEnrollment.student_id == student.id,
            SchoolClass.institution_id == admin.institution_id,
        )
    )

    if existing_enrollment is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This student is already enrolled in a class. "
                "Remove them from their current class before enrolling them elsewhere."
            ),
        )

    enrollment = ClassEnrollment(
        class_id=class_id,
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
            detail="This student is already enrolled in this class.",
        )

    return {
        "id": enrollment.id,
        "class_id": enrollment.class_id,
        "class_name": school_class.name,
        "student_id": student.id,
        "student_name": student.full_name,
        "student_email": student.email,
        "enrolled_at": enrollment.enrolled_at,
        "message": "Student enrolled successfully.",
    }

@router.delete("/{class_id}/students/{student_id}")
def remove_student_from_class(
    class_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_institution_admin),
):
    """Remove a student from a class without deleting their account."""

    # Verify that the class belongs to this institution.
    school_class = db.scalar(
        select(SchoolClass).where(
            SchoolClass.id == class_id,
            SchoolClass.institution_id == admin.institution_id,
        )
    )

    if school_class is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found in your institution.",
        )

    # Find the student's enrollment.
    enrollment = db.scalar(
        select(ClassEnrollment).where(
            ClassEnrollment.class_id == class_id,
            ClassEnrollment.student_id == student_id,
        )
    )

    if enrollment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student is not enrolled in this class.",
        )

    db.delete(enrollment)
    db.commit()

    return {
        "message": "Student removed from class successfully.",
        "class_id": class_id,
        "student_id": student_id,
    }


@router.put("/{class_id}/teacher")
def update_class_teacher(
    class_id: int,
    request: ClassTeacherUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_institution_admin),
):
    """Change the teacher assigned to a class."""

    # Verify that the class belongs to this institution.
    school_class = db.scalar(
        select(SchoolClass).where(
            SchoolClass.id == class_id,
            SchoolClass.institution_id == admin.institution_id,
        )
    )

    if school_class is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found in your institution.",
        )

    # Verify that the new teacher belongs to this institution.
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

    school_class.teacher_id = teacher.id

    db.commit()
    db.refresh(school_class)

    return {
        "id": school_class.id,
        "name": school_class.name,
        "teacher_id": teacher.id,
        "teacher_name": teacher.full_name,
        "teacher_email": teacher.email,
        "message": "Class teacher updated successfully.",
    }


@router.put("/{class_id}")
def rename_class(
    class_id: int,
    request: ClassRename,
    db: Session = Depends(get_db),
    admin: User = Depends(require_institution_admin),
):
    """Rename a class belonging to the administrator's institution."""

    school_class = db.scalar(
        select(SchoolClass).where(
            SchoolClass.id == class_id,
            SchoolClass.institution_id == admin.institution_id,
        )
    )

    if school_class is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Class not found in your institution.",
        )

    new_name = request.name.strip()

    if len(new_name) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Class name must contain at least two characters.",
        )

    existing_class = db.scalar(
        select(SchoolClass).where(
            SchoolClass.institution_id == admin.institution_id,
            SchoolClass.name == new_name,
            SchoolClass.id != class_id,
        )
    )

    if existing_class is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A class with this name already exists.",
        )

    school_class.name = new_name

    try:
        db.commit()
        db.refresh(school_class)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A class with this name already exists.",
        )

    return {
        "id": school_class.id,
        "name": school_class.name,
        "teacher_id": school_class.teacher_id,
        "message": "Class renamed successfully.",
    }
