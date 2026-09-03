#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  inspectCanonicalPublishedAcceptanceV1,
  loadCanonicalPublishedAcceptanceV1,
  validateRuntimeCaptureLeaseSchema,
} from "./lib/aurora-model-proof-120s-published-acceptance.mjs";
import { MODEL_PROOF_VERSION, createClock } from "./lib/aurora-model-proof-120s-contract.mjs";

const realProfilePath = "C:\\Projects\\meshy2aurora\\proof-profiles\\m0-r31-hierarchy-only-model-proof-120s-run3-v1.json";
assert.throws(() => loadCanonicalPublishedAcceptanceV1(realProfilePath), /published_acceptance_trust_root_required/);
const inspected = inspectCanonicalPublishedAcceptanceV1(realProfilePath);
assert.equal(inspected.admissibility.status, "inspection_only_untrusted");
assert.equal(inspected.admissibility.admissible, false);
const real = loadCanonicalPublishedAcceptanceV1({
  profilePath: realProfilePath,
  trustRootId: "meshy2aurora-r31-run3-published-acceptance-v1",
});
assert.equal(real.profileSha256, "17c2bf806c27ff7de5973fdeb63a448c553a66db59baddc8f8feceab647a2f80");
assert.equal(real.acceptance.sha256, "de8d235224b14033b3c2b9583f8987c34cba82c08ea6e76a207ca0a37dbd620e");
assert.equal(real.clock.sha256, "7493745e9fcfb83f4c83f95269fc4a8cd8fc207dd7ef028b039cf5559b98ab85");
assert.equal(real.publishCounter, "4075685036955");
assert.equal(real.runtime.capture.sha256, "5dde10c72a8aacc26c528fab1e581f08b4445bd6fc863a639d4ff53b14d30df0");
assert.equal(real.runtime.capture.path, "C:\\Projects\\meshy2aurora\\proof-output\\m0-r31-hierarchy-only-20260722\\live\\model-proof-120s-run-3\\runtime\\capture.png");
assert.equal(real.runtime.packet.sha256, "d0660264a3881e165763fcf205f37bf687eefe7214c504e3cbc39c20c72a658c");
assert.equal(real.routeManifest.sha256, "96083471cc35679ceaea8009c55bf865b972ba21bb3bc5de02f4b93c7a561560");

const run6ProfilePath = "C:\\Projects\\meshy2aurora\\proof-profiles\\m0-r31-hierarchy-only-model-proof-120s-run6-v1.json";
const run6 = inspectCanonicalPublishedAcceptanceV1(run6ProfilePath);
assert.equal(run6.admissibility.status, "inspection_only_untrusted");
assert.equal(run6.runtime.capture.sha256, "cc6ef29c0464c487ffd592def609e336e6801ff9cc04919bb3538299446f0a93");
const run6RuntimeRoot = "C:\\Projects\\meshy2aurora\\proof-output\\m0-r31-hierarchy-only-20260722\\live\\model-proof-120s-run-6\\runtime";
const run6Packet = JSON.parse(readFileSync(join(run6RuntimeRoot, "packet.json"), "utf8"));
const run6CaptureMetadata = JSON.parse(readFileSync(join(run6RuntimeRoot, "capture.json"), "utf8"));
assert.deepEqual(validateRuntimeCaptureLeaseSchema(run6Packet, run6CaptureMetadata), {
  schema: "current_scoped_zorder_lease",
  leaseRequired: false,
  leaseLifted: false,
  zOrderMutationCount: 0,
});
const liftedPacket = structuredClone(run6Packet);
const liftedCaptureMetadata = structuredClone(run6CaptureMetadata);
const liftedLease = liftedCaptureMetadata.zOrderLease;
liftedLease.required = true;
liftedLease.lifted = true;
liftedLease.initialProbeOwners = [7777, 7777, 7777];
liftedLease.zOrderMutationCount = 2;
liftedLease.originalPredecessor = { hwnd: 8080, pid: 7777 };
liftedLease.restore = {
  ...liftedLease.restore,
  required: true,
  attempted: true,
  succeeded: true,
  predecessorHwndAfter: 8080,
  predecessorPidAfter: 7777,
};
liftedCaptureMetadata.safety.temporaryZOrderLease = true;
liftedPacket.windowSurfaceLease = structuredClone(liftedLease);
liftedPacket.safety.changesZOrder = true;
liftedPacket.safety.temporaryZOrderLease = true;
assert.deepEqual(validateRuntimeCaptureLeaseSchema(liftedPacket, liftedCaptureMetadata), {
  schema: "current_scoped_zorder_lease",
  leaseRequired: true,
  leaseLifted: true,
  zOrderMutationCount: 2,
});

