import {
  defaultAuroraDeterministicRngHook,
  NWN_EE_VFX_RNG_ALGORITHM,
  type AuroraDeterministicRngState
} from "./aurora-vfx-runtime-state";

export type AuroraAoeVisualShape =
  | { shape: "circle"; radius: number }
  | { shape: "rectangle"; width: number; length: number };

export interface AuroraAoeVisualScheduleInput {
  slot: 1 | 2 | 3;
  modelRef: string;
  lowQualityModelRef?: string;
  activeCount: number;
  durationMilliseconds: number;
  edgeWeight: number;
}

export interface AuroraAoeVisualFootprintInput {
  sourceRowId: number;
  sourceLabel: string;
  shape: AuroraAoeVisualShape;
  orientWithGround: boolean;
  seed: number;
  schedule: AuroraAoeVisualScheduleInput[];
}

export interface AuroraAoeVisualFootprintGroup {
  slot: 1 | 2 | 3;
  modelRef: string;
  lowQualityModelRef?: string;
  activeCount: number;
  durationMilliseconds: number;
  edgeWeight: number;
  edgePercent: number;
}

export interface AuroraAoeVisualFootprintOwner {
  ownerId: string;
  globalIndex: number;
  slot: 1 | 2 | 3;
  localIndex: number;
  modelRef: string;
  lowQualityModelRef?: string;
  initialDelayMilliseconds: number;
  durationMilliseconds: number;
  edgePercent: number;
}

export interface AuroraAoeVisualFootprintContract {
  version: "aurora-aoe-visual-footprint/v1";
  sourceRowId: number;
  sourceLabel: string;
  shape: AuroraAoeVisualShape;
  orientWithGround: boolean;
  seed: number;
  randomSequenceStatus: "deterministic-replay-seed-not-retail-seed";
  groups: AuroraAoeVisualFootprintGroup[];
  owners: AuroraAoeVisualFootprintOwner[];
  lifecycle: {
    impactAnimation: "impact";
    durationAnimation: "duration";
    cessationAnimation: "cessation";
    respawnDelayMilliseconds: 1;
    postRemovalMilliseconds: 3000;
  };
  sourceEvidence: {
    sourceClass: "primary-aurora-runtime";
    audit: string;
    clientOwner: "CNWCAreaOfEffectObject";
  };
}

export interface AuroraAoeVisualAnimationDurations {
  impactMilliseconds: number;
  cessationMilliseconds: number;
}

export type AuroraAoeVisualOwnerPhase =
  | "waiting"
  | "impact"
  | "duration"
  | "cessation"
  | "released";

export interface AuroraAoeVisualOwnerRuntimeSnapshot {
  ownerId: string;
  globalIndex: number;
  slot: 1 | 2 | 3;
  localIndex: number;
  modelRef: string;
  phase: AuroraAoeVisualOwnerPhase;
  cycleIndex: number;
  phaseElapsedMilliseconds: number;
  phaseDurationMilliseconds: number;
  position?: { x: number; y: number; z: number };
  placementMode?: "edge" | "interior";
  orientWithGroundPending: boolean;
  stopRequested: boolean;
}

export interface AuroraAoeVisualRuntimeSnapshot {
  version: "aurora-aoe-visual-runtime-snapshot/v1";
  elapsedMilliseconds: number;
  stopping: boolean;
  released: boolean;
  owners: AuroraAoeVisualOwnerRuntimeSnapshot[];
  telemetry: {
    ownerCount: number;
    phaseCounts: Record<AuroraAoeVisualOwnerPhase, number>;
    groupPhaseCounts: Array<{
      slot: 1 | 2 | 3;
      waiting: number;
      impact: number;
      duration: number;
      cessation: number;
      released: number;
    }>;
  };
}

export interface AuroraAoeVisualRuntimeOptions {
  stopAtMilliseconds?: number;
}

const AOE_RUNTIME_AUDIT =
  "backend/docs/aurora-reverse/vfx-persistent-aoe-runtime-audit-2026-07-19.md";

