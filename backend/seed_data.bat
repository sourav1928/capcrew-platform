@echo off
cd /d D:\Projects\capcrew-platform\backend

echo.
echo ========================================
echo Seeding Test Data
echo ========================================
echo.

python manage.py seed_data

echo.
echo ========================================
echo Seed Data Complete!
echo ========================================
echo.
pause
