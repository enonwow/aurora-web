export const MAX_AREA_TRIGGER_KEY_NAME_CODE_UNITS = 256;

export const AREA_TRIGGER_CORE_PROPERTY_FIELDS = Object.freeze([
  Object.freeze({ key: "autoRemoveKey", label: "AutoRemoveKey", type: "byte" }),
  Object.freeze({ key: "factionId", label: "Faction", type: "dword" }),
  Object.freeze({ key: "cursorId", label: "Cursor", type: "byte" }),
  Object.freeze({ key: "highlightHeight", label: "HighlightHeight", type: "float" }),
  Object.freeze({ key: "keyName", label: "KeyName", type: "cexostring" }),
  Object.freeze({ key: "portraitId", label: "PortraitId", type: "word" }),
  Object.freeze({ key: "triggerType", label: "Type", type: "int" }),
] as const);

const CORE_PROPERTY_KEYS = Object.freeze([
  "autoRemoveKey",
  "factionId",
  "cursorId",
  "highlightHeight",
  "keyName",
  "portraitId",
  "triggerType",
] as const);
const MUTATION_KEYS = Object.freeze(["expectedValue", "value"] as const);

export interface AreaTriggerCoreProperties {
  readonly autoRemoveKey: 0 | 1;
  readonly factionId: number;
  readonly cursorId: number;
  readonly highlightHeight: number;
  readonly keyName: string;
  readonly portraitId: number;
  readonly triggerType: number;
}

export interface ExistingAreaTriggerCorePropertiesMutation {
  readonly expectedValue: AreaTriggerCoreProperties;
  readonly value: AreaTriggerCoreProperties;
}

export function isAreaTriggerCoreProperties(
  value: unknown,
): value is AreaTriggerCoreProperties {
  if (!isPlainRecord(value) || !hasExactKeys(value, CORE_PROPERTY_KEYS)) return false;
  return (value.autoRemoveKey === 0 || value.autoRemoveKey === 1)
    && isUint(value.factionId, 0xffff_ffff)
    && isUint(value.cursorId, 0xff)
    && typeof value.highlightHeight === "number"
    && Number.isFinite(value.highlightHeight)
    && Math.fround(value.highlightHeight) === value.highlightHeight
    && typeof value.keyName === "string"
    && value.keyName.length <= MAX_AREA_TRIGGER_KEY_NAME_CODE_UNITS
    && !value.keyName.includes("\0")
    && isUint(value.portraitId, 0xffff)
    && typeof value.triggerType === "number"
    && Number.isInteger(value.triggerType)
    && value.triggerType >= -0x8000_0000
    && value.triggerType <= 0x7fff_ffff;
}

export function areaTriggerCorePropertiesEqual(left: unknown, right: unknown): boolean {
  if (!isAreaTriggerCoreProperties(left) || !isAreaTriggerCoreProperties(right)) return false;
  return CORE_PROPERTY_KEYS.every((key) => left[key] === right[key]);
}

export function cloneAreaTriggerCoreProperties(
  value: AreaTriggerCoreProperties,
): AreaTriggerCoreProperties {
  return Object.freeze({ ...value });
}

export function readExistingAreaTriggerCorePropertiesMutation(
  value: unknown,
): ExistingAreaTriggerCorePropertiesMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, MUTATION_KEYS)
    || !isAreaTriggerCoreProperties(value.expectedValue)
    || !isAreaTriggerCoreProperties(value.value)
    || areaTriggerCorePropertiesEqual(value.expectedValue, value.value)) return null;
  return Object.freeze({
    expectedValue: cloneAreaTriggerCoreProperties(value.expectedValue),
    value: cloneAreaTriggerCoreProperties(value.value),
  });
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
