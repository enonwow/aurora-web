#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const profile = readJson(resolve(options.profile ?? "backend/docs/aurora-reverse/proof-profiles/m0-static-rigid-v5.json"));
const gate = readJson(requiredPath(options.gate, "--gate"));
const failures = [];

check(gate.version === "aurora-m0-native-geometry-gate/v1", "geometry_gate_identity_invalid");
check(gate.profileId === profile.id, "geometry_gate_profile_mismatch");
check(gate.moduleSha256 === profile.module.sha256, "geometry_gate_module_hash_mismatch");
check(gate.area === profile.module.area, "geometry_gate_area_mismatch");
check(gate.syntacticReadback?.width === 8 && gate.syntacticReadback?.height === 8 && gate.syntacticReadback?.tileCount === 64 && gate.syntacticReadback?.tileId === 94, "geometry_gate_syntactic_area_mismatch");
check(JSON.stringify(gate.syntacticReadback?.fixturePositions) === JSON.stringify(profile.fixtures.map((fixture) => ({ id: fixture.id, position: fixture.position }))), "geometry_gate_syntactic_fixture_mismatch");
check(gate.entryPoint?.area === profile.module.area && JSON.stringify(gate.entryPoint?.position) === JSON.stringify(profile.geometryRequirements.entryPoint.position), "geometry_gate_entry_identity_mismatch");
check(gate.entryPoint?.accessibleSurface === true, "geometry_gate_entry_surface_unverified");
check(JSON.stringify(gate.fixtures?.map((fixture) => ({ id: fixture.id, position: fixture.position }))) === JSON.stringify(profile.fixtures.map((fixture) => ({ id: fixture.id, position: fixture.position }))), "geometry_gate_fixture_identity_mismatch");
check(gate.fixtures?.every((fixture) => fixture.accessibleSurface === true) === true, "geometry_gate_fixture_surface_unverified");
check(gate.nativeSave?.areaWasSaved === true, "geometry_gate_native_save_missing");
check(gate.nativeSave?.invalidLocationsDialog === false, "geometry_gate_invalid_locations_detected");
check(gate.nativeSave?.inaccessibleObjectsDialog === false, "geometry_gate_inaccessible_objects_detected");
check(String(gate.nativeSave?.statusText ?? "").includes("Area was saved"), "geometry_gate_native_save_readback_missing");

const result = failures.length === 0
  ? { ok: true, status: "verified", profileId: profile.id, gateKind: gate.version }
  : { ok: true, status: "failed", blockerCode: "area_geometry_invalid", profileId: profile.id, failures };
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

function check(condition, code) { if (!condition) failures.push(code); }
function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function requiredPath(value, name) { if (!value) throw new Error(`missing:${name}`); return resolve(value); }
function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const value = argv[index + 1];
    if (!token?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`invalid:${token ?? "end"}`);
    parsed[token.slice(2)] = value;
    index += 1;
  }
  return parsed;
}
