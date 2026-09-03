import { Inject, Injectable } from "@nestjs/common";
import { AppException } from "../../../common/http/app-exception";
import {
  AREA_CERTIFICATION_LEDGER_SOURCE,
  type AreaCertificationLedgerSourcePort,
} from "./ports/area-certification-ledger-source.port";
import {
  buildAreaCertificationReleaseReport,
  type AreaCertificationReleaseReport,
} from "../domain/area-certification.release-report";
import type {
  AreaCertificationIdentity,
  AreaCertificationRow,
  AreaProofStates,
} from "../domain/area-certification.types";
import {
  evaluateAreaTileProductionAdmission,
} from "./area-tile-production-admission.policy";
import {
  AreaTileProductionAdmissionSourceError,
  type AreaTileProductionAdmissionPort,
} from "./ports/area-tile-production-admission.port";

export const AREA_TILE_CERTIFICATION_PAGE_SCHEMA_VERSION =
  "area-tile-certification-page.v1" as const;
export const AREA_TILE_CERTIFICATION_PAGE_MAX_LIMIT = 256;
export const AREA_TILE_CERTIFICATION_PAGE_MAX_OFFSET = 99_999;

export interface AreaTileCertificationPageQuery {
  readonly limit: number;
  readonly offset: number;
}

export type AreaTileCertificationEligibility =
  | Readonly<{ status: "eligible" }>
  | Readonly<{
      status: "excluded";
      reasonCode: "certification_plan_excluded";
      reason: string;
    }>;

export interface AreaTileCertificationPageItem {
  readonly tileId: number;
  readonly rowId: string;
  readonly capabilityId: string;
  readonly eligibility: AreaTileCertificationEligibility;
  readonly identity: AreaCertificationIdentity;
  readonly proofs: AreaProofStates;
}

