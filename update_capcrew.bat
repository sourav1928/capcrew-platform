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

rem ---- 1. Find the newest update zip: this folder first, then Downloads ----
set "ZIP="
for /f "delims=" %%F in ('dir /b /o-d "%PROJECT%\capcrew-update*.zip" 2^>nul') do if not defined ZIP set "ZIP=%PROJECT%\%%F"
if not defined ZIP for /f "delims=" %%F in ('dir /b /o-d "%USERPROFILE%\Downloads\capcrew-update*.zip" 2^>nul') do if not defined ZIP set "ZIP=%USERPROFILE%\Downloads\%%F"
if not defined ZIP (
  echo ERROR: No update zip found.
  echo Save the "capcrew-update-patch.zip" file in this folder or in your Downloads folder,
  echo then double-click this file again.
  echo.
  pause
  exit /b 1
)
echo [1/4] Using update file: %ZIP%

rem ---- 2. Unzip and copy over the project (your .env files are never overwritten) ----
set "TMPDIR=%TEMP%\capcrew_patch"
if exist "%TMPDIR%" rmdir /s /q "%TMPDIR%"
powershell -NoProfile -Command "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%TMPDIR%' -Force"
if errorlevel 1 goto :fail
if not exist "%TMPDIR%\capcrew-platform" (
  echo ERROR: The zip does not look like a CapCrew update.
  goto :fail
)
echo [2/4] Copying updated files...
robocopy "%TMPDIR%\capcrew-platform" "%PROJECT%" /E /XF .env .env.local /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto :fail
rmdir /s /q "%TMPDIR%"

rem ---- 3. Backend: packages + database update ----
echo [3/4] Updating backend (packages and database)...
cd /d "%PROJECT%\backend"
if not exist "venv\Scripts\activate.bat" python -m venv venv
call venv\Scripts\activate.bat
python -m pip install -r requirements.txt
if errorlevel 1 goto :fail
python manage.py migrate
if errorlevel 1 goto :fail

rem ---- 4. Frontend: packages ----
echo [4/4] Updating frontend packages...
cd /d "%PROJECT%\frontend"
call npm install --no-audit --no-fund
if errorlevel 1 goto :fail

echo.
echo ==============================================
echo    Update finished successfully.
echo ==============================================
echo.
choice /c YN /m "Start the website now"
if errorlevel 2 goto :end
call "%PROJECT%\start_capcrew.bat"
goto :end

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
