#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourceIndex = process.argv.indexOf("--sourceFile");
if (sourceIndex < 0 || !process.argv[sourceIndex + 1]) throw new Error("--sourceFile is required.");
const sourcePath = resolve(process.argv[sourceIndex + 1]);
const text = readFileSync(sourcePath, "utf8").replaceAll("\r\n", "\n");
const encoded = Buffer.from(text, "utf16le").toString("base64");

const script = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class ASSE {
  public delegate bool E(IntPtr h,IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct R{public int Left,Top,Right,Bottom;}
  [DllImport("user32.dll")] public static extern bool EnumWindows(E c,IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindowUnicode(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out R r);
  [DllImport("user32.dll",SetLastError=true)] public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,IntPtr l,uint flags,uint timeout,out IntPtr result);
  [DllImport("user32.dll",EntryPoint="SendMessageTimeoutW",CharSet=CharSet.Unicode,SetLastError=true)] public static extern IntPtr SendMessageTimeoutW(IntPtr h,uint m,IntPtr w,string l,uint flags,uint timeout,out IntPtr result);
  [DllImport("user32.dll",EntryPoint="SendMessageTimeoutA",CharSet=CharSet.Ansi,SetLastError=true)] public static extern IntPtr SendMessageTimeoutA(IntPtr h,uint m,IntPtr w,string l,uint flags,uint timeout,out IntPtr result);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(32768);[void][ASSE]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][ASSE]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function SM([IntPtr]$h,[uint32]$m,[IntPtr]$w,[IntPtr]$l){$r=[IntPtr]::Zero;$sent=[ASSE]::SendMessageTimeout($h,$m,$w,$l,2,15000,[ref]$r);if($sent-eq[IntPtr]::Zero){throw ('script_editor_message_timeout:0x{0:X}'-f$m)};$r}
$text=[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($env:SOURCE_B64));$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1-or-not$ps[0].Responding){throw 'expected_one_responding_toolset'};[uint32]$pid=$ps[0].Id
$script:d=@();[void][ASSE]::EnumWindows([ASSE+E]{param($h,$l);[uint32]$p=0;[void][ASSE]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[ASSE]::IsWindowVisible($h)-and(C $h)-eq'TdlgScriptEditor'-and(T $h)-eq'Script Editor'){$script:d+=$h};$true},[IntPtr]::Zero);if($script:d.Count-ne1){throw ('expected_one_script_editor:'+$script:d.Count)}
$script:e=@();[void][ASSE]::EnumChildWindows($script:d[0],[ASSE+E]{param($h,$l);if([ASSE]::IsWindowVisible($h)-and(C $h)-eq'TSEdit'){$r=New-Object 'ASSE+R';[void][ASSE]::GetWindowRect($h,[ref]$r);$script:e+=[pscustomobject]@{h=$h;top=$r.Top}};$true},[IntPtr]::Zero);if($script:e.Count-ne2){throw ('expected_two_visible_script_edits:'+$script:e.Count)}
$source=@($script:e|Sort-Object top|Select-Object -First 1);[void](SM $source[0].h 0x00B1 ([IntPtr]::Zero) ([IntPtr](-1)))
[IntPtr]$replaceResult=[IntPtr]::Zero;if([ASSE]::IsWindowUnicode($source[0].h)){$replaceSent=[ASSE]::SendMessageTimeoutW($source[0].h,0x00C2,[IntPtr]1,$text,2,15000,[ref]$replaceResult);$encoding='unicode'}else{$replaceSent=[ASSE]::SendMessageTimeoutA($source[0].h,0x00C2,[IntPtr]1,$text,2,15000,[ref]$replaceResult);$encoding='ansi'};if($replaceSent-eq[IntPtr]::Zero){throw 'script_editor_EM_REPLACESEL_failed'}
[void](SM $source[0].h 0 ([IntPtr]::Zero) ([IntPtr]::Zero));Start-Sleep -Milliseconds 300;$after=T $source[0].h;$normalizedAfter=$after-replace'\r\n','\n';$normalizedText=$text-replace'\r\n','\n';if($normalizedAfter-cne$normalizedText){throw ('script_source_readback_mismatch:{0}:{1}'-f$after.Length,$text.Length)};$mainCount=[regex]::Matches($after,'\bvoid\s+main\s*\(').Count;if($mainCount-ne1){throw ('script_main_count:'+$mainCount)}
[pscustomobject]@{ok=$true;processId=$pid;dialogHwnd=$script:d[0].ToInt64();sourceEditHwnd=$source[0].h.ToInt64();sourceLength=$after.Length;mainCount=$mainCount;replaceTransport='EM_SETSEL+EM_REPLACESEL';windowEncoding=$encoding;requiresNativeSave=$true;requiresSavedResourceReadback=$true;safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='exact visible Script Editor source TSEdit, bounded EM_SETSEL plus one native EM_REPLACESEL, exact window readback; saved NSS must be verified independently'}}|ConvertTo-Json -Depth 5 -Compress
`;

if (process.argv.includes("--compileOnly")) {
  const parsed = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", "[ScriptBlock]::Create($env:ASSE_SOURCE)|Out-Null;'{\"ok\":true}'"], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 20_000,
    env: { ...process.env, ASSE_SOURCE: script }
  });
  console.log(JSON.stringify(JSON.parse(parsed.trim()), null, 2));
  process.exit(0);
}

const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 30_000,
  env: { ...process.env, SOURCE_B64: encoded }
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
