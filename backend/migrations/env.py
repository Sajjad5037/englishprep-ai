from logging.config import fileConfig
from pathlib import Path
import sys

from alembic import context
from sqlalchemy import engine_from_config, pool

# Make the backend directory importable.
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.database import Base, DATABASE_URL
from app import models  # noqa: F401 — register models with Base.metadata


config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Read the connection string from backend/.env through database.py.
# Escape percent signs for Alembic's configuration parser.
config.set_main_option(
    "sqlalchemy.url",
    DATABASE_URL.replace("%", "%%"),
)

# Alembic will compare the database schema with these models.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Generate SQL without opening a database connection."""
    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against the configured database."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()