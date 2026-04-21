"""
Authentication API routes with integrated centralized logging.

Endpoints:
  POST /auth/login   — verify Google credential, issue tokens
  POST /auth/refresh  — rotate access + refresh tokens
  POST /auth/logout   — clear all auth cookies
  GET  /auth/me       — return current user from session

All authentication events are logged to the centralized log.db database.
"""

import os
import sqlite3
import jwt
from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from utils.database import get_db

from core.auth import (
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
from utils.auth_logging import log_login, log_logout, log_token_refresh, log_failed_login

router = APIRouter(prefix="/auth", tags=["auth"])





def _user_agent(request: Request) -> str:
    return request.headers.get("user-agent", "")


class LoginRequest(BaseModel):
    credential: str


@router.post("/login")
def login(body: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    """Verify Google credential → issue dual tokens + CSRF cookie."""
    ua = _user_agent(request)

    # 1. Verify Google token (raises 401 on failure)
    try:
        user_data = verify_google_token(body.credential)
    except HTTPException as exc:
        log_failed_login(
            email=body.credential[:50],  # Log partial cred as identifier
            reason="Invalid Google token",
            user_agent=ua
        )
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
        log_failed_login(
            email=email,
            reason="DB Error during RBAC check",
            user_agent=ua
        )
        raise HTTPException(status_code=500, detail="Internal server error during authorization.")
        
    if not db_user:
        log_failed_login(
            email=email,
            reason="User not found in local DB",
            user_agent=ua
        )
        raise HTTPException(status_code=403, detail="Access Denied: Only registered faculty (teachers) can access this system.")
        
    if db_user["role"] != "teacher":
        log_failed_login(
            email=email,
            reason=f"Invalid role: {db_user['role']}",
            user_agent=ua
        )
        raise HTTPException(status_code=403, detail="Access Denied: Only registered faculty (teachers) can access this system.")

    # 2. Create tokens
    access_token = create_access_token(user_data)
    refresh_token = create_refresh_token(user_data)
    csrf_token = create_csrf_token()

    # 3. Set cookies
    set_auth_cookies(response, access_token, refresh_token, csrf_token)

    # 4. Log successful login to centralized log.db
    log_login(
        email=email,
        user_agent=ua
    )

    return {"message": "Login successful", "user": user_data, "access_token": access_token}


@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    """Validate refresh token → rotate both tokens."""
    ua = _user_agent(request)

    refresh_token_value = request.cookies.get("refresh_token")
    if not refresh_token_value:
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

        # Log token refresh to centralized log.db
        log_token_refresh(
            email=user_data["email"],
            user_agent=ua
        )
        return {"message": "Token refreshed successfully", "access_token": new_access}

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired. Please login again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    """Clear all authentication cookies."""
    ua = _user_agent(request)

    # Try to extract user email from access token for logging (best-effort)
    user_email = ""
    access_token = request.cookies.get("access_token")
    if access_token:
        try:
            payload = jwt.decode(access_token, JWT_SECRET, algorithms=[ALGORITHM], options={"verify_exp": False})
            user_email = payload.get("email", "")
        except Exception:
            pass

    clear_auth_cookies(response)

    # Log logout to centralized log.db
    if user_email:
        log_logout(
            email=user_email,
            user_agent=ua
        )
    
    return {"message": "Successfully logged out"}


@router.get("/me")
def get_user_session(request: Request, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return current user data from validated session."""
    # Note: Session checks are implicitly logged via ActivityLoggingMiddleware
    return {
        "user": {
            "email": user.get("email"),
            "name": user.get("name"),
            "picture": user.get("picture"),
        }
    }
