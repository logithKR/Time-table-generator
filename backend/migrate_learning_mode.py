"""
Migration script: Add learning_mode_ids column to timetable_entries and timetable tables.
Run once: python migrate_learning_mode.py
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'database', 'college_scheduler.db')

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

try:
    cur.execute("ALTER TABLE timetable_entries ADD COLUMN learning_mode_ids TEXT DEFAULT '1,2'")
    print("Added learning_mode_ids to timetable_entries")
except Exception as e:
    print(f"timetable_entries: {e}")

try:
    cur.execute("ALTER TABLE timetable ADD COLUMN learning_mode_ids TEXT DEFAULT '1,2'")
    print("Added learning_mode_ids to timetable")
except Exception as e:
    print(f"timetable: {e}")

# Backfill existing rows with default '1,2' (already default, but be explicit)
cur.execute("UPDATE timetable_entries SET learning_mode_ids='1,2' WHERE learning_mode_ids IS NULL")
cur.execute("UPDATE timetable SET learning_mode_ids='1,2' WHERE learning_mode_ids IS NULL")

conn.commit()
conn.close()
print("Migration complete.")
