# Automated Academic Timetable Generator & Synchronizer — Full Project Context

## PROJECT OVERVIEW

This is a full-stack academic timetable scheduling platform built for a college (BIT Sathy). It uses Google OR-Tools (CP-SAT constraint solver) to automatically generate clash-free timetables. It features a React web dashboard, a FastAPI backend, and a custom ETL pipeline that syncs data from the university's remote MySQL CMS database into a local SQLite cache.

---

## TECH STACK

### Backend (Python)
- **Framework**: FastAPI (async REST API)
- **ORM**: SQLAlchemy (declarative models)
- **Database**: SQLite (`college_scheduler.db` for app data, `cms_local.db` for CMS mirror)
- **Solver**: Google OR-Tools (`ortools.sat.python.cp_model`)
- **ETL**: PyMySQL + Pandas (for CMS sync)
- **Other**: Pydantic (schemas/validation), openpyxl (Excel export), python-docx (report generation)

### Frontend (JavaScript)
- **Framework**: React 19 + Vite
- **Styling**: TailwindCSS 4
- **HTTP Client**: Axios
- **PDF Export**: jspdf + html-to-image + html2canvas
- **Drag & Drop**: @dnd-kit
- **Animations**: framer-motion
- **Icons**: lucide-react

### Infrastructure
- **Auth**: Firebase (session-based persistence)
- **CMS Source**: Remote MySQL at `10.150.20.153:3306` (database: `cms`)
- **Dev Server**: Backend on `localhost:8000`, Frontend on `localhost:5173`

---

## PROJECT FILE STRUCTURE

```
time table/
├── backend/
│   ├── main.py                    # FastAPI app — all REST endpoints (2490 lines)
│   ├── models.py                  # SQLAlchemy ORM models (246 lines)
│   ├── schemas.py                 # Pydantic request/response schemas (372 lines)
│   ├── database.py                # SQLAlchemy engine & session setup
│   ├── solver_engine.py           # CP-SAT constraint solver (1807 lines)
│   ├── conflict_detector.py       # Cross-department clash detection (88 lines)
│   ├── constraint_interpreter.py  # User-defined constraint processing (572 lines)
│   ├── sync_cms_to_local.py       # ETL: MySQL CMS → local SQLite mirror
│   ├── download_cms.py            # CMS data download utilities
│   ├── generate_report.py         # Auto-generate .docx project report
│   ├── scheduler.py               # Scheduler utilities
│   ├── college_scheduler.db       # Main app SQLite database
│   ├── cms_local.db               # Local mirror of CMS MySQL database
│   ├── cms_schema.json            # Schema snapshot of CMS tables
│   └── requirements.txt           # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Main app component (155KB, massive single-file)
│   │   ├── main.jsx               # React entry point
│   │   ├── index.css              # Global styles
│   │   ├── utils/
│   │   │   └── api.js             # Axios API client (185 lines, all endpoints)
│   │   └── components/
│   │       ├── TimetableEditor.jsx       # Main timetable grid editor (98KB)
│   │       ├── UserConstraints.jsx       # Constraint management UI (61KB)
│   │       ├── VenueMapping.jsx          # Venue allocation UI (44KB)
│   │       ├── BITTimetable.jsx          # BIT-specific timetable view (38KB)
│   │       ├── FacultyTimetable.jsx      # Per-faculty timetable view
│   │       ├── VenueTimetable.jsx        # Per-venue timetable view
│   │       ├── StudentTimetable.jsx      # Per-student timetable view
│   │       ├── StudentRegistrations.jsx  # Course registration UI
│   │       ├── ConstraintsManager.jsx    # Constraints config panel
│   │       ├── SubjectManager.jsx        # Course CRUD
│   │       ├── Venues.jsx               # Venue CRUD
│   │       ├── DepartmentsManager.jsx   # Department CRUD
│   │       ├── FacultyManager.jsx       # Faculty CRUD
│   │       ├── InteractiveBuilder.jsx   # Drag-and-drop timetable builder
│   │       ├── TimetableResults.jsx     # Results display
│   │       ├── ClassroomManager.jsx     # Classroom management
│   │       ├── BatchManager.jsx         # Batch/section management
│   │       └── SettingsManager.jsx      # App settings
│   ├── package.json
│   └── vite.config.js
├── data/                          # Excel source data files
│   ├── Coursewise Allocation - 2025-26 EVEN.xlsx
│   ├── faculty-details.xlsx
│   ├── course-details.xlsx
│   └── campus_classrooms_labs_organized.xlsx
├── Dump20260318.sql               # MySQL dump of CMS database
└── start_servers.bat              # Script to start both backend & frontend
```

