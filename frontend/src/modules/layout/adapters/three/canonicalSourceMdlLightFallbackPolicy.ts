import * as THREE from "three";
import type { PlaceableRenderPackageAuroraLightNode } from "../../../placeables/contracts";

const SOURCE_MDL_LIGHT_FEATURE_MANIFEST_VERSION =
  "aurora-source-mdl-light-feature-manifest/v1";
const SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_NODES = 128;
const SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_FEATURES_PER_NODE = 24;
const SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_DIAGNOSTICS = 32;
const SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_BYTES = 64 * 1024;

const SOURCE_MDL_LIGHT_FEATURES = [
  "position",
  "orientation",
  "scale",
  "transformTracks",
  "color",
  "radius",
  "multiplier",
  "ambientOnly",
  "shadow",
  "shadowRadius",
  "verticalDisplacement",
  "dynamicType",
  "affectDynamic",
  "lightPriority",
  "generateFlare",
  "flareTextureNames",
  "flareSizes",
  "flarePositions",
  "flareColorShifts",
  "flareRadius",
  "lensFlares",
  "fadingLight",
  "animationTracks"
] as const;

export type SourceMdlLightFeature = (typeof SOURCE_MDL_LIGHT_FEATURES)[number];
export type CanonicalSourceMdlLightMode =
  | "canonical_supported"
  | "legacy_fallback_required"
  | "blocked";

interface SourceMdlLightFeatureManifestNode {
  readonly nodeName: string;
  readonly presentFeatures: readonly SourceMdlLightFeature[];
}

interface SourceMdlLightFeatureManifest {
  readonly version: typeof SOURCE_MDL_LIGHT_FEATURE_MANIFEST_VERSION;
  readonly lightCount: number;
  readonly nodes: readonly SourceMdlLightFeatureManifestNode[];
  readonly truncated: boolean;
  readonly diagnosticCodes: readonly string[];
}

export interface CanonicalSourceMdlLightFallbackPolicy {
  readonly mode: CanonicalSourceMdlLightMode;
  readonly requiresFallback: boolean;
  readonly blocked: boolean;
  readonly canonicalLightCount: number;
  readonly sourceLightCount: number;
  readonly affectedNodeNames: readonly string[];
  readonly unsupportedFeatures: readonly SourceMdlLightFeature[];
  readonly unknownFeatures: readonly string[];
  readonly diagnosticCodes: readonly string[];
}

const KNOWN_SOURCE_MDL_LIGHT_FEATURES: ReadonlySet<string> = new Set(
  SOURCE_MDL_LIGHT_FEATURES
);

