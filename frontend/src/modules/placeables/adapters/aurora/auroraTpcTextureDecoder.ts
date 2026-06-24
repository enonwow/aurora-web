const AURORA_TPC_HEADER_BYTE_LENGTH = 20;
const AURORA_TPC_DXT1_FORMAT = 3;
const AURORA_TPC_DXT5_FORMAT = 4;
const DXT1_BLOCK_BYTE_LENGTH = 8;
const DXT5_BLOCK_BYTE_LENGTH = 16;

export interface DecodedAuroraTpcTexture {
  width: number;
  height: number;
  data: Uint8Array;
  sourceFormat: "tpc-dxt1" | "tpc-dxt5";
}

function resolveDxt1MipByteLength(width: number, height: number): number {
  return (
    Math.max(1, Math.ceil(width / 4)) *
    Math.max(1, Math.ceil(height / 4)) *
    DXT1_BLOCK_BYTE_LENGTH
  );
}

function resolveDxt5MipByteLength(width: number, height: number): number {
  return (
    Math.max(1, Math.ceil(width / 4)) *
    Math.max(1, Math.ceil(height / 4)) *
    DXT5_BLOCK_BYTE_LENGTH
  );
}

function readRgb565(view: DataView, offset: number): [number, number, number, number] {
  const value = view.getUint16(offset, true);
  const red = Math.round((((value >> 11) & 0x1f) * 255) / 31);
  const green = Math.round((((value >> 5) & 0x3f) * 255) / 63);
  const blue = Math.round(((value & 0x1f) * 255) / 31);
  return [red, green, blue, 255];
}

function mixDxtColor(
  left: [number, number, number, number],
  right: [number, number, number, number],
  leftWeight: number,
  rightWeight: number,
  divisor: number
): [number, number, number, number] {
  return [
    Math.round((left[0] * leftWeight + right[0] * rightWeight) / divisor),
    Math.round((left[1] * leftWeight + right[1] * rightWeight) / divisor),
    Math.round((left[2] * leftWeight + right[2] * rightWeight) / divisor),
    Math.round((left[3] * leftWeight + right[3] * rightWeight) / divisor)
  ];
}

function resolveDxt5AlphaPalette(alpha0: number, alpha1: number): number[] {
  if (alpha0 > alpha1) {
    return [
      alpha0,
      alpha1,
      Math.round((6 * alpha0 + alpha1) / 7),
      Math.round((5 * alpha0 + 2 * alpha1) / 7),
      Math.round((4 * alpha0 + 3 * alpha1) / 7),
      Math.round((3 * alpha0 + 4 * alpha1) / 7),
      Math.round((2 * alpha0 + 5 * alpha1) / 7),
      Math.round((alpha0 + 6 * alpha1) / 7)
    ];
  }

  return [
    alpha0,
    alpha1,
    Math.round((4 * alpha0 + alpha1) / 5),
    Math.round((3 * alpha0 + 2 * alpha1) / 5),
    Math.round((2 * alpha0 + 3 * alpha1) / 5),
    Math.round((alpha0 + 4 * alpha1) / 5),
    0,
    255
  ];
}

function decodeDxt1Block(
  view: DataView,
  blockOffset: number,
  width: number,
  height: number,
  blockX: number,
  blockY: number,
  data: Uint8Array
): void {
  const color0Value = view.getUint16(blockOffset, true);
  const color1Value = view.getUint16(blockOffset + 2, true);
  const color0 = readRgb565(view, blockOffset);
  const color1 = readRgb565(view, blockOffset + 2);
  const palette: [number, number, number, number][] =
    color0Value > color1Value
      ? [
          color0,
          color1,
          mixDxtColor(color0, color1, 2, 1, 3),
          mixDxtColor(color0, color1, 1, 2, 3)
        ]
      : [color0, color1, mixDxtColor(color0, color1, 1, 1, 2), [0, 0, 0, 0]];
  const indices = view.getUint32(blockOffset + 4, true);

  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const x = blockX * 4 + column;
      const y = blockY * 4 + row;
      if (x >= width || y >= height) {
        continue;
      }
      const paletteIndex = (indices >> (2 * (row * 4 + column))) & 0x03;
      const color = palette[paletteIndex] ?? [0, 0, 0, 255];
      const targetOffset = (y * width + x) * 4;
      data[targetOffset] = color[0];
      data[targetOffset + 1] = color[1];
      data[targetOffset + 2] = color[2];
      data[targetOffset + 3] = color[3];
    }
  }
}

