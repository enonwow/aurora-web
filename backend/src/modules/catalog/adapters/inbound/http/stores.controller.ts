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
import { ProcessingHttpBaseController } from "../../../../../common/http/processing-http.base-controller";
import type { AppRequest } from "../../../../../common/http/request.types";
import { CatalogApplicationService } from "../../../application/catalog.application.service";
import { Permissions } from "../../../../auth/adapters/inbound/http/permissions.decorator";
import { Roles } from "../../../../auth/adapters/inbound/http/roles.decorator";
import { ALL_ROLES } from "../../../../auth/domain/auth.types";
import { parseCatalogListQuery } from "./catalog.schemas";
import {
  parseStoreBlueprintCreatePayload,
  parseStoreBlueprintResRef
} from "./template-processing.schemas";

@Controller("catalog/stores")
@ApiTags("catalog-stores")
@ApiBearerAuth("bearer")
@Roles(...ALL_ROLES)
@Permissions("scene.read")
export class StoresController extends ProcessingHttpBaseController {
  constructor(
    private readonly service: CatalogApplicationService,
    config: AppConfigService
  ) {
    super(config);
  }

  @Get()
  @ApiOperation({ summary: "List store templates for area composition." })
  @ApiQuery({ name: "query", required: false })
  @ApiQuery({ name: "category", required: false })
  @ApiQuery({ name: "tag", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  @ApiResponse({ status: 200, description: "Store templates list." })
  @ApiResponse({ status: 401, description: "Missing or invalid session." })
  @ApiResponse({ status: 403, description: "Forbidden for role/permission." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async list(@Req() request: AppRequest, @Query() query: Record<string, unknown>) {
    return this.handleParsedQuery(request, query, parseCatalogListQuery, (parsed) =>
      this.service.listStores(parsed)
    );
  }

  @Get(":templateId/preview")
  @ApiOperation({ summary: "Get store preview payload by template id." })
  @ApiParam({ name: "templateId" })
  @ApiResponse({ status: 200, description: "Store preview." })
  @ApiResponse({ status: 404, description: "Template not found." })
  async preview(@Req() request: AppRequest, @Param("templateId") templateId: string) {
    return this.handleById(request, templateId, (id) =>
      this.service.getStorePreview(id)
    );
  }

  @Post("blueprints")
  @HttpCode(201)
  @Roles("builder", "dm", "admin")
  @Permissions("processing.item.run")
  @ApiOperation({
    summary: "Create a module-backed store UTM blueprint for area composition."
  })
  @ApiResponse({ status: 201, description: "Created store blueprint." })
  @ApiResponse({ status: 409, description: "Blueprint already exists." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async createBlueprint(
    @Req() request: AppRequest,
    @Body() body: Record<string, unknown>
  ) {
    return this.handleParsedBody(request, body, parseStoreBlueprintCreatePayload, (parsed) =>
      this.service.createStoreBlueprint(parsed)
    );
  }

  @Put("blueprints/:resRef")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.item.run")
  @ApiOperation({
    summary: "Update an existing module-backed store UTM blueprint."
  })
  @ApiParam({ name: "resRef" })
  @ApiResponse({ status: 200, description: "Updated store blueprint." })
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
      parseStoreBlueprintCreatePayload,
      (id, parsed) => this.service.updateStoreBlueprint(parseStoreBlueprintResRef(id), parsed)
    );
  }

  @Delete("blueprints/:resRef")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.item.run")
  @ApiOperation({
    summary: "Delete an existing module-backed store UTM blueprint."
  })
  @ApiParam({ name: "resRef" })
  @ApiResponse({ status: 200, description: "Deleted store blueprint." })
  @ApiResponse({ status: 404, description: "Blueprint not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async deleteBlueprint(@Req() request: AppRequest, @Param("resRef") resRef: string) {
    return this.handleById(request, resRef, (id) =>
      this.service.deleteStoreBlueprint(parseStoreBlueprintResRef(id))
    );
  }
}
