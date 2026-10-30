
import os
from uuid import uuid4
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from pwdlib import PasswordHash
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models import Institution, User


router = APIRouter(
    prefix="/api/institutions",
    tags=["Institutions"],
)
password_hasher = PasswordHash.recommended()


bearer_scheme = HTTPBearer(auto_error=False)


class InstitutionCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    admin_email: EmailStr

class AcceptInvitationRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    password: str = Field(min_length=12, max_length=128)

class InstitutionUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    admin_email: EmailStr


def require_platform_owner(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Allow only active platform owners to manage institutions."""

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
        or user.role != "platform_owner"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform owner access required.",
        )

    return user


def institution_to_dict(institution: Institution) -> dict:
    return {
        "id": institution.id,
        "name": institution.name,
        "code": institution.code,
        "admin_email": institution.admin_email,
        "is_active": institution.is_active,
        "created_at": institution.created_at,
    }


@router.get("")
def list_institutions(
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_owner),
):
    """Return institutions for the platform owner."""

    institutions = db.scalars(
        select(Institution).order_by(Institution.id.desc())
    ).all()

    return {
        "items": [
            institution_to_dict(institution)
            for institution in institutions
        ]
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_institution(
    request: InstitutionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_owner),
):
    """Create a new institution record."""

    institution = Institution(
        name=request.name.strip(),
        code=f"INST-{uuid4().hex[:8].upper()}",
        admin_email=str(request.admin_email).lower(),
        is_active=True,
    )

    db.add(institution)
    db.commit()
    db.refresh(institution)

    return institution_to_dict(institution)

@router.put("/{institution_id}")
def update_institution(
    institution_id: int,
    request: InstitutionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_owner),
):
    """Update an institution's name and administrator email."""

    institution = db.get(Institution, institution_id)

    if institution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found.",
        )

    name = request.name.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Institution name cannot be empty.",
        )

    institution.name = name
    institution.admin_email = str(request.admin_email).lower()

    db.commit()
    db.refresh(institution)

    return institution_to_dict(institution)


@router.delete("/{institution_id}")
def delete_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_owner),
):
    """Delete an institution record."""

    institution = db.get(Institution, institution_id)

    if institution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found.",
        )

    db.delete(institution)
    db.commit()

    return {
        "message": "Institution deleted successfully.",
        "id": institution_id,
    }
@router.post("/{institution_id}/invitation")
def generate_admin_invitation(
    institution_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_platform_owner),
):
    """Generate a secure, seven-day administrator setup link."""

    institution = db.get(Institution, institution_id)

    if institution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found.",
        )

    if not institution.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot invite an administrator to an inactive institution.",
        )

    # Only generate an invitation for an email without an existing account.
    existing_user = db.scalar(
        select(User).where(
            User.email == institution.admin_email.lower()
        )
    )

    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already exists for this administrator email.",
        )

    # Generate a random token; store only its SHA-256 hash.
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(
        raw_token.encode("utf-8")
    ).hexdigest()

    institution.invitation_token_hash = token_hash
    institution.invitation_expires_at = (
        datetime.now(timezone.utc) + timedelta(days=7)
    )

    db.commit()

    # Use the local frontend by default.
    # Set FRONTEND_BASE_URL in Railway for deployed invitations.
    frontend_url = os.getenv(
        "FRONTEND_BASE_URL",
        "http://localhost:5173",
    ).rstrip("/")

    setup_url = (
        f"{frontend_url}/?setup_token={raw_token}"
    )

    return {
        "institution_id": institution.id,
        "institution_name": institution.name,
        "admin_email": institution.admin_email,
        "setup_url": setup_url,
        "expires_at": institution.invitation_expires_at,
        "message": "Invitation created. Share the setup link securely.",
    }
    

@router.post("/accept-invitation")
def accept_admin_invitation(
    request: AcceptInvitationRequest,
    db: Session = Depends(get_db),
):
    """Accept an institution-admin, teacher, or student invitation."""

    token_hash = hashlib.sha256(
        request.token.encode("utf-8")
    ).hexdigest()

    now = datetime.now(timezone.utc)

    # First: check for an institution administrator invitation.
    institution = db.scalar(
        select(Institution).where(
            Institution.invitation_token_hash == token_hash
        )
    )

    if institution is not None:
        if (
            institution.invitation_expires_at is None
            or institution.invitation_expires_at <= now
            or not institution.is_active
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired setup link.",
            )

        email = institution.admin_email.strip().lower()

        existing_user = db.scalar(
            select(User).where(User.email == email)
        )

        if existing_user is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account already exists for this email.",
            )

        new_admin = User(
            email=email,
            password_hash=password_hasher.hash(request.password),
            role="admin",
            institution_id=institution.id,
            is_active=True,
        )

        # Consume the invitation after successful account creation.
        institution.invitation_token_hash = None
        institution.invitation_expires_at = None

        db.add(new_admin)

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account already exists for this email.",
            )

        return {
            "message": "Administrator account created successfully.",
            "email": email,
            "role": "admin",
            "institution_id": institution.id,
            "institution_name": institution.name,
        }

    # Second: check for a teacher or student invitation in users.
    invited_user = db.scalar(
        select(User).where(
            User.invitation_token_hash == token_hash
        )
    )

    if (
        invited_user is None
        or invited_user.invitation_expires_at is None
        or invited_user.invitation_expires_at <= now
        or invited_user.is_active
        or invited_user.role not in {"teacher", "student"}
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired setup link.",
        )

    institution = db.get(
        Institution,
        invited_user.institution_id,
    )

    if institution is None or not institution.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This institution is inactive.",
        )

    # Activate the existing invited account.
    invited_user.password_hash = password_hasher.hash(
        request.password
    )
    invited_user.is_active = True
    invited_user.invitation_token_hash = None
    invited_user.invitation_expires_at = None

    db.commit()

    return {
        "message": "Account activated successfully.",
        "email": invited_user.email,
        "role": invited_user.role,
        "institution_id": institution.id,
        "institution_name": institution.name,
    }
