#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const expectedPid = positiveInteger(options.expectedPid, "--expectedPid");
const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AuroraStaleCloseObserve { public delegate bool E(IntPtr h,IntPtr l); [DllImport("user32.dll")] public static extern bool EnumWindows(E c,IntPtr l); [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l); [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h); [DllImport("user32.dll")] public static extern bool IsWindowEnabled(IntPtr h); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p); [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n); [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n); }
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(2048);[void][AuroraStaleCloseObserve]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};function C([IntPtr]$h){$b=[Text.StringBuilder]::new(256);[void][AuroraStaleCloseObserve]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
$ps=@(Get-Process -Id ([int]$env:EXPECTED_PID) -ErrorAction SilentlyContinue);if($ps.Count-ne1 -or $ps[0].ProcessName-ne'nwtoolset'){throw 'expected_exact_toolset_process_missing'};[uint32]$pidValue=$ps[0].Id;$script:dialogs=@();[void][AuroraStaleCloseObserve]::EnumWindows([AuroraStaleCloseObserve+E]{param($h,$l);[uint32]$p=0;[void][AuroraStaleCloseObserve]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pidValue-and[AuroraStaleCloseObserve]::IsWindowVisible($h)-and(C $h)-eq'#32770'-and(T $h)-eq'Confirmation'){$script:dialogs+=$h};$true},[IntPtr]::Zero);$result=@();foreach($d in $script:dialogs){$script:controls=@();[void][AuroraStaleCloseObserve]::EnumChildWindows($d,[AuroraStaleCloseObserve+E]{param($h,$l);$script:controls+=[pscustomobject]@{hwnd=$h.ToInt64();className=(C $h);text=(T $h);visible=[AuroraStaleCloseObserve]::IsWindowVisible($h);enabled=[AuroraStaleCloseObserve]::IsWindowEnabled($h)};$true},[IntPtr]::Zero);$result+=[pscustomobject]@{hwnd=$d.ToInt64();className='\#32770';title='Confirmation';controls=$script:controls}};[pscustomobject]@{ok=$true;command='observe-aurora-toolset-stale-build-close-confirmations';processId=$pidValue;responding=$ps[0].Responding;confirmations=$result;safety=@{readOnly=$true;usesGlobalInput=$false;postsNoMessages=$true;doesNotChooseConfirmation=$true}}|ConvertTo-Json -Depth 7 -Compress
`;
const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 30000, env: { ...process.env, EXPECTED_PID: String(expectedPid) } });
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
function parseArgs(argv){const result={};for(let i=0;i<argv.length;i+=2){const key=argv[i],value=argv[i+1];if(!key?.startsWith("--")||value===undefined||value.startsWith("--"))throw new Error(`invalid:${key??"end"}`);result[key.slice(2)]=value;}return result;}
function positiveInteger(value,name){const numeric=Number(value);if(!Number.isInteger(numeric)||numeric<=0)throw new Error(`${name} must be positive.`);return numeric;}
