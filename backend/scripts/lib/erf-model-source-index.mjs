import fs from "node:fs";
import path from "node:path";

const MDL_RESOURCE_TYPE = 2002;
const SUPPORTED_SIGNATURES = new Set(["ERF ", "HAK ", "MOD ", "NWM "]);
const SUPPORTED_VERSIONS = new Set(["V1.0", "V1.1"]);

function normalizeResRef(value) {
  return String(value ?? "").trim().toLowerCase();
}

function decodeResRef(bytes) {
  return bytes.toString("ascii").replace(/\0+$/u, "").trim().toLowerCase();
}

function walkFiles(directory) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) return [];
  const files = [];
  const pending = [path.resolve(directory)];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(entryPath);
      else if (entry.isFile()) files.push(entryPath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

export function indexErfResourceResRefs(filePath, resourceType) {
  if (!Number.isInteger(resourceType) || resourceType < 0 || resourceType > 65_535) {
    throw new Error(`Invalid ERF resource type: ${resourceType}.`);
  }
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) return [];
  const fileSize = fs.statSync(resolvedPath).size;
  if (fileSize < 160) return [];
  const file = fs.openSync(resolvedPath, "r");
  try {
    const header = Buffer.alloc(160);
    if (fs.readSync(file, header, 0, header.length, 0) !== header.length) return [];
    const signature = header.toString("ascii", 0, 4);
    const version = header.toString("ascii", 4, 8);
    if (!SUPPORTED_SIGNATURES.has(signature) || !SUPPORTED_VERSIONS.has(version)) return [];
    const count = header.readUInt32LE(16);
    const keyOffset = header.readUInt32LE(24);
    const keySize = version === "V1.1" ? 40 : 24;
    const resRefSize = version === "V1.1" ? 32 : 16;
    const keyBytes = count * keySize;
    if (
      !Number.isSafeInteger(keyBytes) ||
      keyOffset < 160 ||
      keyOffset > fileSize ||
      keyBytes > fileSize - keyOffset
    ) {
      throw new Error(`Invalid ERF key table bounds: ${resolvedPath}.`);
    }
    const keys = Buffer.alloc(keyBytes);
    if (keyBytes > 0 && fs.readSync(file, keys, 0, keyBytes, keyOffset) !== keyBytes) {
      throw new Error(`Could not read complete ERF key table: ${resolvedPath}.`);
    }
    const resources = new Set();
    for (let index = 0; index < count; index += 1) {
      const offset = index * keySize;
      if (keys.readUInt16LE(offset + resRefSize + 4) !== resourceType) continue;
      const resRef = decodeResRef(keys.subarray(offset, offset + resRefSize));
      if (resRef) resources.add(resRef);
    }
    return [...resources].sort();
  } finally {
    fs.closeSync(file);
  }
}

export function indexErfModelResRefs(filePath) {
  return indexErfResourceResRefs(filePath, MDL_RESOURCE_TYPE);
}

