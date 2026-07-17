import {
  decodeAuroraPltTexture,
  type AuroraPltPaletteRowsByLayer
} from "../../placeables/adapters/aurora/auroraPltTextureDecoder";
import { decodeAuroraTpcTexture } from "../../placeables/adapters/aurora/auroraTpcTextureDecoder";

export interface DecodedRawTextureImage {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}

const TGA_HEADER_BYTES = 18;
const BMP_FILE_HEADER_BYTES = 14;
const BMP_DIB_HEADER_MIN_BYTES = 40;

function readUint16Le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | ((bytes[offset + 1] ?? 0) << 8);
}

function readUint32Le(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) |
    ((bytes[offset + 1] ?? 0) << 8) |
    ((bytes[offset + 2] ?? 0) << 16) |
    ((bytes[offset + 3] ?? 0) << 24)
  ) >>> 0;
}

function readInt32Le(bytes: Uint8Array, offset: number): number {
  return readUint32Le(bytes, offset) | 0;
}

function toExactArrayBuffer(input: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (!(input instanceof Uint8Array)) {
    return input;
  }
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);
  return copy.buffer;
}

function toClampedRgba(data: Uint8Array): Uint8ClampedArray {
  return new Uint8ClampedArray(data);
}

function flipRgbaRows(data: Uint8Array, width: number, height: number): Uint8Array {
  const rowByteLength = width * 4;
  const flippedData = new Uint8Array(data.length);
  for (let row = 0; row < height; row += 1) {
    const sourceOffset = row * rowByteLength;
    const targetOffset = (height - 1 - row) * rowByteLength;
    flippedData.set(data.subarray(sourceOffset, sourceOffset + rowByteLength), targetOffset);
  }
  return flippedData;
}

function readTgaPixel(
  bytes: Uint8Array,
  offset: number,
  bytesPerPixel: number,
  pixelDepth: number
): [number, number, number, number] {
  if (pixelDepth === 8) {
    const value = bytes[offset] ?? 0;
    return [value, value, value, 255];
  }
  const blue = bytes[offset] ?? 0;
  const green = bytes[offset + 1] ?? 0;
  const red = bytes[offset + 2] ?? 0;
  const alpha = bytesPerPixel >= 4 ? bytes[offset + 3] ?? 255 : 255;
  return [red, green, blue, alpha];
}

function writePixel(
  output: Uint8ClampedArray,
  width: number,
  pixelIndex: number,
  descriptor: number,
  pixel: [number, number, number, number]
): void {
  const sourceX = pixelIndex % width;
  const sourceY = Math.floor(pixelIndex / width);
  const leftToRight = (descriptor & 0x10) === 0;
  const topToBottom = (descriptor & 0x20) !== 0;
  const x = leftToRight ? sourceX : width - 1 - sourceX;
  const height = output.length / 4 / width;
  const y = topToBottom ? sourceY : height - 1 - sourceY;
  const outputOffset = (y * width + x) * 4;
  output[outputOffset] = pixel[0];
  output[outputOffset + 1] = pixel[1];
  output[outputOffset + 2] = pixel[2];
  output[outputOffset + 3] = pixel[3];
}

