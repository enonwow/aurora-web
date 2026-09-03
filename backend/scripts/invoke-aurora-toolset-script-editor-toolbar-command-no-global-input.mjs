#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const action = String(process.argv[process.argv.indexOf("--action") + 1] ?? "").trim();
const actions = {
  Compile: { index: 0, commandId: 0 },
  New: { index: 2, commandId: 2 },
  Open: { index: 3, commandId: 3 },
  Close: { index: 4, commandId: 4 },
  Save: { index: 5, commandId: 5 },
  SaveAs: { index: 6, commandId: 6 },
  SaveAll: { index: 7, commandId: 7 },
};
if (!(action in actions)) throw new Error(`Unsupported --action ${JSON.stringify(action)}.`);

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AuroraScriptToolbar {
 public delegate bool E(IntPtr h,IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumWindows(E c,IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
 [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
 [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint a,bool i,uint p);
 [DllImport("kernel32.dll")] public static extern IntPtr VirtualAllocEx(IntPtr p,IntPtr a,UIntPtr s,uint t,uint pr);
 [DllImport("kernel32.dll")] public static extern bool ReadProcessMemory(IntPtr p,IntPtr a,byte[] b,UIntPtr s,out UIntPtr r);
 [DllImport("kernel32.dll")] public static extern bool VirtualFreeEx(IntPtr p,IntPtr a,UIntPtr s,uint t);
 [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(256);[void][AuroraScriptToolbar]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][AuroraScriptToolbar]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw 'expected_one_toolset_process'};[uint32]$pidValue=$ps[0].Id
$script:dialogs=@();[void][AuroraScriptToolbar]::EnumWindows([AuroraScriptToolbar+E]{param($h,$l);[uint32]$p=0;[void][AuroraScriptToolbar]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pidValue-and[AuroraScriptToolbar]::IsWindowVisible($h)-and(C $h)-eq'TdlgScriptEditor'-and(T $h)-eq'Script Editor'){$script:dialogs+=$h};$true},[IntPtr]::Zero);if($script:dialogs.Count-ne1){throw "expected_one_script_editor:$($script:dialogs.Count)"};$dialog=$script:dialogs[0]
$script:bars=@();[void][AuroraScriptToolbar]::EnumChildWindows($dialog,[AuroraScriptToolbar+E]{param($h,$l);if([AuroraScriptToolbar]::IsWindowVisible($h)-and(C $h)-eq'TToolBar'){$script:bars+=$h};$true},[IntPtr]::Zero);if($script:bars.Count-ne1){throw "expected_one_script_toolbar:$($script:bars.Count)"};$bar=$script:bars[0];$count=[int][AuroraScriptToolbar]::SendMessage($bar,0x0418,[IntPtr]::Zero,[IntPtr]::Zero).ToInt64();$index=[int]$env:INDEX;if($index-lt0-or$index-ge$count){throw 'toolbar_index_out_of_range'}
$ph=[AuroraScriptToolbar]::OpenProcess(0x438,$false,$pidValue);if($ph-eq[IntPtr]::Zero){throw 'process_open_failed'};$remote=[AuroraScriptToolbar]::VirtualAllocEx($ph,[IntPtr]::Zero,[UIntPtr]::new(64),0x1000,4);if($remote-eq[IntPtr]::Zero){throw 'remote_alloc_failed'}
try{if([AuroraScriptToolbar]::SendMessage($bar,0x0417,[IntPtr]$index,$remote).ToInt64()-ne1){throw 'tb_getbutton_failed'};$button=New-Object byte[] 32;$read=[UIntPtr]::Zero;if(-not[AuroraScriptToolbar]::ReadProcessMemory($ph,$remote,$button,[UIntPtr]::new(32),[ref]$read)){throw 'button_read_failed'};$commandId=[BitConverter]::ToInt32($button,4);$state=[int]$button[8];$style=[int]$button[9];if($commandId-ne[int]$env:COMMAND_ID){throw "toolbar_command_mismatch:$commandId"};if(($state-band4)-eq0){throw "toolbar_command_disabled:$state"};if([AuroraScriptToolbar]::SendMessage($bar,0x041D,[IntPtr]$index,$remote).ToInt64()-ne1){throw 'tb_getitemrect_failed'};$rect=New-Object byte[] 16;$read=[UIntPtr]::Zero;if(-not[AuroraScriptToolbar]::ReadProcessMemory($ph,$remote,$rect,[UIntPtr]::new(16),[ref]$read)){throw 'rect_read_failed'};$left=[BitConverter]::ToInt32($rect,0);$top=[BitConverter]::ToInt32($rect,4);$right=[BitConverter]::ToInt32($rect,8);$bottom=[BitConverter]::ToInt32($rect,12);$x=[int](($left+$right)/2);$y=[int](($top+$bottom)/2);$lp=[IntPtr][int64](($y-shl16)-bor($x-band0xffff));if(-not[AuroraScriptToolbar]::PostMessage($bar,0x0201,[IntPtr]1,$lp)-or-not[AuroraScriptToolbar]::PostMessage($bar,0x0202,[IntPtr]::Zero,$lp)){throw 'toolbar_click_failed'};Start-Sleep -Milliseconds 900;[pscustomobject]@{ok=$true;processId=$pidValue;dialogHwnd=$dialog.ToInt64();toolbarHwnd=$bar.ToInt64();action=$env:ACTION;button=[pscustomobject]@{index=$index;commandId=$commandId;state=$state;style=$style;rect=[pscustomobject]@{left=$left;top=$top;right=$right;bottom=$bottom}};safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;guessedCommandId=$false;method='native Script Editor DFM action mapping plus remote TBBUTTON identity/readback and targeted toolbar click'}}|ConvertTo-Json -Depth 6}finally{[void][AuroraScriptToolbar]::VirtualFreeEx($ph,$remote,[UIntPtr]::Zero,0x8000);[void][AuroraScriptToolbar]::CloseHandle($ph)}
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 30_000,
  env: { ...process.env, ACTION: action, INDEX: String(actions[action].index), COMMAND_ID: String(actions[action].commandId) },
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
