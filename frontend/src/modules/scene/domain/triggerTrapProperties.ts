import type { SceneObjectSourceMetadata } from "../contracts";

const TRAP_PROPERTY_KEYS = Object.freeze([
  "trapDetectable",
  "trapDetectDc",
  "trapDisarmable",
  "disarmDc",
  "trapFlag",
  "trapOneShot",
  "trapType",
] as const);

export interface TriggerTrapProperties {
  readonly trapDetectable: number;
  readonly trapDetectDc: number;
  readonly trapDisarmable: number;
  readonly disarmDc: number;
  readonly trapFlag: number;
  readonly trapOneShot: number;
  readonly trapType: number;
}

export function isTriggerTrapProperties(value: unknown): value is TriggerTrapProperties {
  if (!isPlainRecord(value) || !hasExactKeys(value, TRAP_PROPERTY_KEYS)) return false;
  return TRAP_PROPERTY_KEYS.every((key) => isByte(value[key]));
}

export function cloneTriggerTrapProperties(
  value: TriggerTrapProperties,
): TriggerTrapProperties {
  return Object.freeze({ ...value });
}

export function triggerTrapPropertiesEqual(left: unknown, right: unknown): boolean {
  return isTriggerTrapProperties(left)
    && isTriggerTrapProperties(right)
    && TRAP_PROPERTY_KEYS.every((key) => left[key] === right[key]);
}

export function canEditExistingTriggerTrapProperties(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git"
    && source.sourceKind === "trigger"
    && Number.isSafeInteger(source.sourceIndex)
    && Number(source.sourceIndex) >= 0
    && isTriggerTrapProperties(source.triggerTrapProperties);
}

function isByte(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 0xff;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}
