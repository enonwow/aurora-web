import type {
  SceneObjectCreatureHitPointRacialTypesBinding,
  SceneObjectCreatureHitPointState,
} from "../contracts";
import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

const SHORT_MIN = -0x8000;
const SHORT_MAX = 0x7fff;
const BYTE_MAX = 0xff;
const MAX_SOURCE_BYTES = 64 * 1024 * 1024;
const MAX_ROWS = 1_000_000;

export interface CreatureHitPointCalculation {
  readonly levelCount: number;
  readonly constitutionModifier: number;
  readonly constitutionBonus: number;
  readonly minimumBaseHitPoints: number;
  readonly ordinaryMaximum: number;
  readonly maxHitPoints: number;
}

export interface ExistingCreatureHitPointTarget {
  readonly hitPoints: number;
  readonly currentHitPoints: number;
  readonly maxHitPoints: number;
  readonly constitution: number;
}

function isShort(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= SHORT_MIN && Number(value) <= SHORT_MAX;
}

function isByte(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= BYTE_MAX;
}

function isInt32(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= -0x8000_0000 &&
    Number(value) <= 0x7fff_ffff;
}

function readNativeNumber(
  value: unknown,
  nativeType: "short" | "byte",
): Readonly<{ nativeType: "short" | "byte"; value: number }> | null {
  if (!isPlainRecord(value) ||
    !hasExactRecordKeys(value, ["nativeType", "value"]) ||
    value.nativeType !== nativeType ||
    !(nativeType === "short" ? isShort(value.value) : isByte(value.value))) return null;
  return Object.freeze({ nativeType, value: Number(value.value) });
}

function readClassLevels(value: unknown): readonly number[] | null {
  if (!Array.isArray(value) || value.length > 8 || value.some((entry) => !isByte(entry))) {
    return null;
  }
  const levels = value.map(Number);
  return levels.reduce((sum, level) => sum + level, 0) <= 180
    ? Object.freeze(levels)
    : null;
}

function readRacialTypes(
  value: unknown,
): SceneObjectCreatureHitPointRacialTypesBinding | null {
  const keys = [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
    "rowIndex", "constitutionAdjust",
  ] as const;
  if (!isPlainRecord(value) || !hasExactRecordKeys(value, keys) ||
    value.resourceName !== "racialtypes.2da" ||
    typeof value.sourceObjectKey !== "string" || value.sourceObjectKey.length < 1 ||
    value.sourceObjectKey.length > 2048 ||
    (value.sourceLayer !== "module" && value.sourceLayer !== "hak" &&
      value.sourceLayer !== "vanilla") ||
    typeof value.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(value.sha256) ||
    !Number.isSafeInteger(value.sizeBytes) || Number(value.sizeBytes) < 1 ||
    Number(value.sizeBytes) > MAX_SOURCE_BYTES ||
    !Number.isSafeInteger(value.rowCount) || Number(value.rowCount) < 1 ||
    Number(value.rowCount) > MAX_ROWS || !isByte(value.rowIndex) ||
    Number(value.rowIndex) >= Number(value.rowCount) || !isInt32(value.constitutionAdjust)) {
    return null;
  }
  return Object.freeze({
    resourceName: "racialtypes.2da",
    sourceObjectKey: value.sourceObjectKey,
    sourceLayer: value.sourceLayer,
    sha256: value.sha256,
    sizeBytes: Number(value.sizeBytes),
    rowCount: Number(value.rowCount),
    rowIndex: Number(value.rowIndex),
    constitutionAdjust: Number(value.constitutionAdjust),
  });
}

export function readCreatureHitPointState(
  value: unknown,
): SceneObjectCreatureHitPointState | null {
  if (!isPlainRecord(value)) return null;
  if (hasExactRecordKeys(value, ["present"]) && value.present === false) {
    return Object.freeze({ present: false });
  }
  const hasRacialTypes = Object.prototype.hasOwnProperty.call(value, "racialTypes");
  const keys = [
    "present", "hitPoints", "currentHitPoints", "maxHitPoints", "constitution", "race",
    "classLevels", "featRow40Present", ...(hasRacialTypes ? ["racialTypes"] : []),
  ];
  if (!hasExactRecordKeys(value, keys) || value.present !== true ||
    typeof value.featRow40Present !== "boolean") return null;
  const hitPoints = readNativeNumber(value.hitPoints, "short");
  const currentHitPoints = readNativeNumber(value.currentHitPoints, "short");
  const maxHitPoints = readNativeNumber(value.maxHitPoints, "short");
  const constitution = readNativeNumber(value.constitution, "byte");
  const race = readNativeNumber(value.race, "byte");
  const classLevels = readClassLevels(value.classLevels);
  const racialTypes = hasRacialTypes ? readRacialTypes(value.racialTypes) : undefined;
  if (!hitPoints || hitPoints.nativeType !== "short" || hitPoints.value < 1 ||
    hitPoints.value > 10_000 || !currentHitPoints ||
    currentHitPoints.nativeType !== "short" || !maxHitPoints ||
    maxHitPoints.nativeType !== "short" || !constitution ||
    constitution.nativeType !== "byte" || !race || race.nativeType !== "byte" ||
    !classLevels || hasRacialTypes && !racialTypes ||
    racialTypes && racialTypes.rowIndex !== race.value) return null;
  return Object.freeze({
    present: true,
    hitPoints: Object.freeze({ nativeType: "short", value: hitPoints.value }),
    currentHitPoints: Object.freeze({
      nativeType: "short",
      value: currentHitPoints.value,
    }),
    maxHitPoints: Object.freeze({ nativeType: "short", value: maxHitPoints.value }),
    constitution: Object.freeze({ nativeType: "byte", value: constitution.value }),
    race: Object.freeze({ nativeType: "byte", value: race.value }),
    classLevels,
    featRow40Present: value.featRow40Present,
    ...(racialTypes ? { racialTypes } : {}),
  });
}

