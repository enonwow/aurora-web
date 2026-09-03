#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const out = resolve(process.argv[process.argv.indexOf("--out") + 1] ?? "");
if (!out) throw new Error("--out is required.");
mkdirSync(dirname(out), { recursive: true });

const source = String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Drawing;Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Runtime.InteropServices;
public static class NwmainCapture {
 [StructLayout(LayoutKind.Sequential)] public struct R { public int Left,Top,Right,Bottom; }
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out R r);
 [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h,IntPtr a,int x,int y,int w,int hgt,uint f);
}
'@
$ps=@(Get-Process nwmain -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw "expected_one_nwmain:$($ps.Count)"};$p=$ps[0];if(-not$p.Responding-or$p.MainWindowHandle-eq0){throw 'nwmain_window_unavailable'};$h=[IntPtr]$p.MainWindowHandle
$screens=@([Windows.Forms.Screen]::AllScreens|Where-Object{-not$_.Primary});if($screens.Count-ne1){throw "expected_one_nonprimary_screen:$($screens.Count)"};$screen=$screens[0];$b=$screen.Bounds
if(-not[NwmainCapture]::SetWindowPos($h,[IntPtr]::Zero,$b.Left,$b.Top,$b.Width,$b.Height,0x0014)){throw 'nwmain_place_failed'};Start-Sleep -Milliseconds 900
$r=New-Object 'NwmainCapture+R';[void][NwmainCapture]::GetWindowRect($h,[ref]$r);if($r.Left-lt$b.Left-or$r.Top-lt$b.Top-or$r.Right-gt$b.Right-or$r.Bottom-gt$b.Bottom){throw 'nwmain_not_inside_target_screen'}
[void][NwmainCapture]::SetWindowPos($h,[IntPtr](-1),$r.Left,$r.Top,$r.Right-$r.Left,$r.Bottom-$r.Top,0x0013);Start-Sleep -Milliseconds 300
$bitmap=[Drawing.Bitmap]::new($r.Right-$r.Left,$r.Bottom-$r.Top);try{$g=[Drawing.Graphics]::FromImage($bitmap);try{$g.CopyFromScreen($r.Left,$r.Top,0,0,$bitmap.Size,[Drawing.CopyPixelOperation]::SourceCopy)}finally{$g.Dispose()};$bitmap.Save($env:OUT,[Drawing.Imaging.ImageFormat]::Png)}finally{$bitmap.Dispose();[void][NwmainCapture]::SetWindowPos($h,[IntPtr](-2),$r.Left,$r.Top,$r.Right-$r.Left,$r.Bottom-$r.Top,0x0013)}
[pscustomobject]@{ok=$true;processId=$p.Id;windowHwnd=$h.ToInt64();title=$p.MainWindowTitle;bounds=@{left=$r.Left;top=$r.Top;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top};monitor=@{deviceName=$screen.DeviceName;primary=$screen.Primary};pngPath=$env:OUT;pngBytes=(Get-Item -LiteralPath $env:OUT).Length;safety=@{usesGlobalCursor=$false;usesGlobalMouse=$false;usesGlobalKeyboard=$false;activatesWindow=$false;method='SWP_NOACTIVATE placement on exact nonprimary screen plus temporary no-activate topmost and physical CopyFromScreen'}}|ConvertTo-Json -Depth 6 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 30_000,
  maxBuffer: 1024 * 1024,
  env: { ...process.env, OUT: out },
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
