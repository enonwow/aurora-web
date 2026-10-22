#!/usr/bin/env node
/*
 * Canonical native continuation for an offline-built NWN MOD.
 *
 * This is deliberately a central route rather than a consumer UI adapter. It
 * owns one clean Toolset session, binds both the serialized Area identity and
 * the native tree-display identity, and emits a new immutable post-save
 * geometry profile. It never touches a pre-existing Toolset process.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildToolsetStartupLoadPlan } from "./lib/toolset-startup-load-plan.mjs";
import {
  createVerifiedTemp0RecoveryAdmission,
  validateVerifiedTemp0RecoveryAdmission,
} from "./lib/aurora-toolset-verified-temp0-recovery.mjs";
import { validateCleanAreaCreateAdmission } from "./lib/aurora-toolset-clean-area-create-admission.mjs";
import {
  classifyCleanNoopAreaPropertiesProfile,
  validateCleanNoopAreaPropertiesLineage,
} from "./lib/aurora-toolset-clean-noop-area-properties-admission.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const [command, ...argv] = process.argv.slice(2);
if(String(command??'').startsWith('continue-pre-area-hidden-frame')){
  const {runHiddenFrameCommand}=await import('./lib/aurora-hidden-pre-area-public.mjs');
  const result=runHiddenFrameCommand(command,argv);print(result);process.exit(result.ok?0:2);
}
// Saved-file inspection must never enter the native preflight/error handler,
// including malformed or currently unsupported entry-surface commands.
if (String(command ?? "").startsWith("geometry-entry-surface-") || command === "geometry-finalize" || command === "validate-geometry") {
  const { runEntrySurfaceInspectCommand } = await import("./lib/aurora-binary-entry-surface-inspection.mjs");
  const result = runEntrySurfaceInspectCommand(command, argv);
  print(result);
  process.exit(result.ok ? 0 : 2);
}
const options = parseArgs(argv);
const profilePath = requiredPath(options.profile, "--profile");
const outDir = requiredPath(options.outDir, "--outDir");
const profile = readJson(profilePath);
const areaCreateStructuralProfile = profile.version === "aurora-toolset-binary-area-create-profile/v1"
  && profile.proofKind === "area-create-empty-structural";
const installedModulePath = options.installedModulePath
  ? requiredPath(options.installedModulePath, "--installedModulePath")
  : null;
const manifestPath = resolve(outDir, "binary-native-geometry-manifest.json");
const hiddenResumeAttempt = command==='geometry-observe'&&existsSync(resolve(outDir,'hidden-pre-area-v1','intent.json'));
let hiddenAreaContext=null;
let finishHiddenArea=null;
const canonicalModuleOpenSessionGuardPath = resolve(
  root,
  "backend",
  "docs",
  "aurora-reverse",
  "artifacts",
  "last-city-apartment-area",
  "toolset-module-open-session-guard.json",
);
const moduleOpenSessionGuardPath = contractGuardPath();
let toolsetLaunchAttempted = false;
const EXPLICIT_OPEN_STARTUP_ADMISSION_V2 = "aurora-toolset-explicit-open-startup-admission/v2";
const EXPLICIT_OPEN_STARTUP_ADMISSION_VERSION = "aurora-toolset-explicit-open-startup-admission/v3";

try {
  if(hiddenResumeAttempt){
    const continuation=await import('./lib/aurora-hidden-pre-area-workflow.mjs');
    const {hiddenFrameNativePorts}=await import('./lib/aurora-hidden-pre-area-public.mjs');
    finishHiddenArea=continuation.finishHiddenFrameArea;
    hiddenAreaContext=continuation.beginHiddenFrameArea({profilePath,outDir},hiddenFrameNativePorts());
  }
  const result = run(command);
  print(result);
} catch (error) {
  if(hiddenAreaContext&&finishHiddenArea){
    try { finishHiddenArea(hiddenAreaContext,{status:'failed',code:error.code??'HIDDEN_AREA_FAILED',message:String(error.message).slice(0,2000)}); }
    catch(receiptError){ error.continuationReceiptError=String(receiptError.message).slice(0,1000); }
  }
  const postFailureProcesses = toolsetProcessesSafe();
  const postFailureWindows = postFailureProcesses.length === 1 ? visibleWindowsSafe() : [];
  const result = {
    ok: false,
    command: command ?? null,
    blockerCode: error.code ?? "binary_native_geometry_exception",
    message: error instanceof Error ? error.message : String(error),
    profilePath,
    manifestPath,
    startsToolset: toolsetLaunchAttempted,
    startsNwn: false,
    usesGlobalInput: false,
    postFailureProcesses,
    postFailureWindows,
  };
  if (existsSync(manifestPath) && !hiddenResumeAttempt && !isFailedStartupRestartCommand(command) && !String(command ?? "").endsWith("-dry-run")) {
    const manifest = readJson(manifestPath);
    manifest.status = "failed";
    manifest.blockerCode = result.blockerCode;
    manifest.error = result.message;
    manifest.updatedAt = new Date().toISOString();
    writeJson(manifestPath, manifest);
  }
  print(result);
  process.exitCode = 2;
}

function run(name) {
  if (!name || !["dry-run", "startup-admission-dry-run", "explicit-open-startup-admission-dry-run", "restart-failed-startup-admission-dry-run", "restart-failed-startup-admission", "restart-failed-v2-startup-admission-dry-run", "restart-failed-v2-startup-admission", "restart-failed-v3-guard-write-admission-dry-run", "restart-failed-v3-guard-write-admission", "resume-verified-temp0-recovery-dry-run", "resume-verified-temp0-recovery", "resume-verified-temp0-recovery-client-click-dry-run", "resume-verified-temp0-recovery-client-click", "resume-open-module-dialog-readback-unavailable-dry-run", "resume-open-module-dialog-readback-unavailable", "resume-clean-area-create-admission-dry-run", "resume-clean-area-create-admission", "resume-clean-area-create-noop-dirty-roundtrip-dry-run", "resume-clean-area-create-noop-dirty-roundtrip", "resume-clean-area-create-noop-area-properties-dirty-roundtrip-dry-run", "resume-clean-area-create-noop-area-properties-dirty-roundtrip", "resume-model-fixture-clean-noop-area-properties-dry-run", "resume-model-fixture-clean-noop-area-properties", "preflight", "open", "geometry-observe", "geometry-finalize", "validate-geometry"].includes(name)) {
    fail("BINARY_NATIVE_GEOMETRY_COMMAND_INVALID", "Use dry-run, startup-admission-dry-run, explicit-open-startup-admission-dry-run, restart-failed-startup-admission-dry-run, restart-failed-startup-admission, restart-failed-v2-startup-admission-dry-run, restart-failed-v2-startup-admission, restart-failed-v3-guard-write-admission-dry-run, restart-failed-v3-guard-write-admission, resume-verified-temp0-recovery-dry-run, resume-verified-temp0-recovery, resume-verified-temp0-recovery-client-click-dry-run, resume-verified-temp0-recovery-client-click, resume-open-module-dialog-readback-unavailable-dry-run, resume-open-module-dialog-readback-unavailable, resume-clean-area-create-admission-dry-run, resume-clean-area-create-admission, preflight, open, geometry-observe, geometry-finalize, or validate-geometry.");
  }
  if (name === "geometry-finalize") {
    if (areaCreateStructuralProfile) fail("BINARY_NATIVE_AREA_CREATE_GEOMETRY_FINALIZE_FORBIDDEN", "The empty Area Create profile has no model/entry-surface geometry claim.");
    return finalizeGeometry(requireManifest("geometry_saved_pending_entry_observation"), requiredPath(options.entrySurfaceObservation, "--entrySurfaceObservation"));
  }
  if (name === "restart-failed-startup-admission-dry-run" || name === "restart-failed-startup-admission") return restartFailedStartupAdmission(name.endsWith("-dry-run"));
  if (name === "restart-failed-v2-startup-admission-dry-run" || name === "restart-failed-v2-startup-admission") return restartFailedV2StartupAdmission(name.endsWith("-dry-run"));
  if (name === "restart-failed-v3-guard-write-admission-dry-run" || name === "restart-failed-v3-guard-write-admission") return restartFailedV3GuardWriteAdmission(name.endsWith("-dry-run"));
  if (name === "resume-verified-temp0-recovery-dry-run" || name === "resume-verified-temp0-recovery") {
    const structural = atom("validate-aurora-toolset-binary-module-bootstrap.mjs", ["--mode", "preflight", "--profile", profilePath]);
    const area = atom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", profile.module.path, "--area", profile.area.resref]);
    return resumeVerifiedTemp0Recovery(area, name.endsWith("-dry-run"), structural);
  }
  if (name === "resume-verified-temp0-recovery-client-click-dry-run" || name === "resume-verified-temp0-recovery-client-click") {
    const structural = atom("validate-aurora-toolset-binary-module-bootstrap.mjs", ["--mode", "preflight", "--profile", profilePath]);
    const area = atom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", profile.module.path, "--area", profile.area.resref]);
    return resumeVerifiedTemp0Recovery(area, name.endsWith("-dry-run"), structural, { clientClickFallback: true });
  }
  if (name === "resume-open-module-dialog-readback-unavailable-dry-run" || name === "resume-open-module-dialog-readback-unavailable") {
    const structural = atom("validate-aurora-toolset-binary-module-bootstrap.mjs", ["--mode", "preflight", "--profile", profilePath]);
    const area = atom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", profile.module.path, "--area", profile.area.resref]);
    return resumeOpenModuleDialogReadbackUnavailable(area, name.endsWith("-dry-run"), structural);
  }
  if (name === "resume-clean-area-create-admission-dry-run" || name === "resume-clean-area-create-admission") {
    return resumeCleanAreaCreateAdmission(name.endsWith("-dry-run"));
  }
  if (name === "resume-clean-area-create-noop-dirty-roundtrip-dry-run" || name === "resume-clean-area-create-noop-dirty-roundtrip") {
    return resumeCleanAreaCreateNoopDirtyRoundtrip(name.endsWith("-dry-run"));
  }
  if (name === "resume-clean-area-create-noop-area-properties-dirty-roundtrip-dry-run" || name === "resume-clean-area-create-noop-area-properties-dirty-roundtrip") {
    return resumeCleanAreaCreateNoopAreaPropertiesDirtyRoundtrip(name.endsWith("-dry-run"));
  }
  if (name === "resume-model-fixture-clean-noop-area-properties-dry-run" || name === "resume-model-fixture-clean-noop-area-properties") {
    return resumeModelFixtureCleanNoopAreaProperties(name.endsWith("-dry-run"));
  }
  const structuralMode = ["dry-run", "startup-admission-dry-run"].includes(name) ? "dry-run" : "preflight";
  const structural = atom("validate-aurora-toolset-binary-module-bootstrap.mjs", ["--mode", structuralMode, "--profile", profilePath]);
  const area = structuralMode === "dry-run" ? null : atom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", profile.module.path, "--area", profile.area.resref]);
  if (area && !text(area.displayName)) fail("BINARY_NATIVE_AREA_DISPLAY_NAME_MISSING", "Packed ARE has no display name; refusing to guess the native Toolset tree identity.");

  if (name === "dry-run") return {
    ok: true, command: name, status: areaCreateStructuralProfile ? "binary_native_area_create_plan_valid" : "binary_native_geometry_plan_valid", profileId: profile.id,
    profileKind: structural.profileKind,
    next: ["preflight", "open", "geometry-observe"],
    requires: areaCreateStructuralProfile
      ? ["exact binary Area Create structural preflight", "exact empty GIT and required GIC", "zero pre-existing nwtoolset.exe processes", "one new central Toolset session", "native Save accepted without invalid-locations/Inaccessable Objects"]
      : ["exact binary bootstrap structural preflight", "zero pre-existing nwtoolset.exe processes", "one new central Toolset session", "native Save accepted without invalid-locations/Inaccessable Objects", "validated entry-surface observation"],
    safety: safety(false), noLocalToolsetAdapter: true,
  };
  if (name === "startup-admission-dry-run" || name === "explicit-open-startup-admission-dry-run") return startupAdmissionDryRun(name);
  if (name === "validate-geometry") return validateGeometry(requiredPath(options.geometryProfile, "--geometryProfile"));

  if (name === "preflight") return preflight(structural, area);
  if (name === "open") return open(area);
  return observeGeometry(area);
}

/*
 * This is intentionally narrower than a generic reset.  It preserves the
 * failed v1 packet and admits exactly the known Welcome/MRU race to a fresh
 * v2 preflight in the same artifact directory.  No Toolset/NWN/UI action is
 * performed here; a later `open` remains a separate, owned live action.
 */
