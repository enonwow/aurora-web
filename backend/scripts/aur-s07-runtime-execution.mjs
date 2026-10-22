#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, rmSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { selectFreshLogSlice } from "./lib/aurora-model-proof-120s-contract.mjs";
import { validateGeometryArtifact } from "./lib/aurora-binary-entry-surface-workflow.mjs";
import { assertRuntimeGeometryBinding } from "./lib/aur-s07-entry-geometry-binding.mjs";
import { validateSavedEmptyAreaAdmission, validateSavedEnvironmentAdmission } from "./lib/aur-s07-saved-empty-area-admission.mjs";
import { planRuntimeFrame, validateRuntimeFrameResult } from "./lib/aur-s07-runtime-frame-contract.mjs";
import { prepareRuntimeWindow, validateRuntimeWindowPolicy } from "./lib/aur-s07-runtime-window-contract.mjs";

const SCRIPT_DIR = resolve(fileURLToPath(new URL(".", import.meta.url)));
const TEST_MODULE_ATOM = resolve(SCRIPT_DIR, "aurora-toolset-test-module-nonblocking.mjs");
const RESTORE_TOOLSET_FRAME_ATOM = resolve(SCRIPT_DIR, "restore-aurora-toolset-frame-noactivate.mjs");
const PREPARE_RUNTIME_WINDOW_ATOM = resolve(SCRIPT_DIR, "prepare-nwmain-proof-window-no-global-input.mjs");
const CENTRAL_TEST_MODULE_MODE = "central_guarded_test_module_action";
const USER_TEST_MODULE_MODE = "user_owned_test_module_action";
const BASE_ARTIFACT_KINDS = Object.freeze(["runtime-observation", "runtime-capture", "engine-load-log"]);
const ENHANCED_ARTIFACT_KINDS = Object.freeze([
  "runtime-observation",
  "runtime-capture",
  "runtime-capture-metadata",
  "engine-load-log",
  "engine-load-log-metadata",
  "runtime-visual-review",
]);

const [command, ...rawArgs] = process.argv.slice(2);
const options = parseArgs(rawArgs);
const profilePath = requiredPath(options.profile, "--profile");
const profileBytes = readFileSync(profilePath);
const profileSha256 = sha256Bytes(profileBytes);
const profile = JSON.parse(profileBytes.toString("utf8"));
validateProfile(profile);
const outDir = options.outDir ? requiredPath(options.outDir, "--outDir") : null;

