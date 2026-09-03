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
import { ProcessingHttpBaseController } from "../../../../../common/http/processing-http.base-controller";
import type { AppRequest } from "../../../../../common/http/request.types";
import { Permissions } from "../../../../auth/adapters/inbound/http/permissions.decorator";
import { Roles } from "../../../../auth/adapters/inbound/http/roles.decorator";
import { ALL_ROLES } from "../../../../auth/domain/auth.types";
import { AreaTileCertificationQueryApplicationService } from "../../../application/area-tile-certification-query.application.service";
import {
  parseAreaTileCertificationPageQuery,
  parseAreaTileCertificationTilesetResRef,
} from "./area-certification.schemas";

@Controller("areas/certification")
@ApiTags("areas-certification")
@ApiBearerAuth("bearer")
@Roles(...ALL_ROLES)
@Permissions("scene.read")
export class AreaCertificationController extends ProcessingHttpBaseController {
  constructor(
    private readonly service: AreaTileCertificationQueryApplicationService,
    config: AppConfigService,
  ) {
    super(config);
  }

  @Get("tilesets/:tilesetResRef")
  @ApiOperation({ summary: "Get one immutable tile-certification ledger page." })
  @ApiParam({ name: "tilesetResRef" })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  @ApiResponse({ status: 200, description: "area-tile-certification-page.v1 page." })
  @ApiResponse({ status: 422, description: "Invalid path or page query." })
  @ApiResponse({ status: 503, description: "Certification ledger unavailable or invalid." })
  async getTilesetPage(
    @Req() request: AppRequest,
    @Param("tilesetResRef") rawTilesetResRef: string,
    @Query() rawQuery: Record<string, unknown>,
  ) {
    const tilesetResRef = parseAreaTileCertificationTilesetResRef(rawTilesetResRef);
    const query = parseAreaTileCertificationPageQuery(rawQuery);
    return this.success(
      request,
      await this.service.getTilesetPage(tilesetResRef, query),
    );
  }
}
