
import os
import secrets
import time
import hashlib
import base64
import mimetypes
import json
import tempfile
from google.oauth2 import service_account
from dataclasses import dataclass, field
from threading import Lock
from typing import Optional
import asyncio
from concurrent.futures import ThreadPoolExecutor
from google.cloud import vision
from google.oauth2 import service_account

from fastapi import Header

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from openai import OpenAI
from pydantic import BaseModel

from app.content import require_institution_user
from app.models import User


router = APIRouter(
    prefix="/api/passage-scanner",
    tags=["Passage Scanner"],
)

# Temporary scanning sessions are kept in memory.
SESSION_DURATION_SECONDS = 15 * 60
MAX_IMAGES_PER_SCAN = 10
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

sessions: dict[str, "ScanSession"] = {}
sessions_lock = Lock()


@dataclass
class ScanSession:
    session_id: str
    token_hash: str
    user_id: int
    institution_id: int
    expires_at: float
    status: str = "waiting"
    extracted_text: Optional[str] = None
    error: Optional[str] = None
    lock: Lock = field(default_factory=Lock)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def remove_expired_sessions():
    now = time.time()

    with sessions_lock:
        expired_ids = [
            session_id
            for session_id, session in sessions.items()
            if session.expires_at <= now
        ]

        for session_id in expired_ids:
            sessions.pop(session_id, None)


def get_session(session_id: str) -> ScanSession:
    remove_expired_sessions()

    with sessions_lock:
        session = sessions.get(session_id)

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scanning session not found or expired.",
        )

    return session


class ScanSessionResponse(BaseModel):
    session_id: str
    token: str
    expires_in_seconds: int



@router.post("/sessions", response_model=ScanSessionResponse)
def create_scan_session(
    user: User = Depends(require_institution_user),
):
    """Create a temporary QR scanning session for a teacher."""

    remove_expired_sessions()

    session_id = secrets.token_urlsafe(16)
    token = secrets.token_urlsafe(32)

    session = ScanSession(
        session_id=session_id,
        token_hash=hash_token(token),
        user_id=user.id,
        institution_id=user.institution_id,
        expires_at=time.time() + SESSION_DURATION_SECONDS,
    )

    with sessions_lock:
        sessions[session_id] = session

    return ScanSessionResponse(
        session_id=session_id,
        token=token,
        expires_in_seconds=SESSION_DURATION_SECONDS,
    )



@router.get("/sessions/{session_id}")
def get_scan_session_status(
    session_id: str,
    user: User = Depends(require_institution_user),
):
    """Return the status and extracted text for the teacher's session."""

    session = get_session(session_id)

    # A teacher must only access their own scanning sessions.
    if (
        session.user_id != user.id
        or session.institution_id != user.institution_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this scanning session.",
        )

    response = {
        "session_id": session.session_id,
        "status": session.status,
    }

    if session.status == "completed":
        response["extracted_text"] = session.extracted_text

    if session.status == "failed":
        response["error"] = session.error

    return response





OCR_MODEL_ID = os.getenv("OPENAI_OCR_MODEL", "gpt-4o")
def get_vision_client():
    encoded_credentials = os.getenv(
        "GOOGLE_CLOUD_CREDENTIALS_BASE64"
    )

    if not encoded_credentials:
        raise RuntimeError(
            "Google Cloud credentials are not configured."
        )

    credentials_json = base64.b64decode(
        encoded_credentials
    ).decode("utf-8")

    credentials_info = json.loads(credentials_json)

    credentials = service_account.Credentials.from_service_account_info(
        credentials_info,
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )

    return vision.ImageAnnotatorClient(
        credentials=credentials
    )


def extract_passage_text(images: list[tuple[str, bytes]]) -> str:
    """Extract printed and handwritten text using Google Cloud Vision."""

    client = get_vision_client()
    extracted_pages = []

    for page_number, (mime_type, image_bytes) in enumerate(images, start=1):
        image = vision.Image(content=image_bytes)

        response = client.document_text_detection(image=image)

        if response.error.message:
            raise RuntimeError(
                f"Google Vision OCR failed on page {page_number}: "
                f"{response.error.message}"
            )

        page_text = ""

        if response.full_text_annotation:
            page_text = response.full_text_annotation.text.strip()

        if page_text:
            extracted_pages.append(
                f"--- Page {page_number} ---\n{page_text}"
            )

    extracted_text = "\n\n".join(extracted_pages).strip()

    if not extracted_text:
        raise ValueError(
            "No readable text could be extracted from the uploaded images."
        )

    return extracted_text


@router.post("/upload")
async def upload_passage_images(
    session_id: str,
    files: list[UploadFile] = File(...),
    x_scan_token: str | None = Header(default=None),
):
    """Receive mobile images and extract passage text."""

    if not x_scan_token:
        raise HTTPException(
            status_code=401,
            detail="Scanning token is required.",
        )

    session = get_session(session_id)

    if not secrets.compare_digest(
        session.token_hash,
        hash_token(x_scan_token),
    ):
        raise HTTPException(
            status_code=403,
            detail="Invalid scanning token.",
        )

    with session.lock:
        if session.status != "waiting":
            raise HTTPException(
                status_code=409,
                detail="This scanning session has already been used.",
            )

        session.status = "processing"

    try:
        if not files or len(files) > MAX_IMAGES_PER_SCAN:
            raise ValueError(
                f"Upload between 1 and {MAX_IMAGES_PER_SCAN} images."
            )

        images = []

        for upload in files:
            mime_type = upload.content_type or ""

            if mime_type not in {
                "image/jpeg",
                "image/png",
                "image/webp",
            }:
                raise ValueError(
                    "Only JPEG, PNG and WebP images are supported."
                )

            image_bytes = await upload.read(
                MAX_IMAGE_SIZE_BYTES + 1
            )

            if not image_bytes:
                raise ValueError("An uploaded image is empty.")

            if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
                raise ValueError(
                    "Each image must be 10 MB or smaller."
                )

            images.append((mime_type, image_bytes))

        extracted_text = await asyncio.to_thread(
            extract_passage_text,
            images,
        )

        with session.lock:
            session.extracted_text = extracted_text
            session.status = "completed"

        return {
            "message": "Passage text extracted successfully.",
            "status": "completed",
        }

    except Exception as exc:
        with session.lock:
            session.status = "failed"
            session.error = str(exc)

        if isinstance(exc, HTTPException):
            raise exc

        if isinstance(exc, ValueError):
            raise HTTPException(
                status_code=422,
                detail=str(exc),
            )

        raise HTTPException(
            status_code=500,
            detail="Unable to extract passage text. Please try again.",
        )

    finally:
        for upload in files:
            await upload.close()
