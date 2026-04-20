from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
import json
from models import TimetableData
from services.solver_engine import generate_schedule

class GenerateRequest(BaseModel):
    department_code: str
    semester: int
    mentor_day: str
    mentor_period: int
    hard_mode: bool = False

class TimetableService:
    def __init__(self, db: Session):
        self.db = db

    def generate_and_save(self, req: GenerateRequest):
        # 1. Invoke the solver engine
        result = generate_schedule(
            db=self.db,
            department_code=req.department_code,
            semester=req.semester,
            mentor_day=req.mentor_day,
            mentor_period=req.mentor_period,
            hard_mode=req.hard_mode
        )
        
        if not result.get("success"):
            return result

        # 2. Extract entries from result format (assuming solver handles format)
        # solver_engine historically returned {"success": True, "entries": [...], ...} 
        # or it wrote directly to the DB into TimetableEntry. Let's see if we need to 
        # also capture a raw JSON snapshot for frontend rendering as requested:
        
        # Fetch generated entries from TimetableEntry table
        from models import TimetableEntry
        generated_entries = self.db.query(TimetableEntry).filter_by(
            department_code=req.department_code,
            semester=req.semester
        ).all()
        
        entries_list = [
            {
                "id": e.id,
                "course_code": e.course_code,
                "course_name": e.course_name,
                "faculty_id": e.faculty_id,
                "faculty_name": e.faculty_name,
                "session_type": e.session_type,
                "slot_id": e.slot_id,
                "day_of_week": e.day_of_week,
                "period_number": e.period_number,
                "venue_name": e.venue_name,
                "section_number": e.section_number,
            }
            for e in generated_entries
        ]
        
        # Save a snapshot to the new TimetableData model
        record = self.db.query(TimetableData).filter_by(
            department=req.department_code, 
            semester=req.semester
        ).first()

        json_data = json.dumps(entries_list)
        
        if record:
            record.data = json_data
            record.created_at = datetime.utcnow().isoformat()
        else:
            record = TimetableData(
                department=req.department_code,
                semester=req.semester,
                data=json_data,
                created_at=datetime.utcnow().isoformat()
            )
            self.db.add(record)
        
        self.db.commit()
        return result

    def get_timetable(self, department_code: str, semester: int):
        record = self.db.query(TimetableData).filter_by(
            department=department_code, 
            semester=semester
        ).first()
        
        return json.loads(record.data) if record else []