---

## DATABASE SCHEMA

### Database 1: `college_scheduler.db` (Main Application Database)

This is the primary operational database. All tables are created by SQLAlchemy from `models.py`.

#### `department_master`
| Column | Type | Constraints |
|--------|------|-------------|
| `department_code` | String | **PRIMARY KEY** (e.g., "CSE", "AGRI") |
| `student_count` | Integer | Default 0 |
| `pair_add_course_miniproject` | Boolean | Default False |

#### `faculty_master`
| Column | Type | Constraints |
|--------|------|-------------|
| `faculty_id` | String | **PRIMARY KEY** (e.g., "AG10895") |
| `faculty_name` | String | NOT NULL |
| `faculty_email` | String | Nullable |
| `department_code` | String | **FK → department_master** |
| `status` | String | Default 'ACTIVE' |
- Index: `idx_faculty_department` on `department_code`

#### `course_master`
| Column | Type | Constraints |
|--------|------|-------------|
| `course_code` | String | **COMPOSITE PK** |
| `department_code` | String | **COMPOSITE PK**, FK → department_master |
| `semester` | Integer | **COMPOSITE PK** |
| `course_name` | String | NOT NULL |
| `course_category` | String | Nullable |
| `delivery_type` | String | Nullable |
| `lecture_hours` | Integer | Default 0 |
| `tutorial_hours` | Integer | Default 0 |
| `practical_hours` | Integer | Default 0 |
| `weekly_sessions` | Integer | NOT NULL |
| `credits` | Integer | Nullable |
| `is_lab` | Boolean | Default False |
| `is_elective` | Boolean | Default False |
| `is_open_elective` | Boolean | Default False |
| `is_honours` | Boolean | Default False |
| `is_minor` | Boolean | Default False |
| `is_add_course` | Boolean | Default False |
| `enrolled_students` | Integer | Default 0 |
- Index: `idx_course_department_semester` on `(department_code, semester)`
- **Key design**: Composite PK allows same course code across multiple departments

#### `student_master`
| Column | Type | Constraints |
|--------|------|-------------|
| `student_id` | String | **PRIMARY KEY** |
| `name` | String | NOT NULL |
| `email` | String | Nullable |
| `department_code` | String | FK → department_master |

#### `course_registrations`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | **PRIMARY KEY** (autoincrement) |
| `student_id` | String | FK → student_master |
| `course_code` | String | FK → course_master |
| `semester` | Integer | NOT NULL |
- Unique constraint: `(student_id, course_code, semester)`

#### `course_faculty_map`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | **PRIMARY KEY** (autoincrement) |
| `course_code` | String | FK → course_master |
| `faculty_id` | String | FK → faculty_master |
| `department_code` | String | FK → department_master |
| `delivery_type` | String | Nullable (Theory / Lab / Theory With Lab / Offline) |
- Index: `idx_course_faculty` on `(course_code, faculty_id)`

#### `slot_master`
| Column | Type | Constraints |
|--------|------|-------------|
| `slot_id` | Integer | **PRIMARY KEY** (autoincrement) |
| `day_of_week` | String | NOT NULL (Monday–Saturday) |
| `period_number` | Integer | NOT NULL (1–8) |
| `start_time` | String | NOT NULL (e.g., "09:00") |
| `end_time` | String | NOT NULL (e.g., "09:50") |
| `slot_type` | String | Default 'REGULAR' (REGULAR/LUNCH/BREAK) |
| `is_active` | Boolean | Default True |
| `semester_ids` | String | JSON-encoded list of ints, e.g. `[4, 6]` |
- Index: `idx_slot_day_period` on `(day_of_week, period_number)`