export function readErfResources(filePath, resourceType, targetResRefs = undefined) {
  if (!Number.isInteger(resourceType) || resourceType < 0 || resourceType > 65_535) {
    throw new Error(`Invalid ERF resource type: ${resourceType}.`);
  }
  const targets = targetResRefs == null
    ? null
    : new Set([...targetResRefs].map(normalizeResRef).filter(Boolean));
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) return [];
  const fileSize = fs.statSync(resolvedPath).size;
  if (fileSize < 160) return [];
  const file = fs.openSync(resolvedPath, "r");
  try {
    const header = Buffer.alloc(160);
    if (fs.readSync(file, header, 0, header.length, 0) !== header.length) return [];
    const signature = header.toString("ascii", 0, 4);
    const version = header.toString("ascii", 4, 8);
    if (!SUPPORTED_SIGNATURES.has(signature) || !SUPPORTED_VERSIONS.has(version)) return [];
    const count = header.readUInt32LE(16);
    const keyOffset = header.readUInt32LE(24);
    const resourceOffset = header.readUInt32LE(28);
    const keySize = version === "V1.1" ? 40 : 24;
    const resRefSize = version === "V1.1" ? 32 : 16;
    const keyBytes = count * keySize;
    const resourceBytes = count * 8;
    if (
      !Number.isSafeInteger(keyBytes) ||
      !Number.isSafeInteger(resourceBytes) ||
      keyOffset < 160 ||
      keyOffset > fileSize ||
      keyBytes > fileSize - keyOffset ||
      resourceOffset < 160 ||
      resourceOffset > fileSize ||
      resourceBytes > fileSize - resourceOffset
    ) {
      throw new Error(`Invalid ERF table bounds: ${resolvedPath}.`);
    }
    const keys = Buffer.alloc(keyBytes);
    const resources = Buffer.alloc(resourceBytes);
    if (keyBytes > 0 && fs.readSync(file, keys, 0, keyBytes, keyOffset) !== keyBytes) {
      throw new Error(`Could not read complete ERF key table: ${resolvedPath}.`);
    }
    if (
      resourceBytes > 0 &&
      fs.readSync(file, resources, 0, resourceBytes, resourceOffset) !== resourceBytes
    ) {
      throw new Error(`Could not read complete ERF resource table: ${resolvedPath}.`);
    }
    const matches = [];
    for (let index = 0; index < count; index += 1) {
      const keyEntryOffset = index * keySize;
      if (keys.readUInt16LE(keyEntryOffset + resRefSize + 4) !== resourceType) continue;
      const resRef = decodeResRef(
        keys.subarray(keyEntryOffset, keyEntryOffset + resRefSize)
      );
      if (!resRef || (targets != null && !targets.has(resRef))) continue;
      const resourceId = keys.readUInt32LE(keyEntryOffset + resRefSize);
      if (resourceId >= count) {
        throw new Error(`Invalid ERF resource id ${resourceId}: ${resolvedPath}.`);
      }
      const resourceEntryOffset = resourceId * 8;
      const payloadOffset = resources.readUInt32LE(resourceEntryOffset);
      const payloadSize = resources.readUInt32LE(resourceEntryOffset + 4);
      if (payloadOffset > fileSize || payloadSize > fileSize - payloadOffset) {
        throw new Error(`Invalid ERF payload bounds for ${resRef}: ${resolvedPath}.`);
      }
      const bytes = Buffer.alloc(payloadSize);
      if (
        payloadSize > 0 &&
        fs.readSync(file, bytes, 0, payloadSize, payloadOffset) !== payloadSize
      ) {
        throw new Error(`Could not read complete ERF payload for ${resRef}: ${resolvedPath}.`);
      }
      matches.push(Object.freeze({ resRef, resourceType, bytes }));
    }
    return matches;
  } finally {
    fs.closeSync(file);
  }
}

export function findErfModelSources({ searchDirectories, targetModelResRefs }) {
  const targets = new Set(
    [...targetModelResRefs].map(normalizeResRef).filter(Boolean)
  );
  const matches = new Map();
  const addMatch = (resRef, match) => {
    const existing = matches.get(resRef) ?? [];
    existing.push(match);
    matches.set(resRef, existing);
  };
  const files = [...new Set(
    searchDirectories.flatMap((directory) => walkFiles(directory))
  )].sort((left, right) => left.localeCompare(right));
  for (const filePath of files) {
    const extension = path.extname(filePath).toLowerCase();
    if (extension === ".mdl") {
      const resRef = normalizeResRef(path.basename(filePath, extension));
      if (targets.has(resRef)) addMatch(resRef, { kind: "loose_mdl", sourcePath: filePath });
      continue;
    }
    if (![".erf", ".hak", ".mod", ".nwm"].includes(extension)) continue;
    for (const resRef of indexErfModelResRefs(filePath)) {
      if (targets.has(resRef)) addMatch(resRef, { kind: "hak", sourcePath: filePath });
    }
  }
  return matches;
}
