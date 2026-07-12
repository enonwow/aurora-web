import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  buildAuroraSupermodelAnimationClips,
  createAuroraSourceSkinningRuntime,
  ensurePlaceableModel,
  ensureNormalizedPlaceableModel,
  isAuroraSupermodelRetargetedAnimationClip,
  PLACEABLE_AREA_MODEL_TARGET_MAX_AXIS_FACTOR,
  PLACEABLE_PREVIEW_MODEL_TARGET_MAX_AXIS_FACTOR,
  readPlaceableModelAnimationClips,
  type PlaceableModelRuntimeCache
} from "../../../../src/modules/placeables/adapters/three/placeableThreeAssetLoader";

describe("placeable area model presentation reuse", () => {
  it("keeps Areas world-fit separate from Placeables preview thumbnail-fit", () => {
    expect(PLACEABLE_AREA_MODEL_TARGET_MAX_AXIS_FACTOR).toBeLessThan(
      PLACEABLE_PREVIEW_MODEL_TARGET_MAX_AXIS_FACTOR
    );
    expect(PLACEABLE_AREA_MODEL_TARGET_MAX_AXIS_FACTOR).toBeCloseTo(1.35);
  });

  it("suppresses source-hierarchy root position tracks for in-place supermodel previews", () => {
    const target = new THREE.Group();
    target.name = "c_kitten";
    const rootDummy = new THREE.Object3D();
    rootDummy.name = "rootdummy";
    const head = new THREE.Object3D();
    head.name = "Cat_head";
    rootDummy.add(head);
    target.add(rootDummy);

    const supermodel = new THREE.Group();
    supermodel.name = "feline_a";
    supermodel.userData = {
      auroraMdlSourceModel: "feline_a",
      auroraMdlSourceHierarchyRootNodeNames: ["rootdummy"],
      auroraGltfAnimationCount: 1,
      auroraGltfAnimationNames: ["cwalk"],
      auroraGltfAnimationDurations: [1],
      auroraGltfHasAnimations: true
    };
    Object.defineProperty(supermodel.userData, "auroraGltfAnimationClips", {
      configurable: true,
      enumerable: false,
      value: [
        new THREE.AnimationClip("cwalk", 1, [
          new THREE.VectorKeyframeTrack(
            "rootdummy.position",
            [0, 1],
            [0, 0, 0, 0, 1, 0]
          ),
          new THREE.VectorKeyframeTrack(
            "Cat_head.position",
            [0, 1],
            [0, 0, 0, 0, 0.2, 0]
          )
        ])
      ],
      writable: true
    });

    const remapped = buildAuroraSupermodelAnimationClips(target, supermodel, {
      suppressRootPositionTracks: true
    });
    const unsuppressed = buildAuroraSupermodelAnimationClips(target, supermodel);

    expect(remapped).toHaveLength(1);
    expect(isAuroraSupermodelRetargetedAnimationClip(remapped[0]!)).toBe(true);
    expect(remapped[0].tracks.map((track) => track.name)).toEqual([
      "Cat_head.position"
    ]);
    expect(unsuppressed[0].tracks.map((track) => track.name)).toEqual([
      "rootdummy.position",
      "Cat_head.position"
    ]);
  });

  it("can suppress rootdummy position tracks even when rootdummy is a child driver", () => {
    const target = new THREE.Group();
    target.name = "c_bodak";
    const rootDummy = new THREE.Object3D();
    rootDummy.name = "rootdummy";
    const torso = new THREE.Object3D();
    torso.name = "torso_g";
    rootDummy.add(torso);
    target.add(rootDummy);

    const supermodel = new THREE.Group();
    supermodel.name = "a_ba_non_combat";
    supermodel.userData = {
      auroraMdlSourceModel: "a_ba_non_combat",
      auroraMdlSourceHierarchyRootNodeNames: ["a_ba_non_combat"],
      auroraGltfAnimationCount: 1,
      auroraGltfAnimationNames: ["custom15start"],
      auroraGltfAnimationDurations: [1],
      auroraGltfHasAnimations: true
    };
    const superRootDummy = new THREE.Object3D();
    superRootDummy.name = "rootdummy";
    const superTorso = new THREE.Object3D();
    superTorso.name = "torso_g";
    superRootDummy.add(superTorso);
    supermodel.add(superRootDummy);
    Object.defineProperty(supermodel.userData, "auroraGltfAnimationClips", {
      configurable: true,
      enumerable: false,
      value: [
        new THREE.AnimationClip("custom15start", 1, [
          new THREE.VectorKeyframeTrack(
            "rootdummy.position",
            [0, 1],
            [0, 0, 0, 0, 4, 0]
          ),
          new THREE.QuaternionKeyframeTrack(
            "torso_g.quaternion",
            [0, 1],
            [0, 0, 0, 1, 0, 0, 0, 1]
          )
        ])
      ],
      writable: true
    });

    const remapped = buildAuroraSupermodelAnimationClips(target, supermodel, {
      suppressRootDummyPositionTracks: true,
      suppressRootPositionTracks: true
    });
    const unsuppressed = buildAuroraSupermodelAnimationClips(target, supermodel, {
      suppressRootPositionTracks: true
    });

    expect(remapped[0].tracks.map((track) => track.name)).toEqual([
      "torso_g.quaternion"
    ]);
    expect(unsuppressed[0].tracks.map((track) => track.name)).toEqual([
      "rootdummy.position",
      "torso_g.quaternion"
    ]);
  });

  it("retargets duplicate target node names through uuid bindings", () => {
    const target = new THREE.Group();
    target.name = "c_kocrachn";
    const firstClaw = new THREE.Object3D();
    firstClaw.name = "Rclaw";
    firstClaw.position.set(1, 0, 0);
    const secondClaw = new THREE.Object3D();
    secondClaw.name = "Rclaw";
    secondClaw.position.set(2, 0, 0);
    target.add(firstClaw, secondClaw);

    const supermodel = new THREE.Group();
    supermodel.name = "c_Horror";
    supermodel.userData = {
      auroraMdlSourceModel: "c_Horror",
      auroraGltfAnimationCount: 1,
      auroraGltfAnimationNames: ["ca1slashl"],
      auroraGltfAnimationDurations: [1],
      auroraGltfHasAnimations: true
    };
    const sourceClaw = new THREE.Object3D();
    sourceClaw.name = "Rclaw";
    sourceClaw.position.set(0.5, 0, 0);
    supermodel.add(sourceClaw);
    Object.defineProperty(supermodel.userData, "auroraGltfAnimationClips", {
      configurable: true,
      enumerable: false,
      value: [
        new THREE.AnimationClip("ca1slashl", 1, [
          new THREE.VectorKeyframeTrack(
            "Rclaw.position",
            [0, 1],
            [0.5, 0, 0, 0.75, 0, 0]
          )
        ])
      ],
      writable: true
    });

    const remapped = buildAuroraSupermodelAnimationClips(target, supermodel, {
      duplicateTargetMode: "all-by-uuid"
    });
    const firstOnly = buildAuroraSupermodelAnimationClips(target, supermodel);

    expect(remapped[0].tracks.map((track) => track.name)).toEqual([
      `${firstClaw.uuid}.position`,
      `${secondClaw.uuid}.position`
    ]);
    expect(Array.from(remapped[0].tracks[0]!.values)).toEqual([1, 0, 0, 1.5, 0, 0]);
    expect(Array.from(remapped[0].tracks[1]!.values)).toEqual([2, 0, 0, 2.5, 0, 0]);
    expect(firstOnly[0].tracks.map((track) => track.name)).toEqual(["Rclaw.position"]);
  });

  it("can preserve source-space position tracks for remapped equipment supermodels", () => {
    const target = new THREE.Group();
    target.name = "wbwln_m_023";
    const targetDrawDummy = new THREE.Object3D();
    targetDrawDummy.name = "DrawDummy";
    targetDrawDummy.position.set(3, 0, 0);
    target.add(targetDrawDummy);

    const supermodel = new THREE.Group();
    supermodel.name = "wbwln_m_011";
    supermodel.userData = {
      auroraMdlSourceModel: "wbwln_m_011",
      auroraGltfAnimationCount: 1,
      auroraGltfAnimationNames: ["bowshot"],
      auroraGltfAnimationDurations: [1],
      auroraGltfHasAnimations: true
    };
    const sourceDrawDummy = new THREE.Object3D();
    sourceDrawDummy.name = "DrawDummy";
    sourceDrawDummy.position.set(1, 0, 0);
    supermodel.add(sourceDrawDummy);
    Object.defineProperty(supermodel.userData, "auroraGltfAnimationClips", {
      configurable: true,
      enumerable: false,
      value: [
        new THREE.AnimationClip("bowshot", 1, [
          new THREE.VectorKeyframeTrack(
            "DrawDummy.position",
            [0, 1],
            [1, 0, 0, 2, 0, 0]
          )
        ])
      ],
      writable: true
    });

    const sourceSpace = buildAuroraSupermodelAnimationClips(target, supermodel, {
      positionTrackMode: "source"
    });
    const retargeted = buildAuroraSupermodelAnimationClips(target, supermodel);

    expect(sourceSpace[0].tracks.map((track) => track.name)).toEqual([
      "DrawDummy.position"
    ]);
    expect(Array.from(sourceSpace[0].tracks[0]!.values)).toEqual([
      1, 0, 0, 2, 0, 0
    ]);
    expect(Array.from(retargeted[0].tracks[0]!.values)).toEqual([
      3, 0, 0, 6, 0, 0
    ]);
  });

  it("retargets duplicate target node names to hierarchy-matching parents first", () => {
    const target = new THREE.Group();
    target.name = "c_kocrachn";
    const torso = new THREE.Object3D();
    torso.name = "torso";
    const rightBicep = new THREE.Object3D();
    rightBicep.name = "rbicep";
    const armUnderBicep = new THREE.Object3D();
    armUnderBicep.name = "Rforearm1";
    const armUnderTorso = new THREE.Object3D();
    armUnderTorso.name = "Rforearm1";
    rightBicep.add(armUnderBicep);
    torso.add(armUnderTorso, rightBicep);
    target.add(torso);

    const supermodel = new THREE.Group();
    supermodel.name = "c_Horror";
    supermodel.userData = {
      auroraMdlSourceModel: "c_Horror",
      auroraGltfAnimationCount: 1,
      auroraGltfAnimationNames: ["ca1slashl"],
      auroraGltfAnimationDurations: [1],
      auroraGltfHasAnimations: true
    };
    const sourceBicep = new THREE.Object3D();
    sourceBicep.name = "rbicep";
    const sourceForearm = new THREE.Object3D();
    sourceForearm.name = "Rforearm1";
    sourceBicep.add(sourceForearm);
    supermodel.add(sourceBicep);
    Object.defineProperty(supermodel.userData, "auroraGltfAnimationClips", {
      configurable: true,
      enumerable: false,
      value: [
        new THREE.AnimationClip("ca1slashl", 1, [
          new THREE.VectorKeyframeTrack(
            "Rforearm1.position",
            [0, 1],
            [0, 0, 0, 1, 0, 0]
          )
        ])
      ],
      writable: true
    });

    const remapped = buildAuroraSupermodelAnimationClips(target, supermodel, {
      duplicateTargetMode: "all-by-uuid"
    });

    expect(remapped[0].tracks.map((track) => track.name)).toEqual([
      `${armUnderBicep.uuid}.position`
    ]);
  });

  it("persists GLTF animation metadata on loaded model scenes", async () => {
    const sourceScene = new THREE.Group();
    const sourceMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
    sourceMesh.name = "torso_skin";
    sourceScene.add(sourceMesh);
    const danglyMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
    danglyMesh.name = "cloak_dangly";
    sourceScene.add(danglyMesh);
    const animmesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
    animmesh.name = "glow_panel";
    sourceScene.add(animmesh);
    sourceScene.userData = {
      aurora: {
        sourceModel: "pfa0",
        supermodel: "a_fa",
        animationScale: 1.2,
        sourceAnimations: [
          {
            name: "super_walk",
            targetModel: "pfa0",
            animRoot: "rootdummy",
            animationScale: 1.2,
            transitionTime: 0.25,
            events: [{ time: 0.75, name: "footstep" }],
            nodeCount: 2,
            positionKeyCount: 2,
            orientationKeyCount: 1,
            scaleKeyCount: 1,
            nodes: [
              {
                nodeName: "rootdummy",
                positionKeys: [
                  { time: 0, value: [0, 0, 0] },
                  { time: 1.25, value: [0, 0, 1] }
                ],
                orientationKeys: [
                  { time: 0, axisAngle: [0, 0, 1, 0] }
                ],
                scaleKeys: []
              },
              {
                nodeName: "rshin_g",
                positionKeys: [],
                orientationKeys: [],
                scaleKeys: [{ time: 0, value: 1 }]
              },
              {
                nodeName: "cloak_dangly",
                positionKeys: [],
                orientationKeys: [],
                scaleKeys: [],
                danglyDisplacement: 0,
                danglyPeriod: 0.25,
                danglyTightness: 0.75
              },
              {
                nodeName: "glow_panel",
                positionKeys: [],
                orientationKeys: [],
                scaleKeys: [],
                samplePeriod: 0.5,
                animTverts: [
                  [0, 0],
                  [1, 0],
                  [0, 1],
                  [0.5, 0],
                  [1, 0.5],
                  [0.5, 1]
                ]
              }
            ]
          }
        ],
        sourceHierarchyNodeCount: 3,
        sourceHierarchyRootNodeNames: ["rootdummy"],
        sourceHierarchyNodeTypes: ["dummy", "skin"],
        sourceHierarchy: [
          { name: "rootdummy", nodeType: "dummy" },
          { name: "rshin_g", nodeType: "dummy", parentName: "rootdummy" },
          { name: "torso_skin", nodeType: "skin", parentName: "rootdummy" }
        ]
      }
    };
    const runtime = {
      placeableModelLoader: {
        load: (
          _url: string,
          onLoad: (gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] }) => void
        ) => {
          onLoad({
            scene: sourceScene,
            animations: [
              new THREE.AnimationClip("walk", 1.25, []),
              new THREE.AnimationClip("idle", 2.5, [])
            ]
          });
          return undefined;
        },
        parse: () => undefined
      },
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>()
    } as unknown as PlaceableModelRuntimeCache;

    const model = await ensurePlaceableModel(runtime, "/assets/c_human.glb");

    expect(model).not.toBe(sourceScene);
    expect(model?.userData.auroraGltfAnimationCount).toBe(3);
    expect(model?.userData.auroraGltfAnimationNames).toEqual(["walk", "idle", "super_walk"]);
    expect(model?.userData.auroraGltfAnimationDurations).toEqual([1.25, 2.5, 1.25]);
    expect(model?.userData.auroraGltfHasAnimations).toBe(true);
    expect(model?.userData.auroraMdlSourceAnimationClipCount).toBe(1);
    expect(model?.userData.auroraMdlSourceAnimationClipNames).toEqual(["super_walk"]);
    expect(model?.userData.auroraMdlSourceModel).toBe("pfa0");
    expect(model?.userData.auroraMdlSupermodel).toBe("a_fa");
    expect(model?.userData.auroraMdlAnimationScale).toBe(1.2);
    expect(model?.userData.auroraMdlSourceAnimationCount).toBe(1);
    expect(model?.userData.auroraMdlSourceAnimationNames).toEqual(["super_walk"]);
    expect(model?.userData.auroraMdlSourceHierarchyNodeCount).toBe(3);
    expect(model?.userData.auroraMdlSourceHierarchyRootNodeNames).toEqual(["rootdummy"]);
    expect(model?.userData.auroraMdlSourceHierarchyNodeTypes).toEqual(["dummy", "skin"]);
    expect(model?.userData.auroraMdlSourceHierarchyDummyNodeNames).toEqual([
      "rootdummy",
      "rshin_g"
    ]);
    expect(model?.userData.auroraMdlSourceHierarchySynthesizedNodeCount).toBe(2);
    expect(model?.userData.auroraMdlSourceHierarchySynthesizedNodeNames).toEqual([
      "rootdummy",
      "rshin_g"
    ]);
    expect(model?.getObjectByName("rootdummy")?.userData).toMatchObject({
      auroraSourceHierarchySynthesized: true,
      auroraSourceHierarchyNodeType: "dummy"
    });
    expect(model?.getObjectByName("rshin_g")?.parent?.name).toBe("rootdummy");
    expect(readPlaceableModelAnimationClips(model!)).toHaveLength(3);
    expect(readPlaceableModelAnimationClips(model!).map((clip) => clip.name)).toEqual([
      "walk",
      "idle",
      "super_walk"
    ]);
    expect(readPlaceableModelAnimationClips(model!)[2].tracks.map((track) => track.name)).toEqual([
      "rootdummy.position",
      "rootdummy.quaternion",
      "rshin_g.scale"
    ]);
    const scaledPositionValues = Array.from(
      readPlaceableModelAnimationClips(model!)[2].tracks[0]!.values
    );
    expect(scaledPositionValues.slice(0, 4)).toEqual([0, 0, 0, 0]);
    expect(scaledPositionValues[4]).toBeCloseTo(1.2, 6);
    expect(scaledPositionValues[5]).toBe(0);
    expect(
      (
        readPlaceableModelAnimationClips(model!)[2] as THREE.AnimationClip & {
          userData?: Record<string, unknown>;
        }
      ).userData
    ).toMatchObject({
      auroraMdlSourceAnimationTargetModel: "pfa0",
      auroraMdlSourceAnimationRoot: "rootdummy",
      auroraMdlSourceAnimationTransitionTime: 0.25,
      auroraMdlSourceAnimationEventCount: 1,
      auroraMdlSourceAnimationEventNames: ["footstep"],
      auroraMdlSourceAnimationEvents: [{ time: 0.75, name: "footstep" }],
      auroraMdlSourceAnimationScale: 1.2
    });
    expect(
      (
        readPlaceableModelAnimationClips(model!)[2] as THREE.AnimationClip & {
          userData?: Record<string, unknown>;
        }
      ).userData?.auroraDanglymeshAnimationOverrides
    ).toEqual([
      {
        nodeName: "cloak_dangly",
        displacement: 0,
        period: 0.25,
        tightness: 0.75
      }
    ]);
    expect(
      (
        readPlaceableModelAnimationClips(model!)[2] as THREE.AnimationClip & {
          userData?: Record<string, unknown>;
        }
      ).userData?.auroraAnimmeshUvAnimations
    ).toEqual([
      {
        nodeName: "glow_panel",
        samplePeriod: 0.5,
        animTverts: [
          [0, 0],
          [1, 0],
          [0, 1],
          [0.5, 0],
          [1, 0.5],
          [0.5, 1]
        ]
      }
    ]);
    expect(runtime.placeableModelCacheByUrl.get("/assets/c_human.glb")?.userData).toMatchObject({
      auroraGltfAnimationCount: 3,
      auroraGltfAnimationNames: ["walk", "idle", "super_walk"],
      auroraMdlSourceAnimationClipCount: 1,
      auroraMdlSourceAnimationClipNames: ["super_walk"],
      auroraMdlSourceModel: "pfa0",
      auroraMdlSupermodel: "a_fa",
      auroraMdlAnimationScale: 1.2,
      auroraMdlSourceAnimationCount: 1,
      auroraMdlSourceAnimationNames: ["super_walk"],
      auroraMdlSourceHierarchyNodeCount: 3,
      auroraMdlSourceHierarchyRootNodeNames: ["rootdummy"],
      auroraMdlSourceHierarchyNodeTypes: ["dummy", "skin"],
      auroraMdlSourceHierarchyDummyNodeNames: ["rootdummy", "rshin_g"],
      auroraMdlSourceHierarchySynthesizedNodeCount: 2,
      auroraMdlSourceHierarchySynthesizedNodeNames: ["rootdummy", "rshin_g"]
    });
    expect(
      readPlaceableModelAnimationClips(
        runtime.placeableModelCacheByUrl.get("/assets/c_human.glb")!
      ).map((clip) => clip.name)
    ).toEqual(["walk", "idle", "super_walk"]);
  });

  it("retargets source animation model-root tracks to animroot and scales positions", async () => {
    const sourceScene = new THREE.Group();
    sourceScene.name = "loaded-scene-root";
    const rootDummy = new THREE.Object3D();
    rootDummy.name = "rootdummy";
    sourceScene.add(rootDummy);
    sourceScene.userData = {
      aurora: {
        sourceModel: "pfa0",
        animationScale: 1,
        sourceAnimations: [
          {
            name: "model_root_shift",
            targetModel: "pfa0",
            animRoot: "rootdummy",
            animationScale: 2,
            length: 1,
            transitionTime: 0.1,
            nodes: [
              {
                nodeName: "pfa0",
                positionKeys: [
                  { time: 0, value: [0, 0, 0] },
                  { time: 1, value: [0, 0, 1] }
                ],
                orientationKeys: [],
                scaleKeys: []
              }
            ]
          }
        ]
      }
    };
    const runtime = {
      placeableModelLoader: {
        load: (
          _url: string,
          onLoad: (gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] }) => void
        ) => {
          onLoad({ scene: sourceScene, animations: [] });
          return undefined;
        },
        parse: () => undefined
      },
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>()
    } as unknown as PlaceableModelRuntimeCache;

    const model = await ensurePlaceableModel(runtime, "/assets/pfa0.glb");
    const [clip] = readPlaceableModelAnimationClips(model!);

    expect(clip?.name).toBe("model_root_shift");
    expect(clip?.tracks.map((track) => track.name)).toEqual(["rootdummy.position"]);
    const values = Array.from(clip!.tracks[0]!.values);
    expect(values.slice(0, 4)).toEqual([0, 0, 0, 0]);
    expect(values[4]).toBeCloseTo(2, 6);
    expect(values[5]).toBe(0);
    expect(
      (clip as THREE.AnimationClip & { userData?: Record<string, unknown> }).userData
    ).toMatchObject({
      auroraMdlSourceAnimationRoot: "rootdummy",
      auroraMdlSourceAnimationScale: 2,
      auroraMdlSourceAnimationTransitionTime: 0.1
    });
  });

  it("recovers Aurora source animations from GLTF parser scene extras", async () => {
    const sourceScene = new THREE.Group();
    const aurora = {
      sourceModel: "c_a_chicken",
      sourceAnimations: [
        {
          name: "crun",
          length: 0.67,
          nodes: [
            {
              nodeName: "c_a_chicken",
              positionKeys: [
                { time: 0, value: [0, 0, 0] },
                { time: 0.67, value: [0, 0, 1] }
              ],
              orientationKeys: [],
              scaleKeys: []
            }
          ]
        }
      ],
      sourceHierarchyNodeCount: 1,
      sourceHierarchyRootNodeNames: ["c_a_chicken"],
      sourceHierarchyNodeTypes: ["dummy"],
      sourceHierarchy: [
        {
          name: "c_a_chicken",
          nodeType: "dummy"
        }
      ]
    };
    const runtime = {
      placeableModelLoader: {
        load: (
          _url: string,
          onLoad: (gltf: {
            scene: THREE.Object3D;
            animations: THREE.AnimationClip[];
            parser: {
              json: {
                scene: number;
                scenes: Array<{ extras: { aurora: typeof aurora } }>;
              };
            };
          }) => void
        ) => {
          onLoad({
            scene: sourceScene,
            animations: [],
            parser: {
              json: {
                scene: 0,
                scenes: [
                  {
                    extras: { aurora }
                  }
                ]
              }
            }
          });
          return undefined;
        },
        parse: () => undefined
      },
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>()
    } as unknown as PlaceableModelRuntimeCache;

    const model = await ensurePlaceableModel(runtime, "/assets/c_a_chicken.glb");

    expect(model?.userData.auroraMdlSourceModel).toBe("c_a_chicken");
    expect(model?.userData.auroraMdlSourceAnimationCount).toBe(1);
    expect(model?.userData.auroraMdlSourceAnimationNames).toEqual(["crun"]);
    expect(model?.userData.auroraMdlSourceAnimationClipCount).toBe(1);
    expect(model?.userData.auroraMdlSourceAnimationClipNames).toEqual(["crun"]);
    expect(model?.userData.auroraGltfAnimationCount).toBe(1);
    expect(model?.userData.auroraGltfAnimationNames).toEqual(["crun"]);
    expect(model?.userData.auroraMdlSourceHierarchySynthesizedNodeNames).toEqual([
      "c_a_chicken"
    ]);
    expect(readPlaceableModelAnimationClips(model!).map((clip) => clip.name)).toEqual([
      "crun"
    ]);
  });

  it("keeps animation clips available after normalized model userData rewrites", async () => {
    const sourceScene = new THREE.Group();
    sourceScene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
    const runtime = {
      placeableModelLoader: {
        load: (
          _url: string,
          onLoad: (gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] }) => void
        ) => {
          onLoad({
            scene: sourceScene,
            animations: [new THREE.AnimationClip("walk", 1, [])]
          });
          return undefined;
        },
        parse: () => undefined
      },
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>()
    } as unknown as PlaceableModelRuntimeCache;

    const model = await ensureNormalizedPlaceableModel(runtime, "/assets/animated.glb", 1);
    const cached = Array.from(runtime.placeableNormalizedModelCacheByKey.values())[0];
    cached.userData = { ...cached.userData, touchedAfterNormalization: true };
    const secondModel = await ensureNormalizedPlaceableModel(runtime, "/assets/animated.glb", 1);

    expect(readPlaceableModelAnimationClips(model!).map((clip) => clip.name)).toEqual([
      "walk"
    ]);
    expect(readPlaceableModelAnimationClips(cached).map((clip) => clip.name)).toEqual([
      "walk"
    ]);
    expect(readPlaceableModelAnimationClips(secondModel!).map((clip) => clip.name)).toEqual([
      "walk"
    ]);
  });

  it("keeps Aurora render 0 helper meshes available but invisible", async () => {
    const sourceScene = new THREE.Group();
    const helperMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    helperMesh.name = "body_bone";
    helperMesh.userData = {
      aurora: {
        sourceNodeType: "trimesh",
        material: {
          render: 0
        }
      }
    };
    const childMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    childMesh.name = "head_g";
    childMesh.userData = {
      aurora: {
        sourceNodeType: "danglymesh",
        material: {
          render: 1
        }
      }
    };
    helperMesh.add(childMesh);
    const renderMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    renderMesh.name = "chicken";
    renderMesh.userData = {
      aurora: {
        sourceNodeType: "skin",
        material: {
          render: 1
        }
      }
    };
    sourceScene.add(helperMesh, renderMesh);
    const runtime = {
      placeableModelLoader: {
        load: (
          _url: string,
          onLoad: (gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] }) => void
        ) => {
          onLoad({
            scene: sourceScene,
            animations: []
          });
          return undefined;
        },
        parse: () => undefined
      },
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>()
    } as unknown as PlaceableModelRuntimeCache;

    const model = await ensurePlaceableModel(runtime, "/assets/c_a_chicken.glb");
    const helper = model?.getObjectByName("body_bone") as THREE.Mesh | undefined;
    const child = model?.getObjectByName("head_g") as THREE.Mesh | undefined;

    expect(helper?.visible).toBe(true);
    expect((helper?.material as THREE.Material | undefined)?.visible).toBe(false);
    expect(child?.parent).toBe(helper);
    expect(child?.visible).toBe(true);
    expect((child?.material as THREE.Material | undefined)?.visible).toBe(true);
    expect(helper?.userData).toMatchObject({
      auroraMdlRenderFlag: 0,
      auroraMdlRenderSuppressed: true
    });
    expect(model?.getObjectByName("chicken")?.visible).toBe(true);
    expect(model?.userData.auroraMdlRenderSuppressedMeshCount).toBe(1);
    expect(model?.userData.auroraMdlRenderSuppressedMeshNames).toEqual(["body_bone"]);
  });

  it("suppresses Aurora emitter proxy quads while keeping emitter metadata available", async () => {
    const sourceScene = new THREE.Group();
    const emitterProxy = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    emitterProxy.name = "emitter_proxy";
    emitterProxy.userData = {
      aurora: {
        sourceMesh: "emitter_proxy",
        sourceNodeType: "emitter",
        material: {
          render: 1
        }
      }
    };
    sourceScene.add(emitterProxy);
    const runtime = {
      placeableModelLoader: {
        load: (
          _url: string,
          onLoad: (gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] }) => void
        ) => {
          onLoad({
            scene: sourceScene,
            animations: []
          });
          return undefined;
        },
        parse: () => undefined
      },
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>()
    } as unknown as PlaceableModelRuntimeCache;

    const model = await ensurePlaceableModel(runtime, "/assets/c_air.glb");
    const proxy = model?.getObjectByName("emitter_proxy") as THREE.Mesh | undefined;

    expect(proxy?.visible).toBe(true);
    expect((proxy?.material as THREE.Material | undefined)?.visible).toBe(false);
    expect(proxy?.userData).toMatchObject({
      auroraMdlRenderSuppressed: true,
      auroraMdlEmitterProxyRenderSuppressed: true,
      auroraMdlEmitterProxySourceNodeType: "emitter",
      auroraMdlEmitterProxySourceMesh: "emitter_proxy"
    });
    expect(model?.userData.auroraMdlRenderSuppressedMeshCount).toBe(1);
    expect(model?.userData.auroraMdlRenderSuppressedMeshNames).toEqual([
      "emitter_proxy"
    ]);
    expect(model?.userData.auroraMdlEmitterProxySuppressedMeshCount).toBe(1);
    expect(model?.userData.auroraMdlEmitterProxySuppressedMeshNames).toEqual([
      "emitter_proxy"
    ]);
  });

  it("interprets binary source hierarchy orientation values as quaternions", async () => {
    const sourceScene = new THREE.Group();
    sourceScene.userData = {
      aurora: {
        sourceModel: "pmh0",
        sourceHierarchyNodeCount: 2,
        sourceHierarchyRootNodeNames: ["rootdummy"],
        sourceHierarchyNodeTypes: ["dummy"],
        sourceHierarchy: [
          { name: "rootdummy", nodeType: "dummy" },
          {
            name: "lforearm",
            nodeType: "dummy",
            parentName: "rootdummy",
            orientation: [0, 0.034898411482572556, 0, 0.9993908405303955],
            orientationFormat: "quaternion"
          }
        ]
      }
    };
    const runtime = {
      placeableModelLoader: {
        load: (
          _url: string,
          onLoad: (gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] }) => void
        ) => {
          onLoad({
            scene: sourceScene,
            animations: []
          });
          return undefined;
        },
        parse: () => undefined
      },
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>()
    } as unknown as PlaceableModelRuntimeCache;

    const model = await ensurePlaceableModel(runtime, "/assets/pmh0.glb");
    const forearm = model?.getObjectByName("lforearm");
    const expected = new THREE.Quaternion(
      0,
      0,
      -0.034898411482572556,
      0.9993908405303955
    ).normalize();

    expect(forearm?.userData).toMatchObject({
      auroraSourceHierarchySynthesized: true,
      auroraSourceHierarchyNodeType: "dummy"
    });
    expect(Math.abs(forearm?.quaternion.dot(expected) ?? 0)).toBeGreaterThan(0.999);
    expect(forearm?.quaternion.angleTo(new THREE.Quaternion())).toBeLessThan(0.08);
  });

  it("preserves rotated source hierarchy child positions in GLTF coordinates", async () => {
    const sourceScene = new THREE.Group();
    sourceScene.userData = {
      aurora: {
        sourceModel: "pmh0",
        sourceHierarchyNodeCount: 2,
        sourceHierarchyRootNodeNames: ["rootdummy"],
        sourceHierarchyNodeTypes: ["dummy"],
        sourceHierarchy: [
          {
            name: "rootdummy",
            nodeType: "dummy",
            orientation: [0, Math.SQRT1_2, 0, Math.SQRT1_2],
            orientationFormat: "quaternion"
          },
          {
            name: "rhand_g",
            nodeType: "dummy",
            parentName: "rootdummy",
            position: [1, 0, 0]
          }
        ]
      }
    };
    const runtime = {
      placeableModelLoader: {
        load: (
          _url: string,
          onLoad: (gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] }) => void
        ) => {
          onLoad({
            scene: sourceScene,
            animations: []
          });
          return undefined;
        },
        parse: () => undefined
      },
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>()
    } as unknown as PlaceableModelRuntimeCache;

    const model = await ensurePlaceableModel(runtime, "/assets/pmh0-rotated.glb");
    model?.updateMatrixWorld(true);

    const hand = model?.getObjectByName("rhand_g");
    const worldPosition = new THREE.Vector3();
    hand?.getWorldPosition(worldPosition);

    expect(worldPosition.x).toBeCloseTo(0, 6);
    expect(worldPosition.y).toBeCloseTo(-1, 6);
    expect(worldPosition.z).toBeCloseTo(0, 6);
  });

  it("restores flattened Aurora source hierarchy without moving baked geometry", async () => {
    const sourceScene = new THREE.Group();
    sourceScene.userData = {
      aurora: {
        sourceModel: "c_a_chicken",
        sourceHierarchy: [
          { name: "c_a_chicken", nodeType: "dummy" },
          {
            name: "body_bone",
            nodeType: "trimesh",
            parentName: "c_a_chicken",
            position: [0, 0, 1]
          },
          {
            name: "neck_bone",
            nodeType: "trimesh",
            parentName: "body_bone",
            position: [0, 0, 2]
          },
          {
            name: "chicken",
            nodeType: "skin",
            parentName: "c_a_chicken",
            position: [0, 0, 9]
          }
        ]
      }
    };
    const bodyGeometry = new THREE.BufferGeometry();
    bodyGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 1, 0], 3)
    );
    const bodyMesh = new THREE.Mesh(bodyGeometry, new THREE.MeshBasicMaterial());
    bodyMesh.name = "body_bone";
    const neckGeometry = new THREE.BufferGeometry();
    neckGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 3, 0], 3)
    );
    const neckMesh = new THREE.Mesh(neckGeometry, new THREE.MeshBasicMaterial());
    neckMesh.name = "neck_bone";
    const chickenMesh = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial()
    );
    chickenMesh.name = "chicken";
    sourceScene.add(bodyMesh, neckMesh, chickenMesh);
    const runtime = {
      placeableModelLoader: {
        load: (
          _url: string,
          onLoad: (gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] }) => void
        ) => {
          onLoad({
            scene: sourceScene,
            animations: []
          });
          return undefined;
        },
        parse: () => undefined
      },
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>()
    } as unknown as PlaceableModelRuntimeCache;

    const model = await ensurePlaceableModel(runtime, "/assets/c_a_chicken.glb");
    const root = model?.getObjectByName("c_a_chicken");
    const body = model?.getObjectByName("body_bone") as THREE.Mesh | undefined;
    const neck = model?.getObjectByName("neck_bone") as THREE.Mesh | undefined;
    const chicken = model?.getObjectByName("chicken");
    model?.updateMatrixWorld(true);
    const bodyWorldVertex = new THREE.Vector3()
      .fromBufferAttribute(body!.geometry.getAttribute("position"), 0)
      .applyMatrix4(body!.matrixWorld);
    const neckWorldVertex = new THREE.Vector3()
      .fromBufferAttribute(neck!.geometry.getAttribute("position"), 0)
      .applyMatrix4(neck!.matrixWorld);

    expect(root?.parent).toBe(model);
    expect(body?.parent).toBe(root);
    expect(neck?.parent).toBe(body);
    expect(chicken?.parent).toBe(root);
    expect(body?.position.y).toBeCloseTo(1);
    expect(neck?.position.y).toBeCloseTo(2);
    expect(chicken!.position.length()).toBeCloseTo(0);
    expect(chicken?.userData.auroraSourceHierarchySkinPoseSuppressed).toBe(true);
    expect(bodyWorldVertex.y).toBeCloseTo(1);
    expect(neckWorldVertex.y).toBeCloseTo(3);
    expect(model?.userData.auroraMdlSourceHierarchySynthesizedNodeNames).toEqual([
      "c_a_chicken"
    ]);
    expect(model?.userData.auroraMdlSourceHierarchyRebasedGeometryNodeNames).toEqual([
      "body_bone",
      "neck_bone"
    ]);
  });

  it("uses source hierarchy bind poses when source inverse binds are missing", () => {
    const root = new THREE.Group();
    root.name = "c_lizard_like";
    root.userData = {
      aurora: {
        sourceHierarchy: [
          { name: "rootdummy", nodeType: "dummy" },
          {
            name: "torso_g",
            nodeType: "dummy",
            parentName: "rootdummy",
            position: [0, 0, 1]
          },
          {
            name: "torso_gskin",
            nodeType: "skin",
            parentName: "rootdummy",
            position: [0, 0, 1]
          }
        ]
      }
    };
    const bone = new THREE.Object3D();
    bone.name = "torso_g";
    bone.position.y = 1;
    root.add(bone);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 0, 0], 3)
    );
    const skinMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    skinMesh.name = "torso_gskin";
    skinMesh.userData = {
      aurora: {
        sourceMesh: "torso_gskin",
        sourceNodeType: "skin",
        skinWeights: {
          originalVertexWeights: [[{ bone: "torso_g", weight: 1 }]]
        }
      }
    };
    skinMesh.position.y = 1;
    root.add(skinMesh);

    const runtime = createAuroraSourceSkinningRuntime(root);
    const position = skinMesh.geometry.getAttribute("position");

    expect(runtime?.inverseBindPoseCount).toBe(0);
    expect(runtime?.meshBindPoseSourcesByMesh).toEqual(["torso_gskin:source-hierarchy"]);
    expect(runtime?.bindPoseSourcesByMesh).toEqual([
      "torso_gskin:source-metadata=0,source-hierarchy-fallback=1,world-fallback=0"
    ]);
    runtime?.apply();
    expect(position.getX(0)).toBeCloseTo(0);
    expect(position.getY(0)).toBeCloseTo(0);
    expect(position.getZ(0)).toBeCloseTo(0);

    bone.position.y = 2;
    runtime?.apply();
    expect(position.getY(0)).toBeCloseTo(1);
  });

  it("uses source hierarchy bone bind for model-space Aurora skin vertices", () => {
    const root = new THREE.Group();
    root.userData = {
      aurora: {
        sourceHierarchy: [
          { name: "c_curst", nodeType: "dummy", position: [0, 0, 0] },
          {
            name: "rootdummy",
            nodeType: "dummy",
            parentName: "c_curst",
            position: [0, 0.0320685, 1.26577]
          },
          {
            name: "torso_g",
            nodeType: "dummy",
            parentName: "rootdummy",
            position: [-0.000041794, 0, 0]
          },
          {
            name: "skc_curst_g",
            nodeType: "skin",
            parentName: "c_curst",
            position: [0, 0.0679924, 1.5347]
          }
        ]
      }
    };

    const torso = new THREE.Object3D();
    torso.name = "torso_g";
    torso.position.set(-0.000041794, 1.26577, 0.0320685);
    root.add(torso);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 1, 0], 3));
    const skinMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    skinMesh.name = "skc_curst_g";
    skinMesh.userData = {
      aurora: {
        sourceMesh: "skc_curst_g",
        sourceNodeType: "skin",
        skinWeights: {
          originalVertexWeights: [[{ bone: "torso_g", weight: 1 }]],
          inverseBindPoses: [
            {
              bone: "torso_g",
              qboneRefInv: [0, 0, 0, -1],
              tboneRefInv: [0.000041794, 0.0359239, 0.26893]
            }
          ]
        }
      }
    };
    root.add(skinMesh);

    const runtime = createAuroraSourceSkinningRuntime(root);
    const position = skinMesh.geometry.getAttribute("position");

    expect(runtime?.bindPoseSourcesByMesh).toEqual([
      "skc_curst_g:source-hierarchy=1,source-metadata=0,source-hierarchy-fallback=0,world-fallback=0"
    ]);
    runtime?.apply();
    expect(position.getY(0)).toBeCloseTo(1);

    torso.position.y += 0.25;
    runtime?.apply();
    expect(position.getY(0)).toBeCloseTo(1.25);
  });

  it("keeps creature part source skins in the assembled current pose when inverse binds are missing", () => {
    const root = new THREE.Group();
    root.name = "creature:creature-part-models";
    const animatedBone = new THREE.Object3D();
    animatedBone.name = "torso_g";
    animatedBone.position.y = 1;
    root.add(animatedBone);

    const robePart = new THREE.Group();
    robePart.name = "pmh0_robe173";
    robePart.userData = {
      creaturePartSlot: "robe",
      aurora: {
        sourceHierarchy: [
          { name: "pmh0_robe173", nodeType: "dummy" },
          {
            name: "torso_g",
            nodeType: "dummy",
            parentName: "pmh0_robe173",
            position: [0, 0, 10]
          },
          {
            name: "apron",
            nodeType: "skin",
            parentName: "pmh0_robe173",
            position: [0, 0, 10]
          }
        ]
      }
    };
    root.add(robePart);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
    const apron = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    apron.name = "apron";
    apron.userData = {
      aurora: {
        sourceMesh: "apron",
        sourceNodeType: "skin",
        skinWeights: {
          originalVertexWeights: [[{ bone: "torso_g", weight: 1 }]]
        }
      }
    };
    robePart.add(apron);

    const runtime = createAuroraSourceSkinningRuntime(root);
    const position = apron.geometry.getAttribute("position");

    runtime?.apply();
    expect(position.getY(0)).toBeCloseTo(0);
    expect(runtime?.bindPoseSourcesByMesh).toEqual([
      "apron:source-metadata=0,source-hierarchy-fallback=0,current-pose-fallback=1,world-fallback=0"
    ]);
    expect(runtime?.meshBindPoseSourcesByMesh).toEqual(["apron:current-pose-fallback"]);

    animatedBone.position.y = 2;
    runtime?.apply();
    expect(position.getY(0)).toBeCloseTo(1);
  });

  it("keeps creature part current-pose fallback skins under transformed preview roots", () => {
    const root = new THREE.Group();
    root.name = "creature:creature-part-models";
    root.position.set(0.5, 0, 0.5);
    root.scale.setScalar(0.5);

    const animatedBone = new THREE.Object3D();
    animatedBone.name = "torso_g";
    animatedBone.position.y = 1;
    root.add(animatedBone);

    const robePart = new THREE.Group();
    robePart.name = "pmh0_robe173";
    robePart.userData = {
      creaturePartSlot: "robe"
    };
    root.add(robePart);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
    const apron = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    apron.name = "apron";
    apron.userData = {
      aurora: {
        sourceMesh: "apron",
        sourceNodeType: "skin",
        skinWeights: {
          originalVertexWeights: [[{ bone: "torso_g", weight: 1 }]]
        }
      }
    };
    robePart.add(apron);

    const runtime = createAuroraSourceSkinningRuntime(root);
    const position = apron.geometry.getAttribute("position");

    runtime?.apply();
    expect(position.getX(0)).toBeCloseTo(0);
    expect(position.getY(0)).toBeCloseTo(0);
    expect(position.getZ(0)).toBeCloseTo(0);
    expect(runtime?.bindPoseSourcesByMesh).toEqual([
      "apron:source-metadata=0,source-hierarchy-fallback=0,current-pose-fallback=1,world-fallback=0"
    ]);

    animatedBone.position.y = 2;
    runtime?.apply();
    expect(position.getX(0)).toBeCloseTo(0);
    expect(position.getY(0)).toBeCloseTo(1);
    expect(position.getZ(0)).toBeCloseTo(0);
  });

  it("preserves authored tile GLTF bounds when source hierarchy processing is disabled", async () => {
    const createSourceScene = () => {
      const sourceScene = new THREE.Group();
      sourceScene.userData = {
        aurora: {
          sourceModel: "sic11_a01_07",
          sourceHierarchyNodeCount: 3,
          sourceHierarchyRootNodeNames: ["sic11_a01_07"],
          sourceHierarchyNodeTypes: ["dummy", "trimesh"],
          sourceHierarchy: [
            {
              name: "sic11_a01_07",
              nodeType: "dummy",
              position: [0, 0, 0],
              scale: 1
            },
            {
              name: "pavimento3__170",
              nodeType: "trimesh",
              parentName: "sic11_a01_07",
              position: [0, 0, 0],
              orientation: [0, 0, 0, 0],
              orientationFormat: "axis-angle",
              scale: 1
            },
            {
              name: "trave",
              nodeType: "trimesh",
              parentName: "sic11_a01_07",
              position: [-2.15, -4.02, 2.33111],
              orientation: [0, 0, 1, -0.785398],
              orientationFormat: "axis-angle",
              scale: 1
            }
          ]
        }
      };
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(10, 0.02, 10),
        new THREE.MeshBasicMaterial()
      );
      floor.name = "pavimento3__170";
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(8.974, 4.671, 8.974),
        new THREE.MeshBasicMaterial()
      );
      beam.name = "trave";
      beam.position.set(0.513, 2.331, -0.513);
      sourceScene.add(floor, beam);
      return sourceScene;
    };
    const createRuntime = () =>
      ({
        placeableModelLoader: {
          load: (
            _url: string,
            onLoad: (gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] }) => void
          ) => {
            onLoad({
              scene: createSourceScene(),
              animations: []
            });
            return undefined;
          },
          parse: () => undefined
        },
        placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
        placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
        placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
        placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>()
      }) as unknown as PlaceableModelRuntimeCache;
    const readSize = (model: THREE.Object3D | null) => {
      const bounds = new THREE.Box3().setFromObject(model ?? new THREE.Group());
      const size = new THREE.Vector3();
      bounds.getSize(size);
      return size;
    };

    const defaultModel = await ensurePlaceableModel(
      createRuntime(),
      "/assets/sic11_a01_07.glb"
    );
    const preservedModel = await ensurePlaceableModel(
      createRuntime(),
      "/assets/sic11_a01_07.glb",
      { sourceHierarchyMode: "preserve-loaded" }
    );
    const defaultSize = readSize(defaultModel);
    const preservedSize = readSize(preservedModel);

    expect(defaultModel?.userData.auroraMdlSourceHierarchyRebasedGeometryNodeNames).toEqual([
      "trave"
    ]);
    expect(defaultSize.x).toBeGreaterThan(10.9);
    expect(defaultSize.z).toBeGreaterThan(10.9);
    expect(
      preservedModel?.userData.auroraMdlSourceHierarchyRebasedGeometryNodeNames
    ).toBeUndefined();
    expect(preservedSize.x).toBeCloseTo(10);
    expect(preservedSize.z).toBeCloseTo(10);
  });

  it("parents Aurora source skin meshes without applying source node transforms", async () => {
    const createSourceScene = () => {
      const sourceScene = new THREE.Group();
      sourceScene.name = "scene";
      sourceScene.userData = {
        aurora: {
          sourceModel: "c_skin_test",
          sourceHierarchyNodeCount: 3,
          sourceHierarchyRootNodeNames: ["c_skin_test"],
          sourceHierarchyNodeTypes: ["dummy", "skin"],
          sourceHierarchy: [
            {
              name: "c_skin_test",
              nodeType: "dummy",
              position: [0, 0, 0],
              scale: 1
            },
            {
              name: "rootdummy",
              nodeType: "dummy",
              parentName: "c_skin_test",
              position: [0, 0, 0],
              orientation: [0, 0, 0, 1],
              orientationFormat: "quaternion",
              scale: 1
            },
            {
              name: "bodymesh01",
              nodeType: "skin",
              parentName: "c_skin_test",
              position: [1, 2, 3],
              orientation: [0, 0, 0, 1],
              orientationFormat: "quaternion",
              scale: 1
            }
          ]
        }
      };
      const skinMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
      );
      skinMesh.name = "bodymesh01";
      skinMesh.position.set(0.25, 0, 0);
      skinMesh.userData = {
        aurora: {
          sourceMesh: "bodymesh01",
          sourceNodeType: "skin",
          sourceParentNode: "c_skin_test"
        }
      };
      sourceScene.add(skinMesh);
      return sourceScene;
    };
    const runtime = {
      placeableModelLoader: {
        load: (
          _url: string,
          onLoad: (gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] }) => void
        ) => {
          onLoad({
            scene: createSourceScene(),
            animations: []
          });
          return undefined;
        },
        parse: () => undefined
      },
      placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
      placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
      placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
      placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>()
    } as unknown as PlaceableModelRuntimeCache;

    const model = await ensurePlaceableModel(runtime, "/assets/c_skin_test.glb");
    const root = model?.getObjectByName("c_skin_test");
    const skinMesh = model?.getObjectByName("bodymesh01");

    expect(root).toBeDefined();
    expect(skinMesh?.parent).toBe(root);
    expect(skinMesh?.position.x).toBeCloseTo(0.25);
    expect(skinMesh?.position.y).toBeCloseTo(0);
    expect(skinMesh?.position.z).toBeCloseTo(0);
    expect(model?.userData.auroraMdlSourceHierarchySynthesizedNodeNames).toEqual([
      "c_skin_test",
      "rootdummy"
    ]);
    expect(model?.userData.auroraMdlSourceHierarchyRebasedGeometryNodeNames).toBeUndefined();
  });
});
