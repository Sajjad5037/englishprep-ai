from getpass import getpass

from pwdlib import PasswordHash

from app.database import SessionLocal
from app.models import User


password_hasher = PasswordHash.recommended()
USER_ID = 1

db = SessionLocal()

try:
    user = db.get(User, USER_ID)

    if user is None or user.role != "platform_owner":
        raise RuntimeError("Platform Owner account not found.")

    if not user.is_active:
        raise RuntimeError("This account is inactive.")

    print(f"Account: {user.email}")
    print(f"Role: {user.role}")

    confirmation = input(
        "\nType RESET to confirm the password reset: "
    )

    if confirmation != "RESET":
        print("Password reset cancelled.")
        raise SystemExit(0)

    new_password = getpass("\nEnter your new password: ")
    confirm_password = getpass("Confirm your new password: ")

    if len(new_password) < 12:
        raise ValueError("Password must contain at least 12 characters.")

    if new_password != confirm_password:
        raise ValueError("The passwords do not match.")

    user.password_hash = password_hasher.hash(new_password)

    db.commit()

    print("\nPassword reset successfully!")
    print("You can now log in using your Platform Owner email.")

except Exception:
    db.rollback()
    raise

finally:
    db.close()