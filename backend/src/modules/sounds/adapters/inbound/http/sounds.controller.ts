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
import { SoundsApplicationService } from "../../../application/sounds.application.service";
import {
  parseSoundBenchmarkPayload,
  parseSoundCacheKey,
  parseSoundListQuery,
  parseSoundProcessPayload
} from "./sounds.schemas";

@Controller("catalog/sounds")
@ApiTags("catalog-sounds")
@ApiBearerAuth("bearer")
@Roles(...ALL_ROLES)
@Permissions("scene.read")
export class SoundsController {
  constructor(
    private readonly service: SoundsApplicationService,
    private readonly config: AppConfigService
  ) {}

  @Get()
  @ApiOperation({ summary: "List sound templates for area assembly." })
  @ApiQuery({ name: "query", required: false })
  @ApiQuery({ name: "category", required: false, enum: ["ambient", "music", "effect"] })
  @ApiQuery({ name: "tag", required: false })
  @ApiQuery({ name: "benchmark", required: false, enum: ["true", "false"] })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  @ApiResponse({ status: 200, description: "Sound list." })
  @ApiResponse({ status: 401, description: "Missing or invalid session." })
  @ApiResponse({ status: 403, description: "Forbidden for role/permission." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async list(@Req() request: AppRequest, @Query() query: Record<string, unknown>) {
    const parsed = parseSoundListQuery(query);
    const data = await this.service.listSounds(parsed);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get(":soundId")
  @ApiOperation({ summary: "Get full sound payload." })
  @ApiParam({ name: "soundId" })
  @ApiResponse({ status: 200, description: "Sound payload." })
  @ApiResponse({ status: 404, description: "Sound not found." })
  async getById(@Req() request: AppRequest, @Param("soundId") soundId: string) {
    const data = await this.service.getSound(soundId);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get(":soundId/preview")
  @ApiOperation({ summary: "Get lightweight sound preview payload." })
  @ApiParam({ name: "soundId" })
  @ApiResponse({ status: 200, description: "Sound preview payload." })
  @ApiResponse({ status: 404, description: "Sound not found." })
  async preview(@Req() request: AppRequest, @Param("soundId") soundId: string) {
    const data = await this.service.getSoundPreview(soundId);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Post(":soundId/process")
  @HttpCode(200)
  @Roles("builder", "dm", "admin")
  @Permissions("processing.placeable.run")
  @ApiOperation({
    summary: "Process sound payload and store/read cached contract."
  })
  @ApiParam({ name: "soundId" })
  @ApiResponse({ status: 200, description: "Processed sound payload." })
  @ApiResponse({ status: 404, description: "Sound not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async process(
    @Req() request: AppRequest,
    @Param("soundId") soundId: string,
    @Body() body: Record<string, unknown>
  ) {
    const parsed = parseSoundProcessPayload(body);
    const data = await this.service.processSound({
      soundId,
      bypassCache: parsed.bypassCache
    });
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Post("benchmark")
  @HttpCode(200)
  @Roles("builder", "dm", "admin")
  @Permissions("processing.placeable.run")
  @ApiOperation({
    summary: "Run sound processing benchmark and return deterministic fingerprint."
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        soundIds: {
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
    const parsed = parseSoundBenchmarkPayload(body);
    const data = await this.service.benchmarkSounds(parsed);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("cache/:cacheKey")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.placeable.read")
  @ApiOperation({ summary: "Get processed sound payload from cache by cache key." })
  @ApiParam({ name: "cacheKey", description: "Hex cache key returned by process endpoint." })
  @ApiResponse({ status: 200, description: "Cached sound payload." })
  @ApiResponse({ status: 404, description: "Cache entry not found." })
  async getCached(@Req() request: AppRequest, @Param("cacheKey") rawCacheKey: string) {
    const cacheKey = parseSoundCacheKey(rawCacheKey);
    const data = await this.service.getProcessedSound(cacheKey);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }
}
