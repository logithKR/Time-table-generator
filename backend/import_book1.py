import pandas as pd
import os
import sqlite3
from sqlalchemy.orm import Session
from database import engine, SessionLocal, Base
import models
import math

def import_book1_data():
    print("🚀 Starting Book1.xlsx Import...")
    
    # 0. Init DB ensuring all columns
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(base_dir)
    file_path = os.path.join(project_root, "orginals", "Book1.xlsx")
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return

    try:
        df = pd.read_excel(file_path)
    except Exception as e:
        print(f"❌ Failed to read Excel: {e}")
        return

    print(f"✅ Read {len(df)} rows from Book1.xlsx")

    # Metrics
    new_depts = 0
    new_faculties = 0
    new_courses = 0
    new_mappings = 0

    for idx, row in df.iterrows():
        dept_code = str(row.get('Dept.', '')).strip()
        sem_str = str(row.get('Semester', '')).strip()
        course_type = str(row.get('Course Type', '')).strip().upper()
        course_code = str(row.get('Course Code', '')).strip()
        course_name = str(row.get('Course Name', '')).strip()
        l_hrs = row.get('L', 0)
        t_hrs = row.get('T', 0)
        p_hrs = row.get('P', 0)
        c_credits = row.get('C', 0)
        fac_id = str(row.get('Faculty ID\n(ME1880)', '')).strip()
        fac_name = str(row.get('Faculty Name', '')).strip()

        # Clean NaNs
        if pd.isna(row.get('Dept.')) or not course_code or pd.isna(row.get('Course Code')):
            continue
            
        l_hrs = int(l_hrs) if pd.notna(l_hrs) else 0
        t_hrs = int(t_hrs) if pd.notna(t_hrs) else 0
        p_hrs = int(p_hrs) if pd.notna(p_hrs) else 0
        c_credits = int(c_credits) if pd.notna(c_credits) else 0

        # Parse semester (e.g. S4 -> 4)
        sem = 1
        if sem_str and sem_str[0] == 'S' and sem_str[1:].isdigit():
            sem = int(sem_str[1:])
        elif sem_str.isdigit():
            sem = int(sem_str)

        # 1. Department
        dept = db.query(models.DepartmentMaster).filter_by(department_code=dept_code).first()
        if not dept:
            dept = models.DepartmentMaster(department_code=dept_code)
            db.add(dept)
            db.commit()
            new_depts += 1

        # 2. Faculty (If provided)
        has_faculty = False
        if fac_id and fac_id.lower() != 'nan' and fac_id.lower() != 'none':
            has_faculty = True
            fac = db.query(models.FacultyMaster).filter_by(faculty_id=fac_id).first()
            if not fac:
                fac = models.FacultyMaster(
                    faculty_id=fac_id,
                    faculty_name=fac_name if (fac_name and fac_name.lower() != 'nan') else fac_id,
                    department_code=dept_code
                )
                db.add(fac)
                db.commit()
                new_faculties += 1

        # 3. Course
        # Calculate weekly sessions
        is_lab = 'LAB' in course_type or 'LAB' in course_name.upper() or ('THEORY' not in course_type and p_hrs > 0)
        theory_hrs = l_hrs + t_hrs + (1 if p_hrs % 2 == 1 else 0)
        lab_blocks = p_hrs // 2
        weekly_sessions = theory_hrs + lab_blocks * 2
        
        # If no hours defined but it's a project or similar
        if weekly_sessions == 0:
            weekly_sessions = 1 # Fallback
            
        is_honours = 'HONOURS' in course_type
        is_minor = 'MINOR' in course_type
        is_elective = 'ELECTIVE' in course_type
        is_open_elective = 'OPEN ELECTIVE' in course_type
        is_add_course = 'ADD COURSE' in course_type

        course = db.query(models.CourseMaster).filter_by(course_code=course_code).first()
        if not course:
            course = models.CourseMaster(
                course_code=course_code,
                course_name=course_name,
                department_code=dept_code,
                semester=sem,
                course_category=course_type,
                delivery_type="Theory" if theory_hrs > 0 else "Lab",
                lecture_hours=l_hrs,
                tutorial_hours=t_hrs,
                practical_hours=p_hrs,
                weekly_sessions=weekly_sessions,
                credits=c_credits,
                is_lab=is_lab,
                is_honours=is_honours,
                is_minor=is_minor,
                is_elective=is_elective,
                is_open_elective=is_open_elective,
                is_add_course=is_add_course
            )
            db.add(course)
            db.commit()
            new_courses += 1
        else:
            # Update course type flags safely just in case it was imported before without flags
            course.is_add_course = is_add_course
            course.is_honours = is_honours
            course.is_minor = is_minor
            course.is_elective = is_elective
            db.commit()

        # 4. Course Faculty Map (Only if faculty provided)
        if has_faculty:
            mapping = db.query(models.CourseFacultyMap).filter_by(
                course_code=course_code, faculty_id=fac_id
            ).first()
            if not mapping:
                mapping = models.CourseFacultyMap(
                    course_code=course_code,
                    faculty_id=fac_id,
                    department_code=dept_code,
                    delivery_type=course.delivery_type
                )
                db.add(mapping)
                db.commit()
                new_mappings += 1

    print(f"🎉 Import Complete!")
    print(f"  🏢 New Depts: {new_depts}")
    print(f"  👨‍🏫 New Faculties: {new_faculties}")
    print(f"  📚 New Courses: {new_courses}")
    print(f"  🔗 New Mappings: {new_mappings}")

if __name__ == "__main__":
    import_book1_data()
