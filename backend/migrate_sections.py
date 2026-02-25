"""
Migration: Add section_number column to timetable_entries table.
"""
import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'college_scheduler.db')

def migrate():
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute("PRAGMA table_info(timetable_entries)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'section_number' in columns:
            print("Migration already applied: 'section_number' column exists.")
        else:
            print("Adding 'section_number' to timetable_entries...")
            cursor.execute("ALTER TABLE timetable_entries ADD COLUMN section_number INTEGER DEFAULT 1")
            print("Migration successful! All existing entries defaulted to section 1.")
            
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
