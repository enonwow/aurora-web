import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export function erfPayloadFingerprint(b){
 assert.ok(b.length>=160);assert.equal(b.toString('ascii',4,8),'V1.0');
 const digest=x=>createHash('sha256').update(x).digest('hex');
 const count=b.readUInt32LE(16),loc=b.readUInt32LE(20),keys=b.readUInt32LE(24),table=b.readUInt32LE(28),locSize=b.readUInt32LE(12);
 assert.ok(count<100000&&loc>=160&&loc+locSize<=b.length&&keys>=loc+locSize&&keys+count*24<=table&&table+count*8<=b.length);
 const seen=new Set(),resources=[];
 for(let i=0;i<count;i++){
  const k=keys+i*24,id=b.readUInt32LE(k+16);assert.ok(id<count&&!seen.has(id));seen.add(id);
  const start=b.readUInt32LE(table+id*8),size=b.readUInt32LE(table+id*8+4);
  assert.ok(start>=table+count*8&&start+size<=b.length);
  resources.push([b.subarray(k,k+16).toString('hex'),b.readUInt16LE(k+20),size,digest(b.subarray(start,start+size))]);
 }
 resources.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 assert.equal(new Set(resources.map(x=>x[0]+':'+x[1])).size,count);
 return {type:b.toString('ascii',0,8),languages:b.readUInt32LE(8),description:b.readUInt32LE(40),localized:digest(b.subarray(loc,loc+locSize)),resources};
}
export function ownedBuildFrame(state,probe,module,currentHash,expectedHwnd){
 assert.equal(state.status,'created','placement only before Build');
 assert.equal(currentHash,state.module.sha256,'source MOD changed');
 assert.equal(probe.processId,state.owner.Id);assert.equal(probe.responding,true);
 assert.ok(probe.windows.every(x=>['TfrmFrame','TApplication'].includes(x.className)),'unresolved modal');
 const frames=probe.windows.filter(x=>x.className==='TfrmFrame');assert.equal(frames.length,1);
 if(expectedHwnd===undefined)assert.equal(frames[0].visible,true);
 else{assert.ok(Number.isSafeInteger(expectedHwnd)&&expectedHwnd>0,'exact owner HWND required');assert.ok(!state.startedAt,'Build already submitted');assert.equal(frames[0].hwnd,expectedHwnd,'owner frame changed');}
 assert.ok(frames[0].text.endsWith(' - '+module),'dirty or wrong module');
 return frames[0];
}
function requireUnsubmittedBuild(state){
 assert.equal(state.status,'created','only a session with no submitted Build');
 assert.ok(!state.startedAt,'Build already submitted');
 assert.ok(!(state.events??[]).some(e=>e.atom==='click-aurora-toolset-dialog-button-no-global-input.mjs'
  && e.args?.includes('Build')),'Build submission recorded');
}
export function unbuiltCloseInspectorArgs(state,owner,options){
 if(options.closeAllowHiddenOriginalFrame!=='true')return [];
 requireUnsubmittedBuild(state);
 assert.ok(options.closeAuthorization?.trim(),'explicit close authorization required');
 assert.equal(owner?.status,'module_ready','original successful owner required');
 assert.equal(state.owner.Id,owner.open.process.Id);assert.equal(state.owner.StartTimeUtc,owner.open.process.StartTimeUtc);
 assert.equal(state.module.sha256,owner.module.sha256,'original source MOD required');
 assert.equal(state.module.resref,owner.module.resref,'original module required');
 const original=owner.open.result?.moduleOpen,hwnd=original?.moduleWindowHwnd;
 assert.ok(Number.isSafeInteger(hwnd)&&hwnd>0,'original owner HWND required');
 assert.equal(Number(options.closeExpectedFrameHwnd),hwnd,'original owner HWND changed');
 assert.equal(options.closeExpectedFrameTitle,original.moduleWindowTitle,'original owner title changed');
 assert.ok(typeof original.moduleWindowTitle==='string'&&original.moduleWindowTitle.endsWith(' - '+owner.module.resref+'.mod'),'original clean module title required');
 return ['--includeHiddenFrameHwnd',String(hwnd)];
}
export function ownedUnbuiltClose(state,probe,options,currentHash,owner){
 requireUnsubmittedBuild(state);
 assert.ok(options.closeAuthorization?.trim(),'explicit close authorization required');
 assert.equal(currentHash,state.module.sha256,'source MOD changed');
 assert.equal(probe.processId,state.owner.Id);assert.equal(probe.responding,true);
 assert.ok(probe.windows.every(x=>['TfrmFrame','TApplication'].includes(x.className)),'unresolved modal');
 const frames=probe.windows.filter(x=>x.className==='TfrmFrame');assert.equal(frames.length,1);
 const frame=frames[0];
 if(options.closeAllowHiddenOriginalFrame==='true')unbuiltCloseInspectorArgs(state,owner,options);
 else assert.equal(frame.visible,true);
 assert.equal(frame.hwnd,Number(options.closeExpectedFrameHwnd));
 assert.equal(frame.text,options.closeExpectedFrameTitle);
 assert.match(frame.text,/ - .+\.mod$/,'must be an exact clean saved module title');
 return frame;
}
export function ownedSavedClose(state,probe,module,authorization,currentHash){
 assert.ok(typeof authorization==='string'&&authorization.trim().length>0,'close authorization required');
 assert.equal(state.status,'saved_verified');
 assert.equal(currentHash,state.postBuildModuleSha256,'saved MOD changed');
 assert.equal(probe.processId,state.owner.Id);
 const frames=probe.windows.filter(x=>x.className==='TfrmFrame');assert.equal(frames.length,1);
 const previous=state.finalWindows.windows.find(x=>x.className==='TfrmFrame');
 assert.equal(frames[0].hwnd,previous.hwnd);assert.equal(frames[0].text,previous.text);
 assert.ok(frames[0].text.endsWith(' - '+module),'dirty or wrong module');
 assert.ok(probe.windows.every(x=>['TfrmFrame','TApplication'].includes(x.className)),'unresolved modal');
 return frames[0];
}
export function ownedAbandonedBuildClose(state,probe,options,currentHash,nwnCount){
 assert.equal(state.status,'dialog_open');
 assert.ok(!state.startedAt,'a submitted Build cannot use abandoned-dialog cleanup');
 assert.equal(buildState(state.dialog),'ready','last proven dialog must be unsubmitted and ready');
 assert.ok(state.events.some(e=>e.atom==='probe-aurora-toolset-dialog-controls-no-global-input.mjs'
  && String(e.error).includes('expected_one_exact_dialog:0')),'preserve the original missing-dialog failure');
 assert.equal(nwnCount,0,'finish the owned NWN session first');
 assert.ok(options.closeAuthorization?.trim(),'explicit or standing close authorization required');
 assert.match(options.currentModuleSha256??'',/^[a-f0-9]{64}$/,'pin freshly inspected saved bytes');
 assert.equal(currentHash,options.currentModuleSha256,'saved module changed after diagnosis');
 assert.equal(probe.processId,state.owner.Id);assert.equal(probe.responding,true);
 assert.ok(probe.windows.every(x=>['TfrmFrame','TApplication'].includes(x.className)),'unresolved modal');
 const frames=probe.windows.filter(x=>x.className==='TfrmFrame');assert.equal(frames.length,1);
 const frame=frames[0],prior=state.placementFrame;assert.ok(prior,'original frame lineage required');
 assert.equal(frame.hwnd,prior.hwnd);assert.equal(frame.text,prior.text);
 assert.match(frame.text,/ - .+\.mod$/,'dirty frame cannot be closed');
 return frame;
}
export function buildState(dialog,results=[],submitted=false){
 const button=text=>{const c=dialog.controls.filter(x=>x.visible&&['TButton','Button'].includes(x.className)&&x.text===text);assert.equal(c.length,1,'ambiguous/missing '+text);return c[0];};
 const build=button('Build'),done=button('Done');
 if(build.enabled&&done.enabled)return submitted&&results.length>0?'settled':'ready';
 if(!build.enabled&&done.enabled)return 'settled';
 if(!build.enabled&&!done.enabled)return 'running';
 throw Error('unknown Build controls');
}
export function buildMenu(dfm,probe){
 const menu=dfm.children.find(x=>x.name==='mmFrame');assert.ok(menu);
 const visible=items=>items.filter(x=>x.properties?.Visible!==false);
 const tops=visible(menu.children),top=tops.findIndex(x=>x.name==='Build1');assert.ok(top>=0);
 const items=visible(tops[top].children),item=items.findIndex(x=>x.name==='miVerifyModule');assert.ok(item>=0);
 assert.equal(items[item].properties.Action,'actVerifyModule');
 assert.equal(probe.items.length,tops.length);
 const native=probe.items[top];assert.equal(native.children.length,items.length);
 const cmd=native.children[item];assert.ok(cmd.enabled&&!cmd.separator&&Number.isInteger(cmd.id)&&cmd.id>0&&cmd.id<65536);
 return {topPosition:top,itemPosition:item,expectedId:cmd.id};
}
