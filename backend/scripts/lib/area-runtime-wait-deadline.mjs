function requirePositiveFiniteMilliseconds(value, label) {
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    throw new Error(`${label} must be a positive finite millisecond value.`);
  }
  return milliseconds;
}

/**
 * A post-mutation settlement may use the full requested capture budget, but
 * never outlive the CDP transport that observes it. Keeping this pure makes
 * an accidental shorter, hidden cap observable in a focused regression test.
 */
export function resolvePostMutationRuntimeWaitDeadline({
  requestedWaitMs,
  chromeCdpTimeoutMs
}) {
  return Math.min(
    requirePositiveFiniteMilliseconds(requestedWaitMs, "requestedWaitMs"),
    requirePositiveFiniteMilliseconds(chromeCdpTimeoutMs, "chromeCdpTimeoutMs")
  );
}

export function resolveMatrixCaptureChildTimeout({
  runtimeWaitMs,
  childOverallGraceMs,
  cleanupGraceMs
}) {
  return (
    requirePositiveFiniteMilliseconds(runtimeWaitMs, "runtimeWaitMs") +
    requirePositiveFiniteMilliseconds(childOverallGraceMs, "childOverallGraceMs") +
    requirePositiveFiniteMilliseconds(cleanupGraceMs, "cleanupGraceMs")
  );
}

/**
 * Matrix capture replaces every cell with its deterministic final fixture
 * before acceptance. Waiting for the generated draft's disposable models
 * first doubles cold conversion work without contributing any proof evidence.
 * Other editing scenarios still rely on the pre-mutation rendered state and
 * therefore retain the readiness gate.
 */
export function shouldWaitForNewAreaRealTileModelsBeforeScenario(scenario) {
  return scenario !== "tile-add-connect-matrix-local";
}
