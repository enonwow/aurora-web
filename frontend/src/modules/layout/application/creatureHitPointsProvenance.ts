import type {
  SceneObjectCreatureHitPointState,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  deriveExistingCreatureHitPointTarget,
  readCreatureHitPointState,
} from "../../scene/domain/creatureHitPoints";

export interface CreatureHitPointDraftValues {
  readonly constitution: number;
  readonly baseHitPoints: number;
  readonly hitPointBonuses: number;
  readonly currentHitPoints: number;
  readonly maxHitPoints: number;
}

export function readExistingCreatureHitPointState(
  source: SceneObjectSourceMetadata | undefined,
): Extract<SceneObjectCreatureHitPointState, { present: true }> | null {
  if (source?.type !== "aurora_git" || source.sourceKind !== "creature" ||
    !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0) return null;
  const state = readCreatureHitPointState(source.creatureHitPointState);
  return state?.present && state.racialTypes ? state : null;
}

export function canEditExistingCreatureHitPoints(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return readExistingCreatureHitPointState(source) !== null;
}

export function reduceExistingCreatureHitPointDraft<T extends CreatureHitPointDraftValues>(
  source: SceneObjectSourceMetadata | undefined,
  current: T,
  candidate: Readonly<{
    baseHitPoints: unknown;
    constitution: unknown;
    classLevels?: readonly number[];
    featRow40Present?: boolean;
  }>,
): T {
  const state = readExistingCreatureHitPointState(source);
  if (!state || !Number.isSafeInteger(candidate.baseHitPoints) ||
    !Number.isSafeInteger(candidate.constitution)) return current;
  const target = deriveExistingCreatureHitPointTarget(state, {
    baseHitPoints: Number(candidate.baseHitPoints),
    constitution: Number(candidate.constitution),
    ...(candidate.classLevels ? { classLevels: candidate.classLevels } : {}),
    ...(candidate.featRow40Present !== undefined
      ? { featRow40Present: candidate.featRow40Present }
      : {}),
  });
  return target
    ? {
        ...current,
        constitution: target.constitution,
        baseHitPoints: target.hitPoints,
        hitPointBonuses: target.maxHitPoints - target.hitPoints,
        currentHitPoints: target.currentHitPoints,
        maxHitPoints: target.maxHitPoints,
      }
    : current;
}

export function materializeExistingCreatureHitPointDraft<
  T extends CreatureHitPointDraftValues,
>(
  source: SceneObjectSourceMetadata | undefined,
  current: T,
  candidate: Readonly<{
    baseHitPoints: unknown;
    constitution: unknown;
    classLevels?: readonly number[];
    featRow40Present?: boolean;
  }>,
): T {
  return reduceExistingCreatureHitPointDraft(source, current, candidate);
}
