import { lstatSync, mkdirSync, readdirSync, realpathSync, rmdirSync, statSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const REQUIRED_CHILD_SAFETY_FIELDS = [
  "usesGlobalInput",
  "usesGlobalCursor",
  "usesGlobalKeyboard",
  "usesGlobalMouse",
  "usesGlobalMouseWheel",
  "savesModule",
  "changesIniOrMru",
];

export function bindExactNativeModuleList({ items, installedModulePath, engineLogPath }) {
  if (!Array.isArray(items) || !items.every((item) => typeof item === "string" && item.trim())) {
    fail("PREP_NATIVE_MODULE_LIST_INVALID", "items");
  }
  const installedPath = resolve(String(installedModulePath ?? ""));
  const logPath = resolve(String(engineLogPath ?? ""));
  const approvedModuleDirectory = resolve(dirname(logPath), "..", "modules");
  if (dirname(installedPath).toLowerCase() !== approvedModuleDirectory.toLowerCase()) {
    fail("PREP_INSTALLED_MODULE_DIRECTORY_MISMATCH", `${dirname(installedPath)} != ${approvedModuleDirectory}`);
  }
  const moduleFileName = basename(installedPath);
  if (!/^[a-z0-9_]{1,16}\.mod$/iu.test(moduleFileName)) fail("PREP_INSTALLED_MODULE_BASENAME_INVALID", moduleFileName);
  const moduleStem = moduleFileName.slice(0, -4);
  const matches = items
    .map((text, index) => ({ text, index, normalized: text.trim().toLowerCase() }))
    .filter((item) => item.normalized === moduleStem.toLowerCase() || item.normalized === moduleFileName.toLowerCase());
  if (matches.length === 0) fail("PREP_NATIVE_MODULE_LIST_TARGET_MISSING", moduleFileName);
  if (matches.length !== 1) fail("PREP_NATIVE_MODULE_LIST_AMBIGUOUS", `${moduleFileName}:${matches.length}`);
  return {
    version: "aurora-model-proof-120s-native-module-list-binding/v1",
    installedModulePath: installedPath,
    approvedModuleDirectory,
    moduleFileName,
    moduleStem,
    itemCount: items.length,
    targetText: matches[0].text,
    targetIndex: matches[0].index,
  };
}

export function requireExactModuleListSelectionReadback(payload, binding, expectedPid) {
  if (Number(payload?.processId) !== expectedPid) fail("PREP_ATOM_PID_MISMATCH", `module-list:${expectedPid}->${payload?.processId}`);
  if (payload?.targetText !== binding.targetText || Number(payload?.targetIndex) !== binding.targetIndex) {
    fail("PREP_MODULE_LIST_SELECTION_TARGET_MISMATCH", JSON.stringify(payload));
  }
  if (Number(payload?.afterIndex) !== binding.targetIndex || Number(payload?.itemCount) !== binding.itemCount) {
    fail("PREP_MODULE_LIST_SELECTION_READBACK_MISMATCH", JSON.stringify(payload));
  }
  return payload;
}

export function requireExactModuleOpenReadback(payload, binding) {
  if (Number(payload?.processId) !== binding.processId) fail("PREP_ATOM_PID_MISMATCH", `module-open:${binding.processId}->${payload?.processId}`);
  if (String(payload?.moduleName ?? "").trim().toLowerCase() !== binding.moduleStem.toLowerCase()) {
    fail("PREP_MODULE_OPEN_NAME_MISMATCH", String(payload?.moduleName ?? ""));
  }
  const title = String(payload?.titleAfter ?? "").trim();
  if (title.endsWith("*") || !title.toLowerCase().endsWith(` - ${binding.moduleFileName.toLowerCase()}`)) {
    fail("PREP_SWITCH_TARGET_TITLE_MISMATCH", title);
  }
  if (payload?.editReadbackUnavailable === true) {
    if (payload?.editReadback !== "") fail("PREP_MODULE_EDIT_UNAVAILABLE_PAYLOAD_INVALID", String(payload?.editReadback ?? ""));
    if (binding.listSelectionVerified !== true) fail("PREP_MODULE_EDIT_FALLBACK_WITHOUT_LIST_EVIDENCE", binding.moduleFileName);
    return {
      mode: "native-list-selection-plus-final-title",
      editReadbackFallback: true,
      fallbackReason: "legacy_vcl_tedit_getwindowtext_unavailable",
      authoritativeEvidence: ["exact_native_module_list_binding", "exact_lb_getcursel_readback", "same_pid_exact_clean_final_title"],
    };
  }
  if (payload?.editReadbackUnavailable !== false) fail("PREP_MODULE_EDIT_READBACK_FLAG_INVALID", String(payload?.editReadbackUnavailable));
  if (String(payload?.editReadback ?? "").trim().toLowerCase() !== binding.moduleStem.toLowerCase()) {
    fail("PREP_MODULE_EDIT_READBACK_MISMATCH", String(payload?.editReadback ?? ""));
  }
  return {
    mode: "native-list-selection-edit-readback-and-final-title",
    editReadbackFallback: false,
    fallbackReason: null,
    authoritativeEvidence: ["exact_native_module_list_binding", "exact_lb_getcursel_readback", "exact_tedit_readback", "same_pid_exact_clean_final_title"],
  };
}

export function requirePrepChildSafety(payload, name) {
  const safety = payload?.safety;
  if (!safety || typeof safety !== "object" || Array.isArray(safety)) fail("PREP_ATOM_SAFETY_MISSING", name);
  for (const field of REQUIRED_CHILD_SAFETY_FIELDS) {
    if (!Object.hasOwn(safety, field)) fail("PREP_ATOM_SAFETY_FIELD_MISSING", `${name}:${field}`);
    if (safety[field] !== false) fail("PREP_ATOM_SAFETY_POLICY_MISMATCH", `${name}:${field}:${safety[field]}`);
  }
  return payload;
}

export function classifyCanonicalViewportCandidates(viewports) {
  if (!Array.isArray(viewports)) fail("PREP_VIEWPORT_CANDIDATES_INVALID", "viewports");
  const normalized = viewports.map((viewport, index) => {
    const bounds = viewport?.bounds;
    const width = Number(bounds?.width);
    const height = Number(bounds?.height);
    const hwnd = Number(viewport?.hwnd);
    if (!Number.isInteger(hwnd) || hwnd <= 0 || !Number.isFinite(width) || !Number.isFinite(height) || width < 0 || height < 0) {
      fail("PREP_VIEWPORT_CANDIDATE_INVALID", String(index));
    }
    return { hwnd, bounds: { left: Number(bounds.left ?? 0), top: Number(bounds.top ?? 0), width, height }, captureEligible: width >= 400 && height >= 300 };
  });
  const canonical = normalized.filter((viewport) => viewport.captureEligible);
  return { raw: normalized, canonical, rawCount: normalized.length, canonicalCount: canonical.length };
}

export function validatePrepOutputLayout({ prepOutDir, outputRoot, lineageParent }) {
  const prep = resolve(String(prepOutDir ?? ""));
  const output = resolve(String(outputRoot ?? ""));
  const lineage = resolve(String(lineageParent ?? ""));
  const immediateParent = dirname(prep);
  if (samePath(prep, output)) fail("PREP_OUTPUT_COLLISION", prep);
  if (!samePath(dirname(output), immediateParent)) {
    fail("PREP_OUTPUT_ROOT_PARENT_MISMATCH", `${immediateParent} != ${dirname(output)}`);
  }
  const expectedImmediateParent = resolve(lineage, "live");
  if (!samePath(immediateParent, expectedImmediateParent)) {
    fail("PREP_OUTPUT_LINEAGE_MISMATCH", `${immediateParent} != ${expectedImmediateParent}`);
  }
  requireCanonicalDirectory(lineage, "PREP_LINEAGE_PARENT");
  const immediateParentExists = pathOccupied(immediateParent);
  if (immediateParentExists) requireCanonicalDirectory(immediateParent, "PREP_OUTPUT_PARENT");
  failIfPathOccupied(prep, "PREP_OUTPUT", "PREP_OUTPUT_EXISTS");
  failIfPathOccupied(output, "PREP_TIMED_OUTPUT", "PREP_TIMED_OUTPUT_EXISTS");
  return {
    version: "aurora-model-proof-120s-prep-output-layout/v1",
    prepOutDir: prep,
    outputRoot: output,
    immediateParent,
    lineageParent: lineage,
    immediateParentExists,
  };
}

export function validatePrepContinuationLayout({ prepOutDir, outputRoot, lineageParent }) {
  const prep = resolve(String(prepOutDir ?? ""));
  const output = resolve(String(outputRoot ?? ""));
  const lineage = resolve(String(lineageParent ?? ""));
  const immediateParent = dirname(prep);
  if (samePath(prep, output)) fail("PREP_OUTPUT_COLLISION", prep);
  if (!samePath(dirname(output), immediateParent)) {
    fail("PREP_OUTPUT_ROOT_PARENT_MISMATCH", `${immediateParent} != ${dirname(output)}`);
  }
  const expectedImmediateParent = resolve(lineage, "live");
  if (!samePath(immediateParent, expectedImmediateParent)) {
    fail("PREP_OUTPUT_LINEAGE_MISMATCH", `${immediateParent} != ${expectedImmediateParent}`);
  }
  requireCanonicalDirectory(lineage, "PREP_LINEAGE_PARENT");
  requireCanonicalDirectory(immediateParent, "PREP_OUTPUT_PARENT");
  requireCanonicalDirectory(prep, "PREP_CONTINUATION_OUTPUT");
  failIfPathOccupied(output, "PREP_TIMED_OUTPUT", "PREP_TIMED_OUTPUT_EXISTS");
  return {
    version: "aurora-model-proof-120s-prep-continuation-output-layout/v1",
    prepOutDir: prep,
    outputRoot: output,
    immediateParent,
    lineageParent: lineage,
  };
}

export function validateExactInstalledMruLoadContinuation({
  failureManifest,
  failureManifestPath,
  prepPlan,
  initialState,
  prepOutDir,
  profilePath,
  profileSha256,
  profileId,
  binaryProfilePath,
  binaryProfileSha256,
  target,
  state,
  timedOutputAbsent,
}) {
  const prep = resolve(String(prepOutDir ?? ""));
  const expectedArtifactDir = resolve(prep, "cold-open");
  const manifestPath = resolve(String(failureManifestPath ?? ""));
  if (
    prepPlan?.version !== "aurora-model-proof-120s-prep-plan/v1"
    || !samePath(prepPlan?.profile?.path, profilePath)
    || prepPlan?.profile?.sha256 !== profileSha256
    || prepPlan?.profile?.id !== profileId
    || prepPlan?.decision?.route !== "cold"
    || prepPlan?.decision?.processId != null
    || prepPlan?.target?.moduleResref !== target.moduleResref
    || prepPlan?.target?.moduleName !== target.moduleName
    || !samePath(prepPlan?.target?.installedModulePath, target.installedModulePath)
    || prepPlan?.target?.areaResref !== target.areaResref
  ) {
    fail("PREP_EXACT_MRU_PROFILE_MISMATCH", JSON.stringify(prepPlan ?? null));
  }
  if (
    !Array.isArray(initialState?.nwmain)
    || initialState.nwmain.length !== 0
    || !Array.isArray(initialState?.toolsets)
    || initialState.toolsets.length !== 0
  ) {
    fail("PREP_EXACT_MRU_INITIAL_STATE_MISMATCH", JSON.stringify(initialState ?? null));
  }
  if (timedOutputAbsent !== true) {
    fail("PREP_EXACT_MRU_TIMED_OUTPUT_EXISTS", String(timedOutputAbsent));
  }
  if (
    failureManifest?.version !== "aurora-toolset-binary-native-geometry-manifest/v1"
    || failureManifest?.status !== "failed"
    || failureManifest?.blockerCode !== "BINARY_NATIVE_EXPLICIT_OPEN_OWNERSHIP_UNVERIFIED"
  ) {
    fail("PREP_EXACT_MRU_FAILURE_NOT_ADMITTED", `${failureManifest?.status}:${failureManifest?.blockerCode}`);
  }
  if (!samePath(manifestPath, resolve(expectedArtifactDir, "binary-native-geometry-manifest.json"))) {
    fail("PREP_EXACT_MRU_FAILURE_PATH_MISMATCH", manifestPath);
  }
  if (!samePath(failureManifest.artifactDir, expectedArtifactDir)) {
    fail("PREP_EXACT_MRU_ARTIFACT_DIR_MISMATCH", String(failureManifest.artifactDir));
  }
  if (
    !samePath(failureManifest.profilePath, binaryProfilePath)
    || failureManifest.profileSha256 !== binaryProfileSha256
  ) {
    fail("PREP_EXACT_MRU_BINARY_PROFILE_MISMATCH", String(failureManifest.profilePath));
  }
  if (
    failureManifest.module?.resref !== target.moduleResref
    || !samePath(failureManifest.module?.path, target.sourceModulePath)
    || failureManifest.module?.sha256 !== target.installedModuleSha256
    || failureManifest.area?.resref !== target.areaResref
  ) {
    fail("PREP_EXACT_MRU_TARGET_MISMATCH", JSON.stringify({
      module: failureManifest.module ?? null,
      area: failureManifest.area ?? null,
    }));
  }
  for (const field of ["startsNwn", "usesGlobalInput", "usesGlobalCursor", "usesGlobalKeyboard", "usesGlobalMouse", "usesGlobalMouseWheel", "savesModule", "changesIniOrMru"]) {
    if (failureManifest.safety?.[field] !== false) {
      fail("PREP_EXACT_MRU_SAFETY_INVALID", `${field}:${failureManifest.safety?.[field]}`);
    }
  }
  for (const field of ["nativeSave", "postSaveProfile", "postNativeSaveProfile", "geometryProfile", "queueResult", "areaOpen", "nativeGeometry"]) {
    if (failureManifest[field] != null) {
      fail("PREP_EXACT_MRU_MUTATION_EVIDENCE_INVALID", field);
    }
  }

  const startup = failureManifest.startupAdmission;
  const startupMru = startup?.startupMru;
  if (
    failureManifest.explicitOpenStartupAdmissionVersion !== "aurora-toolset-explicit-open-startup-admission/v3"
    || startup?.version !== "aurora-toolset-explicit-open-startup-admission/v3"
    || startup?.mode !== "passive_observation_then_explicit_open"
    || startup?.mruConflict !== true
    || startup?.startsToolsetWithoutModuleArgument !== true
    || startup?.forbidsOpenAfterLoadOwner !== true
    || startup?.forbidsIniOrMruMutation !== true
    || startup?.noLocalToolsetAdapter !== true
  ) {
    fail("PREP_EXACT_MRU_STARTUP_ADMISSION_INVALID", JSON.stringify(startup ?? null));
  }
  if (
    startupMru?.ok !== true
    || startupMru?.command !== "inspect-aurora-toolset-startup-mru-readonly"
    || !samePath(startupMru?.modulePath, target.sourceModulePath)
    || startupMru?.expectedModule !== target.moduleName
    || !samePath(startupMru?.currentMru0, target.installedModulePath)
    || startupMru?.exactTarget !== false
    || startupMru?.safety?.readOnly !== true
    || startupMru?.safety?.startsToolset !== false
    || startupMru?.safety?.startsNwn !== false
    || startupMru?.safety?.usesGlobalInput !== false
    || startupMru?.safety?.changesIniOrMru !== false
  ) {
    fail("PREP_EXACT_MRU_INSTALLED_PATH_MISMATCH", JSON.stringify(startupMru ?? null));
  }

  const openFailure = failureManifest.openFailure;
  const child = openFailure?.child;
  const moduleOpen = child?.moduleOpen;
  if (
    child?.ok !== true
    || child?.skippedAreaOpen !== true
    || child?.criticalFailureRecord != null
    || child?.accessViolation?.detected !== false
    || child?.accessViolation?.blockerCode != null
  ) {
    fail("PREP_EXACT_MRU_CHILD_STATE_INVALID", JSON.stringify(child ?? null));
  }
  if (
    child?.safety?.usesGlobalCursor !== false
    || child?.safety?.usesGlobalKeyboard !== false
    || child?.safety?.usesGlobalMouseWheel !== false
    || child?.safety?.usesGlobalDrag !== false
    || child?.iniStaging?.ok !== true
    || child?.iniStaging?.action !== "read_only"
    || child?.iniStaging?.applied !== false
    || child?.iniStaging?.recentFilesAction !== "observed_only"
    || !samePath(child?.iniStaging?.currentMru0, target.installedModulePath)
    || child?.iniStaging?.iniMutationForbidden !== true
  ) {
    fail("PREP_EXACT_MRU_CHILD_SAFETY_INVALID", JSON.stringify(child?.safety ?? null));
  }
  if (moduleOpen?.moduleLoadOwner !== "mru") {
    fail("PREP_EXACT_MRU_LOAD_OWNER_INVALID", String(moduleOpen?.moduleLoadOwner));
  }
  if (
    moduleOpen?.moduleOpenActionSubmitted !== false
    || moduleOpen?.moduleOpenActionKind != null
    || moduleOpen?.openModuleDialogHandledAt != null
    || moduleOpen?.openModuleDialogProbe != null
    || moduleOpen?.openModuleDialogResult != null
    || Number(moduleOpen?.moduleLoadedPreActionGuardCount) !== 0
  ) {
    fail("PREP_EXACT_MRU_ACTION_ALREADY_SUBMITTED", JSON.stringify({
      submitted: moduleOpen?.moduleOpenActionSubmitted,
      kind: moduleOpen?.moduleOpenActionKind,
      openModuleDialogHandledAt: moduleOpen?.openModuleDialogHandledAt,
      openModuleDialogProbe: moduleOpen?.openModuleDialogProbe,
      openModuleDialogResult: moduleOpen?.openModuleDialogResult,
      moduleLoadedPreActionGuardCount: moduleOpen?.moduleLoadedPreActionGuardCount,
    }));
  }
  if (
    moduleOpen?.startedToolset !== true
    || moduleOpen?.recoveryConfirmationHandled !== false
    || Number(moduleOpen?.recoveryConfirmationHandledCount) !== 0
    || moduleOpen?.openModuleDialogRequested !== true
    || moduleOpen?.openModuleDialogHandled !== false
    || moduleOpen?.explicitOpenEligibilityGranted !== true
    || moduleOpen?.welcomeHandled !== true
    || JSON.stringify(moduleOpen?.expectedModuleParts) !== JSON.stringify([target.moduleResref, "mod"])
    || !samePath(moduleOpen?.modulePath, target.installedModulePath)
    || moduleOpen?.moduleWindowTitle == null
    || Number(moduleOpen?.moduleWindowHwnd) <= 0
  ) {
    fail("PREP_EXACT_MRU_MODULE_BINDING_MISMATCH", JSON.stringify(moduleOpen ?? null));
  }

  const guard = child.moduleOpenSessionGuard;
  if (
    guard?.ok !== true
    || guard?.state !== "module_loaded_skip_area_open"
    || !samePath(guard?.modulePath, target.installedModulePath)
    || JSON.stringify(guard?.expectedModuleParts) !== JSON.stringify([target.moduleResref, "mod"])
    || guard?.expectedAreaResref !== target.areaResref
    || guard?.moduleOpenActionSubmitted !== false
    || guard?.moduleOpenActionKind != null
    || guard?.liveToolsetProcessCountAtAcquire !== 0
    || guard?.allowReuseOpenSession !== false
  ) {
    fail("PREP_EXACT_MRU_GUARD_BINDING_MISMATCH", JSON.stringify(guard ?? null));
  }

  const postProcesses = openFailure?.postChildProcesses;
  const postWindows = openFailure?.postChildWindows;
  const postFrames = (postWindows?.windows ?? []).filter((window) => window.className === "TfrmFrame");
  const unexpectedPostWindows = (postWindows?.windows ?? []).filter((window) => !new Set(["TfrmFrame", "TApplication"]).has(window.className));
  const processId = Number(postProcesses?.[0]?.Id);
  const frameHwnd = Number(postFrames[0]?.hwnd);
  const frameTitle = String(postFrames[0]?.text ?? postFrames[0]?.title ?? "").trim();
  if (
    !Array.isArray(postProcesses)
    || postProcesses.length !== 1
    || !Number.isInteger(processId)
    || processId <= 0
    || postProcesses[0].Responding !== true
    || postWindows?.ok !== true
    || Number(postWindows?.processId) !== processId
    || postWindows?.responding !== true
    || postFrames.length !== 1
    || unexpectedPostWindows.length !== 0
    || !Number.isInteger(frameHwnd)
    || frameHwnd <= 0
    || frameHwnd !== Number(moduleOpen.moduleWindowHwnd)
    || frameTitle !== String(moduleOpen.moduleWindowTitle).trim()
    || frameTitle.endsWith("*")
    || String(parseModuleName(frameTitle) ?? "").toLowerCase() !== target.moduleName.toLowerCase()
  ) {
    fail("PREP_EXACT_MRU_POST_FAILURE_IDENTITY_MISMATCH", JSON.stringify({ postProcesses, postWindows }));
  }
  const failedStartTimeMs = parseWindowsDateMilliseconds(postProcesses[0].StartTime);
  if (!Number.isFinite(failedStartTimeMs)) {
    fail("PREP_EXACT_MRU_PROCESS_START_INVALID", String(postProcesses[0].StartTime));
  }

  if (!Array.isArray(state?.nwmain) || !Array.isArray(state?.toolsets)) {
    fail("PREP_EXACT_MRU_STATE_INVALID", "process arrays missing");
  }
  if (state.nwmain.length !== 0) {
    fail("PREP_EXACT_MRU_NWN_PRESENT", String(state.nwmain.length));
  }
  if (state.toolsets.length !== 1) {
    fail(state.toolsets.length > 1 ? "PREP_EXACT_MRU_SECOND_TOOLSET" : "PREP_EXACT_MRU_TOOLSET_MISSING", String(state.toolsets.length));
  }
  const current = state.toolsets[0];
  if (Number(current.pid) !== processId) {
    fail("PREP_EXACT_MRU_PID_MISMATCH", `${processId}->${current.pid}`);
  }
  const currentStartTimeMs = Date.parse(String(current.startedAtUtc ?? ""));
  if (!Number.isFinite(currentStartTimeMs) || currentStartTimeMs !== failedStartTimeMs) {
    fail("PREP_EXACT_MRU_PROCESS_START_MISMATCH", `${failedStartTimeMs}->${currentStartTimeMs}`);
  }
  if (current.responding !== true) {
    fail("PREP_EXACT_MRU_TOOLSET_NOT_RESPONDING", String(processId));
  }
  const currentTitle = String(current.frame?.title ?? "").trim();
  if (current.frame?.className !== "TfrmFrame" || Number(current.frame?.hwnd) !== frameHwnd) {
    fail("PREP_EXACT_MRU_FRAME_HWND_MISMATCH", JSON.stringify(current.frame ?? null));
  }
  if (current.frame?.monitor?.primary !== false) {
    fail("PREP_EXACT_MRU_FRAME_ON_PRIMARY", JSON.stringify(current.frame?.monitor ?? null));
  }
  if (currentTitle.endsWith("*")) {
    fail("PREP_EXACT_MRU_DIRTY_FRAME", currentTitle);
  }
  if (currentTitle !== frameTitle || String(parseModuleName(currentTitle) ?? "").toLowerCase() !== target.moduleName.toLowerCase()) {
    fail("PREP_EXACT_MRU_FRAME_TITLE_MISMATCH", currentTitle);
  }
  if (!Array.isArray(current.modals) || current.modals.length !== 0) {
    fail("PREP_EXACT_MRU_UNEXPECTED_MODAL", JSON.stringify(current.modals ?? null));
  }
  if (!Array.isArray(current.areaViewers) || current.areaViewers.length !== 0) {
    fail("PREP_EXACT_MRU_AREA_ALREADY_PRESENT", JSON.stringify(current.areaViewers ?? null));
  }

  return {
    version: "aurora-model-proof-120s-exact-installed-mru-load-continuation-admission/v1",
    processId,
    startedAtUtc: new Date(failedStartTimeMs).toISOString(),
    frameHwnd,
    frameTitle,
    moduleLoadOwner: "mru",
    targetModule: target.moduleName,
    areaResref: target.areaResref,
    failureManifestPath: manifestPath,
    outputRootAbsent: true,
  };
}

export function validateFailedPrepModuleLoadedModalCloseAdmission({
  failureManifest,
  failureManifestPath,
  prepPlan,
  initialState,
  prepOutDir,
  profilePath,
  profileSha256,
  profileId,
  binaryProfilePath,
  binaryProfileSha256,
  target,
  state,
  timedOutputAbsent,
}) {
  const manifestPath = resolve(String(failureManifestPath ?? ""));
  const prep = resolve(String(prepOutDir ?? ""));
  const expectedArtifactDir = resolve(prep, "cold-open");
  if (
    prepPlan?.version !== "aurora-model-proof-120s-prep-plan/v1"
    || !samePath(prepPlan?.profile?.path, profilePath)
    || prepPlan?.profile?.sha256 !== profileSha256
    || prepPlan?.profile?.id !== profileId
    || prepPlan?.decision?.route !== "cold"
    || prepPlan?.decision?.processId != null
    || prepPlan?.target?.moduleResref !== target.moduleResref
    || prepPlan?.target?.moduleName !== target.moduleName
    || !samePath(prepPlan?.target?.installedModulePath, target.installedModulePath)
    || prepPlan?.target?.areaResref !== target.areaResref
  ) {
    fail("PREP_FAILED_CLOSE_PROFILE_MISMATCH", JSON.stringify(prepPlan ?? null));
  }
  if (
    !Array.isArray(initialState?.nwmain)
    || initialState.nwmain.length !== 0
    || !Array.isArray(initialState?.toolsets)
    || initialState.toolsets.length !== 0
  ) {
    fail("PREP_FAILED_CLOSE_INITIAL_STATE_MISMATCH", JSON.stringify(initialState ?? null));
  }
  if (timedOutputAbsent !== true) {
    fail("PREP_FAILED_CLOSE_TIMED_OUTPUT_EXISTS", String(timedOutputAbsent));
  }
  if (
    failureManifest?.version !== "aurora-toolset-binary-native-geometry-manifest/v1"
    || failureManifest?.status !== "failed"
    || failureManifest?.blockerCode !== "toolset_module_loaded_but_modal_open"
  ) {
    fail("PREP_FAILED_CLOSE_FAILURE_NOT_ADMITTED", `${failureManifest?.status}:${failureManifest?.blockerCode}`);
  }
  if (!samePath(manifestPath, resolve(expectedArtifactDir, "binary-native-geometry-manifest.json"))) {
    fail("PREP_FAILED_CLOSE_FAILURE_PATH_MISMATCH", manifestPath);
  }
  if (!samePath(failureManifest.artifactDir, expectedArtifactDir)) {
    fail("PREP_FAILED_CLOSE_ARTIFACT_DIR_MISMATCH", String(failureManifest.artifactDir));
  }
  if (
    !samePath(failureManifest.profilePath, binaryProfilePath)
    || failureManifest.profileSha256 !== binaryProfileSha256
  ) {
    fail("PREP_FAILED_CLOSE_BINARY_PROFILE_MISMATCH", String(failureManifest.profilePath));
  }
  if (
    failureManifest.module?.resref !== target.moduleResref
    || !samePath(failureManifest.module?.path, target.sourceModulePath)
    || failureManifest.module?.sha256 !== target.installedModuleSha256
    || failureManifest.area?.resref !== target.areaResref
  ) {
    fail("PREP_FAILED_CLOSE_TARGET_MISMATCH", JSON.stringify({
      module: failureManifest.module ?? null,
      area: failureManifest.area ?? null,
    }));
  }
  const startup = failureManifest.startupAdmission;
  if (
    failureManifest.explicitOpenStartupAdmissionVersion !== "aurora-toolset-explicit-open-startup-admission/v3"
    || startup?.version !== "aurora-toolset-explicit-open-startup-admission/v3"
    || startup?.startsToolsetWithoutModuleArgument !== true
    || startup?.forbidsIniOrMruMutation !== true
    || startup?.noLocalToolsetAdapter !== true
  ) {
    fail("PREP_FAILED_CLOSE_STARTUP_ADMISSION_INVALID", JSON.stringify(startup ?? null));
  }
  for (const field of ["startsNwn", "usesGlobalInput", "usesGlobalCursor", "usesGlobalKeyboard", "usesGlobalMouse", "usesGlobalMouseWheel", "savesModule", "changesIniOrMru"]) {
    if (failureManifest.safety?.[field] !== false) {
      fail("PREP_FAILED_CLOSE_SAFETY_INVALID", `${field}:${failureManifest.safety?.[field]}`);
    }
  }
  for (const field of ["nativeSave", "postSaveProfile", "postNativeSaveProfile", "geometryProfile", "queueResult", "areaOpen", "nativeGeometry"]) {
    if (failureManifest[field] != null) {
      fail("PREP_FAILED_CLOSE_MUTATION_EVIDENCE_INVALID", field);
    }
  }

  const openFailure = failureManifest.openFailure;
  const childEnvelope = openFailure?.child;
  const child = childEnvelope?.childResult;
  if (
    childEnvelope?.blockerCode !== "toolset_module_loaded_but_modal_open"
    || child?.blockerCode !== "toolset_module_loaded_but_modal_open"
  ) {
    fail("PREP_FAILED_CLOSE_CHILD_FAILURE_MISMATCH", String(childEnvelope?.blockerCode));
  }
  if (
    child?.startedToolset !== true
    || child?.recoveryConfirmationHandled !== true
    || child?.recoveryConfirmationHandledCount !== 1
    || child?.moduleOpenActionSubmitted !== true
    || child?.moduleOpenActionKind !== "verified_temp0_recovery_yes"
    || child?.moduleLoadOwner !== "verified_temp0_recovery"
    || JSON.stringify(child?.expectedModuleParts) !== JSON.stringify([target.moduleResref, "mod"])
    || !samePath(child?.modulePath, target.installedModulePath)
    || child?.openModuleDialogRequested === true
    || child?.openModuleDialogHandled === true
    || child?.criticalFailureRecord != null
  ) {
    fail("PREP_FAILED_CLOSE_CHILD_BINDING_MISMATCH", JSON.stringify(child ?? null));
  }
  const guard = child.moduleOpenSessionGuard;
  if (
    guard?.state !== "module_open_failed"
    || guard?.blockerCode !== "toolset_module_loaded_but_modal_open"
    || !samePath(guard?.modulePath, target.installedModulePath)
    || JSON.stringify(guard?.expectedModuleParts) !== JSON.stringify([target.moduleResref, "mod"])
    || guard?.moduleOpenActionSubmitted !== true
    || guard?.moduleOpenActionKind !== "verified_temp0_recovery_yes"
  ) {
    fail("PREP_FAILED_CLOSE_GUARD_BINDING_MISMATCH", JSON.stringify(guard ?? null));
  }

  const modal = child.postSelectionBlockingModal;
  const failedFrame = child.topLevelToolsetWindows;
  const failedPid = Number(failedFrame?.processId);
  const failedFrameTitle = String(failedFrame?.title ?? "").trim();
  if (
    !Number.isInteger(failedPid)
    || failedPid <= 0
    || failedFrame?.className !== "TfrmFrame"
    || failedFrame?.responding !== true
    || failedFrame?.visible !== true
    || !Number.isInteger(Number(failedFrame?.hwnd))
    || Number(failedFrame.hwnd) <= 0
    || !/^BioWare Aurora Neverwinter Nights Toolset v/iu.test(failedFrameTitle)
    || parseModuleName(failedFrameTitle) != null
    || failedFrameTitle.endsWith("*")
  ) {
    fail("PREP_FAILED_CLOSE_FAILED_FRAME_INVALID", JSON.stringify(failedFrame ?? null));
  }
  if (
    Number(modal?.processId) !== failedPid
    || !Number.isInteger(Number(modal?.hwnd))
    || Number(modal.hwnd) <= 0
    || modal?.className !== "TdlgProgress"
    || modal?.title !== "BioWare Aurora Neverwinter Nights Toolset: Loading Custom Palettes..."
    || modal?.kind !== "toolset_modal_dialog"
    || modal?.blockerCode !== "toolset_module_loaded_but_modal_open"
    || !Array.isArray(modal?.childTexts)
    || modal.childTexts.length !== 0
  ) {
    fail("PREP_FAILED_CLOSE_MODAL_IDENTITY_INVALID", JSON.stringify(modal ?? null));
  }

  const postProcesses = openFailure?.postChildProcesses;
  const postWindows = openFailure?.postChildWindows;
  const postFrames = (postWindows?.windows ?? []).filter((window) => window.className === "TfrmFrame");
  const unexpectedPostWindows = (postWindows?.windows ?? []).filter((window) => !new Set(["TfrmFrame", "TApplication"]).has(window.className));
  if (
    !Array.isArray(postProcesses)
    || postProcesses.length !== 1
    || Number(postProcesses[0].Id) !== failedPid
    || postProcesses[0].Responding !== true
    || postWindows?.ok !== true
    || Number(postWindows?.processId) !== failedPid
    || postWindows?.responding !== true
    || postFrames.length !== 1
    || unexpectedPostWindows.length !== 0
    || Number(postFrames[0].hwnd) !== Number(failedFrame.hwnd)
    || String(postFrames[0].text ?? postFrames[0].title) !== failedFrameTitle
  ) {
    fail("PREP_FAILED_CLOSE_POST_FAILURE_IDENTITY_MISMATCH", JSON.stringify({
      postProcesses,
      postWindows,
    }));
  }
  const failedStartTimeMs = parseWindowsDateMilliseconds(postProcesses[0].StartTime);
  if (!Number.isFinite(failedStartTimeMs)) {
    fail("PREP_FAILED_CLOSE_PROCESS_START_INVALID", String(postProcesses[0].StartTime));
  }

  if (!Array.isArray(state?.nwmain) || !Array.isArray(state?.toolsets)) {
    fail("PREP_FAILED_CLOSE_STATE_INVALID", "process arrays missing");
  }
  if (state.nwmain.length !== 0) {
    fail("PREP_FAILED_CLOSE_NWN_PRESENT", String(state.nwmain.length));
  }
  if (state.toolsets.length > 1) {
    fail("PREP_FAILED_CLOSE_SECOND_TOOLSET", String(state.toolsets.length));
  }
  if (state.toolsets.length !== 1) {
    fail("PREP_FAILED_CLOSE_TOOLSET_COUNT_INVALID", String(state.toolsets.length));
  }
  const current = state.toolsets[0];
  if (Number(current.pid) !== failedPid) {
    fail("PREP_FAILED_CLOSE_PID_MISMATCH", `${failedPid}->${current.pid}`);
  }
  const currentStartTimeMs = Date.parse(String(current.startedAtUtc ?? ""));
  if (!Number.isFinite(currentStartTimeMs) || currentStartTimeMs !== failedStartTimeMs) {
    fail("PREP_FAILED_CLOSE_PROCESS_START_MISMATCH", `${failedStartTimeMs}->${currentStartTimeMs}`);
  }
  if (current.responding !== true) {
    fail("PREP_FAILED_CLOSE_TOOLSET_NOT_RESPONDING", String(current.pid));
  }
  if (String(current.frame?.title ?? "").trim().endsWith("*")) {
    fail("PREP_FAILED_CLOSE_DIRTY_FRAME", String(current.frame?.title));
  }
  if (
    current.frame?.className !== "TfrmFrame"
    || current.frame?.monitor?.primary !== false
    || Number(current.frame?.hwnd) !== Number(failedFrame.hwnd)
    || String(current.frame?.title ?? "").trim() !== failedFrameTitle
  ) {
    fail("PREP_FAILED_CLOSE_FRAME_DRIFT", JSON.stringify(current.frame ?? null));
  }
  if (!Array.isArray(current.modals) || current.modals.length !== 0) {
    fail("PREP_FAILED_CLOSE_UNEXPECTED_MODAL", JSON.stringify(current.modals ?? null));
  }
  if (!Array.isArray(current.areaViewers) || current.areaViewers.length !== 0) {
    fail("PREP_FAILED_CLOSE_AREA_STATE_INVALID", JSON.stringify(current.areaViewers ?? null));
  }

  return {
    version: "aurora-model-proof-120s-failed-prep-module-loaded-modal-close-admission/v1",
    processId: failedPid,
    startedAtUtc: new Date(failedStartTimeMs).toISOString(),
    frameHwnd: Number(failedFrame.hwnd),
    frameTitle: failedFrameTitle,
    recordedModal: {
      hwnd: Number(modal.hwnd),
      processId: failedPid,
      className: modal.className,
      title: modal.title,
      childTexts: [],
    },
    currentModalState: "recorded_modal_absent",
    failureManifestPath: manifestPath,
    failureArtifactDir: expectedArtifactDir,
    targetModule: target.moduleName,
    areaResref: target.areaResref,
  };
}

export function validateFailedPrepCloseStartTimePrecisionContinuation({
  closePlan,
  closePlanIdentity,
  closeBlocker,
  closeBlockerIdentity,
  prepOutDir,
  profilePath,
  profileSha256,
  profileId,
  admission,
  failureEvidence,
}) {
  const prep = resolve(String(prepOutDir ?? ""));
  requireEvidenceIdentity(closePlanIdentity, resolve(prep, "failed-prep-close-plan.json"), "PREP_FAILED_CLOSE_PRECISION_PLAN_IDENTITY_INVALID");
  requireEvidenceIdentity(closeBlockerIdentity, resolve(prep, "failed-prep-close-blocker.json"), "PREP_FAILED_CLOSE_PRECISION_BLOCKER_IDENTITY_INVALID");
  if (
    closePlan?.version !== "aurora-model-proof-120s-failed-prep-close-plan/v1"
    || closePlan?.command !== "close-failed-prep-module-loaded-modal"
    || !samePath(closePlan?.profile?.path, profilePath)
    || closePlan?.profile?.sha256 !== profileSha256
    || closePlan?.profile?.id !== profileId
    || !samePath(closePlan?.prepOutDir, prep)
    || closePlan?.admission?.version !== admission.version
    || Number(closePlan?.admission?.processId) !== admission.processId
    || closePlan?.admission?.startedAtUtc !== admission.startedAtUtc
    || Number(closePlan?.admission?.frameHwnd) !== admission.frameHwnd
    || closePlan?.admission?.frameTitle !== admission.frameTitle
    || closePlan?.closePolicy?.gracefulFirst !== true
    || closePlan?.closePolicy?.exactPidStartTimeForceFallback !== true
    || closePlan?.closePolicy?.requiresZeroToolsetAndNwn !== true
  ) {
    fail("PREP_FAILED_CLOSE_PRECISION_PLAN_MISMATCH", JSON.stringify(closePlan ?? null));
  }
  for (const key of ["initialState", "originalPlan", "failureManifest"]) {
    if (!sameEvidenceIdentity(closePlan.failureEvidence?.[key], failureEvidence?.[key])) {
      fail("PREP_FAILED_CLOSE_PRECISION_FAILURE_EVIDENCE_MISMATCH", key);
    }
  }
  if (
    closeBlocker?.version !== "aurora-model-proof-120s-failed-prep-close-blocker/v1"
    || closeBlocker?.status !== "failed"
    || !samePath(closeBlocker?.profile?.path, profilePath)
    || closeBlocker?.profile?.sha256 !== profileSha256
    || closeBlocker?.profile?.id !== profileId
    || !samePath(closeBlocker?.prepOutDir, prep)
    || !sameEvidenceIdentity(closeBlocker?.closePlan, closePlanIdentity)
    || Number(closeBlocker?.process?.pid) !== admission.processId
    || closeBlocker?.process?.startedAtUtc !== admission.startedAtUtc
    || Number(closeBlocker?.process?.frameHwnd) !== admission.frameHwnd
    || closeBlocker?.process?.frameTitle !== admission.frameTitle
    || closeBlocker?.blockerCode !== "PREP_ATOM_JSON_INVALID"
  ) {
    fail("PREP_FAILED_CLOSE_PRECISION_BLOCKER_MISMATCH", JSON.stringify(closeBlocker ?? null));
  }
  const match = /toolset_close_start_mismatch:expected=([^;\s]+);actual=([^\s\\]+)/u.exec(String(closeBlocker.message ?? ""));
  const expectedMs = Date.parse(match?.[1] ?? "");
  const actualMs = Date.parse(match?.[2] ?? "");
  const admissionMs = Date.parse(String(admission.startedAtUtc ?? ""));
  if (
    !Number.isFinite(expectedMs)
    || !Number.isFinite(actualMs)
    || !Number.isFinite(admissionMs)
    || expectedMs !== admissionMs
    || actualMs !== admissionMs
  ) {
    fail("PREP_FAILED_CLOSE_PRECISION_BLOCKER_NOT_ADMITTED", String(closeBlocker.message ?? ""));
  }
  return {
    version: "aurora-model-proof-120s-failed-prep-close-starttime-precision-continuation/v1",
    attempt: 2,
    processId: admission.processId,
    startedAtUtc: admission.startedAtUtc,
    frameHwnd: admission.frameHwnd,
    frameTitle: admission.frameTitle,
    priorClosePlan: closePlanIdentity,
    priorCloseBlocker: closeBlockerIdentity,
  };
}

export function validateUnexpectedModuleWindowContinuation({
  failureManifest,
  failureManifestPath,
  prepPlan,
  initialState,
  prepOutDir,
  profilePath,
  profileSha256,
  profileId,
  binaryProfilePath,
  binaryProfileSha256,
  target,
  state,
}) {
  const manifestPath = resolve(String(failureManifestPath ?? ""));
  const prep = resolve(String(prepOutDir ?? ""));
  const expectedArtifactDir = resolve(prep, "cold-open");
  if (
    prepPlan?.version !== "aurora-model-proof-120s-prep-plan/v1"
    || !samePath(prepPlan?.profile?.path, profilePath)
    || prepPlan?.profile?.sha256 !== profileSha256
    || prepPlan?.profile?.id !== profileId
    || prepPlan?.decision?.route !== "cold"
    || prepPlan?.decision?.processId != null
    || prepPlan?.target?.moduleResref !== target.moduleResref
    || prepPlan?.target?.moduleName !== target.moduleName
    || !samePath(prepPlan?.target?.installedModulePath, target.installedModulePath)
    || prepPlan?.target?.areaResref !== target.areaResref
  ) {
    fail("PREP_CONTINUATION_ORIGINAL_PLAN_MISMATCH", JSON.stringify(prepPlan ?? null));
  }
  if (!Array.isArray(initialState?.nwmain) || initialState.nwmain.length !== 0 || !Array.isArray(initialState?.toolsets) || initialState.toolsets.length !== 0) {
    fail("PREP_CONTINUATION_INITIAL_STATE_MISMATCH", JSON.stringify(initialState ?? null));
  }
  if (failureManifest?.version !== "aurora-toolset-binary-native-geometry-manifest/v1") {
    fail("PREP_CONTINUATION_FAILURE_VERSION_INVALID", String(failureManifest?.version));
  }
  if (failureManifest.status !== "failed" || failureManifest.blockerCode !== "unexpected_module_window_loaded") {
    fail("PREP_CONTINUATION_FAILURE_NOT_ADMITTED", `${failureManifest.status}:${failureManifest.blockerCode}`);
  }
  if (!samePath(manifestPath, resolve(expectedArtifactDir, "binary-native-geometry-manifest.json"))) {
    fail("PREP_CONTINUATION_FAILURE_PATH_MISMATCH", manifestPath);
  }
  if (!samePath(failureManifest.artifactDir, expectedArtifactDir)) {
    fail("PREP_CONTINUATION_ARTIFACT_DIR_MISMATCH", String(failureManifest.artifactDir));
  }
  if (!samePath(failureManifest.profilePath, binaryProfilePath) || failureManifest.profileSha256 !== binaryProfileSha256) {
    fail("PREP_CONTINUATION_PROFILE_MISMATCH", String(failureManifest.profilePath));
  }
  if (
    failureManifest.module?.resref !== target.moduleResref
    || !samePath(failureManifest.module?.path, target.sourceModulePath)
    || failureManifest.module?.sha256 !== target.installedModuleSha256
  ) {
    fail("PREP_CONTINUATION_TARGET_HASH_MISMATCH", JSON.stringify(failureManifest.module ?? null));
  }
  if (failureManifest.area?.resref !== target.areaResref) {
    fail("PREP_CONTINUATION_AREA_MISMATCH", String(failureManifest.area?.resref));
  }
  const startup = failureManifest.startupAdmission;
  if (
    failureManifest.explicitOpenStartupAdmissionVersion !== "aurora-toolset-explicit-open-startup-admission/v3"
    || startup?.version !== "aurora-toolset-explicit-open-startup-admission/v3"
    || startup?.startsToolsetWithoutModuleArgument !== true
    || startup?.mruConflict !== true
    || startup?.forbidsIniOrMruMutation !== true
    || startup?.noLocalToolsetAdapter !== true
  ) {
    fail("PREP_CONTINUATION_STARTUP_ADMISSION_INVALID", JSON.stringify(startup ?? null));
  }
  for (const field of ["startsNwn", "usesGlobalInput", "usesGlobalCursor", "usesGlobalKeyboard", "usesGlobalMouse", "usesGlobalMouseWheel", "savesModule", "changesIniOrMru"]) {
    if (failureManifest.safety?.[field] !== false) fail("PREP_CONTINUATION_FAILURE_SAFETY_INVALID", `${field}:${failureManifest.safety?.[field]}`);
  }
  const openFailure = failureManifest.openFailure;
  const child = openFailure?.child?.childResult;
  if (openFailure?.child?.blockerCode !== "unexpected_module_window_loaded" || child?.blockerCode !== "unexpected_module_window_loaded") {
    fail("PREP_CONTINUATION_CHILD_FAILURE_MISMATCH", String(openFailure?.child?.blockerCode));
  }
  const externalLoadOwner = child?.moduleLoadOwner === "external";
  const explicitOpenLoadOwner = child?.moduleLoadOwner === "explicit_open";
  if (
    JSON.stringify(child?.expectedModuleParts) !== JSON.stringify([target.moduleResref, "mod"])
    || !samePath(child?.modulePath, target.installedModulePath)
    || child?.welcomeHandled !== true
    || child?.openModuleDialogRequested !== true
    || child?.explicitOpenEligibilityGranted !== true
    || (!externalLoadOwner && !explicitOpenLoadOwner)
    || (externalLoadOwner && child?.openModuleDialogHandled !== false)
    || (explicitOpenLoadOwner && child?.openModuleDialogHandled !== true)
  ) {
    fail("PREP_CONTINUATION_CHILD_BINDING_MISMATCH", JSON.stringify(child ?? null));
  }
  if (explicitOpenLoadOwner) {
    const selection = child.openModuleDialogResult;
    const selectionIndex = Number(selection?.moduleListIndex);
    const selectedIndex = Number(selection?.selected);
    const listCount = Number(selection?.listCount);
    if (
      !Number.isFinite(parseWindowsDateMilliseconds(child.moduleLoadOwnershipClaimedAt))
      || !Number.isFinite(parseWindowsDateMilliseconds(child.openModuleDialogHandledAt))
      || selection?.ok !== true
      || selection?.selectedItemText !== target.moduleResref
      || selection?.matchedBy !== "expected_module_exact_text"
      || !Number.isInteger(selectionIndex)
      || selectionIndex < 0
      || selectedIndex !== selectionIndex
      || !Number.isInteger(listCount)
      || listCount <= selectionIndex
    ) {
      fail("PREP_CONTINUATION_EXPLICIT_OPEN_SELECTION_MISMATCH", JSON.stringify(selection ?? null));
    }
  }
  const guard = child.moduleOpenSessionGuard;
  if (
    guard?.state !== "module_open_failed"
    || guard?.blockerCode !== "unexpected_module_window_loaded"
    || !samePath(guard?.modulePath, target.installedModulePath)
    || guard?.moduleOpenActionSubmitted != null
    || guard?.moduleOpenActionKind != null
  ) {
    fail("PREP_CONTINUATION_EXPLICIT_ACTION_ALREADY_SUBMITTED", JSON.stringify(guard ?? null));
  }
  const topLevelToolsetWindows = Array.isArray(child.topLevelToolsetWindows)
    ? child.topLevelToolsetWindows
    : [child.topLevelToolsetWindows].filter(Boolean);
  const failedFrames = topLevelToolsetWindows.filter((window) => window?.className === "TfrmFrame");
  if (failedFrames.length !== 1) {
    fail("PREP_CONTINUATION_FAILED_WINDOW_INVALID", JSON.stringify(topLevelToolsetWindows));
  }
  const failedWindow = failedFrames[0];
  const failedPid = Number(failedWindow?.processId);
  const failedTitle = String(child.unexpectedModuleWindowTitle ?? "").trim();
  if (
    !Number.isInteger(failedPid)
    || failedPid <= 0
    || failedWindow?.className !== "TfrmFrame"
    || failedWindow?.responding !== true
    || Number(child.unexpectedModuleWindowHwnd) !== Number(failedWindow?.hwnd)
    || failedWindow?.title !== failedTitle
  ) {
    fail("PREP_CONTINUATION_FAILED_WINDOW_INVALID", JSON.stringify(failedWindow ?? null));
  }
  const failedModule = parseModuleName(failedTitle);
  if (!failedModule || failedModule.toLowerCase() === target.moduleName.toLowerCase()) {
    fail("PREP_CONTINUATION_FAILED_WINDOW_NOT_WRONG_MODULE", failedTitle);
  }
  const postProcesses = openFailure.postChildProcesses;
  const postFrames = (openFailure.postChildWindows?.windows ?? []).filter((window) => window.className === "TfrmFrame");
  if (
    !Array.isArray(postProcesses)
    || postProcesses.length !== 1
    || Number(postProcesses[0].Id) !== failedPid
    || postProcesses[0].Responding !== true
    || Number(openFailure.postChildWindows?.processId) !== failedPid
    || openFailure.postChildWindows?.responding !== true
    || postFrames.length !== 1
    || Number(postFrames[0].hwnd) !== Number(failedWindow.hwnd)
    || String(postFrames[0].text ?? postFrames[0].title) !== failedTitle
  ) {
    fail("PREP_CONTINUATION_POST_FAILURE_IDENTITY_MISMATCH", JSON.stringify({ postProcesses, postFrames }));
  }
  if (!Array.isArray(state?.nwmain) || !Array.isArray(state?.toolsets)) fail("PREP_CONTINUATION_STATE_INVALID", "process arrays missing");
  if (state.nwmain.length !== 0) fail("PREP_CONTINUATION_NWN_PROCESS_PRESENT", String(state.nwmain.length));
  if (state.toolsets.length > 1) fail("PREP_CONTINUATION_SECOND_TOOLSET_PROCESS", String(state.toolsets.length));
  if (state.toolsets.length !== 1) fail("PREP_CONTINUATION_TOOLSET_COUNT_INVALID", String(state.toolsets.length));
  const current = state.toolsets[0];
  if (Number(current.pid) !== failedPid) fail("PREP_CONTINUATION_PID_MISMATCH", `${failedPid}->${current.pid}`);
  const failedStartTimeMs = parseWindowsDateMilliseconds(postProcesses[0].StartTime);
  const currentStartTimeMs = Date.parse(String(current.startedAtUtc ?? ""));
  if (!Number.isFinite(failedStartTimeMs) || !Number.isFinite(currentStartTimeMs) || failedStartTimeMs !== currentStartTimeMs) {
    fail("PREP_CONTINUATION_PROCESS_START_MISMATCH", `${failedStartTimeMs}->${currentStartTimeMs}`);
  }
  if (current.responding !== true) fail("PREP_CONTINUATION_TOOLSET_NOT_RESPONDING", String(current.pid));
  if (current.frame?.className !== "TfrmFrame") fail("PREP_CONTINUATION_FRAME_IDENTITY_MISSING", String(current.pid));
  if (current.frame.monitor?.primary !== false) fail("PREP_CONTINUATION_FRAME_ON_PRIMARY", JSON.stringify(current.frame.monitor ?? null));
  const currentTitle = String(current.frame.title ?? "").trim();
  if (currentTitle.endsWith("*")) fail("PREP_CONTINUATION_DIRTY_MODULE_FRAME", currentTitle);
  if (!Array.isArray(current.modals)) fail("PREP_CONTINUATION_UNEXPECTED_MODAL", JSON.stringify(current.modals ?? null));
  let welcomeResidue = null;
  if (current.modals.length !== 0) {
    if (current.modals.length !== 1 || !explicitOpenLoadOwner) {
      fail("PREP_CONTINUATION_UNEXPECTED_MODAL", JSON.stringify(current.modals));
    }
    const currentWelcome = current.modals[0];
    const topLevelWelcomes = topLevelToolsetWindows.filter((window) => window?.className === "TdlgWelcome");
    const postWelcomes = (openFailure.postChildWindows?.windows ?? []).filter((window) => window?.className === "TdlgWelcome");
    const welcomeProbe = child.welcomeProbe;
    const welcomeAction = child.welcomeActionResult;
    const immutableWelcome = topLevelWelcomes[0];
    const postWelcome = postWelcomes[0];
    const welcomeHwnd = Number(welcomeProbe?.hwnd);
    const welcomeTitle = String(welcomeProbe?.title ?? "");
    if (
      topLevelWelcomes.length !== 1
      || postWelcomes.length !== 1
      || !Number.isInteger(welcomeHwnd)
      || welcomeHwnd <= 0
      || welcomeTitle !== "BioWare Aurora Neverwinter Nights Toolset"
      || welcomeAction?.ok !== true
      || welcomeAction?.okPosted !== true
      || Number(immutableWelcome?.hwnd) !== welcomeHwnd
      || immutableWelcome?.title !== welcomeTitle
      || Number(immutableWelcome?.processId) !== failedPid
      || immutableWelcome?.visible !== true
      || immutableWelcome?.responding !== true
      || Number(postWelcome?.hwnd) !== welcomeHwnd
      || String(postWelcome?.text ?? postWelcome?.title) !== welcomeTitle
      || Number(currentWelcome?.hwnd) !== welcomeHwnd
      || currentWelcome?.className !== "TdlgWelcome"
      || currentWelcome?.title !== welcomeTitle
    ) {
      fail("PREP_CONTINUATION_WELCOME_RESIDUE_NOT_BOUND", JSON.stringify({
        currentWelcome,
        welcomeProbe,
        welcomeAction,
        topLevelWelcomes,
        postWelcomes,
      }));
    }
    welcomeResidue = {
      processId: failedPid,
      startedAtUtc: current.startedAtUtc,
      hwnd: welcomeHwnd,
      className: "TdlgWelcome",
      title: welcomeTitle,
    };
  }
  if (currentTitle !== failedTitle || Number(current.frame.hwnd) !== Number(failedWindow.hwnd)) {
    fail("PREP_CONTINUATION_CURRENT_WINDOW_DRIFT", JSON.stringify(current.frame ?? null));
  }
  const currentModule = parseModuleName(currentTitle);
  if (!currentModule || currentModule.toLowerCase() === target.moduleName.toLowerCase()) {
    fail("PREP_CONTINUATION_CURRENT_MODULE_NOT_SWITCHABLE", currentTitle);
  }
  return {
    version: "aurora-model-proof-120s-prep-unexpected-module-window-continuation-admission/v1",
    failureManifestPath: manifestPath,
    failureArtifactDir: expectedArtifactDir,
    processId: failedPid,
    startedAtUtc: current.startedAtUtc,
    frameHwnd: Number(failedWindow.hwnd),
    frameTitle: failedTitle,
    failureLoadOwner: child.moduleLoadOwner,
    welcomeResidue,
    currentModule,
    targetModule: target.moduleName,
    areaResref: target.areaResref,
  };
}

export function validateUnexpectedModuleWindowPostWelcomeDismissal({
  admission,
  dismissalResult,
  state,
}) {
  const residue = admission?.welcomeResidue;
  if (
    admission?.version !== "aurora-model-proof-120s-prep-unexpected-module-window-continuation-admission/v1"
    || !residue
    || Number(residue.processId) !== Number(admission.processId)
    || residue.startedAtUtc !== admission.startedAtUtc
    || residue.className !== "TdlgWelcome"
    || residue.title !== "BioWare Aurora Neverwinter Nights Toolset"
  ) {
    fail("PREP_CONTINUATION_WELCOME_DISMISSAL_ADMISSION_INVALID", JSON.stringify(admission ?? null));
  }
  if (
    dismissalResult?.ok !== true
    || Number(dismissalResult?.processId) !== admission.processId
    || dismissalResult?.startedAtUtc !== admission.startedAtUtc
    || Number(dismissalResult?.dialogHwnd) !== residue.hwnd
    || !Number.isInteger(Number(dismissalResult?.buttonHwnd))
    || Number(dismissalResult.buttonHwnd) <= 0
    || dismissalResult?.className !== residue.className
    || dismissalResult?.title !== residue.title
    || dismissalResult?.command !== "Cancel"
    || Number(dismissalResult?.matchingBefore) !== 1
    || Number(dismissalResult?.matchingAfter) !== 0
  ) {
    fail("PREP_CONTINUATION_WELCOME_DISMISSAL_RESULT_MISMATCH", JSON.stringify(dismissalResult ?? null));
  }
  for (const field of ["usesGlobalInput", "usesGlobalCursor", "usesGlobalKeyboard", "usesGlobalMouse", "usesGlobalMouseWheel", "savesModule", "changesIniOrMru"]) {
    if (dismissalResult.safety?.[field] !== false) {
      fail("PREP_CONTINUATION_WELCOME_DISMISSAL_RESULT_MISMATCH", `${field}:${dismissalResult.safety?.[field]}`);
    }
  }
  if (
    !Array.isArray(state?.nwmain)
    || state.nwmain.length !== 0
    || !Array.isArray(state?.toolsets)
    || state.toolsets.length !== 1
  ) {
    fail("PREP_CONTINUATION_WELCOME_DISMISSAL_POSTCONDITION_FAILED", JSON.stringify(state ?? null));
  }
  const current = state.toolsets[0];
  const currentTitle = String(current?.frame?.title ?? "").trim();
  if (
    Number(current?.pid) !== admission.processId
    || current?.startedAtUtc !== admission.startedAtUtc
    || current?.responding !== true
    || current?.frame?.className !== "TfrmFrame"
    || Number(current?.frame?.hwnd) !== admission.frameHwnd
    || currentTitle !== admission.frameTitle
    || currentTitle.endsWith("*")
    || current?.frame?.monitor?.primary !== false
    || !Array.isArray(current?.modals)
    || current.modals.length !== 0
    || parseModuleName(currentTitle)?.toLowerCase() !== admission.currentModule.toLowerCase()
  ) {
    fail("PREP_CONTINUATION_WELCOME_DISMISSAL_POSTCONDITION_FAILED", JSON.stringify(current ?? null));
  }
  return {
    version: "aurora-model-proof-120s-prep-unexpected-module-window-welcome-dismissal/v1",
    processId: admission.processId,
    startedAtUtc: admission.startedAtUtc,
    frameHwnd: admission.frameHwnd,
    frameTitle: admission.frameTitle,
    currentModule: admission.currentModule,
    welcomeDismissed: {
      hwnd: residue.hwnd,
      className: residue.className,
      title: residue.title,
      buttonHwnd: Number(dismissalResult.buttonHwnd),
    },
  };
}

export function validateUnexpectedModuleWindowPreActionResume({
  admission,
  prepOutDir,
  profilePath,
  profileSha256,
  profileId,
  target,
  expectedFailureToRecovery,
  priorPlan,
  priorPlanIdentity,
  priorBlocker,
  priorBlockerIdentity,
}) {
  const prep = resolve(String(prepOutDir ?? ""));
  const residue = admission?.welcomeResidue;
  if (
    admission?.version !== "aurora-model-proof-120s-prep-unexpected-module-window-continuation-admission/v1"
    || admission?.failureLoadOwner !== "explicit_open"
    || !residue
  ) {
    fail("PREP_CONTINUATION_PRE_ACTION_RESUME_ADMISSION_INVALID", JSON.stringify(admission ?? null));
  }
  if (
    priorPlan?.version !== "aurora-model-proof-120s-prep-continuation-plan/v1"
    || priorPlan?.command !== "continue-unexpected-module-window"
    || !Number.isFinite(Date.parse(String(priorPlan?.createdAtUtc ?? "")))
    || !samePath(priorPlan?.profile?.path, profilePath)
    || priorPlan?.profile?.sha256 !== profileSha256
    || priorPlan?.profile?.id !== profileId
    || !samePath(priorPlan?.prepOutDir, prep)
    || priorPlan?.target?.moduleResref !== target.moduleResref
    || priorPlan?.target?.moduleName !== target.moduleName
    || !samePath(priorPlan?.target?.installedModulePath, target.installedModulePath)
    || priorPlan?.target?.areaResref !== target.areaResref
  ) {
    fail("PREP_CONTINUATION_PRE_ACTION_RESUME_PLAN_MISMATCH", JSON.stringify(priorPlan ?? null));
  }
  requireEvidenceIdentity(
    priorPlanIdentity,
    resolve(prep, "continuation-plan.json"),
    "PREP_CONTINUATION_PRE_ACTION_RESUME_PLAN_IDENTITY_MISMATCH",
  );
  for (const [field, expectedPath] of [
    ["initialState", resolve(prep, "state-before.json")],
    ["originalPlan", resolve(prep, "plan.json")],
    ["failureManifest", resolve(prep, "cold-open", "binary-native-geometry-manifest.json")],
  ]) {
    requireEvidenceIdentity(
      priorPlan.failureToRecovery?.[field],
      expectedPath,
      "PREP_CONTINUATION_PRE_ACTION_RESUME_FAILURE_EVIDENCE_MISMATCH",
    );
    if (!sameEvidenceIdentity(priorPlan.failureToRecovery[field], expectedFailureToRecovery?.[field])) {
      fail("PREP_CONTINUATION_PRE_ACTION_RESUME_FAILURE_EVIDENCE_MISMATCH", field);
    }
  }
  const priorAdmission = priorPlan.admission;
  if (
    priorAdmission?.version !== admission.version
    || Number(priorAdmission?.processId) !== admission.processId
    || priorAdmission?.startedAtUtc !== admission.startedAtUtc
    || Number(priorAdmission?.frameHwnd) !== admission.frameHwnd
    || priorAdmission?.frameTitle !== admission.frameTitle
    || priorAdmission?.currentModule !== admission.currentModule
    || priorAdmission?.targetModule !== admission.targetModule
    || priorAdmission?.areaResref !== admission.areaResref
    || JSON.stringify(priorAdmission?.welcomeResidue) !== JSON.stringify(residue)
  ) {
    fail("PREP_CONTINUATION_PRE_ACTION_RESUME_PLAN_MISMATCH", JSON.stringify(priorAdmission ?? null));
  }
  const priorState = priorPlan.currentState;
  if (
    !Array.isArray(priorState?.nwmain)
    || priorState.nwmain.length !== 0
    || !Array.isArray(priorState?.toolsets)
    || priorState.toolsets.length !== 1
    || Number(priorState.toolsets[0]?.pid) !== admission.processId
    || priorState.toolsets[0]?.startedAtUtc !== admission.startedAtUtc
    || Number(priorState.toolsets[0]?.frame?.hwnd) !== admission.frameHwnd
    || priorState.toolsets[0]?.frame?.title !== admission.frameTitle
    || !Array.isArray(priorState.toolsets[0]?.modals)
    || priorState.toolsets[0].modals.length !== 1
    || Number(priorState.toolsets[0].modals[0]?.hwnd) !== residue.hwnd
    || priorState.toolsets[0].modals[0]?.className !== residue.className
    || priorState.toolsets[0].modals[0]?.title !== residue.title
  ) {
    fail("PREP_CONTINUATION_PRE_ACTION_RESUME_PLAN_MISMATCH", JSON.stringify(priorState ?? null));
  }
  for (const safetyRecord of [priorPlan.safety, priorBlocker?.safety]) {
    for (const field of ["startsToolset", "startsNwn", "usesGlobalInput", "savesModule", "buildsModule", "changesIniOrMru", "changesCamera"]) {
      if (safetyRecord?.[field] !== false) {
        fail("PREP_CONTINUATION_PRE_ACTION_RESUME_ACTION_EVIDENCE_PRESENT", `${field}:${safetyRecord?.[field]}`);
      }
    }
  }
  const blockerMessage = String(priorBlocker?.message ?? "");
  if (
    priorBlocker?.version !== "aurora-model-proof-120s-prep-continuation-blocker/v1"
    || priorBlocker?.status !== "failed"
    || !Number.isFinite(Date.parse(String(priorBlocker?.createdAtUtc ?? "")))
    || Date.parse(priorBlocker.createdAtUtc) < Date.parse(priorPlan.createdAtUtc)
    || !samePath(priorBlocker?.profile?.path, profilePath)
    || priorBlocker?.profile?.sha256 !== profileSha256
    || priorBlocker?.profile?.id !== profileId
    || !samePath(priorBlocker?.prepOutDir, prep)
    || Number(priorBlocker?.processId) !== admission.processId
    || priorBlocker?.blockerCode !== "PREP_ATOM_JSON_INVALID"
    || !blockerMessage.includes("close-aurora-toolset-dialog-no-global-input.mjs:")
    || !blockerMessage.includes("ParserError")
    || !blockerMessage.includes("InvalidVariableReferenceWithDrive")
  ) {
    fail("PREP_CONTINUATION_PRE_ACTION_RESUME_BLOCKER_MISMATCH", JSON.stringify(priorBlocker ?? null));
  }
  requireEvidenceIdentity(
    priorBlockerIdentity,
    resolve(prep, "continuation-blocker.json"),
    "PREP_CONTINUATION_PRE_ACTION_RESUME_BLOCKER_IDENTITY_MISMATCH",
  );
  if (
    !sameEvidenceIdentity(priorBlocker.continuationPlan, priorPlanIdentity)
    || !sameEvidenceIdentity(priorBlocker.failureToRecovery?.initialState, expectedFailureToRecovery.initialState)
    || !sameEvidenceIdentity(priorBlocker.failureToRecovery?.originalPlan, expectedFailureToRecovery.originalPlan)
    || !sameEvidenceIdentity(priorBlocker.failureToRecovery?.failureManifest, expectedFailureToRecovery.failureManifest)
  ) {
    fail("PREP_CONTINUATION_PRE_ACTION_RESUME_BLOCKER_MISMATCH", JSON.stringify(priorBlocker ?? null));
  }
  return {
    version: "aurora-model-proof-120s-prep-unexpected-module-window-pre-action-resume/v1",
    attempt: "pre-action-resume",
    actionPreviouslySubmitted: false,
    priorContinuationPlan: priorPlanIdentity,
    priorContinuationBlocker: priorBlockerIdentity,
    priorFailureToRecovery: expectedFailureToRecovery,
  };
}

export function validateVerifiedTemp0RecoveryContinuation({
  failureManifest,
  failureManifestPath,
  prepPlan,
  initialState,
  prepOutDir,
  profilePath,
  profileSha256,
  profileId,
  binaryProfilePath,
  binaryProfileSha256,
  target,
  state,
  clientClickFallback = false,
}) {
  const manifestPath = resolve(String(failureManifestPath ?? ""));
  const prep = resolve(String(prepOutDir ?? ""));
  const expectedArtifactDir = resolve(prep, "cold-open");
  if (
    prepPlan?.version !== "aurora-model-proof-120s-prep-plan/v1"
    || !samePath(prepPlan?.profile?.path, profilePath)
    || !/^[a-f0-9]{64}$/u.test(String(prepPlan?.profile?.sha256 ?? ""))
    || prepPlan?.profile?.id !== profileId
    || prepPlan?.decision?.route !== "cold"
    || prepPlan?.decision?.processId != null
    || prepPlan?.target?.moduleResref !== target.moduleResref
    || prepPlan?.target?.moduleName !== target.moduleName
    || !samePath(prepPlan?.target?.installedModulePath, target.installedModulePath)
    || prepPlan?.target?.areaResref !== target.areaResref
  ) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_ORIGINAL_PLAN_MISMATCH", JSON.stringify(prepPlan ?? null));
  }
  if (!Array.isArray(initialState?.nwmain) || initialState.nwmain.length !== 0 || !Array.isArray(initialState?.toolsets) || initialState.toolsets.length !== 0) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_INITIAL_STATE_MISMATCH", JSON.stringify(initialState ?? null));
  }
  if (failureManifest?.version !== "aurora-toolset-binary-native-geometry-manifest/v1") {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_FAILURE_VERSION_INVALID", String(failureManifest?.version));
  }
  const exactPriorResumeFailure =
    failureManifest?.blockerCode === "verified_temp0_recovery_admission_invalid"
    && failureManifest?.resumeFailure?.child?.blockerCode === "verified_temp0_recovery_admission_invalid"
    && failureManifest?.resumeFailure?.child?.childResult?.message === "verified_temp0_recovery_owner_manifest_mismatch"
    && Array.isArray(failureManifest?.resumeFailure?.postChildProcesses)
    && failureManifest.resumeFailure.postChildProcesses.length === 1
    && failureManifest.resumeFailure.postChildProcesses[0]?.Responding === true;
  const exactClientClickFallbackFailure =
    failureManifest?.blockerCode === "toolset_verified_temp0_recovery_prompt_did_not_close"
    && failureManifest?.resumeFailure?.child?.blockerCode === "toolset_verified_temp0_recovery_prompt_did_not_close"
    && failureManifest?.resumeFailure?.child?.childScript === "open-last-city-module-and-area-toolset-no-global-input.mjs"
    && failureManifest?.resumeFailure?.child?.childExitCode === 2
    && failureManifest?.resumeFailure?.child?.childResult?.blockerCode === "toolset_verified_temp0_recovery_prompt_did_not_close"
    && failureManifest?.resumeFailure?.child?.childResult?.recoveryConfirmationHandledCount === 1
    && Array.isArray(failureManifest?.resumeFailure?.postChildProcesses)
    && failureManifest.resumeFailure.postChildProcesses.length === 1
    && failureManifest.resumeFailure.postChildProcesses[0]?.Responding === true;
  if (
    failureManifest.status !== "failed"
    || (failureManifest.blockerCode !== "binary_native_child_process_failed" && !exactPriorResumeFailure && !exactClientClickFallbackFailure)
    || (clientClickFallback && (!exactClientClickFallbackFailure || failureManifest.verifiedTemp0RecoveryClientClickFallback != null))
    || (!clientClickFallback && exactClientClickFallbackFailure)
  ) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_FAILURE_NOT_ADMITTED", `${failureManifest.status}:${failureManifest.blockerCode}`);
  }
  if (!samePath(manifestPath, resolve(expectedArtifactDir, "binary-native-geometry-manifest.json"))) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_FAILURE_PATH_MISMATCH", manifestPath);
  }
  if (!samePath(failureManifest.artifactDir, expectedArtifactDir)) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_ARTIFACT_DIR_MISMATCH", String(failureManifest.artifactDir));
  }
  if (
    !samePath(failureManifest.profilePath, binaryProfilePath)
    || failureManifest.profileSha256 !== binaryProfileSha256
  ) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_BINARY_PROFILE_MISMATCH", String(failureManifest.profilePath));
  }
  if (
    failureManifest.module?.resref !== target.moduleResref
    || !samePath(failureManifest.module?.path, target.sourceModulePath)
    || failureManifest.module?.sha256 !== target.installedModuleSha256
  ) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_TARGET_HASH_MISMATCH", JSON.stringify(failureManifest.module ?? null));
  }
  const cacheAdmission = failureManifest.verifiedTemp0RecoveryAdmission;
  if (
    cacheAdmission?.version !== "aurora-toolset-verified-temp0-recovery-admission/v1"
    || !samePath(cacheAdmission?.module?.path, target.installedModulePath)
    || cacheAdmission?.module?.sha256 !== target.installedModuleSha256
    || !Number.isInteger(cacheAdmission?.module?.byteLength)
    || cacheAdmission.module.byteLength <= 0
    || !Number.isInteger(cacheAdmission?.temp0?.resourceCount)
    || cacheAdmission.temp0.resourceCount <= 0
    || !Array.isArray(cacheAdmission.resources)
    || cacheAdmission.resources.length !== cacheAdmission.temp0.resourceCount
    || !/^[a-f0-9]{64}$/u.test(String(cacheAdmission.cacheIdentitySha256 ?? ""))
  ) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_CACHE_ADMISSION_MISMATCH", JSON.stringify(cacheAdmission ?? null));
  }
  const failurePacket = exactClientClickFallbackFailure ? failureManifest.resumeFailure : failureManifest.openFailure;
  const child = failurePacket?.child;
  const childArgs = Array.isArray(child?.childArgs) ? child.childArgs : [];
  if (
    (!clientClickFallback && child?.blockerCode !== "binary_native_child_process_failed")
    || (clientClickFallback && child?.blockerCode !== "toolset_verified_temp0_recovery_prompt_did_not_close")
    || child?.childScript !== "open-last-city-module-and-area-toolset-no-global-input.mjs"
    || child?.childExitCode !== (clientClickFallback ? 2 : 1)
    || (!clientClickFallback && child?.childResult != null)
    || (clientClickFallback && child?.childResult?.blockerCode !== "toolset_verified_temp0_recovery_prompt_did_not_close")
    || !samePath(argumentValue(childArgs, "--modulePath"), target.installedModulePath)
    || argumentValue(childArgs, "--expectedModuleParts") !== `${target.moduleResref}|mod`
    || !samePath(argumentValue(childArgs, "--verifiedTemp0RecoveryAdmission"), manifestPath)
  ) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_CHILD_FAILURE_MISMATCH", JSON.stringify(child ?? null));
  }
  const postProcesses = failurePacket?.postChildProcesses;
  if (!Array.isArray(postProcesses) || postProcesses.length !== 1 || postProcesses[0].Responding !== true) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_FAILED_PROCESS_MISMATCH", JSON.stringify(postProcesses ?? null));
  }
  const failedPid = Number(postProcesses[0].Id);
  if (!Number.isInteger(failedPid) || failedPid <= 0) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_FAILED_PID_INVALID", String(postProcesses[0]?.Id));
  }
  const postWindows = failurePacket?.postChildWindows;
  const windows = postWindows?.windows;
  const failedFrames = Array.isArray(windows) ? windows.filter((window) => window.className === "TfrmFrame") : [];
  const failedModals = Array.isArray(windows) ? windows.filter((window) => window.className === "#32770" && window.text === "Confirmation") : [];
  const failedApplications = Array.isArray(windows) ? windows.filter((window) => window.className === "TApplication") : [];
  if (
    postWindows?.ok !== true
    || Number(postWindows?.processId) !== failedPid
    || postWindows?.responding !== true
    || !Array.isArray(windows)
    || windows.length !== 3
    || failedFrames.length !== 1
    || failedModals.length !== 1
    || failedApplications.length !== 1
  ) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_FAILED_WINDOW_SET_MISMATCH", JSON.stringify(postWindows ?? null));
  }
  if (!Array.isArray(state?.nwmain) || state.nwmain.length !== 0 || !Array.isArray(state?.toolsets)) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_STATE_SCHEMA_INVALID", JSON.stringify(state ?? null));
  }
  if (state.toolsets.length !== 1) fail("PREP_VERIFIED_TEMP0_RECOVERY_TOOLSET_COUNT_INVALID", String(state.toolsets.length));
  const current = state.toolsets[0];
  if (Number(current.pid) !== failedPid) fail("PREP_VERIFIED_TEMP0_RECOVERY_PID_MISMATCH", `${failedPid}->${current.pid}`);
  const failedStartTimeMs = parseWindowsDateMilliseconds(postProcesses[0].StartTime);
  const currentStartTimeMs = Date.parse(String(current.startedAtUtc ?? ""));
  if (!Number.isFinite(failedStartTimeMs) || !Number.isFinite(currentStartTimeMs) || failedStartTimeMs !== currentStartTimeMs) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_PROCESS_START_MISMATCH", `${failedStartTimeMs}->${currentStartTimeMs}`);
  }
  if (current.responding !== true) fail("PREP_VERIFIED_TEMP0_RECOVERY_TOOLSET_NOT_RESPONDING", String(current.pid));
  if (current.frame?.className !== "TfrmFrame") fail("PREP_VERIFIED_TEMP0_RECOVERY_FRAME_IDENTITY_MISSING", String(current.pid));
  if (current.frame.monitor?.primary !== false) fail("PREP_VERIFIED_TEMP0_RECOVERY_FRAME_ON_PRIMARY", JSON.stringify(current.frame.monitor ?? null));
  const currentTitle = String(current.frame.title ?? "").trim();
  if (currentTitle.endsWith("*")) fail("PREP_VERIFIED_TEMP0_RECOVERY_DIRTY_FRAME", currentTitle);
  if (parseModuleName(currentTitle)) fail("PREP_VERIFIED_TEMP0_RECOVERY_MODULE_ALREADY_BOUND", currentTitle);
  if (
    Number(current.frame.hwnd) !== Number(failedFrames[0].hwnd)
    || currentTitle !== String(failedFrames[0].text ?? "").trim()
  ) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_CURRENT_FRAME_DRIFT", JSON.stringify(current.frame ?? null));
  }
  if (!Array.isArray(current.modals) || current.modals.length !== 1) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_UNEXPECTED_MODAL", JSON.stringify(current.modals ?? null));
  }
  const modal = current.modals[0];
  if (
    modal.className !== "#32770"
    || modal.title !== "Confirmation"
    || Number(modal.hwnd) !== Number(failedModals[0].hwnd)
  ) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_UNEXPECTED_MODAL", JSON.stringify(modal ?? null));
  }
  return {
    version: clientClickFallback ? "aurora-model-proof-120s-prep-verified-temp0-recovery-client-click-continuation-admission/v1" : "aurora-model-proof-120s-prep-verified-temp0-recovery-continuation-admission/v1",
    failureManifestPath: manifestPath,
    failureArtifactDir: expectedArtifactDir,
    processId: failedPid,
    startedAtUtc: current.startedAtUtc,
    frameHwnd: Number(current.frame.hwnd),
    modalHwnd: Number(modal.hwnd),
    targetModule: target.moduleName,
    areaResref: target.areaResref,
    cacheIdentitySha256: cacheAdmission.cacheIdentitySha256,
    originalModelProofProfileSha256: prepPlan.profile.sha256,
    currentModelProofProfileSha256: profileSha256,
    clientClickFallback,
  };
}

