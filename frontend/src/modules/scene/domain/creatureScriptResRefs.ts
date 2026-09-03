import { hasExactRecordKeys, isPlainRecord } from "./auroraObjectTag";

export const CREATURE_SCRIPT_RESREF_FIELDS = Object.freeze([
  Object.freeze({ key: "onHeartbeat", nativeLabel: "ScriptHeartbeat" }),
  Object.freeze({ key: "onPerception", nativeLabel: "ScriptOnNotice" }),
  Object.freeze({ key: "onSpellCastAt", nativeLabel: "ScriptSpellAt" }),
  Object.freeze({ key: "onPhysicalAttacked", nativeLabel: "ScriptAttacked" }),
  Object.freeze({ key: "onDamaged", nativeLabel: "ScriptDamaged" }),
  Object.freeze({ key: "onDisturbed", nativeLabel: "ScriptDisturbed" }),
  Object.freeze({ key: "onCombatRoundEnd", nativeLabel: "ScriptEndRound" }),
  Object.freeze({ key: "onConversation", nativeLabel: "ScriptDialogue" }),
  Object.freeze({ key: "onSpawn", nativeLabel: "ScriptSpawn" }),
  Object.freeze({ key: "onRested", nativeLabel: "ScriptRested" }),
  Object.freeze({ key: "onDeath", nativeLabel: "ScriptDeath" }),
  Object.freeze({ key: "onUserDefined", nativeLabel: "ScriptUserDefine" }),
  Object.freeze({ key: "onBlocked", nativeLabel: "ScriptOnBlocked" }),
] as const);

export type CreatureScriptResRefKey =
  (typeof CREATURE_SCRIPT_RESREF_FIELDS)[number]["key"];

export type CreatureScriptResRefStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "resref"; value: string }>;

export type CreatureScriptResRefsStorage = Readonly<
  Record<CreatureScriptResRefKey, CreatureScriptResRefStorage>
>;

export interface CreatureScriptResRefProvenance {
  readonly expectedResRef: string;
}

export type CreatureScriptResRefsProvenance = Readonly<
  Partial<Record<CreatureScriptResRefKey, CreatureScriptResRefProvenance>>
>;

const SOURCE_RESREF_PATTERN = /^[A-Za-z0-9_]{0,16}$/u;
const TARGET_RESREF_PATTERN = /^[a-z0-9_]{0,16}$/u;

export function isCreatureScriptSourceResRef(value: unknown): value is string {
  return typeof value === "string" && SOURCE_RESREF_PATTERN.test(value);
}

export function isCreatureScriptTargetResRef(value: unknown): value is string {
  return typeof value === "string" && TARGET_RESREF_PATTERN.test(value);
}

export function readCreatureScriptResRefStorage(
  input: unknown,
): CreatureScriptResRefStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactRecordKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactRecordKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "resref" &&
    isCreatureScriptSourceResRef(input.value)
  ) {
    return Object.freeze({
      present: true,
      nativeType: "resref",
      value: input.value,
    });
  }
  return null;
}

export function readCreatureScriptResRefsStorage(
  input: unknown,
): CreatureScriptResRefsStorage | null {
  if (!isPlainRecord(input)) return null;
  const keys = CREATURE_SCRIPT_RESREF_FIELDS.map(({ key }) => key);
  if (!hasExactRecordKeys(input, keys)) return null;
  const parsed = {} as Record<CreatureScriptResRefKey, CreatureScriptResRefStorage>;
  for (const { key } of CREATURE_SCRIPT_RESREF_FIELDS) {
    const member = readCreatureScriptResRefStorage(input[key]);
    if (!member) return null;
    parsed[key] = member;
  }
  return Object.freeze(parsed);
}

export function readCreatureScriptResRefsProvenance(
  input: unknown,
): CreatureScriptResRefsProvenance | null {
  if (!isPlainRecord(input)) return null;
  const keys = Object.keys(input);
  const admittedKeys = new Set(
    CREATURE_SCRIPT_RESREF_FIELDS.map(({ key }) => key),
  );
  if (
    keys.length === 0 ||
    keys.some((key) => !admittedKeys.has(key as CreatureScriptResRefKey))
  ) {
    return null;
  }
  const parsed: Partial<Record<CreatureScriptResRefKey, CreatureScriptResRefProvenance>> = {};
  for (const { key } of CREATURE_SCRIPT_RESREF_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) continue;
    const member = input[key];
    if (
      !isPlainRecord(member) ||
      !hasExactRecordKeys(member, ["expectedResRef"]) ||
      !isCreatureScriptSourceResRef(member.expectedResRef)
    ) {
      return null;
    }
    parsed[key] = Object.freeze({ expectedResRef: member.expectedResRef });
  }
  return Object.freeze(parsed);
}
