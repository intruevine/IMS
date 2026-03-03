@echo off
setlocal
chcp 65001 >nul

set "PROJECT_DIR=%~dp0"
set "SERVER_DIR=%PROJECT_DIR%server"
set "PSCP_EXE=C:\Program Files\PuTTY\pscp.exe"
set "PLINK_EXE=C:\Program Files\PuTTY\plink.exe"
set "REMOTE_USER=boazkim"
set "REMOTE_HOST=intruevine.dscloud.biz"
set "REMOTE_PORT=22"
set "REMOTE_PASSWORD=R@kaf_427"
set "REMOTE_DIR=/volume1/web_packages/MA/server"
set "REMOTE_NODE=/var/packages/Node.js_v20/target/usr/local/bin/node"

echo ==========================================
echo Intruevine IMS backend deploy
echo ==========================================
echo.

if not exist "%SERVER_DIR%\index.js" (
  echo [ERROR] Backend source not found: "%SERVER_DIR%\index.js"
  echo.
  pause
  exit /b 1
)

if not exist "%PSCP_EXE%" (
  echo [ERROR] PuTTY PSCP not found: "%PSCP_EXE%"
  echo.
  pause
  exit /b 1
)

if not exist "%PLINK_EXE%" (
  echo [ERROR] PuTTY Plink not found: "%PLINK_EXE%"
  echo.
  pause
  exit /b 1
)

echo Uploading backend source files...

"%PSCP_EXE%" -batch -pw "%REMOTE_PASSWORD%" -P %REMOTE_PORT% "%SERVER_DIR%\index.js" "%REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/"
if errorlevel 1 goto :upload_fail

"%PSCP_EXE%" -batch -pw "%REMOTE_PASSWORD%" -P %REMOTE_PORT% "%SERVER_DIR%\db.js" "%REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/"
if errorlevel 1 goto :upload_fail

"%PSCP_EXE%" -batch -pw "%REMOTE_PASSWORD%" -P %REMOTE_PORT% "%SERVER_DIR%\package.json" "%REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/"
if errorlevel 1 goto :upload_fail

"%PSCP_EXE%" -batch -pw "%REMOTE_PASSWORD%" -P %REMOTE_PORT% "%SERVER_DIR%\package-lock.json" "%REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/"
if errorlevel 1 goto :upload_fail

"%PSCP_EXE%" -batch -r -pw "%REMOTE_PASSWORD%" -P %REMOTE_PORT% "%SERVER_DIR%\routes\*" "%REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/routes/"
if errorlevel 1 goto :upload_fail

"%PSCP_EXE%" -batch -r -pw "%REMOTE_PASSWORD%" -P %REMOTE_PORT% "%SERVER_DIR%\middleware\*" "%REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/middleware/"
if errorlevel 1 goto :upload_fail

"%PSCP_EXE%" -batch -r -pw "%REMOTE_PASSWORD%" -P %REMOTE_PORT% "%SERVER_DIR%\scripts\*" "%REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/scripts/"
if errorlevel 1 goto :upload_fail

"%PSCP_EXE%" -batch -r -pw "%REMOTE_PASSWORD%" -P %REMOTE_PORT% "%SERVER_DIR%\node_modules\bcryptjs" "%REMOTE_USER%@%REMOTE_HOST%:%REMOTE_DIR%/node_modules/"
if errorlevel 1 goto :upload_fail

echo.
echo Restarting backend...

"%PLINK_EXE%" -batch -ssh -P %REMOTE_PORT% -pw "%REMOTE_PASSWORD%" %REMOTE_USER%@%REMOTE_HOST% "printf '%%s\n' '%REMOTE_PASSWORD%' | sudo -S pkill -f 'node index.js' || true"
"%PLINK_EXE%" -batch -ssh -P %REMOTE_PORT% -pw "%REMOTE_PASSWORD%" %REMOTE_USER%@%REMOTE_HOST% "printf '%%s\n' '%REMOTE_PASSWORD%' | sudo -S chmod 666 %REMOTE_DIR%/.env %REMOTE_DIR%/db.js %REMOTE_DIR%/index.js %REMOTE_DIR%/routes/*.js %REMOTE_DIR%/middleware/*.js"
"%PLINK_EXE%" -batch -ssh -P %REMOTE_PORT% -pw "%REMOTE_PASSWORD%" %REMOTE_USER%@%REMOTE_HOST% "cd %REMOTE_DIR% && nohup %REMOTE_NODE% index.js >/tmp/ims.out 2>/tmp/ims.err </dev/null &"

echo.
echo Verifying backend health...
timeout /t 5 >nul
"%PLINK_EXE%" -batch -ssh -P %REMOTE_PORT% -pw "%REMOTE_PASSWORD%" %REMOTE_USER%@%REMOTE_HOST% "curl -fsS http://127.0.0.1:3001/api/"
if errorlevel 1 (
  echo.
  echo [ERROR] Backend health check failed.
  echo Check /volume1/web_packages/MA/server/app.log and /tmp/ims.err on NAS.
  echo.
  pause
  exit /b 1
)

echo.
echo [OK] Backend deploy completed.
echo URL: https://intruevine.dscloud.biz/api/
echo.

endlocal
pause
exit /b 0

:upload_fail
echo.
echo [ERROR] Backend file upload failed.
echo.
pause
exit /b 1
