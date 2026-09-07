[CmdletBinding()]
param(
  [string] $Tag
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$releaseRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot ".release"))
$expectedReleaseRoot = $projectRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

if (-not $releaseRoot.StartsWith($expectedReleaseRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Release staging directory must remain inside the project root."
}

$manifestPath = Join-Path $projectRoot "system.json"
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
  throw "Required runtime file is missing: system.json"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$expectedManifestUrl = "https://raw.githubusercontent.com/SebsokK/cypherv2/main/system.json"
$effectiveTag = if ([string]::IsNullOrWhiteSpace($Tag)) { "v$($manifest.version)" } else { $Tag }
$expectedDownloadUrl = "https://github.com/SebsokK/cypherv2/releases/download/$effectiveTag/cypherv2.zip"

if ($manifest.id -ne "cypherv2") {
  throw "Unexpected system id '$($manifest.id)'; expected 'cypherv2'."
}

if ($effectiveTag -ne "v$($manifest.version)") {
  throw "Release tag '$effectiveTag' does not match system version '$($manifest.version)'."
}

if ($manifest.manifest -ne $expectedManifestUrl) {
  throw "Manifest URL must be '$expectedManifestUrl'."
}

if ($manifest.download -ne $expectedDownloadUrl) {
  throw "Download URL must be '$expectedDownloadUrl'."
}

$requiredRuntimePaths = @(
  "system.json",
  "dist",
  "templates",
  "lang",
  "assets",
  "packs",
  "fixtures",
  "README.md",
  "LICENSE.md",
  "legal"
)

foreach ($relativePath in $requiredRuntimePaths) {
  $sourcePath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Required runtime content is missing: $relativePath"
  }
}

$requiredGeneratedPacks = @(
  "packs/descriptors",
  "packs/skills",
  "packs/weapons-and-armors",
  "packs/focus-abilities",
  "packs/foci",
  "packs/cyphers",
  "packs/cypher-tables"
)

foreach ($relativePath in $requiredGeneratedPacks) {
  $packPath = Join-Path $projectRoot $relativePath
  if (-not (Test-Path -LiteralPath $packPath -PathType Container)) {
    throw "Required generated Foundry pack is missing: $relativePath. Run pnpm build first."
  }
}

if (Test-Path -LiteralPath $releaseRoot) {
  Remove-Item -LiteralPath $releaseRoot -Recurse -Force
}

$stageRoot = Join-Path $releaseRoot "stage"
$archivePath = Join-Path $releaseRoot "cypherv2.zip"
New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null

foreach ($relativePath in $requiredRuntimePaths) {
  $sourcePath = Join-Path $projectRoot $relativePath
  $destinationPath = Join-Path $stageRoot $relativePath
  if (Test-Path -LiteralPath $sourcePath -PathType Container) {
    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Recurse
  } else {
    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath
  }
}

Compress-Archive -Path (Join-Path $stageRoot "*") -DestinationPath $archivePath -CompressionLevel Optimal

$forbiddenPrefixes = @(
  "src/",
  "tests/",
  "docs/",
  "content/",
  "scripts/",
  "_reference/",
  ".generated/",
  ".reports/",
  "node_modules/",
  ".pnpm-store/",
  "coverage/",
  ".git/",
  ".github/"
)
$forbiddenFiles = @(
  "tsconfig.json",
  "vite.config.ts",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "package.json"
)

$archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
try {
  $entries = @($archive.Entries | ForEach-Object { $_.FullName.Replace("\", "/") })

  if ($entries -notcontains "system.json") {
    throw "Archive layout is invalid: system.json is not at the archive root."
  }

  if ($entries | Where-Object { $_ -like "cypherv2/*" }) {
    throw "Archive layout is invalid: an extra cypherv2/ wrapper directory was found."
  }

  foreach ($relativePath in $requiredRuntimePaths) {
    $normalized = $relativePath.Replace("\", "/")
    $found = if ([System.IO.Path]::HasExtension($normalized)) {
      $entries -contains $normalized
    } else {
      @($entries | Where-Object { $_ -eq "$normalized/" -or $_ -like "$normalized/*" }).Count -gt 0
    }
    if (-not $found) {
      throw "Archive is missing required runtime content: $relativePath"
    }
  }

  foreach ($prefix in $forbiddenPrefixes) {
    if ($entries | Where-Object { $_ -eq $prefix -or $_ -like "$prefix*" }) {
      throw "Archive contains forbidden development content: $prefix"
    }
  }

  foreach ($file in $forbiddenFiles) {
    if ($entries -contains $file) {
      throw "Archive contains forbidden development file: $file"
    }
  }
} finally {
  $archive.Dispose()
}

Write-Host "Validated Foundry release archive: $archivePath"
Write-Host "Tag: $effectiveTag"
Write-Host "Manifest: $expectedManifestUrl"
Write-Host "Download: $expectedDownloadUrl"
