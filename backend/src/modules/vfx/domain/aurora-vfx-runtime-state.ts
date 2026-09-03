import type {
  AuroraMdlEmitterNode,
  AuroraMdlEmitterSimulation,
  AuroraMdlOrientation,
  AuroraMdlEmitterSourceState,
  AuroraMdlTransform
} from "./aurora-mdl-vfx-source.parser";
import type { AuroraVfxDiagnostic } from "./aurora-vfx-source.parser";
import type { AuroraProgFxType10ProjectileRuntimeContext } from "./aurora-vfx-progfx-type10-projectile";

export type AuroraEmitterRuntimeFamily =
  | "Fountain"
  | "Single"
  | "Explosion"
  | "P2P"
  | "Lightning"
  | "Chunk"
  | "Unknown";

export type AuroraParticleListName = "active" | "free";
export type AuroraParticleResetReason =
  | "spawned"
  | "trail_distance_spawned"
  | "recycled"
  | "cleared_by_family_gate"
  | "explosion_detonate_burst"
  | "p2p_target_path"
  | "lightning_target_path"
  | "single_shot";
export type AuroraParticleDeathReason =
  | "expired_lifetime"
  | "lightning_target_missing"
  | "lightning_point_count_zero"
  | "runtime_reset";

export interface AuroraRuntimeVector3 {
  x: number;
  y: number;
  z: number;
}

export interface AuroraRuntimeColor {
  r: number;
  g: number;
  b: number;
}

export interface AuroraParticleAtlasState {
  frameIndex: number;
  checkpointSeconds: number;
  secondsPerFrame?: number;
  frameStart?: number;
  frameEnd?: number;
}

export interface AuroraParticleRuntimeRecord {
  particleId: number;
  slotIndex: number;
  list: AuroraParticleListName;
  ageSeconds: number;
  lifetimeSeconds: number;
  rotationRadians: number;
  rotationAxis?: AuroraRuntimeVector3;
  particleOrientation?: AuroraMdlOrientation;
  position: AuroraRuntimeVector3;
  previousPosition?: AuroraRuntimeVector3;
  velocity: AuroraRuntimeVector3;
  direction?: AuroraRuntimeVector3;
  landed: boolean;
  contactNormal?: AuroraRuntimeVector3;
  inheritedVelocityMagnitude?: number;
  inheritedVelocityDirection?: AuroraRuntimeVector3;
  acceleration: AuroraRuntimeVector3;
  color: AuroraRuntimeColor;
  alpha: number;
  size: {
    x: number;
    y: number;
  };
  atlas: AuroraParticleAtlasState;
  chunkModelRuntimeRef?: {
    requestedRef: string;
    modelInstanceRef: string;
    status: "active" | "released";
    releasedAtClockSeconds?: number;
  };
  resetReason?: AuroraParticleResetReason;
  deathReason?: AuroraParticleDeathReason;
}

export interface AuroraParticleListMembershipRecord {
  particleId: number;
  slotIndex: number;
  list: AuroraParticleListName;
  changedAtClockSeconds: number;
  resetReason?: AuroraParticleResetReason;
  deathReason?: AuroraParticleDeathReason;
}

export type AuroraDeterministicRngAlgorithm =
  | "aurora-rand15"
  | "nwn-ee-msvc-rand15";

export const NWN_EE_VFX_RNG_ALGORITHM = "nwn-ee-msvc-rand15" as const;

export interface AuroraDeterministicRngState {
  algorithm: AuroraDeterministicRngAlgorithm;
  seed: number;
}

export interface AuroraDeterministicRngHook {
  nextFloat(state: AuroraDeterministicRngState): {
    value: number;
    state: AuroraDeterministicRngState;
  };
}

export interface AuroraParticleCollisionQuery {
  queryId: string;
  emitterNodeName: string;
  sourceModelObjectKey?: string;
  runtimeEmitterIdentity: string;
  sourceFlagsWord: number;
  queryHelperIdentity: string;
  queryHelperInitArguments: {
    enabled: 1;
    includeMask: 0xbfffffff;
    excludeMask: 0xffffffff;
    reserved: 0;
  };
  queryResetGeneration: number;
  staleResultReset: true;
  particleId: number;
  particleLane: "texture" | "chunk";
  currentPosition: AuroraRuntimeVector3;
  predictedPosition: AuroraRuntimeVector3;
  testEndpoint: AuroraRuntimeVector3;
  velocityBeforeCollision: AuroraRuntimeVector3;
  deltaSeconds: number;
  bounceCoefficient: number;
  splatRequested: boolean;
  chunkModelRuntimeRef?: AuroraParticleRuntimeRecord["chunkModelRuntimeRef"];
  chunkExtentScale?: number;
  collisionProfileId: string;
  requestedCollisionClasses: string[];
  collisionServiceEvidence:
    | "aurora-runtime-service"
    | "profile-gated-adapter"
    | "preview-only"
    | "unresolved";
  reason: "bounce";
  status: "context_required" | "pending" | "resolved";
}

export interface AuroraParticleCollisionContactResult {
  status: "noHit" | "hit" | "unsupported" | "previewOnly";
  hitPosition?: AuroraRuntimeVector3;
  contactNormal?: AuroraRuntimeVector3;
  contactNormalProvenance?: string;
  contactDistance?: number;
  segmentParameter?: number;
  collisionOwnerProvenance?: string;
  diagnostics?: AuroraVfxDiagnostic[];
}

export interface AuroraParticleCollisionResult extends AuroraParticleCollisionContactResult {
  queryId: string;
  particleId: number;
  appliedToRuntime: boolean;
  reflectedVelocity?: AuroraRuntimeVector3;
  postNudgePosition?: AuroraRuntimeVector3;
  postNudgeBasePositionSource?: "predicted_position";
  chunkPostHitExtentNudge?: number;
  settled?: boolean;
  landedFlagWriteIntent?: "set" | "preserve";
}

export interface AuroraParticleCollisionContext {
  collisionProfileId: string;
  requestedCollisionClasses: string[];
  serviceEvidence:
    | "aurora-runtime-service"
    | "profile-gated-adapter"
    | "preview-only";
  resolve(query: AuroraParticleCollisionQuery): AuroraParticleCollisionContactResult | undefined;
}

export interface AuroraParticleCollisionQueryHelperState {
  identity: string;
  initArguments: AuroraParticleCollisionQuery["queryHelperInitArguments"];
  resetGeneration: number;
}

export interface AuroraEmitterSourceMotionContext {
  previousPosition: AuroraRuntimeVector3;
  currentPosition: AuroraRuntimeVector3;
  previousOrientation?: AuroraMdlOrientation;
  currentOrientation?: AuroraMdlOrientation;
  previousScale?: number;
  currentScale?: number;
  deltaSeconds?: number;
}

export interface AuroraEmitterSourceMotionResolverInput {
  emitterNodeName: string;
  previousTimeSeconds: number;
  currentTimeSeconds: number;
  previousTransform?: AuroraMdlTransform;
  currentTransform?: AuroraMdlTransform;
}

export interface AuroraEmitterSourceMotionResolver {
  runtimeProfileId: string;
  serviceEvidence: "aurora-runtime-service" | "profile-gated-adapter";
  resolve(input: AuroraEmitterSourceMotionResolverInput): AuroraEmitterSourceMotionContext;
}

export interface AuroraEffectBeamAttachmentContext {
  sourceRef?: string;
  sourcePosition: AuroraRuntimeVector3;
  sourceOrientation?: AuroraMdlOrientation;
  sourceNodeName?: string;
  sourceNodePath?: string[];
  sourceModelHash?: string;
  targetRef?: string;
  targetPosition: AuroraRuntimeVector3;
  targetForward?: AuroraRuntimeVector3;
  targetNodeName?: string;
  targetNodePath?: string[];
  targetModelHash?: string;
}

export interface AuroraEffectBeamAttachmentResolver {
  runtimeProfileId: string;
  serviceEvidence: "aurora-runtime-service" | "profile-gated-adapter";
  resolve(timeSeconds: number): AuroraEffectBeamAttachmentContext;
}

export interface AuroraParticleWindContext {
  source: "aurora-wind-manager";
  resolveDisplacement(input: {
    emitterNodeName: string;
    particleId: number;
    position: AuroraRuntimeVector3;
    deltaSeconds: number;
  }): AuroraRuntimeVector3 | undefined;
  registerPointSource?(input: {
    position: AuroraRuntimeVector3;
    radius: number;
    durationSeconds: number;
    intensity: number;
    sourceEmitterNodeName: string;
  }): void;
}

export interface AuroraEmitterRuntimeContext {
  rngHook?: AuroraDeterministicRngHook;
  /** Active camera in the same Aurora/source coordinate space as particle positions. */
  cameraPosition?: AuroraRuntimeVector3;
  cameraContextSource?:
    | "aurora-active-camera-world-position"
    | "proof-calibrated-camera-relative-to-vfx-owner";
  profile?: {
    runtimeProfileId?: string;
    executionParticleBudget?: number;
    /** @deprecated Execution-safety alias; not an Aurora particle-count field. */
    particleLimit?: number;
  };
  targetRef?: string;
  targetPosition?: AuroraRuntimeVector3;
  targetForward?: AuroraRuntimeVector3;
  targetContextSource?:
    | "source-mdl-child-reference-evaluated-parent-space"
    | "effect-beam-type7-reference-reattach";
  effectBeamAttachment?: AuroraEffectBeamAttachmentContext;
  effectBeamAttachmentResolver?: AuroraEffectBeamAttachmentResolver;
  progFxType10Projectile?: AuroraProgFxType10ProjectileRuntimeContext;
  progFxType10ProjectileActive?: boolean;
  /** False after the Aurora visual owner has completed its post-removal lifetime. */
  visualOwnerActive?: boolean;
  detonateEvents?: Array<{
    timeSeconds: number;
    animationName?: string;
  }>;
  detonateFieldKey?: string;
  collisionContext?: AuroraParticleCollisionContext;
  sourceMotion?: AuroraEmitterSourceMotionContext;
  sourceMotionResolver?: AuroraEmitterSourceMotionResolver;
  ownerMotion?: AuroraEmitterSourceMotionContext;
  partMotion?: AuroraEmitterSourceMotionContext;
  windContext?: AuroraParticleWindContext;
}

export interface AuroraEmitterRuntimeTickInput {
  dtSeconds: number;
  context?: AuroraEmitterRuntimeContext;
}

export interface AuroraDetonateCallbackTraceRecord {
  source: "model-animation-event";
  eventKey: string;
  callbackIndex: number;
  timeSeconds: number;
  animationName?: string;
  latchValueWritten: 1;
  consumedAtLocalClockSeconds: number;
}

export interface AuroraParticleListCapacityGrowthRecord {
  list: "active" | "free";
  previousCapacity: number;
  nextCapacity: number;
  requiredCount: number;
  changedAtClockSeconds: number;
}

export interface AuroraEmitterRuntimeState {
  version: "aurora-vfx-emitter-runtime-state/v1";
  emitterNodeName: string;
  sourceModelObjectKey?: string;
  family: AuroraEmitterRuntimeFamily;
  localClockSeconds: number;
  sourceClockSeconds: number;
  spawnAccumulator: number;
  trailPreviousSourcePosition?: AuroraRuntimeVector3;
  trailResidualVector: AuroraRuntimeVector3;
  lightningDelayTimerSeconds: number;
  lightningCachedSourcePosition?: AuroraRuntimeVector3;
  lightningCachedTargetVector?: AuroraRuntimeVector3;
  nextParticleId: number;
  executionParticleBudget: number;
  activeCapacity: number;
  freeCapacity: number;
  capacityGrowth: AuroraParticleListCapacityGrowthRecord[];
  /** @deprecated Compatibility alias for executionParticleBudget. */
  particleLimit: number;
  rng: AuroraDeterministicRngState;
  source: {
    emitterType?: string;
    chunkName?: string;
    simulation?: AuroraMdlEmitterSimulation;
    sourceState?: AuroraMdlEmitterSourceState;
    atlas?: AuroraMdlEmitterNode["atlas"];
    transform?: AuroraMdlEmitterNode["transform"];
    renderModeRaw?: string;
  };
  particles: AuroraParticleRuntimeRecord[];
  activeParticleIds: number[];
  freeParticleIds: number[];
  membershipLog: AuroraParticleListMembershipRecord[];
  collisionQueryHelper: AuroraParticleCollisionQueryHelperState;
  collisionQueries: AuroraParticleCollisionQuery[];
  collisionResults: AuroraParticleCollisionResult[];
  singleShotEmitted: boolean;
  explosionDetonateOneShotGuard: 0 | 1;
  processedDetonateEventKeys: string[];
  detonateCallbackTrace: AuroraDetonateCallbackTraceRecord[];
  diagnostics: AuroraVfxDiagnostic[];
  lastTickDiagnostics: AuroraVfxDiagnostic[];
}

export interface AuroraEmitterRuntimeSnapshot {
  version: "aurora-vfx-emitter-runtime-snapshot/v1";
  emitterNodeName: string;
  family: AuroraEmitterRuntimeFamily;
  localClockSeconds: number;
  sourceClockSeconds: number;
  trailPreviousSourcePosition?: AuroraRuntimeVector3;
  trailResidualVector: AuroraRuntimeVector3;
  lightningDelayTimerSeconds: number;
  lightningCachedSourcePosition?: AuroraRuntimeVector3;
  lightningCachedTargetVector?: AuroraRuntimeVector3;
  explosionDetonateOneShotGuard: 0 | 1;
  executionParticleBudget: number;
  activeCapacity: number;
  freeCapacity: number;
  capacityGrowth: AuroraParticleListCapacityGrowthRecord[];
  activeParticles: Array<{
    particleId: number;
    ageSeconds: number;
    lifetimeSeconds: number;
    rotationRadians: number;
    rotationAxis?: AuroraRuntimeVector3;
    particleOrientation?: AuroraMdlOrientation;
    position: AuroraRuntimeVector3;
    previousPosition?: AuroraRuntimeVector3;
    velocity: AuroraRuntimeVector3;
    direction?: AuroraRuntimeVector3;
    landed: boolean;
    contactNormal?: AuroraRuntimeVector3;
    inheritedVelocityMagnitude?: number;
    inheritedVelocityDirection?: AuroraRuntimeVector3;
    acceleration: AuroraRuntimeVector3;
    color: AuroraRuntimeColor;
    alpha: number;
    size: { x: number; y: number };
    atlas: AuroraParticleAtlasState;
    chunkModelRuntimeRef?: AuroraParticleRuntimeRecord["chunkModelRuntimeRef"];
  }>;
  freeParticleIds: number[];
  diagnostics: AuroraVfxDiagnostic[];
}

export interface CreateAuroraEmitterRuntimeStateOptions {
  family?: AuroraEmitterRuntimeFamily;
  executionParticleBudget?: number;
  /** @deprecated Execution-safety alias; not an Aurora particle-count field. */
  particleLimit?: number;
  rngAlgorithm?: AuroraDeterministicRngAlgorithm;
  seed?: number;
}

const DEFAULT_EXECUTION_PARTICLE_BUDGET = 4096;
const AURORA_PARTICLE_LIST_INITIAL_CAPACITY = 0x10;
const DEFAULT_RNG_SEED = 0x12345678;
const AURORA_TWO_PI = 6.2831855;
const AURORA_EMITTER_FLAG_P2P = 0x1;
const AURORA_EMITTER_FLAG_P2P_BEZIER = 0x2;
const AURORA_EMITTER_FLAG_AFFECTED_BY_WIND = 0x4;
const AURORA_EMITTER_FLAG_IS_TINTED = 0x8;
const AURORA_EMITTER_FLAG_BOUNCE = 0x10;
const AURORA_EMITTER_FLAG_RANDOM_ATLAS_FRAME = 0x20;
const AURORA_EMITTER_FLAG_INHERIT = 0x40;
const AURORA_EMITTER_FLAG_INHERIT_VEL = 0x80;
const AURORA_EMITTER_FLAG_INHERIT_LOCAL = 0x100;
const AURORA_EMITTER_FLAG_SPLAT = 0x200;
const AURORA_EMITTER_FLAG_INHERIT_PART = 0x400;
const AURORA_COLLISION_BASE_NUDGE = 0.005;
const AURORA_COLLISION_SETTLED_NUDGE = 0.02;
const AURORA_COLLISION_SETTLED_SPEED_SQUARED = 0.5;

