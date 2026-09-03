export const AURORA_PLACEABLE_LIGHTING_PROOF_PROFILE_VERSION =
  "aurora-placeable-lighting-proof-profile/v1" as const;
export const AURORA_PLACEABLE_LIGHTING_PROOF_SNAPSHOT_VERSION =
  "aurora-placeable-lighting-proof-snapshot/v2" as const;

export type AuroraPlaceableLightingProofReceiver = "area" | "debug";

export interface AuroraPlaceableLightingProofProfile {
  version: typeof AURORA_PLACEABLE_LIGHTING_PROOF_PROFILE_VERSION;
  receiver: AuroraPlaceableLightingProofReceiver;
  pointLight: boolean;
  halo: boolean;
  vfx: boolean;
  shadow: boolean;
  postprocess: boolean;
}

export interface AuroraPlaceableLightingReceiverMaterialFamily {
  family: string;
  reactiveness: "reactive" | "unlit" | "unknown";
  materialCount: number;
  meshSamples: readonly string[];
}

export interface AuroraPlaceableLightingPointLightSpatialSample {
  name: string;
  role: string;
  worldPosition: readonly [number, number, number];
  color: readonly [number, number, number];
  distance: number;
  intensity: number;
  decay: number;
  layersMask: number;
  sourceLightColorRow?: number;
  sourceColor?: readonly [number, number, number];
  sourceRadius?: number;
  sourceUnitScale?: number;
  sourceRadiusWorld?: number;
  sourceOffset?: readonly [number, number, number];
  mappedOffset?: readonly [number, number, number];
  offsetScale?: number;
  falloffMode?: string;
  falloffProofStatus?: string;
  falloffRendererPatchStatus?: string;
}

export interface AuroraPlaceableLightingReceiverMeshSpatialSample {
  name: string;
  worldBoundsMin: readonly [number, number, number];
  worldBoundsMax: readonly [number, number, number];
  layersMask: number;
  materialTypes: readonly string[];
}

export interface AuroraPlaceableLightingPointLightReceiverPairSample {
  lightName: string;
  receiverName: string;
  layerOverlap: boolean;
  verticalRelation: "above" | "intersects" | "below";
  lightHeightAboveReceiverMaxY: number;
  minimumDistanceToReceiverBounds: number;
}

export interface AuroraPlaceableLightingProofFacts {
  areaReceiverMeshCount: number;
  debugReceiverMeshCount: number;
  reactiveReceiverMaterialCount: number;
  unlitReceiverMaterialCount: number;
  unknownReceiverMaterialCount: number;
  pointLightCount: number;
  assetSettlementStatus: string;
  receiverMaterialFamilies?: readonly AuroraPlaceableLightingReceiverMaterialFamily[];
  pointLightSpatialSamples?: readonly AuroraPlaceableLightingPointLightSpatialSample[];
  receiverMeshSpatialSamples?: readonly AuroraPlaceableLightingReceiverMeshSpatialSample[];
  pointLightReceiverPairSamples?: readonly AuroraPlaceableLightingPointLightReceiverPairSample[];
}

export type AuroraPlaceableLightingProofBlockerCode =
  | "APL-PROOF-RECEIVER-PROFILE-NOT-AREA"
  | "APL-PROOF-POINT-LIGHT-DISABLED"
  | "APL-PROOF-POINT-LIGHT-MISSING"
  | "APL-PROOF-HALO-ENABLED"
  | "APL-PROOF-VFX-ENABLED"
  | "APL-PROOF-SHADOW-ENABLED"
  | "APL-PROOF-POSTPROCESS-ENABLED"
  | "APL-PROOF-AREA-RECEIVER-MISSING"
  | "APL-PROOF-DEBUG-RECEIVER"
  | "APL-PROOF-AREA-RECEIVER-UNLIT"
  | "APL-PROOF-AREA-RECEIVER-UNKNOWN"
  | "APL-PROOF-ASSETS-NOT-SETTLED";

export interface AuroraPlaceableLightingProofSnapshot {
  version: typeof AURORA_PLACEABLE_LIGHTING_PROOF_SNAPSHOT_VERSION;
  profile: AuroraPlaceableLightingProofProfile;
  status: "eligible_for_off_on_ablation" | "blocked";
  retailParityStatus: "blocked_pending_matched_nwn_oracle";
  blockerCodes: readonly AuroraPlaceableLightingProofBlockerCode[];
  facts: AuroraPlaceableLightingProofFacts;
}

