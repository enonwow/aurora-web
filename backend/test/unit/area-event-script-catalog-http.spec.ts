import type { AppConfigService } from "../../src/common/config/app-config.service";
import type { AppRequest } from "../../src/common/http/request.types";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../../src/modules/auth/adapters/inbound/http/permissions.decorator";
import { ROLES_KEY } from "../../src/modules/auth/adapters/inbound/http/roles.decorator";
import {
  AreaEventScriptCatalogController,
} from "../../src/modules/areas/adapters/inbound/http/area-event-script-catalog.controller";
import {
  parseAreaEventScriptCatalogQuery,
} from "../../src/modules/areas/adapters/inbound/http/area-event-script-catalog.schemas";
import type {
  AreaEventScriptCatalogApplicationService,
} from "../../src/modules/areas/application/area-event-script-catalog.application.service";

describe("Area event-script catalog HTTP boundary", () => {
  it("is deny-by-default behind explicit roles and scene.read permission", () => {
    const reflector = new Reflector();
    expect(reflector.get<string[]>(ROLES_KEY, AreaEventScriptCatalogController)).toEqual([
      "viewer",
      "builder",
      "dm",
      "admin",
    ]);
    expect(reflector.get<string[]>(PERMISSIONS_KEY, AreaEventScriptCatalogController))
      .toEqual(["scene.read"]);
  });

  it("accepts only the exact bounded canonical query", () => {
    expect(parseAreaEventScriptCatalogQuery({})).toEqual({
      search: "",
      limit: 100,
      offset: 0,
    });
    expect(parseAreaEventScriptCatalogQuery({ search: "enter", limit: "17", offset: "4" }))
      .toEqual({ search: "enter", limit: 17, offset: 4 });
  });

  it.each([
    ["uppercase search", { search: "Enter" }],
    ["whitespace search", { search: " enter" }],
    ["oversized search", { search: "a".repeat(17) }],
    ["oversized page", { limit: 201 }],
    ["negative offset", { offset: -1 }],
    ["unknown key", { extra: "1" }],
    ["array", { search: ["enter"] }],
  ])("rejects %s with a sanitized 422 contract", (_label, query) => {
    expect(() => parseAreaEventScriptCatalogQuery(query)).toThrow(expect.objectContaining({
      code: "AREA_EVENT_SCRIPT_CATALOG_QUERY_INVALID",
      details: expect.any(Array),
    }));
  });

  it("forwards the parsed query and wraps the immutable response", async () => {
    const page = {
      schemaVersion: "area-event-script-catalog.v1",
      moduleId: "module-current",
      moduleRevision: "d".repeat(64),
      coverage: "committed_module_only",
      items: [],
      total: 0,
      limit: 20,
      offset: 2,
      summary: {
        admittedCatalogCount: 0,
        sourceAndBytecode: 0,
        sourceOnly: 0,
        bytecodeOnly: 0,
        rejectedDescriptors: 0,
      },
      diagnostics: ["external_runtime_layers_not_resolved"],
    };
    const service = { query: jest.fn(async () => page) } as unknown as
      AreaEventScriptCatalogApplicationService;
    const controller = new AreaEventScriptCatalogController(
      service,
      { contractVersion: "1.0.0" } as AppConfigService,
    );

    await expect(controller.list(
      { requestId: "request-script-catalog" } as AppRequest,
      { search: "enter", limit: "20", offset: "2" },
    )).resolves.toEqual({
      contractVersion: "1.0.0",
      requestId: "request-script-catalog",
      data: page,
    });
    expect(service.query).toHaveBeenCalledWith({ search: "enter", limit: 20, offset: 2 });
  });
});
