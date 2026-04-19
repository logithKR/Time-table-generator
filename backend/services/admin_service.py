import os
import json
from datetime import datetime, timedelta
import jwt
from typing import Dict, Any, List
from config.settings import settings
from utils.security import verify_password, hash_password
from exceptions import AppException

class AdminService:
    def __init__(self):
        # We simulate finding admin user configuration.
        self.admin_email = settings.admin_email
        self.admin_password_hash = settings.admin_password_hash

    def login(self, email: str, password: str) -> str:
        if not self.admin_email or not self.admin_password_hash:
            # For demonstration/bootstrap: if not configured, block or log
            raise AppException(500, "ADMIN_MISCONFIGURED", "Admin credentials are not fully configured in settings.")
            
        if email != self.admin_email:
            raise AppException(401, "ADMIN_UNAUTHORIZED", "Invalid admin credentials")
            
        if not verify_password(password, self.admin_password_hash):
            raise AppException(401, "ADMIN_UNAUTHORIZED", "Invalid admin credentials")
            
        # Success - generate JWT
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
        """Reads JSON structured logs from audit_logger outputs"""
        log_file = "auth.log" if log_type == "auth" else "activity.log"
        log_path = os.path.join(os.environ.get("LOG_DIR", "./logs"), log_file)
        
        if not os.path.exists(log_path):
            return {"logs": [], "total": 0, "page": page, "limit": limit}
            
        logs = []
        try:
            with open(log_path, "r", encoding="utf-8") as f:
                # Read all lines, assuming one JSON object per line.
                lines = f.readlines()
                # Assuming logs are appended, newest are at the bottom. We reverse them.
                lines.reverse()
                
                start_idx = (page - 1) * limit
                end_idx = start_idx + limit
                
                for line in lines[start_idx:end_idx]:
                    if line.strip():
                        try:
                            logs.append(json.loads(line))
                        except json.JSONDecodeError:
                            pass
                return {
                    "logs": logs,
                    "total": len(lines),
                    "page": page,
                    "limit": limit
                }
        except Exception as e:
            raise AppException(500, "LOG_READ_ERROR", "Failed to read log files", str(e))
