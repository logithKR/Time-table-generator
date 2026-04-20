from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from utils.database import get_db
from services.admin_service import AdminService
from middleware.admin_guard import verify_admin_token

router = APIRouter()

class AdminLoginRequest(BaseModel):
    email: str
    password: str

class AdminLoginResponse(BaseModel):
    token: str
    message: str

def get_admin_service(db: Session = Depends(get_db)):
    return AdminService(db)

@router.post("/login", response_model=AdminLoginResponse)
def login_admin(req: AdminLoginRequest, service: AdminService = Depends(get_admin_service)):
    token = service.login(req.email, req.password)
    return AdminLoginResponse(token=token, message="Admin login successful")

@router.get("/logs", dependencies=[Depends(verify_admin_token)])
def get_logs(type: str = Query("activity", pattern="^(auth|activity)$"), page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=200), service: AdminService = Depends(get_admin_service)):
    return service.read_logs(type, page, limit)

@router.post("/sync", dependencies=[Depends(verify_admin_token)])
def sync_cms_data(service: AdminService = Depends(get_admin_service)):
    service.sync_cms()
    return {"status": "success", "message": "CMS data synced successfully"}

@router.post("/logout")
def logout_admin():
    # Stateless logout. Frontend will drop token.
    return {"message": "Logged out successfully"}

# Bootstrap helper (Should be disabled or protected in extreme production environments)
@router.post("/generate-hash")
def generate_hash(password: str, service: AdminService = Depends(get_admin_service)):
    """Utility to generate a bcrypt hash for the .env configuration."""
    hashed = service.generate_hash(password)
    return {"hashed_password": hashed}
