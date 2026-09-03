const DWORD_MAX = 0xffff_ffff;
const MAX_EFFECTIVE_PLACEABLES_TWO_DA_ROWS = 1_000_000;
const MUTATION_KEYS = [
  "expectedValue",
  "value",
  "tableSha256",
  "rowCount",
] as const;

export interface ExistingAreaPlaceableAppearanceMutation {
  readonly expectedValue: number;
  readonly value: number;
  readonly tableSha256: string;
  readonly rowCount: number;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactMutationKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  return keys.length === MUTATION_KEYS.length && MUTATION_KEYS.every((key) => keys.includes(key));
}

function isDwordRow(value: unknown, rowCount: number): value is number {
  return Number.isSafeInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= DWORD_MAX &&
    (value as number) < rowCount;
}

export function readExistingAreaPlaceableAppearanceMutation(
  value: unknown,
): ExistingAreaPlaceableAppearanceMutation | null {
  if (!isPlainRecord(value) || !hasExactMutationKeys(value)) return null;
  if (
    typeof value.tableSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !Number.isSafeInteger(value.rowCount) ||
    (value.rowCount as number) < 1 ||
    (value.rowCount as number) > MAX_EFFECTIVE_PLACEABLES_TWO_DA_ROWS ||
    !isDwordRow(value.expectedValue, value.rowCount as number) ||
    !isDwordRow(value.value, value.rowCount as number) ||
    value.expectedValue === value.value
  ) {
    return null;
  }
  return Object.freeze({
    expectedValue: value.expectedValue,
    value: value.value,
    tableSha256: value.tableSha256,
    rowCount: value.rowCount as number,
  });
}
