import type {
  SceneObjectEditableLocalizedStringEntry,
  SceneObjectInlineAsciiLocalizedStringProfile,
  SceneObjectItemLocalizedStrings,
} from "../contracts";
import {
  MAX_NATIVE_LOCALIZED_STRING_ENTRIES,
  MAX_NATIVE_LOCALIZED_STRING_ENTRY_BYTES,
  MAX_NATIVE_LOCALIZED_STRING_TOTAL_TEXT_BYTES,
  cloneNativeLocalizedStringStorage,
  isNativeInlineAsciiText,
  readNativeInlineAsciiStorage,
  readNativeLocalizedStringStorage,
} from "./nativeLocalizedStringStorage";

export const MAX_ITEM_LOCALIZED_STRING_ENTRIES = MAX_NATIVE_LOCALIZED_STRING_ENTRIES;
export const MAX_ITEM_LOCALIZED_STRING_ENTRY_BYTES = MAX_NATIVE_LOCALIZED_STRING_ENTRY_BYTES;
export const MAX_ITEM_LOCALIZED_STRING_TOTAL_TEXT_BYTES =
  MAX_NATIVE_LOCALIZED_STRING_TOTAL_TEXT_BYTES;
export const MAX_ITEM_LOCALIZED_NAME_ASCII_BYTES = 256;
export const MAX_ITEM_DESCRIPTION_ASCII_BYTES = 4_096;
export const MAX_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES = 4_096;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

export function readItemLocalizedStrings(
  value: unknown,
): SceneObjectItemLocalizedStrings | undefined {
  if (!isRecord(value) || !hasExactKeys(value, [
    "localizedName",
    "description",
    "identifiedDescription",
  ])) {
    return undefined;
  }
  const localizedName = readNativeLocalizedStringStorage(value.localizedName);
  const description = readNativeLocalizedStringStorage(value.description);
  const identifiedDescription = readNativeLocalizedStringStorage(value.identifiedDescription);
  return localizedName && description && identifiedDescription
    ? { localizedName, description, identifiedDescription }
    : undefined;
}

export const isItemLocalizedStringInlineAsciiText = isNativeInlineAsciiText;
export const readItemLocalizedStringInlineAsciiStorage = readNativeInlineAsciiStorage;

export interface EditableItemLocalizedStringStorage {
  readonly value: string;
  readonly profile: SceneObjectInlineAsciiLocalizedStringProfile;
  readonly entries: readonly SceneObjectEditableLocalizedStringEntry[];
}

export function itemLocalizedStringProfileForEntries(
  entries: readonly SceneObjectEditableLocalizedStringEntry[],
): SceneObjectInlineAsciiLocalizedStringProfile {
  return entries.length === 0
    ? "empty_inline_ascii"
    : entries.length === 1
      ? "simple_inline_ascii"
      : "multi_entry_inline_ascii";
}

export function cloneEditableItemLocalizedStringEntries(
  entries: readonly SceneObjectEditableLocalizedStringEntry[],
): readonly SceneObjectEditableLocalizedStringEntry[] {
  return Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
}

export function itemLocalizedStringEntriesEqual(
  left: readonly SceneObjectEditableLocalizedStringEntry[],
  right: readonly SceneObjectEditableLocalizedStringEntry[],
): boolean {
  return left.length === right.length && left.every((entry, index) =>
    entry.languageId === right[index]?.languageId && entry.text === right[index]?.text);
}

export function readEditableItemLocalizedStringEntries(
  value: unknown,
  maxDefaultBytes: number,
): readonly SceneObjectEditableLocalizedStringEntry[] | undefined {
  if (
    !Array.isArray(value) ||
    value.length > MAX_ITEM_LOCALIZED_STRING_ENTRIES ||
    !Number.isSafeInteger(maxDefaultBytes) ||
    maxDefaultBytes < 0
  ) return undefined;
  const identifiers = new Set<number>();
  const entries: SceneObjectEditableLocalizedStringEntry[] = [];
  let totalTextBytes = 0;
  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, ["languageId", "text"]) ||
      !isUInt32(candidate.languageId) ||
      identifiers.has(candidate.languageId) ||
      typeof candidate.text !== "string" ||
      candidate.text.length > MAX_ITEM_LOCALIZED_STRING_ENTRY_BYTES ||
      !/^[\x20-\x7e]*$/u.test(candidate.text) ||
      totalTextBytes + candidate.text.length > MAX_ITEM_LOCALIZED_STRING_TOTAL_TEXT_BYTES ||
      (candidate.languageId === 0 && candidate.text.length > maxDefaultBytes)
    ) return undefined;
    identifiers.add(candidate.languageId);
    totalTextBytes += candidate.text.length;
    entries.push(Object.freeze({ languageId: candidate.languageId, text: candidate.text }));
  }
  if (entries.length > 0 && !identifiers.has(0)) return undefined;
  return Object.freeze(entries);
}

export function readEditableItemLocalizedStringStorage(
  value: unknown,
  maxDefaultBytes: number,
): EditableItemLocalizedStringStorage | undefined {
  const storage = readNativeLocalizedStringStorage(value);
  if (!storage?.present || storage.strRef !== 0xffff_ffff) return undefined;
  const decoded: SceneObjectEditableLocalizedStringEntry[] = [];
  for (const entry of storage.entries) {
    const bytes = decodeBase64(entry.textBytesBase64);
    if (!bytes) return undefined;
    let text = "";
    for (const byte of bytes) {
      if (byte < 0x20 || byte > 0x7e) return undefined;
      text += String.fromCharCode(byte);
    }
    decoded.push({ languageId: entry.languageId, text });
  }
  const entries = readEditableItemLocalizedStringEntries(decoded, maxDefaultBytes);
  if (!entries) return undefined;
  return Object.freeze({
    value: entries.find((entry) => entry.languageId === 0)?.text ?? "",
    profile: itemLocalizedStringProfileForEntries(entries),
    entries,
  });
}

export function cloneItemLocalizedStrings(
  value: SceneObjectItemLocalizedStrings,
): SceneObjectItemLocalizedStrings {
  return {
    localizedName: cloneNativeLocalizedStringStorage(value.localizedName),
    description: cloneNativeLocalizedStringStorage(value.description),
    identifiedDescription: cloneNativeLocalizedStringStorage(value.identifiedDescription),
  };
}

function isUInt32(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 0xffff_ffff;
}

function decodeBase64(value: string): Uint8Array | undefined {
  try {
    const binary = globalThis.atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return undefined;
  }
}
