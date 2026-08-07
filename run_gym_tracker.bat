@echo off
echo Starting Oviyam Gym Tracker Suite...
echo.

:: Start Backend Dev Server in a new window using /d starting directory
echo Starting Backend Server on port 5000...
start "Oviyam Gym Tracker Backend" /d "%~dp0backend" cmd /k "npm run dev"

:: Start Frontend Dev Server in a new window using /d starting directory
echo Starting Frontend Server on port 5173...
start "Oviyam Gym Tracker Frontend" /d "%~dp0frontend" cmd /k "npm run dev"

:: Wait 3 seconds for compilation and start the browser
echo Waiting for server startup...
timeout /t 3 /nobreak >nul 2>nul
echo Opening web interface...
start http://localhost:5173

echo.
echo ================================================
echo   Oviyam Gym Tracker is starting up!
echo   You can close this script window.
echo   Do not close the two newly opened cmd windows.
echo ================================================
pause
