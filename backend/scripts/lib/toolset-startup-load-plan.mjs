import { resolve } from "node:path";

export const TOOLSET_LOAD_OWNERS = Object.freeze({
  RECOVERY: "recovery",
  MRU: "mru",
  EXPLICIT_OPEN: "explicit_open",
  EXTERNAL: "external",
});

export const DEFAULT_TOOLSET_STARTUP_PASSIVE_OBSERVATION_MS = 0;
export const TOOLSET_APPROVED_PROOF_WINDOW_LEFT = -1920;

export function isApprovedToolsetProofWindowLeft(value) {
  return Number(value) === TOOLSET_APPROVED_PROOF_WINDOW_LEFT;
}

export const TOOLSET_STARTUP_SIGNAL_KINDS = Object.freeze({
  EXPECTED_MODULE_WINDOW: "expected_module_window",
  UNEXPECTED_MODULE_WINDOW: "unexpected_module_window",
  PROGRESS_DIALOG: "progress_dialog",
  RECOVERY_PROMPT: "recovery_prompt",
});

export function normalizeToolsetModulePath(value) {
  const text = String(value ?? "").trim().replace(/^"|"$/gu, "");
  if (!text) return "";
  return resolve(text).replaceAll("/", "\\").toLowerCase();
}

export function buildToolsetStartupLoadPlan({
  modulePath,
  currentMru0,
  passiveObservationMs = DEFAULT_TOOLSET_STARTUP_PASSIVE_OBSERVATION_MS,
}) {
  const normalizedModulePath = normalizeToolsetModulePath(modulePath);
  const normalizedMru0 = normalizeToolsetModulePath(currentMru0);
  const expectedMruMatches = Boolean(
    normalizedModulePath && normalizedMru0 && normalizedModulePath === normalizedMru0,
  );

  return {
    mode: "passive_observation_then_explicit_open",
    loadOwner: null,
    observedExternalLoadOwner: expectedMruMatches
      ? TOOLSET_LOAD_OWNERS.MRU
      : TOOLSET_LOAD_OWNERS.EXTERNAL,
    expectedMruMatches,
    explicitOpenAllowed: false,
    passiveObservationMs,
    normalizedModulePath,
    normalizedMru0,
    reason:
      "Observe Toolset without input first. Explicit Open becomes eligible only after a stable blank/welcome surface completes the passive window with zero module-load signals.",
  };
}

export function evaluateToolsetStartupObservation({
  plan,
  elapsedMs,
  stableSurfaceMs,
  surfaceKind,
  observedSignals = [],
  loadOwner = null,
}) {
  const signals = observedSignals.filter(Boolean);
  const firstSignal = signals[0] ?? null;
  const owner =
    loadOwner ??
    (firstSignal?.kind === TOOLSET_STARTUP_SIGNAL_KINDS.RECOVERY_PROMPT
      ? TOOLSET_LOAD_OWNERS.RECOVERY
      : firstSignal
        ? plan.observedExternalLoadOwner
        : null);

  if (owner || firstSignal) {
    return {
      decision: firstSignal?.kind === TOOLSET_STARTUP_SIGNAL_KINDS.RECOVERY_PROMPT ? "block" : "owned_load",
      loadOwner: owner,
      explicitOpenAllowed: false,
      blockerCode:
        firstSignal?.kind === TOOLSET_STARTUP_SIGNAL_KINDS.RECOVERY_PROMPT
          ? "toolset_recovery_prompt_blocked_critical"
          : null,
    };
  }

  const passiveObservationMs = Number(
    plan?.passiveObservationMs ?? DEFAULT_TOOLSET_STARTUP_PASSIVE_OBSERVATION_MS,
  );
  const stableSurface = surfaceKind === "blank_frame" || surfaceKind === "welcome";
  if (
    Number(elapsedMs) < passiveObservationMs ||
    !stableSurface ||
    Number(stableSurfaceMs) < passiveObservationMs
  ) {
    return {
      decision: "observe",
      loadOwner: null,
      explicitOpenAllowed: false,
      blockerCode: null,
    };
  }

  return {
    decision: "explicit_open_eligible",
    loadOwner: null,
    explicitOpenAllowed: true,
    blockerCode: null,
  };
}
