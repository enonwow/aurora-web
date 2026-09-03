export const AREA_EVENT_SCRIPT_SOURCE_QUERY = Symbol(
  "AREA_EVENT_SCRIPT_SOURCE_QUERY",
);

export const AREA_EVENT_SCRIPT_SOURCE_SNAPSHOT_SCHEMA_VERSION =
  "area-event-script-source-snapshot.v1" as const;

export interface AreaEventScriptSourceQueryInput {
  readonly moduleId: string;
  readonly targetResRef: string;
  readonly expectedModuleRevision: string;
}

export interface AreaEventScriptSourceSnapshot {
  readonly schemaVersion: typeof AREA_EVENT_SCRIPT_SOURCE_SNAPSHOT_SCHEMA_VERSION;
  readonly moduleId: string;
  readonly moduleRevision: string;
  readonly targetResRef: string;
  readonly sourceEncoding: "utf-8";
  readonly sourceText: string;
  readonly sourceSize: number;
  readonly sourceSha256: string;
}

export type AreaEventScriptSourceQueryErrorCode =
  | "AREA_EVENT_SCRIPT_SOURCE_NOT_FOUND"
  | "AREA_EVENT_SCRIPT_MODULE_REVISION_CONFLICT"
  | "AREA_EVENT_SCRIPT_SOURCE_INVALID"
  | "AREA_EVENT_SCRIPT_STORAGE_UNAVAILABLE";

export class AreaEventScriptSourceQueryError extends Error {
  constructor(
    readonly code: AreaEventScriptSourceQueryErrorCode,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "AreaEventScriptSourceQueryError";
  }
}

export interface AreaEventScriptSourceQueryPort {
  read(input: AreaEventScriptSourceQueryInput): Promise<AreaEventScriptSourceSnapshot>;
}