export function buildAuroraAoeVisualFootprintContract(
  input: AuroraAoeVisualFootprintInput
): AuroraAoeVisualFootprintContract {
  assertNonNegativeInteger(input.sourceRowId, "sourceRowId");
  assertNonBlank(input.sourceLabel, "sourceLabel");
  assertFinite(input.seed, "seed");
  assertShape(input.shape);

  const groups = [...input.schedule]
    .sort((left, right) => left.slot - right.slot)
    .map((entry): AuroraAoeVisualFootprintGroup => {
      assertNonBlank(entry.modelRef, `MODEL0${entry.slot}`);
      assertNonNegativeInteger(entry.activeCount, `NUMACT0${entry.slot}`);
      assertPositiveFinite(
        entry.durationMilliseconds,
        `DURATION0${entry.slot}`
      );
      assertFinite(entry.edgeWeight, `EDGEWGHT0${entry.slot}`);
      const edgeWeight = clamp(entry.edgeWeight, 0, 1);
      return {
        slot: entry.slot,
        modelRef: entry.modelRef.trim().toLowerCase(),
        ...(entry.lowQualityModelRef?.trim()
          ? { lowQualityModelRef: entry.lowQualityModelRef.trim().toLowerCase() }
          : {}),
        activeCount: entry.activeCount,
        durationMilliseconds: Math.trunc(entry.durationMilliseconds),
        edgeWeight,
        edgePercent: Math.min(Math.trunc(edgeWeight * 100), 100)
      };
    });

  const seenSlots = new Set<number>();
  groups.forEach((group) => {
    if (seenSlots.has(group.slot)) {
      throw new Error(`Duplicate AOE visual schedule slot ${group.slot}.`);
    }
    seenSlots.add(group.slot);
  });

  const owners: AuroraAoeVisualFootprintOwner[] = [];
  groups.forEach((group) => {
    for (let localIndex = 0; localIndex < group.activeCount; localIndex += 1) {
      const globalIndex = owners.length;
      owners.push({
        ownerId: `aoe:${input.sourceRowId}:slot:${group.slot}:owner:${localIndex}`,
        globalIndex,
        slot: group.slot,
        localIndex,
        modelRef: group.modelRef,
        ...(group.lowQualityModelRef
          ? { lowQualityModelRef: group.lowQualityModelRef }
          : {}),
        initialDelayMilliseconds: resolveInitialDelayMilliseconds(
          group.slot,
          localIndex
        ),
        durationMilliseconds: group.durationMilliseconds,
        edgePercent: group.edgePercent
      });
    }
  });

  return {
    version: "aurora-aoe-visual-footprint/v1",
    sourceRowId: input.sourceRowId,
    sourceLabel: input.sourceLabel,
    shape: input.shape,
    orientWithGround: input.orientWithGround,
    seed: Math.trunc(input.seed),
    randomSequenceStatus: "deterministic-replay-seed-not-retail-seed",
    groups,
    owners,
    lifecycle: {
      impactAnimation: "impact",
      durationAnimation: "duration",
      cessationAnimation: "cessation",
      respawnDelayMilliseconds: 1,
      postRemovalMilliseconds: 3000
    },
    sourceEvidence: {
      sourceClass: "primary-aurora-runtime",
      audit: AOE_RUNTIME_AUDIT,
      clientOwner: "CNWCAreaOfEffectObject"
    }
  };
}

export function sampleAuroraAoeVisualRuntime(
  contract: AuroraAoeVisualFootprintContract,
  elapsedMilliseconds: number,
  animationDurations: AuroraAoeVisualAnimationDurations,
  options: AuroraAoeVisualRuntimeOptions = {}
): AuroraAoeVisualRuntimeSnapshot {
  assertNonNegativeFinite(elapsedMilliseconds, "elapsedMilliseconds");
  assertPositiveFinite(
    animationDurations.impactMilliseconds,
    "impactMilliseconds"
  );
  assertPositiveFinite(
    animationDurations.cessationMilliseconds,
    "cessationMilliseconds"
  );

  const elapsed = Math.trunc(elapsedMilliseconds);
  const stopAt = options.stopAtMilliseconds;
  if (stopAt !== undefined) {
    assertNonNegativeFinite(stopAt, "stopAtMilliseconds");
  }
  const stopping = stopAt !== undefined && elapsed >= stopAt;
  const released =
    stopping &&
    elapsed >= Math.trunc(stopAt!) + contract.lifecycle.postRemovalMilliseconds;
  const owners = contract.owners.map((owner) =>
    stopping
      ? sampleStoppedOwner(
          contract,
          owner,
          elapsed,
          Math.trunc(stopAt!),
          animationDurations,
          released
        )
      : sampleActiveOwner(contract, owner, elapsed, animationDurations)
  );

  return {
    version: "aurora-aoe-visual-runtime-snapshot/v1",
    elapsedMilliseconds: elapsed,
    stopping,
    released,
    owners,
    telemetry: buildTelemetry(owners)
  };
}

