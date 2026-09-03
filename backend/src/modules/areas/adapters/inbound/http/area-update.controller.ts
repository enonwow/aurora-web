import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  Put,
  Req,
  Res,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiHeader,
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
import { AreaUpdateApplicationService } from "../../../application/area-update.application.service";

@Controller("modules/:moduleId")
@ApiTags("area-update")
@ApiBearerAuth("bearer")
@Roles("admin")
@Permissions("area.materialize.update")
export class ModuleAreaUpdateController extends ProcessingHttpBaseController {
  constructor(
    private readonly areaUpdate: AreaUpdateApplicationService,
    config: AppConfigService,
  ) {
    super(config);
  }

  @Put("areas/:areaResRef")
  @HttpCode(200)
  @ApiOperation({
    summary:
      "Atomically publish one immutable Area draft revision as a preserve-first ARE replacement.",
  })
  @ApiParam({ name: "moduleId" })
  @ApiParam({ name: "areaResRef" })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiHeader({ name: "If-Match", required: true })
  @ApiResponse({ status: 200, description: "Verified immutable Area Update receipt." })
  @ApiResponse({ status: 403, description: "Privileged Area Update permission denied." })
  @ApiResponse({ status: 409, description: "Idempotency, source, SET, or companion conflict." })
  @ApiResponse({ status: 412, description: "Module or draft revision changed." })
  @ApiResponse({ status: 422, description: "Command or ARE candidate is invalid." })
  async update(
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: FastifyReply,
    @Param("moduleId") moduleId: string,
    @Param("areaResRef") areaResRef: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Headers("if-match") ifMatchHeader: string | undefined,
    @Body() body: unknown,
  ) {
    const result = await this.areaUpdate.update({
      moduleId,
      areaResRef,
      actorId: request.auth?.user.id ?? "",
      idempotencyKey,
      ifMatchHeader,
      body,
    });
    response.header("ETag", `"${result.receipt.newModuleRevision}"`);
    response.header("Cache-Control", "no-store");
    response.header("Idempotency-Status", result.idempotency);
    return this.success(request, result.receipt);
  }
}
