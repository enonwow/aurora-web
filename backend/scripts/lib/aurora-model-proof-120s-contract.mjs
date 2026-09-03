import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const MODEL_PROOF_VERSION = "aurora-model-proof-120s-profile/v1";
const SHA256 = /^[a-f0-9]{64}$/u;
const ENTRY_MODES = new Set(["adopt-exact-clean", "switch-exact-clean"]);
const VISIBILITY = new Set(["visible", "not_visible"]);

export function selectFreshLogSlice({ baseline, current, currentBytes, requestCreatedAt }) {
  assert.ok(Buffer.isBuffer(currentBytes), "engine_log_bytes_invalid");
  assert.match(baseline?.sha256 ?? "", SHA256, "engine_log_baseline_hash_invalid");
  for (const [name, identity] of [["baseline", baseline?.identity], ["current", current?.identity]]) {
    assert.ok(identity && ["dev", "ino", "size", "mtimeNs"].every((field) => /^\d+$/u.test(String(identity[field] ?? ""))), `engine_log_${name}_identity_invalid`);
  }
  const baselineSize = BigInt(baseline.identity.size);
  const currentSize = BigInt(current.identity.size);
  assert.equal(BigInt(currentBytes.length), currentSize, "engine_log_snapshot_size_drift");
  assert.ok(baselineSize <= BigInt(Number.MAX_SAFE_INTEGER), "engine_log_baseline_too_large");
  const sameIdentity = current.identity.dev === baseline.identity.dev && current.identity.ino === baseline.identity.ino;
  const prefixPreserved = currentSize >= baselineSize
    && createHash("sha256").update(currentBytes.subarray(0, Number(baselineSize))).digest("hex") === baseline.sha256;
  const requestMs = Date.parse(requestCreatedAt);
  assert.ok(Number.isFinite(requestMs), "engine_log_request_time_invalid");
  const requestNs = BigInt(Math.trunc(requestMs)) * 1_000_000n;
  const currentMtimeNs = BigInt(current.identity.mtimeNs);
  const baselineMtimeNs = BigInt(baseline.identity.mtimeNs);
  assert.ok(currentMtimeNs > baselineMtimeNs, "engine_log_not_updated_after_baseline");
  assert.ok(currentMtimeNs >= requestNs, "engine_log_not_fresh_for_request");

  if (!prefixPreserved) {
    return {
      mode: sameIdentity ? "truncation_observed" : "rotation_observed",
      resetRequired: true,
      byteStart: currentBytes.length,
      byteEnd: currentBytes.length,
      bytes: Buffer.alloc(0),
      sameIdentity,
      prefixPreserved,
    };
  }
  const mode = sameIdentity ? "append_same_identity" : "rotated_preserved_prefix";
  const byteStart = Number(baselineSize);
  return {
    mode,
    resetRequired: false,
    byteStart,
    byteEnd: currentBytes.length,
    bytes: currentBytes.subarray(byteStart),
    sameIdentity,
    prefixPreserved,
  };
}

export function validateModelProofProfile(input) {
  assert.equal(input?.version, MODEL_PROOF_VERSION, "model_proof_profile_version_invalid");
  assert.match(input?.id ?? "", /^[a-z0-9][a-z0-9-]{2,127}$/u, "model_proof_profile_id_invalid");
  assert.equal(input?.hardLimitMs, 120_000, "model_proof_hard_limit_invalid");
  for (const field of ["binaryProfile", "toolsetProfile", "runtimeProfile"]) requireArtifact(input?.[field], field);
  requireArtifact(input?.routeManifest, "routeManifest");
  requireArtifact(input?.installedModule, "installedModule", true);
  assert.ok(Array.isArray(input?.orderedHakList) && input.orderedHakList.length > 0, "ordered_hak_list_invalid");
  for (const [index, hak] of input.orderedHakList.entries()) {
    assert.match(hak?.resref ?? "", /^[a-z0-9_]{1,16}$/u, `hak_resref_invalid:${index}`);
    requireArtifact(hak, `orderedHakList:${index}`, true);
  }
  requireResource(input?.resources?.mdl, "mdl");
  requireResource(input?.resources?.tga, "tga");
  assert.match(input?.resources?.appearance2da?.resref ?? "", /^[a-z0-9_]{1,16}$/u, "appearance_2da_resref_invalid");
  assert.ok(Number.isInteger(input?.resources?.appearance2da?.row) && input.resources.appearance2da.row >= 0, "appearance_row_invalid");
  assert.match(input?.resources?.appearance2da?.sha256 ?? "", SHA256, "appearance_2da_hash_invalid");
  assert.match(input?.area?.resref ?? "", /^[a-z0-9_]{1,16}$/u, "area_resref_invalid");
  assert.ok(String(input?.area?.displayName ?? "").trim(), "area_display_name_invalid");
  requireVector(input?.area?.entryPoint, "area_entry_point");
  assert.ok(String(input?.fixture?.id ?? "").trim(), "fixture_id_invalid");
  assert.match(input?.fixture?.templateResRef ?? "", /^[a-z0-9_]{1,16}$/u, "fixture_template_invalid");
  assert.ok(String(input?.fixture?.treeObjectText ?? "").trim(), "fixture_tree_text_invalid");
  assert.ok(Number.isInteger(input?.fixture?.occurrence) && input.fixture.occurrence >= 0, "fixture_occurrence_invalid");
  assert.ok(Number.isInteger(input?.fixture?.appearanceRow) && input.fixture.appearanceRow >= 0, "fixture_appearance_invalid");
  requireVector(input?.fixture?.position, "fixture_position");
  assert.match(input?.runtime?.loadingModuleResref ?? "", /^[a-z0-9_]{1,16}$/u, "runtime_module_token_invalid");
  assert.ok(isAbsoluteWindowsPath(input?.runtime?.engineLogPath), "runtime_engine_log_path_invalid");
  assert.ok(ENTRY_MODES.has(input?.entryMode), "entry_mode_requires_proof_ready_toolset");
  assert.ok(isAbsoluteWindowsPath(input?.outputRoot), "output_root_invalid");
  for (const key of ["noSave", "noBuild", "noRepack", "noFocus", "noCamera", "noRetry"]) {
    assert.equal(input?.policy?.[key], true, `policy_invalid:${key}`);
  }
  return structuredClone(input);
}

