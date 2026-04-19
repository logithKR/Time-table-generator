from fastapi import APIRouter
from backend.config.settings import settings
from backend.controllers import department_controller, admin_controller

api_router = APIRouter()

# Admin routes
api_router.include_router(admin_controller.router, prefix="/admin", tags=["Admin"])

# Legacy mapping alias (if needed) & specific endpoints mapping
if settings.enable_management_apis:
    api_router.include_router(department_controller.router, prefix="/departments", tags=["Departments"])

@api_router.get("/health")
def health_check():
    """System health check endpoint."""
    return {"status": "ok", "version": "v1"}
