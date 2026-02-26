import sys, re

path = r'C:\Users\kalai\Downloads\time table\backend\solver_engine.py'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Replace the global section formulas
old_math = """    # Compute theory sections needed
    theory_sections = math.ceil(student_count / max_classroom_cap) if max_classroom_cap > 0 else 1
    if student_count % max_classroom_cap > 0 and student_count % max_classroom_cap < 30:
        theory_sections = max(theory_sections - 1, 1)

    # Compute lab sections needed
    lab_sections = math.ceil(student_count / max_lab_cap) if max_lab_cap > 0 else 1
    if student_count % max_lab_cap > 0 and student_count % max_lab_cap < 30:
        lab_sections = max(lab_sections - 1, 1)

    print(f"  \U0001f465 Student count: {student_count}")
    print(f"  \U0001f3eb Theory sections: {theory_sections} (classrooms: {len(classroom_venues_info)}, max cap: {max_classroom_cap})")
    print(f"  \U0001f52c Lab sections: {lab_sections} (labs: {len(lab_venues_info)}, max cap: {max_lab_cap})")"""

new_math = """    # Helper to calculate sections dynamically per course based on accurate enrollment counts
    def get_course_sections(course_code, is_lab_req):
        course_obj = next((c for c in courses if c.course_code == course_code), None)
        enrolled = course_obj.enrolled_students if course_obj and course_obj.enrolled_students else 0
        base_count = enrolled if enrolled > 0 else student_count
        cap = max_lab_cap if is_lab_req else max_classroom_cap
        sections = math.ceil(base_count / cap) if cap > 0 else 1
        if base_count % cap > 0 and base_count % cap < 30:
            if enrolled > 0 and base_count < 30:
                sections = max(sections, 1) # Course with 1-29 students still gets 1 section
            else:
                sections = max(sections - 1, 1)
        return sections

    print(f"  \U0001f465 Fallback Dept Student count: {student_count}")"""

if old_math in code:
    code = code.replace(old_math, new_math)
    print("Replaced Math block!")
else:
    print("Could not find the math block text to replace!")

# 2. Replace loop variable usage safely
# Theory
code = re.sub(r'for sec in range\(theory_sections\):', r'for sec in range(get_course_sections(gc.course_code, False)):', code)
code = re.sub(r'Need \{theory_sections\}', r'Need {get_course_sections(gc.course_code, False)}', code)

# Lab (gc loop)
code = code.replace('for sec in range(lab_sections):\n                            fac_assigned = None\n                            for fid, fname, dtype in gc_fac:',
                    'for sec in range(get_course_sections(gc.course_code, True)):\n                            fac_assigned = None\n                            for fid, fname, dtype in gc_fac:')
code = re.sub(r'Need \{lab_sections\}', r'Need {get_course_sections(gc.course_code, True)}', code)

# Mini project (mp loop)
code = code.replace('for sec in range(lab_sections):\n                fac_assigned = None\n                for fid, fname, dtype in gc_fac:\n                    if is_faculty_free(fid, day, p1):',
                    'for sec in range(get_course_sections(mp.course_code, True)):\n                fac_assigned = None\n                for fid, fname, dtype in gc_fac:\n                    if is_faculty_free(fid, day, p1):')

# Fill remaining labs (c loop)
code = code.replace('for sec in range(lab_sections):\n                    fac_assigned = None\n                    for fid, fname, dtype in gc_fac:\n                        if is_faculty_free(fid, day, p1) and is_faculty_free(fid, day, p2):',
                    'for sec in range(get_course_sections(c.course_code, True)):\n                    fac_assigned = None\n                    for fid, fname, dtype in gc_fac:\n                        if is_faculty_free(fid, day, p1) and is_faculty_free(fid, day, p2):')


with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Replacement complete!")
