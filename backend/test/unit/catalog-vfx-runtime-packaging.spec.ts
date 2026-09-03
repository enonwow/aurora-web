import { placeableVfxRuntimePackaging } from "../../src/modules/catalog/application/catalog-vfx-runtime-packaging";
import type { PlaceableRenderPackage } from "../../src/modules/catalog/domain/template.types";
import type {
  VfxProcessCommand,
  VfxRuntimePackage
} from "../../src/modules/vfx/application/vfx-processing.types";

describe("catalog VFX runtime packaging boundary", () => {
  it("selects asset-bearing emitter shells and deduplicates by source model and node", () => {
    const emitters = [
      emitter("fire", { texture: "fx_fire" }),
      emitter("fire", { simulation: { birthrate: 4 } }),
      emitter("smoke", { chunkName: "fx_smoke" })
    ] as NonNullable<PlaceableRenderPackage["auroraEmitter"]>["emitters"];

    expect(placeableVfxRuntimePackaging.selectRuntimeSourceEmitters(emitters)).toEqual([
      emitters[0],
      emitters[2]
    ]);
  });

  it("keeps local renderer eligibility separate from blocked retail parity", () => {
    const vfx = {
      version: "aurora-vfx-runtime/v1",
      sourceRows: [],
      effectInstance: undefined,
      phaseSchedule: undefined,
      dependencyGraph: { diagnostics: [] },
      diagnostics: []
    } as unknown as VfxRuntimePackage;
    const command = {
      packageKind: "model_graph_runtime",
      sourceProfile: "catalog-placeable-source-mdl",
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
    } as unknown as VfxProcessCommand;

    expect(placeableVfxRuntimePackaging.buildPayload(vfx, command)).toMatchObject({
      version: "aurora-vfx-payload/v1",
      canonicalStatus: "canonical",
      backendCanonical: true,
      rendererEligibility: "source_backed",
      retailParityStatus: "blocked",
      contracts: {
        sourceModelGraph: command.sourceModelGraph
      },
      localOnlyNotRetailEvidence: true,
      canonicalParityPromoted: false
    });
  });

  it("packages bounded source-light presence beside complete source records", () => {
    const vfx = {
      version: "aurora-vfx-runtime/v1",
      sourceRows: [],
      dependencyGraph: { diagnostics: [] },
      diagnostics: []
    } as unknown as VfxRuntimePackage;
    const command = {
      packageKind: "model_graph_runtime",
      sourceProfile: "catalog-placeable-source-mdl"
    } as unknown as VfxProcessCommand;
    const auroraLight: NonNullable<PlaceableRenderPackage["auroraLight"]> = {
      source: "source-mdl",
      diagnostics: [],
      lights: [{
        source: "aurora-mdl-binary",
        sourceModelAssetId: "asset_model",
        sourceModelFileName: "fx_model.mdl",
        sourceModelObjectKey: "module/fx_model.mdl",
        nodeName: "AuroraLight01",
        radius: 3,
        shadow: true
      }]
    };

    const payload = placeableVfxRuntimePackaging.buildPayload(
      vfx,
      command,
      auroraLight
    ) as { contracts: Record<string, unknown> };

    expect(payload.contracts.sourceMdlLights).toBe(auroraLight.lights);
    expect(payload.contracts.sourceMdlLightFeatureManifest).toEqual({
      version: "aurora-source-mdl-light-feature-manifest/v1",
      lightCount: 1,
      nodes: [{
        nodeName: "AuroraLight01",
        presentFeatures: ["radius", "shadow"]
      }],
      truncated: false,
      diagnosticCodes: []
    });
  });
});

function emitter(nodeName: string, values: Record<string, unknown>) {
  return {
    source: "aurora-mdl-binary",
    sourceModelAssetId: "asset_model",
    sourceModelFileName: "fx_model.mdl",
    sourceModelObjectKey: "module/fx_model.mdl",
    nodeName,
    ...values
  };
}
