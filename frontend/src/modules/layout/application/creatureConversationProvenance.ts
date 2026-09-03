import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingCreatureConversation,
  isCreatureConversationTargetResRef,
  MAX_CREATURE_CONVERSATION_RESREF_BYTES,
} from "../../scene/domain/creatureConversation";

export {
  canEditExistingCreatureConversation,
  MAX_CREATURE_CONVERSATION_RESREF_BYTES,
};

export function reduceExistingCreatureConversation(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  candidateValue: unknown,
): string {
  return canEditExistingCreatureConversation(source)
    && isCreatureConversationTargetResRef(candidateValue)
    ? candidateValue
    : currentValue;
}

export function materializeExistingCreatureConversation(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  draftValue: unknown,
): string {
  return reduceExistingCreatureConversation(source, currentValue, draftValue);
}
