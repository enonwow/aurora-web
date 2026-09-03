import type {
  SceneObjectCreatureScriptSlots,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  CREATURE_SCRIPT_RESREF_FIELDS,
  isCreatureScriptTargetResRef,
  readCreatureScriptResRefsProvenance,
  type CreatureScriptResRefKey,
} from "../../scene/domain/creatureScriptResRefs";

export function canEditExistingCreatureScriptResRef(
  source: SceneObjectSourceMetadata | undefined,
  key: CreatureScriptResRefKey,
): boolean {
  const provenance = readCreatureScriptResRefsProvenance(
    source?.creatureScriptResRefs,
  );
  return source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0 &&
    provenance?.[key] !== undefined;
}

export function reduceExistingCreatureScriptResRef(
  source: SceneObjectSourceMetadata | undefined,
  key: CreatureScriptResRefKey,
  currentValue: string,
  candidateValue: unknown,
): string {
  if (!canEditExistingCreatureScriptResRef(source, key)) return currentValue;
  const member = readCreatureScriptResRefsProvenance(
    source?.creatureScriptResRefs,
  )?.[key];
  if (
    typeof candidateValue === "string" &&
    candidateValue === member?.expectedResRef
  ) {
    return candidateValue;
  }
  return isCreatureScriptTargetResRef(candidateValue)
    ? candidateValue
    : currentValue;
}

export function materializeExistingCreatureScriptResRefs(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectCreatureScriptSlots | undefined,
  candidates: Readonly<Record<CreatureScriptResRefKey, unknown>>,
): SceneObjectCreatureScriptSlots | undefined {
  if (!current) return current;
  let next = current;
  for (const { key } of CREATURE_SCRIPT_RESREF_FIELDS) {
    const value = reduceExistingCreatureScriptResRef(
      source,
      key,
      current[key],
      candidates[key],
    );
    if (value !== current[key]) next = { ...next, [key]: value };
  }
  return next;
}
