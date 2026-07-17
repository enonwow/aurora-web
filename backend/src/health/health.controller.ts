import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../modules/auth/adapters/inbound/http/public.decorator";

@Controller("health")
@ApiTags("health")
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ summary: "Health check endpoint." })
  @ApiResponse({ status: 200, description: "Service health status." })
  getHealth() {
    return {
      status: "ok",
      service: "aurora-backend"
    };
  }
}