function restartFailedStartupAdmission(dryRun) {
  return archiveFailedStartupAdmission({
    dryRun,
    commandBase: "restart-failed-startup-admission",
    expectedStartupAdmissionVersion: "aurora-toolset-explicit-open-startup-admission/v1",
    targetStartupAdmissionVersion: EXPLICIT_OPEN_STARTUP_ADMISSION_V2,
    archiveSuffix: "v1",
    restartRecordPath: resolve(outDir, "binary-native-geometry-restart.json"),
    restartRecordVersion: "aurora-toolset-binary-native-geometry-restart/v1",
    statusBase: "binary_native_failed_startup",
  });
}

function restartFailedV2StartupAdmission(dryRun) {
  return archiveFailedStartupAdmission({
    dryRun,
    commandBase: "restart-failed-v2-startup-admission",
    expectedStartupAdmissionVersion: EXPLICIT_OPEN_STARTUP_ADMISSION_V2,
    targetStartupAdmissionVersion: EXPLICIT_OPEN_STARTUP_ADMISSION_VERSION,
    archiveSuffix: "v2",
    restartRecordPath: resolve(outDir, "binary-native-geometry-restart-v3.json"),
    restartRecordVersion: "aurora-toolset-binary-native-geometry-restart/v3",
    requiredPriorRestartRecordPath: resolve(outDir, "binary-native-geometry-restart.json"),
    statusBase: "binary_native_failed_v2_startup",
  });
}

/*
 * A pre-start guard-write failure has no Toolset/UI side effect, but its
 * durable failed manifest prevents a same-outDir preflight. This transition
 * is intentionally not a generic retry and does not release, replace, or
 * mutate the shared guard. It proves that the canonical guard is terminal,
 * owned by no live process, and can be opened read/write without writing a
 * byte; the subsequent public `open` remains responsible for acquisition.
 */
function restartFailedV3GuardWriteAdmission(dryRun) {
  const failed = inspectFailedV3GuardWriteAdmission();
  const guard = inspectTerminalModuleOpenGuard();
  const restartRecordPath = resolve(outDir, "binary-native-geometry-restart-v3-guard-write.json");
  if (existsSync(restartRecordPath)) fail("BINARY_NATIVE_FAILED_V3_GUARD_WRITE_RESTART_ALREADY_USED", restartRecordPath);
  const archiveDir = resolve(outDir, "restart-history");
  const archivePath = resolve(archiveDir, `${timestampToken()}-failed-v3-guard-write-admission.json`);
  const preview = {
    ok: true,
    command: dryRun ? "restart-failed-v3-guard-write-admission-dry-run" : "restart-failed-v3-guard-write-admission",
    status: dryRun ? "binary_native_failed_v3_guard_write_restart_admitted" : "binary_native_failed_v3_guard_write_manifest_archived",
    originalFailure: { blockerCode: failed.blockerCode, startupAdmissionVersion: failed.startupAdmissionVersion },
    archive: { path: archivePath, sha256: failed.sha256 },
    restartRecordPath,
    targetStartupAdmissionVersion: EXPLICIT_OPEN_STARTUP_ADMISSION_VERSION,
    guard,
    next: ["preflight", "open"],
    archiveOnly: true,
    proofClaimed: false,
    runtimeClaimed: false,
    safety: { ...safety(false), startsNwn: false, rejectsPreExistingNwnSession: true, noIniOrMruMutation: true, changesModuleOpenGuard: false },
  };
  if (dryRun) return preview;

  assertNoToolsetProcess();
  assertNoNwnProcess();
  mkdirSync(archiveDir, { recursive: true });
  if (existsSync(archivePath)) fail("BINARY_NATIVE_FAILED_V3_GUARD_WRITE_ARCHIVE_COLLISION", archivePath);
  renameSync(manifestPath, archivePath);
  const record = {
    version: "aurora-toolset-binary-native-geometry-restart/v4",
    status: "failed_v3_guard_write_manifest_archived_for_v3_preflight",
    profile: { path: profilePath, sha256: sha256(profilePath), id: profile.id },
    module: profile.module,
    artifactDir: outDir,
    originalManifest: { path: manifestPath, archivePath, sha256: failed.sha256, status: failed.status, blockerCode: failed.blockerCode, startupAdmissionVersion: failed.startupAdmissionVersion },
    guard,
    targetStartupAdmissionVersion: EXPLICIT_OPEN_STARTUP_ADMISSION_VERSION,
    safety: preview.safety,
    createdAt: new Date().toISOString(),
  };
  try {
    writeJson(restartRecordPath, record);
  } catch (error) {
    renameSync(archivePath, manifestPath);
    throw error;
  }
  return preview;
}

function archiveFailedStartupAdmission({ dryRun, commandBase, expectedStartupAdmissionVersion, targetStartupAdmissionVersion, archiveSuffix, restartRecordPath, restartRecordVersion, requiredPriorRestartRecordPath = null, statusBase }) {
  const failed = inspectFailedStartupAdmission(expectedStartupAdmissionVersion, requiredPriorRestartRecordPath);
  if (existsSync(restartRecordPath)) fail("BINARY_NATIVE_FAILED_STARTUP_RESTART_ALREADY_USED", restartRecordPath);
  const archiveDir = resolve(outDir, "restart-history");
  const archivePath = resolve(archiveDir, `${timestampToken()}-failed-startup-admission-${archiveSuffix}.json`);
  const preview = {
    ok: true,
    command: dryRun ? `${commandBase}-dry-run` : commandBase,
    status: dryRun ? `${statusBase}_restart_admitted` : `${statusBase}_manifest_archived`,
    originalFailure: { blockerCode: failed.blockerCode, startupAdmissionVersion: failed.startupAdmissionVersion },
    archive: { path: archivePath, sha256: failed.sha256 },
    restartRecordPath,
    targetStartupAdmissionVersion,
    next: ["preflight", "open"],
    archiveOnly: true,
    proofClaimed: false,
    runtimeClaimed: false,
    safety: { ...safety(false), startsNwn: false, rejectsPreExistingNwnSession: true, noIniOrMruMutation: true },
  };
  if (dryRun) return preview;

  assertNoToolsetProcess();
  assertNoNwnProcess();
  mkdirSync(archiveDir, { recursive: true });
  if (existsSync(archivePath)) fail("BINARY_NATIVE_FAILED_STARTUP_ARCHIVE_COLLISION", archivePath);
  renameSync(manifestPath, archivePath);
  const record = {
    version: restartRecordVersion,
    status: `failed_startup_manifest_archived_for_${targetStartupAdmissionVersion}_preflight`,
    profile: { path: profilePath, sha256: sha256(profilePath), id: profile.id },
    module: profile.module,
    artifactDir: outDir,
    originalManifest: { path: manifestPath, archivePath, sha256: failed.sha256, status: failed.status, blockerCode: failed.blockerCode, startupAdmissionVersion: failed.startupAdmissionVersion },
    requiredPriorRestartRecordPath,
    targetStartupAdmissionVersion,
    safety: preview.safety,
    createdAt: new Date().toISOString(),
  };
  try {
    writeJson(restartRecordPath, record);
  } catch (error) {
    renameSync(archivePath, manifestPath);
    throw error;
  }
  return preview;
}

function inspectFailedStartupAdmission(expectedStartupAdmissionVersion, requiredPriorRestartRecordPath) {
  if (!existsSync(manifestPath)) fail("BINARY_NATIVE_FAILED_STARTUP_MANIFEST_MISSING", manifestPath);
  const bytes = readFileSync(manifestPath);
  const manifest = JSON.parse(bytes.toString("utf8"));
  const blockerCode = manifest?.openFailure?.child?.blockerCode ?? manifest?.openFailure?.childResult?.blockerCode ?? null;
  const startupAdmissionVersion = manifest?.openFailure?.startupAdmission?.version ?? manifest?.startupAdmission?.version ?? manifest?.explicitOpenStartupAdmissionVersion ?? null;
  const expectedProfileSha256 = sha256(profilePath);
  const invalid = (
    manifest?.version !== "aurora-toolset-binary-native-geometry-manifest/v1" ||
    manifest?.status !== "failed" ||
    resolve(String(manifest?.profilePath ?? "")) !== profilePath ||
    manifest?.profileSha256 !== expectedProfileSha256 ||
    resolve(String(manifest?.artifactDir ?? "")) !== outDir ||
    manifest?.module?.resref !== profile?.module?.resref ||
    resolve(String(manifest?.module?.path ?? "")) !== resolve(profile.module.path) ||
    manifest?.module?.sha256 !== profile?.module?.sha256 ||
    startupAdmissionVersion !== expectedStartupAdmissionVersion ||
    blockerCode !== "unexpected_module_window_loaded" ||
    manifest?.open || manifest?.nativeSave || manifest?.queue || manifest?.geometryProfilePath
  );
  if (requiredPriorRestartRecordPath) {
    if (!existsSync(requiredPriorRestartRecordPath)) fail("BINARY_NATIVE_FAILED_V2_STARTUP_PRIOR_ARCHIVE_MISSING", requiredPriorRestartRecordPath);
    const prior = readJson(requiredPriorRestartRecordPath);
    if (
      prior?.version !== "aurora-toolset-binary-native-geometry-restart/v1" ||
      prior?.profile?.sha256 !== expectedProfileSha256 ||
      prior?.module?.sha256 !== profile?.module?.sha256 ||
      prior?.targetStartupAdmissionVersion !== EXPLICIT_OPEN_STARTUP_ADMISSION_V2
    ) fail("BINARY_NATIVE_FAILED_V2_STARTUP_PRIOR_ARCHIVE_INVALID", requiredPriorRestartRecordPath);
  }
  if (invalid) fail("BINARY_NATIVE_FAILED_STARTUP_RESTART_NOT_AUTHORIZED", JSON.stringify({
    status: manifest?.status ?? null, blockerCode, startupAdmissionVersion, profileMatches: manifest?.profileSha256 === expectedProfileSha256,
  }));
  return { status: manifest.status, blockerCode, startupAdmissionVersion, sha256: createHash("sha256").update(bytes).digest("hex") };
}

function inspectFailedV3GuardWriteAdmission() {
  if (!existsSync(manifestPath)) fail("BINARY_NATIVE_FAILED_V3_GUARD_WRITE_MANIFEST_MISSING", manifestPath);
  const bytes = readFileSync(manifestPath);
  const manifest = JSON.parse(bytes.toString("utf8"));
  const blockerCode = manifest?.openFailure?.child?.blockerCode ?? manifest?.openFailure?.childResult?.blockerCode ?? manifest?.blockerCode ?? null;
  const startupAdmissionVersion = manifest?.openFailure?.startupAdmission?.version ?? manifest?.startupAdmission?.version ?? manifest?.explicitOpenStartupAdmissionVersion ?? null;
  const expectedProfileSha256 = sha256(profilePath);
  const forbiddenEvidence = ["open", "nativeSave", "queue", "geometryProfilePath", "postSave", "areaOpen", "geometry"].some((key) => manifest?.[key] != null);
  const invalid = (
    manifest?.version !== "aurora-toolset-binary-native-geometry-manifest/v1" ||
    manifest?.status !== "failed" ||
    resolve(String(manifest?.profilePath ?? "")) !== profilePath ||
    manifest?.profileSha256 !== expectedProfileSha256 ||
    resolve(String(manifest?.artifactDir ?? "")) !== outDir ||
    manifest?.module?.resref !== profile?.module?.resref ||
    resolve(String(manifest?.module?.path ?? "")) !== resolve(profile.module.path) ||
    manifest?.module?.sha256 !== profile?.module?.sha256 ||
    startupAdmissionVersion !== EXPLICIT_OPEN_STARTUP_ADMISSION_VERSION ||
    blockerCode !== "module_open_session_guard_write_failed" ||
    forbiddenEvidence
  );
  if (invalid) fail("BINARY_NATIVE_FAILED_V3_GUARD_WRITE_RESTART_NOT_AUTHORIZED", JSON.stringify({
    status: manifest?.status ?? null, blockerCode, startupAdmissionVersion, profileMatches: manifest?.profileSha256 === expectedProfileSha256, forbiddenEvidence,
  }));
  return { status: manifest.status, blockerCode, startupAdmissionVersion, sha256: createHash("sha256").update(bytes).digest("hex") };
}