const run3RuntimeRoot = "C:\\Projects\\meshy2aurora\\proof-output\\m0-r31-hierarchy-only-20260722\\live\\model-proof-120s-run-3\\runtime";
const run3Packet = JSON.parse(readFileSync(join(run3RuntimeRoot, "packet.json"), "utf8"));
const run3CaptureMetadata = JSON.parse(readFileSync(join(run3RuntimeRoot, "capture.json"), "utf8"));
assert.deepEqual(validateRuntimeCaptureLeaseSchema(run3Packet, run3CaptureMetadata), {
  schema: "legacy_no_lease",
  leaseRequired: false,
  leaseLifted: false,
  zOrderMutationCount: 0,
});

for (const [expected, mutate] of [
  [/published_runtime_capture_lease_restore_missing/, (packet, capture) => { delete capture.zOrderLease.restore; packet.windowSurfaceLease = structuredClone(capture.zOrderLease); }],
  [/published_runtime_capture_lease_mutation_count_invalid/, (packet, capture) => { capture.zOrderLease.zOrderMutationCount = 3; packet.windowSurfaceLease = structuredClone(capture.zOrderLease); }],
  [/published_runtime_capture_lease_topmost_invalid/, (packet, capture) => { capture.zOrderLease.lift.usesTopmost = true; packet.windowSurfaceLease = structuredClone(capture.zOrderLease); }],
  [/published_runtime_capture_lease_activation_invalid/, (packet, capture) => { capture.zOrderLease.lift.activatesWindow = true; packet.windowSurfaceLease = structuredClone(capture.zOrderLease); }],
  [/published_runtime_capture_lease_packet_mismatch/, (packet) => { packet.windowSurfaceLease.zOrderMutationCount = 0; }],
]) {
  const attackedPacket = structuredClone(liftedPacket);
  const attackedCapture = structuredClone(liftedCaptureMetadata);
  mutate(attackedPacket, attackedCapture);
  assert.throws(() => validateRuntimeCaptureLeaseSchema(attackedPacket, attackedCapture), expected);
}

const forged = createSelfConsistentEnvelopeWithoutCanonicalRunGraph();
assert.throws(
  () => loadCanonicalPublishedAcceptanceV1(forged.profilePath),
  /published_acceptance_trust_root_required/,
  "even a self-consistent graph must not enter admission without a code-owned trust root",
);
assert.throws(
  () => loadCanonicalPublishedAcceptanceV1({ profilePath: forged.profilePath, trustRootId: "meshy2aurora-r31-run3-published-acceptance-v1" }),
  /published_trust_root_profile_hash_mismatch/,
);
assert.throws(
  () => loadCanonicalPublishedAcceptanceV1({ profilePath: realProfilePath, trustRootId: "central-tri-control-erf-gff-contract-fixture-v1" }),
  /published_acceptance_trust_root_unknown:central-tri-control-erf-gff-contract-fixture-v1/,
  "the synthetic ERF/GFF contract fixture must never be production-selectable",
);
assert.equal(
  readFileSync(new URL("./lib/aurora-model-proof-120s-published-acceptance.mjs", import.meta.url), "utf8").includes("central-tri-control-erf-gff-contract-fixture-v1"),
  false,
  "the production acceptance module must not contain the synthetic trust-root identifier",
);

