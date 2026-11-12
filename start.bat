@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"

title Nvidia Computer Ledger
color 0A

echo ============================================================
echo   Nvidia Computer Ledger
echo   Research ledger + NVIDIA Nemotron 3 Ultra assistant
echo ============================================================
echo.

:: Check Node.js
node --version >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js 20+ from https://nodejs.org
    pause
    exit /b 1
)

:: Check npm
npm.cmd --version >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm not found!
    pause
    exit /b 1
)

for /f "delims=" %%i in ('node --version') do set NODE_VER=%%i
for /f "delims=" %%i in ('npm.cmd --version') do set NPM_VER=%%i
echo Node.js !NODE_VER!
echo npm !NPM_VER!
echo.

:: Check .env.local
if not exist ".env.local" (
    if exist ".env.example" (
        echo [INFO] .env.local not found. Copying from .env.example...
        copy ".env.example" ".env.local" >nul
        echo.
        echo [IMPORTANT] Edit .env.local and add your NVIDIA_API_KEY!
        echo Get your key from: https://build.nvidia.com
        echo.
    ) else (
        echo [ERROR] .env.example not found!
        echo Create .env.local with NVIDIA_API_KEY=nvapi-xxxxxxxxxxxx
        pause
        exit /b 1
    )
) else (
    echo [OK] .env.local found
)
echo.

:: Install dependencies if needed
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    echo.
    call npm.cmd install
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies already installed
)
echo.

:: Build the UI so the server always serves the latest version
echo [INFO] Building the application...
call npm.cmd run build
if errorlevel 1 (
    echo.
    echo [ERROR] Build failed. Fix the errors above and try again.
    pause
    exit /b 1
)
echo.
echo [OK] Build complete
echo.

:: Open the browser shortly after the server starts
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://127.0.0.1:5174'"

:: Start server in the foreground
echo [INFO] Starting Nvidia Computer Ledger on http://127.0.0.1:5174
echo [INFO] Press Ctrl+C to stop
echo.

call npm.cmd start

:: If we reach here, the server stopped
echo.
echo [INFO] Server has stopped.
pause
