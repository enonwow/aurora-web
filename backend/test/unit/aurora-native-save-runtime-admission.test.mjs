import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {writeSourceFixture,fixtureCapture} from './entry-surface-fixture.mjs';
import {prepareNativeSaveAdmission,finalizeNativeSaveAdmission,validateNativeSaveAdmission} from '../../scripts/lib/aurora-native-save-runtime-admission.mjs';

import {sha,nativeFixture} from './native-save-admission-fixture.mjs';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const write=(path,value)=>writeFileSync(path,JSON.stringify(value,null,2));
function temp(fn){const dir=mkdtempSync(join(tmpdir(),'aurora-native-save-test-'));try{return fn(dir);}finally{assert.equal(dirname(dir),resolve(tmpdir()));rmSync(dir,{recursive:true,force:true});}}

test('TEST SIMULATION: reuses successful clean Save with agent review, preserves source and revalidates artifact',()=>temp(dir=>{
  const f=nativeFixture(dir,{finalize:true}),v=validateNativeSaveAdmission(f.result.admissionPath);
  assert.equal(v.status,'verified');assert.equal(v.proofScope,'nativeSaveReadbackAndToolsetReview');
  assert.equal(v.runtimeClaimed,false);assert.equal(v.fileValidatorAuthenticatesReviewer,false);
  assert.equal(v.geometryProfile.entryPoint.accessibleSurface,undefined);
  assert.equal(v.owner.startedAt,'2026-09-05T23:49:06.8241234Z');
  for(const file of f.originals)assert.equal(sha(readFileSync(file.path)),file.sha256);
  assert.equal(finalizeNativeSaveAdmission(f.input).idempotentReplay,true);
}));

for(const [name,mutate,pattern] of [
  ['missing Save',f=>{const m=read(f.manifestPath);delete m.nativeSave;write(f.manifestPath,m);},/SAVE|SOURCE/],
  ['failed Save',f=>{const m=read(f.manifestPath);m.nativeSave.save.ok=false;write(f.manifestPath,m);},/SAVE|SOURCE/],
  ['current MOD changed',f=>writeFileSync(f.modulePath,Buffer.from('foreign MOD')),/ENTRY|SOURCE/],
  ['HAK changed',f=>writeFileSync(f.hakPath,'foreign HAK bytes'),/HAK|SOURCE/],
  ['HAK stack changed',f=>{const p=read(f.profilePath);p.orderedHakList.push(p.orderedHakList[0]);write(f.profilePath,p);},/ENTRY|SOURCE/],
  ['dirty Save receipt',f=>{const m=read(f.manifestPath);m.nativeSave.save.titleAfter+='*';write(f.manifestPath,m);},/TITLE|SOURCE/],
  ['missing exact owner time',f=>{const m=read(f.manifestPath);delete m.open.process.StartTimeUtc;write(f.manifestPath,m);},/OWNER|SOURCE/],
  ['wrong Area',f=>{const s=read(f.sidecarPath);s.areaViewerTitle=' - foreign';write(f.sidecarPath,s);},/CAPTURE/],
  ['entry binding changed',f=>{const s=read(f.sidecarPath);s.requestBinding.target.entry.position=[9,9,9];write(f.sidecarPath,s);},/CAPTURE/],
  ['fixture binding changed',f=>{const s=read(f.sidecarPath);s.requestBinding.target.git.creatures[0].appearanceType=999;write(f.sidecarPath,s);},/CAPTURE/],
  ['foreign capture',f=>{const s=read(f.sidecarPath);s.requestBinding.requestId='other';write(f.sidecarPath,s);},/CAPTURE/],
  ['owner PID',f=>{const s=read(f.sidecarPath);s.owner.pid++;write(f.sidecarPath,s);},/CAPTURE/],
  ['100 ns StartTime drift',f=>{const s=read(f.sidecarPath);for(const owner of [s.owner,s.stability.before.owner,s.stability.after.owner])owner.startedAt='2026-09-05T23:49:06.8241235Z';write(f.sidecarPath,s);},/OWNER/],
  ['capture predates prepare',f=>{const s=read(f.sidecarPath);s.captureStartedAt='2020-01-01T00:00:00Z';write(f.sidecarPath,s);},/CAPTURE/],
  ['review PNG mismatch',f=>{const r=read(f.reviewPath);r.captureSha256='0'.repeat(64);write(f.reviewPath,r);},/REVIEW/],
  ['boolean only',f=>write(f.reviewPath,{verified:true}),/REVIEW/],
  ['human Paint witness',f=>write(f.reviewPath,{version:'aurora-entry-surface-human-witness/v2',actorKind:'human',claims:['saved_module']}),/REVIEW/],
  ['missing review',f=>{f.input.reviewPath=undefined;},/REVIEW/],
  ['missing image',f=>{f.input.pngPath=undefined;},/CAPTURE/],
  ['review before capture',f=>{const r=read(f.reviewPath);r.source.recordedAt=f.request.createdAt;write(f.reviewPath,r);},/REVIEW/],
  ['empty observations',f=>{const r=read(f.reviewPath);r.observations.details='';write(f.reviewPath,r);},/REVIEW/],
  ['expired request',f=>{f.input.now=new Date(Date.parse(f.request.expiresAt)+1).toISOString();},/CAPTURE/],
])test('rejects '+name+' before accepted artifact',()=>temp(dir=>{
  const f=nativeFixture(dir);mutate(f);assert.throws(()=>finalizeNativeSaveAdmission(f.input),pattern);
  assert.equal(existsSync(join(f.evidenceDir,'runtime-native-save-admission.v1.json')),false);
}));

