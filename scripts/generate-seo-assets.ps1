param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$ConfigPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "readme.config.json"),
    [string]$ManifestPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "site\templates\pages.json"),
    [string]$OutputRoot = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "site")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-ObjectPropertyValue {
    param(
        $InputObject,
        [Parameter(Mandatory = $true)]
        [string]$Name,
        $Default = $null
    )

    if ($null -eq $InputObject) {
        return $Default
    }

    $property = $InputObject.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $Default
    }

    return $property.Value
}

function Get-StringValue {
    param(
        $Value,
        [string]$Default = ""
    )

    if ($null -eq $Value) {
        return $Default
    }

    $text = [string]$Value
    if ([string]::IsNullOrWhiteSpace($text)) {
        return $Default
    }

    return $text.Trim()
}

function Join-AbsoluteUrl {
    param(
        [string]$BaseUrl,
        [string]$Path
    )

    $cleanBase = Get-StringValue -Value $BaseUrl
    if ([string]::IsNullOrWhiteSpace($cleanBase)) {
        return ""
    }

    $cleanBase = $cleanBase.TrimEnd('/')
    $cleanPath = Get-StringValue -Value $Path
    if ([string]::IsNullOrWhiteSpace($cleanPath)) {
        return "$cleanBase/"
    }

    return "$cleanBase/$($cleanPath.TrimStart('/'))"
}

$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$siteConfig = Get-ObjectPropertyValue -InputObject $config -Name "site"
$baseUrl = Get-StringValue -Value (Get-ObjectPropertyValue -InputObject $siteConfig -Name "baseUrl")
$ownerName = Get-StringValue -Value (Get-ObjectPropertyValue -InputObject $siteConfig -Name "ownerName") -Default "Portfolio"
$manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json

$robotsContent = @(
    "User-agent: *"
    "Allow: /"
)

if ($baseUrl) {
    $robotsContent += ""
    $robotsContent += "Sitemap: $(Join-AbsoluteUrl -BaseUrl $baseUrl -Path 'sitemap.xml')"
}

Set-Content -LiteralPath (Join-Path $OutputRoot "robots.txt") -Value ($robotsContent -join [Environment]::NewLine) -Encoding utf8

$pageUrls = foreach ($page in @($manifest.pages)) {
    $outputName = [string]$page.output
    $path = if ($outputName -eq "index.html") { "" } else { $outputName }
    $absoluteUrl = Join-AbsoluteUrl -BaseUrl $baseUrl -Path $path

    if (-not [string]::IsNullOrWhiteSpace($absoluteUrl)) {
        "  <url><loc>$absoluteUrl</loc></url>"
    }
}

$sitemapContent = @(
    '<?xml version="1.0" encoding="UTF-8"?>'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    $pageUrls
    '</urlset>'
) -join [Environment]::NewLine

Set-Content -LiteralPath (Join-Path $OutputRoot "sitemap.xml") -Value $sitemapContent -Encoding utf8

$manifestJson = [ordered]@{
    name = $ownerName
    short_name = $ownerName
    start_url = "./index.html"
    display = "standalone"
    background_color = "#0c131c"
    theme_color = Get-StringValue -Value (Get-ObjectPropertyValue -InputObject $siteConfig -Name "themeColor") -Default "#0c131c"
}

$manifestJson | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $OutputRoot "site.webmanifest") -Encoding utf8
Write-Host "SEO assets generated in $OutputRoot"
