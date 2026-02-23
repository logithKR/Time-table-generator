import sqlite3
import pandas as pd

conn = sqlite3.connect('backend/college_scheduler.db')

# Identify the ADD COURSE for CSE
cm = pd.read_sql_query('SELECT course_code, course_name FROM course_master WHERE department_code="CSE" AND is_add_course=1', conn)
print("--- ADD COURSES in CSE ---")
print(cm.to_string())

if len(cm) > 0:
    for _, row in cm.iterrows():
        code = row['course_code']
        df = pd.read_sql_query(f'SELECT day_of_week, period_number, course_code, course_name, faculty_name FROM timetable_entries WHERE department_code="CSE" AND course_code="{code}"', conn)
        print(f"\n--- Timetable Entries for {code} ---")
        print(df.to_string())
