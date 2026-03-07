param()

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$previewRoot = Join-Path $root "previews"

if (-not (Test-Path $previewRoot)) {
    throw "previews folder not found."
}

$previewDirs = Get-ChildItem -LiteralPath $previewRoot -Directory
foreach ($previewDir in $previewDirs) {
    $targetDir = Join-Path $root $previewDir.Name
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    Get-ChildItem -LiteralPath $targetDir -File |
        Where-Object { $_.Name -ne ".gitkeep" } |
        Remove-Item -Force

    Get-ChildItem -LiteralPath $previewDir.FullName -File |
        ForEach-Object {
            Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $targetDir $_.Name) -Force
        }
}

Write-Host "SYNC_DONE"
