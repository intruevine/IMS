# Intruevine IMS FTP 배포 스크립트 (PowerShell)
# 사용법: PowerShell에서 실행
# .\deploy_ftp.ps1

# FTP 서버 정보
$Server = "intruvine.dscloud.biz"
$User = "boazkim"
$Password = "R@kaf_427"
$RemoteDir = "/web_packages/MA"
$LocalDist = ".\dist"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Intruevine IMS FTP 배포" -ForegroundColor Cyan
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

# FTP URI 생성
$ftpUri = "ftp://$Server$RemoteDir"

Write-Host "[1/3] FTP 연결 테스트..."
try {
    $ftpRequest = [System.Net.FtpWebRequest]::Create($ftpUri)
    $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
    $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($User, $Password)
    $ftpRequest.UseBinary = $true
    $ftpRequest.UsePassive = $true
    $ftpRequest.KeepAlive = $false
    
    $response = $ftpRequest.GetResponse()
    $response.Close()
    Write-Host "[완료] FTP 연결 성공" -ForegroundColor Green
} catch {
    Write-Host "[오류] FTP 연결 실패: $_" -ForegroundColor Red
    Write-Host "- 호스트: $Server" -ForegroundColor Yellow
    Write-Host "- 사용자: $User" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 파일 업로드 함수
function Upload-FtpFile($localFile, $remoteFile) {
    try {
        $uri = "ftp://$Server$remoteFile"
        $ftp = [System.Net.FtpWebRequest]::Create($uri)
        $ftp.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $ftp.Credentials = New-Object System.Net.NetworkCredential($User, $Password)
        $ftp.UseBinary = $true
        $ftp.UsePassive = $true
        $ftp.KeepAlive = $false
        
        $content = [System.IO.File]::ReadAllBytes($localFile)
        $ftp.ContentLength = $content.Length
        
        $requestStream = $ftp.GetRequestStream()
        $requestStream.Write($content, 0, $content.Length)
        $requestStream.Close()
        $requestStream.Dispose()
        
        return $true
    } catch {
        Write-Host "업로드 실패: $remoteFile - $_" -ForegroundColor Red
        return $false
    }
}

# 디렉토리 생성 함수
function Create-FtpDirectory($remoteDir) {
    try {
        $uri = "ftp://$Server$remoteDir"
        $ftp = [System.Net.FtpWebRequest]::Create($uri)
        $ftp.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $ftp.Credentials = New-Object System.Net.NetworkCredential($User, $Password)
        $ftp.UsePassive = $true
        $ftp.KeepAlive = $false
        
        try {
            $response = $ftp.GetResponse()
            $response.Close()
        } catch {
            # 이미 존재할 수 있음
        }
        return $true
    } catch {
        return $false
    }
}

Write-Host "[2/3] 파일 업로드 중..." -ForegroundColor Yellow
Write-Host ""

# 파일 목록 수집
$files = Get-ChildItem -Path $LocalDist -Recurse | Where-Object { -not $_.PSIsContainer }
$totalFiles = $files.Count
$currentFile = 0
$successCount = 0
$failCount = 0

foreach ($file in $files) {
    $currentFile++
    $localPath = $file.FullName
    $relativePath = $localPath.Replace((Resolve-Path $LocalDist).Path, "").Replace("\", "/")
    $remotePath = "$RemoteDir$relativePath"
    
    # 디렉토리 생성
    $remoteDir = Split-Path -Parent $remotePath
    if ($remoteDir -ne $RemoteDir) {
        Create-FtpDirectory $remoteDir
    }
    
    $percent = [math]::Round(($currentFile / $totalFiles) * 100)
    Write-Host "[$percent%] $relativePath" -NoNewline
    
    if (Upload-FtpFile $localPath $remotePath) {
        Write-Host " [OK]" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host " [FAIL]" -ForegroundColor Red
        $failCount++
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
if ($failCount -eq 0) {
    Write-Host "[성공] 모든 파일 배포 완료!" -ForegroundColor Green
} else {
    Write-Host "[완료] 배포 완료 (성공: $successCount, 실패: $failCount)" -ForegroundColor Yellow
}
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "사이트 URL: https://intruvine.dscloud.biz" -ForegroundColor Cyan
Write-Host "배포 경로: $RemoteDir" -ForegroundColor White
Write-Host ""

# 완료 후 브라우저 열기 (선택사항)
$OpenBrowser = Read-Host "브라우저에서 열까요? (y/n)"
if ($OpenBrowser -eq 'y') {
    Start-Process "https://intruvine.dscloud.biz"
}
