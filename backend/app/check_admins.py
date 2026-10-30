from app.database import SessionLocal
from app.models import User

db = SessionLocal()

try:
    admins = (
        db.query(User)
        .filter(User.role.in_(["admin", "platform_owner"]))
        .order_by(User.id)
        .all()
    )

    for user in admins:
        print(
            f"ID: {user.id} | "
            f"Email: {user.email} | "
            f"Role: {user.role} | "
            f"Active: {user.is_active}"
        )
finally:
    db.close()