import { Reflector } from "@nestjs/core";
import type { FastifyReply } from "fastify";
import type { AppConfigService } from "../../src/common/config/app-config.service";
import type { AppRequest } from "../../src/common/http/request.types";
import { PERMISSIONS_KEY } from "../../src/modules/auth/adapters/inbound/http/permissions.decorator";
import { ROLES_KEY } from "../../src/modules/auth/adapters/inbound/http/roles.decorator";
import {
  ModuleAreaRenameController,
  ModuleAreaRenamePreviewController,
} from "../../src/modules/areas/adapters/inbound/http/area-rename.controller";

describe("Area rename HTTP controllers", () => {
  const config = { contractVersion: "1.0.0" } as AppConfigService;
  const guardedControllers: any[] = [
    ModuleAreaRenamePreviewController,
    ModuleAreaRenameController,
  ];

  it.each(guardedControllers)(
    "requires admin and narrow rename permission",
    (controllerClass) => {
      const reflector = new Reflector();
      expect(reflector.get<string[]>(ROLES_KEY, controllerClass)).toEqual(["admin"]);
      expect(reflector.get<string[]>(PERMISSIONS_KEY, controllerClass)).toEqual([
        "area.materialize.rename",
      ]);
    },
  );

  it("forwards mutation headers and returns the verified successor ETag", async () => {
    const rename = jest.fn(async () => ({
      idempotency: "created" as const,
      receipt: { transactionId: "rename-1", newModuleRevision: "2".repeat(64) },
    }));
    const header = jest.fn();
    const controller: any = new ModuleAreaRenameController({ rename } as never, config);
    const request = {
      requestId: "req-rename", auth: { user: { id: "admin-01" } },
    } as AppRequest;
    const body = { schemaVersion: "area-rename-command.v1" };

    const result = await controller.rename(
      request,
      { header } as unknown as FastifyReply,
      "workspace:rename-http",
      "old_area",
      "rename-key",
      `"${"1".repeat(64)}"`,
      body,
    );

    expect(rename).toHaveBeenCalledWith({
      moduleId: "workspace:rename-http", areaResRef: "old_area", actorId: "admin-01",
      idempotencyKey: "rename-key", ifMatchHeader: `"${"1".repeat(64)}"`, body,
    });
    expect(header).toHaveBeenNthCalledWith(1, "ETag", `"${"2".repeat(64)}"`);
    expect(header).toHaveBeenNthCalledWith(2, "Cache-Control", "no-store");
    expect(header).toHaveBeenNthCalledWith(3, "Idempotency-Status", "created");
    expect(result).toMatchObject({ requestId: "req-rename", data: { transactionId: "rename-1" } });
  });
});
