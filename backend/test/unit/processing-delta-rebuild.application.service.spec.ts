import { AppException } from "../../src/common/http/app-exception";
import { ProcessingDeltaRebuildApplicationService } from "../../src/modules/processing-graph/application/processing-delta-rebuild.application.service";
import type { CatalogApplicationService } from "../../src/modules/catalog/application/catalog.application.service";
import type { ProcessingGraphApplicationService } from "../../src/modules/processing-graph/application/processing-graph.application.service";
import type { ProcessingGraphCheckpointResult } from "../../src/modules/processing-graph/domain/processing-graph.types";

describe("ProcessingDeltaRebuildApplicationService", () => {
  let graphService: jest.Mocked<ProcessingGraphApplicationService>;
  let catalogService: jest.Mocked<CatalogApplicationService>;
  let service: ProcessingDeltaRebuildApplicationService;

  beforeEach(() => {
    graphService = {
      getGraphSummary: jest.fn(),
      getAreaSubgraph: jest.fn(),
      getGraphSnapshot: jest.fn(),
      previewDeltaAgainstLatest: jest.fn(),
      checkpointLatestSnapshot: jest.fn()
    } as unknown as jest.Mocked<ProcessingGraphApplicationService>;
    catalogService = {
      listPlaceables: jest.fn(),
      listCreatures: jest.fn(),
      listItems: jest.fn(),
      getPlaceablePreview: jest.fn(),
      getCreaturePreview: jest.fn(),
      getItemPreview: jest.fn(),
      processPlaceable: jest.fn(),
      getProcessedPlaceable: jest.fn(),
      benchmarkPlaceables: jest.fn()
    } as unknown as jest.Mocked<CatalogApplicationService>;

    service = new ProcessingDeltaRebuildApplicationService(graphService, catalogService);
  });

  it("runs selective rebuild and executes placeable action only", async () => {
    graphService.checkpointLatestSnapshot.mockResolvedValue(
      checkpointResult({
        changed: true,
        impacted: {
          areas: ["area_alpha"],
          templates: ["tpl_placeable", "tpl_creature"],
          areaObjects: []
        }
      })
    );
    graphService.getGraphSnapshot.mockResolvedValue(
      snapshotWithTemplates([
        { templateId: "tpl_placeable", kind: "placeable" },
        { templateId: "tpl_creature", kind: "creature" }
      ])
    );
    catalogService.processPlaceable.mockResolvedValue({
      cache: {
        key: "k",
        hit: false,
        storedAt: "2026-05-24T00:00:00.000Z",
        hits: 0
      },
      placeable: {} as never
    });

    const job = await service.startDeltaRebuild("builder.user");

    expect(job.status).toBe("completed");
    expect(job.delta.changed).toBe(true);
    expect(job.actions.some((action) => action.type === "rebuild_placeable_cache")).toBe(true);
    expect(job.actions.some((action) => action.type === "rebuild_creature_projection")).toBe(
      true
    );
    expect(job.actions.some((action) => action.type === "rebuild_area_projection")).toBe(true);
    expect(job.stats.completed).toBe(1);
    expect(job.stats.skipped).toBe(2);
    expect(catalogService.processPlaceable).toHaveBeenCalledWith({
      templateId: "tpl_placeable",
      bypassCache: true,
      includeBenchmarkMetadata: true
    });
  });

  it("completes immediately when no delta changes", async () => {
    graphService.checkpointLatestSnapshot.mockResolvedValue(
      checkpointResult({
        changed: false,
        impacted: {
          areas: [],
          templates: [],
          areaObjects: []
        }
      })
    );
    graphService.getGraphSnapshot.mockResolvedValue(snapshotWithTemplates([]));

    const job = await service.startDeltaRebuild("builder.user");

    expect(job.status).toBe("completed");
    expect(job.actions).toHaveLength(0);
    expect(job.stats.total).toBe(0);
    expect(catalogService.processPlaceable).not.toHaveBeenCalled();
  });

  it("marks job failed when placeable action throws", async () => {
    graphService.checkpointLatestSnapshot.mockResolvedValue(
      checkpointResult({
        changed: true,
        impacted: {
          areas: [],
          templates: ["tpl_placeable"],
          areaObjects: []
        }
      })
    );
    graphService.getGraphSnapshot.mockResolvedValue(
      snapshotWithTemplates([{ templateId: "tpl_placeable", kind: "placeable" }])
    );
    catalogService.processPlaceable.mockRejectedValue(
      new AppException({
        status: 404,
        code: "TEMPLATE_NOT_FOUND",
        message: "placeable template was not found."
      })
    );

    const job = await service.startDeltaRebuild("builder.user");

    expect(job.status).toBe("failed");
    expect(job.stats.failed).toBe(1);
    expect(job.actions[0].status).toBe("failed");
    expect(job.actions[0].error?.code).toBe("TEMPLATE_NOT_FOUND");
  });

  it("lists and fetches jobs", async () => {
    graphService.checkpointLatestSnapshot.mockResolvedValue(
      checkpointResult({
        changed: false,
        impacted: {
          areas: [],
          templates: [],
          areaObjects: []
        }
      })
    );
    graphService.getGraphSnapshot.mockResolvedValue(snapshotWithTemplates([]));

    const created = await service.startDeltaRebuild("builder.user");
    const listed = service.listJobs(10);
    const fetched = service.getJob(created.jobId);

    expect(listed).toHaveLength(1);
    expect(listed[0].jobId).toBe(created.jobId);
    expect(fetched.jobId).toBe(created.jobId);
  });

  it("throws PROCESSING_JOB_NOT_FOUND for unknown job id", () => {
    expect(() => service.getJob("unknown")).toThrow(AppException);
    expect(() => service.getJob("unknown")).toThrow(
      "Processing delta rebuild job was not found."
    );
  });
});

