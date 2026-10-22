import {
  buildAreaInlineAsciiStorage,
  isAreaInlineAsciiText,
  readAreaInlineAsciiStorage,
  readExistingAreaInlineAsciiLocalizedStringMutations,
} from "./area-inline-ascii-localized-string-mutation";
import {
  MAX_AREA_ITEM_LOCALIZED_STRING_ENTRIES,
  MAX_AREA_ITEM_LOCALIZED_STRING_ENTRY_BYTES,
  MAX_AREA_ITEM_LOCALIZED_STRING_TOTAL_TEXT_BYTES,
  type AreaItemLocalizedStringStorage,
} from "./area-item-localized-strings";
import { isAddableAreaNameStorageEntryIdentifier } from "./area-name-language-catalog";

export const MAX_AREA_ITEM_LOCALIZED_NAME_ASCII_BYTES = 256;
export const MAX_AREA_ITEM_DESCRIPTION_ASCII_BYTES = 4_096;
export const MAX_AREA_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES = 4_096;

export type ExistingAreaItemLocalizedStringField =
  | "LocalizedName"
  | "Description"
  | "DescIdentified";

export type AreaItemLocalizedStringStorageProfile =
  | "empty_inline_ascii"
  | "simple_inline_ascii"
  | "multi_entry_inline_ascii";

export interface EditableAreaItemLocalizedStringEntry {
  readonly languageId: number;
  readonly text: string;
}

export interface EditableAreaItemLocalizedStringStorage {
  readonly value: string;
  readonly profile: AreaItemLocalizedStringStorageProfile;
  readonly entries: readonly EditableAreaItemLocalizedStringEntry[];
}

export interface ExistingAreaItemLocalizedStringMutation {
  readonly field: ExistingAreaItemLocalizedStringField;
  readonly expectedValue: string;
  readonly value: string;
  readonly expectedProfile?: AreaItemLocalizedStringStorageProfile;
  readonly expectedEntries?: readonly EditableAreaItemLocalizedStringEntry[];
  readonly valueEntries?: readonly EditableAreaItemLocalizedStringEntry[];
}

export const AREA_ITEM_LOCALIZED_STRING_MUTATION_FIELDS = Object.freeze([
  Object.freeze({
    field: "LocalizedName" as const,
    sourceKey: "localizedName" as const,
    targetKey: "localizedName" as const,
    maxBytes: MAX_AREA_ITEM_LOCALIZED_NAME_ASCII_BYTES,
  }),
  Object.freeze({
    field: "Description" as const,
    sourceKey: "description" as const,
    targetKey: "description" as const,
    maxBytes: MAX_AREA_ITEM_DESCRIPTION_ASCII_BYTES,
  }),
  Object.freeze({
    field: "DescIdentified" as const,
    sourceKey: "identifiedDescription" as const,
    targetKey: "identifiedDescription" as const,
    maxBytes: MAX_AREA_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES,
  }),
]);

export const isAreaItemInlineAsciiText = isAreaInlineAsciiText;
export const readAreaItemInlineAsciiStorage = readAreaInlineAsciiStorage;
export const buildAreaItemInlineAsciiStorage = (
  value: unknown,
  maxBytes: number,
): AreaItemLocalizedStringStorage | undefined => buildAreaInlineAsciiStorage(value, maxBytes);

const UINT32_MAX = 0xffff_ffff;

export function areaItemLocalizedStringProfileForEntries(
  entries: readonly EditableAreaItemLocalizedStringEntry[],
): AreaItemLocalizedStringStorageProfile {
  return entries.length === 0
    ? "empty_inline_ascii"
    : entries.length === 1
      ? "simple_inline_ascii"
      : "multi_entry_inline_ascii";
}

export function cloneAreaItemLocalizedStringEntries(
  entries: readonly EditableAreaItemLocalizedStringEntry[],
): readonly EditableAreaItemLocalizedStringEntry[] {
  return Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
}

export function areaItemLocalizedStringEntriesEqual(
  left: readonly EditableAreaItemLocalizedStringEntry[],
  right: readonly EditableAreaItemLocalizedStringEntry[],
): boolean {
  return left.length === right.length && left.every((entry, index) =>
    entry.languageId === right[index]?.languageId && entry.text === right[index]?.text);
}

export function readEditableAreaItemLocalizedStringEntries(
  value: unknown,
  maxDefaultBytes: number,
): readonly EditableAreaItemLocalizedStringEntry[] | undefined {
  if (
    !Array.isArray(value) ||
    value.length > MAX_AREA_ITEM_LOCALIZED_STRING_ENTRIES ||
    !Number.isSafeInteger(maxDefaultBytes) ||
    maxDefaultBytes < 0
  ) return undefined;
  const identifiers = new Set<number>();
  const entries: EditableAreaItemLocalizedStringEntry[] = [];
  let totalTextBytes = 0;
  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, ["languageId", "text"]) ||
      !isUInt32(candidate.languageId) ||
      identifiers.has(candidate.languageId) ||
      typeof candidate.text !== "string" ||
      candidate.text.length > MAX_AREA_ITEM_LOCALIZED_STRING_ENTRY_BYTES ||
      !/^[\x20-\x7e]*$/u.test(candidate.text) ||
      totalTextBytes + candidate.text.length > MAX_AREA_ITEM_LOCALIZED_STRING_TOTAL_TEXT_BYTES ||
      (candidate.languageId === 0 && candidate.text.length > maxDefaultBytes)
    ) return undefined;
    identifiers.add(candidate.languageId);
    totalTextBytes += candidate.text.length;
    entries.push(Object.freeze({ languageId: candidate.languageId, text: candidate.text }));
  }
  if (entries.length > 0 && !identifiers.has(0)) return undefined;
  return Object.freeze(entries);
}

