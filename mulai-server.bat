@echo off
setlocal EnableExtensions
title SIMPATIK Posyandu - Website dan REST API
cd /d "%~dp0"

rem Menjalankan API dan website dalam satu jendela terminal.
rem Pemakaian: mulai-server.bat [alamat-ip]
rem Opsional: set PORT_API=4321 dan/atau PORT_WEB=5173 sebelum menjalankan.

if not defined PORT_API set "PORT_API=4321"
if not defined PORT_WEB set "PORT_WEB=5173"

where node.exe >nul 2>nul
if errorlevel 1 (
    echo [GAGAL] Node.js tidak ditemukan. Pasang Node.js 24 atau lebih baru.
    goto :gagal
)

if not exist "server\.env" (
    echo [GAGAL] server\.env belum ada.
    echo         Jalankan: node scripts\buat-env-supabase.cjs
    goto :gagal
)

if not exist "server\node_modules\pg" (
    echo [GAGAL] Dependensi server belum dipasang. Jalankan: npm --prefix server ci
    goto :gagal
)

if not exist "client\node_modules\vite\bin\vite.js" (
    echo [GAGAL] Dependensi website belum dipasang. Jalankan: npm --prefix client ci
    goto :gagal
)

echo Membangun website...
call npm --prefix client run build
if errorlevel 1 goto :gagal

tasklist /FI "WINDOWTITLE eq SIMPATIK-API*" 2>nul | find /I "cmd.exe" >nul
if not errorlevel 1 (
    echo [GAGAL] Server versi lama masih berjalan. Jalankan hentikan-server.bat lebih dulu.
    goto :gagal
)

set "ALAMAT_IP=%~1"
if not defined ALAMAT_IP (
    for /f "delims=" %%i in ('node scripts\ip-lan.cjs 2^>nul') do set "ALAMAT_IP=%%i"
)
if not defined ALAMAT_IP set "ALAMAT_IP=localhost"

echo.
echo Menjalankan website dan API di satu terminal...
echo Website lokal : http://%ALAMAT_IP%:%PORT_WEB%
echo REST API      : http://%ALAMAT_IP%:%PORT_API%/api/v1
echo Cloudflare    : tunnel yang aktif tetap memakai URL saat ini.
echo Tekan Ctrl+C untuk menghentikan layanan.
echo.

node scripts\jalankan-satu-terminal.cjs "%ALAMAT_IP%" "%PORT_API%" "%PORT_WEB%"
goto :selesai

:gagal
echo.
echo Proses tidak dapat dimulai. Periksa pesan di atas.

:selesai
echo.
pause
exit /b 0
