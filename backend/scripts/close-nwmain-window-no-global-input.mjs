#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { evaluateExactNwmainCloseSnapshot } from "./lib/nwmain-close-or-terminate-contract.mjs";
import { fatalClose } from "./lib/nwmain-fatal-close.mjs";

const CLOSE_TIMEOUT_MS = 15_000;
const STAGE_TWO_GRACE_MS = 2_000;
const FORCE_WAIT_MS = 5_000;
const [command, ...rawArgs] = process.argv.slice(2);
const options = parseArgs(rawArgs);

if (["inspect", "close-fatal-dry-run", "close-fatal"].includes(command)) {
  requireAllowedOptions(options, command === "inspect" ? [] : ["pid", "startedAtUtc", "report", "reportSha256"]);
  if (command !== "inspect") {
    positiveInteger(options.pid, "--pid"); isoTimestamp(options.startedAtUtc, "--startedAtUtc");
    if (!options.report || !/^[a-f0-9]{64}$/.test(options.reportSha256 ?? "")) throw Error("Exact --report and --reportSha256 required");
  }
  print(fatalClose({command,...options}));
} else if (command === "dry-run") {
  requireAllowedOptions(options, []);
  print({
    ok: true,
    command,
    requiredArguments: ["--pid", "--startedAtUtc"],
    timeoutMs: CLOSE_TIMEOUT_MS,
    publicCommands: ["close", "close-or-terminate"],
    fatalDialogCommands: ["inspect", "close-fatal-dry-run", "close-fatal"],
    fatalDialogArguments: ["--pid", "--startedAtUtc", "--report", "--reportSha256"],
    transport: "targeted PostMessage(WM_CLOSE)",
    stageTwoGraceMs: STAGE_TWO_GRACE_MS,
    transportStages: [
      "PostMessage(WM_CLOSE)",
      "PostMessage(WM_SYSCOMMAND/SC_CLOSE) once after grace when the exact PID/start/window is unchanged",
    ],
    maxPostCount: 2,
    sameExactWindowRequiredForStageTwo: true,
    exactNwmainProcessCount: 1,
    exactVisibleOwnedTopWindowCount: 1,
    requiresRespondingProcess: true,
    requiresExactStartTime: true,
    rejectsModalOrChangedWindowSet: true,
    waitsForZeroNwmain: true,
    usesGlobalInput: false,
    changesZOrder: false,
    forceTerminates: false,
    closeOrTerminate: {
      forceFallbackAvailable: true,
      requiresRespondingProcess: false,
      forceTerminatesOnFallback: true,
      forceFallbackUsesExactPidOnly: true,
      forceFallbackRequiresExactStartTime: true,
      forceWaitMs: FORCE_WAIT_MS,
    },
    startsNwn: false,
  });
} else if (command === "close") {
  requireAllowedOptions(options, ["pid", "startedAtUtc"]);
  const pid = positiveInteger(options.pid, "--pid");
  const startedAtUtc = isoTimestamp(options.startedAtUtc, "--startedAtUtc");
  print(closeNwmain({ pid, startedAtUtc, allowForceFallback: false }));
} else if (command === "close-or-terminate") {
  requireAllowedOptions(options, ["pid", "startedAtUtc"]);
  const pid = positiveInteger(options.pid, "--pid");
  const startedAtUtc = isoTimestamp(options.startedAtUtc, "--startedAtUtc");
  print(closeNwmain({ pid, startedAtUtc, allowForceFallback: true }));
} else {
  throw new Error("Use: dry-run, close, or close-or-terminate --pid <exact-pid> --startedAtUtc <exact-start-time>.");
}

function closeNwmain({ pid, startedAtUtc, allowForceFallback }) {
  evaluateExactNwmainCloseSnapshot({
    phase: "initial",
    processes: readNwmainProcessSnapshot(),
    expectedPid: pid,
    expectedStartedAtUtc: startedAtUtc,
    allowForceFallback,
  });
  const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class NwmainWindowClose {
  public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);
  public const uint GW_OWNER=4;
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern bool IsWindowEnabled(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr hwnd, uint command);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hwnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hwnd, uint message, IntPtr wParam, IntPtr lParam);
}
'@