export function readEditableAreaItemLocalizedStringStorage(
  value: unknown,
  maxDefaultBytes: number,
): EditableAreaItemLocalizedStringStorage | undefined {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["present", "strRef", "entries"]) ||
    value.present !== true ||
    value.strRef !== UINT32_MAX ||
    !Array.isArray(value.entries)
  ) return undefined;
  const decoded: EditableAreaItemLocalizedStringEntry[] = [];
  for (const candidate of value.entries) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, ["languageId", "textBytesBase64"]) ||
      !isUInt32(candidate.languageId) ||
      typeof candidate.textBytesBase64 !== "string"
    ) return undefined;
    const bytes = Buffer.from(candidate.textBytesBase64, "base64");
    if (
      bytes.toString("base64") !== candidate.textBytesBase64 ||
      bytes.some((byte) => byte < 0x20 || byte > 0x7e)
    ) return undefined;
    decoded.push({ languageId: candidate.languageId, text: bytes.toString("ascii") });
  }
  const entries = readEditableAreaItemLocalizedStringEntries(decoded, maxDefaultBytes);
  if (!entries) return undefined;
  return Object.freeze({
    value: entries.find((entry) => entry.languageId === 0)?.text ?? "",
    profile: areaItemLocalizedStringProfileForEntries(entries),
    entries,
  });
}

function entryIdentifiersFormAdmittedTarget(
  source: readonly EditableAreaItemLocalizedStringEntry[],
  target: readonly EditableAreaItemLocalizedStringEntry[],
): boolean {
  const sourceIdentifiers = new Set(source.map((entry) => entry.languageId));
  return target.every((entry) => sourceIdentifiers.has(entry.languageId) || (
    isAddableAreaNameStorageEntryIdentifier(entry.languageId) && entry.text.length > 0
  ));
}

function isAreaItemLocalizedStringStorageProfile(
  value: unknown,
): value is AreaItemLocalizedStringStorageProfile {
  return value === "empty_inline_ascii" ||
    value === "simple_inline_ascii" ||
    value === "multi_entry_inline_ascii";
}

export function readExistingAreaItemLocalizedStringMutations(
  value: unknown,
): readonly ExistingAreaItemLocalizedStringMutation[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const result: ExistingAreaItemLocalizedStringMutation[] = [];
  let lastFieldIndex = -1;
  for (const candidate of value) {
    if (!isRecord(candidate)) return null;
    const fieldIndex = AREA_ITEM_LOCALIZED_STRING_MUTATION_FIELDS.findIndex(
      (mapping) => mapping.field === candidate.field,
    );
    const mapping = AREA_ITEM_LOCALIZED_STRING_MUTATION_FIELDS[fieldIndex];
    if (!mapping || fieldIndex <= lastFieldIndex) return null;
    const hasExpectedProfile = Object.prototype.hasOwnProperty.call(candidate, "expectedProfile");
    const hasExpectedEntries = Object.prototype.hasOwnProperty.call(candidate, "expectedEntries");
    const hasValueEntries = Object.prototype.hasOwnProperty.call(candidate, "valueEntries");
    const hasEntryContract = hasExpectedProfile || hasExpectedEntries || hasValueEntries;
    if (!hasExactKeys(candidate, hasEntryContract
      ? ["field", "expectedValue", "value", "expectedProfile", "expectedEntries", "valueEntries"]
      : ["field", "expectedValue", "value"])) return null;
    if (
      !isAreaItemInlineAsciiText(candidate.expectedValue, mapping.maxBytes) ||
      !isAreaItemInlineAsciiText(candidate.value, mapping.maxBytes)
    ) return null;
    if (!hasEntryContract) {
      const legacy = readExistingAreaInlineAsciiLocalizedStringMutations([candidate], [mapping]);
      if (!legacy) return null;
      result.push(Object.freeze({ ...legacy[0]! }));
      lastFieldIndex = fieldIndex;
      continue;
    }
    if (!isAreaItemLocalizedStringStorageProfile(candidate.expectedProfile)) return null;
    const expectedEntries = readEditableAreaItemLocalizedStringEntries(
      candidate.expectedEntries,
      mapping.maxBytes,
    );
    const valueEntries = readEditableAreaItemLocalizedStringEntries(
      candidate.valueEntries,
      mapping.maxBytes,
    );
    if (
      !expectedEntries ||
      !valueEntries ||
      areaItemLocalizedStringProfileForEntries(expectedEntries) !== candidate.expectedProfile ||
      (expectedEntries.find((entry) => entry.languageId === 0)?.text ?? "")
        !== candidate.expectedValue ||
      (valueEntries.find((entry) => entry.languageId === 0)?.text ?? "") !== candidate.value ||
      !entryIdentifiersFormAdmittedTarget(expectedEntries, valueEntries) ||
      areaItemLocalizedStringEntriesEqual(expectedEntries, valueEntries)
    ) return null;
    result.push(Object.freeze({
      field: mapping.field,
      expectedValue: candidate.expectedValue,
      value: candidate.value,
      expectedProfile: candidate.expectedProfile,
      expectedEntries: cloneAreaItemLocalizedStringEntries(expectedEntries),
      valueEntries: cloneAreaItemLocalizedStringEntries(valueEntries),
    }));
    lastFieldIndex = fieldIndex;
  }
  return Object.freeze(result);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) =>
    Object.prototype.hasOwnProperty.call(value, key));
}

function isUInt32(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= UINT32_MAX;
}
