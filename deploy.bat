@echo off
echo ====================================
echo Fullstack EConner Deployment Script
echo ====================================

echo.
echo [1/3] Pulling latest code...
git pull origin main

echo.
echo [2/3] Installing dependencies...
npm install

echo.
echo [3/3] Building project...
npm run build

echo.
echo =================================
echo Deployment Finished Successfully
echo =================================

echo.
echo Press any key to exit...
pause