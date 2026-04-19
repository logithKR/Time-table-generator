import logging
import sys
from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

# Assuming exceptions.py is in the root or accessible module
try:
    from exceptions import AppException
except ImportError:
    # Fallback to local import if called dynamically
    import sys, os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from exceptions import AppException

# Get specialized logger or fallback
logger = logging.getLogger("middleware.error_handler")

def setup_error_handlers(app: FastAPI):
    
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        logger.warning(f"AppException at {request.url.path}: {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.to_dict()
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        logger.warning(f"HTTPException {exc.status_code} at {request.url.path}: {exc.detail}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "status": "error",
                "error_code": "HTTP_ERROR",
                "message": str(exc.detail),
                "suggestion": "Check your request parameters and permissions."
            }
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.warning(f"Validation Error at {request.url.path}: {exc.errors()}")
        return JSONResponse(
            status_code=422,
            content={
                "status": "error",
                "error_code": "VALIDATION_ERROR",
                "message": "Invalid data provided.",
                "details": exc.errors(),
                "suggestion": "Please review the submitted fields and try again."
            }
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
        logger.error(f"Database Error at {request.url.path}: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "error_code": "DATABASE_ERROR",
                "message": "A database operation failed.",
                "suggestion": "Please try again later. If the issue persists, contact support."
            }
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled Exception at {request.url.path}: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "error_code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred.",
                "suggestion": "Please try again later."
            }
        )
