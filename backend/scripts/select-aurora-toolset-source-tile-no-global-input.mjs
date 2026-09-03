#!/usr/bin/env node
/**
 * Canonical source-targeted tile selection. `plan` is offline; `execute`
 * requires an explicit live gate and sends input only to the validated Area
 * TScrollBox on the approved non-primary physical display.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeAuroraToolsetSelectionAnchor, analyzeAuroraToolsetSelectionDelta } from "./analyze-aurora-toolset-selection-anchor.mjs";
import { resolveSourceTileTarget } from "./lib/aurora-toolset-viewport-target-standard.mjs";
import { projectAuroraSourceTile } from "./lib/aurora-source-grid-projection.mjs";
import { verifySourceTargetedSelection } from "./lib/aurora-source-targeted-selection-proof.mjs";

const scriptPath=fileURLToPath(import.meta.url); const scriptDir=dirname(scriptPath);
if(process.argv[1]&&resolve(process.argv[1])===scriptPath) main();

function main(){
 const [command,...argv]=process.argv.slice(2); const options=parseArgs(argv);
 if(!["plan","execute"].includes(command))throw new Error("Use: plan|execute --tileLayout <json> --projection <json> --observation <json> --module <name> --area <resref> --outDir <dir> [tile selector]");
 const plan=buildPlan(options);
 if(command==="plan"){console.log(JSON.stringify(plan,null,2));return;}
 // Live execution is deliberately disabled after the 2026-07-16 audit proved
 // that dispatchTargetedSelection still routes through legacy viewer
 // WM_COMMAND 73. In the retail VCL build that command can focus a disabled or
 // invisible child and opens a modal error. Keep offline planning available,
 // but fail before capture or UI mutation until a separately verified toolbar
 // transport replaces the legacy command.
 throw codedError("legacy_viewer_selection_command_forbidden","Live source-tile selection is disabled: the executor's legacy TfrmViewerArea WM_COMMAND 73 transport is unsafe. Use a source-centred native camera proof plus an exact context-menu transaction for Tile Properties.");
 if(options.execute!=="true"||process.env.AURORA_TOOLSET_EXPLICIT_LIVE_SELECTION!=="1")throw codedError("toolset_live_selection_explicit_gate_required","Live selection requires both --execute true and AURORA_TOOLSET_EXPLICIT_LIVE_SELECTION=1.");
 const result=execute(plan,options); console.log(JSON.stringify(result,null,2)); if(result.status!=="verified")process.exitCode=2;
}

export function buildPlan(options){
 const layoutDocument=readJson(options.tileLayout,"--tileLayout"), layout=normalizeTileLayout(layoutDocument), observation=readJson(options.observation,"--observation");
 const tile=resolveSourceTileTarget({tileLayout:layout,tileIndex:optionalInteger(options.tileIndex),tileX:optionalInteger(options.tileX),tileY:optionalInteger(options.tileY),tileId:optionalInteger(options.tileId),orientation:optionalInteger(options.orientation)});
 const bounds=observation?.capture?.viewportBounds;
 const nativeReadback=options.nativeReadback?readJson(options.nativeReadback,"--nativeReadback"):null;
 const projected=nativeReadback
  ? projectNativeCentredSourceTile({nativeReadback,tile,area:requiredText(options.area,"--area"),viewportBounds:bounds})
  : projectAuroraSourceTile({projection:readJson(options.projection,"--projection"),tile,viewportBounds:bounds,marginPixels:Number(options.marginPixels??12)});
 if(projected.status!=="projected")return{status:"blocked",blockerCode:projected.blockerCode,reason:projected.reason,plan:null};
 return {status:"planned",version:"aurora-source-targeted-selection-execution/v1",module:requiredText(options.module,"--module"),area:requiredText(options.area,"--area").toLowerCase(),sourceTile:tile,click:projected.projectedCenter,targetingEvidence:projected.targetingEvidence??null,viewportBounds:{width:Number(bounds.width),height:Number(bounds.height)},safety:{launchesToolset:false,requiresExistingSingleToolsetProcess:true,approvedPhysicalScreenDevice:"\\\\.\\DISPLAY1",moduleScreenPrimary:false,usesGlobalCursor:false,usesGlobalKeyboard:false,usesGlobalMouse:false,executionGate:"--execute true plus AURORA_TOOLSET_EXPLICIT_LIVE_SELECTION=1"}};
}

function normalizeTileLayout(document){
 const source=document?.parsed?.tiles??document?.tiles;
 if(!Array.isArray(source))throw codedError("source_tile_layout_invalid","Tile layout must expose tiles or parsed.tiles.");
 return {tiles:source.map(tile=>({index:Number(tile.index),x:Number(tile.x??tile.col),y:Number(tile.y??tile.row),tileId:Number(tile.tileId),orientation:Number(tile.orientation)}))};
}

function projectNativeCentredSourceTile({nativeReadback,tile,area,viewportBounds}){
 if(nativeReadback?.status!=="camera_bound_read_only"||nativeReadback?.readback?.provenance!=="native_toolset")return{status:"blocked",blockerCode:"native_camera_readback_required",reason:"A ready version-pinned native camera readback is required."};
 if(String(nativeReadback.area??"").toLowerCase()!==String(area).toLowerCase())return{status:"blocked",blockerCode:"native_camera_area_mismatch",reason:"Native camera Area does not match the selection Area."};
 const camera=nativeReadback.camera?.nativeState; const centreX=Number(camera?.centreX),centreY=Number(camera?.centreY);
 const expected={x:(Number(tile.x)+0.5)*10,y:(Number(tile.y)+0.5)*10}; const errorWorld=Math.hypot(centreX-expected.x,centreY-expected.y);
 if(!Number.isFinite(errorWorld)||errorWorld>1)return{status:"blocked",blockerCode:"native_camera_not_centred_on_source_tile",reason:`Native focus is ${errorWorld} world units from the source tile centre; required <= 1.`};
 const width=Number(viewportBounds?.width),height=Number(viewportBounds?.height);if(!(width>0&&height>0))return{status:"blocked",blockerCode:"toolset_viewport_bounds_unavailable",reason:"Viewport bounds are required."};
 return{status:"projected",projectedCenter:{x:width/2,y:height/2},targetingEvidence:{kind:"native-camera-centred-source-selection/v1",nativeCameraObject:nativeReadback.camera.object,nativeCameraVmt:nativeReadback.camera.vmt,focus:{x:centreX,y:centreY},expectedTileCentre:expected,errorWorld,rule:"Validated viewport centre ray intersects the z=0 source tile centre."}};
}

function execute(plan,options){
 if(plan.status!=="planned")return plan;
 const outDir=resolve(requiredText(options.outDir,"--outDir"));mkdirSync(outDir,{recursive:true});
 const beforePath=resolve(outDir,"before.png"),afterPath=resolve(outDir,"after.png");
 runJson(resolve(scriptDir,"aurora-toolset-viewport-proof.mjs"),["capture","--module",plan.module,"--area",plan.area,"--out",beforePath]);
 const beforeAnchor=analyzeAuroraToolsetSelectionAnchor({imagePath:beforePath});
 const dispatch=dispatchTargetedSelection(plan);
 let cleanup;
 try { runJson(resolve(scriptDir,"aurora-toolset-viewport-proof.mjs"),["capture","--module",plan.module,"--area",plan.area,"--out",afterPath]); }
 finally { cleanup=restoreSelectObjects(plan); }
 const afterAnchor=analyzeAuroraToolsetSelectionAnchor({imagePath:afterPath});
 const differentialAnchor=analyzeAuroraToolsetSelectionDelta({beforeImagePath:beforePath,afterImagePath:afterPath});
 let result;
 try{result=verifySourceTargetedSelection({sourceTile:plan.sourceTile,dispatch,beforeAnchor:{acceptance:{accepted:false}},afterAnchor:differentialAnchor,viewportBounds:{left:0,top:0,...plan.viewportBounds},capturePath:afterPath});}
  catch(error){result={status:"blocked",blockerCode:error.code??"source_targeted_selection_exception",reason:error.message};}
 if(cleanup?.status!=="restored")result={status:"blocked",blockerCode:"source_targeted_selection_cleanup_failed",reason:"Selection proof was captured but Select Objects rollback was not confirmed.",proof:result,cleanup};
 return writeResult(outDir,{...result,plan,beforePath,afterPath,beforeAnchor,afterAnchor,differentialAnchor,baselineRule:"Existing scene-blue pixels are allowed; only newly blue after-before pixels can prove a fresh outline.",cleanup});
}

function restoreSelectObjects(plan){
 return restoreSelectObjectsVerified(plan);
 const script=String.raw`
$ErrorActionPreference='Stop'; Add-Type @'
using System; using System.Text; using System.Runtime.InteropServices;
public static class AuroraSelectionCleanup { public delegate bool EnumWindowsProc(IntPtr hWnd,IntPtr l); [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc c,IntPtr l); [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,EnumWindowsProc c,IntPtr l); [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p); [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n); [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l); }
'@
function Text([IntPtr]$h){$b=New-Object System.Text.StringBuilder 1024;[void][AuroraSelectionCleanup]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};$ids=@(Get-Process nwtoolset -ErrorAction SilentlyContinue|%{[uint32]$_.Id});if($ids.Count-ne 1){throw 'Toolset process count changed before cleanup.'};$script:frames=@();$cb=[AuroraSelectionCleanup+EnumWindowsProc]{param($h,$l)[uint32]$p=0;[void][AuroraSelectionCleanup]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$ids[0]-and[AuroraSelectionCleanup]::IsWindowVisible($h)){$script:frames+=,[pscustomobject]@{h=$h;title=(Text $h)}};return $true};[void][AuroraSelectionCleanup]::EnumWindows($cb,[IntPtr]::Zero);$frame=@($script:frames|?{$_.title.EndsWith(" - $env:ATS_MODULE",[StringComparison]::OrdinalIgnoreCase)})|select -First 1;if($null-eq$frame){throw 'Exact module frame missing during cleanup.'};$script:view=@();$children=[AuroraSelectionCleanup+EnumWindowsProc]{param($h,$l)$t=(Text $h).Trim();if($t.StartsWith('-')){$t=$t.Substring(1).Trim()};if($t-eq$env:ATS_AREA){$script:view+=,$h};return $true};[void][AuroraSelectionCleanup]::EnumChildWindows($frame.h,$children,[IntPtr]::Zero);if($script:view.Count-ne 1){throw 'Exact Area viewer missing during cleanup.'};[void][AuroraSelectionCleanup]::SendMessage($script:view[0],0x0111,[IntPtr]74,[IntPtr]::Zero);[pscustomobject]@{status='restored';command='Select Objects';commandId=74;usesGlobalInput=$false}|ConvertTo-Json -Compress
`;
 return JSON.parse(execFileSync("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-Command",script],{encoding:"utf8",env:{...process.env,ATS_MODULE:plan.module,ATS_AREA:plan.area},timeout:30000,windowsHide:true}).trim());
}

function restoreSelectObjectsVerified(plan) {
 const proof=JSON.parse(execFileSync(process.execPath,[resolve(scriptDir,"set-aurora-toolset-selection-mode-no-global-input.mjs"),"--module",plan.module,"--mode","objects"],{encoding:"utf8",maxBuffer:1024*1024,timeout:30000,windowsHide:true}).trim());
 return {status:"restored",command:"Select Objects",toolbarHwnd:proof.toolbarHwnd,targetIndex:proof.targetIndex,nativeCommandId:proof.after?.[proof.targetIndex]?.commandId,buttons:proof.after,usesGlobalInput:false,checkedStateConfirmed:true};
 /* Legacy viewer WM_COMMAND 74 implementation retained below only as dead
    historical context. It is intentionally unreachable because toolbar
    checked-state readback disproved it as a sufficient restoration proof. */
 const script=String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class AuroraSelectionCleanupVerified {
 public delegate bool EnumWindowsProc(IntPtr hWnd,IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc c,IntPtr l);
 [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,EnumWindowsProc c,IntPtr l);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
}
'@
function Text([IntPtr]$h){$b=New-Object System.Text.StringBuilder 1024;[void][AuroraSelectionCleanupVerified]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function Class([IntPtr]$h){$b=New-Object System.Text.StringBuilder 256;[void][AuroraSelectionCleanupVerified]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
$ids=@(Get-Process nwtoolset -ErrorAction SilentlyContinue|ForEach-Object {[uint32]$_.Id})
if($ids.Count-ne 1){throw 'Toolset process count changed before cleanup.'}
$script:frames=@()
$top=[AuroraSelectionCleanupVerified+EnumWindowsProc]{param($h,$l);[uint32]$p=0;[void][AuroraSelectionCleanupVerified]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$ids[0]-and[AuroraSelectionCleanupVerified]::IsWindowVisible($h)-and(Text $h).EndsWith(" - $env:ATS_MODULE",[StringComparison]::OrdinalIgnoreCase)){$script:frames += $h};return $true}
[void][AuroraSelectionCleanupVerified]::EnumWindows($top,[IntPtr]::Zero)
if($script:frames.Count-ne 1){throw 'Exact module frame missing during cleanup.'}
$script:viewers=@()
$child=[AuroraSelectionCleanupVerified+EnumWindowsProc]{param($h,$l);$t=(Text $h).Trim();if($t.StartsWith('-')){$t=$t.Substring(1).Trim()};if([AuroraSelectionCleanupVerified]::IsWindowVisible($h)-and(Class $h)-eq'TfrmViewerArea'-and$t-eq$env:ATS_AREA){$script:viewers += $h};return $true}
[void][AuroraSelectionCleanupVerified]::EnumChildWindows($script:frames[0],$child,[IntPtr]::Zero)
if($script:viewers.Count-ne 1){throw "Expected exactly one TfrmViewerArea during cleanup, found $($script:viewers.Count)."}
[void][AuroraSelectionCleanupVerified]::SendMessage($script:viewers[0],0x0111,[IntPtr]74,[IntPtr]::Zero)
[pscustomobject]@{status='restored';command='Select Objects';commandId=74;viewerClass='TfrmViewerArea';usesGlobalInput=$false}|ConvertTo-Json -Compress
`;
 return JSON.parse(execFileSync("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-Command",script],{encoding:"utf8",env:{...process.env,ATS_MODULE:plan.module,ATS_AREA:plan.area},timeout:30000,windowsHide:true}).trim());
}

function dispatchTargetedSelection(plan){
 const script=String.raw`
$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System; using System.Text; using System.Runtime.InteropServices;
public static class AuroraTargetedTileSelection { public delegate bool EnumWindowsProc(IntPtr hWnd,IntPtr l); [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc c,IntPtr l); [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,EnumWindowsProc c,IntPtr l); [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p); [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n); [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n); [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out RECT r); [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l); [StructLayout(LayoutKind.Sequential)] public struct RECT{public int Left,Top,Right,Bottom;} }
'@
function Text([IntPtr]$h){$b=New-Object System.Text.StringBuilder 1024;[void][AuroraTargetedTileSelection]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};function Class([IntPtr]$h){$b=New-Object System.Text.StringBuilder 256;[void][AuroraTargetedTileSelection]::GetClassName($h,$b,$b.Capacity);$b.ToString()};function Rect([IntPtr]$h){$r=New-Object 'AuroraTargetedTileSelection+RECT';[void][AuroraTargetedTileSelection]::GetWindowRect($h,[ref]$r);[pscustomobject]@{width=$r.Right-$r.Left;height=$r.Bottom-$r.Top}}
$ids=@(Get-Process nwtoolset -ErrorAction SilentlyContinue|%{[uint32]$_.Id});if($ids.Count-ne 1){throw "Expected one nwtoolset process, found $($ids.Count)."};$script:frames=@();$top=[AuroraTargetedTileSelection+EnumWindowsProc]{param($h,$l)[uint32]$p=0;[void][AuroraTargetedTileSelection]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$ids[0]-and[AuroraTargetedTileSelection]::IsWindowVisible($h)){$script:frames+=,[pscustomobject]@{h=$h;title=(Text $h);class=(Class $h)}};return $true};[void][AuroraTargetedTileSelection]::EnumWindows($top,[IntPtr]::Zero);$frame=@($script:frames|?{$_.title.EndsWith(" - $env:ATS_MODULE",[StringComparison]::OrdinalIgnoreCase)})|select -First 1;if($null-eq$frame){throw 'Exact module frame not found.'};$screen=[System.Windows.Forms.Screen]::FromHandle($frame.h);if($screen.DeviceName-ne'\\.\DISPLAY1'-or$screen.Primary){throw "Module frame is not on approved physical second display: $($screen.DeviceName),primary=$($screen.Primary)."};$script:view=@();$children=[AuroraTargetedTileSelection+EnumWindowsProc]{param($h,$l)$t=(Text $h).Trim();if($t.StartsWith('-')){$t=$t.Substring(1).Trim()};if((Class $h)-eq'TfrmViewerArea'-and$t-eq$env:ATS_AREA){$script:view+=,$h};return $true};[void][AuroraTargetedTileSelection]::EnumChildWindows($frame.h,$children,[IntPtr]::Zero);if($script:view.Count-ne 1){throw "Expected one Area viewer, found $($script:view.Count)."};$script:ports=@();$ports=[AuroraTargetedTileSelection+EnumWindowsProc]{param($h,$l)if([AuroraTargetedTileSelection]::IsWindowVisible($h)-and(Class $h)-eq'TScrollBox'){$r=Rect $h;if($r.width-ge400-and$r.height-ge300){$script:ports+=,[pscustomobject]@{h=$h;r=$r}}};return $true};[void][AuroraTargetedTileSelection]::EnumChildWindows($script:view[0],$ports,[IntPtr]::Zero);$v=@($script:ports|sort {$_.r.width*$_.r.height}-Descending)|select -First 1;if($null-eq$v-or$v.r.width-ne[int]$env:ATS_W-or$v.r.height-ne[int]$env:ATS_H){throw 'Validated viewport dimensions differ from the observation; refusing stale projection.'};$x=[int][Math]::Round([double]$env:ATS_X);$y=[int][Math]::Round([double]$env:ATS_Y);$lp=[IntPtr][int64](($y-shl16)-bor($x-band0xffff));[void][AuroraTargetedTileSelection]::SendMessage($script:view[0],0x0111,[IntPtr]73,[IntPtr]::Zero);[void][AuroraTargetedTileSelection]::SendMessage($v.h,0x0201,[IntPtr]1,$lp);[void][AuroraTargetedTileSelection]::SendMessage($v.h,0x0202,[IntPtr]::Zero,$lp);[pscustomobject]@{targetClass='TScrollBox';method='targeted_wm_lbuttondown_up';click=[pscustomobject]@{x=$x;y=$y};usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;moduleScreenDevice=$screen.DeviceName;moduleScreenPrimary=$screen.Primary}|ConvertTo-Json -Compress
`;
 const executionScript=script.replaceAll("$script:ports","$script:viewportCandidates").replace("$ports=[AuroraTargetedTileSelection+EnumWindowsProc]","$portCallback=[AuroraTargetedTileSelection+EnumWindowsProc]").replaceAll("($script:view[0],$ports,[IntPtr]::Zero)","($script:view[0],$portCallback,[IntPtr]::Zero)");
 return JSON.parse(execFileSync("powershell.exe",["-NoProfile","-ExecutionPolicy","Bypass","-Command",executionScript],{encoding:"utf8",env:{...process.env,ATS_MODULE:plan.module,ATS_AREA:plan.area,ATS_W:String(plan.viewportBounds.width),ATS_H:String(plan.viewportBounds.height),ATS_X:String(plan.click.x),ATS_Y:String(plan.click.y)},timeout:60000,windowsHide:true}).trim());
}
function writeResult(dir,result){const path=resolve(dir,"selection-proof.json");writeFileSync(path,`${JSON.stringify(result,null,2)}\n`);return{...result,artifactPath:path};}
function runJson(path,args){return JSON.parse(execFileSync(process.execPath,[path,...args],{encoding:"utf8",maxBuffer:1024*1024*8,timeout:120000,windowsHide:true}).trim());}
function readJson(value,name){const path=resolve(requiredText(value,name));if(!existsSync(path))throw new Error(`${name} does not exist: ${path}`);return JSON.parse(readFileSync(path,"utf8"));}
function parseArgs(argv){const r={};for(let i=0;i<argv.length;i+=1){const k=argv[i],v=argv[i+1];if(!k.startsWith("--")||v===undefined||v.startsWith("--"))throw new Error(`Invalid argument near ${k}.`);r[k.slice(2)]=v;i+=1;}return r;}function requiredText(v,n){const s=String(v??"").trim();if(!s)throw new Error(`${n} is required.`);return s;}function optionalInteger(v){if(v===undefined)return undefined;const n=Number(v);if(!Number.isInteger(n))throw new Error("Tile selector must be integer.");return n;}function codedError(code,message){const e=new Error(message);e.code=code;return e;}
