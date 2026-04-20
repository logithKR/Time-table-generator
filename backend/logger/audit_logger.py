"""
Production audit logging with database insertion.
"""

from typing import Optional
from sqlalchemy.orm import Session
from models import ActivityLog

def log_auth_event(
    db: Session,
    event: str,
    user_email: str = "",
    success: bool = True,
    ip: str = "",
    user_agent: str = "",
    details: str = "",
):
    """Log an authentication event."""
    try:
        new_log = ActivityLog(
            level="INFO" if success else "WARNING",
            event=f"AUTH_{event.upper()}",
            details=details or ("Success" if success else "Failed"),
            user_email=user_email
        )
        db.add(new_log)
        db.commit()
    except Exception as exc:
        print(f"LOGGING_ERROR [auth]: {exc}")


def log_activity(
    db: Session,
    user_email: str = "",
    event: str = "API_REQUEST",
    details: str = "",
):
    """Log an activity event."""
    try:
        new_log = ActivityLog(
            level="INFO",
            event=event,
            details=details,
            user_email=user_email
        )
        db.add(new_log)
        db.commit()
    except Exception as exc:
        print(f"LOGGING_ERROR [activity]: {exc}")

