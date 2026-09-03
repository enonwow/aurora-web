export const AREA_STORE_INVENTORY_TELEMETRY = Symbol(
  "AREA_STORE_INVENTORY_TELEMETRY",
);

export type AreaStoreInventoryTelemetryOperation =
  | "parse_source"
  | "bind_catalog"
  | "admit_profile"
  | "plan"
  | "pack"
  | "write"
  | "readback";

export interface AreaStoreInventoryTelemetryEvent {
  readonly eventName: "area_store_inventory_cas.v1";
  readonly operation: AreaStoreInventoryTelemetryOperation;
  readonly outcome: "succeeded" | "failed";
  readonly resultCode: string;
  readonly bucketCount: number;
  readonly entryCount: number;
  readonly changedEntryCount: number;
  readonly durationMs: number;
}

export interface AreaStoreInventoryTelemetryPort {
  emit(event: AreaStoreInventoryTelemetryEvent): void;
}