#### `break_config_master`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | **PRIMARY KEY** (autoincrement) |
| `break_type` | String | NOT NULL (FN/LUNCH/AN) |
| `start_time` | String | NOT NULL |
| `end_time` | String | NOT NULL |
| `semester_ids` | String | JSON-encoded list of ints |

#### `timetable_entries`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | **PRIMARY KEY** (autoincrement) |
| `department_code` | String | FK → department_master |
| `semester` | Integer | NOT NULL |
| `course_code` | String | NOT NULL (no FK, supports special codes like OPEN_ELECTIVE, MENTOR) |
| `course_name` | String | Nullable |
| `faculty_id` | String | Nullable |
| `faculty_name` | String | Nullable |
| `session_type` | String | Default 'THEORY' (THEORY/LAB/MENTOR/OPEN_ELECTIVE/BLOCKED) |
| `slot_id` | Integer | FK → slot_master |
| `day_of_week` | String | Denormalized |
| `period_number` | Integer | Denormalized |
| `venue_name` | String | Nullable |
| `section_number` | Integer | Default 1 |
| `created_at` | String | Nullable |
- Index: `idx_timetable_dept_sem` on `(department_code, semester)`

#### `venue_master`
| Column | Type | Constraints |
|--------|------|-------------|
| `venue_id` | Integer | **PRIMARY KEY** (autoincrement) |
| `venue_name` | String | UNIQUE, indexed |
| `block` | String | Nullable |
| `is_lab` | Boolean | Default False |
| `capacity` | Integer | Default 60 |

#### `department_venue_map`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | **PRIMARY KEY** (autoincrement) |
| `department_code` | String | FK → department_master |
| `venue_id` | Integer | FK → venue_master |
| `semester` | Integer | Default 6 |
- Index: `idx_dept_sem_venue` on `(department_code, semester, venue_id)`

#### `department_semester_count`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | **PRIMARY KEY** (autoincrement) |
| `department_code` | String | FK → department_master |
| `semester` | Integer | NOT NULL |
| `student_count` | Integer | Default 0 |

#### `semester_config`
| Column | Type | Constraints |
|--------|------|-------------|
| `semester` | Integer | **PRIMARY KEY** |
| `academic_year` | String | Default "" |

#### `course_venue_map`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | **PRIMARY KEY** (autoincrement) |
| `department_code` | String | FK → department_master |
| `course_code` | String | FK → course_master |
| `venue_id` | Integer | FK → venue_master |
| `venue_type` | String | Default 'BOTH' (THEORY/LAB/BOTH) |

#### `scheduler_config`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | **PRIMARY KEY** (default 1, singleton) |
| `config_json` | String | NOT NULL — JSON blob with all constraint settings |

#### `common_course_map`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | **PRIMARY KEY** (autoincrement) |
| `course_code` | String | NOT NULL |
| `semester` | Integer | NOT NULL |
| `department_code` | String | FK → department_master |
| `venue_name` | String | Nullable — global locked venue |
| `venue_type` | String | Default 'BOTH' |
- Unique constraint: `(course_code, semester, department_code)`
- **Purpose**: Links one course across multiple departments to share the same timetable slot

#### `user_constraints`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | Integer | **PRIMARY KEY** (autoincrement) |
| `uuid` | String | UNIQUE, NOT NULL |
| `name` | String | NOT NULL |
| `description` | String | Nullable |
| `enabled` | Boolean | Default True |
| `priority` | String | Default 'HARD' (HARD/SOFT/PREFERENCE) |
| `soft_weight` | Integer | Default 0 |
| `constraint_type` | String | NOT NULL (COURSE_INJECTION / SLOT_BLOCKING / FACULTY_RULE / SPACING_RULE / DISTRIBUTION_RULE) |
| `scope_json` | String | JSON: `{departments, semesters, sections}` |
| `target_json` | String | JSON: `{type, course_code, faculty_id, ...}` |
| `rules_json` | String | JSON: `{sessions_per_week, day_preference, ...}` |
| `created_at` | String | Nullable |
| `updated_at` | String | Nullable |
| `order_index` | Integer | Default 0 |

