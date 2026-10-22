import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingTriggerCoreProperties,
  cloneTriggerCoreProperties,
  isTriggerCoreProperties,
  triggerCorePropertiesEqual,
  type TriggerCoreProperties,
} from "../../scene/domain/triggerCoreProperties";

export function readExistingTriggerCorePropertiesProvenance(
  source: SceneObjectSourceMetadata | undefined,
): TriggerCoreProperties | undefined {
  if (!canEditExistingTriggerCoreProperties(source)) return undefined;
  return cloneTriggerCoreProperties(source!.triggerCoreProperties!);
}

export function reduceExistingTriggerCoreProperties(
  source: SceneObjectSourceMetadata | undefined,
  current: TriggerCoreProperties,
  value: unknown,
): TriggerCoreProperties {
  if (
    !canEditExistingTriggerCoreProperties(source)
    || !isTriggerCoreProperties(current)
    || !isTriggerCoreProperties(value)
    || triggerCorePropertiesEqual(current, value)
  ) return current;
  return cloneTriggerCoreProperties(value);
}

export function materializeExistingTriggerCoreProperties(
  source: SceneObjectSourceMetadata | undefined,
  current: TriggerCoreProperties,
  draft: unknown,
): TriggerCoreProperties {
  if (
    !canEditExistingTriggerCoreProperties(source)
    || !isTriggerCoreProperties(current)
    || !isTriggerCoreProperties(draft)
  ) return cloneTriggerCoreProperties(current);
  return triggerCorePropertiesEqual(current, draft)
    ? cloneTriggerCoreProperties(current)
    : cloneTriggerCoreProperties(draft);
}

export { canEditExistingTriggerCoreProperties };
