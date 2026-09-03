export const AREA_STORE_COMMERCE_TELEMETRY = Symbol(
  "AREA_STORE_COMMERCE_TELEMETRY",
);

export type AreaStoreCommerceTelemetryOperation =
  | "parse_source"
  | "admit_profile"
  | "plan"
  | "write"
  | "readback";

export interface AreaStoreCommerceTelemetryEvent {
  readonly eventName: "area_store_commerce_cas.v1";
  readonly operation: AreaStoreCommerceTelemetryOperation;
  readonly outcome: "succeeded" | "failed";
  readonly resultCode: string;
  readonly changedFieldCount: number;
  readonly durationMs: number;
}

export interface AreaStoreCommerceTelemetryPort {
  emit(event: AreaStoreCommerceTelemetryEvent): void;
}
