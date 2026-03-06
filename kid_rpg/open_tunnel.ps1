param(
    [int]$Port = 43187
)

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$outPath = Join-Path $root 'tunnel.out.log'
$errPath = Join-Path $root 'tunnel.err.log'
$urlPath = Join-Path $root 'tunnel-url.txt'
$statePath = Join-Path $root 'tunnel-state.json'
$sshPath = 'C:\WINDOWS\System32\OpenSSH\ssh.exe'

try {
    $health = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/api/health" -TimeoutSec 5
    if (-not $health.Content) {
        throw 'Server health endpoint returned an empty body.'
    }
} catch {
    throw "kid_rpg server must be running first. Failed to reach http://127.0.0.1:$Port/api/health"
}

Get-CimInstance Win32_Process |
    Where-Object {
        $_.CommandLine -and $_.CommandLine -like '*localhost.run*'
    } |
    ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }

Remove-Item $outPath, $errPath, $urlPath, $statePath -Force -ErrorAction SilentlyContinue

$process = Start-Process -FilePath $sshPath `
    -ArgumentList '-T', '-o', 'StrictHostKeyChecking=no', '-o', 'ExitOnForwardFailure=yes', '-o', 'ServerAliveInterval=30', '-R', "80:127.0.0.1:$Port", 'nokey@localhost.run' `
    -WorkingDirectory $root `
    -RedirectStandardOutput $outPath `
    -RedirectStandardError $errPath `
    -WindowStyle Hidden `
    -PassThru

$deadline = (Get-Date).AddSeconds(45)
$url = $null

while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 1

    if (Test-Path $outPath) {
        $stdout = Get-Content $outPath -Raw
        if ($stdout -match 'tunneled with tls termination,\s+(https://[a-zA-Z0-9.-]+)') {
            $url = $Matches[1]
            break
        }
    }

    if (Test-Path $errPath) {
        $stderr = Get-Content $errPath -Raw
        if ($stderr -match 'tunneled with tls termination,\s+(https://[a-zA-Z0-9.-]+)') {
            $url = $Matches[1]
            break
        }
    }

    if ($process.HasExited) {
        break
    }
}

if (-not $url) {
    $stdout = if (Test-Path $outPath) { Get-Content $outPath -Raw } else { '' }
    $stderr = if (Test-Path $errPath) { Get-Content $errPath -Raw } else { '' }
    throw "Could not detect tunnel URL.`nSTDOUT:`n$stdout`nSTDERR:`n$stderr"
}

Set-Content -Path $urlPath -Value $url -Encoding UTF8
Set-Content -Path $statePath -Value (@{
    url = $url
    port = $Port
    openedAt = (Get-Date).ToString('s')
} | ConvertTo-Json) -Encoding UTF8

Write-Output $url
