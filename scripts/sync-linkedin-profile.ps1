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
$resumeConfig = if ($config.PSObject.Properties.Name -contains "resume") { $config.resume } else { $null }
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

            $highlights = if ($_.PSObject.Properties.Name -contains "highlights" -and $null -ne $_.highlights) { @($_.highlights) } else { @() }
            if (@($highlights).Length -gt 0) {
                $entry.highlights = $highlights
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

$contact = [ordered]@{}
if ($null -ne $resumeConfig -and $resumeConfig.PSObject.Properties.Name -contains "contact" -and $null -ne $resumeConfig.contact) {
    $emails = if ($resumeConfig.contact.PSObject.Properties.Name -contains "emails" -and $null -ne $resumeConfig.contact.emails) {
        @($resumeConfig.contact.emails | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
    }
    else {
        @()
    }

    if (@($emails).Length -gt 0) {
        $contact.emails = $emails
    }
}

$personalDetails = @()
if ($null -ne $resumeConfig -and $resumeConfig.PSObject.Properties.Name -contains "personalDetails" -and $null -ne $resumeConfig.personalDetails) {
    $personalDetails = @(
        $resumeConfig.personalDetails | ForEach-Object {
            $entry = [ordered]@{}

            if ($_.PSObject.Properties.Name -contains "label" -and -not [string]::IsNullOrWhiteSpace($_.label)) {
                $entry.label = $_.label
            }
            if ($_.PSObject.Properties.Name -contains "value" -and -not [string]::IsNullOrWhiteSpace($_.value)) {
                $entry.value = $_.value
            }

            if ($entry.Count -gt 0) {
                $entry
            }
        }
    )
}

$languages = @()
if ($null -ne $resumeConfig -and $resumeConfig.PSObject.Properties.Name -contains "languages" -and $null -ne $resumeConfig.languages) {
    $languages = @(
        $resumeConfig.languages | ForEach-Object {
            $entry = [ordered]@{}

            if ($_.PSObject.Properties.Name -contains "name" -and -not [string]::IsNullOrWhiteSpace($_.name)) {
                $entry.name = $_.name
            }
            if ($_.PSObject.Properties.Name -contains "dots" -and $null -ne $_.dots) {
                $entry.dots = $_.dots
            }
            if ($_.PSObject.Properties.Name -contains "label" -and -not [string]::IsNullOrWhiteSpace($_.label)) {
                $entry.label = $_.label
            }
            if ($_.PSObject.Properties.Name -contains "referenceLevel" -and -not [string]::IsNullOrWhiteSpace($_.referenceLevel)) {
                $entry.referenceLevel = $_.referenceLevel
            }

            if ($entry.Count -gt 0) {
                $entry
            }
        }
    )
}

$universityCourses = @()
if ($null -ne $resumeConfig -and $resumeConfig.PSObject.Properties.Name -contains "universityCourses" -and $null -ne $resumeConfig.universityCourses) {
    $universityCourses = @(
        $resumeConfig.universityCourses | ForEach-Object {
            $entry = [ordered]@{}

            if ($_.PSObject.Properties.Name -contains "title" -and -not [string]::IsNullOrWhiteSpace($_.title)) {
                $entry.title = $_.title
            }
            if ($_.PSObject.Properties.Name -contains "description" -and -not [string]::IsNullOrWhiteSpace($_.description)) {
                $entry.description = $_.description
            }

            if ($entry.Count -gt 0) {
                $entry
            }
        }
    )
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
    resumeSummary = if ($null -ne $resumeConfig -and $resumeConfig.PSObject.Properties.Name -contains "summary") { $resumeConfig.summary } else { "" }
    contact = $contact
    personalDetails = $personalDetails
    languages = $languages
    universityCourses = $universityCourses
    updatedAt = (Get-Date).ToUniversalTime().ToString("o")
}

$outputDirectory = Split-Path -Path $OutputPath -Parent
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$profileData | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $OutputPath -Encoding utf8
Write-Host "LinkedIn profile data written to $OutputPath"
