from getpass import getpass

from pwdlib import PasswordHash
from sqlalchemy import select

from app.database import SessionLocal
from app.models import User


def main() -> None:
    email = input("Admin email: ").strip().lower()

    password = getpass("Enter new password (minimum 16 characters): ")
    confirmation = getpass("Confirm new password: ")

    if len(password) < 16:
        print("Password must be at least 16 characters long.")
        return

    if password != confirmation:
        print("Passwords do not match.")
        return

    password_hash = PasswordHash.recommended().hash(password)

    with SessionLocal() as db:
        admin = db.scalar(
            select(User).where(
                User.email == email,
                User.role == "admin",
            )
        )

        if admin is None:
            print("No administrator found with that email.")
            return

        admin.password_hash = password_hash
        db.commit()

    print("Administrator password updated successfully.")


if __name__ == "__main__":
    main()