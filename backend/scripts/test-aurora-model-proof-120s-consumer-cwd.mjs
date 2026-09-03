#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const options = parseArgs(process.argv.slice(2));
const profile = resolve(required(options.profile, "--profile"));
const consumerCwd = resolve(required(options.consumerCwd, "--consumerCwd"));
const coordinator = fileURLToPath(new URL("./aurora-model-proof-120s.mjs", import.meta.url));
const prepare = fileURLToPath(new URL("./prepare-aurora-model-proof-120s.mjs", import.meta.url));

assert.ok(existsSync(profile), `profile_missing:${profile}`);
assert.ok(existsSync(consumerCwd), `consumer_cwd_missing:${consumerCwd}`);
const run = spawnSync(process.execPath, [coordinator, "preflight", "--profile", profile], {
  cwd: consumerCwd,
  encoding: "utf8",
  timeout: 120_000,
  windowsHide: true,
});
assert.equal(run.status, 0, run.stderr || run.stdout);
const packet = JSON.parse(run.stdout);
assert.equal(packet.status, "MODEL_PROOF_120S_PREFLIGHT_VALID");
assert.equal(packet.startsClock, false);
assert.equal(packet.startsToolset, false);
assert.equal(packet.startsNwn, false);
assert.equal(packet.usesGlobalInput, false);
assert.ok(Array.isArray(packet.resources) && packet.resources.length === 3);
assert.ok(Array.isArray(packet.routeIdentities) && packet.routeIdentities.length > 0);

const profileValue = JSON.parse(readFileSync(profile, "utf8"));
const coordinatorDryRun = spawnSync(process.execPath, [coordinator, "dry-run", "--profile", profile], {
  cwd: consumerCwd,
  encoding: "utf8",
  timeout: 120_000,
  windowsHide: true,
});
assert.equal(coordinatorDryRun.status, 0, coordinatorDryRun.stderr || coordinatorDryRun.stdout);
const coordinatorPlan = JSON.parse(coordinatorDryRun.stdout);
assert.ok(coordinatorPlan.publicCommands.includes("cleanup"));
assert.equal(coordinatorPlan.cleanup.outsideLiveBudget, true);
assert.equal(coordinatorPlan.cleanup.requiresDurableBoundEvidence, true);

const prepOutDir = resolve(dirname(profileValue.outputRoot), `.consumer-cwd-prep-${process.pid}-${Date.now()}`);
assert.equal(existsSync(prepOutDir), false, `consumer-CWD prep destination collision:${prepOutDir}`);
const prepDryRun = spawnSync(process.execPath, [prepare, "dry-run", "--profile", profile, "--prepOutDir", prepOutDir], {
  cwd: consumerCwd,
  encoding: "utf8",
  timeout: 120_000,
  windowsHide: true,
});
assert.equal(prepDryRun.status, 0, prepDryRun.stderr || prepDryRun.stdout);
const prepPacket = JSON.parse(prepDryRun.stdout);
assert.equal(prepPacket.status, "aurora_model_proof_120s_prep_planned");
assert.equal(prepPacket.prepOutDir, prepOutDir);
assert.equal(prepPacket.safety.startsToolset, false);
assert.equal(prepPacket.safety.startsNwn, false);
assert.equal(existsSync(prepOutDir), false, "consumer-CWD prepare dry-run created its destination");

const attackRoot = mkdtempSync(resolve(tmpdir(), "aurora-model-proof-120s-consumer-"));
const attackedProfilePath = resolve(attackRoot, "resource-forgery.json");
const attackedProfile = JSON.parse(readFileSync(profile, "utf8"));
attackedProfile.resources.mdl.sha256 = "0".repeat(64);
attackedProfile.outputRoot = resolve(attackRoot, "out");
writeFileSync(attackedProfilePath, `${JSON.stringify(attackedProfile, null, 2)}\n`);
const attacked = spawnSync(process.execPath, [coordinator, "preflight", "--profile", attackedProfilePath], {
  cwd: consumerCwd,
  encoding: "utf8",
  timeout: 120_000,
  windowsHide: true,
});
assert.notEqual(attacked.status, 0, "self-consistent profile resource forgery must fail against exact HAK bytes");
assert.match(`${attacked.stderr}\n${attacked.stdout}`, /ordered_hak_resource_hash_mismatch:mdl/);

const routeAttackProfilePath = resolve(attackRoot, "route-forgery.json");
const routeAttackManifestPath = resolve(attackRoot, "route-manifest-forgery.json");
const routeAttackProfile = JSON.parse(readFileSync(profile, "utf8"));
const routeAttackManifest = JSON.parse(readFileSync(routeAttackProfile.routeManifest.path, "utf8"));
routeAttackManifest.routes[0] = structuredClone(routeAttackManifest.routes[1]);
writeFileSync(routeAttackManifestPath, `${JSON.stringify(routeAttackManifest, null, 2)}\n`);
routeAttackProfile.routeManifest = {
  path: routeAttackManifestPath,
  sha256: createHash("sha256").update(readFileSync(routeAttackManifestPath)).digest("hex"),
};
routeAttackProfile.outputRoot = resolve(attackRoot, "route-out");
writeFileSync(routeAttackProfilePath, `${JSON.stringify(routeAttackProfile, null, 2)}\n`);
const routeAttack = spawnSync(process.execPath, [coordinator, "preflight", "--profile", routeAttackProfilePath], {
  cwd: consumerCwd,
  encoding: "utf8",
  timeout: 120_000,
  windowsHide: true,
});
assert.notEqual(routeAttack.status, 0, "self-consistent route-manifest substitution must fail against the exact route allowlist");
assert.match(`${routeAttack.stderr}\n${routeAttack.stdout}`, /route_manifest_identity_set_mismatch/);

console.log(JSON.stringify({ ok: true, status: "aurora_model_proof_120s_consumer_cwd_valid", profile, consumerCwd }));

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`Expected --name <value> near ${key ?? "end"}.`);
    result[key.slice(2)] = value;
  }
  return result;
}
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