function checkpointResult(input: {
  changed: boolean;
  impacted: {
    areas: string[];
    templates: string[];
    areaObjects: string[];
  };
}): ProcessingGraphCheckpointResult {
  return {
    checkpointUpdated: true,
    delta: {
      baseline: "latest",
      previousDatasetHash: "hash-prev",
      currentDatasetHash: "hash-now",
      changed: input.changed,
      summary: {
        added: input.changed ? 1 : 0,
        changed: input.changed ? 1 : 0,
        deleted: 0
      },
      resource: {
        summary: {
          added: input.changed ? 1 : 0,
          changed: 0,
          deleted: 0
        },
        nodes: []
      },
      scene: {
        summary: {
          added: 0,
          changed: input.changed ? 1 : 0,
          deleted: 0
        },
        nodes: []
      },
      impacted: input.impacted
    },
    snapshot: {
      datasetHash: "hash-now",
      generatedAt: "2026-05-24T00:00:00.000Z",
      statistics: {
        areas: 1,
        areaObjects: 1,
        templates: 1,
        textureAtlases: 1,
        vfxPresets: 0,
        edges: 1
      }
    },
    triggeredAt: "2026-05-24T00:00:00.000Z",
    triggeredBy: "builder.user"
  };
}

function snapshotWithTemplates(
  templates: Array<{ templateId: string; kind: "placeable" | "creature" | "item" }>
) {
  return {
    generatedAt: "2026-05-24T00:00:00.000Z",
    datasetHash: "hash-now",
    statistics: {
      areas: 1,
      areaObjects: 1,
      templates: templates.length,
      textureAtlases: 1,
      vfxPresets: 0,
      edges: 1
    },
    resourceGraph: {
      nodes: templates.map((template) => ({
        id: `template:${template.templateId}`,
        kind: "template" as const,
        label: template.templateId,
        hash: "h",
        metadata: {
          templateId: template.templateId,
          kind: template.kind
        }
      })),
      edges: []
    },
    sceneGraph: {
      nodes: [],
      edges: []
    },
    indexes: {
      areaByObject: {},
      objectsByArea: {},
      templatesByArea: {},
      objectsByTemplate: {},
      areasByTemplate: {}
    }
  };
}
