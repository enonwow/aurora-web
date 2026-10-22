import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertSavedEnvironmentFacts} from '../../scripts/lib/aur-s07-saved-empty-area-admission.mjs';
function sample(){
 const module={path:'C:/test/sky.mod',resref:'sky',sha256:'b'.repeat(64)},area={resref:'gate',width:2,height:2},entryPoint={area:'gate',position:[5,5,0]},haks=[{resref:'sky',path:'C:/test/sky.hak',sha256:'c'.repeat(64)}];
 const environment={kind:'skybox',row:200,hakResref:'sky',areaResources:[2012,2023,2046].map(type=>({resref:'gate',type,sha256:'d'.repeat(64)})),hakResources:[{resref:'sky',type:2002,sha256:'e'.repeat(64)},{resref:'skyboxes',type:2017,sha256:'f'.repeat(64)}]};
 const saved={version:'aurora-toolset-binary-environment-profile/v1',proofKind:'skybox-environment-trial',module,area,entryPoint,orderedHakList:haks,fixtures:[],environment},source={...saved,module:{...module,sha256:'a'.repeat(64)}};
 const identity={Id:123,StartTimeUtc:'2026-09-09T00:00:00.1234567Z'},owner={version:'aurora-toolset-binary-native-geometry-manifest/v1',status:'module_ready',module:source.module,open:{process:identity}};
 const rebuild={version:'aurora-toolset-module-rebuild/v1',status:'saved_verified',module:source.module,owner:identity,buildResults:['No errors found'],postBuildModuleSha256:module.sha256,finalWindows:{processId:123,windows:[{className:'TfrmFrame',text:'Aurora - sky.mod'}]}};
 const runtime={module:{...module,area:'gate',entryPoint:entryPoint.position},orderedHakList:haks,fixtures:[{id:'observer',kind:'runtime-player',area:'gate'}]},admission={version:'aur-s07-saved-environment-admission/v1',scope:'saved-environment-runtime-trial',runtimeClaimed:false,walkabilityClaimed:false};
 const structural={ok:true,status:'binary_bootstrap_structural_readback_valid',profileKind:'skybox-environment-trial',noNativeGeometryOrVisualProofClaimed:true,module,area,entryPoint,orderedHakList:haks};
 return JSON.parse(JSON.stringify({runtime,admission,saved,source,owner,rebuild,structural}));
}
const run=f=>assertSavedEnvironmentFacts(f.runtime,f.admission,f.saved,f.source,f.owner,f.rebuild,f.structural);
test('native saved environment admits observation with no invented geometry or NPC proof',()=>{const result=run(sample());assert.equal(result.status,'admitted-for-runtime-trial');assert.equal(result.runtimeClaimed,false);assert.equal(result.walkabilityClaimed,false);});
test('foreign module, pins, entry, owner, dirty frame and unsupported proof stay rejected',()=>{
 for(const change of [f=>f.source.environment.row=199,f=>f.saved.environment.areaResources.pop(),f=>f.saved.fixtures=[{id:'fake'}],f=>f.runtime.module.entryPoint=[0,0,0],f=>f.runtime.module.sha256='f'.repeat(64),f=>f.rebuild.owner.Id=456,f=>f.rebuild.buildResults=['Error'],f=>f.rebuild.finalWindows.windows[0].text+='*',f=>f.structural.profileKind='model-fixture-geometry',f=>f.admission.walkabilityClaimed=true,f=>f.runtime.fixtures[0].templateResRef='npc']){const f=sample();change(f);assert.throws(()=>run(f));}
});
