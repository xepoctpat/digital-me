[CmdletBinding()]
param(
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
$backendPidFile = Join-Path $stateDir 'backend.pid'
$backendStdOut = Join-Path $logsDir 'backend.stdout.log'
$backendStdErr = Join-Path $logsDir 'backend.stderr.log'
$backendPort = [int](Get-EnvValue -Environment $envMap -Key 'LOCAL_APP_PORT' -DefaultValue '8002')
$backendHealthUrl = "http://127.0.0.1:$backendPort/health"
$pythonExe = Get-PythonExecutable -RepoRoot $repoRoot
$dbRelativePath = Get-EnvValue -Environment $envMap -Key 'DB_FILE' -DefaultValue 'data/sqlite/lpm.db'
$dbPath = Join-Path $repoRoot $dbRelativePath
$baseDir = Get-EnvValue -Environment $envMap -Key 'LOCAL_BASE_DIR' -DefaultValue '.'
$localLogDir = Get-EnvValue -Environment $envMap -Key 'LOCAL_LOG_DIR' -DefaultValue 'logs'
$effectiveLocalLLMUrl = Normalize-OpenAIBaseUrl -Url $(if ($LocalLLMUrl) { $LocalLLMUrl } else { Get-EnvValue -Environment $envMap -Key 'LOCAL_LLM_SERVICE_URL' -DefaultValue 'http://127.0.0.1:8080/v1' })

Write-SecondMeSection 'Starting local backend'
Write-SecondMeInfo "Repository root: $repoRoot"
Write-SecondMeInfo "Environment file: $envFile"
Write-SecondMeInfo "Python: $pythonExe"
Write-SecondMeInfo "Backend URL: http://127.0.0.1:$backendPort"
Write-SecondMeInfo "Local LLM URL: $effectiveLocalLLMUrl"

$existingBackend = Get-TrackedProcess -PidFile $backendPidFile
if ($existingBackend) {
    if (Test-UrlHealth -Url $backendHealthUrl) {
        Write-SecondMeSuccess "Backend is already running (PID $($existingBackend.Id))."
        exit 0
    }

    if (-not $Force) {
        throw "Backend PID file exists, but health check is failing. Re-run with -Force to replace the stale process."
    }

    Write-SecondMeWarning 'Removing stale backend process before restart.'
    Stop-TrackedProcess -Name 'backend' -PidFile $backendPidFile -Ports @($backendPort) -KillPortOwners | Out-Null
}

$portOwner = Get-ListeningProcess -Port $backendPort
if ($portOwner) {
    if (-not $Force) {
        throw "Port $backendPort is already in use by PID $($portOwner.Id) ($($portOwner.ProcessName)). Use -Force after verifying it is safe to stop."
    }

    Write-SecondMeWarning "Stopping process $($portOwner.ProcessName) on port $backendPort."
    Stop-Process -Id $portOwner.Id -Force
}

Ensure-Directory -Path $stateDir
Ensure-Directory -Path $logsDir
Ensure-Directory -Path (Split-Path -Parent $dbPath)
Ensure-Directory -Path (Join-Path $repoRoot 'data\chroma_db')
Ensure-Directory -Path (Join-Path $repoRoot $localLogDir)

$env:PYTHONPATH = if ($env:PYTHONPATH) { "$repoRoot;$($env:PYTHONPATH)" } else { $repoRoot }
$env:BASE_DIR = $baseDir
$env:LOG_DIR = $localLogDir
$env:LOCAL_LLM_SERVICE_URL = $effectiveLocalLLMUrl
$env:FLASK_APP = Get-EnvValue -Environment $envMap -Key 'FLASK_APP' -DefaultValue 'lpm_kernel/app.py'
$env:FLASK_ENV = Get-EnvValue -Environment $envMap -Key 'FLASK_ENV' -DefaultValue 'development'

Write-SecondMeStep 'Checking required Python packages'
Invoke-CheckedCommand -FilePath $pythonExe -ArgumentList @('-c', 'import flask, chromadb') -WorkingDirectory $repoRoot -FailureMessage 'Missing backend dependencies. Run scripts\setup.ps1 first.'

if (-not (Test-Path $dbPath)) {
    Write-SecondMeStep 'Initializing SQLite database'
    $sqliteInitScript = @"
import pathlib
import sqlite3
import sys

db_path = pathlib.Path(sys.argv[1])
sql_path = pathlib.Path(sys.argv[2])
db_path.parent.mkdir(parents=True, exist_ok=True)
sql = sql_path.read_text(encoding='utf-8')
conn = sqlite3.connect(db_path)
conn.executescript(sql)
conn.commit()
conn.close()
"@
    Invoke-CheckedCommand -FilePath $pythonExe -ArgumentList @('-c', $sqliteInitScript, $dbPath, (Join-Path $repoRoot 'docker\sqlite\init.sql')) -WorkingDirectory $repoRoot -FailureMessage 'Failed to initialize SQLite database.'
    Write-SecondMeSuccess 'SQLite database initialized.'
}
else {
    Write-SecondMeInfo 'SQLite database already exists.'
}

Write-SecondMeStep 'Initializing ChromaDB collections'
Invoke-CheckedCommand -FilePath $pythonExe -ArgumentList @('docker/app/init_chroma.py') -WorkingDirectory $repoRoot -FailureMessage 'ChromaDB initialization failed.'

Write-SecondMeStep 'Running backend migrations'
Invoke-CheckedCommand -FilePath $pythonExe -ArgumentList @('scripts/run_migrations.py') -WorkingDirectory $repoRoot -FailureMessage 'Database migrations failed.'

$modelsUrl = "$effectiveLocalLLMUrl/models"
if (Test-UrlHealth -Url $modelsUrl) {
    Write-SecondMeSuccess "External local LLM endpoint is reachable: $modelsUrl"
}
else {
    Write-SecondMeWarning "Local LLM endpoint is not responding yet: $modelsUrl"
    Write-SecondMeWarning 'The backend can still start, but chat will remain unavailable until the local model server responds.'
}

Write-SecondMeStep 'Starting Flask backend in the background'
$backendStartArgs = @{
    FilePath         = $pythonExe
    ArgumentList     = @('-m', 'flask', 'run', '--host=0.0.0.0', "--port=$backendPort")
    WorkingDirectory = $repoRoot
    StdOutPath       = $backendStdOut
    StdErrPath       = $backendStdErr
    PidFile          = $backendPidFile
}

$backendProcess = Start-TrackedProcess @backendStartArgs

Write-SecondMeInfo "Backend PID: $($backendProcess.Id)"
Write-SecondMeInfo "Backend stdout: $backendStdOut"
Write-SecondMeInfo "Backend stderr: $backendStdErr"

if (-not (Wait-UrlHealthy -Url $backendHealthUrl -TimeoutSec $HealthTimeoutSec)) {
    Stop-TrackedProcess -Name 'backend' -PidFile $backendPidFile -Ports @($backendPort) | Out-Null
    Show-LogTail -Path $backendStdOut -Lines 80
    Show-LogTail -Path $backendStdErr -Lines 80
    throw "Backend failed to become healthy at $backendHealthUrl within $HealthTimeoutSec seconds."
}

Write-SecondMeSuccess "Backend is healthy at $backendHealthUrl"
