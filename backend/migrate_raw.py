import sqlite3

def migrate_slots():
    conn = sqlite3.connect('college_scheduler.db')
    cursor = conn.cursor()
    # Check if the column exists first
    try:
        cursor.execute("ALTER TABLE slot_master ADD COLUMN semester_ids VARCHAR DEFAULT '[]'")
    except sqlite3.OperationalError:
        pass # Column already exists
    
    # Update existing rows
    cursor.execute("UPDATE slot_master SET semester_ids = '[1, 2, 3, 4, 5, 6, 7, 8]' WHERE semester_ids = '[]' OR semester_ids IS NULL")
    conn.commit()
    print(f"Migrated {cursor.rowcount} slots to explicitly cover Semesters 1-8.")
    conn.close()

if __name__ == "__main__":
    migrate_slots()
