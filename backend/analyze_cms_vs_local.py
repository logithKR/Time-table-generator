import sqlite3
import pandas as pd
import json

cms_db = "cms_local.db"
tt_db = "college_scheduler.db"

def get_unique_values(db_path, query):
    try:
        conn = sqlite3.connect(db_path)
        df = pd.read_sql(query, conn)
        conn.close()
        if not df.empty:
            return df.iloc[:, 0].dropna().unique().tolist()
        return []
    except Exception as e:
        return [f"Error: {e}"]

def main():
    result = {}
    
    result["cms_courses_category"] = get_unique_values(cms_db, "SELECT DISTINCT category FROM courses")
    result["cms_course_type"] = get_unique_values(cms_db, "SELECT DISTINCT course_type FROM course_type")
    
    result["tt_delivery_type"] = get_unique_values(tt_db, "SELECT DISTINCT delivery_type FROM course_faculty_map")
    result["tt_slot_type"] = get_unique_values(tt_db, "SELECT DISTINCT slot_type FROM slot_master")
    result["tt_venue_type"] = get_unique_values(tt_db, "SELECT DISTINCT venue_type FROM course_venue_map")

    with open("analysis.json", "w") as f:
        json.dump(result, f, indent=2)

if __name__ == "__main__":
    main()
