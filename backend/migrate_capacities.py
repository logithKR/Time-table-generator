import sqlite3

def migrate():
    conn = sqlite3.connect('college_scheduler.db')
    cursor = conn.cursor()
    
    # Fetch existing global capacities
    cursor.execute("SELECT department_code, student_count FROM department_master WHERE student_count IS NOT NULL AND student_count > 0")
    departments = cursor.fetchall()
    
    print(f"Migrating {len(departments)} department capacities to Semester 6...")
    
    count = 0
    for dept_code, student_count in departments:
        # Check if already migrated
        cursor.execute("SELECT id FROM department_semester_count WHERE department_code = ? AND semester = 6", (dept_code,))
        if not cursor.fetchone():
            cursor.execute("INSERT INTO department_semester_count (department_code, semester, student_count) VALUES (?, ?, ?)",
                           (dept_code, 6, student_count))
            count += 1
            
    conn.commit()
    print(f"Successfully migrated {count} new entries.")
    
    # We will leave the legacy column for now so it doesn't break any accidental dangling references
    conn.close()

if __name__ == '__main__':
    migrate()
