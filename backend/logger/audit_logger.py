"""
Production audit logging with stderr fallback, rotation, and retention policy.

Two separate streams:
  logs/auth.log     — authentication events
  logs/activity.log — authenticated API requests

Safety guarantees:
  - Logging failures emit to stderr, never break the API.
  - Sensitive data (tokens, cookies, passwords) is never logged.
  - Append-only rotating files with size + backup + retention limits.
"""

import os
import sys
import json
import glob
import time
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Configuration from environment
# ---------------------------------------------------------------------------
LOG_DIR = os.environ.get(
    "LOG_DIR",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs"),
)
LOG_MAX_BYTES = int(os.environ.get("LOG_MAX_BYTES", str(10 * 1024 * 1024)))  # 10 MB
LOG_BACKUP_COUNT = int(os.environ.get("LOG_BACKUP_COUNT", "10"))
LOG_RETENTION_DAYS = int(os.environ.get("LOG_RETENTION_DAYS", "90"))

os.makedirs(LOG_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Headers that must never appear in logs
# ---------------------------------------------------------------------------
_MASKED_HEADERS = frozenset({
    "cookie", "set-cookie", "authorization",
    "x-csrf-token", "proxy-authorization",
})


def safe_headers(headers: dict) -> dict:
    """Return headers with sensitive values masked."""
    return {
        k: ("***" if k.lower() in _MASKED_HEADERS else v)
        for k, v in headers.items()
    }


# ---------------------------------------------------------------------------
# JSON formatter
# ---------------------------------------------------------------------------
class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        try:
            payload = record.msg if isinstance(record.msg, dict) else {"message": str(record.msg)}
            payload["log_level"] = record.levelname
            return json.dumps(payload, default=str)
        except Exception:
            return json.dumps({"message": "LOG_FORMAT_ERROR", "raw": repr(record.msg)[:200]})


# ---------------------------------------------------------------------------
# Stderr fallback handler — used when file logging fails
# ---------------------------------------------------------------------------
_stderr_handler = logging.StreamHandler(sys.stderr)
_stderr_handler.setFormatter(_JsonFormatter())
_stderr_handler.setLevel(logging.WARNING)


# ---------------------------------------------------------------------------
# Log retention cleanup — delete rotated logs older than retention period
# ---------------------------------------------------------------------------
def _cleanup_old_logs():
    """Remove rotated log files older than LOG_RETENTION_DAYS."""
    try:
        cutoff = time.time() - (LOG_RETENTION_DAYS * 86400)
        for pattern in ["auth.log.*", "activity.log.*"]:
            for filepath in glob.glob(os.path.join(LOG_DIR, pattern)):
                try:
                    if os.path.getmtime(filepath) < cutoff:
                        os.remove(filepath)
                except OSError as exc:
                    print(f"WARNING: Could not remove old log {filepath}: {exc}", file=sys.stderr)
    except Exception as exc:
        print(f"WARNING: Log cleanup failed: {exc}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Logger factory
# ---------------------------------------------------------------------------
def _create_logger(name: str, filename: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    logger.propagate = False

    if not logger.handlers:
        try:
            file_handler = RotatingFileHandler(
                os.path.join(LOG_DIR, filename),
                maxBytes=LOG_MAX_BYTES,
                backupCount=LOG_BACKUP_COUNT,
                encoding="utf-8",
            )
            file_handler.setFormatter(_JsonFormatter())
            logger.addHandler(file_handler)
        except Exception as exc:
            # If file handler fails, emit to stderr — never fail silently
            print(f"WARNING: Could not create log file {filename}: {exc}", file=sys.stderr)

        # Always attach stderr as fallback for errors
        logger.addHandler(_stderr_handler)

    return logger


# Run retention cleanup once on module load
_cleanup_old_logs()

auth_logger = _create_logger("audit.auth", "auth.log")
activity_logger = _create_logger("audit.activity", "activity.log")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def log_auth_event(
    event_type: str,
    *,
    user_email: str = "",
    success: bool = True,
    ip: str = "",
    user_agent: str = "",
    detail: str = "",
):
    """Log an authentication event. Never raises."""
    try:
        auth_logger.info({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": event_type,
            "user": user_email,
            "success": success,
            "ip": ip,
            "user_agent": user_agent,
            "detail": detail,
        })
    except Exception as exc:
        print(f"LOGGING_ERROR [auth]: {exc}", file=sys.stderr)


def log_activity(
    *,
    user_email: str = "",
    endpoint: str = "",
    method: str = "",
    status_code: int = 0,
    ip: str = "",
    user_agent: str = "",
):
    """Log an authenticated API request. Never raises."""
    try:
        activity_logger.info({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": "api_request",
            "user": user_email,
            "endpoint": endpoint,
            "method": method,
            "status": status_code,
            "ip": ip,
            "user_agent": user_agent,
        })
    except Exception as exc:
        print(f"LOGGING_ERROR [activity]: {exc}", file=sys.stderr)
