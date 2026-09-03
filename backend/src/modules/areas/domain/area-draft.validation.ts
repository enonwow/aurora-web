import { createHash } from "node:crypto";
import type {
  AreaDraftDocument,
  AreaDraftSource,
  ProductionAreaDraftOpenRequest,
} from "./area-draft.types";
import {
  AREA_DRAFT_OPEN_SCHEMA_VERSION,
  AREA_DRAFT_SCHEMA_VERSION,
} from "./area-draft.types";

export const AREA_DRAFT_MAX_BYTES = 25 * 1024 * 1024;
export const AREA_DRAFT_MAX_DEPTH = 64;
export const AREA_DRAFT_MAX_ENTRIES = 250_000;

const DRAFT_ID = /^[A-Za-z0-9_-]{1,128}$/u;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{8,128}$/u;
const CURSOR = /^[A-Za-z0-9_-]{1,2048}$/u;
const TOP_LEVEL_FIELDS = Object.freeze(["payload", "schemaVersion", "source", "title"]);
const PRODUCTION_OPEN_FIELDS = Object.freeze(["draftTitle", "schemaVersion"]);
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export class AreaDraftValidationError extends Error {
  readonly code = "AREA_DRAFT_INVALID";
  constructor(message: string, readonly path = "body") {
    super(`AREA_DRAFT_INVALID: ${message}`);
    this.name = "AreaDraftValidationError";
  }
}

export function parseAreaDraftDocument(input: unknown): AreaDraftDocument {
  if (!isPlainObject(input)) fail("body must be a JSON object.");
  if (JSON.stringify(Object.keys(input).sort()) !== JSON.stringify(TOP_LEVEL_FIELDS)) {
    fail("body contains a missing or unknown top-level field.");
  }
  if (input.schemaVersion !== AREA_DRAFT_SCHEMA_VERSION) {
    fail(`schemaVersion must be ${AREA_DRAFT_SCHEMA_VERSION}.`, "body.schemaVersion");
  }
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (title.length < 1 || title.length > 255) fail("title must contain 1..255 characters.", "body.title");
  const source = parseSource(input.source);
  const payload = normalizeJson(input.payload, 0, { entries: 0 }, "body.payload");
  const document = deepFreeze({ schemaVersion: AREA_DRAFT_SCHEMA_VERSION, title, source, payload });
  if (Buffer.byteLength(canonicalizeAreaDraftDocument(document), "utf8") > AREA_DRAFT_MAX_BYTES) {
    fail(`normalized document exceeds ${AREA_DRAFT_MAX_BYTES} bytes.`);
  }
  return document;
}

export function parseAreaDraftId(input: unknown): string {
  if (typeof input !== "string" || !DRAFT_ID.test(input)) fail("draftId is invalid.", "draftId");
  return input;
}

export function parseProductionAreaId(input: unknown): string {
  if (typeof input !== "string" || !/^[A-Za-z0-9_]{1,128}$/u.test(input)) {
    fail("production areaId is invalid.", "areaId");
  }
  return input;
}

export function parseProductionAreaDraftOpenRequest(
  input: unknown,
): ProductionAreaDraftOpenRequest {
  if (!isPlainObject(input)) fail("body must be a JSON object.");
  if (JSON.stringify(Object.keys(input).sort()) !== JSON.stringify(PRODUCTION_OPEN_FIELDS)) {
    fail("body contains a missing or unknown top-level field.");
  }
  if (input.schemaVersion !== AREA_DRAFT_OPEN_SCHEMA_VERSION) {
    fail(
      `schemaVersion must be ${AREA_DRAFT_OPEN_SCHEMA_VERSION}.`,
      "body.schemaVersion",
    );
  }
  const draftTitle = typeof input.draftTitle === "string" ? input.draftTitle.trim() : "";
  if (draftTitle.length < 1 || draftTitle.length > 255) {
    fail("draftTitle must contain 1..255 characters.", "body.draftTitle");
  }
  return Object.freeze({
    schemaVersion: AREA_DRAFT_OPEN_SCHEMA_VERSION,
    draftTitle,
  });
}

export function parseAreaDraftIdempotencyKey(input: unknown): string {
  if (typeof input !== "string" || !IDEMPOTENCY_KEY.test(input)) fail("Idempotency-Key is invalid.", "headers.idempotency-key");
  return input;
}

export function parseAreaDraftIfMatch(input: unknown): number {
  if (typeof input !== "string" || !/^"(?:0|[1-9]\d*)"$/u.test(input)) {
    fail('If-Match must be one quoted non-negative integer revision, for example "7".', "headers.if-match");
  }
  const revision = Number(input.slice(1, -1));
  if (!Number.isSafeInteger(revision)) fail("If-Match revision exceeds the safe integer range.", "headers.if-match");
  return revision;
}

