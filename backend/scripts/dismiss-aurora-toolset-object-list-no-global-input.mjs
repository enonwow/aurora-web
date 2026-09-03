#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const title = required(options.title, "--title");

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System; using System.Text; using System.Runtime.InteropServices;
public static class AuroraObjectListDismiss {
  public delegate bool EnumProc(IntPtr hwnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int capacity);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hwnd, StringBuilder text, int capacity);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hwnd, uint message, IntPtr wParam, IntPtr lParam);
}
'@
function Text([IntPtr]$hwnd) { $buffer=[Text.StringBuilder]::new(512); [void][AuroraObjectListDismiss]::GetWindowText($hwnd,$buffer,$buffer.Capacity); $buffer.ToString() }
function Class([IntPtr]$hwnd) { $buffer=[Text.StringBuilder]::new(128); [void][AuroraObjectListDismiss]::GetClassName($hwnd,$buffer,$buffer.Capacity); $buffer.ToString() }
function Find-Exact([uint32]$targetProcessId) {
  $script:matches=@()
  [void][AuroraObjectListDismiss]::EnumWindows([AuroraObjectListDismiss+EnumProc]{
    param($hwnd,$lparam)
    [uint32]$windowPid=0; [void][AuroraObjectListDismiss]::GetWindowThreadProcessId($hwnd,[ref]$windowPid)
    if ($windowPid -eq $targetProcessId -and [AuroraObjectListDismiss]::IsWindowVisible($hwnd) -and (Class $hwnd) -eq 'TfrmObjectList' -and (Text $hwnd) -eq $env:OBJECT_LIST_TITLE) { $script:matches += $hwnd }
    return $true
  },[IntPtr]::Zero)
  @($script:matches)
}
$processes=@(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if ($processes.Count -ne 1 -or -not $processes[0].Responding) { throw "expected_one_responding_toolset:$($processes.Count)" }
[uint32]$toolsetPid=$processes[0].Id
$before=Find-Exact $toolsetPid
if ($before.Count -ne 1) { throw "expected_one_exact_object_list:$($before.Count)" }
if (-not [AuroraObjectListDismiss]::PostMessage($before[0],0x0010,[IntPtr]::Zero,[IntPtr]::Zero)) { throw 'object_list_wm_close_post_failed' }
$deadline=[DateTime]::UtcNow.AddSeconds(3)
do { Start-Sleep -Milliseconds 80; $after=Find-Exact $toolsetPid } while ($after.Count -ne 0 -and [DateTime]::UtcNow -lt $deadline)
if ($after.Count -ne 0) { throw 'object_list_close_not_durable' }
[pscustomobject]@{ok=$true;processId=$toolsetPid;objectListHwnd=$before[0].ToInt64();className='TfrmObjectList';title=$env:OBJECT_LIST_TITLE;safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='targeted WM_CLOSE on one exact non-Toolset Object List diagnostic window'}}|ConvertTo-Json -Depth 5 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 1024 * 1024, env: { ...process.env, OBJECT_LIST_TITLE: title },
}).trim();
console.log(JSON.stringify(JSON.parse(output), null, 2));

function parseArgs(argv) { const result={}; for(let index=0;index<argv.length;index+=2){const key=argv[index],value=argv[index+1];if(!key?.startsWith("--")||value===undefined||value.startsWith("--"))throw new Error(`Expected --name <value> near ${key??"end"}.`);result[key.slice(2)]=value;} return result; }
function required(value,name) { const text=String(value??"").trim(); if(!text) throw new Error(`${name} is required.`); return text; }
