import * as THREE from "three";
import type {
  AuroraPlaceableLightingProofFacts,
  AuroraPlaceableLightingProofProfile,
  AuroraPlaceableLightingReceiverMaterialFamily
} from "../../application/auroraPlaceableLightingProof";
import { isAuroraTerrainNonLightReceiverMesh } from "./auroraTerrainReceiverMaterial";

const TERRAIN_RECEIVER_ROOT_NAMES = [
  "terrain-backend-tile-models",
  "terrain-imagemap2d-tiles"
] as const;
const DEBUG_RECEIVER_ROLE = "placeables-2da-light-receiver";
const DEBUG_RECEIVER_NAME = "aurora_placeable_lighting_proof_debug_receiver";
const ORIGINAL_VISIBLE_KEY = "auroraPlaceableLightingProofOriginalVisible";
const ORIGINAL_CAST_SHADOW_KEY = "auroraPlaceableLightingProofOriginalCastShadow";
const SPATIAL_SAMPLE_LIMIT = 24;

type ReceiverReactiveness = AuroraPlaceableLightingReceiverMaterialFamily["reactiveness"];

interface SceneFactsInput {
  scene: THREE.Scene;
  objectLayer: THREE.Object3D;
  tileMesh: THREE.InstancedMesh | null;
  assetSettlementStatus: string;
}

interface ProfileApplicationInput {
  scene: THREE.Scene;
  objectLayer: THREE.Object3D;
}

export interface AuroraPlaceableLightingProofProfileApplication {
  pointLightNodeCount: number;
  haloNodeCount: number;
  vfxRootCount: number;
  vfxDrawNodeCount: number;
  shadowNodeCount: number;
  debugReceiverNodeCount: number;
  areaReceiverRootCount: number;
}

function isHierarchyVisible(node: THREE.Object3D, boundary: THREE.Object3D): boolean {
  let current = node;
  while (current !== boundary) {
    if (!current.visible) return false;
    current = current.parent as THREE.Object3D;
  }
  return boundary.visible;
}

function resolveReceiverReactiveness(material: THREE.Material): ReceiverReactiveness {
  const explicit = material.userData?.auroraPlaceableLightingProofReactsToLocalPointLight;
  if (explicit === true) return "reactive";
  if (explicit === false) return "unlit";
  if (
    material instanceof THREE.MeshLambertMaterial ||
    material instanceof THREE.MeshPhongMaterial ||
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshToonMaterial
  ) {
    return "reactive";
  }
  if (
    material instanceof THREE.MeshBasicMaterial ||
    material instanceof THREE.MeshNormalMaterial ||
    material instanceof THREE.MeshMatcapMaterial ||
    material instanceof THREE.MeshDepthMaterial ||
    material instanceof THREE.MeshDistanceMaterial ||
    material instanceof THREE.SpriteMaterial ||
    material instanceof THREE.PointsMaterial ||
    material instanceof THREE.LineBasicMaterial ||
    material instanceof THREE.LineDashedMaterial
  ) {
    return "unlit";
  }
  return "unknown";
}

function readRole(node: THREE.Object3D): string {
  const placeableRole = node.userData?.placeableTwoDaLightPreviewRole;
  if (typeof placeableRole === "string") return placeableRole;
  const sourceMdlRole = node.userData?.auroraLightPreviewRole;
  return typeof sourceMdlRole === "string" ? sourceMdlRole : "";
}

function isPlaceablePointLight(node: THREE.Object3D): node is THREE.PointLight {
  if (!(node instanceof THREE.PointLight)) return false;
  const role = readRole(node);
  return (
    role === "placeables-2da-point-light" ||
    role === "source-mdl-point-light" ||
    node.userData?.auroraVfxCanonicalSourceMdlLight === true ||
    node.userData?.auroraVfxProgFxType4PreviewRole === "progfx-type4-point-light"
  );
}

function isHaloOrPresentationNode(node: THREE.Object3D): boolean {
  const role = readRole(node).toLowerCase();
  return (
    role.includes("halo") ||
    role.includes("core") ||
    role.includes("radius-gizmo") ||
    role.includes("flare-sprite")
  );
}

function isFastShadowNode(node: THREE.Object3D): boolean {
  return node.name.startsWith("placeable_2da_light_fast_shadow");
}

