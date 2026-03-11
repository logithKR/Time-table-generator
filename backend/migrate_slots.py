import json
from database import SessionLocal
import models

def migrate_slots():
    db = SessionLocal()
    slots = db.query(models.SlotMaster).all()
    count = 0
    for slot in slots:
        if not slot.semester_ids or slot.semester_ids == "[]":
            slot.semester_ids = json.dumps([1,2,3,4,5,6,7,8])
            count += 1
    
    db.commit()
    print(f"Migrated {count} slots to explicitly cover Semesters 1-8.")

if __name__ == "__main__":
    migrate_slots()
