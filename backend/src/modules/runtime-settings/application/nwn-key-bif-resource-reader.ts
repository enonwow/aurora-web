import { createHash } from "node:crypto";
import { open, readFile, stat, type FileHandle } from "node:fs/promises";
import { basename, isAbsolute, resolve } from "node:path";

export const NWN_KEY_BIF_RESOURCE_TYPES = {
  BMP: 1,
  TGA: 3,
  WAV: 4,
  PLT: 6,
  BMU: 8,
  MP3: 11,
  MDL: 2002,
  SET: 2013,
  WOK: 2016,
  TWO_DA: 2017,
  TXI: 2022,
  UTI: 2025,
  UTC: 2027,
  ITP: 2030,
  DDS: 2033,
  UTS: 2035,
  UTP: 2044,
  UTM: 2051,
  UTW: 2058,
  DWK: 2052,
  PWK: 2053,
  SHD: 2069,
  MTR: 2072
} as const;

interface KeyBifEntry {
  bifIndex: number;
  resourceIndex: number;
}

interface KeyBifFile {
  fileName: string;
  fileSize: number;
}

export interface NwnKeyBifResource {
  resref: string;
  resourceType: number;
}

export interface NwnKeyBifResourceDescriptor {
  readonly sizeBytes: number;
  readonly sha256: string;
}

export class NwnKeyBifResourceReader {
  private readonly byResrefAndType = new Map<string, KeyBifEntry>();

  private constructor(
    private readonly keyPath: string,
    private readonly bifRoot: string,
    private readonly bifFiles: KeyBifFile[],
    resources: Array<{ resref: string; resourceType: number; entry: KeyBifEntry }>
  ) {
    for (const resource of resources) {
      this.byResrefAndType.set(
        buildResourceKey(resource.resref, resource.resourceType),
        resource.entry
      );
    }
  }

  static async open(keyPath: string, bifRoot: string): Promise<NwnKeyBifResourceReader> {
    const resolvedKeyPath = resolvePath(keyPath);
    const resolvedBifRoot = resolvePath(bifRoot);
    const data = await readFile(resolvedKeyPath);
    if (data.length < 32) {
      throw new Error(`KEY file is too small: ${resolvedKeyPath}`);
    }

    const signature = data.toString("ascii", 0, 4);
    const version = data.toString("ascii", 4, 8);
    if (signature !== "KEY ") {
      throw new Error(`Unsupported KEY signature "${signature}" for ${resolvedKeyPath}`);
    }
    if (version !== "V1  " && version !== "V1.1") {
      throw new Error(`Unsupported KEY version "${version}" for ${resolvedKeyPath}`);
    }

    const bifCount = data.readUInt32LE(8);
    const keyCount = data.readUInt32LE(12);
    const fileTableOffset = data.readUInt32LE(16);
    const keyTableOffset = data.readUInt32LE(20);
    assertRange(resolvedKeyPath, data.length, fileTableOffset, bifCount * 12);
    assertRange(resolvedKeyPath, data.length, keyTableOffset, keyCount * 22);

    const bifFiles: KeyBifFile[] = [];
    for (let index = 0; index < bifCount; index += 1) {
      const offset = fileTableOffset + index * 12;
      const fileSize = data.readUInt32LE(offset);
      const nameOffset = data.readUInt32LE(offset + 4);
      const nameSize = data.readUInt16LE(offset + 8);
      assertRange(resolvedKeyPath, data.length, nameOffset, nameSize);
      const fileName = data
        .subarray(nameOffset, nameOffset + nameSize)
        .toString("ascii")
        .replace(/\0+$/u, "")
        .replace(/\\/gu, "/");
      bifFiles.push({ fileName, fileSize });
    }

    const resources: Array<{
      resref: string;
      resourceType: number;
      entry: KeyBifEntry;
    }> = [];
    for (let index = 0; index < keyCount; index += 1) {
      const offset = keyTableOffset + index * 22;
      const resref = decodeResref(data.subarray(offset, offset + 16));
      const resourceType = data.readUInt16LE(offset + 16);
      const resourceId = data.readUInt32LE(offset + 18);
      resources.push({
        resref,
        resourceType,
        entry: {
          bifIndex: (resourceId >>> 20) & 0xfff,
          resourceIndex: resourceId & 0xfffff
        }
      });
    }

    return new NwnKeyBifResourceReader(
      resolvedKeyPath,
      resolvedBifRoot,
      bifFiles,
      resources
    );
  }

