import type { AppConfigService } from "../../src/common/config/app-config.service";
import { ProcessingJobsController } from "../../src/modules/processing-jobs/adapters/inbound/http/processing-jobs.controller";
import { ProcessingJobsApplicationService } from "../../src/modules/processing-jobs/application/processing-jobs.application.service";

describe("ProcessingJobsController", () => {
  let service: jest.Mocked<ProcessingJobsApplicationService>;
  let config: AppConfigService;
  let controller: ProcessingJobsController;

  beforeEach(() => {
    service = {
      enqueueJob: jest.fn(),
      listJobs: jest.fn(),
      getJob: jest.fn(),
      getJobResult: jest.fn()
    } as unknown as jest.Mocked<ProcessingJobsApplicationService>;
    config = { contractVersion: "1.0.0" } as AppConfigService;
    controller = new ProcessingJobsController(service, config);
  });

  it("enqueues processing job with username from request context", async () => {
    service.enqueueJob.mockReturnValue({
      jobId: "da8b5a61-84f1-45c9-b7b9-85a4cf26d721",
      status: "queued",
      createdAt: "2026-05-26T00:00:00.000Z",
      triggeredBy: "builder.user",
      task: "process_placeable",
      targetId: "plc_market_stall_001",
      options: {
        bypassCache: true,
        includeBenchmarkMetadata: true
      },
      hasResult: false
    });

    const response = await controller.createJob(requestWithUser("builder.user"), {
      task: "process_placeable",
      targetId: "plc_market_stall_001",
      options: {
        bypassCache: "false",
        includeBenchmarkMetadata: "true"
      }
    });

    expect(service.enqueueJob).toHaveBeenCalledWith(
      {
        task: "process_placeable",
        targetId: "plc_market_stall_001",
        options: {
          bypassCache: false,
          includeBenchmarkMetadata: true,
          subtypeHint: undefined
        }
      },
      "builder.user"
    );
    expect(response.contractVersion).toBe("1.0.0");
    expect(response.data.status).toBe("queued");
  });

  it("lists jobs with parsed query limit", async () => {
    service.listJobs.mockReturnValue([{ jobId: "job-1" }] as never);

    const response = await controller.listJobs(requestWithUser("builder.user"), {
      limit: "17"
    });

    expect(service.listJobs).toHaveBeenCalledWith(17);
    expect(response.data).toEqual([{ jobId: "job-1" }]);
  });

  it("returns selected job by UUID id", async () => {
    const jobId = "2a68d4d8-0294-4911-a428-927f7f94f6cf";
    service.getJob.mockReturnValue({ jobId, status: "running" } as never);

    const response = await controller.getJob(requestWithUser("dm.user"), { jobId });

    expect(service.getJob).toHaveBeenCalledWith(jobId);
    expect(response.data).toEqual({ jobId, status: "running" });
  });

  it("returns job result by UUID id", async () => {
    const jobId = "f16af4bd-ccdd-4cf7-80f6-0840819d7643";
    service.getJobResult.mockReturnValue({
      entityType: "placeable",
      entityId: "plc_market_stall_001",
      cache: {
        key: "cache-key",
        hit: false,
        storedAt: "2026-05-26T00:00:00.000Z",
        hits: 0
      },
      payload: { ok: true }
    });

    const response = await controller.getJobResult(requestWithUser("dm.user"), {
      jobId
    });

    expect(service.getJobResult).toHaveBeenCalledWith(jobId);
    expect(response.data).toEqual({
      entityType: "placeable",
      entityId: "plc_market_stall_001",
      cache: {
        key: "cache-key",
        hit: false,
        storedAt: "2026-05-26T00:00:00.000Z",
        hits: 0
      },
      payload: { ok: true }
    });
  });

  it("rejects invalid job id in params", async () => {
    await expect(
      controller.getJob(requestWithUser("dm.user"), { jobId: "bad" })
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED"
    });
    expect(service.getJob).not.toHaveBeenCalled();
  });
});

function requestWithUser(username: string) {
  return {
    requestId: "req-test",
    auth: {
      user: {
        username
      }
    }
  } as never;
}
