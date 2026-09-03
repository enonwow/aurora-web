import type { SceneObjectSourceMetadata } from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

export type CreatureInterruptableValue = 0 | 1;

export type CreatureInterruptableStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: CreatureInterruptableValue }>;

export function isCreatureInterruptableValue(
  value: unknown,
): value is CreatureInterruptableValue {
  return value === 0 || value === 1;
}

export function readCreatureInterruptableStorage(
  input: unknown,
): CreatureInterruptableStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactRecordKeys(input, ["present", "value"]) &&
    input.present === true &&
    isCreatureInterruptableValue(input.value)
  ) {
    return Object.freeze({ present: true, value: input.value });
  }
  return null;
}

export function creatureInterruptableToNoInterrupt(
  value: unknown,
): boolean | undefined {
  return isCreatureInterruptableValue(value) ? value === 0 : undefined;
}

export function canEditExistingCreatureInterruptable(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const interruptable = readCreatureInterruptableStorage(source?.creatureInterruptable);
  return source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    interruptable?.present === true;
}
