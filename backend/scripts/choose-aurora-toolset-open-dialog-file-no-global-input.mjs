#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const title = required(options.title, "--title");
const filePath = resolve(required(options.file, "--file"));
if (!existsSync(filePath)) throw new Error(`file_missing:${filePath}`);
const sha256 = createHash("sha256").update(readFileSync(filePath)).digest("hex");
if (options.sha256 && sha256 !== String(options.sha256).toLowerCase()) throw new Error(`file_hash_mismatch:${sha256}`);

const ps = String.raw`
$ErrorActionPreference='Stop';Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AFD{public delegate bool E(IntPtr h,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern bool SetWindowText(IntPtr h,string t);[DllImport("user32.dll")]public static extern IntPtr GetDlgItem(IntPtr h,int id);[DllImport("user32.dll")]public static extern IntPtr GetWindow(IntPtr h,uint c);[DllImport("user32.dll")]public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);}
'@
function T($h){$b=[Text.StringBuilder]::new(2048);[void][AFD]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};function C($h){$b=[Text.StringBuilder]::new(128);[void][AFD]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
$proc=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($proc.Count-ne1){throw "expected_one_toolset:$($proc.Count)"};[uint32]$pid=$proc[0].Id;$script:d=@();[void][AFD]::EnumWindows([AFD+E]{param($h,$l);[uint32]$p=0;[void][AFD]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[AFD]::IsWindowVisible($h)-and(C $h)-eq'#32770'-and(T $h)-eq$env:TITLE){$script:d+=$h};$true},[IntPtr]::Zero);if($script:d.Count-ne1){throw "exact_file_dialog_missing:$($script:d.Count)"};$dialog=$script:d[0]
$comboEx=[AFD]::GetDlgItem($dialog,1148);if($comboEx-eq[IntPtr]::Zero-or(C $comboEx)-ne'ComboBoxEx32'){throw 'filename_combo_missing'};$combo=[AFD]::GetWindow($comboEx,5);$edit=if($combo-ne[IntPtr]::Zero){[AFD]::GetWindow($combo,5)}else{[IntPtr]::Zero};if($edit-eq[IntPtr]::Zero-or(C $edit)-ne'Edit'){throw 'filename_edit_missing'}
if(-not[AFD]::SetWindowText($edit,$env:FILE)){throw 'filename_set_failed'};$readback=T $edit;if($readback-ne$env:FILE){throw "filename_readback_mismatch:$readback"};$open=[AFD]::GetDlgItem($dialog,1);if($open-eq[IntPtr]::Zero-or(C $open)-ne'Button'){throw 'open_button_missing'};if(-not[AFD]::PostMessage($open,0x00F5,[IntPtr]::Zero,[IntPtr]::Zero)){throw 'open_button_post_failed'};Start-Sleep -Milliseconds 1200
$script:v=@();[void][AFD]::EnumWindows([AFD+E]{param($h,$l);[uint32]$p=0;[void][AFD]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[AFD]::IsWindowVisible($h)){$script:v+=[pscustomobject]@{hwnd=$h.ToInt64();className=(C $h);text=(T $h)}};$true},[IntPtr]::Zero)
[pscustomobject]@{ok=$true;processId=$pid;dialogHwnd=$dialog.ToInt64();title=$env:TITLE;file=$env:FILE;filenameEditHwnd=$edit.ToInt64();openButtonHwnd=$open.ToInt64();visibleAfter=$script:v;safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='exact common-dialog controls plus WM_SETTEXT readback and asynchronous targeted BM_CLICK'}}|ConvertTo-Json -Depth 6 -Compress
`;
const raw = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps], {
  encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024,
  env: { ...process.env, TITLE: title, FILE: filePath },
}).trim();
const result = JSON.parse(raw);
result.fileSha256 = sha256;
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

function parseArgs(args){const out={};for(let i=0;i<args.length;i+=2){if(!args[i]?.startsWith("--")||args[i+1]==null)throw new Error(`invalid_argument:${args[i]??"end"}`);out[args[i].slice(2)]=args[i+1];}return out;}
function required(value,name){const text=String(value??"").trim();if(!text)throw new Error(`${name} is required`);return text;}
