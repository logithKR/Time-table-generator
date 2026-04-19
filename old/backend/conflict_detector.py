import collections
from typing import Dict, List, Any
from sqlalchemy.orm import Session
import models

def detect_conflicts(db: Session, target_department: str = None, target_semester: int = None) -> Dict[str, List[Dict[str, Any]]]:
    """
    Scans the TimetableEntry table for genuine conflicts:
    1. Faculty Conflict: Same faculty ID scheduled in the same (day, period).
    2. Venue Conflict: Same venue name scheduled in the same (day, period) and section_number == 1
       (section_number=2 implies meant to be split/shared like common courses).
    
    Returns a dictionary of conflicts affecting the target_department.
    """
    
    # 1. Fetch all timetable entries (we need global context to detect cross-department clashes)
    all_entries = db.query(models.TimetableEntry).all()
    
    faculty_slots = collections.defaultdict(list)  # (day, period, faculty_id) -> [entries]
    venue_slots = collections.defaultdict(list)    # (day, period, venue_name) -> [entries]
    
    for entry in all_entries:
        key_fac = (entry.day_of_week, entry.period_number, entry.faculty_id)
        if entry.faculty_id and entry.faculty_id.strip().upper() not in ('NONE', 'UNASSIGNED', ''):
            faculty_slots[key_fac].append(entry)
            
        key_ven = (entry.day_of_week, entry.period_number, entry.venue_name)
        # Only count section 1 as taking up the whole room, or if section is not 2
        # (common courses sync use section_number=2 to share the room)
        if entry.venue_name and entry.venue_name.strip().upper() not in ('NONE', 'UNASSIGNED', '') and entry.section_number != 2:
            venue_slots[key_ven].append(entry)

    faculty_conflicts = []
    venue_conflicts = []
    
    # Process Faculty Conflicts
    for (day, period, fid), entries in faculty_slots.items():
        if len(entries) > 1:
            # Check if any of these entries belong to the target department
            if target_department and not any(e.department_code == target_department for e in entries):
                continue
            if target_semester and not any(e.semester == target_semester for e in entries):
                continue
                
            # Filter out identical common course syncs (same course, same fac, but diff depts)
            # A real clash is when the *course code* or *section number* is different
            unique_classes = set((e.course_code, e.section_number) for e in entries)
            if len(unique_classes) > 1:
                conflict_details = {
                    "faculty_id": fid,
                    "faculty_name": entries[0].faculty_name,
                    "day": day,
                    "period": period,
                    "courses": [
                        {"dept": e.department_code, "sem": e.semester, "course": f"{e.course_code} (S{e.section_number})"}
                        for e in entries
                    ],
                    "suggestion": f"Faculty {entries[0].faculty_name} is scheduled in {len(unique_classes)} different classes on {day} P{period}. Reassign one course."
                }
                faculty_conflicts.append(conflict_details)

    # Process Venue Conflicts
    for (day, period, vname), entries in venue_slots.items():
        if len(entries) > 1:
            if target_department and not any(e.department_code == target_department for e in entries):
                continue
            if target_semester and not any(e.semester == target_semester for e in entries):
                continue
                
            unique_classes = set((e.course_code, e.section_number) for e in entries)
            if len(unique_classes) > 1:
                conflict_details = {
                    "venue_name": vname,
                    "day": day,
                    "period": period,
                    "courses": [
                        {"dept": e.department_code, "sem": e.semester, "course": f"{e.course_code} (S{e.section_number})"}
                        for e in entries
                    ],
                    "suggestion": f"Venue {vname} is booked for {len(unique_classes)} different classes on {day} P{period}. Change venue for one course."
                }
                venue_conflicts.append(conflict_details)

    return {
        "faculty_conflicts": faculty_conflicts,
        "venue_conflicts": venue_conflicts
    }
