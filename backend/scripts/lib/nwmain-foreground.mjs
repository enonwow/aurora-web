import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
export function withTemporaryRaise({raise,capture,restore,record}) {
  let raised,restored,result;
  try { raised=raise();assert.equal(raised.topmostAfter,true,'Temporary raise refused');result=capture(); }
  finally { try { if(raised&&!raised.topmostBefore){restored=restore();assert.equal(restored.topmostAfter,false,'Original window level not restored');} } finally {record({raised,restored});} }
  return {raised,restored,capture:result};
}
export function admitForeground({state,expected,authorization}) {
  const fail=code=>{throw Error('nwmain_foreground_'+code);};
  if(typeof authorization!=='string'||authorization.trim().length<12)fail('authorization_required');
  if(!/^\\\\\.\\DISPLAY\d+$/.test(expected?.device??''))fail('monitor');
  const ps=state?.processes,ws=state?.windows;
  if(!Array.isArray(ps)||ps.length!==1||ps[0].pid!==expected.pid||ps[0].startedAtUtc!==expected.startedAtUtc)fail('identity');
  if(!ps[0].responding||ps[0].mainHwnd!==expected.hwnd)fail('main_window');
  if(!Array.isArray(ws)||ws.length!==1||ws[0].hwnd!==expected.hwnd||ws[0].processId!==expected.pid||!ws[0].enabled||ws[0].ownerHwnd!==0||ws[0].className==='#32770')fail('window_set');
  return {...expected,authorization};
}

export const foregroundSource=String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Runtime.InteropServices;
public static class OwnedNwnForeground {
 [StructLayout(LayoutKind.Sequential)]public struct R{public int Left,Top,Right,Bottom;}
 public delegate bool E(IntPtr h,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumWindows(E cb,IntPtr l);
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);
 [DllImport("user32.dll")]public static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);
 [DllImport("user32.dll")]public static extern bool SetWindowPos(IntPtr h,IntPtr after,int x,int y,int w,int z,uint flags);
 [DllImport("user32.dll")]public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")]public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")]public static extern int GetWindowLong(IntPtr h,int n);
}
'@
$expectedPid=[int]$env:ONF_PID;$expectedStart=[DateTimeOffset]::Parse($env:ONF_START).UtcDateTime;$h=[IntPtr]::new([long]$env:ONF_HWND)
function Assert-Identity {
 $ps=@(Get-Process nwmain -ErrorAction SilentlyContinue)
 if($ps.Count-ne1-or$ps[0].Id-ne$expectedPid-or$ps[0].StartTime.ToUniversalTime().Ticks-ne$expectedStart.Ticks-or-not$ps[0].Responding-or$ps[0].MainWindowHandle-ne$h){throw 'foreground_identity_drift'}
 $script:visible=@();[void][OwnedNwnForeground]::EnumWindows([OwnedNwnForeground+E]{param($w,$l);[uint32]$p=0;[void][OwnedNwnForeground]::GetWindowThreadProcessId($w,[ref]$p);if($p-eq$expectedPid-and[OwnedNwnForeground]::IsWindowVisible($w)){$script:visible+=$w.ToInt64()};$true},[IntPtr]::Zero)
 if($script:visible.Count-ne1-or$script:visible[0]-ne$h.ToInt64()-or-not[OwnedNwnForeground]::IsWindowEnabled($h)-or[OwnedNwnForeground]::IsIconic($h)){throw 'foreground_window_set_drift'}
 $screen=[Windows.Forms.Screen]::FromHandle($h);$bounds=$screen.WorkingArea
 if($screen.Primary-or$screen.DeviceName-ne$env:ONF_DEVICE){throw 'foreground_wrong_monitor'}
 $r=New-Object 'OwnedNwnForeground+R';if(-not[OwnedNwnForeground]::GetWindowRect($h,[ref]$r)){throw 'foreground_rect_missing'}
 if($r.Left-lt$bounds.Left-or$r.Top-lt$bounds.Top-or$r.Right-gt$bounds.Right-or$r.Bottom-gt$bounds.Bottom){throw 'foreground_outside_nonprimary'}
 [pscustomobject]@{left=$r.Left;top=$r.Top;right=$r.Right;bottom=$r.Bottom}
}
$before=Assert-Identity;$previousForeground=[OwnedNwnForeground]::GetForegroundWindow().ToInt64()
$topmostBefore=([OwnedNwnForeground]::GetWindowLong($h,-20)-band8)-ne0
$requested=$false;$zOrder=$false
if($env:ONF_APPLY-eq'1') {
 $requested=[OwnedNwnForeground]::SetForegroundWindow($h)
 $zOrder=[OwnedNwnForeground]::SetWindowPos($h,[IntPtr]::Zero,0,0,0,0,0x0003)
 Start-Sleep -Milliseconds 100
}
if($env:ONF_APPLY-eq'raise'-or$env:ONF_APPLY-eq'lower') {
 $level=if($env:ONF_APPLY-eq'raise'){-1}else{-2}
 $zOrder=[OwnedNwnForeground]::SetWindowPos($h,[IntPtr]::new($level),0,0,0,0,0x0013)
 Start-Sleep -Milliseconds 100
}
$after=Assert-Identity
if(($before|ConvertTo-Json -Compress)-ne($after|ConvertTo-Json -Compress)){throw 'foreground_geometry_changed'}
$foreground=[OwnedNwnForeground]::GetForegroundWindow().ToInt64()
$topmostAfter=([OwnedNwnForeground]::GetWindowLong($h,-20)-band8)-ne0
[pscustomobject]@{ok=$true;readOnly=($env:ONF_APPLY-eq'0');pid=$expectedPid;startedAtUtc=$expectedStart.ToString('o');hwnd=$h.ToInt64();device=$env:ONF_DEVICE;primary=$false;bounds=$after;previousForeground=$previousForeground;foregroundHwnd=$foreground;foregroundVerified=($foreground-eq$h.ToInt64());foregroundRequestResult=$requested;zOrderRequestResult=$zOrder;usesGlobalInput=$false;changesGeometry=$false;changesOtherWindows=$false;topmostBefore=$topmostBefore;topmostAfter=$topmostAfter}|ConvertTo-Json -Depth 5 -Compress
`;
export function runForeground(plan,apply) {
  return JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',foregroundSource],{
    windowsHide:true,encoding:'utf8',timeout:15000,maxBuffer:1024*1024,
    env:{...process.env,ONF_PID:String(plan.pid),ONF_START:plan.startedAtUtc,ONF_HWND:String(plan.hwnd),ONF_DEVICE:plan.device,ONF_APPLY:typeof apply==='string'?apply:apply?'1':'0'}
  }).trim());
}
