import test from 'node:test';
import assert from 'node:assert/strict';
import { admitFatalClose } from '../../scripts/lib/nwmain-fatal-close.mjs';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const start='2026-09-10T08:02:58.0383644Z';
function fixture(){return {expectedPid:44316,expectedStartedAtUtc:start,reportPath:'C:/test/nwmain-crash-1789027384.nwcrash.txt',reportText:'=== Time\nThu Sep 10 08:03:04 2026\n=== Exception\nexception=c0000005\n=== Minidump\nTURNUA==\n=== End',state:{processes:[{pid:44316,startedAtUtc:start,responding:true,mainHwnd:10}],windows:[{hwnd:10,processId:44316,className:'GLFW30',ownerHwnd:0,title:'Neverwinter Nights',enabled:false,children:[]},{hwnd:11,processId:44316,className:'#32770',ownerHwnd:10,title:'NWN:EE has encountered a fatal error and cannot continue.',enabled:true,children:[{className:'Static',text:'The error report file at C:\\test\\nwmain-crash-1789027384.nwcrash.txt.'},{className:'Button',text:'OK',id:2}]}]}};}
test('admits only an exact report-bound fatal modal',()=>{const p=admitFatalClose(fixture());assert.equal(p.dialogHwnd,11);assert.equal(p.mainHwnd,10);});
for(const [name,mutate] of [
 ['wrong pid',v=>v.state.processes[0].pid++],['wrong start',v=>v.state.processes[0].startedAtUtc='2026-09-10T08:02:58.0383645Z'],
 ['extra process',v=>v.state.processes.push({...v.state.processes[0]})],['extra window',v=>v.state.windows.push({...v.state.windows[0],hwnd:12})],
 ['wrong dialog owner',v=>v.state.windows[1].ownerHwnd=9],['foreign pid',v=>v.state.windows[1].processId=1],
 ['unknown modal',v=>v.state.windows[1].title='Save changes?'],['wrong report',v=>v.reportPath='C:/test/other.txt'],
 ['multiple choices',v=>v.state.windows[1].children.push({className:'Button',text:'Cancel',id:2})],['missing dump',v=>v.reportText='nothing'],
 ['report before start',v=>v.expectedStartedAtUtc=v.state.processes[0].startedAtUtc='2026-09-10T09:02:58.0383644Z']
])test(`rejects ${name}`,()=>{const v=fixture();mutate(v);assert.throws(()=>admitFatalClose(v));});
test('embedded PowerShell parses without executing actions',()=>{
 const source=readFileSync(new URL('../../scripts/lib/nwmain-fatal-close.mjs',import.meta.url),'utf8');
 const blocks=[...source.matchAll(/String.raw`([\s\S]*?)`/g)].map(m=>m[1]);assert.equal(blocks.length,2);
 const encoded=Buffer.from(blocks.join('\n'),'utf8').toString('base64');
 const ps="$s=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('"+encoded+"'));$t=$null;$e=$null;[void][System.Management.Automation.Language.Parser]::ParseInput($s,[ref]$t,[ref]$e);if($e.Count){$e|ConvertTo-Json -Compress;exit 1}";
 const r=spawnSync('powershell.exe',['-NoProfile','-Command',ps],{windowsHide:true,encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stdout+r.stderr);
});

