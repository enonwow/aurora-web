// Read-only admission for a runtime TRIAL in an empty, natively rebuilt Area.
// This is intentionally not a human paint/walk receipt or a walkability verdict.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {assertEnvironmentProfile} from './aurora-binary-environment-profile.mjs';
const check=(v,code)=>{if(!v)throw Error(code);};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const samePath=(a,b)=>typeof a==='string'&&typeof b==='string'&&resolve(a).toLowerCase()===resolve(b).toLowerCase();
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(readFileSync(p,'utf8').replace(/^\uFEFF/,''));
function readBound(ref){check(typeof ref?.path==='string'&&/^[a-f0-9]{64}$/.test(ref.sha256??''),'empty_trial_artifact_identity_invalid');const bytes=readFileSync(ref.path);check(hash(bytes)===ref.sha256,'empty_trial_artifact_hash_mismatch');return JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));}

export function assertSavedEmptyAreaFacts(runtime,admission,saved,source,owner,rebuild,structural){
 check(admission?.version==='aur-s07-saved-empty-area-admission/v1'&&admission.scope==='saved-empty-area-runtime-trial'&&admission.runtimeClaimed===false&&admission.walkabilityClaimed===false,'empty_trial_scope_invalid');
 check(saved.version==='aurora-toolset-binary-area-create-profile/v1'&&saved.proofKind==='area-create-empty-structural'&&saved.git?.exactEmpty===true&&saved.gic?.required===true,'empty_trial_profile_invalid');
 check(structural?.ok===true&&structural.status==='binary_area_create_structural_readback_valid'&&structural.noNativeGeometryOrVisualProofClaimed===true&&equal(structural.module,saved.module)&&equal(structural.area,saved.area)&&equal(structural.entryPoint,saved.moduleEntryPoint)&&equal(structural.orderedHakList,saved.orderedHakList),'empty_trial_structural_readback_invalid');
 check(Object.keys(saved.git.expectedObjectCounts??{}).length===10&&Object.values(saved.git.expectedObjectCounts).every(x=>x===0),'empty_trial_nonempty_git');
 assertSavedTrialLineage(runtime,saved,source,owner,rebuild,saved.moduleEntryPoint,source.moduleEntryPoint);
 return {status:'admitted-for-runtime-trial',basis:'native_rebuild_and_current_empty_area_readback',proofScope:'saved-empty-area-runtime-trial',runtimeClaimed:false,walkabilityClaimed:false};
}

export function assertSavedEnvironmentFacts(runtime,admission,saved,source,owner,rebuild,structural){
 check(admission?.version==='aur-s07-saved-environment-admission/v1'&&admission.scope==='saved-environment-runtime-trial'&&admission.runtimeClaimed===false&&admission.walkabilityClaimed===false,'environment_trial_scope_invalid');
 assertEnvironmentProfile(saved);assertEnvironmentProfile(source);
 check(equal(saved.environment,source.environment),'environment_trial_resource_lineage_invalid');
 check(structural?.ok===true&&structural.status==='binary_bootstrap_structural_readback_valid'&&structural.profileKind==='skybox-environment-trial'&&structural.noNativeGeometryOrVisualProofClaimed===true&&equal(structural.module,saved.module)&&equal(structural.area,saved.area)&&equal(structural.entryPoint,saved.entryPoint)&&equal(structural.orderedHakList,saved.orderedHakList),'environment_trial_structural_readback_invalid');
 assertSavedTrialLineage(runtime,saved,source,owner,rebuild,saved.entryPoint,source.entryPoint);
 return {status:'admitted-for-runtime-trial',basis:'native_rebuild_and_current_pinned_environment_readback',proofScope:'saved-environment-runtime-trial',runtimeClaimed:false,walkabilityClaimed:false};
}

function assertSavedTrialLineage(runtime,saved,source,owner,rebuild,entry,sourceEntry){
 check(owner.version==='aurora-toolset-binary-native-geometry-manifest/v1'&&owner.status==='module_ready'&&owner.open?.process?.Id>0&&typeof owner.open.process.StartTimeUtc==='string','empty_trial_owner_invalid');
 check(equal(source.module,owner.module)&&equal(source.module,rebuild.module)&&equal(source.area,saved.area)&&equal(sourceEntry,entry)&&equal(source.orderedHakList,saved.orderedHakList),'empty_trial_source_lineage_invalid');
 check(rebuild.version==='aurora-toolset-module-rebuild/v1'&&['saved_verified','closed_after_saved_build'].includes(rebuild.status)&&equal(rebuild.buildResults,['No errors found'])&&rebuild.postBuildModuleSha256===saved.module.sha256&&samePath(rebuild.module.path,saved.module.path),'empty_trial_rebuild_invalid');
 check(rebuild.owner?.Id===owner.open.process.Id&&rebuild.owner.StartTimeUtc===owner.open.process.StartTimeUtc&&rebuild.finalWindows?.processId===rebuild.owner.Id,'empty_trial_native_owner_mismatch');
 const frames=rebuild.finalWindows.windows?.filter(w=>w.className==='TfrmFrame'&&w.text.endsWith(' - '+saved.module.resref+'.mod'))??[];
 check(frames.length===1&&rebuild.finalWindows.windows.every(w=>['TfrmFrame','TApplication'].includes(w.className)),'empty_trial_saved_frame_invalid');
 check(samePath(runtime.module.path,saved.module.path)&&runtime.module.sha256===saved.module.sha256&&runtime.module.area===saved.area.resref&&equal(runtime.module.entryPoint,entry.position)&&(runtime.module.entryDirection===undefined||equal(runtime.module.entryDirection,entry.direction)),'empty_trial_target_mismatch');
 check(equal(runtime.orderedHakList,saved.orderedHakList),'empty_trial_hak_mismatch');
 check(Array.isArray(runtime.fixtures)&&runtime.fixtures.length===1&&runtime.fixtures[0].kind==='runtime-player'&&runtime.fixtures[0].area===saved.area.resref&&typeof runtime.fixtures[0].id==='string'&&runtime.fixtures[0].templateResRef===undefined,'empty_trial_fixture_invalid');
}

export function validateSavedEmptyAreaAdmission(artifactPath,runtime){
 return validateBoundSavedTrial(artifactPath,runtime,assertSavedEmptyAreaFacts);
}
export function validateSavedEnvironmentAdmission(artifactPath,runtime){
 return validateBoundSavedTrial(artifactPath,runtime,assertSavedEnvironmentFacts);
}
function validateBoundSavedTrial(artifactPath,runtime,assertFacts){
 const admission=read(artifactPath),saved=readBound(admission.savedProfile),owner=readBound(admission.ownerManifest),rebuild=readBound(admission.rebuildReceipt);
 check(typeof owner.profilePath==='string'&&/^[a-f0-9]{64}$/.test(owner.profileSha256??''),'empty_trial_source_profile_identity_invalid');
 const source=readBound({path:owner.profilePath,sha256:owner.profileSha256});
 const validator=resolve(import.meta.dirname,'../validate-aurora-toolset-binary-module-bootstrap.mjs');
 // Full consuming modules can bind dozens of multi-gigabyte HAKs. Keep the
 // read-only validation bounded without using the tiny empty-lab time budget.
 const structural=JSON.parse(execFileSync(process.execPath,[validator,'--mode','preflight','--profile',resolve(admission.savedProfile.path)],{windowsHide:true,encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024}));
 return assertFacts(runtime,admission,saved,source,owner,rebuild,structural);
}
