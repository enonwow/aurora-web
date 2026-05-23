import { AppException } from "../../src/common/http/app-exception";
import { parseCatalogListQuery } from "../../src/modules/catalog/adapters/inbound/http/catalog.schemas";

describe("parseCatalogListQuery", () => {
  it("maps subtype alias vvx to vfx", () => {
    const parsed = parseCatalogListQuery({
      subtype: "vvx",
      limit: 10,
      offset: 0
    });

    expect(parsed.subtype).toBe("vfx");
  });

  it("parses benchmark flag", () => {
    const parsed = parseCatalogListQuery({
      benchmark: "true"
    });

    expect(parsed.benchmark).toBe(true);
  });

  it("throws validation error for unsupported benchmark value", () => {
    expect(() => parseCatalogListQuery({ benchmark: "yes" })).toThrow(AppException);
  });
});
