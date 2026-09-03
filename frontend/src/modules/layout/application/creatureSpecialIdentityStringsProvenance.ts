import type {
  SceneObjectCreatureAdvancedSettings,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  isCreatureSpecialIdentityString,
  readCreatureSpecialIdentityStringsProvenance,
} from "../../scene/domain/creatureSpecialIdentityStrings";

export type CreatureSpecialIdentityStringKey = "subrace" | "deity";

export function canEditExistingCreatureSpecialIdentityString(
  source: SceneObjectSourceMetadata | undefined,
  key: CreatureSpecialIdentityStringKey,
): boolean {
  const provenance = readCreatureSpecialIdentityStringsProvenance(
    source?.creatureSpecialIdentityStrings,
  );
  return source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    provenance?.[key] !== undefined;
}

export function reduceExistingCreatureSpecialIdentityString(
  source: SceneObjectSourceMetadata | undefined,
  key: CreatureSpecialIdentityStringKey,
  currentValue: string,
  candidateValue: unknown,
): string {
  return canEditExistingCreatureSpecialIdentityString(source, key) &&
    isCreatureSpecialIdentityString(candidateValue)
    ? candidateValue
    : currentValue;
}

export function materializeExistingCreatureSpecialIdentityStrings<
  TAdvanced extends SceneObjectCreatureAdvancedSettings,
>(
  source: SceneObjectSourceMetadata | undefined,
  current: TAdvanced | undefined,
  candidates: Readonly<{ subrace: unknown; deity: unknown }>,
): TAdvanced | undefined {
  if (!current) return current;
  let next: SceneObjectCreatureAdvancedSettings = current;
  for (const key of ["subrace", "deity"] as const) {
    if (
      canEditExistingCreatureSpecialIdentityString(source, key) &&
      isCreatureSpecialIdentityString(candidates[key])
    ) {
      next = { ...next, [key]: candidates[key] };
    }
  }
  return next as TAdvanced;
}
