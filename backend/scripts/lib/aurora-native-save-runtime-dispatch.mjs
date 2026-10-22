import {join,basename} from 'node:path';
import {isDeepStrictEqual as same} from 'node:util';
const check=(condition,code)=>{if(!condition)throw new Error('NATIVE_SAVE_'+code);};
const inside=(a,b)=>a&&b&&[a.left,a.top,a.width,a.height,b.left,b.top,b.width,b.height].every(Number.isFinite)
  &&a.width>0&&a.height>0&&b.width>0&&b.height>0&&a.left>=b.left&&a.top>=b.top&&a.left+a.width<=b.left+b.width&&a.top+a.height<=b.top+b.height;

export function validateNativeSaveDispatchState(verdict,state,now){
  const owner=verdict.owner,geometry=verdict.geometryProfile;
  check(verdict.status==='verified'&&owner&&state?.processId===owner.pid&&state.startedAtUtc===owner.startedAt&&state.responding===true,'DISPATCH_OWNER_MISMATCH');
  check(Array.isArray(state.nwmain)&&state.nwmain.length===0&&Array.isArray(state.top)&&Array.isArray(state.children),'DISPATCH_PROCESS_STATE_INVALID');
  const captured=Date.parse(state.capturedAtUtc),current=Date.parse(now);
  check(Number.isFinite(captured)&&Number.isFinite(current)&&captured>=Date.parse(geometry.acceptedAt)&&current>=captured&&current-captured<=5000,'DISPATCH_STATE_STALE');
  const frames=state.top.filter(w=>w.className==='TfrmFrame'),frame=frames[0];
  check(frames.length===1&&frame.hwnd===owner.frameHwnd&&frame.ownerPid===owner.pid&&frame.visible===true&&frame.iconic===false
    &&frame.text===geometry.sourceNativeSave.save.titleAfter&&!frame.text.endsWith('*'),'DISPATCH_FRAME_MISMATCH');
  check(!state.top.some(w=>w.visible&&w.hwnd!==frame.hwnd&&w.className!=='TApplication'),'DISPATCH_MODAL_PRESENT');
  check(frame.screen?.deviceName==='\\\\.\\DISPLAY1'&&frame.screen.primary===false&&inside(frame.bounds,frame.screen.workingArea),'DISPATCH_MONITOR_INVALID');
  const viewers=state.children.filter(w=>w.className==='TfrmViewerArea'&&w.visible);
  check(viewers.length===1&&viewers[0].hwnd===owner.viewerHwnd&&viewers[0].ownerPid===owner.pid&&viewers[0].text?.trim().replace(/^-\s*/u,'')===geometry.area.resref,'DISPATCH_AREA_MISMATCH');
  check(state.children.some(w=>w.className==='TScrollBox'&&w.hwnd===owner.viewportHwnd&&w.ownerPid===owner.pid&&w.visible===true),'DISPATCH_VIEWPORT_MISMATCH');
  return {owner,frame,viewer:viewers[0]};
}

// The existing S07 runner supplies native ports. This transaction never retries
// a post with an uncertain result, nor relabels admission as runtime evidence.
export function dispatchNativeSaveRuntime({profile,profileSha256,outDir},ports){
  const intentPath=join(outDir,'aur-s07-native-save-dispatch-intent.json'),resultPath=join(outDir,'aur-s07-native-save-dispatch-result.json');
  const requestPath=join(outDir,'aur-s07-runtime-launch-request.json'),dispatchPath=join(outDir,'aur-s07-runtime-test-module-dispatch.json'),handoffPath=join(outDir,'aur-s07-runtime-handoff.json');
  for(const path of [intentPath,resultPath,dispatchPath,handoffPath])check(!ports.exists(path),'DISPATCH_ALREADY_ATTEMPTED');
  check(profile.launch.mode==='central_guarded_test_module_action','DISPATCH_CENTRAL_REQUIRED');
  const request=ports.readJson(requestPath),target={profileId:profile.id,profileSha256,modulePath:profile.module.path,moduleSha256:profile.module.sha256,area:profile.module.area,entryPoint:profile.module.entryPoint};
  check(request?.version==='aur-s07-runtime-launch-request/v1'&&request.action===profile.launch.mode&&typeof request.requestId==='string'
    &&Object.entries(target).every(([key,value])=>same(request[key],value)),'DISPATCH_REQUEST_MISMATCH');
  const verified=ports.verify(),before=ports.readState(),owner=verified.owner;
  validateNativeSaveDispatchState(verified,before,ports.now());
  check(Date.parse(request.createdAt)>=Date.parse(verified.geometryProfile.acceptedAt)&&Date.parse(request.createdAt)<=Date.parse(before.capturedAtUtc),'DISPATCH_REQUEST_CHRONOLOGY');
  ports.writeExclusive(intentPath,{version:'aur-s07-native-save-dispatch-intent/v1',createdAt:ports.now(),...target,requestId:request.requestId,admission:verified.admissionIdentity,owner,before,retryAllowed:false});
  let atom=null;
  try{
    const current=ports.verify();check(same(current.admissionIdentity,verified.admissionIdentity)&&same(current.owner,owner),'DISPATCH_EVIDENCE_DRIFT');
    const immediate=ports.readState();validateNativeSaveDispatchState(current,immediate,ports.now());
    check(same(ports.readJson(requestPath),request),'DISPATCH_REQUEST_DRIFT');
    ports.assertUnchanged(current);
    atom=ports.post({module:basename(profile.module.path),owner,area:current.geometryProfile.area.resref,title:current.geometryProfile.sourceNativeSave.save.titleAfter});
    check(atom?.ok===true&&atom.status==='posted'&&atom.module===basename(profile.module.path)&&atom.processId===owner.pid&&atom.startedAtUtc===owner.startedAt&&atom.frameHwnd===owner.frameHwnd
      &&atom.identityGuardVersion==='aurora-native-save-test-module-owner/v1'&&atom.requestsNwnStart===true&&atom.usesGlobalInput===false,'DISPATCH_ATOM_RESULT_INVALID');
    const dispatchedAt=ports.now(),dispatch={version:'aur-s07-runtime-test-module-dispatch/v1',dispatchedAt,requestId:request.requestId,...target,
      admission:current.admissionIdentity,admissionKind:'native-save-review-v1',owner,atom,requestsNwnStart:true,startsNwnDirectly:false,usesGlobalInput:false,
      restore:{ok:true,status:'not_needed_exact_visible_frame',processId:owner.pid,startedAtUtc:owner.startedAt,frameHwnd:owner.frameHwnd},
      safety:{method:'existing Test Module post atom with exact reviewed owner; already visible dedicated-monitor frame'}};
    const handoff={version:'aur-s07-runtime-handoff/v1',createdAt:dispatchedAt,requestId:request.requestId,...target,dispatchPath};
    ports.writeExclusive(dispatchPath,dispatch);ports.writeExclusive(handoffPath,handoff);
    ports.writeExclusive(resultPath,{version:'aur-s07-native-save-dispatch-result/v1',status:'posted',intentPath,dispatchPath,handoffPath,atom,runtimeClaimed:false});
    return {ok:true,status:'posted',dispatchPath,handoffPath,requestsNwnStart:true,startsNwnDirectly:false,usesGlobalInput:false,runtimeClaimed:false};
  }catch(error){
    try{ports.writeExclusive(resultPath,{version:'aur-s07-native-save-dispatch-result/v1',status:'failed',intentPath,atom,error:String(error.message),retryAllowed:false,runtimeClaimed:false});}
    catch(receiptError){error.receiptError=String(receiptError.message);}
    throw error;
  }
}
