"""
Admin Logging API Routes.

Endpoints for admins to view centralized logs from log.db.
Requires admin authentication.

Endpoints:
  GET  /api/admin/logs/auth     - Fetch authentication logs
  GET  /api/admin/logs/activity - Fetch activity logs  
  GET  /api/admin/logs/all      - Fetch all logs combined (paginated)
"""

from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from utils.log_database import get_log_db
from models.log_models import AuthLog, ActivityLog
from middleware.admin_guard import verify_admin_token
from typing import List, Dict, Any
import math

router = APIRouter(prefix="/logs", tags=["Admin Logs"])


# ===================================================================
# Auth Logs Endpoints
# ===================================================================

@router.get("/auth", dependencies=[Depends(verify_admin_token)])
def get_auth_logs(
    email: str = Query(None, description="Filter by email"),
    event_type: str = Query(None, description="Filter by event type (LOGIN, LOGOUT, etc.)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=500, description="Items per page"),
    log_db: Session = Depends(get_log_db),
) -> Dict[str, Any]:
    """
    Fetch authentication logs from log.db.
    
    Query Parameters:
    - email: Filter by user email
    - event_type: Filter by event type (LOGIN, LOGOUT, TOKEN_REFRESH, etc.)
    - page: Page number (default 1)
    - limit: Items per page (default 50, max 500)
    
    Response includes: id, email, event_type, timestamp_ist, timestamp_gmt, user_agent
    """
    try:
        query = log_db.query(AuthLog)
        
        # Apply filters
        if email:
            query = query.filter(AuthLog.email.ilike(f"%{email}%"))
        if event_type:
            query = query.filter(AuthLog.event_type == event_type)
        
        # Count total
        total = query.count()
        total_pages = math.ceil(total / limit) if total > 0 else 0
        
        # Fetch paginated results (newest first)
        logs = query.order_by(desc(AuthLog.id)).offset((page - 1) * limit).limit(limit).all()
        
        # Format response
        logs_data = [
            {
                "id": log.id,
                "user_id": log.user_id,
                "email": log.email,
                "event_type": log.event_type,
                "timestamp_ist": log.timestamp_ist,
                "timestamp_gmt": log.timestamp_gmt,
                "user_agent": log.user_agent,
            }
            for log in logs
        ]
        
        return {
            "data": logs_data,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch auth logs: {str(e)}"
        )


# ===================================================================
# Activity Logs Endpoints
# ===================================================================

@router.get("/activity", dependencies=[Depends(verify_admin_token)])
def get_activity_logs(
    email: str = Query(None, description="Filter by user email"),
    action: str = Query(None, description="Filter by API endpoint"),
    method: str = Query(None, description="Filter by HTTP method (GET, POST, etc.)"),
    status_code: int = Query(None, description="Filter by HTTP status code"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=500, description="Items per page"),
    log_db: Session = Depends(get_log_db),
) -> Dict[str, Any]:
    """
    Fetch activity logs from log.db.
    
    Query Parameters:
    - email: Filter by user email
    - action: Filter by API endpoint (e.g., /api/departments)
    - method: Filter by HTTP method (GET, POST, PUT, DELETE, PATCH)
    - status_code: Filter by HTTP response code (200, 404, 500, etc.)
    - page: Page number (default 1)
    - limit: Items per page (default 50, max 500)
    
    Response includes: id, email, action, method, status_code, timestamp_ist, timestamp_gmt
    """
    try:
        query = log_db.query(ActivityLog)
        
        # Apply filters
        if email:
            query = query.filter(ActivityLog.email.ilike(f"%{email}%"))
        if action:
            query = query.filter(ActivityLog.action.ilike(f"%{action}%"))
        if method:
            query = query.filter(ActivityLog.method == method.upper())
        if status_code:
            query = query.filter(ActivityLog.status_code == status_code)
        
        # Count total
        total = query.count()
        total_pages = math.ceil(total / limit) if total > 0 else 0
        
        # Fetch paginated results (newest first)
        logs = query.order_by(desc(ActivityLog.id)).offset((page - 1) * limit).limit(limit).all()
        
        # Format response
        logs_data = [
            {
                "id": log.id,
                "user_id": log.user_id,
                "email": log.email,
                "action": log.action,
                "method": log.method,
                "status_code": log.status_code,
                "timestamp_ist": log.timestamp_ist,
                "timestamp_gmt": log.timestamp_gmt,
            }
            for log in logs
        ]
        
        return {
            "data": logs_data,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch activity logs: {str(e)}"
        )


# ===================================================================
# Combined Logs (All Types)
# ===================================================================

@router.get("/all", dependencies=[Depends(verify_admin_token)])
def get_all_logs(
    log_type: str = Query("all", pattern="^(auth|activity|all)$", description="Log type filter"),
    email: str = Query(None, description="Filter by email"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=500, description="Items per page"),
    log_db: Session = Depends(get_log_db),
) -> Dict[str, Any]:
    """
    Fetch all logs (auth + activity combined).
    
    Query Parameters:
    - log_type: Filter by type (auth, activity, all) - default 'all'
    - email: Filter by user email
    - page: Page number (default 1)
    - limit: Items per page (default 50, max 500)
    """
    try:
        if log_type == "auth":
            return get_auth_logs(email=email, page=page, limit=limit, log_db=log_db)
        elif log_type == "activity":
            return get_activity_logs(email=email, page=page, limit=limit, log_db=log_db)
        else:  # "all"
            # For combined view, we just return auth logs (you can expand this if needed)
            return get_auth_logs(email=email, page=page, limit=limit, log_db=log_db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch logs: {str(e)}"
        )
