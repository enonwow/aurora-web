#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const sourcePath = resolve(required(options.sourceFile, "--sourceFile"));
const out = options.out ? resolve(options.out) : null;
const compileOnly = String(options.compileOnly ?? "false").toLowerCase() === "true";
const sourceText = readFileSync(sourcePath, "utf8").replaceAll("\r\n", "\n");
if (sourceText.includes("\0")) throw new Error("Source must not contain NUL.");
if ((sourceText.match(/\bvoid\s+main\s*\(/gu) ?? []).length !== 1) {
  throw new Error("Source must contain exactly one void main function.");
}

const binaryPath =
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Neverwinter Nights\\bin\\win32\\nwtoolset.exe";
const expectedBinarySha256 =
  "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24";
const binarySha256 = createHash("sha256")
  .update(readFileSync(binaryPath))
  .digest("hex")
  .toUpperCase();
if (binarySha256 !== expectedBinarySha256) {
  throw new Error(`toolset_binary_hash_mismatch:${binarySha256}`);
}

const powershell = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class ASEB {
 public delegate bool E(IntPtr h,IntPtr l);public delegate IntPtr EP(IntPtr h,IntPtr n,IntPtr v,IntPtr l);
 [StructLayout(LayoutKind.Sequential)]public struct R{public int Left,Top,Right,Bottom;}
 [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);
 [DllImport("user32.dll",EntryPoint="GetWindowLongPtrW")]public static extern IntPtr GetWindowLongPtr(IntPtr h,int i);
 [DllImport("user32.dll",EntryPoint="GetClassLongPtrW")]public static extern IntPtr GetClassLongPtr(IntPtr h,int i);
 [DllImport("user32.dll",EntryPoint="EnumPropsExW")]public static extern int EnumPropsEx(IntPtr h,EP c,IntPtr l);
 [DllImport("user32.dll",SetLastError=true)]public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,IntPtr l,uint f,uint t,out IntPtr r);
 [DllImport("user32.dll")]public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
 [DllImport("kernel32.dll",SetLastError=true)]public static extern IntPtr OpenProcess(uint a,bool i,uint p);
 [DllImport("kernel32.dll",SetLastError=true)]public static extern bool ReadProcessMemory(IntPtr p,IntPtr a,byte[] b,UIntPtr n,out UIntPtr r);
 [DllImport("kernel32.dll",SetLastError=true)]public static extern bool WriteProcessMemory(IntPtr p,IntPtr a,byte[] b,UIntPtr n,out UIntPtr w);
 [DllImport("kernel32.dll",SetLastError=true)]public static extern IntPtr VirtualAllocEx(IntPtr p,IntPtr a,UIntPtr n,uint t,uint pr);
 [DllImport("kernel32.dll",SetLastError=true)]public static extern bool VirtualFreeEx(IntPtr p,IntPtr a,UIntPtr n,uint t);
 [DllImport("kernel32.dll",SetLastError=true)]public static extern IntPtr CreateRemoteThread(IntPtr p,IntPtr a,UIntPtr s,IntPtr start,IntPtr param,uint f,out uint id);
 [DllImport("kernel32.dll")]public static extern uint WaitForSingleObject(IntPtr h,uint ms);
 [DllImport("kernel32.dll")]public static extern bool GetExitCodeThread(IntPtr h,out uint c);
 [DllImport("kernel32.dll")]public static extern bool FlushInstructionCache(IntPtr p,IntPtr a,UIntPtr n);
 [DllImport("kernel32.dll")]public static extern bool CloseHandle(IntPtr h);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(32768);[void][ASEB]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][ASEB]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
