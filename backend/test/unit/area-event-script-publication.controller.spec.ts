import { Reflector } from "@nestjs/core";
import type { FastifyReply } from "fastify";
import type { AppConfigService } from "../../src/common/config/app-config.service";
import type { AppRequest } from "../../src/common/http/request.types";
import { PERMISSIONS_KEY } from "../../src/modules/auth/adapters/inbound/http/permissions.decorator";
import { ROLES_KEY } from "../../src/modules/auth/adapters/inbound/http/roles.decorator";
import { ModuleAreaEventScriptPublicationController } from "../../src/modules/areas/adapters/inbound/http/area-event-script-publication.controller";
import type { AreaEventScriptPublicationApplicationService } from "../../src/modules/areas/application/area-event-script-publication.application.service";

describe("Module Area event-script publication controller", () => {
  const config = { contractVersion: "1.0.0" } as AppConfigService;

  it("requires admin and the existing materialization permission", () => {
    const reflector = new Reflector();
    expect(reflector.get<string[]>(ROLES_KEY, ModuleAreaEventScriptPublicationController))
      .toEqual(["admin"]);
    expect(reflector.get<string[]>(PERMISSIONS_KEY, ModuleAreaEventScriptPublicationController))
      .toEqual(["area.materialize.update"]);
  });

  it("forwards validation without mutation headers", async () => {
    const validate = jest.fn(async () => ({
      status: "compiled" as const,
      moduleRevision: "a".repeat(64),
    }));
    const response = { header: jest.fn() } as unknown as FastifyReply;
    const controller = new ModuleAreaEventScriptPublicationController(
      { validate } as unknown as AreaEventScriptPublicationApplicationService,
      config,
    );

    const result = await controller.validate(
      request(),
      response,
      "module:a",
      "area_enter",
      { schemaVersion: "area-event-script-source-command.v1" },
    );

    expect(validate).toHaveBeenCalledWith({
      moduleId: "module:a",
      targetResRef: "area_enter",
      actorId: "admin-1",
      body: { schemaVersion: "area-event-script-source-command.v1" },
    });
    expect(response.header).toHaveBeenNthCalledWith(1, "ETag", `"${"a".repeat(64)}"`);
    expect(response.header).toHaveBeenNthCalledWith(2, "Cache-Control", "no-store");
    expect(result).toEqual({
      contractVersion: "1.0.0",
      requestId: "req-script",
      data: { status: "compiled", moduleRevision: "a".repeat(64) },
    });
  });

  it("forwards a revision-fenced source query and disables caching", async () => {
    const readSource = jest.fn(async () => ({
      schemaVersion: "area-event-script-source-snapshot.v1" as const,
      moduleRevision: "a".repeat(64),
      sourceText: "void main() {}\n",
    }));
    const response = { header: jest.fn() } as unknown as FastifyReply;
    const controller = new ModuleAreaEventScriptPublicationController(
      { readSource } as unknown as AreaEventScriptPublicationApplicationService,
      config,
    );

    const result = await controller.readSource(
      request(),
      response,
      "module:a",
      "area_enter",
      "a".repeat(64),
    );

    expect(readSource).toHaveBeenCalledWith({
      moduleId: "module:a",
      targetResRef: "area_enter",
      expectedModuleRevision: "a".repeat(64),
      actorId: "admin-1",
    });
    expect(response.header).toHaveBeenNthCalledWith(1, "ETag", `"${"a".repeat(64)}"`);
    expect(response.header).toHaveBeenNthCalledWith(2, "Cache-Control", "no-store");
    expect(result).toEqual({
      contractVersion: "1.0.0",
      requestId: "req-script",
      data: expect.objectContaining({
        schemaVersion: "area-event-script-source-snapshot.v1",
        sourceText: "void main() {}\n",
      }),
    });
  });

  it("forwards publication fencing headers and exposes the verified successor revision", async () => {
    const publish = jest.fn(async () => ({
      idempotency: "created" as const,
      receipt: { transactionId: "script-tx-1", newModuleRevision: "b".repeat(64) },
    }));
    const response = { header: jest.fn() } as unknown as FastifyReply;
    const controller = new ModuleAreaEventScriptPublicationController(
      { publish } as unknown as AreaEventScriptPublicationApplicationService,
      config,
    );
    const body = { schemaVersion: "area-event-script-source-command.v1" };

    const result = await controller.publish(
      request(),
      response,
      "module:a",
      "area_enter",
      "publish-1",
      `"${"a".repeat(64)}"`,
      body,
    );

    expect(publish).toHaveBeenCalledWith({
      moduleId: "module:a",
      targetResRef: "area_enter",
      actorId: "admin-1",
      idempotencyKey: "publish-1",
      ifMatchHeader: `"${"a".repeat(64)}"`,
      body,
    });
    expect(response.header).toHaveBeenNthCalledWith(1, "ETag", `"${"b".repeat(64)}"`);
    expect(response.header).toHaveBeenNthCalledWith(2, "Cache-Control", "no-store");
    expect(response.header).toHaveBeenNthCalledWith(3, "Idempotency-Status", "created");
    expect(result).toEqual({
      contractVersion: "1.0.0",
      requestId: "req-script",
      data: { transactionId: "script-tx-1", newModuleRevision: "b".repeat(64) },
    });
  });
});

function request(): AppRequest {
  return {
    requestId: "req-script",
    auth: { user: { id: "admin-1" } },
  } as AppRequest;
}
