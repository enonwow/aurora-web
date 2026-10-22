import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

// Same failed-recovery/blank-frame state as the published model-proof cleanup.
// No game, renderer, window-message or module-load semantics are introduced.
export function admitFailedOpenClose(x){
  const f=x.failure,c=f.openFailure?.child?.childResult;
  assert.equal(f.status,'failed');assert.equal(f.blockerCode,'toolset_module_loaded_but_modal_open');
  assert.equal(c?.blockerCode,f.blockerCode);assert.equal(c.startedToolset,true);
  assert.equal(c.moduleLoadOwner,'verified_temp0_recovery');assert.equal(c.moduleOpenActionKind,'verified_temp0_recovery_yes');
  assert.equal(c.recoveryConfirmationHandled,true);assert.equal(c.recoveryConfirmationHandledCount,1);
  assert.equal(c.postSelectionBlockingModal?.className,'TdlgProgress');
  assert.equal(f.module.sha256,x.moduleHash);assert.equal(f.profileSha256,x.profileHash);
  assert.ok(typeof x.authorization==='string'&&x.authorization.trim());assert.deepEqual(x.nwn,[]);
  assert.equal(f.openFailure.postChildProcesses.length,1);assert.equal(x.processes.length,1);
  const p=f.openFailure.postChildProcesses[0],live=x.processes[0];
  assert.equal(live.Id,p.Id);assert.equal(live.StartTimeUtc,p.StartTimeUtc);assert.equal(live.Responding,true);
  assert.equal(c.postSelectionBlockingModal.processId,p.Id);
  assert.equal(x.windows.ok,true);assert.equal(x.windows.responding,true);assert.equal(x.windows.processId,p.Id);
  assert.ok(x.windows.windows.every(w=>['TfrmFrame','TApplication'].includes(w.className)),'No modal or Area admitted');
  const previous=f.openFailure.postChildWindows.windows.filter(w=>w.className==='TfrmFrame');
  const current=x.windows.windows.filter(w=>w.className==='TfrmFrame');
  assert.equal(previous.length,1);assert.equal(current.length,1);
  const frame=current[0];assert.equal(frame.hwnd,previous[0].hwnd);assert.equal(frame.text,previous[0].text);assert.equal(typeof frame.visible,'boolean');
  assert.match(frame.text,/^BioWare Aurora Neverwinter Nights Toolset v[^*]+$/);
  assert.ok(!frame.text.includes(' - '),'Only the unchanged blank frame is admitted');
  return{process:p,frame};
}

export function runFailedOpenClose(command,argv){
  assert.ok(['close-failed-recovery-blank-dry-run','close-failed-recovery-blank'].includes(command));
  const o={};for(let i=0;i<argv.length;i+=2){assert.ok(argv[i].startsWith('--'));o[argv[i].slice(2)]=argv[i+1];}
  assert.ok(o.profile&&o.outDir&&o.closeAuthorization);
  const profilePath=path.resolve(o.profile),out=path.resolve(o.outDir),manifestPath=path.join(out,'binary-native-geometry-manifest.json');
  const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
  const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  const failure=read(manifestPath),profile=read(profilePath),manifestHash=hash(manifestPath);
  assert.equal(path.resolve(failure.profilePath),profilePath);assert.equal(path.resolve(failure.artifactDir),out);
  const options={windowsHide:true,encoding:'utf8',timeout:15000,maxBuffer:8*1024*1024};
  const ps=name=>{const s=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`@(Get-Process ${name} -ErrorAction SilentlyContinue | Select-Object Id,@{Name='StartTimeUtc';Expression={$_.StartTime.ToUniversalTime().ToString('o')}},Responding) | ConvertTo-Json -Compress`],options).trim();return s?[JSON.parse(s)].flat():[];};
  const scripts=path.resolve(import.meta.dirname,'..');
  const atom=(name,args=[],timeout=15000)=>JSON.parse(execFileSync(process.execPath,[path.join(scripts,name),...args],{...options,timeout}));
  const inspect=()=>{
    assert.equal(hash(manifestPath),manifestHash);
    const frames=failure.openFailure.postChildWindows.windows.filter(w=>w.className==='TfrmFrame');assert.equal(frames.length,1);
    return admitFailedOpenClose({failure,moduleHash:hash(profile.module.path),profileHash:hash(profilePath),authorization:o.closeAuthorization,processes:ps('nwtoolset'),nwn:ps('nwmain'),windows:atom('inspect-aurora-toolset-visible-windows-no-global-input.mjs',['--includeHiddenFrameHwnd',String(frames[0].hwnd)])});
  };
  const planPath=path.join(out,'failed-recovery-close-plan.json'),resultPath=path.join(out,'failed-recovery-close.json');
  assert.ok(!fs.existsSync(planPath)&&!fs.existsSync(resultPath),'One live close attempt only');
  const admission=inspect();
  const plan={ok:true,command,admission,authorization:o.closeAuthorization,manifest:{path:manifestPath,sha256:manifestHash},module:profile.module,usesGlobalInput:false,startsToolset:false,startsNwn:false};
  if(command.endsWith('-dry-run'))return plan;
  const fresh=inspect();assert.deepEqual(fresh,admission);
  fs.writeFileSync(planPath,JSON.stringify({...plan,at:new Date().toISOString()},null,2)+'\n',{flag:'wx'});
  const r=atom('close-aurora-toolset-window-no-global-input.mjs',['--expectedPid',String(fresh.process.Id),'--expectedStartedAtUtc',fresh.process.StartTimeUtc,'--expectedFrameHwnd',String(fresh.frame.hwnd),'--expectedFrameTitle',fresh.frame.text,'--allowHiddenExactFrame','true','--forceIfNeeded','true'],40000);
  fs.writeFileSync(resultPath,JSON.stringify(r,null,2)+'\n',{flag:'wx'});
  assert.equal(r.ok,true);assert.deepEqual(ps('nwtoolset'),[]);assert.deepEqual(ps('nwmain'),[]);
  assert.equal(hash(manifestPath),manifestHash);assert.equal(hash(profile.module.path),profile.module.sha256);
  return{ok:true,status:'owned_failed_recovery_closed',resultPath,process:fresh.process,originalFailurePreserved:true};
}
