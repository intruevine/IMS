@echo off
chcp 65001
cls

echo ==========================================
echo Intruevine IMS 자동 FTP 배포
echo ==========================================
echo.
echo [PowerShell 실행 정책 확인]
echo.
echo 처음 실행시 아래 명령어로 실행 정책을 변경해야 합니다:
echo.
echo    PowerShell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser"
echo.
echo 위 명령어를 관리자 권한으로 실행 후, 'Y'를 입력하세요.
echo.
echo ==========================================
echo.

REM PowerShell 스크립트 실행
PowerShell -ExecutionPolicy Bypass -File "%~dp0deploy_auto_ftp.ps1"

echo.
echo ==========================================
echo 배포 프로세스가 종료되었습니다.
echo ==========================================
echo.
pause
