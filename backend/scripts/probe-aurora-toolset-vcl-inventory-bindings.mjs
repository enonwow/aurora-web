#!/usr/bin/env node
/**
 * Read-only VCL object/field probe for the exact open Inventory Contents dialog.
 *
 * The probe does not send window messages, write process memory, inject code,
 * or use global input. It binds HWNDs to validated Delphi class instances and
 * enumerates published fields from their VMT field tables.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const binaryPath = resolve(
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Neverwinter Nights\\bin\\win32\\nwtoolset.exe",
);
const expectedSha256 = "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24";
if (!existsSync(binaryPath)) throw new Error(`toolset_binary_missing:${binaryPath}`);
const binarySha256 = createHash("sha256").update(readFileSync(binaryPath)).digest("hex").toUpperCase();
if (binarySha256 !== expectedSha256) {
  throw new Error(`toolset_binary_hash_mismatch:${expectedSha256}:${binarySha256}`);
}

const source = String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AIVB {
 public delegate bool E(IntPtr h,IntPtr l); public delegate IntPtr EP(IntPtr h,IntPtr n,IntPtr v,IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumWindows(E c,IntPtr l); [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l); [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p); [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n); [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n); [DllImport("user32.dll",EntryPoint="GetWindowLongPtrW")] public static extern IntPtr GetWindowLongPtr(IntPtr h,int i); [DllImport("user32.dll",EntryPoint="GetClassLongPtrW")] public static extern IntPtr GetClassLongPtr(IntPtr h,int i); [DllImport("user32.dll",EntryPoint="EnumPropsExW")] public static extern int EnumPropsEx(IntPtr h,EP c,IntPtr l);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern IntPtr OpenProcess(uint a,bool i,uint p); [DllImport("kernel32.dll",SetLastError=true)] public static extern bool ReadProcessMemory(IntPtr p,IntPtr a,byte[] b,int n,out IntPtr r); [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(512);[void][AIVB]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][AIVB]::GetClassName($h,$b,$b.Capacity);$b.ToString()};function RB([IntPtr]$a,[int]$n){$b=New-Object byte[] $n;$r=[IntPtr]::Zero;if(-not[AIVB]::ReadProcessMemory($proc,$a,$b,$n,[ref]$r)-or$r.ToInt64()-ne$n){throw "read_failed:0x$($a.ToInt64().ToString('X')):$n"};$b};function U32([IntPtr]$a){[BitConverter]::ToUInt32((RB $a 4),0)};function U16([IntPtr]$a){[BitConverter]::ToUInt16((RB $a 2),0)};function TryName([uint32]$a){if($a-eq0){return $null};try{$b=RB ([IntPtr][int64]$a) 80;$n=[int]$b[0];if($n-lt1-or$n-gt70){return $null};$s=[Text.Encoding]::ASCII.GetString($b,1,$n);if($s-match'^[A-Za-z_][A-Za-z0-9_]*$'){$s}else{$null}}catch{$null}}
function ClassNames([IntPtr]$vmt){$names=@();foreach($off in 16..192|Where-Object{$_%4-eq0}){try{$n=TryName (U32 ([IntPtr]($vmt.ToInt64()-$off)));if($n){$names+=[pscustomobject]@{vmtOffset=-$off;value=$n}}}catch{}};@($names)}
function Methods([IntPtr]$vmt){$table=[IntPtr][int64](U32 ([IntPtr]($vmt.ToInt64()-64)));if($table-eq[IntPtr]::Zero){return @()};$count=U16 $table;if($count-gt2048){throw "method_count_invalid:$count"};$out=@();$cursor=$table.ToInt64()+2;for($i=0;$i-lt$count;$i++){$entryLength=U16 ([IntPtr]$cursor);if($entryLength-lt8-or$entryLength-gt1024){throw ('method_entry_invalid:{0}:{1}'-f$i,$entryLength)};$code=U32 ([IntPtr]($cursor+2));$nameLength=[int](RB ([IntPtr]($cursor+6)) 1)[0];if($nameLength-lt1-or$nameLength-gt127){throw ('method_name_invalid:{0}:{1}'-f$i,$nameLength)};$name=[Text.Encoding]::ASCII.GetString((RB ([IntPtr]($cursor+7)) $nameLength));$out+=[pscustomobject]@{name=$name;address=('0x{0:X8}'-f$code);entryLength=$entryLength};$cursor+=$entryLength};@($out)}
function Bind([IntPtr]$h,[string]$expected){$extra=[AIVB]::GetClassLongPtr($h,-18).ToInt64();$slots=if($extra-ge4){@(0..($extra-4)|Where-Object{$_%4-eq0})}else{@()};$candidates=@();foreach($slot in @(-21)+$slots){$v=[AIVB]::GetWindowLongPtr($h,[int]$slot);if($v-ne[IntPtr]::Zero){$candidates+=[pscustomobject]@{origin="window-slot:$slot";value=$v}}};$script:props=@();[void][AIVB]::EnumPropsEx($h,[AIVB+EP]{param($hw,$n,$v,$l);if($v-ne[IntPtr]::Zero){$script:props+=[pscustomobject]@{origin='window-property';value=$v}};[IntPtr]1},[IntPtr]::Zero);$candidates+=@($script:props);foreach($candidate in $candidates){try{$vmt=[IntPtr][int64](U32 $candidate.value);$names=ClassNames $vmt;if(@($names|Where-Object{$_.value-eq$expected}).Count-eq1){return [pscustomobject]@{object=$candidate.value;vmt=$vmt;origin=$candidate.origin;classNames=$names}}}catch{}};throw "vcl_binding_missing:$expected"}
function Published([IntPtr]$bindingObject,[IntPtr]$vmt){$table=[IntPtr][int64](U32 ([IntPtr]($vmt.ToInt64()-68)));if($table-eq[IntPtr]::Zero){return @()};$count=U16 $table;if($count-gt1024){throw "field_count_invalid:$count"};$out=@();$cursor=$table.ToInt64()+6;for($i=0;$i-lt$count;$i++){$header=RB ([IntPtr]$cursor) 7;$offset=[BitConverter]::ToUInt32($header,0);$type=[BitConverter]::ToUInt16($header,4);$len=[int]$header[6];if($len-lt1-or$len-gt127){throw ('field_name_invalid:{0}:{1}'-f$i,$len)};$name=[Text.Encoding]::ASCII.GetString((RB ([IntPtr]($cursor+7)) $len));$value=U32 ([IntPtr]($bindingObject.ToInt64()+$offset));$valueNames=@();if($value-ne0){try{$valueVmt=[IntPtr][int64](U32 ([IntPtr][int64]$value));$valueNames=ClassNames $valueVmt}catch{}};$out+=[pscustomobject]@{name=$name;offset=('0x{0:X}'-f$offset);offsetValue=$offset;typeIndex=$type;value=('0x{0:X8}'-f$value);valueClassNames=$valueNames};$cursor+=7+$len};@($out)}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw "expected_one_toolset:$($ps.Count)"};[uint32]$pid=$ps[0].Id;$script:d=@();[void][AIVB]::EnumWindows([AIVB+E]{param($h,$l);[uint32]$p=0;[void][AIVB]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[AIVB]::IsWindowVisible($h)-and(C $h)-eq'TdlgInventory'-and(T $h)-eq'Inventory Contents'){$script:d+=$h};$true},[IntPtr]::Zero);if($script:d.Count-ne1){throw "expected_one_inventory:$($script:d.Count)"};$dialog=$script:d[0];$screen=[Windows.Forms.Screen]::FromHandle($dialog);if($screen.Primary){throw 'inventory_on_primary'};$script:children=@();[void][AIVB]::EnumChildWindows($dialog,[AIVB+E]{param($h,$l);if([AIVB]::IsWindowVisible($h)-and@('TTreeView','TDrawGrid')-contains(C $h)){$script:children+=[pscustomobject]@{hwnd=$h;className=C $h;text=T $h}};$true},[IntPtr]::Zero);$proc=[AIVB]::OpenProcess(0x410,$false,$pid);if($proc-eq[IntPtr]::Zero){throw 'open_process_failed'};try{$db=Bind $dialog 'TdlgInventory';$childBindings=@();foreach($child in $script:children){$b=Bind $child.hwnd $child.className;$childBindings+=[pscustomobject]@{hwnd=$child.hwnd.ToInt64();className=$child.className;text=$child.text;object=('0x{0:X8}'-f$b.object.ToInt64());vmt=('0x{0:X8}'-f$b.vmt.ToInt64());origin=$b.origin;classNames=$b.classNames;publishedFields=(Published $b.object $b.vmt)}};[pscustomobject]@{ok=$true;processId=$pid;dialogHwnd=$dialog.ToInt64();dialogObject=('0x{0:X8}'-f$db.object.ToInt64());dialogVmt=('0x{0:X8}'-f$db.vmt.ToInt64());dialogOrigin=$db.origin;dialogClassNames=$db.classNames;dialogMethods=(Methods $db.vmt);dialogPublishedFields=(Published $db.object $db.vmt);children=$childBindings;monitor=@{deviceName=$screen.DeviceName;primary=$screen.Primary};binarySha256=$env:BINARY_SHA;safety=@{readOnly=$true;processMemoryWrites=$false;codeInjected=$false;windowMessagesSent=$false;usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false}}|ConvertTo-Json -Depth 10}finally{[void][AIVB]::CloseHandle($proc)}
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 60_000,
  maxBuffer: 16 * 1024 * 1024,
  env: { ...process.env, BINARY_SHA: binarySha256 },
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
