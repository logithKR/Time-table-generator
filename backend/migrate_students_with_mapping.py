import sqlite3
from collections import defaultdict

def migrate_data():
    cms_db_path = r'C:\Users\kalai\Downloads\time table\database\cms_local.db'
    scheduler_db_path = r'C:\Users\kalai\Downloads\time table\database\college_scheduler.db'

    con_cms = sqlite3.connect(cms_db_path)
    cur_cms = con_cms.cursor()

    con_sched = sqlite3.connect(scheduler_db_path)
    cur_sched = con_sched.cursor()

    print("Fetching Semester 4 students from cms_local...")
    q_students = """
        SELECT s.register_no, s.student_name, d.department_code, s.learning_mode_id, s.id as cms_student_id
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE s.year = 1.0 AND s.status = 1
    """
    students_data = cur_cms.execute(q_students).fetchall()
    print(f"Found {len(students_data)} active semester 4 students.")

    print("Fetching course master from scheduler...")
    q_sched_courses = "SELECT course_code FROM course_master"
    sched_courses = [row[0] for row in cur_sched.execute(q_sched_courses).fetchall()]

    # Mapping logic for combined course codes
    course_map = {}
    for sc_code in sched_courses:
        parts = [p.strip() for p in sc_code.split('/')]
        for part in parts:
            course_map[part] = sc_code

    success_students = 0
    student_ids = []
    
    print("Upserting students to student_master...")
    for r_no, s_name, d_code, l_mode, cms_sid in students_data:
        if not r_no or not r_no.strip():
            continue
        try:
            # Upsert
            cur_sched.execute("""
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

    print("Fetching course registrations from cms_local...")
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
    missing_maps = set()
    
    print("Inserting mapped course registrations for semester 4...")
    for cms_sid, r_no in student_ids:
        registered_courses = cms_regs_by_student.get(cms_sid, [])
        for cms_c_code in registered_courses:
            # Match code
            mapped_c_code = course_map.get(cms_c_code)
            
            if mapped_c_code:
                try:
                    cur_sched.execute("""
                        INSERT INTO course_registrations (student_id, course_code, semester)
                        VALUES (?, ?, ?)
                        ON CONFLICT(student_id, course_code, semester) DO NOTHING
                    """, (r_no, mapped_c_code, 4))
                    success_regs += 1
                except Exception as e:
                    # Ignore duplicate ignores if ON CONFLICT DO NOTHING isn't supported, 
                    # but it is supported in modern SQLite.
                    if "UNIQUE constraint failed" not in str(e):
                        print(f"Registration error for {r_no} - {mapped_c_code}: {e}")
            else:
                missing_maps.add(cms_c_code)

    con_sched.commit()
    print(f"--- MIGRATION COMPLETED ---")
    print(f"Students Upserted: {success_students}")
    print(f"Course Registrations Created: {success_regs}")
    if missing_maps:
        print(f"Note: Some CMS courses couldn't be matched in scheduler's course_master (Total {len(missing_maps)} unmapped courses).")

if __name__ == '__main__':
    migrate_data()
