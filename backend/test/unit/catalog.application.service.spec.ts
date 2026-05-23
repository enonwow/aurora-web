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
    const template = buildTemplate("placeable", "plc_001");
    repository.findByKindAndId.mockResolvedValue(template);

    const preview = await service.getPlaceablePreview("plc_001");

    expect(preview.templateId).toBe("plc_001");
    expect(preview.kind).toBe("placeable");
    expect(preview.placeableSubtype).toBe("generic");
    expect(preview.resref).toBe(template.resref);
    expect(preview.previewImageUrl).toBe(template.previewImageUrl);
  });

  it("throws TEMPLATE_NOT_FOUND when template is missing", async () => {
    repository.findByKindAndId.mockResolvedValue(null);

    const promise = service.getPlaceablePreview("missing");
    await expect(promise).rejects.toBeInstanceOf(AppException);
    await expect(promise).rejects.toMatchObject({
      code: "TEMPLATE_NOT_FOUND"
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