// This is a capability statement for the current adapter, not an Aurora semantic claim.
// Aggregated transform/animation tokens remain unsupported because their manifest entries
// may contain orientation, scale, shadow-radius, or vertical-displacement tracks.
const CANONICAL_SOURCE_MDL_LIGHT_SUPPORTED_FEATURES: ReadonlySet<SourceMdlLightFeature> =
  new Set(["position", "color", "radius", "multiplier", "ambientOnly"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function collectCanonicalLightNodes(group: THREE.Object3D | null): THREE.Object3D[] {
  const nodes: THREE.Object3D[] = [];
  group?.traverse((node) => {
    if (node.userData.auroraVfxCanonicalSourceMdlLight === true) {
      nodes.push(node);
    }
  });
  return nodes;
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function deriveManifestFromSourceRecords(
  lights: readonly PlaceableRenderPackageAuroraLightNode[]
): SourceMdlLightFeatureManifest {
  return {
    version: SOURCE_MDL_LIGHT_FEATURE_MANIFEST_VERSION,
    lightCount: lights.length,
    nodes: lights.map((light) => {
      const presentFeatures: SourceMdlLightFeature[] = [];
      const transform = light.transform;
      if (transform && hasOwn(transform, "orientation")) presentFeatures.push("orientation");
      if (transform && hasOwn(transform, "scale")) presentFeatures.push("scale");
      if (
        transform &&
        (hasOwn(transform, "positionTimeline") ||
          hasOwn(transform, "orientationTimeline") ||
          hasOwn(transform, "scaleTimeline"))
      ) {
        presentFeatures.push("transformTracks");
      }
      const directFields: ReadonlyArray<
        readonly [keyof PlaceableRenderPackageAuroraLightNode, SourceMdlLightFeature]
      > = [
        ["shadow", "shadow"],
        ["shadowRadius", "shadowRadius"],
        ["verticalDisplacement", "verticalDisplacement"],
        ["dynamicType", "dynamicType"],
        ["affectDynamic", "affectDynamic"],
        ["lightPriority", "lightPriority"],
        ["generateFlare", "generateFlare"],
        ["textureNames", "flareTextureNames"],
        ["flareSizes", "flareSizes"],
        ["flarePositions", "flarePositions"],
        ["flareColorShifts", "flareColorShifts"],
        ["flareRadius", "flareRadius"],
        ["lensFlares", "lensFlares"],
        ["fadingLight", "fadingLight"],
        ["animations", "animationTracks"]
      ];
      directFields.forEach(([field, feature]) => {
        if (hasOwn(light, field)) presentFeatures.push(feature);
      });
      return { nodeName: light.nodeName, presentFeatures };
    }),
    truncated: false,
    diagnosticCodes: []
  };
}

type ParsedSourceMdlLightFeatureManifest =
  | { status: "missing" }
  | {
      status: "invalid";
      diagnosticCode:
        | "VFX_MDL_LIGHT_FEATURE_MANIFEST_MALFORMED"
        | "VFX_MDL_LIGHT_FEATURE_MANIFEST_CONTRADICTORY";
    }
  | {
      status: "valid";
      manifest: SourceMdlLightFeatureManifest;
      unknownFeatures: string[];
    };

function parseManifest(value: unknown): ParsedSourceMdlLightFeatureManifest {
  if (value === undefined) {
    return { status: "missing" };
  }
  let manifestBytes = Number.POSITIVE_INFINITY;
  try {
    manifestBytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
  } catch {
    // The structural malformed diagnostic below is the fail-closed result.
  }
  if (
    !isRecord(value) ||
    value.version !== SOURCE_MDL_LIGHT_FEATURE_MANIFEST_VERSION ||
    !Number.isInteger(value.lightCount) ||
    (value.lightCount as number) < 0 ||
    !Array.isArray(value.nodes) ||
    typeof value.truncated !== "boolean" ||
    !Array.isArray(value.diagnosticCodes) ||
    !value.diagnosticCodes.every((code) => typeof code === "string") ||
    value.nodes.length > SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_NODES ||
    value.diagnosticCodes.length > SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_DIAGNOSTICS ||
    manifestBytes > SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_BYTES
  ) {
    return {
      status: "invalid",
      diagnosticCode: "VFX_MDL_LIGHT_FEATURE_MANIFEST_MALFORMED"
    };
  }

  const unknownFeatures: string[] = [];
  const nodes: SourceMdlLightFeatureManifestNode[] = [];
  for (const nodeValue of value.nodes) {
    if (
      !isRecord(nodeValue) ||
      typeof nodeValue.nodeName !== "string" ||
      nodeValue.nodeName.length === 0 ||
      !Array.isArray(nodeValue.presentFeatures) ||
      !nodeValue.presentFeatures.every((feature) => typeof feature === "string") ||
      nodeValue.presentFeatures.length >
        SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_FEATURES_PER_NODE
    ) {
      return {
        status: "invalid",
        diagnosticCode: "VFX_MDL_LIGHT_FEATURE_MANIFEST_MALFORMED"
      };
    }
    const featureNames = nodeValue.presentFeatures as string[];
    featureNames.forEach((feature) => {
      if (!KNOWN_SOURCE_MDL_LIGHT_FEATURES.has(feature)) {
        unknownFeatures.push(feature);
      }
    });
    if (new Set(featureNames).size !== featureNames.length) {
      return {
        status: "invalid",
        diagnosticCode: "VFX_MDL_LIGHT_FEATURE_MANIFEST_CONTRADICTORY"
      };
    }
    nodes.push({
      nodeName: nodeValue.nodeName,
      presentFeatures: featureNames.filter((feature) =>
        KNOWN_SOURCE_MDL_LIGHT_FEATURES.has(feature)
      ) as SourceMdlLightFeature[]
    });
  }

  return {
    status: "valid",
    manifest: {
      version: SOURCE_MDL_LIGHT_FEATURE_MANIFEST_VERSION,
      lightCount: value.lightCount as number,
      nodes,
      truncated: value.truncated,
      diagnosticCodes: [...(value.diagnosticCodes as string[])]
    },
    unknownFeatures: Array.from(new Set(unknownFeatures)).sort()
  };
}

function toDiagnosticFeature(feature: SourceMdlLightFeature): string {
  return feature.replace(/([a-z0-9])([A-Z])/gu, "$1_$2").toUpperCase();
}

function createBlockedPolicy(
  lights: readonly PlaceableRenderPackageAuroraLightNode[],
  canonicalLightCount: number,
  diagnosticCodes: readonly string[],
  unknownFeatures: readonly string[]
): CanonicalSourceMdlLightFallbackPolicy {
  return {
    mode: "blocked",
    requiresFallback: true,
    blocked: true,
    canonicalLightCount,
    sourceLightCount: lights.length,
    affectedNodeNames: lights.map((light) => light.nodeName),
    unsupportedFeatures: [],
    unknownFeatures: [...unknownFeatures],
    diagnosticCodes: [...diagnosticCodes]
  };
}

export function resolveCanonicalSourceMdlLightFallbackPolicy(
  manifestValue: unknown,
  lights: readonly PlaceableRenderPackageAuroraLightNode[],
  canonicalGroup: THREE.Object3D | null
): CanonicalSourceMdlLightFallbackPolicy {
  const canonicalLightCount = collectCanonicalLightNodes(canonicalGroup).length;
  if (lights.length === 0) {
    return {
      mode: "canonical_supported",
      requiresFallback: false,
      blocked: false,
      canonicalLightCount,
      sourceLightCount: 0,
      affectedNodeNames: [],
      unsupportedFeatures: [],
      unknownFeatures: [],
      diagnosticCodes: []
    };
  }

  const parsed = parseManifest(manifestValue);
  if (parsed.status === "invalid") {
    return createBlockedPolicy(
      lights,
      canonicalLightCount,
      [parsed.diagnosticCode],
      []
    );
  }
  const manifest = parsed.status === "valid"
    ? parsed.manifest
    : deriveManifestFromSourceRecords(lights);
  const parsedUnknownFeatures = parsed.status === "valid" ? parsed.unknownFeatures : [];
  const derivationDiagnosticCodes = parsed.status === "missing"
    ? ["VFX_MDL_LIGHT_FEATURE_MANIFEST_DERIVED_FROM_SOURCE_RECORDS"]
    : [];
  if (manifest.truncated) {
    return createBlockedPolicy(lights, canonicalLightCount, [
      "VFX_MDL_LIGHT_FEATURE_MANIFEST_TRUNCATED",
      ...manifest.diagnosticCodes
    ], []);
  }
  if (parsedUnknownFeatures.length > 0) {
    return createBlockedPolicy(
      lights,
      canonicalLightCount,
      ["VFX_MDL_LIGHT_FEATURE_MANIFEST_UNKNOWN_FEATURE"],
      parsedUnknownFeatures
    );
  }
  if (manifest.diagnosticCodes.length > 0) {
    return createBlockedPolicy(lights, canonicalLightCount, [
      "VFX_MDL_LIGHT_FEATURE_MANIFEST_DIAGNOSTIC_PRESENT",
      ...manifest.diagnosticCodes
    ], []);
  }
  const sourceNodeNames = lights.map((light) => light.nodeName);
  const manifestNodeNames = manifest.nodes.map((node) => node.nodeName);
  if (
    manifest.lightCount !== lights.length ||
    manifest.nodes.length !== manifest.lightCount ||
    manifestNodeNames.some((nodeName, index) => nodeName !== sourceNodeNames[index])
  ) {
    return createBlockedPolicy(lights, canonicalLightCount, [
      "VFX_MDL_LIGHT_FEATURE_MANIFEST_CONTRADICTORY"
    ], []);
  }

  const unsupportedFeatures = Array.from(
    new Set(
      manifest.nodes.flatMap((node) =>
        node.presentFeatures.filter(
          (feature) => !CANONICAL_SOURCE_MDL_LIGHT_SUPPORTED_FEATURES.has(feature)
        )
      )
    )
  ).sort();
  if (unsupportedFeatures.length > 0) {
    const affectedNodeNames = manifest.nodes
      .filter((node) =>
        node.presentFeatures.some(
          (feature) => !CANONICAL_SOURCE_MDL_LIGHT_SUPPORTED_FEATURES.has(feature)
        )
      )
      .map((node) => node.nodeName);
    return {
      mode: "legacy_fallback_required",
      requiresFallback: true,
      blocked: false,
      canonicalLightCount,
      sourceLightCount: lights.length,
      affectedNodeNames,
      unsupportedFeatures,
      unknownFeatures: [],
      diagnosticCodes: [
        ...derivationDiagnosticCodes,
        "VFX_MDL_LIGHT_CANONICAL_FALLBACK_REQUIRED",
        "VFX_MDL_LIGHT_CANONICAL_UNSUPPORTED_FEATURE_FALLBACK",
        ...unsupportedFeatures.map(
          (feature) =>
            `VFX_MDL_LIGHT_CANONICAL_UNSUPPORTED_${toDiagnosticFeature(feature)}`
        )
      ]
    };
  }

  if (canonicalLightCount === 0) {
    return createBlockedPolicy(lights, canonicalLightCount, [
      ...derivationDiagnosticCodes,
      "VFX_MDL_LIGHT_CANONICAL_OUTPUT_MISSING"
    ], []);
  }
  if (canonicalLightCount !== lights.length) {
    return createBlockedPolicy(lights, canonicalLightCount, [
      ...derivationDiagnosticCodes,
      "VFX_MDL_LIGHT_CANONICAL_OUTPUT_COUNT_MISMATCH"
    ], []);
  }
  return {
    mode: "canonical_supported",
    requiresFallback: false,
    blocked: false,
    canonicalLightCount,
    sourceLightCount: lights.length,
    affectedNodeNames: [],
    unsupportedFeatures: [],
    unknownFeatures: [],
    diagnosticCodes: derivationDiagnosticCodes
  };
}

export function applyCanonicalSourceMdlLightFallbackPolicy(
  canonicalGroup: THREE.Object3D | null,
  policy: CanonicalSourceMdlLightFallbackPolicy
): number {
  if (!canonicalGroup || policy.mode === "canonical_supported") {
    return 0;
  }
  const canonicalLights = collectCanonicalLightNodes(canonicalGroup);
  canonicalLights.forEach((light) => light.removeFromParent());
  canonicalGroup.userData = {
    ...canonicalGroup.userData,
    auroraVfxCanonicalSourceMdlLightPolicyMode: policy.mode,
    auroraVfxCanonicalSourceMdlLightFallbackRequired: policy.requiresFallback,
    auroraVfxCanonicalSourceMdlLightPolicyBlocked: policy.blocked,
    auroraVfxCanonicalSourceMdlLightPolicyDiagnosticCodes: [...policy.diagnosticCodes],
    auroraVfxCanonicalSourceMdlLightPolicyUnsupportedFeatures: [
      ...policy.unsupportedFeatures
    ],
    auroraVfxCanonicalSourceMdlLightPolicyUnknownFeatures: [...policy.unknownFeatures],
    auroraVfxCanonicalSourceMdlLightPolicyAffectedNodeNames: [
      ...policy.affectedNodeNames
    ],
    auroraVfxCanonicalSourceMdlLightSuppressedCount: canonicalLights.length
  };
  return canonicalLights.length;
}

export function writeSourceMdlLightFallbackDiagnostics(
  fallbackGroup: THREE.Object3D,
  policy: CanonicalSourceMdlLightFallbackPolicy,
  suppressedCanonicalCount: number
): void {
  fallbackGroup.userData = {
    ...fallbackGroup.userData,
    auroraVfxSourceMdlLightFallbackActive: policy.requiresFallback,
    auroraVfxSourceMdlLightFallbackMode: policy.mode,
    auroraVfxSourceMdlLightFallbackDiagnosticCodes: [...policy.diagnosticCodes],
    auroraVfxSourceMdlLightFallbackUnsupportedFeatures: [...policy.unsupportedFeatures],
    auroraVfxSourceMdlLightFallbackAffectedNodeNames: [...policy.affectedNodeNames],
    auroraVfxSourceMdlLightFallbackSuppressedCanonicalCount: suppressedCanonicalCount
  };
}
