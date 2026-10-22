import type { SceneObjectSourceMetadata } from "../contracts";

export const MAX_TRIGGER_KEY_NAME_CODE_UNITS = 256;

const CORE_PROPERTY_KEYS = Object.freeze([
  "autoRemoveKey",
  "factionId",
  "cursorId",
  "highlightHeight",
  "keyName",
  "portraitId",
  "triggerType",
] as const);

export interface TriggerCoreProperties {
  readonly autoRemoveKey: 0 | 1;
  readonly factionId: number;
  readonly cursorId: number;
  readonly highlightHeight: number;
  readonly keyName: string;
  readonly portraitId: number;
  readonly triggerType: number;
}

export function isTriggerCoreProperties(value: unknown): value is TriggerCoreProperties {
  if (!isPlainRecord(value) || !hasExactKeys(value, CORE_PROPERTY_KEYS)) return false;
  return (value.autoRemoveKey === 0 || value.autoRemoveKey === 1)
    && isUint(value.factionId, 0xffff_ffff)
    && isUint(value.cursorId, 0xff)
    && typeof value.highlightHeight === "number"
    && Number.isFinite(value.highlightHeight)
    && Math.fround(value.highlightHeight) === value.highlightHeight
    && typeof value.keyName === "string"
    && value.keyName.length <= MAX_TRIGGER_KEY_NAME_CODE_UNITS
    && !value.keyName.includes("\0")
    && isUint(value.portraitId, 0xffff)
    && typeof value.triggerType === "number"
    && Number.isInteger(value.triggerType)
    && value.triggerType >= -0x8000_0000
    && value.triggerType <= 0x7fff_ffff;
}

export function cloneTriggerCoreProperties(
  value: TriggerCoreProperties,
): TriggerCoreProperties {
  return Object.freeze({ ...value });
}

export function triggerCorePropertiesEqual(left: unknown, right: unknown): boolean {
  return isTriggerCoreProperties(left)
    && isTriggerCoreProperties(right)
    && CORE_PROPERTY_KEYS.every((key) => left[key] === right[key]);
}

export function canEditExistingTriggerCoreProperties(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git"
    && source.sourceKind === "trigger"
    && Number.isSafeInteger(source.sourceIndex)
    && Number(source.sourceIndex) >= 0
    && isTriggerCoreProperties(source.triggerCoreProperties);
}

function isUint(value: unknown, maximum: number): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= maximum;
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
