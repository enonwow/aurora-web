import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildState,buildMenu,ownedSavedClose,ownedBuildFrame,ownedUnbuiltClose,unbuiltCloseInspectorArgs,ownedAbandonedBuildClose,erfPayloadFingerprint} from './lib/aurora-toolset-rebuild-contract.mjs';
const ctrl=(text,enabled)=>({className:'TButton',text,enabled,visible:true});
assert.equal(buildState({controls:[ctrl('Build',true),ctrl('Done',true)]}),'ready');
assert.equal(buildState({controls:[ctrl('Build',false),ctrl('Done',false)]}),'running');
assert.equal(buildState({controls:[ctrl('Build',false),ctrl('Done',true)]}),'settled');
assert.equal(buildState({controls:[ctrl('Build',true),ctrl('Done',true)]},['No errors found'],true),'settled');
assert.equal(buildState({controls:[ctrl('Build',true),ctrl('Done',true)]},[],true),'ready');
assert.throws(()=>buildState({controls:[ctrl('Build',true)]}));
assert.throws(()=>buildState({controls:[ctrl('Build',true),ctrl('Build',true),ctrl('Done',true)]}));
const tree={name:'frmFrame',children:[{name:'mmFrame',children:[{name:'Build1',properties:{Caption:'&Build'},children:[{name:'miVerifyModule',properties:{Action:'actVerifyModule'}}]}]}]};
const probe={items:[{position:0,children:[{position:0,id:123,enabled:true,separator:false}]}]};
assert.equal(buildMenu(tree,probe).expectedId,123);
assert.throws(()=>buildMenu(tree,{items:[]}));
assert.throws(()=>buildMenu(tree,{items:[{...probe.items[0],children:[{...probe.items[0].children[0],enabled:false}]}]}));
console.log('rebuild control/menu contract: 10 checks passed');
const frame={hwnd:77,className:'TfrmFrame',text:'Aurora - test.mod'},windowProbe={processId:4,windows:[frame]};
const saved={status:'saved_verified',owner:{Id:4},postBuildModuleSha256:'abc',finalWindows:windowProbe};
assert.equal(ownedSavedClose(saved,windowProbe,'test.mod','standing user instruction','abc'),frame);
for(const [s,p,m,a,h] of [
 [saved,windowProbe,'test.mod','','abc'],
 [{...saved,status:'running'},windowProbe,'test.mod','authorized','abc'],
 [saved,{...windowProbe,processId:5},'test.mod','authorized','abc'],
 [saved,windowProbe,'test.mod','authorized','changed'],
 [saved,{...windowProbe,windows:[{...frame,text:frame.text+'*'}]},'test.mod','authorized','abc'],
 [saved,{...windowProbe,windows:[frame,{className:'TDialog'}]},'test.mod','authorized','abc'],
 [saved,{...windowProbe,windows:[{...frame,hwnd:78}]},'test.mod','authorized','abc'],
])assert.throws(()=>ownedSavedClose(s,p,m,a,h));
console.log('owned saved build close: 8 checks passed');
assert.equal(ownedSavedClose(saved,{...windowProbe,windows:[{...frame,visible:false}]},'test.mod','authorized','abc').hwnd,77);
console.log('exact hidden saved frame is eligible without restore: passed');
// Clean owned startup frames may inherit primary-monitor placement. Placement
// must be refused for a running build, a dirty/wrong module or any modal.
const created={status:'created',owner:{Id:4},module:{sha256:'abc'}};
const startup={...windowProbe,responding:true,windows:[{...frame,visible:true}]};
assert.equal(ownedBuildFrame(created,startup,'test.mod','abc').hwnd,77);
for(const [s,p,h] of [
 [{...created,status:'build_submitted'},startup,'abc'],
 [created,{...startup,processId:5},'abc'],
 [created,{...startup,responding:false},'abc'],
 [created,startup,'changed'],
 [created,{...startup,windows:[{...frame,visible:true,text:frame.text+'*'}]},'abc'],
 [created,{...startup,windows:[{...frame,visible:true,text:'Aurora - other.mod'}]},'abc'],
 [created,{...startup,windows:[{...frame,visible:false}]},'abc'],
 [created,{...startup,windows:[...startup.windows,{className:'TdlgVerifyModule'}]},'abc'],
 [created,{...startup,windows:[...startup.windows,...startup.windows]},'abc'],
])assert.throws(()=>ownedBuildFrame(s,p,'test.mod',h));
console.log('owned pre-build placement: 10 checks passed');
const closeArgs={closeAuthorization:'User authorized switch back to this test',closeExpectedFrameHwnd:'77',closeExpectedFrameTitle:frame.text};
assert.equal(ownedUnbuiltClose(created,startup,closeArgs,'abc').hwnd,77);
for(const [s,p,a,h] of [
 [{...created,status:'build_submitted'},startup,closeArgs,'abc'],
 [created,startup,{...closeArgs,closeAuthorization:''},'abc'],
 [created,startup,{...closeArgs,closeExpectedFrameHwnd:'78'},'abc'],
 [created,startup,{...closeArgs,closeExpectedFrameTitle:'Other'},'abc'],
 [created,{...startup,windows:[{...startup.windows[0],text:frame.text+'*'}]},{...closeArgs,closeExpectedFrameTitle:frame.text+'*'},'abc'],
 [created,{...startup,windows:[...startup.windows,{className:'TDialog'}]},closeArgs,'abc'],
 [created,startup,closeArgs,'changed'],
 [created,{...startup,processId:5},closeArgs,'abc'],
])assert.throws(()=>ownedUnbuiltClose(s,p,a,h));
console.log('explicit clean unbuilt session closure: 9 checks passed');
// An external test hid the exact clean frame and dismissed the ready dialog.
// No Build was submitted. Closing is cleanup, never a successful Build receipt.
const abandoned={...created,status:'dialog_open',placementFrame:frame,
 dialog:{controls:[ctrl('Build',true),ctrl('Done',true)]},events:[
 {atom:'probe-aurora-toolset-dialog-controls-no-global-input.mjs',error:'expected_one_exact_dialog:0'}]};
