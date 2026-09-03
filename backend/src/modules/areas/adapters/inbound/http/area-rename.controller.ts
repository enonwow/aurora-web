import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
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
import {
  AREA_RENAME_HTTP_APPLICATION,
  AREA_RENAME_PREVIEW_HTTP_APPLICATION,
  type AreaRenameHttpApplicationPort,
  type AreaRenamePreviewHttpApplicationPort,
} from "../../../application/ports/area-rename-http.port";

@Controller("modules/:moduleId")
@ApiTags("area-rename")
@ApiBearerAuth("bearer")
@Roles("admin")
@Permissions("area.materialize.rename")
export class ModuleAreaRenamePreviewController extends ProcessingHttpBaseController {
  constructor(
    @Inject(AREA_RENAME_PREVIEW_HTTP_APPLICATION)
    private readonly areaRename: AreaRenamePreviewHttpApplicationPort,
    config: AppConfigService,
  ) {
    super(config);
  }

  @Post("areas/:areaResRef/rename-previews")
  @HttpCode(200)
  @ApiOperation({ summary: "Preview fail-closed static impact before renaming an Area ResRef." })
  @ApiParam({ name: "moduleId" })
  @ApiParam({ name: "areaResRef" })
  @ApiHeader({ name: "If-Match", required: true })
  @ApiResponse({ status: 200, description: "Deterministic Area rename impact preview." })
  async preview(
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: FastifyReply,
    @Param("moduleId") moduleId: string,
    @Param("areaResRef") areaResRef: string,
    @Headers("if-match") ifMatchHeader: string | undefined,
    @Body() body: unknown,
  ) {
    const data = await this.areaRename.preview({
      actorId: request.auth?.user.id ?? "",
      moduleId,
      areaResRef,
      ifMatchHeader,
      body,
    });
    response.header("ETag", `"${data.moduleRevision}"`);
    response.header("Cache-Control", "no-store");
    return this.success(request, data);
  }
}

@Controller("modules/:moduleId")
@ApiTags("area-rename")
@ApiBearerAuth("bearer")
@Roles("admin")
@Permissions("area.materialize.rename")
export class ModuleAreaRenameController extends ProcessingHttpBaseController {
  constructor(
    @Inject(AREA_RENAME_HTTP_APPLICATION)
    private readonly areaRename: AreaRenameHttpApplicationPort,
    config: AppConfigService,
  ) {
    super(config);
  }

  @Post("areas/:areaResRef/renames")
  @HttpCode(200)
  @ApiOperation({ summary: "Atomically rename one Area resource triplet and module identity." })
  @ApiParam({ name: "moduleId" })
  @ApiParam({ name: "areaResRef" })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiHeader({ name: "If-Match", required: true })
  @ApiResponse({ status: 200, description: "Verified immutable Area rename receipt." })
  async rename(
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: FastifyReply,
    @Param("moduleId") moduleId: string,
    @Param("areaResRef") areaResRef: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Headers("if-match") ifMatchHeader: string | undefined,
    @Body() body: unknown,
  ) {
    const result = await this.areaRename.rename({
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
