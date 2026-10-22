export const AREA_TRIGGER_VARIABLE_TABLE_TELEMETRY = Symbol(
  "AREA_TRIGGER_VARIABLE_TABLE_TELEMETRY",
);

export type AreaTriggerVariableTableTelemetryOperation =
  | "parse_source"
  | "plan"
  | "write"
  | "readback";

export interface AreaTriggerVariableTableTelemetryEvent {
  readonly eventName: "area_trigger_variable_table_cas.v1";
  readonly operation: AreaTriggerVariableTableTelemetryOperation;
  readonly outcome: "succeeded" | "failed";
  readonly resultCode: string;
  readonly changedEntryCount: number;
  readonly durationMs: number;
}

export interface AreaTriggerVariableTableTelemetryPort {
  emit(event: AreaTriggerVariableTableTelemetryEvent): void;
}
