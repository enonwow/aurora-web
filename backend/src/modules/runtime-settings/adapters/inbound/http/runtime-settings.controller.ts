import { Body, Controller, Get, Param, Post, Put, Query, Req, Res } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiParam,
  ApiOperation,
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
import { RuntimeSettingsApplicationService } from "../../../application/runtime-settings.application.service";
import {
  parseModuleCacheRebuildQuery,
  parseModuleCacheSummaryQuery,
  parseReplaceRuntimeSettingsRequest,
  parseTextureDeliveryQuery,
  parseTextureIdParam,
  parseTextureIndexQuery,
  TEXTURE_INDEX_QUERY_DEFAULT_LIMIT,
  TEXTURE_INDEX_QUERY_DEFAULT_OFFSET
} from "./runtime-settings.schemas";

@Controller("settings/runtime")
@ApiTags("runtime-settings")
@ApiBearerAuth("bearer")
@Roles("admin")
export class RuntimeSettingsController {
  constructor(
    private readonly settingsService: RuntimeSettingsApplicationService,
    private readonly config: AppConfigService
  ) {}

  @Get()
  @ApiOperation({
    summary:
      "Get backend runtime settings for NWN paths, source toggles and benchmark candidates."
  })
  @ApiResponse({ status: 200, description: "Runtime settings payload." })
  @ApiResponse({ status: 403, description: "Forbidden for non-admin roles." })
  async getRuntimeSettings(@Req() request: AppRequest) {
    const data = await this.settingsService.getRuntimeSettings();
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("haks/resolved")
  @ApiOperation({
    summary:
      "Get resolved HAK source lists per asset kind (inline list or profile-based)."
  })
  @ApiResponse({ status: 200, description: "Resolved HAK settings payload." })
  @ApiResponse({ status: 403, description: "Forbidden for non-admin roles." })
  async getResolvedHakSettings(@Req() request: AppRequest) {
    const data = await this.settingsService.getResolvedHakSettings();
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("module-cache")
  @ApiOperation({
    summary:
      "List module cache objects currently stored in blob bucket under module prefix."
  })
  @ApiResponse({ status: 200, description: "Module cache object summary." })
  @ApiResponse({ status: 403, description: "Forbidden for non-admin roles." })
  async getModuleCacheSummary(
    @Req() request: AppRequest,
    @Query() query: Record<string, unknown>
  ) {
    const parsed = parseModuleCacheSummaryQuery(query);
    const data = await this.settingsService.getModuleBlobCacheSummary(parsed.limit);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("module-cache/textures/summary")
  @ApiOperation({
    summary:
      "Get texture index metadata summary stored in module cache blob under __aurora/meta/texture-index.v1.json."
  })
  @ApiResponse({ status: 200, description: "Texture index metadata summary." })
  @ApiResponse({ status: 403, description: "Forbidden for non-admin roles." })
  async getTextureIndexSummary(@Req() request: AppRequest) {
    const data = await this.settingsService.getTextureIndexMetadataSummary();
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("module-cache/textures")
  @ApiOperation({
    summary:
      "List/query texture index entries from module cache blob. Supports exact resref filter (case-insensitive) with limit/offset pagination."
  })
  @ApiQuery({
    name: "resref",
    required: false,
    type: String,
    description:
      "Exact texture resref filter (case-insensitive). Empty or whitespace-only values are treated as not provided."
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Page size for texture index query.",
    example: TEXTURE_INDEX_QUERY_DEFAULT_LIMIT,
    schema: {
      default: TEXTURE_INDEX_QUERY_DEFAULT_LIMIT,
      minimum: 1,
      maximum: 1000
    }
  })
  @ApiQuery({
    name: "offset",
    required: false,
    type: Number,
    description: "Pagination offset for texture index query.",
    example: TEXTURE_INDEX_QUERY_DEFAULT_OFFSET,
    schema: {
      default: TEXTURE_INDEX_QUERY_DEFAULT_OFFSET,
      minimum: 0
    }
  })
  @ApiResponse({ status: 200, description: "Texture index query result." })
  @ApiResponse({ status: 403, description: "Forbidden for non-admin roles." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async queryTextureIndex(
    @Req() request: AppRequest,
    @Query() query: Record<string, unknown>
  ) {
    const parsed = parseTextureIndexQuery(query);
    const data = await this.settingsService.queryTextureIndex(parsed);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("module-cache/textures/contracts")
  @Roles(...ALL_ROLES)
  @Permissions("scene.read")
  @ApiOperation({
    summary:
      "Build binary delivery contracts for texture index entries (delivery path + S3 key metadata)."
  })
  @ApiQuery({
    name: "textureIds",
    required: false,
    type: String,
    description:
      "Optional list of texture ids (comma-separated string or repeated query param)."
  })
  @ApiQuery({
    name: "resref",
    required: false,
    type: String,
    description: "Optional exact texture resref filter (case-insensitive)."
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    schema: {
      default: TEXTURE_INDEX_QUERY_DEFAULT_LIMIT,
      minimum: 1,
      maximum: 1000
    }
  })
  @ApiQuery({
    name: "offset",
    required: false,
    type: Number,
    schema: {
      default: TEXTURE_INDEX_QUERY_DEFAULT_OFFSET,
      minimum: 0
    }
  })
  @ApiResponse({ status: 200, description: "Texture delivery contract list." })
  @ApiResponse({ status: 403, description: "Forbidden for role/permission." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async getTextureDeliveryContracts(
    @Req() request: AppRequest,
    @Query() query: Record<string, unknown>
  ) {
    const parsed = parseTextureDeliveryQuery(query);
    const data = await this.settingsService.getTextureDeliveryContracts(parsed);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("module-cache/textures/:textureId")
  @Roles(...ALL_ROLES)
  @Permissions("scene.read")
  @ApiOperation({
    summary:
      "Download texture blob from module cache by texture id from texture-index.v1."
  })
  @ApiParam({
    name: "textureId",
    description: "24-char texture id from texture-index entries."
  })
  @ApiResponse({ status: 200, description: "Binary texture payload." })
  @ApiResponse({ status: 404, description: "Texture index, entry, or blob was not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async getTextureBlob(
    @Param("textureId") rawTextureId: string,
    @Res() response: FastifyReply
  ) {
    const textureId = parseTextureIdParam(rawTextureId);
    const data = await this.settingsService.getTextureBlobById(textureId);

    response.header("Content-Type", data.payload.contentType);
    response.header("Content-Length", String(data.payload.size));
    response.header("Cache-Control", "private, max-age=120");
    if (data.payload.etag) {
      response.header("ETag", data.payload.etag);
    }
    response.header("X-Aurora-Texture-Id", data.texture.textureId);
    response.header("X-Aurora-Texture-Resref", data.texture.resref);
    response.header("X-Aurora-Texture-Object-Key", data.texture.objectKey);
    response.header(
      "Content-Disposition",
      `inline; filename="${sanitizeHeaderFileName(data.texture.resref)}.${sanitizeHeaderFileName(data.texture.extension)}"`
    );

    return response.send(data.payload.bytes);
  }

  @Post("module-cache/rebuild")
  @Permissions("admin.config.write")
  @ApiOperation({
    summary:
      "Sync module cache in blob storage from configured module source (decompiled path preferred, otherwise packed module). Default mode is incremental by per-file hash; use forceFull=true for full rebuild."
  })
  @ApiResponse({
    status: 200,
    description:
      "Module cache sync completed. Response includes per-source sync delta (module, hak, vanilla, index) in sourceDelta."
  })
  @ApiResponse({ status: 422, description: "Validation or source configuration failed." })
  async rebuildModuleCache(
    @Req() request: AppRequest,
    @Query() query: Record<string, unknown>
  ) {
    const parsed = parseModuleCacheRebuildQuery(query);
    const data = await this.settingsService.rebuildModuleBlobCache(
      request.auth!.user.username,
      {
        forceFull: parsed.forceFull
      }
    );
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Put()
  @Permissions("admin.config.write")
  @ApiOperation({
    summary:
      "Replace backend runtime settings. Admin-only operation used to override paths and source policies."
  })
  @ApiResponse({ status: 200, description: "Runtime settings updated." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async replaceRuntimeSettings(
    @Req() request: AppRequest,
    @Body() body: Record<string, unknown>
  ) {
    const parsed = parseReplaceRuntimeSettingsRequest(body);
    const data = await this.settingsService.replaceRuntimeSettings(
      parsed,
      request.auth!.user.username
    );
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }
}

function sanitizeHeaderFileName(value: string): string {
  return value.replace(/["\\\r\n]/gu, "_");
}
