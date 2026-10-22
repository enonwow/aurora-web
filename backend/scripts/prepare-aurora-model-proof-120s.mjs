#!/usr/bin/env node
/*
 * Untimed preparation for aurora-model-proof-120s.
 *
 * This public wrapper owns only the exact clean Toolset/module/Area handoff.
 * The 120-second coordinator is invoked separately after this command returns
 * proof-ready. Every UI transition is delegated to a verified central atom.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateModelProofProfile } from "./lib/aurora-model-proof-120s-contract.mjs";
import { loadRouteManifestWithSupersession } from "./lib/aurora-model-proof-120s-route-manifest-supersession.mjs";
import { runEntryReopenCommand } from "./lib/aurora-binary-entry-reopen-public.mjs";
import {
  bindExactNativeModuleList,
  classifyExactOpenDialogState,
  classifyCanonicalViewportCandidates,
  cleanupOwnedEmptyPrepDirectories,
  createPrepOutputDirectories,
  requireExactModuleListSelectionReadback,
  requireExactModuleOpenReadback,
  requirePrepChildSafety,
  validateFailedPrepCloseStartTimePrecisionContinuation,
  validateFailedPrepModuleLoadedModalCloseAdmission,
  validateExactInstalledMruLoadContinuation,
  validatePrepContinuationLayout,
  validatePrepOutputLayout,
  validateUnexpectedModuleWindowPreActionResume,
  validateUnexpectedModuleWindowPostWelcomeDismissal,
  validateUnexpectedModuleWindowContinuation,
  validateVerifiedTemp0RecoveryContinuation,
  validateVerifiedTemp0RecoveryRetryEvidence,
} from "./lib/aurora-model-proof-120s-prep-contract.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const [command, ...argv] = process.argv.slice(2);
const options = parseArgs(argv);
let profilePath = null;
let prepOutDir = null;

try {
  if (command?.startsWith("entry-reopen")) {
    print(runEntryReopenCommand(command, argv, {
      inspect: inspectHostState,
      prepare: (entry) => {
        const context = { ...entry, profile: entry.prepProfile,
          outputLayout: validatePrepOutputLayout({ prepOutDir: entry.prepOutDir,
            outputRoot: entry.prepProfile.outputRoot, lineageParent: entry.rootDir }) };
        verifyImmutableInputs(context);
        const state = inspectHostState();
        const decision = decidePrepRoute(context, state);
        if (decision.route !== "cold") fail("REOPEN_PROCESS_PRESENT", "Reopen requires zero Toolset/NWN; no switch or adopt.");
        return prepare(context, state, decision);
      },
      producerEntryPath: fileURLToPath(import.meta.url),
    }));
  } else {
  const continuationDryRun = command === "continue-unexpected-module-window-dry-run";
  const continuationLive = command === "continue-unexpected-module-window";
  const continuationPreActionResumeDryRun = command === "continue-unexpected-module-window-pre-action-resume-dry-run";
  const continuationPreActionResumeLive = command === "continue-unexpected-module-window-pre-action-resume";
  const verifiedRecoveryContinuationDryRun = command === "continue-verified-temp0-recovery-dry-run";
  const verifiedRecoveryContinuationLive = command === "continue-verified-temp0-recovery";
  const verifiedRecoveryClientClickContinuationDryRun = command === "continue-verified-temp0-recovery-client-click-dry-run";
  const verifiedRecoveryClientClickContinuationLive = command === "continue-verified-temp0-recovery-client-click";
  const failedPrepCloseDryRun = command === "close-failed-prep-module-loaded-modal-dry-run";
  const failedPrepCloseLive = command === "close-failed-prep-module-loaded-modal";
  const failedPrepClosePrecisionDryRun = command === "continue-failed-prep-close-starttime-precision-dry-run";
  const failedPrepClosePrecisionLive = command === "continue-failed-prep-close-starttime-precision";
  const exactInstalledMruContinuationDryRun = command === "continue-exact-installed-mru-load-dry-run";
  const exactInstalledMruContinuationLive = command === "continue-exact-installed-mru-load";
  const continuationPreActionResume = continuationPreActionResumeDryRun || continuationPreActionResumeLive;
  const unexpectedModuleContinuation = continuationDryRun || continuationLive || continuationPreActionResume;
  const verifiedRecoveryContinuation = verifiedRecoveryContinuationDryRun || verifiedRecoveryContinuationLive;
  const verifiedRecoveryClientClickContinuation = verifiedRecoveryClientClickContinuationDryRun || verifiedRecoveryClientClickContinuationLive;
  const failedPrepClosePrecision = failedPrepClosePrecisionDryRun || failedPrepClosePrecisionLive;
  const failedPrepClose = failedPrepCloseDryRun || failedPrepCloseLive || failedPrepClosePrecision;
  const exactInstalledMruContinuation = exactInstalledMruContinuationDryRun || exactInstalledMruContinuationLive;
  const continuation = unexpectedModuleContinuation || verifiedRecoveryContinuation || verifiedRecoveryClientClickContinuation || failedPrepClose || exactInstalledMruContinuation;
  if (!new Set(["dry-run", "prepare", "continue-unexpected-module-window-dry-run", "continue-unexpected-module-window", "continue-unexpected-module-window-pre-action-resume-dry-run", "continue-unexpected-module-window-pre-action-resume", "continue-verified-temp0-recovery-dry-run", "continue-verified-temp0-recovery", "continue-verified-temp0-recovery-client-click-dry-run", "continue-verified-temp0-recovery-client-click", "close-failed-prep-module-loaded-modal-dry-run", "close-failed-prep-module-loaded-modal", "continue-failed-prep-close-starttime-precision-dry-run", "continue-failed-prep-close-starttime-precision", "continue-exact-installed-mru-load-dry-run", "continue-exact-installed-mru-load"]).has(command)) {
    fail("PREP_COMMAND_INVALID", "Use dry-run, prepare, a published continuation, or close-failed-prep-module-loaded-modal[-dry-run].");
  }
  profilePath = requiredAbsolutePath(options.profile, "--profile");
  prepOutDir = requiredAbsolutePath(options.prepOutDir, "--prepOutDir");
  if (new Set(["prepare", "continue-unexpected-module-window", "continue-unexpected-module-window-pre-action-resume", "continue-verified-temp0-recovery", "continue-verified-temp0-recovery-client-click", "close-failed-prep-module-loaded-modal", "continue-failed-prep-close-starttime-precision", "continue-exact-installed-mru-load"]).has(command) && options.stateFixture) {
    fail("PREP_STATE_FIXTURE_LIVE_FORBIDDEN", "--stateFixture is dry-run only.");
  }
  const context = loadContext(profilePath, prepOutDir, { continuation });
  verifyImmutableInputs(context);
  const state = options.stateFixture
    ? readStateFixture(requiredAbsolutePath(options.stateFixture, "--stateFixture"))
    : inspectHostState();
  if (exactInstalledMruContinuation) {
    const admission = loadExactInstalledMruLoadContinuation(context, state);
    if (exactInstalledMruContinuationDryRun) {
      print({
        ok: true,
        command,
        status: "aurora_model_proof_120s_exact_installed_mru_load_continuation_planned",
        profile: { path: context.profilePath, sha256: context.profileSha256, id: context.profile.id },
        prepOutDir,
        stateSource: options.stateFixture ? "fixture" : "host-read-only",
        processId: admission.processId,
        startedAtUtc: admission.startedAtUtc,
        frameHwnd: admission.frameHwnd,
        moduleLoadOwner: admission.moduleLoadOwner,
        target: context.target,
        evidence: admission.evidence,
        safety: safety(false),
      });
    } else {
      print(continueExactInstalledMruLoad(context, state, admission));
    }
  } else if (failedPrepClose) {
    const admission = loadFailedPrepModuleLoadedModalClose(context, state, { precisionContinuation: failedPrepClosePrecision });
    if (failedPrepCloseDryRun || failedPrepClosePrecisionDryRun) {
      print({
        ok: true,
        command,
        status: failedPrepClosePrecision
          ? "aurora_model_proof_120s_failed_prep_close_starttime_precision_continuation_planned"
          : "aurora_model_proof_120s_failed_prep_module_loaded_modal_close_planned",
        profile: { path: context.profilePath, sha256: context.profileSha256, id: context.profile.id },
        prepOutDir,
        stateSource: options.stateFixture ? "fixture" : "host-read-only",
        processId: admission.processId,
        startedAtUtc: admission.startedAtUtc,
        frameHwnd: admission.frameHwnd,
        recordedModal: admission.recordedModal,
        target: context.target,
        evidence: admission.evidence,
        attempt: admission.attempt ?? 1,
        safety: safety(false),
      });
    } else {
      print(closeFailedPrepModuleLoadedModal(context, state, admission, { precisionContinuation: failedPrepClosePrecision }));
    }
  } else if (unexpectedModuleContinuation) {
    const admission = loadUnexpectedModuleWindowContinuation(context, state, { preActionResume: continuationPreActionResume });
    if (continuationDryRun || continuationPreActionResumeDryRun) {
      print({
        ok: true,
        command,
        status: "aurora_model_proof_120s_prep_continuation_planned",
        profile: { path: context.profilePath, sha256: context.profileSha256, id: context.profile.id },
        prepOutDir,
        stateSource: options.stateFixture ? "fixture" : "host-read-only",
        processId: admission.processId,
        currentModule: admission.currentModule,
        attempt: admission.preActionResume?.attempt ?? 1,
        welcomeResidueDismissalRequired: admission.welcomeResidue != null,
        welcomeResidue: admission.welcomeResidue,
        priorPreActionFailure: admission.preActionResume ?? null,
        target: context.target,
        evidence: admission.evidence,
        safety: safety(false),
      });
    } else {
      print(continueUnexpectedModuleWindow(context, state, admission, { preActionResume: continuationPreActionResume }));
    }
  } else if (verifiedRecoveryContinuation || verifiedRecoveryClientClickContinuation) {
    const clientClickFallback = verifiedRecoveryClientClickContinuation;
    const admission = loadVerifiedTemp0RecoveryContinuation(context, state, { clientClickFallback });
    if (verifiedRecoveryContinuationDryRun || verifiedRecoveryClientClickContinuationDryRun) {
      print({
        ok: true,
        command,
        status: clientClickFallback ? "aurora_model_proof_120s_prep_verified_temp0_recovery_client_click_continuation_planned" : "aurora_model_proof_120s_prep_verified_temp0_recovery_continuation_planned",
        profile: { path: context.profilePath, sha256: context.profileSha256, id: context.profile.id },
        prepOutDir,
        stateSource: options.stateFixture ? "fixture" : "host-read-only",
        processId: admission.processId,
        attempt: admission.attempt,
        target: context.target,
        evidence: admission.evidence,
        safety: safety(false),
      });
    } else {
      print(continueVerifiedTemp0Recovery(context, state, admission, { clientClickFallback }));
    }
  } else {
    const decision = decidePrepRoute(context, state);

    if (command === "dry-run") {
      print({
        ok: true,
        command,
        status: "aurora_model_proof_120s_prep_planned",
        profile: { path: context.profilePath, sha256: context.profileSha256, id: context.profile.id },
        prepOutDir,
        stateSource: options.stateFixture ? "fixture" : "host-read-only",
        decision,
        target: context.target,
        safety: safety(false),
      });
    } else {
      print(prepare(context, state, decision));
    }
  }
  }
} catch (error) {
  print({
    ok: false,
    command: command ?? null,
    blockerCode: error?.code ?? "PREP_EXCEPTION",
    message: error instanceof Error ? error.message : String(error),
    profilePath,
    prepOutDir,
    safety: safety(false),
  });
  process.exitCode = 2;
}

function prepare(context, initialState, initialDecision) {
  const outputOwnership = createPrepOutputDirectories(context.outputLayout);
  let liveActionStarted = false;
  try {
    writeJson(resolve(context.prepOutDir, "state-before.json"), initialState);
    writeJson(resolve(context.prepOutDir, "plan.json"), {
      version: "aurora-model-proof-120s-prep-plan/v1",
      createdAtUtc: new Date().toISOString(),
      profile: { path: context.profilePath, sha256: context.profileSha256, id: context.profile.id },
      target: context.target,
      decision: initialDecision,
      safety: safety(false),
    });

    let ownerPid = initialDecision.processId ?? null;
    const steps = [];
    if (initialDecision.route === "cold") {
      const coldOutDir = resolve(context.prepOutDir, "cold-open");
      steps.push(recordStep(context, "cold-preflight", runAtom("aurora-toolset-binary-module-native-geometry.mjs", [
        "preflight", "--profile", context.binaryProfilePath, "--outDir", coldOutDir,
        "--installedModulePath", context.profile.installedModule.path,
      ], 120_000)));
      liveActionStarted = true;
      steps.push(recordStep(context, "cold-open", runAtom("aurora-toolset-binary-module-native-geometry.mjs", [
        "open", "--profile", context.binaryProfilePath, "--outDir", coldOutDir,
        "--installedModulePath", context.profile.installedModule.path,
      ], 390_000)));
      const afterCold = inspectHostState();
      const afterColdDecision = decidePrepRoute(context, afterCold);
      if (!new Set(["load-area", "adopt"]).has(afterColdDecision.route)) fail("PREP_COLD_OPEN_POSTCONDITION_FAILED", JSON.stringify(afterColdDecision));
      ownerPid = afterColdDecision.processId;
      writeJson(resolve(context.prepOutDir, "state-after-cold-open.json"), afterCold);
    } else if (initialDecision.route === "switch") {
      liveActionStarted = true;
      const switched = switchExactModule(context, initialDecision);
      steps.push(...switched.steps);
      ownerPid = switched.processId;
    }

    verifyImmutableInputs(context);
    let readyState = inspectHostState();
    let readyDecision = decidePrepRoute(context, readyState);
    if (readyDecision.route !== "adopt") {
      if (readyDecision.route !== "load-area") fail("PREP_AREA_ROUTE_NOT_ADMITTED", JSON.stringify(readyDecision));
      if (readyDecision.processId !== ownerPid) fail("PREP_TOOLSET_PID_CHANGED", `${ownerPid} -> ${readyDecision.processId}`);
      liveActionStarted = true;
      steps.push(recordStep(context, "load-area", openExactArea(context)));
      readyState = inspectHostState();
      readyDecision = decidePrepRoute(context, readyState);
    }

    if (readyDecision.route !== "adopt" || readyDecision.processId !== ownerPid) {
      fail("PREP_PROOF_READY_POSTCONDITION_FAILED", JSON.stringify({ ownerPid, readyDecision }));
    }
    verifyImmutableInputs(context);
    writeJson(resolve(context.prepOutDir, "state-ready.json"), readyState);
    const result = {
      version: "aurora-model-proof-120s-prep-result/v1",
      ok: true,
      command: "prepare",
      status: "proof_ready",
      createdAtUtc: new Date().toISOString(),
      profile: { path: context.profilePath, sha256: context.profileSha256, id: context.profile.id },
      prepOutDir: context.prepOutDir,
      initialDecision,
      finalDecision: readyDecision,
      processId: ownerPid,
      target: context.target,
      steps,
      safety: safety(initialDecision.route === "cold"),
    };
    writeJson(resolve(context.prepOutDir, "prep-result.json"), result);
    return result;
  } catch (error) {
    if (!liveActionStarted) cleanupOwnedEmptyPrepDirectories(outputOwnership);
    throw error;
  }
}

function loadExactInstalledMruLoadContinuation(context, state) {
  for (const name of [
    "exact-installed-mru-continuation-plan.json",
    "exact-installed-mru-continuation-result.json",
    "exact-installed-mru-continuation-blocker.json",
    "load-area-exact-installed-mru.json",
    "area-queue.json",
    "area-open",
    "prep-result.json",
    "state-ready.json",
  ]) {
    if (existsSync(resolve(context.prepOutDir, name))) fail("PREP_EXACT_MRU_CONTINUATION_ALREADY_DISPATCHED", name);
  }
  const initialStateEvidence = readEvidenceJson(
    resolve(context.prepOutDir, "state-before.json"),
    "PREP_EXACT_MRU_INITIAL_STATE",
  );
  const planEvidence = readEvidenceJson(
    resolve(context.prepOutDir, "plan.json"),
    "PREP_EXACT_MRU_ORIGINAL_PLAN",
  );
  const failureEvidence = readEvidenceJson(
    resolve(context.prepOutDir, "cold-open", "binary-native-geometry-manifest.json"),
    "PREP_EXACT_MRU_FAILURE_MANIFEST",
  );
  const admission = validateExactInstalledMruLoadContinuation({
    failureManifest: failureEvidence.value,
    failureManifestPath: failureEvidence.path,
    prepPlan: planEvidence.value,
    initialState: initialStateEvidence.value,
    prepOutDir: context.prepOutDir,
    profilePath: context.profilePath,
    profileSha256: context.profileSha256,
    profileId: context.profile.id,
    binaryProfilePath: context.binaryProfilePath,
    binaryProfileSha256: context.profile.binaryProfile.sha256,
    target: {
      ...context.target,
      sourceModulePath: resolve(context.binaryProfile.module.path),
      installedModuleSha256: context.profile.installedModule.sha256,
    },
    state,
    timedOutputAbsent: !existsSync(resolve(context.profile.outputRoot)),
  });
  const decision = decidePrepRoute(context, state);
  if (
    decision.route !== "load-area"
    || decision.processId !== admission.processId
    || decision.currentModule?.toLowerCase() !== admission.targetModule.toLowerCase()
  ) {
    fail("PREP_EXACT_MRU_LOAD_AREA_DECISION_MISMATCH", JSON.stringify(decision));
  }
  return {
    ...admission,
    decision,
    evidence: {
      initialState: evidenceIdentity(initialStateEvidence),
      originalPlan: evidenceIdentity(planEvidence),
      failureManifest: evidenceIdentity(failureEvidence),
    },
  };
}

function continueExactInstalledMruLoad(context, currentState, admission) {
  const planPath = resolve(context.prepOutDir, "exact-installed-mru-continuation-plan.json");
  const resultPath = resolve(context.prepOutDir, "exact-installed-mru-continuation-result.json");
  const blockerPath = resolve(context.prepOutDir, "exact-installed-mru-continuation-blocker.json");
  const continuationPlan = {
    version: "aurora-model-proof-120s-exact-installed-mru-load-continuation-plan/v1",
    command: "continue-exact-installed-mru-load",
    createdAtUtc: new Date().toISOString(),
    profile: { path: context.profilePath, sha256: context.profileSha256, id: context.profile.id },
    prepOutDir: context.prepOutDir,
    target: context.target,
    failureToRecovery: admission.evidence,
    admission: {
      version: admission.version,
      processId: admission.processId,
      startedAtUtc: admission.startedAtUtc,
      frameHwnd: admission.frameHwnd,
      frameTitle: admission.frameTitle,
      moduleLoadOwner: admission.moduleLoadOwner,
      targetModule: admission.targetModule,
      areaResref: admission.areaResref,
    },
    currentState,
    safety: safety(false),
  };
  writeJson(planPath, continuationPlan);
  try {
    verifyImmutableInputs(context);
    const steps = [
      recordStep(context, "load-area-exact-installed-mru", openExactArea(context)),
    ];
    const readyState = inspectHostState();
    const readyDecision = decidePrepRoute(context, readyState);
    if (readyDecision.route !== "adopt" || readyDecision.processId !== admission.processId) {
      fail("PREP_PROOF_READY_POSTCONDITION_FAILED", JSON.stringify({
        ownerPid: admission.processId,
        readyDecision,
      }));
    }
    verifyImmutableInputs(context);
    writeJson(resolve(context.prepOutDir, "state-ready.json"), readyState);
    const result = {
      version: "aurora-model-proof-120s-prep-result/v1",
      ok: true,
      command: "continue-exact-installed-mru-load",
      status: "proof_ready",
      createdAtUtc: new Date().toISOString(),
      profile: { path: context.profilePath, sha256: context.profileSha256, id: context.profile.id },
      prepOutDir: context.prepOutDir,
      processId: admission.processId,
      initialDecision: admission.decision,
      finalDecision: readyDecision,
      target: context.target,
      failureToRecovery: admission.evidence,
      continuationPlan: {
        path: planPath,
        sha256: sha256File(planPath),
        byteLength: statSync(planPath).size,
      },
      steps,
      safety: safety(false),
    };
    writeJson(resultPath, result);
    const continuationResult = {
      path: resultPath,
      sha256: sha256File(resultPath),
      byteLength: statSync(resultPath).size,
    };
    const prepResult = { ...result, continuationResult };
    writeJson(resolve(context.prepOutDir, "prep-result.json"), prepResult);
    return prepResult;
  } catch (error) {
    if (!existsSync(blockerPath)) {
      writeJson(blockerPath, {
        version: "aurora-model-proof-120s-exact-installed-mru-load-continuation-blocker/v1",
        status: "failed",
        createdAtUtc: new Date().toISOString(),
        profile: { path: context.profilePath, sha256: context.profileSha256, id: context.profile.id },
        prepOutDir: context.prepOutDir,
        processId: admission.processId,
        failureToRecovery: admission.evidence,
        continuationPlan: {
          path: planPath,
          sha256: sha256File(planPath),
          byteLength: statSync(planPath).size,
        },
        blockerCode: error?.code ?? "PREP_EXACT_MRU_CONTINUATION_EXCEPTION",
        message: error instanceof Error ? error.message : String(error),
        safety: safety(false),
      });
    }
    throw error;
  }
}

function loadFailedPrepModuleLoadedModalClose(context, state, { precisionContinuation = false } = {}) {
  for (const name of [
    ...(precisionContinuation
      ? ["failed-prep-close.json", "failed-prep-close-precision-continuation-plan.json", "failed-prep-close-precision-continuation-blocker.json"]
      : ["failed-prep-close-plan.json", "failed-prep-close.json", "failed-prep-close-blocker.json"]),
    "continuation-plan.json",
    "continuation-result.json",
    "continuation-blocker.json",
    "prep-result.json",
    "state-ready.json",
  ]) {
    if (existsSync(resolve(context.prepOutDir, name))) fail("PREP_FAILED_CLOSE_ALREADY_DISPATCHED", name);
  }
  const initialStateEvidence = readEvidenceJson(
    resolve(context.prepOutDir, "state-before.json"),
    "PREP_FAILED_CLOSE_INITIAL_STATE",
  );
  const planEvidence = readEvidenceJson(
    resolve(context.prepOutDir, "plan.json"),
    "PREP_FAILED_CLOSE_ORIGINAL_PLAN",
  );
  const failureEvidence = readEvidenceJson(
    resolve(context.prepOutDir, "cold-open", "binary-native-geometry-manifest.json"),
    "PREP_FAILED_CLOSE_FAILURE_MANIFEST",
  );
  const admission = validateFailedPrepModuleLoadedModalCloseAdmission({
    failureManifest: failureEvidence.value,
    failureManifestPath: failureEvidence.path,
    prepPlan: planEvidence.value,
    initialState: initialStateEvidence.value,
    prepOutDir: context.prepOutDir,
    profilePath: context.profilePath,
    profileSha256: context.profileSha256,
    profileId: context.profile.id,
    binaryProfilePath: context.binaryProfilePath,
    binaryProfileSha256: context.profile.binaryProfile.sha256,
    target: {
      ...context.target,
      sourceModulePath: resolve(context.binaryProfile.module.path),
      installedModuleSha256: context.profile.installedModule.sha256,
    },
    state,
    timedOutputAbsent: !existsSync(resolve(context.profile.outputRoot)),
  });
  const result = {
    ...admission,
    evidence: {
      initialState: evidenceIdentity(initialStateEvidence),
      originalPlan: evidenceIdentity(planEvidence),
      failureManifest: evidenceIdentity(failureEvidence),
    },
  };
  if (!precisionContinuation) return result;
  const priorPlanEvidence = readEvidenceJson(
    resolve(context.prepOutDir, "failed-prep-close-plan.json"),
    "PREP_FAILED_CLOSE_PRECISION_PLAN",
  );
  const priorBlockerEvidence = readEvidenceJson(
    resolve(context.prepOutDir, "failed-prep-close-blocker.json"),
    "PREP_FAILED_CLOSE_PRECISION_BLOCKER",
  );
  const continuation = validateFailedPrepCloseStartTimePrecisionContinuation({
    closePlan: priorPlanEvidence.value,
    closePlanIdentity: evidenceIdentity(priorPlanEvidence),
    closeBlocker: priorBlockerEvidence.value,
    closeBlockerIdentity: evidenceIdentity(priorBlockerEvidence),
    prepOutDir: context.prepOutDir,
    profilePath: context.profilePath,
    profileSha256: context.profileSha256,
    profileId: context.profile.id,
    admission,
    failureEvidence: result.evidence,
  });
  return {
    ...result,
    ...continuation,
    evidence: {
      ...result.evidence,
      priorClosePlan: evidenceIdentity(priorPlanEvidence),
      priorCloseBlocker: evidenceIdentity(priorBlockerEvidence),
    },
  };
}

function closeFailedPrepModuleLoadedModal(context, currentState, admission, { precisionContinuation = false } = {}) {
  const commandName = precisionContinuation
    ? "continue-failed-prep-close-starttime-precision"
    : "close-failed-prep-module-loaded-modal";
  const planPath = resolve(
    context.prepOutDir,
    precisionContinuation ? "failed-prep-close-precision-continuation-plan.json" : "failed-prep-close-plan.json",
  );
  const resultPath = resolve(context.prepOutDir, "failed-prep-close.json");
  const blockerPath = resolve(
    context.prepOutDir,
    precisionContinuation ? "failed-prep-close-precision-continuation-blocker.json" : "failed-prep-close-blocker.json",
  );
  const closePlan = {
    version: precisionContinuation
      ? "aurora-model-proof-120s-failed-prep-close-precision-continuation-plan/v1"
      : "aurora-model-proof-120s-failed-prep-close-plan/v1",
    command: commandName,
    createdAtUtc: new Date().toISOString(),
    profile: { path: context.profilePath, sha256: context.profileSha256, id: context.profile.id },
    prepOutDir: context.prepOutDir,
    target: context.target,
    failureEvidence: admission.evidence,
    priorAttempt: precisionContinuation ? {
      attempt: admission.attempt,
      priorClosePlan: admission.priorClosePlan,
      priorCloseBlocker: admission.priorCloseBlocker,
      blockerClass: "pre_action_starttime_submillisecond_precision_mismatch",
    } : null,
    admission: {
      version: admission.version,
      processId: admission.processId,
      startedAtUtc: admission.startedAtUtc,
      frameHwnd: admission.frameHwnd,
      frameTitle: admission.frameTitle,
      recordedModal: admission.recordedModal,
      currentModalState: admission.currentModalState,
    },
    currentState,
    closePolicy: {
      gracefulFirst: true,
      exactPidStartTimeForceFallback: true,
      requiresZeroToolsetAndNwn: true,
    },
    safety: safety(false),
  };
  writeJson(planPath, closePlan);
  try {
    const closeResult = runAtom("close-aurora-toolset-window-no-global-input.mjs", [
      "--expectedPid", String(admission.processId),
      "--expectedStartedAtUtc", admission.startedAtUtc,
      "--expectedFrameHwnd", String(admission.frameHwnd),
      "--expectedFrameTitle", admission.frameTitle,
      "--forceIfNeeded", "true",
    ], 35_000);
    const finalState = inspectHostState();
    if (!Array.isArray(finalState.toolsets) || finalState.toolsets.length !== 0) {
      fail("PREP_FAILED_CLOSE_TOOLSET_REMAINS", JSON.stringify(finalState.toolsets ?? null));
    }
    if (!Array.isArray(finalState.nwmain) || finalState.nwmain.length !== 0) {
      fail("PREP_FAILED_CLOSE_NWN_REMAINS", JSON.stringify(finalState.nwmain ?? null));
    }
    verifyImmutableInputs(context);
    const result = {
      version: "aurora-model-proof-120s-failed-prep-close-result/v1",
      ok: true,
      command: commandName,
      status: "proof_owned_failed_prep_closed",
      createdAtUtc: new Date().toISOString(),
      profile: { path: context.profilePath, sha256: context.profileSha256, id: context.profile.id },
      prepOutDir: context.prepOutDir,
      target: context.target,
      failureEvidence: admission.evidence,
      closePlan: {
        path: planPath,
        sha256: sha256File(planPath),
        byteLength: statSync(planPath).size,
      },
      process: {
        pid: admission.processId,
        startedAtUtc: admission.startedAtUtc,
        frameHwnd: admission.frameHwnd,
        frameTitle: admission.frameTitle,
      },
      closeResult,
      finalState,
      postcondition: { nwtoolsetCount: 0, nwmainCount: 0 },
      safety: safety(false),
    };
    writeJson(resultPath, result);
    return {
      ...result,
      evidence: {
        path: resultPath,
        sha256: sha256File(resultPath),
        byteLength: statSync(resultPath).size,
      },
    };
  } catch (error) {
    if (!existsSync(blockerPath)) {
      writeJson(blockerPath, {
        version: "aurora-model-proof-120s-failed-prep-close-blocker/v1",
        status: "failed",
        createdAtUtc: new Date().toISOString(),
        profile: { path: context.profilePath, sha256: context.profileSha256, id: context.profile.id },
        prepOutDir: context.prepOutDir,
        failureEvidence: admission.evidence,
        closePlan: {
          path: planPath,
          sha256: sha256File(planPath),
          byteLength: statSync(planPath).size,
        },
        process: {
          pid: admission.processId,
          startedAtUtc: admission.startedAtUtc,
          frameHwnd: admission.frameHwnd,
          frameTitle: admission.frameTitle,
        },
        blockerCode: error?.code ?? "PREP_FAILED_CLOSE_EXCEPTION",
        message: error instanceof Error ? error.message : String(error),
        safety: safety(false),
      });
    }
    throw error;
  }
}

function loadUnexpectedModuleWindowContinuation(context, state, { preActionResume = false } = {}) {
  const priorPlanPath = resolve(context.prepOutDir, "continuation-plan.json");
  const priorBlockerPath = resolve(context.prepOutDir, "continuation-blocker.json");
  if (preActionResume) {
    if (!existsSync(priorPlanPath) || !existsSync(priorBlockerPath)) {
      fail("PREP_CONTINUATION_PRE_ACTION_RESUME_EVIDENCE_MISSING", `${existsSync(priorPlanPath)}:${existsSync(priorBlockerPath)}`);
    }
    for (const name of [
      "continuation-plan-v2.json",
      "continuation-result.json",
      "continuation-result-v2.json",
      "continuation-blocker-v2.json",
      "prep-result.json",
      "state-ready.json",
      "dismiss-bound-welcome-residue.json",
      "state-after-welcome-dismissal.json",
      "switch-menu-probe.json",
      "switch-file-open-command.json",
      "state-open-dialog.json",
      "switch-dialog-move.json",
      "switch-module-list-readback.json",
      "switch-module-list-selection.json",
      "switch-exact-open.json",
      "state-after-switch.json",
    ]) {
      if (existsSync(resolve(context.prepOutDir, name))) {
        fail("PREP_CONTINUATION_PRE_ACTION_RESUME_ACTION_EVIDENCE_PRESENT", name);
      }
    }
  } else {
    for (const name of ["continuation-plan.json", "continuation-result.json", "continuation-blocker.json", "prep-result.json", "state-ready.json"]) {
      if (existsSync(resolve(context.prepOutDir, name))) fail("PREP_CONTINUATION_ALREADY_DISPATCHED", name);
    }
  }
  const initialStateEvidence = readEvidenceJson(resolve(context.prepOutDir, "state-before.json"), "PREP_CONTINUATION_INITIAL_STATE");
  const planEvidence = readEvidenceJson(resolve(context.prepOutDir, "plan.json"), "PREP_CONTINUATION_ORIGINAL_PLAN");
  const failureEvidence = readEvidenceJson(
    resolve(context.prepOutDir, "cold-open", "binary-native-geometry-manifest.json"),
    "PREP_CONTINUATION_FAILURE_MANIFEST",
  );
  const admission = validateUnexpectedModuleWindowContinuation({
    failureManifest: failureEvidence.value,
    failureManifestPath: failureEvidence.path,
    prepPlan: planEvidence.value,
    initialState: initialStateEvidence.value,
    prepOutDir: context.prepOutDir,
    profilePath: context.profilePath,
    profileSha256: context.profileSha256,
    profileId: context.profile.id,
    binaryProfilePath: context.binaryProfilePath,
    binaryProfileSha256: context.profile.binaryProfile.sha256,
    target: {
      ...context.target,
      sourceModulePath: resolve(context.binaryProfile.module.path),
      installedModuleSha256: context.profile.installedModule.sha256,
    },
    state,
  });
  const failureToRecovery = {
    initialState: evidenceIdentity(initialStateEvidence),
    originalPlan: evidenceIdentity(planEvidence),
    failureManifest: evidenceIdentity(failureEvidence),
  };
  let preActionResumeAdmission = null;
  if (preActionResume) {
    const priorPlanEvidence = readEvidenceJson(priorPlanPath, "PREP_CONTINUATION_PRE_ACTION_RESUME_PLAN");
    const priorBlockerEvidence = readEvidenceJson(priorBlockerPath, "PREP_CONTINUATION_PRE_ACTION_RESUME_BLOCKER");
    preActionResumeAdmission = validateUnexpectedModuleWindowPreActionResume({
      admission,
      prepOutDir: context.prepOutDir,
      profilePath: context.profilePath,
      profileSha256: context.profileSha256,
      profileId: context.profile.id,
      target: context.target,
      expectedFailureToRecovery: failureToRecovery,
      priorPlan: priorPlanEvidence.value,
      priorPlanIdentity: evidenceIdentity(priorPlanEvidence),
      priorBlocker: priorBlockerEvidence.value,
      priorBlockerIdentity: evidenceIdentity(priorBlockerEvidence),
    });
  }
  const decisionState = admission.welcomeResidue == null
    ? state
    : {
      ...state,
      toolsets: state.toolsets.map((toolset) => ({ ...toolset, modals: [] })),
    };
  const decision = decidePrepRoute(context, decisionState);
  if (
    decision.route !== "switch"
    || decision.processId !== admission.processId
    || decision.currentModule !== admission.currentModule
  ) {
    fail("PREP_CONTINUATION_SWITCH_DECISION_MISMATCH", JSON.stringify(decision));
  }
  return {
    ...admission,
    decision,
    evidence: failureToRecovery,
    preActionResume: preActionResumeAdmission,
  };
}

function continueUnexpectedModuleWindow(context, currentState, admission, { preActionResume = false } = {}) {
  const continuationPlanPath = resolve(context.prepOutDir, preActionResume ? "continuation-plan-v2.json" : "continuation-plan.json");
  const continuationResultPath = resolve(context.prepOutDir, preActionResume ? "continuation-result-v2.json" : "continuation-result.json");
  const continuationBlockerPath = resolve(context.prepOutDir, preActionResume ? "continuation-blocker-v2.json" : "continuation-blocker.json");
  const continuationCommand = preActionResume
    ? "continue-unexpected-module-window-pre-action-resume"
    : "continue-unexpected-module-window";
  const continuationPlan = {
    version: preActionResume
      ? "aurora-model-proof-120s-prep-continuation-plan/v2"
      : "aurora-model-proof-120s-prep-continuation-plan/v1",
    command: continuationCommand,
    createdAtUtc: new Date().toISOString(),
    profile: { path: context.profilePath, sha256: context.profileSha256, id: context.profile.id },
    prepOutDir: context.prepOutDir,
    target: context.target,
    failureToRecovery: admission.evidence,
    priorPreActionFailure: admission.preActionResume,
    admission: {
      version: admission.version,
      processId: admission.processId,
      startedAtUtc: admission.startedAtUtc,
      frameHwnd: admission.frameHwnd,
      frameTitle: admission.frameTitle,
      currentModule: admission.currentModule,
      targetModule: admission.targetModule,
      areaResref: admission.areaResref,
      welcomeResidue: admission.welcomeResidue,
    },
    currentState,
    safety: safety(false),
  };
  writeJson(continuationPlanPath, continuationPlan);
  try {
    const steps = [];
    let switchDecision = admission.decision;
    if (admission.welcomeResidue) {
      const residue = admission.welcomeResidue;
      const dismissed = runAtom("close-aurora-toolset-dialog-no-global-input.mjs", [
        "--class", residue.className,
        "--title", residue.title,
        "--expectedProcessId", String(residue.processId),
        "--expectedStartedAtUtc", residue.startedAtUtc,
        "--expectedDialogHwnd", String(residue.hwnd),
      ], 45_000);
      const afterDismissalState = inspectHostState();
      const dismissalAdmission = validateUnexpectedModuleWindowPostWelcomeDismissal({
        admission,
        dismissalResult: dismissed,
        state: afterDismissalState,
      });
      steps.push(recordStep(context, "dismiss-bound-welcome-residue", {
        ...dismissed,
        prepReadback: dismissalAdmission,
      }));
      writeJson(resolve(context.prepOutDir, "state-after-welcome-dismissal.json"), afterDismissalState);
      switchDecision = decidePrepRoute(context, afterDismissalState);
      if (
        switchDecision.route !== "switch"
        || switchDecision.processId !== admission.processId
        || switchDecision.currentModule !== admission.currentModule
      ) {
        fail("PREP_CONTINUATION_POST_WELCOME_SWITCH_DECISION_MISMATCH", JSON.stringify(switchDecision));
      }
    }
    const switched = switchExactModule(context, switchDecision);
    steps.push(...switched.steps);
    verifyImmutableInputs(context);
    let readyState = inspectHostState();
    let readyDecision = decidePrepRoute(context, readyState);
    if (readyDecision.route !== "adopt") {
      if (readyDecision.route !== "load-area") fail("PREP_CONTINUATION_AREA_ROUTE_NOT_ADMITTED", JSON.stringify(readyDecision));
      if (readyDecision.processId !== admission.processId) fail("PREP_TOOLSET_PID_CHANGED", `${admission.processId} -> ${readyDecision.processId}`);
      steps.push(recordStep(context, "load-area", openExactArea(context)));
      readyState = inspectHostState();
      readyDecision = decidePrepRoute(context, readyState);
    }
    if (readyDecision.route !== "adopt" || readyDecision.processId !== admission.processId) {
      fail("PREP_PROOF_READY_POSTCONDITION_FAILED", JSON.stringify({ ownerPid: admission.processId, readyDecision }));
    }
    verifyImmutableInputs(context);
    writeJson(resolve(context.prepOutDir, "state-ready.json"), readyState);
    const result = {
    version: "aurora-model-proof-120s-prep-result/v1",
    ok: true,
    command: continuationCommand,
    status: "proof_ready",
    createdAtUtc: new Date().toISOString(),
    profile: { path: context.profilePath, sha256: context.profileSha256, id: context.profile.id },
    prepOutDir: context.prepOutDir,
    processId: admission.processId,
    initialDecision: admission.decision,
    finalDecision: readyDecision,
    target: context.target,
    failureToRecovery: admission.evidence,
    priorPreActionFailure: admission.preActionResume,
    continuationPlan: {
      path: continuationPlanPath,
      sha256: sha256File(continuationPlanPath),
      byteLength: statSync(continuationPlanPath).size,
    },
    steps,
    safety: safety(false),
    };
    writeJson(continuationResultPath, result);
    const continuationResultIdentity = {
      path: continuationResultPath,
      sha256: sha256File(continuationResultPath),
      byteLength: statSync(continuationResultPath).size,
    };
    const prepResult = { ...result, continuationResult: continuationResultIdentity };
    writeJson(resolve(context.prepOutDir, "prep-result.json"), prepResult);
    return prepResult;
  } catch (error) {
    if (!existsSync(continuationBlockerPath)) {
      writeJson(continuationBlockerPath, {
        version: preActionResume
          ? "aurora-model-proof-120s-prep-continuation-blocker/v2"
          : "aurora-model-proof-120s-prep-continuation-blocker/v1",
        status: "failed",
        createdAtUtc: new Date().toISOString(),
        profile: { path: context.profilePath, sha256: context.profileSha256, id: context.profile.id },
        prepOutDir: context.prepOutDir,
        processId: admission.processId,
        failureToRecovery: admission.evidence,
        priorPreActionFailure: admission.preActionResume,
        continuationPlan: {
          path: continuationPlanPath,
          sha256: sha256File(continuationPlanPath),
          byteLength: statSync(continuationPlanPath).size,
        },
        blockerCode: error?.code ?? "PREP_CONTINUATION_EXCEPTION",
        message: error instanceof Error ? error.message : String(error),
        safety: safety(false),
      });
    }
    throw error;
  }
}

function loadVerifiedTemp0RecoveryContinuation(context, state, { clientClickFallback = false } = {}) {
  const clientClickPlanPath = resolve(context.prepOutDir, "verified-temp0-recovery-client-click-continuation-plan.json");
  const clientClickBlockerPath = resolve(context.prepOutDir, "verified-temp0-recovery-client-click-continuation-blocker.json");
  const clientClickPlanExists = existsSync(clientClickPlanPath);
  const clientClickBlockerExists = existsSync(clientClickBlockerPath);
  if (clientClickFallback && clientClickPlanExists !== clientClickBlockerExists) {
    fail("PREP_VERIFIED_TEMP0_CLIENT_CLICK_PRIOR_ATTEMPT_INCOMPLETE", `${clientClickPlanExists}:${clientClickBlockerExists}`);
  }
  const clientClickLaneRetry = clientClickFallback && clientClickPlanExists && clientClickBlockerExists;
  const dispatchedArtifacts = clientClickFallback ? [
    "continuation-result.json",
    "continuation-result-v2.json",
    "load-area-v2.json",
    "prep-result.json",
    "state-ready.json",
    "verified-temp0-recovery-client-click-continuation-result.json",
    ...(clientClickLaneRetry ? [
      "verified-temp0-recovery-client-click-continuation-plan-v2.json",
      "verified-temp0-recovery-client-click-continuation-result-v2.json",
      "verified-temp0-recovery-client-click-continuation-blocker-v2.json",
    ] : [
      "verified-temp0-recovery-client-click-continuation-plan.json",
      "verified-temp0-recovery-client-click-continuation-blocker.json",
    ]),
  ] : [
    "continuation-result.json",
    "continuation-plan-v2.json",
    "continuation-result-v2.json",
    "continuation-blocker-v2.json",
    "verified-temp0-recovery-resume-dry-run-v2.json",
    "verified-temp0-recovery-resume-v2.json",
    "load-area-v2.json",
    "prep-result.json",
    "state-ready.json",
    "verified-temp0-recovery-client-click-continuation-plan.json",
    "verified-temp0-recovery-client-click-continuation-result.json",
    "verified-temp0-recovery-client-click-continuation-blocker.json",
  ];
  for (const name of dispatchedArtifacts) {
    if (existsSync(resolve(context.prepOutDir, name))) fail("PREP_CONTINUATION_ALREADY_DISPATCHED", name);
  }
  const priorPlanPath = resolve(context.prepOutDir, "continuation-plan.json");
  const priorBlockerPath = resolve(context.prepOutDir, "continuation-blocker.json");
  const priorPlanExists = existsSync(priorPlanPath);
  const priorBlockerExists = existsSync(priorBlockerPath);
  if (priorPlanExists !== priorBlockerExists) {
    fail("PREP_VERIFIED_TEMP0_RECOVERY_PRIOR_ATTEMPT_INCOMPLETE", `${priorPlanExists}:${priorBlockerExists}`);
  }
  const initialStateEvidence = readEvidenceJson(resolve(context.prepOutDir, "state-before.json"), "PREP_VERIFIED_TEMP0_RECOVERY_INITIAL_STATE");
  const planEvidence = readEvidenceJson(resolve(context.prepOutDir, "plan.json"), "PREP_VERIFIED_TEMP0_RECOVERY_ORIGINAL_PLAN");
  const failureEvidence = readEvidenceJson(
    resolve(context.prepOutDir, "cold-open", "binary-native-geometry-manifest.json"),
    "PREP_VERIFIED_TEMP0_RECOVERY_FAILURE_MANIFEST",
  );
  const admission = validateVerifiedTemp0RecoveryContinuation({
    failureManifest: failureEvidence.value,
    failureManifestPath: failureEvidence.path,
    prepPlan: planEvidence.value,
    initialState: initialStateEvidence.value,
    prepOutDir: context.prepOutDir,
    profilePath: context.profilePath,
    profileSha256: context.profileSha256,
    profileId: context.profile.id,
    binaryProfilePath: context.binaryProfilePath,
    binaryProfileSha256: context.profile.binaryProfile.sha256,
    target: {
      ...context.target,
      sourceModulePath: resolve(context.binaryProfile.module.path),
      installedModuleSha256: context.profile.installedModule.sha256,
    },
    state,
    clientClickFallback,
  });
  if (clientClickFallback) {
    const predecessor = loadVerifiedTemp0RecoveryClientClickPredecessor(context, admission);
    const laneRetryEvidence = clientClickLaneRetry
      ? loadVerifiedTemp0RecoveryClientClickLaneRetry(context, admission)
      : null;
    return {
      ...admission,
      attempt: clientClickLaneRetry ? "client-click-lane-retry" : "client-click",
      clientClickLaneRetry,
      files: {
        continuationPlan: `verified-temp0-recovery-client-click-continuation-plan${clientClickLaneRetry ? "-v2" : ""}.json`,
        continuationResult: `verified-temp0-recovery-client-click-continuation-result${clientClickLaneRetry ? "-v2" : ""}.json`,
        continuationBlocker: `verified-temp0-recovery-client-click-continuation-blocker${clientClickLaneRetry ? "-v2" : ""}.json`,
        resumeDryRunStep: `verified-temp0-recovery-client-click-resume-dry-run${clientClickLaneRetry ? "-v2" : ""}`,
        resumeStep: `verified-temp0-recovery-client-click-resume${clientClickLaneRetry ? "-v2" : ""}`,
        loadAreaStep: `load-area-client-click${clientClickLaneRetry ? "-v2" : ""}`,
      },
      evidence: {
        initialState: evidenceIdentity(initialStateEvidence),
        originalPlan: evidenceIdentity(planEvidence),
        failureManifest: evidenceIdentity(failureEvidence),
        predecessor,
        ...(laneRetryEvidence ? { priorClientClickLaneFailure: laneRetryEvidence } : {}),
      },
    };
  }
  let attempt = 1;
  let priorRetryEvidence = null;
  if (priorPlanExists) {
    const priorPlanEvidence = readEvidenceJson(priorPlanPath, "PREP_VERIFIED_TEMP0_RECOVERY_PRIOR_CONTINUATION_PLAN");
    const priorBlockerEvidence = readEvidenceJson(priorBlockerPath, "PREP_VERIFIED_TEMP0_RECOVERY_PRIOR_CONTINUATION_BLOCKER");
    priorRetryEvidence = validateVerifiedTemp0RecoveryRetryEvidence({
      priorPlan: priorPlanEvidence.value,
      priorPlanIdentity: evidenceIdentity(priorPlanEvidence),
      priorBlocker: priorBlockerEvidence.value,
      priorBlockerIdentity: evidenceIdentity(priorBlockerEvidence),
      prepOutDir: context.prepOutDir,
      profilePath: context.profilePath,
      profileId: context.profile.id,
      target: context.target,
      admission,
    });
    attempt = priorRetryEvidence.attempt;
  }
  const suffix = attempt === 1 ? "" : "-v2";
  return {
    ...admission,
    attempt,
    files: {
      continuationPlan: `continuation-plan${suffix}.json`,
      continuationResult: `continuation-result${suffix}.json`,
      continuationBlocker: `continuation-blocker${suffix}.json`,
      resumeDryRunStep: `verified-temp0-recovery-resume-dry-run${suffix}`,
      resumeStep: `verified-temp0-recovery-resume${suffix}`,
      loadAreaStep: `load-area${suffix}`,
    },
    evidence: {
      initialState: evidenceIdentity(initialStateEvidence),
      originalPlan: evidenceIdentity(planEvidence),
      failureManifest: evidenceIdentity(failureEvidence),
      ...(priorRetryEvidence ? {
        priorContinuationPlan: priorRetryEvidence.priorContinuationPlan,
        priorContinuationBlocker: priorRetryEvidence.priorContinuationBlocker,
        priorFailureToRecovery: priorRetryEvidence.priorFailureToRecovery,
      } : {}),
    },
  };
}

function loadVerifiedTemp0RecoveryClientClickPredecessor(context, admission) {
  const plan = readEvidenceJson(resolve(context.prepOutDir, "continuation-plan-v2.json"), "PREP_VERIFIED_TEMP0_CLIENT_CLICK_PRIOR_PLAN");
  const blocker = readEvidenceJson(resolve(context.prepOutDir, "continuation-blocker-v2.json"), "PREP_VERIFIED_TEMP0_CLIENT_CLICK_PRIOR_BLOCKER");
  const dryRun = readEvidenceJson(resolve(context.prepOutDir, "verified-temp0-recovery-resume-dry-run-v2.json"), "PREP_VERIFIED_TEMP0_CLIENT_CLICK_PRIOR_DRY_RUN");
  if (
    plan.value?.version !== "aurora-model-proof-120s-prep-verified-temp0-recovery-continuation-plan/v2"
    || plan.value?.command !== "continue-verified-temp0-recovery"
    || plan.value?.attempt !== 2
    || plan.value?.profile?.id !== context.profile.id
    || !/^[a-f0-9]{64}$/u.test(String(plan.value?.profile?.sha256 ?? ""))
    || !samePath(plan.value?.profile?.path, context.profilePath)
    || !samePath(plan.value?.prepOutDir, context.prepOutDir)
    || plan.value?.target?.moduleName !== admission.targetModule
    || plan.value?.target?.areaResref !== admission.areaResref
    || Number(plan.value?.admission?.processId) !== admission.processId
    || plan.value?.admission?.startedAtUtc !== admission.startedAtUtc
    || Number(plan.value?.admission?.frameHwnd) !== admission.frameHwnd
    || Number(plan.value?.admission?.modalHwnd) !== admission.modalHwnd
    || plan.value?.admission?.cacheIdentitySha256 !== admission.cacheIdentitySha256
    || plan.value?.admission?.currentModelProofProfileSha256 !== plan.value.profile.sha256
  ) {
    fail("PREP_VERIFIED_TEMP0_CLIENT_CLICK_PRIOR_PLAN_MISMATCH", JSON.stringify(plan.value ?? null));
  }
  if (
    blocker.value?.version !== "aurora-model-proof-120s-prep-verified-temp0-recovery-continuation-blocker/v2"
    || blocker.value?.status !== "failed"
    || blocker.value?.blockerCode !== "toolset_verified_temp0_recovery_prompt_did_not_close"
    || Number(blocker.value?.processId) !== admission.processId
    || blocker.value?.continuationPlan?.sha256 !== plan.sha256
    || blocker.value?.continuationPlan?.byteLength !== plan.byteLength
    || !samePath(blocker.value?.continuationPlan?.path, plan.path)
  ) {
    fail("PREP_VERIFIED_TEMP0_CLIENT_CLICK_PRIOR_BLOCKER_MISMATCH", JSON.stringify(blocker.value ?? null));
  }
  if (
    dryRun.value?.name !== "verified-temp0-recovery-resume-dry-run-v2"
    || dryRun.value?.result?.command !== "resume-verified-temp0-recovery-dry-run"
    || dryRun.value?.result?.status !== "binary_native_verified_temp0_recovery_resume_admitted"
    || Number(dryRun.value?.result?.process?.Id) !== admission.processId
    || Number(dryRun.value?.result?.confirmation?.hwnd) !== admission.modalHwnd
    || Number(dryRun.value?.result?.frame?.hwnd) !== admission.frameHwnd
  ) {
    fail("PREP_VERIFIED_TEMP0_CLIENT_CLICK_PRIOR_DRY_RUN_MISMATCH", JSON.stringify(dryRun.value ?? null));
  }
  return { priorContinuationPlan: evidenceIdentity(plan), priorContinuationBlocker: evidenceIdentity(blocker), priorResumeDryRun: evidenceIdentity(dryRun) };
}

function loadVerifiedTemp0RecoveryClientClickLaneRetry(context, admission) {
  const plan = readEvidenceJson(
    resolve(context.prepOutDir, "verified-temp0-recovery-client-click-continuation-plan.json"),
    "PREP_VERIFIED_TEMP0_CLIENT_CLICK_LANE_PRIOR_PLAN",
  );
  const blocker = readEvidenceJson(
    resolve(context.prepOutDir, "verified-temp0-recovery-client-click-continuation-blocker.json"),
    "PREP_VERIFIED_TEMP0_CLIENT_CLICK_LANE_PRIOR_BLOCKER",
  );
  if (
    plan.value?.version !== "aurora-model-proof-120s-prep-verified-temp0-recovery-client-click-continuation-plan/v1"
    || plan.value?.command !== "continue-verified-temp0-recovery-client-click"
    || plan.value?.attempt !== "client-click"
    || plan.value?.profile?.id !== context.profile.id
    || !/^[a-f0-9]{64}$/u.test(String(plan.value?.profile?.sha256 ?? ""))
    || !samePath(plan.value?.profile?.path, context.profilePath)
    || !samePath(plan.value?.prepOutDir, context.prepOutDir)
    || plan.value?.target?.moduleName !== admission.targetModule
    || plan.value?.target?.areaResref !== admission.areaResref
    || Number(plan.value?.admission?.processId) !== admission.processId
    || plan.value?.admission?.startedAtUtc !== admission.startedAtUtc
    || Number(plan.value?.admission?.frameHwnd) !== admission.frameHwnd
    || Number(plan.value?.admission?.modalHwnd) !== admission.modalHwnd
    || plan.value?.admission?.cacheIdentitySha256 !== admission.cacheIdentitySha256
    || plan.value?.admission?.currentModelProofProfileSha256 !== plan.value.profile.sha256
  ) {
    fail("PREP_VERIFIED_TEMP0_CLIENT_CLICK_LANE_PRIOR_PLAN_MISMATCH", JSON.stringify(plan.value ?? null));
  }
  if (
    blocker.value?.version !== "aurora-model-proof-120s-prep-verified-temp0-recovery-client-click-continuation-blocker/v1"
    || blocker.value?.status !== "failed"
    || blocker.value?.attempt !== "client-click"
    || blocker.value?.blockerCode !== "BINARY_NATIVE_VERIFIED_TEMP0_RECOVERY_FAILURE_PACKET_MISMATCH"
    || Number(blocker.value?.processId) !== admission.processId
    || blocker.value?.continuationPlan?.sha256 !== plan.sha256
    || blocker.value?.continuationPlan?.byteLength !== plan.byteLength
    || !samePath(blocker.value?.continuationPlan?.path, plan.path)
  ) {
    fail("PREP_VERIFIED_TEMP0_CLIENT_CLICK_LANE_PRIOR_BLOCKER_MISMATCH", JSON.stringify(blocker.value ?? null));
  }
  return {
    priorContinuationPlan: evidenceIdentity(plan),
    priorContinuationBlocker: evidenceIdentity(blocker),
    actionPreviouslySubmitted: false,
  };
}

function continueVerifiedTemp0Recovery(context, currentState, admission, { clientClickFallback = false } = {}) {
  const continuationPlanPath = resolve(context.prepOutDir, admission.files.continuationPlan);
  const continuationResultPath = resolve(context.prepOutDir, admission.files.continuationResult);
  const continuationBlockerPath = resolve(context.prepOutDir, admission.files.continuationBlocker);
  const continuationPlan = {
    version: clientClickFallback
      ? `aurora-model-proof-120s-prep-verified-temp0-recovery-client-click-continuation-plan/v${admission.clientClickLaneRetry ? 2 : 1}`
      : `aurora-model-proof-120s-prep-verified-temp0-recovery-continuation-plan/v${admission.attempt}`,
    command: clientClickFallback ? "continue-verified-temp0-recovery-client-click" : "continue-verified-temp0-recovery",
    attempt: admission.attempt,
    createdAtUtc: new Date().toISOString(),
    profile: { path: context.profilePath, sha256: context.profileSha256, id: context.profile.id },
    prepOutDir: context.prepOutDir,
    target: context.target,
    failureToRecovery: admission.evidence,
    admission: {
      version: admission.version,
      processId: admission.processId,
      startedAtUtc: admission.startedAtUtc,
      frameHwnd: admission.frameHwnd,
      modalHwnd: admission.modalHwnd,
      targetModule: admission.targetModule,
      areaResref: admission.areaResref,
      cacheIdentitySha256: admission.cacheIdentitySha256,
      originalModelProofProfileSha256: admission.originalModelProofProfileSha256,
      currentModelProofProfileSha256: admission.currentModelProofProfileSha256,
    },
    currentState,
    safety: safety(false),
  };
  writeJson(continuationPlanPath, continuationPlan);
  try {
    const steps = [];
    const binaryArgs = [
      "--profile", context.binaryProfilePath,
      "--outDir", resolve(context.prepOutDir, "cold-open"),
      "--installedModulePath", context.profile.installedModule.path,
    ];
    const resumeCommand = clientClickFallback ? "resume-verified-temp0-recovery-client-click" : "resume-verified-temp0-recovery";
    steps.push(recordStep(context, admission.files.resumeDryRunStep, runAtom(
      "aurora-toolset-binary-module-native-geometry.mjs",
      [`${resumeCommand}-dry-run`, ...binaryArgs],
      120_000,
    )));
    const resumed = runAtom(
      "aurora-toolset-binary-module-native-geometry.mjs",
      [resumeCommand, ...binaryArgs],
      390_000,
    );
    requireSamePid(resumed, admission.processId, "verified-temp0-recovery-resume");
    steps.push(recordStep(context, admission.files.resumeStep, resumed));
    verifyImmutableInputs(context);
    let readyState = inspectHostState();
    let readyDecision = decidePrepRoute(context, readyState);
    if (readyDecision.route !== "adopt") {
      if (readyDecision.route !== "load-area") fail("PREP_VERIFIED_TEMP0_RECOVERY_AREA_ROUTE_NOT_ADMITTED", JSON.stringify(readyDecision));
      if (readyDecision.processId !== admission.processId) fail("PREP_TOOLSET_PID_CHANGED", `${admission.processId} -> ${readyDecision.processId}`);
      steps.push(recordStep(context, admission.files.loadAreaStep, openExactArea(context)));
      readyState = inspectHostState();
      readyDecision = decidePrepRoute(context, readyState);
    }
    if (readyDecision.route !== "adopt" || readyDecision.processId !== admission.processId) {
      fail("PREP_PROOF_READY_POSTCONDITION_FAILED", JSON.stringify({ ownerPid: admission.processId, readyDecision }));
    }
    verifyImmutableInputs(context);
    writeJson(resolve(context.prepOutDir, "state-ready.json"), readyState);
    const result = {
      version: "aurora-model-proof-120s-prep-result/v1",
      ok: true,
      command: clientClickFallback ? "continue-verified-temp0-recovery-client-click" : "continue-verified-temp0-recovery",
      attempt: admission.attempt,
      status: "proof_ready",
      createdAtUtc: new Date().toISOString(),
      profile: { path: context.profilePath, sha256: context.profileSha256, id: context.profile.id },
      prepOutDir: context.prepOutDir,
      processId: admission.processId,
      initialDecision: { route: "verified-temp0-recovery-continuation", reason: "exact_failed_handler_same_pid" },
      finalDecision: readyDecision,
      target: context.target,
      failureToRecovery: admission.evidence,
      continuationPlan: {
        path: continuationPlanPath,
        sha256: sha256File(continuationPlanPath),
        byteLength: statSync(continuationPlanPath).size,
      },
      steps,
      safety: safety(false),
    };
    writeJson(continuationResultPath, result);
    const continuationResultIdentity = {
      path: continuationResultPath,
      sha256: sha256File(continuationResultPath),
      byteLength: statSync(continuationResultPath).size,
    };
    const prepResult = { ...result, continuationResult: continuationResultIdentity };
    writeJson(resolve(context.prepOutDir, "prep-result.json"), prepResult);
    return prepResult;
  } catch (error) {
    if (!existsSync(continuationBlockerPath)) {
      writeJson(continuationBlockerPath, {
        version: clientClickFallback
          ? `aurora-model-proof-120s-prep-verified-temp0-recovery-client-click-continuation-blocker/v${admission.clientClickLaneRetry ? 2 : 1}`
          : `aurora-model-proof-120s-prep-verified-temp0-recovery-continuation-blocker/v${admission.attempt}`,
        status: "failed",
        attempt: admission.attempt,
        createdAtUtc: new Date().toISOString(),
        profile: { path: context.profilePath, sha256: context.profileSha256, id: context.profile.id },
        prepOutDir: context.prepOutDir,
        processId: admission.processId,
        failureToRecovery: admission.evidence,
        continuationPlan: {
          path: continuationPlanPath,
          sha256: sha256File(continuationPlanPath),
          byteLength: statSync(continuationPlanPath).size,
        },
        blockerCode: error?.code ?? "PREP_VERIFIED_TEMP0_RECOVERY_CONTINUATION_EXCEPTION",
        message: error instanceof Error ? error.message : String(error),
        safety: safety(false),
      });
    }
    throw error;
  }
}

function switchExactModule(context, initialDecision) {
  const currentModule = initialDecision.currentModule;
  const processId = initialDecision.processId;
  const steps = [];
  const menu = runAtom("probe-aurora-toolset-main-menu-no-global-input.mjs", ["--module", currentModule], 45_000);
  requireSamePid(menu, processId, "menu-probe");
  steps.push(recordStep(context, "switch-menu-probe", menu));
  const command = findExactFileOpen(menu);
  const invoked = runAtom("invoke-aurora-toolset-main-menu-command-no-global-input.mjs", [
    "--module", currentModule,
    "--topPosition", String(command.topPosition),
    "--itemPosition", String(command.itemPosition),
    "--expectedId", "44",
    "--action", "file-open",
  ], 45_000);
  requireSamePid(invoked, processId, "file-open-command");
  steps.push(recordStep(context, "switch-file-open-command", invoked));
  const dialogState = waitForOpenDialog(processId, 15_000);
  writeJson(resolve(context.prepOutDir, "state-open-dialog.json"), dialogState);
  const moved = runAtom("move-aurora-toolset-dialog-to-frame-monitor-no-global-input.mjs", [
    "--dialogClass", "TdlgModuleSelect", "--dialogTitle", "Open",
  ], 45_000);
  requireSamePid(moved, processId, "move-open-dialog");
  steps.push(recordStep(context, "switch-dialog-move", moved));
  const moduleList = runAtom("read-aurora-toolset-dialog-list-items-no-global-input.mjs", [
    "--dialogClass", "TdlgModuleSelect", "--dialogTitle", "Open",
  ], 45_000);
  requireSamePid(moduleList, processId, "read-module-list");
  const listBinding = bindExactNativeModuleList({
    items: moduleList.items,
    installedModulePath: context.profile.installedModule.path,
    engineLogPath: context.profile.runtime.engineLogPath,
  });
  steps.push(recordStep(context, "switch-module-list-readback", { ...moduleList, exactBinding: listBinding }));
  const selected = runAtom("select-aurora-toolset-dialog-list-item-validated.mjs", [
    "--dialogClass", "TdlgModuleSelect",
    "--dialogTitle", "Open",
    "--targetText", listBinding.targetText,
    "--expectedCount", String(listBinding.itemCount),
  ], 45_000);
  requireExactModuleListSelectionReadback(selected, listBinding, processId);
  steps.push(recordStep(context, "switch-module-list-selection", selected));
  const opened = runAtom("open-aurora-toolset-module-from-dialog-no-global-input.mjs", [
    "--modulePath", context.profile.installedModule.path, "--timeoutMs", "180000",
  ], 220_000);
  const openReadback = requireExactModuleOpenReadback(opened, { ...listBinding, processId, listSelectionVerified: true });
  steps.push(recordStep(context, "switch-exact-open", { ...opened, prepReadback: openReadback }));
  const postState = inspectHostState();
  const postDecision = decidePrepRoute(context, postState);
  if (!new Set(["load-area", "adopt"]).has(postDecision.route) || postDecision.processId !== processId) {
    fail("PREP_SWITCH_POSTCONDITION_FAILED", JSON.stringify(postDecision));
  }
  writeJson(resolve(context.prepOutDir, "state-after-switch.json"), postState);
  return { processId, steps };
}

function openExactArea(context) {
  const queuePath = resolve(context.prepOutDir, "area-queue.json");
  const areaOutDir = resolve(context.prepOutDir, "area-open");
  writeJson(queuePath, {
    version: "aurora-m0-toolset-queue/v1",
    profileId: context.profile.id,
    items: [{ name: context.profile.area.displayName, resref: context.profile.area.resref }],
  });
  const result = runAtom("run-toolset-area-oracle-queue.mjs", [
    "--queue", queuePath,
    "--expectedModule", context.target.moduleName,
    "--expectedModuleParts", `${context.target.moduleResref}|mod`,
    "--settleMs", "0",
    "--wheelSteps", "0",
    "--capture", "false",
    "--outDir", areaOutDir,
  ], 150_000);
  if (result.status !== "completed" || result.queueCount !== 1 || result.counts?.opened !== 1 || result.firstBlocker != null) {
    fail("PREP_AREA_QUEUE_FAILED", JSON.stringify(result));
  }
  return result;
}

function findExactFileOpen(menu) {
  const files = (menu.items ?? []).filter((item) => normalizeMenuText(item.text) === "file");
  if (files.length !== 1) fail("PREP_FILE_MENU_AMBIGUOUS", String(files.length));
  const matches = (files[0].children ?? []).filter((item) => Number(item.id) === 44 && item.enabled === true && item.separator !== true);
  if (matches.length !== 1) fail("PREP_FILE_OPEN_COMMAND_AMBIGUOUS", String(matches.length));
  return { topPosition: files[0].position, itemPosition: matches[0].position };
}

function waitForOpenDialog(expectedPid, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = inspectHostState();
    const classified = classifyExactOpenDialogState(state, expectedPid);
    if (classified.status === "ready") return state;
    sleepMs(100);
  }
  fail("PREP_OPEN_DIALOG_TIMEOUT", String(expectedPid));
}

function decidePrepRoute(context, state) {
  if (!Array.isArray(state?.nwmain) || !Array.isArray(state?.toolsets)) fail("PREP_STATE_SCHEMA_INVALID", "process arrays missing");
  if (state.nwmain.length !== 0) fail("PREP_NWN_PROCESS_PRESENT", String(state.nwmain.length));
  if (state.toolsets.length > 1) fail("PREP_SECOND_TOOLSET_PROCESS", String(state.toolsets.length));
  if (state.toolsets.length === 0) return { route: "cold", reason: "zero_toolset_processes", processId: null, currentModule: null };

  const session = state.toolsets[0];
  if (!Number.isInteger(session.pid) || session.pid <= 0) fail("PREP_TOOLSET_PID_INVALID", String(session.pid));
  if (session.responding !== true) fail("PREP_TOOLSET_NOT_RESPONDING", String(session.pid));
  if (!session.frame || session.frame.className !== "TfrmFrame") fail("PREP_FRAME_IDENTITY_MISSING", String(session.pid));
  if (session.frame.monitor?.primary !== false) fail("PREP_FRAME_ON_PRIMARY", JSON.stringify(session.frame.monitor ?? null));
  const title = String(session.frame.title ?? "").trim();
  if (title.endsWith("*")) fail("PREP_DIRTY_MODULE_FRAME", title);
  if (!Array.isArray(session.modals) || session.modals.length !== 0) fail("PREP_UNEXPECTED_MODAL", JSON.stringify(session.modals ?? null));
  const currentModule = parseModuleName(title);
  if (!currentModule) fail("PREP_MODULE_TITLE_UNREADABLE", title);
  if (currentModule.toLowerCase() !== context.target.moduleName.toLowerCase()) {
    return { route: "switch", reason: "clean_other_module", processId: session.pid, currentModule };
  }

  if (!Array.isArray(session.areaViewers)) fail("PREP_AREA_VIEWER_STATE_MISSING", String(session.pid));
  const exactViewers = session.areaViewers.filter((viewer) => normalizeArea(viewer.resref ?? viewer.title) === context.profile.area.resref.toLowerCase());
  if (exactViewers.length > 1) fail("PREP_EXACT_AREA_VIEWER_AMBIGUOUS", String(exactViewers.length));
  const viewportResolution = exactViewers.length === 1 ? classifyCanonicalViewportCandidates(exactViewers[0].viewports) : null;
  if (viewportResolution && viewportResolution.canonicalCount > 1) {
    fail("PREP_EXACT_AREA_VIEWPORT_COUNT_INVALID", String(viewportResolution.canonicalCount));
  }
  if (viewportResolution?.canonicalCount === 1) {
    return { route: "adopt", reason: "exact_module_area_viewport_ready", processId: session.pid, currentModule, area: context.profile.area.resref };
  }
  return { route: "load-area", reason: "exact_module_area_viewport_missing", processId: session.pid, currentModule, area: context.profile.area.resref };
}

function inspectHostState() {
  const source = String.raw`
$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class M2APrepProbe{public delegate bool E(IntPtr h,IntPtr l);[StructLayout(LayoutKind.Sequential)]public struct R{public int Left,Top,Right,Bottom;}[DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);}
'@
function T([IntPtr]$h){$b=[Text.StringBuilder]::new(1024);[void][M2APrepProbe]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};function C([IntPtr]$h){$b=[Text.StringBuilder]::new(128);[void][M2APrepProbe]::GetClassName($h,$b,$b.Capacity);$b.ToString()};function Rect([IntPtr]$h){$r=New-Object 'M2APrepProbe+R';if(-not[M2APrepProbe]::GetWindowRect($h,[ref]$r)){throw 'prep_get_window_rect_failed'};[pscustomobject]@{left=$r.Left;top=$r.Top;width=$r.Right-$r.Left;height=$r.Bottom-$r.Top}}
$nwn=@((Get-Process nwmain -ErrorAction SilentlyContinue)|ForEach-Object{[pscustomobject]@{pid=$_.Id;startedAtUtc=$_.StartTime.ToUniversalTime().ToString('o');responding=$_.Responding}})
$toolsets=@();foreach($p in @(Get-Process nwtoolset -ErrorAction SilentlyContinue)){[uint32]$pidValue=$p.Id;$script:top=@();[void][M2APrepProbe]::EnumWindows([M2APrepProbe+E]{param($h,$l);[uint32]$q=0;[void][M2APrepProbe]::GetWindowThreadProcessId($h,[ref]$q);if($q-eq$pidValue-and[M2APrepProbe]::IsWindowVisible($h)){$script:top += [pscustomobject]@{hwnd=$h.ToInt64();className=(C $h);title=(T $h)}};$true},[IntPtr]::Zero);$frames=@($script:top|Where-Object{$_.className-eq'TfrmFrame'});$frameValue=$null;$modals=@($script:top|Where-Object{$_.className-ne'TfrmFrame'-and$_.className-ne'TApplication'});$viewers=@();if($frames.Count-eq1){$frameHwnd=[IntPtr][int64]$frames[0].hwnd;$screen=[Windows.Forms.Screen]::FromHandle($frameHwnd);$frameValue=[pscustomobject]@{hwnd=$frames[0].hwnd;className='TfrmFrame';title=$frames[0].title;monitor=[pscustomobject]@{deviceName=$screen.DeviceName;primary=$screen.Primary}};$script:areaWindows=@();[void][M2APrepProbe]::EnumChildWindows($frameHwnd,[M2APrepProbe+E]{param($h,$l);if([M2APrepProbe]::IsWindowVisible($h)-and(C $h)-eq'TfrmViewerArea'){$script:areaWindows += $h};$true},[IntPtr]::Zero);foreach($viewer in $script:areaWindows){$script:ports=@();[void][M2APrepProbe]::EnumChildWindows($viewer,[M2APrepProbe+E]{param($h,$l);if([M2APrepProbe]::IsWindowVisible($h)-and(C $h)-eq'TScrollBox'){$bounds=Rect $h;$script:ports += [pscustomobject]@{hwnd=$h.ToInt64();bounds=$bounds;captureEligible=($bounds.width-ge400-and$bounds.height-ge300)}};$true},[IntPtr]::Zero);$eligible=@($script:ports|Where-Object{$_.captureEligible});$viewerTitle=(T $viewer).Trim();$viewerResref=$viewerTitle.TrimStart('-').Trim();$viewers += [pscustomobject]@{hwnd=$viewer.ToInt64();title=$viewerTitle;resref=$viewerResref;viewports=@($script:ports);rawViewportCount=$script:ports.Count;canonicalViewportCount=$eligible.Count;canonicalViewportHwnd=if($eligible.Count-eq1){$eligible[0].hwnd}else{$null}}}};$toolsets += [pscustomobject]@{pid=$p.Id;startedAtUtc=$p.StartTime.ToUniversalTime().ToString('o');responding=$p.Responding;frame=$frameValue;frameCount=$frames.Count;modals=@($modals);areaViewers=@($viewers)}}
[pscustomobject]@{version='aurora-model-proof-120s-prep-state/v1';capturedAtUtc=[DateTime]::UtcNow.ToString('o');nwmain=@($nwn);toolsets=@($toolsets)}|ConvertTo-Json -Depth 8 -Compress
`;
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", source], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
    timeout: 20_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) fail("PREP_HOST_STATE_PROBE_FAILED", String(result.stderr || result.stdout).trim());
  try { return JSON.parse(result.stdout.trim()); } catch { fail("PREP_HOST_STATE_JSON_INVALID", result.stdout.trim()); }
}

function loadContext(path, output, { continuation = false } = {}) {
  const profile = validateModelProofProfile(readJson(path));
  const profileSha256 = sha256File(path);
  const references = [profile.binaryProfile, profile.toolsetProfile, profile.runtimeProfile];
  for (const artifact of references) requireExactFile(artifact.path, artifact.sha256);
  const routeResolution = loadRouteManifestWithSupersession({
    manifestPath: profile.routeManifest.path,
    expectedSha256: profile.routeManifest.sha256,
  });
  const binaryProfilePath = resolve(profile.binaryProfile.path);
  const binaryProfile = readJson(binaryProfilePath);
  const toolsetProfile = readJson(profile.toolsetProfile.path);
  const runtimeProfile = readJson(profile.runtimeProfile.path);
  if (!binaryProfile?.module?.resref || binaryProfile.module.sha256 !== profile.installedModule.sha256) fail("PREP_BINARY_MODULE_BINDING_MISMATCH", binaryProfilePath);
  if (binaryProfile.area?.resref !== profile.area.resref || JSON.stringify(binaryProfile.entryPoint?.position) !== JSON.stringify(profile.area.entryPoint)) fail("PREP_BINARY_AREA_BINDING_MISMATCH", binaryProfilePath);
  if (toolsetProfile.binaryProfile?.sha256 !== profile.binaryProfile.sha256 || toolsetProfile.fixtureSelection?.fixtureId !== profile.fixture.id || toolsetProfile.fixtureSelection?.treeObjectText !== profile.fixture.treeObjectText || toolsetProfile.fixtureSelection?.occurrence !== profile.fixture.occurrence || toolsetProfile.capture?.targetClass !== "TScrollBox" || toolsetProfile.capture?.allowUniformScene !== false || toolsetProfile.noSave !== true) fail("PREP_TOOLSET_PROFILE_BINDING_MISMATCH", profile.toolsetProfile.path);
  if (runtimeProfile.module?.sha256 !== profile.installedModule.sha256 || runtimeProfile.module?.area !== profile.area.resref || JSON.stringify(runtimeProfile.module?.entryPoint) !== JSON.stringify(profile.area.entryPoint)) fail("PREP_RUNTIME_PROFILE_BINDING_MISMATCH", profile.runtimeProfile.path);
  const expectedHaks = profile.orderedHakList.map(({ resref, sha256 }) => ({ resref, sha256 }));
  const binaryHaks = (binaryProfile.orderedHakList ?? []).map(({ resref, sha256 }) => ({ resref, sha256 }));
  const runtimeHaks = (runtimeProfile.orderedHakList ?? []).map(({ resref, sha256 }) => ({ resref, sha256 }));
  if (JSON.stringify(binaryHaks) !== JSON.stringify(expectedHaks) || JSON.stringify(runtimeHaks) !== JSON.stringify(expectedHaks)) fail("PREP_ORDERED_HAK_BINDING_MISMATCH", profile.id);
  const target = {
    moduleResref: binaryProfile.module.resref,
    moduleName: `${binaryProfile.module.resref}.mod`,
    installedModulePath: resolve(profile.installedModule.path),
    areaResref: profile.area.resref,
  };
  if (basename(target.installedModulePath).toLowerCase() !== target.moduleName.toLowerCase()) fail("PREP_INSTALLED_MODULE_NAME_MISMATCH", target.installedModulePath);
  bindExactNativeModuleList({ items: [target.moduleName], installedModulePath: target.installedModulePath, engineLogPath: profile.runtime.engineLogPath });
  const lineageParent = dirname(dirname(resolve(profile.outputRoot)));
  const outputLayout = continuation
    ? validatePrepContinuationLayout({ prepOutDir: output, outputRoot: profile.outputRoot, lineageParent })
    : validatePrepOutputLayout({ prepOutDir: output, outputRoot: profile.outputRoot, lineageParent });
  return {
    profile,
    profilePath: resolve(path),
    profileSha256,
    binaryProfilePath,
    binaryProfile,
    routeManifestPath: routeResolution.manifestPath,
    routeManifestSha256: routeResolution.manifestSha256,
    routeManifestSupersession: routeResolution.admission,
    prepOutDir: output,
    outputLayout,
    target,
  };
}

function verifyImmutableInputs(context) {
  requireExactFile(context.binaryProfile.module.path, context.profile.installedModule.sha256);
  requireExactFile(context.profile.installedModule.path, context.profile.installedModule.sha256, context.profile.installedModule.byteLength);
  if (sha256File(context.binaryProfile.module.path) !== sha256File(context.profile.installedModule.path)) fail("PREP_SOURCE_INSTALLED_MODULE_MISMATCH", context.target.moduleName);
  if (context.binaryProfile.orderedHakList.length !== context.profile.orderedHakList.length) fail("PREP_ORDERED_HAK_COUNT_MISMATCH", context.profile.id);
  for (let index = 0; index < context.profile.orderedHakList.length; index += 1) {
    const expected = context.profile.orderedHakList[index];
    const binary = context.binaryProfile.orderedHakList[index];
    if (expected.resref !== binary.resref || expected.sha256 !== binary.sha256) fail("PREP_ORDERED_HAK_BINDING_MISMATCH", String(index));
    requireExactFile(expected.path, expected.sha256, expected.byteLength);
  }
}

function readStateFixture(path) {
  const fixture = readJson(path);
  if (fixture.version !== "aurora-model-proof-120s-prep-state-fixture/v1") fail("PREP_STATE_FIXTURE_VERSION_INVALID", path);
  return fixture;
}

function readEvidenceJson(path, codePrefix) {
  const full = resolve(path);
  if (!existsSync(full)) fail(`${codePrefix}_MISSING`, full);
  const entry = lstatSync(full);
  if (entry.isSymbolicLink()) fail(`${codePrefix}_REPARSE_POINT`, full);
  if (!entry.isFile()) fail(`${codePrefix}_NOT_FILE`, full);
  const bytes = readFileSync(full);
  let value;
  try { value = JSON.parse(bytes.toString("utf8")); } catch { fail(`${codePrefix}_JSON_INVALID`, full); }
  return { path: full, bytes, sha256: createHash("sha256").update(bytes).digest("hex"), byteLength: bytes.length, value };
}

function evidenceIdentity(value) {
  return { path: value.path, sha256: value.sha256, byteLength: value.byteLength };
}

function runAtom(name, args, timeoutMs) {
  const result = spawnSync(process.execPath, [resolve(here, name), ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
    timeout: timeoutMs,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) fail("PREP_ATOM_PROCESS_FAILED", `${name}: ${result.error.message}`);
  let payload;
  try { payload = JSON.parse(String(result.stdout ?? "").trim()); } catch { fail("PREP_ATOM_JSON_INVALID", `${name}: ${String(result.stderr || result.stdout).trim()}`); }
  if (result.status !== 0 || payload.ok === false || payload.status === "blocked") fail(payload.blockerCode ?? "PREP_ATOM_REJECTED", `${name}: ${payload.message ?? JSON.stringify(payload)}`);
  requirePrepChildSafety(payload, name);
  return payload;
}

function requireSamePid(payload, expected, name) {
  const actual = Number(payload.processId ?? payload.process?.pid ?? payload.process?.Id);
  if (actual !== expected) fail("PREP_ATOM_PID_MISMATCH", `${name}: ${expected} -> ${actual}`);
}

function recordStep(context, name, result) {
  const value = { name, completedAtUtc: new Date().toISOString(), result };
  writeJson(resolve(context.prepOutDir, `${name}.json`), value);
  return { name, resultPath: resolve(context.prepOutDir, `${name}.json`) };
}

function parseModuleName(title) {
  const match = / - ([^\\/:*?"<>|]+\.mod)$/iu.exec(title);
  return match?.[1] ?? null;
}

function normalizeArea(value) { return String(value ?? "").trim().replace(/^-\s*/u, "").toLowerCase(); }
function normalizeMenuText(value) { return String(value ?? "").replace(/&/gu, "").replace(/\.\.\.$/u, "").trim().toLowerCase(); }
function samePath(left, right) { return resolve(String(left ?? "")).toLowerCase() === resolve(String(right ?? "")).toLowerCase(); }
function sleepMs(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
function sha256File(path) { return createHash("sha256").update(readFileSync(resolve(path))).digest("hex"); }
function readJson(path) { return JSON.parse(readFileSync(resolve(path), "utf8")); }
function writeJson(path, value) { writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" }); }
function print(value) { console.log(JSON.stringify(value, null, 2)); }

function requireExactFile(path, sha256, byteLength = null) {
  const full = resolve(path);
  if (!existsSync(full)) fail("PREP_ARTIFACT_MISSING", full);
  if (byteLength != null && statSync(full).size !== byteLength) fail("PREP_ARTIFACT_LENGTH_MISMATCH", full);
  if (sha256File(full) !== sha256) fail("PREP_ARTIFACT_HASH_MISMATCH", full);
}

function requiredAbsolutePath(value, name) {
  const text = String(value ?? "").trim();
  if (!text || !isAbsolute(text)) fail("PREP_PATH_INVALID", `${name}: ${text}`);
  return resolve(text);
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith("--") || value == null || value.startsWith("--")) fail("PREP_ARGUMENT_INVALID", key ?? "end");
    parsed[key.slice(2)] = value;
    index += 1;
  }
  return parsed;
}

function safety(startsToolset) {
  return {
    startsToolset,
    startsNwn: false,
    usesGlobalInput: false,
    savesModule: false,
    buildsModule: false,
    changesIniOrMru: false,
    changesCamera: false,
  };
}

function fail(code, message) {
  const error = new Error(String(message));
  error.code = code;
  throw error;
}
