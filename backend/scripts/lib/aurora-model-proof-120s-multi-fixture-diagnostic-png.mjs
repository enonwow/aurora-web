import assert from "node:assert/strict";
import { deflateSync, inflateSync } from "node:zlib";
import { validatePngBytes } from "./aurora-model-proof-120s-contract.mjs";

const PNG_SIGNATURE_LENGTH = 8;
const MAX_DECODED_BYTES = 256 * 1024 * 1024;
const BYTES_PER_PIXEL = new Map([
  [0, 1],
  [2, 3],
  [4, 2],
  [6, 4],
]);

export function decodeDiagnosticRuntimePng(bytes) {
  const value = Buffer.from(bytes ?? []);
  const structural = validatePngBytes(value);
  let offset = PNG_SIGNATURE_LENGTH;
  let header = null;
  const imageData = [];
  let sawImageData = false;
  let imageDataEnded = false;

  while (offset < value.length) {
    const length = value.readUInt32BE(offset);
    const typeStart = offset + 4;
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const type = value.subarray(typeStart, dataStart).toString("ascii");
    if (type === "IHDR") {
      header = {
        width: value.readUInt32BE(dataStart),
        height: value.readUInt32BE(dataStart + 4),
        bitDepth: value[dataStart + 8],
        colorType: value[dataStart + 9],
        compression: value[dataStart + 10],
        filter: value[dataStart + 11],
        interlace: value[dataStart + 12],
      };
    } else if (type === "IDAT") {
      assert.ok(!imageDataEnded, "diagnostic_png_idat_not_consecutive");
      sawImageData = true;
      imageData.push(value.subarray(dataStart, dataEnd));
    } else if (sawImageData && type !== "IEND") {
      imageDataEnded = true;
    }
    if (type === "IEND") break;
    offset = dataEnd + 4;
  }

  assert.ok(header, "diagnostic_png_ihdr_missing");
  assert.equal(header.width, structural.width, "diagnostic_png_width_drift");
  assert.equal(header.height, structural.height, "diagnostic_png_height_drift");
  assert.equal(header.bitDepth, 8, "diagnostic_png_bit_depth_unsupported");
  assert.ok(BYTES_PER_PIXEL.has(header.colorType), "diagnostic_png_color_type_unsupported");
  assert.equal(header.compression, 0, "diagnostic_png_compression_unsupported");
  assert.equal(header.filter, 0, "diagnostic_png_filter_method_unsupported");
  assert.equal(header.interlace, 0, "diagnostic_png_interlace_unsupported");
  const compressed = Buffer.concat(imageData);
  assert.ok(compressed.length > 0, "diagnostic_png_idat_empty");

  const bytesPerPixel = BYTES_PER_PIXEL.get(header.colorType);
  const rowBytes = header.width * bytesPerPixel;
  const expectedInflatedBytes = header.height * (rowBytes + 1);
  assert.ok(Number.isSafeInteger(expectedInflatedBytes) && expectedInflatedBytes <= MAX_DECODED_BYTES, "diagnostic_png_decode_budget_exceeded");
  let inflated;
  try {
    inflated = inflateSync(compressed, { maxOutputLength: expectedInflatedBytes });
  } catch {
    throw new Error("diagnostic_png_inflate_invalid");
  }
  assert.equal(inflated.length, expectedInflatedBytes, "diagnostic_png_scanline_length_invalid");
  const pixels = decodeScanlines(inflated, header.width, header.height, bytesPerPixel);
  return {
    byteLength: value.length,
    width: header.width,
    height: header.height,
    bitDepth: header.bitDepth,
    colorType: header.colorType,
    bytesPerPixel,
    decodedByteLength: header.width * header.height * bytesPerPixel,
    pixels,
  };
}

