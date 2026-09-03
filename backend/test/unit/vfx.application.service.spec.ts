import { AppException } from "../../src/common/http/app-exception";
import { buildDefaultRuntimeSettings } from "../../src/modules/runtime-settings/domain/runtime-settings.defaults";
import type {
  RuntimeSettingsRecord
} from "../../src/modules/runtime-settings/domain/runtime-settings.types";
import { VfxApplicationService } from "../../src/modules/vfx/application/vfx.application.service";
import { buildAuroraVfxOutputCacheKey } from "../../src/modules/vfx/domain/aurora-vfx-cache-key";
import type { AuroraMdlEmitterNode } from "../../src/modules/vfx/domain/aurora-mdl-vfx-source.parser";
import { buildAuroraAoeVisualFootprintContract } from "../../src/modules/vfx/domain/aurora-vfx-aoe-visual-runtime";
import {
  buildAuroraObjectDurationVisualOwnerContract
} from "../../src/modules/vfx/domain/aurora-vfx-object-duration-owner-runtime";
import {
  defaultAuroraDeterministicRngHook,
  NWN_EE_VFX_RNG_ALGORITHM,
  type AuroraDeterministicRngState
} from "../../src/modules/vfx/domain/aurora-vfx-runtime-state";

const SOURCE_TABLE = [
  "2DA V2.0",
  "",
  "Label Type_FD ProgFX_Impact SoundImpact Imp_Impact_Node",
  "0 VFX_TEST F 0 snd_impact fx_impact"
].join("\n");

