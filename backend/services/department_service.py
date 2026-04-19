from sqlalchemy.orm import Session
from repositories.department_repo import DepartmentRepository
from models import DepartmentMaster
from schemas import DepartmentCreate, DepartmentUpdate
from exceptions import AppException
from audit_logger import log_activity
from sqlalchemy.exc import IntegrityError

class DepartmentService:
    def __init__(self, db: Session):
        """
        Service explicitly managing transactions (commit/rollback)
        while utilizing the injected repository for DB queries.
        """
        self.db = db
        self.repo = DepartmentRepository(db)

    def get_all_departments(self):
        return self.repo.get_all()

    def create_department(self, req: DepartmentCreate, user_email: str = "system"):
        try:
            existing = self.repo.get_by_code(req.department_code)
            if existing:
                raise AppException(400, "DEPT_EXISTS", f"Department '{req.department_code}' already exists.")

            dept = DepartmentMaster(
                department_code=req.department_code,
                name=req.name,
                pair_add_course_miniproject=req.pair_add_course_miniproject
            )
            self.repo.add(dept)
            self.db.commit()
            
            # Centralized Business Logging
            log_activity(
                user_email=user_email,
                endpoint="/departments",
                method="POST",
                status_code=201,
            )
            return dept
            
        except AppException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            raise AppException(500, "CREATE_FAILED", "Failed to create department", str(e))

    def update_department(self, code: str, req: DepartmentUpdate, user_email: str = "system"):
        try:
            dept = self.repo.get_by_code(code)
            if not dept:
                raise AppException(404, "DEPT_NOT_FOUND", "Department not found.")

            if req.name is not None:
                dept.name = req.name
            if req.pair_add_course_miniproject is not None:
                dept.pair_add_course_miniproject = req.pair_add_course_miniproject
            self.db.commit()
            return dept
        except AppException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            raise AppException(500, "UPDATE_FAILED", "Failed to update department", str(e))

    def delete_department(self, code: str, user_email: str = "system"):
        try:
            dept = self.repo.get_by_code(code)
            if not dept:
                raise AppException(404, "DEPT_NOT_FOUND", "Department not found.")

            self.repo.delete(dept)
            self.db.commit()
            return {"message": "Department deleted successfully"}
        except IntegrityError:
            self.db.rollback()
            raise AppException(400, "FK_CONSTRAINT", "Cannot delete department because it is referenced by courses or faculty.")
        except AppException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            raise AppException(500, "DELETE_FAILED", "Failed to delete department", str(e))
