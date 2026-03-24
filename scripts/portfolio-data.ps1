Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$moduleRoot = Join-Path $PSScriptRoot "modules"

. (Join-Path $moduleRoot "portfolio-core.ps1")
. (Join-Path $moduleRoot "portfolio-scan.ps1")
. (Join-Path $moduleRoot "portfolio-snapshot.ps1")
