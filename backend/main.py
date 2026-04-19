from fastapi import FastAPI, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager

from backend.config.settings import settings
from backend.config.cors import setup_cors
from backend.middleware.error_handler import setup_error_handlers
from backend.middleware.auth_middleware import AuthMiddleware
from backend.routes.api_router import api_router
from backend.utils.database import engine
from backend.models import Base
import uvicorn

# We can initialize DB metadata on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Depending on setup, alembic is preferred, but simple create_all is fine for now
    # Base.metadata.create_all(bind=engine)
    yield
    pass

app = FastAPI(
    title="BIT Timetable Generator",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# 1. Setup CORS
setup_cors(app)

# 2. Setup strict global exception handlers
setup_error_handlers(app)

# 3. Add Custom Middlewares
app.add_middleware(AuthMiddleware)
# Optionally add TrustedHostMiddleware for production
if settings.environment == "production":
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["timetable.bitsathy.ac.in", "localhost"])

# 4. Integrate API Routing

# Auth specific routing
from backend.controllers.auth_controller import router as auth_router
app.include_router(auth_router)

# New API v1 prefix (Modern standard)
app.include_router(api_router, prefix="/api/v1")

# Legacy mapping alias to prevent breaking existing frontend/system paths
# This correctly satisfies the /api/ prefix requirement assuming older routes
# were directly hit relative to the host, or we can explicitly mount at /api
app.include_router(api_router, prefix="/api")

# Backward compatibility: For any older routes completely un-prefixed in origin
app.include_router(api_router)

# 5. Default Health / Root
@app.get("/")
def read_root():
    return JSONResponse({"message": "BIT Timetable Generator API is running under the new MVC architecture."})

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