function decodeDxt5Block(
  view: DataView,
  blockOffset: number,
  width: number,
  height: number,
  blockX: number,
  blockY: number,
  data: Uint8Array
): void {
  const alpha0 = view.getUint8(blockOffset);
  const alpha1 = view.getUint8(blockOffset + 1);
  const alphaIndexBytes = [
    view.getUint8(blockOffset + 2),
    view.getUint8(blockOffset + 3),
    view.getUint8(blockOffset + 4),
    view.getUint8(blockOffset + 5),
    view.getUint8(blockOffset + 6),
    view.getUint8(blockOffset + 7)
  ];
  const alphaPalette = resolveDxt5AlphaPalette(alpha0, alpha1);
  const colorOffset = blockOffset + 8;
  const color0 = readRgb565(view, colorOffset);
  const color1 = readRgb565(view, colorOffset + 2);
  const colorPalette: [number, number, number][] = [
    [color0[0], color0[1], color0[2]],
    [color1[0], color1[1], color1[2]],
    [
      Math.round((2 * color0[0] + color1[0]) / 3),
      Math.round((2 * color0[1] + color1[1]) / 3),
      Math.round((2 * color0[2] + color1[2]) / 3)
    ],
    [
      Math.round((color0[0] + 2 * color1[0]) / 3),
      Math.round((color0[1] + 2 * color1[1]) / 3),
      Math.round((color0[2] + 2 * color1[2]) / 3)
    ]
  ];
  const colorIndices = view.getUint32(colorOffset + 4, true);
  let alphaBits = 0n;
  for (let index = 0; index < alphaIndexBytes.length; index += 1) {
    alphaBits |= BigInt(alphaIndexBytes[index] ?? 0) << BigInt(index * 8);
  }

  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const x = blockX * 4 + column;
      const y = blockY * 4 + row;
      if (x >= width || y >= height) {
        continue;
      }
      const pixelIndex = row * 4 + column;
      const colorPaletteIndex = (colorIndices >> (2 * pixelIndex)) & 0x03;
      const alphaPaletteIndex = Number((alphaBits >> BigInt(pixelIndex * 3)) & 0x07n);
      const rgb = colorPalette[colorPaletteIndex] ?? [0, 0, 0];
      const alpha = alphaPalette[alphaPaletteIndex] ?? 255;
      const targetOffset = (y * width + x) * 4;
      data[targetOffset] = rgb[0];
      data[targetOffset + 1] = rgb[1];
      data[targetOffset + 2] = rgb[2];
      data[targetOffset + 3] = alpha;
    }
  }
}

export function decodeAuroraTpcTexture(bytes: ArrayBuffer): DecodedAuroraTpcTexture | null {
  if (bytes.byteLength < AURORA_TPC_HEADER_BYTE_LENGTH) {
    return null;
  }
  const view = new DataView(bytes);
  const width = view.getUint32(0, true);
  const height = view.getUint32(4, true);
  const format = view.getUint32(8, true);
  const declaredMipByteLength = view.getUint32(12, true);
  if (
    width <= 0 ||
    height <= 0 ||
    width > 8192 ||
    height > 8192 ||
    (format !== AURORA_TPC_DXT1_FORMAT && format !== AURORA_TPC_DXT5_FORMAT)
  ) {
    return null;
  }

  const mipByteLength =
    format === AURORA_TPC_DXT1_FORMAT
      ? resolveDxt1MipByteLength(width, height)
      : resolveDxt5MipByteLength(width, height);
  if (declaredMipByteLength > 0 && declaredMipByteLength < mipByteLength) {
    return null;
  }
  const dataOffset = AURORA_TPC_HEADER_BYTE_LENGTH;
  if (bytes.byteLength < dataOffset + mipByteLength) {
    return null;
  }

  const data = new Uint8Array(width * height * 4);
  const blocksX = Math.max(1, Math.ceil(width / 4));
  const blocksY = Math.max(1, Math.ceil(height / 4));
  const blockByteLength =
    format === AURORA_TPC_DXT1_FORMAT ? DXT1_BLOCK_BYTE_LENGTH : DXT5_BLOCK_BYTE_LENGTH;

  for (let blockY = 0; blockY < blocksY; blockY += 1) {
    for (let blockX = 0; blockX < blocksX; blockX += 1) {
      const blockOffset = dataOffset + (blockY * blocksX + blockX) * blockByteLength;
      if (format === AURORA_TPC_DXT1_FORMAT) {
        decodeDxt1Block(view, blockOffset, width, height, blockX, blockY, data);
      } else {
        decodeDxt5Block(view, blockOffset, width, height, blockX, blockY, data);
      }
    }
  }

  return {
    width,
    height,
    data,
    sourceFormat: format === AURORA_TPC_DXT1_FORMAT ? "tpc-dxt1" : "tpc-dxt5"
  };
}
