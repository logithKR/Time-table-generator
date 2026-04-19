from fastapi import FastAPI, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager

from config.settings import settings
from config.cors import setup_cors
from middleware.error_handler import setup_error_handlers
from middleware.auth_middleware import AuthMiddleware
from routes.api_router import api_router
from utils.database import engine
from models import Base
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
# New API v1 prefix
app.include_router(api_router, prefix="/api/v1")

# Backward-compatibility wrappers for the old frontend until fully migrated to /api/v1
# In a full transition, we can map the exact same router without a prefix temporarily
app.include_router(api_router)

# 5. Default Health / Root
@app.get("/")
def read_root():
    return JSONResponse({"message": "BIT Timetable Generator API is running under the new MVC architecture."})

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