---

### Database 2: `cms_local.db` (CMS Mirror Database)

This is a local SQLite mirror synced from the remote MySQL CMS via `sync_cms_to_local.py`. Tables are exact replicas of the remote CMS.

| Table | Columns | Row Estimate |
|-------|---------|-------------|
| `academic_details` | batch, department, id, section, semester, student_id, student_status | ~0 |
| `courses` | category, course_code, course_name, course_type, credit, id, lecture_hrs, practical_hrs, status, tutorial_hrs | ~787 |
| `course_type` | id, course_type | ~4 |
| `curriculum` | academic_year, id, name, status | ~70 |
| `curriculum_courses` | course_id, curriculum_id, id, semester_id | ~960 |
| `departments` | id, department_code, department_name, status, created_at, updated_at, current_curriculum_id | ~20 |
| `department_teachers` | department_id, id, role, status, teacher_id | ~353 |
| `hod_elective_selections` | academic_year, batch, course_id, curriculum_id, department_id, id, semester, slot_name, status | ~0 |
| `normal_cards` | card_type, curriculum_id, id, semester_number, status | ~240 |
| `students` | department_id, enrollment_no, id, status, student_name | ~2048 |
| `teachers` | dept, desg, email, faculty_id, id, name, status | ~318 |
| `teacher_course_history` | course_id, id, teacher_id | ~346 |
| `student_elective_choices` | * (full table) | — |
| `student_courses` | * (full table) | — |
| `learning_modes` | * (full table) | — |
| `academic_calendar` | * (full table) | — |

**CMS MySQL Source**: `10.150.20.153:3306`, database `cms`, user `aca_dev1`

---

## SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                       │
│  localhost:5173                                                  │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────┐           │
│  │ TimetableEditor │ │ UserConstraints │ │ VenueMapping   │      │
│  │ SubjectManager  │ │ FacultyManager  │ │ StudentRegs    │      │
│  │ DepartmentsManager │ │ SettingsManager │ │ BITTimetable │    │
│  │ FacultyTimetable │ │ StudentTimetable │ │ VenueTimetable│    │
│  └────────┬──────┘ └───────┬────────┘ └───────┬───────┘       │
│           │                │                   │                │
│           └────────────────┼───────────────────┘                │
│                            │ Axios HTTP                         │
│                            ▼                                    │
├─────────────────────────────────────────────────────────────────┤
│                    BACKEND (FastAPI)                             │
│  localhost:8000                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  main.py — REST API Endpoints                        │      │
│  │  ├── CRUD: departments, faculty, courses, slots      │      │
│  │  ├── CRUD: venues, breaks, course-faculty mapping    │      │
│  │  ├── CRUD: students, registrations, user constraints │      │
│  │  ├── /generate → solver_engine.py                    │      │
│  │  ├── /api/conflicts → conflict_detector.py           │      │
│  │  ├── /api/sync-cms → sync_cms_to_local.py            │      │
│  │  ├── /timetable (GET, POST/save)                     │      │
│  │  ├── /export/timetable/excel                         │      │
│  │  ├── /api/config (scheduler settings)                │      │
│  │  └── /timetable/faculty|student|venue/{id}           │      │
│  └──────────────────────────────────────────────────────┘      │
│                            │                                    │
│              ┌─────────────┼─────────────┐                     │
│              ▼             ▼             ▼                      │
│  ┌────────────────┐ ┌──────────┐ ┌──────────────────┐         │
│  │ solver_engine.py│ │conflict_ │ │constraint_       │         │
│  │ (CP-SAT Model) │ │detector  │ │interpreter       │         │
│  │ 1807 lines     │ │          │ │(User JSON rules) │         │
│  └───────┬────────┘ └──────────┘ └──────────────────┘         │
│          │                                                      │
│          ▼                                                      │
│  ┌─────────────────────┐    ┌─────────────────────┐           │
│  │ college_scheduler.db │    │    cms_local.db      │           │
│  │ (SQLite - App Data)  │    │ (SQLite - CMS Mirror)│           │
│  └─────────────────────┘    └───────────┬──────────┘           │
│                                         │ sync_cms_to_local.py  │
│                                         ▼                       │
│                              ┌──────────────────────┐          │
│                              │ Remote MySQL CMS      │          │
│                              │ 10.150.20.153:3306    │          │
│                              │ Database: cms         │          │
│                              └──────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## API ENDPOINTS (Complete List)

