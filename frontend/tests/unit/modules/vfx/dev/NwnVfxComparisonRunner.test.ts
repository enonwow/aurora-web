import { describe, expect, it } from "vitest";
import * as THREE from "three";
import aoe0Presentation from "../../../../../public/dev-fixtures/vfx-broad-aoe0/presentation-profile.json";
import row1Presentation from "../../../../../public/dev-fixtures/vfx-broad-row1/presentation-profile.json";
import row181Presentation from "../../../../../public/dev-fixtures/vfx-broad-row181/presentation-profile.json";
import row210Presentation from "../../../../../public/dev-fixtures/vfx-broad-row210/presentation-profile.json";
import row216Presentation from "../../../../../public/dev-fixtures/vfx-broad-row216/presentation-profile.json";
import broadRow44Presentation from "../../../../../public/dev-fixtures/vfx-broad-row44/presentation-profile.json";
import row50Presentation from "../../../../../public/dev-fixtures/vfx-broad-row50/presentation-profile.json";
import row50PlaceablePresentation from "../../../../../public/dev-fixtures/vfx-broad-row50-placeable/presentation-profile.json";
import row22Presentation from "../../../../../public/dev-fixtures/vfx-nwn-web-row22/presentation-profile.json";
import row28Presentation from "../../../../../public/dev-fixtures/vfx-nwn-web-row28/presentation-profile.json";
import nwnRow44Presentation from "../../../../../public/dev-fixtures/vfx-nwn-web-row44/presentation-profile.json";
import row68Presentation from "../../../../../public/dev-fixtures/vfx-nwn-web-row68/presentation-profile.json";
import {
  buildNwnVfxComparisonExpectedHostGraph,
  buildNwnVfxComparisonRuntimeCacheKey,
  buildNwnVfxComparisonRuntimeExpectedAssets,
  buildNwnVfxSourceModelTextureBindings,
  bindNwnVfxProofSceneModelMaterialsForTests,
  bindNwnVfxProofSourceWorldSpace,
  createNwnVfxProofSceneDdsTexture,
  createNwnVfxProofRenderFrame,
  createNwnVfxProofSceneAreaLightingLayer,
  createNwnVfxProofSceneTileLightingLayer,
  installNwnVfxProofSceneAreaLighting,
  measureNwnVfxComparisonCameraCalibration,
  prepareNwnVfxProofSceneModelSource,
  resolveNwnVfxComparisonAdditiveRadianceCalibration,
  resolveNwnVfxComparisonBloomProfile,
  resolveNwnVfxComparisonPlaybackMode,
  resolveNwnVfxComparisonCanvasPresentation,
  resolveNwnVfxObjectAttachmentProofTarget,
  resolveNwnVfxComparisonSelfRecordPlan,
  selectNwnVfxObjectAttachmentTargetRoots,
  summarizeNwnVfxProofSceneMaterialLighting,
  resolveNwnVfxComparisonPlaybackTimeline,
  resolveNwnVfxComparisonVisualParityReadiness,
  projectNwnVfxComparisonWorldPointToPixel,
  readNwnVfxComparisonSourceModelGraph,
  resolveNwnVfxProofGroupPosition,
  resolveNwnVfxProofSceneEffectOriginPosition,
  resolveNwnVfxProofSceneLightIntensity,
  resolveNwnVfxProofSceneMeshModelYBounds,
  resolveNwnVfxProofSceneMeshVisibility,
  resolveNwnVfxProofSceneModelTransform,
  resolveNwnVfxProofSceneTileSourceLightWorldPosition,
  type NwnVfxComparisonViewProfile
} from "../../../../../src/modules/vfx/dev/NwnVfxComparisonRunner";
import { materializeVfxPresentationProfile } from "../../../../../src/modules/vfx/domain/vfxIdentityNeutralProfiles";
import {
  buildNwnVfxProofSceneActorProcessPayload,
  createNwnVfxProofSceneActorRuntimeHost,
  isNwnVfxProofSceneActorRuntimeSettled,
  resolveNwnVfxProofSceneActorRendererContract,
  resolveNwnVfxProofSceneActorPosition,
  resolveNwnVfxProofSceneActorRotationY
} from "../../../../../src/modules/vfx/dev/NwnVfxProofSceneActorLoader";
import {
  resolveAuroraRetailDynamicContrastSceneState
} from "../../../../../src/modules/layout/adapters/three/auroraRetailBloomPass";

function readPresentationView(input: unknown): NwnVfxComparisonViewProfile {
  return materializeVfxPresentationProfile(input).viewProfile;
}

