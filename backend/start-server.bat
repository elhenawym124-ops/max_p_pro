@echo off
cd /d %~dp0
echo Starting backend server on port 3010...
node server.js
pause