export function createAuroraEmitterRuntimeState(
  emitter: AuroraMdlEmitterNode,
  options: CreateAuroraEmitterRuntimeStateOptions = {}
): AuroraEmitterRuntimeState {
  const executionParticleBudget = Math.max(
    1,
    Math.trunc(
      options.executionParticleBudget ??
      options.particleLimit ??
      DEFAULT_EXECUTION_PARTICLE_BUDGET
    )
  );
  const diagnostics: AuroraVfxDiagnostic[] = options.particleLimit !== undefined
    ? [
        {
          code: "VFX_LEGACY_PARTICLE_LIMIT_EXECUTION_BUDGET_ONLY",
          severity: "warn",
          message:
            "Legacy particleLimit was accepted only as a server execution budget; Aurora active/free list capacity remains dynamic."
        }
      ]
    : [];
  return {
    version: "aurora-vfx-emitter-runtime-state/v1",
    emitterNodeName: emitter.nodeName,
    ...(emitter.sourceModelObjectKey
      ? { sourceModelObjectKey: emitter.sourceModelObjectKey }
      : {}),
    family: options.family ?? resolveAuroraEmitterRuntimeFamily(emitter),
    localClockSeconds: 0,
    sourceClockSeconds: 0,
    spawnAccumulator: 0,
    trailResidualVector: zeroVector(),
    lightningDelayTimerSeconds: 0,
    nextParticleId: 1,
    executionParticleBudget,
    activeCapacity: 0,
    freeCapacity: 0,
    capacityGrowth: [],
    particleLimit: executionParticleBudget,
    rng: {
      algorithm: options.rngAlgorithm ?? "aurora-rand15",
      seed: normalizeSeed(options.seed ?? DEFAULT_RNG_SEED)
    },
    source: {
      ...(emitter.emitterType ? { emitterType: emitter.emitterType } : {}),
      ...(emitter.chunkName ? { chunkName: emitter.chunkName } : {}),
      ...(emitter.simulation ? { simulation: emitter.simulation } : {}),
      ...(emitter.sourceState ? { sourceState: emitter.sourceState } : {}),
      ...(emitter.atlas ? { atlas: emitter.atlas } : {}),
      ...(emitter.transform ? { transform: emitter.transform } : {}),
      ...(emitter.renderModeRaw ?? emitter.renderMode
        ? { renderModeRaw: emitter.renderModeRaw ?? emitter.renderMode }
        : {})
    },
    particles: [],
    activeParticleIds: [],
    freeParticleIds: [],
    membershipLog: [],
    collisionQueryHelper: {
      identity: `${emitter.sourceModelObjectKey ?? "source-model-unresolved"}#${emitter.nodeName}:collision-helper`,
      initArguments: {
        enabled: 1,
        includeMask: 0xbfffffff,
        excludeMask: 0xffffffff,
        reserved: 0
      },
      resetGeneration: 0
    },
    collisionQueries: [],
    collisionResults: [],
    singleShotEmitted: false,
    explosionDetonateOneShotGuard: 0,
    processedDetonateEventKeys: [],
    detonateCallbackTrace: [],
    diagnostics,
    lastTickDiagnostics: []
  };
}

export function resolveAuroraEmitterSourceReferenceTargetContext(
  emitter: AuroraMdlEmitterNode
): AuroraEmitterRuntimeContext {
  const references = emitter.referenceNodes ?? [];
  if (references.length !== 1) {
    return {};
  }
  const reference = references[0]!;
  if (reference.parentNodeName !== emitter.nodeName) {
    return {};
  }
  const emitterPosition = vectorFromTuple(emitter.transform?.position);
  const referencePosition = vectorFromTuple(reference.transform?.position);
  const emitterScale =
    typeof emitter.transform?.scale === "number" && Number.isFinite(emitter.transform.scale)
      ? emitter.transform.scale
      : 1;
  const evaluatedReferencePosition = rotateVectorByOrientation(
    scaleVector(referencePosition, emitterScale),
    emitter.transform?.orientation
  );
  const evaluatedReferenceForward = rotateVectorByOrientation(
    orientationForwardVector(reference.transform?.orientation),
    emitter.transform?.orientation
  );
  return {
    targetRef: `source-mdl-reference:${reference.nodeName}`,
    targetPosition: addVector(emitterPosition, evaluatedReferencePosition),
    targetForward: normalizeVectorOrFallback(evaluatedReferenceForward, { x: 0, y: 0, z: 1 }),
    targetContextSource: "source-mdl-child-reference-evaluated-parent-space"
  };
}

export function tickAuroraEmitterRuntime(
  state: AuroraEmitterRuntimeState,
  dtSeconds: number,
  context: AuroraEmitterRuntimeContext = {}
): AuroraEmitterRuntimeState {
  return tickAuroraEmitterRuntimeInput(state, { dtSeconds, context });
}

export function tickAuroraEmitterRuntimeInput(
  state: AuroraEmitterRuntimeState,
  input: AuroraEmitterRuntimeTickInput
): AuroraEmitterRuntimeState {
  const dtSeconds = sanitizeDeltaSeconds(input.dtSeconds);
  const context = input.context ?? {};
  const next = cloneRuntimeState(state);
  next.localClockSeconds += dtSeconds;
  next.sourceClockSeconds += dtSeconds;
  next.lastTickDiagnostics = [];
  next.collisionQueries = [];
  next.collisionResults = [];
  const collisionFrame = captureCollisionFrame(next);

  if (context.visualOwnerActive === false) {
    recycleAllActiveParticles(next, "runtime_reset");
    next.spawnAccumulator = 0;
    addTickDiagnostic(
      next,
      "VFX_VISUAL_OWNER_RELEASED",
      "info",
      "The Aurora visual owner completed post-removal; its emitter particles were released."
    );
    next.diagnostics = mergeDiagnostics(next.diagnostics, next.lastTickDiagnostics);
    return next;
  }

  applyAuroraEmitterSourceMotion(next, context);
  if (context.progFxType10ProjectileActive === false) {
    recycleAllActiveParticles(next, "runtime_reset");
    next.spawnAccumulator = 0;
    addTickDiagnostic(
      next,
      "VFX_PROGFX_TYPE10_PROJECTILE_OWNER_DESTROYED",
      "info",
      "ProgFX Type 10 destroyed its single projectile owner at the path destination; owner emitters and particles were released."
    );
    return next;
  }
  if (next.family !== "Single" && next.family !== "Lightning") {
    ageActiveParticles(next, dtSeconds);
  }

  const p2pMotionEnabled =
    next.family === "P2P" || next.source.simulation?.p2p === true;
  const p2pTargetReady =
    !p2pMotionEnabled || tickP2PRuntime(next, dtSeconds, context);

  if (next.family !== "Single" && p2pTargetReady) {
    resolveCollisionContracts(next, context, collisionFrame, dtSeconds);
  }

  if (p2pTargetReady) {
    switch (next.family) {
      case "Fountain":
      case "P2P":
        tickFountainRuntime(next, dtSeconds, context);
        break;
    case "Single":
      tickSingleRuntime(next, dtSeconds, context);
      resolveCollisionContracts(next, context, collisionFrame, dtSeconds);
      break;
    case "Explosion":
      tickExplosionRuntime(next, dtSeconds, context);
      break;
    case "Lightning":
      tickLightningRuntime(next, dtSeconds, context);
      break;
    case "Chunk":
      tickChunkRuntime(next);
      break;
    default:
      addTickDiagnostic(
        next,
        "VFX_RUNTIME_FAMILY_NOT_IMPLEMENTED",
        "warn",
        `Emitter runtime family '${next.family}' is not implemented in VFX-P7.`
      );
      next.spawnAccumulator = 0;
      break;
    }
  }

  next.diagnostics = mergeDiagnostics(next.diagnostics, next.lastTickDiagnostics);
  return next;
}

export function buildAuroraEmitterRuntimeSnapshot(
  state: AuroraEmitterRuntimeState
): AuroraEmitterRuntimeSnapshot {
  const active = new Set(state.activeParticleIds);
  return {
    version: "aurora-vfx-emitter-runtime-snapshot/v1",
    emitterNodeName: state.emitterNodeName,
    family: state.family,
    localClockSeconds: state.localClockSeconds,
    sourceClockSeconds: state.sourceClockSeconds,
    activeParticles: state.particles
      .filter((particle) => active.has(particle.particleId))
      .map((particle) => ({
        particleId: particle.particleId,
        ageSeconds: particle.ageSeconds,
        lifetimeSeconds: particle.lifetimeSeconds,
        rotationRadians: particle.rotationRadians,
        ...(particle.rotationAxis ? { rotationAxis: { ...particle.rotationAxis } } : {}),
        ...(particle.particleOrientation
          ? { particleOrientation: cloneAuroraMdlOrientation(particle.particleOrientation) }
          : {}),
        position: { ...particle.position },
        ...(particle.previousPosition ? { previousPosition: { ...particle.previousPosition } } : {}),
        velocity: { ...particle.velocity },
        ...(particle.direction ? { direction: { ...particle.direction } } : {}),
        landed: particle.landed,
        ...(particle.contactNormal ? { contactNormal: { ...particle.contactNormal } } : {}),
        ...(particle.inheritedVelocityMagnitude !== undefined
          ? { inheritedVelocityMagnitude: particle.inheritedVelocityMagnitude }
          : {}),
        ...(particle.inheritedVelocityDirection
          ? { inheritedVelocityDirection: { ...particle.inheritedVelocityDirection } }
          : {}),
        acceleration: { ...particle.acceleration },
        color: { ...particle.color },
        alpha: particle.alpha,
        size: { ...particle.size },
        atlas: { ...particle.atlas },
        ...(particle.chunkModelRuntimeRef
          ? { chunkModelRuntimeRef: { ...particle.chunkModelRuntimeRef } }
          : {})
      })),
    freeParticleIds: [...state.freeParticleIds],
    ...(state.trailPreviousSourcePosition
      ? { trailPreviousSourcePosition: { ...state.trailPreviousSourcePosition } }
      : {}),
    trailResidualVector: {
      ...(state.trailResidualVector ?? zeroVector())
    },
    lightningDelayTimerSeconds: state.lightningDelayTimerSeconds,
    ...(state.lightningCachedSourcePosition
      ? { lightningCachedSourcePosition: { ...state.lightningCachedSourcePosition } }
      : {}),
    ...(state.lightningCachedTargetVector
      ? { lightningCachedTargetVector: { ...state.lightningCachedTargetVector } }
      : {}),
    explosionDetonateOneShotGuard: state.explosionDetonateOneShotGuard,
    executionParticleBudget: state.executionParticleBudget,
    activeCapacity: state.activeCapacity,
    freeCapacity: state.freeCapacity,
    capacityGrowth: state.capacityGrowth.map((entry) => ({ ...entry })),
    diagnostics: [...state.diagnostics]
  };
}

export function resolveAuroraEmitterRuntimeFamily(
  emitter: Pick<AuroraMdlEmitterNode, "emitterType" | "chunkName" | "simulation">
): AuroraEmitterRuntimeFamily {
  const token = normalizeEmitterToken(emitter.emitterType);
  if (token.includes("chunk")) {
    return "Chunk";
  }
  if (token.includes("p2p")) {
    return "P2P";
  }
  if (token.includes("fountain")) {
    return "Fountain";
  }
  if (token.includes("single")) {
    return "Single";
  }
  if (token.includes("explosion")) {
    return "Explosion";
  }
  if (token.includes("lightning")) {
    return "Lightning";
  }
  return "Unknown";
}

export const defaultAuroraDeterministicRngHook: AuroraDeterministicRngHook = {
  nextFloat(state) {
    const seed = normalizeSeed(
      state.algorithm === NWN_EE_VFX_RNG_ALGORITHM
        ? (Math.imul(state.seed, 0x343fd) + 0x269ec3) >>> 0
        : (Math.imul(state.seed, 0x15a4e35) + 1) >>> 0
    );
    const sample = (seed >>> 16) & 0x7fff;
    return {
      value: sample / 0x8000,
      state: {
        algorithm: state.algorithm,
        seed
      }
    };
  }
};

function tickFountainRuntime(
  state: AuroraEmitterRuntimeState,
  dtSeconds: number,
  context: AuroraEmitterRuntimeContext
): void {
  const simulation = state.source.simulation ?? {};
  const lifeExp = simulation.lifeExp;
  if (!(typeof lifeExp === "number" && Number.isFinite(lifeExp) && lifeExp > 0)) {
    addTickDiagnostic(
      state,
      "VFX_RUNTIME_LIFEEXP_ZERO_DRAW_GATE",
      "warn",
      "Fountain emitter has zero/non-positive lifeExp; runtime draw/spawn gate remains closed."
    );
    addTickDiagnostic(
      state,
      "VFX_RUNTIME_LIFEEXP_PREVIEW_CLAMP_FORBIDDEN",
      "warn",
      "Fountain runtime did not clamp lifeExp to a preview fallback value."
    );
    state.spawnAccumulator = 0;
    resetTrailEmissionState(state);
    return;
  }

  const birthrate = simulation.birthrate;
  if (!(typeof birthrate === "number" && Number.isFinite(birthrate) && birthrate > 0)) {
    addTickDiagnostic(
      state,
      "VFX_FOUNTAIN_BIRTHRATE_POSITIVE_GATE_REQUIRED",
      "warn",
      "Fountain emitter requires a positive birthrate before particles can spawn."
    );
    addTickDiagnostic(
      state,
      "VFX_FOUNTAIN_NORMAL_ACCUMULATOR_ZERO_RESET_REQUIRED",
      "warn",
      "Fountain spawn accumulator was reset because birthrate is zero or non-positive."
    );
    state.spawnAccumulator = 0;
    resetTrailEmissionState(state);
    return;
  }

  const truncatedBirthrate = truncateAuroraFloatToInt(birthrate);
  if (truncatedBirthrate <= 0) {
    return;
  }

  if (simulation.spawnType === 1) {
    tickFountainTrailRuntime(state, simulation, context, dtSeconds);
    return;
  }

  const evaluatedBirthrate = Math.fround(birthrate);
  const spawnIntervalSeconds = Math.fround(1 / evaluatedBirthrate);
  // Aurora stores both the Fountain interval and accumulator in float fields.
  state.spawnAccumulator = Math.fround(
    Math.fround(state.spawnAccumulator) + Math.fround(dtSeconds)
  );
  if (state.spawnAccumulator < spawnIntervalSeconds) {
    return;
  }

  const truncatedAccumulatedBirths = truncateAuroraFloatToInt(
    state.spawnAccumulator * evaluatedBirthrate
  );
  const spawnCount = truncatedAccumulatedBirths % (truncatedBirthrate + 1);
  state.spawnAccumulator = 0;
  for (let index = 0; index < spawnCount; index += 1) {
    spawnFountainParticle(state, simulation, context, dtSeconds);
  }
}

