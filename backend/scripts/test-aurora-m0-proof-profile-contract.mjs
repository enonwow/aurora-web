#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";

const profilePath = resolve("backend/docs/aurora-reverse/proof-profiles/m0-static-rigid-v5.json");
const geometryValidator = resolve("backend/scripts/validate-aurora-m0-geometry-gate.mjs");
const profile = JSON.parse(readFileSync(profilePath, "utf8"));
assert.equal(profile.version, "aurora-proof-profile/v1");
assert.equal(profile.module.policy, "existing_exact");
assert.deepEqual(profile.orderedHakList.map((hak) => hak.resref), ["znd_tortoise", "m2a_m0_proof"]);
assert.deepEqual(profile.fixtures.map((fixture) => [fixture.id, fixture.appearanceRow, fixture.position]), [["tortoise", 15108, [12, 10]], ["meshy-m0", 15109, [16, 10]]]);
const profileDryRun = JSON.parse(execFileSync(process.execPath, [resolve("backend/scripts/validate-aurora-m0-proof-profile.mjs"), "--mode", "dry-run"], { encoding: "utf8" }));
assert.equal(profileDryRun.ok, true);
assert.equal(profileDryRun.proofReadiness, "failed");
assert.equal(profileDryRun.geometryBlockerCode, "area_geometry_invalid");
const dir = mkdtempSync(join(tmpdir(), "aurora-runtime-ingestion-"));
try {
  const capture = join(dir, "runtime.png"); const log = join(dir, "nwn.log"); writeFileSync(capture, "capture"); writeFileSync(log, "load m2a_m0_proof");
  const hash = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
  const packet = { version: "aurora-runtime-capture-ingestion/v1", submittedBy: "user", profileId: profile.id, moduleSha256: profile.module.sha256, area: profile.module.area, fixtures: profile.fixtures.map((fixture) => ({ id: fixture.id, resref: fixture.resref, appearanceRow: fixture.appearanceRow, position: fixture.position })), artifacts: [{ kind: "runtime-capture", path: capture, sha256: hash(capture) }, { kind: "engine-load-log", path: log, sha256: hash(log) }] };
  const packetPath = join(dir, "packet.json"); writeFileSync(packetPath, JSON.stringify(packet));
  assert.equal(JSON.parse(execFileSync(process.execPath, [resolve("backend/scripts/validate-aurora-runtime-capture-ingestion.mjs"), "--packet", packetPath], { encoding: "utf8" })).status, "verified");
  const syntacticallyValidButRejected = {
    version: "aurora-m0-native-geometry-gate/v1",
    profileId: profile.id,
    moduleSha256: profile.module.sha256,
    area: profile.module.area,
    syntacticReadback: { width: 8, height: 8, tileCount: 64, tileId: 94, fixturePositions: profile.fixtures.map((fixture) => ({ id: fixture.id, position: fixture.position })) },
    nativeSave: { areaWasSaved: false, invalidLocationsDialog: true, inaccessibleObjectsDialog: true, statusText: "Area was NOT saved!!" },
    entryPoint: { area: profile.module.area, position: [5, 5], accessibleSurface: false },
    fixtures: profile.fixtures.map((fixture) => ({ id: fixture.id, position: fixture.position, accessibleSurface: false })),
  };
  const geometryPath = join(dir, "geometry-gate.json"); writeFileSync(geometryPath, JSON.stringify(syntacticallyValidButRejected));
  const geometry = JSON.parse(execFileSync(process.execPath, [geometryValidator, "--gate", geometryPath], { encoding: "utf8" }));
  assert.equal(geometry.status, "failed");
  assert.equal(geometry.blockerCode, "area_geometry_invalid");
} finally { rmSync(dir, { recursive: true, force: true }); }
