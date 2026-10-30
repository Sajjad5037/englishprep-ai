
import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from pwdlib import PasswordHash

from app.database import get_db
from app.models import Institution, User


router = APIRouter(
    prefix="/api/institution-users",
    tags=["Institution Users"],
)

bearer_scheme = HTTPBearer(auto_error=False)
password_hasher = PasswordHash.recommended()


class TeamMemberCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    role: Literal["teacher", "student"]


def require_institution_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Allow an active institution administrator to manage their team."""

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


@router.get("")
def list_team_members(
    db: Session = Depends(get_db),
    admin: User = Depends(require_institution_admin),
):
    """List teachers and students belonging only to this admin's institution."""

    members = db.scalars(
        select(User)
        .where(
            User.institution_id == admin.institution_id,
            User.role.in_(["teacher", "student"]),
        )
        .order_by(User.id.desc())
    ).all()

    return {
        "items": [
            {
                "id": member.id,
                "full_name": member.full_name,
                "email": member.email,
                "role": member.role,
                "is_active": member.is_active,
                "invitation_pending": (
                    not member.is_active
                    and member.invitation_token_hash is not None
                ),
            }
            for member in members
        ]
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def invite_team_member(
    request: TeamMemberCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_institution_admin),
):
    """Create a teacher/student account invitation for this institution."""

    email = str(request.email).strip().lower()
    full_name = request.full_name.strip()

    if len(full_name) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please provide a valid full name.",
        )

    existing_user = db.scalar(
        select(User).where(User.email == email)
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already exists for this email.",
        )

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(
        raw_token.encode("utf-8")
    ).hexdigest()

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    # Create an inactive account with a random, undisclosed password.
    # The invitee will set their actual password through the setup link.
    member = User(
        full_name=full_name,
        email=email,
        password_hash=password_hasher.hash(
            secrets.token_urlsafe(48)
        ),
        role=request.role,
        institution_id=admin.institution_id,
        is_active=False,
        invitation_token_hash=token_hash,
        invitation_expires_at=expires_at,
    )

    db.add(member)

    try:
        db.commit()
        db.refresh(member)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already exists for this email.",
        )

    frontend_url = os.getenv(
        "FRONTEND_BASE_URL",
        "http://localhost:5173",
    ).rstrip("/")

    return {
        "id": member.id,
        "full_name": member.full_name,
        "email": member.email,
        "role": member.role,
        "institution_id": member.institution_id,
        "setup_url": f"{frontend_url}/?setup_token={raw_token}",
        "expires_at": expires_at,
        "message": "Invitation created. Share the setup link securely.",
    }