export function createClock({ counter, frequency }) {
  const start = BigInt(counter);
  const rate = BigInt(frequency);
  assert.ok(start >= 0n && rate > 0n, "qpc_invalid");
  return {
    version: "aurora-model-proof-monotonic-clock/v1",
    source: "Windows.QueryPerformanceCounter",
    frequency: rate.toString(),
    startCounter: start.toString(),
    deadlineCounter: (start + (rate * 120_000n) / 1_000n).toString(),
    hardLimitMs: 120_000,
  };
}

export function deadlineStatus(clock, currentCounter) {
  assert.equal(clock?.version, "aurora-model-proof-monotonic-clock/v1", "clock_version_invalid");
  assert.equal(clock?.source, "Windows.QueryPerformanceCounter", "clock_source_invalid");
  assert.equal(clock?.hardLimitMs, 120_000, "clock_hard_limit_invalid");
  const start = BigInt(clock.startCounter);
  const current = BigInt(currentCounter);
  const frequency = BigInt(clock.frequency);
  const deadline = BigInt(clock.deadlineCounter);
  assert.ok(start >= 0n && frequency > 0n, "clock_values_invalid");
  assert.equal(deadline, start + (frequency * 120_000n) / 1_000n, "clock_deadline_invalid");
  if (current < start) throw new Error("counter_moved_backwards");
  const elapsedMs = Number(((current - start) * 1_000n) / frequency);
  const remainingMs = Math.max(0, clock.hardLimitMs - elapsedMs);
  return { elapsedMs, remainingMs, expired: current >= deadline };
}

export function nextState(previous, event, counter, clock) {
  const deadline = deadlineStatus(clock, counter);
  if (previous.status === "deadline" && event !== "deadline") throw new Error("deadline_expired");
  if (deadline.expired && event !== "deadline") throw new Error("deadline_expired");
  const dispatches = { ...(previous.dispatches ?? {}) };
  if ((dispatches[event] ?? 0) > 0) throw new Error(`phase_already_dispatched:${event}`);
  dispatches[event] = 1;
  const value = { ...previous, dispatches, lastElapsedMs: deadline.elapsedMs };
  if (event === "deadline") return { ...value, status: "deadline" };
  switch (`${previous.status}:${event}`) {
    case "ready:toolset-captured": return { ...value, status: "toolset_captured" };
    case "toolset_captured:record-toolset-visible": return { ...value, status: "toolset_visible", toolsetVerdict: "visible" };
    case "toolset_captured:record-toolset-not-visible": return { ...value, status: "toolset_not_visible", toolsetVerdict: "not_visible" };
    case "toolset_visible:runtime-started": return { ...value, status: "runtime_running" };
    case "runtime_running:runtime-captured": return { ...value, status: "runtime_captured" };
    case "runtime_captured:record-runtime-visible": return { ...value, status: "runtime_visible", runtimeVerdict: "visible" };
    case "runtime_captured:record-runtime-not-visible": return { ...value, status: "runtime_not_visible", runtimeVerdict: "not_visible" };
    case "runtime_visible:finalize":
    case "runtime_not_visible:finalize":
    case "toolset_not_visible:finalize": return { ...value, status: "finalized" };
    default: throw new Error(`invalid_transition:${previous.status}:${event}`);
  }
}