export function resolveAuroraPlaceableLightingProofProfile(
  input: Partial<Omit<AuroraPlaceableLightingProofProfile, "version">>
): AuroraPlaceableLightingProofProfile {
  return {
    version: AURORA_PLACEABLE_LIGHTING_PROOF_PROFILE_VERSION,
    receiver: input.receiver === "debug" ? "debug" : "area",
    pointLight: input.pointLight ?? true,
    halo: input.halo ?? true,
    vfx: input.vfx ?? true,
    shadow: input.shadow ?? true,
    postprocess: input.postprocess ?? true
  };
}

export function evaluateAuroraPlaceableLightingProof(
  input: AuroraPlaceableLightingProofFacts & {
    profile: AuroraPlaceableLightingProofProfile;
  }
): AuroraPlaceableLightingProofSnapshot {
  const blockers: AuroraPlaceableLightingProofBlockerCode[] = [];
  if (input.profile.receiver !== "area") {
    blockers.push("APL-PROOF-RECEIVER-PROFILE-NOT-AREA");
  }
  if (!input.profile.pointLight) {
    blockers.push("APL-PROOF-POINT-LIGHT-DISABLED");
  } else if (input.pointLightCount <= 0) {
    blockers.push("APL-PROOF-POINT-LIGHT-MISSING");
  }
  if (input.profile.halo) {
    blockers.push("APL-PROOF-HALO-ENABLED");
  }
  if (input.profile.vfx) {
    blockers.push("APL-PROOF-VFX-ENABLED");
  }
  if (input.profile.shadow) {
    blockers.push("APL-PROOF-SHADOW-ENABLED");
  }
  if (input.profile.postprocess) {
    blockers.push("APL-PROOF-POSTPROCESS-ENABLED");
  }
  if (input.areaReceiverMeshCount <= 0) {
    blockers.push("APL-PROOF-AREA-RECEIVER-MISSING");
  }
  if (input.debugReceiverMeshCount > 0 || input.profile.receiver === "debug") {
    blockers.push("APL-PROOF-DEBUG-RECEIVER");
  }
  if (input.unlitReceiverMaterialCount > 0) {
    blockers.push("APL-PROOF-AREA-RECEIVER-UNLIT");
  }
  if (input.unknownReceiverMaterialCount > 0) {
    blockers.push("APL-PROOF-AREA-RECEIVER-UNKNOWN");
  }
  if (input.assetSettlementStatus !== "settled") {
    blockers.push("APL-PROOF-ASSETS-NOT-SETTLED");
  }

  const facts: AuroraPlaceableLightingProofFacts = {
    areaReceiverMeshCount: input.areaReceiverMeshCount,
    debugReceiverMeshCount: input.debugReceiverMeshCount,
    reactiveReceiverMaterialCount: input.reactiveReceiverMaterialCount,
    unlitReceiverMaterialCount: input.unlitReceiverMaterialCount,
    unknownReceiverMaterialCount: input.unknownReceiverMaterialCount,
    pointLightCount: input.pointLightCount,
    assetSettlementStatus: input.assetSettlementStatus,
    receiverMaterialFamilies: input.receiverMaterialFamilies
      ? input.receiverMaterialFamilies.map((entry) => ({
          ...entry,
          meshSamples: [...entry.meshSamples]
        }))
      : [],
    pointLightSpatialSamples: input.pointLightSpatialSamples
      ? input.pointLightSpatialSamples.map((entry) => ({
          ...entry,
          worldPosition: [...entry.worldPosition] as [number, number, number],
          color: [...entry.color] as [number, number, number],
          sourceColor: entry.sourceColor
            ? [...entry.sourceColor] as [number, number, number]
            : undefined,
          sourceOffset: entry.sourceOffset
            ? [...entry.sourceOffset] as [number, number, number]
            : undefined,
          mappedOffset: entry.mappedOffset
            ? [...entry.mappedOffset] as [number, number, number]
            : undefined
        }))
      : [],
    receiverMeshSpatialSamples: input.receiverMeshSpatialSamples
      ? input.receiverMeshSpatialSamples.map((entry) => ({
          ...entry,
          worldBoundsMin: [...entry.worldBoundsMin] as [number, number, number],
          worldBoundsMax: [...entry.worldBoundsMax] as [number, number, number],
          materialTypes: [...entry.materialTypes]
        }))
      : [],
    pointLightReceiverPairSamples: input.pointLightReceiverPairSamples
      ? input.pointLightReceiverPairSamples.map((entry) => ({ ...entry }))
      : []
  };

  return {
    version: AURORA_PLACEABLE_LIGHTING_PROOF_SNAPSHOT_VERSION,
    profile: { ...input.profile },
    status: blockers.length === 0 ? "eligible_for_off_on_ablation" : "blocked",
    retailParityStatus: "blocked_pending_matched_nwn_oracle",
    blockerCodes: blockers,
    facts
  };
}
