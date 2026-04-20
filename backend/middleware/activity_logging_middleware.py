"""
Activity Logging Middleware for FastAPI.

Automatically logs every HTTP request made by authenticated users
to the centralized log.db database.

Public/unauthenticated requests can be logged optionally.
"""

import time
import jwt
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from utils.activity_logging import log_activity
from config.settings import settings


# Public paths that don't require logging (optional)
_PUBLIC_PATHS = {
    "/",
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
}

_PUBLIC_PREFIXES = (
    "/api/auth/",  # Auth endpoints (already logged separately)
    "/api/admin/login",  # Admin login (already logged separately)
)


class ActivityLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to automatically log API activity for authenticated users.
    
    Features:
    - Logs HTTP method, endpoint, and response status code
    - Extracts user email from JWT Bearer token
    - Skips logging for public/health endpoints
    - Runs asynchronously without blocking request/response
    """
    
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method
        
        # Skip logging for certain public paths
        if path in _PUBLIC_PATHS:
            return await call_next(request)
        
        if any(path.startswith(prefix) for prefix in _PUBLIC_PREFIXES):
            return await call_next(request)
        
        # Extract user email from Authorization header (JWT Bearer token)
        user_email = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm], options={"verify_exp": False})
                user_email = payload.get("email")
            except Exception:
                # Invalid token, user is unauthenticated
                pass
        
        # Strictly ignore all "FETCH" (GET) and non-state-changing requests to prevent database bloating
        if method not in ["POST", "PUT", "PATCH", "DELETE"]:
            return await call_next(request)

        # Map HTTP methods to requested action verbs
        method_mapping = {
            "GET": "Fetch",
            "POST": "Generate",
            "PUT": "Edit",
            "PATCH": "Edit",
            "DELETE": "Delete"
        }
        mapped_action = method_mapping.get(method, method)

        # Proceed with the request
        response = await call_next(request)
        
        # Log the activity asynchronously (don't block response)
        log_activity(
            email=user_email,
            action=path,
            method=mapped_action,
            status_code=response.status_code,
        )
        
        return response
