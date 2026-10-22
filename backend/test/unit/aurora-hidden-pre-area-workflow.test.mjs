import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fixture} from './hidden-pre-area-fixture.mjs';
import {restoreHiddenPreArea,beginHiddenFrameArea} from '../../scripts/lib/aurora-hidden-pre-area-workflow.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const save=(p,d)=>writeFileSync(p,JSON.stringify(d));
function setup(){
  const root=mkdtempSync(join(tmpdir(),'aurora-hidden-offline-')),outDir=join(root,'geometry');mkdirSync(outDir);mkdirSync(join(outDir,'area-open'));
  const f=fixture(),profilePath=join(root,'profile.json'),failurePath=join(root,'failure.json'),windowsPath=join(root,'windows.json');
  const modulePath=join(root,'example.mod');writeFileSync(modulePath,'TEST SIMULATION');
  f.profile.module={...f.profile.module,path:modulePath,bytes:15,sha256:hash(readFileSync(modulePath))};f.manifest.module=f.profile.module;f.manifest.structuralPreflight.module=f.profile.module;
  save(profilePath,f.profile);f.manifest.profilePath=profilePath;f.manifest.artifactDir=outDir;f.manifest.profileSha256=hash(readFileSync(profilePath));
  f.failure.profilePath=profilePath;f.failure.manifestPath=join(outDir,'binary-native-geometry-manifest.json');
  save(f.failure.manifestPath,f.manifest);save(join(outDir,'area-open/manifest.json'),f.queue);save(join(outDir,'binary-native-area-queue.json'),f.queueInput);save(failurePath,f.failure);save(windowsPath,f.recordedWindows);
  const original=readFileSync(f.failure.manifestPath),calls=[];
  const ports={inspect:()=>structuredClone(f.state),restore:(owner)=>{
    calls.push(owner);f.state.top[0].visible=true;
    return {ok:true,identityGuardVersion:'aurora-hidden-frame-owner-guard/v1',processId:owner.pid,startedAtUtc:owner.startedAtUtc,frameHwnd:owner.frameHwnd,module:'example.mod',after:{visible:true,iconic:false},monitor:{deviceName:'\\\\.\\DISPLAY1',primary:false},safety:{activatesFrame:false,globalCursor:false,globalMouse:false,globalKeyboard:false}};
  }};
  return {root,f,options:{profilePath,outDir,failurePath,windowsPath},ports,calls,original,manifestPath:f.failure.manifestPath,
    close:()=>{assert.equal(dirname(root),resolve(tmpdir()));rmSync(root,{recursive:true,force:true});}};
}
test('dry-run writes nothing; one restore preserves original and one Area attempt uses a separate evidence path',()=>{
  const s=setup();try{
    const dry=restoreHiddenPreArea({...s.options,dryRun:true},s.ports);assert.equal(dry.status,'hidden_pre_area_restore_planned');assert.equal(s.calls.length,0);assert(!existsSync(join(s.options.outDir,'hidden-pre-area-v1')));
    const live=restoreHiddenPreArea(s.options,s.ports);assert.equal(live.status,'hidden_pre_area_frame_restored');assert.equal(s.calls.length,1);
    assert.deepEqual(readFileSync(s.manifestPath),s.original);
    assert.deepEqual(readFileSync(join(s.options.outDir,'hidden-pre-area-v1/source-manifest.json')),s.original);
    assert.throws(()=>restoreHiddenPreArea(s.options,s.ports));assert.equal(s.calls.length,1);
    const next=beginHiddenFrameArea(s.options,s.ports);assert(next.areaOutDir.endsWith(join('hidden-pre-area-v1','area-open')));
    assert.equal(next.manifest.hiddenFrameContinuation.originalFailureSha256,hash(s.original));
    assert.throws(()=>beginHiddenFrameArea(s.options,s.ports));assert.equal(s.calls.length,1);
  }finally{s.close();}
});
test('partial restore and bad post-readback preserve failure and cannot retry',()=>{
  for(const failAfter of [false,true]){
    const s=setup();try{
      s.ports.restore=()=>{s.calls.push('attempt');if(!failAfter)throw new Error('mock restore failed');return {ok:true};};
      assert.throws(()=>restoreHiddenPreArea(s.options,s.ports));assert.equal(s.calls.length,1);assert.deepEqual(readFileSync(s.manifestPath),s.original);
      assert.throws(()=>restoreHiddenPreArea(s.options,s.ports));assert.throws(()=>beginHiddenFrameArea(s.options,s.ports));assert.equal(s.calls.length,1);
    }finally{s.close();}
  }
});
test('asset or current state drift before Area admission cannot dispatch',()=>{
  for(const drift of ['module','owner','area','receipt']){
    const s=setup();try{
      restoreHiddenPreArea(s.options,s.ports);
      if(drift==='module')writeFileSync(s.f.profile.module.path,'CORRUPTED');
      if(drift==='owner')s.f.state.startedAtUtc='2026-09-07T15:24:31.2061918Z';
      if(drift==='area')s.f.state.children.push({className:'TfrmViewerArea'});
      if(drift==='receipt'){const path=join(s.options.outDir,'hidden-pre-area-v1/receipt.json'),r=JSON.parse(readFileSync(path));r.owner.pid++;save(path,r);}
      assert.throws(()=>beginHiddenFrameArea(s.options,s.ports));assert(!existsSync(join(s.options.outDir,'hidden-pre-area-v1/area-intent.json')));
      assert.deepEqual(readFileSync(s.manifestPath),s.original);
    }finally{s.close();}
  }
});
test('evidence drift during the immediate state observation refuses restore before mutation',()=>{
  const s=setup();try{let reads=0;const inspect=s.ports.inspect;
    s.ports.inspect=()=>{if(++reads===2)writeFileSync(s.options.failurePath,'{}');return inspect();};
    assert.throws(()=>restoreHiddenPreArea(s.options,s.ports));assert.equal(s.calls.length,0);
    assert.deepEqual(readFileSync(s.manifestPath),s.original);
  }finally{s.close();}
});
test('public CLI fixture dry-run is explicit, foreign-cwd-safe and cannot become a live request',()=>{
  const s=setup();try{
    const stateFile=join(s.root,'test-state.json');save(stateFile,{version:'aurora-hidden-pre-area-test-state/v1',state:s.f.state});
    const runner=resolve(import.meta.dirname,'../../scripts/aurora-toolset-binary-module-native-geometry.mjs');
    const args=['--profile',s.options.profilePath,'--outDir',s.options.outDir,'--failure',s.options.failurePath,'--windows',s.options.windowsPath,'--stateFixture',stateFile];
    for(const [command,status,code] of [['continue-pre-area-hidden-frame-dry-run',0,null],['continue-pre-area-hidden-frame',2,'HIDDEN_LIVE_FIXTURE_FORBIDDEN'],['continue-pre-area-hidden-frame-unknown',2,'HIDDEN_COMMAND_INVALID']]){
      const result=spawnSync(process.execPath,[runner,command,...args],{cwd:s.root,encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(result.status,status,result.stderr);
      const data=JSON.parse(result.stdout);if(code)assert.equal(data.blockerCode,code);else{assert.equal(data.stateSource,'test-fixture');assert.equal(data.liveAdmitted,false);}
      assert(!existsSync(join(s.options.outDir,'hidden-pre-area-v1')));assert.deepEqual(readFileSync(s.manifestPath),s.original);
    }
  }finally{s.close();}
});
