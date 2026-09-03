import type { AreaLocalizedStringStorage } from "./area-localized-string-storage";

export interface AreaInlineAsciiLocalizedStringFieldMapping<
  Field extends string,
  SourceKey extends string,
  TargetKey extends string,
> {
  readonly field: Field;
  readonly sourceKey: SourceKey;
  readonly targetKey: TargetKey;
  readonly maxBytes: number;
}

export interface AreaInlineAsciiLocalizedStringMutation<Field extends string> {
  readonly field: Field;
  readonly expectedValue: string;
  readonly value: string;
}

const UINT32_MAX = 0xffff_ffff;
const MUTATION_KEYS = Object.freeze(["field", "expectedValue", "value"] as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(
    value,
    key,
  ));
}

export function isAreaInlineAsciiText(value: unknown, maxBytes: number): value is string {
  return typeof value === "string" &&
    Number.isSafeInteger(maxBytes) &&
    maxBytes >= 0 &&
    value.length <= maxBytes &&
    /^[\x20-\x7e]*$/u.test(value);
}

function decodeCanonicalBase64(value: unknown): Buffer | undefined {
  if (typeof value !== "string") return undefined;
  const bytes = Buffer.from(value, "base64");
  return bytes.toString("base64") === value ? bytes : undefined;
}

export function readAreaInlineAsciiStorage(
  value: unknown,
  maxBytes: number,
): string | undefined {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["present", "strRef", "entries"]) ||
    value.present !== true ||
    value.strRef !== UINT32_MAX ||
    !Array.isArray(value.entries) ||
    value.entries.length > 1 ||
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 0
  ) {
    return undefined;
  }
  if (value.entries.length === 0) return "";
  const entry = value.entries[0];
  if (
    !isRecord(entry) ||
    !hasExactKeys(entry, ["languageId", "textBytesBase64"]) ||
    entry.languageId !== 0
  ) {
    return undefined;
  }
  const bytes = decodeCanonicalBase64(entry.textBytesBase64);
  if (!bytes || bytes.length === 0 || bytes.length > maxBytes) return undefined;
  for (const byte of bytes) {
    if (byte < 0x20 || byte > 0x7e) return undefined;
  }
  return bytes.toString("ascii");
}

export function buildAreaInlineAsciiStorage(
  value: unknown,
  maxBytes: number,
): AreaLocalizedStringStorage | undefined {
  if (!isAreaInlineAsciiText(value, maxBytes)) return undefined;
  return Object.freeze({
    present: true as const,
    strRef: UINT32_MAX,
    entries: Object.freeze(value.length === 0
      ? []
      : [Object.freeze({
          languageId: 0,
          textBytesBase64: Buffer.from(value, "ascii").toString("base64"),
        })]),
  });
}

export function readExistingAreaInlineAsciiLocalizedStringMutations<
  Field extends string,
  SourceKey extends string,
  TargetKey extends string,
>(
  value: unknown,
  mappings: readonly AreaInlineAsciiLocalizedStringFieldMapping<Field, SourceKey, TargetKey>[],
): readonly AreaInlineAsciiLocalizedStringMutation<Field>[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const result: AreaInlineAsciiLocalizedStringMutation<Field>[] = [];
  let lastFieldIndex = -1;
  for (const candidate of value) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, MUTATION_KEYS)) return null;
    const fieldIndex = mappings.findIndex((mapping) => mapping.field === candidate.field);
    if (fieldIndex <= lastFieldIndex) return null;
    const mapping = mappings[fieldIndex];
    if (
      !mapping ||
      !isAreaInlineAsciiText(candidate.expectedValue, mapping.maxBytes) ||
      !isAreaInlineAsciiText(candidate.value, mapping.maxBytes) ||
      candidate.expectedValue === candidate.value
    ) {
      return null;
    }
    result.push(Object.freeze({
      field: mapping.field,
      expectedValue: candidate.expectedValue,
      value: candidate.value,
    }));
    lastFieldIndex = fieldIndex;
  }
  return Object.freeze(result);
}
