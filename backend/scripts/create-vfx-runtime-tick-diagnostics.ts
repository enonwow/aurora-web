import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { AuroraMdlEmitterNode } from "../src/modules/vfx/domain/aurora-mdl-vfx-source.parser";
import {
  buildAuroraEmitterRuntimeSnapshot,
  createAuroraEmitterRuntimeState,
  tickAuroraEmitterRuntime,
  type AuroraEmitterRuntimeState
} from "../src/modules/vfx/domain/aurora-vfx-runtime-state";

const repoRoot = path.resolve(__dirname, "..", "..");
const defaultOutPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-88/vfx-runtime-tick-diagnostics.json"
);

const args = parseArgs(process.argv.slice(2));
const outPath = path.resolve(repoRoot, args.out ?? defaultOutPath);

const report = buildReport(outPath);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      result: report.result,
      report: toRepoPath(outPath),
      summary: report.summary
    },
    null,
    2
  )
);

if (report.result !== "runtime-tick-diagnostics-passed") {
  process.exitCode = 1;
}

function buildReport(outPathForReport: string) {
  const cases = [
    buildFountainDeterminismCase(),
    buildFountainRecycleCase(),
    buildSingleLocalShotCase(),
    buildExplosionNoDetonateCase(),
    buildExplosionDetonateLocalBurstCase(),
    buildP2pTargetRequiredCase(),
    buildP2pTargetPathDiagnosticCase(),
    buildLightningTargetClearCase(),
    buildLightningTargetPathDiagnosticCase(),
    buildChunkUpdateFamilyGuardCase(),
    buildCollisionContractCase()
  ];
  const failedCases = cases.filter((entry) => entry.failedChecks.length > 0);
  const canonicalPromotionAttempts = cases.filter(
    (entry) => entry.canonicalParityPromoted === true
  );

  return {
    version: "aurora-vfx-runtime-tick-diagnostics/v1",
    generatedAt: new Date().toISOString(),
    artifact: toRepoPath(outPathForReport),
    oracle: "local-runtime-tick-diagnostic-snapshots",
    result:
      failedCases.length === 0 && canonicalPromotionAttempts.length === 0
        ? "runtime-tick-diagnostics-passed"
        : "runtime-tick-diagnostics-failed",
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true,
    summary: {
      caseCount: cases.length,
      passedCaseCount: cases.length - failedCases.length,
      failedCaseCount: failedCases.length,
      failedCheckCount: failedCases.reduce((sum, entry) => sum + entry.failedChecks.length, 0),
      canonicalPromotionAttemptCount: canonicalPromotionAttempts.length,
      runtimeFamilies: [...new Set(cases.map((entry) => entry.family))].sort()
    },
    cases,
    blockers: [
      "retail_capture_required_for_canonical_parity",
      "retail_runtime_tick_dump_required_for_canonical_parity",
      "retail_render_contract_snapshot_required_for_canonical_parity",
      "retail_comparison_required_for_canonical_parity",
      "local_runtime_tick_diagnostics_are_not_retail_evidence"
    ],
    notes: [
      "These snapshots exercise the backend runtime tick model only.",
      "They are renderer-free local diagnostics and cannot promote canonical retail parity."
    ]
  };
}

