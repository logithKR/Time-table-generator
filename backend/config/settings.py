import os
from distutils.util import strtobool
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional

class Settings(BaseSettings):
    # Base application configs
    app_name: str = "BIT Timetable Generator"
    environment: str = os.getenv("ENVIRONMENT", "development")
    
    # JWT Auth Config
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 1440  # 24 hours
    admin_jwt_expiry_minutes: int = 120 # 2 hours
    
    # Google OAuth
    google_client_id: str

    # Cookies Security
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    cookie_domain: Optional[str] = None
    
    # CMS Database Config
    cms_db_host: Optional[str] = None
    cms_db_user: Optional[str] = None
    cms_db_password: Optional[str] = None
    cms_db_pass: Optional[str] = None
    cms_db_port: int = 3306
    cms_db_name: str = "cms"
    
    # Local SQLite Config
    local_db_path: str = "../database/users.db"
    
    # Feature Flags
    enable_admin_login: bool = True
    enable_sync_cms: bool = True
    enable_management_apis: bool = True  # Useful to toggle CRUD routes in prod
    
    # Admin Credentials
    # Note: Using plain text password as requested by the user.
    admin_email: Optional[str] = None
    admin_password: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env.production") if os.getenv("ENVIRONMENT") == "production" else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
