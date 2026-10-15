@echo off
cd /d D:\Projects\ecommerce-platform\backend

echo.
echo ========================================
echo Running Django Migrations
echo ========================================
echo.

REM Run migrations
python manage.py migrate

echo.
echo ========================================
echo Migrations Complete!
echo ========================================
echo.
echo Starting server...
echo.

REM Start server
python manage.py runserver
