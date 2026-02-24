@echo off
chcp 65001
cls

echo ==========================================
echo Intruevine IMS - FTP 업로드 (CMD 방식)
echo ==========================================
echo.
echo 서버: intruevine.dscloud.biz:21
echo 사용자: boazkim
echo 경로: /web_packages/MA
echo.

REM FTP 명령어 파일 생성
echo user boazkim> ftp_commands.txt
echo R@kaf_427>> ftp_commands.txt
echo cd /web_packages/MA>> ftp_commands.txt
echo binary>> ftp_commands.txt
echo prompt off>> ftp_commands.txt

REM 파일 목록 생성
echo mput index.html>> ftp_commands.txt
echo mput manifest.webmanifest>> ftp_commands.txt
echo mput registerSW.js>> ftp_commands.txt
echo mput sw.js>> ftp_commands.txt
echo mput sw.js.map>> ftp_commands.txt
echo mput workbox-8c29f6e4.js>> ftp_commands.txt
echo mput workbox-8c29f6e4.js.map>> ftp_commands.txt

REM assets 폴더
echo cd assets>> ftp_commands.txt
echo mput assets\index-*.js>> ftp_commands.txt
echo mput assets\index-*.css>> ftp_commands.txt
echo mput assets\*.js.map>> ftp_commands.txt

echo quit>> ftp_commands.txt

echo [1] FTP 명령어 파일 생성 완료
echo.
echo [2] FTP 업로드 시작...
echo.

REM 빌드 확인
if not exist "dist\index.html" (
    echo [오류] dist 폴더가 없습니다!
    echo 먼저 npm run build를 실행하세요.
    pause
    exit /b 1
)

REM FTP 실행
cd dist
ftp -n -s:..\ftp_commands.txt intruevine.dscloud.biz 21

cd ..
del ftp_commands.txt

echo.
echo ==========================================
if %errorlevel% == 0 (
    echo [성공] 업로드 완료!
) else (
    echo [경고] 업로드 중 일부 문제가 발생했습니다.
    echo FileZilla를 사용해 수동으로 업로드하세요.
)
echo ==========================================
echo.
echo URL: https://intruvine.dscloud.biz/MA/
echo.
pause