test('accepted evidence, review and original source drift are rejected on later validation',()=>temp(dir=>{
  const f=nativeFixture(dir,{finalize:true});
  const accepted=read(f.result.admissionPath);accepted.entryPoint.position=[99,99,0];write(f.result.admissionPath,accepted);
  assert.throws(()=>validateNativeSaveAdmission(f.result.admissionPath),/ADMISSION/);
}));
test('evidence and resource drift after validation are detected immediately before post',()=>temp(dir=>{
  const f=nativeFixture(dir,{finalize:true}),v=validateNativeSaveAdmission(f.result.admissionPath);
  assert.doesNotThrow(()=>v.assertUnchanged());
  const original=readFileSync(f.hakPath);writeFileSync(f.hakPath,'changed');assert.throws(()=>v.assertUnchanged(),/RESOURCE_DRIFT/);writeFileSync(f.hakPath,original);
  const fresh=validateNativeSaveAdmission(f.result.admissionPath),reviewPath=join(f.evidenceDir,'review.json');
  writeFileSync(reviewPath,'{}');assert.throws(()=>fresh.assertUnchanged(),/EVIDENCE_DRIFT/);
  assert.throws(()=>validateNativeSaveAdmission(f.result.admissionPath),/RECEIPT/);
}));

test('public prepare/validate refuse unknown arguments and cannot invoke native ports',()=>temp(dir=>{
  const f=nativeFixture(dir,{finalize:true}),guard=join(dir,'deny-native.cjs');
  writeFileSync(guard,"const cp=require('node:child_process');for(const k of ['exec','execSync','execFile','execFileSync','spawn','spawnSync','fork'])cp[k]=()=>{throw Error('FORBIDDEN_NATIVE_PORT')};require('node:module').syncBuiltinESMExports();");
  const cli=resolve(import.meta.dirname,'../../scripts/aurora-toolset-native-save-runtime-admission.mjs');
  const run=args=>spawnSync(process.execPath,['--require',guard,cli,...args],{cwd:dir,windowsHide:true,encoding:'utf8',timeout:10000});
  const result=run(['validate','--admission',f.result.admissionPath]);assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).runtimeClaimed,false);
  const prepared=run(['prepare','--profile',f.profilePath,'--outDir',f.sourceDir,'--evidenceDir',join(dir,'second-admission')]);assert.equal(prepared.status,0,prepared.stderr+prepared.stdout);assert.equal(JSON.parse(prepared.stdout).nativeSaveReused,true);
  const invalid=run(['prepare','--verified','true']);assert.equal(invalid.status,2);assert.doesNotMatch(invalid.stdout+invalid.stderr,/FORBIDDEN_NATIVE_PORT/);
}));
