import {test} from 'node:test';import assert from 'node:assert/strict';
import {assertSavedEmptyAreaFacts} from '../../scripts/lib/aur-s07-saved-empty-area-admission.mjs';
const sample=()=>{
 const module={path:'C:/test/arena.mod',resref:'arena',sha256:'b'.repeat(64),bytes:1024};
 const area={resref:'arena',width:2,height:2},entry={area:'arena',position:[10,10,0],direction:[0,1]};
 const haks=[{path:'C:/test/arena.hak',resref:'arena',sha256:'c'.repeat(64),bytes:512}];
 const counts=Object.fromEntries(['placeables','doors','creatures','encounters','items','sounds','stores','triggers','waypoints','total'].map(k=>[k,0]));
 const saved={version:'aurora-toolset-binary-area-create-profile/v1',proofKind:'area-create-empty-structural',module,area,moduleEntryPoint:entry,orderedHakList:haks,git:{exactEmpty:true,expectedObjectCounts:counts},gic:{required:true}};
 const source={...saved,module:{...module,sha256:'a'.repeat(64)}};
 const own={Id:123,StartTimeUtc:'2026-09-08T10:00:00.1234567Z'};
 const owner={version:'aurora-toolset-binary-native-geometry-manifest/v1',status:'module_ready',module:source.module,open:{process:own}};
 const rebuild={version:'aurora-toolset-module-rebuild/v1',status:'saved_verified',module:source.module,owner:own,buildResults:['No errors found'],postBuildModuleSha256:module.sha256,finalWindows:{processId:123,windows:[{className:'TfrmFrame',text:'Aurora - arena.mod'}]}};
 const structural={ok:true,status:'binary_area_create_structural_readback_valid',noNativeGeometryOrVisualProofClaimed:true,module,area,entryPoint:entry,orderedHakList:haks};
 const runtime={module:{...module,area:'arena',entryPoint:entry.position},orderedHakList:haks,fixtures:[{id:'actor',kind:'runtime-player',area:'arena'}]};
 const admission={version:'aur-s07-saved-empty-area-admission/v1',scope:'saved-empty-area-runtime-trial',runtimeClaimed:false,walkabilityClaimed:false};
 return JSON.parse(JSON.stringify({runtime,admission,saved,source,owner,rebuild,structural}));
};
const validate=f=>assertSavedEmptyAreaFacts(f.runtime,f.admission,f.saved,f.source,f.owner,f.rebuild,f.structural);
test('saved empty Area is admitted only to a runtime trial, with no human or walkability claim',()=>{const r=validate(sample());assert.equal(r.status,'admitted-for-runtime-trial');assert.equal(r.walkabilityClaimed,false);assert.equal(r.runtimeClaimed,false);assert.equal(r.witnessAuthority,undefined);});
test('rebuild, native ownership, saved frame and scope failures stay closed',()=>{
 for(const mutate of [f=>f.admission.walkabilityClaimed=true,f=>f.admission.runtimeClaimed=true,f=>f.rebuild.status='build_errors',f=>f.rebuild.buildResults=['Error'],f=>f.rebuild.postBuildModuleSha256='d'.repeat(64),f=>f.rebuild.owner.Id=999,f=>f.rebuild.finalWindows.windows[0].text+='*',f=>f.rebuild.finalWindows.windows.push({className:'TdlgProgress',text:'Loading'})]){const f=sample();mutate(f);assert.throws(()=>validate(f),/empty_trial_/);}
});
test('foreign resources, changed geometry, nonempty Area and invented GIT fixture cannot use this admission',()=>{
 for(const mutate of [f=>f.runtime.module.path='C:/test/other.mod',f=>f.runtime.module.entryPoint=[0,0,0],f=>f.runtime.module.sha256='d'.repeat(64),f=>f.runtime.orderedHakList=[],f=>f.source.area.width=3,f=>f.saved.git.expectedObjectCounts.creatures=1,f=>f.saved.gic.required=false,f=>f.runtime.fixtures[0].templateResRef='creature',f=>f.runtime.fixtures[0].area='other',f=>f.structural.ok=false]){const f=sample();mutate(f);assert.throws(()=>validate(f),/empty_trial_/);}
});