### Data Management (CRUD)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST/PUT/DELETE | `/departments` `/departments/{code}` | Department CRUD |
| GET/POST/DELETE | `/faculty` `/faculty/{fid}` | Faculty CRUD |
| GET/POST/PUT/DELETE | `/courses` `/courses/{code}` | Course CRUD (composite PK aware) |
| GET/POST/DELETE | `/course-faculty` `/course-faculty/{mid}` | Course↔Faculty mapping |
| GET/POST/PUT/DELETE | `/slots` `/slots/{slot_id}` | Time slot CRUD |
| GET/POST/PUT/DELETE | `/breaks` `/breaks/{break_id}` | Break config CRUD |
| GET/POST/DELETE | `/venues` `/venues/{id}` | Venue CRUD |
| POST | `/venues/import` | Bulk import venues from Excel |
| GET/POST/DELETE | `/department-venues` | Department↔Venue mapping |
| GET/POST/DELETE | `/course-venues` | Course↔Venue mapping |
| GET/POST | `/departments/{code}/capacities` | Per-semester student counts |
| GET/POST/DELETE | `/students` | Student CRUD |
| GET/POST/DELETE | `/registrations` | Course registration CRUD |

### Timetable Operations
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/generate` | Run CP-SAT solver for (dept, semester) |
| GET | `/timetable` | Get timetable entries (filter by dept/sem) |
| POST | `/timetable/save` | Save/overwrite timetable grid |
| GET | `/timetable/faculty/{id}` | Faculty personal timetable |
| GET | `/timetable/student/{id}` | Student personal timetable |
| GET | `/timetable/venue/{name}` | Venue occupancy timetable |
| GET | `/export/timetable/excel` | Excel download |
| GET | `/available-faculty` | Smart editor: who's free at (day, period) |
| GET | `/available-venues` | Smart editor: what venues are free |
| GET | `/api/conflicts` | Cross-department conflict detection |
| POST | `/check-conflicts` | Validate proposed changes |

### Configuration
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/PUT | `/api/config` | Scheduler constraint settings |
| POST | `/api/config/reset` | Reset to defaults |
| GET/POST | `/api/semester-config/{semester}` | Academic year config |

### Common Courses
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/common-courses` | List all common courses |
| POST | `/common-courses` | Create common course mapping |
| DELETE | `/common-courses/{code}/{sem}` | Remove common course |
| POST | `/common-courses/venue` | Set global venue |
| GET | `/common-courses/student-distribution/{code}/{sem}` | Per-dept student counts |

### User Constraints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET/POST | `/api/user-constraints` | List/create constraints |
| PUT/DELETE | `/api/user-constraints/{uuid}` | Update/delete constraint |
| PATCH | `/api/user-constraints/{uuid}/toggle` | Toggle enabled |
| POST | `/api/user-constraints/reorder` | Reorder constraints |
| POST | `/api/user-constraints/validate` | Validate constraint rules |

