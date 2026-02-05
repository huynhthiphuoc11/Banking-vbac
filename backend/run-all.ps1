param(
  # Start conversation_service too (needed for chat)
  [switch]$WithConversation = $true,

  # Dataset + memory safety knobs (recommended for local)
  [string]$DatasetDir = "..\\dataset\\FAR-Trans",
  [string]$DuckdbMemoryLimit = "512MB",
  [string]$TxOnlyCustomerId = "00017496858921195E5A",

  # Local convenience defaults
  [switch]$DisableAuth = $true,
  [switch]$DisableRateLimit = $true
)

$ErrorActionPreference = "Stop"

function Start-UvicornJob {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][int]$Port,
    [Parameter(Mandatory = $true)][string]$AppImport,
    [Parameter(Mandatory = $false)][string]$DatasetDir,
    [Parameter(Mandatory = $false)][string]$DuckdbMemoryLimit,
    [Parameter(Mandatory = $false)][string]$TxOnlyCustomerId,
    [Parameter(Mandatory = $false)][string]$DuckdbPath,
    [Parameter(Mandatory = $false)][bool]$DisableAuth,
    [Parameter(Mandatory = $false)][bool]$DisableRateLimit
  )

  # Stop existing job with same name (if any)
  $existing = Get-Job -Name $Name -ErrorAction SilentlyContinue
  if ($existing) {
    Stop-Job -Job $existing -Force | Out-Null
    Remove-Job -Job $existing -Force | Out-Null
  }

  $backendDir = (Resolve-Path "$PSScriptRoot").Path

  Start-Job -Name $Name -ScriptBlock {
    param($backendDir, $port, $appImport, $datasetDir, $duckdbMemoryLimit, $txOnlyCustomerId, $duckdbPath, $disableAuth, $disableRateLimit)

    Set-Location $backendDir

    if ($disableAuth) { $env:DISABLE_AUTH = "1" }
    if ($disableRateLimit) { $env:RATE_LIMIT_ENABLED = "0" }

    if ($datasetDir) { $env:DATASET_DIR = $datasetDir }
    if ($duckdbMemoryLimit) { $env:DUCKDB_MEMORY_LIMIT = $duckdbMemoryLimit }
    if ($txOnlyCustomerId) { $env:TX_ONLY_CUSTOMER_ID = $txOnlyCustomerId }
    if ($duckdbPath) { $env:DUCKDB_PATH = $duckdbPath }

    # Use the venv python directly so this script works even if Activate.ps1 is blocked.
    & "$backendDir\\.venv\\Scripts\\python.exe" -m uvicorn $appImport --host 127.0.0.1 --reload --port $port
  } -ArgumentList $backendDir, $Port, $AppImport, $DatasetDir, $DuckdbMemoryLimit, $TxOnlyCustomerId, $DuckdbPath, $DisableAuth, $DisableRateLimit | Out-Null
}

Write-Host "Starting backend services as background jobs..." -ForegroundColor Cyan

$txIdSafe = if ($TxOnlyCustomerId) { $TxOnlyCustomerId } else { "ALL" }
$txDuckdb = Join-Path $PSScriptRoot (".duckdb\\transaction_service-" + $txIdSafe + ".duckdb")
Start-UvicornJob -Name "banking-vbac-tx" -Port 8002 -AppImport "transaction_service.app.main:app" -DatasetDir $DatasetDir -DuckdbMemoryLimit $DuckdbMemoryLimit -TxOnlyCustomerId $TxOnlyCustomerId -DuckdbPath $txDuckdb -DisableAuth:$DisableAuth -DisableRateLimit:$DisableRateLimit
if ($WithConversation) {
  Start-UvicornJob -Name "banking-vbac-conv" -Port 8001 -AppImport "conversation_service.app.main:app" -DisableAuth:$DisableAuth -DisableRateLimit:$DisableRateLimit
}
Start-UvicornJob -Name "banking-vbac-gateway" -Port 8000 -AppImport "api_gateway_local.app.main:app" -DisableAuth:$DisableAuth -DisableRateLimit:$DisableRateLimit

Write-Host ""
Write-Host "Started:" -ForegroundColor Green
Get-Job | Where-Object { $_.Name -like "banking-vbac-*" } | Format-Table Id, Name, State

Write-Host ""
Write-Host "Health checks:" -ForegroundColor Yellow
Write-Host "  http://127.0.0.1:8000/healthz"
Write-Host "  http://127.0.0.1:8002/healthz"
if ($WithConversation) { Write-Host "  http://127.0.0.1:8001/docs" }

Write-Host ""
Write-Host "To stop everything: .\\backend\\stop-all.ps1" -ForegroundColor Yellow


