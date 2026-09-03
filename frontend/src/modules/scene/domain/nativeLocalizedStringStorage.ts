import type { SceneObjectNativeLocalizedStringStorage } from "../contracts";

export const MAX_NATIVE_LOCALIZED_STRING_ENTRIES = 64;
export const MAX_NATIVE_LOCALIZED_STRING_ENTRY_BYTES = 16_384;
export const MAX_NATIVE_LOCALIZED_STRING_TOTAL_TEXT_BYTES = 65_536;

const UINT32_MAX = 0xffff_ffff;
const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isUInt32(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= UINT32_MAX;
}

function canonicalBase64DecodedLength(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) {
    return undefined;
  }
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  if (padding === 2) {
    const sextet = BASE64_ALPHABET.indexOf(value[value.length - 3] ?? "");
    if ((sextet & 0x0f) !== 0) return undefined;
  } else if (padding === 1) {
    const sextet = BASE64_ALPHABET.indexOf(value[value.length - 2] ?? "");
    if ((sextet & 0x03) !== 0) return undefined;
  }
  return (value.length / 4) * 3 - padding;
}

function decodeCanonicalBase64(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function readNativeLocalizedStringStorage(
  value: unknown,
): SceneObjectNativeLocalizedStringStorage | undefined {
  if (!isRecord(value) || typeof value.present !== "boolean") return undefined;
  if (!value.present) {
    return hasExactKeys(value, ["present"]) ? { present: false } : undefined;
  }
  if (!hasExactKeys(value, ["present", "strRef", "entries"]) || !isUInt32(value.strRef)) {
    return undefined;
  }
  if (!Array.isArray(value.entries) || value.entries.length > MAX_NATIVE_LOCALIZED_STRING_ENTRIES) {
    return undefined;
  }
  const entries: Array<{ languageId: number; textBytesBase64: string }> = [];
  let totalTextBytes = 0;
  for (const candidate of value.entries) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, ["languageId", "textBytesBase64"])) {
      return undefined;
    }
    if (!isUInt32(candidate.languageId)) return undefined;
    const textByteLength = canonicalBase64DecodedLength(candidate.textBytesBase64);
    if (
      textByteLength === undefined ||
      textByteLength > MAX_NATIVE_LOCALIZED_STRING_ENTRY_BYTES ||
      totalTextBytes + textByteLength > MAX_NATIVE_LOCALIZED_STRING_TOTAL_TEXT_BYTES
    ) {
      return undefined;
    }
    entries.push({
      languageId: candidate.languageId,
      textBytesBase64: candidate.textBytesBase64 as string,
    });
    totalTextBytes += textByteLength;
  }
  return { present: true, strRef: value.strRef, entries };
}

export function isNativeInlineAsciiText(value: unknown, maxBytes: number): value is string {
  return typeof value === "string" &&
    Number.isSafeInteger(maxBytes) &&
    maxBytes >= 0 &&
    value.length <= maxBytes &&
    /^[\x20-\x7e]*$/u.test(value);
}

export function readNativeInlineAsciiStorage(
  value: unknown,
  maxBytes: number,
): string | undefined {
  const storage = readNativeLocalizedStringStorage(value);
  if (
    !storage?.present ||
    storage.strRef !== UINT32_MAX ||
    storage.entries.length > 1 ||
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 0
  ) {
    return undefined;
  }
  if (storage.entries.length === 0) return "";
  const entry = storage.entries[0];
  if (!entry || entry.languageId !== 0) return undefined;
  const bytes = decodeCanonicalBase64(entry.textBytesBase64);
  if (bytes.length === 0 || bytes.length > maxBytes) return undefined;
  let text = "";
  for (const byte of bytes) {
    if (byte < 0x20 || byte > 0x7e) return undefined;
    text += String.fromCharCode(byte);
  }
  return text;
}

export function cloneNativeLocalizedStringStorage(
  storage: SceneObjectNativeLocalizedStringStorage,
): SceneObjectNativeLocalizedStringStorage {
  return storage.present
    ? {
        present: true,
        strRef: storage.strRef,
        entries: storage.entries.map((entry) => ({ ...entry })),
      }
    : { present: false };
}
