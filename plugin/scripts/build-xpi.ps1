$ErrorActionPreference = "Stop"

$pluginRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $pluginRoot "..")).Path
$addonRoot = Join-Path $pluginRoot "addon"
$sampleAudio = Join-Path $repoRoot "samples\test.wav"
$buildRoot = Join-Path $pluginRoot "build"
$stageRoot = Join-Path $buildRoot "local-academic-tts"
$version = "0.1.2"
$zipPath = Join-Path $buildRoot "local-academic-tts-$version.zip"
$xpiPath = Join-Path $buildRoot "local-academic-tts-$version.xpi"

function Assert-ChildPath {
	param(
		[Parameter(Mandatory = $true)]
		[string] $Child,
		[Parameter(Mandatory = $true)]
		[string] $Parent
	)

	$resolvedParent = (Resolve-Path -LiteralPath $Parent).Path
	$resolvedChild = if (Test-Path -LiteralPath $Child) {
		(Resolve-Path -LiteralPath $Child).Path
	}
	else {
		$Child
	}

	if (-not $resolvedChild.StartsWith($resolvedParent, [System.StringComparison]::OrdinalIgnoreCase)) {
		throw "Refusing to operate outside expected directory: $resolvedChild"
	}
}

if (-not (Test-Path -LiteralPath $addonRoot)) {
	throw "Missing addon directory: $addonRoot"
}

if (-not (Test-Path -LiteralPath $sampleAudio)) {
	throw "Missing sample audio: $sampleAudio"
}

Assert-ChildPath -Child $buildRoot -Parent $pluginRoot

if (Test-Path -LiteralPath $buildRoot) {
	Remove-Item -LiteralPath $buildRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $stageRoot | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stageRoot "samples") | Out-Null

Copy-Item -Path (Join-Path $addonRoot "*") -Destination $stageRoot -Recurse
Copy-Item -LiteralPath $sampleAudio -Destination (Join-Path $stageRoot "samples\test.wav")

Compress-Archive -Path (Join-Path $stageRoot "*") -DestinationPath $zipPath -Force
Move-Item -LiteralPath $zipPath -Destination $xpiPath -Force

Write-Output $xpiPath
