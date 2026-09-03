export const AREA_CREATURE_SCRIPT_RESREF_FIELDS = Object.freeze([
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

export type AreaCreatureScriptResRefKey =
  (typeof AREA_CREATURE_SCRIPT_RESREF_FIELDS)[number]["key"];
export type AreaCreatureScriptNativeLabel =
  (typeof AREA_CREATURE_SCRIPT_RESREF_FIELDS)[number]["nativeLabel"];

export type AreaCreatureScriptResRefStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "resref"; value: string }>;

export type AreaCreatureScriptResRefsStorage = Readonly<
  Record<AreaCreatureScriptResRefKey, AreaCreatureScriptResRefStorage>
>;

export interface ExistingAreaCreatureScriptResRefMutation {
  readonly field: AreaCreatureScriptNativeLabel;
  readonly expectedResRef: string;
  readonly resRef: string;
}

const SOURCE_RESREF_PATTERN = /^[A-Za-z0-9_]{0,16}$/u;
const TARGET_RESREF_PATTERN = /^[a-z0-9_]{0,16}$/u;
const nativeFieldOrder = new Map<AreaCreatureScriptNativeLabel, number>(
  AREA_CREATURE_SCRIPT_RESREF_FIELDS.map((field, index) => [field.nativeLabel, index]),
);

export function isAreaCreatureScriptSourceResRef(value: unknown): value is string {
  return typeof value === "string" && SOURCE_RESREF_PATTERN.test(value);
}

export function isAreaCreatureScriptTargetResRef(value: unknown): value is string {
  return typeof value === "string" && TARGET_RESREF_PATTERN.test(value);
}

export function readAreaCreatureScriptResRefStorage(
  input: unknown,
): AreaCreatureScriptResRefStorage | null {
  if (!isPlainRecord(input)) return null;
  if (hasExactKeys(input, ["present"]) && input.present === false) {
    return Object.freeze({ present: false });
  }
  if (
    hasExactKeys(input, ["present", "nativeType", "value"]) &&
    input.present === true &&
    input.nativeType === "resref" &&
    isAreaCreatureScriptSourceResRef(input.value)
  ) {
    return Object.freeze({ present: true, nativeType: "resref", value: input.value });
  }
  return null;
}

export function readAreaCreatureScriptResRefsStorage(
  input: unknown,
): AreaCreatureScriptResRefsStorage | null {
  if (!isPlainRecord(input)) return null;
  const keys = AREA_CREATURE_SCRIPT_RESREF_FIELDS.map(({ key }) => key);
  if (!hasExactKeys(input, keys)) return null;

  const parsed = {} as Record<AreaCreatureScriptResRefKey, AreaCreatureScriptResRefStorage>;
  for (const { key } of AREA_CREATURE_SCRIPT_RESREF_FIELDS) {
    const member = readAreaCreatureScriptResRefStorage(input[key]);
    if (!member) return null;
    parsed[key] = member;
  }
  return Object.freeze(parsed);
}

export function readExistingAreaCreatureScriptResRefMutations(
  input: unknown,
): readonly ExistingAreaCreatureScriptResRefMutation[] | null {
  if (!Array.isArray(input) || input.length < 1 || input.length > AREA_CREATURE_SCRIPT_RESREF_FIELDS.length) {
    return null;
  }

  const parsed: ExistingAreaCreatureScriptResRefMutation[] = [];
  let previousOrder = -1;
  for (const entry of input) {
    if (!isPlainRecord(entry) || !hasExactKeys(entry, ["field", "expectedResRef", "resRef"])) {
      return null;
    }
    const order = typeof entry.field === "string"
      ? nativeFieldOrder.get(entry.field as AreaCreatureScriptNativeLabel)
      : undefined;
    if (
      order === undefined ||
      order <= previousOrder ||
      !isAreaCreatureScriptSourceResRef(entry.expectedResRef) ||
      !isAreaCreatureScriptTargetResRef(entry.resRef) ||
      entry.expectedResRef === entry.resRef
    ) {
      return null;
    }
    previousOrder = order;
    parsed.push(Object.freeze({
      field: entry.field as AreaCreatureScriptNativeLabel,
      expectedResRef: entry.expectedResRef,
      resRef: entry.resRef,
    }));
  }
  return Object.freeze(parsed);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): boolean {
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length && actualKeys.every((key) => keys.includes(key));
}
