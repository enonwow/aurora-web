#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const expectedPid = positiveInteger(options.expectedPid, "--expectedPid");
const expectedViewerHwnd = positiveInteger(options.expectedViewerHwnd, "--expectedViewerHwnd");
const expectedMessage = uint32(options.expectedMessage, "--expectedMessage");

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AWR {
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
  [DllImport("kernel32.dll",SetLastError=true)] public static extern IntPtr OpenProcess(uint a,bool inherit,uint p);
  [DllImport("kernel32.dll",SetLastError=true)] public static extern bool ReadProcessMemory(IntPtr p,IntPtr a,byte[] b,UIntPtr n,out UIntPtr r);
  [DllImport("kernel32.dll",SetLastError=true)] public static extern bool WriteProcessMemory(IntPtr p,IntPtr a,byte[] b,UIntPtr n,out UIntPtr w);
  [DllImport("kernel32.dll",SetLastError=true)] public static extern IntPtr VirtualAllocEx(IntPtr p,IntPtr a,UIntPtr n,uint t,uint protection);
  [DllImport("kernel32.dll",SetLastError=true)] public static extern bool VirtualFreeEx(IntPtr p,IntPtr a,UIntPtr n,uint t);
  [DllImport("kernel32.dll",SetLastError=true)] public static extern IntPtr CreateRemoteThread(IntPtr p,IntPtr a,UIntPtr s,IntPtr start,IntPtr param,uint flags,out uint id);
  [DllImport("kernel32.dll")] public static extern uint WaitForSingleObject(IntPtr h,uint ms);
  [DllImport("kernel32.dll")] public static extern bool GetExitCodeThread(IntPtr h,out uint code);
  [DllImport("kernel32.dll")] public static extern bool FlushInstructionCache(IntPtr p,IntPtr a,UIntPtr n);
  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
}
'@
function Class([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][AWR]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Read([IntPtr]$p,[IntPtr]$a,[int]$n){$b=New-Object byte[] $n;[UIntPtr]$r=[UIntPtr]::Zero;if(-not[AWR]::ReadProcessMemory($p,$a,$b,[UIntPtr]::new($n),[ref]$r)-or$r.ToUInt64()-ne[uint64]$n){throw 'orphan_bridge_read_failed'};$b}
function WriteBytes([IntPtr]$p,[IntPtr]$a,[byte[]]$b){[UIntPtr]$w=[UIntPtr]::Zero;if(-not[AWR]::WriteProcessMemory($p,$a,$b,[UIntPtr]::new($b.Length),[ref]$w)-or$w.ToUInt64()-ne[uint64]$b.Length){throw 'recovery_stub_write_failed'}}
function Run([IntPtr]$p,[IntPtr]$start){[uint32]$id=0;$thread=[AWR]::CreateRemoteThread($p,[IntPtr]::Zero,[UIntPtr]::Zero,$start,[IntPtr]::Zero,0,[ref]$id);if($thread-eq[IntPtr]::Zero){throw 'recovery_thread_failed'};try{if([AWR]::WaitForSingleObject($thread,10000)-ne0){throw 'recovery_thread_timeout'};[uint32]$exit=0;[void][AWR]::GetExitCodeThread($thread,[ref]$exit);$id}finally{[void][AWR]::CloseHandle($thread)}}
function Getter([uint32]$viewer,[uint32]$result){$b=[byte[]]@(0x55,0x8B,0xEC,0x6A,0xFC,0x68,0,0,0,0,0xFF,0x15,0x28,0x46,0xE4,0,0xA3,0,0,0,0,0xB8,1,0,0,0,0x5D,0xC2,4,0);[BitConverter]::GetBytes($viewer).CopyTo($b,6);[BitConverter]::GetBytes($result).CopyTo($b,17);$b}
function Setter([uint32]$viewer,[uint32]$value,[uint32]$result){$b=[byte[]]@(0x55,0x8B,0xEC,0x68,0,0,0,0,0x6A,0xFC,0x68,0,0,0,0,0xFF,0x15,0x68,0x47,0xE4,0,0xA3,0,0,0,0,0xB8,1,0,0,0,0x5D,0xC2,4,0);[BitConverter]::GetBytes($value).CopyTo($b,4);[BitConverter]::GetBytes($viewer).CopyTo($b,11);[BitConverter]::GetBytes($result).CopyTo($b,22);$b}
[uint32]$pid=[uint32]$env:AWR_PID;[uint32]$viewerValue=[uint32]$env:AWR_VIEWER;[uint32]$message=[uint32]$env:AWR_MESSAGE;$viewer=[IntPtr][int64]$viewerValue
$processes=@(Get-Process -Id $pid -ErrorAction SilentlyContinue);if($processes.Count-ne1-or$processes[0].ProcessName-ne'nwtoolset'-or-not$processes[0].Responding){throw 'expected_exact_responding_toolset'}
[uint32]$windowPid=0;[void][AWR]::GetWindowThreadProcessId($viewer,[ref]$windowPid);if($windowPid-ne$pid-or(Class $viewer)-ne'TfrmViewerArea'){throw 'expected_exact_area_viewer'}
$process=[AWR]::OpenProcess(0x001F0FFF,$false,$pid);if($process-eq[IntPtr]::Zero){throw 'open_process_failed'};$recovery=[IntPtr]::Zero
try{
  $recovery=[AWR]::VirtualAllocEx($process,[IntPtr]::Zero,[UIntPtr]::new(128),0x3000,0x40);if($recovery-eq[IntPtr]::Zero){throw 'recovery_alloc_failed'}
  [uint32]$resultAddress=[uint32]($recovery.ToInt64()+64);$getter=Getter $viewerValue $resultAddress;WriteBytes $process $recovery $getter;[void][AWR]::FlushInstructionCache($process,$recovery,[UIntPtr]::new($getter.Length));$getBeforeThread=Run $process $recovery
  [uint32]$orphan=[BitConverter]::ToUInt32((Read $process ([IntPtr][int64]$resultAddress) 4),0);if($orphan-eq0){throw 'current_wndproc_missing'}
  $bytes=Read $process ([IntPtr][int64]$orphan) 160;$signature=[byte[]]@(0x8B,0x44,0x24,0x08,0x3D);for($i=0;$i-lt$signature.Length;$i++){if($bytes[$i]-ne$signature[$i]){throw 'orphan_bridge_signature_mismatch'}}
  if([BitConverter]::ToUInt32($bytes,5)-ne$message){throw 'orphan_bridge_message_mismatch'};if($bytes[9]-ne0x75-or$bytes[10]-ne0x1D-or$bytes[11]-ne0x9C-or$bytes[12]-ne0x60-or$bytes[13]-ne0xBA-or$bytes[40]-ne0xFF-or$bytes[41]-ne0x25){throw 'orphan_bridge_signature_mismatch'}
  if([BitConverter]::ToUInt32($bytes,42)-ne($orphan+128)){throw 'orphan_bridge_forward_pointer_mismatch'};[uint32]$old=[BitConverter]::ToUInt32($bytes,128);if($old-eq0-or$old-eq$orphan){throw 'orphan_bridge_old_wndproc_invalid'}
  $setter=Setter $viewerValue $old $resultAddress;WriteBytes $process $recovery $setter;[void][AWR]::FlushInstructionCache($process,$recovery,[UIntPtr]::new($setter.Length));$setThread=Run $process $recovery;[uint32]$returned=[BitConverter]::ToUInt32((Read $process ([IntPtr][int64]$resultAddress) 4),0)
  WriteBytes $process $recovery $getter;[void][AWR]::FlushInstructionCache($process,$recovery,[UIntPtr]::new($getter.Length));$getAfterThread=Run $process $recovery;[uint32]$current=[BitConverter]::ToUInt32((Read $process ([IntPtr][int64]$resultAddress) 4),0)
  if($returned-ne$orphan-or$current-ne$old){throw ('wndproc_restore_readback_mismatch:'+$returned+':'+$current+':'+$orphan+':'+$old)}
  if(-not[AWR]::VirtualFreeEx($process,[IntPtr][int64]$orphan,[UIntPtr]::Zero,0x8000)){throw 'orphan_bridge_free_failed'}
  [pscustomobject]@{ok=$true;processId=$pid;viewerHwnd=$viewerValue;orphanWndProc=('0x{0:X8}'-f$orphan);restoredWndProc=('0x{0:X8}'-f$old);message=('0x{0:X8}'-f$message);threads=[pscustomobject]@{getBefore=$getBeforeThread;set=$setThread;getAfter=$getAfterThread};safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='exact orphan bridge byte signature and process-local WNDPROC getter/setter readbacks, exact orphan block release'}}|ConvertTo-Json -Depth 5 -Compress
}finally{if($recovery-ne[IntPtr]::Zero){[void][AWR]::VirtualFreeEx($process,$recovery,[UIntPtr]::Zero,0x8000)};[void][AWR]::CloseHandle($process)}
`;

const result = JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 30_000,
  env: { ...process.env, AWR_PID: String(expectedPid), AWR_VIEWER: String(expectedViewerHwnd), AWR_MESSAGE: String(expectedMessage) }
}).trim());
console.log(JSON.stringify(result, null, 2));

function parseArgs(argv){const result={};for(let index=0;index<argv.length;index+=2){const key=argv[index],value=argv[index+1];if(!key?.startsWith("--")||value===undefined)throw new Error(`Expected --name <value> near ${key??"end"}.`);result[key.slice(2)]=value;}return result;}
function positiveInteger(value,name){const parsed=Number(value);if(!Number.isSafeInteger(parsed)||parsed<=0)throw new Error(`${name} must be a positive integer.`);return parsed;}
function uint32(value,name){const parsed=Number(String(value??"").trim());if(!Number.isSafeInteger(parsed)||parsed<0||parsed>0xFFFFFFFF)throw new Error(`${name} must be a uint32.`);return parsed;}
