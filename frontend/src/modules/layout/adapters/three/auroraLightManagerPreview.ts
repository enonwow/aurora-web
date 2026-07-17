export interface AuroraLightManagerPreviewPosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface AuroraLightManagerPreviewScoreInput {
  readonly position?: AuroraLightManagerPreviewPosition | null;
  readonly sourceRadius?: number | null;
  readonly activeSelectionRadiusOverride?: number | null;
  readonly multiplier?: number | null;
  readonly priority?: number | null;
  readonly field0x70?: number | null;
  readonly runtimeExtent?: number | null;
  readonly currentObjectLane?: boolean;
  readonly staticOwner?: boolean;
  readonly enforceActiveSelectionRadius?: boolean;
}

export interface AuroraLightManagerPreviewScore {
  readonly score: number;
  readonly priority: number;
  readonly distance: number;
  readonly sourceRadius: number | null;
  readonly activeSelectionRadiusOverride: number | null;
  readonly activeSelectionRadiusLimit: number | null;
  readonly activeSelectionRadiusEnforced: boolean;
  readonly activeSelectionRadiusPassed: boolean | null;
  readonly activeSelectionRadiusRule: string;
  readonly activeSelectionRadiusSource: string;
  readonly multiplier: number | null;
  readonly field0x70: number;
  readonly runtimeExtent: number;
  readonly rangeTerm: number;
  readonly formula: string;
  readonly source: string;
  readonly proofStatus: string;
  readonly sortDirection: string;
  readonly fallback: string;
}

export interface AuroraLightManagerPreviewBudgetCandidate<TPayload = unknown> {
  readonly key: string;
  readonly sourceIndex: number;
  readonly payload: TPayload;
  readonly score?: AuroraLightManagerPreviewScore | null;
  readonly scoreInput?: AuroraLightManagerPreviewScoreInput | null;
}

export interface AuroraLightManagerPreviewBudgetEntry<TPayload = unknown> {
  readonly key: string;
  readonly sourceIndex: number;
  readonly payload: TPayload;
  readonly retailScore: AuroraLightManagerPreviewScore;
  readonly rank: number;
  readonly accepted: boolean;
}

export const AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY =
  "source-backed-retail-score-ascending-global-budget-preview-camera-fallback";
export const AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:865731-865735 FUN_00a41694 sorts by active-light score field +0x84 using '<'; 865838-865929 FUN_00a41850 computes +0x84 from camera distance, radius, multiplier, owner priority, field +0x70, and runtime extent; 866086-866096 FUN_00a41e30 caps uploaded active slots at min(runtime max lights, 0x80); preview uses object-local light distance with field0x70=0/runtimeExtent=1 where retail camera/object-manager fields are unavailable";
export const AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY_PROOF_STATUS =
  "source-backed-retail-score-sort-slot-cap-preview-camera-field-fallback";
export const AURORA_LIGHT_MANAGER_PREVIEW_SCORE_FORMULA =
  "invalid radius/multiplier/extent -> 100000; current-object lane -> -1; otherwise ((priority+1)*previewDistance)/((field0x70+4)*(rangeTerm+1)), rangeTerm=20 for static-owner lights else sourceRadius*multiplier*runtimeExtent";
export const AURORA_LIGHT_MANAGER_PREVIEW_SCORE_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:865838-865929 FUN_00a41850 writes LightManager score +0x84; 865731-865735 FUN_00a41694 sorts ascending by that score";
export const AURORA_LIGHT_MANAGER_PREVIEW_SCORE_PROOF_STATUS =
  "source-backed-retail-lightmanager-score-preview-input-fallback";
export const AURORA_LIGHT_MANAGER_PREVIEW_SCORE_SORT_DIRECTION =
  "ascending-score-field-0x84-preview";
export const AURORA_LIGHT_MANAGER_PREVIEW_SCORE_FALLBACK =
  "preview-object-local-distance-field0x70-zero-runtimeextent-one-cross-lane-callsite-blocked";