  has(resref: string, resourceType: number): boolean {
    return this.byResrefAndType.has(buildResourceKey(resref, resourceType));
  }

  list(resourceType: number): NwnKeyBifResource[] {
    const resources: NwnKeyBifResource[] = [];
    for (const key of this.byResrefAndType.keys()) {
      const [resref, rawType] = key.split("|");
      const parsedType = Number.parseInt(rawType ?? "", 10);
      if (parsedType === resourceType && resref) {
        resources.push({ resref, resourceType: parsedType });
      }
    }
    resources.sort((left, right) => left.resref.localeCompare(right.resref));
    return resources;
  }

  async read(resref: string, resourceType: number): Promise<Buffer | null> {
    const entry = this.byResrefAndType.get(buildResourceKey(resref, resourceType));
    if (!entry) {
      return null;
    }

    const bifFile = this.bifFiles[entry.bifIndex];
    if (!bifFile) {
      return null;
    }

    const bifPath = await this.resolveBifPath(bifFile.fileName);
    if (!bifPath) {
      return null;
    }

    return readBifResource(bifPath, entry.resourceIndex);
  }

  async describe(
    resref: string,
    resourceType: number,
  ): Promise<NwnKeyBifResourceDescriptor | null> {
    const entry = this.byResrefAndType.get(buildResourceKey(resref, resourceType));
    if (!entry) return null;
    const bifFile = this.bifFiles[entry.bifIndex];
    if (!bifFile) return null;
    const bifPath = await this.resolveBifPath(bifFile.fileName);
    return bifPath ? describeBifResource(bifPath, entry.resourceIndex) : null;
  }

  private async resolveBifPath(fileName: string): Promise<string | null> {
    const candidates = [
      resolve(this.bifRoot, fileName),
      resolve(this.bifRoot, stripMatchingRootSegment(fileName, basename(this.bifRoot))),
      resolve(this.bifRoot, basename(fileName))
    ];

    for (const candidate of candidates) {
      if (await existsAsFile(candidate)) {
        return candidate;
      }
    }
    return null;
  }
}

async function readBifResource(
  bifPath: string,
  resourceIndex: number
): Promise<Buffer | null> {
  const fileHandle = await open(bifPath, "r");
  try {
    const header = await readExact(fileHandle, 0, 20);
    const signature = header.toString("ascii", 0, 4);
    const version = header.toString("ascii", 4, 8);
    if (signature !== "BIFF" || (version !== "V1  " && version !== "V1.1")) {
      return null;
    }

    const variableResourceCount = header.readUInt32LE(8);
    const variableTableOffset = header.readUInt32LE(16);
    if (resourceIndex < 0 || resourceIndex >= variableResourceCount) {
      return null;
    }

    const entrySize = version === "V1.1" ? 20 : 16;
    const entryOffset = variableTableOffset + resourceIndex * entrySize;
    const entry = await readExact(fileHandle, entryOffset, entrySize);
    const resourceOffset = version === "V1.1" ? entry.readUInt32LE(8) : entry.readUInt32LE(4);
    const resourceSize = version === "V1.1" ? entry.readUInt32LE(12) : entry.readUInt32LE(8);
    return readExact(fileHandle, resourceOffset, resourceSize);
  } finally {
    await fileHandle.close();
  }
}

