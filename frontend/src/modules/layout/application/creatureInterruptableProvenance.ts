import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import { canEditExistingCreatureInterruptable } from "../../scene/domain/creatureInterruptable";

export { canEditExistingCreatureInterruptable };

export function reduceExistingCreatureNoInterrupt(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: boolean,
  candidateValue: unknown,
): boolean {
  return canEditExistingCreatureInterruptable(source) && typeof candidateValue === "boolean"
    ? candidateValue
    : currentValue;
}

export function materializeExistingCreatureNoInterrupt(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: boolean,
  draftValue: unknown,
): boolean {
  return reduceExistingCreatureNoInterrupt(source, currentValue, draftValue);
}
