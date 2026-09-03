export const AREA_EVENT_SCRIPT_PUBLICATION_TELEMETRY = Symbol(
  "AREA_EVENT_SCRIPT_PUBLICATION_TELEMETRY",
);

export interface AreaEventScriptPublicationTelemetryEvent {
  readonly schemaVersion: "area-event-script-publication-telemetry.v1";
  readonly operation: "read_source" | "validate" | "publish";
  readonly outcome: "succeeded" | "failed";
  readonly resultCode: string;
  readonly moduleRevision?: string;
  readonly sourceBytes: number;
  readonly includeCount: number;
  readonly diagnosticCount: number;
  readonly resourceCount: number;
  readonly durationMs: number;
}

export interface AreaEventScriptPublicationTelemetryPort {
  emit(event: AreaEventScriptPublicationTelemetryEvent): void;
}
