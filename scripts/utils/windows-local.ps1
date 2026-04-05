Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-SecondMeRepoRoot {
	return (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

function Get-SecondMeWindowsStateDir {
	param(
		[string]$RepoRoot = (Get-SecondMeRepoRoot)
	)

	return (Join-Path $RepoRoot 'run\windows-local')
}

function Get-SecondMeLogsDir {
	param(
		[string]$RepoRoot = (Get-SecondMeRepoRoot)
	)

	return (Join-Path $RepoRoot 'logs')
}

function Normalize-OpenAIBaseUrl {
	param([string]$Url)

	$trimmed = if ($null -eq $Url) { '' } else { $Url.Trim() }
	if (-not $trimmed) {
		return 'http://127.0.0.1:8080/v1'
	}

	$trimmed = $trimmed.TrimEnd('/')
	if ($trimmed.EndsWith('/v1')) {
		return $trimmed
	}

	return "$trimmed/v1"
}

function Ensure-Directory {
	param(
		[Parameter(Mandatory)]
		[string]$Path
	)

	if (-not (Test-Path $Path)) {
		[void](New-Item -ItemType Directory -Path $Path -Force)
	}
}

function Write-SecondMeMessage {
	param(
		[Parameter(Mandatory)]
		[string]$Message,
		[ConsoleColor]$Color = [ConsoleColor]::Gray,
		[string]$Prefix = '*'
	)

	$previousColor = $Host.UI.RawUI.ForegroundColor
	try {
		$Host.UI.RawUI.ForegroundColor = $Color
		Write-Host ("[{0}] {1}" -f $Prefix, $Message)
	}
	finally {
		$Host.UI.RawUI.ForegroundColor = $previousColor
	}
}

function Write-SecondMeSection {
	param([Parameter(Mandatory)][string]$Message)
	Write-Host ''
	Write-SecondMeMessage -Message $Message.ToUpperInvariant() -Color Cyan -Prefix '##'
}

function Write-SecondMeStep {
	param([Parameter(Mandatory)][string]$Message)
	Write-SecondMeMessage -Message $Message -Color White -Prefix '->'
}

function Write-SecondMeInfo {
	param([Parameter(Mandatory)][string]$Message)
	Write-SecondMeMessage -Message $Message -Color Gray -Prefix 'i'
}

function Write-SecondMeSuccess {
	param([Parameter(Mandatory)][string]$Message)
	Write-SecondMeMessage -Message $Message -Color Green -Prefix '+'
}

function Write-SecondMeWarning {
	param([Parameter(Mandatory)][string]$Message)
	Write-SecondMeMessage -Message $Message -Color Yellow -Prefix '!'
}

function Write-SecondMeError {
	param([Parameter(Mandatory)][string]$Message)
	Write-SecondMeMessage -Message $Message -Color Red -Prefix 'x'
}

function Expand-EnvValue {
	param(
		[Parameter(Mandatory)][string]$Value,
		[Parameter(Mandatory)][hashtable]$Environment
	)

	$expanded = $Value
	for ($i = 0; $i -lt 5; $i++) {
		$next = [System.Text.RegularExpressions.Regex]::Replace(
			$expanded,
			'\$\{([A-Za-z_][A-Za-z0-9_]*)\}',
			{
				param($match)
				$key = $match.Groups[1].Value
				if ($Environment.ContainsKey($key)) {
					return [string]$Environment[$key]
				}

				return $match.Value
			}
		)

		if ($next -eq $expanded) {
			break
		}

		$expanded = $next
	}

	return $expanded
}

function Read-EnvFile {
	param(
		[Parameter(Mandatory)]
		[string]$Path
	)

	if (-not (Test-Path $Path)) {
		throw "Environment file not found: $Path"
	}

	$environment = @{}

	foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
		$trimmed = $line.Trim()
		if (-not $trimmed -or $trimmed.StartsWith('#')) {
			continue
		}

		$separatorIndex = $trimmed.IndexOf('=')
		if ($separatorIndex -lt 1) {
			continue
		}

		$key = $trimmed.Substring(0, $separatorIndex).Trim()
		$value = $trimmed.Substring($separatorIndex + 1).Trim()

		if (
			($value.StartsWith("'") -and $value.EndsWith("'")) -or
			($value.StartsWith('"') -and $value.EndsWith('"'))
		) {
			$value = $value.Substring(1, $value.Length - 2)
		}

		$environment[$key] = $value
	}

	foreach ($key in @($environment.Keys)) {
		$environment[$key] = Expand-EnvValue -Value ([string]$environment[$key]) -Environment $environment
	}

	return $environment
}

function Get-EnvValue {
	param(
		[Parameter(Mandatory)][hashtable]$Environment,
		[Parameter(Mandatory)][string]$Key,
		[string]$DefaultValue
	)

	if ($Environment.ContainsKey($Key) -and -not [string]::IsNullOrWhiteSpace([string]$Environment[$Key])) {
		return [string]$Environment[$Key]
	}

	return $DefaultValue
}

function Write-EnvFile {
	param(
		[Parameter(Mandatory)][string]$Path,
		[Parameter(Mandatory)][hashtable]$Values
	)

	Ensure-Directory -Path (Split-Path -Parent $Path)

	$content = New-Object System.Collections.Generic.List[string]
	foreach ($key in ($Values.Keys | Sort-Object)) {
		$content.Add(("{0}={1}" -f $key, $Values[$key]))
	}

	[System.IO.File]::WriteAllLines($Path, $content)
}

function Get-PythonExecutable {
	param(
		[string]$RepoRoot = (Get-SecondMeRepoRoot)
	)

	$candidates = @(
		(Join-Path $RepoRoot '.poetry-venv\Scripts\python.exe')
	)

	foreach ($candidate in $candidates) {
		if ($candidate -and (Test-Path $candidate)) {
			return (Resolve-Path $candidate).Path
		}
	}

	$poetry = Get-Command poetry -ErrorAction SilentlyContinue
	if ($poetry) {
		try {
			$poetryEnv = (& $poetry.Source env info -p 2>$null).Trim()
			if ($LASTEXITCODE -eq 0 -and $poetryEnv) {
				$poetryPython = Join-Path $poetryEnv 'Scripts\python.exe'
				if (Test-Path $poetryPython) {
					return (Resolve-Path $poetryPython).Path
				}
			}
		}
		catch {
		}
	}

	foreach ($commandName in @('python.exe', 'python', 'py.exe', 'py')) {
		$command = Get-Command $commandName -ErrorAction SilentlyContinue
		if ($command) {
			return $command.Source
		}
	}

	throw 'Unable to locate a Python executable. Run scripts\setup.ps1 first.'
}

function Get-NodeExecutable {
	foreach ($commandName in @('node.exe', 'node')) {
		$command = Get-Command $commandName -ErrorAction SilentlyContinue
		if ($command) {
			return $command.Source
		}
	}

	throw 'Unable to locate Node.js. Install Node.js 20+ before starting the frontend.'
}

function Get-NpmExecutable {
	foreach ($commandName in @('npm.cmd', 'npm')) {
		$command = Get-Command $commandName -ErrorAction SilentlyContinue
		if ($command) {
			return $command.Source
		}
	}

	throw 'Unable to locate npm. Install Node.js 20+ before running setup.'
}

function Invoke-CheckedCommand {
	param(
		[Parameter(Mandatory)][string]$FilePath,
		[string[]]$ArgumentList = @(),
		[string]$WorkingDirectory = (Get-SecondMeRepoRoot),
		[string]$FailureMessage = 'Command failed.'
	)

	Push-Location $WorkingDirectory
	try {
		& $FilePath @ArgumentList
		$exitCode = $LASTEXITCODE
	}
	finally {
		Pop-Location
	}

	if ($exitCode -ne 0) {
		throw $FailureMessage
	}
}

function Test-PortAvailable {
	param([Parameter(Mandatory)][int]$Port)
	return -not [bool](Get-ListeningProcess -Port $Port)
}

function Get-ListeningProcess {
	param([Parameter(Mandatory)][int]$Port)

	$netTcpCommand = Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue
	if ($netTcpCommand) {
		$connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
		if ($connection) {
			try {
				return Get-Process -Id $connection.OwningProcess -ErrorAction Stop
			}
			catch {
				return $null
			}
		}
	}

	$netstatLines = netstat -ano -p tcp | Select-String -Pattern (":$Port\s+.*LISTENING\s+(\d+)$")
	foreach ($line in $netstatLines) {
		$processId = [int]$line.Matches[0].Groups[1].Value
		try {
			return Get-Process -Id $processId -ErrorAction Stop
		}
		catch {
			return $null
		}
	}

	return $null
}

function Test-UrlHealth {
	param(
		[Parameter(Mandatory)][string]$Url,
		[int]$TimeoutSec = 3
	)

	try {
		$response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec -Method Get
		return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400)
	}
	catch {
		return $false
	}
}

