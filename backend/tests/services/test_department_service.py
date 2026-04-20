import pytest
from services.department_service import DepartmentService
from core.exceptions import AppException
from schemas import DepartmentCreate, DepartmentUpdate
from models import DepartmentMaster

class MockSession:
    def commit(self): pass
    def rollback(self): pass

class MockDepartmentRepo:
    def __init__(self):
        self.departments = []
    
    def get_all(self):
        return self.departments
    
    def get_by_code(self, code):
        for dept in self.departments:
            if dept.department_code == code:
                return dept
        return None
    
    def add(self, dept):
        self.departments.append(dept)

def test_create_department():
    session = MockSession()
    service = DepartmentService(session)
    service.repo = MockDepartmentRepo() # Inject mock
    
    req = DepartmentCreate(department_code="CS", name="Computer Science")
    
    result = service.create_department(req)
    assert result.department_code == "CS"
    assert result.name == "Computer Science"
    assert len(service.repo.departments) == 1

def test_create_department_duplicate():
    session = MockSession()
    service = DepartmentService(session)
    service.repo = MockDepartmentRepo() # Inject mock
    service.repo.departments.append(DepartmentMaster(department_code="CS", name="Computer Science"))
    
    req = DepartmentCreate(department_code="CS", name="Computer Science Duplicate")
    
    with pytest.raises(AppException) as exc:
        service.create_department(req)
    assert exc.value.status_code == 400
    assert "already exists" in exc.value.message
