import { Inject, Injectable } from "@nestjs/common";
import { AppException } from "../../../common/http/app-exception";
import {
  TEMPLATE_CATALOG_REPOSITORY,
  type TemplateCatalogRepositoryPort
} from "./ports/template-catalog-repository.port";
import type {
  TemplateKind,
  TemplateListQuery
} from "../domain/template.types";

@Injectable()
export class CatalogApplicationService {
  constructor(
    @Inject(TEMPLATE_CATALOG_REPOSITORY)
    private readonly repository: TemplateCatalogRepositoryPort
  ) {}

  listPlaceables(query: TemplateListQuery) {
    return this.repository.listByKind("placeable", query);
  }

  listCreatures(query: TemplateListQuery) {
    return this.repository.listByKind("creature", query);
  }

  listItems(query: TemplateListQuery) {
    return this.repository.listByKind("item", query);
  }

  async getPlaceablePreview(templateId: string) {
    return this.getPreviewByKind("placeable", templateId);
  }

  async getCreaturePreview(templateId: string) {
    return this.getPreviewByKind("creature", templateId);
  }

  async getItemPreview(templateId: string) {
    return this.getPreviewByKind("item", templateId);
  }

  private async getPreviewByKind(kind: TemplateKind, templateId: string) {
    const template = await this.repository.findByKindAndId(kind, templateId);
    if (!template) {
      throw new AppException({
        status: 404,
        code: "TEMPLATE_NOT_FOUND",
        message: `${kind} template was not found.`
      });
    }

    return {
      templateId: template.templateId,
      kind: template.kind,
      placeableSubtype: template.placeableSubtype,
      resref: template.resref,
      name: template.name,
      category: template.category,
      previewImageUrl: template.previewImageUrl,
      metadata: template.metadata
    };
  }
}
