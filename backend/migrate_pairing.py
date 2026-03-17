import sqlite3
import os

# Database Path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "college_scheduler.db")

conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

try:
    print(f"Adding column to {DB_FILE}...")
    cursor.execute("ALTER TABLE department_master ADD COLUMN pair_add_course_miniproject BOOLEAN DEFAULT 0")
    print("Column 'pair_add_course_miniproject' added successfully.")
except sqlite3.OperationalError as e:
    print(f"Error (likely already exists): {e}")

conn.commit()
conn.close()
