import type {
  PlaceableCanonicalVfxLightContracts,
  PlaceableRenderPackage,
  PlaceableRenderPackageAuroraLightNode,
  PlaceableSourceMdlLightFeatureManifest,
  PlaceableSourceMdlLightFeatureManifestNode,
  PlaceableSourceMdlLightFeatureToken
} from "../domain/template.types";

export const SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_NODES = 128;
export const SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_FEATURES_PER_NODE = 24;
export const SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_DIAGNOSTIC_CODES = 32;
export const SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_BYTES = 64 * 1024;

const NODE_LIMIT_DIAGNOSTIC =
  "VFX_SOURCE_MDL_LIGHT_FEATURE_MANIFEST_NODE_LIMIT_EXCEEDED";
const FEATURE_LIMIT_DIAGNOSTIC =
  "VFX_SOURCE_MDL_LIGHT_FEATURE_MANIFEST_FEATURE_LIMIT_EXCEEDED";
const BYTE_LIMIT_DIAGNOSTIC =
  "VFX_SOURCE_MDL_LIGHT_FEATURE_MANIFEST_BYTE_LIMIT_EXCEEDED";

/** Builds source-presence metadata without filtering complete source records. */
export function buildSourceMdlLightFeatureContracts(
  auroraLight: PlaceableRenderPackage["auroraLight"] | undefined
): PlaceableCanonicalVfxLightContracts {
  const sourceMdlLights = auroraLight?.lights;
  if (!sourceMdlLights || sourceMdlLights.length === 0) return {};

  const diagnosticCodes: string[] = [];
  let truncated = sourceMdlLights.length > SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_NODES;
  if (truncated) appendDiagnosticCode(diagnosticCodes, NODE_LIMIT_DIAGNOSTIC);

  const nodes: PlaceableSourceMdlLightFeatureManifestNode[] = [];
  for (const light of sourceMdlLights.slice(0, SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_NODES)) {
    const allFeatures = collectPresentFeatures(light);
    const presentFeatures = allFeatures.slice(
      0,
      SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_FEATURES_PER_NODE
    );
    if (presentFeatures.length < allFeatures.length) {
      truncated = true;
      appendDiagnosticCode(diagnosticCodes, FEATURE_LIMIT_DIAGNOSTIC);
    }
    const node = { nodeName: light.nodeName, presentFeatures };
    const candidate = createManifest(
      sourceMdlLights.length,
      [...nodes, node],
      truncated,
      diagnosticCodes
    );
    if (manifestByteLength(candidate) > SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_BYTES) {
      truncated = true;
      appendDiagnosticCode(diagnosticCodes, BYTE_LIMIT_DIAGNOSTIC);
      break;
    }
    nodes.push(node);
  }

  let sourceMdlLightFeatureManifest = createManifest(
    sourceMdlLights.length,
    nodes,
    truncated,
    diagnosticCodes
  );
  while (
    manifestByteLength(sourceMdlLightFeatureManifest) >
      SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_BYTES &&
    nodes.length > 0
  ) {
    nodes.pop();
    truncated = true;
    appendDiagnosticCode(diagnosticCodes, BYTE_LIMIT_DIAGNOSTIC);
    sourceMdlLightFeatureManifest = createManifest(
      sourceMdlLights.length,
      nodes,
      truncated,
      diagnosticCodes
    );
  }
  return { sourceMdlLights, sourceMdlLightFeatureManifest };
}

function collectPresentFeatures(
  light: PlaceableRenderPackageAuroraLightNode
): PlaceableSourceMdlLightFeatureToken[] {
  const features: PlaceableSourceMdlLightFeatureToken[] = [];
  const transform = light.transform;
  if (hasDefinedOwn(transform, "position")) features.push("position");
  if (hasDefinedOwn(transform, "orientation")) features.push("orientation");
  if (hasDefinedOwn(transform, "scale")) features.push("scale");
  if (
    hasDefinedOwn(transform, "positionTimeline") ||
    hasDefinedOwn(transform, "orientationTimeline") ||
    hasDefinedOwn(transform, "scaleTimeline")
  ) features.push("transformTracks");

  appendFeatureWhenPresent(features, light, "color", "color");
  appendFeatureWhenPresent(features, light, "radius", "radius");
  appendFeatureWhenPresent(features, light, "multiplier", "multiplier");
  appendFeatureWhenPresent(features, light, "ambientOnly", "ambientOnly");
  appendFeatureWhenPresent(features, light, "shadow", "shadow");
  appendFeatureWhenPresent(features, light, "shadowRadius", "shadowRadius");
  appendFeatureWhenPresent(features, light, "verticalDisplacement", "verticalDisplacement");
  appendFeatureWhenPresent(features, light, "dynamicType", "dynamicType");
  appendFeatureWhenPresent(features, light, "affectDynamic", "affectDynamic");
  appendFeatureWhenPresent(features, light, "lightPriority", "lightPriority");
  appendFeatureWhenPresent(features, light, "generateFlare", "generateFlare");
  appendFeatureWhenPresent(features, light, "textureNames", "flareTextureNames");
  appendFeatureWhenPresent(features, light, "flareSizes", "flareSizes");
  appendFeatureWhenPresent(features, light, "flarePositions", "flarePositions");
  appendFeatureWhenPresent(features, light, "flareColorShifts", "flareColorShifts");
  appendFeatureWhenPresent(features, light, "flareRadius", "flareRadius");
  appendFeatureWhenPresent(features, light, "lensFlares", "lensFlares");
  appendFeatureWhenPresent(features, light, "fadingLight", "fadingLight");
  appendFeatureWhenPresent(features, light, "animations", "animationTracks");
  return features;
}

function appendFeatureWhenPresent<TKey extends keyof PlaceableRenderPackageAuroraLightNode>(
  features: PlaceableSourceMdlLightFeatureToken[],
  light: PlaceableRenderPackageAuroraLightNode,
  key: TKey,
  token: PlaceableSourceMdlLightFeatureToken
): void {
  if (hasDefinedOwn(light, key)) features.push(token);
}

function hasDefinedOwn<TValue extends object, TKey extends PropertyKey>(
  value: TValue | undefined,
  key: TKey
): boolean {
  return value !== undefined &&
    Object.prototype.hasOwnProperty.call(value, key) &&
    (value as Record<PropertyKey, unknown>)[key] !== undefined;
}

function createManifest(
  lightCount: number,
  nodes: PlaceableSourceMdlLightFeatureManifestNode[],
  truncated: boolean,
  diagnosticCodes: string[]
): PlaceableSourceMdlLightFeatureManifest {
  return {
    version: "aurora-source-mdl-light-feature-manifest/v1",
    lightCount,
    nodes,
    truncated,
    diagnosticCodes: diagnosticCodes.slice(
      0,
      SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_DIAGNOSTIC_CODES
    )
  };
}

function appendDiagnosticCode(diagnosticCodes: string[], code: string): void {
  if (
    diagnosticCodes.length < SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_DIAGNOSTIC_CODES &&
    !diagnosticCodes.includes(code)
  ) diagnosticCodes.push(code);
}

function manifestByteLength(manifest: PlaceableSourceMdlLightFeatureManifest): number {
  return Buffer.byteLength(JSON.stringify(manifest), "utf8");
}
