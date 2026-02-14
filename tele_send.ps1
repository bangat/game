param(
    [Parameter(Mandatory = $true)]
    [string]$Text,
    [string[]]$Files,
    [string]$Token,
    [string]$ChatID
)

$ErrorActionPreference = 'Stop'

function Get-IniValue {
    param(
        [string]$Path,
        [string]$Section,
        [string]$Key
    )
    if (-not (Test-Path $Path)) { return $null }
    $value = $null
    $inSection = $false
    foreach ($line in (Get-Content -Path $Path)) {
        $trim = $line.Trim()
        if ($trim -match '^\[(.+)\]$') {
            $inSection = ($Matches[1] -eq $Section)
            continue
        }
        if (-not $inSection) { continue }
        if ($trim -match ("^{0}=(.*)$" -f [regex]::Escape($Key))) {
            $value = $Matches[1].Trim()
        }
    }
    return $value
}

$cfg = Join-Path $PSScriptRoot 'tele_config.ini'
if ([string]::IsNullOrWhiteSpace($Token)) { $Token = Get-IniValue -Path $cfg -Section 'Telegram' -Key 'Token' }
if ([string]::IsNullOrWhiteSpace($ChatID)) { $ChatID = Get-IniValue -Path $cfg -Section 'Telegram' -Key 'ChatID' }
if ([string]::IsNullOrWhiteSpace($Token)) { $Token = $env:TELEGRAM_BOT_TOKEN }
if ([string]::IsNullOrWhiteSpace($ChatID)) { $ChatID = $env:TELEGRAM_CHAT_ID }

if ([string]::IsNullOrWhiteSpace($Token) -or [string]::IsNullOrWhiteSpace($ChatID)) {
    throw "텔레그램 Token/ChatID를 찾지 못했습니다."
}

$msgUri = "https://api.telegram.org/bot$Token/sendMessage"
$body = @{
    chat_id = $ChatID
    text = $Text
    disable_web_page_preview = "true"
}

Invoke-RestMethod -Method Post -Uri $msgUri -Body $body -ContentType "application/x-www-form-urlencoded" | Out-Null

if ($Files) {
    $docUri = "https://api.telegram.org/bot$Token/sendDocument"
    foreach ($file in $Files) {
        if ([string]::IsNullOrWhiteSpace($file)) { continue }
        if (-not (Test-Path $file)) {
            Write-Warning "파일 없음: $file"
            continue
        }
        $full = (Resolve-Path $file).Path
        & curl.exe -s -X POST $docUri -F "chat_id=$ChatID" -F "document=@$full" | Out-Null
    }
}

Write-Host "TELEGRAM_SENT"
