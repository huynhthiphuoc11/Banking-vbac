param(
  [switch]$NoChat,
  [switch]$Background
)

$ErrorActionPreference = "Stop"

$BackendDir = $PSScriptRoot
$RootDir = Split-Path -Parent $BackendDir
$Python = Join-Path $BackendDir ".venv\\Scripts\\python.exe"

if (!(Test-Path $Python)) {
  Write-Host "Missing venv python at $Python" -ForegroundColor Red
  Write-Host "Run one-time setup first:" -ForegroundColor Yellow
  Write-Host "  cd `"$BackendDir`"" -ForegroundColor Yellow
  Write-Host "  python -m venv .venv" -ForegroundColor Yellow
  Write-Host "  .\\.venv\\Scripts\\Activate.ps1" -ForegroundColor Yellow
  Write-Host "  python -m pip install -r requirements.txt" -ForegroundColor Yellow
  exit 1
}

$DatasetDir = Join-Path $RootDir "dataset\\FAR-Trans"
if (!(Test-Path $DatasetDir)) {
  Write-Host "Dataset folder not found at $DatasetDir" -ForegroundColor Red
  Write-Host "Expected FAR-Trans dataset at: $DatasetDir" -ForegroundColor Yellow
  exit 1
}

function Start-ServiceWindow([string]$Name, [string]$Command) {
  $title = "Backend - $Name"
  $psCmd = @"
$Host.UI.RawUI.WindowTitle = '$title'
Set-Location -LiteralPath '$BackendDir'
`$env:DISABLE_AUTH = '1'
$Command
"@
  Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $psCmd) | Out-Null
}

function Start-ServiceJob([string]$Name, [string]$Command) {
  Start-Job -Name $Name -ScriptBlock ([ScriptBlock]::Create(@"
Set-Location -LiteralPath '$BackendDir'
`$env:DISABLE_AUTH = '1'
$Command
"@)) | Out-Null
}

# Transaction service (:8002)
$txCmd = "`$env:DATASET_DIR = '$DatasetDir'; & '$Python' -m uvicorn transaction_service.app.main:app --reload --port 8002"

# Conversation service (:8001) - optional
$convCmd = "& '$Python' -m uvicorn conversation_service.app.main:app --reload --port 8001"

# Gateway (:8000)
$gwCmd = "& '$Python' -m uvicorn api_gateway_local.app.main:app --reload --port 8000"

if ($Background) {
  Write-Host "Starting backend as background jobs..." -ForegroundColor Cyan
  Start-ServiceJob "transaction_service" $txCmd
  if (!$NoChat) { Start-ServiceJob "conversation_service" $convCmd }
  Start-ServiceJob "api_gateway_local" $gwCmd
  Write-Host "Jobs started. Use: Get-Job | Receive-Job -Keep" -ForegroundColor Green
  Write-Host "Stop jobs: Stop-Job -Name transaction_service,conversation_service,api_gateway_local; Remove-Job *" -ForegroundColor Yellow
} else {
  Write-Host "Starting backend in separate PowerShell windows..." -ForegroundColor Cyan
  Start-ServiceWindow "transaction_service (:8002)" $txCmd
  if (!$NoChat) { Start-ServiceWindow "conversation_service (:8001)" $convCmd }
  Start-ServiceWindow "api_gateway_local (:8000)" $gwCmd
  Write-Host "Done. Gateway docs: http://127.0.0.1:8000/docs" -ForegroundColor Green
}


