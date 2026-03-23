param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$ConfigPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "readme.config.json"),
    [string]$OutputPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "README.md")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-Config {
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

    $empty = $Width - $filled
    return "[" + (Get-RepeatString -Character '#' -Count $filled) + (Get-RepeatString -Character '-' -Count $empty) + "]"
}

function Format-Percent {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Completed,
        [Parameter(Mandatory = $true)]
        [int]$Total
    )

    if ($Total -le 0) {
        return "0%"
    }

    $value = [int][Math]::Round(($Completed / [double]$Total) * 100, 0, [System.MidpointRounding]::AwayFromZero)
    return "$value%"
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

function New-Badge {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Label,
        [Parameter(Mandatory = $true)]
        [string]$Value,
        [Parameter(Mandatory = $true)]
        [string]$Color
    )

    $escapedLabel = [System.Uri]::EscapeDataString($Label)
    $escapedValue = [System.Uri]::EscapeDataString($Value)
    return "![${Label}](https://img.shields.io/badge/$escapedLabel-$escapedValue-${Color}?style=for-the-badge&labelColor=1f2937)"
}

function Escape-MarkdownCell {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text
    )

    return $Text.Replace("|", "\|")
}

function Get-ProgramDirectories {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BasePath
    )

    $excluded = @(".git", "scripts")

    return Get-ChildItem -LiteralPath $BasePath -Directory |
        Where-Object {
            $_.Name -notin $excluded -and
            $_.Name -notlike ".*" -and
            (Get-ChildItem -LiteralPath $_.FullName -Directory | Measure-Object).Count -gt 0
        } |
        Sort-Object Name
}

function Get-CourseInfos {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProgramPath
    )

    $courseRoots = Get-ChildItem -LiteralPath $ProgramPath -Directory | Sort-Object Name
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
            $childDirs = @(Get-ChildItem -LiteralPath $effectiveDirectory.FullName -Directory)
            $directFiles = @(Get-ChildItem -LiteralPath $effectiveDirectory.FullName -File)

            if ($directFiles.Count -eq 0 -and $childDirs.Count -eq 1) {
                $effectiveDirectory = $childDirs[0]
                $displayParts.Add($effectiveDirectory.Name)
                continue
            }

            break
        }

        $allFiles = @(Get-ChildItem -LiteralPath $courseRoot.FullName -File -Recurse)
        $certificateFiles = @($allFiles | Where-Object { $_.Name -like "Coursera*.pdf" })
        $workFiles = @($allFiles | Where-Object { $_.Name -notlike "Coursera*.pdf" })

        if ($certificateFiles.Count -gt 0) {
            $status = "Completato"
        }
        elseif ($workFiles.Count -gt 0) {
            $status = "In corso"
        }
        else {
            $status = "Cartella pronta"
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
                $remaining = $workFiles.Count - 3
                $materialPreview += " + $remaining altri"
            }
        }

        [PSCustomObject]@{
            Name = ($displayParts -join "/")
            Status = $status
            StatusRank = $statusRank[$status]
            CertificateCount = $certificateFiles.Count
            WorkFileCount = $workFiles.Count
            Evidence = ($evidenceParts -join " + ")
            MaterialPreview = $materialPreview
        }
    }

    return $courses | Sort-Object StatusRank, Name
}

function Add-Bullets {
    param(
        [Parameter(Mandatory = $true)]
        $Lines,
        [Parameter(Mandatory = $true)]
        [object[]]$Items
    )

    foreach ($item in $Items) {
        $Lines.Add("- $item")
    }
}

$config = Get-Config -Path $ConfigPath
$programDirectories = @(Get-ProgramDirectories -BasePath $Root)

$programs = foreach ($programDirectory in $programDirectories) {
    $courses = @(Get-CourseInfos -ProgramPath $programDirectory.FullName)
    $completed = @($courses | Where-Object { $_.Status -eq "Completato" }).Count
    $inProgress = @($courses | Where-Object { $_.Status -eq "In corso" }).Count
    $ready = @($courses | Where-Object { $_.Status -eq "Cartella pronta" }).Count
    $workFiles = ($courses | Measure-Object -Property WorkFileCount -Sum).Sum
    if ($null -eq $workFiles) {
        $workFiles = 0
    }

    [PSCustomObject]@{
        Name = $programDirectory.Name
        Courses = $courses
        TotalCourses = $courses.Count
        CompletedCourses = $completed
        InProgressCourses = $inProgress
        ReadyCourses = $ready
        WorkFiles = [int]$workFiles
    }
}

$totalPrograms = $programs.Count
$totalCourses = ($programs | Measure-Object -Property TotalCourses -Sum).Sum
$totalCompleted = ($programs | Measure-Object -Property CompletedCourses -Sum).Sum
$totalInProgress = ($programs | Measure-Object -Property InProgressCourses -Sum).Sum
$totalReady = ($programs | Measure-Object -Property ReadyCourses -Sum).Sum
$totalWorkFiles = ($programs | Measure-Object -Property WorkFiles -Sum).Sum

