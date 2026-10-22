import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {isModuleFileStem,moduleFileNameMatches} from '../../scripts/lib/aurora-module-file-identity.mjs';

for(const stem of ['Demo-North','Demo North','another_trial','MiXeD_02','a','x'.repeat(32)]) {
  assert.equal(isModuleFileStem(stem),true,stem);
  assert.equal(moduleFileNameMatches(join(tmpdir(),`${stem.toUpperCase()}.MOD`),stem),true);
  assert.equal(moduleFileNameMatches(join(tmpdir(),'different.mod'),stem),false);
}
for(const stem of ['',null,3,'../trial','..','a/b','a\\b','C:trial','a.mod','a\0b','a\nb',' a','a ','a\tb','a\r','x'.repeat(33)]) {
  assert.equal(isModuleFileStem(stem),false,String(stem));
  assert.equal(moduleFileNameMatches(join(tmpdir(),'trial.mod'),stem),false);
}
assert.equal(moduleFileNameMatches(join(tmpdir(),'Demo-North.mod.bak'),'Demo-North'),false);
const base={version:'aurora-toolset-binary-module-bootstrap-profile/v1',id:'filename-contract',module:{resref:'Demo-North',path:join(tmpdir(),'Demo-North.mod'),sha256:'a'.repeat(64)},area:{resref:'test_area',width:2,height:2},entryPoint:{area:'test_area',position:[10,10,0]},orderedHakList:[{resref:'test_hak',path:join(tmpdir(),'test_hak.hak'),sha256:'b'.repeat(64)}],fixtures:[{id:'fixture',templateResRef:'test_utc',appearanceType:15109,position:[10,10,0]}],noLocalToolsetAdapter:true};
const dir=mkdtempSync(join(tmpdir(),'aurora-module-identity-'));
const file=join(dir,'profile.json');
const validator=resolve('backend/scripts/validate-aurora-toolset-binary-module-bootstrap.mjs');
function run(profile){writeFileSync(file,JSON.stringify(profile));return execFileSync(process.execPath,[validator,'--mode','dry-run','--profile',file],{encoding:'utf8',cwd:dir,windowsHide:true,stdio:'pipe',timeout:10000});}
try {
  assert.match(run(base),/binary_bootstrap_profile_schema_valid/);
  assert.match(run({...base,module:{...base.module,resref:'Demo North',path:join(tmpdir(),'Demo North.mod')}}),/binary_bootstrap_profile_schema_valid/);
  assert.match(run({...base,module:{...base.module,resref:'another_trial'}}),/binary_bootstrap_profile_schema_valid/);
  assert.throws(()=>run({...base,module:{...base.module,resref:'../trial'}}),/binary_bootstrap_profile_content_invalid/);
  assert.throws(()=>run({...base,area:{...base.area,resref:'invalid-area'}}),/binary_bootstrap_profile_content_invalid/);
  assert.throws(()=>run({...base,fixtures:[{...base.fixtures[0],templateResRef:'invalid-template'}]}),/binary_bootstrap_profile_binding_invalid/);
} finally {
  assert.equal(resolve(dir).startsWith(resolve(tmpdir())+'\\aurora-module-identity-')||resolve(dir).startsWith(resolve(tmpdir())+'/aurora-module-identity-'),true);
  rmSync(dir,{recursive:true,force:true});
}
console.log('PASS: module filename identity, case folding, traversal rejection, strict resource resrefs, public schema');
