import {
  MAX_AREA_PLACEABLE_LOCALIZED_STRING_ENTRIES,
  MAX_AREA_PLACEABLE_LOCALIZED_STRING_ENTRY_BYTES,
  MAX_AREA_PLACEABLE_LOCALIZED_STRING_TOTAL_TEXT_BYTES,
} from "./area-placeable-localized-strings";
import { isAddableAreaNameStorageEntryIdentifier } from "./area-name-language-catalog";

export const MAX_EDITABLE_AREA_NAME_ASCII_BYTES = 256;
export const MAX_EDITABLE_AREA_TAG_ASCII_BYTES = 64;

export type AreaNameStorageProfile =
  | "simple_inline_ascii"
  | "multi_entry_inline_ascii";

export interface EditableAreaNameStorageEntry {
  readonly languageId: number;
  readonly text: string;
}

export interface EditableAreaNameStorage {
  readonly name: string;
  readonly profile: AreaNameStorageProfile;
  readonly entries: readonly EditableAreaNameStorageEntry[];
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

const MUTATION_KEYS = Object.freeze(["expectedValue", "value"] as const);
const NAME_MUTATION_KEYS = Object.freeze([
  "expectedValue",
  "value",
  "expectedProfile",
] as const);
const NAME_ENTRY_MUTATION_KEYS = Object.freeze([
  "expectedValue",
  "value",
  "expectedProfile",
  "expectedEntries",
  "valueEntries",
] as const);
const UINT32_MAX = 0xffff_ffff;

export function isAreaNameStorageProfile(value: unknown): value is AreaNameStorageProfile {
  return value === "simple_inline_ascii" || value === "multi_entry_inline_ascii";
}

export function readEditableAreaNameStorage(value: unknown): EditableAreaNameStorage | undefined {
  if (
    !isRecord(value)
    || !hasExactKeys(value, ["present", "strRef", "entries"])
    || value.present !== true
    || value.strRef !== UINT32_MAX
    || !Array.isArray(value.entries)
    || value.entries.length < 1
    || value.entries.length > MAX_AREA_PLACEABLE_LOCALIZED_STRING_ENTRIES
  ) {
    return undefined;
  }

  const entries: EditableAreaNameStorageEntry[] = [];
  for (const candidate of value.entries) {
    if (
      !isRecord(candidate)
      || !hasExactKeys(candidate, ["languageId", "textBytesBase64"])
      || !isUInt32(candidate.languageId)
      || typeof candidate.textBytesBase64 !== "string"
    ) {
      return undefined;
    }
    const bytes = Buffer.from(candidate.textBytesBase64, "base64");
    if (
      bytes.toString("base64") !== candidate.textBytesBase64
      || bytes.length > MAX_AREA_PLACEABLE_LOCALIZED_STRING_ENTRY_BYTES
      || bytes.some((byte) => byte < 0x20 || byte > 0x7e)
    ) {
      return undefined;
    }
    const text = bytes.toString("ascii");
    entries.push({ languageId: candidate.languageId, text });
  }
  const admittedEntries = readEditableAreaNameEntries(entries);
  if (!admittedEntries) return undefined;
  const defaultName = admittedEntries.find((entry) => entry.languageId === 0)?.text;
  if (!isEditableAreaName(defaultName)) return undefined;
  return Object.freeze({
    name: defaultName,
    profile: areaNameStorageProfileForEntries(admittedEntries),
    entries: admittedEntries,
  });
}

export function readEditableAreaNameEntries(
  value: unknown,
): readonly EditableAreaNameStorageEntry[] | undefined {
  if (
    !Array.isArray(value)
    || value.length < 1
    || value.length > MAX_AREA_PLACEABLE_LOCALIZED_STRING_ENTRIES
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
      || candidate.text.length > MAX_AREA_PLACEABLE_LOCALIZED_STRING_ENTRY_BYTES
      || !/^[\x20-\x7e]*$/u.test(candidate.text)
      || totalTextBytes + candidate.text.length
        > MAX_AREA_PLACEABLE_LOCALIZED_STRING_TOTAL_TEXT_BYTES
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

export function readExistingAreaBasicIdentityMutations(
  value: unknown,
): ExistingAreaBasicIdentityMutations | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.some((key) => key !== "name" && key !== "tag")) return null;
  const result: { name?: ExistingAreaBasicIdentityMutation; tag?: ExistingAreaBasicIdentityMutation } = {};
  for (const key of ["name", "tag"] as const) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    const candidate = value[key];
    if (!isRecord(candidate)) return null;
    const hasExpectedProfile = Object.prototype.hasOwnProperty.call(candidate, "expectedProfile");
    const hasExpectedEntries = Object.prototype.hasOwnProperty.call(candidate, "expectedEntries");
    const hasValueEntries = Object.prototype.hasOwnProperty.call(candidate, "valueEntries");
    const hasEntryLists = hasExpectedEntries || hasValueEntries;
    if (
      key === "tag"
        ? !hasExactKeys(candidate, MUTATION_KEYS)
        : !hasExactKeys(candidate, hasEntryLists
            ? NAME_ENTRY_MUTATION_KEYS
            : hasExpectedProfile ? NAME_MUTATION_KEYS : MUTATION_KEYS)
    ) return null;
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
    ) {
      return null;
    }
    result[key] = Object.freeze({
      expectedValue: candidate.expectedValue as string,
      value: candidate.value as string,
      ...(hasExpectedProfile
        ? { expectedProfile: candidate.expectedProfile as AreaNameStorageProfile }
        : {}),
      ...(expectedEntries && valueEntries
        ? { expectedEntries, valueEntries }
        : {}),
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
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= UINT32_MAX;
}
