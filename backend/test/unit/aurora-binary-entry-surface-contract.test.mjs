import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fixtureCapture, fixtureModule } from "./entry-surface-fixture.mjs";
import {
  validateBinaryEntrySurfaceSource,
  validateEntrySurfaceCapture,
  validateEntrySurfaceTransition,
  readEntrySurfaceModuleBytes,
  validatePaintModuleDelta,
} from "../../scripts/lib/aurora-binary-entry-surface-contract.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const h = (character) => character.repeat(64);
const path = (name) => resolve("isolated-entry-surface-fixture", name);
const identity = (name, sha256, bytes) => ({ path: path(name), sha256, bytes });
const clone = (value) => structuredClone(value);

function fixture(name = "fixture_a") {
  const profile = {
    version: "aurora-toolset-binary-module-bootstrap-profile/v1", id: name,
    module: { ...identity(`${name}.mod`, h("a"), 100), resref: name },
    area: { resref: "entry_area", width: 4, height: 4, displayName: "Test", tileSet: "ttd01" },
    entryPoint: { area: "entry_area", position: [20, 20, 0], direction: [0, 1] },
    fixtures: [{ id: "arbitrary_creature", templateResRef: "guard", appearanceType: 219, position: [20, 23, 0], tag: "GUARD" }],
    orderedHakList: [{ ...identity("arbitrary.hak", h("c"), 128), resref: "arbitrary" }],
  };
  const postSaveProfile = clone(profile);
  postSaveProfile.module.sha256 = h("b");
  // Reproduces the legacy producer's declared byte count, without changing it.
  const identities = {
    profile: identity("profile.json", h("d"), 123),
    postSaveProfile: identity("post-save.json", h("e"), 124),
    manifest: identity("binary-native-geometry-manifest.json", h("f"), 1024),
    module: identity(`${name}.mod`, h("b"), 200),
    haks: [identity("arbitrary.hak", h("c"), 128)],
  };
  const entry = { modulePath: profile.module.path, moduleSha256: h("b"), area: "entry_area", position: [20, 20, 0], direction: [0, 1] };
  const creatures = [{ templateResRef: "guard", tag: "GUARD", appearanceType: 219, position: [20, 23, 0] }];
  const packed = {
    moduleSha256: h("b"), moduleBytes: 200, area: "entry_area",
    entry: { position: entry.position, direction: entry.direction },
    orderedHakResrefs: ["arbitrary"],
    areaDetails: { width: 4, height: 4, tileSet: "ttd01", tileCount: 16 },
    git: { sha256: h("1"), creatures, placeables: [] },
  };
  const manifest = {
    version: "aurora-toolset-binary-native-geometry-manifest/v1",
    status: "geometry_saved_pending_entry_observation", profileKind: "model-fixture-geometry",
    profileId: name, profilePath: identities.profile.path, profileSha256: identities.profile.sha256,
    artifactDir: path(""), module: clone(profile.module), area: clone(profile.area),
    postSaveProfilePath: identities.postSaveProfile.path,
    postSaveStructural: { ok: true, status: "binary_bootstrap_structural_readback_valid", module: clone(postSaveProfile.module) },
    open: { process: { Id: 1234, StartTime: "/Date(1788652146824)/" } },
    nativeSave: {
      areaWasSaved: true, invalidLocationsDialog: false, inaccessibleObjectsDialog: false, statusText: "Area was saved",
      save: { ok: true, processId: 1234, frameHwnd: 5678, modulePath: profile.module.path, before: { bytes: 100 }, after: { bytes: 200, sha256: null } },
    },
    nativeEntryReadback: entry,
    nativeGitReadback: { modulePath: profile.module.path, moduleSha256: h("b"), area: "entry_area", gitSha256: h("1"), creatures, placeables: [] },
  };
  return { profile, postSaveProfile, manifest, identities, packed };
}

