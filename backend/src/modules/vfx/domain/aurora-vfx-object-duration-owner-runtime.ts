export const AURORA_OBJECT_DURATION_VISUAL_OWNER_VERSION =
  "aurora-object-duration-visual-owner/v2" as const;

export type AuroraObjectDurationVisualOwnerPhase =
  | "impact"
  | "duration"
  | "cessation"
  | "released";

export interface AuroraObjectDurationVisualOwnerContract {
  version: typeof AURORA_OBJECT_DURATION_VISUAL_OWNER_VERSION;
  sourceRowId: number;
  sourceModelResRef: string;
  effectDurationMilliseconds: number;
  animationDurations: {
    impactMilliseconds: number;
    durationMilliseconds: number;
    cessationMilliseconds: number;
  };
  ownerTimers: {
    impactMilliseconds: number;
    cessationMilliseconds: number;
    postRemovalMilliseconds: number;
  };
  postRemovalDelayMilliseconds: number;
  updateSemantics: "integer-delta-no-overshoot-carry";
  removalPacketOrder: "before-object-update";
  evidenceClass: "primary-aurora-runtime-audit";
}

export interface AuroraObjectDurationVisualOwnerSnapshot {
  version: typeof AURORA_OBJECT_DURATION_VISUAL_OWNER_VERSION;
  sourceRowId: number;
  sourceModelResRef: string;
  sampledAtMilliseconds: number;
  updateStepMilliseconds: number;
  lastUpdateAtMilliseconds: number;
  phase: AuroraObjectDurationVisualOwnerPhase;
  active: boolean;
  phaseElapsedMilliseconds: number;
  animationTimeMilliseconds: number;
  animationLoop: boolean;
  ownerTimerRemainingMilliseconds: number;
  postRemovalTimerRemainingMilliseconds: number;
  effectRemovalStarted: boolean;
  removalProcessedAtMilliseconds?: number;
  releaseComplete: boolean;
}

export interface AuroraObjectDurationVisualOwnerSampleOptions {
  updateStepMilliseconds: number;
}

export interface AuroraObjectDurationVisualOwnerUpdateSchedule {
  updateStepMilliseconds: number;
  impactTransitionAtMilliseconds: number;
  removalProcessedAtMilliseconds: number;
  ownerDoneAtMilliseconds: number;
  releaseCompleteAtMilliseconds: number;
}

export function buildAuroraObjectDurationVisualOwnerContract(input: {
  sourceRowId: number;
  sourceModelResRef: string;
  effectDurationMilliseconds: number;
  impactMilliseconds: number;
  durationAnimationMilliseconds: number;
  cessationMilliseconds: number;
  postRemovalMilliseconds?: number;
}): AuroraObjectDurationVisualOwnerContract {
  const effectDurationMilliseconds = finiteNonNegative(
    input.effectDurationMilliseconds,
    "effectDurationMilliseconds"
  );
  const impactMilliseconds = finiteNonNegative(
    input.impactMilliseconds,
    "impactMilliseconds"
  );
  const durationMilliseconds = finiteNonNegative(
    input.durationAnimationMilliseconds,
    "durationAnimationMilliseconds"
  );
  const cessationMilliseconds = finiteNonNegative(
    input.cessationMilliseconds,
    "cessationMilliseconds"
  );
  const postRemovalDelayMilliseconds = truncateAuroraTimerMilliseconds(
    finiteNonNegative(
      input.postRemovalMilliseconds ?? 3_000,
      "postRemovalMilliseconds"
    )
  );
  if (!Number.isInteger(input.sourceRowId) || input.sourceRowId < 0) {
    throw new Error("sourceRowId must be a non-negative integer.");
  }
  const sourceModelResRef = input.sourceModelResRef.trim().toLowerCase();
  if (!sourceModelResRef) {
    throw new Error("sourceModelResRef is required.");
  }
  if (effectDurationMilliseconds < impactMilliseconds) {
    throw new Error(
      "effectDurationMilliseconds cannot end before the impact animation."
    );
  }
  if (durationMilliseconds <= 0) {
    throw new Error("durationAnimationMilliseconds must be greater than zero.");
  }
  const impactTimerMilliseconds = truncateAuroraTimerMilliseconds(
    impactMilliseconds
  );
  const cessationTimerMilliseconds = truncateAuroraTimerMilliseconds(
    cessationMilliseconds
  );

  return {
    version: AURORA_OBJECT_DURATION_VISUAL_OWNER_VERSION,
    sourceRowId: input.sourceRowId,
    sourceModelResRef,
    effectDurationMilliseconds,
    animationDurations: {
      impactMilliseconds,
      durationMilliseconds,
      cessationMilliseconds
    },
    ownerTimers: {
      impactMilliseconds: impactTimerMilliseconds,
      cessationMilliseconds: cessationTimerMilliseconds,
      postRemovalMilliseconds:
        cessationTimerMilliseconds + postRemovalDelayMilliseconds
    },
    postRemovalDelayMilliseconds,
    updateSemantics: "integer-delta-no-overshoot-carry",
    removalPacketOrder: "before-object-update",
    evidenceClass: "primary-aurora-runtime-audit"
  };
}

