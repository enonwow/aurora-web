import { describe, expect, it } from "vitest";
import {
  buildAreaTileRenderProfileRegistry,
  DEFAULT_AREA_TILE_RENDER_PROFILE,
  resolveAreaTileRenderProfile
} from "../../../../src/modules/tiles/domain/areaTileRenderProfile";

describe("areaTileRenderProfile", () => {
  it("drives one generic resolver with arbitrary immutable source hashes", () => {
    const firstHash = "1".repeat(64);
    const secondHash = "2".repeat(64);
    const registry = buildAreaTileRenderProfileRegistry({
      schemaVersion: 1,
      revision: "test-render-profile-v1",
      entries: [
        {
          mdlSourceContentSha256: firstHash,
          profileId: "test-hide-all",
          evidenceStatus: "test-evidence",
          blackMaterialPolicy: "hide-all-black-materials",
          sourceCropMaskPolicy: "hide"
        },
        {
          mdlSourceContentSha256: secondHash,
          profileId: "test-generic",
          evidenceStatus: "test-evidence",
          blackMaterialPolicy: "geometry-classifier",
          sourceCropMaskPolicy: "preserve"
        }
      ]
    });

    expect(resolveAreaTileRenderProfile(firstHash, registry)).toMatchObject({
      manifestRevision: "test-render-profile-v1",
      blackMaterialPolicy: "hide-all-black-materials",
      sourceCropMaskPolicy: "hide"
    });
    expect(resolveAreaTileRenderProfile(secondHash.toUpperCase(), registry)).toMatchObject({
      manifestRevision: "test-render-profile-v1",
      blackMaterialPolicy: "geometry-classifier",
      sourceCropMaskPolicy: "preserve"
    });
    expect(resolveAreaTileRenderProfile("f".repeat(64), registry)).toEqual(
      DEFAULT_AREA_TILE_RENDER_PROFILE
    );
  });

  it("rejects malformed and duplicate evidence bindings", () => {
    expect(() =>
      buildAreaTileRenderProfileRegistry({
        schemaVersion: 2,
        revision: "wrong-schema",
        entries: []
      })
    ).toThrow(/schemaVersion/u);

    const duplicateHash = "a".repeat(64);
    expect(() =>
      buildAreaTileRenderProfileRegistry({
        schemaVersion: 1,
        revision: "duplicate-test",
        entries: [
          {
            mdlSourceContentSha256: duplicateHash,
            profileId: "first",
            evidenceStatus: "test",
            blackMaterialPolicy: "geometry-classifier",
            sourceCropMaskPolicy: "preserve"
          },
          {
            mdlSourceContentSha256: duplicateHash,
            profileId: "second",
            evidenceStatus: "test",
            blackMaterialPolicy: "hide-all-black-materials",
            sourceCropMaskPolicy: "hide"
          }
        ]
      })
    ).toThrow(/duplicate/u);
  });

  it("resolves bundled calibrations by MDL content, never by resref", () => {
    expect(
      resolveAreaTileRenderProfile(
        "d2e9e820f3dcbf0a8aca4a461e45a9fca86892ed54c94c1de4b6ebe69394303a"
      )
    ).toMatchObject({
      blackMaterialPolicy: "hide-all-black-materials",
      sourceCropMaskPolicy: "hide"
    });
    expect(
      resolveAreaTileRenderProfile(
        "0e6ca4c04b1548bcf71111cf3ddb1e9d7c3255aaf15816940852278588cca731"
      )
    ).toMatchObject({
      blackMaterialPolicy: "hide-all-black-materials",
      sourceCropMaskPolicy: "preserve"
    });
  });
});
