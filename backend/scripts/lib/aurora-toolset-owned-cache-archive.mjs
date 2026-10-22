import assert from 'node:assert/strict';
import { resolve } from 'node:path';
export function assertCacheInventory(expected,actual){
  const order=a=>[...a].sort((a,b)=>a.name.localeCompare(b.name));
  assert.equal(new Set(expected.map(x=>x.name)).size,expected.length,'duplicate expected file');
  assert.equal(new Set(actual.map(x=>x.name)).size,actual.length,'duplicate cache file');
  assert.deepEqual(order(actual),order(expected),'cache contains missing, changed or additional work');
}
export function assertArchiveLineage(failed,owner,oldHash,processes){
  assert.equal(processes.length,0,'Toolset must not be running');
  assert.equal(failed.status,'failed');
  assert.equal(failed.blockerCode,'toolset_temp0_requires_clean_start');
  assert.equal(failed.openFailure?.child?.blockerCode,'toolset_temp0_requires_clean_start');
  assert.deepEqual(failed.openFailure.postChildProcesses,[],'a live startup cannot be reset');
  assert.equal(owner.status,'module_ready');
  assert.equal(resolve(owner.module.path).toLowerCase(),resolve(failed.module.path).toLowerCase());
  assert.equal(owner.module.sha256,oldHash);
  assert.notEqual(oldHash,failed.module.sha256);
  assert.ok(owner.open?.process?.Id && owner.open.process.StartTimeUtc,'prior owned process identity required');
}
