Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

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

    $relativePath = [System.IO.Path]::GetRelativePath($baseDirectory, $resolvedTarget)
    return $relativePath -replace "/", "\"
}

function Get-ProgramDirectories {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BasePath
    )

    $excluded = @(".git", ".github", ".site", "scripts", "site")

    return Get-ChildItem -LiteralPath $BasePath -Directory |
        Where-Object {
            $_.Name -notin $excluded -and
            $_.Name -notlike ".*" -and
            (Get-ChildItem -LiteralPath $_.FullName -Directory | Measure-Object).Count -gt 0
        } |
        Sort-Object Name
}

function Get-FileKindInfo {
    param(
        [Parameter(Mandatory = $true)]
        [System.IO.FileInfo]$File,
        [Parameter(Mandatory = $true)]
        [bool]$IsCertificate
    )

    if ($IsCertificate) {
        return [PSCustomObject]@{
            Kind = "certificate"
            Label = "Certificato"
            Previewable = $true
            PreviewType = "pdf"
        }
    }

    switch ($File.Extension.ToLowerInvariant()) {
        ".pdf" {
            return [PSCustomObject]@{
                Kind = "pdf"
                Label = "PDF"
                Previewable = $true
                PreviewType = "pdf"
            }
        }
        ".doc" {
            return [PSCustomObject]@{
                Kind = "document"
                Label = "Documento"
                Previewable = $true
                PreviewType = "office"
            }
        }
        ".docx" {
            return [PSCustomObject]@{
                Kind = "document"
                Label = "Documento"
                Previewable = $true
                PreviewType = "office"
            }
        }
        ".xls" {
            return [PSCustomObject]@{
                Kind = "spreadsheet"
                Label = "Foglio"
                Previewable = $true
                PreviewType = "office"
            }
        }
        ".xlsx" {
            return [PSCustomObject]@{
                Kind = "spreadsheet"
                Label = "Foglio"
                Previewable = $true
                PreviewType = "office"
            }
        }
        ".ppt" { break }
        ".pptx" {
            return [PSCustomObject]@{
                Kind = "presentation"
                Label = "Presentazione"
                Previewable = $true
                PreviewType = "office"
            }
        }
        default {
            return [PSCustomObject]@{
                Kind = "file"
                Label = "File"
                Previewable = $false
                PreviewType = "download"
            }
        }
    }

    return [PSCustomObject]@{
        Kind = "file"
        Label = "File"
        Previewable = $false
        PreviewType = "download"
    }
}

