#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const BLANK_TITLE_PATTERN = "^BioWare Aurora Neverwinter Nights Toolset v[0-9]+(?:\\.[0-9]+)*(?:-[0-9]+)?$";
const source = String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AuroraBlankFrame{
 public delegate bool E(IntPtr h,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(512);[void][AuroraBlankFrame]::GetWindowText($h,$b,512);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][AuroraBlankFrame]::GetClassName($h,$b,128);$b.ToString()}
$targetProcessId=[int]$env:ABF_PID;$expectedCreatedAtNs=$env:ABF_CREATED_NS;$expectedFrameHwnd=[int64]$env:ABF_FRAME
$processes=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($processes.Count-ne1-or$processes[0].Id-ne$targetProcessId-or-not$processes[0].Responding){throw 'blank_frame_process_identity_mismatch'}
$actualCreatedAtNs=[string](($processes[0].StartTime.ToUniversalTime().Ticks-621355968000000000)*100);if($actualCreatedAtNs-cne$expectedCreatedAtNs){throw 'blank_frame_creation_identity_mismatch'}
$script:tops=@();[void][AuroraBlankFrame]::EnumWindows([AuroraBlankFrame+E]{param($h,$l);[uint32]$owner=0;[void][AuroraBlankFrame]::GetWindowThreadProcessId($h,[ref]$owner);if($owner-eq$targetProcessId-and[AuroraBlankFrame]::IsWindowVisible($h)){$script:tops+=[pscustomobject]@{hwnd=$h.ToInt64();className=C $h;text=T $h}};$true},[IntPtr]::Zero)
$frames=@($script:tops|Where-Object{$_.className-eq'TfrmFrame'});$modals=@($script:tops|Where-Object{$_.className-notin@('TfrmFrame','TApplication')});if($frames.Count-ne1-or$frames[0].hwnd-ne$expectedFrameHwnd-or$modals.Count-ne0){throw 'blank_frame_window_identity_mismatch'}
$title=[string]$frames[0].text;$trimmed=$title.TrimEnd();if($trimmed.Contains('*')-or$trimmed.Contains(' - ')-or$trimmed-notmatch$env:ABF_BLANK_TITLE_PATTERN){throw 'blank_frame_title_invalid'}
$frame=[IntPtr]$expectedFrameHwnd;$screen=[Windows.Forms.Screen]::FromHandle($frame);$script:areaViewers=@();[void][AuroraBlankFrame]::EnumChildWindows($frame,[AuroraBlankFrame+E]{param($h,$l);if((C $h)-eq'TfrmViewerArea'){$script:areaViewers+=$h.ToInt64()};$true},[IntPtr]::Zero);if($script:areaViewers.Count-ne0){throw 'blank_frame_active_area_present'}
[pscustomobject]@{ok=$true;processId=$targetProcessId;createdAtNs=$actualCreatedAtNs;frameHwnd=$expectedFrameHwnd;frameTitle=$trimmed;dirty=$false;modalCount=0;activeAreaViewerCount=0;monitor=[pscustomobject]@{deviceName=$screen.DeviceName;primary=$screen.Primary};safety=[pscustomobject]@{readOnly=$true;usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;windowMessagesSent=$false}}|ConvertTo-Json -Depth 4 -Compress
`;

export function isSupportedBlankFrameTitle(value) {
  return typeof value === "string"
    && !value.includes("*")
    && !value.includes(" - ")
    && new RegExp(BLANK_TITLE_PATTERN, "u").test(value.trimEnd());
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const expectedPid = positiveInteger(options.expectedPid, "--expectedPid");
  const expectedCreatedAtNs = creationIdentity(options.expectedCreatedAtNs);
  const expectedFrameHwnd = positiveInteger(options.expectedFrameHwnd, "--expectedFrameHwnd");
  const value = JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 15_000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, ABF_PID: String(expectedPid), ABF_CREATED_NS: expectedCreatedAtNs, ABF_FRAME: String(expectedFrameHwnd), ABF_BLANK_TITLE_PATTERN: BLANK_TITLE_PATTERN },
    stdio: ["ignore", "pipe", "ignore"],
  }).trim());
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

function parseArgs(argv) { const out = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index], value = argv[index + 1]; if (!key?.startsWith("--") || value == null || value.startsWith("--")) throw new Error("arguments_invalid"); out[key.slice(2)] = value; } return out; }
function positiveInteger(value, name) { if (!/^[1-9][0-9]{0,15}$/u.test(String(value ?? ""))) throw new Error(`${name}_invalid`); const parsed = Number(value); if (!Number.isSafeInteger(parsed)) throw new Error(`${name}_invalid`); return parsed; }
function creationIdentity(value) { if (!/^[1-9][0-9]{0,19}$/u.test(String(value ?? ""))) throw new Error("--expectedCreatedAtNs_invalid"); return String(value); }
