[CmdletBinding()]
param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($BackendOnly -and $FrontendOnly) {
    throw 'Choose either -BackendOnly or -FrontendOnly, not both.'
}

. (Join-Path $PSScriptRoot 'utils\windows-local.ps1')

$repoRoot = Get-SecondMeRepoRoot
$envFile = Ensure-SecondMeEnvFile -RepoRoot $repoRoot
$envMap = Read-EnvFile -Path $envFile
$stateDir = Get-SecondMeWindowsStateDir -RepoRoot $repoRoot
$backendPidFile = Join-Path $stateDir 'backend.pid'
$frontendPidFile = Join-Path $stateDir 'frontend.pid'
$backendPort = [int](Get-EnvValue -Environment $envMap -Key 'LOCAL_APP_PORT' -DefaultValue '8002')
$frontendPort = [int](Get-EnvValue -Environment $envMap -Key 'LOCAL_FRONTEND_PORT' -DefaultValue '3000')

Write-SecondMeSection 'Stopping local services'
Write-SecondMeInfo "Environment file: $envFile"

$stoppedAnything = $false

if (-not $BackendOnly) {
    $frontendStopped = Stop-TrackedProcess -Name 'frontend' -PidFile $frontendPidFile -Ports @($frontendPort)
    if ($frontendStopped) {
        $stoppedAnything = $true
        Write-SecondMeSuccess 'Frontend stopped.'
    }
    elseif (-not (Get-ListeningProcess -Port $frontendPort)) {
        Write-SecondMeInfo 'Frontend is not running.'
    }
    else {
        $frontendPortOwner = Get-ListeningProcess -Port $frontendPort
        Write-SecondMeWarning "Frontend port $frontendPort is still owned by PID $($frontendPortOwner.Id) ($($frontendPortOwner.ProcessName)); it was not started by the Windows launcher."
    }
}

if (-not $FrontendOnly) {
    $backendStopped = Stop-TrackedProcess -Name 'backend' -PidFile $backendPidFile -Ports @($backendPort)
    if ($backendStopped) {
        $stoppedAnything = $true
        Write-SecondMeSuccess 'Backend stopped.'
    }
    elseif (-not (Get-ListeningProcess -Port $backendPort)) {
        Write-SecondMeInfo 'Backend is not running.'
    }
    else {
        $backendPortOwner = Get-ListeningProcess -Port $backendPort
        Write-SecondMeWarning "Backend port $backendPort is still owned by PID $($backendPortOwner.Id) ($($backendPortOwner.ProcessName)); it was not started by the Windows launcher."
    }
}

if (-not $stoppedAnything) {
    Write-SecondMeInfo 'Nothing was running. Tiny victory lap anyway.'
}