test("source inspection preserves legacy source bytes and reports measured metadata without accessibility", () => {
  for (const name of ["fixture_a", "different_b"]) {
    const input = fixture(name);
    const before = clone(input);
    const result = validateBinaryEntrySurfaceSource(input);
    assert.equal(result.status, "native_entry_observation_missing");
    assert.equal(result.target.module.bytes, 200);
    assert.equal(result.target.module.sha256, h("b"));
    assert.equal(result.owner.startedAt, "2026-09-05T23:49:06.824Z");
    assert.equal(result.owner.livenessVerified, false);
    assert.equal(result.diagnostics[0].code, "LEGACY_POST_SAVE_BYTES_STALE");
    assert.equal(result.accessibleSurface, undefined);
    assert.equal(result.runtimeClaimed, false);
    assert.deepEqual(input, before);
  }
});

test("updated producer metadata passes without legacy diagnostic", () => {
  const input = fixture();
  input.postSaveProfile.module.bytes = 200;
  input.manifest.postSaveStructural.module.bytes = 200;
  assert.deepEqual(validateBinaryEntrySurfaceSource(input).diagnostics, []);
});

test("source rejects changed manifest/profile identities, post-save drift, and unrelated metadata mismatch", () => {
  const mutations = [
    (x) => { x.manifest.profileSha256 = h("0"); },
    (x) => { x.manifest.profilePath = path("foreign.json"); },
    (x) => { x.manifest.status = "geometry_verified"; },
    (x) => { x.postSaveProfile.fixtures[0].appearanceType = 220; },
    (x) => { x.identities.module.sha256 = h("9"); },
    (x) => { x.postSaveProfile.module.bytes = 199; },
    (x) => { x.manifest.nativeSave.save.after.bytes = 199; },
    (x) => { x.manifest.nativeSave.save.processId = 9999; },
    (x) => { x.manifest.nativeSave.areaWasSaved = false; },
  ];
  for (const mutate of mutations) {
    const input = fixture(); mutate(input);
    assert.throws(() => validateBinaryEntrySurfaceSource(input), /ENTRY_/u);
  }
});

test("source rejects foreign HAK order/hash, entry/direction, GIT bytes and fixture mismatch", () => {
  const mutations = [
    (x) => { x.packed.orderedHakResrefs = ["another"]; },
    (x) => { x.identities.haks[0].sha256 = h("0"); },
    (x) => { x.packed.entry.position = [21, 20, 0]; },
    (x) => { x.packed.entry.direction = [1, 0]; },
    (x) => { x.packed.git.sha256 = h("0"); },
    (x) => { x.packed.git.creatures = []; },
    (x) => { x.packed.areaDetails.tileCount = 15; },
  ];
  for (const mutate of mutations) {
    const input = fixture(); mutate(input);
    assert.throws(() => validateBinaryEntrySurfaceSource(input), /ENTRY_/u);
  }
});

test("transition permits a changed post-action MOD hash with explicit immutable source lineage only", () => {
  const source = validateBinaryEntrySurfaceSource(fixture());
  const after = clone(source.target);
  after.module.sha256 = h("8"); after.module.bytes = 210;
  const result = validateEntrySurfaceTransition({ source, after, parentSourceSha256: source.source.manifest.sha256 });
  assert.equal(result.status, "native_action_receipt_missing");
  assert.equal(result.sourceModuleSha256, h("b"));
  assert.equal(result.targetModuleSha256, h("8"));
  assert.equal(result.accessibleSurface, undefined);
  assert.throws(() => validateEntrySurfaceTransition({ source, after, parentSourceSha256: h("9") }), /ENTRY_LINEAGE/u);
  after.orderedHakList[0].sha256 = h("9");
  assert.throws(() => validateEntrySurfaceTransition({ source, after, parentSourceSha256: source.source.manifest.sha256 }), /ENTRY_HAK/u);
});

