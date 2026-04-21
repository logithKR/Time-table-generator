from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from utils.database import get_db
from services.timetable_service import TimetableService, GenerateRequest

router = APIRouter()

def get_timetable_service(db: Session = Depends(get_db)):
    return TimetableService(db)

@router.post("/generate")
async def generate_timetable(req: GenerateRequest, service: TimetableService = Depends(get_timetable_service)):
    import asyncio
    return await asyncio.to_thread(service.generate_and_save, req)

@router.get("/timetable")
def get_timetable(
    department_code: str = Query(...), 
    semester: int = Query(...), 
    service: TimetableService = Depends(get_timetable_service)
):
    return service.get_timetable(department_code, semester)