$WM_CLOSE=0x0010
$WM_SYSCOMMAND=0x0112
$SC_CLOSE=0xF060
$expectedPid=[int]$env:NWMAIN_CLOSE_PID
$expectedStart=[DateTimeOffset]::Parse($env:NWMAIN_CLOSE_STARTED_AT).UtcDateTime
$timeoutMs=[int]$env:NWMAIN_CLOSE_TIMEOUT_MS
$stageTwoGraceMs=[int]$env:NWMAIN_CLOSE_STAGE_TWO_GRACE_MS
$forceWaitMs=[int]$env:NWMAIN_CLOSE_FORCE_WAIT_MS
$allowForceFallback=$env:NWMAIN_CLOSE_ALLOW_FORCE_FALLBACK-eq'true'

function Read-WindowText([IntPtr]$hwnd){
  $buffer=[Text.StringBuilder]::new(1024)
  [void][NwmainWindowClose]::GetWindowText($hwnd,$buffer,$buffer.Capacity)
  $buffer.ToString()
}

function Read-ClassName([IntPtr]$hwnd){
  $buffer=[Text.StringBuilder]::new(256)
  [void][NwmainWindowClose]::GetClassName($hwnd,$buffer,$buffer.Capacity)
  $buffer.ToString()
}

function Read-OwnedVisibleTopWindows([uint32]$processId){
  $script:closeWindowPid=$processId
  $script:closeWindows=@()
  [void][NwmainWindowClose]::EnumWindows([NwmainWindowClose+EnumWindowsProc]{
    param([IntPtr]$hwnd,[IntPtr]$lParam)
    if(-not[NwmainWindowClose]::IsWindowVisible($hwnd)){return $true}
    [uint32]$ownerPid=0
    [void][NwmainWindowClose]::GetWindowThreadProcessId($hwnd,[ref]$ownerPid)
    if($ownerPid-eq$script:closeWindowPid){
      $script:closeWindows += [pscustomobject]@{
        hwnd=$hwnd.ToInt64()
        processId=$ownerPid
        className=Read-ClassName $hwnd
        title=Read-WindowText $hwnd
        enabled=[NwmainWindowClose]::IsWindowEnabled($hwnd)
        ownerHwnd=[NwmainWindowClose]::GetWindow($hwnd,[NwmainWindowClose]::GW_OWNER).ToInt64()
      }
    }
    return $true
  },[IntPtr]::Zero)
  @($script:closeWindows)
}

