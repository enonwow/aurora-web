import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,basename} from 'node:path';
const normalized=p=>String(p).replaceAll('\\','/').toLowerCase();
export function admitFatalClose({state,expectedPid,expectedStartedAtUtc,reportPath,reportText}){
 const fail=s=>{throw Error('nwmain_fatal_close_'+s)};
 const ps=state?.processes;
 if(!Array.isArray(ps)||ps.length!==1||ps[0].pid!==expectedPid)fail('process_identity');
 if(ps[0].startedAtUtc!==expectedStartedAtUtc)fail('start_identity');
 if(!ps[0].responding)fail('not_responding_use_regular_close');
 const ws=state.windows;
 if(!Array.isArray(ws)||ws.length!==2||ws.some(w=>w.processId!==expectedPid))fail('window_set');
 const main=ws.find(w=>w.hwnd===ps[0].mainHwnd&&w.ownerHwnd===0&&w.className!=='#32770');
 if(!main)fail('main_identity');
 const dialog=ws.find(w=>w.className==='#32770'&&w.ownerHwnd===main.hwnd&&w.enabled);
 if(!dialog||dialog.title!=='NWN:EE has encountered a fatal error and cannot continue.')fail('fatal_dialog');
 const buttons=dialog.children.filter(c=>c.className.toLowerCase()==='button');
 if(buttons.length!==1||buttons[0].id!==2||buttons[0].text!=='OK')fail('button_set');
 if(!normalized(dialog.children.map(c=>c.text).join('\n')).includes(normalized(reportPath)))fail('report_binding');
 const epoch=/^nwmain-crash-(\d+)\.nwcrash\.txt$/.exec(basename(normalized(reportPath)))?.[1];
 if(!epoch||Number(epoch)*1000<Date.parse(expectedStartedAtUtc))fail('report_predates_process');
 if(!reportText.includes('=== Minidump')||!reportText.includes('=== End')||!reportText.includes('c0000005'))fail('report_content');
 return {pid:expectedPid,startedAtUtc:expectedStartedAtUtc,mainHwnd:main.hwnd,dialogHwnd:dialog.hwnd,dialog,reportPath};
}
const reader=String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public class FatalRead {
 public delegate bool E(IntPtr h,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]public static extern bool IsWindowEnabled(IntPtr h);
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32.dll")]public static extern IntPtr GetWindow(IntPtr h,uint c);
 [DllImport("user32.dll")]public static extern int GetDlgCtrlID(IntPtr h);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,StringBuilder b,uint f,uint t,out IntPtr r);
 [DllImport("user32.dll")]public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
}
'@
function TextOf($h){$b=[Text.StringBuilder]::new(4096);$r=[IntPtr]::Zero;if([FatalRead]::SendMessageTimeout($h,13,[IntPtr]4096,$b,2,200,[ref]$r)-eq[IntPtr]::Zero){throw 'fatal_read_text_timeout'};$b.ToString()}
function ClassOf($h){$b=[Text.StringBuilder]::new(256);[void][FatalRead]::GetClassName($h,$b,256);$b.ToString()}
function Read-State {
 $ps=@(Get-Process nwmain -ErrorAction SilentlyContinue|ForEach-Object{[pscustomobject]@{pid=$_.Id;startedAtUtc=$_.StartTime.ToUniversalTime().ToString('o');responding=$_.Responding;mainHwnd=$_.MainWindowHandle.ToInt64()}})
 $script:pidSet=@($ps|ForEach-Object{$_.pid});$script:ws=@()
 [void][FatalRead]::EnumWindows([FatalRead+E]{param($h,$l);[uint32]$q=0;[void][FatalRead]::GetWindowThreadProcessId($h,[ref]$q);if($q-in$script:pidSet-and[FatalRead]::IsWindowVisible($h)){
  $script:cs=@();[void][FatalRead]::EnumChildWindows($h,[FatalRead+E]{param($ch,$cl);if([FatalRead]::IsWindowVisible($ch)){$script:cs += [pscustomobject]@{hwnd=$ch.ToInt64();id=[FatalRead]::GetDlgCtrlID($ch);className=ClassOf $ch;text=TextOf $ch}};$true},[IntPtr]::Zero)
  $script:ws += [pscustomobject]@{hwnd=$h.ToInt64();processId=$q;className=ClassOf $h;title=TextOf $h;ownerHwnd=[FatalRead]::GetWindow($h,4).ToInt64();enabled=[FatalRead]::IsWindowEnabled($h);children=@($script:cs)}
 };$true},[IntPtr]::Zero)
 [pscustomobject]@{processes=$ps;windows=$script:ws}
}
`;
const run=(source,env={})=>JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',source],{encoding:'utf8',windowsHide:true,timeout:25000,maxBuffer:1024*1024,env:{...process.env,...env}}).trim());
export function inspectNwmain(){return run(reader+`Read-State|ConvertTo-Json -Depth 8 -Compress`);}
export function fatalClose({command,pid,startedAtUtc,report,reportSha256}){
 if(command==='inspect')return {ok:true,readOnly:true,state:inspectNwmain()};
 const reportPath=resolve(report),bytes=readFileSync(reportPath);
 const actual=createHash('sha256').update(bytes).digest('hex');
 if(actual!==reportSha256)throw Error('nwmain_fatal_close_report_hash');
 const before=inspectNwmain();
 const plan=admitFatalClose({state:before,expectedPid:Number(pid),expectedStartedAtUtc:startedAtUtc,reportPath,reportText:bytes.toString('utf8')});
 if(command==='close-fatal-dry-run')return {ok:true,readOnly:true,plan,reportSha256,before};
 const result=run(reader+String.raw`
