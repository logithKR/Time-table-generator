"""
Authentication API routes with integrated audit logging.

Endpoints:
  POST /auth/login   — verify Google credential, issue tokens
  POST /auth/refresh  — rotate access + refresh tokens
  POST /auth/logout   — clear all auth cookies
  GET  /auth/me       — return current user from session
"""

import os
import sqlite3
import jwt
from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from pydantic import BaseModel

from backend.core.auth import (
    verify_google_token,
    create_access_token,
    create_refresh_token,
    create_csrf_token,
    set_auth_cookies,
    clear_auth_cookies,
    get_current_user,
    JWT_SECRET,
    ALGORITHM,
)
from backend.logging.audit_logger import log_auth_event

router = APIRouter(prefix="/auth", tags=["auth"])


def _client_ip(request: Request) -> str:
    """Extract client IP, respecting X-Forwarded-For behind a proxy."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else ""


def _user_agent(request: Request) -> str:
    return request.headers.get("user-agent", "")


class LoginRequest(BaseModel):
    credential: str


@router.post("/login")
def login(body: LoginRequest, request: Request, response: Response):
    """Verify Google credential → issue dual tokens + CSRF cookie."""
    ip = _client_ip(request)
    ua = _user_agent(request)

    # 1. Verify Google token (raises 401 on failure)
    try:
        user_data = verify_google_token(body.credential)
    except HTTPException as exc:
        log_auth_event("login_failure", success=False, ip=ip, user_agent=ua, detail=exc.detail)
        raise

    # 1.5 Verify RBAC (SQLite Users table)
    email = user_data["email"]
    local_db_path = os.getenv("LOCAL_DB_PATH", "../database/users.db")
    try:
        conn = sqlite3.connect(local_db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT role, is_active FROM users WHERE email = ?", (email,))
        db_user = cursor.fetchone()
        conn.close()
    except Exception as e:
        log_auth_event("login_failure", success=False, ip=ip, user_agent=ua, detail=f"DB Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during authorization.")
        
    if not db_user:
        log_auth_event("login_failure", success=False, ip=ip, user_agent=ua, detail="User not found in local DB.")
        raise HTTPException(status_code=403, detail="Access Denied: Only registered faculty (teachers) can access this system.")
        
    if db_user["role"] != "teacher":
        log_auth_event("login_failure", success=False, ip=ip, user_agent=ua, detail=f"Invalid role: {db_user['role']}")
        raise HTTPException(status_code=403, detail="Access Denied: Only registered faculty (teachers) can access this system.")

    # 2. Create tokens
    access_token = create_access_token(user_data)
    refresh_token = create_refresh_token(user_data)
    csrf_token = create_csrf_token()

    # 3. Set cookies
    set_auth_cookies(response, access_token, refresh_token, csrf_token)

    # 4. Audit log
    log_auth_event("login_success", user_email=user_data["email"], ip=ip, user_agent=ua)

    return {"message": "Login successful", "user": user_data}


@router.post("/refresh")
def refresh(request: Request, response: Response):
    """Validate refresh token → rotate both tokens."""
    ip = _client_ip(request)
    ua = _user_agent(request)

    refresh_token_value = request.cookies.get("refresh_token")
    if not refresh_token_value:
        log_auth_event("token_refresh", success=False, ip=ip, user_agent=ua, detail="missing")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")

    try:
        payload = jwt.decode(refresh_token_value, JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

        user_data = {
            "email": payload.get("email"),
            "name": payload.get("name"),
            "picture": payload.get("picture"),
        }

        # Issue rotated tokens
        new_access = create_access_token(user_data)
        new_refresh = create_refresh_token(user_data)
        csrf_token = create_csrf_token()
        set_auth_cookies(response, new_access, new_refresh, csrf_token)

        log_auth_event("token_refresh", user_email=user_data["email"], ip=ip, user_agent=ua)
        return {"message": "Token refreshed successfully"}

    except jwt.ExpiredSignatureError:
        log_auth_event("token_refresh", success=False, ip=ip, user_agent=ua, detail="expired")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired. Please login again.")
    except jwt.InvalidTokenError:
        log_auth_event("token_refresh", success=False, ip=ip, user_agent=ua, detail="invalid")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")


@router.post("/logout")
def logout(request: Request, response: Response):
    """Clear all authentication cookies."""
    ip = _client_ip(request)
    ua = _user_agent(request)

    # Try to extract user email from access token for audit (best-effort)
    user_email = ""
    access_token = request.cookies.get("access_token")
    if access_token:
        try:
            payload = jwt.decode(access_token, JWT_SECRET, algorithms=[ALGORITHM], options={"verify_exp": False})
            user_email = payload.get("email", "")
        except Exception:
            pass

    clear_auth_cookies(response)

    log_auth_event("logout", user_email=user_email, ip=ip, user_agent=ua)
    return {"message": "Successfully logged out"}


@router.get("/me")
def get_user_session(request: Request, user: dict = Depends(get_current_user)):
    """Return current user data from validated session."""
    ip = _client_ip(request)
    log_auth_event("session_check", user_email=user.get("email", ""), ip=ip, user_agent=_user_agent(request))

    return {
        "user": {
            "email": user.get("email"),
            "name": user.get("name"),
            "picture": user.get("picture"),
        }
    }
