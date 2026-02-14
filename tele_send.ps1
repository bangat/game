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
        [string]$Key
    )
    if (-not (Test-Path $Path)) { return $null }
    $line = Get-Content -Path $Path | Where-Object { $_ -match ("^{0}=" -f [regex]::Escape($Key)) } | Select-Object -First 1
    if (-not $line) { return $null }
    return ($line -split '=', 2)[1].Trim()
}

$cfg = Join-Path $PSScriptRoot 'tele_config.ini'
if ([string]::IsNullOrWhiteSpace($Token)) { $Token = Get-IniValue -Path $cfg -Key 'Token' }
if ([string]::IsNullOrWhiteSpace($ChatID)) { $ChatID = Get-IniValue -Path $cfg -Key 'ChatID' }
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