describe("VfxApplicationService", () => {
  it("advances one retail NWN EE rand15 stream across emitters in source update order", async () => {
    const service = buildService();
    const randomizedEmitter = (nodeName: string) =>
      buildEmitter({
        nodeName,
        simulation: {
          birthrate: 1,
          lifeExp: 3,
          velocity: 0,
          randvel: 0,
          spread: 0,
          xSize: 1,
          ySize: 1,
          sizeStart: 1,
          sizeEnd: 1,
          alphaStart: 1,
          alphaEnd: 1
        }
      });
    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_shared_rng.mdl",
      sourceLayer: "external_fixture",
      sourceEmitters: [randomizedEmitter("first"), randomizedEmitter("second")],
      runtime: {
        dtSeconds: 1,
        tickCount: 2,
        particleLimit: 16,
        seed: 1234
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });
    const advanceSeed = (seed: number, count: number): number => {
      let state: AuroraDeterministicRngState = {
        algorithm: NWN_EE_VFX_RNG_ALGORITHM,
        seed
      };
      for (let index = 0; index < count; index += 1) {
        state = defaultAuroraDeterministicRngHook.nextFloat(state).state;
      }
      return state.seed;
    };
    const firstExpectedSeed = advanceSeed(1234, 12);
    const secondExpectedSeed = advanceSeed(firstExpectedSeed, 4);
    const [first, second] = response.vfx.runtimeEmitters ?? [];

    expect(first?.runtimeState.rng.algorithm).toBe(NWN_EE_VFX_RNG_ALGORITHM);
    expect(second?.runtimeState.rng.algorithm).toBe(NWN_EE_VFX_RNG_ALGORITHM);
    expect(first?.runtimeState.rng.seed).toBe(firstExpectedSeed);
    expect(second?.runtimeState.rng.seed).toBe(secondExpectedSeed);
  });

  it("continues an arbitrary model slice from the exact shared RNG and emitter state", async () => {
    const service = buildService();
    const sourceEmitter = buildEmitter({
      nodeName: "neutral_fragment_emitter",
      simulation: {
        birthrate: 2,
        lifeExp: 3,
        velocity: 1,
        randvel: 0.5,
        spread: 0.25,
        xSize: 1,
        ySize: 1,
        sizeStart: 1,
        sizeEnd: 1,
        alphaStart: 1,
        alphaEnd: 1
      }
    });
    const commandBase = {
      packageKind: "model_graph_runtime" as const,
      sourceObjectKey: "modules/current/models/neutral_fragment.mdl",
      sourceLayer: "external_fixture" as const,
      sourceEmitters: [sourceEmitter],
      bypassCache: true,
      includeBenchmarkMetadata: false
    };
    const first = await service.processVfxPackage({
      ...commandBase,
      runtime: { dtSeconds: 0.5, tickCount: 1, particleLimit: 16, seed: 9876 }
    });
    const firstEmitter = first.vfx.runtimeEmitters![0]!;
    const continued = await service.processVfxPackage({
      ...commandBase,
      runtime: {
        dtSeconds: 0.5,
        tickCount: 1,
        particleLimit: 16,
        seed: 1,
        initialRngState: first.vfx.runtimeSharedRng!.finalState,
        initialEmitterStates: [
          {
            emitterNodeName: "neutral_fragment_emitter",
            runtimeState: firstEmitter.runtimeState
          }
        ],
        sourceClockOffsetSeconds: 0.5
      }
    });
    const monolithic = await service.processVfxPackage({
      ...commandBase,
      runtime: { dtSeconds: 0.5, tickCount: 2, particleLimit: 16, seed: 9876 }
    });
    const continuedState = continued.vfx.runtimeEmitters![0]!.runtimeState;
    const monolithicState = monolithic.vfx.runtimeEmitters![0]!.runtimeState;

    expect(continued.vfx.runtimeSharedRng).toEqual({
      version: "aurora-vfx-shared-rng-lineage/v1",
      initialState: first.vfx.runtimeSharedRng!.finalState,
      finalState: monolithic.vfx.runtimeSharedRng!.finalState,
      schedulerOrder: "model-instance-insertion-order-then-emitter-source-order"
    });
    expect(continuedState.rng).toEqual(monolithicState.rng);
    expect(continuedState.localClockSeconds).toBe(monolithicState.localClockSeconds);
    expect(continuedState.sourceClockSeconds).toBe(monolithicState.sourceClockSeconds);
    expect(continuedState.activeParticleIds).toEqual(monolithicState.activeParticleIds);
    expect(continuedState.particles).toEqual(monolithicState.particles);
  });

  it("schedules arbitrary live Chunk child models as distinct frames on one RNG stream", async () => {
    const service = buildService();
    const rootEmitter = buildEmitter({
      nodeName: "neutral_root_chunk_lane",
      emitterType: "Fountain",
      emitterTypeRaw: "Fountain",
      renderMode: "Chunk",
      renderModeRaw: "Chunk",
      chunkName: "neutral_fragment",
      simulation: {
        birthrate: 2,
        lifeExp: 2,
        velocity: 0,
        sizeStart: 1,
        sizeEnd: 1,
        alphaStart: 1,
        alphaEnd: 1
      }
    });
    const childEmitter = buildEmitter({
      nodeName: "neutral_child_sparks",
      sourceModelObjectKey: "modules/current/models/neutral_fragment.mdl",
      sourceModelFileName: "neutral_fragment.mdl",
      emitterType: "Fountain",
      emitterTypeRaw: "Fountain",
      simulation: {
        birthrate: 1,
        lifeExp: 1,
        velocity: 1,
        randvel: 0.5,
        spread: 0.2,
        sizeStart: 1,
        sizeEnd: 1,
        alphaStart: 1,
        alphaEnd: 1
      }
    });
    const response = await service.processVfxRuntimeTree({
      rootCommand: {
        packageKind: "model_graph_runtime",
        sourceObjectKey: "modules/current/models/neutral_root.mdl",
        sourceLayer: "external_fixture",
        sourceEmitters: [rootEmitter],
        resourceTraces: [
          {
            requestedResourceClass: "chunk_model",
            requestedRef: "neutral_fragment",
            ownerPath:
              "mdl:neutral_root.mdl/emitter:neutral_root_chunk_lane/chunkName",
            selectedCandidate: {
              sourceLayer: "external_fixture",
              resourceKey: "neutral_fragment.glb",
              resourceHash: "neutral-fragment-hash"
            }
          }
        ],
        runtime: {
          dtSeconds: 0.5,
          tickCount: 2,
          particleLimit: 16,
          seed: 2468
        },
        bypassCache: true,
        includeBenchmarkMetadata: false
      },
      childModels: [
        {
          requestedRef: "neutral_fragment",
          command: {
            packageKind: "model_graph_runtime",
            sourceObjectKey: "modules/current/models/neutral_fragment.mdl",
            sourceLayer: "external_fixture",
            sourceEmitters: [childEmitter]
          },
          animation: {
            animationName: "impact",
            lengthSeconds: 1
          }
        }
      ]
    });
    const frames = response.vfx.runtimeEmitters![0]!.runtimeFrames!;
    const frameParticles = frames.flatMap(
      (frame) => frame.renderContract.chunkLane?.particleInstances ?? []
    );
    const childFrames = frameParticles.flatMap((particle) =>
      particle.modelRuntimeFrame ? [particle.modelRuntimeFrame] : []
    );

    expect(frames).toHaveLength(3);
    expect(childFrames.length).toBeGreaterThanOrEqual(2);
    expect(childFrames.every((frame) => frame?.version ===
      "aurora-vfx-child-model-runtime-frame/v1")).toBe(true);
    expect(
      childFrames.every((frame) =>
        frame.modelInstanceRef ===
        frameParticles.find(
          (particle) => particle.modelInstanceRef === frame.modelInstanceRef
        )?.modelInstanceRef
      )
    ).toBe(true);
    expect(new Set(childFrames.map((frame) =>
      frame.rngLineage.initialSeed)).size).toBeGreaterThan(1);
    expect(
      childFrames.every((frame) =>
        frame.runtimeEmitters.every(
          (emitter) =>
            emitter.renderContractFrame.version ===
              "aurora-vfx-child-render-contract-frame/v1" &&
            !("renderContract" in emitter) &&
            emitter.renderContractFrame.compactDrawRecords.every(
              (record) =>
                !("renderMode" in record) &&
                !("blendMode" in record) &&
                !("renderState" in record)
            )
        )
      )
    ).toBe(true);
    expect(response.vfx.runtimeSharedRng?.schedulerOrder).toBe(
      "model-instance-insertion-order-then-emitter-source-order"
    );
  });

  it("drives one object-duration owner through impact, duration, cessation, and release", async () => {
    const service = buildService();
    const objectDurationOwner = buildAuroraObjectDurationVisualOwnerContract({
      sourceRowId: 1,
      sourceModelResRef: "vdr_darkness",
      effectDurationMilliseconds: 2_000,
      impactMilliseconds: 300,
      durationAnimationMilliseconds: 500,
      cessationMilliseconds: 600
    });

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/vdr_darkness.mdl",
      sourceLayer: "external_fixture",
      sourceEmitter: buildEmitter({
        nodeName: "DARK_Spot",
        emitterType: "Single",
        simulation: {
          birthrate: 1,
          lifeExp: 4,
          velocity: 0,
          sizeStart: 1,
          sizeEnd: 1,
          alphaStart: 1,
          alphaEnd: 1
        },
        animationPasses: [
          {
            animationName: "impact",
            lengthSeconds: 0.3,
            emitterState: { simulation: { birthrate: 1 } }
          },
          {
            animationName: "duration",
            lengthSeconds: 0.5,
            emitterState: { simulation: { birthrate: 1 } }
          },
          {
            animationName: "cessation",
            lengthSeconds: 0.6,
            emitterState: { simulation: { birthrate: 0 } }
          }
        ]
      }),
      runtime: {
        dtSeconds: 0.1,
        tickCount: 26,
        particleLimit: 16,
        seed: 101,
        objectDurationVisualRuntime: {
          contract: objectDurationOwner
        }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    const runtimeEmitter = response.vfx.runtimeEmitters?.[0];
    expect(runtimeEmitter?.runtimeFrames?.[0]).toMatchObject({
      selectedAnimation: {
        animationName: "impact",
        currentTimeSeconds: 0
      },
      objectDurationVisualOwner: {
        phase: "impact",
        active: true
      }
    });
    expect(runtimeEmitter?.runtimeFrames?.[3]).toMatchObject({
      selectedAnimation: {
        animationName: "duration",
        currentTimeSeconds: 0.1,
        loop: true
      },
      objectDurationVisualOwner: {
        phase: "duration",
        active: true
      }
    });
    expect(runtimeEmitter?.runtimeFrames?.[20]).toMatchObject({
      selectedAnimation: {
        animationName: "cessation",
        currentTimeSeconds: 0.1
      },
      objectDurationVisualOwner: {
        phase: "cessation",
        effectRemovalStarted: true
      }
    });
    expect(runtimeEmitter?.runtimeFrames?.[25]).toMatchObject({
      objectDurationVisualOwner: {
        phase: "released",
        active: false
      }
    });
    expect(runtimeEmitter?.runtimeFrames?.[25]?.selectedAnimation).toBeUndefined();
    expect(runtimeEmitter?.objectDurationVisualOwner).toMatchObject({
      phase: "released",
      active: false
    });
  });

  it("expands source emitters into independently phased persistent AOE visual owners", async () => {
    const service = buildService();
    const visualFootprint = buildAuroraAoeVisualFootprintContract({
      sourceRowId: 0,
      sourceLabel: "VFX_PER_TEST",
      shape: { shape: "circle", radius: 5 },
      orientWithGround: false,
      seed: 211,
      schedule: [
        {
          slot: 1,
          modelRef: "vps_test",
          activeCount: 2,
          durationMilliseconds: 400,
          edgeWeight: 0
        }
      ]
    });

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/vps_test.mdl",
      sourceLayer: "external_fixture",
      sourceEmitter: buildEmitter({
        nodeName: "fog",
        simulation: {
          birthrate: 10,
          lifeExp: 1,
          velocity: 0,
          sizeStart: 1,
          sizeEnd: 1,
          alphaStart: 1,
          alphaEnd: 1
        },
        animationPasses: [
          {
            animationName: "impact",
            lengthSeconds: 0.2,
            emitterState: { simulation: { birthrate: 10 } }
          },
          {
            animationName: "duration",
            lengthSeconds: 0.4,
            emitterState: { simulation: { birthrate: 10 } }
          },
          {
            animationName: "cessation",
            lengthSeconds: 0.2,
            emitterState: { simulation: { birthrate: 0 } }
          }
        ]
      }),
      runtime: {
        dtSeconds: 0.1,
        tickCount: 5,
        particleLimit: 64,
        seed: 211,
        aoeVisualRuntime: {
          contract: visualFootprint,
          animationDurations: {
            impactMilliseconds: 200,
            cessationMilliseconds: 200
          }
        }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.vfx.runtimeEmitters).toHaveLength(2);
    expect(response.vfx.runtimeEmitters?.map((entry) => entry.emitterNodeName)).toEqual([
      "fog@aoe:0:slot:1:owner:0",
      "fog@aoe:0:slot:1:owner:1"
    ]);
    expect(response.vfx.runtimeEmitters?.[0]?.aoeVisualOwner).toMatchObject({
      ownerId: "aoe:0:slot:1:owner:0",
      phase: "duration"
    });
    expect(response.vfx.runtimeEmitters?.[1]?.runtimeFrames?.[1]?.aoeVisualOwner).toMatchObject({
      ownerId: "aoe:0:slot:1:owner:1",
      phase: "waiting"
    });
    expect(response.vfx.runtimeEmitters?.[1]?.runtimeFrames?.[4]?.aoeVisualOwner).toMatchObject({
      ownerId: "aoe:0:slot:1:owner:1",
      phase: "impact"
    });
    const firstOwnerPosition =
      response.vfx.runtimeEmitters?.[0]?.aoeVisualOwner?.position;
    expect(firstOwnerPosition).toBeDefined();
    expect(Math.hypot(firstOwnerPosition!.x, firstOwnerPosition!.y)).toBeLessThanOrEqual(5);
  });

  it("propagates AOE stop through cessation to released owners with zero final draws", async () => {
    const service = buildService();
    const visualFootprint = buildAuroraAoeVisualFootprintContract({
      sourceRowId: 0,
      sourceLabel: "VFX_PER_TEST",
      shape: { shape: "circle", radius: 5 },
      orientWithGround: false,
      seed: 212,
      schedule: [
        {
          slot: 1,
          modelRef: "vps_test",
          activeCount: 2,
          durationMilliseconds: 400,
          edgeWeight: 0
        }
      ]
    });

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/vps_test.mdl",
      sourceLayer: "external_fixture",
      sourceEmitter: buildEmitter({
        nodeName: "fog",
        simulation: {
          birthrate: 10,
          lifeExp: 10,
          velocity: 0,
          sizeStart: 1,
          sizeEnd: 1,
          alphaStart: 1,
          alphaEnd: 1
        },
        animationPasses: [
          {
            animationName: "impact",
            lengthSeconds: 0.2,
            emitterState: { simulation: { birthrate: 10 } }
          },
          {
            animationName: "duration",
            lengthSeconds: 0.4,
            emitterState: { simulation: { birthrate: 10 } }
          },
          {
            animationName: "cessation",
            lengthSeconds: 0.2,
            emitterState: { simulation: { birthrate: 0 } }
          }
        ]
      }),
      runtime: {
        dtSeconds: 0.1,
        tickCount: 35,
        particleLimit: 64,
        seed: 212,
        aoeVisualRuntime: {
          contract: visualFootprint,
          animationDurations: {
            impactMilliseconds: 200,
            cessationMilliseconds: 200
          },
          stopAtMilliseconds: 500
        }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    const runtimeEmitters = response.vfx.runtimeEmitters ?? [];
    expect(runtimeEmitters).toHaveLength(2);
    expect(
      runtimeEmitters.every(
        (entry) =>
          entry.aoeVisualOwner?.phase === "released" &&
          entry.aoeVisualOwner.stopRequested === true
      )
    ).toBe(true);
    expect(
      runtimeEmitters.every(
        (entry) => entry.renderContract?.drawParticleCount === 0
      )
    ).toBe(true);
  });

  it("migrates the legacy 64 particle limit to a non-canonical execution budget", async () => {
    const service = buildService();
    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_capacity.mdl",
      sourceLayer: "external_fixture",
      sourceEmitter: buildEmitter({
        simulation: {
          birthrate: 130,
          lifeExp: 5,
          velocity: 0,
          randvel: 0,
          spread: 0,
          sizeStart: 1,
          sizeEnd: 1,
          alphaStart: 1,
          alphaEnd: 1
        }
      }),
      runtime: {
        dtSeconds: 1,
        tickCount: 1,
        particleLimit: 64,
        seed: 211
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    const state = response.vfx.runtimeEmitters?.[0]?.runtimeState;
    expect(state?.activeParticleIds).toHaveLength(130);
    expect(state).toMatchObject({
      executionParticleBudget: 4096,
      particleLimit: 4096,
      activeCapacity: 256
    });
    expect(state?.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_LEGACY_PARTICLE_LIMIT_EXECUTION_BUDGET_ONLY"
        })
      ])
    );
  });

  it("requires cache bypass for in-process runtime services", async () => {
    const service = buildService();

    await expect(
      service.processVfxPackage({
        packageKind: "model_graph_runtime",
        sourceObjectKey: "modules/current/models/fx_collision.mdl",
        sourceLayer: "external_fixture",
        sourceEmitter: buildEmitter(),
        runtime: {
          context: {
            collisionContext: {
              collisionProfileId: "test-collision-context",
              requestedCollisionClasses: ["static"],
              serviceEvidence: "aurora-runtime-service",
              resolve: () => ({ status: "noHit" })
            }
          }
        },
        bypassCache: false,
        includeBenchmarkMetadata: false
      })
    ).rejects.toMatchObject({
      code: "VFX_RUNTIME_CONTEXT_REQUIRES_CACHE_BYPASS"
    } satisfies Partial<AppException>);
  });

  it("passes an in-process collision service into every fixed runtime tick", async () => {
    const service = buildService();
    const resolveCollision = jest.fn().mockReturnValue({ status: "unsupported" });

    await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_collision.mdl",
      sourceLayer: "external_fixture",
      sourceEmitter: buildEmitter({
        simulation: {
          birthrate: 4,
          lifeExp: 1,
          mass: 1,
          velocity: 0,
          bounce: true,
          bounceCoefficient: 1,
          sizeStart: 1,
          sizeEnd: 1,
          alphaStart: 1,
          alphaEnd: 1
        }
      }),
      runtime: {
        dtSeconds: 0.5,
        tickCount: 2,
        particleLimit: 16,
        seed: 1234,
        context: {
          collisionContext: {
            collisionProfileId: "test-collision-context",
            requestedCollisionClasses: ["static"],
            serviceEvidence: "aurora-runtime-service",
            resolve: resolveCollision
          }
        }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(resolveCollision).toHaveBeenCalled();
  });

  it("runs Aurora Fountain scene substeps without increasing output-frame count", async () => {
    const service = buildService();
    const sourceEmitter = buildEmitter({
      simulation: {
        birthrate: 6,
        lifeExp: 2,
        velocity: 0,
        sizeStart: 1,
        sizeEnd: 1,
        alphaStart: 1,
        alphaEnd: 1
      }
    });
    const run = (simulationStepSeconds?: number) =>
      service.processVfxPackage({
        packageKind: "model_graph_runtime",
        sourceObjectKey: "modules/current/models/plc_t04.mdl",
        sourceLayer: "external_fixture",
        sourceEmitter,
        runtime: {
          dtSeconds: 0.25,
          ...(simulationStepSeconds ? { simulationStepSeconds } : {}),
          tickCount: 4,
          particleLimit: 64,
          seed: 211
        },
        bypassCache: true,
        includeBenchmarkMetadata: false
      });

    const [coarse, sceneStepped] = await Promise.all([run(), run(1 / 60)]);
    const coarseEmitter = coarse.vfx.runtimeEmitters?.[0];
    const sceneSteppedEmitter = sceneStepped.vfx.runtimeEmitters?.[0];

    expect(coarseEmitter?.runtimeFrames).toHaveLength(5);
    expect(sceneSteppedEmitter?.runtimeFrames).toHaveLength(5);
    expect(coarseEmitter?.runtimeState.localClockSeconds).toBeCloseTo(1, 10);
    expect(sceneSteppedEmitter?.runtimeState.localClockSeconds).toBeCloseTo(1, 10);
    expect(coarseEmitter?.runtimeState.activeParticleIds).toHaveLength(4);
    expect(sceneSteppedEmitter?.runtimeState.activeParticleIds).toHaveLength(6);
  });

  it("processes and caches VFX runtime packages independently of placeable preview", async () => {
    const service = buildService();

    const first = await service.processVfxPackage({
      packageKind: "runtime_package",
      sourceTableText: SOURCE_TABLE,
      sourceObjectKey: "modules/current/vfx/visualeffects.2da",
      sourceLayer: "external_fixture",
      sourceRowId: 0,
      effectInstance: {
        constructorKind: "EffectVisualEffect",
        sourceRowId: 0,
        applicationMode: "object",
        durationType: "instant",
        targetRef: "target-1"
      },
      sourceEmitter: buildEmitter(),
      runtime: {
        dtSeconds: 0.5,
        particleLimit: 16,
        seed: 1234
      },
      bypassCache: false,
      includeBenchmarkMetadata: false
    });
    const second = await service.processVfxPackage({
      packageKind: "runtime_package",
      sourceTableText: SOURCE_TABLE,
      sourceObjectKey: "modules/current/vfx/visualeffects.2da",
      sourceLayer: "external_fixture",
      sourceRowId: 0,
      effectInstance: {
        constructorKind: "EffectVisualEffect",
        sourceRowId: 0,
        applicationMode: "object",
        durationType: "instant",
        targetRef: "target-1"
      },
      sourceEmitter: buildEmitter(),
      runtime: {
        dtSeconds: 0.5,
        particleLimit: 16,
        seed: 1234
      },
      bypassCache: false,
      includeBenchmarkMetadata: false
    });
    const cached = await service.getProcessedVfx(first.cache.key);

    expect(first.cache.hit).toBe(false);
    expect(second.cache.hit).toBe(true);
    expect(cached.cache.hit).toBe(true);
    expect(first.vfx.observability.runtimePackageStatus).toBe("runtime_ready");
    expect(first.vfx.observability.renderContractStatus).toBe("ready");
    expect(first.vfx.renderContract?.drawVertexCount).toBe(
      (first.vfx.renderContract?.drawParticleCount ?? 0) * 6
    );
    expect(first.vfx.dependencyGraph.edges.some((edge) => edge.edgeType === "texture")).toBe(true);
    expect(first.vfx.dependencyGraph.edges.some((edge) => edge.resolveStatus === "unresolved")).toBe(true);
  });

  it("keeps bypassed runtime slices out of the shared processing cache", async () => {
    const service = buildService();
    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/arbitrary_transient_slice.mdl",
      sourceLayer: "external_fixture",
      sourceEmitter: buildEmitter({ nodeName: "arbitrary_transient_emitter" }),
      runtime: {
        dtSeconds: 0.25,
        tickCount: 1,
        particleLimit: 16,
        seed: 9090
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.cache.hit).toBe(false);
    await expect(service.getProcessedVfx(response.cache.key)).rejects.toMatchObject({
      code: "VFX_CACHE_NOT_FOUND"
    } satisfies Partial<AppException>);
  });

  it("processes source-MDL graph runtime packages without inventing a visualeffects table", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/plc_t04.mdl",
      sourceLayer: "external_fixture",
      sourceHash: "mdl-source-hash",
      sourceCandidates: [
        {
          candidateId: "source-mdl:plc_t04",
          layer: "external_fixture",
          resourceKind: "resource",
          resourceKey: "plc_t04.mdl",
          sourcePath: "modules/current/models/plc_t04.mdl",
          sourceHash: "mdl-source-hash",
          resourceHash: "mdl-source-hash"
        }
      ],
      sourceEmitters: [buildEmitter()],
      runtime: {
        dtSeconds: 0.5,
        particleLimit: 16,
        seed: 1234
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.vfx.packageKind).toBe("model_graph_runtime");
    expect(response.vfx.sourceRows).toEqual([]);
    expect(response.vfx.selectedSourceRow).toBeUndefined();
    expect(response.vfx.observability.runtimePackageStatus).toBe("runtime_ready");
    expect(response.vfx.sourcePolicyTrace.selectedSource).toMatchObject({
      resourceKind: "resource",
      resourceKey: "plc_t04.mdl",
      resourceHash: "mdl-source-hash"
    });
  });

  it("binds explicit Aurora MTR state to the matching emitter render contract", async () => {
    const service = buildService();
    const emitter = buildEmitter({ nodeName: "emit_material", texture: "fx_material" });

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_material.mdl",
      sourceLayer: "external_fixture",
      sourceEmitters: [emitter],
      sourceEmitterMaterials: [
        {
          emitterIndex: 0,
          emitterNodeName: "emit_material",
          materialState: {
            source: "aurora-mtr",
            materialRef: "fx_material.mtr",
            renderHint: "NormalTangents",
            customShaderVS: "fx_material_vs",
            customShaderFS: "fx_material_fs",
            customShaderGS: "fx_material_gs",
            customShaderProgram: {
              version: "aurora-shader-program-source/v1",
              status: "complete",
              stageRoots: {
                vertex: "fx_material_vs",
                fragment: "fx_material_fs",
                geometry: "fx_material_gs"
              },
              sources: [
                { resref: "fx_material_vs", source: "void main() {}", includeRefs: [] },
                { resref: "fx_material_fs", source: "void main() {}", includeRefs: [] },
                { resref: "fx_material_gs", source: "void main() {}", includeRefs: [] }
              ],
              unresolvedRefs: []
            },
            parameters: [
              { name: "Metallicness", kind: "float", values: [0.001], arity: 1 },
              {
                name: "CustomTint",
                kind: "float",
                values: [1, 0.5, 0.25, 1],
                arity: 4
              },
              { name: "CustomMode", kind: "int", values: [2], arity: 1 }
            ],
            transparency: false,
            twoSided: true,
            sampleFramebuffer: 2,
            volumetric: true
          }
        }
      ],
      runtime: { dtSeconds: 0.25, tickCount: 1, particleLimit: 16, seed: 1234 },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    const renderContract = response.vfx.runtimeEmitters?.[0]?.renderContract;
    expect(renderContract?.materialState).toEqual({
      source: "aurora-mtr",
      materialRef: "fx_material.mtr",
      renderHint: "NormalTangents",
      customShaderVS: "fx_material_vs",
      customShaderFS: "fx_material_fs",
      customShaderGS: "fx_material_gs",
      customShaderProgram: {
        version: "aurora-shader-program-source/v1",
        status: "complete",
        stageRoots: {
          vertex: "fx_material_vs",
          fragment: "fx_material_fs",
          geometry: "fx_material_gs"
        },
        sources: [
          { resref: "fx_material_fs", source: "void main() {}", includeRefs: [] },
          { resref: "fx_material_gs", source: "void main() {}", includeRefs: [] },
          { resref: "fx_material_vs", source: "void main() {}", includeRefs: [] }
        ],
        unresolvedRefs: []
      },
      parameters: [
        { name: "Metallicness", kind: "float", values: [0.001], arity: 1 },
        {
          name: "CustomTint",
          kind: "float",
          values: [1, 0.5, 0.25, 1],
          arity: 4
        },
        { name: "CustomMode", kind: "int", values: [2], arity: 1 }
      ],
      transparency: false,
      twoSided: true,
      sampleFramebuffer: 2,
      volumetric: true
    });
    expect(renderContract?.renderState).toMatchObject({
      depthWriteLane: "source_transparency_false_depth_write_enabled",
      twoSidedMaterialLane: {
        lane: "two_sided_material_volumetric_runtime_arg0"
      },
      framebufferLane: {
        runtimeLane: 6,
        lane: "sample_framebuffer_mode_2_runtime_lane_6"
      }
    });
    expect(renderContract?.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_MTR_MATERIAL_STATE_BOUND"
    );
    expect(renderContract?.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_MTR_CUSTOM_SHADER_PROGRAM_EXECUTION_REQUIRED"
    );
    expect(renderContract?.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_MTR_CUSTOM_SHADER_SOURCE_GRAPH_READY"
    );
    expect(renderContract?.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "VFX_MTR_PARAMETER_PAYLOAD_PRESERVED"
    );
    expect(
      response.vfx.runtimeEmitters?.[0]?.runtimeFrames?.every(
        (frame) => frame.renderContract.materialState?.materialRef === "fx_material.mtr"
      )
    ).toBe(true);
  });

  it("samples base emitter transform timelines at the runtime snapshot time", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_timeline.mdl",
      sourceLayer: "external_fixture",
      sourceEmitters: [
        buildEmitter({
          transform: {
            position: [0, 0, 0],
            positionTimeline: [
              { time: 0, value: [0, 0, 0] },
              { time: 1, value: [10, 0, 0] }
            ]
          }
        })
      ],
      runtime: {
        dtSeconds: 0.5,
        particleLimit: 16,
        seed: 1234
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.source.transform?.position).toEqual([
      5,
      0,
      0
    ]);
    expect(response.vfx.runtimeEmitters?.[0]?.renderContract.drawRecords[0]?.position.x).toBe(5);
  });

  it("runs repeated fixed runtime ticks without resetting particle state or RNG", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_repeated.mdl",
      sourceLayer: "external_fixture",
      sourceHash: "repeated-source-hash",
      sourceEmitters: [
        buildEmitter({
          nodeName: "emit_repeated",
          simulation: {
            birthrate: 4,
            lifeExp: 2,
            velocity: 0,
            randvel: 0,
            spread: 0,
            sizeStart: 1,
            sizeEnd: 1,
            alphaStart: 1,
            alphaEnd: 1
          }
        })
      ],
      runtime: {
        dtSeconds: 0.25,
        tickCount: 3,
        particleLimit: 16,
        seed: 1234
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    const runtimeState = response.vfx.runtimeEmitters?.[0]?.runtimeState;
    expect(runtimeState?.localClockSeconds).toBe(0.75);
    expect(runtimeState?.sourceClockSeconds).toBe(0.75);
    expect(runtimeState?.activeParticleIds).toEqual([1, 2, 3]);
    expect(runtimeState?.particles.map((particle) => particle.ageSeconds)).toEqual([0.5, 0.25, 0]);
    expect(runtimeState?.membershipLog).toHaveLength(3);
    expect(response.vfx.runtimeEmitters?.[0]?.runtimeFrames?.map((frame) => ({
      tickIndex: frame.tickIndex,
      timeSeconds: frame.timeSeconds,
      activeCount: frame.runtimeSnapshot.activeParticles.length,
      drawCount: frame.renderContract.drawRecords.length
    }))).toEqual([
      { tickIndex: 0, timeSeconds: 0, activeCount: 0, drawCount: 0 },
      { tickIndex: 1, timeSeconds: 0.25, activeCount: 1, drawCount: 1 },
      { tickIndex: 2, timeSeconds: 0.5, activeCount: 2, drawCount: 2 },
      { tickIndex: 3, timeSeconds: 0.75, activeCount: 3, drawCount: 3 }
    ]);
  });

  it("feeds sampled emitter motion into Aurora inheritVel before the shared runtime snapshot", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_inheritvel.mdl",
      sourceLayer: "external_fixture",
      sourceEmitters: [
        buildEmitter({
          transform: {
            position: [0, 0, 0],
            positionTimeline: [
              { time: 0, value: [0, 0, 0] },
              { time: 1, value: [10, 0, 0] }
            ]
          },
          simulation: {
            birthrate: 2,
            lifeExp: 1,
            velocity: 0,
            randvel: 0,
            spread: 0,
            inheritVel: true,
            sizeStart: 1,
            sizeEnd: 1,
            alphaStart: 1,
            alphaEnd: 1
          }
        })
      ],
      runtime: {
        dtSeconds: 0.5,
        particleLimit: 16,
        seed: 1234
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.particles[0]).toMatchObject({
      position: { x: 5, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      inheritedVelocityMagnitude: 10,
      inheritedVelocityDirection: { x: 1, y: 0, z: 0 }
    });
  });

  it("resolves inherit_local parent motion from the transported source model graph", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_inheritlocal.mdl",
      sourceLayer: "external_fixture",
      sourceEmitters: [
        buildEmitter({
          parentNodeName: "moving_pivot",
          simulation: {
            birthrate: 2,
            lifeExp: 1,
            velocity: 0,
            inheritLocal: true,
            inheritPart: true
          }
        })
      ],
      sourceModelGraph: {
        nodes: [
          {
            nodeName: "moving_pivot",
            transform: {
              position: [0, 0, 0],
              positionTimeline: [
                { time: 0, value: [0, 0, 0] },
                { time: 1, value: [6, 0, 0] }
              ]
            }
          }
        ]
      },
      runtime: {
        dtSeconds: 0.5,
        particleLimit: 16,
        seed: 1234
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(
      response.vfx.runtimeEmitters?.[0]?.runtimeState.lastTickDiagnostics.map(
        (entry) => entry.code
      )
    ).not.toContain("VFX_EMITTER_INHERIT_LOCAL_PARENT_FRAME_REQUIRED");
    expect(
      response.vfx.runtimeEmitters?.[0]?.runtimeState.lastTickDiagnostics.map(
        (entry) => entry.code
      )
    ).not.toContain("VFX_EMITTER_INHERIT_PART_PARENT_FRAME_REQUIRED");
  });

  it("materializes child-emitter particles from the composed model-graph world frame", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_child_world_frame.mdl",
      sourceLayer: "external_fixture",
      sourceEmitters: [
        buildEmitter({
          nodeName: "child_emitter",
          parentNodeName: "scaled_rotating_parent",
          transform: {
            position: [1, 0, 0],
            orientation: { axis: [1, 0, 0], angleRadians: Math.PI / 2 },
            scale: 0.5
          },
          simulation: {
            birthrate: 2,
            lifeExp: 2,
            velocity: 0,
            randvel: 0,
            spread: 0,
            sizeStart: 1,
            sizeEnd: 1,
            alphaStart: 1,
            alphaEnd: 1
          }
        })
      ],
      sourceModelGraph: {
        nodes: [
          {
            nodeName: "scaled_rotating_parent",
            transform: {
              position: [5, 0, 0],
              orientation: { axis: [0, 0, 1], angleRadians: Math.PI / 2 },
              scale: 2
            }
          }
        ]
      },
      runtime: {
        dtSeconds: 0.5,
        tickCount: 1,
        particleLimit: 16,
        seed: 1234
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    const runtimeState = response.vfx.runtimeEmitters?.[0]?.runtimeState;
    expect(runtimeState?.source.transform?.position?.[0]).toBeCloseTo(5, 6);
    expect(runtimeState?.source.transform?.position?.[1]).toBeCloseTo(2, 6);
    expect(runtimeState?.source.transform?.position?.[2]).toBeCloseTo(0, 6);
    expect(runtimeState?.source.transform?.scale).toBeCloseTo(1, 6);
    expect(runtimeState?.particles[0]?.position.x).toBeCloseTo(5, 6);
    expect(runtimeState?.particles[0]?.position.y).toBeCloseTo(2, 6);
    expect(runtimeState?.particles[0]?.position.z).toBeCloseTo(0, 6);
  });

  it("moves future child-emitter births with the parent without moving prior particles when inheritance is disabled", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_moving_child_births.mdl",
      sourceLayer: "external_fixture",
      sourceEmitters: [
        buildEmitter({
          nodeName: "trail_emitter",
          parentNodeName: "moving_parent",
          transform: { position: [1, 0, 0] },
          simulation: {
            birthrate: 2,
            lifeExp: 2,
            velocity: 0,
            randvel: 0,
            spread: 0,
            sizeStart: 1,
            sizeEnd: 1,
            alphaStart: 1,
            alphaEnd: 1
          }
        })
      ],
      sourceModelGraph: {
        nodes: [
          {
            nodeName: "moving_parent",
            transform: {
              position: [0, 0, 0],
              positionTimeline: [
                { time: 0, value: [0, 0, 0] },
                { time: 0.5, value: [5, 0, 0] },
                { time: 0.75, value: [10, 0, 0] }
              ]
            }
          }
        ]
      },
      runtime: {
        dtSeconds: 0.5,
        tickCount: 2,
        particleLimit: 16,
        seed: 1234
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    const runtimeState = response.vfx.runtimeEmitters?.[0]?.runtimeState;
    expect(runtimeState?.particles.map((particle) => particle.position.x)).toEqual([6, 11]);
    expect(runtimeState?.source.transform?.position).toEqual([11, 0, 0]);
  });

  it("holds the final source-transform keys after a finite timeline ends", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_finite_transform_timeline.mdl",
      sourceLayer: "external_fixture",
      sourceEmitters: [
        buildEmitter({
          nodeName: "finite_timeline_emitter",
          transform: {
            position: [100, 0, 0],
            positionTimeline: [
              { time: 0, value: [0, 0, 0] },
              { time: 0.5, value: [4, 0, 0] }
            ],
            orientation: { axis: [0, 0, 1], angleRadians: 0 },
            orientationTimeline: [
              {
                time: 0,
                value: { axis: [0, 0, 1], angleRadians: 0 }
              },
              {
                time: 0.5,
                value: { axis: [0, 0, 1], angleRadians: Math.PI }
              }
            ],
            scale: 100,
            scaleTimeline: [
              { time: 0, value: 1 },
              { time: 0.5, value: 2 }
            ]
          }
        })
      ],
      runtime: {
        dtSeconds: 1,
        tickCount: 1,
        particleLimit: 16,
        seed: 1234
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    const transform = response.vfx.runtimeEmitters?.[0]?.runtimeState.source.transform;
    expect(transform?.position).toEqual([4, 0, 0]);
    expect(transform?.orientation?.axis[2]).toBeCloseTo(1, 6);
    expect(transform?.orientation?.angleRadians).toBeCloseTo(Math.PI, 6);
    expect(transform?.scale).toBe(2);
  });

  it("reprojects inherited child-emitter particles through an animated parent world frame", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_inherited_child_rotation.mdl",
      sourceLayer: "external_fixture",
      sourceEmitters: [
        buildEmitter({
          nodeName: "orbiting_emitter",
          parentNodeName: "rotating_parent",
          transform: { position: [2, 0, 0] },
          simulation: {
            birthrate: 2,
            lifeExp: 2,
            velocity: 0,
            randvel: 0,
            spread: 0,
            inherit: true,
            sizeStart: 1,
            sizeEnd: 1,
            alphaStart: 1,
            alphaEnd: 1
          }
        })
      ],
      sourceModelGraph: {
        nodes: [
          {
            nodeName: "rotating_parent",
            transform: {
              orientation: { axis: [0, 0, 1], angleRadians: 0 },
              orientationTimeline: [
                {
                  time: 0,
                  value: { axis: [0, 0, 1], angleRadians: 0 }
                },
                {
                  time: 1,
                  value: { axis: [0, 0, 1], angleRadians: Math.PI }
                }
              ]
            }
          }
        ]
      },
      runtime: {
        dtSeconds: 0.5,
        tickCount: 2,
        particleLimit: 16,
        seed: 1234
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    const positions = response.vfx.runtimeEmitters?.[0]?.runtimeState.particles.map(
      (particle) => particle.position
    );
    expect(positions).toHaveLength(2);
    positions?.forEach((position) => {
      expect(position.x).toBeCloseTo(-2, 5);
      expect(position.y).toBeCloseTo(0, 5);
      expect(position.z).toBeCloseTo(0, 5);
    });
  });

  it("evaluates Aurora Bezier tangent rows before the shared runtime tick", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_bezier_timeline.mdl",
      sourceLayer: "external_fixture",
      sourceEmitters: [
        buildEmitter({
          transform: {
            position: [0, 0, 0],
            positionTimeline: [
              {
                time: 0,
                value: [0, 0, 0],
                interpolation: "bezier",
                bezierIncomingTangent: [0, 0, 0],
                bezierOutgoingTangent: [8, 0, 0]
              },
              {
                time: 1,
                value: [10, 0, 0],
                interpolation: "bezier",
                bezierIncomingTangent: [0, 0, 0],
                bezierOutgoingTangent: [0, 0, 0]
              }
            ]
          }
        })
      ],
      runtime: {
        dtSeconds: 0.5,
        particleLimit: 16,
        seed: 1234
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.source.transform?.position).toEqual([
      8,
      0,
      0
    ]);
  });

  it("threads one direct source-MDL Lightning reference through the shared runtime", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/plc_lightning.mdl",
      sourceLayer: "external_fixture",
      sourceHash: "lightning-source-hash",
      sourceEmitters: [
        buildEmitter({
          nodeName: "emit_lightning",
          emitterType: "Lightning",
          emitterTypeRaw: "Lightning",
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
          ],
          simulation: {
            birthrate: 2,
            lifeExp: 1,
            velocity: 0,
            sizeStart: 1,
            sizeEnd: 1,
            alphaStart: 1,
            alphaEnd: 1
          }
        })
      ],
      sourceModelGraph: {
        nodes: [
          {
            nodeName: "target_ref",
            parentNodeName: "emit_lightning",
            transform: { position: [1, 0, 4] },
            animationTracks: [
              {
                animationName: "pulse",
                transform: {
                  positionTimeline: [
                    { time: 0, value: [1, 0, 4] },
                    { time: 1, value: [3, 0, 4] }
                  ]
                }
              }
            ]
          }
        ]
      },
      runtime: {
        dtSeconds: 0.5,
        particleLimit: 16,
        seed: 1234,
        animation: {
          animationName: "pulse",
          previousTimeSeconds: 0,
          currentTimeSeconds: 0.5,
          blendWeight: 1
        }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.activeParticleIds).toHaveLength(2);
    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.particles[1]?.position.x).toBeCloseTo(1, 10);
    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.particles[1]?.position.y).toBeCloseTo(6, 10);
    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.particles[1]?.position.z).toBeCloseTo(11, 10);
    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.lastTickDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "VFX_LIGHTNING_SOURCE_REFERENCE_CONTEXT_CONSUMED" })
      ])
    );
  });

  it("samples source-reference orientation for sequential P2P Bezier control points", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/plc_p2p_bezier.mdl",
      sourceLayer: "external_fixture",
      sourceHash: "p2p-bezier-source-hash",
      sourceEmitters: [
        buildEmitter({
          nodeName: "emit_p2p",
          emitterType: "P2P",
          emitterTypeRaw: "P2P",
          transform: { position: [0, 0, 0] },
          referenceNodes: [
            {
              nodeKind: "reference",
              nodeName: "target_ref",
              parentNodeName: "emit_p2p",
              provenance: { sourceFormat: "aurora-mdl-ascii" },
              transform: {
                position: [4, 0, 0],
                orientation: { axis: [0, 1, 0], angleRadians: Math.PI / 2 }
              }
            }
          ],
          simulation: {
            p2p: true,
            p2pType: "bezier",
            p2pBezier2: 1,
            p2pBezier3: -1,
            combineTime: 0,
            birthrate: 4,
            lifeExp: 2,
            velocity: 0,
            randvel: 0,
            spread: 0,
            mass: 0,
            sizeStart: 1,
            sizeEnd: 1,
            alphaStart: 1,
            alphaEnd: 1
          }
        })
      ],
      sourceModelGraph: {
        nodes: [
          {
            nodeName: "target_ref",
            parentNodeName: "emit_p2p",
            transform: {
              position: [4, 0, 0],
              orientation: { axis: [0, 1, 0], angleRadians: Math.PI / 2 }
            }
          }
        ]
      },
      runtime: {
        dtSeconds: 0.25,
        tickCount: 2,
        particleLimit: 16,
        seed: 1234
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    const firstParticle = response.vfx.runtimeEmitters?.[0]?.runtimeState.particles[0];
    expect(firstParticle?.position.x).toBeCloseTo(0.130859375, 10);
    expect(firstParticle?.position.y).toBeCloseTo(0, 10);
    expect(firstParticle?.position.z).toBeCloseTo(0.287109375, 10);
    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.lastTickDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "VFX_P2P_BEZIER_TARGET_PATH_CONSUMED" }),
        expect.objectContaining({ code: "VFX_P2P_SOURCE_REFERENCE_CONTEXT_CONSUMED" })
      ])
    );
  });

  it("adapts an explicit Aurora wind-manager snapshot into sequential P2P ticks", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/plc_p2p_wind.mdl",
      sourceLayer: "external_fixture",
      sourceHash: "p2p-wind-source-hash",
      sourceEmitters: [
        buildEmitter({
          nodeName: "emit_p2p_wind",
          emitterType: "P2P",
          emitterTypeRaw: "P2P",
          transform: { position: [0, 0, 0] },
          referenceNodes: [
            {
              nodeKind: "reference",
              nodeName: "target_ref",
              parentNodeName: "emit_p2p_wind",
              provenance: { sourceFormat: "aurora-mdl-ascii" },
              transform: { position: [10, 0, 0] }
            }
          ],
          simulation: {
            p2p: true,
            affectedByWind: true,
            birthrate: 4,
            lifeExp: 2,
            velocity: 0,
            randvel: 0,
            spread: 0,
            drag: 1,
            grav: 0,
            threshold: 0.1,
            mass: 0,
            sizeStart: 1,
            sizeEnd: 1,
            alphaStart: 1,
            alphaEnd: 1
          }
        })
      ],
      runtime: {
        dtSeconds: 0.25,
        tickCount: 2,
        particleLimit: 16,
        seed: 1234,
        windManager: {
          profileId: "area-wind:test",
          globalWindVector: { x: 0, y: 2, z: 0 },
          noiseGridPrevious16x16: Array(256).fill(1),
          noiseGridCurrent16x16: Array(256).fill(1)
        }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.particles[0]?.position).toEqual({
      x: 0,
      y: 0.5,
      z: 0
    });
    expect(
      response.vfx.runtimeEmitters?.[0]?.runtimeState.lastTickDiagnostics.map((entry) => entry.code)
    ).not.toContain("VFX_AURORA_WIND_CONTEXT_REQUIRED");
  });

  it("shares an Explosion blast point source with later emitters and fixed ticks", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_shared_wind.mdl",
      sourceLayer: "external_fixture",
      sourceHash: "shared-wind-source-hash",
      sourceEmitters: [
        buildEmitter({
          nodeName: "emit_explosion",
          emitterType: "Explosion",
          emitterTypeRaw: "Explosion",
          transform: { position: [0, 0, 0] },
          simulation: {
            birthrate: 1,
            lifeExp: 2,
            detonate: 1,
            blastRadius: 10,
            blastLength: 2,
            velocity: 0,
            sizeStart: 1,
            sizeEnd: 1,
            alphaStart: 1,
            alphaEnd: 1
          }
        }),
        buildEmitter({
          nodeName: "emit_p2p_wind",
          emitterType: "P2P",
          emitterTypeRaw: "P2P",
          transform: { position: [1, 0, 0] },
          referenceNodes: [
            {
              nodeKind: "reference",
              nodeName: "target_ref",
              parentNodeName: "emit_p2p_wind",
              provenance: { sourceFormat: "aurora-mdl-ascii" },
              transform: { position: [10, 0, 0] }
            }
          ],
          simulation: {
            p2p: true,
            affectedByWind: true,
            birthrate: 4,
            lifeExp: 2,
            velocity: 0,
            randvel: 0,
            spread: 0,
            drag: 1,
            grav: 0,
            threshold: 0.1,
            mass: 0,
            sizeStart: 1,
            sizeEnd: 1,
            alphaStart: 1,
            alphaEnd: 1
          }
        })
      ],
      runtime: {
        dtSeconds: 0.25,
        tickCount: 2,
        particleLimit: 16,
        seed: 1234,
        windManager: {
          profileId: "area-wind:test",
          globalWindVector: { x: 0, y: 0, z: 0 },
          noiseGridPrevious16x16: Array(256).fill(1),
          noiseGridCurrent16x16: Array(256).fill(1)
        }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.lastTickDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "VFX_EXPLOSION_DETONATE_EVENT_ALREADY_PROCESSED" })
      ])
    );
    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "VFX_EXPLOSION_WIND_POINT_SOURCE_REGISTERED" })
      ])
    );
    expect(response.vfx.runtimeEmitters?.[1]?.runtimeState.particles[0]?.position.x).toBe(
      Math.fround(1.9)
    );
    expect(response.vfx.windManagerSnapshot?.pointSources).toEqual([
      expect.objectContaining({
        position: { x: 0, y: 0, z: 0 },
        radius: 10,
        durationSeconds: 2,
        timeRemainingSeconds: 1.75,
        intensity: 1,
        sourceEmitterNodeName: "emit_explosion"
      })
    ]);
    expect(response.vfx.windManagerSnapshot?.samples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          emitterNodeName: "emit_p2p_wind",
          particleId: 1,
          pointSourceContribution: { x: 0.9, y: 0, z: 0 }
        })
      ])
    );
  });

  it("scans selected source animation detonate events before the Explosion runtime update", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_explosion.mdl",
      sourceLayer: "external_fixture",
      sourceHash: "explosion-source-hash",
      sourceEmitters: [
        buildEmitter({
          emitterType: "Explosion",
          emitterTypeRaw: "Explosion",
          events: [
            { time: 0.25, type: "detonate", animationName: "impact" },
            { time: 0.25, type: "detonate", animationName: "impact" },
            { time: 0.25, type: "detonate", animationName: "cessation" }
          ]
        })
      ],
      runtime: {
        dtSeconds: 0.5,
        particleLimit: 16,
        seed: 1234,
        animation: {
          animationName: "impact",
          previousTimeSeconds: 0.1,
          currentTimeSeconds: 0.3
        }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.activeParticleIds).toHaveLength(4);
    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.processedDetonateEventKeys).toEqual([
      "0.250000:impact"
    ]);
    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.detonateCallbackTrace).toHaveLength(2);
    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.detonateCallbackTrace).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventKey: "0.250000:impact", callbackIndex: 0 }),
        expect.objectContaining({ eventKey: "0.250000:impact", callbackIndex: 1 })
      ])
    );
    expect(response.vfx.runtimeEmitters?.[0]?.tickTraces).toHaveLength(1);
    expect(response.vfx.runtimeEmitters?.[0]?.tickTraces?.[0]).toMatchObject({
      version: "aurora-vfx-tick-trace/v1",
      tickIndex: 1,
      stageOrder: [
        "source_snapshot",
        "animation_evaluation",
        "event_scan",
        "event_callbacks",
        "family_update",
        "post_update_state",
        "render_input"
      ],
      animationEvaluation: {
        passApplied: false,
        animationName: "impact",
        previousTimeSeconds: 0.1,
        currentTimeSeconds: 0.3,
        blendWeight: 1,
        blendEquation: "evaluated*weight+existing*(1-weight)"
      },
      eventScan: {
        animationName: "impact",
        eventRowsFired: [
          { timeSeconds: 0.25, animationName: "impact", scope: "emitter-local" },
          { timeSeconds: 0.25, animationName: "impact", scope: "emitter-local" }
        ]
      },
      familyUpdate: {
        family: "Explosion",
        activeParticleIdsBefore: [],
        activeParticleIdsAfter: [1, 2, 3, 4]
      },
      postUpdateState: {
        activeParticleIds: [1, 2, 3, 4]
      },
      renderInput: {
        activeParticleIds: [1, 2, 3, 4]
      }
    });
    expect(response.vfx.runtimeEmitters?.[0]?.tickTraces?.[0]?.eventCallbacks).toHaveLength(2);
    expect(response.vfx.runtimeEmitters?.[0]?.runtimeFrames?.[1]?.tickTrace).toBe(
      response.vfx.runtimeEmitters?.[0]?.tickTraces?.[0]
    );
    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.lastTickDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "VFX_EXPLOSION_DETONATE_EVENT_CONSUMED" })
      ])
    );
  });

  it("keeps animation-header detonate events model-scoped and dispatches them only to Explosion emitters", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_model_events.mdl",
      sourceLayer: "external_fixture",
      sourceHash: "model-event-source-hash",
      sourceEmitters: [
        buildEmitter({
          nodeName: "emit_explosion_a",
          emitterType: "Explosion",
          emitterTypeRaw: "Explosion",
          animationPasses: [{ animationName: "impact", lengthSeconds: 1 }]
        }),
        buildEmitter({
          nodeName: "emit_fountain",
          emitterType: "Fountain",
          emitterTypeRaw: "Fountain",
          animationPasses: [{ animationName: "impact", lengthSeconds: 1 }]
        }),
        buildEmitter({
          nodeName: "emit_explosion_b",
          emitterType: "Explosion",
          emitterTypeRaw: "Explosion",
          animationPasses: [{ animationName: "impact", lengthSeconds: 1 }]
        })
      ],
      sourceAnimationEvents: [
        { time: 0.25, type: "detonate", animationName: "impact" },
        { time: 0.25, type: "detonate", animationName: "impact" }
      ],
      runtime: {
        dtSeconds: 0.5,
        particleLimit: 16,
        seed: 1234,
        animation: {
          animationName: "impact",
          previousTimeSeconds: 0.1,
          currentTimeSeconds: 0.3
        }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    const [firstExplosion, fountain, secondExplosion] = response.vfx.runtimeEmitters ?? [];
    expect(firstExplosion?.runtimeState.detonateCallbackTrace).toHaveLength(2);
    expect(secondExplosion?.runtimeState.detonateCallbackTrace).toHaveLength(2);
    expect(fountain?.runtimeState.detonateCallbackTrace).toEqual([]);
    expect(firstExplosion?.tickTraces?.[0]?.eventScan.eventRowsFired).toEqual([
      { timeSeconds: 0.25, animationName: "impact", scope: "model-animation-header" },
      { timeSeconds: 0.25, animationName: "impact", scope: "model-animation-header" }
    ]);
    expect(fountain?.tickTraces?.[0]?.eventScan.eventRowsFired).toEqual([]);
  });

  it("dispatches duplicate model-header detonate events at the animation origin on the first playback interval", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_model_origin_events.mdl",
      sourceLayer: "external_fixture",
      sourceHash: "model-origin-event-source-hash",
      sourceEmitters: [
        buildEmitter({
          nodeName: "emit_explosion_a",
          emitterType: "Explosion",
          emitterTypeRaw: "Explosion",
          animationPasses: [{ animationName: "impact", lengthSeconds: 1 }]
        }),
        buildEmitter({
          nodeName: "emit_fountain",
          emitterType: "Fountain",
          emitterTypeRaw: "Fountain",
          animationPasses: [{ animationName: "impact", lengthSeconds: 1 }]
        }),
        buildEmitter({
          nodeName: "emit_explosion_b",
          emitterType: "Explosion",
          emitterTypeRaw: "Explosion",
          animationPasses: [{ animationName: "impact", lengthSeconds: 1 }]
        })
      ],
      sourceAnimationEvents: [
        { time: 0, type: "detonate", animationName: "impact" },
        { time: 0, type: "detonate", animationName: "impact" }
      ],
      runtime: {
        dtSeconds: 0.125,
        tickCount: 2,
        particleLimit: 16,
        seed: 1234,
        animation: {
          animationName: "impact",
          previousTimeSeconds: 0,
          currentTimeSeconds: 0.25,
          playbackTickCount: 2
        }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    const [firstExplosion, fountain, secondExplosion] = response.vfx.runtimeEmitters ?? [];
    for (const explosion of [firstExplosion, secondExplosion]) {
      expect(explosion?.runtimeState.activeParticleIds).toHaveLength(4);
      expect(explosion?.runtimeState.processedDetonateEventKeys).toEqual([
        "0.000000:impact"
      ]);
      expect(explosion?.runtimeState.detonateCallbackTrace).toHaveLength(2);
      expect(explosion?.tickTraces?.[0]?.eventScan.eventRowsFired).toEqual([
        { timeSeconds: 0, animationName: "impact", scope: "model-animation-header" },
        { timeSeconds: 0, animationName: "impact", scope: "model-animation-header" }
      ]);
      expect(explosion?.tickTraces?.[1]?.eventScan.eventRowsFired).toEqual([]);
    }
    expect(fountain?.runtimeState.detonateCallbackTrace).toEqual([]);
    expect(fountain?.tickTraces?.every((trace) => trace.eventScan.eventRowsFired.length === 0)).toBe(
      true
    );
  });

  it("scans a selected source animation across its recovered length without inventing a cycle", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_explosion_wrap.mdl",
      sourceLayer: "external_fixture",
      sourceHash: "explosion-wrap-source-hash",
      sourceEmitters: [
        buildEmitter({
          emitterType: "Explosion",
          emitterTypeRaw: "Explosion",
          events: [
            { time: 0.9, type: "detonate", animationName: "impact" },
            { time: 0.1, type: "detonate", animationName: "impact" }
          ],
          animationPasses: [{ animationName: "impact", lengthSeconds: 1 }]
        })
      ],
      runtime: {
        dtSeconds: 0.5,
        particleLimit: 16,
        seed: 1234,
        animation: {
          animationName: "impact",
          previousTimeSeconds: 0.8,
          currentTimeSeconds: 0.2
        }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.processedDetonateEventKeys).toEqual([
      "0.900000:impact",
      "0.100000:impact"
    ]);
    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.activeParticleIds).toHaveLength(4);
  });

  it("applies a selected direct-only emitter animation pass before the shared runtime tick", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_fountain_anim.mdl",
      sourceLayer: "external_fixture",
      sourceHash: "fountain-animation-source-hash",
      sourceEmitters: [
        buildEmitter({
          simulation: {
            birthrate: 4,
            lifeExp: 2,
            velocity: 0,
            sizeStart: 1,
            sizeEnd: 1,
            alphaStart: 1,
            alphaEnd: 1
          },
          animationPasses: [
            {
              animationName: "impact",
              emitterState: {
                simulation: { birthrate: 4 },
                directRows: [
                  { property: "birthrate", rawToken: "birthrate", rowKind: "direct", values: [4] }
                ]
              }
            }
          ]
        })
      ],
      runtime: {
        dtSeconds: 0.25,
        particleLimit: 16,
        seed: 1234,
        animation: { animationName: "impact", currentTimeSeconds: 0.25 }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.activeParticleIds).toEqual([1]);
    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.source.simulation?.birthrate).toBe(4);
  });

  it("linearly samples a selected non-Bezier emitter key track before the shared runtime tick", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_fountain_key.mdl",
      sourceLayer: "external_fixture",
      sourceHash: "fountain-key-source-hash",
      sourceEmitters: [
        buildEmitter({
          simulation: {
            birthrate: 4,
            lifeExp: 2,
            velocity: 0,
            sizeStart: 1,
            sizeEnd: 1,
            alphaStart: 1,
            alphaEnd: 1
          },
          animationPasses: [
            {
              animationName: "impact",
              emitterState: {
                simulation: {
                  birthrate: 0,
                  timeline: {
                    birthrate: [
                      { time: 0, value: 0 },
                      { time: 1, value: 4 }
                    ]
                  }
                },
                keyRows: [
                  { property: "birthrate", rawToken: "birthratekey", rowKind: "key", values: [0, 0] },
                  { property: "birthrate", rawToken: "birthratekey", rowKind: "key", values: [1, 4] }
                ]
              }
            }
          ]
        })
      ],
      runtime: {
        dtSeconds: 0.25,
        particleLimit: 16,
        seed: 1234,
        animation: { animationName: "impact", currentTimeSeconds: 0.5, blendWeight: 0.5 }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.source.simulation?.birthrate).toBe(3);
    expect(response.vfx.runtimeEmitters?.[0]?.selectedAnimation).toEqual({
      animationName: "impact",
      previousTimeSeconds: 0,
      currentTimeSeconds: 0.5,
      blendWeight: 0.5
    });
  });

  it("finishes source animation on its playback boundary while particle tail ticks continue", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_impact_tail.mdl",
      sourceLayer: "external_fixture",
      sourceHash: "impact-tail-source-hash",
      sourceEmitters: [
        buildEmitter({
          simulation: {
            birthrate: 0,
            lifeExp: 0.25,
            velocity: 0,
            sizeStart: 1,
            sizeEnd: 1,
            alphaStart: 1,
            alphaEnd: 1
          },
          animationPasses: [
            {
              animationName: "impact",
              lengthSeconds: 1,
              emitterState: {
                simulation: {
                  birthrate: 0,
                  timeline: {
                    birthrate: [
                      { time: 0, value: 0 },
                      { time: 0.5, value: 4 },
                      { time: 1, value: 0 }
                    ]
                  }
                }
              }
            }
          ]
        })
      ],
      runtime: {
        dtSeconds: 0.25,
        tickCount: 6,
        particleLimit: 16,
        seed: 1234,
        animation: {
          animationName: "impact",
          currentTimeSeconds: 1,
          playbackTickCount: 4
        }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    const frames = response.vfx.runtimeEmitters?.[0]?.runtimeFrames ?? [];
    expect(frames.map((frame) => frame.selectedAnimation?.currentTimeSeconds)).toEqual([
      0,
      0.25,
      0.5,
      0.75,
      1,
      1,
      1
    ]);
    expect(response.vfx.runtimeEmitters?.[0]?.selectedAnimation).toEqual({
      animationName: "impact",
      previousTimeSeconds: 0,
      currentTimeSeconds: 1,
      blendWeight: 1,
      playbackTickCount: 4
    });
    expect(frames.at(-1)?.selectedAnimation).toEqual({
      animationName: "impact",
      previousTimeSeconds: 1,
      currentTimeSeconds: 1,
      blendWeight: 1,
      playbackTickCount: 4
    });
    expect(frames.at(-1)?.runtimeState.activeParticleIds).toEqual([]);
  });

  it("loops an explicit owner animation across playback boundaries", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_owner_loop.mdl",
      sourceLayer: "external_fixture",
      sourceHash: "owner-loop-source-hash",
      sourceEmitters: [
        buildEmitter({
          animationPasses: [
            {
              animationName: "duration",
              lengthSeconds: 1,
              emitterState: {}
            }
          ]
        })
      ],
      runtime: {
        dtSeconds: 0.25,
        tickCount: 6,
        particleLimit: 16,
        seed: 1234,
        animation: {
          animationName: "duration",
          currentTimeSeconds: 1,
          playbackTickCount: 4,
          loop: true
        }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    const frames = response.vfx.runtimeEmitters?.[0]?.runtimeFrames ?? [];
    expect(frames.map((frame) => frame.selectedAnimation?.currentTimeSeconds)).toEqual([
      0,
      0.25,
      0.5,
      0.75,
      0,
      0.25,
      0.5
    ]);
    expect(frames[4]?.selectedAnimation).toMatchObject({
      previousTimeSeconds: 0.75,
      currentTimeSeconds: 0,
      loop: true
    });
  });

  it("samples Aurora Bezier value and tangent rows for a selected emitter animation pass", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_bezier_key.mdl",
      sourceLayer: "external_fixture",
      sourceHash: "bezier-key-source-hash",
      sourceEmitters: [
        buildEmitter({
          transform: { position: [0, 0, 0] },
          simulation: {
            birthrate: 4,
            lifeExp: 2,
            velocity: 0,
            sizeStart: 1,
            sizeEnd: 1,
            alphaStart: 1,
            alphaEnd: 1
          },
          animationPasses: [
            {
              animationName: "impact",
              emitterState: {
                simulation: {
                  velocity: 0,
                  timeline: {
                    velocity: [
                      {
                        time: 0,
                        value: 0,
                        interpolation: "bezier",
                        bezierIncomingTangent: 0,
                        bezierOutgoingTangent: 8
                      },
                      {
                        time: 1,
                        value: 10,
                        interpolation: "bezier",
                        bezierIncomingTangent: 0,
                        bezierOutgoingTangent: 0
                      }
                    ]
                  }
                },
                transform: {
                  positionTimeline: [
                    {
                      time: 0,
                      value: [0, 0, 0],
                      interpolation: "bezier",
                      bezierIncomingTangent: [0, 0, 0],
                      bezierOutgoingTangent: [8, 0, 0]
                    },
                    {
                      time: 1,
                      value: [10, 0, 0],
                      interpolation: "bezier",
                      bezierIncomingTangent: [0, 0, 0],
                      bezierOutgoingTangent: [0, 0, 0]
                    }
                  ]
                },
                bezierKeyRows: [
                  {
                    property: "velocity",
                    rawToken: "velocitybezierkey",
                    rowKind: "bezier-key",
                    values: [0, 0, 0, 8]
                  },
                  {
                    property: "position",
                    rawToken: "positionbezierkey",
                    rowKind: "bezier-key",
                    values: [0, 0, 0, 0, 0, 0, 0, 8, 0, 0]
                  }
                ]
              }
            }
          ]
        })
      ],
      runtime: {
        dtSeconds: 0.25,
        particleLimit: 16,
        seed: 1234,
        animation: { animationName: "impact", currentTimeSeconds: 0.5 }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.source.simulation?.velocity).toBeCloseTo(8, 10);
    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.source.transform?.position).toEqual([8, 0, 0]);
  });

  it("spherically samples a selected non-Bezier orientation key track", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_orientation_key.mdl",
      sourceLayer: "external_fixture",
      sourceHash: "orientation-key-source-hash",
      sourceEmitters: [
        buildEmitter({
          transform: { orientation: { axis: [0, 0, 1], angleRadians: 0 } },
          animationPasses: [
            {
              animationName: "turn",
              emitterState: {
                transform: {
                  orientationTimeline: [
                    { time: 0, value: { axis: [0, 0, 1], angleRadians: 0 } },
                    { time: 1, value: { axis: [0, 0, 1], angleRadians: Math.PI } }
                  ]
                },
                keyRows: [
                  { property: "orientation", rawToken: "orientationkey", rowKind: "key", values: [0, 0, 0, 1, 0] },
                  { property: "orientation", rawToken: "orientationkey", rowKind: "key", values: [1, 0, 0, 1, Math.PI] }
                ]
              }
            }
          ]
        })
      ],
      runtime: {
        dtSeconds: 0.25,
        particleLimit: 16,
        seed: 1234,
        animation: { animationName: "turn", currentTimeSeconds: 0.5 }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    const orientation = response.vfx.runtimeEmitters?.[0]?.runtimeState.source.transform?.orientation;
    expect(orientation?.axis[2]).toBeCloseTo(1, 6);
    expect(orientation?.angleRadians).toBeCloseTo(Math.PI * 0.5, 6);
  });

  it("does not apply an ASCII Aurora orientation Bezier controller at timeline boundaries", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_orientation_bezier_noop.mdl",
      sourceLayer: "external_fixture",
      sourceHash: "orientation-bezier-noop-source-hash",
      sourceEmitters: [
        buildEmitter({
          transform: { orientation: { axis: [0, 0, 1], angleRadians: 0.25 } },
          animationPasses: [
            {
              animationName: "turn",
              emitterState: {
                transform: {
                  orientationTimeline: [
                    {
                      time: 0,
                      value: { axis: [0, 1, 0], angleRadians: Math.PI / 2 },
                      interpolation: "bezier"
                    },
                    {
                      time: 1,
                      value: { axis: [0, 1, 0], angleRadians: Math.PI },
                      interpolation: "bezier"
                    }
                  ]
                },
                bezierKeyRows: [
                  {
                    property: "orientation",
                    rawToken: "orientationbezierkey",
                    rowKind: "bezier-key",
                    values: [0, 0, 1, 0, Math.PI / 2, 0, 0, 0, 0, 0]
                  }
                ]
              }
            }
          ]
        })
      ],
      runtime: {
        dtSeconds: 0.25,
        particleLimit: 16,
        seed: 1234,
        animation: { animationName: "turn", currentTimeSeconds: 0 }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    const orientation = response.vfx.runtimeEmitters?.[0]?.runtimeState.source.transform?.orientation;
    expect(orientation?.axis).toEqual([0, 0, 1]);
    expect(orientation?.angleRadians).toBeCloseTo(0.25, 10);
  });

  it("feeds a selected direct detonate field into the shared Explosion latch", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_explosion_direct.mdl",
      sourceLayer: "external_fixture",
      sourceHash: "explosion-direct-source-hash",
      sourceEmitters: [
        buildEmitter({
          emitterType: "Explosion",
          emitterTypeRaw: "Explosion",
          simulation: { birthrate: 2, lifeExp: 1 },
          animationPasses: [
            {
              animationName: "impact",
              emitterState: {
                simulation: { detonate: 1 },
                directRows: [
                  { property: "detonate", rawToken: "detonate", rowKind: "direct", values: [1] }
                ]
              }
            }
          ]
        })
      ],
      runtime: {
        dtSeconds: 0.25,
        particleLimit: 16,
        seed: 1234,
        animation: { animationName: "impact", currentTimeSeconds: 0.25 }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.activeParticleIds).toHaveLength(2);
    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.lastTickDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "VFX_EXPLOSION_DETONATE_FIELD_CONSUMED" })
      ])
    );
  });

  it("resolves Fountain trail source motion per emitter and per simulation boundary", async () => {
    const service = buildService();
    const resolverCalls: Array<{
      emitterNodeName: string;
      previousTimeSeconds: number;
      currentTimeSeconds: number;
    }> = [];

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_trail_host_motion.mdl",
      sourceLayer: "external_fixture",
      sourceHash: "trail-host-motion-source-hash",
      sourceEmitters: [
        buildEmitter({
          nodeName: "host_trail",
          emitterType: "Fountain",
          emitterTypeRaw: "Fountain",
          transform: { position: [0.1, 0, 0] },
          simulation: {
            birthrate: 4,
            lifeExp: 1,
            spawnType: 1,
            velocity: 0
          }
        })
      ],
      runtime: {
        dtSeconds: 0.1,
        tickCount: 2,
        particleLimit: 16,
        seed: 1234,
        context: {
          sourceMotionResolver: {
            runtimeProfileId: "animated-host-motion-test",
            serviceEvidence: "aurora-runtime-service",
            resolve(input) {
              resolverCalls.push({
                emitterNodeName: input.emitterNodeName,
                previousTimeSeconds: input.previousTimeSeconds,
                currentTimeSeconds: input.currentTimeSeconds
              });
              const previousX = input.previousTimeSeconds === 0 ? 0.1 : 0.7;
              const currentX = input.currentTimeSeconds <= 0.1 ? 0.7 : 1;
              return {
                previousPosition: { x: previousX, y: 0, z: 0 },
                currentPosition: { x: currentX, y: 0, z: 0 }
              };
            }
          }
        }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(resolverCalls).toEqual([
      {
        emitterNodeName: "host_trail",
        previousTimeSeconds: 0,
        currentTimeSeconds: 0.1
      },
      {
        emitterNodeName: "host_trail",
        previousTimeSeconds: 0.1,
        currentTimeSeconds: 0.2
      }
    ]);
    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState.activeParticleIds).toEqual([1, 2, 3]);
    expect(
      response.vfx.runtimeEmitters?.[0]?.runtimeState.particles
        .filter((particle) => particle.list === "active")
        .map((particle) => particle.position.x)
    ).toEqual([Math.fround(0.1), Math.fround(0.6), 0.85]);
  });

  it("keeps the Type 7 root arc at attach time and lets the live source attachment overwrite it", async () => {
    const service = buildService();
    const visualEffectsTable = [
      "2DA V2.0",
      "",
      "Label Type_FD ProgFX_Duration",
      "216 VFX_BEAM_FIRE_LASH B 607"
    ].join("\n");
    const progFxTable = [
      "2DA V2.0",
      "",
      "Label Type Param1 Param2 Param3 Param4 Param5 Param6 Param7 Param8",
      "607 BeamFireLash 7 vim_lashfire cast01 **** **** **** **** **** ****"
    ].join("\n");

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceTableText: visualEffectsTable,
      progFxTableText: progFxTable,
      sourceObjectKey: "modules/current/vfx/visualeffects.2da",
      sourceLayer: "external_fixture",
      sourceRowId: 216,
      effectInstance: {
        constructorKind: "EffectBeam",
        sourceRowId: 216,
        applicationMode: "object",
        durationType: "temporary",
        durationSeconds: 20,
        effectorRef: "object:source",
        targetRef: "object:target",
        bodyNode: "BODY_NODE_CHEST"
      },
      sourceEmitters: [
        buildEmitter({
          nodeName: "beam_emit",
          parentNodeName: "beam_parent",
          emitterType: "P2P",
          emitterTypeRaw: "P2P",
          transform: { position: [1, 0, 1] },
          referenceNodes: [
            {
              nodeKind: "reference",
              nodeName: "internal_target",
              parentNodeName: "beam_emit",
              provenance: { sourceFormat: "aurora-mdl-ascii" },
              transform: { position: [0, 0, 4] }
            }
          ],
          simulation: {
            p2p: true,
            p2pType: "gravity",
            birthrate: 4,
            lifeExp: 2,
            velocity: 0,
            randvel: 0,
            spread: 0,
            grav: 1,
            drag: 1,
            threshold: 0,
            mass: 0,
            sizeStart: 1,
            sizeEnd: 1,
            alphaStart: 1,
            alphaEnd: 1
          }
        })
      ],
      sourceModelGraph: {
        nodes: [
          { nodeName: "beam_root" },
          {
            nodeName: "beam_parent",
            parentNodeName: "beam_root",
            transform: {
              orientation: { axis: [0, 0, 1], angleRadians: Math.PI / 2 }
            }
          },
          {
            nodeName: "beam_emit",
            parentNodeName: "beam_parent",
            transform: { position: [1, 0, 1] }
          },
          {
            nodeName: "internal_target",
            parentNodeName: "beam_emit",
            transform: { position: [0, 0, 4] }
          }
        ]
      },
      runtime: {
        dtSeconds: 0.25,
        tickCount: 2,
        particleLimit: 16,
        seed: 1234,
        effectBeamAttachmentRuntime: {
          version: "aurora-effect-beam-host-runtime/v1",
          runtimeProfileId: "animated-host-parts",
          source: {
            ref: "object:source",
            bodyNode: 1,
            modelGraph: {
              version: "aurora-mdl-model-graph/v1",
              sourceFormat: "aurora-mdl-binary",
              sourceModelHash: "source-model-sha256",
              nodes: [
                { nodeKind: "transform", sourceNodeKind: "dummy", nodeName: "pfh0", provenance: { sourceFormat: "aurora-mdl-binary" } },
                {
                  nodeKind: "transform",
                  sourceNodeKind: "dummy",
                  nodeName: "Impact",
                  parentNodeName: "pfh0",
                  animationTracks: [{
                    animationName: "hostmove",
                    lengthSeconds: 1,
                    transform: { positionTimeline: [{ time: 0, value: [0, 0, 0] }, { time: 1, value: [0, 0, 1] }] }
                  }],
                  provenance: { sourceFormat: "aurora-mdl-binary", parentNodeName: "pfh0" }
                }
              ],
              animationEvents: [],
              propagationEvents: []
            },
            objectTransform: {
              position: { x: 0, y: 0, z: 0 },
              orientation: { axis: [0, 0, 1], angleRadians: 0 }
            },
            animation: { animationName: "hostmove", lengthSeconds: 1 }
          },
          target: {
            ref: "object:target",
            bodyNode: 1,
            modelGraph: {
              version: "aurora-mdl-model-graph/v1",
              sourceFormat: "aurora-mdl-binary",
              sourceModelHash: "target-model-sha256",
              nodes: [
                { nodeKind: "transform", sourceNodeKind: "dummy", nodeName: "c_yinnkeep", provenance: { sourceFormat: "aurora-mdl-binary" } },
                {
                  nodeKind: "transform",
                  sourceNodeKind: "dummy",
                  nodeName: "Impact",
                  parentNodeName: "c_yinnkeep",
                  animationTracks: [{
                    animationName: "hostmove",
                    lengthSeconds: 1,
                    transform: { positionTimeline: [{ time: 0, value: [0, 0, 0] }, { time: 1, value: [0, -1, 0] }] }
                  }],
                  provenance: { sourceFormat: "aurora-mdl-binary", parentNodeName: "c_yinnkeep" }
                }
              ],
              animationEvents: [],
              propagationEvents: []
            },
            objectTransform: {
              position: { x: 6, y: 0, z: 0 },
              orientation: { axis: [0, 0, 1], angleRadians: Math.PI / 2 }
            },
            animation: { animationName: "hostmove", lengthSeconds: 1 }
          }
        }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    const runtimeEmitter = response.vfx.runtimeEmitters?.[0];
    const attachState = runtimeEmitter?.runtimeFrames?.[0]?.runtimeState;
    expect(attachState?.source.transform?.position?.[0]).toBeCloseTo(1, 10);
    expect(attachState?.source.transform?.position?.[1]).toBeCloseTo(1, 10);
    expect(attachState?.source.transform?.position?.[2]).toBeCloseTo(0, 10);
    expect(attachState?.source.transform?.orientation?.axis[0]).toBeCloseTo(Math.sqrt(1 / 3), 10);
    expect(attachState?.source.transform?.orientation?.axis[1]).toBeCloseTo(Math.sqrt(1 / 3), 10);
    expect(attachState?.source.transform?.orientation?.axis[2]).toBeCloseTo(Math.sqrt(1 / 3), 10);
    expect(attachState?.source.transform?.orientation?.angleRadians).toBeCloseTo((Math.PI * 2) / 3, 10);

    const state = runtimeEmitter?.runtimeState;
    expect(state?.source.transform?.position?.[0]).toBeCloseTo(0, 10);
    expect(state?.source.transform?.position?.[1]).toBeCloseTo(1, 10);
    expect(state?.source.transform?.position?.[2]).toBeCloseTo(1.5, 10);
    expect(state?.source.transform?.orientation?.axis[0]).toBeCloseTo(0, 10);
    expect(state?.source.transform?.orientation?.axis[1]).toBeCloseTo(0, 10);
    expect(state?.source.transform?.orientation?.axis[2]).toBeCloseTo(1, 10);
    expect(state?.source.transform?.orientation?.angleRadians).toBeCloseTo(Math.PI / 2, 10);
    expect(state?.lastTickDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_P2P_EFFECT_BEAM_TYPE7_REFERENCE_REATTACH_CONSUMED"
        }),
        expect.objectContaining({
          code: "VFX_P2P_EFFECT_BEAM_MODEL_NODE_ATTACHMENT_CONSUMED"
        })
      ])
    );
    expect(state?.lastTickDiagnostics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "VFX_P2P_SOURCE_REFERENCE_CONTEXT_CONSUMED" })
      ])
    );
  });

  it("threads ProgFX Type 4 light owner-phase evidence into runtime render contracts", async () => {
    const service = buildService();
    const visualEffectsTable = [
      "2DA V2.0",
      "",
      "Label Type_FD ProgFX_Duration",
      "153 VFX_DUR_LIGHT_BLUE_5 D 304"
    ].join("\n");
    const progFxTable = [
      "2DA V2.0",
      "",
      "Label Type Param1 Param2 Param3 Param4 Param5 Param6 Param7 Param8",
      "304 LightBlue5m 4 Blue_5m 1 0 20 0 0 fx_light_clr ****"
    ].join("\n");

    const response = await service.processVfxPackage({
      packageKind: "runtime_package",
      sourceTableText: visualEffectsTable,
      progFxTableText: progFxTable,
      sourceObjectKey: "modules/current/vfx/visualeffects.2da",
      sourceLayer: "external_fixture",
      sourceRowId: 153,
      effectInstance: {
        constructorKind: "EffectVisualEffect",
        sourceRowId: 153,
        applicationMode: "object",
        durationType: "temporary",
        durationSeconds: 6,
        targetRef: "object:target"
      },
      sourceEmitter: buildEmitter(),
      runtime: {
        dtSeconds: 0.5,
        particleLimit: 16,
        seed: 1234
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.vfx.progFxRows?.[0]).toMatchObject({
      rowId: 304,
      type: 4,
      type4Light: {
        animation: "Blue_5m",
        animationTokenRadiusMeters: 5,
        sourceMdlRadiusMeters: 13.3,
        sourceMdlColor: { r: 0.5, g: 0.5, b: 1 }
      }
    });
    expect(response.vfx.phaseSchedule?.status).toBe("ready");
    expect(response.vfx.renderContract?.progFxType4Light).toMatchObject({
      rowId: 304,
      ownerVisualEffectRowId: 153,
      ownerPhase: "duration",
      ownerProgFxRef: "304",
      proofStatus:
        "source-backed-progfx-type4-owner-phase-effect-instance-runtime-retail-unverified",
      runtimeSchedulingStatus:
        "source-backed-owner-phase-effect-instance-ready-retail-runtime-unverified",
      visualPreviewStatus: "backend-render-contract-source-record-no-scene-light"
    });
    expect(response.vfx.diagnostics.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "VFX_PROGFX_TYPE4_OWNER_PHASE_EFFECT_INSTANCE_READY",
        "VFX_PROGFX_TYPE4_RENDER_CONTRACT_NO_POINTLIGHT",
        "VFX_PROGFX_TYPE4_RETAIL_SCHEDULING_REQUIRED"
      ])
    );
  });

  it("moves one ProgFX Type 10 owner while preserving spawned particles as a world-space trail", async () => {
    const service = buildService();
    const visualEffectsTable = [
      "2DA V2.0",
      "",
      "Label Type_FD ProgFX_Impact",
      "181 VFX_IMP_MIRV P 900"
    ].join("\n");
    const progFxTable = [
      "2DA V2.0",
      "",
      "Label Type Param1 Param2 Param3 Param4 Param5 Param6 Param7 Param8",
      "900 MIRV 10 vpr_magmisl 340 0 4 log **** **** ****"
    ].join("\n");

    const response = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      sourceTableText: visualEffectsTable,
      progFxTableText: progFxTable,
      sourceObjectKey: "modules/current/vfx/visualeffects.2da",
      sourceLayer: "external_fixture",
      sourceRowId: 181,
      effectInstance: {
        constructorKind: "EffectVisualEffect",
        sourceRowId: 181,
        applicationMode: "object",
        durationType: "instant",
        creatorRef: "object:source",
        targetRef: "object:target"
      },
      sourceEmitter: buildEmitter({
        nodeName: "star",
        transform: { position: [0, 0, 0] },
        simulation: {
          birthrate: 4,
          lifeExp: 2,
          velocity: 0,
          randvel: 0,
          spread: 0,
          mass: 0,
          sizeStart: 1,
          sizeEnd: 1,
          alphaStart: 1,
          alphaEnd: 1
        }
      }),
      runtime: {
        dtSeconds: 0.25,
        tickCount: 6,
        particleLimit: 16,
        seed: 181181,
        context: {
          progFxType10Projectile: {
            sourceRef: "object:source",
            sourcePosition: { x: 0, y: 0, z: 0 },
            targetRef: "object:target",
            targetPosition: { x: 3, y: 0, z: 0 },
            provenance: "test-fixture"
          }
        }
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    const runtimeEmitter = response.vfx.runtimeEmitters?.[0];
    const ownerPositions = runtimeEmitter?.runtimeFrames?.map(
      (frame) => frame.sourceOwnerTransform?.position[0]
    ) ?? [];
    [0, 1.2, 2.4, 3, 3, 3, 3].forEach((expected, index) => {
      expect(ownerPositions[index]).toBeCloseTo(expected, 10);
    });
    expect(runtimeEmitter?.runtimeState.source.transform?.position?.[0]).toBeCloseTo(3, 10);
    const trailPositions = runtimeEmitter?.runtimeFrames?.[2]?.runtimeState.particles
      .filter((particle) => particle.list === "active")
      .map((particle) => particle.position.x) ?? [];
    [1.2, 2.4].forEach((expected, index) => {
      expect(trailPositions[index]).toBe(Math.fround(expected));
    });
    expect(runtimeEmitter?.runtimeState.activeParticleIds).toEqual([]);
    expect(runtimeEmitter?.runtimeState.lastTickDiagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_PROGFX_TYPE10_PROJECTILE_OWNER_DESTROYED"
        })
      ])
    );
  });

  it("marks blocked ProgFX Type 10 trajectory inputs diagnostic-only", async () => {
    const service = buildService();
    const visualEffectsTable = [
      "2DA V2.0",
      "",
      "Label Type_FD ProgFX_Impact",
      "181 VFX_IMP_MIRV P 900"
    ].join("\n");
    const buildProgFxTable = (orientationMode: number) => [
      "2DA V2.0",
      "",
      "Label Type Param1 Param2 Param3 Param4 Param5 Param6 Param7 Param8",
      `900 MIRV 10 vpr_magmisl 340 ${orientationMode} 4 log **** **** ****`
    ].join("\n");
    const baseCommand = {
      packageKind: "model_graph_runtime" as const,
      sourceTableText: visualEffectsTable,
      sourceObjectKey: "modules/current/vfx/visualeffects.2da",
      sourceLayer: "external_fixture" as const,
      sourceRowId: 181,
      effectInstance: {
        constructorKind: "EffectVisualEffect" as const,
        sourceRowId: 181,
        applicationMode: "object" as const,
        durationType: "instant" as const,
        creatorRef: "object:source",
        targetRef: "object:target"
      },
      sourceEmitter: buildEmitter({ nodeName: "star" }),
      bypassCache: true,
      includeBenchmarkMetadata: false
    };

    const missingContext = await service.processVfxPackage({
      ...baseCommand,
      progFxTableText: buildProgFxTable(0),
      runtime: { dtSeconds: 0.25, tickCount: 1, particleLimit: 16, seed: 181181 }
    });

    expect(missingContext.vfx.observability.runtimePackageStatus).toBe("diagnostic_only");
    expect(missingContext.vfx.observability.renderContractStatus).toBe("diagnostic_only");
    expect(missingContext.vfx.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_PROGFX_TYPE10_RUNTIME_CONTEXT_REQUIRED",
          severity: "error"
        })
      ])
    );

    const unsupportedOrientation = await service.processVfxPackage({
      ...baseCommand,
      progFxTableText: buildProgFxTable(1),
      runtime: {
        dtSeconds: 0.25,
        tickCount: 1,
        particleLimit: 16,
        seed: 181181,
        context: {
          progFxType10Projectile: {
            sourceRef: "object:source",
            sourcePosition: { x: 0, y: 0, z: 0 },
            targetRef: "object:target",
            targetPosition: { x: 3, y: 0, z: 0 },
            provenance: "test-fixture" as const
          }
        }
      }
    });

    expect(unsupportedOrientation.vfx.observability.runtimePackageStatus).toBe(
      "diagnostic_only"
    );
    expect(unsupportedOrientation.vfx.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_PROGFX_TYPE10_ORIENTATION_MODE_UNPROVEN",
          severity: "error"
        })
      ])
    );
  });

  it("packages ordered source emitters with independent runtime state for pure VFX", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "runtime_package",
      sourceTableText: SOURCE_TABLE,
      sourceObjectKey: "modules/current/vfx/visualeffects.2da",
      sourceLayer: "external_fixture",
      sourceRowId: 0,
      effectInstance: {
        constructorKind: "EffectVisualEffect",
        sourceRowId: 0,
        applicationMode: "object",
        durationType: "instant",
        targetRef: "target-1"
      },
      sourceEmitters: [
        buildEmitter({ nodeName: "fx_flame", texture: "fxpa_flame00" }),
        buildEmitter({
          nodeName: "fx_smoke",
          texture: "fxpa_smoke01",
          blendMode: "Lighten",
          blendModeRaw: "Lighten",
          sourceState: { renderOrder: 9 }
        })
      ],
      runtime: {
        dtSeconds: 0.5,
        particleLimit: 16,
        seed: 1234
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.vfx.observability.runtimePackageStatus).toBe("runtime_ready");
    expect(response.vfx.runtimeEmitters?.map((entry) => entry.emitterNodeName)).toEqual([
      "fx_flame",
      "fx_smoke"
    ]);
    expect(response.vfx.runtimeEmitters?.map((entry) => entry.emitterIndex)).toEqual([0, 1]);
    expect(response.vfx.runtimeEmitters?.[0]?.runtimeState).not.toBe(
      response.vfx.runtimeEmitters?.[1]?.runtimeState
    );
    expect(response.vfx.runtimeEmitters?.[1]?.renderContract.emitterNodeName).toBe("fx_smoke");
    expect(response.vfx.runtimeEmitters?.[1]?.renderContract.blendMode.rawToken).toBe("Lighten");
    expect(response.vfx.renderContract).toBe(response.vfx.runtimeEmitters?.[0]?.renderContract);
    expect(response.vfx.runtimeState).toBe(response.vfx.runtimeEmitters?.[0]?.runtimeState);
    expect(
      response.vfx.dependencyGraph.edges
        .map((edge) => edge.ownerPath)
        .filter((ownerPath) => ownerPath.includes("/emitter:"))
    ).toEqual(expect.arrayContaining([
      "mdl:fx_test.mdl/emitter:fx_flame",
      "mdl:fx_test.mdl/emitter:fx_smoke"
    ]));
  });

  it("threads resolved chunk-model resource traces into pure VFX runtime contracts", async () => {
    const service = buildService();

    const response = await service.processVfxPackage({
      packageKind: "runtime_package",
      sourceTableText: SOURCE_TABLE,
      sourceObjectKey: "modules/current/vfx/visualeffects.2da",
      sourceLayer: "external_fixture",
      sourceRowId: 0,
      effectInstance: {
        constructorKind: "EffectVisualEffect",
        sourceRowId: 0,
        applicationMode: "object",
        durationType: "instant",
        targetRef: "target-1"
      },
      sourceEmitter: buildEmitter({
        nodeName: "fx_chunk",
        emitterType: "Chunk",
        emitterTypeRaw: "Chunk",
        chunkName: "fx_chunk01",
        texture: "fx_texture_raw"
      }),
      resourceTraces: [
        {
          requestedResourceClass: "chunk_model",
          requestedRef: "fx_chunk01",
          ownerPath: "mdl:fx_test.mdl/emitter:fx_chunk/chunkName",
          selectedCandidate: {
            sourceLayer: "hak",
            resourceKey: "fx_chunk01.glb",
            sourcePath: "hak/models/fx_chunk01.glb",
            resourceHash: "chunk-glb-hash",
            candidateId: "candidate:fx_chunk01.glb",
            precedenceRank: 1
          }
        }
      ],
      runtime: {
        dtSeconds: 0.5,
        particleLimit: 16,
        seed: 1234
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.vfx.renderContract?.drawLane).toBe("chunk_model");
    expect(response.vfx.renderContract?.drawRecords).toEqual([]);
    expect(response.vfx.renderContract?.chunkLane).toMatchObject({
      lane: "chunk_model",
      chunkName: "fx_chunk01",
      resourceResolveStatus: "resolved",
      resolvedResource: {
        requestedRef: "fx_chunk01",
        resourceKey: "fx_chunk01.glb",
        sourceLayer: "hak",
        sourcePath: "hak/models/fx_chunk01.glb",
        resourceHash: "chunk-glb-hash",
        candidateId: "candidate:fx_chunk01.glb",
        precedenceRank: 1,
        resolutionSource: "dependency-graph-selected-candidate"
      }
    });
    expect(response.vfx.runtimeEmitters?.[0]?.renderContract.chunkLane?.resolvedResource).toMatchObject({
      resourceKey: "fx_chunk01.glb"
    });
    expect(
      response.vfx.dependencyGraph.edges.find((edge) => edge.edgeType === "chunk_model")
    ).toMatchObject({
      resolveStatus: "resolved",
      selectedCandidate: {
        resourceKey: "fx_chunk01.glb"
      }
    });
  });

  it("rejects unsafe VFX source paths without fallback", async () => {
    const service = buildService();

    await expect(
      service.processVfxPackage({
        packageKind: "source_parse",
        sourceTableText: SOURCE_TABLE,
        sourceObjectKey: "../visualeffects.2da",
        sourceLayer: "external_fixture",
        bypassCache: true,
        includeBenchmarkMetadata: false
      })
    ).rejects.toMatchObject({
      code: "VFX_SOURCE_RESOURCE_PATH_UNSAFE"
    } satisfies Partial<AppException>);
  });

  it("surfaces missing VFX source policy as diagnostics instead of borrowing placeable policy", async () => {
    const settings = buildDefaultRuntimeSettings("2026-06-10T00:00:00.000Z");
    delete (settings.sources as Partial<RuntimeSettingsRecord["sources"]>).vfx;
    const service = buildService(settings);

    const response = await service.processVfxPackage({
      packageKind: "source_parse",
      sourceTableText: SOURCE_TABLE,
      sourceObjectKey: "modules/current/vfx/visualeffects.2da",
      sourceLayer: "external_fixture",
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(response.vfx.sourcePolicyTrace.policyMode).toBe("missing-vfx-policy");
    expect(response.vfx.diagnostics.map((entry) => entry.code)).toContain(
      "VFX_INTEGRATION_VFX_SOURCE_POLICY_REQUIRED"
    );
    expect(response.vfx.observability.runtimePackageStatus).toBe("diagnostic_only");
  });

  it("changes output cache key when runtime settings, animation window, HAK, source, or resource hashes change", () => {
    const base = {
      packageKind: "runtime_package",
      sourceHash: "source-a",
      sourceRowId: 0,
      runtimeSettingsRevision: 1,
      hakListHash: "hak-a",
      sourcePolicyHash: "policy-a",
      selectedTableHash: "table-a",
      selectedResourceHash: "resource-a",
      runtime: {
        dtSeconds: 0.25,
        executionParticleBudget: 4096,
        particleLimit: 64,
        seed: 123
      }
    };

    expect(buildAuroraVfxOutputCacheKey(base)).not.toBe(
      buildAuroraVfxOutputCacheKey({ ...base, runtimeSettingsRevision: 2 })
    );
    expect(buildAuroraVfxOutputCacheKey(base)).not.toBe(
      buildAuroraVfxOutputCacheKey({ ...base, hakListHash: "hak-b" })
    );
    expect(buildAuroraVfxOutputCacheKey(base)).not.toBe(
      buildAuroraVfxOutputCacheKey({ ...base, sourceHash: "source-b" })
    );
    expect(buildAuroraVfxOutputCacheKey(base)).not.toBe(
      buildAuroraVfxOutputCacheKey({ ...base, selectedResourceHash: "resource-b" })
    );
    expect(buildAuroraVfxOutputCacheKey(base)).not.toBe(
      buildAuroraVfxOutputCacheKey({
        ...base,
        sourceAnimationEvents: [
          { time: 0.25, type: "detonate", animationName: "impact" }
        ]
      })
    );
    expect(buildAuroraVfxOutputCacheKey(base)).not.toBe(
      buildAuroraVfxOutputCacheKey({
        ...base,
        sourceEmitterMaterials: [
          {
            emitterIndex: 0,
            emitterNodeName: "emit_material",
            materialState: {
              source: "aurora-mtr",
              materialRef: "fx_material.mtr",
              sampleFramebuffer: 2
            }
          }
        ]
      })
    );
    expect(buildAuroraVfxOutputCacheKey(base)).not.toBe(
      buildAuroraVfxOutputCacheKey({
        ...base,
        runtime: { ...base.runtime, tickCount: 2 }
      })
    );
    expect(buildAuroraVfxOutputCacheKey(base)).not.toBe(
      buildAuroraVfxOutputCacheKey({
        ...base,
        runtime: { ...base.runtime, executionParticleBudget: 8192 }
      })
    );
    expect(buildAuroraVfxOutputCacheKey(base)).not.toBe(
      buildAuroraVfxOutputCacheKey({
        ...base,
        runtime: {
          ...base.runtime,
          cameraPosition: { x: 1, y: 2, z: 3 },
          cameraContextSource: "aurora-active-camera-world-position"
        }
      })
    );
    expect(buildAuroraVfxOutputCacheKey(base)).not.toBe(
      buildAuroraVfxOutputCacheKey({
        ...base,
        runtime: {
          ...base.runtime,
          animation: {
            animationName: "impact",
            previousTimeSeconds: 0,
            currentTimeSeconds: 0.25
          }
        }
      })
    );
    const animatedBase = {
      ...base,
      runtime: {
        ...base.runtime,
        animation: {
          animationName: "impact",
          previousTimeSeconds: 0,
          currentTimeSeconds: 0.25,
          blendWeight: 1
        }
      }
    };
    expect(buildAuroraVfxOutputCacheKey(animatedBase)).not.toBe(
      buildAuroraVfxOutputCacheKey({
        ...animatedBase,
        runtime: {
          ...animatedBase.runtime,
          animation: { ...animatedBase.runtime.animation, blendWeight: 0.5 }
        }
      })
    );
    expect(buildAuroraVfxOutputCacheKey(base)).not.toBe(
      buildAuroraVfxOutputCacheKey({
        ...base,
        runtime: {
          ...base.runtime,
          windManager: {
            profileId: "area-wind:test",
            globalWindVector: { x: 1, y: 0, z: 0 },
            noiseGridPrevious16x16: Array(256).fill(1),
            noiseGridCurrent16x16: Array(256).fill(1)
          }
        }
      })
    );
  });

  it("returns stable benchmark contract stages for VFX pipeline slices", async () => {
    const service = buildService();

    const benchmark = await service.benchmarkVfx({
      iterations: 2,
      warmupIterations: 1,
      bypassCache: true,
      sourceTableText: SOURCE_TABLE
    });

    expect(benchmark.version).toBe("aurora-vfx-benchmark/v1");
    expect(benchmark.stages.map((stage) => stage.stage)).toEqual([
      "source_parse",
      "dependency_graph_build",
      "runtime_tick",
      "render_contract_build"
    ]);
    expect(benchmark.deterministicFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(benchmark.stages.every((stage) => stage.fingerprint.match(/^[a-f0-9]{64}$/))).toBe(true);
  });
});

function buildService(settings = buildDefaultRuntimeSettings("2026-06-10T00:00:00.000Z")) {
  return new VfxApplicationService({
    get: jest.fn().mockResolvedValue(settings),
    save: jest.fn()
  });
}

function buildEmitter(overrides: Partial<AuroraMdlEmitterNode> = {}): AuroraMdlEmitterNode {
  return {
    nodeKind: "emitter",
    nodeName: overrides.nodeName ?? "fx_test_emitter",
    provenance: {
      sourceFormat: "aurora-mdl-ascii",
      sourceModelObjectKey:
        overrides.sourceModelObjectKey ?? "modules/current/models/fx_test.mdl",
      sourceModelFileName: overrides.sourceModelFileName ?? "fx_test.mdl",
      sourceModelHash: overrides.sourceModelHash ?? "mdl-hash",
      ...overrides.provenance
    },
    sourceFormat: "aurora-mdl-ascii",
    ...(overrides.parentNodeName ? { parentNodeName: overrides.parentNodeName } : {}),
    sourceModelObjectKey: overrides.sourceModelObjectKey ?? "modules/current/models/fx_test.mdl",
    sourceModelFileName: overrides.sourceModelFileName ?? "fx_test.mdl",
    sourceModelHash: overrides.sourceModelHash ?? "mdl-hash",
    texture: overrides.texture ?? "fx_test_texture",
    ...(overrides.chunkName ? { chunkName: overrides.chunkName } : {}),
    emitterType: overrides.emitterType ?? "Fountain",
    emitterTypeRaw: overrides.emitterTypeRaw ?? overrides.emitterType ?? "Fountain",
    renderMode: overrides.renderMode ?? "Normal",
    renderModeRaw: overrides.renderModeRaw ?? overrides.renderMode ?? "Normal",
    blendMode: overrides.blendMode ?? "Normal",
    blendModeRaw: overrides.blendModeRaw ?? overrides.blendMode ?? "Normal",
    ...(overrides.transform ? { transform: overrides.transform } : {}),
    ...(overrides.orientation ? { orientation: overrides.orientation } : {}),
    ...(overrides.referenceNodes ? { referenceNodes: overrides.referenceNodes } : {}),
    ...(overrides.events ? { events: overrides.events } : {}),
    ...(overrides.animationPasses ? { animationPasses: overrides.animationPasses } : {}),
    atlas: overrides.atlas ?? {
      effectiveXGrid: 1,
      effectiveYGrid: 1
    },
    simulation: overrides.simulation ?? {
      birthrate: 4,
      lifeExp: 1,
      velocity: 0,
      sizeStart: 1,
      sizeEnd: 1,
      alphaStart: 1,
      alphaEnd: 1
    },
    sourceState: overrides.sourceState ?? {
      renderOrder: 4
    },
    directRows: overrides.directRows ?? [],
    keyRows: overrides.keyRows ?? [],
    bezierKeyRows: overrides.bezierKeyRows ?? [],
    colorTimelines: overrides.colorTimelines ?? {}
  };
}
