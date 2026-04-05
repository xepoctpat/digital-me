[CmdletBinding()]
param(
    [string]$LocalLLMUrl,
    [switch]$Detailed
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'utils\windows-local.ps1')

$repoRoot = Get-SecondMeRepoRoot
$envFile = Ensure-SecondMeEnvFile -RepoRoot $repoRoot
$envMap = Read-EnvFile -Path $envFile
$stateDir = Get-SecondMeWindowsStateDir -RepoRoot $repoRoot
$backendPidFile = Join-Path $stateDir 'backend.pid'
$frontendPidFile = Join-Path $stateDir 'frontend.pid'
$backendPort = [int](Get-EnvValue -Environment $envMap -Key 'LOCAL_APP_PORT' -DefaultValue '8002')
$frontendPort = [int](Get-EnvValue -Environment $envMap -Key 'LOCAL_FRONTEND_PORT' -DefaultValue '3000')
$backendUrl = "http://127.0.0.1:$backendPort/health"
$frontendUrl = "http://127.0.0.1:$frontendPort"
$effectiveLocalLLMUrl = Normalize-OpenAIBaseUrl -Url $(if ($LocalLLMUrl) { $LocalLLMUrl } else { Get-EnvValue -Environment $envMap -Key 'LOCAL_LLM_SERVICE_URL' -DefaultValue 'http://127.0.0.1:8080/v1' })
$llmModelsUrl = "$effectiveLocalLLMUrl/models"

Write-SecondMeSection 'Local service status'
Write-SecondMeInfo "Environment file: $envFile"

$frontendProcess = Get-TrackedProcess -PidFile $frontendPidFile
$backendProcess = Get-TrackedProcess -PidFile $backendPidFile
$frontendPortOwner = Get-ListeningProcess -Port $frontendPort
$backendPortOwner = Get-ListeningProcess -Port $backendPort
$frontendHealthy = Test-UrlHealth -Url $frontendUrl
$backendHealthy = Test-UrlHealth -Url $backendUrl
$llmHealthy = Test-UrlHealth -Url $llmModelsUrl

if ($frontendHealthy) {
    Write-SecondMeSuccess "Frontend is running at $frontendUrl"
}
elseif ($frontendPortOwner) {
    Write-SecondMeWarning "Frontend port $frontendPort is in use by PID $($frontendPortOwner.Id) ($($frontendPortOwner.ProcessName)), but the health check failed."
}
else {
    Write-SecondMeInfo 'Frontend is not running.'
}

if ($frontendProcess) {
    Write-SecondMeInfo "Tracked frontend PID: $($frontendProcess.Id)"
}

if ($backendHealthy) {
    Write-SecondMeSuccess "Backend is running at $backendUrl"
}
elseif ($backendPortOwner) {
    Write-SecondMeWarning "Backend port $backendPort is in use by PID $($backendPortOwner.Id) ($($backendPortOwner.ProcessName)), but the health check failed."
}
else {
    Write-SecondMeInfo 'Backend is not running.'
}

if ($backendProcess) {
    Write-SecondMeInfo "Tracked backend PID: $($backendProcess.Id)"
}

if ($llmHealthy) {
    Write-SecondMeSuccess "Local LLM endpoint is reachable at $llmModelsUrl"
}
else {
    Write-SecondMeWarning "Local LLM endpoint is not responding at $llmModelsUrl"
}

if ($Detailed -and $backendHealthy) {
    try {
        $backendStatus = Invoke-RestMethod -Uri $backendUrl -Method Get -TimeoutSec 5
        Write-Host ''
        Write-SecondMeMessage -Message 'Backend health payload:' -Color DarkGray -Prefix 'json'
        $backendStatus | ConvertTo-Json -Depth 5
    }
    catch {
        Write-SecondMeWarning 'Unable to retrieve detailed backend health payload.'
    }
}
