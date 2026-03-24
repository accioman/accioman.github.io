param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$TemplateRoot = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "site\templates"),
    [string]$ConfigPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "readme.config.json"),
    [string]$OutputRoot = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "site")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-TemplateText {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Template file not found: $Path"
    }

    return Get-Content -LiteralPath $Path -Raw
}

function Expand-TemplateTokens {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Template,
        [Parameter(Mandatory = $true)]
        [hashtable]$Tokens
    )

    $expanded = $Template

    foreach ($key in $Tokens.Keys) {
        $expanded = $expanded.Replace("{{${key}}}", [string]$Tokens[$key])
    }

    return $expanded
}

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

$layoutPath = Join-Path $TemplateRoot "layout.html"
$headerPath = Join-Path $TemplateRoot "partials\site-header.html"
$footerPath = Join-Path $TemplateRoot "partials\site-footer.html"
$manifestPath = Join-Path $TemplateRoot "pages.json"

$layoutTemplate = Get-TemplateText -Path $layoutPath
$headerTemplate = Get-TemplateText -Path $headerPath
$footerTemplate = Get-TemplateText -Path $footerPath
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$siteConfig = Get-ObjectPropertyValue -InputObject $config -Name "site" -Default $null
$brandMonogram = [string](Get-ObjectPropertyValue -InputObject $siteConfig -Name "brandMonogram" -Default "MA")
$ownerName = [string](Get-ObjectPropertyValue -InputObject $siteConfig -Name "ownerName" -Default "Portfolio")
$brandAria = "Home di $ownerName"
$navItems = @(
    foreach ($navPage in @($manifest.Pages | Where-Object { [bool](Get-ObjectPropertyValue -InputObject $_ -Name "showInNav" -Default $false) })) {
        $navHref = "./$([string]$navPage.Output)"
        $navId = [string](Get-ObjectPropertyValue -InputObject $navPage -Name "navId" -Default "")
        $navLabel = [string](Get-ObjectPropertyValue -InputObject $navPage -Name "navLabel" -Default $navPage.Title)
        "    <a href=""$navHref"" data-nav=""$navId"">$navLabel</a>"
    }
)
$headerMarkup = Expand-TemplateTokens -Template $headerTemplate -Tokens @{
    BRAND_HREF = "./index.html"
    BRAND_ARIA = $brandAria
    BRAND_MONOGRAM = $brandMonogram
    NAV_ITEMS = ($navItems -join [Environment]::NewLine)
}

foreach ($page in @($manifest.Pages)) {
    $contentPath = Join-Path $TemplateRoot ([string]$page.ContentTemplate)
    $contentTemplate = Get-TemplateText -Path $contentPath
    $footerMarkup = Expand-TemplateTokens -Template $footerTemplate -Tokens @{
        FOOTER_TEXT = [string]$page.FooterText
    }

    $pageHtml = Expand-TemplateTokens -Template $layoutTemplate -Tokens @{
        PAGE_TITLE = [string]$page.Title
        PAGE_DESCRIPTION = [string]$page.Description
        SITE_HEADER = $headerMarkup
        PAGE_CONTENT = $contentTemplate
        SITE_FOOTER = $footerMarkup
        SCRIPT_PATH = [string]$page.ScriptPath
    }

    $outputPath = Join-Path $OutputRoot ([string]$page.Output)
    $pageHtml | Set-Content -LiteralPath $outputPath -Encoding utf8
    Write-Host "Rendered page $($page.Output)"
}
