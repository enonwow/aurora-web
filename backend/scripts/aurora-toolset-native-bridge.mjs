#!/usr/bin/env node
/*
 * Public canonical coordinator proposed for backend/scripts.
 *
 * It composes existing verified Toolset atoms behind a narrow JSON contract.
 * It never accepts an executable, atom name, arbitrary argv, shell text, or
 * output path from an MCP request.  Deployment paths and supported objects are
 * fixed in an operator-owned profile.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const VERSION = "aurora-toolset-native-bridge-result/v1";
const PROFILE_VERSION = "aurora-toolset-native-bridge-profile/v1";
const REQUEST_VERSION = "nwn-mcp-aurora-coordinator-request/v1";
const MAX_STDIN_BYTES = 65_536;
const MAX_ATOM_OUTPUT = 4 * 1024 * 1024;
const MAX_PROFILE_BYTES = 256 * 1024;
const MAX_MODULE_BYTES = 512 * 1024 * 1024;
const COORDINATOR_TERMINAL_RESERVE_MS = 5_000;
const ATOM_TIMEOUT_CEILING_MS = 120_000;
const here = dirname(fileURLToPath(import.meta.url));

const ATOMS = Object.freeze({
  inspect: "inspect-aurora-toolset-visible-windows-no-global-input.mjs",
  activeArea: "inspect-aurora-toolset-active-area-viewer-readonly.mjs",
  restoreFrame: "restore-aurora-toolset-frame-noactivate.mjs",
  areaOpen: "view-aurora-toolset-area-tree-item-no-global-input.mjs",
  objectContext: "inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs",
  propertiesOpen: "open-aurora-toolset-creature-properties-no-global-input.mjs",
  dialogEdit: "set-aurora-toolset-dialog-edit-text-validated.mjs",
  propertiesCommit: "commit-aurora-toolset-creature-properties-no-global-input.mjs",
  save: "save-aurora-toolset-module-no-global-input.mjs",
  gitReadback: "read-aurora-toolset-bootstrap-git-readback.mjs",
  palette: "inspect-aurora-toolset-palette-no-global-input.mjs",
  testModule: "aurora-toolset-test-module-nonblocking.mjs",
  binaryOpen: "aurora-toolset-binary-module-native-geometry.mjs",
});

const OPERATION_COMMAND = Object.freeze({
  session_attach: "attach",
  session_launch: "cold-open",
  aurora_state_get: "state",
  aurora_area_open: "area-open",
  aurora_object_place: "object-place",
  aurora_objects_list: "objects-list",
  aurora_object_select: "object-select",
  aurora_properties_get: "properties-get",
  aurora_properties_set: "properties-set",
  aurora_module_save: "save",
  aurora_test_module: "test-module",
});

class ContractError extends Error {
  constructor(code, stage, submitted = false) {
    super(code);
    this.code = code;
    this.stage = stage;
    this.submitted = submitted;
  }
}

export function validateProfile(profile) {
  const profileKeys = [
    "version",
    "id",
    "toolset",
    "module",
    "area",
    "monitor",
    "statePath",
    "objects",
    "clientProfiles",
    "binaryBootstrap",
  ];
  if (Object.hasOwn(profile ?? {}, "placements")) profileKeys.push("placements");
  exactObject(profile, profileKeys, "profile_schema_invalid");
  if (profile.version !== PROFILE_VERSION || !shortId(profile.id)) fail("profile_identity_invalid", "profile");
  exactObject(profile.toolset, ["executable", "sha256"], "profile_toolset_invalid");
  absolutePath(profile.toolset.executable, "profile_toolset_path_invalid");
  sha256(profile.toolset.sha256, "profile_toolset_hash_invalid");
  exactObject(profile.module, ["path", "filename", "sha256"], "profile_module_invalid");
  absolutePath(profile.module.path, "profile_module_path_invalid");
  if (basename(profile.module.path).toLowerCase() !== String(profile.module.filename).toLowerCase()
      || !String(profile.module.filename).toLowerCase().endsWith(".mod")) fail("profile_module_name_invalid", "profile");
  sha256(profile.module.sha256, "profile_module_hash_invalid");
  exactObject(profile.area, ["resref", "treeLabel"], "profile_area_invalid");
  if (!resref(profile.area.resref) || !boundedText(profile.area.treeLabel, 256)) fail("profile_area_invalid", "profile");
  exactObject(profile.monitor, ["deviceName", "primary"], "profile_monitor_invalid");
  if (!boundedText(profile.monitor.deviceName, 128) || profile.monitor.primary !== false) fail("profile_monitor_invalid", "profile");
  absolutePath(profile.statePath, "profile_state_path_invalid");
  if (!Array.isArray(profile.objects) || profile.objects.length > 128) fail("profile_objects_invalid", "profile");
  const ids = new Set();
  for (const object of profile.objects) {
    exactObject(object, ["id", "kind", "areaResref", "treeText", "occurrence", "identity", "editable"], "profile_object_invalid");
    if (!shortId(object.id) || ids.has(object.id) || object.kind !== "creature"
        || object.areaResref !== profile.area.resref || !boundedText(object.treeText, 256)
        || !Number.isInteger(object.occurrence) || object.occurrence < 0 || object.occurrence > 1024) fail("profile_object_invalid", "profile");
    ids.add(object.id);
    exactObject(object.identity, ["templateResRef", "tag", "position"], "profile_object_identity_invalid");
    if (!resref(object.identity.templateResRef)
        || (object.identity.tag !== null && !boundedText(object.identity.tag, 256))
        || !Array.isArray(object.identity.position) || object.identity.position.length !== 3
        || object.identity.position.some((value) => typeof value !== "number" || !Number.isFinite(value))) fail("profile_object_identity_invalid", "profile");
    if (!plainObject(object.editable) || Object.keys(object.editable).length > 4) fail("profile_object_editable_invalid", "profile");
    for (const [name, field] of Object.entries(object.editable)) {
      if (!new Set(["first_name", "tag"]).has(name)) fail("profile_property_unsupported", "profile");
      exactObject(field, ["editOrdinal", "savedField", "maxLength"], "profile_property_invalid");
      if (!Number.isInteger(field.editOrdinal) || field.editOrdinal < 0 || field.editOrdinal > 32
          || !new Set(["localizedName", "tag"]).has(field.savedField)
          || !Number.isInteger(field.maxLength) || field.maxLength < 1 || field.maxLength > 256) fail("profile_property_invalid", "profile");
    }
  }
  if (Object.hasOwn(profile, "placements")) {
    if (!Array.isArray(profile.placements) || profile.placements.length < 1 || profile.placements.length > 32) fail("profile_placements_invalid", "profile");
    const placementIds = new Set();
    for (const placement of profile.placements) {
      exactObject(placement, ["category", "areaResref", "paletteText", "expectedTemplateResRef"], "profile_placement_invalid");
      if (placement.category !== "placeable" || placement.areaResref !== profile.area.resref
          || !printableText(placement.paletteText, 256) || !resref(placement.expectedTemplateResRef)) fail("profile_placement_invalid", "profile");
      const identity = `${placement.category}\0${placement.areaResref}\0${placement.paletteText}`;
      if (placementIds.has(identity)) fail("profile_placement_duplicate", "profile");
      placementIds.add(identity);
    }
  }
  if (!Array.isArray(profile.clientProfiles) || profile.clientProfiles.length > 16
      || profile.clientProfiles.some((value) => !shortId(value))) fail("profile_client_profiles_invalid", "profile");
  if (profile.binaryBootstrap !== null) {
    exactObject(profile.binaryBootstrap, ["profilePath", "artifactDir"], "profile_binary_bootstrap_invalid");
    absolutePath(profile.binaryBootstrap.profilePath, "profile_binary_bootstrap_invalid");
    absolutePath(profile.binaryBootstrap.artifactDir, "profile_binary_bootstrap_invalid");
    const artifactRelative = relative(resolve(dirname(profile.statePath)), resolve(profile.binaryBootstrap.artifactDir));
    if (!artifactRelative || artifactRelative === ".." || artifactRelative.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)
        || isAbsolute(artifactRelative)) fail("profile_binary_artifact_escape", "profile");
  }
  return profile;
}

export function buildAtomPlan(command, profile, request) {
  validateProfile(profile);
  const target = request.target_identity;
  const args = request.arguments ?? {};
  switch (command) {
    case "state":
    case "attach": return [{ atom: ATOMS.inspect, argv: [] }];
    case "cold-open":
      if (!profile.binaryBootstrap) fail("cold_open_profile_missing", command);
      const attemptDir = coldOpenAttemptDir(profile, args.request_id);
      return [
        { atom: ATOMS.binaryOpen, argv: ["preflight", "--profile", profile.binaryBootstrap.profilePath, "--outDir", attemptDir, "--installedModulePath", profile.module.path] },
        { atom: ATOMS.binaryOpen, argv: ["open", "--profile", profile.binaryBootstrap.profilePath, "--outDir", attemptDir, "--installedModulePath", profile.module.path] },
      ];
    case "area-open": return [{ atom: ATOMS.areaOpen, argv: ["--module", profile.module.filename, "--treeLabel", profile.area.treeLabel, "--viewerResref", profile.area.resref] }];
    case "object-place": {
      const placement = configuredPlacement(profile, args);
      const viewport = args.viewport;
      if (!plainObject(viewport) || Object.keys(viewport).sort().join(",") !== "x,y"
          || !Number.isInteger(viewport.x) || viewport.x < 0 || viewport.x > 4095
          || !Number.isInteger(viewport.y) || viewport.y < 0 || viewport.y > 4095
          || !Number.isInteger(request.frame_hwnd) || request.frame_hwnd <= 0) fail("placement_arguments_invalid", command);
      return [
        { atom: ATOMS.gitReadback, argv: ["--module", profile.module.path, "--area", placement.areaResref] },
        { atom: ATOMS.palette, argv: [
          "--category", placement.category, "--module", profile.module.filename,
          "--area", placement.areaResref, "--frameHwnd", String(request.frame_hwnd),
          "--selectText", placement.paletteText, "--placeX", String(viewport.x),
          "--placeY", String(viewport.y), "--restoreSelectObjects", "true", "--quiet", "true",
        ] },
      ];
    }
    case "objects-list": return [{ atom: ATOMS.gitReadback, argv: ["--module", profile.module.path, "--area", profile.area.resref] }];
    case "object-select": {
      const object = configuredObject(profile, args.target?.object_id);
      return [{ atom: ATOMS.objectContext, argv: ["--module", profile.module.filename, "--objectText", object.treeText, "--occurrence", String(object.occurrence), "--selectOnly", "true"] }];
    }
    case "properties-get": return [{ atom: ATOMS.gitReadback, argv: ["--module", profile.module.path, "--area", profile.area.resref] }];
    case "properties-set": {
      const object = configuredObject(profile, args.target?.object_id);
      const entries = Object.entries(args.properties ?? {});
      if (entries.length !== 1) fail("one_property_required", command);
      const [property, value] = entries[0];
      const field = object.editable[property];
      if (!field || typeof value !== "string" || value.length < 1 || value.length > field.maxLength) fail("property_value_invalid", command);
      return [
        { atom: ATOMS.objectContext, argv: ["--module", profile.module.filename, "--objectText", object.treeText, "--occurrence", String(object.occurrence), "--selectOnly", "true"] },
        { atom: ATOMS.propertiesOpen, argv: ["--module", profile.module.filename, "--objectText", object.treeText] },
        { atom: ATOMS.dialogEdit, argv: ["--dialogClass", "TdlgCreatureEdit", "--dialogTitle", "Creature Properties", "--ordinal", String(field.editOrdinal), "--text", value] },
        { atom: ATOMS.propertiesCommit, argv: [] },
      ];
    }
    case "save":
      if (!Number.isInteger(request.frame_hwnd) || request.frame_hwnd <= 0) fail("frame_identity_ambiguous", command);
      return [
      { atom: ATOMS.save, argv: ["--module", profile.module.filename, "--modulePath", profile.module.path, "--frameHwnd", String(request.frame_hwnd)] },
      { atom: ATOMS.gitReadback, argv: ["--module", profile.module.path, "--area", profile.area.resref] },
      ];
    case "test-module": return [{ atom: ATOMS.testModule, argv: ["post", "--module", profile.module.filename] }];
    default: fail("operation_unsupported", command);
  }
}

export function normalizeGitObject(profile, objectId, git) {
  const configured = configuredObject(profile, objectId);
  const list = configured.kind === "creature" ? git.creatures : [];
  if (!Array.isArray(list)) fail("saved_object_readback_invalid", "readback");
  const matches = list.filter((item) =>
    String(item.templateResRef ?? "").toLowerCase() === configured.identity.templateResRef.toLowerCase()
    && (configured.identity.tag === null || item.tag === configured.identity.tag)
    && samePosition(item.position, configured.identity.position));
  if (matches.length !== 1) fail("saved_object_identity_ambiguous", "readback");
  const item = matches[0];
  const properties = {};
  for (const [name, field] of Object.entries(configured.editable)) properties[name] = item[field.savedField] ?? null;
  return { object_id: configured.id, area_id: configured.areaResref, kind: configured.kind, properties };
}

export function normalizeState(profile, target, observed, persisted = null) {
  if (observed?.ok !== true || observed.processId !== target.pid || observed.responding !== true || !Array.isArray(observed.windows)) fail("state_observation_invalid", "state");
  const frames = observed.windows.filter((item) => item.className === "TfrmFrame");
  if (frames.length !== 1) fail("frame_identity_ambiguous", "state");
  const title = String(frames[0].text ?? "");
  const trimmedTitle = title.trimEnd();
  const dirty = trimmedTitle.endsWith("*");
  const cleanTitle = (dirty ? trimmedTitle.slice(0, -1) : trimmedTitle).trimEnd();
  const moduleOpen = cleanTitle.toLowerCase().endsWith(` - ${profile.module.filename.toLowerCase()}`);
  const modals = observed.windows.filter((item) => !new Set(["TfrmFrame", "TApplication"]).has(item.className));
  const receipt = persisted?.moduleReceipt;
  const receiptMatches = moduleOpen
    && plainObject(receipt)
    && receipt.kind === "canonical_cold_open"
    && receipt.pid === target.pid
    && receipt.createdAtNs === target.created_at_ns
    && receipt.frameHwnd === frames[0].hwnd
    && receipt.moduleSha256 === profile.module.sha256
    && receipt.profileSha256 === hashFile(profile.binaryBootstrap.profilePath, MAX_PROFILE_BYTES);
  const persistedModuleSha256 = typeof persisted?.moduleSha256 === "string"
    && /^[0-9a-f]{64}$/u.test(persisted.moduleSha256.toLowerCase())
    ? persisted.moduleSha256.toLowerCase()
    : null;
  const savedModuleMatches = receiptMatches && persistedModuleSha256 !== null
    && hashFile(profile.module.path, MAX_MODULE_BYTES) === persistedModuleSha256;
  const state = {
    session_id: sessionId(profile.id, target),
    pid: target.pid,
    created_at_ns: target.created_at_ns,
    responding: true,
    module: savedModuleMatches ? { filename: profile.module.filename, sha256: persistedModuleSha256 } : null,
    area_resref: observed.areaResref ?? null,
    selected_object_id: persisted?.selectedObjectId ?? null,
    dirty,
    modal_count: modals.length,
  };
  state.revision = stateRevision(state);
  return state;
}

async function main() {
  const [command, ...argv] = process.argv.slice(2);
  const options = parseArgs(argv);
  const profile = loadProfile(required(options.profile, "--profile"));
  if (command === "doctor") {
    const missing = Object.values(ATOMS).filter((name) => !existsSync(resolve(here, name)));
    print({ ok: missing.length === 0, version: "aurora-toolset-native-bridge-doctor/v1", profileId: profile.id, atomsReady: missing.length === 0, missingAtomCount: missing.length, liveAction: false });
    process.exitCode = missing.length === 0 ? 0 : 2;
    return;
  }
  if (command === "restore-frame") {
    const result = restoreOwnedFrame(profile);
    print(result);
    process.exitCode = result.ok === true ? 0 : 2;
    return;
  }
  if (command === "reconcile") {
    const requestIdValue = required(options["request-id"], "--request-id");
    if (!requestId(requestIdValue)) throw new ContractError("request_id_invalid", "reconcile");
    const result = reconcileColdOpen(profile, requestIdValue);
    print(result);
    process.exitCode = result.ok === true ? 0 : 2;
    return;
  }
  if (command !== "bridge") throw new ContractError("command_invalid", "cli");
  const request = readRequest();
  const operation = request.operation;
  const nativeCommand = OPERATION_COMMAND[operation];
  if (!nativeCommand) {
    print(failed(operation, request.arguments?.request_id, request.target_identity, "operation_unsupported", false));
    process.exitCode = 2;
    return;
  }
  try {
    const result = execute(nativeCommand, profile, request);
    print(result);
    process.exitCode = result.status === "verified" ? 0 : 2;
  } catch (error) {
    const normalized = error instanceof ContractError ? error : new ContractError("native_coordinator_failed", nativeCommand, Boolean(error?.submitted));
    print(failed(operation, request.arguments?.request_id, request.target_identity, normalized.code, normalized.submitted));
    process.exitCode = 2;
  }
}

function execute(command, profile, request) {
  const operation = request.operation;
  const args = request.arguments;
  const mutating = !new Set(["aurora_state_get", "aurora_objects_list", "aurora_properties_get"]).has(operation);
  if (request.version !== REQUEST_VERSION || !plainObject(args)) fail("request_invalid", command);
  if (mutating && !requestId(args.request_id)) fail("request_id_invalid", command);
  const deadline = operationDeadline(args.deadline_ms, mutating);
  let target = request.target_identity;
  if (command !== "cold-open") {
    target = exactTarget(target);
    verifyProcess(profile, target);
  }
  if (command === "cold-open") return executeColdOpen(profile, request);
  const beforeObserved = observeState(profile, deadline);
  const persisted = readState(profile, target, false);
  const before = normalizeState(profile, target, beforeObserved, persisted);
  if (args.expected_revision && args.expected_revision !== before.revision) fail("stale_revision", command);
  if (command === "state") return verifiedRead(operation, target, { state: before });
  if (command === "attach") {
    const payload = { ...statePayload(persisted), moduleSha256: before.module?.sha256 ?? null, moduleReceipt: persisted?.moduleReceipt ?? null, areaResref: before.area_resref, selectedObjectId: null };
    const next = normalizeState(profile, target, beforeObserved, payload);
    writeState(profile, target, payload, next.revision);
    return verifiedMutation(operation, args.request_id, target, { session: publicSession(profile, target), revision: next.revision }, { saved: false, visual: false });
  }
  if (!before.module || before.modal_count !== 0) fail("session_not_ready", command);
  const frameHwnd = exactFrameHwnd(beforeObserved, target);
  const plan = buildAtomPlan(command, profile, { ...request, frame_hwnd: frameHwnd });
  if (command === "area-open") {
    requireClean(before);
    if (persisted?.pendingProperty || persisted?.pendingPlacement) fail("pending_mutation_exists", command);
    if (args.area_resref !== profile.area.resref) fail("area_identity_mismatch", command);
    const result = runAtomPlan(plan, deadline)[0];
    requirePidMonitor(profile, target, result);
    if (result.ok !== true || result.viewerResref !== profile.area.resref
        || !Number.isInteger(result.viewerHwnd) || result.viewerHwnd <= 0
        || !Number.isInteger(result.viewportHwnd) || result.viewportHwnd <= 0) {
      fail("area_viewer_readback_missing", command, true);
    }
    const payload = { ...statePayload(persisted), moduleSha256: before.module.sha256, areaResref: result.viewerResref, selectedObjectId: null, pendingProperty: null, pendingPlacement: null };
    const afterObserved = observeState(profile, deadline);
    const next = normalizeState(profile, target, afterObserved, payload);
    if (next.area_resref !== result.viewerResref) fail("area_state_readback_mismatch", command, true);
    writeState(profile, target, payload, next.revision);
    return verifiedMutation(operation, args.request_id, target, { area_resref: result.viewerResref, viewer_ready: true, revision: next.revision }, { saved: false, visual: false });
  }
  if (command === "object-place") {
    requireClean(before);
    if (before.area_resref !== profile.area.resref || !requestSessionMatches(args.session, profile, target)
        || args.expected_revision !== before.revision) fail("placement_session_mismatch", command);
    if (persisted?.pendingProperty || persisted?.pendingPlacement) fail("pending_mutation_exists", command);
    const placement = configuredPlacement(profile, args);
    const baseline = runAtom(plan[0].atom, plan[0].argv, deadline, false);
    const baselineRecord = placementBaseline(profile, before, baseline);
    const action = runAtom(plan[1].atom, plan[1].argv, deadline, true);
    requirePalettePlacement(profile, target, action, placement, args.viewport, frameHwnd);
    try {
      const afterObserved = observeState(profile, deadline);
      const after = normalizeState(profile, target, afterObserved, persisted);
      if (!after.dirty || after.modal_count !== 0 || after.area_resref !== placement.areaResref) fail("placement_postcondition_missing", command, true);
      const payload = {
        ...statePayload(persisted),
        selectedObjectId: null,
        pendingProperty: null,
        pendingPlacement: {
          category: placement.category,
          areaResref: placement.areaResref,
          paletteText: placement.paletteText,
          expectedTemplateResRef: placement.expectedTemplateResRef,
          baseline: baselineRecord,
        },
      };
      const next = normalizeState(profile, target, afterObserved, payload);
      writeState(profile, target, payload, next.revision);
      return verifiedMutation(operation, args.request_id, target, {
        area_resref: placement.areaResref,
        category: placement.category,
        palette_text: placement.paletteText,
        viewport: { x: args.viewport.x, y: args.viewport.y },
        placement_pending: true,
        revision: next.revision,
      }, { saved: false, visual: false });
    } catch (error) {
      throw markMutationSubmitted(error, "placement_postcondition_failed", command);
    }
  }
  if (command === "objects-list") {
    requireClean(before);
    const git = runAtomPlan(plan, deadline)[0];
    const objects = profile.objects.map((item) => normalizeGitObject(profile, item.id, git));
    return verifiedRead(operation, target, { area_resref: profile.area.resref, objects: objects.slice(0, Number(args.limit ?? 1000)) }, true);
  }
  if (command === "object-select") {
    const result = runAtomPlan(plan, deadline)[0];
    requirePidMonitor(profile, target, result);
    const object = configuredObject(profile, args.target?.object_id);
    if (result.target?.text !== object.treeText || result.target?.occurrence !== object.occurrence) fail("selection_readback_mismatch", command, true);
    const next = writeState(profile, target, { ...statePayload(persisted), selectedObjectId: object.id });
    return verifiedMutation(operation, args.request_id, target, { selected_object_id: object.id, revision: next.revision }, { saved: false, visual: false });
  }
  if (command === "properties-get") {
    requireClean(before);
    const git = runAtomPlan(plan, deadline)[0];
    return verifiedRead(operation, target, { object: normalizeGitObject(profile, args.target?.object_id, git) }, true);
  }
  if (command === "properties-set") {
    requireClean(before);
    const results = runAtomPlan(plan, deadline);
    results.forEach((result) => requirePid(profile, target, result));
    const afterObserved = observeState(profile, deadline);
    const after = normalizeState(profile, target, afterObserved, persisted);
    if (!after.dirty || after.modal_count !== 0) fail("property_commit_postcondition_missing", command, true);
    const [name, value] = Object.entries(args.properties)[0];
    const object = configuredObject(profile, args.target?.object_id);
    const next = writeState(profile, target, { ...statePayload(persisted), selectedObjectId: object.id, pendingProperty: { objectId: object.id, name, value } });
    return verifiedMutation(operation, args.request_id, target, { object_id: object.id, changed: { [name]: value }, revision: next.revision }, { saved: false, visual: false });
  }
  if (command === "save") {
    if (!before.dirty || before.module.sha256.toLowerCase() !== String(args.expected_module_sha256).toLowerCase()) fail("save_precondition_mismatch", command);
    const [saved, git] = runAtomPlan(plan, deadline);
    requirePid(profile, target, saved);
    const savedModuleSha256 = validateNativeSaveReceipt(saved, profile, before.module.sha256, frameHwnd);
    try {
      if (!validGitReadback(profile, git, savedModuleSha256)) fail("saved_git_readback_mismatch", command, true);
      const pending = persisted?.pendingProperty;
      let savedObject = null;
      if (pending) {
        savedObject = normalizeGitObject(profile, pending.objectId, git);
        if (savedObject.properties[pending.name] !== pending.value) fail("saved_property_readback_mismatch", command, true);
      }
      const pendingPlacement = persisted?.pendingPlacement;
      let placedObject = null;
      if (pendingPlacement) placedObject = verifySavedPlacement(pendingPlacement, git);
      const payload = { ...statePayload(persisted), moduleSha256: savedModuleSha256, pendingProperty: null, pendingPlacement: null };
      const afterObserved = observeState(profile, deadline);
      const after = normalizeState(profile, target, afterObserved, payload);
      if (after.dirty || after.modal_count !== 0 || after.module?.sha256 !== payload.moduleSha256) fail("native_save_state_readback_missing", command, true);
      writeState(profile, target, payload, after.revision);
      return verifiedMutation(operation, args.request_id, target, { module_sha256: payload.moduleSha256, saved_object: savedObject, placed_object: placedObject, revision: after.revision }, { saved: true, visual: false });
    } catch (error) {
      throw markMutationSubmitted(error, "native_save_postcondition_failed", command);
    }
  }
  if (command === "test-module") {
    requireClean(before);
    if (before.module.sha256.toLowerCase() !== String(args.build_id).toLowerCase()
        || !profile.clientProfiles.includes(args.client_profile_id)) fail("test_module_build_mismatch", command);
    const nwnBefore = inspectNamedProcesses("nwmain");
    if (nwnBefore.length !== 0) fail("nwn_process_conflict", command);
    const posted = runAtomPlan(plan, deadline)[0];
    try {
      validateTestModuleReceipt(posted, profile.module.filename, target, frameHwnd);
      verifyProcessIdentityOnly(profile, target);
      const nwn = waitForOneNwn(remainingTimeout(deadline));
      return verifiedMutation(operation, args.request_id, target, { build_id: args.build_id.toLowerCase(), client_profile_id: args.client_profile_id, client_session: nwn }, { saved: true, visual: false });
    } catch (error) {
      throw markMutationSubmitted(error, "test_module_postcondition_failed", command);
    }
  }
  fail("operation_unsupported", command);
}

function executeColdOpen(profile, request) {
  const args = request.arguments;
  if (!profile.binaryBootstrap || String(args.build_id).toLowerCase() !== profile.module.sha256.toLowerCase()) fail("cold_open_build_mismatch", "cold-open");
  if (inspectNamedProcesses("nwtoolset").length !== 0 || inspectNamedProcesses("nwmain").length !== 0) fail("process_conflict", "cold-open");
  const deadline = operationDeadline(args.deadline_ms, true);
  const plan = buildAtomPlan("cold-open", profile, request);
  const preflight = preparedColdOpenAdmission(profile, args.request_id)
    ?? runAtom(plan[0].atom, plan[0].argv, deadline);
  if (preflight.ok !== true || preflight.command !== "preflight"
      || preflight.status !== "binary_native_geometry_preflight_valid") fail("cold_open_preflight_failed", "cold-open");
  const attemptDir = coldOpenAttemptDir(profile, args.request_id);
  const openArgv = [
    ...plan[1].argv,
    "--operationBudgetMs", String(coldOpenAtomBudgetMs(deadline)),
    "--actionJournalDir", resolve(attemptDir, "module-open-action-journal"),
  ];
  const opened = runAtom(plan[1].atom, openArgv, deadline, true);
  if (opened.ok !== true || opened.command !== "open"
      || opened.status !== "binary_native_geometry_module_ready") fail("cold_open_postcondition_missing", "cold-open", true);
  try {
    const processes = inspectNamedProcesses("nwtoolset");
    if (processes.length !== 1) fail("cold_open_process_identity_missing", "cold-open", true);
    const target = { pid: processes[0].pid, created_at_ns: processes[0].created_at_ns };
    verifyProcess(profile, target);
    const observed = observeState(profile, deadline);
    const moduleReceipt = validateColdOpenReceipt(profile, opened, processes[0], target, observed, args.request_id);
    const payload = { moduleSha256: moduleReceipt.moduleSha256, moduleReceipt, areaResref: null, selectedObjectId: null, pendingProperty: null, pendingPlacement: null };
    const state = normalizeState(profile, target, observed, payload);
    if (!state.module || state.area_resref !== null || state.modal_count !== 0 || state.dirty) fail("cold_open_state_unverified", "cold-open", true);
    writeState(profile, target, payload, state.revision);
    return verifiedMutation(request.operation, args.request_id, target, { session: publicSession(profile, target), module_sha256: profile.module.sha256, area_resref: null, revision: state.revision }, { saved: true, visual: false });
  } catch (error) {
    throw markPostLaunchSubmitted(error);
  }
}

export function restoreOwnedFrame(profile) {
  const persisted = readRestoreState(profile);
  const target = exactTarget({ pid: persisted.pid, created_at_ns: persisted.createdAtNs });
  verifyProcess(profile, target);
  const receipt = persisted.moduleReceipt;
  const currentModuleSha256 = hashFile(profile.module.path, MAX_MODULE_BYTES);
  const profileSha256 = hashFile(profile.binaryBootstrap.profilePath, MAX_PROFILE_BYTES);
  if (!plainObject(receipt) || receipt.kind !== "canonical_cold_open"
      || receipt.pid !== target.pid || receipt.createdAtNs !== target.created_at_ns
      || !Number.isSafeInteger(receipt.frameHwnd) || receipt.frameHwnd <= 0
      || receipt.profileSha256 !== profileSha256 || receipt.moduleSha256 !== profile.module.sha256
      || persisted.moduleSha256 !== currentModuleSha256
      || persisted.pendingProperty != null || persisted.pendingPlacement != null) fail("restore_frame_admission_failed", "restore-frame");
  const deadline = performance.now() + 60_000;
  const restored = runAtom(ATOMS.restoreFrame, [
    "--module", profile.module.filename,
    "--expectedPid", String(target.pid),
    "--frameHwnd", String(receipt.frameHwnd),
    "--ensureNonPrimary", "true",
  ], deadline, true);
  validateRestoreFrameReceipt(restored, profile, target, receipt.frameHwnd);
  const observed = observeState(profile, deadline);
  const state = normalizeState(profile, target, observed, persisted);
  const frameHwnd = exactFrameHwnd(observed, target);
  if (frameHwnd !== receipt.frameHwnd || state.module?.sha256 !== currentModuleSha256
      || state.dirty || state.modal_count !== 0) fail("restore_frame_postcondition_missing", "restore-frame", true);
  return {
    ok: true,
    version: "aurora-toolset-native-restore-frame/v1",
    status: "frame_restored",
    profileId: profile.id,
    process_identity: target,
    frame_hwnd: frameHwnd,
    module_sha256: currentModuleSha256,
    area_resref: state.area_resref,
    revision: state.revision,
    action_submitted: restored.restored === true || restored.placedOnNonPrimary === true,
    postcondition_verified: true,
    monitor: restored.monitor,
    safety: restored.safety,
  };
}

function readRestoreState(profile) {
  if (!existsSync(profile.statePath)) fail("session_state_missing", "restore-frame");
  let value;
  try { value = JSON.parse(readFileSync(profile.statePath, "utf8")); } catch { fail("session_state_invalid", "restore-frame"); }
  if (!plainObject(value) || value.version !== "aurora-toolset-native-session/v1"
      || value.profileId !== profile.id || !Number.isInteger(value.pid) || value.pid <= 0
      || !/^[1-9][0-9]{0,19}$/u.test(String(value.createdAtNs ?? ""))) fail("session_state_identity_mismatch", "restore-frame");
  return value;
}

export function validateRestoreFrameReceipt(result, profile, target, frameHwnd) {
  const safety = result?.safety;
  if (result?.ok !== true || result?.processId !== target.pid || result?.frameHwnd !== frameHwnd
      || result?.module !== profile.module.filename
      || result?.after?.visible !== true || result?.after?.iconic !== false
      || result?.monitor?.deviceName !== profile.monitor.deviceName || result?.monitor?.primary !== false
      || !plainObject(safety) || safety.globalCursor !== false || safety.globalKeyboard !== false
      || safety.globalMouse !== false || safety.activatesFrame !== false
      || safety.usesNoActivate !== true || safety.usesNoZOrderChange !== true) fail("restore_frame_receipt_invalid", "restore-frame", true);
  return true;
}

function runAtomPlan(plan, deadline = null) { return plan.map((step) => runAtom(step.atom, step.argv, deadline, true)); }

function observeState(profile, deadline) {
  const top = runAtom(ATOMS.inspect, [], deadline);
  const area = runAtom(ATOMS.activeArea, ["--module", profile.module.filename], deadline);
  if (area?.ok !== true || area.processId !== top.processId) fail("active_area_observation_invalid", "state");
  if (area?.monitor?.deviceName !== profile.monitor.deviceName || area?.monitor?.primary !== false) fail("monitor_identity_mismatch", "state");
  return { ...top, areaResref: area.areaResref ?? null, areaViewerHwnd: area.viewerHwnd ?? null };
}

function runAtom(name, argv, deadline = null, submittedOnFailure = false) {
  if (!Object.values(ATOMS).includes(name)) fail("atom_not_allowlisted", "dispatch");
  const script = resolve(here, name);
  if (!existsSync(script)) fail("canonical_atom_missing", "dispatch");
  try {
    const timeout = remainingTimeout(deadline);
    const raw = execFileSync(process.execPath, [script, ...argv], {
      encoding: "utf8", windowsHide: true, timeout, maxBuffer: MAX_ATOM_OUTPUT,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const parsed = JSON.parse(raw.trim());
    if (!plainObject(parsed)) fail("atom_result_invalid", "dispatch", submittedOnFailure);
    return parsed;
  } catch (error) {
    if (error instanceof ContractError) throw error;
    throw new ContractError("canonical_atom_failed", "dispatch", submittedOnFailure);
  }
}

function verifyProcess(profile, target) {
  const rows = inspectNamedProcesses("nwtoolset");
  const matches = rows.filter((row) => row.pid === target.pid && row.created_at_ns === target.created_at_ns);
  if (matches.length !== 1 || rows.length !== 1 || matches[0].responding !== true) fail("process_identity_mismatch", "identity");
  if (matches[0].executable.toLowerCase() !== resolve(profile.toolset.executable).toLowerCase()
      || hashFile(profile.toolset.executable, MAX_MODULE_BYTES) !== profile.toolset.sha256.toLowerCase()) fail("process_executable_mismatch", "identity");
}

function verifyProcessIdentityOnly(profile, target) {
  const source = String.raw`
$ErrorActionPreference='Stop';$p=Get-Process -Id ([int]$env:ANB_PID) -ErrorAction Stop;$ticks=$p.StartTime.ToUniversalTime().Ticks-621355968000000000;[pscustomobject]@{pid=$p.Id;created_at_ns=([string]($ticks*100));executable=$p.Path}|ConvertTo-Json -Compress
`;
  let row;
  try {
    const raw = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source], {
      encoding: "utf8", windowsHide: true, timeout: 10_000, maxBuffer: 64 * 1024,
      env: { ...process.env, ANB_PID: String(target.pid) }, stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    row = JSON.parse(raw);
  } catch { fail("process_identity_mismatch", "identity"); }
  if (row?.pid !== target.pid || row?.created_at_ns !== target.created_at_ns
      || resolve(String(row?.executable ?? "")).toLowerCase() !== resolve(profile.toolset.executable).toLowerCase()
      || hashFile(profile.toolset.executable, MAX_MODULE_BYTES) !== profile.toolset.sha256.toLowerCase()) fail("process_identity_mismatch", "identity");
}

function inspectNamedProcesses(name) {
  const source = String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms;$rows=@(Get-Process -Name $env:ANB_NAME -ErrorAction SilentlyContinue|ForEach-Object{$ticks=$_.StartTime.ToUniversalTime().Ticks-621355968000000000;$screen=[Windows.Forms.Screen]::FromHandle($_.MainWindowHandle);[pscustomobject]@{pid=$_.Id;created_at_ns=([string]($ticks*100));start_time_utc=$_.StartTime.ToUniversalTime().ToString('o');responding=$_.Responding;executable=$_.Path;main_window_title=$_.MainWindowTitle;monitor_device=$screen.DeviceName;monitor_primary=$screen.Primary}});$rows|ConvertTo-Json -Depth 3 -Compress
`;
  try {
    const raw = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source], {
      encoding: "utf8", windowsHide: true, timeout: 10_000, maxBuffer: 1024 * 1024,
      env: { ...process.env, ANB_NAME: name }, stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!raw) return [];
    const value = JSON.parse(raw);
    const rows = Array.isArray(value) ? value : [value];
    return rows.map((row) => ({ pid: Number(row.pid), created_at_ns: String(row.created_at_ns), start_time_utc: String(row.start_time_utc ?? ""), responding: row.responding === true, executable: String(row.executable ?? ""), main_window_title: String(row.main_window_title ?? ""), monitor_device: String(row.monitor_device ?? ""), monitor_primary: row.monitor_primary === true }));
  } catch { fail("process_inventory_unavailable", "identity"); }
}

function waitForOneNwn(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rows = inspectNamedProcesses("nwmain");
    if (rows.length === 1 && rows[0].responding) return { pid: rows[0].pid, created_at_ns: rows[0].created_at_ns };
    if (rows.length > 1) fail("nwn_process_identity_ambiguous", "test-module", true);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  fail("nwn_process_start_unverified", "test-module", true);
}

function requirePid(profile, target, result) {
  if (result?.processId !== target.pid) fail("atom_process_identity_mismatch", "postcondition", true);
  verifyProcess(profile, target);
}
function requirePidMonitor(profile, target, result) {
  requirePid(profile, target, result);
  if (result?.monitor?.deviceName !== profile.monitor.deviceName || result?.monitor?.primary !== false) fail("monitor_identity_mismatch", "postcondition", true);
}
function requireClean(state) { if (state.dirty || state.modal_count !== 0) fail("session_not_clean", "precondition"); }

function exactFrameHwnd(observed, target) {
  const frames = observed?.windows?.filter((item) => item.className === "TfrmFrame") ?? [];
  if (observed?.processId !== target.pid || frames.length !== 1
      || !Number.isInteger(frames[0].hwnd) || frames[0].hwnd <= 0) fail("frame_identity_ambiguous", "identity");
  return frames[0].hwnd;
}

function configuredPlacement(profile, args) {
  if (!plainObject(args) || args.category !== "placeable" || args.area_resref !== profile.area.resref
      || !printableText(args.palette_text, 256)) fail("placement_not_allowed", "placement");
  const matches = (profile.placements ?? []).filter((item) => item.category === args.category
    && item.areaResref === args.area_resref && item.paletteText === args.palette_text);
  if (matches.length !== 1) fail("placement_not_allowed", "placement");
  return matches[0];
}

export function requestSessionMatches(session, profile, target) {
  return plainObject(session)
    && Object.keys(session).sort().join(",") === "created_at_ns,pid,session_id"
    && session.session_id === sessionId(profile.id, target)
    && session.pid === target.pid
    && session.created_at_ns === target.created_at_ns;
}

export function validateNativeSaveReceipt(saved, profile, beforeModuleSha256, frameHwnd) {
  const beforeReceiptHash = String(saved?.before?.sha256 ?? "").toLowerCase();
  const afterReceiptHash = String(saved?.after?.sha256 ?? "").toLowerCase();
  const deferred = saved?.hashDeferredUntilClose === true;
  if (saved?.ok !== true || saved.frameHwnd !== frameHwnd
      || resolve(String(saved.modulePath ?? "")) !== resolve(profile.module.path)
      || (!beforeReceiptHash && !deferred) || (!afterReceiptHash && !deferred)
      || (beforeReceiptHash && (!/^[0-9a-f]{64}$/u.test(beforeReceiptHash) || beforeReceiptHash !== beforeModuleSha256.toLowerCase()))
      || (afterReceiptHash && !/^[0-9a-f]{64}$/u.test(afterReceiptHash))
      || saved.safety?.usesGlobalCursor !== false || saved.safety?.usesGlobalKeyboard !== false
      || saved.safety?.usesGlobalMouse !== false) fail("native_save_readback_missing", "save", true);
  const diskHash = hashFile(profile.module.path, MAX_MODULE_BYTES);
  if (diskHash === beforeModuleSha256.toLowerCase() || (afterReceiptHash && afterReceiptHash !== diskHash)) {
    fail("native_save_readback_missing", "save", true);
  }
  return diskHash;
}

function validGitReadback(profile, git, expectedModuleSha256) {
  const kinds = ["placeables", "doors", "creatures", "encounters", "items", "sounds", "stores", "triggers", "waypoints"];
  const counts = git?.objectCounts;
  return git?.version === "aurora-toolset-bootstrap-git-readback/v1"
    && git?.area === profile.area.resref
    && String(git?.moduleSha256 ?? "").toLowerCase() === expectedModuleSha256.toLowerCase()
    && /^[0-9a-f]{64}$/u.test(String(git?.gitSha256 ?? "").toLowerCase())
    && plainObject(counts) && Object.keys(counts).sort().join(",") === [...kinds, "total"].sort().join(",")
    && kinds.every((kind) => Number.isInteger(counts[kind]) && counts[kind] >= 0)
    && counts.total === kinds.reduce((sum, kind) => sum + counts[kind], 0)
    && Array.isArray(git.placeables) && git.placeables.length === counts.placeables;
}

function normalizedPlaceable(value) {
  if (!plainObject(value) || !resref(String(value.templateResRef ?? ""))
      || (value.tag !== null && value.tag !== undefined && !boundedText(value.tag, 256))
      || !Array.isArray(value.position) || value.position.length !== 3
      || value.position.some((item) => typeof item !== "number" || !Number.isFinite(item))
      || (value.bearing !== null && value.bearing !== undefined && (typeof value.bearing !== "number" || !Number.isFinite(value.bearing)))) fail("saved_placement_schema_invalid", "readback", true);
  return {
    templateResRef: String(value.templateResRef).toLowerCase(),
    tag: value.tag ?? null,
    appearanceType: Number.isInteger(value.appearanceType) ? value.appearanceType : null,
    portraitId: Number.isInteger(value.portraitId) ? value.portraitId : null,
    position: value.position.map(Number),
    bearing: value.bearing ?? null,
  };
}

function placeableSignature(value) { return revision(normalizedPlaceable(value)); }

function placementBaseline(profile, before, git) {
  if (!validGitReadback(profile, git, before.module.sha256)) fail("placement_baseline_invalid", "placement");
  return {
    moduleSha256: before.module.sha256,
    gitSha256: git.gitSha256.toLowerCase(),
    objectCounts: { ...git.objectCounts },
    placeableSignatures: git.placeables.map(placeableSignature).sort(),
  };
}

function requirePalettePlacement(profile, target, result, placement, viewport, frameHwnd) {
  if (result?.pid !== target.pid) fail("atom_process_identity_mismatch", "postcondition", true);
  verifyProcess(profile, target);
  const point = result?.action?.viewport?.points?.[0];
  if (result?.ok !== true || result?.categoryIndex !== 5
      || result?.action?.selectedText !== placement.paletteText
      || result?.action?.viewport?.placementMode !== "point" || result?.action?.selectObjectsRestored !== true
      || !Array.isArray(result?.action?.viewport?.points) || result.action.viewport.points.length !== 1
      || !Number.isSafeInteger(result?.action?.viewport?.hwnd) || result.action.viewport.hwnd <= 0
      || !Number.isSafeInteger(result?.action?.selectedHandle) || result.action.selectedHandle <= 0
      || !plainObject(point) || point.x !== viewport.x || point.y !== viewport.y
      || result?.safety?.usesGlobalCursor !== false || result?.safety?.usesGlobalKeyboard !== false
      || result?.safety?.usesGlobalMouse !== false || frameHwnd <= 0) fail("placement_action_readback_missing", "placement", true);
}

export function validateTestModuleReceipt(result, moduleFilename, target, frameHwnd) {
  const menu = result?.menu;
  const qpc = result?.qpc;
  if (result?.ok !== true || result?.status !== "posted" || result?.processId !== target.pid
      || result?.frameHwnd !== frameHwnd || result?.module !== moduleFilename
      || !plainObject(menu) || menu.topPosition !== 4 || menu.itemPosition !== 2
      || menu.commandId !== 121 || !Number.isInteger(menu.state)
      || (menu.state & 3) !== 0 || (menu.state & 0x800) !== 0
      || !plainObject(qpc) || !Number.isSafeInteger(qpc.before) || !Number.isSafeInteger(qpc.after)
      || !Number.isSafeInteger(qpc.frequency) || qpc.before < 0 || qpc.after < qpc.before || qpc.frequency <= 0
      || result?.nonblocking !== true || result?.requestsNwnStart !== true
      || result?.usesGlobalInput !== false
      || result?.safety?.method !== "validated exact Build menu item followed by one targeted PostMessage WM_COMMAND; no post-dispatch Toolset readback") fail("test_module_post_unverified", "test-module", true);
  return true;
}

export function verifySavedPlacement(pending, git) {
  if (!plainObject(pending) || pending.category !== "placeable" || !resref(pending.areaResref)
      || !printableText(pending.paletteText, 256) || !resref(pending.expectedTemplateResRef)
      || !plainObject(pending.baseline)) fail("saved_placement_baseline_invalid", "readback", true);
  const baseline = pending.baseline;
  const kinds = ["placeables", "doors", "creatures", "encounters", "items", "sounds", "stores", "triggers", "waypoints"];
  const before = baseline.objectCounts;
  const after = git?.objectCounts;
  if (!plainObject(before) || !plainObject(after) || git?.area !== pending.areaResref
      || !Array.isArray(baseline.placeableSignatures) || !Array.isArray(git?.placeables)
      || after.placeables !== before.placeables + 1 || after.total !== before.total + 1
      || kinds.filter((kind) => kind !== "placeables").some((kind) => after[kind] !== before[kind])) fail("saved_placement_delta_invalid", "readback", true);
  const prior = new Map();
  for (const signature of baseline.placeableSignatures) {
    if (typeof signature !== "string" || !/^[0-9a-f]{64}$/u.test(signature)) fail("saved_placement_baseline_invalid", "readback", true);
    prior.set(signature, (prior.get(signature) ?? 0) + 1);
  }
  const added = [];
  for (const item of git.placeables) {
    const normalized = normalizedPlaceable(item);
    const signature = revision(normalized);
    const count = prior.get(signature) ?? 0;
    if (count > 0) prior.set(signature, count - 1);
    else added.push(normalized);
  }
  if (added.length !== 1 || [...prior.values()].some((count) => count !== 0)
      || added[0].templateResRef !== pending.expectedTemplateResRef.toLowerCase()) fail("saved_placement_identity_mismatch", "readback", true);
  return { kind: "placeable", template_resref: added[0].templateResRef, tag: added[0].tag, position: added[0].position };
}

function readState(profile, target, requiredState) {
  if (!existsSync(profile.statePath)) {
    if (requiredState) fail("session_state_missing", "state");
    return null;
  }
  try {
    const value = JSON.parse(readFileSync(profile.statePath, "utf8"));
    if (value.version !== "aurora-toolset-native-session/v1" || value.profileId !== profile.id
        || value.pid !== target.pid || value.createdAtNs !== target.created_at_ns) fail("session_state_identity_mismatch", "state");
    return value;
  } catch (error) {
    if (error instanceof ContractError) throw error;
    fail("session_state_invalid", "state");
  }
}

function writeState(profile, target, payload, observedRevision) {
  const parent = dirname(profile.statePath);
  mkdirSync(parent, { recursive: true });
  const value = {
    version: "aurora-toolset-native-session/v1", profileId: profile.id,
    pid: target.pid, createdAtNs: target.created_at_ns,
    ...payload, revision: observedRevision, updatedAt: new Date().toISOString(),
  };
  const temporary = `${profile.statePath}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  renameSync(temporary, profile.statePath);
  return value;
}

function statePayload(state) {
  return { moduleSha256: state?.moduleSha256 ?? null, moduleReceipt: state?.moduleReceipt ?? null, areaResref: state?.areaResref ?? null, selectedObjectId: state?.selectedObjectId ?? null, pendingProperty: state?.pendingProperty ?? null, pendingPlacement: state?.pendingPlacement ?? null };
}

function verifiedRead(operation, target, payload, saved = false) {
  return { version: VERSION, operation, status: "verified", data: { identity: { adapter: "aurora", ...target }, process_identity: target, ...payload, evidence: { execution: true, saved_readback: saved, live_visual: false } }, error: null };
}
function verifiedMutation(operation, requestIdValue, target, payload, evidence) {
  return { version: VERSION, operation, status: "verified", data: { operation_status: "completed", action_submitted: true, postcondition_verified: true, request_id: requestIdValue, process_identity: target, ...payload, evidence: { execution: true, saved_readback: evidence.saved, live_visual: evidence.visual } }, error: null };
}
function failed(operation, requestIdValue, target, code, submitted) {
  const mutating = !new Set(["aurora_state_get", "aurora_objects_list", "aurora_properties_get"]).has(operation);
  const data = mutating
    ? { operation_status: submitted ? "outcome_unknown" : (code === "operation_unsupported" ? "unsupported" : "failed"), action_submitted: submitted, postcondition_verified: false, request_id: requestIdValue ?? null, process_identity: target ?? null, evidence: { execution: false, saved_readback: false, live_visual: false } }
    : { identity: { adapter: "aurora", ...(target ?? {}) }, process_identity: target ?? null, evidence: { execution: false, saved_readback: false, live_visual: false } };
  return { version: VERSION, operation, status: code === "operation_unsupported" ? "missing" : "failed", data, error: { code, message: "Aurora coordinator did not produce a verified result." } };
}

function publicSession(profile, target) { return { session_id: sessionId(profile.id, target), pid: target.pid, created_at_ns: target.created_at_ns }; }
function sessionId(profileId, target) { return `aurora-${profileId}-${target.pid}-${target.created_at_ns}`; }
function configuredObject(profile, id) { const matches = profile.objects.filter((item) => item.id === id); if (matches.length !== 1) fail("object_identity_unavailable", "object"); return matches[0]; }
export function coldOpenAttemptDir(profile, requestIdValue) {
  if (!requestId(requestIdValue) || !profile?.binaryBootstrap?.artifactDir) fail("request_id_invalid", "cold-open");
  const token = createHash("sha256").update(requestIdValue).digest("hex").slice(0, 24);
  return resolve(profile.binaryBootstrap.artifactDir, `attempt-${token}`);
}
function preparedColdOpenAdmission(profile, requestIdValue) {
  const attemptDir = coldOpenAttemptDir(profile, requestIdValue);
  const path = resolve(attemptDir, "binary-native-geometry-manifest.json");
  if (!existsSync(path)) return null;
  let manifest;
  try { manifest = JSON.parse(readFileSync(path, "utf8")); } catch { fail("cold_open_prepared_admission_invalid", "cold-open"); }
  const valid = manifest?.version === "aurora-toolset-binary-native-geometry-manifest/v1"
    && manifest?.status === "prepared"
    && manifest?.profileSha256 === hashFile(profile.binaryBootstrap.profilePath, MAX_PROFILE_BYTES)
    && resolve(String(manifest?.artifactDir ?? "")) === attemptDir
    && resolve(String(manifest?.module?.path ?? "")) === resolve(profile.module.path)
    && manifest?.module?.sha256 === profile.module.sha256
    && manifest?.verifiedTemp0RecoveryAdmission != null;
  if (!valid) fail("cold_open_prepared_admission_invalid", "cold-open");
  return { ok: true, command: "preflight", status: "binary_native_geometry_preflight_valid", reconciled: true };
}
function reconcileColdOpen(profile, requestIdValue) {
  if (!profile.binaryBootstrap) fail("cold_open_profile_missing", "reconcile");
  if (inspectNamedProcesses("nwtoolset").length !== 0 || inspectNamedProcesses("nwmain").length !== 0) fail("process_conflict", "reconcile");
  const priorPath = resolve(profile.binaryBootstrap.artifactDir, "binary-native-geometry-manifest.json");
  if (!existsSync(priorPath)) fail("prior_cold_open_receipt_missing", "reconcile");
  let prior;
  try { prior = JSON.parse(readFileSync(priorPath, "utf8")); } catch { fail("prior_cold_open_receipt_invalid", "reconcile"); }
  const receipt = extractOpenModuleReceipt(prior);
  const priorValid = prior?.version === "aurora-toolset-binary-native-geometry-manifest/v1"
    && prior?.status === "module_ready"
    && prior?.profileSha256 === hashFile(profile.binaryBootstrap.profilePath, MAX_PROFILE_BYTES)
    && resolve(String(prior?.module?.path ?? "")) === resolve(profile.module.path)
    && prior?.module?.sha256 === profile.module.sha256
    && prior?.open?.process?.Id > 0
    && boundedText(prior?.open?.process?.StartTimeUtc, 128)
    && receipt?.moduleOpenActionSubmitted === true
    && receipt?.moduleLoadOwner === "explicit_open"
    && receipt?.openModuleDialogResult?.matchedBy === "expected_module_exact_text"
    && String(receipt?.moduleWindowTitle ?? "").trimEnd().toLowerCase().endsWith(` - ${profile.module.filename.toLowerCase()}`);
  if (!priorValid) fail("prior_cold_open_receipt_invalid", "reconcile");
  const attemptDir = coldOpenAttemptDir(profile, requestIdValue);
  if (existsSync(attemptDir)) fail("cold_open_attempt_already_exists", "reconcile");
  const step = buildAtomPlan("cold-open", profile, { arguments: { request_id: requestIdValue }, target_identity: null })[0];
  const preflight = runAtom(step.atom, step.argv, performance.now() + 120_000);
  if (preflight?.ok !== true || preflight?.status !== "binary_native_geometry_preflight_valid"
      || preflight?.verifiedTemp0RecoveryAdmission == null) fail("verified_temp0_recovery_admission_missing", "reconcile");
  return {
    ok: true,
    version: "aurora-toolset-native-reconcile/v1",
    profileId: profile.id,
    requestId: requestIdValue,
    priorReceiptSha256: hashFile(priorPath, MAX_ATOM_OUTPUT),
    priorModuleSha256: prior.module.sha256,
    priorActionSubmitted: true,
    processCount: 0,
    priorProcessAbsent: true,
    preparedAttemptId: basename(attemptDir),
    verifiedTemp0RecoveryAdmission: true,
    liveAction: false,
  };
}
function validateColdOpenReceipt(profile, opened, processRow, target, observed, requestIdValue) {
  const manifestPath = resolve(coldOpenAttemptDir(profile, requestIdValue), "binary-native-geometry-manifest.json");
  if (resolve(String(opened.manifestPath ?? "")) !== manifestPath || !existsSync(manifestPath)) fail("cold_open_receipt_missing", "cold-open", true);
  let manifest;
  try { manifest = JSON.parse(readFileSync(manifestPath, "utf8")); } catch { fail("cold_open_receipt_invalid", "cold-open", true); }
  const profileHash = hashFile(profile.binaryBootstrap.profilePath, MAX_PROFILE_BYTES);
  const moduleHash = hashFile(profile.module.path, MAX_MODULE_BYTES);
  const result = extractOpenModuleReceipt(manifest);
  const frames = observed?.windows?.filter((item) => item.className === "TfrmFrame") ?? [];
  const explicitOwner = result?.moduleLoadOwner === "explicit_open"
    && result?.moduleOpenActionSubmitted === true
    && result?.openModuleDialogResult?.matchedBy === "expected_module_exact_text";
  const recoveryOwner = result?.moduleLoadOwner === "verified_temp0_recovery"
    && result?.moduleOpenActionSubmitted === true
    && result?.recoveryConfirmationHandled === true
    && result?.recoveryConfirmationHandledCount === 1;
  const valid = manifest?.version === "aurora-toolset-binary-native-geometry-manifest/v1"
    && manifest?.status === "module_ready"
    && manifest?.profileSha256 === profileHash
    && resolve(String(manifest?.profilePath ?? "")) === resolve(profile.binaryBootstrap.profilePath)
    && resolve(String(manifest?.artifactDir ?? "")) === coldOpenAttemptDir(profile, requestIdValue)
    && resolve(String(manifest?.module?.path ?? "")) === resolve(profile.module.path)
    && manifest?.module?.sha256 === profile.module.sha256
    && moduleHash === profile.module.sha256
    && manifest?.open?.process?.Id === target.pid
    && opened?.process?.Id === target.pid
    && manifest?.open?.process?.StartTimeUtc === processRow.start_time_utc
    && opened?.process?.StartTimeUtc === processRow.start_time_utc
    && frames.length === 1
    && result?.moduleWindowHwnd === frames[0].hwnd
    && String(result?.moduleWindowTitle ?? "").trimEnd().toLowerCase().endsWith(` - ${profile.module.filename.toLowerCase()}`)
    && (explicitOwner || recoveryOwner);
  if (!valid) fail("cold_open_receipt_invalid", "cold-open", true);
  return { kind: "canonical_cold_open", pid: target.pid, createdAtNs: target.created_at_ns, frameHwnd: frames[0].hwnd, profileSha256: profileHash, moduleSha256: moduleHash, owner: result.moduleLoadOwner };
}
export function extractOpenModuleReceipt(manifest) {
  const outer = manifest?.open?.result;
  const result = outer?.moduleOpen ?? outer;
  if (!plainObject(result)) fail("cold_open_receipt_invalid", "cold-open", true);
  return result;
}
export function markPostLaunchSubmitted(error) {
  if (error instanceof ContractError) return new ContractError(error.code, error.stage, true);
  return new ContractError("cold_open_postlaunch_verification_failed", "cold-open", true);
}
function markMutationSubmitted(error, fallbackCode, stage) {
  if (error instanceof ContractError) return new ContractError(error.code, error.stage, true);
  return new ContractError(fallbackCode, stage, true);
}
function samePosition(left, right) { return Array.isArray(left) && left.length === 3 && left.every((value, index) => Math.abs(Number(value) - Number(right[index])) <= 0.0001); }
function exactTarget(value) { if (!plainObject(value) || Object.keys(value).sort().join(",") !== "created_at_ns,pid" || !Number.isInteger(value.pid) || value.pid <= 0 || !/^[1-9][0-9]{0,19}$/u.test(value.created_at_ns)) fail("process_identity_required", "identity"); return value; }
function stateRevision(state) { return revision({ session_id: state.session_id, pid: state.pid, created_at_ns: state.created_at_ns, responding: state.responding, module: state.module, area_resref: state.area_resref, selected_object_id: state.selected_object_id, dirty: state.dirty, modal_count: state.modal_count }); }
export function operationDeadline(value, required) { if (value == null && !required) return performance.now() + 30_000; if (!Number.isInteger(value) || value < 1 || value > 300_000) fail("deadline_invalid", "request"); return performance.now() + value; }
export function coldOpenAtomBudgetMs(deadline, now = performance.now()) {
  const budget = Math.floor(deadline - now) - COORDINATOR_TERMINAL_RESERVE_MS;
  if (!Number.isInteger(budget) || budget < 15_000) fail("cold_open_deadline_too_short", "request");
  return Math.min(budget, ATOM_TIMEOUT_CEILING_MS - COORDINATOR_TERMINAL_RESERVE_MS);
}
function remainingTimeout(deadline) { if (deadline === null) return 30_000; const remaining = Math.floor(deadline - performance.now()); if (remaining < 1) fail("operation_deadline_exceeded", "dispatch", true); return Math.min(remaining, 120_000); }
function revision(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function hashFile(path, maximum) { const size = statSync(path).size; if (size < 0 || size > maximum) fail("file_size_invalid", "identity"); return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function loadProfile(path) { const size = statSync(path).size; if (size <= 0 || size > MAX_PROFILE_BYTES) fail("profile_size_invalid", "profile"); return validateProfile(JSON.parse(readFileSync(path, "utf8"))); }
function readRequest() { const chunks = []; let size = 0; const buffer = Buffer.alloc(8192); let count; while ((count = requireRead(buffer)) > 0) { size += count; if (size > MAX_STDIN_BYTES) fail("request_too_large", "request"); chunks.push(Buffer.from(buffer.subarray(0, count))); } const value = JSON.parse(Buffer.concat(chunks).toString("utf8")); exactObject(value, ["version", "operation", "arguments", "target_identity"], "request_invalid"); return value; }
function requireRead(buffer) { return requireNodeFsRead(0, buffer); }
function requireNodeFsRead(fd, buffer) { return readFileChunk(fd, buffer); }
function readFileChunk(fd, buffer) { return process.stdin.readableEnded ? 0 : readSyncCompat(fd, buffer); }
function readSyncCompat(fd, buffer) { return importReadSync(fd, buffer); }
// Kept as a tiny seam so the contract test can verify the stdin bound without
// introducing an alternate live transport.
import { readSync as importReadSync } from "node:fs";
function parseArgs(argv) { const out = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index], value = argv[index + 1]; if (!key?.startsWith("--") || value == null || value.startsWith("--")) throw new ContractError("arguments_invalid", "cli"); out[key.slice(2)] = value; } return out; }
function print(value) { process.stdout.write(`${JSON.stringify(value)}\n`); }
function required(value, name) { if (!boundedText(value, 4096)) throw new ContractError("argument_missing", name); return value; }
function requestId(value) { return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(value); }
function shortId(value) { return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u.test(value); }
function resref(value) { return typeof value === "string" && /^[A-Za-z0-9_]{1,16}$/u.test(value); }
function boundedText(value, maximum) { return typeof value === "string" && value.length > 0 && value.length <= maximum && !value.includes("\0"); }
function printableText(value, maximum) { return boundedText(value, maximum) && !/[\u0000-\u001f\u007f]/u.test(value); }
function sha256(value, code) { if (typeof value !== "string" || !/^[0-9a-fA-F]{64}$/u.test(value)) fail(code, "profile"); }
function absolutePath(value, code) { if (!boundedText(value, 4096) || !resolve(value).match(/^(?:[A-Za-z]:[\\/]|\/)/u)) fail(code, "profile"); }
function plainObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function exactObject(value, keys, code) { if (!plainObject(value) || Object.keys(value).sort().join("\0") !== [...keys].sort().join("\0")) fail(code, "contract"); }
function fail(code, stage, submitted = false) { throw new ContractError(code, stage, submitted); }

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  main().catch((error) => {
    const code = error instanceof ContractError ? error.code : "native_coordinator_failed";
    print(failed("unknown", null, null, code, Boolean(error?.submitted)));
    process.exitCode = 2;
  });
}
