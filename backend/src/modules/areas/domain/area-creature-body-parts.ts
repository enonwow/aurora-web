export const AREA_CREATURE_BODY_PART_FIELDS = Object.freeze([
  Object.freeze({ key: "rightFoot", legacyLabel: "ArmorPart_RFoot", wideLabel: "xArmorPart_RFoot" }),
  Object.freeze({ key: "leftFoot", legacyLabel: "BodyPart_LFoot", wideLabel: "xBodyPart_LFoot" }),
  Object.freeze({ key: "rightShin", legacyLabel: "BodyPart_RShin", wideLabel: "xBodyPart_RShin" }),
  Object.freeze({ key: "leftShin", legacyLabel: "BodyPart_LShin", wideLabel: "xBodyPart_LShin" }),
  Object.freeze({ key: "leftThigh", legacyLabel: "BodyPart_LThigh", wideLabel: "xBodyPart_LThigh" }),
  Object.freeze({ key: "rightThigh", legacyLabel: "BodyPart_RThigh", wideLabel: "xBodyPart_RThigh" }),
  Object.freeze({ key: "pelvis", legacyLabel: "BodyPart_Pelvis", wideLabel: "xBodyPart_Pelvis" }),
  Object.freeze({ key: "torso", legacyLabel: "BodyPart_Torso", wideLabel: "xBodyPart_Torso" }),
  Object.freeze({ key: "belt", legacyLabel: "BodyPart_Belt", wideLabel: "xBodyPart_Belt" }),
  Object.freeze({ key: "neck", legacyLabel: "BodyPart_Neck", wideLabel: "xBodyPart_Neck" }),
  Object.freeze({ key: "rightForearm", legacyLabel: "BodyPart_RFArm", wideLabel: "xBodyPart_RFArm" }),
  Object.freeze({ key: "leftForearm", legacyLabel: "BodyPart_LFArm", wideLabel: "xBodyPart_LFArm" }),
  Object.freeze({ key: "rightBicep", legacyLabel: "BodyPart_RBicep", wideLabel: "xBodyPart_RBicep" }),
  Object.freeze({ key: "leftBicep", legacyLabel: "BodyPart_LBicep", wideLabel: "xBodyPart_LBicep" }),
  Object.freeze({ key: "rightShoulder", legacyLabel: "BodyPart_RShoul", wideLabel: "xBodyPart_RShoul" }),
  Object.freeze({ key: "leftShoulder", legacyLabel: "BodyPart_LShoul", wideLabel: "xBodyPart_LShoul" }),
  Object.freeze({ key: "rightHand", legacyLabel: "BodyPart_RHand", wideLabel: "xBodyPart_RHand" }),
  Object.freeze({ key: "leftHand", legacyLabel: "BodyPart_LHand", wideLabel: "xBodyPart_LHand" }),
  Object.freeze({ key: "head", legacyLabel: "Appearance_Head", wideLabel: "xAppearance_Head" }),
] as const);

export type AreaCreatureBodyPartKey =
  typeof AREA_CREATURE_BODY_PART_FIELDS[number]["key"];

export type AreaCreatureBodyPartByteStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "byte"; value: number }>;

export type AreaCreatureBodyPartWordStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "word"; value: number }>;

export type AreaCreatureBodyPartStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      value: number;
      legacyByte: AreaCreatureBodyPartByteStorage;
      wideWord: AreaCreatureBodyPartWordStorage;
    }>;

export type AreaCreatureBodyPartsStorage = Readonly<
  Record<AreaCreatureBodyPartKey, AreaCreatureBodyPartStorage>
>;

export interface ExistingAreaCreatureBodyPartMutation {
  readonly expectedValue: number;
  readonly value: number;
}

export type ExistingAreaCreatureBodyPartMutations = Readonly<
  Partial<Record<AreaCreatureBodyPartKey, ExistingAreaCreatureBodyPartMutation>>
>;

const BODY_PART_KEYS = Object.freeze(
  AREA_CREATURE_BODY_PART_FIELDS.map((field) => field.key),
);

export function isAreaCreatureBodyPartWord(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 0xffff;
}

export function readAreaCreatureBodyPartStorage(
  input: unknown,
): AreaCreatureBodyPartStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    !hasExactKeys(input, ["present", "value", "legacyByte", "wideWord"]) ||
    input.present !== true ||
    !isAreaCreatureBodyPartWord(input.value)
  ) return null;
  const legacyByte = readByteStorage(input.legacyByte);
  const wideWord = readWordStorage(input.wideWord);
  if (!legacyByte || !wideWord || (!legacyByte.present && !wideWord.present)) return null;
  const effectiveValue = wideWord.present
    ? wideWord.value
    : legacyByte.present
      ? legacyByte.value
      : null;
  if (effectiveValue === null) return null;
  if (input.value !== effectiveValue) return null;
  if (
    legacyByte.present && wideWord.present &&
    legacyByte.value !== (wideWord.value <= 0xff ? wideWord.value : 0)
  ) return null;
  return Object.freeze({
    present: true,
    value: effectiveValue,
    legacyByte,
    wideWord,
  });
}

export function readAreaCreatureBodyPartsStorage(
  input: unknown,
): AreaCreatureBodyPartsStorage | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, BODY_PART_KEYS)) return null;
  const result = {} as Record<AreaCreatureBodyPartKey, AreaCreatureBodyPartStorage>;
  for (const key of BODY_PART_KEYS) {
    const member = readAreaCreatureBodyPartStorage(input[key]);
    if (!member) return null;
    result[key] = member;
  }
  return Object.freeze(result);
}

export function maximumAreaCreatureBodyPartTarget(input: unknown): number | null {
  const storage = readAreaCreatureBodyPartStorage(input);
  if (!storage?.present) return null;
  return storage.wideWord.present ? 0xffff : 0xff;
}

export function readExistingAreaCreatureBodyPartMutations(
  input: unknown,
): ExistingAreaCreatureBodyPartMutations | null {
  if (!isPlainRecord(input)) return null;
  const keys = Object.keys(input);
  if (
    keys.length === 0 ||
    keys.some((key) => !BODY_PART_KEYS.includes(key as AreaCreatureBodyPartKey))
  ) return null;
  const result: Partial<Record<AreaCreatureBodyPartKey, ExistingAreaCreatureBodyPartMutation>> = {};
  for (const key of keys as AreaCreatureBodyPartKey[]) {
    const pair = input[key];
    if (
      !isPlainRecord(pair) ||
      !hasExactKeys(pair, ["expectedValue", "value"]) ||
      !isAreaCreatureBodyPartWord(pair.expectedValue) ||
      !isAreaCreatureBodyPartWord(pair.value) ||
      pair.expectedValue === pair.value
    ) return null;
    result[key] = Object.freeze({
      expectedValue: pair.expectedValue,
      value: pair.value,
    });
  }
  return Object.freeze(result);
}

function readByteStorage(input: unknown): AreaCreatureBodyPartByteStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "byte" &&
    Number.isInteger(input.value) &&
    Number(input.value) >= 0 &&
    Number(input.value) <= 0xff
  ) {
    return Object.freeze({ present: true, nativeType: "byte", value: Number(input.value) });
  }
  return null;
}

function readWordStorage(input: unknown): AreaCreatureBodyPartWordStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "word" &&
    isAreaCreatureBodyPartWord(input.value)
  ) {
    return Object.freeze({ present: true, nativeType: "word", value: input.value });
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