const absent={...startup,windows:[{...frame,visible:false}]};
const abandonedArgs={...closeArgs,currentModuleSha256:'a'.repeat(64)};
assert.equal(ownedAbandonedBuildClose(abandoned,absent,abandonedArgs,'a'.repeat(64),0).hwnd,77);
for(const [s,p,a,h,n] of [
 [{...abandoned,startedAt:'submitted'},absent,abandonedArgs,'a'.repeat(64),0],
 [{...abandoned,status:'running'},absent,abandonedArgs,'a'.repeat(64),0],
 [{...abandoned,events:[]},absent,abandonedArgs,'a'.repeat(64),0],
 [abandoned,absent,abandonedArgs,'a'.repeat(64),1],
 [abandoned,absent,{...abandonedArgs,closeAuthorization:''},'a'.repeat(64),0],
 [abandoned,absent,abandonedArgs,'b'.repeat(64),0],
 [abandoned,{...absent,processId:5},abandonedArgs,'a'.repeat(64),0],
 [abandoned,{...absent,windows:[{...frame,hwnd:78}]},abandonedArgs,'a'.repeat(64),0],
 [abandoned,{...absent,windows:[{...frame,text:frame.text+'*'}]},abandonedArgs,'a'.repeat(64),0],
 [abandoned,{...absent,windows:[...absent.windows,{className:'TdlgVerifyModule'}]},abandonedArgs,'a'.repeat(64),0],
 [{...abandoned,dialog:{controls:[ctrl('Build',false),ctrl('Done',false)]}},absent,abandonedArgs,'a'.repeat(64),0],
])assert.throws(()=>ownedAbandonedBuildClose(s,p,a,h,n));
console.log('abandoned ready dialog cleanup: 12 checks passed');
// Container reordering/padding is not a changed module resource.
const erfFixture=padding=>{const b=Buffer.alloc(160+24+8+padding+3);b.write('MOD V1.0');b.writeUInt32LE(1,16);b.writeUInt32LE(160,20);b.writeUInt32LE(160,24);b.writeUInt32LE(184,28);b.write('test',160);b.writeUInt16LE(2009,180);b.writeUInt32LE(192+padding,184);b.writeUInt32LE(3,188);b.write('abc',192+padding);return b;};
assert.deepEqual(erfPayloadFingerprint(erfFixture(0)),erfPayloadFingerprint(erfFixture(32)));
const mutated=erfFixture(0);mutated[mutated.length-1]=100;
assert.notDeepEqual(erfPayloadFingerprint(erfFixture(0)),erfPayloadFingerprint(mutated));
assert.throws(()=>erfPayloadFingerprint(erfFixture(0).subarray(0,170)));
console.log('ERF exact payload fingerprint: 3 checks passed');

