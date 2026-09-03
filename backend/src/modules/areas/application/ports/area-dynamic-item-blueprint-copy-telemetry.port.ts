export const AREA_DYNAMIC_ITEM_BLUEPRINT_COPY_TELEMETRY = Symbol(
  "AREA_DYNAMIC_ITEM_BLUEPRINT_COPY_TELEMETRY",
);

export type AreaDynamicItemBlueprintCopyOperation =
  | "resolve_blueprint"
  | "validate_identity"
  | "parse_source"
  | "resolve_baseitems"
  | "admit_profile"
  | "write"
  | "readback";

export interface AreaDynamicItemBlueprintCopyTelemetryEvent {
  readonly eventName: "area_dynamic_item_blueprint_copy.v1";
  readonly operation: AreaDynamicItemBlueprintCopyOperation;
  readonly outcome: "succeeded" | "failed";
  readonly resultCode: string;
  readonly modelType?: 0 | 1 | 2 | 3;
  readonly propertyCount?: number;
  readonly variableCount?: number;
  readonly nestedInventoryState?: "absent" | "empty" | "expanded" | "blocked";
  readonly durationMs: number;
}

export interface AreaDynamicItemBlueprintCopyTelemetryPort {
  emit(event: AreaDynamicItemBlueprintCopyTelemetryEvent): void;
}
