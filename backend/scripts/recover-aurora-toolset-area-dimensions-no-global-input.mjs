#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const options = parseArgs(process.argv.slice(2));
const moduleName = required(options.module, "--module");
const area = required(options.area, "--area").toLowerCase();
const before = integer(options.before, "--before");
const restore = integer(options.restore, "--restore");
const here = dirname(fileURLToPath(import.meta.url));

const probe = JSON.parse(execFileSync(process.execPath, [
  resolve(here, "probe-aurora-toolset-viewer-method-table-no-global-input.mjs"),
  "--module", moduleName,
  "--area", area,
], { encoding: "utf8", windowsHide: true, timeout: 45_000, maxBuffer: 8 * 1024 * 1024 }).trim());

if (probe?.ok !== true || probe.area !== area) throw new Error("exact_viewer_probe_failed");
if (probe.binary?.sha256 !== "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24") {
  throw new Error("toolset_binary_hash_mismatch");
}

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class ARD { public delegate bool E(IntPtr h,IntPtr l); [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);[DllImport("kernel32.dll",SetLastError=true)]public static extern IntPtr OpenProcess(uint a,bool i,uint p);[DllImport("kernel32.dll",SetLastError=true)]public static extern bool ReadProcessMemory(IntPtr p,IntPtr a,byte[] b,UIntPtr n,out UIntPtr r);[DllImport("kernel32.dll",SetLastError=true)]public static extern bool WriteProcessMemory(IntPtr p,IntPtr a,byte[] b,UIntPtr n,out UIntPtr w);[DllImport("kernel32.dll")]public static extern bool CloseHandle(IntPtr h); }
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(512);[void][ARD]::GetWindowText($h,$b,512);$b.ToString()};function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][ARD]::GetClassName($h,$b,128);$b.ToString()};function Read([IntPtr]$p,[IntPtr]$a,[int]$n){$b=New-Object byte[] $n;[UIntPtr]$r=[UIntPtr]::Zero;if(-not[ARD]::ReadProcessMemory($p,$a,$b,[UIntPtr]::new($n),[ref]$r)-or$r.ToUInt64()-ne[uint64]$n){throw 'remote_read_failed'};$b}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1-or-not$ps[0].Responding){throw 'expected_one_responding_toolset'};[uint32]$pid=$ps[0].Id;$script:frames=@();[void][ARD]::EnumWindows([ARD+E]{param($h,$l);[uint32]$p=0;[void][ARD]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[ARD]::IsWindowVisible($h)-and(C $h)-eq'TfrmFrame'-and(T $h).TrimEnd('*').EndsWith(" - $env:M",[StringComparison]::OrdinalIgnoreCase)){$script:frames+=$h};$true},[IntPtr]::Zero);if($script:frames.Count-ne1){throw 'exact_frame_missing'};$script:viewers=@();[void][ARD]::EnumChildWindows($script:frames[0],[ARD+E]{param($h,$l);$text=(T $h).Trim().TrimStart('-').Trim().ToLowerInvariant();if([ARD]::IsWindowVisible($h)-and(C $h)-eq'TfrmViewerArea'){$script:viewers+=[pscustomobject]@{hwnd=$h;text=$text}};$true},[IntPtr]::Zero);if($script:viewers.Count-ne1-or$script:viewers[0].text-ne$env:A){throw ('exact_active_viewer_missing:'+($script:viewers|ConvertTo-Json -Compress))};if($script:viewers[0].hwnd.ToInt64()-ne[int64]$env:HWND){throw 'viewer_hwnd_changed'}
$object=[Convert]::ToUInt32($env:OBJECT.Substring(2),16);$proc=[ARD]::OpenProcess(0x438,$false,$pid);if($proc-eq[IntPtr]::Zero){throw 'open_process_failed'};try{$areaPointer=[BitConverter]::ToUInt32((Read $proc ([IntPtr]([int64]$object+0x5A4)) 4),0);$address=[IntPtr]([int64]$areaPointer+0xA8);$old=Read $proc $address 2;if($old[0]-ne[int]$env:BEFORE-or$old[1]-ne[int]$env:BEFORE){throw "unexpected_live_dimensions:$($old[0]):$($old[1])"};$replacement=[byte[]]@([byte][int]$env:RESTORE,[byte][int]$env:RESTORE);[UIntPtr]$written=[UIntPtr]::Zero;if(-not[ARD]::WriteProcessMemory($proc,$address,$replacement,[UIntPtr]::new(2),[ref]$written)-or$written.ToUInt64()-ne2){throw 'remote_write_failed'};$after=Read $proc $address 2;if($after[0]-ne[int]$env:RESTORE-or$after[1]-ne[int]$env:RESTORE){throw 'restore_readback_mismatch'}}finally{[void][ARD]::CloseHandle($proc)}
[pscustomobject]@{ok=$true;processId=$pid;module=$env:M;area=$env:A;viewerHwnd=$script:viewers[0].hwnd.ToInt64();viewerObject=$env:OBJECT;areaPointer=('0x{0:X}'-f$areaPointer);before=[pscustomobject]@{rows=$old[0];columns=$old[1]};after=[pscustomobject]@{rows=$after[0];columns=$after[1]};safety=[pscustomobject]@{globalCursor=$false;globalKeyboard=$false;globalMouse=$false;syntheticFocus=$false;processMemoryWrites=$true;recoveryOnly=$true;bytesWritten=2;method='version-pinned exact active viewer recovery of inconsistent dimension bytes only'}}|ConvertTo-Json -Depth 6 -Compress
`;

const result = JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 2 * 1024 * 1024,
  env: { ...process.env, M: moduleName, A: area, HWND: String(probe.viewerHwnd), OBJECT: probe.viewerObject, BEFORE: String(before), RESTORE: String(restore) },
}).trim());
console.log(JSON.stringify({ ...result, binary: probe.binary }, null, 2));

function parseArgs(argv) { const out={}; for(let i=0;i<argv.length;i+=2){const key=argv[i],value=argv[i+1];if(!key?.startsWith("--")||value===undefined)throw new Error(`Expected --name <value> near ${key??"end"}.`);out[key.slice(2)]=value;} return out; }
function required(value,name){const text=String(value??"").trim();if(!text)throw new Error(`${name} is required.`);return text;}
function integer(value,name){const parsed=Number(required(value,name));if(!Number.isInteger(parsed)||parsed<1||parsed>32)throw new Error(`${name} must be an integer from 1 to 32.`);return parsed;}
