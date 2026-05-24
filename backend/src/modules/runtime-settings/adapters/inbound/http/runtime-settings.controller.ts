import { Body, Controller, Get, Post, Put, Query, Req } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { buildSuccessEnvelope } from "../../../../../common/http/contract";
import type { AppRequest } from "../../../../../common/http/request.types";
import { Permissions } from "../../../../auth/adapters/inbound/http/permissions.decorator";
import { Roles } from "../../../../auth/adapters/inbound/http/roles.decorator";
import { RuntimeSettingsApplicationService } from "../../../application/runtime-settings.application.service";
import {
  parseModuleCacheRebuildQuery,
  parseModuleCacheSummaryQuery,
  parseReplaceRuntimeSettingsRequest
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

  @Post("module-cache/rebuild")
  @Permissions("admin.config.write")
  @ApiOperation({
    summary:
      "Sync module cache in blob storage from configured module source (decompiled path preferred, otherwise packed module). Default mode is incremental by per-file hash; use forceFull=true for full rebuild."
  })
  @ApiResponse({ status: 200, description: "Module cache sync completed." })
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