function buildFountainDeterminismCase() {
  const first = tickAuroraEmitterRuntime(
    tickAuroraEmitterRuntime(createAuroraEmitterRuntimeState(fountainEmitter(), { seed: 42 }), 0.5),
    0.25
  );
  const second = tickAuroraEmitterRuntime(
    tickAuroraEmitterRuntime(createAuroraEmitterRuntimeState(fountainEmitter(), { seed: 42 }), 0.5),
    0.25
  );
  const snapshot = buildAuroraEmitterRuntimeSnapshot(first);
  const secondSnapshot = buildAuroraEmitterRuntimeSnapshot(second);
  const particle = snapshot.activeParticles[0];

  return caseResult({
    caseId: "fountain-seeded-repeatability",
    family: "Fountain",
    sourceModelObjectKey: "modules/current/models/fountain.mdl",
    tickPlan: [0.5, 0.25],
    snapshot,
    extra: {
      repeatSnapshotFingerprint: fingerprint(secondSnapshot),
      particleAgeSeconds: particle?.ageSeconds,
      particleAtlasFrameIndex: particle?.atlas.frameIndex
    },
    checks: [
      check("active particle id is stable", snapshot.activeParticles[0]?.particleId === 1),
      check("single active particle is present", snapshot.activeParticles.length === 1),
      check("repeat snapshot fingerprint is stable", fingerprint(snapshot) === fingerprint(secondSnapshot)),
      check("particle age advances to 0.25s after spawn", particle?.ageSeconds === 0.25),
      check("atlas frame advances to frame 1", particle?.atlas.frameIndex === 1)
    ]
  });
}

function buildFountainRecycleCase() {
  const spawned = tickAuroraEmitterRuntime(
    createAuroraEmitterRuntimeState(fountainEmitter({ lifeExp: 0.5 }), { seed: 7 }),
    0.5
  );
  const pausedSpawns: AuroraEmitterRuntimeState = {
    ...spawned,
    source: {
      ...spawned.source,
      simulation: {
        ...spawned.source.simulation,
        birthrate: 0
      }
    }
  };
  const reachedLifetime = tickAuroraEmitterRuntime(pausedSpawns, 0.5);
  const expired = tickAuroraEmitterRuntime(reachedLifetime, 0.1);
  const snapshot = buildAuroraEmitterRuntimeSnapshot(expired);

  return caseResult({
    caseId: "fountain-expiry-recycles-active-particle",
    family: "Fountain",
    sourceModelObjectKey: "modules/current/models/fountain.mdl",
    tickPlan: [0.5, 0.5, 0.1],
    snapshot,
    extra: {
      freeParticleIds: expired.freeParticleIds,
      membershipLog: expired.membershipLog,
      particleDeathReasons: expired.particles.map((particle) => particle.deathReason ?? null)
    },
    checks: [
      check("no active particles remain after lifetime expiry", expired.activeParticleIds.length === 0),
      check("expired particle moved to free list", JSON.stringify(expired.freeParticleIds) === "[1]"),
      check(
        "particle death reason is expired_lifetime",
        expired.particles[0]?.deathReason === "expired_lifetime"
      ),
      check(
        "membership log records free transition",
        expired.membershipLog.some(
          (entry) => entry.particleId === 1 && entry.list === "free" && entry.deathReason === "expired_lifetime"
        )
      )
    ]
  });
}

function buildSingleLocalShotCase() {
  const first = tickAuroraEmitterRuntime(
    createAuroraEmitterRuntimeState(emitterWithFamily("Single"), { particleLimit: 4 }),
    0.1
  );
  const second = tickAuroraEmitterRuntime(first, 0.1);
  return diagnosticCaseResult({
    caseId: "single-local-shot-diagnostic",
    family: "Single",
    tickPlan: [0.1, 0.1],
    state: second,
    expectedDiagnosticCodes: ["VFX_SINGLE_ACTIVE_PARTICLE_RETAINED"],
    additionalChecks: [
      check("Single emits one local diagnostic particle", second.activeParticleIds.length === 1),
      check("Single does not duplicate shot on second tick", second.nextParticleId === 2),
      check("Single one-shot state is retained", second.singleShotEmitted === true),
      check(
        "Single particle records one-shot reset reason",
        second.particles.find((particle) => particle.particleId === 1)?.resetReason === "single_shot"
      ),
      check(
        "placeholder-not-implemented diagnostic is not emitted",
        !second.diagnostics.some((diagnostic) => diagnostic.code === "VFX_SINGLE_RUNTIME_NOT_IMPLEMENTED")
      )
    ]
  });
}

