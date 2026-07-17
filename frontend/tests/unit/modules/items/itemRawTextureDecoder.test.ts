import { afterEach, describe, expect, it } from "vitest";
import {
  decodeAuroraCompressedTextureToRgba,
  decodeAuroraPltToRgba,
  decodeBmpToRgba,
  decodeRawTextureToRgba,
  decodeTgaToRgba
} from "../../../../src/modules/items/application/itemRawTextureDecoder";
import {
  AURORA_PLT_PALETTE_CHANNEL_COUNT,
  AURORA_PLT_PALETTE_COLOR_COUNT,
  AURORA_PLT_PALETTE_ROW_COUNT,
  installAuroraPltPaletteDataForTests,
  resetAuroraPltPaletteDataForTests
} from "../../../../src/modules/placeables/adapters/aurora/auroraPltPalette";

function createTga(input: {
  width: number;
  height: number;
  imageType: number;
  pixelDepth: number;
  descriptor?: number;
  payload: number[];
}): Uint8Array {
  const bytes = new Uint8Array(18 + input.payload.length);
  bytes[2] = input.imageType;
  bytes[12] = input.width & 0xff;
  bytes[13] = (input.width >> 8) & 0xff;
  bytes[14] = input.height & 0xff;
  bytes[15] = (input.height >> 8) & 0xff;
  bytes[16] = input.pixelDepth;
  bytes[17] = input.descriptor ?? 0;
  bytes.set(input.payload, 18);
  return bytes;
}

function createBmp(input: {
  width: number;
  height: number;
  bitsPerPixel: 24 | 32;
  topDown?: boolean;
  pixels: Array<[number, number, number, number?]>;
}): Uint8Array {
  const bytesPerPixel = input.bitsPerPixel / 8;
  const rowStride = Math.ceil((input.width * bytesPerPixel) / 4) * 4;
  const pixelOffset = 54;
  const bytes = new Uint8Array(pixelOffset + rowStride * input.height);
  const view = new DataView(bytes.buffer);
  bytes[0] = 0x42;
  bytes[1] = 0x4d;
  view.setUint32(2, bytes.length, true);
  view.setUint32(10, pixelOffset, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, input.width, true);
  view.setInt32(22, input.topDown ? -input.height : input.height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, input.bitsPerPixel, true);
  view.setUint32(34, rowStride * input.height, true);

  for (let fileY = 0; fileY < input.height; fileY += 1) {
    const logicalY = input.topDown ? fileY : input.height - 1 - fileY;
    const rowOffset = pixelOffset + fileY * rowStride;
    for (let x = 0; x < input.width; x += 1) {
      const [red, green, blue, alpha = 255] = input.pixels[logicalY * input.width + x] ?? [
        0,
        0,
        0,
        255
      ];
      const pixelOffsetInRow = rowOffset + x * bytesPerPixel;
      bytes[pixelOffsetInRow] = blue;
      bytes[pixelOffsetInRow + 1] = green;
      bytes[pixelOffsetInRow + 2] = red;
      if (input.bitsPerPixel === 32) {
        bytes[pixelOffsetInRow + 3] = alpha;
      }
    }
  }

  return bytes;
}

function writeFourCc(bytes: Uint8Array, offset: number, fourCc: string): void {
  fourCc.split("").forEach((character, index) => {
    bytes[offset + index] = character.charCodeAt(0);
  });
}

function createTpcDxt1Fixture(): ArrayBuffer {
  const bytes = new ArrayBuffer(28);
  const view = new DataView(bytes);
  view.setUint32(0, 4, true);
  view.setUint32(4, 4, true);
  view.setUint32(8, 3, true);
  view.setUint32(12, 8, true);
  view.setFloat32(16, 1, true);
  view.setUint16(20, 0xf800, true);
  view.setUint16(22, 0x07e0, true);
  view.setUint32(24, 0x000000e4, true);
  return bytes;
}

function createDdsDxt1Fixture(): ArrayBuffer {
  const bytes = new Uint8Array(128 + 8);
  const view = new DataView(bytes.buffer);
  writeFourCc(bytes, 0, "DDS ");
  view.setUint32(4, 124, true);
  view.setUint32(12, 4, true);
  view.setUint32(16, 4, true);
  view.setUint32(76, 32, true);
  view.setUint32(80, 4, true);
  writeFourCc(bytes, 84, "DXT1");
  view.setUint16(128, 0xf800, true);
  view.setUint16(130, 0x07e0, true);
  view.setUint32(132, 0x000000e4, true);
  return bytes.buffer;
}

function createPltFixture(): ArrayBuffer {
  const bytes = new Uint8Array(24 + 4);
  writeFourCc(bytes, 0, "PLT ");
  writeFourCc(bytes, 4, "V1  ");
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 10, true);
  view.setUint32(16, 1, true);
  view.setUint32(20, 2, true);
  bytes[24] = 10;
  bytes[25] = 1;
  bytes[26] = 20;
  bytes[27] = 2;
  return bytes.buffer;
}

function createPltPaletteTable(
  entries: Array<{ row: number; colorIndex: number; rgb: [number, number, number] }>
): Uint8Array {
  const table = new Uint8Array(
    AURORA_PLT_PALETTE_ROW_COUNT *
      AURORA_PLT_PALETTE_COLOR_COUNT *
      AURORA_PLT_PALETTE_CHANNEL_COUNT
  );
  entries.forEach((entry) => {
    const offset =
      (entry.row * AURORA_PLT_PALETTE_COLOR_COUNT + entry.colorIndex) *
      AURORA_PLT_PALETTE_CHANNEL_COUNT;
    table[offset] = entry.rgb[0];
    table[offset + 1] = entry.rgb[1];
    table[offset + 2] = entry.rgb[2];
  });
  return table;
}

