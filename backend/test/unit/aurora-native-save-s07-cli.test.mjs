import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {sha,nativeFixture} from './native-save-admission-fixture.mjs';

test('public S07 new gate dry-run and mocked dispatch preserve human-v2 and immutable attempts',()=>{
  const dir=mkdtempSync(join(tmpdir(),'aurora-save-s07-cli-'));
  try{
    const f=nativeFixture(dir,{finalize:true,sourceDirectoryName:'modules'}),g=f.result.geometryProfile,profilePath=join(dir,'runtime.json'),outDir=join(dir,'runtime');mkdirSync(outDir);
    assert.equal(g.fixtures.length,3);assert.equal(g.requiredFixtureBindings.length,1);
    const logPath=join(dir,'engine.log');writeFileSync(logPath,'TEST SIMULATION LOG');
    const profile={version:'aur-s07-runtime-profile/v1',id:'TEST-SIMULATION-native-save',module:{...g.module,area:g.area.resref,entryPoint:g.entryPoint.position,entryDirection:g.entryPoint.direction},
      fixtures:g.fixtures,orderedHakList:g.orderedHakList,geometryGate:{kind:'native-save-review-v1',status:'verified',artifact:f.result.admissionPath,sha256:sha(readFileSync(f.result.admissionPath))},
      launch:{mode:'central_guarded_test_module_action',processName:'nwmain'},
      runtimeWindow:{version:'aur-s07-runtime-window-policy/v1',placement:'working-area',expectedDevice:'\\\\.\\DISPLAY1',primary:false},
      evidencePolicy:{version:'aur-s07-runtime-evidence-policy/v1',minimumCaptureDurationSeconds:12,requiredArtifactKinds:['runtime-observation','runtime-capture','runtime-capture-metadata','engine-load-log','engine-load-log-metadata','runtime-visual-review']},
      engineLog:{path:logPath,loadingModuleResref:g.module.resref,requiredTokens:['TEST SIMULATION']}};
    const runner=resolve(import.meta.dirname,'../../scripts/aur-s07-runtime-execution.mjs'),guard=join(dir,'mock-native.cjs');
    const owner=g.owner,frame={hwnd:owner.frameHwnd,ownerPid:owner.pid,className:'TfrmFrame',text:g.sourceNativeSave.save.titleAfter,visible:true,iconic:false,
      bounds:{left:-1800,top:10,width:1200,height:900},screen:{deviceName:'\\\\.\\DISPLAY1',primary:false,workingArea:{left:-1920,top:0,width:1920,height:1032}}};
    const state={processId:owner.pid,startedAtUtc:owner.startedAt,responding:true,nwmain:[],top:[frame],children:[{hwnd:owner.viewerHwnd,ownerPid:owner.pid,className:'TfrmViewerArea',text:' - '+g.area.resref,visible:true},{hwnd:owner.viewportHwnd,ownerPid:owner.pid,className:'TScrollBox',visible:true}]};
    // All child processes are denied except two inert JSON mocks. No PowerShell
    // or Win32 executes. The public S07 command itself is unmodified.
    writeFileSync(guard,`const cp=require('node:child_process');const fs=require('node:fs');const state=${JSON.stringify(state)};const owner=${JSON.stringify(owner)};for(const k of ['exec','execSync','execFile','spawn','spawnSync','fork'])cp[k]=()=>{throw Error('FORBIDDEN_NATIVE_PORT')};cp.execFileSync=(exe,args)=>{if(process.env.TEST_ALLOW_POST!=='yes')throw Error('FORBIDDEN_NATIVE_PORT');if(args[0].endsWith('probe-aurora-toolset-window-tree-no-global-input.mjs'))return JSON.stringify({...state,capturedAtUtc:new Date().toISOString()});if(args[0].endsWith('aurora-toolset-test-module-nonblocking.mjs')){if(args[args.indexOf('--expectedStartedAtUtc')+1]!==owner.startedAt)throw Error('EXPECTED_OWNER_MISSING');fs.appendFileSync(${JSON.stringify(join(dir,'mock-posts.log'))},'post\\n');return JSON.stringify({ok:true,status:'posted',processId:owner.pid,startedAtUtc:owner.startedAt,frameHwnd:owner.frameHwnd,module:${JSON.stringify(g.module.resref+'.mod')},identityGuardVersion:'aurora-native-save-test-module-owner/v1',requestsNwnStart:true,usesGlobalInput:false})}throw Error('FORBIDDEN_NATIVE_PORT')};require('node:module').syncBuiltinESMExports();`);
    const run=(command,{value=profile,allowPost=false}={})=>{writeFileSync(profilePath,JSON.stringify(value));return spawnSync(process.execPath,['--max-old-space-size=1024','--require',guard,runner,command,'--profile',profilePath,'--outDir',outDir],{cwd:dir,windowsHide:true,encoding:'utf8',timeout:10000,env:{...process.env,TEST_ALLOW_POST:allowPost?'yes':'no'}});};
    const plan=run('dry-run');assert.equal(plan.status,0,plan.stderr);assert.equal(JSON.parse(plan.stdout).startsNwn,false);
    for(const mutate of [p=>delete p.geometryGate.kind,p=>p.module.entryDirection=[1,0],p=>p.module.entryPoint=[99,0,0],p=>p.geometryGate.status=false,p=>delete p.evidencePolicy,p=>p.fixtures.pop(),p=>delete p.fixtures[0].kind]){
      const value=structuredClone(profile);mutate(value);const result=run('dispatch-test-module',{value});assert.notEqual(result.status,0);assert.doesNotMatch(result.stderr,/FORBIDDEN_NATIVE_PORT/);
    }
    const request={version:'aur-s07-runtime-launch-request/v1',requestId:'mock-request',createdAt:new Date(Date.now()+4000).toISOString(),action:profile.launch.mode,
      profileId:profile.id,profileSha256:sha(Buffer.from(JSON.stringify(profile))),modulePath:profile.module.path,moduleSha256:profile.module.sha256,area:profile.module.area,entryPoint:profile.module.entryPoint};
    // The fixture capture/review use +1/+2/+3 seconds. Set a fixed test clock
    // after those synthetic times, without sleeping or altering production.
    writeFileSync(join(outDir,'aur-s07-runtime-launch-request.json'),JSON.stringify(request));
    const timeShim=`const RealDate=Date;const clock=${JSON.stringify(new Date(Date.parse(request.createdAt)+1000).toISOString())};global.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[clock]))}static now(){return new RealDate(clock).getTime()}};`;
    writeFileSync(guard,timeShim+readFileSync(guard,'utf8'));
    const dispatched=run('dispatch-test-module',{allowPost:true});assert.equal(dispatched.status,0,dispatched.stderr);
    assert.equal(JSON.parse(dispatched.stdout).status,'posted');
    const retry=run('dispatch-test-module',{allowPost:true});assert.match(retry.stderr,/ALREADY_ATTEMPTED/);
    assert.equal(readFileSync(join(dir,'mock-posts.log'),'utf8'),'post\n');
    const dispatch=JSON.parse(readFileSync(join(outDir,'aur-s07-runtime-test-module-dispatch.json'),'utf8'));
    const bounds={left:-1920,top:0,right:0,bottom:1032,width:1920,height:1032};
    const nwn={pid:123456,name:'nwmain',startedAt:request.createdAt,responding:true,mainWindowHandle:900,parentPid:owner.pid,
      commandLine:`-userdirectory "${dir}" +TestNewModule "${g.module.resref}"`};
    const runtimeState={capturedAtUtc:dispatch.dispatchedAt,processes:[nwn],parents:[{pid:owner.pid,name:'nwtoolset',startedAt:owner.startedAt,responding:true}],
      window:{hwnd:900,ownerPid:nwn.pid,visible:true,iconic:false,bounds:{left:20,top:20,right:1020,bottom:820,width:1000,height:800}},
      visibleWindows:[{hwnd:900,ownerPid:nwn.pid}],screens:[{deviceName:profile.runtimeWindow.expectedDevice,primary:false,bounds:{...bounds,height:1080,bottom:1080},workingArea:bounds}]};
    const observation={version:'aur-s07-runtime-observation/v1',observedAt:dispatch.dispatchedAt,profileId:profile.id,profileSha256:request.profileSha256,moduleSha256:profile.module.sha256,
      area:profile.module.area,entryPoint:profile.module.entryPoint,process:nwn,handoffPath:join(outDir,'aur-s07-runtime-handoff.json')};
    writeFileSync(join(outDir,'aur-s07-runtime-observation.json'),JSON.stringify(observation));
    const statePath=join(dir,'mock-runtime-state.json');writeFileSync(statePath,JSON.stringify(runtimeState));
    const windowShim=`;const prior=cp.execFileSync;cp.execFileSync=(exe,args)=>{const s=JSON.parse(fs.readFileSync(${JSON.stringify(statePath)},'utf8'));if(exe==='powershell.exe'&&args.join(' ').includes('S07WindowRead'))return JSON.stringify(s);if(args[0]?.endsWith('prepare-nwmain-proof-window-no-global-input.mjs')){const before=s.window.bounds;const after=${JSON.stringify(bounds)};s.window.bounds=after;fs.writeFileSync(${JSON.stringify(statePath)},JSON.stringify(s));return JSON.stringify({ok:true,status:'verified',process:{name:'nwmain',pid:${nwn.pid},startedAtUtc:${JSON.stringify(nwn.startedAt)},responding:true},window:{hwnd:900,ownerPid:${nwn.pid},before,after},monitor:{deviceName:${JSON.stringify(profile.runtimeWindow.expectedDevice)},primary:false,workingArea:after},safety:{usesGlobalCursor:false,usesGlobalMouse:false,usesGlobalKeyboard:false,changesZOrder:false,activatesWindow:false,setWindowPosFlags:['SWP_NOZORDER','SWP_NOACTIVATE']}})}return prior(exe,args)};require('node:module').syncBuiltinESMExports();`;
    writeFileSync(guard,readFileSync(guard,'utf8')+windowShim);
    const windowPlan=run('prepare-runtime-window-dry-run');assert.equal(windowPlan.status,0,windowPlan.stderr);assert.equal(JSON.parse(windowPlan.stdout).status,'admitted');
    const drift=structuredClone(runtimeState);drift.parents[0].startedAt='2026-09-05T23:49:06.8241235Z';writeFileSync(statePath,JSON.stringify(drift));
    assert.match(run('prepare-runtime-window-dry-run').stderr,/native_save_parent_binding_invalid/);
    writeFileSync(statePath,JSON.stringify(runtimeState));
    const placed=run('prepare-runtime-window');assert.equal(placed.status,0,placed.stderr);assert.equal(JSON.parse(placed.stdout).status,'verified');
    assert.match(run('prepare-runtime-window').stderr,/already_attempted/);
  }finally{assert.equal(dirname(dir),resolve(tmpdir()));rmSync(dir,{recursive:true,force:true});}
});
