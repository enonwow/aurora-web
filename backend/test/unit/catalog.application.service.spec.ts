import { AppException } from "../../src/common/http/app-exception";
import { CatalogApplicationService } from "../../src/modules/catalog/application/catalog.application.service";
import type { TemplateCatalogRepositoryPort } from "../../src/modules/catalog/application/ports/template-catalog-repository.port";
import type {
  TemplateListResult,
  TemplateRecord
} from "../../src/modules/catalog/domain/template.types";

describe("CatalogApplicationService", () => {
  let repository: jest.Mocked<TemplateCatalogRepositoryPort>;
  let service: CatalogApplicationService;

  beforeEach(() => {
    repository = {
      listByKind: jest.fn(),
      findByKindAndId: jest.fn()
    };
    service = new CatalogApplicationService(repository);
  });

  it("lists placeables through repository", async () => {
    const result: TemplateListResult = {
      items: [buildTemplate("placeable", "plc_001")],
      total: 1,
      limit: 20,
      offset: 0
    };
    repository.listByKind.mockResolvedValue(result);

    const response = await service.listPlaceables({ limit: 20, offset: 0 });

    expect(repository.listByKind).toHaveBeenCalledWith("placeable", {
      limit: 20,
      offset: 0
    });
    expect(response).toEqual(result);
  });

  it("passes placeable subtype filter to repository", async () => {
    repository.listByKind.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0
    });

    await service.listPlaceables({
      subtype: "vfx",
      limit: 20,
      offset: 0
    });

    expect(repository.listByKind).toHaveBeenCalledWith("placeable", {
      subtype: "vfx",
      limit: 20,
      offset: 0
    });
  });

  it("passes placeable benchmark filter to repository", async () => {
    repository.listByKind.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0
    });

    await service.listPlaceables({
      benchmark: true,
      limit: 20,
      offset: 0
    });

    expect(repository.listByKind).toHaveBeenCalledWith("placeable", {
      benchmark: true,
      limit: 20,
      offset: 0
    });
  });

  it("lists creatures through repository", async () => {
    repository.listByKind.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0
    });

    await service.listCreatures({ limit: 20, offset: 0 });

    expect(repository.listByKind).toHaveBeenCalledWith("creature", {
      limit: 20,
      offset: 0
    });
  });

  it("lists items through repository", async () => {
    repository.listByKind.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0
    });

    await service.listItems({ limit: 20, offset: 0 });

    expect(repository.listByKind).toHaveBeenCalledWith("item", {
      limit: 20,
      offset: 0
    });
  });

  it("returns preview payload when template exists", async () => {
    const template = {
      ...buildTemplate("placeable", "plc_001"),
      benchmarkCandidate: true,
      benchmarkBucket: "placeable_heavy_vfx"
    };
    repository.findByKindAndId.mockResolvedValue(template);

    const preview = await service.getPlaceablePreview("plc_001");

    expect(preview.templateId).toBe("plc_001");
    expect(preview.kind).toBe("placeable");
    expect(preview.placeableSubtype).toBe("generic");
    expect(preview.benchmarkCandidate).toBe(true);
    expect(preview.benchmarkBucket).toBe("placeable_heavy_vfx");
    expect(preview.resref).toBe(template.resref);
    expect(preview.previewImageUrl).toBe(template.previewImageUrl);
  });

  it("throws TEMPLATE_NOT_FOUND when template is missing", async () => {
    repository.findByKindAndId.mockResolvedValue(null);

    expect.assertions(4);
    try {
      await service.getPlaceablePreview("missing");
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      const appError = error as AppException;
      expect(appError.code).toBe("TEMPLATE_NOT_FOUND");
      expect(appError.getStatus()).toBe(404);
      expect((appError.getResponse() as { message: string }).message).toBe(
        "placeable template was not found."
      );
    }
  });

  it("returns kind-specific not-found message for creature preview", async () => {
    repository.findByKindAndId.mockResolvedValue(null);

    expect.assertions(1);
    try {
      await service.getCreaturePreview("missing-creature");
    } catch (error) {
      expect((error as AppException).getResponse()).toMatchObject({
        message: "creature template was not found."
      });
    }
  });

  it("returns kind-specific not-found message for item preview", async () => {
    repository.findByKindAndId.mockResolvedValue(null);

    expect.assertions(1);
    try {
      await service.getItemPreview("missing-item");
    } catch (error) {
      expect((error as AppException).getResponse()).toMatchObject({
        message: "item template was not found."
      });
    }
  });

  it("returns false benchmark marker for non-benchmark preview", async () => {
    const template = buildTemplate("placeable", "plc_002");
    repository.findByKindAndId.mockResolvedValue(template);

    const preview = await service.getPlaceablePreview("plc_002");

    expect(preview).toMatchObject({
      benchmarkCandidate: false
    });
  });
});

function buildTemplate(kind: TemplateRecord["kind"], id: string): TemplateRecord {
  return {
    templateId: id,
    kind,
    placeableSubtype: kind === "placeable" ? "generic" : undefined,
    resref: `${kind}_resref`,
    name: `${kind} template`,
    category: "test",
    tags: ["tag"],
    previewImageUrl: `/preview/${kind}/${id}.webp`,
    metadata: {
      sample: true
    }
  };
}