describe("itemRawTextureDecoder", () => {
  afterEach(() => {
    resetAuroraPltPaletteDataForTests();
  });

  it("decodes uncompressed 24-bit TGA pixels into top-left RGBA order", () => {
    const tga = createTga({
      width: 2,
      height: 1,
      imageType: 2,
      pixelDepth: 24,
      descriptor: 0x20,
      payload: [
        0,
        0,
        255,
        0,
        255,
        0
      ]
    });

    const decoded = decodeTgaToRgba(tga);

    expect(decoded.width).toBe(2);
    expect(decoded.height).toBe(1);
    expect([...decoded.rgba]).toEqual([
      255,
      0,
      0,
      255,
      0,
      255,
      0,
      255
    ]);
  });

  it("decodes RLE 32-bit TGA packets with alpha", () => {
    const tga = createTga({
      width: 2,
      height: 1,
      imageType: 10,
      pixelDepth: 32,
      descriptor: 0x20,
      payload: [
        0x81,
        30,
        20,
        10,
        128
      ]
    });

    expect([...decodeTgaToRgba(tga).rgba]).toEqual([
      10,
      20,
      30,
      128,
      10,
      20,
      30,
      128
    ]);
  });

  it("flips bottom-origin TGA data into top-left output order", () => {
    const tga = createTga({
      width: 1,
      height: 2,
      imageType: 2,
      pixelDepth: 24,
      descriptor: 0,
      payload: [
        0,
        0,
        255,
        255,
        0,
        0
      ]
    });

    expect([...decodeTgaToRgba(tga).rgba]).toEqual([
      0,
      0,
      255,
      255,
      255,
      0,
      0,
      255
    ]);
  });

  it("decodes bottom-up 24-bit BMP rows with padding into top-left RGBA order", () => {
    const bmp = createBmp({
      width: 3,
      height: 2,
      bitsPerPixel: 24,
      pixels: [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
        [255, 255, 0],
        [0, 255, 255],
        [255, 0, 255]
      ]
    });

    const decoded = decodeBmpToRgba(bmp);

    expect(decoded.width).toBe(3);
    expect(decoded.height).toBe(2);
    expect([...decoded.rgba]).toEqual([
      255,
      0,
      0,
      255,
      0,
      255,
      0,
      255,
      0,
      0,
      255,
      255,
      255,
      255,
      0,
      255,
      0,
      255,
      255,
      255,
      255,
      0,
      255,
      255
    ]);
  });

  it("decodes top-down 32-bit BMP alpha", () => {
    const bmp = createBmp({
      width: 2,
      height: 1,
      bitsPerPixel: 32,
      topDown: true,
      pixels: [
        [10, 20, 30, 64],
        [40, 50, 60, 128]
      ]
    });

    expect([...decodeBmpToRgba(bmp).rgba]).toEqual([
      10,
      20,
      30,
      64,
      40,
      50,
      60,
      128
    ]);
  });

  it("treats 32-bit BMP files with unused zero alpha as opaque", () => {
    const bmp = createBmp({
      width: 1,
      height: 1,
      bitsPerPixel: 32,
      pixels: [[9, 8, 7, 0]]
    });

    expect([...decodeBmpToRgba(bmp).rgba]).toEqual([9, 8, 7, 255]);
  });

  it("decodes Aurora TPC/DDS compressed textures for raw item icons", () => {
    const tpc = decodeAuroraCompressedTextureToRgba(createTpcDxt1Fixture());
    const dds = decodeRawTextureToRgba(createDdsDxt1Fixture(), "dds");

    expect(tpc.width).toBe(4);
    expect(tpc.height).toBe(4);
    expect([...tpc.rgba.slice(0, 16)]).toEqual([
      255,
      0,
      0,
      255,
      255,
      0,
      0,
      255,
      255,
      0,
      0,
      255,
      255,
      0,
      0,
      255
    ]);
    expect([...tpc.rgba.slice(48, 64)]).toEqual([
      255,
      0,
      0,
      255,
      0,
      255,
      0,
      255,
      170,
      85,
      0,
      255,
      85,
      170,
      0,
      255
    ]);
    expect(dds.width).toBe(4);
    expect(dds.height).toBe(4);
    expect([...dds.rgba.slice(0, 16)]).toEqual([
      255,
      0,
      0,
      255,
      255,
      0,
      0,
      255,
      255,
      0,
      0,
      255,
      255,
      0,
      0,
      255
    ]);
    expect([...dds.rgba.slice(48, 64)]).toEqual([
      255,
      0,
      0,
      255,
      0,
      255,
      0,
      255,
      170,
      85,
      0,
      255,
      85,
      170,
      0,
      255
    ]);
  });

  it("decodes Aurora PLT icon bytes as grayscale RGBA fallback", () => {
    const decoded = decodeAuroraPltToRgba(createPltFixture());

    expect(decoded.width).toBe(1);
    expect(decoded.height).toBe(2);
    expect([...decoded.rgba]).toEqual([
      20,
      20,
      20,
      255,
      10,
      10,
      10,
      255
    ]);
  });

  it("maps Aurora PLT icon layers through palette rows when material colors are available", () => {
    installAuroraPltPaletteDataForTests({
      2: createPltPaletteTable([{ row: 17, colorIndex: 20, rgb: [4, 5, 6] }])
    });

    const decoded = decodeAuroraPltToRgba(createPltFixture(), {
      2: 17
    });

    expect(decoded.width).toBe(1);
    expect(decoded.height).toBe(2);
    expect([...decoded.rgba]).toEqual([
      4,
      5,
      6,
      255,
      10,
      10,
      10,
      255
    ]);
  });
});
