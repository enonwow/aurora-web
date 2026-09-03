#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const runner = resolve(root, "backend/scripts/aurora-toolset-binary-module-native-geometry.mjs");
const dir = mkdtempSync(join(tmpdir(), "aurora-binary-native-geometry-"));
const profilePath = join(dir, "profile.json");
const modulePath = join(dir, "contractmod.mod");
const wrongMruPath = join(dir, "m2a_vs_m0.mod");
const iniPath = join(dir, "nwtoolset.ini");
writeFileSync(modulePath, "contract module");
writeFileSync(wrongMruPath, "wrong mru module");
const hakPath = join(dir, "contracthak.hak");
writeFileSync(hakPath, "contract hak");
const moduleSha256 = hash(modulePath);
const hakSha256 = hash(hakPath);
writeFileSync(iniPath, `[History]\r\nMRU0=${wrongMruPath}\r\n`);
writeFileSync(profilePath, JSON.stringify({
  version: "aurora-toolset-binary-module-bootstrap-profile/v1", id: "contract-binary-native-geometry",
  module: { resref: "contractmod", path: modulePath, sha256: moduleSha256 },
  area: { resref: "contractarea", width: 2, height: 2 },
  entryPoint: { area: "contractarea", position: [5, 5, 0] },
  orderedHakList: [{ resref: "contracthak", path: hakPath, sha256: hakSha256 }],
  fixtures: [{ id: "fixture", templateResRef: "nw_dwarfmerc001", appearanceType: 15109, position: [10, 10, 0] }],
  noLocalToolsetAdapter: true,
}));

const dry = json([runner, "dry-run", "--profile", profilePath, "--outDir", join(dir, "out")]);
assert.equal(dry.status, "binary_native_geometry_plan_valid");
assert.deepEqual(dry.next, ["preflight", "open", "geometry-observe"]);
assert.equal(dry.safety.startsToolset, false);
assert.equal(dry.safety.ownsAtMostOneNewToolsetSession, true);
assert.equal(dry.safety.rejectsPreExistingToolsetSession, true);
assert.equal(dry.safety.noLocalToolsetAdapter, true);
assert.match(dry.requires.join("|"), /validated entry-surface observation/);

const emptyAreaProfilePath = join(dir, "empty-area-profile.json");
writeFileSync(emptyAreaProfilePath, JSON.stringify({
  version: "aurora-toolset-binary-area-create-profile/v1",
  id: "contract-binary-area-create",
  proofKind: "area-create-empty-structural",
  module: { resref: "contractmod", path: modulePath, sha256: moduleSha256 },
  area: {
    resref: "contractarea",
    displayName: "Contract Area",
    tag: "CONTRACT_AREA",
    width: 2,
    height: 2,
    tileSet: "tms01",
    tiles: [
      { row: 0, col: 0, tileId: 12, orientation: 2, height: 0, mainLight1: 0, mainLight2: 0, sourceLight1: 0, sourceLight2: 0, animLoop1: 1, animLoop2: 1, animLoop3: 1 },
      { row: 0, col: 1, tileId: 12, orientation: 1, height: 0, mainLight1: 0, mainLight2: 0, sourceLight1: 0, sourceLight2: 0, animLoop1: 1, animLoop2: 1, animLoop3: 1 },
      { row: 1, col: 0, tileId: 12, orientation: 3, height: 0, mainLight1: 0, mainLight2: 0, sourceLight1: 0, sourceLight2: 0, animLoop1: 1, animLoop2: 1, animLoop3: 1 },
      { row: 1, col: 1, tileId: 12, orientation: 0, height: 0, mainLight1: 0, mainLight2: 0, sourceLight1: 0, sourceLight2: 0, animLoop1: 1, animLoop2: 1, animLoop3: 1 },
    ],
  },
  moduleEntryPoint: { area: "existing_start", position: [5, 5, 0] },
  orderedHakList: [{ resref: "contracthak", path: hakPath, sha256: hakSha256 }],
  git: { exactEmpty: true, expectedObjectCounts: { placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0, sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 0 } },
  gic: { required: true },
  noLocalToolsetAdapter: true,
}));
const emptyAreaDry = json([runner, "dry-run", "--profile", emptyAreaProfilePath, "--outDir", join(dir, "empty-area-out")]);
assert.equal(emptyAreaDry.status, "binary_native_area_create_plan_valid");
assert.deepEqual(emptyAreaDry.next, ["preflight", "open", "geometry-observe"]);
assert.match(emptyAreaDry.requires.join("|"), /exact empty GIT/);
assert.doesNotMatch(emptyAreaDry.requires.join("|"), /entry-surface|fixture-surface/);
assert.equal(emptyAreaDry.profileKind, "area-create-empty-structural");
const admission = json([runner, "startup-admission-dry-run", "--profile", profilePath, "--outDir", join(dir, "out"), "--startupIniPath", iniPath]);
assert.equal(admission.status, "binary_native_explicit_open_startup_admitted");
assert.equal(admission.admission, true);
assert.equal(admission.startupMru.currentMru0Normalized, wrongMruPath.toLowerCase());
assert.equal(admission.startupMru.targetNormalized, modulePath.toLowerCase());
assert.equal(admission.route.version, "aurora-toolset-explicit-open-startup-admission/v3");
assert.equal(admission.route.mruConflict, true);
assert.equal(admission.route.openOnlyFromUnownedWelcomeOrBlankFrame, true);
assert.equal(admission.route.forbidsOpenAfterLoadOwner, true);
assert.equal(admission.startsToolset, false);

