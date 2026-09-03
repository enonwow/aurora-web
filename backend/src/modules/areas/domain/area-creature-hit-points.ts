import {
  isExactEffectiveCreatureRacialTypesTwoDaTable,
  MAX_EFFECTIVE_CREATURE_RACIAL_TYPES_TWO_DA_ROWS,
  type EffectiveCreatureRacialTypesTwoDaDescriptor,
} from "../../catalog/domain/effective-creature-racial-types-two-da";

const SHORT_MIN = -0x8000;
const SHORT_MAX = 0x7fff;
const BYTE_MAX = 0xff;
const MIN_BASE_HIT_POINTS = 1;
const MAX_BASE_HIT_POINTS = 10_000;
const MAX_CLASS_SLOTS = 8;
const MAX_EDITABLE_LEVEL_COUNT = 180;

const FIELD_KEYS = ["nativeType", "value"] as const;
const RACIAL_TYPES_KEYS = [
  "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  "rowIndex", "constitutionAdjust",
] as const;
const MUTATION_KEYS = [
  "expectedHitPoints", "expectedCurrentHitPoints", "expectedMaxHitPoints",
  "hitPoints", "currentHitPoints", "maxHitPoints",
  "expectedConstitution", "constitution", "race", "classLevels",
  "featRow40Present", "racialConstitutionAdjust", "racialTypesSha256",
  "racialTypesRowCount",
] as const;

export interface AreaCreatureHitPointShort {
  readonly nativeType: "short";
  readonly value: number;
}

export interface AreaCreatureHitPointByte {
  readonly nativeType: "byte";
  readonly value: number;
}

export interface AreaCreatureHitPointRacialTypesBinding
  extends EffectiveCreatureRacialTypesTwoDaDescriptor {
  readonly rowIndex: number;
  readonly constitutionAdjust: number;
}

export type AreaCreatureHitPointState =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      hitPoints: AreaCreatureHitPointShort;
      currentHitPoints: AreaCreatureHitPointShort;
      maxHitPoints: AreaCreatureHitPointShort;
      constitution: AreaCreatureHitPointByte;
      race: AreaCreatureHitPointByte;
      classLevels: readonly number[];
      featRow40Present: boolean;
      racialTypes?: AreaCreatureHitPointRacialTypesBinding;
    }>;

export interface AuroraCreatureHitPointCalculation {
  readonly levelCount: number;
  readonly constitutionModifier: number;
  readonly constitutionBonus: number;
  readonly minimumBaseHitPoints: number;
  readonly ordinaryMaximum: number;
  readonly maxHitPoints: number;
}

export interface ExistingAreaCreatureHitPointTarget {
  readonly hitPoints: number;
  readonly currentHitPoints: number;
  readonly maxHitPoints: number;
  readonly constitution: number;
}

export interface ExistingAreaCreatureHitPointMutation
  extends ExistingAreaCreatureHitPointTarget {
  readonly expectedHitPoints: number;
  readonly expectedCurrentHitPoints: number;
  readonly expectedMaxHitPoints: number;
  readonly expectedConstitution: number;
  readonly race: number;
  readonly classLevels: readonly number[];
  readonly targetClassLevels?: readonly number[];
  readonly featRow40Present: boolean;
  readonly targetFeatRow40Present?: boolean;
  readonly racialConstitutionAdjust: number;
  readonly racialTypesSha256: string;
  readonly racialTypesRowCount: number;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isShort(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= SHORT_MIN && Number(value) <= SHORT_MAX;
}

function isByte(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= BYTE_MAX;
}

function isSignedInt32(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= -0x8000_0000 &&
    Number(value) <= 0x7fff_ffff;
}

function readShort(value: unknown): AreaCreatureHitPointShort | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, FIELD_KEYS) ||
    value.nativeType !== "short" || !isShort(value.value)) return null;
  return Object.freeze({ nativeType: "short", value: Number(value.value) });
}

function readByte(value: unknown): AreaCreatureHitPointByte | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, FIELD_KEYS) ||
    value.nativeType !== "byte" || !isByte(value.value)) return null;
  return Object.freeze({ nativeType: "byte", value: Number(value.value) });
}

function readClassLevels(value: unknown): readonly number[] | null {
  if (!Array.isArray(value) || value.length > MAX_CLASS_SLOTS ||
    value.some((entry) => !isByte(entry))) return null;
  const levels = value.map(Number);
  const levelCount = levels.reduce((sum, level) => sum + level, 0);
  return levelCount <= MAX_EDITABLE_LEVEL_COUNT ? Object.freeze(levels) : null;
}

