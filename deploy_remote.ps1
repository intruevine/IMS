# Intruevine IMS 원격 배포 스크립트 (PowerShell)
# 사용법: PowerShell에서 실행
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# .\deploy_remote.ps1

# 서버 정보
$Server = "intruvine.dscloud.biz"
$User = "boazkim"
$Password = "R@kaf_427"
$RemoteDir = "/web_packages/MA"
$LocalDist = ".\dist"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Intruevine IMS 원격 배포" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "서버: $Server"
Write-Host "경로: $RemoteDir"
Write-Host ""

# 빌드 확인
if (-not (Test-Path "$LocalDist\index.html")) {
    Write-Host "[오류] dist 폴더가 없습니다." -ForegroundColor Red
    Write-Host "npm run build를 먼저 실행하세요." -ForegroundColor Yellow
    exit 1
}

# PSCP 확인 (PuTTY의 SCP 도구)
$pscpPath = "${env:ProgramFiles}\PuTTY\pscp.exe"
if (-not (Test-Path $pscpPath)) {
    $pscpPath = "${env:ProgramFiles(x86)}\PuTTY\pscp.exe"
}

if (-not (Test-Path $pscpPath)) {
    Write-Host "[설치] PuTTY PSCP가 필요합니다..." -ForegroundColor Yellow
    Write-Host "1. https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html 다운로드" -ForegroundColor Yellow
    Write-Host "2. PuTTY 설치 (pscp.exe 포함)" -ForegroundColor Yellow
    Write-Host "3. 설치 후 다시 실행" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "또는 수동으로 FileZilla/WinSCP를 사용하세요:" -ForegroundColor Cyan
    Write-Host "  호스트: intruevine.dscloud.biz" -ForegroundColor White
    Write-Host "  사용자: boazkim" -ForegroundColor White
    Write-Host "  비밀번호: R@kaf_427" -ForegroundColor White
    Write-Host "  로컬: .\dist\" -ForegroundColor White
    Write-Host "  원격: /web_packages/MA" -ForegroundColor White
    exit 1
}

Write-Host "[1/3] 서버 연결 테스트..."
$plinkPath = [System.IO.Path]::GetDirectoryName($pscpPath) + "\plink.exe"
& $plinkPath -pw $Password -batch $User@$Server "echo '연결 성공'" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[오류] 서버 연결 실패" -ForegroundColor Red
    Write-Host "- 사용자명/비밀번호 확인" -ForegroundColor Yellow
    Write-Host "- 서버 주소 확인" -ForegroundColor Yellow
    exit 1
}
Write-Host "[완료] 서버 연결 성공" -ForegroundColor Green
Write-Host ""

Write-Host "[2/3] 기존 파일 백업..."
$BackupDate = Get-Date -Format "yyyyMMdd_HHmmss"
& $plinkPath -pw $Password -batch $User@$Server @"
cd $RemoteDir
cd ..
cp -r MA MA_backup_$BackupDate 2>/dev/null || echo '백업 없음'
"@ 2>&1 | Out-Null
Write-Host "[완료] 백업: MA_backup_$BackupDate" -ForegroundColor Green
Write-Host ""

Write-Host "[3/3] 파일 업로드 중... (시간이 소요될 수 있습니다)" -ForegroundColor Yellow
Write-Host "파일 목록:" -ForegroundColor Gray
Get-ChildItem -Path $LocalDist | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Gray }
Write-Host ""

# PSCP로 업로드
& $pscpPath -r -pw $Password -P 22 "$LocalDist\*" "$User@${Server}:${RemoteDir}/" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "[성공] 배포가 완료되었습니다!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "사이트 URL: https://intruvine.dscloud.biz" -ForegroundColor Cyan
    Write-Host "배포 경로: $RemoteDir" -ForegroundColor White
    Write-Host ""
    Write-Host "브라우저에서 확인하세요." -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "[오류] 업로드 실패" -ForegroundColor Red
    Write-Host "- 네트워크 연결 확인" -ForegroundColor Yellow
    Write-Host "- 서버 디스크 공간 확인" -ForegroundColor Yellow
    Write-Host "- 파일 권한 확인" -ForegroundColor Yellow
    exit 1
}

# 완료 후 브라우저 열기 (선택사항)
$OpenBrowser = Read-Host "브라우저에서 열까요? (y/n)"
if ($OpenBrowser -eq 'y') {
    Start-Process "https://intruvine.dscloud.biz"
}
