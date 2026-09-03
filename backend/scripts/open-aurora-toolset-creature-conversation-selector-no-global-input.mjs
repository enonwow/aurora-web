#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const source = String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class AuroraConversationSelector {
  public delegate bool E(IntPtr h,IntPtr l);
  [StructLayout(LayoutKind.Sequential)] public struct R { public int Left,Top,Right,Bottom; }
  [DllImport("user32.dll")] public static extern bool EnumWindows(E c,IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out R r);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(512);[void][AuroraConversationSelector]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][AuroraConversationSelector]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
function Get-R([IntPtr]$h){$r=New-Object 'AuroraConversationSelector+R';[void][AuroraConversationSelector]::GetWindowRect($h,[ref]$r);$r}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1){throw "expected_one_toolset_process:$($ps.Count)"};[uint32]$pid=$ps[0].Id
$script:d=@();[void][AuroraConversationSelector]::EnumWindows([AuroraConversationSelector+E]{param($h,$l);[uint32]$p=0;[void][AuroraConversationSelector]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[AuroraConversationSelector]::IsWindowVisible($h)-and(C $h)-eq'TdlgCreatureEdit'-and(T $h)-eq'Creature Properties'){$script:d+=$h};$true},[IntPtr]::Zero);if($script:d.Count-ne1){throw "expected_one_creature_dialog:$($script:d.Count)"};$dialog=$script:d[0];$screen=[Windows.Forms.Screen]::FromHandle($dialog);if($screen.Primary){throw 'creature_dialog_on_primary'}
$script:groups=@();$script:buttons=@();$script:basic=@();[void][AuroraConversationSelector]::EnumChildWindows($dialog,[AuroraConversationSelector+E]{param($h,$l);if([AuroraConversationSelector]::IsWindowVisible($h)){if((C $h)-eq'TGroupBox'-and(T $h)-eq'Conversation'){$script:groups+=$h};if((C $h)-eq'TButton'-and(T $h)-eq'...'){$script:buttons+=$h};if((C $h)-eq'TTabSheet'-and(T $h)-eq'Basic'){$script:basic+=$h}};$true},[IntPtr]::Zero);if($script:groups.Count-ne1-or$script:basic.Count-ne1){throw "expected_basic_and_conversation_group:$($script:basic.Count):$($script:groups.Count)"};$gr=Get-R $script:groups[0]
$inside=@($script:buttons|Where-Object{$r=Get-R $_;$r.Left-ge$gr.Left-and$r.Right-le$gr.Right-and$r.Top-ge$gr.Top-and$r.Bottom-le$gr.Bottom});if($inside.Count-ne1){throw "expected_one_conversation_browse_button:$($inside.Count)"};$button=$inside[0]
if(-not[AuroraConversationSelector]::PostMessage($button,0x00F5,[IntPtr]::Zero,[IntPtr]::Zero)){throw 'conversation_browse_post_failed'}
$script:s=@();for($attempt=0;$attempt-lt8-and$script:s.Count-eq0;$attempt++){Start-Sleep -Milliseconds 250;$script:s=@();[void][AuroraConversationSelector]::EnumWindows([AuroraConversationSelector+E]{param($h,$l);[uint32]$p=0;[void][AuroraConversationSelector]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[AuroraConversationSelector]::IsWindowVisible($h)-and(C $h)-eq'TdlgResOpen'-and(T $h)-eq'Select Resource'){$script:s+=$h};$true},[IntPtr]::Zero)};if($script:s.Count-ne1){throw "expected_conversation_resource_selector:$($script:s.Count)"}
[pscustomobject]@{ok=$true;processId=$pid;dialogHwnd=$dialog.ToInt64();groupHwnd=$script:groups[0].ToInt64();buttonHwnd=$button.ToInt64();selectorHwnd=$script:s[0].ToInt64();monitor=@{deviceName=$screen.DeviceName;primary=$screen.Primary};safety=@{usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='validated Basic tab plus exact Conversation group bounds and targeted browse BM_CLICK with exact Select Resource readback'}}|ConvertTo-Json -Depth 6 -Compress
`;

const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
  encoding: "utf8",
  windowsHide: true,
  timeout: 30_000,
  maxBuffer: 1024 * 1024,
});
console.log(JSON.stringify(JSON.parse(output.trim()), null, 2));