const restartOutDir = join(dir, "restart-out");
const restartManifestPath = join(restartOutDir, "binary-native-geometry-manifest.json");
mkdirSync(restartOutDir, { recursive: true });
const restartManifest = {
  version: "aurora-toolset-binary-native-geometry-manifest/v1",
  explicitOpenStartupAdmissionVersion: "aurora-toolset-explicit-open-startup-admission/v1",
  profilePath,
  profileSha256: hash(profilePath),
  profileId: "contract-binary-native-geometry",
  artifactDir: restartOutDir,
  module: { resref: "contractmod", path: modulePath, sha256: moduleSha256 },
  area: { resref: "contractarea", displayName: "Contract Area" },
  status: "failed",
  blockerCode: "BINARY_NATIVE_GEOMETRY_MANIFEST_EXISTS",
  error: restartManifestPath,
  startupAdmission: { version: "aurora-toolset-explicit-open-startup-admission/v1" },
  openFailure: { child: { blockerCode: "unexpected_module_window_loaded" } },
};
writeFileSync(restartManifestPath, `${JSON.stringify(restartManifest, null, 2)}\n`);
const restartDry = json([runner, "restart-failed-startup-admission-dry-run", "--profile", profilePath, "--outDir", restartOutDir]);
assert.equal(restartDry.status, "binary_native_failed_startup_restart_admitted");
assert.equal(restartDry.originalFailure.blockerCode, "unexpected_module_window_loaded");
assert.equal(restartDry.archiveOnly, true);
assert.equal(existsSync(restartManifestPath), true);
const cleanProcessState = !hasLiveAuroraProcess();
if (cleanProcessState) {
  const restart = json([runner, "restart-failed-startup-admission", "--profile", profilePath, "--outDir", restartOutDir]);
  assert.equal(restart.status, "binary_native_failed_startup_manifest_archived");
  assert.equal(existsSync(restartManifestPath), false);
  assert.equal(existsSync(restart.archive.path), true);
  assert.equal(hash(restart.archive.path), restart.archive.sha256);
  assert.equal(existsSync(restart.restartRecordPath), true);
  assert.equal(JSON.parse(readFileSync(restart.restartRecordPath, "utf8")).targetStartupAdmissionVersion, "aurora-toolset-explicit-open-startup-admission/v2");
} else {
  writeFileSync(join(restartOutDir, "binary-native-geometry-restart.json"), `${JSON.stringify({
    version: "aurora-toolset-binary-native-geometry-restart/v1",
    profile: { sha256: hash(profilePath) }, module: { sha256: moduleSha256 },
    targetStartupAdmissionVersion: "aurora-toolset-explicit-open-startup-admission/v2",
  }, null, 2)}\n`);
}