foreach ($totalVariable in @("totalCourses", "totalCompleted", "totalInProgress", "totalReady", "totalWorkFiles")) {
    if ($null -eq (Get-Variable -Name $totalVariable -ValueOnly)) {
        Set-Variable -Name $totalVariable -Value 0
    }
}

$lastUpdated = Get-Date -Format "yyyy-MM-dd HH:mm"
$overallPercent = Format-Percent -Completed $totalCompleted -Total $totalCourses
$overallProgress = New-ProgressBar -Completed $totalCompleted -Total $totalCourses

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("<!-- File generated automatically by scripts/generate-readme.ps1. -->")
$lines.Add("# $($config.title)")
$lines.Add("")
$lines.Add((New-Badge -Label "Percorsi" -Value "$totalPrograms" -Color "0b7285"))
$lines.Add((New-Badge -Label "Corsi" -Value "$totalCourses" -Color "1c7ed6"))
$lines.Add((New-Badge -Label "Completati" -Value "$totalCompleted" -Color "2b8a3e"))
$lines.Add((New-Badge -Label "In corso" -Value "$totalInProgress" -Color "f08c00"))
$lines.Add((New-Badge -Label "Pronti" -Value "$totalReady" -Color "868e96"))
$lines.Add("")
$lines.Add("$($config.intro)")
$lines.Add("")
$lines.Add("## Snapshot")
$lines.Add("")
$lines.Add("- Ultimo aggiornamento: $lastUpdated")
$lines.Add("- Avanzamento complessivo: $totalCompleted/$totalCourses completati ($overallPercent) $overallProgress")
$lines.Add("- Elaborati pratici rilevati: $totalWorkFiles")
$lines.Add("")
$lines.Add("## Profilo")
$lines.Add("")
Add-Bullets -Lines $lines -Items @($config.profileHighlights)
$lines.Add("")
$lines.Add("## Competenze")
$lines.Add("")

foreach ($section in $config.skillSections) {
    $lines.Add("### $($section.title)")
    $lines.Add("")
    Add-Bullets -Lines $lines -Items @($section.items)
    $lines.Add("")
}

$lines.Add("## Percorsi")
$lines.Add("")

foreach ($program in $programs) {
    $programPercent = Format-Percent -Completed $program.CompletedCourses -Total $program.TotalCourses
    $programBar = New-ProgressBar -Completed $program.CompletedCourses -Total $program.TotalCourses

    $lines.Add("### $($program.Name)")
    $lines.Add("")
    $lines.Add("- Progresso: $($program.CompletedCourses)/$($program.TotalCourses) completati ($programPercent) $programBar")
    $lines.Add("- Stato corsi: $($program.InProgressCourses) in corso, $($program.ReadyCourses) cartelle pronte")
    $lines.Add("")
    $lines.Add("| Corso | Stato | Evidenze |")
    $lines.Add("| --- | --- | --- |")

    foreach ($course in $program.Courses) {
        $lines.Add("| $(Escape-MarkdownCell -Text $course.Name) | **$($course.Status)** | $(Escape-MarkdownCell -Text $course.Evidence) |")
    }

    $lines.Add("")
}

$coursesWithMaterials = foreach ($program in $programs) {
    foreach ($course in $program.Courses | Where-Object { $_.WorkFileCount -gt 0 }) {
        [PSCustomObject]@{
            Program = $program.Name
            Course = $course.Name
            WorkFileCount = $course.WorkFileCount
            Preview = $course.MaterialPreview
        }
    }
}

if (@($coursesWithMaterials).Count -gt 0) {
    $lines.Add("## Elaborati pratici")
    $lines.Add("")
    $lines.Add("| Percorso | Corso | Materiali rilevati |")
    $lines.Add("| --- | --- | --- |")

    foreach ($entry in $coursesWithMaterials | Sort-Object Program, Course) {
        $previewText = "$($entry.WorkFileCount) file"
        if ([string]::IsNullOrWhiteSpace($entry.Preview) -eq $false) {
            $previewText += ": $($entry.Preview)"
        }

        $lines.Add("| $(Escape-MarkdownCell -Text $entry.Program) | $(Escape-MarkdownCell -Text $entry.Course) | $(Escape-MarkdownCell -Text $previewText) |")
    }

    $lines.Add("")
}

$lines.Add("## Obiettivi")
$lines.Add("")
Add-Bullets -Lines $lines -Items @($config.targetRoles)
$lines.Add("")
$lines.Add("## Aggiornamento")
$lines.Add("")
$lines.Add("Rigenera questo file con:")
$lines.Add("")
$lines.Add('```powershell')
$lines.Add('powershell -ExecutionPolicy Bypass -File .\scripts\generate-readme.ps1')
$lines.Add('```')
$lines.Add("")
$lines.Add("Lo stato dei corsi viene dedotto in modo automatico:")
$lines.Add('- `Completato`: presente almeno un certificato Coursera.')
$lines.Add('- `In corso`: presenti file di lavoro ma non il certificato finale.')
$lines.Add('- `Cartella pronta`: esiste la cartella del corso ma non ci sono ancora file.')

Set-Content -LiteralPath $OutputPath -Value ($lines -join [Environment]::NewLine) -Encoding utf8
Write-Host "README generated at $OutputPath"
