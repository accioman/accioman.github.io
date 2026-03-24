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
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$configuredPhotoUrl = ""
if ($linkedinConfig.PSObject.Properties.Name -contains "photoPath" -and -not [string]::IsNullOrWhiteSpace($linkedinConfig.photoPath)) {
    if ($linkedinConfig.photoPath -match "^https?://") {
        $configuredPhotoUrl = $linkedinConfig.photoPath
    }
    else {
        $relativePhotoPath = $linkedinConfig.photoPath -replace "^[.][/\\]", ""
        $localPhotoPath = Join-Path (Join-Path $repoRoot "site") ($relativePhotoPath -replace "/", "\")
        if (Test-Path -LiteralPath $localPhotoPath) {
            $configuredPhotoUrl = $linkedinConfig.photoPath
        }
    }
}

$featuredSkills = @()
if ($linkedinConfig.PSObject.Properties.Name -contains "featuredSkills" -and $null -ne $linkedinConfig.featuredSkills) {
    $featuredSkills = @($linkedinConfig.featuredSkills)
}

$experience = @()
if ($linkedinConfig.PSObject.Properties.Name -contains "experience" -and $null -ne $linkedinConfig.experience) {
    $experience = @(
        $linkedinConfig.experience | ForEach-Object {
            $entry = [ordered]@{}

            if ($_.PSObject.Properties.Name -contains "title" -and -not [string]::IsNullOrWhiteSpace($_.title)) {
                $entry.title = $_.title
            }
            if ($_.PSObject.Properties.Name -contains "company" -and -not [string]::IsNullOrWhiteSpace($_.company)) {
                $entry.company = $_.company
            }
            if ($_.PSObject.Properties.Name -contains "employmentType" -and -not [string]::IsNullOrWhiteSpace($_.employmentType)) {
                $entry.employmentType = $_.employmentType
            }
            if ($_.PSObject.Properties.Name -contains "period" -and -not [string]::IsNullOrWhiteSpace($_.period)) {
                $entry.period = $_.period
            }
            if ($_.PSObject.Properties.Name -contains "duration" -and -not [string]::IsNullOrWhiteSpace($_.duration)) {
                $entry.duration = $_.duration
            }

            $skills = if ($_.PSObject.Properties.Name -contains "skills" -and $null -ne $_.skills) { @($_.skills) } else { @() }
            if (@($skills).Length -gt 0) {
                $entry.skills = $skills
            }

            $entry
        }
    )
}

$educationHistory = @()
if ($linkedinConfig.PSObject.Properties.Name -contains "educationHistory" -and $null -ne $linkedinConfig.educationHistory) {
    $educationHistory = @(
        $linkedinConfig.educationHistory | ForEach-Object {
            $entry = [ordered]@{}

            if ($_.PSObject.Properties.Name -contains "institution" -and -not [string]::IsNullOrWhiteSpace($_.institution)) {
                $entry.institution = $_.institution
            }
            if ($_.PSObject.Properties.Name -contains "degree" -and -not [string]::IsNullOrWhiteSpace($_.degree)) {
                $entry.degree = $_.degree
            }
            if ($_.PSObject.Properties.Name -contains "period" -and -not [string]::IsNullOrWhiteSpace($_.period)) {
                $entry.period = $_.period
            }

            $skills = if ($_.PSObject.Properties.Name -contains "skills" -and $null -ne $_.skills) { @($_.skills) } else { @() }
            if (@($skills).Length -gt 0) {
                $entry.skills = $skills
            }

            $entry
        }
    )
}

$education = ""
if ($linkedinConfig.PSObject.Properties.Name -contains "education" -and -not [string]::IsNullOrWhiteSpace($linkedinConfig.education)) {
    $education = $linkedinConfig.education
}
elseif ($educationHistory.Count -gt 0 -and -not [string]::IsNullOrWhiteSpace($educationHistory[0].institution)) {
    $education = $educationHistory[0].institution
}

$profileData = [ordered]@{
    status = "static"
    source = "manual-profile"
    profileUrl = $linkedinConfig.profileUrl
    fullName = if ($linkedinConfig.PSObject.Properties.Name -contains "fullName" -and -not [string]::IsNullOrWhiteSpace($linkedinConfig.fullName)) { $linkedinConfig.fullName } else { $siteConfig.ownerName }
    headline = if ($linkedinConfig.PSObject.Properties.Name -contains "headline") { $linkedinConfig.headline } else { "" }
    photoUrl = $configuredPhotoUrl
    location = if ($linkedinConfig.PSObject.Properties.Name -contains "location") { $linkedinConfig.location } else { "" }
    education = $education
    availability = if ($linkedinConfig.PSObject.Properties.Name -contains "availability") { $linkedinConfig.availability } else { "" }
    profileLanguage = if ($linkedinConfig.PSObject.Properties.Name -contains "profileLanguage") { $linkedinConfig.profileLanguage } else { "" }
    summary = if ($linkedinConfig.PSObject.Properties.Name -contains "summary") { $linkedinConfig.summary } else { "" }
    experience = $experience
    educationHistory = $educationHistory
    featuredSkills = $featuredSkills
    updatedAt = (Get-Date).ToUniversalTime().ToString("o")
    note = "Profilo LinkedIn gestito in modo statico nel repository."
}

$outputDirectory = Split-Path -Path $OutputPath -Parent
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$profileData | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $OutputPath -Encoding utf8
Write-Host "LinkedIn profile data written to $OutputPath"
