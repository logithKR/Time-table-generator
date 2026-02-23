import sqlite3
import pandas as pd

conn = sqlite3.connect('backend/college_scheduler.db')
cm = pd.read_sql_query('SELECT course_code, course_name, is_add_course, lecture_hours, practical_hours, weekly_sessions FROM course_master WHERE department_code="CSE" AND is_add_course=1', conn)
print('Add Courses in DB:')
print(cm.to_string())
if len(cm) > 0:
    for _, row in cm.iterrows():
        print(f"Course: {row['course_code']}, sessions: {row['weekly_sessions']}")
