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
    throw "git을 찾을 수 없습니다. 먼저 Git을 설치해 주세요."
}

function Send-TelegramMessage {
    param([string]$Text)

    $token = $env:TELEGRAM_BOT_TOKEN
    $chatId = $env:TELEGRAM_CHAT_ID
    if ([string]::IsNullOrWhiteSpace($token) -or [string]::IsNullOrWhiteSpace($chatId)) {
        Write-Host "텔레그램 건너뜀: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID 미설정"
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
        Write-Host "텔레그램 전송 완료"
    } catch {
        Write-Warning "텔레그램 전송 실패: $($_.Exception.Message)"
    }
}

$git = Resolve-GitPath
$repoRoot = & $git rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($repoRoot)) {
    throw "현재 폴더는 Git 저장소가 아닙니다."
}
Set-Location $repoRoot

if ($Files -and $Files.Count -gt 0) {
    $normalizedFiles = @()
    foreach ($f in $Files) {
        if ([string]::IsNullOrWhiteSpace($f)) { continue }
        if (-not (Test-Path $f)) {
            throw "파일을 찾을 수 없습니다: $f"
        }
        $normalizedFiles += $f
    }
    if (-not $normalizedFiles) {
        throw "유효한 파일이 없습니다."
    }
    & $git add -- $normalizedFiles
} else {
    & $git add -A
}

$changes = & $git status --porcelain
if (-not $changes) {
    Write-Host "커밋할 변경 사항이 없습니다."
    Send-TelegramMessage "[$(Split-Path $repoRoot -Leaf)] 푸시할 변경 사항이 없습니다."
    exit 0
}

if ([string]::IsNullOrWhiteSpace($Message)) {
    if ($Files -and $Files.Count -gt 0) {
        $Message = "chore: 파일 업데이트 $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    } else {
        $Message = "chore: 자동 업데이트 $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    }
}

& $git commit -m $Message
& $git push

$repoName = Split-Path $repoRoot -Leaf
$branch = (& $git rev-parse --abbrev-ref HEAD).Trim()
$commit = (& $git rev-parse --short HEAD).Trim()

$fileText = "전체 파일"
if ($Files -and $Files.Count -gt 0) {
    $fileText = ($Files -join ", ")
}

$text = @(
    "[작업 완료 보고]"
    "저장소: $repoName"
    "브랜치: $branch"
    "커밋: $commit"
    "파일: $fileText"
    "메시지: $Message"
    "시간: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
) -join "`n"

Write-Host "완료: 커밋 + 푸시"
Send-TelegramMessage $text
