#!/usr/bin/env pwsh
# WMSCPP Deployment Script (Registry-based)
# Usage: .\deploy.ps1 [full|update]
# Flow: docker build -> push to GHCR -> server pulls and runs

param(
    [Parameter(Position = 0)]
    [ValidateSet('full', 'update')]
    [string]$Mode = 'update'
)

$ErrorActionPreference = "Stop"

# Configuration
$SERVER_ALIAS = "home-server"
$REMOTE_PATH = "/opt/wmscpp"
$IMAGE_NAME = if ($env:WMSCPP_IMAGE) { $env:WMSCPP_IMAGE } else { "ghcr.io/teaingtit/wmscpp:latest" }
$HEALTH_URL = "http://100.96.9.50:3000/api/health"

# Colors
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host $msg -ForegroundColor Red }

Write-Info "WMSCPP Deployment Script (Registry-based)"
Write-Info "Mode: $Mode"
Write-Info "Image: $IMAGE_NAME"
Write-Info "Target: $SERVER_ALIAS"
Write-Info ""

# Step 0: Verify Docker
Write-Info "Verifying Docker..."
$dockerCheck = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker is not running or not installed. Please start Docker Desktop."
    $dockerCheck | Write-Host
    exit 1
}
Write-Success "Docker OK"
Write-Info ""

# Step 1: Build image
Write-Info "Building Docker image..."
if ($Mode -eq "full") {
    docker build --no-cache -t $IMAGE_NAME .
}
else {
    docker build -t $IMAGE_NAME .
}
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed."
    exit 1
}
Write-Success "Build complete"
Write-Info ""

# Step 2: Push to GHCR
Write-Info "Pushing to registry..."
$pushResult = docker push $IMAGE_NAME 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker push failed. Ensure you are logged in: docker login ghcr.io"
    $pushResult | Write-Host
    exit 1
}
Write-Success "Push complete"
Write-Info ""

# Step 3: Test SSH Connection
Write-Info "Testing SSH connection..."
try {
    ssh -q $SERVER_ALIAS "echo 'Connected'" | Out-Null
    Write-Success "SSH connection successful"
}
catch {
    Write-Error "SSH connection failed. Please check your SSH config."
    Write-Info "Run: ssh $SERVER_ALIAS"
    exit 1
}
Write-Info ""

# Step 4: Clean old data and deploy on server
Write-Info "Cleaning old containers/images on server..."
Write-Info "Deploying on server..."
# Upload docker-compose.yml (so server has correct image reference)
try {
    scp docker-compose.yml "${SERVER_ALIAS}:${REMOTE_PATH}/"
    Write-Success "docker-compose.yml uploaded"
}
catch {
    Write-Error "Failed to upload docker-compose.yml"
    exit 1
}

$deployCommand = @"
cd $REMOTE_PATH && \
docker compose down -v && \
docker rmi $IMAGE_NAME 2>/dev/null || true && \
docker compose pull && \
docker compose up -d
"@

try {
    ssh $SERVER_ALIAS $deployCommand
    Write-Success "Deployment complete"
}
catch {
    Write-Error "Deployment failed"
    exit 1
}
Write-Info ""

# Step 5: Check status
Write-Info "Checking deployment status..."
Start-Sleep -Seconds 3

try {
    $runningIds = ssh $SERVER_ALIAS "cd $REMOTE_PATH && docker compose ps --status running -q"
    if ($runningIds -and $runningIds.Trim()) {
        Write-Success "Container(s) running"
    }
    else {
        Write-Warning "No running containers; check logs on server"
    }
}
catch {
    Write-Warning "Could not check container status"
}

# Step 6: Test health endpoint
Write-Info "Testing health endpoint..."
Start-Sleep -Seconds 2

try {
    $response = Invoke-WebRequest -Uri $HEALTH_URL -TimeoutSec 10
    $health = $response.Content | ConvertFrom-Json

    if ($health.status -eq "healthy") {
        Write-Success "Application is healthy"
        Write-Info "   Service: $($health.service)"
        Write-Info "   Version: $($health.version)"
    }
    else {
        Write-Warning "Application status: $($health.status)"
    }
}
catch {
    Write-Warning "Could not reach health endpoint (application may still be starting)"
}

Write-Info ""
Write-Success "Deployment completed!"
Write-Info "Application URL: http://100.96.9.50:3000"
Write-Info ""
Write-Info "Useful commands:"
Write-Info "  View logs:    ssh $SERVER_ALIAS 'cd $REMOTE_PATH && docker compose logs -f wmscpp'"
Write-Info "  Check status: ssh $SERVER_ALIAS 'cd $REMOTE_PATH && docker compose ps'"
Write-Info "  Restart:      ssh $SERVER_ALIAS 'cd $REMOTE_PATH && docker compose restart'"