console.log(JSON.stringify({ ok: true, status: "aurora_model_proof_120s_published_acceptance_contract_valid" }));

function createSelfConsistentEnvelopeWithoutCanonicalRunGraph() {
  const root = mkdtempSync(join(tmpdir(), "model-proof-forged-envelope-"));
  const outputRoot = join(root, "run");
  mkdirSync(outputRoot);
  const profilePath = join(root, "profile.json");
  const clockPath = join(outputRoot, "run-clock.json");
  const finalPath = join(outputRoot, "final-model-proof.json");
  const acceptancePath = join(outputRoot, "final-model-proof.accepted-at-100000.json");
  const artifact = (name, digit, length) => ({ path: join(root, name), sha256: digit.repeat(64), ...(length == null ? {} : { byteLength: length }) });
  const profile = {
    version: MODEL_PROOF_VERSION,
    id: "self-consistent-forged-envelope",
    hardLimitMs: 120_000,
    binaryProfile: artifact("binary.json", "1"),
    toolsetProfile: artifact("toolset.json", "2"),
    runtimeProfile: artifact("runtime.json", "3"),
    routeManifest: artifact("route.json", "4"),
    installedModule: artifact("forged.mod", "5", 1),
    orderedHakList: [{ resref: "forged", ...artifact("forged.hak", "6", 1) }],
    resources: {
      mdl: { resref: "forged_mdl", sha256: "7".repeat(64) },
      tga: { resref: "forged_tga", sha256: "8".repeat(64) },
      appearance2da: { resref: "appearance", row: 1, sha256: "9".repeat(64) },
    },
    area: { resref: "forged_area", displayName: "Forged", entryPoint: [0, 0, 0] },
    fixture: { id: "forged", templateResRef: "forged", treeObjectText: "Forged", occurrence: 0, appearanceRow: 1, position: [0, 0, 0] },
    runtime: { loadingModuleResref: "forged", engineLogPath: join(root, "log.txt") },
    entryMode: "adopt-exact-clean",
    outputRoot,
    policy: { noSave: true, noBuild: true, noRepack: true, noFocus: true, noCamera: true, noRetry: true },
  };
  writeJson(profilePath, profile);
  const profileSha256 = sha256(readFileSync(profilePath));
  const clock = createClock({ counter: 10_000n, frequency: 1_000n });
  writeJson(clockPath, clock);
  const finalPacket = {
    version: "aurora-model-proof-120s-final/v1",
    status: "pending_qpc_acceptance",
    slo: { hardLimitMs: 120_000, elapsedMs: 89_000, remainingMs: 31_000, expired: false },
    profile: { id: profile.id, path: profilePath, sha256: profileSha256 },
    candidate: { module: profile.installedModule, orderedHakList: profile.orderedHakList, resources: profile.resources, area: profile.area, fixture: profile.fixture },
    toolset: { verdict: { environment: "toolset", captureSha256: "a".repeat(64), modelVisibility: "visible", proofCompleteness: "verified", inspection: "forged" } },
    runtime: { verdict: { environment: "runtime", captureSha256: "b".repeat(64), modelVisibility: "not_visible", proofCompleteness: "verified", inspection: "forged" } },
  };
  writeJson(finalPath, finalPacket);
  writeJson(acceptancePath, {
    version: "aurora-model-proof-120s-acceptance/v1",
    status: "verified_if_published_filename_counter_is_within_deadline",
    profileId: profile.id,
    profileSha256,
    finalPacket: identity(finalPath),
    clock: {
      source: clock.source,
      frequency: clock.frequency,
      startCounter: clock.startCounter,
      deadlineCounter: clock.deadlineCounter,
      hardLimitMs: clock.hardLimitMs,
    },
  });
  return { profilePath };
}

function identity(path) {
  const bytes = readFileSync(path);
  return { path, sha256: sha256(bytes), byteLength: bytes.length };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}
