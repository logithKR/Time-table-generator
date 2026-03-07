import sqlite3
conn = sqlite3.connect('college_scheduler.db')
c = conn.cursor()
print("\n--- Section counts per course ---")
c.execute("""SELECT course_code, course_name, COUNT(DISTINCT section_number), MAX(section_number), session_type 
             FROM timetable_entries WHERE department_code='CSE' AND semester=2
             GROUP BY course_code, session_type ORDER BY course_code""")
for r in c.fetchall():
    print(r)

print("\n--- Communication English / HS006 entries ---")
c.execute("""SELECT course_code, day_of_week, period_number, section_number, venue_name, course_name
             FROM timetable_entries WHERE department_code='CSE' AND semester=2
             AND (course_code LIKE '%HS%' OR course_code LIKE '%HS006%')
             ORDER BY day_of_week, period_number, section_number""")
for r in c.fetchall():
    print(r)

print("\n--- Merged lab block entries (check section counts) ---")
c.execute("""SELECT day_of_week, period_number, section_number, course_code, course_name, session_type, venue_name
             FROM timetable_entries WHERE department_code='CSE' AND semester=2
             AND session_type IN ('LAB','THEORY') AND course_code IN ('22PH202','22CH203','22GE003','22CS206')
             ORDER BY day_of_week, period_number, section_number LIMIT 30""")
for r in c.fetchall():
    print(r)

conn.close()
