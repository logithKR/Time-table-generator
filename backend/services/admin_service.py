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
from models import ActivityLog
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
            query = self.db.query(ActivityLog)
            if log_type == "auth":
                query = query.filter(ActivityLog.event.like("AUTH_%"))
            else:
                query = query.filter(~ActivityLog.event.like("AUTH_%"))
                
            total = query.count()
            total_pages = math.ceil(total / limit) if total > 0 else 0
            
            # Descending order by id provides newest first
            rows = query.order_by(ActivityLog.id.desc()).offset((page - 1) * limit).limit(limit).all()
            
            logs = []
            for row in rows:
                logs.append({
                    "id": row.id,
                    "timestamp": row.timestamp.isoformat() if row.timestamp else None,
                    "level": row.level,
                    "event": row.event,
                    "details": row.details,
                    "user_email": row.user_email
                })
                
            return {
                "data": logs,
                "total": total,
                "page": page,
                "total_pages": total_pages
            }
        except Exception as e:
            raise AppException(500, "LOG_READ_ERROR", "Failed to read logs from database", str(e))

    def sync_cms(self) -> None:
        """Simulates synchronous CMS data execution."""
        import time
        # In a real scenario, this delegates to the sync engine
        time.sleep(2)
        return
