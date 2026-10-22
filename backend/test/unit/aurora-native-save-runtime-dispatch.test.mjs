import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatchNativeSaveRuntime,validateNativeSaveDispatchState} from '../../scripts/lib/aurora-native-save-runtime-dispatch.mjs';

const clone=structuredClone;
function fixture(){
  const owner={pid:1234,startedAt:'2026-09-07T10:00:00.1234567Z',frameHwnd:5678,viewerHwnd:6677,viewportHwnd:6789};
  const verdict={status:'verified',admissionIdentity:{path:'C:/test/admission.json',sha256:'a'.repeat(64)},owner,
    geometryProfile:{acceptedAt:'2026-09-07T10:00:01Z',module:{resref:'example',path:'C:/test/modules/example.mod'},area:{resref:'test_area'},sourceNativeSave:{save:{titleAfter:'Toolset - example.mod'}}}};
  const state={processId:owner.pid,startedAtUtc:owner.startedAt,responding:true,capturedAtUtc:'2026-09-07T10:01:01Z',nwmain:[],
    top:[{hwnd:owner.frameHwnd,ownerPid:owner.pid,className:'TfrmFrame',text:'Toolset - example.mod',visible:true,iconic:false,bounds:{left:-1900,top:20,width:1200,height:800},screen:{deviceName:'\\\\.\\DISPLAY1',primary:false,workingArea:{left:-1920,top:0,width:1920,height:1032}}}],
    children:[{hwnd:owner.viewerHwnd,ownerPid:owner.pid,className:'TfrmViewerArea',text:' - test_area',visible:true},{hwnd:owner.viewportHwnd,ownerPid:owner.pid,className:'TScrollBox',visible:true}]};
  let posts=0,checks=0;const files=new Map();
  const profile={id:'test',module:{path:'C:/test/modules/example.mod',sha256:'b'.repeat(64),area:'test_area',entryPoint:[1,2,0]},launch:{mode:'central_guarded_test_module_action'}};
  files.set('C:/test/runtime/aur-s07-runtime-launch-request.json',{version:'aur-s07-runtime-launch-request/v1',requestId:'request',createdAt:'2026-09-07T10:01:00Z',action:profile.launch.mode,profileId:'test',profileSha256:'c'.repeat(64),modulePath:profile.module.path,moduleSha256:profile.module.sha256,area:'test_area',entryPoint:[1,2,0]});
  const key=path=>path.replaceAll('\\','/');
  const ports={verify:()=>{checks++;return clone(verdict);},readState:()=>clone(state),assertUnchanged:()=>{},now:()=> '2026-09-07T10:01:02Z',exists:path=>files.has(key(path)),readJson:path=>clone(files.get(key(path))),
    writeExclusive:(path,value)=>{assert(!files.has(key(path)),'overwrite');files.set(key(path),clone(value));},
    post:()=>{posts++;return {ok:true,status:'posted',processId:owner.pid,startedAtUtc:owner.startedAt,frameHwnd:owner.frameHwnd,module:'example.mod',identityGuardVersion:'aurora-native-save-test-module-owner/v1',requestsNwnStart:true,usesGlobalInput:false};}};
  return {owner,verdict,state,profile,files,ports,get posts(){return posts;},get checks(){return checks;},input:{profile,profileSha256:'c'.repeat(64),outDir:'C:/test/runtime'}};
}

test('new admission posts once through existing atom and preserves existing S07 handoff versions',()=>{
  const f=fixture(),result=dispatchNativeSaveRuntime(f.input,f.ports);assert.equal(result.status,'posted');assert.equal(f.posts,1);assert.equal(f.checks,2);
  assert.equal(f.files.get(result.handoffPath.replaceAll('\\','/')).version,'aur-s07-runtime-handoff/v1');
  assert.throws(()=>dispatchNativeSaveRuntime(f.input,f.ports),/ALREADY_ATTEMPTED/);assert.equal(f.posts,1);
});
for(const [name,mutate] of [
  ['PID',s=>s.processId++],['100 ns start',s=>s.startedAtUtc='2026-09-07T10:00:00.1234568Z'],
  ['frame',s=>s.top[0].hwnd++],['dirty',s=>s.top[0].text+='*'],['NWN',s=>s.nwmain=[{pid:1}]],['hidden',s=>s.top[0].visible=false],
  ['modal',s=>s.top.push({hwnd:12,visible:true,className:'TDialog'})],['Area',s=>s.children[0].text='other'],
  ['viewport',s=>s.children[1].hwnd++],['primary',s=>s.top[0].screen.primary=true],['bounds',s=>s.top[0].bounds.left=10],
])test('rejects '+name+' before Test Module',()=>{const f=fixture();mutate(f.state);assert.throws(()=>dispatchNativeSaveRuntime(f.input,f.ports),/NATIVE_SAVE/);assert.equal(f.posts,0);});
test('evidence drift immediately before post leaves a consumed intent and never retries',()=>{
  const f=fixture();f.ports.assertUnchanged=()=>{throw new Error('NATIVE_SAVE_EVIDENCE_DRIFT');};
  assert.throws(()=>dispatchNativeSaveRuntime(f.input,f.ports),/DRIFT/);assert.equal(f.posts,0);
  assert.throws(()=>dispatchNativeSaveRuntime(f.input,f.ports),/ALREADY_ATTEMPTED/);
});
test('failed/uncertain post is immutable and blocks another attempt',()=>{
  const f=fixture();f.ports.post=()=>{throw new Error('mock timeout after possible post');};
  assert.throws(()=>dispatchNativeSaveRuntime(f.input,f.ports),/mock timeout/);
  assert.throws(()=>dispatchNativeSaveRuntime(f.input,f.ports),/ALREADY_ATTEMPTED/);
});
test('owner drift between admission and post prevents action',()=>{
  const f=fixture();let calls=0;f.ports.readState=()=>{const s=clone(f.state);if(++calls===2)s.startedAtUtc='2026-09-07T10:00:00.1234568Z';return s;};
  assert.throws(()=>dispatchNativeSaveRuntime(f.input,f.ports),/OWNER/);assert.equal(f.posts,0);
});
