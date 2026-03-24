param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$SiteSource = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "site"),
    [string]$OutputDir = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path ".site")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $SiteSource)) {
    throw "Site source directory not found: $SiteSource"
}

& (Join-Path $PSScriptRoot "render-site-pages.ps1")
& (Join-Path $PSScriptRoot "generate-site-data.ps1")
& (Join-Path $PSScriptRoot "sync-linkedin-profile.ps1")
& (Join-Path $PSScriptRoot "generate-seo-assets.ps1")

if (Test-Path -LiteralPath $OutputDir) {
    Remove-Item -LiteralPath $OutputDir -Recurse -Force
}

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

Get-ChildItem -LiteralPath $SiteSource |
    Where-Object { $_.Name -ne "templates" } |
    ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $OutputDir $_.Name) -Recurse -Force
    }

$programDirectories = Get-ChildItem -LiteralPath $Root -Directory |
    Where-Object { $_.Name -notin @(".git", ".github", ".site", "docs", "scripts", "site") -and $_.Name -notlike ".*" }

foreach ($directory in $programDirectories) {
    Copy-Item -LiteralPath $directory.FullName -Destination (Join-Path $OutputDir $directory.Name) -Recurse -Force
}

Set-Content -LiteralPath (Join-Path $OutputDir ".nojekyll") -Value "" -Encoding utf8

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($null -ne $nodeCommand) {
    try {
        & $nodeCommand.Source (Join-Path $PSScriptRoot "export-cv-pdf.mjs")
    }
    catch {
        Write-Warning "CV PDF export skipped: $($_.Exception.Message)"
    }
}

Write-Host "Pages build created at $OutputDir"
