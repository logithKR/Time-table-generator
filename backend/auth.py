import os
from datetime import datetime, timedelta
import secrets
import jwt
from fastapi import Cookie, Depends, HTTPException, Request, Response, status
from google.oauth2 import id_token
from google.auth.transport import requests

# =====================================================================
# Configuration
# =====================================================================
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "8910878399-u0ogb89cco0onu0hrqse59c9moo5uh58.apps.googleusercontent.com")
JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret-jwt-key-replace-in-production")
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
ALGORITHM = "HS256"
ALLOWED_DOMAIN = "@bitsathy.ac.in"

def verify_google_token(token: str):
    """Verifies the Google OAuth token and validates the email domain."""
    try:
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)
        
        email = idinfo.get("email")
        if not email or not email.endswith(ALLOWED_DOMAIN):
            raise ValueError(f"Only {ALLOWED_DOMAIN} accounts are allowed.")
            
        return {
            "email": email,
            "name": idinfo.get("name"),
            "picture": idinfo.get("picture")
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

def create_access_token(data: dict):
    """Creates a short-lived access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    """Creates a long-lived refresh token."""
    to_encode = data.copy()
    # Including jti (JWT ID) to make the token unique
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh", "jti": secrets.token_urlsafe(16)})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

def create_csrf_token():
    """Generates a random CSRF token."""
    return secrets.token_urlsafe(32)

def get_current_user(
    request: Request,
    access_token: str = Cookie(None, alias="access_token")
):
    """
    Dependency to validate the JWT access token from the HttpOnly cookie,
    and enforce CSRF protection via Double Submit Cookie pattern.
    """
    # 1. CSRF Protection (Double Submit Cookie Pattern)
    # Only enforce for state-changing methods
    if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
        csrf_cookie = request.cookies.get("csrf_token")
        csrf_header = request.headers.get("x-csrf-token")
        if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF token validation failed")

    # 2. Token Validation
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
