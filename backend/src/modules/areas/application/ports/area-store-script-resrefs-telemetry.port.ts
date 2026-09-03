export const AREA_STORE_SCRIPT_RESREFS_TELEMETRY = Symbol(
  "AREA_STORE_SCRIPT_RESREFS_TELEMETRY",
);

export type AreaStoreScriptResRefsTelemetryOperation =
  | "parse_source"
  | "admit_profile"
  | "plan"
  | "write"
  | "readback";

export interface AreaStoreScriptResRefsTelemetryEvent {
  readonly eventName: "area_store_script_resrefs_cas.v1";
  readonly operation: AreaStoreScriptResRefsTelemetryOperation;
  readonly outcome: "succeeded" | "failed";
  readonly resultCode: string;
  readonly changedFieldCount: number;
  readonly durationMs: number;
}

export interface AreaStoreScriptResRefsTelemetryPort {
  emit(event: AreaStoreScriptResRefsTelemetryEvent): void;
}
