import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from utils.database import SessionLocal, engine
from services.solver_engine import generate_schedule
import json

def test_gen():
    db = SessionLocal()
    try:
        # We need to find a department and semester that has data
        from backend.models import DepartmentMaster
        dept = db.query(DepartmentMaster).first()
        if not dept:
            print("No departments found in DB. Skipping test.")
            return
        
        dept_code = dept.department_code
        print(f"Testing generation for {dept_code}, Sem 1")
        
        result = generate_schedule(
            db=db,
            department_code=dept_code,
            semester=1,
            mentor_day="Friday",
            mentor_period=7,
            hard_mode=False
        )
        
        print(f"Success: {result.get('success')}")
        if not result.get("success"):
            print(f"Errors: {json.dumps(result.get('errors'), indent=2)}")
        else:
            print(f"Entries saved: {result.get('entries_saved')}")
            
    finally:
        db.close()

if __name__ == "__main__":
    test_gen()
