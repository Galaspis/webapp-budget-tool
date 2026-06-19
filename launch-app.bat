@echo off
echo Starting Budget Tool Application...

REM === BACKEND ===
echo Launching backend server...
start "Backend" cmd /k "cd /d C:\Users\galas\Projects\webapp-budget-tool\backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

REM === FRONTEND ===
echo Launching frontend server...
start "Frontend" cmd /k "cd /d C:\Users\galas\Projects\webapp-budget-tool\frontend && npm run dev"

REM === WAIT AND OPEN BROWSER ===
echo Waiting for services to start...
timeout /t 5 /nobreak >nul
echo Opening browser to http://localhost:5173
start "" http://localhost:5173

echo All systems launched successfully!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Press any key to close this launcher window.
pause >nul