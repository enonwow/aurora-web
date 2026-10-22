import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,openSync,ftruncateSync,closeSync,rmSync,writeFileSync} from 'node:fs';
import {createRequire,syncBuiltinESMExports} from 'node:module';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {measureSavedFile} from '../../scripts/lib/aurora-saved-file-identity.mjs';

test('streams a 513 MiB HAK in a 64 MiB heap; rejects oversize and expected hash drift',()=>{
  const dir=mkdtempSync(join(tmpdir(),'aurora-stream-test-'));
  try{
    const path=join(dir,'TEST-SIMULATION.hak'),fd=openSync(path,'wx');
    try{ftruncateSync(fd,513*1024*1024);}finally{closeSync(fd);}
    const modulePath=resolve(import.meta.dirname,'../../scripts/lib/aurora-saved-file-identity.mjs');
    const runner=join(dir,'measure.mjs');writeFileSync(runner,`import {measureSavedFile} from ${JSON.stringify(new URL('file:///'+modulePath.replaceAll('\\','/')).href)};const started=performance.now();const result=measureSavedFile(process.argv[2],4*1024**3);console.log(JSON.stringify({result,ms:performance.now()-started,rss:process.memoryUsage().rss}));`);
    const run=spawnSync(process.execPath,['--max-old-space-size=64',runner,path],{windowsHide:true,encoding:'utf8',timeout:30000});assert.equal(run.status,0,run.stderr);
    const measured=JSON.parse(run.stdout);assert.equal(measured.result.bytes,513*1024*1024);assert.match(measured.result.sha256,/^[a-f0-9]{64}$/);assert(measured.rss<160*1024*1024,JSON.stringify(measured));
    assert.throws(()=>measureSavedFile(path,512*1024*1024),/BUDGET/);
    assert.throws(()=>measureSavedFile(path,4*1024**3,{sha256:'0'.repeat(64),bytes:513*1024*1024}),/HASH/);
    console.log(JSON.stringify({testSimulation:true,streamBytes:measured.result.bytes,milliseconds:Math.round(measured.ms),rssBytes:measured.rss}));
  }finally{assert.equal(dirname(dir),resolve(tmpdir()));rmSync(dir,{recursive:true,force:true});}
});
test('a HAK changed during its chunked read is rejected and its descriptor closes',()=>{
  const dir=mkdtempSync(join(tmpdir(),'aurora-stream-drift-')),path=join(dir,'TEST-SIMULATION.hak'),fs=createRequire(import.meta.url)('node:fs');
  const originalRead=fs.readSync,originalClose=fs.closeSync;let closed=0,reads=0;
  try{
    writeFileSync(path,Buffer.alloc(9*1024*1024));
    fs.readSync=(...args)=>{const n=originalRead(...args);if(++reads===1)writeFileSync(path,'changed during hashing');return n;};
    fs.closeSync=(...args)=>{closed++;return originalClose(...args);};syncBuiltinESMExports();
    assert.throws(()=>measureSavedFile(path,4*1024**3),/CHANGED_DURING_READ/);assert(closed>=1);
  }finally{fs.readSync=originalRead;fs.closeSync=originalClose;syncBuiltinESMExports();assert.equal(dirname(dir),resolve(tmpdir()));rmSync(dir,{recursive:true,force:true});}
});
