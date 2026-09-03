export const MAX_MODULE_FACTION_CATALOG_BYTES = 16 * 1024 * 1024;
export const MAX_MODULE_FACTION_COUNT = 1024;
export const MAX_MODULE_FACTION_NAME_CODE_UNITS = 256;
export const MAX_MODULE_FACTION_SOURCE_OBJECT_KEY_LENGTH = 2048;
export const MODULE_FACTION_ROOT_TYPE_ID = 0xffffffff;

export interface ModuleFactionCatalogDescriptor {
  resourceName: "repute.fac";
  sourceObjectKey: string;
  sha256: string;
  sizeBytes: number;
  factionCount: number;
}

export interface ModuleFactionCatalogRow {
  factionId: number;
  name: string;
  parentFactionId: number;
  isGlobal: boolean;
}

export interface ModuleFactionCatalog {
  descriptor: ModuleFactionCatalogDescriptor;
  rows: ModuleFactionCatalogRow[];
}

export interface ModuleFactionCatalogInput {
  bytes: Buffer;
  sourceObjectKey: string;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

export function isModuleFactionCatalogInputAdmitted(
  input: ModuleFactionCatalogInput,
): boolean {
  return Buffer.isBuffer(input.bytes) && input.bytes.length >= 1 &&
    input.bytes.length <= MAX_MODULE_FACTION_CATALOG_BYTES &&
    typeof input.sourceObjectKey === "string" && input.sourceObjectKey.length >= 1 &&
    input.sourceObjectKey.length <= MAX_MODULE_FACTION_SOURCE_OBJECT_KEY_LENGTH;
}

export function isModuleFactionName(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 &&
    value.length <= MAX_MODULE_FACTION_NAME_CODE_UNITS && !value.includes("\0");
}

export function isDword(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 0xffffffff;
}

export function isModuleFactionId(value: unknown, factionCount: number): value is number {
  return isDword(value) && Number(value) < factionCount;
}

export function isExactModuleFactionCatalog(value: unknown): value is ModuleFactionCatalog {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isPlainRecord(value.descriptor) || !Array.isArray(value.rows)) return false;
  const descriptor = value.descriptor;
  if (!hasExactKeys(descriptor, [
    "resourceName", "sourceObjectKey", "sha256", "sizeBytes", "factionCount",
  ]) || descriptor.resourceName !== "repute.fac" ||
    typeof descriptor.sourceObjectKey !== "string" || descriptor.sourceObjectKey.length < 1 ||
    descriptor.sourceObjectKey.length > MAX_MODULE_FACTION_SOURCE_OBJECT_KEY_LENGTH ||
    typeof descriptor.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(descriptor.sha256) ||
    !Number.isSafeInteger(descriptor.sizeBytes) || Number(descriptor.sizeBytes) < 1 ||
    Number(descriptor.sizeBytes) > MAX_MODULE_FACTION_CATALOG_BYTES ||
    !Number.isSafeInteger(descriptor.factionCount) || Number(descriptor.factionCount) < 1 ||
    Number(descriptor.factionCount) > MAX_MODULE_FACTION_COUNT ||
    value.rows.length !== Number(descriptor.factionCount)) return false;

  const factionCount = Number(descriptor.factionCount);
  for (let factionId = 0; factionId < value.rows.length; factionId += 1) {
    const row = value.rows[factionId];
    if (!isPlainRecord(row) ||
      !hasExactKeys(row, ["factionId", "name", "parentFactionId", "isGlobal"]) ||
      row.factionId !== factionId || !isModuleFactionName(row.name) ||
      !(row.parentFactionId === 0xffffffff || isModuleFactionId(row.parentFactionId, factionCount)) ||
      typeof row.isGlobal !== "boolean") return false;
  }
  return true;
}
