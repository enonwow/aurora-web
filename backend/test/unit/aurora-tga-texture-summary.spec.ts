import { summarizeAuroraTgaTexture } from "../../src/modules/runtime-settings/domain/aurora-tga-texture-summary";

describe("summarizeAuroraTgaTexture", () => {
  it("summarizes uncompressed 32-bit TGA alpha profile", () => {
    const header = Buffer.alloc(18);
    header.writeUInt8(0, 0);
    header.writeUInt8(0, 1);
    header.writeUInt8(2, 2);
    header.writeUInt16LE(2, 12);
    header.writeUInt16LE(2, 14);
    header.writeUInt8(32, 16);
    header.writeUInt8(8, 17);
    const pixels = Buffer.from([
      255, 255, 255, 0,
      255, 255, 255, 64,
      255, 255, 255, 128,
      255, 255, 255, 255
    ]);

    expect(summarizeAuroraTgaTexture(Buffer.concat([header, pixels]))).toEqual({
      status: "parsed",
      byteLength: 34,
      idLength: 0,
      colorMapType: 0,
      imageType: 2,
      imageTypeLabel: "uncompressed-true-color",
      colorMapLength: 0,
      colorMapDepth: 0,
      width: 2,
      height: 2,
      pixelDepth: 32,
      imageDescriptor: 8,
      alphaBits: 8,
      imageDataOffset: 18,
      expectedPixelCount: 4,
      alphaMin: 0,
      alphaMax: 255,
      alphaUniqueCount: 4,
      alphaZeroPixelCount: 1,
      alphaNonZeroPixelCount: 3,
      alphaCoverage: 0.75,
      proofStatus: "source-backed-retail-tga-header-alpha-profile"
    });
  });
});
