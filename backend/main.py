from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import models, schemas
from database import engine, get_db
from fastapi.middleware.cors import CORSMiddleware


# Ensure tables exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="BIT Scheduler Pro (Simplified)")

# CORS
origins = [
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:5174", "http://127.0.0.1:5174",
    "http://localhost:5175", "http://127.0.0.1:5175",
]
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

@app.get("/departments/{code}/capacities", response_model=List[schemas.DepartmentSemesterCountResponse])
def get_department_capacities(code: str, db: Session = Depends(get_db)):
    dept = db.query(models.DepartmentMaster).filter_by(department_code=code).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    return db.query(models.DepartmentSemesterCount).filter_by(department_code=code).order_by(models.DepartmentSemesterCount.semester).all()

@app.post("/departments/{code}/capacities", response_model=schemas.DepartmentSemesterCountResponse)
def upsert_department_capacity(
    code: str, 
    semester: int, 
    req: schemas.DepartmentSemesterCountUpdate, 
    db: Session = Depends(get_db)
):
    dept = db.query(models.DepartmentMaster).filter_by(department_code=code).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    record = db.query(models.DepartmentSemesterCount).filter_by(
        department_code=code, semester=semester
    ).first()
    
    if record:
        record.student_count = req.student_count
    else:
        record = models.DepartmentSemesterCount(
            department_code=code,
            semester=semester,
            student_count=req.student_count
        )
        db.add(record)
        
    db.commit()
    db.refresh(record)
    return record

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
    target_depts = [req.department_code]
    if getattr(req, 'common_departments', None):
        for d in req.common_departments:
            if d not in target_depts:
                target_depts.append(d)

    for d_code in target_depts:
        dept = db.query(models.DepartmentMaster).filter_by(department_code=d_code).first()
        if not dept:
            raise HTTPException(status_code=400, detail=f"Department {d_code} does not exist")

    is_honours = req.is_honours or ('H' in req.course_code[-3:].upper())
    
    created_count = 0
    for d_code in target_depts:
        existing = db.query(models.CourseMaster).filter_by(
            course_code=req.course_code, department_code=d_code
        ).first()
        
        if existing:
            if d_code == req.department_code:
                raise HTTPException(status_code=400, detail=f"Course {req.course_code} already exists in {d_code}")
            continue

        course = models.CourseMaster(
            course_code=req.course_code,
            course_name=req.course_name,
            department_code=d_code,
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
        created_count += 1

    if len(target_depts) > 1:
        db.query(models.CommonCourseMap).filter_by(
            course_code=req.course_code, semester=req.semester
        ).delete()
        for d_code in target_depts:
            db.add(models.CommonCourseMap(
                course_code=req.course_code,
                semester=req.semester,
                department_code=d_code
            ))

    db.commit()
    return {"status": "success", "course_code": req.course_code, "created_records": created_count}

@app.put("/courses/{code:path}")
def update_course(code: str, req: schemas.CourseUpdate, db: Session = Depends(get_db)):
    print(f"DEBUG PUT COURSE: received code={repr(code)}")
    # Find all course masters with this code
    existing_courses = db.query(models.CourseMaster).filter_by(course_code=code).all()
    print(f"DEBUG PUT COURSE: found existing: {existing_courses}")
    if not existing_courses:
        raise HTTPException(status_code=404, detail="Course not found")
        
    base_course = existing_courses[0]
    primary_dept = req.department_code if req.department_code is not None else base_course.department_code
    semester = req.semester if req.semester is not None else base_course.semester
    
    target_depts = [primary_dept]
    if hasattr(req, 'common_departments') and req.common_departments is not None:
        for d in req.common_departments:
            if d not in target_depts:
                target_depts.append(d)
    else:
        # If common_departments wasn't sent, keep existing mappings
        common_maps = db.query(models.CommonCourseMap).filter_by(course_code=code).all()
        for cm in common_maps:
            if cm.department_code not in target_depts:
                target_depts.append(cm.department_code)

    # Validate DEPARTMENTS
    for d_code in target_depts:
        if not db.query(models.DepartmentMaster).filter_by(department_code=d_code).first():
            raise HTTPException(status_code=400, detail=f"Department {d_code} does not exist")

    is_honours = req.is_honours if req.is_honours is not None else base_course.is_honours
    # Auto-detect honours if changed course code ends in H? (course code edit not supported via PUT right now)
    
    # 1. DELETE course masters that are no longer in target_depts
    for existing in existing_courses:
        if existing.department_code not in target_depts:
            db.delete(existing)
            
    # 2. UPDATE/CREATE target_depts
    for d_code in target_depts:
        course = db.query(models.CourseMaster).filter_by(course_code=code, department_code=d_code).first()
        if not course:
            course = models.CourseMaster(course_code=code, department_code=d_code)
            db.add(course)
            
        if req.course_name is not None: course.course_name = req.course_name
        if req.semester is not None: course.semester = req.semester
        if req.lecture_hours is not None: course.lecture_hours = req.lecture_hours
        if req.tutorial_hours is not None: course.tutorial_hours = req.tutorial_hours
        if req.practical_hours is not None: course.practical_hours = req.practical_hours
        if req.credits is not None: course.credits = req.credits
        if req.weekly_sessions is not None: course.weekly_sessions = req.weekly_sessions
        if req.is_lab is not None: course.is_lab = req.is_lab
        if req.is_honours is not None: course.is_honours = req.is_honours
        if req.is_minor is not None: course.is_minor = req.is_minor
        if req.is_elective is not None: course.is_elective = req.is_elective
        if req.is_open_elective is not None: course.is_open_elective = req.is_open_elective

    # 3. Rebuild CommonCourseMap if more than 1 dept
    db.query(models.CommonCourseMap).filter_by(course_code=code).delete()
    if len(target_depts) > 1:
        for d_code in target_depts:
            db.add(models.CommonCourseMap(
                course_code=code,
                semester=semester,
                department_code=d_code
            ))
            
    db.commit()
    return {"status": "success", "course_code": code}

@app.delete("/courses/{code:path}")
def delete_course(code: str, db: Session = Depends(get_db)):
    courses = db.query(models.CourseMaster).filter_by(course_code=code).all()
    if not courses:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Remove course-faculty mappings
    db.query(models.CourseFacultyMap).filter_by(course_code=code).delete()
    # Remove common course mapping
    db.query(models.CommonCourseMap).filter_by(course_code=code).delete()
    
    for c in courses:
        db.delete(c)
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
            department_code=request.department_code, semester=request.semester, is_open_elective=False
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
# AVAILABILITY QUERIES (for Smart Editor)
# ============================================

@app.get("/available-faculty")
def get_available_faculty(
    department_code: str,
    day: str,
    period: int,
    db: Session = Depends(get_db)
):
    """Return faculty who are NOT busy at this day+period across all depts/sems."""
    # All faculty across all departments
    all_faculty = db.query(models.FacultyMaster).all()

    # All faculty_names busy at this exact slot (across ALL departments and semesters)
    busy_names = set()
    busy_entries = db.query(models.TimetableEntry.faculty_name).filter(
        models.TimetableEntry.day_of_week == day,
        models.TimetableEntry.period_number == period,
        models.TimetableEntry.faculty_name.isnot(None),
        models.TimetableEntry.faculty_name != '',
        models.TimetableEntry.faculty_name != 'Unassigned'
    ).all()
    for (name,) in busy_entries:
        busy_names.add(name)

    result = []
    for f in all_faculty:
        result.append({
            "faculty_id": f.faculty_id,
            "faculty_name": f.faculty_name,
            "department_code": f.department_code,
            "is_available": f.faculty_name not in busy_names
        })
    # Sort: available first, then by name
    result.sort(key=lambda x: (not x["is_available"], x["faculty_name"]))
    return result


@app.get("/available-venues")
def get_available_venues(
    department_code: str,
    semester: int,
    day: str,
    period: int,
    db: Session = Depends(get_db)
):
    """Return venues that are NOT used at this day+period across all depts/sems."""
    # Get all venues
    venues = db.query(models.VenueMaster).all()

    # All venue_names busy at this exact slot (across ALL departments and semesters)
    busy_venue_names = set()
    busy_entries = db.query(models.TimetableEntry.venue_name).filter(
        models.TimetableEntry.day_of_week == day,
        models.TimetableEntry.period_number == period,
        models.TimetableEntry.venue_name.isnot(None),
        models.TimetableEntry.venue_name != ''
    ).all()
    for (name,) in busy_entries:
        busy_venue_names.add(name)

    result = []
    for v in venues:
        result.append({
            "venue_id": v.venue_id,
            "venue_name": v.venue_name,
            "block": v.block,
            "is_lab": v.is_lab,
            "capacity": v.capacity,
            "is_available": v.venue_name not in busy_venue_names
        })
    # Sort: available first, then by name
    result.sort(key=lambda x: (not x["is_available"], x["venue_name"]))
    return result


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
def get_department_venues(department_code: str = None, semester: int = None, db: Session = Depends(get_db)):
    query = db.query(models.DepartmentVenueMap)
    if department_code:
        query = query.filter(models.DepartmentVenueMap.department_code == department_code)
    if semester:
        query = query.filter(models.DepartmentVenueMap.semester == semester)
    
    maps = query.all()
    result = []
    for m in maps:
        venue = db.query(models.VenueMaster).filter_by(venue_id=m.venue_id).first()
        if venue:
            result.append(schemas.DepartmentVenueResponse(
                id=m.id,
                department_code=m.department_code,
                semester=m.semester,
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
        semester=req.semester,
        venue_id=req.venue_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This venue is already mapped to this department's semester.")
    
    new_map = models.DepartmentVenueMap(department_code=req.department_code, semester=req.semester, venue_id=req.venue_id)
    db.add(new_map)
    db.commit()
    db.refresh(new_map)
    
    venue = db.query(models.VenueMaster).filter_by(venue_id=req.venue_id).first()
    return schemas.DepartmentVenueResponse(
        id=new_map.id,
        department_code=new_map.department_code,
        semester=new_map.semester,
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

# --- Course Venue Mapping ---
@app.get("/course-venues", response_model=List[schemas.CourseVenueResponse])
def get_course_venues(department_code: str = None, db: Session = Depends(get_db)):
    query = db.query(models.CourseVenueMap)
    if department_code:
        query = query.filter(models.CourseVenueMap.department_code == department_code)
    
    maps = query.all()
    result = []
    for m in maps:
        venue = db.query(models.VenueMaster).filter_by(venue_id=m.venue_id).first()
        if venue:
            result.append(schemas.CourseVenueResponse(
                id=m.id,
                department_code=m.department_code,
                course_code=m.course_code,
                venue_id=venue.venue_id,
                venue_name=venue.venue_name,
                is_lab=venue.is_lab,
                capacity=venue.capacity,
                venue_type=m.venue_type or 'BOTH'
            ))
    return result

@app.post("/course-venues", response_model=schemas.CourseVenueResponse)
def create_course_venue(req: schemas.CourseVenueCreate, db: Session = Depends(get_db)):
    existing = db.query(models.CourseVenueMap).filter_by(
        department_code=req.department_code,
        course_code=req.course_code,
        venue_id=req.venue_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This venue is already mapped to the course.")
    
    new_map = models.CourseVenueMap(
        department_code=req.department_code, 
        course_code=req.course_code, 
        venue_id=req.venue_id,
        venue_type=(req.venue_type or 'BOTH').upper()
    )
    db.add(new_map)
    db.commit()
    db.refresh(new_map)
    
    venue = db.query(models.VenueMaster).filter_by(venue_id=req.venue_id).first()
    return schemas.CourseVenueResponse(
        id=new_map.id,
        department_code=new_map.department_code,
        course_code=new_map.course_code,
        venue_id=venue.venue_id,
        venue_name=venue.venue_name,
        is_lab=venue.is_lab,
        capacity=venue.capacity,
        venue_type=new_map.venue_type or 'BOTH'
    )

@app.delete("/course-venues/{map_id}")
def delete_course_venue(map_id: int, db: Session = Depends(get_db)):
    m = db.query(models.CourseVenueMap).filter_by(id=map_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mapping not found")
    db.delete(m)
    db.commit()
    return {"status": "success", "id": map_id}

# ============================================
# STUDENTS & REGISTRATIONS
# ============================================

@app.get("/students", response_model=List[schemas.StudentResponse])
def get_students(department_code: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.StudentMaster)
    if department_code:
        query = query.filter_by(department_code=department_code)
    return query.all()

@app.get("/registrations", response_model=List[schemas.CourseRegistrationResponse])
def get_registrations(course_code: Optional[str] = None, semester: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.CourseRegistration)
    if course_code:
        query = query.filter_by(course_code=course_code)
    if semester:
        query = query.filter_by(semester=semester)
    return query.all()

@app.post("/registrations", response_model=schemas.CourseRegistrationResponse)
def create_registration(req: schemas.CourseRegistrationCreate, db: Session = Depends(get_db)):
    student = db.query(models.StudentMaster).filter_by(student_id=req.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    course = db.query(models.CourseMaster).filter_by(
        course_code=req.course_code, 
        semester=req.semester,
        department_code=student.department_code
    ).first()
    
    if not course:
        raise HTTPException(status_code=404, detail=f"Course {req.course_code} not mapped to this student's department ({student.department_code})")
        
    existing = db.query(models.CourseRegistration).filter_by(student_id=req.student_id, course_code=req.course_code, semester=req.semester).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student already registered for this course")
        
    reg = models.CourseRegistration(**req.dict())
    db.add(reg)
    course.enrolled_students = (course.enrolled_students or 0) + 1
    db.commit()
    db.refresh(reg)
    return reg

@app.delete("/registrations/{reg_id}")
def delete_registration(reg_id: int, db: Session = Depends(get_db)):
    reg = db.query(models.CourseRegistration).filter_by(id=reg_id).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
        
    student = db.query(models.StudentMaster).filter_by(student_id=reg.student_id).first()
    if student:
        course = db.query(models.CourseMaster).filter_by(
            course_code=reg.course_code, 
            semester=reg.semester,
            department_code=student.department_code
        ).first()
        if course and course.enrolled_students and course.enrolled_students > 0:
            course.enrolled_students -= 1
        
    db.delete(reg)
    db.commit()
    return {"status": "success", "id": reg_id}

@app.post("/students", response_model=schemas.StudentResponse)
def create_student(req: schemas.StudentCreate, db: Session = Depends(get_db)):
    student = db.query(models.StudentMaster).filter_by(student_id=req.student_id).first()
    if student:
        raise HTTPException(status_code=400, detail="Student ID already exists")
    student = models.StudentMaster(**req.dict())
    db.add(student)
    db.commit()
    db.refresh(student)
    return student

@app.delete("/students/{student_id}")
def delete_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(models.StudentMaster).filter_by(student_id=student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    regs = db.query(models.CourseRegistration).filter_by(student_id=student_id).all()
    for r in regs:
        course = db.query(models.CourseMaster).filter_by(
            course_code=r.course_code, 
            semester=r.semester,
            department_code=student.department_code
        ).first()
        if course and course.enrolled_students and course.enrolled_students > 0:
            course.enrolled_students -= 1
        db.delete(r)
        
    db.delete(student)
    db.commit()
    return {"status": "success", "student_id": student_id}

# ============================================
# PERSONALIZED TIMETABLES
# ============================================

@app.get("/timetable/faculty/{faculty_id}", response_model=schemas.PersonalTimetableResponse)
def get_faculty_timetable(faculty_id: str, db: Session = Depends(get_db)):
    entries = db.query(models.TimetableEntry).filter_by(faculty_id=faculty_id).all()
    
    slot_map = {}
    conflicts = set()
    for e in entries:
        key = (e.day_of_week, e.period_number)
        if key not in slot_map:
            slot_map[key] = [e]
        else:
            slot_map[key].append(e)

    for key, items in slot_map.items():
        if len(items) > 1:
            venues = set(i.venue_name for i in items if i.venue_name)
            if len(venues) > 1:
                courses_str = " & ".join([f"{i.course_code} ({i.venue_name})" for i in items])
                conflicts.add(f"Conflict on {key[0]} Period {key[1]}: Scheduled simultaneously in different venues across {courses_str}")

    return {"conflicts": list(conflicts), "timetable": entries}


@app.get("/timetable/student/{student_id}", response_model=schemas.PersonalTimetableResponse)
def get_student_timetable(student_id: str, db: Session = Depends(get_db)):
    student = db.query(models.StudentMaster).filter_by(student_id=student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    regs = db.query(models.CourseRegistration).filter_by(student_id=student_id).all()
    
    valid_entries = {}
    student_semester = None
    for r in regs:
        if student_semester is None:
            student_semester = r.semester
        c_entries = db.query(models.TimetableEntry).filter_by(course_code=r.course_code, semester=r.semester).all()
        for e in c_entries:
            # Display section 1 as the default schedule for students
            if e.section_number == 1 or e.section_number is None:
                k = (e.course_code, e.day_of_week, e.period_number)
                if k not in valid_entries:
                    valid_entries[k] = e
                    
    # Also fetch common courses that are natively meant for this student's department/semester
    # but don't explicitly require personal registration (e.g. Mentor Hour, Mini Project)
    if student_semester is not None:
        common_courses = ['mentor', 'mini']
        for e in db.query(models.TimetableEntry).filter_by(
            department_code=student.department_code, 
            semester=student_semester
        ).all():
            if e.course_name and e.course_code and any(c in e.course_name.lower() or c in e.course_code.lower() for c in common_courses):
                if e.section_number == 1 or e.section_number is None:
                    k = (e.course_code, e.day_of_week, e.period_number)
                    if k not in valid_entries:
                        valid_entries[k] = e

    entries = list(valid_entries.values())
    
    slot_map = {}
    conflicts = set()
    for e in entries:
        key = (e.day_of_week, e.period_number)
        if key not in slot_map:
            slot_map[key] = [e]
        else:
            slot_map[key].append(e)
            
    for key, items in slot_map.items():
        if len(items) > 1:
            course_codes = set(i.course_code for i in items)
            if len(course_codes) > 1:
                courses_str = " & ".join(course_codes)
                conflicts.add(f"Conflict on {key[0]} Period {key[1]}: Student is registered for colliding courses: {courses_str}")

    return {"conflicts": list(conflicts), "timetable": entries}


# ============================================
# CONFLICT CHECK (Cross-Department)
# ============================================

@app.post("/check-conflicts")
def check_conflicts(request: schemas.ConflictCheckRequest, db: Session = Depends(get_db)):
    """
    Check if any faculty or venue in the given entries is already occupied
    by another department/semester at the same day+period.
    Returns a list of conflict details.
    """
    faculty_conflicts = []
    venue_conflicts = []
    
    for entry in request.entries:
        day = entry.day_of_week
        period = entry.period_number
        
        # Check faculty conflicts
        if entry.faculty_name and entry.faculty_name.strip() and entry.faculty_name not in ('', 'Unassigned'):
            busy = db.query(models.TimetableEntry).filter(
                models.TimetableEntry.day_of_week == day,
                models.TimetableEntry.period_number == period,
                models.TimetableEntry.faculty_name == entry.faculty_name,
                # Exclude entries from the SAME dept+sem (those are being replaced)
                ~(
                    (models.TimetableEntry.department_code == request.department_code) &
                    (models.TimetableEntry.semester == request.semester)
                )
            ).all()
            
            for b in busy:
                conflict_msg = f"{entry.faculty_name} is occupied by {b.department_code} Sem {b.semester} ({b.course_code}) at {day} Period {period}"
                if conflict_msg not in [c['message'] for c in faculty_conflicts]:
                    faculty_conflicts.append({
                        "type": "faculty",
                        "name": entry.faculty_name,
                        "day": day,
                        "period": period,
                        "occupied_by_dept": b.department_code,
                        "occupied_by_sem": b.semester,
                        "occupied_by_course": b.course_code,
                        "message": conflict_msg
                    })
        
        # Check venue conflicts
        if entry.venue_name and entry.venue_name.strip():
            busy = db.query(models.TimetableEntry).filter(
                models.TimetableEntry.day_of_week == day,
                models.TimetableEntry.period_number == period,
                models.TimetableEntry.venue_name == entry.venue_name,
                ~(
                    (models.TimetableEntry.department_code == request.department_code) &
                    (models.TimetableEntry.semester == request.semester)
                )
            ).all()
            
            for b in busy:
                conflict_msg = f"{entry.venue_name} is occupied by {b.department_code} Sem {b.semester} ({b.course_code}) at {day} Period {period}"
                if conflict_msg not in [c['message'] for c in venue_conflicts]:
                    venue_conflicts.append({
                        "type": "venue",
                        "name": entry.venue_name,
                        "day": day,
                        "period": period,
                        "occupied_by_dept": b.department_code,
                        "occupied_by_sem": b.semester,
                        "occupied_by_course": b.course_code,
                        "message": conflict_msg
                    })
    
    return {
        "has_conflicts": len(faculty_conflicts) > 0 or len(venue_conflicts) > 0,
        "faculty_conflicts": faculty_conflicts,
        "venue_conflicts": venue_conflicts
    }


# ============================================
# SCHEDULER CONFIG (Constraint Management)
# ============================================
import json

DEFAULT_CONFIG = {
    "hard_constraints": {
        "max_courses_per_slot": {
            "value": 1, "enabled": True, "type": "number",
            "label": "Max Courses Per Slot",
            "description": "Maximum number of different courses allowed in a single time slot"
        },
        "lab_block_starts": {
            "value": [1, 3, 5], "enabled": True, "type": "array",
            "label": "Lab Block Start Periods",
            "description": "Periods where 2-period lab blocks can begin (e.g., P1-P2, P3-P4, P5-P6)"
        },
        "max_lab_blocks_per_day": {
            "value": 1, "enabled": True, "type": "number",
            "label": "Max Lab Blocks Per Day",
            "description": "Maximum number of lab blocks (2-period) allowed across ALL courses in a single day"
        },
        "mentor_hour_blocked": {
            "value": True, "enabled": True, "type": "boolean",
            "label": "Block Mentor Hour",
            "description": "Prevent any regular course from being scheduled during the mentor interaction hour"
        },
        "no_faculty_clash": {
            "value": True, "enabled": True, "type": "boolean",
            "label": "No Faculty Clash",
            "description": "Same faculty cannot teach two different courses simultaneously"
        },
        "no_theory_in_own_lab": {
            "value": True, "enabled": True, "type": "boolean",
            "label": "No Theory in Own Lab Block",
            "description": "A course cannot have theory in the same period as its own lab block"
        }
    },
    "dynamic_constraints": {
        "max_theory_per_course_per_day": {
            "value": 1, "overloaded_value": 2, "enabled": True, "type": "number",
            "label": "Max Theory/Course/Day",
            "description": "Maximum theory periods for the same course in a single day (normal mode)"
        },
        "max_theory_per_course_per_day_overloaded": {
            "value": 2, "enabled": True, "type": "number",
            "label": "Max Theory/Course/Day (Overloaded)",
            "description": "Maximum theory periods per course per day when schedule is overloaded"
        },
        "no_back_to_back_theory": {
            "value": True, "enabled": True, "type": "boolean",
            "label": "No Back-to-Back Theory",
            "description": "Prevent consecutive theory periods of the same course (relaxed when overloaded)"
        },
        "p8_honours_only": {
            "value": True, "enabled": True, "type": "boolean",
            "label": "Period 8 for Honours Only",
            "description": "Reserve Period 8 exclusively for Honours/Minor courses (opens for regular if no honours)"
        }
    },
    "soft_constraints": {
        "non_consecutive_lab_days_penalty": {
            "value": -5, "enabled": True, "type": "number",
            "label": "Consecutive Lab Days Penalty",
            "description": "Penalty applied when lab blocks are scheduled on consecutive days (negative = penalty)"
        },
        "theory_lab_same_day_bonus": {
            "value": 3, "enabled": True, "type": "number",
            "label": "Theory+Lab Same Day Bonus",
            "description": "Bonus for scheduling theory on the same day as its lab session"
        },
        "fill_slots_bonus": {
            "value": 10, "enabled": True, "type": "number",
            "label": "Filled Slot Bonus",
            "description": "Bonus per slot that gets filled (maximizes slot utilization)"
        }
    },
    "section_settings": {
        "min_section_threshold": {
            "value": 30, "enabled": True, "type": "number",
            "label": "Min Students for Extra Section",
            "description": "Minimum number of remaining students needed to create an additional section"
        },
        "default_venue_capacity": {
            "value": 60, "enabled": True, "type": "number",
            "label": "Default Venue Capacity",
            "description": "Default seating capacity used when a venue has no capacity specified"
        }
    },
    "gap_fill": {
        "mini_project_max_periods": {
            "value": 4, "enabled": True, "type": "number",
            "label": "Mini Project Max Periods/Week",
            "description": "Maximum periods per week allocated for mini projects during gap filling"
        },
        "core_extra_max_per_week": {
            "value": 3, "enabled": True, "type": "number",
            "label": "Core Extra Sessions/Week",
            "description": "Maximum extra gap-fill sessions per core course per week"
        },
        "core_extra_max_per_day": {
            "value": 2, "enabled": True, "type": "number",
            "label": "Core Extra Sessions/Day",
            "description": "Maximum extra gap-fill sessions per core course per day"
        },
        "open_elective_periods": {
            "value": 3, "enabled": True, "type": "number",
            "label": "Open Elective Periods (Sem 5)",
            "description": "Number of periods injected for open electives in Semester 5"
        }
    },
    "batch_rotation": {
        "enabled": {
            "value": True, "enabled": True, "type": "boolean",
            "label": "Enable Lab Batch Rotation",
            "description": "Automatically merge and rotate lab batches when there aren't enough unique lab faculty"
        },
        "venue_aware_rotation": {
            "value": True, "enabled": True, "type": "boolean",
            "label": "Venue-Aware Batch Rotation",
            "description": "Also trigger batch rotation when mapped lab venues are fewer than required sections"
        },
        "max_merged_entries": {
            "value": 15, "enabled": True, "type": "number",
            "label": "Max Merged Entries Per Slot",
            "description": "Maximum number of entries allowed in a single merged lab slot"
        }
    },
    "elective_handling": {
        "pair_same_category": {
            "value": True, "enabled": True, "type": "boolean",
            "label": "Pair Same-Category Electives",
            "description": "Group electives with the same course_category into the same time slot"
        },
        "skip_no_faculty_lang": {
            "value": True, "enabled": True, "type": "boolean",
            "label": "Skip Language Electives Without Faculty",
            "description": "Automatically skip language elective courses that have no faculty mapped"
        }
    },
    "honours_minor": {
        "slot_restriction": {
            "value": 8, "enabled": True, "type": "number",
            "label": "Honours/Minor Period",
            "description": "Period number exclusively used for honours and minor courses"
        }
    }
}


@app.get("/api/config")
def get_scheduler_config(db: Session = Depends(get_db)):
    row = db.query(models.SchedulerConfig).filter_by(id=1).first()
    if not row:
        # Create defaults
        row = models.SchedulerConfig(id=1, config_json=json.dumps(DEFAULT_CONFIG))
        db.add(row)
        db.commit()
        db.refresh(row)
    return json.loads(row.config_json)


@app.put("/api/config")
def update_scheduler_config(config: dict, db: Session = Depends(get_db)):
    row = db.query(models.SchedulerConfig).filter_by(id=1).first()
    if not row:
        row = models.SchedulerConfig(id=1, config_json=json.dumps(config))
        db.add(row)
    else:
        row.config_json = json.dumps(config)
    db.commit()
    return {"status": "saved"}


@app.post("/api/config/reset")
def reset_scheduler_config(db: Session = Depends(get_db)):
    row = db.query(models.SchedulerConfig).filter_by(id=1).first()
    if row:
        row.config_json = json.dumps(DEFAULT_CONFIG)
    else:
        row = models.SchedulerConfig(id=1, config_json=json.dumps(DEFAULT_CONFIG))
        db.add(row)
    db.commit()
    return json.loads(row.config_json)


# ============================================
# COMMON COURSES
# ============================================

@app.get("/common-courses")
def get_common_courses(db: Session = Depends(get_db)):
    """Return all common course groups as a list of {course_code, semester, departments}."""
    rows = db.query(models.CommonCourseMap).all()
    # Group by course_code + semester
    groups: dict = {}
    for row in rows:
        key = (row.course_code, row.semester)
        if key not in groups:
            groups[key] = {"course_code": row.course_code, "semester": row.semester, "departments": []}
        groups[key]["departments"].append(row.department_code)
    return list(groups.values())


class CommonCourseRequest(BaseModel):
    course_code: str
    semester: int
    department_codes: List[str]

@app.post("/common-courses")
def save_common_course(req: CommonCourseRequest, db: Session = Depends(get_db)):
    """Create or replace the department list for a common course group."""
    # Delete existing entries for this course+semester
    db.query(models.CommonCourseMap).filter_by(
        course_code=req.course_code, semester=req.semester
    ).delete()
    # Insert new entries
    for dept in req.department_codes:
        db.add(models.CommonCourseMap(
            course_code=req.course_code,
            semester=req.semester,
            department_code=dept
        ))
    db.commit()
    return {"status": "saved", "course_code": req.course_code, "semester": req.semester}


@app.delete("/common-courses/{course_code:path}/{semester}")
def delete_common_course(course_code: str, semester: int, db: Session = Depends(get_db)):
    """Remove all department mappings for a common course."""
    deleted = db.query(models.CommonCourseMap).filter_by(
        course_code=course_code, semester=semester
    ).delete()
    db.commit()
    return {"status": "deleted", "rows": deleted}


# ============================================
# USER-DEFINED CONSTRAINTS
# ============================================
import uuid as uuid_lib
from datetime import datetime

def _constraint_to_response(row: models.UserConstraint) -> dict:
    """Convert a UserConstraint DB row to a response dict."""
    return {
        "id": row.id,
        "uuid": row.uuid,
        "name": row.name,
        "description": row.description,
        "enabled": row.enabled,
        "priority": row.priority,
        "soft_weight": row.soft_weight,
        "constraint_type": row.constraint_type,
        "scope": json.loads(row.scope_json),
        "target": json.loads(row.target_json),
        "rules": json.loads(row.rules_json),
        "created_at": row.created_at,
        "updated_at": row.updated_at,
        "order_index": row.order_index,
    }


@app.get("/api/user-constraints")
def list_user_constraints(
    dept: Optional[str] = None,
    sem: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """List all user constraints, optionally filtered by scope (department/semester)."""
    rows = db.query(models.UserConstraint).order_by(
        models.UserConstraint.priority.desc(),
        models.UserConstraint.order_index
    ).all()

    results = []
    for row in rows:
        resp = _constraint_to_response(row)
        # Optional filtering by scope
        if dept or sem:
            scope = resp["scope"]
            scope_depts = scope.get("departments", ["*"])
            scope_sems = scope.get("semesters", ["*"])
            if dept and scope_depts != ["*"] and dept not in scope_depts:
                continue
            if sem is not None and scope_sems != ["*"] and sem not in scope_sems:
                continue
        results.append(resp)

    return results


@app.post("/api/user-constraints")
def create_user_constraint(
    data: schemas.UserConstraintCreate,
    db: Session = Depends(get_db)
):
    """Create a new user-defined constraint."""
    now = datetime.utcnow().isoformat()
    max_order = db.query(models.UserConstraint).count()

    row = models.UserConstraint(
        uuid=str(uuid_lib.uuid4()),
        name=data.name,
        description=data.description,
        enabled=data.enabled,
        priority=data.priority,
        soft_weight=data.soft_weight,
        constraint_type=data.constraint_type,
        scope_json=json.dumps(data.scope),
        target_json=json.dumps(data.target),
        rules_json=json.dumps(data.rules),
        created_at=now,
        updated_at=now,
        order_index=max_order,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _constraint_to_response(row)


@app.put("/api/user-constraints/{constraint_uuid}")
def update_user_constraint(
    constraint_uuid: str,
    data: schemas.UserConstraintUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing user-defined constraint."""
    row = db.query(models.UserConstraint).filter_by(uuid=constraint_uuid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Constraint not found")

    now = datetime.utcnow().isoformat()
    if data.name is not None:
        row.name = data.name
    if data.description is not None:
        row.description = data.description
    if data.enabled is not None:
        row.enabled = data.enabled
    if data.priority is not None:
        row.priority = data.priority
    if data.soft_weight is not None:
        row.soft_weight = data.soft_weight
    if data.constraint_type is not None:
        row.constraint_type = data.constraint_type
    if data.scope is not None:
        row.scope_json = json.dumps(data.scope)
    if data.target is not None:
        row.target_json = json.dumps(data.target)
    if data.rules is not None:
        row.rules_json = json.dumps(data.rules)
    row.updated_at = now

    db.commit()
    db.refresh(row)
    return _constraint_to_response(row)


@app.delete("/api/user-constraints/{constraint_uuid}")
def delete_user_constraint(
    constraint_uuid: str,
    db: Session = Depends(get_db)
):
    """Delete a user-defined constraint."""
    deleted = db.query(models.UserConstraint).filter_by(uuid=constraint_uuid).delete()
    if not deleted:
        raise HTTPException(status_code=404, detail="Constraint not found")
    db.commit()
    return {"status": "deleted", "uuid": constraint_uuid}


@app.patch("/api/user-constraints/{constraint_uuid}/toggle")
def toggle_user_constraint(
    constraint_uuid: str,
    db: Session = Depends(get_db)
):
    """Toggle the enabled status of a constraint."""
    row = db.query(models.UserConstraint).filter_by(uuid=constraint_uuid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Constraint not found")
    row.enabled = not row.enabled
    row.updated_at = datetime.utcnow().isoformat()
    db.commit()
    db.refresh(row)
    return _constraint_to_response(row)


@app.post("/api/user-constraints/reorder")
def reorder_user_constraints(
    data: schemas.UserConstraintReorderRequest,
    db: Session = Depends(get_db)
):
    """Update the display/processing order of constraints."""
    for idx, c_uuid in enumerate(data.order):
        row = db.query(models.UserConstraint).filter_by(uuid=c_uuid).first()
        if row:
            row.order_index = idx
    db.commit()
    return {"status": "reordered"}


@app.post("/api/user-constraints/validate")
def validate_user_constraint(
    data: schemas.UserConstraintCreate,
    db: Session = Depends(get_db)
):
    """Validate a constraint definition: check for obvious issues without running the solver."""
    warnings = []

    # Basic validation
    valid_types = ['COURSE_INJECTION', 'SLOT_BLOCKING', 'FACULTY_RULE',
                   'SPACING_RULE', 'DISTRIBUTION_RULE', 'CAPACITY_RULE', 'CUSTOM_PLACEMENT']
    if data.constraint_type not in valid_types:
        warnings.append(f"Unknown constraint type: {data.constraint_type}")

    valid_priorities = ['HARD', 'SOFT', 'PREFERENCE']
    if data.priority not in valid_priorities:
        warnings.append(f"Unknown priority: {data.priority}")

    # Scope validation
    scope = data.scope or {}
    scope_depts = scope.get("departments", ["*"])
    if scope_depts != ["*"]:
        for dept in scope_depts:
            if not db.query(models.DepartmentMaster).filter_by(department_code=dept).first():
                warnings.append(f"Department '{dept}' not found")

    # Target validation
    target = data.target or {}
    if target.get("type") == "COURSE" and target.get("course_code"):
        if not target.get("create_if_missing"):
            exists = db.query(models.CourseMaster).filter_by(
                course_code=target["course_code"]
            ).first()
            if not exists:
                warnings.append(f"Course '{target['course_code']}' not found. Enable 'create_if_missing' to auto-create.")

    if target.get("type") == "FACULTY" and target.get("faculty_id"):
        exists = db.query(models.FacultyMaster).filter_by(
            faculty_id=target["faculty_id"]
        ).first()
        if not exists:
            warnings.append(f"Faculty '{target['faculty_id']}' not found")

    # Rules validation
    rules = data.rules or {}
    sessions = rules.get("sessions_per_week", {})
    if sessions:
        min_s = sessions.get("min", 0)
        max_s = sessions.get("max", 99)
        exact = sessions.get("exact")
        if exact and exact > 7 * 8:  # 7 days * 8 periods max
            warnings.append(f"Requested {exact} sessions/week exceeds maximum possible slots")
        if min_s > max_s:
            warnings.append(f"sessions_per_week min ({min_s}) > max ({max_s})")

    # Visual slots validation
    visual_slots = rules.get("visual_slots", [])
    if visual_slots:
        for vs in visual_slots:
            slot = db.query(models.SlotMaster).filter_by(
                day_of_week=vs.get("day"),
                period_number=vs.get("period")
            ).first()
            if not slot:
                warnings.append(f"Slot {vs.get('day')} P{vs.get('period')} does not exist")

    return {
        "valid": len(warnings) == 0,
        "warnings": warnings
    }

