param(
    [int]$Port = 43189
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$isListening = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue

if (-not $isListening) {
    Start-Process -FilePath "node" `
        -ArgumentList "asset_board_server.js", "--port", $Port `
        -WorkingDirectory $root `
        -WindowStyle Hidden | Out-Null
    Start-Sleep -Seconds 2
}

$ip = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.InterfaceAlias -notmatch "Loopback|vEthernet" -and $_.IPAddress -notlike "169.254*" } |
    Sort-Object InterfaceMetric |
    Select-Object -First 1 -ExpandProperty IPAddress

Write-Host "LOCAL_URL=http://localhost:$Port/asset_board.html"
if ($ip) {
    Write-Host ("LAN_URL=http://{0}:{1}/asset_board.html" -f $ip, $Port)
}
