import { Injectable } from "@nestjs/common";
import { open, type FileHandle } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import type {
  PackedModuleExtractorPort,
  PackedModuleFile
} from "../../../application/ports/packed-module-extractor.port";

const ERF_HEADER_SIZE_BYTES = 160;
const ERF_KEY_ENTRY_SIZE_V10 = 24;
const ERF_KEY_ENTRY_SIZE_V11 = 40;
const ERF_RESREF_LENGTH_V10 = 16;
const ERF_RESREF_LENGTH_V11 = 32;

const VALID_ERF_SIGNATURES = new Set(["ERF ", "HAK ", "MOD ", "NWM "]);
const RESOURCE_EXTENSIONS: Record<number, string> = {
  1: "bmp",
  3: "tga",
  4: "wav",
  6: "plt",
  7: "ini",
  10: "txt",
  2002: "mdl",
  2009: "nss",
  2010: "ncs",
  2012: "are",
  2013: "set",
  2014: "ifo",
  2015: "bic",
  2016: "wok",
  2017: "2da",
  2022: "txi",
  2023: "git",
  2025: "uti",
  2027: "utc",
  2029: "dlg",
  2030: "itp",
  2032: "utt",
  2033: "dds",
  2035: "uts",
  2036: "ltr",
  2037: "gff",
  2038: "fac",
  2040: "ute",
  2042: "utd",
  2044: "utp",
  2045: "dft",
  2046: "gic",
  2047: "gui",
  2051: "utm",
  2052: "dwk",
  2053: "pwk",
  2056: "jrl",
  2058: "utw",
  2060: "ssf",
  2072: "mtr"
};

@Injectable()
export class NwnErfPackedModuleExtractorService
  implements PackedModuleExtractorPort
{
  async extractFromPackedModule(modulePackedPath: string): Promise<PackedModuleFile[]> {
    const resolvedModulePath = resolveModulePath(modulePackedPath);
    const fileHandle = await open(resolvedModulePath, "r");

    try {
      const stats = await fileHandle.stat();
      if (stats.size < ERF_HEADER_SIZE_BYTES) {
        throw new Error(
          `Packed module file is too small to be a valid ERF container: ${resolvedModulePath}`
        );
      }

      const header = await readExact(fileHandle, 0, ERF_HEADER_SIZE_BYTES);
      const signature = header.toString("ascii", 0, 4);
      const version = header.toString("ascii", 4, 8);

      if (!VALID_ERF_SIGNATURES.has(signature)) {
        throw new Error(
          `Unsupported module signature "${signature}" for file ${resolvedModulePath}`
        );
      }

      const keyEntrySize =
        version === "V1.1" ? ERF_KEY_ENTRY_SIZE_V11 : ERF_KEY_ENTRY_SIZE_V10;
      const resrefLength =
        version === "V1.1" ? ERF_RESREF_LENGTH_V11 : ERF_RESREF_LENGTH_V10;

      if (version !== "V1.0" && version !== "V1.1") {
        throw new Error(
          `Unsupported module ERF version "${version}" for file ${resolvedModulePath}`
        );
      }

      const entryCount = header.readUInt32LE(16);
      const keyListOffset = header.readUInt32LE(24);
      const resourceListOffset = header.readUInt32LE(28);

      const keyTableLength = entryCount * keyEntrySize;
      const resourceTableLength = entryCount * 8;
      assertRangeWithinFile(
        resolvedModulePath,
        stats.size,
        keyListOffset,
        keyTableLength
      );
      assertRangeWithinFile(
        resolvedModulePath,
        stats.size,
        resourceListOffset,
        resourceTableLength
      );

      const keyTable = await readExact(fileHandle, keyListOffset, keyTableLength);
      const resourceTable = await readExact(
        fileHandle,
        resourceListOffset,
        resourceTableLength
      );

      const files: PackedModuleFile[] = [];
      const duplicateCounter = new Map<string, number>();

      for (let index = 0; index < entryCount; index += 1) {
        const keyOffset = index * keyEntrySize;
        const resourceOffset = index * 8;
        const resrefRaw = keyTable.subarray(keyOffset, keyOffset + resrefLength);
        const resref = decodeResref(resrefRaw);
        const resourceType = keyTable.readUInt16LE(keyOffset + resrefLength + 4);
        const fileOffset = resourceTable.readUInt32LE(resourceOffset);
        const fileSize = resourceTable.readUInt32LE(resourceOffset + 4);

        assertRangeWithinFile(resolvedModulePath, stats.size, fileOffset, fileSize);
        const bytes = await readExact(fileHandle, fileOffset, fileSize);

        const baseFileName = buildResourceFileName(resref, resourceType, index);
        const finalFileName = deduplicateFileName(baseFileName, duplicateCounter);

        files.push({
          fileName: finalFileName,
          resourceType,
          bytes
        });
      }

      return files;
    } finally {
      await fileHandle.close();
    }
  }
}

async function readExact(
  handle: FileHandle,
  position: number,
  length: number
): Promise<Buffer> {
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await handle.read(buffer, 0, length, position);

  if (bytesRead !== length) {
    throw new Error(
      `Failed to read packed module payload. Expected ${length} bytes at offset ${position}, got ${bytesRead}.`
    );
  }

  return buffer;
}

function decodeResref(bytes: Uint8Array): string {
  const firstNullIndex = bytes.indexOf(0);
  const usedLength = firstNullIndex >= 0 ? firstNullIndex : bytes.length;
  const rawValue = Buffer.from(bytes.subarray(0, usedLength)).toString("ascii");
  const normalized = rawValue.trim().toLowerCase();
  return normalized;
}

function resolveModulePath(modulePackedPath: string): string {
  if (isAbsolute(modulePackedPath)) {
    return modulePackedPath;
  }

  return resolve(process.cwd(), modulePackedPath);
}

function buildResourceFileName(
  resref: string,
  resourceType: number,
  index: number
): string {
  const safeResref = sanitizeResref(resref || `resource_${index}`);
  const extension = RESOURCE_EXTENSIONS[resourceType] ?? `r${resourceType}`;
  return `${safeResref}.${extension}`;
}

function sanitizeResref(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9._-]/g, "_");
  if (normalized.length === 0) {
    return "resource";
  }
  return normalized;
}

function deduplicateFileName(name: string, counter: Map<string, number>): string {
  const existing = counter.get(name) ?? 0;
  counter.set(name, existing + 1);
  if (existing === 0) {
    return name;
  }

  const extensionIndex = name.lastIndexOf(".");
  if (extensionIndex < 0) {
    return `${name}__${existing}`;
  }

  const base = name.slice(0, extensionIndex);
  const extension = name.slice(extensionIndex + 1);
  return `${base}__${existing}.${extension}`;
}

function assertRangeWithinFile(
  path: string,
  fileSize: number,
  offset: number,
  length: number
): void {
  if (offset < 0 || length < 0) {
    throw new Error(`Invalid packed module range for ${path}: ${offset} + ${length}`);
  }

  if (offset + length > fileSize) {
    throw new Error(
      `Packed module range exceeds file size for ${path}: ${offset} + ${length} > ${fileSize}`
    );
  }
}