function buildExplosionNoDetonateCase() {
  const state = tickAuroraEmitterRuntime(
    createAuroraEmitterRuntimeState(emitterWithFamily("Explosion")),
    1
  );
  return diagnosticCaseResult({
    caseId: "explosion-no-detonate-gates-fallback-burst",
    family: "Explosion",
    tickPlan: [1],
    state,
    expectedDiagnosticCodes: [
      "VFX_EXPLOSION_DETONATE_EVENT_REQUIRED",
      "VFX_EXPLOSION_NO_DETONATE_NO_FALLBACK_BURST"
    ],
    additionalChecks: [
      check("no fallback active particles are spawned", state.activeParticleIds.length === 0)
    ]
  });
}

function buildExplosionDetonateLocalBurstCase() {
  const state = tickAuroraEmitterRuntime(
    createAuroraEmitterRuntimeState(emitterWithFamily("Explosion")),
    1,
    { detonateEvents: [{ timeSeconds: 0.25, animationName: "impact" }] }
  );
  return diagnosticCaseResult({
    caseId: "explosion-detonate-local-burst-diagnostic",
    family: "Explosion",
    tickPlan: [1],
    state,
    expectedDiagnosticCodes: [
      "VFX_EXPLOSION_DETONATE_EVENT_CONSUMED",
      "VFX_EXPLOSION_LOCAL_BURST_RUNTIME_DIAGNOSTIC",
      "VFX_EXPLOSION_RETAIL_TIMING_CAPTURE_REQUIRED"
    ],
    additionalChecks: [
      check("detonate event creates local burst particles", state.activeParticleIds.length === 2),
      check(
        "burst particles record explosion detonate reset reason",
        state.particles
          .filter((particle) => state.activeParticleIds.includes(particle.particleId))
          .every((particle) => particle.resetReason === "explosion_detonate_burst")
      ),
      check(
        "detonate event is recorded as processed",
        JSON.stringify(state.processedDetonateEventKeys) === "[\"0.250000:impact\"]"
      ),
      check(
        "placeholder-not-implemented diagnostic is not emitted",
        !state.lastTickDiagnostics.some(
          (diagnostic) => diagnostic.code === "VFX_EXPLOSION_RUNTIME_NOT_IMPLEMENTED"
        )
      )
    ]
  });
}

function buildP2pTargetRequiredCase() {
  const state = tickAuroraEmitterRuntime(
    createAuroraEmitterRuntimeState(p2pEmitter()),
    0.25
  );
  return diagnosticCaseResult({
    caseId: "p2p-target-context-required",
    family: "P2P",
    tickPlan: [0.25],
    state,
    expectedDiagnosticCodes: ["VFX_P2P_TARGET_RUNTIME_POINTER_REQUIRED"],
    additionalChecks: [
      check("P2P does not fall back to origin particles", state.activeParticleIds.length === 0)
    ]
  });
}

function buildP2pTargetPathDiagnosticCase() {
  const first = tickAuroraEmitterRuntime(
    createAuroraEmitterRuntimeState(p2pEmitter(), { particleLimit: 16 }),
    0.25,
    { targetRef: "retail-p2p-target", targetPosition: { x: 1, y: 0, z: 0 } }
  );
  const state = tickAuroraEmitterRuntime(first, 0.25, {
    targetRef: "retail-p2p-target",
    targetPosition: { x: 1, y: 0, z: 0 }
  });
  return diagnosticCaseResult({
    caseId: "p2p-target-position-local-path-diagnostic",
    family: "P2P",
    tickPlan: [0.25, 0.25],
    state,
    expectedDiagnosticCodes: [
      "VFX_P2P_TARGET_CONTEXT_CONSUMED",
      "VFX_P2P_GRAVITY_TARGET_PATH_CONSUMED",
      "VFX_P2P_RETAIL_RUNTIME_DUMP_REQUIRED"
    ],
    additionalChecks: [
      check("P2P Fountain path keeps two source-emitted particles", state.activeParticleIds.length === 2),
      check(
        "existing P2P particle advances toward the target",
        (state.particles.find((particle) => particle.particleId === 1)?.position.x ?? 0) > 0
      ),
      check(
        "new P2P particle is emitted at the source after existing-particle motion",
        JSON.stringify(state.particles.find((particle) => particle.particleId === 2)?.position) ===
          JSON.stringify({ x: 0, y: 0, z: 0 })
      ),
      check(
        "existing P2P particle records target-path reset reason",
        state.particles.find((particle) => particle.particleId === 1)?.resetReason === "p2p_target_path"
      ),
      check(
        "placeholder-not-implemented diagnostic is not emitted",
        !state.lastTickDiagnostics.some((diagnostic) => diagnostic.code === "VFX_P2P_RUNTIME_NOT_IMPLEMENTED")
      )
    ]
  });
}

