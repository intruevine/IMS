@echo off
chcp 65001
cls

echo ==========================================
echo Intruevine IMS FTP 배포 (수동 가이드)
echo ==========================================
echo.
echo 서버: intruevine.dscloud.biz
echo 사용자: boazkim
echo 배포 경로: /web_packages/MA
echo.
echo [배포 방법]
echo.
echo 방법 1: FileZilla Client (권장)
echo ----------------------------------------
echo 1. FileZilla 다운로드 및 설치
echo    https://filezilla-project.org/
echo.
echo 2. FileZilla 실행 후 다음 정보 입력:
echo    호스트: intruevine.dscloud.biz
echo    사용자명: boazkim
echo    비밀번호: R@kaf_427
echo    포트: 21 (FTP) 또는 22 (SFTP/SSH)
echo.
echo 3. 연결 후:
echo    - 왼쪽(로컬): dist 폴더 열기
echo    - 오른쪽(원격): /web_packages/MA 이동
echo    - 파일들을 오른쪽으로 드래그하여 업로드
echo.
echo 방법 2: Windows 탐색기
echo ----------------------------------------
echo 1. 탐색기 주소창에 입력:
echo    ftp://boazkim:R@kaf_427@intruvine.dscloud.biz/web_packages/MA
echo.
echo 2. dist 폴더 내용 복사하여 붙여넣기
echo.
echo 방법 3: FTP 명령어 (CMD)
echo ----------------------------------------
echo ftp -s:ftp_commands.txt intruevine.dscloud.biz
echo.
echo [현재 준비된 파일]
echo ----------------------------------------
dir /b dist\* 2>nul
echo.
echo dist\assets\
dir /b dist\assets\* 2>nul
echo.
echo ==========================================
echo 배포 URL: https://intruvine.dscloud.biz
echo ==========================================
echo.
pause
