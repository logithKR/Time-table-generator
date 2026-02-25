"""
Import 'Course Nature' from Book1.xlsx into CourseFacultyMap.delivery_type
Reads the Excel, matches by (course_code, faculty_id), and updates delivery_type.
"""
import sys
sys.path.append('.')
import pandas as pd
from database import SessionLocal
import models

EXCEL_PATH = r'C:\Users\kalai\Downloads\time table\orginals\Book1.xlsx'

def import_course_nature():
    df = pd.read_excel(EXCEL_PATH, header=0)
    
    # Use column indices since header names may have formula artifacts
    # Col 0=Dept, 1=Semester, 2=Course Type, 3=Course Code, 4=Course Name,
    # 5=Course Nature, 6=L, 7=T, 8=P, 9=C, 10=Faculty ID, 11=Faculty Name, 12=Mail ID
    col_course_code = df.columns[3]
    col_course_nature = df.columns[5]
    col_faculty_id = df.columns[10]
    
    print(f"Column names detected:")
    print(f"  Course Code: '{col_course_code}'")
    print(f"  Course Nature: '{col_course_nature}'")
    print(f"  Faculty ID: '{col_faculty_id}'")
    print()
    
    # Show distinct Course Nature values
    nature_vals = df[col_course_nature].dropna().astype(str).str.strip().unique()
    print(f"Distinct Course Nature values in Excel: {nature_vals.tolist()}")
    print()
    
    db = SessionLocal()
    
    updated = 0
    skipped = 0
    not_found = 0
    
    for _, row in df.iterrows():
        course_code = str(row[col_course_code]).strip() if pd.notna(row[col_course_code]) else None
        faculty_id = str(row[col_faculty_id]).strip() if pd.notna(row[col_faculty_id]) else None
        course_nature = str(row[col_course_nature]).strip().upper() if pd.notna(row[col_course_nature]) else None
        
        if not course_code or not faculty_id or not course_nature:
            skipped += 1
            continue
        
        # Find matching CourseFacultyMap row
        mapping = db.query(models.CourseFacultyMap).filter_by(
            course_code=course_code,
            faculty_id=faculty_id
        ).first()
        
        if mapping:
            old_val = mapping.delivery_type
            mapping.delivery_type = course_nature
            updated += 1
            print(f"  ✅ {course_code} | {faculty_id}: '{old_val}' → '{course_nature}'")
        else:
            not_found += 1
            print(f"  ⚠️  {course_code} | {faculty_id}: NOT FOUND in CourseFacultyMap")
    
    db.commit()
    db.close()
    
    print()
    print(f"=== Summary ===")
    print(f"  Updated: {updated}")
    print(f"  Skipped (empty): {skipped}")
    print(f"  Not found in DB: {not_found}")

if __name__ == "__main__":
    import_course_nature()
