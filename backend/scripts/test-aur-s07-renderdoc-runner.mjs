import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runRenderDocJob,sha256,temporaryConfig} from './lib/aur-s07-renderdoc-runner.mjs';

const root=mkdtempSync(join(tmpdir(),'aur-rd-tests-'));
const original=Buffer.from('{"rdocConfigData":1,"Analytics_TotalOptOut":false,"other":"retain exact bytes"}\r\n');
assert.equal(JSON.parse(temporaryConfig(original)).Analytics_TotalOptOut,true);
assert.throws(()=>temporaryConfig(Buffer.from('{}')),/version/);
let count=2;
for(const scenario of ['success','nonzero','timeout','missing','occupied','wronghash']) {
  const configPath=join(root,scenario+'.config'); writeFileSync(configPath,original);
  const script=join(root,scenario+'.py'); writeFileSync(script,'test fixture');
  const spec={executable:process.execPath,executableSha256:sha256(readFileSync(process.execPath)),
    configPath,script,directory:join(root,scenario),timeoutMs:300,job:{mode:'api'}};
  const implementation=scenario==='timeout' ? 'setInterval(()=>{},1000)' :
    scenario==='nonzero' ? 'process.exit(4)' : scenario==='missing' ? '' :
    `const fs=require('fs');const job=JSON.parse(fs.readFileSync(process.env.AURORA_RENDERDOC_JOB));fs.writeFileSync(job.outputPath,JSON.stringify({ok:true}));`;
  const dependencies={inventory:()=>scenario==='occupied'?[{pid:99}]:[],
    spawn:(_exe,_args,options)=>spawn(process.execPath,['-e',implementation],options)};
  if(scenario==='wronghash') spec.executableSha256='0'.repeat(64);
  if(scenario==='success') assert.equal((await runRenderDocJob(spec,dependencies)).ok,true);
  else await assert.rejects(runRenderDocJob(spec,dependencies));
  assert.deepEqual(readFileSync(configPath),original);
  assert.equal(existsSync(join(root,'aur-s07-renderdoc-replay.lock')),false);
  count++;
}
console.log(JSON.stringify({passed:count,fixtureDirectory:root}));
