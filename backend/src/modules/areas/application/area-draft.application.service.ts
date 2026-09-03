import { Inject, Injectable } from "@nestjs/common";
import { AppException } from "../../../common/http/app-exception";
import { AREA_DRAFT_REPOSITORY, AreaDraftRepositoryError, type AreaDraftRepositoryPort } from "./ports/area-draft.repository.port";
import { AreaDraftValidationError, hashAreaDraftCommand, parseAreaDraftDocument, parseAreaDraftId, parseAreaDraftIdempotencyKey, parseAreaDraftIfMatch, parseAreaDraftListQuery, parseAreaDraftRevision, parseProductionAreaDraftOpenRequest, parseProductionAreaId } from "../domain/area-draft.validation";
import { PRODUCTION_AREA_DRAFT_PAYLOAD_SCHEMA_VERSION } from "../domain/area-draft.types";
import { AreasApplicationService } from "./areas.application.service";

@Injectable()
export class AreaDraftApplicationService {
  constructor(
    @Inject(AREA_DRAFT_REPOSITORY) private readonly repository: AreaDraftRepositoryPort,
    private readonly areas: AreasApplicationService,
  ) {}

  async list(actorId: string, query: unknown) {
    assertActor(actorId);
    try { return await this.repository.list({ actorId, ...parseAreaDraftListQuery(query) }); }
    catch (error) { throw normalizeError(error); }
  }

  async open(actorId: string, draftId: unknown, query: unknown) {
    assertActor(actorId);
    try {
      const parsedQuery = asRecord(query);
      return await this.repository.read({ actorId, draftId: parseAreaDraftId(draftId), revision: parseAreaDraftRevision(parsedQuery.revision) });
    } catch (error) { throw normalizeError(error); }
  }

  async openProductionAsDraft(input: Readonly<{
    actorId: string;
    areaId: unknown;
    idempotencyKey: unknown;
    body: unknown;
  }>) {
    assertActor(input.actorId);
    try {
      const areaId = parseProductionAreaId(input.areaId);
      const idempotencyKey = parseAreaDraftIdempotencyKey(input.idempotencyKey);
      const request = parseProductionAreaDraftOpenRequest(input.body);
      const draftId = productionDraftId(input.actorId, idempotencyKey);
      const commandHash = hashAreaDraftCommand({
        operation: "open_production_area_as_draft",
        actorId: input.actorId,
        areaId,
        request,
      });
      const replay = await this.repository.findRetainedSaveResult({
        actorId: input.actorId,
        draftId,
        idempotencyKey,
        commandHash,
      });
      if (replay) return replay;

      const processed = await this.areas.processArea({ areaId, bypassCache: false });
      const sourceArea = projectJsonSnapshot(processed.area);
      const document = parseAreaDraftDocument({
        schemaVersion: "area-draft.v1",
        title: request.draftTitle,
        source: { type: "production_area", areaId },
        payload: {
          schemaVersion: PRODUCTION_AREA_DRAFT_PAYLOAD_SCHEMA_VERSION,
          sourceArea,
          provenance: {
            areaId,
            sourceUpdatedAt: processed.area.updatedAt,
            processingCacheKey: processed.cache.key,
            ...(processed.area.sourceResources?.areSha256
              ? { sourceAreSha256: processed.area.sourceResources.areSha256 }
              : {}),
            ...(processed.area.sourceResources?.gitSha256
              ? { sourceGitSha256: processed.area.sourceResources.gitSha256 }
              : {}),
            ...(processed.area.sourceResources?.gicSha256
              ? { sourceGicSha256: processed.area.sourceResources.gicSha256 }
              : {}),
            ...(processed.area.sourceResources?.ifoSha256
              ? { sourceIfoSha256: processed.area.sourceResources.ifoSha256 }
              : {}),
          },
        },
      });
      return await this.repository.save({
        actorId: input.actorId,
        draftId,
        expectedRevision: 0,
        idempotencyKey,
        commandHash,
        document,
      });
    } catch (error) {
      throw normalizeError(error);
    }
  }

