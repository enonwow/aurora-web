import type {
  AuroraMdlEmitterNode,
  AuroraMdlEmitterSimulation,
  AuroraMdlEmitterSourceState
} from "./aurora-mdl-vfx-source.parser";
import type { AuroraVfxDiagnostic } from "./aurora-vfx-source.parser";

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
  | "single_shot"
  | "chunk_model_placeholder";
export type AuroraParticleDeathReason =
  | "expired_lifetime"
  | "lightning_target_missing"
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
  position: AuroraRuntimeVector3;
  velocity: AuroraRuntimeVector3;
  acceleration: AuroraRuntimeVector3;
  color: AuroraRuntimeColor;
  alpha: number;
  size: {
    x: number;
    y: number;
  };
  atlas: AuroraParticleAtlasState;
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

export interface AuroraDeterministicRngState {
  algorithm: "aurora-rand15";
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
  particleId?: number;
  reason: "bounce" | "splat";
  status: "context_required" | "pending" | "resolved";
}

export interface AuroraParticleCollisionResult {
  queryId: string;
  particleId?: number;
  collided: boolean;
  normal?: AuroraRuntimeVector3;
  position?: AuroraRuntimeVector3;
}

export interface AuroraParticleCollisionContext {
  resolve(query: AuroraParticleCollisionQuery): AuroraParticleCollisionResult | undefined;
}

export interface AuroraEmitterRuntimeContext {
  rngHook?: AuroraDeterministicRngHook;
  profile?: {
    runtimeProfileId?: string;
    particleLimit?: number;
  };
  targetRef?: string;
  targetPosition?: AuroraRuntimeVector3;
  detonateEvents?: Array<{
    timeSeconds: number;
    animationName?: string;
  }>;
  collisionContext?: AuroraParticleCollisionContext;
}

export interface AuroraEmitterRuntimeTickInput {
  dtSeconds: number;
  context?: AuroraEmitterRuntimeContext;
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
  nextParticleId: number;
  particleLimit: number;
  rng: AuroraDeterministicRngState;
  source: {
    emitterType?: string;
    chunkName?: string;
    simulation?: AuroraMdlEmitterSimulation;
    sourceState?: AuroraMdlEmitterSourceState;
    atlas?: AuroraMdlEmitterNode["atlas"];
    transform?: AuroraMdlEmitterNode["transform"];
  };
  particles: AuroraParticleRuntimeRecord[];
  activeParticleIds: number[];
  freeParticleIds: number[];
  membershipLog: AuroraParticleListMembershipRecord[];
  collisionQueries: AuroraParticleCollisionQuery[];
  collisionResults: AuroraParticleCollisionResult[];
  singleShotEmitted: boolean;
  processedDetonateEventKeys: string[];
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
  activeParticles: Array<{
    particleId: number;
    ageSeconds: number;
    lifetimeSeconds: number;
    rotationRadians: number;
    position: AuroraRuntimeVector3;
    velocity: AuroraRuntimeVector3;
    acceleration: AuroraRuntimeVector3;
    color: AuroraRuntimeColor;
    alpha: number;
    size: { x: number; y: number };
    atlas: AuroraParticleAtlasState;
  }>;
  freeParticleIds: number[];
  diagnostics: AuroraVfxDiagnostic[];
}

export interface CreateAuroraEmitterRuntimeStateOptions {
  family?: AuroraEmitterRuntimeFamily;
  particleLimit?: number;
  seed?: number;
}

const DEFAULT_PARTICLE_LIMIT = 64;
const DEFAULT_RNG_SEED = 0x12345678;
const AURORA_TWO_PI = 6.2831855;

export function createAuroraEmitterRuntimeState(
  emitter: AuroraMdlEmitterNode,
  options: CreateAuroraEmitterRuntimeStateOptions = {}
): AuroraEmitterRuntimeState {
  const particleLimit = Math.max(
    1,
    Math.trunc(options.particleLimit ?? DEFAULT_PARTICLE_LIMIT)
  );
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
    nextParticleId: 1,
    particleLimit,
    rng: {
      algorithm: "aurora-rand15",
      seed: normalizeSeed(options.seed ?? DEFAULT_RNG_SEED)
    },
    source: {
      ...(emitter.emitterType ? { emitterType: emitter.emitterType } : {}),
      ...(emitter.chunkName ? { chunkName: emitter.chunkName } : {}),
      ...(emitter.simulation ? { simulation: emitter.simulation } : {}),
      ...(emitter.sourceState ? { sourceState: emitter.sourceState } : {}),
      ...(emitter.atlas ? { atlas: emitter.atlas } : {}),
      ...(emitter.transform ? { transform: emitter.transform } : {})
    },
    particles: [],
    activeParticleIds: [],
    freeParticleIds: [],
    membershipLog: [],
    collisionQueries: [],
    collisionResults: [],
    singleShotEmitted: false,
    processedDetonateEventKeys: [],
    diagnostics: [],
    lastTickDiagnostics: []
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

  ageActiveParticles(next, dtSeconds);
  resolveCollisionContracts(next, context);

  switch (next.family) {
    case "Fountain":
      tickFountainRuntime(next, dtSeconds, context);
      break;
    case "Single":
      tickSingleRuntime(next);
      break;
    case "Explosion":
      tickExplosionRuntime(next, context);
      break;
    case "P2P":
      tickP2PRuntime(next, context);
      break;
    case "Lightning":
      tickLightningRuntime(next, context);
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
        position: { ...particle.position },
        velocity: { ...particle.velocity },
        acceleration: { ...particle.acceleration },
        color: { ...particle.color },
        alpha: particle.alpha,
        size: { ...particle.size },
        atlas: { ...particle.atlas }
      })),
    freeParticleIds: [...state.freeParticleIds],
    ...(state.trailPreviousSourcePosition
      ? { trailPreviousSourcePosition: { ...state.trailPreviousSourcePosition } }
      : {}),
    trailResidualVector: {
      ...(state.trailResidualVector ?? zeroVector())
    },
    diagnostics: [...state.diagnostics]
  };
}

