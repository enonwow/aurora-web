import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { parseErfArchive } from "./aurora-model-proof-120s-erf-gff-readback.mjs";

const CACHE_VERSION = "aurora-toolset-exact-temp0-cache/v1";
const ADMISSION_VERSION = "aurora-toolset-verified-temp0-recovery-admission/v1";
const RESOURCE_EXTENSIONS = new Map([
  [0, "res"],
  [3, "tga"],
  [4, "wav"],
  [6, "plt"],
  [2002, "mdl"],
  [2009, "nss"],
  [2010, "ncs"],
  [2012, "are"],
  [2013, "set"],
  [2014, "ifo"],
  [2015, "bic"],
  [2016, "wok"],
  [2017, "2da"],
  [2022, "txi"],
  [2023, "git"],
  [2025, "uti"],
  [2027, "utc"],
  [2029, "dlg"],
  [2030, "itp"],
  [2032, "utt"],
  [2033, "dds"],
  [2035, "uts"],
  [2036, "ltr"],
  [2037, "gff"],
  [2038, "fac"],
  [2040, "ute"],
  [2042, "utd"],
  [2044, "utp"],
  [2045, "dft"],
  [2046, "gic"],
  [2047, "gui"],
  [2051, "utm"],
  [2058, "utw"],
  [2060, "ssf"],
  [2064, "ndb"],
]);

export function resourceExtensionForType(type) {
  return Number.isInteger(type) ? (RESOURCE_EXTENSIONS.get(type) ?? null) : null;
}

export function inspectExactTemp0Cache({ modulePath, temp0Path }) {
  const moduleFile = exactRegularFile(modulePath, "VERIFIED_TEMP0_MODULE");
  const cachePath = exactDirectory(temp0Path, "VERIFIED_TEMP0_DIRECTORY");
  if (basename(moduleFile).toLowerCase() === "temp0" || basename(cachePath).toLowerCase() !== "temp0") {
    fail("VERIFIED_TEMP0_PATH_INVALID", `${moduleFile}:${cachePath}`);
  }
  if (dirname(moduleFile).toLowerCase() !== dirname(cachePath).toLowerCase()) {
    fail("VERIFIED_TEMP0_DIRECTORY_MISMATCH", `${dirname(moduleFile)}:${dirname(cachePath)}`);
  }

  const moduleBytes = readFileSync(moduleFile);
  const archive = parseErfArchive(moduleBytes, "MOD ");
  const expected = archive.resources.map((resource) => {
    const extension = resourceExtensionForType(resource.type);
    if (!extension) fail("VERIFIED_TEMP0_RESOURCE_TYPE_UNSUPPORTED", `${resource.resref}:${resource.type}`);
    return {
      name: `${resource.resref}.${extension}`.toLowerCase(),
      resref: resource.resref,
      type: resource.type,
      bytes: resource.bytes,
    };
  }).sort((left, right) => left.name.localeCompare(right.name));
  const expectedNames = expected.map((resource) => resource.name);
  if (new Set(expectedNames).size !== expectedNames.length) {
    fail("VERIFIED_TEMP0_RESOURCE_NAME_AMBIGUOUS", expectedNames.join(","));
  }

  const actualEntries = readdirSync(cachePath, { withFileTypes: true })
    .map((entry) => ({ entry, normalized: entry.name.toLowerCase() }))
    .sort((left, right) => left.normalized.localeCompare(right.normalized));
  const actualNames = actualEntries.map(({ normalized }) => normalized);
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    fail("VERIFIED_TEMP0_FILE_SET_MISMATCH", JSON.stringify({ expected: expectedNames, actual: actualNames }));
  }

  const resources = expected.map((resource, index) => {
    const actual = actualEntries[index];
    const path = resolve(cachePath, actual.entry.name);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) fail("VERIFIED_TEMP0_RESOURCE_REPARSE_POINT", path);
    if (!stat.isFile()) fail("VERIFIED_TEMP0_RESOURCE_NOT_FILE", path);
    const bytes = readFileSync(path);
    if (!resource.bytes.equals(bytes)) fail("VERIFIED_TEMP0_RESOURCE_MISMATCH", resource.name);
    return {
      name: resource.name,
      resref: resource.resref,
      type: resource.type,
      byteLength: bytes.length,
      sha256: sha256(bytes),
      identical: true,
    };
  });

  const identity = {
    version: CACHE_VERSION,
    module: {
      path: moduleFile,
      byteLength: moduleBytes.length,
      sha256: sha256(moduleBytes),
    },
    temp0: {
      path: cachePath,
      resourceCount: resources.length,
    },
    resources,
  };
  return {
    ...identity,
    cacheIdentitySha256: sha256(Buffer.from(JSON.stringify(identity), "utf8")),
  };
}

export function createVerifiedTemp0RecoveryAdmission({ modulePath, temp0Path }) {
  const cache = inspectExactTemp0Cache({ modulePath, temp0Path });
  return {
    version: ADMISSION_VERSION,
    module: cache.module,
    temp0: cache.temp0,
    resources: cache.resources,
    cacheIdentitySha256: cache.cacheIdentitySha256,
  };
}

export function validateVerifiedTemp0RecoveryAdmission(admission, { modulePath, temp0Path }) {
  if (admission?.version !== ADMISSION_VERSION) {
    fail("VERIFIED_TEMP0_RECOVERY_ADMISSION_VERSION_INVALID", String(admission?.version));
  }
  const fresh = createVerifiedTemp0RecoveryAdmission({ modulePath, temp0Path });
  if (JSON.stringify(admission) !== JSON.stringify(fresh)) {
    fail("VERIFIED_TEMP0_RECOVERY_ADMISSION_MISMATCH", JSON.stringify({
      expectedIdentity: fresh.cacheIdentitySha256,
      actualIdentity: admission?.cacheIdentitySha256 ?? null,
    }));
  }
  return fresh;
}

function exactRegularFile(value, code) {
  const path = resolve(String(value ?? ""));
  let stat;
  try {
    stat = lstatSync(path);
  } catch {
    fail(`${code}_MISSING`, path);
  }
  if (stat.isSymbolicLink()) fail(`${code}_REPARSE_POINT`, path);
  if (!stat.isFile()) fail(`${code}_NOT_FILE`, path);
  return path;
}

function exactDirectory(value, code) {
  const path = resolve(String(value ?? ""));
  let stat;
  try {
    stat = lstatSync(path);
  } catch {
    fail(`${code}_MISSING`, path);
  }
  if (stat.isSymbolicLink()) fail(`${code}_REPARSE_POINT`, path);
  if (!stat.isDirectory()) fail(`${code}_NOT_DIRECTORY`, path);
  return path;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function fail(code, message) {
  const error = new Error(String(message));
  error.code = code;
  throw error;
}
