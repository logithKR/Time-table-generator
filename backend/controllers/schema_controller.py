from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from utils.database import get_db
from models import SlotMaster, BreakConfigMaster
import json

router = APIRouter()

@router.get("/semesters")
def get_semesters():
    return [{"semester_number": i} for i in range(1, 9)]

@router.get("/slots")
def get_slots(db: Session = Depends(get_db)):
    slots = db.query(SlotMaster).order_by(SlotMaster.day_of_week, SlotMaster.period_number).all()
    out = []
    for s in slots:
        try:
            parsed_ids = json.loads(s.semester_ids) if s.semester_ids else []
        except:
            parsed_ids = []
            
        out.append({
            "slot_id": s.slot_id,
            "day_of_week": s.day_of_week,
            "period_number": s.period_number,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "slot_type": s.slot_type,
            "is_active": s.is_active,
            "semester_ids": parsed_ids
        })
    return out

@router.get("/breaks")
def get_breaks(db: Session = Depends(get_db)):
    breaks = db.query(BreakConfigMaster).all()
    out = []
    for b in breaks:
        try:
            parsed_ids = json.loads(b.semester_ids) if b.semester_ids else []
        except:
            parsed_ids = []
            
        out.append({
            "id": b.id,
            "break_type": b.break_type,
            "start_time": b.start_time,
            "end_time": b.end_time,
            "semester_ids": parsed_ids
        })
    return out
