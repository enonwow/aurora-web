import { parseAuroraTextureTxiSourceState } from "../../src/modules/vfx/domain/aurora-vfx-texture-txi-source.parser";

describe("parseAuroraTextureTxiSourceState", () => {
  it("preserves generic material, atlas, sampler, and provenance fields", () => {
    const state = parseAuroraTextureTxiSourceState(
      Buffer.from(
        [
          "proceduretype cycle",
          "numx 8",
          "numy 2",
          "fps 24.5",
          "blending additive",
          "decal 1",
          "clamp 3",
          "mipmap 0",
          "filter no",
          "bumpmaptexture arbitrary_bump.tga",
          "envmaptexture arbitrary_env.dds",
          "downsamplemin 1",
          "downsamplemax 4"
        ].join("\n")
      ),
      "retail/textures/arbitrary_sheet.txi"
    );

    expect(state).toEqual({
      source: "retail/textures/arbitrary_sheet.txi",
      proceduretype: "cycle",
      numx: 8,
      numy: 2,
      fps: 24.5,
      blending: "additive",
      decal: true,
      clamp: 3,
      mipmap: false,
      filter: false,
      bumpmaptexture: "arbitrary_bump",
      envmaptexture: "arbitrary_env",
      downsampleMin: 1,
      downsampleMax: 4
    });
  });

  it("does not invent behavior for unsupported or invalid TXI values", () => {
    const state = parseAuroraTextureTxiSourceState(
      Buffer.from(
        [
          "blending mystery",
          "decal maybe",
          "clamp 9",
          "numx 0",
          "numy -2",
          "fps -1",
          "downsamplemin nope",
          "downsamplemax NaN"
        ].join("\n")
      ),
      "arbitrary-invalid.txi"
    );

    expect(state).toEqual({ source: "arbitrary-invalid.txi" });
  });
});
