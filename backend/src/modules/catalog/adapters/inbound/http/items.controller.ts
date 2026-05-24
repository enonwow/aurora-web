import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { buildSuccessEnvelope } from "../../../../../common/http/contract";
import type { AppRequest } from "../../../../../common/http/request.types";
import { CatalogApplicationService } from "../../../application/catalog.application.service";
import { Permissions } from "../../../../auth/adapters/inbound/http/permissions.decorator";
import { Roles } from "../../../../auth/adapters/inbound/http/roles.decorator";
import { ALL_ROLES } from "../../../../auth/domain/auth.types";
import { parseCatalogListQuery } from "./catalog.schemas";
import {
  parseTemplateCacheKey,
  parseTemplateProcessPayload
} from "./template-processing.schemas";

@Controller("catalog/items")
@ApiTags("catalog-items")
@ApiBearerAuth("bearer")
@Roles(...ALL_ROLES)
@Permissions("scene.read")
export class ItemsController {
  constructor(
    private readonly service: CatalogApplicationService,
    private readonly config: AppConfigService
  ) {}

  @Get()
  @ApiOperation({ summary: "List item templates for area composition." })
  @ApiQuery({ name: "query", required: false })
  @ApiQuery({ name: "category", required: false })
  @ApiQuery({ name: "tag", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  @ApiResponse({ status: 200, description: "Item templates list." })
  @ApiResponse({ status: 401, description: "Missing or invalid session." })
  @ApiResponse({ status: 403, description: "Forbidden for role/permission." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async list(@Req() request: AppRequest, @Query() query: Record<string, unknown>) {
    const parsed = parseCatalogListQuery(query);
    const data = await this.service.listItems(parsed);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get(":templateId/preview")
  @ApiOperation({ summary: "Get item preview payload by template id." })
  @ApiParam({ name: "templateId" })
  @ApiResponse({ status: 200, description: "Item preview." })
  @ApiResponse({ status: 404, description: "Template not found." })
  async preview(@Req() request: AppRequest, @Param("templateId") templateId: string) {
    const data = await this.service.getItemPreview(templateId);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Post("process")
  @HttpCode(200)
  @Roles("builder", "dm", "admin")
  @Permissions("processing.placeable.run")
  @ApiOperation({
    summary: "Process item into backend contract and store/read cached payload."
  })
  @ApiResponse({ status: 200, description: "Processed item payload." })
  @ApiResponse({ status: 404, description: "Template not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async process(@Req() request: AppRequest, @Body() body: Record<string, unknown>) {
    const parsed = parseTemplateProcessPayload(body);
    const data = await this.service.processItem(parsed);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("cache/:cacheKey")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.placeable.read")
  @ApiOperation({ summary: "Get processed item payload from cache by cache key." })
  @ApiParam({ name: "cacheKey", description: "Hex cache key returned by process endpoint." })
  @ApiResponse({ status: 200, description: "Cached item payload." })
  @ApiResponse({ status: 404, description: "Cache entry not found." })
  async getCached(
    @Req() request: AppRequest,
    @Param("cacheKey") rawCacheKey: string
  ) {
    const cacheKey = parseTemplateCacheKey(rawCacheKey);
    const data = await this.service.getProcessedItem(cacheKey);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }
}
