import { describe, expect, it } from "vitest";
import { writePlaceableFastShadowTextureDebugStatus } from "../../../../src/modules/layout/adapters/three/workspacePlaceableModelPresentation";

describe("placeable fast-shadow debug status", () => {
  it("does not overwrite the settled model identity or texture state", () => {
    const dataset: Record<string, string | undefined> = {
      placeableModelStatus: "missing",
      placeableModelUrl: "http://127.0.0.1/model.glb",
      placeableModelMeshCount: "0",
      placeableModelTextureStatus: "missing"
    };

    writePlaceableFastShadowTextureDebugStatus(
      { container: { dataset } },
      {
        status: "applied",
        url: "http://127.0.0.1/fxpa_dot01.tga",
        source: "fxpa_dot01-fast-shadow"
      }
    );

    expect(dataset).toMatchObject({
      placeableModelStatus: "missing",
      placeableModelUrl: "http://127.0.0.1/model.glb",
      placeableModelMeshCount: "0",
      placeableModelTextureStatus: "missing",
      placeableFastShadowTextureStatus: "applied",
      placeableFastShadowTextureUrl: "http://127.0.0.1/fxpa_dot01.tga",
      placeableFastShadowTextureSource: "fxpa_dot01-fast-shadow"
    });
  });
});
