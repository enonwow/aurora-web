import { AreaCertificationController } from "../../src/modules/areas/adapters/inbound/http/area-certification.controller";
import {
  parseAreaTileCertificationPageQuery,
  parseAreaTileCertificationTilesetResRef,
} from "../../src/modules/areas/adapters/inbound/http/area-certification.schemas";
import type { AreaTileCertificationQueryApplicationService } from "../../src/modules/areas/application/area-tile-certification-query.application.service";
import type { AppConfigService } from "../../src/common/config/app-config.service";
import type { AppRequest } from "../../src/common/http/request.types";

describe("Area tile-certification HTTP boundary", () => {
  it("parses canonical identities and bounded page queries", () => {
    expect(parseAreaTileCertificationTilesetResRef("tms01")).toBe("tms01");
    expect(parseAreaTileCertificationPageQuery({})).toEqual({
      limit: 256,
      offset: 0,
    });
    expect(parseAreaTileCertificationPageQuery({ limit: "17", offset: "34" }))
      .toEqual({ limit: 17, offset: 34 });
  });

  it.each([
    ["uppercase tileset", () => parseAreaTileCertificationTilesetResRef("TMS01")],
    ["oversized page", () => parseAreaTileCertificationPageQuery({ limit: 257 })],
    ["negative offset", () => parseAreaTileCertificationPageQuery({ offset: -1 })],
    ["unknown query key", () => parseAreaTileCertificationPageQuery({ extra: "1" })],
  ])("rejects %s with one sanitized 422 contract", (_label, execute) => {
    expect(execute).toThrow(expect.objectContaining({
      code: "AREA_TILE_CERTIFICATION_QUERY_INVALID",
      details: expect.any(Array),
    }));
    try {
      execute();
    } catch (error) {
      expect((error as { getStatus(): number }).getStatus()).toBe(422);
    }
  });

  it("forwards the exact parsed query and wraps the service result", async () => {
    const page = {
      schemaVersion: "area-tile-certification-page.v1",
      tilesetResRef: "tms01",
      items: [],
      total: 0,
      limit: 11,
      offset: 22,
    };
    const service = {
      getTilesetPage: jest.fn().mockResolvedValue(page),
    } as unknown as AreaTileCertificationQueryApplicationService;
    const controller = new AreaCertificationController(
      service,
      { contractVersion: "1.0.0" } as AppConfigService,
    );

    await expect(controller.getTilesetPage(
      { requestId: "req-certification" } as AppRequest,
      "tms01",
      { limit: "11", offset: "22" },
    )).resolves.toEqual({
      contractVersion: "1.0.0",
      requestId: "req-certification",
      data: page,
    });
    expect(service.getTilesetPage).toHaveBeenCalledWith("tms01", {
      limit: 11,
      offset: 22,
    });
  });
});
