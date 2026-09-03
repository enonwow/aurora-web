export const AREA_TRIGGER_TRANSITION_STORAGE_TELEMETRY = Symbol(
  "AREA_TRIGGER_TRANSITION_STORAGE_TELEMETRY",
);

export type AreaTriggerTransitionStorageTelemetryOperation =
  | "parse_source"
  | "plan"
  | "write"
  | "readback";

export interface AreaTriggerTransitionStorageTelemetryEvent {
  readonly eventName: "area_trigger_transition_storage_cas.v1";
  readonly operation: AreaTriggerTransitionStorageTelemetryOperation;
  readonly outcome: "succeeded" | "failed";
  readonly resultCode: string;
  readonly changedFieldCount: number;
  readonly durationMs: number;
}

export interface AreaTriggerTransitionStorageTelemetryPort {
  emit(event: AreaTriggerTransitionStorageTelemetryEvent): void;
}
