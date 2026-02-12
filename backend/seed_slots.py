import sqlite3
from database import engine, Base
import models

# Create tables
print("Creating slot_master table...")
Base.metadata.create_all(bind=engine)

DB_FILE = r"c:\Users\kalai\Downloads\Sih 6\backend\college_scheduler.db"
conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

print("Seeding slot_master with standard academic schedule...")

# Clear existing slots first
cursor.execute("DELETE FROM slot_master")
conn.commit()

# Standard academic schedule: 5 days, 8 periods + 1 special
days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
periods = [
    (1, '08:45', '09:35'),
    (2, '09:35', '10:25'),
    (3, '10:45', '11:35'),  # 20-min break before
    (4, '11:35', '12:25'),
    (5, '13:30', '14:20'),  # Lunch break before
    (6, '14:20', '15:10'),
    (7, '15:30', '16:20'),  # 20-min break before
    (8, '16:30', '17:30'),  # Special honor/minor slot
]

slot_count = 0
for day in days:
    for period_num, start, end in periods:
        cursor.execute("""
            INSERT INTO slot_master 
            (day_of_week, period_number, start_time, end_time, slot_type, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (day, period_num, start, end, 'REGULAR', True))
        slot_count += 1

# Saturday: Full schedule matching reference timetable
saturday_periods = [
    (1, '08:45', '09:35'),
    (2, '09:35', '10:25'),
    (3, '10:45', '11:35'),
    (4, '11:35', '12:25'),
    (5, '13:30', '14:20'),
    (6, '14:20', '15:10'),
    (7, '15:30', '16:20'),
    (8, '16:30', '17:30'),
]
for period_num, start, end in saturday_periods:
    cursor.execute("""
        INSERT INTO slot_master 
        (day_of_week, period_number, start_time, end_time, slot_type, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
    """, ('Saturday', period_num, start, end, 'REGULAR', True))
    slot_count += 1

conn.commit()
print(f"✅ Created {slot_count} time slots ({len(days)} weekdays + Saturday)")

# Verify
cursor.execute("SELECT COUNT(*) FROM slot_master")
print(f"✅ Total slots in database: {cursor.fetchone()[0]}")

# Show sample
print("\n📋 Sample slots:")
cursor.execute("SELECT slot_id, day_of_week, period_number, start_time, end_time FROM slot_master LIMIT 10")
for row in cursor.fetchall():
    print(f"  Slot {row[0]}: {row[1]} Period {row[2]} ({row[3]}-{row[4]})")

conn.close()
print("\n✨ Slot Master setup complete!")
