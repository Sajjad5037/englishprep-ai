
import os
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.orm import Session
from pwdlib import PasswordHash

from app.database import get_db
from app.models import AuthSession, Institution, User


router = APIRouter(prefix="/api/auth", tags=["Authentication"])

password_hasher = PasswordHash.recommended()

ACCESS_TOKEN_MINUTES = 60
REFRESH_TOKEN_DAYS = 30
REFRESH_COOKIE_NAME = "englishprep_refresh"

ALLOWED_ROLES = {
    "admin",
    "platform_owner",
    "teacher",
    "student",
}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


def create_access_token(user: User) -> str:
    """Create a short-lived JWT for an authenticated user."""

    secret_key = os.getenv("JWT_SECRET_KEY")

    if not secret_key:
        raise RuntimeError("JWT_SECRET_KEY is not configured.")

    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_MINUTES),
    }

    return jwt.encode(
        payload,
        secret_key,
        algorithm="HS256",
    )


def create_refresh_token() -> str:
    """Generate a cryptographically secure refresh token."""

    return secrets.token_urlsafe(64)


def hash_refresh_token(token: str) -> str:
    """Hash a refresh token before storing it in the database."""

    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_cookie_settings() -> dict:
    """Configure cookies for local development and production."""

    is_production = (
        os.getenv("RAILWAY_ENVIRONMENT") is not None
        or os.getenv("ENVIRONMENT", "").lower() == "production"
    )

    return {
        "httponly": True,
        "secure": is_production,
        "samesite": "none" if is_production else "lax",
        "path": "/api/auth",
        "max_age": REFRESH_TOKEN_DAYS * 24 * 60 * 60,
    }


def set_refresh_cookie(response: Response, token: str) -> None:
    """Store the refresh token in an HttpOnly browser cookie."""

    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        **get_cookie_settings(),
    )


def clear_refresh_cookie(response: Response) -> None:
    """Remove the refresh token cookie."""

    settings = get_cookie_settings()

    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=settings["path"],
        secure=settings["secure"],
        httponly=True,
        samesite=settings["samesite"],
    )


def get_user_response(db: Session, user: User) -> dict:
    institution = (
        db.get(Institution, user.institution_id)
        if user.institution_id is not None
        else None
    )

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "institution_id": user.institution_id,
        "institution_name": (
            institution.name if institution else None
        ),
    }


def create_user_session(
    db: Session,
    user: User,
    response: Response,
) -> str:
    """Create a database-backed refresh session."""

    refresh_token = create_refresh_token()
    now = datetime.now(timezone.utc)

    auth_session = AuthSession(
        user_id=user.id,
        refresh_token_hash=hash_refresh_token(refresh_token),
        expires_at=now + timedelta(days=REFRESH_TOKEN_DAYS),
        last_used_at=now,
    )

    db.add(auth_session)
    db.commit()

    set_refresh_cookie(response, refresh_token)

    return create_access_token(user)


@router.post("/login", response_model=LoginResponse)
def login(
    request: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """Authenticate a user and create a persistent login session."""

    email = str(request.email).strip().lower()

    user = db.scalar(
        select(User).where(User.email == email)
    )

    if (
        user is None
        or not password_hasher.verify(
            request.password,
            user.password_hash,
        )
        or not user.is_active
        or user.role not in ALLOWED_ROLES
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_user_session(db, user, response)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": get_user_response(db, user),
    }


@router.post("/refresh", response_model=LoginResponse)
def refresh_access_token(
    response: Response,
    refresh_token: str | None = Cookie(
        default=None,
        alias=REFRESH_COOKIE_NAME,
    ),
    db: Session = Depends(get_db),
):
    """Rotate the refresh token and issue a new access token."""

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh session not found. Please log in again.",
        )

    now = datetime.now(timezone.utc)
    token_hash = hash_refresh_token(refresh_token)

    auth_session = db.scalar(
        select(AuthSession).where(
            AuthSession.refresh_token_hash == token_hash
        )
    )

    if auth_session is None:
        print("[AUTH_REFRESH] REJECTED: No matching session found.")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh session is invalid or expired. Please log in again.",
        )

    if auth_session.revoked_at is not None:
        print(
            f"[AUTH_REFRESH] REJECTED: Session {auth_session.id} is revoked."
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh session is invalid or expired. Please log in again.",
        )

    if auth_session.expires_at <= now:
        print(
            f"[AUTH_REFRESH] REJECTED: Session {auth_session.id} has expired."
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh session is invalid or expired. Please log in again.",
        )

    user = db.get(User, auth_session.user_id)

    if (
        user is None
        or not user.is_active
        or user.role not in ALLOWED_ROLES
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account is inactive or unavailable.",
        )

    # Rotate the refresh token so the previous token cannot be reused.
    new_refresh_token = create_refresh_token()

    auth_session.refresh_token_hash = hash_refresh_token(
        new_refresh_token
    )
    auth_session.last_used_at = now
    auth_session.expires_at = now + timedelta(days=REFRESH_TOKEN_DAYS)

    db.commit()

    set_refresh_cookie(response, new_refresh_token)

    return {
        "access_token": create_access_token(user),
        "token_type": "bearer",
        "user": get_user_response(db, user),
    }


@router.post("/logout")
def logout(
    response: Response,
    refresh_token: str | None = Cookie(
        default=None,
        alias=REFRESH_COOKIE_NAME,
    ),
    db: Session = Depends(get_db),
):
    """Revoke the current refresh session and clear its cookie."""

    if refresh_token:
        token_hash = hash_refresh_token(refresh_token)

        auth_session = db.scalar(
            select(AuthSession).where(
                AuthSession.refresh_token_hash == token_hash
            )
        )

        if auth_session is not None:
            auth_session.revoked_at = datetime.now(timezone.utc)
            db.commit()

    clear_refresh_cookie(response)

    return {
        "message": "Logged out successfully."
    }
