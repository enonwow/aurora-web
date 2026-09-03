import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
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
import { AreaEventScriptPublicationApplicationService } from "../../../application/area-event-script-publication.application.service";

@Controller("modules/:moduleId/scripts")
@ApiTags("area-event-scripts")
@ApiBearerAuth("bearer")
@Roles("admin")
@Permissions("area.materialize.update")
export class ModuleAreaEventScriptPublicationController extends ProcessingHttpBaseController {
  constructor(
    private readonly scripts: AreaEventScriptPublicationApplicationService,
    config: AppConfigService,
  ) {
    super(config);
  }

  @Get(":targetResRef/source")
  @HttpCode(200)
  @ApiOperation({ summary: "Read one exact committed NSS source revision." })
  @ApiParam({ name: "moduleId" })
  @ApiParam({ name: "targetResRef" })
  @ApiResponse({ status: 200, description: "Lossless UTF-8 source snapshot." })
  @ApiResponse({ status: 404, description: "Committed NSS source not found." })
  @ApiResponse({ status: 412, description: "Committed module revision changed." })
  @ApiResponse({ status: 422, description: "Source query or source encoding is invalid." })
  @ApiResponse({ status: 503, description: "Committed snapshot unavailable." })
  async readSource(
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: FastifyReply,
    @Param("moduleId") moduleId: string,
    @Param("targetResRef") targetResRef: string,
    @Query("expectedModuleRevision") expectedModuleRevision: string,
  ) {
    const result = await this.scripts.readSource({
      moduleId,
      targetResRef,
      expectedModuleRevision,
      actorId: request.auth?.user.id ?? "",
    });
    response.header("ETag", `"${result.moduleRevision}"`);
    response.header("Cache-Control", "no-store");
    return this.success(request, result);
  }

  @Post(":targetResRef/validate")
  @HttpCode(200)
  @ApiOperation({ summary: "Validate exact NSS source without mutating the module." })
  @ApiParam({ name: "moduleId" })
  @ApiParam({ name: "targetResRef" })
  @ApiResponse({ status: 200, description: "Byte-free compiler validation result." })
  @ApiResponse({ status: 403, description: "Script validation permission denied." })
  @ApiResponse({ status: 412, description: "Committed module revision changed." })
  @ApiResponse({ status: 422, description: "Source or include contract is invalid." })
  @ApiResponse({ status: 503, description: "Compiler or committed snapshot unavailable." })
  async validate(
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: FastifyReply,
    @Param("moduleId") moduleId: string,
    @Param("targetResRef") targetResRef: string,
    @Body() body: unknown,
  ) {
    const result = await this.scripts.validate({
      moduleId,
      targetResRef,
      actorId: request.auth?.user.id ?? "",
      body,
    });
    response.header("ETag", `"${result.moduleRevision}"`);
    response.header("Cache-Control", "no-store");
    return this.success(request, result);
  }

  @Put(":targetResRef")
  @HttpCode(200)
  @ApiOperation({ summary: "Compile and atomically publish exact NSS/NCS/NDB resources." })
  @ApiParam({ name: "moduleId" })
  @ApiParam({ name: "targetResRef" })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiHeader({ name: "If-Match", required: true })
  @ApiResponse({ status: 200, description: "Verified immutable publication receipt." })
  @ApiResponse({ status: 409, description: "Idempotency conflict." })
  @ApiResponse({ status: 412, description: "Module revision changed." })
  @ApiResponse({ status: 422, description: "Source, include, or compilation rejected." })
  @ApiResponse({ status: 503, description: "Compiler, lock, or storage unavailable." })
  async publish(
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: FastifyReply,
    @Param("moduleId") moduleId: string,
    @Param("targetResRef") targetResRef: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Headers("if-match") ifMatchHeader: string | undefined,
    @Body() body: unknown,
  ) {
    const result = await this.scripts.publish({
      moduleId,
      targetResRef,
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
