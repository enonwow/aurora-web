import { AreaDraftApplicationService } from "../../src/modules/areas/application/area-draft.application.service";
import { MemoryAreaDraftRepository } from "../../src/modules/areas/adapters/outbound/memory/memory-area-draft.repository";

describe("AreaDraftApplicationService", () => {
  const productionArea = {
    areaId: "area_crypt01",
    name: "Crypt 01",
    updatedAt: "2026-08-07T09:59:00.000Z",
    sourceResources: {
      areSha256: "a".repeat(64),
      gitSha256: "b".repeat(64),
      gicSha256: "c".repeat(64),
      ifoSha256: "d".repeat(64),
    },
    tiles: [],
    objects: [],
    optionalRuntimeField: undefined,
  };
  const areas = {
    processArea: jest.fn(async () => ({
      cache: {
        key: "processed-area-cache-01",
        hit: true,
        storedAt: "2026-08-07T09:59:30.000Z",
        hits: 1,
      },
      area: productionArea,
    })),
  };
  const service = () =>
    new AreaDraftApplicationService(
      new MemoryAreaDraftRepository({ nowIso: () => "2026-08-07T10:00:00.000Z" }),
      areas as never,
    );
  const body = { schemaVersion: "area-draft.v1", title: "Draft", source: { type: "new" }, payload: { future: { preserved: true } } };

  it("validates and hashes save commands before repository mutation", async () => {
    const result = await service().save({ actorId: "actor-a", draftId: "draft_01", ifMatchHeader: '"0"', idempotencyKey: "idem-save-01", body });
    expect(result).toMatchObject({ idempotency: "created", snapshot: { draftId: "draft_01", revision: 1, normalizedSha256: expect.stringMatching(/^[a-f0-9]{64}$/u) } });
  });

  it("returns stable AppException codes for missing actor, stale revision, and invalid input", async () => {
    await expect(service().save({ actorId: "", draftId: "draft_01", ifMatchHeader: '"0"', idempotencyKey: "idem-save-01", body })).rejects.toMatchObject({ code: "AREA_DRAFT_UNAUTHORIZED", status: 401 });
    const subject = service();
    await subject.save({ actorId: "actor-a", draftId: "draft_01", ifMatchHeader: '"0"', idempotencyKey: "idem-save-01", body });
    await expect(subject.save({ actorId: "actor-a", draftId: "draft_01", ifMatchHeader: '"0"', idempotencyKey: "idem-save-02", body })).rejects.toMatchObject({ code: "AREA_DRAFT_REVISION_CONFLICT", status: 412 });
    await expect(subject.save({ actorId: "actor-a", draftId: "bad/id", ifMatchHeader: '"1"', idempotencyKey: "idem-save-03", body })).rejects.toMatchObject({ code: "AREA_DRAFT_INVALID" });
  });

  it("lists, opens, deletes, and replays delete through one application boundary", async () => {
    const subject = service();
    await subject.save({ actorId: "actor-a", draftId: "draft_01", ifMatchHeader: '"0"', idempotencyKey: "idem-save-01", body });
    expect((await subject.list("actor-a", { pageSize: "25" })).items).toHaveLength(1);
    expect((await subject.open("actor-a", "draft_01", { revision: "1" })).revision).toBe(1);
    const deleted = await subject.delete({ actorId: "actor-a", draftId: "draft_01", ifMatchHeader: '"1"', idempotencyKey: "idem-delete-01" });
    expect(deleted.result.deleted).toBe(true);
    expect((await subject.delete({ actorId: "actor-a", draftId: "draft_01", ifMatchHeader: '"1"', idempotencyKey: "idem-delete-01" })).idempotency).toBe("replayed");
  });

  it("copies one exact processed production Area into an idempotent owner draft", async () => {
    const subject = service();
    const input = {
      actorId: "actor-a",
      areaId: "area_crypt01",
      idempotencyKey: "open-copy-01",
      body: {
        schemaVersion: "area-draft-open.v1",
        draftTitle: "Crypt 01 - Working Copy",
      },
    };

    const created = await subject.openProductionAsDraft(input);
    const replayed = await subject.openProductionAsDraft(input);

    expect(areas.processArea).toHaveBeenCalledWith({
      areaId: "area_crypt01",
      bypassCache: false,
    });
    expect(areas.processArea).toHaveBeenCalledTimes(1);
    expect(created).toMatchObject({
      idempotency: "created",
      snapshot: {
        revision: 1,
        source: { type: "production_area", areaId: "area_crypt01" },
        draft: {
          schemaVersion: "area-draft.v1",
          title: "Crypt 01 - Working Copy",
          payload: {
            schemaVersion: "production-area-draft-payload.v1",
            sourceArea: {
              areaId: "area_crypt01",
              name: "Crypt 01",
              updatedAt: "2026-08-07T09:59:00.000Z",
              sourceResources: {
                areSha256: "a".repeat(64),
                gitSha256: "b".repeat(64),
                gicSha256: "c".repeat(64),
                ifoSha256: "d".repeat(64),
              },
              tiles: [],
              objects: [],
            },
            provenance: {
              areaId: "area_crypt01",
              sourceUpdatedAt: "2026-08-07T09:59:00.000Z",
              processingCacheKey: "processed-area-cache-01",
              sourceAreSha256: "a".repeat(64),
              sourceGitSha256: "b".repeat(64),
              sourceGicSha256: "c".repeat(64),
              sourceIfoSha256: "d".repeat(64),
            },
          },
        },
      },
    });
    expect(replayed).toMatchObject({
      idempotency: "replayed",
      snapshot: { draftId: created.snapshot.draftId, revision: 1 },
    });
    expect(created.snapshot.draftId).toMatch(/^draft_[a-f0-9]{32}$/u);
  });

  it("rejects a production Area that cannot be represented as JSON", async () => {
    const invalidAreas = {
      processArea: jest.fn(async () => ({
        cache: {
          key: "processed-area-cache-invalid",
          hit: false,
          storedAt: "2026-08-07T09:59:30.000Z",
          hits: 0,
        },
        area: undefined,
      })),
    };
    const subject = new AreaDraftApplicationService(
      new MemoryAreaDraftRepository({ nowIso: () => "2026-08-07T10:00:00.000Z" }),
      invalidAreas as never,
    );

    await expect(subject.openProductionAsDraft({
      actorId: "actor-a",
      areaId: "area_invalid",
      idempotencyKey: "open-copy-invalid-01",
      body: {
        schemaVersion: "area-draft-open.v1",
        draftTitle: "Invalid Area copy",
      },
    })).rejects.toMatchObject({
      code: "AREA_DRAFT_INVALID",
      details: [{
        path: "payload.sourceArea",
        reason: "AREA_DRAFT_INVALID: production Area cannot be represented as JSON.",
      }],
    });
  });
});
