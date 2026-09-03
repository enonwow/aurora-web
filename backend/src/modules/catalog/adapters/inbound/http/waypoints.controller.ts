import { Controller, Get, Param, Query, Req } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { ProcessingHttpBaseController } from
  "../../../../../common/http/processing-http.base-controller";
import type { AppRequest } from "../../../../../common/http/request.types";
import { CatalogApplicationService } from "../../../application/catalog.application.service";
import { Permissions } from "../../../../auth/adapters/inbound/http/permissions.decorator";
import { Roles } from "../../../../auth/adapters/inbound/http/roles.decorator";
import { ALL_ROLES } from "../../../../auth/domain/auth.types";
import {
  parseCatalogListQuery,
  parseWaypointAppearanceRowsQuery,
} from "./catalog.schemas";

@Controller("catalog/waypoints")
@ApiTags("catalog-waypoints")
@ApiBearerAuth("bearer")
@Roles(...ALL_ROLES)
@Permissions("scene.read")
export class WaypointsController extends ProcessingHttpBaseController {
  constructor(
    private readonly service: CatalogApplicationService,
    config: AppConfigService,
  ) {
    super(config);
  }

  @Get()
  @ApiOperation({ summary: "List waypoint templates for area composition." })
  @ApiQuery({ name: "query", required: false })
  @ApiQuery({ name: "category", required: false })
  @ApiQuery({ name: "tag", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  @ApiResponse({ status: 200, description: "Waypoint templates list." })
  @ApiResponse({ status: 401, description: "Missing or invalid session." })
  @ApiResponse({ status: 403, description: "Forbidden for role/permission." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async list(@Req() request: AppRequest, @Query() query: Record<string, unknown>) {
    return this.handleParsedQuery(request, query, parseCatalogListQuery, (parsed) =>
      this.service.listWaypoints(parsed)
    );
  }

  @Get("appearances")
  @ApiOperation({ summary: "List a digest-bound page of physical waypoint.2da rows." })
  @ApiQuery({ name: "tableSha256", required: true })
  @ApiQuery({ name: "query", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  @ApiResponse({ status: 200, description: "Physical Waypoint Appearance row page." })
  @ApiResponse({ status: 404, description: "Authoritative table unavailable." })
  @ApiResponse({ status: 409, description: "Requested table digest is stale." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async listAppearanceRows(
    @Req() request: AppRequest,
    @Query() query: Record<string, unknown>,
  ) {
    return this.handleParsedQuery(request, query, parseWaypointAppearanceRowsQuery, (parsed) =>
      this.service.listWaypointAppearanceRows(parsed)
    );
  }

  @Get(":templateId/preview")
  @ApiOperation({ summary: "Get waypoint preview payload by template id." })
  @ApiParam({ name: "templateId" })
  @ApiResponse({ status: 200, description: "Waypoint preview." })
  @ApiResponse({ status: 404, description: "Template not found." })
  async preview(@Req() request: AppRequest, @Param("templateId") templateId: string) {
    return this.handleById(request, templateId, (id) =>
      this.service.getWaypointPreview(id)
    );
  }
}
