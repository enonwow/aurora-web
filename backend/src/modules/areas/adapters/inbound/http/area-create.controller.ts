import {
  Body,
  Controller,
  Get,
  Headers,
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
import {
  AreaCreateApplicationService,
  areaCreateActorId,
} from "../../../application/area-create.application.service";

@Controller("area-creation")
@ApiTags("area-creation")
@ApiBearerAuth("bearer")
@Roles("builder", "dm", "admin")
@Permissions("area.create")
export class AreaCreationProfilesController extends ProcessingHttpBaseController {
  constructor(
    private readonly areaCreate: AreaCreateApplicationService,
    config: AppConfigService,
  ) {
    super(config);
  }

  @Get("profiles")
  @ApiOperation({ summary: "List immutable Area creation profiles admitted for this workspace." })
  @ApiResponse({ status: 200, description: "Admitted profile list and captured module revision." })
  async profiles(
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const data = await this.areaCreate.getProfiles(areaCreateActorId(request));
    setRevisionResponseHeaders(response, data.moduleRevision);
    return this.success(request, data);
  }
}

@Controller("modules/:moduleId")
@ApiTags("area-creation")
@ApiBearerAuth("bearer")
@Roles("builder", "dm", "admin")
@Permissions("area.create")
export class ModuleAreaCreateController extends ProcessingHttpBaseController {
  constructor(
    private readonly areaCreate: AreaCreateApplicationService,
    config: AppConfigService,
  ) {
    super(config);
  }

  @Post("area-creation-validations")
  @HttpCode(200)
  @ApiOperation({ summary: "Compile and independently validate an Area candidate without publishing it." })
  @ApiParam({ name: "moduleId" })
  @ApiResponse({ status: 200, description: "Short-lived validation receipt." })
  async validate(
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: FastifyReply,
    @Param("moduleId") moduleId: string,
    @Body() body: unknown,
  ) {
    const data = await this.areaCreate.validate(
      moduleId,
      areaCreateActorId(request),
      body,
    );
    setRevisionResponseHeaders(response, data.moduleRevision);
    return this.success(request, data);
  }

  @Post("areas")
  @HttpCode(201)
  @ApiOperation({ summary: "Atomically create one Area and return only after independent readback." })
  @ApiParam({ name: "moduleId" })
  @ApiResponse({ status: 201, description: "Verified Area Create receipt." })
  @ApiResponse({ status: 409, description: "Idempotency, profile, SET, or resource conflict." })
  @ApiResponse({ status: 412, description: "Module revision precondition failed." })
  @ApiResponse({ status: 422, description: "Strict command or candidate validation failed." })
  async create(
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: FastifyReply,
    @Param("moduleId") moduleId: string,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Headers("if-match") ifMatchHeader: string | undefined,
    @Body() body: unknown,
  ) {
    const data = await this.areaCreate.create({
      moduleId,
      actorId: areaCreateActorId(request),
      idempotencyKey,
      ifMatchHeader,
      body,
    });
    setRevisionResponseHeaders(response, data.receipt.newModuleRevision);
    return this.success(request, data);
  }
}

function setRevisionResponseHeaders(response: FastifyReply, revision: string): void {
  response.header("ETag", `"${revision}"`);
  response.header("Cache-Control", "no-store");
}
