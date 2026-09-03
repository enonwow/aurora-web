#!/usr/bin/env node
/**
 * Version-pinned, read-only native camera binding probe for Aurora Toolset.
 *
 * Provenance chain:
 * HWND -> Delphi ControlOfs property -> TfrmViewerArea -> exact event-handler
 * VMT -> decompiled +0x3D0 TAuroraPanel -> decompiled +0x2CC camera object.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const area = required(options.area, "--area").toLowerCase();
const moduleName = String(options.module ?? "the_last_city - codex.mod").trim();
const approvedDisplay = String(options.display ?? "\\\\.\\DISPLAY1").trim();
const binaryPath = resolve(String(options.binaryPath ?? "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Neverwinter Nights\\bin\\win32\\nwtoolset.exe"));
const expectedBinarySha256 = "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24";
if (!existsSync(binaryPath)) throw new Error(`Toolset binary does not exist: ${binaryPath}`);
const binarySha256 = createHash("sha256").update(readFileSync(binaryPath)).digest("hex").toUpperCase();
if (binarySha256 !== expectedBinarySha256) throw new Error(`toolset_binary_hash_mismatch: expected=${expectedBinarySha256} actual=${binarySha256}`);

const script = String.raw`
$ErrorActionPreference='Stop'
$null=Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Collections.Generic;
using System.Text;
using System.Runtime.InteropServices;
public static class AuroraNativeCameraReadOnly {
  [StructLayout(LayoutKind.Sequential)]
  public struct MEMORY_BASIC_INFORMATION {
    public IntPtr BaseAddress;
    public IntPtr AllocationBase;
    public uint AllocationProtect;
    public UIntPtr RegionSize;
    public uint State;
    public uint Protect;
    public uint Type;
  }
  public delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lparam);
  public delegate IntPtr EnumPropsExProc(IntPtr hwnd, IntPtr name, IntPtr value, IntPtr lparam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lparam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc callback, IntPtr lparam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint processId);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int count);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hwnd, StringBuilder text, int count);
  [DllImport("user32.dll", EntryPoint="EnumPropsExW")] public static extern int EnumPropsEx(IntPtr hwnd, EnumPropsExProc callback, IntPtr lparam);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern IntPtr OpenProcess(uint access, bool inheritHandle, uint processId);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool ReadProcessMemory(IntPtr process, IntPtr address, byte[] buffer, int size, out IntPtr bytesRead);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern UIntPtr VirtualQueryEx(IntPtr process, IntPtr address, out MEMORY_BASIC_INFORMATION information, UIntPtr length);
  [DllImport("kernel32.dll", SetLastError=true)] public static extern bool CloseHandle(IntPtr handle);
  public static int[] FindAlignedUInt32(byte[] buffer, uint target) {
    var hits = new List<int>();
    for (int index = 0; index <= buffer.Length - 4; index += 4) {
      if (BitConverter.ToUInt32(buffer, index) == target) hits.Add(index);
    }
    return hits.ToArray();
  }
  public static long[] FindUInt32InProcess(IntPtr process, uint target) {
    var hits = new List<long>();
    long cursor = 0x10000;
    const long limit = 0x80000000;
    int informationSize = Marshal.SizeOf(typeof(MEMORY_BASIC_INFORMATION));
    while (cursor < limit) {
      MEMORY_BASIC_INFORMATION information;
      UIntPtr queried = VirtualQueryEx(process, new IntPtr(cursor), out information, new UIntPtr((uint)informationSize));
      if (queried == UIntPtr.Zero) break;
      long baseAddress = information.BaseAddress.ToInt64();
      long regionSize = unchecked((long)information.RegionSize.ToUInt64());
      if (regionSize <= 0) break;
      bool readable = information.State == 0x1000 && (information.Protect & 0x100) == 0 && (information.Protect & 0xff) != 1;
      if (readable) {
        const int chunkSize = 0x100000;
        for (long offset = 0; offset < regionSize; offset += chunkSize) {
          int count = (int)Math.Min(chunkSize, regionSize - offset);
          var buffer = new byte[count];
          IntPtr bytesRead;
          if (!ReadProcessMemory(process, new IntPtr(baseAddress + offset), buffer, count, out bytesRead)) continue;
          int available = Math.Min(count, bytesRead.ToInt32());
          for (int index = 0; index <= available - 4; index += 4) {
            if (BitConverter.ToUInt32(buffer, index) == target) hits.Add(baseAddress + offset + index);
          }
        }
      }
      long next = baseAddress + regionSize;
      if (next <= cursor) break;
      cursor = next;
    }
    return hits.ToArray();
  }
}
'@
function Text([IntPtr]$h){$b=New-Object Text.StringBuilder 1024;[void][AuroraNativeCameraReadOnly]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function Class([IntPtr]$h){$b=New-Object Text.StringBuilder 256;[void][AuroraNativeCameraReadOnly]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Read-Bytes([IntPtr]$p,[IntPtr]$a,[int]$n){$b=New-Object byte[] $n;$r=[IntPtr]::Zero;if(-not[AuroraNativeCameraReadOnly]::ReadProcessMemory($p,$a,$b,$n,[ref]$r)){throw "ReadProcessMemory failed at 0x$($a.ToInt64().ToString('X')) win32=$([Runtime.InteropServices.Marshal]::GetLastWin32Error())"};if($r.ToInt64()-lt$n){throw "Short ReadProcessMemory at 0x$($a.ToInt64().ToString('X'))"};$b}
function Read-U16([IntPtr]$p,[IntPtr]$a){[BitConverter]::ToUInt16((Read-Bytes $p $a 2),0)}
function Read-U32([IntPtr]$p,[IntPtr]$a){[BitConverter]::ToUInt32((Read-Bytes $p $a 4),0)}
function Read-F32([IntPtr]$p,[IntPtr]$a){[BitConverter]::ToSingle((Read-Bytes $p $a 4),0)}
function Try-ShortString([byte[]]$b){if($b.Length-lt2){return $null};$n=[int]$b[0];if($n-lt1-or$n-gt100-or$b.Length-lt$n+1){return $null};$s=[Text.Encoding]::ASCII.GetString($b,1,$n);if($s-match'^[A-Za-z_][A-Za-z0-9_]*$'){$s}else{$null}}
function Vmt-ClassNames([IntPtr]$p,[IntPtr]$vmt){$names=@();foreach($offset in 16..160|?{$_%4-eq0}){try{$nameAddress=Read-U32 $p ([IntPtr]($vmt.ToInt64()-$offset));if($nameAddress-eq0){continue};$name=Try-ShortString (Read-Bytes $p ([IntPtr][int64]$nameAddress) 104);if($name){$names+=,[pscustomobject]@{vmtOffset=-$offset;value=$name}}}catch{}};$names}
function Property-Name([IntPtr]$name){if($name.ToInt64()-ge0-and$name.ToInt64()-le0xffff){return ('#atom:{0}' -f $name.ToInt64())};try{[Runtime.InteropServices.Marshal]::PtrToStringUni($name)}catch{'<unreadable>'}}
function Bind-DelphiWindow([IntPtr]$window,[IntPtr]$process,[string]$expectedClass){$script:props=@();$callback=[AuroraNativeCameraReadOnly+EnumPropsExProc]{param($h,$name,$value,$l);if($value-ne[IntPtr]::Zero){$script:props+=,[pscustomobject]@{name=(Property-Name $name);value=$value}};return [IntPtr]1};[void][AuroraNativeCameraReadOnly]::EnumPropsEx($window,$callback,[IntPtr]::Zero);$inspected=@();foreach($property in $script:props){try{$vmt=[IntPtr][int64](Read-U32 $process $property.value);$names=Vmt-ClassNames $process $vmt;$inspected+=,[pscustomobject]@{propertyName=$property.name;address=('0x{0:X}'-f$property.value.ToInt64());vmtAddress=('0x{0:X}'-f$vmt.ToInt64());classNames=$names};if(@($names|?{$_.value-eq$expectedClass})){return [pscustomobject]@{object=$property.value;vmt=$vmt;propertyName=$property.name;className=$expectedClass;inspected=$inspected}}}catch{}};throw "toolset_vcl_object_slot_unavailable: no validated $expectedClass property; inspected=$($inspected|ConvertTo-Json -Compress)"}
function Parse-FieldTable([IntPtr]$p,[IntPtr]$vmt){$table=[IntPtr][int64](Read-U32 $p ([IntPtr]($vmt.ToInt64()-68)));if($table-eq[IntPtr]::Zero){throw 'Delphi field table pointer is null.'};$count=Read-U16 $p $table;if($count-lt1-or$count-gt1024){throw "Invalid Delphi field count $count."};$cursor=$table.ToInt64()+6;$fields=@();for($i=0;$i-lt$count;$i++){$header=Read-Bytes $p ([IntPtr]$cursor) 7;$offset=[BitConverter]::ToUInt32($header,0);$typeIndex=[BitConverter]::ToUInt16($header,4);$length=[int]$header[6];if($length-lt1-or$length-gt127){throw "Invalid Delphi field name length $length at $i."};$name=[Text.Encoding]::ASCII.GetString((Read-Bytes $p ([IntPtr]($cursor+7)) $length));$fields+=,[pscustomobject]@{name=$name;offsetValue=$offset;offset=('0x{0:X}'-f$offset);typeIndex=$typeIndex};$cursor+=7+$length};$fields}
function Find-ObjectsByVmt([IntPtr]$p,[uint32]$target){@([AuroraNativeCameraReadOnly]::FindUInt32InProcess($p,$target)|%{[IntPtr]$_})}

$ids=@(Get-Process nwtoolset -ErrorAction SilentlyContinue|%{[uint32]$_.Id});if($ids.Count-ne1){throw "toolset_process_unavailable: expected one nwtoolset process, found $($ids.Count)."}
$script:frames=@();$top=[AuroraNativeCameraReadOnly+EnumWindowsProc]{param($h,$l)[uint32]$windowProcessId=0;[void][AuroraNativeCameraReadOnly]::GetWindowThreadProcessId($h,[ref]$windowProcessId);if($windowProcessId-eq$ids[0]-and[AuroraNativeCameraReadOnly]::IsWindowVisible($h)){$script:frames+=,[pscustomobject]@{hwnd=$h;title=(Text $h);className=(Class $h)}};return $true};[void][AuroraNativeCameraReadOnly]::EnumWindows($top,[IntPtr]::Zero)
$frame=@($script:frames|?{$_.title.EndsWith(" - $env:ANC_MODULE",[StringComparison]::OrdinalIgnoreCase)})|select -First 1;if($null-eq$frame){throw 'toolset_module_window_unavailable: exact module frame not found.'};$screen=[Windows.Forms.Screen]::FromHandle($frame.hwnd);if($screen.DeviceName-ne$env:ANC_DISPLAY-or$screen.Primary){throw "toolset_physical_second_display_required: expected=$env:ANC_DISPLAY actual=$($screen.DeviceName) primary=$($screen.Primary)"}
$script:viewers=@();$child=[AuroraNativeCameraReadOnly+EnumWindowsProc]{param($h,$l)$title=(Text $h).Trim();if($title.StartsWith('-')){$title=$title.Substring(1).Trim()};if((Class $h)-eq'TfrmViewerArea'-and$title-eq$env:ANC_AREA){$script:viewers+=,$h};return $true};[void][AuroraNativeCameraReadOnly]::EnumChildWindows($frame.hwnd,$child,[IntPtr]::Zero);if($script:viewers.Count-ne1){throw "toolset_viewer_unavailable: expected one exact TfrmViewerArea, found $($script:viewers.Count)."}
$process=[AuroraNativeCameraReadOnly]::OpenProcess(0x410,$false,$ids[0]);if($process-eq[IntPtr]::Zero){throw "toolset_process_read_unavailable: win32=$([Runtime.InteropServices.Marshal]::GetLastWin32Error())"}
try{
  $viewer=Bind-DelphiWindow $script:viewers[0] $process 'TfrmViewerArea';$fields=Parse-FieldTable $process $viewer.vmt;$glPanel=@($fields|?{$_.name-eq'GLPanel'})|select -First 1;if($null-eq$glPanel){throw 'toolset_gl_panel_field_unavailable: no published GLPanel.'};$scrollBoxAddress=[IntPtr][int64](Read-U32 $process ([IntPtr]($viewer.object.ToInt64()+$glPanel.offsetValue)));$scrollBoxVmt=[IntPtr][int64](Read-U32 $process $scrollBoxAddress);$scrollBoxNames=Vmt-ClassNames $process $scrollBoxVmt;if(-not@($scrollBoxNames|?{$_.value-eq'TScrollBox'})){throw 'toolset_gl_panel_binding_invalid: GLPanel is not TScrollBox.'}
  $cameraAddress=[IntPtr][int64](Read-U32 $process ([IntPtr]($viewer.object.ToInt64()+0x5A8)));if($cameraAddress-eq[IntPtr]::Zero){throw 'toolset_camera_pointer_unavailable: TfrmViewerArea+0x5A8 was null.'};$cameraVmt=[IntPtr][int64](Read-U32 $process $cameraAddress);if($cameraVmt.ToInt64()-ne0x00CC0164){throw "toolset_camera_vmt_mismatch: expected=0xCC0164 actual=0x$($cameraVmt.ToInt64().ToString('X'))"};$positionSetter=Read-U32 $process ([IntPtr]($cameraVmt.ToInt64()+0x18));$orientationSetter=Read-U32 $process ([IntPtr]($cameraVmt.ToInt64()+0x1C));if($positionSetter-ne0x00A21044-or$orientationSetter-ne0x00A21084){throw "toolset_camera_vtable_mismatch: position=0x$($positionSetter.ToString('X')) orientation=0x$($orientationSetter.ToString('X'))"};$position=@();foreach($offset in 0x80,0x84,0x88){$position+=,(Read-F32 $process ([IntPtr]($cameraAddress.ToInt64()+$offset)))};$orientation=@();foreach($offset in 0x8C,0x90,0x94,0x98){$orientation+=,(Read-F32 $process ([IntPtr]($cameraAddress.ToInt64()+$offset)))};$projection=[pscustomobject]@{field_0x4EC=(Read-F32 $process ([IntPtr]($cameraAddress.ToInt64()+0x4EC)));field_0x4F0=(Read-F32 $process ([IntPtr]($cameraAddress.ToInt64()+0x4F0)));field_0x4F4=(Read-F32 $process ([IntPtr]($cameraAddress.ToInt64()+0x4F4)));field_0x4F8=(Read-F32 $process ([IntPtr]($cameraAddress.ToInt64()+0x4F8)))};[pscustomobject]@{status='camera_bound_read_only';processId=$ids[0];area=$env:ANC_AREA;viewer=[pscustomobject]@{hwnd=('0x{0:X}'-f$script:viewers[0].ToInt64());object=('0x{0:X}'-f$viewer.object.ToInt64());vmt=('0x{0:X}'-f$viewer.vmt.ToInt64());instanceSize=(Read-U32 $process ([IntPtr]($viewer.vmt.ToInt64()-52)));propertyName=$viewer.propertyName};glPanel=[pscustomobject]@{fieldOffset=$glPanel.offset;object=('0x{0:X}'-f$scrollBoxAddress.ToInt64());classNames=$scrollBoxNames};camera=[pscustomobject]@{provenance='FUN_0067437c TfrmViewerArea constructor: viewer+0x5A8=FUN_00a214d0("camera")';viewerOffset='0x5A8';object=('0x{0:X}'-f$cameraAddress.ToInt64());vmt=('0x{0:X}'-f$cameraVmt.ToInt64());validatedMethods=[pscustomobject]@{setPosition='0x00A21044';setOrientation='0x00A21084'};position=$position;orientation=$orientation;projection=$projection};screen=[pscustomobject]@{device=$screen.DeviceName;primary=$screen.Primary};safety=[pscustomobject]@{processStarted=$false;processMemoryWrites=$false;codeInjected=$false;windowMessagesSent=$false;screenCaptured=$false;globalInput=$false}}|ConvertTo-Json -Depth 9 -Compress;return
  $eventHandlerVmt=[IntPtr][int64](Read-U32 $process ([IntPtr][int64]0x00BBBE8C));$instanceSize=Read-U32 $process ([IntPtr]($viewer.vmt.ToInt64()-52));$vmtCandidates=@(Find-ObjectsByVmt $process ([uint32]($eventHandlerVmt.ToInt64())));$matches=@();$rejected=@();foreach($candidate in $vmtCandidates){try{$panelCandidate=[IntPtr][int64](Read-U32 $process ([IntPtr]($candidate.ToInt64()+0x3D0)));if($panelCandidate-eq[IntPtr]::Zero){$rejected+=,[pscustomobject]@{address=('0x{0:X}'-f$candidate.ToInt64());reason='panel_null'};continue};$panelCandidateVmt=[IntPtr][int64](Read-U32 $process $panelCandidate);$names=Vmt-ClassNames $process $panelCandidateVmt;if(-not@($names|?{$_.value-eq'TAuroraPanel'})){$rejected+=,[pscustomobject]@{address=('0x{0:X}'-f$candidate.ToInt64());panel=('0x{0:X}'-f$panelCandidate.ToInt64());panelVmt=('0x{0:X}'-f$panelCandidateVmt.ToInt64());names=$names;reason='panel_class_mismatch'};continue};$viewerBackReferences=@();foreach($offset in 0..127|%{$_*4}){if((Read-U32 $process ([IntPtr]($candidate.ToInt64()+$offset)))-eq[uint32]($viewer.object.ToInt64())){$viewerBackReferences+=,('0x{0:X}'-f$offset)}};$matches+=,[pscustomobject]@{addressValue=$candidate.ToInt64();address=('0x{0:X}'-f$candidate.ToInt64());viewerBackReferences=$viewerBackReferences}}catch{$rejected+=,[pscustomobject]@{address=('0x{0:X}'-f$candidate.ToInt64());reason=$_.Exception.Message}}};if($matches.Count-ne1){$viewerVtable=@();foreach($offset in 0..128|%{$_*4}){$viewerVtable+=,[pscustomobject]@{offset=('0x{0:X}'-f$offset);address=('0x{0:X8}'-f(Read-U32 $process ([IntPtr]($viewer.vmt.ToInt64()+$offset))))}};[pscustomobject]@{status='diagnostic_no_camera_binding';processId=$ids[0];area=$env:ANC_AREA;viewer=[pscustomobject]@{object=('0x{0:X}'-f$viewer.object.ToInt64());vmt=('0x{0:X}'-f$viewer.vmt.ToInt64());instanceSize=$instanceSize;vtable=$viewerVtable};publishedFields=$fields;publishedObjectBindings=$publishedObjectBindings;internalBindings=$internalBindings;eventHandlerProbe=[pscustomobject]@{vmt=('0x{0:X}'-f$eventHandlerVmt.ToInt64());rawCandidates=@($vmtCandidates|%{('0x{0:X}'-f$_.ToInt64())});rejected=$rejected};safety=[pscustomobject]@{processStarted=$false;processMemoryWrites=$false;codeInjected=$false;windowMessagesSent=$false;screenCaptured=$false;globalInput=$false}}|ConvertTo-Json -Depth 9 -Compress;return};$eventHandler=[IntPtr][int64]$matches[0].addressValue
  $panel=[IntPtr][int64](Read-U32 $process ([IntPtr]($eventHandler.ToInt64()+0x3D0)));if($panel-eq[IntPtr]::Zero){throw 'toolset_aurora_panel_pointer_unavailable: event handler+0x3D0 was null.'};$panelVmt=[IntPtr][int64](Read-U32 $process $panel);$panelNames=Vmt-ClassNames $process $panelVmt;if(-not@($panelNames|?{$_.value-eq'TAuroraPanel'})){throw "toolset_aurora_panel_binding_invalid: names=$($panelNames|ConvertTo-Json -Compress)"}
  $camera=[IntPtr][int64](Read-U32 $process ([IntPtr]($panel.ToInt64()+0x2CC)));if($camera-eq[IntPtr]::Zero){throw 'toolset_camera_pointer_unavailable: TAuroraPanel+0x2CC was null.'};$cameraVmt=[IntPtr][int64](Read-U32 $process $camera);$vtable=@();foreach($offset in 0..48|%{$_*4}){$address=Read-U32 $process ([IntPtr]($cameraVmt.ToInt64()+$offset));$vtable+=,[pscustomobject]@{offset=('0x{0:X}'-f$offset);address=('0x{0:X8}'-f$address)}}
  [pscustomobject]@{status='camera_bound_read_only';processId=$ids[0];area=$env:ANC_AREA;viewer=[pscustomobject]@{hwnd=('0x{0:X}'-f$script:viewers[0].ToInt64());object=('0x{0:X}'-f$viewer.object.ToInt64());vmt=('0x{0:X}'-f$viewer.vmt.ToInt64());instanceSize=$instanceSize;propertyName=$viewer.propertyName};glPanel=[pscustomobject]@{fieldOffset=$glPanel.offset;object=('0x{0:X}'-f$scrollBoxAddress.ToInt64());classNames=$scrollBoxNames};eventHandler=[pscustomobject]@{vmtSource='decompilation PTR_PTR_00BBBE8C dereferenced to runtime VMT plus validated TAuroraPanel chain';vmt=('0x{0:X}'-f$eventHandlerVmt.ToInt64());viewerBackReferences=$matches[0].viewerBackReferences;object=$matches[0].address};auroraPanel=[pscustomobject]@{eventHandlerOffset='0x3D0';object=('0x{0:X}'-f$panel.ToInt64());vmt=('0x{0:X}'-f$panelVmt.ToInt64());classNames=$panelNames};camera=[pscustomobject]@{panelOffset='0x2CC';object=('0x{0:X}'-f$camera.ToInt64());vmt=('0x{0:X}'-f$cameraVmt.ToInt64());vtable=$vtable};screen=[pscustomobject]@{device=$screen.DeviceName;primary=$screen.Primary};safety=[pscustomobject]@{processStarted=$false;processMemoryWrites=$false;codeInjected=$false;windowMessagesSent=$false;screenCaptured=$false;globalInput=$false}}|ConvertTo-Json -Depth 9 -Compress
}finally{[void][AuroraNativeCameraReadOnly]::CloseHandle($process)}
`;

try {
  const executableScript = script;
  const stdout = execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", executableScript], {
    encoding: "utf8",
    env: { ...process.env, ANC_AREA: area, ANC_MODULE: moduleName, ANC_DISPLAY: approvedDisplay },
  });
  const binding = JSON.parse(stdout.trim());
  const nativeState = deriveNativeState(binding.camera);
  const result = {
    ...binding,
    camera: { ...binding.camera, nativeState },
    readback: {
      provenance: "native_toolset",
      area: binding.area,
      camera: nativeState,
    },
    binary: { path: binaryPath, sha256: binarySha256 },
  };
  writeResult(result);
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  const detail = String(error?.stderr ?? error?.message ?? "").trim();
  const match = detail.match(/(toolset_[a-z_]+:[^\r\n]*)/i);
  const result = { status: "blocked", blockerCode: match ? match[1].split(":")[0] : "toolset_native_camera_probe_failed", reason: match ? match[1] : detail, safety: { processStarted: false, processMemoryWrites: false, codeInjected: false, windowMessagesSent: false, screenCaptured: false, globalInput: false }, binary: { path: binaryPath, sha256: binarySha256 } };
  writeResult(result);
  process.stderr.write(`${JSON.stringify(result)}\n`);
  process.exitCode = 1;
}

function writeResult(result) { if (!options.out) return; const outPath = resolve(String(options.out)); mkdirSync(dirname(outPath), { recursive: true }); writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8"); }
function deriveNativeState(camera) {
  const [centreOrCameraX, centreOrCameraY, cameraZ] = camera.position.map(Number);
  const [w, x, y, z] = camera.orientation.map(Number);
  const norm = Math.hypot(w, x, y, z);
  if (!(norm > 0)) throw new Error("toolset_camera_orientation_invalid: zero quaternion.");
  const q = [w / norm, x / norm, y / norm, z / norm];
  const [qw, qx, qy, qz] = q;
  const forward = {
    x: -2 * (qx * qz + qw * qy),
    y: -2 * (qy * qz - qw * qx),
    z: -(1 - 2 * (qx * qx + qy * qy)),
  };
  if (!(forward.z < -1e-6)) throw new Error(`toolset_camera_ground_focus_unavailable: forward.z=${forward.z}`);
  const zoom = -cameraZ / forward.z;
  const centreX = centreOrCameraX + forward.x * zoom;
  const centreY = centreOrCameraY + forward.y * zoom;
  const yawDegrees = periodicDegrees(Math.atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qy * qy + qz * qz)) * 180 / Math.PI);
  const pitchDegrees = Math.asin(Math.max(-1, Math.min(1, -forward.z))) * 180 / Math.PI;
  return {
    yawDegrees: rounded(yawDegrees),
    pitchDegrees: rounded(pitchDegrees),
    zoom: rounded(zoom),
    centreX: rounded(centreX),
    centreY: rounded(centreY),
    forward: Object.fromEntries(Object.entries(forward).map(([key, value]) => [key, rounded(value)])),
    definitions: {
      yawDegrees: "full world yaw from version-pinned native camera quaternion",
      pitchDegrees: "visual elevation above the ground plane; 90 is top-down",
      zoom: "native camera distance to the z=0 focus plane",
      centre: "native camera forward-ray intersection with the z=0 focus plane",
    },
  };
}
function periodicDegrees(value) { return ((value % 360) + 360) % 360; }
function rounded(value) { return Math.round(value * 1e6) / 1e6; }
function parseArgs(args) { const output = {}; for (let i = 0; i < args.length; i += 1) { const key = args[i]; if (!key.startsWith("--")) throw new Error(`Unexpected argument ${key}.`); output[key.slice(2)] = args[++i]; } return output; }
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
