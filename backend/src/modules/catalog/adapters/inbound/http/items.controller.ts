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
  parseItemBlueprintCreatePayload,
  parseItemBlueprintResRef,
  parseItemPaletteCustomWritePayload
} from "./template-processing.schemas";

@Controller("catalog/items")
@ApiTags("catalog-items")
@ApiBearerAuth("bearer")
@Roles(...ALL_ROLES)
@Permissions("scene.read")
export class ItemsController extends TemplateCatalogBaseController {
  constructor(
    service: CatalogApplicationService,
    config: AppConfigService
  ) {
    super(service, config, "item");
  }

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
    return this.handleList(request, query);
  }

  @Get("property-dictionary")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.item.read")
  @ApiOperation({
    summary: "Get Aurora item property definitions and IPRP dropdown options."
  })
  @ApiResponse({ status: 200, description: "Item property dictionary." })
  async propertyDictionary(@Req() request: AppRequest) {
    return this.success(request, await this.service.getItemPropertyDictionary());
  }

  @Get("base-items")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.item.read")
  @ApiOperation({
    summary: "Get Aurora baseitems.2da rows for item type selection and validation."
  })
  @ApiResponse({ status: 200, description: "Item base item rows." })
  async baseItems(@Req() request: AppRequest) {
    return this.success(request, await this.service.getItemBaseItems());
  }

  @Get("palette-tree")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.item.read")
  @ApiOperation({
    summary: "Get Aurora item palette tree from itempalstd/itempal/itempalcus ITP files."
  })
  @ApiResponse({ status: 200, description: "Item palette tree." })
  async paletteTree(@Req() request: AppRequest) {
    return this.success(request, await this.service.getItemPaletteTree());
  }

  @Get("generator-support")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.item.read")
  @ApiOperation({
    summary: "Get Aurora item-generator source support status for current UTG resources."
  })
  @ApiResponse({ status: 200, description: "Item generator support report." })
  async generatorSupport(@Req() request: AppRequest) {
    return this.success(request, await this.service.getItemGeneratorSupport());
  }

  @Put("palette-tree/custom")
  @HttpCode(200)
  @Roles("builder", "dm", "admin")
  @Permissions("processing.item.run")
  @ApiOperation({
    summary: "Write module-backed Aurora custom item palette itempalcus.itp."
  })
  @ApiResponse({ status: 200, description: "Custom item palette written and parsed." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async writeCustomPalette(
    @Req() request: AppRequest,
    @Body() body: Record<string, unknown>
  ) {
    return this.handleParsedBody(request, body, parseItemPaletteCustomWritePayload, (parsed) =>
      this.service.writeCustomItemPalette(parsed)
    );
  }

  @Get(":templateId/preview")
  @ApiOperation({ summary: "Get item preview payload by template id." })
  @ApiParam({ name: "templateId" })
  @ApiResponse({ status: 200, description: "Item preview." })
  @ApiResponse({ status: 404, description: "Template not found." })
  async preview(@Req() request: AppRequest, @Param("templateId") templateId: string) {
    return this.handlePreview(request, templateId);
  }

  @Post("process")
  @HttpCode(200)
  @Roles("builder", "dm", "admin")
  @Permissions("processing.item.run")
  @ApiOperation({
    summary: "Process item into backend contract and store/read cached payload."
  })
  @ApiResponse({ status: 200, description: "Processed item payload." })
  @ApiResponse({ status: 404, description: "Template not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async process(@Req() request: AppRequest, @Body() body: Record<string, unknown>) {
    return this.handleProcess(request, body);
  }

  @Post("blueprints")
  @HttpCode(201)
  @Roles("builder", "dm", "admin")
  @Permissions("processing.item.run")
  @ApiOperation({
    summary: "Create a module-backed item UTI blueprint and process it for preview."
  })
  @ApiResponse({ status: 201, description: "Created item blueprint and preview payload." })
  @ApiResponse({ status: 409, description: "Blueprint already exists." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async createBlueprint(
    @Req() request: AppRequest,
    @Body() body: Record<string, unknown>
  ) {
    return this.handleParsedBody(request, body, parseItemBlueprintCreatePayload, (parsed) =>
      this.service.createItemBlueprint(parsed)
    );
  }

  @Put("blueprints/:resRef")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.item.run")
  @ApiOperation({
    summary: "Update an existing module-backed item UTI blueprint and process it for preview."
  })
  @ApiParam({ name: "resRef" })
  @ApiResponse({ status: 200, description: "Updated item blueprint and preview payload." })
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
      parseItemBlueprintCreatePayload,
      (id, parsed) => this.service.updateItemBlueprint(parseItemBlueprintResRef(id), parsed)
    );
  }

  @Delete("blueprints/:resRef")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.item.run")
  @ApiOperation({
    summary: "Delete an existing module-backed item UTI blueprint."
  })
  @ApiParam({ name: "resRef" })
  @ApiResponse({ status: 200, description: "Deleted item blueprint." })
  @ApiResponse({ status: 404, description: "Blueprint not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async deleteBlueprint(@Req() request: AppRequest, @Param("resRef") resRef: string) {
    return this.handleById(request, resRef, (id) =>
      this.service.deleteItemBlueprint(parseItemBlueprintResRef(id))
    );
  }

  @Get("cache/:cacheKey")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.item.read")
  @ApiOperation({ summary: "Get processed item payload from cache by cache key." })
  @ApiParam({ name: "cacheKey", description: "Hex cache key returned by process endpoint." })
  @ApiResponse({ status: 200, description: "Cached item payload." })
  @ApiResponse({ status: 404, description: "Cache entry not found." })
  async getCached(
    @Req() request: AppRequest,
    @Param("cacheKey") rawCacheKey: string
  ) {
    return this.handleGetCached(request, rawCacheKey);
  }
}