test("unqualified entry delta or positive caller receipt cannot become a semantic verdict", () => {
  const source = validateBinaryEntrySurfaceSource(fixture());
  const after = clone(source.target); after.entry.position = [1, 2, 0];
  assert.throws(() => validateEntrySurfaceTransition({ source, after, parentSourceSha256: source.source.manifest.sha256 }), /ENTRY_TUPLE/u);
  after.entry = clone(source.target.entry);
  const result = validateEntrySurfaceTransition({ source, after, parentSourceSha256: source.source.manifest.sha256, actionReceipt: { accessibleSurface: true, actor: "human" } });
  assert.equal(result.status, "native_action_receipt_unqualified");
  assert.equal(result.accessibleSurface, undefined);
});

function captureFixture() {
  const target = validateBinaryEntrySurfaceSource(fixture()).target;
  const owner = { pid: 1234, startedAt: "2026-09-05T23:49:06.824Z", frameHwnd: 5678 };
  const { png, sidecar } = fixtureCapture({ binding: { requestId: "test-request", notBefore: "2026-09-06T10:00:00.000Z", owner, target }, pngPath: path("capture.png"), capturedAt: "2026-09-06T10:00:01.000Z" });
  return { sidecar, pngBytes: png, pngPath: path("capture.png"), target, owner, requestId: "test-request", notBefore: "2026-09-06T10:00:00.000Z", now: "2026-09-06T10:00:02.000Z", expiresAt: "2026-09-06T10:02:00.000Z" };
}

test("capture identity validation returns integrity-only, never native accessibility", () => {
  const result = validateEntrySurfaceCapture(captureFixture());
  assert.equal(result.status, "capture_binding_valid");
  assert.equal(result.semanticVerdict, "not_evaluated");
});

test("capture rejects arbitrary text, wrong owner/target/request, stale/foreign and failed viewport evidence", () => {
  const mutations = [
    (x) => { x.pngBytes = Buffer.from("not PNG"); x.sidecar.png.sha256 = hash(x.pngBytes); x.sidecar.png.bytes = x.pngBytes.length; },
    (x) => { x.sidecar.requestBinding.requestId = "foreign"; },
    (x) => { x.sidecar.owner.pid = 999; },
    (x) => { x.sidecar.owner.startedAt = "2000-01-01T00:00:00Z"; },
    (x) => { x.sidecar.requestBinding.target.module.sha256 = h("0"); },
    (x) => { x.sidecar.capturedAt = "2026-09-06T09:59:59Z"; },
    (x) => { x.sidecar.capturedAt = "2026-09-06T10:00:03Z"; },
    (x) => { x.sidecar.safety.moduleScreenPrimary = true; },
    (x) => { x.sidecar.safety.method = "physical-pixel capture"; x.sidecar.safety.windowFromPointVerified = false; },
    (x) => { x.sidecar.png.width = 2; },
  ];
  for (const mutate of mutations) {
    const input = captureFixture();
    // Preserve independently supplied binding rather than shared fixture aliases.
    input.target = clone(input.target); input.owner = clone(input.owner);
    mutate(input);
    assert.throws(() => validateEntrySurfaceCapture(input), /ENTRY_CAPTURE/u);
  }
});

test("packed reader rejects malformed MOD without executing helper processes", () => {
  assert.throws(() => readEntrySurfaceModuleBytes(Buffer.from("invalid"), "entry_area"), /erf_header_truncated/u);
});

test("native Paint delta permits only explicit IFO entry changes and identical other resources", () => {
  const before = fixtureModule().bytes;
  const changed = fixtureModule([22, 21, 0]).bytes;
  const result = validatePaintModuleDelta(before, changed, "entry_area");
  assert.deepEqual(result.entryDelta.after.position, [22, 21, 0]);
  assert.equal(result.entryDelta.changed, true);
  assert.throws(() => validatePaintModuleDelta(before, fixtureModule([22, 21, 0], { unrelatedIfo: "changed" }).bytes, "entry_area"), /ENTRY_UNRELATED_IFO_CHANGE/u);
  assert.throws(() => validatePaintModuleDelta(before, fixtureModule([22, 21, 0], { appearance: 220 }).bytes, "entry_area"), /ENTRY_UNRELATED_RESOURCE_CHANGE/u);
});