function tickFountainTrailRuntime(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  context: AuroraEmitterRuntimeContext,
  dtSeconds: number
): void {
  const sourcePosition =
    context.sourceMotion?.currentPosition ??
    vectorFromTuple(state.source.transform?.position);
  const previousSourcePosition =
    state.trailPreviousSourcePosition ??
    context.sourceMotion?.previousPosition ??
    sourcePosition;
  const residualVector = state.trailResidualVector ?? zeroVector();
  const segmentStart = subtractVector(previousSourcePosition, residualVector);
  const segmentVector = subtractVector(sourcePosition, segmentStart);
  const segmentDistance = vectorLength(segmentVector);
  const spawnSpacing = 1 / simulation.birthrate!;

  state.trailPreviousSourcePosition = { ...sourcePosition };
  state.spawnAccumulator = 0;

  if (segmentDistance <= 0 || spawnSpacing <= 0) {
    state.trailResidualVector = segmentDistance <= 0 ? residualVector : zeroVector();
    return;
  }

  const unitVector = scaleVector(segmentVector, 1 / segmentDistance);
  const spawnCount = resolveExecutionSpawnCount(
    state,
    Math.max(0, truncateAuroraFloatToInt(segmentDistance * simulation.birthrate!))
  );
  if (spawnCount < 1) {
    state.trailResidualVector = segmentVector;
    return;
  }

  let lastSpawnPosition = segmentStart;
  for (let index = 0; index < spawnCount; index += 1) {
    const firstActiveParticle = state.activeParticleIds.length === 0;
    const spawnedParticleId = spawnFountainParticle(
      state,
      simulation,
      context,
      dtSeconds,
      undefined,
      "trail_distance_spawned"
    );
    if (spawnedParticleId === undefined) break;
    lastSpawnPosition = firstActiveParticle
      ? segmentStart
      : addVector(segmentStart, scaleVector(unitVector, spawnSpacing * (index + 1)));
    const spawnedParticle = state.particles.find(
      (particle) => particle.particleId === spawnedParticleId
    );
    if (spawnedParticle) {
      spawnedParticle.position = lastSpawnPosition;
    }
  }
  state.trailResidualVector = subtractVector(sourcePosition, lastSpawnPosition);
}

function tickSingleRuntime(
  state: AuroraEmitterRuntimeState,
  dtSeconds: number,
  context: AuroraEmitterRuntimeContext
): void {
  const simulation = state.source.simulation ?? {};
  const evaluatedActiveState = Number.isFinite(simulation.birthrate)
    ? truncateAuroraFloatToInt(simulation.birthrate!)
    : 0;
  const activeParticleIds = [...state.activeParticleIds];

  if (evaluatedActiveState === 0) {
    if (activeParticleIds.length > 0) {
      activeParticleIds.forEach((particleId) => {
        const particle = state.particles.find((entry) => entry.particleId === particleId);
        if (particle) retireSingleParticleWithoutPooling(state, particle);
      });
      addTickDiagnostic(
        state,
        "VFX_SINGLE_ACTIVE_STATE_INACTIVE_CLEARED",
        "info",
        "Single removed its active particle after the evaluated active-state gate became zero."
      );
    }
    state.singleShotEmitted = false;
    state.spawnAccumulator = 0;
    if (!Number.isFinite(simulation.birthrate)) {
      addTickDiagnostic(
        state,
        "VFX_SINGLE_ACTIVE_STATE_REQUIRED",
        "warn",
        "Single requires the evaluated active-state value carried by the source birthrate slot."
      );
    }
    return;
  }

  if (activeParticleIds.length > 1) {
    const retainedParticleId = activeParticleIds[0];
    for (const particleId of activeParticleIds.slice(1)) {
      const particle = state.particles.find((entry) => entry.particleId === particleId);
      if (particle) {
        recycleParticle(state, particle, "runtime_reset");
      }
    }
    addTickDiagnostic(
      state,
      "VFX_SINGLE_ACTIVE_COUNT_RECONCILED",
      "warn",
      `Single retained particle ${retainedParticleId} and removed extra active particles to preserve Aurora's one-particle family rule.`
    );
  }

  const activeParticleId = state.activeParticleIds[0];
  if (activeParticleId === undefined) {
    spawnFountainParticle(
      state,
      {
        ...simulation,
        lifeExp: Number.isFinite(simulation.lifeExp) ? simulation.lifeExp : 0
      },
      context,
      dtSeconds,
      undefined,
      "single_shot"
    );
    state.singleShotEmitted = true;
    addTickDiagnostic(
      state,
      "VFX_SINGLE_ACTIVE_PARTICLE_CREATED",
      "info",
      "Single created exactly one active particle through the shared Aurora emitter reset path."
    );
    addTickDiagnostic(
      state,
      "VFX_SINGLE_RETAIL_RUNTIME_DUMP_REQUIRED",
      "warn",
      "Retail Single runtime tick dumps are still required before canonical parity can be promoted."
    );
  } else {
    const particle = state.particles.find((entry) => entry.particleId === activeParticleId);
    if (particle) {
      advanceSingleActiveParticle(state, particle, dtSeconds);
    }
    addTickDiagnostic(
      state,
      "VFX_SINGLE_ACTIVE_PARTICLE_RETAINED",
      "info",
      "Single retained and updated its existing active particle without allocating a replacement."
    );
  }
  state.spawnAccumulator = 0;
}

function advanceSingleActiveParticle(
  state: AuroraEmitterRuntimeState,
  particle: AuroraParticleRuntimeRecord,
  dtSeconds: number
): void {
  updateMotionBlurPreviousPosition(state, particle, dtSeconds);
  particle.ageSeconds = advanceAuroraParticleAgeFloat32(
    particle.ageSeconds,
    dtSeconds
  );
  particle.acceleration = resolveAuroraMassAcceleration(state.source.simulation ?? {});
  if (state.source.simulation?.p2p !== true) {
    particle.position = addAuroraFloat32Vectors(
      particle.position,
      scaleAuroraFloat32Vector(particle.velocity, dtSeconds)
    );
    if (particle.inheritedVelocityDirection && particle.inheritedVelocityMagnitude !== undefined) {
      particle.position = addAuroraFloat32Vectors(
        particle.position,
        scaleAuroraFloat32Vector(
          particle.inheritedVelocityDirection,
          particle.inheritedVelocityMagnitude * dtSeconds
        )
      );
      particle.inheritedVelocityMagnitude = Math.fround(
        Math.abs((1 - dtSeconds) * particle.inheritedVelocityMagnitude)
      );
    }
    particle.velocity = addAuroraFloat32Vectors(
      particle.velocity,
      scaleAuroraFloat32Vector(particle.acceleration, dtSeconds)
    );
  }
  particle.rotationRadians = Math.fround(
    wrapAuroraParticleRotationRadians(
      finiteOr(particle.rotationRadians, 0) +
        Math.fround(
          Math.fround(
            resolveAuroraParticleRotationRateRadians(state.source.simulation?.particleRot)
          ) * Math.fround(dtSeconds)
        )
    )
  );

  const lifeExp = Number.isFinite(state.source.simulation?.lifeExp)
    ? Math.fround(state.source.simulation!.lifeExp!)
    : 0;
  if (state.source.sourceState?.loop === true && lifeExp > 0 && particle.ageSeconds > lifeExp) {
    particle.ageSeconds = 0;
    addTickDiagnostic(
      state,
      "VFX_SINGLE_LOOP_AGE_RESET",
      "info",
      "Single reset the existing particle age after the positive lifetime was exceeded; no replacement particle was allocated."
    );
  }

  const normalizedAge = resolveAuroraParticleNormalizedAgeFloat32(
    particle.ageSeconds,
    lifeExp,
    0
  );
  const simulation = state.source.simulation ?? {};
  particle.color = sampleParticleColor(simulation, normalizedAge);
  particle.alpha = sampleParticleAlpha(simulation, normalizedAge);
  particle.size = sampleRuntimeParticleSize(state, particle, normalizedAge);
  particle.atlas = advanceAtlasState(particle.atlas, dtSeconds);

  if (state.source.sourceState?.loop !== true && lifeExp >= 0 && particle.ageSeconds >= lifeExp) {
    recycleParticle(state, particle, "expired_lifetime");
  }
}

function tickExplosionRuntime(
  state: AuroraEmitterRuntimeState,
  dtSeconds: number,
  context: AuroraEmitterRuntimeContext
): void {
  const detonateEvents = context.detonateEvents ?? [];
  const pendingEvents = detonateEvents.filter((event) => {
    const eventKey = buildDetonateEventKey(event);
    return !state.processedDetonateEventKeys.includes(eventKey);
  });
  const pendingFieldKey =
    context.detonateFieldKey && !state.processedDetonateEventKeys.includes(context.detonateFieldKey)
      ? context.detonateFieldKey
      : undefined;
  if (pendingEvents.length === 0 && !pendingFieldKey) {
    state.explosionDetonateOneShotGuard = 0;
    const alreadyProcessed = detonateEvents.length > 0 || Boolean(context.detonateFieldKey);
    if (alreadyProcessed) {
      addTickDiagnostic(
        state,
        "VFX_EXPLOSION_DETONATE_EVENT_ALREADY_PROCESSED",
        "info",
        "Explosion detonate latch was already consumed; no duplicate local burst was spawned."
      );
      state.spawnAccumulator = 0;
      return;
    }
    addTickDiagnostic(
      state,
      "VFX_EXPLOSION_DETONATE_EVENT_REQUIRED",
      "warn",
      "Explosion runtime requires an explicit detonate event before particles can spawn."
    );
    addTickDiagnostic(
      state,
      "VFX_EXPLOSION_NO_DETONATE_NO_FALLBACK_BURST",
      "warn",
      "Explosion runtime did not synthesize a fallback burst without detonate."
    );
    state.spawnAccumulator = 0;
    return;
  }

  const simulation = state.source.simulation ?? {};
  pendingEvents.forEach((event, callbackIndex) => {
    const eventKey = buildDetonateEventKey(event);
    state.detonateCallbackTrace.push({
      source: "model-animation-event",
      eventKey,
      callbackIndex,
      timeSeconds: event.timeSeconds,
      ...(event.animationName ? { animationName: event.animationName } : {}),
      latchValueWritten: 1,
      consumedAtLocalClockSeconds: state.localClockSeconds
    });
    if (!state.processedDetonateEventKeys.includes(eventKey)) {
      state.processedDetonateEventKeys.push(eventKey);
    }
  });
  if (pendingFieldKey) {
    state.processedDetonateEventKeys.push(pendingFieldKey);
  }
  // Aurora callbacks set one detonate latch, so duplicate events in one tick do not mean N bursts.
  const requestedCount = resolveExplosionRequestedCount(simulation);
  const oneShotGuardSuppressed = state.explosionDetonateOneShotGuard >= 1;
  if (requestedCount > 0 && !oneShotGuardSuppressed) {
    registerExplosionWindPointSource(state, simulation, context);
    spawnExplosionBurst(state, simulation, context, dtSeconds, requestedCount);
  } else if (oneShotGuardSuppressed) {
    addTickDiagnostic(
      state,
      "VFX_EXPLOSION_DETONATE_ONE_SHOT_GUARD_SUPPRESSED",
      "info",
      "Explosion consumed the detonate latch without a second burst because Aurora's prior-tick one-shot guard was set."
    );
  } else {
    addTickDiagnostic(
      state,
      "VFX_EXPLOSION_DETONATE_ZERO_BIRTHRATE_CONSUMED",
      "info",
      "Explosion consumed the detonate latch with a zero requested particle count; no burst or blast-wind source was created."
    );
  }
  addTickDiagnostic(
    state,
    "VFX_EXPLOSION_DETONATE_EVENT_CONSUMED",
    "info",
    requestedCount > 0 && !oneShotGuardSuppressed
      ? "Explosion consumed one detonate latch and emitted the evaluated particle count."
      : oneShotGuardSuppressed
        ? "Explosion consumed one detonate latch while the prior-tick one-shot guard suppressed particle creation."
        : "Explosion consumed one detonate latch with an evaluated particle count of zero."
  );
  if (pendingFieldKey) {
    addTickDiagnostic(
      state,
      "VFX_EXPLOSION_DETONATE_FIELD_CONSUMED",
      "info",
      "Explosion runtime consumed the evaluated direct detonate field through the same latch as animation callbacks."
    );
  }
  addTickDiagnostic(
    state,
    "VFX_EXPLOSION_LOCAL_BURST_RUNTIME_DIAGNOSTIC",
    "info",
    "Explosion burst runtime is local diagnostic evidence only until retail timing and render captures are supplied."
  );
  addTickDiagnostic(
    state,
    "VFX_EXPLOSION_RETAIL_TIMING_CAPTURE_REQUIRED",
    "warn",
    "Retail detonate timing/capture evidence is still required before canonical parity can be promoted."
  );
  state.explosionDetonateOneShotGuard = 1;
  state.spawnAccumulator = 0;
}

function tickP2PRuntime(
  state: AuroraEmitterRuntimeState,
  dtSeconds: number,
  context: AuroraEmitterRuntimeContext
): boolean {
  if (!context.targetRef && !context.targetPosition) {
    addTickDiagnostic(
      state,
      "VFX_P2P_TARGET_RUNTIME_POINTER_REQUIRED",
      "warn",
      "P2P runtime requires a target pointer/context; no origin fallback was used."
    );
    state.spawnAccumulator = 0;
    return false;
  }
  if (!context.targetPosition) {
    addTickDiagnostic(
      state,
      "VFX_P2P_TARGET_POSITION_REQUIRED_FOR_LOCAL_DIAGNOSTIC",
      "warn",
      "P2P local runtime diagnostics require a resolved target position; targetRef alone is not enough to synthesize a diagnostic path."
    );
    state.spawnAccumulator = 0;
    return false;
  }
  const simulation = state.source.simulation ?? {};
  if (simulation.p2pType === "bezier" && !context.targetForward) {
    addTickDiagnostic(
      state,
      "VFX_P2P_BEZIER_TARGET_ORIENTATION_REQUIRED",
      "warn",
      "P2P Bezier requires the evaluated reference-node forward direction; target position alone cannot reconstruct Aurora's second control point."
    );
    state.spawnAccumulator = 0;
    return false;
  }
  const activeBeforeSpawn = [...state.activeParticleIds];
  if (simulation.affectedByWind === true && !context.windContext) {
    addTickDiagnostic(
      state,
      "VFX_AURORA_WIND_CONTEXT_REQUIRED",
      "warn",
      "affectedByWind requires an Aurora wind-manager context; no zero-wind or generic force-field fallback was used."
    );
  }
  if (simulation.p2pType === "bezier") {
    applyP2PBezierTargetMotion(
      state,
      simulation,
      dtSeconds,
      activeBeforeSpawn,
      context.targetPosition,
      context.targetForward!,
      context
    );
  } else {
    applyP2PGravityTargetMotion(
      state,
      simulation,
      dtSeconds,
      activeBeforeSpawn,
      context.targetPosition,
      context
    );
  }
  addTickDiagnostic(
    state,
    "VFX_P2P_TARGET_CONTEXT_CONSUMED",
    "info",
    simulation.p2pType === "bezier"
      ? "P2P runtime consumed resolved source/reference position and forward-direction context for Bezier motion."
      : "P2P runtime consumed a resolved target position for source-derived gravity-target motion."
  );
  if (context.targetContextSource === "source-mdl-child-reference-evaluated-parent-space") {
    addTickDiagnostic(
      state,
      "VFX_P2P_SOURCE_REFERENCE_CONTEXT_CONSUMED",
      "info",
      "P2P target context was resolved from one direct source-MDL reference node after evaluated emitter position, orientation, and scale were composed in emitter-parent space."
    );
  }
  if (context.targetContextSource === "effect-beam-type7-reference-reattach") {
    addTickDiagnostic(
      state,
      "VFX_P2P_EFFECT_BEAM_TYPE7_REFERENCE_REATTACH_CONSUMED",
      "info",
      "P2P target context came from EffectBeam Type 7 external reference reattachment; the source MDL reference position was not used as the target."
    );
    if (
      context.effectBeamAttachment?.sourceNodePath?.length &&
      context.effectBeamAttachment.targetNodePath?.length &&
      context.effectBeamAttachment.sourceModelHash &&
      context.effectBeamAttachment.targetModelHash
    ) {
      addTickDiagnostic(
        state,
        "VFX_P2P_EFFECT_BEAM_MODEL_NODE_ATTACHMENT_CONSUMED",
        "info",
        "EffectBeam source and target positions were resolved from named retail model-node hierarchies with source hashes, not object origins."
      );
    }
  }
  addTickDiagnostic(
    state,
    simulation.p2pType === "bezier"
      ? "VFX_P2P_BEZIER_TARGET_PATH_CONSUMED"
      : "VFX_P2P_GRAVITY_TARGET_PATH_CONSUMED",
    "info",
    simulation.p2pType === "bezier"
      ? "P2P Bezier applies Aurora's four source/reference control points and combine-time weighting before inherited velocity and mass."
      : "P2P applies source velocity, pow(drag, delta), target-direction gravity, and threshold arrival using the recovered Aurora update ordering."
  );
  addTickDiagnostic(
    state,
    "VFX_P2P_RETAIL_RUNTIME_DUMP_REQUIRED",
    "warn",
    "Retail P2P target mapping and runtime tick dumps are still required before canonical parity can be promoted."
  );
  return true;
}

