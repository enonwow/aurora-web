#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AuroraWindowTreeProbe {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc callback, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr hWnd, uint command);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
'@
function Text([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][AuroraWindowTreeProbe]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function Class([IntPtr]$h){$b=[Text.StringBuilder]::new(256);[void][AuroraWindowTreeProbe]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Describe([IntPtr]$h,[string]$kind){$r=New-Object 'AuroraWindowTreeProbe+RECT';[void][AuroraWindowTreeProbe]::GetWindowRect($h,[ref]$r);[pscustomobject]@{kind=$kind;hwnd=$h.ToInt64();owner=([AuroraWindowTreeProbe]::GetWindow($h,4)).ToInt64();visible=[AuroraWindowTreeProbe]::IsWindowVisible($h);iconic=[AuroraWindowTreeProbe]::IsIconic($h);className=(Class $h);text=(Text $h);bounds=[pscustomobject]@{left=$r.Left;top=$r.Top;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top}}}
$processes=@(Get-Process nwtoolset -ErrorAction SilentlyContinue)
if($processes.Count-ne1){throw "expected_one_toolset_process:$($processes.Count)"}
[uint32]$targetPid=$processes[0].Id
$script:top=@()
$topCallback=[AuroraWindowTreeProbe+EnumWindowsProc]{param($h,$l);[uint32]$p=0;[void][AuroraWindowTreeProbe]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$targetPid){$script:top += Describe $h 'top'};return $true}
[void][AuroraWindowTreeProbe]::EnumWindows($topCallback,[IntPtr]::Zero)
$script:children=@()
foreach($window in $script:top){$childCallback=[AuroraWindowTreeProbe+EnumWindowsProc]{param($h,$l);$script:children += Describe $h 'child';return $true};[void][AuroraWindowTreeProbe]::EnumChildWindows([IntPtr]$window.hwnd,$childCallback,[IntPtr]::Zero)}
[pscustomobject]@{processId=$targetPid;top=$script:top;children=$script:children;safety=[pscustomobject]@{readOnly=$true;usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false}}|ConvertTo-Json -Depth 7 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 30_000,
  maxBuffer: 8 * 1024 * 1024,
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
