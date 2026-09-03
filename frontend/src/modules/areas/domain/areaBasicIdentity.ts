import { isAddableAreaNameStorageEntryIdentifier } from "./areaNameLanguageCatalog";

export const MAX_EDITABLE_AREA_NAME_ASCII_BYTES = 256;
export const MAX_EDITABLE_AREA_TAG_ASCII_BYTES = 64;
export const MAX_EDITABLE_AREA_NAME_STORAGE_ENTRIES = 64;
export const MAX_EDITABLE_AREA_NAME_ENTRY_ASCII_BYTES = 16_384;
export const MAX_EDITABLE_AREA_NAME_TOTAL_ASCII_BYTES = 65_536;

export type AreaNameStorageProfile =
  | "simple_inline_ascii"
  | "multi_entry_inline_ascii";

export interface EditableAreaNameStorageEntry {
  readonly languageId: number;
  readonly text: string;
}

export interface AreaBasicIdentity {
  readonly name?: string;
  readonly nameProfile?: AreaNameStorageProfile;
  readonly nameEntries?: readonly EditableAreaNameStorageEntry[];
  readonly tag?: string;
}

export interface ExistingAreaBasicIdentityMutation {
  readonly expectedValue: string;
  readonly value: string;
  readonly expectedProfile?: AreaNameStorageProfile;
  readonly expectedEntries?: readonly EditableAreaNameStorageEntry[];
  readonly valueEntries?: readonly EditableAreaNameStorageEntry[];
}

export interface ExistingAreaBasicIdentityMutations {
  readonly name?: ExistingAreaBasicIdentityMutation;
  readonly tag?: ExistingAreaBasicIdentityMutation;
}

export function isAreaNameStorageProfile(value: unknown): value is AreaNameStorageProfile {
  return value === "simple_inline_ascii" || value === "multi_entry_inline_ascii";
}

export function isEditableAreaName(value: unknown): value is string {
  return typeof value === "string"
    && value.length >= 1
    && value.length <= MAX_EDITABLE_AREA_NAME_ASCII_BYTES
    && value.trim().length > 0
    && /^[\x20-\x7e]+$/u.test(value);
}

export function isEditableAreaTag(value: unknown): value is string {
  return typeof value === "string"
    && value.length <= MAX_EDITABLE_AREA_TAG_ASCII_BYTES
    && /^[\x20-\x7e]*$/u.test(value);
}

export function readEditableAreaNameEntries(
  value: unknown,
): readonly EditableAreaNameStorageEntry[] | undefined {
  if (
    !Array.isArray(value)
    || value.length < 1
    || value.length > MAX_EDITABLE_AREA_NAME_STORAGE_ENTRIES
  ) return undefined;
  const identifiers = new Set<number>();
  const entries: EditableAreaNameStorageEntry[] = [];
  let totalTextBytes = 0;
  for (const candidate of value) {
    if (
      !isRecord(candidate)
      || !hasExactKeys(candidate, ["languageId", "text"])
      || !isUInt32(candidate.languageId)
      || identifiers.has(candidate.languageId)
      || typeof candidate.text !== "string"
      || candidate.text.length > MAX_EDITABLE_AREA_NAME_ENTRY_ASCII_BYTES
      || !/^[\x20-\x7e]*$/u.test(candidate.text)
      || totalTextBytes + candidate.text.length > MAX_EDITABLE_AREA_NAME_TOTAL_ASCII_BYTES
    ) return undefined;
    identifiers.add(candidate.languageId);
    totalTextBytes += candidate.text.length;
    entries.push(Object.freeze({ languageId: candidate.languageId, text: candidate.text }));
  }
  const defaultName = entries.find((entry) => entry.languageId === 0)?.text;
  return isEditableAreaName(defaultName) ? Object.freeze(entries) : undefined;
}

export function areaNameStorageEntriesEqual(
  left: readonly EditableAreaNameStorageEntry[],
  right: readonly EditableAreaNameStorageEntry[],
): boolean {
  return left.length === right.length && left.every((entry, index) =>
    entry.languageId === right[index]?.languageId && entry.text === right[index]?.text);
}

export function cloneAreaNameStorageEntries(
  entries: readonly EditableAreaNameStorageEntry[],
): readonly EditableAreaNameStorageEntry[] {
  return Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
}