switch (command) {
  case "dry-run":
    requireOutDir();
    print({ ok: true, command, profileId: profile.id, profileSha256, module: profile.module, launch: profile.launch, engineLog: profile.engineLog ?? null, requiredArtifacts: requiredArtifactKinds(profile), startsNwn: false, usesGlobalInput: false });
    break;
  case "arm":
    requireOutDir();
    mkdirSync(outDir, { recursive: true });
    {
      const requestPath = resolve(outDir, "aur-s07-runtime-launch-request.json");
      assertAbsent(requestPath, "runtime_launch_request_already_exists");
      const central = profile.launch.mode === CENTRAL_TEST_MODULE_MODE;
      const request = { version: "aur-s07-runtime-launch-request/v1", requestId: randomUUID(), createdAt: new Date().toISOString(), profileId: profile.id, profileSha256, modulePath: profile.module.path ?? null, moduleSha256: profile.module.sha256, area: profile.module.area, entryPoint: profile.module.entryPoint, action: profile.launch.mode, startsNwn: false, requestsNwnStart: central, usesGlobalInput: false, dispatchCommand: central ? `node backend/scripts/aur-s07-runtime-execution.mjs dispatch-test-module --profile ${options.profile} --outDir ${outDir}` : null, observationCommand: central ? `node backend/scripts/aur-s07-runtime-execution.mjs observe --profile ${options.profile} --outDir ${outDir} --handoff ${resolve(outDir, "aur-s07-runtime-handoff.json")}` : `node backend/scripts/aur-s07-runtime-execution.mjs observe --profile ${options.profile} --outDir ${outDir} --handoff <runtime-handoff.json>` };
      writeFileSync(requestPath, `${JSON.stringify(request, null, 2)}\n`);
      print({ ok: true, command, requestPath, startsNwn: false, usesGlobalInput: false });
    }
    break;
  case "dispatch-test-module":
    requireOutDir();
    dispatchTestModule(profile, outDir);
    break;
  case "observe":
    requireOutDir();
    observe(profile, outDir, requiredPath(options.handoff, "--handoff"));
    break;
  case "prepare-runtime-window-dry-run":
  case "prepare-runtime-window":
    print(prepareRuntimeWindow({ profile, profileSha256, outputDirectory: requireOutDir(), dryRun: command.endsWith("-dry-run") }, {
      loadEvidence: loadRuntimeWindowEvidence,
      readState: readRuntimeWindowState,
      exists: existsSync,
      now: () => new Date().toISOString(),
      writeExclusive: (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" }),
      prepare: ({ pid, startedAtUtc, expectedDevice, expectedHwnd }) => JSON.parse(execFileSync(process.execPath,
        [PREPARE_RUNTIME_WINDOW_ATOM, "prepare", "--pid", String(pid), "--startedAtUtc", startedAtUtc, "--expectedDevice", expectedDevice, "--expectedHwnd", String(expectedHwnd)],
        { encoding: "utf8", windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024 })),
    }));
    break;
  case "baseline-engine-log":
    baselineEngineLog(profile, requireOutDir());
    break;
  case "capture-frame": {
    const dir=requireOutDir();readBoundRequest(profile,dir);
    const observation=readJson(resolve(dir,'aur-s07-runtime-observation.json'));
    const windowResult=readJson(resolve(dir,'aur-s07-runtime-window-result.json'));
    const plan=planRuntimeFrame({profile,profileSha256,observation,windowResult,outDir:dir,frameIndex:Number(options.frameIndex)},existsSync);
    writeFileSync(plan.intent,JSON.stringify({version:'aur-s07-runtime-frame-intent/v1',profileId:profile.id,profileSha256,moduleSha256:profile.module.sha256,frameIndex:Number(options.frameIndex),plan,continuousVideoProof:false})+'\n',{flag:'wx'});
    try {
      const raw=execFileSync(process.execPath,[resolve(SCRIPT_DIR,'capture-nwmain-proof-window-no-global-input.mjs'),'capture','--pid',String(plan.pid),'--startedAtUtc',plan.startedAtUtc,'--out',plan.png],{windowsHide:true,encoding:'utf8',timeout:20000,maxBuffer:2*1024*1024});
      const result=JSON.parse(raw);const verdict=validateRuntimeFrameResult(result,plan,profile.runtimeWindow.expectedDevice);
      writeFileSync(plan.receipt,JSON.stringify({version:'aur-s07-runtime-frame/v1',...verdict,profileId:profile.id,profileSha256,moduleSha256:profile.module.sha256,result},null,2)+'\n',{flag:'wx'});
      print({ok:true,...verdict,png:plan.png,receipt:plan.receipt,pngSha256:result.pngSha256,leased:result.zOrderLease.required});
    } catch(error) {
      rmSync(plan.png,{force:true});
      writeFileSync(plan.receipt,JSON.stringify({version:'aur-s07-runtime-frame/v1',status:'failed',profileId:profile.id,profileSha256,message:String(error.message),continuousVideoProof:false},null,2)+'\n',{flag:'wx'});throw error;
    }
    break;
  }
  case "capture-engine-log":
    captureEngineLog(profile, requireOutDir(), boundedInteger(options.timeoutMs ?? "15000", "--timeoutMs", 250, 30_000));
    break;
  case "record-visual-review":
    recordVisualReview(profile, requireOutDir(), requiredPath(options.captureResult, "--captureResult"));
    break;
  case "assemble-packet":
    assemblePacket(profile, requireOutDir(), requiredPath(options.captureResult, "--captureResult"));
    break;
  case "validate":
    validatePacket(profile, readJson(requiredPath(options.packet, "--packet")));
    break;
  default:
    throw new Error("Use: dry-run, arm, dispatch-test-module, observe, prepare-runtime-window-dry-run, prepare-runtime-window, baseline-engine-log, capture-engine-log, record-visual-review, assemble-packet, or validate.");
}

function loadRuntimeWindowEvidence() {
  assertFileHash(profilePath, profileSha256, "runtime_window_profile_changed");
  assertFileHash(profile.module.path, profile.module.sha256, "runtime_window_module_changed");
  assertOrderedHakHashes(profile.orderedHakList);
  assertFileHash(resolve(profile.geometryGate.artifact), profile.geometryGate.sha256, "runtime_window_geometry_gate_changed");
  const names = { request: "launch-request", dispatch: "test-module-dispatch", handoff: "handoff", observation: "observation" };
  const evidence = { bindings: {} };
  for (const [kind, name] of Object.entries(names)) {
    const path = resolve(outDir, `aur-s07-runtime-${name}.json`);
    const bytes = readFileSync(path);
    evidence[kind] = JSON.parse(bytes.toString("utf8"));
    evidence.bindings[kind] = { path, sha256: sha256Bytes(bytes) };
  }
  return evidence;
}

function readRuntimeWindowState() {
  // Read-only admission; all placement remains in the existing owned atom.
  const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Runtime.InteropServices;
public static class S07WindowRead {
 public delegate bool E(IntPtr h,IntPtr l);
 [StructLayout(LayoutKind.Sequential)]public struct R{public int Left,Top,Right,Bottom;}
 [DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]public static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);
 [DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
}
'@
function B($r){[pscustomobject]@{left=$r.Left;top=$r.Top;right=$r.Right;bottom=$r.Bottom;width=$r.Width;height=$r.Height}}
$native=@(Get-CimInstance Win32_Process -Filter "Name='nwmain.exe'")
$processes=@(Get-Process nwmain -ErrorAction SilentlyContinue|ForEach-Object{$p=$_;$c=@($native|Where-Object{$_.ProcessId-eq$p.Id});if($c.Count-ne1){throw 'runtime_window_cim_identity_missing'};[pscustomobject]@{pid=$p.Id;name=$p.ProcessName.ToLowerInvariant();startedAt=$p.StartTime.ToUniversalTime().ToString('o');responding=$p.Responding;mainWindowHandle=$p.MainWindowHandle.ToInt64();parentPid=[int]$c[0].ParentProcessId;commandLine=$c[0].CommandLine}})
$parents=@(Get-Process nwtoolset -ErrorAction SilentlyContinue|ForEach-Object{[pscustomobject]@{pid=$_.Id;name=$_.ProcessName.ToLowerInvariant();startedAt=$_.StartTime.ToUniversalTime().ToString('o');responding=$_.Responding}})
$window=$null;$script:visible=@()
if($processes.Count-eq1-and$processes[0].mainWindowHandle-gt0){
 $p=$processes[0];$h=[IntPtr]$p.mainWindowHandle;[uint32]$owner=0;[void][S07WindowRead]::GetWindowThreadProcessId($h,[ref]$owner)
 $r=New-Object 'S07WindowRead+R';if(-not[S07WindowRead]::GetWindowRect($h,[ref]$r)){throw 'runtime_window_rect_unavailable'}
 $window=[pscustomobject]@{hwnd=$h.ToInt64();ownerPid=$owner;visible=[S07WindowRead]::IsWindowVisible($h);iconic=[S07WindowRead]::IsIconic($h);bounds=[pscustomobject]@{left=$r.Left;top=$r.Top;right=$r.Right;bottom=$r.Bottom;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top}}
 $script:targetPid=[uint32]$p.pid
 [void][S07WindowRead]::EnumWindows([S07WindowRead+E]{param($w,$l);[uint32]$q=0;[void][S07WindowRead]::GetWindowThreadProcessId($w,[ref]$q);if($q-eq$script:targetPid-and[S07WindowRead]::IsWindowVisible($w)){$script:visible += [pscustomobject]@{hwnd=$w.ToInt64();ownerPid=$q}};$true},[IntPtr]::Zero)
}
$screens=@([Windows.Forms.Screen]::AllScreens|ForEach-Object{[pscustomobject]@{deviceName=$_.DeviceName;primary=$_.Primary;bounds=(B $_.Bounds);workingArea=(B $_.WorkingArea)}})
[pscustomobject]@{capturedAtUtc=[DateTime]::UtcNow.ToString('o');processes=$processes;parents=$parents;window=$window;visibleWindows=$script:visible;screens=$screens}|ConvertTo-Json -Depth 8 -Compress
`;
  return JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", source], { encoding: "utf8", windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024 }).trim());
}

function dispatchTestModule(profile, outDir) {
  if (profile.launch.mode !== CENTRAL_TEST_MODULE_MODE) throw new Error("runtime_profile_central_dispatch_not_enabled");
  const requestPath = resolve(outDir, "aur-s07-runtime-launch-request.json");
  const dispatchPath = resolve(outDir, "aur-s07-runtime-test-module-dispatch.json");
  const handoffPath = resolve(outDir, "aur-s07-runtime-handoff.json");
  if (!existsSync(requestPath)) throw new Error("runtime_launch_request_missing");
  assertAbsent(dispatchPath, "runtime_test_module_dispatch_already_exists");
  assertAbsent(handoffPath, "runtime_handoff_already_exists");
  const request = readJson(requestPath);
  const target = { profileId: profile.id, profileSha256, modulePath: profile.module.path, moduleSha256: profile.module.sha256, area: profile.module.area, entryPoint: profile.module.entryPoint };
  if (request.version !== "aur-s07-runtime-launch-request/v1" || request.action !== CENTRAL_TEST_MODULE_MODE || request.profileId !== target.profileId || request.profileSha256 !== target.profileSha256 || request.modulePath !== target.modulePath || request.moduleSha256 !== target.moduleSha256 || request.area !== target.area || JSON.stringify(request.entryPoint) !== JSON.stringify(target.entryPoint)) throw new Error("runtime_launch_request_binding_mismatch");
  assertFileHash(profile.module.path, profile.module.sha256, "runtime_module_hash_mismatch");
  assertOrderedHakHashes(profile.orderedHakList);
  const restore = JSON.parse(execFileSync(process.execPath, [RESTORE_TOOLSET_FRAME_ATOM, "--module", basename(profile.module.path), "--ensureNonPrimary", "true"], { encoding: "utf8", windowsHide: true, timeout: 20_000, maxBuffer: 1024 * 1024 }));
  if (restore.ok !== true || restore.module.toLowerCase() !== basename(profile.module.path).toLowerCase() || restore.monitor?.primary !== false || restore.safety?.activatesFrame !== false || restore.safety?.globalCursor !== false || restore.safety?.globalKeyboard !== false || restore.safety?.globalMouse !== false) throw new Error("runtime_toolset_frame_restore_result_invalid");
  const atom = JSON.parse(execFileSync(process.execPath, [TEST_MODULE_ATOM, "post", "--module", basename(profile.module.path)], { encoding: "utf8", windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024 }));
  if (atom.ok !== true || atom.status !== "posted" || atom.module.toLowerCase() !== basename(profile.module.path).toLowerCase() || atom.requestsNwnStart !== true || atom.usesGlobalInput !== false) throw new Error("runtime_test_module_atom_result_invalid");
  const dispatchedAt = new Date().toISOString();
  const dispatch = { version: "aur-s07-runtime-test-module-dispatch/v1", dispatchedAt, requestId: request.requestId, ...target, restore, atom, requestsNwnStart: true, startsNwnDirectly: false, usesGlobalInput: false, safety: { owner: "AUR-S07 central runtime route", method: "exact Toolset frame restore without activation followed by one validated exact Build > Test Module WM_COMMAND through the owned nonblocking atoms" } };
  const handoff = { version: "aur-s07-runtime-handoff/v1", createdAt: dispatchedAt, requestId: request.requestId, ...target, dispatchPath };
  writeFileSync(dispatchPath, `${JSON.stringify(dispatch, null, 2)}\n`);
  writeFileSync(handoffPath, `${JSON.stringify(handoff, null, 2)}\n`);
  print({ ok: true, status: "posted", dispatchPath, handoffPath, requestsNwnStart: true, startsNwnDirectly: false, usesGlobalInput: false });
}

function observe(profile, outDir, handoffPath) {
  const handoff = readJson(handoffPath);
  const processes = waitForExactlyOneNwnProcess(profile.launch.processName, Number(options.timeoutMs ?? 45_000));
  const failures = [];
  if (processes.length !== 1) failures.push("runtime_process_count_invalid");
  if (processes.length === 1 && (processes[0].responding !== true || !Number.isInteger(processes[0].mainWindowHandle) || processes[0].mainWindowHandle <= 0)) failures.push("runtime_process_window_not_ready");
  if (handoff.version !== "aur-s07-runtime-handoff/v1" || handoff.profileId !== profile.id || (profile.launch.mode === CENTRAL_TEST_MODULE_MODE && handoff.profileSha256 !== profileSha256)) failures.push("runtime_handoff_identity_mismatch");
  if (handoff.moduleSha256 !== profile.module.sha256 || handoff.area !== profile.module.area || JSON.stringify(handoff.entryPoint) !== JSON.stringify(profile.module.entryPoint)) failures.push("runtime_handoff_target_mismatch");
  if (failures.length > 0) return print({ ok: true, status: "failed", blockerCode: "aur_s07_runtime_observation_failed", failures, processes });
  mkdirSync(outDir, { recursive: true });
  const observationPath = resolve(outDir, "aur-s07-runtime-observation.json");
  const observation = { version: "aur-s07-runtime-observation/v1", observedAt: new Date().toISOString(), profileId: profile.id, profileSha256, process: processes[0], moduleSha256: profile.module.sha256, area: profile.module.area, entryPoint: profile.module.entryPoint, handoffPath, safety: { startsNwn: false, usesGlobalInput: false, method: profile.launch.mode === CENTRAL_TEST_MODULE_MODE ? "read-only NWN process enumeration plus central guarded Toolset Test Module handoff" : "read-only NWN process enumeration plus user-owned Test Module handoff" } };
  writeFileSync(observationPath, `${JSON.stringify(observation, null, 2)}\n`);
  print({ ok: true, status: "observed", observationPath, process: processes[0] });
}

function validatePacket(profile, packet) {
  const failures = collectPacketFailures(profile, packet);
  print(failures.length ? { ok: true, status: "failed", blockerCode: "aur_s07_runtime_proof_failed", failures } : { ok: true, status: "verified", profileId: profile.id, profileSha256 });
}

function collectPacketFailures(profile, packet) {
  const failures = [];
  if (packet.version !== "aur-s07-runtime-packet/v1" || packet.profileId !== profile.id) failures.push("runtime_packet_identity_mismatch");
  if (profile.evidencePolicy && packet.profileSha256 !== profileSha256) failures.push("runtime_packet_profile_hash_mismatch");
  if (packet.moduleSha256 !== profile.module.sha256 || packet.area !== profile.module.area || JSON.stringify(packet.entryPoint) !== JSON.stringify(profile.module.entryPoint)) failures.push("runtime_packet_target_mismatch");
  if (JSON.stringify(packet.fixtures) !== JSON.stringify(profile.fixtures)) failures.push("runtime_packet_fixture_mismatch");
  if (packet.modelVisibility?.status !== "visible" || packet.modelVisibility?.blank !== false || packet.modelVisibility?.placeholder !== false) failures.push("runtime_model_blank_or_placeholder");
  const artifactList = Array.isArray(packet.artifacts) ? packet.artifacts : [];
  const artifacts = new Map(artifactList.map((artifact) => [artifact.kind, artifact]));
  if (artifacts.size !== artifactList.length) failures.push("runtime_artifact_kind_duplicate");
  for (const kind of requiredArtifactKinds(profile)) {
    const artifact = artifacts.get(kind);
    if (!artifact || !existsSync(artifact.path)) { failures.push(`runtime_artifact_missing:${kind}`); continue; }
    const actual = createHash("sha256").update(readFileSync(artifact.path)).digest("hex");
    if (actual !== artifact.sha256) failures.push(`runtime_artifact_hash_mismatch:${kind}`);
  }
  const observation = artifacts.get("runtime-observation") && existsSync(artifacts.get("runtime-observation").path) ? readJson(artifacts.get("runtime-observation").path) : null;
  if (observation && (observation.process?.name?.toLowerCase() !== profile.launch.processName || observation.moduleSha256 !== profile.module.sha256 || observation.area !== profile.module.area || JSON.stringify(observation.entryPoint) !== JSON.stringify(profile.module.entryPoint) || (profile.evidencePolicy && observation.profileSha256 !== profileSha256))) failures.push("runtime_observation_binding_mismatch");
  if (profile.evidencePolicy && observation) {
    validateCaptureMetadata(profile, observation, artifacts, failures);
    validateEngineLogMetadata(profile, observation, artifacts, failures);
    validateVisualReview(profile, artifacts, failures);
  }
  return [...new Set(failures)];
}

function validateProfile(profile) {
  validateRuntimeWindowPolicy(profile.runtimeWindow);
  if (profile.version !== "aur-s07-runtime-profile/v1" || !profile.id) throw new Error("runtime_profile_identity_invalid");
  if (!/^[a-f0-9]{64}$/u.test(profile.module?.sha256 ?? "") || !profile.module?.area || !Array.isArray(profile.module?.entryPoint)) throw new Error("runtime_profile_module_invalid");
  if (
    profile.geometryGate?.status !== "verified" ||
    typeof profile.geometryGate?.artifact !== "string" ||
    !/^[a-f0-9]{64}$/u.test(profile.geometryGate?.sha256 ?? "") ||
    !existsSync(resolve(profile.geometryGate.artifact))
  ) {
    throw new Error("area_geometry_invalid");
  }
  assertFileHash(
    resolve(profile.geometryGate.artifact),
    profile.geometryGate.sha256,
    "area_geometry_gate_hash_mismatch"
  );
  const gateVersion = readJson(resolve(profile.geometryGate.artifact)).version;
  if (gateVersion === 'aur-s07-saved-empty-area-admission/v1') {
    validateSavedEmptyAreaAdmission(resolve(profile.geometryGate.artifact), profile);
  } else if (gateVersion === 'aur-s07-saved-environment-admission/v1') {
    validateSavedEnvironmentAdmission(resolve(profile.geometryGate.artifact), profile);
  } else {
    assertRuntimeGeometryBinding(profile, validateGeometryArtifact(resolve(profile.geometryGate.artifact)));
  }
  if (![USER_TEST_MODULE_MODE, CENTRAL_TEST_MODULE_MODE].includes(profile.launch?.mode) || profile.launch?.processName !== "nwmain") throw new Error("runtime_profile_launch_contract_invalid");
  if (profile.launch.mode === CENTRAL_TEST_MODULE_MODE && (!profile.module.path || !resolve(profile.module.path).toLowerCase().endsWith(".mod") || !existsSync(resolve(profile.module.path)))) throw new Error("runtime_profile_module_path_invalid");
  if (!Array.isArray(profile.fixtures) || profile.fixtures.length === 0 || !Array.isArray(profile.orderedHakList)) throw new Error("runtime_profile_fixture_or_hak_invalid");
  if (profile.evidencePolicy) {
    if (profile.evidencePolicy.version !== "aur-s07-runtime-evidence-policy/v1" || JSON.stringify(profile.evidencePolicy.requiredArtifactKinds) !== JSON.stringify(ENHANCED_ARTIFACT_KINDS) || !Number.isFinite(profile.evidencePolicy.minimumCaptureDurationSeconds) || profile.evidencePolicy.minimumCaptureDurationSeconds < 2 || profile.evidencePolicy.minimumCaptureDurationSeconds > 90) throw new Error("runtime_evidence_policy_invalid");
    if (!profile.engineLog || !existsSync(resolve(profile.engineLog.path ?? "")) || typeof profile.engineLog.loadingModuleResref !== "string" || profile.engineLog.loadingModuleResref.trim().length === 0 || profile.engineLog.loadingModuleResref.includes("\\") || profile.engineLog.loadingModuleResref.includes("/") || !Array.isArray(profile.engineLog.requiredTokens) || profile.engineLog.requiredTokens.length === 0 || profile.engineLog.requiredTokens.some((token) => typeof token !== "string" || token.length < 3 || token.length > 256)) throw new Error("runtime_engine_log_profile_invalid");
  }
}

function baselineEngineLog(profile, outputDirectory) {
  requireEnhancedEvidenceProfile(profile);
  if (readNwnProcesses(profile.launch.processName).length !== 0) throw new Error("runtime_engine_log_baseline_requires_zero_nwn");
  const request = readBoundRequest(profile, outputDirectory);
  const baselinePath = resolve(outputDirectory, "aur-s07-engine-log-baseline.json");
  assertAbsent(baselinePath, "runtime_engine_log_baseline_already_exists");
  const sourcePath = resolve(profile.engineLog.path);
  const baseline = { version: "aur-s07-engine-log-baseline/v1", profileId: profile.id, profileSha256, requestId: request.requestId, sourcePath, snapshot: snapshotFile(sourcePath) };
  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, { flag: "wx" });
  print({ ok: true, status: "recorded", baselinePath, sourcePath, requestId: request.requestId });
}

function captureEngineLog(profile, outputDirectory, timeoutMs) {
  requireEnhancedEvidenceProfile(profile);
  const request = readBoundRequest(profile, outputDirectory);
  const baselinePath = resolve(outputDirectory, "aur-s07-engine-log-baseline.json");
  const observationPath = resolve(outputDirectory, "aur-s07-runtime-observation.json");
  const windowPath = resolve(outputDirectory, "aur-s07-engine-log-window.bin");
  const metadataPath = resolve(outputDirectory, "aur-s07-engine-log-window.json");
  for (const [path, code] of [[baselinePath, "runtime_engine_log_baseline_missing"], [observationPath, "runtime_observation_missing"]]) if (!existsSync(path)) throw new Error(code);
  assertAbsent(windowPath, "runtime_engine_log_window_already_exists");
  assertAbsent(metadataPath, "runtime_engine_log_metadata_already_exists");
  const baseline = readJson(baselinePath);
  const observation = readJson(observationPath);
  if (baseline.version !== "aur-s07-engine-log-baseline/v1" || baseline.profileId !== profile.id || baseline.profileSha256 !== profileSha256 || baseline.requestId !== request.requestId || resolve(baseline.sourcePath) !== resolve(profile.engineLog.path)) throw new Error("runtime_engine_log_baseline_binding_mismatch");
  requireObservationBinding(profile, observation);
  const deadline = Date.now() + timeoutMs;
  let selected = null;
  while (Date.now() <= deadline) {
    selected = selectBoundLogWindow(profile, baseline.snapshot, request.createdAt);
    if (selected?.loadingLine && selected.requiredTokens.every((token) => token.present)) break;
    selected = null;
    sleepMs(100);
  }
  if (!selected) throw new Error("runtime_engine_log_required_evidence_timeout");
  writeFileSync(windowPath, selected.bytes, { flag: "wx" });
  const metadata = {
    version: "aur-s07-engine-log-window/v1",
    capturedAtUtc: new Date().toISOString(),
    profileId: profile.id,
    profileSha256,
    moduleSha256: profile.module.sha256,
    requestId: request.requestId,
    sourcePath: resolve(profile.engineLog.path),
    baseline: baseline.snapshot,
    after: selected.after,
    mode: selected.mode,
    byteStart: selected.byteStart,
    byteEnd: selected.byteEnd,
    windowPath,
    windowSha256: sha256Bytes(selected.bytes),
    loadingModuleResref: profile.engineLog.loadingModuleResref,
    loadingLine: selected.loadingLine,
    requiredTokens: selected.requiredTokens,
    process: observation.process,
  };
  writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, { flag: "wx" });
  print({ ok: true, status: "captured", windowPath, metadataPath, windowSha256: metadata.windowSha256, mode: metadata.mode });
}

function recordVisualReview(profile, outputDirectory, captureResultPath) {
  requireEnhancedEvidenceProfile(profile);
  const reviewPath = resolve(outputDirectory, "aur-s07-runtime-visual-review.json");
  assertAbsent(reviewPath, "runtime_visual_review_already_exists");
  const capture = readJson(captureResultPath);
  const observation = readJson(resolve(outputDirectory, "aur-s07-runtime-observation.json"));
  requireObservationBinding(profile, observation);
  const captureArtifact = captureArtifactFromMetadata(capture, observation, profile);
  const modelVisibility = required(options.modelVisibility, "--modelVisibility");
  if (!["visible", "not_visible"].includes(modelVisibility)) throw new Error("runtime_visual_review_visibility_invalid");
  const blank = strictBoolean(options.blank, "--blank");
  const placeholder = strictBoolean(options.placeholder, "--placeholder");
  const accepted = modelVisibility === "visible" && !blank && !placeholder;
  const review = {
    version: "aur-s07-runtime-visual-review/v1",
    reviewedAtUtc: new Date().toISOString(),
    status: accepted ? "accepted" : "rejected",
    profileId: profile.id,
    profileSha256,
    moduleSha256: profile.module.sha256,
    capture: captureArtifact,
    modelVisibility: { status: modelVisibility, blank, placeholder },
    notes: required(options.notes, "--notes"),
  };
  writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`, { flag: "wx" });
  print({ ok: true, status: review.status, reviewPath, modelVisibility: review.modelVisibility });
}

