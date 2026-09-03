#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const modulePath = resolve(required(options.modulePath, "--modulePath"));
if (!existsSync(modulePath)) throw new Error(`Module does not exist: ${modulePath}`);
const moduleName = basename(modulePath, ".mod");
const timeoutMs = integer(options.timeoutMs ?? "180000", "--timeoutMs");
const expectedDialogHwnd = integer(options.expectedDialogHwnd, "--expectedDialogHwnd");
const expectedFrameHwnd = integer(options.expectedFrameHwnd, "--expectedFrameHwnd");
const repositionToFrameMonitor = boolean(options.repositionToFrameMonitor ?? "false", "--repositionToFrameMonitor");
const expectedMonitor = options.expectedMonitor ?? "\\\\.\\DISPLAY1";

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AOMD {
  public delegate bool E(IntPtr h,IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct R { public int Left,Top,Right,Bottom; }
  [DllImport("user32.dll")] public static extern bool EnumWindows(E c,IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,string l);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out R r);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h,IntPtr z,int x,int y,int w,int ht,uint flags);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][AOMD]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][AOMD]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Rect([IntPtr]$h){$r=New-Object 'AOMD+R';if(-not[AOMD]::GetWindowRect($h,[ref]$r)){throw 'window_rect_failed'};[pscustomobject]@{left=$r.Left;top=$r.Top;right=$r.Right;bottom=$r.Bottom;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top}}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if($ps.Count-ne1-or-not$ps[0].Responding){throw 'expected_one_responding_toolset'}
