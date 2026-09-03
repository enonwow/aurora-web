import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const LINEAGE_V2_SCHEMA = "aurora-decompilation-lineage/v2";
export const LINEAGE_V2_VALIDATION_SCHEMA = "aurora-decompilation-lineage-validation/v2";
export const SESSION_ATTESTATION_SCHEMA =
  "aurora-ghidra-decompilation-session-attestation/v1";
export const FAILURE_LEDGER_SCHEMA =
  "aurora-ghidra-decompilation-failure-ledger/v1";

const PORTABLE_DIGEST_EXCLUDED_KEYS = new Set([
  "generatedAt",
  "hostPathDiagnostic",
  "portableRecordDigestSha256"
]);

export class LineageInputError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "LineageInputError";
    this.code = code;
  }
}

export function inventoryLineageFile(packetRoot, filePath) {
  const root = path.resolve(packetRoot);
  const resolved = path.resolve(filePath);
  assertInsideRoot(root, resolved, "inventory_file_outside_packet_root");
  let stats;
  try {
    stats = fs.lstatSync(resolved);
  } catch {
    throw new LineageInputError(
      "inventory_file_missing",
      `Required packet file is missing: ${toPortablePath(root, resolved)}`
    );
  }
  if (!stats.isFile()) {
    throw new LineageInputError(
      "inventory_file_not_regular",
      `Packet input must be a regular file: ${toPortablePath(root, resolved)}`
    );
  }
  const bytes = fs.readFileSync(resolved);
  return {
    portablePath: toPortablePath(root, resolved),
    hostPathDiagnostic: resolved,
    bytes: bytes.length,
    sha256: sha256(bytes)
  };
}

export function inventoryLineageDirectory(packetRoot, directoryPath, excludedPaths = []) {
  const root = path.resolve(packetRoot);
  const directory = path.resolve(directoryPath);
  assertInsideRoot(root, directory, "inventory_directory_outside_packet_root");
  let stats;
  try {
    stats = fs.lstatSync(directory);
  } catch {
    throw new LineageInputError(
      "inventory_directory_missing",
      `Required packet directory is missing: ${toPortablePath(root, directory)}`
    );
  }
  if (!stats.isDirectory()) {
    throw new LineageInputError(
      "inventory_directory_invalid",
      `Packet export path must be a directory: ${toPortablePath(root, directory)}`
    );
  }
  const excluded = new Set(excludedPaths.map((entry) => path.resolve(entry).toLowerCase()));
  const outputs = walkRegularFiles(directory)
    .filter((filePath) => !excluded.has(path.resolve(filePath).toLowerCase()))
    .map((filePath) => ({
      exportPath: path.relative(directory, filePath).replaceAll("\\", "/"),
      ...inventoryLineageFile(root, filePath)
    }))
    .sort((left, right) => left.exportPath.localeCompare(right.exportPath, "en"));
  if (outputs.length === 0) {
    throw new LineageInputError(
      "export_directory_empty",
      "Export directory must contain at least one regular output file."
    );
  }
  return outputs;
}

export function readLineageJson(filePath, code = "artifact_json_malformed") {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, ""));
  } catch {
    throw new LineageInputError(code, `Malformed JSON: ${path.basename(filePath)}`);
  }
}

export function readLineageJsonl(filePath, code = "artifact_jsonl_malformed") {
  let text;
  try {
    text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "");
  } catch {
    throw new LineageInputError("inventory_file_missing", `Missing JSONL: ${path.basename(filePath)}`);
  }
  const lines = text.split(/\r?\n/u).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    throw new LineageInputError(code, `JSONL has no records: ${path.basename(filePath)}`);
  }
  return lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      throw new LineageInputError(code, `Malformed JSONL: ${path.basename(filePath)}`);
    }
  });
}

