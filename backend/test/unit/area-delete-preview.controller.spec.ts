import { Reflector } from "@nestjs/core";
import type { FastifyReply } from "fastify";
import type { AppConfigService } from "../../src/common/config/app-config.service";
import type { AppRequest } from "../../src/common/http/request.types";
import { PERMISSIONS_KEY } from "../../src/modules/auth/adapters/inbound/http/permissions.decorator";
import { ROLES_KEY } from "../../src/modules/auth/adapters/inbound/http/roles.decorator";
import { ModuleAreaDeletePreviewController } from "../../src/modules/areas/adapters/inbound/http/area-delete-preview.controller";
import type { AreaDeletePreviewApplicationService } from "../../src/modules/areas/application/area-delete-preview.application.service";

describe("ModuleAreaDeletePreviewController", () => {
  const config = { contractVersion: "1.0.0" } as AppConfigService;

  it("requires admin and the narrow module-delete materialization permission", () => {
    const reflector = new Reflector();
    expect(reflector.get<string[]>(ROLES_KEY, ModuleAreaDeletePreviewController)).toEqual(["admin"]);
    expect(reflector.get<string[]>(PERMISSIONS_KEY, ModuleAreaDeletePreviewController)).toEqual([
      "area.materialize.delete",
    ]);
  });

  it("forwards actor/path/body/If-Match and emits revision/no-store headers", async () => {
    const body = { schemaVersion: "area-delete-preview-command.v1" };
    const preview = jest.fn(async () => ({
      moduleRevision: "revision-01",
      previewSha256: "a".repeat(64),
    }));
    const header = jest.fn();
    const controller = new ModuleAreaDeletePreviewController(
      { preview } as unknown as AreaDeletePreviewApplicationService,
      config,
    );
    const request = {
      requestId: "req-delete-preview",
      headers: { "if-match": '"revision-01"' },
      auth: { user: { id: "admin-01" } },
    } as unknown as AppRequest;

    const result = await controller.preview(
      request,
      { header } as unknown as FastifyReply,
      "workspace:module-01",
      "delete01",
      body,
    );

    expect(preview).toHaveBeenCalledWith({
      actorId: "admin-01",
      moduleId: "workspace:module-01",
      areaResRef: "delete01",
      ifMatchHeader: '"revision-01"',
      body,
    });
    expect(header).toHaveBeenNthCalledWith(1, "ETag", '"revision-01"');
    expect(header).toHaveBeenNthCalledWith(2, "Cache-Control", "no-store");
    expect(result).toEqual({
      contractVersion: "1.0.0",
      requestId: "req-delete-preview",
      data: { moduleRevision: "revision-01", previewSha256: "a".repeat(64) },
    });
  });
});