### CMS Sync
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/sync-cms` | Trigger ETL sync from MySQL CMS |

---

## SOLVER ENGINE DETAILS

The solver (`solver_engine.py`, 1807 lines) uses Google OR-Tools CP-SAT to model the timetable as a constraint satisfaction problem.

### Key Variables
- `theory_vars[(course_code, day, period)]` — Boolean: is this theory class scheduled here?
- `lab_vars[(course_code, day, block_start)]` — Boolean: is this 2-period lab block scheduled here?
- `merged_lab_vars[(day, block_start)]` — Boolean: is a merged/rotated lab block here?

### Hard Constraints
1. **No Faculty Clash**: Sum of assignments for any faculty at any (day, period) ≤ 1
2. **No Slot Overlap**: At most 1 course per (day, period) slot per department
3. **Weekly Session Count**: Each course must exactly fill its required theory + lab sessions
4. **Mentor Hour Blocking**: Protected mentor period cannot be scheduled
5. **Max Lab Blocks Per Day**: Default 1 lab block per day
6. **Lab Block Starts**: Labs can only start at periods 1, 3, or 5 (2-period blocks)
7. **No Theory in Own Lab Slot**: A course can't have theory and lab at the same time

### Dynamic Constraints (configurable)
- Max theory sessions per course per day (1 normal, 2 if overloaded)
- No back-to-back theory of the same course (relaxed if overloaded)
- Period 8 reserved for honours/minor only (configurable)

### Soft Constraints (objective penalties/bonuses)
- Non-consecutive lab days penalty
- Theory+Lab same day bonus
- Slot fill bonus

### Advanced Features
- **Multi-Section Calculation**: Auto-splits classes based on venue capacity and enrollment
- **Batch Rotation**: When labs lack faculty or venues, merges into rotation batches
- **Common Course Pinning**: Cross-department courses locked to the same slot
- **Elective Pairing**: Same-category electives share slots
- **User-Defined Constraints**: COURSE_INJECTION (e.g., inject Yoga) and SLOT_BLOCKING (block specific slots)
- **Pre-Validation (Hard Mode)**: Checks faculty/venue sufficiency before solving

### Conflict Detection
`conflict_detector.py` scans all timetable entries for:
1. **Faculty conflicts**: Same faculty_id at same (day, period) across different classes
2. **Venue conflicts**: Same venue_name at same (day, period) across different classes

---

## WORKFLOW OF COMPLETED PHASES

1. **Project Environment Setup**: FastAPI backend + React/Vite frontend architecture
2. **Database Schema Design**: SQLAlchemy models with composite PKs, indexed lookups, and denormalized timetable entries
3. **CRUD APIs**: Complete REST endpoints for departments, faculty, courses, slots, venues, breaks, students, registrations
4. **ETL Sync Pipeline**: `sync_cms_to_local.py` — PyMySQL connects to remote CMS MySQL, pulls 16 tables into local SQLite via Pandas
5. **CMS Sync Button**: Dashboard UI triggers backend sync endpoint
6. **CP-SAT Solver**: Full constraint solver with configurable hard/soft/dynamic constraints
7. **Timetable Editor**: Interactive grid with drag-and-drop, smart faculty/venue availability queries
8. **Common Course System**: Cross-department course sharing with global venue locking
9. **User-Defined Constraints**: JSON-based constraint rules (COURSE_INJECTION, SLOT_BLOCKING) applied at solve time
10. **Conflict Detection**: Real-time faculty and venue clash detection across all departments
11. **Multi-View Timetables**: Per-faculty, per-student, per-venue timetable views
12. **PDF Export**: Client-side PDF generation using jspdf + html-to-image
13. **Excel Export**: Server-side Excel generation using openpyxl
14. **Batch Rotation**: Automatic lab rotation when faculty or venues are insufficient
15. **Elective Pairing**: Same-category electives share slots automatically
16. **Firebase Authentication**: Session-based auth with forced logout on tab close
17. **Automated DocX Report Generator**: Programmatic 45-75 page project report generation

---

## KEY DESIGN DECISIONS

1. **Composite Primary Keys on `course_master`**: `(course_code, department_code, semester)` allows the same course to exist across multiple departments
2. **Denormalized `timetable_entries`**: Fields like `day_of_week` and `period_number` are stored directly (not just `slot_id`) for faster querying
3. **No FK on `course_code` in `timetable_entries`**: Allows special codes like `OPEN_ELECTIVE`, `MENTOR`, `BLOCKED`
4. **JSON-encoded `semester_ids` in slots/breaks**: Flexible list storage in SQLite
5. **Singleton `scheduler_config`**: All solver settings in one JSON blob
6. **Two separate SQLite databases**: `college_scheduler.db` (app) and `cms_local.db` (CMS mirror) for isolation
7. **Delivery type awareness**: Faculty can be `Theory`, `Lab`, `Theory With Lab`, or `Offline` — the solver uses this for priority assignment