function Get-CourseInfos {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootPath,
        [Parameter(Mandatory = $true)]
        [System.IO.DirectoryInfo]$ProgramDirectory
    )

    $courseRoots = Get-ChildItem -LiteralPath $ProgramDirectory.FullName -Directory | Sort-Object Name
    $statusRank = @{
        "Completato" = 0
        "In corso" = 1
        "Cartella pronta" = 2
    }

    $courses = foreach ($courseRoot in $courseRoots) {
        $displayParts = [System.Collections.Generic.List[string]]::new()
        $displayParts.Add($courseRoot.Name)
        $effectiveDirectory = $courseRoot

        while ($true) {
            $childDirectories = @(Get-ChildItem -LiteralPath $effectiveDirectory.FullName -Directory)
            $directFiles = @(Get-ChildItem -LiteralPath $effectiveDirectory.FullName -File)

            if ($directFiles.Count -eq 0 -and $childDirectories.Count -eq 1) {
                $effectiveDirectory = $childDirectories[0]
                $displayParts.Add($effectiveDirectory.Name)
                continue
            }

            break
        }

        $allFiles = @(Get-ChildItem -LiteralPath $courseRoot.FullName -File -Recurse | Sort-Object FullName)
        $certificateFiles = @($allFiles | Where-Object { $_.Name -like "Coursera*.pdf" })
        $workFiles = @($allFiles | Where-Object { $_.Name -notlike "Coursera*.pdf" })

        $status = if ($certificateFiles.Count -gt 0) {
            "Completato"
        }
        elseif ($workFiles.Count -gt 0) {
            "In corso"
        }
        else {
            "Cartella pronta"
        }

        $fileEntries = foreach ($file in $allFiles) {
            $relativePath = (Get-RelativePath -BasePath $RootPath -TargetPath $file.FullName) -replace "\\", "/"
            $courseRelativePath = (Get-RelativePath -BasePath $courseRoot.FullName -TargetPath $file.FullName) -replace "\\", "/"
            $isCertificate = $file.Name -like "Coursera*.pdf"
            $kindInfo = Get-FileKindInfo -File $file -IsCertificate $isCertificate

            [PSCustomObject]@{
                Id = ConvertTo-Slug -Value $relativePath
                Name = $file.Name
                RelativePath = $relativePath
                CourseRelativePath = $courseRelativePath
                WebPath = ConvertTo-WebPath -RelativePath $relativePath
                Extension = $file.Extension.ToLowerInvariant()
                Kind = $kindInfo.Kind
                KindLabel = $kindInfo.Label
                IsCertificate = $isCertificate
                Previewable = $kindInfo.Previewable
                PreviewType = $kindInfo.PreviewType
                SizeBytes = [long]$file.Length
                SizeLabel = Format-FileSize -Bytes ([long]$file.Length)
                UpdatedAt = $file.LastWriteTimeUtc.ToString("o")
                UpdatedAtLocal = $file.LastWriteTime.ToString("dd/MM/yyyy")
            }
        }

        $evidenceParts = [System.Collections.Generic.List[string]]::new()
        if ($certificateFiles.Count -gt 0) {
            $evidenceParts.Add((Format-CountLabel -Count $certificateFiles.Count -Singular "certificato" -Plural "certificati"))
        }
        if ($workFiles.Count -gt 0) {
            $evidenceParts.Add((Format-CountLabel -Count $workFiles.Count -Singular "file di lavoro" -Plural "file di lavoro"))
        }
        if ($evidenceParts.Count -eq 0) {
            $evidenceParts.Add("nessun file")
        }

        $materialPreview = ""
        if ($workFiles.Count -gt 0) {
            $topNames = $workFiles | Sort-Object Name | Select-Object -First 3 -ExpandProperty Name
            $materialPreview = $topNames -join ", "
            if ($workFiles.Count -gt 3) {
                $materialPreview += " + $($workFiles.Count - 3) altri"
            }
        }

        $courseRelativePath = (Get-RelativePath -BasePath $RootPath -TargetPath $courseRoot.FullName) -replace "\\", "/"
        $displayName = $displayParts -join " / "

        [PSCustomObject]@{
            Id = ConvertTo-Slug -Value "$($ProgramDirectory.Name)-$displayName"
            Name = $displayName
            Slug = ConvertTo-Slug -Value $displayName
            RelativePath = $courseRelativePath
            WebPath = ConvertTo-WebPath -RelativePath $courseRelativePath
            Status = $status
            StatusRank = $statusRank[$status]
            CertificateCount = $certificateFiles.Count
            WorkFileCount = $workFiles.Count
            TotalFiles = $allFiles.Count
            Evidence = $evidenceParts -join " + "
            MaterialPreview = $materialPreview
            Files = $fileEntries
        }
    }

    return $courses | Sort-Object StatusRank, Name
}