$toolsets=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($toolsets.Count-ne1-or-not$toolsets[0].Responding){throw 'expected_one_responding_toolset'}
$toolset=$toolsets[0];[uint32]$pid=$toolset.Id;if([uint64]$toolset.MainModule.BaseAddress.ToInt64()-ne0x400000){throw 'unexpected_image_base'}
$script:dialogs=@();[void][ASEB]::EnumWindows([ASEB+E]{param($h,$l);[uint32]$p=0;[void][ASEB]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[ASEB]::IsWindowVisible($h)-and[ASEB]::IsWindowEnabled($h)-and(C $h)-eq'TdlgScriptEditor'-and(T $h)-eq'Script Editor'){$script:dialogs+=$h};$true},[IntPtr]::Zero)
if($script:dialogs.Count-ne1){throw ('expected_one_script_editor:'+$script:dialogs.Count)};$dialog=$script:dialogs[0]
$script:edits=@();[void][ASEB]::EnumChildWindows($dialog,[ASEB+E]{param($h,$l);if([ASEB]::IsWindowVisible($h)-and(C $h)-eq'TSEdit'){$r=New-Object 'ASEB+R';[void][ASEB]::GetWindowRect($h,[ref]$r);$script:edits+=[pscustomobject]@{h=$h;top=$r.Top}};$true},[IntPtr]::Zero)
$edits=@($script:edits|Sort-Object top);if($edits.Count-ne2){throw ('expected_two_visible_script_edits:'+$edits.Count)};$edit=$edits[0].h
$proc=[ASEB]::OpenProcess(0x001F0FFF,$false,$pid);if($proc-eq[IntPtr]::Zero){throw 'open_process_failed'}
$remote=[IntPtr]::Zero;$installed=$false
function RB([IntPtr]$a,[int]$n){$b=New-Object byte[] $n;[UIntPtr]$r=[UIntPtr]::Zero;if(-not[ASEB]::ReadProcessMemory($proc,$a,$b,[UIntPtr]::new($n),[ref]$r)-or$r.ToUInt64()-ne[uint64]$n){throw 'remote_read_failed'};$b}
function U16([IntPtr]$a){[BitConverter]::ToUInt16((RB $a 2),0)}
function U32([IntPtr]$a){[BitConverter]::ToUInt32((RB $a 4),0)}
function WB([IntPtr]$a,[byte[]]$b){[UIntPtr]$w=[UIntPtr]::Zero;if(-not[ASEB]::WriteProcessMemory($proc,$a,$b,[UIntPtr]::new($b.Length),[ref]$w)-or$w.ToUInt64()-ne[uint64]$b.Length){throw 'remote_write_failed'}}
function SS([IntPtr]$a){$n=(RB $a 1)[0];if($n-lt1-or$n-gt200){return $null};[Text.Encoding]::ASCII.GetString((RB ([IntPtr]($a.ToInt64()+1)) $n))}
function BindTSEdit([IntPtr]$h){$extra=[ASEB]::GetClassLongPtr($h,-18).ToInt64();$c=@();foreach($slot in @(-21)+@(0..([Math]::Max(0,$extra-4))|Where-Object{$_%4-eq0})){$v=[ASEB]::GetWindowLongPtr($h,$slot);if($v-ne[IntPtr]::Zero){$c+=$v}};$script:props=@();[void][ASEB]::EnumPropsEx($h,[ASEB+EP]{param($hw,$n,$v,$l);if($v-ne[IntPtr]::Zero){$script:props+=$v};[IntPtr]1},[IntPtr]::Zero);$c+=@($script:props);foreach($candidate in $c){try{$vmt=[IntPtr][int64](U32 $candidate);$cp=[IntPtr][int64](U32 ([IntPtr]($vmt.ToInt64()-56)));if((SS $cp)-eq'TSEdit'){return [pscustomobject]@{object=$candidate;vmt=$vmt}}}catch{}};throw 'vcl_binding_missing:TSEdit'}
function Run([IntPtr]$start){[uint32]$tid=0;$th=[ASEB]::CreateRemoteThread($proc,[IntPtr]::Zero,[UIntPtr]::Zero,$start,[IntPtr]::Zero,0,[ref]$tid);if($th-eq[IntPtr]::Zero){throw 'remote_thread_failed'};try{if([ASEB]::WaitForSingleObject($th,10000)-ne0){throw 'remote_thread_timeout'};[uint32]$exit=0;[void][ASEB]::GetExitCodeThread($th,[ref]$exit);[pscustomobject]@{threadId=$tid;exitCode=$exit}}finally{[void][ASEB]::CloseHandle($th)}}
try {
 $binding=BindTSEdit $edit;$sourceBytes=[Convert]::FromBase64String($env:SOURCE_UTF16_B64);$allocationSize=[int]([Math]::Ceiling((1024+$sourceBytes.Length+2)/4096.0)*4096)
 $remote=[ASEB]::VirtualAllocEx($proc,[IntPtr]::Zero,[UIntPtr]::new($allocationSize),0x3000,0x40);if($remote-eq[IntPtr]::Zero){throw 'bridge_alloc_failed'}
 $sourceAddress=[IntPtr]($remote.ToInt64()+1024);$terminated=New-Object byte[] ($sourceBytes.Length+2);$sourceBytes.CopyTo($terminated,0);WB $sourceAddress $terminated
 $get=[byte[]]@(0x55,0x8B,0xEC,0x6A,0xFC,0x68,0,0,0,0,0xFF,0x15,0x28,0x46,0xE4,0x00,0xA3,0,0,0,0,0xB8,1,0,0,0,0x5D,0xC2,4,0)
 [BitConverter]::GetBytes([uint32]$edit.ToInt64()).CopyTo($get,6);[BitConverter]::GetBytes([uint32]($remote.ToInt64()+148)).CopyTo($get,17);WB ([IntPtr]($remote.ToInt64()+160)) $get
 [void][ASEB]::FlushInstructionCache($proc,[IntPtr]($remote.ToInt64()+160),[UIntPtr]::new($get.Length));$getThread=Run ([IntPtr]($remote.ToInt64()+160));$old=[IntPtr][int64](U32 ([IntPtr]($remote.ToInt64()+148)));if($old-eq[IntPtr]::Zero){throw 'old_wndproc_missing'}
 $code=[byte[]]@(0x8B,0x44,0x24,0x08,0x3D,0xB7,0x83,0,0,0x75,0x38,0x9C,0x60,0xBA,0,0,0,0,0xB8,0,0,0,0,0xBB,0,0,0,0,0xFF,0xD3,0xBA,0,0,0,0,0xB8,0,0,0,0,0xBB,0,0,0,0,0xFF,0xD3,0xC7,0x05,0,0,0,0,1,0,0,0,0x61,0x9D,0xB8,1,0,0,0,0xC2,0x10,0,0xFF,0x25,0,0,0,0)
 [BitConverter]::GetBytes([uint32]$sourceAddress.ToInt64()).CopyTo($code,14);[BitConverter]::GetBytes([uint32]$binding.object.ToInt64()).CopyTo($code,19);[BitConverter]::GetBytes([uint32]0x00750420).CopyTo($code,24);[BitConverter]::GetBytes([uint32]($remote.ToInt64()+136)).CopyTo($code,31);[BitConverter]::GetBytes([uint32]$binding.object.ToInt64()).CopyTo($code,36);[BitConverter]::GetBytes([uint32]0x007510FC).CopyTo($code,41);[BitConverter]::GetBytes([uint32]($remote.ToInt64()+132)).CopyTo($code,49);[BitConverter]::GetBytes([uint32]($remote.ToInt64()+128)).CopyTo($code,69)
 WB $remote $code;WB ([IntPtr]($remote.ToInt64()+128)) ([BitConverter]::GetBytes([uint32]$old.ToInt64()))
 function SetCode([uint32]$value,[IntPtr]$result,[IntPtr]$at){$b=[byte[]]@(0x55,0x8B,0xEC,0x68,0,0,0,0,0x6A,0xFC,0x68,0,0,0,0,0xFF,0x15,0x68,0x47,0xE4,0,0xA3,0,0,0,0,0xB8,1,0,0,0,0x5D,0xC2,4,0);[BitConverter]::GetBytes($value).CopyTo($b,4);[BitConverter]::GetBytes([uint32]$edit.ToInt64()).CopyTo($b,11);[BitConverter]::GetBytes([uint32]$result.ToInt64()).CopyTo($b,22);WB $at $b}
 $install=[IntPtr]($remote.ToInt64()+224);$restore=[IntPtr]($remote.ToInt64()+288);SetCode ([uint32]$remote.ToInt64()) ([IntPtr]($remote.ToInt64()+140)) $install;SetCode ([uint32]$old.ToInt64()) ([IntPtr]($remote.ToInt64()+144)) $restore
 [void][ASEB]::FlushInstructionCache($proc,$remote,[UIntPtr]::new($allocationSize));$installThread=Run $install;if((U32 ([IntPtr]($remote.ToInt64()+140)))-ne[uint32]$old.ToInt64()){throw 'bridge_install_mismatch'};$installed=$true
 [uint32]$msg=0x83B7;[IntPtr]$bridgeResult=[IntPtr]::Zero;if([ASEB]::SendMessageTimeout($edit,$msg,[IntPtr]::Zero,[IntPtr]::Zero,2,15000,[ref]$bridgeResult)-eq[IntPtr]::Zero){throw 'bridge_send_timeout'}
 if((U32 ([IntPtr]($remote.ToInt64()+132)))-ne1){throw 'bridge_execution_missing'};$readbackPointer=[IntPtr][int64](U32 ([IntPtr]($remote.ToInt64()+136)));if($readbackPointer-eq[IntPtr]::Zero){throw 'gettext_result_missing'};$readbackLength=[int](U32 ([IntPtr]($readbackPointer.ToInt64()-4)));if($readbackLength-lt1-or$readbackLength-gt65535){throw ('gettext_length_invalid:'+$readbackLength)}
 $readback=[Text.Encoding]::Unicode.GetString((RB $readbackPointer ($readbackLength*2)));$expected=[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($env:SOURCE_UTF16_B64));$normalizedReadback=$readback.Replace(([string][char]13+[char]10),([string][char]10));$normalizedExpected=$expected.Replace(([string][char]13+[char]10),([string][char]10));if($normalizedReadback-cne$normalizedExpected){throw ('source_readback_mismatch:{0}:{1}'-f$normalizedReadback.Length,$normalizedExpected.Length)};$mainCount=[regex]::Matches($normalizedReadback,'\bvoid\s+main\s*\(').Count;if($mainCount-ne1){throw ('script_main_count:'+$mainCount)}
 $restoreThread=Run $restore;if((U32 ([IntPtr]($remote.ToInt64()+144)))-ne[uint32]$remote.ToInt64()){throw 'bridge_restore_mismatch'};$installed=$false
 [pscustomobject]@{ok=$true;processId=$pid;dialogHwnd=$dialog.ToInt64();sourceEditHwnd=$edit.ToInt64();sourceLength=$normalizedExpected.Length;readbackLength=$normalizedReadback.Length;mainCount=$mainCount;vcl=[pscustomobject]@{className='TSEdit';object=('0x{0:X8}'-f$binding.object.ToInt64());setText='0x00750420';getText='0x007510FC'};bridge=[pscustomobject]@{executedOnGuiThread=$true;wndProcRestored=$true;installThread=$installThread;restoreThread=$restoreThread};requiresNativeSave=$true;requiresSavedResourceReadback=$true;safety=[pscustomobject]@{usesGlobalKeyboard=$false;usesGlobalMouse=$false;usesGlobalCursor=$false;usesClipboard=$false;method='version-pinned short-lived WNDPROC bridge invokes exact TSEdit SetText and GetText on the Toolset GUI thread, validates the full normalized source, and restores WNDPROC'}}|ConvertTo-Json -Depth 7 -Compress
} finally {
 if($installed-and$remote-ne[IntPtr]::Zero){try{$restore=[IntPtr]($remote.ToInt64()+288);[void](Run $restore);if((U32 ([IntPtr]($remote.ToInt64()+144)))-eq[uint32]$remote.ToInt64()){$installed=$false}}catch{}}
 if($remote-ne[IntPtr]::Zero-and-not$installed){[void][ASEB]::VirtualFreeEx($proc,$remote,[UIntPtr]::Zero,0x8000)}
 [void][ASEB]::CloseHandle($proc)
}
`;

if (compileOnly) {
  const parsed = execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "[ScriptBlock]::Create($env:ASEB_SOURCE)|Out-Null;'{\"ok\":true}'",
    ],
    {
      encoding: "utf8",
      windowsHide: true,
      timeout: 20_000,
      env: { ...process.env, ASEB_SOURCE: powershell },
    },
  );
  console.log(JSON.stringify(JSON.parse(parsed.trim()), null, 2));
  process.exit(0);
}

const result = JSON.parse(
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      powershell,
    ],
    {
      encoding: "utf8",
      windowsHide: true,
      timeout: 60_000,
      maxBuffer: 4 * 1024 * 1024,
      env: {
        ...process.env,
        SOURCE_UTF16_B64: Buffer.from(sourceText, "utf16le").toString("base64"),
      },
    },
  ).trim(),
);
result.sourceFile = sourcePath;
result.sourceSha256 = createHash("sha256")
  .update(Buffer.from(sourceText, "utf8"))
  .digest("hex")
  .toUpperCase();
result.binarySha256 = binarySha256;
if (out) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify(result, null, 2));

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Expected --name <value> near ${key ?? "end"}.`);
    }
    result[key.slice(2)] = value;
  }
  return result;
}

function required(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${name} is required.`);
  return text;
}
