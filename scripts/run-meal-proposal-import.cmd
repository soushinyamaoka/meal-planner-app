@echo off
rem Entry point for Windows Task Scheduler: import AI meal proposals.
rem Imports data\meal-proposals\inbox\*.json and appends the output to data\meal-proposals\logs\import.log.
rem The log contains dish names, so it is kept outside the repository.
setlocal
cd /d "%~dp0.."
set "LOG_DIR=%~dp0..\..\..\data\meal-proposals\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
echo ===== %date% %time% =====>> "%LOG_DIR%\import.log"
"C:\Program Files\nodejs\node.exe" --env-file=.env scripts\importMealProposal.mjs >> "%LOG_DIR%\import.log" 2>&1
set "CODE=%ERRORLEVEL%"
echo exit=%CODE%>> "%LOG_DIR%\import.log"
exit /b %CODE%
