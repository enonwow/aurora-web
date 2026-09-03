const OBSERVABILITY_VERSION = "aurora-vfx-runtime-observability/v1";
const EXPECTED_POST_DRAW_BLOCKER = "canonical-draw-ledger-empty";

export function assertVfxCaptureProofBundle(activeProofState, finalProofState) {
  const activeObservability = requireObservability(activeProofState, "active capture");
  if (
    activeObservability.proofGate?.status !== "pass" ||
    (activeObservability.proofGate?.blockerManifest?.length ?? 0) !== 0
  ) {
    throw new Error(
      `VFX active capture proof gate did not pass: ${JSON.stringify(
        activeObservability.proofGate ?? null
      )}`
    );
  }
  assertSinglePlaybackGuard(activeObservability.playbackGuard, false, "active");

  const finalObservability = requireObservability(finalProofState, "final capture");
  const finalBlockers = finalObservability.proofGate?.blockerManifest ?? [];
  const finalGateAccepted =
    (finalObservability.proofGate?.status === "pass" && finalBlockers.length === 0) ||
    (finalObservability.proofGate?.status === "fail" &&
      finalBlockers.length === 1 &&
      finalBlockers[0] === EXPECTED_POST_DRAW_BLOCKER);
  if (!finalGateAccepted) {
    throw new Error(
      `VFX capture has an unexpected final proof blocker: ${JSON.stringify(
        finalObservability.proofGate ?? null
      )}`
    );
  }
  assertSinglePlaybackGuard(finalObservability.playbackGuard, true, "final");

  return { activeObservability, finalObservability };
}

export function assertVfxCaptureProofGate(proofState) {
  const observability = requireObservability(proofState, "capture");
  if (
    observability.proofGate?.status !== "pass" ||
    (observability.proofGate?.blockerManifest?.length ?? 0) !== 0
  ) {
    throw new Error(
      `VFX capture proof gate did not pass: ${JSON.stringify(
        observability.proofGate ?? null
      )}`
    );
  }

  const playback = observability.playbackGuard;
  const playbackAccepted =
    playback?.status === "pass" &&
    playback.triggerCount === 1 &&
    playback.loop === false &&
    playback.overlapCount === 0 &&
    playback.completed === true &&
    playback.postDurationHidden === true &&
    playback.postDurationHiddenRequired === true;
  if (!playbackAccepted) {
    throw new Error(
      `VFX capture playback guard did not prove one completed hidden playback: ${JSON.stringify(
        playback ?? null
      )}`
    );
  }

  return observability;
}

function requireObservability(proofState, label) {
  const observability = proofState?.runtimeObservability;
  if (observability?.version !== OBSERVABILITY_VERSION) {
    throw new Error(
      `VFX ${label} observability is missing or unsupported: ${
        observability?.version ?? "missing"
      }`
    );
  }
  return observability;
}

function assertSinglePlaybackGuard(playback, requireCompleted, label) {
  const accepted =
    playback?.status === "pass" &&
    playback.triggerCount === 1 &&
    playback.loop === false &&
    playback.overlapCount === 0 &&
    (!requireCompleted ||
      (playback.completed === true &&
        playback.postDurationHidden === true &&
        playback.postDurationHiddenRequired === true));
  if (!accepted) {
    throw new Error(
      `VFX ${label} playback guard did not prove the required single playback state: ${JSON.stringify(
        playback ?? null
      )}`
    );
  }
}

export function assertVfxStaticPreflightObservability(observability) {
  if (observability?.version !== OBSERVABILITY_VERSION) {
    throw new Error(
      `VFX static preflight observability is missing or unsupported: ${
        observability?.version ?? "missing"
      }`
    );
  }
  const accepted =
    observability.identityStatus === "ready" &&
    observability.hostGraphStatus === "pass" &&
    observability.assetSettlementStatus === "settled" &&
    observability.drawLedgerStatus === "pass" &&
    observability.particleShaderLedgerStatus === "pass" &&
    observability.playbackGuard?.status === "pass" &&
    observability.playbackGuard.triggerCount === 1 &&
    observability.playbackGuard.loop === false &&
    observability.playbackGuard.overlapCount === 0 &&
    observability.proofGate?.status === "pass" &&
    (observability.proofGate.blockerManifest?.length ?? 0) === 0;
  if (!accepted) {
    throw new Error(
      `VFX static preflight observability did not pass: ${JSON.stringify(
        observability
      )}`
    );
  }
  return observability;
}
