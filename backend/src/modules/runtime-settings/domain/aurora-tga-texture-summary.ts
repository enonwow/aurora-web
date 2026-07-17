export interface AuroraTgaTextureSummary {
  readonly status: "parsed";
  readonly byteLength: number;
  readonly idLength: number;
  readonly colorMapType: number;
  readonly imageType: number;
  readonly imageTypeLabel: string;
  readonly colorMapLength: number;
  readonly colorMapDepth: number;
  readonly width: number;
  readonly height: number;
  readonly pixelDepth: number;
  readonly imageDescriptor: number;
  readonly alphaBits: number;
  readonly imageDataOffset: number;
  readonly expectedPixelCount: number;
  readonly alphaMin: number | null;
  readonly alphaMax: number | null;
  readonly alphaUniqueCount: number | null;
  readonly alphaZeroPixelCount: number | null;
  readonly alphaNonZeroPixelCount: number | null;
  readonly alphaCoverage: number | null;
  readonly proofStatus: "source-backed-retail-tga-header-alpha-profile";
}

export function summarizeAuroraTgaTexture(bytes: Buffer): AuroraTgaTextureSummary {
  if (bytes.length < 18) {
    throw new Error(`TGA payload is too small: ${bytes.length} bytes.`);
  }

  const idLength = bytes.readUInt8(0);
  const colorMapType = bytes.readUInt8(1);
  const imageType = bytes.readUInt8(2);
  const colorMapLength = bytes.readUInt16LE(5);
  const colorMapDepth = bytes.readUInt8(7);
  const width = bytes.readUInt16LE(12);
  const height = bytes.readUInt16LE(14);
  const pixelDepth = bytes.readUInt8(16);
  const imageDescriptor = bytes.readUInt8(17);
  const alphaBits = imageDescriptor & 0x0f;
  const bytesPerPixel = pixelDepth / 8;
  const colorMapBytes =
    colorMapType === 0 ? 0 : colorMapLength * Math.ceil(colorMapDepth / 8);
  const imageDataOffset = 18 + idLength + colorMapBytes;
  const expectedPixelCount = width * height;
  const imageTypeLabel = resolveAuroraTgaImageTypeLabel(imageType);

  let alphaMin: number | null = null;
  let alphaMax: number | null = null;
  let alphaUniqueCount: number | null = null;
  let alphaZeroPixelCount: number | null = null;
  let alphaNonZeroPixelCount: number | null = null;
  let alphaCoverage: number | null = null;

  if (
    imageType === 2 &&
    Number.isInteger(bytesPerPixel) &&
    bytesPerPixel >= 4 &&
    expectedPixelCount > 0 &&
    imageDataOffset + expectedPixelCount * bytesPerPixel <= bytes.length
  ) {
    const uniqueAlpha = new Set<number>();
    let minAlpha = 255;
    let maxAlpha = 0;
    let zeroPixels = 0;
    let nonZeroPixels = 0;
    for (let pixelIndex = 0; pixelIndex < expectedPixelCount; pixelIndex += 1) {
      const alpha = bytes[imageDataOffset + pixelIndex * bytesPerPixel + 3] ?? 0;
      minAlpha = Math.min(minAlpha, alpha);
      maxAlpha = Math.max(maxAlpha, alpha);
      uniqueAlpha.add(alpha);
      if (alpha === 0) {
        zeroPixels += 1;
      } else {
        nonZeroPixels += 1;
      }
    }
    alphaMin = minAlpha;
    alphaMax = maxAlpha;
    alphaUniqueCount = uniqueAlpha.size;
    alphaZeroPixelCount = zeroPixels;
    alphaNonZeroPixelCount = nonZeroPixels;
    alphaCoverage = Number((nonZeroPixels / expectedPixelCount).toFixed(6));
  }

  return {
    status: "parsed",
    byteLength: bytes.length,
    idLength,
    colorMapType,
    imageType,
    imageTypeLabel,
    colorMapLength,
    colorMapDepth,
    width,
    height,
    pixelDepth,
    imageDescriptor,
    alphaBits,
    imageDataOffset,
    expectedPixelCount,
    alphaMin,
    alphaMax,
    alphaUniqueCount,
    alphaZeroPixelCount,
    alphaNonZeroPixelCount,
    alphaCoverage,
    proofStatus: "source-backed-retail-tga-header-alpha-profile"
  };
}

function resolveAuroraTgaImageTypeLabel(imageType: number): string {
  switch (imageType) {
    case 2:
      return "uncompressed-true-color";
    case 10:
      return "rle-true-color";
    default:
      return `type-${imageType}`;
  }
}
