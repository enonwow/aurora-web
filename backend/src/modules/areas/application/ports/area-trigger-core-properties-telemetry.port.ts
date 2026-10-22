export const AREA_TRIGGER_CORE_PROPERTIES_TELEMETRY = Symbol(
  "AREA_TRIGGER_CORE_PROPERTIES_TELEMETRY",
);

export type AreaTriggerCorePropertiesTelemetryOperation =
  | "parse_source"
  | "plan"
  | "write"
  | "readback";

export interface AreaTriggerCorePropertiesTelemetryEvent {
  readonly eventName: "area_trigger_core_properties_cas.v1";
  readonly operation: AreaTriggerCorePropertiesTelemetryOperation;
  readonly outcome: "succeeded" | "failed";
  readonly resultCode: string;
  readonly changedFieldCount: number;
  readonly durationMs: number;
}

export interface AreaTriggerCorePropertiesTelemetryPort {
  emit(event: AreaTriggerCorePropertiesTelemetryEvent): void;
}
