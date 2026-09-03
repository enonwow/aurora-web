import type {
  SceneObjectCreatureBodyPartByteStorage,
  SceneObjectCreatureBodyPartStorage,
  SceneObjectCreatureBodyPartsStorage,
  SceneObjectCreatureBodyPartWordStorage,
} from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

export const CREATURE_BODY_PART_FIELDS = Object.freeze([
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

export type CreatureBodyPartKey = typeof CREATURE_BODY_PART_FIELDS[number]["key"];

const BODY_PART_KEYS = Object.freeze(CREATURE_BODY_PART_FIELDS.map((field) => field.key));

export function readCreatureBodyPartStorage(
  input: unknown,
): SceneObjectCreatureBodyPartStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    !hasExactRecordKeys(input, ["present", "value", "legacyByte", "wideWord"]) ||
    input.present !== true ||
    !isWord(input.value)
  ) return null;
  const legacyByte = readByteStorage(input.legacyByte);
  const wideWord = readWordStorage(input.wideWord);
  if (!legacyByte || !wideWord || (!legacyByte.present && !wideWord.present)) return null;
  const effectiveValue = wideWord.present
    ? wideWord.value
    : legacyByte.present
      ? legacyByte.value
      : null;
  if (effectiveValue === null || input.value !== effectiveValue) return null;
  if (
    legacyByte.present && wideWord.present &&
    legacyByte.value !== (wideWord.value <= 0xff ? wideWord.value : 0)
  ) return null;
  return Object.freeze({ present: true, value: effectiveValue, legacyByte, wideWord });
}

export function readCreatureBodyPartsStorage(
  input: unknown,
): SceneObjectCreatureBodyPartsStorage | null {
  if (!isPlainRecord(input) || !hasExactRecordKeys(input, BODY_PART_KEYS)) return null;
  const result = {} as Record<CreatureBodyPartKey, SceneObjectCreatureBodyPartStorage>;
  for (const key of BODY_PART_KEYS) {
    const member = readCreatureBodyPartStorage(input[key]);
    if (!member) return null;
    result[key] = member;
  }
  return Object.freeze(result);
}

export function maximumCreatureBodyPartTarget(input: unknown): number | null {
  const storage = readCreatureBodyPartStorage(input);
  if (!storage?.present) return null;
  return storage.wideWord.present ? 0xffff : 0xff;
}

function readByteStorage(input: unknown): SceneObjectCreatureBodyPartByteStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactRecordKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "byte" &&
    Number.isInteger(input.value) && Number(input.value) >= 0 && Number(input.value) <= 0xff
  ) return Object.freeze({ present: true, nativeType: "byte", value: Number(input.value) });
  return null;
}

function readWordStorage(input: unknown): SceneObjectCreatureBodyPartWordStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactRecordKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true && input.nativeType === "word" && isWord(input.value)
  ) return Object.freeze({ present: true, nativeType: "word", value: Number(input.value) });
  return null;
}

function isWord(value: unknown): boolean {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 0xffff;
}
