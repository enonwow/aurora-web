// Public Build Module operation on an already owned binary-bootstrap session.
// Reuses central native atoms; no process launch, input transport or HAK mutation.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {buildState,buildMenu,ownedSavedClose,ownedBuildFrame,ownedUnbuiltClose,unbuiltCloseInspectorArgs,ownedAbandonedBuildClose,erfPayloadFingerprint} from './lib/aurora-toolset-rebuild-contract.mjs';
const [command,...args]=process.argv.slice(2),o={};for(let i=0;i<args.length;i+=2)o[args[i].slice(2)]=args[i+1];
assert.ok(['open','build','observe','finish','close','close-abandoned-dialog-dry-run','close-abandoned-dialog','adopt-unbuilt-container-resave'].includes(command));
assert.ok(o.ensureNonPrimary===undefined||(command==='open'&&o.ensureNonPrimary==='true'),'placement is an opt-in open phase');
assert.ok(o.closeAllowHiddenOriginalFrame===undefined||(command==='close'&&['true','false'].includes(o.closeAllowHiddenOriginalFrame)),'hidden original frame is an opt-in close phase');
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const owner=read(resolve(o.ownerManifest)),profile=read(resolve(o.profile)),dfm=read(resolve(o.dfm));
assert.equal(owner.status,'module_ready');assert.equal(owner.module.sha256,profile.module.sha256);
const out=resolve(o.outDir),statePath=join(out,'module-rebuild-state.json');mkdirSync(out,{recursive:true});
const module=profile.module.resref+'.mod',own=owner.open.process;
const raw=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"@(Get-Process nwtoolset -ErrorAction SilentlyContinue | Select-Object Id,@{Name='started';Expression={$_.StartTime.ToUniversalTime().ToString('o')}},@{Name='exe';Expression={$_.Path}}) | ConvertTo-Json -Compress"],{encoding:'utf8',windowsHide:true,timeout:15000}).trim();
const processes=raw?[JSON.parse(raw)].flat():[];assert.equal(processes.length,1);assert.equal(processes[0].Id,own.Id);assert.equal(processes[0].started,own.StartTimeUtc);assert.equal(hash(processes[0].exe),dfm.exeSha256);
let state=existsSync(statePath)?read(statePath):{version:'aurora-toolset-module-rebuild/v1',status:'created',module:profile.module,owner:own,events:[]};
assert.equal(state.owner.Id,own.Id);
assert.equal(state.owner.StartTimeUtc,own.StartTimeUtc);
function save(){writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');}
function atom(name,args){
 const at=new Date().toISOString();
 try{const stdout=execFileSync(process.execPath,[join(import.meta.dirname,name),...args],{encoding:'utf8',windowsHide:true,timeout:45000,maxBuffer:8*1024*1024});const value=JSON.parse(stdout.trim());assert.equal(value.ok,true);assert.ok(value.processId===undefined||value.processId===own.Id);state.events.push({at,atom:name,args,result:value});save();return value;}
 catch(e){state.events.push({at,atom:name,args,error:String(e.message),stderr:String(e.stderr??'').slice(-10000)});save();throw e;}
}
const dialog=()=>atom('probe-aurora-toolset-dialog-controls-no-global-input.mjs',['--class','TdlgVerifyModule','--title','Build Module']);
const click=(text,closes)=>atom('click-aurora-toolset-dialog-button-no-global-input.mjs',['--dialogClass','TdlgVerifyModule','--dialogTitle','Build Module','--buttonText',text,'--expectDialogCloses',String(closes)]);
const windows=()=>atom('inspect-aurora-toolset-visible-windows-no-global-input.mjs',[]);
if(command==='adopt-unbuilt-container-resave'){
 assert.equal(state.status,'created');assert.ok(!state.startedAt&&!state.containerResave);
 assert.equal(hash(o.sourceModule),profile.module.sha256,'original candidate must be unchanged');
 const source=readFileSync(o.sourceModule),current=readFileSync(profile.module.path);
 assert.deepEqual(erfPayloadFingerprint(current),erfPayloadFingerprint(source),'saved resource or description changed');
 const w=windows(),f=w.windows.filter(x=>x.className==='TfrmFrame');
 assert.equal(w.responding,true);assert.equal(f.length,1);assert.equal(f[0].visible,true);
 assert.ok(f[0].text.endsWith(' - '+module));assert.ok(w.windows.every(x=>['TfrmFrame','TApplication'].includes(x.className)));
 const currentHash=createHash('sha256').update(current).digest('hex');assert.equal(hash(profile.module.path),currentHash);
 state.containerResave={at:new Date().toISOString(),sourceModule:resolve(o.sourceModule),sourceSha256:profile.module.sha256,currentSha256:currentHash,frame:f[0],resourcesAndDescriptionExact:true,nativeBuildVerified:false};
 state.module={...state.module,sha256:currentHash,bytes:current.length};save();
}else if(command.startsWith('close-abandoned-dialog')){
 const prior=state.placementFrame;assert.ok(prior);
 const w=atom('inspect-aurora-toolset-visible-windows-no-global-input.mjs',['--includeHiddenFrameHwnd',String(prior.hwnd)]);
 const nwnCount=Number(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','@(Get-Process nwmain -ErrorAction SilentlyContinue).Count'],{encoding:'utf8',windowsHide:true,timeout:15000}).trim());
 const currentHash=hash(profile.module.path);
 const frame=ownedAbandonedBuildClose(state,w,o,currentHash,nwnCount);
 state.abandonedDialogAdmission={at:new Date().toISOString(),frame,currentModuleSha256:currentHash,nwnCount,authorization:o.closeAuthorization,nativeBuildVerified:false};save();
 if(command==='close-abandoned-dialog'){
  state.status='close_abandoned_dialog_submitted';save();
  state.closeResult=atom('close-aurora-toolset-window-no-global-input.mjs',['--expectedPid',String(own.Id),'--expectedStartedAtUtc',own.StartTimeUtc,'--expectedFrameHwnd',String(frame.hwnd),'--expectedFrameTitle',frame.text,'--allowHiddenExactFrame','true','--forceIfNeeded','true']);
  state.status='closed_abandoned_dialog_before_build';state.closedAt=new Date().toISOString();save();
 }
}else if(command==='close'){
 const beforeBuild=state.status==='created';
 assert.ok(o.closeAllowHiddenOriginalFrame!=='true'||beforeBuild,'hidden original unbuilt close requires created state');
 const previousFrame=state.finalWindows?.windows.find(x=>x.className==='TfrmFrame');assert.ok(beforeBuild||previousFrame);
 const closeWindows=atom('inspect-aurora-toolset-visible-windows-no-global-input.mjs',beforeBuild?unbuiltCloseInspectorArgs(state,owner,o):['--includeHiddenFrameHwnd',String(previousFrame.hwnd)]);
 const frame=beforeBuild?ownedUnbuiltClose(state,closeWindows,o,hash(profile.module.path),owner):ownedSavedClose(state,closeWindows,module,o.closeAuthorization,hash(profile.module.path));
 state.closeAuthorization=o.closeAuthorization;state.status='close_submitted';save();
 state.closeResult=atom('close-aurora-toolset-window-no-global-input.mjs',['--expectedPid',String(own.Id),'--expectedStartedAtUtc',own.StartTimeUtc,'--expectedFrameHwnd',String(frame.hwnd),'--expectedFrameTitle',frame.text,'--allowHiddenExactFrame','true','--forceIfNeeded','true']);
 state.status=beforeBuild?'closed_before_build':'closed_after_saved_build';state.closedAt=new Date().toISOString();save();
}else if(command==='open'){
 assert.equal(state.status,'created');assert.equal(hash(profile.module.path),state.module.sha256);
 if(o.ensureNonPrimary==='true'){
  assert.ok(!state.placementSubmittedAt,'placement already submitted; inspect its recorded outcome');
  const expectedHwnd=owner.open.result?.moduleOpen?.moduleWindowHwnd;
  assert.ok(Number.isSafeInteger(expectedHwnd)&&expectedHwnd>0,'original owner frame required');
  const probe=atom('inspect-aurora-toolset-visible-windows-no-global-input.mjs',['--includeHiddenFrameHwnd',String(expectedHwnd)]);
  const frame=ownedBuildFrame(state,probe,module,hash(profile.module.path),expectedHwnd);
  state.placementSubmittedAt=new Date().toISOString();state.placementFrame=frame;save();
  const placed=atom('restore-aurora-toolset-frame-noactivate.mjs',['--module',module,'--expectedPid',String(own.Id),'--frameHwnd',String(frame.hwnd),'--ensureNonPrimary','true']);
  assert.equal(placed.frameHwnd,frame.hwnd);assert.equal(placed.monitor.primary,false);assert.equal(placed.monitor.deviceName,'\\\\.\\DISPLAY1');
  assert.equal(ownedBuildFrame(state,windows(),module,hash(profile.module.path)).hwnd,frame.hwnd);
 }
 atom('preflight-aurora-toolset-no-modal-no-global-input.mjs',['--module',module]);
 const menu=atom('probe-aurora-toolset-main-menu-no-global-input.mjs',['--module',module]);
 const cmd=buildMenu(dfm.resources.TFRMFRAME,menu);state.status='open_submitted';save();
 atom('invoke-aurora-toolset-main-menu-command-no-global-input.mjs',['--module',module,'--topPosition',String(cmd.topPosition),'--itemPosition',String(cmd.itemPosition),'--expectedId',String(cmd.expectedId),'--action','Build Module']);
 const d=dialog();state.dialog=d;state.status=buildState(d)==='ready'?'dialog_open':'unexpected_dialog_state';save();
}else if(command==='build'){
 assert.equal(state.status,'dialog_open');const d=dialog();assert.equal(buildState(d),'ready');state.status='build_submitted';state.startedAt=new Date().toISOString();save();click('Build',false);
}else if(command==='observe'){
 assert.ok(['build_submitted','running','settled','build_errors'].includes(state.status));const d=dialog();state.dialog=d;let s=buildState(d),result;
 if(s==='ready'||s==='settled'){result=atom('read-aurora-toolset-dialog-list-items-no-global-input.mjs',['--dialogClass','TdlgVerifyModule','--dialogTitle','Build Module']);s=buildState(d,result.items,true);}
 if(s==='settled'){
  state.buildResults=result.items;state.status=JSON.stringify(result.items)===JSON.stringify(['No errors found'])?'settled':'build_errors';state.settledAt=new Date().toISOString();
 }else {assert.equal(s,'running','Build returned to ready without a proven result');state.status='running';}
 save();
}else{
 assert.ok(['settled','build_errors'].includes(state.status));const d=dialog(),result=atom('read-aurora-toolset-dialog-list-items-no-global-input.mjs',['--dialogClass','TdlgVerifyModule','--dialogTitle','Build Module']);assert.deepEqual(result.items,state.buildResults);assert.equal(buildState(d,result.items,true),'settled');click('Done',true);
 const w=windows(),frame=w.windows.filter(x=>x.className==='TfrmFrame'&&x.text.replace(/\*$/,'').endsWith(' - '+module));assert.equal(frame.length,1);
 if(frame[0].text.endsWith('*'))atom('save-aurora-toolset-module-no-global-input.mjs',['--module',module,'--modulePath',profile.module.path,'--frameHwnd',String(frame[0].hwnd)]);
 state.finalWindows=windows();state.postBuildModuleSha256=hash(profile.module.path);state.finishedAt=new Date().toISOString();state.status=state.buildResults.length===1&&state.buildResults[0]==='No errors found'?'saved_verified':'saved_with_build_errors';save();
}
console.log(JSON.stringify({ok:true,command,status:state.status,statePath,owner:own,buildResults:state.buildResults??null,postBuildModuleSha256:state.postBuildModuleSha256??null},null,2));
