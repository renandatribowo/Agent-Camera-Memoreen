@echo off
REM Memoreen DSLR Agent - startup script (Windows)
REM
REM Agar agent otomatis berjalan saat komputer kiosk dinyalakan
REM (via Task Scheduler / Startup folder).
REM
REM Prasyarat:
REM   - Node.js >= 18 sudah terinstall
REM   - gphoto2 sudah diinstall
REM   - Kamera DSLR terhubung via USB data (bukan charge-only)

setlocal

REM Origin aplikasi (WAJIB diisi). Browser kiosk memblokir akses kalau
REM origin tidak cocok (CORS). Contoh: https://memoreen.id
if "%DSLR_AGENT_ALLOWED_ORIGINS%"=="" set DSLR_AGENT_ALLOWED_ORIGINS=https://memoreen.id,https://www.memoreen.id

REM Bind ke semua interface agar bisa diakses dari perangkat lain di jaringan.
REM Ganti ke 127.0.0.1 kalau hanya dipakai dari komputer yang sama.
if "%DSLR_AGENT_HOST%"=="" set DSLR_AGENT_HOST=0.0.0.0

REM Port (opsional, default 3100)
if "%DSLR_AGENT_PORT%"=="" set DSLR_AGENT_PORT=3100

set SCRIPT_DIR=%~dp0
set AGENT_SCRIPT=%SCRIPT_DIR%index.mjs

if not exist "%AGENT_SCRIPT%" (
  echo [start-agent] ERROR: Tidak menemukan %AGENT_SCRIPT%
  exit /b 1
)

echo [start-agent] Memulai DSLR Agent...
echo [start-agent]   Host:            %DSLR_AGENT_HOST%
echo [start-agent]   Port:            %DSLR_AGENT_PORT%
echo [start-agent]   Allowed origins: %DSLR_AGENT_ALLOWED_ORIGINS%

node "%AGENT_SCRIPT%"