function tickLightningRuntime(
  state: AuroraEmitterRuntimeState,
  dtSeconds: number,
  context: AuroraEmitterRuntimeContext
): void {
  state.lightningDelayTimerSeconds += dtSeconds;
  if (!context.targetRef && !context.targetPosition) {
    recycleAllActiveParticles(state, "lightning_target_missing");
    addTickDiagnostic(
      state,
      "VFX_LIGHTNING_TARGET_POINTER_CLEARS_ACTIVE_REQUIRED",
      "warn",
      "Lightning runtime requires a target pointer/context; active particles were cleared instead of falling back to origin."
    );
    state.spawnAccumulator = 0;
    return;
  }
  if (!context.targetPosition) {
    recycleAllActiveParticles(state, "lightning_target_missing");
    addTickDiagnostic(
      state,
      "VFX_LIGHTNING_TARGET_POSITION_REQUIRED_FOR_LOCAL_DIAGNOSTIC",
      "warn",
      "Lightning local runtime diagnostics require a resolved target position; targetRef alone does not keep active points alive."
    );
    state.spawnAccumulator = 0;
    return;
  }
  syncLightningTargetParticles(
    state,
    state.source.simulation ?? {},
    context.targetPosition,
    dtSeconds,
    context
  );
  addTickDiagnostic(
    state,
    "VFX_LIGHTNING_TARGET_CONTEXT_CONSUMED",
    "info",
    "Lightning runtime consumed a resolved target position and emitted deterministic local active points."
  );
  if (context.targetContextSource === "source-mdl-child-reference-evaluated-parent-space") {
    addTickDiagnostic(
      state,
      "VFX_LIGHTNING_SOURCE_REFERENCE_CONTEXT_CONSUMED",
      "info",
      "Lightning target context was resolved from one direct source-MDL reference node after evaluated emitter position, orientation, and scale were composed in emitter-parent space."
    );
  }
  addTickDiagnostic(
    state,
    "VFX_LIGHTNING_LOCAL_TARGET_PATH_DIAGNOSTIC",
    "info",
    "Lightning active-point runtime is local diagnostic evidence only until retail target mapping and runtime tick dumps are supplied."
  );
  addTickDiagnostic(
    state,
    "VFX_LIGHTNING_RETAIL_RUNTIME_DUMP_REQUIRED",
    "warn",
    "Retail Lightning target mapping and runtime tick dumps are still required before canonical parity can be promoted."
  );
  state.spawnAccumulator = 0;
}

function tickChunkRuntime(state: AuroraEmitterRuntimeState): void {
  recycleAllActiveParticles(state, "runtime_reset");
  addTickDiagnostic(
    state,
    "VFX_CHUNK_NAME_IS_RENDER_LANE_NOT_UPDATE_FAMILY",
    "warn",
    "Aurora selects chunk-model particle rendering from chunkName after constructing the emitter update family; it does not define a standalone Chunk update family."
  );
  addTickDiagnostic(
    state,
    "VFX_CHUNK_UPDATE_FAMILY_REQUIRED",
    "warn",
    "A chunkName must run through its source update family (Fountain, Explosion, Single, or Lightning-compatible); no particles were synthesized for the invalid standalone Chunk family."
  );
  state.spawnAccumulator = 0;
}

function spawnFountainParticle(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  context: AuroraEmitterRuntimeContext,
  dtSeconds: number,
  positionOverride?: AuroraRuntimeVector3,
  resetReason: AuroraParticleResetReason = "spawned"
): number | undefined {
  if (
    state.freeParticleIds.length === 0 &&
    state.particles.length >= state.executionParticleBudget
  ) {
    addExecutionParticleBudgetDiagnostic(state);
    return undefined;
  }

  const particleId = state.freeParticleIds.shift() ?? state.nextParticleId;
  if (particleId === state.nextParticleId) {
    state.nextParticleId += 1;
  }
  const slotIndex = particleId - 1;
  const lifetimeSeconds = Math.fround(simulation.lifeExp!);
  const rngHook = context.rngHook ?? defaultAuroraDeterministicRngHook;
  const randvel =
    typeof simulation.randvel === "number" && Number.isFinite(simulation.randvel)
      ? Math.max(0, simulation.randvel)
      : 0;
  const velocityJitter = sampleAuroraRandVelocityTerm(state, randvel, rngHook);
  const basePosition =
    positionOverride ?? sampleAuroraEmitterSpawnRectanglePosition(state, simulation, rngHook);
  const storedBasePosition = toAuroraFloat32Vector(basePosition);
  const inheritedVelocity = resolveAuroraInheritedEmitterVelocity(
    state,
    simulation,
    context,
    storedBasePosition,
    dtSeconds
  );
  const emissionMotion = buildInitialFountainMotion(
    state,
    simulation,
    context,
    velocityJitter,
    storedBasePosition
  );
  const acceleration = resolveAuroraMassAcceleration(simulation);
  const particle: AuroraParticleRuntimeRecord = {
    particleId,
    slotIndex,
    list: "active",
    ageSeconds: 0,
    lifetimeSeconds,
    rotationRadians: 0,
    rotationAxis: emissionMotion.direction,
    ...(emissionMotion.particleOrientation
      ? { particleOrientation: emissionMotion.particleOrientation }
      : {}),
    position: storedBasePosition,
    previousPosition: { ...storedBasePosition },
    velocity: toAuroraFloat32Vector(emissionMotion.velocity),
    landed: false,
    ...(inheritedVelocity
      ? {
          inheritedVelocityMagnitude: Math.fround(inheritedVelocity.magnitude),
          inheritedVelocityDirection: toAuroraFloat32Vector(inheritedVelocity.direction)
        }
      : {}),
    acceleration,
    color: sampleParticleColor(simulation, 0),
    alpha: sampleParticleAlpha(simulation, 0),
    size: sampleParticleSize(
      simulation,
      0,
      state.source.renderModeRaw
    ),
    atlas: buildInitialAtlasState(state.source.atlas),
    ...(state.source.chunkName
      ? {
          chunkModelRuntimeRef: {
            requestedRef: state.source.chunkName,
            modelInstanceRef: `${state.emitterNodeName}:chunk:${particleId}:${state.localClockSeconds.toFixed(6)}`,
            status: "active" as const
          }
        }
      : {}),
    resetReason
  };

  const existingIndex = state.particles.findIndex((entry) => entry.particleId === particleId);
  if (existingIndex >= 0) {
    state.particles[existingIndex] = particle;
  } else {
    state.particles.push(particle);
  }
  if (!state.activeParticleIds.includes(particleId)) {
    ensureParticleListCapacity(state, "active", state.activeParticleIds.length + 1);
    state.activeParticleIds.push(particleId);
  }
  state.membershipLog.push({
    particleId,
    slotIndex,
    list: "active",
    changedAtClockSeconds: state.localClockSeconds,
    resetReason
  });
  return particleId;
}

function spawnExplosionBurst(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  context: AuroraEmitterRuntimeContext,
  dtSeconds: number,
  requestedCount: number
): void {
  const spawnCount = resolveExecutionSpawnCount(state, requestedCount);
  for (let index = 0; index < spawnCount; index += 1) {
    spawnFountainParticle(
      state,
      {
        ...simulation,
        lifeExp: Number.isFinite(simulation.lifeExp) ? simulation.lifeExp : 0
      },
      context,
      dtSeconds,
      undefined,
      "explosion_detonate_burst"
    );
  }
  if (spawnCount < requestedCount) addExecutionParticleBudgetDiagnostic(state);
}

function resolveExplosionRequestedCount(simulation: AuroraMdlEmitterSimulation): number {
  const value =
    typeof simulation.birthrate === "number" && Number.isFinite(simulation.birthrate)
      ? simulation.birthrate
      : 0;
  return Math.max(0, truncateAuroraFloatToInt(value));
}

function registerExplosionWindPointSource(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  context: AuroraEmitterRuntimeContext
): void {
  const radius = simulation.blastRadius;
  if (!(typeof radius === "number" && Number.isFinite(radius) && radius !== 0)) return;
  if (!context.windContext?.registerPointSource) {
    addTickDiagnostic(
      state,
      "VFX_EXPLOSION_WIND_MANAGER_REQUIRED",
      "warn",
      "Explosion blastRadius requires the shared Aurora wind manager; no local force-field fallback was created."
    );
    return;
  }
  const durationSeconds =
    typeof simulation.blastLength === "number" && Number.isFinite(simulation.blastLength)
      ? simulation.blastLength
      : 0;
  context.windContext.registerPointSource({
    position:
      context.partMotion?.currentPosition ??
      context.sourceMotion?.currentPosition ??
      vectorFromTuple(state.source.transform?.position),
    radius: Math.abs(radius),
    durationSeconds: Math.max(0, durationSeconds),
    intensity: 1,
    sourceEmitterNodeName: state.emitterNodeName
  });
  addTickDiagnostic(
    state,
    "VFX_EXPLOSION_WIND_POINT_SOURCE_REGISTERED",
    "info",
    "Explosion registered its evaluated blast radius and duration in the shared Aurora wind manager before spawning particles."
  );
}

function applyP2PGravityTargetMotion(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  dtSeconds: number,
  activeParticleIds: number[],
  targetPosition: AuroraRuntimeVector3,
  context: AuroraEmitterRuntimeContext
): void {
  const threshold = finiteOr(simulation.threshold, 0);
  const thresholdSquared = threshold * threshold;
  const grav = finiteOr(simulation.grav, 0);
  const drag = finiteOr(simulation.drag, 1);
  const dragFactor = Math.pow(drag, dtSeconds);
  for (const particleId of activeParticleIds) {
    const particle = state.particles.find((entry) => entry.particleId === particleId);
    if (!particle) {
      continue;
    }
    const startPosition = { ...particle.position };
    let predictedPosition = addVector(
      startPosition,
      scaleVector(particle.velocity, dtSeconds)
    );
    if (simulation.affectedByWind === true && context.windContext) {
      const displacement = context.windContext.resolveDisplacement({
        emitterNodeName: state.emitterNodeName,
        particleId: particle.particleId,
        position: startPosition,
        deltaSeconds: dtSeconds
      });
      if (displacement && isFiniteVector(displacement)) {
        predictedPosition = addVector(predictedPosition, displacement);
      } else {
        addTickDiagnostic(
          state,
          "VFX_AURORA_WIND_DISPLACEMENT_REQUIRED",
          "warn",
          "Aurora wind-manager context did not return a finite displacement for an affected particle."
        );
      }
    }
    const toTarget = subtractVector(targetPosition, startPosition);
    const distanceSquared = dotVector(toTarget, toTarget);
    if (distanceSquared <= thresholdSquared) {
      particle.ageSeconds = particle.lifetimeSeconds;
      particle.resetReason = "p2p_target_path";
      break;
    }
    particle.velocity = toAuroraFloat32Vector(scaleVector(particle.velocity, dragFactor));
    if (grav !== 0 && dtSeconds > 0 && distanceSquared > 0) {
      const distance = Math.sqrt(distanceSquared);
      const targetDirection = scaleVector(toTarget, 1 / distance);
      const gravityVelocity = scaleVector(targetDirection, grav * dtSeconds);
      particle.velocity = addAuroraFloat32Vectors(particle.velocity, gravityVelocity);
      predictedPosition = addVector(
        predictedPosition,
        scaleVector(targetDirection, grav * dtSeconds * dtSeconds)
      );
    }
    const targetMovement = subtractVector(predictedPosition, startPosition);
    const targetMovementLength = vectorLength(targetMovement);
    if (targetMovementLength > 0) {
      particle.direction = toAuroraFloat32Vector(
        scaleVector(targetMovement, 1 / targetMovementLength)
      );
    }
    if (
      squaredDistanceToSegment(targetPosition, startPosition, predictedPosition) <= thresholdSquared
    ) {
      particle.ageSeconds = particle.lifetimeSeconds;
    }
    if (particle.inheritedVelocityDirection && particle.inheritedVelocityMagnitude !== undefined) {
      predictedPosition = addVector(
        predictedPosition,
        scaleVector(
          particle.inheritedVelocityDirection,
          particle.inheritedVelocityMagnitude * dtSeconds
        )
      );
      particle.inheritedVelocityMagnitude = Math.fround(
        Math.abs((1 - dtSeconds) * particle.inheritedVelocityMagnitude)
      );
    }
    particle.position = toAuroraFloat32Vector(predictedPosition);
    particle.velocity = addAuroraFloat32Vectors(
      particle.velocity,
      scaleAuroraFloat32Vector(particle.acceleration, dtSeconds)
    );
    particle.resetReason = "p2p_target_path";
  }
}

function applyP2PBezierTargetMotion(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  dtSeconds: number,
  activeParticleIds: number[],
  targetPosition: AuroraRuntimeVector3,
  targetForward: AuroraRuntimeVector3,
  context: AuroraEmitterRuntimeContext
): void {
  const sourcePosition = vectorFromTuple(state.source.transform?.position);
  const sourceForward = orientationForwardVector(state.source.transform?.orientation);
  const normalizedTargetForward = normalizeVectorOrFallback(targetForward, { x: 0, y: 0, z: 1 });
  const sourceHandle = finiteOr(simulation.p2pBezier2, 0);
  const targetHandle = finiteOr(simulation.p2pBezier3, 0);
  const combineTime = finiteOr(simulation.combineTime, 0);
  const control0 = sourcePosition;
  const control1 = addVector(sourcePosition, scaleVector(sourceForward, sourceHandle));
  const control2 = addVector(targetPosition, scaleVector(normalizedTargetForward, targetHandle));
  const control3 = targetPosition;

  activeParticleIds.forEach((particleId) => {
    const particle = state.particles.find((entry) => entry.particleId === particleId);
    if (!particle) return;

    let predictedPosition = addVector(
      particle.position,
      scaleVector(particle.velocity, dtSeconds)
    );
    if (simulation.affectedByWind === true && context.windContext) {
      const displacement = context.windContext.resolveDisplacement({
        emitterNodeName: state.emitterNodeName,
        particleId: particle.particleId,
        position: particle.position,
        deltaSeconds: dtSeconds
      });
      if (displacement && isFiniteVector(displacement)) {
        predictedPosition = addVector(predictedPosition, displacement);
      } else {
        addTickDiagnostic(
          state,
          "VFX_AURORA_WIND_DISPLACEMENT_REQUIRED",
          "warn",
          "Aurora wind-manager context did not return a finite displacement for an affected particle."
        );
      }
    }

    const t = particle.lifetimeSeconds > 0
      ? clamp01(particle.ageSeconds / particle.lifetimeSeconds)
      : 1;
    const inverseT = 1 - t;
    const weight0 = inverseT * inverseT * inverseT;
    const weight1 = 3 * t * inverseT * inverseT;
    const weight2 = 3 * t * t * inverseT;
    const weight3 = t * t * t;
    const curvePosition = addVector(
      addVector(scaleVector(control0, weight0), scaleVector(control1, weight1)),
      addVector(scaleVector(control2, weight2), scaleVector(control3, weight3))
    );
    const curveWeight = Math.pow(weight3, combineTime);
    predictedPosition = addVector(
      scaleVector(predictedPosition, 1 - curveWeight),
      scaleVector(curvePosition, curveWeight)
    );

    if (particle.inheritedVelocityDirection && particle.inheritedVelocityMagnitude !== undefined) {
      predictedPosition = addVector(
        predictedPosition,
        scaleVector(
          particle.inheritedVelocityDirection,
          particle.inheritedVelocityMagnitude * dtSeconds
        )
      );
      particle.inheritedVelocityMagnitude = Math.fround(
        Math.abs((1 - dtSeconds) * particle.inheritedVelocityMagnitude)
      );
    }
    particle.position = toAuroraFloat32Vector(predictedPosition);
    particle.velocity = addAuroraFloat32Vectors(
      particle.velocity,
      scaleAuroraFloat32Vector(particle.acceleration, dtSeconds)
    );
    particle.resetReason = "p2p_target_path";
  });
}

