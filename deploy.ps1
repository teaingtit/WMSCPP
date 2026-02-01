#!/usr/bin/env pwsh
# WMSCPP Deployment Script
# Usage: .\deploy.ps1 [full|update]

param(
    [Parameter(Position=0)]
    [ValidateSet('full', 'update')]
    [string]$Mode = 'update'
)

$ErrorActionPreference = "Stop"

# Configuration
$SERVER_ALIAS = "home-server"
$REMOTE_PATH = "/opt/wmscpp"
$ARCHIVE_NAME = "project.tar.gz"
$EXCLUDE_PATTERNS = @(
    'node_modules', '.next', '.git', '.env', '.env.local', '*.log',
    'coverage', 'test-results', 'playwright-report', 'e2e-results', '.turbo'
)

# Colors
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host $msg -ForegroundColor Red }

Write-Info "🚀 WMSCPP Deployment Script"
Write-Info "Mode: $Mode"
Write-Info "Target: $SERVER_ALIAS"
Write-Info ""

# Step 0: Local build (fail fast before upload)
Write-Info "🔨 Running local build..."
$buildResult = npm run build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Build failed. Fix errors before deploying."
    $buildResult | Write-Host
    exit 1
}
Write-Success "✅ Build passed"
Write-Info ""

# Step 1: Test SSH Connection
Write-Info "📡 Testing SSH connection..."
try {
    ssh -q $SERVER_ALIAS "echo 'Connected'" | Out-Null
    Write-Success "✅ SSH connection successful"
} catch {
    Write-Error "❌ SSH connection failed. Please check your SSH config."
    Write-Info "Run: ssh $SERVER_ALIAS"
    exit 1
}

# Step 2: Create archive
Write-Info "📦 Creating archive..."
$excludeArgs = $EXCLUDE_PATTERNS | ForEach-Object { "--exclude='$_'" }
$tarCommand = "tar $($excludeArgs -join ' ') -czf $ARCHIVE_NAME ."

try {
    Invoke-Expression $tarCommand
    Write-Success "✅ Archive created: $ARCHIVE_NAME"
} catch {
    Write-Error "❌ Failed to create archive"
    exit 1
}

# Step 3: Upload to server
Write-Info "📤 Uploading to server..."
try {
    scp $ARCHIVE_NAME "${SERVER_ALIAS}:${REMOTE_PATH}/"
    Write-Success "✅ Upload complete"
} catch {
    Write-Error "❌ Upload failed"
    Remove-Item $ARCHIVE_NAME -ErrorAction SilentlyContinue
    exit 1
}

# Step 4: Extract and deploy
Write-Info "🔧 Extracting and deploying..."
$buildPart = if ($Mode -eq 'full') { "docker compose build --no-cache && " } else { "" }
$deployCommand = @"
cd $REMOTE_PATH && \
tar -xzf $ARCHIVE_NAME && \
rm $ARCHIVE_NAME && \
${buildPart}docker compose up -d --build
"@

try {
    ssh $SERVER_ALIAS $deployCommand
    Write-Success "✅ Deployment complete"
} catch {
    Write-Error "❌ Deployment failed"
    Remove-Item $ARCHIVE_NAME -ErrorAction SilentlyContinue
    exit 1
}

# Cleanup local archive
Remove-Item $ARCHIVE_NAME -ErrorAction SilentlyContinue

# Step 5: Check status
Write-Info "📊 Checking deployment status..."
Start-Sleep -Seconds 3

try {
    $runningIds = ssh $SERVER_ALIAS "cd $REMOTE_PATH && docker compose ps --status running -q"
    if ($runningIds -and $runningIds.Trim()) {
        Write-Success "✅ Container(s) running"
    } else {
        Write-Warning "⚠️  No running containers; check logs on server"
    }
} catch {
    Write-Warning "⚠️  Could not check container status"
}

# Step 6: Test health endpoint
Write-Info "🏥 Testing health endpoint..."
Start-Sleep -Seconds 2

try {
    $response = Invoke-WebRequest -Uri "http://100.96.9.50:3000/api/health" -TimeoutSec 10
    $health = $response.Content | ConvertFrom-Json
    
    if ($health.status -eq "healthy") {
        Write-Success "✅ Application is healthy"
        Write-Info "   Service: $($health.service)"
        Write-Info "   Version: $($health.version)"
    } else {
        Write-Warning "⚠️  Application status: $($health.status)"
    }
} catch {
    Write-Warning "⚠️  Could not reach health endpoint (application may still be starting)"
}

Write-Info ""
Write-Success "🎉 Deployment completed!"
Write-Info "📍 Application URL: http://100.96.9.50:3000"
Write-Info ""
Write-Info "Useful commands:"
Write-Info "  View logs:    ssh $SERVER_ALIAS 'cd $REMOTE_PATH && docker compose logs -f'"
Write-Info "  Check status: ssh $SERVER_ALIAS 'cd $REMOTE_PATH && docker compose ps'"
Write-Info "  Restart:      ssh $SERVER_ALIAS 'cd $REMOTE_PATH && docker compose restart'"