function buildLightningTargetClearCase() {
  const initial = createAuroraEmitterRuntimeState(emitterWithFamily("Lightning"));
  const withActiveParticle: AuroraEmitterRuntimeState = {
    ...initial,
    particles: [
      {
        particleId: 1,
        slotIndex: 0,
        list: "active",
        ageSeconds: 0,
        lifetimeSeconds: 10,
        rotationRadians: 0,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        landed: false,
        acceleration: { x: 0, y: 0, z: 0 },
        color: { r: 1, g: 1, b: 1 },
        alpha: 1,
        size: { x: 1, y: 1 },
        atlas: { frameIndex: 0, checkpointSeconds: 0 }
      }
    ],
    activeParticleIds: [1]
  };
  const state = tickAuroraEmitterRuntime(withActiveParticle, 0.1);
  return diagnosticCaseResult({
    caseId: "lightning-missing-target-clears-active",
    family: "Lightning",
    tickPlan: [0.1],
    state,
    expectedDiagnosticCodes: ["VFX_LIGHTNING_TARGET_POINTER_CLEARS_ACTIVE_REQUIRED"],
    additionalChecks: [
      check("active lightning particle is cleared", state.activeParticleIds.length === 0),
      check("cleared particle enters free list", JSON.stringify(state.freeParticleIds) === "[1]"),
      check(
        "cleared particle records lightning_target_missing",
        state.particles[0]?.deathReason === "lightning_target_missing"
      )
    ]
  });
}

function buildLightningTargetPathDiagnosticCase() {
  const state = tickAuroraEmitterRuntime(
    createAuroraEmitterRuntimeState(emitterWithFamily("Lightning"), { particleLimit: 4 }),
    0.1,
    { targetRef: "retail-lightning-target", targetPosition: { x: 0, y: 1, z: 0.5 } }
  );
  return diagnosticCaseResult({
    caseId: "lightning-target-position-local-active-points",
    family: "Lightning",
    tickPlan: [0.1],
    state,
    expectedDiagnosticCodes: [
      "VFX_LIGHTNING_TARGET_CONTEXT_CONSUMED",
      "VFX_LIGHTNING_LOCAL_TARGET_PATH_DIAGNOSTIC",
      "VFX_LIGHTNING_RETAIL_RUNTIME_DUMP_REQUIRED"
    ],
    additionalChecks: [
      check(
        "Lightning target path uses the rounded evaluated source point count",
        state.activeParticleIds.length === 2
      ),
      check(
        "Lightning source active point starts at emitter origin",
        JSON.stringify(state.particles.find((particle) => particle.particleId === state.activeParticleIds[0])?.position) ===
          JSON.stringify({ x: 0, y: 0, z: 0 })
      ),
      check(
        "Lightning target active point matches resolved target position",
        JSON.stringify(state.particles.find((particle) => particle.particleId === state.activeParticleIds.at(-1))?.position) ===
          JSON.stringify({ x: 0, y: 1, z: 0.5 })
      ),
      check(
        "Lightning active points record local diagnostic reset reason",
        state.particles
          .filter((particle) => state.activeParticleIds.includes(particle.particleId))
          .every((particle) => particle.resetReason === "lightning_target_path")
      ),
      check(
        "placeholder-not-implemented diagnostic is not emitted",
        !state.lastTickDiagnostics.some((diagnostic) => diagnostic.code === "VFX_LIGHTNING_RUNTIME_NOT_IMPLEMENTED")
      )
    ]
  });
}

