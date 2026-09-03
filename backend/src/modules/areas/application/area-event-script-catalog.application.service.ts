import { Inject, Injectable } from "@nestjs/common";
import { performance } from "node:perf_hooks";
import { AppException } from "../../../common/http/app-exception";
import {
  COMMITTED_MODULE_SNAPSHOT_READER,
  type CommittedModuleSnapshotReaderPort,
} from "../../module-snapshots/application/ports/committed-module-snapshot-reader.port";
import {
  AREA_EVENT_SCRIPT_CATALOG_SCHEMA_VERSION,
  AreaEventScriptCatalogError,
  buildAreaEventScriptCatalog,
  type AreaEventScriptCatalogDiagnostic,
  type AreaEventScriptCatalogItem,
  type AreaEventScriptCatalogSummary,
} from "../domain/area-event-script-catalog";
import {
  AREA_EVENT_SCRIPT_CATALOG_TELEMETRY,
  type AreaEventScriptCatalogTelemetryPort,
} from "./ports/area-event-script-catalog-telemetry.port";

export const AREA_EVENT_SCRIPT_CATALOG_MAX_RESPONSE_BYTES = 256 * 1024;

export interface AreaEventScriptCatalogQuery {
  readonly search: string;
  readonly limit: number;
  readonly offset: number;
}

export interface AreaEventScriptCatalogResponse {
  readonly schemaVersion: typeof AREA_EVENT_SCRIPT_CATALOG_SCHEMA_VERSION;
  readonly moduleId: string;
  readonly moduleRevision: string;
  readonly coverage: "committed_module_only";
  readonly items: readonly AreaEventScriptCatalogItem[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly summary: AreaEventScriptCatalogSummary;
  readonly diagnostics: readonly AreaEventScriptCatalogDiagnostic[];
}

@Injectable()
export class AreaEventScriptCatalogApplicationService {
  constructor(
    @Inject(COMMITTED_MODULE_SNAPSHOT_READER)
    private readonly reader: CommittedModuleSnapshotReaderPort,
    @Inject(AREA_EVENT_SCRIPT_CATALOG_TELEMETRY)
    private readonly telemetry: AreaEventScriptCatalogTelemetryPort,
  ) {}

  async query(query: AreaEventScriptCatalogQuery): Promise<AreaEventScriptCatalogResponse> {
    const startedAt = performance.now();
    let moduleRevision: string | undefined;
    try {
      const snapshot = await this.reader.capture();
      moduleRevision = snapshot.revision;
      const catalog = buildAreaEventScriptCatalog(
        snapshot.listCommittedObjectDescriptors(),
      );
      const matching = query.search
        ? catalog.items.filter((item) => item.resRef.includes(query.search))
        : catalog.items;
      const items = Object.freeze(
        matching.slice(query.offset, query.offset + query.limit),
      );
      const response: AreaEventScriptCatalogResponse = Object.freeze({
        schemaVersion: AREA_EVENT_SCRIPT_CATALOG_SCHEMA_VERSION,
        moduleId: snapshot.moduleId,
        moduleRevision: snapshot.revision,
        coverage: "committed_module_only",
        items,
        total: matching.length,
        limit: query.limit,
        offset: query.offset,
        summary: catalog.summary,
        diagnostics: catalog.diagnostics,
      });
      if (Buffer.byteLength(JSON.stringify(response), "utf8") >= AREA_EVENT_SCRIPT_CATALOG_MAX_RESPONSE_BYTES) {
        throw new AreaEventScriptCatalogError(
          "AREA_EVENT_SCRIPT_CATALOG_RESPONSE_BUDGET_EXCEEDED",
          "Area event-script catalog response exceeds its fixed payload budget.",
        );
      }
      this.telemetry.record({
        event: "area.event_script_catalog.query",
        result: "completed",
        resultCode: "AREA_EVENT_SCRIPT_CATALOG_QUERY_COMPLETED",
        schemaVersion: AREA_EVENT_SCRIPT_CATALOG_SCHEMA_VERSION,
        moduleRevision: snapshot.revision,
        inspectedDescriptorCount: catalog.inspectedDescriptorCount,
        admittedCatalogCount: catalog.summary.admittedCatalogCount,
        matchingCount: matching.length,
        returnedCount: items.length,
        rejectedDescriptorCount: catalog.summary.rejectedDescriptors,
        limit: query.limit,
        offset: query.offset,
        durationMs: elapsedMilliseconds(startedAt),
      });
      return response;
    } catch (error) {
      const resultCode = readStableErrorCode(error);
      this.telemetry.record({
        event: "area.event_script_catalog.query",
        result: "failed",
        resultCode,
        schemaVersion: AREA_EVENT_SCRIPT_CATALOG_SCHEMA_VERSION,
        ...(moduleRevision ? { moduleRevision } : {}),
        limit: query.limit,
        offset: query.offset,
        durationMs: elapsedMilliseconds(startedAt),
      });
      throw toPublicQueryError(error, resultCode);
    }
  }
}

function elapsedMilliseconds(startedAt: number): number {
  return Math.max(0, Number((performance.now() - startedAt).toFixed(3)));
}

function readStableErrorCode(error: unknown): string {
  if (error instanceof AppException || error instanceof AreaEventScriptCatalogError) {
    return error.code;
  }
  if (error instanceof Error) {
    const [candidate] = error.message.split(":", 1);
    if (candidate && /^[A-Z][A-Z0-9_]{2,127}$/u.test(candidate)) return candidate;
  }
  return "AREA_EVENT_SCRIPT_CATALOG_QUERY_FAILED";
}

function toPublicQueryError(error: unknown, resultCode: string): AppException {
  if (error instanceof AppException) return error;
  const catalogBudget = error instanceof AreaEventScriptCatalogError;
  return new AppException({
    status: 503,
    code: resultCode,
    message: catalogBudget
      ? "The Area event-script catalog exceeds its bounded contract."
      : "The committed Area event-script catalog is unavailable.",
    retryable: !catalogBudget,
  });
}