function inspectTerminalModuleOpenGuard() {
  if (!existsSync(moduleOpenSessionGuardPath)) fail("BINARY_NATIVE_FAILED_V3_GUARD_WRITE_GUARD_MISSING", moduleOpenSessionGuardPath);
  const beforeBytes = readFileSync(moduleOpenSessionGuardPath);
  let guard;
  try { guard = JSON.parse(beforeBytes.toString("utf8")); } catch { fail("BINARY_NATIVE_FAILED_V3_GUARD_WRITE_GUARD_UNREADABLE", moduleOpenSessionGuardPath); }
  const state = String(guard?.state ?? "");
  const released = ["released", "stale_replaced", "ignored_no_live_toolset_process"].includes(state);
  const terminal = state === "module_open_failed";
  const ownerPid = Number(guard?.processId);
  if (!released && (!terminal || !Number.isInteger(ownerPid) || isProcessAlive(ownerPid))) {
    fail("BINARY_NATIVE_FAILED_V3_GUARD_WRITE_GUARD_NOT_TERMINAL", JSON.stringify({ state, ownerPid: Number.isInteger(ownerPid) ? ownerPid : null }));
  }
  let descriptor;
  try { descriptor = openSync(moduleOpenSessionGuardPath, "r+"); } catch (error) { fail("BINARY_NATIVE_FAILED_V3_GUARD_WRITE_GUARD_NOT_WRITABLE", `${moduleOpenSessionGuardPath}: ${error?.message ?? String(error)}`); } finally { if (descriptor !== undefined) closeSync(descriptor); }
  const afterBytes = readFileSync(moduleOpenSessionGuardPath);
  const beforeSha256 = createHash("sha256").update(beforeBytes).digest("hex");
  const afterSha256 = createHash("sha256").update(afterBytes).digest("hex");
  if (beforeSha256 !== afterSha256) fail("BINARY_NATIVE_FAILED_V3_GUARD_WRITE_GUARD_MUTATED", moduleOpenSessionGuardPath);
  return { path: moduleOpenSessionGuardPath, state, ownerPid: Number.isInteger(ownerPid) ? ownerPid : null, sha256Before: beforeSha256, sha256After: afterSha256, writeCapability: "opened_r_plus_without_write" };
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (error) { return error?.code === "EPERM"; }
}

function contractGuardPath() {
  if (!options.contractGuardPath) return canonicalModuleOpenSessionGuardPath;
  if (process.env.NODE_ENV !== "test") fail("BINARY_NATIVE_GEOMETRY_CONTRACT_GUARD_PATH_FORBIDDEN", "--contractGuardPath is test-only.");
  return requiredPath(options.contractGuardPath, "--contractGuardPath");
}
function isFailedStartupRestartCommand(name) { return ["restart-failed-startup-admission-dry-run", "restart-failed-startup-admission", "restart-failed-v2-startup-admission-dry-run", "restart-failed-v2-startup-admission", "restart-failed-v3-guard-write-admission-dry-run", "restart-failed-v3-guard-write-admission"].includes(name); }
function timestampToken() { return new Date().toISOString().replace(/[:.]/g, "-"); }

function preflight(structural, area) {
  assertNoToolsetProcess();
  const verifiedTemp0RecoveryAdmission = inspectVerifiedTemp0RecoveryAdmission();
  const startupAdmission = explicitOpenStartupAdmission();
  if (existsSync(manifestPath)) fail("BINARY_NATIVE_GEOMETRY_MANIFEST_EXISTS", manifestPath);
  mkdirSync(outDir, { recursive: true });
  const manifest = baseManifest(area);
  manifest.status = "prepared";
  manifest.structuralPreflight = structural;
  manifest.startupAdmission = startupAdmission;
  manifest.verifiedTemp0RecoveryAdmission = verifiedTemp0RecoveryAdmission;
  manifest.updatedAt = new Date().toISOString();
  writeJson(manifestPath, manifest);
  return {
    ok: true,
    command: "preflight",
    status: "binary_native_geometry_preflight_valid",
    manifestPath,
    area,
    verifiedTemp0RecoveryAdmission,
    safety: safety(false),
  };
}

function startupAdmissionDryRun(name = "startup-admission-dry-run") {
  const route = explicitOpenStartupAdmission();
  return {
    ok: true,
    command: name,
    status: "binary_native_explicit_open_startup_admitted",
    admission: true,
    startupMru: route.startupMru,
    route,
    startsToolset: false,
    startsNwn: false,
    usesGlobalInput: false,
    noLocalToolsetAdapter: true,
  };
}

function explicitOpenStartupAdmission() {
  const startupMru = inspectStartupMru();
  const plan = buildToolsetStartupLoadPlan({
    modulePath: profile.module.path,
    currentMru0: startupMru.currentMru0,
  });
  return {
    version: EXPLICIT_OPEN_STARTUP_ADMISSION_VERSION,
    mode: plan.mode,
    startupMru,
    mruConflict: startupMru.exactTarget !== true,
    startsToolsetWithoutModuleArgument: true,
    immediatePassiveObservation: true,
    openOnlyFromUnownedWelcomeOrBlankFrame: true,
    requiresExactVisibleModuleListMatch: true,
    forbidsOpenAfterLoadOwner: true,
    forbidsIniOrMruMutation: true,
    noLocalToolsetAdapter: true,
  };
}

function inspectStartupMru() {
  const args = ["--modulePath", profile.module.path];
  if (options.startupIniPath) args.push("--iniPath", requiredPath(options.startupIniPath, "--startupIniPath"));
  return atom("inspect-aurora-toolset-startup-mru-readonly.mjs", args);
}

function open(area) {
  const manifest = requireManifest("prepared");
  assertNoToolsetProcess();
  const verifiedTemp0RecoveryAdmission = revalidateManifestTemp0RecoveryAdmission(manifest);
  const startupAdmission = explicitOpenStartupAdmission();
  toolsetLaunchAttempted = true;
  const openArgs = [
    "--modulePath", installedModulePath ?? profile.module.path,
    "--expectedModuleParts", `${profile.module.resref}|mod`,
    "--area", profile.area.resref,
    "--areaName", area.displayName,
    "--windowLeft", "-1920", "--windowTop", "0", "--skipAreaOpen", "true",
    "--startupPassiveObservationMs", "0",
  ];
  if (verifiedTemp0RecoveryAdmission) {
    openArgs.push("--verifiedTemp0RecoveryAdmission", manifestPath);
  }
  const result = runAtomResult(
    "open-last-city-module-and-area-toolset-no-global-input.mjs",
    openArgs,
    360000,
    { AURORA_TOOLSET_CANONICAL_SESSION_ENTRYPOINT: "1" },
  );
  const processes = toolsetProcessesSafe();
  const windows = visibleWindowsSafe();
  if (result.ok !== true || processes.length !== 1) {
    manifest.status = "failed";
    manifest.blockerCode = result.blockerCode ?? "BINARY_NATIVE_GEOMETRY_OPEN_UNVERIFIED";
    manifest.openFailure = { completedAt: new Date().toISOString(), startupAdmission, child: result, postChildProcesses: processes, postChildWindows: windows };
    manifest.updatedAt = new Date().toISOString();
    writeJson(manifestPath, manifest);
    fail(manifest.blockerCode, JSON.stringify(manifest.openFailure));
  }
  try {
    assertExactOpenOwnershipResult(result, verifiedTemp0RecoveryAdmission);
  } catch (error) {
    manifest.status = "failed";
    manifest.blockerCode = error.code ?? "BINARY_NATIVE_EXPLICIT_OPEN_OWNERSHIP_UNVERIFIED";
    manifest.openFailure = { completedAt: new Date().toISOString(), startupAdmission, child: result, postChildProcesses: processes, postChildWindows: windows, error: String(error?.message ?? error) };
    manifest.updatedAt = new Date().toISOString();
    writeJson(manifestPath, manifest);
    throw error;
  }
  manifest.status = "module_ready";
  manifest.open = {
    completedAt: new Date().toISOString(),
    startupAdmission,
    verifiedTemp0RecoveryAdmission,
    result,
    process: processes[0],
  };
  manifest.updatedAt = new Date().toISOString();
  writeJson(manifestPath, manifest);
  return { ok: true, command: "open", status: "binary_native_geometry_module_ready", manifestPath, process: processes[0], safety: safety(true) };
}