function readRacialTypesBinding(value: unknown): AreaCreatureHitPointRacialTypesBinding | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, RACIAL_TYPES_KEYS) ||
    !isSignedInt32(value.constitutionAdjust)) return null;
  const synthetic = {
    descriptor: Object.fromEntries(
      RACIAL_TYPES_KEYS.slice(0, 6).map((key) => [key, value[key]]),
    ),
    rows: [{
      rowIndex: value.rowIndex,
      constitutionAdjust: value.constitutionAdjust,
    }],
  };
  if (!isExactEffectiveCreatureRacialTypesTwoDaTable(synthetic) ||
    !isByte(value.rowIndex)) return null;
  return Object.freeze({
    ...(synthetic.descriptor as unknown as EffectiveCreatureRacialTypesTwoDaDescriptor),
    rowIndex: Number(value.rowIndex),
    constitutionAdjust: Number(value.constitutionAdjust),
  });
}

export function calculateAuroraAbilityModifier(score: number): number | null {
  if (!isSignedInt32(score)) return null;
  return Math.trunc(score / 2) - 5;
}

export function calculateAuroraCreatureHitPoints(input: Readonly<{
  baseHitPoints: number;
  constitution: number;
  racialConstitutionAdjust: number;
  classLevels: readonly number[];
  featRow40Present: boolean;
}>): AuroraCreatureHitPointCalculation | null {
  if (!Number.isSafeInteger(input.baseHitPoints) ||
    input.baseHitPoints < MIN_BASE_HIT_POINTS || input.baseHitPoints > MAX_BASE_HIT_POINTS ||
    !isByte(input.constitution) || !isSignedInt32(input.racialConstitutionAdjust) ||
    typeof input.featRow40Present !== "boolean") return null;
  const classLevels = readClassLevels(input.classLevels);
  if (!classLevels) return null;
  const levelCount = classLevels.reduce((sum, level) => sum + level, 0);
  const effectiveConstitution = (input.constitution + input.racialConstitutionAdjust) | 0;
  const constitutionModifier = calculateAuroraAbilityModifier(effectiveConstitution);
  if (constitutionModifier === null) return null;
  const ordinaryConstitutionBonus = Math.imul(levelCount, constitutionModifier);
  const rawOrdinaryMaximum = (input.baseHitPoints + ordinaryConstitutionBonus) | 0;
  const ordinaryMaximum = Math.max(rawOrdinaryMaximum, levelCount);
  const featBonus = input.featRow40Present ? levelCount : 0;
  const maxHitPoints = (ordinaryMaximum + featBonus) | 0;
  const constitutionBonus = (ordinaryConstitutionBonus + featBonus) | 0;
  const minimumBaseHitPoints = Math.max(
    MIN_BASE_HIT_POINTS,
    levelCount - ordinaryConstitutionBonus,
  );
  if (!isShort(ordinaryMaximum) || !isShort(maxHitPoints) ||
    !Number.isSafeInteger(minimumBaseHitPoints) || minimumBaseHitPoints > MAX_BASE_HIT_POINTS) {
    return null;
  }
  return Object.freeze({
    levelCount,
    constitutionModifier,
    constitutionBonus,
    minimumBaseHitPoints,
    ordinaryMaximum,
    maxHitPoints,
  });
}

export function readAreaCreatureHitPointState(
  value: unknown,
): AreaCreatureHitPointState | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  const hasRacialTypes = Object.prototype.hasOwnProperty.call(value, "racialTypes");
  const keys = [
    "present", "hitPoints", "currentHitPoints", "maxHitPoints", "constitution", "race",
    "classLevels", "featRow40Present", ...(hasRacialTypes ? ["racialTypes"] : []),
  ];
  if (!hasExactKeys(value, keys) || value.present !== true ||
    typeof value.featRow40Present !== "boolean") return null;
  const hitPoints = readShort(value.hitPoints);
  const currentHitPoints = readShort(value.currentHitPoints);
  const maxHitPoints = readShort(value.maxHitPoints);
  const constitution = readByte(value.constitution);
  const race = readByte(value.race);
  const classLevels = readClassLevels(value.classLevels);
  const racialTypes = hasRacialTypes ? readRacialTypesBinding(value.racialTypes) : undefined;
  if (!hitPoints || hitPoints.value < MIN_BASE_HIT_POINTS ||
    hitPoints.value > MAX_BASE_HIT_POINTS || !currentHitPoints || !maxHitPoints ||
    !constitution || !race || !classLevels || hasRacialTypes && !racialTypes ||
    racialTypes && racialTypes.rowIndex !== race.value) return null;
  return Object.freeze({
    present: true,
    hitPoints,
    currentHitPoints,
    maxHitPoints,
    constitution,
    race,
    classLevels,
    featRow40Present: value.featRow40Present,
    ...(racialTypes ? { racialTypes } : {}),
  });
}

