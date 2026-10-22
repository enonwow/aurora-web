$script:AuroraToolsetActionJournalDirectory = $null
$script:AuroraToolsetActionJournalSequence = 0
$script:AuroraToolsetActionJournalKinds = @(
  'toolset_start',
  'recovery_yes',
  'welcome_open_existing',
  'blank_open_dialog',
  'module_selection'
)
$script:AuroraToolsetActionJournalPhases = @('intent', 'submitted')

function Initialize-AuroraToolsetActionJournal {
  param([Parameter(Mandatory = $true)][string]$Directory)
  $resolved = [IO.Path]::GetFullPath($Directory)
  $item = Get-Item -LiteralPath $resolved -Force -ErrorAction Stop
  if (-not $item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw 'aurora_action_journal_directory_invalid'
  }
  if (@(Get-ChildItem -LiteralPath $resolved -Force -ErrorAction Stop).Count -ne 0) {
    throw 'aurora_action_journal_directory_not_empty'
  }
  $script:AuroraToolsetActionJournalDirectory = $resolved
  $script:AuroraToolsetActionJournalSequence = 0
}

function Write-AuroraToolsetActionJournalEvent {
  param(
    [Parameter(Mandatory = $true)][string]$Kind,
    [Parameter(Mandatory = $true)][string]$Phase,
    [Parameter(Mandatory = $true)]$Details
  )
  if ([string]::IsNullOrWhiteSpace($script:AuroraToolsetActionJournalDirectory)) {
    throw 'aurora_action_journal_not_initialized'
  }
  if ($Kind -cnotin $script:AuroraToolsetActionJournalKinds -or $Phase -cnotin $script:AuroraToolsetActionJournalPhases) {
    throw 'aurora_action_journal_event_invalid'
  }
  $script:AuroraToolsetActionJournalSequence += 1
  $event = [ordered]@{
    version = 'aurora-toolset-module-open-action-event/v1'
    sequence = $script:AuroraToolsetActionJournalSequence
    kind = $Kind
    phase = $Phase
    at = (Get-Date).ToUniversalTime().ToString('o')
    ownerProcessId = $PID
    details = $Details
  }
  $json = $event | ConvertTo-Json -Depth 8 -Compress
  $bytes = [Text.UTF8Encoding]::new($false).GetBytes($json)
  if ($bytes.Length -gt 16384) { throw 'aurora_action_journal_event_too_large' }
  $name = ('{0:D4}-{1}-{2}.json' -f $script:AuroraToolsetActionJournalSequence,$Kind,$Phase)
  $path = Join-Path $script:AuroraToolsetActionJournalDirectory $name
  $stream = [IO.FileStream]::new($path,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
  try {
    $stream.Write($bytes,0,$bytes.Length)
    $stream.Flush($true)
  } finally {
    $stream.Dispose()
  }
  return $path
}
