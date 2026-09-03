import { Reflector } from "@nestjs/core";
import type { FastifyReply } from "fastify";
import type { AppConfigService } from "../../src/common/config/app-config.service";
import type { AppRequest } from "../../src/common/http/request.types";
import { PERMISSIONS_KEY } from "../../src/modules/auth/adapters/inbound/http/permissions.decorator";
import { ROLES_KEY } from "../../src/modules/auth/adapters/inbound/http/roles.decorator";
import {
  AreaCreationProfilesController,
  ModuleAreaCreateController,
} from "../../src/modules/areas/adapters/inbound/http/area-create.controller";
import type { AreaCreateApplicationService } from "../../src/modules/areas/application/area-create.application.service";
import { areaTileProductionAdmissionFixture } from "./helpers/area-tile-production-admission-fixture";

describe("Area Create HTTP controllers", () => {
  const config = { contractVersion: "1.0.0" } as AppConfigService;

  it.each([AreaCreationProfilesController, ModuleAreaCreateController])(
    "%p denies viewer metadata and requires the area.create permission",
    (controllerClass) => {
      const reflector = new Reflector();

      expect(reflector.get<string[]>(ROLES_KEY, controllerClass)).toEqual([
        "builder",
        "dm",
        "admin",
      ]);
      expect(reflector.get<string[]>(ROLES_KEY, controllerClass)).not.toContain(
        "viewer",
      );
      expect(reflector.get<string[]>(PERMISSIONS_KEY, controllerClass)).toEqual([
        "area.create",
      ]);
    },
  );

  it("profiles passes the authenticated actor and emits revision/no-store headers", async () => {
    const getProfiles = jest.fn(async () => ({
      moduleId: "workspace-module",
      moduleRevision: "revision-profiles",
      profiles: [],
    }));
    const response = reply();
    const controller = new AreaCreationProfilesController(
      { getProfiles } as unknown as AreaCreateApplicationService,
      config,
    );

    const result = await controller.profiles(request("actor-profiles"), response.value);

    expect(getProfiles).toHaveBeenCalledWith("actor-profiles");
    expect(response.header).toHaveBeenNthCalledWith(
      1,
      "ETag",
      '"revision-profiles"',
    );
    expect(response.header).toHaveBeenNthCalledWith(2, "Cache-Control", "no-store");
    expect(result).toEqual({
      contractVersion: "1.0.0",
      requestId: "req-area-create",
      data: {
        moduleId: "workspace-module",
        moduleRevision: "revision-profiles",
        profiles: [],
      },
    });
  });

  it("validate passes path, authenticated actor, and body and does not cache its receipt", async () => {
    const body = { schemaVersion: "area-create-command.v1" };
    const validate = jest.fn(async () => ({
      validationId: "validation-1",
      moduleRevision: "revision-validation",
      tileProductionAdmission: areaTileProductionAdmissionFixture(),
    }));
    const response = reply();
    const controller = new ModuleAreaCreateController(
      { validate } as unknown as AreaCreateApplicationService,
      config,
    );

    const result = await controller.validate(
      request("actor-validation"),
      response.value,
      "workspace-module",
      body,
    );

    expect(validate).toHaveBeenCalledWith(
      "workspace-module",
      "actor-validation",
      body,
    );
    expect(response.header).toHaveBeenNthCalledWith(
      1,
      "ETag",
      '"revision-validation"',
    );
    expect(response.header).toHaveBeenNthCalledWith(2, "Cache-Control", "no-store");
    expect(result.data).toEqual({
      validationId: "validation-1",
      moduleRevision: "revision-validation",
      tileProductionAdmission: areaTileProductionAdmissionFixture(),
    });
  });

  it("create forwards actor and raw precondition headers and emits the committed revision", async () => {
    const body = { schemaVersion: "area-create-command.v1" };
    const create = jest.fn(async () => ({
      idempotency: "created",
      receipt: {
        newModuleRevision: "revision-created",
        tileProductionAdmission: areaTileProductionAdmissionFixture(),
      },
    }));
    const response = reply();
    const controller = new ModuleAreaCreateController(
      { create } as unknown as AreaCreateApplicationService,
      config,
    );

    const result = await controller.create(
      request("actor-create"),
      response.value,
      "workspace-module",
      "idempotency-1",
      '"revision-before"',
      body,
    );

    expect(create).toHaveBeenCalledWith({
      moduleId: "workspace-module",
      actorId: "actor-create",
      idempotencyKey: "idempotency-1",
      ifMatchHeader: '"revision-before"',
      body,
    });
    expect(response.header).toHaveBeenNthCalledWith(
      1,
      "ETag",
      '"revision-created"',
    );
    expect(response.header).toHaveBeenNthCalledWith(2, "Cache-Control", "no-store");
    expect(result.data).toEqual({
      idempotency: "created",
      receipt: {
        newModuleRevision: "revision-created",
        tileProductionAdmission: areaTileProductionAdmissionFixture(),
      },
    });
  });

  it("forwards missing create headers unchanged so the application/coordinator rejects them", async () => {
    const create = jest.fn(async () => ({
      idempotency: "created",
      receipt: { newModuleRevision: "should-not-be-used" },
    }));
    const response = reply();
    const controller = new ModuleAreaCreateController(
      { create } as unknown as AreaCreateApplicationService,
      config,
    );

    await controller.create(
      request("actor-create"),
      response.value,
      "workspace-module",
      undefined,
      undefined,
      {},
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: undefined, ifMatchHeader: undefined }),
    );
  });
});

function request(actorId: string): AppRequest {
  return {
    requestId: "req-area-create",
    auth: { user: { id: actorId } },
  } as AppRequest;
}

function reply() {
  const header = jest.fn();
  return {
    header,
    value: { header } as unknown as FastifyReply,
  };
}
