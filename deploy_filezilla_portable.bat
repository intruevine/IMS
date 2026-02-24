@echo off
chcp 65001
cls

echo ==========================================
echo Intruevine IMS - FileZilla Portable ?먮룞 諛고룷
echo ==========================================
echo.

REM ?ㅼ젙
set "FZ_PORTABLE_PATH=C:\Program Files\FileZillaPortable"
set "LOCAL_DIR=C:\web_packages\MA"
set "FTP_HOST=intruevine.dscloud.biz"
set "FTP_PORT=21"
set "FTP_USER=boazkim"
set "FTP_PASS=R@kaf_427"
set "REMOTE_DIR=/web_packages/MA"

REM FileZilla Portable 寃쎈줈 ?뺤씤
if not exist "%FZ_PORTABLE_PATH%\FileZillaPortable.exe" (
    echo [?ㅻ쪟] FileZilla Portable??李얠쓣 ???놁뒿?덈떎!
    echo.
    echo FileZilla Portable ?ㅼ슫濡쒕뱶:
    echo https://portableapps.com/apps/internet/filezilla_portable
    echo.
    echo ?ㅼ슫濡쒕뱶 ???뺤텞???댁젣?섍퀬 寃쎈줈瑜??뺤씤?섏꽭??
    echo 湲곕낯 寃쎈줈: %FZ_PORTABLE_PATH%
    echo.
    pause
    exit /b 1
)

echo [FileZilla Portable 寃쎈줈 ?뺤씤] %FZ_PORTABLE_PATH%
echo.

REM 鍮뚮뱶 ?뺤씤
if not exist "%LOCAL_DIR%\index.html" (
    echo [鍮뚮뱶 ?꾩슂] dist ?대뜑媛 ?놁뒿?덈떎.
    echo npm run build瑜??ㅽ뻾?⑸땲??..
    echo.
    npm run build
    if errorlevel 1 (
        echo [?ㅻ쪟] 鍮뚮뱶 ?ㅽ뙣!
        pause
        exit /b 1
    )
    echo [鍮뚮뱶 ?꾨즺]
    echo.
)

echo [1/3] FileZilla ?ㅽ겕由쏀듃 ?앹꽦 以?..

REM FileZilla XML ?ㅼ젙 ?뚯씪 ?앹꽦
(
echo ^<?xml version="1.0" encoding="UTF-8"?^>
echo ^<FileZilla3 version="3.65.0" platform="windows"^>
echo   ^<Settings^>
echo     ^<Setting name="Config Location"^>%LOCAL_DIR%\fz_temp^</Setting^>
echo   ^</Settings^>
echo ^</FileZilla3^>
) > "%LOCAL_DIR%\fz_config.xml"

REM FileZilla ?먮룞 ?낅줈???ㅽ겕由쏀듃 (fzdefaults.xml 諛⑹떇)
(
echo open ftp://%FTP_USER%:%FTP_PASS%@%FTP_HOST%:%FTP_PORT%
echo lcd "%LOCAL_DIR%"
echo cd %REMOTE_DIR%
echo binary
echo prompt off

REM ?뚯씪 ?낅줈??紐낅졊 ?앹꽦
for %%f in ("%LOCAL_DIR%\index.html" "%LOCAL_DIR%\manifest.webmanifest" "%LOCAL_DIR%\registerSW.js" "%LOCAL_DIR%\sw.js" "%LOCAL_DIR%\sw.js.map" "%LOCAL_DIR%\workbox-*.js" "%LOCAL_DIR%\workbox-*.js.map") do (
    echo put "%%f"
)

REM assets ?대뜑 泥섎━
if exist "%LOCAL_DIR%\assets" (
    echo cd assets
    for %%f in ("%LOCAL_DIR%\assets\*.*") do (
        echo put "%%f"
    )
)

echo close
echo quit
) > "%LOCAL_DIR%\fz_script.txt"

echo [?꾨즺] ?ㅽ겕由쏀듃 ?앹꽦
echo.

echo [2/3] FileZilla Portable ?ㅽ뻾 諛??낅줈??..
echo.

REM 諛⑸쾿 1: FileZilla CLI ?ъ슜 (sftp 紐낅졊)
start /wait "" "%FZ_PORTABLE_PATH%\App\filezilla\fzcli.exe" ^
    --site="0/%FTP_USER%@%FTP_HOST%" ^
    --local="%LOCAL_DIR%" ^
    --remote="%REMOTE_DIR%" ^
    --action=upload ^
    --overwrite

if errorlevel 1 (
    echo.
    echo [諛⑸쾿 2] FileZilla GUI濡??섎룞 ?낅줈???덈궡...
    echo.
    echo FileZilla Portable???먮룞?쇰줈 ?ㅽ뻾?⑸땲??
    echo ?섎룞?쇰줈 ?뚯씪???낅줈?쒗븯?몄슂:
    echo.
    echo 1. 鍮좊Ⅸ?묒냽???뺣낫 ?낅젰:
    echo    ?몄뒪?? %FTP_HOST%
    echo    ?ъ슜?? %FTP_USER%
    echo    鍮꾨?踰덊샇: %FTP_PASS%
    echo    ?ы듃: %FTP_PORT%
    echo.
    echo 2. 濡쒖뺄: %LOCAL_DIR%
    echo    ?먭꺽: %REMOTE_DIR%
    echo.
    echo 3. ?뚯씪 ?쒕옒洹명븯???낅줈??    echo.
    
    start "" "%FZ_PORTABLE_PATH%\FileZillaPortable.exe"
    
    echo FileZilla媛 ?ㅽ뻾?섏뿀?듬땲?? ?낅줈???꾨즺 ???꾨Т ?ㅻ굹 ?꾨Ⅴ?몄슂...
    pause > nul
)

echo.
echo [3/3] ?뺣━ 以?..
del "%LOCAL_DIR%\fz_script.txt" 2>nul
del "%LOCAL_DIR%\fz_config.xml" 2>nul

echo.
echo ==========================================
echo [?꾨즺] 諛고룷 ?꾨줈?몄뒪 醫낅즺
echo ==========================================
echo.
echo ?ъ씠??URL: https://intruevine.dscloud.biz/MA/
echo.

set /p openBrowser="釉뚮씪?곗??먯꽌 ?뺤씤?섏떆寃좎뒿?덇퉴? (y/n): "
if "%openBrowser%"=="y" (
    start https://intruevine.dscloud.biz/MA/
)

echo.
pause

