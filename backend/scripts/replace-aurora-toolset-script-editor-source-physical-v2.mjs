#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const at = process.argv.indexOf("--sourceFile");
if (at < 0 || !process.argv[at + 1]) throw new Error("--sourceFile is required.");
const hwndAt = process.argv.indexOf("--dialogHwnd");
if (hwndAt < 0 || !/^\d+$/.test(process.argv[hwndAt + 1] ?? "")) throw new Error("--dialogHwnd is required.");
const dialogHwnd = process.argv[hwndAt + 1];
const body = readFileSync(resolve(process.argv[at + 1]), "utf8").replaceAll("\r\n", "\n");
const encoded = Buffer.from(body, "utf16le").toString("base64");

const ps = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System; using System.Text; using System.Runtime.InteropServices;
public static class U4 {
 public delegate bool E(IntPtr h, IntPtr l);
 [StructLayout(LayoutKind.Sequential)] public struct R { public int Left,Top,Right,Bottom; }
 [StructLayout(LayoutKind.Sequential)] public struct P { public int X,Y; }
 [DllImport("user32.dll")] public static extern bool EnumWindows(E c,IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
 [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a,uint b,bool v);
 [DllImport("user32.dll")] public static extern IntPtr GetFocus();
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out R r);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern IntPtr SetFocus(IntPtr h);
 [DllImport("user32.dll")] public static extern bool GetCursorPos(out P p);
 [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")] public static extern void mouse_event(uint f,uint x,uint y,uint d,UIntPtr e);
 [DllImport("user32.dll")] public static extern void keybd_event(byte v,byte s,uint f,UIntPtr e);
}
'@
function Txt([IntPtr]$h){$b=[Text.StringBuilder]::new(512);[void][U4]::GetWindowText($h,$b,512);$b.ToString()}
function ClassName([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][U4]::GetClassName($h,$b,128);$b.ToString()}
function Key([byte]$v,[bool]$up=$false){[U4]::keybd_event($v,0,($(if($up){2}else{0})),[UIntPtr]::Zero)}
$wanted=[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($env:S04_SOURCE))
$proc=@(Get-Process nwtoolset -ErrorAction Stop); if($proc.Count-ne1){throw 'expected_one_toolset'}
[uint32]$pidValue=$proc[0].Id;$dlg=[IntPtr][int64]$env:S04_DIALOG;[uint32]$dialogPid=0;[void][U4]::GetWindowThreadProcessId($dlg,[ref]$dialogPid)
if(($dialogPid -ne $pidValue) -or (-not [U4]::IsWindowVisible($dlg)) -or ((ClassName $dlg) -ne 'TdlgScriptEditor')){throw ('dialog_identity_mismatch:dialogPid={0}:toolsetPid={1}:visible={2}:class={3}:hwnd={4}' -f $dialogPid,$pidValue,[U4]::IsWindowVisible($dlg),(ClassName $dlg),$dlg.ToInt64())}
$screen=[Windows.Forms.Screen]::FromHandle($dlg);if($screen.Primary){throw 'script_editor_on_primary'}
$script:edits=@();[void][U4]::EnumChildWindows($dlg,[U4+E]{param($h,$l);if([U4]::IsWindowVisible($h) -and ((ClassName $h) -eq 'TSEdit')){$r=New-Object 'U4+R';[void][U4]::GetWindowRect($h,[ref]$r);$script:edits+=[pscustomobject]@{h=$h;r=$r}};$true},[IntPtr]::Zero)
$edits=@($script:edits|Sort-Object{$_.r.Top});if($edits.Count-ne2){throw "expected_two_source_edits:$($edits.Count)"};$edit=$edits[0]
$cursor=New-Object 'U4+P';[void][U4]::GetCursorPos([ref]$cursor);$oldForeground=[U4]::GetForegroundWindow();$oldClipboard=[Windows.Forms.Clipboard]::GetDataObject()
[uint32]$dummy=0;$targetThread=[U4]::GetWindowThreadProcessId($dlg,[ref]$dummy);$currentThread=[U4]::GetCurrentThreadId()
try {
 [Windows.Forms.Clipboard]::SetText($wanted)
 [void][U4]::SetCursorPos($edit.r.Left+240,$edit.r.Top+48);[U4]::mouse_event(2,0,0,0,[UIntPtr]::Zero);[U4]::mouse_event(4,0,0,0,[UIntPtr]::Zero);Start-Sleep -Milliseconds 250
 if(-not[U4]::AttachThreadInput($currentThread,$targetThread,$true)){throw 'attach_failed'}
 [void][U4]::SetForegroundWindow($dlg);[void][U4]::SetFocus($edit.h);if([U4]::GetFocus()-ne$edit.h){throw 'focus_failed'}
 Key 0x11;Key 0x24;Key 0x24 $true;Key 0x11 $true
 Key 0x11;Key 0x10;Key 0x23;Key 0x23 $true;Key 0x10 $true;Key 0x11 $true;Start-Sleep -Milliseconds 100
 Key 0x08;Key 0x08 $true;Start-Sleep -Milliseconds 100
 Key 0x11;Key 0x56;Key 0x56 $true;Key 0x11 $true;Start-Sleep -Milliseconds 700
} finally {
 [void][U4]::AttachThreadInput($currentThread,$targetThread,$false);[void][U4]::SetCursorPos($cursor.X,$cursor.Y)
 if($oldClipboard-ne$null){[Windows.Forms.Clipboard]::SetDataObject($oldClipboard,$true)}
 if($oldForeground-ne[IntPtr]::Zero){[void][U4]::SetForegroundWindow($oldForeground)}
}
[pscustomobject]@{ok=$true;processId=$pidValue;dialogHwnd=$dlg.ToInt64();sourceEditHwnd=$edit.h.ToInt64();requestedLength=$wanted.Length;monitor=$screen.DeviceName;cursorRestored=@{x=$cursor.X;y=$cursor.Y};clipboardRestored=$true;validation='focus-and-physical-replacement-only; native Aurora compile is authoritative because TSEdit exposes only the current logical line to GetWindowText'}|ConvertTo-Json -Depth 5 -Compress
`;

const out = execFileSync("powershell.exe", ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-Command", ps], {
  encoding: "utf8", windowsHide: true, timeout: 30_000,
  env: { ...process.env, S04_SOURCE: encoded, S04_DIALOG: dialogHwnd },
});
console.log(JSON.stringify(JSON.parse(out.trim()), null, 2));