function isVfxDrawNode(node: THREE.Object3D): boolean {
  return (
    node instanceof THREE.Mesh ||
    node instanceof THREE.Sprite ||
    node instanceof THREE.Points ||
    node instanceof THREE.Line
  );
}

function setProfileVisibility(node: THREE.Object3D, enabled: boolean): void {
  const original = node.userData?.[ORIGINAL_VISIBLE_KEY];
  if (typeof original !== "boolean") {
    node.userData[ORIGINAL_VISIBLE_KEY] = node.visible;
  }
  node.visible = node.userData[ORIGINAL_VISIBLE_KEY] === true && enabled;
}

function setProfileCastShadow(light: THREE.PointLight, enabled: boolean): void {
  const original = light.userData?.[ORIGINAL_CAST_SHADOW_KEY];
  if (typeof original !== "boolean") {
    light.userData[ORIGINAL_CAST_SHADOW_KEY] = light.castShadow;
  }
  light.castShadow = light.userData[ORIGINAL_CAST_SHADOW_KEY] === true && enabled;
}

function collectAreaReceiverMeshes(input: SceneFactsInput): THREE.Mesh[] {
  const meshes = new Map<string, THREE.Mesh>();
  const addRoot = (root: THREE.Object3D | null): void => {
    if (!root) return;
    root.traverse((node) => {
      if (
        node instanceof THREE.Mesh &&
        isHierarchyVisible(node, root) &&
        !isAuroraTerrainNonLightReceiverMesh(node)
      ) {
        meshes.set(node.uuid, node);
      }
    });
  };
  TERRAIN_RECEIVER_ROOT_NAMES.forEach((name) =>
    addRoot(input.scene.getObjectByName(name) ?? null)
  );
  addRoot(input.tileMesh);
  return [...meshes.values()];
}

function roundSpatial(value: number): number {
  const rounded = Math.round(value * 1_000_000) / 1_000_000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function vectorTuple(value: THREE.Vector3): [number, number, number] {
  return [roundSpatial(value.x), roundSpatial(value.y), roundSpatial(value.z)];
}

function readFiniteUserDataNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? roundSpatial(value)
    : undefined;
}

function readUserDataTuple(value: unknown): [number, number, number] | undefined {
  if (
    !Array.isArray(value) ||
    value.length < 3 ||
    value.slice(0, 3).some((entry) => typeof entry !== "number" || !Number.isFinite(entry))
  ) {
    return undefined;
  }
  return [
    roundSpatial(value[0]),
    roundSpatial(value[1]),
    roundSpatial(value[2])
  ];
}

function readUserDataString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function ensureDebugReceiver(input: ProfileApplicationInput): THREE.Mesh | null {
  const existing = input.objectLayer.getObjectByName(DEBUG_RECEIVER_NAME);
  if (existing instanceof THREE.Mesh) return existing;

  const sourceLightSelection: { current: THREE.PointLight | null } = {
    current: null
  };
  input.objectLayer.traverse((node) => {
    if (sourceLightSelection.current === null && isPlaceablePointLight(node)) {
      sourceLightSelection.current = node;
    }
  });
  const sourceLight = sourceLightSelection.current;
  if (!sourceLight) return null;

  const worldPosition = sourceLight.getWorldPosition(new THREE.Vector3());
  const radius = Math.min(6, Math.max(1.5, sourceLight.distance * 0.45));
  const material = new THREE.MeshStandardMaterial({
    color: 0x7c8177,
    roughness: 0.96,
    metalness: 0,
    side: THREE.DoubleSide
  });
  material.userData = {
    auroraPlaceableLightingProofReactsToLocalPointLight: true,
    auroraPlaceableLightingProofDebugOnly: true,
    auroraPlaceableLightingProofRetailParityStatus:
      "blocked_debug_receiver_not_area_surface"
  };
  const receiver = new THREE.Mesh(new THREE.CircleGeometry(radius, 64), material);
  receiver.name = DEBUG_RECEIVER_NAME;
  receiver.rotation.x = -Math.PI / 2;
  receiver.position.set(worldPosition.x, 0.012, worldPosition.z);
  receiver.userData = {
    placeableTwoDaLightPreviewRole: DEBUG_RECEIVER_ROLE,
    auroraPlaceableLightingProofDebugOnly: true,
    auroraPlaceableLightingProofRetailParityStatus:
      "blocked_debug_receiver_not_area_surface"
  };
  input.objectLayer.add(receiver);
  return receiver;
}

