@echo off
title FairGig Platform Launcher

echo.
echo  ==========================================
echo   FairGig - Gig Worker Rights Platform
echo  ==========================================
echo.

echo [1/7] Starting Auth Service (Port 5000)...
start "Auth Service :5000" cmd /k "cd /d %~dp0auth-service && npm install --silent && node src/index.js"

timeout /t 2 /nobreak > nul

echo [2/7] Starting Anomaly Service (Port 8002)...
start "Anomaly Service :8002" cmd /k "cd /d %~dp0anomaly-service && pip install -r requirements.txt --quiet && python run.py"

timeout /t 2 /nobreak > nul

echo [3/7] Starting Analytics Service (Port 8003)...
start "Analytics Service :8003" cmd /k "cd /d %~dp0analytics-service && pip install -r requirements.txt --quiet && python run.py"

timeout /t 2 /nobreak > nul

echo [4/7] Starting Earnings Service (Port 8001)...
start "Earnings Service :8001" cmd /k "cd /d %~dp0earnings-service && pip install -r requirements.txt --quiet && python run.py"

timeout /t 2 /nobreak > nul

echo [5/7] Starting Grievance Service (Port 5001)...
start "Grievance Service :5001" cmd /k "cd /d %~dp0grievance-service && npm install --silent && node src/index.js"

timeout /t 2 /nobreak > nul

echo [6/7] Starting Certificate Service (Port 8004)...
start "Certificate Service :8004" cmd /k "cd /d %~dp0certificate-service && python run.py"

timeout /t 3 /nobreak > nul

echo [7/7] Starting Frontend (Port 3000)...
start "Frontend :3000" cmd /k "cd /d %~dp0frontend && npm install --silent && npm start"

echo.
echo  ==========================================
echo   All services starting...
echo   Frontend: http://localhost:3000
echo   Auth API: http://localhost:5000
echo   Earnings API: http://localhost:8001
echo   Anomaly API:  http://localhost:8002
echo   Analytics API: http://localhost:8003
echo   Grievance API: http://localhost:5001
echo   Certificate API: http://localhost:8004
echo  ==========================================
echo.
echo  Demo Accounts:
echo   Worker:   worker@demo.com / demo1234
echo   Advocate: advocate@demo.com / demo1234
echo   Verifier: verifier@demo.com / demo1234
echo.
pause
