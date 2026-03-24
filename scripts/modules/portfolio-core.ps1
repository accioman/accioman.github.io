function Get-PortfolioConfig {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Config file not found: $Path"
    }

    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

function Get-ContentMetadata {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $emptyMetadata = [PSCustomObject]@{
        Programs = @()
        Courses = @()
        FeaturedCertificates = @()
        FeaturedProjects = @()
        ProgramsByPath = @{}
        CoursesByPath = @{}
        FeaturedCertificateRanks = @{}
        FeaturedProjectRanks = @{}
    }

    if (-not (Test-Path -LiteralPath $Path)) {
        return $emptyMetadata
    }

    $rawMetadata = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    $programs = @((Get-ObjectPropertyValue -InputObject $rawMetadata -Name "Programs" -Default @()))
    $courses = @((Get-ObjectPropertyValue -InputObject $rawMetadata -Name "Courses" -Default @()))
    $featuredCertificates = @((Get-ObjectPropertyValue -InputObject $rawMetadata -Name "FeaturedCertificates" -Default @()))
    $featuredProjects = @((Get-ObjectPropertyValue -InputObject $rawMetadata -Name "FeaturedProjects" -Default @()))
    $programsByPath = @{}
    $coursesByPath = @{}
    $featuredCertificateRanks = @{}
    $featuredProjectRanks = @{}

    foreach ($entry in $programs) {
        if ($null -ne $entry -and -not [string]::IsNullOrWhiteSpace($entry.Path)) {
            $programsByPath[$entry.Path] = $entry
        }
    }

    foreach ($entry in $courses) {
        if ($null -ne $entry -and -not [string]::IsNullOrWhiteSpace($entry.Path)) {
            $coursesByPath[$entry.Path] = $entry
        }
    }

    for ($index = 0; $index -lt $featuredCertificates.Count; $index++) {
        $path = [string]$featuredCertificates[$index]
        if (-not [string]::IsNullOrWhiteSpace($path)) {
            $featuredCertificateRanks[$path] = $index
        }
    }

    for ($index = 0; $index -lt $featuredProjects.Count; $index++) {
        $path = [string]$featuredProjects[$index]
        if (-not [string]::IsNullOrWhiteSpace($path)) {
            $featuredProjectRanks[$path] = $index
        }
    }

    return [PSCustomObject]@{
        Programs = $programs
        Courses = $courses
        FeaturedCertificates = $featuredCertificates
        FeaturedProjects = $featuredProjects
        ProgramsByPath = $programsByPath
        CoursesByPath = $coursesByPath
        FeaturedCertificateRanks = $featuredCertificateRanks
        FeaturedProjectRanks = $featuredProjectRanks
    }
}

function Get-MetadataEntry {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Map,
        [Parameter(Mandatory = $true)]
        [string]$Key
    )

    if ($Map.ContainsKey($Key)) {
        return $Map[$Key]
    }

    return $null
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

function Get-MetadataString {
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

function Get-MetadataStringList {
    param(
        $Values
    )

    if ($null -eq $Values) {
        return @()
    }

    $items = if ($Values -is [System.Collections.IEnumerable] -and $Values -isnot [string]) {
        @($Values)
    }
    else {
        @($Values)
    }

    return @(
        $items |
            ForEach-Object { Get-MetadataString -Value $_ } |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
            Select-Object -Unique
    )
}

function Get-MetadataInt {
    param(
        $Value,
        [int]$Default = 999
    )

    if ($null -eq $Value) {
        return $Default
    }

    try {
        return [int]$Value
    }
    catch {
        return $Default
    }
}

function Get-MetadataBool {
    param(
        $Value,
        [bool]$Default = $false
    )

    if ($null -eq $Value) {
        return $Default
    }

    if ($Value -is [bool]) {
        return [bool]$Value
    }

    $text = [string]$Value
    if ([string]::IsNullOrWhiteSpace($text)) {
        return $Default
    }

    switch ($text.Trim().ToLowerInvariant()) {
        "true" { return $true }
        "1" { return $true }
        "yes" { return $true }
        "false" { return $false }
        "0" { return $false }
        "no" { return $false }
        default { return $Default }
    }
}

function Get-MetadataRank {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$Map,
        [Parameter(Mandatory = $true)]
        [string]$Key,
        [int]$Default = 9999
    )

    if ($Map.ContainsKey($Key)) {
        return [int]$Map[$Key]
    }

    return $Default
}

function Get-RepeatString {
    param(
        [Parameter(Mandatory = $true)]
        [char]$Character,
        [Parameter(Mandatory = $true)]
        [int]$Count
    )

    if ($Count -le 0) {
        return ""
    }

    return [string]::new($Character, $Count)
}

