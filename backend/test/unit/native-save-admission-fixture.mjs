import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {writeSourceFixture,fixtureCapture} from './entry-surface-fixture.mjs';
import {nativeGitFields,nativeGitReceipt} from './native-save-git-fixture.mjs';
import {prepareNativeSaveAdmission,finalizeNativeSaveAdmission} from '../../scripts/lib/aurora-native-save-runtime-admission.mjs';
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const write=(path,value)=>writeFileSync(path,JSON.stringify(value,null,2));
export function nativeFixture(dir,{finalize=false,sourceDirectoryName='source'}={}){
  const sourceDir=join(dir,sourceDirectoryName);mkdirSync(sourceDir);
  const f=writeSourceFixture(sourceDir,'simulated_demo',{moduleOptions:{gitFields:nativeGitFields()},gitReadback:nativeGitReceipt()});
  const now=Date.now(),iso=d=>new Date(now+d).toISOString();
  f.manifest.open.process.StartTimeUtc='2026-09-05T23:49:06.8241234Z';
  f.manifest.nativeSave.save.after.lastWriteTimeUtc=iso(-5000);
  f.manifest.nativeSave.save.titleAfter='BioWare Aurora Toolset - simulated_demo.mod';
  f.manifest.nativeSave.save.safety={usesGlobalCursor:false,usesGlobalKeyboard:false,usesGlobalMouse:false};
  write(f.manifestPath,f.manifest);
  const originals=[f.profilePath,f.manifestPath,f.modulePath,f.hakPath].map(path=>({path,sha256:sha(readFileSync(path))}));
  const evidenceDir=join(dir,'admission');
  const prepared=prepareNativeSaveAdmission({profilePath:f.profilePath,outDir:sourceDir,evidenceDir,now:iso(0)});
  const request=read(prepared.requestPath);
  const pngPath=join(dir,'TEST-SIMULATION.png'),sidecarPath=join(dir,'capture.json'),reviewPath=join(dir,'review.json');
  const capture=fixtureCapture({binding:request.captureBinding,pngPath,capturedAt:iso(1000)});
  writeFileSync(pngPath,capture.png);write(sidecarPath,capture.sidecar);
  const review={version:'aurora-native-save-toolset-review/v1',requestId:request.requestId,
    actor:{kind:'agent',id:'TEST-SIMULATION-agent'},source:{kind:'agent_observation',reference:'test-only:mock-image-review',recordedAt:iso(2000)},
    captureSha256:sha(capture.png),verdict:'ready_for_runtime_test',
    observations:{areaSurface:'visible',blankOrPlaceholder:false,entryContext:'reviewed',fixtures:'reviewed',details:'TEST SIMULATION: visible floor and fixture context in a mocked capture; no runtime assessment.'},
    walkability:'not_evaluated',runtimeClaimed:false};
  write(reviewPath,review);
  const input={evidenceDir,pngPath,sidecarPath,reviewPath,now:iso(3000)};
  const result=finalize?finalizeNativeSaveAdmission(input):null;
  return {...f,sourceDir,evidenceDir,prepared,request,pngPath,sidecarPath,reviewPath,review,input,result,originals};
}
