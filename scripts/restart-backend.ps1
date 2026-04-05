[CmdletBinding()]
param(
    [switch]$UseOllama,
    [string]$LocalLLMUrl,
    [int]$HealthTimeoutSec = 180,
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$effectiveLocalLLMUrl = if ($LocalLLMUrl) {
    $LocalLLMUrl
}
elseif ($UseOllama) {
    'http://127.0.0.1:11434/v1'
}
else {
    $null
}

& (Join-Path $scriptRoot 'stop.ps1') -BackendOnly
& (Join-Path $scriptRoot 'start_local.ps1') -LocalLLMUrl $effectiveLocalLLMUrl -HealthTimeoutSec $HealthTimeoutSec -Force:$Force
