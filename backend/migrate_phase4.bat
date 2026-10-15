@echo off
cd /d D:\Projects\capcrew-platform\backend

echo.
echo ========================================
echo Running Phase 4 Migrations (Orders)
echo ========================================
echo.

REM Run migrations for orders
python manage.py migrate orders

echo.
echo ========================================
echo Phase 4 Migrations Complete!
echo ========================================
echo.
echo Starting server...
echo.

REM Start server
python manage.py runserver
