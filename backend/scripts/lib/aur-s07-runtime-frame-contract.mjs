// One immutable observational PNG through the existing qualified physical atom.
// Does not substitute for the continuous MP4 required by the S07 proof packet.
import {resolve,join} from 'node:path';
import {validateLeaseEvidence} from '../capture-nwmain-proof-window-no-global-input.mjs';
const check=(v,c)=>{if(!v)throw Error(c);};
export function planRuntimeFrame({profile,profileSha256,observation,windowResult,outDir,frameIndex},exists){
 check(Number.isInteger(frameIndex)&&frameIndex>=0&&frameIndex<16,'runtime_frame_index_invalid');
 check(observation?.version==='aur-s07-runtime-observation/v1'&&observation.profileId===profile.id&&observation.profileSha256===profileSha256&&observation.moduleSha256===profile.module.sha256&&observation.area===profile.module.area&&JSON.stringify(observation.entryPoint)===JSON.stringify(profile.module.entryPoint),'runtime_frame_observation_mismatch');
 const own=observation.process;
 check(own?.name==='nwmain'&&Number.isSafeInteger(own.pid)&&own.pid>0&&typeof own.startedAt==='string'&&own.mainWindowHandle>0,'runtime_frame_owner_invalid');
 check(windowResult?.status==='verified'&&windowResult.profileSha256===profileSha256&&windowResult.moduleSha256===profile.module.sha256&&windowResult.after?.processes?.length===1&&windowResult.after.processes[0].pid===own.pid&&windowResult.after.processes[0].startedAt===own.startedAt&&windowResult.after.window?.hwnd===own.mainWindowHandle&&windowResult.policy?.expectedDevice===profile.runtimeWindow?.expectedDevice&&windowResult.policy.primary===false,'runtime_frame_window_binding_invalid');
 const name='frame-'+String(frameIndex).padStart(2,'0'),png=resolve(outDir,name+'.png'),receipt=resolve(outDir,name+'.json'),intent=resolve(outDir,name+'-intent.json');
 check(![png,receipt,intent].some(exists),'runtime_frame_already_submitted');
 return {png,receipt,intent,pid:own.pid,startedAtUtc:own.startedAt,hwnd:own.mainWindowHandle};
}
export function validateRuntimeFrameResult(result,plan,expectedDevice){
 validateLeaseEvidence(result,{pid:plan.pid,startedAtUtc:plan.startedAtUtc});
 check(result.windowHwnd===plan.hwnd&&result.monitor.deviceName===expectedDevice&&resolve(result.pngPath)===plan.png,'runtime_frame_result_binding_invalid');
 return {status:'captured-for-observation',continuousVideoProof:false};
}
