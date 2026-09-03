import { describe, expect, it, vi } from "vitest";
import {
  createAreaEventScriptCatalogFacade,
} from "../../../../src/modules/areas/application/areaEventScriptCatalogFacade";
import type {
  AreaEventScriptCatalogPort,
} from "../../../../src/modules/areas/ports/areaEventScriptCatalogPort";
import { areaEventScriptCatalogFixture } from "./areaEventScriptCatalogFixture";

describe("createAreaEventScriptCatalogFacade", () => {
  it("queries through the dedicated port with exact bounded pagination", async () => {
    const port: AreaEventScriptCatalogPort = {
      list: vi.fn().mockResolvedValue(areaEventScriptCatalogFixture()),
    };
    const facade = createAreaEventScriptCatalogFacade(port);

    await expect(facade.load("token", { search: "enter", limit: 50, offset: 10 }))
      .resolves.toEqual({ ok: true, value: areaEventScriptCatalogFixture() });
    expect(port.list).toHaveBeenCalledWith("token", {
      search: "enter",
      limit: 50,
      offset: 10,
    });
  });

  it("maps adapter details to one safe retryable failure", async () => {
    const port: AreaEventScriptCatalogPort = {
      list: vi.fn().mockRejectedValue(new Error("host/storage secret")),
    };
    const facade = createAreaEventScriptCatalogFacade(port);

    await expect(facade.load("token", { search: "", limit: 100, offset: 0 }))
      .resolves.toEqual({
        ok: false,
        error: {
          code: "PORT_FAILURE",
          message: "The Area event-script catalog could not be loaded.",
          retryable: true,
        },
      });
  });
});
