# PowerShell Profile Script for Auto-loading SSH Keys
# Location: Copy this to your PowerShell profile
# To find profile location: echo $PROFILE
# To create profile: New-Item -Path $PROFILE -Type File -Force

# Auto-load SSH key to ssh-agent
if (Get-Service ssh-agent -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Running' }) {
    $sshKeys = ssh-add -l 2>&1
    
    if ($sshKeys -match "no identities" -or $sshKeys -match "Could not open a connection") {
        Write-Host "🔑 Loading SSH key..." -ForegroundColor Yellow
        
        # เปลี่ยนเป็นชื่อ key ของคุณ
        $keyPath = "~/.ssh/id_ed25519"
        
        if (Test-Path $keyPath) {
            ssh-add $keyPath
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ SSH key loaded successfully!" -ForegroundColor Green
            }
            else {
                Write-Host "❌ Failed to load SSH key" -ForegroundColor Red
            }
        }
        else {
            Write-Host "⚠️  SSH key not found: $keyPath" -ForegroundColor Yellow
        }
    }
    else {
        # Key already loaded
        Write-Host "✅ SSH key already loaded" -ForegroundColor Green
    }
}
else {
    Write-Host "⚠️  ssh-agent is not running" -ForegroundColor Yellow
    Write-Host "   Run as Admin: Start-Service ssh-agent" -ForegroundColor Cyan
}

# Optional: Add helpful aliases
Set-Alias -Name ll -Value Get-ChildItem -Option AllScope
Set-Alias -Name grep -Value Select-String -Option AllScope

# Optional: Custom prompt (uncomment if you want)
# function prompt {
#     $location = Get-Location
#     Write-Host "PS " -NoNewline -ForegroundColor Green
#     Write-Host "$location" -NoNewline -ForegroundColor Cyan
#     Write-Host " >" -NoNewline -ForegroundColor Green
#     return " "
# }

Write-Host "PowerShell Profile Loaded ✨" -ForegroundColor Magenta