export function bindEffectiveCreatureRacialTypesTwoDaToHitPointState(
  storage: AreaCreatureHitPointState,
  table: unknown,
): AreaCreatureHitPointState {
  if (!storage.present || !isExactEffectiveCreatureRacialTypesTwoDaTable(table)) return storage;
  const row = table.rows.find((candidate) => candidate.rowIndex === storage.race.value);
  if (!row) return storage;
  return Object.freeze({
    ...storage,
    racialTypes: Object.freeze({
      ...table.descriptor,
      rowIndex: row.rowIndex,
      constitutionAdjust: row.constitutionAdjust,
    }),
  });
}

function deriveTarget(
  source: Extract<AreaCreatureHitPointState, { present: true }>,
  target: Readonly<{
    baseHitPoints: number;
    constitution: number;
    classLevels?: readonly number[];
    featRow40Present?: boolean;
  }>,
  racialConstitutionAdjust: number,
): ExistingAreaCreatureHitPointTarget | null {
  const sourceCalculation = calculateAuroraCreatureHitPoints({
    baseHitPoints: source.hitPoints.value,
    constitution: source.constitution.value,
    racialConstitutionAdjust,
    classLevels: source.classLevels,
    featRow40Present: source.featRow40Present,
  });
  const targetCalculation = calculateAuroraCreatureHitPoints({
    baseHitPoints: target.baseHitPoints,
    constitution: target.constitution,
    racialConstitutionAdjust,
    classLevels: target.classLevels ?? source.classLevels,
    featRow40Present: target.featRow40Present ?? source.featRow40Present,
  });
  if (!sourceCalculation || !targetCalculation ||
    source.hitPoints.value < sourceCalculation.minimumBaseHitPoints ||
    target.baseHitPoints < targetCalculation.minimumBaseHitPoints) return null;

  const targetBonus = targetCalculation.maxHitPoints - target.baseHitPoints;
  let targetCurrent = target.baseHitPoints;
  const loadedWasAlive = sourceCalculation.maxHitPoints > 0;
  if (loadedWasAlive && targetCurrent + targetBonus > 0) {
    targetCurrent = sourceCalculation.maxHitPoints - targetBonus;
  } else if (!loadedWasAlive && targetCurrent + targetBonus < 1) {
    targetCurrent = 1 - targetBonus;
  }
  if (!isShort(targetCurrent)) return null;
  return Object.freeze({
    hitPoints: target.baseHitPoints,
    currentHitPoints: targetCurrent,
    maxHitPoints: targetCalculation.maxHitPoints,
    constitution: target.constitution,
  });
}

export function deriveExistingAreaCreatureHitPointTarget(
  source: AreaCreatureHitPointState,
  target: Readonly<{
    baseHitPoints: number;
    constitution: number;
    classLevels?: readonly number[];
    featRow40Present?: boolean;
  }>,
): ExistingAreaCreatureHitPointTarget | null {
  const exact = readAreaCreatureHitPointState(source);
  if (!exact?.present || !exact.racialTypes ||
    !Number.isSafeInteger(target.baseHitPoints) || !isByte(target.constitution)) return null;
  return deriveTarget(exact, target, exact.racialTypes.constitutionAdjust);
}