export function sampleAuroraObjectDurationVisualOwner(
  contract: AuroraObjectDurationVisualOwnerContract,
  sampledAtMilliseconds: number,
  options: AuroraObjectDurationVisualOwnerSampleOptions
): AuroraObjectDurationVisualOwnerSnapshot {
  const sample = finiteNonNegative(sampledAtMilliseconds, "sampledAtMilliseconds");
  const updateStep = finitePositive(
    options.updateStepMilliseconds,
    "updateStepMilliseconds"
  );
  const lastUpdateIndex = boundaryIndexAtOrBefore(sample, updateStep);
  const lastUpdateAtMilliseconds = boundaryAt(lastUpdateIndex, updateStep);
  const lastUpdateWorldMilliseconds = worldMilliseconds(
    lastUpdateAtMilliseconds
  );
  const schedule = resolveAuroraObjectDurationVisualOwnerUpdateSchedule(
    contract,
    { updateStepMilliseconds: updateStep }
  );
  const impactTransitionIndex = boundaryIndexAtOrBefore(
    schedule.impactTransitionAtMilliseconds,
    updateStep
  );
  const impactAnimationOriginMilliseconds = boundaryAt(
    Math.max(0, impactTransitionIndex - 1),
    updateStep
  );
  const removalIndex = boundaryIndexAtOrBefore(
    schedule.removalProcessedAtMilliseconds,
    updateStep
  );
  const removalStarted = lastUpdateIndex >= removalIndex;

  let phase: AuroraObjectDurationVisualOwnerPhase;
  let phaseElapsedMilliseconds: number;
  let animationTimeMilliseconds: number;
  let animationLoop = false;
  let ownerTimerRemainingMilliseconds = 0;
  let postRemovalTimerRemainingMilliseconds = 0;
  let releaseComplete = false;

  if (!removalStarted) {
    if (
      contract.ownerTimers.impactMilliseconds > 0 &&
      lastUpdateIndex < impactTransitionIndex
    ) {
      phase = "impact";
      phaseElapsedMilliseconds = Math.min(
        sample,
        contract.animationDurations.impactMilliseconds
      );
      animationTimeMilliseconds = phaseElapsedMilliseconds;
      ownerTimerRemainingMilliseconds = Math.max(
        0,
        contract.ownerTimers.impactMilliseconds - lastUpdateWorldMilliseconds
      );
    } else {
      phase = "duration";
      phaseElapsedMilliseconds = Math.max(
        0,
        sample - impactAnimationOriginMilliseconds
      );
      animationTimeMilliseconds = positiveModulo(
        phaseElapsedMilliseconds,
        contract.animationDurations.durationMilliseconds
      );
      animationLoop = true;
    }
  } else {
    const previousRemovalBoundaryMilliseconds = boundaryAt(
      Math.max(0, removalIndex - 1),
      updateStep
    );
    const previousRemovalWorldMilliseconds = worldMilliseconds(
      previousRemovalBoundaryMilliseconds
    );
    const removalUpdateElapsedMilliseconds = Math.max(
      0,
      lastUpdateWorldMilliseconds - previousRemovalWorldMilliseconds
    );
    ownerTimerRemainingMilliseconds = Math.max(
      0,
      contract.ownerTimers.cessationMilliseconds -
        removalUpdateElapsedMilliseconds
    );
    postRemovalTimerRemainingMilliseconds = Math.max(
      0,
      contract.ownerTimers.postRemovalMilliseconds -
        removalUpdateElapsedMilliseconds
    );
    releaseComplete = postRemovalTimerRemainingMilliseconds === 0;

    if (
      contract.ownerTimers.cessationMilliseconds > 0 &&
      ownerTimerRemainingMilliseconds > 0
    ) {
      phase = "cessation";
      phaseElapsedMilliseconds = Math.max(
        0,
        sample - previousRemovalBoundaryMilliseconds
      );
      animationTimeMilliseconds = Math.min(
        phaseElapsedMilliseconds,
        contract.animationDurations.cessationMilliseconds
      );
    } else {
      phase = "released";
      phaseElapsedMilliseconds = 0;
      animationTimeMilliseconds = 0;
    }
  }

  return {
    version: contract.version,
    sourceRowId: contract.sourceRowId,
    sourceModelResRef: contract.sourceModelResRef,
    sampledAtMilliseconds: roundMilliseconds(sample),
    updateStepMilliseconds: roundMilliseconds(updateStep),
    lastUpdateAtMilliseconds: roundMilliseconds(lastUpdateAtMilliseconds),
    phase,
    active: phase !== "released",
    phaseElapsedMilliseconds: roundMilliseconds(phaseElapsedMilliseconds),
    animationTimeMilliseconds: roundMilliseconds(animationTimeMilliseconds),
    animationLoop,
    ownerTimerRemainingMilliseconds,
    postRemovalTimerRemainingMilliseconds,
    effectRemovalStarted: removalStarted,
    ...(removalStarted
      ? {
          removalProcessedAtMilliseconds: roundMilliseconds(
            schedule.removalProcessedAtMilliseconds
          )
        }
      : {}),
    releaseComplete
  };
}