export function buildVerdict({ environment, captureSha256, expectedCaptureSha256, modelVisibility, inspection }) {
  assert.ok(environment === "toolset" || environment === "runtime", "environment_invalid");
  assert.match(captureSha256 ?? "", SHA256, "capture_hash_invalid");
  assert.equal(captureSha256, expectedCaptureSha256, "capture_hash_mismatch");
  assert.ok(VISIBILITY.has(modelVisibility), "visual_verdict_required");
  assert.ok(String(inspection ?? "").trim(), "inspection_required");
  return {
    environment,
    captureSha256,
    modelVisibility,
    proofCompleteness: "verified",
    inspection: String(inspection).trim(),
  };
}

export function validatePngBytes(bytes) {
  const value = Buffer.from(bytes ?? []);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.ok(value.length >= 45 && value.subarray(0, 8).equals(signature), "invalid_png_signature");
  let offset = 8;
  let width = 0;
  let height = 0;
  let sawHeader = false;
  let sawImageData = false;
  let sawEnd = false;
  while (offset < value.length) {
    assert.ok(offset + 12 <= value.length, "invalid_png_chunk_header");
    const length = value.readUInt32BE(offset);
    const typeStart = offset + 4;
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const crcOffset = dataEnd;
    assert.ok(dataEnd + 4 <= value.length, "invalid_png_chunk_length");
    const type = value.subarray(typeStart, dataStart).toString("ascii");
    const expectedCrc = value.readUInt32BE(crcOffset);
    const actualCrc = crc32(value.subarray(typeStart, dataEnd));
    assert.equal(actualCrc, expectedCrc, `invalid_png_crc:${type}`);
    if (!sawHeader) {
      assert.equal(type, "IHDR", "invalid_png_first_chunk");
      assert.equal(length, 13, "invalid_png_ihdr_length");
      width = value.readUInt32BE(dataStart);
      height = value.readUInt32BE(dataStart + 4);
      assert.ok(width > 0 && height > 0, "invalid_png_dimensions");
      sawHeader = true;
    } else if (type === "IHDR") {
      assert.fail("invalid_png_duplicate_ihdr");
    }
    if (type === "IDAT") sawImageData = true;
    if (type === "IEND") {
      assert.equal(length, 0, "invalid_png_iend_length");
      assert.equal(dataEnd + 4, value.length, "invalid_png_trailing_bytes");
      sawEnd = true;
      break;
    }
    offset = dataEnd + 4;
  }
  assert.ok(sawHeader && sawImageData && sawEnd, "invalid_png_required_chunks");
  return { byteLength: value.length, width, height };
}

export function validateCleanupEvidence({
  profileId,
  profileSha256,
  state,
  actualArtifacts,
  runtimePacket,
  acceptedProof,
  readySession,
}) {
  assert.equal(state?.version, "aurora-model-proof-120s-state/v1", "cleanup_state_version_invalid");
  assert.equal(state?.profileId, profileId, "cleanup_state_profile_id_drift");
  assert.equal(state?.profileSha256, profileSha256, "cleanup_state_profile_hash_drift");
  assert.ok(Number.isInteger(readySession?.processId) && readySession.processId > 0, "cleanup_toolset_pid_invalid");
  assert.ok(Number.isFinite(Date.parse(readySession?.startedAtUtc)), "cleanup_toolset_start_invalid");
  assert.ok(actualArtifacts && typeof actualArtifacts === "object", "cleanup_actual_artifacts_invalid");
  const acceptedFinalPacket = acceptedProof?.status === "verified";

  if (runtimePacket != null || state?.artifacts?.runtimePacket != null) {
    assert.equal(acceptedFinalPacket, true, "cleanup_runtime_requires_accepted_final_packet");
    assert.ok(
      new Set(["runtime_captured", "runtime_visible", "runtime_not_visible", "finalized", "deadline"]).has(state?.status),
      "cleanup_runtime_state_invalid",
    );
    for (const name of ["runtimeCapture", "runtimeLog", "runtimePacket"]) {
      requireCleanupArtifact(name, state.artifacts?.[name], actualArtifacts[name]);
    }
    assert.equal(runtimePacket?.version, "aurora-model-proof-120s-runtime-packet/v1", "cleanup_runtime_packet_version_invalid");
    assert.equal(runtimePacket?.profileId, profileId, "cleanup_runtime_packet_profile_id_drift");
    assert.equal(runtimePacket?.profileSha256, profileSha256, "cleanup_runtime_packet_profile_hash_drift");
    assert.ok(Number.isInteger(runtimePacket?.process?.pid) && runtimePacket.process.pid > 0, "cleanup_runtime_pid_invalid");
    assert.equal(runtimePacket?.process?.name, "nwmain", "cleanup_runtime_process_name_invalid");
    assert.ok(Number.isFinite(Date.parse(runtimePacket?.process?.startedAtUtc)), "cleanup_runtime_start_invalid");
    assert.ok(Number.isInteger(runtimePacket?.process?.mainWindowHandle) && runtimePacket.process.mainWindowHandle > 0, "cleanup_runtime_hwnd_invalid");
    assert.ok(typeof runtimePacket?.process?.title === "string" && runtimePacket.process.title, "cleanup_runtime_title_invalid");
    requireCleanupPacketBinding("capture", runtimePacket.capture, state.artifacts.runtimeCapture);
    requireCleanupPacketBinding("engine_log", runtimePacket.engineLogWindow, state.artifacts.runtimeLog);
    return {
      mode: "runtime",
      runtimeProcess: { ...runtimePacket.process },
      toolsetProcess: {
        pid: readySession.processId,
        startedAtUtc: readySession.startedAtUtc,
      },
      acceptedFinalPacket,
    };
  }

  assert.equal(acceptedFinalPacket, true, "cleanup_toolset_only_requires_accepted_final_packet");
  assert.equal(state?.status, "finalized", "cleanup_toolset_only_state_invalid");
  assert.equal(state?.toolsetVerdict, "not_visible", "cleanup_toolset_only_verdict_invalid");
  assert.equal(state?.runtimeVerdict, null, "cleanup_toolset_only_runtime_verdict_invalid");
  for (const name of ["toolsetCapture", "toolsetPacket", "toolsetVerdict"]) {
    requireCleanupArtifact(name, state.artifacts?.[name], actualArtifacts[name]);
  }
  return {
    mode: "toolset-only",
    runtimeProcess: null,
    toolsetProcess: {
      pid: readySession.processId,
      startedAtUtc: readySession.startedAtUtc,
    },
    acceptedFinalPacket: true,
  };
}

