from pydantic import BaseModel
from typing import List, Optional

# --- Requests ---
class GenerateRequest(BaseModel):
    department_code: str
    semester: int
    mentor_day: str 
    mentor_period: int = 8

class SemesterConfigUpdate(BaseModel):
    academic_year: str

class SemesterConfigResponse(BaseModel):
    semester: int
    academic_year: str
    class Config:
        from_attributes = True


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
    common_departments: Optional[List[str]] = []

class CourseUpdate(BaseModel):
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    department_code: Optional[str] = None
    semester: Optional[int] = None
    lecture_hours: Optional[int] = None
    tutorial_hours: Optional[int] = None
    practical_hours: Optional[int] = None
    credits: Optional[int] = None
    weekly_sessions: Optional[int] = None
    is_lab: Optional[bool] = None
    is_honours: Optional[bool] = None
    is_minor: Optional[bool] = None
    is_elective: Optional[bool] = None
    is_open_elective: Optional[bool] = None
    is_add_course: Optional[bool] = None
    common_departments: Optional[List[str]] = None

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
    pair_add_course_miniproject: Optional[bool] = False

class DepartmentUpdate(BaseModel):
    student_count: Optional[int] = None
    pair_add_course_miniproject: Optional[bool] = None

class SlotCreate(BaseModel):
    day_of_week: str
    period_number: int
    start_time: str
    end_time: str
    slot_type: str = "REGULAR"
    is_active: bool = True
    semester_ids: Optional[List[int]] = []

class SlotUpdate(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    slot_type: Optional[str] = None
    is_active: Optional[bool] = None
    semester_ids: Optional[List[int]] = None

# --- Responses ---

class Department(BaseModel):
    department_code: str
    student_count: Optional[int] = 0
    pair_add_course_miniproject: Optional[bool] = False
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
    enrolled_students: Optional[int] = 0
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
    semester_ids: Optional[List[int]] = []
    class Config:
        orm_mode = True

class BreakConfigCreate(BaseModel):
    break_type: str
    start_time: str
    end_time: str
    semester_ids: Optional[List[int]] = []

class BreakConfigUpdate(BaseModel):
    break_type: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    semester_ids: Optional[List[int]] = None

class BreakConfig(BaseModel):
    id: int
    break_type: str
    start_time: str
    end_time: str
    semester_ids: Optional[List[int]] = []
    
    class Config:
        orm_mode = True

class VenueCreate(BaseModel):
    venue_name: str
    block: Optional[str] = None
    is_lab: bool = False
    capacity: int = 60

class VenueUpdate(BaseModel):
    venue_name: Optional[str] = None
    block: Optional[str] = None
    is_lab: Optional[bool] = None
    capacity: Optional[int] = None

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
    section_number: Optional[int] = 1
    is_honours: Optional[bool] = False
    is_minor: Optional[bool] = False
    is_elective: Optional[bool] = False
    is_open_elective: Optional[bool] = False
    is_add_course: Optional[bool] = False
    strength: Optional[int] = None
    total_sections: Optional[int] = 1
    dept_breakdown: Optional[list] = None  # [{dept: "CSE", count: 60}, ...] for common courses
    combined_strength: Optional[int] = None  # total across all depts in a common course
    is_common_course: Optional[bool] = False
    
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
    section_number: Optional[int] = 1

class TimetableSaveRequest(BaseModel):
    department_code: str
    semester: int
    entries: List[TimetableEntryCreate]

class DepartmentVenueCreate(BaseModel):
    department_code: str
    venue_id: int
    semester: int

class DepartmentVenueResponse(BaseModel):
    id: int
    department_code: str
    semester: int
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
    venue_type: Optional[str] = 'BOTH'  # 'THEORY', 'LAB', or 'BOTH'

class CourseVenueResponse(BaseModel):
    id: int
    department_code: str
    course_code: str
    venue_id: int
    venue_name: Optional[str] = None
    is_lab: Optional[bool] = False
    capacity: Optional[int] = 60
    venue_type: Optional[str] = 'BOTH'
    
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

# --- Students & Registrations ---

class StudentBase(BaseModel):
    student_id: str
    name: str
    email: Optional[str] = None
    department_code: str

class StudentCreate(StudentBase):
    pass

class StudentResponse(StudentBase):
    class Config:
        orm_mode = True

class CourseRegistrationBase(BaseModel):
    student_id: str
    course_code: str
    semester: int

class CourseRegistrationCreate(CourseRegistrationBase):
    pass

class CourseRegistrationResponse(CourseRegistrationBase):
    id: int
    
    class Config:
        orm_mode = True


class PersonalTimetableResponse(BaseModel):
    conflicts: List[str]
    timetable: List[TimetableEntry]
    
    class Config:
        orm_mode = True


# --- Conflict Check ---

class ConflictCheckEntry(BaseModel):
    faculty_name: Optional[str] = None
    venue_name: Optional[str] = None
    day_of_week: str
    period_number: int
    course_code: Optional[str] = None

class ConflictCheckRequest(BaseModel):
    department_code: str
    semester: int
    entries: List[ConflictCheckEntry]


# --- User Constraints ---

class UserConstraintCreate(BaseModel):
    name: str
    description: Optional[str] = None
    enabled: bool = True
    priority: str = "HARD"
    soft_weight: int = 0
    constraint_type: str
    scope: dict
    target: dict
    rules: dict

class UserConstraintUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None
    priority: Optional[str] = None
    soft_weight: Optional[int] = None
    constraint_type: Optional[str] = None
    scope: Optional[dict] = None
    target: Optional[dict] = None
    rules: Optional[dict] = None

class UserConstraintResponse(BaseModel):
    id: int
    uuid: str
    name: str
    description: Optional[str] = None
    enabled: bool
    priority: str
    soft_weight: int
    constraint_type: str
    scope: dict
    target: dict
    rules: dict
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    order_index: int

    class Config:
        orm_mode = True

class UserConstraintReorderRequest(BaseModel):
    order: List[str]   # list of UUIDs in desired order
