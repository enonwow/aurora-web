import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, Res } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { buildSuccessEnvelope } from "../../../../../common/http/contract";
import type { AppRequest } from "../../../../../common/http/request.types";
import { Permissions } from "../../../../auth/adapters/inbound/http/permissions.decorator";
import { Roles } from "../../../../auth/adapters/inbound/http/roles.decorator";
import { ALL_ROLES } from "../../../../auth/domain/auth.types";
import { AreasApplicationService } from "../../../application/areas.application.service";
import {
  parseAreaCacheKey,
  parseAreaListQuery,
  parseAreaProcessPayload,
  parseAreaTextureDeliveryQuery
} from "./areas.schemas";

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

  @Post(":areaId/process")
  @HttpCode(200)
  @Roles("builder", "dm", "admin")
  @Permissions("processing.placeable.run")
  @ApiOperation({
    summary: "Process area payload and store/read cached contract."
  })
  @ApiParam({ name: "areaId" })
  @ApiResponse({ status: 200, description: "Processed area payload." })
  @ApiResponse({ status: 404, description: "Area not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async process(
    @Req() request: AppRequest,
    @Param("areaId") areaId: string,
    @Body() body: Record<string, unknown>
  ) {
    const parsed = parseAreaProcessPayload(body);
    const data = await this.service.processArea({
      areaId,
      bypassCache: parsed.bypassCache
    });
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("cache/:cacheKey")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.placeable.read")
  @ApiOperation({ summary: "Get processed area payload from cache by cache key." })
  @ApiParam({ name: "cacheKey", description: "Hex cache key returned by process endpoint." })
  @ApiResponse({ status: 200, description: "Cached area payload." })
  @ApiResponse({ status: 404, description: "Cache entry not found." })
  async getCached(@Req() request: AppRequest, @Param("cacheKey") rawCacheKey: string) {
    const cacheKey = parseAreaCacheKey(rawCacheKey);
    const data = await this.service.getProcessedArea(cacheKey);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("cache/:cacheKey/textures/contracts")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.placeable.read")
  @ApiOperation({
    summary: "Get hybrid texture-atlas delivery contract for processed area cache entry."
  })
  @ApiParam({ name: "cacheKey", description: "Hex cache key returned by process endpoint." })
  @ApiQuery({
    name: "mode",
    required: false,
    enum: ["proxy", "direct"],
    description:
      "Delivery mode. `proxy` streams bytes through API; `direct` returns direct blob HTTP/S3 URLs."
  })
  @ApiResponse({ status: 200, description: "Area texture-atlas delivery contract." })
  @ApiResponse({ status: 404, description: "Cache entry not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async getCachedTextureContract(
    @Req() request: AppRequest,
    @Param("cacheKey") rawCacheKey: string,
    @Query() query: Record<string, unknown>
  ) {
    const cacheKey = parseAreaCacheKey(rawCacheKey);
    const parsed = parseAreaTextureDeliveryQuery(query);
    const data = await this.service.getProcessedAreaTextureDelivery(cacheKey, parsed.mode);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("cache/:cacheKey/textures")
  @Roles("builder", "dm", "admin")
  @Permissions("scene.read")
  @ApiOperation({
    summary: "Download processed area texture-atlas payload through backend proxy."
  })
  @ApiParam({ name: "cacheKey", description: "Hex cache key returned by process endpoint." })
  @ApiResponse({ status: 200, description: "Binary texture-atlas payload." })
  @ApiResponse({ status: 404, description: "Cache entry or texture-atlas blob not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async getCachedTexture(
    @Param("cacheKey") rawCacheKey: string,
    @Res() response: FastifyReply
  ) {
    const cacheKey = parseAreaCacheKey(rawCacheKey);
    const data = await this.service.getProcessedAreaTexture(cacheKey);

    response.header("Content-Type", data.payload.contentType);
    response.header("Content-Length", String(data.payload.size));
    response.header("Cache-Control", "private, max-age=120");
    response.header("X-Aurora-Area-Atlas-Id", data.textureAtlas.atlasId);
    response.header("X-Aurora-Area-Atlas-Object-Key", data.textureAtlas.objectKey ?? "");
    response.header("X-Aurora-Cache-Key", data.cacheKey);
    if (data.payload.etag) {
      response.header("ETag", data.payload.etag);
    }
    response.header(
      "Content-Disposition",
      `inline; filename="${sanitizeHeaderFileName(data.textureAtlas.atlasId)}.bin"`
    );
    return response.send(data.payload.bytes);
  }
}

function sanitizeHeaderFileName(value: string): string {
  return value.replace(/["\\\r\n]/gu, "_");
}
