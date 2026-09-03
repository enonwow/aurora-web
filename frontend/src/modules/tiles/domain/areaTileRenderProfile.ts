import bundledManifest from "./areaTileRenderProfileManifest.v1.json";

export type AreaTileBlackMaterialPolicy =
  | "geometry-classifier"
  | "hide-all-black-materials";

export type AreaTileSourceCropMaskPolicy = "preserve" | "hide";

export interface AreaTileRenderProfile {
  readonly schemaVersion: 1;
  readonly manifestRevision: string;
  readonly profileId: string;
  readonly evidenceStatus: string;
  readonly evidenceReference: string;
  readonly mdlSourceContentSha256?: string;
  readonly blackMaterialPolicy: AreaTileBlackMaterialPolicy;
  readonly sourceCropMaskPolicy: AreaTileSourceCropMaskPolicy;
}

export const DEFAULT_AREA_TILE_RENDER_PROFILE: AreaTileRenderProfile = Object.freeze({
  schemaVersion: 1,
  manifestRevision: "aurora-area-tile-render-profile-default-v1",
  profileId: "generic-geometry-classifier-v1",
  evidenceStatus: "generic-source-geometry-classification",
  evidenceReference: "frontend workspaceTerrainMesh generic geometry classifier",
  blackMaterialPolicy: "geometry-classifier",
  sourceCropMaskPolicy: "preserve"
});

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const BLACK_MATERIAL_POLICIES = new Set<AreaTileBlackMaterialPolicy>([
  "geometry-classifier",
  "hide-all-black-materials"
]);
const SOURCE_CROP_MASK_POLICIES = new Set<AreaTileSourceCropMaskPolicy>([
  "preserve",
  "hide"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireNonEmptyString(
  value: unknown,
  field: string,
  entryIndex?: number
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    const prefix = entryIndex === undefined ? "manifest" : `entries[${entryIndex}]`;
    throw new Error(`Invalid Area tile render profile ${prefix}.${field}.`);
  }
  return value.trim();
}

/**
 * Validates immutable profile data before the renderer can consume it. Asset
 * names are provenance only; behavior is bound exclusively to source bytes.
 */
export function buildAreaTileRenderProfileRegistry(
  input: unknown
): ReadonlyMap<string, AreaTileRenderProfile> {
  if (!isRecord(input) || input.schemaVersion !== 1) {
    throw new Error("Invalid Area tile render profile manifest schemaVersion.");
  }
  const revision = requireNonEmptyString(input.revision, "revision");
  if (!Array.isArray(input.entries)) {
    throw new Error("Invalid Area tile render profile manifest.entries.");
  }

  const registry = new Map<string, AreaTileRenderProfile>();
  input.entries.forEach((candidate, index) => {
    if (!isRecord(candidate)) {
      throw new Error(`Invalid Area tile render profile entries[${index}].`);
    }
    const hash = requireNonEmptyString(
      candidate.mdlSourceContentSha256,
      "mdlSourceContentSha256",
      index
    ).toLowerCase();
    if (!SHA256_PATTERN.test(hash)) {
      throw new Error(
        `Invalid Area tile render profile entries[${index}].mdlSourceContentSha256.`
      );
    }
    if (registry.has(hash)) {
      throw new Error(`Area tile render profile duplicate source hash: ${hash}.`);
    }

    const blackMaterialPolicy = requireNonEmptyString(
      candidate.blackMaterialPolicy,
      "blackMaterialPolicy",
      index
    ) as AreaTileBlackMaterialPolicy;
    const sourceCropMaskPolicy = requireNonEmptyString(
      candidate.sourceCropMaskPolicy,
      "sourceCropMaskPolicy",
      index
    ) as AreaTileSourceCropMaskPolicy;
    if (!BLACK_MATERIAL_POLICIES.has(blackMaterialPolicy)) {
      throw new Error(
        `Invalid Area tile render profile entries[${index}].blackMaterialPolicy.`
      );
    }
    if (!SOURCE_CROP_MASK_POLICIES.has(sourceCropMaskPolicy)) {
      throw new Error(
        `Invalid Area tile render profile entries[${index}].sourceCropMaskPolicy.`
      );
    }

    registry.set(
      hash,
      Object.freeze({
        schemaVersion: 1,
        manifestRevision: revision,
        profileId: requireNonEmptyString(candidate.profileId, "profileId", index),
        evidenceStatus: requireNonEmptyString(
          candidate.evidenceStatus,
          "evidenceStatus",
          index
        ),
        evidenceReference: requireNonEmptyString(
          candidate.evidenceReference ?? "test-manifest",
          "evidenceReference",
          index
        ),
        mdlSourceContentSha256: hash,
        blackMaterialPolicy,
        sourceCropMaskPolicy
      })
    );
  });
  return registry;
}

const BUNDLED_AREA_TILE_RENDER_PROFILE_REGISTRY =
  buildAreaTileRenderProfileRegistry(bundledManifest);

export function resolveAreaTileRenderProfile(
  mdlSourceContentSha256: string | null | undefined,
  registry: ReadonlyMap<string, AreaTileRenderProfile> =
    BUNDLED_AREA_TILE_RENDER_PROFILE_REGISTRY
): AreaTileRenderProfile {
  const normalized = mdlSourceContentSha256?.trim().toLowerCase() ?? "";
  if (!SHA256_PATTERN.test(normalized)) {
    return DEFAULT_AREA_TILE_RENDER_PROFILE;
  }
  return registry.get(normalized) ?? DEFAULT_AREA_TILE_RENDER_PROFILE;
}
