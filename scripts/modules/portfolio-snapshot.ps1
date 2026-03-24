function Get-PortfolioSnapshot {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootPath,
        [Parameter(Mandatory = $true)]
        [string]$ConfigPath,
        [string]$ContentMetadataPath = (Join-Path $RootPath "content-metadata.json")
    )

    $config = Get-PortfolioConfig -Path $ConfigPath
    $contentMetadata = Get-ContentMetadata -Path $ContentMetadataPath
    $programDirectories = @(Get-ProgramDirectories -BasePath $RootPath)

    $programs = foreach ($programDirectory in $programDirectories) {
        $programRelativePath = (Get-RelativePath -BasePath $RootPath -TargetPath $programDirectory.FullName) -replace "\\", "/"
        $programMetadata = Get-MetadataEntry -Map $contentMetadata.ProgramsByPath -Key $programRelativePath
        $programName = Get-MetadataString -Value (Get-ObjectPropertyValue -InputObject $programMetadata -Name "DisplayName") -Default $programDirectory.Name
        $programSummary = Get-MetadataString -Value (Get-ObjectPropertyValue -InputObject $programMetadata -Name "Summary")
        $programTags = Get-MetadataStringList -Values (Get-ObjectPropertyValue -InputObject $programMetadata -Name "Tags")
        $programPriority = Get-MetadataInt -Value (Get-ObjectPropertyValue -InputObject $programMetadata -Name "Priority")
        $courses = @(Get-CourseInfos -RootPath $RootPath -ProgramDirectory $programDirectory -ContentMetadata $contentMetadata)
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
            Name = $programName
            OriginalName = $programDirectory.Name
            Slug = ConvertTo-Slug -Value $programDirectory.Name
            Summary = $programSummary
            Tags = $programTags
            Priority = $programPriority
            RelativePath = $programRelativePath
            WebPath = ConvertTo-WebPath -RelativePath $programRelativePath
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

    $programs = @($programs | Sort-Object Priority, Name)
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
                    DisplayName = $file.DisplayName
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
                    ProgramSummary = $program.Summary
                    ProgramTags = $program.Tags
                    CourseId = $course.Id
                    CourseName = $course.Name
                    CourseStatus = $course.Status
                    CourseSummary = $course.Summary
                    CourseCategory = $course.Category
                    CourseTags = $course.Tags
                    CoursePriority = $course.Priority
                    FeaturedCertificateRank = $file.FeaturedCertificateRank
                    FeaturedProjectRank = $file.FeaturedProjectRank
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
        $courseCategories = @($entries | Select-Object -ExpandProperty CourseCategory -Unique | Where-Object { $_ } | Sort-Object)
        $certificateFeatureRanks = @($entries | Select-Object -ExpandProperty FeaturedCertificateRank | Where-Object { $_ -lt 9999 })
        $displayName = if ($courseNames.Count -eq 1) { $courseNames[0] } else { $courseNames -join " / " }
        $featuredRank = if ($certificateFeatureRanks.Count -gt 0) { ($certificateFeatureRanks | Measure-Object -Minimum).Minimum } else { 9999 }
        $isFeatured = $featuredRank -lt 9999

        foreach ($entry in $entries) {
            Add-Member -InputObject $entry -NotePropertyName "DisplayName" -NotePropertyValue $displayName -Force
            Add-Member -InputObject $entry -NotePropertyName "ProgramIds" -NotePropertyValue $programIds -Force
            Add-Member -InputObject $entry -NotePropertyName "ProgramNames" -NotePropertyValue $programNames -Force
            Add-Member -InputObject $entry -NotePropertyName "CourseIds" -NotePropertyValue $courseIds -Force
            Add-Member -InputObject $entry -NotePropertyName "CourseNames" -NotePropertyValue $courseNames -Force
            Add-Member -InputObject $entry -NotePropertyName "Categories" -NotePropertyValue $courseCategories -Force
            Add-Member -InputObject $entry -NotePropertyName "CertificateOccurrences" -NotePropertyValue $entries.Count -Force
            Add-Member -InputObject $entry -NotePropertyName "Featured" -NotePropertyValue $isFeatured -Force
            Add-Member -InputObject $entry -NotePropertyName "FeaturedRank" -NotePropertyValue $featuredRank -Force
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
            Categories = $primary.Categories
            CertificateOccurrences = $primary.CertificateOccurrences
            Featured = $primary.Featured
            FeaturedRank = $primary.FeaturedRank
        }
    }

    $projects = foreach ($program in $programs) {
        foreach ($course in $program.Courses | Where-Object { $_.WorkFileCount -gt 0 }) {
            [PSCustomObject]@{
                Id = $course.Id
                Name = $course.Name
                OriginalName = $course.OriginalName
                Status = $course.Status
                Summary = $course.Summary
                Category = $course.Category
                Tags = $course.Tags
                Priority = $course.Priority
                Featured = ($course.Featured -or $course.FeaturedProjectRank -lt 9999)
                FeaturedRank = $course.FeaturedProjectRank
                Evidence = $course.Evidence
                MaterialPreview = $course.MaterialPreview
                WorkFileCount = $course.WorkFileCount
                ProgramId = $program.Id
                ProgramName = $program.Name
                ProgramTags = $program.Tags
                Files = @($course.Files | Where-Object { $_.IsCertificate -eq $false })
            }
        }
    }

    $certificates = @($certificates | Sort-Object FeaturedRank, DisplayName, ProgramName, Name)
    $projects = @($projects | Sort-Object FeaturedRank, Priority, ProgramName, Name)
    $featuredCertificates = @($certificates | Where-Object { $_.Featured } | Select-Object -First 4)
    $featuredProjects = @($projects | Where-Object { $_.Featured } | Select-Object -First 4)

    if ($featuredCertificates.Count -eq 0) {
        $featuredCertificates = @($certificates | Select-Object -First 4)
    }

    if ($featuredProjects.Count -eq 0) {
        $featuredProjects = @($projects | Select-Object -First 4)
    }

    $overallPercent = Format-Percent -Completed $totalCompleted -Total $totalCourses
    $generatedAtUtc = (Get-Date).ToUniversalTime()

    return [PSCustomObject]@{
        GeneratedAt = $generatedAtUtc.ToString("o")
        GeneratedAtLocal = (Get-Date).ToString("dd/MM/yyyy")
        Config = $config
        ContentMetadata = [PSCustomObject]@{
            ProgramCount = $contentMetadata.Programs.Count
            CourseCount = $contentMetadata.Courses.Count
            FeaturedCertificateCount = $contentMetadata.FeaturedCertificates.Count
            FeaturedProjectCount = $contentMetadata.FeaturedProjects.Count
        }
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
            Certificates = $certificates
            FeaturedCertificates = $featuredCertificates
            Projects = $projects
            FeaturedProjects = $featuredProjects
        }
    }
}
