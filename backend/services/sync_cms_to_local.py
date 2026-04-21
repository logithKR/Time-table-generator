"""
CMS Sync Service
----------------
1. Syncs data from the remote MySQL CMS database into the local cms_local.db.
2. After sync, migrates Semester 4 student data into college_scheduler.db.
   - student_master: upserts student_id, name, department_code, learning_mode_id
   - course_registrations: inserts mapped course registrations (sem=4)
   No other tables or rows in college_scheduler.db are touched.
"""

import sqlite3
import os
from collections import defaultdict

# ---------------------------------------------------------------------------
# Paths  — resolved relative to THIS file so they work regardless of CWD
# ---------------------------------------------------------------------------
_HERE = os.path.dirname(os.path.abspath(__file__))
_DB_DIR = os.path.normpath(os.path.join(_HERE, "..", "..", "database"))
CMS_LOCAL_DB  = os.path.join(_DB_DIR, "cms_local.db")
SCHEDULER_DB  = os.path.join(_DB_DIR, "college_scheduler.db")
USERS_DB      = os.path.join(_DB_DIR, "users.db")

# Env / settings for MySQL connection
from config.settings import settings

MYSQL_CONFIG = {
    "host":     settings.cms_db_host     or "",
    "user":     settings.cms_db_user     or "",
    "password": settings.cms_db_password or settings.cms_db_pass or "",
    "port":     settings.cms_db_port,
    "database": settings.cms_db_name,
}

# Tables to pull from MySQL → cms_local.db
SYNC_QUERIES = {
    "academic_details":       "SELECT batch, department, id, section, semester, student_id, student_status FROM academic_details",
    "course_type":            "SELECT id, course_type FROM course_type",
    "courses":                "SELECT category, course_code, course_name, course_type, credit, id, lecture_hrs, practical_hrs, status, tutorial_hrs FROM courses",
    "curriculum_courses":     "SELECT course_id, curriculum_id, id, semester_id FROM curriculum_courses",
    "curriculum":             "SELECT academic_year, id, name, status FROM curriculum",
    "department_teachers":    "SELECT department_id, id, role, status, teacher_id FROM department_teachers",
    "departments":            "SELECT * FROM departments",
    "hod_elective_selections":"SELECT academic_year, batch, course_id, curriculum_id, department_id, id, semester, slot_name, status FROM hod_elective_selections",
    "normal_cards":           "SELECT card_type, curriculum_id, id, semester_number, status FROM normal_cards",
    "students":               "SELECT id, student_name, enrollment_no, register_no, department_id, learning_mode_id, status, year FROM students",
    "teacher_course_history": "SELECT course_id, id, teacher_id FROM teacher_course_history",
    "teachers":               "SELECT dept, desg, email, faculty_id, id, name, status FROM teachers",
    "student_elective_choices":"SELECT * FROM student_elective_choices",
    "student_courses":        "SELECT * FROM student_courses",
    "learning_modes":         "SELECT * FROM learning_modes",
    "academic_calendar":      "SELECT * FROM academic_calendar",
}


# ============================================================
# PART 1: Sync MySQL → cms_local.db
# ============================================================

def _noop(level, message):
    """Default no-op emitter used when no callback is provided (falls back to print)."""
    print(f"[{level.upper()}] {message}")


# ============================================================
# PART 1: Sync MySQL → cms_local.db
# ============================================================

