// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { rebuildObjectMeshes } from "../../../../src/modules/layout/adapters/three/workspaceObjectMeshLayer";
import {
  registerRuntimeObjectAnimationPlayback,
  sampleRuntimeObjectAnimationAtTime,
  updateRuntimeObjectAnimationPlaybacks
} from "../../../../src/modules/layout/adapters/three/workspaceThreeRuntime";
import {
  AURORA_PLT_PALETTE_COLOR_COUNT,
  AURORA_PLT_PALETTE_ROW_COUNT,
  installAuroraPltPaletteDataForTests,
  resetAuroraPltPaletteDataForTests
} from "../../../../src/modules/placeables/adapters/aurora/auroraPltPalette";
import {
  createAuroraSourceSkinningRuntime,
  readPlaceableModelAnimationClips
} from "../../../../src/modules/placeables/adapters/three/placeableThreeAssetLoader";
import type { CreatureViewportRenderPayload } from "../../../../src/modules/creatures/application/creatureRenderPayloadResolver";
import {
  resolveCreatureEquipmentModelPartResolutions,
  resolveCreatureTextureDeliveryUrlsByReference
} from "../../../../src/modules/creatures/application/creatureRenderAssetResolver";
import type { SceneObject } from "../../../../src/modules/scene/contracts";

const CREATURE_PART_SOURCE_HIERARCHY_CACHE_SUFFIX = "|sourceHierarchy:preserve-loaded";

class CreaturePartModelCacheMap extends Map<string, THREE.Object3D> {
  override set(key: string, value: THREE.Object3D): this {
    super.set(key, value);
    if (
      key.startsWith("creature:") &&
      key.includes(":part:") &&
      !key.endsWith(CREATURE_PART_SOURCE_HIERARCHY_CACHE_SUFFIX)
    ) {
      super.set(`${key}${CREATURE_PART_SOURCE_HIERARCHY_CACHE_SUFFIX}`, value);
    }
    return this;
  }
}

function createRuntime() {
  return {
    container: document.createElement("div"),
    scene: new THREE.Scene(),
    objectLayer: new THREE.Group(),
    objectMeshById: new Map<string, THREE.Object3D>(),
    objectAnimationMixersById: new Map(),
    boundsLayer: new THREE.Group(),
    boundsHelpers: [],
    placeableTextureLoader: { load: vi.fn() },
    placeableDdsTextureLoader: { load: vi.fn() },
    placeableTgaTextureLoader: { load: vi.fn() },
    placeableTextureCacheByUrl: new Map<string, THREE.Texture>(),
    placeableTexturePendingByUrl: new Map<string, Promise<THREE.Texture | null>>(),
    placeableModelLoader: { load: vi.fn() },
    placeableModelCacheByUrl: new CreaturePartModelCacheMap(),
    placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
    placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
    placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>()
  } as unknown as Parameters<typeof rebuildObjectMeshes>[0];
}

function createDebugState() {
  return {
    statusMap: "off",
    hiddenMeshes: false,
    showNonRenderMeshes: false,
    textures: true,
    wireframe: false,
    showVtPhysicalAnchor: false,
    collisionOverlay: false,
    objectLabels: false,
    bounds: false,
    lockedKinds: {
      creatures: false,
      doors: false,
      encounters: false,
      items: false,
      placeables: false,
      sounds: false
    }
  } as unknown as Parameters<typeof rebuildObjectMeshes>[3];
}

function createCreatureObject(): SceneObject {
  return {
    id: "creature_guard_01",
    kind: "creatures",
    name: "Guard Captain",
    resRef: "cre_guard",
    tag: "GUARD_CAPTAIN",
    x: 1,
    y: 2,
    z: 0,
    bearing: 0,
    source: {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature_guard_01",
      templateId: "cre_guard_captain"
    },
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      yaw: 0,
      roll: 0
    }
  };
}

function createCreatureRenderPayload(): CreatureViewportRenderPayload {
  return {
    templateId: "cre_guard_captain",
    cacheKey: "cre_guard_captain:v1",
    cacheHit: false,
    storedAt: "2026-01-01T00:00:00.000Z",
    hits: 0,
    creature: {
      templateId: "cre_guard_captain",
      kind: "creature",
      resref: "cre_guard",
      name: "Guard Captain",
      category: "npc",
      benchmarkCandidate: false,
      render: {
        backendType: "creature",
        frontendType: "creature",
        rendererPreset: "creature-standard"
      },
      creatureRenderPackage: {
        status: "missing_derived",
        diagnostics: [
          {
            code: "CREATURE_RENDER_DERIVED_MODEL_MISSING",
            severity: "warn",
            message: "No derived creature model is available yet."
          }
        ],
        rendererPreset: "creature-standard",
        appearanceProfile: {
          appearanceType: 6,
          appearanceLabel: "Human",
          modelType: "P",
          raceModel: "P_HHM",
          sizeCategory: 3,
          sizeCategoryLabel: "Medium"
        },
        sourceModelCandidates: [
          {
            resref: "P_HHM",
            role: "appearance-race-model",
            source: "appearance.2da.RACE",
            confidence: "assembly-prefix"
          }
        ],
        skeletonModelCandidates: [
          {
            resref: "pfh2",
            role: "base-skeleton",
            source: "part-model-prefix",
            modelPrefix: "pfh2_",
            confidence: "prefix-derived",
            assetId: "asset-pfh2-glb",
            glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-pfh2-glb.glb"
          }
        ],
        partModelCandidates: [
          {
            slot: "rFoot",
            partId: 4,
            partModelName: "rfoot",
            nodeName: "rfoot_g",
            modelPrefix: "pfh2_",
            modelResRef: "pfh2_rfoot004",
            modelResRefPattern: "aurora-player-body-part",
            modelResRefPatternFormat: "p%c%c%s_%s_%03d",
            source: "capart.2da.MDLNAME",
            source2daRow: 0,
            sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
          }
        ],
        equipmentModelCandidates: [],
        bodyParts: {
          head: 1
        },
        colors: {
          skin: 2
        },
        materialPipelineEvidence: {
          source: "decompiled-aurora",
          pltVertexShaderName: "vs_pltgen",
          pltFragmentShaderName: "fs_pltgen",
          pltSchemeUniformPattern: "PLTscheme[%d]",
          pltSchemeUniformCount: 15,
          pltReplacementUniformName: "pltreplacement",
          skinPaletteResRef: "pal_skin01"
        },
        skeletonPipelineEvidence: {
          source: "decompiled-aurora",
          supermodelCommandName: "setsupermodel",
          animationScaleCommandName: "setanimationscale",
          skinnedMeshNodeType: "skinmesh",
          requiresComposedSkeleton: true
        }
      },
      creatureRuntime: {
        state: {
          animationState: 2
        }
      },
      processedAt: "2026-01-01T00:00:00.000Z"
    },
    renderPackage: {
      status: "missing_derived",
      diagnostics: [
        {
          code: "CREATURE_RENDER_DERIVED_MODEL_MISSING",
          severity: "warn",
          message: "No derived creature model is available yet."
        }
      ],
      rendererPreset: "creature-standard",
      appearanceProfile: {
        appearanceType: 6,
        appearanceLabel: "Human",
        modelType: "P",
        raceModel: "P_HHM",
        sizeCategory: 3,
        sizeCategoryLabel: "Medium"
      },
      sourceModelCandidates: [
        {
          resref: "P_HHM",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "assembly-prefix"
        }
      ],
      skeletonModelCandidates: [
        {
          resref: "pfh2",
          role: "base-skeleton",
          source: "part-model-prefix",
          modelPrefix: "pfh2_",
          confidence: "prefix-derived",
          assetId: "asset-pfh2-glb",
          glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-pfh2-glb.glb"
        }
      ],
      partModelCandidates: [
        {
          slot: "rFoot",
          partId: 4,
          partModelName: "rfoot",
          nodeName: "rfoot_g",
          modelPrefix: "pfh2_",
          modelResRef: "pfh2_rfoot004",
          modelResRefPattern: "aurora-player-body-part",
          modelResRefPatternFormat: "p%c%c%s_%s_%03d",
          source: "capart.2da.MDLNAME",
          source2daRow: 0,
          sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
        }
      ],
      equipmentModelCandidates: [],
      bodyParts: {
        head: 1
      },
      colors: {
        skin: 2
      },
      materialPipelineEvidence: {
        source: "decompiled-aurora",
        pltVertexShaderName: "vs_pltgen",
        pltFragmentShaderName: "fs_pltgen",
        pltSchemeUniformPattern: "PLTscheme[%d]",
        pltSchemeUniformCount: 15,
        pltReplacementUniformName: "pltreplacement",
        skinPaletteResRef: "pal_skin01"
      },
      skeletonPipelineEvidence: {
        source: "decompiled-aurora",
        supermodelCommandName: "setsupermodel",
        animationScaleCommandName: "setanimationscale",
        skinnedMeshNodeType: "skinmesh",
        requiresComposedSkeleton: true
      }
    }
  };
}

function createReadyCreatureRenderPayload(): CreatureViewportRenderPayload {
  const payload = createCreatureRenderPayload();
  const readyRenderPackage = {
    ...payload.renderPackage!,
    status: "ready" as const,
    diagnostics: [
      {
        code: "CREATURE_RENDER_DIRECT_MODEL_READY",
        severity: "warn" as const,
        message: "Direct creature model is ready."
      }
    ],
    appearanceProfile: {
      appearanceType: 23,
      appearanceLabel: "Bear",
      modelType: "S",
      raceModel: "n_bear",
      sizeCategory: 4,
      sizeCategoryLabel: "Large"
    },
    sourceModelCandidates: [
      {
        resref: "n_bear",
        role: "appearance-race-model" as const,
        source: "appearance.2da.RACE" as const,
        confidence: "direct-model" as const
      }
    ],
    skeletonModelCandidates: [],
    assetRefs: {
      derivedModelAssetIds: ["asset-bear-glb"]
    },
    glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-bear-glb.glb",
    bodyParts: {},
    colors: {}
  };
  payload.renderPackage = readyRenderPackage;
  payload.creature.creatureRenderPackage = readyRenderPackage;
  return payload;
}

function createPartModelReadyCreatureRenderPayload(): CreatureViewportRenderPayload {
  const payload = createCreatureRenderPayload();
  const partModelCandidates = payload.renderPackage!.partModelCandidates.map((candidate) => ({
    ...candidate,
    assetId: "asset-rfoot-glb",
    glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-rfoot-glb.glb"
  }));
  payload.renderPackage = {
    ...payload.renderPackage!,
    skeletonModelCandidates: [],
    partModelCandidates
  };
  payload.creature.creatureRenderPackage = {
    ...payload.creature.creatureRenderPackage!,
    skeletonModelCandidates: [],
    partModelCandidates
  };
  return payload;
}

function createMultiPartModelReadyCreatureRenderPayload(): CreatureViewportRenderPayload {
  const payload = createCreatureRenderPayload();
  const partModelCandidates = [
    {
      ...payload.renderPackage!.partModelCandidates[0]!,
      assetId: "asset-rfoot-glb",
      glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-rfoot-glb.glb"
    },
    {
      ...payload.renderPackage!.partModelCandidates[0]!,
      slot: "rShin" as const,
      partId: 6,
      partModelName: "rshin",
      nodeName: "rshin_g",
      modelResRef: "pfh2_rshin006",
      assetId: "asset-rshin-glb",
      glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-rshin-glb.glb",
      source2daRow: 2
    }
  ];
  payload.renderPackage = {
    ...payload.renderPackage!,
    partModelCandidates
  };
  payload.creature.creatureRenderPackage = {
    ...payload.creature.creatureRenderPackage!,
    partModelCandidates
  };
  return payload;
}

function createFullPlayerBodyPartModelReadyCreatureRenderPayload(): CreatureViewportRenderPayload {
  const payload = createCreatureRenderPayload();
  const baseCandidate = payload.renderPackage!.partModelCandidates[0]!;
  const partSpecs = [
    ["head", 148, "head", "", "pmh0_head148"],
    ["neck", 1, "neck", "neck_g", "pmh0_neck001"],
    ["torso", 1, "chest", "torso_g", "pmh0_chest001"],
    ["pelvis", 1, "pelvis", "pelvis_g", "pmh0_pelvis001"],
    ["lBicep", 1, "bicepl", "lbicep_g", "pmh0_bicepl001"],
    ["rBicep", 1, "bicepr", "rbicep_g", "pmh0_bicepr001"],
    ["lFArm", 1, "forel", "lforearm_g", "pmh0_forel001"],
    ["rFArm", 1, "forer", "rforearm_g", "pmh0_forer001"],
    ["lHand", 1, "handl", "lhand_g", "pmh0_handl001"],
    ["rHand", 1, "handr", "rhand_g", "pmh0_handr001"],
    ["lThigh", 1, "legl", "lthigh_g", "pmh0_legl001"],
    ["rThigh", 1, "legr", "rthigh_g", "pmh0_legr001"],
    ["lShin", 1, "shinl", "lshin_g", "pmh0_shinl001"],
    ["rShin", 1, "shinr", "rshin_g", "pmh0_shinr001"],
    ["lFoot", 1, "footl", "lfoot_g", "pmh0_footl001"],
    ["rFoot", 1, "footr", "rfoot_g", "pmh0_footr001"]
  ] as const;
  const partModelCandidates = partSpecs.map(
    ([slot, partId, partModelName, nodeName, modelResRef], index) => ({
      ...baseCandidate,
      slot,
      partId,
      partModelName,
      nodeName: nodeName || undefined,
      modelPrefix: "pmh0_",
      modelResRef,
      assetId: `asset-${slot}-glb`,
      glbUrl: `/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-${slot}-glb.glb`,
      source: slot === "head" ? ("utc.Appearance_Head" as const) : baseCandidate.source,
      source2daRow: index
    })
  );
  payload.renderPackage = {
    ...payload.renderPackage!,
    skeletonModelCandidates: [],
    partModelCandidates
  };
  payload.creature.creatureRenderPackage = {
    ...payload.creature.creatureRenderPackage!,
    skeletonModelCandidates: [],
    partModelCandidates
  };
  return payload;
}

function createCreatureRenderPayloadWithEquipment(
  payload: CreatureViewportRenderPayload = createCreatureRenderPayload()
): CreatureViewportRenderPayload {
  const equipmentModelCandidates = [
    {
      resref: "nw_wswmls001",
      itemTemplateId: "itm_nw_wswmls001",
      slotMask: 16,
      slotLabels: ["right hand"],
      attachmentTargets: ["rhand_g"],
      primaryAttachmentTarget: "rhand_g",
      baseItem: 6,
      itemName: "Longsword",
      itemModelType: "wsw",
      itemModelParts: [2, 1, 3],
      itemModelPartRoles: ["blade", "middle", "top"],
      itemModelPartResRefs: ["wswb_002", "wswm_001", "wswt_003"],
      itemModelPartCandidates: [
        {
          resref: "wswb_002",
          role: "blade",
          partId: 2,
          assetId: "asset-wswb-glb",
          glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wswb-glb.glb"
        },
        {
          resref: "wswm_001",
          role: "middle",
          partId: 1
        },
        {
          resref: "wswt_003",
          role: "top",
          partId: 3
        }
      ],
      itemModelPartSourceKey: "modules/current/__aurora/sources/hak/lc_2da/baseitems.2da",
      source: "utc.Equip_ItemList" as const,
      sourceModelStatus: "model-resrefs-ready" as const
    }
  ];
  payload.renderPackage = {
    ...payload.renderPackage!,
    equipmentModelCandidates
  };
  payload.creature.creatureRenderPackage = {
    ...payload.creature.creatureRenderPackage!,
    equipmentModelCandidates
  };
  return payload;
}

function collectCreatureEquipmentMarkers(root: THREE.Object3D | undefined): THREE.Object3D[] {
  const markers: THREE.Object3D[] = [];
  root?.traverse((node) => {
    if (
      node !== root &&
      node.userData?.creatureEquipmentMarkerStatus === "source-equipment-marker"
    ) {
      markers.push(node);
    }
  });
  return markers;
}

function createCachedModel(height = 2): THREE.Object3D {
  const group = new THREE.Group();
  group.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(1, height, 1),
      new THREE.MeshBasicMaterial({ color: 0xffaa88 })
    )
  );
  return group;
}

function createMtrTexturedCachedModel(): THREE.Object3D {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
  material.userData = {
    aurora: {
      textureReference: "mtr_panel",
      textureReferences: ["panel_d", "panel_n"]
    }
  };
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), material);
  mesh.name = "mtr_creature_mesh";
  group.add(mesh);
  return group;
}

function createAnimatedSkinnedCachedModel(): THREE.Object3D {
  const group = new THREE.Group();
  group.userData = {
    auroraGltfAnimationCount: 2,
    auroraGltfAnimationNames: ["walk", "idle"],
    auroraGltfAnimationDurations: [1.25, 2.5],
    auroraGltfHasAnimations: true,
    auroraMdlRenderSuppressedMeshCount: 1,
    auroraMdlRenderSuppressedMeshNames: ["body_bone"]
  };
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("walk", 1.25, []),
      new THREE.AnimationClip("idle", 2.5, [])
    ],
    writable: true
  });
  const rootBone = new THREE.Bone();
  rootBone.name = "rootdummy";
  const geometry = new THREE.BoxGeometry(1, 2, 1);
  const vertexCount = geometry.attributes.position?.count ?? 0;
  const skinIndices = new Uint16Array(vertexCount * 4);
  const skinWeights = new Float32Array(vertexCount * 4);
  for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex += 1) {
    skinWeights[vertexIndex * 4] = 1;
  }
  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));
  const skinnedMesh = new THREE.SkinnedMesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: 0xffaa88 })
  );
  skinnedMesh.name = "torso_skin";
  skinnedMesh.add(rootBone);
  skinnedMesh.bind(new THREE.Skeleton([rootBone]));
  group.add(skinnedMesh);
  return group;
}

function createPrefixedIdleCachedModel(): THREE.Object3D {
  const group = createCachedModel(1);
  group.userData = {
    ...group.userData,
    auroraGltfAnimationCount: 3,
    auroraGltfAnimationNames: ["cgetmidlp", "pauseturn", "cpause1"],
    auroraGltfAnimationDurations: [0.03, 0.4, 3.3],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("cgetmidlp", 0.03, []),
      new THREE.AnimationClip("pauseturn", 0.4, []),
      new THREE.AnimationClip("cpause1", 3.3, [])
    ],
    writable: true
  });
  return group;
}

function createFireAndForgetCachedModel(): THREE.Object3D {
  const group = createCachedModel(1);
  const bowClip = new THREE.AnimationClip("bow", 1, []);
  bowClip.userData = {
    auroraMdlSourceAnimationTransitionTime: 0.25
  };
  group.userData = {
    ...group.userData,
    auroraGltfAnimationCount: 3,
    auroraGltfAnimationNames: ["bowrdy", "bow", "pause1"],
    auroraGltfAnimationDurations: [1, 1, 2],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("bowrdy", 1, []),
      bowClip,
      new THREE.AnimationClip("pause1", 2, [])
    ],
    writable: true
  });
  return group;
}

function createNeutralAndEquipmentPauseCachedModel(): THREE.Object3D {
  const group = createCachedModel(1);
  group.userData = {
    ...group.userData,
    auroraGltfAnimationCount: 3,
    auroraGltfAnimationNames: ["pausesh", "pause1", "pause2"],
    auroraGltfAnimationDurations: [0.6, 2.5, 3.5],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("pausesh", 0.6, []),
      new THREE.AnimationClip("pause1", 2.5, []),
      new THREE.AnimationClip("pause2", 3.5, [])
    ],
    writable: true
  });
  return group;
}

function createReadyStanceCachedModel(): THREE.Object3D {
  const group = createCachedModel(1);
  group.userData = {
    ...group.userData,
    auroraGltfAnimationCount: 3,
    auroraGltfAnimationNames: ["2hreadyl", "2hreadyr", "plslashl"],
    auroraGltfAnimationDurations: [1.5, 1.4, 0.8],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("2hreadyl", 1.5, []),
      new THREE.AnimationClip("2hreadyr", 1.4, []),
      new THREE.AnimationClip("plslashl", 0.8, [])
    ],
    writable: true
  });
  return group;
}

function createDirectCreatureSourceHierarchyCachedModel(): THREE.Object3D {
  const group = createCachedModel(2);
  group.name = "c_bearbrwn";
  const root = new THREE.Object3D();
  root.name = "rootdummy";
  const rightShin = new THREE.Object3D();
  rightShin.name = "rshin_g";
  root.add(rightShin);
  group.add(root);
  return group;
}

function createDirectCreatureSourceHierarchyCachedModelWithOwnIdle(): THREE.Object3D {
  const group = createDirectCreatureSourceHierarchyCachedModel();
  group.userData = {
    ...group.userData,
    auroraMdlSourceModel: "c_bearbrwn",
    auroraMdlSourceAnimationCount: 1,
    auroraMdlSourceAnimationNames: ["pause1"],
    auroraMdlSourceAnimationClipCount: 1,
    auroraMdlSourceAnimationClipNames: ["pause1"],
    auroraGltfAnimationCount: 1,
    auroraGltfAnimationNames: ["pause1"],
    auroraGltfAnimationDurations: [1],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("pause1", 1, [
        new THREE.VectorKeyframeTrack(
          "rootdummy.position",
          [0, 1],
          [0, 0, 0, 0, 0, 0]
        )
      ])
    ],
    writable: true
  });
  return group;
}

function createDirectCreatureBowHierarchyCachedModelWithOwnIdle(): THREE.Object3D {
  const group = createDirectCreatureSourceHierarchyCachedModelWithOwnIdle();
  const root = group.getObjectByName("rootdummy");
  const torso = new THREE.Object3D();
  torso.name = "torso_g";
  root?.add(torso);
  return group;
}

function createSegmentedHumanoidSourceAnimatedCachedModel(): THREE.Object3D {
  const group = createCachedModel(2);
  group.name = "c_orca";
  const mesh = group.children.find((child): child is THREE.Mesh => child instanceof THREE.Mesh);
  if (mesh) {
    mesh.name = "torso_g";
  }
  group.userData = {
    ...group.userData,
    auroraMdlSourceModel: "c_orca",
    auroraMdlSourceAnimationCount: 1,
    auroraMdlSourceAnimationNames: ["pause1"],
    auroraMdlSourceAnimationClipCount: 1,
    auroraMdlSourceAnimationClipNames: ["pause1"],
    auroraMdlSourceHierarchyRebasedGeometryCount: 1,
    auroraMdlSourceHierarchyRebasedGeometryNodeNames: ["torso_g"],
    auroraGltfAnimationCount: 1,
    auroraGltfAnimationNames: ["pause1"],
    auroraGltfAnimationDurations: [1],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("pause1", 1, [
        new THREE.VectorKeyframeTrack(
          "torso_g.position",
          [0, 1],
          [0, 0, 0, 0, 0.2, 0]
        )
      ])
    ],
    writable: true
  });
  return group;
}

function createSegmentedHumanoidSourceAnimatedCachedModelWithMissingTargets(): THREE.Object3D {
  const group = createSegmentedHumanoidSourceAnimatedCachedModel();
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("pause1", 1, [
        new THREE.VectorKeyframeTrack(
          "torso_g.position",
          [0, 1],
          [0, 0, 0, 0, 0.2, 0]
        ),
        new THREE.QuaternionKeyframeTrack(
          "Gargoyle_RwingfingerA.quaternion",
          [0, 1],
          [0, 0, 0, 1, 0, 0, 0, 1]
        )
      ])
    ],
    writable: true
  });
  return group;
}

function createSegmentedHumanoidEquipmentPauseCachedModel(): THREE.Object3D {
  const group = createCachedModel(2);
  group.name = "c_goblina";
  const mesh = group.children.find((child): child is THREE.Mesh => child instanceof THREE.Mesh);
  if (mesh) {
    mesh.name = "torso_g";
  }
  group.userData = {
    ...group.userData,
    auroraMdlSourceModel: "c_goblina",
    auroraMdlSourceAnimationCount: 1,
    auroraMdlSourceAnimationNames: ["pausesh"],
    auroraMdlSourceAnimationClipCount: 1,
    auroraMdlSourceAnimationClipNames: ["pausesh"],
    auroraMdlSourceHierarchyRebasedGeometryCount: 1,
    auroraMdlSourceHierarchyRebasedGeometryNodeNames: ["torso_g"],
    auroraGltfAnimationCount: 1,
    auroraGltfAnimationNames: ["pausesh"],
    auroraGltfAnimationDurations: [1],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("pausesh", 1, [
        new THREE.VectorKeyframeTrack(
          "torso_g.position",
          [0, 1],
          [0, 0, 0, 0, 0.1, 0]
        )
      ])
    ],
    writable: true
  });
  return group;
}

function createDeclaredDirectCreatureCachedModel(): THREE.Object3D {
  const group = createSegmentedHumanoidSourceAnimatedCachedModel();
  group.name = "c_oldwara";
  group.userData = {
    ...group.userData,
    auroraMdlSourceModel: "c_oldwara",
    auroraMdlSupermodel: "a_ba",
    auroraMdlSourceAnimationNames: ["pausesh"],
    auroraMdlSourceAnimationClipNames: ["pausesh"],
    auroraGltfAnimationNames: ["pausesh"]
  };
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("pausesh", 1, [
        new THREE.VectorKeyframeTrack(
          "torso_g.position",
          [0, 1],
          [0, 0, 0, 0, 0.05, 0]
        )
      ])
    ],
    writable: true
  });
  return group;
}

function createSourceSkinnedAnimatedCachedModel(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "source_creature";
  group.userData = {
    auroraGltfAnimationCount: 1,
    auroraGltfAnimationNames: ["super_walk"],
    auroraGltfAnimationDurations: [1],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("super_walk", 1, [
        new THREE.VectorKeyframeTrack(
          "rshin_g.position",
          [0, 1],
          [0, 0, 0, 0, 2, 0]
        )
      ])
    ],
    writable: true
  });

  const root = new THREE.Object3D();
  root.name = "rootdummy";
  const rightShin = new THREE.Object3D();
  rightShin.name = "rshin_g";
  root.add(rightShin);
  group.add(root);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
  const skinMesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: 0x88aaff })
  );
  skinMesh.name = "torso_skin";
  skinMesh.userData = {
    aurora: {
      sourceMesh: "torso_skin",
      sourceNodeType: "skin",
      skinWeights: {
        format: "aurora-mdl-original-vertex-weights",
        sourceWeightVertexCount: 1,
        gltfVertexSourceIndices: [0],
        influencingBoneNames: ["rshin_g"],
        maxInfluencesPerVertex: 1,
        requiresWeightNormalization: false,
        originalVertexWeights: [[{ bone: "rshin_g", weight: 1 }]]
      }
    }
  };
  group.add(skinMesh);
  return group;
}

function createSourceSkinnedRobePartModel(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "pfh2_robe004";

  const root = new THREE.Object3D();
  root.name = "rootdummy";
  group.add(root);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
  const skinMesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: 0x333333 })
  );
  skinMesh.name = "pfh2_robe004g";
  skinMesh.userData = {
    aurora: {
      sourceMesh: "pfh2_robe004g",
      sourceNodeType: "skin",
      skinWeights: {
        format: "aurora-mdl-original-vertex-weights",
        sourceWeightVertexCount: 1,
        gltfVertexSourceIndices: [0],
        influencingBoneNames: ["rshin_g"],
        maxInfluencesPerVertex: 1,
        requiresWeightNormalization: false,
        originalVertexWeights: [[{ bone: "rshin_g", weight: 1 }]]
      }
    }
  };
  root.add(skinMesh);
  return group;
}

function createSimpleSourceSkinnedOwnClipCachedModel(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "c_simple_skin";
  group.userData = {
    auroraMdlSourceModel: "c_simple_skin",
    auroraMdlSourceAnimationCount: 1,
    auroraMdlSourceAnimationNames: ["ca1slashl"],
    auroraMdlSourceAnimationClipCount: 1,
    auroraMdlSourceAnimationClipNames: ["ca1slashl"],
    auroraMdlSourceHierarchyRebasedGeometryCount: 1,
    auroraMdlSourceHierarchyRebasedGeometryNodeNames: ["torso_skin"],
    auroraGltfAnimationCount: 1,
    auroraGltfAnimationNames: ["ca1slashl"],
    auroraGltfAnimationDurations: [1],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("ca1slashl", 1, [
        new THREE.VectorKeyframeTrack(
          "wing_dummy.position",
          [0, 1],
          [0, 0, 0, 0, 0.5, 0]
        )
      ])
    ],
    writable: true
  });

  const root = new THREE.Object3D();
  root.name = "c_simple_skin";
  const wing = new THREE.Object3D();
  wing.name = "wing_dummy";
  const skinBone = new THREE.Object3D();
  skinBone.name = "skin_bone";
  root.add(wing, skinBone);
  group.add(root);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
  const skinMesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: 0x996644 })
  );
  skinMesh.name = "torso_skin";
  skinMesh.userData = {
    aurora: {
      sourceMesh: "torso_skin",
      sourceNodeType: "skin",
      skinWeights: {
        format: "aurora-mdl-original-vertex-weights",
        sourceWeightVertexCount: 1,
        gltfVertexSourceIndices: [0],
        influencingBoneNames: ["skin_bone"],
        maxInfluencesPerVertex: 1,
        requiresWeightNormalization: false,
        originalVertexWeights: [[{ bone: "skin_bone", weight: 1 }]]
      }
    }
  };
  group.add(skinMesh);
  return group;
}

function createBoneDrivenSourceSkinnedOwnClipCachedModel(): THREE.Object3D {
  const group = createSimpleSourceSkinnedOwnClipCachedModel();
  group.name = "c_bone_skin";
  group.userData = {
    ...group.userData,
    auroraMdlSourceModel: "c_bone_skin",
    auroraMdlSourceHierarchyRebasedGeometryCount: 0,
    auroraMdlSourceHierarchyRebasedGeometryNodeNames: []
  };
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("ca1slashl", 1, [
        new THREE.VectorKeyframeTrack(
          "skin_bone.position",
          [0, 1],
          [0, 0, 0, 0, 0.5, 0]
        )
      ])
    ],
    writable: true
  });
  return group;
}

function createHybridOwnSourceSkinnedDirectClipCachedModel(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "c_drgblack";
  group.userData = {
    auroraMdlSourceModel: "c_drgblack",
    auroraMdlSourceAnimationCount: 1,
    auroraMdlSourceAnimationNames: ["cpause1"],
    auroraMdlSourceAnimationClipCount: 1,
    auroraMdlSourceAnimationClipNames: ["cpause1"],
    auroraMdlSourceHierarchyRebasedGeometryCount: 2,
    auroraMdlSourceHierarchyRebasedGeometryNodeNames: [
      "Dragon_chest",
      "Dragon_claw"
    ],
    auroraGltfAnimationCount: 1,
    auroraGltfAnimationNames: ["cpause1"],
    auroraGltfAnimationDurations: [1],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("cpause1", 1, [
        new THREE.VectorKeyframeTrack(
          "skin_bone.position",
          [0, 1],
          [0, 0, 0, 0, 0.5, 0]
        ),
        new THREE.VectorKeyframeTrack(
          "Dragon_chest.position",
          [0, 1],
          [0, 0, 0, 0, 0.25, 0]
        ),
        new THREE.VectorKeyframeTrack(
          "Dragon_claw.position",
          [0, 1],
          [0, 0, 0, 0.5, 0, 0]
        )
      ])
    ],
    writable: true
  });

  const root = new THREE.Object3D();
  root.name = "c_drgblack";
  const skinBone = new THREE.Object3D();
  skinBone.name = "skin_bone";
  const chest = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({ color: 0x222222 })
  );
  chest.name = "Dragon_chest";
  const claw = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({ color: 0x444444 })
  );
  claw.name = "Dragon_claw";
  root.add(skinBone, chest, claw);
  group.add(root);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
  const skinMesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: 0x111111 })
  );
  skinMesh.name = "Dragon_skin";
  skinMesh.userData = {
    aurora: {
      sourceMesh: "Dragon_skin",
      sourceNodeType: "skin",
      skinWeights: {
        format: "aurora-mdl-original-vertex-weights",
        sourceWeightVertexCount: 1,
        gltfVertexSourceIndices: [0],
        influencingBoneNames: ["skin_bone"],
        maxInfluencesPerVertex: 1,
        requiresWeightNormalization: false,
        originalVertexWeights: [[{ bone: "skin_bone", weight: 1 }]]
      }
    }
  };
  group.add(skinMesh);
  return group;
}

function createVisibleSourceSkinRetargetCachedModel(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "c_visible_skin";
  group.userData = {
    auroraMdlSourceModel: "c_visible_skin",
    auroraMdlSourceHierarchyRebasedGeometryCount: 1,
    auroraMdlSourceHierarchyRebasedGeometryNodeNames: ["torso_g"],
    auroraGltfAnimationCount: 0,
    auroraGltfAnimationNames: [],
    auroraGltfAnimationDurations: [],
    auroraGltfHasAnimations: false
  };

  const root = new THREE.Object3D();
  root.name = "c_visible_skin";
  const skinBone = new THREE.Object3D();
  skinBone.name = "skin_bone";
  root.add(skinBone);
  group.add(root);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
  const skinMesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: 0x559966 })
  );
  skinMesh.name = "torso_g";
  skinMesh.userData = {
    aurora: {
      sourceMesh: "torso_g",
      sourceNodeType: "skin",
      skinWeights: {
        format: "aurora-mdl-original-vertex-weights",
        sourceWeightVertexCount: 1,
        gltfVertexSourceIndices: [0],
        influencingBoneNames: ["skin_bone"],
        maxInfluencesPerVertex: 1,
        requiresWeightNormalization: false,
        originalVertexWeights: [[{ bone: "skin_bone", weight: 1 }]]
      }
    }
  };
  group.add(skinMesh);
  return group;
}

function createHybridSourceSkinRetargetCachedModel(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "c_hybrid_skin";
  group.userData = {
    auroraMdlSourceModel: "c_hybrid_skin",
    auroraMdlSourceHierarchyRebasedGeometryCount: 2,
    auroraMdlSourceHierarchyRebasedGeometryNodeNames: ["torso", "Rclaw"],
    auroraGltfAnimationCount: 0,
    auroraGltfAnimationNames: [],
    auroraGltfAnimationDurations: [],
    auroraGltfHasAnimations: false
  };

  const root = new THREE.Object3D();
  root.name = "c_hybrid_skin";
  const torso = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({ color: 0x333399 })
  );
  torso.name = "torso";
  const claw = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({ color: 0x993333 })
  );
  claw.name = "Rclaw";
  root.add(torso, claw);
  group.add(root);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
  const skinMesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: 0x559966 })
  );
  skinMesh.name = "bodymesh01";
  skinMesh.userData = {
    aurora: {
      sourceMesh: "bodymesh01",
      sourceNodeType: "skin",
      skinWeights: {
        format: "aurora-mdl-original-vertex-weights",
        sourceWeightVertexCount: 1,
        gltfVertexSourceIndices: [0],
        influencingBoneNames: ["torso"],
        maxInfluencesPerVertex: 1,
        requiresWeightNormalization: false,
        originalVertexWeights: [[{ bone: "torso", weight: 1 }]]
      }
    }
  };
  group.add(skinMesh);
  return group;
}

function createHybridSourceSkinRetargetCachedModelWithOwnSourceClip(): THREE.Object3D {
  const group = createHybridSourceSkinRetargetCachedModel();
  group.name = "c_lizardman01";
  group.userData = {
    ...group.userData,
    auroraMdlSourceModel: "c_lizardman01",
    auroraMdlSourceAnimationCount: 1,
    auroraMdlSourceAnimationNames: ["custom11lp"],
    auroraMdlSourceAnimationClipCount: 1,
    auroraMdlSourceAnimationClipNames: ["custom11lp"],
    auroraGltfAnimationCount: 1,
    auroraGltfAnimationNames: ["custom11lp"],
    auroraGltfAnimationDurations: [1],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("custom11lp", 1, [
        new THREE.VectorKeyframeTrack(
          "torso.position",
          [0, 1],
          [0, 0, 0, 0, 0.05, 0]
        )
      ])
    ],
    writable: true
  });
  return group;
}

function createSourceSkinnedHiddenDriverCachedModel(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "c_a_chicken";
  group.userData = {
    auroraMdlSourceModel: "c_a_chicken",
    auroraMdlSourceAnimationCount: 1,
    auroraMdlSourceAnimationNames: ["ccwalkf"],
    auroraMdlSourceAnimationClipCount: 1,
    auroraMdlSourceAnimationClipNames: ["ccwalkf"],
    auroraMdlSourceHierarchyRebasedGeometryCount: 1,
    auroraMdlSourceHierarchyRebasedGeometryNodeNames: ["body_bone"],
    auroraMdlRenderSuppressedMeshCount: 1,
    auroraMdlRenderSuppressedMeshNames: ["body_bone"],
    auroraGltfAnimationCount: 1,
    auroraGltfAnimationNames: ["ccwalkf"],
    auroraGltfAnimationDurations: [1],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("ccwalkf", 1, [
        new THREE.VectorKeyframeTrack(
          "body_bone.position",
          [0, 1],
          [0, 0, 0, 2, 0.5, 3]
        )
      ])
    ],
    writable: true
  });

  const root = new THREE.Object3D();
  root.name = "c_a_chicken";
  const bodyDriver = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  bodyDriver.name = "body_bone";
  root.add(bodyDriver);
  group.add(root);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
  const skinMesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: 0x885533 })
  );
  skinMesh.name = "chicken";
  skinMesh.userData = {
    aurora: {
      sourceMesh: "chicken",
      sourceNodeType: "skin",
      skinWeights: {
        format: "aurora-mdl-original-vertex-weights",
        sourceWeightVertexCount: 1,
        gltfVertexSourceIndices: [0],
        influencingBoneNames: ["body_bone"],
        maxInfluencesPerVertex: 1,
        requiresWeightNormalization: false,
        originalVertexWeights: [[{ bone: "body_bone", weight: 1 }]]
      }
    }
  };
  group.add(skinMesh);
  return group;
}

function createSourceSkinnedAttachmentAnchorCachedModel(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "c_anchor_skin";
  group.userData = {
    auroraMdlSourceModel: "c_anchor_skin",
    auroraMdlSourceHierarchyRebasedGeometryCount: 3,
    auroraMdlSourceHierarchyRebasedGeometryNodeNames: ["lhand_g", "rhand_g", "head_g"],
    auroraGltfAnimationCount: 0,
    auroraGltfAnimationNames: [],
    auroraGltfAnimationDurations: [],
    auroraGltfHasAnimations: false
  };

  const root = new THREE.Object3D();
  root.name = "c_anchor_skin";
  const bodyDriver = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  bodyDriver.name = "body_bone";
  const leftHand = new THREE.Object3D();
  leftHand.name = "lhand_g";
  const rightHand = new THREE.Object3D();
  rightHand.name = "rhand_g";
  const head = new THREE.Object3D();
  head.name = "head_g";
  root.add(bodyDriver, leftHand, rightHand, head);
  group.add(root);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
  const skinMesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: 0x886633 })
  );
  skinMesh.name = "body_skin";
  skinMesh.userData = {
    aurora: {
      sourceMesh: "body_skin",
      sourceNodeType: "skin",
      skinWeights: {
        format: "aurora-mdl-original-vertex-weights",
        sourceWeightVertexCount: 1,
        gltfVertexSourceIndices: [0],
        influencingBoneNames: ["body_bone", "lhand_g", "rhand_g", "head_g"],
        maxInfluencesPerVertex: 1,
        requiresWeightNormalization: false,
        originalVertexWeights: [[{ bone: "body_bone", weight: 1 }]]
      }
    }
  };
  group.add(skinMesh);
  return group;
}

function createSourceSkinnedVisibleRootMotionCachedModel(): THREE.Object3D {
  const model = createSourceSkinnedHiddenDriverCachedModel();
  model.userData.auroraMdlRenderSuppressedMeshCount = 0;
  model.userData.auroraMdlRenderSuppressedMeshNames = [];
  return model;
}

function createDanglymeshAnimatedCachedModel(options: {
  disableDanglymeshInAnimation?: boolean;
} = {}): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "dangly_creature";
  group.userData = {
    auroraGltfAnimationCount: 1,
    auroraGltfAnimationNames: ["idle"],
    auroraGltfAnimationDurations: [1],
    auroraGltfHasAnimations: true
  };
  const idleClip = new THREE.AnimationClip("idle", 1, []);
  if (options.disableDanglymeshInAnimation) {
    (idleClip as THREE.AnimationClip & { userData?: Record<string, unknown> }).userData = {
      auroraDanglymeshAnimationOverrides: [
        {
          nodeName: "cloak_dangly",
          displacement: 0,
          period: 0.25,
          tightness: 0.75
        }
      ]
    };
  }
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [idleClip],
    writable: true
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0
    ], 3)
  );
  const danglyMesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: 0x6688ff })
  );
  danglyMesh.name = "cloak_dangly";
  danglyMesh.userData = {
    aurora: {
      sourceMesh: "cloak_dangly",
      sourceNodeType: "danglymesh",
      danglymesh: {
        format: "aurora-mdl-danglymesh-constraints",
        sourceConstraintVertexCount: 3,
        gltfVertexSourceIndices: [0, 1, 2],
        originalConstraints: [0, 1, 0.5],
        period: 1,
        tightness: 1,
        displacement: 0.5
      }
    }
  };
  group.add(danglyMesh);
  return group;
}

function createAnimmeshAnimatedCachedModel(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "animmesh_creature";
  group.userData = {
    auroraGltfAnimationCount: 1,
    auroraGltfAnimationNames: ["idle"],
    auroraGltfAnimationDurations: [1],
    auroraGltfHasAnimations: true
  };
  const idleClip = new THREE.AnimationClip("idle", 1, []);
  (idleClip as THREE.AnimationClip & { userData?: Record<string, unknown> }).userData = {
    auroraAnimmeshUvAnimations: [
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
    ],
    auroraAnimmeshVertexAnimations: [
      {
        nodeName: "glow_panel",
        samplePeriod: 0.5,
        animVerts: [
          [0, 0, 0],
          [1, 0, 0],
          [0, 0, 1],
          [0.5, 0, 0],
          [1, 0, 0],
          [0, 0, 1]
        ]
      }
    ]
  };
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [idleClip],
    writable: true
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0
    ], 3)
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute([
      0, 1,
      1, 1,
      0, 0
    ], 2)
  );
  const animmesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: 0x88ddff })
  );
  animmesh.name = "glow_panel";
  animmesh.userData = {
    aurora: {
      sourceMesh: "glow_panel",
      sourceNodeType: "animmesh",
      animmesh: {
        format: "aurora-mdl-animmesh-tverts",
        sourceVertexCount: 3,
        gltfVertexSourceIndices: [0, 1, 2],
        sourceTvertCount: 3,
        gltfVertexSourceTvertIndices: [0, 1, 2]
      }
    }
  };
  group.add(animmesh);
  return group;
}

function createAlphaAnimatedCachedModel(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "alpha_creature";
  group.userData = {
    auroraGltfAnimationCount: 1,
    auroraGltfAnimationNames: ["fade"],
    auroraGltfAnimationDurations: [1],
    auroraGltfHasAnimations: true
  };
  const fadeClip = new THREE.AnimationClip("fade", 1, []);
  (fadeClip as THREE.AnimationClip & { userData?: Record<string, unknown> }).userData = {
    auroraAlphaAnimations: [
      {
        nodeName: "fade_panel",
        alphaKeys: [
          { time: 0, value: 1 },
          { time: 1, value: 0.25 }
        ]
      }
    ]
  };
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [fadeClip],
    writable: true
  });

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xffcc88, opacity: 1 })
  );
  mesh.name = "fade_panel";
  group.add(mesh);
  return group;
}

function createSelfIllumColorAnimatedCachedModel(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "selfillum_creature";
  group.userData = {
    auroraGltfAnimationCount: 1,
    auroraGltfAnimationNames: ["pulse"],
    auroraGltfAnimationDurations: [1],
    auroraGltfHasAnimations: true
  };
  const pulseClip = new THREE.AnimationClip("pulse", 1, []);
  (pulseClip as THREE.AnimationClip & { userData?: Record<string, unknown> }).userData = {
    auroraSelfIllumColorAnimations: [
      {
        nodeName: "glow_panel",
        selfIllumColorKeys: [
          { time: 0, value: [0.1, 0.2, 0.3] },
          { time: 1, value: [0.9, 0.4, 0.1] }
        ]
      }
    ]
  };
  Object.defineProperty(group.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [pulseClip],
    writable: true
  });

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0, 0, 0),
    emissiveIntensity: 1
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.name = "glow_panel";
  group.add(mesh);
  return group;
}

function createTxiCycleCachedModel(): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "txi_cycle_creature";
  group.userData = {
    auroraGltfAnimationCount: 0,
    auroraGltfAnimationNames: [],
    auroraGltfAnimationDurations: [],
    auroraGltfHasAnimations: false
  };
  const texture = new THREE.Texture();
  texture.name = "fx_cycle";
  const material = new THREE.MeshBasicMaterial({ map: texture });
  material.userData = {
    auroraTextureTxiReference: "fx_cycle",
    auroraTextureTxiProcedureType: "cycle",
    auroraTextureTxiCycleActive: true,
    auroraTextureTxiNumX: 2,
    auroraTextureTxiNumY: 2,
    auroraTextureTxiFps: 4
  };
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0
    ], 3)
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute([
      0, 1,
      1, 1,
      0, 0
    ], 2)
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "txi_cycle_panel";
  group.add(mesh);
  return group;
}

function createCachedSkeletonModel(withAnimationClips = false): THREE.Object3D {
  const skeleton = new THREE.Group();
  skeleton.name = "pfh2";
  if (withAnimationClips) {
    skeleton.userData = {
      auroraMdlSourceModel: "pfh2",
      auroraMdlSupermodel: "a_fa",
      auroraMdlAnimationScale: 1.2,
      auroraMdlSourceAnimationCount: 1,
      auroraMdlSourceAnimationNames: ["super_walk"],
      auroraMdlSourceAnimationClipCount: 1,
      auroraMdlSourceAnimationClipNames: ["super_walk"],
      auroraMdlSourceHierarchyNodeCount: 3,
      auroraMdlSourceHierarchyRootNodeNames: ["rootdummy"],
      auroraMdlSourceHierarchyNodeTypes: ["dummy", "skin"],
      auroraMdlSourceHierarchyDummyNodeNames: ["rootdummy", "rshin_g"],
      auroraMdlSourceHierarchySynthesizedNodeCount: 2,
      auroraMdlSourceHierarchySynthesizedNodeNames: ["rootdummy", "rshin_g"],
      auroraGltfAnimationCount: 1,
      auroraGltfAnimationNames: ["super_walk"],
      auroraGltfAnimationDurations: [1.75],
      auroraGltfHasAnimations: true
    };
    Object.defineProperty(skeleton.userData, "auroraGltfAnimationClips", {
      configurable: true,
      enumerable: false,
      value: [
        new THREE.AnimationClip("super_walk", 1.75, [])
      ],
      writable: true
    });
  }
  const root = new THREE.Bone();
  root.name = "rootdummy";
  const rightFoot = new THREE.Bone();
  rightFoot.name = "rfoot_g";
  rightFoot.position.set(0.25, 0.1, 0);
  const rightShin = new THREE.Bone();
  rightShin.name = "rshin_g";
  rightShin.position.set(0.25, 0.8, 0);
  root.add(rightFoot);
  root.add(rightShin);
  skeleton.add(root);
  const sourceSkinMesh = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({ color: 0x88aaff })
  );
  sourceSkinMesh.name = "torso_skin";
  sourceSkinMesh.userData = {
    aurora: {
      sourceMesh: "torso_skin",
      sourceNodeType: "skin",
      skinWeights: {
        format: "aurora-mdl-original-vertex-weights",
        sourceWeightVertexCount: 4,
        gltfVertexSourceIndices: [0, 2, 1, 3],
        influencingBoneNames: ["rootdummy", "rshin_g"],
        maxInfluencesPerVertex: 2,
        requiresWeightNormalization: true
      }
    }
  };
  skeleton.add(sourceSkinMesh);
  return skeleton;
}

function createCachedSupermodelAnimationModel(): THREE.Object3D {
  const supermodel = new THREE.Group();
  supermodel.name = "a_fa";
  supermodel.userData = {
    auroraMdlSourceModel: "a_fa",
    auroraGltfAnimationCount: 1,
    auroraGltfAnimationNames: ["super_walk"],
    auroraGltfAnimationDurations: [1],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(supermodel.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("super_walk", 1, [
        new THREE.VectorKeyframeTrack(
          "a_fa.position",
          [0, 1],
          [0, 0, 0, 0, 1, 0]
        )
      ])
    ],
    writable: true
  });
  return supermodel;
}

function createCachedSlashSupermodelAnimationModel(): THREE.Object3D {
  const supermodel = new THREE.Group();
  supermodel.name = "a_ba";
  supermodel.userData = {
    auroraMdlSourceModel: "a_ba",
    auroraGltfAnimationCount: 1,
    auroraGltfAnimationNames: ["1hslashl"],
    auroraGltfAnimationDurations: [1],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(supermodel.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("1hslashl", 1, [
        new THREE.VectorKeyframeTrack(
          "rshin_g.position",
          [0, 1],
          [0.25, 0.8, 0, 0.25, 1.4, 0]
        )
      ])
    ],
    writable: true
  });
  return supermodel;
}

function createCachedSlashWithReadySupermodelAnimationModel(): THREE.Object3D {
  const supermodel = new THREE.Group();
  supermodel.name = "a_ba";
  supermodel.userData = {
    auroraMdlSourceModel: "a_ba",
    auroraGltfAnimationCount: 2,
    auroraGltfAnimationNames: ["1hreadyl", "1hslashl"],
    auroraGltfAnimationDurations: [1, 1],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(supermodel.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("1hreadyl", 1, [
        new THREE.VectorKeyframeTrack(
          "torso_g.position",
          [0, 1],
          [0.25, 0.8, 0, 0.25, 0.8, 0]
        )
      ]),
      new THREE.AnimationClip("1hslashl", 1, [
        new THREE.VectorKeyframeTrack(
          "torso_g.position",
          [0, 1],
          [0.25, 0.8, 0, 0.25, 2, 0]
        )
      ])
    ],
    writable: true
  });
  return supermodel;
}

function createCachedBowShotSupermodelAnimationModel(): THREE.Object3D {
  const supermodel = new THREE.Group();
  supermodel.name = "a_ba";
  supermodel.userData = {
    auroraMdlSourceModel: "a_ba",
    auroraGltfAnimationCount: 2,
    auroraGltfAnimationNames: ["bowrdy", "bowshot"],
    auroraGltfAnimationDurations: [1, 1],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(supermodel.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("bowrdy", 1, [
        new THREE.QuaternionKeyframeTrack(
          "rshin_g.quaternion",
          [0, 1],
          [0, 0, 0, 1, 0, 0, 0, 1]
        ),
        new THREE.VectorKeyframeTrack(
          "rshin_g.position",
          [0, 1],
          [0.25, 0.8, 0, 0.25, 1, 0]
        )
      ]),
      new THREE.AnimationClip("bowshot", 1, [
        new THREE.VectorKeyframeTrack(
          "rshin_g.position",
          [0, 1],
          [0.25, 0.8, 0, 0.25, 2, 0]
        )
      ])
    ],
    writable: true
  });
  return supermodel;
}

function createCachedRicherBowShotSupermodelAnimationModel(): THREE.Object3D {
  const supermodel = new THREE.Group();
  supermodel.name = "a_ba";
  supermodel.userData = {
    auroraMdlSourceModel: "a_ba",
    auroraGltfAnimationCount: 2,
    auroraGltfAnimationNames: ["bowrdy", "bowshot"],
    auroraGltfAnimationDurations: [1, 1],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(supermodel.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("bowrdy", 1, [
        new THREE.QuaternionKeyframeTrack(
          "rshin_g.quaternion",
          [0, 1],
          [0, 0, 0, 1, 0, 0, 0, 1]
        ),
        new THREE.VectorKeyframeTrack(
          "rshin_g.position",
          [0, 1],
          [0.25, 0.8, 0, 0.25, 1, 0]
        ),
        new THREE.VectorKeyframeTrack(
          "torso_g.position",
          [0, 1],
          [0, 0, 0, 0, 0, 0]
        )
      ]),
      new THREE.AnimationClip("bowshot", 1, [
        new THREE.VectorKeyframeTrack(
          "rshin_g.position",
          [0, 1],
          [0.25, 0.8, 0, 0.25, 2, 0]
        ),
        new THREE.QuaternionKeyframeTrack(
          "rshin_g.quaternion",
          [0, 1],
          [0, 0, 0, 1, 0.2, 0, 0, 0.98]
        ),
        new THREE.VectorKeyframeTrack(
          "torso_g.position",
          [0, 1],
          [0, 0, 0, 0, 0.5, 0]
        )
      ])
    ],
    writable: true
  });
  return supermodel;
}

function createCachedCrossbowShotSupermodelAnimationModel(): THREE.Object3D {
  const supermodel = new THREE.Group();
  supermodel.name = "a_ba";
  supermodel.userData = {
    auroraMdlSourceModel: "a_ba",
    auroraGltfAnimationCount: 2,
    auroraGltfAnimationNames: ["xbowrdy", "xbowshot"],
    auroraGltfAnimationDurations: [1, 1],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(supermodel.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("xbowrdy", 1, [
        new THREE.QuaternionKeyframeTrack(
          "rshin_g.quaternion",
          [0, 1],
          [0, 0, 0, 1, 0, 0, 0, 1]
        ),
        new THREE.VectorKeyframeTrack(
          "rshin_g.position",
          [0, 1],
          [0.25, 0.8, 0, 0.25, 1, 0]
        )
      ]),
      new THREE.AnimationClip("xbowshot", 1, [
        new THREE.VectorKeyframeTrack(
          "rshin_g.position",
          [0, 1],
          [0.25, 0.8, 0, 0.25, 2, 0]
        )
      ])
    ],
    writable: true
  });
  return supermodel;
}

function createCachedLimbSupermodelAnimationModel(): THREE.Object3D {
  const supermodel = new THREE.Group();
  supermodel.name = "a_fa";
  supermodel.userData = {
    auroraMdlSourceModel: "a_fa",
    auroraGltfAnimationCount: 1,
    auroraGltfAnimationNames: ["super_walk"],
    auroraGltfAnimationDurations: [1],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(supermodel.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("super_walk", 1, [
        new THREE.VectorKeyframeTrack(
          "rshin_g.position",
          [0, 1],
          [0.25, 0.8, 0, 0.25, 1.4, 0]
        )
      ])
    ],
    writable: true
  });
  return supermodel;
}

function createCachedHiddenDriverSupermodelAnimationModel(): THREE.Object3D {
  const supermodel = new THREE.Group();
  supermodel.name = "a_fa";
  supermodel.userData = {
    auroraMdlSourceModel: "a_fa",
    auroraGltfAnimationCount: 1,
    auroraGltfAnimationNames: ["super_walk"],
    auroraGltfAnimationDurations: [1],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(supermodel.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("super_walk", 1, [
        new THREE.VectorKeyframeTrack(
          "body_bone.position",
          [0, 1],
          [0, 0, 0, 0, 1.4, 0]
        )
      ])
    ],
    writable: true
  });
  return supermodel;
}

function createCachedAttachmentAnchorSupermodelAnimationModel(): THREE.Object3D {
  const supermodel = new THREE.Group();
  supermodel.name = "a_fa";
  supermodel.userData = {
    auroraMdlSourceModel: "a_fa",
    auroraGltfAnimationCount: 1,
    auroraGltfAnimationNames: ["super_walk"],
    auroraGltfAnimationDurations: [1],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(supermodel.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("super_walk", 1, [
        new THREE.VectorKeyframeTrack(
          "body_bone.position",
          [0, 1],
          [0, 0, 0, 0, 1.4, 0]
        ),
        new THREE.VectorKeyframeTrack(
          "lhand_g.position",
          [0, 1],
          [0, 0, 0, 0.1, 0, 0]
        ),
        new THREE.VectorKeyframeTrack(
          "rhand_g.position",
          [0, 1],
          [0, 0, 0, -0.1, 0, 0]
        ),
        new THREE.VectorKeyframeTrack(
          "head_g.position",
          [0, 1],
          [0, 0, 0, 0, 0.1, 0]
        )
      ])
    ],
    writable: true
  });
  return supermodel;
}

function createCachedLimbIdleSupermodelAnimationModel(): THREE.Object3D {
  const supermodel = new THREE.Group();
  supermodel.name = "a_fa";
  supermodel.userData = {
    auroraMdlSourceModel: "a_fa",
    auroraGltfAnimationCount: 2,
    auroraGltfAnimationNames: ["super_walk", "pause1"],
    auroraGltfAnimationDurations: [1, 2.5],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(supermodel.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("super_walk", 1, [
        new THREE.VectorKeyframeTrack(
          "rshin_g.position",
          [0, 1],
          [0.25, 0.8, 0, 0.25, 1.4, 0]
        )
      ]),
      new THREE.AnimationClip("pause1", 2.5, [
        new THREE.VectorKeyframeTrack(
          "rootdummy.position",
          [0, 2.5],
          [0, 0, 0, 0, 0, 0]
        )
      ])
    ],
    writable: true
  });
  return supermodel;
}

function createCachedNonFiniteIdleSupermodelAnimationModel(): THREE.Object3D {
  const supermodel = createCachedLimbIdleSupermodelAnimationModel();
  supermodel.userData = {
    ...supermodel.userData,
    auroraGltfAnimationDurations: [Number.NaN, Number.NaN]
  };
  Object.defineProperty(supermodel.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("super_walk", Number.NaN, [
        new THREE.VectorKeyframeTrack(
          "rshin_g.position",
          [0, 1],
          [0.25, 0.8, 0, 0.25, 1.4, 0]
        )
      ]),
      new THREE.AnimationClip("pause1", Number.NaN, [
        new THREE.VectorKeyframeTrack(
          "rootdummy.position",
          [0, 2.5],
          [0, 0, 0, 0, 0, 0]
        )
      ])
    ],
    writable: true
  });
  return supermodel;
}

function createCachedTorsoIdleSupermodelAnimationModel(): THREE.Object3D {
  const supermodel = new THREE.Group();
  supermodel.name = "a_ba_non_combat";
  supermodel.userData = {
    auroraMdlSourceModel: "a_ba_non_combat",
    auroraGltfAnimationCount: 2,
    auroraGltfAnimationNames: ["super_walk", "pause1"],
    auroraGltfAnimationDurations: [1, 2.5],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(supermodel.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("super_walk", 1, [
        new THREE.VectorKeyframeTrack(
          "torso_g.position",
          [0, 1],
          [0, 0, 0, 0, 0.2, 0]
        )
      ]),
      new THREE.AnimationClip("pause1", 2.5, [
        new THREE.VectorKeyframeTrack(
          "torso_g.position",
          [0, 2.5],
          [0, 0, 0, 0, 0, 0]
        )
      ])
    ],
    writable: true
  });
  return supermodel;
}

function createCachedBaseCreatureSupermodelAnimationModel(): THREE.Object3D {
  const supermodel = new THREE.Group();
  supermodel.name = "a_ba";
  supermodel.userData = {
    auroraMdlSourceModel: "a_ba",
    auroraGltfAnimationCount: 1,
    auroraGltfAnimationNames: ["1hslashl"],
    auroraGltfAnimationDurations: [1],
    auroraGltfHasAnimations: true
  };
  Object.defineProperty(supermodel.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("1hslashl", 1, [
        new THREE.VectorKeyframeTrack(
          "torso_g.position",
          [0, 1],
          [0, 0, 0, 0, 0.25, 0]
        )
      ])
    ],
    writable: true
  });
  return supermodel;
}

function createCachedHybridRetargetSupermodelAnimationModel(): THREE.Object3D {
  const supermodel = new THREE.Group();
  supermodel.name = "c_hybrid_super";
  supermodel.userData = {
    auroraMdlSourceModel: "c_hybrid_super",
    auroraGltfAnimationCount: 1,
    auroraGltfAnimationNames: ["ca1slashl"],
    auroraGltfAnimationDurations: [1],
    auroraGltfHasAnimations: true
  };
  const torso = new THREE.Object3D();
  torso.name = "torso";
  const claw = new THREE.Object3D();
  claw.name = "Rclaw";
  supermodel.add(torso, claw);
  Object.defineProperty(supermodel.userData, "auroraGltfAnimationClips", {
    configurable: true,
    enumerable: false,
    value: [
      new THREE.AnimationClip("ca1slashl", 1, [
        new THREE.VectorKeyframeTrack(
          "torso.position",
          [0, 1],
          [0, 0, 0, 0, 0.2, 0]
        ),
        new THREE.VectorKeyframeTrack(
          "Rclaw.position",
          [0, 1],
          [0, 0, 0, 0, 0.1, 0]
        )
      ])
    ],
    writable: true
  });
  return supermodel;
}

function buildCreaturePltTextureBuffer(): ArrayBuffer {
  const width = 2;
  const height = 2;
  const bytes = new Uint8Array(24 + width * height * 2);
  "PLT V1  ".split("").forEach((character, index) => {
    bytes[index] = character.charCodeAt(0);
  });
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 10, true);
  view.setUint32(12, 0, true);
  view.setUint32(16, width, true);
  view.setUint32(20, height, true);
  bytes.set(
    [
      10, 0,
      60, 1,
      150, 4,
      220, 8
    ],
    24
  );
  return bytes.buffer;
}

function createCachedPltTexture(): THREE.DataTexture {
  const texture = new THREE.DataTexture(
    new Uint8Array(2 * 2 * 4),
    2,
    2,
    THREE.RGBAFormat
  );
  texture.userData = {
    isPLT: true,
    auroraIsPlt: true,
    auroraSourceFormat: "plt-grayscale",
    pltWidth: 2,
    pltHeight: 2,
    numLayers: 10,
    usedLayers: [true, true, false, false, true, false, false, false, true, false],
    auroraPltUsedLayerIndices: [0, 1, 4, 8],
    pltBuffer: buildCreaturePltTextureBuffer()
  };
  return texture;
}

function createCachedTgaTexture(reference = "pmd0_head001"): THREE.Texture {
  const texture = new THREE.Texture();
  texture.name = reference;
  texture.userData = {
    auroraSourceFormat: "tga",
    auroraTextureReference: reference
  };
  return texture;
}

function createRetailPaletteTable(
  entries: Array<{ row: number; colorIndex: number; rgb: [number, number, number] }>
): Uint8Array {
  const table = new Uint8Array(AURORA_PLT_PALETTE_ROW_COUNT * AURORA_PLT_PALETTE_COLOR_COUNT * 3);
  entries.forEach((entry) => {
    const offset = (entry.row * AURORA_PLT_PALETTE_COLOR_COUNT + entry.colorIndex) * 3;
    table[offset] = entry.rgb[0];
    table[offset + 1] = entry.rgb[1];
    table[offset + 2] = entry.rgb[2];
  });
  return table;
}

describe("workspaceObjectMeshLayer creature render payload", () => {
  afterEach(() => {
    resetAuroraPltPaletteDataForTests();
  });

  it("attaches creature render package diagnostics to the runtime marker", () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createCreatureRenderPayload();

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      {
        ...createDebugState(),
        showNonRenderMeshes: true
      },
      4,
      4,
      1,
      false,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );

    expect(runtime.objectMeshById.get(creature.id)?.userData).toMatchObject({
      objectId: creature.id,
      objectKind: "creatures",
      creatureRenderPayloadStatus: "payload-bound",
      creatureRenderPackageStatus: "missing_derived",
      creatureRenderDiagnosticCodes: ["CREATURE_RENDER_DERIVED_MODEL_MISSING"],
      creatureSourceModelCandidateResRefs: ["P_HHM"],
      creatureSourceModelCandidateConfidence: ["assembly-prefix"],
      creatureSkeletonModelCandidateResRefs: ["pfh2"],
      creatureSkeletonModelCandidatePrefixes: ["pfh2_"],
      creatureSkeletonModelCandidateUrlReadyCount: 1,
      creatureSkeletonModelCandidateAssetIds: ["asset-pfh2-glb"],
      creatureSkeletonModelCandidateUrls: [
        "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-pfh2-glb.glb"
      ],
      creaturePartModelCandidateCount: 1,
      creaturePartModelCandidateUrlReadyCount: 0,
      creaturePartModelCandidateSlots: ["rFoot"],
      creaturePartModelCandidateResRefs: ["pfh2_rfoot004"],
      creaturePartModelCandidateNodeNames: ["rfoot_g"],
      creaturePartModelCandidatePatternFormats: ["p%c%c%s_%s_%03d"],
      creaturePartModelCandidateUrls: [],
      creatureRenderPltPaletteRowMax: 175,
      creatureRenderPltLayerRows: { skin: 2 },
      creatureRenderPltLayerRowCount: 10,
      creatureRenderMaterialPipelineSource: "decompiled-aurora",
      creatureRenderPltVertexShaderName: "vs_pltgen",
      creatureRenderPltFragmentShaderName: "fs_pltgen",
      creatureRenderPltSchemeUniformPattern: "PLTscheme[%d]",
      creatureRenderPltSchemeUniformCount: 15,
      creatureRenderPltReplacementUniformName: "pltreplacement",
      creatureRenderSkinPaletteResRef: "pal_skin01",
      creatureRenderSkeletonPipelineSource: "decompiled-aurora",
      creatureRenderSupermodelCommandName: "setsupermodel",
      creatureRenderAnimationScaleCommandName: "setanimationscale",
      creatureRenderSkinnedMeshNodeType: "skinmesh",
      creatureRenderRequiresComposedSkeleton: true,
      creatureTemplateId: "cre_guard_captain",
      creatureResRef: "cre_guard",
      creatureAppearanceModelType: "P",
      creatureAppearanceRaceModel: "P_HHM",
      creatureAnimationState: 2,
      creatureAnimationStateMappingStatus: "runtime-state-unmapped",
      creatureAnimationStateMappingSource: "creatureRuntime.state.animationState",
      creatureAppearanceSizeCategoryLabel: "Medium"
    });
  });

  it("keeps source-backed equipment markers hidden outside diagnostic mode", () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createCreatureRenderPayloadWithEquipment();

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      false,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );

    const root = runtime.objectMeshById.get(creature.id);
    const markers = collectCreatureEquipmentMarkers(root);
    expect(root?.userData).toMatchObject({
      creatureEquipmentModelCandidateCount: 1,
      creatureEquipmentModelCandidateResRefs: ["nw_wswmls001"],
      creatureEquipmentModelCandidateSlotLabels: ["right hand"],
      creatureEquipmentModelCandidateAttachmentTargets: ["rhand_g"],
      creatureEquipmentModelCandidateSourceStatuses: ["model-resrefs-ready"],
      creatureEquipmentModelCandidateModelTypes: ["wsw"],
      creatureEquipmentModelCandidateModelParts: [[2, 1, 3]],
      creatureEquipmentModelCandidateModelPartRoles: [["blade", "middle", "top"]],
      creatureEquipmentModelCandidateModelPartResRefs: [
        ["wswb_002", "wswm_001", "wswt_003"]
      ],
      creatureEquipmentModelCandidateModelPartUrlReadyCount: 1,
      creatureEquipmentMarkerStatus: "suppressed",
      creatureEquipmentMarkerMode: "diagnostics-only",
      creatureEquipmentMarkerCount: 1,
      creatureEquipmentMarkerAnchoredCount: 0,
      creatureEquipmentMarkerFallbackCount: 0,
      creatureEquipmentMarkerResRefs: ["nw_wswmls001"],
      creatureEquipmentMarkerSlotLabels: ["right hand"],
      creatureEquipmentMarkerAttachmentTargets: ["rhand_g"],
      creatureEquipmentMarkerModelParts: [[2, 1, 3]],
      creatureEquipmentMarkerModelPartRoles: [["blade", "middle", "top"]],
      creatureEquipmentMarkerModelPartResRefs: [["wswb_002", "wswm_001", "wswt_003"]],
      creatureEquipmentMarkerModelPartUrlReadyCount: 1
    });
    expect(markers).toHaveLength(0);
  });

  it("renders equipped ItemPropertyLight as a creature-attached PointLight", () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createCreatureRenderPayloadWithEquipment();
    const equipmentCandidate = payload.renderPackage?.equipmentModelCandidates[0];
    if (equipmentCandidate) {
      equipmentCandidate.itemProperties = [
        {
          propertyName: 44,
          propertyLabel: "Light",
          costValue: 2,
          costTableDefinition: "iprp_lightcost",
          param1Value: 0,
          param1Table: "iprp_color",
          propertyDefinitionSource2daRow: 44,
          propertyDefinitionSourceKey:
            "modules/current/__aurora/sources/hak/lc_2da/itempropdef.2da"
        }
      ];
    }
    payload.creature.creatureRenderPackage = payload.renderPackage;

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      false,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );

    const root = runtime.objectMeshById.get(creature.id);
    const pointLights: THREE.PointLight[] = [];
    const equipmentLightSources: THREE.Object3D[] = [];
    root?.traverse((node) => {
      if (node instanceof THREE.PointLight) {
        pointLights.push(node);
      }
      if (
        node.userData?.itemPropertyLightPreviewRole ===
        "creature-equipment-itemproperty-light-source"
      ) {
        equipmentLightSources.push(node);
      }
    });

    expect(pointLights).toHaveLength(1);
    expect(equipmentLightSources).toHaveLength(1);
    expect(root?.userData).toMatchObject({
      creatureEquipmentItemPropertyLightStatus: "active",
      creatureEquipmentItemPropertyLightMode: "fallback-offsets",
      creatureEquipmentItemPropertyLightCount: 1,
      creatureEquipmentItemPropertyLightAnchoredCount: 0,
      creatureEquipmentItemPropertyLightFallbackCount: 1,
      creatureEquipmentItemPropertyLightResRefs: ["nw_wswmls001"],
      creatureEquipmentItemPropertyLightAttachmentTargets: ["rhand_g"],
      creatureEquipmentItemPropertyLightBrightnessLabels: ["Low"],
      creatureEquipmentItemPropertyLightColorLabels: ["Blue"],
      creatureEquipmentItemPropertyLightProofStatus:
        "source-backed-equipped-itemproperty-light-preview"
    });
    expect(root?.userData.placeableTwoDaLightPreviewMode).toBeUndefined();
    expect(root?.userData.auroraLightPreviewMode).toBeUndefined();
    expect(pointLights[0]?.userData).toMatchObject({
      itemPropertyLightPreviewRole: "item-property-point-light",
      itemPropertyLightPreviewMode: "itemproperty-light",
      itemPropertyLightBrightness: 2,
      itemPropertyLightBrightnessLabel: "Low",
      itemPropertyLightBrightnessRadiusMeters: 10,
      itemPropertyLightBrightnessRadiusSource:
        "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/data/nwn_base.key -> base_2da.bif: itempropdef.2da row 44 Light has costtable=18 and param1=9; iprp_costtable.2da row 18 is IPRP_LIGHTCOST ClientLoad=1; iprp_paramtable.2da row 9 is IPRP_COLOR; iprp_lightcost.2da rows 1..4 label Dim (5m), Low (10m), Normal (15m), Bright (20m); iprp_color.2da rows 0..6 label Blue, Yellow, Purple, Red, Green, Orange, White",
      itemPropertyLightRadiusProofStatus:
        "source-backed-retail-key-bif-iprp-lightcost-token-radius",
      itemPropertyLightColorValue: 0,
      itemPropertyLightColorLabel: "Blue",
      itemPropertyLightColor: [0.75, 0.75, 1.25],
      itemPropertyLightColorProofStatus:
        "source-family-backed-fx_light_clr-mdl-animation-rgb",
      itemPropertyLightProgFxFamilyProofStatus:
        "source-backed-applylight-vfxdur-looping-vfx-owner-message-lastupdate-client-receive-newcaurobject-mdlnodelight-partlight-create-gob-attach",
      itemPropertyLightRelatedVisualEffectRowId: 154,
      itemPropertyLightRelatedVisualEffectConstant: "VFX_DUR_LIGHT_BLUE_10",
      itemPropertyLightRelatedVisualEffectLabel: "VFX_DUR_LIGHT_BLUE_10",
      itemPropertyLightRelatedProgFxRowId: 305,
      itemPropertyLightRelatedProgFxLabel: "LightBlue10m",
      itemPropertyLightRelatedProgFxFadeRowId: 355,
      itemPropertyLightRelatedProgFxFadeLabel: "FadeLBlue10m",
      itemPropertyLightRelatedProgFxAnimation: "Blue_10m",
      itemPropertyLightRelatedProgFxSymbolicColor: "Blue",
      itemPropertyLightRelatedProgFxRadiusMeters: 10,
      itemPropertyLightSourceMdlNodeName: "AuroraLight01",
      itemPropertyLightSourceMdlAnimation: "Blue_10m",
      itemPropertyLightSourceMdlColor: [0.75, 0.75, 1.25],
      itemPropertyLightSourceMdlRadiusMeters: 13.3,
      itemPropertyLightRuntimeSchedulerProofSource: expect.stringContaining(
        "color byte [CNWItemProperty+9] jump-table maps iprp_color values 0..6 to VFX_DUR_LIGHT base rows 153/157/161/165/177/169/173"
      ),
      itemPropertyLightRuntimeSchedulerBlocker: expect.stringContaining(
        "cross-lane insertion order and retail shadow-volume projection parity"
      ),
      itemPropertyLightRelatedProgFxCastShadowsRaw: "1",
      itemPropertyLightRelatedProgFxCastShadows: true,
      itemPropertyLightRelatedProgFxFadeCastShadowsRaw: "1",
      itemPropertyLightRelatedProgFxFadeCastShadows: true,
      itemPropertyLightShadowStatus: "enabled-by-progfx-param3",
      itemPropertyLightShadowPolicySource:
        "nwn_base.key progfx.2da Type 4 item-light rows 300..327 and fade rows 350..377 use Param3 as cast shadows: 5m rows have 0, 10m/15m/20m rows have 1; fx_light_clr.mdl AuroraLight01 has shadow=true and shadowradius=15, while retail shadow-volume projection parity remains blocked",
      itemPropertyLightShadowProofStatus:
        "source-backed-progfx-type4-param3-item-light-shadow-toggle-shadowvol-projection-blocked",
      creatureEquipmentItemPropertyLightResRef: "nw_wswmls001",
      creatureEquipmentItemPropertyLightAttachmentTarget: "rhand_g",
      creatureEquipmentItemPropertyLightNotPlaceableLight: true,
      creatureEquipmentItemPropertyLightNotMdlLightNode: true
    });
    expect(pointLights[0]?.intensity).toBeCloseTo(1.25, 5);
    expect(pointLights[0]?.distance).toBeCloseTo(1.33, 5);
    expect(pointLights[0]?.decay).toBe(1);
    expect(pointLights[0]?.color.r).toBeCloseTo(0.75 / 1.25, 5);
    expect(pointLights[0]?.color.g).toBeCloseTo(0.75 / 1.25, 5);
    expect(pointLights[0]?.color.b).toBeCloseTo(1, 5);
    expect(pointLights[0]?.castShadow).toBe(true);
  });

  it("caps equipped ItemPropertyLight PointLights with the runtime active light budget", () => {
    const runtime = createRuntime();
    runtime.scene.userData.auroraLightConfiguredMaxLights = 1;
    const creature = createCreatureObject();
    const payload = createCreatureRenderPayloadWithEquipment();
    const equipmentCandidates = payload.renderPackage?.equipmentModelCandidates ?? [];
    const firstCandidate = equipmentCandidates[0];
    if (firstCandidate) {
      firstCandidate.itemProperties = [
        {
          propertyName: 44,
          propertyLabel: "Light",
          costValue: 2,
          costTableDefinition: "iprp_lightcost",
          param1Value: 0,
          param1Table: "iprp_color"
        }
      ];
      equipmentCandidates.push({
        ...firstCandidate,
        resref: "nw_wswmls002",
        itemTemplateId: "itm_nw_wswmls002",
        slotLabels: ["left hand"],
        attachmentTargets: ["lhand_g"],
        primaryAttachmentTarget: "lhand_g",
        itemName: "Offhand Light",
        itemProperties: [
          {
            propertyName: 44,
            propertyLabel: "Light",
            costValue: 3,
            costTableDefinition: "iprp_lightcost",
            param1Value: 1,
            param1Table: "iprp_color"
          }
        ]
      });
    }

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      false,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );

    const root = runtime.objectMeshById.get(creature.id);
    const pointLights: THREE.PointLight[] = [];
    const equipmentLightSources: THREE.Object3D[] = [];
    root?.traverse((node) => {
      if (node instanceof THREE.PointLight) {
        pointLights.push(node);
      }
      if (
        node.userData?.itemPropertyLightPreviewRole ===
        "creature-equipment-itemproperty-light-source"
      ) {
        equipmentLightSources.push(node);
      }
    });

    const droppedSource = equipmentLightSources.find(
      (source) => source.userData.itemPropertyLightBudgetAccepted === false
    );

    expect(pointLights).toHaveLength(1);
    expect(equipmentLightSources).toHaveLength(2);
    expect(root?.userData).toMatchObject({
      creatureEquipmentItemPropertyLightStatus: "active",
      creatureEquipmentItemPropertyLightCount: 1,
      creatureEquipmentItemPropertyLightCandidateCount: 2,
      creatureEquipmentItemPropertyLightAcceptedCount: 1,
      creatureEquipmentItemPropertyLightDroppedCount: 1,
      creatureEquipmentItemPropertyLightBudgetCap: 1,
      creatureEquipmentItemPropertyLightBudgetHardCap: 128,
      creatureEquipmentItemPropertyLightConfiguredMaxLights: 1,
      creatureEquipmentItemPropertyLightBudgetCapProofStatus:
        "source-backed-active-light-slot-cap-max-128"
    });
    expect(pointLights[0]?.userData).toMatchObject({
      itemPropertyLightBudgetAccepted: true,
      itemPropertyLightBudgetRank: 1,
      itemPropertyLightBudgetCandidateCount: 2,
      itemPropertyLightBudgetCap: 1,
      itemPropertyLightConfiguredMaxLights: 1
    });
    expect(droppedSource?.userData).toMatchObject({
      itemPropertyLightPreviewStatus: "dropped-by-light-budget",
      itemPropertyLightBudgetAccepted: false,
      itemPropertyLightBudgetRank: 2,
      itemPropertyLightBudgetCandidateCount: 2,
      itemPropertyLightBudgetCap: 1,
      itemPropertyLightConfiguredMaxLights: 1,
      itemPropertyLightDroppedReason: "active-light-slot-cap",
      creatureEquipmentItemPropertyLightMode: "dropped-by-light-budget"
    });
  });

  it("loads ready equipment model parts onto the creature fallback root", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createCreatureRenderPayloadWithEquipment();
    const equipmentPartCacheKey =
      "creature:cre_guard_captain:v1:equipment:nw_wswmls001:asset-wswb-glb";
    const equipmentPartRuntimeCacheKey = equipmentPartCacheKey;
    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const texturePath =
      "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/wswb_002_d.dds";
    const textureUrl = `http://localhost:3000${texturePath}`;
    payload.renderPackage = {
      ...payload.renderPackage!,
      textureUrls: [texturePath]
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      textureUrls: [texturePath]
    };
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, createCachedSkeletonModel(false));
    runtime.placeableModelCacheByUrl.set(
      equipmentPartRuntimeCacheKey,
      createCachedModel(0.6)
    );
    runtime.placeableTextureCacheByUrl.set(textureUrl, createCachedPltTexture());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      {
        ...createDebugState(),
        showNonRenderMeshes: true
      },
      4,
      4,
      1,
      false,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const loadedEquipmentParts: THREE.Object3D[] = [];
    root?.traverse((node) => {
      if (node.userData?.creatureEquipmentModelPartStatus === "loaded") {
        loadedEquipmentParts.push(node);
      }
    });

    expect(root?.userData).toMatchObject({
      creatureEquipmentModelPartLoadStatus: "loaded",
      creatureEquipmentModelPartLoadedCount: 1,
      creatureEquipmentModelPartTotalCount: 1,
      creatureEquipmentModelPartResRefs: ["wswb_002"],
      creatureEquipmentModelPartEquipmentResRefs: ["nw_wswmls001"],
      creatureEquipmentModelPartMode: "fallback-offsets",
      creatureEquipmentModelPartFallbackTargets: ["rhand_g"],
      creatureEquipmentModelPartItemGroupCount: 1,
      creatureEquipmentModelPartItemGroupResRefs: ["nw_wswmls001"],
      creatureEquipmentModelPartItemGroupTransformStatuses: ["held-weapon-source-axis"],
      creatureEquipmentModelPartTextureStatus: "applied",
      creatureEquipmentModelPartTextureReferenceCount: 1,
      creatureEquipmentModelPartTextureLoadedCount: 1,
      creatureEquipmentModelPartTextureAppliedModelCount: 1
    });
    expect(runtime.container.dataset).toMatchObject({
      placeableModelStatus: "loaded",
      placeableModelLoadPhase: "complete",
      placeableModelLoadCompleted: "1",
      placeableModelLoadTotal: "1",
      placeableModelCreatureEquipmentModelPartLoadStatus: "loaded",
      placeableModelCreatureEquipmentModelPartLoadedCount: "1",
      placeableModelCreatureEquipmentModelPartTotalCount: "1",
      placeableModelCreatureEquipmentModelPartMode: "fallback-offsets",
      placeableModelCreatureEquipmentModelPartItemGroupCount: "1",
      placeableModelCreatureEquipmentModelPartItemGroupTransformStatuses:
        "held-weapon-source-axis",
      placeableModelCreatureEquipmentModelPartResRefs: "wswb_002",
      placeableModelCreatureEquipmentModelPartEquipmentResRefs: "nw_wswmls001",
      placeableModelCreatureEquipmentModelPartAttachmentTargets: "rhand_g"
    });
    expect(loadedEquipmentParts).toHaveLength(1);
    expect(loadedEquipmentParts[0]?.userData).toMatchObject({
      creatureEquipmentModelPartResRef: "wswb_002",
      creatureEquipmentModelPartEquipmentResRef: "nw_wswmls001",
      creatureEquipmentModelPartRole: "blade",
      creatureEquipmentModelPartId: 2,
      creatureEquipmentModelPartAttachmentTarget: "rhand_g",
      creatureEquipmentModelPartCacheKey: equipmentPartCacheKey
    });
    expect(loadedEquipmentParts[0]?.parent?.userData).toMatchObject({
      creatureEquipmentModelPartItemGroupStatus: "source-equipment-item-model",
      creatureEquipmentModelPartItemEquipmentResRef: "nw_wswmls001",
      creatureEquipmentModelPartItemPartResRefs: ["wswb_002"],
      creatureEquipmentModelPartItemAttachmentTransformStatus: "held-weapon-source-axis"
    });
    expect(loadedEquipmentParts[0]?.parent?.rotation.x).toBeCloseTo(0);
    expect(runtime.container.dataset).toMatchObject({
      creaturePartModelRuntimeEquipmentItemGroupCount: "1",
      creaturePartModelRuntimeEquipmentLoosePartRootCount: "0"
    });
    const loadedMesh = loadedEquipmentParts[0]?.children.find(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh
    );
    const material = loadedMesh?.material;
    expect(Array.isArray(material) ? material[0]?.map : material?.map).toBeTruthy();
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("anchors ready equipment model parts to the animated creature hand node when available", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createCreatureRenderPayloadWithEquipment(
      createMultiPartModelReadyCreatureRenderPayload()
    );
    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    const equipmentPartCacheKey =
      "creature:cre_guard_captain:v1:equipment:nw_wswmls001:asset-wswb-glb";
    const equipmentPartRuntimeCacheKey = equipmentPartCacheKey;
    const skeletonModel = createCachedSkeletonModel(false);
    const rootDummy = skeletonModel.getObjectByName("rootdummy");
    const rightHand = new THREE.Bone();
    rightHand.name = "rhand_g";
    rootDummy?.add(rightHand);
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, skeletonModel);
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));
    runtime.placeableModelCacheByUrl.set(
      equipmentPartRuntimeCacheKey,
      createCachedModel(0.6)
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      {
        ...createDebugState(),
        showNonRenderMeshes: true
      },
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const loadedEquipmentParts: THREE.Object3D[] = [];
    const itemGroups: THREE.Object3D[] = [];
    root?.traverse((node) => {
      if (node.userData?.creatureEquipmentModelPartStatus === "loaded") {
        loadedEquipmentParts.push(node);
      }
      if (
        node.userData?.creatureEquipmentModelPartItemGroupStatus ===
        "source-equipment-item-model"
      ) {
        itemGroups.push(node);
      }
    });

    expect(root?.userData).toMatchObject({
      creatureEquipmentModelPartLoadStatus: "loaded",
      creatureEquipmentModelPartMode: "skeleton-anchors",
      creatureEquipmentModelPartAnchoredTargets: ["rhand_g"],
      creatureEquipmentModelPartFallbackTargets: [],
      creatureEquipmentModelPartItemGroupCount: 1
    });
    expect(runtime.container.dataset).toMatchObject({
      placeableModelCreatureEquipmentModelPartMode: "skeleton-anchors",
      creaturePartModelRuntimeEquipmentItemGroupCount: "1",
      creaturePartModelRuntimeEquipmentLoosePartRootCount: "0"
    });
    expect(itemGroups).toHaveLength(1);
    expect(itemGroups[0]?.parent?.name).toBe("rhand_g");
    expect(itemGroups[0]?.userData).toMatchObject({
      creatureEquipmentModelPartItemAttachmentTransformStatus:
        "held-weapon-source-axis-hand-node-anchor",
      creatureEquipmentModelPartItemAttachmentGripOffset: "0.0000,0.0000,0.0000"
    });
    expect(itemGroups[0]?.rotation.x).toBeCloseTo(0);
    expect(itemGroups[0]?.position.toArray()).toEqual([0, 0, 0]);
    expect(loadedEquipmentParts).toHaveLength(1);
    expect(loadedEquipmentParts[0]?.parent).toBe(itemGroups[0]);
    expect(loadedEquipmentParts[0]?.parent?.parent?.name).toBe("rhand_g");
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("anchors ready shield equipment model parts to the animated creature left hand node", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createCreatureRenderPayloadWithEquipment(
      createMultiPartModelReadyCreatureRenderPayload()
    );
    const shieldCandidate = {
      resref: "nw_ashsw001",
      itemTemplateId: "itm_nw_ashsw001",
      slotMask: 32,
      slotLabels: ["left hand"],
      attachmentTargets: ["lhand_g"],
      primaryAttachmentTarget: "lhand_g",
      baseItem: 14,
      itemName: "Small Shield",
      itemModelType: "ashsw",
      weaponWield: 7,
      itemModelParts: [11],
      itemModelPartRoles: ["default"],
      itemModelPartResRefs: ["ashsw_011"],
      itemModelPartCandidates: [
        {
          resref: "ashsw_011",
          role: "default",
          partId: 11,
          assetId: "asset-ashsw-glb",
          glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-ashsw-glb.glb"
        }
      ],
      itemModelPartSourceKey: "C:/Projects/New Folder/item-retail-extract/2da/baseitems.2da",
      source: "utc.Equip_ItemList" as const,
      sourceModelStatus: "model-resrefs-ready" as const
    };
    payload.renderPackage = {
      ...payload.renderPackage!,
      equipmentModelCandidates: [shieldCandidate]
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      equipmentModelCandidates: [shieldCandidate]
    };
    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    const shieldPartRuntimeCacheKey =
      "creature:cre_guard_captain:v1:equipment:nw_ashsw001:asset-ashsw-glb";
    const skeletonModel = createCachedSkeletonModel(false);
    const rootDummy = skeletonModel.getObjectByName("rootdummy");
    const leftHand = new THREE.Bone();
    leftHand.name = "lhand_g";
    rootDummy?.add(leftHand);
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, skeletonModel);
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));
    runtime.placeableModelCacheByUrl.set(shieldPartRuntimeCacheKey, createCachedModel(0.8));

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      {
        ...createDebugState(),
        showNonRenderMeshes: true
      },
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const itemGroups: THREE.Object3D[] = [];
    root?.traverse((node) => {
      if (
        node.userData?.creatureEquipmentModelPartItemGroupStatus ===
        "source-equipment-item-model"
      ) {
        itemGroups.push(node);
      }
    });

    expect(root?.userData).toMatchObject({
      creatureEquipmentModelPartLoadStatus: "loaded",
      creatureEquipmentModelPartMode: "skeleton-anchors",
      creatureEquipmentModelPartAnchoredTargets: ["lhand_g"],
      creatureEquipmentModelPartItemGroupCount: 1
    });
    expect(itemGroups).toHaveLength(1);
    expect(itemGroups[0]?.parent?.name).toBe("lhand_g");
    expect(itemGroups[0]?.userData).toMatchObject({
      creatureEquipmentModelPartItemAttachmentTransformStatus:
        "held-shield-source-axis-hand-node-anchor",
      creatureEquipmentModelPartItemAttachmentAuroraBaseItemWeaponWield: "7",
      creatureEquipmentModelPartItemAttachmentGripOffset: "0.0000,0.0000,0.0000"
    });
    expect(itemGroups[0]?.rotation.x).toBeCloseTo(0);
    expect(itemGroups[0]?.position.toArray()).toEqual([0, 0, 0]);
  });

  it("attaches cached equipment model parts before slow creature textures finish", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createCreatureRenderPayloadWithEquipment(
      createMultiPartModelReadyCreatureRenderPayload()
    );
    payload.renderPackage = {
      ...payload.renderPackage!,
      textureUrls: [
        "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/slow_weapon_texture.plt"
      ]
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      textureUrls: payload.renderPackage.textureUrls
    };
    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    const equipmentPartCacheKey =
      "creature:cre_guard_captain:v1:equipment:nw_wswmls001:asset-wswb-glb";
    const equipmentPartRuntimeCacheKey = equipmentPartCacheKey;
    const skeletonModel = createCachedSkeletonModel(false);
    const rootDummy = skeletonModel.getObjectByName("rootdummy");
    const rightHand = new THREE.Bone();
    rightHand.name = "rhand_g";
    rootDummy?.add(rightHand);
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, skeletonModel);
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));
    runtime.placeableModelCacheByUrl.set(
      equipmentPartRuntimeCacheKey,
      createCachedModel(0.6)
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      {
        ...createDebugState(),
        showNonRenderMeshes: true
      },
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const itemGroups: THREE.Object3D[] = [];
    root?.traverse((node) => {
      if (
        node.userData?.creatureEquipmentModelPartItemGroupStatus ===
        "source-equipment-item-model"
      ) {
        itemGroups.push(node);
      }
    });

    expect(itemGroups).toHaveLength(1);
    expect(itemGroups[0]?.parent?.name).toBe("rhand_g");
    expect(root?.userData).toMatchObject({
      creatureEquipmentModelPartLoadStatus: "loaded",
      creatureEquipmentModelPartLoadedCount: 1,
      creatureEquipmentModelPartTotalCount: 1,
      creatureEquipmentModelPartTextureStatus: "loading",
      creatureEquipmentModelPartTextureLoadedCount: 0
    });
    expect(runtime.container.dataset).toMatchObject({
      placeableModelCreatureEquipmentModelPartLoadStatus: "loaded",
      placeableModelCreatureEquipmentModelPartLoadedCount: "1",
      placeableModelCreatureEquipmentModelPartTotalCount: "1"
    });
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it.each([
    { itemModelType: "wplsc", itemName: "Scythe" },
    { itemModelType: "wmgst", itemName: "Magic Staff" }
  ])(
    "uses source-axis bounds grip attachment for $itemModelType long melee equipment on animated hand nodes",
    async ({ itemModelType, itemName }) => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createCreatureRenderPayloadWithEquipment(
      createMultiPartModelReadyCreatureRenderPayload()
    );
    const candidate = payload.renderPackage?.equipmentModelCandidates[0];
    if (candidate) {
      candidate.itemModelType = itemModelType;
      candidate.itemName = itemName;
    }
    if (payload.creature.creatureRenderPackage?.equipmentModelCandidates[0]) {
      payload.creature.creatureRenderPackage.equipmentModelCandidates[0].itemModelType =
        itemModelType;
      payload.creature.creatureRenderPackage.equipmentModelCandidates[0].itemName =
        itemName;
    }
    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    const equipmentPartCacheKey =
      "creature:cre_guard_captain:v1:equipment:nw_wswmls001:asset-wswb-glb";
    const equipmentPartRuntimeCacheKey = equipmentPartCacheKey;
    const skeletonModel = createCachedSkeletonModel(false);
    const rootDummy = skeletonModel.getObjectByName("rootdummy");
    const rightHand = new THREE.Bone();
    rightHand.name = "rhand_g";
    rootDummy?.add(rightHand);
    const polearmModel = new THREE.Group();
    const shaft = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xffaa88 })
    );
    shaft.position.set(0, 0.5, 0);
    polearmModel.add(shaft);
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, skeletonModel);
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));
    runtime.placeableModelCacheByUrl.set(equipmentPartRuntimeCacheKey, polearmModel);

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      {
        ...createDebugState(),
        showNonRenderMeshes: true
      },
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const itemGroups: THREE.Object3D[] = [];
    root?.traverse((node) => {
      if (
        node.userData?.creatureEquipmentModelPartItemGroupStatus ===
        "source-equipment-item-model"
      ) {
        itemGroups.push(node);
      }
    });

    expect(itemGroups).toHaveLength(1);
    expect(itemGroups[0]?.parent?.name).toBe("rhand_g");
    expect(itemGroups[0]?.userData).toMatchObject({
      creatureEquipmentModelPartItemAttachmentTransformStatus:
        "held-long-melee-source-axis-hand-node-anchor",
      creatureEquipmentModelPartItemAttachmentGripOffset: "0.0000,0.0000,0.0000",
      creatureEquipmentModelPartItemAttachmentResolvedOffset:
        "0.0000,0.0000,0.0000"
    });
    expect(itemGroups[0]?.rotation.x).toBeCloseTo(0);
    expect(itemGroups[0]?.position.toArray()).toEqual([0, 0, 0]);
    expect(runtime.container.dataset).toMatchObject({
      placeableModelCreatureEquipmentModelPartItemGroupTransformStatuses:
        "held-long-melee-source-axis-hand-node-anchor"
    });
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
    }
  );

  it("mirrors ready weapon equipment grip offsets for the animated left hand node", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createCreatureRenderPayloadWithEquipment(
      createMultiPartModelReadyCreatureRenderPayload()
    );
    const candidate = payload.renderPackage?.equipmentModelCandidates[0];
    if (candidate) {
      candidate.slotMask = 32;
      candidate.slotLabels = ["left hand"];
      candidate.attachmentTargets = ["lhand_g"];
      candidate.primaryAttachmentTarget = "lhand_g";
    }
    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    const equipmentPartCacheKey =
      "creature:cre_guard_captain:v1:equipment:nw_wswmls001:asset-wswb-glb";
    const equipmentPartRuntimeCacheKey = equipmentPartCacheKey;
    const skeletonModel = createCachedSkeletonModel(false);
    const rootDummy = skeletonModel.getObjectByName("rootdummy");
    const leftHand = new THREE.Bone();
    leftHand.name = "lhand_g";
    rootDummy?.add(leftHand);
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, skeletonModel);
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));
    runtime.placeableModelCacheByUrl.set(
      equipmentPartRuntimeCacheKey,
      createCachedModel(0.6)
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      {
        ...createDebugState(),
        showNonRenderMeshes: true
      },
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const itemGroups: THREE.Object3D[] = [];
    root?.traverse((node) => {
      if (
        node.userData?.creatureEquipmentModelPartItemGroupStatus ===
        "source-equipment-item-model"
      ) {
        itemGroups.push(node);
      }
    });

    expect(root?.userData).toMatchObject({
      creatureEquipmentModelPartMode: "skeleton-anchors",
      creatureEquipmentModelPartAnchoredTargets: ["lhand_g"],
      creatureEquipmentModelPartItemGroupCount: 1
    });
    expect(itemGroups).toHaveLength(1);
    expect(itemGroups[0]?.parent?.name).toBe("lhand_g");
    expect(itemGroups[0]?.userData).toMatchObject({
      creatureEquipmentModelPartItemAttachmentTransformStatus:
        "held-weapon-source-axis-hand-node-anchor",
      creatureEquipmentModelPartItemAttachmentGripOffset: "0.0000,0.0000,0.0000"
    });
    expect(itemGroups[0]?.rotation.x).toBeCloseTo(0);
    expect(itemGroups[0]?.position.toArray()).toEqual([0, 0, 0]);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("anchors handheld bows to aliased animated left hand nodes and suppresses static ammunition equipment", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createCreatureRenderPayloadWithEquipment(
      createMultiPartModelReadyCreatureRenderPayload()
    );
    const bowCandidate = {
      resref: "nw_wbwln001",
      itemTemplateId: "itm_nw_wbwln001",
      slotMask: 16,
      slotLabels: ["right hand"],
      attachmentTargets: ["lhand_g", "rhand_g"],
      primaryAttachmentTarget: "lhand_g",
      baseItem: 8,
      itemName: "Longbow",
      itemModelType: "wbwln",
      itemModelParts: [11],
      itemModelPartRoles: ["blade"],
      itemModelPartResRefs: ["wbwln_b_011"],
      itemModelPartCandidates: [
        {
          resref: "wbwln_b_011",
          role: "blade",
          partId: 11,
          assetId: "asset-wbwln-glb",
          glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wbwln-glb.glb"
        }
      ],
      source: "utc.Equip_ItemList" as const,
      sourceModelStatus: "model-resrefs-ready" as const
    };
    const arrowCandidate = {
      resref: "nw_wammar007",
      itemTemplateId: "itm_nw_wammar007",
      slotMask: 2048,
      slotLabels: ["arrows"],
      attachmentTargets: ["rootdummy"],
      primaryAttachmentTarget: "rootdummy",
      baseItem: 20,
      itemName: "Mild Poison Arrow",
      itemModelType: "wamar",
      itemModelParts: [32, 21, 12],
      itemModelPartRoles: ["bottom", "middle", "top"],
      itemModelPartResRefs: ["wamar_b_032", "wamar_m_021", "wamar_t_012"],
      itemModelPartCandidates: [
        {
          resref: "wamar_b_032",
          role: "bottom",
          partId: 32,
          assetId: "asset-wamar-bottom-glb",
          glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wamar-bottom-glb.glb"
        },
        {
          resref: "wamar_m_021",
          role: "middle",
          partId: 21,
          assetId: "asset-wamar-middle-glb",
          glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wamar-middle-glb.glb"
        },
        {
          resref: "wamar_t_012",
          role: "top",
          partId: 12,
          assetId: "asset-wamar-top-glb",
          glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wamar-top-glb.glb"
        }
      ],
      source: "utc.Equip_ItemList" as const,
      sourceModelStatus: "model-resrefs-ready" as const
    };
    const equipmentModelCandidates = [bowCandidate, arrowCandidate];
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        weaponScale: 0.55
      },
      equipmentModelCandidates
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      appearanceProfile: {
        ...payload.creature.creatureRenderPackage!.appearanceProfile,
        weaponScale: 0.55
      },
      equipmentModelCandidates
    };

    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    const bowPartCacheKey =
      "creature:cre_guard_captain:v1:equipment:nw_wbwln001:asset-wbwln-glb";
    const bowPartRuntimeCacheKey = bowPartCacheKey;
    const skeletonModel = createCachedSkeletonModel(false);
    const rootDummy = skeletonModel.getObjectByName("rootdummy");
    const leftHand = new THREE.Bone();
    leftHand.name = "lhand_g2";
    const leftHandDummy = new THREE.Bone();
    leftHandDummy.name = "lhand";
    leftHand.add(leftHandDummy);
    const rightHand = new THREE.Bone();
    rightHand.name = "rhand_g1";
    rootDummy?.add(leftHand);
    rootDummy?.add(rightHand);
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, skeletonModel);
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));
    const bowPartModel = new THREE.Group();
    bowPartModel.name = "wbwln_b_011";
    const drawDummy = new THREE.Group();
    drawDummy.name = "DrawDummy";
    drawDummy.position.set(0.1, 0.45, 0);
    bowPartModel.add(drawDummy);
    Object.defineProperty(bowPartModel.userData, "auroraGltfAnimationClips", {
      configurable: true,
      enumerable: false,
      value: [
        new THREE.AnimationClip("bowshot", 1, [
          new THREE.VectorKeyframeTrack(
            "DrawDummy.position",
            [0, 1],
            [0.1, 0.45, 0, 0.1, 0.65, 0]
          )
        ])
      ],
      writable: true
    });
    runtime.placeableModelCacheByUrl.set(bowPartRuntimeCacheKey, bowPartModel);

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      {
        ...createDebugState(),
        showNonRenderMeshes: true
      },
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const itemGroups: THREE.Object3D[] = [];
    const loadedEquipmentParts: THREE.Object3D[] = [];
    root?.traverse((node) => {
      if (
        node.userData?.creatureEquipmentModelPartItemGroupStatus ===
        "source-equipment-item-model"
      ) {
        itemGroups.push(node);
      }
      if (node.userData?.creatureEquipmentModelPartStatus === "loaded") {
        loadedEquipmentParts.push(node);
      }
    });

    expect(root?.userData).toMatchObject({
      creatureEquipmentModelPartMode: "skeleton-anchors",
      creatureEquipmentModelPartAnchoredTargets: ["lhand_g"],
      creatureEquipmentModelPartItemGroupCount: 1,
      creatureEquipmentModelPartTotalCount: 1
    });
    expect(itemGroups).toHaveLength(1);
    expect(itemGroups[0]?.name).toContain("nw_wbwln001");
    expect(itemGroups[0]?.parent?.name).toBe("lhand");
    expect(itemGroups[0]?.userData).toMatchObject({
      creatureEquipmentModelPartItemAttachmentTarget: "lhand_g",
      creatureEquipmentModelPartItemResolvedAnchorName: "lhand",
      creatureEquipmentModelPartItemResolvedAnchorSource: "hand-dummy-preferred",
      creatureEquipmentModelPartItemAttachmentTransformStatus:
        "held-bow-source-axis-left-hand-node-anchor",
      creatureEquipmentModelPartItemAttachmentTransformAxis: "source",
      creatureEquipmentModelPartItemAttachmentGripOffset: "0.0000,0.0000,0.0000",
      creatureEquipmentModelPartItemAttachmentAuroraModelType: "2",
      creatureEquipmentModelPartItemAttachmentAuroraBaseItemWeaponWield: "5",
      creatureEquipmentModelPartItemAttachmentAuroraRotateOnGround: "1",
      creatureEquipmentModelPartItemWeaponScale: 0.55,
      creatureEquipmentModelPartItemWeaponScaleSource: "appearance.2da.WEAPONSCALE"
    });
    expect(itemGroups[0]?.scale.x).toBeCloseTo(0.55);
    expect(itemGroups[0]?.scale.y).toBeCloseTo(0.55);
    expect(itemGroups[0]?.scale.z).toBeCloseTo(0.55);
    expect(itemGroups[0]?.rotation.x).toBeCloseTo(0);
    expect(itemGroups[0]?.position.toArray()).toEqual([0, 0, 0]);
    expect(loadedEquipmentParts).toHaveLength(1);
    expect(loadedEquipmentParts[0]?.userData).toMatchObject({
      creatureEquipmentModelPartResRef: "wbwln_b_011",
      creatureEquipmentModelPartAttachmentTarget: "lhand_g"
    });
    expect(
      loadedEquipmentParts.some(
        (part) => part.userData?.creatureEquipmentModelPartResRef === "wamar_m_021"
      )
    ).toBe(false);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("anchors handheld crossbows to their Aurora right-hand equip slot and suppresses static bolt equipment", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createCreatureRenderPayloadWithEquipment(
      createMultiPartModelReadyCreatureRenderPayload()
    );
    const crossbowCandidate = {
      resref: "nw_wbwxl001",
      itemTemplateId: "itm_nw_wbwxl001",
      slotMask: 16,
      slotLabels: ["right hand"],
      attachmentTargets: ["rhand_g", "lhand_g"],
      primaryAttachmentTarget: "rhand_g",
      baseItem: 7,
      baseItemEquipableSlots: "0x00030",
      weaponWield: 6,
      weaponType: 1,
      weaponSize: 2,
      rangedWeapon: 25,
      rotateOnGround: 2,
      ammunitionType: 2,
      itemName: "Light Crossbow",
      itemModelType: "wbwxl",
      itemModelParts: [11],
      itemModelPartRoles: ["blade"],
      itemModelPartResRefs: ["wbwxl_b_011"],
      itemModelPartCandidates: [
        {
          resref: "wbwxl_b_011",
          role: "blade",
          partId: 11,
          assetId: "asset-wbwxl-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wbwxl-glb.glb"
        }
      ],
      source: "utc.Equip_ItemList" as const,
      sourceModelStatus: "model-resrefs-ready" as const
    };
    const boltCandidate = {
      resref: "nw_wammbo006",
      itemTemplateId: "itm_nw_wammbo006",
      slotMask: 8192,
      slotLabels: ["bolts"],
      attachmentTargets: ["rootdummy"],
      primaryAttachmentTarget: "rootdummy",
      baseItem: 25,
      itemName: "Mild Poison Bolt",
      itemModelType: "wambo",
      itemModelParts: [11, 51, 12],
      itemModelPartRoles: ["bottom", "middle", "top"],
      itemModelPartResRefs: ["wambo_b_011", "wambo_m_051", "wambo_t_012"],
      itemModelPartCandidates: [
        {
          resref: "wambo_b_011",
          role: "bottom",
          partId: 11,
          assetId: "asset-wambo-bottom-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wambo-bottom-glb.glb"
        },
        {
          resref: "wambo_m_051",
          role: "middle",
          partId: 51,
          assetId: "asset-wambo-middle-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wambo-middle-glb.glb"
        },
        {
          resref: "wambo_t_012",
          role: "top",
          partId: 12,
          assetId: "asset-wambo-top-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wambo-top-glb.glb"
        }
      ],
      source: "utc.Equip_ItemList" as const,
      sourceModelStatus: "model-resrefs-ready" as const
    };
    const equipmentModelCandidates = [crossbowCandidate, boltCandidate];
    payload.renderPackage = {
      ...payload.renderPackage!,
      equipmentModelCandidates
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      equipmentModelCandidates
    };

    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    const crossbowPartCacheKey =
      "creature:cre_guard_captain:v1:equipment:nw_wbwxl001:asset-wbwxl-glb";
    const crossbowPartRuntimeCacheKey = crossbowPartCacheKey;
    const skeletonModel = createCachedSkeletonModel(false);
    const rootDummy = skeletonModel.getObjectByName("rootdummy");
    const leftHand = new THREE.Bone();
    leftHand.name = "lhand_g2";
    const rightHand = new THREE.Bone();
    rightHand.name = "rhand_g1";
    const rightHandDummy = new THREE.Bone();
    rightHandDummy.name = "rhand";
    rightHand.add(rightHandDummy);
    rootDummy?.add(leftHand);
    rootDummy?.add(rightHand);
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, skeletonModel);
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));
    runtime.placeableModelCacheByUrl.set(
      crossbowPartRuntimeCacheKey,
      createCachedModel(0.6)
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      {
        ...createDebugState(),
        showNonRenderMeshes: true
      },
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const itemGroups: THREE.Object3D[] = [];
    const loadedEquipmentParts: THREE.Object3D[] = [];
    root?.traverse((node) => {
      if (
        node.userData?.creatureEquipmentModelPartItemGroupStatus ===
        "source-equipment-item-model"
      ) {
        itemGroups.push(node);
      }
      if (node.userData?.creatureEquipmentModelPartStatus === "loaded") {
        loadedEquipmentParts.push(node);
      }
    });

    expect(root?.userData).toMatchObject({
      creatureEquipmentModelPartMode: "skeleton-anchors",
      creatureEquipmentModelPartAnchoredTargets: ["rhand_g"],
      creatureEquipmentModelPartItemGroupCount: 1,
      creatureEquipmentModelPartTotalCount: 1
    });
    expect(itemGroups).toHaveLength(1);
    expect(itemGroups[0]?.name).toContain("nw_wbwxl001");
    expect(itemGroups[0]?.parent?.name).toBe("rhand");
    expect(itemGroups[0]?.userData).toMatchObject({
      creatureEquipmentModelPartItemAttachmentTarget: "rhand_g",
      creatureEquipmentModelPartItemResolvedAnchorName: "rhand",
      creatureEquipmentModelPartItemResolvedAnchorSource: "hand-dummy-preferred",
      creatureEquipmentModelPartItemAttachmentTransformStatus:
        "held-crossbow-source-axis-right-hand-node-anchor",
      creatureEquipmentModelPartItemAttachmentTransformSource:
        "aurora-sourcehierarchy-modeltype2-weaponwield6-source-axis-attached-to-rhand-hand-hook-under-capart-node-rotateonground-is-preview-only",
      creatureEquipmentModelPartItemAttachmentTransformAxis: "source",
      creatureEquipmentModelPartItemAttachmentTransformRadians: 0,
      creatureEquipmentModelPartItemAttachmentGripOffset: "0.0000,0.0000,0.0000",
      creatureEquipmentModelPartItemAttachmentResolvedOffset: "0.0000,0.0000,0.0000",
      creatureEquipmentModelPartItemAttachmentAuroraModelType: "2",
      creatureEquipmentModelPartItemAttachmentAuroraBaseItemWeaponWield: "6"
    });
    expect(itemGroups[0]?.rotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
    expect(itemGroups[0]?.position.toArray()).toEqual([0, 0, 0]);
    expect(loadedEquipmentParts).toHaveLength(1);
    expect(loadedEquipmentParts[0]?.userData).toMatchObject({
      creatureEquipmentModelPartResRef: "wbwxl_b_011",
      creatureEquipmentModelPartAttachmentTarget: "rhand_g"
    });
    expect(
      loadedEquipmentParts.some(
        (part) => part.userData?.creatureEquipmentModelPartResRef === "wambo_m_051"
      )
    ).toBe(false);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("renders arrow ammunition as an animated right-hand visual only for bowshot", () => {
    const payload = createCreatureRenderPayload();
    const arrowCandidate = {
      resref: "nw_wammar007",
      itemTemplateId: "itm_nw_wammar007",
      slotMask: 2048,
      slotLabels: ["arrows"],
      attachmentTargets: ["rootdummy"],
      primaryAttachmentTarget: "rootdummy",
      baseItem: 20,
      itemName: "Mild Poison Arrow",
      itemModelType: "wamar",
      itemModelParts: [21],
      itemModelPartRoles: ["middle"],
      itemModelPartResRefs: ["wamar_m_021"],
      itemModelPartCandidates: [
        {
          resref: "wamar_m_021",
          role: "middle",
          partId: 21,
          assetId: "asset-wamar-glb",
          glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wamar-glb.glb"
        }
      ],
      source: "utc.Equip_ItemList" as const,
      sourceModelStatus: "model-resrefs-ready" as const
    };
    payload.renderPackage = {
      ...payload.renderPackage!,
      equipmentModelCandidates: [arrowCandidate]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;

    expect(
      resolveCreatureEquipmentModelPartResolutions(
        payload,
        "http://127.0.0.1:3000"
      )
    ).toEqual([]);

    expect(
      resolveCreatureEquipmentModelPartResolutions(
        payload,
        "http://127.0.0.1:3000",
        { includeAmmunitionVisual: true }
      )
    ).toMatchObject([
      {
        equipmentResref: "nw_wammar007",
        partResref: "wamar_m_021",
        attachmentTarget: "rhand_g",
        itemModelType: "wamar",
        baseItem: 20
      }
    ]);
  });

  it("renders sling bullets as an animated right-hand visual only for ranged shots", () => {
    const payload = createCreatureRenderPayload();
    const slingCandidate = {
      resref: "nw_wbwsl001",
      itemTemplateId: "itm_nw_wbwsl001",
      slotMask: 16,
      slotLabels: ["right hand"],
      attachmentTargets: ["rhand_g"],
      primaryAttachmentTarget: "rhand_g",
      baseItem: 61,
      itemName: "Sling",
      itemModelType: "wbwsl",
      itemModelParts: [11],
      itemModelPartRoles: ["middle"],
      itemModelPartResRefs: ["wbwsl_011"],
      itemModelPartCandidates: [
        {
          resref: "wbwsl_011",
          role: "middle",
          partId: 11,
          assetId: "asset-wbwsl-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wbwsl-glb.glb"
        }
      ],
      source: "utc.Equip_ItemList" as const,
      sourceModelStatus: "model-resrefs-ready" as const
    };
    const bulletCandidate = {
      resref: "nw_wambu001",
      itemTemplateId: "itm_nw_wambu001",
      slotMask: 4096,
      slotLabels: ["bullets"],
      attachmentTargets: ["rootdummy"],
      primaryAttachmentTarget: "rootdummy",
      baseItem: 27,
      itemName: "Bullet",
      itemModelType: "wambu",
      source: "utc.Equip_ItemList" as const,
      sourceModelStatus: "metadata-only" as const
    };
    payload.renderPackage = {
      ...payload.renderPackage!,
      equipmentModelCandidates: [slingCandidate, bulletCandidate]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;

    expect(
      resolveCreatureEquipmentModelPartResolutions(
        payload,
        "http://127.0.0.1:3000"
      )
    ).toMatchObject([
      {
        equipmentResref: "nw_wbwsl001",
        partResref: "wbwsl_011",
        attachmentTarget: "rhand_g",
        itemModelType: "wbwsl",
        baseItem: 61
      }
    ]);

    expect(
      resolveCreatureEquipmentModelPartResolutions(
        payload,
        "http://127.0.0.1:3000",
        { includeAmmunitionVisual: true }
      )
    ).toMatchObject([
      {
        equipmentResref: "nw_wbwsl001",
        partResref: "wbwsl_011",
        attachmentTarget: "rhand_g",
        itemModelType: "wbwsl",
        baseItem: 61
      },
      {
        equipmentResref: "nw_wambu001",
        partResref: "wambu_011",
        modelUrl: "runtime://aurora-ammunition/wambu_011",
        attachmentTarget: "rhand_g",
        itemModelType: "wambu",
        baseItem: 27
      }
    ]);
  });

  it("does not block bowshot equipment readiness on the source arrow GLB", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "bowshot"
        }
      } as NonNullable<SceneObject["creatureProperties"]>
    } as SceneObject;
    const payload = createCreatureRenderPayloadWithEquipment(
      createMultiPartModelReadyCreatureRenderPayload()
    );
    const bowCandidate = {
      resref: "nw_wbwln001",
      itemTemplateId: "itm_nw_wbwln001",
      slotMask: 16,
      slotLabels: ["right hand"],
      attachmentTargets: ["lhand", "lhand_g", "rhand_g"],
      primaryAttachmentTarget: "lhand",
      baseItem: 8,
      itemName: "Longbow",
      itemModelType: "wbwln",
      itemModelParts: [11],
      itemModelPartRoles: ["blade"],
      itemModelPartResRefs: ["wbwln_b_011"],
      itemModelPartCandidates: [
        {
          resref: "wbwln_b_011",
          role: "blade",
          partId: 11,
          assetId: "asset-wbwln-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wbwln-glb.glb"
        }
      ],
      source: "utc.Equip_ItemList" as const,
      sourceModelStatus: "model-resrefs-ready" as const
    };
    const arrowCandidate = {
      resref: "nw_wammar007",
      itemTemplateId: "itm_nw_wammar007",
      slotMask: 2048,
      slotLabels: ["arrows"],
      attachmentTargets: ["rootdummy"],
      primaryAttachmentTarget: "rootdummy",
      baseItem: 20,
      itemName: "Mild Poison Arrow",
      itemModelType: "wamar",
      itemModelParts: [21],
      itemModelPartRoles: ["middle"],
      itemModelPartResRefs: ["wamar_m_021"],
      itemModelPartCandidates: [
        {
          resref: "wamar_m_021",
          role: "middle",
          partId: 21,
          assetId: "asset-wamar-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wamar-glb.glb"
        }
      ],
      source: "utc.Equip_ItemList" as const,
      sourceModelStatus: "model-resrefs-ready" as const
    };
    const equipmentModelCandidates = [bowCandidate, arrowCandidate];
    payload.renderPackage = {
      ...payload.renderPackage!,
      equipmentModelCandidates
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      equipmentModelCandidates
    };

    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    const bowPartCacheKey =
      "creature:cre_guard_captain:v1:equipment:nw_wbwln001:asset-wbwln-glb";
    const bowPartRuntimeCacheKey = bowPartCacheKey;
    const skeletonModel = createCachedSkeletonModel(false);
    const rootDummy = skeletonModel.getObjectByName("rootdummy");
    const leftHand = new THREE.Bone();
    leftHand.name = "lhand_g2";
    leftHand.position.set(-0.25, 0, 0);
    const leftHandDummy = new THREE.Bone();
    leftHandDummy.name = "lhand";
    leftHand.add(leftHandDummy);
    const rightHand = new THREE.Bone();
    rightHand.name = "rhand_g1";
    rightHand.position.set(0.25, 0, 0);
    const rightHandDummy = new THREE.Bone();
    rightHandDummy.name = "rhand";
    rightHand.add(rightHandDummy);
    rootDummy?.add(leftHand);
    rootDummy?.add(rightHand);
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, skeletonModel);
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));
    const bowPartModel = new THREE.Group();
    bowPartModel.name = "wbwln_b_011";
    const drawDummy = new THREE.Group();
    drawDummy.name = "DrawDummy";
    drawDummy.position.set(0.1, 0.45, 0);
    bowPartModel.add(drawDummy);
    Object.defineProperty(bowPartModel.userData, "auroraGltfAnimationClips", {
      configurable: true,
      enumerable: false,
      value: [
        new THREE.AnimationClip("bowshot", 1, [
          new THREE.VectorKeyframeTrack(
            "DrawDummy.position",
            [0, 1],
            [0.1, 0.45, 0, 0.1, 0.65, 0]
          )
        ])
      ],
      writable: true
    });
    runtime.placeableModelCacheByUrl.set(bowPartRuntimeCacheKey, bowPartModel);

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      {
        ...createDebugState(),
        showNonRenderMeshes: true
      },
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const itemGroups: THREE.Object3D[] = [];
    root?.traverse((node) => {
      if (
        node.userData?.creatureEquipmentModelPartItemGroupStatus ===
        "source-equipment-item-model"
      ) {
        itemGroups.push(node);
      }
    });

    expect(root?.userData).toMatchObject({
      creatureEquipmentModelPartLoadStatus: "loaded",
      creatureEquipmentModelPartLoadedCount: 2,
      creatureEquipmentModelPartTotalCount: 2,
      creatureEquipmentModelPartItemGroupCount: 2,
      creatureEquipmentModelPartAnchoredTargets: ["lhand_g", "rhand_g"],
      creatureEquipmentModelPartItemGroupSourceAnimationLoopModes: ["loop", ""],
      creatureEquipmentModelPartItemGroupSourceAnimationRecoveryPoseFallbacks: [
        "last-frame-hold",
        ""
      ],
      creatureEquipmentModelPartItemGroupSourceAnimationRecoveryPoseCandidateNames: [
        "bowrdy",
        ""
      ]
    });
    expect(root?.userData?.creatureEquipmentModelPartItemGroupTransformStatuses).toEqual([
      "held-bow-source-axis-left-hand-node-anchor",
      "runtime-ammunition-launcher-draw-or-hand-proxy"
    ]);
    const bowGroup = itemGroups.find(
      (group) =>
        group.userData?.creatureEquipmentModelPartItemEquipmentResRef ===
        "nw_wbwln001"
    );
    const bowPlayback = Array.from(runtime.objectAnimationMixersById.entries()).find(
      ([key, playback]) =>
        key.includes(":equipment:") && playback.actionNames.includes("bowshot")
    )?.[1];
    const bowClip = bowPlayback?.actions[0]?.getClip();
    expect(bowGroup?.userData).toMatchObject({
      creatureEquipmentModelPartItemSourceAnimationStatus: "playing",
      creatureEquipmentModelPartItemSourceAnimationSelectedClipNames: ["bowshot"],
      creatureAnimationPlaybackLoopModes: ["loop"],
      creatureAnimationPlaybackRecoveryPoseCandidateNames: ["bowrdy"],
      creatureAnimationPlaybackRecoveryPoseFallbacks: ["last-frame-hold"],
      creatureAnimationPlaybackRecoveryPoseFallbackReasons: [
        "missing-recovery-pose-clip"
      ]
    });
    expect(bowClip?.duration).toBeCloseTo(1.18, 3);
    expect(bowClip?.userData).toMatchObject({
      creatureAnimationRecoveryPose: true,
      creatureAnimationRecoveryPoseFallback: "last-frame-hold",
      creatureAnimationRecoveryPoseFallbackReason: "missing-recovery-pose-clip",
      creatureAnimationRecoveryPoseClipNameCandidate: "bowrdy",
      auroraMdlSourceAnimationLoopMode: "loop"
    });
    const arrowGroup = itemGroups.find(
      (group) =>
        group.userData?.creatureEquipmentModelPartItemEquipmentResRef ===
        "nw_wammar007"
    );
    const updateRuntimeEquipmentVisuals =
      root?.userData?.creatureRuntimeEquipmentVisualUpdate;
    if (typeof updateRuntimeEquipmentVisuals === "function") {
      updateRuntimeEquipmentVisuals(0, 0, 0.3, false);
    }
    expect(arrowGroup?.parent?.name).toBe("rhand");
    expect(arrowGroup?.userData).toMatchObject({
      creatureEquipmentModelPartItemAttachmentTarget: "rhand_g",
      creatureEquipmentModelPartItemAttachmentTransformStatus:
        "runtime-ammunition-launcher-draw-or-hand-proxy",
      creatureRuntimeAmmunitionProxyAimSource: "launcher-draw-node",
      creatureRuntimeAmmunitionProxyAimMode: "bow-root-forward-axis",
      creatureRuntimeAmmunitionProxyAimNodeName: "DrawDummy",
      creatureRuntimeAmmunitionProxyDirection: "0.0000,0.0000,-1.0000"
    });
    expect(
      arrowGroup?.getObjectByName(
        "creature_equipment_model_part_wamar_m_021_runtime_arrow_proxy"
      )?.userData
    ).toMatchObject({
      creatureRuntimeAmmunitionProxy: true,
      creatureRuntimeAmmunitionProxyKind: "arrow"
    });
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("aims crossbow bolt proxies against the authored draw axis so bolts leave the shaft", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "bowshot"
        }
      } as NonNullable<SceneObject["creatureProperties"]>
    } as SceneObject;
    const payload = createCreatureRenderPayloadWithEquipment(
      createMultiPartModelReadyCreatureRenderPayload()
    );
    const crossbowCandidate = {
      resref: "nw_wbwxl001",
      itemTemplateId: "itm_nw_wbwxl001",
      slotMask: 16,
      slotLabels: ["right hand"],
      attachmentTargets: ["rhand_g", "lhand_g"],
      primaryAttachmentTarget: "rhand_g",
      baseItem: 7,
      weaponWield: 6,
      rotateOnGround: 2,
      itemName: "Light Crossbow",
      itemModelType: "wbwxl",
      itemModelParts: [11],
      itemModelPartRoles: ["blade"],
      itemModelPartResRefs: ["wbwxl_b_011"],
      itemModelPartCandidates: [
        {
          resref: "wbwxl_b_011",
          role: "blade",
          partId: 11,
          assetId: "asset-wbwxl-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wbwxl-glb.glb"
        }
      ],
      source: "utc.Equip_ItemList" as const,
      sourceModelStatus: "model-resrefs-ready" as const
    };
    const boltCandidate = {
      resref: "nw_wammbo003",
      itemTemplateId: "itm_nw_wammbo003",
      slotMask: 8192,
      slotLabels: ["bolts"],
      attachmentTargets: ["rootdummy"],
      primaryAttachmentTarget: "rootdummy",
      baseItem: 25,
      itemName: "Bolt",
      itemModelType: "wambo",
      itemModelParts: [31],
      itemModelPartRoles: ["middle"],
      itemModelPartResRefs: ["wambo_m_031"],
      itemModelPartCandidates: [
        {
          resref: "wambo_m_031",
          role: "middle",
          partId: 31,
          assetId: "asset-wambo-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wambo-glb.glb"
        }
      ],
      source: "utc.Equip_ItemList" as const,
      sourceModelStatus: "model-resrefs-ready" as const
    };
    const equipmentModelCandidates = [crossbowCandidate, boltCandidate];
    payload.renderPackage = {
      ...payload.renderPackage!,
      equipmentModelCandidates
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      equipmentModelCandidates
    };

    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    const crossbowPartCacheKey =
      "creature:cre_guard_captain:v1:equipment:nw_wbwxl001:asset-wbwxl-glb";
    const boltPartCacheKey =
      "creature:cre_guard_captain:v1:equipment:nw_wammbo003:asset-wambo-glb";
    const skeletonModel = createCachedSkeletonModel(false);
    const rootDummy = skeletonModel.getObjectByName("rootdummy");
    const leftHand = new THREE.Bone();
    leftHand.name = "lhand_g";
    leftHand.position.set(-0.25, 0, 0);
    const rightHand = new THREE.Bone();
    rightHand.name = "rhand_g";
    rightHand.position.set(0.25, 0, 0);
    const rightHandDummy = new THREE.Bone();
    rightHandDummy.name = "rhand";
    rightHand.add(rightHandDummy);
    rootDummy?.add(leftHand, rightHand);
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, skeletonModel);
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));

    const crossbowModel = new THREE.Group();
    crossbowModel.name = "wbwxl_b_011";
    const drawDummy = new THREE.Group();
    drawDummy.name = "DrawDummy";
    drawDummy.rotation.x = -Math.PI / 2;
    drawDummy.position.set(0, 0, 0);
    crossbowModel.add(drawDummy);
    Object.defineProperty(crossbowModel.userData, "auroraGltfAnimationClips", {
      configurable: true,
      enumerable: false,
      value: [
        new THREE.AnimationClip("xbowshot", 1, [
          new THREE.VectorKeyframeTrack(
            "DrawDummy.position",
            [0, 1],
            [0, 0, 0, 0, 0, 0.2]
          )
        ])
      ],
      writable: true
    });
    runtime.placeableModelCacheByUrl.set(crossbowPartCacheKey, crossbowModel);
    runtime.placeableModelCacheByUrl.set(boltPartCacheKey, createCachedModel(0.2));

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      {
        ...createDebugState(),
        showNonRenderMeshes: true
      },
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const itemGroups: THREE.Object3D[] = [];
    root?.traverse((node) => {
      if (
        node.userData?.creatureEquipmentModelPartItemGroupStatus ===
        "source-equipment-item-model"
      ) {
        itemGroups.push(node);
      }
    });
    const boltGroup = itemGroups.find(
      (group) =>
        group.userData?.creatureEquipmentModelPartItemEquipmentResRef ===
        "nw_wammbo003"
    );
    const crossbowGroup = itemGroups.find(
      (group) =>
        group.userData?.creatureEquipmentModelPartItemEquipmentResRef ===
        "nw_wbwxl001"
    );
    const updateRuntimeEquipmentVisuals =
      root?.userData?.creatureRuntimeEquipmentVisualUpdate;
    if (typeof updateRuntimeEquipmentVisuals === "function") {
      updateRuntimeEquipmentVisuals(0, 0, 0.3, false);
    }

    expect(crossbowGroup?.userData).toMatchObject({
      creatureEquipmentModelPartItemSourceAnimationStatus: "playing",
      creatureEquipmentModelPartItemSourceAnimationOriginalRequestedName: "bowshot",
      creatureEquipmentModelPartItemSourceAnimationRequestedName: "xbowshot",
      creatureEquipmentModelPartItemSourceAnimationSelectedClipNames: ["xbowshot"]
    });
    expect(boltGroup?.parent?.name).toBe("rhand");
    expect(boltGroup?.userData).toMatchObject({
      creatureEquipmentModelPartItemAttachmentTarget: "rhand_g",
      creatureEquipmentModelPartItemAttachmentTransformStatus:
        "runtime-ammunition-launcher-draw-or-hand-proxy",
      creatureRuntimeAmmunitionProxyAimSource: "launcher-draw-node",
      creatureRuntimeAmmunitionProxyAimMode:
        "launcher-draw-axis-inverted-crossbow-source",
      creatureRuntimeAmmunitionProxyAimNodeName: "DrawDummy",
      creatureRuntimeAmmunitionProxyDirection: "0.0000,0.0000,1.0000"
    });
  });

  it("plays inherited bow source animation from equipment supermodel asset URLs", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "bowshot"
        }
      } as NonNullable<SceneObject["creatureProperties"]>
    } as SceneObject;
    const payload = createCreatureRenderPayloadWithEquipment(
      createMultiPartModelReadyCreatureRenderPayload()
    );
    const bowCandidate = {
      resref: "nw_wbwln002",
      itemTemplateId: "itm_nw_wbwln002",
      slotMask: 16,
      slotLabels: ["right hand"],
      attachmentTargets: ["lhand"],
      primaryAttachmentTarget: "lhand",
      baseItem: 8,
      itemName: "Longbow",
      itemModelType: "wbwln",
      itemModelParts: [23],
      itemModelPartRoles: ["middle"],
      itemModelPartResRefs: ["wbwln_m_023"],
      itemModelPartCandidates: [
        {
          resref: "wbwln_m_023",
          role: "middle",
          partId: 23,
          assetId: "asset-wbwln-m-023-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wbwln-m-023-glb.glb",
          supermodelResRef: "wbwln_m_011",
          supermodelAssetId: "asset-wbwln-m-011-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wbwln-m-011-glb.glb"
        }
      ],
      source: "utc.Equip_ItemList" as const,
      sourceModelStatus: "model-resrefs-ready" as const
    };
    payload.renderPackage = {
      ...payload.renderPackage!,
      equipmentModelCandidates: [bowCandidate]
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      equipmentModelCandidates: [bowCandidate]
    };

    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    const bowPartCacheKey =
      "creature:cre_guard_captain:v1:equipment:nw_wbwln002:asset-wbwln-m-023-glb";
    const bowPartRuntimeCacheKey = bowPartCacheKey;
    const bowSupermodelRuntimeCacheKey =
      "creature:cre_guard_captain:v1:equipment-supermodel:nw_wbwln002:asset-wbwln-m-011-glb";
    const skeletonModel = createCachedSkeletonModel(false);
    const rootDummy = skeletonModel.getObjectByName("rootdummy");
    const leftHand = new THREE.Bone();
    leftHand.name = "lhand";
    rootDummy?.add(leftHand);
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, skeletonModel);
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));

    const bowPartModel = new THREE.Group();
    bowPartModel.name = "wbwln_m_023";
    bowPartModel.userData = {
      auroraMdlSourceModel: "wbwln_m_023",
      auroraMdlSupermodel: "wbwln_m_011"
    };
    const drawDummy = new THREE.Group();
    drawDummy.name = "DrawDummy";
    drawDummy.position.set(3, 0, 0);
    bowPartModel.add(drawDummy);
    const secondDrawDummy = new THREE.Group();
    secondDrawDummy.name = "DrawDummy";
    secondDrawDummy.position.set(4, 0, 0);
    bowPartModel.add(secondDrawDummy);
    runtime.placeableModelCacheByUrl.set(bowPartRuntimeCacheKey, bowPartModel);

    const bowSupermodel = new THREE.Group();
    bowSupermodel.name = "wbwln_m_011";
    bowSupermodel.userData = {
      auroraMdlSourceModel: "wbwln_m_011",
      auroraMdlSourceAnimationNames: ["bowrdy", "bowshot"],
      auroraGltfAnimationNames: ["bowrdy", "bowshot"],
      auroraGltfHasAnimations: true
    };
    Object.defineProperty(bowSupermodel.userData, "auroraGltfAnimationClips", {
      configurable: true,
      enumerable: false,
      value: [
        new THREE.AnimationClip("bowrdy", 1, [
          new THREE.VectorKeyframeTrack(
            "DrawDummy.position",
            [0, 1],
            [1, 0, 0, 1, 0, 0]
          )
        ]),
        new THREE.AnimationClip("bowshot", 1, [
          new THREE.VectorKeyframeTrack(
            "DrawDummy.position",
            [0, 1],
            [1, 0, 0, 2, -0.2, 0]
          )
        ])
      ],
      writable: true
    });
    const sourceDrawDummy = new THREE.Group();
    sourceDrawDummy.name = "DrawDummy";
    sourceDrawDummy.position.set(1, 0, 0);
    bowSupermodel.add(sourceDrawDummy);
    runtime.placeableModelCacheByUrl.set(bowSupermodelRuntimeCacheKey, bowSupermodel);

    const resolvedEquipment = resolveCreatureEquipmentModelPartResolutions(
      payload,
      "http://127.0.0.1:3000"
    );
    expect(resolvedEquipment[0]).toMatchObject({
      partResref: "wbwln_m_023",
      supermodelResRef: "wbwln_m_011",
      supermodelModelUrl:
        "http://127.0.0.1:3000/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wbwln-m-011-glb.glb",
      supermodelModelCacheKey:
        "creature:cre_guard_captain:v1:equipment-supermodel:nw_wbwln002:asset-wbwln-m-011-glb"
    });

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const itemGroups: THREE.Object3D[] = [];
    const partGroups: THREE.Object3D[] = [];
    root?.traverse((node) => {
      if (
        node.userData?.creatureEquipmentModelPartItemGroupStatus ===
        "source-equipment-item-model"
      ) {
        itemGroups.push(node);
      }
      if (node.userData?.creatureEquipmentModelPartStatus === "loaded") {
        partGroups.push(node);
      }
    });

    const bowItemGroup = itemGroups.find(
      (node) =>
        node.userData?.creatureEquipmentModelPartItemEquipmentResRef === "nw_wbwln002"
    );
    expect(bowItemGroup).toBeDefined();
    expect(bowItemGroup?.userData).toMatchObject({
      creatureEquipmentModelPartItemSourceAnimationStatus: "playing",
      creatureEquipmentModelPartItemSourceAnimationClipNames: ["bowrdy", "bowshot"],
      creatureEquipmentModelPartItemSourceAnimationSelectedClipNames: ["bowshot"],
      creatureEquipmentModelPartItemSourceAnimationDuplicateTargetExpandedTrackCount: 1,
      creatureEquipmentModelPartItemSourceAnimationDuplicateTargetExpandedTargetCount: 2,
      creatureEquipmentModelPartItemSourceAnimationDuplicateTargetNames: ["DrawDummy"]
    });
    expect(partGroups[0]?.userData).toMatchObject({
      creatureEquipmentModelPartCompositionStatus: "source-hierarchy-preserved",
      creatureEquipmentModelPartSourceAnimationSupermodelStatus: "loaded",
      creatureEquipmentModelPartSourceAnimationSupermodel: "wbwln_m_011",
      creatureEquipmentModelPartSourceAnimationSupermodelPositionTrackMode: "source",
      creatureEquipmentModelPartSourceAnimationSupermodelClipNames: ["bowrdy", "bowshot"]
    });
    expect(root?.userData).toMatchObject({
      creatureEquipmentModelPartItemGroupSourceAnimationStatuses: expect.arrayContaining([
        "playing"
      ]),
      creatureEquipmentModelPartItemGroupSourceAnimationClipNames: expect.arrayContaining([
        "bowshot"
      ])
    });
    expect(
      Array.from(runtime.objectAnimationMixersById.entries()).some(
        ([key, playback]) =>
          key === `${creature.id}:equipment:0:nw_wbwln002:lhand_g` &&
          playback.actionNames.includes("bowshot")
      )
    ).toBe(true);
    const equipmentPlayback = runtime.objectAnimationMixersById.get(
      `${creature.id}:equipment:0:nw_wbwln002:lhand_g`
    );
    const runtimeDrawDummies: THREE.Object3D[] = [];
    bowItemGroup?.traverse((node) => {
      if (node.name === "DrawDummy") {
        runtimeDrawDummies.push(node);
      }
    });
    expect(runtimeDrawDummies).toHaveLength(2);
    const equipmentClip = equipmentPlayback?.actions[0]?.getClip();
    const drawDummyPositionTracks =
      equipmentClip?.tracks.filter((track) => track.name.endsWith(".position")) ?? [];
    expect(drawDummyPositionTracks.map((track) => track.name)).toEqual(
      expect.arrayContaining(
        runtimeDrawDummies.map((node) => `${node.uuid}.position`)
      )
    );
    expect(drawDummyPositionTracks).toHaveLength(2);
    drawDummyPositionTracks.forEach((track) => {
      const equipmentTrackValues = Array.from(track.values);
      expect(equipmentTrackValues.slice(0, 4)).toEqual([1, 0, 0, 2]);
      expect(equipmentTrackValues[4]).toBeCloseTo(-0.2);
      expect(equipmentTrackValues[5]).toBe(0);
      expect(equipmentTrackValues.slice(-3)).toEqual([1, 0, 0]);
    });
    expect(equipmentClip?.duration).toBeGreaterThan(1);
    expect(equipmentClip?.userData).toMatchObject({
      creatureAnimationRecoveryPose: true,
      creatureAnimationRecoveryPoseClipName: "bowrdy",
      creatureAnimationCompositeBasePoseSkippedReason: "base-tracks-already-covered",
      creatureAnimationCompositeBaseClipNameCandidate: "bowrdy",
      creatureEquipmentSourceAnimationDuplicateTargetExpansion: true,
      creatureEquipmentSourceAnimationDuplicateTargetExpandedTrackCount: 1,
      creatureEquipmentSourceAnimationDuplicateTargetExpandedTargetCount: 2,
      creatureEquipmentSourceAnimationDuplicateTargetNames: ["DrawDummy"]
    });
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("groups multi-part weapon equipment into one item root before attachment", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createCreatureRenderPayloadWithEquipment();
    const candidate = payload.renderPackage?.equipmentModelCandidates[0];
    const partCandidates = [
      {
        resref: "wswb_002",
        role: "blade",
        partId: 2,
        assetId: "asset-wswb-glb",
        glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wswb-glb.glb"
      },
      {
        resref: "wswm_001",
        role: "middle",
        partId: 1,
        assetId: "asset-wswm-glb",
        glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wswm-glb.glb"
      },
      {
        resref: "wswt_003",
        role: "top",
        partId: 3,
        assetId: "asset-wswt-glb",
        glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wswt-glb.glb"
      }
    ];
    if (candidate) {
      candidate.itemModelPartCandidates = partCandidates;
    }
    if (payload.creature.creatureRenderPackage?.equipmentModelCandidates[0]) {
      payload.creature.creatureRenderPackage.equipmentModelCandidates[0].itemModelPartCandidates =
        partCandidates;
    }
    [
      "asset-wswb-glb",
      "asset-wswm-glb",
      "asset-wswt-glb"
    ].forEach((assetId, index) => {
      const cachedModel = createCachedModel(0.4 + index * 0.1);
      cachedModel.name = `source_equipment_root_${assetId}`;
      cachedModel.userData = {
        ...cachedModel.userData,
        sourceEquipmentModelRootProbe: true
      };
      runtime.placeableModelCacheByUrl.set(
        `creature:cre_guard_captain:v1:equipment:nw_wswmls001:${assetId}`,
        cachedModel
      );
    });

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      false,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const itemGroups: THREE.Object3D[] = [];
    const loadedEquipmentParts: THREE.Object3D[] = [];
    const leakedSourceRoots: THREE.Object3D[] = [];
    root?.traverse((node) => {
      if (
        node.userData?.creatureEquipmentModelPartItemGroupStatus ===
        "source-equipment-item-model"
      ) {
        itemGroups.push(node);
      }
      if (node.userData?.creatureEquipmentModelPartStatus === "loaded") {
        loadedEquipmentParts.push(node);
      }
      if (node.userData?.sourceEquipmentModelRootProbe === true) {
        leakedSourceRoots.push(node);
      }
    });

    expect(itemGroups).toHaveLength(1);
    expect(itemGroups[0]?.userData).toMatchObject({
      creatureEquipmentModelPartItemEquipmentResRef: "nw_wswmls001",
      creatureEquipmentModelPartItemAttachmentTarget: "rhand_g",
      creatureEquipmentModelPartItemPartCount: 3,
      creatureEquipmentModelPartItemPartResRefs: ["wswb_002", "wswm_001", "wswt_003"],
      creatureEquipmentModelPartItemPartRoles: ["blade", "middle", "top"],
      creatureEquipmentModelPartItemAttachmentTransformStatus: "held-weapon-source-axis"
    });
    expect(itemGroups[0]?.rotation.x).toBeCloseTo(0);
    expect(loadedEquipmentParts.map((part) => part.name)).toEqual([
      "creature_equipment_model_part_wswb_002_0",
      "creature_equipment_model_part_wswm_001_1",
      "creature_equipment_model_part_wswt_003_2"
    ]);
    expect(
      loadedEquipmentParts.every((part) => part.parent === itemGroups[0])
    ).toBe(true);
    expect(
      loadedEquipmentParts.every(
        (part) => part.userData?.creatureEquipmentModelPartCompositionStatus === "flat-composed"
      )
    ).toBe(true);
    expect(leakedSourceRoots).toHaveLength(0);
    expect(runtime.container.dataset).toMatchObject({
      creaturePartModelRuntimeEquipmentItemGroupCount: "1",
      creaturePartModelRuntimeEquipmentLoosePartRootCount: "0"
    });
  });

  it("preserves source hierarchy metadata for equipment parts without source animation clips", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createCreatureRenderPayloadWithEquipment();
    const candidate = payload.renderPackage?.equipmentModelCandidates[0];
    const hierarchyPartCandidate = {
      resref: "wbwsh_b_011",
      role: "bottom",
      partId: 11,
      assetId: "asset-wbwsh-b-011-glb",
      glbUrl:
        "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wbwsh-b-011-glb.glb"
    };
    if (candidate) {
      candidate.itemModelType = "wbwsh";
      candidate.itemModelParts = [11];
      candidate.itemModelPartRoles = ["bottom"];
      candidate.itemModelPartResRefs = ["wbwsh_b_011"];
      candidate.itemModelPartCandidates = [hierarchyPartCandidate];
    }
    if (payload.creature.creatureRenderPackage?.equipmentModelCandidates[0]) {
      payload.creature.creatureRenderPackage.equipmentModelCandidates[0].itemModelType =
        "wbwsh";
      payload.creature.creatureRenderPackage.equipmentModelCandidates[0].itemModelParts =
        [11];
      payload.creature.creatureRenderPackage.equipmentModelCandidates[0].itemModelPartRoles =
        ["bottom"];
      payload.creature.creatureRenderPackage.equipmentModelCandidates[0].itemModelPartResRefs =
        ["wbwsh_b_011"];
      payload.creature.creatureRenderPackage.equipmentModelCandidates[0].itemModelPartCandidates =
        [hierarchyPartCandidate];
    }
    const hierarchyModel = new THREE.Group();
    hierarchyModel.name = "wbwsh_b_011";
    hierarchyModel.userData = {
      auroraMdlSourceModel: "wbwsh_b_011",
      auroraMdlSourceHierarchyNodeCount: 3,
      auroraMdlSourceHierarchyDummyNodeNames: ["wbwsh_b_011", "BowDummyB"],
      auroraMdlSourceHierarchySynthesizedNodeCount: 1,
      auroraMdlSourceHierarchySynthesizedNodeNames: ["BowDummyB"],
      auroraMdlSourceHierarchyReparentedNodeCount: 1,
      auroraMdlSourceHierarchyRebasedGeometryCount: 1,
      auroraMdlSourceHierarchyRebasedGeometryNodeNames: ["BowBottom"],
      auroraGltfAnimationCount: 0,
      auroraGltfAnimationNames: [],
      auroraGltfHasAnimations: false
    };
    const sourceRoot = new THREE.Group();
    sourceRoot.name = "wbwsh_b_011";
    const bowDummy = new THREE.Group();
    bowDummy.name = "BowDummyB";
    bowDummy.userData = {
      auroraSourceHierarchyNodeType: "dummy",
      auroraSourceHierarchyParentName: "wbwsh_b_011"
    };
    const bowMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 1, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x88ffaa })
    );
    bowMesh.name = "BowBottom";
    bowDummy.add(bowMesh);
    sourceRoot.add(bowDummy);
    hierarchyModel.add(sourceRoot);
    runtime.placeableModelCacheByUrl.set(
      "creature:cre_guard_captain:v1:equipment:nw_wswmls001:asset-wbwsh-b-011-glb",
      hierarchyModel
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      false,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const loadedEquipmentParts: THREE.Object3D[] = [];
    root?.traverse((node) => {
      if (node.userData?.creatureEquipmentModelPartStatus === "loaded") {
        loadedEquipmentParts.push(node);
      }
    });
    const runtimeBowMesh = root?.getObjectByName("BowBottom");

    expect(loadedEquipmentParts).toHaveLength(1);
    expect(loadedEquipmentParts[0]?.userData).toMatchObject({
      creatureEquipmentModelPartCompositionStatus: "source-hierarchy-preserved",
      creatureEquipmentModelPartCompositionReason: "source-hierarchy-metadata",
      creatureEquipmentModelPartSourceHierarchyNodeCount: 3,
      creatureEquipmentModelPartSourceHierarchyRebasedGeometryCount: 1,
      creatureEquipmentModelPartSourceAnimationClipCount: 0
    });
    expect(runtimeBowMesh?.parent?.name).toBe("BowDummyB");
    expect(runtime.container.dataset).toMatchObject({
      creaturePartModelRuntimeEquipmentLoosePartRootCount: "0"
    });
    expect(
      runtime.container.dataset.creaturePartModelRuntimeEquipmentPartCompositionStatuses
    ).toContain("source-hierarchy-preserved");
    expect(
      runtime.container.dataset.creaturePartModelRuntimeEquipmentVisibleMeshParentPaths
    ).toContain("BowBottom<-BowDummyB");
  });

  it("keeps the creature body loaded when optional equipment model parts fail to load", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createCreatureRenderPayloadWithEquipment(
      createPartModelReadyCreatureRenderPayload()
    );
    const bodyPartCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    runtime.placeableModelCacheByUrl.set(bodyPartCacheKey, createCachedModel(1));
    (runtime as unknown as {
      placeableModelFetch: ReturnType<typeof vi.fn>;
    }).placeableModelFetch = vi.fn(async () => ({ ok: false }));

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      false,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 500));

    const root = runtime.objectMeshById.get(creature.id);
    const loadedEquipmentParts: THREE.Object3D[] = [];
    root?.traverse((node) => {
      if (node.userData?.creatureEquipmentModelPartStatus === "loaded") {
        loadedEquipmentParts.push(node);
      }
    });

    expect(root?.userData).toMatchObject({
      creaturePartModelGroupStatus: "loaded",
      creaturePartModelGroupLoadedCount: 1,
      creaturePartModelGroupTotalCount: 1,
      creatureEquipmentModelPartLoadedCount: 0,
      creatureEquipmentModelPartTotalCount: 1,
      creatureEquipmentModelPartResRefs: ["wswb_002"],
      creatureEquipmentModelPartEquipmentResRefs: ["nw_wswmls001"]
    });
    expect(["loading", "missing"]).toContain(
      root?.userData?.creatureEquipmentModelPartLoadStatus
    );
    expect(runtime.container.dataset).toMatchObject({
      placeableModelStatus: "loaded",
      placeableModelLoadPhase: "complete",
      placeableModelLoadCompleted: "1",
      placeableModelLoadTotal: "1",
      placeableModelCreatureEquipmentModelPartLoadedCount: "0",
      placeableModelCreatureEquipmentModelPartTotalCount: "1",
      placeableModelCreatureEquipmentModelPartResRefs: "wswb_002",
      placeableModelCreatureEquipmentModelPartEquipmentResRefs: "nw_wswmls001"
    });
    expect(["loading", "missing"]).toContain(
      runtime.container.dataset.placeableModelCreatureEquipmentModelPartLoadStatus
    );
    expect(loadedEquipmentParts).toHaveLength(0);
  });

  it("attaches CAPart body models before slow textures or optional equipment finish", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createCreatureRenderPayloadWithEquipment(
      createPartModelReadyCreatureRenderPayload()
    );
    payload.renderPackage = {
      ...payload.renderPackage!,
      textureUrls: [
        "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/pfh2_rfoot004.plt"
      ]
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      textureUrls: payload.renderPackage.textureUrls
    };
    const bodyPartCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    runtime.placeableModelCacheByUrl.set(bodyPartCacheKey, createCachedModel(1));
    (runtime as unknown as {
      placeableModelFetch: ReturnType<typeof vi.fn>;
    }).placeableModelFetch = vi.fn(async () => ({ ok: false }));

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    const directFallbackSpheres =
      root?.children.filter(
        (child): child is THREE.Mesh =>
          child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry
      ) ?? [];
    expect(root?.userData).toMatchObject({
      creaturePartModelGroupStatus: "loaded",
      creaturePartModelGroupLoadedCount: 1,
      creaturePartModelGroupTotalCount: 1
    });
    expect(partGroup).toBeTruthy();
    expect(directFallbackSpheres).toHaveLength(0);
    expect(runtime.container.dataset).toMatchObject({
      placeableModelLoadPhase: "creature-part-models",
      placeableModelLoadCompleted: "1",
      placeableModelLoadTotal: "1",
      placeableModelMeshCount: "1",
      placeableModelTextureStatus: "loading"
    });
    expect(["loaded", "loading"]).toContain(runtime.container.dataset.placeableModelStatus);

    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(root?.userData).toMatchObject({
      creatureEquipmentModelPartLoadStatus: "missing",
      creatureEquipmentModelPartLoadedCount: 0,
      creatureEquipmentModelPartTotalCount: 1
    });
    expect(runtime.container.dataset.placeableModelMeshCount).toBe("1");
  });

  it("uses ready direct-model creature payloads as viewport model geometry", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    const cachedModel = createAnimatedSkinnedCachedModel();
    const idleClip = readPlaceableModelAnimationClips(cachedModel).find(
      (clip) => clip.name === "idle"
    );
    if (idleClip) {
      idleClip.userData = {
        auroraMdlSourceAnimationTransitionTime: 0.25,
        auroraMdlSourceAnimationEvents: [{ time: 0.05, name: "footstep" }]
      };
    }
    runtime.placeableModelCacheByUrl.set(modelCacheKey, cachedModel);
    expect(
      readPlaceableModelAnimationClips(runtime.placeableModelCacheByUrl.get(modelCacheKey)!)
        .map((clip) => clip.name)
    ).toEqual(["walk", "idle"]);

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      objectId: creature.id,
      objectKind: "creatures",
      auroraPrimitiveObject: false,
      creatureRenderPackageStatus: "ready",
      creatureRenderModelStatus: "ready",
      creatureRenderModelReady: true,
      creatureRenderModelCacheKey: modelCacheKey,
      creatureSourceModelCandidateResRefs: ["n_bear"],
      creatureSourceModelCandidateConfidence: ["direct-model"],
      creatureRenderLoadedModelSkinnedMeshCount: 1,
      creatureRenderLoadedModelSkinnedMeshNodeNames: ["torso_skin"],
      creatureRenderLoadedModelBoneCount: 1,
      creatureRenderLoadedModelBoneNodeNames: ["rootdummy"],
      creatureRenderLoadedModelAnimationCount: 2,
      creatureRenderLoadedModelAnimationNames: ["walk", "idle"],
      creatureRenderLoadedModelAnimationDurations: [1.25, 2.5],
      creatureRenderLoadedModelRenderSuppressedMeshCount: 1,
      creatureRenderLoadedModelRenderSuppressedMeshNames: ["body_bone"],
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackMode: "three-animation-mixer",
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["idle"],
      creatureAnimationPlaybackAnimRunMode: "aurora-stack-v1",
      creatureAnimationPlaybackLoopModes: ["loop"],
      creatureAnimationPlaybackTransitionSeconds: [0.25],
      creatureAnimationPlaybackEventCount: 1,
      creatureAnimationPlaybackEventNames: ["footstep"],
      creatureAnimationAvailableClipCount: 2,
      creatureAnimationAvailableClipNames: ["walk", "idle"],
      creatureAnimationSelectedClipNames: ["idle"],
      creatureAnimationSelectionMode: "single-idle-clip"
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.actionNames).toEqual([
      "idle"
    ]);
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.06);
    expect(root?.userData).toMatchObject({
      creatureAnimationPlaybackProcessedEventCount: 1,
      creatureAnimationPlaybackProcessedEventNames: ["footstep"]
    });
    expect(runtime.container.dataset.creatureAnimationMixerCount).toBe("1");
    expect(runtime.container.dataset.creatureAnimationMixerAnimRunModes).toBe("aurora-stack-v1");
    expect(runtime.container.dataset.creatureAnimationMixerLoopModes).toBe("loop");
    expect(runtime.container.dataset.creatureAnimationMixerTransitionSeconds).toBe("0.25");
    expect(runtime.container.dataset.creatureAnimationMixerEventCounts).toBe("1");
    expect(runtime.container.dataset.creatureAnimationMixerEventNames).toBe("footstep");
    expect(runtime.container.dataset.creatureAnimationMixerProcessedEventCounts).toBe("1");
    expect(runtime.container.dataset.creatureAnimationMixerProcessedEventNames).toBe(
      "footstep"
    );
    expect(runtime.container.dataset.creatureAnimationMixerRenderSuppressedMeshCounts).toBe("1");
    expect(runtime.container.dataset.creatureAnimationMixerRenderSuppressedMeshNames).toBe(
      "body_bone"
    );
    expect(String(root?.userData.creatureRenderModelUrl)).toContain(
      "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-bear-glb.glb"
    );
    expect(root?.children.some((child) => child instanceof THREE.Group)).toBe(true);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("prefers prefixed pause clips over short get-up loops for direct creature auto idle", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createPrefixedIdleCachedModel());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackActionNames: ["cpause1"],
      creatureAnimationAvailableClipNames: ["cgetmidlp", "pauseturn", "cpause1"],
      creatureAnimationSelectedClipNames: ["cpause1"],
      creatureAnimationSelectionMode: "single-idle-clip"
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.actionNames).toEqual([
      "cpause1"
    ]);
    expect(runtime.container.dataset.creatureAnimationMixerActionNames).toBe("cpause1");
  });

  it("prefers neutral pause clips over equipment-specific pause variants for direct creature auto idle", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createNeutralAndEquipmentPauseCachedModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackActionNames: ["pause1"],
      creatureAnimationAvailableClipNames: ["pausesh", "pause1", "pause2"],
      creatureAnimationSelectedClipNames: ["pause1"],
      creatureAnimationSelectionMode: "single-idle-clip"
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.actionNames).toEqual([
      "pause1"
    ]);
    expect(runtime.container.dataset.creatureAnimationMixerActionNames).toBe("pause1");
  });

  it("uses NWN ready stance clips as creature auto idle when pause clips are absent", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createReadyStanceCachedModel());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackActionNames: ["2hreadyr"],
      creatureAnimationAvailableClipNames: ["2hreadyl", "2hreadyr", "plslashl"],
      creatureAnimationSelectedClipNames: ["2hreadyr"],
      creatureAnimationSelectionMode: "single-idle-clip"
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.actionNames).toEqual([
      "2hreadyr"
    ]);
    expect(runtime.container.dataset.creatureAnimationMixerActionNames).toBe("2hreadyr");
  });

  it("plays the selected creature animation clip when the object requests one", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationState: 2,
          animationName: "walk"
        }
      } as NonNullable<SceneObject["creatureProperties"]>
    } as SceneObject;
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createAnimatedSkinnedCachedModel());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackMode: "three-animation-mixer",
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["walk"],
      creatureAnimationAvailableClipCount: 2,
      creatureAnimationAvailableClipNames: ["walk", "idle"],
      creatureAnimationSelectedClipNames: ["walk"],
      creatureAnimationRequestedClipName: "walk",
      creatureAnimationRequestedClipMatched: true,
      creatureAnimationSelectionMode: "explicit-name",
      creatureAnimationState: 2,
      creatureAnimationStateMappingSource: "scene-object",
      creatureAnimationStateMappingStatus: "overridden-by-animation-name",
      creatureAnimationStateMappingOverrideClipName: "walk"
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.actionNames).toEqual([
      "walk"
    ]);
    expect(runtime.container.dataset.creatureAnimationMixerCount).toBe("1");
    expect(runtime.container.dataset.creatureAnimationMixerObjectIds).toBe(creature.id);
    expect(runtime.container.dataset.creatureAnimationMixerActionNames).toBe("walk");
    expect(runtime.container.dataset.creatureAnimationMixerStates).toBe("2");
    expect(runtime.container.dataset.creatureAnimationMixerStateMappingStatuses).toBe(
      "overridden-by-animation-name"
    );
  });

  it("maps a creature AnimationState to a supported canonical clip", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationState: 0
        }
      } as NonNullable<SceneObject["creatureProperties"]>
    } as SceneObject;
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createPrefixedIdleCachedModel());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackActionNames: ["cpause1"],
      creatureAnimationRequestedClipName: "cpause1",
      creatureAnimationRequestedClipMatched: true,
      creatureAnimationSelectionMode: "animation-state",
      creatureAnimationState: 0,
      creatureAnimationStateMappingStatus: "state-mapped",
      creatureAnimationStateMappedClipName: "cpause1"
    });
  });

  it("keeps a known AnimationState without its clip in rest pose instead of selecting idle", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationState: 42
        }
      } as NonNullable<SceneObject["creatureProperties"]>
    } as SceneObject;
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createPrefixedIdleCachedModel());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureAnimationPlaybackStatus: "rest-pose",
      creatureAnimationPlaybackClipCount: 0,
      creatureAnimationPlaybackActionNames: [],
      creatureAnimationSelectedClipNames: [],
      creatureAnimationSelectionMode: "rest-pose",
      creatureAnimationState: 42,
      creatureAnimationStateMappingStatus: "state-clip-unavailable",
      creatureAnimationStateMappingCandidateClipNames: ["cdismount1lp", "dismount1lp"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.actionNames).toEqual([]);
  });

  it("plays an AnimationState fire-and-forget action once after its recovery pose", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationState: 105
        }
      } as NonNullable<SceneObject["creatureProperties"]>
    } as SceneObject;
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createFireAndForgetCachedModel());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(runtime.objectAnimationMixersById.get(creature.id)?.clipRuns).toMatchObject([
      {
        clipName: "bow",
        loopMode: "once"
      },
      {
        clipName: "pause1",
        active: false,
        isFollowUp: true,
        loopMode: "loop"
      }
    ]);
    for (let frame = 0; frame < 12; frame += 1) {
      updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    }
    expect(runtime.objectMeshById.get(creature.id)?.userData).toMatchObject({
      creatureAnimationPlaybackAnimRunMode: "aurora-stack-v1",
      creatureAnimationPlaybackLoopModes: ["once", "loop"],
      creatureAnimationPlaybackCompletedActionNames: ["bow"],
      creatureAnimationPlaybackRunStates: ["completed", "active"],
      creatureAnimationPlaybackRunPriorities: [0, -1],
      creatureAnimationPlaybackFollowUpClipNames: ["pause1"],
      creatureAnimationPlaybackHandoffClipNames: ["pause1"],
      creatureAnimationPlaybackHandoffTransitionSeconds: [0.25],
      creatureAnimationState: 105,
      creatureAnimationStateMappingStatus: "state-mapped",
      creatureAnimationStateMappedClipName: "bow",
      creatureAnimationFollowUpClipName: "pause1"
    });
    const actionWeights = runtime.objectMeshById.get(creature.id)?.userData
      ?.creatureAnimationPlaybackActionWeights as number[] | undefined;
    expect(actionWeights?.[0]).toBeLessThan(1);
    expect(actionWeights?.[1]).toBeGreaterThan(0);
  });

  it("applies an AnimRun time scale consistently to mixer frames and explicit samples", () => {
    const runtime = createRuntime();
    const root = new THREE.Group();
    root.userData.objectKind = "creatures";
    const clip = new THREE.AnimationClip("scaled-run", 1, [
      new THREE.NumberKeyframeTrack(".position[x]", [0, 1], [0, 10])
    ]);
    const playback = registerRuntimeObjectAnimationPlayback(runtime, "scaled-run", root, [clip], {
      priority: 7,
      timeScale: 2
    });

    expect(playback?.clipRuns).toMatchObject([
      {
        clipName: "scaled-run",
        priority: 7,
        timeScale: 2,
        currentTimeSeconds: 0
      }
    ]);

    updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);

    expect(root.position.x).toBeCloseTo(4, 5);
    expect(playback?.clipRuns[0]?.currentTimeSeconds).toBeCloseTo(0.4, 5);
    expect(root.userData).toMatchObject({
      creatureAnimationPlaybackRunPriorities: [7],
      creatureAnimationPlaybackTimeScales: [2]
    });
    expect(runtime.container.dataset.creatureAnimationMixerRunPriorities).toBe("7");
    expect(runtime.container.dataset.creatureAnimationMixerTimeScales).toBe("2");

    const [sample] = sampleRuntimeObjectAnimationAtTime(runtime, 0.25);
    expect(sample?.clipRuns).toMatchObject([
      {
        clipName: "scaled-run",
        currentTimeSeconds: 0.5,
        priority: 7,
        timeScale: 2
      }
    ]);
    expect(root.position.x).toBeCloseTo(5, 5);
  });

  it("preserves interpolated AnimRun handoff weights in explicit frame samples", () => {
    const runtime = createRuntime();
    const root = new THREE.Group();
    root.userData.objectKind = "creatures";
    const actionClip = new THREE.AnimationClip("bow", 1, []);
    actionClip.userData.auroraMdlSourceAnimationLoopMode = "once";
    actionClip.userData.auroraMdlSourceAnimationTransitionTime = 0.25;
    const followUpClip = new THREE.AnimationClip("pause1", 1, []);
    followUpClip.userData.auroraMdlSourceAnimationTransitionTime = 0.25;
    const playback = registerRuntimeObjectAnimationPlayback(runtime, "bow", root, [actionClip], {
      followUpClip
    });

    const [sample] = sampleRuntimeObjectAnimationAtTime(runtime, 1.125);

    expect(sample?.clipRuns).toMatchObject([
      { clipName: "bow", completed: true, active: false },
      { clipName: "pause1", completed: false, active: true }
    ]);
    expect(playback?.actions[0]?.getEffectiveWeight()).toBeCloseTo(0, 5);
    expect(playback?.actions[1]?.getEffectiveWeight()).toBeCloseTo(0.5, 5);
    expect(root.userData).toMatchObject({
      creatureAnimationPlaybackActionWeights: [0, 0.5],
      creatureAnimationPlaybackRunBlendPhases: ["completed", "fade-in"],
      creatureAnimationPlaybackRunBlendWeights: [0, 0.5],
      creatureAnimationPlaybackHandoffClipNames: ["pause1"],
      creatureAnimationPlaybackHandoffTransitionSeconds: [0.25]
    });
  });

  it("uses the Aurora AnimRun fade-out rate during normal mixer ticks", () => {
    const runtime = createRuntime();
    const root = new THREE.Group();
    root.userData.objectKind = "creatures";
    const actionClip = new THREE.AnimationClip("bow", 1, []);
    actionClip.userData.auroraMdlSourceAnimationLoopMode = "once";
    actionClip.userData.auroraMdlSourceAnimationTransitionTime = 0.25;
    const followUpClip = new THREE.AnimationClip("pause1", 1, []);
    followUpClip.userData.auroraMdlSourceAnimationTransitionTime = 0.25;
    const playback = registerRuntimeObjectAnimationPlayback(runtime, "bow", root, [actionClip], {
      followUpClip
    });

    for (let frame = 0; frame < 11; frame += 1) {
      updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    }

    expect(playback?.clipRuns).toMatchObject([
      { clipName: "bow", completed: true, blendPhase: "fade-out" },
      { clipName: "pause1", active: true, blendPhase: "fade-in" }
    ]);
    expect(playback?.clipRuns[0]?.blendWeight).toBeCloseTo(0.2, 5);
    expect(playback?.clipRuns[1]?.blendWeight).toBeCloseTo(0.4, 5);
    expect(playback?.actions[0]?.getEffectiveWeight()).toBeCloseTo(0.2, 5);
    expect(playback?.actions[1]?.getEffectiveWeight()).toBeCloseTo(0.4, 5);
  });

  it("autoplays the selected fallback when an explicit creature animation is missing", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "cpause1"
        }
      } as NonNullable<SceneObject["creatureProperties"]>
    } as SceneObject;
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createNeutralAndEquipmentPauseCachedModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackActionNames: ["pause1"],
      creatureAnimationRequestedClipName: "cpause1",
      creatureAnimationRequestedClipMatched: false,
      creatureAnimationSelectionMode: "explicit-name-missing-fallback",
      creatureAnimationSelectedClipNames: ["pause1"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.autoplay).toBe(true);
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackStatuses).toBe(
      "playing"
    );
    expect(runtime.container.dataset.creatureAnimationMixerActionNames).toBe("pause1");
  });

  it("loads direct creature supermodel clips for animation playback", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      sourceModelCandidates: [
        {
          resref: "c_bearbrwn",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-bear-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-bear-glb.glb",
          supermodelResRef: "bear_a",
          supermodelAssetId: "asset-bear-a-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-bear-a-glb.glb"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    const supermodelCacheKey = "creature:cre_guard_captain:v1:supermodel:asset-bear-a-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createDirectCreatureSourceHierarchyCachedModel()
    );
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedSupermodelAnimationModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureRenderDirectSupermodelLoadStatus: "loaded",
      creatureRenderDirectSupermodelResRef: "bear_a",
      creatureRenderDirectSupermodelCacheKey: supermodelCacheKey,
      creatureRenderDirectSupermodelClipCount: 1,
      creatureRenderDirectSupermodelClipNames: ["super_walk"],
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackMode: "three-animation-mixer",
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["super_walk"],
      creatureAnimationAvailableClipCount: 1,
      creatureAnimationAvailableClipNames: ["super_walk"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.actionNames).toEqual([
      "super_walk"
    ]);
    expect(runtime.container.dataset.creatureAnimationMixerActionNames).toBe("super_walk");
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("plays requested direct supermodel clips when the direct creature model also has own clips", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "1hslashl"
        }
      } as NonNullable<SceneObject["creatureProperties"]>
    } as SceneObject;
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      sourceModelCandidates: [
        {
          resref: "c_bearbrwn",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-bear-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-bear-glb.glb",
          supermodelResRef: "a_ba",
          supermodelAssetId: "asset-a-ba-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-ba-glb.glb"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    const supermodelCacheKey = "creature:cre_guard_captain:v1:supermodel:asset-a-ba-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createDirectCreatureBowHierarchyCachedModelWithOwnIdle()
    );
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedSlashSupermodelAnimationModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureRenderDirectSupermodelLoadStatus: "loaded",
      creatureRenderDirectSupermodelResRef: "a_ba",
      creatureRenderDirectSupermodelClipCount: 1,
      creatureRenderDirectSupermodelClipNames: ["1hslashl"],
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackMode: "three-animation-mixer",
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["1hslashl"],
      creatureAnimationAvailableClipCount: 2,
      creatureAnimationAvailableClipNames: ["pause1", "1hslashl"],
      creatureAnimationSelectedClipNames: ["1hslashl"],
      creatureAnimationRequestedClipName: "1hslashl",
      creatureAnimationRequestedClipMatched: true,
      creatureAnimationSelectionMode: "explicit-name"
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.actionNames).toEqual([
      "1hslashl"
    ]);
    expect(runtime.container.dataset.creatureAnimationMixerActionNames).toBe("1hslashl");
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("recovers melee one-shot weapon clips to the matching ready pose", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "1hslashl"
        }
      } as NonNullable<SceneObject["creatureProperties"]>
    } as SceneObject;
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      sourceModelCandidates: [
        {
          resref: "c_bearbrwn",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-bear-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-bear-glb.glb",
          supermodelResRef: "a_ba",
          supermodelAssetId: "asset-a-ba-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-ba-glb.glb"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    const supermodelCacheKey = "creature:cre_guard_captain:v1:supermodel:asset-a-ba-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createDirectCreatureBowHierarchyCachedModelWithOwnIdle()
    );
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedSlashWithReadySupermodelAnimationModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const playback = runtime.objectAnimationMixersById.get(creature.id);
    const actionClip = playback?.actions[0]?.getClip();
    const recoveredPositionTrack = actionClip?.tracks.find(
      (track) => track.name === "torso_g.position"
    );

    expect(actionClip?.userData).toMatchObject({
      creatureAnimationRecoveryPose: true,
      creatureAnimationRecoveryPoseClipName: "1hreadyl",
      creatureAnimationRecoveryPoseTrackCount: 1,
      creatureAnimationPreviewLoop: true,
      creatureAnimationPreviewLoopSource: "creatures-mode-selected-attack",
      auroraMdlSourceAnimationLoopMode: "loop"
    });
    expect(actionClip?.duration).toBeCloseTo(1.18, 3);
    expect(playback?.clipRuns[0]?.loopMode).toBe("loop");
    expect(Array.from(recoveredPositionTrack?.times ?? []).map((time) => Number(time.toFixed(3)))).toEqual([
      0, 1, 1.18
    ]);
    expect(
      Array.from(recoveredPositionTrack?.values ?? []).map((value) =>
        Number(value.toFixed(3))
      )
    ).toEqual([
      0.25, 0.8, 0, 0.25, 2, 0, 0.25, 0.8, 0
    ]);
    expect(runtime.container.dataset.creatureAnimationMixerActionNames).toBe("1hslashl");
    expect(runtime.container.dataset.creatureAnimationMixerLoopModes).toBe("loop");
    expect(runtime.container.dataset.creatureAnimationMixerRecoveryPoseClipNames).toBe(
      "1hreadyl"
    );
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("composes bowshot with the bow ready base pose when the attack clip is partial", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "bowshot"
        }
      } as NonNullable<SceneObject["creatureProperties"]>
    } as SceneObject;
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      sourceModelCandidates: [
        {
          resref: "c_bearbrwn",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-bear-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-bear-glb.glb",
          supermodelResRef: "a_ba",
          supermodelAssetId: "asset-a-ba-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-ba-glb.glb"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    const supermodelCacheKey = "creature:cre_guard_captain:v1:supermodel:asset-a-ba-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createDirectCreatureSourceHierarchyCachedModelWithOwnIdle()
    );
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedBowShotSupermodelAnimationModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const playback = runtime.objectAnimationMixersById.get(creature.id);
    const actionClip = playback?.actions[0]?.getClip();
    const root = runtime.objectMeshById.get(creature.id);

    expect(root?.userData).toMatchObject({
      creatureAnimationPlaybackActionNames: ["bowshot"],
      creatureAnimationPlaybackLoopModes: ["loop"],
      creatureAnimationSelectedClipNames: ["bowshot"],
      creatureAnimationSelectedClipBasePoseNames: ["bowrdy"],
      creatureAnimationRequestedClipName: "bowshot",
      creatureAnimationRequestedClipMatched: true,
      creatureAnimationSelectionMode: "explicit-name"
    });
    expect(playback?.actionNames).toEqual(["bowshot"]);
    expect(actionClip?.userData).toMatchObject({
      creatureAnimationCompositeBasePose: true,
      creatureAnimationCompositeBaseClipName: "bowrdy",
      creatureAnimationCompositeBaseTrackCount: 1,
      creatureAnimationCompositeRequestedTrackCount: 1,
      creatureAnimationRecoveryPose: true,
      creatureAnimationRecoveryPoseClipName: "bowrdy",
      creatureAnimationRecoveryPoseTrackCount: 1,
      creatureAnimationPreviewLoop: true,
      creatureAnimationPreviewLoopSource: "creatures-mode-selected-attack",
      auroraMdlSourceAnimationLoopMode: "loop"
    });
    expect(actionClip?.duration).toBeCloseTo(1.18, 3);
    expect(actionClip?.tracks.map((track) => track.name)).toEqual([
      "rshin_g.quaternion",
      "rshin_g.position"
    ]);
    const recoveredPositionTrack = actionClip?.tracks.find(
      (track) => track.name === "rshin_g.position"
    );
    expect(Array.from(recoveredPositionTrack?.times ?? []).map((time) => Number(time.toFixed(3)))).toEqual([
      0, 1, 1.18
    ]);
    expect(
      Array.from(recoveredPositionTrack?.values ?? []).map((value) =>
        Number(value.toFixed(3))
      )
    ).toEqual([
      0.25, 0.8, 0, 0.25, 2, 0, 0.25, 0.8, 0
    ]);
    expect(runtime.container.dataset.creatureAnimationMixerActionNames).toBe("bowshot");
    expect(runtime.container.dataset.creatureAnimationMixerLoopModes).toBe("loop");
    expect(runtime.container.dataset.creatureAnimationMixerSelectedClipNames).toBe("bowshot");
    expect(runtime.container.dataset.creatureAnimationMixerSelectedClipBasePoseNames).toBe(
      "bowrdy"
    );
    expect(runtime.container.dataset.creatureAnimationMixerCompositeBaseClipNames).toBe(
      "bowrdy"
    );
    expect(runtime.container.dataset.creatureAnimationMixerRecoveryPoseClipNames).toBe(
      "bowrdy"
    );
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("prefers richer duplicate bowshot clips from the direct supermodel chain", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "bowshot"
        }
      } as NonNullable<SceneObject["creatureProperties"]>
    } as SceneObject;
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      sourceModelCandidates: [
        {
          resref: "c_bearbrwn",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-bear-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-bear-glb.glb",
          supermodelResRef: "c_goblina",
          supermodelAssetId: "asset-partial-goblin-super-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-partial-goblin-super-glb.glb",
          supermodelChainResRefs: ["a_ba"],
          supermodelChainAssetIds: ["asset-a-ba-rich-glb"],
          supermodelChainGlbUrls: [
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-ba-rich-glb.glb"
          ]
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    const partialSupermodelCacheKey =
      "creature:cre_guard_captain:v1:supermodel:asset-partial-goblin-super-glb";
    const richSupermodelCacheKey =
      "creature:cre_guard_captain:v1:supermodel-chain:asset-a-ba-rich-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createDirectCreatureBowHierarchyCachedModelWithOwnIdle()
    );
    runtime.placeableModelCacheByUrl.set(
      partialSupermodelCacheKey,
      createCachedBowShotSupermodelAnimationModel()
    );
    runtime.placeableModelCacheByUrl.set(
      richSupermodelCacheKey,
      createCachedRicherBowShotSupermodelAnimationModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const playback = runtime.objectAnimationMixersById.get(creature.id);
    const actionClip = playback?.actions[0]?.getClip();
    const trackNames = actionClip?.tracks.map((track) => track.name) ?? [];

    expect(trackNames).toEqual(
      expect.arrayContaining([
        "rshin_g.position",
        "rshin_g.quaternion",
        "torso_g.position"
      ])
    );
    expect(trackNames).toHaveLength(3);
    expect(actionClip?.userData).toMatchObject({
      creatureAnimationCompositeBasePoseSkippedReason: "base-tracks-already-covered",
      creatureAnimationCompositeBaseTrackCount: 0,
      creatureAnimationCompositeRequestedTrackCount: 3,
      creatureAnimationRecoveryPose: true,
      creatureAnimationRecoveryPoseClipName: "bowrdy",
      creatureAnimationRecoveryPoseTrackCount: 3
    });
    expect(runtime.container.dataset.creatureAnimationMixerSelectedClipBasePoseSkippedReasons).toBe(
      "base-tracks-already-covered"
    );
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("composes xbowshot with the crossbow ready base pose when the attack clip is partial", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "xbowshot"
        }
      } as NonNullable<SceneObject["creatureProperties"]>
    } as SceneObject;
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      sourceModelCandidates: [
        {
          resref: "c_kobb",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-kobold-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-kobold-glb.glb",
          supermodelResRef: "a_ba",
          supermodelAssetId: "asset-a-ba-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-ba-glb.glb"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-kobold-glb";
    const supermodelCacheKey = "creature:cre_guard_captain:v1:supermodel:asset-a-ba-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createDirectCreatureSourceHierarchyCachedModelWithOwnIdle()
    );
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedCrossbowShotSupermodelAnimationModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const playback = runtime.objectAnimationMixersById.get(creature.id);
    const actionClip = playback?.actions[0]?.getClip();
    const root = runtime.objectMeshById.get(creature.id);

    expect(root?.userData).toMatchObject({
      creatureAnimationPlaybackActionNames: ["xbowshot"],
      creatureAnimationPlaybackLoopModes: ["loop"],
      creatureAnimationSelectedClipNames: ["xbowshot"],
      creatureAnimationSelectedClipBasePoseNames: ["xbowrdy"],
      creatureAnimationRequestedClipName: "xbowshot",
      creatureAnimationRequestedClipMatched: true,
      creatureAnimationSelectionMode: "explicit-name"
    });
    expect(playback?.actionNames).toEqual(["xbowshot"]);
    expect(actionClip?.userData).toMatchObject({
      creatureAnimationCompositeBasePose: true,
      creatureAnimationCompositeBaseClipName: "xbowrdy",
      creatureAnimationCompositeBaseTrackCount: 1,
      creatureAnimationCompositeRequestedTrackCount: 1,
      creatureAnimationRecoveryPose: true,
      creatureAnimationRecoveryPoseClipName: "xbowrdy",
      creatureAnimationRecoveryPoseTrackCount: 1,
      creatureAnimationPreviewLoop: true,
      creatureAnimationPreviewLoopSource: "creatures-mode-selected-attack",
      auroraMdlSourceAnimationLoopMode: "loop"
    });
    expect(actionClip?.duration).toBeCloseTo(1.18, 3);
    expect(runtime.container.dataset.creatureAnimationMixerActionNames).toBe("xbowshot");
    expect(runtime.container.dataset.creatureAnimationMixerLoopModes).toBe("loop");
    expect(runtime.container.dataset.creatureAnimationMixerSelectedClipNames).toBe(
      "xbowshot"
    );
    expect(runtime.container.dataset.creatureAnimationMixerSelectedClipBasePoseNames).toBe(
      "xbowrdy"
    );
    expect(runtime.container.dataset.creatureAnimationMixerCompositeBaseClipNames).toBe(
      "xbowrdy"
    );
    expect(runtime.container.dataset.creatureAnimationMixerRecoveryPoseClipNames).toBe(
      "xbowrdy"
    );
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("normalizes direct supermodel idle clip durations for animation playback", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      sourceModelCandidates: [
        {
          resref: "c_kobold001",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-kobold-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-kobold-glb.glb",
          supermodelResRef: "a_ba",
          supermodelAssetId: "asset-a-ba-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-ba-glb.glb"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-kobold-glb";
    const supermodelCacheKey = "creature:cre_guard_captain:v1:supermodel:asset-a-ba-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createDirectCreatureSourceHierarchyCachedModel()
    );
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedNonFiniteIdleSupermodelAnimationModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureRenderDirectSupermodelLoadStatus: "loaded",
      creatureRenderDirectSupermodelResRef: "a_ba",
      creatureRenderDirectSupermodelClipNames: ["super_walk", "pause1"],
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackMode: "three-animation-mixer",
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["pause1"],
      creatureAnimationAvailableClipNames: ["super_walk", "pause1"],
      creatureAnimationSelectedClipNames: ["pause1"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.actionNames).toEqual([
      "pause1"
    ]);
    expect(runtime.container.dataset.creatureAnimationMixerActionNames).toBe("pause1");
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("plays rebased source clips on segmented humanoid direct creature models", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Orc A",
        modelType: "F",
        raceModel: "c_orca"
      },
      sourceModelCandidates: [
        {
          resref: "c_orca",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-bear-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-bear-glb.glb"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createSegmentedHumanoidSourceAnimatedCachedModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureRenderLoadedModelSourceModel: "c_orca",
      creatureRenderLoadedModelSourceAnimationClipCount: 1,
      creatureRenderLoadedModelSourceHierarchyRebasedGeometryNodeNames: ["torso_g"],
      creatureDirectAutoAnimationSafetyStatus: "playable-rebased-segmented-creature",
      creatureDirectAutoAnimationSafetyReason: "segmented-humanoid-own-source-clips",
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackMode: "three-animation-mixer",
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["pause1"],
      creatureAnimationAvailableClipCount: 1,
      creatureAnimationSelectedClipNames: ["pause1"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.actionNames).toEqual([
      "pause1"
    ]);
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoSafetyStatuses).toBe(
      "playable-rebased-segmented-creature"
    );
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("suppresses animation tracks whose target nodes are missing from the playback root", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Orc A",
        modelType: "F",
        raceModel: "c_orca"
      },
      sourceModelCandidates: [
        {
          resref: "c_orca",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-bear-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-bear-glb.glb"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createSegmentedHumanoidSourceAnimatedCachedModelWithMissingTargets()
    );

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      rebuildObjectMeshes(
        runtime,
        [creature],
        [],
        createDebugState(),
        4,
        4,
        1,
        true,
        10,
        [],
        false,
        null,
        {
          [creature.id]: payload
        }
      );
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const root = runtime.objectMeshById.get(creature.id);
      expect(root?.userData).toMatchObject({
        creatureAnimationPlaybackStatus: "playing",
        creatureAnimationPlaybackActionNames: ["pause1"],
        creatureAnimationSuppressedMissingTargetTrackCount: 1,
        creatureAnimationSuppressedMissingTargetTrackNames: [
          "Gargoyle_RwingfingerA.quaternion"
        ]
      });
      expect(runtime.container.dataset.creatureAnimationMixerPlaybackStatuses).toBe(
        "playing"
      );
      expect(
        runtime.container.dataset.creatureAnimationMixerSuppressedMissingTargetTrackCounts
      ).toBe("1");
      expect(
        runtime.container.dataset.creatureAnimationMixerSuppressedMissingTargetTrackNames
      ).toBe("Gargoyle_RwingfingerA.quaternion");
      expect(
        consoleWarnSpy.mock.calls.some(([message]) =>
          String(message).includes("No target node found")
        )
      ).toBe(false);
      expect(
        consoleErrorSpy.mock.calls.some(([message]) =>
          String(message).includes("No target node found")
        )
      ).toBe(false);
      expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
    } finally {
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    }
  });

  it("plays own source clips on full direct creature models with rebased geometry", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Badger",
        modelType: "S",
        raceModel: "c_badger"
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createSegmentedHumanoidSourceAnimatedCachedModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureRenderLoadedModelSourceAnimationClipCount: 1,
      creatureRenderLoadedModelSourceHierarchyRebasedGeometryNodeNames: ["torso_g"],
      creatureDirectAutoAnimationSafetyStatus: "playable-rebased-direct-source-clips",
      creatureDirectAutoAnimationSafetyReason: "direct-creature-own-source-clips",
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackMode: "three-animation-mixer",
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["pause1"],
      creatureAnimationSelectedClipNames: ["pause1"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.actionNames).toEqual([
      "pause1"
    ]);
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoSafetyStatuses).toBe(
      "playable-rebased-direct-source-clips"
    );
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("plays selected own source clips on full direct creature models", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "pause1"
        }
      }
    };
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Badger",
        modelType: "S",
        raceModel: "c_badger"
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createSegmentedHumanoidSourceAnimatedCachedModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const torso = root?.getObjectByName("torso_g");
    const initialPositionY = torso?.position.y ?? 0;
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);

    expect(root?.userData).toMatchObject({
      creatureRenderLoadedModelSourceAnimationClipCount: 1,
      creatureRenderLoadedModelSourceHierarchyRebasedGeometryNodeNames: ["torso_g"],
      creatureDirectAutoAnimationSafetyStatus: "playable-rebased-direct-source-clips",
      creatureDirectAutoAnimationSafetyReason: "direct-creature-own-source-clips",
      creatureAnimationRequestedClipName: "pause1",
      creatureAnimationRequestedClipMatched: true,
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackMode: "three-animation-mixer",
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["pause1"],
      creatureAnimationSelectedClipNames: ["pause1"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.autoplay).toBe(true);
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoSafetyStatuses).toBe(
      "playable-rebased-direct-source-clips"
    );
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackStatuses).toBe("playing");
    expect(torso?.position.y).toBeGreaterThan(initialPositionY);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("plays selected simple direct source clips when skin meshes have no unsafe animation tracks", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "ca1slashl"
        }
      }
    };
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Simple Skin",
        modelType: "S",
        raceModel: "c_simple_skin"
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createSimpleSourceSkinnedOwnClipCachedModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const wing = root?.getObjectByName("wing_dummy");
    const initialPositionY = wing?.position.y ?? 0;
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.5);

    expect(root?.userData).toMatchObject({
      creatureRenderLoadedModelSourceAnimationClipCount: 1,
      creatureRenderLoadedModelSourceSkinMeshCount: 1,
      creatureRenderLoadedModelSourceHierarchyRebasedGeometryNodeNames: ["torso_skin"],
      creatureDirectAutoAnimationSafetyStatus: "playable",
      creatureAnimationRequestedClipName: "ca1slashl",
      creatureAnimationRequestedClipMatched: true,
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackMode: "three-animation-mixer",
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["ca1slashl"],
      creatureAnimationPlaybackLoopModes: ["loop"],
      creatureAnimationPlaybackRecoveryPoseCandidateNames: ["creadyl"],
      creatureAnimationPlaybackRecoveryPoseFallbacks: ["last-frame-hold"],
      creatureAnimationPlaybackRecoveryPoseFallbackReasons: [
        "missing-recovery-pose-clip"
      ],
      creatureAnimationSelectedClipNames: ["ca1slashl"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.autoplay).toBe(true);
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoSafetyStatuses).toBe(
      "playable"
    );
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackStatuses).toBe("playing");
    expect(runtime.container.dataset.creatureAnimationMixerLoopModes).toBe("loop");
    expect(
      runtime.container.dataset.creatureAnimationMixerRecoveryPoseCandidateNames
    ).toBe("creadyl");
    expect(runtime.container.dataset.creatureAnimationMixerRecoveryPoseFallbacks).toBe(
      "last-frame-hold"
    );
    expect(wing?.position.y).toBeGreaterThan(initialPositionY);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("plays selected source-skin clips when the clip targets an influencing bone", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "ca1slashl"
        }
      }
    };
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Bone Skin",
        modelType: "S",
        raceModel: "c_bone_skin"
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createBoneDrivenSourceSkinnedOwnClipCachedModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const skinMesh = root?.getObjectByName("torso_skin") as THREE.Mesh | undefined;
    const initialPositionY = skinMesh?.geometry.getAttribute("position")?.getY(0);
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.5);
    const animatedPosition = skinMesh?.geometry.getAttribute("position");

    expect(root?.userData).toMatchObject({
      creatureRenderLoadedModelSourceAnimationClipCount: 1,
      creatureRenderLoadedModelSourceSkinMeshCount: 1,
      creatureRenderLoadedModelSourceSkinInfluencingBoneNames: ["skin_bone"],
      creatureDirectAutoAnimationSourceSkinMeshCount: 1,
      creatureDirectAutoAnimationSourceSkinBoneTrackCount: 1,
      creatureDirectAutoAnimationCanPlaySourceSkinning: true,
      creatureDirectAutoAnimationCanPlayDirectSource: false,
      creatureDirectAutoAnimationSafetyStatus: "playable-rebased-source-skinning",
      creatureDirectAutoAnimationSafetyReason: "source-skinned-hidden-driver-clips",
      creatureAnimationRequestedClipName: "ca1slashl",
      creatureAnimationRequestedClipMatched: true,
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackMode: "three-animation-mixer",
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["ca1slashl"],
      creatureAnimationSelectedClipNames: ["ca1slashl"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.autoplay).toBe(true);
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoSafetyStatuses).toBe(
      "playable-rebased-source-skinning"
    );
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags).toContain(
      "sourceSkinBoneTracks=1"
    );
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags).toContain(
      "sourceSkinning=true"
    );
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags).toContain(
      "directSource=false"
    );
    expect(animatedPosition?.getY(0)).toBeGreaterThan(initialPositionY ?? -Infinity);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("plays own source clips that animate source-skin bones and direct rebased geometry", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "cpause1"
        }
      }
    };
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Dragon Chr: Black",
        modelType: "S",
        raceModel: "c_drgblack"
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createHybridOwnSourceSkinnedDirectClipCachedModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const skinMesh = root?.getObjectByName("Dragon_skin") as THREE.Mesh | undefined;
    const chest = root?.getObjectByName("Dragon_chest");
    const initialSkinPositionY = skinMesh?.geometry.getAttribute("position")?.getY(0);
    const initialChestPositionY = chest?.position.y ?? 0;
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.5);
    const animatedSkinPosition = skinMesh?.geometry.getAttribute("position");

    expect(root?.userData).toMatchObject({
      creatureRenderLoadedModelSourceSkinMeshCount: 1,
      creatureRenderLoadedModelSourceSkinInfluencingBoneNames: ["skin_bone"],
      creatureRenderLoadedModelSourceHierarchyRebasedGeometryNodeNames: [
        "Dragon_chest",
        "Dragon_claw"
      ],
      creatureDirectAutoAnimationSourceSkinBoneTrackCount: 1,
      creatureDirectAutoAnimationCanPlaySourceSkinning: true,
      creatureDirectAutoAnimationCanPlayHybridSourceSkinning: true,
      creatureDirectAutoAnimationCanPlayDirectSource: false,
      creatureDirectAutoAnimationSafetyStatus: "playable-rebased-source-skinning",
      creatureDirectAutoAnimationSafetyReason:
        "source-skinned-own-source-geometry-clips",
      creatureAnimationRequestedClipName: "cpause1",
      creatureAnimationRequestedClipMatched: true,
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackMode: "three-animation-mixer",
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["cpause1"],
      creatureAnimationSelectedClipNames: ["cpause1"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.autoplay).toBe(true);
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoSafetyStatuses).toBe(
      "playable-rebased-source-skinning"
    );
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags).toContain(
      "sourceSkinning=true"
    );
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags).toContain(
      "directSource=false"
    );
    expect(animatedSkinPosition?.getY(0)).toBeGreaterThan(
      initialSkinPositionY ?? -Infinity
    );
    expect(chest?.position.y).toBeGreaterThan(initialChestPositionY);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("plays rebased hidden-driver source clips through source skinning", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Bird: Chicken",
        modelType: "S",
        raceModel: "c_a_chicken"
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createSourceSkinnedHiddenDriverCachedModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const chicken = root?.getObjectByName("chicken") as THREE.Mesh | undefined;
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    const animatedPosition = chicken?.geometry.getAttribute("position");

    expect(root?.userData).toMatchObject({
      creatureRenderLoadedModelSourceModel: "c_a_chicken",
      creatureRenderLoadedModelSourceSkinMeshCount: 1,
      creatureRenderLoadedModelSourceSkinInfluencingBoneNames: ["body_bone"],
      creatureRenderLoadedModelSourceHierarchyRebasedGeometryNodeNames: ["body_bone"],
      creatureRenderLoadedModelRenderSuppressedMeshNames: ["body_bone"],
      creatureDirectAutoAnimationSafetyStatus: "playable-rebased-source-skinning",
      creatureDirectAutoAnimationSafetyReason: "source-skinned-hidden-driver-clips",
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackMode: "three-animation-mixer",
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["ccwalkf"],
      creatureAnimationAvailableClipCount: 1,
      creatureAnimationSelectedClipNames: ["ccwalkf"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.actionNames).toEqual([
      "ccwalkf"
    ]);
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoSafetyStatuses).toBe(
      "playable-rebased-source-skinning"
    );
    expect(runtime.container.dataset.creatureAnimationMixerRootMotionNeutralized).toBe(
      "true"
    );
    expect(runtime.container.dataset.creatureAnimationMixerRootMotionNeutralizedNodeNames).toBe(
      "body_bone"
    );
    expect(animatedPosition?.getX(0)).toBe(0);
    expect(animatedPosition?.getY(0)).toBeGreaterThan(0);
    expect(animatedPosition?.getZ(0)).toBe(0);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("neutralizes dynamic source-skin root motion without hidden-driver metadata", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "ccwalkf"
        }
      }
    };
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Bat, Giant",
        modelType: "S",
        raceModel: "c2_batgia_una_01"
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createSourceSkinnedVisibleRootMotionCachedModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const skinMesh = root?.getObjectByName("chicken") as THREE.Mesh | undefined;
    const initialPositionY = skinMesh?.geometry.getAttribute("position")?.getY(0);
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    const animatedPosition = skinMesh?.geometry.getAttribute("position");

    expect(root?.userData).toMatchObject({
      creatureRenderLoadedModelSourceSkinMeshCount: 1,
      creatureRenderLoadedModelSourceSkinInfluencingBoneNames: ["body_bone"],
      creatureDirectAutoAnimationSafetyStatus: "playable-rebased-source-skinning",
      creatureDirectAutoAnimationSafetyReason: "source-skinned-hidden-driver-clips",
      creatureDirectAutoAnimationRootMotionNeutralized: true,
      creatureDirectAutoAnimationRootMotionNeutralizedNodeNames: ["body_bone"],
      creatureDirectAutoAnimationRootMotionNeutralizedMode: "source-skinning-xz-anchor",
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackActionNames: ["ccwalkf"]
    });
    expect(runtime.container.dataset.creatureAnimationMixerRootMotionNeutralized).toBe(
      "true"
    );
    expect(runtime.container.dataset.creatureAnimationMixerRootMotionNeutralizedNodeNames).toBe(
      "body_bone"
    );
    expect(animatedPosition?.getX(0)).toBe(0);
    expect(animatedPosition?.getY(0)).toBeGreaterThan(initialPositionY ?? -Infinity);
    expect(animatedPosition?.getZ(0)).toBe(0);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("plays explicit retargeted supermodel clips through source skinning", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "super_walk"
        }
      }
    };
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Bird: Chicken",
        modelType: "S",
        raceModel: "c_a_chicken"
      },
      sourceModelCandidates: [
        {
          resref: "c_a_chicken",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-bear-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-bear-glb.glb",
          supermodelResRef: "a_fa",
          supermodelAssetId: "asset-a-fa-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-fa-glb.glb"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    const supermodelCacheKey = "creature:cre_guard_captain:v1:supermodel:asset-a-fa-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createSourceSkinnedHiddenDriverCachedModel()
    );
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedHiddenDriverSupermodelAnimationModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const chicken = root?.getObjectByName("chicken") as THREE.Mesh | undefined;
    const initialPosition = chicken?.geometry.getAttribute("position")?.getY(0);
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    const animatedPosition = chicken?.geometry.getAttribute("position")?.getY(0);

    expect(root?.userData).toMatchObject({
      creatureRenderDirectSupermodelClipNames: ["super_walk"],
      creatureDirectAutoAnimationSafetyStatus: "playable-rebased-source-skinning",
      creatureDirectAutoAnimationSafetyReason: "source-skinned-hidden-driver-clips",
      creatureDirectAutoAnimationRootMotionNeutralized: true,
      creatureDirectAutoAnimationRootMotionNeutralizedNodeNames: ["body_bone"],
      creatureDirectAutoAnimationRootMotionNeutralizedMode: "source-skinning-xz-anchor",
      creatureDirectAutoAnimationRetargetedSupermodelClip: true,
      creatureAnimationRequestedClipName: "super_walk",
      creatureAnimationRequestedClipMatched: true,
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackInitialPoseApplied: true,
      creatureAnimationPlaybackActionNames: ["super_walk"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.autoplay).toBe(true);
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackStatuses).toBe("playing");
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoSafetyStatuses).toBe(
      "playable-rebased-source-skinning"
    );
    expect(runtime.container.dataset.creatureAnimationMixerRootMotionNeutralized).toBe(
      "true"
    );
    expect(runtime.container.dataset.creatureAnimationMixerRootMotionNeutralizedNodeNames).toBe(
      "body_bone"
    );
    expect(animatedPosition).toBeGreaterThan(initialPosition ?? -Infinity);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("plays retargeted source-skinned supermodel clips with companion geometry when hidden drivers are suppressed", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "super_walk"
        }
      }
    };
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Source-skinned companion",
        modelType: "S",
        raceModel: "c_a_chicken"
      },
      sourceModelCandidates: [
        {
          resref: "c_a_chicken",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-bear-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-bear-glb.glb",
          supermodelResRef: "a_fa",
          supermodelAssetId: "asset-a-fa-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-fa-glb.glb"
        }
      ],
      partModelCandidates: [
        {
          slot: "tail",
          partId: 1,
          partModelName: "tail",
          nodeName: "tail_g",
          modelResRef: "tail_model",
          assetId: "asset-tail-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-tail-glb.glb",
          source: "tailmodel.2da"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    const supermodelCacheKey = "creature:cre_guard_captain:v1:supermodel:asset-a-fa-glb";
    const companionCacheKey = "creature:cre_guard_captain:v1:part:tail:asset-tail-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createSourceSkinnedHiddenDriverCachedModel()
    );
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedHiddenDriverSupermodelAnimationModel()
    );
    runtime.placeableModelCacheByUrl.set(companionCacheKey, createCachedModel(1));

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const chicken = root?.getObjectByName("chicken") as THREE.Mesh | undefined;
    const initialPosition = chicken?.geometry.getAttribute("position")?.getY(0);
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    const animatedPosition = chicken?.geometry.getAttribute("position")?.getY(0);

    expect(root?.userData).toMatchObject({
      creatureDirectAutoAnimationCanPlaySourceSkinningCompanion: true,
      creatureDirectAutoAnimationSafetyStatus: "playable-rebased-source-skinning",
      creatureDirectAutoAnimationSafetyReason: "source-skinned-hidden-driver-clips",
      creatureDirectAutoAnimationRetargetedSupermodelClip: true,
      creatureAnimationRequestedClipName: "super_walk",
      creatureAnimationRequestedClipMatched: true,
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackInitialPoseApplied: true,
      creatureAnimationPlaybackActionNames: ["super_walk"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.autoplay).toBe(true);
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackStatuses).toBe("playing");
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoSafetyReasons).toBe(
      "source-skinned-hidden-driver-clips"
    );
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags).toContain(
      "sourceSkinningCompanion=true"
    );
    expect(animatedPosition).toBeGreaterThan(initialPosition ?? -Infinity);
  });

  it("plays retargeted source-skinned supermodel clips when companion geometry is visible body-part geometry", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "super_walk"
        }
      }
    };
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Source-skinned attachment anchors",
        modelType: "S",
        raceModel: "c_anchor_skin"
      },
      sourceModelCandidates: [
        {
          resref: "c_anchor_skin",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-anchor-skin-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-anchor-skin-glb.glb",
          supermodelResRef: "a_fa",
          supermodelAssetId: "asset-a-fa-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-fa-glb.glb"
        }
      ],
      partModelCandidates: [
        {
          slot: "head",
          partId: 1,
          partModelName: "helmet",
          nodeName: "head_g",
          modelResRef: "helmet_model",
          assetId: "asset-helmet-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-helmet-glb.glb",
          source: "parts_head.2da"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-anchor-skin-glb";
    const supermodelCacheKey = "creature:cre_guard_captain:v1:supermodel:asset-a-fa-glb";
    const companionCacheKey = "creature:cre_guard_captain:v1:part:head:asset-helmet-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createSourceSkinnedAttachmentAnchorCachedModel()
    );
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedAttachmentAnchorSupermodelAnimationModel()
    );
    runtime.placeableModelCacheByUrl.set(companionCacheKey, createCachedModel(1));

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const bodySkin = root?.getObjectByName("body_skin") as THREE.Mesh | undefined;
    const initialPosition = bodySkin?.geometry.getAttribute("position")?.getY(0);
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    const animatedPosition = bodySkin?.geometry.getAttribute("position")?.getY(0);

    expect(root?.userData).toMatchObject({
      creatureRenderLoadedModelSourceSkinMeshCount: 1,
      creatureRenderLoadedModelSourceHierarchyRebasedGeometryNodeNames: [
        "lhand_g",
        "rhand_g",
        "head_g"
      ],
      creatureDirectAutoAnimationCanPlaySourceSkinningCompanion: true,
      creatureDirectAutoAnimationSourceSkinMeshTrackCount: 0,
      creatureDirectAutoAnimationRenderableRebasedGeometryTrackCount: 3,
      creatureDirectAutoAnimationSafetyStatus: "playable-rebased-source-skinning",
      creatureDirectAutoAnimationSafetyReason:
        "source-skinned-visible-body-part-clips",
      creatureDirectAutoAnimationRetargetedSupermodelClip: true,
      creatureAnimationRequestedClipName: "super_walk",
      creatureAnimationRequestedClipMatched: true,
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackInitialPoseApplied: true,
      creatureAnimationPlaybackActionNames: ["super_walk"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.autoplay).toBe(true);
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackStatuses).toBe("playing");
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoSafetyReasons).toBe(
      "source-skinned-visible-body-part-clips"
    );
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags).toContain(
      "sourceSkinningCompanion=true"
    );
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags).toContain(
      "sourceSkinMeshTracks=0"
    );
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags).toContain(
      "renderableRebasedGeometryTracks=3"
    );
    expect(animatedPosition).toBeGreaterThan(initialPosition ?? -Infinity);
  });

  it("guards source-skinned fallback clips when tracks target visible baked geometry without source hierarchy", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "super_walk"
        }
      }
    };
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Source-skinned preserved human",
        modelType: "F",
        raceModel: "c_anchor_skin"
      },
      sourceModelCandidates: [
        {
          resref: "c_anchor_skin",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-anchor-skin-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-anchor-skin-glb.glb",
          supermodelResRef: "a_fa",
          supermodelAssetId: "asset-a-fa-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-fa-glb.glb"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-anchor-skin-glb";
    const supermodelCacheKey = "creature:cre_guard_captain:v1:supermodel:asset-a-fa-glb";
    const model = createSourceSkinnedAttachmentAnchorCachedModel();
    model.userData = {
      ...model.userData,
      auroraMdlSourceHierarchyRebasedGeometryCount: 0,
      auroraMdlSourceHierarchyRebasedGeometryNodeNames: []
    };
    runtime.placeableModelCacheByUrl.set(modelCacheKey, model);
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedAttachmentAnchorSupermodelAnimationModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const bodySkin = root?.getObjectByName("body_skin") as THREE.Mesh | undefined;
    const initialPosition = bodySkin?.geometry.getAttribute("position")?.getY(0);
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    const animatedPosition = bodySkin?.geometry.getAttribute("position")?.getY(0);

    expect(root?.userData).toMatchObject({
      creatureRenderLoadedModelSourceSkinMeshCount: 1,
      creatureDirectAutoAnimationSourceSkinMeshTrackCount: 0,
      creatureDirectAutoAnimationSourceSkinBoneTrackCount: 4,
      creatureDirectAutoAnimationPreservedSourceSkinBoneTrackCount: 4,
      creatureDirectAutoAnimationSafetyStatus: "suppressed-source-hierarchy-rebase",
      creatureDirectAutoAnimationSafetyReason: "source-skinned-visible-baked-geometry",
      creatureDirectAutoAnimationSuppressedTrackNames: [
        "body_bone.position",
        "lhand_g.position",
        "rhand_g.position",
        "head_g.position"
      ],
      creatureAnimationPlaybackStatus: "paused",
      creatureAnimationPlaybackInitialPoseApplied: false,
      creatureAnimationPlaybackActionNames: ["super_walk"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.autoplay).toBe(false);
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackStatuses).toBe("paused");
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoSafetyReasons).toBe(
      "source-skinned-visible-baked-geometry"
    );
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags).toContain(
      "sourceSkinBoneTracks=4"
    );
    expect(animatedPosition).toBe(initialPosition);
  });

  it("plays source-skinned fallback clips when a preserved source hierarchy can drive the skin", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "super_walk"
        }
      }
    };
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Source-skinned preserved hierarchy",
        modelType: "S",
        raceModel: "c_anchor_skin"
      },
      sourceModelCandidates: [
        {
          resref: "c_anchor_skin",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-anchor-skin-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-anchor-skin-glb.glb",
          supermodelResRef: "a_fa",
          supermodelAssetId: "asset-a-fa-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-fa-glb.glb"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-anchor-skin-glb";
    const supermodelCacheKey = "creature:cre_guard_captain:v1:supermodel:asset-a-fa-glb";
    const model = createSourceSkinnedAttachmentAnchorCachedModel();
    model.userData = {
      ...model.userData,
      auroraMdlSourceHierarchyRebasedGeometryCount: 0,
      auroraMdlSourceHierarchyRebasedGeometryNodeNames: [],
      auroraMdlSourceHierarchyReparentedNodeCount: 4
    };
    runtime.placeableModelCacheByUrl.set(modelCacheKey, model);
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedAttachmentAnchorSupermodelAnimationModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const bodySkin = root?.getObjectByName("body_skin") as THREE.Mesh | undefined;
    const initialPosition = bodySkin?.geometry.getAttribute("position")?.getY(0);
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    const animatedPosition = bodySkin?.geometry.getAttribute("position")?.getY(0);

    expect(root?.userData).toMatchObject({
      creatureRenderLoadedModelSourceSkinMeshCount: 1,
      creatureRenderLoadedModelSourceHierarchyReparentedNodeCount: 4,
      creatureDirectAutoAnimationCanPlaySourceSkinning: true,
      creatureDirectAutoAnimationSourceSkinMeshTrackCount: 0,
      creatureDirectAutoAnimationSourceSkinBoneTrackCount: 4,
      creatureDirectAutoAnimationPreservedSourceSkinBoneTrackCount: 0,
      creatureDirectAutoAnimationSafetyStatus: "playable-rebased-source-skinning",
      creatureDirectAutoAnimationSafetyReason:
        "source-skinned-preserved-source-hierarchy-clips",
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackInitialPoseApplied: true,
      creatureAnimationPlaybackActionNames: ["super_walk"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.autoplay).toBe(true);
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackStatuses).toBe("playing");
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags).toContain(
      "sourceHierarchyReparented=4"
    );
    expect(animatedPosition).toBeGreaterThan(initialPosition ?? -Infinity);
  });

  it("plays source-skinned companion clips when preserved hierarchy tracks do not target visible geometry", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "super_walk"
        }
      }
    };
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Source-skinned preserved companion",
        modelType: "F",
        raceModel: "c_jester"
      },
      sourceModelCandidates: [
        {
          resref: "c_jester",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-jester-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-jester-glb.glb",
          supermodelResRef: "a_fa",
          supermodelAssetId: "asset-a-fa-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-fa-glb.glb"
        }
      ],
      partModelCandidates: [
        {
          slot: "head",
          partId: 1,
          partModelName: "helmet",
          nodeName: "head_g",
          modelResRef: "helmet_model",
          assetId: "asset-helmet-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-helmet-glb.glb",
          source: "parts_head.2da"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-jester-glb";
    const supermodelCacheKey = "creature:cre_guard_captain:v1:supermodel:asset-a-fa-glb";
    const companionCacheKey = "creature:cre_guard_captain:v1:part:head:asset-helmet-glb";
    const model = createSourceSkinnedAttachmentAnchorCachedModel();
    model.userData = {
      ...model.userData,
      auroraMdlSourceModel: "c_jester",
      auroraMdlSourceHierarchyRebasedGeometryCount: 2,
      auroraMdlSourceHierarchyRebasedGeometryNodeNames: ["torso_g", "decor_g"],
      auroraMdlSourceHierarchyReparentedNodeCount: 4
    };
    runtime.placeableModelCacheByUrl.set(modelCacheKey, model);
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedHiddenDriverSupermodelAnimationModel()
    );
    runtime.placeableModelCacheByUrl.set(companionCacheKey, createCachedModel(1));

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const bodySkin = root?.getObjectByName("body_skin") as THREE.Mesh | undefined;
    const initialPosition = bodySkin?.geometry.getAttribute("position")?.getY(0);
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    const animatedPosition = bodySkin?.geometry.getAttribute("position")?.getY(0);

    expect(root?.userData).toMatchObject({
      creatureRenderLoadedModelSourceSkinMeshCount: 1,
      creatureRenderLoadedModelSourceHierarchyRebasedGeometryNodeNames: [
        "torso_g",
        "decor_g"
      ],
      creatureRenderLoadedModelSourceHierarchyReparentedNodeCount: 4,
      creatureDirectAutoAnimationHasCompanionGeometry: true,
      creatureDirectAutoAnimationCanPlaySourceSkinning: true,
      creatureDirectAutoAnimationCanPlaySourceSkinningCompanion: true,
      creatureDirectAutoAnimationSourceSkinBoneTrackCount: 1,
      creatureDirectAutoAnimationRenderableRebasedGeometryTrackCount: 0,
      creatureDirectAutoAnimationSafetyStatus: "playable-rebased-source-skinning",
      creatureDirectAutoAnimationSafetyReason:
        "source-skinned-preserved-source-hierarchy-clips",
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackActionNames: ["super_walk"]
    });
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackStatuses).toBe("playing");
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags).toContain(
      "sourceSkinningCompanion=true"
    );
    expect(animatedPosition).toBeGreaterThan(initialPosition ?? -Infinity);
  });

  it("guards retargeted source-skinned companion clips when rebased drivers are not render-suppressed", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "super_walk"
        }
      }
    };
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Source-skinned companion",
        modelType: "S",
        raceModel: "c_a_chicken"
      },
      sourceModelCandidates: [
        {
          resref: "c_a_chicken",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-bear-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-bear-glb.glb",
          supermodelResRef: "a_fa",
          supermodelAssetId: "asset-a-fa-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-fa-glb.glb"
        }
      ],
      partModelCandidates: [
        {
          slot: "tail",
          partId: 1,
          partModelName: "tail",
          nodeName: "tail_g",
          modelResRef: "tail_model",
          assetId: "asset-tail-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-tail-glb.glb",
          source: "tailmodel.2da"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    const supermodelCacheKey = "creature:cre_guard_captain:v1:supermodel:asset-a-fa-glb";
    const companionCacheKey = "creature:cre_guard_captain:v1:part:tail:asset-tail-glb";
    const model = createSourceSkinnedHiddenDriverCachedModel();
    model.userData = {
      ...model.userData,
      auroraMdlRenderSuppressedMeshCount: 0,
      auroraMdlRenderSuppressedMeshNames: []
    };
    runtime.placeableModelCacheByUrl.set(modelCacheKey, model);
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedHiddenDriverSupermodelAnimationModel()
    );
    runtime.placeableModelCacheByUrl.set(companionCacheKey, createCachedModel(1));

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const chicken = root?.getObjectByName("chicken") as THREE.Mesh | undefined;
    const initialPosition = chicken?.geometry.getAttribute("position")?.getY(0);
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    const animatedPosition = chicken?.geometry.getAttribute("position")?.getY(0);

    expect(root?.userData).toMatchObject({
      creatureDirectAutoAnimationCanPlaySourceSkinningCompanion: false,
      creatureDirectAutoAnimationSafetyStatus: "suppressed-source-hierarchy-rebase",
      creatureDirectAutoAnimationSafetyReason:
        "source-skinned-retargeted-companion-geometry",
      creatureDirectAutoAnimationRetargetedSupermodelClip: true,
      creatureAnimationRequestedClipName: "super_walk",
      creatureAnimationRequestedClipMatched: true,
      creatureAnimationPlaybackStatus: "paused",
      creatureAnimationPlaybackInitialPoseApplied: false,
      creatureAnimationPlaybackActionNames: ["super_walk"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.autoplay).toBe(false);
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackStatuses).toBe("paused");
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags).toContain(
      "sourceSkinningCompanion=false"
    );
    expect(animatedPosition).toBe(initialPosition);
  });

  it("guards explicit retargeted supermodel clips on rebased direct creatures without proxy retargeting", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "super_walk"
        }
      }
    };
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Karandas",
        modelType: "FT",
        raceModel: "c_karandas"
      },
      sourceModelCandidates: [
        {
          resref: "c_karandas",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-karandas-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-karandas-glb.glb",
          supermodelResRef: "a_ba_non_combat",
          supermodelAssetId: "asset-a-ba-non-combat-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-ba-non-combat-glb.glb"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-karandas-glb";
    const supermodelCacheKey =
      "creature:cre_guard_captain:v1:supermodel:asset-a-ba-non-combat-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createSegmentedHumanoidSourceAnimatedCachedModel()
    );
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedTorsoIdleSupermodelAnimationModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const torso = root?.getObjectByName("torso_g");
    const initialPositionY = torso?.position.y;
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);

    expect(root?.userData).toMatchObject({
      creatureRenderDirectSupermodelClipNames: ["super_walk", "pause1"],
      creatureDirectAutoAnimationSafetyStatus: "suppressed-source-hierarchy-rebase",
      creatureDirectAutoAnimationSafetyReason: "source-hierarchy-rebased-geometry-explicit",
      creatureDirectAutoAnimationRetargetedSupermodelClip: true,
      creatureAnimationRequestedClipName: "super_walk",
      creatureAnimationRequestedClipMatched: true,
      creatureAnimationPlaybackStatus: "paused",
      creatureAnimationPlaybackInitialPoseApplied: false,
      creatureAnimationPlaybackActionNames: ["super_walk"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.autoplay).toBe(false);
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackStatuses).toBe("paused");
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoSafetyStatuses).toBe(
      "suppressed-source-hierarchy-rebase"
    );
    expect(torso?.position.y).toBe(initialPositionY);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("plays declared base supermodel clips on full direct creatures with rebased geometry", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "1hslashl"
        }
      }
    };
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Lizardfolk 1",
        modelType: "FT",
        raceModel: "c_oldwara"
      },
      sourceModelCandidates: [
        {
          resref: "c_oldwara",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-oldwara-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-oldwara-glb.glb",
          supermodelResRef: "a_ba",
          supermodelAssetId: "asset-a-ba-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-ba-glb.glb"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-oldwara-glb";
    const supermodelCacheKey = "creature:cre_guard_captain:v1:supermodel:asset-a-ba-glb";
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createDeclaredDirectCreatureCachedModel());
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedBaseCreatureSupermodelAnimationModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const torso = root?.getObjectByName("torso_g");
    const initialPositionY = torso?.position.y ?? 0;
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);

    expect(root?.userData).toMatchObject({
      creatureRenderLoadedModelSourceModel: "c_oldwara",
      creatureRenderLoadedModelSupermodel: "a_ba",
      creatureRenderLoadedModelSourceHierarchyRebasedGeometryNodeNames: ["torso_g"],
      creatureRenderDirectSupermodelResRef: "a_ba",
      creatureDirectAutoAnimationSafetyStatus:
        "playable-rebased-declared-supermodel-clips",
      creatureDirectAutoAnimationSafetyReason:
        "direct-creature-declared-supermodel-clips",
      creatureDirectAutoAnimationDeclaredDirectSupermodelMatches: true,
      creatureAnimationRequestedClipName: "1hslashl",
      creatureAnimationRequestedClipMatched: true,
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackMode: "three-animation-mixer",
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["1hslashl"],
      creatureAnimationSelectedClipNames: ["1hslashl"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.autoplay).toBe(true);
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags).toContain(
      "declaredSupermodel=true"
    );
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackStatuses).toBe("playing");
    expect(torso?.position.y).toBeGreaterThan(initialPositionY);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("guards retargeted supermodel clips on visible source-skin direct meshes without source-skinning", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "super_walk"
        }
      }
    };
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Visible Skin Retarget",
        modelType: "S",
        raceModel: "c_visible_skin"
      },
      sourceModelCandidates: [
        {
          resref: "c_visible_skin",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-visible-skin-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-visible-skin-glb.glb",
          supermodelResRef: "a_ba_non_combat",
          supermodelAssetId: "asset-a-ba-non-combat-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-ba-non-combat-glb.glb"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-visible-skin-glb";
    const supermodelCacheKey =
      "creature:cre_guard_captain:v1:supermodel:asset-a-ba-non-combat-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createVisibleSourceSkinRetargetCachedModel()
    );
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedTorsoIdleSupermodelAnimationModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const torso = root?.getObjectByName("torso_g");
    const initialPositionY = torso?.position.y;
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);

    expect(root?.userData).toMatchObject({
      creatureRenderLoadedModelSourceSkinMeshCount: 1,
      creatureRenderLoadedModelSourceHierarchyRebasedGeometryNodeNames: ["torso_g"],
      creatureDirectAutoAnimationSourceSkinMeshCount: 1,
      creatureDirectAutoAnimationRenderSuppressedMeshCount: 0,
      creatureDirectAutoAnimationSafetyStatus: "suppressed-source-hierarchy-rebase",
      creatureDirectAutoAnimationSafetyReason: "source-hierarchy-rebased-geometry-explicit",
      creatureDirectAutoAnimationRetargetedSupermodelClip: true,
      creatureAnimationRequestedClipName: "super_walk",
      creatureAnimationRequestedClipMatched: true,
      creatureAnimationPlaybackStatus: "paused",
      creatureAnimationPlaybackInitialPoseApplied: false,
      creatureAnimationPlaybackActionNames: ["super_walk"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.autoplay).toBe(false);
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackStatuses).toBe("paused");
    expect(torso?.position.y).toBe(initialPositionY);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("plays retargeted supermodel clips on hybrid source-skin direct meshes when skin meshes are not targeted", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "ca1slashl"
        }
      }
    };
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Hybrid Skin Retarget",
        modelType: "S",
        raceModel: "c_hybrid_skin"
      },
      sourceModelCandidates: [
        {
          resref: "c_hybrid_skin",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-hybrid-skin-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-hybrid-skin-glb.glb",
          supermodelResRef: "c_hybrid_super",
          supermodelAssetId: "asset-hybrid-super-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-hybrid-super-glb.glb"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    runtime.placeableModelCacheByUrl.set(
      "creature:cre_guard_captain:v1:derived:asset-hybrid-skin-glb",
      createHybridSourceSkinRetargetCachedModel()
    );
    runtime.placeableModelCacheByUrl.set(
      "creature:cre_guard_captain:v1:supermodel:asset-hybrid-super-glb",
      createCachedHybridRetargetSupermodelAnimationModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);

    expect(root?.userData).toMatchObject({
      creatureRenderLoadedModelSourceSkinMeshCount: 1,
      creatureRenderLoadedModelSourceSkinMeshNodeNames: ["bodymesh01"],
      creatureDirectAutoAnimationSourceSkinMeshCount: 1,
      creatureDirectAutoAnimationSourceSkinMeshTrackCount: 0,
      creatureDirectAutoAnimationSafetyStatus: "playable-rebased-direct-supermodel-clips",
      creatureDirectAutoAnimationSafetyReason: "direct-creature-supermodel-clips",
      creatureDirectAutoAnimationRetargetedSupermodelClip: true,
      creatureAnimationRequestedClipName: "ca1slashl",
      creatureAnimationRequestedClipMatched: true,
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackActionNames: ["ca1slashl"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.autoplay).toBe(true);
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackStatuses).toBe("playing");
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("plays retargeted supermodel fallback clips on hybrid direct meshes that also expose own source clips", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "ca1slashl"
        }
      }
    };
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Lizardman - Scavenger",
        modelType: "FT",
        raceModel: "c_lizardman01"
      },
      sourceModelCandidates: [
        {
          resref: "c_lizardman01",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-lizardman-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_lizardfolkscaven:v1/assets/asset-lizardman-glb.glb",
          supermodelResRef: "c_hybrid_super",
          supermodelAssetId: "asset-hybrid-super-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_lizardfolkscaven:v1/assets/asset-hybrid-super-glb.glb"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    runtime.placeableModelCacheByUrl.set(
      "creature:cre_guard_captain:v1:derived:asset-lizardman-glb",
      createHybridSourceSkinRetargetCachedModelWithOwnSourceClip()
    );
    runtime.placeableModelCacheByUrl.set(
      "creature:cre_guard_captain:v1:supermodel:asset-hybrid-super-glb",
      createCachedHybridRetargetSupermodelAnimationModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const torso = root?.getObjectByName("torso");
    const initialPositionY = torso?.position.y ?? 0;
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.5);

    expect(root?.userData).toMatchObject({
      creatureRenderLoadedModelSourceAnimationClipCount: 1,
      creatureRenderDirectSupermodelClipNames: ["ca1slashl"],
      creatureDirectAutoAnimationSourceSkinMeshCount: 1,
      creatureDirectAutoAnimationSourceSkinMeshTrackCount: 0,
      creatureDirectAutoAnimationCanPlayDirectSupermodel: true,
      creatureDirectAutoAnimationUsesOnlyRetargetedSupermodelClip: true,
      creatureDirectAutoAnimationCanUseRetargetedSupermodelWithOwnSourceClips: true,
      creatureDirectAutoAnimationSafetyStatus: "playable-rebased-direct-supermodel-clips",
      creatureDirectAutoAnimationSafetyReason: "direct-creature-supermodel-clips",
      creatureDirectAutoAnimationRetargetedSupermodelClip: true,
      creatureAnimationRequestedClipName: "ca1slashl",
      creatureAnimationRequestedClipMatched: true,
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackActionNames: ["ca1slashl"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.autoplay).toBe(true);
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoSafetyStatuses).toBe(
      "playable-rebased-direct-supermodel-clips"
    );
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags).toContain(
      "sourceSkinMeshTracks=0"
    );
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags).toContain(
      "direct=1"
    );
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags).toContain(
      "directSuper=true"
    );
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags).toContain(
      "superOnly=true"
    );
    expect(runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags).toContain(
      "ownSourceSuperFallback=true"
    );
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackStatuses).toBe("playing");
    expect(torso?.position.y).toBeGreaterThan(initialPositionY);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("plays explicit source-skinned hidden-driver clips through source skinning", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "ccwalkf"
        }
      }
    };
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Bird: Chicken",
        modelType: "S",
        raceModel: "c_a_chicken"
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createSourceSkinnedHiddenDriverCachedModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const chicken = root?.getObjectByName("chicken") as THREE.Mesh | undefined;
    const initialPositionY = chicken?.geometry.getAttribute("position")?.getY(0);
    updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    const animatedPosition = chicken?.geometry.getAttribute("position");

    expect(root?.userData).toMatchObject({
      creatureDirectAutoAnimationSafetyStatus: "playable-rebased-source-skinning",
      creatureDirectAutoAnimationSafetyReason: "source-skinned-hidden-driver-clips",
      creatureDirectAutoAnimationRootMotionNeutralized: true,
      creatureDirectAutoAnimationRootMotionNeutralizedNodeNames: ["body_bone"],
      creatureDirectAutoAnimationRootMotionNeutralizedMode: "source-skinning-xz-anchor",
      creatureAnimationRequestedClipName: "ccwalkf",
      creatureAnimationRequestedClipMatched: true,
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackInitialPoseApplied: true,
      creatureAnimationPlaybackActionNames: ["ccwalkf"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.autoplay).toBe(true);
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackStatuses).toBe("playing");
    expect(runtime.container.dataset.creatureAnimationMixerRootMotionNeutralized).toBe(
      "true"
    );
    expect(runtime.container.dataset.creatureAnimationMixerRootMotionNeutralizedNodeNames).toBe(
      "body_bone"
    );
    expect(animatedPosition?.getX(0)).toBe(0);
    expect(animatedPosition?.getY(0)).toBeGreaterThan(initialPositionY ?? -Infinity);
    expect(animatedPosition?.getZ(0)).toBe(0);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("keeps supermodel clips available but defaults segmented direct creatures to their own source clips", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        ...payload.renderPackage!.appearanceProfile,
        appearanceLabel: "Goblin A",
        modelType: "F",
        raceModel: "c_goblina"
      },
      sourceModelCandidates: [
        {
          resref: "c_goblina",
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "direct-model",
          assetId: "asset-goblin-glb",
          glbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-goblin-glb.glb",
          supermodelResRef: "a_ba_non_combat",
          supermodelAssetId: "asset-a-ba-non-combat-glb",
          supermodelGlbUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-ba-non-combat-glb.glb"
        }
      ]
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-goblin-glb";
    const supermodelCacheKey =
      "creature:cre_guard_captain:v1:supermodel:asset-a-ba-non-combat-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createSegmentedHumanoidEquipmentPauseCachedModel()
    );
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedTorsoIdleSupermodelAnimationModel()
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureRenderDirectSupermodelLoadStatus: "loaded",
      creatureRenderDirectSupermodelResRef: "a_ba_non_combat",
      creatureRenderDirectSupermodelClipNames: ["super_walk", "pause1"],
      creatureRenderLoadedModelSourceModel: "c_goblina",
      creatureDirectAutoAnimationSafetyStatus: "playable-rebased-segmented-creature",
      creatureDirectAutoAnimationSafetyReason: "segmented-humanoid-own-source-clips",
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackMode: "three-animation-mixer",
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["pausesh"],
      creatureAnimationAvailableClipCount: 3,
      creatureAnimationAvailableClipNames: ["pausesh", "super_walk", "pause1"],
      creatureAnimationSelectedClipNames: ["pausesh"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.actionNames).toEqual([
      "pausesh"
    ]);
    expect(runtime.container.dataset.creatureAnimationMixerActionNames).toBe("pausesh");
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("applies creature MTR texture slots to direct-model materials", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    const diffuseTexture = new THREE.Texture();
    const normalTexture = new THREE.Texture();
    payload.renderPackage = {
      ...payload.renderPackage!,
      assetRefs: {
        ...payload.renderPackage!.assetRefs,
        textureAssetIds: ["asset-panel-d", "asset-panel-n"],
        materialAssetIds: ["asset-mtr-panel"]
      },
      textureUrls: [
        "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/panel_d.dds",
        "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/panel_n.dds"
      ],
      textureBindings: [
        {
          reference: "panel_d",
          assetId: "asset-panel-d",
          fileName: "panel_d.dds",
          objectKey: "modules/current/textures/panel_d.dds",
          deliveryUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/panel_d.dds"
        },
        {
          reference: "panel_n",
          assetId: "asset-panel-n",
          fileName: "panel_n.dds",
          objectKey: "modules/current/textures/panel_n.dds",
          deliveryUrl:
            "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/panel_n.dds"
        }
      ],
      auroraMaterial: {
        source: "mtr",
        materials: [
          {
            source: "aurora-mtr",
            materialAssetId: "asset-mtr-panel",
            materialFileName: "mtr_panel.mtr",
            materialObjectKey: "modules/current/materials/mtr_panel.mtr",
            state: {
              textureSlots: [
                { slot: 0, role: "diffuse", reference: "panel_d" },
                { slot: 1, role: "normal", reference: "panel_n" }
              ]
            }
          }
        ],
        diagnostics: []
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    const textureUrlsByReference = resolveCreatureTextureDeliveryUrlsByReference(payload);
    const diffuseTextureUrl = textureUrlsByReference.get("panel_d");
    const normalTextureUrl = textureUrlsByReference.get("panel_n");
    expect(diffuseTextureUrl).toBeDefined();
    expect(normalTextureUrl).toBeDefined();
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createMtrTexturedCachedModel());
    runtime.placeableTextureCacheByUrl.set(diffuseTextureUrl!, diffuseTexture);
    runtime.placeableTextureCacheByUrl.set(normalTextureUrl!, normalTexture);

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    let root = runtime.objectMeshById.get(creature.id);
    let renderedMesh = root?.getObjectByName("mtr_creature_mesh") as THREE.Mesh;
    let material = renderedMesh?.material as THREE.MeshStandardMaterial | undefined;
    for (let attempt = 0; attempt < 10 && !material?.map; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      root = runtime.objectMeshById.get(creature.id);
      renderedMesh = root?.getObjectByName("mtr_creature_mesh") as THREE.Mesh;
      material = renderedMesh?.material as THREE.MeshStandardMaterial | undefined;
    }

    expect(material?.map).toBe(diffuseTexture);
    expect(material?.normalMap).toBe(normalTexture);
    expect(material?.userData).toMatchObject({
      auroraMaterialContractSource: "mtr_panel.mtr",
      auroraMaterialTextureSlotRoles: ["normal"],
      auroraMaterialTextureSlotReferences: ["panel_n"]
    });
    expect(root?.userData).toMatchObject({
      creatureRenderTextureBindingCount: 2,
      creatureRenderTextureBindingReferences: ["panel_d", "panel_n"],
      creatureRenderAuroraMaterialCount: 1,
      creatureRenderAuroraMaterialFiles: ["mtr_panel.mtr"]
    });
    expect(runtime.placeableTextureLoader.load).not.toHaveBeenCalled();
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("renders source MDL light nodes from creature render packages", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    payload.renderPackage = {
      ...payload.renderPackage!,
      auroraLight: {
        source: "source-mdl",
        lights: [
          {
            source: "aurora-mdl-ascii",
            sourceModelAssetId: "asset-bear-mdl",
            sourceModelFileName: "n_bear.mdl",
            sourceModelObjectKey: "modules/current/models/n_bear.mdl",
            nodeName: "glow_l",
            transform: {
              position: [1, 0, 0]
            },
            radius: 2,
            multiplier: 1.5,
            color: [1, 0.5, 0.25],
            animations: [
              {
                animationName: "default",
                lengthSeconds: 1,
                positionTimeline: [
                  { time: 0, value: [1, 0, 0] },
                  { time: 1, value: [3, 0, 0] }
                ],
                colorTimeline: [
                  { time: 0, value: [1, 0.5, 0.25] },
                  { time: 1, value: [0, 1, 0.25] }
                ],
                radiusTimeline: [
                  { time: 0, value: 2 },
                  { time: 1, value: 4 }
                ],
                multiplierTimeline: [
                  { time: 0, value: 1.5 },
                  { time: 1, value: 3.5 }
                ]
              }
            ]
          },
          {
            source: "aurora-mdl-ascii",
            sourceModelAssetId: "asset-bear-mdl",
            sourceModelFileName: "n_bear.mdl",
            sourceModelObjectKey: "modules/current/models/n_bear.mdl",
            nodeName: "glow_ambient",
            transform: {
              position: [0, 0, 1]
            },
            radius: 4,
            multiplier: 2,
            color: [0.2, 0.4, 1],
            ambientOnly: true
          }
        ],
        diagnostics: []
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createCachedModel());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const lightNode = root?.getObjectByName(
      "creature_aurora_light_glow_l"
    ) as THREE.Group | undefined;
    const ambientNode = root?.getObjectByName(
      "creature_aurora_light_glow_ambient"
    ) as THREE.Group | undefined;
    let pointLight: THREE.PointLight | null = null;
    let ambientLight: THREE.AmbientLight | null = null;
    let lightCore: THREE.Mesh | null = null;
    lightNode?.traverse((node) => {
      if (!pointLight && node instanceof THREE.PointLight) {
        pointLight = node;
      }
      if (
        !lightCore &&
        node instanceof THREE.Mesh &&
        node.userData?.creatureAuroraLightPreviewRole === "source-mdl-light-core"
      ) {
        lightCore = node;
      }
    });
    ambientNode?.traverse((node) => {
      if (!ambientLight && node instanceof THREE.AmbientLight) {
        ambientLight = node;
      }
    });

    expect(root?.userData).toMatchObject({
      creatureAuroraLightCount: 2,
      creatureAuroraLightSourceNodeCount: 2,
      creatureAuroraLightAcceptedNodeCount: 2,
      creatureAuroraLightDroppedNodeCount: 0,
      creatureAuroraLightBudgetCap: 128,
      creatureAuroraLightBudgetCapSource:
        "C:/Projects/New Folder/export/decompiled_all.c:866086-866096 FUN_00a41e30 caps light slots at 0x80 unless runtime max-lights is lower",
      creatureAuroraLightBudgetCapProofStatus: "source-backed-mdl-light-slot-cap-max-128",
      creatureAuroraLightBudgetStrategy:
        "source-backed-retail-score-ascending-global-budget-preview-camera-fallback",
      creatureAuroraLightBudgetStrategySource: expect.stringContaining("FUN_00a41850"),
      creatureAuroraLightBudgetStrategyProofStatus:
        "source-backed-retail-score-sort-slot-cap-preview-camera-field-fallback",
      creatureAuroraLightNodeNames: ["glow_ambient", "glow_l"],
      creatureAuroraLightSourceModelFiles: ["n_bear.mdl", "n_bear.mdl"],
      creatureAuroraLightPreviewStatus: "active",
      creatureAuroraLightPreviewMode: "source-mdl-light-node-preview",
      creatureAuroraLightAnimatedCount: 1,
      creatureAuroraLightAnimationStatus: "active",
      creatureAuroraLightAnimationMode: "webviewer-light-keyframes",
      creatureAuroraLightAnimatedNodeNames: ["glow_l"],
      creatureAuroraLightSelectedAnimationNames: ["default"]
    });
    expect(lightNode?.userData).toMatchObject({
      creatureAuroraLightPreviewRole: "source-mdl-light-node",
      creatureAuroraLightNodeName: "glow_l",
      creatureAuroraLightSourceModelFileName: "n_bear.mdl",
      creatureAuroraLightBudgetRank: 2,
      creatureAuroraLightBudgetAccepted: true,
      creatureAuroraLightBudgetCap: 128,
      creatureAuroraLightBudgetCapSource:
        "C:/Projects/New Folder/export/decompiled_all.c:866086-866096 FUN_00a41e30 caps light slots at 0x80 unless runtime max-lights is lower",
      creatureAuroraLightBudgetCapProofStatus: "source-backed-mdl-light-slot-cap-max-128",
      creatureAuroraLightRetailScoreProofStatus:
        "source-backed-retail-lightmanager-score-preview-input-fallback",
      creatureAuroraLightRetailScoreSortDirection:
        "ascending-score-field-0x84-preview",
      creatureAuroraLightSourceRadius: 2,
      creatureAuroraLightSourceRadiusUnits: "aurora-model-units",
      creatureAuroraLightSourceUnitScale: 1,
      creatureAuroraLightSourceUnitScaleSource:
        "creature source MDL light radius is used directly as Three.PointLight distance in the current creature preview scale",
      creatureAuroraLightSourceRadiusWorldDistance: 2,
      creatureAuroraLightSourceRadiusWorldDistanceSource:
        "creature source MDL light-node radius multiplied by source-unit scale 1",
      creatureAuroraLightWorldRadius: 2,
      creatureAuroraLightRadiusProofStatus:
        "source-backed-creature-mdl-light-radius-controller",
      creatureAuroraLightQuadraticAtten: 1.125,
      creatureAuroraLightQuadraticAttenSource:
        "C:/Projects/New Folder/export/decompiled_all.c:865404-865409 FUN_00a40b60 uploads lightQuadraticAtten = 9/(max(radius,0.1)^2*2)",
      creatureAuroraLightQuadraticAttenProofStatus:
        "source-backed-mdl-radius-quadratic-attenuation",
      creatureAuroraLightFalloffFormula: "max(0,1-distance/radius)",
      creatureAuroraLightFalloffSource:
        "C:/Projects/New Folder/export/decompiled_all.c:866543-866563 FUN_00a423d8 adds active light color as max(0,1-distance/radius)*color*fade",
      creatureAuroraLightFalloffProofStatus:
        "source-backed-active-light-linear-radius-falloff",
      creatureAuroraLightFalloffRendererProofStatus:
        "source-backed-linear-radius-falloff-preview-shaderchunk-adapter",
      creatureAuroraLightPointLightDecay: 1,
      creatureAuroraLightAnimatedMultiplier: 1.5,
      creatureAuroraLightAnimationPlaybackStatus: "playing",
      creatureAuroraLightSelectedAnimationName: "default"
    });
    expect(lightNode?.position.x).toBeCloseTo(1);
    expect(lightNode?.position.y).toBeCloseTo(0);
    expect(lightNode?.position.z).toBeCloseTo(0);
    expect(pointLight?.intensity).toBeCloseTo(1.5);
    expect(pointLight?.distance).toBeCloseTo(2);
    expect(pointLight?.decay).toBeCloseTo(1);
    expect(pointLight?.userData.creatureAuroraLightSourceRadius).toBe(2);
    expect(pointLight?.userData.creatureAuroraLightSourceRadiusUnits).toBe(
      "aurora-model-units"
    );
    expect(pointLight?.userData.creatureAuroraLightSourceUnitScale).toBe(1);
    expect(pointLight?.userData.creatureAuroraLightSourceRadiusWorldDistance).toBe(2);
    expect(pointLight?.userData.creatureAuroraLightRadiusProofStatus).toBe(
      "source-backed-creature-mdl-light-radius-controller"
    );
    expect(pointLight?.userData.creatureAuroraLightFalloffProofStatus).toBe(
      "source-backed-active-light-linear-radius-falloff"
    );
    expect(["installed", "already-installed"]).toContain(
      pointLight?.userData.creatureAuroraLightFalloffRendererPatchStatus
    );
    expect(pointLight?.userData.creatureAuroraLightFalloffRendererSource).toContain(
      "max(0,1-distance/radius)*color*fade"
    );
    expect(pointLight?.color.r).toBeCloseTo(1);
    expect(pointLight?.color.g).toBeCloseTo(0.5);
    expect(pointLight?.color.b).toBeCloseTo(0.25);
    expect(ambientNode?.userData).toMatchObject({
      creatureAuroraLightPreviewRole: "source-mdl-light-node",
      creatureAuroraLightNodeName: "glow_ambient",
      creatureAuroraLightAmbientOnly: true
    });
    expect(ambientLight?.intensity).toBeCloseTo(0.5);
    expect(ambientLight?.color.r).toBeCloseTo(0.2);
    expect(ambientLight?.color.g).toBeCloseTo(0.4);
    expect(ambientLight?.color.b).toBeCloseTo(1);
    expect(lightCore).toBeNull();
    expect(runtime.objectAnimationMixersById.get(creature.id)?.afterUpdate).toEqual(
      expect.any(Function)
    );

    for (let index = 0; index < 5; index += 1) {
      updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    }

    expect(lightNode?.position.x).toBeCloseTo(2);
    expect(pointLight?.distance).toBeCloseTo(3);
    expect(pointLight?.userData.creatureAuroraLightSourceRadius).toBe(3);
    expect(pointLight?.userData.creatureAuroraLightSourceRadiusWorldDistance).toBe(3);
    expect(pointLight?.color.r).toBeCloseTo(0.5);
    expect(pointLight?.color.g).toBeCloseTo(0.75);
    expect(pointLight?.color.b).toBeCloseTo(0.25);
    expect(pointLight?.intensity).toBeCloseTo(2.5);
    expect(lightNode?.userData).toMatchObject({
      creatureAuroraLightSourceRadius: 3,
      creatureAuroraLightSourceRadiusWorldDistance: 3,
      creatureAuroraLightWorldRadius: 3,
      creatureAuroraLightRadiusProofStatus:
        "source-backed-creature-mdl-light-radius-controller",
      creatureAuroraLightQuadraticAtten: 0.5,
      creatureAuroraLightQuadraticAttenSource:
        "C:/Projects/New Folder/export/decompiled_all.c:865404-865409 FUN_00a40b60 uploads lightQuadraticAtten = 9/(max(radius,0.1)^2*2)",
      creatureAuroraLightQuadraticAttenProofStatus:
        "source-backed-mdl-radius-quadratic-attenuation",
      creatureAuroraLightFalloffProofStatus:
        "source-backed-active-light-linear-radius-falloff",
      creatureAuroraLightPointLightDecay: 1,
      creatureAuroraLightPreviewColor: [0.5, 0.75, 0.25],
      creatureAuroraLightAnimatedMultiplier: 2.5,
      creatureAuroraLightAnimationPlaybackStatus: "playing",
      creatureAuroraLightAnimationElapsedSeconds: 0.5
    });
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("caps creature source MDL light previews by recovered LightManager score before creating lights", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    payload.renderPackage = {
      ...payload.renderPackage!,
      auroraLight: {
        source: "source-mdl",
        diagnostics: [],
        lights: Array.from({ length: 130 }, (_, index) => ({
          source: "aurora-mdl-ascii",
          sourceModelAssetId: "asset-bear-mdl",
          sourceModelFileName: "n_bear.mdl",
          sourceModelObjectKey: "modules/current/models/n_bear.mdl",
          nodeName: `cre_light_${index.toString().padStart(3, "0")}`,
          transform: {
            position: [0, 0, 1 + index * 0.01]
          },
          radius: 3,
          multiplier: 1,
          color: [1, 0.85, 0.15],
          ambientOnly: false,
          lightPriority: index === 129 ? 20 : index === 0 ? -10 : 0
        }))
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createCachedModel());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const pointLights: THREE.PointLight[] = [];
    const lightNodes: THREE.Object3D[] = [];
    root?.traverse((node) => {
      if (node instanceof THREE.PointLight) {
        pointLights.push(node);
      }
      if (node.userData?.creatureAuroraLightPreviewRole === "source-mdl-light-node") {
        lightNodes.push(node);
      }
    });

    expect(pointLights).toHaveLength(128);
    expect(root?.userData.creatureAuroraLightCount).toBe(128);
    expect(root?.userData.creatureAuroraLightSourceNodeCount).toBe(130);
    expect(root?.userData.creatureAuroraLightAcceptedNodeCount).toBe(128);
    expect(root?.userData.creatureAuroraLightDroppedNodeCount).toBe(2);
    expect(root?.userData.creatureAuroraLightBudgetCap).toBe(128);
    expect(root?.userData.creatureAuroraLightBudgetCapSource).toBe(
      "C:/Projects/New Folder/export/decompiled_all.c:866086-866096 FUN_00a41e30 caps light slots at 0x80 unless runtime max-lights is lower"
    );
    expect(root?.userData.creatureAuroraLightBudgetCapProofStatus).toBe(
      "source-backed-mdl-light-slot-cap-max-128"
    );
    expect(root?.userData.creatureAuroraLightBudgetStrategy).toBe(
      "source-backed-retail-score-ascending-global-budget-preview-camera-fallback"
    );
    expect(root?.userData.creatureAuroraLightBudgetStrategySource).toContain(
      "FUN_00a41850"
    );
    expect(root?.userData.creatureAuroraLightBudgetStrategyProofStatus).toBe(
      "source-backed-retail-score-sort-slot-cap-preview-camera-field-fallback"
    );
    expect(root?.userData.creatureAuroraLightDroppedNodes).toEqual([
      "cre_light_128",
      "cre_light_129"
    ]);
    expect(lightNodes[0]?.userData).toMatchObject({
      creatureAuroraLightNodeName: "cre_light_000",
      creatureAuroraLightBudgetRank: 1,
      creatureAuroraLightBudgetAccepted: true,
      creatureAuroraLightBudgetCap: 128,
      creatureAuroraLightRetailScoreProofStatus:
        "source-backed-retail-lightmanager-score-preview-input-fallback",
      creatureAuroraLightBudgetCapProofStatus: "source-backed-mdl-light-slot-cap-max-128"
    });
  });

  it("respects a lower configured runtime cap for creature source MDL light previews", async () => {
    const runtime = createRuntime();
    runtime.scene.userData.auroraLightConfiguredMaxLights = 12;
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    payload.renderPackage = {
      ...payload.renderPackage!,
      auroraLight: {
        source: "source-mdl",
        diagnostics: [],
        lights: Array.from({ length: 30 }, (_, index) => ({
          source: "aurora-mdl-ascii",
          sourceModelAssetId: "asset-bear-mdl",
          sourceModelFileName: "n_bear.mdl",
          sourceModelObjectKey: "modules/current/models/n_bear.mdl",
          nodeName: `cre_config_light_${index.toString().padStart(3, "0")}`,
          transform: {
            position: [0, 0, 1 + index * 0.01]
          },
          radius: 3,
          multiplier: 1,
          color: [1, 0.85, 0.15],
          ambientOnly: false,
          lightPriority: index === 29 ? 20 : index === 0 ? -10 : 0
        }))
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createCachedModel());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const pointLights: THREE.PointLight[] = [];
    const lightNodes: THREE.Object3D[] = [];
    root?.traverse((node) => {
      if (node instanceof THREE.PointLight) {
        pointLights.push(node);
      }
      if (node.userData?.creatureAuroraLightPreviewRole === "source-mdl-light-node") {
        lightNodes.push(node);
      }
    });

    expect(pointLights).toHaveLength(12);
    expect(root?.userData.creatureAuroraLightCount).toBe(12);
    expect(root?.userData.creatureAuroraLightSourceNodeCount).toBe(30);
    expect(root?.userData.creatureAuroraLightAcceptedNodeCount).toBe(12);
    expect(root?.userData.creatureAuroraLightDroppedNodeCount).toBe(18);
    expect(root?.userData.creatureAuroraLightBudgetCap).toBe(12);
    expect(root?.userData.creatureAuroraLightBudgetHardCap).toBe(128);
    expect(root?.userData.creatureAuroraLightConfiguredMaxLights).toBe(12);
    expect(lightNodes[0]?.userData).toMatchObject({
      creatureAuroraLightNodeName: "cre_config_light_000",
      creatureAuroraLightBudgetRank: 1,
      creatureAuroraLightBudgetAccepted: true,
      creatureAuroraLightBudgetCap: 12,
      creatureAuroraLightBudgetHardCap: 128,
      creatureAuroraLightConfiguredMaxLights: 12
    });
  });

  it("renders source MDL emitter nodes from creature render packages", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    const emitterTextureUrl =
      "http://localhost:3000/api/v1/catalog/placeables/cache/cre_guard_captain%3Av1/assets/asset-fx-fire.tga";
    payload.renderPackage = {
      ...payload.renderPackage!,
      textureBindings: [
        {
          reference: "fx_fire",
          assetId: "asset-fx-fire",
          fileName: "fx_fire.tga",
          objectKey: "modules/current/textures/fx_fire.tga",
          deliveryUrl: emitterTextureUrl
        }
      ],
      auroraEmitter: {
        source: "source-mdl",
        emitters: [
          {
            source: "aurora-mdl-ascii",
            sourceModelAssetId: "asset-bear-mdl",
            sourceModelFileName: "n_bear.mdl",
            sourceModelObjectKey: "modules/current/models/n_bear.mdl",
            nodeName: "fire_emit",
            texture: "fx_fire",
            emitterType: "Fountain",
            renderMode: "Billboard_to_World_Z",
            blendMode: "Lighten",
            atlas: {
              effectiveXGrid: 4,
              effectiveYGrid: 4,
              fps: 12,
              frameStart: 0,
              frameEnd: 15
            },
            simulation: {
              xSize: 200,
              ySize: 150,
              birthrate: 12,
              lifeExp: 2,
              colorStart: [1, 0.3, 0.1]
            },
            transform: {
              position: [1, 0, 2]
            }
          }
        ],
        diagnostics: []
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createCachedModel());
    runtime.placeableTextureCacheByUrl.set(emitterTextureUrl, new THREE.Texture());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const emitterNode = root?.getObjectByName(
      "creature_aurora_emitter_fire_emit"
    ) as THREE.Group | undefined;
    const particlePreview = root?.getObjectByName(
      "creature_aurora_emitter_particle_preview"
    ) as THREE.Group | undefined;
    let spawnArea: THREE.Mesh | null = null;
    let particleMesh: THREE.Mesh | null = null;
    emitterNode?.traverse((node) => {
      if (
        !spawnArea &&
        node instanceof THREE.Mesh &&
        node.userData?.creatureAuroraEmitterPreviewRole ===
          "source-mdl-emitter-spawn-area"
      ) {
        spawnArea = node;
      }
    });
    particlePreview?.traverse((node) => {
      if (
        !particleMesh &&
        node instanceof THREE.Mesh &&
        typeof node.userData?.vfxPreviewRole === "string"
      ) {
        particleMesh = node;
      }
    });

    expect(root?.userData).toMatchObject({
      creatureAuroraEmitterCount: 1,
      creatureAuroraEmitterNodeNames: ["fire_emit"],
      creatureAuroraEmitterSourceModelFiles: ["n_bear.mdl"],
      creatureAuroraEmitterTextures: ["fx_fire"],
      creatureAuroraEmitterParticlePreviewStatus: "active",
      creatureAuroraEmitterParticlePreviewMode:
        "placeable-vfx-emitter-runtime-adapter",
      creatureAuroraEmitterParticlePreviewTextureReferenceCount: 1,
      creatureAuroraEmitterParticlePreviewTextureLoadedCount: 1,
      vfxTextureStatus: "applied",
      auroraEmitterNode: "fire_emit",
      auroraEmitterTexture: "fx_fire",
      auroraEmitterAtlasPreviewMode: "per-particle-vertex-uv-preview",
      creatureAuroraEmitterPreviewStatus: "active",
      creatureAuroraEmitterPreviewMode: "source-mdl-emitter-node-preview"
    });
    expect(particlePreview?.userData).toMatchObject({
      creatureAuroraEmitterParticlePreviewStatus: "active",
      vfxTextureStatus: "applied",
      auroraEmitterNode: "fire_emit",
      auroraEmitterBirthrate: 12,
      auroraEmitterLifeSeconds: 2,
      auroraEmitterParticleCount: 24
    });
    expect(particleMesh).toBeInstanceOf(THREE.Mesh);
    expect(emitterNode?.userData).toMatchObject({
      creatureAuroraEmitterPreviewRole: "source-mdl-emitter-node",
      creatureAuroraEmitterNodeName: "fire_emit",
      creatureAuroraEmitterSourceModelFileName: "n_bear.mdl",
      creatureAuroraEmitterTexture: "fx_fire",
      creatureAuroraEmitterRenderMode: "Billboard_to_World_Z",
      creatureAuroraEmitterBlendMode: "Lighten",
      creatureAuroraEmitterBirthrate: 12,
      creatureAuroraEmitterLifeExp: 2,
      creatureAuroraEmitterSurfaceWidth: 2,
      creatureAuroraEmitterSurfaceDepth: 1.5
    });
    expect(emitterNode?.position.x).toBeCloseTo(1);
    expect(emitterNode?.position.y).toBeCloseTo(2);
    expect(emitterNode?.position.z).toBeCloseTo(0);
    expect(spawnArea).toBeInstanceOf(THREE.Mesh);
    expect(spawnArea?.userData).toMatchObject({
      creatureAuroraEmitterPreviewRole: "source-mdl-emitter-spawn-area",
      creatureAuroraEmitterSurfaceWidth: 2,
      creatureAuroraEmitterSurfaceDepth: 1.5
    });
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("keeps a source-emitter creature without clips in its AnimationState rest pose", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationState: 0
        }
      } as NonNullable<SceneObject["creatureProperties"]>
    } as SceneObject;
    const payload = createReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      glbUrl: undefined,
      assetRefs: {
        derivedModelAssetIds: []
      },
      sourceModelCandidates: [],
      skeletonModelCandidates: [],
      partModelCandidates: [],
      auroraEmitter: {
        source: "source-mdl",
        emitters: [
          {
            source: "aurora-mdl-ascii",
            sourceModelAssetId: "asset-emitter-mdl",
            sourceModelFileName: "bf_grue_fire.mdl",
            sourceModelObjectKey: "modules/current/models/bf_grue_fire.mdl",
            nodeName: "fire_emit",
            texture: "fx_fire",
            emitterType: "Fountain",
            renderMode: "Billboard_to_World_Z",
            blendMode: "Lighten",
            atlas: {
              effectiveXGrid: 4,
              effectiveYGrid: 4,
              fps: 12,
              frameStart: 0,
              frameEnd: 15
            },
            simulation: {
              xSize: 200,
              ySize: 150,
              birthrate: 12,
              lifeExp: 2,
              colorStart: [1, 0.3, 0.1]
            },
            transform: {
              position: [1, 0, 2]
            }
          }
        ],
        diagnostics: []
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureAuroraEmitterParticlePreviewStatus: "active",
      creatureAnimationPlaybackStatus: "rest-pose",
      creatureAnimationPlaybackClipCount: 0,
      creatureAnimationSelectedClipNames: [],
      creatureAnimationState: 0,
      creatureAnimationStateMappingStatus: "state-clip-unavailable",
      creatureAnimationStateMappingCandidateClipNames: ["cpause1", "pause1"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.actionNames).toEqual([]);
    expect(runtime.container.dataset.creatureAnimationMixerStateMappingStatuses).toBe(
      "state-clip-unavailable"
    );
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackStatuses).toBe("rest-pose");
  });

  it("does not use creature model textures as source emitter particle fallback", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    const chickenTextureUrl =
      "http://localhost/api/v1/catalog/creatures/cache/cre_guard_captain:v1/assets/asset-chicken.dds";
    const chickenTexture = createCachedTgaTexture("chicken");
    payload.renderPackage = {
      ...payload.renderPackage!,
      textureBindings: [
        {
          reference: "chicken",
          assetId: "asset-chicken",
          fileName: "chicken.dds",
          objectKey: "modules/current/textures/chicken.dds",
          deliveryUrl: chickenTextureUrl
        }
      ],
      auroraEmitter: {
        source: "source-mdl",
        emitters: [
          {
            source: "aurora-mdl-ascii",
            sourceModelAssetId: "asset-chicken-mdl",
            sourceModelFileName: "c_a_chicken.mdl",
            sourceModelObjectKey: "modules/current/models/c_a_chicken.mdl",
            nodeName: "omenemitter01",
            texture: "fxpa_feather",
            emitterType: "Fountain",
            renderMode: "Billboard_to_World_Z",
            blendMode: "Lighten",
            simulation: {
              xSize: 10,
              ySize: 10,
              birthrate: 4,
              lifeExp: 1,
              colorStart: [1, 1, 1]
            }
          }
        ],
        diagnostics: []
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createCachedModel());
    runtime.placeableTextureCacheByUrl.set(chickenTextureUrl, chickenTexture);

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const particlePreview = root?.getObjectByName(
      "creature_aurora_emitter_particle_preview"
    ) as THREE.Group | undefined;
    const particleTextureReferences: string[] = [];
    particlePreview?.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) {
        return;
      }
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        const texture = (material as THREE.Material & { map?: THREE.Texture | null }).map;
        const reference = texture?.userData?.auroraTextureReference;
        if (typeof reference === "string") {
          particleTextureReferences.push(reference);
        }
      });
    });

    expect(particlePreview).toBeInstanceOf(THREE.Group);
    expect(root?.userData).toMatchObject({
      creatureAuroraEmitterParticlePreviewStatus: "active",
      creatureAuroraEmitterParticlePreviewRequestedTextureReferences: [
        "fxpa_feather",
        "fxpa_feathera"
      ],
      creatureAuroraEmitterParticlePreviewTextureReferenceCount: 0,
      creatureAuroraEmitterParticlePreviewTextureLoadedCount: 0,
      creatureAuroraEmitterParticlePreviewTextureFallbackStatus:
        "emitter-texture-missing-no-model-fallback"
    });
    expect(particleTextureReferences).not.toContain("chicken");
  });

  it("budgets dense creature source emitter particle previews", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    const smokeTextureUrl =
      "http://localhost/api/v1/catalog/creatures/cache/cre_guard_captain:v1/assets/asset-fx-smoke.tga";
    const strikeTextureUrl =
      "http://localhost/api/v1/catalog/creatures/cache/cre_guard_captain:v1/assets/asset-fx-strike.tga";
    const denseEmitters = Array.from({ length: 12 }, (_entry, index) => {
      const smoke = index % 2 === 0;
      return {
        source: "aurora-mdl-ascii" as const,
        sourceModelAssetId: "asset-air-mdl",
        sourceModelFileName: "c_air.mdl",
        sourceModelObjectKey: "modules/current/models/c_air.mdl",
        nodeName: `air_emit_${index.toString().padStart(2, "0")}`,
        texture: smoke ? "fxpa_smoke01" : "fxpa_strk_b",
        emitterType: smoke ? "Fountain" : "Single",
        renderMode: smoke ? "Normal" : "Billboard_to_Local_Z",
        blendMode: smoke ? "Normal" : "Lighten",
        simulation: {
          xSize: smoke ? 40 : 1,
          ySize: smoke ? 40 : 1,
          birthrate: smoke ? 12 : 8,
          lifeExp: smoke ? 2 : 1,
          sizeStart: smoke ? 3 : 0.2,
          sizeEnd: smoke ? 2 : 0.2,
          alphaStart: smoke ? 0.1 : 0.4,
          alphaEnd: smoke ? 0 : 0.4,
          colorStart: smoke ? [0.6, 0.6, 0.6] : [0, 1, 1],
          colorEnd: smoke ? [0.74, 0.74, 0.74] : [0, 1, 1]
        }
      };
    });
    payload.renderPackage = {
      ...payload.renderPackage!,
      textureBindings: [
        {
          reference: "fxpa_smoke01",
          assetId: "asset-fx-smoke",
          fileName: "fxpa_smoke01.tga",
          objectKey: "modules/current/textures/fxpa_smoke01.tga",
          deliveryUrl: smokeTextureUrl
        },
        {
          reference: "fxpa_strk_b",
          assetId: "asset-fx-strike",
          fileName: "fxpa_strk_b.tga",
          objectKey: "modules/current/textures/fxpa_strk_b.tga",
          deliveryUrl: strikeTextureUrl
        }
      ],
      auroraEmitter: {
        source: "source-mdl",
        emitters: denseEmitters,
        diagnostics: []
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createCachedModel());
    runtime.placeableTextureCacheByUrl.set(smokeTextureUrl, new THREE.Texture());
    runtime.placeableTextureCacheByUrl.set(strikeTextureUrl, new THREE.Texture());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const particlePreview = root?.getObjectByName(
      "creature_aurora_emitter_particle_preview"
    ) as THREE.Group | undefined;
    const emitterParticleCounts = particlePreview?.children
      .map((child) => child.userData.auroraEmitterParticleCount)
      .filter((count): count is number => typeof count === "number") ?? [];

    expect(particlePreview?.userData).toMatchObject({
      auroraEmitterPreviewBudgetStatus: "applied",
      auroraEmitterPreviewBudgetMode: "multi-emitter-source-preview-budget",
      auroraEmitterPreviewBudgetSourceEmitterCount: 12,
      auroraEmitterPreviewBudgetSelectedEmitterCount: 8,
      auroraEmitterPreviewBudgetDroppedEmitterCount: 4,
      auroraEmitterPreviewBudgetMaxEmitterCount: 8,
      auroraEmitterPreviewBudgetMaxEmittersPerSignature: 4,
      vfxEmitterCount: 8,
      auroraEmitterSourceCount: 12
    });
    expect(emitterParticleCounts).toHaveLength(8);
    expect(emitterParticleCounts.every((count) => count <= 3)).toBe(true);
    expect(
      particlePreview?.children.every(
        (child) =>
          child.userData.auroraEmitterPreviewBudgetProfileMode ===
            "multi-emitter-source-preview-budget" &&
          child.userData.auroraEmitterPreviewBudgetOpacityScale === 1 &&
          child.userData.auroraEmitterPreviewBudgetOpacityFloor === 0.32 &&
          child.userData.auroraEmitterPreviewBudgetSizeScale === 0.72
      )
    ).toBe(true);
    expect(root?.userData).toMatchObject({
      auroraEmitterPreviewBudgetStatus: "applied",
      auroraEmitterPreviewBudgetSelectedEmitterCount: 8
    });
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("keeps non-canonical creature emitter particles visible outside diagnostic mode", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    payload.renderPackage = {
      ...payload.renderPackage!,
      diagnostics: [
        ...(payload.renderPackage!.diagnostics ?? []),
        {
          code: "CREATURE_AURORA_MDL_EMITTER_PREVIEW_NON_CANONICAL",
          severity: "info",
          message: "Emitter preview is diagnostic-only."
        }
      ],
      auroraEmitter: {
        source: "source-mdl",
        emitters: [
          {
            source: "aurora-mdl-ascii",
            sourceModelAssetId: "asset-chicken-mdl",
            sourceModelFileName: "c_a_chicken.mdl",
            sourceModelObjectKey: "modules/current/models/c_a_chicken.mdl",
            nodeName: "dust_emit",
            emitterType: "Fountain",
            renderMode: "Billboard_to_World_Z",
            blendMode: "Lighten",
            simulation: {
              xSize: 180,
              ySize: 180,
              birthrate: 8,
              lifeExp: 1
            }
          }
        ],
        diagnostics: []
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createCachedModel());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const particlePreview = root?.getObjectByName(
      "creature_aurora_emitter_particle_preview"
    ) as THREE.Group | undefined;
    expect(root?.getObjectByName("creature_aurora_emitter_dust_emit")).toBeUndefined();
    expect(particlePreview?.userData).toMatchObject({
      creatureAuroraEmitterParticlePreviewStatus: "active",
      creatureAuroraEmitterParticlePreviewCanonicalStatus:
        "non-canonical-best-effort"
    });
    expect(root?.userData).toMatchObject({
      creatureAuroraEmitterParticlePreviewStatus: "active"
    });
    expect(root?.userData).not.toMatchObject({
      creatureAuroraEmitterPreviewStatus: "active"
    });
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("renders source MDL emitter and light previews when a creature has no model URL", () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const emitterTextureUrl =
      "http://localhost:3000/api/v1/catalog/placeables/cache/cre_guard_captain%3Av1/assets/asset-fx-portal.tga";
    payload.renderPackage = {
      ...payload.renderPackage!,
      glbUrl: undefined,
      modelUrl: undefined,
      sourceModelCandidates: [],
      skeletonModelCandidates: [],
      partModelCandidates: [],
      equipmentModelCandidates: [],
      textureBindings: [
        {
          reference: "fx_portal",
          assetId: "asset-fx-portal",
          fileName: "fx_portal.tga",
          objectKey: "modules/current/textures/fx_portal.tga",
          deliveryUrl: emitterTextureUrl
        }
      ],
      auroraEmitter: {
        source: "source-mdl",
        emitters: [
          {
            source: "aurora-mdl-ascii",
            sourceModelAssetId: "asset-portal-mdl",
            sourceModelFileName: "portal_placehold.mdl",
            sourceModelObjectKey: "modules/current/models/portal_placehold.mdl",
            nodeName: "portal_emit",
            texture: "fx_portal",
            emitterType: "Fountain",
            renderMode: "Billboard_to_World_Z",
            blendMode: "Lighten",
            simulation: {
              birthrate: 6,
              lifeExp: 1.5,
              xSize: 120,
              ySize: 120,
              colorStart: [0.25, 0.7, 1]
            }
          }
        ],
        diagnostics: []
      },
      auroraLight: {
        source: "source-mdl",
        lights: [
          {
            source: "aurora-mdl-ascii",
            sourceModelAssetId: "asset-portal-mdl",
            sourceModelFileName: "portal_placehold.mdl",
            sourceModelObjectKey: "modules/current/models/portal_placehold.mdl",
            nodeName: "portal_light",
            radius: 4,
            multiplier: 1.4,
            color: [0.25, 0.7, 1]
          }
        ],
        diagnostics: []
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    runtime.placeableTextureCacheByUrl.set(emitterTextureUrl, new THREE.Texture());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );

    const root = runtime.objectMeshById.get(creature.id);
    const emitterNode = root?.getObjectByName(
      "creature_aurora_emitter_portal_emit"
    ) as THREE.Group | undefined;
    const particlePreview = root?.getObjectByName(
      "creature_aurora_emitter_particle_preview"
    ) as THREE.Group | undefined;
    const lightNode = root?.getObjectByName(
      "creature_aurora_light_portal_light"
    ) as THREE.Group | undefined;

    expect(root).toBeInstanceOf(THREE.Mesh);
    expect(root?.userData).toMatchObject({
      creatureAuroraPrimitiveFallbackPreviewStatus: "active",
      creatureAuroraPrimitiveFallbackPreviewMode: "source-mdl-preview",
      creatureAuroraSourcePreviewStatus: "active",
      creatureAuroraSourcePreviewModes: [
        "emitter-particles",
        "emitter-nodes",
        "light-nodes"
      ],
      creatureAuroraEmitterParticlePreviewStatus: "active",
      creatureAuroraEmitterParticlePreviewTextureLoadedCount: 1,
      creatureAuroraEmitterPreviewStatus: "active",
      creatureAuroraEmitterNodeNames: ["portal_emit"],
      creatureAuroraLightPreviewStatus: "active",
      creatureAuroraLightNodeNames: ["portal_light"],
      vfxTextureStatus: "applied"
    });
    expect(particlePreview?.userData).toMatchObject({
      creatureAuroraEmitterParticlePreviewStatus: "active",
      auroraEmitterNode: "portal_emit",
      auroraEmitterTexture: "fx_portal"
    });
    expect(emitterNode?.userData).toMatchObject({
      creatureAuroraEmitterPreviewRole: "source-mdl-emitter-node",
      creatureAuroraEmitterNodeName: "portal_emit",
      creatureAuroraEmitterSourceModelFileName: "portal_placehold.mdl"
    });
    expect(lightNode?.userData).toMatchObject({
      creatureAuroraLightPreviewRole: "source-mdl-light-node",
      creatureAuroraLightNodeName: "portal_light",
      creatureAuroraLightSourceModelFileName: "portal_placehold.mdl"
    });
    const rootMaterial = Array.isArray((root as THREE.Mesh).material)
      ? (root as THREE.Mesh).material[0]
      : (root as THREE.Mesh).material;
    expect(rootMaterial.transparent).toBe(true);
    expect(rootMaterial.opacity).toBeLessThanOrEqual(0.16);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("applies asynchronously loaded source MDL emitter textures to creature particle previews", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    const emitterTextureUrl =
      "http://localhost:3000/api/v1/catalog/placeables/cache/cre_guard_captain%3Av1/assets/asset-fx-spark.tga";
    const alphaTextureUrl =
      "http://localhost:3000/api/v1/catalog/placeables/cache/cre_guard_captain%3Av1/assets/asset-fx-spark-alpha.tga";
    const loadedTexture = new THREE.DataTexture(
      new Uint8Array([
        200, 180, 160, 255,
        220, 200, 180, 255,
        180, 160, 140, 255,
        240, 220, 200, 255
      ]),
      2,
      2,
      THREE.RGBAFormat
    );
    const loadedAlphaTexture = new THREE.DataTexture(
      new Uint8Array([
        0, 0, 0, 255,
        128, 128, 128, 255,
        220, 220, 220, 255,
        255, 255, 255, 255
      ]),
      2,
      2,
      THREE.RGBAFormat
    );
    (runtime.placeableTgaTextureLoader.load as unknown as ReturnType<typeof vi.fn>)
      .mockImplementation((url, onLoad) => {
        setTimeout(() => onLoad(url === alphaTextureUrl ? loadedAlphaTexture : loadedTexture), 0);
        return {};
      });
    payload.renderPackage = {
      ...payload.renderPackage!,
      textureBindings: [
        {
          reference: "fx_spark",
          assetId: "asset-fx-spark",
          fileName: "fx_spark.tga",
          objectKey: "modules/current/textures/fx_spark.tga",
          deliveryUrl: emitterTextureUrl
        },
        {
          reference: "fx_sparka",
          assetId: "asset-fx-spark-alpha",
          fileName: "fx_sparka.tga",
          objectKey: "modules/current/textures/fx_sparka.tga",
          deliveryUrl: alphaTextureUrl
        }
      ],
      auroraEmitter: {
        source: "source-mdl",
        emitters: [
          {
            source: "aurora-mdl-ascii",
            sourceModelAssetId: "asset-bear-mdl",
            sourceModelFileName: "n_bear.mdl",
            sourceModelObjectKey: "modules/current/models/n_bear.mdl",
            nodeName: "spark_emit",
            texture: "fx_spark",
            emitterType: "Fountain",
            renderMode: "Normal",
            blendMode: "Normal",
            simulation: {
              birthrate: 4,
              lifeExp: 1,
              colorStart: [0.4, 0.8, 1]
            }
          }
        ],
        diagnostics: []
      }
    };
    payload.creature.creatureRenderPackage = payload.renderPackage;
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createCachedModel());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();

    const root = runtime.objectMeshById.get(creature.id);
    const particlePreview = root?.getObjectByName(
      "creature_aurora_emitter_particle_preview"
    ) as THREE.Group | undefined;
    let texturedMaterial: THREE.MeshBasicMaterial | null = null;
    particlePreview?.traverse((node) => {
      if (texturedMaterial || !(node instanceof THREE.Mesh)) {
        return;
      }
      const material = Array.isArray(node.material) ? node.material[0] : node.material;
      if (
        material instanceof THREE.MeshBasicMaterial &&
        material.userData.auroraAlphaCompanionTexture === true
      ) {
        texturedMaterial = material;
      }
    });

    expect(runtime.placeableTgaTextureLoader.load).toHaveBeenCalledWith(
      emitterTextureUrl,
      expect.any(Function),
      undefined,
      expect.any(Function)
    );
    expect(root?.userData).toMatchObject({
      creatureAuroraEmitterParticlePreviewStatus: "active",
      creatureAuroraEmitterParticlePreviewTextureRefreshStatus: "applied",
      creatureAuroraEmitterParticlePreviewTextureLoadedCount: 2,
      vfxTextureStatus: "applied"
    });
    expect(texturedMaterial).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(texturedMaterial?.map).not.toBe(loadedTexture);
    expect(texturedMaterial?.alphaMap).not.toBeNull();
    expect(texturedMaterial?.userData.auroraAlphaCompanionTexture).toBe(true);
    expect(texturedMaterial?.userData.auroraTextureAlphaMode).toBe("blend");
    expect(runtime.placeableTextureCacheByUrl.get(emitterTextureUrl)).toBe(loadedTexture);
    expect(runtime.placeableTextureCacheByUrl.get(alphaTextureUrl)).toBe(loadedAlphaTexture);
  });

  it("updates source skinmesh vertices from animated Aurora bones without mutating the model cache", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    const cachedModel = createSourceSkinnedAnimatedCachedModel();
    const cachedSkinMesh = cachedModel.getObjectByName("torso_skin") as THREE.Mesh;
    runtime.placeableModelCacheByUrl.set(modelCacheKey, cachedModel);

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const runtimeSkinMesh = root?.getObjectByName("torso_skin") as THREE.Mesh;
    const runtimePosition = runtimeSkinMesh.geometry.getAttribute(
      "position"
    ) as THREE.BufferAttribute;
    const cachedPosition = cachedSkinMesh.geometry.getAttribute(
      "position"
    ) as THREE.BufferAttribute;

    expect(root?.userData).toMatchObject({
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackMode: "three-animation-mixer",
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["super_walk"],
      creatureSourceSkinningStatus: "active",
      creatureSourceSkinningMode: "cpu-linear-blend",
      creatureSourceSkinningMeshCount: 1,
      creatureSourceSkinningWeightedVertexCount: 1,
      creatureSourceSkinningInfluencingBoneNames: ["rshin_g"],
      creatureSourceSkinningMissingBoneNames: []
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.afterUpdate).toEqual(
      expect.any(Function)
    );
    expect(runtimePosition.getY(0)).toBeCloseTo(0);

    for (let frame = 0; frame < 5; frame += 1) {
      updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    }

    expect(runtimePosition.getY(0)).toBeCloseTo(1);
    expect(cachedPosition.getY(0)).toBeCloseTo(0);
    expect(runtimeSkinMesh.geometry).not.toBe(cachedSkinMesh.geometry);
  });

  it("applies source skin mesh bind pose separately from inverse bone binds", () => {
    const root = new THREE.Group();
    const bone = new THREE.Object3D();
    bone.name = "rshin_g";
    bone.position.set(0.25, 0.8, 0);
    root.add(bone);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
    const skinMesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: 0x223344 })
    );
    skinMesh.name = "robe_skin";
    skinMesh.position.set(0.2, 0, 0);
    skinMesh.userData = {
      aurora: {
        sourceMesh: "robe_skin",
        sourceNodeType: "skin",
        skinWeights: {
          format: "aurora-mdl-original-vertex-weights",
          sourceWeightVertexCount: 1,
          gltfVertexSourceIndices: [0],
          influencingBoneNames: ["rshin_g"],
          maxInfluencesPerVertex: 1,
          requiresWeightNormalization: false,
          originalVertexWeights: [[{ bone: "rshin_g", weight: 1 }]],
          inverseBindPoses: [
            {
              bone: "rshin_g",
              qboneRefInv: [0, 0, 0, -1],
              tboneRefInv: [-0.05, 0, -0.8]
            }
          ]
        }
      }
    };
    root.add(skinMesh);

    const sourceSkinning = createAuroraSourceSkinningRuntime(root);
    const position = skinMesh.geometry.getAttribute("position") as THREE.BufferAttribute;

    expect(sourceSkinning?.inverseBindPoseCount).toBe(1);
    sourceSkinning?.apply();
    expect(position.getX(0)).toBeCloseTo(0);
    expect(position.getY(0)).toBeCloseTo(0);
    expect(sourceSkinning?.runtimeVertexSignaturesByMesh).toEqual([
      "robe_skin:0:0.0000,0.0000,0.0000"
    ]);

    bone.position.y = 1;
    sourceSkinning?.apply();

    expect(position.getX(0)).toBeCloseTo(0);
    expect(position.getY(0)).toBeCloseTo(0.2);
    expect(sourceSkinning?.runtimeVertexSignaturesByMesh).toEqual([
      "robe_skin:0:0.0000,0.2000,0.0000"
    ]);
  });

  it("updates danglymesh vertices from Aurora constraints without mutating the model cache", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    const cachedModel = createDanglymeshAnimatedCachedModel();
    const cachedDanglyMesh = cachedModel.getObjectByName("cloak_dangly") as THREE.Mesh;
    runtime.placeableModelCacheByUrl.set(modelCacheKey, cachedModel);

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const runtimeDanglyMesh = root?.getObjectByName("cloak_dangly") as THREE.Mesh;
    const runtimePosition = runtimeDanglyMesh.geometry.getAttribute(
      "position"
    ) as THREE.BufferAttribute;
    const cachedPosition = cachedDanglyMesh.geometry.getAttribute(
      "position"
    ) as THREE.BufferAttribute;
    const initialRuntimeY = runtimePosition.getY(1);

    expect(root?.userData).toMatchObject({
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackMode: "three-animation-mixer",
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["idle"],
      creatureDanglymeshStatus: "active",
      creatureDanglymeshMode: "webviewer-sine",
      creatureDanglymeshMeshCount: 1,
      creatureDanglymeshWeightedVertexCount: 2,
      creatureDanglymeshNodeNames: ["cloak_dangly"]
    });

    for (let index = 0; index < 5; index += 1) {
      updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    }

    expect(runtimePosition.getY(1)).not.toBeCloseTo(initialRuntimeY);
    expect(cachedPosition.getY(1)).toBeCloseTo(0);
    expect(runtimeDanglyMesh.geometry).not.toBe(cachedDanglyMesh.geometry);
  });

  it("updates item cloak danglymesh runtime effects from source model metadata", async () => {
    const runtime = createRuntime();
    const item: SceneObject = {
      id: "item_cloak_dangly",
      kind: "items",
      name: "Dangly Cloak",
      resRef: "l_cloak_0",
      tag: "DANGLY_CLOAK",
      x: 1,
      y: 2,
      z: 0,
      bearing: 0,
      visualTransform: {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitch: 0,
        yaw: 0,
        roll: 0
      },
      itemProperties: {
        baseItem: 80,
        baseItemLabel: "cloak",
        baseItemModelType: "cloak",
        modelPart1: 1,
        modelParts: [1],
        modelPartResRefs: ["pmh0_cloak_001"],
        modelPartResRefRoles: ["cloak"],
        cloakModelResRef: "pmh0_cloak_001",
        modelPartCandidates: [
          {
            resRef: "pmh0_cloak_001",
            role: "cloak",
            partId: 1,
            assetId: "asset-cloak-glb",
            glbUrl:
              "/api/v1/catalog/placeables/cache/item_cloak_dangly:v1/assets/asset-cloak-glb.glb"
          }
        ]
      }
    };
    const modelCacheKey = "item:item_cloak_dangly:model-part:asset-cloak-glb";
    const cachedModel = createDanglymeshAnimatedCachedModel();
    const cachedDanglyMesh = cachedModel.getObjectByName("cloak_dangly") as THREE.Mesh;
    runtime.placeableModelCacheByUrl.set(modelCacheKey, cachedModel);

    rebuildObjectMeshes(
      runtime,
      [item],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(item.id);
    const runtimeDanglyMesh = root?.getObjectByName("cloak_dangly") as THREE.Mesh;
    const runtimePosition = runtimeDanglyMesh.geometry.getAttribute(
      "position"
    ) as THREE.BufferAttribute;
    const cachedPosition = cachedDanglyMesh.geometry.getAttribute(
      "position"
    ) as THREE.BufferAttribute;
    const initialRuntimeY = runtimePosition.getY(1);

    expect(root?.userData).toMatchObject({
      objectKind: "items",
      itemPreviewMode: "model-part-assets",
      itemModelPartLoadStatus: "loaded",
      itemRuntimeEffectStatus: "active",
      itemRuntimeEffectMode: "source-mdl-runtime-effects",
      itemDanglymeshStatus: "active",
      itemDanglymeshMode: "webviewer-sine",
      itemDanglymeshMeshCount: 1,
      itemDanglymeshWeightedVertexCount: 2,
      itemDanglymeshNodeNames: ["cloak_dangly"]
    });
    expect(runtime.objectAnimationMixersById.get(item.id)?.clipCount).toBe(0);

    for (let index = 0; index < 5; index += 1) {
      updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    }

    expect(runtimePosition.getY(1)).not.toBeCloseTo(initialRuntimeY);
    expect(cachedPosition.getY(1)).toBeCloseTo(0);
    expect(runtimeDanglyMesh.geometry).not.toBe(cachedDanglyMesh.geometry);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("rotates default item models upright before normalizing the preview", async () => {
    const runtime = createRuntime();
    const item: SceneObject = {
      id: "item_potion_default",
      kind: "items",
      name: "Default Potion",
      resRef: "nw_it_mpotion002",
      tag: "DEFAULT_POTION",
      x: 1,
      y: 2,
      z: 0,
      bearing: 0,
      visualTransform: {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitch: 0,
        yaw: 0,
        roll: 0
      },
      itemProperties: {
        baseItem: 49,
        baseItemLabel: "potion",
        baseItemModelType: "it_potion",
        baseItemDefaultModel: "it_potion_000",
        modelPart1: 41,
        modelParts: [41],
        modelPartResRefs: ["it_potion_000"],
        modelPartResRefRoles: ["default"],
        modelPartCandidates: [
          {
            resRef: "it_potion_000",
            role: "default",
            partId: 41,
            assetId: "asset-it-potion-000",
            glbUrl:
              "/api/v1/catalog/placeables/cache/item_potion_default:v1/assets/asset-it-potion-000.glb"
          }
        ]
      }
    };
    const modelCacheKey = "item:item_potion_default:model-part:asset-it-potion-000";
    const potionModel = new THREE.Group();
    potionModel.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.15, 0.3),
        new THREE.MeshBasicMaterial({ color: 0x55ccdd })
      )
    );
    runtime.placeableModelCacheByUrl.set(modelCacheKey, potionModel);

    rebuildObjectMeshes(
      runtime,
      [item],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(item.id);
    const itemGroups: THREE.Object3D[] = [];
    root?.traverse((node) => {
      if (
        node.name === "item_model_parts" &&
        node.userData?.itemModelPartGroupStatus === "source-item-model-parts"
      ) {
        itemGroups.push(node);
      }
    });

    expect(root?.userData).toMatchObject({
      objectKind: "items",
      itemPreviewMode: "model-part-assets",
      itemModelPartLoadStatus: "loaded",
      itemModelPartPreviewTransformMode: "default-model-upright",
      itemModelPartPreviewRotation: "-1.5708,0.0000,0.0000"
    });
    expect(itemGroups).toHaveLength(1);
    expect(itemGroups[0]?.rotation.x).toBeCloseTo(-Math.PI / 2);
    const bounds = new THREE.Box3().setFromObject(itemGroups[0]!);
    const size = bounds.getSize(new THREE.Vector3());
    expect(size.y).toBeGreaterThan(size.z);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("applies per-animation danglymesh displacement overrides from source clips", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(
      modelCacheKey,
      createDanglymeshAnimatedCachedModel({ disableDanglymeshInAnimation: true })
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const runtimeDanglyMesh = root?.getObjectByName("cloak_dangly") as THREE.Mesh;
    const runtimePosition = runtimeDanglyMesh.geometry.getAttribute(
      "position"
    ) as THREE.BufferAttribute;
    const initialRuntimeY = runtimePosition.getY(1);

    expect(root?.userData).toMatchObject({
      creatureDanglymeshStatus: "active",
      creatureDanglymeshAnimationOverrideClipNames: ["idle"],
      creatureDanglymeshAnimationOverrideNodeNames: ["cloak_dangly"]
    });

    updateRuntimeObjectAnimationPlaybacks(runtime, 0.5);

    expect(runtimePosition.getY(1)).toBeCloseTo(initialRuntimeY);
  });

  it("updates animmesh UV frames from Aurora source animation metadata", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    const cachedModel = createAnimmeshAnimatedCachedModel();
    const cachedAnimmesh = cachedModel.getObjectByName("glow_panel") as THREE.Mesh;
    runtime.placeableModelCacheByUrl.set(modelCacheKey, cachedModel);

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const runtimeAnimmesh = root?.getObjectByName("glow_panel") as THREE.Mesh;
    const runtimeUv = runtimeAnimmesh.geometry.getAttribute("uv") as THREE.BufferAttribute;
    const runtimePosition =
      runtimeAnimmesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    const cachedUv = cachedAnimmesh.geometry.getAttribute("uv") as THREE.BufferAttribute;
    const cachedPosition =
      cachedAnimmesh.geometry.getAttribute("position") as THREE.BufferAttribute;

    expect(root?.userData).toMatchObject({
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimmeshStatus: "active",
      creatureAnimmeshMode: "webviewer-animmesh-frames",
      creatureAnimmeshMeshCount: 1,
      creatureAnimmeshUvMeshCount: 1,
      creatureAnimmeshVertexMeshCount: 1,
      creatureAnimmeshNodeNames: ["glow_panel"],
      creatureAnimmeshAnimationClipNames: ["idle"]
    });

    for (let index = 0; index < 6; index += 1) {
      updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    }

    expect(runtimeUv.getX(0)).toBeCloseTo(0.4);
    expect(runtimeUv.getY(0)).toBeCloseTo(1);
    expect(runtimeUv.getX(1)).toBeCloseTo(1);
    expect(runtimeUv.getY(1)).toBeCloseTo(0.6);
    expect(cachedUv.getX(0)).toBeCloseTo(0);
    expect(cachedUv.getY(0)).toBeCloseTo(1);
    expect(runtimePosition.getX(0)).toBeCloseTo(0.4);
    expect(cachedPosition.getX(0)).toBeCloseTo(0);
    expect(runtimeAnimmesh.geometry).not.toBe(cachedAnimmesh.geometry);
  });

  it("updates material opacity from Aurora alphakey source animation metadata", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    const cachedModel = createAlphaAnimatedCachedModel();
    const cachedMesh = cachedModel.getObjectByName("fade_panel") as THREE.Mesh;
    const cachedMaterial = cachedMesh.material as THREE.MeshBasicMaterial;
    runtime.placeableModelCacheByUrl.set(modelCacheKey, cachedModel);

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const runtimeMesh = root?.getObjectByName("fade_panel") as THREE.Mesh;
    const runtimeMaterial = runtimeMesh.material as THREE.MeshBasicMaterial;

    expect(root?.userData).toMatchObject({
      creatureAnimationPlaybackStatus: "playing",
      creatureAlphaAnimationStatus: "active",
      creatureAlphaAnimationMode: "webviewer-alphakey",
      creatureAlphaAnimationMeshCount: 1,
      creatureAlphaAnimationNodeNames: ["fade_panel"],
      creatureAlphaAnimationClipNames: ["fade"]
    });
    expect(runtimeMaterial.opacity).toBeCloseTo(1);
    expect(runtimeMaterial.transparent).toBe(false);

    for (let index = 0; index < 5; index += 1) {
      updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    }

    expect(runtimeMaterial.opacity).toBeCloseTo(0.625);
    expect(runtimeMaterial.transparent).toBe(true);
    expect(cachedMaterial.opacity).toBeCloseTo(1);
    expect(runtimeMaterial).not.toBe(cachedMaterial);
  });

  it("updates material emissive color from Aurora selfillumcolorkey metadata", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    const cachedModel = createSelfIllumColorAnimatedCachedModel();
    const cachedMesh = cachedModel.getObjectByName("glow_panel") as THREE.Mesh;
    const cachedMaterial = cachedMesh.material as THREE.MeshStandardMaterial;
    runtime.placeableModelCacheByUrl.set(modelCacheKey, cachedModel);

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const runtimeMesh = root?.getObjectByName("glow_panel") as THREE.Mesh;
    const runtimeMaterial = runtimeMesh.material as THREE.MeshStandardMaterial;

    expect(root?.userData).toMatchObject({
      creatureAnimationPlaybackStatus: "playing",
      creatureSelfIllumColorAnimationStatus: "active",
      creatureSelfIllumColorAnimationMode: "webviewer-selfillumcolorkey",
      creatureSelfIllumColorAnimationMeshCount: 1,
      creatureSelfIllumColorAnimationNodeNames: ["glow_panel"],
      creatureSelfIllumColorAnimationClipNames: ["pulse"]
    });
    expect(runtimeMaterial.emissive.r).toBeCloseTo(0.1);
    expect(runtimeMaterial.emissive.g).toBeCloseTo(0.2);
    expect(runtimeMaterial.emissive.b).toBeCloseTo(0.3);
    expect(runtimeMaterial.userData.auroraSelfIllumColorAnimationReady).toBe(true);
    expect(runtimeMaterial.userData.auroraSelfIllumColorAnimationMode).toBe(
      "webviewer-selfillumcolorkey"
    );

    for (let index = 0; index < 5; index += 1) {
      updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    }

    expect(runtimeMaterial.emissive.r).toBeCloseTo(0.5);
    expect(runtimeMaterial.emissive.g).toBeCloseTo(0.3);
    expect(runtimeMaterial.emissive.b).toBeCloseTo(0.2);
    expect(runtimeMaterial.userData.auroraSelfIllumColorAnimationApplied).toBe(true);
    expect(runtimeMaterial.userData.auroraSelfIllumColorAnimationClipName).toBe("pulse");
    expect(runtimeMaterial.userData.auroraSelfIllumColorAnimationColor).toEqual([
      expect.closeTo(0.5),
      expect.closeTo(0.3),
      expect.closeTo(0.2)
    ]);
    expect(cachedMaterial.emissive.getHex()).toBe(0x000000);
    expect(runtimeMaterial).not.toBe(cachedMaterial);
  });

  it("updates TXI proceduretype cycle textures as a creature runtime effect", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:derived:asset-bear-glb";
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createTxiCycleCachedModel());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const runtimeCycleMesh = root?.getObjectByName("txi_cycle_panel") as THREE.Mesh;
    const material = runtimeCycleMesh.material as THREE.MeshBasicMaterial;
    const texture = material.map!;

    expect(root?.userData).toMatchObject({
      creatureAnimationPlaybackStatus: "runtime-effects",
      creatureAnimationPlaybackMode: "three-runtime-effects",
      creatureAnimationPlaybackClipCount: 0,
      creatureAnimationPlaybackActionNames: [],
      creatureTextureCycleStatus: "active",
      creatureTextureCycleMode: "webviewer-txi-cycle",
      creatureTextureCycleMaterialCount: 1,
      creatureTextureCycleTextureCount: 1,
      creatureTextureCycleReferences: ["fx_cycle"]
    });
    expect(runtime.objectAnimationMixersById.get(creature.id)?.clipCount).toBe(0);
    expect(texture.repeat.x).toBeCloseTo(0.5);
    expect(texture.repeat.y).toBeCloseTo(0.5);
    expect(texture.offset.x).toBeCloseTo(0);
    expect(texture.offset.y).toBeCloseTo(0.5);

    for (let index = 0; index < 3; index += 1) {
      updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    }

    expect(texture.offset.x).toBeCloseTo(0.5);
    expect(texture.offset.y).toBeCloseTo(0.5);
  });

  it("loads available CAPart creature part models into a viewport group", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createPartModelReadyCreatureRenderPayload();
    const modelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createCachedModel());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      objectId: creature.id,
      objectKind: "creatures",
      auroraPrimitiveObject: false,
      creatureRenderPackageStatus: "missing_derived",
      creatureRenderModelReady: false,
      creaturePartModelGroupStatus: "loaded",
      creaturePartModelGroupReady: true,
      creaturePartModelGroupCount: 1,
      creaturePartModelGroupLoadedCount: 1,
      creaturePartModelGroupTotalCount: 1,
      creaturePartModelGroupSlots: ["rFoot"],
      creaturePartModelGroupCacheKeys: [modelCacheKey]
    });
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    expect(partGroup?.userData).toMatchObject({
      creaturePartModelGroupLoadedCount: 1,
      creaturePartModelGroupTotalCount: 1,
      creaturePartModelGroupSlots: ["rFoot"]
    });
    expect(partGroup?.children[0]?.userData).toMatchObject({
      creaturePartSlot: "rFoot",
      creaturePartId: 4,
      creaturePartModelResRef: "pfh2_rfoot004",
      creaturePartNodeName: "rfoot_g",
      creaturePartAttachmentTarget: "rfoot_g"
    });
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("prefers creature part models over empty direct driver models", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createReadyCreatureRenderPayload();
    const partModelCandidate = {
      slot: "tail" as const,
      partId: 4,
      partModelName: "tail",
      nodeName: "tail_g",
      modelResRef: "c_tail_brs",
      assetId: "asset-tail-glb",
      glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-tail-glb.glb",
      source: "tailmodel.2da.MODEL" as const,
      source2daRow: 4,
      sourceKey: "tailmodel.2da.MODEL"
    };
    const readyRenderPackage = {
      ...payload.renderPackage!,
      appearanceProfile: {
        appearanceType: 1234,
        appearanceLabel: "[Invis] Horse: Half-Elf",
        modelType: "FT",
        raceModel: "c_gennode",
        sizeCategory: 3,
        sizeCategoryLabel: "Medium"
      },
      sourceModelCandidates: [
        {
          resref: "c_gennode",
          role: "appearance-race-model" as const,
          source: "appearance.2da.RACE" as const,
          confidence: "direct-model" as const
        }
      ],
      skeletonModelCandidates: [],
      partModelCandidates: [partModelCandidate],
      assetRefs: {
        derivedModelAssetIds: ["asset-c-gennode-glb"]
      },
      glbUrl:
        "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-c-gennode-glb.glb"
    };
    payload.renderPackage = readyRenderPackage;
    payload.creature.creatureRenderPackage = readyRenderPackage;
    const partModelCacheKey = "creature:cre_guard_captain:v1:part:tail:asset-tail-glb";
    runtime.placeableModelCacheByUrl.set(partModelCacheKey, createCachedModel(0.5));

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureRenderPackageStatus: "ready",
      creatureRenderModelReady: true,
      creatureViewportRenderMode: "part-model-group",
      creatureRenderDirectModelBypassReason: "empty-driver-with-part-models",
      creatureRenderDirectModelBypassResRef: "c_gennode",
      creaturePartModelGroupStatus: "loaded",
      creaturePartModelGroupLoadedCount: 1,
      creaturePartModelGroupTotalCount: 1,
      creaturePartModelGroupSlots: ["tail"],
      creaturePartModelGroupCacheKeys: [partModelCacheKey]
    });
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    expect(partGroup?.children[0]?.userData).toMatchObject({
      creaturePartSlot: "tail",
      creaturePartModelResRef: "c_tail_brs"
    });
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("uses bounding-box stacking as the fallback assembly for multiple CAPart models", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createMultiPartModelReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      skeletonModelCandidates: []
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      skeletonModelCandidates: []
    };
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creaturePartAssemblyMode: "bbox-stack",
      creaturePartAssemblyAxis: "three-x-y",
      creaturePartAssemblyAdjustedSlots: ["rFoot", "rShin"],
      creaturePartAssemblyLateralSlots: ["rFoot", "rShin"],
      creaturePartAssemblyAttachmentTargets: ["rfoot_g", "rshin_g"]
    });
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    expect(partGroup?.userData).toMatchObject({
      creaturePartAssemblyMode: "bbox-stack",
      creaturePartAssemblyAxis: "three-x-y",
      creaturePartAssemblyAdjustedSlots: ["rFoot", "rShin"],
      creaturePartAssemblyLateralSlots: ["rFoot", "rShin"],
      creaturePartAssemblyAttachmentTargets: ["rfoot_g", "rshin_g"]
    });

    const footPart = partGroup?.children.find(
      (child) => child.userData?.creaturePartSlot === "rFoot"
    );
    const shinPart = partGroup?.children.find(
      (child) => child.userData?.creaturePartSlot === "rShin"
    );
    expect(footPart?.position.y).toBeGreaterThan(0);
    expect(shinPart?.position.y).toBeGreaterThan(footPart?.position.y ?? 0);
    expect(footPart?.position.x).toBeGreaterThan(0);
    expect(shinPart?.position.x).toBeGreaterThan(0);
    expect(footPart?.userData).toMatchObject({
      creaturePartAttachmentTarget: "rfoot_g",
      creaturePartAssemblyOffsetX: expect.any(Number)
    });
    expect(shinPart?.userData).toMatchObject({
      creaturePartAttachmentTarget: "rshin_g",
      creaturePartAssemblyOffsetX: expect.any(Number)
    });
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("anchors CAPart models to a loaded base skeleton before bbox fallback", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createMultiPartModelReadyCreatureRenderPayload();
    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, createCachedSkeletonModel(true));
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureSkeletonModelReady: true,
      creatureSkeletonModelStatus: "url-ready",
      creatureSkeletonModelCacheKey: skeletonModelCacheKey,
      creaturePartAssemblyMode: "skeleton-anchors",
      creaturePartAssemblyAxis: "skeleton-nodes",
      creaturePartAssemblySkeletonModelStatus: "anchored",
      creaturePartAssemblySkeletonMatchedSlots: ["rFoot", "rShin"],
      creatureSkeletonLoadedModelBoneCount: 3,
      creatureSkeletonLoadedModelBoneNodeNames: ["rootdummy", "rfoot_g", "rshin_g"],
      creatureSkeletonLoadedModelSourceModel: "pfh2",
      creatureSkeletonLoadedModelSupermodel: "a_fa",
      creatureSkeletonLoadedModelAnimationScale: 1.2,
      creatureSkeletonLoadedModelSourceSkinMeshCount: 1,
      creatureSkeletonLoadedModelSourceSkinWeightVertexCount: 4,
      creatureSkeletonLoadedModelSourceSkinInfluencingBoneNames: ["rootdummy", "rshin_g"],
      creatureSkeletonLoadedModelSourceSkinMaxInfluencesPerVertex: 2,
      creatureSkeletonLoadedModelSourceSkinRequiresWeightNormalization: true,
      creatureSkeletonLoadedModelAnimationCount: 1,
      creatureSkeletonLoadedModelAnimationNames: ["super_walk"],
      creatureSkeletonLoadedModelSourceAnimationCount: 1,
      creatureSkeletonLoadedModelSourceAnimationNames: ["super_walk"],
      creatureSkeletonLoadedModelSourceAnimationClipCount: 1,
      creatureSkeletonLoadedModelSourceAnimationClipNames: ["super_walk"],
      creatureSkeletonLoadedModelSourceHierarchyNodeCount: 3,
      creatureSkeletonLoadedModelSourceHierarchyRootNodeNames: ["rootdummy"],
      creatureSkeletonLoadedModelSourceHierarchyNodeTypes: ["dummy", "skin"],
      creatureSkeletonLoadedModelSourceHierarchyDummyNodeNames: ["rootdummy", "rshin_g"],
      creatureSkeletonLoadedModelSourceHierarchySynthesizedNodeCount: 2,
      creatureSkeletonLoadedModelSourceHierarchySynthesizedNodeNames: ["rootdummy", "rshin_g"],
      creaturePartModelGroupLoadedSkinnedMeshCount: 0,
      creaturePartModelGroupLoadedBoneCount: 3,
      creaturePartModelGroupLoadedAnimationCount: 0,
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["super_walk"]
    });
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    expect(partGroup?.userData).toMatchObject({
      creatureSkeletonModelLoadStatus: "loaded",
      creaturePartAssemblyMode: "skeleton-anchors",
      creaturePartAssemblySkeletonModelStatus: "anchored",
      creatureSkeletonLoadedModelBoneCount: 3,
      creatureSkeletonLoadedModelSourceModel: "pfh2",
      creatureSkeletonLoadedModelSupermodel: "a_fa",
      creatureSkeletonLoadedModelAnimationScale: 1.2,
      creatureSkeletonLoadedModelSourceSkinMeshCount: 1,
      creatureSkeletonLoadedModelSourceSkinWeightVertexCount: 4,
      creatureSkeletonLoadedModelSourceSkinInfluencingBoneNames: ["rootdummy", "rshin_g"],
      creatureSkeletonLoadedModelSourceSkinMaxInfluencesPerVertex: 2,
      creatureSkeletonLoadedModelSourceSkinRequiresWeightNormalization: true,
      creatureSkeletonLoadedModelAnimationCount: 1,
      creatureSkeletonLoadedModelAnimationNames: ["super_walk"],
      creatureSkeletonLoadedModelSourceAnimationCount: 1,
      creatureSkeletonLoadedModelSourceAnimationNames: ["super_walk"],
      creatureSkeletonLoadedModelSourceAnimationClipCount: 1,
      creatureSkeletonLoadedModelSourceAnimationClipNames: ["super_walk"],
      creatureSkeletonLoadedModelSourceHierarchyNodeCount: 3,
      creatureSkeletonLoadedModelSourceHierarchyRootNodeNames: ["rootdummy"],
      creatureSkeletonLoadedModelSourceHierarchyNodeTypes: ["dummy", "skin"],
      creatureSkeletonLoadedModelSourceHierarchyDummyNodeNames: ["rootdummy", "rshin_g"],
      creatureSkeletonLoadedModelSourceHierarchySynthesizedNodeCount: 2,
      creatureSkeletonLoadedModelSourceHierarchySynthesizedNodeNames: ["rootdummy", "rshin_g"],
      creaturePartModelGroupLoadedBoneCount: 3,
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["super_walk"]
    });
    const skeleton = partGroup?.children.find(
      (child) => child.userData?.creatureSkeletonModelStatus === "loaded"
    );
    const footAnchor = skeleton?.getObjectByName("rfoot_g");
    const shinAnchor = skeleton?.getObjectByName("rshin_g");
    expect(
      footAnchor?.children.some((child) => child.userData?.creaturePartSlot === "rFoot")
    ).toBe(true);
    expect(
      shinAnchor?.children.some((child) => child.userData?.creaturePartSlot === "rShin")
    ).toBe(true);
    expect(runtime.objectAnimationMixersById.get(creature.id)?.actionNames).toEqual([
      "super_walk"
    ]);
    expect(runtime.container.dataset.creatureAnimationMixerCount).toBe("1");
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("source-skins anchored robe CAPart vertices from the loaded base skeleton", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createMultiPartModelReadyCreatureRenderPayload();
    const robePart = {
      ...payload.renderPackage!.partModelCandidates[0]!,
      slot: "robe" as const,
      partId: 4,
      partModelName: "robe",
      nodeName: "root",
      modelPrefix: "pfh2_",
      modelResRef: "pfh2_robe004",
      assetId: "asset-robe-glb",
      glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-robe-glb.glb",
      source2daRow: 18
    };
    payload.renderPackage = {
      ...payload.renderPackage!,
      partModelCandidates: [robePart]
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      partModelCandidates: payload.renderPackage.partModelCandidates
    };

    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const robeModelCacheKey = "creature:cre_guard_captain:v1:part:robe:asset-robe-glb";
    const skeleton = createCachedSkeletonModel(true);
    skeleton.userData = {
      ...skeleton.userData,
      auroraGltfAnimationDurations: [1],
      auroraMdlSourceAnimationNames: ["super_walk"],
      auroraMdlSourceAnimationClipNames: ["super_walk"],
      auroraGltfAnimationNames: ["super_walk"]
    };
    Object.defineProperty(skeleton.userData, "auroraGltfAnimationClips", {
      configurable: true,
      enumerable: false,
      value: [
        new THREE.AnimationClip("super_walk", 1, [
          new THREE.VectorKeyframeTrack(
            "rshin_g.position",
            [0, 1],
            [
              0.25, 0.8, 0,
              0.25, 1.8, 0
            ]
          )
        ])
      ],
      writable: true
    });
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, skeleton);
    runtime.placeableModelCacheByUrl.set(robeModelCacheKey, createSourceSkinnedRobePartModel());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    const robeMesh = partGroup?.getObjectByName("pfh2_robe004g") as
      | THREE.Mesh
      | undefined;
    const position = robeMesh?.geometry.getAttribute("position") as
      | THREE.BufferAttribute
      | undefined;
    const initialY = position?.getY(0) ?? 0;

    expect(root?.userData).toMatchObject({
      creaturePartAssemblyMode: "skeleton-anchors",
      creaturePartAssemblySkeletonModelStatus: "anchored",
      creaturePartAssemblySkeletonMatchedSlots: ["robe"],
      creatureAnimationPlaybackStatus: "playing",
      creatureSourceSkinningStatus: "active",
      creatureSourceSkinningMode: "cpu-linear-blend",
      creatureSourceSkinningMeshCount: 1,
      creatureSourceSkinningWeightedVertexCount: 1,
      creatureSourceSkinningInfluencingBoneNames: ["rshin_g"],
      creatureSourceSkinningMissingBoneNames: []
    });
    expect(partGroup?.userData).toMatchObject({
      creaturePartAssemblyMode: "skeleton-anchors",
      creaturePartAssemblySkeletonMatchedSlots: ["robe"],
      creatureSourceSkinningStatus: "active",
      creatureSourceSkinningMode: "cpu-linear-blend",
      creatureSourceSkinningMeshCount: 1,
      creatureSourceSkinningWeightedVertexCount: 1,
      creatureSourceSkinningInfluencingBoneNames: ["rshin_g"],
      creatureSourceSkinningMissingBoneNames: []
    });
    expect(root?.userData.creatureSourceGeometryRuntimeEffectsStatus).toBeUndefined();
    expect(partGroup?.userData.creatureSourceGeometryRuntimeEffectsStatus).toBeUndefined();

    updateRuntimeObjectAnimationPlaybacks(runtime, 0.5);
    const animatedY = position?.getY(0) ?? 0;

    expect(robeMesh).toBeInstanceOf(THREE.Mesh);
    expect(animatedY).toBeGreaterThan(initialY + 0.05);
    expect(runtime.objectAnimationMixersById.get(creature.id)?.afterUpdate).toEqual(
      expect.any(Function)
    );
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("plays skeleton idle clips when only optional CAPart anchors are missing", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createMultiPartModelReadyCreatureRenderPayload();
    const missingLeftFootPart = {
      ...payload.renderPackage!.partModelCandidates[0]!,
      slot: "lFoot" as const,
      partId: 7,
      partModelName: "lfoot",
      nodeName: "lfoot_g",
      modelResRef: "pfh2_lfoot007",
      assetId: "asset-lfoot-glb",
      glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-lfoot-glb.glb",
      source2daRow: 3
    };
    payload.renderPackage = {
      ...payload.renderPackage!,
      partModelCandidates: [
        ...payload.renderPackage!.partModelCandidates,
        missingLeftFootPart
      ]
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      partModelCandidates: payload.renderPackage.partModelCandidates
    };
    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    const leftFootModelCacheKey = "creature:cre_guard_captain:v1:part:lFoot:asset-lfoot-glb";
    const skeleton = createCachedSkeletonModel(true);
    skeleton.userData = {
      ...skeleton.userData,
      auroraGltfAnimationNames: ["pause1"],
      auroraGltfAnimationDurations: [2.5],
      auroraMdlSourceAnimationNames: ["pause1"],
      auroraMdlSourceAnimationClipNames: ["pause1"]
    };
    Object.defineProperty(skeleton.userData, "auroraGltfAnimationClips", {
      configurable: true,
      enumerable: false,
      value: [new THREE.AnimationClip("pause1", 2.5, [])],
      writable: true
    });
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, skeleton);
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));
    runtime.placeableModelCacheByUrl.set(leftFootModelCacheKey, createCachedModel(1));

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creaturePartAssemblyMode: "skeleton-anchors",
      creaturePartAssemblySkeletonMatchedSlots: ["rFoot", "rShin"],
      creaturePartAssemblyMissingAttachmentTargets: ["lfoot_g"],
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackActionNames: ["pause1"],
      creatureAnimationAvailableClipNames: ["pause1"],
      creatureAnimationSelectedClipNames: ["pause1"],
      creatureAnimationSelectionMode: "single-clip"
    });
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    const skeletonRoot = partGroup?.children.find(
      (child) => child.userData?.creatureSkeletonModelStatus === "loaded"
    );
    expect(
      skeletonRoot
        ?.getObjectByName("rfoot_g")
        ?.children.some((child) => child.userData?.creaturePartSlot === "rFoot")
    ).toBe(true);
    expect(
      skeletonRoot
        ?.getObjectByName("rshin_g")
        ?.children.some((child) => child.userData?.creaturePartSlot === "rShin")
    ).toBe(true);
    const unanchoredLeftFoot = partGroup?.children.find(
      (child) => child.userData?.creaturePartSlot === "lFoot"
    );
    expect(unanchoredLeftFoot?.userData).toMatchObject({
      creaturePartAttachmentTarget: "lfoot_g"
    });
    expect(unanchoredLeftFoot?.userData.creaturePartSkeletonAnchorMatched).toBeUndefined();
    expect(runtime.objectAnimationMixersById.get(creature.id)?.actionNames).toEqual([
      "pause1"
    ]);
    expect(runtime.container.dataset.creatureAnimationMixerActionNames).toBe("pause1");
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("anchors robe CAPart models to the model root instead of duplicating rootdummy offsets", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createMultiPartModelReadyCreatureRenderPayload();
    const robePart = {
      ...payload.renderPackage!.partModelCandidates[0]!,
      slot: "robe" as const,
      partId: 5,
      partModelName: "robe",
      nodeName: "root",
      modelPrefix: "pfh2_",
      modelResRef: "pfh2_robe005",
      assetId: "asset-robe-glb",
      glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-robe-glb.glb",
      source2daRow: 18
    };
    const partModelCandidates = [
      ...payload.renderPackage!.partModelCandidates,
      robePart
    ];
    payload.renderPackage = {
      ...payload.renderPackage!,
      partModelCandidates
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      partModelCandidates
    };
    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    const robeModelCacheKey = "creature:cre_guard_captain:v1:part:robe:asset-robe-glb";
    const skeleton = createCachedSkeletonModel(true);
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, skeleton);
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));
    runtime.placeableModelCacheByUrl.set(robeModelCacheKey, createCachedModel(4));

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creaturePartAssemblyMode: "skeleton-anchors",
      creaturePartAssemblySkeletonMatchedSlots: ["rFoot", "rShin", "robe"],
      creaturePartAssemblyAttachmentTargets: ["rfoot_g", "rshin_g", "pfh2"]
    });
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    const skeletonRoot = partGroup?.children.find(
      (child) => child.userData?.creatureSkeletonModelStatus === "loaded"
    );
    const runtimeRootDummy = skeletonRoot?.getObjectByName("rootdummy");
    const robe = skeletonRoot?.children.find(
      (child) => child.userData?.creaturePartSlot === "robe"
    );

    expect(robe).toBeDefined();
    expect(robe?.parent).toBe(skeletonRoot);
    expect(
      runtimeRootDummy?.children.some((child) => child.userData?.creaturePartSlot === "robe")
    ).toBe(false);
    expect(robe?.userData.creaturePartNodeName).toBe("root");
    expect(robe?.userData.creaturePartAttachmentTarget).toBe("pfh2");
    expect(robe?.userData.creaturePartSkeletonAnchorMatched).toBe(true);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("uses part-prefix synthetic anchors when a prefix-mismatched skeleton would misattach part targets", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createMultiPartModelReadyCreatureRenderPayload();
    const skeletonModelCandidate = {
      resref: "pmh9",
      role: "base-skeleton" as const,
      source: "part-model-prefix" as const,
      modelPrefix: "pmh9_",
      confidence: "prefix-derived" as const,
      assetId: "asset-pmh9-glb",
      glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-pmh9-glb.glb"
    };
    const partModelCandidates = payload.renderPackage!.partModelCandidates.map((candidate) =>
      candidate.slot === "rFoot"
        ? {
            ...candidate,
            modelPrefix: "pmh0_",
            modelResRef: "pmh0_footr001"
          }
        : {
            ...candidate,
            modelPrefix: "pmh0_",
            modelResRef: "pmh0_shinr001"
          }
    );
    const sourceMdlInspection = {
      source: "source-mdl" as const,
      diagnostics: [],
      models: [
        {
          source: "aurora-mdl-ascii" as const,
          sourceModelAssetId: "asset-pmh9-mdl",
          sourceModelFileName: "pmh9.mdl",
          sourceModelObjectKey: "modules/current/pmh9.mdl",
          modelName: "pmh9",
          nodeCount: 3,
          rootNodeNames: ["rootdummy"],
          nodeTypes: ["dummy"],
          nodeTypeCounts: { dummy: 3 },
          nodes: [
            { name: "rootdummy", nodeType: "dummy", position: [0, 0, 0] },
            {
              name: "rfoot_g",
              nodeType: "dummy",
              parentName: "rootdummy",
              position: [0.25, 0, -0.1]
            },
            {
              name: "rshin_g",
              nodeType: "dummy",
              parentName: "rootdummy",
              position: [0.25, 0, -0.8]
            }
          ],
          animationCount: 0,
          animationNames: [],
          animations: [],
          meshCount: 0,
          textureReferences: []
        }
      ]
    };
    payload.renderPackage = {
      ...payload.renderPackage!,
      skeletonModelCandidates: [skeletonModelCandidate],
      partModelCandidates,
      sourceMdlInspection
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      skeletonModelCandidates: [skeletonModelCandidate],
      partModelCandidates,
      sourceMdlInspection
    };
    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pmh9-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, new THREE.Group());
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureSkeletonModelLoadStatus: "part-prefix-synthetic",
      creatureSkeletonModelResRef: "pmh9",
      creaturePartAssemblyMode: "skeleton-anchors",
      creaturePartAssemblyAxis: "skeleton-nodes",
      creaturePartAssemblySkeletonModelStatus: "anchored",
      creaturePartAssemblySkeletonCompatibilityStatus: "compatible",
      creaturePartAssemblySkeletonPrefix: "pmh0",
      creaturePartAssemblyDominantPartPrefix: "pmh0",
      creaturePartAssemblySkeletonAnchorCoveredCount: null,
      creaturePartAssemblySkeletonAnchorTargetCount: null,
      creaturePartAssemblySkeletonMatchedSlots: ["rFoot", "rShin"],
      creatureSourceMdlAnchorSkeletonStatus: "synthetic-part-targets"
    });
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    const skeleton = partGroup?.children.find(
      (child) => child.userData?.creatureSkeletonModelStatus === "part-prefix-synthetic"
    );
    expect(partGroup?.userData).toMatchObject({
      creaturePartAssemblyMode: "skeleton-anchors",
      creaturePartAssemblySkeletonModelStatus: "anchored",
      creaturePartAssemblySkeletonCompatibilityStatus: "compatible",
      creaturePartAssemblySkeletonPrefix: "pmh0",
      creaturePartAssemblyDominantPartPrefix: "pmh0",
      creaturePartAssemblySkeletonAnchorCoveredCount: null,
      creaturePartAssemblySkeletonAnchorTargetCount: null,
      creatureSourceMdlAnchorSkeletonStatus: "synthetic-part-targets"
    });
    const footAnchor = skeleton?.getObjectByName("rfoot_g");
    const shinAnchor = skeleton?.getObjectByName("rshin_g");
    expect(
      footAnchor?.children.some((child) => child.userData?.creaturePartSlot === "rFoot")
    ).toBe(true);
    expect(
      shinAnchor?.children.some((child) => child.userData?.creaturePartSlot === "rShin")
    ).toBe(true);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("uses part-prefix synthetic anchors even when fallback-phenotype anchors cover all part targets", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createMultiPartModelReadyCreatureRenderPayload();
    const skeletonModelCandidate = {
      resref: "pmh9",
      role: "base-skeleton" as const,
      source: "part-model-prefix" as const,
      modelPrefix: "pmh9_",
      confidence: "prefix-derived" as const,
      assetId: "asset-pmh9-glb",
      glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-pmh9-glb.glb"
    };
    const partModelCandidates = payload.renderPackage!.partModelCandidates.map((candidate) =>
      candidate.slot === "rFoot"
        ? {
            ...candidate,
            modelPrefix: "pmh0_",
            modelResRef: "pmh0_footr001"
          }
        : {
            ...candidate,
            modelPrefix: "pmh0_",
            modelResRef: "pmh0_shinr001"
          }
    );
    payload.renderPackage = {
      ...payload.renderPackage!,
      skeletonModelCandidates: [skeletonModelCandidate],
      partModelCandidates
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      skeletonModelCandidates: [skeletonModelCandidate],
      partModelCandidates
    };
    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pmh9-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, createCachedSkeletonModel(false));
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureSkeletonModelLoadStatus: "part-prefix-synthetic",
      creatureSkeletonModelResRef: "pmh9",
      creaturePartAssemblyMode: "skeleton-anchors",
      creaturePartAssemblyAxis: "skeleton-nodes",
      creaturePartAssemblySkeletonModelStatus: "anchored",
      creaturePartAssemblySkeletonCompatibilityStatus: "compatible",
      creaturePartAssemblySkeletonPrefix: "pmh0",
      creaturePartAssemblyDominantPartPrefix: "pmh0",
      creaturePartAssemblySkeletonAnchorCoveredCount: null,
      creaturePartAssemblySkeletonAnchorTargetCount: null,
      creaturePartAssemblySkeletonMatchedSlots: ["rFoot", "rShin"],
      creatureSourceMdlAnchorSkeletonStatus: "synthetic-part-targets"
    });
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    const skeleton = partGroup?.children.find(
      (child) => child.userData?.creatureSkeletonModelStatus === "part-prefix-synthetic"
    );
    expect(partGroup?.userData).toMatchObject({
      creaturePartAssemblyMode: "skeleton-anchors",
      creaturePartAssemblySkeletonModelStatus: "anchored",
      creaturePartAssemblySkeletonCompatibilityStatus: "compatible",
      creaturePartAssemblySkeletonPrefix: "pmh0",
      creaturePartAssemblyDominantPartPrefix: "pmh0",
      creatureSourceMdlAnchorSkeletonStatus: "synthetic-part-targets"
    });
    expect(skeleton?.getObjectByName("torso_skin")).toBeUndefined();
    const footAnchor = skeleton?.getObjectByName("rfoot_g");
    const shinAnchor = skeleton?.getObjectByName("rshin_g");
    expect(
      footAnchor?.children.some((child) => child.userData?.creaturePartSlot === "rFoot")
    ).toBe(true);
    expect(
      shinAnchor?.children.some((child) => child.userData?.creaturePartSlot === "rShin")
    ).toBe(true);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("builds part-prefix synthetic anchors instead of bbox stacking when a prefix-mismatched skeleton lacks part anchors", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createMultiPartModelReadyCreatureRenderPayload();
    const skeletonModelCandidate = {
      resref: "pmh9",
      role: "base-skeleton" as const,
      source: "part-model-prefix" as const,
      modelPrefix: "pmh9_",
      confidence: "prefix-derived" as const,
      assetId: "asset-pmh9-glb",
      glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-pmh9-glb.glb"
    };
    const partModelCandidates = payload.renderPackage!.partModelCandidates.map((candidate) =>
      candidate.slot === "rFoot"
        ? {
            ...candidate,
            modelPrefix: "pmh0_",
            modelResRef: "pmh0_footr001"
          }
        : {
            ...candidate,
            modelPrefix: "pmh0_",
            modelResRef: "pmh0_shinr001"
          }
    );
    payload.renderPackage = {
      ...payload.renderPackage!,
      skeletonModelCandidates: [skeletonModelCandidate],
      partModelCandidates
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      skeletonModelCandidates: [skeletonModelCandidate],
      partModelCandidates
    };
    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pmh9-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    const sparseSkeleton = new THREE.Group();
    const rootBone = new THREE.Bone();
    rootBone.name = "rootdummy";
    sparseSkeleton.add(rootBone);
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, sparseSkeleton);
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureSkeletonModelLoadStatus: "part-prefix-synthetic",
      creatureSkeletonModelResRef: "pmh9",
      creaturePartAssemblyMode: "skeleton-anchors",
      creaturePartAssemblyAxis: "skeleton-nodes",
      creaturePartAssemblySkeletonModelStatus: "anchored",
      creaturePartAssemblySkeletonCompatibilityStatus: "compatible",
      creaturePartAssemblySkeletonPrefix: "pmh0",
      creaturePartAssemblyDominantPartPrefix: "pmh0",
      creaturePartAssemblySkeletonAnchorCoveredCount: null,
      creaturePartAssemblySkeletonAnchorTargetCount: null,
      creaturePartAssemblySkeletonMatchedSlots: ["rFoot", "rShin"],
      creatureSourceMdlAnchorSkeletonStatus: "synthetic-part-targets"
    });
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    const skeleton = partGroup?.children.find(
      (child) => child.userData?.creatureSkeletonModelStatus === "part-prefix-synthetic"
    );
    const footAnchor = skeleton?.getObjectByName("rfoot_g");
    const shinAnchor = skeleton?.getObjectByName("rshin_g");
    expect(skeleton).toBeDefined();
    expect(
      footAnchor?.children.some((child) => child.userData?.creaturePartSlot === "rFoot")
    ).toBe(true);
    expect(
      shinAnchor?.children.some((child) => child.userData?.creaturePartSlot === "rShin")
    ).toBe(true);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("synthesizes source-MDL skeleton anchors when the skeleton GLB has no nodes", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createFullPlayerBodyPartModelReadyCreatureRenderPayload();
    const skeletonModelCandidate = {
      resref: "pmh0",
      role: "base-skeleton" as const,
      source: "part-model-prefix" as const,
      modelPrefix: "pmh0_",
      confidence: "prefix-derived" as const,
      assetId: "asset-pmh0-glb",
      glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-pmh0-glb.glb"
    };
    const rightHandSourceOrientation: [number, number, number, number] = [
      0,
      Math.SQRT1_2,
      0,
      Math.SQRT1_2
    ];
    const sourceMdlInspection = {
      source: "source-mdl" as const,
      diagnostics: [],
      models: [
        {
          source: "aurora-mdl-binary" as const,
          sourceModelAssetId: "asset-pmh0-mdl",
          sourceModelFileName: "pmh0.mdl",
          sourceModelObjectKey: "modules/current/pmh0.mdl",
          modelName: "pmh0",
          nodeCount: 18,
          rootNodeNames: ["rootdummy"],
          nodeTypes: ["dummy"],
          nodeTypeCounts: { dummy: 17 },
          nodes: [
            { name: "rootdummy", nodeType: "dummy", position: [0, 0, 0] },
            { name: "torso_g", nodeType: "dummy", parentName: "rootdummy", position: [0, 0, 0] },
            { name: "neck_g", nodeType: "dummy", parentName: "torso_g", position: [0, 0, 0.45] },
            { name: "head_g", nodeType: "dummy", parentName: "neck_g", position: [0, 0, 0.1] },
            { name: "head", nodeType: "dummy", parentName: "head_g", position: [0, 0, 0.22] },
            { name: "pelvis_g", nodeType: "dummy", parentName: "rootdummy", position: [0, 0, 0] },
            { name: "lbicep_g", nodeType: "dummy", parentName: "torso_g", position: [-0.2, 0, 0.35] },
            { name: "lforearm_g", nodeType: "dummy", parentName: "lbicep_g", position: [-0.04, 0, -0.3] },
            { name: "lhand_g", nodeType: "dummy", parentName: "lforearm_g", position: [-0.03, 0, -0.3] },
            { name: "rbicep_g", nodeType: "dummy", parentName: "torso_g", position: [0.2, 0, 0.35] },
            { name: "rforearm_g", nodeType: "dummy", parentName: "rbicep_g", position: [0.04, 0, -0.3] },
            {
              name: "rhand_g",
              nodeType: "dummy",
              parentName: "rforearm_g",
              position: [0.03, 0.12, -0.3],
              orientation: rightHandSourceOrientation,
              orientationFormat: "quaternion" as const
            },
            { name: "lthigh_g", nodeType: "dummy", parentName: "pelvis_g", position: [-0.1, 0, -0.18] },
            { name: "lshin_g", nodeType: "dummy", parentName: "lthigh_g", position: [0.03, 0, -0.46] },
            { name: "lfoot_g", nodeType: "dummy", parentName: "lshin_g", position: [0.02, 0, -0.42] },
            { name: "rthigh_g", nodeType: "dummy", parentName: "pelvis_g", position: [0.1, 0, -0.18] },
            { name: "rshin_g", nodeType: "dummy", parentName: "rthigh_g", position: [-0.03, 0, -0.46] },
            { name: "rfoot_g", nodeType: "dummy", parentName: "rshin_g", position: [-0.02, 0, -0.42] }
          ],
          animationCount: 0,
          animationNames: [],
          animations: [],
          meshCount: 0,
          textureReferences: []
        }
      ]
    };
    payload.renderPackage = {
      ...payload.renderPackage!,
      skeletonModelCandidates: [skeletonModelCandidate],
      sourceMdlInspection
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      skeletonModelCandidates: [skeletonModelCandidate],
      sourceMdlInspection
    };

    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pmh0-glb";
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, new THREE.Group());
    payload.renderPackage!.partModelCandidates.forEach((candidate) => {
      const modelCacheKey = `creature:${payload.cacheKey}:part:${candidate.slot}:${candidate.assetId}`;
      runtime.placeableModelCacheByUrl.set(modelCacheKey, createCachedModel(1));
    });

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureSourceMdlAnchorSkeletonStatus: "synthesized",
      creatureSourceMdlAnchorSkeletonModelName: "pmh0",
      creatureSourceMdlAnchorSkeletonOrientationCount: 1,
      creaturePartAssemblyMode: "skeleton-anchors",
      creaturePartAssemblyAxis: "skeleton-nodes",
      creaturePartAssemblySkeletonMatchedSlots: expect.arrayContaining([
        "torso",
        "pelvis",
        "head",
        "lHand",
        "rHand",
        "lFoot",
        "rFoot"
      ])
    });

    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    const skeleton = partGroup?.children.find(
      (child) => child.userData?.creatureSourceMdlAnchorSkeletonStatus === "synthesized"
    );
    const rightHandAnchor = skeleton?.getObjectByName("rhand_g");
    const expectedRightHandQuaternion = new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(0, 0, -1), Math.PI / 2)
      .normalize();
    expect(rightHandAnchor?.userData).toMatchObject({
      creatureSourceMdlAnchorOrientation: rightHandSourceOrientation,
      creatureSourceMdlAnchorOrientationFormat: "quaternion"
    });
    expect(rightHandAnchor?.position.x).toBeCloseTo(0.03);
    expect(rightHandAnchor?.position.y).toBeCloseTo(-0.3);
    expect(rightHandAnchor?.position.z).toBeCloseTo(0.12);
    expect(
      Math.abs(rightHandAnchor?.quaternion.dot(expectedRightHandQuaternion) ?? 0)
    ).toBeGreaterThan(0.999);
    const bodyParts: THREE.Object3D[] = [];
    skeleton?.traverse((node) => {
      if (node.userData?.creaturePartSlot) {
        bodyParts.push(node);
      }
    });
    expect(bodyParts).toHaveLength(16);
    expect(bodyParts.map((part) => part.userData.creaturePartSlot)).toEqual(
      expect.arrayContaining(["head", "torso", "lHand", "rHand", "lFoot", "rFoot"])
    );
    const headAnchor = skeleton?.getObjectByName("head_g");
    const headPart = headAnchor?.children.find(
      (child) => child.userData?.creaturePartSlot === "head"
    );
    expect(headAnchor?.parent?.name).toBe("neck_g");
    expect(headPart?.userData).toMatchObject({
      creaturePartAttachmentTarget: "head_g",
      creaturePartSkeletonAnchorName: "head_g",
      creaturePartAttachmentCorrection: "head-g-anchor",
      creaturePartAttachmentCorrectionYaw: 0
    });
    expect(headPart?.position.y).toBe(0);
    expect(headPart?.quaternion.y).toBeCloseTo(0);
    bodyParts.forEach((part) => {
      expect(part.userData).toMatchObject({
        creaturePartAssemblyMode: "skeleton-anchors",
        creaturePartSkeletonAnchorMatched: true
      });
      expect(part.position.x).toBe(0);
      expect(part.position.y).toBe(0);
      expect(part.position.z).toBe(0);
    });
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("builds a source-backed synthetic skeleton when a base skeleton candidate has no GLB", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createFullPlayerBodyPartModelReadyCreatureRenderPayload();
    const skeletonModelCandidate = {
      resref: "pmh0",
      role: "base-skeleton" as const,
      source: "part-model-prefix" as const,
      modelPrefix: "pmh0_",
      confidence: "prefix-derived" as const,
      assetId: "asset-pmh0-mdl"
    };
    payload.renderPackage = {
      ...payload.renderPackage!,
      skeletonModelCandidates: [skeletonModelCandidate]
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      skeletonModelCandidates: [skeletonModelCandidate]
    };
    payload.renderPackage!.partModelCandidates.forEach((candidate) => {
      const modelCacheKey = `creature:${payload.cacheKey}:part:${candidate.slot}:${candidate.assetId}`;
      runtime.placeableModelCacheByUrl.set(modelCacheKey, createCachedModel(1));
    });

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureSkeletonModelCandidateResRefs: ["pmh0"],
      creatureSkeletonModelCandidateUrlReadyCount: 0,
      creatureSkeletonModelLoadStatus: "source-mdl-synthetic",
      creaturePartAssemblyMode: "skeleton-anchors",
      creaturePartAssemblyAxis: "skeleton-nodes",
      creaturePartAssemblySkeletonModelStatus: "anchored",
      creaturePartAssemblySkeletonCompatibilityStatus: "compatible",
      creaturePartAssemblySkeletonPrefix: "pmh0",
      creaturePartAssemblyDominantPartPrefix: "pmh0",
      creatureSourceMdlAnchorSkeletonStatus: "synthetic-part-targets",
      creatureSyntheticPartTargetAnchorCoveredCount: 16,
      creatureSyntheticPartTargetAnchorTargetCount: 16,
      creaturePartAssemblySkeletonMatchedSlots: expect.arrayContaining([
        "head",
        "torso",
        "pelvis",
        "lHand",
        "rHand",
        "lFoot",
        "rFoot"
      ])
    });
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    const skeleton = partGroup?.children.find(
      (child) => child.userData?.creatureSkeletonModelStatus === "source-mdl-synthetic"
    );
    expect(skeleton?.userData).toMatchObject({
      creatureSkeletonModelCacheKey:
        "creature:cre_guard_captain:v1:skeleton-source:asset-pmh0-mdl",
      creatureSkeletonModelResRef: "pmh0",
      creatureSourceMdlAnchorSkeletonStatus: "synthetic-part-targets",
      creatureSourceMdlAnchorSkeletonNodeCount: 22
    });
    const headAnchor = skeleton?.getObjectByName("head_g");
    expect(headAnchor?.parent?.name).toBe("neck_g");
    expect(
      headAnchor?.children.some((child) => child.userData?.creaturePartSlot === "head")
    ).toBe(true);
    const rightHandAnchor = skeleton?.getObjectByName("rhand_g");
    expect(
      rightHandAnchor?.children.some((child) => child.userData?.creaturePartSlot === "rHand")
    ).toBe(true);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("reanchors source-backed equipment markers to loaded skeleton attachment nodes", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createCreatureRenderPayloadWithEquipment(
      createMultiPartModelReadyCreatureRenderPayload()
    );
    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    const equipmentPartCacheKey =
      "creature:cre_guard_captain:v1:equipment:nw_wswmls001:asset-wswb-glb";
    const equipmentPartRuntimeCacheKey = equipmentPartCacheKey;
    const skeletonModel = createCachedSkeletonModel(false);
    const rootDummy = skeletonModel.getObjectByName("rootdummy");
    const rightHand = new THREE.Bone();
    rightHand.name = "rhand_g";
    rootDummy?.add(rightHand);
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, skeletonModel);
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));
    runtime.placeableModelCacheByUrl.set(
      equipmentPartRuntimeCacheKey,
      createCachedModel(0.6)
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      {
        ...createDebugState(),
        showNonRenderMeshes: true
      },
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const markers = collectCreatureEquipmentMarkers(root);
    expect(root?.userData).toMatchObject({
      creatureEquipmentMarkerStatus: "source-equipment-marker",
      creatureEquipmentMarkerMode: "skeleton-anchors",
      creatureEquipmentMarkerCount: 1,
      creatureEquipmentMarkerAnchoredCount: 1,
      creatureEquipmentMarkerFallbackCount: 0,
      creatureEquipmentMarkerResRefs: ["nw_wswmls001"],
      creatureEquipmentMarkerAttachmentTargets: ["rhand_g"],
      creatureEquipmentMarkerModelParts: [[2, 1, 3]],
      creatureEquipmentMarkerModelPartRoles: [["blade", "middle", "top"]],
      creatureEquipmentMarkerModelPartResRefs: [["wswb_002", "wswm_001", "wswt_003"]],
      creatureEquipmentMarkerModelPartUrlReadyCount: 1
    });
    expect(markers).toHaveLength(1);
    expect(markers[0]?.userData).toMatchObject({
      creatureEquipmentMarkerResRef: "nw_wswmls001",
      creatureEquipmentMarkerAttachmentTarget: "rhand_g",
      creatureEquipmentMarkerMode: "skeleton-anchor",
      creatureEquipmentMarkerSkeletonAnchorName: "rhand_g",
      creatureEquipmentMarkerModelParts: [2, 1, 3],
      creatureEquipmentMarkerModelPartRoles: ["blade", "middle", "top"],
      creatureEquipmentMarkerModelPartResRefs: ["wswb_002", "wswm_001", "wswt_003"],
      creatureEquipmentMarkerModelPartUrls: [
        "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wswb-glb.glb"
      ]
    });
    expect(markers[0]?.parent?.name).toBe("rhand_g");
    expect(markers[0]?.position.toArray()).toEqual([0, 0, 0]);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("anchors single robe CAPart models to rootdummy when node names are absent", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createMultiPartModelReadyCreatureRenderPayload();
    const { nodeName: _nodeName, ...basePartCandidate } =
      payload.renderPackage!.partModelCandidates[0]!;
    const robePartCandidate = {
      ...basePartCandidate,
      slot: "robe" as const,
      partId: 7,
      partModelName: "robe",
      modelResRef: "pfh2_robe007",
      assetId: "asset-robe-glb",
      glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-robe-glb.glb",
      source2daRow: 7
    };
    payload.renderPackage = {
      ...payload.renderPackage!,
      partModelCandidates: [robePartCandidate]
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      partModelCandidates: [robePartCandidate]
    };
    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const robeModelCacheKey = "creature:cre_guard_captain:v1:part:robe:asset-robe-glb";
    const skeletonModel = createCachedSkeletonModel(false);
    const rootDummy = skeletonModel.getObjectByName("rootdummy");
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, skeletonModel);
    runtime.placeableModelCacheByUrl.set(
      `${robeModelCacheKey}${CREATURE_PART_SOURCE_HIERARCHY_CACHE_SUFFIX}`,
      createCachedModel(2)
    );

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creaturePartAssemblyMode: "skeleton-anchors",
      creaturePartAssemblyAxis: "skeleton-nodes",
      creaturePartAssemblyAttachmentTargets: ["rootdummy"],
      creaturePartModelGroupSourceHierarchyMode: "preserve-loaded",
      creaturePartAssemblySkeletonMatchedSlots: ["robe"]
    });
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    const skeletonRoot = partGroup?.children.find(
      (child) => child.userData?.creatureSkeletonModelStatus === "loaded"
    );
    const runtimeRootDummy = skeletonRoot?.getObjectByName("rootdummy");
    const robePart = runtimeRootDummy?.children.find(
      (child) => child.userData?.creaturePartSlot === "robe"
    );

    expect(partGroup?.userData).toMatchObject({
      creaturePartAssemblyMode: "skeleton-anchors",
      creaturePartModelGroupSourceHierarchyMode: "preserve-loaded",
      creaturePartAssemblyAttachmentTargets: ["rootdummy"]
    });
    expect(robePart?.userData).toMatchObject({
      creaturePartSlot: "robe",
      creaturePartId: 7,
      creaturePartModelResRef: "pfh2_robe007",
      creaturePartNodeName: "",
      creaturePartAttachmentTarget: "rootdummy",
      creaturePartSkeletonAnchorMatched: true
    });
    expect(robePart?.parent).toBe(runtimeRootDummy);
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("plays explicit supermodel clips on anchored multipart creature skeletons", async () => {
    const runtime = createRuntime();
    const creature: SceneObject = {
      ...createCreatureObject(),
      creatureProperties: {
        advancedSettings: {
          animationName: "super_walk"
        }
      }
    };
    const payload = createMultiPartModelReadyCreatureRenderPayload();
    const wingPartCandidate = {
      ...payload.renderPackage!.partModelCandidates[0]!,
      slot: "wings" as const,
      partId: 1,
      partModelName: "wings",
      nodeName: "torso_g",
      modelResRef: "c_wingsan",
      assetId: "asset-wings-glb",
      glbUrl:
        "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-wings-glb.glb",
      source: "wingmodel.2da.MODEL" as const,
      source2daRow: 1
    };
    payload.renderPackage = {
      ...payload.renderPackage!,
      partModelCandidates: [
        ...payload.renderPackage!.partModelCandidates,
        wingPartCandidate
      ],
      skeletonModelCandidates: payload.renderPackage!.skeletonModelCandidates.map((candidate) => ({
        ...candidate,
        supermodelResRef: "a_fa",
        supermodelAssetId: "asset-a-fa-glb",
        supermodelGlbUrl:
          "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-fa-glb.glb"
      }))
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      partModelCandidates: payload.renderPackage.partModelCandidates,
      skeletonModelCandidates: payload.renderPackage.skeletonModelCandidates
    };
    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const supermodelCacheKey = "creature:cre_guard_captain:v1:supermodel:asset-a-fa-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    const wingModelCacheKey = "creature:cre_guard_captain:v1:part:wings:asset-wings-glb";
    const skeletonModel = createCachedSkeletonModel(false);
    skeletonModel.userData = {
      ...skeletonModel.userData,
      auroraMdlSourceModel: "pfh2",
      auroraMdlSupermodel: "a_fa",
      auroraMdlAnimationScale: 1.2,
      auroraMdlSourceAnimationCount: 1,
      auroraMdlSourceAnimationNames: ["super_walk"],
      auroraMdlSourceAnimationClipCount: 1,
      auroraMdlSourceAnimationClipNames: ["super_walk"],
      auroraGltfAnimationCount: 1,
      auroraGltfAnimationNames: ["super_walk"],
      auroraGltfAnimationDurations: [1],
      auroraGltfHasAnimations: true
    };
    Object.defineProperty(skeletonModel.userData, "auroraGltfAnimationClips", {
      configurable: true,
      enumerable: false,
      value: [
        new THREE.AnimationClip("super_walk", 1, [
          new THREE.VectorKeyframeTrack(
            "rshin_g.position",
            [0, 1],
            [0.25, 0.8, 0, 0.25, 1.4, 0]
          ),
          new THREE.VectorKeyframeTrack(
            "gargoyle_rwingfingera01.position",
            [0, 1],
            [0, 0, 0, 0, 0.6, 0]
          )
        ])
      ],
      writable: true
    });
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, skeletonModel);
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedLimbSupermodelAnimationModel()
    );
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));
    const wingModel = createCachedModel(0.35);
    wingModel.name = "c_wingsan";
    const wingMesh = wingModel.children.find(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh
    );
    if (wingMesh) {
      wingMesh.name = "gargoyle_rwingfingera01";
    }
    runtime.placeableModelCacheByUrl.set(wingModelCacheKey, wingModel);

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    const skeleton = partGroup?.children.find(
      (child) => child.userData?.creatureSkeletonModelStatus === "loaded"
    );
    expect(skeleton?.userData).toMatchObject({
      creatureAnchorSkeletonRenderGeometryStatus: "suppressed",
      creatureAnchorSkeletonRenderGeometrySuppressedCount: 1
    });
    expect(partGroup?.userData).toMatchObject({
      creatureSkeletonSupermodelLoadStatus: "loaded",
      creatureSkeletonSupermodelResRef: "a_fa",
      creatureSkeletonSupermodelCacheKey: supermodelCacheKey,
      creatureSkeletonSupermodelClipCount: 1,
      creatureSkeletonSupermodelClipNames: ["super_walk"],
      creatureSkeletonSupermodelLoadedModelSourceModel: "a_fa",
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackRootMode: "model-root",
      creatureAnimationPlaybackInitialPoseApplied: true,
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["super_walk"]
    });
    const playback = runtime.objectAnimationMixersById.get(creature.id);
    expect(playback?.root).toBe(partGroup);
    expect(playback?.actionNames).toEqual(["super_walk"]);
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackRootModes).toBe(
      "model-root"
    );
    expect(
      runtime.container.dataset.creatureAnimationMixerSuppressedMissingTargetTrackCounts
    ).toBe("");
    expect(
      runtime.container.dataset.creatureAnimationMixerSuppressedMissingTargetTrackNames
    ).toBe("");
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackStatuses).toBe("playing");
    expect(runtime.container.dataset.creatureAnimationMixerInitialPoseApplied).toBe("true");
    expect(runtime.container.dataset.creaturePartModelRuntimeSkeletonMeshCount).toBe("1");
    expect(
      runtime.container.dataset.creaturePartModelRuntimeSuppressedSkeletonMeshCount
    ).toBe("1");
    expect(runtime.container.dataset.creaturePartModelRuntimeVisibleSkeletonMeshCount).toBe(
      "0"
    );
    expect(runtime.container.dataset.creaturePartModelRuntimeVisibleSkeletonMeshNames).toBe(
      ""
    );
    const shinAnchor = skeleton?.getObjectByName("rshin_g");
    const shinPart = shinAnchor?.children.find(
      (child) => child.userData?.creaturePartSlot === "rShin"
    );
    const shinAnchorPositionBefore = new THREE.Vector3();
    shinAnchor?.getWorldPosition(shinAnchorPositionBefore);
    const shinPartPositionBefore = new THREE.Vector3();
    shinPart?.getWorldPosition(shinPartPositionBefore);
    const shinPartAnchorOffsetBefore = shinPartPositionBefore
      .clone()
      .sub(shinAnchorPositionBefore);
    const wing = partGroup?.getObjectByName("gargoyle_rwingfingera01");
    const wingPositionBefore = new THREE.Vector3();
    wing?.getWorldPosition(wingPositionBefore);
    for (let index = 0; index < 5; index += 1) {
      updateRuntimeObjectAnimationPlaybacks(runtime, 0.1);
    }

    const shinAnchorPositionAfter = new THREE.Vector3();
    shinAnchor?.getWorldPosition(shinAnchorPositionAfter);
    const shinPartPositionAfter = new THREE.Vector3();
    shinPart?.getWorldPosition(shinPartPositionAfter);
    const shinPartAnchorOffsetAfter = shinPartPositionAfter
      .clone()
      .sub(shinAnchorPositionAfter);
    const wingPositionAfter = new THREE.Vector3();
    wing?.getWorldPosition(wingPositionAfter);
    expect(Math.abs(shinAnchorPositionAfter.y - shinAnchorPositionBefore.y)).toBeGreaterThan(
      0.01
    );
    expect(Math.abs(wingPositionAfter.y - wingPositionBefore.y)).toBeGreaterThan(0.01);
    expect(shinPartAnchorOffsetAfter.y).toBeCloseTo(shinPartAnchorOffsetBefore.y);
    expect(root?.userData).toMatchObject({
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackActionNames: ["super_walk"]
    });
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("auto-plays only safe idle clips on anchored multipart creature skeletons", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createMultiPartModelReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      skeletonModelCandidates: payload.renderPackage!.skeletonModelCandidates.map((candidate) => ({
        ...candidate,
        supermodelResRef: "a_fa",
        supermodelAssetId: "asset-a-fa-glb",
        supermodelGlbUrl:
          "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-fa-glb.glb"
      }))
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      skeletonModelCandidates: payload.renderPackage.skeletonModelCandidates
    };
    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const supermodelCacheKey = "creature:cre_guard_captain:v1:supermodel:asset-a-fa-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, createCachedSkeletonModel(false));
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedLimbIdleSupermodelAnimationModel()
    );
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    const skeleton = partGroup?.children.find(
      (child) => child.userData?.creatureSkeletonModelStatus === "loaded"
    );
    expect(partGroup?.userData).toMatchObject({
      creatureSkeletonSupermodelLoadStatus: "loaded",
      creatureSkeletonSupermodelClipCount: 2,
      creatureSkeletonSupermodelClipNames: ["super_walk", "pause1"],
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackRootMode: "model-root",
      creatureAnimationPlaybackInitialPoseApplied: true,
      creatureAnimationPlaybackClipCount: 1,
      creatureAnimationPlaybackActionNames: ["pause1"],
      creatureAnimationAvailableClipNames: ["super_walk", "pause1"],
      creatureAnimationSelectedClipNames: ["pause1"],
      creatureAnimationSelectionMode: "single-idle-clip"
    });
    const playback = runtime.objectAnimationMixersById.get(creature.id);
    expect(skeleton).toBeTruthy();
    expect(playback?.root).toBe(partGroup);
    expect(playback?.actionNames).toEqual(["pause1"]);
    expect(runtime.container.dataset.creatureAnimationMixerCount).toBe("1");
    expect(runtime.container.dataset.creatureAnimationMixerActionNames).toBe("pause1");
    expect(runtime.container.dataset.creatureAnimationMixerPlaybackRootModes).toBe(
      "model-root"
    );
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("ignores stale multipart creature loads after changing the selected animation", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const animatedCreature: SceneObject = {
      ...creature,
      creatureProperties: {
        advancedSettings: {
          animationName: "super_walk"
        }
      } as NonNullable<SceneObject["creatureProperties"]>
    };
    const payload = createMultiPartModelReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      skeletonModelCandidates: payload.renderPackage!.skeletonModelCandidates.map((candidate) => ({
        ...candidate,
        supermodelResRef: "a_fa",
        supermodelAssetId: "asset-a-fa-glb",
        supermodelGlbUrl:
          "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-a-fa-glb.glb"
      }))
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      skeletonModelCandidates: payload.renderPackage.skeletonModelCandidates
    };
    const skeletonModelCacheKey = "creature:cre_guard_captain:v1:skeleton:asset-pfh2-glb";
    const supermodelCacheKey = "creature:cre_guard_captain:v1:supermodel:asset-a-fa-glb";
    const footModelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const shinModelCacheKey = "creature:cre_guard_captain:v1:part:rShin:asset-rshin-glb";
    runtime.placeableModelCacheByUrl.set(skeletonModelCacheKey, createCachedSkeletonModel(false));
    runtime.placeableModelCacheByUrl.set(
      supermodelCacheKey,
      createCachedSupermodelAnimationModel()
    );
    runtime.placeableModelCacheByUrl.set(footModelCacheKey, createCachedModel(1));
    runtime.placeableModelCacheByUrl.set(shinModelCacheKey, createCachedModel(2));

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    rebuildObjectMeshes(
      runtime,
      [animatedCreature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    const partGroups =
      root?.children.filter(
        (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
      ) ?? [];
    expect(partGroups).toHaveLength(1);
    expect(root?.userData.renderPackageModelRequestSignature).toContain(
      "animation:super_walk"
    );
    expect(root?.userData).toMatchObject({
      creatureAnimationPlaybackStatus: "playing",
      creatureAnimationPlaybackActionNames: ["super_walk"],
      creatureAnimationRequestedClipName: "super_walk",
      creatureAnimationRequestedClipMatched: true
    });
    expect(runtime.container.dataset.creatureAnimationMixerActionNames).toBe("super_walk");
  });

  it("applies creature PLT layer rows to PLT textures without mutating the shared cache", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createPartModelReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      textureUrls: [
        "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/pfh2_rfoot004.plt"
      ],
      colors: {
        skin: 42,
        hair: 8,
        cloth1: 64,
        tattoo1: 120
      }
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      textureUrls: payload.renderPackage.textureUrls,
      colors: payload.renderPackage.colors
    };
    const modelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const textureUrl =
      "http://localhost:3000/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/pfh2_rfoot004.plt";
    const sharedPltTexture = createCachedPltTexture();
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createCachedModel());
    runtime.placeableTextureCacheByUrl.set(textureUrl, sharedPltTexture);

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creaturePltTextureBridgeStatus: "applied",
      creaturePltTextureBridgeCount: 1,
      creaturePltTextureBridgeReferences: ["pfh2_rfoot004"],
      creaturePltTextureBridgeMode: "hsl-layer-row",
      creaturePltTextureBridgeLayerRows: {
        skin: 42,
        hair: 8,
        cloth1: 64,
        tattoo1: 120
      },
      creaturePltPaletteRowMax: 175
    });
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    let renderedMesh: THREE.Mesh | null = null;
    partGroup?.traverse((node) => {
      if (!renderedMesh && node instanceof THREE.Mesh) {
        renderedMesh = node;
      }
    });
    const material = renderedMesh?.material as THREE.MeshBasicMaterial | undefined;
    expect(material?.map).toBeInstanceOf(THREE.DataTexture);
    expect(material?.map).not.toBe(sharedPltTexture);
    expect(material?.map?.userData).toMatchObject({
      creaturePltTextureBridgeApplied: true,
      creaturePltTextureBridgeMode: "hsl-layer-row",
      creaturePltPaletteReady: false,
      creaturePltPaletteSource: "aurora-web-hsl-fallback",
      creaturePltLayerRows: {
        skin: 42,
        hair: 8,
        cloth1: 64,
        tattoo1: 120
      },
      creaturePltPaletteRowMax: 175
    });
    const bridgedImage = material?.map?.image as { data: Uint8Array } | undefined;
    expect(Array.from(bridgedImage?.data.slice(0, 3) ?? [])).not.toEqual([150, 150, 150]);
    expect(sharedPltTexture.userData.creaturePltTextureBridgeApplied).toBeUndefined();
    expect(runtime.placeableTextureLoader.load).not.toHaveBeenCalled();
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("keeps textured head PLT materials on the palette bridge instead of skin fallback tinting them", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createPartModelReadyCreatureRenderPayload();
    const basePartCandidate = payload.renderPackage!.partModelCandidates[0]!;
    const headPartCandidate = {
      ...basePartCandidate,
      slot: "head" as const,
      partId: 1,
      partModelName: "head",
      nodeName: undefined,
      modelPrefix: "pmh0_",
      modelResRef: "pmh0_head001",
      assetId: "asset-head-glb",
      glbUrl: "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/asset-head-glb.glb"
    };
    payload.renderPackage = {
      ...payload.renderPackage!,
      partModelCandidates: [headPartCandidate],
      textureUrls: [
        "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/pmh0_head001.plt",
        "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/pmh0_chest001.plt"
      ],
      colors: {
        skin: 1,
        hair: 1,
        tattoo1: 1,
        tattoo2: 1
      }
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      partModelCandidates: payload.renderPackage.partModelCandidates,
      textureUrls: payload.renderPackage.textureUrls,
      colors: payload.renderPackage.colors
    };
    const modelCacheKey = "creature:cre_guard_captain:v1:part:head:asset-head-glb";
    const textureUrl =
      "http://localhost:3000/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/pmh0_head001.plt";
    const chestTextureUrl =
      "http://localhost:3000/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/pmh0_chest001.plt";
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createCachedModel());
    runtime.placeableTextureCacheByUrl.set(textureUrl, createCachedPltTexture());
    runtime.placeableTextureCacheByUrl.set(chestTextureUrl, createCachedPltTexture());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creaturePltTextureBridgeStatus: "applied",
      creaturePltTextureBridgeCount: 2,
      creaturePltTextureBridgeReferences: ["pmh0_head001", "pmh0_chest001"],
      creaturePartModelExactTextureStatus: "applied",
      creaturePartModelExactTextureAppliedCount: 1,
      creaturePartModelExactTextureReferences: ["pmh0_head001"]
    });
    expect(root?.userData.creatureSkinFallbackTintStatus).toBeUndefined();
    expect(root?.userData.creatureSkinFallbackTintAppliedCount).toBeUndefined();
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    let renderedMesh: THREE.Mesh | null = null;
    partGroup?.traverse((node) => {
      if (!renderedMesh && node instanceof THREE.Mesh) {
        renderedMesh = node;
      }
    });
    const material = renderedMesh?.material as THREE.MeshBasicMaterial | undefined;
    expect(material?.map).toBeInstanceOf(THREE.DataTexture);
    expect(material?.map?.userData).toMatchObject({
      creaturePltTextureBridgeApplied: true,
      creaturePltLayerRows: {
        skin: 1,
        hair: 1,
        tattoo1: 1,
        tattoo2: 1
      },
      creaturePltPaletteRowMax: 175
    });
    expect(material?.map?.userData.creatureSkinFallbackTintTextureApplied).toBeUndefined();
    const bridgedImage = material?.map?.image as { data: Uint8Array } | undefined;
    expect(bridgedImage?.data.length).toBeGreaterThan(0);
    expect(material?.color.getHexString()).toBe("ffffff");
    expect(material?.userData.creatureSkinFallbackTintApplied).toBeUndefined();
    expect(material?.userData.creatureMaterialTintApplied).toBeUndefined();
    expect(runtime.placeableTextureLoader.load).not.toHaveBeenCalled();
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("keeps exact TGA head textures from being recolored by creature skin fallback tint", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createPartModelReadyCreatureRenderPayload();
    const basePartCandidate = payload.renderPackage!.partModelCandidates[0]!;
    const headPartCandidate = {
      ...basePartCandidate,
      slot: "head" as const,
      partId: 1,
      partModelName: "head",
      nodeName: undefined,
      modelPrefix: "pmd0_",
      modelResRef: "pmd0_head001",
      assetId: "asset-dwarf-head-glb",
      glbUrl: "/api/v1/catalog/placeables/cache/cre_grimgnaw:v1/assets/asset-dwarf-head-glb.glb"
    };
    payload.renderPackage = {
      ...payload.renderPackage!,
      partModelCandidates: [headPartCandidate],
      textureUrls: [
        "/api/v1/catalog/placeables/cache/cre_grimgnaw:v1/assets/pmd0_head001.tga"
      ],
      colors: {
        skin: 13,
        hair: 20,
        tattoo1: 1,
        tattoo2: 1
      }
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      partModelCandidates: payload.renderPackage.partModelCandidates,
      textureUrls: payload.renderPackage.textureUrls,
      colors: payload.renderPackage.colors
    };
    const modelCacheKey = "creature:cre_guard_captain:v1:part:head:asset-dwarf-head-glb";
    const textureUrl =
      "http://localhost:3000/api/v1/catalog/placeables/cache/cre_grimgnaw:v1/assets/pmd0_head001.tga";
    const tgaTexture = createCachedTgaTexture();
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createCachedModel());
    runtime.placeableTextureCacheByUrl.set(textureUrl, tgaTexture);

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creaturePartModelExactTextureStatus: "applied",
      creaturePartModelExactTextureAppliedCount: 1,
      creaturePartModelExactTextureReferences: ["pmd0_head001"]
    });
    expect(root?.userData.creatureMaterialTintStatus).toBeUndefined();
    expect(root?.userData.creatureSkinFallbackTintStatus).toBeUndefined();
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    let renderedMesh: THREE.Mesh | null = null;
    partGroup?.traverse((node) => {
      if (!renderedMesh && node instanceof THREE.Mesh) {
        renderedMesh = node;
      }
    });
    const material = renderedMesh?.material as THREE.MeshBasicMaterial | undefined;
    expect(material?.map).toBe(tgaTexture);
    expect(material?.map?.userData).toMatchObject({
      creaturePartModelExactTextureApplied: true,
      creaturePartModelExactTextureReference: "pmd0_head001"
    });
    expect(material?.map?.userData.creatureSkinFallbackTintTextureApplied).toBeUndefined();
    expect(material?.color.getHexString()).toBe("ffffff");
    expect(material?.userData.creaturePartModelExactTextureApplied).toBe(true);
    expect(material?.userData.creatureMaterialTintApplied).toBeUndefined();
    expect(material?.userData.creatureSkinFallbackTintApplied).toBeUndefined();
    expect(runtime.placeableTextureLoader.load).not.toHaveBeenCalled();
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("uses nwn_mdl_webviewer retail PLT palette tables when they are available", async () => {
    installAuroraPltPaletteDataForTests({
      4: createRetailPaletteTable([
        { row: 64, colorIndex: 150, rgb: [12, 34, 56] }
      ])
    });
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createPartModelReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      textureUrls: [
        "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/pfh2_rfoot004.plt"
      ],
      colors: {
        cloth1: 64
      }
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      textureUrls: payload.renderPackage.textureUrls,
      colors: payload.renderPackage.colors
    };
    const modelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const textureUrl =
      "http://localhost:3000/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/pfh2_rfoot004.plt";
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createCachedModel());
    runtime.placeableTextureCacheByUrl.set(textureUrl, createCachedPltTexture());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creaturePltTextureBridgeStatus: "applied",
      creaturePltTextureBridgeMode: "retail-palette",
      creaturePltTextureBridgeLayerRows: {
        cloth1: 64
      }
    });
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    let renderedMesh: THREE.Mesh | null = null;
    partGroup?.traverse((node) => {
      if (!renderedMesh && node instanceof THREE.Mesh) {
        renderedMesh = node;
      }
    });
    const material = renderedMesh?.material as THREE.MeshBasicMaterial | undefined;
    expect(material?.map?.userData).toMatchObject({
      creaturePltTextureBridgeApplied: true,
      creaturePltTextureBridgeMode: "retail-palette",
      creaturePltPaletteReady: true,
      creaturePltPaletteSource: "nwn_mdl_webviewer",
      creaturePltLayerRows: {
        cloth1: 64
      }
    });
    const bridgedImage = material?.map?.image as { data: Uint8Array } | undefined;
    expect(Array.from(bridgedImage?.data.slice(0, 3) ?? [])).toEqual([12, 34, 56]);
    expect(runtime.placeableTextureLoader.load).not.toHaveBeenCalled();
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("defaults unspecified creature PLT layers to retail palette row zero", async () => {
    installAuroraPltPaletteDataForTests({
      4: createRetailPaletteTable([
        { row: 0, colorIndex: 150, rgb: [21, 22, 23] }
      ])
    });
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createPartModelReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      textureUrls: [
        "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/pfh2_rfoot004.plt"
      ],
      colors: {
        skin: 42
      }
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      textureUrls: payload.renderPackage.textureUrls,
      colors: payload.renderPackage.colors
    };
    const modelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const textureUrl =
      "http://localhost:3000/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/pfh2_rfoot004.plt";
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createCachedModel());
    runtime.placeableTextureCacheByUrl.set(textureUrl, createCachedPltTexture());

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creaturePltTextureBridgeStatus: "applied",
      creaturePltTextureBridgeMode: "retail-palette",
      creaturePltTextureBridgeLayerRows: {
        skin: 42,
        cloth1: 0
      }
    });
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    let renderedMesh: THREE.Mesh | null = null;
    partGroup?.traverse((node) => {
      if (!renderedMesh && node instanceof THREE.Mesh) {
        renderedMesh = node;
      }
    });
    const material = renderedMesh?.material as THREE.MeshBasicMaterial | undefined;
    expect(material?.map?.userData).toMatchObject({
      creaturePltTextureBridgeApplied: true,
      creaturePltTextureBridgeMode: "retail-palette",
      creaturePltPaletteReady: true,
      creaturePltPaletteSource: "nwn_mdl_webviewer",
      creaturePltLayerRows: {
        skin: 42,
        cloth1: 0
      }
    });
    const bridgedImage = material?.map?.image as { data: Uint8Array } | undefined;
    expect(Array.from(bridgedImage?.data.slice(0, 3) ?? [])).toEqual([21, 22, 23]);
    expect(runtime.placeableTextureLoader.load).not.toHaveBeenCalled();
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });

  it("applies creature texture URLs and color tint to CAPart viewport groups", async () => {
    const runtime = createRuntime();
    const creature = createCreatureObject();
    const payload = createPartModelReadyCreatureRenderPayload();
    payload.renderPackage = {
      ...payload.renderPackage!,
      textureUrls: [
        "/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/pfh2_rfoot004_d.dds"
      ],
      colors: {
        skin: 42,
        hair: 8,
        metal1: 220,
        cloth1: 64,
        leather1: 33,
        tattoo1: 120
      }
    };
    payload.creature.creatureRenderPackage = {
      ...payload.creature.creatureRenderPackage!,
      textureUrls: payload.renderPackage.textureUrls,
      colors: payload.renderPackage.colors
    };
    const modelCacheKey = "creature:cre_guard_captain:v1:part:rFoot:asset-rfoot-glb";
    const textureUrl =
      "http://localhost:3000/api/v1/catalog/placeables/cache/cre_guard_captain:v1/assets/pfh2_rfoot004_d.dds";
    const texture = new THREE.Texture();
    texture.userData = { auroraSourceFormat: "dds" };
    runtime.placeableModelCacheByUrl.set(modelCacheKey, createCachedModel());
    runtime.placeableTextureCacheByUrl.set(textureUrl, texture);

    rebuildObjectMeshes(
      runtime,
      [creature],
      [],
      createDebugState(),
      4,
      4,
      1,
      true,
      10,
      [],
      false,
      null,
      {
        [creature.id]: payload
      }
    );
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const root = runtime.objectMeshById.get(creature.id);
    expect(root?.userData).toMatchObject({
      creatureMaterialTintStatus: "applied",
      creatureMaterialTintAppliedCount: 1,
      creatureMaterialTintChannels: ["skin", "hair", "metal1", "cloth1", "leather1", "tattoo1"],
      creatureMaterialTintLayerRows: {
        skin: 42,
        hair: 8,
        metal1: 175,
        cloth1: 64,
        leather1: 33,
        tattoo1: 120
      },
      creatureMaterialTintMode: "plt-layer-bridge",
      creaturePltPaletteRowMax: 175
    });
    const partGroup = root?.children.find(
      (child) => child.userData?.creaturePartModelGroupStatus === "loaded"
    );
    let renderedMesh: THREE.Mesh | null = null;
    partGroup?.traverse((node) => {
      if (!renderedMesh && node instanceof THREE.Mesh) {
        renderedMesh = node;
      }
    });
    const material = renderedMesh?.material as THREE.MeshBasicMaterial | undefined;
    expect(material?.map).toBe(texture);
    expect(material?.userData).toMatchObject({
      creatureMaterialTintApplied: true,
      creatureMaterialTintChannels: ["skin", "hair", "metal1", "cloth1", "leather1", "tattoo1"],
      creatureMaterialTintLayerRows: {
        skin: 42,
        hair: 8,
        metal1: 175,
        cloth1: 64,
        leather1: 33,
        tattoo1: 120
      },
      creatureMaterialTintMode: "plt-layer-bridge",
      creaturePltPaletteRowMax: 175
    });
    expect(runtime.placeableTextureLoader.load).not.toHaveBeenCalled();
    expect(runtime.placeableModelLoader.load).not.toHaveBeenCalled();
  });
});
