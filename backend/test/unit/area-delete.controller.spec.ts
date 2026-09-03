import { Reflector } from "@nestjs/core";
import type { FastifyReply } from "fastify";
import type { AppConfigService } from "../../src/common/config/app-config.service";
import type { AppRequest } from "../../src/common/http/request.types";
import { PERMISSIONS_KEY } from "../../src/modules/auth/adapters/inbound/http/permissions.decorator";
import { ROLES_KEY } from "../../src/modules/auth/adapters/inbound/http/roles.decorator";
import { ModuleAreaDeleteController } from "../../src/modules/areas/adapters/inbound/http/area-delete.controller";
import type { AreaDeleteApplicationService } from "../../src/modules/areas/application/area-delete.application.service";

describe("ModuleAreaDeleteController", () => {
  const config = { contractVersion: "1.0.0" } as AppConfigService;

  it("requires admin and the narrow destructive materialization permission", () => {
    const reflector = new Reflector();
    expect(reflector.get<string[]>(ROLES_KEY, ModuleAreaDeleteController)).toEqual(["admin"]);
    expect(reflector.get<string[]>(PERMISSIONS_KEY, ModuleAreaDeleteController)).toEqual([
      "area.materialize.delete",
    ]);
  });

  it("forwards destructive headers and returns the verified revision receipt", async () => {
    const body = { schemaVersion: "area-delete-command.v1" };
    const deleteArea = jest.fn(async () => ({
      idempotency: "created" as const,
      receipt: { transactionId: "delete-1", newModuleRevision: "2".repeat(64) },
    }));
    const header = jest.fn();
    const controller = new ModuleAreaDeleteController(
      { delete: deleteArea } as unknown as AreaDeleteApplicationService,
      config,
    );
    const request = {
      requestId: "req-delete", auth: { user: { id: "admin-01" } },
    } as AppRequest;

    const result = await controller.delete(
      request,
      { header } as unknown as FastifyReply,
      "workspace:module-01",
      "crypt01",
      "delete-key-01",
      `"${"1".repeat(64)}"`,
      body,
    );
    expect(deleteArea).toHaveBeenCalledWith({
      moduleId: "workspace:module-01", areaResRef: "crypt01", actorId: "admin-01",
      idempotencyKey: "delete-key-01", ifMatchHeader: `"${"1".repeat(64)}"`, body,
    });
    expect(header).toHaveBeenNthCalledWith(1, "ETag", `"${"2".repeat(64)}"`);
    expect(header).toHaveBeenNthCalledWith(2, "Cache-Control", "no-store");
    expect(header).toHaveBeenNthCalledWith(3, "Idempotency-Status", "created");
    expect(result).toEqual({
      contractVersion: "1.0.0", requestId: "req-delete",
      data: { transactionId: "delete-1", newModuleRevision: "2".repeat(64) },
    });
  });
});
