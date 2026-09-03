export const AREA_STORE_VARIABLE_TABLE_TELEMETRY = Symbol(
  "AREA_STORE_VARIABLE_TABLE_TELEMETRY",
);

export type AreaStoreVariableTableTelemetryOperation =
  | "parse_source"
  | "admit_profile"
  | "plan"
  | "write"
  | "readback";

export interface AreaStoreVariableTableTelemetryEvent {
  readonly eventName: "area_store_variable_table_cas.v1";
  readonly operation: AreaStoreVariableTableTelemetryOperation;
  readonly outcome: "succeeded" | "failed";
  readonly resultCode: string;
  readonly entryCount: number;
  readonly durationMs: number;
}

export interface AreaStoreVariableTableTelemetryPort {
  emit(event: AreaStoreVariableTableTelemetryEvent): void;
}
