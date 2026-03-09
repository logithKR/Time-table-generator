import sqlite3
conn = sqlite3.connect('college_scheduler.db')
cur = conn.cursor()
cur.execute("SELECT * FROM course_master WHERE course_code = '22IS607'")
cols = [d[0] for d in cur.description]
rows = cur.fetchall()
for row in rows:
    for col, val in zip(cols, row):
        print(f"  {col}: {val}")
conn.close()
