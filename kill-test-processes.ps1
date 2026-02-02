#!/usr/bin/env pwsh
# WMSCPP - Kill all test-related processes to free RAM
# Usage:
#   .\kill-test-processes.ps1           # Kill server on 3006 + Node (vitest/playwright/next)
#   .\kill-test-processes.ps1 -DryRun    # แสดง process ที่จะ kill โดยไม่ kill
#   .\kill-test-processes.ps1 -IncludeBrowser  # รวม Chromium ที่ Playwright อาจเหลือไว้

param(
    [switch]$DryRun,
    [switch]$IncludeBrowser
)

$ErrorActionPreference = "Stop"

$APP_PORT = 3006

function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warn { Write-Host $args -ForegroundColor Yellow }

Write-Info "WMSCPP - Kill test-related processes (port $APP_PORT, vitest, playwright, next)"
if ($DryRun) { Write-Warn "Dry run - no process will be killed." }
Write-Info ""

$killed = 0

# 1. Kill processes using port 3006 (Next.js dev/server)
try {
    $connections = Get-NetTCPConnection -LocalPort $APP_PORT -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $procId = $conn.OwningProcess
        if ($procId -gt 0) {
            $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
            $name = if ($proc) { $proc.ProcessName } else { "PID $procId" }
            if ($DryRun) {
                Write-Info "[DryRun] Would kill $name (PID $procId) - using port $APP_PORT"
            } else {
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                Write-Success "Killed $name (PID $procId) - port $APP_PORT"
                $killed++
            }
        }
    }
    if (-not $connections -and -not $DryRun) {
        Write-Info "No process found on port $APP_PORT"
    }
} catch {
    Write-Warn "Could not check port $APP_PORT : $_"
}

# 2. Kill Node processes that are clearly test/app related (vitest, playwright, next dev, next start, standalone)
$nodeKeywords = @("vitest", "playwright", "next dev", "next start", "standalone/server", "next/server")
$scriptDir = $PSScriptRoot

Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
    $procId = $_.ProcessId
    $cmd = $_.CommandLine ?? ""

    # Skip if command line is from current project's node_modules (we want to kill those) - actually we want to kill
    # any node running vitest/playwright/next that might be from this project. So match keywords.
    $match = $false
    foreach ($kw in $nodeKeywords) {
        if ($cmd -like "*$kw*") {
            $match = $true
            break
        }
    }
    if (-not $match) { return }

    # Optional: skip if current process (this script's runner)
    if ($procId -eq $PID) { return }

    if ($DryRun) {
        Write-Info "[DryRun] Would kill node (PID $procId) - $($cmd.Substring(0, [Math]::Min(80, $cmd.Length)))..."
    } else {
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            Write-Success "Killed node (PID $procId)"
            $killed++
        } catch {
            Write-Warn "Could not kill node PID $procId : $_"
        }
    }
}

# 3. Optional: Kill Chromium/Chrome launched by Playwright (--disable-dev-shm-usage is typical for Playwright)
if ($IncludeBrowser) {
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        ($_.Name -match "chrome|chromium|msedge") -and
        ($_.CommandLine -match "--disable-dev-shm-usage|--no-sandbox")
    } | ForEach-Object {
        $procId = $_.ProcessId
        $name = $_.Name
        if ($DryRun) {
            Write-Info "[DryRun] Would kill $name (PID $procId) - likely Playwright browser"
        } else {
            try {
                Stop-Process -Id $procId -Force -ErrorAction Stop
                Write-Success "Killed $name (PID $procId)"
                $killed++
            } catch {
                Write-Warn "Could not kill $name PID $procId : $_"
            }
        }
    }
}

Write-Info ""
if ($DryRun) {
    Write-Warn "Dry run complete. Run without -DryRun to actually kill processes."
} else {
    Write-Success "Done. Stopped $killed process(es)."
}
