import logging
from typing import Optional

class AppException(Exception):
    """
    Core Application Exception designed to deliver structured, user-friendly
    error messages to the frontend while logging securely in the backend.
    """
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: Optional[str] = None,
        suggestion: Optional[str] = None
    ):
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        self.details = details
        self.suggestion = suggestion or "Please try again or contact support if the issue persists."

    def to_dict(self):
        return {
            "status": "error",
            "error_code": self.error_code,
            "message": self.message,
            "details": self.details,
            "suggestion": self.suggestion
        }