function squaredDistanceToSegment(
  point: AuroraRuntimeVector3,
  start: AuroraRuntimeVector3,
  end: AuroraRuntimeVector3
): number {
  const segment = subtractVector(end, start);
  const segmentLengthSquared = dotVector(segment, segment);
  if (!(segmentLengthSquared > 0)) {
    const offset = subtractVector(point, start);
    return dotVector(offset, offset);
  }
  const pointOffset = subtractVector(point, start);
  const t = Math.max(0, Math.min(1, dotVector(pointOffset, segment) / segmentLengthSquared));
  const closest = addVector(start, scaleVector(segment, t));
  const offset = subtractVector(point, closest);
  return dotVector(offset, offset);
}

function syncLightningTargetParticles(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  targetPosition: AuroraRuntimeVector3,
  dtSeconds: number,
  context: AuroraEmitterRuntimeContext
): void {
  const requestedCount = resolveLightningActivePointCount(state, simulation);
  if (requestedCount <= 0) {
    recycleAllActiveParticles(state, "lightning_point_count_zero");
    addTickDiagnostic(
      state,
      "VFX_LIGHTNING_EVALUATED_POINT_COUNT_ZERO_CLEARS_ACTIVE",
      "warn",
      "Lightning evaluated an active-point count of zero from the source birthrate slot; active points were cleared."
    );
    return;
  }
  const sourcePosition = vectorFromTuple(state.source.transform?.position);
  while (state.activeParticleIds.length < requestedCount) {
    spawnFountainParticle(
      state,
      {
        ...simulation,
        lifeExp: Number.isFinite(simulation.lifeExp) ? simulation.lifeExp : 0
      },
      context,
      dtSeconds,
      sourcePosition,
      "lightning_target_path"
    );
  }
  while (state.activeParticleIds.length > requestedCount) {
    const particleId = state.activeParticleIds[requestedCount];
    const particle = state.particles.find((entry) => entry.particleId === particleId);
    if (!particle) break;
    recycleParticle(state, particle, "lightning_point_count_zero");
  }
  const pathParticleIds = state.activeParticleIds.slice(0, requestedCount);
  ageLightningActiveParticles(state, pathParticleIds, dtSeconds);

  const axis = subtractVector(targetPosition, sourcePosition);
  const delay = finiteOr(simulation.lightningDelay, 0);
  if (state.lightningDelayTimerSeconds <= delay) {
    transformCachedLightningPoints(
      state,
      pathParticleIds,
      state.lightningCachedSourcePosition ?? zeroVector(),
      state.lightningCachedTargetVector ?? zeroVector(),
      sourcePosition,
      axis
    );
    state.lightningCachedSourcePosition = { ...sourcePosition };
    state.lightningCachedTargetVector = { ...axis };
    return;
  }
  const rngHook = context.rngHook ?? defaultAuroraDeterministicRngHook;
  const firstParticle = state.particles.find(
    (entry) => entry.particleId === pathParticleIds[0]
  );
  if (firstParticle) {
    const xSize = finiteOr(simulation.xSize, 0);
    const ySize = finiteOr(simulation.ySize, 0);
    firstParticle.position = xSize === 0 && ySize === 0
      ? sourcePosition
      : sampleAuroraEmitterSpawnRectanglePosition(state, simulation, rngHook);
  }
  const lastParticle = state.particles.find(
    (entry) => entry.particleId === pathParticleIds.at(-1)
  );
  if (lastParticle) lastParticle.position = { ...targetPosition };
  pathParticleIds.forEach((particleId) => {
    const particle = state.particles.find((entry) => entry.particleId === particleId);
    if (particle) particle.resetReason = "lightning_target_path";
  });

  if (!firstParticle || !lastParticle) return;
  const jitterAxis = subtractVector(firstParticle.position, lastParticle.position);
  const axisLength = vectorLength(jitterAxis);
  if (!(axisLength > 0)) return;

  state.lightningDelayTimerSeconds = 0;
  const axisUnit = scaleVector(jitterAxis, 1 / axisLength);
  const perpendicularA = {
    x: -axisUnit.y,
    y: axisUnit.z,
    z: -axisUnit.x
  };
  const perpendicularB = crossVector(axisUnit, perpendicularA);
  const radius = finiteOr(simulation.lightningRadius, 0);
  const lightningScale = finiteOr(simulation.lightningScale, 0);
  const sourceScale = finiteOr(state.source.transform?.scale, 1);
  let rngState: AuroraDeterministicRngState = { ...state.rng };
  const midpointDistance = truncateAuroraFloatToInt(requestedCount * 0.5);
  if (
    midpointDistance > 0 &&
    midpointDistance * 2 < requestedCount
  ) {
    rngState = applyLightningMidpointSubdivision(
      state,
      pathParticleIds,
      midpointDistance,
      midpointDistance,
      perpendicularA,
      perpendicularB,
      radius,
      sourceScale,
      rngState,
      rngHook
    );
  }
  const spacingGate = (axisLength / requestedCount) * 0.5;
  if (spacingGate >= 0.01 && lightningScale !== 0) {
    const magnitudeModulus = truncateAuroraFloatToInt(spacingGate * 100);
    for (let index = 1; index < requestedCount - 1; index += 1) {
      const particle = state.particles.find((entry) => entry.particleId === pathParticleIds[index]);
      if (!particle) continue;
      const jitter = sampleLightningSignedModuloHundredths(
        rngState,
        magnitudeModulus,
        rngHook
      );
      rngState = jitter.state;
      particle.position = addAuroraFloat32Vectors(
        particle.position,
        scaleVector(perpendicularA, jitter.value * lightningScale * sourceScale)
      );
    }
  }
  state.rng = rngState;
}

function ageLightningActiveParticles(
  state: AuroraEmitterRuntimeState,
  particleIds: number[],
  dtSeconds: number
): void {
  particleIds.forEach((particleId) => {
    const particle = state.particles.find((entry) => entry.particleId === particleId);
    if (!particle) return;
    if (particle.ageSeconds === particle.lifetimeSeconds) {
      particle.ageSeconds = 0;
      particle.lifetimeSeconds = 0;
    }
    particle.ageSeconds = advanceAuroraParticleAgeFloat32(
      particle.ageSeconds,
      dtSeconds
    );
    updateMotionBlurPreviousPosition(state, particle, dtSeconds);
  });
}

function applyLightningMidpointSubdivision(
  state: AuroraEmitterRuntimeState,
  particleIds: number[],
  midpointIndex: number,
  indexDistance: number,
  perpendicularA: AuroraRuntimeVector3,
  perpendicularB: AuroraRuntimeVector3,
  radius: number,
  sourceScale: number,
  initialRng: AuroraDeterministicRngState,
  rngHook: AuroraDeterministicRngHook
): AuroraDeterministicRngState {
  const startIndex = midpointIndex - indexDistance;
  const endIndex = midpointIndex + indexDistance;
  const start = state.particles.find((entry) => entry.particleId === particleIds[startIndex]);
  const midpoint = state.particles.find((entry) => entry.particleId === particleIds[midpointIndex]);
  const end = state.particles.find((entry) => entry.particleId === particleIds[endIndex]);
  if (!start || !midpoint || !end) return initialRng;
  const radiusModulus = truncateAuroraFloatToInt(radius * 100);
  const firstSign = sampleAuroraRandomSign(initialRng, rngHook);
  const firstJitter = radius >= 0.01
    ? sampleLightningMagnitudeHundredths(firstSign.state, radiusModulus, rngHook)
    : { value: 0, state: firstSign.state };
  const secondSign = sampleAuroraRandomSign(firstJitter.state, rngHook);
  const secondJitter = radius >= 0.01
    ? sampleLightningMagnitudeHundredths(secondSign.state, radiusModulus, rngHook)
    : { value: 0, state: secondSign.state };
  const average = scaleVector(addVector(start.position, end.position), 0.5);
  midpoint.position = addVector(
    addVector(
      average,
      scaleVector(perpendicularA, firstSign.value * firstJitter.value * sourceScale)
    ),
    scaleVector(perpendicularB, secondSign.value * secondJitter.value * sourceScale)
  );
  if (indexDistance === 0) return secondJitter.state;
  const nextDistance = truncateAuroraFloatToInt(indexDistance * 0.5);
  const afterLeft = applyLightningMidpointSubdivision(
    state,
    particleIds,
    midpointIndex - nextDistance,
    nextDistance,
    perpendicularA,
    perpendicularB,
    radius,
    sourceScale,
    secondJitter.state,
    rngHook
  );
  return applyLightningMidpointSubdivision(
    state,
    particleIds,
    midpointIndex + nextDistance,
    nextDistance,
    perpendicularA,
    perpendicularB,
    radius,
    sourceScale,
    afterLeft,
    rngHook
  );
}

function sampleAuroraRandomSign(
  initialRng: AuroraDeterministicRngState,
  rngHook: AuroraDeterministicRngHook
): { value: -1 | 1; state: AuroraDeterministicRngState } {
  const signSample = rngHook.nextFloat(initialRng);
  return {
    value: (auroraRand15FromFloat(signSample.value) & 1) === 0 ? -1 : 1,
    state: signSample.state
  };
}

function sampleLightningMagnitudeHundredths(
  initialRng: AuroraDeterministicRngState,
  modulus: number,
  rngHook: AuroraDeterministicRngHook
): { value: number; state: AuroraDeterministicRngState } {
  const magnitudeSample = rngHook.nextFloat(initialRng);
  return {
    value: modulus > 0
      ? (auroraRand15FromFloat(magnitudeSample.value) % modulus) * 0.01
      : 0,
    state: magnitudeSample.state
  };
}

function sampleLightningSignedModuloHundredths(
  initialRng: AuroraDeterministicRngState,
  modulus: number,
  rngHook: AuroraDeterministicRngHook
): { value: number; state: AuroraDeterministicRngState } {
  const sign = sampleAuroraRandomSign(initialRng, rngHook);
  const magnitude = sampleLightningMagnitudeHundredths(sign.state, modulus, rngHook);
  return {
    value: sign.value * magnitude.value,
    state: magnitude.state
  };
}

function transformCachedLightningPoints(
  state: AuroraEmitterRuntimeState,
  particleIds: number[],
  cachedSourcePosition: AuroraRuntimeVector3,
  cachedTargetVector: AuroraRuntimeVector3,
  currentSourcePosition: AuroraRuntimeVector3,
  currentTargetVector: AuroraRuntimeVector3
): void {
  particleIds.forEach((particleId) => {
    const particle = state.particles.find((entry) => entry.particleId === particleId);
    if (!particle) return;
    const cachedRelative = subtractVector(particle.position, cachedSourcePosition);
    const transformedRelative = rotateVectorBetweenDirections(
      cachedRelative,
      cachedTargetVector,
      currentTargetVector
    );
    particle.position = addAuroraFloat32Vectors(currentSourcePosition, transformedRelative);
    particle.resetReason = "lightning_target_path";
  });
}

function rotateVectorBetweenDirections(
  vector: AuroraRuntimeVector3,
  sourceDirection: AuroraRuntimeVector3,
  targetDirection: AuroraRuntimeVector3
): AuroraRuntimeVector3 {
  const sourceLength = vectorLength(sourceDirection);
  const targetLength = vectorLength(targetDirection);
  if (!(sourceLength > 1e-12) || !(targetLength > 1e-12)) return vector;
  const source = scaleVector(sourceDirection, 1 / sourceLength);
  const target = scaleVector(targetDirection, 1 / targetLength);
  const dot = Math.max(-1, Math.min(1, dotVector(source, target)));
  if (dot > 1 - 1e-12) return vector;
  if (dot <= -1 + 1e-12) return vector;
  const axis = crossVector(source, target);
  return rotateVectorByOrientation(vector, {
    axis: [axis.x, axis.y, axis.z],
    angleRadians: Math.acos(dot)
  });
}

function crossVector(
  left: AuroraRuntimeVector3,
  right: AuroraRuntimeVector3
): AuroraRuntimeVector3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x
  };
}

function resolveLightningActivePointCount(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation
): number {
  const evaluatedSourceSlot = simulation.birthrate;
  if (!(typeof evaluatedSourceSlot === "number" && Number.isFinite(evaluatedSourceSlot))) {
    addTickDiagnostic(
      state,
      "VFX_LIGHTNING_EVALUATED_POINT_COUNT_REQUIRED",
      "warn",
      "Lightning requires an evaluated active-point count from the source birthrate slot; no fixed preview subdivision was used."
    );
    return 0;
  }
  const requestedCount = Math.max(0, truncateAuroraFloatToInt(evaluatedSourceSlot));
  if (requestedCount > state.executionParticleBudget) {
    addExecutionParticleBudgetDiagnostic(state);
  }
  return Math.min(state.executionParticleBudget, requestedCount);
}

function buildInitialFountainMotion(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  context: AuroraEmitterRuntimeContext,
  velocityJitter: number,
  particlePosition: AuroraRuntimeVector3
): {
  direction: AuroraRuntimeVector3;
  velocity: AuroraRuntimeVector3;
  particleOrientation?: AuroraMdlOrientation;
} {
  const baseVelocity =
    typeof simulation.velocity === "number" && Number.isFinite(simulation.velocity)
      ? simulation.velocity
      : 0;
  const spread =
    typeof simulation.spread === "number" && Number.isFinite(simulation.spread)
      ? Math.max(0, simulation.spread)
      : 0;
  const rngHook = context.rngHook ?? defaultAuroraDeterministicRngHook;
  const emitterOrientation =
    context.sourceMotion?.currentOrientation ?? state.source.transform?.orientation;
  let particleOrientation = emitterOrientation
    ? cloneAuroraMdlOrientation(emitterOrientation)
    : undefined;
  if (spread !== 0) {
    const tiltSample = rngHook.nextFloat(state.rng);
    state.rng = tiltSample.state;
    const azimuthSample = rngHook.nextFloat(state.rng);
    state.rng = azimuthSample.state;
    const maxTiltHundredths = Math.max(0, Math.trunc(spread * 0.5 * 100));
    const tiltHundredths =
      auroraRand15FromFloat(tiltSample.value) % Math.max(1, maxTiltHundredths + 1);
    const tilt = tiltHundredths * 0.01;
    const azimuth = (auroraRand15FromFloat(azimuthSample.value) % 0x274) * 0.01;
    particleOrientation = composeAuroraParticleSpreadOrientation(
      emitterOrientation,
      tilt,
      azimuth
    );
  }
  const deadspace =
    typeof simulation.deadspace === "number" && Number.isFinite(simulation.deadspace)
      ? simulation.deadspace
      : 0;
  if (deadspace !== 0) {
    if (isFiniteRuntimeVector(context.cameraPosition)) {
      particleOrientation = applyAuroraParticleDeadspaceCorrection(
        particleOrientation,
        particlePosition,
        context.cameraPosition,
        deadspace
      );
    } else if (
      !state.lastTickDiagnostics.some(
        (diagnostic) => diagnostic.code === "VFX_PARTICLE_DEADSPACE_CAMERA_POSITION_REQUIRED"
      )
    ) {
      addTickDiagnostic(
        state,
        "VFX_PARTICLE_DEADSPACE_CAMERA_POSITION_REQUIRED",
        "warn",
        "Aurora particle deadspace requires the active camera position in source coordinates; orientation was preserved without inventing camera context."
      );
    }
  }
  const speed = baseVelocity + velocityJitter;
  const direction = normalizeVectorOrFallback(
    rotateVectorByOrientation({ x: 0, y: 0, z: 1 }, particleOrientation),
    { x: 0, y: 0, z: 1 }
  );
  return {
    direction,
    velocity: scaleVector(direction, speed),
    ...(particleOrientation ? { particleOrientation } : {})
  };
}

