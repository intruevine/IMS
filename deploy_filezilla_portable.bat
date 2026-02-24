@echo off
chcp 65001
cls

echo ==========================================
echo Intruevine IMS - FileZilla Portable 자동 배포
echo ==========================================
echo.

REM 설정
set "FZ_PORTABLE_PATH=C:\Program Files\FileZillaPortable"
set "LOCAL_DIR=C:\web_packages\MA"
set "FTP_HOST=intruevine.dscloud.biz"
set "FTP_PORT=21"
set "FTP_USER=boazkim"
set "FTP_PASS=R@kaf_427"
set "REMOTE_DIR=/web_packages/MA"

REM FileZilla Portable 경로 확인
if not exist "%FZ_PORTABLE_PATH%\FileZillaPortable.exe" (
    echo [오류] FileZilla Portable을 찾을 수 없습니다!
    echo.
    echo FileZilla Portable 다운로드:
    echo https://portableapps.com/apps/internet/filezilla_portable
    echo.
    echo 다운로드 후 압축을 해제하고 경로를 확인하세요.
    echo 기본 경로: %FZ_PORTABLE_PATH%
    echo.
    pause
    exit /b 1
)

echo [FileZilla Portable 경로 확인] %FZ_PORTABLE_PATH%
echo.

REM 빌드 확인
if not exist "%LOCAL_DIR%\index.html" (
    echo [빌드 필요] dist 폴더가 없습니다.
    echo npm run build를 실행합니다...
    echo.
    npm run build
    if errorlevel 1 (
        echo [오류] 빌드 실패!
        pause
        exit /b 1
    )
    echo [빌드 완료]
    echo.
)

echo [1/3] FileZilla 스크립트 생성 중...

REM FileZilla XML 설정 파일 생성
(
echo ^<?xml version="1.0" encoding="UTF-8"?^>
echo ^<FileZilla3 version="3.65.0" platform="windows"^>
echo   ^<Settings^>
echo     ^<Setting name="Config Location"^>%LOCAL_DIR%\fz_temp^</Setting^>
echo   ^</Settings^>
echo ^</FileZilla3^>
) > "%LOCAL_DIR%\fz_config.xml"

REM FileZilla 자동 업로드 스크립트 (fzdefaults.xml 방식)
(
echo open ftp://%FTP_USER%:%FTP_PASS%@%FTP_HOST%:%FTP_PORT%
echo lcd "%LOCAL_DIR%"
echo cd %REMOTE_DIR%
echo binary
echo prompt off

REM 파일 업로드 명령 생성
for %%f in ("%LOCAL_DIR%\index.html" "%LOCAL_DIR%\manifest.webmanifest" "%LOCAL_DIR%\registerSW.js" "%LOCAL_DIR%\sw.js" "%LOCAL_DIR%\sw.js.map" "%LOCAL_DIR%\workbox-*.js" "%LOCAL_DIR%\workbox-*.js.map") do (
    echo put "%%f"
)

REM assets 폴더 처리
if exist "%LOCAL_DIR%\assets" (
    echo cd assets
    for %%f in ("%LOCAL_DIR%\assets\*.*") do (
        echo put "%%f"
    )
)

echo close
echo quit
) > "%LOCAL_DIR%\fz_script.txt"

echo [완료] 스크립트 생성
echo.

echo [2/3] FileZilla Portable 실행 및 업로드...
echo.

REM 방법 1: FileZilla CLI 사용 (sftp 명령)
start /wait "" "%FZ_PORTABLE_PATH%\App\filezilla\fzcli.exe" ^
    --site="0/%FTP_USER%@%FTP_HOST%" ^
    --local="%LOCAL_DIR%" ^
    --remote="%REMOTE_DIR%" ^
    --action=upload ^
    --overwrite

if errorlevel 1 (
    echo.
    echo [방법 2] FileZilla GUI로 수동 업로드 안내...
    echo.
    echo FileZilla Portable을 자동으로 실행합니다.
    echo 수동으로 파일을 업로드하세요:
    echo.
    echo 1. 빠른접속에 정보 입력:
    echo    호스트: %FTP_HOST%
    echo    사용자: %FTP_USER%
    echo    비밀번호: %FTP_PASS%
    echo    포트: %FTP_PORT%
    echo.
    echo 2. 로컬: %LOCAL_DIR%
    echo    원격: %REMOTE_DIR%
    echo.
    echo 3. 파일 드래그하여 업로드
    echo.
    
    start "" "%FZ_PORTABLE_PATH%\FileZillaPortable.exe"
    
    echo FileZilla가 실행되었습니다. 업로드 완료 후 아무 키나 누르세요...
    pause > nul
)

echo.
echo [3/3] 정리 중...
del "%LOCAL_DIR%\fz_script.txt" 2>nul
del "%LOCAL_DIR%\fz_config.xml" 2>nul

echo.
echo ==========================================
echo [완료] 배포 프로세스 종료
echo ==========================================
echo.
echo 사이트 URL: https://intruevine.dscloud.biz/MA/
echo.

set /p openBrowser="브라우저에서 확인하시겠습니까? (y/n): "
if "%openBrowser%"=="y" (
    start https://intruvine.dscloud.biz/MA/
)

echo.
pause
