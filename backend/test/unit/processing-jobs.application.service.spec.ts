import { AppException } from "../../src/common/http/app-exception";
import type { AreasApplicationService } from "../../src/modules/areas/application/areas.application.service";
import type { CatalogApplicationService } from "../../src/modules/catalog/application/catalog.application.service";
import { ProcessingJobsApplicationService } from "../../src/modules/processing-jobs/application/processing-jobs.application.service";

describe("ProcessingJobsApplicationService", () => {
  let catalogService: jest.Mocked<CatalogApplicationService>;
  let areasService: jest.Mocked<AreasApplicationService>;
  let service: ProcessingJobsApplicationService;

  beforeEach(() => {
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

    service = new ProcessingJobsApplicationService(catalogService, areasService);
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

    const queued = service.enqueueJob(
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
    const result = service.getJobResult(queued.jobId);

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
    expect(service.listJobs(10)[0].jobId).toBe(queued.jobId);
  });

  it("returns not-ready for running job result and then completes item job", async () => {
    const deferred = createDeferred<{
      cache: { key: string; hit: boolean; storedAt: string; hits: number };
      item: unknown;
    }>();

    catalogService.processItem.mockReturnValue(deferred.promise as never);

    const queued = service.enqueueJob(
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

    expect(() => service.getJobResult(queued.jobId)).toThrow(AppException);
    expect(() => service.getJobResult(queued.jobId)).toThrow(
      "Processing job result is not ready yet."
    );

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

  it("returns failed result state for crashing creature job", async () => {
    catalogService.processCreature.mockRejectedValue(
      new AppException({
        status: 500,
        code: "CREATURE_PROCESS_FAILED",
        message: "creature failed"
      })
    );

    const queued = service.enqueueJob(
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

    expect(() => service.getJobResult(queued.jobId)).toThrow(AppException);
    expect(() => service.getJobResult(queued.jobId)).toThrow("creature failed");
  });

  it("dispatches area jobs to area processing service", async () => {
    areasService.processArea.mockResolvedValue({
      cache: {
        key: "cache-area",
        hit: false,
        storedAt: "2026-05-24T00:00:00.000Z",
        hits: 0
      },
      area: { areaId: "area_market_district_001" } as never
    });

    const queued = service.enqueueJob(
      {
        task: "process_area",
        targetId: "area_market_district_001",
        options: {
          bypassCache: false,
          includeBenchmarkMetadata: true
        }
      },
      "builder.user"
    );

    await waitForJobStatus(service, queued.jobId, "completed");

    expect(areasService.processArea).toHaveBeenCalledWith({
      areaId: "area_market_district_001",
      bypassCache: false
    });
  });
});

async function waitForJobStatus(
  service: ProcessingJobsApplicationService,
  jobId: string,
  expected: "completed" | "failed"
) {
  const timeoutAt = Date.now() + 2_000;
  while (Date.now() < timeoutAt) {
    const job = service.getJob(jobId);
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
