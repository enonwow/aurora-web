import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, Res } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import {
  applyBinaryPayloadHeaders,
  setInlineContentDisposition
} from "../../../../../common/http/binary-response";
import { ProcessingHttpBaseController } from "../../../../../common/http/processing-http.base-controller";
import type { AppRequest } from "../../../../../common/http/request.types";
import { Permissions } from "../../../../auth/adapters/inbound/http/permissions.decorator";
import { Roles } from "../../../../auth/adapters/inbound/http/roles.decorator";
import { ALL_ROLES } from "../../../../auth/domain/auth.types";
import { TilesApplicationService } from "../../../application/tiles.application.service";
import {
  parseTileBenchmarkPayload,
  parseTileCacheKey,
  parseTileListQuery,
  parseTileProcessPayload,
  parseTileTextureDeliveryQuery
} from "./tiles.schemas";

@Controller("catalog/tiles")
@ApiTags("catalog-tiles")
@ApiBearerAuth("bearer")
@Roles(...ALL_ROLES)
@Permissions("scene.read")
export class TilesController extends ProcessingHttpBaseController {
  constructor(private readonly service: TilesApplicationService, config: AppConfigService) {
    super(config);
  }

  @Get()
  @ApiOperation({ summary: "List tile templates for area assembly." })
  @ApiQuery({ name: "query", required: false })
  @ApiQuery({ name: "tileset", required: false })
  @ApiQuery({ name: "variant", required: false })
  @ApiQuery({ name: "walkmesh", required: false, enum: ["walkable", "blocked", "water"] })
  @ApiQuery({ name: "tag", required: false })
  @ApiQuery({ name: "benchmark", required: false, enum: ["true", "false"] })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  @ApiResponse({ status: 200, description: "Tile list." })
  @ApiResponse({ status: 401, description: "Missing or invalid session." })
  @ApiResponse({ status: 403, description: "Forbidden for role/permission." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async list(@Req() request: AppRequest, @Query() query: Record<string, unknown>) {
    return this.handleParsedQuery(request, query, parseTileListQuery, (parsed) =>
      this.service.listTiles(parsed)
    );
  }

  @Get(":tileId")
  @ApiOperation({ summary: "Get full tile payload." })
  @ApiParam({ name: "tileId" })
  @ApiResponse({ status: 200, description: "Tile payload." })
  @ApiResponse({ status: 404, description: "Tile not found." })
  async getById(@Req() request: AppRequest, @Param("tileId") tileId: string) {
    return this.handleById(request, tileId, (id) => this.service.getTile(id));
  }

  @Get(":tileId/preview")
  @ApiOperation({ summary: "Get lightweight tile preview payload." })
  @ApiParam({ name: "tileId" })
  @ApiResponse({ status: 200, description: "Tile preview payload." })
  @ApiResponse({ status: 404, description: "Tile not found." })
  async preview(@Req() request: AppRequest, @Param("tileId") tileId: string) {
    return this.handleById(request, tileId, (id) => this.service.getTilePreview(id));
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
    return this.handleByIdAndParsedBody(
      request,
      tileId,
      body,
      parseTileProcessPayload,
      (id, parsed) =>
        this.service.processTile({
          tileId: id,
          bypassCache: parsed.bypassCache
        })
    );
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
    return this.handleParsedBody(request, body, parseTileBenchmarkPayload, (parsed) =>
      this.service.benchmarkTiles(parsed)
    );
  }

  @Get("cache/:cacheKey")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.placeable.read")
  @ApiOperation({ summary: "Get processed tile payload from cache by cache key." })
  @ApiParam({ name: "cacheKey", description: "Hex cache key returned by process endpoint." })
  @ApiResponse({ status: 200, description: "Cached tile payload." })
  @ApiResponse({ status: 404, description: "Cache entry not found." })
  async getCached(@Req() request: AppRequest, @Param("cacheKey") rawCacheKey: string) {
    return this.handleCacheKey(request, rawCacheKey, parseTileCacheKey, (cacheKey) =>
      this.service.getProcessedTile(cacheKey)
    );
  }

  @Get("cache/:cacheKey/textures/contracts")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.placeable.read")
  @ApiOperation({
    summary: "Get hybrid texture-atlas delivery contract for processed tile cache entry."
  })
  @ApiParam({ name: "cacheKey", description: "Hex cache key returned by process endpoint." })
  @ApiQuery({
    name: "mode",
    required: false,
    enum: ["proxy", "direct"],
    description:
      "Delivery mode. `proxy` streams bytes through API; `direct` returns direct blob HTTP/S3 URLs."
  })
  @ApiResponse({ status: 200, description: "Tile texture-atlas delivery contract." })
  @ApiResponse({ status: 404, description: "Cache entry not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async getCachedTextureContract(
    @Req() request: AppRequest,
    @Param("cacheKey") rawCacheKey: string,
    @Query() query: Record<string, unknown>
  ) {
    return this.handleCacheKeyAndParsedQuery(
      request,
      rawCacheKey,
      query,
      parseTileCacheKey,
      parseTileTextureDeliveryQuery,
      (cacheKey, parsed) => this.service.getProcessedTileTextureDelivery(cacheKey, parsed.mode)
    );
  }

  @Get("cache/:cacheKey/textures")
  @Roles("builder", "dm", "admin")
  @Permissions("scene.read")
  @ApiOperation({
    summary: "Download processed tile texture-atlas payload through backend proxy."
  })
  @ApiParam({ name: "cacheKey", description: "Hex cache key returned by process endpoint." })
  @ApiResponse({ status: 200, description: "Binary texture-atlas payload." })
  @ApiResponse({ status: 404, description: "Cache entry or texture-atlas blob not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async getCachedTexture(
    @Param("cacheKey") rawCacheKey: string,
    @Res() response: FastifyReply
  ) {
    const cacheKey = parseTileCacheKey(rawCacheKey);
    const data = await this.service.getProcessedTileTexture(cacheKey);

    applyBinaryPayloadHeaders(response, data.payload, {
      cacheControl: "private, max-age=120",
      extraHeaders: {
        "X-Aurora-Tile-Atlas-Id": data.textureAtlas.atlasId,
        "X-Aurora-Tile-Atlas-Object-Key": data.textureAtlas.objectKey ?? "",
        "X-Aurora-Cache-Key": data.cacheKey
      }
    });
    setInlineContentDisposition(response, `${data.textureAtlas.atlasId}.bin`);
    return response.send(data.payload.bytes);
  }

  @Get("cache/:cacheKey/model")
  @Roles("builder", "dm", "admin")
  @Permissions("scene.read")
  @ApiOperation({
    summary: "Download processed tile model GLB/GLTF payload through backend proxy."
  })
  @ApiParam({ name: "cacheKey", description: "Hex cache key returned by process endpoint." })
  @ApiResponse({ status: 200, description: "Binary tile model payload." })
  @ApiResponse({ status: 404, description: "Cache entry or model blob not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async getCachedModel(
    @Param("cacheKey") rawCacheKey: string,
    @Res() response: FastifyReply
  ) {
    const cacheKey = parseTileCacheKey(rawCacheKey);
    const data = await this.service.getProcessedTileModel(cacheKey);

    applyBinaryPayloadHeaders(response, data.payload, {
      cacheControl: "private, max-age=120",
      extraHeaders: {
        "X-Aurora-Tile-Model-Object-Key": data.modelAsset.objectKey,
        "X-Aurora-Tile-Model-Extension": data.modelAsset.extension,
        "X-Aurora-Cache-Key": data.cacheKey
      }
    });
    setInlineContentDisposition(response, `tile-model.${data.modelAsset.extension}`);
    return response.send(data.payload.bytes);
  }
}