export function validateVerifiedTemp0RecoveryRetryEvidence({
  priorPlan,
  priorPlanIdentity,
  priorBlocker,
  priorBlockerIdentity,
  prepOutDir,
  profilePath,
  profileId,
  target,
  admission,
}) {
  const prep = resolve(String(prepOutDir ?? ""));
  if (
    priorPlan?.version !== "aurora-model-proof-120s-prep-verified-temp0-recovery-continuation-plan/v1"
    || priorPlan?.command !== "continue-verified-temp0-recovery"
    || (priorPlan?.attempt != null && priorPlan.attempt !== 1)
    || !samePath(priorPlan?.profile?.path, profilePath)
    || !/^[a-f0-9]{64}$/u.test(String(priorPlan?.profile?.sha256 ?? ""))
    || priorPlan?.profile?.id !== profileId
    || !samePath(priorPlan?.prepOutDir, prep)
    || priorPlan?.target?.moduleResref !== target.moduleResref
    || priorPlan?.target?.moduleName !== target.moduleName
    || !samePath(priorPlan?.target?.installedModulePath, target.installedModulePath)
    || priorPlan?.target?.areaResref !== target.areaResref
  ) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_PRIOR_PLAN_MISMATCH", JSON.stringify(priorPlan ?? null));
  }
  requireEvidenceIdentity(
    priorPlanIdentity,
    resolve(prep, "continuation-plan.json"),
    "PREP_VERIFIED_TEMP0_RECOVERY_PRIOR_PLAN_IDENTITY_MISMATCH",
  );
  const priorEvidence = priorPlan.failureToRecovery;
  requireEvidenceIdentity(
    priorEvidence?.initialState,
    resolve(prep, "state-before.json"),
    "PREP_VERIFIED_TEMP0_RECOVERY_PRIOR_INITIAL_STATE_IDENTITY_MISMATCH",
  );
  requireEvidenceIdentity(
    priorEvidence?.originalPlan,
    resolve(prep, "plan.json"),
    "PREP_VERIFIED_TEMP0_RECOVERY_PRIOR_ORIGINAL_PLAN_IDENTITY_MISMATCH",
  );
  requireEvidenceIdentity(
    priorEvidence?.failureManifest,
    resolve(prep, "cold-open", "binary-native-geometry-manifest.json"),
    "PREP_VERIFIED_TEMP0_RECOVERY_PRIOR_FAILURE_IDENTITY_MISMATCH",
  );
  if (
    priorPlan?.admission?.version !== admission.version
    || Number(priorPlan?.admission?.processId) !== admission.processId
    || priorPlan?.admission?.startedAtUtc !== admission.startedAtUtc
    || Number(priorPlan?.admission?.frameHwnd) !== admission.frameHwnd
    || Number(priorPlan?.admission?.modalHwnd) !== admission.modalHwnd
    || priorPlan?.admission?.targetModule !== admission.targetModule
    || priorPlan?.admission?.areaResref !== admission.areaResref
    || priorPlan?.admission?.cacheIdentitySha256 !== admission.cacheIdentitySha256
    || priorPlan?.admission?.originalModelProofProfileSha256 !== admission.originalModelProofProfileSha256
    || priorPlan?.admission?.currentModelProofProfileSha256 !== priorPlan.profile.sha256
  ) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_PRIOR_ADMISSION_MISMATCH", JSON.stringify(priorPlan?.admission ?? null));
  }
  if (
    Number(priorPlan?.currentState?.toolsets?.[0]?.pid) !== admission.processId
    || Number(priorPlan?.currentState?.toolsets?.[0]?.frame?.hwnd) !== admission.frameHwnd
    || Number(priorPlan?.currentState?.toolsets?.[0]?.modals?.[0]?.hwnd) !== admission.modalHwnd
    || priorPlan?.currentState?.toolsets?.[0]?.modals?.[0]?.title !== "Confirmation"
    || !Array.isArray(priorPlan?.currentState?.nwmain)
    || priorPlan.currentState.nwmain.length !== 0
  ) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_PRIOR_STATE_MISMATCH", JSON.stringify(priorPlan?.currentState ?? null));
  }
  if (
    priorBlocker?.version !== "aurora-model-proof-120s-prep-verified-temp0-recovery-continuation-blocker/v1"
    || priorBlocker?.status !== "failed"
    || !samePath(priorBlocker?.profile?.path, priorPlan.profile.path)
    || priorBlocker?.profile?.sha256 !== priorPlan.profile.sha256
    || priorBlocker?.profile?.id !== priorPlan.profile.id
    || !samePath(priorBlocker?.prepOutDir, prep)
    || Number(priorBlocker?.processId) !== admission.processId
    || !sameEvidenceIdentity(priorBlocker?.failureToRecovery?.initialState, priorEvidence.initialState)
    || !sameEvidenceIdentity(priorBlocker?.failureToRecovery?.originalPlan, priorEvidence.originalPlan)
    || !sameEvidenceIdentity(priorBlocker?.failureToRecovery?.failureManifest, priorEvidence.failureManifest)
    || priorBlocker?.blockerCode !== "verified_temp0_recovery_admission_invalid"
    || !String(priorBlocker?.message ?? "").includes("aurora-toolset-binary-module-native-geometry.mjs")
    || !String(priorBlocker?.message ?? "").includes("verified_temp0_recovery_owner_manifest_mismatch")
  ) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_PRIOR_BLOCKER_MISMATCH", JSON.stringify(priorBlocker ?? null));
  }
  requireEvidenceIdentity(
    priorBlockerIdentity,
    resolve(prep, "continuation-blocker.json"),
    "PREP_VERIFIED_TEMP0_RECOVERY_PRIOR_BLOCKER_IDENTITY_MISMATCH",
  );
  if (!sameEvidenceIdentity(priorBlocker.continuationPlan, priorPlanIdentity)) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_PRIOR_PLAN_BINDING_MISMATCH", JSON.stringify(priorBlocker.continuationPlan ?? null));
  }
  return {
    attempt: 2,
    priorContinuationPlan: priorPlanIdentity,
    priorContinuationBlocker: priorBlockerIdentity,
    priorFailureToRecovery: priorEvidence,
  };
}

