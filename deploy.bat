@echo off
setlocal
chcp 65001 >nul

set "PROJECT_DIR=%~dp0"
set "DIST_DIR=%PROJECT_DIR%dist"
set "PSCP_EXE=C:\Program Files\PuTTY\pscp.exe"
set "REMOTE_USER=boazkim"
set "REMOTE_HOST=intruevine.dscloud.biz"
set "REMOTE_PORT=22"
set "REMOTE_PASSWORD=R@kaf_427"
set "REMOTE_DIR=/volume1/web_packages/MA/"

echo ==========================================
echo Intruevine IMS frontend deploy
echo ==========================================
echo.

if not exist "%DIST_DIR%\index.html" (
  echo [ERROR] Build output not found: "%DIST_DIR%\index.html"
  echo Run "npm run build" first.
  echo.
  pause
  exit /b 1
)

if not exist "%PSCP_EXE%" (
  echo [ERROR] PuTTY PSCP not found: "%PSCP_EXE%"
  echo Install PuTTY or update deploy.bat.
  echo.
  pause
  exit /b 1
)

echo Source : "%DIST_DIR%"
echo Target : %REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%
echo.
echo Uploading files...

"%PSCP_EXE%" -batch -r -pw "%REMOTE_PASSWORD%" -P %REMOTE_PORT% "%DIST_DIR%\*" "%REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%"
if errorlevel 1 (
  echo.
  echo [ERROR] Deploy failed.
  echo Check network, credentials, and remote path.
  echo.
  pause
  exit /b 1
)

echo.
echo [OK] Deploy completed.
echo URL: https://intruevine.dscloud.biz/MA/
echo Note: this script uploads frontend dist only.
echo.

endlocal
pause
