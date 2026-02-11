@echo off
echo Cleaning up ports and processes...

:: Kill Java processes using JMX port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :45556') do (
    echo Killing process PID: %%a
    taskkill /PID %%a /F
)

:: Kill all Java processes from this project
taskkill /F /IM java.exe 2>nul

:: Kill any RMI registry processes
taskkill /F /FI "WINDOWTITLE eq RMI*" 2>nul

:: Wait a bit
timeout /t 2 /nobreak >nul

echo Cleanup complete!