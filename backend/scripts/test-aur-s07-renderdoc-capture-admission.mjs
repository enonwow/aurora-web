import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {admitCapture} from './lib/aur-s07-renderdoc-capture-admission.mjs';
const dir=mkdtempSync(join(tmpdir(),'aur-capture-admit-'));
const hash='a'.repeat(64),receipt=join(dir,'rebuild.json');
writeFileSync(receipt,JSON.stringify({status:'saved_verified',postBuildModuleSha256:hash,buildResults:['No errors found']}));
const baseline={version:'aur-s07-retail-gpu-capture/v1',authorization:'one owned measurement',expectedDevice:'\\\\.\\DISPLAY1',primary:false,
launchMode:'official-renderdoc-before-graphics-init',userDirectory:dir,
executable:{path:'C:/fixture/nwmain.exe',sha256:hash},module:{path:join(dir,'modules','Demo Test.mod'),sha256:hash},
haks:[{path:join(dir,'hak','demo.hak'),sha256:hash}],rebuildReceipt:{path:receipt,sha256:hash}};
assert.match((await admitCapture(baseline,async()=>hash)).args,/\+TestNewModule "Demo Test"/);
for(const change of [{authorization:''},{primary:true},{expectedDevice:'\\\\.\\DISPLAY2'},{launchMode:'late-inject'},
{module:{path:join(dir,'outside','Demo Test.mod'),sha256:hash}},{executable:{path:'C:/fixture/other.exe',sha256:hash}}]){
 await assert.rejects(admitCapture({...baseline,...change},async()=>hash));
}
await assert.rejects(admitCapture(baseline,async()=>'b'.repeat(64)));
console.log(JSON.stringify({passed:8,scope:'pre-init capture admission; no native launch'}));
