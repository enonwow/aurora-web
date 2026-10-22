import test from 'node:test';
import assert from 'node:assert/strict';
import {validateHiddenPreAreaPacket,validateHiddenFrameState} from '../../scripts/lib/aurora-hidden-pre-area-contract.mjs';

import {fixture} from './hidden-pre-area-fixture.mjs';

test('exact failed pre-Area lineage admits one same-owner hidden frame',()=>{
  const f=fixture(),owner=validateHiddenPreAreaPacket(f);assert.deepEqual(owner,f.owner);
  assert.deepEqual(validateHiddenFrameState(owner,f.state,'hidden'),owner);
});

const packetCases={
  'wrong failure stage':f=>f.manifest.blockerCode='native_geometry_save_unverified',
  'native Save already attempted':f=>f.manifest.nativeSave={},
  'post-save profile exists':f=>f.manifest.postSaveProfilePath='saved.json',
  'Area already dispatched':f=>f.queue.items[0].status='opened',
  'wrong Area':f=>f.queue.items[0].area.resref='different',
  'another queue item':f=>f.queue.items.push(structuredClone(f.queue.items[0])),
  'wrong source profile':f=>f.profileSha256='c'.repeat(64),
  'wrong module hash':f=>f.profile.module={...f.profile.module,sha256:'d'.repeat(64)},
  'failed open':f=>f.manifest.open.result.ok=false,
  'another module load owner':f=>f.manifest.open.result.moduleOpen.moduleLoadOwner='external',
  'second start':f=>f.manifest.open.result.moduleOpen.blankFrameRestarted=true,
  'failure owner changed':f=>f.failure.postFailureProcesses=[{...f.manifest.open.process,StartTimeUtc:'2026-09-07T15:24:31.2061918Z'}],
  'other failure child':f=>f.failure.message=f.manifest.error=JSON.stringify({childScript:'save.mjs'}),
  'recorded visible frame':f=>f.recordedWindows[0].visible=true,
};
for(const [name,change] of Object.entries(packetCases))test(`packet rejects ${name}`,()=>{const f=fixture();change(f);assert.throws(()=>validateHiddenPreAreaPacket(f));});
const stateCases={
  PID:f=>f.state.processId++,StartTime:f=>f.state.startedAtUtc='2026-09-07T15:24:31.2061918Z',
  HWND:f=>f.state.top[0].hwnd++,title:f=>f.state.top[0].text='another.mod',dirty:f=>f.state.top[0].text+='*',
  NWN:f=>f.state.nwmain.push({pid:4}),responsive:f=>f.state.responding=false,
  modal:f=>f.state.top.push({hwnd:500,visible:true,className:'TdlgProgress'}),
  'extra frame':f=>f.state.top.push({...f.state.top[0],hwnd:99}),
  'application HWND':f=>f.state.top[1].hwnd++,
  'non-iconic application':f=>f.state.top[1].iconic=false,
  'Area viewer':f=>f.state.children.push({className:'TfrmViewerArea',visible:false}),
};
for(const [name,change] of Object.entries(stateCases))test(`fresh state rejects ${name}`,()=>{const f=fixture();change(f);assert.throws(()=>validateHiddenFrameState(f.owner,f.state,'hidden'));});
test('restored admission requires visible exact frame on the dedicated monitor',()=>{
  const f=fixture();assert.throws(()=>validateHiddenFrameState(f.owner,f.state,'visible'));
  f.state.top[0].visible=true;assert.deepEqual(validateHiddenFrameState(f.owner,f.state,'visible'),f.owner);
  f.state.top[0].screen.primary=true;assert.throws(()=>validateHiddenFrameState(f.owner,f.state,'visible'));
});