export function classifyExactOpenDialogState(state, expectedPid) {
  if (!Array.isArray(state?.nwmain) || !Array.isArray(state?.toolsets)) fail("PREP_STATE_SCHEMA_INVALID", "process arrays missing");
  if (state.nwmain.length !== 0 || state.toolsets.length !== 1 || Number(state.toolsets[0].pid) !== Number(expectedPid)) {
    fail("PREP_SWITCH_PROCESS_DRIFT", JSON.stringify(state));
  }
  const modals = state.toolsets[0].modals;
  if (!Array.isArray(modals)) fail("PREP_SWITCH_MODAL_STATE_INVALID", String(expectedPid));
  const dialogs = modals.filter((value) => value.className === "TdlgModuleSelect" && value.title === "Open");
  if (dialogs.length > 1) fail("PREP_OPEN_DIALOG_AMBIGUOUS", String(dialogs.length));
  if (dialogs.length === 1 && modals.length === 1) return { status: "ready", dialog: dialogs[0] };
  if (modals.length > 0) fail("PREP_SWITCH_UNEXPECTED_MODAL", JSON.stringify(modals));
  return { status: "pending", dialog: null };
}

export function createPrepOutputDirectories(layout, hooks = {}) {
  const checked = validatePrepOutputLayout(layout);
  const ownership = {
    version: "aurora-model-proof-120s-prep-output-ownership/v2",
    prepOutDir: checked.prepOutDir,
    immediateParent: checked.immediateParent,
    createdPrepOutDir: false,
    createdImmediateParent: false,
    prepOutDirIdentity: null,
    immediateParentIdentity: null,
  };
  try {
    if (!checked.immediateParentExists) {
      hooks.beforeCreateImmediateParent?.();
      createDirectoryNoClobber(checked.immediateParent, "PREP_OUTPUT_PARENT_RACE");
      ownership.createdImmediateParent = true;
      requireCanonicalDirectory(checked.immediateParent, "PREP_OUTPUT_PARENT");
      ownership.immediateParentIdentity = directoryIdentity(checked.immediateParent, "PREP_OUTPUT_PARENT");
    }
    if (pathOccupied(checked.outputRoot)) fail("PREP_TIMED_OUTPUT_RACE", checked.outputRoot);
    if (pathOccupied(checked.prepOutDir)) fail("PREP_OUTPUT_RACE", checked.prepOutDir);
    hooks.beforeCreatePrepDir?.();
    createDirectoryNoClobber(checked.prepOutDir, "PREP_OUTPUT_RACE");
    ownership.createdPrepOutDir = true;
    requireCanonicalDirectory(checked.prepOutDir, "PREP_OUTPUT");
    ownership.prepOutDirIdentity = directoryIdentity(checked.prepOutDir, "PREP_OUTPUT");
    hooks.afterCreatePrepDir?.();
    if (pathOccupied(checked.outputRoot)) fail("PREP_TIMED_OUTPUT_RACE", checked.outputRoot);
    return ownership;
  } catch (error) {
    cleanupOwnedEmptyPrepDirectories(ownership);
    throw error;
  }
}