function sampleActiveOwner(
  contract: AuroraAoeVisualFootprintContract,
  owner: AuroraAoeVisualFootprintOwner,
  elapsedMilliseconds: number,
  animationDurations: AuroraAoeVisualAnimationDurations
): AuroraAoeVisualOwnerRuntimeSnapshot {
  const localElapsed = elapsedMilliseconds - owner.initialDelayMilliseconds;
  if (localElapsed < 0) {
    return baseOwnerSnapshot(owner, {
      phase: "waiting",
      cycleIndex: 0,
      phaseElapsedMilliseconds: 0,
      phaseDurationMilliseconds: owner.initialDelayMilliseconds,
      orientWithGroundPending: contract.orientWithGround,
      stopRequested: false
    });
  }

  const cycleDuration =
    animationDurations.impactMilliseconds +
    owner.durationMilliseconds +
    animationDurations.cessationMilliseconds +
    contract.lifecycle.respawnDelayMilliseconds;
  const cycleIndex = Math.floor(localElapsed / cycleDuration);
  const cycleElapsed = localElapsed - cycleIndex * cycleDuration;
  const placement = sampleOwnerPlacement(contract, owner, cycleIndex);
  const impactEnd = animationDurations.impactMilliseconds;
  const durationEnd = impactEnd + owner.durationMilliseconds;
  const cessationEnd = durationEnd + animationDurations.cessationMilliseconds;

  if (cycleElapsed < impactEnd) {
    return baseOwnerSnapshot(owner, {
      phase: "impact",
      cycleIndex,
      phaseElapsedMilliseconds: cycleElapsed,
      phaseDurationMilliseconds: animationDurations.impactMilliseconds,
      ...placement,
      orientWithGroundPending: contract.orientWithGround,
      stopRequested: false
    });
  }
  if (cycleElapsed < durationEnd) {
    return baseOwnerSnapshot(owner, {
      phase: "duration",
      cycleIndex,
      phaseElapsedMilliseconds: cycleElapsed - impactEnd,
      phaseDurationMilliseconds: owner.durationMilliseconds,
      ...placement,
      orientWithGroundPending: contract.orientWithGround,
      stopRequested: false
    });
  }
  if (cycleElapsed < cessationEnd) {
    return baseOwnerSnapshot(owner, {
      phase: "cessation",
      cycleIndex,
      phaseElapsedMilliseconds: cycleElapsed - durationEnd,
      phaseDurationMilliseconds: animationDurations.cessationMilliseconds,
      ...placement,
      orientWithGroundPending: contract.orientWithGround,
      stopRequested: false
    });
  }

  return baseOwnerSnapshot(owner, {
    phase: "waiting",
    cycleIndex,
    phaseElapsedMilliseconds: cycleElapsed - cessationEnd,
    phaseDurationMilliseconds: contract.lifecycle.respawnDelayMilliseconds,
    ...placement,
    orientWithGroundPending: contract.orientWithGround,
    stopRequested: false
  });
}

function sampleStoppedOwner(
  contract: AuroraAoeVisualFootprintContract,
  owner: AuroraAoeVisualFootprintOwner,
  elapsedMilliseconds: number,
  stopAtMilliseconds: number,
  animationDurations: AuroraAoeVisualAnimationDurations,
  parentReleased: boolean
): AuroraAoeVisualOwnerRuntimeSnapshot {
  const stopElapsed = elapsedMilliseconds - stopAtMilliseconds;
  const activeAtStop = sampleActiveOwner(
    contract,
    owner,
    stopAtMilliseconds,
    animationDurations
  );
  const placement =
    activeAtStop.position && activeAtStop.placementMode
      ? {
          position: activeAtStop.position,
          placementMode: activeAtStop.placementMode
        }
      : sampleOwnerPlacement(contract, owner, activeAtStop.cycleIndex);
  const ownerReleased =
    parentReleased ||
    stopElapsed >= animationDurations.cessationMilliseconds;

  return baseOwnerSnapshot(owner, {
    phase: ownerReleased ? "released" : "cessation",
    cycleIndex: activeAtStop.cycleIndex,
    phaseElapsedMilliseconds: ownerReleased
      ? animationDurations.cessationMilliseconds
      : stopElapsed,
    phaseDurationMilliseconds: animationDurations.cessationMilliseconds,
    ...placement,
    orientWithGroundPending: contract.orientWithGround,
    stopRequested: true
  });
}