function Get-PortfolioSnapshot {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootPath,
        [Parameter(Mandatory = $true)]
        [string]$ConfigPath
    )

    $config = Get-PortfolioConfig -Path $ConfigPath
    $programDirectories = @(Get-ProgramDirectories -BasePath $RootPath)

    $programs = foreach ($programDirectory in $programDirectories) {
        $courses = @(Get-CourseInfos -RootPath $RootPath -ProgramDirectory $programDirectory)
        $completedCourses = @($courses | Where-Object { $_.Status -eq "Completato" }).Count
        $inProgressCourses = @($courses | Where-Object { $_.Status -eq "In corso" }).Count
        $readyCourses = @($courses | Where-Object { $_.Status -eq "Cartella pronta" }).Count
        $workFiles = ($courses | Measure-Object -Property WorkFileCount -Sum).Sum
        $certificateFiles = ($courses | Measure-Object -Property CertificateCount -Sum).Sum

        if ($null -eq $workFiles) {
            $workFiles = 0
        }
        if ($null -eq $certificateFiles) {
            $certificateFiles = 0
        }

        [PSCustomObject]@{
            Id = ConvertTo-Slug -Value $programDirectory.Name
            Name = $programDirectory.Name
            Slug = ConvertTo-Slug -Value $programDirectory.Name
            RelativePath = (Get-RelativePath -BasePath $RootPath -TargetPath $programDirectory.FullName) -replace "\\", "/"
            WebPath = ConvertTo-WebPath -RelativePath ((Get-RelativePath -BasePath $RootPath -TargetPath $programDirectory.FullName) -replace "\\", "/")
            Courses = $courses
            TotalCourses = $courses.Count
            CompletedCourses = $completedCourses
            InProgressCourses = $inProgressCourses
            ReadyCourses = $readyCourses
            WorkFiles = [int]$workFiles
            CertificateFiles = [int]$certificateFiles
            CompletionPercent = Format-Percent -Completed $completedCourses -Total $courses.Count
            ProgressBar = New-ProgressBar -Completed $completedCourses -Total $courses.Count
        }
    }

    $totalPrograms = $programs.Count
    $totalCourses = ($programs | Measure-Object -Property TotalCourses -Sum).Sum
    $totalCompleted = ($programs | Measure-Object -Property CompletedCourses -Sum).Sum
    $totalInProgress = ($programs | Measure-Object -Property InProgressCourses -Sum).Sum
    $totalReady = ($programs | Measure-Object -Property ReadyCourses -Sum).Sum
    $totalWorkFiles = ($programs | Measure-Object -Property WorkFiles -Sum).Sum
    $totalCertificates = ($programs | Measure-Object -Property CertificateFiles -Sum).Sum

    foreach ($totalVariable in @("totalCourses", "totalCompleted", "totalInProgress", "totalReady", "totalWorkFiles", "totalCertificates")) {
        if ($null -eq (Get-Variable -Name $totalVariable -ValueOnly)) {
            Set-Variable -Name $totalVariable -Value 0
        }
    }

    $documents = foreach ($program in $programs) {
        foreach ($course in $program.Courses) {
            foreach ($file in $course.Files) {
                [PSCustomObject]@{
                    Id = $file.Id
                    Name = $file.Name
                    RelativePath = $file.RelativePath
                    WebPath = $file.WebPath
                    Extension = $file.Extension
                    Kind = $file.Kind
                    KindLabel = $file.KindLabel
                    IsCertificate = $file.IsCertificate
                    Previewable = $file.Previewable
                    PreviewType = $file.PreviewType
                    SizeBytes = $file.SizeBytes
                    SizeLabel = $file.SizeLabel
                    UpdatedAt = $file.UpdatedAt
                    UpdatedAtLocal = $file.UpdatedAtLocal
                    ProgramId = $program.Id
                    ProgramName = $program.Name
                    CourseId = $course.Id
                    CourseName = $course.Name
                    CourseStatus = $course.Status
                }
            }
        }
    }

    $certificateGroups = @($documents | Where-Object { $_.IsCertificate } | Group-Object Name)
    foreach ($group in $certificateGroups) {
        $entries = @($group.Group | Sort-Object ProgramName, CourseName, RelativePath)
        $programIds = @($entries | Select-Object -ExpandProperty ProgramId -Unique | Sort-Object)
        $programNames = @($entries | Select-Object -ExpandProperty ProgramName -Unique | Sort-Object)
        $courseIds = @($entries | Select-Object -ExpandProperty CourseId -Unique | Sort-Object)
        $courseNames = @($entries | Select-Object -ExpandProperty CourseName -Unique | Sort-Object)
        $displayName = if ($courseNames.Count -eq 1) { $courseNames[0] } else { $courseNames -join " / " }

        foreach ($entry in $entries) {
            Add-Member -InputObject $entry -NotePropertyName "DisplayName" -NotePropertyValue $displayName -Force
            Add-Member -InputObject $entry -NotePropertyName "ProgramIds" -NotePropertyValue $programIds -Force
            Add-Member -InputObject $entry -NotePropertyName "ProgramNames" -NotePropertyValue $programNames -Force
            Add-Member -InputObject $entry -NotePropertyName "CourseIds" -NotePropertyValue $courseIds -Force
            Add-Member -InputObject $entry -NotePropertyName "CourseNames" -NotePropertyValue $courseNames -Force
            Add-Member -InputObject $entry -NotePropertyName "CertificateOccurrences" -NotePropertyValue $entries.Count -Force
        }
    }

    $certificates = foreach ($group in $certificateGroups) {
        $entries = @($group.Group | Sort-Object ProgramName, CourseName, RelativePath)
        $primary = $entries[0]

        [PSCustomObject]@{
            Id = ConvertTo-Slug -Value ("certificate-" + $primary.Name)
            Name = $primary.Name
            DisplayName = $primary.DisplayName
            RelativePath = $primary.RelativePath
            WebPath = $primary.WebPath
            Extension = $primary.Extension
            Kind = $primary.Kind
            KindLabel = $primary.KindLabel
            IsCertificate = $true
            Previewable = $primary.Previewable
            PreviewType = $primary.PreviewType
            SizeBytes = $primary.SizeBytes
            SizeLabel = $primary.SizeLabel
            UpdatedAt = $primary.UpdatedAt
            UpdatedAtLocal = $primary.UpdatedAtLocal
            ProgramId = $primary.ProgramId
            ProgramName = $primary.ProgramName
            ProgramIds = $primary.ProgramIds
            ProgramNames = $primary.ProgramNames
            CourseId = $primary.CourseId
            CourseName = $primary.CourseName
            CourseIds = $primary.CourseIds
            CourseNames = $primary.CourseNames
            CertificateOccurrences = $primary.CertificateOccurrences
        }
    }

    $projects = foreach ($program in $programs) {
        foreach ($course in $program.Courses | Where-Object { $_.WorkFileCount -gt 0 }) {
            [PSCustomObject]@{
                Id = $course.Id
                Name = $course.Name
                Status = $course.Status
                Evidence = $course.Evidence
                MaterialPreview = $course.MaterialPreview
                WorkFileCount = $course.WorkFileCount
                ProgramId = $program.Id
                ProgramName = $program.Name
                Files = @($course.Files | Where-Object { $_.IsCertificate -eq $false })
            }
        }
    }

    $overallPercent = Format-Percent -Completed $totalCompleted -Total $totalCourses
    $generatedAtUtc = (Get-Date).ToUniversalTime()

    return [PSCustomObject]@{
        GeneratedAt = $generatedAtUtc.ToString("o")
        GeneratedAtLocal = (Get-Date).ToString("dd/MM/yyyy")
        Config = $config
        Stats = [PSCustomObject]@{
            TotalPrograms = [int]$totalPrograms
            TotalCourses = [int]$totalCourses
            TotalCompleted = [int]$totalCompleted
            TotalInProgress = [int]$totalInProgress
            TotalReady = [int]$totalReady
            TotalWorkFiles = [int]$totalWorkFiles
            TotalCertificates = [int]$totalCertificates
            CompletionPercent = [int]$overallPercent
            ProgressBar = New-ProgressBar -Completed $totalCompleted -Total $totalCourses
        }
        Programs = $programs
        Library = [PSCustomObject]@{
            Documents = @($documents | Sort-Object ProgramName, CourseName, Name)
            Pdfs = @($documents | Where-Object { $_.PreviewType -eq "pdf" } | Sort-Object ProgramName, CourseName, Name)
            Certificates = @($certificates | Sort-Object DisplayName, ProgramName, Name)
            Projects = @($projects | Sort-Object ProgramName, Name)
        }
    }
}
