import assert from 'node:assert/strict';
import {admitFailedOpenClose} from '../../scripts/lib/aurora-binary-failed-open-close.mjs';
const start='2026-09-10T15:30:47.8013596Z';
const blank='BioWare Aurora Neverwinter Nights Toolset v1.0';
const frame={hwnd:123,className:'TfrmFrame',text:blank,visible:true};
const p={Id:7,StartTimeUtc:start,Responding:true};
const f={status:'failed',blockerCode:'toolset_module_loaded_but_modal_open',module:{sha256:'mod'},profileSha256:'profile',openFailure:{postChildProcesses:[p],postChildWindows:{windows:[frame,{className:'TApplication'}]},child:{childResult:{blockerCode:'toolset_module_loaded_but_modal_open',startedToolset:true,moduleLoadOwner:'verified_temp0_recovery',recoveryConfirmationHandled:true,recoveryConfirmationHandledCount:1,moduleOpenActionKind:'verified_temp0_recovery_yes',postSelectionBlockingModal:{processId:7,className:'TdlgProgress'}}}}};
const input=()=>({failure:structuredClone(f),processes:[structuredClone(p)],nwn:[],windows:{ok:true,processId:7,responding:true,windows:[structuredClone(frame),{className:'TApplication'}]},moduleHash:'mod',profileHash:'profile',authorization:'standing owned-session close'});
assert.equal(admitFailedOpenClose(input()).frame.hwnd,123);
const hidden=input();hidden.windows.windows[0].visible=false;assert.equal(admitFailedOpenClose(hidden).frame.hwnd,123);
const bad=[x=>x.nwn.push({Id:8}),x=>x.processes.push(p),x=>x.processes[0].Id=8,x=>x.processes[0].StartTimeUtc='2026-09-10T15:30:48Z',x=>x.windows.windows[0].text+=' - demo.mod',x=>x.windows.windows[0].hwnd=456,x=>x.windows.windows.push({className:'TdlgProgress'}),x=>x.moduleHash='changed',x=>x.profileHash='changed',x=>x.authorization='',x=>x.failure.status='module_ready',x=>x.failure.openFailure.child.childResult.moduleLoadOwner='external',x=>x.windows.responding=false];
for(const change of bad){const x=input();change(x);assert.throws(()=>admitFailedOpenClose(x));}
console.log('failed-open close: positive plus13negative contracts passed');