// Explicit pre-Build placement binds the immutable opener's exact frame.
// Recorded packet SHA015fb01f...590B; no native action in these checks.
const actualHidden={processId:58328,responding:true,windows:[{hwnd:343084076,className:'TfrmFrame',text:'BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - TLC_Zegluga.mod',visible:false},{hwnd:27727924,className:'TApplication',visible:true}]};
const actualCreated={status:'created',owner:{Id:58328},module:{sha256:'8d727c0cc38ac0249f849eed75c513db18648d812bc96ae03e45bd59dbacdeaf'}},actualHash=actualCreated.module.sha256;
assert.throws(()=>ownedBuildFrame(actualCreated,actualHidden,'TLC_Zegluga.mod',actualHash));
assert.equal(ownedBuildFrame(actualCreated,actualHidden,'TLC_Zegluga.mod',actualHash,343084076).hwnd,343084076);
const actualVisible={...actualHidden,windows:actualHidden.windows.map(x=>({...x,visible:true}))};
assert.equal(ownedBuildFrame(actualCreated,actualVisible,'TLC_Zegluga.mod',actualHash).hwnd,343084076);
assert.equal(ownedBuildFrame(actualCreated,actualVisible,'TLC_Zegluga.mod',actualHash,343084076).hwnd,343084076);
for(const [s,p,h,hwnd]of[
 [actualCreated,actualHidden,actualHash,343084077],
 [actualCreated,actualHidden,actualHash,0],
 [actualCreated,actualHidden,actualHash,'343084076'],
 [{...actualCreated,startedAt:'submitted'},actualHidden,actualHash,343084076],
 [{...actualCreated,status:'build_submitted'},actualHidden,actualHash,343084076],
 [actualCreated,actualHidden,'changed',343084076],
 [actualCreated,{...actualHidden,processId:1},actualHash,343084076],
 [actualCreated,{...actualHidden,responding:false},actualHash,343084076],
 [actualCreated,{...actualHidden,windows:[{...actualHidden.windows[0],text:actualHidden.windows[0].text+'*'}]},actualHash,343084076],
 [actualCreated,{...actualHidden,windows:[{...actualHidden.windows[0],text:'Aurora - other.mod'}]},actualHash,343084076],
 [actualCreated,{...actualHidden,windows:[...actualHidden.windows,{className:'TdlgVerifyModule'}]},actualHash,343084076],
 [actualCreated,{...actualHidden,windows:[actualHidden.windows[0],actualHidden.windows[0]]},actualHash,343084076]
])assert.throws(()=>ownedBuildFrame(s,p,'TLC_Zegluga.mod',h,hwnd));
const rebuildText=readFileSync(new URL('./aurora-toolset-rebuild.mjs',import.meta.url),'utf8');
const openPhase=rebuildText.slice(rebuildText.indexOf("}else if(command==='open')"),rebuildText.indexOf("}else if(command==='build')"));
assert.ok(openPhase.includes('owner.open.result?.moduleOpen?.moduleWindowHwnd'));
assert.ok(openPhase.includes("['--includeHiddenFrameHwnd',String(expectedHwnd)]"));
assert.ok(openPhase.includes("'--expectedPid',String(own.Id),'--frameHwnd',String(frame.hwnd)"));
assert.ok(openPhase.indexOf('state.placementSubmittedAt=')<openPhase.indexOf("atom('restore-aurora-toolset-frame-noactivate.mjs'"));
assert.ok(openPhase.includes('ownedBuildFrame(state,windows(),module,hash(profile.module.path)).hwnd'));
console.log('exact hidden pre-Build admission/default safety/routing: 21 checks passed');

// Hidden UNBUILT close is opt-in and bound to the original successful opener.
// Fixtures are admission data only: these tests never launch a native atom.
const hiddenOwner={status:'module_ready',module:{resref:'test',sha256:'abc'},
 open:{process:{Id:4,StartTimeUtc:'2026-10-05T15:32:21.3083084Z'},
 result:{moduleOpen:{moduleWindowHwnd:77,moduleWindowTitle:frame.text}}}};