export function readExistingAreaCreatureHitPointMutation(
  value: unknown,
): ExistingAreaCreatureHitPointMutation | null {
  if (!isPlainRecord(value)) return null;
  const hasTargetClassLevels = Object.prototype.hasOwnProperty.call(
    value,
    "targetClassLevels",
  );
  const hasTargetFeatRow40Present = Object.prototype.hasOwnProperty.call(
    value,
    "targetFeatRow40Present",
  );
  const exactKeys = [
    ...MUTATION_KEYS,
    ...(hasTargetClassLevels ? ["targetClassLevels"] : []),
    ...(hasTargetFeatRow40Present ? ["targetFeatRow40Present"] : []),
  ];
  if (!hasExactKeys(value, exactKeys) ||
    !Number.isSafeInteger(value.expectedHitPoints) ||
    Number(value.expectedHitPoints) < MIN_BASE_HIT_POINTS ||
    Number(value.expectedHitPoints) > MAX_BASE_HIT_POINTS ||
    !isShort(value.expectedCurrentHitPoints) || !isShort(value.expectedMaxHitPoints) ||
    !Number.isSafeInteger(value.hitPoints) || Number(value.hitPoints) < MIN_BASE_HIT_POINTS ||
    Number(value.hitPoints) > MAX_BASE_HIT_POINTS || !isShort(value.currentHitPoints) ||
    !isShort(value.maxHitPoints) || !isByte(value.expectedConstitution) ||
    !isByte(value.constitution) || !isByte(value.race) ||
    typeof value.featRow40Present !== "boolean" ||
    hasTargetFeatRow40Present &&
      (typeof value.targetFeatRow40Present !== "boolean" ||
        value.targetFeatRow40Present === value.featRow40Present) ||
    !isSignedInt32(value.racialConstitutionAdjust) ||
    typeof value.racialTypesSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.racialTypesSha256) ||
    !Number.isSafeInteger(value.racialTypesRowCount) ||
    Number(value.racialTypesRowCount) < 1 ||
    Number(value.racialTypesRowCount) > MAX_EFFECTIVE_CREATURE_RACIAL_TYPES_TWO_DA_ROWS ||
    Number(value.race) >= Number(value.racialTypesRowCount)) return null;
  const classLevels = readClassLevels(value.classLevels);
  const targetClassLevels = hasTargetClassLevels
    ? readClassLevels(value.targetClassLevels)
    : undefined;
  const classLevelsChanged = targetClassLevels !== undefined && targetClassLevels !== null &&
    (targetClassLevels.length !== classLevels?.length ||
      targetClassLevels.some((level, index) => level !== classLevels?.[index]));
  if (!classLevels || hasTargetClassLevels && !targetClassLevels ||
    hasTargetClassLevels && !classLevelsChanged ||
    !classLevelsChanged && !hasTargetFeatRow40Present &&
      value.expectedHitPoints === value.hitPoints &&
      value.expectedConstitution === value.constitution) return null;
  const source: Extract<AreaCreatureHitPointState, { present: true }> = {
    present: true,
    hitPoints: { nativeType: "short", value: Number(value.expectedHitPoints) },
    currentHitPoints: { nativeType: "short", value: Number(value.expectedCurrentHitPoints) },
    maxHitPoints: { nativeType: "short", value: Number(value.expectedMaxHitPoints) },
    constitution: { nativeType: "byte", value: Number(value.expectedConstitution) },
    race: { nativeType: "byte", value: Number(value.race) },
    classLevels,
    featRow40Present: value.featRow40Present,
  };
  const target = deriveTarget(source, {
    baseHitPoints: Number(value.hitPoints),
    constitution: Number(value.constitution),
    ...(targetClassLevels ? { classLevels: targetClassLevels } : {}),
    ...(hasTargetFeatRow40Present
      ? { featRow40Present: Boolean(value.targetFeatRow40Present) }
      : {}),
  }, Number(value.racialConstitutionAdjust));
  if (!target || target.currentHitPoints !== value.currentHitPoints ||
    target.maxHitPoints !== value.maxHitPoints) return null;
  return Object.freeze({
    expectedHitPoints: Number(value.expectedHitPoints),
    expectedCurrentHitPoints: Number(value.expectedCurrentHitPoints),
    expectedMaxHitPoints: Number(value.expectedMaxHitPoints),
    ...target,
    expectedConstitution: Number(value.expectedConstitution),
    race: Number(value.race),
    classLevels,
    ...(targetClassLevels ? { targetClassLevels } : {}),
    featRow40Present: value.featRow40Present,
    ...(hasTargetFeatRow40Present
      ? { targetFeatRow40Present: Boolean(value.targetFeatRow40Present) }
      : {}),
    racialConstitutionAdjust: Number(value.racialConstitutionAdjust),
    racialTypesSha256: value.racialTypesSha256,
    racialTypesRowCount: Number(value.racialTypesRowCount),
  });
}