export function cleanupOwnedEmptyPrepDirectories(ownership) {
  const removed = [];
  if (ownership?.createdPrepOutDir === true && removeOwnedEmptyDirectory(ownership.prepOutDir, ownership.prepOutDirIdentity)) removed.push(ownership.prepOutDir);
  if (ownership?.createdImmediateParent === true && removeOwnedEmptyDirectory(ownership.immediateParent, ownership.immediateParentIdentity)) removed.push(ownership.immediateParent);
  return { removed };
}

function createDirectoryNoClobber(path, raceCode) {
  try {
    mkdirSync(path, { recursive: false });
  } catch (error) {
    if (error?.code === "EEXIST") fail(raceCode, path);
    throw error;
  }
}

function requireCanonicalDirectory(path, codePrefix) {
  if (!pathOccupied(path)) fail(`${codePrefix}_MISSING`, path);
  const entry = lstatSync(path);
  if (entry.isSymbolicLink()) fail(`${codePrefix}_REPARSE_POINT`, path);
  if (!entry.isDirectory() || !statSync(path).isDirectory()) fail(`${codePrefix}_NOT_DIRECTORY`, path);
  const canonical = realpathSync.native(path);
  if (!samePath(canonical, path)) fail(`${codePrefix}_NOT_CANONICAL`, `${path} != ${canonical}`);
}