export function validateAcceptedRuntimeNwmainCleanupAdmission({
  profileId,
  profileSha256,
  acceptedProof,
  runtimePacket,
  runtimeArtifacts,
  hostState,
}) {
  assert.equal(acceptedProof?.status, "verified", "cleanup_nwmain_accepted_proof_required");
  assert.ok(typeof acceptedProof?.path === "string" && acceptedProof.path, "cleanup_nwmain_accepted_proof_path_invalid");
  assert.match(acceptedProof?.sha256 ?? "", SHA256, "cleanup_nwmain_accepted_proof_hash_invalid");
  assert.ok(typeof profileId === "string" && profileId, "cleanup_nwmain_profile_id_invalid");
  assert.match(profileSha256 ?? "", SHA256, "cleanup_nwmain_profile_hash_invalid");
  assert.equal(runtimePacket?.version, "aurora-model-proof-120s-runtime-packet/v1", "cleanup_nwmain_runtime_packet_version_invalid");
  assert.equal(runtimePacket?.profileId, profileId, "cleanup_nwmain_runtime_packet_profile_id_drift");
  assert.equal(runtimePacket?.profileSha256, profileSha256, "cleanup_nwmain_runtime_packet_profile_hash_drift");
  requireCleanupPacketBinding("capture", runtimePacket?.capture, runtimeArtifacts?.runtimeCapture);
  requireCleanupPacketBinding("engine_log", runtimePacket?.engineLogWindow, runtimeArtifacts?.runtimeLog);

  const expected = runtimePacket?.process;
  assert.ok(Number.isInteger(expected?.pid) && expected.pid > 0, "cleanup_nwmain_expected_pid_invalid");
  assert.equal(expected?.name, "nwmain", "cleanup_nwmain_expected_name_invalid");
  assert.ok(Number.isFinite(Date.parse(expected?.startedAtUtc)), "cleanup_nwmain_expected_start_invalid");
  assert.ok(Number.isInteger(expected?.mainWindowHandle) && expected.mainWindowHandle > 0, "cleanup_nwmain_expected_hwnd_invalid");
  assert.ok(typeof expected?.title === "string" && expected.title, "cleanup_nwmain_expected_title_invalid");

  assert.ok(Array.isArray(hostState?.nwmainProcesses), "cleanup_nwmain_processes_invalid");
  assert.ok(Array.isArray(hostState?.nwmainWindows), "cleanup_nwmain_windows_invalid");
  assert.equal(hostState?.nwmainCount, hostState.nwmainProcesses.length, "cleanup_nwmain_count_snapshot_drift");
  assert.equal(hostState.nwmainProcesses.length, 1, "cleanup_nwmain_process_count_invalid");
  const process = hostState.nwmainProcesses[0];
  assert.equal(process?.pid, expected.pid, "cleanup_nwmain_pid_drift");
  assert.equal(Date.parse(process?.startedAtUtc), Date.parse(expected.startedAtUtc), "cleanup_nwmain_start_drift");
  assert.equal(process?.name, "nwmain", "cleanup_nwmain_name_drift");
  assert.equal(process?.mainWindowHandle, expected.mainWindowHandle, "cleanup_nwmain_hwnd_drift");
  assert.equal(process?.title, expected.title, "cleanup_nwmain_title_drift");

  const visibleOwnedWindows = hostState.nwmainWindows.filter(
    (window) => window?.processId === expected.pid && window?.visible === true,
  );
  const exactWindows = visibleOwnedWindows.filter((window) => window?.hwnd === expected.mainWindowHandle);
  assert.equal(exactWindows.length, 1, "cleanup_nwmain_hwnd_drift");
  const window = exactWindows[0];
  const modalOrForeign = visibleOwnedWindows.filter(
    (candidate) => candidate.hwnd !== expected.mainWindowHandle
      || candidate.enabled !== true
      || candidate.ownerHwnd !== 0
      || candidate.className === "#32770",
  );
  assert.equal(modalOrForeign.length, 0, "cleanup_nwmain_modal_detected");
  assert.equal(window.enabled, true, "cleanup_nwmain_modal_detected");
  assert.equal(window.ownerHwnd, 0, "cleanup_nwmain_modal_detected");
  assert.notEqual(window.className, "#32770", "cleanup_nwmain_modal_detected");
  assert.equal(window.title, expected.title, "cleanup_nwmain_window_title_drift");

  return {
    version: "aurora-model-proof-120s-live-nwmain-cleanup-admission/v1",
    profileId,
    profileSha256,
    acceptedProof,
    process,
    window,
    capture: runtimePacket.capture,
    engineLogWindow: runtimePacket.engineLogWindow,
    gracefulFirst: true,
    forceFallbackRequiresExactIdentity: true,
  };
}

