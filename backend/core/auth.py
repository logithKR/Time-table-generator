"""
Production-grade authentication core.

Security:
  - JWT_SECRET must come from env. App crashes immediately if missing.
  - GOOGLE_CLIENT_ID must come from env. App crashes immediately if missing.
  - Cookie Secure/SameSite driven by individual env vars, not a single boolean.
  - All cookie operations go through set_auth_cookies/clear_auth_cookies.
  - Tokens are never logged or returned in response bodies.
"""

import os
import sys
from dotenv import load_dotenv
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
load_dotenv(_env_path)

from datetime import datetime, timedelta, timezone
import secrets
import jwt
from fastapi import HTTPException, Request, status
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# =====================================================================
# MANDATORY — fail-fast at startup
# =====================================================================
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    print("FATAL: JWT_SECRET environment variable is not set.", file=sys.stderr)
    sys.exit(1)

if len(JWT_SECRET) < 32:
    print("FATAL: JWT_SECRET must be at least 32 characters.", file=sys.stderr)
    sys.exit(1)

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
if not GOOGLE_CLIENT_ID:
    print("FATAL: GOOGLE_CLIENT_ID environment variable is not set.", file=sys.stderr)
    sys.exit(1)

# =====================================================================
# Token configuration
# =====================================================================
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
ALGORITHM = "HS256"
ALLOWED_DOMAIN = "@bitsathy.ac.in"

# =====================================================================
# Cookie configuration — each attribute is its own env var
# No dependency on a single PRODUCTION boolean flag.
# =====================================================================
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.environ.get("COOKIE_SAMESITE", "lax").lower()
COOKIE_DOMAIN = os.environ.get("COOKIE_DOMAIN", None) or None

# Validate: SameSite=None requires Secure=true
if COOKIE_SAMESITE == "none" and not COOKIE_SECURE:
    print("FATAL: COOKIE_SAMESITE=none requires COOKIE_SECURE=true (HTTPS).", file=sys.stderr)
    sys.exit(1)

# Frozen cookie config dict — used by set_auth_cookies / clear_auth_cookies.
# No route can override these values.
_COOKIE_BASE = {
    "secure": COOKIE_SECURE,
    "samesite": COOKIE_SAMESITE,
    "domain": COOKIE_DOMAIN,
}


# =====================================================================
# Google token verification
# =====================================================================
def verify_google_token(token: str) -> dict:
    try:
        idinfo = id_token.verify_oauth2_token(
            token, google_requests.Request(), GOOGLE_CLIENT_ID
        )
        email = idinfo.get("email")
        if not email or not email.endswith(ALLOWED_DOMAIN):
            raise ValueError(f"Only {ALLOWED_DOMAIN} accounts are allowed.")
        return {
            "email": email,
            "name": idinfo.get("name"),
            "picture": idinfo.get("picture"),
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")


# =====================================================================
# JWT creation
# =====================================================================
def create_access_token(data: dict) -> str:
    return jwt.encode(
        {
            "sub": data["email"],
            "email": data["email"],
            "name": data.get("name"),
            "picture": data.get("picture"),
            "type": "access",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        },
        JWT_SECRET,
        algorithm=ALGORITHM,
    )


def create_refresh_token(data: dict) -> str:
    return jwt.encode(
        {
            "sub": data["email"],
            "email": data["email"],
            "name": data.get("name"),
            "picture": data.get("picture"),
            "type": "refresh",
            "jti": secrets.token_urlsafe(16),
            "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        },
        JWT_SECRET,
        algorithm=ALGORITHM,
    )


def create_csrf_token() -> str:
    return secrets.token_urlsafe(32)


# =====================================================================
# Centralised cookie helpers — ONLY way to set/clear auth cookies
# httponly=True is hardcoded and cannot be overridden by any caller.
# =====================================================================
def set_auth_cookies(response, access_token: str, refresh_token: str, csrf_token: str):
    """Set all auth cookies. No caller can override security flags."""
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
        **_COOKIE_BASE,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/auth/refresh",
        **_COOKIE_BASE,
    )
    # CSRF token is intentionally NOT httponly so JS can read it
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        path="/",
        **_COOKIE_BASE,
    )


def clear_auth_cookies(response):
    """Delete all auth cookies with matching flags."""
    response.delete_cookie(key="access_token", path="/", **_COOKIE_BASE)
    response.delete_cookie(key="refresh_token", path="/api/auth/refresh", **_COOKIE_BASE)
    response.delete_cookie(key="csrf_token", path="/", **_COOKIE_BASE)


# =====================================================================
# FastAPI dependency — validate access token + CSRF
# =====================================================================
def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    access_token = None
    is_bearer = False
    
    if auth_header and auth_header.startswith("Bearer "):
        access_token = auth_header.split(" ")[1]
        is_bearer = True
    else:
        access_token = request.cookies.get("access_token")

    if not is_bearer and request.method in ("POST", "PUT", "DELETE", "PATCH"):
        csrf_cookie = request.cookies.get("csrf_token")
        csrf_header = request.headers.get("x-csrf-token")
        if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed")

    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = jwt.decode(access_token, JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# Alias for backward compatibility
verify_token = get_current_user

