import { resolveAuroraPltPaletteRgbaSync } from "./auroraPltPalette";

const AURORA_PLT_HEADER_BYTE_LENGTH = 24;
const AURORA_PLT_SIGNATURE = "PLT V1";
const AURORA_PLT_LAYER_COUNT = 10;

export type AuroraPltPaletteRowsByLayer = Readonly<Record<number, number | undefined>>;

export interface AuroraPltTextureDecodeOptions {
  paletteRowsByLayer?: AuroraPltPaletteRowsByLayer;
}

export interface DecodedAuroraPltTexture {
  width: number;
  height: number;
  data: Uint8Array;
  numLayers: number;
  usedLayers: boolean[];
  sourceFormat: "plt-grayscale" | "plt-palette";
}

function readUint32Le(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function readAscii(bytes: Uint8Array, start: number, length: number): string {
  let value = "";
  for (let index = start; index < start + length; index += 1) {
    value += String.fromCharCode(bytes[index] ?? 0);
  }
  return value;
}

function flipRgbaRows(data: Uint8Array, width: number, height: number): void {
  const rowByteLength = width * 4;
  const scratch = new Uint8Array(rowByteLength);
  for (let row = 0; row < Math.floor(height / 2); row += 1) {
    const top = row * rowByteLength;
    const bottom = (height - 1 - row) * rowByteLength;
    scratch.set(data.subarray(top, top + rowByteLength));
    data.copyWithin(top, bottom, bottom + rowByteLength);
    data.set(scratch, bottom);
  }
}

export function decodeAuroraPltTexture(
  bytes: ArrayBuffer,
  options: AuroraPltTextureDecodeOptions = {}
): DecodedAuroraPltTexture | null {
  if (bytes.byteLength < AURORA_PLT_HEADER_BYTE_LENGTH) {
    return null;
  }

  const source = new Uint8Array(bytes);
  const signature = readAscii(source, 0, 8);
  if (!signature.startsWith(AURORA_PLT_SIGNATURE)) {
    return null;
  }

  const view = new DataView(bytes);
  const numLayers = readUint32Le(view, 8);
  const width = readUint32Le(view, 16);
  const height = readUint32Le(view, 20);
  if (width <= 0 || height <= 0 || width > 8192 || height > 8192) {
    return null;
  }

  const pixelCount = width * height;
  const expectedPayloadByteLength = pixelCount * 2;
  if (bytes.byteLength - AURORA_PLT_HEADER_BYTE_LENGTH < expectedPayloadByteLength) {
    return null;
  }

  const data = new Uint8Array(pixelCount * 4);
  const usedLayers = new Array(AURORA_PLT_LAYER_COUNT).fill(false);
  let usedPaletteRows = false;
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const sourceOffset = AURORA_PLT_HEADER_BYTE_LENGTH + pixelIndex * 2;
    const colorIndex = source[sourceOffset] ?? 0;
    const layerIndex = source[sourceOffset + 1] ?? 0;
    if (layerIndex >= 0 && layerIndex < usedLayers.length) {
      usedLayers[layerIndex] = true;
    }

    const paletteRow = options.paletteRowsByLayer?.[layerIndex];
    const paletteColor =
      typeof paletteRow === "number"
        ? resolveAuroraPltPaletteRgbaSync(layerIndex, paletteRow, colorIndex)
        : null;

    const targetOffset = pixelIndex * 4;
    if (paletteColor) {
      data[targetOffset] = paletteColor[0];
      data[targetOffset + 1] = paletteColor[1];
      data[targetOffset + 2] = paletteColor[2];
      data[targetOffset + 3] = paletteColor[3];
      usedPaletteRows = true;
    } else {
      data[targetOffset] = colorIndex;
      data[targetOffset + 1] = colorIndex;
      data[targetOffset + 2] = colorIndex;
      data[targetOffset + 3] = 255;
    }
  }

  flipRgbaRows(data, width, height);
  return {
    width,
    height,
    data,
    numLayers,
    usedLayers,
    sourceFormat: usedPaletteRows ? "plt-palette" : "plt-grayscale"
  };
}
