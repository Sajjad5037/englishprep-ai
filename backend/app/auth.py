import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session
from pwdlib import PasswordHash

from app.database import get_db
from app.models import Institution, User


router = APIRouter(prefix="/api/auth", tags=["Authentication"])

password_hasher = PasswordHash.recommended()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


def create_access_token(user: User) -> str:
    """Create a signed JWT for an authenticated administrator."""

    secret_key = os.getenv("JWT_SECRET_KEY")

    if not secret_key:
        raise RuntimeError("JWT_SECRET_KEY is not configured.")

    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(minutes=60),
    }

    return jwt.encode(
        payload,
        secret_key,
        algorithm="HS256",
    )


@router.post("/login", response_model=LoginResponse)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    """Authenticate an administrator using email and password."""

    email = str(request.email).strip().lower()

    user = db.scalar(
        select(User).where(User.email == email)
    )

    # Use the same response for invalid email and invalid password.
    if (
        user is None
        or not password_hasher.verify(
            request.password,
            user.password_hash,
        )
        or not user.is_active
	or user.role not in {
        "admin",
        "platform_owner",
        "teacher",
        "student",
    }
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user)

    institution = (
        db.get(Institution, user.institution_id)
        if user.institution_id is not None
        else None
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "institution_id": user.institution_id,
            "institution_name": (
                institution.name if institution else None
            ),
        },
    }