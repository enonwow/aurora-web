import * as THREE from "three";
import { installAuroraMdlSourceMaterialLighting } from "../../../shared/adapters/three/auroraMdlSourceMaterialLighting";

export const AURORA_TERRAIN_LIT_RECEIVER_MODE =
  "source_lit_use_area_lighting_enabled";
export const AURORA_TERRAIN_UNLIT_RECEIVER_MODE =
  "texture_color_unlit_use_area_lighting_disabled";

export const AURORA_TERRAIN_LIT_RECEIVER_SOURCE =
  "Active retail inc_lighting.shd material boundary plus converter-backed aurora-mdl-material metadata; Use Area Lighting=true preserves the loader's lit Three material and installs the shared MDL ambient/diffuse adapter.";
export const AURORA_TERRAIN_UNLIT_RECEIVER_SOURCE =
  "Aurora Toolset Use Area Lighting disabled; cap94 terrain basic-material A/B matched warmer source texture color without touching placeables.";

export type AuroraTerrainReceiverMaterialStatus =
  | "ready_source_backed_lit_receiver"
  | "ready_lit_receiver_source_material_partial"
  | "ready_explicit_unlit_profile"
  | "blocked_unlit_receiver_material"
  | "blocked_unknown_receiver_material"
  | "not_applicable_no_receiver_material";

export interface AuroraTerrainReceiverMaterialSummary {
  readonly mode:
    | typeof AURORA_TERRAIN_LIT_RECEIVER_MODE
    | typeof AURORA_TERRAIN_UNLIT_RECEIVER_MODE;
  readonly source: string;
  readonly status: AuroraTerrainReceiverMaterialStatus;
  readonly inspectedMaterialCount: number;
  readonly convertedMaterialCount: number;
  readonly reactiveMaterialCount: number;
  readonly unlitReceiverMaterialCount: number;
  readonly unknownReceiverMaterialCount: number;
  readonly excludedNonReceiverMaterialCount: number;
  readonly sourceMaterialLightingInstalledCount: number;
  readonly sourceMaterialLightingBlockedCount: number;
}

interface AuroraTerrainReceiverMaterialOptions {
  readonly useAreaLighting: boolean;
}

type TerrainTextureMaterial = THREE.Material & {
  map?: THREE.Texture | null;
  alphaMap?: THREE.Texture | null;
  alphaTest?: number;
  color?: THREE.Color;
  vertexColors?: boolean;
};

function isTerrainTextureMaterial(
  material: THREE.Material
): material is TerrainTextureMaterial {
  return "map" in material || "alphaMap" in material || "color" in material;
}

function isLightReactiveMaterial(material: THREE.Material): boolean {
  return (
    material instanceof THREE.MeshLambertMaterial ||
    material instanceof THREE.MeshPhongMaterial ||
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshToonMaterial
  );
}

function isKnownUnlitMaterial(material: THREE.Material): boolean {
  return (
    material instanceof THREE.MeshBasicMaterial ||
    material instanceof THREE.MeshNormalMaterial ||
    material instanceof THREE.MeshMatcapMaterial ||
    material instanceof THREE.MeshDepthMaterial ||
    material instanceof THREE.MeshDistanceMaterial
  );
}

export function isAuroraTerrainNonLightReceiverMesh(mesh: THREE.Mesh): boolean {
  return (
    mesh.userData?.auroraTerrainVoidMask === true ||
    mesh.userData?.auroraTerrainVoidMaskRenderContract === "source_crop_mask" ||
    mesh.userData?.auroraTerrainImageMap2DModelBaseHidden === true
  );
}

