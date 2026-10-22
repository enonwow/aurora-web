export const AREA_TRIGGER_TRAP_PROPERTIES_TELEMETRY = Symbol(
  "AREA_TRIGGER_TRAP_PROPERTIES_TELEMETRY",
);

export type AreaTriggerTrapPropertiesTelemetryOperation =
  | "parse_source"
  | "plan"
  | "write"
  | "readback";

export interface AreaTriggerTrapPropertiesTelemetryEvent {
  readonly eventName: "area_trigger_trap_properties_cas.v1";
  readonly operation: AreaTriggerTrapPropertiesTelemetryOperation;
  readonly outcome: "succeeded" | "failed";
  readonly resultCode: string;
  readonly changedFieldCount: number;
  readonly durationMs: number;
}

export interface AreaTriggerTrapPropertiesTelemetryPort {
  emit(event: AreaTriggerTrapPropertiesTelemetryEvent): void;
}
