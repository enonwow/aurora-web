import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createEntrySurfaceAcceptanceFixture } from "./entry-surface-acceptance-fixture.mjs";
import { ingestEntrySurface, finalizeEntrySurface, validateGeometryArtifact } from "../../scripts/lib/aurora-binary-entry-surface-workflow.mjs";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const writeJson = (path, data) => writeFileSync(path, JSON.stringify(data, null, 2));
function withFixture(fn, options) {
  const dir = mkdtempSync(join(tmpdir(), "aurora-entry-workflow-"));
  try { return fn(createEntrySurfaceAcceptanceFixture(dir, options)); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

test("binary arm -> simulated human Paint/Save -> ingest -> full finalize preserves source and records exact child delta", () => {
  for (const name of ["fixture_a", "another_b"]) withFixture((f) => {
    assert.equal(f.result.status, "verified");
    assert.equal(f.result.basis, "human_observed_native_paint_walk_admission");
    assert.equal(f.result.witnessAuthority, "human_reported");
    assert.equal(f.result.fileValidatorAuthenticatesHuman, false);
    assert.equal(f.result.runtimeClaimed, false);
    assert.notEqual(f.result.sourceModule.sha256, f.result.targetModule.sha256);
    assert.deepEqual(f.result.geometryProfile.entryPoint.position, [22, 21, 0]);
    assert.equal(JSON.parse(readFileSync(f.manifestPath)).status, "geometry_saved_pending_entry_observation");
    assert.equal(hash(readFileSync(f.manifestPath)), f.request.source.source.manifest.sha256);
    assert.equal(hash(readFileSync(f.request.snapshots.module.path)), f.result.sourceModule.sha256);
    assert.equal(validateGeometryArtifact(f.geometryProfilePath).status, "verified");
    assert.equal(ingestEntrySurface(f.input).idempotentReplay, true);
  }, { name });
});

test("missing actual witness remains pending without writing a receipt or changing source manifest", () => withFixture((f) => {
  const before = hash(readFileSync(f.manifestPath));
  f.handoff.witnessPath = null; writeJson(f.handoffPath, f.handoff);
  assert.equal(ingestEntrySurface(f.input).status, "human_confirmation_pending");
  assert.equal(existsSync(join(f.evidenceDir, "entry-surface-observation.v2.json")), false);
  assert.equal(hash(readFileSync(f.manifestPath)), before);
}, { finalize: false }));

test("genuine-response chronology may precede the host capture while remaining after arm", () => withFixture((f) => {
  f.witness.source.receivedAt = new Date(Date.parse(f.request.createdAt) + 500).toISOString();
  writeJson(f.witnessPath, f.witness);
  assert.equal(ingestEntrySurface(f.input).status, "observation_recorded");
  assert.equal(finalizeEntrySurface({ evidenceDir: f.evidenceDir }).status, "verified");
}, { finalize: false }));

test("agent-authored identity, accessibility boolean, missing user message and wrong capture binding are rejected", () => {
  for (const mutate of [
    (f) => { f.witness.actorKind = "agent"; },
    (f) => { f.witness.accessibleSurface = true; },
    (f) => { f.witness.source.reference = ""; },
    (f) => { f.witness.captureSha256 = "0".repeat(64); },
  ]) withFixture((f) => {
    mutate(f); writeJson(f.witnessPath, f.witness);
    assert.throws(() => ingestEntrySurface(f.input), /ENTRY_/u);
    assert.equal(existsSync(join(f.evidenceDir, "entry-surface-observation.v2.json")), false);
  }, { finalize: false });
});

test("stale capture, expired request, foreign nonce and changed immutable source are rejected", () => {
  for (const mutate of [
    (f) => { f.sidecar.captureStartedAt = "2000-01-01T00:00:00Z"; writeJson(f.sidecarPath, f.sidecar); },
    (f) => { f.input.now = new Date(Date.parse(f.request.expiresAt) + 1).toISOString(); },
    (f) => { f.handoff.requestId = "foreign"; writeJson(f.handoffPath, f.handoff); },
    (f) => { writeFileSync(f.request.snapshots.module.path, "changed source"); },
    (f) => { utimesSync(f.modulePath, new Date(0), new Date(0)); },
  ]) withFixture((f) => { mutate(f); assert.throws(() => ingestEntrySurface(f.input), /ENTRY_/u); }, { finalize: false });
});

test("finalized geometry is revalidated against current MOD/HAK and every immutable evidence hash", () => {
  for (const mutate of [
    (f) => writeFileSync(f.modulePath, "changed installed MOD"),
    (f) => writeFileSync(f.hakPath, "changed HAK"),
    (f) => writeFileSync(join(f.evidenceDir, "entry-capture.png"), "changed PNG"),
    (f) => { const profile = JSON.parse(readFileSync(f.geometryProfilePath)); profile.entryPoint.position = [1, 2, 3]; writeJson(f.geometryProfilePath, profile); },
  ]) withFixture((f) => { mutate(f); assert.throws(() => validateGeometryArtifact(f.geometryProfilePath), /ENTRY_/u); });
});

test("consumed nonce rejects a different handoff, and v1 fake booleans remain legacy unqualified", () => withFixture((f) => {
  f.handoff.witnessPath = join(f.sourceDir, "other-user.json"); writeJson(f.handoffPath, f.handoff);
  assert.throws(() => ingestEntrySurface(f.input), /ENTRY_NONCE_ALREADY_CONSUMED/u);
  const legacy = join(f.sourceDir, "legacy.json");
  writeJson(legacy, { version: "aurora-toolset-binary-native-geometry-profile/v1", entryPoint: { accessibleSurface: true } });
  assert.equal(validateGeometryArtifact(legacy).status, "legacy_unqualified");
}));

test("child Save must bind its measured target, entry, basis and save-time interval", () => {
  for (const mutate of [
    (r) => { delete r.childSave; },
    (r) => { r.childSave.moduleSha256 = "0".repeat(64); },
    (r) => { r.childSave.moduleBytes += 1; },
    (r) => { r.childSave.entry.position = [1, 2, 3]; },
    (r) => { r.childSave.basis = "agent_claim"; },
    (r) => { r.childSave.lastWriteTimeUtc = "2000-01-01T00:00:00Z"; },
    (r) => { r.childSave.lastWriteTimeUtc = "2099-01-01T00:00:00Z"; },
  ]) withFixture((f) => {
    ingestEntrySurface(f.input);
    const path = join(f.evidenceDir, "entry-surface-observation.v2.json");
    const receipt = JSON.parse(readFileSync(path)); mutate(receipt); writeJson(path, receipt);
    assert.throws(() => finalizeEntrySurface({ evidenceDir: f.evidenceDir }), /ENTRY_CHILD_SAVE_READBACK_MISMATCH/u);
  }, { finalize: false });
});