function Wait-UrlHealthy {
	param(
		[Parameter(Mandatory)][string]$Url,
		[int]$TimeoutSec = 120,
		[int]$PollIntervalMs = 1000
	)

	$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
	while ($stopwatch.Elapsed.TotalSeconds -lt $TimeoutSec) {
		if (Test-UrlHealth -Url $Url) {
			return $true
		}

		Start-Sleep -Milliseconds $PollIntervalMs
	}

	return $false
}

function Read-PidFile {
	param([Parameter(Mandatory)][string]$Path)

	if (-not (Test-Path $Path)) {
		return $null
	}

	$rawValue = (Get-Content -Path $Path -Raw).Trim()
	if (-not $rawValue) {
		return $null
	}

	return [int]$rawValue
}

function Write-PidFile {
	param(
		[Parameter(Mandatory)][string]$Path,
		[Parameter(Mandatory)][int]$ProcessId
	)

	Ensure-Directory -Path (Split-Path -Parent $Path)
	Set-Content -Path $Path -Value $ProcessId -Encoding ASCII
}

function Remove-PidFile {
	param([Parameter(Mandatory)][string]$Path)

	if (Test-Path $Path) {
		Remove-Item -Path $Path -Force
	}
}

function Get-TrackedProcess {
	param([Parameter(Mandatory)][string]$PidFile)

	$processId = Read-PidFile -Path $PidFile
	if (-not $processId) {
		return $null
	}

	try {
		return Get-Process -Id $processId -ErrorAction Stop
	}
	catch {
		Remove-PidFile -Path $PidFile
		return $null
	}
}