export function validatePostRuntimeHiddenToolsetCleanupAdmission({
  profileId,
  profileSha256,
  moduleName,
  areaResref,
  acceptedProof,
  readySession,
  hostState,
  nwmainAdmission = null,
}) {
  assert.equal(acceptedProof?.status, "verified", "cleanup_hidden_accepted_proof_required");
  assert.ok(typeof acceptedProof?.path === "string" && acceptedProof.path, "cleanup_hidden_accepted_proof_path_invalid");
  assert.match(acceptedProof?.sha256 ?? "", SHA256, "cleanup_hidden_accepted_proof_hash_invalid");
  assert.ok(typeof profileId === "string" && profileId, "cleanup_hidden_profile_id_invalid");
  assert.match(profileSha256 ?? "", SHA256, "cleanup_hidden_profile_hash_invalid");
  assert.ok(typeof moduleName === "string" && moduleName, "cleanup_hidden_module_name_invalid");
  assert.ok(typeof areaResref === "string" && areaResref, "cleanup_hidden_area_invalid");
  assert.ok(Number.isInteger(readySession?.processId) && readySession.processId > 0, "cleanup_hidden_ready_pid_invalid");
  assert.ok(typeof readySession?.startedAtUtc === "string" && Number.isFinite(Date.parse(readySession.startedAtUtc)), "cleanup_hidden_ready_start_invalid");
  assert.ok(Number.isInteger(readySession?.frameHwnd) && readySession.frameHwnd > 0, "cleanup_hidden_ready_frame_invalid");
  assert.ok(typeof readySession?.frameTitle === "string" && readySession.frameTitle, "cleanup_hidden_ready_title_invalid");
  assert.equal(readySession?.area, areaResref, "cleanup_hidden_ready_area_drift");
  if (nwmainAdmission == null) {
    assert.equal(hostState?.nwmainCount, 0, "cleanup_hidden_nwmain_must_be_zero");
  } else {
    assert.equal(
      nwmainAdmission?.version,
      "aurora-model-proof-120s-live-nwmain-cleanup-admission/v1",
      "cleanup_hidden_nwmain_admission_invalid",
    );
    assert.equal(hostState?.nwmainCount, 1, "cleanup_hidden_nwmain_count_drift");
  }
  assert.ok(Array.isArray(hostState?.processes), "cleanup_hidden_processes_invalid");
  assert.equal(hostState.processes.length, 1, "cleanup_hidden_toolset_count_invalid");
  const process = hostState.processes[0];
  assert.equal(process?.pid, readySession.processId, "cleanup_hidden_process_pid_drift");
  assert.equal(process?.startedAtUtc, readySession.startedAtUtc, "cleanup_hidden_process_start_drift");
  assert.equal(process?.responding, true, "cleanup_hidden_process_not_responding");
  assert.ok(Array.isArray(hostState?.windows), "cleanup_hidden_windows_invalid");
  const frames = hostState.windows.filter(
    (window) => window?.processId === process.pid
      && window?.className === "TfrmFrame"
      && window?.hwnd === readySession.frameHwnd,
  );
  assert.equal(frames.length, 1, "cleanup_hidden_frame_missing");
  const frame = frames[0];
  assert.equal(frame.title?.endsWith("*"), false, "cleanup_hidden_frame_dirty");
  assert.equal(frame.title, readySession.frameTitle, "cleanup_hidden_frame_title_drift");
  assert.equal(frame.title.endsWith(` - ${moduleName}`), true, "cleanup_hidden_frame_module_drift");
  assert.equal(frame.visible, false, "cleanup_hidden_frame_not_hidden");
  const visibleWindows = hostState.windows.filter((window) => window?.processId === process.pid && window?.visible === true);
  assert.equal(
    visibleWindows.some((window) => /access violation/iu.test(String(window?.title ?? ""))),
    false,
    "cleanup_hidden_access_violation",
  );
  const modals = visibleWindows.filter((window) => window?.className !== "TApplication");
  assert.equal(modals.length, 0, "cleanup_hidden_visible_modal");
  const applications = visibleWindows.filter((window) => window?.className === "TApplication");
  assert.equal(applications.length, 1, "cleanup_hidden_application_window_invalid");
  const application = applications[0];
  assert.equal(application.iconic, true, "cleanup_hidden_application_not_iconic");
  const result = {
    version: "aurora-model-proof-120s-post-runtime-hidden-toolset-cleanup-admission/v1",
    profileId,
    profileSha256,
    acceptedProof,
    process,
    frame,
    application,
    moduleName,
    areaResref,
    nwmainCount: hostState.nwmainCount,
    gracefulFirst: true,
    forceFallbackRequiresExactIdentity: true,
  };
  if (nwmainAdmission != null) result.nwmainAdmission = nwmainAdmission;
  return result;
}

