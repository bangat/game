param([int]$Port = 4194)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:PORT = "$Port"
node tools/serve-firebase.cjs
