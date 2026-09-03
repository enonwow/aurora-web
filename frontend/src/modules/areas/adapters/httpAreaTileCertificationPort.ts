import type {
  AreaTileCertificationPage,
  AreaTileCertificationPageItem,
  AreaTileCertificationPageQuery,
  AreaTileCertificationPort,
} from "../ports/areaTileCertificationPort";
import {
  AREA_TILE_CERTIFICATION_PAGE_MAX_LIMIT,
  AREA_TILE_CERTIFICATION_PAGE_MAX_OFFSET,
  AREA_TILE_CERTIFICATION_PAGE_SCHEMA_VERSION,
} from "../ports/areaTileCertificationPort";
import type { TileCertificationProofs } from "../domain/tileCertificationPolicy";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const TILESET_RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;
const PROOF_KEYS = [
  "inventory",
  "assetClosure",
  "render",
  "visualSeam",
  "setAdjacency",
  "pathReference",
  "pathConnect",
  "wokSeam",
  "persistence",
  "toolset",
  "nwnRuntime",
] as const;
const PROOF_STATES = new Set(["verified", "failed", "missing"]);

export class AreaTileCertificationRequestError extends Error {
  readonly name = "AreaTileCertificationRequestError";

  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

export class HttpAreaTileCertificationPort implements AreaTileCertificationPort {
  constructor(
    private readonly fetchFn: FetchLike = fetch.bind(globalThis),
    private readonly baseUrl = resolveBaseUrl(),
  ) {}

