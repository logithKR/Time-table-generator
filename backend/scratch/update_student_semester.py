import sqlite3
import os

db_path = r'c:\Users\kalai\Downloads\time table\database\college_scheduler.db'

def migrate():
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print("Adding 'semester' column to 'student_master'...")
        # SQLite doesn't support IF NOT EXISTS for ADD COLUMN in older versions, 
        # so we check if it exists first.
        cursor.execute("PRAGMA table_info(student_master)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'semester' not in columns:
            cursor.execute("ALTER TABLE student_master ADD COLUMN semester INTEGER DEFAULT 4")
            print("Successfully added 'semester' column.")
        else:
            print("'semester' column already exists.")

        conn.commit()
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
