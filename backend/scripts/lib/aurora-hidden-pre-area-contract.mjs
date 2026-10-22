export const HIDDEN_PRE_AREA_VERSION='aurora-hidden-pre-area-continuation/v1';
export const HIDDEN_PRE_AREA_DIRECTORY='hidden-pre-area-v1';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function check(value,code){if(!value)throw Object.assign(new Error(code),{code});}
const positive=n=>Number.isSafeInteger(n)&&n>0;
const fullTime=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{7}Z$/.test(s);

/** Historical packet admission only. Fresh native state is independently required. */
export function validateHiddenPreAreaPacket({profile,manifest,queue,queueInput,failure,recordedWindows,profileSha256}){
  check(profile?.version==='aurora-toolset-binary-module-bootstrap-profile/v1','HIDDEN_PROFILE_VERSION');
  check(manifest?.version==='aurora-toolset-binary-native-geometry-manifest/v1'&&manifest.status==='failed'&&manifest.blockerCode==='binary_native_child_process_failed','HIDDEN_FAILURE_CLASS');
  check(manifest.profileKind==='model-fixture-geometry'&&manifest.profileId===profile.id&&manifest.profileSha256===profileSha256&&equal(manifest.module,profile.module),'HIDDEN_PROFILE_BINDING');
  for(const key of ['nativeSave','postSaveProfilePath','nativeGitReadback','nativeEntryReadback','queue','hiddenFrameContinuation'])check(manifest[key]===undefined,'HIDDEN_NATIVE_WORK_PRESENT');
  const structural=manifest.structuralPreflight;
  check(structural?.ok===true&&structural.status==='binary_bootstrap_structural_readback_valid'&&equal(structural.module,profile.module)&&equal(structural.orderedHakList,profile.orderedHakList)&&structural.area?.resref===profile.area.resref,'HIDDEN_PREFLIGHT_BINDING');
  const result=manifest.open?.result,open=result?.moduleOpen,process=manifest.open?.process;
  check(result?.ok===true&&result.skippedAreaOpen===true&&result.accessViolation?.detected===false&&open?.ok===true&&open.startedToolset===true&&open.moduleLoadOwner==='explicit_open'&&open.moduleOpenActionSubmitted===true&&open.blankFrameRestarted===false&&open.allowSecondToolsetStart===false,'HIDDEN_OPEN_LINEAGE');
  check(positive(process?.Id)&&fullTime(process.StartTimeUtc)&&process.Responding===true&&positive(open.moduleWindowHwnd)&&typeof open.moduleWindowTitle==='string'&&open.moduleWindowTitle.endsWith(` - ${profile.module.resref}.mod`),'HIDDEN_OPEN_OWNER');
  check(manifest.area?.resref===profile.area.resref&&manifest.area.displayName===structural.area.displayName,'HIDDEN_AREA_BINDING');
  check(equal(queueInput,[{name:manifest.area.displayName,resref:profile.area.resref}]),'HIDDEN_QUEUE_INPUT');
  check(queue?.version==='toolset-area-oracle-queue/v1'&&queue.status==='blocked'&&queue.offset===0&&queue.expectedModule===`${profile.module.resref}.mod`&&queue.expectedModuleParts===`${profile.module.resref}|mod`&&queue.items?.length===1,'HIDDEN_QUEUE_STATE');
  const item=queue.items[0],message=`No visible Toolset module window matched parts: ${profile.module.resref}, mod`;
  check(item.index===0&&item.status==='blocked'&&item.blockerCode==='toolset_area_queue_exception'&&item.area?.resref===profile.area.resref&&item.area.name===manifest.area.displayName&&item.error?.message?.includes(message),'HIDDEN_PRE_DISPATCH_FAILURE');
  for(const key of ['launchesToolset','opensModule','savesModule','captureAreas','usesGlobalInput'])check(queue.safety?.[key]===false,'HIDDEN_QUEUE_SAFETY');
  check(failure?.ok===false&&failure.command==='geometry-observe'&&failure.blockerCode===manifest.blockerCode&&failure.message===manifest.error&&failure.startsToolset===false&&failure.startsNwn===false&&failure.usesGlobalInput===false,'HIDDEN_FAILURE_BINDING');
  check(failure.postFailureProcesses?.length===1&&failure.postFailureProcesses[0].Id===process.Id&&failure.postFailureProcesses[0].StartTimeUtc===process.StartTimeUtc&&failure.postFailureProcesses[0].Responding===true,'HIDDEN_FAILURE_OWNER');
  let child;try{child=JSON.parse(failure.message);}catch{check(false,'HIDDEN_CHILD_PACKET_INVALID');}
  check(child.childScript==='run-toolset-area-oracle-queue.mjs'&&child.childExitCode===2&&child.childResult?.status==='blocked'&&child.childResult.queueCount===1&&child.childResult.firstBlocker==='toolset_area_queue_exception'&&child.childStderr?.includes(message),'HIDDEN_CHILD_BINDING');
  check(Array.isArray(recordedWindows),'HIDDEN_RECORDED_WINDOWS');
  const frame=recordedWindows.filter(w=>w.className==='TfrmFrame'),visible=recordedWindows.filter(w=>w.visible);
  check(frame.length===1&&frame[0].hwnd===open.moduleWindowHwnd&&frame[0].title===open.moduleWindowTitle&&frame[0].visible===false&&frame[0].iconic===false,'HIDDEN_RECORDED_FRAME');
  check(visible.length===1&&visible[0].className==='TApplication'&&visible[0].iconic===true&&positive(visible[0].hwnd),'HIDDEN_RECORDED_APPLICATION');
  return {pid:process.Id,startedAtUtc:process.StartTimeUtc,frameHwnd:open.moduleWindowHwnd,title:open.moduleWindowTitle,applicationHwnd:visible[0].hwnd};
}

