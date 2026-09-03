import { Body, Controller, Get, HttpCode, Param, Post, Req } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { ProcessingHttpBaseController } from "../../../../../common/http/processing-http.base-controller";
import type { AppRequest } from "../../../../../common/http/request.types";
import { Permissions } from "../../../../auth/adapters/inbound/http/permissions.decorator";
import { Roles } from "../../../../auth/adapters/inbound/http/roles.decorator";
import { VfxApplicationService } from "../../../application/vfx.application.service";
import {
  parseVfxBenchmarkPayload,
  parseVfxCacheKey,
  parseVfxProcessPayload
} from "./vfx.schemas";

@Controller("vfx")
@ApiTags("vfx")
@ApiBearerAuth("bearer")
@Roles("builder", "dm", "admin")
export class VfxController extends ProcessingHttpBaseController {
  constructor(private readonly service: VfxApplicationService, config: AppConfigService) {
    super(config);
  }

  @Post("process")
  @HttpCode(200)
  @Permissions("processing.vfx.run")
  @ApiOperation({
    summary:
      "Process VFX source/runtime package using the canonical VFX backend pipeline, independent of placeable preview."
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        packageKind: { type: "string", enum: ["source_parse", "runtime_package", "model_graph_runtime"] },
        sourceTableText: { type: "string", description: "Required except for model_graph_runtime." },
        progFxTableText: { type: "string" },
        sourceObjectKey: { type: "string" },
        sourceLayer: { type: "string", enum: ["module", "hak", "vanilla", "external_fixture"] },
        sourceRowId: { type: "number" },
        sourceEmitter: { type: "object", additionalProperties: true },
        sourceEmitters: {
          type: "array",
          items: { type: "object", additionalProperties: true }
        },
        sourceAnimationEvents: {
          type: "array",
          description: "Model animation-header events; these are not emitter-node events.",
          items: { type: "object", additionalProperties: false }
        },
        bypassCache: { type: "boolean", default: false },
        includeBenchmarkMetadata: { type: "boolean", default: false }
      }
    }
  })
  @ApiResponse({ status: 200, description: "Processed VFX package." })
  @ApiResponse({ status: 401, description: "Missing or invalid session." })
  @ApiResponse({ status: 403, description: "Forbidden for role/permission." })
  @ApiResponse({ status: 422, description: "Validation failed or unsafe VFX path." })
  async process(@Req() request: AppRequest, @Body() body: Record<string, unknown>) {
    return this.handleParsedBody(request, body, parseVfxProcessPayload, (parsed) =>
      this.service.processVfxPackage(parsed)
    );
  }

  @Get("cache/:cacheKey")
  @Permissions("processing.vfx.read")
  @ApiOperation({ summary: "Get processed VFX package from VFX cache by cache key." })
  @ApiParam({ name: "cacheKey", description: "Hex VFX cache key returned by process endpoint." })
  @ApiResponse({ status: 200, description: "Cached VFX processing payload." })
  @ApiResponse({ status: 404, description: "VFX cache entry not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async getCached(@Req() request: AppRequest, @Param("cacheKey") rawCacheKey: string) {
    return this.handleCacheKey(request, rawCacheKey, parseVfxCacheKey, (cacheKey) =>
      this.service.getProcessedVfx(cacheKey)
    );
  }

  @Post("benchmark")
  @HttpCode(200)
  @Permissions("processing.vfx.run")
  @ApiOperation({
    summary:
      "Run deterministic VFX backend benchmark stages for source parse, dependency graph, runtime tick, and render contract build."
  })
  @ApiResponse({ status: 200, description: "VFX benchmark contract." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async benchmark(@Req() request: AppRequest, @Body() body: Record<string, unknown>) {
    return this.handleParsedBody(request, body, parseVfxBenchmarkPayload, (parsed) =>
      this.service.benchmarkVfx(parsed)
    );
  }
}
