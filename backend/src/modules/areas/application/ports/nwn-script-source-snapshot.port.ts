import type { NwnScriptSourceResource } from "./nwn-script-compiler.port";

export const NWN_SCRIPT_SOURCE_SNAPSHOT = Symbol("NWN_SCRIPT_SOURCE_SNAPSHOT");

export interface NwnScriptSourceSnapshotCaptureInput {
  readonly moduleId: string;
  readonly expectedModuleRevision: string;
  readonly targetSourceSize: number;
  readonly includeResRefs: readonly string[];
}

export interface CapturedNwnScriptSourceSnapshot {
  readonly moduleId: string;
  readonly revision: string;
  readonly includes: readonly NwnScriptSourceResource[];
}

export interface NwnScriptSourceSnapshotPort {
  capture(
    input: NwnScriptSourceSnapshotCaptureInput,
  ): Promise<CapturedNwnScriptSourceSnapshot>;
}

export type NwnScriptSourceSnapshotErrorCode =
  | "AREA_EVENT_SCRIPT_MODULE_REVISION_CONFLICT"
  | "AREA_EVENT_SCRIPT_INCLUDE_INVALID"
  | "AREA_EVENT_SCRIPT_STORAGE_UNAVAILABLE";

export class NwnScriptSourceSnapshotError extends Error {
  constructor(
    readonly code: NwnScriptSourceSnapshotErrorCode,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "NwnScriptSourceSnapshotError";
  }
}
