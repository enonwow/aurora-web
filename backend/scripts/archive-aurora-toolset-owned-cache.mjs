// Public filesystem-only continuation for an exact prior owned, byte-identical
// Toolset cache. Does not control NWN or create a native session.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,lstatSync,existsSync,renameSync,writeFileSync} from 'node:fs';
import {resolve,dirname,join,basename} from 'node:path';
import {parseErfArchive} from './lib/aurora-model-proof-120s-erf-gff-readback.mjs';
import {assertCacheInventory,assertArchiveLineage} from './lib/aurora-toolset-owned-cache-archive.mjs';
const o=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,s)=>i%2?a:[...a,[v.slice(2),s[i+1]]],[]));
assert.ok(['dry-run','archive'].includes(o.mode));
const fp=resolve(o.failedManifest),op=resolve(o.ownerManifest),oldPath=resolve(o.previousModule),out=dirname(fp);
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const hash=b=>createHash('sha256').update(b).digest('hex');
const failed=read(fp),owner=read(op),oldBytes=readFileSync(oldPath);
function processes(){const s=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','@(Get-Process nwtoolset -ErrorAction SilentlyContinue | Select-Object Id,StartTime) | ConvertTo-Json -Compress'],{encoding:'utf8',windowsHide:true,timeout:15000}).trim();return s?[JSON.parse(s)].flat():[];}
assertArchiveLineage(failed,owner,hash(oldBytes),processes());
assert.equal(hash(readFileSync(failed.module.path)),failed.module.sha256);
const cache=resolve(dirname(failed.module.path),'temp0'),dest=resolve(out,'archived-owned-temp0');
assert.equal(basename(cache),'temp0');assert.equal(dirname(cache),dirname(resolve(failed.module.path)));
assert.ok(dest.startsWith(out+'\\') || dest.startsWith(out+'/'));
assert.ok(!existsSync(dest));assert.ok(!lstatSync(cache).isSymbolicLink());
const ext=new Map(Object.entries({0:'res',3:'tga',4:'wav',6:'plt',2002:'mdl',2009:'nss',2010:'ncs',2012:'are',2013:'set',2014:'ifo',2015:'bic',2016:'wok',2017:'2da',2022:'txi',2023:'git',2025:'uti',2027:'utc',2029:'dlg',2030:'itp',2032:'utt',2033:'dds',2035:'uts',2036:'ltr',2037:'gff',2038:'fac',2040:'ute',2042:'utd',2044:'utp',2045:'dft',2046:'gic',2047:'gui',2051:'utm',2058:'utw',2060:'ssf',2064:'ndb'}).map(([k,v])=>[Number(k),v]));
const expected=parseErfArchive(oldBytes,'MOD ').resources.map(r=>{assert.ok(ext.has(r.type),'unsupported cache resource');return{name:(r.resref+'.'+ext.get(r.type)).toLowerCase(),sha256:hash(r.bytes)};});
const actual=readdirSync(cache).map(name=>{const p=join(cache,name),st=lstatSync(p);assert.ok(st.isFile()&&!st.isSymbolicLink());return{name:name.toLowerCase(),sha256:hash(readFileSync(p))};});
assertCacheInventory(expected,actual);
const sourceStat=lstatSync(cache),ownerStart=Date.parse(owner.open.process.StartTimeUtc);
assert.ok(sourceStat.birthtimeMs>=ownerStart-2000 && sourceStat.birthtimeMs<=ownerStart+120000,'cache creation must belong to prior owned startup');
const archivedFailure=join(out,'failed-prelaunch-before-cache-archive.json'),receiptPath=join(out,'owned-cache-archive.json');
assert.ok(!existsSync(archivedFailure)&&!existsSync(receiptPath));
const receipt={version:'aurora-owned-cache-archive/v1',mode:o.mode,failedManifest:{path:fp,sha256:hash(readFileSync(fp))},ownerManifest:{path:op,sha256:hash(readFileSync(op))},previousModule:{path:oldPath,sha256:hash(oldBytes)},cache:{source:cache,destination:dest,resources:actual.length},priorProcess:owner.open.process,startsNwn:false,controlsNwn:false,startsToolset:false,changesIniOrMru:false};
if(o.mode==='archive'){
  assert.deepEqual(processes(),[]);assert.equal(hash(readFileSync(failed.module.path)),failed.module.sha256);
  renameSync(cache,dest);
  renameSync(fp,archivedFailure);
  receipt.archivedFailure=archivedFailure;receipt.archivedAt=new Date().toISOString();
  writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify({...receipt,ok:true,next:'same profile and outDir: preflight then open'},null,2));
