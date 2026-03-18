# College Timetable Management System

A comprehensive web-based platform for organizing, managing, and resolving college timetables with advanced CP-SAT constraint solving capabilities.

## Features

- **Master Timetable Editor**: Interactive drag-and-drop editor for scheduling classes across multiple departments and semesters.
- **Constraints Management**: Sophisticated constraint configuration engine (Hard, Soft, Dynamic) using Google completely customizable from the UI.
- **Student & Faculty Portals**: Detailed personalized timetables.
- **Venue Management**: Smart cross-department conflict detection and venue mapping.
- **PDF/Print Support**: High-quality exports mimicking official college scheduling layouts.

## Technology Stack

- **Backend**: FastAPI (Python), SQLAlchemy, SQLite, Google OR-Tools (CP-SAT Solver)
- **Frontend**: React (Vite), Tailwind CSS, Lucide React, dnd-kit (drag and drop)

## Setup Instructions

### 1. Backend Setup

From the root of the project, navigate to the `backend` directory:
```bash
cd backend
```

Create a virtual environment:
```bash
python -m venv venv2
```

Activate the virtual environment:
- **Windows**: `venv2\Scripts\activate`
- **Linux/Mac**: `source venv2/bin/activate`

Install dependencies:
```bash
pip install -r requirements.txt
```

Run the backend server:
```bash
uvicorn main:app --reload
```
The FastAPI backend will be running on `http://127.0.0.1:8000`.

### 2. Frontend Setup

In a new terminal, from the root of the project, navigate to the `frontend` directory:
```bash
cd frontend
```

Install Node dependencies:
```bash
npm install
```

Run the development server:
```bash
npm run dev
```
The React frontend will be running on `http://localhost:5173`.

## Usage

1. **Dashboard (Master View)**: After opening the frontend, you'll see the Master Timetable where you can view schedules by department and semester.
2. **Setup Data**: Navigate to the Settings (Departments, Venues, Subjects, Constraints) to configure your college data.
3. **Editor**: The intuitive visual editor allows for custom drag-and-drop scheduling alongside automated resolution.
4. **Automated Generation**: In the Editor view, click "Generate" to utilize the Google OR-Tools CP-SAT solver to automatically schedule the classes based on your configured constraints.

## License
MIT License