function directoryIdentity(path, codePrefix) {
  const entry = lstatSync(path, { bigint: true });
  if (entry.isSymbolicLink()) fail(`${codePrefix}_REPARSE_POINT`, path);
  if (!entry.isDirectory()) fail(`${codePrefix}_NOT_DIRECTORY`, path);
  return { volumeId: entry.dev.toString(), fileId: entry.ino.toString() };
}

function removeOwnedEmptyDirectory(path, expectedIdentity) {
  if (!path || !pathOccupied(path)) return false;
  const entry = lstatSync(path, { bigint: true });
  const actualIdentity = { volumeId: entry.dev.toString(), fileId: entry.ino.toString() };
  if (
    entry.isSymbolicLink()
    || !entry.isDirectory()
    || expectedIdentity?.volumeId !== actualIdentity.volumeId
    || expectedIdentity?.fileId !== actualIdentity.fileId
  ) {
    fail("PREP_CLEANUP_IDENTITY_MISMATCH", path);
  }
  if (readdirSync(path).length !== 0) return false;
  try {
    rmdirSync(path);
    return true;
  } catch (error) {
    if (new Set(["ENOTEMPTY", "EEXIST", "ENOENT"]).has(error?.code)) return false;
    throw error;
  }
}

function failIfPathOccupied(path, codePrefix, occupiedCode) {
  if (!pathOccupied(path)) return;
  const entry = lstatSync(path);
  if (entry.isSymbolicLink()) fail(`${codePrefix}_REPARSE_POINT`, path);
  fail(occupiedCode, path);
}

