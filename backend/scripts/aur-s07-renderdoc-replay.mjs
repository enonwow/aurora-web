#!/usr/bin/env node
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runRenderDocJob, fileSha256} from './lib/aur-s07-renderdoc-runner.mjs';

try {
  const args = process.argv.slice(2), options = {};
  for(let i=0;i<args.length;i+=2) {
    if(!args[i].startsWith('--') || !args[i+1] || args[i+1].startsWith('--')) throw new Error('invalid_argument');
    if (options[args[i].slice(2)] !== undefined) throw new Error('duplicate_argument');
    options[args[i].slice(2)] = args[i+1];
  }
  for (const key of ['exe','sha256','config','out','mode']) if(!options[key]) throw new Error('missing_'+key);
  if(!['api','readback'].includes(options.mode)) throw new Error('unsupported_mode');
  const job = {mode:options.mode};
  if (options.mode === 'readback') {
    if(!options.capture || !options['capture-sha256']) throw new Error('capture_binding_required');
    job.capturePath = resolve(options.capture);
    job.captureSha256 = options['capture-sha256'];
    if(await fileSha256(job.capturePath) !== job.captureSha256) throw new Error('capture_hash_mismatch');
    job.eventIds = options.events ? options.events.split(',').map(Number) : [];
    if(job.eventIds.length > 32 || job.eventIds.some(x=>!Number.isInteger(x)||x<1)) throw new Error('event_selection_invalid');
  }
  const result = await runRenderDocJob({executable:options.exe, executableSha256:options.sha256,
    configPath:options.config, directory:options.out, timeoutMs:Number(options['timeout-ms']??30000), job,
    script:join(dirname(fileURLToPath(import.meta.url)), 'lib/aur-s07-renderdoc-readback.py')});
  process.stdout.write(JSON.stringify({ok:true, mode:options.mode, output:resolve(options.out),
    version:result.version, liveNwnActions:false})+'\n');
} catch(error) {process.stderr.write(JSON.stringify({ok:false,error:String(error.message)})+'\n'); process.exitCode=1;}
