param(
    [string]$ProjectRoot = ""
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceCandidate = Split-Path -Parent (Split-Path -Parent $scriptRoot)

if (-not $ProjectRoot) {
    if (Test-Path (Join-Path $sourceCandidate "server\app\main.py")) {
        $ProjectRoot = $sourceCandidate
    }
    else {
        $ProjectRoot = (Get-Location).Path
    }
}

$projectRoot = (Resolve-Path $ProjectRoot).Path
$serverRoot = Join-Path $projectRoot "server"
$python = Join-Path $projectRoot ".venv-tts\Scripts\python.exe"
$hostAddress = "127.0.0.1"
$port = 8765
$healthURL = "http://${hostAddress}:${port}/health"

function Write-Step($message) {
    Write-Host "[Local TTS] $message"
}

Write-Step "Project root: $projectRoot"

if (-not (Test-Path $serverRoot)) {
    Write-Error "Cannot find server directory: $serverRoot"
}

if (-not (Test-Path $python)) {
    Write-Error "Missing Python virtual environment: $python. Run the setup commands from README first."
}

Write-Step "Checking Python model dependencies..."
& $python -c "import fastapi, uvicorn, kokoro, soundfile, torch; print('dependencies ok')" | Write-Host

$existing = Get-NetTCPConnection -LocalAddress $hostAddress -LocalPort $port -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq "Listen" } |
    Select-Object -First 1

if ($existing) {
    Write-Step "Port $port is already in use by process $($existing.OwningProcess). Checking health..."
    try {
        $health = Invoke-RestMethod -Uri $healthURL -Method Get -TimeoutSec 5
        Write-Step "Existing service is available. Provider: $($health.provider), model loaded: $($health.model_loaded)"
        return
    }
    catch {
        Write-Error "Port $port is occupied, but $healthURL is not healthy. Stop process $($existing.OwningProcess) and run this script again."
    }
}

$env:LOCAL_TTS_PROVIDER = "kokoro"
$env:PYTHONIOENCODING = "utf-8"
$env:HF_HUB_DISABLE_SYMLINKS_WARNING = "1"

Write-Step "Starting Kokoro backend at $healthURL"
Set-Location $serverRoot

$job = Start-Job -ScriptBlock {
    param($pythonPath, $workingDirectory, $hostAddress, $port)

    Set-Location $workingDirectory
    $env:LOCAL_TTS_PROVIDER = "kokoro"
    $env:PYTHONIOENCODING = "utf-8"
    $env:HF_HUB_DISABLE_SYMLINKS_WARNING = "1"
    & $pythonPath -m uvicorn app.main:app --host $hostAddress --port $port
} -ArgumentList $python, $serverRoot, $hostAddress, $port

Start-Sleep -Seconds 3

try {
    $health = Invoke-RestMethod -Uri $healthURL -Method Get -TimeoutSec 10
    Write-Step "Backend is ready. Provider: $($health.provider), model loaded: $($health.model_loaded)"
    Write-Step "Keep this PowerShell window open while using Zotero Local TTS."
}
catch {
    Receive-Job $job -Keep | Write-Host
    Stop-Job $job -ErrorAction SilentlyContinue
    Remove-Job $job -ErrorAction SilentlyContinue
    Write-Error "Backend did not become healthy at $healthURL. Check the error output above."
}

while ($true) {
    Receive-Job $job -Keep | Write-Host

    if ((Get-Job -Id $job.Id).State -ne "Running") {
        Receive-Job $job -Keep | Write-Host
        Write-Error "Kokoro backend stopped unexpectedly."
    }

    Start-Sleep -Seconds 2
}