function resumeOpenModuleDialogReadbackUnavailable(area, dryRun, structural) {
  if (!existsSync(manifestPath)) fail("BINARY_NATIVE_OPEN_DIALOG_RESUME_MANIFEST_MISSING", manifestPath);
  const manifest = readJson(manifestPath);
  const failure = manifest.openFailure;
  const child = failure?.child;
  const failedProcesses = failure?.postChildProcesses;
  const failedWindows = failure?.postChildWindows;
  const expectedDiagnostic = `module_name_edit_readback_mismatch:expected=${profile.module.resref}:actual=`;
  const exactPriorGenericResumeRefusal =
    manifest.blockerCode === "unowned_open_module_dialog_detected"
    && manifest.openDialogReadbackResumeFailure?.result?.childResult?.blockerCode === "unowned_open_module_dialog_detected"
    && manifest.openDialogReadbackResumeFailure?.result?.childResult?.openModuleDialogProbe?.title === "Open"
    && manifest.openDialogReadbackExactContinuation == null;
  if (
    manifest.version !== "aurora-toolset-binary-native-geometry-manifest/v1"
    || manifest.status !== "failed"
    || (manifest.blockerCode !== "binary_native_child_process_failed" && !exactPriorGenericResumeRefusal)
    || manifest.profileSha256 !== sha256(profilePath)
    || resolve(manifest.artifactDir ?? "") !== outDir
    || manifest.module?.resref !== profile.module.resref
    || manifest.module?.sha256 !== profile.module.sha256
    || child?.blockerCode !== "binary_native_child_process_failed"
    || child?.childScript !== "open-last-city-module-and-area-toolset-no-global-input.mjs"
    || child?.childExitCode !== 1
    || !String(child?.childStderr ?? "").includes(expectedDiagnostic)
    || !Array.isArray(child?.childArgs)
    || !child.childArgs.includes(profile.module.path)
    || !child.childArgs.includes(profile.area.resref)
    || !Array.isArray(failedProcesses)
    || failedProcesses.length !== 1
    || failedProcesses[0]?.Responding !== true
    || failedWindows?.ok !== true
    || Number(failedWindows?.processId) !== Number(failedProcesses[0]?.Id)
  ) {
    fail("BINARY_NATIVE_OPEN_DIALOG_RESUME_PACKET_NOT_ADMITTED", JSON.stringify({ manifest, expectedDiagnostic }));
  }
  if (sha256(profile.module.path) !== profile.module.sha256) {
    fail("BINARY_NATIVE_OPEN_DIALOG_RESUME_MODULE_DRIFT", profile.module.path);
  }
  const processes = toolsetProcesses();
  const windows = visibleWindowsSafe();
  const failedProcess = failedProcesses[0];
  const failedOpen = (failedWindows.windows ?? []).filter((window) => window.className === "TdlgModuleSelect" && window.text === "Open");
  const failedFrame = (failedWindows.windows ?? []).filter((window) => window.className === "TfrmFrame");
  const currentOpen = (windows.windows ?? []).filter((window) => window.className === "TdlgModuleSelect" && window.text === "Open");
  const currentFrame = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame");
  const unexpected = (windows.windows ?? []).filter((window) => !["TdlgModuleSelect", "TfrmFrame", "TApplication"].includes(window.className));
  if (
    processes.length !== 1
    || processes[0].Responding !== true
    || Number(processes[0].Id) !== Number(failedProcess.Id)
    || String(processes[0].StartTime) !== String(failedProcess.StartTime)
    || windows.ok !== true
    || Number(windows.processId) !== Number(failedProcess.Id)
    || windows.responding !== true
    || failedOpen.length !== 1
    || failedFrame.length !== 1
    || currentOpen.length !== 1
    || currentFrame.length !== 1
    || unexpected.length !== 0
    || Number(currentOpen[0].hwnd) !== Number(failedOpen[0].hwnd)
    || Number(currentFrame[0].hwnd) !== Number(failedFrame[0].hwnd)
    || currentFrame[0].text !== failedFrame[0].text
  ) {
    fail("BINARY_NATIVE_OPEN_DIALOG_RESUME_WINDOW_DRIFT", JSON.stringify({ failedProcesses, failedWindows, processes, windows }));
  }
  const guard = existsSync(moduleOpenSessionGuardPath) ? readJson(moduleOpenSessionGuardPath) : null;
  if (
    !["acquired_before_toolset_command", "module_open_failed"].includes(guard?.state)
    || resolve(guard.modulePath ?? "") !== resolve(profile.module.path)
    || guard.expectedAreaResref !== profile.area.resref
    || (guard.state === "module_open_failed" && guard.blockerCode !== "unowned_open_module_dialog_detected")
  ) {
    fail("BINARY_NATIVE_OPEN_DIALOG_RESUME_GUARD_MISMATCH", JSON.stringify(guard));
  }
  if (dryRun) {
    return {
      ok: true,
      command: "resume-open-module-dialog-readback-unavailable-dry-run",
      status: "binary_native_open_dialog_readback_unavailable_resume_admitted",
      manifestPath,
      process: processes[0],
      dialog: currentOpen[0],
      frame: currentFrame[0],
      structural,
      startsToolset: false,
      startsNwn: false,
      usesGlobalInput: false,
      safety: { ...safety(false), rejectsPreExistingToolsetSession: false, adoptsExactExistingToolsetSession: true },
    };
  }

  const openArgs = [
    "--modulePath", installedModulePath ?? profile.module.path,
    "--timeoutMs", "180000",
    "--expectedDialogHwnd", String(currentOpen[0].hwnd),
    "--expectedFrameHwnd", String(currentFrame[0].hwnd),
    "--expectedMonitor", "\\\\.\\DISPLAY1",
    "--repositionToFrameMonitor", "true",
  ];
  const result = runAtomResult(
    "open-aurora-toolset-module-from-dialog-no-global-input.mjs",
    openArgs,
    240000,
  );
  const postProcesses = toolsetProcessesSafe();
  const postWindows = visibleWindowsSafe();
  if (
    result.ok !== true
    || Number(result.processId) !== Number(failedProcess.Id)
    || Number(result.dialogHwnd) !== Number(currentOpen[0].hwnd)
    || Number(result.frameHwnd) !== Number(currentFrame[0].hwnd)
    || result.moduleName !== profile.module.resref
    || !String(result.titleAfter ?? "").trimEnd().toLowerCase().endsWith(` - ${profile.module.resref}.mod`.toLowerCase())
    || postProcesses.length !== 1
    || Number(postProcesses[0].Id) !== Number(failedProcess.Id)
    || String(postProcesses[0].StartTime) !== String(failedProcess.StartTime)
  ) {
    manifest.openDialogReadbackResumeFailure = {
      completedAt: new Date().toISOString(), result, postProcesses, postWindows,
    };
    manifest.updatedAt = new Date().toISOString();
    writeJson(manifestPath, manifest);
    fail(result.blockerCode ?? "BINARY_NATIVE_OPEN_DIALOG_RESUME_UNVERIFIED", JSON.stringify(manifest.openDialogReadbackResumeFailure));
  }
  const postOpenDialogs = (postWindows.windows ?? []).filter((window) => window.className === "TdlgModuleSelect" && window.text === "Open");
  const postFrames = (postWindows.windows ?? []).filter((window) => window.className === "TfrmFrame");
  if (
    postOpenDialogs.length !== 0
    || postFrames.length !== 1
    || Number(postFrames[0].hwnd) !== Number(currentFrame[0].hwnd)
    || postFrames[0].text.trimEnd().toLowerCase() !== String(result.titleAfter).trimEnd().toLowerCase()
  ) {
    fail("BINARY_NATIVE_OPEN_DIALOG_RESUME_POST_STATE_INVALID", JSON.stringify({ result, postWindows }));
  }
  writeJson(moduleOpenSessionGuardPath, {
    ...guard,
    state: "module_ready",
    blockerCode: null,
    moduleOpenActionSubmitted: true,
    moduleOpenActionKind: "exact_existing_tdlgmoduleselect_continuation",
    selectedModuleListItem: profile.module.resref,
    updatedAt: new Date().toISOString(),
  });
  manifest.status = "module_ready";
  manifest.blockerCode = null;
  manifest.openDialogReadbackContinuation = {
    completedAt: new Date().toISOString(),
    admission: { process: processes[0], dialog: currentOpen[0], frame: currentFrame[0] },
    result,
    process: postProcesses[0],
    postWindows,
  };
  manifest.openDialogReadbackExactContinuation = {
    exactOriginalListSelectionDiagnostic: expectedDiagnostic,
    exactPidAndWindowAdmission: true,
    dedicatedDialogTransport: "open-aurora-toolset-module-from-dialog-no-global-input.mjs",
    result,
  };
  manifest.open = {
    completedAt: manifest.openDialogReadbackContinuation.completedAt,
    startupAdmission: manifest.startupAdmission,
    result,
    process: postProcesses[0],
    resumedExactProcess: true,
  };
  manifest.updatedAt = new Date().toISOString();
  writeJson(manifestPath, manifest);
  return {
    ok: true,
    command: "resume-open-module-dialog-readback-unavailable",
    status: "binary_native_geometry_module_ready",
    manifestPath,
    process: postProcesses[0],
    safety: { ...safety(false), rejectsPreExistingToolsetSession: false, adoptsExactExistingToolsetSession: true },
  };
}

function resumeVerifiedTemp0Recovery(area, dryRun, structural, { clientClickFallback = false } = {}) {
  if (!existsSync(manifestPath)) fail("BINARY_NATIVE_VERIFIED_TEMP0_RECOVERY_MANIFEST_MISSING", manifestPath);
  const manifest = readJson(manifestPath);
  const exactPriorResumeFailure =
    manifest.blockerCode === "verified_temp0_recovery_admission_invalid"
    && manifest.resumeFailure?.child?.blockerCode === "verified_temp0_recovery_admission_invalid"
    && manifest.resumeFailure?.child?.childResult?.message === "verified_temp0_recovery_owner_manifest_mismatch"
    && Array.isArray(manifest.resumeFailure?.postChildProcesses)
    && manifest.resumeFailure.postChildProcesses.length === 1
    && manifest.resumeFailure.postChildProcesses[0]?.Responding === true;
  const exactClientClickFallbackFailure =
    manifest.blockerCode === "toolset_verified_temp0_recovery_prompt_did_not_close"
    && manifest.resumeFailure?.child?.blockerCode === "toolset_verified_temp0_recovery_prompt_did_not_close"
    && manifest.resumeFailure?.child?.childScript === "open-last-city-module-and-area-toolset-no-global-input.mjs"
    && manifest.resumeFailure?.child?.childExitCode === 2
    && manifest.resumeFailure?.child?.childResult?.blockerCode === "toolset_verified_temp0_recovery_prompt_did_not_close"
    && manifest.resumeFailure?.child?.childResult?.recoveryConfirmationHandledCount === 1
    && Array.isArray(manifest.resumeFailure?.postChildProcesses)
    && manifest.resumeFailure.postChildProcesses.length === 1
    && manifest.resumeFailure.postChildProcesses[0]?.Responding === true;
  if (
    manifest.version !== "aurora-toolset-binary-native-geometry-manifest/v1"
    || manifest.status !== "failed"
    || (manifest.blockerCode !== "binary_native_child_process_failed" && !exactPriorResumeFailure && !exactClientClickFallbackFailure)
    || (clientClickFallback && (!exactClientClickFallbackFailure || manifest.verifiedTemp0RecoveryClientClickFallback != null))
    || (!clientClickFallback && exactClientClickFallbackFailure)
    || manifest.profileSha256 !== sha256(profilePath)
    || resolve(manifest.artifactDir ?? "") !== outDir
    || manifest.module?.resref !== profile.module.resref
    || manifest.module?.sha256 !== profile.module.sha256
  ) {
    fail("BINARY_NATIVE_VERIFIED_TEMP0_RECOVERY_MANIFEST_NOT_ADMITTED", JSON.stringify({
      version: manifest.version,
      status: manifest.status,
      blockerCode: manifest.blockerCode,
      profileSha256: manifest.profileSha256,
      artifactDir: manifest.artifactDir,
      module: manifest.module,
    }));
  }
  const verifiedTemp0RecoveryAdmission = revalidateManifestTemp0RecoveryAdmission(manifest);
  if (!verifiedTemp0RecoveryAdmission) fail("BINARY_NATIVE_VERIFIED_TEMP0_RECOVERY_ADMISSION_MISSING", manifestPath);
  const failurePacket = exactClientClickFallbackFailure ? manifest.resumeFailure : manifest.openFailure;
  const failedChild = failurePacket?.child;
  const failedProcesses = failurePacket?.postChildProcesses;
  const failedWindows = failurePacket?.postChildWindows;
  if (
    failedChild?.blockerCode !== (clientClickFallback ? "toolset_verified_temp0_recovery_prompt_did_not_close" : "binary_native_child_process_failed")
    || failedChild?.childScript !== "open-last-city-module-and-area-toolset-no-global-input.mjs"
    || failedChild?.childExitCode !== (clientClickFallback ? 2 : 1)
    || (!clientClickFallback && failedChild?.childResult != null)
    || (clientClickFallback && failedChild?.childResult?.blockerCode !== "toolset_verified_temp0_recovery_prompt_did_not_close")
    || !Array.isArray(failedProcesses)
    || failedProcesses.length !== 1
    || failedProcesses[0].Responding !== true
    || failedWindows?.ok !== true
    || Number(failedWindows?.processId) !== Number(failedProcesses[0].Id)
  ) {
    fail("BINARY_NATIVE_VERIFIED_TEMP0_RECOVERY_FAILURE_PACKET_MISMATCH", JSON.stringify({
      failedChild,
      failedProcesses,
      failedWindows,
    }));
  }
  const processes = toolsetProcesses();
  const windows = visibleWindowsSafe();
  const failedProcess = failedProcesses[0];
  if (
    processes.length !== 1
    || processes[0].Responding !== true
    || Number(processes[0].Id) !== Number(failedProcess.Id)
    || String(processes[0].StartTime) !== String(failedProcess.StartTime)
  ) {
    fail("BINARY_NATIVE_VERIFIED_TEMP0_RECOVERY_PROCESS_DRIFT", JSON.stringify({ failedProcess, processes }));
  }
  const failureWindowSet = failedWindows.windows ?? [];
  const failureConfirmation = failureWindowSet.filter((window) => window.className === "#32770" && window.text === "Confirmation");
  const failureFrames = failureWindowSet.filter((window) => window.className === "TfrmFrame");
  const currentWindowSet = windows.windows ?? [];
  const currentConfirmation = currentWindowSet.filter((window) => window.className === "#32770" && window.text === "Confirmation");
  const currentFrames = currentWindowSet.filter((window) => window.className === "TfrmFrame");
  if (
    windows.ok !== true
    || Number(windows.processId) !== Number(failedProcess.Id)
    || windows.responding !== true
    || failureConfirmation.length !== 1
    || failureFrames.length !== 1
    || currentConfirmation.length !== 1
    || currentFrames.length !== 1
    || Number(currentConfirmation[0].hwnd) !== Number(failureConfirmation[0].hwnd)
    || Number(currentFrames[0].hwnd) !== Number(failureFrames[0].hwnd)
    || currentFrames[0].text !== failureFrames[0].text
  ) {
    fail("BINARY_NATIVE_VERIFIED_TEMP0_RECOVERY_WINDOW_DRIFT", JSON.stringify({ failedWindows, windows }));
  }
  if (dryRun) {
    return {
      ok: true,
      command: clientClickFallback ? "resume-verified-temp0-recovery-client-click-dry-run" : "resume-verified-temp0-recovery-dry-run",
      status: clientClickFallback ? "binary_native_verified_temp0_recovery_client_click_resume_admitted" : "binary_native_verified_temp0_recovery_resume_admitted",
      manifestPath,
      process: processes[0],
      confirmation: currentConfirmation[0],
      frame: currentFrames[0],
      structural,
      verifiedTemp0RecoveryAdmission,
      startsToolset: false,
      usesGlobalInput: false,
      safety: {
        ...safety(false),
        rejectsPreExistingToolsetSession: false,
        adoptsExactExistingToolsetSession: true,
      },
    };
  }
  if (clientClickFallback) {
    const fallbackProbe = manifest.resumeFailure.child.childResult.recoveryAfter;
    const fallback = runAtomResult("post-aurora-toolset-verified-temp0-recovery-client-click-no-global-input.mjs", [
      "--expectedPid", String(failedProcess.Id),
      "--expectedDialogHwnd", String(currentConfirmation[0].hwnd),
      "--expectedButtonHwnd", String(fallbackProbe?.yesButtonHwnd ?? ""),
    ], 20_000);
    if (fallback.ok !== true) {
      manifest.verifiedTemp0RecoveryClientClickFallback = { completedAt: new Date().toISOString(), status: "failed", result: fallback };
      manifest.updatedAt = new Date().toISOString();
      writeJson(manifestPath, manifest);
      fail(fallback.blockerCode ?? "BINARY_NATIVE_VERIFIED_TEMP0_RECOVERY_CLIENT_CLICK_UNVERIFIED", JSON.stringify(fallback));
    }
    manifest.verifiedTemp0RecoveryClientClickFallback = { completedAt: new Date().toISOString(), status: "acknowledged", result: fallback };
    manifest.updatedAt = new Date().toISOString();
    writeJson(manifestPath, manifest);
  }
  const openArgs = [
    "--modulePath", installedModulePath ?? profile.module.path,
    "--expectedModuleParts", `${profile.module.resref}|mod`,
    "--area", profile.area.resref,
    "--areaName", area.displayName,
    "--windowLeft", "-1920", "--windowTop", "0", "--skipAreaOpen", "true",
    "--startupPassiveObservationMs", "0",
    "--allowExistingToolset", "true",
    "--allowReuseOpenSession", "true",
    "--verifiedTemp0RecoveryAdmission", manifestPath,
    ...(clientClickFallback ? ["--verifiedTemp0RecoveryActionAlreadySubmitted", "true"] : []),
  ];
  const result = runAtomResult(
    "open-last-city-module-and-area-toolset-no-global-input.mjs",
    openArgs,
    360000,
    { AURORA_TOOLSET_CANONICAL_SESSION_ENTRYPOINT: "1" },
  );
  const postProcesses = toolsetProcessesSafe();
  const postWindows = visibleWindowsSafe();
  if (
    result.ok !== true
    || postProcesses.length !== 1
    || Number(postProcesses[0].Id) !== Number(failedProcess.Id)
    || String(postProcesses[0].StartTime) !== String(failedProcess.StartTime)
  ) {
    manifest.resumeFailure = {
      completedAt: new Date().toISOString(),
      child: result,
      postChildProcesses: postProcesses,
      postChildWindows: postWindows,
    };
    manifest.updatedAt = new Date().toISOString();
    writeJson(manifestPath, manifest);
    fail(result.blockerCode ?? "BINARY_NATIVE_VERIFIED_TEMP0_RECOVERY_RESUME_UNVERIFIED", JSON.stringify(manifest.resumeFailure));
  }
  assertExactOpenOwnershipResult(result, verifiedTemp0RecoveryAdmission);
  manifest.status = "module_ready";
  manifest.blockerCode = null;
  manifest.verifiedTemp0RecoveryContinuation = {
    completedAt: new Date().toISOString(),
    originalFailureProcess: failedProcess,
    originalFailureWindows: failedWindows,
    dryRunAdmission: {
      process: processes[0],
      confirmation: currentConfirmation[0],
      frame: currentFrames[0],
    },
    result,
    process: postProcesses[0],
    postWindows,
  };
  manifest.open = {
    completedAt: manifest.verifiedTemp0RecoveryContinuation.completedAt,
    startupAdmission: manifest.startupAdmission,
    verifiedTemp0RecoveryAdmission,
    result,
    process: postProcesses[0],
    resumedExactProcess: true,
  };
  manifest.updatedAt = new Date().toISOString();
  writeJson(manifestPath, manifest);
  return {
    ok: true,
    command: "resume-verified-temp0-recovery",
    status: "binary_native_geometry_module_ready",
    manifestPath,
    process: postProcesses[0],
    safety: {
      ...safety(false),
      rejectsPreExistingToolsetSession: false,
      adoptsExactExistingToolsetSession: true,
    },
  };
}