function pathOccupied(path) {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function samePath(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || !left || !right) return false;
  return resolve(left).replace(/[\\/]+$/u, "").toLowerCase() === resolve(right).replace(/[\\/]+$/u, "").toLowerCase();
}

function requireEvidenceIdentity(value, expectedPath, code) {
  if (
    !samePath(value?.path, expectedPath)
    || !/^[a-f0-9]{64}$/u.test(String(value?.sha256 ?? ""))
    || !Number.isInteger(value?.byteLength)
    || value.byteLength <= 0
  ) {
    fail(code, JSON.stringify(value ?? null));
  }
}

function sameEvidenceIdentity(left, right) {
  return (
    samePath(left?.path, right?.path)
    && left?.sha256 === right?.sha256
    && left?.byteLength === right?.byteLength
  );
}

function parseModuleName(title) {
  const match = / - ([^\\/:*?"<>|]+\.mod)$/iu.exec(String(title ?? "").trim());
  return match?.[1] ?? null;
}

function parseWindowsDateMilliseconds(value) {
  const match = /^\/Date\((\d+)\)\/$/u.exec(String(value ?? ""));
  return match ? Number(match[1]) : Number.NaN;
}

function argumentValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function fail(code, message) {
  const error = new Error(String(message));
  error.code = code;
  throw error;
}
