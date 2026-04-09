import pymysql
import pandas as pd
import sqlite3

SOURCE_DB_CONFIG = {
    "host": "10.150.20.153",
    "user": "aca_dev1",
    "password": "academics1",
    "port": 3306,
    "database": "cms"
}

LOCAL_DB_NAME = "cms_local.db"

QUERIES = {
    "academic_details": """SELECT batch, department, id, section, semester, student_id, student_status
                           FROM cms.academic_details""",
    "course_type": """SELECT id, course_type
                      FROM cms.course_type""",
    "courses": """SELECT category, course_code, course_name, course_type, credit, id, lecture_hrs, practical_hrs, status, tutorial_hrs
                  FROM cms.courses""",
    "curriculum_courses": """SELECT course_id, curriculum_id, id, semester_id
                             FROM cms.curriculum_courses""",
    "curriculum": """SELECT academic_year, id, name, status
                     FROM cms.curriculum""",
    "department_teachers": """SELECT department_id, id, role, status, teacher_id
                              FROM cms.department_teachers""",
    "departments": """SELECT *
                      FROM cms.departments""",
    "hod_elective_selections": """SELECT academic_year, batch, course_id, curriculum_id, department_id, id, semester, slot_name, status
                                  FROM cms.hod_elective_selections""",
    "normal_cards": """SELECT card_type, curriculum_id, id, semester_number, status
                       FROM cms.normal_cards""",
    "students": """SELECT id, student_name, enrollment_no, register_no, department_id, learning_mode_id, status, year
                   FROM cms.students""",
    "teacher_course_history": """SELECT course_id, id, teacher_id
                                 FROM cms.teacher_course_history""",
    "teachers": """SELECT dept, desg, email, faculty_id, id, name, status
                   FROM cms.teachers""",
    "student_elective_choices": """SELECT * FROM cms.student_elective_choices""",
    "student_courses": """SELECT * FROM cms.student_courses""",
    "learning_modes": """SELECT * FROM cms.learning_modes""",
    "academic_calendar": """SELECT * FROM cms.academic_calendar"""
}

def sync_databases():
    print(f"Connecting to source MySQL Database at {SOURCE_DB_CONFIG['host']}...")
    try:
        mysql_conn = pymysql.connect(
            host=SOURCE_DB_CONFIG['host'],
            user=SOURCE_DB_CONFIG['user'],
            password=SOURCE_DB_CONFIG['password'],
            port=SOURCE_DB_CONFIG['port'],
            database=SOURCE_DB_CONFIG['database']
        )
    except Exception as e:
        print(f"❌ Failed to connect to MySQL: {e}")
        return

    print(f"Connecting to local SQLite Database ({LOCAL_DB_NAME})...")
    sqlite_conn = sqlite3.connect(LOCAL_DB_NAME)

    try:
        total = len(QUERIES)
        for i, (table_name, query) in enumerate(QUERIES.items(), 1):
            print(f"[{i}/{total}] Syncing table: {table_name}...")
            
            # Fetch from MySQL
            df = pd.read_sql(query, mysql_conn)
            
            # Save to SQLite (replaces the table if it exists)
            df.to_sql(table_name, sqlite_conn, if_exists='replace', index=False)
            
            print(f"  -> Successfully imported {len(df)} rows to local DB.")
            
        print("\n✅ All tables synchronized successfully into local database!")
        
    except Exception as e:
        print(f"❌ Error occurred during sync: {e}")
    finally:
        mysql_conn.close()
        sqlite_conn.close()

if __name__ == "__main__":
    sync_databases()
