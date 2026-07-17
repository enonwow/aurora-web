import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req
} from "@nestjs/common";
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
import {
  parseCreatureBlueprintCreatePayload,
  parseCreatureBlueprintRenamePayload,
  parseCreatureBlueprintResRef,
  parseCreatureResourceOptionsQuery
} from "./template-processing.schemas";

@Controller("catalog/creatures")
@ApiTags("catalog-creatures")
@ApiBearerAuth("bearer")
@Roles(...ALL_ROLES)
@Permissions("scene.read")
export class CreaturesController extends TemplateCatalogBaseController {
  constructor(
    service: CatalogApplicationService,
    config: AppConfigService
  ) {
    super(service, config, "creature");
  }

  @Get()
  @ApiOperation({ summary: "List creature templates for area composition." })
  @ApiQuery({ name: "query", required: false })
  @ApiQuery({ name: "category", required: false })
  @ApiQuery({ name: "tag", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  @ApiResponse({ status: 200, description: "Creature templates list." })
  @ApiResponse({ status: 401, description: "Missing or invalid session." })
  @ApiResponse({ status: 403, description: "Forbidden for role/permission." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async list(@Req() request: AppRequest, @Query() query: Record<string, unknown>) {
    return this.handleList(request, query);
  }

  @Get("resources")
  @ApiOperation({ summary: "List validated module resource options for creature properties." })
  @ApiQuery({ name: "kind", enum: ["conversation", "portrait", "script", "soundset"] })
  @ApiQuery({ name: "query", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiResponse({ status: 200, description: "Creature resource options." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async listResourceOptions(@Req() request: AppRequest, @Query() query: Record<string, unknown>) {
    return this.handleParsedQuery(request, query, parseCreatureResourceOptionsQuery, (parsed) =>
      this.service.listCreatureResourceOptions(parsed)
    );
  }

  @Get(":templateId/preview")
  @ApiOperation({ summary: "Get creature preview payload by template id." })
  @ApiParam({ name: "templateId" })
  @ApiResponse({ status: 200, description: "Creature preview." })
  @ApiResponse({ status: 404, description: "Template not found." })
  async preview(@Req() request: AppRequest, @Param("templateId") templateId: string) {
    return this.handlePreview(request, templateId);
  }

  @Post("process")
  @HttpCode(200)
  @Roles("builder", "dm", "admin")
  @Permissions("processing.creature.run")
  @ApiOperation({
    summary:
      "Process creature into backend contract and store/read cached payload."
  })
  @ApiResponse({ status: 200, description: "Processed creature payload." })
  @ApiResponse({ status: 404, description: "Template not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async process(@Req() request: AppRequest, @Body() body: Record<string, unknown>) {
    return this.handleProcess(request, body);
  }

  @Post("blueprints")
  @HttpCode(201)
  @Roles("builder", "dm", "admin")
  @Permissions("processing.creature.run")
  @ApiOperation({ summary: "Create a module-backed creature UTC blueprint and process it." })
  @ApiResponse({ status: 201, description: "Created creature blueprint and preview payload." })
  @ApiResponse({ status: 409, description: "Blueprint already exists." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async createBlueprint(
    @Req() request: AppRequest,
    @Body() body: Record<string, unknown>
  ) {
    return this.handleParsedBody(request, body, parseCreatureBlueprintCreatePayload, (parsed) =>
      this.service.createCreatureBlueprint(parsed)
    );
  }

  @Put("blueprints/:resRef")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.creature.run")
  @ApiOperation({ summary: "Update a module-backed creature UTC blueprint and process it." })
  @ApiParam({ name: "resRef" })
  @ApiResponse({ status: 200, description: "Updated creature blueprint and preview payload." })
  @ApiResponse({ status: 404, description: "Blueprint not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async updateBlueprint(
    @Req() request: AppRequest,
    @Param("resRef") resRef: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.handleByIdAndParsedBody(
      request,
      resRef,
      body,
      parseCreatureBlueprintCreatePayload,
      (id, parsed) => this.service.updateCreatureBlueprint(parseCreatureBlueprintResRef(id), parsed)
    );
  }

  @Post("blueprints/:resRef/rename")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.creature.run")
  @ApiOperation({ summary: "Rename a module-backed creature UTC blueprint with compensated storage rollback." })
  @ApiParam({ name: "resRef" })
  @ApiResponse({ status: 200, description: "Renamed creature blueprint and preview payload." })
  @ApiResponse({ status: 404, description: "Blueprint not found." })
  @ApiResponse({ status: 409, description: "Target resref already exists." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async renameBlueprint(
    @Req() request: AppRequest,
    @Param("resRef") resRef: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.handleByIdAndParsedBody(
      request,
      resRef,
      body,
      parseCreatureBlueprintRenamePayload,
      (id, parsed) =>
        this.service.renameCreatureBlueprint(
          parseCreatureBlueprintResRef(id),
          parsed.templateResRef
        )
    );
  }

  @Delete("blueprints/:resRef")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.creature.run")
  @ApiOperation({ summary: "Delete a module-backed creature UTC blueprint." })
  @ApiParam({ name: "resRef" })
  @ApiResponse({ status: 200, description: "Deleted creature blueprint." })
  @ApiResponse({ status: 404, description: "Blueprint not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async deleteBlueprint(@Req() request: AppRequest, @Param("resRef") resRef: string) {
    return this.handleById(request, resRef, (id) =>
      this.service.deleteCreatureBlueprint(parseCreatureBlueprintResRef(id))
    );
  }

  @Get("cache/:cacheKey")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.creature.read")
  @ApiOperation({ summary: "Get processed creature payload from cache by cache key." })
  @ApiParam({ name: "cacheKey", description: "Hex cache key returned by process endpoint." })
  @ApiResponse({ status: 200, description: "Cached creature payload." })
  @ApiResponse({ status: 404, description: "Cache entry not found." })
  async getCached(
    @Req() request: AppRequest,
    @Param("cacheKey") rawCacheKey: string
  ) {
    return this.handleGetCached(request, rawCacheKey);
  }
}
