# Headless reimplementation of the Ghidra 12.1.3 RestoreTask archive contract.
# Authority: NSA Ghidra tag Ghidra_12.1.3_build, Apache License 2.0:
# https://github.com/NationalSecurityAgency/ghidra/blob/Ghidra_12.1.3_build/Ghidra/Features/Base/src/main/java/ghidra/app/plugin/core/archive/RestoreTask.java

param(
    [Parameter(Mandatory = $true)]
    [string]$ArchivePath,

    [Parameter(Mandatory = $true)]
    [string]$ProjectLocation,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[A-Za-z0-9._-]{1,64}$')]
    [string]$ProjectName
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function ConvertTo-SafeArchiveEntryName {
    param([System.IO.Compression.ZipArchiveEntry]$Entry)

    $name = $Entry.FullName
    $normalizedName = $name.Replace('\', '/')
    if ([string]::IsNullOrWhiteSpace($name) -or $name.Contains([char]0) -or
        $normalizedName.StartsWith('/') -or [System.IO.Path]::IsPathRooted($name) -or
        [System.IO.Path]::IsPathRooted($normalizedName)) {
        throw 'ghidra_project_archive_entry_name_invalid'
    }
    $segments = $normalizedName.TrimEnd('/').Split('/', [System.StringSplitOptions]::RemoveEmptyEntries)
    if ($segments.Count -eq 0 -or $normalizedName.Contains('//')) {
        throw 'ghidra_project_archive_entry_name_invalid'
    }
    foreach ($segment in $segments) {
        if ($segment -eq '.' -or $segment -eq '..' -or
            $segment.IndexOfAny([System.IO.Path]::GetInvalidFileNameChars()) -ge 0) {
            throw 'ghidra_project_archive_entry_name_invalid'
        }
    }
    $unixType = (($Entry.ExternalAttributes -shr 16) -band 0xF000)
    $windowsAttributes = ($Entry.ExternalAttributes -band 0xFFFF)
    if ($unixType -eq 0xA000 -or ($windowsAttributes -band 0x400) -ne 0) {
        throw 'ghidra_project_archive_link_forbidden'
    }
    return $normalizedName
}

$archiveFullPath = [System.IO.Path]::GetFullPath($ArchivePath)
$locationFullPath = [System.IO.Path]::GetFullPath($ProjectLocation)
if (-not [System.IO.File]::Exists($archiveFullPath)) {
    throw 'ghidra_project_archive_missing'
}

[System.IO.Directory]::CreateDirectory($locationFullPath) | Out-Null
$projectDirectory = [System.IO.Path]::Combine($locationFullPath, "$ProjectName.rep")
$projectMarker = [System.IO.Path]::Combine($locationFullPath, "$ProjectName.gpr")
if ([System.IO.Directory]::Exists($projectDirectory) -or [System.IO.File]::Exists($projectMarker)) {
    throw 'ghidra_project_restore_target_exists'
}

$skipRootNames = [System.Collections.Generic.HashSet[string]]::new(
    [string[]]@('jar_format', 'project.prp', 'projectstate', 'save', 'groups'),
    [System.StringComparer]::OrdinalIgnoreCase
)
$archive = [System.IO.Compression.ZipFile]::OpenRead($archiveFullPath)
try {
    $archiveEntryCount = $archive.Entries.Count
    if ($archive.Entries.Count -gt 100000) {
        throw 'ghidra_project_archive_entry_budget_exceeded'
    }
    $uncompressedBytes = [int64]0
    $validatedEntries = [System.Collections.Generic.List[object]]::new()
    foreach ($entry in $archive.Entries) {
        $uncompressedBytes += [int64]$entry.Length
        if ($uncompressedBytes -gt 4294967296) {
            throw 'ghidra_project_archive_byte_budget_exceeded'
        }
        $validatedEntries.Add([pscustomobject]@{
            Entry = $entry
            NormalizedName = ConvertTo-SafeArchiveEntryName -Entry $entry
        })
    }
    $marker = $validatedEntries | Where-Object { $_.NormalizedName -ceq 'JAR_FORMAT' } | Select-Object -First 1
    if ($null -eq $marker) {
        throw 'ghidra_project_archive_marker_missing'
    }

    [System.IO.Directory]::CreateDirectory($projectDirectory) | Out-Null
    $projectPrefix = $projectDirectory.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
    foreach ($validatedEntry in $validatedEntries) {
        $entry = $validatedEntry.Entry
        $normalizedName = $validatedEntry.NormalizedName
        $segments = $normalizedName.TrimEnd('/').Split('/', [System.StringSplitOptions]::RemoveEmptyEntries)
        if ($segments.Count -eq 0) {
            continue
        }
        $rootName = $segments[0]
        $leafName = $segments[$segments.Count - 1]
        if ($skipRootNames.Contains($rootName) -or
            $leafName.Equals('.properties', [System.StringComparison]::OrdinalIgnoreCase) -or
            [System.IO.Path]::GetExtension($leafName).Equals('.gpr', [System.StringComparison]::OrdinalIgnoreCase)) {
            continue
        }
        $destination = [System.IO.Path]::GetFullPath(
            [System.IO.Path]::Combine($projectDirectory, [System.IO.Path]::Combine($segments))
        )
        if (-not $destination.StartsWith($projectPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw 'ghidra_project_archive_entry_outside_target'
        }
        if ($normalizedName.EndsWith('/')) {
            [System.IO.Directory]::CreateDirectory($destination) | Out-Null
            continue
        }
        [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($destination)) | Out-Null
        if ([System.IO.File]::Exists($destination)) {
            throw 'ghidra_project_archive_duplicate_destination'
        }
        [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $destination, $false)
    }
    $markerStream = [System.IO.File]::Open($projectMarker, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    $markerStream.Dispose()
}
finally {
    $archive.Dispose()
}

[ordered]@{
    schema = 'aurora-ghidra-project-archive-restore-result/v1'
    ok = $true
    status = 'restored'
    projectName = $ProjectName
    archiveEntryCount = $archiveEntryCount
    uncompressedBytes = $uncompressedBytes
} | ConvertTo-Json -Compress