export function validateToolsetOnlyVisibleReadyCleanupAdmission({
  profileId,
  profileSha256,
  moduleName,
  areaResref,
  acceptedProof,
  readySession,
  hostState,
  readyProbe,
}) {
  assert.equal(acceptedProof?.status, "verified", "cleanup_visible_accepted_proof_required");
  assert.ok(typeof acceptedProof?.path === "string" && acceptedProof.path, "cleanup_visible_accepted_proof_path_invalid");
  assert.match(acceptedProof?.sha256 ?? "", SHA256, "cleanup_visible_accepted_proof_hash_invalid");
  assert.ok(typeof profileId === "string" && profileId, "cleanup_visible_profile_id_invalid");
  assert.match(profileSha256 ?? "", SHA256, "cleanup_visible_profile_hash_invalid");
  assert.ok(typeof moduleName === "string" && moduleName, "cleanup_visible_module_name_invalid");
  assert.equal(readySession?.area, areaResref, "cleanup_visible_ready_area_drift");
  assert.equal(hostState?.nwmainCount, 0, "cleanup_visible_nwmain_must_be_zero");
  assert.ok(Array.isArray(hostState?.processes), "cleanup_visible_processes_invalid");
  assert.equal(hostState.processes.length, 1, "cleanup_visible_toolset_count_invalid");
  const process = hostState.processes[0];
  assert.equal(process?.pid, readySession?.processId, "cleanup_visible_process_pid_drift");
  assert.equal(process?.startedAtUtc, readySession?.startedAtUtc, "cleanup_visible_process_start_drift");
  assert.equal(process?.responding, true, "cleanup_visible_process_not_responding");
  assert.equal(readyProbe?.processId, readySession?.processId, "cleanup_visible_probe_pid_drift");
  assert.equal(readyProbe?.startedAtUtc, readySession?.startedAtUtc, "cleanup_visible_probe_start_drift");
  assert.equal(readyProbe?.frameHwnd, readySession?.frameHwnd, "cleanup_visible_probe_frame_drift");
  assert.equal(readyProbe?.frameTitle, readySession?.frameTitle, "cleanup_visible_probe_title_drift");
  assert.equal(readyProbe?.area, areaResref, "cleanup_visible_probe_area_drift");
  assert.equal(readyProbe?.responding, true, "cleanup_visible_probe_not_responding");
  assert.equal(readyProbe?.modalCount, 0, "cleanup_visible_probe_modal_present");
  assert.equal(readyProbe?.nwmainCount, 0, "cleanup_visible_probe_nwmain_present");
  assert.ok(Array.isArray(hostState?.windows), "cleanup_visible_windows_invalid");
  const frames = hostState.windows.filter(
    (window) => window?.processId === process.pid
      && window?.className === "TfrmFrame"
      && window?.hwnd === readySession.frameHwnd,
  );
  assert.equal(frames.length, 1, "cleanup_visible_frame_missing");
  const frame = frames[0];
  assert.equal(frame?.visible, true, "cleanup_visible_frame_not_visible");
  assert.equal(frame?.title, readySession.frameTitle, "cleanup_visible_frame_title_drift");
  assert.equal(frame.title.endsWith("*"), false, "cleanup_visible_frame_dirty");
  assert.equal(frame.title.endsWith(` - ${moduleName}`), true, "cleanup_visible_frame_module_drift");
  const unexpectedVisible = hostState.windows.filter(
    (window) => window?.processId === process.pid
      && window?.visible === true
      && window?.hwnd !== frame.hwnd
      && window?.className !== "TApplication",
  );
  assert.equal(unexpectedVisible.length, 0, "cleanup_visible_modal_present");
  return {
    version: "aurora-model-proof-120s-toolset-only-visible-ready-cleanup-admission/v1",
    profileId,
    profileSha256,
    acceptedProof,
    process,
    frame,
    moduleName,
    areaResref,
    nwmainCount: 0,
    gracefulFirst: true,
    forceFallbackRequiresExactIdentity: true,
  };
}

