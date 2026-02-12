import pandas as pd
import sqlite3
import os
from database import engine, Base
import models

# File paths
COURSE_FILE = r"c:\Users\kalai\Downloads\Sih 6\data\course-details.xlsx"
FACULTY_FILE = r"c:\Users\kalai\Downloads\Sih 6\data\faculty-details.xlsx"
DB_FILE = r"c:\Users\kalai\Downloads\Sih 6\backend\college_scheduler.db"

def get_db():
    return sqlite3.connect(DB_FILE)

def import_data():
    print("🚀 Starting Clean Import Pipeline...")
    
    # 0. Create tables
    print("\n0️⃣  Creating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("   ✅ Tables created.")
    
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Import DEPARTMENTS (extract unique from course file)
    print("\n1️⃣  Importing Departments...")
    try:
        course_df = pd.read_excel(COURSE_FILE)
        course_df.columns = course_df.columns.str.strip().str.lower()
        
        if 'department_code' in course_df.columns:
            departments = course_df['department_code'].dropna().unique()
            for dept in departments:
                dept = str(dept).strip()
                cursor.execute("INSERT OR IGNORE INTO department_master (department_code) VALUES (?)", (dept,))
            conn.commit()
            print(f"   ✅ Imported {len(departments)} departments.")
        else:
            print("   ⚠️ 'department_code' column not found in course file!")
    except Exception as e:
        print(f"   ❌ Error importing departments: {e}")
    
    # 2. Import FACULTY
    print("\n2️⃣  Importing Faculty...")
    try:
        faculty_df = pd.read_excel(FACULTY_FILE)
        faculty_df.columns = faculty_df.columns.str.strip().str.lower()
        
        # Map actual columns to expected format
        col_map = {
            'faculty id': 'faculty_id',
            'faculty name': 'faculty_name',
            'department name': 'department_code',
            'email': 'faculty_email',
            'working status': 'status'
        }
        
        faculty_count = 0
        for _, row in faculty_df.iterrows():
            fid = str(row.get('faculty id', '')).strip()
            fname = str(row.get('faculty name', '')).strip()
            dept = str(row.get('department name', '')).strip()
            email = str(row.get('email', '')).strip() if pd.notna(row.get('email')) else None
            status = str(row.get('working status', 'ACTIVE')).strip() if pd.notna(row.get('working status')) else 'ACTIVE'
            
            if fid and fname and dept:
                cursor.execute("""
                    INSERT OR IGNORE INTO faculty_master 
                    (faculty_id, faculty_name, faculty_email, department_code, status) 
                    VALUES (?, ?, ?, ?, ?)
                """, (fid, fname, email, dept, status))
                faculty_count += 1
        conn.commit()
        print(f"   ✅ Imported {faculty_count} faculty members.")
    except Exception as e:
        print(f"   ❌ Error importing faculty: {e}")
    
    # 3. Import COURSES
    print("\n3️⃣  Importing Courses...")
    try:
        import re
        course_df = pd.read_excel(COURSE_FILE)
        course_df.columns = course_df.columns.str.strip().str.lower()
        
        required_cols = ['course_code', 'course_name', 'department_code', 'semester']
        if all(col in course_df.columns for col in required_cols):
            course_count = 0
            for _, row in course_df.iterrows():
                code = str(row['course_code']).strip()
                name = str(row['course_name']).strip()
                dept = str(row['department_code']).strip()
                
                # Parse semester (handle "S2", "S4", "S6" format or plain "2", "4", "6")
                sem_raw = str(row['semester']).strip().upper()
                sem_match = re.search(r'(\d+)', sem_raw)
                sem = int(sem_match.group(1)) if sem_match else 0
                
                # Optional columns
                category = str(row.get('course_category', '')).strip() if 'course_category' in row else None
                delivery = str(row.get('delivery_type', '')).strip() if 'delivery_type' in row else None
                
                # Excel uses 'l', 't', 'p', 'c' as column names
                l_col = 'l' if 'l' in course_df.columns else 'lecture_hours'
                t_col = 't' if 't' in course_df.columns else 'tutorial_hours'
                p_col = 'p' if 'p' in course_df.columns else 'practical_hours'
                c_col = 'c' if 'c' in course_df.columns else 'credits'
                
                l_hours = int(row.get(l_col, 0)) if l_col in row and pd.notna(row.get(l_col)) else 0
                t_hours = int(row.get(t_col, 0)) if t_col in row and pd.notna(row.get(t_col)) else 0
                p_hours = int(row.get(p_col, 0)) if p_col in row and pd.notna(row.get(p_col)) else 0
                
                # 🔥 CRITICAL: Calculate weekly_sessions from L+T+P
                weekly_sessions = l_hours + t_hours + p_hours
                if weekly_sessions == 0:
                    weekly_sessions = 1  # fallback: at least 1 session/week
                
                credits = int(row.get(c_col, 0)) if c_col in row and pd.notna(row.get(c_col)) else None
                
                # Boolean flags
                is_lab = bool(row.get('is_lab', False)) if 'is_lab' in row else (delivery == 'LAB' or (p_hours > 0 and l_hours == 0))
                is_elective = bool(row.get('is_elective', False)) if 'is_elective' in row else False
                is_open_elective = bool(row.get('is_open_elective', False)) if 'is_open_elective' in row else False
                
                # Auto-detect honours from course code: e.g. 22CDH31 has 'H' before digits
                import re
                is_honours = bool(row.get('is_honours', False)) if 'is_honours' in row else bool(re.search(r'[A-Z]H\d', code))
                is_minor = bool(row.get('is_minor', False)) if 'is_minor' in row else False
                
                if code and name and dept and sem:
                    cursor.execute("""
                        INSERT OR IGNORE INTO course_master 
                        (course_code, course_name, department_code, semester, 
                         course_category, delivery_type, 
                         lecture_hours, tutorial_hours, practical_hours, 
                         weekly_sessions, credits, 
                         is_lab, is_elective, is_open_elective, is_honours, is_minor)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (code, name, dept, sem, category, delivery, 
                          l_hours, t_hours, p_hours, weekly_sessions, credits,
                          is_lab, is_elective, is_open_elective, is_honours, is_minor))
                    course_count += 1
            conn.commit()
            print(f"   ✅ Imported {course_count} courses.")
        else:
            print(f"   ⚠️ Missing required columns in course file!")
            print(f"   Expected: {required_cols}")
            print(f"   Found: {list(course_df.columns)}")
    except Exception as e:
        print(f"   ❌ Error importing courses: {e}")
    
    # 4. Import COURSE-FACULTY MAPPING
    print("\n4️⃣  Importing Course-Faculty Mappings...")
    try:
        # Check if mapping exists in course file
        if 'faculty_id' in course_df.columns:
            map_count = 0
            for _, row in course_df.iterrows():
                code = str(row['course_code']).strip()
                fid = str(row.get('faculty_id', '')).strip()
                dept = str(row['department_code']).strip()
                delivery = str(row.get('delivery_type', '')).strip() if 'delivery_type' in row else None
                
                if code and fid and dept:
                    cursor.execute("""
                        INSERT OR IGNORE INTO course_faculty_map 
                        (course_code, faculty_id, department_code, delivery_type)
                        VALUES (?, ?, ?, ?)
                    """, (code, fid, dept, delivery))
                    map_count += 1
            conn.commit()
            print(f"   ✅ Imported {map_count} course-faculty mappings.")
        else:
            print("   ⚠️ 'faculty_id' column not found in course file - skipping mappings.")
    except Exception as e:
        print(f"   ❌ Error importing mappings: {e}")
    
    conn.close()
    print("\n✨ Import Complete!")

if __name__ == "__main__":
    import_data()