[uint32]$pid=$ps[0].Id
$script:d=@();$script:f=@()
[void][AOMD]::EnumWindows([AOMD+E]{param($h,$l);[uint32]$p=0;[void][AOMD]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[AOMD]::IsWindowVisible($h)){if((C $h)-eq'TdlgModuleSelect'-and(T $h)-eq'Open'){$script:d+=$h};if((C $h)-eq'TfrmFrame'){$script:f+=$h}};$true},[IntPtr]::Zero)
if($script:d.Count-ne1-or$script:f.Count-ne1){throw "expected_open_dialog_and_frame:$($script:d.Count):$($script:f.Count)"}
$dialog=$script:d[0];$frame=$script:f[0]
if($dialog.ToInt64()-ne[int64]$env:EXPECTED_DIALOG_HWND-or$frame.ToInt64()-ne[int64]$env:EXPECTED_FRAME_HWND){throw 'open_dialog_or_frame_hwnd_drift'}
if((T $frame).EndsWith('*')){throw 'current_module_dirty'}
$frameScreen=[Windows.Forms.Screen]::FromHandle($frame)
if($frameScreen.Primary-or$frameScreen.DeviceName-ne$env:EXPECTED_MONITOR){throw "frame_not_on_expected_proof_monitor:$($frameScreen.DeviceName)"}
$dialogBefore=Rect $dialog
$dialogScreenBefore=[Windows.Forms.Screen]::FromHandle($dialog)
$repositioned=$false
if($dialogScreenBefore.Primary-or$dialogScreenBefore.DeviceName-ne$env:EXPECTED_MONITOR){
  if($env:REPOSITION-ne'1'){throw "open_dialog_not_on_expected_monitor:$($dialogScreenBefore.DeviceName)"}
  $working=$frameScreen.WorkingArea
  $x=$working.Left+[Math]::Max(0,[int](($working.Width-$dialogBefore.width)/2))
  $y=$working.Top+[Math]::Max(0,[int](($working.Height-$dialogBefore.height)/2))
  if(-not[AOMD]::SetWindowPos($dialog,[IntPtr]::Zero,$x,$y,0,0,0x0015)){throw 'open_dialog_reposition_failed'}
  Start-Sleep -Milliseconds 150
  $repositioned=$true
}
$dialogAfter=Rect $dialog
$dialogScreenAfter=[Windows.Forms.Screen]::FromHandle($dialog)
if($dialogScreenAfter.Primary-or$dialogScreenAfter.DeviceName-ne$env:EXPECTED_MONITOR){throw "open_dialog_monitor_readback_mismatch:$($dialogScreenAfter.DeviceName)"}
$script:e=@();$script:b=@()
[void][AOMD]::EnumChildWindows($dialog,[AOMD+E]{param($h,$l);if([AOMD]::IsWindowVisible($h)){if((C $h)-eq'TEdit'){$script:e+=$h};if((C $h)-eq'TButton'-and(T $h)-eq'Open'){$script:b+=$h}};$true},[IntPtr]::Zero)
if($script:e.Count-ne1-or$script:b.Count-ne1){throw "expected_edit_and_open_button:$($script:e.Count):$($script:b.Count)"}
[void][AOMD]::SendMessage($script:e[0],0x000C,[IntPtr]::Zero,$env:MODULE)
Start-Sleep -Milliseconds 250
$readback=T $script:e[0]
if(-not[AOMD]::PostMessage($script:b[0],0x00F5,[IntPtr]::Zero,[IntPtr]::Zero)){throw 'open_button_post_failed'}
$deadline=[DateTime]::UtcNow.AddMilliseconds([int]$env:TIMEOUT);$title=''
do{Start-Sleep -Milliseconds 500;$title=T $frame;$dialogVisible=[AOMD]::IsWindowVisible($dialog)}while([DateTime]::UtcNow-lt$deadline-and($dialogVisible-or-not$title.TrimEnd('*').EndsWith(" - $($env:MODULE).mod",[StringComparison]::OrdinalIgnoreCase)))
if($dialogVisible){throw 'open_dialog_still_visible'}
if(-not$title.TrimEnd('*').EndsWith(" - $($env:MODULE).mod",[StringComparison]::OrdinalIgnoreCase)){throw "target_module_not_loaded:$title"}
[pscustomobject]@{
  ok=$true;processId=$pid;frameHwnd=$frame.ToInt64();dialogHwnd=$dialog.ToInt64();moduleName=$env:MODULE;
  editReadback=$readback;editReadbackUnavailable=($readback-ne$env:MODULE);titleAfter=$title;
  monitor=[pscustomobject]@{expected=$env:EXPECTED_MONITOR;frame=$frameScreen.DeviceName;dialogBefore=$dialogScreenBefore.DeviceName;dialogAfter=$dialogScreenAfter.DeviceName;primaryAfter=$dialogScreenAfter.Primary};
  placement=[pscustomobject]@{repositioned=$repositioned;before=$dialogBefore;after=$dialogAfter};
  safety=[pscustomobject]@{usesGlobalInput=$false;usesGlobalCursor=$false;usesGlobalMouse=$false;usesGlobalKeyboard=$false;usesGlobalMouseWheel=$false;savesModule=$false;changesIniOrMru=$false;changesWindowPlacement=$repositioned;method='exact existing TdlgModuleSelect and frame hwnds; optional SetWindowPos to the verified frame monitor; exact TEdit WM_SETTEXT plus Open BM_CLICK and authoritative frame-title verification'}
}|ConvertTo-Json -Depth 8 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8",
  windowsHide: true,
  timeout: timeoutMs + 30_000,
  env: {
    ...process.env,
    MODULE: moduleName,
    TIMEOUT: String(timeoutMs),
    EXPECTED_DIALOG_HWND: String(expectedDialogHwnd),
    EXPECTED_FRAME_HWND: String(expectedFrameHwnd),
    EXPECTED_MONITOR: expectedMonitor,
    REPOSITION: repositionToFrameMonitor ? "1" : "0",
  },
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value == null || value.startsWith("--")) throw new Error(`Expected --name <value> near ${key ?? "end"}.`);
    out[key.slice(2)] = value;
  }
  return out;
}
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
function integer(value, name) { const parsed = Number(value); if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`); return parsed; }
function boolean(value, name) { if (value === "true") return true; if (value === "false") return false; throw new Error(`${name} must be true or false.`); }
