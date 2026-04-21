from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import QueuePool, SingletonThreadPool
from contextlib import contextmanager
from typing import Generator
import os
from config.settings import settings

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_FILE = os.path.abspath(os.path.join(BASE_DIR, "..", "database", "college_scheduler.db"))
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_FILE}"

# Application DB Engine with customized recycling logic
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=SingletonThreadPool,
    pool_size=20,
    pool_recycle=1800,  # Recycle connection every 30 minutes to avoid memory leaks
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db() -> Generator:
    """FastAPI Dependency for database sessions.
    NOTE: In the service layer architecture, transactions are meant to be handled 
    explicitly. Services should call db.commit() or db.rollback().
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@contextmanager
def get_db_transaction() -> Generator:
    """Context manager for enforcing strict transaction boundaries in background 
    tasks or sync engines. Automatically commits on exit or rolls back on exception.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
