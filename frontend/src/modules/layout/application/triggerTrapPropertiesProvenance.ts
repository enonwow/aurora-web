import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingTriggerTrapProperties,
  cloneTriggerTrapProperties,
  isTriggerTrapProperties,
  triggerTrapPropertiesEqual,
  type TriggerTrapProperties,
} from "../../scene/domain/triggerTrapProperties";

export function readExistingTriggerTrapPropertiesProvenance(
  source: SceneObjectSourceMetadata | undefined,
): TriggerTrapProperties | undefined {
  if (!canEditExistingTriggerTrapProperties(source)) return undefined;
  return cloneTriggerTrapProperties(source!.triggerTrapProperties!);
}

export function reduceExistingTriggerTrapProperties(
  source: SceneObjectSourceMetadata | undefined,
  current: TriggerTrapProperties,
  value: unknown,
): TriggerTrapProperties {
  if (
    !canEditExistingTriggerTrapProperties(source)
    || !isTriggerTrapProperties(current)
    || !isTriggerTrapProperties(value)
    || triggerTrapPropertiesEqual(current, value)
  ) return current;
  return cloneTriggerTrapProperties(value);
}

export function materializeExistingTriggerTrapProperties(
  source: SceneObjectSourceMetadata | undefined,
  current: TriggerTrapProperties,
  draft: unknown,
): TriggerTrapProperties {
  if (
    !canEditExistingTriggerTrapProperties(source)
    || !isTriggerTrapProperties(current)
    || !isTriggerTrapProperties(draft)
  ) return cloneTriggerTrapProperties(current);
  return triggerTrapPropertiesEqual(current, draft)
    ? cloneTriggerTrapProperties(current)
    : cloneTriggerTrapProperties(draft);
}

export { canEditExistingTriggerTrapProperties };
