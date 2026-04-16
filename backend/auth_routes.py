import os
import jwt
from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from pydantic import BaseModel
from auth import (
    verify_google_token, 
    create_access_token, 
    create_refresh_token, 
    create_csrf_token,
    get_current_user,
    JWT_SECRET,
    ALGORITHM
)

router = APIRouter(prefix="/auth", tags=["auth"])

# Environment aware cookie secure flag
IS_PRODUCTION = os.environ.get("NODE_ENV") == "production"

class LoginRequest(BaseModel):
    credential: str

@router.post("/login")
def login(request: LoginRequest, response: Response):
    """Logs the user in by verifying Google credential, setting dual-tokens and CSRF cookies."""
    # 1. Verify Google token and Domain Constraint
    user_data = verify_google_token(request.credential)
    
    # 2. Create Tokens
    access_token = create_access_token({"sub": user_data["email"], **user_data})
    refresh_token = create_refresh_token({"sub": user_data["email"], **user_data})
    csrf_token = create_csrf_token()
    
    # 3. Set Cookies Securely
    # Access Token: HTTPOnly, short-lived
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        max_age=30 * 60 # 30 minutes
    )
    
    # Refresh Token: HTTPOnly, long-lived, path restricted for better security
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="lax",
        path="/api/auth/refresh",
        max_age=7 * 24 * 60 * 60 # 7 days
    )
    
    # CSRF Token: Readable by JavaScript so frontend can read it and send it in headers
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        secure=IS_PRODUCTION,
        samesite="lax",
    )
    
    return {"message": "Login successful", "user": user_data}

@router.post("/refresh")
def refresh(request: Request, response: Response):
    """Rotates tokens via the refresh token."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")
        
    try:
        # Validate refresh token
        payload = jwt.decode(refresh_token, JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
            
        user_data = {
            "email": payload.get("email"),
            "name": payload.get("name"),
            "picture": payload.get("picture")
        }
        
        # Issue new tokens (Token Rotation)
        new_access_token = create_access_token({"sub": user_data["email"], **user_data})
        new_refresh_token = create_refresh_token({"sub": user_data["email"], **user_data})
        
        # Set new cookies
        response.set_cookie(
            key="access_token",
            value=new_access_token,
            httponly=True,
            secure=IS_PRODUCTION,
            samesite="lax",
            max_age=30 * 60
        )
        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            httponly=True,
            secure=IS_PRODUCTION,
            samesite="lax",
            path="/api/auth/refresh",
            max_age=7 * 24 * 60 * 60
        )
        
        return {"message": "Token refreshed successfully"}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired. Please login again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

@router.post("/logout")
def logout(response: Response):
    """Clears all authentication cookies."""
    # Delete Access Token
    response.delete_cookie(
        key="access_token", 
        secure=IS_PRODUCTION, 
        samesite="lax"
    )
    # Delete Refresh Token (must match exact path)
    response.delete_cookie(
        key="refresh_token", 
        secure=IS_PRODUCTION, 
        samesite="lax", 
        path="/api/auth/refresh"
    )
    # Delete CSRF Token
    response.delete_cookie(
        key="csrf_token", 
        secure=IS_PRODUCTION, 
        samesite="lax"
    )
    
    return {"message": "Successfully logged out"}

@router.get("/me")
def get_user_session(user: dict = Depends(get_current_user)):
    """Returns the current user data from the validated session token."""
    # Since Depends(get_current_user) intercepts request and validates tokens/CSRF,
    # if it reaches here, the session is active.
    return {
        "user": {
            "email": user.get("email"),
            "name": user.get("name"),
            "picture": user.get("picture")
        }
    }
