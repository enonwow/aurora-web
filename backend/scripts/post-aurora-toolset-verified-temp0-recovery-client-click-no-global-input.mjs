#!/usr/bin/env node
/*
 * One narrowly bound recovery transport.  It is intentionally not a generic
 * dialog clicker: the caller must already have recorded a failed asynchronous
 * BM_CLICK for this exact Toolset recovery prompt and bind the current
 * process, modal and affirmative-button HWNDs.
 */
import { execFileSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
for (const name of ["expectedPid", "expectedDialogHwnd", "expectedButtonHwnd"]) {
  if (!/^\d+$/u.test(String(options[name] ?? "")) || Number(options[name]) <= 0) {
    throw new Error(`--${name} must be a positive integer`);
  }
}

const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;public static class VerifiedTemp0RecoveryClientClick{public delegate bool E(IntPtr h,IntPtr l);[StructLayout(LayoutKind.Sequential)]public struct RECT{public int Left,Top,Right,Bottom;}[DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);[DllImport("user32.dll")]public static extern bool IsWindow(IntPtr h);[DllImport("user32.dll")]public static extern bool GetClientRect(IntPtr h,out RECT r);[DllImport("user32.dll")]public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(512);[void][VerifiedTemp0RecoveryClientClick]::GetWindowText($h,$b,$b.Capacity);$b.ToString()}
function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][VerifiedTemp0RecoveryClientClick]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
$expectedText="The toolset did not close properly last time it was used.`r`nA module was found, would you like to try to recover it?`r`nPressing 'No' will destroy the backup."
$pid=[uint32]$env:EXPECTED_PID;$dialog=[IntPtr][int64]$env:EXPECTED_DIALOG;$button=[IntPtr][int64]$env:EXPECTED_BUTTON
if(-not[VerifiedTemp0RecoveryClientClick]::IsWindow($dialog)){throw 'verified_temp0_recovery_dialog_missing'}
[uint32]$dialogPid=0;[void][VerifiedTemp0RecoveryClientClick]::GetWindowThreadProcessId($dialog,[ref]$dialogPid)
if($dialogPid-ne$pid-or-not[VerifiedTemp0RecoveryClientClick]::IsWindowVisible($dialog)-or(C $dialog)-ne'#32770'-or(T $dialog)-ne'Confirmation'){throw 'verified_temp0_recovery_dialog_identity_mismatch'}
if(-not[VerifiedTemp0RecoveryClientClick]::IsWindow($button)){throw 'verified_temp0_recovery_button_missing'}
[uint32]$buttonPid=0;[void][VerifiedTemp0RecoveryClientClick]::GetWindowThreadProcessId($button,[ref]$buttonPid)
if($buttonPid-ne$pid-or-not[VerifiedTemp0RecoveryClientClick]::IsWindowVisible($button)-or-not[VerifiedTemp0RecoveryClientClick]::IsWindowEnabled($button)-or(C $button)-ne'TButton'-or(T $button)-notin @('&Tak','&Yes')){throw 'verified_temp0_recovery_button_identity_mismatch'}
$script:message=@();[void][VerifiedTemp0RecoveryClientClick]::EnumChildWindows($dialog,[VerifiedTemp0RecoveryClientClick+E]{param($h,$l);if([VerifiedTemp0RecoveryClientClick]::IsWindowVisible($h)-and(C $h)-eq'Static'-and(T $h).Replace([string][char]13,[string]::Empty)-eq$expectedText.Replace([string][char]13,[string]::Empty)){$script:message+=$h};$true},[IntPtr]::Zero);if($script:message.Count-ne1){throw "verified_temp0_recovery_message_mismatch:$($script:message.Count)"}
$rect=New-Object 'VerifiedTemp0RecoveryClientClick+RECT';if(-not[VerifiedTemp0RecoveryClientClick]::GetClientRect($button,[ref]$rect)){throw 'verified_temp0_recovery_button_client_rect_failed'};$x=[int](($rect.Right-$rect.Left)/2);$y=[int](($rect.Bottom-$rect.Top)/2);if($x-lt0-or$y-lt0){throw 'verified_temp0_recovery_button_client_center_invalid'};$lp=[IntPtr][int64](($y-shl16)-bor($x-band0xffff))
$down=[VerifiedTemp0RecoveryClientClick]::PostMessage($button,0x0201,[IntPtr]1,$lp);$up=[VerifiedTemp0RecoveryClientClick]::PostMessage($button,0x0202,[IntPtr]::Zero,$lp);if(-not$down-or-not$up){throw 'verified_temp0_recovery_client_click_post_failed'}
$deadline=[DateTime]::UtcNow.AddSeconds(5);do{Start-Sleep -Milliseconds 100;$closed=-not[VerifiedTemp0RecoveryClientClick]::IsWindow($dialog)}while(-not$closed-and[DateTime]::UtcNow-lt$deadline);if(-not$closed){throw 'verified_temp0_recovery_client_click_did_not_close'}
[pscustomobject]@{ok=$true;status='verified_temp0_recovery_client_click_acknowledged';processId=$pid;dialogHwnd=$dialog.ToInt64();buttonHwnd=$button.ToInt64();clientPoint=[pscustomobject]@{x=$x;y=$y};safety=[pscustomobject]@{usesGlobalInput=$false;usesGlobalCursor=$false;usesGlobalKeyboard=$false;usesGlobalMouse=$false;method='one targeted asynchronous WM_LBUTTONDOWN/UP pair at the validated affirmative TButton client center after a recorded BM_CLICK non-settle'}}|ConvertTo-Json -Depth 5 -Compress
`;

try {
  const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 15_000,
    env: {
      ...process.env,
      EXPECTED_PID: String(options.expectedPid),
      EXPECTED_DIALOG: String(options.expectedDialogHwnd),
      EXPECTED_BUTTON: String(options.expectedButtonHwnd),
    },
  }).trim();
  console.log(JSON.stringify(JSON.parse(output), null, 2));
} catch (error) {
  console.log(JSON.stringify({
    ok: false,
    blockerCode: String(error?.stdout ?? "").includes("verified_temp0_recovery_client_click_did_not_close")
      ? "toolset_verified_temp0_recovery_client_click_did_not_close"
      : "toolset_verified_temp0_recovery_client_click_failed",
    message: String(error?.stdout || error?.stderr || error?.message || error).trim(),
    safety: { usesGlobalInput: false, usesGlobalCursor: false, usesGlobalKeyboard: false, usesGlobalMouse: false },
  }, null, 2));
  process.exitCode = 2;
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]; const value = argv[index + 1];
    if (!key?.startsWith("--") || value == null || value.startsWith("--")) throw new Error(`invalid argument ${key ?? "end"}`);
    result[key.slice(2)] = value;
  }
  return result;
}