function sampleOwnerPlacement(
  contract: AuroraAoeVisualFootprintContract,
  owner: AuroraAoeVisualFootprintOwner,
  cycleIndex: number
): {
  position: { x: number; y: number; z: number };
  placementMode: "edge" | "interior";
} {
  let rng: AuroraDeterministicRngState = {
    algorithm: NWN_EE_VFX_RNG_ALGORITHM,
    seed: derivePlacementSeed(contract.seed, owner.globalIndex, cycleIndex)
  };
  const edgeRoll = nextRandom(rng);
  rng = edgeRoll.state;
  const placementMode =
    Math.trunc(edgeRoll.value * 100) < owner.edgePercent ? "edge" : "interior";

  if (contract.shape.shape === "circle") {
    const xSample = nextRandom(rng);
    rng = xSample.state;
    const rawX = (xSample.value * 2 - 1) * contract.shape.radius;
    const x =
      placementMode === "interior"
        ? Math.round(rawX * 100) / 100
        : rawX;
    const maximumY = Math.sqrt(
      Math.max(0, contract.shape.radius ** 2 - x ** 2)
    );
    const ySample = nextRandom(rng);
    const y =
      placementMode === "edge"
        ? (ySample.value < 0.5 ? -1 : 1) * maximumY
        : (ySample.value * 2 - 1) * maximumY;
    return {
      position: { x, y, z: 0 },
      placementMode
    };
  }

  const halfWidth = contract.shape.width / 2;
  const halfLength = contract.shape.length / 2;
  const xSample = nextRandom(rng);
  rng = xSample.state;
  const ySample = nextRandom(rng);
  rng = ySample.state;
  let x = (xSample.value * 2 - 1) * halfWidth;
  let y = (ySample.value * 2 - 1) * halfLength;
  if (placementMode === "edge") {
    const edgeSample = nextRandom(rng);
    const edge = Math.min(3, Math.trunc(edgeSample.value * 4));
    if (edge === 0) x = -halfWidth;
    if (edge === 1) x = halfWidth;
    if (edge === 2) y = -halfLength;
    if (edge === 3) y = halfLength;
  }
  return {
    position: { x, y, z: 0 },
    placementMode
  };
}

function resolveInitialDelayMilliseconds(
  slot: 1 | 2 | 3,
  localIndex: number
): number {
  if (slot === 1) return localIndex * 300;
  if (slot === 2) return 300 + localIndex * 400;
  return 700 + localIndex * 350;
}

function derivePlacementSeed(
  seed: number,
  ownerIndex: number,
  cycleIndex: number
): number {
  return (
    Math.imul(Math.trunc(seed) ^ 0x45d9f3b, 0x27d4eb2d) ^
    Math.imul(ownerIndex + 1, 0x165667b1) ^
    Math.imul(cycleIndex + 1, 0x1b873593)
  ) >>> 0;
}

function nextRandom(state: AuroraDeterministicRngState): {
  value: number;
  state: AuroraDeterministicRngState;
} {
  return defaultAuroraDeterministicRngHook.nextFloat(state);
}

function baseOwnerSnapshot(
  owner: AuroraAoeVisualFootprintOwner,
  runtime: Omit<
    AuroraAoeVisualOwnerRuntimeSnapshot,
    "ownerId" | "globalIndex" | "slot" | "localIndex" | "modelRef"
  >
): AuroraAoeVisualOwnerRuntimeSnapshot {
  return {
    ownerId: owner.ownerId,
    globalIndex: owner.globalIndex,
    slot: owner.slot,
    localIndex: owner.localIndex,
    modelRef: owner.modelRef,
    ...runtime
  };
}

function buildTelemetry(
  owners: AuroraAoeVisualOwnerRuntimeSnapshot[]
): AuroraAoeVisualRuntimeSnapshot["telemetry"] {
  const phaseCounts = createEmptyPhaseCounts();
  const groups = new Map<
    1 | 2 | 3,
    ReturnType<typeof createEmptyPhaseCounts>
  >();
  owners.forEach((owner) => {
    phaseCounts[owner.phase] += 1;
    const group = groups.get(owner.slot) ?? createEmptyPhaseCounts();
    group[owner.phase] += 1;
    groups.set(owner.slot, group);
  });
  return {
    ownerCount: owners.length,
    phaseCounts,
    groupPhaseCounts: [...groups.entries()]
      .sort(([left], [right]) => left - right)
      .map(([slot, counts]) => ({ slot, ...counts }))
  };
}

function createEmptyPhaseCounts(): Record<AuroraAoeVisualOwnerPhase, number> {
  return {
    waiting: 0,
    impact: 0,
    duration: 0,
    cessation: 0,
    released: 0
  };
}

function assertShape(shape: AuroraAoeVisualShape): void {
  if (shape.shape === "circle") {
    assertPositiveFinite(shape.radius, "radius");
    return;
  }
  assertPositiveFinite(shape.width, "width");
  assertPositiveFinite(shape.length, "length");
}

function assertNonBlank(value: string, field: string): void {
  if (!value.trim()) throw new Error(`${field} must be non-blank.`);
}

function assertFinite(value: number, field: string): void {
  if (!Number.isFinite(value)) throw new Error(`${field} must be finite.`);
}

function assertPositiveFinite(value: number, field: string): void {
  if (!(Number.isFinite(value) && value > 0)) {
    throw new Error(`${field} must be a positive finite number.`);
  }
}

function assertNonNegativeFinite(value: number, field: string): void {
  if (!(Number.isFinite(value) && value >= 0)) {
    throw new Error(`${field} must be a non-negative finite number.`);
  }
}

function assertNonNegativeInteger(value: number, field: string): void {
  if (!(Number.isInteger(value) && value >= 0)) {
    throw new Error(`${field} must be a non-negative integer.`);
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