function New-ProgressBar {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Completed,
        [Parameter(Mandatory = $true)]
        [int]$Total,
        [int]$Width = 12
    )

    if ($Total -le 0) {
        return "[" + (Get-RepeatString -Character '-' -Count $Width) + "]"
    }

    $filled = [int][Math]::Round(($Completed / [double]$Total) * $Width, 0, [System.MidpointRounding]::AwayFromZero)
    if ($filled -gt $Width) {
        $filled = $Width
    }

    return "[" + (Get-RepeatString -Character '#' -Count $filled) + (Get-RepeatString -Character '-' -Count ($Width - $filled)) + "]"
}

function Format-Percent {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Completed,
        [Parameter(Mandatory = $true)]
        [int]$Total
    )

    if ($Total -le 0) {
        return 0
    }

    return [int][Math]::Round(($Completed / [double]$Total) * 100, 0, [System.MidpointRounding]::AwayFromZero)
}

function Format-CountLabel {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Count,
        [Parameter(Mandatory = $true)]
        [string]$Singular,
        [Parameter(Mandatory = $true)]
        [string]$Plural
    )

    if ($Count -eq 1) {
        return "1 $Singular"
    }

    return "$Count $Plural"
}

function Format-FileSize {
    param(
        [Parameter(Mandatory = $true)]
        [long]$Bytes
    )

    if ($Bytes -lt 1KB) {
        return "$Bytes B"
    }

    if ($Bytes -lt 1MB) {
        return "{0:N1} KB" -f ($Bytes / 1KB)
    }

    if ($Bytes -lt 1GB) {
        return "{0:N1} MB" -f ($Bytes / 1MB)
    }

    return "{0:N1} GB" -f ($Bytes / 1GB)
}

function ConvertTo-Slug {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    $normalized = $Value.Normalize([Text.NormalizationForm]::FormD)
    $builder = [System.Text.StringBuilder]::new()

    foreach ($character in $normalized.ToCharArray()) {
        $unicodeCategory = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($character)
        if ($unicodeCategory -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$builder.Append($character)
        }
    }

    $ascii = $builder.ToString().Normalize([Text.NormalizationForm]::FormC).ToLowerInvariant()
    $ascii = [Regex]::Replace($ascii, "[^a-z0-9]+", "-")
    $ascii = $ascii.Trim('-')

    if ([string]::IsNullOrWhiteSpace($ascii)) {
        return "item"
    }

    return $ascii
}

function ConvertTo-WebPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RelativePath
    )

    $segments = $RelativePath -replace "\\", "/" -split "/"
    $encodedSegments = foreach ($segment in $segments) {
        [System.Uri]::EscapeDataString($segment)
    }

    return ($encodedSegments -join "/")
}

function Get-RelativePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BasePath,
        [Parameter(Mandatory = $true)]
        [string]$TargetPath
    )

    $resolvedBase = (Resolve-Path -LiteralPath $BasePath).ProviderPath
    $resolvedTarget = (Resolve-Path -LiteralPath $TargetPath).ProviderPath

    $baseDirectory = if (Test-Path -LiteralPath $resolvedBase -PathType Container) {
        $resolvedBase
    }
    else {
        Split-Path -Path $resolvedBase -Parent
    }

    $baseFullPath = [System.IO.Path]::GetFullPath($baseDirectory)
    $targetFullPath = [System.IO.Path]::GetFullPath($resolvedTarget)
    $baseRoot = [System.IO.Path]::GetPathRoot($baseFullPath)
    $targetRoot = [System.IO.Path]::GetPathRoot($targetFullPath)
    $isWindowsPlatform = [System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT
    $comparison = if ($isWindowsPlatform) { [System.StringComparison]::OrdinalIgnoreCase } else { [System.StringComparison]::Ordinal }

    if (-not [string]::Equals($baseRoot, $targetRoot, $comparison)) {
        return $targetFullPath
    }

    $trimChars = @([char]'/', [char]'\')
    $baseRemainder = $baseFullPath.Substring($baseRoot.Length).Trim($trimChars)
    $targetRemainder = $targetFullPath.Substring($targetRoot.Length).Trim($trimChars)
    $baseSegments = if ([string]::IsNullOrWhiteSpace($baseRemainder)) { @() } else { @($baseRemainder -split '[\\/]+' | Where-Object { $_ }) }
    $targetSegments = if ([string]::IsNullOrWhiteSpace($targetRemainder)) { @() } else { @($targetRemainder -split '[\\/]+' | Where-Object { $_ }) }

    $commonLength = 0
    $maxCommonLength = [Math]::Min($baseSegments.Count, $targetSegments.Count)
    while ($commonLength -lt $maxCommonLength -and [string]::Equals($baseSegments[$commonLength], $targetSegments[$commonLength], $comparison)) {
        $commonLength++
    }

    $relativeParts = [System.Collections.Generic.List[string]]::new()

    for ($index = $commonLength; $index -lt $baseSegments.Count; $index++) {
        $relativeParts.Add("..")
    }

    for ($index = $commonLength; $index -lt $targetSegments.Count; $index++) {
        $relativeParts.Add($targetSegments[$index])
    }

    if ($relativeParts.Count -eq 0) {
        return "."
    }

    return [string]::Join([string][System.IO.Path]::DirectorySeparatorChar, $relativeParts)
}
