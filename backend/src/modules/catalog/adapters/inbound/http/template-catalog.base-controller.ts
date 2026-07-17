import { AppConfigService } from "../../../../../common/config/app-config.service";
import { ProcessingHttpBaseController } from "../../../../../common/http/processing-http.base-controller";
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

export abstract class TemplateCatalogBaseController extends ProcessingHttpBaseController {
  protected constructor(
    protected readonly service: CatalogApplicationService,
    config: AppConfigService,
    private readonly kind: TemplateProcessingKind
  ) {
    super(config);
  }

  protected async handleList(request: AppRequest, query: Record<string, unknown>) {
    return this.handleParsedQuery(request, query, parseCatalogListQuery, (parsed) =>
      this.service.listTemplateKind(this.kind, parsed)
    );
  }

  protected async handlePreview(request: AppRequest, templateId: string) {
    return this.handleById(request, templateId, (id) =>
      this.service.getTemplateKindPreview(this.kind, id)
    );
  }

  protected async handleProcess(request: AppRequest, body: Record<string, unknown>) {
    return this.handleParsedBody(request, body, parseTemplateProcessPayload, (parsed) =>
      this.service.processTemplateKind(this.kind, parsed)
    );
  }

  protected async handleGetCached(request: AppRequest, rawCacheKey: string) {
    return this.handleCacheKey(request, rawCacheKey, parseTemplateCacheKey, (cacheKey) =>
      this.service.getProcessedTemplateKind(this.kind, cacheKey)
    );
  }
}