def _sync_mysql_to_local(emit) -> dict:
    try:
        import mysql.connector
    except ImportError:
        raise RuntimeError("mysql-connector-python is not installed. Run: pip install mysql-connector-python")

    emit("info", f"Connecting to MySQL at {MYSQL_CONFIG['host']}:{MYSQL_CONFIG['port']} ...")
    try:
        mysql_conn = mysql.connector.connect(**MYSQL_CONFIG)
        emit("success", "Connected to MySQL successfully.")
    except Exception as e:
        emit("error", f"Failed to connect to MySQL: {e}")
        raise

    mysql_cursor = mysql_conn.cursor(dictionary=True)
    sqlite_conn = sqlite3.connect(CMS_LOCAL_DB)
    summary = {"synced": [], "skipped": []}

    total = len(SYNC_QUERIES)
    for i, (table_name, query) in enumerate(SYNC_QUERIES.items(), 1):
        emit("info", f"[{i}/{total}] Syncing table: {table_name} ...")
        try:
            mysql_cursor.execute(query)
            rows = mysql_cursor.fetchall()

            if rows:
                columns = list(rows[0].keys())
            else:
                columns = [desc[0] for desc in mysql_cursor.description]

            sqlite_conn.execute(f"DROP TABLE IF EXISTS {table_name}")
            col_defs = ", ".join([f'"{c}" TEXT' for c in columns])
            sqlite_conn.execute(f"CREATE TABLE IF NOT EXISTS {table_name} ({col_defs})")

            if rows:
                placeholders = ",".join(["?" for _ in columns])
                sqlite_conn.executemany(
                    f"INSERT INTO {table_name} VALUES ({placeholders})",
                    [[row[c] for c in columns] for row in rows]
                )

            sqlite_conn.commit()
            emit("success", f"  {table_name}: {len(rows)} rows imported.")
            summary["synced"].append(table_name)

        except Exception as e:
            emit("warning", f"  Skipped {table_name}: {e}")
            summary["skipped"].append({"table": table_name, "reason": str(e)})

    mysql_cursor.close()
    mysql_conn.close()
    sqlite_conn.close()
    emit("success", f"MySQL sync done. {len(summary['synced'])} tables synced, {len(summary['skipped'])} skipped.")
    return summary


# ============================================================
# PART 2: Migrate Sem-4 students → college_scheduler.db
# ============================================================

def _migrate_sem4_students(emit) -> dict:
    emit("info", "Starting Semester 4 student migration into college_scheduler.db ...")

    con_cms   = sqlite3.connect(CMS_LOCAL_DB)
    con_sched = sqlite3.connect(SCHEDULER_DB)
    cur_cms   = con_cms.cursor()
    cur_sched = con_sched.cursor()

    summary = {"students_upserted": 0, "registrations_inserted": 0, "unmapped_courses": set()}

    sem4_row = cur_cms.execute(
        "SELECT id FROM academic_calendar WHERE current_semester = 4 LIMIT 1"
    ).fetchone()
    if not sem4_row:
        con_cms.close(); con_sched.close()
        raise RuntimeError("No row with current_semester=4 found in cms_local.db academic_calendar.")

    sem4_year_id = sem4_row[0]
    emit("info", f"Academic calendar: Semester 4 = year_id {sem4_year_id}")

    students = cur_cms.execute("""
        SELECT s.register_no, s.student_name, d.department_code, s.learning_mode_id, s.id
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE CAST(s.year AS INTEGER) = ? AND CAST(s.status AS INTEGER) = 1
    """, (sem4_year_id,)).fetchall()
    emit("info", f"Found {len(students)} active Semester 4 students.")

    # Build course-code map
    sched_course_codes = [
        row[0] for row in cur_sched.execute("SELECT course_code FROM course_master").fetchall()
    ]
    course_map = {}
    for sc_code in sched_course_codes:
        for part in [p.strip() for p in sc_code.split("/")]:
            course_map[part] = sc_code

    # Upsert students
    student_id_pairs = []
    for reg_no, s_name, dept_code, l_mode, cms_id in students:
        if not reg_no or not str(reg_no).strip():
            continue
        reg_no = str(reg_no).strip()
        try:
            cur_sched.execute("""
                INSERT INTO student_master (student_id, name, email, department_code, learning_mode_id)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(student_id) DO UPDATE SET
                    name             = excluded.name,
                    department_code  = excluded.department_code,
                    learning_mode_id = excluded.learning_mode_id
            """, (reg_no, s_name, "", dept_code, l_mode))
            summary["students_upserted"] += 1
            student_id_pairs.append((cms_id, reg_no))
        except Exception as e:
            emit("warning", f"Student upsert failed for {reg_no}: {e}")

    emit("info", f"Upserted {summary['students_upserted']} students into student_master.")

    # Fetch & map registrations
    emit("info", "Mapping course registrations ...")
    from collections import defaultdict
    cms_regs = cur_cms.execute("""
        SELECT sc.student_id, c.course_code
        FROM student_courses sc
        JOIN courses c ON sc.course_id = c.id
    """).fetchall()

    regs_by_cms_id = defaultdict(list)
    for cms_sid, c_code in cms_regs:
        if c_code:
            regs_by_cms_id[int(cms_sid)].append(str(c_code).strip())

    for cms_sid, reg_no in student_id_pairs:
        for cms_code in regs_by_cms_id.get(int(cms_sid), []):
            mapped = course_map.get(cms_code)
            if mapped:
                try:
                    cur_sched.execute("""
                        INSERT INTO course_registrations (student_id, course_code, semester)
                        VALUES (?, ?, 4)
                        ON CONFLICT(student_id, course_code, semester) DO NOTHING
                    """, (reg_no, mapped))
                    summary["registrations_inserted"] += 1
                except Exception as e:
                    if "UNIQUE constraint failed" not in str(e):
                        emit("warning", f"Registration error {reg_no}/{mapped}: {e}")
            else:
                summary["unmapped_courses"].add(cms_code)

    con_sched.commit()
    con_cms.close()
    con_sched.close()

    unmapped = list(summary["unmapped_courses"])
    emit("success", f"Students upserted: {summary['students_upserted']}, Registrations: {summary['registrations_inserted']}")
    if unmapped:
        emit("warning", f"{len(unmapped)} CMS course codes could not be mapped (e.g. {unmapped[:3]})")

    return {
        "students_upserted":      summary["students_upserted"],
        "registrations_inserted": summary["registrations_inserted"],
        "unmapped_courses":       unmapped,
    }


