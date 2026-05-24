import {
  parseAreaSubgraphParams,
  parseDeltaJobListQuery,
  parseDeltaJobParams
} from "../../src/modules/processing-graph/adapters/inbound/http/processing-graph.schemas";

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

  it("accepts valid delta job id param", () => {
    const value = "1dd53f87-667e-4c8d-b8eb-d9b1f6454b20";
    expect(parseDeltaJobParams({ jobId: value })).toEqual({ jobId: value });
  });

  it("rejects invalid delta job id param", () => {
    expect(() => parseDeltaJobParams({ jobId: "abc" })).toThrow(
      "Delta job request validation failed."
    );
  });

  it("parses delta jobs list query with default and limit", () => {
    expect(parseDeltaJobListQuery({})).toEqual({ limit: 20 });
    expect(parseDeltaJobListQuery({ limit: "50" })).toEqual({ limit: 50 });
  });

  it("rejects out-of-range delta jobs list limit", () => {
    expect(() => parseDeltaJobListQuery({ limit: 5000 })).toThrow(
      "Delta job list query validation failed."
    );
  });
});