export function collectAuroraPlaceableLightingProofSceneFacts(
  input: SceneFactsInput
): AuroraPlaceableLightingProofFacts {
  input.scene.updateMatrixWorld(true);
  const receiverMeshes = collectAreaReceiverMeshes(input);
  const families = new Map<
    string,
    {
      family: string;
      reactiveness: ReceiverReactiveness;
      materialCount: number;
      meshSamples: string[];
    }
  >();
  let reactiveReceiverMaterialCount = 0;
  let unlitReceiverMaterialCount = 0;
  let unknownReceiverMaterialCount = 0;

  receiverMeshes.forEach((mesh) => {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      const reactiveness = resolveReceiverReactiveness(material);
      if (reactiveness === "reactive") reactiveReceiverMaterialCount += 1;
      else if (reactiveness === "unlit") unlitReceiverMaterialCount += 1;
      else unknownReceiverMaterialCount += 1;
      const family = material.type;
      const key = `${family}:${reactiveness}`;
      const entry = families.get(key) ?? {
        family,
        reactiveness,
        materialCount: 0,
        meshSamples: []
      };
      entry.materialCount += 1;
      if (entry.meshSamples.length < 12) {
        entry.meshSamples.push(mesh.name || mesh.uuid);
      }
      families.set(key, entry);
    });
  });

  let pointLightCount = 0;
  let debugReceiverMeshCount = 0;
  const pointLights: THREE.PointLight[] = [];
  input.objectLayer.traverse((node) => {
    if (!isHierarchyVisible(node, input.objectLayer)) return;
    if (isPlaceablePointLight(node)) {
      pointLightCount += 1;
      if (pointLights.length < SPATIAL_SAMPLE_LIMIT) pointLights.push(node);
    }
    if (node instanceof THREE.Mesh && readRole(node) === DEBUG_RECEIVER_ROLE) {
      debugReceiverMeshCount += 1;
    }
  });

  const pointLightSpatialSamples = pointLights.map((light) => ({
    name: light.name || light.uuid,
    role: readRole(light),
    worldPosition: vectorTuple(light.getWorldPosition(new THREE.Vector3())),
    color: [
      roundSpatial(light.color.r),
      roundSpatial(light.color.g),
      roundSpatial(light.color.b)
    ] as [number, number, number],
    distance: roundSpatial(light.distance),
    intensity: roundSpatial(light.intensity),
    decay: roundSpatial(light.decay),
    layersMask: light.layers.mask,
    sourceLightColorRow: readFiniteUserDataNumber(
      light.userData?.placeableTwoDaLightColorRow
    ),
    sourceColor: readUserDataTuple(light.userData?.placeableTwoDaLightColor),
    sourceRadius: readFiniteUserDataNumber(
      light.userData?.placeableTwoDaLightSourceRadius
    ),
    sourceUnitScale: readFiniteUserDataNumber(
      light.userData?.placeableTwoDaLightSourceUnitScale
    ),
    sourceRadiusWorld: readFiniteUserDataNumber(
      light.userData?.placeableTwoDaLightSourceRadiusWorldDistance
    ),
    sourceOffset: readUserDataTuple(light.userData?.placeableTwoDaLightOffset),
    mappedOffset: readUserDataTuple(
      light.userData?.placeableTwoDaLightMappedOffset
    ),
    offsetScale: readFiniteUserDataNumber(
      light.userData?.placeableTwoDaLightOffsetScale
    ),
    falloffMode: readUserDataString(
      light.userData?.placeableTwoDaLightFalloffMode
    ),
    falloffProofStatus: readUserDataString(
      light.userData?.placeableTwoDaLightFalloffProofStatus
    ),
    falloffRendererPatchStatus: readUserDataString(
      light.userData?.placeableTwoDaLightFalloffRendererPatchStatus
    )
  }));
  const sampledReceivers = receiverMeshes.slice(0, SPATIAL_SAMPLE_LIMIT);
  const receiverBounds = new Map<THREE.Mesh, THREE.Box3>();
  const receiverMeshSpatialSamples = sampledReceivers.map((mesh) => {
    const bounds = new THREE.Box3().setFromObject(mesh);
    receiverBounds.set(mesh, bounds);
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    return {
      name: mesh.name || mesh.uuid,
      worldBoundsMin: vectorTuple(bounds.min),
      worldBoundsMax: vectorTuple(bounds.max),
      layersMask: mesh.layers.mask,
      materialTypes: materials.map((material) => material.type)
    };
  });
  const pointLightReceiverPairSamples = pointLights
    .flatMap((light) => {
      const worldPosition = light.getWorldPosition(new THREE.Vector3());
      return sampledReceivers.map((receiver) => {
        const bounds = receiverBounds.get(receiver) ?? new THREE.Box3().setFromObject(receiver);
        const closest = bounds.clampPoint(worldPosition, new THREE.Vector3());
        const verticalRelation =
          worldPosition.y < bounds.min.y - 1e-6
            ? "below"
            : worldPosition.y > bounds.max.y + 1e-6
              ? "above"
              : "intersects";
        return {
          lightName: light.name || light.uuid,
          receiverName: receiver.name || receiver.uuid,
          layerOverlap: (light.layers.mask & receiver.layers.mask) !== 0,
          verticalRelation,
          lightHeightAboveReceiverMaxY: roundSpatial(
            worldPosition.y - bounds.max.y
          ),
          minimumDistanceToReceiverBounds: roundSpatial(
            closest.distanceTo(worldPosition)
          )
        } as const;
      });
    })
    .slice(0, SPATIAL_SAMPLE_LIMIT);

  return {
    areaReceiverMeshCount: receiverMeshes.length,
    debugReceiverMeshCount,
    reactiveReceiverMaterialCount,
    unlitReceiverMaterialCount,
    unknownReceiverMaterialCount,
    pointLightCount,
    assetSettlementStatus: input.assetSettlementStatus,
    pointLightSpatialSamples,
    receiverMeshSpatialSamples,
    pointLightReceiverPairSamples,
    receiverMaterialFamilies: [...families.values()].sort((left, right) =>
      `${left.family}:${left.reactiveness}`.localeCompare(
        `${right.family}:${right.reactiveness}`
      )
    )
  };
}

