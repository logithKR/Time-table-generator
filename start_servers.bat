@echo off
echo Starting Backend Server...
start "Backend API" cmd /k "cd backend && .\venv2\Scripts\python -m uvicorn main:app --reload"

echo Starting Frontend Dev Server...
start "Frontend UI" cmd /k "cd frontend && npm run dev"

echo Servers are starting...
echo Backend: http://127.0.0.1:8000/docs
echo Frontend: http://localhost:5173
pause
