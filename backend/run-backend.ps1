param(
  [switch]$NoChat,
  [switch]$Background,
  [switch]$Reload,
  [int]$GatewayPort = 8000,
  [int]$ConversationPort = 8001,
  [int]$TransactionPort = 8002
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

function Stop-PortListeners([int]$Port) {
  $procIds = (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique)
  foreach ($procId in $procIds) {
    try {
      $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
      Write-Host "Stopping pid $procId ($($proc.ProcessName)) on port $Port" -ForegroundColor Yellow
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    } catch {
      # ignore
    }
  }
}

# Ensure we don't accumulate multiple uvicorn instances on the same ports.
Stop-PortListeners $GatewayPort
Stop-PortListeners $ConversationPort
Stop-PortListeners $TransactionPort

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

# Prefer stability by default (no auto-reloader). Use -Reload if you want hot reload.
$reloadFlag = ""
if ($Reload) {
  $reloadFlag = "--reload"
}

# Transaction service
$txCmd = "`$env:DATASET_DIR = '$DatasetDir'; & '$Python' -m uvicorn transaction_service.app.main:app $reloadFlag --host 127.0.0.1 --port $TransactionPort"

# Conversation service - optional
$convCmd = "& '$Python' -m uvicorn conversation_service.app.main:app $reloadFlag --host 127.0.0.1 --port $ConversationPort"

# Gateway (BFF) - point it at downstream ports explicitly
$gwCmd = "`$env:TRANSACTION_SERVICE_URL = 'http://127.0.0.1:$TransactionPort'; `$env:CONVERSATION_SERVICE_URL = 'http://127.0.0.1:$ConversationPort'; & '$Python' -m uvicorn api_gateway_local.app.main:app $reloadFlag --host 127.0.0.1 --port $GatewayPort"

if ($Background) {
  Write-Host "Starting backend as background jobs..." -ForegroundColor Cyan
  Start-ServiceJob "transaction_service" $txCmd
  if (!$NoChat) { Start-ServiceJob "conversation_service" $convCmd }
  Start-ServiceJob "api_gateway_local" $gwCmd
  Write-Host "Jobs started. Use: Get-Job | Receive-Job -Keep" -ForegroundColor Green
  Write-Host "Stop jobs: Stop-Job -Name transaction_service,conversation_service,api_gateway_local; Remove-Job *" -ForegroundColor Yellow
} else {
  Write-Host "Starting backend in separate PowerShell windows..." -ForegroundColor Cyan
  Start-ServiceWindow "transaction_service (:$TransactionPort)" $txCmd
  if (!$NoChat) { Start-ServiceWindow "conversation_service (:$ConversationPort)" $convCmd }
  Start-ServiceWindow "api_gateway_local (:$GatewayPort)" $gwCmd
  Write-Host "Done. Gateway docs: http://127.0.0.1:$GatewayPort/docs" -ForegroundColor Green
}


