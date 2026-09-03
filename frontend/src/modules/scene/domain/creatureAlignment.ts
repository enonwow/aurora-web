import type {
  SceneObjectCreatureAlignmentAxisValue,
  SceneObjectCreatureAlignmentByteStorage,
  SceneObjectCreatureAlignmentStorage,
} from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

export const CREATURE_ALIGNMENT_OPTIONS = Object.freeze([
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

export const CREATURE_ALIGNMENT_LABELS = Object.freeze(
  CREATURE_ALIGNMENT_OPTIONS.map((option) => option.label),
);

export type CreatureAlignmentLabel = typeof CREATURE_ALIGNMENT_OPTIONS[number]["label"];

export function isCreatureAlignmentAxisValue(
  value: unknown,
): value is SceneObjectCreatureAlignmentAxisValue {
  return value === 0 || value === 50 || value === 100;
}

export function normalizeCreatureAlignmentLabel(
  value: unknown,
): CreatureAlignmentLabel | null {
  return typeof value === "string" && CREATURE_ALIGNMENT_LABELS.includes(
    value as CreatureAlignmentLabel,
  )
    ? value as CreatureAlignmentLabel
    : null;
}

export function resolveCreatureAlignmentLabel(
  goodEvil: unknown,
  lawfulChaotic: unknown,
): CreatureAlignmentLabel | null {
  if (!isCreatureAlignmentAxisValue(goodEvil) || !isCreatureAlignmentAxisValue(lawfulChaotic)) {
    return null;
  }
  return CREATURE_ALIGNMENT_OPTIONS.find(
    (option) => option.goodEvil === goodEvil && option.lawfulChaotic === lawfulChaotic,
  )?.label ?? null;
}

export function resolveCreatureAlignmentPair(
  label: unknown,
): Readonly<{
  goodEvil: SceneObjectCreatureAlignmentAxisValue;
  lawfulChaotic: SceneObjectCreatureAlignmentAxisValue;
}> | null {
  const normalized = normalizeCreatureAlignmentLabel(label);
  if (!normalized) return null;
  const option = CREATURE_ALIGNMENT_OPTIONS.find((candidate) => candidate.label === normalized)!;
  return Object.freeze({ goodEvil: option.goodEvil, lawfulChaotic: option.lawfulChaotic });
}

export function readCreatureAlignmentStorage(
  input: unknown,
): SceneObjectCreatureAlignmentStorage | null {
  if (!isPlainRecord(input) || !hasExactRecordKeys(input, ["goodEvil", "lawfulChaotic"])) {
    return null;
  }
  const goodEvil = readAlignmentByte(input.goodEvil);
  const lawfulChaotic = readAlignmentByte(input.lawfulChaotic);
  return goodEvil && lawfulChaotic
    ? Object.freeze({ goodEvil, lawfulChaotic })
    : null;
}

function readAlignmentByte(input: unknown): SceneObjectCreatureAlignmentByteStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactRecordKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "byte" &&
    isCreatureAlignmentAxisValue(input.value)
  ) {
    return Object.freeze({ present: true, nativeType: "byte", value: input.value });
  }
  return null;
}
