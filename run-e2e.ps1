#!/usr/bin/env pwsh
# WMSCPP E2E Test Script
# Usage:
#   .\run-e2e.ps1              # รัน E2E ปกติ (Playwright จะสตาร์ท dev server ให้)
#   .\run-e2e.ps1 -LowMemory    # ใช้ production build แทน dev server (กิน RAM น้อย)
#   .\run-e2e.ps1 -ExistingServer  # ไม่สตาร์ท server (ต้องรัน npm run dev ไว้ในเทอร์มินัลอื่นก่อน)
#   .\run-e2e.ps1 -UnitFirst    # รัน unit test ก่อน แล้วค่อย E2E

param(
    [switch]$LowMemory,
    [switch]$ExistingServer,
    [switch]$UnitFirst
)

$ErrorActionPreference = "Stop"

$BaseURL = "http://localhost:3006"
$ScriptDir = $PSScriptRoot

function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warn { Write-Host $args -ForegroundColor Yellow }

Write-Info "WMSCPP E2E Test Script"
Write-Info ""

if ($UnitFirst) {
    Write-Info "Running unit tests first..."
    Push-Location $ScriptDir
    try {
        npm run test:unit:run
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Unit tests failed. Aborting E2E."
            exit $LASTEXITCODE
        }
        Write-Success "Unit tests passed."
        Write-Info ""
    } finally {
        Pop-Location
    }
}

if ($ExistingServer) {
    Write-Info "Checking for existing server at $BaseURL..."
    try {
        $response = Invoke-WebRequest -Uri $BaseURL -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        Write-Success "Server is running."
    } catch {
        Write-Warn "No server at $BaseURL. Start the app first: npm run dev"
        Write-Warn "Then run: .\run-e2e.ps1 -ExistingServer"
        exit 1
    }
    $env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "0"
    $env:E2E_USE_PRODUCTION = "0"
    # Don't start webServer - use env to signal reuse only (playwright still starts if not in config)
    # Playwright config has reuseExistingServer: true so it will reuse when we run playwright test
    # and the server is already up. So we just run playwright test without starting server.
    # The only way to not start server is to have it already running - which we verified.
    Write-Info "Running E2E tests (reusing existing server)..."
} else {
    if ($LowMemory) {
        $env:E2E_USE_PRODUCTION = "1"
        Write-Info "Running E2E with production server (low memory mode)..."
        Write-Info "First run will build the app, then start server."
    } else {
        $env:E2E_USE_PRODUCTION = "0"
        Write-Info "Running E2E with dev server..."
    }
    Write-Info "Running Playwright..."
}

Push-Location $ScriptDir

$exitCode = 0
try {
    npx playwright test
    $exitCode = $LASTEXITCODE
} finally {
    Pop-Location
}

if ($exitCode -eq 0) {
    Write-Success "E2E tests completed successfully."
} else {
    Write-Warn "E2E tests failed (exit code $exitCode)."
}

exit $exitCode
