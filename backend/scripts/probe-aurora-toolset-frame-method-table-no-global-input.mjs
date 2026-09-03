#!/usr/bin/env node
/**
 * Read-only, version-pinned Delphi RTTI method-table probe for the live
 * Aurora Toolset TfrmFrame. It does not send window messages or write memory.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const moduleName = required(arg("module"), "--module");
const binaryPath = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Neverwinter Nights\\bin\\win32\\nwtoolset.exe";
const expectedSha256 = "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24";
const sha256 = createHash("sha256").update(readFileSync(binaryPath)).digest("hex").toUpperCase();
if (sha256 !== expectedSha256) throw new Error(`toolset_binary_hash_mismatch:${sha256}`);

const ps = String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class VFMT{
 public delegate bool E(IntPtr h,IntPtr l);public delegate IntPtr P(IntPtr h,IntPtr n,IntPtr v,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",EntryPoint="GetWindowLongPtrW")]public static extern IntPtr GetWindowLongPtr(IntPtr h,int i);
 [DllImport("user32.dll",EntryPoint="GetClassLongPtrW")]public static extern IntPtr GetClassLongPtr(IntPtr h,int i);
 [DllImport("user32.dll",EntryPoint="EnumPropsExW")]public static extern int EnumPropsEx(IntPtr h,P c,IntPtr l);
 [DllImport("kernel32.dll",SetLastError=true)]public static extern IntPtr OpenProcess(uint a,bool i,uint p);
 [DllImport("kernel32.dll",SetLastError=true)]public static extern bool ReadProcessMemory(IntPtr p,IntPtr a,byte[] b,int n,out IntPtr r);
 [DllImport("kernel32.dll")]public static extern bool CloseHandle(IntPtr h);
}
'@
function T($h){$b=[Text.StringBuilder]::new(1024);[void][VFMT]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function C($h){$b=[Text.StringBuilder]::new(128);[void][VFMT]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function RB($p,$a,$n){$b=New-Object byte[] $n;$r=[IntPtr]::Zero;if(-not[VFMT]::ReadProcessMemory($p,$a,$b,$n,[ref]$r)-or$r.ToInt64()-ne$n){throw "read_failed:0x$($a.ToInt64().ToString('X'))"};$b}
function U16($p,$a){[BitConverter]::ToUInt16((RB $p $a 2),0)};function U32($p,$a){[BitConverter]::ToUInt32((RB $p $a 4),0)}
function SS($p,$a){$n=(RB $p $a 1)[0];if($n-lt1-or$n-gt200){return $null};[Text.Encoding]::ASCII.GetString((RB $p ([IntPtr]($a.ToInt64()+1)) $n))}
$proc=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($proc.Count-ne1){throw "expected_one_toolset:$($proc.Count)"};[uint32]$pid=$proc[0].Id
$script:f=@();[void][VFMT]::EnumWindows([VFMT+E]{param($h,$l);[uint32]$q=0;[void][VFMT]::GetWindowThreadProcessId($h,[ref]$q);if($q-eq$pid-and[VFMT]::IsWindowVisible($h)-and(C $h)-eq'TfrmFrame'-and(T $h).TrimEnd('*').EndsWith(" - $env:M",[StringComparison]::OrdinalIgnoreCase)){$script:f+=$h};$true},[IntPtr]::Zero);if($script:f.Count-ne1){throw 'exact_frame_missing'};$frame=$script:f[0]
$ph=[VFMT]::OpenProcess(0x410,$false,$pid);if($ph-eq[IntPtr]::Zero){throw 'open_process_failed'}
try{
 $candidates=@();$extra=[VFMT]::GetClassLongPtr($frame,-18).ToInt64();foreach($slot in @(-21)+@(0..([Math]::Max(0,$extra-4))|?{$_%4-eq0})){$v=[VFMT]::GetWindowLongPtr($frame,$slot);if($v-ne[IntPtr]::Zero){$candidates+=[pscustomobject]@{source="slot:$slot";value=$v}}}
 $script:props=@();[void][VFMT]::EnumPropsEx($frame,[VFMT+P]{param($h,$n,$v,$l);if($v-ne[IntPtr]::Zero){$script:props+=[pscustomobject]@{source='property';value=$v}};[IntPtr]1},[IntPtr]::Zero);$candidates+=@($script:props)
 $binding=$null;foreach($candidate in $candidates){try{$vmt=[IntPtr][int64](U32 $ph $candidate.value);$classPtr=[IntPtr][int64](U32 $ph ([IntPtr]($vmt.ToInt64()-56)));$name=SS $ph $classPtr;if($name-eq'TfrmFrame'){$binding=[pscustomobject]@{object=$candidate.value;vmt=$vmt;source=$candidate.source};break}}catch{}}
 if($null-eq$binding){throw 'tfrmframe_binding_missing'}
 $table=[IntPtr][int64](U32 $ph ([IntPtr]($binding.vmt.ToInt64()-64)));if($table-eq[IntPtr]::Zero){throw 'method_table_missing'};$count=U16 $ph $table;if($count-lt1-or$count-gt4096){throw "method_count_invalid:$count"}
 $cursor=$table.ToInt64()+2;$methods=@();for($i=0;$i-lt$count;$i++){$len=U16 $ph ([IntPtr]$cursor);if($len-lt8-or$len-gt512){throw "method_entry_length_invalid:index=$i len=$len cursor=0x$($cursor.ToString('X'))"};$code=U32 $ph ([IntPtr]($cursor+2));$name=SS $ph ([IntPtr]($cursor+6));$methods+=[pscustomobject]@{index=$i;name=$name;code=('0x{0:X8}'-f$code);entryLength=$len};$cursor+=$len}
 $fieldTable=[IntPtr][int64](U32 $ph ([IntPtr]($binding.vmt.ToInt64()-68)));$fieldCount=U16 $ph $fieldTable;$fieldCursor=$fieldTable.ToInt64()+6;$fields=@();for($i=0;$i-lt$fieldCount;$i++){$head=RB $ph ([IntPtr]$fieldCursor) 7;$offset=[BitConverter]::ToUInt32($head,0);$typeIndex=[BitConverter]::ToUInt16($head,4);$nameLength=[int]$head[6];$name=[Text.Encoding]::ASCII.GetString((RB $ph ([IntPtr]($fieldCursor+7)) $nameLength));$object=U32 $ph ([IntPtr]($binding.object.ToInt64()+$offset));$objectClass=$null;if($object-ne0){try{$objectVmt=U32 $ph ([IntPtr][int64]$object);$classPtr=U32 $ph ([IntPtr]([int64]$objectVmt-56));$objectClass=SS $ph ([IntPtr][int64]$classPtr)}catch{}};$fields+=[pscustomobject]@{index=$i;name=$name;offset=('0x{0:X}'-f$offset);typeIndex=$typeIndex;object=('0x{0:X}'-f$object);objectClass=$objectClass};$fieldCursor+=7+$nameLength}
 [pscustomobject]@{ok=$true;processId=$pid;frameHwnd=$frame.ToInt64();frameObject=('0x{0:X}'-f$binding.object.ToInt64());vmt=('0x{0:X}'-f$binding.vmt.ToInt64());methodTable=('0x{0:X}'-f$table.ToInt64());methodCount=$count;methods=$methods;fieldTable=('0x{0:X}'-f$fieldTable.ToInt64());fieldCount=$fieldCount;fields=$fields;safety=[pscustomobject]@{readOnly=$true;processMemoryWrites=$false;windowMessagesSent=$false;globalInput=$false}}|ConvertTo-Json -Depth 6 -Compress
}finally{[void][VFMT]::CloseHandle($ph)}
`;

const raw = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps], {
  encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 4 * 1024 * 1024,
  env: { ...process.env, M: moduleName },
}).trim();
const result = JSON.parse(raw);
result.binary = { path: binaryPath, sha256 };
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

function arg(name){const i=process.argv.indexOf(`--${name}`);return i<0?undefined:process.argv[i+1];}
function required(value,name){const text=String(value??"").trim();if(!text)throw new Error(`${name} is required`);return text;}