export function calculateCreatureAbilityModifier(score: number): number | null {
  return isInt32(score) ? Math.trunc(score / 2) - 5 : null;
}

export function calculateCreatureHitPoints(input: Readonly<{
  baseHitPoints: number;
  constitution: number;
  racialConstitutionAdjust: number;
  classLevels: readonly number[];
  featRow40Present: boolean;
}>): CreatureHitPointCalculation | null {
  if (!Number.isSafeInteger(input.baseHitPoints) || input.baseHitPoints < 1 ||
    input.baseHitPoints > 10_000 || !isByte(input.constitution) ||
    !isInt32(input.racialConstitutionAdjust) || typeof input.featRow40Present !== "boolean") {
    return null;
  }
  const classLevels = readClassLevels(input.classLevels);
  if (!classLevels) return null;
  const levelCount = classLevels.reduce((sum, level) => sum + level, 0);
  const effectiveConstitution = (input.constitution + input.racialConstitutionAdjust) | 0;
  const constitutionModifier = calculateCreatureAbilityModifier(effectiveConstitution);
  if (constitutionModifier === null) return null;
  const ordinaryBonus = Math.imul(levelCount, constitutionModifier);
  const ordinaryMaximum = Math.max((input.baseHitPoints + ordinaryBonus) | 0, levelCount);
  const featBonus = input.featRow40Present ? levelCount : 0;
  const maxHitPoints = (ordinaryMaximum + featBonus) | 0;
  const constitutionBonus = (ordinaryBonus + featBonus) | 0;
  const minimumBaseHitPoints = Math.max(1, levelCount - ordinaryBonus);
  if (!isShort(ordinaryMaximum) || !isShort(maxHitPoints) || minimumBaseHitPoints > 10_000) {
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

export function deriveExistingCreatureHitPointTarget(
  sourceInput: unknown,
  target: Readonly<{
    baseHitPoints: number;
    constitution: number;
    classLevels?: readonly number[];
    featRow40Present?: boolean;
  }>,
): ExistingCreatureHitPointTarget | null {
  const source = readCreatureHitPointState(sourceInput);
  if (!source?.present || !source.racialTypes || !isByte(target.constitution)) return null;
  const sourceCommon = {
    racialConstitutionAdjust: source.racialTypes.constitutionAdjust,
    classLevels: source.classLevels,
  };
  const loaded = calculateCreatureHitPoints({
    ...sourceCommon,
    baseHitPoints: source.hitPoints.value,
    constitution: source.constitution.value,
    featRow40Present: source.featRow40Present,
  });
  const next = calculateCreatureHitPoints({
    ...sourceCommon,
    classLevels: target.classLevels ?? source.classLevels,
    baseHitPoints: target.baseHitPoints,
    constitution: target.constitution,
    featRow40Present: target.featRow40Present ?? source.featRow40Present,
  });
  if (!loaded || !next || source.hitPoints.value < loaded.minimumBaseHitPoints ||
    target.baseHitPoints < next.minimumBaseHitPoints) return null;
  const targetBonus = next.maxHitPoints - target.baseHitPoints;
  let currentHitPoints = target.baseHitPoints;
  if (loaded.maxHitPoints > 0 && currentHitPoints + targetBonus > 0) {
    currentHitPoints = loaded.maxHitPoints - targetBonus;
  } else if (loaded.maxHitPoints <= 0 && currentHitPoints + targetBonus < 1) {
    currentHitPoints = 1 - targetBonus;
  }
  if (!isShort(currentHitPoints)) return null;
  return Object.freeze({
    hitPoints: target.baseHitPoints,
    currentHitPoints,
    maxHitPoints: next.maxHitPoints,
    constitution: target.constitution,
  });
}
