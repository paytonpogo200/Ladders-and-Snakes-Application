@echo off
cd /d "%~dp0"
echo.
echo Campaign Tool Starter
echo Running from: %CD%
echo.
if not exist package.json (
  echo ERROR: package.json is missing. This is not the app folder.
  pause
  exit /b 1
)
if not exist .env.local (
  echo ERROR: .env.local is missing.
  pause
  exit /b 1
)
findstr /C:"your-project-ref" .env.local >nul
if %errorlevel%==0 (
  echo WARNING: .env.local still has placeholder Supabase values.
  echo Open .env.local and paste your Supabase Project URL and Publishable/Anon key.
  echo.
  pause
)
echo Installing dependencies if needed...
call npm install
if errorlevel 1 pause & exit /b 1
echo.
echo Starting local dev server...
call npm run dev
pause
