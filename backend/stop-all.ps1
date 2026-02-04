$ErrorActionPreference = "SilentlyContinue"

function Stop-Port {
  param([Parameter(Mandatory = $true)][int]$Port)

  $pids = Get-NetTCPConnection -LocalPort $Port -State Listen | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pid in $pids) {
    if ($pid -and $pid -ne 0) {
      Stop-Process -Id $pid -Force
    }
  }
}

# Stop jobs (if started via run-all.ps1)
Get-Job | Where-Object { $_.Name -like "banking-vbac-*" } | ForEach-Object {
  Stop-Job -Job $_ -Force | Out-Null
  Remove-Job -Job $_ -Force | Out-Null
}

# Also stop any listeners on the known ports (covers cases where they were started manually)
Stop-Port -Port 8000
Stop-Port -Port 8001
Stop-Port -Port 8002

Write-Host "Stopped backend jobs / processes on ports 8000/8001/8002." -ForegroundColor Green


