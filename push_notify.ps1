param(
    [string[]]$Files,
    [string]$Message
)

$ErrorActionPreference = 'Stop'

function Resolve-GitPath {
    $gitCmd = Get-Command git -ErrorAction SilentlyContinue
    if ($gitCmd) { return $gitCmd.Source }
    $fallback = 'C:\Program Files\Git\cmd\git.exe'
    if (Test-Path $fallback) { return $fallback }
    throw "git not found. Install Git first."
}

function Send-TelegramMessage {
    param([string]$Text)

    $token = $env:TELEGRAM_BOT_TOKEN
    $chatId = $env:TELEGRAM_CHAT_ID
    if ([string]::IsNullOrWhiteSpace($token) -or [string]::IsNullOrWhiteSpace($chatId)) {
        Write-Host "Telegram skipped: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set."
        return
    }

    $uri = "https://api.telegram.org/bot$token/sendMessage"
    $body = @{
        chat_id = $chatId
        text = $Text
        disable_web_page_preview = "true"
    }

    try {
        Invoke-RestMethod -Method Post -Uri $uri -Body $body -ContentType "application/x-www-form-urlencoded" | Out-Null
        Write-Host "Telegram sent."
    } catch {
        Write-Warning "Telegram notify failed: $($_.Exception.Message)"
    }
}

$git = Resolve-GitPath
$repoRoot = & $git rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($repoRoot)) {
    throw "This folder is not a Git repository."
}
Set-Location $repoRoot

if ($Files -and $Files.Count -gt 0) {
    $normalizedFiles = @()
    foreach ($f in $Files) {
        if ([string]::IsNullOrWhiteSpace($f)) { continue }
        if (-not (Test-Path $f)) {
            throw "File not found: $f"
        }
        $normalizedFiles += $f
    }
    if (-not $normalizedFiles) {
        throw "No valid files were provided."
    }
    & $git add -- $normalizedFiles
} else {
    & $git add -A
}

$changes = & $git status --porcelain
if (-not $changes) {
    Write-Host "No changes to commit."
    Send-TelegramMessage "No changes to push in $(Split-Path $repoRoot -Leaf)."
    exit 0
}

if ([string]::IsNullOrWhiteSpace($Message)) {
    if ($Files -and $Files.Count -gt 0) {
        $Message = "chore: update file(s) $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    } else {
        $Message = "chore: update $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    }
}

& $git commit -m $Message
& $git push

$repoName = Split-Path $repoRoot -Leaf
$branch = (& $git rev-parse --abbrev-ref HEAD).Trim()
$commit = (& $git rev-parse --short HEAD).Trim()

$fileText = "all files"
if ($Files -and $Files.Count -gt 0) {
    $fileText = ($Files -join ", ")
}

$text = @(
    "[Codex Push Done]"
    "repo: $repoName"
    "branch: $branch"
    "commit: $commit"
    "files: $fileText"
    "msg: $Message"
    "time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
) -join "`n"

Write-Host "Done: commit + push"
Send-TelegramMessage $text
