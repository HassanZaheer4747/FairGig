@echo off
echo Seeding FairGig database...
cd /d %~dp0
node seed.js
pause
