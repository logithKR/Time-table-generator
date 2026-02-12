
import models
from database import SessionLocal, engine
from auth import get_password_hash
import random

# Create tables
models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

def seed_data():
    print("Seeding data...")

    # 1. Departments
    depts = ["CSE", "ECE", "MECH", "CIVIL", "IT"]
    
    # 2. Subjects (Realistic Curriculum)
    subjects_data = [
        # Sem 1 Common
        {"code": "MAT101", "name": "Engineering Mathematics I", "sem": 1, "dept": "Common", "hours": 4},
        {"code": "PHY101", "name": "Engineering Physics", "sem": 1, "dept": "Common", "hours": 3},
        {"code": "ENG101", "name": "Communicative English", "sem": 1, "dept": "Common", "hours": 2},
        # Sem 3 CSE
        {"code": "CS301", "name": "Data Structures", "sem": 3, "dept": "CSE", "hours": 4},
        {"code": "CS302", "name": "Digital Logic Design", "sem": 3, "dept": "CSE", "hours": 3},
        {"code": "CS303", "name": "Object Oriented Programming", "sem": 3, "dept": "CSE", "hours": 4},
        {"code": "CS304", "name": "Computer Architecture", "sem": 3, "dept": "CSE", "hours": 3},
        {"code": "CS305", "name": "Discrete Mathematics", "sem": 3, "dept": "CSE", "hours": 4},
        # Sem 5 CSE
        {"code": "CS501", "name": "Operating Systems", "sem": 5, "dept": "CSE", "hours": 4},
        {"code": "CS502", "name": "Database Management Systems", "sem": 5, "dept": "CSE", "hours": 4},
        {"code": "CS503", "name": "Theory of Computation", "sem": 5, "dept": "CSE", "hours": 4},
        {"code": "CS504", "name": "Computer Networks", "sem": 5, "dept": "CSE", "hours": 3},
        # Sem 3 ECE
        {"code": "EC301", "name": "Circuit Theory", "sem": 3, "dept": "ECE", "hours": 4},
        {"code": "EC302", "name": "Electronic Devices", "sem": 3, "dept": "ECE", "hours": 3},
        {"code": "EC303", "name": "Signals and Systems", "sem": 3, "dept": "ECE", "hours": 4},
    ]

    db_subjects = []
    for s in subjects_data:
        existing = db.query(models.Subject).filter(models.Subject.code == s["code"]).first()
        if not existing:
            new_sub = models.Subject(
                code=s["code"],
                name=s["name"],
                semester=s["sem"],
                department=s["dept"],
                classes_per_week=s["hours"],
                duration=1
            )
            db.add(new_sub)
            db_subjects.append(new_sub)
    db.commit()
    # Reload subjects to get IDs
    all_subjects = db.query(models.Subject).all()
    print(f"Added {len(all_subjects)} subjects.")

    # 3. Faculty (Professors)
    faculty_data = [
        {"name": "Dr. Alan Turing", "dept": "CSE", "email": "alan@college.edu"},
        {"name": "Dr. Grace Hopper", "dept": "CSE", "email": "grace@college.edu"},
        {"name": "Prof. Ada Lovelace", "dept": "CSE", "email": "ada@college.edu"},
        {"name": "Dr. Claude Shannon", "dept": "ECE", "email": "claude@college.edu"},
        {"name": "Prof. John von Neumann", "dept": "Common", "email": "john@college.edu"},
        {"name": "Dr. Richard Feynman", "dept": "Common", "email": "richard@college.edu"},
        {"name": "Prof. Barbara Liskov", "dept": "CSE", "email": "barbara@college.edu"},
    ]

    for f in faculty_data:
        existing = db.query(models.Faculty).filter(models.Faculty.email == f["email"]).first()
        if not existing:
            # Assign random subjects they can teach based on dept
            teachable_subjects = [s for s in all_subjects if s.department == f["dept"] or s.department == "Common" or f["dept"] == "Common"]
            if not teachable_subjects and f["dept"] == "CSE":
                 teachable_subjects = [s for s in all_subjects if s.department == "CSE"] # Fallback

            # Random availability (0-7 hours, Mon-Fri)
            availability = {
                "Monday": [0, 1, 2, 3, 4, 5, 6, 7],
                "Tuesday": [0, 1, 2, 3, 4, 5, 6, 7],
                "Wednesday": [0, 1, 2, 3, 4, 5, 6, 7],
                "Thursday": [0, 1, 2, 3, 4, 5, 6, 7],
                "Friday": [0, 1, 2, 3, 4, 5, 6, 7]
            }

            new_fac = models.Faculty(
                name=f["name"],
                email=f["email"],
                department=f["dept"],
                max_load=18,
                avg_leaves=2,
                availability=availability
            )
            # Link subjects
            # Randomly pick 2-4 subjects they can teach
            k = min(len(teachable_subjects), random.randint(2, 4))
            new_fac.subjects = random.sample(teachable_subjects, k)
            
            db.add(new_fac)
    db.commit()
    print("Added Faculty.")

    # 4. Classrooms
    rooms_data = [
        {"name": "LH-101", "cap": 60, "lab": 0},
        {"name": "LH-102", "cap": 60, "lab": 0},
        {"name": "LH-103", "cap": 60, "lab": 0},
        {"name": "LH-201", "cap": 60, "lab": 0},
        {"name": "CS-LAB-1", "cap": 30, "lab": 1},
        {"name": "CS-LAB-2", "cap": 30, "lab": 1},
        {"name": "EC-LAB-1", "cap": 30, "lab": 1},
    ]

    for r in rooms_data:
        existing = db.query(models.Classroom).filter(models.Classroom.room_name == r["name"]).first()
        if not existing:
            new_room = models.Classroom(
                room_name=r["name"],
                capacity=r["cap"],
                is_lab=r["lab"]
            )
            db.add(new_room)
    db.commit()
    print("Added Classrooms.")

    # 5. Batches (Student Groups)
    batches_data = [
        {"name": "CSE-II-A", "sem": 3, "size": 55, "dept": "CSE"},
        {"name": "CSE-II-B", "sem": 3, "size": 55, "dept": "CSE"},
        {"name": "CSE-III-A", "sem": 5, "size": 50, "dept": "CSE"},
        {"name": "ECE-II-A", "sem": 3, "size": 45, "dept": "ECE"},
    ]

    for b in batches_data:
        existing = db.query(models.Batch).filter(models.Batch.name == b["name"]).first()
        if not existing:
            new_batch = models.Batch(
                name=b["name"],
                semester=b["sem"],
                size=b["size"],
                department=b["dept"]
            )
            db.add(new_batch)
    db.commit()
    print("Added Batches.")
    
    # Check Admin
    admin = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin:
        admin_user = models.User(
            username="admin",
            hashed_password=get_password_hash("admin123"), # Default password
            role="admin"
        )
        db.add(admin_user)
        db.commit()
        print("created admin user")

    db.close()
    print("Seeding Complete!")

if __name__ == "__main__":
    seed_data()