function Stop-TrackedProcess {
	param(
		[Parameter(Mandatory)][string]$Name,
		[Parameter(Mandatory)][string]$PidFile,
		[int[]]$Ports = @(),
		[switch]$KillPortOwners
	)

	$process = Get-TrackedProcess -PidFile $PidFile
	if ($process) {
		Write-SecondMeStep "Stopping $Name (PID $($process.Id))"
		Stop-Process -Id $process.Id -Force
		Remove-PidFile -Path $PidFile
		return $true
	}

	if ($KillPortOwners) {
		foreach ($port in $Ports) {
			$portProcess = Get-ListeningProcess -Port $port
			if ($portProcess) {
				Write-SecondMeWarning "Stopping $Name process on port $port (PID $($portProcess.Id))"
				Stop-Process -Id $portProcess.Id -Force
			}
		}
	}

	Remove-PidFile -Path $PidFile
	return $false
}

function Start-TrackedProcess {
	param(
		[Parameter(Mandatory)][string]$FilePath,
		[string[]]$ArgumentList = @(),
		[Parameter(Mandatory)][string]$WorkingDirectory,
		[Parameter(Mandatory)][string]$StdOutPath,
		[Parameter(Mandatory)][string]$StdErrPath,
		[Parameter(Mandatory)][string]$PidFile
	)

	Ensure-Directory -Path (Split-Path -Parent $StdOutPath)
	Ensure-Directory -Path (Split-Path -Parent $StdErrPath)
	Ensure-Directory -Path (Split-Path -Parent $PidFile)

	$startProcessArgs = @{
		FilePath               = $FilePath
		ArgumentList           = $ArgumentList
		WorkingDirectory       = $WorkingDirectory
		RedirectStandardOutput = $StdOutPath
		RedirectStandardError  = $StdErrPath
		PassThru               = $true
	}

	$process = Start-Process @startProcessArgs

	Write-PidFile -Path $PidFile -ProcessId $process.Id
	return $process
}

function Show-LogTail {
	param(
		[Parameter(Mandatory)][string]$Path,
		[int]$Lines = 80
	)

	if (-not (Test-Path $Path)) {
		Write-SecondMeWarning "Log file not found: $Path"
		return
	}

	Write-Host ''
	Write-SecondMeMessage -Message ("Last {0} lines from {1}" -f $Lines, $Path) -Color DarkGray -Prefix 'log'
	Get-Content -Path $Path -Tail $Lines
}
