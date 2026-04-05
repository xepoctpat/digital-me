[CmdletBinding()]
param(
    [switch]$BackendOnly,
    [switch]$UseOllama,
    [string]$LocalLLMUrl,
    [int]$HealthTimeoutSec = 180,
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'utils\windows-local.ps1')

$repoRoot = Get-SecondMeRepoRoot
$envFile = Ensure-SecondMeEnvFile -RepoRoot $repoRoot
$envMap = Read-EnvFile -Path $envFile
$stateDir = Get-SecondMeWindowsStateDir -RepoRoot $repoRoot
$logsDir = Get-SecondMeLogsDir -RepoRoot $repoRoot
$frontendPidFile = Join-Path $stateDir 'frontend.pid'
$frontendStdOut = Join-Path $logsDir 'frontend.stdout.log'
$frontendStdErr = Join-Path $logsDir 'frontend.stderr.log'
$backendPort = [int](Get-EnvValue -Environment $envMap -Key 'LOCAL_APP_PORT' -DefaultValue '8002')
$frontendPort = [int](Get-EnvValue -Environment $envMap -Key 'LOCAL_FRONTEND_PORT' -DefaultValue '3000')
$frontendUrl = "http://127.0.0.1:$frontendPort"
$frontendRoot = Join-Path $repoRoot 'lpm_frontend'
$nextCliPath = Join-Path $frontendRoot 'node_modules\next\dist\bin\next'
$nodeExe = Get-NodeExecutable
$effectiveLocalLLMUrl = if ($LocalLLMUrl) {
    Normalize-OpenAIBaseUrl -Url $LocalLLMUrl
}
elseif ($UseOllama) {
    'http://127.0.0.1:11434/v1'
}
else {
    Normalize-OpenAIBaseUrl -Url (Get-EnvValue -Environment $envMap -Key 'LOCAL_LLM_SERVICE_URL' -DefaultValue 'http://127.0.0.1:8080/v1')
}

Write-SecondMeSection 'Starting local services'
Write-SecondMeInfo "Environment file: $envFile"
Write-SecondMeInfo "Backend URL: http://127.0.0.1:$backendPort"
Write-SecondMeInfo "Frontend URL: $frontendUrl"
Write-SecondMeInfo "Local LLM URL: $effectiveLocalLLMUrl"

$startLocalScript = Join-Path $repoRoot 'scripts\start_local.ps1'
& $startLocalScript -LocalLLMUrl $effectiveLocalLLMUrl -HealthTimeoutSec $HealthTimeoutSec -Force:$Force

if ($BackendOnly) {
    Write-SecondMeSuccess 'Backend-only mode requested; frontend start skipped.'
    exit 0
}

if (-not (Test-Path $frontendRoot)) {
    throw "Frontend directory not found: $frontendRoot"
}

if (-not (Test-Path $nextCliPath)) {
    throw 'Frontend dependencies are missing. Run scripts\setup.ps1 first.'
}

$existingFrontend = Get-TrackedProcess -PidFile $frontendPidFile
if ($existingFrontend) {
    if (Test-UrlHealth -Url $frontendUrl) {
        Write-SecondMeSuccess "Frontend is already running (PID $($existingFrontend.Id))."
        exit 0
    }

    if (-not $Force) {
        throw 'Frontend PID file exists, but the health check is failing. Re-run with -Force to replace the stale process.'
    }

    Write-SecondMeWarning 'Removing stale frontend process before restart.'
    Stop-TrackedProcess -Name 'frontend' -PidFile $frontendPidFile -Ports @($frontendPort) -KillPortOwners | Out-Null
}

$frontendPortOwner = Get-ListeningProcess -Port $frontendPort
if ($frontendPortOwner) {
    if (-not $Force) {
        throw "Port $frontendPort is already in use by PID $($frontendPortOwner.Id) ($($frontendPortOwner.ProcessName)). Use -Force after verifying it is safe to stop."
    }

    Write-SecondMeWarning "Stopping process $($frontendPortOwner.ProcessName) on port $frontendPort."
    Stop-Process -Id $frontendPortOwner.Id -Force
}

$nextCachePath = Join-Path $frontendRoot '.next'
if (Test-Path $nextCachePath) {
    Write-SecondMeStep 'Clearing stale Next.js cache'
    Remove-Item -Path $nextCachePath -Recurse -Force
}

$env:HOST_ADDRESS = Get-EnvValue -Environment $envMap -Key 'HOST_ADDRESS' -DefaultValue 'http://127.0.0.1'
$env:LOCAL_APP_PORT = [string]$backendPort
$env:LOCAL_FRONTEND_PORT = [string]$frontendPort
$env:ENABLE_PUBLIC_NETWORK = Get-EnvValue -Environment $envMap -Key 'ENABLE_PUBLIC_NETWORK' -DefaultValue 'false'
$env:PUBLIC_APP_BASE_URL = Get-EnvValue -Environment $envMap -Key 'PUBLIC_APP_BASE_URL' -DefaultValue 'https://app.secondme.io'
$env:NEXT_PUBLIC_ENABLE_PUBLIC_NETWORK = $env:ENABLE_PUBLIC_NETWORK
$env:NEXT_PUBLIC_PUBLIC_APP_BASE_URL = $env:PUBLIC_APP_BASE_URL
$env:NEXT_PUBLIC_LOCAL_APP_PORT = [string]$backendPort

Write-SecondMeStep 'Starting Next.js frontend in the background'
$frontendStartArgs = @{
    FilePath         = $nodeExe
    ArgumentList     = @($nextCliPath, 'dev', '--turbo', '-p', [string]$frontendPort)
    WorkingDirectory = $frontendRoot
    StdOutPath       = $frontendStdOut
    StdErrPath       = $frontendStdErr
    PidFile          = $frontendPidFile
}

$frontendProcess = Start-TrackedProcess @frontendStartArgs
Write-SecondMeInfo "Frontend PID: $($frontendProcess.Id)"
Write-SecondMeInfo "Frontend stdout: $frontendStdOut"
Write-SecondMeInfo "Frontend stderr: $frontendStdErr"

if (-not (Wait-UrlHealthy -Url $frontendUrl -TimeoutSec $HealthTimeoutSec)) {
    Stop-TrackedProcess -Name 'frontend' -PidFile $frontendPidFile -Ports @($frontendPort) | Out-Null
    Show-LogTail -Path $frontendStdOut -Lines 80
    Show-LogTail -Path $frontendStdErr -Lines 80
    throw "Frontend failed to become healthy at $frontendUrl within $HealthTimeoutSec seconds."
}

Write-SecondMeSuccess "Frontend is healthy at $frontendUrl"
Write-Host ''
Write-SecondMeSuccess "Frontend: $frontendUrl"
Write-SecondMeSuccess "Backend:  http://127.0.0.1:$backendPort"
Write-SecondMeSuccess "Local LLM endpoint: $effectiveLocalLLMUrl"
