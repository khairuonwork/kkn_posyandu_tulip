@echo off
setlocal EnableExtensions
cd /d "%~dp0"
node scripts\hentikan-layanan.cjs
if /I "%~1"=="/quiet" exit /b 0
echo.
pause
exit /b 0
