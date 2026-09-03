import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AppConfigService } from "../common/config/app-config.service";
import { Public } from "../modules/auth/adapters/inbound/http/public.decorator";
import { MaintenanceAllowed } from "../modules/system-maintenance/adapters/inbound/http/maintenance-allowed.decorator";

const BACKEND_RUNTIME_STARTED_AT = new Date().toISOString();
const VFX_RUNTIME_REVISION =
  "vfx-recursive-chunk-shared-rng-instance-frames-v1";

@Controller("health")
@ApiTags("health")
export class HealthController {
  constructor(private readonly config: AppConfigService) {}

  @Get()
  @Public()
  @MaintenanceAllowed()
  @ApiOperation({ summary: "Health check endpoint." })
  @ApiResponse({ status: 200, description: "Service health status." })
  getHealth() {
    return {
      status: "ok",
      service: "aurora-backend",
      runtimeStartedAt: BACKEND_RUNTIME_STARTED_AT,
      processId: process.pid,
      contractVersion: this.config.contractVersion,
      vfxRuntimeRevision: VFX_RUNTIME_REVISION,
      runtimeBuild: {
        commit: this.config.runtimeBuildCommit,
        imageDigest: this.config.runtimeBuildImageDigest,
        builtAt: this.config.runtimeBuildBuiltAt,
        processStartedAt: BACKEND_RUNTIME_STARTED_AT,
        contractVersion: this.config.contractVersion,
        vfxRuntimeRevision: VFX_RUNTIME_REVISION
      }
    };
  }
}
