import { resolve } from 'node:path';

const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const samePath = (a, b) => typeof a === 'string' && typeof b === 'string' && resolve(a).toLowerCase() === resolve(b).toLowerCase();

// The caller must obtain verdict from validateGeometryArtifact, never from a
// profile boolean. This layer binds that independently revalidated evidence to
// the proposed runtime target; it does not qualify any runtime result.
export function assertRuntimeGeometryBinding(profile, verdict) {
  const geometry = verdict?.geometryProfile;
  if (verdict?.status !== 'verified' || verdict.basis !== 'human_observed_native_paint_walk_admission' || verdict.witnessAuthority !== 'human_reported' || verdict.proofScope !== 'nativePaintWalkAdmission' || verdict.runtimeClaimed !== false || geometry?.version !== 'aurora-toolset-binary-native-geometry-profile/v2') throw new Error('runtime_geometry_evidence_unqualified');
  if (!samePath(profile.module?.path, geometry.module?.path) || profile.module.sha256 !== geometry.module.sha256 || profile.module.area !== geometry.area?.resref || !equal(profile.module.entryPoint, geometry.entryPoint?.position) || (profile.module.entryDirection !== undefined && !equal(profile.module.entryDirection, geometry.entryPoint.direction))) throw new Error('runtime_geometry_target_mismatch');
  if (!Array.isArray(profile.orderedHakList) || profile.orderedHakList.length !== geometry.orderedHakList?.length || profile.orderedHakList.some((hak, index) => {
    const saved = geometry.orderedHakList[index];
    return hak.resref !== saved.resref || hak.sha256 !== saved.sha256 || !samePath(hak.path, saved.path) || (hak.bytes !== undefined && hak.bytes !== saved.bytes);
  })) throw new Error('runtime_geometry_hak_mismatch');
  if (!Array.isArray(profile.fixtures) || !profile.fixtures.length || !Array.isArray(geometry.fixtures) || profile.fixtures.some(fixture => geometry.fixtures.filter(saved =>
    typeof fixture.templateResRef === 'string' && fixture.templateResRef === saved.templateResRef && equal(fixture.position, saved.position)
    && (fixture.appearanceRow === undefined || fixture.appearanceRow === saved.appearanceType)
    && (fixture.appearanceType === undefined || fixture.appearanceType === saved.appearanceType)
    && (fixture.tag === undefined || fixture.tag === saved.tag)).length !== 1)) throw new Error('runtime_geometry_fixture_mismatch');
  return { basis: verdict.basis, witnessAuthority: verdict.witnessAuthority, proofScope: verdict.proofScope, runtimeClaimed: false };
}
