import pandas as pd
import os
from sqlalchemy.orm import Session
from database import engine, SessionLocal, Base
import models

def import_s246():
    print("Starting S2, S4, S6 UG Course Import from Book1.xlsx...")
    
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(base_dir)
    file_path = os.path.join(project_root, "orginals", "Book1.xlsx")
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    try:
        df = pd.read_excel(file_path)
    except Exception as e:
        print(f"Failed to read Excel: {e}")
        return
        
    # We only want exact 'S2', 'S4', 'S6' (excludes 'S2-PG', 'S4-PG', 'PG')
    target_sems = ['S2', 'S4', 'S6']
    
    # Clean semester column
    df['Semester_Clean'] = df['Semester'].astype(str).str.strip().str.upper()
    df_filtered = df[df['Semester_Clean'].isin(target_sems)].copy()
    
    # Filter credits > 0
    df_filtered['C'] = pd.to_numeric(df_filtered['C'], errors='coerce').fillna(0)
    df_filtered = df_filtered[df_filtered['C'] > 0]
    
    # Filter explicitly blank L, T, P
    df_filtered = df_filtered.dropna(subset=['L', 'T', 'P'])
    df_filtered = df_filtered[
        (df_filtered['L'].astype(str).str.strip() != '') &
        (df_filtered['T'].astype(str).str.strip() != '') &
        (df_filtered['P'].astype(str).str.strip() != '')
    ]
    
    print(f"Found {len(df_filtered)} matching UG courses for S2, S4, S6 with credits > 0 and populated L/T/P.")
    
    metrics = {
        'depts': 0,
        'faculties': 0,
        'courses_upserted': 0,
        'mappings': 0
    }

    for idx, row in df_filtered.iterrows():
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

        if pd.isna(row.get('Dept.')) or not course_code or pd.isna(row.get('Course Code')):
            continue
            
        l_hrs = int(l_hrs) if pd.notna(l_hrs) else 0
        t_hrs = int(t_hrs) if pd.notna(t_hrs) else 0
        p_hrs = int(p_hrs) if pd.notna(p_hrs) else 0
        c_credits = int(c_credits) if pd.notna(c_credits) else 0
        
        # Numeric semester
        sem = int(sem_str.replace('S', ''))

        # 1. Ensure Dept exists
        dept = db.query(models.DepartmentMaster).filter_by(department_code=dept_code).first()
        if not dept:
            dept = models.DepartmentMaster(department_code=dept_code)
            db.add(dept)
            db.flush()
            metrics['depts'] += 1

        # 2. Ensure Faculty exists (if provided)
        has_fac = False
        if fac_id and fac_id.lower() not in ['nan', 'none', '']:
            has_fac = True
            fac = db.query(models.FacultyMaster).filter_by(faculty_id=fac_id).first()
            if not fac:
                fac = models.FacultyMaster(
                    faculty_id=fac_id,
                    faculty_name=fac_name if (fac_name and fac_name.lower() != 'nan') else fac_id,
                    department_code=dept_code
                )
                db.add(fac)
                db.flush()
                metrics['faculties'] += 1

        # Calculate logical hours
        theory_hrs = l_hrs + t_hrs + (1 if p_hrs % 2 == 1 else 0)
        lab_blocks = p_hrs // 2
        weekly_sessions = theory_hrs + lab_blocks * 2
        if weekly_sessions == 0:
            weekly_sessions = 1

        is_honours = 'HONOURS' in course_type or 'HONORS' in course_type
        is_minor = 'MINOR' in course_type
        is_open_elective = 'OPEN ELECTIVE' in course_type
        is_elective = 'ELECTIVE' in course_type and not is_open_elective

        # 3. Upsert Course globally
        course = db.query(models.CourseMaster).filter_by(
            course_code=course_code, department_code=dept_code, semester=sem
        ).first()
        
        if not course:
            course = models.CourseMaster(
                course_code=course_code,
                department_code=dept_code,
                semester=sem,
                course_name=course_name,
                course_category=course_type,
                lecture_hours=l_hrs,
                tutorial_hours=t_hrs,
                practical_hours=p_hrs,
                credits=c_credits,
                weekly_sessions=weekly_sessions,
                is_honours=is_honours,
                is_minor=is_minor,
                is_elective=is_elective,
                is_open_elective=is_open_elective,
                is_add_course=False # Regular import
            )
            db.add(course)
            metrics['courses_upserted'] += 1
        else:
            # Update values if it already exists
            course.course_name = course_name
            course.credits = c_credits
            course.weekly_sessions = weekly_sessions
            metrics['courses_upserted'] += 1
            
        try:
            db.flush()
        except BaseException as e:
            print(f"Database error on {course_code}: {e}")
            db.rollback()
            continue

        # 4. Upsert Faculty Mapping safely
        if has_fac:
            mapping = db.query(models.CourseFacultyMap).filter_by(
                course_code=course_code, faculty_id=fac_id, department_code=dept_code
            ).first()
            if not mapping:
                m = models.CourseFacultyMap(
                    course_code=course_code,
                    faculty_id=fac_id,
                    department_code=dept_code,
                    delivery_type='OFFLINE'
                )
                db.add(m)
                metrics['mappings'] += 1

    db.commit()
    print("Import Finished Successfully!")
    print(f"Stats: {metrics['depts']} new depts, {metrics['faculties']} new faculties, {metrics['courses_upserted']} courses upserted, {metrics['mappings']} mappings created.")

if __name__ == '__main__':
    import_s246()
