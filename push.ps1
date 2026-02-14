param(
    [Parameter(Position = 0)]
    [string]$Message
)

$ErrorActionPreference = 'Stop'

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
$git = if ($gitCmd) { $gitCmd.Source } else { 'C:\Program Files\Git\cmd\git.exe' }
if (-not (Test-Path $git)) {
    throw "git not found. Install Git first."
}

$repoRoot = & $git rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($repoRoot)) {
    throw "This folder is not a Git repository."
}
Set-Location $repoRoot

& $git add -A

$changes = & $git status --porcelain
if (-not $changes) {
    Write-Host "No changes to commit."
    exit 0
}

if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = "chore: update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
}

& $git commit -m $Message
& $git push

Write-Host "Done: commit + push"
