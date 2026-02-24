@echo off
chcp 437
cls

echo ==========================================
echo Intruevine IMS Deployment
echo ==========================================
echo.

set FZ_PATH=C:\Users\boazk\FileZillaPortable

if not exist "%FZ_PATH%\FileZillaPortable.exe" (
    echo FileZilla not found at:
    echo %FZ_PATH%
    echo.
    pause
    exit /b 1
)

echo FileZilla found!
echo.
echo FTP Info:
echo   Host: intruevine.dscloud.biz
echo   User: boazkim
necho   Pass: R@kaf_427
necho   Port: 21
echo.
echo Local: C:\web_packages\MA
echo Remote: /web_packages/MA
echo.

start "" "%FZ_PATH%\FileZillaPortable.exe"

echo FileZilla started. Press any key after upload...
pause > nul

echo Done!
echo URL: https://intruevine.dscloud.biz/MA/
echo.
pause

