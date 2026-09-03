#!/usr/bin/env node
/**
 * Read-only VCL binding probe for an already-running Aurora Toolset.
 *
 * It never starts nwtoolset.exe, injects code, writes process memory, sends a
 * window message, captures the screen, or moves global input.  It only proves
 * that an exact TfrmViewerArea HWND maps to the expected VCL object class.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const area = required(options.area, "--area").toLowerCase();
const moduleName = String(options.module ?? "the_last_city - codex.mod").trim();
const approvedDisplay = String(options.display ?? "\\\\.\\DISPLAY1").trim();
const expectedBinarySha256 = "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24";
const binaryPath = resolve(String(options.binaryPath ?? "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Neverwinter Nights\\bin\\win32\\nwtoolset.exe"));
if (!existsSync(binaryPath)) throw new Error(`Toolset binary does not exist: ${binaryPath}`);
const binarySha256 = createHash("sha256").update(readFileSync(binaryPath)).digest("hex").toUpperCase();
if (binarySha256 !== expectedBinarySha256) throw new Error(`toolset_binary_hash_mismatch: expected=${expectedBinarySha256} actual=${binarySha256}`);
const script = String.raw`
$ErrorActionPreference='Stop'
$null=Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AuroraVclReadOnly {
  public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lparam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lparam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc callback, IntPtr lparam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hwnd, StringBuilder text, int count);
  [DllImport("user32.dll", EntryPoint="GetWindowLongPtrW")] public static extern IntPtr GetWindowLongPtr(IntPtr hwnd, int index);
  [DllImport("user32.dll", EntryPoint="GetClassLongPtrW")] public static extern IntPtr GetClassLongPtr(IntPtr hwnd, int index);
  public delegate IntPtr EnumPropsExProc(IntPtr hwnd, IntPtr name, IntPtr value, IntPtr lParam);
  [DllImport("user32.dll", EntryPoint="EnumPropsExW")] public static extern int EnumPropsEx(IntPtr hwnd, EnumPropsExProc callback, IntPtr lParam);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern IntPtr OpenProcess(uint access, bool inheritHandle, uint processId);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool ReadProcessMemory(IntPtr process, IntPtr address, byte[] buffer, int size, out IntPtr bytesRead);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool CloseHandle(IntPtr handle);
}
'@
function Text([IntPtr]$h){$b=New-Object Text.StringBuilder 1024;[void][AuroraVclReadOnly]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function Class([IntPtr]$h){$b=New-Object Text.StringBuilder 256;[void][AuroraVclReadOnly]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Read-Bytes([IntPtr]$p,[IntPtr]$a,[int]$n){$b=New-Object byte[] $n;$r=[IntPtr]::Zero;if(-not[AuroraVclReadOnly]::ReadProcessMemory($p,$a,$b,$n,[ref]$r)){throw "ReadProcessMemory failed at 0x$($a.ToInt64().ToString('X')) win32=$([Runtime.InteropServices.Marshal]::GetLastWin32Error())"};if($r.ToInt64()-lt$n){throw "Short ReadProcessMemory at 0x$($a.ToInt64().ToString('X'))"};$b}
function Read-U32([IntPtr]$p,[IntPtr]$a){[BitConverter]::ToUInt32((Read-Bytes $p $a 4),0)}
function Read-U16([IntPtr]$p,[IntPtr]$a){[BitConverter]::ToUInt16((Read-Bytes $p $a 2),0)}
function Hex-Bytes([byte[]]$b){-join($b|%{$_.ToString('X2')})}
function Try-ShortString([byte[]]$b){if($b.Length-lt2){return $null};$n=[int]$b[0];if($n-lt1-or$n-gt60-or$b.Length-lt$n+1){return $null};$s=[Text.Encoding]::ASCII.GetString($b,1,$n);if($s -match '^[A-Za-z_][A-Za-z0-9_]*$'){$s}else{$null}}
function Property-Name([IntPtr]$name){if($name.ToInt64()-ge0-and$name.ToInt64()-le0xffff){return ('#atom:{0}' -f $name.ToInt64())};try{[Runtime.InteropServices.Marshal]::PtrToStringUni($name)}catch{'<unreadable>'}}
function Find-VclObject([IntPtr]$window,[IntPtr]$process,[string]$expectedClass){
  $extra=[AuroraVclReadOnly]::GetClassLongPtr($window,-18).ToInt64();if($extra-lt0-or$extra-gt4096){throw "toolset_vcl_window_extra_invalid: class=$expectedClass classExtraBytes=$extra"}
  $extraSlots=if($extra-ge4){@(0..($extra-4)|?{$_%4-eq0})}else{@()};$candidates=@();foreach($slot in @(-21)+$extraSlots){$value=[AuroraVclReadOnly]::GetWindowLongPtr($window,[int]$slot);if($value-ne[IntPtr]::Zero){$candidates+=[pscustomobject]@{origin=('window-slot:{0}' -f $slot);slot=$slot;name=$null;value=$value}}}
  $script:props=@();$callback=[AuroraVclReadOnly+EnumPropsExProc]{param($h,$name,$value,$l);if($value-ne[IntPtr]::Zero){$script:props+=[pscustomobject]@{origin='window-property';slot=$null;name=(Property-Name $name);value=$value}};return [IntPtr]1};[void][AuroraVclReadOnly]::EnumPropsEx($window,$callback,[IntPtr]::Zero);$candidates+=@($script:props)
  $inspected=@();foreach($candidateEntry in $candidates){$candidate=$candidateEntry.value;$entry=[pscustomobject]@{origin=$candidateEntry.origin;slot=$candidateEntry.slot;propertyName=$candidateEntry.name;address=('0x{0:X}' -f $candidate.ToInt64())};try{$vmt=[IntPtr][int64](Read-U32 $process $candidate);$names=@();foreach($offset in 16..160|?{$_%4-eq0}){$field=[IntPtr]($vmt.ToInt64()-$offset);try{$value=Read-U32 $process $field;if($value-eq0){continue};$short=Try-ShortString (Read-Bytes $process ([IntPtr][int64]$value) 64);if($short){$names+=,[pscustomobject]@{vmtOffset=-$offset;value=$short}}}catch{}};$entry|Add-Member NoteProperty vmtAddress ('0x{0:X}' -f $vmt.ToInt64());$entry|Add-Member NoteProperty classNames $names;$inspected+=$entry;$match=@($names|?{$_.value-eq$expectedClass})|select -First 1;if($null-ne$match){return [pscustomobject]@{object=$candidate;vmt=$vmt;origin=$candidateEntry.origin;slot=$candidateEntry.slot;propertyName=$candidateEntry.name;className=$expectedClass;classNameVmtOffset=$match.vmtOffset;inspected=$inspected}}}catch{$entry|Add-Member NoteProperty readError $_.Exception.Message;$inspected+=$entry}}
  throw "toolset_vcl_object_slot_unavailable: no validated $expectedClass object in window slots or properties; classExtraBytes=$extra inspected=$($inspected|ConvertTo-Json -Compress)"
}
$ids=@(Get-Process nwtoolset -ErrorAction SilentlyContinue|%{[uint32]$_.Id});if($ids.Count-ne1){throw "toolset_process_unavailable: expected exactly one nwtoolset process, found $($ids.Count)."}
$script:frames=@();$top=[AuroraVclReadOnly+EnumWindowsProc]{param($h,$l)[uint32]$windowProcessId=0;[void][AuroraVclReadOnly]::GetWindowThreadProcessId($h,[ref]$windowProcessId);if($windowProcessId-eq$ids[0]-and[AuroraVclReadOnly]::IsWindowVisible($h)){$script:frames+=,[pscustomobject]@{hwnd=$h;title=(Text $h);className=(Class $h)}};return $true};[void][AuroraVclReadOnly]::EnumWindows($top,[IntPtr]::Zero)
$frame=@($script:frames|?{$_.title.EndsWith(" - $env:ATV_MODULE",[StringComparison]::OrdinalIgnoreCase)})|select -First 1;if($null-eq$frame){throw 'toolset_module_window_unavailable: exact loaded module frame not found.'};$screen=[Windows.Forms.Screen]::FromHandle($frame.hwnd);if($screen.DeviceName-ne$env:ATV_DISPLAY-or$screen.Primary){throw "toolset_physical_second_display_required: expected=$env:ATV_DISPLAY actual=$($screen.DeviceName) primary=$($screen.Primary)"}
$script:viewers=@();$child=[AuroraVclReadOnly+EnumWindowsProc]{param($h,$l)$title=(Text $h).Trim();if($title.StartsWith('-')){$title=$title.Substring(1).Trim()};if((Class $h)-eq'TfrmViewerArea'-and$title-eq$env:ATV_AREA){$script:viewers+=,$h};return $true};[void][AuroraVclReadOnly]::EnumChildWindows($frame.hwnd,$child,[IntPtr]::Zero);if($script:viewers.Count-ne1){throw "toolset_viewer_unavailable: expected one exact TfrmViewerArea, found $($script:viewers.Count)."}
$viewer=$script:viewers[0];$process=[AuroraVclReadOnly]::OpenProcess(0x410,$false,$ids[0]);if($process-eq[IntPtr]::Zero){throw "toolset_process_read_unavailable: win32=$([Runtime.InteropServices.Marshal]::GetLastWin32Error())"};try{$viewerBinding=$null;$viewerError=$null;try{$viewerBinding=Find-VclObject $viewer $process 'TfrmViewerArea'}catch{$viewerError=$_.Exception.Message};$frameBinding=$null;$frameError=$null;try{$frameBinding=Find-VclObject $frame.hwnd $process 'TfrmFrame'}catch{$frameError=$_.Exception.Message};if($null-eq$viewerBinding){throw "toolset_vcl_object_slot_unavailable: viewer=$viewerError"};$fieldTableAddress=[IntPtr][int64](Read-U32 $process ([IntPtr]($viewerBinding.vmt.ToInt64()-68)));if($fieldTableAddress-eq[IntPtr]::Zero){throw 'toolset_viewer_field_table_unavailable: TfrmViewerArea VMT has no field table.'};$fieldCount=Read-U16 $process $fieldTableAddress;if($fieldCount-lt1-or$fieldCount-gt1024){throw "toolset_viewer_field_table_invalid: count=$fieldCount"};$publishedFields=@();$cursor=$fieldTableAddress.ToInt64()+6;for($index=0;$index-lt$fieldCount;$index++){$header=Read-Bytes $process ([IntPtr]$cursor) 7;$fieldOffset=[BitConverter]::ToUInt32($header,0);$typeIndex=[BitConverter]::ToUInt16($header,4);$nameLength=[int]$header[6];if($nameLength-lt1-or$nameLength-gt127){throw "toolset_viewer_field_entry_invalid: index=$index nameLength=$nameLength"};$fieldName=[Text.Encoding]::ASCII.GetString((Read-Bytes $process ([IntPtr]($cursor+7)) $nameLength));$publishedFields+=,[pscustomobject]@{name=$fieldName;offset=('0x{0:X}' -f $fieldOffset);offsetValue=$fieldOffset;typeIndex=$typeIndex};$cursor+=7+$nameLength};$glPanelField=@($publishedFields|?{$_.name-eq'GLPanel'})|select -First 1;if($null-eq$glPanelField){throw 'toolset_gl_panel_field_unavailable: TfrmViewerArea field table has no GLPanel.'};$panelAddress=[IntPtr][int64](Read-U32 $process ([IntPtr]($viewerBinding.object.ToInt64()+$glPanelField.offsetValue)));if($panelAddress-eq[IntPtr]::Zero){throw 'toolset_aurora_panel_pointer_unavailable: GLPanel field was null.'};$panelVmt=[IntPtr][int64](Read-U32 $process $panelAddress);$panelClassNames=@();foreach($offset in 16..160|?{$_%4-eq0}){try{$nameAddress=Read-U32 $process ([IntPtr]($panelVmt.ToInt64()-$offset));if($nameAddress-eq0){continue};$short=Try-ShortString (Read-Bytes $process ([IntPtr][int64]$nameAddress) 64);if($short){$panelClassNames+=,[pscustomobject]@{vmtOffset=-$offset;value=$short}}}catch{}};if(-not@($panelClassNames|?{$_.value-eq'TAuroraPanel'})){throw "toolset_aurora_panel_binding_invalid: GLPanel did not resolve to TAuroraPanel; names=$($panelClassNames|ConvertTo-Json -Compress)"};$cameraAddress=[IntPtr][int64](Read-U32 $process ([IntPtr]($panelAddress.ToInt64()+0x2cc)));if($cameraAddress-eq[IntPtr]::Zero){throw 'toolset_camera_pointer_unavailable: TAuroraPanel+0x2cc was null.'};$cameraVmt=[IntPtr][int64](Read-U32 $process $cameraAddress);$cameraVtable=@();foreach($offset in 0..32|%{$_*4}){$functionAddress=Read-U32 $process ([IntPtr]($cameraVmt.ToInt64()+$offset));$cameraVtable+=,[pscustomobject]@{offset=('0x{0:X}' -f $offset);address=('0x{0:X8}' -f $functionAddress)}};[pscustomobject]@{status='camera_bound_read_only';processId=$ids[0];area=$env:ATV_AREA;viewerClass=(Class $viewer);viewerHwnd=('0x{0:X}' -f $viewer.ToInt64());viewerBinding=$viewerBinding;viewerBindingError=$viewerError;viewerPublishedFields=$publishedFields;auroraPanelBinding=[pscustomobject]@{provenance='delphi-published-field-table';fieldName=$glPanelField.name;viewerOffset=$glPanelField.offset;address=('0x{0:X}' -f $panelAddress.ToInt64());vmtAddress=('0x{0:X}' -f $panelVmt.ToInt64());classNames=$panelClassNames};cameraBinding=[pscustomobject]@{provenance='decompilation-pinned-field';panelOffset='0x2CC';address=('0x{0:X}' -f $cameraAddress.ToInt64());vmtAddress=('0x{0:X}' -f $cameraVmt.ToInt64());vtable=$cameraVtable};frameBinding=$frameBinding;frameBindingError=$frameError;screen=[pscustomobject]@{device=$screen.DeviceName;primary=$screen.Primary};safety=[pscustomobject]@{processStarted=$false;processMemoryWrites=$false;codeInjected=$false;windowMessagesSent=$false;screenCaptured=$false;globalInput=$false}}|ConvertTo-Json -Depth 8 -Compress}finally{[void][AuroraVclReadOnly]::CloseHandle($process)}
`;

try {
  const stdout = execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    env: { ...process.env, ATV_AREA: area, ATV_MODULE: moduleName, ATV_DISPLAY: approvedDisplay },
  });
  const binding = JSON.parse(stdout.trim());
  const result = {
    ...binding,
    binary: { path: binaryPath, sha256: binarySha256 },
    adapter: {
      status: "bound_not_camera_readable",
      readback: "vcl_object_binding",
      provenance: "native_toolset",
      reason: "The exact version-pinned TfrmViewerArea VCL object is bound read-only, but no decompilation-proven CAurCamera getter/offset is available.",
    },
  };
  writeResult(result);
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  const detail = String(error?.stderr ?? error?.message ?? "").trim();
  const match = detail.match(/(toolset_[a-z_]+:[^\r\n]*)/i);
  const failure = { status: "blocked", blockerCode: match ? match[1].split(":")[0] : "toolset_vcl_readonly_probe_failed", reason: match ? match[1] : detail, safety: { processStarted: false, processMemoryWrites: false, codeInjected: false, windowMessagesSent: false, screenCaptured: false, globalInput: false } };
  writeResult(failure);
  process.stderr.write(`${JSON.stringify(failure)}\n`);
  process.exitCode = 1;
}

function writeResult(result) {
  if (!options.out) return;
  const outPath = resolve(String(options.out));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

function parseArgs(args) { const output = {}; for (let index = 0; index < args.length; index += 1) { const key = args[index]; if (!key.startsWith("--")) throw new Error(`Unexpected argument ${key}.`); output[key.slice(2)] = args[++index]; } return output; }
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
