export const MAX_AREA_EVENT_SCRIPT_RESREF_BYTES = 16;

export const AREA_EVENT_SCRIPT_FIELDS = Object.freeze([
  Object.freeze({ slot: "onEnter" as const, field: "OnEnter" as const }),
  Object.freeze({ slot: "onExit" as const, field: "OnExit" as const }),
  Object.freeze({ slot: "onHeartbeat" as const, field: "OnHeartbeat" as const }),
  Object.freeze({ slot: "onUserDefined" as const, field: "OnUserDefined" as const }),
]);

export type AreaEventScriptSlot = (typeof AREA_EVENT_SCRIPT_FIELDS)[number]["slot"];
export type AreaEventScriptField = (typeof AREA_EVENT_SCRIPT_FIELDS)[number]["field"];

export type AreaEventScripts = Readonly<Partial<Record<AreaEventScriptSlot, string>>>;

export interface ExistingAreaEventScriptMutation {
  readonly expectedResRef: string;
  readonly resRef: string;
}

export type ExistingAreaEventScriptMutations = Readonly<
  Partial<Record<AreaEventScriptSlot, ExistingAreaEventScriptMutation>>
>;

const MUTATION_KEYS = Object.freeze(["expectedResRef", "resRef"] as const);

export function isAreaEventScriptResRef(value: unknown): value is string {
  return typeof value === "string"
    && /^(?:|[a-z0-9_]{1,16})$/u.test(value);
}

export function readExistingAreaEventScriptMutations(
  value: unknown,
): ExistingAreaEventScriptMutations | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value);
  if (keys.length === 0) return null;
  const admittedSlots = new Set(AREA_EVENT_SCRIPT_FIELDS.map((entry) => entry.slot));
  if (keys.some((key) => !admittedSlots.has(key as AreaEventScriptSlot))) return null;

  const result: Partial<Record<AreaEventScriptSlot, ExistingAreaEventScriptMutation>> = {};
  for (const { slot } of AREA_EVENT_SCRIPT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(value, slot)) continue;
    const candidate = value[slot];
    if (!isRecord(candidate) || !hasExactKeys(candidate, MUTATION_KEYS)) return null;
    if (
      !isAreaEventScriptResRef(candidate.expectedResRef)
      || !isAreaEventScriptResRef(candidate.resRef)
      || candidate.expectedResRef === candidate.resRef
    ) {
      return null;
    }
    result[slot] = Object.freeze({
      expectedResRef: candidate.expectedResRef,
      resRef: candidate.resRef,
    });
  }
  return Object.freeze(result);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length
    && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