$expected=$env:FATAL_STATE|ConvertFrom-Json
$now=Read-State
if(($now|ConvertTo-Json -Depth 8 -Compress)-cne($expected|ConvertTo-Json -Depth 8 -Compress)){throw 'fatal_close_state_changed'}
$sha=[Security.Cryptography.SHA256]::Create()
try {$currentHash=([BitConverter]::ToString($sha.ComputeHash([IO.File]::ReadAllBytes($env:FATAL_REPORT)))).Replace('-','').ToLowerInvariant()} finally {$sha.Dispose()}
if($currentHash-ne$env:FATAL_HASH){throw 'fatal_close_report_changed'}
$targetPid=[int]$env:FATAL_PID;$targetStart=[DateTimeOffset]::Parse($env:FATAL_START).UtcDateTime
$watch=[Diagnostics.Stopwatch]::StartNew()
if(-not[FatalRead]::PostMessage([IntPtr]::new([int64]$env:FATAL_HWND),16,[IntPtr]::Zero,[IntPtr]::Zero)){throw 'fatal_close_post_failed'}
do {Start-Sleep -Milliseconds 100;$ps=@(Get-Process nwmain -ErrorAction SilentlyContinue);if($ps.Count-eq0){break};if($ps.Count-ne1-or$ps[0].Id-ne$targetPid-or$ps[0].StartTime.ToUniversalTime().Ticks-ne$targetStart.Ticks){throw 'fatal_close_identity_changed'}}while($watch.ElapsedMilliseconds-lt15000)
$forced=$false
if($ps.Count-ne0){$check=@(Get-Process nwmain -ErrorAction SilentlyContinue);if($check.Count-ne1-or$check[0].Id-ne$targetPid-or$check[0].StartTime.ToUniversalTime().Ticks-ne$targetStart.Ticks){throw 'fatal_close_force_identity'};$forced=$true;Stop-Process -Id $targetPid -Force}
$deadline=[DateTime]::UtcNow.AddSeconds(5)
do {Start-Sleep -Milliseconds 100;$remaining=@(Get-Process nwmain -ErrorAction SilentlyContinue);if($remaining.Count-eq0){break};if($remaining.Count-ne1-or$remaining[0].Id-ne$targetPid-or$remaining[0].StartTime.ToUniversalTime().Ticks-ne$targetStart.Ticks){throw 'fatal_close_after_identity'}}while([DateTime]::UtcNow-lt$deadline)
if($remaining.Count-ne0){throw 'fatal_close_timeout'}
[pscustomobject]@{ok=$true;processCountAfter=0;transport='PostMessage WM_CLOSE exact report-bound fatal modal';forceFallbackUsed=$forced;elapsedMs=$watch.ElapsedMilliseconds;usesGlobalInput=$false;changesZOrder=$false}|ConvertTo-Json -Compress
`,{FATAL_STATE:JSON.stringify(before),FATAL_PID:String(pid),FATAL_START:startedAtUtc,FATAL_REPORT:reportPath,FATAL_HASH:reportSha256,FATAL_HWND:String(plan.dialogHwnd)});
 return {command,plan,reportSha256,before,...result};
}
