from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas
from database import engine, get_db
from fastapi.middleware.cors import CORSMiddleware
import import_book1

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

@app.post("/import-book1")
def run_import_book1(background_tasks: BackgroundTasks):
    background_tasks.add_task(import_book1.import_book1_data)
    return {"message": "Data import from Book1.xlsx has started in the background."}

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
    dept = models.DepartmentMaster(
        department_code=req.department_code,
        student_count=req.student_count
    )
    db.add(dept)
    db.commit()
    return {"status": "success", "department_code": req.department_code}

@app.put("/departments/{code}", response_model=schemas.Department)
def update_department(code: str, req: schemas.DepartmentUpdate, db: Session = Depends(get_db)):
    dept = db.query(models.DepartmentMaster).filter_by(department_code=code).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    if req.student_count is not None:
        dept.student_count = req.student_count
        
    db.commit()
    db.refresh(dept)
    return dept

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

# ============================================
# UPDATED TIMETABLE ENDPOINT (MASTER VIEW)
# ============================================
@app.get("/timetable", response_model=List[schemas.TimetableEntry])
def get_timetable(
    department_code: Optional[str] = None, 
    semester: Optional[int] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(models.TimetableEntry)
    
    # Logic: Only apply filter if the parameter is NOT None AND NOT an empty string
    # This ignores empty strings sent by frontend (e.g. ?department_code="")
    if department_code and department_code.strip():
        query = query.filter(models.TimetableEntry.department_code == department_code)
        
    if semester:
        query = query.filter(models.TimetableEntry.semester == semester)
        
    # If no valid filters are provided, this returns ALL entries (Master View)
    return query.all()

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


# ============================================
# VENUES
# ============================================

@app.get("/venues", response_model=List[schemas.Venue])
def get_venues(db: Session = Depends(get_db)):
    return db.query(models.VenueMaster).all()

@app.post("/venues", response_model=schemas.Venue)
def create_venue(req: schemas.VenueCreate, db: Session = Depends(get_db)):
    # Check for duplicate
    existing = db.query(models.VenueMaster).filter_by(venue_name=req.venue_name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Venue '{req.venue_name}' already exists")
    
    venue = models.VenueMaster(
        venue_name=req.venue_name,
        block=req.block,
        is_lab=req.is_lab,
        capacity=req.capacity
    )
    db.add(venue)
    try:
        db.commit()
        db.refresh(venue)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return venue

@app.delete("/venues/{venue_id}")
def delete_venue(venue_id: int, db: Session = Depends(get_db)):
    venue = db.query(models.VenueMaster).filter_by(venue_id=venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    db.delete(venue)
    db.commit()
    return {"status": "deleted", "venue_id": venue_id}

@app.post("/venues/import")
def import_venues(db: Session = Depends(get_db)):
    import pandas as pd
    import os
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(base_dir)
    file_path = os.path.join(project_root, "data", "campus_classrooms_labs_simplified.xlsx")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File not found: campus_classrooms_labs_simplified.xlsx")
    
    try:
        df = pd.read_excel(file_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read Excel file: {str(e)}")
    
    # Expected columns: 'Room Name', 'Block ID'
    if 'Room Name' not in df.columns:
        raise HTTPException(status_code=400, detail=f"Excel file missing 'Room Name' column. Found: {list(df.columns)}")
    
    imported_count = 0
    skipped_count = 0
    lab_keywords = ['lab', 'workshop', 'studio', 'drawing']
    
    for _, row in df.iterrows():
        venue_name = str(row.get('Room Name', '')).strip()
        block = str(row.get('Block ID', '')).strip() if pd.notna(row.get('Block ID')) else None
        
        if not venue_name or venue_name.lower() == 'nan':
            continue
        
        # Auto-detect if it's a lab based on name
        is_lab = any(kw in venue_name.lower() for kw in lab_keywords)
        
        # Skip if already exists
        existing = db.query(models.VenueMaster).filter_by(venue_name=venue_name).first()
        if existing:
            skipped_count += 1
            continue
        
        venue = models.VenueMaster(
            venue_name=venue_name,
            block=block,
            is_lab=is_lab,
            capacity=60
        )
        db.add(venue)
        imported_count += 1
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")
    
    return {"status": "success", "imported_count": imported_count, "skipped_count": skipped_count}

# --- Department Venue Mapping ---
@app.get("/department-venues", response_model=List[schemas.DepartmentVenueResponse])
def get_department_venues(department_code: str = None, db: Session = Depends(get_db)):
    query = db.query(models.DepartmentVenueMap)
    if department_code:
        query = query.filter(models.DepartmentVenueMap.department_code == department_code)
    
    maps = query.all()
    result = []
    for m in maps:
        venue = db.query(models.VenueMaster).filter_by(venue_id=m.venue_id).first()
        if venue:
            result.append(schemas.DepartmentVenueResponse(
                id=m.id,
                department_code=m.department_code,
                venue_id=venue.venue_id,
                venue_name=venue.venue_name,
                is_lab=venue.is_lab,
                capacity=venue.capacity
            ))
    return result

@app.post("/department-venues", response_model=schemas.DepartmentVenueResponse)
def create_department_venue(req: schemas.DepartmentVenueCreate, db: Session = Depends(get_db)):
    existing = db.query(models.DepartmentVenueMap).filter_by(
        department_code=req.department_code,
        venue_id=req.venue_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This venue is already mapped to the department.")
    
    new_map = models.DepartmentVenueMap(department_code=req.department_code, venue_id=req.venue_id)
    db.add(new_map)
    db.commit()
    db.refresh(new_map)
    
    venue = db.query(models.VenueMaster).filter_by(venue_id=req.venue_id).first()
    return schemas.DepartmentVenueResponse(
        id=new_map.id,
        department_code=new_map.department_code,
        venue_id=venue.venue_id,
        venue_name=venue.venue_name,
        is_lab=venue.is_lab,
        capacity=venue.capacity
    )

@app.delete("/department-venues/{map_id}")
def delete_department_venue(map_id: int, db: Session = Depends(get_db)):
    m = db.query(models.DepartmentVenueMap).filter_by(id=map_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mapping not found")
    db.delete(m)
    db.commit()
    return {"status": "success", "id": map_id}