function assertExactOpenOwnershipResult(result, verifiedTemp0RecoveryAdmission) {
  const moduleResult = result?.moduleOpen ?? result;
  const expectedTitleSuffix = ` - ${profile.module.resref}.mod`;
  const actualTitle = String(moduleResult?.moduleWindowTitle ?? "").trimEnd().toLowerCase();
  const exactTitle = actualTitle.endsWith(expectedTitleSuffix.toLowerCase());
  const explicitOpen =
    moduleResult?.moduleLoadOwner === "explicit_open"
    && moduleResult?.moduleOpenActionSubmitted === true
    && moduleResult?.openModuleDialogResult?.matchedBy === "expected_module_exact_text";
  const verifiedRecovery =
    verifiedTemp0RecoveryAdmission != null
    && moduleResult?.moduleLoadOwner === "verified_temp0_recovery"
    && moduleResult?.moduleOpenActionSubmitted === true
    && ["verified_temp0_recovery_yes", "verified_temp0_recovery_yes_client_click"].includes(moduleResult?.moduleOpenActionKind)
    && moduleResult?.recoveryConfirmationHandled === true
    && moduleResult?.recoveryConfirmationHandledCount === 1;
  if ((!explicitOpen && !verifiedRecovery) || !exactTitle) {
    fail("BINARY_NATIVE_EXPLICIT_OPEN_OWNERSHIP_UNVERIFIED", JSON.stringify({
      expectedTitleSuffix,
      moduleLoadOwner: moduleResult?.moduleLoadOwner ?? null,
      moduleOpenActionSubmitted: moduleResult?.moduleOpenActionSubmitted ?? null,
      moduleOpenActionKind: moduleResult?.moduleOpenActionKind ?? null,
      selectedItem: moduleResult?.openModuleDialogResult?.selectedItemText ?? null,
      matchedBy: moduleResult?.openModuleDialogResult?.matchedBy ?? null,
      recoveryConfirmationHandled: moduleResult?.recoveryConfirmationHandled ?? null,
      recoveryConfirmationHandledCount: moduleResult?.recoveryConfirmationHandledCount ?? null,
      moduleWindowTitle: moduleResult?.moduleWindowTitle ?? null,
    }));
  }
}

function resumeCleanAreaCreateAdmission(dryRun) {
  if (!areaCreateStructuralProfile) {
    fail("BINARY_NATIVE_CLEAN_AREA_CREATE_PROFILE_REQUIRED", profile.id);
  }
  if (!existsSync(manifestPath)) {
    fail("BINARY_NATIVE_GEOMETRY_MANIFEST_MISSING", manifestPath);
  }
  const manifest = readJson(manifestPath);
  const queueManifestPath = resolve(outDir, "area-open", "manifest.json");
  if (!existsSync(queueManifestPath)) {
    fail("BINARY_NATIVE_CLEAN_AREA_CREATE_QUEUE_MISSING", queueManifestPath);
  }
  const queueManifest = readJson(queueManifestPath);
  const processes = toolsetProcesses();
  const windows = atom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const admission = validateCleanAreaCreateAdmission({
    profile,
    expectedProfileSha256: sha256(profilePath),
    manifest,
    queueManifest,
    processes,
    windows,
  });
  const moduleStat = statSync(profile.module.path);
  const manifestCreatedAtMs = Date.parse(manifest.createdAt);
  if (!Number.isFinite(manifestCreatedAtMs)
    || moduleStat.size <= 0
    || moduleStat.mtimeMs > manifestCreatedAtMs) {
    fail("BINARY_NATIVE_CLEAN_AREA_CREATE_MODULE_FILE_DRIFT", JSON.stringify({
      moduleBytes: moduleStat.size,
      moduleLastWriteTimeUtc: moduleStat.mtime.toISOString(),
      manifestCreatedAt: manifest.createdAt ?? null,
    }));
  }
  const result = {
    ok: true,
    command: dryRun ? "resume-clean-area-create-admission-dry-run" : "resume-clean-area-create-admission",
    status: dryRun ? "binary_native_clean_area_create_admitted" : "area_create_native_clean_open_verified",
    manifestPath,
    cleanModuleAccepted: true,
    nativeSaveClaimed: false,
    proofClaimed: false,
    runtimeClaimed: false,
    process: admission.process,
    frame: admission.frame,
    areaViewer: admission.areaViewer,
    moduleFileObservation: {
      path: profile.module.path,
      bytes: moduleStat.size,
      lastWriteTimeUtc: moduleStat.mtime.toISOString(),
      preOpenSha256: profile.module.sha256,
      unchangedSinceStructuralPreflight: true,
      sha256RevalidationDeferredUntilToolsetClose: true,
    },
    safety: {
      ...safety(false),
      adoptsExactExistingToolsetSession: true,
      sendsSaveCommand: false,
    },
  };
  if (dryRun) return result;

  manifest.priorNativeSaveFailure = {
    blockerCode: manifest.blockerCode,
    error: manifest.error ?? null,
    updatedAt: manifest.updatedAt ?? null,
  };
  manifest.status = "area_create_native_clean_open_verified";
  manifest.blockerCode = null;
  delete manifest.error;
  manifest.nativeSave = {
    ...manifest.nativeSave,
    saveRequired: false,
    cleanModuleAccepted: true,
    nativeSaveClaimed: false,
    statusText: "Module remained clean; no native Save command was submitted.",
  };
  manifest.cleanAreaCreateAdmission = result;
  manifest.queue = { path: resolve(outDir, "binary-native-area-queue.json"), manifestPath: queueManifestPath };
  manifest.updatedAt = new Date().toISOString();
  writeJson(manifestPath, manifest);
  return result;
}