$processes=@(Get-Process nwmain -ErrorAction SilentlyContinue)
if($processes.Count-ne1){throw "expected_one_nwmain:$($processes.Count)"}
$process=$processes[0]
if($process.Id-ne$expectedPid){throw "nwmain_pid_mismatch:expected=$expectedPid;actual=$($process.Id)"}
$actualStart=$process.StartTime.ToUniversalTime()
if($actualStart.Ticks-ne$expectedStart.Ticks){throw "nwmain_start_mismatch:expected=$($expectedStart.ToString('o'));actual=$($actualStart.ToString('o'))"}
if(-not$process.Responding){
  if(-not$allowForceFallback){throw 'nwmain_not_responding'}
  $unresponsiveExactProcess=@(Get-Process nwmain -ErrorAction SilentlyContinue)
  if($unresponsiveExactProcess.Count-ne1-or$unresponsiveExactProcess[0].Id-ne$expectedPid){throw "nwmain_force_termination_identity_invalid:count=$($unresponsiveExactProcess.Count)"}
  $unresponsiveStart=$unresponsiveExactProcess[0].StartTime.ToUniversalTime()
  if($unresponsiveStart.Ticks-ne$expectedStart.Ticks){throw "nwmain_force_termination_identity_invalid:start=$($unresponsiveStart.ToString('o'))"}
  Stop-Process -Id $expectedPid -Force
  $unresponsiveDeadline=(Get-Date).AddMilliseconds($forceWaitMs)
  do{
    Start-Sleep -Milliseconds 100
    $unresponsiveRemaining=@(Get-Process nwmain -ErrorAction SilentlyContinue)
    if($unresponsiveRemaining.Count-eq0){break}
    if($unresponsiveRemaining.Count-ne1-or$unresponsiveRemaining[0].Id-ne$expectedPid){throw "nwmain_process_set_changed_after_force:$($unresponsiveRemaining.Count)"}
    if($unresponsiveRemaining[0].StartTime.ToUniversalTime().Ticks-ne$expectedStart.Ticks){throw 'nwmain_start_changed_after_force'}
  }while((Get-Date)-lt$unresponsiveDeadline)
  $unresponsiveAfter=@(Get-Process nwmain -ErrorAction SilentlyContinue)
  if($unresponsiveAfter.Count-ne0){throw "nwmain_force_termination_timeout_remaining_process:$($unresponsiveAfter.Count)"}
  [pscustomobject]@{
    ok=$true
    command='close-or-terminate'
    processId=$expectedPid
    startedAtUtc=$actualStart.ToString('o')
    window=$null
    postedMessages=@()
    gracefulAttempt=[pscustomobject]@{attempted=$false;stages=@();stageTwoPosted=$false;promptOrWindowChangeObserved=$false;timedOut=$false;skippedReason='nwmain_not_responding'}
    transport='exact-process-force-fallback'
    stageTwoGraceMs=$stageTwoGraceMs
    stageTwoPosted=$false
    maxPostCount=2
    sameExactWindowRequiredForStageTwo=$true
    forceFallbackUsed=$true
    forceWaitMs=$forceWaitMs
    elapsedMs=0
    timeoutMs=$timeoutMs
    processCountAfter=0
    safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalMouse=$false;usesGlobalKeyboard=$false;changesZOrder=$false;forceTerminates=$true;method='nonresponding exact PID+StartTime revalidation followed by Stop-Process -Id $expectedPid -Force'}
  }|ConvertTo-Json -Depth 7 -Compress
  exit 0
}

$windows=@(Read-OwnedVisibleTopWindows ([uint32]$process.Id))
if($windows.Count-ne1){throw "expected_one_visible_owned_top_window:$($windows.Count)"}
$target=$windows[0]
$mainHwnd=$process.MainWindowHandle.ToInt64()
if($mainHwnd-eq0-or$target.hwnd-ne$mainHwnd){throw "nwmain_main_window_mismatch:process=$mainHwnd;visible=$($target.hwnd)"}
if(-not$target.enabled-or$target.ownerHwnd-ne0-or$target.className-eq'#32770'){
  throw ('nwmain_modal_detected:'+($target|ConvertTo-Json -Compress))
}

$watch=[Diagnostics.Stopwatch]::StartNew()
$postedMessages=@()
if(-not[NwmainWindowClose]::PostMessage([IntPtr]$target.hwnd,$WM_CLOSE,[IntPtr]::Zero,[IntPtr]::Zero)){
  throw 'nwmain_wm_close_post_failed'
}
$postedMessages += [pscustomobject]@{message='WM_CLOSE';elapsedMs=$watch.ElapsedMilliseconds}
$stageTwoPosted=$false
$promptOrWindowChangeObserved=$false

