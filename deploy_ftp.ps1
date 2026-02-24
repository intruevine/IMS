# Intruevine IMS FTP 諛고룷 ?ㅽ겕由쏀듃 (PowerShell)
# ?ъ슜踰? PowerShell?먯꽌 ?ㅽ뻾
# .\deploy_ftp.ps1

# FTP ?쒕쾭 ?뺣낫
$Server = "intruevine.dscloud.biz"
$User = "boazkim"
$Password = "R@kaf_427"
$RemoteDir = "/web_packages/MA"
$LocalDist = ".\dist"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Intruevine IMS FTP 諛고룷" -ForegroundColor Cyan
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

# FTP URI ?앹꽦
$ftpUri = "ftp://$Server$RemoteDir"

Write-Host "[1/3] FTP ?곌껐 ?뚯뒪??.."
try {
    $ftpRequest = [System.Net.FtpWebRequest]::Create($ftpUri)
    $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
    $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($User, $Password)
    $ftpRequest.UseBinary = $true
    $ftpRequest.UsePassive = $true
    $ftpRequest.KeepAlive = $false
    
    $response = $ftpRequest.GetResponse()
    $response.Close()
    Write-Host "[?꾨즺] FTP ?곌껐 ?깃났" -ForegroundColor Green
} catch {
    Write-Host "[?ㅻ쪟] FTP ?곌껐 ?ㅽ뙣: $_" -ForegroundColor Red
    Write-Host "- ?몄뒪?? $Server" -ForegroundColor Yellow
    Write-Host "- ?ъ슜?? $User" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# ?뚯씪 ?낅줈???⑥닔
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
        Write-Host "?낅줈???ㅽ뙣: $remoteFile - $_" -ForegroundColor Red
        return $false
    }
}

# ?붾젆?좊━ ?앹꽦 ?⑥닔
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
            # ?대? 議댁옱?????덉쓬
        }
        return $true
    } catch {
        return $false
    }
}

Write-Host "[2/3] ?뚯씪 ?낅줈??以?.." -ForegroundColor Yellow
Write-Host ""

# ?뚯씪 紐⑸줉 ?섏쭛
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
    
    # ?붾젆?좊━ ?앹꽦
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
    Write-Host "[?깃났] 紐⑤뱺 ?뚯씪 諛고룷 ?꾨즺!" -ForegroundColor Green
} else {
    Write-Host "[?꾨즺] 諛고룷 ?꾨즺 (?깃났: $successCount, ?ㅽ뙣: $failCount)" -ForegroundColor Yellow
}
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "?ъ씠??URL: https://intruevine.dscloud.biz" -ForegroundColor Cyan
Write-Host "諛고룷 寃쎈줈: $RemoteDir" -ForegroundColor White
Write-Host ""

# ?꾨즺 ??釉뚮씪?곗? ?닿린 (?좏깮?ы빆)
$OpenBrowser = Read-Host "釉뚮씪?곗??먯꽌 ?닿퉴?? (y/n)"
if ($OpenBrowser -eq 'y') {
    Start-Process "https://intruevine.dscloud.biz"
}

