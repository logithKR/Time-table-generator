
# How to Run the Smart Timetable Scheduler

## Prerequisites
- **Python**: 3.8+
- **Node.js**: 16+

## 1. Backend (API Server)
The backend runs on Python/FastAPI.

1.  Open a terminal in the folder: `backend`
2.  Activate the virtual environment:
    ```powershell
    .\venv2\Scripts\activate
    ```
3.  Start the server:
    ```powershell
    uvicorn main:app --reload
    ```
    or if activation fails, run directly:
    ```powershell
    .\venv2\Scripts\python -m uvicorn main:app --reload
    ```

    The API will be available at: http://127.0.0.1:8000/docs

## 2. Frontend (User Interface)
The frontend runs on React/Vite.

1.  Open a **new** terminal (keep the backend running) in the folder: `frontend`
2.  Install dependencies (first time only):
    ```powershell
    npm install
    ```
3.  Start the development server:
    ```powershell
    npm run dev
    ```

    The App will be available at: http://localhost:5173

---
**Note:** Always make sure the backend is running *before* using the scheduler features in the frontend.
