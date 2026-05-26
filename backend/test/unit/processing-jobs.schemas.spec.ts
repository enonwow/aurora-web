import { AppException } from "../../src/common/http/app-exception";
import {
  parseJobActionPayload,
  parseCreateJobPayload,
  parseJobIdParams,
  parseJobListQuery,
  parseJobMetricsQuery,
  parseJobStatusBatchPayload
} from "../../src/modules/processing-jobs/adapters/inbound/http/processing-jobs.schemas";

describe("processing-jobs.schemas", () => {
  it("parses create payload defaults", () => {
    const parsed = parseCreateJobPayload({
      task: "process_placeable",
      targetId: "plc_market_stall_001"
    });

    expect(parsed).toEqual({
      task: "process_placeable",
      targetId: "plc_market_stall_001",
      idempotencyKey: undefined,
      traceId: undefined,
      options: {
        bypassCache: true,
        includeBenchmarkMetadata: true,
        subtypeHint: undefined
      }
    });
  });

  it("parses boolean aliases and placeable subtype hint", () => {
    const parsed = parseCreateJobPayload({
      task: "process_placeable",
      targetId: "plc_market_stall_001",
      options: {
        bypassCache: "false",
        includeBenchmarkMetadata: "1",
        subtypeHint: "vvxy"
      },
      idempotencyKey: "  idem-1  ",
      traceId: "trace-abc"
    });

    expect(parsed.idempotencyKey).toBe("idem-1");
    expect(parsed.traceId).toBe("trace-abc");
    expect(parsed.options).toEqual({
      bypassCache: false,
      includeBenchmarkMetadata: true,
      subtypeHint: "vvxy"
    });
  });

  it("rejects subtypeHint for non-placeable tasks", () => {
    expect(() =>
      parseCreateJobPayload({
        task: "process_area",
        targetId: "area_market_district_001",
        options: {
          subtypeHint: "door"
        }
      })
    ).toThrow(AppException);
  });

  it("parses list query defaults", () => {
    expect(parseJobListQuery({})).toEqual({ limit: 20 });
  });

  it("rejects invalid list query", () => {
    expect(() => parseJobListQuery({ limit: "0" })).toThrow(AppException);
  });

  it("parses metrics query defaults", () => {
    expect(parseJobMetricsQuery({})).toEqual({ windowSize: 1000 });
  });

  it("rejects invalid metrics query", () => {
    expect(() => parseJobMetricsQuery({ windowSize: "0" })).toThrow(AppException);
  });

  it("parses UUID params", () => {
    const value = "4f35f98e-fd7d-4af8-9d68-6e3f8ce58ff4";
    expect(parseJobIdParams({ jobId: value })).toEqual({ jobId: value });
  });

  it("rejects invalid UUID params", () => {
    expect(() => parseJobIdParams({ jobId: "abc" })).toThrow(AppException);
  });

  it("parses optional action reason payload", () => {
    expect(parseJobActionPayload({ reason: "  cancel now  " })).toEqual({
      reason: "cancel now"
    });
    expect(parseJobActionPayload({})).toEqual({});
  });

  it("parses batch status payload and dedupes job ids", () => {
    const firstJobId = "4f35f98e-fd7d-4af8-9d68-6e3f8ce58ff4";
    const secondJobId = "2a68d4d8-0294-4911-a428-927f7f94f6cf";
    expect(
      parseJobStatusBatchPayload({
        jobIds: [firstJobId, secondJobId, firstJobId]
      })
    ).toEqual({
      jobIds: [firstJobId, secondJobId]
    });
  });

  it("rejects invalid batch status payload", () => {
    expect(() => parseJobStatusBatchPayload({ jobIds: [] })).toThrow(AppException);
    expect(() => parseJobStatusBatchPayload({ jobIds: ["bad"] })).toThrow(AppException);
  });
});
