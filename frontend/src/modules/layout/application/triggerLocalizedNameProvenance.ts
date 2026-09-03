import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingTriggerLocalizedName,
  isTriggerLocalizedNameInlineAsciiText,
  readExistingTriggerLocalizedNameSourceValue,
} from "../../scene/domain/triggerLocalizedName";

export function readExistingTriggerLocalizedName(
  source: SceneObjectSourceMetadata | undefined,
): string | undefined {
  return readExistingTriggerLocalizedNameSourceValue(source);
}
export { canEditExistingTriggerLocalizedName };

export function reduceExistingTriggerLocalizedName(
  source: SceneObjectSourceMetadata | undefined,
  current: string,
  candidate: unknown,
): string {
  return canEditExistingTriggerLocalizedName(source) &&
    isTriggerLocalizedNameInlineAsciiText(candidate)
    ? candidate
    : current;
}

export function materializeExistingTriggerLocalizedName(
  source: SceneObjectSourceMetadata | undefined,
  current: string | undefined,
  candidate: unknown,
): string | undefined {
  return canEditExistingTriggerLocalizedName(source) &&
    isTriggerLocalizedNameInlineAsciiText(candidate)
    ? candidate
    : current;
}
