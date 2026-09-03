import { buildVfxProofResourceTraces } from "../../scripts/support/vfx-proof-resource-traces";

describe("VFX proof resource traces", () => {
  it("binds source models, textures, TXI sidecars, and chunk models to exact manifest provenance", () => {
    const traces = buildVfxProofResourceTraces({
      sourceModelFileName: "vff_explfire.mdl",
      sourceObjectKeyPrefix: "proof/vfx-broad/row22/sources",
      emitters: [
        {
          nodeName: "fire",
          sourceModelFileName: "vff_explfire.mdl",
          textureRaw: "fxpa_flstrk"
        },
        {
          nodeName: "chunks",
          sourceModelFileName: "vff_explfire.mdl",
          textureRaw: "NULL",
          chunkName: "fx_rockchunksml"
        }
      ],
      resources: [
        {
          resref: "vff_explfire",
          type: "mdl",
          path: "C:/retail/models/vff_explfire.mdl",
          sha256: "sha256:model"
        },
        {
          resref: "fxpa_flstrk",
          type: "tga",
          path: "C:/retail/textures/fxpa_flstrk.tga",
          sha256: "sha256:texture"
        },
        {
          resref: "fxpa_flstrk",
          type: "txi",
          path: "C:/retail/textures/fxpa_flstrk.txi",
          sha256: "sha256:txi"
        },
        {
          resref: "fx_rockchunksml",
          type: "mdl",
          path: "C:/retail/models/fx_rockchunksml.mdl",
          sha256: "sha256:chunk"
        }
      ]
    });

    expect(traces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requestedResourceClass: "model",
          requestedRef: "vff_explfire",
          selectedCandidate: expect.objectContaining({
            sourceLayer: "vanilla",
            resourceHash: "sha256:model"
          })
        }),
        expect.objectContaining({
          requestedResourceClass: "source_model",
          requestedRef: "vff_explfire.mdl",
          selectedCandidate: expect.objectContaining({ resourceHash: "sha256:model" })
        }),
        expect.objectContaining({
          requestedResourceClass: "texture",
          requestedRef: "fxpa_flstrk",
          ownerPath: "mdl:vff_explfire.mdl/emitter:fire/texture",
          selectedCandidate: expect.objectContaining({ resourceHash: "sha256:texture" })
        }),
        expect.objectContaining({
          requestedResourceClass: "txi",
          requestedRef: "fxpa_flstrk.txi",
          ownerPath: "mdl:vff_explfire.mdl/emitter:fire/texture.txi",
          selectedCandidate: expect.objectContaining({ resourceHash: "sha256:txi" })
        }),
        expect.objectContaining({
          requestedResourceClass: "chunk_model",
          requestedRef: "fx_rockchunksml",
          ownerPath: "mdl:vff_explfire.mdl/emitter:chunks/chunkName",
          selectedCandidate: expect.objectContaining({ resourceHash: "sha256:chunk" })
        })
      ])
    );
    expect(traces.some((trace) => trace.requestedRef.trim().toLowerCase() === "null")).toBe(
      false
    );
  });

  it("does not invent resolver candidates for resources absent from the source manifest", () => {
    const traces = buildVfxProofResourceTraces({
      sourceModelFileName: "vfx_missing.mdl",
      sourceObjectKeyPrefix: "proof/vfx-broad/missing/sources",
      emitters: [
        {
          nodeName: "missing",
          sourceModelFileName: "vfx_missing.mdl",
          textureRaw: "missing_texture",
          chunkName: "missing_chunk"
        }
      ],
      resources: []
    });

    expect(traces).toEqual([]);
  });
});
