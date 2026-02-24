@echo off
chcp 1252
cls

echo ==========================================
echo Intruevine IMS - FileZilla Auto Deploy
echo ==========================================
echo.

REM Settings
set FZ_PATH=C:\Users\boazk\FileZillaPortable
set LOCAL_DIR=C:\web_packages\MA
set FTP_HOST=intruevine.dscloud.biz
set FTP_PORT=21
set FTP_USER=boazkim
set FTP_PASS=R@kaf_427
set REMOTE_DIR=/web_packages/MA

REM Check FileZilla Portable
if not exist "%FZ_PATH%\FileZillaPortable.exe" (
    echo ERROR: FileZilla Portable not found!
    echo Path: %FZ_PATH%
    echo.
    echo Please check the installation path.
    pause
    exit /b 1
)

echo [OK] FileZilla Portable found
echo Path: %FZ_PATH%
echo.

REM Check build
if not exist "%LOCAL_DIR%\index.html" (
    echo Build required. Running npm run build...
    call npm run build
    if errorlevel 1 (
        echo ERROR: Build failed!
        pause
        exit /b 1
    )
)

echo [OK] Build verified
echo.

echo ==========================================
echo Starting FileZilla Portable...
echo ==========================================
echo.
echo Please upload files manually:
echo.
echo Local: %LOCAL_DIR%
echo Remote: %REMOTE_DIR%
echo.
echo 1. Enter Quick Connect:
echo    Host: %FTP_HOST%
echo    User: %FTP_USER%
echo    Pass: %FTP_PASS%
echo    Port: %FTP_PORT%
echo.
echo 2. Drag files from Local to Remote
echo 3. Overwrite if prompted
echo.

start "" "%FZ_PATH%\FileZillaPortable.exe"

echo FileZilla opened. Press any key after upload complete...
pause > nul

echo.
echo ==========================================
echo Deployment process completed
echo ==========================================
echo.
echo URL: https://intruevine.dscloud.biz/MA/
echo.

set /p OPEN_BROWSER=Open browser? (y/n): 
if "%OPEN_BROWSER%"=="y" (
    start https://intruevine.dscloud.biz/MA/
)

echo.
pause