const restartV2Manifest = {
  ...restartManifest,
  explicitOpenStartupAdmissionVersion: "aurora-toolset-explicit-open-startup-admission/v2",
  status: "failed",
  startupAdmission: { version: "aurora-toolset-explicit-open-startup-admission/v2" },
  openFailure: { child: { blockerCode: "unexpected_module_window_loaded" }, startupAdmission: { version: "aurora-toolset-explicit-open-startup-admission/v2" } },
};
writeFileSync(restartManifestPath, `${JSON.stringify(restartV2Manifest, null, 2)}\n`);
const restartV2Dry = json([runner, "restart-failed-v2-startup-admission-dry-run", "--profile", profilePath, "--outDir", restartOutDir]);
assert.equal(restartV2Dry.status, "binary_native_failed_v2_startup_restart_admitted");
assert.equal(restartV2Dry.originalFailure.startupAdmissionVersion, "aurora-toolset-explicit-open-startup-admission/v2");
if (cleanProcessState) {
  const restartV2 = json([runner, "restart-failed-v2-startup-admission", "--profile", profilePath, "--outDir", restartOutDir]);
  assert.equal(restartV2.status, "binary_native_failed_v2_startup_manifest_archived");
  assert.equal(existsSync(restartV2.archive.path), true);
  assert.equal(existsSync(restartV2.restartRecordPath), true);
}

const invalidOutDir = join(dir, "invalid-restart-out");
const invalidManifestPath = join(invalidOutDir, "binary-native-geometry-manifest.json");
mkdirSync(invalidOutDir, { recursive: true });
writeFileSync(invalidManifestPath, `${JSON.stringify({ ...restartManifest, artifactDir: invalidOutDir, startupAdmission: { version: "aurora-toolset-explicit-open-startup-admission/v2" } }, null, 2)}\n`);
const invalidRestart = errorJson([runner, "restart-failed-startup-admission-dry-run", "--profile", profilePath, "--outDir", invalidOutDir]);
assert.equal(invalidRestart.blockerCode, "BINARY_NATIVE_FAILED_STARTUP_RESTART_NOT_AUTHORIZED");
assert.equal(existsSync(invalidManifestPath), true);

