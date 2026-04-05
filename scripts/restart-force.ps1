[CmdletBinding()]
param(
    [switch]$UseOllama,
    [string]$LocalLLMUrl,
    [int]$HealthTimeoutSec = 180
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'utils\windows-local.ps1')

$repoRoot = Get-SecondMeRepoRoot
$dataPath = Join-Path $repoRoot 'data'

Write-SecondMeSection 'Force restarting local services'
& (Join-Path $PSScriptRoot 'stop.ps1')

if (Test-Path $dataPath) {
    Write-SecondMeWarning "Removing data directory: $dataPath"
    Remove-Item -Path $dataPath -Recurse -Force
}
else {
    Write-SecondMeInfo 'Data directory does not exist; nothing to remove.'
}

& (Join-Path $PSScriptRoot 'start.ps1') -UseOllama:$UseOllama -LocalLLMUrl $LocalLLMUrl -HealthTimeoutSec $HealthTimeoutSec -Force