export function validateFailedLaneRecoveryAdmission({
  profileId,
  profileSha256,
  outputRoot,
  state,
  readyPacket,
  blocker,
  clock,
  existingFiles,
  hostSession,
  nextAttempt,
}) {
  assert.ok(typeof profileId === "string" && profileId, "failed_lane_profile_id_invalid");
  assert.match(profileSha256 ?? "", SHA256, "failed_lane_profile_hash_invalid");
  assert.equal(state?.version, "aurora-model-proof-120s-state/v1", "failed_lane_state_version_invalid");
  assert.equal(state?.profileId, profileId, "failed_lane_state_profile_id_drift");
  assert.equal(state?.profileSha256, profileSha256, "failed_lane_state_profile_hash_drift");
  assert.equal(state?.status, "ready", "failed_lane_state_not_ready");
  assert.deepEqual(state?.dispatches, {}, "failed_lane_dispatch_present");
  assert.deepEqual(state?.artifacts, {}, "failed_lane_artifact_present");
  assert.equal(state?.toolsetVerdict, null, "failed_lane_toolset_verdict_present");
  assert.equal(state?.runtimeVerdict, null, "failed_lane_runtime_verdict_present");
  assert.equal(state?.ready?.path, `${outputRoot}\\ready.json`, "failed_lane_ready_path_drift");
  assert.equal(blocker?.version, "aurora-model-proof-120s-blocker/v1", "failed_lane_blocker_version_invalid");
  assert.equal(blocker?.code, "MODEL_PROOF_120S_LANE_FAILURE", "failed_lane_blocker_code_invalid");
  assert.equal(blocker?.failedCommand, "toolset", "failed_lane_blocker_command_invalid");
  assert.equal(blocker?.error, `MODEL_PROOF_120S_NOT_READY:output_root_exists:${outputRoot}`, "failed_lane_blocker_error_invalid");
  assert.deepEqual(blocker?.visibility, { toolset: "not_tested", runtime: "not_tested" }, "failed_lane_visibility_invalid");
  assert.equal(readyPacket?.command, "ready", "failed_lane_ready_command_invalid");
  assert.equal(readyPacket?.status, "MODEL_PROOF_120S_READY", "failed_lane_ready_status_invalid");
  assert.equal(readyPacket?.profileId, profileId, "failed_lane_ready_profile_id_drift");
  assert.equal(readyPacket?.profileSha256, profileSha256, "failed_lane_ready_profile_hash_drift");
  assert.equal(state?.ready?.sha256, nextAttempt?.readySha256, "failed_lane_ready_hash_drift");
  assert.equal(clock?.version, "aurora-model-proof-monotonic-clock/v1", "failed_lane_clock_version_invalid");
  assert.equal(clock?.source, "Windows.QueryPerformanceCounter", "failed_lane_clock_source_invalid");
  assert.equal(clock?.hardLimitMs, 120_000, "failed_lane_clock_limit_invalid");
  assert.ok(BigInt(clock?.frequency ?? 0) > 0n, "failed_lane_clock_frequency_invalid");
  assert.equal(
    BigInt(clock.deadlineCounter),
    BigInt(clock.startCounter) + (BigInt(clock.frequency) * 120_000n) / 1_000n,
    "failed_lane_clock_deadline_invalid",
  );
  const expectedFiles = [
    "blocker.json",
    "ready.json",
    "run-clock.json",
    "state.json",
    "toolset\\caret-readback.json",
    "toolset\\selection-mode.json",
    "toolset\\tree-selection.json",
  ];
  assert.deepEqual(
    existingFiles?.map((value) => value.relativePath).sort(),
    expectedFiles,
    "failed_lane_file_set_invalid",
  );
  for (const file of existingFiles) {
    assert.match(file?.sha256 ?? "", SHA256, `failed_lane_file_hash_invalid:${file?.relativePath ?? "unknown"}`);
    assert.ok(Number.isInteger(file?.byteLength) && file.byteLength > 0, `failed_lane_file_length_invalid:${file?.relativePath ?? "unknown"}`);
  }
  const readySession = readyPacket?.session;
  assert.equal(hostSession?.processId, readySession?.processId, "failed_lane_toolset_pid_drift");
  assert.equal(hostSession?.startedAtUtc, readySession?.startedAtUtc, "failed_lane_toolset_start_drift");
  assert.equal(hostSession?.frameHwnd, readySession?.frameHwnd, "failed_lane_toolset_frame_drift");
  assert.equal(hostSession?.frameTitle, readySession?.frameTitle, "failed_lane_toolset_title_drift");
  assert.equal(hostSession?.area, readySession?.area, "failed_lane_toolset_area_drift");
  assert.equal(hostSession?.responding, true, "failed_lane_toolset_not_responding");
  assert.equal(hostSession?.modalCount, 0, "failed_lane_toolset_modal_present");
  assert.equal(hostSession?.nwmainCount, 0, "failed_lane_nwmain_present");
  assert.ok(!String(hostSession?.frameTitle ?? "").endsWith("*"), "failed_lane_toolset_dirty");
  assert.notEqual(nextAttempt?.profileId, profileId, "failed_lane_next_profile_not_new");
  assert.match(nextAttempt?.profileSha256 ?? "", SHA256, "failed_lane_next_profile_hash_invalid");
  assert.equal(nextAttempt?.outputRootAbsent, true, "failed_lane_next_output_root_exists");
  assert.equal(nextAttempt?.prepOutDirAbsent, true, "failed_lane_next_prep_dir_exists");
  assert.equal(nextAttempt?.candidateHashesMatch, true, "failed_lane_next_candidate_drift");
  assert.equal(nextAttempt?.distinctPaths, true, "failed_lane_next_paths_not_distinct");
  return {
    version: "aurora-model-proof-120s-failed-lane-recovery-admission/v1",
    profileId,
    profileSha256,
    outputRoot,
    blocker: { code: blocker.code, failedCommand: blocker.failedCommand, visibility: blocker.visibility },
    readySession,
    existingFiles,
    nextAttempt: {
      profileId: nextAttempt.profileId,
      profileSha256: nextAttempt.profileSha256,
      profilePath: nextAttempt.profilePath,
      outputRoot: nextAttempt.outputRoot,
      prepOutDir: nextAttempt.prepOutDir,
      candidateHashesMatch: true,
    },
    gracefulFirst: true,
    exactPidStartTimeFrameRequired: true,
    zeroProcessesRequiredAfterClose: true,
  };
}