function assemblePacket(profile, outputDirectory, captureResultPath) {
  requireEnhancedEvidenceProfile(profile);
  const packetPath = resolve(outputDirectory, "aur-s07-runtime-packet.json");
  assertAbsent(packetPath, "runtime_packet_already_exists");
  const observationPath = resolve(outputDirectory, "aur-s07-runtime-observation.json");
  const logPath = resolve(outputDirectory, "aur-s07-engine-log-window.bin");
  const logMetadataPath = resolve(outputDirectory, "aur-s07-engine-log-window.json");
  const reviewPath = resolve(outputDirectory, "aur-s07-runtime-visual-review.json");
  const capture = readJson(captureResultPath);
  const observation = readJson(observationPath);
  const review = readJson(reviewPath);
  const capturePath = captureArtifactFromMetadata(capture, observation, profile).path;
  const pathsByKind = new Map([
    ["runtime-observation", observationPath],
    ["runtime-capture", capturePath],
    ["runtime-capture-metadata", captureResultPath],
    ["engine-load-log", logPath],
    ["engine-load-log-metadata", logMetadataPath],
    ["runtime-visual-review", reviewPath],
  ]);
  const packet = {
    version: "aur-s07-runtime-packet/v1",
    profileId: profile.id,
    profileSha256,
    moduleSha256: profile.module.sha256,
    area: profile.module.area,
    entryPoint: profile.module.entryPoint,
    fixtures: profile.fixtures,
    modelVisibility: review.modelVisibility,
    artifacts: requiredArtifactKinds(profile).map((kind) => fileArtifact(kind, pathsByKind.get(kind))),
  };
  const failures = collectPacketFailures(profile, packet);
  if (failures.length > 0) throw new Error(`runtime_packet_assembly_rejected:${failures.join(",")}`);
  writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`, { flag: "wx" });
  print({ ok: true, status: "verified", packetPath, packetSha256: sha256File(packetPath), profileId: profile.id, profileSha256 });
}

function validateCaptureMetadata(profile, observation, artifacts, failures) {
  const metadataArtifact = artifacts.get("runtime-capture-metadata");
  const captureArtifact = artifacts.get("runtime-capture");
  if (!metadataArtifact || !captureArtifact || !existsSync(metadataArtifact.path)) return;
  try {
    const capture = readJson(metadataArtifact.path);
    const bound = captureArtifactFromMetadata(capture, observation, profile);
    if (resolve(bound.path) !== resolve(captureArtifact.path) || bound.sha256 !== captureArtifact.sha256) failures.push("runtime_capture_metadata_artifact_mismatch");
  } catch (error) { failures.push(`runtime_capture_metadata_invalid:${error instanceof Error ? error.message : String(error)}`); }
}

function validateEngineLogMetadata(profile, observation, artifacts, failures) {
  const metadataArtifact = artifacts.get("engine-load-log-metadata");
  const logArtifact = artifacts.get("engine-load-log");
  if (!metadataArtifact || !logArtifact || !existsSync(metadataArtifact.path)) return;
  const metadata = readJson(metadataArtifact.path);
  if (metadata.version !== "aur-s07-engine-log-window/v1" || metadata.profileId !== profile.id || metadata.profileSha256 !== profileSha256 || metadata.moduleSha256 !== profile.module.sha256 || resolve(metadata.sourcePath ?? "") !== resolve(profile.engineLog.path) || resolve(metadata.windowPath ?? "") !== resolve(logArtifact.path) || metadata.windowSha256 !== logArtifact.sha256 || metadata.loadingModuleResref !== profile.engineLog.loadingModuleResref || !Array.isArray(metadata.requiredTokens) || metadata.requiredTokens.length !== profile.engineLog.requiredTokens.length || metadata.requiredTokens.some((entry, index) => entry.token !== profile.engineLog.requiredTokens[index] || entry.present !== true) || !sameProcess(metadata.process, observation.process)) failures.push("runtime_engine_log_metadata_invalid");
}

function validateVisualReview(profile, artifacts, failures) {
  const reviewArtifact = artifacts.get("runtime-visual-review");
  const captureArtifact = artifacts.get("runtime-capture");
  if (!reviewArtifact || !captureArtifact || !existsSync(reviewArtifact.path)) return;
  const review = readJson(reviewArtifact.path);
  if (review.version !== "aur-s07-runtime-visual-review/v1" || review.status !== "accepted" || review.profileId !== profile.id || review.profileSha256 !== profileSha256 || review.moduleSha256 !== profile.module.sha256 || resolve(review.capture?.path ?? "") !== resolve(captureArtifact.path) || review.capture?.sha256 !== captureArtifact.sha256 || review.modelVisibility?.status !== "visible" || review.modelVisibility?.blank !== false || review.modelVisibility?.placeholder !== false) failures.push("runtime_visual_review_invalid");
}

function captureArtifactFromMetadata(capture, observation, profile) {
  if (capture.version !== "aurora-nwmain-proof-video-capture/v1" || capture.ok !== true || capture.status !== "verified" || capture.capture?.source !== "physical desktop pixels clipped to the exact owned nwmain client area" || !existsSync(resolve(capture.capture?.path ?? "")) || capture.capture?.sha256 !== sha256File(capture.capture.path) || capture.capture?.sizeBytes !== statSync(capture.capture.path).size || capture.capture?.validation?.decode !== "verified" || capture.capture?.validation?.codec !== "h264" || capture.capture?.validation?.faststart !== true || capture.capture?.requestedDurationSeconds < profile.evidencePolicy.minimumCaptureDurationSeconds || capture.monitor?.primary !== false || capture.identityObservation?.allStable !== true || capture.identityObservation?.allProbePointsOwnedByNwmain !== true || capture.safety?.startsNwn !== false || capture.safety?.usesGlobalInput !== false || capture.safety?.changesZOrder !== false || capture.safety?.activatesWindow !== false || capture.process?.name !== "nwmain" || capture.process?.pid !== observation.process?.pid || capture.process?.startedAtUtc !== observation.process?.startedAt) throw new Error("runtime_capture_binding_invalid");
  return { path: resolve(capture.capture.path), sha256: capture.capture.sha256, bytes: capture.capture.sizeBytes };
}

function selectBoundLogWindow(profile, baseline, requestCreatedAt) {
  const sourcePath = resolve(profile.engineLog.path);
  if (!existsSync(sourcePath)) return null;
  const current = snapshotFile(sourcePath);
  const currentBytes = readFileSync(sourcePath);
  let selected;
  try { selected = selectFreshLogSlice({ baseline, current, currentBytes, requestCreatedAt }); }
  catch (error) {
    if (/engine_log_not_updated_after_baseline|engine_log_not_fresh_for_request/u.test(String(error?.message ?? error))) return null;
    throw error;
  }
  const bytes = selected.resetRequired ? currentBytes : selected.bytes;
  const text = bytes.toString("utf8");
  const expression = new RegExp(`(?:^|\\s)Loading Module:\\s*${escapeRegex(profile.engineLog.loadingModuleResref)}(?:\\s|$)`, "iu");
  const loadingLines = text.split(/\r?\n/u).filter((line) => expression.test(line));
  return {
    bytes,
    after: current,
    mode: selected.resetRequired ? `${selected.mode}_fresh_whole_file` : selected.mode,
    byteStart: selected.resetRequired ? 0 : selected.byteStart,
    byteEnd: currentBytes.length,
    loadingLine: loadingLines.length === 1 ? loadingLines[0] : null,
    requiredTokens: profile.engineLog.requiredTokens.map((token) => ({ token, present: text.includes(token) })),
  };
}

function readBoundRequest(profile, outputDirectory) {
  const requestPath = resolve(outputDirectory, "aur-s07-runtime-launch-request.json");
  if (!existsSync(requestPath)) throw new Error("runtime_launch_request_missing");
  const request = readJson(requestPath);
  if (request.version !== "aur-s07-runtime-launch-request/v1" || request.profileId !== profile.id || request.profileSha256 !== profileSha256 || request.moduleSha256 !== profile.module.sha256 || request.area !== profile.module.area || JSON.stringify(request.entryPoint) !== JSON.stringify(profile.module.entryPoint)) throw new Error("runtime_launch_request_binding_mismatch");
  return request;
}

function requireObservationBinding(profile, observation) {
  if (observation.version !== "aur-s07-runtime-observation/v1" || observation.profileId !== profile.id || observation.profileSha256 !== profileSha256 || observation.moduleSha256 !== profile.module.sha256 || observation.area !== profile.module.area || JSON.stringify(observation.entryPoint) !== JSON.stringify(profile.module.entryPoint) || observation.process?.name !== profile.launch.processName || !Number.isInteger(observation.process?.pid) || !Number.isFinite(Date.parse(observation.process?.startedAt))) throw new Error("runtime_observation_binding_mismatch");
}

function requiredArtifactKinds(profile) { return profile.evidencePolicy ? ENHANCED_ARTIFACT_KINDS : BASE_ARTIFACT_KINDS; }
function requireEnhancedEvidenceProfile(profile) { if (!profile.evidencePolicy) throw new Error("runtime_enhanced_evidence_profile_required"); }
function fileArtifact(kind, path) { if (!path || !existsSync(path)) throw new Error(`runtime_artifact_missing:${kind}`); return { kind, path: resolve(path), sha256: sha256File(path) }; }
function snapshotFile(path) { const stat = statSync(path, { bigint: true }); return { capturedAtUtc: new Date().toISOString(), identity: { dev: stat.dev.toString(), ino: stat.ino.toString(), size: stat.size.toString(), mtimeNs: stat.mtimeNs.toString() }, sha256: sha256File(path) }; }
function sameProcess(left, right) { return left?.name === right?.name && left?.pid === right?.pid && (left?.startedAt ?? left?.startedAtUtc) === (right?.startedAt ?? right?.startedAtUtc); }
function strictBoolean(value, label) { if (value === "true") return true; if (value === "false") return false; throw new Error(`invalid:${label}`); }
function required(value, label) { const text = String(value ?? "").trim(); if (!text) throw new Error(`missing:${label}`); return text; }
function boundedInteger(value, label, minimum, maximum) { const number = Number(value); if (!Number.isInteger(number) || number < minimum || number > maximum) throw new Error(`invalid:${label}`); return number; }
function sleepMs(milliseconds) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds); }
function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"); }
function sha256Bytes(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function sha256File(path) { return sha256Bytes(readFileSync(path)); }

function waitForExactlyOneNwnProcess(name, timeoutMs) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 0 || timeoutMs > 120_000) throw new Error("runtime_observation_timeout_invalid");
  const deadline = Date.now() + timeoutMs;
  let processes = readNwnProcesses(name);
  while (Date.now() < deadline) {
    if (processes.length > 1) return processes;
    if (processes.length === 1 && processes[0].responding === true && Number.isInteger(processes[0].mainWindowHandle) && processes[0].mainWindowHandle > 0) return processes;
    execFileSync("powershell.exe", ["-NoProfile", "-Command", "Start-Sleep -Milliseconds 250"], { windowsHide: true });
    processes = readNwnProcesses(name);
  }
  return processes;
}

function assertOrderedHakHashes(haks) {
  for (const hak of haks) {
    if (!hak.path || !/^[a-f0-9]{64}$/u.test(hak.sha256 ?? "")) throw new Error(`runtime_hak_binding_invalid:${hak.resref ?? "unknown"}`);
    assertFileHash(hak.path, hak.sha256, `runtime_hak_hash_mismatch:${hak.resref ?? basename(hak.path)}`);
  }
}
function assertFileHash(path, expected, code) { if (!existsSync(path) || createHash("sha256").update(readFileSync(path)).digest("hex") !== expected) throw new Error(code); }
function assertAbsent(path, code) { if (existsSync(path)) throw new Error(code); }

function readNwnProcesses(name) {
  const raw = execFileSync("powershell.exe", ["-NoProfile", "-Command", `@((Get-Process ${name} -ErrorAction SilentlyContinue) | ForEach-Object { [PSCustomObject]@{ Id = $_.Id; ProcessName = $_.ProcessName; StartTime = $_.StartTime.ToUniversalTime().ToString('o'); Responding = $_.Responding; MainWindowHandle = $_.MainWindowHandle.ToInt64(); MainWindowTitle = $_.MainWindowTitle } }) | ConvertTo-Json -Compress`], { encoding: "utf8", windowsHide: true }).trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return (Array.isArray(parsed) ? parsed : [parsed]).map((process) => ({ pid: process.Id, name: String(process.ProcessName ?? "").toLowerCase(), startedAt: process.StartTime ?? null, responding: process.Responding !== false, mainWindowHandle: Number(process.MainWindowHandle ?? 0), title: String(process.MainWindowTitle ?? "") }));
}
function requireOutDir() { if (!outDir) throw new Error("missing:--outDir"); return outDir; }
function parseArgs(argv) { const result = {}; for (let i = 0; i < argv.length; i += 1) { const token = argv[i], value = argv[i + 1]; if (!token?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`invalid:${token ?? "end"}`); result[token.slice(2)] = value; i += 1; } return result; }
function requiredPath(value, name) { if (!value) throw new Error(`missing:${name}`); return resolve(value); }
function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function print(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