async function describeBifResource(
  bifPath: string,
  resourceIndex: number,
): Promise<NwnKeyBifResourceDescriptor | null> {
  const fileHandle = await open(bifPath, "r");
  try {
    const location = await readBifResourceLocation(fileHandle, bifPath, resourceIndex);
    if (!location) return null;
    const hash = createHash("sha256");
    const chunk = Buffer.allocUnsafe(Math.min(1024 * 1024, Math.max(1, location.sizeBytes)));
    let consumed = 0;
    while (consumed < location.sizeBytes) {
      const requested = Math.min(chunk.length, location.sizeBytes - consumed);
      const { bytesRead } = await fileHandle.read(
        chunk,
        0,
        requested,
        location.offset + consumed,
      );
      if (bytesRead !== requested) {
        throw new Error(
          `Failed to hash BIF payload. Expected ${requested} bytes at offset ${location.offset + consumed}, got ${bytesRead}.`,
        );
      }
      hash.update(chunk.subarray(0, bytesRead));
      consumed += bytesRead;
    }
    return Object.freeze({ sizeBytes: location.sizeBytes, sha256: hash.digest("hex") });
  } finally {
    await fileHandle.close();
  }
}

async function readBifResourceLocation(
  fileHandle: FileHandle,
  bifPath: string,
  resourceIndex: number,
): Promise<{ readonly offset: number; readonly sizeBytes: number } | null> {
  const header = await readExact(fileHandle, 0, 20);
  const signature = header.toString("ascii", 0, 4);
  const version = header.toString("ascii", 4, 8);
  if (signature !== "BIFF" || (version !== "V1  " && version !== "V1.1")) return null;
  const variableResourceCount = header.readUInt32LE(8);
  const variableTableOffset = header.readUInt32LE(16);
  if (resourceIndex < 0 || resourceIndex >= variableResourceCount) return null;
  const entrySize = version === "V1.1" ? 20 : 16;
  const entry = await readExact(
    fileHandle,
    variableTableOffset + resourceIndex * entrySize,
    entrySize,
  );
  const offset = version === "V1.1" ? entry.readUInt32LE(8) : entry.readUInt32LE(4);
  const sizeBytes = version === "V1.1" ? entry.readUInt32LE(12) : entry.readUInt32LE(8);
  const fileSize = (await stat(bifPath)).size;
  if (offset < 0 || sizeBytes < 0 || offset + sizeBytes > fileSize) return null;
  return Object.freeze({ offset, sizeBytes });
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
      `Failed to read BIF payload. Expected ${length} bytes at offset ${position}, got ${bytesRead}.`
    );
  }
  return buffer;
}

function decodeResref(bytes: Uint8Array): string {
  const firstNullIndex = bytes.indexOf(0);
  const usedLength = firstNullIndex >= 0 ? firstNullIndex : bytes.length;
  return Buffer.from(bytes.subarray(0, usedLength)).toString("ascii").trim().toLowerCase();
}

function buildResourceKey(resref: string, resourceType: number): string {
  return `${resref.trim().toLowerCase()}|${resourceType}`;
}

function stripMatchingRootSegment(fileName: string, rootName: string): string {
  const normalized = fileName.replace(/\\/gu, "/");
  const segments = normalized.split("/");
  const first = segments[0];
  if (first?.toLowerCase() === rootName.toLowerCase() && segments.length > 1) {
    return segments.slice(1).join("/");
  }
  return normalized;
}

function resolvePath(pathValue: string): string {
  return isAbsolute(pathValue) ? pathValue : resolve(process.cwd(), pathValue);
}

async function existsAsFile(pathValue: string): Promise<boolean> {
  try {
    const metadata = await stat(pathValue);
    return metadata.isFile();
  } catch {
    return false;
  }
}

function assertRange(path: string, fileSize: number, offset: number, length: number): void {
  if (offset < 0 || length < 0 || offset + length > fileSize) {
    throw new Error(`Invalid KEY range for ${path}: ${offset} + ${length} > ${fileSize}`);
  }
}
