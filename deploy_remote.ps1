# Intruevine IMS ?먭꺽 諛고룷 ?ㅽ겕由쏀듃 (PowerShell)
# ?ъ슜踰? PowerShell?먯꽌 ?ㅽ뻾
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# .\deploy_remote.ps1

# ?쒕쾭 ?뺣낫
$Server = "intruevine.dscloud.biz"
$User = "boazkim"
$Password = "R@kaf_427"
$RemoteDir = "/web_packages/MA"
$LocalDist = ".\dist"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Intruevine IMS ?먭꺽 諛고룷" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "?쒕쾭: $Server"
Write-Host "寃쎈줈: $RemoteDir"
Write-Host ""

# 鍮뚮뱶 ?뺤씤
if (-not (Test-Path "$LocalDist\index.html")) {
    Write-Host "[?ㅻ쪟] dist ?대뜑媛 ?놁뒿?덈떎." -ForegroundColor Red
    Write-Host "npm run build瑜?癒쇱? ?ㅽ뻾?섏꽭??" -ForegroundColor Yellow
    exit 1
}

# PSCP ?뺤씤 (PuTTY??SCP ?꾧뎄)
$pscpPath = "${env:ProgramFiles}\PuTTY\pscp.exe"
if (-not (Test-Path $pscpPath)) {
    $pscpPath = "${env:ProgramFiles(x86)}\PuTTY\pscp.exe"
}

if (-not (Test-Path $pscpPath)) {
    Write-Host "[?ㅼ튂] PuTTY PSCP媛 ?꾩슂?⑸땲??.." -ForegroundColor Yellow
    Write-Host "1. https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html ?ㅼ슫濡쒕뱶" -ForegroundColor Yellow
    Write-Host "2. PuTTY ?ㅼ튂 (pscp.exe ?ы븿)" -ForegroundColor Yellow
    Write-Host "3. ?ㅼ튂 ???ㅼ떆 ?ㅽ뻾" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "?먮뒗 ?섎룞?쇰줈 FileZilla/WinSCP瑜??ъ슜?섏꽭??" -ForegroundColor Cyan
    Write-Host "  ?몄뒪?? intruevine.dscloud.biz" -ForegroundColor White
    Write-Host "  ?ъ슜?? boazkim" -ForegroundColor White
    Write-Host "  鍮꾨?踰덊샇: R@kaf_427" -ForegroundColor White
    Write-Host "  濡쒖뺄: .\dist\" -ForegroundColor White
    Write-Host "  ?먭꺽: /web_packages/MA" -ForegroundColor White
    exit 1
}

Write-Host "[1/3] ?쒕쾭 ?곌껐 ?뚯뒪??.."
$plinkPath = [System.IO.Path]::GetDirectoryName($pscpPath) + "\plink.exe"
& $plinkPath -pw $Password -batch $User@$Server "echo '?곌껐 ?깃났'" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[?ㅻ쪟] ?쒕쾭 ?곌껐 ?ㅽ뙣" -ForegroundColor Red
    Write-Host "- ?ъ슜?먮챸/鍮꾨?踰덊샇 ?뺤씤" -ForegroundColor Yellow
    Write-Host "- ?쒕쾭 二쇱냼 ?뺤씤" -ForegroundColor Yellow
    exit 1
}
Write-Host "[?꾨즺] ?쒕쾭 ?곌껐 ?깃났" -ForegroundColor Green
Write-Host ""

Write-Host "[2/3] 湲곗〈 ?뚯씪 諛깆뾽..."
$BackupDate = Get-Date -Format "yyyyMMdd_HHmmss"
& $plinkPath -pw $Password -batch $User@$Server @"
cd $RemoteDir
cd ..
cp -r MA MA_backup_$BackupDate 2>/dev/null || echo '諛깆뾽 ?놁쓬'
"@ 2>&1 | Out-Null
Write-Host "[?꾨즺] 諛깆뾽: MA_backup_$BackupDate" -ForegroundColor Green
Write-Host ""

Write-Host "[3/3] ?뚯씪 ?낅줈??以?.. (?쒓컙???뚯슂?????덉뒿?덈떎)" -ForegroundColor Yellow
Write-Host "?뚯씪 紐⑸줉:" -ForegroundColor Gray
Get-ChildItem -Path $LocalDist | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }
Write-Host ""

# PSCP濡??낅줈??& $pscpPath -r -pw $Password -P 22 "$LocalDist\*" "$User@${Server}:${RemoteDir}/" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "[?깃났] 諛고룷媛 ?꾨즺?섏뿀?듬땲??" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "?ъ씠??URL: https://intruevine.dscloud.biz" -ForegroundColor Cyan
    Write-Host "諛고룷 寃쎈줈: $RemoteDir" -ForegroundColor White
    Write-Host ""
    Write-Host "釉뚮씪?곗??먯꽌 ?뺤씤?섏꽭??" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "[?ㅻ쪟] ?낅줈???ㅽ뙣" -ForegroundColor Red
    Write-Host "- ?ㅽ듃?뚰겕 ?곌껐 ?뺤씤" -ForegroundColor Yellow
    Write-Host "- ?쒕쾭 ?붿뒪??怨듦컙 ?뺤씤" -ForegroundColor Yellow
    Write-Host "- ?뚯씪 沅뚰븳 ?뺤씤" -ForegroundColor Yellow
    exit 1
}

# ?꾨즺 ??釉뚮씪?곗? ?닿린 (?좏깮?ы빆)
$OpenBrowser = Read-Host "釉뚮씪?곗??먯꽌 ?닿퉴?? (y/n)"
if ($OpenBrowser -eq 'y') {
    Start-Process "https://intruevine.dscloud.biz"
}

