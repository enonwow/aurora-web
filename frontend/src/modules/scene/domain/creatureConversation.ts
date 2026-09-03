import type { SceneObjectSourceMetadata } from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

export const MAX_CREATURE_CONVERSATION_RESREF_BYTES = 16;

export type CreatureConversationStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: string }>;

const SOURCE_RESREF_PATTERN = /^[A-Za-z0-9_]{0,16}$/u;
const TARGET_RESREF_PATTERN = /^[a-z0-9_]{0,16}$/u;

export function isCreatureConversationSourceResRef(value: unknown): value is string {
  return typeof value === "string" && SOURCE_RESREF_PATTERN.test(value);
}

export function isCreatureConversationTargetResRef(value: unknown): value is string {
  return typeof value === "string" && TARGET_RESREF_PATTERN.test(value);
}

export function readCreatureConversationStorage(
  input: unknown,
): CreatureConversationStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactRecordKeys(input, ["present", "value"]) &&
    input.present === true &&
    isCreatureConversationSourceResRef(input.value)
  ) {
    return Object.freeze({ present: true, value: input.value });
  }
  return null;
}

export function canEditExistingCreatureConversation(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  const conversation = readCreatureConversationStorage(source?.creatureConversation);
  return source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    conversation?.present === true;
}
