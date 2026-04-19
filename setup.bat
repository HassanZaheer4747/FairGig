@echo off
title FairGig Setup

echo.
echo  ==========================================
echo   FairGig - Initial Setup
echo  ==========================================
echo.

echo Installing Auth Service dependencies...
cd /d %~dp0auth-service
call npm install
echo Done.

echo.
echo Installing Grievance Service dependencies...
cd /d %~dp0grievance-service
call npm install
echo Done.

echo.
echo Installing Seed dependencies...
cd /d %~dp0seed
call npm install
echo Done.

echo.
echo Installing Python dependencies (Earnings Service)...
cd /d %~dp0earnings-service
pip install -r requirements.txt
echo Done.

echo.
echo Installing Python dependencies (Anomaly Service)...
cd /d %~dp0anomaly-service
pip install -r requirements.txt
echo Done.

echo.
echo Installing Python dependencies (Analytics Service)...
cd /d %~dp0analytics-service
pip install -r requirements.txt
echo Done.

echo.
echo Installing Python dependencies (Certificate Service)...
cd /d %~dp0certificate-service
pip install -r requirements.txt
echo Done.

echo.
echo Installing Frontend dependencies...
cd /d %~dp0frontend
call npm install
echo Done.

echo.
echo  ==========================================
echo   Setup complete! Now run:
echo   1. seed\seed.bat  (seed the database)
echo   2. start-all.bat  (start all services)
echo  ==========================================
echo.
pause