export function validateFailedLaneReadyCandidateBinding({ readyPacket, profile }) {
  assert.deepEqual(
    Object.keys(readyPacket?.module ?? {}).sort(),
    ["path", "sha256"],
    "failed_lane_ready_module_shape_drift",
  );
  assert.equal(readyPacket.module.path, profile?.installedModule?.path, "failed_lane_ready_module_path_drift");
  assert.equal(readyPacket.module.sha256, profile?.installedModule?.sha256, "failed_lane_ready_module_hash_drift");
  assert.deepEqual(readyPacket?.area, profile?.area, "failed_lane_ready_area_drift");
  assert.deepEqual(readyPacket?.fixture, profile?.fixture, "failed_lane_ready_fixture_drift");
  return {
    version: "aurora-model-proof-120s-failed-lane-ready-candidate-binding/v1",
    module: { ...readyPacket.module },
    area: structuredClone(readyPacket.area),
    fixture: structuredClone(readyPacket.fixture),
  };
}

function requireCleanupArtifact(name, declared, actual) {
  assert.ok(declared?.path, `cleanup_artifact_not_bound:${name}`);
  assert.ok(actual?.path, `cleanup_artifact_missing:${name}`);
  assert.equal(actual.path, declared.path, `cleanup_artifact_path_drift:${name}`);
  assert.equal(actual.sha256, declared.sha256, `cleanup_artifact_hash_drift:${name}`);
  if (declared.byteLength != null) {
    assert.equal(actual.byteLength, declared.byteLength, `cleanup_artifact_length_drift:${name}`);
  }
  if (declared.metadataPath != null) {
    assert.equal(actual.metadataPath, declared.metadataPath, `cleanup_artifact_metadata_path_drift:${name}`);
    assert.equal(actual.metadataSha256, declared.metadataSha256, `cleanup_artifact_metadata_hash_drift:${name}`);
  }
}

function requireCleanupPacketBinding(name, packet, declared) {
  assert.equal(packet?.path, declared?.path, `cleanup_${name}_packet_path_drift`);
  assert.equal(packet?.sha256, declared?.sha256, `cleanup_${name}_packet_hash_drift`);
  if (declared?.byteLength != null && packet?.byteLength != null) {
    assert.equal(packet.byteLength, declared.byteLength, `cleanup_${name}_packet_length_drift`);
  }
  if (declared?.metadataPath != null) {
    assert.equal(packet?.metadataPath, declared.metadataPath, `cleanup_${name}_metadata_path_drift`);
    assert.equal(packet?.metadataSha256, declared.metadataSha256, `cleanup_${name}_metadata_hash_drift`);
  }
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function requireArtifact(value, name, requireLength = false) {
  assert.ok(isAbsoluteWindowsPath(value?.path), `${name}_path_invalid`);
  assert.match(value?.sha256 ?? "", SHA256, `${name}_hash_invalid`);
  if (requireLength) assert.ok(Number.isInteger(value?.byteLength) && value.byteLength >= 0, `${name}_length_invalid`);
}

function requireResource(value, name) {
  assert.match(value?.resref ?? "", /^[a-z0-9_]{1,16}$/u, `${name}_resref_invalid`);
  assert.match(value?.sha256 ?? "", SHA256, `${name}_hash_invalid`);
}

function requireVector(value, name) {
  assert.ok(Array.isArray(value) && value.length === 3 && value.every(Number.isFinite), `${name}_invalid`);
}

function isAbsoluteWindowsPath(value) {
  return /^[a-zA-Z]:\\/u.test(String(value ?? ""));
}