function resumeCleanAreaCreateNoopDirtyRoundtrip(dryRun) {
  if (!areaCreateStructuralProfile) {
    fail("BINARY_NATIVE_CLEAN_AREA_CREATE_PROFILE_REQUIRED", profile.id);
  }
  const manifest = requireManifest("area_create_native_clean_open_verified");
  if (manifest?.cleanAreaCreateAdmission?.cleanModuleAccepted !== true
    || manifest?.cleanAreaCreateAdmission?.nativeSaveClaimed !== false
    || manifest?.nativeSave?.cleanModuleAccepted !== true
    || manifest?.nativeSave?.saveRequired !== false) {
    fail("BINARY_NATIVE_CLEAN_AREA_CREATE_ADMISSION_MISSING", manifestPath);
  }
  const sourceTile = profile.area.tiles?.find((tile) => tile?.row === 0 && tile?.col === 0);
  const expectedTileModel = text(options.expectedTileModel) ? options.expectedTileModel.trim().toLowerCase() : null;
  const expectedX = Number(options.expectedX);
  const expectedY = Number(options.expectedY);
  const expectedWorldX = sourceTile ? (Number(sourceTile.col) * 10) + 5 : Number.NaN;
  const expectedWorldY = sourceTile ? (Number(sourceTile.row) * 10) + 5 : Number.NaN;
  if (!sourceTile
    || !expectedTileModel
    || !Number.isFinite(expectedX)
    || !Number.isFinite(expectedY)
    || expectedX !== expectedWorldX
    || expectedY !== expectedWorldY
    || !Number.isInteger(sourceTile.tileId)
    || !Number.isInteger(sourceTile.orientation)
    || !Number.isInteger(sourceTile.mainLight1)
    || sourceTile.mainLight1 < 0
    || sourceTile.mainLight1 > 31
    || ![0, 1].includes(sourceTile.animLoop1)
    || sourceTile.animLoop2 !== sourceTile.animLoop1
    || sourceTile.animLoop3 !== sourceTile.animLoop1) {
    fail("BINARY_NATIVE_CLEAN_AREA_CREATE_NOOP_TRANSACTION_INVALID", JSON.stringify({
      sourceTile: sourceTile ?? null,
      expectedTileModel,
      expectedX,
      expectedY,
      expectedWorldX,
      expectedWorldY,
    }));
  }
  const processes = toolsetProcesses();
  const admittedProcess = manifest.cleanAreaCreateAdmission.process;
  if (processes.length !== 1
    || processes[0]?.Responding !== true
    || processes[0]?.Id !== admittedProcess?.Id
    || processes[0]?.StartTime !== admittedProcess?.StartTime) {
    fail("BINARY_NATIVE_CLEAN_AREA_CREATE_PROCESS_BINDING_INVALID", JSON.stringify(processes));
  }
  const beforeWindows = atom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const beforeFrames = beforeWindows.windows?.filter((window) => window?.className === "TfrmFrame") ?? [];
  const beforeUnexpected = beforeWindows.windows?.filter((window) => !["TfrmFrame", "TApplication"].includes(window?.className)) ?? [];
  if (beforeWindows.responding !== true
    || beforeWindows.processId !== admittedProcess.Id
    || beforeFrames.length !== 1
    || beforeUnexpected.length !== 0
    || beforeFrames[0].text.endsWith("*")
    || !beforeFrames[0].text.toLowerCase().endsWith(` - ${profile.module.resref}.mod`.toLowerCase())) {
    fail("BINARY_NATIVE_CLEAN_AREA_CREATE_NOOP_PREFLIGHT_INVALID", JSON.stringify(beforeWindows));
  }
  const plan = {
    expectedSelection: {
      area: profile.area.resref,
      model: expectedTileModel,
      tileId: sourceTile.tileId,
      orientation: sourceTile.orientation,
      x: expectedX,
      y: expectedY,
    },
    nativeTransaction: {
      field: "mainLight1",
      expectedValue: sourceTile.mainLight1,
      value: sourceTile.mainLight1,
      animationLoopState: sourceTile.animLoop1,
      semanticDeltaClaimed: false,
      purpose: "obtain the Toolset dirty-to-saved transition without changing the profile-bound Area semantics",
    },
  };
  if (dryRun) {
    return {
      ok: true,
      command: "resume-clean-area-create-noop-dirty-roundtrip-dry-run",
      status: "binary_native_clean_area_create_noop_dirty_roundtrip_admitted",
      manifestPath,
      plan,
      process: processes[0],
      safety: { ...safety(false), adoptsExactExistingToolsetSession: true, mutatesOnDryRun: false },
    };
  }

  const queuePath = resolve(outDir, "binary-native-noop-dirty-area-queue.json");
  writeJson(queuePath, [{ name: profile.area.displayName, resref: profile.area.resref }]);
  const areaOpen = runAtom("run-toolset-area-oracle-queue.mjs", [
    "--queue", queuePath,
    "--expectedModule", `${profile.module.resref}.mod`,
    "--expectedModuleParts", `${profile.module.resref}|mod`,
    "--outDir", resolve(outDir, "noop-dirty-area-open"),
    "--capture", "false",
  ], 120000);
  if (areaOpen.status !== "completed") {
    fail("BINARY_NATIVE_CLEAN_AREA_CREATE_NOOP_AREA_OPEN_UNVERIFIED", JSON.stringify(areaOpen));
  }
  const noModalPreflight = runAtom("preflight-aurora-toolset-no-modal-no-global-input.mjs", ["--module", `${profile.module.resref}.mod`]);
  const transaction = runAtom("invoke-aurora-toolset-tile-properties-gui-thread-bridge.mjs", [
    "--module", `${profile.module.resref}.mod`,
    "--area", profile.area.resref,
    "--dialogAction", "set-main-light-1",
    "--swatchIndex", String(sourceTile.mainLight1),
    "--expectedAnimationLoopState", String(sourceTile.animLoop1),
    "--model", expectedTileModel,
    "--tileId", String(sourceTile.tileId),
    "--orientation", String(sourceTile.orientation),
    "--x", String(expectedX),
    "--y", String(expectedY),
    "--out", resolve(outDir, "noop-dirty-tile-properties.json"),
  ], 60000);
  const afterWindows = atom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const afterFrames = afterWindows.windows?.filter((window) => window?.className === "TfrmFrame") ?? [];
  const afterUnexpected = afterWindows.windows?.filter((window) => !["TfrmFrame", "TApplication"].includes(window?.className)) ?? [];
  if (afterWindows.responding !== true
    || afterWindows.processId !== admittedProcess.Id
    || afterFrames.length !== 1
    || afterUnexpected.length !== 0
    || afterFrames[0].hwnd !== beforeFrames[0].hwnd
    || !afterFrames[0].text.endsWith("*")
    || !afterFrames[0].text.slice(0, -1).toLowerCase().endsWith(` - ${profile.module.resref}.mod`.toLowerCase())) {
    fail("BINARY_NATIVE_CLEAN_AREA_CREATE_NOOP_DIRTY_MARKER_UNVERIFIED", JSON.stringify(afterWindows));
  }
  manifest.status = "module_ready";
  manifest.blockerCode = null;
  manifest.nativeNoOpDirtying = {
    completedAt: new Date().toISOString(),
    plan,
    areaOpen,
    noModalPreflight,
    transaction,
    frameBefore: beforeFrames[0],
    frameAfter: afterFrames[0],
    semanticDeltaClaimed: false,
    dirtyMarkerVerified: true,
    savePending: true,
  };
  manifest.updatedAt = new Date().toISOString();
  writeJson(manifestPath, manifest);
  return {
    ok: true,
    command: "resume-clean-area-create-noop-dirty-roundtrip",
    status: "binary_native_area_create_noop_dirty_ready_for_save",
    manifestPath,
    plan,
    dirtyMarkerVerified: true,
    semanticDeltaClaimed: false,
    next: "geometry-observe",
    safety: { ...safety(false), adoptsExactExistingToolsetSession: true, mutatesOnlyProfileBoundNoOpValue: true },
  };
}

function resumeCleanAreaCreateNoopAreaPropertiesDirtyRoundtrip(dryRun) {
  if (!areaCreateStructuralProfile) {
    fail("BINARY_NATIVE_CLEAN_AREA_CREATE_PROFILE_REQUIRED", profile.id);
  }
  if (!existsSync(manifestPath)) {
    fail("BINARY_NATIVE_GEOMETRY_MANIFEST_MISSING", manifestPath);
  }
  const manifest = readJson(manifestPath);
  const priorError = String(manifest?.error ?? "");
  const exactTileSelectionFailure = priorError.includes("invoke-aurora-toolset-tile-properties-gui-thread-bridge.mjs")
    && priorError.includes("invalid_terrain_selection_state:1:0:0");
  const exactAreaPropertiesTransportParseFailure = priorError.includes("invoke-aurora-toolset-area-properties-gui-thread-bridge.mjs")
    && priorError.includes("Variable reference is not valid")
    && priorError.includes("exact_dialog_action_button_missing:$buttonText:");
  if (manifest?.status !== "failed"
    || manifest?.blockerCode !== "binary_native_child_process_failed"
    || (!exactTileSelectionFailure && !exactAreaPropertiesTransportParseFailure)
    || manifest?.nativeNoOpDirtying != null
    || manifest?.cleanAreaCreateAdmission?.cleanModuleAccepted !== true
    || manifest?.cleanAreaCreateAdmission?.nativeSaveClaimed !== false) {
    fail("BINARY_NATIVE_CLEAN_AREA_CREATE_AREA_PROPERTIES_CONTINUATION_NOT_AUTHORIZED", JSON.stringify({
      status: manifest?.status ?? null,
      blockerCode: manifest?.blockerCode ?? null,
      hasExactSelectionFailure: exactTileSelectionFailure,
      hasExactAreaPropertiesTransportParseFailure: exactAreaPropertiesTransportParseFailure,
      hasNativeNoOpDirtying: manifest?.nativeNoOpDirtying != null,
    }));
  }
  const processes = toolsetProcesses();
  const admittedProcess = manifest.cleanAreaCreateAdmission.process;
  if (processes.length !== 1
    || processes[0]?.Responding !== true
    || processes[0]?.Id !== admittedProcess?.Id
    || processes[0]?.StartTime !== admittedProcess?.StartTime) {
    fail("BINARY_NATIVE_CLEAN_AREA_CREATE_PROCESS_BINDING_INVALID", JSON.stringify(processes));
  }
  const beforeWindows = atom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const beforeFrames = beforeWindows.windows?.filter((window) => window?.className === "TfrmFrame") ?? [];
  const beforeUnexpected = beforeWindows.windows?.filter((window) => !["TfrmFrame", "TApplication"].includes(window?.className)) ?? [];
  if (beforeWindows.responding !== true
    || beforeWindows.processId !== admittedProcess.Id
    || beforeFrames.length !== 1
    || beforeUnexpected.length !== 0
    || beforeFrames[0].text.endsWith("*")
    || !beforeFrames[0].text.toLowerCase().endsWith(` - ${profile.module.resref}.mod`.toLowerCase())) {
    fail("BINARY_NATIVE_CLEAN_AREA_CREATE_AREA_PROPERTIES_PREFLIGHT_INVALID", JSON.stringify(beforeWindows));
  }
  const plan = {
    area: profile.area.resref,
    dialog: "TdlgAreaProperties",
    action: "OK",
    semanticDeltaClaimed: false,
    purpose: "obtain the Toolset dirty-to-saved transition by accepting unchanged Area Properties",
  };
  if (dryRun) {
    return {
      ok: true,
      command: "resume-clean-area-create-noop-area-properties-dirty-roundtrip-dry-run",
      status: "binary_native_clean_area_create_noop_area_properties_roundtrip_admitted",
      manifestPath,
      plan,
      process: processes[0],
      safety: { ...safety(false), adoptsExactExistingToolsetSession: true, mutatesOnDryRun: false },
    };
  }

  const noModalPreflight = runAtom("preflight-aurora-toolset-no-modal-no-global-input.mjs", ["--module", `${profile.module.resref}.mod`]);
  const transaction = runAtom("invoke-aurora-toolset-area-properties-gui-thread-bridge.mjs", [
    "--module", `${profile.module.resref}.mod`,
    "--area", profile.area.resref,
    "--dialogAction", "ok",
    "--out", resolve(outDir, "noop-dirty-area-properties.json"),
  ], 60000);
  const afterWindows = atom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const afterFrames = afterWindows.windows?.filter((window) => window?.className === "TfrmFrame") ?? [];
  const afterUnexpected = afterWindows.windows?.filter((window) => !["TfrmFrame", "TApplication"].includes(window?.className)) ?? [];
  if (transaction?.dialog?.closedWith !== "ok"
    || transaction?.dialog?.semanticDeltaClaimed !== false
    || afterWindows.responding !== true
    || afterWindows.processId !== admittedProcess.Id
    || afterFrames.length !== 1
    || afterUnexpected.length !== 0
    || afterFrames[0].hwnd !== beforeFrames[0].hwnd
    || !afterFrames[0].text.endsWith("*")
    || !afterFrames[0].text.slice(0, -1).toLowerCase().endsWith(` - ${profile.module.resref}.mod`.toLowerCase())) {
    fail("BINARY_NATIVE_CLEAN_AREA_CREATE_AREA_PROPERTIES_DIRTY_MARKER_UNVERIFIED", JSON.stringify({ transaction, afterWindows }));
  }
  manifest.priorNoOpTilePropertiesFailure = {
    blockerCode: manifest.blockerCode,
    error: manifest.error,
    updatedAt: manifest.updatedAt ?? null,
    failureKind: exactTileSelectionFailure ? "tile_selection_absent" : "area_properties_transport_parse_failure_before_action",
  };
  manifest.status = "module_ready";
  manifest.blockerCode = null;
  delete manifest.error;
  manifest.nativeAreaPropertiesNoOpDirtying = {
    completedAt: new Date().toISOString(),
    plan,
    noModalPreflight,
    transaction,
    frameBefore: beforeFrames[0],
    frameAfter: afterFrames[0],
    semanticDeltaClaimed: false,
    dirtyMarkerVerified: true,
    savePending: true,
  };
  manifest.updatedAt = new Date().toISOString();
  writeJson(manifestPath, manifest);
  return {
    ok: true,
    command: "resume-clean-area-create-noop-area-properties-dirty-roundtrip",
    status: "binary_native_area_create_noop_area_properties_dirty_ready_for_save",
    manifestPath,
    plan,
    dirtyMarkerVerified: true,
    semanticDeltaClaimed: false,
    next: "geometry-observe",
    safety: { ...safety(false), adoptsExactExistingToolsetSession: true, mutatesOnlyProfileBoundNoOpValue: true },
  };
}

