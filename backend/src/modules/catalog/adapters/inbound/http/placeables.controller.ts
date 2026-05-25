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
import { buildSuccessEnvelope } from "../../../../../common/http/contract";
import type { AppRequest } from "../../../../../common/http/request.types";
import { CatalogApplicationService } from "../../../application/catalog.application.service";
import { Permissions } from "../../../../auth/adapters/inbound/http/permissions.decorator";
import { Roles } from "../../../../auth/adapters/inbound/http/roles.decorator";
import { ALL_ROLES } from "../../../../auth/domain/auth.types";
import { parseCatalogListQuery } from "./catalog.schemas";
import {
  parsePlaceableAssetId,
  parsePlaceableAssetDeliveryQuery,
  parsePlaceableBenchmarkPayload,
  parsePlaceableCacheKey,
  parsePlaceableProcessPayload
} from "./placeables.schemas";

@Controller("catalog/placeables")
@ApiTags("catalog-placeables")
@ApiBearerAuth("bearer")
@Roles(...ALL_ROLES)
@Permissions("scene.read")
export class PlaceablesController {
  constructor(
    private readonly service: CatalogApplicationService,
    private readonly config: AppConfigService
  ) {}

  @Get()
  @ApiOperation({ summary: "List placeable templates for area composition." })
  @ApiQuery({ name: "query", required: false })
  @ApiQuery({ name: "category", required: false })
  @ApiQuery({ name: "tag", required: false })
  @ApiQuery({
    name: "subtype",
    required: false,
    enum: [
      "generic",
      "door",
      "vfx",
      "vvx",
      "vvxy",
      "container",
      "light_source",
      "trigger_proxy"
    ],
    description: "Filter by placeable subtype. `vvx` is treated as alias of `vfx`."
  })
  @ApiQuery({ name: "benchmark", required: false, enum: ["true", "false"] })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  @ApiResponse({ status: 200, description: "Placeable templates list." })
  @ApiResponse({ status: 401, description: "Missing or invalid session." })
  @ApiResponse({ status: 403, description: "Forbidden for role/permission." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async list(@Req() request: AppRequest, @Query() query: Record<string, unknown>) {
    const parsed = parseCatalogListQuery(query);
    const data = await this.service.listPlaceables(parsed);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get(":templateId/preview")
  @ApiOperation({ summary: "Get placeable preview payload by template id." })
  @ApiParam({ name: "templateId" })
  @ApiResponse({ status: 200, description: "Placeable preview." })
  @ApiResponse({ status: 404, description: "Template not found." })
  async preview(@Req() request: AppRequest, @Param("templateId") templateId: string) {
    const data = await this.service.getPlaceablePreview(templateId);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Post("process")
  @HttpCode(200)
  @Roles("builder", "dm", "admin")
  @Permissions("processing.placeable.run")
  @ApiOperation({
    summary:
      "Process placeable into backend render contract (classification + cache metadata + asset manifest)."
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        templateId: { type: "string" },
        resref: { type: "string" },
        subtypeHint: {
          type: "string",
          enum: [
            "generic",
            "door",
            "vfx",
            "vvx",
            "vvxy",
            "container",
            "light_source",
            "trigger_proxy"
          ]
        },
        bypassCache: { type: "boolean", default: false },
        includeBenchmarkMetadata: { type: "boolean", default: true }
      }
    }
  })
  @ApiResponse({ status: 200, description: "Processed placeable payload." })
  @ApiResponse({ status: 404, description: "Template not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async process(@Req() request: AppRequest, @Body() body: Record<string, unknown>) {
    const parsed = parsePlaceableProcessPayload(body);
    const data = await this.service.processPlaceable(parsed);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("cache/:cacheKey")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.placeable.read")
  @ApiOperation({ summary: "Get processed placeable payload from cache by cache key." })
  @ApiParam({ name: "cacheKey", description: "Hex cache key returned by process endpoint." })
  @ApiResponse({ status: 200, description: "Cached placeable processing payload." })
  @ApiResponse({ status: 404, description: "Cache entry not found." })
  async getCached(
    @Req() request: AppRequest,
    @Param("cacheKey") rawCacheKey: string
  ) {
    const cacheKey = parsePlaceableCacheKey(rawCacheKey);
    const data = await this.service.getProcessedPlaceable(cacheKey);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("cache/:cacheKey/assets/contracts")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.placeable.read")
  @ApiOperation({
    summary:
      "Get delivery contract for placeable assets from cached manifest without downloading payload bytes."
  })
  @ApiParam({ name: "cacheKey", description: "Hex cache key returned by process endpoint." })
  @ApiQuery({
    name: "assetIds",
    required: false,
    description:
      "Optional list of asset ids (comma-separated string or repeated query param). When omitted, all manifest assets are returned."
  })
  @ApiResponse({ status: 200, description: "Placeable asset delivery contract list." })
  @ApiResponse({ status: 404, description: "Cache entry or asset was not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async getCachedAssetContracts(
    @Req() request: AppRequest,
    @Param("cacheKey") rawCacheKey: string,
    @Query() query: Record<string, unknown>
  ) {
    const cacheKey = parsePlaceableCacheKey(rawCacheKey);
    const parsedQuery = parsePlaceableAssetDeliveryQuery(query);
    const data = await this.service.getProcessedPlaceableAssetDelivery(
      cacheKey,
      parsedQuery.assetIds
    );
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("cache/:cacheKey/assets/:assetId")
  @Permissions("scene.read")
  @ApiOperation({
    summary:
      "Download placeable asset blob by cached placeable key and asset id from manifest."
  })
  @ApiParam({ name: "cacheKey", description: "Hex cache key returned by process endpoint." })
  @ApiParam({ name: "assetId", description: "Hex asset id from placeable assetManifest.assets[]" })
  @ApiResponse({ status: 200, description: "Binary asset payload." })
  @ApiResponse({ status: 404, description: "Asset or blob object not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async getCachedAsset(
    @Param("cacheKey") rawCacheKey: string,
    @Param("assetId") rawAssetId: string,
    @Res() response: FastifyReply
  ) {
    const cacheKey = parsePlaceableCacheKey(rawCacheKey);
    const assetId = parsePlaceableAssetId(rawAssetId);
    const data = await this.service.getProcessedPlaceableAsset(cacheKey, assetId);

    response.header("Content-Type", data.payload.contentType);
    response.header("Content-Length", String(data.payload.size));
    response.header("Cache-Control", "private, max-age=120");
    if (data.payload.etag) {
      response.header("ETag", data.payload.etag);
    }
    response.header("X-Aurora-Asset-Id", data.asset.assetId);
    response.header("X-Aurora-Cache-Key", data.cacheKey);
    response.header("X-Aurora-Module-Hash", data.moduleHash ?? "");
    response.header(
      "Content-Disposition",
      `inline; filename="${sanitizeHeaderFileName(data.asset.fileName)}"`
    );

    return response.send(data.payload.bytes);
  }

  @Post("benchmark")
  @HttpCode(200)
  @Roles("builder", "dm", "admin")
  @Permissions("processing.placeable.run")
  @ApiOperation({
    summary: "Run placeable processing benchmark and return deterministic fingerprint."
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        templateIds: {
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
    const parsed = parsePlaceableBenchmarkPayload(body);
    const data = await this.service.benchmarkPlaceables(parsed);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }
}

function sanitizeHeaderFileName(value: string): string {
  return value.replace(/["\\\r\n]/gu, "_");
}