export function applyAuroraPlaceableLightingProofProfile(
  input: ProfileApplicationInput,
  profile: AuroraPlaceableLightingProofProfile
): AuroraPlaceableLightingProofProfileApplication {
  const result: AuroraPlaceableLightingProofProfileApplication = {
    pointLightNodeCount: 0,
    haloNodeCount: 0,
    vfxRootCount: 0,
    vfxDrawNodeCount: 0,
    shadowNodeCount: 0,
    debugReceiverNodeCount: 0,
    areaReceiverRootCount: 0
  };

  if (profile.receiver === "debug") {
    ensureDebugReceiver(input);
  }

  TERRAIN_RECEIVER_ROOT_NAMES.forEach((name) => {
    const root = input.scene.getObjectByName(name);
    if (!root) return;
    result.areaReceiverRootCount += 1;
    setProfileVisibility(root, profile.receiver === "area");
  });
  const genericTerrain = input.scene.getObjectByName("terrain-tiles");
  if (genericTerrain) {
    result.areaReceiverRootCount += 1;
    setProfileVisibility(genericTerrain, profile.receiver === "area");
  }

  input.objectLayer.traverse((node) => {
    if (isPlaceablePointLight(node)) {
      result.pointLightNodeCount += 1;
      setProfileVisibility(node, profile.pointLight);
      setProfileCastShadow(node, profile.shadow);
    }
    if (isHaloOrPresentationNode(node)) {
      result.haloNodeCount += 1;
      setProfileVisibility(node, profile.halo);
    }
    if (readRole(node) === DEBUG_RECEIVER_ROLE) {
      result.debugReceiverNodeCount += 1;
      setProfileVisibility(node, profile.receiver === "debug");
    }
    if (isFastShadowNode(node)) {
      result.shadowNodeCount += 1;
      setProfileVisibility(node, profile.shadow);
    }
    if (node.name === "aurora_vfx_canonical_runtime_playback") {
      result.vfxRootCount += 1;
      node.traverse((vfxNode) => {
        if (!isVfxDrawNode(vfxNode)) return;
        result.vfxDrawNodeCount += 1;
        setProfileVisibility(vfxNode, profile.vfx);
      });
    }
  });

  return result;
}