function resolveTextureColorUnlitMaterial(
  material: THREE.Material,
  convertedMaterials: WeakMap<THREE.Material, THREE.Material>
): THREE.Material {
  const existing = convertedMaterials.get(material);
  if (existing) {
    return existing;
  }
  if (material instanceof THREE.MeshBasicMaterial) {
    material.userData = {
      ...material.userData,
      auroraTerrainTileMaterialLightingMode: AURORA_TERRAIN_UNLIT_RECEIVER_MODE,
      auroraTerrainTileMaterialLightingModeSource:
        AURORA_TERRAIN_UNLIT_RECEIVER_SOURCE,
      auroraPlaceableLightingProofReactsToLocalPointLight: false
    };
    return material;
  }

  const source = isTerrainTextureMaterial(material) ? material : null;
  const materialWithAlpha = material as THREE.Material & { alphaTest?: number };
  const basicMaterial = new THREE.MeshBasicMaterial({
    name: material.name,
    map: source?.map ?? null,
    alphaMap: source?.alphaMap ?? null,
    color:
      source?.color instanceof THREE.Color
        ? source.color.clone()
        : new THREE.Color(0xffffff),
    transparent: material.transparent,
    opacity: material.opacity,
    alphaTest:
      typeof materialWithAlpha.alphaTest === "number" &&
      Number.isFinite(materialWithAlpha.alphaTest)
        ? materialWithAlpha.alphaTest
        : 0,
    side: material.side,
    depthTest: material.depthTest,
    depthWrite: material.depthWrite,
    blending: material.blending,
    polygonOffset: material.polygonOffset,
    polygonOffsetFactor: material.polygonOffsetFactor,
    polygonOffsetUnits: material.polygonOffsetUnits,
    toneMapped: material.toneMapped,
    vertexColors: source?.vertexColors === true,
    visible: material.visible
  });
  basicMaterial.userData = {
    ...material.userData,
    auroraTerrainTileMaterialLightingMode: AURORA_TERRAIN_UNLIT_RECEIVER_MODE,
    auroraTerrainTileMaterialLightingModeSource:
      AURORA_TERRAIN_UNLIT_RECEIVER_SOURCE,
    auroraTerrainTileMaterialLightingConvertedFrom:
      material.type || material.constructor.name || "Material",
    auroraPlaceableLightingProofReactsToLocalPointLight: false
  };
  basicMaterial.needsUpdate = true;
  convertedMaterials.set(material, basicMaterial);
  return basicMaterial;
}

function resolveStatus(input: {
  useAreaLighting: boolean;
  reactiveMaterialCount: number;
  unlitReceiverMaterialCount: number;
  unknownReceiverMaterialCount: number;
  sourceMaterialLightingBlockedCount: number;
}): AuroraTerrainReceiverMaterialStatus {
  if (!input.useAreaLighting) {
    return input.unlitReceiverMaterialCount > 0
      ? "ready_explicit_unlit_profile"
      : "not_applicable_no_receiver_material";
  }
  if (input.unlitReceiverMaterialCount > 0) {
    return "blocked_unlit_receiver_material";
  }
  if (input.unknownReceiverMaterialCount > 0) {
    return "blocked_unknown_receiver_material";
  }
  if (input.reactiveMaterialCount === 0) {
    return "not_applicable_no_receiver_material";
  }
  return input.sourceMaterialLightingBlockedCount > 0
    ? "ready_lit_receiver_source_material_partial"
    : "ready_source_backed_lit_receiver";
}

