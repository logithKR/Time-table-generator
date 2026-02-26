import pandas as pd
import math
from database import SessionLocal
import models
import os
import re

DB_SESSION = SessionLocal()

S4_EXCEL = r"C:\Users\kalai\Downloads\time table\orginals\OVERALL COURSE REGISTRATION - S4 - UPDATED - 20.01.2026.xlsx"
S6_EXCEL = r"C:\Users\kalai\Downloads\time table\orginals\Overall Course Registration - 2025 - 2026 EVEN S6.xlsx"

def extract_course_code(raw_text):
    if pd.isna(raw_text):
        return None
    # e.g., "22AG040-TECHNOLOGY OF SEED PROCESSING" -> "22AG040"
    match = re.match(r"^([A-Z0-9]+)", str(raw_text).strip())
    if match:
        return match.group(1).upper()
    return None

def import_registrations():
    print("--- Starting Student Registrations Import ---")
    
    # 1. Processing S4
    print("\nProcessing S4 Enrollments...")
    if not os.path.exists(S4_EXCEL):
        print(f"Error: Could not find S4 Excel at {S4_EXCEL}")
    else:
        df_s4 = pd.read_excel(S4_EXCEL, sheet_name='Sujectwise - Course Registratio')
        process_sheet(df=df_s4, semester=4, course_col='Course Code')

    # 2. Processing S6
    print("\nProcessing S6 Enrollments...")
    if not os.path.exists(S6_EXCEL):
        print(f"Error: Could not find S6 Excel at {S6_EXCEL}")
    else:
        df_s6 = pd.read_excel(S6_EXCEL, sheet_name='Subjectwise-Details')
        process_sheet(df=df_s6, semester=6, course_col='Course Title')

    # 3. Computing enrolled_students on CourseMaster dynamically
    print("\nRecalculating CourseMaster.enrolled_students for all courses...")
    courses = DB_SESSION.query(models.CourseMaster).all()
    for course in courses:
        count = DB_SESSION.query(models.CourseRegistration).filter_by(
            course_code=course.course_code,
            semester=course.semester
        ).count()
        course.enrolled_students = count
    
    DB_SESSION.commit()
    print("Import Complete and Course Counts Updated!")


def process_sheet(df, semester, course_col):
    added_students = 0
    added_registrations = 0
    skipped = 0
    
    seen_students = set()
    seen_registrations = set()
    
    # Pre-load existing students into cache
    for s in DB_SESSION.query(models.StudentMaster).all():
        seen_students.add(s.student_id)
        
    for r in DB_SESSION.query(models.CourseRegistration).filter_by(semester=semester).all():
        seen_registrations.add((r.student_id, r.course_code))

    for idx, row in df.iterrows():
        student_id = str(row.get('Student ID', '')).strip()
        if not student_id or pd.isna(row.get('Student ID')):
            continue
            
        name = str(row.get('Name', '')).strip()
        email = str(row.get('Email', '')).strip()
        dept = str(row.get('Department', '')).strip()
        raw_course = row.get(course_col)
        
        course_code = extract_course_code(raw_course)
        
        if not course_code:
            skipped += 1
            continue

        # Upsert Student
        if student_id not in seen_students:
            # Ensure Dept exists
            dept_obj = DB_SESSION.query(models.DepartmentMaster).filter_by(department_code=dept).first()
            if not dept_obj:
                # Fallback context mapping
                dept_obj = models.DepartmentMaster(department_code=dept, student_count=0)
                DB_SESSION.add(dept_obj)
                DB_SESSION.commit()
                
            student = models.StudentMaster(
                student_id=student_id,
                name=name,
                email=email if email else None,
                department_code=dept
            )
            DB_SESSION.add(student)
            seen_students.add(student_id)
            added_students += 1

        # Double check Course exists
        course_obj = DB_SESSION.query(models.CourseMaster).filter_by(course_code=course_code, semester=semester).first()
        if not course_obj:
            skipped += 1
            print(f"  Warning: Attempted to add registration for missing course {course_code} in Sem {semester}. Skipping row.")
            continue

        # Add Registration
        if (student_id, course_code) not in seen_registrations:
            reg = models.CourseRegistration(
                student_id=student_id,
                course_code=course_code,
                semester=semester
            )
            DB_SESSION.add(reg)
            seen_registrations.add((student_id, course_code))
            added_registrations += 1
            
    DB_SESSION.commit()
    print(f"  -> Added {added_students} new Students.")
    print(f"  -> Added {added_registrations} new Registrations.")
    if skipped > 0:
        print(f"  -> Skipped {skipped} rows (missing course codes in DB or invalid formats).")


if __name__ == '__main__':
    # Need to make sure models are up to date in DB schema
    models.Base.metadata.create_all(bind=DB_SESSION.get_bind())
    import_registrations()
