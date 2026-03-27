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

    if ($cleanPath.StartsWith("http://") -or $cleanPath.StartsWith("https://")) {
        return $cleanPath
    }

    return "$cleanBase/$($cleanPath.TrimStart('/'))"
}

function Get-AnalyticsSnippet {
    param(
        $AnalyticsConfig
    )

    $enabled = [bool](Get-ObjectPropertyValue -InputObject $AnalyticsConfig -Name "enabled" -Default $false)
    if (-not $enabled) {
        return ""
    }

    $provider = (Get-StringValue -Value (Get-ObjectPropertyValue -InputObject $AnalyticsConfig -Name "provider")).ToLowerInvariant()
    $scriptUrl = Get-StringValue -Value (Get-ObjectPropertyValue -InputObject $AnalyticsConfig -Name "scriptUrl")

    if ($provider -eq "umami") {
        $websiteId = Get-StringValue -Value (Get-ObjectPropertyValue -InputObject $AnalyticsConfig -Name "websiteId")
        if ($scriptUrl -and $websiteId) {
            return "<script defer src=""$scriptUrl"" data-website-id=""$websiteId""></script>"
        }
    }

    if ($provider -eq "plausible") {
        $domain = Get-StringValue -Value (Get-ObjectPropertyValue -InputObject $AnalyticsConfig -Name "domain")
        if ($scriptUrl -and $domain) {
            return "<script defer data-domain=""$domain"" src=""$scriptUrl""></script>"
        }
    }

    return ""
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
$brandMonogram = Get-StringValue -Value (Get-ObjectPropertyValue -InputObject $siteConfig -Name "brandMonogram" -Default "MA") -Default "MA"
$ownerName = Get-StringValue -Value (Get-ObjectPropertyValue -InputObject $siteConfig -Name "ownerName" -Default "Portfolio") -Default "Portfolio"
$siteRole = Get-StringValue -Value (Get-ObjectPropertyValue -InputObject $siteConfig -Name "role")
$baseUrl = Get-StringValue -Value (Get-ObjectPropertyValue -InputObject $siteConfig -Name "baseUrl")
$themeColor = Get-StringValue -Value (Get-ObjectPropertyValue -InputObject $siteConfig -Name "themeColor") -Default "#0c131c"
$linkedinConfig = Get-ObjectPropertyValue -InputObject $config -Name "linkedin" -Default $null
$socialImagePath = Get-StringValue -Value (Get-ObjectPropertyValue -InputObject $siteConfig -Name "socialImagePath") -Default "/assets/images/linkedin-profile.jpg"
$seoConfig = Get-ObjectPropertyValue -InputObject $siteConfig -Name "seo" -Default $null
$analyticsConfig = Get-ObjectPropertyValue -InputObject $siteConfig -Name "analytics" -Default $null
$ogLocale = Get-StringValue -Value (Get-ObjectPropertyValue -InputObject $seoConfig -Name "locale") -Default "it_IT"
$socialImageAlt = Get-StringValue -Value (Get-ObjectPropertyValue -InputObject $seoConfig -Name "socialImageAlt") -Default "$ownerName - portfolio professionale"
$robotsDirective = Get-StringValue -Value (Get-ObjectPropertyValue -InputObject $seoConfig -Name "robots") -Default "index,follow"
$keywords = @((Get-ObjectPropertyValue -InputObject $seoConfig -Name "keywords" -Default @()))
$analyticsSnippet = Get-AnalyticsSnippet -AnalyticsConfig $analyticsConfig
$linkedinProfileUrl = Get-StringValue -Value (Get-ObjectPropertyValue -InputObject $linkedinConfig -Name "profileUrl")
$brandAria = "Home di $ownerName"
$manifestOutputs = @(
    foreach ($manifestPage in @($manifest.Pages)) {
        [string]$manifestPage.Output
    }
)
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

Get-ChildItem -LiteralPath $OutputRoot -Filter "*.html" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notin $manifestOutputs } |
    ForEach-Object {
        Remove-Item -LiteralPath $_.FullName -Force
        Write-Host "Removed stale page $($_.Name)"
    }

foreach ($page in @($manifest.Pages)) {
    $contentPath = Join-Path $TemplateRoot ([string]$page.ContentTemplate)
    $contentTemplate = Get-TemplateText -Path $contentPath
    $footerMarkup = Expand-TemplateTokens -Template $footerTemplate -Tokens @{
        FOOTER_TEXT = [string]$page.FooterText
    }
    $outputName = [string]$page.Output
    $canonicalPath = if ($outputName -eq "index.html") { "" } else { $outputName }
    $canonicalUrl = Join-AbsoluteUrl -BaseUrl $baseUrl -Path $canonicalPath
    $ogImageUrl = Join-AbsoluteUrl -BaseUrl $baseUrl -Path $socialImagePath
    $pageKeywords = @(
        $keywords
        [string]$page.Title
        $ownerName
        $siteRole
    ) | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) } | Select-Object -Unique
    $pageJsonLd = @{
        "@context" = "https://schema.org"
        "@type" = if ([string]$page.navId -eq "home" -or [string]$page.navId -eq "cv") { "ProfilePage" } else { "WebPage" }
        name = [string]$page.Title
        description = [string]$page.Description
        url = $canonicalUrl
        isPartOf = @{
            "@type" = "WebSite"
            name = $ownerName
            url = (Join-AbsoluteUrl -BaseUrl $baseUrl -Path "")
        }
        about = @{
            "@type" = "Person"
            name = $ownerName
            jobTitle = $siteRole
            image = $ogImageUrl
        }
    }
    if (-not [string]::IsNullOrWhiteSpace($linkedinProfileUrl)) {
        $pageJsonLd.about.sameAs = @($linkedinProfileUrl)
    }
    $pageJsonLd = $pageJsonLd | ConvertTo-Json -Depth 8 -Compress

    $pageHtml = Expand-TemplateTokens -Template $layoutTemplate -Tokens @{
        PAGE_TITLE = [string]$page.Title
        PAGE_DESCRIPTION = [string]$page.Description
        PAGE_KEYWORDS = ($pageKeywords -join ", ")
        SITE_AUTHOR = $ownerName
        PAGE_ROBOTS = $robotsDirective
        THEME_COLOR = $themeColor
        PAGE_CANONICAL_URL = $canonicalUrl
        OG_TYPE = $(if ([string]$page.navId -eq "home") { "website" } else { "article" })
        OG_LOCALE = $ogLocale
        OG_SITE_NAME = $ownerName
        OG_TITLE = [string]$page.Title
        OG_DESCRIPTION = [string]$page.Description
        OG_IMAGE_URL = $ogImageUrl
        OG_IMAGE_ALT = $socialImageAlt
        PAGE_JSON_LD = $pageJsonLd
        ANALYTICS_SNIPPET = $analyticsSnippet
        SITE_HEADER = $headerMarkup
        PAGE_CONTENT = $contentTemplate
        SITE_FOOTER = $footerMarkup
        SCRIPT_PATH = [string]$page.ScriptPath
    }

    $outputPath = Join-Path $OutputRoot ([string]$page.Output)
    $pageHtml | Set-Content -LiteralPath $outputPath -Encoding utf8
    Write-Host "Rendered page $($page.Output)"
}
