import { AppException } from "../../src/common/http/app-exception";
import { AreasApplicationService } from "../../src/modules/areas/application/areas.application.service";
import type { AreaRepositoryPort } from "../../src/modules/areas/application/ports/area-repository.port";
import type {
  AreaListResult,
  AreaRecord
} from "../../src/modules/areas/domain/area.types";

describe("AreasApplicationService", () => {
  let repository: jest.Mocked<AreaRepositoryPort>;
  let service: AreasApplicationService;

  beforeEach(() => {
    repository = {
      list: jest.fn(),
      findById: jest.fn()
    };
    service = new AreasApplicationService(repository);
  });

  it("lists areas through repository", async () => {
    const result: AreaListResult = {
      items: [
        {
          areaId: "area_test_001",
          name: "Test Area",
          biome: "urban",
          width: 12,
          height: 12,
          tags: ["benchmark"],
          benchmark: true,
          previewImageUrl: "/preview.webp",
          textureAtlasId: "atlas_urban_v1",
          objectCounts: {
            placeables: 1,
            creatures: 1,
            items: 1,
            total: 3
          },
          updatedAt: "2026-05-23T00:00:00.000Z"
        }
      ],
      total: 1,
      limit: 20,
      offset: 0
    };
    repository.list.mockResolvedValue(result);

    const response = await service.listAreas({
      benchmark: true,
      limit: 20,
      offset: 0
    });

    expect(repository.list).toHaveBeenCalledWith({
      benchmark: true,
      limit: 20,
      offset: 0
    });
    expect(response).toEqual(result);
  });

  it("returns full area payload with composition counts", async () => {
    repository.findById.mockResolvedValue(buildArea("area_test_001"));

    const detail = await service.getArea("area_test_001");

    expect(detail.areaId).toBe("area_test_001");
    expect(detail.textureAtlas.atlasId).toBe("atlas_urban_v1");
    expect(detail.textureAtlas.cacheKey).toBe("atlas_urban_v1:12x12");
    expect(detail.textureAtlas.strategy).toBe("blob-cache");
    expect(detail.composition.placeables).toBe(1);
    expect(detail.composition.creatures).toBe(2);
    expect(detail.composition.items).toBe(1);
    expect(detail.composition.total).toBe(4);
    expect(detail.objects.length).toBe(4);
  });

  it("returns lightweight area preview payload", async () => {
    repository.findById.mockResolvedValue(buildArea("area_test_001"));

    const preview = await service.getAreaPreview("area_test_001");

    expect(preview.areaId).toBe("area_test_001");
    expect(preview.dimensions).toEqual({
      width: 12,
      height: 12
    });
    expect(preview.objectCounts.creatures).toBe(2);
    expect(preview.objectCounts.items).toBe(1);
    expect(preview.objectCounts.total).toBe(4);
  });

  it("throws AREA_NOT_FOUND when area is missing", async () => {
    repository.findById.mockResolvedValue(null);

    await expectAreaNotFound(service.getArea("missing"));
  });

  it("throws AREA_NOT_FOUND in preview when area is missing", async () => {
    repository.findById.mockResolvedValue(null);

    await expectAreaNotFound(service.getAreaPreview("missing"));
  });
});

function buildArea(id: string): AreaRecord {
  return {
    areaId: id,
    name: "Test Area",
    biome: "urban",
    width: 12,
    height: 12,
    tags: ["benchmark", "city"],
    benchmark: true,
    previewImageUrl: `/previews/${id}.webp`,
    textureAtlasId: "atlas_urban_v1",
    objects: [
      {
        objectId: "obj_plc_001",
        kind: "placeable",
        templateId: "plc_market_stall_001",
        x: 1,
        y: 2,
        z: 0,
        bearing: 0
      },
      {
        objectId: "obj_cre_001",
        kind: "creature",
        templateId: "cre_guard_human_001",
        x: 3,
        y: 4,
        z: 0,
        bearing: 90
      },
      {
        objectId: "obj_cre_002",
        kind: "creature",
        templateId: "cre_wolf_001",
        x: 4,
        y: 5,
        z: 0,
        bearing: 120
      },
      {
        objectId: "obj_itm_001",
        kind: "item",
        templateId: "itm_health_potion_001",
        x: 5,
        y: 6,
        z: 0,
        bearing: 180
      }
    ],
    updatedAt: "2026-05-23T00:00:00.000Z"
  };
}

async function expectAreaNotFound(promise: Promise<unknown>): Promise<void> {
  expect.assertions(4);
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(AppException);
    const appError = error as AppException;
    expect(appError.code).toBe("AREA_NOT_FOUND");
    expect(appError.getStatus()).toBe(404);
    expect((appError.getResponse() as { message: string }).message).toBe(
      "Area was not found."
    );
  }
}
