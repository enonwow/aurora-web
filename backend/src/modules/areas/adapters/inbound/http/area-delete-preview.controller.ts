import { Body, Controller, HttpCode, Param, Post, Req, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { ProcessingHttpBaseController } from "../../../../../common/http/processing-http.base-controller";
import type { AppRequest } from "../../../../../common/http/request.types";
import { Permissions } from "../../../../auth/adapters/inbound/http/permissions.decorator";
import { Roles } from "../../../../auth/adapters/inbound/http/roles.decorator";
import { AreaDeletePreviewApplicationService } from "../../../application/area-delete-preview.application.service";

@Controller("modules/:moduleId")
@ApiTags("area-delete")
@ApiBearerAuth("bearer")
@Roles("admin")
@Permissions("area.materialize.delete")
export class ModuleAreaDeletePreviewController extends ProcessingHttpBaseController {
  constructor(
    private readonly areaDelete: AreaDeletePreviewApplicationService,
    config: AppConfigService,
  ) {
    super(config);
  }

  @Post("areas/:areaResRef/delete-previews")
  @HttpCode(200)
  @ApiOperation({ summary: "Preview fail-closed inbound impact before deleting an Area." })
  @ApiParam({ name: "moduleId" })
  @ApiParam({ name: "areaResRef" })
  @ApiResponse({ status: 200, description: "Deterministic Area Delete impact preview." })
  @ApiResponse({ status: 403, description: "Privileged module-delete permission denied." })
  @ApiResponse({ status: 412, description: "Module revision changed." })
  async preview(
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: FastifyReply,
    @Param("moduleId") moduleId: string,
    @Param("areaResRef") areaResRef: string,
    @Body() body: unknown,
  ) {
    const rawIfMatch = request.headers?.["if-match"];
    const data = await this.areaDelete.preview({
      actorId: request.auth?.user.id ?? "",
      moduleId,
      areaResRef,
      ifMatchHeader: typeof rawIfMatch === "string" ? rawIfMatch : undefined,
      body,
    });
    response.header("ETag", `"${data.moduleRevision}"`);
    response.header("Cache-Control", "no-store");
    return this.success(request, data);
  }
}
