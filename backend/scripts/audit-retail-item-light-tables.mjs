import { readFile, open } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

const NWN_ROOT =
  process.argv[2] ?? "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights";
const KEY_FILES = ["nwn_base.key", "nwn_retail.key"];
const TWO_DA_TYPE = 2017;
const TARGET_RESREFS = [
  "itempropdef",
  "iprp_costtable",
  "iprp_paramtable",
  "iprp_lightcost",
  "iprp_color"
];

function readUInt16(data, offset) {
  return data.readUInt16LE(offset);
}

function readUInt32(data, offset) {
  return data.readUInt32LE(offset);
}

function decodeResref(bytes) {
  const firstNullIndex = bytes.indexOf(0);
  const usedLength = firstNullIndex >= 0 ? firstNullIndex : bytes.length;
  return Buffer.from(bytes.subarray(0, usedLength)).toString("ascii").trim().toLowerCase();
}

function buildResourceKey(resref, resourceType) {
  return `${resref.trim().toLowerCase()}|${resourceType}`;
}

function stripMatchingRootSegment(fileName, rootName) {
  const normalized = fileName.replace(/\\/gu, "/");
  const segments = normalized.split("/");
  const first = segments[0];
  if (first?.toLowerCase() === rootName.toLowerCase() && segments.length > 1) {
    return segments.slice(1).join("/");
  }
  return normalized;
}

async function existsAsFile(pathValue) {
  try {
    const fileHandle = await open(pathValue, "r");
    await fileHandle.close();
    return true;
  } catch {
    return false;
  }
}

