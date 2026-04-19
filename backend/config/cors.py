import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

def setup_cors(app: FastAPI):
    cors_origins_env = os.environ.get("CORS_ORIGINS", "")
    additional_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]

    # In production, ensure the main domains are always allowed
    base_origins = [
        "https://timetable.bitsathy.ac.in",
        "http://timetable.bitsathy.ac.in",
    ]

    # Combine and uniquely filter origins
    origins = list(set(base_origins + additional_origins))
    
    # Simple fallback if nothing is configured
    if not origins:
        origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    return app
