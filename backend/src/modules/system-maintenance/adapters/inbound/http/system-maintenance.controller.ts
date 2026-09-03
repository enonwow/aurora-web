import { Controller, Get, Req } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { buildSuccessEnvelope } from "../../../../../common/http/contract";
import type { AppRequest } from "../../../../../common/http/request.types";
import { Public } from "../../../../auth/adapters/inbound/http/public.decorator";
import { SystemMaintenanceApplicationService } from "../../../application/system-maintenance.application.service";
import { MaintenanceAllowed } from "./maintenance-allowed.decorator";

@Controller("system/maintenance")
@ApiTags("system-maintenance")
export class SystemMaintenanceController {
  constructor(
    private readonly maintenance: SystemMaintenanceApplicationService,
    private readonly config: AppConfigService
  ) {}

  @Get()
  @Public()
  @MaintenanceAllowed()
  @ApiOperation({ summary: "Return safe public server-maintenance status." })
  @ApiResponse({ status: 200, description: "Public maintenance state." })
  async getStatus(@Req() request: AppRequest) {
    return buildSuccessEnvelope(
      this.config.contractVersion,
      request,
      await this.maintenance.getPublicStatus()
    );
  }
}