function sampleAuroraEmitterSpawnRectanglePosition(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  rngHook: AuroraDeterministicRngHook
): AuroraRuntimeVector3 {
  const origin = vectorFromTuple(state.source.transform?.position);
  const sourceScale =
    typeof state.source.transform?.scale === "number" &&
    Number.isFinite(state.source.transform.scale)
      ? Math.abs(state.source.transform.scale)
      : 1;
  const xSize =
    typeof simulation.xSize === "number" && Number.isFinite(simulation.xSize)
      ? simulation.xSize
      : 0;
  const ySize =
    typeof simulation.ySize === "number" && Number.isFinite(simulation.ySize)
      ? simulation.ySize
      : 0;
  const evaluatedX = truncateAuroraFloatToInt(xSize * 100 * sourceScale);
  const evaluatedY = truncateAuroraFloatToInt(ySize * 100 * sourceScale);
  if (evaluatedX === 0 && evaluatedY === 0) {
    return origin;
  }

  const sampleMagnitude = (evaluatedSize: number): number => {
    if (evaluatedSize < 4) {
      return 0;
    }
    const modulus = Math.max(1, truncateAuroraFloatToInt(evaluatedSize * 0.5));
    const sample = rngHook.nextFloat(state.rng);
    state.rng = sample.state;
    return Math.floor(sample.value * 0x8000) % modulus;
  };

  let sampledX = sampleMagnitude(evaluatedX);
  let sampledY = sampleMagnitude(evaluatedY);
  const xSignSample = rngHook.nextFloat(state.rng);
  state.rng = xSignSample.state;
  const ySignSample = rngHook.nextFloat(state.rng);
  state.rng = ySignSample.state;
  if ((auroraRand15FromFloat(xSignSample.value) & 1) !== 0) sampledX = -sampledX;
  if ((auroraRand15FromFloat(ySignSample.value) & 1) !== 0) sampledY = -sampledY;

  const axisX = rotateVectorByOrientation(
    { x: 1, y: 0, z: 0 },
    state.source.transform?.orientation
  );
  const axisY = rotateVectorByOrientation(
    { x: 0, y: 1, z: 0 },
    state.source.transform?.orientation
  );
  return addVector(
    origin,
    addVector(
      scaleVector(axisX, sampledX * 0.0001),
      scaleVector(axisY, sampledY * 0.0001)
    )
  );
}

function applyAuroraEmitterSourceMotion(
  state: AuroraEmitterRuntimeState,
  context: AuroraEmitterRuntimeContext
): void {
  const motion = context.sourceMotion;
  const simulation = state.source.simulation ?? {};
  if (simulation.inherit === true && motion) {
    transformActiveParticlesBetweenFrames(state, motion);
  }
  if (simulation.inheritLocal === true && simulation.inherit !== true) {
    if (context.ownerMotion) {
      transformActiveParticlesBetweenFrames(state, context.ownerMotion);
    } else {
      addTickDiagnostic(
        state,
        "VFX_EMITTER_INHERIT_LOCAL_PARENT_FRAME_REQUIRED",
        "warn",
        "Aurora inherit_local requires previous/current parent-frame provenance."
      );
    }
  }
  if (simulation.inheritPart === true) {
    if (context.partMotion) {
      transformActiveParticlesBetweenFrames(state, context.partMotion);
    } else {
      addTickDiagnostic(
        state,
        "VFX_EMITTER_INHERIT_PART_PARENT_FRAME_REQUIRED",
        "warn",
        "Aurora inherit_part requires previous/current parent-frame provenance."
      );
    }
  }

  if (motion) {
    state.source.transform = {
      ...state.source.transform,
      position: [
        motion.currentPosition.x,
        motion.currentPosition.y,
        motion.currentPosition.z
      ],
      ...(motion.currentOrientation ? { orientation: motion.currentOrientation } : {}),
      ...(typeof motion.currentScale === "number" && Number.isFinite(motion.currentScale)
        ? { scale: motion.currentScale }
        : {})
    };
  }
}

function transformActiveParticlesBetweenFrames(
  state: AuroraEmitterRuntimeState,
  motion: AuroraEmitterSourceMotionContext
): void {
    const active = new Set(state.activeParticleIds);
    state.particles.forEach((particle) => {
      if (!active.has(particle.particleId)) {
        return;
      }
      particle.position = toAuroraFloat32Vector(
        transformPointBetweenEmitterFrames(particle.position, motion)
      );
      if (particle.previousPosition) {
        particle.previousPosition = toAuroraFloat32Vector(
          transformPointBetweenEmitterFrames(particle.previousPosition, motion)
        );
      }
      particle.velocity = toAuroraFloat32Vector(
        transformVectorBetweenEmitterFrames(particle.velocity, motion)
      );
    });
}

function transformPointBetweenEmitterFrames(
  point: AuroraRuntimeVector3,
  motion: AuroraEmitterSourceMotionContext
): AuroraRuntimeVector3 {
  const previousScale = finiteNonZeroOr(motion.previousScale, 1);
  const currentScale = finiteNonZeroOr(motion.currentScale, 1);
  const previousLocal = scaleVector(
    rotateVectorByOrientation(
      subtractVector(point, motion.previousPosition),
      motion.previousOrientation,
      true
    ),
    1 / previousScale
  );
  return addVector(
    motion.currentPosition,
    rotateVectorByOrientation(
      scaleVector(previousLocal, currentScale),
      motion.currentOrientation
    )
  );
}

function transformVectorBetweenEmitterFrames(
  vector: AuroraRuntimeVector3,
  motion: AuroraEmitterSourceMotionContext
): AuroraRuntimeVector3 {
  const previousScale = finiteNonZeroOr(motion.previousScale, 1);
  const currentScale = finiteNonZeroOr(motion.currentScale, 1);
  const previousLocal = scaleVector(
    rotateVectorByOrientation(vector, motion.previousOrientation, true),
    1 / previousScale
  );
  return rotateVectorByOrientation(
    scaleVector(previousLocal, currentScale),
    motion.currentOrientation
  );
}

function resolveAuroraInheritedEmitterVelocity(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  context: AuroraEmitterRuntimeContext,
  particlePosition: AuroraRuntimeVector3,
  tickDeltaSeconds: number
): { magnitude: number; direction: AuroraRuntimeVector3 } | undefined {
  if (simulation.inheritVel !== true) {
    return undefined;
  }

  const sourcePosition = vectorFromTuple(state.source.transform?.position);
  const motion = context.sourceMotion;
  const currentPosition = motion?.currentPosition ?? sourcePosition;
  const previousPosition = motion?.previousPosition ?? currentPosition;
  const deltaSeconds = motion?.deltaSeconds ?? tickDeltaSeconds;
  const transformDeltaScalar = deltaSeconds > 0 ? 1 / deltaSeconds : 0.01;

  const previousForward = orientationForwardVector(
    motion?.previousOrientation ?? state.source.transform?.orientation
  );
  const currentForward = orientationForwardVector(
    motion?.currentOrientation ?? state.source.transform?.orientation
  );
  const spawnRadius = vectorLength(subtractVector(currentPosition, particlePosition));
  const translationDelta = subtractVector(currentPosition, previousPosition);
  const rotationDelta = scaleVector(
    subtractVector(previousForward, currentForward),
    spawnRadius
  );
  const inheritedVelocity = scaleVector(
    addVector(translationDelta, rotationDelta),
    transformDeltaScalar
  );
  const magnitude = vectorLength(inheritedVelocity);
  return {
    magnitude,
    direction: magnitude > 0 ? scaleVector(inheritedVelocity, 1 / magnitude) : zeroVector()
  };
}

function orientationForwardVector(
  orientation: AuroraMdlOrientation | undefined
): AuroraRuntimeVector3 {
  return rotateVectorByOrientation({ x: 0, y: 0, z: 1 }, orientation);
}

function cloneAuroraMdlOrientation(orientation: AuroraMdlOrientation): AuroraMdlOrientation {
  return {
    axis: [...orientation.axis] as AuroraMdlOrientation["axis"],
    angleRadians: orientation.angleRadians
  };
}

type AuroraRuntimeQuaternion = [number, number, number, number];

function composeAuroraParticleSpreadOrientation(
  emitterOrientation: AuroraMdlOrientation | undefined,
  tiltRadians: number,
  azimuthRadians: number
): AuroraMdlOrientation {
  const emitterQuaternion = orientationToRuntimeQuaternion(emitterOrientation);
  const tiltQuaternion = orientationToRuntimeQuaternion({
    axis: [1, 0, 0],
    angleRadians: tiltRadians
  });
  const azimuthQuaternion = orientationToRuntimeQuaternion({
    axis: [0, 0, 1],
    angleRadians: azimuthRadians
  });
  return runtimeQuaternionToOrientation(
    multiplyRuntimeQuaternions(
      multiplyRuntimeQuaternions(emitterQuaternion, azimuthQuaternion),
      tiltQuaternion
    )
  );
}

function applyAuroraParticleDeadspaceCorrection(
  orientation: AuroraMdlOrientation | undefined,
  particlePosition: AuroraRuntimeVector3,
  cameraPosition: AuroraRuntimeVector3,
  deadspaceRadians: number
): AuroraMdlOrientation {
  const cameraDirection = normalizeVectorOrFallback(
    subtractVector(particlePosition, cameraPosition),
    { x: 0, y: 0, z: 0 }
  );
  if (!(vectorLength(cameraDirection) > 1e-12)) {
    return orientation
      ? cloneAuroraMdlOrientation(orientation)
      : { axis: [1, 0, 0], angleRadians: 0 };
  }

  const threshold = Math.cos(Math.PI * 0.5 - deadspaceRadians);
  let quaternion = orientationToRuntimeQuaternion(orientation);
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const currentOrientation = runtimeQuaternionToOrientation(quaternion);
    const particleNormal = normalizeVectorOrFallback(
      rotateVectorByOrientation({ x: 0, y: 1, z: 0 }, currentOrientation),
      { x: 0, y: 1, z: 0 }
    );
    const absoluteDot = Math.abs(dotVector(cameraDirection, particleNormal));
    if (!(absoluteDot < threshold)) {
      return currentOrientation;
    }
    const correctionAxis = normalizeVectorOrFallback(
      crossVector(cameraDirection, particleNormal),
      { x: 1, y: 0, z: 0 }
    );
    const correctionAngle = Math.fround(
      absoluteDot - Math.PI * 0.5 + deadspaceRadians
    );
    const correctionQuaternion = orientationToRuntimeQuaternion({
      axis: [correctionAxis.x, correctionAxis.y, correctionAxis.z],
      angleRadians: correctionAngle
    });
    quaternion = multiplyRuntimeQuaternions(correctionQuaternion, quaternion);
  }
  return runtimeQuaternionToOrientation(quaternion);
}

function orientationToRuntimeQuaternion(
  orientation: AuroraMdlOrientation | undefined
): AuroraRuntimeQuaternion {
  if (!orientation || !Number.isFinite(orientation.angleRadians)) {
    return [0, 0, 0, 1];
  }
  const [rawX, rawY, rawZ] = orientation.axis;
  const axisLength = Math.hypot(rawX, rawY, rawZ);
  if (!(axisLength > 1e-12)) {
    return [0, 0, 0, 1];
  }
  const sine = Math.sin(orientation.angleRadians * 0.5) / axisLength;
  return normalizeRuntimeQuaternion([
    rawX * sine,
    rawY * sine,
    rawZ * sine,
    Math.cos(orientation.angleRadians * 0.5)
  ]);
}

function runtimeQuaternionToOrientation(
  quaternion: AuroraRuntimeQuaternion
): AuroraMdlOrientation {
  const [x, y, z, w] = normalizeRuntimeQuaternion(quaternion);
  const clampedW = Math.max(-1, Math.min(1, w));
  const angleRadians = 2 * Math.acos(clampedW);
  const sine = Math.sqrt(Math.max(0, 1 - clampedW * clampedW));
  if (!(sine > 1e-12) || !(angleRadians > 1e-12)) {
    return { axis: [1, 0, 0], angleRadians: 0 };
  }
  return {
    axis: [x / sine, y / sine, z / sine],
    angleRadians
  };
}

function multiplyRuntimeQuaternions(
  [ax, ay, az, aw]: AuroraRuntimeQuaternion,
  [bx, by, bz, bw]: AuroraRuntimeQuaternion
): AuroraRuntimeQuaternion {
  return normalizeRuntimeQuaternion([
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz
  ]);
}

function normalizeRuntimeQuaternion(
  quaternion: AuroraRuntimeQuaternion
): AuroraRuntimeQuaternion {
  const length = Math.hypot(...quaternion);
  return length > 1e-12
    ? quaternion.map((value) => value / length) as AuroraRuntimeQuaternion
    : [0, 0, 0, 1];
}

function buildAuroraContactNormalOrientation(
  normal: AuroraRuntimeVector3
): AuroraMdlOrientation {
  const normalized = normalizeVectorOrFallback(normal, { x: 0, y: 0, z: 1 });
  const cross = {
    x: -normalized.y,
    y: normalized.x,
    z: 0
  };
  const crossLength = vectorLength(cross);
  if (crossLength > 1e-12) {
    return {
      axis: [cross.x / crossLength, cross.y / crossLength, 0],
      angleRadians: Math.acos(Math.max(-1, Math.min(1, normalized.z)))
    };
  }
  return normalized.z < 0
    ? { axis: [1, 0, 0], angleRadians: Math.PI }
    : { axis: [1, 0, 0], angleRadians: 0 };
}

function normalizeVectorOrFallback(
  vector: AuroraRuntimeVector3,
  fallback: AuroraRuntimeVector3
): AuroraRuntimeVector3 {
  const length = vectorLength(vector);
  return length > 1e-12 && Number.isFinite(length)
    ? scaleVector(vector, 1 / length)
    : { ...fallback };
}

function isFiniteRuntimeVector(
  vector: AuroraRuntimeVector3 | undefined
): vector is AuroraRuntimeVector3 {
  return Boolean(
    vector &&
    Number.isFinite(vector.x) &&
    Number.isFinite(vector.y) &&
    Number.isFinite(vector.z)
  );
}

function rotateVectorByOrientation(
  vector: AuroraRuntimeVector3,
  orientation: AuroraMdlOrientation | undefined,
  inverse = false
): AuroraRuntimeVector3 {
  if (!orientation || !Number.isFinite(orientation.angleRadians)) {
    return { ...vector };
  }
  const [rawX, rawY, rawZ] = orientation.axis;
  const axisLength = Math.hypot(rawX, rawY, rawZ);
  if (!(axisLength > 1e-12)) {
    return { ...vector };
  }
  const x = rawX / axisLength;
  const y = rawY / axisLength;
  const z = rawZ / axisLength;
  const angle = inverse ? -orientation.angleRadians : orientation.angleRadians;
  const sine = Math.sin(angle);
  const cosine = Math.cos(angle);
  const oneMinusCosine = 1 - cosine;
  const dot = x * vector.x + y * vector.y + z * vector.z;
  return {
    x:
      vector.x * cosine +
      (y * vector.z - z * vector.y) * sine +
      x * dot * oneMinusCosine,
    y:
      vector.y * cosine +
      (z * vector.x - x * vector.z) * sine +
      y * dot * oneMinusCosine,
    z:
      vector.z * cosine +
      (x * vector.y - y * vector.x) * sine +
      z * dot * oneMinusCosine
  };
}

function sampleAuroraRandVelocityTerm(
  state: AuroraEmitterRuntimeState,
  randvel: number,
  rngHook: AuroraDeterministicRngHook
): number {
  if (!(randvel > 0.01)) {
    return 0;
  }
  const magnitudeSample = rngHook.nextFloat(state.rng);
  state.rng = magnitudeSample.state;
  const signSample = rngHook.nextFloat(state.rng);
  state.rng = signSample.state;
  const hundredthSteps = Math.max(1, Math.trunc(randvel * 100));
  const magnitudeHundredths = auroraRand15FromFloat(magnitudeSample.value) % hundredthSteps;
  const sign = (auroraRand15FromFloat(signSample.value) & 1) !== 0 ? -1 : 1;
  return sign * magnitudeHundredths * 0.01;
}

