export const MAX_AREA_LOCALIZED_STRING_ENTRIES = 64;
export const MAX_AREA_LOCALIZED_STRING_ENTRY_BYTES = 16_384;
export const MAX_AREA_LOCALIZED_STRING_TOTAL_TEXT_BYTES = 65_536;

export interface AreaLocalizedStringEntry {
  readonly languageId: number;
  readonly textBytesBase64: string;
}

export type AreaLocalizedStringStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      strRef: number;
      entries: readonly AreaLocalizedStringEntry[];
    }>;

const UINT32_MAX = 0xffff_ffff;

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

function decodeCanonicalBase64(value: unknown): Buffer | undefined {
  if (typeof value !== "string") return undefined;
  const bytes = Buffer.from(value, "base64");
  return bytes.toString("base64") === value ? bytes : undefined;
}

export function readAreaLocalizedStringStorage(
  value: unknown,
): AreaLocalizedStringStorage | undefined {
  if (!isRecord(value) || typeof value.present !== "boolean") return undefined;
  if (!value.present) {
    return hasExactKeys(value, ["present"]) ? { present: false } : undefined;
  }
  if (
    !hasExactKeys(value, ["present", "strRef", "entries"]) ||
    !isUInt32(value.strRef) ||
    !Array.isArray(value.entries) ||
    value.entries.length > MAX_AREA_LOCALIZED_STRING_ENTRIES
  ) {
    return undefined;
  }
  const entries: AreaLocalizedStringEntry[] = [];
  let totalTextBytes = 0;
  for (const candidate of value.entries) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, ["languageId", "textBytesBase64"]) ||
      !isUInt32(candidate.languageId)
    ) {
      return undefined;
    }
    const bytes = decodeCanonicalBase64(candidate.textBytesBase64);
    if (
      !bytes ||
      bytes.length > MAX_AREA_LOCALIZED_STRING_ENTRY_BYTES ||
      totalTextBytes + bytes.length > MAX_AREA_LOCALIZED_STRING_TOTAL_TEXT_BYTES
    ) {
      return undefined;
    }
    entries.push({
      languageId: candidate.languageId,
      textBytesBase64: candidate.textBytesBase64 as string,
    });
    totalTextBytes += bytes.length;
  }
  return { present: true, strRef: value.strRef, entries };
}

export function cloneAreaLocalizedStringStorage(
  value: AreaLocalizedStringStorage,
): AreaLocalizedStringStorage {
  return value.present
    ? {
        present: true,
        strRef: value.strRef,
        entries: value.entries.map((entry) => ({ ...entry })),
      }
    : { present: false };
}
