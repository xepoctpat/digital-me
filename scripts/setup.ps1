[CmdletBinding()]
param(
    [switch]$BuildLlama,
    [switch]$SkipFrontendInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'utils\windows-local.ps1')

$repoRoot = Get-SecondMeRepoRoot
$envFile = Ensure-SecondMeEnvFile -RepoRoot $repoRoot
$poetry = Get-Command poetry -ErrorAction SilentlyContinue
$pythonExe = Get-PythonExecutable -RepoRoot $repoRoot

Write-SecondMeSection 'Setting up local Windows development environment'
Write-SecondMeInfo "Repository root: $repoRoot"
Write-SecondMeInfo "Environment file: $envFile"
Write-SecondMeInfo "Python: $pythonExe"

if ($poetry) {
    Write-SecondMeStep 'Installing Python dependencies with Poetry'
    Invoke-CheckedCommand -FilePath $poetry.Source -ArgumentList @('lock', '--no-cache') -WorkingDirectory $repoRoot -FailureMessage 'Failed to refresh the Poetry lockfile.'
    Invoke-CheckedCommand -FilePath $poetry.Source -ArgumentList @('install', '--no-root', '--no-interaction') -WorkingDirectory $repoRoot -FailureMessage 'Failed to install Poetry dependencies.'
}
else {
    Write-SecondMeWarning 'Poetry was not found. Falling back to pip install . inside the existing virtual environment.'
    Invoke-CheckedCommand -FilePath $pythonExe -ArgumentList @('-m', 'pip', 'install', '--upgrade', 'pip') -WorkingDirectory $repoRoot -FailureMessage 'Failed to upgrade pip in the local virtual environment.'
    Invoke-CheckedCommand -FilePath $pythonExe -ArgumentList @('-m', 'pip', 'install', '.') -WorkingDirectory $repoRoot -FailureMessage 'Failed to install project dependencies with pip. Install Poetry if you need the full managed workflow.'
}

Write-SecondMeStep 'Verifying key Python packages'
Invoke-CheckedCommand -FilePath $pythonExe -ArgumentList @('-c', 'import flask, chromadb, langchain') -WorkingDirectory $repoRoot -FailureMessage 'One or more required Python packages are missing after Poetry install.'

$graphragPackage = Join-Path $repoRoot 'dependencies\graphrag-1.2.1.dev27.tar.gz'
if (Test-Path $graphragPackage) {
    Write-SecondMeStep 'Installing the pinned local graphrag package'
    Invoke-CheckedCommand -FilePath $pythonExe -ArgumentList @('-m', 'pip', 'install', '--force-reinstall', $graphragPackage) -WorkingDirectory $repoRoot -FailureMessage 'Failed to install the local graphrag package.'
}
else {
    Write-SecondMeWarning "Local graphrag archive not found at $graphragPackage"
}

if (-not $SkipFrontendInstall) {
    $npmExe = Get-NpmExecutable
    Write-SecondMeStep 'Installing frontend dependencies'
    Invoke-CheckedCommand -FilePath $npmExe -ArgumentList @('install') -WorkingDirectory (Join-Path $repoRoot 'lpm_frontend') -FailureMessage 'Failed to install frontend dependencies.'
}
else {
    Write-SecondMeInfo 'Skipping frontend dependency installation.'
}

if ($BuildLlama) {
    $llamaArchive = Join-Path $repoRoot 'dependencies\llama.cpp.zip'
    $llamaRoot = Join-Path $repoRoot 'llama.cpp'
    $llamaBuildDir = Join-Path $llamaRoot 'build'
    $cmake = Get-Command cmake -ErrorAction SilentlyContinue
    if (-not $cmake) {
        throw 'CMake is required to build llama.cpp on Windows. Install CMake and Visual Studio Build Tools first.'
    }

    if (-not (Test-Path $llamaArchive) -and -not (Test-Path $llamaRoot)) {
        throw "llama.cpp source not found. Expected either $llamaArchive or $llamaRoot."
    }

    if (-not (Test-Path $llamaRoot)) {
        Write-SecondMeStep 'Extracting llama.cpp source archive'
        Expand-Archive -Path $llamaArchive -DestinationPath $repoRoot -Force
    }

    if (Test-Path $llamaBuildDir) {
        Write-SecondMeStep 'Cleaning existing llama.cpp build directory'
        Remove-Item -Path $llamaBuildDir -Recurse -Force
    }

    Ensure-Directory -Path $llamaBuildDir

    Write-SecondMeStep 'Configuring llama.cpp with CMake'
    Invoke-CheckedCommand -FilePath $cmake.Source -ArgumentList @('..') -WorkingDirectory $llamaBuildDir -FailureMessage 'CMake configuration for llama.cpp failed.'

    Write-SecondMeStep 'Building llama.cpp'
    Invoke-CheckedCommand -FilePath $cmake.Source -ArgumentList @('--build', '.', '--config', 'Release') -WorkingDirectory $llamaBuildDir -FailureMessage 'llama.cpp build failed.'
}
else {
    Write-SecondMeInfo 'Skipping llama.cpp build. Use -BuildLlama only if you need the managed llama-server path; Ollama or another external OpenAI-compatible server does not require it.'
}

Write-Host ''
Write-SecondMeSuccess 'Windows local setup completed.'
Write-SecondMeInfo 'Next step for Ollama: run scripts\start.ps1 -UseOllama'
