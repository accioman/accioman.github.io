param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$ConfigPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "readme.config.json"),
    [string]$OutputPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "README.md")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "portfolio-data.ps1")

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

$snapshot = Get-PortfolioSnapshot -RootPath $Root -ConfigPath $ConfigPath
$config = $snapshot.Config
$stats = $snapshot.Stats
$programs = $snapshot.Programs
$coursesWithMaterials = $snapshot.Library.Projects

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("<!-- File generated automatically by scripts/generate-readme.ps1. -->")
$lines.Add("# $($config.title)")
$lines.Add("")
$lines.Add((New-Badge -Label "Percorsi" -Value "$($stats.TotalPrograms)" -Color "0b7285"))
$lines.Add((New-Badge -Label "Corsi" -Value "$($stats.TotalCourses)" -Color "1c7ed6"))
$lines.Add((New-Badge -Label "Completati" -Value "$($stats.TotalCompleted)" -Color "2b8a3e"))
$lines.Add((New-Badge -Label "In corso" -Value "$($stats.TotalInProgress)" -Color "f08c00"))
$lines.Add((New-Badge -Label "Pronti" -Value "$($stats.TotalReady)" -Color "868e96"))
$lines.Add("")
$lines.Add("$($config.intro)")
$lines.Add("")
$lines.Add("## Snapshot")
$lines.Add("")
$lines.Add("- Ultimo aggiornamento: $($snapshot.GeneratedAtLocal)")
$lines.Add("- Avanzamento complessivo: $($stats.TotalCompleted)/$($stats.TotalCourses) completati ($($stats.CompletionPercent)%) $($stats.ProgressBar)")
$lines.Add("- Elaborati pratici rilevati: $($stats.TotalWorkFiles)")
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
    $lines.Add("### $($program.Name)")
    $lines.Add("")
    $lines.Add("- Progresso: $($program.CompletedCourses)/$($program.TotalCourses) completati ($($program.CompletionPercent)%) $($program.ProgressBar)")
    $lines.Add("- Stato corsi: $($program.InProgressCourses) in corso, $($program.ReadyCourses) cartelle pronte")
    $lines.Add("")
    $lines.Add("| Corso | Stato | Evidenze |")
    $lines.Add("| --- | --- | --- |")

    foreach ($course in $program.Courses) {
        $lines.Add("| $(Escape-MarkdownCell -Text $course.Name) | **$($course.Status)** | $(Escape-MarkdownCell -Text $course.Evidence) |")
    }

    $lines.Add("")
}

if (@($coursesWithMaterials).Count -gt 0) {
    $lines.Add("## Elaborati pratici")
    $lines.Add("")
    $lines.Add("| Percorso | Corso | Materiali rilevati |")
    $lines.Add("| --- | --- | --- |")

    foreach ($entry in $coursesWithMaterials) {
        $previewText = "$($entry.WorkFileCount) file"
        if ([string]::IsNullOrWhiteSpace($entry.MaterialPreview) -eq $false) {
            $previewText += ": $($entry.MaterialPreview)"
        }

        $lines.Add("| $(Escape-MarkdownCell -Text $entry.ProgramName) | $(Escape-MarkdownCell -Text $entry.Name) | $(Escape-MarkdownCell -Text $previewText) |")
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
