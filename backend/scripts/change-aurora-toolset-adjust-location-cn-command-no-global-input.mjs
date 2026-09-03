#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
for (const name of ["expectedX", "expectedY", "expectedZ", "x", "y"]) if (!options[name]) throw new Error(`--${name} required`);

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;public static class LocationCnCommand{public delegate bool E(IntPtr h,IntPtr l);[StructLayout(LayoutKind.Sequential)]public struct RECT{public int Left,Top,Right,Bottom;}[DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern bool SetWindowText(IntPtr h,string t);[DllImport("user32.dll")]public static extern int GetDlgCtrlID(IntPtr h);[DllImport("user32.dll")]public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);[DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out RECT r);}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(256);[void][LocationCnCommand]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][LocationCnCommand]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function B([IntPtr]$h){$r=New-Object 'LocationCnCommand+RECT';[void][LocationCnCommand]::GetWindowRect($h,[ref]$r);$r}
function P([IntPtr]$h){[int][LocationCnCommand]::SendMessage($h,0x0472,[IntPtr]::Zero,[IntPtr]::Zero).ToInt64()}
function N([string]$v){[int][Math]::Round(([double]($v-replace ',','.'))*100,[MidpointRounding]::AwayFromZero)}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw 'expected_one_toolset_process'};[uint32]$pid=$ps[0].Id
$script:dialogs=@();[void][LocationCnCommand]::EnumWindows([LocationCnCommand+E]{param($h,$l);[uint32]$q=0;[void][LocationCnCommand]::GetWindowThreadProcessId($h,[ref]$q);if($q-eq$pid-and[LocationCnCommand]::IsWindowVisible($h)-and(C $h)-eq'TdlgLocation'-and(T $h)-eq'Adjust Location'){$script:dialogs+=$h};$true},[IntPtr]::Zero);if($script:dialogs.Count-ne1){throw "expected_one_adjust_location:$($script:dialogs.Count)"};$dialog=$script:dialogs[0]
$script:groups=@();[void][LocationCnCommand]::EnumChildWindows($dialog,[LocationCnCommand+E]{param($h,$l);if([LocationCnCommand]::IsWindowVisible($h)-and(C $h)-eq'TGroupBox'-and(T $h)-eq'Position'){$script:groups+=$h};$true},[IntPtr]::Zero);if($script:groups.Count-ne1){throw "expected_one_position_group:$($script:groups.Count)"};$group=B $script:groups[0]
$script:edits=@();$script:ups=@();[void][LocationCnCommand]::EnumChildWindows($dialog,[LocationCnCommand+E]{param($h,$l);if([LocationCnCommand]::IsWindowVisible($h)-and[LocationCnCommand]::IsWindowEnabled($h)){$r=B $h;if($r.Left-ge$group.Left-and$r.Right-le$group.Right-and$r.Top-ge$group.Top-and$r.Bottom-le$group.Bottom){if((C $h)-eq'TEdit'){$script:edits+=[pscustomobject]@{h=$h;r=$r}};if((C $h)-eq'TUpDown'){$script:ups+=[pscustomobject]@{h=$h;r=$r}}}};$true},[IntPtr]::Zero);$edits=@($script:edits|Sort-Object{$_.r.Top});$ups=@($script:ups|Sort-Object{$_.r.Top});if($edits.Count-ne3-or$ups.Count-ne3){throw "position_controls_missing:edit=$($edits.Count):updown=$($ups.Count)"};for($i=0;$i-lt3;$i++){if($edits[$i].r.Top-ne$ups[$i].r.Top){throw "position_row_geometry_mismatch:$i"}}
$before=@{text=@($edits|ForEach-Object{T $_.h});position=@($ups|ForEach-Object{P $_.h})};$expectedText=@($env:EX,$env:EY,$env:EZ);$expectedPosition=@((N $env:EX),(N $env:EY),(N $env:EZ));if(($before.text-join'|')-ne($expectedText-join'|')-or($before.position-join'|')-ne($expectedPosition-join'|')){throw "position_before_mismatch:$($before|ConvertTo-Json -Compress)"};$candidateText=@($env:NX,$env:NY,$env:EZ);$candidatePosition=@((N $env:NX),(N $env:NY),(N $env:EZ));$messages=@()
for($i=0;$i-lt2;$i++){if(-not[LocationCnCommand]::SetWindowText($edits[$i].h,$candidateText[$i])){throw "set_window_text_failed:$i"};$id=[LocationCnCommand]::GetDlgCtrlID($edits[$i].h);if($id-le0){throw "position_field_control_id_invalid:$($i):$id"};$wp=[IntPtr][int64](($id-band0xffff)-bor(0x0300-shl16));[void][LocationCnCommand]::SendMessage($edits[$i].h,0xBD11,$wp,$edits[$i].h);$messages+=[pscustomobject]@{axis=@('X','Y')[$i];editHwnd=$edits[$i].h.ToInt64();controlId=$id;message='CN_COMMAND';notification='EN_CHANGE';wParam=$wp.ToInt64()};Start-Sleep -Milliseconds 120}
$after=@{text=@($edits|ForEach-Object{T $_.h});position=@($ups|ForEach-Object{P $_.h})};$stageMatchesCandidate=(($after.text-join'|')-eq($candidateText-join'|'))-and(($after.position-join'|')-eq($candidatePosition-join'|'));[pscustomobject]@{ok=$true;processId=$pid;dialogHwnd=$dialog.ToInt64();before=$before;after=$after;expectedAfter=@{text=$candidateText;position=$candidatePosition};messages=$messages;stageMatchesCandidate=$stageMatchesCandidate;safety=[pscustomobject]@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;remoteCodeInjection=$false;method='validated Position TEdit SetWindowText then direct VCL CN_COMMAND/EN_CHANGE; require paired TUpDown synchronization before commit'}}|ConvertTo-Json -Depth 8 -Compress
`;

if (options.compileOnly === "true") {
  execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "[scriptblock]::Create($env:AURORA_CN_COMMAND_SOURCE) | Out-Null"], { encoding: "utf8", windowsHide: true, timeout: 30000, env: { ...process.env, AURORA_CN_COMMAND_SOURCE: source } });
  console.log(JSON.stringify({ ok: true, mode: "compile-only", startsToolset: false, usesGlobalInput: false }, null, 2));
  process.exit(0);
}
const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 30000, env: { ...process.env, EX: options.expectedX, EY: options.expectedY, EZ: options.expectedZ, NX: options.x, NY: options.y } }).trim();
console.log(JSON.stringify(JSON.parse(output), null, 2));

function parseArgs(argv) { const result = {}; for (let index = 0; index < argv.length; index += 2) result[argv[index].slice(2)] = argv[index + 1]; return result; }