export const AURORA_LIGHT_MANAGER_PREVIEW_ACTIVE_SELECTION_RADIUS_RULE =
  "FUN_00a42728 accepts a sorted candidate only when light+0x80 <= (light+0x60 when positive, otherwise light+0x58)";
export const AURORA_LIGHT_MANAGER_PREVIEW_ACTIVE_SELECTION_RADIUS_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:866625-866678 FUN_00a42728 selects sorted active-light candidates and gates them by distance field +0x80 against shadowradius +0x60 when positive, otherwise radius +0x58";
export const AURORA_LIGHT_MANAGER_INVALID_SCORE = 100000;
export const AURORA_LIGHT_MANAGER_CURRENT_OBJECT_SCORE = -1;
export const AURORA_LIGHT_MANAGER_PREVIEW_ACTIVE_SLOT_HARD_CAP = 128;

function resolveFiniteNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function resolvePreviewDistance(
  position: AuroraLightManagerPreviewPosition | null | undefined
): number {
  const x = resolveFiniteNumber(position?.x) ?? 0;
  const y = resolveFiniteNumber(position?.y) ?? 0;
  const z = resolveFiniteNumber(position?.z) ?? 0;
  return Math.sqrt(x * x + y * y + z * z);
}

export function resolveAuroraLightManagerPreviewScore(
  input: AuroraLightManagerPreviewScoreInput
): AuroraLightManagerPreviewScore {
  const priority = Math.trunc(resolveFiniteNumber(input.priority) ?? 0);
  const distance = resolvePreviewDistance(input.position);
  const sourceRadius = resolveFiniteNumber(input.sourceRadius);
  const activeSelectionRadiusOverride = resolveFiniteNumber(
    input.activeSelectionRadiusOverride
  );
  const activeSelectionRadiusLimit =
    activeSelectionRadiusOverride !== null && activeSelectionRadiusOverride > 0
      ? activeSelectionRadiusOverride
      : sourceRadius !== null && sourceRadius > 0
        ? sourceRadius
        : null;
  const activeSelectionRadiusEnforced = input.enforceActiveSelectionRadius === true;
  const activeSelectionRadiusPassed =
    input.currentObjectLane === true
      ? true
      : activeSelectionRadiusLimit === null
        ? null
        : distance <= activeSelectionRadiusLimit;
  const multiplier = resolveFiniteNumber(input.multiplier);
  const field0x70 = Math.max(0, Math.trunc(resolveFiniteNumber(input.field0x70) ?? 0));
  const runtimeExtent = resolveFiniteNumber(input.runtimeExtent) ?? 1;
  const rangeTerm =
    input.staticOwner === true
      ? 20
      : (sourceRadius ?? 0) * (multiplier ?? 0) * runtimeExtent;

  let score: number;
  if (input.currentObjectLane === true) {
    score = AURORA_LIGHT_MANAGER_CURRENT_OBJECT_SCORE;
  } else if (
    !sourceRadius ||
    sourceRadius <= 0 ||
    !multiplier ||
    multiplier <= 0 ||
    runtimeExtent <= 0 ||
    rangeTerm <= 0
  ) {
    score = AURORA_LIGHT_MANAGER_INVALID_SCORE;
  } else {
    score = ((priority + 1) * distance) / ((field0x70 + 4) * (rangeTerm + 1));
  }

  return {
    score,
    priority,
    distance,
    sourceRadius,
    activeSelectionRadiusOverride,
    activeSelectionRadiusLimit,
    activeSelectionRadiusEnforced,
    activeSelectionRadiusPassed,
    activeSelectionRadiusRule: AURORA_LIGHT_MANAGER_PREVIEW_ACTIVE_SELECTION_RADIUS_RULE,
    activeSelectionRadiusSource: AURORA_LIGHT_MANAGER_PREVIEW_ACTIVE_SELECTION_RADIUS_SOURCE,
    multiplier,
    field0x70,
    runtimeExtent,
    rangeTerm,
    formula: AURORA_LIGHT_MANAGER_PREVIEW_SCORE_FORMULA,
    source: AURORA_LIGHT_MANAGER_PREVIEW_SCORE_SOURCE,
    proofStatus: AURORA_LIGHT_MANAGER_PREVIEW_SCORE_PROOF_STATUS,
    sortDirection: AURORA_LIGHT_MANAGER_PREVIEW_SCORE_SORT_DIRECTION,
    fallback: AURORA_LIGHT_MANAGER_PREVIEW_SCORE_FALLBACK
  };
}

