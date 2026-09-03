#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const TEST_MODULE_TOP_POSITION = 4;
const TEST_MODULE_ITEM_POSITION = 2;
const TEST_MODULE_COMMAND_ID = 121;

const [command, ...rawArgs] = process.argv.slice(2);
const options = parseArgs(rawArgs);
const moduleName = required(options.module, "--module");

if (command === "dry-run") {
  print({
    ok: true,
    command,
    module: moduleName,
    menu: {
      topPosition: TEST_MODULE_TOP_POSITION,
      itemPosition: TEST_MODULE_ITEM_POSITION,
      commandId: TEST_MODULE_COMMAND_ID,
    },
    nonblocking: true,
    startsNwn: false,
    usesGlobalInput: false,
  });
} else if (command === "post") {
  print(postTestModule(moduleName));
} else {
  throw new Error("Use: dry-run or post --module <exact.mod>.");
}

function postTestModule(module) {
  const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AuroraTestModulePost {
 public delegate bool E(IntPtr h,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll")]public static extern IntPtr GetMenu(IntPtr h);
 [DllImport("user32.dll")]public static extern IntPtr GetSubMenu(IntPtr m,int p);
 [DllImport("user32.dll")]public static extern uint GetMenuItemID(IntPtr m,int p);
 [DllImport("user32.dll")]public static extern uint GetMenuState(IntPtr m,uint i,uint f);
 [DllImport("user32.dll")]public static extern IntPtr SendMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
 [DllImport("user32.dll")]public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][AuroraTestModulePost]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][AuroraTestModulePost]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
$nwn=@(Get-Process nwmain -ErrorAction SilentlyContinue);if($nwn.Count-ne0){throw "expected_zero_nwmain:$($nwn.Count)"}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw "expected_one_toolset:$($ps.Count)"};$p=$ps[0];if(-not$p.Responding){throw 'toolset_not_responding'};[uint32]$pidValue=$p.Id
$script:owned=@();[void][AuroraTestModulePost]::EnumWindows([AuroraTestModulePost+E]{param($h,$l);[uint32]$q=0;[void][AuroraTestModulePost]::GetWindowThreadProcessId($h,[ref]$q);if($q-eq$pidValue-and[AuroraTestModulePost]::IsWindowVisible($h)){$script:owned += [pscustomobject]@{h=$h;text=(T $h);className=(C $h)}};$true},[IntPtr]::Zero)
$frames=@($script:owned|Where-Object{$_.className-eq'TfrmFrame'-and$_.text.EndsWith(" - $env:ATM_MODULE",[StringComparison]::OrdinalIgnoreCase)})
if($frames.Count-ne1){throw "exact_clean_module_frame_missing:$($frames.Count)"};$frame=$frames[0];if($frame.text.EndsWith('*')){throw 'dirty_module_frame'}
$modals=@($script:owned|Where-Object{$_.className-ne'TfrmFrame'-and$_.className-ne'TApplication'});if($modals.Count-ne0){throw "unexpected_toolset_modal:$($modals.Count)"}
$screen=[Windows.Forms.Screen]::FromHandle($frame.h);if($screen.Primary){throw 'toolset_frame_on_primary'}
$menu=[AuroraTestModulePost]::GetMenu($frame.h);if($menu-eq[IntPtr]::Zero){throw 'frame_menu_missing'}
$top=[AuroraTestModulePost]::GetSubMenu($menu,4);if($top-eq[IntPtr]::Zero){throw 'build_menu_missing'};[void][AuroraTestModulePost]::SendMessage($frame.h,0x0117,$top,[IntPtr]4)
$id=[uint32][AuroraTestModulePost]::GetMenuItemID($top,2);$state=[uint32][AuroraTestModulePost]::GetMenuState($top,[uint32]2,0x400)
if($id-ne121){throw "test_module_command_id_mismatch:$id"};if(($state-band3)-ne0-or($state-band0x800)-ne0){throw "test_module_command_not_enabled:$state"}
$before=[Diagnostics.Stopwatch]::GetTimestamp();if(-not[AuroraTestModulePost]::PostMessage($frame.h,0x0111,[IntPtr]121,[IntPtr]::Zero)){throw 'post_test_module_failed'};$after=[Diagnostics.Stopwatch]::GetTimestamp()
[pscustomobject]@{ok=$true;status='posted';processId=$pidValue;frameHwnd=$frame.h.ToInt64();module=$env:ATM_MODULE;menu=[pscustomobject]@{topPosition=4;itemPosition=2;commandId=121;state=$state};qpc=[pscustomobject]@{before=$before;after=$after;frequency=[Diagnostics.Stopwatch]::Frequency};nonblocking=$true;requestsNwnStart=$true;usesGlobalInput=$false;safety=[pscustomobject]@{method='validated exact Build menu item followed by one targeted PostMessage WM_COMMAND; no post-dispatch Toolset readback'}}|ConvertTo-Json -Depth 6 -Compress
`;
  const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 10_000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, ATM_MODULE: module },
  });
  return JSON.parse(output.trim());
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`Expected --name <value> near ${key ?? "end"}.`);
    result[key.slice(2)] = value;
  }
  return result;
}

function required(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${name} is required.`);
  return text;
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
