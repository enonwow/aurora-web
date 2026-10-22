import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertRuntimeGeometryBinding } from '../../scripts/lib/aur-s07-entry-geometry-binding.mjs';

const fixture = () => {
  const native = { id: 'guard', templateResRef: 'guard_a', appearanceType: 219, tag: 'GUARD', position: [20, 23, 0] };
  const module = { path: 'C:/proof/example.mod', sha256: 'a'.repeat(64), bytes: 34000 };
  const haks = [{ path: 'C:/proof/example.hak', resref: 'example', sha256: 'b'.repeat(64), bytes: 500 }];
  const geometryProfile = { version: 'aurora-toolset-binary-native-geometry-profile/v2', module, area: { resref: 'example_area' }, entryPoint: { area: 'example_area', position: [21, 20, 0], direction: [1, 0] }, orderedHakList: haks, fixtures: [native] };
  const result = { status: 'verified', basis: 'human_observed_native_paint_walk_admission', witnessAuthority: 'human_reported', proofScope: 'nativePaintWalkAdmission', runtimeClaimed: false, geometryProfile };
  const profile = { module: { ...module, area: 'example_area', entryPoint: [21, 20, 0] }, orderedHakList: structuredClone(haks), fixtures: [{ id: 'impact', templateResRef: 'guard_a', appearanceRow: 219, tag: 'GUARD', position: [20, 23, 0], resref: 'custom_vfx' }] };
  return { result, profile };
};

test('runtime uses the independently validated child MOD, entry and native fixture mapping', () => {
  const { result, profile } = fixture();
  const accepted = assertRuntimeGeometryBinding(profile, result);
  assert.equal(accepted.proofScope, 'nativePaintWalkAdmission');
  assert.equal(accepted.runtimeClaimed, false);
});

test('a verified boolean, legacy evidence or broader/native-agent claim cannot pass binding', () => {
  const { result, profile } = fixture();
  for (const wrong of [{ status: 'verified' }, { ...result, status: 'legacy_unqualified' }, { ...result, runtimeClaimed: true }, { ...result, witnessAuthority: 'authenticated' }, { ...result, geometryProfile: { ...result.geometryProfile, version: 'aurora-toolset-native-geometry-profile/v1' } }]) assert.throws(() => assertRuntimeGeometryBinding(profile, wrong), /runtime_geometry_evidence_unqualified/);
});

test('foreign MOD, old XYZ, wrong area/direction and reordered HAKs fail', () => {
  for (const mutate of [p => p.module.path = 'C:/proof/other.mod', p => p.module.sha256 = 'c'.repeat(64), p => p.module.area = 'other_area', p => p.module.entryPoint = [20, 20, 0], p => p.module.entryDirection = [0, 1], p => p.orderedHakList[0].sha256 = 'c'.repeat(64), p => p.orderedHakList.push({ ...p.orderedHakList[0], resref: 'other' })]) {
    const { result, profile } = fixture(); mutate(profile);
    assert.throws(() => assertRuntimeGeometryBinding(profile, result), /runtime_geometry_(target|hak)_mismatch/);
  }
});

test('native fixture position, appearance, tag and template must match saved evidence', () => {
  for (const mutate of [f => f.position = [0, 0, 0], f => f.appearanceRow = 1, f => f.tag = 'OTHER', f => f.templateResRef = 'other']) {
    const { result, profile } = fixture(); mutate(profile.fixtures[0]);
    assert.throws(() => assertRuntimeGeometryBinding(profile, result), /runtime_geometry_fixture_mismatch/);
  }
});
