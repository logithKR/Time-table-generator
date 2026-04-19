from fastapi import Request, HTTPException
import jwt
from typing import Optional
from backend.config.settings import settings

def verify_admin_token(request: Request) -> str:
    """Dependency for Admin Routes. Verifies the JWT cookie/header and checks role."""
    
    # Try header first, fallback to cookie
    auth_header = request.headers.get("Authorization")
    token = None
    
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    
    if not token:
        token = request.cookies.get("admin_session")

    if not token:
        raise HTTPException(status_code=401, detail="Missing admin token")

    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
