#!/usr/bin/env node
import { execFileSync } from "node:child_process";
const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public class L4{public delegate bool E(IntPtr h,IntPtr l);[StructLayout(LayoutKind.Sequential)]public struct R{public int Left,Top,Right,Bottom;}[DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern bool IsIconic(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);}
'@
function T($h){$b=[Text.StringBuilder]::new(1024);[void][L4]::GetWindowText($h,$b,1024);$b.ToString()};function C($h){$b=[Text.StringBuilder]::new(128);[void][L4]::GetClassName($h,$b,128);$b.ToString()}
$pidv=(Get-Process nwtoolset -ErrorAction Stop).Id;$script:rows=@();[void][L4]::EnumWindows([L4+E]{param($h,$l);[uint32]$p=0;[void][L4]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pidv){$r=New-Object 'L4+R';[void][L4]::GetWindowRect($h,[ref]$r);$script:rows+=[pscustomobject]@{hwnd=$h.ToInt64();visible=[L4]::IsWindowVisible($h);iconic=[L4]::IsIconic($h);className=C $h;title=T $h;bounds=@{left=$r.Left;top=$r.Top;right=$r.Right;bottom=$r.Bottom}}};$true},[IntPtr]::Zero);$script:rows|ConvertTo-Json -Depth 4 -Compress
`;
const out=execFileSync("powershell.exe",["-NoProfile","-STA","-ExecutionPolicy","Bypass","-Command",source],{encoding:"utf8",windowsHide:true,timeout:10000});
console.log(JSON.stringify(JSON.parse(out.trim()),null,2));
