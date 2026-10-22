import type {
  SceneObjectCreatureNameLocalizedStrings,
  SceneObjectEditableLocalizedStringEntry,
  SceneObjectInlineAsciiLocalizedStringProfile,
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

export const MAX_CREATURE_LOCALIZED_STRING_ENTRIES = MAX_NATIVE_LOCALIZED_STRING_ENTRIES;
export const MAX_CREATURE_LOCALIZED_STRING_ENTRY_BYTES = MAX_NATIVE_LOCALIZED_STRING_ENTRY_BYTES;
export const MAX_CREATURE_LOCALIZED_STRING_TOTAL_TEXT_BYTES =
  MAX_NATIVE_LOCALIZED_STRING_TOTAL_TEXT_BYTES;
export const MAX_CREATURE_FIRST_NAME_ASCII_BYTES = 256;
export const MAX_CREATURE_LAST_NAME_ASCII_BYTES = 256;
export const MAX_CREATURE_DESCRIPTION_ASCII_BYTES = 4096;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readCreatureNameLocalizedStrings(
  value: unknown,
): SceneObjectCreatureNameLocalizedStrings | undefined {
  if (!isRecord(value)) return undefined;
  const keys = Object.keys(value);
  if (
    (keys.length !== 2 && keys.length !== 3) ||
    !keys.includes("firstName") ||
    !keys.includes("lastName") ||
    keys.some((key) => !["firstName", "lastName", "description"].includes(key))
  ) return undefined;
  const firstName = readNativeLocalizedStringStorage(value.firstName);
  const lastName = readNativeLocalizedStringStorage(value.lastName);
  const description = Object.prototype.hasOwnProperty.call(value, "description")
    ? readNativeLocalizedStringStorage(value.description)
    : undefined;
  if (!firstName || !lastName || (keys.includes("description") && !description)) return undefined;
  return {
    firstName,
    lastName,
    ...(description ? { description } : {}),
  };
}

export const isCreatureNameInlineAsciiText = isNativeInlineAsciiText;
export const readCreatureNameInlineAsciiStorage = readNativeInlineAsciiStorage;

export interface EditableCreatureLocalizedStringStorage {
  readonly value: string;
  readonly profile: SceneObjectInlineAsciiLocalizedStringProfile;
  readonly entries: readonly SceneObjectEditableLocalizedStringEntry[];
}

export function creatureLocalizedStringProfileForEntries(
  entries: readonly SceneObjectEditableLocalizedStringEntry[],
): SceneObjectInlineAsciiLocalizedStringProfile {
  return entries.length === 0
    ? "empty_inline_ascii"
    : entries.length === 1
      ? "simple_inline_ascii"
      : "multi_entry_inline_ascii";
}

export function cloneEditableCreatureLocalizedStringEntries(
  entries: readonly SceneObjectEditableLocalizedStringEntry[],
): readonly SceneObjectEditableLocalizedStringEntry[] {
  return Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
}

export function creatureLocalizedStringEntriesEqual(
  left: readonly SceneObjectEditableLocalizedStringEntry[],
  right: readonly SceneObjectEditableLocalizedStringEntry[],
): boolean {
  return left.length === right.length && left.every((entry, index) =>
    entry.languageId === right[index]?.languageId && entry.text === right[index]?.text);
}

export function readEditableCreatureLocalizedStringEntries(
  value: unknown,
  maxDefaultBytes: number,
): readonly SceneObjectEditableLocalizedStringEntry[] | undefined {
  if (
    !Array.isArray(value) ||
    value.length > MAX_CREATURE_LOCALIZED_STRING_ENTRIES ||
    !Number.isSafeInteger(maxDefaultBytes) ||
    maxDefaultBytes < 0
  ) return undefined;
  const identifiers = new Set<number>();
  const entries: SceneObjectEditableLocalizedStringEntry[] = [];
  let totalTextBytes = 0;
  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      Object.keys(candidate).length !== 2 ||
      !Object.prototype.hasOwnProperty.call(candidate, "languageId") ||
      !Object.prototype.hasOwnProperty.call(candidate, "text") ||
      !isUInt32(candidate.languageId) ||
      identifiers.has(candidate.languageId) ||
      typeof candidate.text !== "string" ||
      candidate.text.length > MAX_CREATURE_LOCALIZED_STRING_ENTRY_BYTES ||
      !/^[\x20-\x7e]*$/u.test(candidate.text) ||
      totalTextBytes + candidate.text.length > MAX_CREATURE_LOCALIZED_STRING_TOTAL_TEXT_BYTES ||
      (candidate.languageId === 0 && candidate.text.length > maxDefaultBytes)
    ) return undefined;
    identifiers.add(candidate.languageId);
    totalTextBytes += candidate.text.length;
    entries.push(Object.freeze({ languageId: candidate.languageId, text: candidate.text }));
  }
  if (entries.length > 0 && !identifiers.has(0)) return undefined;
  return Object.freeze(entries);
}

export function readEditableCreatureLocalizedStringStorage(
  value: unknown,
  maxDefaultBytes: number,
): EditableCreatureLocalizedStringStorage | undefined {
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
  const entries = readEditableCreatureLocalizedStringEntries(decoded, maxDefaultBytes);
  if (!entries) return undefined;
  return Object.freeze({
    value: entries.find((entry) => entry.languageId === 0)?.text ?? "",
    profile: creatureLocalizedStringProfileForEntries(entries),
    entries,
  });
}

export function cloneCreatureNameLocalizedStrings(
  value: SceneObjectCreatureNameLocalizedStrings,
): SceneObjectCreatureNameLocalizedStrings {
  return {
    firstName: cloneNativeLocalizedStringStorage(value.firstName),
    lastName: cloneNativeLocalizedStringStorage(value.lastName),
    ...(value.description
      ? { description: cloneNativeLocalizedStringStorage(value.description) }
      : {}),
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