function buildChunkUpdateFamilyGuardCase() {
  const state = tickAuroraEmitterRuntime(
    createAuroraEmitterRuntimeState(
      emitterWithFamily("Chunk", "progfx_type9_chunk_model_pending"),
      { family: "Chunk" }
    ),
    0.25
  );
  return diagnosticCaseResult({
    caseId: "chunk-model-lane-update-family-guard",
    family: "Chunk",
    tickPlan: [0.25],
    state,
    expectedDiagnosticCodes: [
      "VFX_CHUNK_NAME_IS_RENDER_LANE_NOT_UPDATE_FAMILY",
      "VFX_CHUNK_UPDATE_FAMILY_REQUIRED"
    ],
    additionalChecks: [
      check("standalone Chunk update synthesizes no particles", state.activeParticleIds.length === 0),
      check("chunk runtime preserves source chunkName", state.source.chunkName === "progfx_type9_chunk_model_pending"),
      check(
        "standalone Chunk update allocates no placeholder records",
        state.particles.length === 0
      ),
      check(
        "placeholder-not-implemented diagnostic is not emitted",
        !state.lastTickDiagnostics.some((diagnostic) => diagnostic.code === "VFX_CHUNK_RUNTIME_NOT_IMPLEMENTED")
      )
    ]
  });
}

function buildCollisionContractCase() {
  const spawned = tickAuroraEmitterRuntime(
    createAuroraEmitterRuntimeState(
      fountainEmitter({
        birthrate: 2,
        lifeExp: 1,
        bounce: true,
        splat: true
      })
    ),
    0.5
  );
  const state = tickAuroraEmitterRuntime(spawned, 0.1);
  return diagnosticCaseResult({
    caseId: "fountain-collision-context-contract",
    family: "Fountain",
    tickPlan: [0.5, 0.1],
    state,
    expectedDiagnosticCodes: ["VFX_PARTICLE_COLLISION_CONTEXT_REQUIRED"],
    additionalChecks: [
      check(
        "bounce collision query is recorded",
        state.collisionQueries.some((entry) => entry.reason === "bounce" && entry.status === "context_required")
      ),
      check(
        "splat does not create a separate collision query",
        state.collisionQueries.every((entry) => entry.reason === "bounce")
      )
    ]
  });
}

function diagnosticCaseResult(input: {
  caseId: string;
  family: string;
  tickPlan: number[];
  state: AuroraEmitterRuntimeState;
  expectedDiagnosticCodes: string[];
  additionalChecks?: CheckResult[];
}) {
  const diagnosticCodes = input.state.lastTickDiagnostics.map((entry) => entry.code);
  const snapshot = buildAuroraEmitterRuntimeSnapshot(input.state);
  return caseResult({
    caseId: input.caseId,
    family: input.family,
    tickPlan: input.tickPlan,
    snapshot,
    extra: {
      diagnosticCodes,
      collisionQueries: input.state.collisionQueries,
      freeParticleIds: input.state.freeParticleIds,
      processedDetonateEventKeys: input.state.processedDetonateEventKeys,
      particleDeathReasons: input.state.particles.map((particle) => particle.deathReason ?? null)
    },
    checks: [
      ...input.expectedDiagnosticCodes.map((code) =>
        check(`diagnostic ${code} is present`, diagnosticCodes.includes(code))
      ),
      ...(input.additionalChecks ?? [])
    ]
  });
}

