import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Req, Res } from "@nestjs/common";
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
import { Permissions } from "../../../../auth/adapters/inbound/http/permissions.decorator";
import { Roles } from "../../../../auth/adapters/inbound/http/roles.decorator";
import { ALL_ROLES } from "../../../../auth/domain/auth.types";
import { SoundsApplicationService } from "../../../application/sounds.application.service";
import {
  parseSoundBenchmarkPayload,
  parseSoundAudioDeliveryQuery,
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

  @Get("cache/:cacheKey/audio/contracts")
  @Roles("builder", "dm", "admin")
  @Permissions("processing.placeable.read")
  @ApiOperation({
    summary: "Get hybrid audio delivery contract for processed sound cache entry."
  })
  @ApiParam({ name: "cacheKey", description: "Hex cache key returned by process endpoint." })
  @ApiQuery({
    name: "mode",
    required: false,
    enum: ["proxy", "direct"],
    description:
      "Delivery mode. `proxy` streams bytes through API; `direct` returns direct blob HTTP/S3 URLs."
  })
  @ApiResponse({ status: 200, description: "Sound audio delivery contract." })
  @ApiResponse({ status: 404, description: "Cache entry not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async getCachedAudioContract(
    @Req() request: AppRequest,
    @Param("cacheKey") rawCacheKey: string,
    @Query() query: Record<string, unknown>
  ) {
    const cacheKey = parseSoundCacheKey(rawCacheKey);
    const parsed = parseSoundAudioDeliveryQuery(query);
    const data = await this.service.getProcessedSoundAudioDelivery(cacheKey, parsed.mode);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("cache/:cacheKey/audio")
  @Roles("builder", "dm", "admin")
  @Permissions("scene.read")
  @ApiOperation({
    summary: "Download processed sound audio payload through backend proxy."
  })
  @ApiParam({ name: "cacheKey", description: "Hex cache key returned by process endpoint." })
  @ApiResponse({ status: 200, description: "Binary audio payload." })
  @ApiResponse({ status: 206, description: "Partial audio payload for range request." })
  @ApiResponse({ status: 404, description: "Cache entry or audio blob not found." })
  @ApiResponse({ status: 416, description: "Invalid byte range." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async getCachedAudio(
    @Param("cacheKey") rawCacheKey: string,
    @Headers("range") rangeHeader: string | undefined,
    @Res() response: FastifyReply
  ) {
    const cacheKey = parseSoundCacheKey(rawCacheKey);
    const data = await this.service.getProcessedSoundAudio(cacheKey);
    const range = parseSingleByteRange(rangeHeader, data.payload.size);

    response.header("Content-Type", data.payload.contentType);
    response.header("Accept-Ranges", "bytes");
    response.header("Cache-Control", "private, max-age=120");
    response.header("X-Aurora-Sound-Asset-Id", data.audio.assetId);
    response.header("X-Aurora-Sound-Object-Key", data.audio.objectKey);
    response.header("X-Aurora-Cache-Key", data.cacheKey);
    if (data.payload.etag) {
      response.header("ETag", data.payload.etag);
    }

    if (range && range.kind === "invalid") {
      response.code(416);
      response.header("Content-Range", `bytes */${data.payload.size}`);
      return response.send();
    }

    if (range && range.kind === "partial") {
      const chunk = data.payload.bytes.subarray(range.start, range.end + 1);
      response.code(206);
      response.header("Content-Length", String(chunk.length));
      response.header("Content-Range", `bytes ${range.start}-${range.end}/${data.payload.size}`);
      response.header(
        "Content-Disposition",
        `inline; filename="${sanitizeHeaderFileName(data.audio.assetId)}.${sanitizeHeaderFileName(data.audio.format)}"`
      );
      return response.send(chunk);
    }

    response.header("Content-Length", String(data.payload.size));
    response.header(
      "Content-Disposition",
      `inline; filename="${sanitizeHeaderFileName(data.audio.assetId)}.${sanitizeHeaderFileName(data.audio.format)}"`
    );
    return response.send(data.payload.bytes);
  }
}

function sanitizeHeaderFileName(value: string): string {
  return value.replace(/["\\\r\n]/gu, "_");
}

function parseSingleByteRange(
  rawValue: string | undefined,
  totalSize: number
):
  | { kind: "partial"; start: number; end: number }
  | { kind: "invalid" }
  | null {
  if (!rawValue || rawValue.trim().length === 0) {
    return null;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (!normalized.startsWith("bytes=")) {
    return { kind: "invalid" };
  }

  const spec = normalized.slice("bytes=".length).trim();
  if (spec.includes(",")) {
    return { kind: "invalid" };
  }

  const [rawStart, rawEnd] = spec.split("-", 2);
  if (typeof rawStart !== "string" || typeof rawEnd !== "string") {
    return { kind: "invalid" };
  }

  if (rawStart.length === 0) {
    const suffixLength = Number(rawEnd);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) {
      return { kind: "invalid" };
    }
    const effectiveLength = Math.min(suffixLength, totalSize);
    if (effectiveLength <= 0) {
      return { kind: "invalid" };
    }
    return {
      kind: "partial",
      start: totalSize - effectiveLength,
      end: totalSize - 1
    };
  }

  const start = Number(rawStart);
  if (!Number.isInteger(start) || start < 0 || start >= totalSize) {
    return { kind: "invalid" };
  }

  if (rawEnd.length === 0) {
    return {
      kind: "partial",
      start,
      end: totalSize - 1
    };
  }

  const end = Number(rawEnd);
  if (!Number.isInteger(end) || end < start) {
    return { kind: "invalid" };
  }

  return {
    kind: "partial",
    start,
    end: Math.min(end, totalSize - 1)
  };
}
