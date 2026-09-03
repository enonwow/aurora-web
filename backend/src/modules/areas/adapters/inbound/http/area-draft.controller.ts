import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Post, Put, Query, Req, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { ProcessingHttpBaseController } from "../../../../../common/http/processing-http.base-controller";
import type { AppRequest } from "../../../../../common/http/request.types";
import { Permissions } from "../../../../auth/adapters/inbound/http/permissions.decorator";
import { Roles } from "../../../../auth/adapters/inbound/http/roles.decorator";
import { AreaDraftApplicationService } from "../../../application/area-draft.application.service";
import { areaCreateActorId } from "../../../application/area-create.application.service";

@Controller("area-drafts")
@ApiTags("area-drafts")
@ApiBearerAuth("bearer")
@Roles("builder", "dm", "admin")
export class AreaDraftController extends ProcessingHttpBaseController {
  constructor(private readonly areaDrafts: AreaDraftApplicationService, config: AppConfigService) { super(config); }

  @Get()
  @Permissions("area.draft.read")
  @ApiOperation({ summary: "List owner-scoped local Area drafts." })
  async list(@Req() request: AppRequest, @Query() query: unknown) {
    return this.success(request, await this.areaDrafts.list(areaCreateActorId(request), query));
  }

  @Get(":draftId")
  @Permissions("area.draft.read")
  @ApiOperation({ summary: "Open one exact local Area draft revision." })
  async open(@Req() request: AppRequest, @Res({ passthrough: true }) response: FastifyReply, @Param("draftId") draftId: string, @Query() query: unknown) {
    const snapshot = await this.areaDrafts.open(areaCreateActorId(request), draftId, query);
    setDraftHeaders(response, snapshot.revision);
    return this.success(request, snapshot);
  }

  @Put(":draftId")
  @Permissions("area.draft.update")
  @ApiOperation({ summary: "Create or CAS-update an owner-scoped local Area draft." })
  async save(@Req() request: AppRequest, @Res({ passthrough: true }) response: FastifyReply, @Param("draftId") draftId: string, @Headers("idempotency-key") idempotencyKey: string | undefined, @Headers("if-match") ifMatchHeader: string | undefined, @Body() body: unknown) {
    const result = await this.areaDrafts.save({ actorId: areaCreateActorId(request), draftId, idempotencyKey, ifMatchHeader, body });
    setDraftHeaders(response, result.snapshot.revision);
    return this.success(request, result);
  }

  @Delete(":draftId")
  @HttpCode(200)
  @Permissions("area.draft.delete")
  @ApiOperation({ summary: "CAS-delete an owner-scoped local Area draft." })
  async delete(@Req() request: AppRequest, @Res({ passthrough: true }) response: FastifyReply, @Param("draftId") draftId: string, @Headers("idempotency-key") idempotencyKey: string | undefined, @Headers("if-match") ifMatchHeader: string | undefined) {
    const result = await this.areaDrafts.delete({ actorId: areaCreateActorId(request), draftId, idempotencyKey, ifMatchHeader });
    setDraftHeaders(response, result.result.deletedRevision);
    return this.success(request, result);
  }
}

@Controller("areas/production")
@ApiTags("area-drafts")
@ApiBearerAuth("bearer")
@Roles("builder", "dm", "admin")
export class ProductionAreaDraftController extends ProcessingHttpBaseController {
  constructor(private readonly areaDrafts: AreaDraftApplicationService, config: AppConfigService) {
    super(config);
  }

  @Post(":areaId/open-as-draft")
  @HttpCode(201)
  @Permissions("scene.read", "area.draft.update")
  @ApiOperation({ summary: "Copy one production Area into an owner-scoped local draft." })
  async openAsDraft(
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: FastifyReply,
    @Param("areaId") areaId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: unknown,
  ) {
    const result = await this.areaDrafts.openProductionAsDraft({
      actorId: areaCreateActorId(request),
      areaId,
      idempotencyKey,
      body,
    });
    setDraftHeaders(response, result.snapshot.revision);
    return this.success(request, result);
  }
}

function setDraftHeaders(response: FastifyReply, revision: number): void {
  response.header("ETag", `"${revision}"`);
  response.header("Cache-Control", "no-store");
}
