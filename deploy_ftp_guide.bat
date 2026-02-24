@echo off
chcp 65001
cls

echo ==========================================
echo Intruevine IMS FTP 諛고룷 (?섎룞 媛?대뱶)
echo ==========================================
echo.
echo ?쒕쾭: intruevine.dscloud.biz
echo ?ъ슜?? boazkim
echo 諛고룷 寃쎈줈: /web_packages/MA
echo.
echo [諛고룷 諛⑸쾿]
echo.
echo 諛⑸쾿 1: FileZilla Client (沅뚯옣)
echo ----------------------------------------
echo 1. FileZilla ?ㅼ슫濡쒕뱶 諛??ㅼ튂
echo    https://filezilla-project.org/
echo.
echo 2. FileZilla ?ㅽ뻾 ???ㅼ쓬 ?뺣낫 ?낅젰:
echo    ?몄뒪?? intruevine.dscloud.biz
echo    ?ъ슜?먮챸: boazkim
echo    鍮꾨?踰덊샇: R@kaf_427
echo    ?ы듃: 21 (FTP) ?먮뒗 22 (SFTP/SSH)
echo.
echo 3. ?곌껐 ??
echo    - ?쇱そ(濡쒖뺄): dist ?대뜑 ?닿린
echo    - ?ㅻⅨ履??먭꺽): /web_packages/MA ?대룞
echo    - ?뚯씪?ㅼ쓣 ?ㅻⅨ履쎌쑝濡??쒕옒洹명븯???낅줈??echo.
echo 諛⑸쾿 2: Windows ?먯깋湲?echo ----------------------------------------
echo 1. ?먯깋湲?二쇱냼李쎌뿉 ?낅젰:
echo    ftp://boazkim:R@kaf_427@intruevine.dscloud.biz/web_packages/MA
echo.
echo 2. dist ?대뜑 ?댁슜 蹂듭궗?섏뿬 遺숈뿬?ｊ린
echo.
echo 諛⑸쾿 3: FTP 紐낅졊??(CMD)
echo ----------------------------------------
echo ftp -s:ftp_commands.txt intruevine.dscloud.biz
echo.
echo [?꾩옱 以鍮꾨맂 ?뚯씪]
echo ----------------------------------------
dir /b dist\* 2>nul
echo.
echo dist\assets\
dir /b dist\assets\* 2>nul
echo.
echo ==========================================
echo 諛고룷 URL: https://intruevine.dscloud.biz
echo ==========================================
echo.
pause

