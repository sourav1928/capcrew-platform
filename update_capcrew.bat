@echo off
setlocal
title CapCrew - one-click update
set "PROJECT=%~dp0"
if "%PROJECT:~-1%"=="\" set "PROJECT=%PROJECT:~0,-1%"

echo ==============================================
echo    CapCrew - one-click update
echo ==============================================
echo.

if not exist "%PROJECT%\backend\manage.py" (
  echo ERROR: Put this file in your CapCrew project folder,
  echo        next to the "backend" and "frontend" folders.
  echo.
  pause
  exit /b 1
)

echo Please close the Backend, Shop and Admin windows first (click them and press Ctrl+C, then close).
echo.
pause

rem ---- 1. Find the NEWEST update zip, looking in this folder and in Downloads ----
set "ZIP="
for /f "usebackq delims=" %%F in (`powershell -NoProfile -Command "Get-ChildItem -Path '%PROJECT%','%USERPROFILE%\Downloads' -Filter 'capcrew-update*.zip' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName"`) do set "ZIP=%%F"
if not defined ZIP (
  echo ERROR: No update zip found.
  echo Save the "capcrew-update-...zip" file in this folder or in your Downloads folder,
  echo then double-click this file again.
  echo.
  pause
  exit /b 1
)
echo [1/5] Using update file: %ZIP%
for %%Z in ("%ZIP%") do echo        size: %%~zZ bytes, saved: %%~tZ

rem ---- 2. Unzip and copy over the project (your .env files are never overwritten) ----
set "TMPDIR=%TEMP%\capcrew_patch"
if exist "%TMPDIR%" rmdir /s /q "%TMPDIR%"
powershell -NoProfile -Command "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%TMPDIR%' -Force"
if errorlevel 1 goto :fail
if not exist "%TMPDIR%\capcrew-platform" (
  echo ERROR: The zip does not look like a CapCrew update.
  goto :fail
)
echo [2/5] Copying updated files...
robocopy "%TMPDIR%\capcrew-platform" "%PROJECT%" /E /XF .env .env.local /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto :fail
rmdir /s /q "%TMPDIR%"

rem ---- 3. Make sure every part of the website is there ----
echo [3/5] Checking that every part of the website is present...
set "BAD="
for %%A in (core accounts catalog inventory cart wishlist checkout orders payments shipping returns refunds warranty reviews coupons promotions cms support notifications compliance tax invoicing analytics adminapi) do if not exist "%PROJECT%\backend\%%A\apps.py" (echo    MISSING: backend\%%A & set "BAD=1")
if defined BAD goto :missing

rem ---- 4. Backend: packages + database update ----
echo [4/5] Updating backend (packages and database)...
cd /d "%PROJECT%\backend"
if not exist "venv\Scripts\activate.bat" python -m venv venv
call venv\Scripts\activate.bat
python -m pip install -r requirements.txt
if errorlevel 1 goto :fail
python manage.py migrate
if errorlevel 1 goto :fail

rem ---- 5. Frontend: packages ----
echo [5/5] Updating frontend packages...
cd /d "%PROJECT%\frontend"
call npm install --no-audit --no-fund
if errorlevel 1 goto :fail

rem Mark the zip as used so it is never applied twice
move /y "%ZIP%" "%ZIP%.done" >nul

echo.
echo ==============================================
echo    Update finished successfully.
echo ==============================================
echo.
choice /c YN /m "Start the website now"
if errorlevel 2 goto :end
call "%PROJECT%\start_capcrew.bat"
goto :end

:missing
echo.
echo ----------------------------------------------
echo  The folders listed above are missing, and this update file does not contain them.
echo  Save "capcrew-update-full.zip" in this folder (it contains everything)
echo  and double-click this file again.
echo ----------------------------------------------
pause
exit /b 1

:fail
echo.
echo ----------------------------------------------
echo  Something went wrong. Take a screenshot of this window
echo  and send it to Claude - the message above shows what failed.
echo ----------------------------------------------
pause
exit /b 1

:end
endlocal
