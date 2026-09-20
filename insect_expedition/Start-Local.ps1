param([int]$Port = 4193)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:INSECT_EMULATOR = '1'
$env:PORT = "$Port"
node server/index.cjs
