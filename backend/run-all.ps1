param(
  [switch]$WithConversation = $true
)

$ErrorActionPreference = "Stop"

function Start-UvicornJob {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][int]$Port,
    [Parameter(Mandatory = $true)][string]$AppImport,
    [Parameter(Mandatory = $false)][string]$DatasetDir
  )

  # Stop existing job with same name (if any)
  $existing = Get-Job -Name $Name -ErrorAction SilentlyContinue
  if ($existing) {
    Stop-Job -Job $existing -Force | Out-Null
    Remove-Job -Job $existing -Force | Out-Null
  }

  $backendDir = (Resolve-Path "$PSScriptRoot").Path

  Start-Job -Name $Name -ScriptBlock {
    param($backendDir, $port, $appImport, $datasetDir)

    Set-Location $backendDir

    $env:DISABLE_AUTH = "1"
    if ($datasetDir) { $env:DATASET_DIR = $datasetDir }

    # Use the venv python directly so this script works even if Activate.ps1 is blocked.
    & "$backendDir\\.venv\\Scripts\\python.exe" -m uvicorn $appImport --reload --port $port
  } -ArgumentList $backendDir, $Port, $AppImport, $DatasetDir | Out-Null
}

Write-Host "Starting backend services as background jobs..." -ForegroundColor Cyan

Start-UvicornJob -Name "banking-vbac-tx" -Port 8002 -AppImport "transaction_service.app.main:app" -DatasetDir "..\\dataset\\FAR-Trans"
if ($WithConversation) {
  Start-UvicornJob -Name "banking-vbac-conv" -Port 8001 -AppImport "conversation_service.app.main:app"
}
Start-UvicornJob -Name "banking-vbac-gateway" -Port 8000 -AppImport "api_gateway_local.app.main:app"

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


