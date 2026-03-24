function Get-ProgramDirectories {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BasePath
    )

    $excluded = @(".git", ".github", ".site", "docs", "scripts", "site")

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
}

function Get-CourseInfos {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RootPath,
        [Parameter(Mandatory = $true)]
        [System.IO.DirectoryInfo]$ProgramDirectory,
        [Parameter(Mandatory = $true)]
        [psobject]$ContentMetadata
    )

    $courseRoots = Get-ChildItem -LiteralPath $ProgramDirectory.FullName -Directory | Sort-Object Name
    $statusRank = @{
        "Completato" = 0
        "In corso" = 1
        "Cartella pronta" = 2
    }
    $programRelativePath = (Get-RelativePath -BasePath $RootPath -TargetPath $ProgramDirectory.FullName) -replace "\\", "/"

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

        $courseRelativePath = (Get-RelativePath -BasePath $RootPath -TargetPath $courseRoot.FullName) -replace "\\", "/"
        $courseMetadata = Get-MetadataEntry -Map $ContentMetadata.CoursesByPath -Key $courseRelativePath
        $displayName = Get-MetadataString -Value (Get-ObjectPropertyValue -InputObject $courseMetadata -Name "DisplayName") -Default ($displayParts -join " / ")
        $courseSummary = Get-MetadataString -Value (Get-ObjectPropertyValue -InputObject $courseMetadata -Name "Summary")
        $courseCategory = Get-MetadataString -Value (Get-ObjectPropertyValue -InputObject $courseMetadata -Name "Category")
        $courseTags = Get-MetadataStringList -Values (Get-ObjectPropertyValue -InputObject $courseMetadata -Name "Tags")
        $coursePriority = Get-MetadataInt -Value (Get-ObjectPropertyValue -InputObject $courseMetadata -Name "Priority")
        $courseFeatured = Get-MetadataBool -Value (Get-ObjectPropertyValue -InputObject $courseMetadata -Name "Featured")
        $featuredCertificateRank = Get-MetadataRank -Map $ContentMetadata.FeaturedCertificateRanks -Key $courseRelativePath
        $featuredProjectRank = Get-MetadataRank -Map $ContentMetadata.FeaturedProjectRanks -Key $courseRelativePath
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
                DisplayName = $(if ($isCertificate) { $displayName } else { $file.Name })
                ProgramRelativePath = $programRelativePath
                CourseCategory = $courseCategory
                CourseSummary = $courseSummary
                CourseTags = $courseTags
                CoursePriority = $coursePriority
                FeaturedCertificateRank = $featuredCertificateRank
                FeaturedProjectRank = $featuredProjectRank
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

        [PSCustomObject]@{
            Id = ConvertTo-Slug -Value $courseRelativePath
            Name = $displayName
            OriginalName = $displayParts -join " / "
            Slug = ConvertTo-Slug -Value $displayName
            RelativePath = $courseRelativePath
            WebPath = ConvertTo-WebPath -RelativePath $courseRelativePath
            Status = $status
            StatusRank = $statusRank[$status]
            Summary = $courseSummary
            Category = $courseCategory
            Tags = $courseTags
            Priority = $coursePriority
            Featured = $courseFeatured
            FeaturedCertificateRank = $featuredCertificateRank
            FeaturedProjectRank = $featuredProjectRank
            CertificateCount = $certificateFiles.Count
            WorkFileCount = $workFiles.Count
            TotalFiles = $allFiles.Count
            Evidence = $evidenceParts -join " + "
            MaterialPreview = $materialPreview
            Files = $fileEntries
        }
    }

    return $courses | Sort-Object Priority, StatusRank, Name
}
