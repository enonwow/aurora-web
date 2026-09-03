import { Reflector } from "@nestjs/core";
import type { FastifyReply } from "fastify";
import type { AppConfigService } from "../../src/common/config/app-config.service";
import type { AppRequest } from "../../src/common/http/request.types";
import { PERMISSIONS_KEY } from "../../src/modules/auth/adapters/inbound/http/permissions.decorator";
import { ROLES_KEY } from "../../src/modules/auth/adapters/inbound/http/roles.decorator";
import { ModuleAreaUpdateController } from "../../src/modules/areas/adapters/inbound/http/area-update.controller";
import type { AreaUpdateApplicationService } from "../../src/modules/areas/application/area-update.application.service";
import { areaTileProductionAdmissionFixture } from "./helpers/area-tile-production-admission-fixture";

describe("ModuleAreaUpdateController", () => {
  const config = { contractVersion: "1.0.0" } as AppConfigService;

  it("requires admin and the narrow Area materialization permission", () => {
    const reflector = new Reflector();
    expect(reflector.get<string[]>(ROLES_KEY, ModuleAreaUpdateController)).toEqual(["admin"]);
    expect(reflector.get<string[]>(PERMISSIONS_KEY, ModuleAreaUpdateController)).toEqual([
      "area.materialize.update",
    ]);
  });

  it("forwards headers and identities and returns the immutable receipt with revision metadata", async () => {
    const body = { schemaVersion: "area-update-command.v1" };
    const update = jest.fn(async () => ({
      idempotency: "created" as const,
      receipt: {
        transactionId: "update-1",
        newModuleRevision: "2".repeat(64),
        tileProductionAdmission: areaTileProductionAdmissionFixture("tin01"),
      },
    }));
    const header = jest.fn();
    const response = { header } as unknown as FastifyReply;
    const controller = new ModuleAreaUpdateController(
      { update } as unknown as AreaUpdateApplicationService,
      config,
    );

    const result = await controller.update(
      request(),
      response,
      "workspace:module-01",
      "crypt01",
      "update-key-01",
      `"${"1".repeat(64)}"`,
      body,
    );

    expect(update).toHaveBeenCalledWith({
      moduleId: "workspace:module-01",
      areaResRef: "crypt01",
      actorId: "admin-01",
      idempotencyKey: "update-key-01",
      ifMatchHeader: `"${"1".repeat(64)}"`,
      body,
    });
    expect(header).toHaveBeenNthCalledWith(1, "ETag", `"${"2".repeat(64)}"`);
    expect(header).toHaveBeenNthCalledWith(2, "Cache-Control", "no-store");
    expect(header).toHaveBeenNthCalledWith(3, "Idempotency-Status", "created");
    expect(result).toEqual({
      contractVersion: "1.0.0",
      requestId: "req-update",
      data: {
        transactionId: "update-1",
        newModuleRevision: "2".repeat(64),
        tileProductionAdmission: areaTileProductionAdmissionFixture("tin01"),
      },
    });
  });
});

function request(): AppRequest {
  return {
    requestId: "req-update",
    auth: { user: { id: "admin-01" } },
  } as AppRequest;
}
