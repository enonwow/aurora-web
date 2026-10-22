import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import {
  buildEntryReopenBinaryProfile,
  buildEntryReopenPrepContext,
} from "../../scripts/lib/aurora-binary-entry-reopen-prep-context.mjs";

const hash = (character) => character.repeat(64);
const identity = (name, character, bytes) => ({ path: resolve("isolated-reopen-source", name), sha256: hash(character), bytes });
function fixture(resref = "sample_a") {
  const module = { ...identity(`${resref}.mod`, "a", 33700), resref };
  const haks = ["first_hak", "second_hak"].map((name, index) => ({ ...identity(`${name}.hak`, String(index + 1), 100 + index), resref: name }));
  const source = {
    version: "aurora-binary-entry-surface-source/v2", status: "native_entry_observation_missing",
    source: { kind: "binary_native_geometry_post_save", manifest: identity("manifest.json", "b", 1000),
      profile: identity("profile.json", "c", 1000), postSaveProfile: identity("post-save.json", "d", 1000) },
    target: { module, orderedHakList: haks, area: "test_area", entry: { position: [20, 20, 0], direction: [0, 1] } },
    semanticVerdict: "not_evaluated", proofClaimed: false, runtimeClaimed: false,
  };
  const postSaveProfile = {
    version: "aurora-toolset-binary-module-bootstrap-profile/v1", id: `original-${resref}`,
    module: { ...module, bytes: 20091 }, area: { resref: "test_area", displayName: "Saved Area", width: 4, height: 4, tileSet: "ttd01" },
    entryPoint: { area: "test_area", ...structuredClone(source.target.entry) }, orderedHakList: structuredClone(haks),
    fixtures: [{ id: "some-fixture", templateResRef: "some_guard", appearanceType: 42, position: [21, 22, 0] }],
    noLocalToolsetAdapter: true, installed: true,
  };
  const rootDir = resolve("isolated-reopen-output", resref);
  return { source, postSaveProfile, rootDir, profilePath: resolve(rootDir, "binary-profile.json"), profileSha256: hash("e") };
}

test("measured saved bytes produce a separate binary profile; historical input remains unchanged", () => {
  const input = fixture(); const before = structuredClone(input);
  const result = buildEntryReopenBinaryProfile(input);
  const expected = structuredClone(input.postSaveProfile); expected.module.bytes = 33700;
  assert.deepEqual(result, expected);
  assert.deepEqual(input, before);
  result.fixtures[0].position[0] = 99;
  assert.equal(input.postSaveProfile.fixtures[0].position[0], 21);
});

test("generic prep context binds saved MOD, ordered HAKs, original Area and source lineage without proof claims", () => {
  for (const name of ["sample_a", "unrelated_b"]) {
    const input = fixture(name); const before = structuredClone(input);
    const result = buildEntryReopenPrepContext(input);
    assert.equal(result.prepProfile.version, "aurora-entry-reopen-prep-profile/v1");
    assert.deepEqual(result.prepProfile.binaryProfile, { path: input.profilePath, sha256: input.profileSha256 });
    assert.deepEqual(result.prepProfile.installedModule, { path: input.source.target.module.path, sha256: hash("a"), byteLength: 33700 });
    assert.deepEqual(result.prepProfile.orderedHakList.map((hak) => [hak.resref, hak.byteLength]), [["first_hak", 100], ["second_hak", 101]]);
    assert.equal(result.prepProfile.area.displayName, "Saved Area");
    assert.deepEqual(result.prepProfile.area.entryPoint, [20, 20, 0]);
    assert.deepEqual(result.prepProfile.source, input.source.source);
    assert.equal(result.prepProfile.outputRoot, resolve(input.rootDir, "live", "proof"));
    assert.equal(result.prepProfile.policy.coldOnly, true);
    assert.equal(result.prepProfile.nativePaintVerified, false);
    assert.equal(result.prepProfile.proofClaimed, false);
    assert.equal(result.prepProfile.runtimeClaimed, false);
    assert.equal(result.prepProfile.runtimeProfile, undefined);
    assert.equal(result.prepProfile.geometryGate, undefined);
    assert.deepEqual(result.target, { moduleResref: name, moduleName: `${name}.mod`, installedModulePath: input.source.target.module.path, areaResref: "test_area" });
    assert.deepEqual(input, before);
    result.prepProfile.source.manifest.sha256 = hash("f");
    assert.equal(input.source.source.manifest.sha256, hash("b"));
  }
});

