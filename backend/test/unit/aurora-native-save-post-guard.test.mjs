import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
const source=readFileSync(resolve(import.meta.dirname,'../../scripts/aurora-toolset-test-module-nonblocking.mjs'),'utf8');
function ps(text){const dir=mkdtempSync(join(tmpdir(),'aurora-save-post-ps-'));try{const path=join(dir,'mock.ps1');writeFileSync(path,text);const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path],{encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout.trim());}finally{assert.equal(dirname(dir),resolve(tmpdir()));rmSync(dir,{recursive:true,force:true});}}
test('generated Test Module PowerShell parses; strict guard precedes both menu refresh and post',()=>{
  const body=source.match(/const source = String.raw`([^]*?)`;/)?.[1];assert(body);
  const result=ps(`$s=[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('${Buffer.from(body,'utf16le').toString('base64')}'));$t=$null;$e=$null;[void][System.Management.Automation.Language.Parser]::ParseInput($s,[ref]$t,[ref]$e);[pscustomobject]@{errors=@($e|ForEach-Object{$_.Message})}|ConvertTo-Json -Compress`);assert.deepEqual(result.errors,[]);
  assert.match(body,/Assert-NativeSaveTestOwner\s*\r?\n\$menu=/);
  assert.match(body,/Assert-NativeSaveTestOwner\s*\r?\n\$before=/);
});
test('production owner guard with mocked Win32 admits one owner and rejects all identity/monitor/Area drifts',()=>{
  const guard=source.slice(source.indexOf('function Assert-NativeSaveTestOwner'),source.indexOf('# End native Save expected-owner guard.'));assert(guard.includes('Get-Process'));
  const result=ps(`$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Drawing;
public static class AuroraTestModulePost{
 public delegate bool E(IntPtr h,IntPtr l);public static string Mode="valid";
 public struct R{public int Left,Top,Right,Bottom;}
 public static bool IsWindowVisible(IntPtr h){return Mode!="hidden";}
 public static bool IsIconic(IntPtr h){return Mode=="iconic";}
 public static uint GetWindowThreadProcessId(IntPtr h,out uint p){p=Mode=="owner"?5u:1234u;return 1;}
 public static bool EnumWindows(E c,IntPtr l){c(new IntPtr(100),l);if(Mode=="modal")c(new IntPtr(101),l);return true;}
 public static bool EnumChildWindows(IntPtr h,E c,IntPtr l){if(h.ToInt64()==100)c(new IntPtr(200),l);if(Mode!="viewport")c(new IntPtr(300),l);return true;}
 public static bool GetWindowRect(IntPtr h,out R r){r=new R{Left=Mode=="bounds"?10:-1900,Top=20,Right=-600,Bottom=900};return true;}
}
namespace Windows.Forms{public class Screen{public bool Primary;public string DeviceName;public Rectangle WorkingArea;public static Screen FromHandle(IntPtr h){return new Screen{Primary=AuroraTestModulePost.Mode=="primary",DeviceName=AuroraTestModulePost.Mode=="device"?"other":@"\\\\.\\DISPLAY1",WorkingArea=new Rectangle(-1920,0,1920,1032)};}}}
'@ -ReferencedAssemblies System.Drawing
function C($h){switch($h.ToInt64()){100{'TfrmFrame'}101{'TDialog'}200{'TfrmViewerArea'}300{'TScrollBox'}}}
function T($h){if($h.ToInt64()-eq100){if([AuroraTestModulePost]::Mode-eq'dirty'){'Toolset - test.mod*'}else{'Toolset - test.mod'}}else{if([AuroraTestModulePost]::Mode-eq'area'){' - foreign'}else{' - test_area'}}}
function Get-Process{param($Name)
 if($Name-eq'nwmain'){if([AuroraTestModulePost]::Mode-eq'nwn'){[pscustomobject]@{Id=1}};return}
 $id=if([AuroraTestModulePost]::Mode-eq'pid'){12}else{1234};$stamp=if([AuroraTestModulePost]::Mode-eq'start'){'2026-09-07T10:00:00.1234568Z'}else{'2026-09-07T10:00:00.1234567Z'}
 [pscustomobject]@{Id=$id;StartTime=[DateTime]::Parse($stamp);Responding=([AuroraTestModulePost]::Mode-ne'unresponsive')}
}
$env:ATM_EXPECTED_PID='1234';$env:ATM_EXPECTED_START='2026-09-07T10:00:00.1234567Z';$env:ATM_EXPECTED_FRAME='100';$env:ATM_EXPECTED_VIEWER='200';$env:ATM_EXPECTED_VIEWPORT='300';$env:ATM_EXPECTED_TITLE='Toolset - test.mod';$env:ATM_EXPECTED_AREA='test_area'
${guard}
$results=@();foreach($case in @('valid','pid','start','owner','dirty','nwn','hidden','iconic','unresponsive','modal','primary','device','bounds','area','viewport')){
 [AuroraTestModulePost]::Mode=$case;$frame=[pscustomobject]@{h=[IntPtr]100};$posted=0;$failure=$null
 try{Assert-NativeSaveTestOwner;$posted++}catch{$failure=$_.Exception.Message};$results += [pscustomobject]@{case=$case;posted=$posted;failure=$failure}
}
ConvertTo-Json -InputObject $results -Compress`);
  assert.equal(result[0].posted,1,JSON.stringify(result[0]));for(const row of result.slice(1)){assert.equal(row.posted,0,row.case);assert(row.failure,row.case);}
});
