import pandas as pd
import sqlite3
import os
import re

from database import engine, Base
import models # Ensure models are registered

# Files
COURSE_FILE = r"D:\timetable adhi\timetable-generator\Coursewise Allocation - 2025-26 EVEN.xlsx"
VENUE_FILE = r"D:\timetable adhi\timetable-generator\Academic Mode Class Venues.xlsx"
DB_FILE = r"c:\Users\kalai\Downloads\Sih 6\backend\college_scheduler.db"

# Depts to process (heuristics didn't work well, so we use strict list or extract)
# User wants 'Departments' table. We can extract from Sheet Names of Course File.
SKIP_SHEETS = ['No of Courses', 'Faculty Details', 'Sheet1']

def get_db():
    return sqlite3.connect(DB_FILE)

def run_pipeline():
    print("🚀 Starting Import Pipeline...")
    
    # 0. Init DB (Create Tables)
    print("0️⃣  Initializing Database schema...")
    Base.metadata.drop_all(bind=engine) # Ensure fresh start
    Base.metadata.create_all(bind=engine)
    
    if not os.path.exists(COURSE_FILE) or not os.path.exists(VENUE_FILE):
        print("❌ Missing Excel Files!")
        return

    conn = get_db()
    cursor = conn.cursor()

    # --- 1. DEPARTMENTS ---
    print("\n1️⃣  Importing Departments...")
    xl = pd.ExcelFile(COURSE_FILE)
    dept_names = [s for s in xl.sheet_names if s not in SKIP_SHEETS]
    
    for dept in dept_names:
        cursor.execute("INSERT OR IGNORE INTO departments (dept_code, dept_name) VALUES (?, ?)", (dept, dept))
    conn.commit()
    print(f"   ✅ Imported {len(dept_names)} departments.")

    # --- 2. SEMESTERS ---
    print("\n2️⃣  Importing Semesters...")
    for i in range(1, 9):
        cursor.execute("INSERT OR IGNORE INTO semesters (id, semester_number) VALUES (?, ?)", (i, i))
    conn.commit()
    print("   ✅ Imported 8 semesters.")

    # --- 3. VENUES ---
    print("\n3️⃣  Importing Venues...")
    # Source: Venue File, Sheet8 (or similar)
    v_xl = pd.ExcelFile(VENUE_FILE)
    # Prefer 'Sheet8' or 'CONSOLIDATED VENUES'
    target_sheet = 'Sheet8' if 'Sheet8' in v_xl.sheet_names else v_xl.sheet_names[0]
    
    try:
        v_df = v_xl.parse(target_sheet, header=0) # Assuming row 0 is header
        # Columns found: DEPARTMENT, SEMESTER, VENUES
        # Sanitize column names
        v_df.columns = v_df.columns.str.strip().str.upper()
        
        venue_count = 0
        if 'VENUES' in v_df.columns and 'DEPARTMENT' in v_df.columns:
            for _, row in v_df.iterrows():
                venues_str = str(row['VENUES'])
                dept_code = str(row['DEPARTMENT']).strip()
                
                if pd.isna(venues_str) or venues_str.lower() == 'nan': continue
                
                # Split by comma
                venues = [v.strip() for v in venues_str.replace('\n', ',').split(',') if v.strip()]
                
                # Get Dept ID
                cursor.execute("SELECT id FROM departments WHERE dept_code=?", (dept_code,))
                res = cursor.fetchone()
                dept_id = res[0] if res else None
                
                for v in venues:
                    if dept_id:
                        cursor.execute("INSERT OR IGNORE INTO venues (venue_name, dept_id, venue_type) VALUES (?, ?, ?)", 
                                     (v, dept_id, 'classroom'))
                        venue_count += 1
    except Exception as e:
        print(f"   ⚠️ Venue Import Error: {e}")
        
    conn.commit()
    print(f"   ✅ Imported {venue_count} venues.")

    # --- 4. FACULTY & 5. COURSES & 6. ALLOCATIONS ---
    print("\n4️⃣ 5️⃣ 6️⃣  Importing Faculty, Courses & Allocations...")
    
    total_courses = 0
    
    # Reload Excel File
    xl = pd.ExcelFile(COURSE_FILE)
    sheets = [s for s in xl.sheet_names if s not in SKIP_SHEETS]

    for sheet in sheets:
        try:
            # Read sheet (skip first 18 rows based on visual inspection)
            # Row 19 (index 18) seems to be header, data starts 20 (index 19)
            try:
                # Let's read from row 19 to get headers
                df = pd.read_excel(COURSE_FILE, sheet_name=sheet, header=18) 
            except Exception as e:
                 print(f"      SKIPPING SHEET: {sheet} - Error: {e}")
                 continue
            
            # Identify Columns (Based on analysis output)
            # Col 0: S.No (1, 2...)
            # Col 1: Dept? (AGRI)
            # Col 2: Sem? (S6)
            # Col 3: Type? (CORE/PROFESSIONAL ELECTIVE)
            # Col 4: Code (22AG601)
            # Col 5: Title (FARM IMPLEMENTS...)
            # ...
            # Col 8: Faculty Code? (AG11049)
            # Col 9: Faculty Name (Dr.PRAVEEN KUMAR D)
            
            # Normalize column names
            df.columns = [str(c).strip().upper() for c in df.columns]
            
            # Basic validation: check if 'CODE' or 'COURSE CODE' exists
            # Actually, let's use index based on inspection if headers are messy
            # Re-reading without header to access by index might be safer if headers vary
            df_raw = pd.read_excel(COURSE_FILE, sheet_name=sheet, header=None, skiprows=19)
            
            for _, row in df_raw.iterrows():
                # Inspection Mapping:
                # 0: S.No (FLOAT/INT) -> Check if valid number to detect data row
                # 1: Dept Code (AGRI)
                # 2: Sem (S6)
                # 3: Type (CORE)
                # 4: Code (22AG601)
                # 5: Title (FARM...)
                # 8: Faculty ID (AG11049)
                # 9: Faculty Name (Dr.PRAVEEN...)
                
                s_no = row[0]
                if pd.isna(s_no) or str(s_no).strip() == '': continue
                
                dept_code = str(row[1]).strip() if pd.notna(row[1]) else ""
                sem_str = str(row[2]).strip() if pd.notna(row[2]) else "6"
                course_type_raw = str(row[3]).strip().upper() if pd.notna(row[3]) else "CORE"
                code = str(row[4]).strip() if pd.notna(row[4]) else ""
                title = str(row[5]).strip() if pd.notna(row[5]) else ""
                fac_code_raw = str(row[8]).strip() if pd.notna(row[8]) else ""
                fac_name = str(row[9]).strip() if pd.notna(row[9]) else "Unassigned"
                
                if len(code) < 4: continue # Skip invalid rows

                # 1. Ensure Dept Exists (and get ID)
                # Note: Dept Code from Sheet might basically be the Dept Name
                if not dept_code: dept_code = sheet # Fallback
                
                # Try finding by sheet name first if dept_code is empty or just generic
                cursor.execute("SELECT id FROM departments WHERE dept_code=?", (dept_code,))
                d_res = cursor.fetchone()
                
                if not d_res:
                     # Auto-create (Using SHEET name as safer default if dept_code is weird)
                     print(f"      + Creating missing Dept: {sheet} (code: {dept_code})")
                     try:
                         cursor.execute("INSERT INTO departments (dept_code, dept_name) VALUES (?, ?)", (dept_code, dept_code))
                         conn.commit() # FORCE COMMIT
                     except:
                         pass # Already exists?

                     # Re-fetch
                     cursor.execute("SELECT id FROM departments WHERE dept_code=?", (dept_code,))
                     d_res = cursor.fetchone()
                     
                     # If still none, try sheet name
                     if not d_res:
                        try:
                            cursor.execute("INSERT INTO departments (dept_code, dept_name) VALUES (?, ?)", (sheet, sheet))
                            conn.commit()
                        except:
                            pass
                        cursor.execute("SELECT id FROM departments WHERE dept_code=?", (sheet,))
                        d_res = cursor.fetchone()

                if not d_res:
                    print(f"      SKIPPING ROW: Could not find/create Dept for {sheet}")
                    continue

                dept_id = d_res[0]
                
                # 2. Faculty
                if not fac_name or fac_name == "nan": fac_name = "Unassigned"
                if not fac_code_raw or fac_code_raw == "nan": fac_code_raw = "TBA"
                
                cursor.execute("INSERT OR IGNORE INTO faculty (faculty_code, faculty_name, dept_id) VALUES (?, ?, ?)", 
                             (fac_code_raw, fac_name, dept_id))
                cursor.execute("SELECT id FROM faculty WHERE faculty_name=? AND dept_id=?", (fac_name, dept_id))
                f_id = cursor.fetchone()[0]
                
                # 3. Course
                # Parse Sem (S6 -> 6)
                try:
                    sem_id = int(re.search(r'\d+', sem_str).group())
                except:
                    sem_id = 6
                
                # Course Type
                c_type = 'lab' if 'LAB' in title.upper() or 'LAB' in course_type_raw else 'core'
                
                cursor.execute('''INSERT OR IGNORE INTO courses 
                               (course_code, course_name, dept_id, semester_id, lecture_hours, practical_hours, course_type) 
                               VALUES (?, ?, ?, ?, ?, ?, ?)''', 
                               (code, title, dept_id, sem_id, 4, 0 if c_type=='core' else 4, c_type))
                
                cursor.execute("SELECT id FROM courses WHERE course_code=?", (code,))
                c_res = cursor.fetchone()
                if c_res:
                    c_id = c_res[0]
                    # 4. Allocation
                    cursor.execute("INSERT OR IGNORE INTO course_allocations (course_id, faculty_id) VALUES (?, ?)", (c_id, f_id))
                    total_courses += 1

        except Exception as e:
            print(f"   ⚠️ Error in {sheet}: {e}")

    conn.commit()
    print(f"   ✅ Processed {total_courses} courses/allocations.")
    conn.close()
    print("\n✨ Pipeline Finished.")

if __name__ == "__main__":
    run_pipeline()
