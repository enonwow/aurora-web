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
import type { AppRequest } from "../../../../../common/http/request.types";
import { CatalogApplicationService } from "../../../application/catalog.application.service";
import { Permissions } from "../../../../auth/adapters/inbound/http/permissions.decorator";
import { Roles } from "../../../../auth/adapters/inbound/http/roles.decorator";
import { ALL_ROLES } from "../../../../auth/domain/auth.types";
import { TemplateCatalogBaseController } from "./template-catalog.base-controller";

@Controller("catalog/encounters")
@ApiTags("catalog-encounters")
@ApiBearerAuth("bearer")
@Roles(...ALL_ROLES)
@Permissions("scene.read")
export class EncountersController extends TemplateCatalogBaseController {
  constructor(
    service: CatalogApplicationService,
    config: AppConfigService
  ) {
    super(service, config, "encounter");
  }

  @Get()
  @ApiOperation({ summary: "List encounter templates for area composition." })
  @ApiQuery({ name: "query", required: false })
  @ApiQuery({ name: "category", required: false })
  @ApiQuery({ name: "tag", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  @ApiResponse({ status: 200, description: "Encounter templates list." })
  @ApiResponse({ status: 401, description: "Missing or invalid session." })
  @ApiResponse({ status: 403, description: "Forbidden for role/permission." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async list(@Req() request: AppRequest, @Query() query: Record<string, unknown>) {
    return this.handleList(request, query);
  }

  @Get(":templateId/preview")
  @ApiOperation({ summary: "Get encounter preview payload by template id." })
  @ApiParam({ name: "templateId" })
  @ApiResponse({ status: 200, description: "Encounter preview." })
  @ApiResponse({ status: 404, description: "Template not found." })
  async preview(@Req() request: AppRequest, @Param("templateId") templateId: string) {
    return this.handlePreview(request, templateId);
  }

  @Post("process")
  @HttpCode(200)
  @Roles("builder", "dm", "admin")
  @Permissions("processing.encounter.run")
  @ApiOperation({
    summary: "Process encounter into backend contract and store/read cached payload."
  })
  @ApiResponse({ status: 200, description: "Processed encounter payload." })
  @ApiResponse({ status: 404, description: "Template not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async process(@Req() request: AppRequest, @Body() body: Record<string, unknown>) {
    return this.handleProcess(request, body);
  }

  @Get("cache/:cacheKey")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.encounter.read")
  @ApiOperation({ summary: "Get processed encounter payload from cache by cache key." })
  @ApiParam({ name: "cacheKey", description: "Hex cache key returned by process endpoint." })
  @ApiResponse({ status: 200, description: "Cached encounter payload." })
  @ApiResponse({ status: 404, description: "Cache entry not found." })
  async getCached(
    @Req() request: AppRequest,
    @Param("cacheKey") rawCacheKey: string
  ) {
    return this.handleGetCached(request, rawCacheKey);
  }
}
