@echo off
chcp 65001

REM 배포 스크립트 - Intruevine IMS
REM 사용법: deploy.bat

echo ==========================================
echo Intruevine IMS 배포 스크립트
echo ==========================================
echo.

REM 빌드 확인
if not exist "dist\index.html" (
    echo [오류] dist 폴더가 없습니다. 먼저 npm run build를 실행하세요.
    pause
    exit /b 1
)

REM 배포 디렉토리 설정
set DEPLOY_DIR=C:\web_packages\MA

REM 배포 디렉토리 존재 확인
if not exist "%DEPLOY_DIR%" (
    echo [오류] 배포 디렉토리가 존재하지 않습니다: %DEPLOY_DIR%
    echo 디렉토리를 생성하거나 경로를 확인하세요.
    pause
    exit /b 1
)

echo 배포 디렉토리: %DEPLOY_DIR%
echo.

REM 기존 파일 백업
set BACKUP_DIR=%DEPLOY_DIR%_backup_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set BACKUP_DIR=%BACKUP_DIR: =0%
echo 기존 파일 백업 중... 
xcopy /E /I /H /Y "%DEPLOY_DIR%" "%BACKUP_DIR%" >nul 2>&1
if %errorlevel% == 0 (
    echo [완료] 백업: %BACKUP_DIR%
) else (
    echo [경고] 백업 실패 (파일이 없을 수 있음)
)
echo.

REM dist 폴더 내용을 배포 디렉토리로 복사
echo 파일 복사 중...
xcopy /E /I /H /Y "dist\*" "%DEPLOY_DIR%\" >nul 2>&1

if %errorlevel% == 0 (
    echo.
    echo ==========================================
    echo [성공] 배포가 완료되었습니다!
    echo ==========================================
    echo.
    echo 배포 URL: https://intruvine.dscloud.biz
    echo 배포 경로: %DEPLOY_DIR%
    echo.
    echo 브라우저에서 사이트를 확인하세요.
    echo.
) else (
    echo.
    echo [오류] 파일 복사 중 문제가 발생했습니다.
    echo 관리자 권한으로 실행하거나 경로를 확인하세요.
    echo.
)

pause
