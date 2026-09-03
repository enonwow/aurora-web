import type { AuroraMdlEmitterNode } from "../../src/modules/vfx/domain/aurora-mdl-vfx-source.parser";
import {
  buildAuroraEmitterRuntimeSnapshot,
  createAuroraEmitterRuntimeState,
  defaultAuroraDeterministicRngHook,
  resolveAuroraEmitterSourceReferenceTargetContext,
  tickAuroraEmitterRuntime,
  type AuroraEmitterRuntimeState
} from "../../src/modules/vfx/domain/aurora-vfx-runtime-state";

describe("aurora VFX runtime state", () => {
  it("grows Aurora active-list capacity from 16 by doubling and does not clamp at 64", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 130,
          lifeExp: 5,
          velocity: 0,
          randvel: 0,
          spread: 0
        })
      ),
      1
    );

    expect(state.activeParticleIds).toHaveLength(130);
    expect(state.activeCapacity).toBe(256);
    expect(state.freeCapacity).toBe(0);
    expect(state.capacityGrowth).toEqual([
      expect.objectContaining({ list: "active", previousCapacity: 0, nextCapacity: 16 }),
      expect.objectContaining({ list: "active", previousCapacity: 16, nextCapacity: 32 }),
      expect.objectContaining({ list: "active", previousCapacity: 32, nextCapacity: 64 }),
      expect.objectContaining({ list: "active", previousCapacity: 64, nextCapacity: 128 }),
      expect.objectContaining({ list: "active", previousCapacity: 128, nextCapacity: 256 })
    ]);
    expect(state.particles[0]?.previousPosition).toEqual(state.particles[0]?.position);
    expect(buildAuroraEmitterRuntimeSnapshot(state)).toMatchObject({
      activeCapacity: 256,
      freeCapacity: 0,
      executionParticleBudget: 4096
    });
  });

  it("grows the free list by the same Aurora rule and reuses it before allocation", () => {
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 70,
          lifeExp: 0.5,
          velocity: 0,
          randvel: 0,
          spread: 0
        })
      ),
      1
    );
    const aged = tickAuroraEmitterRuntime(
      {
        ...spawned,
        source: {
          ...spawned.source,
          simulation: {
            ...spawned.source.simulation,
            birthrate: 0
          }
        }
      },
      0.6
    );
    const recycled = tickAuroraEmitterRuntime(aged, 0.001);
    const reused = tickAuroraEmitterRuntime(
      {
        ...recycled,
        source: {
          ...recycled.source,
          simulation: {
            ...recycled.source.simulation,
            birthrate: 1,
            lifeExp: 1
          }
        }
      },
      1
    );

    expect(recycled.activeParticleIds).toEqual([]);
    expect(recycled.freeParticleIds).toHaveLength(70);
    expect(recycled.freeCapacity).toBe(128);
    expect(reused.activeParticleIds).toEqual([1]);
    expect(reused.nextParticleId).toBe(71);
    expect(reused.freeParticleIds).toHaveLength(69);
  });

  it("keeps the server execution budget separate and emits a diagnostic when exhausted", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({ birthrate: 70, lifeExp: 5 }),
        { executionParticleBudget: 64 }
      ),
      1
    );

    expect(state.activeParticleIds).toHaveLength(64);
    expect(state.executionParticleBudget).toBe(64);
    expect(state.lastTickDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_EXECUTION_PARTICLE_BUDGET_EXHAUSTED"
        })
      ])
    );
  });

  it("does not apply the historical 64 clamp to Explosion bursts", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        emitterWithFamily("Explosion", undefined, { birthrate: 100 })
      ),
      0.1,
      { detonateEvents: [{ timeSeconds: 0.1, animationName: "impact" }] }
    );

    expect(state.activeParticleIds).toHaveLength(100);
    expect(state.activeCapacity).toBe(128);
  });

  it("does not apply the historical 64 clamp to Lightning point reconciliation", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        emitterWithFamily("Lightning", undefined, { birthrate: 100 })
      ),
      0.1,
      {
        targetRef: "retail-lightning-target",
        targetPosition: { x: 0, y: 10, z: 0 }
      }
    );

    expect(state.activeParticleIds).toHaveLength(100);
    expect(state.activeCapacity).toBe(128);
  });

  it("keeps source emitter families explicit and rejects unknown tokens without a Lightning fallback", () => {
    expect(createAuroraEmitterRuntimeState(p2pEmitter()).family).toBe("Fountain");
    expect(
      createAuroraEmitterRuntimeState(
        emitterWithFamily("Chunk", "fx_chunk01")
      ).family
    ).toBe("Chunk");
    expect(createAuroraEmitterRuntimeState(emitterWithFamily("P2P")).family).toBe(
      "P2P"
    );
    expect(createAuroraEmitterRuntimeState(emitterWithFamily("CustomUpdate")).family).toBe(
      "Unknown"
    );
    const unsupported = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitterWithFamily("CustomUpdate")),
      1
    );
    expect(unsupported.activeParticleIds).toEqual([]);
    expect(unsupported.lastTickDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "VFX_RUNTIME_FAMILY_NOT_IMPLEMENTED" })
      ])
    );
  });

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

  it("uses the retail NWN EE MSVC rand15 sequence when the runtime profile selects it", () => {
    const first = defaultAuroraDeterministicRngHook.nextFloat({
      algorithm: "nwn-ee-msvc-rand15",
      seed: 42
    });
    const second = defaultAuroraDeterministicRngHook.nextFloat(first.state);

    expect(first.state).toEqual({
      algorithm: "nwn-ee-msvc-rand15",
      seed: 11519557
    });
    expect(first.value).toBe(175 / 0x8000);
    expect(second.state).toEqual({
      algorithm: "nwn-ee-msvc-rand15",
      seed: 26255348
    });
    expect(second.value).toBe(400 / 0x8000);
  });

  it("resolves a single direct source-MDL reference in evaluated emitter-parent space", () => {
    const context = resolveAuroraEmitterSourceReferenceTargetContext({
      ...emitterWithFamily("Lightning"),
      transform: { position: [1, 2, 3] },
      referenceNodes: [
        {
          nodeKind: "reference",
          nodeName: "target_ref",
          parentNodeName: "emit_lightning",
          provenance: { sourceFormat: "aurora-mdl-ascii" },
          transform: { position: [0, 0, 4] }
        }
      ]
    });

    expect(context).toEqual({
      targetRef: "source-mdl-reference:target_ref",
      targetPosition: { x: 1, y: 2, z: 7 },
      targetForward: { x: 0, y: 0, z: 1 },
      targetContextSource: "source-mdl-child-reference-evaluated-parent-space"
    });
  });

  it("composes emitter orientation and scale into a direct source-MDL reference target", () => {
    const context = resolveAuroraEmitterSourceReferenceTargetContext({
      ...emitterWithFamily("Lightning"),
      transform: {
        position: [1, 2, 3],
        orientation: { axis: [0, 0, 1], angleRadians: Math.PI / 2 },
        scale: 2
      },
      referenceNodes: [
        {
          nodeKind: "reference",
          nodeName: "target_ref",
          parentNodeName: "emit_lightning",
          provenance: { sourceFormat: "aurora-mdl-ascii" },
          transform: { position: [1, 0, 4] }
        }
      ]
    });

    expect(context.targetRef).toBe("source-mdl-reference:target_ref");
    expect(context.targetPosition?.x).toBeCloseTo(1, 10);
    expect(context.targetPosition?.y).toBeCloseTo(4, 10);
    expect(context.targetPosition?.z).toBeCloseTo(11, 10);
    expect(context.targetContextSource).toBe(
      "source-mdl-child-reference-evaluated-parent-space"
    );
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
      color: {
        r: 0.75,
        g: 0,
        b: 0.25
      },
      alpha: 0.75,
      size: {
        x: 0.75,
        y: 0.75
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

  it("advances an atlas once per native checkpoint without wrapping a one-second fire atlas", () => {
    const emitter = fountainEmitter({ birthrate: 2, lifeExp: 1 });
    emitter.atlas = {
      effectiveXGrid: 4,
      effectiveYGrid: 4,
      fps: 16,
      frameStart: 0,
      frameEnd: 15
    };
    let state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 1 }),
      0.5
    );
    state.source.simulation!.birthrate = 0;
    for (let tick = 0; tick < 30; tick += 1) {
      state = tickAuroraEmitterRuntime(state, 1 / 30);
    }
    let expectedFloat32Age = 0;
    for (let tick = 0; tick < 30; tick += 1) {
      expectedFloat32Age = Math.fround(
        Math.fround(expectedFloat32Age) + Math.fround(1 / 30)
      );
    }

    expect(state.activeParticleIds).toEqual([1]);
    expect(state.particles[0]?.ageSeconds).toBe(expectedFloat32Age);
    expect(state.particles[0]?.atlas.frameIndex).toBe(15);
  });

  it("steps descending atlas ranges in their authored direction", () => {
    const emitter = fountainEmitter({ birthrate: 2, lifeExp: 2 });
    emitter.atlas = {
      effectiveXGrid: 2,
      effectiveYGrid: 2,
      fps: 4,
      frameStart: 3,
      frameEnd: 0
    };
    let state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 1 }),
      0.5
    );
    state.source.simulation!.birthrate = 0;
    state = tickAuroraEmitterRuntime(state, 0.25);

    expect(state.particles[0]?.atlas.frameIndex).toBe(2);
  });

  it("uses the X size curve when a non-Bubble emitter authors zero Y sizes", () => {
    const state = tickAuroraEmitterRuntime(
      tickAuroraEmitterRuntime(
        createAuroraEmitterRuntimeState(
          fountainEmitter({ sizeStartY: 0, sizeMidY: 0, sizeEndY: 0 })
        ),
        0.5
      ),
      0.25
    );

    expect(state.particles[0]?.size).toEqual({ x: 0.75, y: 0.75 });
  });

  it("preserves particle mid and percent fields but renders the Aurora start-end age lane", () => {
    const emitter = fountainEmitter();
    Object.assign(emitter.simulation!, {
      percentStart: 0.1,
      percentMid: 0.2,
      percentEnd: 0.9
    });
    let state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 1 }),
      0.5
    );
    state.source.simulation!.birthrate = 0;
    state = tickAuroraEmitterRuntime(state, 0.25);

    expect(state.source.simulation).toMatchObject({
      colorMid: [0, 1, 0],
      alphaMid: 0.5,
      sizeMid: 2,
      percentStart: 0.1,
      percentMid: 0.2,
      percentEnd: 0.9
    });
    expect(state.particles[0]).toMatchObject({
      color: { r: 0.75, g: 0, b: 0.25 },
      alpha: 0.75,
      size: { x: 0.75, y: 0.75 }
    });
  });

  it("preserves authored zero Y sizes for Bubble emitters", () => {
    const state = tickAuroraEmitterRuntime(
      tickAuroraEmitterRuntime(
        createAuroraEmitterRuntimeState(
          fountainEmitter({
            renderMode: "Bubble",
            sizeStartY: 0,
            sizeMidY: 0,
            sizeEndY: 0
          })
        ),
        0.5
      ),
      0.25
    );

    expect(state.particles[0]?.size).toEqual({ x: 0.75, y: 0 });
  });

  it("uses Aurora's randvel 0.01 gate and signed hundredth-speed reset term", () => {
    const samples = [39 / 0x8000, 1 / 0x8000];
    const rngHook = {
      nextFloat(state: { algorithm: "aurora-rand15"; seed: number }) {
        return {
          value: samples.shift() ?? 0,
          state: { ...state, seed: state.seed + 1 }
        };
      }
    };
    const belowGate = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({ birthrate: 2, lifeExp: 1, velocity: 2, randvel: 0.01, spread: 0 })
      ),
      0.5,
      { rngHook }
    );
    expect(belowGate.particles[0]?.velocity).toEqual({ x: 0, y: 0, z: 2 });
    expect(samples).toEqual([39 / 0x8000, 1 / 0x8000]);

    const randomized = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({ birthrate: 2, lifeExp: 1, velocity: 2, randvel: 0.4, spread: 0 })
      ),
      0.5,
      { rngHook }
    );
    expect(randomized.particles[0]?.velocity.z).toBeCloseTo(1.61, 6);
    expect(samples).toEqual([]);
  });

  it("derives Fountain velocity from Aurora's local-X then local-Z spread rotations", () => {
    const samples = [50 / 0x8000, 0];
    const rngHook = {
      nextFloat(state: { algorithm: "aurora-rand15"; seed: number }) {
        return {
          value: samples.shift() ?? 0,
          state: { ...state, seed: state.seed + 1 }
        };
      }
    };
    const emitter = fountainEmitter({
      birthrate: 2,
      lifeExp: 1,
      velocity: 2,
      randvel: 0,
      spread: 1
    });
    emitter.transform = {
      ...emitter.transform,
      orientation: { axis: [0, 1, 0], angleRadians: Math.PI / 2 }
    };
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter),
      0.5,
      { rngHook }
    );

    expect(state.particles[0]?.velocity).toMatchObject({
      x: expect.closeTo(Math.cos(0.5) * 2, 6),
      y: expect.closeTo(-Math.sin(0.5) * 2, 6),
      z: expect.closeTo(0, 12)
    });
    expect(state.particles[0]?.rotationAxis).toMatchObject({
      x: expect.closeTo(Math.cos(0.5), 6),
      y: expect.closeTo(-Math.sin(0.5), 6),
      z: expect.closeTo(0, 12)
    });
    expect(samples).toEqual([]);
  });

  it("uses Aurora rand15 modulo instead of normalized-float buckets for spread", () => {
    const samples = [52 / 0x8000, 629 / 0x8000];
    const rngHook = {
      nextFloat(state: { algorithm: "aurora-rand15"; seed: number }) {
        return {
          value: samples.shift() ?? 0,
          state: { ...state, seed: state.seed + 1 }
        };
      }
    };
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 2,
          lifeExp: 1,
          velocity: 2,
          randvel: 0,
          spread: 1
        })
      ),
      0.5,
      { rngHook }
    );

    expect(state.particles[0]?.velocity).toMatchObject({
      x: expect.closeTo(Math.fround(Math.sin(0.01) * Math.sin(0.01) * 2), 8),
      y: expect.closeTo(Math.fround(-Math.cos(0.01) * Math.sin(0.01) * 2), 8),
      z: expect.closeTo(Math.fround(Math.cos(0.01) * 2), 8)
    });
    expect(samples).toEqual([]);
  });

  it("stores the same local-X/local-Z spread composition in particle render orientation", () => {
    const samples = [52 / 0x8000, 629 / 0x8000];
    const rngHook = {
      nextFloat(state: { algorithm: "aurora-rand15"; seed: number }) {
        return {
          value: samples.shift() ?? 0,
          state: { ...state, seed: state.seed + 1 }
        };
      }
    };
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 2,
          lifeExp: 1,
          velocity: 2,
          randvel: 0,
          spread: 1,
          renderMode: "Aligned_to_Particle_Dir"
        })
      ),
      0.5,
      { rngHook }
    );

    const orientation = state.particles[0]?.particleOrientation;
    expect(orientation).toBeDefined();
    const forward = rotateByOrientation({ x: 0, y: 0, z: 1 }, orientation!);
    const localX = rotateByOrientation({ x: 1, y: 0, z: 0 }, orientation!);
    expect(forward).toMatchObject({
      x: expect.closeTo(Math.sin(0.01) * Math.sin(0.01), 8),
      y: expect.closeTo(-Math.cos(0.01) * Math.sin(0.01), 8),
      z: expect.closeTo(Math.cos(0.01), 8)
    });
    expect(localX).toMatchObject({
      x: expect.closeTo(Math.cos(0.01), 8),
      y: expect.closeTo(Math.sin(0.01), 8),
      z: expect.closeTo(0, 8)
    });
    expect(samples).toEqual([]);
  });

  it("applies Aurora deadspace camera correction before deriving particle velocity", () => {
    const samples = [0, 0];
    const rngHook = {
      nextFloat(state: { algorithm: "aurora-rand15"; seed: number }) {
        return {
          value: samples.shift() ?? 0,
          state: { ...state, seed: state.seed + 1 }
        };
      }
    };
    const deadspace = 0.2;
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 2,
          lifeExp: 1,
          velocity: 2,
          randvel: 0,
          spread: 1,
          deadspace,
          renderMode: "Aligned_to_Particle_Dir"
        })
      ),
      0.5,
      {
        rngHook,
        cameraPosition: { x: 0, y: 0, z: -10 },
        cameraContextSource: "aurora-active-camera-world-position"
      }
    );

    const particle = state.particles[0];
    expect(particle?.particleOrientation).toBeDefined();
    const normal = rotateByOrientation(
      { x: 0, y: 1, z: 0 },
      particle!.particleOrientation!
    );
    const forward = rotateByOrientation(
      { x: 0, y: 0, z: 1 },
      particle!.particleOrientation!
    );
    expect(Math.abs(normal.z)).toBeGreaterThanOrEqual(Math.sin(deadspace) - 1e-6);
    expect(particle?.velocity).toMatchObject({
      x: expect.closeTo(forward.x * 2, 6),
      y: expect.closeTo(forward.y * 2, 6),
      z: expect.closeTo(forward.z * 2, 6)
    });
    expect(state.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "VFX_PARTICLE_DEADSPACE_CAMERA_POSITION_REQUIRED"
    );
    expect(samples).toEqual([]);
  });

  it("preserves spread RNG order when deadspace camera context is unavailable", () => {
    const run = (deadspace: number) => {
      const samples = [52 / 0x8000, 629 / 0x8000];
      let calls = 0;
      const rngHook = {
        nextFloat(state: { algorithm: "aurora-rand15"; seed: number }) {
          calls += 1;
          return {
            value: samples.shift() ?? 0,
            state: { ...state, seed: state.seed + 1 }
          };
        }
      };
      const state = tickAuroraEmitterRuntime(
        createAuroraEmitterRuntimeState(
          fountainEmitter({
            birthrate: 2,
            lifeExp: 1,
            velocity: 2,
            randvel: 0,
            spread: 1,
            deadspace
          })
        ),
        0.5,
        { rngHook }
      );
      return { state, calls, samples };
    };

    const withoutDeadspace = run(0);
    const missingCamera = run(0.2);

    expect(missingCamera.calls).toBe(withoutDeadspace.calls);
    expect(missingCamera.samples).toEqual(withoutDeadspace.samples);
    expect(missingCamera.state.rng.seed).toBe(withoutDeadspace.state.rng.seed);
    expect(missingCamera.state.particles[0]?.particleOrientation).toEqual(
      withoutDeadspace.state.particles[0]?.particleOrientation
    );
    expect(missingCamera.state.particles[0]?.velocity).toEqual(
      withoutDeadspace.state.particles[0]?.velocity
    );
    expect(missingCamera.state.lastTickDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_PARTICLE_DEADSPACE_CAMERA_POSITION_REQUIRED",
          severity: "warn"
        })
      ])
    );
    expect(
      missingCamera.state.lastTickDiagnostics.filter(
        (diagnostic) => diagnostic.code === "VFX_PARTICLE_DEADSPACE_CAMERA_POSITION_REQUIRED"
      )
    ).toHaveLength(1);
  });

  it("copies the evaluated emitter orientation into each spawned particle render state", () => {
    const orientation = { axis: [0, 1, 0] as [number, number, number], angleRadians: Math.PI / 2 };
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({ birthrate: 2, lifeExp: 1, spread: 0 })
      ),
      0.5,
      {
        sourceMotion: {
          previousPosition: { x: 0, y: 0, z: 0 },
          currentPosition: { x: 0, y: 0, z: 0 },
          currentOrientation: orientation,
          deltaSeconds: 0.5
        }
      }
    );

    expect(state.particles[0]?.particleOrientation).toEqual(orientation);
  });

  it("samples the Aurora emitter rectangle with integer magnitudes, low-bit signs, and emitter axes", () => {
    const samples = [0.25, 0.75, 0.75, 0.25];
    const rngHook = {
      nextFloat(state: { algorithm: "aurora-rand15"; seed: number }) {
        return {
          value: samples.shift() ?? 0,
          state: { ...state, seed: state.seed + 1 }
        };
      }
    };
    const emitter = fountainEmitter({
      birthrate: 2,
      lifeExp: 1,
      velocity: 0,
      randvel: 0,
      spread: 0,
      xSize: 40,
      ySize: 20,
      position: [1, 2, 3]
    });
    emitter.transform = {
      ...emitter.transform,
      orientation: { axis: [0, 0, 1], angleRadians: Math.PI / 2 }
    };

    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter),
      0.5,
      { rngHook }
    );

    expect(state.particles[0]?.position.x).toBe(Math.fround(0.9424));
    expect(state.particles[0]?.position.y).toBe(Math.fround(2.0192));
    expect(state.particles[0]?.position.z).toBeCloseTo(3, 10);
    expect(samples).toEqual([]);
  });

  it("keeps zero-area emitters at the origin without consuming RNG and gates dimensions below four", () => {
    const samples = [0.75, 0.25];
    const rngHook = {
      nextFloat(state: { algorithm: "aurora-rand15"; seed: number }) {
        return {
          value: samples.shift() ?? 0,
          state: { ...state, seed: state.seed + 1 }
        };
      }
    };
    const point = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({ birthrate: 2, velocity: 0, randvel: 0, spread: 0 })
      ),
      0.5,
      { rngHook }
    );
    expect(point.particles[0]?.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(samples).toEqual([0.75, 0.25]);

    const belowThreshold = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 2,
          velocity: 0,
          randvel: 0,
          spread: 0,
          xSize: 0.03,
          ySize: 0
        })
      ),
      0.5,
      { rngHook }
    );
    expect(belowThreshold.particles[0]?.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(samples).toEqual([]);
  });

  it("adds Aurora inheritVel emitter translation to the authored Fountain velocity", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 2,
          lifeExp: 1,
          velocity: 0,
          randvel: 0,
          spread: 0,
          inheritVel: true,
          position: [5, 0, 0]
        })
      ),
      0.5,
      {
        sourceMotion: {
          previousPosition: { x: 0, y: 0, z: 0 },
          currentPosition: { x: 5, y: 0, z: 0 },
          deltaSeconds: 0.5
        }
      }
    );

    expect(state.particles[0]).toMatchObject({
      position: { x: 5, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      inheritedVelocityMagnitude: 10,
      inheritedVelocityDirection: { x: 1, y: 0, z: 0 }
    });

    const advanced = tickAuroraEmitterRuntime(state, 0.25);
    expect(advanced.particles[0]).toMatchObject({
      position: { x: 7.5, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      inheritedVelocityMagnitude: 7.5,
      inheritedVelocityDirection: { x: 1, y: 0, z: 0 }
    });
  });

  it("moves existing particles between emitter frames only when Aurora inherit is enabled", () => {
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 2,
          lifeExp: 2,
          velocity: 0,
          randvel: 0,
          spread: 0,
          inherit: true
        })
      ),
      0.5
    );
    const moved = tickAuroraEmitterRuntime(spawned, 0.1, {
      sourceMotion: {
        previousPosition: { x: 0, y: 0, z: 0 },
        currentPosition: { x: 5, y: 0, z: 0 },
        previousOrientation: { axis: [0, 1, 0], angleRadians: 0 },
        currentOrientation: { axis: [0, 1, 0], angleRadians: Math.PI / 2 },
        previousScale: 1,
        currentScale: 2,
        deltaSeconds: 0.1
      }
    });

    expect(moved.particles[0]?.position).toEqual({ x: 5, y: 0, z: 0 });
    expect(moved.source.transform).toMatchObject({
      position: [5, 0, 0],
      scale: 2
    });
  });

  it("reprojects inherit_local particles through the supplied Aurora parent frames", () => {
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 2,
          lifeExp: 2,
          velocity: 0,
          randvel: 0,
          spread: 0,
          inheritLocal: true
        })
      ),
      0.5
    );
    const moved = tickAuroraEmitterRuntime(spawned, 0.1, {
      ownerMotion: {
        previousPosition: { x: 0, y: 0, z: 0 },
        currentPosition: { x: 3, y: 0, z: 0 },
        previousOrientation: { axis: [0, 0, 1], angleRadians: 0 },
        currentOrientation: { axis: [0, 0, 1], angleRadians: 0 },
        previousScale: 1,
        currentScale: 1,
        deltaSeconds: 0.1
      }
    });

    expect(moved.particles[0]?.position).toEqual({ x: 3, y: 0, z: 0 });
    expect(moved.lastTickDiagnostics.map((entry) => entry.code)).not.toContain(
      "VFX_EMITTER_INHERIT_LOCAL_PARENT_FRAME_REQUIRED"
    );
  });

  it("reprojects inherit_part particles around the emitter origin through owner orientation frames", () => {
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 2,
          lifeExp: 2,
          velocity: 0,
          randvel: 0,
          spread: 0,
          inheritPart: true,
          position: [2, 0, 0]
        })
      ),
      0.5
    );
    const moved = tickAuroraEmitterRuntime(spawned, 0.1, {
      partMotion: {
        previousPosition: { x: 2, y: 0, z: 0 },
        currentPosition: { x: 5, y: 0, z: 0 },
        previousOrientation: { axis: [0, 0, 1], angleRadians: 0 },
        currentOrientation: { axis: [0, 0, 1], angleRadians: Math.PI / 2 },
        previousScale: 1,
        currentScale: 1,
        deltaSeconds: 0.1
      }
    });

    expect(moved.particles[0]?.position).toEqual({ x: 5, y: 0, z: 0 });
    expect(moved.lastTickDiagnostics.map((entry) => entry.code)).not.toContain(
      "VFX_EMITTER_INHERIT_PART_PARENT_FRAME_REQUIRED"
    );
  });

  it("keeps P2P grav out of base acceleration and applies Aurora mass on the vertical axis", () => {
    const emitter = fountainEmitter({
      birthrate: 4,
      lifeExp: 2,
      velocity: 0,
      randvel: 0,
      spread: 0,
      mass: 2,
      grav: 99
    });
    const first = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { seed: 42 }),
      0.25
    );
    const second = tickAuroraEmitterRuntime(first, 0.5);

    expect(first.particles[0]?.acceleration).toEqual({ x: 0, y: 0, z: -19.62 });
    expect(second.particles[0]?.position.z).toBe(0);
    expect(second.particles[0]?.velocity.z).toBeCloseTo(-9.81);
  });

  it("applies the currently evaluated Aurora mass to existing particles", () => {
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 4,
          lifeExp: 2,
          velocity: 0,
          randvel: 0,
          spread: 0,
          mass: 0
        }),
        { seed: 42 }
      ),
      0.25
    );
    const massChanged: AuroraEmitterRuntimeState = {
      ...spawned,
      source: {
        ...spawned.source,
        simulation: {
          ...spawned.source.simulation,
          birthrate: 0,
          mass: 2
        }
      }
    };

    const advanced = tickAuroraEmitterRuntime(massChanged, 0.5);

    expect(advanced.particles[0]?.position.z).toBe(0);
    expect(advanced.particles[0]?.velocity.z).toBeCloseTo(-9.81);
    expect(advanced.particles[0]?.acceleration).toEqual({ x: 0, y: 0, z: -19.62 });
  });

  it("updates Motion_Blur previous position from the source blurlength", () => {
    const emitter = fountainEmitter({
      birthrate: 1,
      lifeExp: 2,
      velocity: 2,
      randvel: 0,
      spread: 0,
      blurLength: 1,
      renderMode: "Motion_Blur"
    });
    const spawned = tickAuroraEmitterRuntime(createAuroraEmitterRuntimeState(emitter, { seed: 7 }), 1);
    const firstAdvance = tickAuroraEmitterRuntime(spawned, 0.5);
    const advanced = tickAuroraEmitterRuntime(firstAdvance, 0.5);

    const initialPosition = spawned.particles[0]?.position;
    const firstPosition = firstAdvance.particles[0]?.position;
    const previousPosition = advanced.particles[0]?.previousPosition;
    expect(firstAdvance.particles[0]?.previousPosition).toEqual(initialPosition);
    expect(previousPosition).toEqual({
      x: (initialPosition!.x + firstPosition!.x) * 0.5,
      y: (initialPosition!.y + firstPosition!.y) * 0.5,
      z: (initialPosition!.z + firstPosition!.z) * 0.5
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
    const reachedLifetime = tickAuroraEmitterRuntime(pausedSpawns, 0.5);
    expect(reachedLifetime.activeParticleIds).toEqual([1]);
    expect(reachedLifetime.particles[0]?.ageSeconds).toBe(0.5);

    const expired = tickAuroraEmitterRuntime(reachedLifetime, 0.1);

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

  it("uses Aurora x87 truncation for a normal Fountain burst and resets its accumulator", () => {
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

  it("emits the native multi-particle Fountain count for retail row 68 rates", () => {
    const explosion01 = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({ birthrate: 133, lifeExp: 1 }),
        { particleLimit: 256 }
      ),
      1 / 30
    );
    const explosion = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({ birthrate: 100, lifeExp: 1 }),
        { particleLimit: 256 }
      ),
      1 / 30
    );

    expect(explosion01.activeParticleIds).toHaveLength(4);
    expect(explosion01.nextParticleId).toBe(5);
    expect(explosion01.spawnAccumulator).toBe(0);
    expect(explosion.activeParticleIds).toHaveLength(3);
    expect(explosion.nextParticleId).toBe(4);
    expect(explosion.spawnAccumulator).toBe(0);
  });

  it("uses float32 Fountain cadence at the exact six-tick birthrate boundary", () => {
    let state = createAuroraEmitterRuntimeState(
      fountainEmitter({
        birthrate: 10,
        lifeExp: 1,
        velocity: 0,
        randvel: 0,
        spread: 0
      })
    );

    for (let tick = 0; tick < 6; tick += 1) {
      state = tickAuroraEmitterRuntime(state, 1 / 60);
    }

    expect(state.activeParticleIds).toHaveLength(1);
    expect(state.spawnAccumulator).toBe(0);
  });

  it("stores particle age as float32 and does not render an extra lifetime frame", () => {
    let state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 10,
          lifeExp: 1,
          velocity: 0,
          randvel: 0,
          spread: 0
        }),
        { particleLimit: 1 }
      ),
      0.1
    );
    state = {
      ...state,
      source: {
        ...state.source,
        simulation: {
          ...state.source.simulation,
          birthrate: 0
        }
      }
    };

    let expectedFloat32Age = 0;
    for (let tick = 0; tick < 10; tick += 1) {
      expectedFloat32Age = Math.fround(
        Math.fround(expectedFloat32Age) + Math.fround(0.1)
      );
      state = tickAuroraEmitterRuntime(state, 0.1);
    }

    expect(state.activeParticleIds).toEqual([1]);
    expect(state.particles[0]?.ageSeconds).toBe(expectedFloat32Age);

    state = tickAuroraEmitterRuntime(state, 0.1);

    expect(state.activeParticleIds).toEqual([]);
    expect(state.particles[0]).toMatchObject({
      list: "free",
      deathReason: "expired_lifetime"
    });
  });

  it("stores ordinary particle position, velocity, and rotation at Aurora float32 boundaries", () => {
    const emitter = fountainEmitter({
      birthrate: 10,
      lifeExp: 2,
      velocity: 0.1,
      randvel: 0,
      spread: 0,
      particleRot: 0.1,
      position: [0.1, 0.2, 0.3]
    });
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { seed: 42 }),
      0.1
    );

    expect(spawned.particles[0]?.position).toEqual({
      x: Math.fround(0.1),
      y: Math.fround(0.2),
      z: Math.fround(0.3)
    });
    expect(spawned.particles[0]?.previousPosition).toEqual({
      x: Math.fround(0.1),
      y: Math.fround(0.2),
      z: Math.fround(0.3)
    });
    expect(spawned.particles[0]?.velocity.z).toBe(Math.fround(0.1));

    const advanced = tickAuroraEmitterRuntime(spawned, 0.1);
    const expectedPositionZ = Math.fround(
      Math.fround(0.3) + Math.fround(Math.fround(0.1) * Math.fround(0.1))
    );
    const expectedRotation = Math.fround(
      Math.fround(0) + Math.fround(Math.fround(0.1) * Math.fround(0.1))
    );
    expect(advanced.particles[0]?.position.z).toBe(expectedPositionZ);
    expect(advanced.particles[0]?.rotationRadians).toBe(expectedRotation);
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
      1.25,
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
    ).toBeCloseTo(-1.25, 5);
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
      position: { x: 0, y: 0, z: 0 }
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

  it("emits Fountain trail particles from runtime host motion while the local emitter stays fixed", () => {
    const initial = createAuroraEmitterRuntimeState(
      fountainEmitter({
        birthrate: 4,
        lifeExp: 1,
        spawnType: 1,
        position: [0.1, 0, 0]
      })
    );
    const moved = tickAuroraEmitterRuntime(initial, 0.1, {
      sourceMotion: {
        previousPosition: { x: 0.1, y: 0, z: 0 },
        currentPosition: { x: 0.7, y: 0, z: 0 },
        deltaSeconds: 0.1
      }
    });

    expect(moved.activeParticleIds).toEqual([1, 2]);
    expect(moved.particles[0]).toMatchObject({
      resetReason: "trail_distance_spawned",
      position: { x: 0.1, y: 0, z: 0 }
    });
    expect(moved.particles[1]).toMatchObject({
      resetReason: "trail_distance_spawned",
      position: { x: 0.6, y: 0, z: 0 }
    });
    expect(moved.trailPreviousSourcePosition).toEqual({ x: 0.7, y: 0, z: 0 });
    expect(moved.trailResidualVector).toEqual({ x: expect.closeTo(0.1, 6), y: 0, z: 0 });
  });

  it("keeps the native truncated-birthrate gate closed below one", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(fountainEmitter({ birthrate: 0.4, lifeExp: 1 })),
      3
    );

    expect(state.activeParticleIds).toEqual([]);
    expect(state.spawnAccumulator).toBe(0);
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

  it("creates one Single particle through the shared Aurora emitter reset path", () => {
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
      resetReason: "single_shot"
    });
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_SINGLE_ACTIVE_PARTICLE_CREATED",
        "VFX_SINGLE_RETAIL_RUNTIME_DUMP_REQUIRED"
      ])
    );
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "VFX_SINGLE_RUNTIME_NOT_IMPLEMENTED"
    );
  });

  it("retains the existing Single particle without allocating a replacement", () => {
    const first = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitterWithFamily("Single"), { particleLimit: 4 }),
      0.1
    );
    const second = tickAuroraEmitterRuntime(first, 0.1);

    expect(second.activeParticleIds).toEqual([1]);
    expect(second.nextParticleId).toBe(2);
    expect(second.singleShotEmitted).toBe(true);
    expect(second.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "VFX_SINGLE_ACTIVE_PARTICLE_RETAINED"
    ]);
  });

  it("clears the Single particle when the evaluated active-state gate becomes zero", () => {
    const active = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitterWithFamily("Single"), { particleLimit: 4 }),
      0.1
    );
    const inactive = tickAuroraEmitterRuntime(
      {
        ...active,
        source: {
          ...active.source,
          simulation: { ...active.source.simulation, birthrate: 0 }
        }
      },
      0.1
    );

    expect(inactive.activeParticleIds).toEqual([]);
    expect(inactive.freeParticleIds).toEqual([]);
    expect(inactive.singleShotEmitted).toBe(false);
    expect(inactive.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_SINGLE_ACTIVE_STATE_INACTIVE_CLEARED"
    );
  });

  it("truncates the Single active gate and does not pool a particle destroyed by that gate", () => {
    const belowOne = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        emitterWithFamily("Single", undefined, { birthrate: 0.99 }),
        { particleLimit: 4 }
      ),
      0.1
    );
    const active = tickAuroraEmitterRuntime(
      {
        ...belowOne,
        source: {
          ...belowOne.source,
          simulation: { ...belowOne.source.simulation, birthrate: 1.99 }
        }
      },
      0.1
    );
    const inactive = tickAuroraEmitterRuntime(
      {
        ...active,
        source: {
          ...active.source,
          simulation: { ...active.source.simulation, birthrate: 0.99 }
        }
      },
      0.1
    );
    const reactivated = tickAuroraEmitterRuntime(
      {
        ...inactive,
        source: {
          ...inactive.source,
          simulation: { ...inactive.source.simulation, birthrate: 1 }
        }
      },
      0.1
    );

    expect(belowOne.activeParticleIds).toEqual([]);
    expect(active.activeParticleIds).toEqual([1]);
    expect(inactive.freeParticleIds).toEqual([]);
    expect(reactivated.activeParticleIds).toEqual([2]);
    expect(reactivated.nextParticleId).toBe(3);
  });

  it("applies Single P2P motion once before the Single lifecycle update", () => {
    const emitter = emitterWithFamily("Single");
    emitter.simulation = {
      ...emitter.simulation,
      velocity: 1,
      randvel: 0,
      spread: 0,
      p2p: true,
      p2pType: "gravity",
      drag: 1,
      grav: 0,
      threshold: 0
    };
    const targetContext = {
      targetRef: "single-p2p-target",
      targetPosition: { x: 0, y: 0, z: 10 }
    };
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter),
      1,
      targetContext
    );
    const advanced = tickAuroraEmitterRuntime(spawned, 1, targetContext);

    expect(advanced.particles.find((particle) => particle.particleId === 1)?.position).toEqual({
      x: 0,
      y: 0,
      z: 1
    });
  });

  it("loops Single by resetting the existing particle age without allocating another particle", () => {
    const emitter = {
      ...emitterWithFamily("Single"),
      simulation: {
        ...emitterWithFamily("Single").simulation,
        lifeExp: 0.15
      },
      sourceState: { loop: true }
    } satisfies AuroraMdlEmitterNode;
    const first = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 4 }),
      0.1
    );
    const second = tickAuroraEmitterRuntime(first, 0.2);

    expect(second.activeParticleIds).toEqual([1]);
    expect(second.nextParticleId).toBe(2);
    expect(second.particles[0]?.ageSeconds).toBe(0);
    expect(second.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "VFX_SINGLE_LOOP_AGE_RESET",
      "VFX_SINGLE_ACTIVE_PARTICLE_RETAINED"
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

  it("consumes a direct detonate field through the same Explosion latch", () => {
    const context = { detonateFieldKey: "field:impact:1" };
    const first = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitterWithFamily("Explosion")),
      1,
      context
    );
    const second = tickAuroraEmitterRuntime(first, 0.1, context);

    expect(first.activeParticleIds).toEqual([1, 2]);
    expect(first.processedDetonateEventKeys).toEqual(["field:impact:1"]);
    expect(first.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_EXPLOSION_DETONATE_FIELD_CONSUMED"
    );
    expect(second.activeParticleIds).toEqual([1, 2]);
    expect(second.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "VFX_EXPLOSION_DETONATE_EVENT_ALREADY_PROCESSED"
    ]);
  });

  it("consumes Explosion detonate with zero birthrate without particles or blast wind", () => {
    const emitter = emitterWithFamily("Explosion");
    emitter.simulation = {
      ...emitter.simulation,
      birthrate: 0,
      blastRadius: 10,
      blastLength: 2
    };
    const registerPointSource = jest.fn();

    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter),
      0.25,
      {
        detonateFieldKey: "field:impact:1",
        windContext: {
          source: "aurora-wind-manager",
          resolveDisplacement: () => ({ x: 0, y: 0, z: 0 }),
          registerPointSource
        }
      }
    );

    expect(state.activeParticleIds).toEqual([]);
    expect(registerPointSource).not.toHaveBeenCalled();
    expect(state.lastTickDiagnostics.map((entry) => entry.code)).toContain(
      "VFX_EXPLOSION_DETONATE_ZERO_BIRTHRATE_CONSUMED"
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

  it("uses Aurora's prior-tick detonate guard before allowing another Explosion burst", () => {
    const initial = createAuroraEmitterRuntimeState(
      emitterWithFamily("Explosion"),
      { particleLimit: 16 }
    );
    const first = tickAuroraEmitterRuntime(initial, 1 / 60, {
      detonateEvents: [{ timeSeconds: 0, animationName: "impact" }]
    });
    const adjacent = tickAuroraEmitterRuntime(first, 1 / 60, {
      detonateEvents: [{ timeSeconds: 1 / 30, animationName: "impact" }]
    });
    const guardCleared = tickAuroraEmitterRuntime(adjacent, 1 / 60);
    const separated = tickAuroraEmitterRuntime(guardCleared, 1 / 60, {
      detonateEvents: [{ timeSeconds: 0.1, animationName: "impact" }]
    });

    expect(first.activeParticleIds).toHaveLength(2);
    expect(adjacent.activeParticleIds).toHaveLength(2);
    expect(adjacent.lastTickDiagnostics.map((entry) => entry.code)).toContain(
      "VFX_EXPLOSION_DETONATE_ONE_SHOT_GUARD_SUPPRESSED"
    );
    expect(separated.activeParticleIds).toHaveLength(4);
  });

  it("consumes duplicate Explosion callbacks in one tick through one detonate latch", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitterWithFamily("Explosion"), { particleLimit: 16 }),
      0.25,
      {
        detonateEvents: [
          { timeSeconds: 0.25, animationName: "impact" },
          { timeSeconds: 0.25, animationName: "impact" }
        ]
      }
    );

    expect(state.processedDetonateEventKeys).toEqual(["0.250000:impact"]);
    expect(state.detonateCallbackTrace).toEqual([
      {
        source: "model-animation-event",
        eventKey: "0.250000:impact",
        callbackIndex: 0,
        timeSeconds: 0.25,
        animationName: "impact",
        latchValueWritten: 1,
        consumedAtLocalClockSeconds: 0.25
      },
      {
        source: "model-animation-event",
        eventKey: "0.250000:impact",
        callbackIndex: 1,
        timeSeconds: 0.25,
        animationName: "impact",
        latchValueWritten: 1,
        consumedAtLocalClockSeconds: 0.25
      }
    ]);
    expect(state.activeParticleIds).toHaveLength(2);
  });

  it("uses the shared Aurora reset path for Explosion spawn position and raw lifetime", () => {
    const emitter = emitterWithFamily("Explosion", undefined, { birthrate: 1 });
    emitter.simulation = {
      ...emitter.simulation,
      lifeExp: 0,
      xSize: 1,
      ySize: 1,
      velocity: 0,
      randvel: 0
    };
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { seed: 42 }),
      0.1,
      { detonateEvents: [{ timeSeconds: 0.1, animationName: "impact" }] }
    );

    expect(state.activeParticleIds).toEqual([1]);
    expect(state.particles[0]?.lifetimeSeconds).toBe(0);
    expect(state.particles[0]?.position).not.toEqual({ x: 0, y: 0, z: 0 });
    expect(state.particles[0]?.resetReason).toBe("explosion_detonate_burst");
  });

  it("requires P2P target pointer/context instead of falling back to origin", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(p2pEmitter()),
      0.25
    );

    expect(state.activeParticleIds).toEqual([]);
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "VFX_P2P_TARGET_RUNTIME_POINTER_REQUIRED"
    ]);
  });

  it("requires resolved P2P target position before local path diagnostics", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(p2pEmitter()),
      0.25,
      { targetRef: "retail-p2p-target" }
    );

    expect(state.activeParticleIds).toEqual([]);
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "VFX_P2P_TARGET_POSITION_REQUIRED_FOR_LOCAL_DIAGNOSTIC"
    ]);
  });

  it("applies source P2P gravity-target motion without a fixed preview path", () => {
    const emitter = p2pEmitter({ birthrate: 4 });
    emitter.simulation = {
      ...emitter.simulation,
      lifeExp: 2,
      velocity: 0,
      randvel: 0,
      spread: 0,
      grav: 4,
      threshold: 0.1
    };
    const targetContext = {
      targetRef: "retail-p2p-target",
      targetPosition: { x: 1, y: 0, z: 0 }
    };
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 16 }),
      0.25,
      targetContext
    );
    const state = tickAuroraEmitterRuntime(spawned, 0.25, targetContext);

    expect(spawned.particles[0]).toMatchObject({
      position: { x: 0, y: 0, z: 0 },
      resetReason: "spawned"
    });
    expect(state.activeParticleIds).toEqual([1, 2]);
    expect(state.nextParticleId).toBe(3);
    expect(state.particles[0]).toMatchObject({
      particleId: 1,
      position: { x: 0.25, y: 0, z: 0 },
      velocity: { x: 1, y: 0, z: 0 },
      direction: { x: 1, y: 0, z: 0 },
      resetReason: "p2p_target_path"
    });
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_P2P_TARGET_CONTEXT_CONSUMED",
        "VFX_P2P_GRAVITY_TARGET_PATH_CONSUMED",
        "VFX_P2P_RETAIL_RUNTIME_DUMP_REQUIRED"
      ])
    );
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "VFX_P2P_RUNTIME_NOT_IMPLEMENTED"
    );
  });

  it("applies recovered P2P pow-drag and expires a particle whose motion segment crosses threshold", () => {
    const emitter = p2pEmitter({ birthrate: 4 });
    emitter.simulation = {
      ...emitter.simulation,
      lifeExp: 2,
      velocity: 4,
      randvel: 0,
      spread: 0,
      drag: 0.5,
      grav: 0,
      threshold: 0.1
    };

    const targetContext = {
      targetRef: "retail-p2p-target",
      targetPosition: { x: 0, y: 0, z: 0.5 }
    };
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 16 }),
      0.25,
      targetContext
    );
    const state = tickAuroraEmitterRuntime(spawned, 0.25, targetContext);

    expect(state.particles[0]?.position).toEqual({ x: 0, y: 0, z: 1 });
    expect(state.particles[0]?.velocity.z).toBe(
      Math.fround(4 * Math.pow(0.5, 0.25))
    );
    expect(state.particles[0]?.ageSeconds).toBe(2);
    expect(state.particles[0]?.resetReason).toBe("p2p_target_path");
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "VFX_P2P_DRAG_HELPER_MAPPING_REQUIRED"
    );
  });

  it("expires a P2P particle whose motion segment exactly crosses a zero-threshold target", () => {
    const emitter = p2pEmitter({ birthrate: 4 });
    emitter.simulation = {
      ...emitter.simulation,
      lifeExp: 2,
      velocity: 4,
      randvel: 0,
      spread: 0,
      drag: 1,
      grav: 0,
      threshold: 0
    };
    const targetContext = {
      targetRef: "retail-p2p-target",
      targetPosition: { x: 0, y: 0, z: 0.5 }
    };
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 16 }),
      0.25,
      targetContext
    );
    const state = tickAuroraEmitterRuntime(spawned, 0.25, targetContext);

    expect(state.particles[0]?.position).toEqual({ x: 0, y: 0, z: 1 });
    expect(state.particles[0]?.ageSeconds).toBe(2);
    expect(state.particles[0]?.resetReason).toBe("p2p_target_path");
  });

  it("expires the first P2P particle exactly on a zero-threshold target and stops the updater", () => {
    const emitter = p2pEmitter({ birthrate: 4 });
    emitter.simulation = {
      ...emitter.simulation,
      lifeExp: 2,
      velocity: 0,
      randvel: 0,
      spread: 0,
      drag: 1,
      grav: 0,
      threshold: 0
    };
    const spawnContext = {
      targetRef: "retail-p2p-target",
      targetPosition: { x: 10, y: 0, z: 0 }
    };
    const first = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 16 }),
      0.25,
      spawnContext
    );
    const spawned = tickAuroraEmitterRuntime(first, 0.25, spawnContext);
    const state = tickAuroraEmitterRuntime(
      {
        ...spawned,
        source: {
          ...spawned.source,
          simulation: { ...spawned.source.simulation, birthrate: 0 }
        },
        particles: spawned.particles.map((particle, index) => ({
          ...particle,
          position: index === 0 ? { x: 0, y: 0, z: 0 } : { x: 2, y: 0, z: 0 },
          velocity: index === 0 ? { x: 0, y: 0, z: 0 } : { x: 1, y: 0, z: 0 }
        }))
      },
      0.25,
      {
        targetRef: "retail-p2p-target",
        targetPosition: { x: 0, y: 0, z: 0 }
      }
    );

    expect(state.particles[0]?.ageSeconds).toBe(2);
    expect(state.particles[0]?.resetReason).toBe("p2p_target_path");
    expect(state.particles[1]?.position).toEqual({ x: 2, y: 0, z: 0 });
  });

  it("does not include inherited velocity in the recovered P2P threshold segment", () => {
    const emitter = p2pEmitter({ birthrate: 4 });
    emitter.simulation = {
      ...emitter.simulation,
      lifeExp: 2,
      velocity: 0,
      randvel: 0,
      spread: 0,
      drag: 1,
      grav: 0,
      threshold: 0.1
    };
    const targetContext = {
      targetRef: "retail-p2p-target",
      targetPosition: { x: 0.5, y: 0, z: 0 }
    };
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 16 }),
      0.25,
      targetContext
    );
    const state = tickAuroraEmitterRuntime(
      {
        ...spawned,
        source: {
          ...spawned.source,
          simulation: { ...spawned.source.simulation, birthrate: 0 }
        },
        particles: spawned.particles.map((particle) => ({
          ...particle,
          inheritedVelocityDirection: { x: 1, y: 0, z: 0 },
          inheritedVelocityMagnitude: 4
        }))
      },
      0.25,
      targetContext
    );

    expect(state.particles[0]).toMatchObject({
      position: { x: 1, y: 0, z: 0 },
      ageSeconds: 0.25,
      lifetimeSeconds: 2,
      resetReason: "p2p_target_path"
    });
  });

  it("stops the recovered P2P updater after the first particle starts inside threshold", () => {
    const emitter = p2pEmitter({ birthrate: 4 });
    emitter.simulation = {
      ...emitter.simulation,
      lifeExp: 2,
      velocity: 0,
      randvel: 0,
      spread: 0,
      drag: 1,
      grav: 0,
      threshold: 0
    };
    const spawnContext = {
      targetRef: "retail-p2p-target",
      targetPosition: { x: 10, y: 0, z: 0 }
    };
    const first = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 16 }),
      0.25,
      spawnContext
    );
    const spawned = tickAuroraEmitterRuntime(first, 0.25, spawnContext);
    const state = tickAuroraEmitterRuntime(
      {
        ...spawned,
        source: {
          ...spawned.source,
          simulation: {
            ...spawned.source.simulation,
            birthrate: 0,
            threshold: 0.2
          }
        },
        particles: spawned.particles.map((particle, index) => ({
          ...particle,
          position: index === 0 ? { x: 0.05, y: 0, z: 0 } : { x: 2, y: 0, z: 0 },
          velocity: index === 0 ? { x: 0, y: 0, z: 0 } : { x: 1, y: 0, z: 0 }
        }))
      },
      0.25,
      {
        targetRef: "retail-p2p-target",
        targetPosition: { x: 0, y: 0, z: 0 }
      }
    );

    expect(state.particles[0]?.ageSeconds).toBe(2);
    expect(state.particles[0]?.resetReason).toBe("p2p_target_path");
    expect(state.particles[1]?.position).toEqual({ x: 2, y: 0, z: 0 });
  });

  it("preserves negative P2P grav as target repulsion", () => {
    const emitter = p2pEmitter({ birthrate: 4 });
    emitter.simulation = {
      ...emitter.simulation,
      lifeExp: 2,
      velocity: 0,
      randvel: 0,
      spread: 0,
      drag: 1,
      grav: -4,
      threshold: 0
    };
    const targetContext = {
      targetRef: "retail-p2p-target",
      targetPosition: { x: 1, y: 0, z: 0 }
    };
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 16 }),
      0.25,
      targetContext
    );
    const state = tickAuroraEmitterRuntime(spawned, 0.25, targetContext);

    expect(state.particles[0]?.position.x).toBeCloseTo(-0.25, 10);
    expect(state.particles[0]?.velocity.x).toBeCloseTo(-1, 10);
  });

  it("squares a negative P2P threshold without replacing it with zero", () => {
    const emitter = p2pEmitter({ birthrate: 4 });
    emitter.simulation = {
      ...emitter.simulation,
      lifeExp: 2,
      velocity: 0,
      randvel: 0,
      spread: 0,
      drag: 1,
      grav: 0,
      threshold: -0.5
    };
    const targetContext = {
      targetRef: "retail-p2p-target",
      targetPosition: { x: 0.25, y: 0, z: 0 }
    };
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 16 }),
      0.25,
      targetContext
    );
    const state = tickAuroraEmitterRuntime(spawned, 0.25, targetContext);

    expect(state.particles[0]?.ageSeconds).toBe(2);
    expect(state.particles[0]?.position).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("applies evaluated Aurora wind displacement before P2P target gravity", () => {
    const emitter = p2pEmitter({ birthrate: 4 });
    emitter.simulation = {
      ...emitter.simulation,
      lifeExp: 2,
      velocity: 0,
      randvel: 0,
      spread: 0,
      affectedByWind: true,
      grav: 4,
      threshold: 0.1
    };
    const resolveDisplacement = jest.fn(() => ({ x: 0, y: 0.5, z: 0 }));

    const targetContext = {
      targetRef: "retail-p2p-target",
      targetPosition: { x: 1, y: 0, z: 0 },
      windContext: { source: "aurora-wind-manager" as const, resolveDisplacement }
    };
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 16 }),
      0.25,
      targetContext
    );
    const state = tickAuroraEmitterRuntime(spawned, 0.25, targetContext);

    expect(resolveDisplacement).toHaveBeenCalledWith({
      emitterNodeName: "emit_p2p",
      particleId: 1,
      position: { x: 0, y: 0, z: 0 },
      deltaSeconds: 0.25
    });
    expect(state.particles[0]?.position).toEqual({ x: 0.25, y: 0.5, z: 0 });
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "VFX_AURORA_WIND_CONTEXT_REQUIRED"
    );
  });

  it("applies recovered P2P Bezier control points and combine weighting", () => {
    const emitter = p2pEmitter({ birthrate: 4 });
    emitter.simulation = {
      ...emitter.simulation,
      p2pType: "bezier",
      lifeExp: 2,
      velocity: 0,
      randvel: 0,
      spread: 0,
      p2pBezier2: 1,
      p2pBezier3: -1,
      combineTime: 0,
      mass: 0
    };
    const targetContext = {
      targetRef: "source-mdl-reference:target_ref",
      targetPosition: { x: 4, y: 0, z: 0 },
      targetForward: { x: 0, y: 1, z: 0 }
    };
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 16 }),
      0.25,
      targetContext
    );
    const state = tickAuroraEmitterRuntime(spawned, 0.25, targetContext);

    expect(spawned.particles[0]?.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(state.particles[0]?.position.x).toBeCloseTo(0.171875, 10);
    expect(state.particles[0]?.position.y).toBeCloseTo(-0.041015625, 10);
    expect(state.particles[0]?.position.z).toBeCloseTo(0.287109375, 10);
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_P2P_BEZIER_TARGET_PATH_CONSUMED"
    );
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "VFX_P2P_BEZIER_RUNTIME_MAPPING_REQUIRED"
    );
  });

  it("passes negative P2P combineTime directly to the recovered power weighting", () => {
    const emitter = p2pEmitter({ birthrate: 4 });
    emitter.simulation = {
      ...emitter.simulation,
      p2pType: "bezier",
      lifeExp: 2,
      velocity: 0,
      randvel: 0,
      spread: 0,
      p2pBezier2: 1,
      p2pBezier3: -1,
      combineTime: -1,
      mass: 0
    };
    const targetContext = {
      targetRef: "source-mdl-reference:target_ref",
      targetPosition: { x: 4, y: 0, z: 0 },
      targetForward: { x: 0, y: 1, z: 0 }
    };
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 16 }),
      0.25,
      targetContext
    );
    const state = tickAuroraEmitterRuntime(spawned, 0.25, targetContext);

    expect(state.particles[0]?.position.x).toBeCloseTo(88, 10);
    expect(state.particles[0]?.position.y).toBeCloseTo(-21, 10);
    expect(state.particles[0]?.position.z).toBeCloseTo(147, 10);
  });

  it("requires evaluated reference orientation for P2P Bezier", () => {
    const emitter = p2pEmitter({ birthrate: 4 });
    emitter.simulation = {
      ...emitter.simulation,
      p2pType: "bezier"
    };

    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 16 }),
      0.25,
      { targetRef: "retail-p2p-target", targetPosition: { x: 1, y: 0, z: 0 } }
    );

    expect(state.activeParticleIds).toEqual([]);
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "VFX_P2P_BEZIER_TARGET_ORIENTATION_REQUIRED"
    ]);
  });

  it("requires Aurora wind-manager context for affected P2P particles", () => {
    const emitter = p2pEmitter({ birthrate: 4 });
    emitter.simulation = {
      ...emitter.simulation,
      velocity: 0,
      randvel: 0,
      spread: 0,
      affectedByWind: true,
      grav: 0
    };

    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 16 }),
      0.25,
      { targetRef: "retail-p2p-target", targetPosition: { x: 1, y: 0, z: 0 } }
    );

    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_AURORA_WIND_CONTEXT_REQUIRED"
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

    // Aurora derives Lightning active-point count from its evaluated birthrate slot.
    expect(state.activeParticleIds).toEqual([1, 2]);
    expect(state.nextParticleId).toBe(3);
    expect(state.particles.find((particle) => particle.particleId === 1)).toMatchObject({
      position: { x: 0, y: 0, z: 0 },
      resetReason: "lightning_target_path"
    });
    expect(state.particles.find((particle) => particle.particleId === 2)).toMatchObject({
      position: { x: 0, y: 1, z: 0.5 },
      resetReason: "lightning_target_path"
    });
    [1, 2].forEach((id) => {
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

  it("uses the truncated evaluated birthrate slot for Lightning active-point count", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        emitterWithFamily("Lightning", undefined, { birthrate: 3.6 }),
        { particleLimit: 6 }
      ),
      0.1,
      { targetRef: "retail-lightning-target", targetPosition: { x: 0, y: 1, z: 0.5 } }
    );

    expect(state.activeParticleIds).toEqual([1, 2, 3]);
    expect(state.particles.find((particle) => particle.particleId === 3)).toMatchObject({
      position: { x: 0, y: 1, z: 0.5 }
    });
  });

  it("uses Aurora truncation for Lightning half-point counts", () => {
    const even = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        emitterWithFamily("Lightning", undefined, { birthrate: 2.5 }),
        { particleLimit: 6 }
      ),
      0.1,
      { targetRef: "retail-lightning-target", targetPosition: { x: 0, y: 1, z: 0.5 } }
    );
    const odd = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        emitterWithFamily("Lightning", undefined, { birthrate: 3.5 }),
        { particleLimit: 6 }
      ),
      0.1,
      { targetRef: "retail-lightning-target", targetPosition: { x: 0, y: 1, z: 0.5 } }
    );

    expect(even.activeParticleIds).toHaveLength(2);
    expect(odd.activeParticleIds).toHaveLength(3);
  });

  it("preserves raw Lightning lifetime and chunk ownership through shared reset", () => {
    const emitter = emitterWithFamily("Lightning", "fx_lightning_chunk", { birthrate: 1 });
    emitter.simulation = { ...emitter.simulation, lifeExp: 0 };
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 2 }),
      0.1,
      { targetRef: "retail-lightning-target", targetPosition: { x: 0, y: 1, z: 0.5 } }
    );

    expect(state.particles[0]?.lifetimeSeconds).toBe(0);
    expect(state.particles[0]?.chunkModelRuntimeRef).toMatchObject({
      requestedRef: "fx_lightning_chunk",
      status: "active"
    });
  });

  it("keeps Lightning points on the baseline when radius and scale jitter are disabled", () => {
    const emitter = emitterWithFamily("Lightning", undefined, { birthrate: 3 });
    emitter.simulation = {
      ...emitter.simulation,
      lightningRadius: 0,
      lightningScale: 0
    };

    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 6, seed: 42 }),
      0.1,
      { targetRef: "retail-lightning-target", targetPosition: { x: 0, y: 0, z: 1 } }
    );

    expect(state.particles.find((particle) => particle.particleId === 2)?.position).toEqual({
      x: 0,
      y: 0,
      z: 0.5
    });
    expect(state.rng.seed).not.toBe(42);
  });

  it("bounds recursive Lightning jitter by radius and uses Aurora's recovered axes", () => {
    const rawSamples = Array.from({ length: 3 }, () => [1, 24, 1, 24]).flat();
    const rngHook = {
      nextFloat(state: { algorithm: "aurora-rand15"; seed: number }) {
        const raw = rawSamples.shift() ?? 0;
        return {
          value: raw / 0x8000,
          state: { ...state, seed: state.seed + 1 }
        };
      }
    };
    const emitter = emitterWithFamily("Lightning", undefined, { birthrate: 3 });
    emitter.simulation = {
      ...emitter.simulation,
      velocity: 0,
      randvel: 0,
      spread: 0,
      lightningRadius: 0.25,
      lightningScale: 0
    };

    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 6, seed: 42 }),
      0.1,
      {
        targetRef: "retail-lightning-target",
        targetPosition: { x: 0, y: 0, z: 1 },
        rngHook
      }
    );
    const midpoint = state.particles.find((particle) => particle.particleId === 2)!.position;

    expect(midpoint.x).toBeCloseTo(-0.72, 10);
    expect(midpoint.y).toBeCloseTo(-0.72, 10);
    expect(midpoint.z).toBeCloseTo(0.5, 10);
    expect(rawSamples).toEqual([]);
  });

  it("bounds the separate lightningScale pass by half point spacing", () => {
    const rawSamples = [0, 0, 0, 0, 0, 0, 1, 15];
    const rngHook = {
      nextFloat(state: { algorithm: "aurora-rand15"; seed: number }) {
        const raw = rawSamples.shift() ?? 0;
        return {
          value: raw / 0x8000,
          state: { ...state, seed: state.seed + 1 }
        };
      }
    };
    const emitter = emitterWithFamily("Lightning", undefined, { birthrate: 3 });
    emitter.simulation = {
      ...emitter.simulation,
      velocity: 0,
      randvel: 0,
      spread: 0,
      lightningRadius: 0,
      lightningScale: 2
    };

    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 6, seed: 42 }),
      0.1,
      {
        targetRef: "retail-lightning-target",
        targetPosition: { x: 0, y: 0, z: 1 },
        rngHook
      }
    );
    const midpoint = state.particles.find((particle) => particle.particleId === 2)!.position;

    expect(midpoint).toEqual({ x: 0, y: Math.fround(-0.3), z: 0.5 });
    expect(rawSamples).toEqual([]);
  });

  it("keeps particle color and size independent from lightningScale", () => {
    const emitter = emitterWithFamily("Lightning", undefined, { birthrate: 2 });
    emitter.simulation = {
      ...emitter.simulation,
      velocity: 0,
      randvel: 0,
      spread: 0,
      sizeStart: 3,
      lightningRadius: 0,
      lightningScale: 0.25
    };
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 4 }),
      0.1,
      { targetRef: "retail-lightning-target", targetPosition: { x: 0, y: 0, z: 1 } }
    );

    expect(state.particles.find((particle) => particle.particleId === 1)).toMatchObject({
      color: { r: 1, g: 0, b: 0 },
      alpha: 1,
      size: { x: 3, y: 3 }
    });
  });

  it("transforms cached Lightning points during the source delay window without rerolling RNG", () => {
    const emitter = emitterWithFamily("Lightning", undefined, { birthrate: 3 });
    emitter.simulation = {
      ...emitter.simulation,
      lightningDelay: 0,
      lightningRadius: 0.25,
      lightningScale: 1
    };
    const first = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 6, seed: 42 }),
      0.1,
      { targetRef: "retail-lightning-target", targetPosition: { x: 0, y: 0, z: 1 } }
    );
    const rngAfterRebuild = first.rng.seed;

    const delayEnabled = {
      ...first,
      source: {
        ...first.source,
        simulation: { ...first.source.simulation, lightningDelay: 1 }
      }
    };
    const second = tickAuroraEmitterRuntime(delayEnabled, 0.1, {
      targetRef: "retail-lightning-target",
      targetPosition: { x: 0, y: 0, z: 2 }
    });
    const secondMiddle = second.particles.find((particle) => particle.particleId === 2)!.position;
    const third = tickAuroraEmitterRuntime(second, 0.1, {
      targetRef: "retail-lightning-target",
      targetPosition: { x: 0, y: 0, z: 4 }
    });
    const thirdMiddle = third.particles.find((particle) => particle.particleId === 2)!.position;

    expect(thirdMiddle.x).toBeCloseTo(secondMiddle.x, 10);
    expect(thirdMiddle.y).toBeCloseTo(secondMiddle.y, 10);
    expect(thirdMiddle.z).toBeCloseTo(secondMiddle.z, 10);
    expect(third.rng.seed).toBe(rngAfterRebuild);
    expect(third.lightningDelayTimerSeconds).toBeCloseTo(0.2, 10);
    expect(third.lightningCachedTargetVector).toEqual({ x: 0, y: 0, z: 4 });
  });

  it("retains Lightning point identities when their shared-reset lifetime is reached", () => {
    const emitter = emitterWithFamily("Lightning", undefined, { birthrate: 3 });
    emitter.simulation = {
      ...emitter.simulation,
      lifeExp: 0.1,
      velocity: 0,
      randvel: 0,
      spread: 0,
      lightningRadius: 0,
      lightningScale: 0
    };
    const context = {
      targetRef: "retail-lightning-target",
      targetPosition: { x: 0, y: 0, z: 1 }
    };
    const first = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { particleLimit: 6 }),
      0.1,
      context
    );
    const second = tickAuroraEmitterRuntime(first, 0.1, context);

    expect(second.activeParticleIds).toEqual([1, 2, 3]);
    expect(second.nextParticleId).toBe(4);
    const expectedFloat32Age = Math.fround(0.1);
    expect(second.particles.filter((particle) => particle.list === "active")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ particleId: 1, ageSeconds: expectedFloat32Age, lifetimeSeconds: 0 }),
        expect.objectContaining({ particleId: 2, ageSeconds: expectedFloat32Age, lifetimeSeconds: 0 }),
        expect.objectContaining({ particleId: 3, ageSeconds: expectedFloat32Age, lifetimeSeconds: 0 })
      ])
    );
  });

  it("clears Lightning active points when the evaluated source point count is zero", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        emitterWithFamily("Lightning", undefined, { birthrate: 0 }),
        { particleLimit: 6 }
      ),
      0.1,
      { targetRef: "retail-lightning-target", targetPosition: { x: 0, y: 1, z: 0.5 } }
    );

    expect(state.activeParticleIds).toEqual([]);
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_LIGHTNING_EVALUATED_POINT_COUNT_ZERO_CLEARS_ACTIVE"
    );
  });

  it("does not synthesize particles for a standalone Chunk update family", () => {
    const state = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        emitterWithFamily("Chunk", "progfx_type9_chunk_model_pending"),
        { family: "Chunk" }
      ),
      0.25
    );

    expect(state.activeParticleIds).toEqual([]);
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "VFX_CHUNK_NAME_IS_RENDER_LANE_NOT_UPDATE_FAMILY",
        "VFX_CHUNK_UPDATE_FAMILY_REQUIRED"
      ])
    );
  });

  it("tracks chunk model ownership on the normal Fountain particle lifecycle", () => {
    const emitter = emitterWithFamily("Fountain", "fx_chunk01", { birthrate: 1 });
    emitter.simulation = { ...emitter.simulation, lifeExp: 0.5 };
    const active = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter, { seed: 42 }),
      1
    );

    expect(active.family).toBe("Fountain");
    expect(active.activeParticleIds).toEqual([1]);
    expect(active.particles[0]?.chunkModelRuntimeRef).toMatchObject({
      requestedRef: "fx_chunk01",
      status: "active"
    });

    const reachedLifetime = tickAuroraEmitterRuntime(
      {
        ...active,
        source: {
          ...active.source,
          simulation: { ...active.source.simulation, birthrate: 0 }
        }
      },
      0.5
    );
    expect(reachedLifetime.activeParticleIds).toEqual([1]);

    const released = tickAuroraEmitterRuntime(reachedLifetime, 0.1);
    expect(released.activeParticleIds).toEqual([]);
    expect(released.particles[0]?.chunkModelRuntimeRef).toMatchObject({
      requestedRef: "fx_chunk01",
      status: "released",
      releasedAtClockSeconds: 1.6
    });
  });

  it("checks shared particle expiry before adding the current tick delta", () => {
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({ birthrate: 2, lifeExp: 1 })
      ),
      0.5
    );
    const reachedLifetime = tickAuroraEmitterRuntime(
      {
        ...spawned,
        source: {
          ...spawned.source,
          simulation: { ...spawned.source.simulation, birthrate: 0 }
        }
      },
      1
    );

    expect(reachedLifetime.activeParticleIds).toEqual([1]);
    expect(reachedLifetime.particles[0]?.ageSeconds).toBe(1);

    const expired = tickAuroraEmitterRuntime(reachedLifetime, 0.25);
    expect(expired.activeParticleIds).toEqual([]);
    expect(expired.freeParticleIds).toEqual([1]);
    expect(expired.particles[0]).toMatchObject({
      ageSeconds: 1,
      deathReason: "expired_lifetime",
      list: "free"
    });
  });

  it("does not expire a shared particle with a negative source lifetime", () => {
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({ birthrate: 2, lifeExp: 1 })
      ),
      0.5
    );
    const advanced = tickAuroraEmitterRuntime(
      {
        ...spawned,
        particles: spawned.particles.map((particle) => ({
          ...particle,
          lifetimeSeconds: -1
        })),
        source: {
          ...spawned.source,
          simulation: {
            ...spawned.source.simulation,
            birthrate: 0,
            lifeExp: -1
          }
        }
      },
      2
    );

    expect(advanced.activeParticleIds).toEqual([1]);
    expect(advanced.particles[0]).toMatchObject({
      ageSeconds: 2,
      lifetimeSeconds: -1,
      list: "active"
    });
  });

  it("creates one typed bounce query for each pre-existing active particle and never queries splat separately", () => {
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 2,
          lifeExp: 10,
          bounce: true,
          splat: true
        })
      ),
      0.5
    );
    expect(spawned.collisionQueries).toEqual([]);

    const state = tickAuroraEmitterRuntime(spawned, 0.1);

    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_PARTICLE_COLLISION_CONTEXT_REQUIRED"
    );
    expect(state.collisionQueries).toHaveLength(1);
    expect(state.collisionQueries[0]).toMatchObject({
      particleId: 1,
      particleLane: "texture",
      reason: "bounce",
      status: "context_required",
      sourceFlagsWord: 0x210,
      queryResetGeneration: 1,
      staleResultReset: true,
      splatRequested: true,
      collisionProfileId: "unresolved",
      collisionServiceEvidence: "unresolved"
    });
    expect(state.collisionQueries[0]?.currentPosition).toEqual(
      spawned.particles[0]?.position
    );
    expect(state.collisionQueries.every((query) => query.reason === "bounce")).toBe(true);
  });

  it("does not create a collision query for splat without the source bounce bit", () => {
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({ birthrate: 2, lifeExp: 10, splat: true })
      ),
      0.5
    );
    const state = tickAuroraEmitterRuntime(spawned, 0.1);

    expect(state.collisionQueries).toEqual([]);
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "VFX_PARTICLE_COLLISION_CONTEXT_REQUIRED"
    );
  });

  it("applies Aurora reflection, settled threshold, landed normal, predicted-position nudge, and splat end size", () => {
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 2,
          lifeExp: 10,
          velocity: 1,
          randvel: 0,
          spread: 0,
          bounce: true,
          bounceCoefficient: 0.25,
          splat: true,
          sizeEnd: 0.4,
          sizeEndY: 0.2
        })
      ),
      0.5
    );
    const state = tickAuroraEmitterRuntime(spawned, 0.1, {
      collisionContext: {
        collisionProfileId: "aurora-contact-fixture",
        requestedCollisionClasses: ["mapped-aurora-particle-contact"],
        serviceEvidence: "aurora-runtime-service",
        resolve: () => ({
          status: "hit",
          hitPosition: { x: 1, y: 2, z: 3 },
          contactNormal: { x: 0, y: 0, z: 1 },
          contactNormalProvenance: "query-helper:+0x54/+0x58/+0x5c"
        })
      }
    });

    expect(state.collisionResults).toHaveLength(1);
    expect(state.collisionResults[0]).toMatchObject({
      status: "hit",
      appliedToRuntime: true,
      reflectedVelocity: { x: 0, y: 0, z: -0.25 },
      postNudgePosition: { x: 0, y: 0, z: 0.125 },
      postNudgeBasePositionSource: "predicted_position",
      settled: true,
      landedFlagWriteIntent: "set"
    });
    expect(state.particles[0]).toMatchObject({
      landed: true,
      contactNormal: { x: 0, y: 0, z: 1 },
      direction: { x: 0, y: 0, z: 1 },
      velocity: { x: 0, y: 0, z: -0.25 },
      position: { x: 0, y: 0, z: 0.125 },
      size: { x: Math.fround(0.4), y: Math.fround(0.2) }
    });
  });

  it("writes the recovered up-to-contact quaternion when a Chunk particle settles", () => {
    const emitter = emitterWithFamily("Fountain", "fx_chunk01", { birthrate: 2 });
    emitter.simulation = {
      ...emitter.simulation,
      lifeExp: 10,
      velocity: 1,
      randvel: 0,
      spread: 0,
      bounce: true,
      bounceCoefficient: 0.25
    };
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter),
      0.5
    );
    const state = tickAuroraEmitterRuntime(spawned, 0.1, {
      collisionContext: {
        collisionProfileId: "aurora-contact-fixture",
        requestedCollisionClasses: ["mapped-aurora-particle-contact"],
        serviceEvidence: "aurora-runtime-service",
        resolve: () => ({
          status: "hit",
          contactNormal: { x: 0, y: 1, z: 0 },
          contactNormalProvenance: "query-helper:+0x54/+0x58/+0x5c"
        })
      }
    });

    expect(state.particles[0]).toMatchObject({
      landed: true,
      contactNormal: { x: 0, y: 1, z: 0 },
      direction: { x: 0, y: 1, z: 0 },
      particleOrientation: {
        axis: [-1, 0, 0],
        angleRadians: Math.PI / 2
      }
    });
  });

  it("keeps the source predicted position when Aurora collision reports a diagnostic-only hit point", () => {
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 2,
          lifeExp: 10,
          velocity: 1,
          randvel: 0,
          spread: 0,
          bounce: true,
          bounceCoefficient: 1
        })
      ),
      0.5
    );
    const state = tickAuroraEmitterRuntime(spawned, 0.1, {
      collisionContext: {
        collisionProfileId: "aurora-contact-fixture",
        requestedCollisionClasses: ["mapped-aurora-particle-contact"],
        serviceEvidence: "aurora-runtime-service",
        resolve: () => ({
          status: "hit",
          hitPosition: { x: 10, y: 20, z: 30 },
          contactNormal: { x: 0, y: 0, z: 1 },
          contactNormalProvenance: "query-helper:+0x54/+0x58/+0x5c"
        })
      }
    });

    expect(state.collisionResults[0]).toMatchObject({
      hitPosition: { x: 10, y: 20, z: 30 },
      postNudgeBasePositionSource: "predicted_position",
      appliedToRuntime: true
    });
    expect(state.collisionResults[0]?.postNudgePosition).toMatchObject({ x: 0, y: 0 });
    const expectedPostNudgeZ = Math.fround(Math.fround(0.1) + 0.005);
    expect(state.collisionResults[0]?.postNudgePosition?.z).toBe(expectedPostNudgeZ);
    expect(state.particles[0]?.position).toMatchObject({ x: 0, y: 0 });
    expect(state.particles[0]?.position.z).toBe(expectedPostNudgeZ);
  });

  it("does not force end size for a settled bounce when the source splat bit is clear", () => {
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 2,
          lifeExp: 10,
          velocity: 1,
          randvel: 0,
          spread: 0,
          bounce: true,
          bounceCoefficient: 0.25,
          sizeEnd: 0.4
        })
      ),
      0.5
    );
    const state = tickAuroraEmitterRuntime(spawned, 0.1, {
      collisionContext: {
        collisionProfileId: "aurora-contact-fixture",
        requestedCollisionClasses: ["mapped-aurora-particle-contact"],
        serviceEvidence: "aurora-runtime-service",
        resolve: () => ({
          status: "hit",
          hitPosition: { x: 0, y: 0, z: 0 },
          contactNormal: { x: 0, y: 0, z: 1 },
          contactNormalProvenance: "query-helper:+0x54/+0x58/+0x5c"
        })
      }
    });

    expect(state.particles[0]?.landed).toBe(true);
    const expectedAgeFraction = Math.fround(
      Math.fround(0.1) * Math.fround(1 / Math.fround(10))
    );
    const expectedFloat32Size = Math.fround(
      Math.fround(0.4) * expectedAgeFraction +
      (1 - expectedAgeFraction) * Math.fround(1)
    );
    expect(state.particles[0]?.size.x).toBe(expectedFloat32Size);
    expect(state.particles[0]?.size.x).not.toBeCloseTo(0.4, 10);
  });

  it("preserves the landed flag when reflected speed does not cross Aurora's squared-speed threshold", () => {
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 2,
          lifeExp: 10,
          velocity: 2,
          randvel: 0,
          spread: 0,
          bounce: true,
          bounceCoefficient: 1
        })
      ),
      0.5
    );
    const state = tickAuroraEmitterRuntime(spawned, 0.1, {
      collisionContext: {
        collisionProfileId: "aurora-contact-fixture",
        requestedCollisionClasses: ["mapped-aurora-particle-contact"],
        serviceEvidence: "aurora-runtime-service",
        resolve: () => ({
          status: "hit",
          hitPosition: { x: 0, y: 0, z: 0 },
          contactNormal: { x: 0, y: 0, z: 1 },
          contactNormalProvenance: "query-helper:+0x54/+0x58/+0x5c"
        })
      }
    });

    expect(state.collisionResults[0]).toMatchObject({
      reflectedVelocity: { x: 0, y: 0, z: -2 },
      postNudgePosition: { x: 0, y: 0, z: Math.fround(0.20500000000000002) },
      settled: false,
      landedFlagWriteIntent: "preserve",
      appliedToRuntime: true
    });
    expect(state.particles[0]).toMatchObject({ landed: false });
  });

  it("preserves the Aurora chunk collision lane, model list entry, endpoint extension, and extent nudge", () => {
    const emitter = fountainEmitter({
      birthrate: 2,
      lifeExp: 10,
      velocity: 1,
      randvel: 0,
      spread: 0,
      bounce: true,
      bounceCoefficient: 1
    });
    emitter.chunkName = "fx_chunk01";
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(emitter),
      0.5
    );
    const state = tickAuroraEmitterRuntime(spawned, 0.1, {
      collisionContext: {
        collisionProfileId: "aurora-contact-fixture",
        requestedCollisionClasses: ["mapped-aurora-particle-contact"],
        serviceEvidence: "aurora-runtime-service",
        resolve: () => ({
          status: "hit",
          hitPosition: { x: 0, y: 0, z: 0 },
          contactNormal: { x: 0, y: 0, z: 1 },
          contactNormalProvenance: "query-helper:+0x54/+0x58/+0x5c"
        })
      }
    });

    expect(state.collisionQueries[0]).toMatchObject({
      particleLane: "chunk",
      chunkExtentScale: 1,
      testEndpoint: { x: 0, y: 0, z: Math.fround(0.2) },
      chunkModelRuntimeRef: {
        requestedRef: "fx_chunk01",
        status: "active"
      }
    });
    expect(state.collisionResults[0]).toMatchObject({
      chunkPostHitExtentNudge: 1,
      postNudgePosition: { x: 0, y: 0, z: Math.fround(Math.fround(0.1) + 1.005) },
      appliedToRuntime: true
    });
  });

  it("does not mutate canonical particle state from a profile-gated collision adapter", () => {
    const spawned = tickAuroraEmitterRuntime(
      createAuroraEmitterRuntimeState(
        fountainEmitter({
          birthrate: 2,
          lifeExp: 10,
          velocity: 1,
          randvel: 0,
          spread: 0,
          bounce: true,
          bounceCoefficient: 1
        })
      ),
      0.5
    );
    const state = tickAuroraEmitterRuntime(spawned, 0.1, {
      collisionContext: {
        collisionProfileId: "three-raycast-preview",
        requestedCollisionClasses: ["preview-mesh"],
        serviceEvidence: "profile-gated-adapter",
        resolve: () => ({
          status: "hit",
          hitPosition: { x: 10, y: 10, z: 10 },
          contactNormal: { x: 0, y: 0, z: 1 },
          contactNormalProvenance: "preview-raycast-normal"
        })
      }
    });

    expect(state.collisionResults[0]).toMatchObject({
      status: "hit",
      appliedToRuntime: false
    });
    expect(state.particles[0]?.position).toEqual({ x: 0, y: 0, z: Math.fround(0.1) });
    expect(state.lastTickDiagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_PARTICLE_COLLISION_SERVICE_PROFILE_GATED"
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
    xSize?: number;
    ySize?: number;
    position?: [number, number, number];
    particleRot?: number;
    velocity?: number;
    randvel?: number;
    spread?: number;
    deadspace?: number;
    mass?: number;
    grav?: number;
    blurLength?: number;
    renderMode?: string;
    sizeStartY?: number;
    sizeMidY?: number;
    sizeEndY?: number;
    inherit?: boolean;
    inheritVel?: boolean;
    inheritLocal?: boolean;
    inheritPart?: boolean;
    bounce?: boolean;
    bounceCoefficient?: number;
    splat?: boolean;
    sizeEnd?: number;
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
    ...(overrides.renderMode ? { renderMode: overrides.renderMode, renderModeRaw: overrides.renderMode } : {}),
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
      ...(overrides.xSize !== undefined ? { xSize: overrides.xSize } : {}),
      ...(overrides.ySize !== undefined ? { ySize: overrides.ySize } : {}),
      birthrate: overrides.birthrate ?? 2,
      lifeExp: overrides.lifeExp ?? 1,
      velocity: overrides.velocity ?? 1,
      randvel: overrides.randvel ?? 0.25,
      spread: overrides.spread ?? 0.5,
      ...(overrides.deadspace !== undefined ? { deadspace: overrides.deadspace } : {}),
      ...(overrides.particleRot !== undefined ? { particleRot: overrides.particleRot } : {}),
      ...(overrides.mass !== undefined ? { mass: overrides.mass } : {}),
      ...(overrides.grav !== undefined ? { grav: overrides.grav } : {}),
      ...(overrides.blurLength !== undefined ? { blurLength: overrides.blurLength } : {}),
      ...(overrides.inherit !== undefined ? { inherit: overrides.inherit } : {}),
      ...(overrides.inheritVel !== undefined ? { inheritVel: overrides.inheritVel } : {}),
      ...(overrides.inheritLocal !== undefined ? { inheritLocal: overrides.inheritLocal } : {}),
      ...(overrides.inheritPart !== undefined ? { inheritPart: overrides.inheritPart } : {}),
      colorStart: [1, 0, 0],
      colorMid: [0, 1, 0],
      colorEnd: [0, 0, 1],
      alphaStart: 1,
      alphaMid: 0.5,
      alphaEnd: 0,
      sizeStart: 1,
      sizeMid: 2,
      sizeEnd: overrides.sizeEnd ?? 0,
      ...(overrides.sizeStartY !== undefined ? { sizeStartY: overrides.sizeStartY } : {}),
      ...(overrides.sizeMidY !== undefined ? { sizeMidY: overrides.sizeMidY } : {}),
      ...(overrides.sizeEndY !== undefined ? { sizeEndY: overrides.sizeEndY } : {}),
      ...(overrides.bounce !== undefined ? { bounce: overrides.bounce } : {}),
      ...(overrides.bounceCoefficient !== undefined
        ? { bounceCoefficient: overrides.bounceCoefficient }
        : {})
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

function emitterWithFamily(
  emitterType: string,
  chunkName?: string,
  simulationOverrides: { birthrate?: number } = {}
): AuroraMdlEmitterNode {
  return {
    ...fountainEmitter(simulationOverrides),
    nodeName: `emit_${emitterType.toLowerCase()}`,
    emitterType,
    emitterTypeRaw: emitterType,
    ...(chunkName ? { chunkName } : {})
  };
}

function p2pEmitter(
  simulationOverrides: { birthrate?: number } = {}
): AuroraMdlEmitterNode {
  const emitter = emitterWithFamily("Fountain", undefined, simulationOverrides);
  return {
    ...emitter,
    nodeName: "emit_p2p",
    simulation: {
      ...emitter.simulation,
      p2p: true
    }
  };
}

function rotateByOrientation(
  vector: { x: number; y: number; z: number },
  orientation: { axis: [number, number, number]; angleRadians: number }
): { x: number; y: number; z: number } {
  const [rawX, rawY, rawZ] = orientation.axis;
  const axisLength = Math.hypot(rawX, rawY, rawZ);
  const x = rawX / axisLength;
  const y = rawY / axisLength;
  const z = rawZ / axisLength;
  const sine = Math.sin(orientation.angleRadians);
  const cosine = Math.cos(orientation.angleRadians);
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
