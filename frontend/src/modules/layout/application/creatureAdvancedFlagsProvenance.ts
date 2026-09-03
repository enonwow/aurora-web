import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingCreatureAdvancedFlag,
  type CreatureAdvancedFlagKey,
} from "../../scene/domain/creatureAdvancedFlags";

export { canEditExistingCreatureAdvancedFlag };

export function reduceExistingCreatureAdvancedFlag(
  source: SceneObjectSourceMetadata | undefined,
  field: CreatureAdvancedFlagKey,
  currentValue: boolean,
  candidateValue: unknown,
): boolean {
  return canEditExistingCreatureAdvancedFlag(source, field) &&
      typeof candidateValue === "boolean"
    ? candidateValue
    : currentValue;
}

export function materializeExistingCreatureAdvancedFlag(
  source: SceneObjectSourceMetadata | undefined,
  field: CreatureAdvancedFlagKey,
  currentValue: boolean,
  draftValue: unknown,
): boolean {
  return reduceExistingCreatureAdvancedFlag(source, field, currentValue, draftValue);
}
