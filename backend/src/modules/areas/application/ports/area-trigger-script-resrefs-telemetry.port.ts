export const AREA_TRIGGER_SCRIPT_RESREFS_TELEMETRY = Symbol(
  "AREA_TRIGGER_SCRIPT_RESREFS_TELEMETRY",
);

export type AreaTriggerScriptResRefsTelemetryOperation =
  | "parse_source"
  | "plan"
  | "write"
  | "readback";

export interface AreaTriggerScriptResRefsTelemetryEvent {
  readonly eventName: "area_trigger_script_resrefs_cas.v1";
  readonly operation: AreaTriggerScriptResRefsTelemetryOperation;
  readonly outcome: "succeeded" | "failed";
  readonly resultCode: string;
  readonly changedFieldCount: number;
  readonly durationMs: number;
}

export interface AreaTriggerScriptResRefsTelemetryPort {
  emit(event: AreaTriggerScriptResRefsTelemetryEvent): void;
}