function resumeModelFixtureCleanNoopAreaProperties(dryRun) {
  const cleanNoopProfileKind = classifyCleanNoopAreaPropertiesProfile(profile);
  if (areaCreateStructuralProfile || cleanNoopProfileKind == null) {
    fail("BINARY_NATIVE_MODEL_FIXTURE_PROFILE_REQUIRED", profile.id);
  }
  if (!existsSync(manifestPath)) fail("BINARY_NATIVE_GEOMETRY_MANIFEST_MISSING", manifestPath);
  const manifest = readJson(manifestPath);
  const moduleStat = statSync(profile.module.path);
  const lineage = validateCleanNoopAreaPropertiesLineage({
    profile,
    profilePath,
    profileSha256: sha256(profilePath),
    manifest,
    moduleStat,
  });
  const manifestError = String(manifest?.error ?? "");
  const priorError = String(manifest?.nativeSave?.error ?? manifest?.error ?? "");
  const openedModuleTitle = String(
    manifest?.open?.result?.titleAfter
      ?? manifest?.open?.result?.moduleOpen?.moduleWindowTitle
      ?? "",
  );
  const priorCleanNoopDirtying = cleanNoopProfileKind === "dynamic-placeable"
    ? manifest?.nativeCleanNoopAreaPropertiesDirtying
    : manifest?.nativeModelFixtureNoOpDirtying;
  const exactEmptyOnEnterTransportFailure = manifest?.blockerCode === "binary_native_child_process_failed"
    && manifestError.includes("invoke-aurora-toolset-area-properties-gui-thread-bridge.mjs")
    && manifestError.includes("on_enter_script_resource_missing::0:itemCount==");
  const authorized = manifest?.status === "failed"
    && (manifest?.blockerCode === "native_geometry_save_unverified" || exactEmptyOnEnterTransportFailure)
    && priorError.includes("module_not_dirty_before_save")
    && manifest?.nativeSave?.areaWasSaved === false
    && manifest?.nativeSave?.invalidLocationsDialog === false
    && manifest?.nativeSave?.inaccessibleObjectsDialog === false
    && priorCleanNoopDirtying == null
    && manifest?.open?.process?.Responding === true
    && openedModuleTitle.trimEnd().toLowerCase().endsWith(` - ${profile.module.resref}.mod`.toLowerCase());
  if (!authorized) {
    fail("BINARY_NATIVE_MODEL_FIXTURE_CLEAN_NOOP_NOT_AUTHORIZED", JSON.stringify({
      profileKind: cleanNoopProfileKind,
      status: manifest?.status ?? null,
      blockerCode: manifest?.blockerCode ?? null,
      hasExactCleanSaveFailure: priorError.includes("module_not_dirty_before_save"),
      exactEmptyOnEnterTransportFailure,
      openedModuleTitle: openedModuleTitle || null,
      nativeSave: manifest?.nativeSave ?? null,
    }));
  }
  if (lineage.moduleIntegrityMode === "immediate-sha256"
    && sha256(profile.module.path) !== profile.module.sha256) {
    fail("BINARY_NATIVE_MODEL_FIXTURE_CLEAN_NOOP_MODULE_DRIFT", profile.module.path);
  }
  const processes = toolsetProcesses();
  const admittedProcess = manifest.open.process;
  if (processes.length !== 1
    || processes[0]?.Responding !== true
    || processes[0]?.Id !== admittedProcess?.Id
    || processes[0]?.StartTime !== admittedProcess?.StartTime) {
    fail("BINARY_NATIVE_MODEL_FIXTURE_CLEAN_NOOP_PROCESS_DRIFT", JSON.stringify(processes));
  }
  const beforeWindows = atom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const beforeFrames = beforeWindows.windows?.filter((window) => window?.className === "TfrmFrame") ?? [];
  const beforeUnexpected = beforeWindows.windows?.filter((window) => !["TfrmFrame", "TApplication"].includes(window?.className)) ?? [];
  if (beforeWindows.responding !== true
    || beforeWindows.processId !== admittedProcess.Id
    || beforeFrames.length !== 1
    || beforeUnexpected.length !== 0
    || beforeFrames[0].text.endsWith("*")
    || !beforeFrames[0].text.toLowerCase().endsWith(` - ${profile.module.resref}.mod`.toLowerCase())) {
    fail("BINARY_NATIVE_MODEL_FIXTURE_CLEAN_NOOP_PREFLIGHT_INVALID", JSON.stringify(beforeWindows));
  }
  const plan = {
    area: profile.area.resref,
    dialog: "TdlgAreaProperties",
    action: "OK",
    profileKind: cleanNoopProfileKind,
    semanticDeltaClaimed: false,
    purpose: "obtain the native dirty-to-saved geometry transition by accepting unchanged Area Properties after an exact clean offline MOD open",
  };
  if (dryRun) {
    return {
      ok: true,
      command: "resume-model-fixture-clean-noop-area-properties-dry-run",
      status: cleanNoopProfileKind === "dynamic-placeable"
        ? "binary_native_dynamic_placeable_clean_noop_area_properties_admitted"
        : "binary_native_model_fixture_clean_noop_area_properties_admitted",
      manifestPath,
      plan,
      process: processes[0],
      moduleFileObservation: {
        path: profile.module.path,
        bytes: moduleStat.size,
        lastWriteTimeUtc: moduleStat.mtime.toISOString(),
        preOpenSha256: profile.module.sha256,
        moduleIntegrityMode: lineage.moduleIntegrityMode,
        sha256RevalidationDeferredUntilToolsetClose: lineage.sha256RevalidationDeferredUntilToolsetClose,
      },
      safety: { ...safety(false), adoptsExactExistingToolsetSession: true, mutatesOnDryRun: false },
    };
  }

  const noModalPreflight = runAtom("preflight-aurora-toolset-no-modal-no-global-input.mjs", ["--module", `${profile.module.resref}.mod`]);
  const transaction = runAtom("invoke-aurora-toolset-area-properties-gui-thread-bridge.mjs", [
    "--module", `${profile.module.resref}.mod`,
    "--area", profile.area.resref,
    "--dialogAction", "ok",
    "--out", resolve(outDir, cleanNoopProfileKind === "dynamic-placeable"
      ? "dynamic-placeable-noop-dirty-area-properties.json"
      : "model-fixture-noop-dirty-area-properties.json"),
  ], 60000);
  const afterWindows = atom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const afterFrames = afterWindows.windows?.filter((window) => window?.className === "TfrmFrame") ?? [];
  const afterUnexpected = afterWindows.windows?.filter((window) => !["TfrmFrame", "TApplication"].includes(window?.className)) ?? [];
  if (transaction?.dialog?.closedWith !== "ok"
    || transaction?.dialog?.semanticDeltaClaimed !== false
    || afterWindows.responding !== true
    || afterWindows.processId !== admittedProcess.Id
    || afterFrames.length !== 1
    || afterUnexpected.length !== 0
    || afterFrames[0].hwnd !== beforeFrames[0].hwnd
    || !afterFrames[0].text.endsWith("*")
    || !afterFrames[0].text.slice(0, -1).toLowerCase().endsWith(` - ${profile.module.resref}.mod`.toLowerCase())) {
    fail("BINARY_NATIVE_MODEL_FIXTURE_CLEAN_NOOP_DIRTY_MARKER_UNVERIFIED", JSON.stringify({ transaction, afterWindows }));
  }
  manifest.priorNativeSaveFailure = {
    blockerCode: manifest.blockerCode,
    error: manifest.error ?? null,
    nativeSave: manifest.nativeSave ?? null,
    updatedAt: manifest.updatedAt ?? null,
  };
  manifest.status = "module_ready";
  manifest.blockerCode = null;
  delete manifest.error;
  delete manifest.nativeSave;
  const dirtyingRecord = {
    completedAt: new Date().toISOString(),
    plan,
    lineage,
    moduleFileObservation: {
      path: profile.module.path,
      bytes: moduleStat.size,
      lastWriteTimeUtc: moduleStat.mtime.toISOString(),
      preOpenSha256: profile.module.sha256,
      moduleIntegrityMode: lineage.moduleIntegrityMode,
      sha256RevalidationDeferredUntilToolsetClose: lineage.sha256RevalidationDeferredUntilToolsetClose,
    },
    noModalPreflight,
    transaction,
    frameBefore: beforeFrames[0],
    frameAfter: afterFrames[0],
    semanticDeltaClaimed: false,
    dirtyMarkerVerified: true,
    savePending: true,
  };
  if (cleanNoopProfileKind === "dynamic-placeable") {
    manifest.nativeCleanNoopAreaPropertiesDirtying = dirtyingRecord;
  } else {
    manifest.nativeModelFixtureNoOpDirtying = dirtyingRecord;
  }
  manifest.updatedAt = new Date().toISOString();
  writeJson(manifestPath, manifest);
  return {
    ok: true,
    command: "resume-model-fixture-clean-noop-area-properties",
    status: cleanNoopProfileKind === "dynamic-placeable"
      ? "binary_native_dynamic_placeable_noop_area_properties_dirty_ready_for_save"
      : "binary_native_model_fixture_noop_area_properties_dirty_ready_for_save",
    manifestPath,
    plan,
    dirtyMarkerVerified: true,
    semanticDeltaClaimed: false,
    next: "geometry-observe",
    safety: { ...safety(false), adoptsExactExistingToolsetSession: true, mutatesOnlyProfileBoundNoOpValue: true },
  };
}

