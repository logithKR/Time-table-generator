from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import engine, get_db
from fastapi.middleware.cors import CORSMiddleware

# Ensure tables exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="BIT Scheduler Pro (Simplified)")

# CORS
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# DEPARTMENTS
# ============================================

@app.get("/departments", response_model=List[schemas.Department])
def get_departments(db: Session = Depends(get_db)):
    return db.query(models.DepartmentMaster).all()

@app.post("/departments")
def create_department(req: schemas.DepartmentCreate, db: Session = Depends(get_db)):
    existing = db.query(models.DepartmentMaster).filter_by(department_code=req.department_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Department {req.department_code} already exists")
    dept = models.DepartmentMaster(department_code=req.department_code)
    db.add(dept)
    db.commit()
    return {"status": "success", "department_code": req.department_code}

@app.delete("/departments/{code}")
def delete_department(code: str, db: Session = Depends(get_db)):
    dept = db.query(models.DepartmentMaster).filter_by(department_code=code).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    # Check for dependent records
    fac_count = db.query(models.FacultyMaster).filter_by(department_code=code).count()
    course_count = db.query(models.CourseMaster).filter_by(department_code=code).count()
    if fac_count > 0 or course_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: {fac_count} faculty and {course_count} courses still linked.")
    db.delete(dept)
    db.commit()
    return {"status": "deleted"}

@app.get("/semesters")
def get_semesters():
    return [{"semester_number": i} for i in range(1, 9)]

# ============================================
# FACULTY
# ============================================

@app.get("/faculty", response_model=List[schemas.Faculty])
def get_faculty(department_code: str = None, db: Session = Depends(get_db)):
    query = db.query(models.FacultyMaster)
    if department_code:
        query = query.filter(models.FacultyMaster.department_code == department_code)
    return query.all()

@app.post("/faculty")
def create_faculty(req: schemas.FacultyCreate, db: Session = Depends(get_db)):
    existing = db.query(models.FacultyMaster).filter_by(faculty_id=req.faculty_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Faculty {req.faculty_id} already exists")
    # Ensure department exists
    dept = db.query(models.DepartmentMaster).filter_by(department_code=req.department_code).first()
    if not dept:
        raise HTTPException(status_code=400, detail=f"Department {req.department_code} does not exist")
    fac = models.FacultyMaster(
        faculty_id=req.faculty_id,
        faculty_name=req.faculty_name,
        faculty_email=req.faculty_email,
        department_code=req.department_code,
        status=req.status
    )
    db.add(fac)
    db.commit()
    return {"status": "success", "faculty_id": req.faculty_id}

@app.delete("/faculty/{fid}")
def delete_faculty(fid: str, db: Session = Depends(get_db)):
    fac = db.query(models.FacultyMaster).filter_by(faculty_id=fid).first()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty not found")
    # Remove course-faculty mappings first
    db.query(models.CourseFacultyMap).filter_by(faculty_id=fid).delete()
    db.delete(fac)
    db.commit()
    return {"status": "deleted"}

# ============================================
# COURSES
# ============================================

@app.get("/courses", response_model=List[schemas.Course])
def get_courses(department_code: str = None, semester: int = None, db: Session = Depends(get_db)):
    query = db.query(models.CourseMaster)
    if department_code:
        query = query.filter(models.CourseMaster.department_code == department_code)
    if semester:
        query = query.filter(models.CourseMaster.semester == semester)
    return query.all()

@app.post("/courses")
def create_course(req: schemas.CourseCreate, db: Session = Depends(get_db)):
    existing = db.query(models.CourseMaster).filter_by(course_code=req.course_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Course {req.course_code} already exists")
    dept = db.query(models.DepartmentMaster).filter_by(department_code=req.department_code).first()
    if not dept:
        raise HTTPException(status_code=400, detail=f"Department {req.department_code} does not exist")
    # Auto-detect honours from course code
    is_honours = req.is_honours or ('H' in req.course_code[-3:].upper())
    course = models.CourseMaster(
        course_code=req.course_code,
        course_name=req.course_name,
        department_code=req.department_code,
        semester=req.semester,
        lecture_hours=req.lecture_hours,
        tutorial_hours=req.tutorial_hours,
        practical_hours=req.practical_hours,
        credits=req.credits,
        weekly_sessions=req.weekly_sessions,
        is_lab=req.is_lab,
        is_honours=is_honours,
        is_minor=req.is_minor,
        is_elective=req.is_elective,
        is_open_elective=req.is_open_elective
    )
    db.add(course)
    db.commit()
    return {"status": "success", "course_code": req.course_code}

@app.delete("/courses/{code}")
def delete_course(code: str, db: Session = Depends(get_db)):
    course = db.query(models.CourseMaster).filter_by(course_code=code).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    # Remove course-faculty mappings
    db.query(models.CourseFacultyMap).filter_by(course_code=code).delete()
    db.delete(course)
    db.commit()
    return {"status": "deleted"}

# ============================================
# COURSE-FACULTY MAPPING
# ============================================

@app.get("/course-faculty")
def get_course_faculty(department_code: str = None, db: Session = Depends(get_db)):
    query = db.query(models.CourseFacultyMap)
    if department_code:
        query = query.filter(models.CourseFacultyMap.department_code == department_code)
    mappings = query.all()
    result = []
    for m in mappings:
        fac = db.query(models.FacultyMaster).filter_by(faculty_id=m.faculty_id).first()
        course = db.query(models.CourseMaster).filter_by(course_code=m.course_code).first()
        result.append({
            "id": m.id,
            "course_code": m.course_code,
            "course_name": course.course_name if course else m.course_code,
            "course_dept": course.department_code if course else "?",
            "course_semester": course.semester if course else 0,
            "faculty_id": m.faculty_id,
            "faculty_name": fac.faculty_name if fac else m.faculty_id,
            "faculty_dept": fac.department_code if fac else "?",
            "for_department": m.department_code,
            "delivery_type": m.delivery_type,
        })
    return result

# ============================================
# VENUES
# ============================================

@app.get("/venues", response_model=List[schemas.Venue])
def get_venues(db: Session = Depends(get_db)):
    return db.query(models.VenueMaster).all()

@app.post("/venues")
def create_venue(req: schemas.VenueCreate, db: Session = Depends(get_db)):
    existing = db.query(models.VenueMaster).filter_by(venue_name=req.venue_name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Venue {req.venue_name} already exists")
    venue = models.VenueMaster(
        venue_name=req.venue_name,
        block=req.block,
        is_lab=req.is_lab,
        capacity=req.capacity
    )
    db.add(venue)
    db.commit()
    return {"status": "success", "venue_name": req.venue_name}

@app.delete("/venues/{venue_id}")
def delete_venue(venue_id: int, db: Session = Depends(get_db)):
    venue = db.query(models.VenueMaster).filter_by(venue_id=venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    db.delete(venue)
    db.commit()
    return {"status": "deleted"}

@app.post("/venues/import")
def import_venues(db: Session = Depends(get_db)):
    import pandas as pd
    import os
    
    file_path = "C:/Users/kalai/Downloads/time table/data/campus_classrooms_labs_simplified.xlsx"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Venues Excel file not found")
        
    try:
        count = 0
        processed_names = set()
        
        # Helper to avoid duplicates within this transaction
        def process_row(row, name_col, block_col, force_lab=False):
            nonlocal count
            v_name = str(row.get(name_col, '')).strip()
            if not v_name or v_name.lower() == 'nan': return
            
            # Normalize for deduplication check
            norm_name = v_name.lower()
            
            block = str(row.get(block_col, '')).strip()
            is_lab = force_lab or ('LAB' in v_name.upper())

            if norm_name in processed_names:
                # Already processed in this batch, maybe update details?
                # For now just skip to avoid UNIQUE constraint error
                return
            
            # Check DB
            existing = db.query(models.VenueMaster).filter_by(venue_name=v_name).first()
            if existing:
                existing.block = block
                existing.is_lab = is_lab
            else:
                new_venue = models.VenueMaster(
                    venue_name=v_name,
                    block=block,
                    is_lab=is_lab,
                    capacity=60
                )
                db.add(new_venue)
                # Important: Flush to ensure subsequent queries might find it if we were relying on that,
                # but 'processed_names' handles the in-memory duplication within this request.
                # db.flush() 
                count += 1
            
            processed_names.add(norm_name)

        # 1. Process Classrooms
        try:
            df_class = pd.read_excel(file_path, sheet_name='All Classrooms')
            for _, row in df_class.iterrows():
                process_row(row, 'Room Name', 'Block ID', force_lab=False)
        except Exception as e:
            print(f"Error reading All Classrooms: {e}")

        # 2. Process Labs
        try:
            df_labs = pd.read_excel(file_path, sheet_name='All Labs')
            for _, row in df_labs.iterrows():
                process_row(row, 'Lab Name', 'Block ID', force_lab=True)
        except Exception as e:
            print(f"Error reading All Labs: {e}")

        db.commit()
        return {"status": "success", "imported_count": count}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@app.post("/course-faculty")
def create_course_faculty(req: schemas.CourseFacultyCreate, db: Session = Depends(get_db)):
    # Validate
    course = db.query(models.CourseMaster).filter_by(course_code=req.course_code).first()
    if not course:
        raise HTTPException(status_code=400, detail=f"Course {req.course_code} does not exist")
    fac = db.query(models.FacultyMaster).filter_by(faculty_id=req.faculty_id).first()
    if not fac:
        raise HTTPException(status_code=400, detail=f"Faculty {req.faculty_id} does not exist")
    # Check duplicate
    existing = db.query(models.CourseFacultyMap).filter_by(
        course_code=req.course_code, faculty_id=req.faculty_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This mapping already exists")
    m = models.CourseFacultyMap(
        course_code=req.course_code,
        faculty_id=req.faculty_id,
        department_code=req.department_code,
        delivery_type=req.delivery_type
    )
    db.add(m)
    db.commit()
    return {"status": "success", "id": m.id}

@app.delete("/course-faculty/{mid}")
def delete_course_faculty(mid: int, db: Session = Depends(get_db)):
    m = db.query(models.CourseFacultyMap).filter_by(id=mid).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mapping not found")
    db.delete(m)
    db.commit()
    return {"status": "deleted"}

# ============================================
# SLOTS
# ============================================

@app.get("/slots", response_model=List[schemas.Slot])
def get_slots(db: Session = Depends(get_db)):
    return db.query(models.SlotMaster).order_by(models.SlotMaster.day_of_week, models.SlotMaster.period_number).all()

@app.post("/slots", response_model=schemas.Slot)
def create_slot(req: schemas.SlotCreate, db: Session = Depends(get_db)):
    existing = db.query(models.SlotMaster).filter_by(
        day_of_week=req.day_of_week, period_number=req.period_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Slot already exists for {req.day_of_week} Period {req.period_number}")
    slot = models.SlotMaster(
        day_of_week=req.day_of_week,
        period_number=req.period_number,
        start_time=req.start_time,
        end_time=req.end_time,
        slot_type=req.slot_type,
        is_active=req.is_active
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot

@app.put("/slots/{slot_id}", response_model=schemas.Slot)
def update_slot(slot_id: int, req: schemas.SlotUpdate, db: Session = Depends(get_db)):
    slot = db.query(models.SlotMaster).filter_by(slot_id=slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if req.start_time is not None:
        slot.start_time = req.start_time
    if req.end_time is not None:
        slot.end_time = req.end_time
    if req.slot_type is not None:
        slot.slot_type = req.slot_type
    if req.is_active is not None:
        slot.is_active = req.is_active
    db.commit()
    db.refresh(slot)
    return slot

@app.delete("/slots/{slot_id}")
def delete_slot(slot_id: int, db: Session = Depends(get_db)):
    slot = db.query(models.SlotMaster).filter_by(slot_id=slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    db.delete(slot)
    db.commit()
    return {"status": "deleted", "slot_id": slot_id}

# ============================================
# GENERATION & TIMETABLE
# ============================================

@app.post("/generate")
def generate_timetable(request: schemas.GenerateRequest, db: Session = Depends(get_db)):
    from solver_engine import generate_schedule
    
    success = generate_schedule(
        db, 
        department_code=request.department_code, 
        semester=request.semester,
        mentor_day=request.mentor_day,
        mentor_period=request.mentor_period
    )
    
    if success:
        return {"status": "success", "message": "Timetable generated successfully"}
    else:
        courses = db.query(models.CourseMaster).filter_by(
            department_code=request.department_code, semester=request.semester
        ).all()
        if not courses:
            raise HTTPException(status_code=400, detail=f"No courses found for {request.department_code} Sem {request.semester}. Check data import.")
        total_ws = sum(c.weekly_sessions for c in courses)
        raise HTTPException(status_code=400, detail=f"Cannot generate: {total_ws} weekly sessions for ~47 available slots. Schedule may be overloaded. Review course data for {request.department_code} Sem {request.semester}.")

@app.get("/timetable", response_model=List[schemas.TimetableEntry])
def get_timetable(department_code: str, semester: int, db: Session = Depends(get_db)):
    entries = db.query(models.TimetableEntry).filter_by(
        department_code=department_code,
        semester=semester
    ).all()
    return entries

@app.post("/timetable/save")
def save_timetable(request: schemas.TimetableSaveRequest, db: Session = Depends(get_db)):
    # Delete existing entries for this Dept/Semester
    db.query(models.TimetableEntry).filter_by(
        department_code=request.department_code,
        semester=request.semester
    ).delete()
    
    # Bulk insert new entries
    new_entries = [models.TimetableEntry(**entry.dict()) for entry in request.entries]
    db.add_all(new_entries)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Save failed: {str(e)}")
        
    return {"status": "success", "count": len(new_entries)}
