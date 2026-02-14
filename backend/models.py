from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Index
from database import Base

class DepartmentMaster(Base):
    __tablename__ = "department_master"
    
    department_code = Column(String, primary_key=True)


class FacultyMaster(Base):
    __tablename__ = "faculty_master"
    
    faculty_id = Column(String, primary_key=True)
    faculty_name = Column(String, nullable=False)
    faculty_email = Column(String)
    department_code = Column(String, ForeignKey('department_master.department_code'), nullable=False)
    status = Column(String, default='ACTIVE')


# Index for faster queries
Index('idx_faculty_department', FacultyMaster.department_code)


class CourseMaster(Base):
    __tablename__ = "course_master"
    
    course_code = Column(String, primary_key=True)
    course_name = Column(String, nullable=False)
    department_code = Column(String, ForeignKey('department_master.department_code'), nullable=False)
    semester = Column(Integer, nullable=False)
    
    course_category = Column(String)
    delivery_type = Column(String)
    
    lecture_hours = Column(Integer, default=0)
    tutorial_hours = Column(Integer, default=0)
    practical_hours = Column(Integer, default=0)
    
    weekly_sessions = Column(Integer, nullable=False)
    credits = Column(Integer)
    
    is_lab = Column(Boolean, default=False)
    is_elective = Column(Boolean, default=False)
    is_open_elective = Column(Boolean, default=False)
    is_honours = Column(Boolean, default=False)
    is_minor = Column(Boolean, default=False)


# Index for faster queries
Index('idx_course_department_semester', CourseMaster.department_code, CourseMaster.semester)


class CourseFacultyMap(Base):
    __tablename__ = "course_faculty_map"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    course_code = Column(String, ForeignKey('course_master.course_code'), nullable=False)
    faculty_id = Column(String, ForeignKey('faculty_master.faculty_id'), nullable=False)
    department_code = Column(String, ForeignKey('department_master.department_code'), nullable=False)
    delivery_type = Column(String)


# Index for faster queries
Index('idx_course_faculty', CourseFacultyMap.course_code, CourseFacultyMap.faculty_id)


class SlotMaster(Base):
    __tablename__ = "slot_master"
    
    slot_id = Column(Integer, primary_key=True, autoincrement=True)
    day_of_week = Column(String, nullable=False)  # Monday, Tuesday, etc.
    period_number = Column(Integer, nullable=False)  # 1, 2, 3, etc.
    start_time = Column(String, nullable=False)  # e.g., "09:00"
    end_time = Column(String, nullable=False)  # e.g., "09:50"
    slot_type = Column(String, default='REGULAR')  # REGULAR, LUNCH, BREAK
    is_active = Column(Boolean, default=True)


# Composite index for day + period lookup
Index('idx_slot_day_period', SlotMaster.day_of_week, SlotMaster.period_number)


class TimetableEntry(Base):
    __tablename__ = "timetable_entries"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    department_code = Column(String, ForeignKey('department_master.department_code'), nullable=False)
    semester = Column(Integer, nullable=False)
    course_code = Column(String, nullable=False)  # No FK - allows OPEN_ELECTIVE, MENTOR
    course_name = Column(String, nullable=True)
    faculty_id = Column(String, nullable=True)
    faculty_name = Column(String, nullable=True)
    session_type = Column(String, default='THEORY')  # THEORY, LAB, MENTOR, OPEN_ELECTIVE
    slot_id = Column(Integer, ForeignKey('slot_master.slot_id'), nullable=False)
    
    # Denormalized for easier querying
    day_of_week = Column(String)
    period_number = Column(Integer)
    
    created_at = Column(String)


class VenueMaster(Base):
    __tablename__ = "venue_master"
    
    venue_id = Column(Integer, primary_key=True, autoincrement=True)
    venue_name = Column(String, unique=True, index=True, nullable=False)
    block = Column(String, nullable=True)
    is_lab = Column(Boolean, default=False)
    capacity = Column(Integer, default=60)

# Index for fast retrieval by dept/sem
Index('idx_timetable_dept_sem', TimetableEntry.department_code, TimetableEntry.semester)
