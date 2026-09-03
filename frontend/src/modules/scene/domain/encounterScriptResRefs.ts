import type { SceneObjectSourceMetadata } from "../contracts";

export const ENCOUNTER_SCRIPT_RESREF_MAX_CODE_UNITS = 16;
export const ENCOUNTER_SCRIPT_RESREF_FIELDS = Object.freeze([
  Object.freeze({ key: "onEntered", label: "OnEntered", uiLabel: "On Enter" }),
  Object.freeze({ key: "onExit", label: "OnExit", uiLabel: "On Exit" }),
  Object.freeze({ key: "onExhausted", label: "OnExhausted", uiLabel: "On Exhausted" }),
  Object.freeze({ key: "onHeartbeat", label: "OnHeartbeat", uiLabel: "On Heartbeat" }),
  Object.freeze({ key: "onUserDefined", label: "OnUserDefined", uiLabel: "On User Defined" }),
] as const);

export type EncounterScriptResRefField =
  (typeof ENCOUNTER_SCRIPT_RESREF_FIELDS)[number]["key"];

export interface EncounterScriptResRefsStorage {
  readonly onEntered: string;
  readonly onExit: string;
  readonly onExhausted: string;
  readonly onHeartbeat: string;
  readonly onUserDefined: string;
}

const STORAGE_KEYS = ENCOUNTER_SCRIPT_RESREF_FIELDS.map((field) => field.key);
const SOURCE_RESREF_PATTERN = /^[A-Za-z0-9_]{0,16}$/u;
const TARGET_RESREF_PATTERN = /^[a-z0-9_]{0,16}$/u;

export function isEncounterScriptTargetResRef(value: unknown): value is string {
  return typeof value === "string" && TARGET_RESREF_PATTERN.test(value);
}

export function readEncounterScriptResRefsStorage(
  value: unknown,
): EncounterScriptResRefsStorage | null {
  return readStorage(value, SOURCE_RESREF_PATTERN);
}

export function readEncounterScriptResRefsTargetStorage(
  value: unknown,
): EncounterScriptResRefsStorage | null {
  return readStorage(value, TARGET_RESREF_PATTERN);
}

export function cloneEncounterScriptResRefsStorage(
  value: EncounterScriptResRefsStorage,
): EncounterScriptResRefsStorage {
  const admitted = readEncounterScriptResRefsStorage(value);
  if (!admitted) throw new Error("Malformed retained Encounter script storage.");
  return admitted;
}

export function encounterScriptResRefsStoragesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const admittedLeft = readEncounterScriptResRefsStorage(left);
  const admittedRight = readEncounterScriptResRefsStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && ENCOUNTER_SCRIPT_RESREF_FIELDS.every(
      (field) => admittedLeft[field.key] === admittedRight[field.key],
    );
}

export function canEditExistingEncounterScriptResRefs(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git"
    && source.sourceKind === "encounter"
    && Number.isSafeInteger(source.sourceIndex)
    && Number(source.sourceIndex) >= 0
    && readEncounterScriptResRefsStorage(source.encounterScriptResRefsStorage) !== null;
}

function readStorage(
  value: unknown,
  pattern: RegExp,
): EncounterScriptResRefsStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS)) return null;
  for (const field of ENCOUNTER_SCRIPT_RESREF_FIELDS) {
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