# ============================================================
# PART 3: Sync users table → users.db  (legacy behaviour)
# ============================================================

def _sync_users_db(emit) -> dict:
    try:
        import mysql.connector
    except ImportError:
        raise RuntimeError("mysql-connector-python is not installed.")

    emit("info", "Connecting to MySQL for users table ...")
    try:
        mysql_conn = mysql.connector.connect(**MYSQL_CONFIG)
        mysql_cursor = mysql_conn.cursor(dictionary=True)
        mysql_cursor.execute("SELECT id, username, email, role, is_active FROM users")
        remote_users = mysql_cursor.fetchall()
        mysql_cursor.close()
        mysql_conn.close()
        emit("success", f"Fetched {len(remote_users)} users from MySQL.")
    except Exception as e:
        emit("error", f"Could not fetch users from MySQL: {e}")
        return {"error": str(e)}

    sqlite_conn = sqlite3.connect(USERS_DB)
    cur = sqlite_conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT,
            email TEXT UNIQUE,
            role TEXT,
            is_active BOOLEAN
        )
    """)

    cur.execute("DELETE FROM users")
    for row in remote_users:
        cur.execute(
            "INSERT INTO users (id, username, email, role, is_active) VALUES (?, ?, ?, ?, ?)",
            (row["id"], row["username"], row["email"], row["role"], row["is_active"])
        )

    dev_records = [
        ("Ramesh (Dev)",  "ramesh.cd23@bitsathy.ac.in",      "teacher", True),
        ("Logith (Dev)",  "logithkumar.cd23@bitsathy.ac.in", "teacher", True),
    ]
    for idx, (uname, email, role, active) in enumerate(dev_records):
        cur.execute("SELECT id FROM users WHERE email = ?", (email,))
        existing = cur.fetchone()
        if existing:
            cur.execute("UPDATE users SET role=?, is_active=?, username=? WHERE email=?",
                        (role, active, uname, email))
        else:
            cur.execute("INSERT INTO users (id, username, email, role, is_active) VALUES (?, ?, ?, ?, ?)",
                        (-1 * (idx + 1), uname, email, role, active))

    sqlite_conn.commit()
    sqlite_conn.close()
    emit("success", f"users.db updated: {len(remote_users)} remote + {len(dev_records)} developer records.")
    return {"remote_users": len(remote_users), "dev_records_injected": len(dev_records)}


# ============================================================
# PART 4: Recalculate enrollment counts (per course & dept)
# ============================================================

def _recalculate_enrollment_counts(emit) -> dict:
    import json
    emit("info", "--- Step 4: Recalculating enrollment counts (including Learning Modes) ---")
    
    conn = sqlite3.connect(SCHEDULER_DB)
    cur = conn.cursor()
    
    # helper for defaultdict behavior in loop
    from collections import defaultdict
    
    # 1. Update CourseMaster counts
    emit("info", "Calculating per-course enrollment data ...")
    
    # Get all registrations with learning mode
    cur.execute("""
        SELECT r.course_code, r.semester, s.learning_mode_id, COUNT(*)
        FROM course_registrations r
        JOIN student_master s ON r.student_id = s.student_id
        GROUP BY r.course_code, r.semester, s.learning_mode_id
    """)
    course_reg_rows = cur.fetchall()
    
    # Organize data: (course, sem) -> { mode_id: count }
    course_data = defaultdict(dict)
    for c_code, sem, mode_id, count in course_reg_rows:
        course_data[(c_code, sem)][str(mode_id or 1)] = count
        
    for (c_code, sem), modes in course_data.items():
        total = sum(modes.values())
        modes_json = json.dumps(modes)
        cur.execute("""
            UPDATE course_master 
            SET enrolled_students = ?, enrollment_data = ?
            WHERE course_code = ? AND semester = ?
        """, (total, modes_json, c_code, sem))

    # 2. Update DepartmentSemesterCount counts
    emit("info", "Calculating per-department capacity data ...")
    
    # Get unique students per dept/sem with learning mode
    cur.execute("""
        SELECT s.department_code, r.semester, s.learning_mode_id, COUNT(DISTINCT r.student_id)
        FROM course_registrations r
        JOIN student_master s ON r.student_id = s.student_id
        GROUP BY s.department_code, r.semester, s.learning_mode_id
    """)
    dept_reg_rows = cur.fetchall()
    
    # Organize data: (dept, sem) -> { mode_id: count }
    dept_data = defaultdict(dict)
    for dept_code, sem, mode_id, count in dept_reg_rows:
        dept_data[(dept_code, sem)][str(mode_id or 1)] = count
        
    for (dept_code, sem), modes in dept_data.items():
        total = sum(modes.values())
        modes_json = json.dumps(modes)
        
        cur.execute("""
            INSERT INTO department_semester_count (department_code, semester, student_count, student_count_data)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(department_code, semester) DO UPDATE SET
                student_count = excluded.student_count,
                student_count_data = excluded.student_count_data
        """, (dept_code, sem, total, modes_json))
        
    conn.commit()
    conn.close()
    emit("success", f"Recalculation complete. Updated counts for {len(course_data)} courses and {len(dept_data)} dept/sem pairs.")
    return {"courses_recalculated": len(course_data), "dept_sem_recalculated": len(dept_data)}


# ============================================================
# PUBLIC ENTRY POINT
# ============================================================

def sync_databases(emit=None) -> dict:
    """
    Full sync pipeline:
      1. Pull accessible tables from MySQL → cms_local.db
      2. Migrate Semester 4 students       → college_scheduler.db
      3. Sync users table                  → users.db
      4. Recalculate enrollment counts      → course_master & department_semester_count
    """
    if emit is None:
        emit = _noop

    emit("info", "=== CMS Sync Pipeline Starting ===")

    emit("info", "--- Step 1: Syncing MySQL tables to cms_local.db ---")
    mysql_summary = _sync_mysql_to_local(emit)

    emit("info", "--- Step 2: Migrating Semester 4 students ---")
    migrate_summary = _migrate_sem4_students(emit)

    emit("info", "--- Step 3: Syncing users to users.db ---")
    users_summary = _sync_users_db(emit)

    emit("info", "--- Step 4: Recalculating enrollment numbers ---")
    recalculate_summary = _recalculate_enrollment_counts(emit)

    emit("success", "=== CMS Sync Pipeline Complete ===")
    return {
        "mysql_sync":   mysql_summary,
        "sem4_migrate": migrate_summary,
        "users_sync":   users_summary,
        "recalculate":  recalculate_summary,
    }



