import { AppException } from "../../src/common/http/app-exception";
import {
  parseVfxBenchmarkPayload,
  parseVfxCacheKey,
  parseVfxProcessPayload
} from "../../src/modules/vfx/adapters/inbound/http/vfx.schemas";

describe("vfx.schemas", () => {
  it("parses VFX process payload defaults", () => {
    const parsed = parseVfxProcessPayload({
      sourceTableText: "2DA V2.0\n\nLabel Type_FD\n0 VFX_TEST F",
      sourceObjectKey: "modules/current/vfx/visualeffects.2da"
    });

    expect(parsed).toMatchObject({
      packageKind: "runtime_package",
      sourceLayer: "external_fixture",
      bypassCache: false,
      includeBenchmarkMetadata: false,
      sourceObjectKey: "modules/current/vfx/visualeffects.2da"
    });
  });

  it("parses VFX process payload source policy and resolver traces", () => {
    const parsed = parseVfxProcessPayload({
      packageKind: "source_parse",
      sourceTableText: "2DA V2.0\n\nLabel Type_FD\n0 VFX_TEST F",
      progFxTableText: "2DA V2.0\n\nLabel Type\n304 LightBlue5m 4",
      sourceCandidates: [
        {
          candidateId: "module:visualeffects",
          layer: "module",
          resourceKind: "table",
          resourceKey: "modules/current/vfx/visualeffects.2da",
          sourceHash: "table-hash"
        }
      ],
      resourceTraces: [
        {
          requestedResourceClass: "texture",
          requestedRef: "fx_test",
          selectedCandidate: {
            sourceLayer: "hak",
            resourceKey: "lc_vfx/fx_test.dds",
            resourceHash: "resource-hash",
            precedenceRank: 1
          },
          lowerPrecedenceCandidates: [
            {
              sourceLayer: "vanilla",
              resourceKey: "textures/fx_test.dds",
              resourceHash: "lower-hash",
              precedenceRank: 2
            }
          ]
        }
      ],
      bypassCache: "true"
    });

    expect(parsed.packageKind).toBe("source_parse");
    expect(parsed.progFxTableText).toBe("2DA V2.0\n\nLabel Type\n304 LightBlue5m 4");
    expect(parsed.bypassCache).toBe(true);
    expect(parsed.sourceCandidates?.[0]?.layer).toBe("module");
    expect(parsed.resourceTraces?.[0]?.lowerPrecedenceCandidates?.[0]?.sourceLayer).toBe("vanilla");
  });

  it("parses source-MDL graph runtime payloads without a synthetic 2DA source table", () => {
    const parsed = parseVfxProcessPayload({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/plc_t04.mdl",
      sourceEmitter: { nodeName: "fire", emitterType: "Fountain" },
      sourceEmitterMaterials: [
        {
          emitterIndex: 0,
          emitterNodeName: "fire",
          materialState: {
            source: "aurora-mtr",
            materialRef: "fx_fire.mtr",
            renderHint: "NormalTangents",
            customShaderVS: "fx_fire_vs",
            customShaderFS: "fx_fire_fs",
            customShaderGS: "fx_fire_gs",
            customShaderProgram: {
              version: "aurora-shader-program-source/v1",
              status: "complete",
              stageRoots: {
                vertex: "fx_fire_vs",
                fragment: "fx_fire_fs"
              },
              sources: [
                { resref: "fx_fire_vs", source: "void main() {}", includeRefs: [] },
                { resref: "fx_fire_fs", source: "void main() {}", includeRefs: [] }
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
            sampleFramebuffer: 2,
            volumetric: true
          }
        }
      ]
    });

    expect(parsed).toMatchObject({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/plc_t04.mdl",
      sourceEmitter: { nodeName: "fire" },
      sourceEmitterMaterials: [
        {
          emitterIndex: 0,
          emitterNodeName: "fire",
          materialState: {
            source: "aurora-mtr",
            materialRef: "fx_fire.mtr",
            renderHint: "NormalTangents",
            customShaderVS: "fx_fire_vs",
            customShaderFS: "fx_fire_fs",
            customShaderGS: "fx_fire_gs",
            customShaderProgram: {
              version: "aurora-shader-program-source/v1",
              status: "complete",
              stageRoots: {
                vertex: "fx_fire_vs",
                fragment: "fx_fire_fs"
              }
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
            sampleFramebuffer: 2,
            volumetric: true
          }
        }
      ]
    });
    expect(parsed.sourceTableText).toBeUndefined();
  });

  it("parses an Aurora animation transition blend weight", () => {
    const parsed = parseVfxProcessPayload({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_anim.mdl",
      sourceEmitter: { nodeName: "fire", emitterType: "Fountain" },
      runtime: {
        dtSeconds: 0.125,
        simulationStepSeconds: 1 / 60,
        tickCount: 80,
        animation: {
          animationName: "impact",
          currentTimeSeconds: 0.5,
          blendWeight: 0.5
        }
      }
    });

    expect(parsed.runtime?.animation?.blendWeight).toBe(0.5);
    expect(parsed.runtime?.simulationStepSeconds).toBeCloseTo(1 / 60, 10);
    expect(parsed.runtime?.tickCount).toBe(80);
  });

  it("parses the explicit VFX execution particle budget separately from the legacy limit", () => {
    const parsed = parseVfxProcessPayload({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_capacity.mdl",
      sourceEmitter: { nodeName: "fire", emitterType: "Fountain" },
      runtime: {
        executionParticleBudget: 8192,
        particleLimit: 64
      }
    });

    expect(parsed.runtime).toMatchObject({
      executionParticleBudget: 8192,
      particleLimit: 64
    });
  });

  it("parses serializable Aurora camera context for particle deadspace", () => {
    const parsed = parseVfxProcessPayload({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_deadspace.mdl",
      sourceEmitter: { nodeName: "sparks", emitterType: "Fountain" },
      runtime: {
        cameraPosition: { x: 1, y: 2, z: 3 },
        cameraContextSource: "aurora-active-camera-world-position"
      }
    });

    expect(parsed.runtime).toMatchObject({
      cameraPosition: { x: 1, y: 2, z: 3 },
      cameraContextSource: "aurora-active-camera-world-position"
    });
  });

  it("rejects an execution particle budget above the server contract maximum", () => {
    expect(() =>
      parseVfxProcessPayload({
        packageKind: "model_graph_runtime",
        sourceObjectKey: "modules/current/models/fx_capacity.mdl",
        sourceEmitter: { nodeName: "fire", emitterType: "Fountain" },
        runtime: {
          executionParticleBudget: 65_537
        }
      })
    ).toThrow(
      expect.objectContaining({
        code: "VALIDATION_FAILED"
      })
    );
  });

  it("parses an explicit Aurora wind-manager profile snapshot", () => {
    const parsed = parseVfxProcessPayload({
      packageKind: "model_graph_runtime",
      sourceObjectKey: "modules/current/models/fx_wind.mdl",
      sourceEmitter: { nodeName: "wind", emitterType: "P2P" },
      runtime: {
        windManager: {
          profileId: "area-wind:test",
          globalWindVector: { x: 2, y: 0, z: 0 },
          noiseGridPrevious16x16: Array(256).fill(1),
          noiseGridCurrent16x16: Array(256).fill(1),
          pointSources: [
            {
              position: { x: 0, y: 0, z: 0 },
              radius: 4,
              durationSeconds: 2,
              intensity: 1
            }
          ]
        }
      }
    });

    expect(parsed.runtime?.windManager?.profileId).toBe("area-wind:test");
    expect(parsed.runtime?.windManager?.noiseGridCurrent16x16).toHaveLength(256);
    expect(parsed.runtime?.windManager?.pointSources?.[0]?.radius).toBe(4);
  });

  it("preserves a serialized animated EffectBeam host profile", () => {
    const hostGraph = {
      version: "aurora-mdl-model-graph/v1",
      sourceFormat: "aurora-mdl-binary",
      sourceModelHash: "host-sha256",
      nodes: [
        {
          nodeKind: "transform",
          sourceNodeKind: "dummy",
          nodeName: "Impact",
          provenance: { sourceFormat: "aurora-mdl-binary" }
        }
      ],
      animationEvents: [],
      propagationEvents: []
    };
    const parsed = parseVfxProcessPayload({
      packageKind: "model_graph_runtime",
      sourceEmitter: { nodeName: "beam", emitterType: "P2P" },
      runtime: {
        effectBeamAttachmentRuntime: {
          version: "aurora-effect-beam-host-runtime/v1",
          runtimeProfileId: "scene-hosts",
          source: {
            ref: "source",
            bodyNode: 1,
            modelGraph: hostGraph,
            objectTransform: { position: { x: 0, y: 0, z: 0 } },
            animation: {
              animationName: "combatidle",
              startTimeSeconds: 0.25,
              timeScale: 1,
              loop: true,
              lengthSeconds: 2,
              blendWeight: 1
            }
          },
          target: {
            ref: "target",
            bodyNode: 1,
            modelGraph: { ...hostGraph, sourceModelHash: "target-sha256" },
            objectTransform: { position: { x: 6, y: 0, z: 0 } }
          }
        }
      }
    });

    expect(parsed.runtime?.effectBeamAttachmentRuntime).toMatchObject({
      runtimeProfileId: "scene-hosts",
      source: {
        ref: "source",
        animation: { animationName: "combatidle", startTimeSeconds: 0.25 }
      },
      target: { ref: "target", modelGraph: { sourceModelHash: "target-sha256" } }
    });
    expect(parsed.runtime?.context).toBeUndefined();
  });

  it("builds the in-process Aurora area WOK collision service from a serialized scene contract", () => {
    const parsed = parseVfxProcessPayload({
      packageKind: "model_graph_runtime",
      sourceEmitter: {
        nodeName: "bounce",
        emitterType: "Fountain",
        simulation: { bounce: true }
      },
      runtime: {
        areaCollision: {
          version: "aurora-area-vfx-scene-collision/v1",
          area: {
            version: "aurora-area-vfx-collision/v1",
            coordinateSpace: "aurora-area-z-up",
            unitsPerTile: 10,
            status: "ready",
            fingerprint: "a".repeat(64),
            resources: [
              {
                resourceId: "wok:test",
                modelResRef: "test",
                sourceObjectKey: "modules/current/test.wok",
                sourceLayer: "module",
                sourceHash: "b".repeat(64),
                walkmesh: {
                  version: "aurora-wok-walkmesh/v1",
                  sourceFormat: "aurora-wok-ascii",
                  resourceName: "test",
                  nodes: [
                    {
                      nodeName: "walkmesh",
                      vertices: [
                        { x: -1, y: -1, z: 0 },
                        { x: 1, y: -1, z: 0 },
                        { x: 0, y: 1, z: 0 }
                      ],
                      faces: [
                        {
                          vertexIndices: [0, 1, 2],
                          rawTokens: [0, 1, 2],
                          sourceLineNumber: 1
                        }
                      ],
                      aabbRecords: [
                        {
                          rawTokens: [-1, -1, 0, 1, 1, 0, 0],
                          sourceLineNumber: 2,
                          boundsMin: { x: -1, y: -1, z: 0 },
                          boundsMax: { x: 1, y: 1, z: 0 },
                          faceIndex: 0,
                          planeMask: 0,
                          planeMaskSource: "aurora-default-zero"
                        }
                      ]
                    }
                  ],
                  diagnostics: []
                }
              }
            ],
            instances: [
              {
                instanceId: "area:tile:0",
                resourceId: "wok:test",
                translation: { x: 5, y: 5, z: 0 },
                orientationQuarterTurns: 0
              }
            ],
            diagnostics: []
          },
          objectTransform: {
            translation: { x: 5, y: 5, z: 0 },
            bearingRadians: 0,
            visualTransform: {
              scaleX: 1,
              scaleY: 1,
              scaleZ: 1,
              offsetX: 0,
              offsetY: 0,
              offsetZ: 0,
              pitch: 0,
              roll: 0,
              yaw: 0
            }
          }
        }
      },
      bypassCache: true
    });

    expect(parsed.runtime?.context?.collisionContext).toMatchObject({
      serviceEvidence: "aurora-runtime-service",
      requestedCollisionClasses: ["retail-area-static-wok-geometry"]
    });
    expect(parsed.runtime).not.toHaveProperty("areaCollision");
  });

  it("parses benchmark payload defaults and cache keys", () => {
    expect(parseVfxBenchmarkPayload({})).toMatchObject({
      iterations: 10,
      warmupIterations: 1,
      bypassCache: true
    });
    expect(parseVfxCacheKey("A".repeat(64))).toBe("a".repeat(64));
  });

  it("rejects invalid VFX API payloads", () => {
    expect(() => parseVfxProcessPayload({})).toThrow(AppException);
    expect(() => parseVfxCacheKey("not-a-cache-key")).toThrow(AppException);
    expect(() => parseVfxBenchmarkPayload({ iterations: 0 })).toThrow(AppException);
    expect(() =>
      parseVfxProcessPayload({
        packageKind: "model_graph_runtime",
        sourceObjectKey: "modules/current/models/fx_invalid_parameter.mdl",
        sourceEmitterMaterials: [
          {
            emitterIndex: 0,
            emitterNodeName: "fire",
            materialState: {
              source: "aurora-mtr",
              parameters: [
                { name: "Broken", kind: "float", values: [1, 2], arity: 1 }
              ]
            }
          }
        ]
      })
    ).toThrow(AppException);
    expect(() =>
      parseVfxProcessPayload({
        packageKind: "model_graph_runtime",
        sourceObjectKey: "modules/current/models/fx_invalid_int.mdl",
        sourceEmitterMaterials: [
          {
            emitterIndex: 0,
            emitterNodeName: "fire",
            materialState: {
              source: "aurora-mtr",
              parameters: [
                { name: "BrokenInt", kind: "int", values: [1.5], arity: 1 }
              ]
            }
          }
        ]
      })
    ).toThrow(AppException);
  });
});
