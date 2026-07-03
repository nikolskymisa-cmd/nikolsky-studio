$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$editorUrl = "http://127.0.0.1:3000/editor"
$apiUrl = "http://127.0.0.1:4317/health"

function Test-Url($url) {
  try {
    Invoke-WebRequest -Uri $url -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

Set-Location $projectRoot

if (-not (Test-Url $apiUrl) -or -not (Test-Url $editorUrl)) {
  Start-Process -WindowStyle Hidden -FilePath "npm.cmd" -ArgumentList "run dev" -WorkingDirectory $projectRoot
}

$ready = $false
for ($i = 0; $i -lt 45; $i++) {
  if ((Test-Url $apiUrl) -and (Test-Url $editorUrl)) {
    $ready = $true
    break
  }
  Start-Sleep -Seconds 1
}

if ($ready) {
  Start-Process $editorUrl
} else {
  Start-Process "http://127.0.0.1:3000"
  Write-Host "Проект запускается дольше обычного. Подожди немного и обнови страницу."
}
