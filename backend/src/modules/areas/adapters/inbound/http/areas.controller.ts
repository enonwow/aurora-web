import { Controller, Get, Param, Query, Req } from "@nestjs/common";
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
import { Permissions } from "../../../../auth/adapters/inbound/http/permissions.decorator";
import { Roles } from "../../../../auth/adapters/inbound/http/roles.decorator";
import { ALL_ROLES } from "../../../../auth/domain/auth.types";
import { AreasApplicationService } from "../../../application/areas.application.service";
import { parseAreaListQuery } from "./areas.schemas";

@Controller("areas")
@ApiTags("areas")
@ApiBearerAuth("bearer")
@Roles(...ALL_ROLES)
@Permissions("scene.read")
export class AreasController {
  constructor(
    private readonly service: AreasApplicationService,
    private readonly config: AppConfigService
  ) {}

  @Get()
  @ApiOperation({ summary: "List areas available for benchmark and editing." })
  @ApiQuery({ name: "query", required: false })
  @ApiQuery({ name: "biome", required: false })
  @ApiQuery({ name: "tag", required: false })
  @ApiQuery({
    name: "benchmark",
    required: false,
    enum: ["true", "false"]
  })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  @ApiResponse({ status: 200, description: "Area list." })
  @ApiResponse({ status: 401, description: "Missing or invalid session." })
  @ApiResponse({ status: 403, description: "Forbidden for role/permission." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async list(@Req() request: AppRequest, @Query() query: Record<string, unknown>) {
    const parsed = parseAreaListQuery(query);
    const data = await this.service.listAreas(parsed);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get(":areaId")
  @ApiOperation({ summary: "Get full area payload with composition." })
  @ApiParam({ name: "areaId" })
  @ApiResponse({ status: 200, description: "Area payload." })
  @ApiResponse({ status: 404, description: "Area not found." })
  async getById(@Req() request: AppRequest, @Param("areaId") areaId: string) {
    const data = await this.service.getArea(areaId);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get(":areaId/preview")
  @ApiOperation({ summary: "Get lightweight area preview payload." })
  @ApiParam({ name: "areaId" })
  @ApiResponse({ status: 200, description: "Area preview payload." })
  @ApiResponse({ status: 404, description: "Area not found." })
  async preview(@Req() request: AppRequest, @Param("areaId") areaId: string) {
    const data = await this.service.getAreaPreview(areaId);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }
}
