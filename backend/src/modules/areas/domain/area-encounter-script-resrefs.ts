export const AREA_ENCOUNTER_SCRIPT_RESREFS_STORAGE_REVISION =
  "aurora-area-encounter-script-resrefs-storage.v1" as const;

export const AREA_ENCOUNTER_SCRIPT_RESREF_FIELDS = Object.freeze([
  Object.freeze({ key: "onEntered", label: "OnEntered" }),
  Object.freeze({ key: "onExit", label: "OnExit" }),
  Object.freeze({ key: "onExhausted", label: "OnExhausted" }),
  Object.freeze({ key: "onHeartbeat", label: "OnHeartbeat" }),
  Object.freeze({ key: "onUserDefined", label: "OnUserDefined" }),
] as const);

export interface AreaEncounterScriptResRefsStorage {
  readonly onEntered: string;
  readonly onExit: string;
  readonly onExhausted: string;
  readonly onHeartbeat: string;
  readonly onUserDefined: string;
}

export interface ExistingAreaEncounterScriptResRefsMutation {
  readonly expectedValue: AreaEncounterScriptResRefsStorage;
  readonly value: AreaEncounterScriptResRefsStorage;
}

const STORAGE_KEYS = AREA_ENCOUNTER_SCRIPT_RESREF_FIELDS.map((field) => field.key);
const MUTATION_KEYS = Object.freeze(["expectedValue", "value"]);
const SOURCE_RESREF_PATTERN = /^[A-Za-z0-9_]{0,16}$/u;
const TARGET_RESREF_PATTERN = /^[a-z0-9_]{0,16}$/u;

export function readAreaEncounterScriptResRefsStorage(
  value: unknown,
): AreaEncounterScriptResRefsStorage | null {
  return readStorage(value, SOURCE_RESREF_PATTERN);
}

export function readAreaEncounterScriptResRefsTargetStorage(
  value: unknown,
): AreaEncounterScriptResRefsStorage | null {
  return readStorage(value, TARGET_RESREF_PATTERN);
}

export function cloneAreaEncounterScriptResRefsStorage(
  value: AreaEncounterScriptResRefsStorage,
): AreaEncounterScriptResRefsStorage {
  return Object.freeze({ ...value });
}

export function areaEncounterScriptResRefsStoragesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const admittedLeft = readAreaEncounterScriptResRefsStorage(left);
  const admittedRight = readAreaEncounterScriptResRefsStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && AREA_ENCOUNTER_SCRIPT_RESREF_FIELDS.every(
      (field) => admittedLeft[field.key] === admittedRight[field.key],
    );
}

export function readExistingAreaEncounterScriptResRefsMutation(
  value: unknown,
): ExistingAreaEncounterScriptResRefsMutation | null {
  if (!isExactRecord(value, MUTATION_KEYS)) return null;
  const expectedValue = readAreaEncounterScriptResRefsStorage(value.expectedValue);
  const targetValue = readAreaEncounterScriptResRefsTargetStorage(value.value);
  if (
    !expectedValue
    || !targetValue
    || areaEncounterScriptResRefsStoragesEqual(expectedValue, targetValue)
  ) return null;
  return Object.freeze({ expectedValue, value: targetValue });
}

function readStorage(
  value: unknown,
  pattern: RegExp,
): AreaEncounterScriptResRefsStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS)) return null;
  for (const field of AREA_ENCOUNTER_SCRIPT_RESREF_FIELDS) {
    const candidate = value[field.key];
    if (typeof candidate !== "string" || !pattern.test(candidate)) return null;
  }
  return Object.freeze({
    onEntered: String(value.onEntered),
    onExit: String(value.onExit),
    onExhausted: String(value.onExhausted),
    onHeartbeat: String(value.onHeartbeat),
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
