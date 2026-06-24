import { AppException } from "../../src/common/http/app-exception";
import { parseCatalogListQuery } from "../../src/modules/catalog/adapters/inbound/http/catalog.schemas";

describe("parseCatalogListQuery", () => {
  it("maps subtype aliases to vfx", () => {
    const parsed = parseCatalogListQuery({
      subtype: "vvx",
      limit: 10,
      offset: 0
    });
    const parsedVvxy = parseCatalogListQuery({
      subtype: "vvxy",
      limit: 10,
      offset: 0
    });

    expect(parsed.subtype).toBe("vfx");
    expect(parsedVvxy.subtype).toBe("vfx");
  });

  it("rejects corpse as a non-Aurora subtype filter", () => {
    expect(() =>
      parseCatalogListQuery({
      subtype: "corpse",
      limit: 10,
      offset: 0
      })
    ).toThrow(AppException);
  });

  it("parses benchmark flag", () => {
    const parsed = parseCatalogListQuery({
      benchmark: "true"
    });

    expect(parsed.benchmark).toBe(true);
  });

  it("accepts large catalog pages for frontend list caching", () => {
    const parsed = parseCatalogListQuery({
      limit: "1000",
      offset: "0"
    });

    expect(parsed.limit).toBe(1000);
  });

  it("rejects catalog pages above the frontend cache limit", () => {
    expect(() => parseCatalogListQuery({ limit: "1001" })).toThrow(AppException);
  });

  it("throws validation error for unsupported benchmark value", () => {
    expect(() => parseCatalogListQuery({ benchmark: "yes" })).toThrow(AppException);
  });
});
