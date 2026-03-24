param(
    [string]$ConfigPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "readme.config.json"),
    [string]$OutputPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "site\assets\data\linkedin-profile.json")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "Config file not found: $ConfigPath"
}

$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$siteConfig = $config.site
$linkedinConfig = $config.linkedin

$profileData = [ordered]@{
    status = "cached"
    source = "config"
    profileUrl = $linkedinConfig.profileUrl
    fullName = $siteConfig.ownerName
    headline = ""
    photoUrl = ""
    location = ""
    summary = ""
    updatedAt = (Get-Date).ToUniversalTime().ToString("o")
    note = "Profilo LinkedIn collegato. Per sincronizzare automaticamente nome, headline e foto via API ufficiale imposta la variabile LINKEDIN_ACCESS_TOKEN nel workflow GitHub Actions."
}

if ($env:LINKEDIN_ACCESS_TOKEN) {
    try {
        $headers = @{
            "Authorization" = "Bearer $($env:LINKEDIN_ACCESS_TOKEN)"
            "X-Restli-Protocol-Version" = "2.0.0"
        }

        $profileResponse = Invoke-RestMethod -Method Get -Uri "https://api.linkedin.com/v2/me" -Headers $headers
        $fullName = @($profileResponse.localizedFirstName, $profileResponse.localizedLastName) -join " "
        $headline = $profileResponse.localizedHeadline
        $profileData.status = "synced"
        $profileData.source = "linkedin-api"
        if (-not [string]::IsNullOrWhiteSpace($fullName)) {
            $profileData.fullName = $fullName.Trim()
        }
        if (-not [string]::IsNullOrWhiteSpace($headline)) {
            $profileData.headline = $headline
        }
        if ($profileResponse.profilePicture.displayImage) {
            $profileData.note = "Profilo sincronizzato da LinkedIn tramite token OAuth."
        }
    }
    catch {
        $profileData.status = "sync_failed"
        $profileData.source = "config"
        $profileData.note = "La sincronizzazione API e fallita. Rimane il fallback statico con collegamento al profilo."
        $profileData.error = $_.Exception.Message
    }
}
else {
    try {
        $null = Invoke-WebRequest -Uri $linkedinConfig.profileUrl -Headers @{ "User-Agent" = "Mozilla/5.0" } -MaximumRedirection 5 -ErrorAction Stop
        $profileData.status = "public_profile_available"
        $profileData.note = "Il profilo pubblico sembra raggiungibile, ma la sincronizzazione automatica affidabile su GitHub Pages richiede comunque un token OAuth o una cache build-time."
    }
    catch {
        $profileData.status = "public_profile_blocked"
        $profileData.note = "Il profilo pubblico LinkedIn rifiuta richieste automatiche non autenticate. GitHub Pages non puo fare scraping diretto in modo affidabile."
        $profileData.error = $_.Exception.Message
    }
}

$outputDirectory = Split-Path -Path $OutputPath -Parent
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$profileData | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $OutputPath -Encoding utf8
Write-Host "LinkedIn profile cache written to $OutputPath"