export function decodeTgaToRgba(input: ArrayBuffer | Uint8Array): DecodedRawTextureImage {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < TGA_HEADER_BYTES) {
    throw new Error("TGA header is too short.");
  }

  const idLength = bytes[0] ?? 0;
  const colorMapType = bytes[1] ?? 0;
  const imageType = bytes[2] ?? 0;
  const colorMapLength = readUint16Le(bytes, 5);
  const colorMapEntrySize = bytes[7] ?? 0;
  const width = readUint16Le(bytes, 12);
  const height = readUint16Le(bytes, 14);
  const pixelDepth = bytes[16] ?? 0;
  const descriptor = bytes[17] ?? 0;
  const bytesPerPixel = Math.ceil(pixelDepth / 8);

  if (width < 1 || height < 1) {
    throw new Error("TGA image has invalid dimensions.");
  }
  if (![8, 24, 32].includes(pixelDepth)) {
    throw new Error(`Unsupported TGA pixel depth: ${pixelDepth}.`);
  }
  if (![2, 3, 10, 11].includes(imageType)) {
    throw new Error(`Unsupported TGA image type: ${imageType}.`);
  }
  if (colorMapType !== 0 || colorMapLength > 0) {
    throw new Error("Color-mapped TGA icons are not supported yet.");
  }

  const pixelOffset =
    TGA_HEADER_BYTES + idLength + Math.ceil((colorMapLength * colorMapEntrySize) / 8);
  if (pixelOffset >= bytes.length) {
    throw new Error("TGA pixel data is missing.");
  }

  const output = new Uint8ClampedArray(width * height * 4);
  const pixelCount = width * height;
  let inputOffset = pixelOffset;
  let pixelIndex = 0;

  if (imageType === 2 || imageType === 3) {
    while (pixelIndex < pixelCount) {
      if (inputOffset + bytesPerPixel > bytes.length) {
        throw new Error("TGA pixel data ended early.");
      }
      writePixel(
        output,
        width,
        pixelIndex,
        descriptor,
        readTgaPixel(bytes, inputOffset, bytesPerPixel, pixelDepth)
      );
      inputOffset += bytesPerPixel;
      pixelIndex += 1;
    }
  } else {
    while (pixelIndex < pixelCount) {
      const packet = bytes[inputOffset];
      inputOffset += 1;
      if (packet === undefined) {
        throw new Error("TGA RLE packet data ended early.");
      }
      const runLength = (packet & 0x7f) + 1;
      const isRunLengthPacket = (packet & 0x80) !== 0;
      if (isRunLengthPacket) {
        if (inputOffset + bytesPerPixel > bytes.length) {
          throw new Error("TGA RLE pixel data ended early.");
        }
        const pixel = readTgaPixel(bytes, inputOffset, bytesPerPixel, pixelDepth);
        inputOffset += bytesPerPixel;
        for (let runIndex = 0; runIndex < runLength && pixelIndex < pixelCount; runIndex += 1) {
          writePixel(output, width, pixelIndex, descriptor, pixel);
          pixelIndex += 1;
        }
      } else {
        for (let runIndex = 0; runIndex < runLength && pixelIndex < pixelCount; runIndex += 1) {
          if (inputOffset + bytesPerPixel > bytes.length) {
            throw new Error("TGA raw packet data ended early.");
          }
          writePixel(
            output,
            width,
            pixelIndex,
            descriptor,
            readTgaPixel(bytes, inputOffset, bytesPerPixel, pixelDepth)
          );
          inputOffset += bytesPerPixel;
          pixelIndex += 1;
        }
      }
    }
  }

  return { width, height, rgba: output };
}

export function decodeTgaToPngDataUrl(input: ArrayBuffer | Uint8Array): string {
  const decoded = decodeTgaToRgba(input);
  return encodeDecodedRawTextureToPngDataUrl(decoded, "TGA");
}

export function decodeBmpToRgba(input: ArrayBuffer | Uint8Array): DecodedRawTextureImage {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < BMP_FILE_HEADER_BYTES + BMP_DIB_HEADER_MIN_BYTES) {
    throw new Error("BMP header is too short.");
  }
  if (bytes[0] !== 0x42 || bytes[1] !== 0x4d) {
    throw new Error("BMP signature is missing.");
  }

  const pixelOffset = readUint32Le(bytes, 10);
  const dibHeaderSize = readUint32Le(bytes, 14);
  if (dibHeaderSize < BMP_DIB_HEADER_MIN_BYTES) {
    throw new Error(`Unsupported BMP DIB header size: ${dibHeaderSize}.`);
  }

  const width = readInt32Le(bytes, 18);
  const rawHeight = readInt32Le(bytes, 22);
  const planes = readUint16Le(bytes, 26);
  const bitsPerPixel = readUint16Le(bytes, 28);
  const compression = readUint32Le(bytes, 30);
  const height = Math.abs(rawHeight);
  const topDown = rawHeight < 0;

  if (width < 1 || height < 1) {
    throw new Error("BMP image has invalid dimensions.");
  }
  if (planes !== 1) {
    throw new Error(`Unsupported BMP plane count: ${planes}.`);
  }
  if (![24, 32].includes(bitsPerPixel)) {
    throw new Error(`Unsupported BMP pixel depth: ${bitsPerPixel}.`);
  }
  if (compression !== 0) {
    throw new Error(`Unsupported BMP compression: ${compression}.`);
  }

  const bytesPerPixel = bitsPerPixel / 8;
  const rowStride = Math.ceil((width * bytesPerPixel) / 4) * 4;
  const requiredBytes = pixelOffset + rowStride * height;
  if (pixelOffset >= bytes.length || requiredBytes > bytes.length) {
    throw new Error("BMP pixel data ended early.");
  }

  let hasMeaningfulAlpha = bitsPerPixel !== 32;
  if (bitsPerPixel === 32) {
    for (let y = 0; y < height && !hasMeaningfulAlpha; y += 1) {
      const rowOffset = pixelOffset + y * rowStride;
      for (let x = 0; x < width; x += 1) {
        const alpha = bytes[rowOffset + x * bytesPerPixel + 3] ?? 0;
        if (alpha !== 0) {
          hasMeaningfulAlpha = true;
          break;
        }
      }
    }
  }

  const output = new Uint8ClampedArray(width * height * 4);
  for (let sourceY = 0; sourceY < height; sourceY += 1) {
    const targetY = topDown ? sourceY : height - 1 - sourceY;
    const rowOffset = pixelOffset + sourceY * rowStride;
    for (let x = 0; x < width; x += 1) {
      const sourceOffset = rowOffset + x * bytesPerPixel;
      const outputOffset = (targetY * width + x) * 4;
      output[outputOffset] = bytes[sourceOffset + 2] ?? 0;
      output[outputOffset + 1] = bytes[sourceOffset + 1] ?? 0;
      output[outputOffset + 2] = bytes[sourceOffset] ?? 0;
      output[outputOffset + 3] =
        bitsPerPixel === 32 && hasMeaningfulAlpha ? bytes[sourceOffset + 3] ?? 255 : 255;
    }
  }

  return { width, height, rgba: output };
}

