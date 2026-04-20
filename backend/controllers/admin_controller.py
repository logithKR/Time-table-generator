from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Any, Dict, Optional

# These dependencies are assumed to exist based on your project structure.
# Ensure you have functions to get the log DB session and verify admin JWTs.
from utils.log_database import get_log_db
from core.security import admin_guard, get_current_admin_user
from services.admin_service import AdminService

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
    dependencies=[Depends(admin_guard)] # Secures all routes in this controller
)

@router.get("/me", response_model=Dict[str, str])
def read_admin_me(admin_user: Dict[str, Any] = Depends(get_current_admin_user)):
    """
    Verifies the current admin's session from their JWT.
    This resolves the 401 Unauthorized error on the frontend.
    """
    return {"email": admin_user.get("sub")}

@router.get("/logs/{log_type}", response_model=Dict[str, Any])
def get_logs(
    log_type: str,
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_log_db)
):
    """
    Fetches authentication or activity logs with pagination.
    This resolves the 500 Internal Server Error by correctly instantiating
    the AdminService with a dedicated database session for log.db.
    """
    if log_type not in ["auth", "activity"]:
        raise HTTPException(status_code=400, detail="Invalid log type. Use 'auth' or 'activity'.")

    # Correctly instantiate the service with the DB session.
    admin_svc = AdminService(db=db)

    # The service correctly queries and formats the data.
    logs_data = admin_svc.read_logs(log_type=log_type, page=page, limit=limit)

    return logs_data