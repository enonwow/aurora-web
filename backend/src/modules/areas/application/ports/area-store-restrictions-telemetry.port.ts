export const AREA_STORE_RESTRICTIONS_TELEMETRY = Symbol(
  "AREA_STORE_RESTRICTIONS_TELEMETRY",
);

export type AreaStoreRestrictionsTelemetryOperation =
  | "parse_source"
  | "bind_catalog"
  | "admit_profile"
  | "plan"
  | "write"
  | "readback";

export interface AreaStoreRestrictionsTelemetryEvent {
  readonly eventName: "area_store_restrictions_cas.v1";
  readonly operation: AreaStoreRestrictionsTelemetryOperation;
  readonly outcome: "succeeded" | "failed";
  readonly resultCode: string;
  readonly entryCount: number;
  readonly changedListCount: number;
  readonly durationMs: number;
}

export interface AreaStoreRestrictionsTelemetryPort {
  emit(event: AreaStoreRestrictionsTelemetryEvent): void;
}
