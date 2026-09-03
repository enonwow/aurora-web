export const AREA_CREATURE_ALIGNMENT_OPTIONS = Object.freeze([
  Object.freeze({ label: "Lawful Good", goodEvil: 100, lawfulChaotic: 100 }),
  Object.freeze({ label: "Neutral Good", goodEvil: 100, lawfulChaotic: 50 }),
  Object.freeze({ label: "Chaotic Good", goodEvil: 100, lawfulChaotic: 0 }),
  Object.freeze({ label: "Lawful Neutral", goodEvil: 50, lawfulChaotic: 100 }),
  Object.freeze({ label: "True Neutral", goodEvil: 50, lawfulChaotic: 50 }),
  Object.freeze({ label: "Chaotic Neutral", goodEvil: 50, lawfulChaotic: 0 }),
  Object.freeze({ label: "Lawful Evil", goodEvil: 0, lawfulChaotic: 100 }),
  Object.freeze({ label: "Neutral Evil", goodEvil: 0, lawfulChaotic: 50 }),
  Object.freeze({ label: "Chaotic Evil", goodEvil: 0, lawfulChaotic: 0 }),
] as const);

export type AreaCreatureAlignmentLabel =
  typeof AREA_CREATURE_ALIGNMENT_OPTIONS[number]["label"];
export type AreaCreatureAlignmentAxisValue = 0 | 50 | 100;

export type AreaCreatureAlignmentByteStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "byte";
      value: AreaCreatureAlignmentAxisValue;
    }>;

export interface AreaCreatureAlignmentStorage {
  readonly goodEvil: AreaCreatureAlignmentByteStorage;
  readonly lawfulChaotic: AreaCreatureAlignmentByteStorage;
}

export interface ExistingAreaCreatureAlignmentMutation {
  readonly expectedGoodEvil: AreaCreatureAlignmentAxisValue;
  readonly expectedLawfulChaotic: AreaCreatureAlignmentAxisValue;
  readonly goodEvil: AreaCreatureAlignmentAxisValue;
  readonly lawfulChaotic: AreaCreatureAlignmentAxisValue;
}

export function isAreaCreatureAlignmentAxisValue(
  value: unknown,
): value is AreaCreatureAlignmentAxisValue {
  return value === 0 || value === 50 || value === 100;
}

export function resolveAreaCreatureAlignmentLabel(
  goodEvil: unknown,
  lawfulChaotic: unknown,
): AreaCreatureAlignmentLabel | null {
  if (
    !isAreaCreatureAlignmentAxisValue(goodEvil) ||
    !isAreaCreatureAlignmentAxisValue(lawfulChaotic)
  ) return null;
  return AREA_CREATURE_ALIGNMENT_OPTIONS.find(
    (option) => option.goodEvil === goodEvil && option.lawfulChaotic === lawfulChaotic,
  )?.label ?? null;
}

export function resolveAreaCreatureAlignmentPair(
  label: unknown,
): Readonly<{
  goodEvil: AreaCreatureAlignmentAxisValue;
  lawfulChaotic: AreaCreatureAlignmentAxisValue;
}> | null {
  const option = AREA_CREATURE_ALIGNMENT_OPTIONS.find(
    (candidate) => candidate.label === label,
  );
  return option
    ? Object.freeze({ goodEvil: option.goodEvil, lawfulChaotic: option.lawfulChaotic })
    : null;
}

export function readAreaCreatureAlignmentStorage(
  input: unknown,
): Readonly<AreaCreatureAlignmentStorage> | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, ["goodEvil", "lawfulChaotic"])) {
    return null;
  }
  const goodEvil = readAlignmentByteStorage(input.goodEvil);
  const lawfulChaotic = readAlignmentByteStorage(input.lawfulChaotic);
  return goodEvil && lawfulChaotic
    ? Object.freeze({ goodEvil, lawfulChaotic })
    : null;
}

export function readExistingAreaCreatureAlignmentMutation(
  input: unknown,
): Readonly<ExistingAreaCreatureAlignmentMutation> | null {
  if (
    !isPlainRecord(input) ||
    !hasExactKeys(input, [
      "expectedGoodEvil",
      "expectedLawfulChaotic",
      "goodEvil",
      "lawfulChaotic",
    ]) ||
    !isAreaCreatureAlignmentAxisValue(input.expectedGoodEvil) ||
    !isAreaCreatureAlignmentAxisValue(input.expectedLawfulChaotic) ||
    !isAreaCreatureAlignmentAxisValue(input.goodEvil) ||
    !isAreaCreatureAlignmentAxisValue(input.lawfulChaotic) ||
    (
      input.expectedGoodEvil === input.goodEvil &&
      input.expectedLawfulChaotic === input.lawfulChaotic
    )
  ) return null;
  return Object.freeze({
    expectedGoodEvil: input.expectedGoodEvil,
    expectedLawfulChaotic: input.expectedLawfulChaotic,
    goodEvil: input.goodEvil,
    lawfulChaotic: input.lawfulChaotic,
  });
}

function readAlignmentByteStorage(input: unknown): AreaCreatureAlignmentByteStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "byte" &&
    isAreaCreatureAlignmentAxisValue(input.value)
  ) {
    return Object.freeze({ present: true, nativeType: "byte", value: input.value });
  }
  return null;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}