export function parsePortableExecutableIdentity(bytes) {
  try {
    if (!Buffer.isBuffer(bytes) || bytes.length < 0x100 || bytes.toString("ascii", 0, 2) !== "MZ") {
      throw new Error("dos");
    }
    const peOffset = bytes.readUInt32LE(0x3c);
    if (peOffset < 0x40 || peOffset + 24 > bytes.length) throw new Error("offset");
    if (bytes.toString("binary", peOffset, peOffset + 4) !== "PE\0\0") throw new Error("pe");
    const machineValue = bytes.readUInt16LE(peOffset + 4);
    const timestampValue = bytes.readUInt32LE(peOffset + 8);
    const optionalHeaderSize = bytes.readUInt16LE(peOffset + 20);
    const optionalOffset = peOffset + 24;
    if (optionalHeaderSize < 32 || optionalOffset + optionalHeaderSize > bytes.length) {
      throw new Error("optional");
    }
    const magicValue = bytes.readUInt16LE(optionalOffset);
    let format;
    let imageBase;
    if (magicValue === 0x010b) {
      format = "PE32";
      imageBase = hex(bytes.readUInt32LE(optionalOffset + 28), 8);
    } else if (magicValue === 0x020b) {
      format = "PE32+";
      imageBase = `0x${bytes.readBigUInt64LE(optionalOffset + 24).toString(16).padStart(16, "0")}`;
    } else {
      throw new Error("magic");
    }
    return {
      format,
      machine: hex(machineValue, 4),
      timestamp: hex(timestampValue, 8),
      optionalHeaderMagic: hex(magicValue, 4),
      imageBase
    };
  } catch {
    throw new LineageInputError(
      "input_binary_pe_invalid",
      "input-binary must contain a structurally valid PE32 or PE32+ header"
    );
  }
}

export function portableRecordDigest(value) {
  return sha256(Buffer.from(JSON.stringify(canonicalize(value)), "utf8"));
}

export function resolveInventoryPath(packetRoot, inventory) {
  const root = path.resolve(packetRoot);
  if (!isNormalizedPortablePath(inventory?.portablePath)) {
    throw new LineageInputError(
      "inventory_portable_path_invalid",
      "Inventory portablePath is invalid."
    );
  }
  const resolved = path.resolve(root, inventory.portablePath);
  assertInsideRoot(root, resolved, "inventory_file_outside_packet_root");
  return resolved;
}

export function inspectInventoryAgainstDisk(packetRoot, inventory) {
  let filePath;
  try {
    filePath = resolveInventoryPath(packetRoot, inventory);
  } catch (error) {
    return { ok: false, code: error.code ?? "inventory_portable_path_invalid", filePath: null };
  }
  let actual;
  try {
    actual = inventoryLineageFile(packetRoot, filePath);
  } catch (error) {
    return { ok: false, code: error.code ?? "inventory_file_unreadable", filePath };
  }
  if (actual.sha256 !== inventory.sha256) {
    return { ok: false, code: "inventory_file_hash_mismatch", filePath, actual };
  }
  if (actual.bytes !== inventory.bytes) {
    return { ok: false, code: "inventory_file_size_mismatch", filePath, actual };
  }
  return { ok: true, code: null, filePath, actual };
}

export function writeLineageJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function parseLineageArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith("--")) {
      throw new LineageInputError("cli_argument_invalid", `Unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new LineageInputError("cli_argument_missing_value", `Missing value for --${key}`);
    }
    index += 1;
    if (key === "export-script") {
      parsed[key] = [...asArray(parsed[key]), value];
    } else {
      parsed[key] = value;
    }
  }
  return parsed;
}

export function requireLineageArg(args, key) {
  const value = args[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new LineageInputError("cli_argument_required", `--${key} is required`);
  }
  return value.trim();
}

export function requireGeneratedAt(value) {
  const result = value ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(result))) {
    throw new LineageInputError("generated_at_invalid", "generated-at must be ISO-8601");
  }
  return result;
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function toPortablePath(packetRoot, filePath) {
  return path.relative(path.resolve(packetRoot), path.resolve(filePath)).replaceAll("\\", "/");
}

export function isNormalizedPortablePath(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.includes("\\") &&
    !path.posix.isAbsolute(value) &&
    path.posix.normalize(value) === value &&
    value !== "." &&
    !value.startsWith("../")
  );
}

export function asArray(value) {
  if (Array.isArray(value)) return value;
  return value === undefined ? [] : [value];
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  return Object.keys(value)
    .filter((key) => !PORTABLE_DIGEST_EXCLUDED_KEYS.has(key))
    .sort((left, right) => left.localeCompare(right, "en"))
    .reduce((result, key) => {
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
}

function walkRegularFiles(directoryPath) {
  return fs.readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) return walkRegularFiles(entryPath);
    if (entry.isFile()) return [entryPath];
    throw new LineageInputError(
      "inventory_entry_not_regular",
      `Export inventory contains a non-regular entry: ${entry.name}`
    );
  });
}

function assertInsideRoot(root, candidate, code) {
  const relative = path.relative(root, candidate);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) return;
  throw new LineageInputError(code, "Packet path escapes packet-root.");
}

function hex(value, width) {
  return `0x${Number(value).toString(16).padStart(width, "0")}`;
}