export function resolveAuroraObjectDurationVisualOwnerUpdateSchedule(
  contract: AuroraObjectDurationVisualOwnerContract,
  options: AuroraObjectDurationVisualOwnerSampleOptions
): AuroraObjectDurationVisualOwnerUpdateSchedule {
  const updateStep = finitePositive(
    options.updateStepMilliseconds,
    "updateStepMilliseconds"
  );
  const impactTransitionIndex = firstBoundaryIndexForTimer(
    contract.ownerTimers.impactMilliseconds,
    updateStep
  );
  const removalIndex = boundaryIndexAtOrAfter(
    contract.effectDurationMilliseconds,
    updateStep
  );
  const timerOriginIndex = Math.max(0, removalIndex - 1);
  const ownerDoneIndex = firstBoundaryIndexForTimerFromOrigin(
    timerOriginIndex,
    contract.ownerTimers.cessationMilliseconds,
    updateStep
  );
  const releaseCompleteIndex = firstBoundaryIndexForTimerFromOrigin(
    timerOriginIndex,
    contract.ownerTimers.postRemovalMilliseconds,
    updateStep
  );

  return {
    updateStepMilliseconds: roundMilliseconds(updateStep),
    impactTransitionAtMilliseconds: roundMilliseconds(
      boundaryAt(impactTransitionIndex, updateStep)
    ),
    removalProcessedAtMilliseconds: roundMilliseconds(
      boundaryAt(removalIndex, updateStep)
    ),
    ownerDoneAtMilliseconds: roundMilliseconds(
      boundaryAt(ownerDoneIndex, updateStep)
    ),
    releaseCompleteAtMilliseconds: roundMilliseconds(
      boundaryAt(releaseCompleteIndex, updateStep)
    )
  };
}

function firstBoundaryIndexForTimer(timer: number, step: number): number {
  if (timer <= 0) return 0;
  let index = Math.max(1, Math.ceil(timer / step));
  while (worldMilliseconds(boundaryAt(index, step)) < timer) index += 1;
  while (
    index > 1 &&
    worldMilliseconds(boundaryAt(index - 1, step)) >= timer
  ) {
    index -= 1;
  }
  return index;
}

function firstBoundaryIndexForTimerFromOrigin(
  originIndex: number,
  timer: number,
  step: number
): number {
  if (timer <= 0) return originIndex;
  const originWorldMilliseconds = worldMilliseconds(
    boundaryAt(originIndex, step)
  );
  let index = Math.max(originIndex + 1, originIndex + Math.ceil(timer / step));
  while (
    worldMilliseconds(boundaryAt(index, step)) - originWorldMilliseconds < timer
  ) {
    index += 1;
  }
  while (
    index > originIndex + 1 &&
    worldMilliseconds(boundaryAt(index - 1, step)) - originWorldMilliseconds >=
      timer
  ) {
    index -= 1;
  }
  return index;
}

function boundaryIndexAtOrBefore(value: number, step: number): number {
  const ratio = value / step;
  const nearest = Math.round(ratio);
  return Math.max(
    0,
    approximatelyEqual(ratio, nearest) ? nearest : Math.floor(ratio)
  );
}

function boundaryIndexAtOrAfter(value: number, step: number): number {
  if (value <= 0) return 0;
  const ratio = value / step;
  const nearest = Math.round(ratio);
  return Math.max(
    0,
    approximatelyEqual(ratio, nearest) ? nearest : Math.ceil(ratio)
  );
}

function boundaryAt(index: number, step: number): number {
  return index * step;
}

function worldMilliseconds(value: number): number {
  const nearest = Math.round(value);
  return Math.trunc(approximatelyEqual(value, nearest) ? nearest : value);
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function truncateAuroraTimerMilliseconds(value: number): number {
  return Math.trunc(Math.fround(value));
}

function approximatelyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) <=
    Number.EPSILON * 32 * Math.max(1, Math.abs(left), Math.abs(right));
}

function finiteNonNegative(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a finite non-negative number.`);
  }
  return roundMilliseconds(value);
}

function finitePositive(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a finite positive number.`);
  }
  return roundMilliseconds(value);
}

function roundMilliseconds(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
