export const MAX_AREA_EVENT_SCRIPT_RESREF_BYTES = 16;

export const AREA_EVENT_SCRIPT_FIELDS = Object.freeze([
  Object.freeze({ slot: "onEnter" as const, field: "OnEnter" as const, label: "On Enter" }),
  Object.freeze({ slot: "onExit" as const, field: "OnExit" as const, label: "On Exit" }),
  Object.freeze({ slot: "onHeartbeat" as const, field: "OnHeartbeat" as const, label: "On Heartbeat" }),
  Object.freeze({ slot: "onUserDefined" as const, field: "OnUserDefined" as const, label: "On User Defined" }),
]);

export type AreaEventScriptSlot = (typeof AREA_EVENT_SCRIPT_FIELDS)[number]["slot"];
export type AreaEventScripts = Readonly<Partial<Record<AreaEventScriptSlot, string>>>;

export interface ExistingAreaEventScriptMutation {
  readonly expectedResRef: string;
  readonly resRef: string;
}

export type ExistingAreaEventScriptMutations = Readonly<
  Partial<Record<AreaEventScriptSlot, ExistingAreaEventScriptMutation>>
>;

export function isAreaEventScriptResRef(value: unknown): value is string {
  return typeof value === "string" && /^(?:|[a-z0-9_]{1,16})$/u.test(value);
}