export function decodeAuroraCompressedTextureToRgba(
  input: ArrayBuffer | Uint8Array
): DecodedRawTextureImage {
  const decoded = decodeAuroraTpcTexture(toExactArrayBuffer(input));
  if (!decoded) {
    throw new Error("Unsupported Aurora compressed texture payload.");
  }
  const flippedData = flipRgbaRows(decoded.data, decoded.width, decoded.height);
  return {
    width: decoded.width,
    height: decoded.height,
    rgba: toClampedRgba(flippedData)
  };
}

export function decodeAuroraPltToRgba(
  input: ArrayBuffer | Uint8Array,
  paletteRowsByLayer?: AuroraPltPaletteRowsByLayer
): DecodedRawTextureImage {
  const decoded = decodeAuroraPltTexture(toExactArrayBuffer(input), {
    paletteRowsByLayer
  });
  if (!decoded) {
    throw new Error("Unsupported Aurora PLT texture payload.");
  }
  return {
    width: decoded.width,
    height: decoded.height,
    rgba: toClampedRgba(decoded.data)
  };
}

export function decodeRawTextureToRgba(
  input: ArrayBuffer | Uint8Array,
  extension: string,
  paletteRowsByLayer?: AuroraPltPaletteRowsByLayer
): DecodedRawTextureImage {
  const normalizedExtension = extension.trim().toLowerCase().replace(/^\./u, "");
  if (normalizedExtension === "tga") {
    return decodeTgaToRgba(input);
  }
  if (normalizedExtension === "bmp") {
    return decodeBmpToRgba(input);
  }
  if (normalizedExtension === "dds" || normalizedExtension === "tpc") {
    return decodeAuroraCompressedTextureToRgba(input);
  }
  if (normalizedExtension === "plt") {
    return decodeAuroraPltToRgba(input, paletteRowsByLayer);
  }
  throw new Error(`Unsupported raw icon texture extension: ${extension}.`);
}

function encodeDecodedRawTextureToPngDataUrl(
  decoded: DecodedRawTextureImage,
  label: string
): string {
  if (typeof document === "undefined") {
    throw new Error(`Canvas is unavailable for ${label} thumbnail conversion.`);
  }
  const canvas = document.createElement("canvas");
  canvas.width = decoded.width;
  canvas.height = decoded.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error(`Canvas 2D context is unavailable for ${label} thumbnail conversion.`);
  }
  context.putImageData(
    new ImageData(decoded.rgba as ImageDataArray, decoded.width, decoded.height),
    0,
    0
  );
  return canvas.toDataURL("image/png");
}

export function decodeRawTextureToPngDataUrl(
  input: ArrayBuffer | Uint8Array,
  extension: string,
  paletteRowsByLayer?: AuroraPltPaletteRowsByLayer
): string {
  return encodeDecodedRawTextureToPngDataUrl(
    decodeRawTextureToRgba(input, extension, paletteRowsByLayer),
    extension.trim().toUpperCase()
  );
}
