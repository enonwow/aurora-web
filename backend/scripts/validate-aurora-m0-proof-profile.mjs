#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, token, index, all) => index % 2 === 0 ? [...pairs, [token.slice(2), all[index + 1]]] : pairs, []));
const profilePath = resolve(args.profile ?? "backend/docs/aurora-reverse/proof-profiles/m0-static-rigid-v5.json");
const mode = args.mode ?? "dry-run";
const profile = JSON.parse(readFileSync(profilePath, "utf8"));
validateProfile(profile);
const proofReadiness = profile.geometryRequirements.currentReadiness.status === "verified" ? "verified" : "failed";
const result = { ok: true, mode, profileId: profile.id, modulePolicy: profile.module.policy, orderedHakList: profile.orderedHakList.map((hak) => hak.resref), fixtures: profile.fixtures.map((fixture) => fixture.id), proofReadiness, geometryBlockerCode: proofReadiness === "verified" ? null : "area_geometry_invalid" };
if (mode === "preflight") {
  for (const input of [profile.module, ...profile.orderedHakList]) {
    if (!existsSync(input.path)) throw new Error(`profile_input_missing:${input.path}`);
    let bytes;
    try { bytes = readFileSync(input.path); } catch (error) { throw new Error(`profile_input_unreadable:${input.path}:${error?.code ?? "unknown"}`); }
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (hash !== input.sha256) throw new Error(`profile_hash_mismatch:${input.path}`);
  }
  result.preflight = "verified";
} else if (mode !== "dry-run") throw new Error(`unsupported_mode:${mode}`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

function validateProfile(profile) {
  if (profile.version !== "aurora-proof-profile/v1" || profile.id !== "m0-static-rigid-v5") throw new Error("invalid_profile_identity");
  if (profile.module?.policy !== "existing_exact" || profile.module.resref !== "m2a_m0_proof" || profile.module.area !== "m2a_m0proof_area") throw new Error("invalid_module_policy");
  if (!/^[a-f0-9]{64}$/u.test(profile.module.sha256)) throw new Error("invalid_module_hash");
  if (JSON.stringify(profile.orderedHakList.map((hak) => hak.resref)) !== JSON.stringify(["znd_tortoise", "m2a_m0_proof"])) throw new Error("invalid_hak_order");
  if (profile.orderedHakList.some((hak) => !/^[a-f0-9]{64}$/u.test(hak.sha256))) throw new Error("invalid_hak_hash");
  const expected = [["tortoise", 15108, 12, 10], ["meshy-m0", 15109, 16, 10]];
  if (JSON.stringify(profile.fixtures.map((fixture) => [fixture.id, fixture.appearanceRow, ...fixture.position])) !== JSON.stringify(expected)) throw new Error("invalid_fixture_contract");
  if (profile.toolsetCapture?.targetClass !== "TScrollBox" || profile.artifacts?.destination !== "caller_required") throw new Error("invalid_capture_or_artifact_contract");
  if (profile.toolsetCapture?.queue !== "backend/docs/aurora-reverse/proof-profiles/m0-static-rigid-v5-toolset-queue.json" || profile.toolsetCapture?.packetValidator !== "backend/scripts/validate-aurora-m0-toolset-packet.mjs") throw new Error("invalid_toolset_route_contract");
  if (profile.toolsetArea?.resref !== profile.module.area || profile.toolsetArea?.nativeTreeDisplayName !== "Meshy2Aurora M0 static runtime proof area") throw new Error("invalid_toolset_area_identity_contract");
  if (profile.geometryRequirements?.gateVersion !== "aurora-m0-native-geometry-gate/v1" || profile.geometryRequirements?.validator !== "backend/scripts/validate-aurora-m0-geometry-gate.mjs") throw new Error("invalid_geometry_gate_contract");
  if (JSON.stringify(profile.geometryRequirements?.entryPoint) !== JSON.stringify({ area: "m2a_m0proof_area", position: [5, 5] })) throw new Error("invalid_entry_point_contract");
  if (JSON.stringify(profile.geometryRequirements?.fixtures) !== JSON.stringify([{ id: "tortoise", position: [12, 10] }, { id: "meshy-m0", position: [16, 10] }])) throw new Error("invalid_fixture_geometry_contract");
  if (!["verified", "area_geometry_invalid", "missing"].includes(profile.geometryRequirements?.currentReadiness?.status)) throw new Error("invalid_geometry_readiness_status");
  if (profile.geometryRequirements.currentReadiness.status === "area_geometry_invalid") {
    const nativeSave = profile.geometryRequirements.currentReadiness.nativeSave;
    if (nativeSave?.areaWasSaved !== false || nativeSave?.invalidLocationsDialog !== true || nativeSave?.inaccessibleObjectsDialog !== true || nativeSave?.statusText !== "Area was NOT saved!!") throw new Error("invalid_known_geometry_failure_evidence");
    if (profile.geometryRequirements.currentReadiness.entryPoint?.accessibleSurface !== "unproven") throw new Error("invalid_known_entry_geometry_evidence");
    if (JSON.stringify(profile.geometryRequirements.currentReadiness.fixtures) !== JSON.stringify([{ id: "tortoise", accessibleSurface: false }, { id: "meshy-m0", accessibleSurface: false }])) throw new Error("invalid_known_fixture_geometry_evidence");
  }
}
