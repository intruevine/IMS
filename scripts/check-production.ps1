$ErrorActionPreference = "Stop"

$targets = @(
  "https://intruevine.dscloud.biz/MA/",
  "https://intruevine.dscloud.biz/api/",
  "https://intruevine.dscloud.biz/MA/icon-192x192.png"
)

$results = foreach ($url in $targets) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $url -Method GET -TimeoutSec 20
    [pscustomobject]@{
      Url = $url
      StatusCode = [int]$response.StatusCode
      ContentType = $response.Headers["Content-Type"]
      Length = $response.RawContentLength
    }
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      [pscustomobject]@{
        Url = $url
        StatusCode = [int]$resp.StatusCode
        ContentType = $resp.Headers["Content-Type"]
        Length = $resp.ContentLength
      }
    } else {
      [pscustomobject]@{
        Url = $url
        StatusCode = -1
        ContentType = ""
        Length = 0
      }
    }
  }
}

$results | Format-Table -AutoSize
