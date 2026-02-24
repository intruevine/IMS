@echo off
chcp 65001

REM 諛고룷 ?ㅽ겕由쏀듃 - Intruevine IMS
REM ?ъ슜踰? deploy.bat

echo ==========================================
echo Intruevine IMS 諛고룷 ?ㅽ겕由쏀듃
echo ==========================================
echo.

REM 鍮뚮뱶 ?뺤씤
if not exist "dist\index.html" (
    echo [?ㅻ쪟] dist ?대뜑媛 ?놁뒿?덈떎. 癒쇱? npm run build瑜??ㅽ뻾?섏꽭??
    pause
    exit /b 1
)

REM 諛고룷 ?붾젆?좊━ ?ㅼ젙
set DEPLOY_DIR=C:\web_packages\MA

REM 諛고룷 ?붾젆?좊━ 議댁옱 ?뺤씤
if not exist "%DEPLOY_DIR%" (
    echo [?ㅻ쪟] 諛고룷 ?붾젆?좊━媛 議댁옱?섏? ?딆뒿?덈떎: %DEPLOY_DIR%
    echo ?붾젆?좊━瑜??앹꽦?섍굅??寃쎈줈瑜??뺤씤?섏꽭??
    pause
    exit /b 1
)

echo 諛고룷 ?붾젆?좊━: %DEPLOY_DIR%
echo.

REM 湲곗〈 ?뚯씪 諛깆뾽
set BACKUP_DIR=%DEPLOY_DIR%_backup_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set BACKUP_DIR=%BACKUP_DIR: =0%
echo 湲곗〈 ?뚯씪 諛깆뾽 以?.. 
xcopy /E /I /H /Y "%DEPLOY_DIR%" "%BACKUP_DIR%" >nul 2>&1
if %errorlevel% == 0 (
    echo [?꾨즺] 諛깆뾽: %BACKUP_DIR%
) else (
    echo [寃쎄퀬] 諛깆뾽 ?ㅽ뙣 (?뚯씪???놁쓣 ???덉쓬)
)
echo.

REM dist ?대뜑 ?댁슜??諛고룷 ?붾젆?좊━濡?蹂듭궗
echo ?뚯씪 蹂듭궗 以?..
xcopy /E /I /H /Y "dist\*" "%DEPLOY_DIR%\" >nul 2>&1

if %errorlevel% == 0 (
    echo.
    echo ==========================================
    echo [?깃났] 諛고룷媛 ?꾨즺?섏뿀?듬땲??
    echo ==========================================
    echo.
    echo 諛고룷 URL: https://intruevine.dscloud.biz
    echo 諛고룷 寃쎈줈: %DEPLOY_DIR%
    echo.
    echo 釉뚮씪?곗??먯꽌 ?ъ씠?몃? ?뺤씤?섏꽭??
    echo.
) else (
    echo.
    echo [?ㅻ쪟] ?뚯씪 蹂듭궗 以?臾몄젣媛 諛쒖깮?덉뒿?덈떎.
    echo 愿由ъ옄 沅뚰븳?쇰줈 ?ㅽ뻾?섍굅??寃쎈줈瑜??뺤씤?섏꽭??
    echo.
)

pause