do{
  Start-Sleep -Milliseconds 100
  $remaining=@(Get-Process nwmain -ErrorAction SilentlyContinue)
  if($remaining.Count-eq0){break}
  if($remaining.Count-ne1-or$remaining[0].Id-ne$expectedPid){throw "nwmain_process_set_changed_during_close:$($remaining.Count)"}
  $remainingStart=$remaining[0].StartTime.ToUniversalTime()
  if($remainingStart.Ticks-ne$expectedStart.Ticks){throw "nwmain_start_changed_during_close:$($remainingStart.ToString('o'))"}
  $visible=@(Read-OwnedVisibleTopWindows ([uint32]$expectedPid))
  $unexpected=@($visible|Where-Object{$_.hwnd-ne$target.hwnd-or$_.ownerHwnd-ne0-or$_.className-eq'#32770'-or-not$_.enabled})
  if($visible.Count-gt1-or$unexpected.Count-gt0){
    if(-not$allowForceFallback){throw ('nwmain_modal_detected:'+($visible|ConvertTo-Json -Compress))}
    $promptOrWindowChangeObserved=$true
  }
  if(-not$stageTwoPosted-and$watch.ElapsedMilliseconds-ge$stageTwoGraceMs-and$visible.Count-eq1-and$unexpected.Count-eq0){
    if($visible[0].hwnd-ne$target.hwnd){throw 'nwmain_stage_two_window_mismatch'}
    if(-not[NwmainWindowClose]::PostMessage([IntPtr]$target.hwnd,$WM_SYSCOMMAND,[IntPtr]$SC_CLOSE,[IntPtr]::Zero)){
      throw 'nwmain_sc_close_post_failed'
    }
    $stageTwoPosted=$true
    $postedMessages += [pscustomobject]@{message='WM_SYSCOMMAND/SC_CLOSE';elapsedMs=$watch.ElapsedMilliseconds}
  }
}while($watch.ElapsedMilliseconds-lt$timeoutMs)
$watch.Stop()

$afterGrace=@(Get-Process nwmain -ErrorAction SilentlyContinue)
$forceFallbackUsed=$false
if($afterGrace.Count-ne0){
  if(-not$allowForceFallback){throw "nwmain_close_timeout_remaining_process:$($afterGrace.Count)"}
  if($afterGrace.Count-ne1){throw "nwmain_force_termination_identity_invalid:count=$($afterGrace.Count)"}
  $forceTarget=$afterGrace[0]
  if($forceTarget.Id-ne$expectedPid){throw "nwmain_force_termination_identity_invalid:expected=$expectedPid;actual=$($forceTarget.Id)"}
  $forceStart=$forceTarget.StartTime.ToUniversalTime()
  if($forceStart.Ticks-ne$expectedStart.Ticks){throw "nwmain_force_termination_identity_invalid:start=$($forceStart.ToString('o'))"}
  $forceFallbackUsed=$true
  Stop-Process -Id $expectedPid -Force
  $forceDeadline=(Get-Date).AddMilliseconds($forceWaitMs)
  do{
    Start-Sleep -Milliseconds 100
    $forceRemaining=@(Get-Process nwmain -ErrorAction SilentlyContinue)
    if($forceRemaining.Count-eq0){break}
    if($forceRemaining.Count-ne1-or$forceRemaining[0].Id-ne$expectedPid){throw "nwmain_process_set_changed_after_force:$($forceRemaining.Count)"}
    $remainingForceStart=$forceRemaining[0].StartTime.ToUniversalTime()
    if($remainingForceStart.Ticks-ne$expectedStart.Ticks){throw "nwmain_start_changed_after_force:$($remainingForceStart.ToString('o'))"}
  }while((Get-Date)-lt$forceDeadline)
}

$after=@(Get-Process nwmain -ErrorAction SilentlyContinue)
if($after.Count-ne0){throw "nwmain_force_termination_timeout_remaining_process:$($after.Count)"}