const guardWriteOutDir = join(dir, "guard-write-restart-out");
const guardWriteManifestPath = join(guardWriteOutDir, "binary-native-geometry-manifest.json");
const guardPath = join(dir, "terminal-module-open-guard.json");
mkdirSync(guardWriteOutDir, { recursive: true });
writeFileSync(guardPath, `${JSON.stringify({ state: "module_open_failed", processId: 999999999, blockerCode: "unexpected_module_window_loaded" }, null, 2)}\n`);
const guardWriteManifest = {
  ...restartManifest,
  explicitOpenStartupAdmissionVersion: "aurora-toolset-explicit-open-startup-admission/v3",
  artifactDir: guardWriteOutDir,
  startupAdmission: { version: "aurora-toolset-explicit-open-startup-admission/v3" },
  openFailure: { child: { blockerCode: "module_open_session_guard_write_failed" }, startupAdmission: { version: "aurora-toolset-explicit-open-startup-admission/v3" } },
};
writeFileSync(guardWriteManifestPath, `${JSON.stringify(guardWriteManifest, null, 2)}\n`);
const guardBefore = hash(guardPath);
const guardWriteDry = json([runner, "restart-failed-v3-guard-write-admission-dry-run", "--profile", profilePath, "--outDir", guardWriteOutDir, "--contractGuardPath", guardPath], { NODE_ENV: "test" });
assert.equal(guardWriteDry.status, "binary_native_failed_v3_guard_write_restart_admitted");
assert.equal(guardWriteDry.originalFailure.blockerCode, "module_open_session_guard_write_failed");
assert.equal(guardWriteDry.guard.writeCapability, "opened_r_plus_without_write");
assert.equal(guardWriteDry.guard.sha256Before, guardBefore);
assert.equal(guardWriteDry.guard.sha256After, guardBefore);
assert.equal(existsSync(guardWriteManifestPath), true);
if (cleanProcessState) {
  const guardWriteRestart = json([runner, "restart-failed-v3-guard-write-admission", "--profile", profilePath, "--outDir", guardWriteOutDir, "--contractGuardPath", guardPath], { NODE_ENV: "test" });
  assert.equal(guardWriteRestart.status, "binary_native_failed_v3_guard_write_manifest_archived");
  assert.equal(existsSync(guardWriteManifestPath), false);
  assert.equal(hash(guardWriteRestart.archive.path), guardWriteRestart.archive.sha256);
  assert.equal(hash(guardPath), guardBefore);
  assert.equal(JSON.parse(readFileSync(guardWriteRestart.restartRecordPath, "utf8")).version, "aurora-toolset-binary-native-geometry-restart/v4");
}
const guardWriteInvalidOutDir = join(dir, "guard-write-invalid-out");
mkdirSync(guardWriteInvalidOutDir, { recursive: true });
writeFileSync(join(guardWriteInvalidOutDir, "binary-native-geometry-manifest.json"), `${JSON.stringify({ ...guardWriteManifest, artifactDir: guardWriteInvalidOutDir, openFailure: { child: { blockerCode: "unexpected_module_window_loaded" }, startupAdmission: { version: "aurora-toolset-explicit-open-startup-admission/v3" } } }, null, 2)}\n`);
const invalidGuardWriteRestart = errorJson([runner, "restart-failed-v3-guard-write-admission-dry-run", "--profile", profilePath, "--outDir", guardWriteInvalidOutDir, "--contractGuardPath", guardPath], { NODE_ENV: "test" });
assert.equal(invalidGuardWriteRestart.blockerCode, "BINARY_NATIVE_FAILED_V3_GUARD_WRITE_RESTART_NOT_AUTHORIZED");
assert.equal(existsSync(join(guardWriteInvalidOutDir, "binary-native-geometry-manifest.json")), true);
const source = String(await import("node:fs/promises").then(({ readFile }) => readFile(runner, "utf8")));
const cleanNoopAdmissionSource = readFileSync(
  resolve(root, "backend/scripts/lib/aurora-toolset-clean-noop-area-properties-admission.mjs"),
  "utf8",
);
assert.match(source, /STALE_TOOLSET_SESSION_REJECTED/);
assert.match(source, /aurora-toolset-explicit-open-startup-admission\/v3/);
assert.match(source, /restart-failed-startup-admission/);
assert.match(source, /restart-failed-v2-startup-admission/);
assert.match(source, /restart-failed-v3-guard-write-admission/);
assert.match(source, /resume-verified-temp0-recovery-dry-run/);
assert.match(source, /resume-verified-temp0-recovery/);
assert.match(source, /adoptsExactExistingToolsetSession/);
assert.match(source, /allowReuseOpenSession/);
assert.match(source, /resume-open-module-dialog-readback-unavailable-dry-run/);
assert.match(source, /resume-clean-area-create-admission-dry-run/);
assert.match(source, /area_create_native_clean_open_verified/);
assert.match(source, /nativeSaveClaimed: false/);
assert.match(source, /sha256RevalidationDeferredUntilToolsetClose: true/);
assert.match(source, /moduleStat\.mtimeMs > manifestCreatedAtMs/);
assert.match(source, /resume-clean-area-create-noop-dirty-roundtrip-dry-run/);
assert.match(source, /invoke-aurora-toolset-tile-properties-gui-thread-bridge\.mjs/);
assert.match(source, /set-main-light-1/);
assert.match(source, /semanticDeltaClaimed: false/);
assert.match(source, /nativeNoOpDirtying/);
assert.match(source, /resume-clean-area-create-noop-area-properties-dirty-roundtrip-dry-run/);
assert.match(source, /nativeAreaPropertiesNoOpDirtying/);
assert.match(source, /resume-model-fixture-clean-noop-area-properties-dry-run/);
assert.match(source, /classifyCleanNoopAreaPropertiesProfile/);
assert.match(source, /validateCleanNoopAreaPropertiesLineage/);
assert.match(source, /dynamic-placeable/);
assert.match(cleanNoopAdmissionSource, /preflight-sha256-plus-locked-file-stat/);
assert.match(source, /BINARY_NATIVE_MODEL_FIXTURE_CLEAN_NOOP_NOT_AUTHORIZED/);
assert.match(source, /nativeModelFixtureNoOpDirtying/);
assert.match(source, /module_not_dirty_before_save/);
assert.match(source, /exactEmptyOnEnterTransportFailure/);
assert.match(source, /on_enter_script_resource_missing/);
assert.match(source, /binary_native_model_fixture_noop_area_properties_dirty_ready_for_save/);
assert.match(source, /invalid_terrain_selection_state:1:0:0/);
assert.match(source, /invoke-aurora-toolset-area-properties-gui-thread-bridge\.mjs/);
assert.match(source, /BINARY_NATIVE_OPEN_DIALOG_RESUME_WINDOW_DRIFT/);
assert.match(source, /module_name_edit_readback_mismatch:expected=\$\{profile\.module\.resref\}:actual=/);
assert.match(source, /open-aurora-toolset-module-from-dialog-no-global-input\.mjs/);
assert.match(source, /exact_existing_tdlgmoduleselect_continuation/);
assert.match(source, /BINARY_NATIVE_OPEN_DIALOG_RESUME_POST_STATE_INVALID/);
const dialogOpenerSource = readFileSync(resolve(root, "backend/scripts/open-aurora-toolset-module-from-dialog-no-global-input.mjs"), "utf8");
assert.match(dialogOpenerSource, /expectedDialogHwnd/);
assert.match(dialogOpenerSource, /SetWindowPos/);
assert.match(dialogOpenerSource, /open_dialog_monitor_readback_mismatch/);
assert.match(dialogOpenerSource, /changesWindowPlacement=\$repositioned/);
assert.doesNotMatch(dialogOpenerSource, /function R\(/);
assert.match(source, /module_open_session_guard_write_failed/);
assert.match(source, /opened_r_plus_without_write/);
assert.match(source, /unexpected_module_window_loaded/);
assert.match(source, /assertExactOpenOwnershipResult/);
assert.match(source, /verifiedTemp0RecoveryAdmission/);
assert.match(source, /postChildProcesses/);
assert.match(source, /childStdout/);
assert.match(source, /failedChild\?\.blockerCode !== \(clientClickFallback \? "toolset_verified_temp0_recovery_prompt_did_not_close" : "binary_native_child_process_failed"\)/);
assert.match(source, /failedChild\?\.childExitCode !== \(clientClickFallback \? 2 : 1\)/);
assert.match(source, /invalid locations\|area was not saved\|inaccessable objects/);
assert.match(source, /geometry_saved_pending_entry_observation/);
assert.match(source, /aurora-toolset-binary-native-geometry-profile\/v1/);
console.log(JSON.stringify({ ok: true, status: "aurora_toolset_binary_native_geometry_contract_valid" }));

function json(args, env = {}) { return JSON.parse(execFileSync(process.execPath, args, { cwd: root, encoding: "utf8", env: { ...process.env, ...env } })); }
function errorJson(args, env = {}) { try { json(args, env); assert.fail("expected command to fail"); } catch (error) { return JSON.parse(String(error.stdout)); } }
function hash(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function hasLiveAuroraProcess() { return execFileSync("powershell.exe", ["-NoProfile", "-Command", "@('nwtoolset','nwmain') | ForEach-Object { Get-Process $_ -ErrorAction SilentlyContinue } | Measure-Object | Select-Object -ExpandProperty Count"], { encoding: "utf8" }).trim() !== "0"; }
