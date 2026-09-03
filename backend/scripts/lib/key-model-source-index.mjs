import fs from "node:fs";
import path from "node:path";

const MDL_RESOURCE_TYPE = 2002;
const HEADER_SIZE = 64;
const FILE_TABLE_ENTRY_SIZE = 12;
const KEY_TABLE_ENTRY_SIZE = 22;

function decodeAscii(bytes) {
  return bytes.toString("ascii").replace(/\0+$/u, "").trim();
}

function normalizeResRef(value) {
  return String(value ?? "").trim().toLowerCase();
}

function checkedTableBounds({ fileSize, offset, count, entrySize, label, filePath }) {
  const byteLength = count * entrySize;
  if (
    !Number.isSafeInteger(byteLength) ||
    offset < HEADER_SIZE ||
    offset > fileSize ||
    byteLength > fileSize - offset
  ) {
    throw new Error(`Invalid KEY ${label} bounds: ${filePath}.`);
  }
  return byteLength;
}

function resolveBifPath(resourceRoot, declaredPath, keyPath) {
  const portablePath = String(declaredPath ?? "").replaceAll("\\", "/").trim();
  if (!portablePath || path.posix.isAbsolute(portablePath)) {
    throw new Error(`Invalid KEY BIF path in ${keyPath}.`);
  }
  const segments = portablePath.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`Unsafe KEY BIF path in ${keyPath}: ${portablePath}.`);
  }
  const resolvedRoot = path.resolve(resourceRoot);
  const resolvedPath = path.resolve(resolvedRoot, ...segments);
  const relative = path.relative(resolvedRoot, resolvedPath);
  if (
    !relative ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`KEY BIF path escapes its resource root in ${keyPath}: ${portablePath}.`);
  }
  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    throw new Error(`KEY BIF source is missing for ${keyPath}: ${resolvedPath}.`);
  }
  return resolvedPath;
}

export function indexKeyResourceSources(filePath, resourceType, options = {}) {
  if (!Number.isInteger(resourceType) || resourceType < 0 || resourceType > 65_535) {
    throw new Error(`Invalid KEY resource type: ${resourceType}.`);
  }
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) return [];
  const bytes = fs.readFileSync(resolvedPath);
  if (bytes.length < HEADER_SIZE) return [];
  if (bytes.toString("ascii", 0, 4) !== "KEY " || bytes.toString("ascii", 4, 8) !== "V1  ") {
    return [];
  }
  const bifCount = bytes.readUInt32LE(8);
  const keyCount = bytes.readUInt32LE(12);
  const fileTableOffset = bytes.readUInt32LE(16);
  const keyTableOffset = bytes.readUInt32LE(20);
  checkedTableBounds({
    fileSize: bytes.length,
    offset: fileTableOffset,
    count: bifCount,
    entrySize: FILE_TABLE_ENTRY_SIZE,
    label: "file table",
    filePath: resolvedPath
  });
  checkedTableBounds({
    fileSize: bytes.length,
    offset: keyTableOffset,
    count: keyCount,
    entrySize: KEY_TABLE_ENTRY_SIZE,
    label: "resource table",
    filePath: resolvedPath
  });
  const resourceRoot = path.resolve(
    options.resourceRoot ?? path.dirname(path.dirname(resolvedPath))
  );
  if (!fs.existsSync(resourceRoot) || !fs.statSync(resourceRoot).isDirectory()) {
    throw new Error(`KEY resource root is missing: ${resourceRoot}.`);
  }
  const bifPaths = [];
  for (let index = 0; index < bifCount; index += 1) {
    const entryOffset = fileTableOffset + index * FILE_TABLE_ENTRY_SIZE;
    const nameOffset = bytes.readUInt32LE(entryOffset + 4);
    const nameSize = bytes.readUInt16LE(entryOffset + 8);
    if (
      nameSize === 0 ||
      nameOffset < HEADER_SIZE ||
      nameOffset > bytes.length ||
      nameSize > bytes.length - nameOffset
    ) {
      throw new Error(`Invalid KEY BIF filename bounds at index ${index}: ${resolvedPath}.`);
    }
    const declaredPath = decodeAscii(bytes.subarray(nameOffset, nameOffset + nameSize));
    bifPaths.push(resolveBifPath(resourceRoot, declaredPath, resolvedPath));
  }
  const sources = [];
  for (let index = 0; index < keyCount; index += 1) {
    const entryOffset = keyTableOffset + index * KEY_TABLE_ENTRY_SIZE;
    if (bytes.readUInt16LE(entryOffset + 16) !== resourceType) continue;
    const resRef = normalizeResRef(decodeAscii(bytes.subarray(entryOffset, entryOffset + 16)));
    if (!resRef) continue;
    const resourceId = bytes.readUInt32LE(entryOffset + 18);
    const bifIndex = resourceId >>> 20;
    if (bifIndex >= bifPaths.length) {
      throw new Error(
        `KEY resource ${resRef} references invalid BIF index ${bifIndex}: ${resolvedPath}.`
      );
    }
    sources.push(Object.freeze({
      resRef,
      bifIndex,
      bifPath: bifPaths[bifIndex]
    }));
  }
  return sources.sort((left, right) =>
    left.resRef.localeCompare(right.resRef) ||
    left.bifPath.localeCompare(right.bifPath)
  );
}

export function indexKeyModelSources(filePath, options = {}) {
  return indexKeyResourceSources(filePath, MDL_RESOURCE_TYPE, options);
}

export function indexKeyModelResRefs(filePath, options = {}) {
  return [...new Set(
    indexKeyModelSources(filePath, options).map((source) => source.resRef)
  )].sort();
}