export function areaNameStorageEntryIdentifiersEqual(
  left: readonly EditableAreaNameStorageEntry[],
  right: readonly EditableAreaNameStorageEntry[],
): boolean {
  return left.length === right.length && left.every((entry, index) =>
    entry.languageId === right[index]?.languageId);
}

export function areaNameStorageEntryIdentifiersFormAdmittedTarget(
  source: readonly EditableAreaNameStorageEntry[],
  target: readonly EditableAreaNameStorageEntry[],
): boolean {
  const sourceIdentifiers = new Set(source.map((entry) => entry.languageId));
  const targetIdentifiers = new Set(target.map((entry) => entry.languageId));
  return sourceIdentifiers.size === source.length
    && targetIdentifiers.size === target.length
    && sourceIdentifiers.has(0)
    && targetIdentifiers.has(0)
    && target.every((entry) => sourceIdentifiers.has(entry.languageId) || (
      isAddableAreaNameStorageEntryIdentifier(entry.languageId)
      && entry.text.length > 0
      && /^[\x20-\x7e]+$/u.test(entry.text)
    ));
}

export function areaNameStorageProfileForEntries(
  entries: readonly EditableAreaNameStorageEntry[],
): AreaNameStorageProfile {
  return entries.length === 1 ? "simple_inline_ascii" : "multi_entry_inline_ascii";
}

export function readExistingAreaBasicIdentityMutations(
  value: unknown,
): ExistingAreaBasicIdentityMutations | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.some((key) => key !== "name" && key !== "tag")) return null;
  const result: {
    name?: ExistingAreaBasicIdentityMutation;
    tag?: ExistingAreaBasicIdentityMutation;
  } = {};
  for (const key of ["name", "tag"] as const) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    const candidate = value[key];
    if (!isRecord(candidate)) return null;
    const hasExpectedProfile = Object.prototype.hasOwnProperty.call(candidate, "expectedProfile");
    const hasExpectedEntries = Object.prototype.hasOwnProperty.call(candidate, "expectedEntries");
    const hasValueEntries = Object.prototype.hasOwnProperty.call(candidate, "valueEntries");
    const hasEntryLists = hasExpectedEntries || hasValueEntries;
    const allowedKeys = key === "tag"
      ? ["expectedValue", "value"]
      : hasEntryLists
        ? ["expectedValue", "value", "expectedProfile", "expectedEntries", "valueEntries"]
        : hasExpectedProfile
          ? ["expectedValue", "value", "expectedProfile"]
          : ["expectedValue", "value"];
    if (!hasExactKeys(candidate, allowedKeys)) return null;
    const validator = key === "name" ? isEditableAreaName : isEditableAreaTag;
    const expectedEntries = hasEntryLists
      ? readEditableAreaNameEntries(candidate.expectedEntries)
      : undefined;
    const valueEntries = hasEntryLists
      ? readEditableAreaNameEntries(candidate.valueEntries)
      : undefined;
    if (
      !validator(candidate.expectedValue)
      || !validator(candidate.value)
      || (hasExpectedProfile && !isAreaNameStorageProfile(candidate.expectedProfile))
      || (hasEntryLists && (!hasExpectedEntries || !hasValueEntries || !hasExpectedProfile))
      || (hasEntryLists && (!expectedEntries || !valueEntries))
      || (hasEntryLists && expectedEntries && valueEntries && (
        !areaNameStorageEntryIdentifiersFormAdmittedTarget(expectedEntries, valueEntries)
        || areaNameStorageEntriesEqual(expectedEntries, valueEntries)
        || expectedEntries.find((entry) => entry.languageId === 0)?.text
          !== candidate.expectedValue
        || valueEntries.find((entry) => entry.languageId === 0)?.text !== candidate.value
        || areaNameStorageProfileForEntries(expectedEntries) !== candidate.expectedProfile
      ))
      || (!hasEntryLists && candidate.expectedValue === candidate.value)
    ) return null;
    result[key] = Object.freeze({
      expectedValue: candidate.expectedValue as string,
      value: candidate.value as string,
      ...(hasExpectedProfile
        ? { expectedProfile: candidate.expectedProfile as AreaNameStorageProfile }
        : {}),
      ...(expectedEntries && valueEntries ? { expectedEntries, valueEntries } : {}),
    });
  }
  return Object.freeze(result);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length
    && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function isUInt32(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 0xffff_ffff;
}
