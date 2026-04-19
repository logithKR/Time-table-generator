from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel
from backend.services.admin_service import AdminService
from backend.middleware.admin_guard import verify_admin_token

router = APIRouter()

class AdminLoginRequest(BaseModel):
    email: str
    password: str

class AdminLoginResponse(BaseModel):
    token: str
    message: str

def get_admin_service():
    return AdminService()

@router.post("/login", response_model=AdminLoginResponse)
def login_admin(req: AdminLoginRequest, response: Response, service: AdminService = Depends(get_admin_service)):
    token = service.login(req.email, req.password)
    # Set as HttpOnly cookie for extra security in addition to returning it
    response.set_cookie(
        key="admin_session", 
        value=token, 
        httponly=True, 
        secure=True, 
        samesite="lax",
        max_age=7200
    )
    return AdminLoginResponse(token=token, message="Admin login successful")

@router.get("/logs", dependencies=[Depends(verify_admin_token)])
def get_logs(type: str = Query("activity", regex="^(auth|activity)$"), page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=200), service: AdminService = Depends(get_admin_service)):
    return service.read_logs(type, page, limit)

@router.post("/logout")
def logout_admin(response: Response):
    response.delete_cookie("admin_session")
    return {"message": "Logged out successfully"}

# Bootstrap helper (Should be disabled or protected in extreme production environments)
@router.post("/generate-hash")
def generate_hash(password: str, service: AdminService = Depends(get_admin_service)):
    """Utility to generate a bcrypt hash for the .env configuration."""
    hashed = service.generate_hash(password)
    return {"hashed_password": hashed}
