from fastapi import APIRouter
from config.settings import settings
from controllers import department_controller, admin_controller, schema_controller, timetable_controller

api_router = APIRouter()

# Admin routes
api_router.include_router(admin_controller.router, prefix="/admin", tags=["Admin"])

# Legacy mapping alias (if needed) & specific endpoints mapping
if settings.enable_management_apis:
    api_router.include_router(department_controller.router, prefix="/departments", tags=["Departments"])

# Schema dropdowns mappings
api_router.include_router(schema_controller.router, tags=["Schema Data"])

# Timetable Generation
api_router.include_router(timetable_controller.router, tags=["Timetable Generation"])

@api_router.get("/health")
def health_check():
    """System health check endpoint."""
    return {"status": "ok", "version": "v1"}
