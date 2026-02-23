from ortools.sat.python import cp_model
from sqlalchemy.orm import Session
import models

def generate_schedule(db: Session, department_code: str, semester: int, mentor_day: str, mentor_period: int = 8):
    """
    Generates a timetable matching real BIT college pattern.
    
    Constraints:
    C1: All slots filled (no empty periods)
    C2: Labs = 2-period blocks at P1-P2, P3-P4, or P5-P6
    C3: P8 exclusively for honours/minor (or regular overflow if overloaded)
    C4: Mentor hour blocked
    C5: No faculty clash
    C6: Correct weekly session counts
    C7: No back-to-back theory of same course (relaxed when overloaded)
    C8: Max theory sessions per course per day (dynamic)
    C9: Max 1 lab block per course per day
    C10: Lab blocks on non-consecutive days (hard for <=2, soft for 3+)
    C11 (soft): Theory of same course on same day as its lab
    """
    print(f"🚀 Starting Solver for Dept: {department_code}, Sem: {semester}...")

    # =========================================================
    # 1. FETCH DATA
    # =========================================================
    courses = db.query(models.CourseMaster).filter_by(
        department_code=department_code, semester=semester
    ).all()
    slots = db.query(models.SlotMaster).filter_by(is_active=True).all()

    if not courses:
        print("❌ No courses found.")
        return False
    if not slots:
        print("❌ No active slots found.")
        return False

    # Faculty lookups
    course_faculty = {}
    course_names = {}
    for course in courses:
        course_names[course.course_code] = course.course_name
        mappings = db.query(models.CourseFacultyMap).filter_by(course_code=course.course_code).all()
        f_list = []
        for m in mappings:
            fac = db.query(models.FacultyMaster).filter_by(faculty_id=m.faculty_id).first()
            fname = fac.faculty_name if fac else m.faculty_id
            f_list.append((m.faculty_id, fname))
        course_faculty[course.course_code] = f_list

    # Organize slots
    day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    all_days = sorted(set(s.day_of_week for s in slots), key=lambda d: day_order.index(d))

    slot_lookup = {}
    day_periods = {}
    for s in slots:
        slot_lookup[(s.day_of_week, s.period_number)] = s
        if s.day_of_week not in day_periods:
            day_periods[s.day_of_week] = []
        day_periods[s.day_of_week].append(s.period_number)
    for d in day_periods:
        day_periods[d] = sorted(set(day_periods[d]))

    lab_block_starts = [1, 3, 5]
    mentor_day_clean = mentor_day.strip().capitalize()

    # Separate courses
    regular_courses = [c for c in courses if not (c.is_honours or c.is_minor)]
    honours_courses = [c for c in courses if c.is_honours or c.is_minor]

    # Split theory vs lab
    course_theory_count = {}
    course_lab_blocks = {}
    for c in courses:
        theory = (c.lecture_hours or 0) + (c.tutorial_hours or 0)
        lab_periods = c.practical_hours or 0
        lab_blocks = lab_periods // 2 if lab_periods >= 2 else 0
        if lab_periods % 2 == 1:
            theory += 1
        course_theory_count[c.course_code] = theory
        course_lab_blocks[c.course_code] = lab_blocks

    # Calculate available slots
    p17_slots = sum(1 for day in all_days for p in day_periods.get(day, [])
                    if p <= 7 and not (day == mentor_day_clean and p == mentor_period))
    p8_slots_count = sum(1 for day in all_days if (day, 8) in slot_lookup
                         and not (day == mentor_day_clean and 8 == mentor_period))
    total_available = p17_slots + p8_slots_count

    reg_sessions = sum(course_theory_count[c.course_code] + course_lab_blocks[c.course_code] * 2 for c in regular_courses)
    hon_sessions = sum(c.weekly_sessions for c in honours_courses)
    total_sessions = reg_sessions + hon_sessions

    # Determine if schedule is overloaded
    is_overloaded = reg_sessions > p17_slots
    use_p8_for_regular = is_overloaded and len(honours_courses) == 0

    print(f"  📋 {len(regular_courses)} regular ({reg_sessions} sessions) + {len(honours_courses)} honours ({hon_sessions} sessions)")
    print(f"  🗓️  P1-P7 slots: {p17_slots}, P8 slots: {p8_slots_count}, Total: {total_available}")
    if is_overloaded:
        print(f"  ⚠️  OVERLOADED schedule: {reg_sessions} sessions > {p17_slots} P1-P7 slots")
        if use_p8_for_regular:
            print(f"  ℹ️  P8 will be used for regular courses (no honours)")
    for c in courses:
        tag = " [H/M]" if c.is_honours or c.is_minor else ""
        print(f"    {c.course_code}: theory={course_theory_count[c.course_code]}, labs={course_lab_blocks[c.course_code]}{tag}")

    # =========================================================
    # 2. CP-SAT MODEL
    # =========================================================
    model = cp_model.CpModel()

    # Determine which periods regular theory can use
    max_regular_period = 8 if use_p8_for_regular else 7

    # --- THEORY variables ---
    theory_vars = {}
    for c in regular_courses:
        for day in all_days:
            for period in day_periods.get(day, []):
                if period > max_regular_period:
                    continue
                theory_vars[(c.course_code, day, period)] = model.NewBoolVar(
                    f'th_{c.course_code}_{day}_{period}'
                )

    # --- LAB variables ---
    lab_vars = {}
    for c in regular_courses:
        if course_lab_blocks[c.course_code] == 0:
            continue
        for day in all_days:
            for bs in lab_block_starts:
                if (day, bs) in slot_lookup and (day, bs + 1) in slot_lookup:
                    lab_vars[(c.course_code, day, bs)] = model.NewBoolVar(
                        f'lab_{c.course_code}_{day}_{bs}'
                    )

    # =========================================================
    # 3. CONSTRAINTS
    # =========================================================

    # --- C6: Weekly session counts ---
    for c in regular_courses:
        theory_sum = [theory_vars[k] for k in theory_vars if k[0] == c.course_code]
        if course_theory_count[c.course_code] > 0:
            model.Add(sum(theory_sum) == course_theory_count[c.course_code])
        else:
            for v in theory_sum:
                model.Add(v == 0)

        if course_lab_blocks[c.course_code] > 0:
            lab_sum = [lab_vars[k] for k in lab_vars if k[0] == c.course_code]
            model.Add(sum(lab_sum) == course_lab_blocks[c.course_code])

    # --- C4: Mentor hour blocking ---
    for c in regular_courses:
        key = (c.course_code, mentor_day_clean, mentor_period)
        if key in theory_vars:
            model.Add(theory_vars[key] == 0)
    for c in regular_courses:
        for bs in lab_block_starts:
            if mentor_period in [bs, bs + 1]:
                key = (c.course_code, mentor_day_clean, bs)
                if key in lab_vars:
                    model.Add(lab_vars[key] == 0)

    # --- Slot occupancy ---
    core_slot_fills = []
    for day in all_days:
        for period in day_periods.get(day, []):
            if period > max_regular_period:
                continue
            occupants = []
            for c in regular_courses:
                key = (c.course_code, day, period)
                if key in theory_vars:
                    occupants.append(theory_vars[key])
                if course_lab_blocks[c.course_code] > 0:
                    for bs in lab_block_starts:
                        if period in [bs, bs + 1]:
                            lkey = (c.course_code, day, bs)
                            if lkey in lab_vars:
                                occupants.append(lab_vars[lkey])

            if not occupants:
                continue

            is_mentor = (day == mentor_day_clean and period == mentor_period)
            if is_mentor:
                model.Add(sum(occupants) == 0)
            else:
                model.Add(sum(occupants) <= 1)
                core_slot_fills.extend(occupants)

    # --- C7: No back-to-back theory of same course ---
    # Only enforced when schedule is NOT overloaded
    if not is_overloaded:
        for c in regular_courses:
            for day in all_days:
                pl = [p for p in day_periods.get(day, []) if p <= 7]
                for i in range(len(pl) - 1):
                    p1, p2 = pl[i], pl[i + 1]
                    if p2 == p1 + 1:
                        k1 = (c.course_code, day, p1)
                        k2 = (c.course_code, day, p2)
                        if k1 in theory_vars and k2 in theory_vars:
                            model.Add(theory_vars[k1] + theory_vars[k2] <= 1)

    # --- C8: Max theory sessions per course per day ---
    max_theory_per_day = 2 if is_overloaded else 1
    print(f"  📊 max_theory/course/day={max_theory_per_day}, back-to-back={'allowed' if is_overloaded else 'blocked'}")

    for c in regular_courses:
        for day in all_days:
            day_theory = [theory_vars[(c.course_code, day, p)]
                          for p in day_periods.get(day, [])
                          if (c.course_code, day, p) in theory_vars]
            if day_theory:
                model.Add(sum(day_theory) <= max_theory_per_day)

    # --- C9: Max 1 lab block per day GLOBALLY (across all courses) ---
    for day in all_days:
        all_lab_blocks_on_day = []
        for c in regular_courses:
            if course_lab_blocks[c.course_code] == 0:
                continue
            for bs in lab_block_starts:
                if (c.course_code, day, bs) in lab_vars:
                    all_lab_blocks_on_day.append(lab_vars[(c.course_code, day, bs)])
        if len(all_lab_blocks_on_day) > 1:
            model.Add(sum(all_lab_blocks_on_day) <= 1)

    # --- C10: Lab blocks on NON-CONSECUTIVE days GLOBALLY ---
    # No lab day followed by another lab day (across all courses)
    lab_spread_penalties = []
    for i in range(len(all_days) - 1):
        day1 = all_days[i]
        day2 = all_days[i + 1]
        labs_day1 = []
        labs_day2 = []
        for c in regular_courses:
            if course_lab_blocks[c.course_code] == 0:
                continue
            for bs in lab_block_starts:
                if (c.course_code, day1, bs) in lab_vars:
                    labs_day1.append(lab_vars[(c.course_code, day1, bs)])
                if (c.course_code, day2, bs) in lab_vars:
                    labs_day2.append(lab_vars[(c.course_code, day2, bs)])
        if labs_day1 and labs_day2:
            # Count total lab blocks available to decide hard vs soft
            total_lab_blocks = sum(course_lab_blocks[c.course_code] for c in regular_courses)
            if total_lab_blocks <= 3:
                # 3 or fewer lab blocks can always fit Mon/Wed/Fri — hard constraint
                model.Add(sum(labs_day1) + sum(labs_day2) <= 1)
            else:
                # Many lab blocks — soft penalty to avoid consecutive
                has_d1 = model.NewBoolVar(f'glab_d1_{day1}')
                has_d2 = model.NewBoolVar(f'glab_d2_{day2}')
                model.AddMaxEquality(has_d1, labs_day1)
                model.AddMaxEquality(has_d2, labs_day2)
                consec = model.NewBoolVar(f'gconsec_{day1}_{day2}')
                model.AddMultiplicationEquality(consec, [has_d1, has_d2])
                lab_spread_penalties.append(consec)

    # --- No theory in same slot as own lab block ---
    for c in regular_courses:
        if course_lab_blocks[c.course_code] == 0:
            continue
        for day in all_days:
            for bs in lab_block_starts:
                lkey = (c.course_code, day, bs)
                if lkey not in lab_vars:
                    continue
                for p in [bs, bs + 1]:
                    tkey = (c.course_code, day, p)
                    if tkey in theory_vars:
                        model.Add(theory_vars[tkey] + lab_vars[lkey] <= 1)

    # --- C5: Faculty clash ---
    faculty_courses_map = {}
    for c in regular_courses:
        for fid, fname in course_faculty.get(c.course_code, []):
            if not fid or str(fid).lower() in ['nan', 'none']: 
                continue # Skip faculty clash check if no real faculty ID
            if fid not in faculty_courses_map:
                faculty_courses_map[fid] = []
            faculty_courses_map[fid].append(c.course_code)

    for fid, taught_codes in faculty_courses_map.items():
        if len(taught_codes) <= 1:
            continue
        for day in all_days:
            for period in day_periods.get(day, []):
                occupants = []
                for cc in taught_codes:
                    key = (cc, day, period)
                    if key in theory_vars:
                        occupants.append(theory_vars[key])
                    if course_lab_blocks.get(cc, 0) > 0:
                        for bs in lab_block_starts:
                            if period in [bs, bs + 1]:
                                lkey = (cc, day, bs)
                                if lkey in lab_vars:
                                    occupants.append(lab_vars[lkey])
                if len(occupants) > 1:
                    model.Add(sum(occupants) <= 1)

    # --- C11 (SOFT): Theory on same day as lab ---
    theory_lab_same_day_bonus = []
    for c in regular_courses:
        if course_lab_blocks[c.course_code] == 0 or course_theory_count[c.course_code] == 0:
            continue
        for day in all_days:
            day_lab_vars = [lab_vars[(c.course_code, day, bs)]
                            for bs in lab_block_starts
                            if (c.course_code, day, bs) in lab_vars]
            day_theory_vars = [theory_vars[(c.course_code, day, p)]
                               for p in day_periods.get(day, [])
                               if (c.course_code, day, p) in theory_vars]
            if day_lab_vars and day_theory_vars:
                lab_on_day = model.NewBoolVar(f'lab_day_{c.course_code}_{day}')
                theory_on_day = model.NewBoolVar(f'th_day_{c.course_code}_{day}')
                model.AddMaxEquality(lab_on_day, day_lab_vars)
                model.AddMaxEquality(theory_on_day, day_theory_vars)
                both = model.NewBoolVar(f'both_{c.course_code}_{day}')
                model.AddMultiplicationEquality(both, [lab_on_day, theory_on_day])
                theory_lab_same_day_bonus.append(both)

    # --- OBJECTIVE ---
    objective_terms = []
    for v in core_slot_fills:
        objective_terms.append(10 * v)  # Fill slots
    for v in theory_lab_same_day_bonus:
        objective_terms.append(3 * v)   # Theory near lab
    for v in lab_spread_penalties:
        objective_terms.append(-5 * v)  # Avoid consecutive-day labs

    if objective_terms:
        model.Maximize(sum(objective_terms))

    # =========================================================
    # 4. SOLVE
    # =========================================================
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 60.0
    solver.parameters.num_workers = 4

    status = solver.Solve(model)

    if status != cp_model.OPTIMAL and status != cp_model.FEASIBLE:
        print(f"❌ No solution found ({solver.StatusName(status)}).")
        return False

    print(f"✅ Solution Found ({solver.StatusName(status)})")

    # =========================================================
    # 5. SAVE ENTRIES
    # =========================================================
    db.query(models.TimetableEntry).filter_by(
        department_code=department_code, semester=semester
    ).delete()

    count = 0
    filled_slots = set()

    # --- Save THEORY entries ---
    for c in regular_courses:
        fids = course_faculty.get(c.course_code, [])
        fid = fids[0][0] if fids else None
        fname = fids[0][1] if fids else None
        cname = course_names.get(c.course_code, c.course_code)

        for day in all_days:
            for period in day_periods.get(day, []):
                key = (c.course_code, day, period)
                if key in theory_vars and solver.Value(theory_vars[key]):
                    slot_obj = slot_lookup.get((day, period))
                    if slot_obj:
                        entry = models.TimetableEntry(
                            department_code=department_code, semester=semester,
                            course_code=c.course_code, course_name=cname,
                            faculty_id=fid, faculty_name=fname,
                            session_type='THEORY',
                            slot_id=slot_obj.slot_id,
                            day_of_week=day, period_number=period,
                            created_at="now"
                        )
                        db.add(entry)
                        filled_slots.add((day, period))
                        count += 1

    # --- Save LAB entries ---
    for c in regular_courses:
        if course_lab_blocks[c.course_code] == 0:
            continue
        fids = course_faculty.get(c.course_code, [])
        fid = fids[0][0] if fids else None
        fname = fids[0][1] if fids else None
        cname = course_names.get(c.course_code, c.course_code)

        for day in all_days:
            for bs in lab_block_starts:
                lkey = (c.course_code, day, bs)
                if lkey in lab_vars and solver.Value(lab_vars[lkey]):
                    for p in [bs, bs + 1]:
                        slot_obj = slot_lookup.get((day, p))
                        if slot_obj:
                            entry = models.TimetableEntry(
                                department_code=department_code, semester=semester,
                                course_code=c.course_code, course_name=cname,
                                faculty_id=fid, faculty_name=fname,
                                session_type='LAB',
                                slot_id=slot_obj.slot_id,
                                day_of_week=day, period_number=p,
                                created_at="now"
                            )
                            db.add(entry)
                            filled_slots.add((day, p))
                            count += 1

    # =========================================================
    # 6. POST-SOLVE: Honours in P8, fill gaps
    # =========================================================

    # --- Place HONOURS strictly in P8 ---
    if honours_courses:
        p8_slots = [(day, 8) for day in all_days if (day, 8) in slot_lookup
                    and (day, 8) not in filled_slots
                    and not (day == mentor_day_clean and mentor_period == 8)]
                    
        # Group sessions by course code into 'queues'
        course_queues = []
        for c in honours_courses:
            fids = course_faculty.get(c.course_code, [])
            fid = fids[0][0] if fids else None
            fname = fids[0][1] if fids else None
            cname = course_names.get(c.course_code, c.course_code)
            total = c.weekly_sessions or (course_theory_count[c.course_code] + course_lab_blocks[c.course_code] * 2)
            
            queue = []
            for _ in range(total):
                queue.append({
                    'course_code': c.course_code, 'course_name': cname,
                    'faculty_id': fid, 'faculty_name': fname,
                    'session_type': 'THEORY'
                })
            if queue:
                course_queues.append(queue)

        # Loop through P8 slots, picking from the front queue, then rotating it to the back
        for day, period in p8_slots:
            if not course_queues:
                break # All honours sessions assigned
                
            # Pop the first queue
            current_queue = course_queues.pop(0)
            
            # Pop one session from that queue
            hs = current_queue.pop(0)
            
            # Save the entry
            slot_obj = slot_lookup[(day, period)]
            entry = models.TimetableEntry(
                department_code=department_code, semester=semester,
                course_code=hs['course_code'], course_name=hs['course_name'],
                faculty_id=hs['faculty_id'], faculty_name=hs['faculty_name'],
                session_type=hs['session_type'],
                slot_id=slot_obj.slot_id,
                day_of_week=day, period_number=period,
                created_at="now"
            )
            db.add(entry)
            filled_slots.add((day, period))
            count += 1
            
            # If the queue still has sessions left, push it to the BACK of the line
            if current_queue:
                course_queues.append(current_queue)

    # --- MENTOR entry ---
    if (mentor_day_clean, mentor_period) in slot_lookup:
        slot_obj = slot_lookup[(mentor_day_clean, mentor_period)]
        entry = models.TimetableEntry(
            department_code=department_code, semester=semester,
            course_code='MENTOR', course_name='Mentor Interaction',
            faculty_id=None, faculty_name=None,
            session_type='MENTOR',
            slot_id=slot_obj.slot_id,
            day_of_week=mentor_day_clean, period_number=mentor_period,
            created_at="now"
        )
        db.add(entry)
        filled_slots.add((mentor_day_clean, mentor_period))
        count += 1

    # =========================================================
    # 7. EXTRA CREDIT: Free Periods -> Mini Projects & High Credit
    # =========================================================
    
    # 1. Gather all empty periods and group them by day
    empty_by_day = {day: [] for day in all_days}
    for day in all_days:
        for p in day_periods.get(day, []):
            if (day, p) not in filled_slots:
                empty_by_day[day].append(p)
    
    # Extract continuous 2-period blocks and single leftover periods
    free_blocks_2 = []  # List of tuples: (day, p1, p2)
    single_frees = []   # List of tuples: (day, p)
    
    for day, periods in empty_by_day.items():
        periods.sort()
        i = 0
        while i < len(periods):
            if i < len(periods) - 1 and periods[i+1] == periods[i] + 1:
                # We found a continuous 2-period block
                free_blocks_2.append((day, periods[i], periods[i+1]))
                i += 2
            else:
                single_frees.append((day, periods[i]))
                i += 1
                
    # 2. Identify Mini Projects and Highest Credit Courses
    mini_projects = [c for c in courses if "mini project" in (c.course_name or "").lower()]
    
    highest_credits = 0
    if courses:
        highest_credits = max((c.credits or 0) for c in courses)
    high_credit_courses = [c for c in courses if (c.credits or 0) == highest_credits and c not in mini_projects]
    
    # 3. Assign Mini Projects to 2-period blocks first
    for mp in mini_projects:
        if not free_blocks_2:
            break # No more free 2-blocks available
            
        fids = course_faculty.get(mp.course_code, [])
        fid = fids[0][0] if fids else None
        fname = fids[0][1] if fids else None
        
        # Pop the first available 2-period block
        day, p1, p2 = free_blocks_2.pop(0)
        
        for p in [p1, p2]:
            slot_obj = slot_lookup.get((day, p))
            if slot_obj:
                db.add(models.TimetableEntry(
                    department_code=department_code, semester=semester,
                    course_code=mp.course_code, course_name=mp.course_name,
                    faculty_id=fid, faculty_name=fname,
                    session_type='LAB',
                    slot_id=slot_obj.slot_id,
                    day_of_week=day, period_number=p,
                    created_at="now"
                ))
                filled_slots.add((day, p))
                count += 1
                
    # 4. Process remaining free blocks for High-Credit courses
    # Check if a specific day already has a LAB session assigned to ANY course
    def day_has_lab(target_day):
        # We check the database session objects we've staged or the current state
        # the quickest way given our `filled_slots` structure is to reconstruct it:
        # Actually, simpler: in this generation run, we can look through what we've staged to `db`
        for entry in db.new:
            if isinstance(entry, models.TimetableEntry) and entry.day_of_week == target_day and entry.session_type == 'LAB':
                return True
        return False

    high_idx = 0
    
    # First, handle remaining 2-period blocks
    for day, p1, p2 in list(free_blocks_2):  # iterate over a copy
        if high_idx >= len(high_credit_courses):
            break
            
        # Check if the ENTIRE DAY has NO lab
        if not day_has_lab(day):
            # SAFE to assign 2-period block as LAB
            hc = high_credit_courses[high_idx]
            fids = course_faculty.get(hc.course_code, [])
            fid = fids[0][0] if fids else None
            fname = fids[0][1] if fids else None
            
            for p in [p1, p2]:
                slot_obj = slot_lookup.get((day, p))
                if slot_obj:
                    db.add(models.TimetableEntry(
                        department_code=department_code, semester=semester,
                        course_code=hc.course_code, course_name=hc.course_name,
                        faculty_id=fid, faculty_name=fname,
                        session_type='LAB',
                        slot_id=slot_obj.slot_id,
                        day_of_week=day, period_number=p,
                        created_at="now"
                    ))
                    filled_slots.add((day, p))
                    count += 1
                    
            high_idx += 1
            free_blocks_2.remove((day, p1, p2))
        else:
            # Day has a lab. Break the 2-period block into two single periods
            free_blocks_2.remove((day, p1, p2))
            single_frees.extend([(day, p1), (day, p2)])

    # 5. Handle all remaining Single Periods for High-Credit courses
    for day, p in single_frees:
        if high_idx >= len(high_credit_courses):
            break
            
        hc = high_credit_courses[high_idx]
        fids = course_faculty.get(hc.course_code, [])
        fid = fids[0][0] if fids else None
        fname = fids[0][1] if fids else None
        
        slot_obj = slot_lookup.get((day, p))
        if slot_obj:
            db.add(models.TimetableEntry(
                department_code=department_code, semester=semester,
                course_code=hc.course_code, course_name=hc.course_name,
                faculty_id=fid, faculty_name=fname,
                session_type='THEORY',
                slot_id=slot_obj.slot_id,
                day_of_week=day, period_number=p,
                created_at="now"
            ))
            filled_slots.add((day, p))
            count += 1
        
        high_idx += 1

    # --- Fill OPEN ELECTIVE for remaining empty slots ---
    for day in all_days:
        for period in day_periods.get(day, []):
            if (day, period) not in filled_slots:
                slot_obj = slot_lookup.get((day, period))
                if slot_obj:
                    entry = models.TimetableEntry(
                        department_code=department_code, semester=semester,
                        course_code='OPEN_ELEC', course_name='Open Elective',
                        faculty_id=None, faculty_name=None,
                        session_type='OPEN_ELECTIVE',
                        slot_id=slot_obj.slot_id,
                        day_of_week=day, period_number=period,
                        created_at="now"
                    )
                    db.add(entry)
                    count += 1

    db.commit()
    print(f"💾 Saved {count} timetable entries.")
    return True
