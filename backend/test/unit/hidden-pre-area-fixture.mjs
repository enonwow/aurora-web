export function fixture(){
  const owner={pid:4242,startedAtUtc:'2026-09-07T15:24:31.2061917Z',frameHwnd:100,title:'BioWare Aurora Neverwinter Nights Toolset v1 - example.mod',applicationHwnd:101};
  const profile={version:'aurora-toolset-binary-module-bootstrap-profile/v1',id:'any-example',module:{resref:'example',path:'C:/test/example.mod',sha256:'a'.repeat(64),bytes:12},area:{resref:'stage'},orderedHakList:[]};
  const manifest={version:'aurora-toolset-binary-native-geometry-manifest/v1',status:'failed',blockerCode:'binary_native_child_process_failed',profileSha256:'b'.repeat(64),profileId:profile.id,profileKind:'model-fixture-geometry',module:profile.module,area:{resref:'stage',displayName:'Stage'},
    structuralPreflight:{ok:true,status:'binary_bootstrap_structural_readback_valid',module:profile.module,area:{resref:'stage',displayName:'Stage'},orderedHakList:[]},
    open:{process:{Id:owner.pid,StartTimeUtc:owner.startedAtUtc,Responding:true},result:{ok:true,skippedAreaOpen:true,accessViolation:{detected:false},moduleOpen:{ok:true,startedToolset:true,moduleLoadOwner:'explicit_open',moduleWindowHwnd:100,moduleWindowTitle:owner.title,moduleOpenActionSubmitted:true,blankFrameRestarted:false,allowSecondToolsetStart:false}}}};
  const message='No visible Toolset module window matched parts: example, mod';
  const queue={version:'toolset-area-oracle-queue/v1',status:'blocked',expectedModule:'example.mod',expectedModuleParts:'example|mod',offset:0,items:[{index:0,status:'blocked',area:{resref:'stage',name:'Stage'},blockerCode:'toolset_area_queue_exception',error:{message}}],safety:{launchesToolset:false,opensModule:false,savesModule:false,captureAreas:false,usesGlobalInput:false}};
  const failure={ok:false,command:'geometry-observe',blockerCode:manifest.blockerCode,startsToolset:false,startsNwn:false,usesGlobalInput:false,postFailureProcesses:[manifest.open.process],message:JSON.stringify({childScript:'run-toolset-area-oracle-queue.mjs',childExitCode:2,childResult:{status:'blocked',queueCount:1,firstBlocker:'toolset_area_queue_exception'},childStderr:message})};
  manifest.error=failure.message;
  const state={processId:owner.pid,startedAtUtc:owner.startedAtUtc,responding:true,nwmain:[],children:[],top:[{hwnd:100,ownerPid:4242,className:'TfrmFrame',text:owner.title,visible:false,iconic:false,screen:{deviceName:'\\\\.\\DISPLAY1',primary:false,workingArea:{left:-1920,top:0,width:1920,height:1032}},bounds:{left:-1900,top:0,width:1200,height:800}},{hwnd:101,ownerPid:4242,className:'TApplication',text:'Aurora',visible:true,iconic:true}]};
  return {owner,profile,manifest,queue,failure,recordedWindows:state.top.map(w=>({...w,title:w.text})),queueInput:[{name:'Stage',resref:'stage'}],profileSha256:'b'.repeat(64),state};
}

