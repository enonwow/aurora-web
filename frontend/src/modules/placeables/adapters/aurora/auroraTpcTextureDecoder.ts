const AURORA_TPC_HEADER_BYTE_LENGTH = 20;
const AURORA_TPC_DXT1_FORMAT = 3;
const AURORA_TPC_DXT5_FORMAT = 4;
const STANDARD_DDS_HEADER_BYTE_LENGTH = 128;
const DXT1_BLOCK_BYTE_LENGTH = 8;
const DXT5_BLOCK_BYTE_LENGTH = 16;
const BC4_BLOCK_BYTE_LENGTH = 8;
const BC5_BLOCK_BYTE_LENGTH = 16;

export interface DecodedAuroraTpcTexture {
  width: number;
  height: number;
  data: Uint8Array;
  sourceFormat:
    | "tpc-dxt1"
    | "tpc-dxt5"
    | "dds-bc4"
    | "dds-bc5"
    | "dds-dxt1"
    | "dds-dxt3"
    | "dds-dxt5";
  hasAlpha: boolean;
  isBimodal: boolean;
  softAlphaPixelRatio: number;
  isNormalMap: boolean;
}

function computeAuroraTpcAlphaProfile(data: Uint8Array): {
  hasAlpha: boolean;
  isBimodal: boolean;
  softAlphaPixelRatio: number;
} {
  const totalPixels = data.length / 4;
  if (totalPixels <= 0) {
    return { hasAlpha: false, isBimodal: true, softAlphaPixelRatio: 0 };
  }

  let transparentOrPartialPixels = 0;
  let softAlphaPixels = 0;
  for (let index = 3; index < data.length; index += 4) {
    const alpha = data[index] ?? 255;
    if (alpha !== 255) {
      transparentOrPartialPixels += 1;
    }
    if (alpha > 10 && alpha < 245) {
      softAlphaPixels += 1;
    }
  }

  const softAlphaPixelRatio = softAlphaPixels / totalPixels;
  return {
    hasAlpha: transparentOrPartialPixels > 0,
    isBimodal: softAlphaPixelRatio < 0.05,
    softAlphaPixelRatio
  };
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

function resolveBlockMipByteLength(width: number, height: number, blockByteLength: number): number {
  return (
    Math.max(1, Math.ceil(width / 4)) *
    Math.max(1, Math.ceil(height / 4)) *
    blockByteLength
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

function decodeDxt3Block(
  view: DataView,
  blockOffset: number,
  width: number,
  height: number,
  blockX: number,
  blockY: number,
  data: Uint8Array
): void {
  const alphaValues: number[] = [];
  for (let byteIndex = 0; byteIndex < 8; byteIndex += 1) {
    const packed = view.getUint8(blockOffset + byteIndex);
    alphaValues.push((packed & 0x0f) * 17);
    alphaValues.push(((packed >> 4) & 0x0f) * 17);
  }

  const colorOffset = blockOffset + 8;
  const color0Value = view.getUint16(colorOffset, true);
  const color1Value = view.getUint16(colorOffset + 2, true);
  const color0 = readRgb565(view, colorOffset);
  const color1 = readRgb565(view, colorOffset + 2);
  const colorPalette: [number, number, number][] =
    color0Value > color1Value
      ? [
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
        ]
      : [
          [color0[0], color0[1], color0[2]],
          [color1[0], color1[1], color1[2]],
          [
            Math.round((color0[0] + color1[0]) / 2),
            Math.round((color0[1] + color1[1]) / 2),
            Math.round((color0[2] + color1[2]) / 2)
          ],
          [0, 0, 0]
        ];
  const colorIndices = view.getUint32(colorOffset + 4, true);

  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const x = blockX * 4 + column;
      const y = blockY * 4 + row;
      if (x >= width || y >= height) {
        continue;
      }
      const pixelIndex = row * 4 + column;
      const colorPaletteIndex = (colorIndices >> (2 * pixelIndex)) & 0x03;
      const rgb = colorPalette[colorPaletteIndex] ?? [0, 0, 0];
      const targetOffset = (y * width + x) * 4;
      data[targetOffset] = rgb[0];
      data[targetOffset + 1] = rgb[1];
      data[targetOffset + 2] = rgb[2];
      data[targetOffset + 3] = alphaValues[pixelIndex] ?? 255;
    }
  }
}

function isStandardDdsBytes(bytes: ArrayBuffer): boolean {
  if (bytes.byteLength < 4) {
    return false;
  }
  const data = new Uint8Array(bytes, 0, 4);
  return data[0] === 0x44 && data[1] === 0x44 && data[2] === 0x53 && data[3] === 0x20;
}

function readAsciiToken(data: Uint8Array, offset: number, length: number): string {
  let token = "";
  for (let index = 0; index < length; index += 1) {
    token += String.fromCharCode(data[offset + index] ?? 0);
  }
  return token;
}

function decodeBc4Block(view: DataView, blockOffset: number): number[] {
  const value0 = view.getUint8(blockOffset);
  const value1 = view.getUint8(blockOffset + 1);
  const palette = resolveDxt5AlphaPalette(value0, value1);
  let bits = 0n;
  for (let index = 0; index < 6; index += 1) {
    bits |= BigInt(view.getUint8(blockOffset + 2 + index)) << BigInt(index * 8);
  }
  const values: number[] = [];
  for (let pixelIndex = 0; pixelIndex < 16; pixelIndex += 1) {
    const paletteIndex = Number((bits >> BigInt(pixelIndex * 3)) & 0x07n);
    values.push(palette[paletteIndex] ?? 255);
  }
  return values;
}

function decodeStandardDdsTexture(bytes: ArrayBuffer): DecodedAuroraTpcTexture | null {
  if (bytes.byteLength < STANDARD_DDS_HEADER_BYTE_LENGTH) {
    return null;
  }
  const view = new DataView(bytes);
  const data = new Uint8Array(bytes);
  const height = view.getUint32(12, true);
  const width = view.getUint32(16, true);
  if (width <= 0 || height <= 0 || width > 8192 || height > 8192) {
    return null;
  }

  const fourCc = readAsciiToken(data, 84, 4).toUpperCase();
  const isBc4 = fourCc === "ATI1" || fourCc === "BC4U" || fourCc === "BC4S";
  const isBc5 = fourCc === "ATI2" || fourCc === "BC5U" || fourCc === "BC5S";
  const isDxt1 = fourCc === "DXT1";
  const isDxt3 = fourCc === "DXT3";
  const isDxt5 = fourCc === "DXT5";
  if (!isBc4 && !isBc5 && !isDxt1 && !isDxt3 && !isDxt5) {
    return null;
  }

  const blockByteLength =
    isBc5 || isDxt3 || isDxt5 ? BC5_BLOCK_BYTE_LENGTH : BC4_BLOCK_BYTE_LENGTH;
  const mipByteLength = resolveBlockMipByteLength(width, height, blockByteLength);
  const dataOffset = STANDARD_DDS_HEADER_BYTE_LENGTH;
  if (bytes.byteLength < dataOffset + mipByteLength) {
    return null;
  }

  const pixels = new Uint8Array(width * height * 4);
  const blocksX = Math.max(1, Math.ceil(width / 4));
  const blocksY = Math.max(1, Math.ceil(height / 4));
  for (let blockY = 0; blockY < blocksY; blockY += 1) {
    for (let blockX = 0; blockX < blocksX; blockX += 1) {
      const blockOffset = dataOffset + (blockY * blocksX + blockX) * blockByteLength;
      if (isDxt1) {
        decodeDxt1Block(view, blockOffset, width, height, blockX, blockY, pixels);
        continue;
      }
      if (isDxt3) {
        decodeDxt3Block(view, blockOffset, width, height, blockX, blockY, pixels);
        continue;
      }
      if (isDxt5) {
        decodeDxt5Block(view, blockOffset, width, height, blockX, blockY, pixels);
        continue;
      }
      const redValues = decodeBc4Block(view, blockOffset);
      const greenValues = isBc5 ? decodeBc4Block(view, blockOffset + BC4_BLOCK_BYTE_LENGTH) : [];
      for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 4; column += 1) {
          const x = blockX * 4 + column;
          const y = blockY * 4 + row;
          if (x >= width || y >= height) {
            continue;
          }
          const pixelIndex = row * 4 + column;
          const red = redValues[pixelIndex] ?? 255;
          const green = isBc5 ? (greenValues[pixelIndex] ?? 255) : red;
          const blue = isBc5
            ? Math.round(
                (Math.sqrt(
                  Math.max(
                    0,
                    1 -
                      (red / 127.5 - 1) * (red / 127.5 - 1) -
                      (green / 127.5 - 1) * (green / 127.5 - 1)
                  )
                ) +
                  1) *
                  127.5
              )
            : red;
          const targetOffset = (y * width + x) * 4;
          pixels[targetOffset] = red;
          pixels[targetOffset + 1] = green;
          pixels[targetOffset + 2] = blue;
          pixels[targetOffset + 3] = 255;
        }
      }
    }
  }

  const alphaProfile = computeAuroraTpcAlphaProfile(pixels);
  return {
    width,
    height,
    data: pixels,
    sourceFormat: isBc5
      ? "dds-bc5"
      : isBc4
        ? "dds-bc4"
        : isDxt5
          ? "dds-dxt5"
          : isDxt3
            ? "dds-dxt3"
            : "dds-dxt1",
    ...alphaProfile,
    isNormalMap: isBc5
  };
}

export function decodeAuroraTpcTexture(bytes: ArrayBuffer): DecodedAuroraTpcTexture | null {
  if (isStandardDdsBytes(bytes)) {
    return decodeStandardDdsTexture(bytes);
  }

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

  const alphaProfile = computeAuroraTpcAlphaProfile(data);
  return {
    width,
    height,
    data,
    sourceFormat: format === AURORA_TPC_DXT1_FORMAT ? "tpc-dxt1" : "tpc-dxt5",
    ...alphaProfile,
    isNormalMap: false
  };
}
