import type { AuroraMdlEmitterNode } from "../../src/modules/vfx/domain/aurora-mdl-vfx-source.parser";
import {
  buildAuroraEmitterRuntimeSnapshot,
  createAuroraEmitterRuntimeState,
  defaultAuroraDeterministicRngHook,
  tickAuroraEmitterRuntime,
  type AuroraEmitterRuntimeState
} from "../../src/modules/vfx/domain/aurora-vfx-runtime-state";

describe("aurora VFX runtime state", () => {
  it("uses the Aurora 15-bit rand sequence for default particle jitter", () => {
    const first = defaultAuroraDeterministicRngHook.nextFloat({
      algorithm: "aurora-rand15",
      seed: 42
    });
    const second = defaultAuroraDeterministicRngHook.nextFloat(first.state);

    expect(first.state.seed).toBe(953210035);
    expect(first.value).toBe(14544 / 0x8000);
    expect(second.state.seed).toBe(3724055312);
    expect(second.value).toBe(24056 / 0x8000);
  });

  it("deterministic Fountain tick advances particle age and produces renderer-free snapshots", () => {
    const first = tickAuroraEmitterRuntime(
      tickAuroraEmitterRuntime(createAuroraEmitterRuntimeState(fountainEmitter(), { seed: 42 }), 0.5),
      0.25
    );
    const second = tickAuroraEmitterRuntime(
      tickAuroraEmitterRuntime(createAuroraEmitterRuntimeState(fountainEmitter(), { seed: 42 }), 0.5),
      0.25
    );

    expect(first.activeParticleIds).toEqual([1]);
    expect(first.particles[0]).toMatchObject({
      particleId: 1,
      list: "active",
      ageSeconds: 0.25,
      lifetimeSeconds: 1,
      alpha: 0.75,
      size: {
        x: 1.5,
        y: 1.5
      },
      atlas: {
        frameIndex: 1
      }
    });
    expect(first.particles[0]?.position).toEqual(second.particles[0]?.position);
    expect(first.particles[0]?.velocity).toEqual(second.particles[0]?.velocity);

    const snapshot = buildAuroraEmitterRuntimeSnapshot(first);
    expect(snapshot).toMatchObject({
      version: "aurora-vfx-emitter-runtime-snapshot/v1",
      emitterNodeName: "emit_fountain",
      family: "Fountain",
      activeParticles: [
        {
          particleId: 1,
          ageSeconds: 0.25,
          lifetimeSeconds: 1
        }
      ],
      freeParticleIds: []
    });
  });

  it("recycles expired particles through active/free list records", () => {
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
    const expired = tickAuroraEmitterRuntime(pausedSpawns, 0.5);

    expect(expired.activeParticleIds).toEqual([]);
    expect(expired.freeParticleIds).toEqual([1]);
    expect(expired.particles[0]).toMatchObject({
      list: "free",
      deathReason: "expired_lifetime",
      resetReason: "recycled"
    });
    expect(expired.membershipLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ particleId: 1, list: "active", resetReason: "spawned" }),
        expect.objectContaining({
          particleId: 1,
          list: "free",
          deathReason: "expired_lifetime"
        })
      ])
    );
  });

  it("keeps the Fountain positive birthrate gate separate", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(fountainEmitter({ birthrate: 2, lifeExp: 1 })),
      0.5
    );

    expect(state.family).toBe("Fountain");
    expect(state.activeParticleIds).toEqual([1]);
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "VFX_FOUNTAIN_BIRTHRATE_POSITIVE_GATE_REQUIRED"
    );
  });

  it("resets normal Fountain spawn accumulator after crossing the Aurora period threshold", () => {
    const afterThreshold = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(fountainEmitter({ birthrate: 2, lifeExp: 1 })),
      0.75
    );

    expect(afterThreshold.activeParticleIds).toEqual([1]);
    expect(afterThreshold.spawnAccumulator).toBe(0);

    const afterShortFollowup = tickAuroraEmitterRuntime(afterThreshold, 0.25);

    expect(afterShortFollowup.activeParticleIds).toEqual([1]);
    expect(afterShortFollowup.nextParticleId).toBe(2);
    expect(afterShortFollowup.spawnAccumulator).toBeCloseTo(0.25, 6);
  });

  it("advances particleRot into per-particle radians and wraps like Aurora runtime", () => {
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 1,
          lifeExp: 3,
          particleRot: 1.25
        })
      ),
      1
    );
    const aged = tickAuroraEmitterRuntime(spawned, 1);

    expect(spawned.particles[0]?.rotationRadians).toBe(0);
    expect(aged.particles.find((particle) => particle.particleId === 1)?.rotationRadians).toBeCloseTo(
      Math.PI / 2,
      5
    );
    expect(aged.particles.find((particle) => particle.particleId === 2)?.rotationRadians).toBe(0);

    const negativeSpawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 1,
          lifeExp: 3,
          particleRot: -1.25
        })
      ),
      1
    );
    const negativeAged = tickAuroraEmitterRuntime(negativeSpawned, 1);

    expect(
      negativeAged.particles.find((particle) => particle.particleId === 1)?.rotationRadians
    ).toBeCloseTo(-Math.PI / 2, 5);
  });

  it("emits Fountain trail particles by movement distance and carries the residual vector", () => {
    const initial = createAuroraEmitterRuntimeState(
      fountainEmitter({
        birthrate: 4,
        lifeExp: 1,
        spawnType: 1,
        position: [0, 0, 0]
      })
    );
    const primed = tickAuroraEmitterRuntime(initial, 0.1);
    const moved = tickAuroraEmitterRuntime(
      {
        ...primed,
        source: {
          ...primed.source,
          transform: { position: [0.6, 0, 0] }
        }
      },
      0.1
    );

    expect(moved.activeParticleIds).toEqual([1, 2]);
    expect(moved.particles[0]).toMatchObject({
      resetReason: "trail_distance_spawned",
      position: { x: 0.25, y: 0, z: 0 }
    });
    expect(moved.particles[1]).toMatchObject({
      resetReason: "trail_distance_spawned",
      position: { x: 0.5, y: 0, z: 0 }
    });
    expect(moved.trailPreviousSourcePosition).toEqual({ x: 0.6, y: 0, z: 0 });
    expect(moved.trailResidualVector).toEqual({ x: expect.closeTo(0.1, 6), y: 0, z: 0 });

    const carried = tickAuroraEmitterRuntime(
      {
        ...moved,
        source: {
          ...moved.source,
          transform: { position: [0.9, 0, 0] }
        }
      },
      0.1
    );

    expect(carried.activeParticleIds).toEqual([1, 2, 3]);
    expect(carried.particles.find((particle) => particle.particleId === 3)).toMatchObject({
      resetReason: "trail_distance_spawned",
      position: { x: 0.75, y: 0, z: 0 }
    });
    expect(carried.trailResidualVector).toEqual({ x: expect.closeTo(0.15, 6), y: 0, z: 0 });
  });

  it("does not preview-clamp zero or non-positive lifeExp", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(fountainEmitter({ lifeExp: 0, birthrate: 10 })),
      1
    );

    expect(state.activeParticleIds).toEqual([]);
    expect(state.spawnAccumulator).toBe(0);
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_RUNTIME_LIFEEXP_ZERO_DRAW_GATE",
        "VFX_RUNTIME_LIFEEXP_PREVIEW_CLAMP_FORBIDDEN"
      ])
    );
  });

  it("does not spawn Fountain particles with zero or non-positive birthrate", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(fountainEmitter({ birthrate: 0, lifeExp: 1 })),
      1
    );

    expect(state.activeParticleIds).toEqual([]);
    expect(state.spawnAccumulator).toBe(0);
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_FOUNTAIN_BIRTHRATE_POSITIVE_GATE_REQUIRED",
        "VFX_FOUNTAIN_NORMAL_ACCUMULATOR_ZERO_RESET_REQUIRED"
      ])
    );
  });

  it("emits a deterministic local Single shot without using the Fountain accumulator", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitterWithFamily("Single"), { particleLimit: 4 }),
      1
    );

    expect(state.family).toBe("Single");
    expect(state.activeParticleIds).toEqual([1]);
    expect(state.nextParticleId).toBe(2);
    expect(state.singleShotEmitted).toBe(true);
    expect(state.spawnAccumulator).toBe(0);
    expect(state.particles[0]).toMatchObject({
      particleId: 1,
      list: "active",
      resetReason: "single_shot",
      velocity: { x: 0, y: 0, z: 0 }
    });
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_SINGLE_LOCAL_SHOT_DIAGNOSTIC",
        "VFX_SINGLE_RETAIL_RUNTIME_DUMP_REQUIRED"
      ])
    );
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "VFX_SINGLE_RUNTIME_NOT_IMPLEMENTED"
    );
  });

  it("does not duplicate the local Single shot on later ticks", () => {
    const first = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitterWithFamily("Single"), { particleLimit: 4 }),
      0.1
    );
    const second = tickAuroraEmitterRuntime(first, 0.1);

    expect(second.activeParticleIds).toEqual([1]);
    expect(second.nextParticleId).toBe(2);
    expect(second.singleShotEmitted).toBe(true);
    expect(second.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "VFX_SINGLE_LOCAL_SHOT_ALREADY_EMITTED"
    ]);
  });

  it("requires Explosion detonate and never creates a fallback burst", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitterWithFamily("Explosion")),
      1
    );

    expect(state.activeParticleIds).toEqual([]);
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_EXPLOSION_DETONATE_EVENT_REQUIRED",
        "VFX_EXPLOSION_NO_DETONATE_NO_FALLBACK_BURST"
      ])
    );
  });

  it("spawns a deterministic local Explosion burst after an explicit detonate event", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitterWithFamily("Explosion")),
      1,
      { detonateEvents: [{ timeSeconds: 0.25, animationName: "impact" }] }
    );

    expect(state.activeParticleIds).toEqual([1, 2]);
    expect(state.nextParticleId).toBe(3);
    expect(state.processedDetonateEventKeys).toEqual(["0.250000:impact"]);
    expect(state.particles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          particleId: 1,
          list: "active",
          resetReason: "explosion_detonate_burst"
        }),
        expect.objectContaining({
          particleId: 2,
          list: "active",
          resetReason: "explosion_detonate_burst"
        })
      ])
    );
    expect(state.membershipLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          particleId: 1,
          list: "active",
          resetReason: "explosion_detonate_burst"
        }),
        expect.objectContaining({
          particleId: 2,
          list: "active",
          resetReason: "explosion_detonate_burst"
        })
      ])
    );
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_EXPLOSION_DETONATE_EVENT_CONSUMED",
        "VFX_EXPLOSION_LOCAL_BURST_RUNTIME_DIAGNOSTIC",
        "VFX_EXPLOSION_RETAIL_TIMING_CAPTURE_REQUIRED"
      ])
    );
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "VFX_EXPLOSION_RUNTIME_NOT_IMPLEMENTED"
    );
  });

  it("does not duplicate an already consumed Explosion detonate event", () => {
    const detonateContext = {
      detonateEvents: [{ timeSeconds: 0.25, animationName: "impact" }]
    };
    const first = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitterWithFamily("Explosion")),
      1,
      detonateContext
    );
    const second = tickAuroraEmitterRuntime(first, 0.1, detonateContext);

    expect(second.activeParticleIds).toEqual([1, 2]);
    expect(second.nextParticleId).toBe(3);
    expect(second.processedDetonateEventKeys).toEqual(["0.250000:impact"]);
    expect(second.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "VFX_EXPLOSION_DETONATE_EVENT_ALREADY_PROCESSED"
    ]);
  });

  it("requires P2P target pointer/context instead of falling back to origin", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitterWithFamily("P2P")),
      0.25
    );

    expect(state.activeParticleIds).toEqual([]);
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "VFX_P2P_TARGET_RUNTIME_POINTER_REQUIRED"
    ]);
  });

  it("requires resolved P2P target position before local path diagnostics", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitterWithFamily("P2P")),
      0.25,
      { targetRef: "retail-p2p-target" }
    );

    expect(state.activeParticleIds).toEqual([]);
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "VFX_P2P_TARGET_POSITION_REQUIRED_FOR_LOCAL_DIAGNOSTIC"
    ]);
  });

  it("emits a deterministic local P2P path when target position is resolved", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitterWithFamily("P2P"), { particleLimit: 16 }),
      0.25,
      { targetRef: "retail-p2p-target", targetPosition: { x: 1, y: 0, z: 0 } }
    );

    expect(state.activeParticleIds).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(state.nextParticleId).toBe(8);
    expect(state.particles[0]).toMatchObject({
      particleId: 1,
      position: { x: 0, y: 0, z: 0 },
      resetReason: "p2p_target_path"
    });
    expect(state.particles[3]?.position.z).toBeGreaterThan(state.particles[0]!.position.z);
    expect(state.particles[6]).toMatchObject({
      particleId: 7,
      position: { x: 1, y: 0, z: 0 },
      resetReason: "p2p_target_path"
    });
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_P2P_TARGET_CONTEXT_CONSUMED",
        "VFX_P2P_LOCAL_GRAVITY_PATH_DIAGNOSTIC",
        "VFX_P2P_RETAIL_RUNTIME_DUMP_REQUIRED"
      ])
    );
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "VFX_P2P_RUNTIME_NOT_IMPLEMENTED"
    );
  });

  it("clears active Lightning particles when target pointer/context is missing", () => {
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

    expect(state.activeParticleIds).toEqual([]);
    expect(state.freeParticleIds).toEqual([1]);
    expect(state.particles[0]).toMatchObject({
      list: "free",
      deathReason: "lightning_target_missing"
    });
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "VFX_LIGHTNING_TARGET_POINTER_CLEARS_ACTIVE_REQUIRED"
    ]);
  });

  it("requires resolved Lightning target position before keeping local active points", () => {
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
          acceleration: { x: 0, y: 0, z: 0 },
          color: { r: 1, g: 1, b: 1 },
          alpha: 1,
          size: { x: 1, y: 1 },
          atlas: { frameIndex: 0, checkpointSeconds: 0 }
        }
      ],
      activeParticleIds: [1]
    };
    const state = tickAuroraEmitterRuntime(withActiveParticle, 0.1, {
      targetRef: "retail-lightning-target"
    });

    expect(state.activeParticleIds).toEqual([]);
    expect(state.freeParticleIds).toEqual([1]);
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "VFX_LIGHTNING_TARGET_POSITION_REQUIRED_FOR_LOCAL_DIAGNOSTIC"
    ]);
  });

  it("emits deterministic local Lightning active points when target position is resolved", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitterWithFamily("Lightning"), { particleLimit: 4 }),
      0.1,
      { targetRef: "retail-lightning-target", targetPosition: { x: 0, y: 1, z: 0.5 } }
    );

    // Canonical lightning bolt: subdivided chain (min(particleLimit, segments+1)
    // points) with endpoints anchored at source and target.
    expect(state.activeParticleIds).toEqual([1, 2, 3, 4]);
    expect(state.nextParticleId).toBe(5);
    expect(state.particles.find((particle) => particle.particleId === 1)).toMatchObject({
      position: { x: 0, y: 0, z: 0 },
      resetReason: "lightning_target_path"
    });
    expect(state.particles.find((particle) => particle.particleId === 4)).toMatchObject({
      position: { x: 0, y: 1, z: 0.5 },
      resetReason: "lightning_target_path"
    });
    [1, 2, 3, 4].forEach((id) => {
      expect(
        state.particles.find((particle) => particle.particleId === id)?.resetReason
      ).toBe("lightning_target_path");
    });
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_LIGHTNING_TARGET_CONTEXT_CONSUMED",
        "VFX_LIGHTNING_LOCAL_TARGET_PATH_DIAGNOSTIC",
        "VFX_LIGHTNING_RETAIL_RUNTIME_DUMP_REQUIRED"
      ])
    );
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "VFX_LIGHTNING_RUNTIME_NOT_IMPLEMENTED"
    );
  });

  it("requires chunkName before Chunk runtime tracks local placeholders", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitterWithFamily("Chunk")),
      0.25
    );

    expect(state.activeParticleIds).toEqual([]);
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_CHUNK_MODEL_RESOURCE_REQUIRED",
        "VFX_CHUNK_NO_TEXTURED_QUAD_FALLBACK"
      ])
    );
  });

  it("preserves Chunk model lane placeholders without textured-quad fallback", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitterWithFamily("Chunk", "progfx_type9_chunk_model_pending")),
      0.25
    );

    expect(state.source.chunkName).toBe("progfx_type9_chunk_model_pending");
    expect(state.activeParticleIds).toEqual([1, 2]);
    expect(state.nextParticleId).toBe(3);
    expect(state.spawnAccumulator).toBe(0);
    expect(state.particles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          particleId: 1,
          list: "active",
          resetReason: "chunk_model_placeholder",
          velocity: { x: 0, y: 0, z: 0 }
        }),
        expect.objectContaining({
          particleId: 2,
          list: "active",
          resetReason: "chunk_model_placeholder",
          velocity: { x: 0, y: 0, z: 0 }
        })
      ])
    );
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_CHUNK_MODEL_LANE_PRESERVED",
        "VFX_CHUNK_LOCAL_PLACEHOLDER_DIAGNOSTIC",
        "VFX_CHUNK_RETAIL_RESOURCE_CAPTURE_REQUIRED"
      ])
    );
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "VFX_CHUNK_RUNTIME_NOT_IMPLEMENTED"
    );
  });

  it("records collision query contracts for bounce/splat without a collision context", () => {
    const state = tickAuroraEmitterRuntime(
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

    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_PARTICLE_COLLISION_CONTEXT_REQUIRED"
    );
    expect(state.collisionQueries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: "bounce", status: "context_required" }),
        expect.objectContaining({ reason: "splat", status: "context_required" })
      ])
    );
  });

  it("runtime state tests are backend-only and do not require GLB, Three.js, screenshots, or frontend code", () => {
    const state = createAuroraEmitterRuntimeState(fountainEmitter());

    expect(state.version).toBe("aurora-vfx-emitter-runtime-state/v1");
    expect(state.sourceModelObjectKey).toBe("modules/current/models/fountain.mdl");
  });
});

function fountainEmitter(
  overrides: {
    birthrate?: number;
    lifeExp?: number;
    spawnType?: number;
    position?: [number, number, number];
    particleRot?: number;
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
      position: overrides.position ?? [0, 0, 0]
    },
    atlas: {
      effectiveXGrid: 2,
      effectiveYGrid: 2,
      fps: 4,
      frameStart: 0,
      frameEnd: 3
    },
    simulation: {
      ...(overrides.spawnType !== undefined ? { spawnType: overrides.spawnType } : {}),
      birthrate: overrides.birthrate ?? 2,
      lifeExp: overrides.lifeExp ?? 1,
      velocity: 1,
      randvel: 0.25,
      spread: 0.5,
      ...(overrides.particleRot !== undefined ? { particleRot: overrides.particleRot } : {}),
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
