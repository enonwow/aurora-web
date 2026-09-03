import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { ProcessingHttpBaseController } from "../../../../../common/http/processing-http.base-controller";
import type { AppRequest } from "../../../../../common/http/request.types";
import { Permissions } from "../../../../auth/adapters/inbound/http/permissions.decorator";
import { Roles } from "../../../../auth/adapters/inbound/http/roles.decorator";
import { AreaUpdateValidationApplicationService } from "../../../application/area-update-validation.application.service";

@Controller("modules/:moduleId")
@ApiTags("area-update")
@ApiBearerAuth("bearer")
@Roles("admin")
@Permissions("area.materialize.update")
export class ModuleAreaUpdateValidationController extends ProcessingHttpBaseController {
  constructor(
    private readonly areaUpdate: AreaUpdateValidationApplicationService,
    config: AppConfigService,
  ) {
    super(config);
  }

  @Post("areas/:areaResRef/update-validations")
  @HttpCode(200)
  @ApiOperation({
    summary:
      "Compile and independently validate one immutable draft revision as a complete ARE/GIT/GIC replacement candidate.",
  })
  @ApiParam({ name: "moduleId" })
  @ApiParam({ name: "areaResRef" })
  @ApiResponse({ status: 200, description: "Short-lived Area Update validation receipt." })
  @ApiResponse({ status: 403, description: "Privileged module update permission denied." })
  @ApiResponse({ status: 412, description: "Module or draft revision changed." })
  @ApiResponse({ status: 422, description: "Command, draft projection, or candidate validation failed." })
  async validate(
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: FastifyReply,
    @Param("moduleId") moduleId: string,
    @Param("areaResRef") areaResRef: string,
    @Body() body: unknown,
  ) {
    const data = await this.areaUpdate.validate({
      moduleId,
      areaResRef,
      actorId: request.auth?.user.id ?? "",
      body,
    });
    response.header("ETag", `"${data.moduleRevision}"`);
    response.header("Cache-Control", "no-store");
    return this.success(request, data);
  }
}
