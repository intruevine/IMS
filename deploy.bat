@echo off
setlocal
chcp 65001 >nul

set "PROJECT_DIR=%~dp0"
set "DIST_DIR=%PROJECT_DIR%dist"
set "PUBLIC_DIR=%PROJECT_DIR%public"
set "PSCP_EXE=C:\Program Files\PuTTY\pscp.exe"
set "PLINK_EXE=C:\Program Files\PuTTY\plink.exe"
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

if not exist "%PUBLIC_DIR%\sw.js" (
  echo [ERROR] Cleanup service worker not found: "%PUBLIC_DIR%\sw.js"
  echo.
  pause
  exit /b 1
)

if not exist "%PUBLIC_DIR%\registerSW.js" (
  echo [ERROR] Legacy registerSW stub not found: "%PUBLIC_DIR%\registerSW.js"
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

if not exist "%PLINK_EXE%" (
  echo [ERROR] PuTTY Plink not found: "%PLINK_EXE%"
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

"%PSCP_EXE%" -batch -pw "%REMOTE_PASSWORD%" -P %REMOTE_PORT% "%PUBLIC_DIR%\sw.js" "%REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/sw.js"
if errorlevel 1 (
  echo.
  echo [ERROR] Cleanup sw.js upload failed.
  echo.
  pause
  exit /b 1
)

"%PSCP_EXE%" -batch -pw "%REMOTE_PASSWORD%" -P %REMOTE_PORT% "%PUBLIC_DIR%\registerSW.js" "%REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/registerSW.js"
if errorlevel 1 (
  echo.
  echo [ERROR] Cleanup registerSW.js upload failed.
  echo.
  pause
  exit /b 1
)

echo Removing obsolete PWA manifest...
"%PLINK_EXE%" -batch -ssh -P %REMOTE_PORT% -pw "%REMOTE_PASSWORD%" %REMOTE_USER%@%REMOTE_HOST% "rm -f %REMOTE_DIR%/manifest.webmanifest"

echo.
echo [OK] Deploy completed.
echo URL: https://intruevine.dscloud.biz/MA/
echo Note: this script uploads frontend dist only.
echo.

endlocal
pause
