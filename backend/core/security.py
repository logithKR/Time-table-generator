from fastapi import Request, HTTPException, Depends
import jwt
from config.settings import settings

def get_current_admin_user(request: Request):
    """
    Extracts the JWT from the Authorization header and verifies if the user is an admin.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Not authorized. Admin access required.")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Admin token has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid admin token.")

def admin_guard(admin_user: dict = Depends(get_current_admin_user)):
    """
    Dependency to secure admin-only routes.
    """
    return admin_user