export function resolveAuroraEmitterRuntimeFamily(
  emitter: Pick<AuroraMdlEmitterNode, "emitterType" | "chunkName" | "simulation">
): AuroraEmitterRuntimeFamily {
  const token = normalizeEmitterToken(emitter.emitterType);
  if (token.includes("fountain")) {
    return "Fountain";
  }
  if (token.includes("single")) {
    return "Single";
  }
  if (token.includes("explosion")) {
    return "Explosion";
  }
  if (token.includes("p2p")) {
    return "P2P";
  }
  if (token.includes("lightning")) {
    return "Lightning";
  }
  if (token.includes("chunk")) {
    return "Chunk";
  }
  if (emitter.simulation?.p2p === true) {
    return "P2P";
  }
  if (emitter.chunkName && !token) {
    return "Chunk";
  }
  return "Unknown";
}

export const defaultAuroraDeterministicRngHook: AuroraDeterministicRngHook = {
  nextFloat(state) {
    const seed = normalizeSeed((Math.imul(state.seed, 0x15a4e35) + 1) >>> 0);
    const sample = (seed >>> 16) & 0x7fff;
    return {
      value: sample / 0x8000,
      state: {
        algorithm: "aurora-rand15",
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

  if (simulation.spawnType === 1) {
    tickFountainTrailRuntime(state, simulation, context);
    return;
  }

  const spawnIntervalSeconds = 1 / birthrate;
  state.spawnAccumulator += dtSeconds;
  if (state.spawnAccumulator < spawnIntervalSeconds) {
    return;
  }
  state.spawnAccumulator = 0;
  spawnFountainParticle(state, simulation, context);
}

function tickFountainTrailRuntime(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  context: AuroraEmitterRuntimeContext
): void {
  const sourcePosition = vectorFromTuple(state.source.transform?.position);
  const previousSourcePosition = state.trailPreviousSourcePosition ?? sourcePosition;
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
  const spawnCount = Math.min(
    Math.max(0, Math.floor(segmentDistance / spawnSpacing)),
    Math.max(0, state.particleLimit - state.activeParticleIds.length)
  );
  if (spawnCount < 1) {
    state.trailResidualVector = segmentVector;
    return;
  }

  let lastSpawnPosition = segmentStart;
  for (let index = 1; index <= spawnCount; index += 1) {
    lastSpawnPosition = addVector(segmentStart, scaleVector(unitVector, spawnSpacing * index));
    spawnFountainParticle(
      state,
      simulation,
      context,
      lastSpawnPosition,
      "trail_distance_spawned"
    );
  }
  state.trailResidualVector = subtractVector(sourcePosition, lastSpawnPosition);
}

function tickSingleRuntime(state: AuroraEmitterRuntimeState): void {
  const simulation = state.source.simulation ?? {};
  const lifeExp = simulation.lifeExp;
  if (!(typeof lifeExp === "number" && Number.isFinite(lifeExp) && lifeExp > 0)) {
    addTickDiagnostic(
      state,
      "VFX_SINGLE_LIFEEXP_REQUIRED",
      "warn",
      "Single emitter runtime requires positive lifeExp before a local diagnostic shot can spawn."
    );
    state.spawnAccumulator = 0;
    return;
  }
  if (!state.singleShotEmitted) {
    spawnSingleShotParticle(state, simulation);
    state.singleShotEmitted = true;
    addTickDiagnostic(
      state,
      "VFX_SINGLE_LOCAL_SHOT_DIAGNOSTIC",
      "info",
      "Single runtime emitted one deterministic local diagnostic particle without using the Fountain accumulator."
    );
    addTickDiagnostic(
      state,
      "VFX_SINGLE_RETAIL_RUNTIME_DUMP_REQUIRED",
      "warn",
      "Retail Single runtime tick dumps are still required before canonical parity can be promoted."
    );
  } else {
    addTickDiagnostic(
      state,
      "VFX_SINGLE_LOCAL_SHOT_ALREADY_EMITTED",
      "info",
      "Single runtime already emitted its deterministic local diagnostic particle; no duplicate shot was spawned."
    );
  }
  state.spawnAccumulator = 0;
}

function tickExplosionRuntime(
  state: AuroraEmitterRuntimeState,
  context: AuroraEmitterRuntimeContext
): void {
  const detonateEvents = context.detonateEvents ?? [];
  if (detonateEvents.length === 0) {
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
  const pendingEvents = detonateEvents.filter((event) => {
    const eventKey = buildDetonateEventKey(event);
    return !state.processedDetonateEventKeys.includes(eventKey);
  });
  if (pendingEvents.length === 0) {
    addTickDiagnostic(
      state,
      "VFX_EXPLOSION_DETONATE_EVENT_ALREADY_PROCESSED",
      "info",
      "Explosion detonate event was already consumed; no duplicate local burst was spawned."
    );
    state.spawnAccumulator = 0;
    return;
  }

  const simulation = state.source.simulation ?? {};
  for (const event of pendingEvents) {
    state.processedDetonateEventKeys.push(buildDetonateEventKey(event));
    spawnExplosionBurst(state, simulation, context);
  }
  addTickDiagnostic(
    state,
    "VFX_EXPLOSION_DETONATE_EVENT_CONSUMED",
    "info",
    "Explosion runtime consumed an explicit detonate event and emitted a deterministic local burst."
  );
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
  state.spawnAccumulator = 0;
}

function tickP2PRuntime(
  state: AuroraEmitterRuntimeState,
  context: AuroraEmitterRuntimeContext
): void {
  if (!context.targetRef && !context.targetPosition) {
    addTickDiagnostic(
      state,
      "VFX_P2P_TARGET_RUNTIME_POINTER_REQUIRED",
      "warn",
      "P2P runtime requires a target pointer/context; no origin fallback was used."
    );
    state.spawnAccumulator = 0;
    return;
  }
  if (!context.targetPosition) {
    addTickDiagnostic(
      state,
      "VFX_P2P_TARGET_POSITION_REQUIRED_FOR_LOCAL_DIAGNOSTIC",
      "warn",
      "P2P local runtime diagnostics require a resolved target position; targetRef alone is not enough to synthesize a diagnostic path."
    );
    state.spawnAccumulator = 0;
    return;
  }
  syncP2PPathParticles(state, state.source.simulation ?? {}, context.targetPosition);
  addTickDiagnostic(
    state,
    "VFX_P2P_TARGET_CONTEXT_CONSUMED",
    "info",
    "P2P runtime consumed a resolved target position and emitted a deterministic local diagnostic path."
  );
  addTickDiagnostic(
    state,
    "VFX_P2P_LOCAL_GRAVITY_PATH_DIAGNOSTIC",
    "info",
    "P2P path runtime is local diagnostic evidence only until retail target mapping and runtime tick dumps are supplied."
  );
  addTickDiagnostic(
    state,
    "VFX_P2P_RETAIL_RUNTIME_DUMP_REQUIRED",
    "warn",
    "Retail P2P target mapping and runtime tick dumps are still required before canonical parity can be promoted."
  );
  state.spawnAccumulator = 0;
}

function tickLightningRuntime(
  state: AuroraEmitterRuntimeState,
  context: AuroraEmitterRuntimeContext
): void {
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
  syncLightningTargetParticles(state, state.source.simulation ?? {}, context.targetPosition);
  addTickDiagnostic(
    state,
    "VFX_LIGHTNING_TARGET_CONTEXT_CONSUMED",
    "info",
    "Lightning runtime consumed a resolved target position and emitted deterministic local active points."
  );
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
  const chunkName = state.source.chunkName;
  if (!chunkName) {
    addTickDiagnostic(
      state,
      "VFX_CHUNK_MODEL_RESOURCE_REQUIRED",
      "warn",
      "Chunk runtime requires a chunkName resource token before local chunk-model placeholders can be tracked."
    );
    addTickDiagnostic(
      state,
      "VFX_CHUNK_NO_TEXTURED_QUAD_FALLBACK",
      "warn",
      "Chunk runtime did not synthesize textured-quad fallback particles without a chunk model resource."
    );
    state.spawnAccumulator = 0;
    return;
  }
  syncChunkPlaceholderParticles(state, state.source.simulation ?? {});
  addTickDiagnostic(
    state,
    "VFX_CHUNK_MODEL_LANE_PRESERVED",
    "info",
    "Chunk runtime preserved chunk-model lane placeholder records without textured-quad draw fallback."
  );
  addTickDiagnostic(
    state,
    "VFX_CHUNK_LOCAL_PLACEHOLDER_DIAGNOSTIC",
    "info",
    "Chunk placeholder records are local runtime diagnostics only until retail chunk model resources and render captures are supplied."
  );
  addTickDiagnostic(
    state,
    "VFX_CHUNK_RETAIL_RESOURCE_CAPTURE_REQUIRED",
    "warn",
    "Retail chunk model resource resolution, runtime tick dumps, and render captures are still required before canonical parity can be promoted."
  );
  state.spawnAccumulator = 0;
}

function spawnFountainParticle(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  context: AuroraEmitterRuntimeContext,
  positionOverride?: AuroraRuntimeVector3,
  resetReason: AuroraParticleResetReason = "spawned"
): void {
  if (state.activeParticleIds.length >= state.particleLimit) {
    return;
  }

  const particleId = state.freeParticleIds.shift() ?? state.nextParticleId;
  if (particleId === state.nextParticleId) {
    state.nextParticleId += 1;
  }
  const slotIndex = particleId - 1;
  const lifetimeSeconds = simulation.lifeExp!;
  const basePosition = positionOverride ?? vectorFromTuple(state.source.transform?.position);
  const velocity = buildInitialFountainVelocity(state, simulation, context);
  const acceleration = {
    x: 0,
    y: 0,
    z: -(typeof simulation.grav === "number" && Number.isFinite(simulation.grav)
      ? simulation.grav
      : 0)
  };
  const particle: AuroraParticleRuntimeRecord = {
    particleId,
    slotIndex,
    list: "active",
    ageSeconds: 0,
    lifetimeSeconds,
    rotationRadians: 0,
    position: basePosition,
    velocity,
    acceleration,
    color: sampleParticleColor(simulation, 0),
    alpha: sampleParticleAlpha(simulation, 0),
    size: sampleParticleSize(simulation, 0),
    atlas: buildInitialAtlasState(state.source.atlas),
    resetReason
  };

  const existingIndex = state.particles.findIndex((entry) => entry.particleId === particleId);
  if (existingIndex >= 0) {
    state.particles[existingIndex] = particle;
  } else {
    state.particles.push(particle);
  }
  if (!state.activeParticleIds.includes(particleId)) {
    state.activeParticleIds.push(particleId);
  }
  state.membershipLog.push({
    particleId,
    slotIndex,
    list: "active",
    changedAtClockSeconds: state.localClockSeconds,
    resetReason
  });
}

function spawnExplosionBurst(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  context: AuroraEmitterRuntimeContext
): void {
  const activeCapacity = Math.max(0, state.particleLimit - state.activeParticleIds.length);
  if (activeCapacity === 0) {
    return;
  }
  const requestedCount = Math.max(
    1,
    Math.trunc(
      typeof simulation.birthrate === "number" && Number.isFinite(simulation.birthrate)
        ? simulation.birthrate
        : 1
    )
  );
  const spawnCount = Math.min(activeCapacity, requestedCount);
  for (let index = 0; index < spawnCount; index += 1) {
    spawnExplosionParticle(state, simulation, context, index, spawnCount);
  }
}

function spawnSingleShotParticle(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation
): void {
  if (state.activeParticleIds.length >= state.particleLimit) {
    return;
  }
  const particleId = state.freeParticleIds.shift() ?? state.nextParticleId;
  if (particleId === state.nextParticleId) {
    state.nextParticleId += 1;
  }
  const slotIndex = particleId - 1;
  const particle: AuroraParticleRuntimeRecord = {
    particleId,
    slotIndex,
    list: "active",
    ageSeconds: 0,
    lifetimeSeconds: simulation.lifeExp!,
    rotationRadians: 0,
    position: vectorFromTuple(state.source.transform?.position),
    velocity: { x: 0, y: 0, z: 0 },
    acceleration: { x: 0, y: 0, z: 0 },
    color: sampleParticleColor(simulation, 0),
    alpha: sampleParticleAlpha(simulation, 0),
    size: sampleParticleSize(simulation, 0),
    atlas: buildInitialAtlasState(state.source.atlas),
    resetReason: "single_shot"
  };

  const existingIndex = state.particles.findIndex((entry) => entry.particleId === particleId);
  if (existingIndex >= 0) {
    state.particles[existingIndex] = particle;
  } else {
    state.particles.push(particle);
  }
  if (!state.activeParticleIds.includes(particleId)) {
    state.activeParticleIds.push(particleId);
  }
  state.membershipLog.push({
    particleId,
    slotIndex,
    list: "active",
    changedAtClockSeconds: state.localClockSeconds,
    resetReason: "single_shot"
  });
}

function spawnExplosionParticle(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  context: AuroraEmitterRuntimeContext,
  burstIndex: number,
  burstCount: number
): void {
  const particleId = state.freeParticleIds.shift() ?? state.nextParticleId;
  if (particleId === state.nextParticleId) {
    state.nextParticleId += 1;
  }
  const slotIndex = particleId - 1;
  const lifetimeSeconds = finiteOrPositive(simulation.lifeExp, 1);
  const basePosition = vectorFromTuple(state.source.transform?.position);
  const velocity = buildExplosionBurstVelocity(state, simulation, context, burstIndex, burstCount);
  const acceleration = {
    x: 0,
    y: 0,
    z: -(typeof simulation.grav === "number" && Number.isFinite(simulation.grav)
      ? simulation.grav
      : 0)
  };
  const particle: AuroraParticleRuntimeRecord = {
    particleId,
    slotIndex,
    list: "active",
    ageSeconds: 0,
    lifetimeSeconds,
    rotationRadians: 0,
    position: basePosition,
    velocity,
    acceleration,
    color: sampleParticleColor(simulation, 0),
    alpha: sampleParticleAlpha(simulation, 0),
    size: sampleParticleSize(simulation, 0),
    atlas: buildInitialAtlasState(state.source.atlas),
    resetReason: "explosion_detonate_burst"
  };

  const existingIndex = state.particles.findIndex((entry) => entry.particleId === particleId);
  if (existingIndex >= 0) {
    state.particles[existingIndex] = particle;
  } else {
    state.particles.push(particle);
  }
  if (!state.activeParticleIds.includes(particleId)) {
    state.activeParticleIds.push(particleId);
  }
  state.membershipLog.push({
    particleId,
    slotIndex,
    list: "active",
    changedAtClockSeconds: state.localClockSeconds,
    resetReason: "explosion_detonate_burst"
  });
}

function syncP2PPathParticles(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  targetPosition: AuroraRuntimeVector3
): void {
  const requestedCount = Math.min(state.particleLimit, 7);
  const sourcePosition = vectorFromTuple(state.source.transform?.position);
  while (state.activeParticleIds.length < requestedCount) {
    spawnP2PPathParticle(state, simulation, sourcePosition);
  }
  const pathParticleIds = state.activeParticleIds.slice(0, requestedCount);
  pathParticleIds.forEach((particleId, index) => {
    const particle = state.particles.find((entry) => entry.particleId === particleId);
    if (!particle) {
      return;
    }
    const normalizedIndex = requestedCount > 1 ? index / (requestedCount - 1) : 0;
    particle.position = sampleP2PPathPosition(sourcePosition, targetPosition, normalizedIndex);
    particle.velocity = { x: 0, y: 0, z: 0 };
    particle.acceleration = { x: 0, y: 0, z: 0 };
    particle.lifetimeSeconds = finiteOrPositive(simulation.lifeExp, 1);
    particle.color = sampleParticleColor(simulation, normalizedIndex);
    particle.alpha = sampleParticleAlpha(simulation, normalizedIndex);
    particle.size = sampleParticleSize(simulation, normalizedIndex);
    particle.resetReason = "p2p_target_path";
  });
}

function spawnP2PPathParticle(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  sourcePosition: AuroraRuntimeVector3
): void {
  const particleId = state.freeParticleIds.shift() ?? state.nextParticleId;
  if (particleId === state.nextParticleId) {
    state.nextParticleId += 1;
  }
  const slotIndex = particleId - 1;
  const particle: AuroraParticleRuntimeRecord = {
    particleId,
    slotIndex,
    list: "active",
    ageSeconds: 0,
    lifetimeSeconds: finiteOrPositive(simulation.lifeExp, 1),
    rotationRadians: 0,
    position: { ...sourcePosition },
    velocity: { x: 0, y: 0, z: 0 },
    acceleration: { x: 0, y: 0, z: 0 },
    color: sampleParticleColor(simulation, 0),
    alpha: sampleParticleAlpha(simulation, 0),
    size: sampleParticleSize(simulation, 0),
    atlas: buildInitialAtlasState(state.source.atlas),
    resetReason: "p2p_target_path"
  };
  const existingIndex = state.particles.findIndex((entry) => entry.particleId === particleId);
  if (existingIndex >= 0) {
    state.particles[existingIndex] = particle;
  } else {
    state.particles.push(particle);
  }
  if (!state.activeParticleIds.includes(particleId)) {
    state.activeParticleIds.push(particleId);
  }
  state.membershipLog.push({
    particleId,
    slotIndex,
    list: "active",
    changedAtClockSeconds: state.localClockSeconds,
    resetReason: "p2p_target_path"
  });
}

function sampleP2PPathPosition(
  sourcePosition: AuroraRuntimeVector3,
  targetPosition: AuroraRuntimeVector3,
  normalizedIndex: number
): AuroraRuntimeVector3 {
  const t = clamp01(normalizedIndex);
  const arcLift = 4 * t * (1 - t) * 0.35;
  return {
    x: lerp(sourcePosition.x, targetPosition.x, t),
    y: lerp(sourcePosition.y, targetPosition.y, t),
    z: lerp(sourcePosition.z, targetPosition.z, t) + arcLift
  };
}

// Canonical Aurora lightning bolt: subdivide the source->target axis into
// segments and jitter the intermediate points perpendicular to the axis by up to
// `lightningRadius`; bolt width comes from `lightningScale`. Points are emitted as
// an ordered active chain so the render contract links them into billboard
// segments (renderMode "Linked"). The bolt is regenerated once per
// `lightningDelay` window via the deterministic RNG.
// RETAIL_CONFIRM: exact subdivision count and jitter distribution still require
// the LightningEmitter render-method math from the toolset binary.
const LIGHTNING_BOLT_SEGMENTS = 8;

function syncLightningTargetParticles(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  targetPosition: AuroraRuntimeVector3
): void {
  const requestedCount = Math.max(
    2,
    Math.min(state.particleLimit, LIGHTNING_BOLT_SEGMENTS + 1)
  );
  const sourcePosition = vectorFromTuple(state.source.transform?.position);
  while (state.activeParticleIds.length < requestedCount) {
    spawnLightningTargetParticle(state, simulation, sourcePosition);
  }
  const pathParticleIds = state.activeParticleIds.slice(0, requestedCount);

  const axis = {
    x: targetPosition.x - sourcePosition.x,
    y: targetPosition.y - sourcePosition.y,
    z: targetPosition.z - sourcePosition.z
  };
  const axisLength = Math.hypot(axis.x, axis.y, axis.z) || 1;
  const axisUnit = {
    x: axis.x / axisLength,
    y: axis.y / axisLength,
    z: axis.z / axisLength
  };
  const reference =
    Math.abs(axisUnit.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
  const perpRaw = {
    x: axisUnit.y * reference.z - axisUnit.z * reference.y,
    y: axisUnit.z * reference.x - axisUnit.x * reference.z,
    z: axisUnit.x * reference.y - axisUnit.y * reference.x
  };
  const perpLength = Math.hypot(perpRaw.x, perpRaw.y, perpRaw.z) || 1;
  const perpU = {
    x: perpRaw.x / perpLength,
    y: perpRaw.y / perpLength,
    z: perpRaw.z / perpLength
  };
  const perpV = {
    x: axisUnit.y * perpU.z - axisUnit.z * perpU.y,
    y: axisUnit.z * perpU.x - axisUnit.x * perpU.z,
    z: axisUnit.x * perpU.y - axisUnit.y * perpU.x
  };

  const radius = Math.max(0, finiteOrPositive(simulation.lightningRadius, 0));
  const width = Math.max(0, finiteOrPositive(simulation.lightningScale, 1));
  const delay = Math.max(0, finiteOrPositive(simulation.lightningDelay, 0));
  const boltWindow = delay > 0 ? Math.floor(state.localClockSeconds / delay) : 0;
  const rngHook = defaultAuroraDeterministicRngHook;
  let rngState: AuroraDeterministicRngState = {
    algorithm: state.rng.algorithm,
    seed: normalizeSeed((state.rng.seed ^ Math.imul(boltWindow + 1, 2654435761)) >>> 0)
  };

  pathParticleIds.forEach((particleId, index) => {
    const particle = state.particles.find((entry) => entry.particleId === particleId);
    if (!particle) {
      return;
    }
    const t = requestedCount > 1 ? index / (requestedCount - 1) : 0;
    const base = {
      x: sourcePosition.x + axis.x * t,
      y: sourcePosition.y + axis.y * t,
      z: sourcePosition.z + axis.z * t
    };
    const isEndpoint = index === 0 || index === requestedCount - 1;
    let offsetU = 0;
    let offsetV = 0;
    if (!isEndpoint && radius > 0) {
      const sampleA = rngHook.nextFloat(rngState);
      rngState = sampleA.state;
      const sampleB = rngHook.nextFloat(rngState);
      rngState = sampleB.state;
      offsetU = (sampleA.value * 2 - 1) * radius;
      offsetV = (sampleB.value * 2 - 1) * radius;
    }
    particle.position = {
      x: base.x + perpU.x * offsetU + perpV.x * offsetV,
      y: base.y + perpU.y * offsetU + perpV.y * offsetV,
      z: base.z + perpU.z * offsetU + perpV.z * offsetV
    };
    particle.velocity = { x: 0, y: 0, z: 0 };
    particle.acceleration = { x: 0, y: 0, z: 0 };
    particle.lifetimeSeconds = finiteOrPositive(simulation.lifeExp, 1);
    particle.color = sampleParticleColor(simulation, t);
    particle.alpha = sampleParticleAlpha(simulation, t);
    particle.size = { x: width, y: width };
    particle.resetReason = "lightning_target_path";
  });
  state.rng = rngState;
}

function spawnLightningTargetParticle(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  sourcePosition: AuroraRuntimeVector3
): void {
  const particleId = state.freeParticleIds.shift() ?? state.nextParticleId;
  if (particleId === state.nextParticleId) {
    state.nextParticleId += 1;
  }
  const slotIndex = particleId - 1;
  const particle: AuroraParticleRuntimeRecord = {
    particleId,
    slotIndex,
    list: "active",
    ageSeconds: 0,
    lifetimeSeconds: finiteOrPositive(simulation.lifeExp, 1),
    rotationRadians: 0,
    position: { ...sourcePosition },
    velocity: { x: 0, y: 0, z: 0 },
    acceleration: { x: 0, y: 0, z: 0 },
    color: sampleParticleColor(simulation, 0),
    alpha: sampleParticleAlpha(simulation, 0),
    size: sampleParticleSize(simulation, 0),
    atlas: buildInitialAtlasState(state.source.atlas),
    resetReason: "lightning_target_path"
  };
  const existingIndex = state.particles.findIndex((entry) => entry.particleId === particleId);
  if (existingIndex >= 0) {
    state.particles[existingIndex] = particle;
  } else {
    state.particles.push(particle);
  }
  if (!state.activeParticleIds.includes(particleId)) {
    state.activeParticleIds.push(particleId);
  }
  state.membershipLog.push({
    particleId,
    slotIndex,
    list: "active",
    changedAtClockSeconds: state.localClockSeconds,
    resetReason: "lightning_target_path"
  });
}

function syncChunkPlaceholderParticles(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation
): void {
  const requestedCount = Math.min(state.particleLimit, 2);
  const basePosition = vectorFromTuple(state.source.transform?.position);
  while (state.activeParticleIds.length < requestedCount) {
    spawnChunkPlaceholderParticle(state, simulation, basePosition);
  }
  state.activeParticleIds.slice(0, requestedCount).forEach((particleId) => {
    const particle = state.particles.find((entry) => entry.particleId === particleId);
    if (!particle) {
      return;
    }
    particle.position = { ...basePosition };
    particle.velocity = { x: 0, y: 0, z: 0 };
    particle.acceleration = { x: 0, y: 0, z: 0 };
    particle.lifetimeSeconds = finiteOrPositive(simulation.lifeExp, 1);
    particle.color = sampleParticleColor(simulation, 0);
    particle.alpha = sampleParticleAlpha(simulation, 0);
    particle.size = sampleParticleSize(simulation, 0);
    particle.resetReason = "chunk_model_placeholder";
  });
}

function spawnChunkPlaceholderParticle(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  basePosition: AuroraRuntimeVector3
): void {
  const particleId = state.freeParticleIds.shift() ?? state.nextParticleId;
  if (particleId === state.nextParticleId) {
    state.nextParticleId += 1;
  }
  const slotIndex = particleId - 1;
  const particle: AuroraParticleRuntimeRecord = {
    particleId,
    slotIndex,
    list: "active",
    ageSeconds: 0,
    lifetimeSeconds: finiteOrPositive(simulation.lifeExp, 1),
    rotationRadians: 0,
    position: { ...basePosition },
    velocity: { x: 0, y: 0, z: 0 },
    acceleration: { x: 0, y: 0, z: 0 },
    color: sampleParticleColor(simulation, 0),
    alpha: sampleParticleAlpha(simulation, 0),
    size: sampleParticleSize(simulation, 0),
    atlas: buildInitialAtlasState(state.source.atlas),
    resetReason: "chunk_model_placeholder"
  };
  const existingIndex = state.particles.findIndex((entry) => entry.particleId === particleId);
  if (existingIndex >= 0) {
    state.particles[existingIndex] = particle;
  } else {
    state.particles.push(particle);
  }
  if (!state.activeParticleIds.includes(particleId)) {
    state.activeParticleIds.push(particleId);
  }
  state.membershipLog.push({
    particleId,
    slotIndex,
    list: "active",
    changedAtClockSeconds: state.localClockSeconds,
    resetReason: "chunk_model_placeholder"
  });
}

function buildInitialFountainVelocity(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  context: AuroraEmitterRuntimeContext
): AuroraRuntimeVector3 {
  const baseVelocity =
    typeof simulation.velocity === "number" && Number.isFinite(simulation.velocity)
      ? simulation.velocity
      : 0;
  const randvel =
    typeof simulation.randvel === "number" && Number.isFinite(simulation.randvel)
      ? Math.max(0, simulation.randvel)
      : 0;
  const spread =
    typeof simulation.spread === "number" && Number.isFinite(simulation.spread)
      ? Math.max(0, simulation.spread)
      : 0;
  const rngHook = context.rngHook ?? defaultAuroraDeterministicRngHook;
  let angle = 0;
  let velocityJitter = 0;
  if (randvel > 0 || spread > 0) {
    const angleSample = rngHook.nextFloat(state.rng);
    state.rng = angleSample.state;
    angle = (angleSample.value - 0.5) * spread;
    const velocitySample = rngHook.nextFloat(state.rng);
    state.rng = velocitySample.state;
    velocityJitter = (velocitySample.value * 2 - 1) * randvel;
  }
  const speed = baseVelocity + velocityJitter;
  return {
    x: Math.sin(angle) * speed,
    y: 0,
    z: Math.cos(angle) * speed
  };
}

function buildExplosionBurstVelocity(
  state: AuroraEmitterRuntimeState,
  simulation: AuroraMdlEmitterSimulation,
  context: AuroraEmitterRuntimeContext,
  burstIndex: number,
  burstCount: number
): AuroraRuntimeVector3 {
  const baseVelocity =
    typeof simulation.velocity === "number" && Number.isFinite(simulation.velocity)
      ? simulation.velocity
      : 1;
  const randvel =
    typeof simulation.randvel === "number" && Number.isFinite(simulation.randvel)
      ? Math.max(0, simulation.randvel)
      : 0;
  const rngHook = context.rngHook ?? defaultAuroraDeterministicRngHook;
  let velocityJitter = 0;
  if (randvel > 0) {
    const velocitySample = rngHook.nextFloat(state.rng);
    state.rng = velocitySample.state;
    velocityJitter = (velocitySample.value * 2 - 1) * randvel;
  }
  const speed = baseVelocity + velocityJitter;
  const angle = (Math.PI * 2 * burstIndex) / Math.max(1, burstCount);
  return {
    x: Math.cos(angle) * speed,
    y: Math.sin(angle) * speed,
    z: speed * 0.35
  };
}

function ageActiveParticles(state: AuroraEmitterRuntimeState, dtSeconds: number): void {
  const active = new Set(state.activeParticleIds);
  for (const particle of state.particles) {
    if (!active.has(particle.particleId)) {
      continue;
    }
    particle.ageSeconds += dtSeconds;
    particle.position = {
      x: particle.position.x + particle.velocity.x * dtSeconds + 0.5 * particle.acceleration.x * dtSeconds * dtSeconds,
      y: particle.position.y + particle.velocity.y * dtSeconds + 0.5 * particle.acceleration.y * dtSeconds * dtSeconds,
      z: particle.position.z + particle.velocity.z * dtSeconds + 0.5 * particle.acceleration.z * dtSeconds * dtSeconds
    };
    particle.velocity = {
      x: particle.velocity.x + particle.acceleration.x * dtSeconds,
      y: particle.velocity.y + particle.acceleration.y * dtSeconds,
      z: particle.velocity.z + particle.acceleration.z * dtSeconds
    };
    const simulation = state.source.simulation ?? {};
    particle.rotationRadians = wrapAuroraParticleRotationRadians(
      finiteOr(particle.rotationRadians, 0) +
        resolveAuroraParticleRotationRateRadians(simulation.particleRot) * dtSeconds
    );
    const normalizedAge = particle.lifetimeSeconds > 0
      ? clamp01(particle.ageSeconds / particle.lifetimeSeconds)
      : 1;
    particle.color = sampleParticleColor(simulation, normalizedAge);
    particle.alpha = sampleParticleAlpha(simulation, normalizedAge);
    particle.size = sampleParticleSize(simulation, normalizedAge);
    particle.atlas = advanceAtlasState(particle.atlas, dtSeconds);
    if (particle.ageSeconds >= particle.lifetimeSeconds) {
      recycleParticle(state, particle, "expired_lifetime");
    }
  }
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

function recycleParticle(
  state: AuroraEmitterRuntimeState,
  particle: AuroraParticleRuntimeRecord,
  deathReason: AuroraParticleDeathReason
): void {
  particle.list = "free";
  particle.deathReason = deathReason;
  particle.resetReason = "recycled";
  state.activeParticleIds = state.activeParticleIds.filter((id) => id !== particle.particleId);
  if (!state.freeParticleIds.includes(particle.particleId)) {
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

function resolveCollisionContracts(
  state: AuroraEmitterRuntimeState,
  context: AuroraEmitterRuntimeContext
): void {
  const sourceState = state.source.sourceState ?? {};
  const simulation = state.source.simulation ?? {};
  const needsBounce = simulation.bounce === true;
  const needsSplat = sourceState.splat === true;
  if (!needsBounce && !needsSplat) {
    return;
  }
  if (!context.collisionContext) {
    addTickDiagnostic(
      state,
      "VFX_PARTICLE_COLLISION_CONTEXT_REQUIRED",
      "warn",
      "Emitter source requests bounce/splat behavior, but no collision context was provided."
    );
  }
  const reasons: Array<"bounce" | "splat"> = [
    ...(needsBounce ? (["bounce"] as const) : []),
    ...(needsSplat ? (["splat"] as const) : [])
  ];
  const active = state.activeParticleIds.length > 0 ? state.activeParticleIds : [undefined];
  for (const reason of reasons) {
    for (const particleId of active) {
      const query: AuroraParticleCollisionQuery = {
        queryId: `${state.emitterNodeName}:${reason}:${particleId ?? "source"}`,
        ...(particleId !== undefined ? { particleId } : {}),
        reason,
        status: context.collisionContext ? "pending" : "context_required"
      };
      state.collisionQueries.push(query);
      const result = context.collisionContext?.resolve(query);
      if (result) {
        query.status = "resolved";
        state.collisionResults.push(result);
      }
    }
  }
}

function sampleParticleColor(
  simulation: AuroraMdlEmitterSimulation,
  normalizedAge: number
): AuroraRuntimeColor {
  const color = sampleThreePointTuple(
    simulation.colorStart,
    simulation.colorMid,
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
  return sampleThreePointNumber(
    simulation.alphaStart,
    simulation.alphaMid,
    simulation.alphaEnd,
    normalizedAge,
    1
  );
}

function sampleParticleSize(
  simulation: AuroraMdlEmitterSimulation,
  normalizedAge: number
): { x: number; y: number } {
  const x = sampleThreePointNumber(
    simulation.sizeStart,
    simulation.sizeMid,
    simulation.sizeEnd,
    normalizedAge,
    1
  );
  const y = sampleThreePointNumber(
    simulation.sizeStartY,
    simulation.sizeMidY,
    simulation.sizeEndY,
    normalizedAge,
    x
  );
  return { x, y };
}

function sampleThreePointNumber(
  start: number | undefined,
  mid: number | undefined,
  end: number | undefined,
  normalizedAge: number,
  fallback: number
): number {
  const startValue = finiteOr(start, fallback);
  const midValue = finiteOr(mid, startValue);
  const endValue = finiteOr(end, midValue);
  const t = clamp01(normalizedAge);
  return t <= 0.5
    ? lerp(startValue, midValue, t / 0.5)
    : lerp(midValue, endValue, (t - 0.5) / 0.5);
}

function sampleThreePointTuple(
  start: [number, number, number] | undefined,
  mid: [number, number, number] | undefined,
  end: [number, number, number] | undefined,
  normalizedAge: number,
  fallback: [number, number, number]
): [number, number, number] {
  return [
    sampleThreePointNumber(start?.[0], mid?.[0], end?.[0], normalizedAge, fallback[0]),
    sampleThreePointNumber(start?.[1], mid?.[1], end?.[1], normalizedAge, fallback[1]),
    sampleThreePointNumber(start?.[2], mid?.[2], end?.[2], normalizedAge, fallback[2])
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
  const frameCount = Math.max(1, frameEnd - frameStart + 1);
  const elapsed = atlas.checkpointSeconds + dtSeconds;
  const frameSteps = Math.floor(elapsed / atlas.secondsPerFrame);
  return {
    ...atlas,
    checkpointSeconds: elapsed - frameSteps * atlas.secondsPerFrame,
    frameIndex: frameStart + ((atlas.frameIndex - frameStart + frameSteps) % frameCount)
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
      transform: state.source.transform ? { ...state.source.transform } : undefined
    },
    particles: state.particles.map((particle) => ({
      ...particle,
      position: { ...particle.position },
      velocity: { ...particle.velocity },
      acceleration: { ...particle.acceleration },
      color: { ...particle.color },
      size: { ...particle.size },
      atlas: { ...particle.atlas }
    })),
    activeParticleIds: [...state.activeParticleIds],
    freeParticleIds: [...state.freeParticleIds],
    ...(state.trailPreviousSourcePosition
      ? { trailPreviousSourcePosition: { ...state.trailPreviousSourcePosition } }
      : {}),
    trailResidualVector: { ...(state.trailResidualVector ?? zeroVector()) },
    membershipLog: state.membershipLog.map((entry) => ({ ...entry })),
    collisionQueries: state.collisionQueries.map((entry) => ({ ...entry })),
    collisionResults: state.collisionResults.map((entry) => ({ ...entry })),
    processedDetonateEventKeys: [...(state.processedDetonateEventKeys ?? [])],
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

function vectorLength(vector: AuroraRuntimeVector3): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function resetTrailEmissionState(state: AuroraEmitterRuntimeState): void {
  state.trailPreviousSourcePosition = undefined;
  state.trailResidualVector = zeroVector();
}

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function resolveAuroraParticleRotationRateRadians(value: number | undefined): number {
  return finiteOr(value, 0) * AURORA_TWO_PI;
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

function buildDetonateEventKey(event: { timeSeconds: number; animationName?: string }): string {
  const timeKey = Number.isFinite(event.timeSeconds) ? event.timeSeconds.toFixed(6) : "unknown";
  return `${timeKey}:${event.animationName ?? ""}`;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
