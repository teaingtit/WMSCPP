
$logFile = "tsc_errors.log"
if (-not (Test-Path $logFile)) {
    Write-Host "Log file not found!"
    exit 1
}

$errors = Get-Content $logFile
$filesToFix = $errors | Where-Object { $_ -match "error TS6133: 'React' is declared but its value is never read." } | ForEach-Object {
    $_ -match "^(.+)\(\d+,\d+\):" > $null
    $matches[1]
} | Select-Object -Unique

foreach ($file in $filesToFix) {
    $path = $file.Trim()
    if (Test-Path $path) {
        Write-Host "Fixing $path"
        $content = Get-Content $path -Raw
        
        # 1. Remove "import React from 'react';" (and variations with quotes)
        $content = $content -replace "import React from ['`"]react['`"];?\r?\n?", ""
        
        # 2. Fix "import React, { ... } from 'react';" -> "import { ... } from 'react';"
        $content = $content -replace "import React, \{", "import {"
        
        Set-Content -Path $path -Value $content -NoNewline
    } else {
        Write-Host "File not found: $path"
    }
}
Write-Host "Done."
