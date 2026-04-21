"""
Separate SQLAlchemy engine and session for centralized logging (log.db).
This maintains complete isolation from the main application database.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import SingletonThreadPool
from contextlib import contextmanager
from typing import Generator
import os

# Construct the path to log.db in the database folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_FILE = os.path.abspath(os.path.join(BASE_DIR, "..", "database", "log.db"))
LOG_DATABASE_URL = f"sqlite:///{DB_FILE}"

print(f"[LOG_DB] Using database: {DB_FILE}")

# Logging DB Engine - Separate from main application DB with recycling
log_engine = create_engine(
    LOG_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=SingletonThreadPool,
    pool_size=20,
    pool_recycle=1800,
    pool_pre_ping=True
)

LoggingBase = declarative_base()
LogSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=log_engine)


def get_log_db() -> Generator:
    """FastAPI Dependency for logging database sessions."""
    db = LogSessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_log_db_transaction() -> Generator:
    """
    Context manager for enforcing strict transaction boundaries in logging.
    Automatically commits on exit or rolls back on exception.
    """
    db = LogSessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[LOG_DB] Transaction rollback: {e}")
        raise
    finally:
        db.close()
