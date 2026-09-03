import { Body, Controller, Get, HttpCode, Param, Post, Req, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { AppException } from "../../../../../common/http/app-exception";
import {
  applyBinaryPayloadHeaders,
  setInlineContentDisposition
} from "../../../../../common/http/binary-response";
import { ProcessingHttpBaseController } from "../../../../../common/http/processing-http.base-controller";
import type { AppRequest } from "../../../../../common/http/request.types";
import { Permissions } from "../../../../auth/adapters/inbound/http/permissions.decorator";
import { Roles } from "../../../../auth/adapters/inbound/http/roles.decorator";
import { ALL_ROLES } from "../../../../auth/domain/auth.types";
import { AreaEditingApplicationService } from "../../../application/area-editing.application.service";
import { parseAreaEditingExportDraft } from "./area-editing.schemas";

@Controller("areas/editing")
@ApiTags("areas-editing")
@ApiBearerAuth("bearer")
@Roles(...ALL_ROLES)
@Permissions("scene.read")
export class AreaEditingController extends ProcessingHttpBaseController {
  constructor(private readonly service: AreaEditingApplicationService, config: AppConfigService) {
    super(config);
  }

  @Get("tilesets")
  @ApiOperation({ summary: "List SET sources available to the Area editor." })
  async listTilesets(@Req() request: AppRequest) {
    return this.success(request, await this.service.listTilesets());
  }

  @Get("tilesets/:tilesetResRef")
  @ApiOperation({ summary: "Get a typed Aurora SET editing definition." })
  @ApiParam({ name: "tilesetResRef" })
  @ApiResponse({ status: 404, description: "SET source not found." })
  async getTileset(
    @Req() request: AppRequest,
    @Param("tilesetResRef") tilesetResRef: string
  ) {
    return this.success(request, await this.service.getTilesetDefinition(tilesetResRef));
  }

  @Get("source/:areaId")
  @ApiOperation({ summary: "Get Area data together with its immutable SET editing source." })
  @ApiParam({ name: "areaId" })
  async getAreaSource(@Req() request: AppRequest, @Param("areaId") areaId: string) {
    return this.success(request, await this.service.getAreaEditingSource(areaId));
  }

  @Post("verify")
  @HttpCode(200)
  @Roles("builder", "dm", "admin")
  @ApiOperation({ summary: "Verify an Area editing draft and return Toolset-style diagnostics and stats." })
  async verifyArea(@Req() request: AppRequest, @Body() body: Record<string, unknown>) {
    return this.success(
      request,
      await this.service.verifyArea(parseAreaEditingExportDraft(body))
    );
  }

  @Post("persist/new-area")
  @HttpCode(201)
  @Roles("builder", "dm", "admin")
  @Permissions("scene.edit")
  @ApiOperation({ summary: "Persist a validated new ARE/GIT/GIC resource triplet in the module snapshot." })
  @ApiResponse({ status: 422, description: "The generated Area candidate does not match an admitted native profile." })
  @ApiResponse({ status: 409, description: "An Area resource already exists for this ResRef." })
  @ApiResponse({ status: 501, description: "The configured snapshot storage is read-only." })
  async persistNewArea(@Req() request: AppRequest, @Body() body: Record<string, unknown>) {
    void request;
    void body;
    throw new AppException({
      status: 410,
      code: "AREA_CREATE_LEGACY_ROUTE_DISABLED",
      message:
        "Legacy sequential Area persistence is disabled. Use POST /api/v1/modules/{moduleId}/areas with Idempotency-Key and If-Match.",
    });
  }

  @Post("export/area.are")
  @HttpCode(200)
  @Roles("builder", "dm", "admin")
  @Permissions("scene.read")
  @ApiOperation({ summary: "Export a validated local Area editing draft as a native ARE GFF." })
  @ApiResponse({ status: 409, description: "Tileset changed since the draft was opened." })
  async exportAre(@Body() body: Record<string, unknown>, @Res() response: FastifyReply) {
    const data = await this.service.exportAre(parseAreaEditingExportDraft(body));
    applyBinaryPayloadHeaders(response, data, {
      cacheControl: "private, max-age=0",
      extraHeaders: {
        "X-Aurora-Area-Tile-Count": String(data.tileCount),
        "X-Aurora-Tileset-Fingerprint": data.tilesetFingerprint
      }
    });
    setInlineContentDisposition(response, data.fileName);
    return response.send(data.bytes);
  }
}
