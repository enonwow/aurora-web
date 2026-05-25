import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
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
import { TilesApplicationService } from "../../../application/tiles.application.service";
import {
  parseTileBenchmarkPayload,
  parseTileCacheKey,
  parseTileListQuery,
  parseTileProcessPayload
} from "./tiles.schemas";

@Controller("catalog/tiles")
@ApiTags("catalog-tiles")
@ApiBearerAuth("bearer")
@Roles(...ALL_ROLES)
@Permissions("scene.read")
export class TilesController {
  constructor(
    private readonly service: TilesApplicationService,
    private readonly config: AppConfigService
  ) {}

  @Get()
  @ApiOperation({ summary: "List tile templates for area assembly." })
  @ApiQuery({ name: "query", required: false })
  @ApiQuery({ name: "tileset", required: false })
  @ApiQuery({ name: "tag", required: false })
  @ApiQuery({ name: "benchmark", required: false, enum: ["true", "false"] })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  @ApiResponse({ status: 200, description: "Tile list." })
  @ApiResponse({ status: 401, description: "Missing or invalid session." })
  @ApiResponse({ status: 403, description: "Forbidden for role/permission." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async list(@Req() request: AppRequest, @Query() query: Record<string, unknown>) {
    const parsed = parseTileListQuery(query);
    const data = await this.service.listTiles(parsed);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get(":tileId")
  @ApiOperation({ summary: "Get full tile payload." })
  @ApiParam({ name: "tileId" })
  @ApiResponse({ status: 200, description: "Tile payload." })
  @ApiResponse({ status: 404, description: "Tile not found." })
  async getById(@Req() request: AppRequest, @Param("tileId") tileId: string) {
    const data = await this.service.getTile(tileId);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get(":tileId/preview")
  @ApiOperation({ summary: "Get lightweight tile preview payload." })
  @ApiParam({ name: "tileId" })
  @ApiResponse({ status: 200, description: "Tile preview payload." })
  @ApiResponse({ status: 404, description: "Tile not found." })
  async preview(@Req() request: AppRequest, @Param("tileId") tileId: string) {
    const data = await this.service.getTilePreview(tileId);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Post(":tileId/process")
  @HttpCode(200)
  @Roles("builder", "dm", "admin")
  @Permissions("processing.placeable.run")
  @ApiOperation({
    summary: "Process tile payload and store/read cached contract."
  })
  @ApiParam({ name: "tileId" })
  @ApiResponse({ status: 200, description: "Processed tile payload." })
  @ApiResponse({ status: 404, description: "Tile not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async process(
    @Req() request: AppRequest,
    @Param("tileId") tileId: string,
    @Body() body: Record<string, unknown>
  ) {
    const parsed = parseTileProcessPayload(body);
    const data = await this.service.processTile({
      tileId,
      bypassCache: parsed.bypassCache
    });
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Post("benchmark")
  @HttpCode(200)
  @Roles("builder", "dm", "admin")
  @Permissions("processing.placeable.run")
  @ApiOperation({
    summary: "Run tile processing benchmark and return deterministic fingerprint."
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        tileIds: {
          type: "array",
          items: { type: "string" }
        },
        iterations: { type: "integer", default: 200, minimum: 1, maximum: 5000 },
        warmupIterations: { type: "integer", default: 20, minimum: 0, maximum: 1000 },
        bypassCache: { type: "boolean", default: true }
      }
    }
  })
  @ApiResponse({ status: 200, description: "Benchmark run output." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async benchmark(@Req() request: AppRequest, @Body() body: Record<string, unknown>) {
    const parsed = parseTileBenchmarkPayload(body);
    const data = await this.service.benchmarkTiles(parsed);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("cache/:cacheKey")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.placeable.read")
  @ApiOperation({ summary: "Get processed tile payload from cache by cache key." })
  @ApiParam({ name: "cacheKey", description: "Hex cache key returned by process endpoint." })
  @ApiResponse({ status: 200, description: "Cached tile payload." })
  @ApiResponse({ status: 404, description: "Cache entry not found." })
  async getCached(@Req() request: AppRequest, @Param("cacheKey") rawCacheKey: string) {
    const cacheKey = parseTileCacheKey(rawCacheKey);
    const data = await this.service.getProcessedTile(cacheKey);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }
}