export function buildAuroraLightManagerPreviewScoreUserData(
  prefix: string,
  score: AuroraLightManagerPreviewScore
): Record<string, unknown> {
  return {
    [`${prefix}RetailScore`]: score.score,
    [`${prefix}RetailScorePriority`]: score.priority,
    [`${prefix}RetailScorePreviewDistance`]: score.distance,
    [`${prefix}RetailScoreSourceRadius`]: score.sourceRadius,
    [`${prefix}RetailScoreActiveSelectionRadiusOverride`]:
      score.activeSelectionRadiusOverride,
    [`${prefix}RetailScoreActiveSelectionRadiusLimit`]:
      score.activeSelectionRadiusLimit,
    [`${prefix}RetailScoreActiveSelectionRadiusEnforced`]:
      score.activeSelectionRadiusEnforced,
    [`${prefix}RetailScoreActiveSelectionRadiusPassed`]:
      score.activeSelectionRadiusPassed,
    [`${prefix}RetailScoreActiveSelectionRadiusRule`]:
      score.activeSelectionRadiusRule,
    [`${prefix}RetailScoreActiveSelectionRadiusSource`]:
      score.activeSelectionRadiusSource,
    [`${prefix}RetailScoreMultiplier`]: score.multiplier,
    [`${prefix}RetailScoreField0x70`]: score.field0x70,
    [`${prefix}RetailScoreRuntimeExtent`]: score.runtimeExtent,
    [`${prefix}RetailScoreRangeTerm`]: score.rangeTerm,
    [`${prefix}RetailScoreFormula`]: score.formula,
    [`${prefix}RetailScoreSource`]: score.source,
    [`${prefix}RetailScoreProofStatus`]: score.proofStatus,
    [`${prefix}RetailScoreSortDirection`]: score.sortDirection,
    [`${prefix}RetailScoreFallback`]: score.fallback
  };
}

export function selectAuroraLightManagerPreviewBudget<TPayload>(
  candidates: readonly AuroraLightManagerPreviewBudgetCandidate<TPayload>[],
  activeSlotCap = AURORA_LIGHT_MANAGER_PREVIEW_ACTIVE_SLOT_HARD_CAP
): AuroraLightManagerPreviewBudgetEntry<TPayload>[] {
  const cappedActiveSlotCap = Math.min(
    Math.max(0, Math.trunc(activeSlotCap)),
    AURORA_LIGHT_MANAGER_PREVIEW_ACTIVE_SLOT_HARD_CAP
  );

  const sortedEntries = candidates
    .map((candidate) => ({
      candidate,
      retailScore:
        candidate.score ??
        resolveAuroraLightManagerPreviewScore(candidate.scoreInput ?? {})
    }))
    .sort((left, right) => {
      const scoreDelta = left.retailScore.score - right.retailScore.score;
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return left.candidate.sourceIndex - right.candidate.sourceIndex;
    });

  let acceptedCount = 0;
  return sortedEntries.map((entry, index) => {
    const radiusEligible =
      !entry.retailScore.activeSelectionRadiusEnforced ||
      entry.retailScore.activeSelectionRadiusPassed !== false;
    const accepted = radiusEligible && acceptedCount < cappedActiveSlotCap;
    if (accepted) {
      acceptedCount += 1;
    }
    return {
      key: entry.candidate.key,
      sourceIndex: entry.candidate.sourceIndex,
      payload: entry.candidate.payload,
      retailScore: entry.retailScore,
      rank: index + 1,
      accepted
    };
  });
}