function observeGeometry(area) {
  const manifest = hiddenAreaContext?.manifest ?? requireManifest("module_ready");
  const processes = toolsetProcesses();
  if (processes.length !== 1 || processes[0].Responding !== true) fail("BINARY_NATIVE_GEOMETRY_REQUIRES_ONE_RESPONSIVE_OWNED_PROCESS", JSON.stringify(processes));
  if(hiddenAreaContext&&(processes[0].Id!==hiddenAreaContext.owner.pid||processes[0].StartTimeUtc!==hiddenAreaContext.owner.startedAtUtc))fail('HIDDEN_AREA_OWNER_DRIFT','Owner changed after resume admission.');
  const queuePath = hiddenAreaContext?.queuePath ?? resolve(outDir, "binary-native-area-queue.json");
  const areaOutDir=hiddenAreaContext?.areaOutDir ?? resolve(outDir,'area-open');
  writeJson(queuePath, [{ name: area.displayName, resref: profile.area.resref }]);
  const owner=hiddenAreaContext?.owner;
  const queue = runAtom("run-toolset-area-oracle-queue.mjs", ["--queue", queuePath, "--expectedModule", `${profile.module.resref}.mod`, "--expectedModuleParts", `${profile.module.resref}|mod`, "--outDir", areaOutDir, "--capture", "false"], 120000,owner?{
    AURORA_TOOLSET_EXPECTED_OWNER_PID:String(owner.pid),AURORA_TOOLSET_EXPECTED_OWNER_START:owner.startedAtUtc,
    AURORA_TOOLSET_EXPECTED_OWNER_FRAME:String(owner.frameHwnd),AURORA_TOOLSET_EXPECTED_OWNER_TITLE:owner.title,
  }:{});
  if (queue.status !== "completed") fail("BINARY_NATIVE_GEOMETRY_AREA_OPEN_UNVERIFIED", JSON.stringify(queue));
  const queueManifest = readJson(resolve(areaOutDir, "manifest.json"));
  const opened = queueManifest.items?.find((item) => item.status === "opened" && item.area?.resref === profile.area.resref && item.area?.name === area.displayName);
  if (!opened) fail("BINARY_NATIVE_GEOMETRY_AREA_IDENTITY_UNVERIFIED", JSON.stringify(queueManifest));

  let save;
  try {
    save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${profile.module.resref}.mod`, "--modulePath", profile.module.path], 60000);
  } catch (error) {
    const windows = atom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const dialogText = (windows.windows ?? []).map((window) => String(window.text)).join("\n");
    const geometryInvalid = /invalid locations|area was not saved|inaccessable objects|inaccessible objects/iu.test(dialogText);
    manifest.status = "failed";
    manifest.blockerCode = geometryInvalid ? "area_geometry_invalid" : "native_geometry_save_unverified";
    manifest.nativeSave = { areaWasSaved: false, invalidLocationsDialog: /invalid locations|area was not saved/iu.test(dialogText), inaccessibleObjectsDialog: /inaccessable objects|inaccessible objects/iu.test(dialogText), statusText: null, error: String(error?.message ?? error), windows };
    manifest.updatedAt = new Date().toISOString();
    writeJson(manifestPath, manifest);
    fail(manifest.blockerCode, JSON.stringify(manifest.nativeSave));
  }
  const windows = atom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const dialogText = (windows.windows ?? []).map((window) => String(window.text)).join("\n");
  const nativeSave = { areaWasSaved: save.titleAfter?.endsWith("*") === false, invalidLocationsDialog: /invalid locations|area was not saved/iu.test(dialogText), inaccessibleObjectsDialog: /inaccessable objects|inaccessible objects/iu.test(dialogText), statusText: "Area was saved", save };
  if (!nativeSave.areaWasSaved || nativeSave.invalidLocationsDialog || nativeSave.inaccessibleObjectsDialog) fail("area_geometry_invalid", JSON.stringify(nativeSave));

  const postSaveProfile = JSON.parse(JSON.stringify(profile));
  const postSaveModuleBytes = readFileSync(profile.module.path);
  postSaveProfile.module.sha256 = createHash("sha256").update(postSaveModuleBytes).digest("hex");
  postSaveProfile.module.bytes = postSaveModuleBytes.length;
  const stagedProfilePath = resolve(outDir, "post-native-save-binary-bootstrap-profile.json");
  writeJson(stagedProfilePath, postSaveProfile);
  const postSaveStructural = atom("validate-aurora-toolset-binary-module-bootstrap.mjs", ["--mode", "preflight", "--profile", stagedProfilePath]);
  const git = atom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", profile.module.path, "--area", profile.area.resref]);
  const entry = atom("read-aurora-toolset-bootstrap-entry-readback.mjs", ["--module", profile.module.path]);
  if (areaCreateStructuralProfile) {
    manifest.status = "area_create_native_save_verified";
    manifest.nativeSave = nativeSave;
    manifest.postSaveProfilePath = stagedProfilePath;
    manifest.postSaveStructural = postSaveStructural;
    manifest.nativeGitReadback = git;
    manifest.nativeEntryReadback = entry;
    manifest.queue = { path: queuePath, manifestPath: resolve(areaOutDir, "manifest.json") };
    manifest.updatedAt = new Date().toISOString();
    writeJson(manifestPath, manifest);
    return {
      ok: true,
      command: "geometry-observe",
      status: "area_create_native_save_verified",
      manifestPath,
      exactEmptyGit: git.objectCounts?.total === 0,
      gicRequired: true,
      proofClaimed: false,
      runtimeClaimed: false,
      safety: safety(true, true),
    };
  }
  manifest.status = "geometry_saved_pending_entry_observation";
  manifest.nativeSave = nativeSave;
  manifest.postSaveProfilePath = stagedProfilePath;
  manifest.postSaveStructural = postSaveStructural;
  manifest.nativeGitReadback = git;
  manifest.nativeEntryReadback = entry;
  manifest.queue = { path: queuePath, manifestPath: resolve(areaOutDir, "manifest.json") };
  manifest.updatedAt = new Date().toISOString();
  writeJson(manifestPath, manifest);
  if(hiddenAreaContext)finishHiddenArea(hiddenAreaContext,{status:'geometry_saved_pending_entry_observation',manifestPath});
  return {
    ok: true, command: "geometry-observe", status: "geometry_saved_pending_entry_observation", manifestPath,
    entrySurfaceRequest: { moduleSha256: postSaveProfile.module.sha256, area: entry.area, entry: entry.position },
    proofClaimed: false, runtimeClaimed: false, safety: safety(true, true),
  };
}

function finalizeGeometry(manifest, observationPath) {
  const postSaveProfile = readJson(manifest.postSaveProfilePath);
  const entryObservation = readJson(observationPath);
  validateEntryObservation(entryObservation, manifest.nativeEntryReadback, postSaveProfile.module.sha256);
  const geometryProfilePath = resolve(outDir, "binary-native-geometry-profile.json");
  const geometryProfile = {
    version: "aurora-toolset-binary-native-geometry-profile/v1", id: `${profile.id}:native-geometry`,
    sourceBinaryProfile: { path: profilePath, sha256: sha256(profilePath) },
    module: { ...postSaveProfile.module }, area: { ...profile.area, displayName: manifest.area.displayName }, entryPoint: { ...profile.entryPoint, accessibleSurface: true, observation: entryObservation },
    orderedHakList: profile.orderedHakList, fixtures: profile.fixtures.map((fixture) => ({ ...fixture, accessibleSurface: true, nativeSaveAccepted: true, savedGitReadback: true })),
    nativeSave: manifest.nativeSave, queue: manifest.queue,
    readback: { structural: manifest.postSaveStructural, git: manifest.nativeGitReadback, entry: manifest.nativeEntryReadback },
    next: { tscrollboxCapture: "backend/scripts/aurora-toolset-viewport-proof.mjs", aurS07: "central AUR-S07 execution profile required; runtime is not claimed" },
    artifactDir: outDir, noLocalToolsetAdapter: true,
  };
  writeJson(geometryProfilePath, geometryProfile);
  const validation = validateGeometry(geometryProfilePath);
  manifest.status = "geometry_verified";
  manifest.geometryProfilePath = geometryProfilePath;
  manifest.updatedAt = new Date().toISOString();
  writeJson(manifestPath, manifest);
  return { ok: true, command: "geometry-finalize", status: "binary_native_geometry_verified", manifestPath, geometryProfilePath, validation, proofClaimed: false, runtimeClaimed: false, safety: safety(false) };
}

function validateGeometry(path) {
  const value = readJson(path);
  const failures = [];
  if (value.version !== "aurora-toolset-binary-native-geometry-profile/v1") failures.push("geometry_profile_version_invalid");
  if (!text(value.module?.sha256) || !text(value.area?.displayName)) failures.push("geometry_profile_identity_invalid");
  if (value.nativeSave?.areaWasSaved !== true || value.nativeSave?.invalidLocationsDialog !== false || value.nativeSave?.inaccessibleObjectsDialog !== false || value.nativeSave?.statusText !== "Area was saved") failures.push("area_geometry_invalid");
  if (value.entryPoint?.accessibleSurface !== true || !Array.isArray(value.fixtures) || value.fixtures.length === 0 || value.fixtures.some((fixture) => fixture.accessibleSurface !== true || fixture.nativeSaveAccepted !== true || fixture.savedGitReadback !== true)) failures.push("geometry_surface_observation_invalid");
  if (failures.length) fail("BINARY_NATIVE_GEOMETRY_PROFILE_INVALID", failures.join(","));
  return { ok: true, command: "validate-geometry", status: "binary_native_geometry_profile_valid", geometryProfile: resolve(path), proofClaimed: false, runtimeClaimed: false };
}

function validateEntryObservation(observation, entry, moduleSha256) {
  if (observation?.version !== "aurora-entry-surface-observation/v1" || observation.status !== "validated_user_owned_observation" || observation.moduleSha256 !== moduleSha256 || observation.area !== entry.area || JSON.stringify(observation.entry) !== JSON.stringify(entry.position) || observation.safety?.projectSuppliedAccessibilityBoolean !== false) fail("BINARY_NATIVE_ENTRY_SURFACE_OBSERVATION_INVALID", "A validated central user-owned entry-surface observation bound to the post-save module is required.");
}
function inspectVerifiedTemp0RecoveryAdmission() {
  if (!installedModulePath) return null;
  if (!existsSync(installedModulePath)) fail("BINARY_NATIVE_INSTALLED_MODULE_MISSING", installedModulePath);
  if (sha256(installedModulePath) !== profile.module.sha256 || sha256(installedModulePath) !== sha256(profile.module.path)) {
    fail("BINARY_NATIVE_INSTALLED_MODULE_BINDING_MISMATCH", installedModulePath);
  }
  const temp0Path = resolve(dirname(installedModulePath), "temp0");
  if (!existsSync(temp0Path)) return null;
  return createVerifiedTemp0RecoveryAdmission({ modulePath: installedModulePath, temp0Path });
}
function revalidateManifestTemp0RecoveryAdmission(manifest) {
  const admission = manifest?.verifiedTemp0RecoveryAdmission ?? null;
  if (!admission) return null;
  if (!installedModulePath) fail("BINARY_NATIVE_INSTALLED_MODULE_PATH_REQUIRED", "--installedModulePath");
  if (sha256(installedModulePath) !== profile.module.sha256 || sha256(installedModulePath) !== sha256(profile.module.path)) {
    fail("BINARY_NATIVE_INSTALLED_MODULE_BINDING_MISMATCH", installedModulePath);
  }
  return validateVerifiedTemp0RecoveryAdmission(admission, {
    modulePath: installedModulePath,
    temp0Path: resolve(dirname(installedModulePath), "temp0"),
  });
}
function baseManifest(area) { return { version: "aurora-toolset-binary-native-geometry-manifest/v1", explicitOpenStartupAdmissionVersion: EXPLICIT_OPEN_STARTUP_ADMISSION_VERSION, profilePath, profileSha256: sha256(profilePath), profileId: profile.id, profileKind: areaCreateStructuralProfile ? "area-create-empty-structural" : "model-fixture-geometry", artifactDir: outDir, module: profile.module, area: { ...profile.area, displayName: area.displayName }, status: "created", safety: safety(false), createdAt: new Date().toISOString() }; }
function requireManifest(status) { if (!existsSync(manifestPath)) fail("BINARY_NATIVE_GEOMETRY_MANIFEST_MISSING", manifestPath); const value = readJson(manifestPath); if (value.status !== status || value.profileSha256 !== sha256(profilePath)) fail("BINARY_NATIVE_GEOMETRY_MANIFEST_STATE_INVALID", JSON.stringify({ expected: status, actual: value.status })); return value; }
function assertNoToolsetProcess() { const processes = toolsetProcesses(); if (processes.length !== 0) fail("STALE_TOOLSET_SESSION_REJECTED", JSON.stringify({ processes, message: "This binary route never reuses a pre-existing Toolset session; preserve it and start no second process." })); }
function assertNoNwnProcess() { const processes = nwnProcesses(); if (processes.length !== 0) fail("STALE_NWN_SESSION_REJECTED", JSON.stringify({ processes, message: "The failed-startup archive transition requires zero NWN processes; it never reuses or closes one." })); }
function toolsetProcesses() { const raw = execFileSync("powershell.exe", ["-NoProfile", "-Command", "@(Get-Process nwtoolset -ErrorAction SilentlyContinue | Select-Object Id,StartTime,@{Name='StartTimeUtc';Expression={$_.StartTime.ToUniversalTime().ToString('o')}},MainWindowTitle,Responding) | ConvertTo-Json -Compress"], { encoding: "utf8", windowsHide: true, timeout: 15000 }).trim(); if (!raw) return []; const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : [parsed]; }
function nwnProcesses() { const raw = execFileSync("powershell.exe", ["-NoProfile", "-Command", "@(Get-Process nwmain -ErrorAction SilentlyContinue | Select-Object Id,StartTime,MainWindowTitle,Responding) | ConvertTo-Json -Compress"], { encoding: "utf8", windowsHide: true, timeout: 15000 }).trim(); if (!raw) return []; const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : [parsed]; }
function toolsetProcessesSafe() { try { return toolsetProcesses(); } catch (error) { return [{ inspectionError: String(error?.message ?? error) }]; } }
function visibleWindowsSafe() { const result = runAtomResult("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); return result.ok === true ? result : { inspectionError: result }; }
function runAtomResult(name, args, timeout = 60000, env = {}) {
  try {
    const stdout = execFileSync(process.execPath, [resolve(here, name), ...args], { cwd: root, encoding: "utf8", windowsHide: true, timeout, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, ...env } }).trim();
    return JSON.parse(stdout);
  } catch (error) {
    const stdout = String(error?.stdout ?? "").trim();
    const stderr = String(error?.stderr ?? "").trim();
    let child = null;
    try { child = stdout ? JSON.parse(stdout) : null; } catch { child = null; }
    return {
      ok: false,
      blockerCode: child?.blockerCode ?? "binary_native_child_process_failed",
      childScript: name,
      childArgs: args,
      childExitCode: Number.isInteger(error?.status) ? error.status : null,
      childStdout: stdout || null,
      childStderr: stderr || null,
      childResult: child,
      childMessage: String(error?.message ?? error),
    };
  }
}
function runAtom(name, args, timeout = 60000, env = {}) { const result = runAtomResult(name, args, timeout, env); if (result.ok !== true && result.childScript) fail(result.blockerCode, JSON.stringify(result)); return result; }
function atom(name, args) { return runAtom(name, args); }
function parseArgs(values) { const result = {}; for (let i = 0; i < values.length; i += 2) { const key = values[i], value = values[i + 1]; if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) fail("BINARY_NATIVE_GEOMETRY_ARGUMENT_INVALID", key ?? "end"); result[key.slice(2)] = value; } return result; }
function requiredPath(value, name) { if (!value) fail("BINARY_NATIVE_GEOMETRY_ARGUMENT_MISSING", name); return resolve(value); }
function text(value) { return typeof value === "string" && value.trim().length > 0; }
function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function writeJson(path, value) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function sha256(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function safety(startsToolset, savesModule = false) { return { startsToolset, startsNwn: false, usesGlobalInput: false, usesGlobalCursor: false, usesGlobalKeyboard: false, usesGlobalMouse: false, usesGlobalMouseWheel: false, savesModule, changesIniOrMru: false, ownsAtMostOneNewToolsetSession: true, rejectsPreExistingToolsetSession: true, noLocalToolsetAdapter: true }; }
function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
function print(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
