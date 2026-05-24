import { AppException } from "../../src/common/http/app-exception";
import { ProcessingGraphApplicationService } from "../../src/modules/processing-graph/application/processing-graph.application.service";
import type { ProcessingGraphSnapshotRepositoryPort } from "../../src/modules/processing-graph/application/ports/processing-graph-snapshot-repository.port";
import type { AreaRepositoryPort } from "../../src/modules/areas/application/ports/area-repository.port";
import type { AreaRecord } from "../../src/modules/areas/domain/area.types";
import type { TemplateCatalogRepositoryPort } from "../../src/modules/catalog/application/ports/template-catalog-repository.port";
import type { TemplateRecord } from "../../src/modules/catalog/domain/template.types";

describe("ProcessingGraphApplicationService", () => {
  let areaRepository: jest.Mocked<AreaRepositoryPort>;
  let templateRepository: jest.Mocked<TemplateCatalogRepositoryPort>;
  let snapshotRepository: jest.Mocked<ProcessingGraphSnapshotRepositoryPort>;
  let service: ProcessingGraphApplicationService;

  const areas: AreaRecord[] = [
    {
      areaId: "area_alpha",
      name: "Area Alpha",
      biome: "urban",
      width: 20,
      height: 20,
      tags: ["alpha"],
      benchmark: true,
      previewImageUrl: "/alpha.webp",
      textureAtlasId: "atlas_alpha",
      objects: [
        {
          objectId: "obj_1",
          kind: "placeable",
          templateId: "tpl_placeable_vfx",
          x: 1,
          y: 2,
          z: 0,
          bearing: 0
        },
        {
          objectId: "obj_2",
          kind: "creature",
          templateId: "tpl_creature_guard",
          x: 3,
          y: 4,
          z: 0,
          bearing: 90
        }
      ],
      updatedAt: "2026-05-24T12:00:00.000Z"
    }
  ];

  const templates: TemplateRecord[] = [
    {
      templateId: "tpl_placeable_vfx",
      kind: "placeable",
      placeableSubtype: "vfx",
      resref: "plc_torch_smoke_vfx",
      name: "Torch VFX Anchor",
      category: "effects",
      tags: ["vfx"],
      previewImageUrl: "/vfx.webp",
      metadata: {
        vfxPreset: "torch_smoke_soft"
      }
    },
    {
      templateId: "tpl_creature_guard",
      kind: "creature",
      resref: "cre_guard_human",
      name: "Guard",
      category: "humanoid",
      tags: ["guard"],
      previewImageUrl: "/guard.webp",
      metadata: {}
    }
  ];

  beforeEach(() => {
    areaRepository = {
      list: jest.fn(),
      findById: jest.fn()
    };
    templateRepository = {
      listByKind: jest.fn(),
      findByKindAndId: jest.fn(),
      findByKindAndResref: jest.fn()
    };
    snapshotRepository = {
      getLatest: jest.fn(),
      saveLatest: jest.fn()
    };
    service = new ProcessingGraphApplicationService(
      areaRepository,
      templateRepository,
      snapshotRepository
    );

    areaRepository.list.mockResolvedValue({
      items: [
        {
          areaId: areas[0].areaId,
          name: areas[0].name,
          biome: areas[0].biome,
          width: areas[0].width,
          height: areas[0].height,
          tags: areas[0].tags,
          benchmark: areas[0].benchmark,
          previewImageUrl: areas[0].previewImageUrl,
          textureAtlasId: areas[0].textureAtlasId,
          objectCounts: {
            placeables: 1,
            creatures: 1,
            items: 0,
            total: 2
          },
          updatedAt: areas[0].updatedAt
        }
      ],
      total: 1,
      limit: 100,
      offset: 0
    });
    areaRepository.findById.mockImplementation(async (areaId: string) => {
      return areas.find((entry) => entry.areaId === areaId) ?? null;
    });
    templateRepository.listByKind.mockImplementation(async (kind) => {
      const items = templates.filter((entry) => entry.kind === kind);
      return {
        items,
        total: items.length,
        limit: 500,
        offset: 0
      };
    });
    snapshotRepository.getLatest.mockResolvedValue(null);
    snapshotRepository.saveLatest.mockResolvedValue();
  });

  it("builds graph summary with deterministic indexes", async () => {
    const summary = await service.getGraphSummary();

    expect(summary.statistics.areas).toBe(1);
    expect(summary.statistics.areaObjects).toBe(2);
    expect(summary.statistics.templates).toBe(2);
    expect(summary.statistics.textureAtlases).toBe(1);
    expect(summary.statistics.vfxPresets).toBe(1);
    expect(summary.datasetHash).toEqual(expect.any(String));
    expect(summary.resourceGraph.nodes.some((node) => node.kind === "vfx_preset")).toBe(true);
    expect(summary.indexes.templatesByArea.area_alpha).toEqual([
      "tpl_creature_guard",
      "tpl_placeable_vfx"
    ]);
    expect(summary.indexes.areasByTemplate.tpl_placeable_vfx).toEqual(["area_alpha"]);
  });

  it("returns area subgraph for selected area", async () => {
    const graph = await service.getAreaSubgraph("area_alpha");

    expect(graph.areaId).toBe("area_alpha");
    expect(graph.objectNodes).toHaveLength(2);
    expect(graph.resourceNodes.some((node) => node.kind === "template")).toBe(true);
    expect(graph.resourceNodes.some((node) => node.kind === "texture_atlas")).toBe(true);
    expect(graph.resourceNodes.some((node) => node.kind === "vfx_preset")).toBe(true);
    expect(graph.stats.uniqueTemplates).toBe(2);
  });

  it("throws AREA_NOT_FOUND when area does not exist in graph", async () => {
    await expect(service.getAreaSubgraph("missing")).rejects.toBeInstanceOf(AppException);
    await expect(service.getAreaSubgraph("missing")).rejects.toMatchObject({
      code: "AREA_NOT_FOUND"
    });
  });

  it("builds delta preview against empty baseline", async () => {
    const delta = await service.previewDeltaAgainstLatest();

    expect(delta.baseline).toBe("none");
    expect(delta.changed).toBe(true);
    expect(delta.summary.added).toBeGreaterThan(0);
    expect(delta.currentDatasetHash).toEqual(expect.any(String));
    expect(delta.impacted.areas).toContain("area_alpha");
    expect(delta.impacted.templates).toContain("tpl_placeable_vfx");
  });

  it("checkpoints snapshot and stores latest graph when changed", async () => {
    const result = await service.checkpointLatestSnapshot("builder.user");

    expect(result.checkpointUpdated).toBe(true);
    expect(result.triggeredBy).toBe("builder.user");
    expect(snapshotRepository.saveLatest).toHaveBeenCalledTimes(1);
    expect(result.delta.changed).toBe(true);
  });

  it("returns unchanged delta and skips save when dataset hash is unchanged", async () => {
    const current = await service.getGraphSnapshot();
    snapshotRepository.getLatest.mockResolvedValue(current);

    const result = await service.checkpointLatestSnapshot("builder.user");

    expect(result.checkpointUpdated).toBe(false);
    expect(result.delta.changed).toBe(false);
    expect(result.delta.summary).toEqual({
      added: 0,
      changed: 0,
      deleted: 0
    });
    expect(snapshotRepository.saveLatest).not.toHaveBeenCalled();
  });
});