function resolveAuroraMassAcceleration(
  simulation: AuroraMdlEmitterSimulation
): AuroraRuntimeVector3 {
  const mass =
    typeof simulation.mass === "number" && Number.isFinite(simulation.mass)
      ? simulation.mass
      : 0;
  return { x: 0, y: 0, z: -9.81 * mass };
}

function ageActiveParticles(state: AuroraEmitterRuntimeState, dtSeconds: number): void {
  const active = new Set(state.activeParticleIds);
  const evaluatedMassAcceleration = resolveAuroraMassAcceleration(
    state.source.simulation ?? {}
  );
  for (const particle of state.particles) {
    if (!active.has(particle.particleId)) {
      continue;
    }
    if (
      particle.lifetimeSeconds >= 0 &&
      particle.lifetimeSeconds <= particle.ageSeconds
    ) {
      recycleParticle(state, particle, "expired_lifetime");
      continue;
    }
    particle.acceleration = { ...evaluatedMassAcceleration };
    updateMotionBlurPreviousPosition(state, particle, dtSeconds);
    particle.ageSeconds = advanceAuroraParticleAgeFloat32(
      particle.ageSeconds,
      dtSeconds
    );
    if (particle.ageSeconds < 0) {
      particle.ageSeconds = 0;
      particle.atlas.checkpointSeconds = 0;
    }
    if (state.family !== "P2P" && state.source.simulation?.p2p !== true) {
      particle.position = addAuroraFloat32Vectors(
        particle.position,
        scaleAuroraFloat32Vector(particle.velocity, dtSeconds)
      );
      if (particle.inheritedVelocityDirection && particle.inheritedVelocityMagnitude !== undefined) {
        particle.position = addAuroraFloat32Vectors(
          particle.position,
          scaleAuroraFloat32Vector(
            particle.inheritedVelocityDirection,
            particle.inheritedVelocityMagnitude * dtSeconds
          )
        );
        particle.inheritedVelocityMagnitude = Math.fround(
          Math.abs((1 - dtSeconds) * particle.inheritedVelocityMagnitude)
        );
      }
      particle.velocity = addAuroraFloat32Vectors(
        particle.velocity,
        scaleAuroraFloat32Vector(particle.acceleration, dtSeconds)
      );
    }
    const simulation = state.source.simulation ?? {};
    particle.rotationRadians = Math.fround(
      wrapAuroraParticleRotationRadians(
        finiteOr(particle.rotationRadians, 0) +
          Math.fround(
            Math.fround(resolveAuroraParticleRotationRateRadians(simulation.particleRot)) *
              Math.fround(dtSeconds)
          )
      )
    );
    const normalizedAge = resolveAuroraParticleNormalizedAgeFloat32(
      particle.ageSeconds,
      particle.lifetimeSeconds,
      1
    );
    particle.color = sampleParticleColor(simulation, normalizedAge);
    particle.alpha = sampleParticleAlpha(simulation, normalizedAge);
    particle.size = sampleRuntimeParticleSize(state, particle, normalizedAge);
    particle.atlas = advanceAtlasState(particle.atlas, dtSeconds);
  }
}

function advanceAuroraParticleAgeFloat32(
  ageSeconds: number,
  dtSeconds: number
): number {
  return Math.fround(Math.fround(ageSeconds) + Math.fround(dtSeconds));
}

function resolveAuroraParticleNormalizedAgeFloat32(
  ageSeconds: number,
  lifetimeSeconds: number,
  nonPositiveLifetimeFallback: number
): number {
  const lifetime = Math.fround(lifetimeSeconds);
  if (!(lifetime > 0)) {
    return nonPositiveLifetimeFallback;
  }
  const inverseLifetime = Math.fround(1 / lifetime);
  return clamp01(
    Math.fround(Math.fround(ageSeconds) * inverseLifetime)
  );
}

function updateMotionBlurPreviousPosition(
  state: AuroraEmitterRuntimeState,
  particle: AuroraParticleRuntimeRecord,
  dtSeconds: number
): void {
  if (normalizeEmitterToken(state.source.renderModeRaw).replace(/[^a-z0-9]/gu, "") !== "motionblur") {
    return;
  }
  const rawBlurLength = state.source.simulation?.blurLength;
  const blurLength = rawBlurLength === undefined ? 1 : rawBlurLength;
  if (!Number.isFinite(blurLength) || blurLength <= 0) {
    addTickDiagnostic(
      state,
      "VFX_MOTION_BLUR_NONPOSITIVE_BLURLENGTH",
      "warn",
      "Motion_Blur requires a positive source blurlength; previous-position blending was withheld."
    );
    return;
  }
  const previous = particle.previousPosition ?? particle.position;
  const ratio = Math.min(dtSeconds, blurLength) / blurLength;
  particle.previousPosition = toAuroraFloat32Vector({
    x: previous.x + (particle.position.x - previous.x) * ratio,
    y: previous.y + (particle.position.y - previous.y) * ratio,
    z: previous.z + (particle.position.z - previous.z) * ratio
  });
}

function recycleAllActiveParticles(
  state: AuroraEmitterRuntimeState,
  deathReason: AuroraParticleDeathReason
): void {
  const active = new Set(state.activeParticleIds);
  state.particles.forEach((particle) => {
    if (active.has(particle.particleId)) {
      recycleParticle(state, particle, deathReason);
    }
  });
}

function retireSingleParticleWithoutPooling(
  state: AuroraEmitterRuntimeState,
  particle: AuroraParticleRuntimeRecord
): void {
  if (particle.chunkModelRuntimeRef?.status === "active") {
    particle.chunkModelRuntimeRef = {
      ...particle.chunkModelRuntimeRef,
      status: "released",
      releasedAtClockSeconds: state.localClockSeconds
    };
  }
  particle.list = "free";
  particle.deathReason = "runtime_reset";
  particle.resetReason = "cleared_by_family_gate";
  state.activeParticleIds = state.activeParticleIds.filter((id) => id !== particle.particleId);
  state.freeParticleIds = state.freeParticleIds.filter((id) => id !== particle.particleId);
  state.membershipLog.push({
    particleId: particle.particleId,
    slotIndex: particle.slotIndex,
    list: "free",
    changedAtClockSeconds: state.localClockSeconds,
    resetReason: "cleared_by_family_gate",
    deathReason: "runtime_reset"
  });
}

function recycleParticle(
  state: AuroraEmitterRuntimeState,
  particle: AuroraParticleRuntimeRecord,
  deathReason: AuroraParticleDeathReason
): void {
  if (particle.chunkModelRuntimeRef?.status === "active") {
    particle.chunkModelRuntimeRef = {
      ...particle.chunkModelRuntimeRef,
      status: "released",
      releasedAtClockSeconds: state.localClockSeconds
    };
  }
  particle.list = "free";
  particle.deathReason = deathReason;
  particle.resetReason = "recycled";
  state.activeParticleIds = state.activeParticleIds.filter((id) => id !== particle.particleId);
  if (!state.freeParticleIds.includes(particle.particleId)) {
    ensureParticleListCapacity(state, "free", state.freeParticleIds.length + 1);
    state.freeParticleIds.push(particle.particleId);
  }
  state.membershipLog.push({
    particleId: particle.particleId,
    slotIndex: particle.slotIndex,
    list: "free",
    changedAtClockSeconds: state.localClockSeconds,
    resetReason: "recycled",
    deathReason
  });
}

interface AuroraParticleCollisionFrameRecord {
  particleId: number;
  currentPosition: AuroraRuntimeVector3;
}

function captureCollisionFrame(
  state: AuroraEmitterRuntimeState
): AuroraParticleCollisionFrameRecord[] {
  const particlesById = new Map(
    state.particles.map((particle) => [particle.particleId, particle] as const)
  );
  return state.activeParticleIds.flatMap((particleId) => {
    const particle = particlesById.get(particleId);
    return particle
      ? [{ particleId, currentPosition: { ...particle.position } }]
      : [];
  });
}

function resolveCollisionContracts(
  state: AuroraEmitterRuntimeState,
  context: AuroraEmitterRuntimeContext,
  collisionFrame: AuroraParticleCollisionFrameRecord[],
  dtSeconds: number
): void {
  const simulation = state.source.simulation ?? {};
  if (simulation.bounce !== true || collisionFrame.length === 0) {
    return;
  }

  const sourceFlagsWord = resolveAuroraEmitterSourceFlagsWord(state);
  const collisionContext = context.collisionContext;
  const active = new Set(state.activeParticleIds);
  const particlesById = new Map(
    state.particles.map((particle) => [particle.particleId, particle] as const)
  );

  for (const frameParticle of collisionFrame) {
    const particle = particlesById.get(frameParticle.particleId);
    if (!particle || !active.has(frameParticle.particleId)) {
      continue;
    }

    state.collisionQueryHelper.resetGeneration += 1;
    const particleLane = state.source.chunkName ? "chunk" : "texture";
    const chunkExtentScale = particleLane === "chunk"
      ? finiteOr(simulation.sizeStart, 0)
      : undefined;
    const predictedPosition = { ...particle.position };
    const movement = subtractVector(predictedPosition, frameParticle.currentPosition);
    const testEndpoint = chunkExtentScale === undefined
      ? predictedPosition
      : addVector(predictedPosition, scaleVector(movement, chunkExtentScale));
    const query: AuroraParticleCollisionQuery = {
      queryId: `${state.collisionQueryHelper.identity}:${state.collisionQueryHelper.resetGeneration}:${particle.particleId}`,
      emitterNodeName: state.emitterNodeName,
      ...(state.sourceModelObjectKey
        ? { sourceModelObjectKey: state.sourceModelObjectKey }
        : {}),
      runtimeEmitterIdentity: `${state.sourceModelObjectKey ?? "source-model-unresolved"}#${state.emitterNodeName}`,
      sourceFlagsWord,
      queryHelperIdentity: state.collisionQueryHelper.identity,
      queryHelperInitArguments: { ...state.collisionQueryHelper.initArguments },
      queryResetGeneration: state.collisionQueryHelper.resetGeneration,
      staleResultReset: true,
      particleId: particle.particleId,
      particleLane,
      currentPosition: { ...frameParticle.currentPosition },
      predictedPosition,
      testEndpoint,
      velocityBeforeCollision: { ...particle.velocity },
      deltaSeconds: dtSeconds,
      bounceCoefficient: finiteOr(simulation.bounceCoefficient, 0),
      splatRequested: state.source.sourceState?.splat === true,
      ...(particleLane === "chunk" && particle.chunkModelRuntimeRef
        ? { chunkModelRuntimeRef: { ...particle.chunkModelRuntimeRef } }
        : {}),
      ...(chunkExtentScale !== undefined ? { chunkExtentScale } : {}),
      collisionProfileId: collisionContext?.collisionProfileId ?? "unresolved",
      requestedCollisionClasses: [
        ...(collisionContext?.requestedCollisionClasses ?? [])
      ],
      collisionServiceEvidence: collisionContext?.serviceEvidence ?? "unresolved",
      reason: "bounce",
      status: collisionContext ? "pending" : "context_required"
    };
    state.collisionQueries.push(query);

    if (!collisionContext) {
      addTickDiagnostic(
        state,
        "VFX_PARTICLE_COLLISION_CONTEXT_REQUIRED",
        "warn",
        "The source bounce bit requires the selected Aurora scene/area collision service; no generic raycast fallback was used."
      );
      continue;
    }

    const contact = collisionContext.resolve(query);
    if (!contact) {
      addTickDiagnostic(
        state,
        "VFX_PARTICLE_COLLISION_RESULT_REQUIRED",
        "warn",
        `Collision query '${query.queryId}' returned no typed result.`
      );
      continue;
    }

    query.status = "resolved";
    const result: AuroraParticleCollisionResult = {
      queryId: query.queryId,
      particleId: particle.particleId,
      ...contact,
      ...(contact.hitPosition ? { hitPosition: { ...contact.hitPosition } } : {}),
      ...(contact.contactNormal ? { contactNormal: { ...contact.contactNormal } } : {}),
      diagnostics: [...(contact.diagnostics ?? [])],
      appliedToRuntime: false
    };
    state.collisionResults.push(result);

    if (contact.status !== "hit") {
      continue;
    }
    if (collisionContext.serviceEvidence !== "aurora-runtime-service") {
      addTickDiagnostic(
        state,
        "VFX_PARTICLE_COLLISION_SERVICE_PROFILE_GATED",
        "warn",
        "A collision adapter returned a contact, but it is not identified as the mapped Aurora runtime service; canonical particle state was not mutated."
      );
      continue;
    }
    if (!contact.contactNormal || !isFiniteVector(contact.contactNormal)) {
      addTickDiagnostic(
        state,
        "VFX_PARTICLE_COLLISION_CONTACT_NORMAL_REQUIRED",
        "warn",
        "Aurora collision contact requires a finite contact normal before bounce response can be applied."
      );
      continue;
    }
    if (!contact.contactNormalProvenance) {
      addTickDiagnostic(
        state,
        "VFX_PARTICLE_COLLISION_QUERY_NORMAL_SLOT_REQUIRED",
        "warn",
        "The contact normal has no query-helper +0x54/+0x58/+0x5c provenance; canonical particle state was not mutated."
      );
      continue;
    }

    const normalLength = vectorLength(contact.contactNormal);
    if (!(normalLength > 0)) {
      addTickDiagnostic(
        state,
        "VFX_PARTICLE_COLLISION_CONTACT_NORMAL_REQUIRED",
        "warn",
        "Aurora collision contact returned a zero-length normal; bounce response was withheld."
      );
      continue;
    }
    const normal = scaleVector(contact.contactNormal, 1 / normalLength);
    const velocityBeforeCollision = query.velocityBeforeCollision;
    const reflectedVelocity = scaleVector(
      subtractVector(
        velocityBeforeCollision,
        scaleVector(normal, 2 * dotVector(normal, velocityBeforeCollision))
      ),
      query.bounceCoefficient
    );
    const settled = dotVector(reflectedVelocity, reflectedVelocity) <
      AURORA_COLLISION_SETTLED_SPEED_SQUARED;
    const chunkPostHitExtentNudge = chunkExtentScale ?? 0;
    const nudgeDistance =
      AURORA_COLLISION_BASE_NUDGE +
      (settled ? AURORA_COLLISION_SETTLED_NUDGE : 0) +
      chunkPostHitExtentNudge;
    const postNudgePosition = addVector(
      query.predictedPosition,
      scaleVector(normal, nudgeDistance)
    );

    particle.velocity = toAuroraFloat32Vector(reflectedVelocity);
    particle.position = toAuroraFloat32Vector(postNudgePosition);
    if (settled) {
      particle.landed = true;
      particle.contactNormal = toAuroraFloat32Vector(normal);
      particle.direction = toAuroraFloat32Vector(normal);
      particle.particleOrientation = buildAuroraContactNormalOrientation(normal);
      if (state.source.sourceState?.splat === true) {
        particle.size = sampleRuntimeParticleSize(state, particle, 1);
      }
    }

    result.contactNormal = normal;
    result.reflectedVelocity = { ...particle.velocity };
    result.postNudgePosition = { ...particle.position };
    result.postNudgeBasePositionSource = "predicted_position";
    if (chunkExtentScale !== undefined) {
      result.chunkPostHitExtentNudge = chunkPostHitExtentNudge;
    }
    result.settled = settled;
    result.landedFlagWriteIntent = settled ? "set" : "preserve";
    result.appliedToRuntime = true;
  }
}

