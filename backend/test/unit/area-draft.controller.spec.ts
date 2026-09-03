import { Reflector } from "@nestjs/core";
import type { FastifyReply } from "fastify";
import type { AppConfigService } from "../../src/common/config/app-config.service";
import type { AppRequest } from "../../src/common/http/request.types";
import { PERMISSIONS_KEY } from "../../src/modules/auth/adapters/inbound/http/permissions.decorator";
import { ROLES_KEY } from "../../src/modules/auth/adapters/inbound/http/roles.decorator";
import {
  AreaDraftController,
  ProductionAreaDraftController,
} from "../../src/modules/areas/adapters/inbound/http/area-draft.controller";

describe("AreaDraftController", () => {
  const config = { contractVersion: "1.1.0" } as AppConfigService;
  const reflector = new Reflector();

  it("denies viewers and declares a narrow permission on every operation", () => {
    expect(reflector.get<string[]>(ROLES_KEY, AreaDraftController)).toEqual(["builder", "dm", "admin"]);
    expect(reflector.get<string[]>(PERMISSIONS_KEY, AreaDraftController.prototype.list)).toEqual(["area.draft.read"]);
    expect(reflector.get<string[]>(PERMISSIONS_KEY, AreaDraftController.prototype.open)).toEqual(["area.draft.read"]);
    expect(reflector.get<string[]>(PERMISSIONS_KEY, AreaDraftController.prototype.save)).toEqual(["area.draft.update"]);
    expect(reflector.get<string[]>(PERMISSIONS_KEY, AreaDraftController.prototype.delete)).toEqual(["area.draft.delete"]);
    expect(reflector.get<string[]>(ROLES_KEY, ProductionAreaDraftController)).toEqual(["builder", "dm", "admin"]);
    expect(
      reflector.get<string[]>(
        PERMISSIONS_KEY,
        ProductionAreaDraftController.prototype.openAsDraft,
      ),
    ).toEqual(["scene.read", "area.draft.update"]);
  });

  it("forwards actor, query/body/preconditions and emits revision/no-store headers", async () => {
    const app = { list: jest.fn(async () => ({ items: [], nextCursor: null })), open: jest.fn(async () => snapshot()), save: jest.fn(async () => ({ idempotency: "created", snapshot: snapshot() })), delete: jest.fn(async () => ({ idempotency: "created", result: { draftId: "draft_01", deletedRevision: 3, deleted: true } })) };
    const controller = new AreaDraftController(app as never, config);
    const response = reply();
    await controller.list(request(), { pageSize: "25" });
    await controller.open(request(), response.value, "draft_01", { revision: "3" });
    await controller.save(request(), response.value, "draft_01", "idem-save-01", '"3"', { schemaVersion: "area-draft.v1" });
    await controller.delete(request(), response.value, "draft_01", "idem-delete-01", '"3"');
    expect(app.list).toHaveBeenCalledWith("actor-01", { pageSize: "25" });
    expect(app.open).toHaveBeenCalledWith("actor-01", "draft_01", { revision: "3" });
    expect(app.save).toHaveBeenCalledWith(expect.objectContaining({ actorId: "actor-01", draftId: "draft_01", idempotencyKey: "idem-save-01", ifMatchHeader: '"3"' }));
    expect(app.delete).toHaveBeenCalledWith(expect.objectContaining({ actorId: "actor-01", idempotencyKey: "idem-delete-01", ifMatchHeader: '"3"' }));
    expect(response.header).toHaveBeenCalledWith("ETag", '"3"');
    expect(response.header).toHaveBeenCalledWith("Cache-Control", "no-store");
  });

  it("forwards copy-on-open identity and emits revision/no-store headers", async () => {
    const app = {
      openProductionAsDraft: jest.fn(async () => ({
        idempotency: "created",
        snapshot: snapshot(),
      })),
    };
    const controller = new ProductionAreaDraftController(app as never, config);
    const response = reply();

    await controller.openAsDraft(
      request(),
      response.value,
      "area_crypt01",
      "open-copy-01",
      { schemaVersion: "area-draft-open.v1", draftTitle: "Crypt copy" },
    );

    expect(app.openProductionAsDraft).toHaveBeenCalledWith({
      actorId: "actor-01",
      areaId: "area_crypt01",
      idempotencyKey: "open-copy-01",
      body: { schemaVersion: "area-draft-open.v1", draftTitle: "Crypt copy" },
    });
    expect(response.header).toHaveBeenCalledWith("ETag", '"3"');
    expect(response.header).toHaveBeenCalledWith("Cache-Control", "no-store");
  });
});

function snapshot() { return { draftId: "draft_01", title: "Draft", revision: 3, updatedAt: "2026-08-07T10:00:00.000Z", normalizedSha256: "a".repeat(64), source: { type: "new" }, draft: {} }; }
function request(): AppRequest { return { requestId: "req-draft", auth: { user: { id: "actor-01" } } } as AppRequest; }
function reply() { const header = jest.fn(); return { header, value: { header } as unknown as FastifyReply }; }