  async getTilesetPage(
    accessToken: string,
    tilesetResRef: string,
    query: AreaTileCertificationPageQuery,
  ): Promise<AreaTileCertificationPage> {
    if (!TILESET_RESREF_PATTERN.test(tilesetResRef) || !validQuery(query)) {
      throw new AreaTileCertificationRequestError(
        "The Area tile-certification request is invalid.",
        0,
        "AREA_TILE_CERTIFICATION_REQUEST_INVALID",
      );
    }
    const base = this.baseUrl.replace(/\/+$/u, "");
    const url = `${base}/areas/certification/tilesets/${encodeURIComponent(tilesetResRef)}` +
      `?limit=${query.limit}&offset=${query.offset}`;
    const response = await this.fetchFn(url, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = isRecord(payload) && isRecord(payload.error) ? payload.error : {};
      throw new AreaTileCertificationRequestError(
        "The Area tile-certification request failed.",
        response.status,
        typeof error.code === "string" && error.code
          ? error.code
          : "AREA_TILE_CERTIFICATION_REQUEST_FAILED",
      );
    }
    const data = isRecord(payload) ? payload.data : undefined;
    const parsed = readPage(data, tilesetResRef, query);
    if (!parsed) {
      throw new AreaTileCertificationRequestError(
        "The Area tile-certification response is invalid.",
        response.status,
        "AREA_TILE_CERTIFICATION_RESPONSE_INVALID",
      );
    }
    return parsed;
  }
}

function readPage(
  value: unknown,
  requestedTilesetResRef: string,
  query: AreaTileCertificationPageQuery,
): AreaTileCertificationPage | null {
  if (!isRecord(value) || !exactKeys(value, [
    "schemaVersion",
    "generatedAtIso",
    "planId",
    "corpusHash",
    "profileId",
    "ledgerSha256",
    "reportSha256",
    "tilesetResRef",
    "items",
    "total",
    "limit",
    "offset",
  ])) return null;
  if (
    value.schemaVersion !== AREA_TILE_CERTIFICATION_PAGE_SCHEMA_VERSION ||
    !isCanonicalIso(value.generatedAtIso) ||
    !HASH_PATTERN.test(readString(value.planId)) ||
    !HASH_PATTERN.test(readString(value.corpusHash)) ||
    !isBoundedText(value.profileId, 256) ||
    !HASH_PATTERN.test(readString(value.ledgerSha256)) ||
    !HASH_PATTERN.test(readString(value.reportSha256)) ||
    value.tilesetResRef !== requestedTilesetResRef ||
    value.limit !== query.limit ||
    value.offset !== query.offset ||
    !Number.isInteger(value.total) ||
    (value.total as number) < 0 ||
    (value.total as number) > 100_000 ||
    !Array.isArray(value.items) ||
    value.items.length > query.limit ||
    query.offset + value.items.length > (value.total as number) ||
    (query.offset < (value.total as number) && value.items.length === 0) ||
    (query.offset >= (value.total as number) && value.items.length !== 0)
  ) return null;

  const items: AreaTileCertificationPageItem[] = [];
  let previousTileId = -1;
  for (const rawItem of value.items) {
    const item = readItem(rawItem, {
      tilesetResRef: requestedTilesetResRef,
      planId: value.planId as string,
      corpusHash: value.corpusHash as string,
      profileId: value.profileId as string,
    });
    if (!item || item.tileId <= previousTileId) return null;
    previousTileId = item.tileId;
    items.push(item);
  }

  return deepFreeze({
    schemaVersion: AREA_TILE_CERTIFICATION_PAGE_SCHEMA_VERSION,
    generatedAtIso: value.generatedAtIso as string,
    planId: value.planId as string,
    corpusHash: value.corpusHash as string,
    profileId: value.profileId as string,
    ledgerSha256: value.ledgerSha256 as string,
    reportSha256: value.reportSha256 as string,
    tilesetResRef: requestedTilesetResRef,
    items,
    total: value.total as number,
    limit: query.limit,
    offset: query.offset,
  });
}

function readItem(
  value: unknown,
  binding: Readonly<{
    tilesetResRef: string;
    planId: string;
    corpusHash: string;
    profileId: string;
  }>,
): AreaTileCertificationPageItem | null {
  if (!isRecord(value) || !exactKeys(value, [
    "tileId",
    "rowId",
    "capabilityId",
    "eligibility",
    "identity",
    "proofs",
  ])) return null;
  if (
    !Number.isInteger(value.tileId) ||
    (value.tileId as number) < 0 ||
    (value.tileId as number) > 999_999 ||
    !isBoundedText(value.rowId, 256) ||
    !isBoundedText(value.capabilityId, 256)
  ) return null;
  const tileId = value.tileId as number;
  const expectedSubjectId = `${binding.tilesetResRef}:${tileId}`;
  const identity = value.identity;
  if (
    !isRecord(identity) ||
    !exactKeys(identity, ["schemaVersion", "planId", "corpusHash", "profileId", "subject"]) ||
    identity.schemaVersion !== "area-certification.v1" ||
    identity.planId !== binding.planId ||
    identity.corpusHash !== binding.corpusHash ||
    identity.profileId !== binding.profileId ||
    !isRecord(identity.subject) ||
    !exactKeys(identity.subject, ["kind", "id"]) ||
    identity.subject.kind !== "tile-definition" ||
    identity.subject.id !== expectedSubjectId
  ) return null;
  const eligibility = readEligibility(value.eligibility);
  const proofs = readProofs(value.proofs);
  if (!eligibility || !proofs) return null;
  return deepFreeze({
    tileId,
    rowId: value.rowId as string,
    capabilityId: value.capabilityId as string,
    eligibility,
    identity: {
      schemaVersion: "area-certification.v1",
      planId: binding.planId,
      corpusHash: binding.corpusHash,
      profileId: binding.profileId,
      subject: { kind: "tile-definition", id: expectedSubjectId },
    },
    proofs,
  });
}

function readEligibility(value: unknown): AreaTileCertificationPageItem["eligibility"] | null {
  if (!isRecord(value)) return null;
  if (value.status === "eligible" && exactKeys(value, ["status"])) {
    return Object.freeze({ status: "eligible" });
  }
  if (
    value.status === "excluded" &&
    exactKeys(value, ["status", "reasonCode", "reason"]) &&
    value.reasonCode === "certification_plan_excluded" &&
    isBoundedText(value.reason, 1024)
  ) {
    return Object.freeze({
      status: "excluded",
      reasonCode: "certification_plan_excluded",
      reason: value.reason,
    });
  }
  return null;
}

function readProofs(value: unknown): TileCertificationProofs | null {
  if (!isRecord(value) || !exactKeys(value, PROOF_KEYS)) return null;
  const proofs: Partial<Record<(typeof PROOF_KEYS)[number], "verified" | "failed" | "missing">> = {};
  for (const key of PROOF_KEYS) {
    const state = value[key];
    if (typeof state !== "string" || !PROOF_STATES.has(state)) return null;
    proofs[key] = state as "verified" | "failed" | "missing";
  }
  return Object.freeze(proofs as TileCertificationProofs);
}

function validQuery(value: AreaTileCertificationPageQuery): boolean {
  return Number.isInteger(value.limit) &&
    value.limit >= 1 &&
    value.limit <= AREA_TILE_CERTIFICATION_PAGE_MAX_LIMIT &&
    Number.isInteger(value.offset) &&
    value.offset >= 0 &&
    value.offset <= AREA_TILE_CERTIFICATION_PAGE_MAX_OFFSET;
}

function isCanonicalIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isBoundedText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 &&
    value.length <= maxLength && !value.includes("\0");
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
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

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}

function resolveBaseUrl(): string {
  const candidate = import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined;
  return candidate?.trim() || (import.meta.env.DEV ? "/_aurora/v1" : "/api/v1");
}
