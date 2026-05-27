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
export class PlaceablesController extends ProcessingHttpBaseController {
  constructor(private readonly service: CatalogApplicationService, config: AppConfigService) {
    super(config);
  }

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
    return this.handleParsedQuery(request, query, parseCatalogListQuery, (parsed) =>
      this.service.listPlaceables(parsed)
    );
  }

  @Get(":templateId/preview")
  @ApiOperation({ summary: "Get placeable preview payload by template id." })
  @ApiParam({ name: "templateId" })
  @ApiResponse({ status: 200, description: "Placeable preview." })
  @ApiResponse({ status: 404, description: "Template not found." })
  async preview(@Req() request: AppRequest, @Param("templateId") templateId: string) {
    return this.handleById(request, templateId, (id) => this.service.getPlaceablePreview(id));
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
    return this.handleParsedBody(request, body, parsePlaceableProcessPayload, (parsed) =>
      this.service.processPlaceable(parsed)
    );
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
    return this.handleCacheKey(request, rawCacheKey, parsePlaceableCacheKey, (cacheKey) =>
      this.service.getProcessedPlaceable(cacheKey)
    );
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
    return this.handleCacheKeyAndParsedQuery(
      request,
      rawCacheKey,
      query,
      parsePlaceableCacheKey,
      parsePlaceableAssetDeliveryQuery,
      (cacheKey, parsedQuery) =>
        this.service.getProcessedPlaceableAssetDelivery(cacheKey, parsedQuery.assetIds)
    );
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

    applyBinaryPayloadHeaders(response, data.payload, {
      cacheControl: "private, max-age=120",
      extraHeaders: {
        "X-Aurora-Asset-Id": data.asset.assetId,
        "X-Aurora-Cache-Key": data.cacheKey,
        "X-Aurora-Module-Hash": data.moduleHash ?? ""
      }
    });
    setInlineContentDisposition(response, data.asset.fileName);

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
    return this.handleParsedBody(request, body, parsePlaceableBenchmarkPayload, (parsed) =>
      this.service.benchmarkPlaceables(parsed)
    );
  }
}
