from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
import time
from config.settings import settings

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Allow preflight requests
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip auth checks for login routes, health checks, and public assets
        path = request.url.path
        if path.startswith("/auth/login") or path.startswith("/api/v1/auth/login") or path.startswith("/api/v1/admin/login") or path.startswith("/health") or path.startswith("/docs") or path.startswith("/openapi"):
            return await call_next(request)

        # Standard Authentication (Mocked check for now, can integrate JWT verification)
        # Note: In FastAPI, using Depends() is generally preferred over global middlewares 
        # for API security, which is handled via dependency injection on the routes themselves.
        # This middleware acts mainly for basic request tracking or global CSRF checks.

        # Example CSRF Check for mutative methods in production
        if settings.environment == "production" and request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            csrf_token_header = request.headers.get("X-CSRF-Token")
            csrf_token_cookie = request.cookies.get("csrf_token")
            # CSRF logic can be implemented here if required.

        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
        # Add latency tracking headers
        response.headers["X-Process-Time"] = str(process_time)
        return response
