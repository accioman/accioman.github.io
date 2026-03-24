param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$ConfigPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "readme.config.json"),
    [string]$OutputPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "site\assets\data\site-data.json")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "portfolio-data.ps1")

$snapshot = Get-PortfolioSnapshot -RootPath $Root -ConfigPath $ConfigPath
$outputDirectory = Split-Path -Path $OutputPath -Parent

if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$snapshot | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $OutputPath -Encoding utf8
Write-Host "Site data generated at $OutputPath"
