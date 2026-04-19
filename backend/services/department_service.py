from sqlalchemy.orm import Session
from backend.repositories.department_repo import DepartmentRepository
from backend.models import DepartmentMaster
from backend.schemas import DepartmentCreate, DepartmentUpdate
from backend.core.exceptions import AppException
from backend.logging.audit_logger import log_activity
from sqlalchemy.exc import IntegrityError
from backend.services.base import BaseService

class DepartmentService(BaseService):
    def __init__(self, db: Session):
        super().__init__(db)
        self.repo = DepartmentRepository(db)

    def get_all_departments(self):
        return self.repo.get_all()

    def create_department(self, req: DepartmentCreate, user_email: str = "system"):
        def logic():
            existing = self.repo.get_by_code(req.department_code)
            if existing:
                raise AppException(400, "DEPT_EXISTS", f"Department '{req.department_code}' already exists.")

            dept = DepartmentMaster(
                department_code=req.department_code,
                name=req.name,
                pair_add_course_miniproject=req.pair_add_course_miniproject
            )
            self.repo.add(dept)
            
            # Centralized Business Logging
            log_activity(
                user_email=user_email,
                endpoint="/departments",
                method="POST",
                status_code=201,
            )
            return dept
        
        return self.execute_transaction(logic, "CREATE_FAILED", "Failed to create department")

    def update_department(self, code: str, req: DepartmentUpdate, user_email: str = "system"):
        def logic():
            dept = self.repo.get_by_code(code)
            if not dept:
                raise AppException(404, "DEPT_NOT_FOUND", "Department not found.")

            if req.name is not None:
                dept.name = req.name
            if req.pair_add_course_miniproject is not None:
                dept.pair_add_course_miniproject = req.pair_add_course_miniproject
            return dept

        return self.execute_transaction(logic, "UPDATE_FAILED", "Failed to update department")

    def delete_department(self, code: str, user_email: str = "system"):
        def logic():
            try:
                dept = self.repo.get_by_code(code)
                if not dept:
                    raise AppException(404, "DEPT_NOT_FOUND", "Department not found.")

                self.repo.delete(dept)
                return {"message": "Department deleted successfully"}
            except IntegrityError:
                raise AppException(400, "FK_CONSTRAINT", "Cannot delete department because it is referenced by courses or faculty.")

        return self.execute_transaction(logic, "DELETE_FAILED", "Failed to delete department")

