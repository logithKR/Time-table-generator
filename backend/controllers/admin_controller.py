"""
Admin Controller — handles admin login, session verification, and log queries.

Endpoints (all prefixed with /api/admin by main.py):
  POST /login           — authenticate admin with email/password, return JWT
  GET  /me              — verify admin session (returns admin email)
  GET  /logs            — fetch auth or activity logs from log.db (query param: type)
"""

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Any, Dict
from typing import Optional
import math

from middleware.admin_guard import verify_admin_token
from utils.log_database import get_log_db
from models.log_models import AuthLog, ActivityLog
from services.admin_service import AdminService
from pydantic import BaseModel


router = APIRouter(tags=["Admin"])  # NO prefix here — main.py provides /api/admin


class AdminLoginRequest(BaseModel):
    email: str
    password: str


# ===================================================================
# Admin Login
# ===================================================================
@router.post("/login")
def admin_login(body: AdminLoginRequest):
    """
    Authenticate admin with email and password.
    Returns a JWT token for subsequent admin API calls.
    """
    svc = AdminService()
    token = svc.login(body.email, body.password)
    return {"token": token, "message": "Admin login successful"}


# ===================================================================
# Session Verification
# ===================================================================
@router.get("/me")
def read_admin_me(admin_email: str = Depends(verify_admin_token)):
    """
    Verifies the current admin's session from their JWT.
    Returns the admin's email if the token is valid.
    """
    return {"email": admin_email}


# ===================================================================
# Unified Logs Endpoint
# ===================================================================
@router.get("/logs", dependencies=[Depends(verify_admin_token)])
def get_logs(
    type: str = Query("auth", pattern="^(auth|activity)$", description="Log type: 'auth' or 'activity'"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=500, description="Items per page"),
    date: Optional[str] = Query(None, description="Filter by date (YYYY-MM-DD)"),
    log_db: Session = Depends(get_log_db),
) -> Dict[str, Any]:
    """
    Fetch logs from log.db.

    Query Parameters:
    - type: 'auth' for authentication logs, 'activity' for activity logs
    - page: Page number (default 1)
    - limit: Items per page (default 50, max 500)

    Returns paginated log data with IST/GMT timestamps.
    """
    try:
        if type == "auth":
            query = log_db.query(AuthLog)
            if date:
                query = query.filter(func.substr(AuthLog.timestamp_ist, 1, 10) == date)
                
            total = query.count()
            total_pages = math.ceil(total / limit) if total > 0 else 0
            rows = query.order_by(desc(AuthLog.id)).offset((page - 1) * limit).limit(limit).all()

            logs = [{
                "id": row.id,
                "user_id": row.user_id,
                "email": row.email,
                "event_type": row.event_type,
                "timestamp_ist": row.timestamp_ist,
                "timestamp_gmt": row.timestamp_gmt,
                "user_agent": row.user_agent,
            } for row in rows]
        else:
            query = log_db.query(ActivityLog)
            if date:
                query = query.filter(func.substr(ActivityLog.timestamp_ist, 1, 10) == date)
            total = query.count()
            total_pages = math.ceil(total / limit) if total > 0 else 0
            rows = query.order_by(desc(ActivityLog.id)).offset((page - 1) * limit).limit(limit).all()

            logs = [{
                "id": row.id,
                "user_id": row.user_id,
                "email": row.email,
                "action": row.action,
                "method": row.method,
                "status_code": row.status_code,
                "timestamp_ist": row.timestamp_ist,
                "timestamp_gmt": row.timestamp_gmt,
            } for row in rows]

        return {
            "data": logs,
            "total": total,
            "page": page,
            "total_pages": total_pages,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch {type} logs: {str(e)}"
        )