  async save(input: Readonly<{ actorId: string; draftId: unknown; ifMatchHeader: unknown; idempotencyKey: unknown; body: unknown }>) {
    assertActor(input.actorId);
    try {
      const draftId = parseAreaDraftId(input.draftId);
      const expectedRevision = parseAreaDraftIfMatch(input.ifMatchHeader);
      const idempotencyKey = parseAreaDraftIdempotencyKey(input.idempotencyKey);
      const document = parseAreaDraftDocument(input.body);
      const commandHash = hashAreaDraftCommand({ operation: "save", actorId: input.actorId, draftId, expectedRevision, document });
      return await this.repository.save({ actorId: input.actorId, draftId, expectedRevision, idempotencyKey, commandHash, document });
    } catch (error) { throw normalizeError(error); }
  }

  async delete(input: Readonly<{ actorId: string; draftId: unknown; ifMatchHeader: unknown; idempotencyKey: unknown }>) {
    assertActor(input.actorId);
    try {
      const draftId = parseAreaDraftId(input.draftId);
      const expectedRevision = parseAreaDraftIfMatch(input.ifMatchHeader);
      const idempotencyKey = parseAreaDraftIdempotencyKey(input.idempotencyKey);
      const commandHash = hashAreaDraftCommand({ operation: "delete", actorId: input.actorId, draftId, expectedRevision });
      return await this.repository.delete({ actorId: input.actorId, draftId, expectedRevision, idempotencyKey, commandHash });
    } catch (error) { throw normalizeError(error); }
  }
}

function assertActor(actorId: string): void {
  if (!actorId) throw appError(401, "AREA_DRAFT_UNAUTHORIZED", "Authenticated actor is missing.");
}
function normalizeError(error: unknown): AppException {
  if (error instanceof AppException) return error;
  if (error instanceof AreaDraftValidationError) {
    return appError(422, error.code, "Area draft request is invalid.", [{ path: error.path, reason: error.message }]);
  }
  if (error instanceof AreaDraftRepositoryError) {
    const status = error.code === "AREA_DRAFT_NOT_FOUND" ? 404 : error.code === "AREA_DRAFT_REVISION_CONFLICT" ? 412 : error.code === "AREA_DRAFT_IDEMPOTENCY_CONFLICT" ? 409 : 503;
    const details = error.expectedRevision === undefined ? [] : [{ path: "revision", reason: `expected=${error.expectedRevision};actual=${error.actualRevision ?? "missing"}` }];
    return appError(status, error.code, publicMessage(error.code), details, status === 503);
  }
  return appError(503, "AREA_DRAFT_STORAGE_UNAVAILABLE", "Area draft storage is temporarily unavailable.", [], true);
}
function publicMessage(code: string): string {
  if (code === "AREA_DRAFT_NOT_FOUND") return "Area draft was not found.";
  if (code === "AREA_DRAFT_REVISION_CONFLICT") return "Area draft revision precondition failed.";
  if (code === "AREA_DRAFT_IDEMPOTENCY_CONFLICT") return "Idempotency key is already bound to another command.";
  return "Area draft storage is temporarily unavailable.";
}
function appError(status: number, code: string, message: string, details: Array<{ path: string; reason: string }> = [], retryable = false): AppException {
  return new AppException({ status, code, message, details, retryable });
}
function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new AreaDraftValidationError("query must be an object.", "query");
  return value as Record<string, unknown>;
}

function productionDraftId(actorId: string, idempotencyKey: string): string {
  return `draft_${hashAreaDraftCommand({
    operation: "production_area_draft_identity",
    actorId,
    idempotencyKey,
  }).slice(0, 32)}`;
}

function projectJsonSnapshot(value: unknown): unknown {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new AreaDraftValidationError("production Area cannot be represented as JSON.", "payload.sourceArea");
  }
  return JSON.parse(serialized) as unknown;
}