async function parseKeyFile(keyPath, bifRoot) {
  const data = await readFile(keyPath);
  const signature = data.toString("ascii", 0, 4);
  const version = data.toString("ascii", 4, 8);
  if (signature !== "KEY " || (version !== "V1  " && version !== "V1.1")) {
    throw new Error(`Unsupported KEY file ${keyPath}: ${signature}${version}`);
  }

  const bifCount = readUInt32(data, 8);
  const keyCount = readUInt32(data, 12);
  const fileTableOffset = readUInt32(data, 16);
  const keyTableOffset = readUInt32(data, 20);

  const bifFiles = [];
  for (let index = 0; index < bifCount; index += 1) {
    const offset = fileTableOffset + index * 12;
    const fileSize = readUInt32(data, offset);
    const nameOffset = readUInt32(data, offset + 4);
    const nameSize = readUInt16(data, offset + 8);
    const fileName = data
      .subarray(nameOffset, nameOffset + nameSize)
      .toString("ascii")
      .replace(/\0+$/u, "")
      .replace(/\\/gu, "/");
    bifFiles.push({ fileName, fileSize });
  }

  const resources = new Map();
  for (let index = 0; index < keyCount; index += 1) {
    const offset = keyTableOffset + index * 22;
    const resref = decodeResref(data.subarray(offset, offset + 16));
    const resourceType = readUInt16(data, offset + 16);
    const resourceId = readUInt32(data, offset + 18);
    resources.set(buildResourceKey(resref, resourceType), {
      resref,
      resourceType,
      bifIndex: (resourceId >>> 20) & 0xfff,
      resourceIndex: resourceId & 0xfffff
    });
  }

  async function resolveBifPath(fileName) {
    const candidates = [
      resolve(bifRoot, fileName),
      resolve(bifRoot, stripMatchingRootSegment(fileName, basename(bifRoot))),
      resolve(bifRoot, basename(fileName)),
      resolve(dirname(keyPath), basename(fileName))
    ];
    for (const candidate of candidates) {
      if (await existsAsFile(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  async function readResource(resref, resourceType) {
    const entry = resources.get(buildResourceKey(resref, resourceType));
    if (!entry) {
      return null;
    }
    const bifFile = bifFiles[entry.bifIndex];
    if (!bifFile) {
      return null;
    }
    const bifPath = await resolveBifPath(bifFile.fileName);
    if (!bifPath) {
      return null;
    }
    const bytes = await readBifResource(bifPath, entry.resourceIndex);
    return {
      resref: entry.resref,
      resourceType: entry.resourceType,
      keyPath,
      bifPath,
      resourceIndex: entry.resourceIndex,
      bytes
    };
  }

  return {
    keyPath,
    bifRoot,
    readResource,
    twoDaCount: Array.from(resources.values()).filter(
      (entry) => entry.resourceType === TWO_DA_TYPE
    ).length
  };
}

async function readBifResource(bifPath, resourceIndex) {
  const fileHandle = await open(bifPath, "r");
  try {
    const header = await readExact(fileHandle, 0, 20);
    const signature = header.toString("ascii", 0, 4);
    const version = header.toString("ascii", 4, 8);
    if (signature !== "BIFF" || (version !== "V1  " && version !== "V1.1")) {
      throw new Error(`Unsupported BIF file ${bifPath}: ${signature}${version}`);
    }
    const variableResourceCount = readUInt32(header, 8);
    const variableTableOffset = readUInt32(header, 16);
    if (resourceIndex < 0 || resourceIndex >= variableResourceCount) {
      throw new Error(`Invalid BIF resource index ${resourceIndex} for ${bifPath}`);
    }
    const entrySize = version === "V1.1" ? 20 : 16;
    const entryOffset = variableTableOffset + resourceIndex * entrySize;
    const entry = await readExact(fileHandle, entryOffset, entrySize);
    const resourceOffset = version === "V1.1" ? readUInt32(entry, 8) : readUInt32(entry, 4);
    const resourceSize = version === "V1.1" ? readUInt32(entry, 12) : readUInt32(entry, 8);
    return readExact(fileHandle, resourceOffset, resourceSize);
  } finally {
    await fileHandle.close();
  }
}

async function readExact(handle, position, length) {
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await handle.read(buffer, 0, length, position);
  if (bytesRead !== length) {
    throw new Error(
      `Failed to read BIF payload. Expected ${length} bytes at offset ${position}, got ${bytesRead}.`
    );
  }
  return buffer;
}

function parseTwoDa(bytes) {
  const lines = bytes
    .toString("utf8")
    .replace(/^\uFEFF/u, "")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  const body = lines.filter((line) => !line.startsWith("//"));
  let cursor = 0;
  if (/^2DA\b/iu.test(body[cursor] ?? "")) {
    cursor += 1;
  }
  if (/^DEFAULT:/iu.test(body[cursor] ?? "")) {
    cursor += 1;
  }
  const columns = (body[cursor] ?? "").split(/\s+/u);
  cursor += 1;
  const rows = [];
  for (; cursor < body.length; cursor += 1) {
    const tokens = body[cursor].split(/\s+/u);
    if (tokens.length === 0 || !/^-?\d+$/u.test(tokens[0])) {
      continue;
    }
    const index = Number.parseInt(tokens[0], 10);
    const cells = {};
    columns.forEach((column, columnIndex) => {
      cells[column] = tokens[columnIndex + 1] ?? "";
    });
    rows.push({ index, cells });
  }
  return { columns, rows };
}

function pickRows(table, resref) {
  if (resref === "itempropdef") {
    return table.rows.filter((row) => row.index === 44);
  }
  if (resref === "iprp_costtable") {
    return table.rows.filter((row) => row.index === 18);
  }
  if (resref === "iprp_paramtable") {
    return table.rows.filter((row) => row.index === 9);
  }
  return table.rows;
}

const keyPaths = KEY_FILES.map((keyFile) => resolve(NWN_ROOT, "data", keyFile));
const readers = [];
for (const keyPath of keyPaths) {
  if (await existsAsFile(keyPath)) {
    readers.push(await parseKeyFile(keyPath, NWN_ROOT));
  }
}

const tables = [];
for (const resref of TARGET_RESREFS) {
  let found = null;
  for (const reader of readers) {
    found = await reader.readResource(resref, TWO_DA_TYPE);
    if (found) {
      break;
    }
  }
  if (!found) {
    tables.push({ resref, status: "missing" });
    continue;
  }
  const table = parseTwoDa(found.bytes);
  tables.push({
    resref,
    status: "found",
    keyPath: found.keyPath,
    bifPath: found.bifPath,
    resourceIndex: found.resourceIndex,
    byteLength: found.bytes.length,
    columns: table.columns,
    rows: pickRows(table, resref)
  });
}

console.log(
  JSON.stringify(
    {
      root: NWN_ROOT,
      readers: readers.map((reader) => ({
        keyPath: reader.keyPath,
        twoDaCount: reader.twoDaCount
      })),
      tables,
      proofStatus: tables.every((table) => table.status === "found")
        ? "source-backed-retail-key-bif-item-light-tables"
        : "blocked-retail-key-bif-item-light-table-missing"
    },
    null,
    2
  )
);
