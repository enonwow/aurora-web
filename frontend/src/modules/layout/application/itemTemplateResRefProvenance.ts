import type { SceneObjectSourceMetadata } from "../../scene/contracts";
import {
  canEditExistingItemTemplateResRef,
  isItemTemplateResRef,
  ITEM_TEMPLATE_RESREF_MAX_CODE_UNITS,
} from "../../scene/domain/itemTemplateResRef";

export {
  canEditExistingItemTemplateResRef,
  ITEM_TEMPLATE_RESREF_MAX_CODE_UNITS,
};

export function reduceExistingItemTemplateResRef(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  candidateValue: unknown,
): string {
  return canEditExistingItemTemplateResRef(source) &&
    isItemTemplateResRef(candidateValue)
    ? candidateValue
    : currentValue;
}

export function materializeExistingItemTemplateResRef(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  draftValue: unknown,
): string {
  return reduceExistingItemTemplateResRef(source, currentValue, draftValue);
}
