@echo off
title CapCrew - start
set "PROJECT=%~dp0"

if not exist "%PROJECT%backend\manage.py" (
  echo ERROR: Put this file in your CapCrew project folder, next to the "backend" and "frontend" folders.
  pause
  exit /b 1
)

echo Starting CapCrew (3 windows will open - keep them open while you work)...
start "CapCrew Backend (8001)" cmd /k "cd /d "%PROJECT%backend" && call venv\Scripts\activate.bat && python manage.py runserver 8001"
start "CapCrew Shop (5175)"    cmd /k "cd /d "%PROJECT%frontend" && npm run dev"
start "CapCrew Admin (5176)"   cmd /k "cd /d "%PROJECT%frontend" && npm run dev:admin"

echo Opening the shop and the admin in your browser in a few seconds...
timeout /t 12 /nobreak >nul
start "" http://localhost:5175
start "" http://localhost:5176
