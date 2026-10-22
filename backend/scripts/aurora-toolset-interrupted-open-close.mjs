#!/usr/bin/env node
/*
 * Operator-only reconciliation route for one interrupted Aurora cold open.
 *
 * This route is deliberately outside the MCP coordinator.  It accepts only a
 * strict, operator-owned checkpoint, proves the exact blank Toolset process
 * and unchanged saved inputs, and delegates one graceful WM_CLOSE to the
 * existing canonical close atom.  It never force-terminates a process, saves
 * a module, clears native-adapter state, or starts Toolset/NWN.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CONFIG_VERSION = "nwn-mcp-aurora-interrupted-open-close-config/v1";
const PLAN_VERSION = "nwn-mcp-aurora-interrupted-open-close-plan/v1";
const RECEIPT_VERSION = "nwn-mcp-aurora-interrupted-open-close-receipt/v1";
const MANIFEST_VERSION = "aurora-toolset-binary-native-geometry-manifest/v1";
const LEGACY_CHECKPOINT_VERSION = "nwn-mcp-aurora-live-checkpoint/v1";
const MAX_JSON_BYTES = 1024 * 1024;
const MAX_EXECUTABLE_BYTES = 512 * 1024 * 1024;
const MAX_SCRIPT_BYTES = 4 * 1024 * 1024;
const SHA256 = /^[0-9a-f]{64}$/u;
const IDENTIFIER = /^[A-Za-z0-9_-]{1,128}$/u;
const PROFILE_ID = /^[a-z][a-z0-9_.-]{0,63}$/u;

export class InterruptedOpenCloseError extends Error {
  constructor(code, actionSubmitted = false) {
    super(code);
    this.name = "InterruptedOpenCloseError";
    this.code = code;
    this.actionSubmitted = actionSubmitted;
  }
}

export function mutationFingerprint(argumentsValue) {
  const stableArguments = Object.fromEntries(
    Object.entries(argumentsValue).filter(([key]) => !["deadline_ms", "request_id"].includes(key)),
  );
  const encoded = stableJson({ operation: "session_launch", arguments: stableArguments, target_identity: null });
  return createHash("sha256").update(encoded, "utf8").digest("hex");
}

export function executeInterruptedOpenClose(command, rawConfig, runtime = defaultRuntime()) {
  if (!new Set(["dry-run", "close"]).has(command)) fail("command_invalid");
  const config = validateConfig(rawConfig);
  validatePinnedInputs(config, runtime);
  const admission = inspectAdmission(config, runtime);
  const paths = receiptPaths(config);
  if (existsSync(paths.receipt)) fail("receipt_already_exists");
  if (command === "dry-run") {
    if (existsSync(paths.plan)) fail("plan_already_exists");
    return {
      ok: true,
      command,
      status: "interrupted_open_close_admitted",
      liveAction: false,
      originalManifestPreserved: true,
      plan: publicPlan(admission.plan),
      safety: safety(false),
    };
  }
  if (existsSync(paths.plan)) fail("plan_already_exists");
  exclusiveJson(paths.plan, admission.plan);
  const planSha256 = runtime.hashFile(paths.plan, MAX_JSON_BYTES);

  // Repeat every mutable admission after the immutable intent is on disk and
  // immediately before the one permitted UI action.
  validatePinnedInputs(config, runtime);
  const fresh = inspectAdmission(config, runtime);
  if (stableJson(publicPlan(fresh.plan)) !== stableJson(publicPlan(admission.plan))) {
    fail("admission_changed_before_close");
  }
  if (runtime.hashFile(config.prepared_manifest.path, MAX_JSON_BYTES) !== config.prepared_manifest.sha256) {
    fail("prepared_manifest_changed_before_close");
  }

  try {
    const closeResult = runtime.runJson(
      config.routes.graceful_close.path,
      [
        "--expectedPid", String(config.owner.pid),
        "--expectedStartedAtUtc", config.owner.started_at_utc,
        "--expectedFrameHwnd", String(config.owner.frame_hwnd),
        "--expectedFrameTitle", fresh.blank.frameTitle,
        "--forceIfNeeded", "false",
        "--allowHiddenExactFrame", "false",
      ],
      30_000,
      config,
    );
    if (
      closeResult?.ok !== true
      || closeResult?.forceFallbackUsed !== false
      || closeResult?.expectedPid !== config.owner.pid
      || closeResult?.expectedFrameHwnd !== config.owner.frame_hwnd
      || closeResult?.safety?.savesModule !== false
      || closeResult?.safety?.usesGlobalInput !== false
    ) {
      fail("graceful_close_unverified", true);
    }
    const afterProcesses = runtime.inspectProcesses(config);
    if (afterProcesses.toolset.length !== 0 || afterProcesses.nwn.length !== 0) {
      fail("close_postcondition_unverified", true);
    }
    if (runtime.hashFile(config.prepared_manifest.path, MAX_JSON_BYTES) !== config.prepared_manifest.sha256) {
      fail("prepared_manifest_changed_after_close", true);
    }
    const afterStructural = runStructural(config, runtime);
    assertStructural(config, fresh.profile, afterStructural);

    const receiptPayload = {
      version: RECEIPT_VERSION,
      status: "closed",
      operation: "session_launch",
      adapter: "aurora",
      durable_request_id: config.durable_request_id,
      mutation_fingerprint: config.mutation_fingerprint,
      profile_id: config.mcp_profile_id,
      binary_profile_id: config.binary_profile_id,
      build_id: config.build_id,
      prior_outcome: "outcome_unknown",
      prepared_manifest_sha256: config.prepared_manifest.sha256,
      checkpoint_kind: config.checkpoint_kind,
      checkpoint_sha256: config.checkpoint.sha256,
      root_observation_sha256: config.root_observation.sha256,
      plan_sha256: planSha256,
      owner: {
        pid: config.owner.pid,
        created_at_ns: config.owner.created_at_ns,
        frame_hwnd: config.owner.frame_hwnd,
        toolset_sha256: config.toolset.sha256,
      },
      module_sha256: config.build_id,
      ordered_haks: projectedHaks(fresh.profile.orderedHakList),
      ordered_haks_sha256: orderedHaksDigest(fresh.profile.orderedHakList),
      close: {
        submitted: true,
        graceful: true,
        force: false,
        canonical_route_sha256: config.routes.graceful_close.sha256,
      },
      postcondition: {
        toolset_process_count: 0,
        nwn_process_count: 0,
        checked_at: runtime.now(),
      },
      original_manifest_preserved: true,
    };
    const receipt = {
      ...receiptPayload,
      content_sha256: createHash("sha256").update(stableJson(receiptPayload), "utf8").digest("hex"),
    };
    exclusiveJson(paths.receipt, receipt);
    const receiptSha256 = runtime.hashFile(paths.receipt, MAX_JSON_BYTES);
    return {
      ok: true,
      command,
      status: "interrupted_open_closed",
      liveAction: true,
      originalManifestPreserved: true,
      plan_sha256: planSha256,
      receipt_sha256: receiptSha256,
      receipt: publicReceipt(receipt),
      safety: safety(true),
    };
  } catch (error) {
    throw markSubmitted(error);
  }
}

function inspectAdmission(config, runtime) {
  const manifest = runtime.readJson(config.prepared_manifest.path, MAX_JSON_BYTES);
  const profile = runtime.readJson(config.bootstrap_profile.path, MAX_JSON_BYTES);
  const coordinatorProfile = runtime.readJson(config.coordinator_profile.path, MAX_JSON_BYTES);
  const checkpoint = runtime.readJson(config.checkpoint.path, 64 * 1024);
  const rootObservation = runtime.readJson(config.root_observation.path, 64 * 1024);
  assertManifest(config, manifest, profile, coordinatorProfile);
  assertCheckpoint(config, checkpoint, rootObservation);
  const processes = runtime.inspectProcesses(config);
  assertExactProcesses(config, processes);
  const structural = runStructural(config, runtime);
  assertStructural(config, profile, structural);
  const blank = runtime.runJson(
    config.routes.blank_frame.path,
    [
      "--expectedPid", String(config.owner.pid),
      "--expectedCreatedAtNs", config.owner.created_at_ns,
      "--expectedFrameHwnd", String(config.owner.frame_hwnd),
    ],
    20_000,
    config,
  );
  if (
    blank?.ok !== true
    || blank.processId !== config.owner.pid
    || blank.createdAtNs !== config.owner.created_at_ns
    || blank.frameHwnd !== config.owner.frame_hwnd
    || blank.dirty !== false
    || blank.modalCount !== 0
    || blank.activeAreaViewerCount !== 0
    || blank.safety?.readOnly !== true
    || blank.safety?.windowMessagesSent !== false
  ) {
    fail("blank_frame_readback_invalid");
  }
  const plan = {
    version: PLAN_VERSION,
    status: "authorized_close_pending",
    operation: "session_launch",
    adapter: "aurora",
    durable_request_id: config.durable_request_id,
    mutation_fingerprint: config.mutation_fingerprint,
    profile_id: config.mcp_profile_id,
    binary_profile_id: config.binary_profile_id,
    build_id: config.build_id,
    prior_outcome: "outcome_unknown",
    prepared_manifest_sha256: config.prepared_manifest.sha256,
    checkpoint_kind: config.checkpoint_kind,
    checkpoint_sha256: config.checkpoint.sha256,
    root_observation_sha256: config.root_observation.sha256,
    owner: {
      pid: config.owner.pid,
      created_at_ns: config.owner.created_at_ns,
      frame_hwnd: config.owner.frame_hwnd,
      toolset_sha256: config.toolset.sha256,
    },
    blank_frame: {
      title_sha256: createHash("sha256").update(blank.frameTitle, "utf8").digest("hex"),
      dirty: false,
      modal_count: 0,
      active_area_viewer_count: 0,
    },
    module_sha256: config.build_id,
    ordered_haks: projectedHaks(profile.orderedHakList),
    ordered_haks_sha256: orderedHaksDigest(profile.orderedHakList),
    close_route_sha256: config.routes.graceful_close.sha256,
    force_allowed: false,
    original_manifest_preserved: true,
  };
  return { manifest, profile, coordinatorProfile, checkpoint, rootObservation, processes, structural, blank, plan };
}

function validateConfig(value) {
  exactObject(value, [
    "version", "durable_request_id", "mutation_fingerprint", "mcp_profile_id", "binary_profile_id", "build_id",
    "original_arguments", "coordinator_profile", "bootstrap_profile", "prepared_manifest",
    "checkpoint_kind", "checkpoint", "root_observation", "owner", "toolset", "powershell", "routes",
  ], "config_invalid");
  if (
    value.version !== CONFIG_VERSION
    || !IDENTIFIER.test(value.durable_request_id)
    || !SHA256.test(value.mutation_fingerprint)
    || !PROFILE_ID.test(value.mcp_profile_id)
    || typeof value.binary_profile_id !== "string"
    || value.binary_profile_id.length < 1
    || value.binary_profile_id.length > 128
    || /[\0-\x1f]/u.test(value.binary_profile_id)
    || value.checkpoint_kind !== "legacy_live_checkpoint_v1"
    || !SHA256.test(value.build_id)
  ) fail("config_invalid");
  exactObject(value.original_arguments, [
    "profile_id", "adapter", "build_id", "request_id", "expected_revision", "deadline_ms",
  ], "config_invalid");
  const args = value.original_arguments;
  if (
    args.profile_id !== value.mcp_profile_id
    || args.adapter !== "aurora"
    || args.build_id !== value.build_id
    || args.request_id !== value.durable_request_id
    || !(Number.isInteger(args.expected_revision) && args.expected_revision >= 0 || typeof args.expected_revision === "string" && IDENTIFIER.test(args.expected_revision))
    || !Number.isInteger(args.deadline_ms)
    || args.deadline_ms < 1
    || args.deadline_ms > 300_000
    || mutationFingerprint(args) !== value.mutation_fingerprint
  ) fail("mutation_fingerprint_mismatch");
  for (const key of ["coordinator_profile", "bootstrap_profile", "prepared_manifest", "checkpoint", "root_observation", "toolset", "powershell"]) {
    value[key] = fileDescriptor(value[key]);
  }
  exactObject(value.owner, ["pid", "created_at_ns", "started_at_utc", "frame_hwnd"], "config_invalid");
  if (
    !positiveInteger(value.owner.pid, 2_147_483_647)
    || !/^[1-9][0-9]{0,19}$/u.test(value.owner.created_at_ns)
    || BigInt(value.owner.created_at_ns) > 9_223_372_036_854_775_807n
    || !positiveInteger(value.owner.frame_hwnd, Number.MAX_SAFE_INTEGER)
    || !isoUtc(value.owner.started_at_utc)
  ) fail("config_invalid");
  exactObject(value.routes, ["blank_frame", "structural_validator", "graceful_close"], "config_invalid");
  for (const key of Object.keys(value.routes)) value.routes[key] = fileDescriptor(value.routes[key]);
  const expectedNames = {
    blank_frame: "inspect-aurora-toolset-blank-frame-readonly.mjs",
    structural_validator: "validate-aurora-toolset-binary-module-bootstrap.mjs",
    graceful_close: "close-aurora-toolset-window-no-global-input.mjs",
  };
  for (const [key, expected] of Object.entries(expectedNames)) {
    if (basename(value.routes[key].path).toLowerCase() !== expected.toLowerCase()) fail("route_identity_invalid");
  }
  const routeParents = new Set(Object.values(value.routes).map((item) => normalizeWindowsPath(dirname(item.path))));
  if (routeParents.size !== 1) fail("route_identity_invalid");
  if (basename(value.powershell.path).toLowerCase() !== "powershell.exe") fail("powershell_identity_invalid");
  return value;
}

function validatePinnedInputs(config, runtime) {
  for (const descriptor of [
    config.coordinator_profile, config.bootstrap_profile, config.prepared_manifest,
    config.checkpoint, config.root_observation, config.toolset,
    config.powershell, ...Object.values(config.routes),
  ]) {
    assertPlainAbsoluteFile(descriptor.path);
    const maximum = [config.toolset.path, config.powershell.path].includes(descriptor.path)
      ? MAX_EXECUTABLE_BYTES : descriptor.path.endsWith(".json") ? MAX_JSON_BYTES : MAX_SCRIPT_BYTES;
    if (runtime.hashFile(descriptor.path, maximum) !== descriptor.sha256) fail("configured_file_identity_changed");
  }
  const parts = resolve(config.powershell.path).split(/[\\/]+/u);
  const tail = parts.slice(-4).map((item) => item.toLowerCase());
  if (tail.join("/") !== "system32/windowspowershell/v1.0/powershell.exe") fail("powershell_identity_invalid");
}

function assertManifest(config, manifest, profile, coordinatorProfile) {
  const artifactDir = dirname(config.prepared_manifest.path);
  if (
    manifest?.version !== MANIFEST_VERSION
    || manifest?.status !== "prepared"
    || resolve(String(manifest.profilePath ?? "")) !== resolve(config.bootstrap_profile.path)
    || manifest.profileSha256 !== config.bootstrap_profile.sha256
    || resolve(String(manifest.artifactDir ?? "")) !== resolve(artifactDir)
    || manifest.profileId !== config.binary_profile_id
    || resolve(String(manifest.module?.path ?? "")) !== resolve(String(profile.module?.path ?? ""))
    || manifest.module?.sha256 !== config.build_id
    || profile?.id !== config.binary_profile_id
    || profile?.module?.sha256 !== config.build_id
    || coordinatorProfile?.version !== "aurora-toolset-native-bridge-profile/v1"
    || coordinatorProfile?.id !== config.mcp_profile_id
    || resolve(String(coordinatorProfile?.binaryBootstrap?.profilePath ?? "")) !== resolve(config.bootstrap_profile.path)
    || coordinatorProfile?.module?.sha256 !== config.build_id
    || resolve(String(coordinatorProfile?.module?.path ?? "")) !== resolve(String(profile.module?.path ?? ""))
    || resolve(String(coordinatorProfile?.toolset?.executable ?? "")) !== resolve(config.toolset.path)
    || coordinatorProfile?.toolset?.sha256 !== config.toolset.sha256
  ) fail("prepared_manifest_binding_invalid");
}

function assertCheckpoint(config, checkpoint, rootObservation) {
  if (
    checkpoint?.version !== LEGACY_CHECKPOINT_VERSION
    || checkpoint?.toolset?.pid !== config.owner.pid
    || checkpoint?.toolset?.created_at_ns !== config.owner.created_at_ns
    || checkpoint?.toolset?.frame_hwnd !== config.owner.frame_hwnd
    || checkpoint?.toolset?.responding !== true
    || checkpoint?.toolset?.frame_state !== "blank_no_module_title"
    || checkpoint?.toolset?.top_level_modal_count !== 0
    || !sameInstant(checkpoint?.toolset?.start_time_utc, config.owner.started_at_utc)
    || checkpoint?.toolset?.current_state_evidence !== basename(config.root_observation.path)
    || dirname(resolve(config.checkpoint.path)) !== dirname(resolve(config.root_observation.path))
    || checkpoint?.request?.request_id !== config.durable_request_id
    || checkpoint?.request?.outcome !== "unknown"
    || checkpoint?.request?.ledger_terminal_response !== false
    || checkpoint?.request?.action_submitted !== true
    || checkpoint?.sdk_executor?.preserve_alive !== true
    || checkpoint?.owner?.present !== false
    || checkpoint?.owner?.terminal_child_receipt !== false
    || checkpoint?.control?.async_close_approval !== "pending"
    || checkpoint?.control?.new_open_forbidden !== true
    || checkpoint?.control?.kill_or_relaunch_forbidden !== true
  ) fail("legacy_checkpoint_invalid");
  if (
    rootObservation?.ok !== true
    || rootObservation?.processId !== config.owner.pid
    || rootObservation?.responding !== true
    || !Array.isArray(rootObservation.windows)
    || rootObservation.windows.length !== 2
    || rootObservation.windows.filter((window) => window?.className === "TfrmFrame" && window?.hwnd === config.owner.frame_hwnd && window?.visible === true).length !== 1
    || rootObservation.windows.filter((window) => window?.className === "TApplication" && window?.visible === true).length !== 1
    || rootObservation?.safety?.readOnly !== true
    || rootObservation?.safety?.usesGlobalKeyboard !== false
    || rootObservation?.safety?.usesGlobalMouse !== false
    || rootObservation?.safety?.usesGlobalCursor !== false
  ) fail("root_observation_invalid");
}

function assertExactProcesses(config, processes) {
  if (!processes || !Array.isArray(processes.toolset) || !Array.isArray(processes.nwn)) fail("process_inventory_invalid");
  if (processes.nwn.length !== 0) fail("nwn_process_conflict");
  if (processes.toolset.length !== 1) fail("toolset_process_identity_mismatch");
  const process = processes.toolset[0];
  if (
    process.pid !== config.owner.pid
    || process.created_at_ns !== config.owner.created_at_ns
    || normalizeWindowsPath(process.executable) !== normalizeWindowsPath(config.toolset.path)
    || process.responding !== true
  ) fail("toolset_process_identity_mismatch");
}

function runStructural(config, runtime) {
  return runtime.runJson(
    config.routes.structural_validator.path,
    ["--mode", "preflight", "--profile", config.bootstrap_profile.path],
    120_000,
    config,
  );
}

function assertStructural(config, profile, structural) {
  if (
    structural?.ok !== true
    || structural.mode !== "preflight"
    || structural.module?.sha256 !== config.build_id
    || stableJson(projectedHaks(structural.orderedHakList)) !== stableJson(projectedHaks(profile.orderedHakList))
  ) fail("structural_readback_invalid");
}

function receiptPaths(config) {
  const parent = dirname(config.prepared_manifest.path);
  return {
    plan: resolve(parent, "interrupted-open-close-plan.json"),
    receipt: resolve(parent, "interrupted-open-close-receipt.json"),
  };
}

function fileDescriptor(value) {
  exactObject(value, ["path", "sha256"], "config_invalid");
  if (typeof value.path !== "string" || !isAbsolute(value.path) || value.path.includes("\0") || !SHA256.test(value.sha256)) {
    fail("config_invalid");
  }
  return { path: resolve(value.path), sha256: value.sha256 };
}

function assertPlainAbsoluteFile(path) {
  if (!isAbsolute(path) || path.includes("\0") || path.startsWith("\\\\") || path.startsWith("\\\\?\\")) fail("path_invalid");
  const parsed = parse(resolve(path));
  let current = parsed.root;
  for (const part of resolve(path).slice(parsed.root.length).split(/[\\/]+/u).filter(Boolean)) {
    current = join(current, part);
    const item = lstatSync(current);
    if (item.isSymbolicLink()) fail("path_invalid");
  }
  const item = statSync(path);
  if (!item.isFile() || realpathSync.native(path) !== resolve(path)) fail("path_invalid");
}

function assertPlainAbsoluteDirectory(path) {
  if (typeof path !== "string" || !isAbsolute(path) || path.includes("\0") || path.startsWith("\\\\") || path.startsWith("\\\\?\\")) fail("path_invalid");
  const parsed = parse(resolve(path));
  let current = parsed.root;
  for (const part of resolve(path).slice(parsed.root.length).split(/[\\/]+/u).filter(Boolean)) {
    current = join(current, part);
    const item = lstatSync(current);
    if (item.isSymbolicLink()) fail("path_invalid");
  }
  const item = statSync(path);
  if (!item.isDirectory() || realpathSync.native(path) !== resolve(path)) fail("path_invalid");
}

function defaultRuntime() {
  return {
    hashFile,
    readJson(path, maximum) {
      const bytes = readFileBounded(path, maximum);
      return JSON.parse(bytes.toString("utf8"));
    },
    runJson(script, args, timeout, config) {
      const raw = execFileSync(process.execPath, [script, ...args], {
        encoding: "utf8",
        windowsHide: true,
        timeout,
        maxBuffer: MAX_JSON_BYTES,
        env: childEnvironment(config),
        stdio: ["ignore", "pipe", "ignore"],
      });
      return JSON.parse(raw.trim());
    },
    inspectProcesses(config) {
      const source = String.raw`
$ErrorActionPreference='Stop';$rows=@();foreach($name in @('nwtoolset','nwmain')){$rows+=@(Get-Process -Name $name -ErrorAction SilentlyContinue|ForEach-Object{$ticks=$_.StartTime.ToUniversalTime().Ticks-621355968000000000;[pscustomobject]@{kind=$name;pid=$_.Id;created_at_ns=[string]($ticks*100);executable=$_.Path;responding=$_.Responding}})};$rows|ConvertTo-Json -Depth 3 -Compress
`;
      const raw = execFileSync(config.powershell.path, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source], {
        encoding: "utf8", windowsHide: true, timeout: 15_000, maxBuffer: MAX_JSON_BYTES,
        env: childEnvironment(config), stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      const value = raw ? JSON.parse(raw) : [];
      const rows = Array.isArray(value) ? value : [value];
      return {
        toolset: rows.filter((row) => row.kind === "nwtoolset").map(publicProcess),
        nwn: rows.filter((row) => row.kind === "nwmain").map(publicProcess),
      };
    },
    now() { return new Date().toISOString(); },
  };
}

function childEnvironment(config) {
  const powershellDir = dirname(config.powershell.path);
  const windowsRoot = resolve(powershellDir, "..", "..", "..");
  const systemDrive = parse(windowsRoot).root.replace(/[\\/]$/u, "");
  if (!/^[A-Za-z]:$/u.test(systemDrive)) fail("windows_environment_invalid");
  const bootstrap = {
    SYSTEMROOT: windowsRoot,
    SYSTEMDRIVE: systemDrive,
    WINDIR: windowsRoot,
    PATH: powershellDir,
    PATHEXT: ".COM;.EXE;.BAT;.CMD",
    NODE_NO_WARNINGS: "1",
  };
  let folders;
  try {
    const source = String.raw`
$ErrorActionPreference='Stop';[pscustomobject]@{programData=[Environment]::GetFolderPath('CommonApplicationData');userProfile=[Environment]::GetFolderPath('UserProfile');appData=[Environment]::GetFolderPath('ApplicationData');localAppData=[Environment]::GetFolderPath('LocalApplicationData')}|ConvertTo-Json -Compress
`;
    folders = JSON.parse(execFileSync(config.powershell.path, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source], {
      encoding: "utf8", windowsHide: true, timeout: 10_000, maxBuffer: 64 * 1024,
      env: bootstrap, stdio: ["ignore", "pipe", "ignore"],
    }).trim());
    for (const value of Object.values(folders)) assertPlainAbsoluteDirectory(value);
  } catch (error) {
    if (error instanceof InterruptedOpenCloseError) throw error;
    fail("windows_environment_invalid");
  }
  const profileRoot = resolve(folders.userProfile);
  const profileDrive = parse(profileRoot).root.replace(/[\\/]$/u, "");
  const tempRoot = resolve(folders.localAppData, "Temp");
  assertPlainAbsoluteDirectory(tempRoot);
  return {
    ...bootstrap,
    PROGRAMDATA: resolve(folders.programData),
    USERPROFILE: profileRoot,
    HOMEDRIVE: profileDrive,
    HOMEPATH: profileRoot.slice(parse(profileRoot).root.length - 1),
    APPDATA: resolve(folders.appData),
    LOCALAPPDATA: resolve(folders.localAppData),
    TEMP: tempRoot,
    TMP: tempRoot,
  };
}

function publicProcess(row) {
  return {
    pid: Number(row.pid),
    created_at_ns: String(row.created_at_ns ?? ""),
    executable: String(row.executable ?? ""),
    responding: row.responding === true,
  };
}

function hashFile(path, maximum) {
  const bytes = readFileBounded(path, maximum);
  return createHash("sha256").update(bytes).digest("hex");
}

function readFileBounded(path, maximum) {
  const size = statSync(path).size;
  if (!Number.isSafeInteger(size) || size < 0 || size > maximum) fail("file_size_invalid");
  return readFileSync(path);
}

function exclusiveJson(path, value) {
  const descriptor = openSync(path, "wx");
  try {
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function projectedHaks(value) {
  if (!Array.isArray(value) || value.length > 256) fail("ordered_haks_invalid");
  return value.map((hak) => {
    if (!hak || typeof hak.resref !== "string" || !/^[a-z0-9_]{1,16}$/u.test(hak.resref) || !SHA256.test(hak.sha256)) {
      fail("ordered_haks_invalid");
    }
    return { resref: hak.resref, sha256: hak.sha256 };
  });
}

function orderedHaksDigest(value) {
  return createHash("sha256").update(stableJson(projectedHaks(value)), "utf8").digest("hex");
}

function publicPlan(plan) { return JSON.parse(JSON.stringify(plan)); }
function publicReceipt(receipt) { return JSON.parse(JSON.stringify(receipt)); }

function safety(closeSubmitted) {
  return {
    startsToolset: false,
    startsNwn: false,
    usesGlobalInput: false,
    usesGlobalCursor: false,
    usesGlobalKeyboard: false,
    usesGlobalMouse: false,
    savesModule: false,
    buildsModule: false,
    forceTerminatesProcess: false,
    clearsMutationLedger: false,
    closeSubmitted,
  };
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join("|") !== [...keys].sort().join("|")) fail(code);
}

function positiveInteger(value, maximum) { return Number.isSafeInteger(value) && value > 0 && value <= maximum; }
function isoUtc(value) { return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?Z$/u.test(value) && Number.isFinite(Date.parse(value)); }
function sameInstant(left, right) { return isoUtc(left) && isoUtc(right) && Date.parse(left) === Date.parse(right); }
function normalizeWindowsPath(value) { return resolve(String(value ?? "")).replaceAll("/", "\\").toLowerCase(); }
function markSubmitted(error) {
  if (error instanceof InterruptedOpenCloseError) {
    error.actionSubmitted = true;
    return error;
  }
  return new InterruptedOpenCloseError("graceful_close_outcome_unknown", true);
}
function fail(code, actionSubmitted = false) { throw new InterruptedOpenCloseError(code, actionSubmitted); }

async function main() {
  const [command, flag, configPath, ...rest] = process.argv.slice(2);
  if (rest.length !== 0 || flag !== "--config" || !configPath || !isAbsolute(configPath)) fail("arguments_invalid");
  assertPlainAbsoluteFile(configPath);
  const config = JSON.parse(readFileBounded(configPath, 256 * 1024).toString("utf8"));
  const result = executeInterruptedOpenClose(command, config);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    const code = error instanceof InterruptedOpenCloseError ? error.code : "interrupted_open_close_failed";
    const actionSubmitted = error instanceof InterruptedOpenCloseError && error.actionSubmitted === true;
    process.stdout.write(`${JSON.stringify({ ok: false, code, operation_status: actionSubmitted ? "outcome_unknown" : "failed", action_submitted: actionSubmitted, originalManifestPreserved: true, safety: safety(actionSubmitted) })}\n`);
    process.exitCode = 2;
  });
}
