export const AREA_TRIGGER_SCRIPT_RESREFS_STORAGE_REVISION =
  "aurora-area-trigger-script-resrefs-storage.v1" as const;

export const AREA_TRIGGER_SCRIPT_RESREF_FIELDS = Object.freeze([
  Object.freeze({ key: "onDisarm", label: "OnDisarm" }),
  Object.freeze({ key: "onTrapTriggered", label: "OnTrapTriggered" }),
  Object.freeze({ key: "onClick", label: "OnClick" }),
  Object.freeze({ key: "onHeartbeat", label: "ScriptHeartbeat" }),
  Object.freeze({ key: "onEnter", label: "ScriptOnEnter" }),
  Object.freeze({ key: "onExit", label: "ScriptOnExit" }),
  Object.freeze({ key: "onUserDefined", label: "ScriptUserDefine" }),
] as const);

export interface AreaTriggerScriptResRefsStorage {
  readonly onDisarm: string;
  readonly onTrapTriggered: string;
  readonly onClick: string;
  readonly onHeartbeat: string;
  readonly onEnter: string;
  readonly onExit: string;
  readonly onUserDefined: string;
}

export interface ExistingAreaTriggerScriptResRefsMutation {
  readonly expectedValue: AreaTriggerScriptResRefsStorage;
  readonly value: AreaTriggerScriptResRefsStorage;
}

const STORAGE_KEYS = AREA_TRIGGER_SCRIPT_RESREF_FIELDS.map((field) => field.key);
const MUTATION_KEYS = Object.freeze(["expectedValue", "value"]);
const SOURCE_RESREF_PATTERN = /^[A-Za-z0-9_]{0,16}$/u;
const TARGET_RESREF_PATTERN = /^[a-z0-9_]{0,16}$/u;

export function readAreaTriggerScriptResRefsStorage(
  value: unknown,
): AreaTriggerScriptResRefsStorage | null {
  return readStorage(value, SOURCE_RESREF_PATTERN);
}

export function readAreaTriggerScriptResRefsTargetStorage(
  value: unknown,
): AreaTriggerScriptResRefsStorage | null {
  return readStorage(value, TARGET_RESREF_PATTERN);
}

export function cloneAreaTriggerScriptResRefsStorage(
  value: AreaTriggerScriptResRefsStorage,
): AreaTriggerScriptResRefsStorage {
  return Object.freeze({ ...value });
}

export function areaTriggerScriptResRefsStoragesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const admittedLeft = readAreaTriggerScriptResRefsStorage(left);
  const admittedRight = readAreaTriggerScriptResRefsStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && AREA_TRIGGER_SCRIPT_RESREF_FIELDS.every(
      (field) => admittedLeft[field.key] === admittedRight[field.key],
    );
}

export function readExistingAreaTriggerScriptResRefsMutation(
  value: unknown,
): ExistingAreaTriggerScriptResRefsMutation | null {
  if (!isExactRecord(value, MUTATION_KEYS)) return null;
  const expectedValue = readAreaTriggerScriptResRefsStorage(value.expectedValue);
  const targetValue = readAreaTriggerScriptResRefsTargetStorage(value.value);
  if (
    !expectedValue
    || !targetValue
    || areaTriggerScriptResRefsStoragesEqual(expectedValue, targetValue)
  ) return null;
  return Object.freeze({ expectedValue, value: targetValue });
}

function readStorage(
  value: unknown,
  pattern: RegExp,
): AreaTriggerScriptResRefsStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS)) return null;
  for (const field of AREA_TRIGGER_SCRIPT_RESREF_FIELDS) {
    const candidate = value[field.key];
    if (typeof candidate !== "string" || !pattern.test(candidate)) return null;
  }
  return Object.freeze({
    onDisarm: String(value.onDisarm),
    onTrapTriggered: String(value.onTrapTriggered),
    onClick: String(value.onClick),
    onHeartbeat: String(value.onHeartbeat),
    onEnter: String(value.onEnter),
    onExit: String(value.onExit),
    onUserDefined: String(value.onUserDefined),
  });
}

function isExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === expectedKeys.length
    && expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
