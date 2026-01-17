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
$EXCLUDE_PATTERNS = @('node_modules', '.next', '.git', '.env.local', '*.log')

# Colors
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host $msg -ForegroundColor Red }

Write-Info "🚀 WMSCPP Deployment Script"
Write-Info "Mode: $Mode"
Write-Info "Target: $SERVER_ALIAS"
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
$deployCommand = @"
cd $REMOTE_PATH && \
tar -xzf $ARCHIVE_NAME && \
rm $ARCHIVE_NAME && \
docker compose up -d --build
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
    $containerStatus = ssh $SERVER_ALIAS "docker compose -f $REMOTE_PATH/docker-compose.yml ps --format json" | ConvertFrom-Json
    
    if ($containerStatus.State -eq "running") {
        Write-Success "✅ Container is running"
    } else {
        Write-Warning "⚠️  Container state: $($containerStatus.State)"
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
Write-Info "  View logs:    ssh $SERVER_ALIAS 'docker compose -f $REMOTE_PATH/docker-compose.yml logs -f'"
Write-Info "  Check status: ssh $SERVER_ALIAS 'docker compose -f $REMOTE_PATH/docker-compose.yml ps'"
Write-Info "  Restart:      ssh $SERVER_ALIAS 'docker compose -f $REMOTE_PATH/docker-compose.yml restart'"
