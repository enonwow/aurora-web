import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {check,HIDDEN_PRE_AREA_VERSION} from './aurora-hidden-pre-area-contract.mjs';
import {restoreHiddenPreArea} from './aurora-hidden-pre-area-workflow.mjs';
const scripts=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const invoke=(name,args=[])=>JSON.parse(execFileSync(process.execPath,[resolve(scripts,name),...args],{encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:16*1024*1024}));
export function hiddenFrameNativePorts(){return {
  inspect:()=>invoke('probe-aurora-toolset-window-tree-no-global-input.mjs'),
  restore:(owner,module)=>invoke('restore-aurora-toolset-frame-noactivate.mjs',['--module',module,'--ensureNonPrimary','true','--requirePreAreaHidden','true',
    '--expectedPid',String(owner.pid),'--expectedStartedAtUtc',owner.startedAtUtc,'--expectedFrameHwnd',String(owner.frameHwnd),
    '--expectedApplicationHwnd',String(owner.applicationHwnd),'--expectedTitle',owner.title]),
};}
/** All prefix errors are handled here, outside the old manifest-mutating catch. */
export function runHiddenFrameCommand(command,argv){
  try{
    check(['continue-pre-area-hidden-frame-dry-run','continue-pre-area-hidden-frame'].includes(command),'HIDDEN_COMMAND_INVALID');
    const values={},allowed=['profile','outDir','failure','windows','stateFixture'];
    for(let i=0;i<argv.length;i+=2){const key=argv[i]?.slice(2),value=argv[i+1];check(argv[i]?.startsWith('--')&&allowed.includes(key)&&value&&!value.startsWith('--')&&values[key]===undefined,'HIDDEN_ARGUMENT_INVALID');values[key]=value;}
    const dryRun=command.endsWith('-dry-run');check(dryRun||values.stateFixture===undefined,'HIDDEN_LIVE_FIXTURE_FORBIDDEN');
    for(const key of ['profile','outDir','failure','windows'])check(values[key],'HIDDEN_ARGUMENT_MISSING');
    let ports=hiddenFrameNativePorts();
    if(values.stateFixture){const fixture=JSON.parse(readFileSync(values.stateFixture,'utf8'));check(fixture.version==='aurora-hidden-pre-area-test-state/v1','HIDDEN_FIXTURE_VERSION');ports={inspect:()=>fixture.state,restore:()=>check(false,'HIDDEN_TEST_MUTATION_FORBIDDEN')};}
    return {command,...restoreHiddenPreArea({profilePath:values.profile,outDir:values.outDir,failurePath:values.failure,windowsPath:values.windows,dryRun,stateFixture:values.stateFixture},ports)};
  }catch(error){return {ok:false,command,version:HIDDEN_PRE_AREA_VERSION,blockerCode:error.code??'HIDDEN_CONTINUATION_FAILED',message:String(error.message).slice(0,1500),
    originalFailurePreserved:true,proofClaimed:false,runtimeClaimed:false,retryAllowed:false};}
}