export function cropDiagnosticRuntimePng(decoded, rectangle) {
  assert.ok(decoded && Buffer.isBuffer(decoded.pixels), "diagnostic_png_decoded_pixels_missing");
  const { left, top, width, height } = rectangle ?? {};
  assert.ok([left, top, width, height].every(Number.isInteger), "diagnostic_png_crop_coordinates_invalid");
  assert.ok(left >= 0 && top >= 0 && width > 0 && height > 0, "diagnostic_png_crop_coordinates_invalid");
  assert.ok(left + width <= decoded.width && top + height <= decoded.height, "diagnostic_png_crop_out_of_bounds");
  const rowBytes = width * decoded.bytesPerPixel;
  const sourceRowBytes = decoded.width * decoded.bytesPerPixel;
  const pixels = Buffer.alloc(rowBytes * height);
  for (let row = 0; row < height; row += 1) {
    const sourceStart = (top + row) * sourceRowBytes + left * decoded.bytesPerPixel;
    decoded.pixels.copy(pixels, row * rowBytes, sourceStart, sourceStart + rowBytes);
  }
  return encodeDiagnosticPng({
    width,
    height,
    bitDepth: decoded.bitDepth,
    colorType: decoded.colorType,
    bytesPerPixel: decoded.bytesPerPixel,
    pixels,
  });
}

export function encodeDiagnosticPng({ width, height, bitDepth = 8, colorType, bytesPerPixel, pixels }) {
  assert.ok(Number.isInteger(width) && width > 0 && Number.isInteger(height) && height > 0, "diagnostic_png_encode_dimensions_invalid");
  assert.equal(bitDepth, 8, "diagnostic_png_encode_bit_depth_unsupported");
  assert.equal(BYTES_PER_PIXEL.get(colorType), bytesPerPixel, "diagnostic_png_encode_color_type_invalid");
  assert.ok(Buffer.isBuffer(pixels), "diagnostic_png_encode_pixels_invalid");
  assert.equal(pixels.length, width * height * bytesPerPixel, "diagnostic_png_encode_pixel_length_invalid");
  const rowBytes = width * bytesPerPixel;
  const scanlines = Buffer.alloc(height * (rowBytes + 1));
  for (let row = 0; row < height; row += 1) {
    const scanlineStart = row * (rowBytes + 1);
    scanlines[scanlineStart] = 0;
    pixels.copy(scanlines, scanlineStart + 1, row * rowBytes, (row + 1) * rowBytes);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = bitDepth;
  header[9] = colorType;
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const compressed = deflateSync(scanlines, { level: 9 });
  return Buffer.concat([signature, pngChunk("IHDR", header), pngChunk("IDAT", compressed), pngChunk("IEND", Buffer.alloc(0))]);
}

function decodeScanlines(inflated, width, height, bytesPerPixel) {
  const rowBytes = width * bytesPerPixel;
  const decoded = Buffer.alloc(rowBytes * height);
  for (let row = 0; row < height; row += 1) {
    const sourceStart = row * (rowBytes + 1);
    const filter = inflated[sourceStart];
    assert.ok(filter <= 4, `diagnostic_png_scanline_filter_invalid:${row}`);
    const targetStart = row * rowBytes;
    for (let column = 0; column < rowBytes; column += 1) {
      const raw = inflated[sourceStart + 1 + column];
      const left = column >= bytesPerPixel ? decoded[targetStart + column - bytesPerPixel] : 0;
      const above = row > 0 ? decoded[targetStart - rowBytes + column] : 0;
      const upperLeft = row > 0 && column >= bytesPerPixel
        ? decoded[targetStart - rowBytes + column - bytesPerPixel]
        : 0;
      decoded[targetStart + column] = unfilterByte(filter, raw, left, above, upperLeft);
    }
  }
  return decoded;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  typeBytes.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return result;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function unfilterByte(filter, raw, left, above, upperLeft) {
  switch (filter) {
    case 0: return raw;
    case 1: return (raw + left) & 0xff;
    case 2: return (raw + above) & 0xff;
    case 3: return (raw + Math.floor((left + above) / 2)) & 0xff;
    case 4: return (raw + paeth(left, above, upperLeft)) & 0xff;
    default: throw new Error("diagnostic_png_scanline_filter_invalid");
  }
}

function paeth(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const distanceLeft = Math.abs(estimate - left);
  const distanceAbove = Math.abs(estimate - above);
  const distanceUpperLeft = Math.abs(estimate - upperLeft);
  if (distanceLeft <= distanceAbove && distanceLeft <= distanceUpperLeft) return left;
  if (distanceAbove <= distanceUpperLeft) return above;
  return upperLeft;
}
