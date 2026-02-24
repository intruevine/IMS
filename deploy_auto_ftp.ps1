param(
    [string]$Server = "intruvine.dscloud.biz",
    [string]$User = "boazkim",
    [string]$Password = "R@kaf_427",
    [string]$RemoteDir = "/web_packages/MA",
    [string]$LocalDir = ".\dist"
)

# FTP 자동 배포 스크립트 (PowerShell)
# 사용법: .\deploy_auto_ftp.ps1
# 또는 특정 경로 지정: .\deploy_auto_ftp.ps1 -LocalDir "C:\web_packages\MA"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Intruevine IMS 자동 FTP 배포" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "서버: $Server"
Write-Host "사용자: $User"
Write-Host "원격 경로: $RemoteDir"
Write-Host "로컬 경로: $LocalDir"
Write-Host ""

# 1. 빌드 확인 및 실행
if (-not (Test-Path "$LocalDir\index.html")) {
    Write-Host "[빌드 필요] dist 폴더가 없습니다. 빌드를 시작합니다..." -ForegroundColor Yellow
    
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[오류] 빌드 실패!" -ForegroundColor Red
            exit 1
        }
        Write-Host "[완료] 빌드 성공!" -ForegroundColor Green
    } catch {
        Write-Host "[오류] 빌드 중 오류 발생: $_" -ForegroundColor Red
        exit 1
    }
} else {
    $buildTime = (Get-Item "$LocalDir\index.html").LastWriteTime
    $currentTime = Get-Date
    $timeDiff = $currentTime - $buildTime
    
    Write-Host "[정보] 마지막 빌드: $($buildTime.ToString('yyyy-MM-dd HH:mm:ss')) ($([math]::Round($timeDiff.TotalMinutes))분 전)" -ForegroundColor Gray
    
    $rebuild = Read-Host "다시 빌드하시겠습니까? (y/n, 기본: n)"
    if ($rebuild -eq 'y') {
        Write-Host "[빌드 시작]..." -ForegroundColor Yellow
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[오류] 빌드 실패!" -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host ""

# 2. FTP 연결 테스트
Write-Host "[1/3] FTP 서버 연결 테스트..." -ForegroundColor Yellow
try {
    $ftpUri = "ftp://$Server$RemoteDir"
    $ftpRequest = [System.Net.FtpWebRequest]::Create($ftpUri)
    $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
    $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($User, $Password)
    $ftpRequest.UsePassive = $true
    $ftpRequest.Timeout = 10000
    
    $response = $ftpRequest.GetResponse()
    $response.Close()
    Write-Host "[완료] FTP 연결 성공!" -ForegroundColor Green
} catch {
    Write-Host "[오류] FTP 연결 실패: $_" -ForegroundColor Red
    Write-Host "호스트, 사용자명, 비밀번호를 확인하세요." -ForegroundColor Yellow
    exit 1
}

# 3. 파일 목록 준비
Write-Host ""
Write-Host "[2/3] 배포 파일 준비..." -ForegroundColor Yellow

$files = Get-ChildItem -Path $LocalDir -Recurse | Where-Object { -not $_.PSIsContainer }
$totalFiles = $files.Count
Write-Host "총 $totalFiles 개의 파일을 배포합니다." -ForegroundColor Gray

# 파일 업로드 함수
function Upload-File($localFile, $remoteFile) {
    try {
        $uri = "ftp://$Server$remoteFile"
        $ftp = [System.Net.FtpWebRequest]::Create($uri)
        $ftp.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $ftp.Credentials = New-Object System.Net.NetworkCredential($User, $Password)
        $ftp.UseBinary = $true
        $ftp.UsePassive = $true
        $ftp.Timeout = 30000
        
        $content = [System.IO.File]::ReadAllBytes($localFile)
        $ftp.ContentLength = $content.Length
        
        $requestStream = $ftp.GetRequestStream()
        $requestStream.Write($content, 0, $content.Length)
        $requestStream.Close()
        
        return $true
    } catch {
        Write-Host "업로드 실패: $remoteFile - $_" -ForegroundColor Red
        return $false
    }
}

# 디렉토리 생성 함수
function Create-Directory($remoteDir) {
    try {
        $uri = "ftp://$Server$remoteDir"
        $ftp = [System.Net.FtpWebRequest]::Create($uri)
        $ftp.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
        $ftp.Credentials = New-Object System.Net.NetworkCredential($User, $Password)
        $ftp.UsePassive = $true
        
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

# 4. 파일 업로드
Write-Host ""
Write-Host "[3/3] FTP 업로드 중..." -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$failCount = 0
$currentFile = 0

foreach ($file in $files) {
    $currentFile++
    $localPath = $file.FullName
    $relativePath = $localPath.Replace((Resolve-Path $LocalDir).Path, "").Replace("\", "/")
    $remotePath = "$RemoteDir$relativePath"
    
    # 디렉토리 생성
    $remoteDir = Split-Path -Parent $remotePath
    if ($remoteDir -ne $RemoteDir) {
        Create-Directory $remoteDir
    }
    
    $percent = [math]::Round(($currentFile / $totalFiles) * 100)
    $fileName = $file.Name
    Write-Host "[$percent%] $fileName" -NoNewline
    
    if (Upload-File $localPath $remotePath) {
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
    Write-Host "[성공] 모든 파일 배포 완료! ($successCount/$totalFiles)" -ForegroundColor Green
} else {
    Write-Host "[완료] 배포 완료 (성공: $successCount, 실패: $failCount)" -ForegroundColor Yellow
}
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "사이트 URL: https://intruvine.dscloud.biz/MA" -ForegroundColor Cyan
Write-Host ""

# 브라우저 열기 여부
$openBrowser = Read-Host "브라우저에서 확인하시겠습니까? (y/n)"
if ($openBrowser -eq 'y') {
    Start-Process "https://intruvine.dscloud.biz/MA"
}