export function parseAreaDraftRevision(input: unknown): number {
  const value = typeof input === "string" && /^\d+$/u.test(input) ? Number(input) : NaN;
  if (!Number.isSafeInteger(value) || value < 1) fail("revision must be a positive integer.", "query.revision");
  return value;
}

export function parseAreaDraftListQuery(input: unknown): Readonly<{ pageSize: number; cursor?: string }> {
  if (!isQueryRecord(input)) fail("query must be an object.", "query");
  if (Object.keys(input).some((key) => !["pageSize", "cursor"].includes(key))) fail("query contains an unknown field.", "query");
  const rawPageSize = input.pageSize ?? "25";
  const pageSize = typeof rawPageSize === "string" && /^\d+$/u.test(rawPageSize) ? Number(rawPageSize) : NaN;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) fail("pageSize must be an integer in 1..100.", "query.pageSize");
  if (input.cursor === undefined || input.cursor === "") return Object.freeze({ pageSize });
  if (typeof input.cursor !== "string" || !CURSOR.test(input.cursor)) fail("cursor is invalid.", "query.cursor");
  return Object.freeze({ pageSize, cursor: input.cursor });
}

export function canonicalizeAreaDraftDocument(document: AreaDraftDocument): string {
  return JSON.stringify(sortJson(document));
}

export function hashAreaDraftCommand(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(sortJson(value)), "utf8").digest("hex");
}

export function hashAreaDraftDocument(document: AreaDraftDocument): string {
  return createHash("sha256").update(canonicalizeAreaDraftDocument(document), "utf8").digest("hex");
}

export interface AreaDraftCursor {
  readonly updatedAt: string;
  readonly draftId: string;
}

export function encodeAreaDraftCursor(value: AreaDraftCursor): string {
  return Buffer.from(JSON.stringify({ updatedAt: value.updatedAt, draftId: value.draftId }), "utf8").toString("base64url");
}

export function decodeAreaDraftCursor(value: string): AreaDraftCursor {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (!isPlainObject(parsed) || Object.keys(parsed).sort().join("|") !== "draftId|updatedAt" || typeof parsed.updatedAt !== "string" || Number.isNaN(Date.parse(parsed.updatedAt))) throw new Error();
    return Object.freeze({ updatedAt: new Date(parsed.updatedAt).toISOString(), draftId: parseAreaDraftId(parsed.draftId) });
  } catch (error) {
    if (error instanceof AreaDraftValidationError) throw error;
    fail("cursor payload is invalid.", "query.cursor");
  }
}

export function isAreaDraftAfterCursor(value: AreaDraftCursor, cursor: AreaDraftCursor): boolean {
  return value.updatedAt < cursor.updatedAt || (value.updatedAt === cursor.updatedAt && value.draftId > cursor.draftId);
}

function parseSource(input: unknown): AreaDraftSource {
  if (!isPlainObject(input) || typeof input.type !== "string") fail("source is invalid.", "body.source");
  if (input.type === "new" && Object.keys(input).length === 1) return Object.freeze({ type: "new" });
  if (input.type === "production_area" && Object.keys(input).sort().join("|") === "areaId|type" && typeof input.areaId === "string" && /^[A-Za-z0-9_]{1,128}$/u.test(input.areaId)) {
    return Object.freeze({ type: "production_area", areaId: input.areaId });
  }
  fail("source must be new or contain one safe production areaId.", "body.source");
}

function normalizeJson(value: unknown, depth: number, budget: { entries: number }, path: string): unknown {
  if (depth > AREA_DRAFT_MAX_DEPTH) fail(`payload exceeds maximum depth ${AREA_DRAFT_MAX_DEPTH}.`, path);
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("payload contains a non-finite number.", path);
    return value;
  }
  if (Array.isArray(value)) {
    budget.entries += value.length;
    assertEntryBudget(budget, path);
    return Object.freeze(value.map((child, index) => normalizeJson(child, depth + 1, budget, `${path}.${index}`)));
  }
  if (!isPlainObject(value)) fail("payload contains a non-JSON or binary value.", path);
  const keys = Object.keys(value);
  budget.entries += keys.length;
  assertEntryBudget(budget, path);
  const normalized: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  for (const key of keys) {
    if (FORBIDDEN_KEYS.has(key)) fail(`payload key ${key} is forbidden.`, path);
    normalized[key] = normalizeJson(value[key], depth + 1, budget, `${path}.${key}`);
  }
  return Object.freeze(normalized);
}

function assertEntryBudget(budget: { entries: number }, path: string): void {
  if (budget.entries > AREA_DRAFT_MAX_ENTRIES) fail(`payload exceeds maximum entry count ${AREA_DRAFT_MAX_ENTRIES}.`, path);
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isQueryRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(message: string, path?: string): never { throw new AreaDraftValidationError(message, path); }
function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}
