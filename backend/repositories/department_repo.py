from sqlalchemy.orm import Session
from typing import Optional, List
from backend.models import DepartmentMaster
from backend.repositories.base import BaseRepository

class DepartmentRepository(BaseRepository[DepartmentMaster]):
    def __init__(self, db: Session):
        super().__init__(DepartmentMaster, db)

    def get_by_code(self, department_code: str) -> Optional[DepartmentMaster]:
        return self.db.query(self.model).filter(self.model.department_code == department_code).first()
