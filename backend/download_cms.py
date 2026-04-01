import pymysql
import pandas as pd
import os

DB_CONFIG = {
    "host": "10.150.20.153",
    "user": "aca_dev1",
    "password": "academics1",
    "port": 3306,
    "database": "cms"
}

QUERIES = {
    "academic_details": "SELECT batch, department, id, section, semester, student_id, student_status FROM cms.academic_details",
    "course_type": "SELECT id, course_type FROM cms.course_type",
    "courses": "SELECT category, course_code, course_name, course_type, credit, id, lecture_hrs, practical_hrs, status, tutorial_hrs FROM cms.courses",
    "curriculum_courses": "SELECT course_id, curriculum_id, id, semester_id FROM cms.curriculum_courses",
    "curriculum": "SELECT academic_year, id, name, status FROM cms.curriculum",
    "department_teachers": "SELECT department_id, id, role, status, teacher_id FROM cms.department_teachers",
    "departments": "SELECT * FROM cms.departments",
    "hod_elective_selections": "SELECT academic_year, batch, course_id, curriculum_id, department_id, id, semester, slot_name, status FROM cms.hod_elective_selections",
    "normal_cards": "SELECT card_type, curriculum_id, id, semester_number, status FROM cms.normal_cards",
    "students": "SELECT department_id, enrollment_no, id, status, student_name FROM cms.students",
    "teacher_course_history": "SELECT course_id, id, teacher_id FROM cms.teacher_course_history",
    "teachers": "SELECT dept, desg, email, faculty_id, id, name, status FROM cms.teachers"
}

def download_tables():
    output_dir = "cms_exports"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    print("Connecting to database...")
    connection = pymysql.connect(
        host=DB_CONFIG["host"],
        user=DB_CONFIG["user"],
        password=DB_CONFIG["password"],
        port=DB_CONFIG["port"],
        database=DB_CONFIG["database"]
    )
    
    try:
        total = len(QUERIES)
        for i, (table_name, query) in enumerate(QUERIES.items(), 1):
            print(f"[{i}/{total}] Downloading {table_name}...")
            df = pd.read_sql(query, connection)
            output_path = os.path.join(output_dir, f"{table_name}.csv")
            df.to_csv(output_path, index=False)
            print(f"  -> Saved {len(df)} rows to {output_path}")
            
        print("\n✅ All tables downloaded successfully!")
    except Exception as e:
        print(f"❌ Error occurred: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    download_tables()
