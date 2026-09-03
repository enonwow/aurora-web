export const AREA_EVENT_SCRIPT_CATALOG_TELEMETRY = Symbol(
  "AREA_EVENT_SCRIPT_CATALOG_TELEMETRY",
);

export interface AreaEventScriptCatalogTelemetryEvent {
  readonly event: "area.event_script_catalog.query";
  readonly result: "completed" | "failed";
  readonly resultCode: string;
  readonly schemaVersion: "area-event-script-catalog.v1";
  readonly moduleRevision?: string;
  readonly inspectedDescriptorCount?: number;
  readonly admittedCatalogCount?: number;
  readonly matchingCount?: number;
  readonly returnedCount?: number;
  readonly rejectedDescriptorCount?: number;
  readonly limit: number;
  readonly offset: number;
  readonly durationMs: number;
}

export interface AreaEventScriptCatalogTelemetryPort {
  record(event: AreaEventScriptCatalogTelemetryEvent): void;
}
