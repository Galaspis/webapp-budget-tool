@echo off
echo Starting Budget Tool App...

REM === BACKEND ===
echo Launching backend...
start "Backend" cmd /k "cd /d C:\Users\galas\Projects\webapp-budget-tool\backend && uvicorn main:app --reload"

REM === FRONTEND ===
echo Launching frontend...
start "Frontend" cmd /k "cd /d C:\Users\galas\Projects\webapp-budget-tool\frontend && npm run dev"

REM === OPEN BROWSER ===
echo Opening browser to http://localhost:5173
start "" http://localhost:5173

echo All systems launched. Press any key to exit this launcher window.
pause >nul
