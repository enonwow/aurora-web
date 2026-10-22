// Central measurement-only extension: official pre-initialization capture,
// existing exact-window placement atom, no desktop input or visual-pass claim.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {admitCapture} from './lib/aur-s07-renderdoc-capture-admission.mjs';
import {runRenderDocJob} from './lib/aur-s07-renderdoc-runner.mjs';
const [command,...raw]=process.argv.slice(2),o={};
try {
  for(let i=0;i<raw.length;i+=2){if(!raw[i].startsWith('--')||!raw[i+1])throw Error('invalid_argument');o[raw[i].slice(2)]=raw[i+1];}
  const p=JSON.parse(readFileSync(resolve(o.profile),'utf8'));
  const job=await admitCapture(p);
  if(o.samples!==undefined){job.captureCount=Number(o.samples);if(!Number.isInteger(job.captureCount)||job.captureCount<1||job.captureCount>32)throw Error('invalid_sample_count');}
  if(o.interval!==undefined){job.captureIntervalSeconds=Number(o.interval);if(!Number.isFinite(job.captureIntervalSeconds)||job.captureIntervalSeconds<0.1||job.captureIntervalSeconds>2)throw Error('invalid_sample_interval');}
  if(o['skip-captures']!==undefined){job.skipCaptures=Number(o['skip-captures']);if(!Number.isInteger(job.skipCaptures)||job.skipCaptures<0)throw Error('invalid_capture_offset');}
  if(command==='dry-run') {console.log(JSON.stringify({ok:true,job,startsNwn:false}));}
  else if(command==='capture'||command==='resume') {
    let permittedCrashHelpers=[];
    if(command==='resume') {
      const source=resolve(o.from);
      const identity=JSON.parse(readFileSync(join(source,'identity.json'),'utf8'));
      const launch=JSON.parse(readFileSync(join(source,'launch.json'),'utf8'));
      const target=JSON.parse(readFileSync(join(source,'target.json'),'utf8'));
      if(identity.pid!==target.pid)throw Error('resume_lineage_mismatch');
      const ps="$ErrorActionPreference='Stop';$n=Get-Process -Id ([int]$env:AUR_RESUME_PID);$h=@(Get-CimInstance Win32_Process -Filter ('ParentProcessId = '+$n.Id) | Where-Object Name -eq 'renderdoccmd.exe' | ForEach-Object {$p=Get-Process -Id $_.ProcessId;[pscustomobject]@{pid=$p.Id;start=$p.StartTime.ToUniversalTime().ToString('o');name=$p.ProcessName;path=$_.ExecutablePath;command=$_.CommandLine}});[pscustomobject]@{pid=$n.Id;start=$n.StartTime.ToUniversalTime().ToString('o');hwnd=$n.MainWindowHandle.ToInt64();helpers=$h}|ConvertTo-Json -Depth 4 -Compress";
      const state=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',ps],{encoding:'utf8',windowsHide:true,timeout:10000,env:{...process.env,AUR_RESUME_PID:String(identity.pid)}}));
      if(state.start!==identity.started||state.hwnd!==identity.hwnd)throw Error('resume_target_changed');
      for(const h of state.helpers) {
        if(resolve(h.path)!==resolve(dirname(p.renderdoc.path),'renderdoccmd.exe')||!h.command.includes(' crashhandle --pipe '))throw Error('unqualified_renderdoc_helper');
        permittedCrashHelpers.push(h);
      }
      job.resume={...identity,ident:launch.ident,source};
    }
    const rawProcesses=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"@(Get-Process nwmain -ErrorAction SilentlyContinue | Select-Object Id) | ConvertTo-Json -Compress"],{encoding:'utf8',windowsHide:true,timeout:10000}).trim();
    if(command==='capture'&&rawProcesses && rawProcesses!=='[]')throw Error('existing_nwn_session');
    if(command==='resume') {
      const native=JSON.parse(rawProcesses||'[]'),list=Array.isArray(native)?native:[native];
      if(list.length!==1||list[0].Id!==job.resume.pid)throw Error('resume_native_inventory_changed');
    }
    job.nodePath=process.execPath;
    job.placementAtom=resolve(p.centralRoot,'backend/scripts/prepare-nwmain-proof-window-no-global-input.mjs');
    const result=await runRenderDocJob({executable:p.renderdoc.path,executableSha256:p.renderdoc.sha256,
      configPath:p.renderdoc.configPath,directory:o.out,timeoutMs:60000,job,permittedCrashHelpers,
      script:join(dirname(fileURLToPath(import.meta.url)),'lib/aur-s07-renderdoc-live-capture.py')});
    console.log(JSON.stringify({ok:true,result,ownNwnSessionLeftForGracefulCleanup:true}));
  } else throw Error('use dry-run or capture');
} catch(e){console.error(JSON.stringify({ok:false,error:String(e.message)}));process.exitCode=1;}
