import {
  buildSourceMdlLightFeatureContracts,
  SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_BYTES,
  SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_NODES
} from "../../src/modules/catalog/application/catalog-source-mdl-light-feature-manifest";
import type {
  PlaceableRenderPackageAuroraLight,
  PlaceableRenderPackageAuroraLightNode
} from "../../src/modules/catalog/domain/template.types";

describe("source-MDL light feature manifest packaging", () => {
  it("reports deterministic source presence without claiming renderer support", () => {
    const source = buildLightPackage([buildLight({
      transform: {
        position: [0, 0, 2.5],
        orientation: { axis: [0, 0, 1], angleRadians: 0 },
        scale: 1,
        positionTimeline: [{ time: 0, value: [0, 0, 2.5] }]
      },
      radius: 3,
      shadowRadius: 0,
      verticalDisplacement: 0,
      multiplier: 0,
      color: [0, 0.5, 1],
      ambientOnly: false,
      dynamicType: 0,
      affectDynamic: false,
      shadow: false,
      lightPriority: 0,
      generateFlare: false,
      textureNames: [],
      flareSizes: [],
      flarePositions: [],
      flareColorShifts: [],
      flareRadius: 0,
      lensFlares: false,
      fadingLight: false,
      animations: []
    })]);

    const contracts = buildSourceMdlLightFeatureContracts(source);

    expect(contracts.sourceMdlLights).toBe(source.lights);
    expect(contracts.sourceMdlLightFeatureManifest).toEqual({
      version: "aurora-source-mdl-light-feature-manifest/v1",
      lightCount: 1,
      nodes: [{
        nodeName: "glow_light",
        presentFeatures: [
          "position", "orientation", "scale", "transformTracks", "color",
          "radius", "multiplier", "ambientOnly", "shadow", "shadowRadius",
          "verticalDisplacement", "dynamicType", "affectDynamic", "lightPriority",
          "generateFlare", "flareTextureNames", "flareSizes", "flarePositions",
          "flareColorShifts", "flareRadius", "lensFlares", "fadingLight",
          "animationTracks"
        ]
      }],
      truncated: false,
      diagnosticCodes: []
    });
  });

  it("keeps source lights while bounding the manifest", () => {
    const lights = Array.from(
      { length: SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_NODES + 3 },
      (_, index) => buildLight({ nodeName: `light_${index}`, radius: index })
    );
    const contracts = buildSourceMdlLightFeatureContracts(buildLightPackage(lights));
    expect(contracts.sourceMdlLights).toHaveLength(131);
    expect(contracts.sourceMdlLightFeatureManifest).toMatchObject({
      lightCount: 131,
      truncated: true,
      diagnosticCodes: ["VFX_SOURCE_MDL_LIGHT_FEATURE_MANIFEST_NODE_LIMIT_EXCEEDED"]
    });
    expect(contracts.sourceMdlLightFeatureManifest?.nodes).toHaveLength(128);
  });

  it("fails closed at the byte budget without removing source records", () => {
    const lights = Array.from({ length: 128 }, (_, index) =>
      buildLight({ nodeName: `${index}_${"x".repeat(1_024)}`, radius: 1 })
    );
    const contracts = buildSourceMdlLightFeatureContracts(buildLightPackage(lights));
    const manifest = contracts.sourceMdlLightFeatureManifest!;
    expect(contracts.sourceMdlLights).toHaveLength(128);
    expect(manifest.truncated).toBe(true);
    expect(manifest.diagnosticCodes).toContain(
      "VFX_SOURCE_MDL_LIGHT_FEATURE_MANIFEST_BYTE_LIMIT_EXCEEDED"
    );
    expect(Buffer.byteLength(JSON.stringify(manifest), "utf8")).toBeLessThanOrEqual(
      SOURCE_MDL_LIGHT_FEATURE_MANIFEST_MAX_BYTES
    );
  });

  it("omits optional contracts without source-MDL lights", () => {
    expect(buildSourceMdlLightFeatureContracts(undefined)).toEqual({});
    expect(buildSourceMdlLightFeatureContracts(buildLightPackage([]))).toEqual({});
  });
});

function buildLight(
  values: Partial<PlaceableRenderPackageAuroraLightNode>
): PlaceableRenderPackageAuroraLightNode {
  return {
    source: "aurora-mdl-ascii",
    sourceModelAssetId: "asset_model",
    sourceModelFileName: "fx_model.mdl",
    sourceModelObjectKey: "module/fx_model.mdl",
    nodeName: "glow_light",
    ...values
  };
}

function buildLightPackage(
  lights: PlaceableRenderPackageAuroraLightNode[]
): PlaceableRenderPackageAuroraLight {
  return { source: "source-mdl", lights, diagnostics: [] };
}
