import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {gff,fixtureModule,writeSourceFixture} from './entry-surface-fixture.mjs';
import {field,nativeGitFields,nativeGitReceipt} from './native-save-git-fixture.mjs';
import {nativeFixture} from './native-save-admission-fixture.mjs';
import {parseGff} from '../../scripts/lib/aurora-model-proof-120s-erf-gff-readback.mjs';
import {readEntrySurfaceModuleBytes,validateBinaryEntrySurfaceSource,ENTRY_SOURCE_VERSION} from '../../scripts/lib/aurora-binary-entry-surface-contract.mjs';
import {NATIVE_GIT_INVENTORY_VERSION,readNativeSaveGitInventory,validateNativeSaveGitInventory} from '../../scripts/lib/aurora-native-save-git-inventory.mjs';
import {assertRuntimeGeometryBinding} from '../../scripts/lib/aur-s07-entry-geometry-binding.mjs';
import {validateNativeSaveAdmission} from '../../scripts/lib/aurora-native-save-runtime-admission.mjs';
import {loadBinaryEntrySurfaceSource} from '../../scripts/lib/aurora-binary-entry-surface-inspection.mjs';
const parse = fields => readNativeSaveGitInventory(parseGff(gff('GIT ',fields),'GIT '));
const required = () => [{templateResRef:'guard',tag:'GUARD',appearanceType:219,position:[20,23,0]}];
const validate = (git=parse(nativeGitFields()),receipt=nativeGitReceipt(),fixtures=required())=>validateNativeSaveGitInventory({git,receipt,fixtures});

test('mixed native structs preserve all raw coordinates and ordered typed identities',()=>{
  const git=parse(nativeGitFields());
  assert.equal(git.version,NATIVE_GIT_INVENTORY_VERSION);
  assert.deepEqual(git.objectCounts,nativeGitReceipt().objectCounts);
  assert.deepEqual(git.inventory.map(o=>[o.kind,o.sourceIndex]),[['creature',0],['placeable',0],['placeable',1]]);
  assert.deepEqual(git.placeables[0].position,[Math.fround(9.9693),Math.fround(12.5908),Math.fround(0.01)]);
  assert.equal(validate(git).length,1);
  assert.deepEqual(parse(nativeGitFields()),git);
});
test('placeable BYTE appearance is admitted; creature DWORD is not',()=>{
  const fields=nativeGitFields();fields[1].value[0][2].type=0;
  assert.equal(parse(fields).placeables[0].appearanceType,22);
});
for(const [name,mutate] of [
  ['missing appearance',f=>f[1].value[0].splice(2,1)],
  ['duplicate appearance',f=>f[1].value[0].push({...f[1].value[0][2]})],
  ['creature appearance on placeable',f=>f[1].value[0][2].label='Appearance_Type'],
  ['extra wrong-family appearance',f=>f[1].value[0].push(field('Appearance_Type',2,22))],
  ['wrong creature integer type',f=>f[0].value[0][2].type=4],
  ['wrong placeable signed type',f=>f[1].value[0][2].type=5],
  ['wrong struct type',f=>f[1].value[0].typeId=4],
  ['wrong position spelling',f=>f[1].value[0][3].label='XPosition'],
  ['extra position alias',f=>f[1].value[0].push(field('XPosition',8,12))],
  ['duplicate coordinate',f=>f[1].value[0].push({...f[1].value[0][3]})],
  ['coordinate wrong type',f=>f[1].value[0][3].type=4],
  ['nonfinite coordinate',f=>f[1].value[0][3].value=NaN],
  ['wrong template type',f=>f[1].value[0][0].type=10],
  ['missing tag',f=>f[1].value[0].splice(1,1)],
  ['duplicate family',f=>f.push({...f[1]})],
  ['unknown nonempty family',f=>f.push(field('ForeignList',15,[[]]))],
  ...['Door List','Encounter List','List','SoundList','StoreList','TriggerList','WaypointList'].map(label=>['unsupported '+label,f=>f.find(x=>x.label===label).value.push([])]),
])test('typed GIT rejects '+name,()=>{const f=nativeGitFields();mutate(f);assert.throws(()=>parse(f),/NATIVE_GIT|gff_/);});

