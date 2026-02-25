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
        # Check if column already exists
        cursor.execute("PRAGMA table_info(department_venue_map)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'semester' in columns:
            print("Migration already applied: 'semester' column exists in 'department_venue_map'.")
        else:
            print("Applying migration: adding 'semester' to 'department_venue_map'...")
            # SQLite allows adding a column with a default safely
            cursor.execute("ALTER TABLE department_venue_map ADD COLUMN semester INTEGER NOT NULL DEFAULT 6")
            print("Migration successful! Existing mappings dynamically shifted to Semester 6.")
            
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
