import { AppException } from "../../src/common/http/app-exception";
import type { AppConfigService } from "../../src/common/config/app-config.service";
import type { AreasApplicationService } from "../../src/modules/areas/application/areas.application.service";
import type { CatalogApplicationService } from "../../src/modules/catalog/application/catalog.application.service";
import { MemoryProcessingJobsRepository } from "../../src/modules/processing-jobs/adapters/outbound/memory/memory-processing-jobs.repository";
import type { ProcessingJobsPublisherPort } from "../../src/modules/processing-jobs/application/ports/processing-jobs-publisher.port";
import { ProcessingJobsApplicationService } from "../../src/modules/processing-jobs/application/processing-jobs.application.service";

describe("ProcessingJobsApplicationService", () => {
  let catalogService: jest.Mocked<CatalogApplicationService>;
  let areasService: jest.Mocked<AreasApplicationService>;
  let publisher: jest.Mocked<ProcessingJobsPublisherPort>;
  let repository: MemoryProcessingJobsRepository;
  let service: ProcessingJobsApplicationService;

  beforeEach(async () => {
    catalogService = {
      listPlaceables: jest.fn(),
      listCreatures: jest.fn(),
      listItems: jest.fn(),
      getPlaceablePreview: jest.fn(),
      getCreaturePreview: jest.fn(),
      getItemPreview: jest.fn(),
      processPlaceable: jest.fn(),
      processCreature: jest.fn(),
      processItem: jest.fn(),
      getProcessedPlaceable: jest.fn(),
      getProcessedCreature: jest.fn(),
      getProcessedItem: jest.fn(),
      benchmarkPlaceables: jest.fn(),
      getProcessedPlaceableAssetDelivery: jest.fn(),
      getProcessedPlaceableAsset: jest.fn()
    } as unknown as jest.Mocked<CatalogApplicationService>;

    areasService = {
      listAreas: jest.fn(),
      getArea: jest.fn(),
      getAreaPreview: jest.fn(),
      processArea: jest.fn(),
      getProcessedArea: jest.fn()
    } as unknown as jest.Mocked<AreasApplicationService>;

    publisher = {
      publishQueued: jest.fn().mockResolvedValue(1),
      publishDeadLetter: jest.fn().mockResolvedValue(1)
    };

    repository = new MemoryProcessingJobsRepository();
    service = new ProcessingJobsApplicationService(
      catalogService,
      areasService,
      buildConfig({ processingJobsInlineEnabled: true, processingJobsMaxAttempts: 2 }),
      repository,
      publisher
    );
    await service.onModuleInit();
  });

  it("enqueues and completes placeable job", async () => {
    catalogService.processPlaceable.mockResolvedValue({
      cache: {
        key: "cache-placeable",
        hit: false,
        storedAt: "2026-05-24T00:00:00.000Z",
        hits: 0
      },
      placeable: { templateId: "plc_market_stall_001" } as never
    });

    const queued = await service.enqueueJob(
      {
        task: "process_placeable",
        targetId: "plc_market_stall_001",
        options: {
          bypassCache: false,
          includeBenchmarkMetadata: true,
          subtypeHint: "vvxy"
        }
      },
      "builder.user"
    );

    const completed = await waitForJobStatus(service, queued.jobId, "completed");
    const result = await service.getJobResult(queued.jobId);

    expect(queued.status).toBe("queued");
    expect(completed.hasResult).toBe(true);
    expect(result.entityType).toBe("placeable");
    expect(result.entityId).toBe("plc_market_stall_001");
    expect(catalogService.processPlaceable).toHaveBeenCalledWith({
      templateId: "plc_market_stall_001",
      subtypeHint: "vvxy",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });
    expect(publisher.publishQueued).toHaveBeenCalled();
  });

  it("returns not-ready for running job result and then completes item job", async () => {
    const deferred = createDeferred<{
      cache: { key: string; hit: boolean; storedAt: string; hits: number };
      item: unknown;
    }>();
    catalogService.processItem.mockReturnValue(deferred.promise as never);

    const queued = await service.enqueueJob(
      {
        task: "process_item",
        targetId: "itm_health_potion_001",
        options: {
          bypassCache: true,
          includeBenchmarkMetadata: false
        }
      },
      "builder.user"
    );

    await expect(service.getJobResult(queued.jobId)).rejects.toMatchObject({
      code: "PROCESSING_JOB_NOT_READY"
    });

    deferred.resolve({
      cache: {
        key: "cache-item",
        hit: false,
        storedAt: "2026-05-24T00:00:00.000Z",
        hits: 0
      },
      item: { templateId: "itm_health_potion_001" }
    });

    const completed = await waitForJobStatus(service, queued.jobId, "completed");
    expect(completed.hasResult).toBe(true);
  });

  it("retries failed job and publishes dead letter after max attempts", async () => {
    catalogService.processCreature.mockRejectedValue(
      new AppException({
        status: 500,
        code: "CREATURE_PROCESS_FAILED",
        message: "creature failed"
      })
    );

    const queued = await service.enqueueJob(
      {
        task: "process_creature",
        targetId: "cre_guard_human",
        options: {
          bypassCache: true,
          includeBenchmarkMetadata: true
        }
      },
      "builder.user"
    );

    const failed = await waitForJobStatus(service, queued.jobId, "failed");
    expect(failed.error?.code).toBe("CREATURE_PROCESS_FAILED");
    expect(failed.attemptCount).toBe(2);
    expect(publisher.publishQueued).toHaveBeenCalledTimes(2);
    expect(publisher.publishDeadLetter).toHaveBeenCalledTimes(1);
  });

  it("cancels queued job when inline execution is disabled", async () => {
    const localService = new ProcessingJobsApplicationService(
      catalogService,
      areasService,
      buildConfig({ processingJobsInlineEnabled: false }),
      new MemoryProcessingJobsRepository(),
      publisher
    );
    await localService.onModuleInit();

    const queued = await localService.enqueueJob(
      {
        task: "process_area",
        targetId: "area_market_district_001",
        options: {
          bypassCache: true,
          includeBenchmarkMetadata: true
        }
      },
      "builder.user"
    );

    const cancelled = await localService.cancelJob(queued.jobId, "admin.user", "stop now");
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelledReason).toBe("stop now");
  });

  it("retries cancelled job", async () => {
    const localService = new ProcessingJobsApplicationService(
      catalogService,
      areasService,
      buildConfig({ processingJobsInlineEnabled: false }),
      new MemoryProcessingJobsRepository(),
      publisher
    );
    await localService.onModuleInit();

    const queued = await localService.enqueueJob(
      {
        task: "process_area",
        targetId: "area_market_district_001",
        options: {
          bypassCache: true,
          includeBenchmarkMetadata: true
        }
      },
      "builder.user"
    );

    await localService.cancelJob(queued.jobId, "admin.user", "stop now");
    const retried = await localService.retryJob(queued.jobId, "builder.user");
    expect(retried.status).toBe("queued");
    expect(retried.cancelRequested).toBe(false);
  });

  it("deduplicates enqueue by idempotency key", async () => {
    areasService.processArea.mockResolvedValue({
      cache: {
        key: "cache-area",
        hit: false,
        storedAt: "2026-05-24T00:00:00.000Z",
        hits: 0
      },
      area: { areaId: "area_market_district_001" } as never
    });

    const first = await service.enqueueJob(
      {
        task: "process_area",
        targetId: "area_market_district_001",
        idempotencyKey: "idem-1",
        options: {
          bypassCache: true,
          includeBenchmarkMetadata: true
        }
      },
      "builder.user"
    );

    const second = await service.enqueueJob(
      {
        task: "process_area",
        targetId: "area_market_district_001",
        idempotencyKey: "idem-1",
        options: {
          bypassCache: true,
          includeBenchmarkMetadata: true
        }
      },
      "builder.user"
    );

    expect(first.jobId).toBe(second.jobId);
    const listed = await service.listJobs(10);
    expect(listed).toHaveLength(1);
  });
});

async function waitForJobStatus(
  service: ProcessingJobsApplicationService,
  jobId: string,
  expected: "completed" | "failed"
) {
  const timeoutAt = Date.now() + 2_500;
  while (Date.now() < timeoutAt) {
    const job = await service.getJob(jobId);
    if (job.status === expected) {
      return job;
    }
    await sleep(10);
  }
  throw new Error(`Timed out while waiting for ${expected} status.`);
}

function createDeferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function buildConfig(
  overrides: Partial<{
    processingJobsInlineEnabled: boolean;
    processingJobsMaxAttempts: number;
    processingJobsRetryBaseDelayMs: number;
    processingJobsRetryMaxDelayMs: number;
  }> = {}
) {
  const config = {
    processingJobsInlineEnabled: true,
    processingJobsMaxAttempts: 3,
    processingJobsRetryBaseDelayMs: 1,
    processingJobsRetryMaxDelayMs: 5
  };
  return {
    ...config,
    ...overrides
  } as AppConfigService;
}
