from database import SessionLocal
import models
from collections import defaultdict

db = SessionLocal()
rows = db.query(models.TimetableEntry).filter_by(
    department_code='AIDS', semester=6
).order_by(
    models.TimetableEntry.day_of_week, 
    models.TimetableEntry.period_number,
    models.TimetableEntry.course_code
).all()

with open('_entries_result.txt', 'w') as f:
    f.write(f"Total entries: {len(rows)}\n\n")
    
    # Check partner courses
    partner_codes = ['22AI049', '22AI032', '22AI036']
    f.write("=== Partner course entries ===\n")
    for code in partner_codes:
        partner_entries = [r for r in rows if r.course_code == code]
        f.write(f"  {code}: {len(partner_entries)} entries\n")
        for e in partner_entries:
            f.write(f"    {e.day_of_week} P{e.period_number} sec={e.section_number} | {e.faculty_name}\n")
    
    # Check representative courses
    rep_codes = ['22AI020', '22AI025', '22AI035']
    f.write("\n=== Representative course entries ===\n")
    for code in rep_codes:
        rep_entries = [r for r in rows if r.course_code == code]
        f.write(f"  {code}: {len(rep_entries)} entries\n")
        for e in rep_entries:
            f.write(f"    {e.day_of_week} P{e.period_number} sec={e.section_number} | {e.faculty_name}\n")
    
    # Show all slots with multiple different course codes
    slot_entries = defaultdict(list)
    for r in rows:
        key = f"{r.day_of_week}-P{r.period_number}"
        slot_entries[key].append(r)
    
    f.write("\n=== Slots with paired (different) course codes ===\n")
    for key, entries in sorted(slot_entries.items()):
        codes = set(e.course_code for e in entries)
        if len(codes) > 1:
            f.write(f"  {key}: codes={', '.join(sorted(codes))}\n")

db.close()
print("Done - see _entries_result.txt")