export function applyAuroraTerrainReceiverMaterialProfile(
  model: THREE.Object3D,
  options: AuroraTerrainReceiverMaterialOptions
): AuroraTerrainReceiverMaterialSummary {
  const mode = options.useAreaLighting
    ? AURORA_TERRAIN_LIT_RECEIVER_MODE
    : AURORA_TERRAIN_UNLIT_RECEIVER_MODE;
  const source = options.useAreaLighting
    ? AURORA_TERRAIN_LIT_RECEIVER_SOURCE
    : AURORA_TERRAIN_UNLIT_RECEIVER_SOURCE;
  const convertedMaterials = new WeakMap<THREE.Material, THREE.Material>();
  let inspectedMaterialCount = 0;
  let convertedMaterialCount = 0;
  let reactiveMaterialCount = 0;
  let unlitReceiverMaterialCount = 0;
  let unknownReceiverMaterialCount = 0;
  let excludedNonReceiverMaterialCount = 0;
  let sourceMaterialLightingInstalledCount = 0;
  let sourceMaterialLightingBlockedCount = 0;

  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const excludedNonReceiver = isAuroraTerrainNonLightReceiverMesh(node);
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    const nextMaterials = materials.map((material) => {
      inspectedMaterialCount += 1;
      if (!options.useAreaLighting || excludedNonReceiver) {
        const nextMaterial = resolveTextureColorUnlitMaterial(
          material,
          convertedMaterials
        );
        if (nextMaterial !== material) {
          convertedMaterialCount += 1;
        }
        if (excludedNonReceiver) {
          excludedNonReceiverMaterialCount += 1;
        } else {
          unlitReceiverMaterialCount += 1;
        }
        return nextMaterial;
      }

      if (isLightReactiveMaterial(material)) {
        reactiveMaterialCount += 1;
        const lighting = installAuroraMdlSourceMaterialLighting(material);
        if (lighting.status === "installed" || lighting.status === "already-installed") {
          sourceMaterialLightingInstalledCount += 1;
        } else {
          sourceMaterialLightingBlockedCount += 1;
        }
        material.userData = {
          ...material.userData,
          auroraTerrainTileMaterialLightingMode: mode,
          auroraTerrainTileMaterialLightingModeSource: source,
          auroraTerrainTileSourceMaterialLightingStatus: lighting.status,
          auroraPlaceableLightingProofReactsToLocalPointLight: true
        };
        return material;
      }

      if (isKnownUnlitMaterial(material)) {
        unlitReceiverMaterialCount += 1;
        material.userData = {
          ...material.userData,
          auroraTerrainTileMaterialLightingMode: mode,
          auroraTerrainTileMaterialLightingModeSource: source,
          auroraPlaceableLightingProofReactsToLocalPointLight: false
        };
        return material;
      }

      unknownReceiverMaterialCount += 1;
      material.userData = {
        ...material.userData,
        auroraTerrainTileMaterialLightingMode: mode,
        auroraTerrainTileMaterialLightingModeSource: source
      };
      return material;
    });
    node.material = Array.isArray(node.material) ? nextMaterials : nextMaterials[0];
  });

  const status = resolveStatus({
    useAreaLighting: options.useAreaLighting,
    reactiveMaterialCount,
    unlitReceiverMaterialCount,
    unknownReceiverMaterialCount,
    sourceMaterialLightingBlockedCount
  });
  const summary: AuroraTerrainReceiverMaterialSummary = {
    mode,
    source,
    status,
    inspectedMaterialCount,
    convertedMaterialCount,
    reactiveMaterialCount,
    unlitReceiverMaterialCount,
    unknownReceiverMaterialCount,
    excludedNonReceiverMaterialCount,
    sourceMaterialLightingInstalledCount,
    sourceMaterialLightingBlockedCount
  };
  model.userData = {
    ...model.userData,
    auroraTerrainTileMaterialLightingMode: mode,
    auroraTerrainTileMaterialLightingModeSource: source,
    auroraTerrainTileMaterialLightingStatus: status,
    auroraTerrainTileMaterialLightingInspectedCount: inspectedMaterialCount,
    auroraTerrainTileMaterialLightingConvertedCount: convertedMaterialCount,
    auroraTerrainTileReactiveReceiverMaterialCount: reactiveMaterialCount,
    auroraTerrainTileUnlitReceiverMaterialCount: unlitReceiverMaterialCount,
    auroraTerrainTileUnknownReceiverMaterialCount: unknownReceiverMaterialCount,
    auroraTerrainTileExcludedNonReceiverMaterialCount:
      excludedNonReceiverMaterialCount,
    auroraTerrainTileSourceMaterialLightingInstalledCount:
      sourceMaterialLightingInstalledCount,
    auroraTerrainTileSourceMaterialLightingBlockedCount:
      sourceMaterialLightingBlockedCount
  };
  return summary;
}
