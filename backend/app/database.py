import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables from backend/.env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is missing. Check your backend/.env file."
    )

# Explicitly use the installed psycopg2 driver.
# Support the common PostgreSQL URL formats.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgres://",
        "postgresql+psycopg2://",
        1,
    )
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+psycopg2://",
        1,
    )

# Create the PostgreSQL engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

# Create database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Base class for database models
Base = declarative_base()


def get_db():
    """Provide a database session and close it after use."""
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()