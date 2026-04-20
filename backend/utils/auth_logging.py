"""
Authentication Logging Utilities.

Functions to log user authentication events (Login, Logout, Token Refresh, etc.)
to the centralized log.db database.
"""

from utils.log_database import get_log_db_transaction
from models.log_models import AuthLog, get_ist_time, get_gmt_time
from typing import Optional


def log_auth_event(
    email: str,
    event_type: str,  # "LOGIN", "LOGOUT", "TOKEN_REFRESH", etc.
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    user_id: Optional[str] = None,
) -> bool:
    """
    Log an authentication event to the centralized logging system.
    
    Args:
        email: User's email address
        event_type: Type of event (LOGIN, LOGOUT, TOKEN_REFRESH, etc.)
        ip_address: Client IP address
        user_agent: Browser/client user agent string
        user_id: Optional internal user ID
    
    Returns:
        True if logged successfully, False otherwise
    """
    try:
        with get_log_db_transaction() as db:
            log_entry = AuthLog(
                user_id=user_id,
                email=email,
                event_type=event_type,
                ip_address=ip_address,
                timestamp_ist=get_ist_time(),
                timestamp_gmt=get_gmt_time(),
                user_agent=user_agent,
            )
            db.add(log_entry)
            # db.commit() is handled by context manager
            return True
    except Exception as e:
        print(f"[AUTH_LOG_ERROR] Failed to log {event_type} event for {email}: {str(e)}")
        return False


def log_login(
    email: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    user_id: Optional[str] = None,
) -> bool:
    """Log a successful login event."""
    return log_auth_event(
        email=email,
        event_type="LOGIN",
        ip_address=ip_address,
        user_agent=user_agent,
        user_id=user_id,
    )


def log_logout(
    email: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    user_id: Optional[str] = None,
) -> bool:
    """Log a logout event."""
    return log_auth_event(
        email=email,
        event_type="LOGOUT",
        ip_address=ip_address,
        user_agent=user_agent,
        user_id=user_id,
    )


def log_token_refresh(
    email: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    user_id: Optional[str] = None,
) -> bool:
    """Log a token refresh event."""
    return log_auth_event(
        email=email,
        event_type="TOKEN_REFRESH",
        ip_address=ip_address,
        user_agent=user_agent,
        user_id=user_id,
    )


def log_failed_login(
    email: str,
    reason: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> bool:
    """Log a failed login attempt."""
    return log_auth_event(
        email=email,
        event_type=f"LOGIN_FAILED ({reason})",
        ip_address=ip_address,
        user_agent=user_agent,
    )