/** Probe is the existing owned window-tree reader, extended with additive metadata. */
export function validateHiddenFrameState(owner,state,mode){
  check(mode==='hidden'||mode==='visible','HIDDEN_STATE_MODE');
  check(state?.processId===owner.pid&&state.startedAtUtc===owner.startedAtUtc&&state.responding===true,'HIDDEN_LIVE_OWNER');
  check(Array.isArray(state.nwmain)&&state.nwmain.length===0,'HIDDEN_NWN_PRESENT');
  check(Array.isArray(state.top)&&Array.isArray(state.children),'HIDDEN_LIVE_WINDOWS_MISSING');
  check(!state.children.some(w=>w.className==='TfrmViewerArea'),'HIDDEN_AREA_ALREADY_PRESENT');
  const frames=state.top.filter(w=>w.className==='TfrmFrame'),apps=state.top.filter(w=>w.className==='TApplication');
  check(frames.length===1&&frames[0].hwnd===owner.frameHwnd&&frames[0].ownerPid===owner.pid&&frames[0].text===owner.title&&frames[0].iconic===false,'HIDDEN_LIVE_FRAME');
  check(apps.length===1&&apps[0].hwnd===owner.applicationHwnd&&apps[0].ownerPid===owner.pid,'HIDDEN_LIVE_APPLICATION');
  const visible=state.top.filter(w=>w.visible);
  check(visible.every(w=>w===frames[0]||w===apps[0]),'HIDDEN_VISIBLE_MODAL');
  if(mode==='hidden')check(frames[0].visible===false&&visible.length===1&&visible[0]===apps[0]&&apps[0].iconic===true,'HIDDEN_FRAME_NOT_HIDDEN');
  else {
    check(frames[0].visible===true&&frames[0].screen?.deviceName==='\\\\.\\DISPLAY1'&&frames[0].screen.primary===false,'HIDDEN_RESTORED_MONITOR');
    const b=frames[0].bounds,w=frames[0].screen.workingArea;
    check(b&&w&&[b.left,b.top,b.width,b.height,w.left,w.top,w.width,w.height].every(Number.isFinite)&&b.width>0&&b.height>0&&b.left>=w.left&&b.top>=w.top&&b.left+b.width<=w.left+w.width&&b.top+b.height<=w.top+w.height,'HIDDEN_RESTORED_BOUNDS');
  }
  return owner;
}