for(const [name,mutate] of [
  ['missing version',r=>delete r.version],['foreign version',r=>r.version='foreign'],
  ['count mismatch',r=>r.objectCounts.total=1],['missing count',r=>delete r.objectCounts.doors],
  ['truncated inventory',r=>r.placeables.pop()],['appearance mismatch',r=>r.placeables[0].appearanceType++],
  ['tag mismatch',r=>r.placeables[0].tag='wrong'],['template mismatch',r=>r.placeables[0].templateResRef='wrong'],
  ['coordinate outside exact projection',r=>r.placeables[0].position[0]+=0.00001],
  ['raw coordinate in projected receipt',r=>r.placeables[0].position[0]=Math.fround(9.9693)],
])test('receipt rejects '+name,()=>{const r=nativeGitReceipt();mutate(r);assert.throws(()=>validate(undefined,r),/NATIVE_GIT/);});
test('requirements are a distinct subset with exact raw or four-decimal positions',()=>{
  const git=parse(nativeGitFields()),fixtures=[...required(),nativeGitReceipt().placeables[0]];
  assert.equal(validate(git,undefined,fixtures).length,2);
  fixtures[1].position=git.placeables[0].position;assert.equal(validate(git,undefined,fixtures).length,2);
  for(const value of [[],[...required(),...required()],[{...required()[0],appearanceType:42}],[{...required()[0],kind:'placeable'}],[{...required()[0],position:[20.00001,23,0]}]])assert.throws(()=>validate(git,undefined,value),/NATIVE_GIT/);
  const fields=nativeGitFields();fields[0].value.push(fields[0].value[0]);
  const duplicate=parse(fields),receipt=nativeGitReceipt();receipt.creatures.push(receipt.creatures[0]);receipt.objectCounts.creatures++;receipt.objectCounts.total++;
  assert.throws(()=>validate(duplicate,receipt),/NATIVE_GIT_FIXTURE/);
});
test('deterministic FLOAT corpus round-trips with only the receipt-v1 projection',()=>{
  let seed=177;
  for(let i=0;i<100;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const value=Math.fround((seed/0xffffffff-0.5)*10000),fields=nativeGitFields();fields[1].value[0][3].value=value;
    const git=parse(fields),receipt=nativeGitReceipt();receipt.placeables[0].position[0]=Number(value.toFixed(4));
    assert.equal(git.placeables[0].position[0],value);assert.equal(validate(git,receipt).length,1);
    receipt.placeables[0].position[0]+=0.00001;assert.throws(()=>validate(git,receipt),/NATIVE_GIT_RECEIPT/);
  }
});
test('human/v2 reader remains explicit and does not opt into native inventory',()=>{
  const legacy=readEntrySurfaceModuleBytes(fixtureModule().bytes,'entry_area');
  assert.equal(legacy.git.version,undefined);assert.equal(legacy.git.creatures.length,1);
  assert.equal(ENTRY_SOURCE_VERSION,'aurora-binary-entry-surface-source/v2');
  assert.throws(()=>readEntrySurfaceModuleBytes(fixtureModule().bytes,'entry_area',{sourcePolicy:'unknown'}),/POLICY/);
});
test('human/v2 still rejects a required subset even when complete GIT and receipt agree',()=>{
  const dir=mkdtempSync(join(tmpdir(),'aurora-human-count-'));
  try{
    const fields=nativeGitFields();fields[0].value[0].typeId=0;fields[0].value[0][2].type=4;
    fields[0].value.push(fields[0].value[0]);fields[1].value=[];
    const receipt=nativeGitReceipt();receipt.creatures.push({...receipt.creatures[0]});receipt.placeables=[];
    const f=writeSourceFixture(dir,'legacy_count',{moduleOptions:{gitFields:fields},gitReadback:receipt});
    assert.throws(()=>loadBinaryEntrySurfaceSource({profilePath:f.profilePath,outDir:dir}),/ENTRY_FIXTURE_COUNT_MISMATCH/);
  }finally{assert.equal(dirname(dir),resolve(tmpdir()));rmSync(dir,{recursive:true,force:true});}
});
test('native admission and S07 require all three typed objects',()=>{
  const dir=mkdtempSync(join(tmpdir(),'aurora-inventory-binding-'));
  try{
    const f=nativeFixture(dir,{finalize:true}),v=validateNativeSaveAdmission(f.result.admissionPath),g=v.geometryProfile;
    assert.equal(g.fixtures.length,3);assert.equal(g.requiredFixtureBindings.length,1);
    assert.equal(g.inventory.version,NATIVE_GIT_INVENTORY_VERSION);
    const profile={module:{...g.module,area:g.area.resref,entryPoint:g.entryPoint.position,entryDirection:g.entryPoint.direction},orderedHakList:g.orderedHakList,fixtures:g.fixtures,
      geometryGate:{kind:'native-save-review-v1'},launch:{mode:'central_guarded_test_module_action'},evidencePolicy:{},runtimeWindow:{expectedDevice:'\\\\.\\DISPLAY1',primary:false}};
    assert.doesNotThrow(()=>assertRuntimeGeometryBinding(profile,v));
    for(const mutate of [p=>p.fixtures.pop(),p=>delete p.fixtures[0].kind,p=>delete p.fixtures[0].appearanceType,p=>p.fixtures[1].sourceIndex=1,p=>p.fixtures[1].position[0]=9.9693,p=>p.fixtures[1].tag='wrong',p=>p.fixtures[1]=p.fixtures[2]]){
      const p=structuredClone(profile);mutate(p);assert.throws(()=>assertRuntimeGeometryBinding(p,v),/fixture_mismatch/);
    }
  }finally{assert.equal(dirname(dir),resolve(tmpdir()));rmSync(dir,{recursive:true,force:true});}
});
test('exact independently saved native corpus (opt-in read-only snapshot)',{skip:!process.env.AURORA_NATIVE_INVENTORY_CORPUS},()=>{
  const dir=process.env.AURORA_NATIVE_INVENTORY_CORPUS,bytes=readFileSync(join(dir,'source-module.bin'));
  const sha=b=>createHash('sha256').update(b).digest('hex');
  const audit=JSON.parse(readFileSync(join(dir,'source-audit.json'),'utf8'));
  assert.equal(sha(bytes),audit.module.sha256);
  const read=name=>JSON.parse(readFileSync(join(dir,name),'utf8'));
  const profile=read('source-profile.json'),manifest=read('source-manifest.json'),postSaveProfile=read('source-post-save-profile.json');
  const packed=readEntrySurfaceModuleBytes(bytes,profile.area.resref,{sourcePolicy:NATIVE_GIT_INVENTORY_VERSION});
  const identity=(path,name)=>({path,sha256:sha(readFileSync(join(dir,name))),bytes:readFileSync(join(dir,name)).length});
  const result=validateBinaryEntrySurfaceSource({profile,manifest,postSaveProfile,packed,sourcePolicy:NATIVE_GIT_INVENTORY_VERSION,
    identities:{profile:identity(manifest.profilePath,'source-profile.json'),manifest:identity(join(manifest.artifactDir,'binary-native-geometry-manifest.json'),'source-manifest.json'),
      postSaveProfile:identity(manifest.postSaveProfilePath,'source-post-save-profile.json'),module:audit.module,haks:profile.orderedHakList.map(h=>({...h,bytes:h.bytes}))}});
  assert.equal(result.target.git.inventory.length,3);assert.equal(result.requiredFixtureBindings.length,1);
  assert.equal(result.target.git.sha256,audit.gitSha256);
});
