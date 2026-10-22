import test from 'node:test';
import assert from 'node:assert/strict';
import {admitForeground,withTemporaryRaise} from '../../scripts/lib/nwmain-foreground.mjs';
const make=()=>({authorization:'Standing user request to foreground owned screen-2 NWN',
  expected:{pid:9,startedAtUtc:'2026-09-10T01:02:03.1234567Z',hwnd:99,device:'\\\\.\\DISPLAY1'},
  state:{processes:[{pid:9,startedAtUtc:'2026-09-10T01:02:03.1234567Z',responding:true,mainHwnd:99}],windows:[{hwnd:99,processId:9,ownerHwnd:0,enabled:true,className:'NWN',title:'Neverwinter Nights'}]}});
test('exact owned identity admits a foreground-only request',()=>assert.equal(admitForeground(make()).hwnd,99));
for(const [label,mutate] of [
  ['no authorization',v=>v.authorization=''],
  ['extra process',v=>v.state.processes.push({...v.state.processes[0],pid:10})],
  ['wrong pid',v=>v.expected.pid=10],
  ['100ns start mismatch',v=>v.expected.startedAtUtc='2026-09-10T01:02:03.1234568Z'],
  ['wrong HWND',v=>v.expected.hwnd=100],
  ['unresponsive',v=>v.state.processes[0].responding=false],
  ['modal',v=>v.state.windows.push({...v.state.windows[0],hwnd:100,ownerHwnd:99,className:'#32770'})],
  ['disabled main',v=>v.state.windows[0].enabled=false],
  ['foreign window',v=>v.state.windows[0].processId=10],
  ['invalid monitor',v=>v.expected.device='primary']
]) test(label,()=>{const v=make();mutate(v);assert.throws(()=>admitForeground(v));});
test('capture failure always restores previous non-topmost state',()=>{
  const calls=[];
  assert.throws(()=>withTemporaryRaise({raise:()=>{calls.push('raise');return {topmostBefore:false,topmostAfter:true};},capture:()=>{calls.push('capture');throw Error('occluded');},restore:()=>{calls.push('restore');return {topmostAfter:false};},record:()=>calls.push('record')}));
  assert.deepEqual(calls,['raise','capture','restore','record']);
});
test('existing user topmost state is preserved',()=>{
  const r=withTemporaryRaise({raise:()=>({topmostBefore:true,topmostAfter:true}),capture:()=>({ok:true}),restore:()=>assert.fail('must not lower user state'),record:()=>{}});
  assert.equal(r.capture.ok,true);
});
