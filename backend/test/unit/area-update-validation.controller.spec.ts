import { Reflector } from "@nestjs/core";
import type { FastifyReply } from "fastify";
import type { AppConfigService } from "../../src/common/config/app-config.service";
import type { AppRequest } from "../../src/common/http/request.types";
import { PERMISSIONS_KEY } from "../../src/modules/auth/adapters/inbound/http/permissions.decorator";
import { ROLES_KEY } from "../../src/modules/auth/adapters/inbound/http/roles.decorator";
import { ModuleAreaUpdateValidationController } from "../../src/modules/areas/adapters/inbound/http/area-update-validation.controller";
import type { AreaUpdateValidationApplicationService } from "../../src/modules/areas/application/area-update-validation.application.service";
import { areaTileProductionAdmissionFixture } from "./helpers/area-tile-production-admission-fixture";

describe("ModuleAreaUpdateValidationController", () => {
  const config = { contractVersion: "1.0.0" } as AppConfigService;

  it("requires admin and the narrow module-update materialization permission", () => {
    const reflector = new Reflector();

    expect(reflector.get<string[]>(ROLES_KEY, ModuleAreaUpdateValidationController)).toEqual([
      "admin",
    ]);
    expect(
      reflector.get<string[]>(PERMISSIONS_KEY, ModuleAreaUpdateValidationController),
    ).toEqual(["area.materialize.update"]);
  });

  it("forwards exact path/body/actor identities and emits revision/no-store headers", async () => {
    const body = { schemaVersion: "area-update-validation.v1" };
    const validate = jest.fn(async () => ({
      validationId: "validation-01",
      moduleRevision: "revision-17",
      tileProductionAdmission: areaTileProductionAdmissionFixture("tin01"),
    }));
    const header = jest.fn();
    const response = { header } as unknown as FastifyReply;
    const controller = new ModuleAreaUpdateValidationController(
      { validate } as unknown as AreaUpdateValidationApplicationService,
      config,
    );

    const result = await controller.validate(
      request("admin-01"),
      response,
      "workspace:module-01",
      "crypt01",
      body,
    );

    expect(validate).toHaveBeenCalledWith({
      moduleId: "workspace:module-01",
      areaResRef: "crypt01",
      actorId: "admin-01",
      body,
    });
    expect(header).toHaveBeenNthCalledWith(1, "ETag", '"revision-17"');
    expect(header).toHaveBeenNthCalledWith(2, "Cache-Control", "no-store");
    expect(result).toEqual({
      contractVersion: "1.0.0",
      requestId: "req-area-update",
      data: {
        validationId: "validation-01",
        moduleRevision: "revision-17",
        tileProductionAdmission: areaTileProductionAdmissionFixture("tin01"),
      },
    });
  });
});

function request(actorId: string): AppRequest {
  return {
    requestId: "req-area-update",
    auth: { user: { id: actorId } },
  } as AppRequest;
}