const hiddenCreated={...created,module:hiddenOwner.module,owner:hiddenOwner.open.process,events:[]};
const hiddenOptions={...closeArgs,closeAllowHiddenOriginalFrame:'true'};
const hiddenProbe={...startup,windows:[{...startup.windows[0],visible:false}]};
assert.deepEqual(unbuiltCloseInspectorArgs(hiddenCreated,hiddenOwner,hiddenOptions),['--includeHiddenFrameHwnd','77']);
assert.deepEqual(unbuiltCloseInspectorArgs(hiddenCreated,hiddenOwner,closeArgs),[]);
assert.equal(ownedUnbuiltClose(hiddenCreated,hiddenProbe,hiddenOptions,'abc',hiddenOwner).hwnd,77);
assert.equal(ownedUnbuiltClose(hiddenCreated,startup,closeArgs,'abc').hwnd,77);
const submittedBuild={atom:'click-aurora-toolset-dialog-button-no-global-input.mjs',args:['--buttonText','Build'],error:'dispatch failed after submission'};
for(const [s,p,a,h,owner]of[
 [hiddenCreated,hiddenProbe,closeArgs,'abc',hiddenOwner],
 [hiddenCreated,hiddenProbe,{...hiddenOptions,closeAllowHiddenOriginalFrame:'false'},'abc',hiddenOwner],
 [hiddenCreated,hiddenProbe,hiddenOptions,'abc',undefined],
 [hiddenCreated,hiddenProbe,hiddenOptions,'abc',{...hiddenOwner,open:{...hiddenOwner.open,result:{moduleOpen:{}}}}],
 [hiddenCreated,hiddenProbe,hiddenOptions,'abc',{...hiddenOwner,status:'created'}],
 [hiddenCreated,hiddenProbe,hiddenOptions,'abc',{...hiddenOwner,module:{...hiddenOwner.module,resref:'other'}}],
 [hiddenCreated,hiddenProbe,hiddenOptions,'abc',{...hiddenOwner,module:{...hiddenOwner.module,sha256:'changed'}}],
 [{...hiddenCreated,owner:{...hiddenCreated.owner,Id:5}},hiddenProbe,hiddenOptions,'abc',hiddenOwner],
 [{...hiddenCreated,owner:{...hiddenCreated.owner,StartTimeUtc:'other'}},hiddenProbe,hiddenOptions,'abc',hiddenOwner],
 [hiddenCreated,{...hiddenProbe,processId:5},hiddenOptions,'abc',hiddenOwner],
 [hiddenCreated,{...hiddenProbe,responding:false},hiddenOptions,'abc',hiddenOwner],
 [hiddenCreated,{...hiddenProbe,windows:[{...hiddenProbe.windows[0],hwnd:78}]},hiddenOptions,'abc',hiddenOwner],
 [hiddenCreated,hiddenProbe,{...hiddenOptions,closeExpectedFrameHwnd:'78'},'abc',hiddenOwner],
 [hiddenCreated,hiddenProbe,{...hiddenOptions,closeExpectedFrameHwnd:'0'},'abc',hiddenOwner],
 [hiddenCreated,hiddenProbe,{...hiddenOptions,closeExpectedFrameTitle:'Aurora - other.mod'},'abc',hiddenOwner],
 [hiddenCreated,{...hiddenProbe,windows:[{...hiddenProbe.windows[0],text:'Aurora - other.mod'}]},hiddenOptions,'abc',hiddenOwner],
 [hiddenCreated,{...hiddenProbe,windows:[{...hiddenProbe.windows[0],text:frame.text+'*'}]},hiddenOptions,'abc',hiddenOwner],
 [hiddenCreated,{...hiddenProbe,windows:[...hiddenProbe.windows,{className:'TDialog'}]},hiddenOptions,'abc',hiddenOwner],
 [hiddenCreated,{...hiddenProbe,windows:[...hiddenProbe.windows,{className:'#32770',text:'Access violation'}]},hiddenOptions,'abc',hiddenOwner],
 [hiddenCreated,{...hiddenProbe,windows:[...hiddenProbe.windows,...hiddenProbe.windows]},hiddenOptions,'abc',hiddenOwner],
 [hiddenCreated,hiddenProbe,hiddenOptions,'changed',hiddenOwner],
 [{...hiddenCreated,status:'saved_verified'},hiddenProbe,hiddenOptions,'abc',hiddenOwner],
 [{...hiddenCreated,startedAt:'submitted'},hiddenProbe,hiddenOptions,'abc',hiddenOwner],
 [{...hiddenCreated,events:[submittedBuild]},hiddenProbe,hiddenOptions,'abc',hiddenOwner],
 [hiddenCreated,hiddenProbe,{...hiddenOptions,closeAuthorization:''},'abc',hiddenOwner],
])assert.throws(()=>ownedUnbuiltClose(s,p,a,h,owner));
// The submitted-Build guard applies to visible cleanup too.
assert.throws(()=>ownedUnbuiltClose({...hiddenCreated,startedAt:'submitted'},startup,closeArgs,'abc'));
assert.throws(()=>ownedUnbuiltClose({...hiddenCreated,events:[submittedBuild]},startup,closeArgs,'abc'));
console.log('original hidden unbuilt close opt-in and rejection: 31 checks passed');
