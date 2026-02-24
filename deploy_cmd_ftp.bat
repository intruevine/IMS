@echo off
chcp 65001
cls

echo ==========================================
echo Intruevine IMS - FTP ?낅줈??(CMD 諛⑹떇)
echo ==========================================
echo.
echo ?쒕쾭: intruevine.dscloud.biz:21
echo ?ъ슜?? boazkim
echo 寃쎈줈: /web_packages/MA
echo.

REM FTP 紐낅졊???뚯씪 ?앹꽦
echo user boazkim> ftp_commands.txt
echo R@kaf_427>> ftp_commands.txt
echo cd /web_packages/MA>> ftp_commands.txt
echo binary>> ftp_commands.txt
echo prompt off>> ftp_commands.txt

REM ?뚯씪 紐⑸줉 ?앹꽦
echo mput index.html>> ftp_commands.txt
echo mput manifest.webmanifest>> ftp_commands.txt
echo mput registerSW.js>> ftp_commands.txt
echo mput sw.js>> ftp_commands.txt
echo mput sw.js.map>> ftp_commands.txt
echo mput workbox-8c29f6e4.js>> ftp_commands.txt
echo mput workbox-8c29f6e4.js.map>> ftp_commands.txt

REM assets ?대뜑
echo cd assets>> ftp_commands.txt
echo mput assets\index-*.js>> ftp_commands.txt
echo mput assets\index-*.css>> ftp_commands.txt
echo mput assets\*.js.map>> ftp_commands.txt

echo quit>> ftp_commands.txt

echo [1] FTP 紐낅졊???뚯씪 ?앹꽦 ?꾨즺
echo.
echo [2] FTP ?낅줈???쒖옉...
echo.

REM 鍮뚮뱶 ?뺤씤
if not exist "dist\index.html" (
    echo [?ㅻ쪟] dist ?대뜑媛 ?놁뒿?덈떎!
    echo 癒쇱? npm run build瑜??ㅽ뻾?섏꽭??
    pause
    exit /b 1
)

REM FTP ?ㅽ뻾
cd dist
ftp -n -s:..\ftp_commands.txt intruevine.dscloud.biz 21

cd ..
del ftp_commands.txt

echo.
echo ==========================================
if %errorlevel% == 0 (
    echo [?깃났] ?낅줈???꾨즺!
) else (
    echo [寃쎄퀬] ?낅줈??以??쇰? 臾몄젣媛 諛쒖깮?덉뒿?덈떎.
    echo FileZilla瑜??ъ슜???섎룞?쇰줈 ?낅줈?쒗븯?몄슂.
)
echo ==========================================
echo.
echo URL: https://intruevine.dscloud.biz/MA/
echo.
pause

