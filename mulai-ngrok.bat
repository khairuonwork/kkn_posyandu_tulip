@echo off
setlocal EnableExtensions
title SIMPATIK Posyandu - Website dan Ngrok
cd /d "%~dp0"

set "BASH_EXE=%ProgramFiles%\Git\bin\bash.exe"
if not exist "%BASH_EXE%" set "BASH_EXE=%LOCALAPPDATA%\Programs\Git\bin\bash.exe"

if not exist "%BASH_EXE%" (
    echo.
    echo Git Bash tidak ditemukan.
    echo Pasang Git for Windows, lalu jalankan kembali file ini.
    echo https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

if /i "%~1"=="--cek" (
    "%BASH_EXE%" -n "%~dp0mulai-ngrok.sh"
    if errorlevel 1 exit /b 1
    echo Launcher Windows dan skrip ngrok siap.
    exit /b 0
)

echo.
echo Menyiapkan SIMPATIK Posyandu dan tunnel ngrok...
echo Biarkan jendela ini tetap terbuka selama aplikasi digunakan.
echo.

"%BASH_EXE%" "%~dp0mulai-ngrok.sh"
set "HASIL=%ERRORLEVEL%"

if not "%HASIL%"=="0" (
    echo.
    echo Proses berhenti dengan kesalahan. Baca pesan di atas atau periksa folder .ngrok-run.
    echo.
    pause
)

exit /b %HASIL%
