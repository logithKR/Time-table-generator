import os
from distutils.util import strtobool
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

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
    cookie_domain: str | None = None
    
    # CMS Database Config
    cms_db_host: str | None = None
    cms_db_user: str | None = None
    cms_db_password: str | None = None
    cms_db_port: int = 3306
    cms_db_name: str = "cms"
    
    # Local SQLite Config
    local_db_path: str = "./users.db"
    
    # Feature Flags
    enable_admin_login: bool = True
    enable_sync_cms: bool = True
    enable_management_apis: bool = True  # Useful to toggle CRUD routes in prod
    
    # Admin Credentials
    # Note: ADMIN_PASSWORD should be a bcrypt hash. A raw password here will trigger 
    # a warning or must be setup separately. 
    admin_email: str | None = None
    admin_password_hash: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env.production" if os.getenv("ENVIRONMENT") == "production" else ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
