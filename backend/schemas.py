from pydantic import BaseModel
from typing import List, Optional

# --- Requests ---
class GenerateRequest(BaseModel):
    department_code: str
    semester: int
    mentor_day: str 
    mentor_period: int = 8

class CourseCreate(BaseModel):
    course_code: str
    course_name: str
    department_code: str
    semester: int
    lecture_hours: int = 0
    tutorial_hours: int = 0
    practical_hours: int = 0
    credits: int = 0
    weekly_sessions: int = 1
    is_lab: bool = False
    is_honours: bool = False
    is_minor: bool = False
    is_elective: bool = False
    is_open_elective: bool = False
    is_add_course: bool = False

class FacultyCreate(BaseModel):
    faculty_id: str
    faculty_name: str
    faculty_email: Optional[str] = None
    department_code: str
    status: str = "Active"

class CourseFacultyCreate(BaseModel):
    course_code: str
    faculty_id: str
    department_code: str
    delivery_type: Optional[str] = "Theory"

class DepartmentCreate(BaseModel):
    department_code: str
    student_count: Optional[int] = 0

class DepartmentUpdate(BaseModel):
    student_count: Optional[int] = None

class SlotCreate(BaseModel):
    day_of_week: str
    period_number: int
    start_time: str
    end_time: str
    slot_type: str = "REGULAR"
    is_active: bool = True

class SlotUpdate(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    slot_type: Optional[str] = None
    is_active: Optional[bool] = None

# --- Responses ---

class Department(BaseModel):
    department_code: str
    student_count: Optional[int] = 0
    class Config:
        orm_mode = True

class Faculty(BaseModel):
    faculty_id: str
    faculty_name: str
    faculty_email: Optional[str] = None
    department_code: str
    status: Optional[str] = "Active"
    class Config:
        orm_mode = True

class Course(BaseModel):
    course_code: str
    course_name: str
    department_code: str
    semester: int
    lecture_hours: Optional[int] = 0
    tutorial_hours: Optional[int] = 0
    practical_hours: Optional[int] = 0
    credits: Optional[int] = 0
    weekly_sessions: int
    is_lab: Optional[bool] = False
    is_honours: Optional[bool] = False
    is_minor: Optional[bool] = False
    is_elective: Optional[bool] = False
    is_open_elective: Optional[bool] = False
    is_add_course: Optional[bool] = False
    class Config:
        orm_mode = True

class Slot(BaseModel):
    slot_id: int
    day_of_week: str
    period_number: int
    start_time: str
    end_time: str
    slot_type: str
    is_active: bool = True
    class Config:
        orm_mode = True

class VenueCreate(BaseModel):
    venue_name: str
    block: Optional[str] = None
    is_lab: bool = False
    capacity: int = 60

class Venue(VenueCreate):
    venue_id: int
    class Config:
        orm_mode = True

class TimetableEntry(BaseModel):
    id: int
    department_code: str
    semester: int
    course_code: str
    course_name: Optional[str] = None
    faculty_id: Optional[str] = None
    faculty_name: Optional[str] = None
    session_type: Optional[str] = None
    slot_id: int
    day_of_week: str
    period_number: int
    venue_name: Optional[str] = None
    
    class Config:
        orm_mode = True


class TimetableEntryCreate(BaseModel):
    department_code: str
    semester: int
    course_code: str
    course_name: Optional[str] = None
    faculty_id: Optional[str] = None
    faculty_name: Optional[str] = None
    session_type: Optional[str] = None
    slot_id: int
    day_of_week: str
    period_number: int
    venue_name: Optional[str] = None

class TimetableSaveRequest(BaseModel):
    department_code: str
    semester: int
    entries: List[TimetableEntryCreate]

class DepartmentVenueCreate(BaseModel):
    department_code: str
    venue_id: int

class DepartmentVenueResponse(BaseModel):
    id: int
    department_code: str
    venue_id: int
    venue_name: Optional[str] = None
    is_lab: Optional[bool] = False
    capacity: Optional[int] = 60
    
    class Config:
        orm_mode = True

class CourseVenueCreate(BaseModel):
    department_code: str
    course_code: str
    venue_id: int

class CourseVenueResponse(BaseModel):
    id: int
    department_code: str
    course_code: str
    venue_id: int
    venue_name: Optional[str] = None
    is_lab: Optional[bool] = False
    capacity: Optional[int] = 60
    
    class Config:
        orm_mode = True

class DepartmentSemesterCountUpdate(BaseModel):
    student_count: int

class DepartmentSemesterCountResponse(BaseModel):
    id: int
    department_code: str
    semester: int
    student_count: int
    
    class Config:
        orm_mode = True
