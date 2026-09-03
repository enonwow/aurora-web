import type {
  SceneObjectCreatureAdvancedSettings,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  isCreatureTemplateResRef,
  readCreatureTemplateResRefProvenance,
} from "../../scene/domain/creatureTemplateResRef";

export function canEditExistingCreatureTemplateResRef(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    readCreatureTemplateResRefProvenance(source.creatureTemplateResRef) !== null;
}

export function reduceExistingCreatureTemplateResRef(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  candidateValue: unknown,
): string {
  return canEditExistingCreatureTemplateResRef(source) &&
    isCreatureTemplateResRef(candidateValue)
    ? candidateValue
    : currentValue;
}

export function materializeExistingCreatureTemplateResRef<
  TAdvanced extends SceneObjectCreatureAdvancedSettings,
>(
  source: SceneObjectSourceMetadata | undefined,
  current: TAdvanced | undefined,
  candidateValue: unknown,
): TAdvanced | undefined {
  if (
    !current ||
    !canEditExistingCreatureTemplateResRef(source) ||
    !isCreatureTemplateResRef(candidateValue)
  ) {
    return current;
  }
  return { ...current, blueprintResRef: candidateValue };
}
