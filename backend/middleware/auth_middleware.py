from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
import time

# Public paths that skip authentication completely
_PUBLIC_PREFIXES = (
    "/api/auth/",      # Google OAuth login/logout/refresh/me
    "/auth/",          # Backward compat
    "/api/admin/login", # Admin login
    "/health",
    "/docs",
    "/openapi",
    "/redoc",
)

_PUBLIC_EXACT = {"/", "/health", "/docs", "/openapi.json", "/redoc"}


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Allow preflight requests
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path

        # Skip auth for public routes
        if any(path.startswith(p) for p in _PUBLIC_PREFIXES) or path in _PUBLIC_EXACT:
            return await call_next(request)

        # For all other routes, just pass through.
        # Individual route-level auth is handled via FastAPI Depends() on specific endpoints.
        # The global middleware only tracks timing.
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        return response
