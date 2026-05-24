import { AppConfigService } from "../../../../../common/config/app-config.service";
import { buildSuccessEnvelope } from "../../../../../common/http/contract";
import type { AppRequest } from "../../../../../common/http/request.types";
import {
  CatalogApplicationService,
  type TemplateProcessingKind
} from "../../../application/catalog.application.service";
import { parseCatalogListQuery } from "./catalog.schemas";
import {
  parseTemplateCacheKey,
  parseTemplateProcessPayload
} from "./template-processing.schemas";

export abstract class TemplateCatalogBaseController {
  protected constructor(
    protected readonly service: CatalogApplicationService,
    protected readonly config: AppConfigService,
    private readonly kind: TemplateProcessingKind
  ) {}

  protected async handleList(request: AppRequest, query: Record<string, unknown>) {
    const parsed = parseCatalogListQuery(query);
    const data = await this.service.listTemplateKind(this.kind, parsed);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  protected async handlePreview(request: AppRequest, templateId: string) {
    const data = await this.service.getTemplateKindPreview(this.kind, templateId);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  protected async handleProcess(request: AppRequest, body: Record<string, unknown>) {
    const parsed = parseTemplateProcessPayload(body);
    const data = await this.service.processTemplateKind(this.kind, parsed);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  protected async handleGetCached(request: AppRequest, rawCacheKey: string) {
    const cacheKey = parseTemplateCacheKey(rawCacheKey);
    const data = await this.service.getProcessedTemplateKind(this.kind, cacheKey);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }
}
