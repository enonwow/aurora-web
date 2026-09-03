import { Controller, Get, Query, Req } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { ProcessingHttpBaseController } from "../../../../../common/http/processing-http.base-controller";
import type { AppRequest } from "../../../../../common/http/request.types";
import { Permissions } from "../../../../auth/adapters/inbound/http/permissions.decorator";
import { Roles } from "../../../../auth/adapters/inbound/http/roles.decorator";
import { ALL_ROLES } from "../../../../auth/domain/auth.types";
import { AreaEventScriptCatalogApplicationService } from "../../../application/area-event-script-catalog.application.service";
import { parseAreaEventScriptCatalogQuery } from "./area-event-script-catalog.schemas";

@Controller("areas")
@ApiTags("areas")
@ApiBearerAuth("bearer")
@Roles(...ALL_ROLES)
@Permissions("scene.read")
export class AreaEventScriptCatalogController extends ProcessingHttpBaseController {
  constructor(
    private readonly service: AreaEventScriptCatalogApplicationService,
    config: AppConfigService,
  ) {
    super(config);
  }

  @Get("event-script-catalog")
  @ApiOperation({ summary: "List exact NSS/NCS presence in one committed module revision." })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  @ApiResponse({ status: 200, description: "area-event-script-catalog.v1 page." })
  @ApiResponse({ status: 401, description: "Missing or invalid session." })
  @ApiResponse({ status: 403, description: "Forbidden for role/permission." })
  @ApiResponse({ status: 422, description: "Invalid bounded catalog query." })
  @ApiResponse({ status: 503, description: "Committed module catalog unavailable." })
  async list(
    @Req() request: AppRequest,
    @Query() rawQuery: Record<string, unknown>,
  ) {
    const query = parseAreaEventScriptCatalogQuery(rawQuery);
    return this.success(request, await this.service.query(query));
  }
}
