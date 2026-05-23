import { Body, Controller, Get, Put, Req } from "@nestjs/common";
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
import { parseReplaceRuntimeSettingsRequest } from "./runtime-settings.schemas";

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
