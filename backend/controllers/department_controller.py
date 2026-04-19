from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from typing import List
from utils.database import get_db
from services.department_service import DepartmentService
from schemas import DepartmentRead, DepartmentCreate, DepartmentUpdate
from auth import verify_token

router = APIRouter()

# Dependency Helper
def get_department_service(db: Session = Depends(get_db)):
    return DepartmentService(db)

@router.get("/", response_model=List[DepartmentRead])
def get_departments(service: DepartmentService = Depends(get_department_service)):
    return service.get_all_departments()

@router.post("/", response_model=DepartmentRead)
def create_department(request: Request, data: DepartmentCreate, service: DepartmentService = Depends(get_department_service), token_ctx: dict = Depends(verify_token)):
    user_email = token_ctx.get("email", "unknown")
    return service.create_department(data, user_email)

@router.put("/{department_code}", response_model=DepartmentRead)
def update_department(department_code: str, request: Request, data: DepartmentUpdate, service: DepartmentService = Depends(get_department_service), token_ctx: dict = Depends(verify_token)):
    user_email = token_ctx.get("email", "unknown")
    return service.update_department(department_code, data, user_email)

@router.delete("/{department_code}")
def delete_department(department_code: str, request: Request, service: DepartmentService = Depends(get_department_service), token_ctx: dict = Depends(verify_token)):
    user_email = token_ctx.get("email", "unknown")
    return service.delete_department(department_code, user_email)
