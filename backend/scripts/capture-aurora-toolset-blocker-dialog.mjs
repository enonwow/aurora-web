#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const outPath = resolve(
  String(options.outPath ?? ".codex-tmp/area-toolset-oracle-20260710/toolset-blocker.png"),
);
mkdirSync(dirname(outPath), { recursive: true });

const script = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class ToolsetBlockerCapture {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lp);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc cb, IntPtr lp);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int max);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
}
'@
function Text([IntPtr]$h) { $b=New-Object Text.StringBuilder 1024; [void][ToolsetBlockerCapture]::GetWindowText($h,$b,$b.Capacity); $b.ToString() }
$windows=@()
$enum=[ToolsetBlockerCapture+EnumWindowsProc]{ param($h,$l)
  if(-not [ToolsetBlockerCapture]::IsWindowVisible($h)){return $true}
  [uint32]$windowPid=0;[void][ToolsetBlockerCapture]::GetWindowThreadProcessId($h,[ref]$windowPid)
  try{$name=(Get-Process -Id $windowPid -ErrorAction Stop).ProcessName}catch{return $true}
  if($name -ne 'nwtoolset'){return $true}
  $texts=@((Text $h));$child=[ToolsetBlockerCapture+EnumWindowsProc]{param($c,$x);$t=Text $c;if($t){$script:childTexts+=$t};return $true};$script:childTexts=@();[void][ToolsetBlockerCapture]::EnumChildWindows($h,$child,[IntPtr]::Zero);$texts+=$script:childTexts
  $joined=[string]::Join([Environment]::NewLine,$texts);$kind=$null
  if($joined -match 'Access violation|Read of address|Write of address'){$kind='access_violation'}elseif($joined -match 'did not close properly|try to recover|recover it'){$kind='recovery'}elseif($joined -match 'Loading Inventory List'){$kind='loading_inventory'}
  if($kind){$windows+=[pscustomobject]@{hwnd=$h.ToInt64();pid=$windowPid;kind=$kind;texts=$texts}}
  return $true
}
[void][ToolsetBlockerCapture]::EnumWindows($enum,[IntPtr]::Zero)
$target=$windows|Sort-Object @{Expression={if($_.kind -eq 'access_violation'){0}elseif($_.kind -eq 'recovery'){1}else{2}}}|Select-Object -First 1
if($null -eq $target){[pscustomobject]@{ok=$false;blockerCode='no_toolset_blocker_dialog';outPath=$env:AURORA_TOOLSET_BLOCKER_CAPTURE_PATH}|ConvertTo-Json -Depth 6;exit 0}
$rect=New-Object ToolsetBlockerCapture+RECT;[void][ToolsetBlockerCapture]::GetWindowRect([IntPtr]$target.hwnd,[ref]$rect);$w=$rect.Right-$rect.Left;$h=$rect.Bottom-$rect.Top
if($w -le 0 -or $h -le 0){throw 'Blocker dialog has invalid bounds.'}
$bitmap=New-Object Drawing.Bitmap $w,$h;$graphics=[Drawing.Graphics]::FromImage($bitmap);$dc=$graphics.GetHdc();try{[void][ToolsetBlockerCapture]::PrintWindow([IntPtr]$target.hwnd,$dc,2)}finally{$graphics.ReleaseHdc($dc);$graphics.Dispose()};$bitmap.Save($env:AURORA_TOOLSET_BLOCKER_CAPTURE_PATH,[Drawing.Imaging.ImageFormat]::Png);$bitmap.Dispose()
[pscustomobject]@{ok=$true;kind=$target.kind;pid=$target.pid;hwnd=$target.hwnd;texts=$target.texts;pngPath=$env:AURORA_TOOLSET_BLOCKER_CAPTURE_PATH;pngBytes=(Get-Item -LiteralPath $env:AURORA_TOOLSET_BLOCKER_CAPTURE_PATH).Length}|ConvertTo-Json -Depth 6
`;

const raw = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
  env: { ...process.env, AURORA_TOOLSET_BLOCKER_CAPTURE_PATH: outPath },
  encoding: "utf8",
  windowsHide: true,
  timeout: 30_000,
  maxBuffer: 1024 * 1024 * 4,
}).trim();
console.log(raw);

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument ${token}.`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) result[token.slice(2)] = true;
    else {
      result[token.slice(2)] = value;
      index += 1;
    }
  }
  return result;
}
