import {test} from 'node:test';
import assert from 'node:assert/strict';
import {admitCacheRestart} from '../../scripts/lib/aurora-verified-cache-restart.mjs';
const base=()=>({
 failure:{status:'failed',blockerCode:'toolset_temp0_requires_clean_start',profileSha256:'p',module:{sha256:'m'},openFailure:{child:{childResult:{blockerCode:'toolset_temp0_requires_clean_start',requireCleanStart:true,canUseVerifiedTemp0Cache:false}},postChildProcesses:[]}},
 profileHash:'p',moduleHash:'m',tempExists:false,processes:[],restartExists:false,
 recovery:{openFailure:{child:{childResult:{startedToolset:true,recoveryConfirmationHandled:true,recoveryConfirmationHandledCount:1,moduleLoadOwner:'verified_temp0_recovery',moduleOpenActionKind:'verified_temp0_recovery_yes'}},postChildProcesses:[{Id:42,StartTimeUtc:'2026-09-10T01:00:00.7771234Z'}]},verifiedTemp0RecoveryAdmission:{module:{sha256:'saved'},resources:[{identical:true}]}},
 recoveredModuleHash:'saved',close:{ok:true,expectedPid:42,expectedStartedAtUtc:'2026-09-10T01:00:00.7770000Z',forceFallbackUsed:false,afterProcesses:[],beforeProcesses:[{Id:42}],postedCloseWindows:[{processId:42,className:'TfrmFrame'}]}
});
test('only unchanged prelaunch candidate after witnessed non-destructive cache closure is restartable',()=>{
 assert.equal(admitCacheRestart(base()).admitted,true);
 for(const mutate of [x=>x.tempExists=true,x=>x.processes=[{}],x=>x.restartExists=true,x=>x.moduleHash='different',x=>x.profileHash='different',x=>x.close.ok=false,x=>x.close.forceFallbackUsed=true,x=>x.close.expectedPid=43,x=>x.close.expectedStartedAtUtc='2026-09-10T01:00:02Z',x=>x.recoveredModuleHash='changed',x=>x.failure.openFailure.postChildProcesses=[{}],x=>x.recovery.openFailure.child.childResult.recoveryConfirmationHandledCount=2]){
  const x=base();mutate(x);assert.throws(()=>admitCacheRestart(x));
 }
});
