@echo off
echo Starting Frontend Server with Smart Environment Configuration...
echo.
cd /d "c:\Users\DELL\Desktop\max_p_new\max_p_new\max_p_new\frontend"
echo Current directory: %CD%
echo.
echo Running: npx vite --port 3000
npx vite --port 3000
pause