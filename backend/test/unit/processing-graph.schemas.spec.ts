import { parseAreaSubgraphParams } from "../../src/modules/processing-graph/adapters/inbound/http/processing-graph.schemas";

describe("processing graph schemas", () => {
  it("accepts valid areaId param", () => {
    expect(parseAreaSubgraphParams({ areaId: "area_market_district_001" })).toEqual({
      areaId: "area_market_district_001"
    });
  });

  it("rejects empty areaId param", () => {
    expect(() => parseAreaSubgraphParams({ areaId: "   " })).toThrow(
      "Area subgraph request validation failed."
    );
  });
});
