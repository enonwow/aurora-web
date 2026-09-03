#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const dialogClass = required(options.dialogClass, "--dialogClass");
const dialogTitle = required(options.dialogTitle, "--dialogTitle");
const itemText = required(options.itemText, "--itemText");
const occurrence = nonNegativeInteger(options.occurrence ?? "0", "--occurrence");
const listOnly = String(options.listOnly ?? "false").toLowerCase() === "true";

const source = String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class ADTS { public delegate bool E(IntPtr h,IntPtr l); [StructLayout(LayoutKind.Sequential)] public struct R { public int Left,Top,Right,Bottom; }
[DllImport("user32.dll")] public static extern bool EnumWindows(E c,IntPtr l); [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l); [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p); [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n); [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n); [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l); [DllImport("kernel32.dll",SetLastError=true)] public static extern IntPtr OpenProcess(uint a,bool i,uint p); [DllImport("kernel32.dll",SetLastError=true)] public static extern IntPtr VirtualAllocEx(IntPtr p,IntPtr a,UIntPtr s,uint t,uint pr); [DllImport("kernel32.dll",SetLastError=true)] public static extern bool VirtualFreeEx(IntPtr p,IntPtr a,UIntPtr s,uint t); [DllImport("kernel32.dll",SetLastError=true)] public static extern bool ReadProcessMemory(IntPtr p,IntPtr a,byte[] b,UIntPtr s,out UIntPtr r); [DllImport("kernel32.dll",SetLastError=true)] public static extern bool WriteProcessMemory(IntPtr p,IntPtr a,byte[] b,UIntPtr s,out UIntPtr w); [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h); }
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(512);[void][ADTS]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][ADTS]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw "expected_one_toolset_process:$($ps.Count)"};[uint32]$pid=$ps[0].Id
$script:dialogs=@();[void][ADTS]::EnumWindows([ADTS+E]{param($h,$l);[uint32]$p=0;[void][ADTS]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[ADTS]::IsWindowVisible($h)-and(C $h)-eq$env:DIALOG_CLASS-and(T $h)-eq$env:DIALOG_TITLE){$script:dialogs+=$h};$true},[IntPtr]::Zero);if($script:dialogs.Count-ne1){throw "expected_one_exact_dialog:$($script:dialogs.Count)"};$dialog=$script:dialogs[0];$screen=[Windows.Forms.Screen]::FromHandle($dialog);if($screen.Primary){throw 'dialog_on_primary_display'}
$script:trees=@();[void][ADTS]::EnumChildWindows($dialog,[ADTS+E]{param($h,$l);if([ADTS]::IsWindowVisible($h)-and(C $h)-eq'TTreeView'){$script:trees+=$h};$true},[IntPtr]::Zero);if($script:trees.Count-ne1){throw "expected_one_visible_tree:$($script:trees.Count)"};$tree=$script:trees[0]
$proc=[ADTS]::OpenProcess(0x38,$false,$pid);if($proc-eq[IntPtr]::Zero){throw 'tree_process_open_failed'};$remote=[ADTS]::VirtualAllocEx($proc,[IntPtr]::Zero,[UIntPtr]::new(1024),0x1000,4);if($remote-eq[IntPtr]::Zero){[void][ADTS]::CloseHandle($proc);throw 'tree_remote_alloc_failed'}
try{
 function ReadNode([IntPtr]$item){$buffer=New-Object byte[] 32;[BitConverter]::GetBytes([uint32]1).CopyTo($buffer,0);[BitConverter]::GetBytes([uint32]$item.ToInt64()).CopyTo($buffer,4);[BitConverter]::GetBytes([uint32]($remote.ToInt64()+64)).CopyTo($buffer,16);[BitConverter]::GetBytes([int]400).CopyTo($buffer,20);[UIntPtr]$written=[UIntPtr]::Zero;if(-not[ADTS]::WriteProcessMemory($proc,$remote,$buffer,[UIntPtr]::new(32),[ref]$written)){throw 'tree_remote_write_failed'};if([ADTS]::SendMessage($tree,0x113E,[IntPtr]::Zero,$remote).ToInt64()-eq0){throw 'tvm_getitem_failed'};$bytes=New-Object byte[] 800;[UIntPtr]$read=[UIntPtr]::Zero;if(-not[ADTS]::ReadProcessMemory($proc,[IntPtr]($remote.ToInt64()+64),$bytes,[UIntPtr]::new(800),[ref]$read)){throw 'tree_remote_read_failed'};[pscustomobject]@{handle=$item.ToInt64();text=([Text.Encoding]::Unicode.GetString($bytes).Split([char]0)[0])}}
 function Walk([IntPtr]$item,[int]$depth){$items=@();while($item-ne[IntPtr]::Zero){$node=ReadNode $item;$node|Add-Member depth $depth;$items+=$node;$child=[ADTS]::SendMessage($tree,0x110A,[IntPtr]4,$item);if($child-ne[IntPtr]::Zero){$items+=@(Walk $child ($depth+1))};$item=[ADTS]::SendMessage($tree,0x110A,[IntPtr]1,$item)};$items}
 $nodes=@(Walk ([ADTS]::SendMessage($tree,0x110A,[IntPtr]0,[IntPtr]::Zero)) 0);if($env:LIST_ONLY-eq'true'){[pscustomobject]@{ok=$true;processId=$pid;dialogHwnd=$dialog.ToInt64();treeHwnd=$tree.ToInt64();nodes=$nodes;safety=[pscustomobject]@{readOnly=$true;usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='remote TreeView text readback'}}|ConvertTo-Json -Depth 7;return};$matches=@($nodes|Where-Object{$_.text-eq$env:ITEM_TEXT});$index=[int]$env:OCCURRENCE;if($index-lt0-or$index-ge$matches.Count){throw "tree_item_occurrence_out_of_range:$($env:ITEM_TEXT):$($index):$($matches.Count)"};$target=$matches[$index];[void][ADTS]::SendMessage($tree,0x1114,[IntPtr]::Zero,[IntPtr]$target.handle);[void][ADTS]::SendMessage($tree,0x110B,[IntPtr]9,[IntPtr]$target.handle);Start-Sleep -Milliseconds 200;$caret=[ADTS]::SendMessage($tree,0x110A,[IntPtr]9,[IntPtr]::Zero);if($caret.ToInt64()-ne$target.handle){throw 'tree_selection_readback_mismatch'}
 [pscustomobject]@{ok=$true;processId=$pid;dialogHwnd=$dialog.ToInt64();treeHwnd=$tree.ToInt64();matchCount=$matches.Count;selected=$target;monitor=[pscustomobject]@{deviceName=$screen.DeviceName;primary=$screen.Primary};safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='remote TreeView text readback plus targeted TVM_ENSUREVISIBLE/TVM_SELECTITEM'}}|ConvertTo-Json -Depth 7
}finally{[void][ADTS]::VirtualFreeEx($proc,$remote,[UIntPtr]::Zero,0x8000);[void][ADTS]::CloseHandle($proc)}
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8", windowsHide: true, timeout: 45_000, maxBuffer: 4 * 1024 * 1024,
  env: { ...process.env, DIALOG_CLASS: dialogClass, DIALOG_TITLE: dialogTitle, ITEM_TEXT: itemText, OCCURRENCE: String(occurrence), LIST_ONLY: String(listOnly) },
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));

function parseArgs(argv) { const value = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index], item = argv[index + 1]; if (!key?.startsWith("--") || item === undefined) throw new Error(`Expected --name <value> near ${key ?? "end"}.`); value[key.slice(2)] = item; } return value; }
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
function nonNegativeInteger(value, name) { const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer.`); return parsed; }
