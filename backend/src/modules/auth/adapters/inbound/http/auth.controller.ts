import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { buildSuccessEnvelope } from "../../../../../common/http/contract";
import type { AppRequest } from "../../../../../common/http/request.types";
import { parseLoginRequest } from "./auth.schemas";
import { AuthApplicationService } from "../../../application/auth.application.service";
import { ALL_ROLES } from "../../../domain/auth.types";
import { LoginRequestDto } from "./dto/login.request.dto";
import { Permissions } from "./permissions.decorator";
import { Public } from "./public.decorator";
import { Roles } from "./roles.decorator";

@Controller("auth")
@ApiTags("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthApplicationService,
    private readonly config: AppConfigService
  ) {}

  @Post("login")
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: "Authenticate user and create session." })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({ status: 200, description: "Authenticated successfully." })
  @ApiResponse({ status: 401, description: "Invalid credentials." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async login(@Req() request: AppRequest, @Body() body: LoginRequestDto) {
    const parsed = parseLoginRequest(body);
    const data = await this.authService.authenticate(
      parsed.username,
      parsed.password
    );
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Post("logout")
  @Roles(...ALL_ROLES)
  @HttpCode(204)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Invalidate active session token." })
  @ApiResponse({ status: 204, description: "Logged out." })
  @ApiResponse({ status: 401, description: "Missing or invalid session." })
  async logout(@Req() request: AppRequest): Promise<void> {
    await this.authService.logout(request.auth!.sessionToken);
  }

  @Get("me")
  @Roles(...ALL_ROLES)
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get current authenticated user context." })
  @ApiResponse({ status: 200, description: "Current user context." })
  @ApiResponse({ status: 401, description: "Missing or invalid session." })
  async me(@Req() request: AppRequest) {
    const auth = request.auth!;
    return buildSuccessEnvelope(this.config.contractVersion, request, {
      userId: auth.user.id,
      roles: [auth.user.role],
      displayName: auth.user.displayName,
      permissions: auth.permissions
    });
  }

  @Get("admin/ping")
  @Roles("admin")
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Admin-only guard verification endpoint." })
  @ApiResponse({ status: 200, description: "Admin access granted." })
  @ApiResponse({ status: 403, description: "Forbidden for non-admin roles." })
  async adminPing(@Req() request: AppRequest) {
    return buildSuccessEnvelope(this.config.contractVersion, request, {
      status: "ok"
    });
  }

  @Get("dm/action/ping")
  @Roles("builder", "dm", "admin")
  @Permissions("dm.spawn_creature")
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Permission-level guard verification endpoint for DM actions."
  })
  @ApiResponse({ status: 200, description: "DM action access granted." })
  @ApiResponse({
    status: 403,
    description: "Forbidden when user misses action permission."
  })
  async dmActionPing(@Req() request: AppRequest) {
    return buildSuccessEnvelope(this.config.contractVersion, request, {
      status: "ok"
    });
  }
}
