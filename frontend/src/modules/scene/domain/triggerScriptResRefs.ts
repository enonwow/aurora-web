import type { SceneObjectSourceMetadata } from "../contracts";

export const TRIGGER_SCRIPT_RESREF_MAX_CODE_UNITS = 16;
export const TRIGGER_SCRIPT_RESREF_FIELDS = Object.freeze([
  Object.freeze({ key: "onDisarm", label: "OnDisarm", uiLabel: "On Disarm" }),
  Object.freeze({
    key: "onTrapTriggered",
    label: "OnTrapTriggered",
    uiLabel: "On Trap Triggered",
  }),
  Object.freeze({ key: "onClick", label: "OnClick", uiLabel: "On Click" }),
  Object.freeze({
    key: "onHeartbeat",
    label: "ScriptHeartbeat",
    uiLabel: "On Heartbeat",
  }),
  Object.freeze({ key: "onEnter", label: "ScriptOnEnter", uiLabel: "On Enter" }),
  Object.freeze({ key: "onExit", label: "ScriptOnExit", uiLabel: "On Exit" }),
  Object.freeze({
    key: "onUserDefined",
    label: "ScriptUserDefine",
    uiLabel: "On User Defined",
  }),
] as const);

export type TriggerScriptResRefField =
  (typeof TRIGGER_SCRIPT_RESREF_FIELDS)[number]["key"];

export interface TriggerScriptResRefsStorage {
  readonly onDisarm: string;
  readonly onTrapTriggered: string;
  readonly onClick: string;
  readonly onHeartbeat: string;
  readonly onEnter: string;
  readonly onExit: string;
  readonly onUserDefined: string;
}

const STORAGE_KEYS = TRIGGER_SCRIPT_RESREF_FIELDS.map((field) => field.key);
const SOURCE_RESREF_PATTERN = /^[A-Za-z0-9_]{0,16}$/u;
const TARGET_RESREF_PATTERN = /^[a-z0-9_]{0,16}$/u;

export function isTriggerScriptTargetResRef(value: unknown): value is string {
  return typeof value === "string" && TARGET_RESREF_PATTERN.test(value);
}

export function readTriggerScriptResRefsStorage(
  value: unknown,
): TriggerScriptResRefsStorage | null {
  return readStorage(value, SOURCE_RESREF_PATTERN);
}

export function readTriggerScriptResRefsTargetStorage(
  value: unknown,
): TriggerScriptResRefsStorage | null {
  return readStorage(value, TARGET_RESREF_PATTERN);
}

export function cloneTriggerScriptResRefsStorage(
  value: TriggerScriptResRefsStorage,
): TriggerScriptResRefsStorage {
  const admitted = readTriggerScriptResRefsStorage(value);
  if (!admitted) throw new Error("Malformed retained Trigger script storage.");
  return admitted;
}

export function triggerScriptResRefsStoragesEqual(
  left: unknown,
  right: unknown,
): boolean {
  const admittedLeft = readTriggerScriptResRefsStorage(left);
  const admittedRight = readTriggerScriptResRefsStorage(right);
  return admittedLeft !== null
    && admittedRight !== null
    && TRIGGER_SCRIPT_RESREF_FIELDS.every(
      (field) => admittedLeft[field.key] === admittedRight[field.key],
    );
}

export function canEditExistingTriggerScriptResRefs(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return source?.type === "aurora_git"
    && source.sourceKind === "trigger"
    && Number.isSafeInteger(source.sourceIndex)
    && Number(source.sourceIndex) >= 0
    && readTriggerScriptResRefsStorage(source.triggerScriptResRefsStorage) !== null;
}

function readStorage(
  value: unknown,
  pattern: RegExp,
): TriggerScriptResRefsStorage | null {
  if (!isExactRecord(value, STORAGE_KEYS)) return null;
  for (const field of TRIGGER_SCRIPT_RESREF_FIELDS) {
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