describe("NwnVfxComparisonRunner view profiles", () => {
  it("projects typed TXI state into generic source-model bindings", () => {
    expect(
      buildNwnVfxSourceModelTextureBindings(
        [
          {
            resref: "arbitrary_sheet",
            resourceKey: "arbitrary_sheet.tga",
            txi: {
              blending: "additive",
              decal: true,
              proceduretype: "cycle",
              numx: 4,
              numy: 8,
              fps: 30,
              source: "retail/arbitrary_sheet.txi"
            }
          }
        ],
        "/dev-fixtures/arbitrary-proof"
      )
    ).toEqual([
      {
        reference: "arbitrary_sheet",
        assetId: "proof-texture:arbitrary_sheet.tga",
        fileName: "arbitrary_sheet.tga",
        objectKey: "arbitrary_sheet.tga",
        deliveryUrl: "/dev-fixtures/arbitrary-proof/arbitrary_sheet.tga",
        txi: {
          blending: "additive",
          decal: true,
          proceduretype: "cycle",
          numx: 4,
          numy: 8,
          fps: 30
        }
      }
    ]);
  });

  it("reads additive radiance from evidence-bound manifest data without asset identity branching", () => {
    expect(
      resolveNwnVfxComparisonAdditiveRadianceCalibration(
        {
          sourceEvidence: "proof/native-oracle-a.json",
          additiveParticleRadianceScale: 14
        }
      )
    ).toEqual({
      scale: 14,
      sourceEvidence: "proof/native-oracle-a.json"
    });
    expect(
      resolveNwnVfxComparisonAdditiveRadianceCalibration(
        {
          sourceEvidence: "proof/native-oracle-b.json",
          additiveParticleRadianceScale: 3.5
        }
      )
    ).toEqual({
      scale: 3.5,
      sourceEvidence: "proof/native-oracle-b.json"
    });
    expect(
      resolveNwnVfxComparisonAdditiveRadianceCalibration({
        additiveParticleRadianceScale: 14
      })
    ).toBeUndefined();
  });

  it("applies native-baseline proof-light calibration without changing defaults", () => {
    expect(resolveNwnVfxProofSceneLightIntensity(1, undefined)).toBe(1);
    expect(resolveNwnVfxProofSceneLightIntensity(1, 0)).toBe(0);
    expect(resolveNwnVfxProofSceneLightIntensity(2, 0.45)).toBeCloseTo(0.9, 8);
  });

  it("reads bloom calibration from manifest data without changing the recovered pyramid", () => {
    const profile = resolveNwnVfxComparisonBloomProfile(
      {
        sourceEvidence: "proof/native-oracle-a.json",
        bloomMultiplier: 2
      }
    );

    expect(profile).toMatchObject({
      downscaleOffset: 0,
      downscaleSteps: 7,
      threshold: 1,
      softness: 0.9,
      multiplier: 2
    });
    expect(resolveNwnVfxComparisonBloomProfile({
      sourceEvidence: "proof/native-oracle-b.json",
      bloomMultiplier: 0.75
    })).toMatchObject({
      multiplier: 0.75
    });
    expect(resolveNwnVfxComparisonBloomProfile(undefined)).toMatchObject({
      multiplier: 1
    });
  });

  it("reads frame materialization policy from manifest data instead of fixture identity", () => {
    expect(materializeVfxPresentationProfile(row28Presentation).runtimeFrameMaterialization).toBe(
      "lazy"
    );
    expect(
      materializeVfxPresentationProfile(nwnRow44Presentation)
        .runtimeFrameMaterialization
    ).toBe("eager");
  });

  it("decodes proof-scene DDS assets through the production Aurora texture decoder", () => {
    const bytes = new ArrayBuffer(136);
    const data = new Uint8Array(bytes);
    const view = new DataView(bytes);
    data.set([0x44, 0x44, 0x53, 0x20], 0);
    view.setUint32(12, 4, true);
    view.setUint32(16, 4, true);
    data.set([0x44, 0x58, 0x54, 0x31], 84);
    view.setUint16(128, 0xf800, true);
    view.setUint16(130, 0x0000, true);
    view.setUint32(132, 0, true);

    const texture = createNwnVfxProofSceneDdsTexture(bytes);

    expect(texture).toBeInstanceOf(THREE.DataTexture);
    expect(texture?.image.width).toBe(4);
    expect(texture?.image.height).toBe(4);
    expect(Array.from(texture?.image.data.slice(0, 4) ?? [])).toEqual([
      255,
      0,
      0,
      255
    ]);
    expect(texture?.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(texture?.flipY).toBe(false);
    expect(texture?.userData.auroraSourceFormat).toBe("dds-dxt1");
  });

  it("accepts Aurora TPC DXT1 bytes exposed through a proof-scene DDS path", () => {
    const bytes = new ArrayBuffer(28);
    const view = new DataView(bytes);
    view.setUint32(0, 4, true);
    view.setUint32(4, 4, true);
    view.setUint32(8, 3, true);
    view.setUint32(12, 8, true);
    view.setFloat32(16, 1, true);
    view.setUint16(20, 0xf800, true);
    view.setUint16(22, 0x07e0, true);
    view.setUint32(24, 0x000000e4, true);

    const texture = createNwnVfxProofSceneDdsTexture(bytes);

    expect(texture).toBeInstanceOf(THREE.DataTexture);
    expect(texture?.image.width).toBe(4);
    expect(texture?.image.height).toBe(4);
    expect(texture?.userData.auroraSourceFormat).toBe("tpc-dxt1");
  });

  it("fails visual parity closed when row 22 comparison context is incomplete", () => {
    const readiness = resolveNwnVfxComparisonVisualParityReadiness({
      comparisonContext: {
        cameraMatchEstablished: false,
        sceneMatchEstablished: false,
        ownerTargetMatchEstablished: false,
        comparisonStatus: "open-context-gaps"
      },
      proofScene: {
        meshVisibilityRule: {
          version: "nwn-vfx-proof-scene-mesh-visibility-rule/v1",
          kind: "model-y-maximum",
          maximumY: 0.25,
          comparisonAdmission: "diagnostic-only",
          sourceEvidence: "tests/arbitrary-proof-scene-source"
        },
        models: [
          {
            tileLights: [
              ...Array.from({ length: 5 }, () => ({
                role: "source" as const,
                rendererStatus: "source-node-unresolved" as const
              })),
              ...Array.from({ length: 6 }, () => ({
                role: "main" as const,
                rendererStatus:
                  "static-main-lane-not-reconstructed" as const
              }))
            ]
          }
        ]
      }
    });

    expect(readiness).toEqual({
      status: "diagnostic-only",
      comparisonStatus: "open-context-gaps",
      blockerManifest: [
        "camera-match-unproven",
        "scene-match-unproven",
        "owner-target-match-unproven",
        "proof-scene-mesh-visibility-rule-diagnostic-only",
        "tile-source-lights-unresolved:5",
        "tile-main-lanes-unreconstructed:6"
      ]
    });
  });

  it("does not classify a missing comparison contract as visual parity", () => {
    expect(resolveNwnVfxComparisonVisualParityReadiness({})).toEqual({
      status: "diagnostic-only",
      comparisonStatus: "comparison-context-missing",
      blockerManifest: ["comparison-context-missing"]
    });
  });

  it("accepts visual parity readiness only when every context lane is established", () => {
    expect(
      resolveNwnVfxComparisonVisualParityReadiness({
        comparisonContext: {
          cameraMatchEstablished: true,
          sceneMatchEstablished: true,
          ownerTargetMatchEstablished: true,
          comparisonStatus: "retail-context-matched"
        },
        proofScene: {
          models: [
            {
              tileLights: [
                {
                  role: "source",
                  rendererStatus: "source-node-resolved"
                }
              ]
            }
          ]
        }
      })
    ).toEqual({
      status: "ready",
      comparisonStatus: "retail-context-matched",
      blockerManifest: []
    });
  });

  it("does not treat ARE source references without Aurora tile source slots as parity blockers", () => {
    expect(
      resolveNwnVfxComparisonVisualParityReadiness({
        comparisonContext: {
          cameraMatchEstablished: true,
          sceneMatchEstablished: true,
          ownerTargetMatchEstablished: true,
          comparisonStatus: "retail-context-matched"
        },
        proofScene: {
          models: [
            {
              tileLights: Array.from({ length: 5 }, (_, index) => ({
                role: "source" as const,
                rendererStatus:
                  "source-node-absent-by-aurora-slot-count" as const,
                sourceSlotIndex: ((index % 2) + 1) as 1 | 2,
                sourceNodeCount: 0,
                sourceSlotProofStatus:
                  "source-backed-tile-mdl-source-light-slot-count" as const
              }))
            }
          ]
        }
      })
    ).toEqual({
      status: "ready",
      comparisonStatus: "retail-context-matched",
      blockerManifest: []
    });
  });

  it("fails closed at baseline unless fixed time or one-shot capture is explicit", () => {
    expect(
      resolveNwnVfxComparisonPlaybackMode("?fixture=vfx-nwn-web-row22")
    ).toBe("baseline-unarmed");
    expect(
      resolveNwnVfxComparisonPlaybackMode(
        "?fixture=vfx-nwn-web-row22&capture=armed"
      )
    ).toBe("armed");
    expect(
      resolveNwnVfxComparisonPlaybackMode(
        "?fixture=vfx-nwn-web-row22&capture=autoplay"
      )
    ).toBe("autoplay");
    expect(
      resolveNwnVfxComparisonPlaybackMode(
        "?fixture=vfx-nwn-web-row22&capture=self-record"
      )
    ).toBe("self-record");
    expect(
      resolveNwnVfxComparisonPlaybackMode(
        "?fixture=vfx-nwn-web-row22&capture=static-timeline"
      )
    ).toBe("static-timeline");
    expect(
      resolveNwnVfxComparisonPlaybackMode(
        "?fixture=vfx-nwn-web-row22&time=1"
      )
    ).toBe("fixed-time");
    expect(resolveNwnVfxComparisonCanvasPresentation("?viewport=native")).toBe(
      "native-pixels"
    );
    expect(resolveNwnVfxComparisonCanvasPresentation("")).toBe(
      "viewport-contain"
    );
    expect(resolveNwnVfxComparisonSelfRecordPlan()).toEqual({
      fps: 12,
      durationSeconds: 15.5,
      frameCount: 187,
      chunkSize: 12
    });
  });

  it("preserves an object attachment anchor when no proof-scene motion is configured", () => {
    expect(
      resolveNwnVfxProofGroupPosition(
        [0.025, 1.432, -0.098],
        undefined,
        3
      )
    ).toEqual([0.025, 1.432, -0.098]);
  });

  it("composes proof-scene motion onto the attachment anchor", () => {
    expect(
      resolveNwnVfxProofGroupPosition(
        [1, 2, 3],
        {
          from: [0, 0, 0],
          to: [4, 2, -2],
          durationSeconds: 4
        },
        2
      )
    ).toEqual([3, 3, 2]);
  });

  it("applies a source-coordinate native-oracle VFX alignment without moving the proof scene", () => {
    expect(
      resolveNwnVfxProofSceneEffectOriginPosition(
        [0, 0, 0],
        {
          offset: [1.25, 3.55, 0],
          sourceEvidence:
            "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/nwn-final/v1/validated-summary.json",
          method: "native-vfx-positive-luminance-centroid"
        }
      )
    ).toEqual([1.25, 0, 3.55]);
    expect(
      resolveNwnVfxProofSceneEffectOriginPosition([1, 2, 3], undefined)
    ).toEqual([1, 2, 3]);
    expect(
      resolveNwnVfxProofSceneEffectOriginPosition(
        [1, 2, 3],
        {
          offset: [0, 0, 0],
          sourceEvidence: "source-location-evidence.json",
          method: "source-location-rebased-scene-origin"
        }
      )
    ).toEqual([1, 2, 3]);
  });

  it("plays a source-authoritative Aurora animation at speed one without an image-fit delay", () => {
    expect(
      resolveNwnVfxComparisonPlaybackTimeline({
        elapsedSeconds: 3.25,
        preRollSeconds: 2,
        durationSeconds: 4.633333333333333,
        playbackRate: 1,
        playbackDelaySeconds: 0
      })
    ).toMatchObject({
      wallEffectSeconds: 1.25,
      playbackSeekSeconds: 1.25,
      playbackRate: 1,
      playbackDelaySeconds: 0,
      phase: "effect"
    });
  });

  it("selects only the target creature for object-attached VFX", () => {
    const source = new THREE.Group();
    source.userData.auroraVfxProofSceneActorRole = "source_creature";
    const target = new THREE.Group();
    target.userData.auroraVfxProofSceneActorRole = "target_creature";

    expect(selectNwnVfxObjectAttachmentTargetRoots([source, target])).toEqual([
      target
    ]);
  });

  it("resolves an exact placeable proof-scene model as the attachment target", () => {
    const actor = new THREE.Group();
    actor.userData.auroraVfxProofSceneActorRole = "target_creature";
    const firstPlaceable = new THREE.Group();
    firstPlaceable.name = "bakery-fire-01";
    firstPlaceable.userData.auroraVfxProofSceneModelInstanceId =
      "bakery-fire-01";
    const targetPlaceable = new THREE.Group();
    targetPlaceable.name = "bakery-fire-02";
    targetPlaceable.userData.auroraVfxProofSceneModelInstanceId =
      "bakery-fire-02";

    expect(
      resolveNwnVfxObjectAttachmentProofTarget({
        contract: {
          version: "aurora-vfx-object-attachment-target/v1",
          phase: "impact",
          targetKind: "placeable",
          sourceKind: "proof-scene-model-instance",
          sourceId: "bakery-fire-02",
          targetSpecialNodePrefix: "T04"
        },
        actorRoots: [actor],
        modelRoots: [firstPlaceable, targetPlaceable]
      })
    ).toEqual({
      status: "resolved",
      phase: "impact",
      targetKind: "placeable",
      targetSpecialNodePrefix: "T04",
      targetRoots: [targetPlaceable]
    });
  });

  it("restores source-backed plc_t04 attachment nodes without moving baked geometry", () => {
    const source = new THREE.Group();
    source.userData = {
      aurora: {
        sourceModel: "plc_t04",
        sourceHierarchy: [
          {
            name: "PLC_T04",
            nodeType: "dummy",
            position: [0, 0, 0],
            scale: 1
          },
          {
            name: "T04_head_hit",
            nodeType: "dummy",
            parentName: "PLC_T04",
            position: [
              0.003984369803220034,
              0.010825200006365776,
              0.4024119973182678
            ],
            orientation: [0, 0, 0, 1],
            orientationFormat: "quaternion",
            scale: 1
          },
          {
            name: "Plane25",
            nodeType: "trimesh",
            parentName: "PLC_T04",
            position: [
              -0.006644799839705229,
              -0.002418600022792816,
              0.019999999552965164
            ],
            orientation: [0, 0, 0, 1],
            orientationFormat: "quaternion",
            scale: 1
          }
        ]
      }
    };
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0.25, 0.5, -0.75], 3)
    );
    const plane = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    plane.name = "Plane25";
    plane.position.set(1, 2, 3);
    source.add(plane);
    source.updateMatrixWorld(true);
    const worldVertexBefore = new THREE.Vector3()
      .fromBufferAttribute(geometry.getAttribute("position"), 0)
      .applyMatrix4(plane.matrixWorld);

    const result = prepareNwnVfxProofSceneModelSource(source);
    source.updateMatrixWorld(true);
    const root = source.getObjectByName("PLC_T04");
    const headHit = source.getObjectByName("T04_head_hit");
    const worldVertexAfter = new THREE.Vector3()
      .fromBufferAttribute(plane.geometry.getAttribute("position"), 0)
      .applyMatrix4(plane.matrixWorld);

    expect(result.synthesizedNodeNames).toEqual(["PLC_T04", "T04_head_hit"]);
    expect(root?.parent).toBe(source);
    expect(headHit?.parent).toBe(root);
    expect(headHit?.position.toArray()).toEqual([
      expect.closeTo(0.003984369803220034, 8),
      expect.closeTo(0.4024119973182678, 8),
      expect.closeTo(0.010825200006365776, 8)
    ]);
    expect(worldVertexAfter.distanceTo(worldVertexBefore)).toBeLessThan(1e-6);
    expect(source.userData.auroraVfxProofSceneSourceHierarchyStatus).toBe(
      "restored"
    );
  });

  it("fails closed when a non-creature attachment target contract is incomplete", () => {
    const targetPlaceable = new THREE.Group();
    targetPlaceable.userData.auroraVfxProofSceneModelInstanceId =
      "bakery-fire-02";

    expect(
      resolveNwnVfxObjectAttachmentProofTarget({
        contract: {
          version: "aurora-vfx-object-attachment-target/v1",
          phase: "impact",
          targetKind: "placeable",
          sourceKind: "proof-scene-model-instance",
          sourceId: "bakery-fire-02"
        },
        actorRoots: [],
        modelRoots: [targetPlaceable]
      })
    ).toEqual({
      status: "contract-invalid",
      phase: "impact",
      targetKind: "placeable",
      targetSpecialNodePrefix: "",
      targetRoots: []
    });
  });

  it("drives arbitrary proof-scene mesh visibility thresholds from the typed rule", () => {
    const lowerRule = {
      version: "nwn-vfx-proof-scene-mesh-visibility-rule/v1" as const,
      kind: "model-y-maximum" as const,
      maximumY: 0.75,
      comparisonAdmission: "comparison-scene" as const,
      sourceEvidence: "tests/arbitrary-lower-threshold"
    };
    const higherRule = {
      ...lowerRule,
      maximumY: 2.5,
      sourceEvidence: "tests/arbitrary-higher-threshold"
    };

    expect(
      resolveNwnVfxProofSceneMeshVisibility(lowerRule, { minY: 0, maxY: 0 })
    ).toBe(true);
    expect(
      resolveNwnVfxProofSceneMeshVisibility(lowerRule, {
        minY: 0.03,
        maxY: 1.13
      })
    ).toBe(false);
    expect(
      resolveNwnVfxProofSceneMeshVisibility(higherRule, {
        minY: 0.03,
        maxY: 1.13
      })
    ).toBe(true);
  });

  it("filters proof-scene meshes by immutable model-space bounds instead of raw local geometry bounds", () => {
    const source = new THREE.Group();
    const nativeHierarchyParent = new THREE.Group();
    nativeHierarchyParent.position.y = -3;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.translate(0, 3, 0);
    const floor = new THREE.Mesh(geometry);
    nativeHierarchyParent.add(floor);
    source.add(nativeHierarchyParent);
    source.updateMatrixWorld(true);

    geometry.computeBoundingBox();
    expect(geometry.boundingBox?.max.y).toBeCloseTo(3.5);

    const modelBounds = resolveNwnVfxProofSceneMeshModelYBounds(floor);
    expect(modelBounds.minY).toBeCloseTo(-0.5);
    expect(modelBounds.maxY).toBeCloseTo(0.5);
    expect(
      resolveNwnVfxProofSceneMeshVisibility(
        {
          version: "nwn-vfx-proof-scene-mesh-visibility-rule/v1",
          kind: "model-y-maximum",
          maximumY: 1.3,
          comparisonAdmission: "comparison-scene",
          sourceEvidence: "tests/arbitrary-model-bounds"
        },
        modelBounds
      )
    ).toBe(true);
  });

  it("seeks past the terminal runtime frame for a final post-roll instead of truncating the playback state", () => {
    expect(
      resolveNwnVfxComparisonPlaybackTimeline({
        elapsedSeconds: 22.966666666666665,
        preRollSeconds: 2,
        durationSeconds: 20
      })
    ).toEqual({
      effectSeconds: 20.966666666666665,
      clampedEffectSeconds: 20,
      playbackSeekSeconds: 20.966666666666665,
      wallEffectSeconds: 20.966666666666665,
      playbackRate: 1,
      playbackDelaySeconds: 0,
      effectiveWallDurationSeconds: 20,
      phase: "post",
      groupVisible: false
    });
  });

  it("maps the row 28 source timeline onto the accepted native onset and last-visible endpoints", () => {
    const timing = {
      preRollSeconds: 2,
      durationSeconds: 4.633333333333333,
      playbackRate: 5 / 3,
      playbackDelaySeconds: 2 / 15
    };

    const nativeDelay = resolveNwnVfxComparisonPlaybackTimeline({
      ...timing,
      elapsedSeconds: 2.1
    });
    expect(nativeDelay).toMatchObject({
      effectSeconds: 0,
      playbackSeekSeconds: 0,
      playbackRate: 5 / 3,
      playbackDelaySeconds: 2 / 15,
      phase: "baseline",
      groupVisible: false
    });
    expect(nativeDelay.wallEffectSeconds).toBeCloseTo(0.1, 8);

    const nativeOnset = resolveNwnVfxComparisonPlaybackTimeline({
      ...timing,
      elapsedSeconds: 2 + 1 / 3
    });
    expect(nativeOnset.effectSeconds).toBeCloseTo(1 / 3, 8);
    expect(nativeOnset.phase).toBe("effect");
    expect(nativeOnset.groupVisible).toBe(true);

    const nativeLastVisible = resolveNwnVfxComparisonPlaybackTimeline({
      ...timing,
      elapsedSeconds: 2 + 7 / 3
    });
    expect(nativeLastVisible.effectSeconds).toBeCloseTo(11 / 3, 8);
    expect(nativeLastVisible.phase).toBe("effect");
    expect(nativeLastVisible.groupVisible).toBe(true);
    expect(nativeLastVisible.effectiveWallDurationSeconds).toBeCloseTo(
      2 / 15 + 4.633333333333333 / (5 / 3),
      8
    );
  });

  it("keeps fixed-time calibration frames in source time despite native playback timing calibration", () => {
    expect(
      resolveNwnVfxComparisonPlaybackTimeline({
        elapsedSeconds: 0,
        preRollSeconds: 2,
        durationSeconds: 4.633333333333333,
        fixedTimeSeconds: 1.8333333333333333,
        playbackRate: 5 / 3,
        playbackDelaySeconds: 2 / 15
      })
    ).toMatchObject({
      effectSeconds: 1.8333333333333333,
      playbackSeekSeconds: 1.8333333333333333,
      wallEffectSeconds: 0,
      phase: "effect",
      groupVisible: true
    });
  });

  it("views row 44 world-Z quads from above their mapped Three X/Z plane", () => {
    const profile = readPresentationView(nwnRow44Presentation);

    expect(profile.projection).toBe("orthographic");
    expect(profile.cameraPosition[1]).toBeGreaterThan(profile.cameraLookAt[1]);
    expect(profile.cameraPosition[2]).toBeGreaterThan(profile.cameraLookAt[2]);
  });

  it("uses the saved-retail scene calibration for row 68 instead of the old diagnostic capsule view", () => {
    const profile = readPresentationView(row68Presentation);

    expect(profile.projection).toBe("perspective");
    expect(profile.viewportWidth / profile.viewportHeight).toBeCloseTo(880 / 750, 8);
    expect(profile.cameraPosition).toEqual([0.05148, 6.051473, -4.371987]);
    expect(profile.cameraLookAt).toEqual([0.03482, 0.01, 3.737955]);
    expect(profile.perspectiveFovDegrees).toBeCloseTo(36.743818, 6);
    expect(profile.cameraStatus).toBe(
      "retail-frame-origin-and-planar-receiver-calibrated-camera-transform-not-exact"
    );
    expect(profile.cameraSourceEvidence).toContain(
      "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row68/nwn/scripts/vfx68entry.nss"
    );
  });

  it("uses the accepted row 28 native Area baseline, camera, and exact native viewport", () => {
    const profile = readPresentationView(row28Presentation);

    expect(profile.projection).toBe("perspective");
    expect(profile.viewportWidth).toBe(1460);
    expect(profile.viewportHeight).toBe(810);
    expect(profile.cameraPosition).toEqual([0.05148, 6.051473, -4.371987]);
    expect(profile.cameraLookAt).toEqual([0.03482, 0.01, 3.737955]);
    expect(profile.perspectiveFovDegrees).toBeCloseTo(39.463808, 6);
    expect(profile.cameraViewOffsetPixels).toEqual([70, 50]);
    expect(profile.cameraStatus).toBe(
      "accepted-row28-native-baseline-reuses-same-area-camera-and-exact-native-viewport"
    );
    expect(profile.cameraSourceEvidence).toContain(
      "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/nwn-final/v1/nwn-row28-baseline.png"
    );
    expect(profile.cameraCalibration).toMatchObject({
      status: "saved-retail-origin-and-planar-receiver-fit",
      sourceFrame:
        "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/nwn-final/v1/nwn-row28-baseline.png",
      rmsTolerancePixels: 8
    });
    expect(profile.cameraCalibration?.samples.at(-1)).toEqual({
      worldPosition: [0, 0.01, 0],
      retailPixelPosition: [667.0075, 710.0275]
    });
    expect(measureNwnVfxComparisonCameraCalibration(profile)).toMatchObject({
      status: "pass",
      sampleCount: 5,
      tolerancePixels: 8
    });
  });

  it("uses the saved-retail source-origin and planar receiver calibration for row 22", () => {
    const profile = readPresentationView(row22Presentation);

    expect(profile.projection).toBe("perspective");
    expect(profile.viewportWidth / profile.viewportHeight).toBeCloseTo(880 / 750, 8);
    expect(profile.cameraPosition).toEqual([0.05148, 6.051473, -4.371987]);
    expect(profile.cameraUp).toEqual([0, 1, 0]);
    expect(profile.cameraLookAt).toEqual([0.03482, 0.01, 3.737955]);
    expect(profile.perspectiveFovDegrees).toBeCloseTo(36.743818, 6);
    expect(profile.cameraStatus).toBe(
      "retail-frame-origin-and-planar-receiver-calibrated-camera-transform-not-exact"
    );

    const samples = [
      { world: [2.32, 0.01, 8.86], retailPixel: [254, 131] },
      { world: [2.11, 0.01, 3.58], retailPixel: [207, 384] },
      { world: [-3.32, 0.01, 3.54], retailPixel: [816, 384] },
      { world: [-3.16, 0.01, 9.02], retailPixel: [696, 131] },
      { world: [0, 0.01, 0], retailPixel: [447, 730] }
    ] as const;
    const squaredErrors = samples.map(({ world, retailPixel }) => {
      const projected = projectNwnVfxComparisonWorldPointToPixel(profile, world);
      return (
        (projected[0] - retailPixel[0]) ** 2 +
        (projected[1] - retailPixel[1]) ** 2
      );
    });
    const rmsErrorPixels = Math.sqrt(
      squaredErrors.reduce((sum, value) => sum + value, 0) /
        squaredErrors.length
    );
    expect(rmsErrorPixels).toBeLessThanOrEqual(8);
  });

  it("maps source area tile positions and orientations through Aurora C=(x,z,y)", () => {
    const transform = resolveNwnVfxProofSceneModelTransform({
      translation: [-4.5, 1.2, 0],
      orientationQuarterTurns: 3
    });

    expect(transform.position).toEqual([-4.5, 0, 1.2]);
    expect(transform.rotationYRadians).toBeCloseTo(Math.PI / 2, 10);
  });

  it("projects the preserved first-PC source origin onto the saved player location", () => {
    const pixel = projectNwnVfxComparisonWorldPointToPixel(
      readPresentationView(row22Presentation),
      [0, 0.01, 0]
    );
    expect(Math.hypot(pixel[0] - 447, pixel[1] - 730)).toBeLessThanOrEqual(1);
  });

  it("applies the production Area X mirror once to the complete proof frame", () => {
    const frame = createNwnVfxProofRenderFrame();
    const sourcePoint = new THREE.Object3D();
    sourcePoint.position.set(2, 3, 4);
    frame.add(sourcePoint);
    frame.updateMatrixWorld(true);

    expect(sourcePoint.getWorldPosition(new THREE.Vector3()).toArray()).toEqual([
      -2,
      3,
      4
    ]);
    expect(frame.userData.auroraAreaRenderFrameMirror).toBe("coordinate-x");
    expect(frame.userData.auroraVfxProofRenderFrameStatus).toBe(
      "production-area-coordinate-x-mirror-applied-once"
    );
  });

  it("keeps standalone proof VFX in the source world space without changing positions, sizes, or light ranges", () => {
    const group = new THREE.Group();
    group.position.set(2, 3, 4);
    const sourceNode = new THREE.Object3D();
    sourceNode.position.set(10, 20, 30);
    const sourceLight = new THREE.PointLight(0xffffff, 1, 24);
    sourceNode.add(sourceLight);
    group.add(sourceNode);

    bindNwnVfxProofSourceWorldSpace(group);
    bindNwnVfxProofSourceWorldSpace(group);
    group.updateMatrixWorld(true);

    expect(group.position.toArray()).toEqual([2, 3, 4]);
    expect(group.scale.toArray()).toEqual([1, 1, 1]);
    expect(sourceNode.getWorldPosition(new THREE.Vector3()).toArray()).toEqual([
      12,
      23,
      34
    ]);
    expect(sourceLight.distance).toBe(24);
    expect(group.userData.auroraVfxProofSourceWorldScale).toBe(1);
    expect(group.userData.auroraVfxProofSourceWorldSpaceStatus).toBe(
      "standalone-source-values-preserved"
    );
  });

  it("preserves Aurora screen handedness through the row 216 proof frame and camera", () => {
    const profile = readPresentationView(row216Presentation);
    const frame = createNwnVfxProofRenderFrame();
    const projectAuroraPoint = (
      [x, y, z]: readonly [number, number, number]
    ): [number, number] => {
      const point = new THREE.Object3D();
      point.position.set(x, z, y);
      frame.add(point);
      frame.updateMatrixWorld(true);
      const world = point.getWorldPosition(new THREE.Vector3());
      return projectNwnVfxComparisonWorldPointToPixel(profile, world.toArray());
    };

    const center = projectAuroraPoint([0, 1.5, 1.35]);
    const positiveX = projectAuroraPoint([1, 1.5, 1.35]);
    const negativeX = projectAuroraPoint([-1, 1.5, 1.35]);
    const effectiveBasis = new THREE.Matrix3().set(
      -1, 0, 0,
      0, 0, 1,
      0, 1, 0
    );

    expect(effectiveBasis.determinant()).toBeCloseTo(1, 12);
    expect(positiveX[0]).toBeGreaterThan(center[0]);
    expect(negativeX[0]).toBeLessThan(center[0]);
    expect(positiveX[1]).toBeCloseTo(center[1], 10);
    expect(negativeX[1]).toBeCloseTo(center[1], 10);
  });

  it("maps a retail tile sl1 node through the model tile transform", () => {
    const worldPosition =
      resolveNwnVfxProofSceneTileSourceLightWorldPosition(
        {
          instanceId: "enon_test_effect:tile-0",
          translation: [-4.5, 1.2, 0],
          orientationQuarterTurns: 2
        },
        [-1.265779972076416, 1.5742100477218628, 0.9857010245323181]
      );

    expect(worldPosition[0]).toBeCloseTo(-3.234220027923584, 8);
    expect(worldPosition[1]).toBeCloseTo(0.9857010245323181, 8);
    expect(worldPosition[2]).toBeCloseTo(-0.3742100477218628, 8);
  });

  it("renders source-backed native main and source tile-light nodes", () => {
    const layer = createNwnVfxProofSceneTileLightingLayer([
      {
        instanceId: "enon_test_effect:tile-0",
        translation: [-4.5, 1.2, 0],
        orientationQuarterTurns: 2,
        tileLights: [
          {
            channel: "mainLight1",
            role: "main",
            rowId: 4,
            colorRgb: [0.94, 0.94, 0.5],
            colorSource: "nwn_base.key/lightcolor.2da",
            rendererStatus: "main-native-node-resolved",
            nativeNode: {
              name: "TIN01_H01_02ml1",
              position: [0, 0, 5],
              coordinateSpace: "model-local-aurora-z-up",
              radius: 14,
              multiplier: 1,
              lightPriority: 5,
              ambientOnly: false,
              affectDynamic: true,
              shadow: false
            }
          },
          {
            channel: "sourceLight1",
            role: "source",
            rowId: 3,
            colorRgb: [0.49, 0.29, 0.07],
            colorSource: "nwn_base.key/tilecolor.2da",
            rendererStatus: "source-node-resolved",
            sourceNode: {
              name: "TIN01_H01_02sl1",
              position: [
                -1.265779972076416,
                1.5742100477218628,
                0.9857010245323181
              ],
              coordinateSpace: "model-local-aurora-z-up"
            },
            sourceRadius: 7,
            sourceRadiusUnits: "aurora-model-units",
            sourceMultiplier: 1,
            sourceMultiplierStatus: "neutral-1.0-fallback"
          },
          {
            channel: "sourceLight2",
            role: "source",
            rowId: 3,
            colorRgb: [0.49, 0.29, 0.07],
            colorSource: "nwn_base.key/tilecolor.2da",
            rendererStatus: "source-node-absent-by-aurora-slot-count",
            sourceSlotIndex: 2,
            sourceNodeCount: 1,
            sourceSlotProofStatus:
              "source-backed-tile-mdl-source-light-slot-count",
            sourceRadius: 7,
            sourceRadiusUnits: "aurora-model-units"
          }
        ]
      }
    ]);

    expect(layer).not.toBeNull();
    expect(
      layer?.userData.auroraVfxProofSceneTileLightingResolvedSourceCount
    ).toBe(1);
    expect(
      layer?.userData.auroraVfxProofSceneTileLightingUnresolvedSourceCount
    ).toBe(0);
    expect(
      layer?.userData.auroraVfxProofSceneTileLightingAbsentSourceCount
    ).toBe(1);
    expect(layer?.userData.auroraVfxProofSceneTileLightingResolvedMainCount).toBe(1);
    expect(layer?.userData.auroraVfxProofSceneTileLightingUnresolvedMainCount).toBe(0);
    const pointLights = layer?.children.filter(
      (child): child is THREE.PointLight => child instanceof THREE.PointLight
    );
    expect(pointLights).toHaveLength(2);
    const mainLight = pointLights?.find(
      (light) => light.userData.auroraTerrainTileLightRole === "main"
    );
    const sourceLight = pointLights?.find(
      (light) => light.userData.auroraTerrainTileLightRole === "source"
    );
    expect(mainLight?.position.toArray()).toEqual([
      expect.closeTo(-4.5, 8),
      expect.closeTo(5, 8),
      expect.closeTo(1.2, 8)
    ]);
    expect(mainLight?.distance).toBe(14);
    expect(mainLight?.intensity).toBeCloseTo(1, 8);
    expect(mainLight?.userData.auroraVfxProofSceneTileLightRendererStatus).toBe(
      "main-native-node-resolved"
    );
    expect(sourceLight?.color.r).toBeCloseTo(1, 8);
    expect(sourceLight?.color.g).toBeCloseTo(1, 8);
    expect(sourceLight?.color.b).toBeCloseTo(1 / Math.fround(1.9), 8);
    expect(sourceLight?.intensity).toBeCloseTo(Math.fround(1.9), 8);
    expect(sourceLight?.distance).toBe(7);
    expect(sourceLight?.userData.auroraTerrainTileLightColor).toEqual([
      expect.closeTo(1.9, 5),
      expect.closeTo(1.9, 5),
      1
    ]);
    expect(sourceLight?.userData.auroraTerrainTileLightColorSource).toContain(
      "fx_flame01.mdl"
    );
    expect(sourceLight?.userData.auroraTerrainTileLightSourceAnimationName).toBe(
      "3"
    );
    expect(
      sourceLight?.userData.auroraTerrainTileLightStaleColorCorrectionStatus
    ).toBe("corrected-stale-tilecolor-source");
    expect(
      sourceLight?.userData.auroraTerrainTileLightSourceMultiplierSource
    ).toContain("PartLight::PartLight");
    expect(sourceLight?.position.x).toBeCloseTo(-3.234220027923584, 8);
    expect(sourceLight?.position.y).toBeCloseTo(0.9857010245323181, 8);
    expect(sourceLight?.position.z).toBeCloseTo(-0.3742100477218628, 8);
  });

  it("maps the target actor position through the same Aurora C=(x,z,y) basis", () => {
    expect(
      resolveNwnVfxProofSceneActorPosition({
        normalizedPosition: [1.25, 3.5, 0.4]
      })
    ).toEqual([1.25, 0.4, 3.5]);
  });

  it("maps the scripted Aurora XY forward vector onto the proof actor's +Z model front", () => {
    expect(
      resolveNwnVfxProofSceneActorRotationY({
        sourceForwardAuroraXY: [0, -1]
      })
    ).toBeCloseTo(Math.PI, 10);
    expect(
      resolveNwnVfxProofSceneActorRotationY({
        sourceForwardAuroraXY: [1, 0]
      })
    ).toBeCloseTo(Math.PI / 2, 10);
  });

  it("forwards an exact BIC-derived modular creature package without replacing its gender", () => {
    const payload = buildNwnVfxProofSceneActorProcessPayload({
      processResRef: "proof_avri461",
      appearanceId: 6,
      creatureMetadata: {
        appearanceId: 6,
        gender: 1,
        race: 6,
        phenotype: 0,
        equipItemListEntries:
          '[{"resRef":"nw_cloth001","slotMask":2}]'
      },
      creatureAppearanceOverride: {
        appearanceType: 6,
        appearanceHead: 1,
        bodyParts: { torso: 1 },
        colors: { skin: 0, hair: 0 }
      }
    });

    expect(payload).toEqual({
      resref: "proof_avri461",
      bypassCache: true,
      includeBenchmarkMetadata: false,
      creatureMetadata: {
        appearanceId: 6,
        gender: 1,
        race: 6,
        phenotype: 0,
        equipItemListEntries:
          '[{"resRef":"nw_cloth001","slotMask":2}]'
      },
      creatureAppearanceOverride: {
        appearanceType: 6,
        appearanceHead: 1,
        bodyParts: { torso: 1 },
        colors: { skin: 0, hair: 0 }
      }
    });
  });

  it("keeps each proof actor in a separate hidden runtime host", () => {
    const host = document.createElement("div");
    const sourceHost = createNwnVfxProofSceneActorRuntimeHost(host, "source");
    const targetHost = createNwnVfxProofSceneActorRuntimeHost(host, "target");

    expect(host.children).toHaveLength(2);
    expect(sourceHost).not.toBe(targetHost);
    expect(sourceHost.dataset.vfxProofActorInstanceId).toBe("source");
    expect(targetHost.dataset.vfxProofActorInstanceId).toBe("target");
  });

  it("renders proof-scene actors in source model units without catalog normalization", () => {
    expect(resolveNwnVfxProofSceneActorRendererContract()).toEqual({
      renderAreaGeometry: false,
      creatureModelPresentationMode: "source-model-units"
    });
  });

  it("accepts a fully loaded modular actor as settled without a synthetic complete phase", () => {
    expect(
      isNwnVfxProofSceneActorRuntimeSettled({
        placeableModelStatus: "loaded",
        placeableModelLoadPhase: "creature-part-models",
        placeableModelLoadCompleted: "17",
        placeableModelLoadTotal: "17",
        placeableModelTextureStatus: "applied",
        creatureAnimationRuntimePlaybackStatuses: "playing"
      })
    ).toBe(true);
  });

  it("keeps an incomplete modular actor outside the proof settlement gate", () => {
    expect(
      isNwnVfxProofSceneActorRuntimeSettled({
        placeableModelStatus: "loading",
        placeableModelLoadPhase: "creature-part-models",
        placeableModelLoadCompleted: "16",
        placeableModelLoadTotal: "17",
        placeableModelTextureStatus: "applied",
        creatureAnimationRuntimePlaybackStatuses: "playing"
      })
    ).toBe(false);
  });

  it("fails closed when actor settlement telemetry is only partially populated", () => {
    expect(
      isNwnVfxProofSceneActorRuntimeSettled({
        placeableModelLoadPhase: "creature-part-models"
      })
    ).toBe(false);
  });

  it("recreates source ARE ambient and diffuse baseline lights for proof scenes", () => {
    const layer = createNwnVfxProofSceneAreaLightingLayer({
      status: "source-backed-are-global-ambient-diffuse",
      areaResref: "enon_test_effect",
      phase: "moon",
      ambientColorPacked: 0x3c3c3c,
      ambientColorRgb: [60 / 255, 60 / 255, 60 / 255],
      diffuseColorPacked: 0xaaaaaa,
      diffuseColorRgb: [170 / 255, 170 / 255, 170 / 255],
      directionalPosition: [-0.35, 0.72, -0.5],
      localTileLightingStatus: "not-reconstructed-in-proof-scene"
    });

    expect(layer?.children).toHaveLength(2);
    const ambient = layer?.children.find(
      (child): child is THREE.AmbientLight => child instanceof THREE.AmbientLight
    );
    const diffuse = layer?.children.find(
      (child): child is THREE.DirectionalLight =>
        child instanceof THREE.DirectionalLight
    );
    expect(ambient?.intensity).toBe(1);
    expect(ambient?.color.toArray()).toEqual([60 / 255, 60 / 255, 60 / 255]);
    expect(diffuse?.intensity).toBe(1);
    expect(diffuse?.color.toArray()).toEqual([170 / 255, 170 / 255, 170 / 255]);
    expect(diffuse?.position.toArray()).toEqual([-0.35, 0.72, -0.5]);
    expect(layer?.userData.auroraVfxProofSceneLocalTileLightingStatus).toBe(
      "not-reconstructed-in-proof-scene"
    );
  });

  it("installs shared source-MDL material lighting while binding proof-scene textures", () => {
    const litMaterial = new THREE.MeshStandardMaterial();
    litMaterial.userData = {
      aurora: {
        textureReference: "tin01_plank",
        material: {
          format: "aurora-mdl-material",
          ambient: [0.2, 0.2, 0.2],
          diffuse: [0.8, 0.8, 0.8]
        }
      }
    };
    const unlitMaterial = new THREE.MeshBasicMaterial();
    unlitMaterial.userData = {
      aurora: {
        textureReference: "tin01_innrug",
        material: {
          format: "aurora-mdl-material",
          ambient: [0.2, 0.2, 0.2],
          diffuse: [0.8, 0.8, 0.8]
        }
      }
    };
    const source = new THREE.Group();
    source.add(
      new THREE.Mesh(new THREE.PlaneGeometry(1, 1), litMaterial),
      new THREE.Mesh(new THREE.PlaneGeometry(1, 1), unlitMaterial)
    );
    const plank = new THREE.Texture();
    const rug = new THREE.Texture();

    bindNwnVfxProofSceneModelMaterialsForTests(
      source,
      new Map([
        ["tin01_plank", plank],
        ["tin01_innrug", rug]
      ])
    );

    expect(litMaterial.map).toBe(plank);
    expect(plank.wrapS).toBe(THREE.RepeatWrapping);
    expect(plank.wrapT).toBe(THREE.RepeatWrapping);
    expect(plank.userData.auroraVfxProofSceneTextureWrapStatus).toBe(
      "aurora-model-uv-repeat"
    );
    expect(litMaterial.userData.auroraMdlMaterialLightingStatus).toBe(
      "source-mdl-ambient-diffuse-separated"
    );
    expect(litMaterial.userData.auroraMdlMaterialAmbientToDiffuse).toEqual([
      0.047366,
      0.047366,
      0.047366
    ]);
    expect(unlitMaterial.map).toBe(rug);
    expect(rug.wrapS).toBe(THREE.RepeatWrapping);
    expect(rug.wrapT).toBe(THREE.RepeatWrapping);
    expect(unlitMaterial.userData.auroraMdlMaterialLightingInstalled).toBeUndefined();
    expect(summarizeNwnVfxProofSceneMaterialLighting([source])).toEqual({
      visibleMaterialCount: 2,
      installedCount: 1,
      unsupportedMaterialCount: 1,
      sourceMaterialUnavailableCount: 0,
      unsupportedSourceProvenanceCount: 0,
      unsupportedZeroDiffuseChannelCount: 0,
      blockerManifest: ["proof-scene-mdl-material-unsupported:1"]
    });
  });

  it("registers proof-scene ARE lights with retail dynamic contrast", () => {
    const scene = new THREE.Scene();
    const layer = installNwnVfxProofSceneAreaLighting(scene, {
      status: "source-backed-are-global-ambient-diffuse",
      areaResref: "enon_test_effect",
      phase: "moon",
      ambientColorRgb: [60 / 255, 60 / 255, 60 / 255],
      diffuseColorRgb: [170 / 255, 170 / 255, 170 / 255],
      directionalPosition: [-0.35, 0.72, -0.5]
    });
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(0, 3, 6);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);

    const dynamicContrast = resolveAuroraRetailDynamicContrastSceneState(
      scene,
      camera,
      0.5
    );

    expect(layer).not.toBeNull();
    expect(scene.userData.auroraTerrainAreaGlobalLightingStatus).toBe("active");
    expect(dynamicContrast).toMatchObject({
      status: "source-backed-scene-light-input-active",
      areaAmbientLightCount: 1,
      areaDiffuseLightCount: 1
    });
  });

  it("frames both Type 7 beam fixtures against the shared retail source-target scene", () => {
    const ray = readPresentationView(row210Presentation);
    const lash = readPresentationView(row216Presentation);

    expect(ray.projection).toBe("perspective");
    expect(ray.cameraUp).toEqual([0, 1, 0]);
    expect(lash.projection).toBe("perspective");
    expect(lash.cameraUp).toEqual([0, 1, 0]);
    expect(ray.cameraPosition).toEqual(lash.cameraPosition);
    expect(ray.cameraLookAt).toEqual(lash.cameraLookAt);
    expect(ray.perspectiveFovDegrees).toBe(lash.perspectiveFovDegrees);
    expect(lash.cameraPosition).toEqual([0, 3.38725, -2.8155]);
    expect(lash.cameraPosition[2]).toBeLessThan(lash.cameraLookAt[2]);
    expect(lash.cameraLookAt[2]).toBeCloseTo(1.5, 8);
    expect(ray.viewportWidth / ray.viewportHeight).toBeCloseTo(880 / 750, 8);
    expect(lash.viewportWidth).toBe(880);
    expect(lash.viewportHeight).toBe(750);
    expect(lash.cameraStatus).toBe(
      "retail-frame-source-target-span-calibrated-camera-transform-not-exact"
    );
    expect(lash.cameraCalibration?.status).toBe(
      "saved-retail-source-target-span-fit"
    );
    expect(measureNwnVfxComparisonCameraCalibration(lash).rmsErrorPixels).toBeLessThan(
      8
    );
  });

  it("uses the saved-script longitudinal camera translated to the row 181 source origin", () => {
    const profile = readPresentationView(row181Presentation);

    expect(profile.projection).toBe("perspective");
    expect(profile.viewportWidth / profile.viewportHeight).toBeCloseTo(880 / 750, 8);
    expect(profile.perspectiveFovDegrees).toBeCloseTo(51.05100832, 8);
    expect(profile.cameraPosition).toEqual([0, 3.64587616, -2.49972596]);
    expect(profile.cameraLookAt).toEqual([0, 1.01486231, 1.44313863]);
    expect(profile.cameraUp).toEqual([0, 1, 0]);
    expect(profile.cameraStatus).toBe(
      "retail-frame-source-centered-longitudinal-calibrated-camera-transform-not-exact"
    );
    expect(profile.cameraSourceEvidence).toContain(
      "backend/docs/aurora-reverse/vfx-row181-proof-camera-source-audit-2026-08-13.md"
    );
    expect(measureNwnVfxComparisonCameraCalibration(profile)).toMatchObject({
      status: "pass",
      tolerancePixels: 4,
      sampleCount: 4
    });
  });

  it("uses the placeable lateral-clearance camera calibrated against the fresh NWN oracle", () => {
    const profile = readPresentationView(row50PlaceablePresentation);

    expect(profile.projection).toBe("perspective");
    expect(profile.cameraPosition).toEqual([1, 3.64587616, -5.49972596]);
    expect(profile.cameraLookAt).toEqual([-0.4, 1.01486231, -1.55686137]);
    expect(profile.cameraStatus).toBe(
      "fresh-retail-frame-placeable-lateral-clearance-calibrated-camera-transform-not-exact"
    );
    expect(profile.cameraSourceEvidence).toContain(
      "backend/docs/aurora-reverse/evidence/vfx-placeable-object-attachment-row50/nwn/profile-v2/run-20260813T160758Z/nwn-row50-placeable-one-trigger-best.png"
    );
    expect(profile.cameraSourceEvidence).toContain(
      "backend/docs/aurora-reverse/vfx-placeable-object-attachment-proof-audit-2026-08-13.md"
    );
  });

  it("uses the saved retail script constraints for the row 1 duration proof", () => {
    const profile = readPresentationView(row1Presentation);

    expect(profile.projection).toBe("perspective");
    expect(profile.viewportWidth).toBe(880);
    expect(profile.viewportHeight).toBe(750);
    expect(profile.perspectiveFovDegrees).toBeCloseTo(51.05100832, 8);
    expect(profile.cameraPosition).toEqual([0, 3.64587616, -5.49972596]);
    expect(profile.cameraLookAt).toEqual([0, 1.01486231, -1.55686137]);
    expect(profile.cameraUp).toEqual([0, 1, 0]);
    expect(profile.cameraStatus).toBe(
      "retail-frame-longitudinal-calibrated-camera-transform-not-exact"
    );
    expect(profile.cameraSourceEvidence).toContain(
      "backend/docs/aurora-reverse/vfx-row1-proof-camera-source-audit-2026-08-11.md"
    );
    expect(measureNwnVfxComparisonCameraCalibration(profile)).toMatchObject({
      status: "pass",
      tolerancePixels: 4,
      sampleCount: 4
    });
  });

  it("uses the saved-retail source-origin and table calibration for the AOE", () => {
    const profile = readPresentationView(aoe0Presentation);

    expect(profile.projection).toBe("perspective");
    expect(profile.viewportWidth / profile.viewportHeight).toBeCloseTo(880 / 750, 8);
    expect(profile.perspectiveFovDegrees).toBeCloseTo(37.87570786, 8);
    expect(profile.cameraPosition).toEqual([-3.40048908, 5.65920304, -2.97124351]);
    expect(profile.cameraLookAt).toEqual([2.35245967, 0.16311396, -2.94477992]);
    expect(profile.cameraStatus).toBe(
      "retail-frame-source-origin-and-table-calibrated-camera-transform-not-exact"
    );
    expect(profile.cameraSourceEvidence).toContain(
      "backend/docs/aurora-reverse/vfx-aoe0-proof-camera-planar-calibration-audit-2026-08-07.md"
    );
    expect(measureNwnVfxComparisonCameraCalibration(profile)).toMatchObject({
      status: "pass",
      tolerancePixels: 8,
      sampleCount: 7
    });
  });

  it("uses a neutral empty backdrop to make the source-black darkness quad visible", () => {
    expect(materializeVfxPresentationProfile(row1Presentation).clearColor).toBe("#686d70");
    expect(materializeVfxPresentationProfile(broadRow44Presentation).clearColor).toBe("#101214");
  });

  it("frames row 44 from the saved oracle's source-to-target view without claiming an exact Aurora camera transform", () => {
    const profile = readPresentationView(broadRow44Presentation);

    expect(profile.projection).toBe("perspective");
    expect(profile.viewportWidth / profile.viewportHeight).toBeCloseTo(880 / 750, 8);
    expect(profile.perspectiveFovDegrees).toBe(48);
    expect(profile.cameraPosition[0]).toBe(0);
    expect(profile.cameraPosition[1]).toBeCloseTo(4.989087296526011, 12);
    expect(profile.cameraPosition[2]).toBeCloseTo(-5.389087296526011, 12);
    expect(profile.cameraLookAt).toEqual([0, 1.1, -1.5]);
    expect(profile.cameraPosition[2]).toBeLessThan(profile.cameraLookAt[2]);
    expect(profile.cameraStatus).toBe(
      "retail-capture-calibrated-camera-transform-not-exact"
    );
    expect(profile.cameraSourceEvidence).toContain(
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/nwn-row44-one-trigger-approved-recapture-best.png"
    );
  });

  it("uses the shared saved-script longitudinal calibration for the row 50 object-impact oracle", () => {
    const profile = readPresentationView(row50Presentation);

    expect(profile.projection).toBe("perspective");
    expect(profile.viewportWidth / profile.viewportHeight).toBeCloseTo(880 / 750, 8);
    expect(profile.perspectiveFovDegrees).toBeCloseTo(51.05100832, 8);
    expect(profile.cameraPosition).toEqual([0, 3.64587616, -5.49972596]);
    expect(profile.cameraLookAt).toEqual([0, 1.01486231, -1.55686137]);
    expect(profile.cameraStatus).toBe(
      "retail-frame-longitudinal-calibrated-camera-transform-not-exact"
    );
    expect(profile.cameraSourceEvidence).toContain(
      "backend/docs/aurora-reverse/vfx-row50-proof-camera-source-audit-2026-08-13.md"
    );
    expect(measureNwnVfxComparisonCameraCalibration(profile)).toMatchObject({
      status: "pass",
      tolerancePixels: 4,
      sampleCount: 4
    });
  });

  it("derives the comparison proof host graph, cache key, and asset ledger from source truth", () => {
    const manifest = {
      fixtureId: "vfx-broad-row1",
      sourceModel: {
        resref: "vdr_darkness",
        sha256: "source-sha"
      },
      sourceEmitterNames: ["DARK_Spot"],
      sourceLightNames: ["Negitive_Light"],
      textures: [{ resref: "fxpa_dot01", resourceKey: "fxpa_dot01.png" }],
      chunks: [
        {
          resourceKey: "chunk.glb",
          runtimePayloadResourceKey: "chunk-payload.json",
          sourceEmitterNames: ["chunk-smoke"]
        }
      ],
      proofScene: {
        models: [{ resourceKey: "tile.glb" }],
        textures: [{ resref: "tiletex", resourceKey: "tiletex.png" }]
      }
    };

    expect(buildNwnVfxComparisonExpectedHostGraph(manifest)).toEqual({
      staticBranches: [],
      emitterBranches: ["DARK_Spot", "chunk-smoke"],
      lightBranches: ["Negitive_Light"]
    });
    expect(
      buildNwnVfxComparisonExpectedHostGraph(manifest, {
        nodes: [
          { nodeKind: "static-geometry", nodeName: "renamed_mesh_a" },
          { nodeKind: "static-geometry", nodeName: "unrelated_geometry_q7" },
          { nodeKind: "emitter", nodeName: "ignored_here" }
        ]
      })
    ).toEqual({
      staticBranches: ["renamed_mesh_a", "unrelated_geometry_q7"],
      emitterBranches: ["DARK_Spot", "chunk-smoke"],
      lightBranches: ["Negitive_Light"]
    });
    expect(
      buildNwnVfxComparisonExpectedHostGraph({
        ...manifest,
        chunks: undefined
      })
    ).toEqual({
      staticBranches: [],
      emitterBranches: ["DARK_Spot"],
      lightBranches: ["Negitive_Light"]
    });
    expect(
      buildNwnVfxComparisonExpectedHostGraph({
        ...manifest,
        chunks: [{ resourceKey: "empty-source-emitters.glb" }]
      })
    ).toEqual({
      staticBranches: [],
      emitterBranches: ["DARK_Spot"],
      lightBranches: ["Negitive_Light"]
    });
    expect(
      buildNwnVfxComparisonExpectedHostGraph({
        ...manifest,
        sourceEmitterNames: undefined,
        emitterNames: ["Chunkssml", "Flame01", "Flame01", ""]
      })
    ).toEqual({
      staticBranches: [],
      emitterBranches: ["Chunkssml", "Flame01", "chunk-smoke"],
      lightBranches: ["Negitive_Light"]
    });
    expect(buildNwnVfxComparisonRuntimeCacheKey(manifest)).toBe(
      "vfx-broad-row1:source-sha"
    );
    expect(
      readNwnVfxComparisonSourceModelGraph({
        version: "aurora-vfx-payload/v1",
        canonicalStatus: "canonical",
        backendCanonical: true,
        sourceKind: "source_mdl_graph",
        previewMode: "none",
        diagnostics: {
          sourceRows: [],
          effectInstance: [],
          phaseSchedule: [],
          dependencyGraph: [],
          runtimeState: [],
          renderContract: [],
          payload: []
        },
        contracts: {
          sourceModelGraph: {
            nodes: [
              {
                nodeKind: "static-geometry",
                nodeName: "renamed_mesh_a",
                meshMaterialAnimationTracks: [
                  {
                    animationName: "arbitrary_motion",
                    state: {
                      alphaTimeline: [
                        { time: 0, value: 1 },
                        { time: 1, value: 0 }
                      ]
                    }
                  }
                ]
              }
            ]
          }
        },
        provenance: {}
      })
    ).toEqual({
      nodes: [
        {
          nodeKind: "static-geometry",
          nodeName: "renamed_mesh_a",
          meshMaterialAnimationTracks: [
            {
              animationName: "arbitrary_motion",
              state: {
                alphaTimeline: [
                  { time: 0, value: 1 },
                  { time: 1, value: 0 }
                ]
              }
            }
          ]
        }
      ]
    });
    expect(
      buildNwnVfxComparisonExpectedHostGraph({
        ...manifest,
        sourceEmitterNames: undefined,
        emitterNames: ["OmenEmitter02"],
        chunks: [
          {
            resourceKey: "fx_meteor.glb",
            sourceEmitterNames: ["Ring", "sparks", "Smoke", "Metorflame"],
            hostGraphLifecycle: "transient"
          }
        ]
      })
    ).toEqual({
      staticBranches: [],
      emitterBranches: ["OmenEmitter02"],
      transientEmitterBranches: ["Ring", "sparks", "Smoke", "Metorflame"],
      lightBranches: ["Negitive_Light"]
    });
    expect(
      buildNwnVfxComparisonRuntimeExpectedAssets(
        manifest,
        "/dev-fixtures/vfx-broad-row1"
      )
    ).toEqual([
      {
        key: "/dev-fixtures/vfx-broad-row1/payload.json",
        kind: "unknown",
        reference: "vfx-broad-row1"
      },
      {
        key: "/dev-fixtures/vfx-broad-row1/manifest.json",
        kind: "unknown",
        reference: "vfx-broad-row1"
      },
      {
        key: "/dev-fixtures/vfx-broad-row1/presentation-profile.json",
        kind: "unknown",
        reference: "vfx-broad-row1"
      },
      {
        key: "/dev-fixtures/vfx-broad-row1/fxpa_dot01.png",
        kind: "texture",
        reference: "fxpa_dot01"
      },
      {
        key: "/dev-fixtures/vfx-broad-row1/chunk.glb",
        kind: "chunk-model",
        reference: "chunk.glb"
      },
      {
        key: "/dev-fixtures/vfx-broad-row1/chunk-payload.json",
        kind: "unknown",
        reference: "chunk-payload.json"
      },
      {
        key: "/dev-fixtures/vfx-broad-row1/tile.glb",
        kind: "model",
        reference: "tile.glb"
      },
      {
        key: "/dev-fixtures/vfx-broad-row1/tiletex.png",
        kind: "texture",
        reference: "tiletex"
      }
    ]);
  });
});