test("correct measured metadata remains unchanged", () => {
  const input = fixture(); input.postSaveProfile.module.bytes = 33700;
  assert.deepEqual(buildEntryReopenBinaryProfile(input), input.postSaveProfile);
});

test("rejects unknown source state or a claimed native verdict", () => {
  for (const mutate of [
    (x) => { x.source.version = "unknown"; },
    (x) => { x.source.status = "verified"; },
    (x) => { x.source.proofClaimed = true; },
    (x) => { x.source.runtimeClaimed = true; },
    (x) => { x.source.semanticVerdict = "verified"; },
    (x) => { delete x.source.source.manifest; },
  ]) { const input = fixture(); mutate(input); assert.throws(() => buildEntryReopenPrepContext(input), { code: "ENTRY_REOPEN_SOURCE_INVALID" }); }
});

test("rejects source-to-post-save MOD, Area or entry tuple mismatch", () => {
  for (const mutate of [
    (x) => { x.postSaveProfile.version = "unknown"; },
    (x) => { x.postSaveProfile.module.sha256 = hash("f"); },
    (x) => { x.postSaveProfile.module.path = resolve("other.mod"); },
    (x) => { x.postSaveProfile.module.resref = "different"; },
    (x) => { x.postSaveProfile.area.resref = "other_area"; },
    (x) => { x.postSaveProfile.area.displayName = ""; },
    (x) => { x.postSaveProfile.entryPoint.position[2] = 1; },
    (x) => { x.postSaveProfile.entryPoint.direction[1] = -1; },
  ]) { const input = fixture(); mutate(input); assert.throws(() => buildEntryReopenPrepContext(input), { code: "ENTRY_REOPEN_POST_SAVE_BINDING_INVALID" }); }
});

test("rejects changed or reordered HAK dependencies", () => {
  for (const mutate of [
    (x) => { x.postSaveProfile.orderedHakList.reverse(); },
    (x) => { x.postSaveProfile.orderedHakList[0].sha256 = hash("f"); },
    (x) => { x.postSaveProfile.orderedHakList[0].path = resolve("other.hak"); },
    (x) => { x.postSaveProfile.orderedHakList[0].bytes += 1; },
    (x) => { x.postSaveProfile.orderedHakList.pop(); },
    (x) => { x.source.target.orderedHakList.push(structuredClone(x.source.target.orderedHakList[0])); },
  ]) { const input = fixture(); mutate(input); assert.throws(() => buildEntryReopenPrepContext(input), { code: "ENTRY_REOPEN_HAK_BINDING_INVALID" }); }
});

test("rejects malformed measured identity and resource name", () => {
  for (const mutate of [
    (x) => { x.source.target.module.bytes = -1; },
    (x) => { x.source.target.module.sha256 = "bad"; },
    (x) => { x.source.target.module.path = "relative.mod"; },
    (x) => { x.source.target.module.resref = "../different"; },
  ]) { const input = fixture(); mutate(input); assert.throws(() => buildEntryReopenPrepContext(input), { code: "ENTRY_REOPEN_SOURCE_INVALID" }); }
});

test("requires generated binary profile within exact new root and a SHA256 identity", () => {
  for (const mutate of [
    (x) => { x.profilePath = resolve(x.rootDir, "elsewhere", "binary-profile.json"); },
    (x) => { x.profilePath = x.source.source.postSaveProfile.path; },
    (x) => { x.profilePath = "binary-profile.json"; },
    (x) => { x.rootDir = "relative"; },
    (x) => { x.profileSha256 = "not-a-hash"; },
  ]) { const input = fixture(); mutate(input); assert.throws(() => buildEntryReopenPrepContext(input), { code: "ENTRY_REOPEN_OUTPUT_IDENTITY_INVALID" }); }
});
