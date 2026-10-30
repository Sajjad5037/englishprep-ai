import os

from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.database import SessionLocal
from app.models import User


password_hasher = PasswordHash.recommended()


def ensure_admin_exists() -> None:
    """
    Ensure a platform owner exists.

    The function name is retained because main.py currently imports it.
    An existing configured admin is promoted without changing its password.
    """

    with SessionLocal() as db:
        # If a platform owner already exists, do nothing.
        existing_owner = db.scalar(
            select(User.id)
            .where(User.role == "platform_owner")
            .limit(1)
        )

        if existing_owner is not None:
            print("Platform owner already exists; bootstrap skipped.")
            return

        email = os.getenv("ADMIN_EMAIL", "").strip().lower()

        if not email:
            raise RuntimeError(
                "ADMIN_EMAIL must be configured in the environment."
            )

        # Find the account configured for initial administration.
        existing_user = db.scalar(
            select(User).where(User.email == email)
        )

        if existing_user is not None:
            if existing_user.role == "admin":
                # Promote the existing account without changing its password.
                existing_user.role = "platform_owner"
                db.commit()

                print(
                    "Existing admin account promoted to platform_owner."
                )
                return

            raise RuntimeError(
                "ADMIN_EMAIL belongs to an account with an unexpected role. "
                "No automatic role changes were made."
            )

        # Create a new owner only if the configured account does not exist.
        password = os.getenv("ADMIN_PASSWORD", "")

        if len(password) < 12:
            raise RuntimeError(
                "ADMIN_PASSWORD must be at least 12 characters long."
            )

        owner = User(
            email=email,
            password_hash=password_hasher.hash(password),
            role="platform_owner",
            is_active=True,
        )

        db.add(owner)

        try:
            db.commit()
            print("Initial platform owner account created successfully.")

        except IntegrityError:
            db.rollback()

            existing_owner = db.scalar(
                select(User.id)
                .where(User.role == "platform_owner")
                .limit(1)
            )

            if existing_owner is not None:
                print("Platform owner already exists; bootstrap skipped.")
                return

            raise