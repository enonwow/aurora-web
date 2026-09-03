import {
  Body,
  Controller,
  Delete,
  Headers,
  HttpCode,
  Param,
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
import { AreaDeleteApplicationService } from "../../../application/area-delete.application.service";

@Controller("modules/:moduleId")
@ApiTags("area-delete")
@ApiBearerAuth("bearer")
@Roles("admin")
@Permissions("area.materialize.delete")
export class ModuleAreaDeleteController extends ProcessingHttpBaseController {
  constructor(
    private readonly areaDelete: AreaDeleteApplicationService,
    config: AppConfigService,
  ) {
    super(config);
  }

  @Delete("areas/:areaResRef")
  @HttpCode(200)
  @ApiOperation({
    summary: "Atomically delete one Area triplet and its exact module IFO membership.",
  })
  @ApiParam({ name: "moduleId" })
  @ApiParam({ name: "areaResRef" })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiHeader({ name: "If-Match", required: true })
  @ApiResponse({ status: 200, description: "Verified immutable Area Delete receipt." })
  @ApiResponse({ status: 403, description: "Privileged Area Delete permission denied." })
  @ApiResponse({ status: 409, description: "References, identity, or idempotency conflict." })
  @ApiResponse({ status: 412, description: "Module revision or preview changed." })
  @ApiResponse({ status: 422, description: "Delete command is invalid." })
  async delete(
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: FastifyReply,
    @Param("moduleId") moduleId: string,
    @Param("areaResRef") areaResRef: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Headers("if-match") ifMatchHeader: string | undefined,
    @Body() body: unknown,
  ) {
    const result = await this.areaDelete.delete({
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