export interface AreaTileCertificationPage {
  readonly schemaVersion: typeof AREA_TILE_CERTIFICATION_PAGE_SCHEMA_VERSION;
  readonly generatedAtIso: string;
  readonly planId: string;
  readonly corpusHash: string;
  readonly profileId: string;
  readonly ledgerSha256: string;
  readonly reportSha256: string;
  readonly tilesetResRef: string;
  readonly items: readonly AreaTileCertificationPageItem[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

interface IndexedReport {
  readonly source: unknown;
  readonly report: AreaCertificationReleaseReport;
  readonly itemsByTileset: ReadonlyMap<string, readonly AreaTileCertificationPageItem[]>;
}

const TILE_SUBJECT_PATTERN = /^([a-z0-9_]{1,16}):(0|[1-9][0-9]{0,5})$/u;
const MAX_CERTIFICATION_ROW_ID_LENGTH = 256;
const MAX_CERTIFICATION_CAPABILITY_ID_LENGTH = 256;
const MAX_CERTIFICATION_EXCLUSION_REASON_LENGTH = 1_024;

@Injectable()
export class AreaTileCertificationQueryApplicationService
  implements AreaTileProductionAdmissionPort {
  private indexedReport: IndexedReport | null = null;

  constructor(
    @Inject(AREA_CERTIFICATION_LEDGER_SOURCE)
    private readonly source: AreaCertificationLedgerSourcePort,
  ) {}

  async getTilesetPage(
    tilesetResRef: string,
    query: AreaTileCertificationPageQuery,
  ): Promise<AreaTileCertificationPage> {
    let indexed: IndexedReport;
    try {
      indexed = await this.readIndexedReport();
    } catch (error) {
      if (error instanceof AreaTileProductionAdmissionSourceError) {
        throw ledgerError(error.code, error.message);
      }
      throw error;
    }
    const rows = indexed.itemsByTileset.get(tilesetResRef) ?? [];
    return deepFreeze({
      schemaVersion: AREA_TILE_CERTIFICATION_PAGE_SCHEMA_VERSION,
      generatedAtIso: indexed.report.generatedAtIso,
      planId: indexed.report.plan.planId,
      corpusHash: indexed.report.plan.corpusHash,
      profileId: indexed.report.plan.profileId,
      ledgerSha256: indexed.report.ledgerSha256,
      reportSha256: indexed.report.reportSha256,
      tilesetResRef,
      items: rows.slice(query.offset, query.offset + query.limit),
      total: rows.length,
      limit: query.limit,
      offset: query.offset,
    });
  }

  async evaluateProductionAdmission(input: Readonly<{
    tilesetResRef: string;
    candidateTileIds: readonly number[];
  }>) {
    const indexed = await this.readIndexedReport();
    const tilesetResRef = input.tilesetResRef.trim().toLowerCase();
    const rows = indexed.itemsByTileset.get(tilesetResRef) ?? [];
    return evaluateAreaTileProductionAdmission({
      report: {
        generatedAtIso: indexed.report.generatedAtIso,
        planId: indexed.report.plan.planId,
        corpusHash: indexed.report.plan.corpusHash,
        profileId: indexed.report.plan.profileId,
        ledgerSha256: indexed.report.ledgerSha256,
        reportSha256: indexed.report.reportSha256,
      },
      tilesetResRef,
      candidateTileIds: input.candidateTileIds,
      rows: rows.map((row) => ({
        tileId: row.tileId,
        rowId: row.rowId,
        capabilityId: row.capabilityId,
        eligibility: row.eligibility.status === "eligible"
          ? { status: "eligible" as const }
          : {
              status: "excluded" as const,
              reasonCode: row.eligibility.reasonCode,
            },
        proofs: row.proofs,
      })),
    });
  }

  private async readIndexedReport(): Promise<IndexedReport> {
    let sourceValue: unknown | null;
    try {
      sourceValue = await this.source.readReleaseReport();
    } catch {
      throw sourceError(
        "AREA_TILE_CERTIFICATION_LEDGER_UNAVAILABLE",
        "The Area tile-certification ledger is unavailable.",
      );
    }
    if (sourceValue === null) {
      throw sourceError(
        "AREA_TILE_CERTIFICATION_LEDGER_UNAVAILABLE",
        "The Area tile-certification ledger is unavailable.",
      );
    }
    const cached = this.indexedReport;
    if (cached !== null && cached.source === sourceValue) {
      return cached;
    }

    try {
      const report = rebuildExactReport(sourceValue);
      const indexed = deepFreeze({
        source: sourceValue,
        report,
        itemsByTileset: indexTileRows(report.rowLedger),
      });
      this.indexedReport = indexed;
      return indexed;
    } catch {
      throw sourceError(
        "AREA_TILE_CERTIFICATION_LEDGER_INVALID",
        "The Area tile-certification ledger is invalid.",
      );
    }
  }
}

function rebuildExactReport(value: unknown): AreaCertificationReleaseReport {
  if (!isRecord(value) || !exactKeys(value, [
    "schemaVersion",
    "generatedAtIso",
    "plan",
    "ledgerSha256",
    "aggregate",
    "release",
    "rowLedger",
    "reportSha256",
  ])) {
    throw new Error("invalid_release_report_envelope");
  }
  const rebuilt = buildAreaCertificationReleaseReport({
    generatedAtIso: value.generatedAtIso as string,
    plan: value.plan as AreaCertificationReleaseReport["plan"],
    rows: value.rowLedger as readonly AreaCertificationRow[],
  });
  if (stableJson(value) !== stableJson(rebuilt)) {
    throw new Error("release_report_integrity_mismatch");
  }
  return rebuilt;
}

function indexTileRows(
  rows: readonly AreaCertificationRow[],
): ReadonlyMap<string, readonly AreaTileCertificationPageItem[]> {
  const mutable = new Map<string, AreaTileCertificationPageItem[]>();
  const identities = new Set<string>();
  for (const row of rows) {
    if (
      row.releaseScope !== "production" ||
      row.identity?.subject.kind !== "tile-definition"
    ) {
      continue;
    }
    const match = TILE_SUBJECT_PATTERN.exec(row.identity.subject.id);
    if (!match) throw new Error("invalid_tile_subject_identity");
    if (
      !isBoundedText(row.rowId, MAX_CERTIFICATION_ROW_ID_LENGTH) ||
      !isBoundedText(row.capabilityId, MAX_CERTIFICATION_CAPABILITY_ID_LENGTH) ||
      (row.eligibility.status === "excluded" &&
        !isBoundedText(
          row.eligibility.reason,
          MAX_CERTIFICATION_EXCLUSION_REASON_LENGTH,
        ))
    ) {
      throw new Error("unbounded_tile_certification_projection");
    }
    const tilesetResRef = match[1];
    const tileId = Number(match[2]);
    const identityKey = `${tilesetResRef}:${tileId}`;
    if (row.identity.subject.id !== identityKey || identities.has(identityKey)) {
      throw new Error("duplicate_or_noncanonical_tile_subject_identity");
    }
    identities.add(identityKey);
    const item = deepFreeze({
      tileId,
      rowId: row.rowId,
      capabilityId: row.capabilityId,
      eligibility: row.eligibility.status === "eligible"
        ? { status: "eligible" as const }
        : {
            status: "excluded" as const,
            reasonCode: "certification_plan_excluded" as const,
            reason: row.eligibility.reason,
          },
      identity: row.identity,
      proofs: row.proofs,
    });
    const current = mutable.get(tilesetResRef) ?? [];
    current.push(item);
    mutable.set(tilesetResRef, current);
  }
  const result = new Map<string, readonly AreaTileCertificationPageItem[]>();
  for (const [tilesetResRef, items] of mutable) {
    items.sort((left, right) => left.tileId - right.tileId);
    result.set(tilesetResRef, Object.freeze([...items]));
  }
  return result;
}

function ledgerError(code: string, message: string): AppException {
  return new AppException({ status: 503, code, message });
}

function sourceError(
  code: ConstructorParameters<typeof AreaTileProductionAdmissionSourceError>[0],
  message: string,
): AreaTileProductionAdmissionSourceError {
  return new AreaTileProductionAdmissionSourceError(code, message);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    ).join(",")}}`;
  }
  const primitive = JSON.stringify(value);
  return primitive === undefined ? "null" : primitive;
}

function exactKeys(value: object, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength &&
    !value.includes("\0");
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  if (value instanceof Map) {
    for (const [key, child] of value) {
      deepFreeze(key);
      deepFreeze(child);
    }
    return Object.freeze(value);
  }
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}
