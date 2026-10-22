import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname,basename} from 'node:path';
import {fileSha256} from './aur-s07-renderdoc-runner.mjs';

export async function admitCapture(p, verify = fileSha256) {
  assert.equal(p.version,'aur-s07-retail-gpu-capture/v1');
  assert.ok(p.authorization?.trim(),'explicit measurement authorization required');
  assert.equal(p.expectedDevice,'\\\\.\\DISPLAY1');
  assert.equal(p.primary,false);
  assert.equal(p.launchMode,'official-renderdoc-before-graphics-init');
  assert.equal(basename(p.executable.path).toLowerCase(),'nwmain.exe');
  for (const binding of [p.executable,p.module,...p.haks,p.rebuildReceipt]) {
    assert.match(binding.sha256,/^[a-f0-9]{64}$/);
    assert.equal(await verify(binding.path),binding.sha256,'capture input changed: '+binding.path);
  }
  assert.equal(basename(dirname(p.module.path)).toLowerCase(),'modules');
  assert.equal(resolve(dirname(dirname(p.module.path))),resolve(p.userDirectory));
  assert.ok(p.haks.length>0);
  for(const hak of p.haks) assert.equal(resolve(dirname(hak.path)),resolve(p.userDirectory,'hak'));
  assert.match(basename(p.module.path),/^[A-Za-z0-9 _-]{1,32}\.mod$/);
  const rebuild=JSON.parse(readFileSync(p.rebuildReceipt.path,'utf8'));
  assert.equal(rebuild.status,'saved_verified');
  assert.equal(rebuild.postBuildModuleSha256,p.module.sha256);
  assert.deepEqual(rebuild.buildResults,['No errors found']);
  return {mode:'capture-authorized',target:p,
    args:`-userdirectory "${p.userDirectory}" +TestNewModule "${basename(p.module.path,'.mod')}"`,
    workingDirectory:dirname(p.executable.path),
    captureCount:6,captureIntervalSeconds:0.85,maxCaptureBytes:2*1024*1024*1024};
}
