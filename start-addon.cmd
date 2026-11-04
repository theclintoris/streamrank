@echo off
setlocal
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)
echo Starting StreamRank on http://127.0.0.1:7100/
call npm start