function resolveAuroraEmitterSourceFlagsWord(state: AuroraEmitterRuntimeState): number {
  const simulation = state.source.simulation ?? {};
  const sourceState = state.source.sourceState ?? {};
  let flags = 0;
  if (simulation.p2p === true) flags |= AURORA_EMITTER_FLAG_P2P;
  if (simulation.p2pType === "bezier") flags |= AURORA_EMITTER_FLAG_P2P_BEZIER;
  if (simulation.affectedByWind === true) flags |= AURORA_EMITTER_FLAG_AFFECTED_BY_WIND;
  if (sourceState.isTinted === true) flags |= AURORA_EMITTER_FLAG_IS_TINTED;
  if (simulation.bounce === true) flags |= AURORA_EMITTER_FLAG_BOUNCE;
  if (state.source.atlas?.random === true) flags |= AURORA_EMITTER_FLAG_RANDOM_ATLAS_FRAME;
  if (simulation.inherit === true) flags |= AURORA_EMITTER_FLAG_INHERIT;
  if (simulation.inheritVel === true) flags |= AURORA_EMITTER_FLAG_INHERIT_VEL;
  if (simulation.inheritLocal === true) flags |= AURORA_EMITTER_FLAG_INHERIT_LOCAL;
  if (sourceState.splat === true) flags |= AURORA_EMITTER_FLAG_SPLAT;
  if (simulation.inheritPart === true) flags |= AURORA_EMITTER_FLAG_INHERIT_PART;
  return flags >>> 0;
}

function sampleParticleColor(
  simulation: AuroraMdlEmitterSimulation,
  normalizedAge: number
): AuroraRuntimeColor {
  const color = sampleStartEndTuple(
    simulation.colorStart,
    simulation.colorEnd,
    normalizedAge,
    [1, 1, 1]
  );
  return {
    r: color[0],
    g: color[1],
    b: color[2]
  };
}

function sampleParticleAlpha(
  simulation: AuroraMdlEmitterSimulation,
  normalizedAge: number
): number {
  return sampleStartEndNumber(
    simulation.alphaStart,
    simulation.alphaEnd,
    normalizedAge,
    1
  );
}

function sampleRuntimeParticleSize(
  state: AuroraEmitterRuntimeState,
  particle: AuroraParticleRuntimeRecord,
  normalizedAge: number
): { x: number; y: number } {
  const effectiveAge =
    state.source.sourceState?.splat === true && particle.landed
      ? 1
      : normalizedAge;
  return sampleParticleSize(
    state.source.simulation ?? {},
    effectiveAge,
    state.source.renderModeRaw
  );
}

function sampleParticleSize(
  simulation: AuroraMdlEmitterSimulation,
  normalizedAge: number,
  renderMode?: string
): { x: number; y: number } {
  const x = sampleStartEndNumber(
    simulation.sizeStart,
    simulation.sizeEnd,
    normalizedAge,
    1
  );
  const sampledY = sampleStartEndNumber(
    simulation.sizeStartY,
    simulation.sizeEndY,
    normalizedAge,
    x
  );
  const normalizedRenderMode = normalizeEmitterToken(renderMode).replace(/[^a-z0-9]/gu, "");
  const y = sampledY === 0 && normalizedRenderMode !== "bubble" ? x : sampledY;
  return { x, y };
}

function sampleStartEndNumber(
  start: number | undefined,
  end: number | undefined,
  normalizedAge: number,
  fallback: number
): number {
  const startValue = Math.fround(finiteOr(start, fallback));
  const endValue = Math.fround(finiteOr(end, startValue));
  const ageFraction = Math.fround(clamp01(normalizedAge));
  return Math.fround(
    endValue * ageFraction + (1 - ageFraction) * startValue
  );
}

function sampleStartEndTuple(
  start: [number, number, number] | undefined,
  end: [number, number, number] | undefined,
  normalizedAge: number,
  fallback: [number, number, number]
): [number, number, number] {
  return [
    sampleStartEndNumber(start?.[0], end?.[0], normalizedAge, fallback[0]),
    sampleStartEndNumber(start?.[1], end?.[1], normalizedAge, fallback[1]),
    sampleStartEndNumber(start?.[2], end?.[2], normalizedAge, fallback[2])
  ];
}

function buildInitialAtlasState(
  atlas: AuroraMdlEmitterNode["atlas"] | undefined
): AuroraParticleAtlasState {
  const frameStart = finiteOr(atlas?.frameStart, 0);
  const frameEnd = finiteOr(atlas?.frameEnd, frameStart);
  const fps = atlas?.fps;
  return {
    frameIndex: Math.trunc(frameStart),
    checkpointSeconds: 0,
    ...(typeof fps === "number" && Number.isFinite(fps) && fps > 0
      ? { secondsPerFrame: 1 / fps }
      : {}),
    frameStart: Math.trunc(frameStart),
    frameEnd: Math.trunc(frameEnd)
  };
}

function advanceAtlasState(
  atlas: AuroraParticleAtlasState,
  dtSeconds: number
): AuroraParticleAtlasState {
  if (!atlas.secondsPerFrame || atlas.secondsPerFrame <= 0) {
    return { ...atlas };
  }
  const frameStart = atlas.frameStart ?? 0;
  const frameEnd = atlas.frameEnd ?? frameStart;
  const elapsed = atlas.checkpointSeconds + dtSeconds;
  if (elapsed < atlas.secondsPerFrame) {
    return {
      ...atlas,
      checkpointSeconds: elapsed
    };
  }
  const direction = frameStart <= frameEnd ? 1 : -1;
  const nextFrame = atlas.frameIndex + direction;
  const wrappedFrame =
    direction > 0
      ? nextFrame > frameEnd
        ? frameStart
        : nextFrame
      : nextFrame < frameEnd
        ? frameStart
        : nextFrame;
  return {
    ...atlas,
    // Retail advances at most one frame and writes the particle's current age
    // as the next checkpoint, dropping overshoot instead of catching up.
    checkpointSeconds: 0,
    frameIndex: wrappedFrame
  };
}

function addTickDiagnostic(
  state: AuroraEmitterRuntimeState,
  code: string,
  severity: AuroraVfxDiagnostic["severity"],
  message: string
): void {
  const diagnostic = { code, severity, message };
  state.lastTickDiagnostics.push(diagnostic);
}

function resolveExecutionSpawnCount(
  state: AuroraEmitterRuntimeState,
  requestedCount: number
): number {
  const reusableCount = state.freeParticleIds.length;
  const allocationCount = Math.max(
    0,
    state.executionParticleBudget - state.particles.length
  );
  return Math.min(
    Math.max(0, Math.trunc(requestedCount)),
    reusableCount + allocationCount
  );
}

function addExecutionParticleBudgetDiagnostic(
  state: AuroraEmitterRuntimeState
): void {
  if (
    state.lastTickDiagnostics.some(
      (diagnostic) => diagnostic.code === "VFX_EXECUTION_PARTICLE_BUDGET_EXHAUSTED"
    )
  ) {
    return;
  }
  addTickDiagnostic(
    state,
    "VFX_EXECUTION_PARTICLE_BUDGET_EXHAUSTED",
    "warn",
    `Emitter '${state.emitterNodeName}' reached server executionParticleBudget=${state.executionParticleBudget}; no canonical Aurora particle-count limit was inferred.`
  );
}

function ensureParticleListCapacity(
  state: AuroraEmitterRuntimeState,
  list: "active" | "free",
  requiredCount: number
): void {
  let capacity = list === "active" ? state.activeCapacity : state.freeCapacity;
  while (requiredCount > capacity) {
    const previousCapacity = capacity;
    capacity =
      capacity === 0
        ? AURORA_PARTICLE_LIST_INITIAL_CAPACITY
        : capacity * 2;
    state.capacityGrowth.push({
      list,
      previousCapacity,
      nextCapacity: capacity,
      requiredCount,
      changedAtClockSeconds: state.localClockSeconds
    });
  }
  if (list === "active") {
    state.activeCapacity = capacity;
  } else {
    state.freeCapacity = capacity;
  }
}

function mergeDiagnostics(
  existing: AuroraVfxDiagnostic[],
  next: AuroraVfxDiagnostic[]
): AuroraVfxDiagnostic[] {
  const seen = new Set<string>();
  return [...existing, ...next].filter((diagnostic) => {
    const key = `${diagnostic.code}:${diagnostic.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function cloneRuntimeState(state: AuroraEmitterRuntimeState): AuroraEmitterRuntimeState {
  return {
    ...state,
    rng: { ...state.rng },
    source: {
      ...state.source,
      ...(state.source.chunkName ? { chunkName: state.source.chunkName } : {}),
      simulation: state.source.simulation ? { ...state.source.simulation } : undefined,
      sourceState: state.source.sourceState ? { ...state.source.sourceState } : undefined,
      atlas: state.source.atlas ? { ...state.source.atlas } : undefined,
      transform: state.source.transform ? { ...state.source.transform } : undefined,
      ...(state.source.renderModeRaw ? { renderModeRaw: state.source.renderModeRaw } : {})
    },
    particles: state.particles.map((particle) => ({
      ...particle,
      ...(particle.rotationAxis ? { rotationAxis: { ...particle.rotationAxis } } : {}),
      ...(particle.particleOrientation
        ? { particleOrientation: cloneAuroraMdlOrientation(particle.particleOrientation) }
        : {}),
      position: { ...particle.position },
      ...(particle.previousPosition ? { previousPosition: { ...particle.previousPosition } } : {}),
      velocity: { ...particle.velocity },
      ...(particle.direction ? { direction: { ...particle.direction } } : {}),
      ...(particle.contactNormal ? { contactNormal: { ...particle.contactNormal } } : {}),
      ...(particle.inheritedVelocityMagnitude !== undefined
        ? { inheritedVelocityMagnitude: particle.inheritedVelocityMagnitude }
        : {}),
      ...(particle.inheritedVelocityDirection
        ? { inheritedVelocityDirection: { ...particle.inheritedVelocityDirection } }
        : {}),
      acceleration: { ...particle.acceleration },
      color: { ...particle.color },
      size: { ...particle.size },
      atlas: { ...particle.atlas },
      ...(particle.chunkModelRuntimeRef
        ? { chunkModelRuntimeRef: { ...particle.chunkModelRuntimeRef } }
        : {})
    })),
    activeParticleIds: [...state.activeParticleIds],
    freeParticleIds: [...state.freeParticleIds],
    ...(state.trailPreviousSourcePosition
      ? { trailPreviousSourcePosition: { ...state.trailPreviousSourcePosition } }
      : {}),
    trailResidualVector: { ...(state.trailResidualVector ?? zeroVector()) },
    lightningDelayTimerSeconds: state.lightningDelayTimerSeconds,
    ...(state.lightningCachedSourcePosition
      ? { lightningCachedSourcePosition: { ...state.lightningCachedSourcePosition } }
      : {}),
    ...(state.lightningCachedTargetVector
      ? { lightningCachedTargetVector: { ...state.lightningCachedTargetVector } }
      : {}),
    membershipLog: state.membershipLog.map((entry) => ({ ...entry })),
    capacityGrowth: state.capacityGrowth.map((entry) => ({ ...entry })),
    collisionQueryHelper: {
      ...state.collisionQueryHelper,
      initArguments: { ...state.collisionQueryHelper.initArguments }
    },
    collisionQueries: state.collisionQueries.map((entry) => ({
      ...entry,
      queryHelperInitArguments: { ...entry.queryHelperInitArguments },
      currentPosition: { ...entry.currentPosition },
      predictedPosition: { ...entry.predictedPosition },
      testEndpoint: { ...entry.testEndpoint },
      velocityBeforeCollision: { ...entry.velocityBeforeCollision },
      ...(entry.chunkModelRuntimeRef
        ? { chunkModelRuntimeRef: { ...entry.chunkModelRuntimeRef } }
        : {}),
      requestedCollisionClasses: [...entry.requestedCollisionClasses]
    })),
    collisionResults: state.collisionResults.map((entry) => ({
      ...entry,
      ...(entry.hitPosition ? { hitPosition: { ...entry.hitPosition } } : {}),
      ...(entry.contactNormal ? { contactNormal: { ...entry.contactNormal } } : {}),
      ...(entry.reflectedVelocity
        ? { reflectedVelocity: { ...entry.reflectedVelocity } }
        : {}),
      ...(entry.postNudgePosition
        ? { postNudgePosition: { ...entry.postNudgePosition } }
        : {}),
      diagnostics: [...(entry.diagnostics ?? [])]
    })),
    processedDetonateEventKeys: [...(state.processedDetonateEventKeys ?? [])],
    detonateCallbackTrace: (state.detonateCallbackTrace ?? []).map((entry) => ({ ...entry })),
    diagnostics: [...state.diagnostics],
    lastTickDiagnostics: [...state.lastTickDiagnostics]
  };
}

function sanitizeDeltaSeconds(value: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function normalizeEmitterToken(value: string | undefined): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeSeed(value: number): number {
  return (Number.isFinite(value) ? Math.trunc(value) : DEFAULT_RNG_SEED) >>> 0;
}

function vectorFromTuple(value: [number, number, number] | undefined): AuroraRuntimeVector3 {
  return {
    x: value?.[0] ?? 0,
    y: value?.[1] ?? 0,
    z: value?.[2] ?? 0
  };
}

function zeroVector(): AuroraRuntimeVector3 {
  return { x: 0, y: 0, z: 0 };
}

function addVector(left: AuroraRuntimeVector3, right: AuroraRuntimeVector3): AuroraRuntimeVector3 {
  return {
    x: left.x + right.x,
    y: left.y + right.y,
    z: left.z + right.z
  };
}

function subtractVector(left: AuroraRuntimeVector3, right: AuroraRuntimeVector3): AuroraRuntimeVector3 {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
    z: left.z - right.z
  };
}

function scaleVector(vector: AuroraRuntimeVector3, scalar: number): AuroraRuntimeVector3 {
  return {
    x: vector.x * scalar,
    y: vector.y * scalar,
    z: vector.z * scalar
  };
}

function toAuroraFloat32Vector(vector: AuroraRuntimeVector3): AuroraRuntimeVector3 {
  return {
    x: Math.fround(vector.x),
    y: Math.fround(vector.y),
    z: Math.fround(vector.z)
  };
}

function scaleAuroraFloat32Vector(
  vector: AuroraRuntimeVector3,
  scalar: number
): AuroraRuntimeVector3 {
  const storedScalar = Math.fround(scalar);
  return {
    x: Math.fround(Math.fround(vector.x) * storedScalar),
    y: Math.fround(Math.fround(vector.y) * storedScalar),
    z: Math.fround(Math.fround(vector.z) * storedScalar)
  };
}

function addAuroraFloat32Vectors(
  left: AuroraRuntimeVector3,
  right: AuroraRuntimeVector3
): AuroraRuntimeVector3 {
  return {
    x: Math.fround(Math.fround(left.x) + Math.fround(right.x)),
    y: Math.fround(Math.fround(left.y) + Math.fround(right.y)),
    z: Math.fround(Math.fround(left.z) + Math.fround(right.z))
  };
}

function dotVector(left: AuroraRuntimeVector3, right: AuroraRuntimeVector3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

function vectorLength(vector: AuroraRuntimeVector3): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function isFiniteVector(vector: AuroraRuntimeVector3): boolean {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

function resetTrailEmissionState(state: AuroraEmitterRuntimeState): void {
  state.trailPreviousSourcePosition = undefined;
  state.trailResidualVector = zeroVector();
}

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function resolveAuroraParticleRotationRateRadians(value: number | undefined): number {
  return finiteOr(value, 0);
}

function wrapAuroraParticleRotationRadians(value: number): number {
  if (value > AURORA_TWO_PI) {
    return value - AURORA_TWO_PI;
  }
  if (value < -AURORA_TWO_PI) {
    return value + AURORA_TWO_PI;
  }
  return value;
}

function finiteOrPositive(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function finiteNonZeroOr(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) > 1e-12
    ? value
    : fallback;
}

function buildDetonateEventKey(event: { timeSeconds: number; animationName?: string }): string {
  const timeKey = Number.isFinite(event.timeSeconds) ? event.timeSeconds.toFixed(6) : "unknown";
  return `${timeKey}:${event.animationName ?? ""}`;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function truncateAuroraFloatToInt(value: number): number {
  return Math.trunc(value);
}

function auroraRand15FromFloat(value: number): number {
  return Math.min(0x7fff, Math.max(0, Math.floor(value * 0x8000)));
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
