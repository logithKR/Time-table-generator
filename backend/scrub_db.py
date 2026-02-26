import sqlite3
import re
import os

db_path = os.path.join(os.path.dirname(__file__), 'college_scheduler.db')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Timetable Entries
cur.execute("SELECT id, faculty_name FROM timetable_entries")
rows = cur.fetchall()
updates = 0
for row in rows:
    entry_id, fac_name = row
    if fac_name:
        new_name = re.sub(r'^S\d+:\s*', '', fac_name).strip()
        if new_name != fac_name:
            cur.execute("UPDATE timetable_entries SET faculty_name = ? WHERE id = ?", (new_name, entry_id))
            updates += 1
print(f"Updated {updates} rows in timetable_entries")

# Course Faculty Map
cur.execute("SELECT id, faculty_name FROM course_faculty_map")
rows = cur.fetchall()
updates2 = 0
for row in rows:
    entry_id, fac_name = row
    if fac_name:
        new_name = re.sub(r'^S\d+:\s*', '', fac_name).strip()
        if new_name != fac_name:
            cur.execute("UPDATE course_faculty_map SET faculty_name = ? WHERE id = ?", (new_name, entry_id))
            updates2 += 1
print(f"Updated {updates2} rows in course_faculty_map")

conn.commit()
conn.close()
