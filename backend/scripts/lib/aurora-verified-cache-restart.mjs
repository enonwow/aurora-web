import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

export function admitCacheRestart(x){
 const f=x.failure,c=f.openFailure?.child?.childResult,r=x.recovery.openFailure?.child?.childResult;
 assert.equal(f.status,'failed');assert.equal(f.blockerCode,'toolset_temp0_requires_clean_start');
 assert.equal(c?.blockerCode,f.blockerCode);assert.equal(c.requireCleanStart,true);assert.equal(c.canUseVerifiedTemp0Cache,false);
 assert.deepEqual(f.openFailure.postChildProcesses,[]);assert.equal(f.profileSha256,x.profileHash);assert.equal(f.module.sha256,x.moduleHash);
 assert.equal(x.tempExists,false);assert.deepEqual(x.processes,[]);assert.equal(x.restartExists,false);
 assert.equal(r?.startedToolset,true);assert.equal(r.recoveryConfirmationHandled,true);assert.equal(r.recoveryConfirmationHandledCount,1);
 assert.equal(r.moduleLoadOwner,'verified_temp0_recovery');assert.equal(r.moduleOpenActionKind,'verified_temp0_recovery_yes');
 const a=x.recovery.verifiedTemp0RecoveryAdmission;assert.ok(a?.resources.length);assert.ok(a.resources.every(r=>r.identical===true));
 assert.equal(a.module.sha256,x.recoveredModuleHash);
 const owners=x.recovery.openFailure.postChildProcesses;assert.equal(owners.length,1);
 assert.equal(x.close.ok,true);assert.equal(x.close.forceFallbackUsed,false);assert.deepEqual(x.close.afterProcesses,[]);
 assert.equal(x.close.expectedPid,owners[0].Id);assert.equal(Date.parse(x.close.expectedStartedAtUtc),Date.parse(owners[0].StartTimeUtc));
 assert.equal(x.close.beforeProcesses.length,1);assert.equal(x.close.beforeProcesses[0].Id,owners[0].Id);
 assert.equal(x.close.postedCloseWindows.length,1);assert.equal(x.close.postedCloseWindows[0].processId,owners[0].Id);
 assert.equal(x.close.postedCloseWindows[0].className,'TfrmFrame');
 return {admitted:true,profileHash:x.profileHash,moduleHash:x.moduleHash,recoveredModuleHash:x.recoveredModuleHash,closedPid:owners[0].Id};
}

export function runCacheRestart(command,argv){
 assert.ok(['restart-after-verified-cache-close-dry-run','restart-after-verified-cache-close'].includes(command));
 const o={};for(let i=0;i<argv.length;i+=2){assert.ok(argv[i].startsWith('--'));o[argv[i].slice(2)]=argv[i+1];}
 const required=k=>{assert.ok(o[k],k);return path.resolve(o[k]);};
 const profilePath=required('profile'),out=required('outDir'),recoveryPath=required('recoveryManifest'),closePath=required('closeReceipt');
 const manifestPath=path.join(out,'binary-native-geometry-manifest.json'),receiptPath=path.join(out,'binary-native-cache-restart.json');
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
 const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 const profile=read(profilePath),failure=read(manifestPath),recovery=read(recoveryPath),close=read(closePath);
 assert.equal(path.resolve(failure.profilePath),profilePath);assert.equal(path.resolve(failure.artifactDir),out);
 assert.equal(profile.module.sha256,hash(profile.module.path));
 const processList=()=>{const raw=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"@(Get-Process nwtoolset,nwmain,nwserver -ErrorAction SilentlyContinue | Select-Object Id,StartTime) | ConvertTo-Json -Compress"],{windowsHide:true,encoding:'utf8',timeout:15000}).trim();return raw?[JSON.parse(raw)].flat():[];};
 const cache=path.join(path.dirname(recovery.verifiedTemp0RecoveryAdmission.module.path),'temp0');
 const inspect=()=>admitCacheRestart({failure,profileHash:hash(profilePath),moduleHash:hash(profile.module.path),recovery,recoveredModuleHash:hash(recovery.verifiedTemp0RecoveryAdmission.module.path),close,tempExists:fs.existsSync(cache),processes:processList(),restartExists:fs.existsSync(receiptPath)});
 const admission=inspect();const failureHash=hash(manifestPath);
 const archive=path.join(out,'restart-history',failureHash+'-prelaunch-cache.json');assert.ok(archive.startsWith(out+path.sep));
 const result={ok:true,command,admission,archive,originalFailure:{path:manifestPath,sha256:failureHash},recovery:{path:recoveryPath,sha256:hash(recoveryPath)},closeReceipt:{path:closePath,sha256:hash(closePath)},receiptPath,archiveOnly:true,startsToolset:false,startsNwn:false,usesGlobalInput:false,next:['preflight','open']};
 if(command.endsWith('-dry-run'))return result;
 inspect();assert.equal(hash(manifestPath),failureHash);assert.equal(hash(recoveryPath),result.recovery.sha256);assert.equal(hash(closePath),result.closeReceipt.sha256);
 fs.mkdirSync(path.dirname(archive),{recursive:true});assert.equal(fs.existsSync(archive),false);
 fs.renameSync(manifestPath,archive);
 try{fs.writeFileSync(receiptPath,JSON.stringify({...result,createdAt:new Date().toISOString()},null,2)+'\n',{flag:'wx'});}catch(e){fs.renameSync(archive,manifestPath);throw e;}
 return result;
}
