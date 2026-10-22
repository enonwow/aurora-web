import { resolve } from 'node:path';
import {readFileSync,statSync} from 'node:fs';
import {validateGeometryArtifact} from './aurora-binary-entry-surface-workflow.mjs';
import {validateNativeSaveAdmission,NATIVE_SAVE_ADMISSION_VERSION,NATIVE_SAVE_GATE_KIND} from './aurora-native-save-runtime-admission.mjs';
import {NATIVE_GIT_INVENTORY_VERSION} from './aurora-native-save-git-inventory.mjs';

export function validateRuntimeGeometryGate(profile){
  const path=resolve(profile.geometryGate.artifact);
  if(!statSync(path).isFile()||statSync(path).size>16*1024*1024)throw new Error('runtime_geometry_artifact_budget_invalid');
  const declared=JSON.parse(readFileSync(path,'utf8'));
  if(profile.geometryGate.kind===NATIVE_SAVE_GATE_KIND){
    if(declared.version!==NATIVE_SAVE_ADMISSION_VERSION)throw new Error('runtime_native_save_admission_kind_mismatch');
    const verdict=validateNativeSaveAdmission(path);assertRuntimeGeometryBinding(profile,verdict);return verdict;
  }
  if(declared.version===NATIVE_SAVE_ADMISSION_VERSION||profile.geometryGate.kind!==undefined)throw new Error('runtime_native_save_admission_kind_mismatch');
  const verdict=validateGeometryArtifact(path);assertRuntimeGeometryBinding(profile,verdict);return verdict;
}

const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const samePath = (a, b) => typeof a === 'string' && typeof b === 'string' && resolve(a).toLowerCase() === resolve(b).toLowerCase();

// The caller must obtain verdict from validateGeometryArtifact, never from a
// profile boolean. This layer binds that independently revalidated evidence to
// the proposed runtime target; it does not qualify any runtime result.
export function assertRuntimeGeometryBinding(profile, verdict) {
  const geometry = verdict?.geometryProfile;
  const nativeSave=geometry?.version===NATIVE_SAVE_ADMISSION_VERSION;
  if(nativeSave){
    if(profile.geometryGate?.kind!==NATIVE_SAVE_GATE_KIND||verdict.status!=='verified'||verdict.basis!=='native_save_readback_and_toolset_visual_review'||verdict.proofScope!=='nativeSaveReadbackAndToolsetReview'||verdict.reviewAuthority!=='reported_visual_review'||verdict.runtimeClaimed!==false||verdict.fileValidatorAuthenticatesReviewer!==false)throw new Error('runtime_geometry_evidence_unqualified');
    if(profile.launch?.mode!=='central_guarded_test_module_action'||!profile.evidencePolicy||profile.runtimeWindow?.expectedDevice!=='\\\\.\\DISPLAY1'||profile.runtimeWindow.primary!==false)throw new Error('runtime_native_save_enhanced_central_policy_required');
    if(!equal(profile.module?.entryDirection,geometry.entryPoint?.direction))throw new Error('runtime_geometry_target_mismatch');
    if(profile.module?.bytes!==geometry.module.bytes||profile.module?.resref!==geometry.module.resref)throw new Error('runtime_geometry_target_mismatch');
    if(geometry.inventory?.version!==NATIVE_GIT_INVENTORY_VERSION||!Array.isArray(profile.fixtures)
      ||profile.fixtures.length!==geometry.fixtures.length||geometry.inventory.objectCounts.total!==geometry.fixtures.length
      ||new Set(profile.fixtures.map(f=>JSON.stringify([f.kind,f.sourceIndex]))).size!==profile.fixtures.length
      ||profile.fixtures.some(f=>geometry.fixtures.filter(saved=>['kind','sourceIndex','templateResRef','tag','appearanceType','position']
        .every(key=>f[key]!==undefined&&equal(f[key],saved[key]))).length!==1))throw new Error('runtime_geometry_fixture_mismatch');
  }else if (verdict?.status !== 'verified' || verdict.basis !== 'human_observed_native_paint_walk_admission' || verdict.witnessAuthority !== 'human_reported' || verdict.proofScope !== 'nativePaintWalkAdmission' || verdict.runtimeClaimed !== false || geometry?.version !== 'aurora-toolset-binary-native-geometry-profile/v2') throw new Error('runtime_geometry_evidence_unqualified');
  if (!samePath(profile.module?.path, geometry.module?.path) || profile.module.sha256 !== geometry.module.sha256 || profile.module.area !== geometry.area?.resref || !equal(profile.module.entryPoint, geometry.entryPoint?.position) || (profile.module.entryDirection !== undefined && !equal(profile.module.entryDirection, geometry.entryPoint.direction))) throw new Error('runtime_geometry_target_mismatch');
  if (!Array.isArray(profile.orderedHakList) || profile.orderedHakList.length !== geometry.orderedHakList?.length || profile.orderedHakList.some((hak, index) => {
    const saved = geometry.orderedHakList[index];
    return hak.resref !== saved.resref || hak.sha256 !== saved.sha256 || !samePath(hak.path, saved.path) || (hak.bytes !== undefined && hak.bytes !== saved.bytes);
  })) throw new Error('runtime_geometry_hak_mismatch');
  if (!Array.isArray(profile.fixtures) || !profile.fixtures.length || !Array.isArray(geometry.fixtures) || profile.fixtures.some(fixture => geometry.fixtures.filter(saved =>
    typeof fixture.templateResRef === 'string' && fixture.templateResRef === saved.templateResRef && equal(fixture.position, saved.position)
    && (!nativeSave || (fixture.kind === saved.kind && fixture.sourceIndex === saved.sourceIndex))
    && (fixture.appearanceRow === undefined || fixture.appearanceRow === saved.appearanceType)
    && (fixture.appearanceType === undefined || fixture.appearanceType === saved.appearanceType)
    && (fixture.tag === undefined || fixture.tag === saved.tag)).length !== 1)) throw new Error('runtime_geometry_fixture_mismatch');
  return { basis: verdict.basis, witnessAuthority: verdict.witnessAuthority, proofScope: verdict.proofScope, runtimeClaimed: false };
}