[pscustomobject]@{
  ok=$true
  command=if($allowForceFallback){'close-or-terminate'}else{'close'}
  processId=$expectedPid
  startedAtUtc=$actualStart.ToString('o')
  window=$target
  postedMessages=$postedMessages
  gracefulAttempt=[pscustomobject]@{
    attempted=$true
    stages=$postedMessages
    stageTwoPosted=$stageTwoPosted
    promptOrWindowChangeObserved=$promptOrWindowChangeObserved
    timedOut=$afterGrace.Count-ne0
  }
  transport='PostMessage'
  stageTwoGraceMs=$stageTwoGraceMs
  stageTwoPosted=$stageTwoPosted
  maxPostCount=2
  sameExactWindowRequiredForStageTwo=$true
  forceFallbackUsed=$forceFallbackUsed
  forceWaitMs=$forceWaitMs
  elapsedMs=$watch.ElapsedMilliseconds
  timeoutMs=$timeoutMs
  processCountAfter=0
  safety=[pscustomobject]@{
    usesGlobalCursor=$false
    usesGlobalMouse=$false
    usesGlobalKeyboard=$false
    changesZOrder=$false
    forceTerminates=$forceFallbackUsed
    method=if($forceFallbackUsed){'targeted asynchronous WM_CLOSE and optional exact-window SC_CLOSE, then exact PID+StartTime revalidation and Stop-Process -Id $expectedPid -Force fallback'}else{'targeted asynchronous WM_CLOSE, then at most one WM_SYSCOMMAND/SC_CLOSE after exact identity/window revalidation, followed by bounded zero-process readback'}
  }
}|ConvertTo-Json -Depth 7 -Compress
`;

  const output = execFileSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    source,
  ], {
    encoding: "utf8",
    windowsHide: true,
    timeout: CLOSE_TIMEOUT_MS + FORCE_WAIT_MS + 10_000,
    maxBuffer: 4 * 1024 * 1024,
    env: {
      ...process.env,
      NWMAIN_CLOSE_PID: String(pid),
      NWMAIN_CLOSE_STARTED_AT: startedAtUtc,
      NWMAIN_CLOSE_TIMEOUT_MS: String(CLOSE_TIMEOUT_MS),
      NWMAIN_CLOSE_STAGE_TWO_GRACE_MS: String(STAGE_TWO_GRACE_MS),
      NWMAIN_CLOSE_FORCE_WAIT_MS: String(FORCE_WAIT_MS),
      NWMAIN_CLOSE_ALLOW_FORCE_FALLBACK: String(allowForceFallback),
    },
  }).trim();
  const result = JSON.parse(output);
  if (result?.ok !== true || result.processCountAfter !== 0) throw new Error("nwmain_close_readback_invalid");
  if (result.command !== (allowForceFallback ? "close-or-terminate" : "close")) throw new Error("nwmain_close_command_readback_invalid");
  if (result.forceFallbackUsed === true && allowForceFallback !== true) throw new Error("nwmain_close_unexpected_force_fallback");
  return result;
}

function readNwmainProcessSnapshot() {
  const source = String.raw`@((Get-Process nwmain -ErrorAction SilentlyContinue)|ForEach-Object{[pscustomobject]@{pid=$_.Id;startedAtUtc=$_.StartTime.ToUniversalTime().ToString('o');responding=$_.Responding}})|ConvertTo-Json -Compress`;
  const output = execFileSync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    source,
  ], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 5_000,
    maxBuffer: 1024 * 1024,
  }).trim();
  if (!output) return [];
  const parsed = JSON.parse(output);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`Expected --name <value> near ${key ?? "end"}.`);
    const name = key.slice(2);
    if (Object.hasOwn(result, name)) throw new Error(`Duplicate option: --${name}.`);
    result[name] = value;
  }
  return result;
}

function requireAllowedOptions(options, allowed) {
  const allow = new Set(allowed);
  for (const name of Object.keys(options)) if (!allow.has(name)) throw new Error(`Unknown option: --${name}.`);
}

function positiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function isoTimestamp(value, name) {
  const text = String(value ?? "").trim();
  if (!text || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(text) || Number.isNaN(Date.parse(text))) {
    throw new Error(`${name} must be an ISO-8601 timestamp with an explicit offset.`);
  }
  return text;
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
