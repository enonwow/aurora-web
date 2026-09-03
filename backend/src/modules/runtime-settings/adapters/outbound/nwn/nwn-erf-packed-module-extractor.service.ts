import { Injectable } from "@nestjs/common";
import { open, type FileHandle } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import type {
  PackedModuleExtractorPort,
  PackedModuleFile
} from "../../../application/ports/packed-module-extractor.port";
import { nwnErfResourceExtension } from "../../../domain/nwn-erf-resource-types";

const ERF_HEADER_SIZE_BYTES = 160;
const ERF_KEY_ENTRY_SIZE_V10 = 24;
const ERF_KEY_ENTRY_SIZE_V11 = 40;
const ERF_RESREF_LENGTH_V10 = 16;
const ERF_RESREF_LENGTH_V11 = 32;

const VALID_ERF_SIGNATURES = new Set(["ERF ", "HAK ", "MOD ", "NWM "]);
export interface NwnErfResourceIndexEntry {
  resref: string;
  resourceType: number;
  fileOffset: number;
  fileSize: number;
}

export type NwnErfResourceIndex = ReadonlyMap<string, NwnErfResourceIndexEntry>;

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

export function buildNwnErfResourceIndexKey(
  resref: string,
  resourceType: number
): string {
  return `${resref.trim().toLowerCase()}|${resourceType}`;
}

export async function readNwnErfResourceIndex(
  modulePackedPath: string
): Promise<Map<string, NwnErfResourceIndexEntry> | null> {
  const resolvedModulePath = resolveModulePath(modulePackedPath);
  const fileHandle = await open(resolvedModulePath, "r");

  try {
    const stats = await fileHandle.stat();
    if (stats.size < ERF_HEADER_SIZE_BYTES) {
      return null;
    }

    const header = await readExact(fileHandle, 0, ERF_HEADER_SIZE_BYTES);
    const signature = header.toString("ascii", 0, 4);
    const version = header.toString("ascii", 4, 8);
    if (!VALID_ERF_SIGNATURES.has(signature)) {
      return null;
    }
    if (version !== "V1.0" && version !== "V1.1") {
      return null;
    }

    const keyEntrySize =
      version === "V1.1" ? ERF_KEY_ENTRY_SIZE_V11 : ERF_KEY_ENTRY_SIZE_V10;
    const resrefLength =
      version === "V1.1" ? ERF_RESREF_LENGTH_V11 : ERF_RESREF_LENGTH_V10;
    const entryCount = header.readUInt32LE(16);
    const keyListOffset = header.readUInt32LE(24);
    const resourceListOffset = header.readUInt32LE(28);
    const keyTableLength = entryCount * keyEntrySize;
    const resourceTableLength = entryCount * 8;
    assertRangeWithinFile(resolvedModulePath, stats.size, keyListOffset, keyTableLength);
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
    const entries = new Map<string, NwnErfResourceIndexEntry>();

    for (let index = 0; index < entryCount; index += 1) {
      const keyOffset = index * keyEntrySize;
      const resourceOffset = index * 8;
      const resref = decodeResref(keyTable.subarray(keyOffset, keyOffset + resrefLength));
      const resourceType = keyTable.readUInt16LE(keyOffset + resrefLength + 4);
      const fileOffset = resourceTable.readUInt32LE(resourceOffset);
      const fileSize = resourceTable.readUInt32LE(resourceOffset + 4);
      assertRangeWithinFile(resolvedModulePath, stats.size, fileOffset, fileSize);

      const resourceKey = buildNwnErfResourceIndexKey(resref, resourceType);
      if (!entries.has(resourceKey)) {
        entries.set(resourceKey, {
          resref,
          resourceType,
          fileOffset,
          fileSize
        });
      }
    }

    return entries;
  } finally {
    await fileHandle.close();
  }
}

export async function readNwnErfResourceFromIndex(
  modulePackedPath: string,
  index: NwnErfResourceIndex,
  resref: string,
  resourceType: number
): Promise<Buffer | null> {
  const entry = index.get(buildNwnErfResourceIndexKey(resref, resourceType));
  if (!entry) {
    return null;
  }

  const resolvedModulePath = resolveModulePath(modulePackedPath);
  const fileHandle = await open(resolvedModulePath, "r");

  try {
    const stats = await fileHandle.stat();
    assertRangeWithinFile(
      resolvedModulePath,
      stats.size,
      entry.fileOffset,
      entry.fileSize
    );
    return readExact(fileHandle, entry.fileOffset, entry.fileSize);
  } finally {
    await fileHandle.close();
  }
}

export async function readNwnErfResource(
  modulePackedPath: string,
  resref: string,
  resourceType: number
): Promise<Buffer | null> {
  const resolvedModulePath = resolveModulePath(modulePackedPath);
  const fileHandle = await open(resolvedModulePath, "r");

  try {
    const stats = await fileHandle.stat();
    if (stats.size < ERF_HEADER_SIZE_BYTES) {
      return null;
    }

    const header = await readExact(fileHandle, 0, ERF_HEADER_SIZE_BYTES);
    const signature = header.toString("ascii", 0, 4);
    const version = header.toString("ascii", 4, 8);
    if (!VALID_ERF_SIGNATURES.has(signature)) {
      return null;
    }
    if (version !== "V1.0" && version !== "V1.1") {
      return null;
    }

    const keyEntrySize =
      version === "V1.1" ? ERF_KEY_ENTRY_SIZE_V11 : ERF_KEY_ENTRY_SIZE_V10;
    const resrefLength =
      version === "V1.1" ? ERF_RESREF_LENGTH_V11 : ERF_RESREF_LENGTH_V10;
    const entryCount = header.readUInt32LE(16);
    const keyListOffset = header.readUInt32LE(24);
    const resourceListOffset = header.readUInt32LE(28);
    const keyTableLength = entryCount * keyEntrySize;
    assertRangeWithinFile(resolvedModulePath, stats.size, keyListOffset, keyTableLength);
    assertRangeWithinFile(resolvedModulePath, stats.size, resourceListOffset, entryCount * 8);

    const keyTable = await readExact(fileHandle, keyListOffset, keyTableLength);
    const targetResref = resref.trim().toLowerCase();
    for (let index = 0; index < entryCount; index += 1) {
      const keyOffset = index * keyEntrySize;
      const currentResref = decodeResref(
        keyTable.subarray(keyOffset, keyOffset + resrefLength)
      );
      if (currentResref !== targetResref) {
        continue;
      }

      const currentResourceType = keyTable.readUInt16LE(
        keyOffset + resrefLength + 4
      );
      if (currentResourceType !== resourceType) {
        continue;
      }

      const resourceEntry = await readExact(
        fileHandle,
        resourceListOffset + index * 8,
        8
      );
      const fileOffset = resourceEntry.readUInt32LE(0);
      const fileSize = resourceEntry.readUInt32LE(4);
      assertRangeWithinFile(resolvedModulePath, stats.size, fileOffset, fileSize);
      return readExact(fileHandle, fileOffset, fileSize);
    }

    return null;
  } finally {
    await fileHandle.close();
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
  const extension = nwnErfResourceExtension(resourceType);
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
