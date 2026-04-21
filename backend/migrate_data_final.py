import sqlite3
from collections import defaultdict

def migrate_data():
    cms_db_path = 'C:/Users/kalai/Downloads/time table/database/cms_local.db'
    scheduler_db_path = 'C:/Users/kalai/Downloads/time table/database/college_scheduler.db'

    # Connect strictly to the target db to avoid manual fetch/insert loops for full tables
    con = sqlite3.connect(scheduler_db_path)
    cur = con.cursor()

    # Enable foreign keys just in case, though PRAGMA foreign_keys = ON is not strictly necessary for this operation
    cur.execute(f"ATTACH DATABASE '{cms_db_path.replace(chr(92), '/')}' AS cms")
    
    # Revert to dual-connection approach to avoid ATTACH pathing issues
    con_cms = sqlite3.connect(cms_db_path)
    print("DEBUG: Connected to", cms_db_path)
    print("DEBUG: Tables in cms:", con_cms.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall())
    cur_cms = con_cms.cursor()

    # 1. Direct Table Copy (No Processing)
    print("Copying tables: departments, learning_modes, academic_calendar as-is...")
    
    target_tables = [('departments', 'departments'), 
                     ('learning_modes', 'learning_modes'), 
                     ('academic_calendar', 'academic_calendar')]
    
    import pandas as pd
    for target_name, source_name in target_tables:
        print(f"  -> Copying {source_name} to {target_name}...")
        cur.execute(f"DROP TABLE IF EXISTS {target_name}")
        df = pd.read_sql_query(f"SELECT * FROM {source_name}", con_cms)
        df.to_sql(target_name, con, if_exists='replace', index=False)
        print(f"     Copied {len(df)} rows.")

    # 2. Determine Semester 4 dynamically from the newly copied academic_calendar
    print("Determining Semester 4 logic based on academic_calendar...")
    sem_4_record = cur.execute("SELECT id FROM academic_calendar WHERE current_semester = 4").fetchone()
    if not sem_4_record:
        print("Error: Could not find semester 4 in academic_calendar.")
        return
    
    sem_4_id = sem_4_record[0]
    print(f"Found Semester 4 corresponds to year/calendar ID: {sem_4_id}")

    # Fetch corresponding students from CMS
    print("Fetching Semester 4 students...")
    q_students = """
        SELECT s.register_no, s.student_name, d.department_code, s.learning_mode_id, s.id as cms_student_id
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE s.year = ? AND s.status = 1
    """
    students_data = cur_cms.execute(q_students, (sem_4_id,)).fetchall()
    print(f"Found {len(students_data)} active semester 4 students.")

    # 3. Handle Course Code Mapping
    print("Building course mapping dictionary from existing scheduler structure...")
    q_sched_courses = "SELECT course_code FROM course_master"
    sched_courses = [row[0] for row in cur.execute(q_sched_courses).fetchall()]

    # Mapping logic for combined course codes (split by '/')
    course_map = {}
    for sc_code in sched_courses:
        parts = [p.strip() for p in sc_code.split('/')]
        for part in parts:
            course_map[part] = sc_code

    # Process and Map Students
    success_students = 0
    student_ids = []
    
    print("Populating student_master with extracted data...")
    for r_no, s_name, d_code, l_mode, cms_sid in students_data:
        if not r_no or not r_no.strip():
            continue
        try:
            cur.execute("""
                INSERT INTO student_master (student_id, name, email, department_code, learning_mode_id)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(student_id) DO UPDATE SET
                    name = excluded.name,
                    department_code = excluded.department_code,
                    learning_mode_id = excluded.learning_mode_id
            """, (r_no.strip(), s_name, "", d_code, l_mode))
            success_students += 1
            student_ids.append((cms_sid, r_no.strip()))
        except Exception as e:
            print(f"Failed inserting student {r_no}: {e}")

    # 4. Fetch and map course registrations dynamically
    print("Fetching and mapping course registrations for the filtered students...")
    q_registrations = """
        SELECT sc.student_id, c.course_code 
        FROM student_courses sc
        JOIN courses c ON sc.course_id = c.id
    """
    cms_reg_data = cur_cms.execute(q_registrations).fetchall()
    
    cms_regs_by_student = defaultdict(list)
    for sid, c_code in cms_reg_data:
        if c_code:
            cms_regs_by_student[sid].append(c_code.strip())

    success_regs = 0
    
    print("Populating course_registrations...")
    for cms_sid, r_no in student_ids:
        registered_courses = cms_regs_by_student.get(cms_sid, [])
        for cms_c_code in registered_courses:
            # Map code
            mapped_c_code = course_map.get(cms_c_code)
            
            if mapped_c_code:
                try:
                    cur.execute("""
                        INSERT INTO course_registrations (student_id, course_code, semester)
                        VALUES (?, ?, ?)
                        ON CONFLICT(student_id, course_code, semester) DO NOTHING
                    """, (r_no, mapped_c_code, 4))
                    success_regs += 1
                except Exception as e:
                    if "UNIQUE constraint failed" not in str(e):
                        pass

    con.commit()
    print(f"--- MIGRATION COMPLETED ---")
    print(f"Students Mapped/Upserted: {success_students}")
    print(f"Mapped Course Registrations Created: {success_regs}")

if __name__ == '__main__':
    migrate_data()
