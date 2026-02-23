import sqlite3
import pandas as pd

conn = sqlite3.connect('backend/college_scheduler.db')
depts_query = pd.read_sql('SELECT DISTINCT department_code FROM timetable_entries', conn)

if depts_query.empty:
    print('No timetables generated.')
else:
    depts = depts_query['department_code'].tolist()
    placeholders = ','.join(['?']*len(depts))
    query = f'''
        SELECT 
            c.department_code, c.course_code, c.course_name, 
            c.lecture_hours, c.tutorial_hours, c.practical_hours, 
            c.weekly_sessions, c.is_honours, c.is_minor, c.is_add_course, 
            COUNT(t.id) as scheduled_periods 
        FROM course_master c 
        LEFT JOIN timetable_entries t ON c.course_code = t.course_code AND c.department_code = t.department_code 
        WHERE c.department_code IN ({placeholders}) 
        GROUP BY c.department_code, c.course_code
    '''
    df = pd.read_sql(query, conn, params=depts)
    mismatched = []
    
    for _, r in df.iterrows():
        l = r['lecture_hours'] or 0
        t = r['tutorial_hours'] or 0
        p = r['practical_hours'] or 0
        
        # Calculate theory
        theory = l + t + (1 if p % 2 == 1 else 0)
        lab_blocks = p // 2
        exp = theory + (lab_blocks * 2)
        
        if r['is_honours'] or r['is_minor'] or r['is_add_course']:
            exp = r['weekly_sessions'] or exp
            
        if r['scheduled_periods'] != exp:
            mismatched.append({
                'course': r['course_code'], 
                'name': r['course_name'], 
                'exp': exp, 
                'sch': r['scheduled_periods']
            })
            
    with open('mismatches_output.txt', 'w', encoding='utf-8') as f:
        f.write(f'Mismatches Found: {len(mismatched)} out of {len(df)} total courses in {depts}\n')
        if mismatched:
            f.write("Here are the mismatched courses:\n")
            for m in mismatched:
                f.write(f" - {m['course']} ({m['name']}): Expected {m['exp']} periods, but scheduled {m['sch']}\n")
    print("Mismatches written to mismatches_output.txt")