function caseResult(input: {
  caseId: string;
  family: string;
  sourceModelObjectKey?: string;
  tickPlan: number[];
  snapshot: ReturnType<typeof buildAuroraEmitterRuntimeSnapshot>;
  extra?: Record<string, unknown>;
  checks: CheckResult[];
}) {
  const failedChecks = input.checks
    .filter((entry) => !entry.passed)
    .map((entry) => entry.name);
  return {
    caseId: input.caseId,
    family: input.family,
    ...(input.sourceModelObjectKey ? { sourceModelObjectKey: input.sourceModelObjectKey } : {}),
    tickPlanSeconds: input.tickPlan,
    status: failedChecks.length === 0 ? "passed" : "failed",
    failedChecks,
    checkResults: input.checks,
    snapshotFingerprint: fingerprint(input.snapshot),
    snapshot: input.snapshot,
    ...(input.extra ? { details: input.extra } : {}),
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true
  };
}

interface CheckResult {
  name: string;
  passed: boolean;
}

function check(name: string, passed: boolean): CheckResult {
  return { name, passed };
}

function fountainEmitter(
  overrides: {
    birthrate?: number;
    lifeExp?: number;
    bounce?: boolean;
    splat?: boolean;
  } = {}
): AuroraMdlEmitterNode {
  return {
    nodeKind: "emitter",
    nodeName: "emit_fountain",
    sourceFormat: "aurora-mdl-ascii",
    sourceModelObjectKey: "modules/current/models/fountain.mdl",
    provenance: {
      sourceFormat: "aurora-mdl-ascii",
      sourceModelObjectKey: "modules/current/models/fountain.mdl"
    },
    emitterType: "Fountain",
    emitterTypeRaw: "Fountain",
    transform: {
      position: [0, 0, 0]
    },
    atlas: {
      effectiveXGrid: 2,
      effectiveYGrid: 2,
      fps: 4,
      frameStart: 0,
      frameEnd: 3
    },
    simulation: {
      birthrate: overrides.birthrate ?? 2,
      lifeExp: overrides.lifeExp ?? 1,
      velocity: 1,
      randvel: 0.25,
      spread: 0.5,
      grav: 0.1,
      colorStart: [1, 0, 0],
      colorMid: [0, 1, 0],
      colorEnd: [0, 0, 1],
      alphaStart: 1,
      alphaMid: 0.5,
      alphaEnd: 0,
      sizeStart: 1,
      sizeMid: 2,
      sizeEnd: 0,
      ...(overrides.bounce !== undefined ? { bounce: overrides.bounce } : {})
    },
    sourceState: {
      ...(overrides.splat !== undefined ? { splat: overrides.splat } : {})
    },
    directRows: [],
    keyRows: [],
    bezierKeyRows: [],
    colorTimelines: {}
  };
}

function emitterWithFamily(emitterType: string, chunkName?: string): AuroraMdlEmitterNode {
  return {
    ...fountainEmitter(),
    nodeName: `emit_${emitterType.toLowerCase()}`,
    emitterType,
    emitterTypeRaw: emitterType,
    ...(chunkName ? { chunkName } : {})
  };
}

function p2pEmitter(): AuroraMdlEmitterNode {
  const emitter = emitterWithFamily("Fountain");
  return {
    ...emitter,
    nodeName: "emit_p2p",
    simulation: {
      ...emitter.simulation,
      birthrate: 4,
      lifeExp: 2,
      velocity: 0,
      randvel: 0,
      spread: 0,
      grav: 4,
      threshold: 0.1,
      p2p: true
    }
  };
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function parseArgs(rawArgs: string[]): { out?: string } {
  const parsed: { out?: string } = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--out") {
      parsed.out = rawArgs[++index];
    } else if (arg === "--help" || arg === "-h") {
      console.log("Usage: ts-node --transpile-only scripts/create-vfx-runtime-tick-diagnostics.ts [--out path]");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function toRepoPath(filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}
