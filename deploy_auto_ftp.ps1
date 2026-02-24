param(
    [string]$Server = "intruevine.dscloud.biz",
    [string]$User = "boazkim",
    [string]$Password = "R@kaf_427",
    [string]$RemoteDir = "/web_packages/MA",
    [string]$LocalDir = ".\dist"
)

# FTP ?먮룞 諛고룷 ?ㅽ겕由쏀듃 (PowerShell)
# ?ъ슜踰? .\deploy_auto_ftp.ps1
# ?먮뒗 ?뱀젙 寃쎈줈 吏?? .\deploy_auto_ftp.ps1 -LocalDir "C:\web_packages\MA"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Intruevine IMS ?먮룞 FTP 諛고룷" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "?쒕쾭: $Server"
Write-Host "?ъ슜?? $User"
Write-Host "?먭꺽 寃쎈줈: $RemoteDir"
Write-Host "濡쒖뺄 寃쎈줈: $LocalDir"
Write-Host ""

# 1. 鍮뚮뱶 ?뺤씤 諛??ㅽ뻾
if (-not (Test-Path "$LocalDir\index.html")) {
    Write-Host "[鍮뚮뱶 ?꾩슂] dist ?대뜑媛 ?놁뒿?덈떎. 鍮뚮뱶瑜??쒖옉?⑸땲??.." -ForegroundColor Yellow
    
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[?ㅻ쪟] 鍮뚮뱶 ?ㅽ뙣!" -ForegroundColor Red
            exit 1
        }
        Write-Host "[?꾨즺] 鍮뚮뱶 ?깃났!" -ForegroundColor Green
    } catch {
        Write-Host "[?ㅻ쪟] 鍮뚮뱶 以??ㅻ쪟 諛쒖깮: $_" -ForegroundColor Red
        exit 1
    }
} else {
    $buildTime = (Get-Item "$LocalDir\index.html").LastWriteTime
    $currentTime = Get-Date
    $timeDiff = $currentTime - $buildTime
    
    Write-Host "[?뺣낫] 留덉?留?鍮뚮뱶: $($buildTime.ToString('yyyy-MM-dd HH:mm:ss')) ($([math]::Round($timeDiff.TotalMinutes))遺???" -ForegroundColor Gray
    
    $rebuild = Read-Host "?ㅼ떆 鍮뚮뱶?섏떆寃좎뒿?덇퉴? (y/n, 湲곕낯: n)"
    if ($rebuild -eq 'y') {
        Write-Host "[鍮뚮뱶 ?쒖옉]..." -ForegroundColor Yellow
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[?ㅻ쪟] 鍮뚮뱶 ?ㅽ뙣!" -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host ""

# 2. FTP ?곌껐 ?뚯뒪??Write-Host "[1/3] FTP ?쒕쾭 ?곌껐 ?뚯뒪??.." -ForegroundColor Yellow
try {
    $ftpUri = "ftp://$Server$RemoteDir"
    $ftpRequest = [System.Net.FtpWebRequest]::Create($ftpUri)
    $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
    $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($User, $Password)
    $ftpRequest.UsePassive = $true
    $ftpRequest.Timeout = 10000
    
    $response = $ftpRequest.GetResponse()
    $response.Close()
    Write-Host "[?꾨즺] FTP ?곌껐 ?깃났!" -ForegroundColor Green
} catch {
    Write-Host "[?ㅻ쪟] FTP ?곌껐 ?ㅽ뙣: $_" -ForegroundColor Red
    Write-Host "?몄뒪?? ?ъ슜?먮챸, 鍮꾨?踰덊샇瑜??뺤씤?섏꽭??" -ForegroundColor Yellow
    exit 1
}

# 3. ?뚯씪 紐⑸줉 以鍮?Write-Host ""
Write-Host "[2/3] 諛고룷 ?뚯씪 以鍮?.." -ForegroundColor Yellow

$files = Get-ChildItem -Path $LocalDir -Recurse | Where-Object { -not $_.PSIsContainer }
$totalFiles = $files.Count
Write-Host "珥?$totalFiles 媛쒖쓽 ?뚯씪??諛고룷?⑸땲??" -ForegroundColor Gray

# ?뚯씪 ?낅줈???⑥닔
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
        Write-Host "?낅줈???ㅽ뙣: $remoteFile - $_" -ForegroundColor Red
        return $false
    }
}

# ?붾젆?좊━ ?앹꽦 ?⑥닔
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
            # ?대? 議댁옱?????덉쓬
        }
        return $true
    } catch {
        return $false
    }
}

# 4. ?뚯씪 ?낅줈??Write-Host ""
Write-Host "[3/3] FTP ?낅줈??以?.." -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$failCount = 0
$currentFile = 0

foreach ($file in $files) {
    $currentFile++
    $localPath = $file.FullName
    $relativePath = $localPath.Replace((Resolve-Path $LocalDir).Path, "").Replace("\", "/")
    $remotePath = "$RemoteDir$relativePath"
    
    # ?붾젆?좊━ ?앹꽦
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
    Write-Host "[?깃났] 紐⑤뱺 ?뚯씪 諛고룷 ?꾨즺! ($successCount/$totalFiles)" -ForegroundColor Green
} else {
    Write-Host "[?꾨즺] 諛고룷 ?꾨즺 (?깃났: $successCount, ?ㅽ뙣: $failCount)" -ForegroundColor Yellow
}
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "?ъ씠??URL: https://intruevine.dscloud.biz/MA" -ForegroundColor Cyan
Write-Host ""

# 釉뚮씪?곗? ?닿린 ?щ?
$openBrowser = Read-Host "釉뚮씪?곗??먯꽌 ?뺤씤?섏떆寃좎뒿?덇퉴? (y/n)"
if ($openBrowser -eq 'y') {
    Start-Process "https://intruevine.dscloud.biz/MA"
}

