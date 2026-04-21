import os
import json
from datetime import datetime, timedelta
import jwt
import math
from typing import Dict, Any, List
from config.settings import settings
from utils.security import verify_password, hash_password
from core.exceptions import AppException
from sqlalchemy.orm import Session
from models.log_models import AuthLog, ActivityLog
from utils.auth_logging import log_login, log_failed_login

class AdminService:
    def __init__(self, db: Session = None):
        self.db = db
        # We simulate finding admin user configuration.
        self.admin_email = settings.admin_email
        self.admin_password = settings.admin_password

    def login(self, email: str, password: str) -> str:
        if not self.admin_email or not self.admin_password:
            # For demonstration/bootstrap: if not configured, block or log
            log_failed_login(
                email=email,
                reason="Admin credentials not configured"
            )
            raise AppException(500, "ADMIN_MISCONFIGURED", "Admin credentials are not fully configured in settings.")
            
        if email != self.admin_email:
            log_failed_login(
                email=email,
                reason="Invalid email"
            )
            raise AppException(401, "ADMIN_UNAUTHORIZED", "Invalid admin credentials")
            
        if password != self.admin_password:
            log_failed_login(
                email=email,
                reason="Invalid password"
            )
            raise AppException(401, "ADMIN_UNAUTHORIZED", "Invalid admin credentials")
            
        # Success - generate JWT and log to centralized logging
        log_login(
            email=email,
            user_id="admin"
        )
        
        payload = {
            "sub": email,
            "role": "admin",
            "exp": datetime.utcnow() + timedelta(minutes=settings.admin_jwt_expiry_minutes)
        }
        return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    def generate_hash(self, plain_text_password: str) -> str:
        """Helper tool for server administrators to bootstrap the setup."""
        return hash_password(plain_text_password)

    def read_logs(self, log_type: str, page: int = 1, limit: int = 50) -> Dict[str, Any]:
        """Reads logs from ActivityLog table"""
        if not self.db:
            return {"data": [], "total": 0, "page": page, "total_pages": 0}
            
        try:
            if log_type == "auth":
                query = self.db.query(AuthLog)
                total = query.count()
                total_pages = math.ceil(total / limit) if total > 0 else 0
                rows = query.order_by(AuthLog.id.desc()).offset((page - 1) * limit).limit(limit).all()
                
                logs = [{
                    "id": row.id,
                    "user_id": row.user_id,
                    "email": row.email,
                    "event_type": row.event_type,
                    "ip_address": row.ip_address,
                    "timestamp_ist": row.timestamp_ist,
                    "timestamp_gmt": row.timestamp_gmt,
                    "user_agent": row.user_agent
                } for row in rows]
            else:
                query = self.db.query(ActivityLog)
                total = query.count()
                total_pages = math.ceil(total / limit) if total > 0 else 0
                rows = query.order_by(ActivityLog.id.desc()).offset((page - 1) * limit).limit(limit).all()
                
                logs = [{
                    "id": row.id,
                    "user_id": row.user_id,
                    "email": row.email,
                    "action": row.action,
                    "method": row.method,
                    "status_code": row.status_code,
                    "timestamp_ist": row.timestamp_ist,
                    "timestamp_gmt": row.timestamp_gmt
                } for row in rows]
                
            return {
                "data": logs,
                "total": total,
                "page": page,
                "total_pages": total_pages
            }
        except Exception as e:
            raise AppException(500, "LOG_READ_ERROR", "Failed to read logs from database", str(e))

    async def sync_cms(self) -> None:
        """Simulates synchronous CMS data execution."""
        import asyncio
        # In a real scenario, this delegates to the sync engine
        await asyncio.sleep(2)
        return
