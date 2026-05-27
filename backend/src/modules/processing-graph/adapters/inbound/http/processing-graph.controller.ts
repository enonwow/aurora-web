import { Controller, Get, HttpCode, Param, Post, Query, Req } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import { buildSuccessEnvelope } from "../../../../../common/http/contract";
import type { AppRequest } from "../../../../../common/http/request.types";
import { Permissions } from "../../../../auth/adapters/inbound/http/permissions.decorator";
import { Roles } from "../../../../auth/adapters/inbound/http/roles.decorator";
import { ProcessingDeltaRebuildApplicationService } from "../../../application/processing-delta-rebuild.application.service";
import { ProcessingGraphApplicationService } from "../../../application/processing-graph.application.service";
import {
  parseAreaSubgraphParams,
  parseDeltaJobListQuery,
  parseDeltaJobParams
} from "./processing-graph.schemas";

@Controller("processing/graphs")
@ApiTags("processing-graph")
@ApiBearerAuth("bearer")
@Roles("admin", "builder", "dm")
@Permissions("scene.read")
export class ProcessingGraphController {
  constructor(
    private readonly service: ProcessingGraphApplicationService,
    private readonly deltaRebuildService: ProcessingDeltaRebuildApplicationService,
    private readonly config: AppConfigService
  ) {}

  @Get("summary")
  @ApiOperation({
    summary:
      "Get internal resource+scene graph summary used by backend processing pipeline."
  })
  @ApiResponse({ status: 200, description: "Graph summary payload." })
  @ApiResponse({ status: 401, description: "Missing or invalid session." })
  @ApiResponse({ status: 403, description: "Forbidden for role/permission." })
  async getSummary(@Req() request: AppRequest) {
    const data = await this.service.getGraphSummary();
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("delta/preview")
  @ApiOperation({
    summary:
      "Preview delta between latest checkpointed graph snapshot and current graph state."
  })
  @ApiResponse({ status: 200, description: "Graph delta preview payload." })
  @ApiResponse({ status: 401, description: "Missing or invalid session." })
  @ApiResponse({ status: 403, description: "Forbidden for role/permission." })
  async previewDelta(@Req() request: AppRequest) {
    const data = await this.service.previewDeltaAgainstLatest();
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Post("delta/checkpoint")
  @HttpCode(200)
  @Roles("admin", "builder")
  @Permissions("processing.placeable.run")
  @ApiOperation({
    summary:
      "Compute graph delta and update latest snapshot checkpoint used for incremental processing."
  })
  @ApiResponse({ status: 200, description: "Graph checkpoint result payload." })
  @ApiResponse({ status: 401, description: "Missing or invalid session." })
  @ApiResponse({ status: 403, description: "Forbidden for role/permission." })
  async checkpointDelta(@Req() request: AppRequest) {
    const data = await this.service.checkpointLatestSnapshot(
      request.auth!.user.username
    );
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Post("delta/rebuild")
  @HttpCode(200)
  @Roles("admin", "builder")
  @Permissions("processing.placeable.run")
  @ApiOperation({
    summary:
      "Run selective rebuild job from current graph delta (only impacted targets are processed)."
  })
  @ApiResponse({ status: 200, description: "Delta rebuild job result payload." })
  @ApiResponse({ status: 401, description: "Missing or invalid session." })
  @ApiResponse({ status: 403, description: "Forbidden for role/permission." })
  async runDeltaRebuild(@Req() request: AppRequest) {
    const data = await this.deltaRebuildService.startDeltaRebuild(
      request.auth!.user.username
    );
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("delta/jobs")
  @ApiOperation({
    summary:
      "List recent selective rebuild jobs for delta processing pipeline."
  })
  @ApiResponse({ status: 200, description: "Delta rebuild jobs list payload." })
  @ApiResponse({ status: 401, description: "Missing or invalid session." })
  @ApiResponse({ status: 403, description: "Forbidden for role/permission." })
  async listDeltaJobs(
    @Req() request: AppRequest,
    @Query() query: Record<string, unknown>
  ) {
    const parsed = parseDeltaJobListQuery(query);
    const data = this.deltaRebuildService.listJobs(parsed.limit);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("delta/jobs/:jobId")
  @ApiOperation({
    summary:
      "Get status/details of a single selective rebuild job."
  })
  @ApiParam({ name: "jobId" })
  @ApiResponse({ status: 200, description: "Delta rebuild job payload." })
  @ApiResponse({ status: 404, description: "Delta rebuild job not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async getDeltaJob(
    @Req() request: AppRequest,
    @Param() params: Record<string, unknown>
  ) {
    const parsed = parseDeltaJobParams(params);
    const data = this.deltaRebuildService.getJob(parsed.jobId);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }

  @Get("areas/:areaId")
  @ApiOperation({
    summary:
      "Get internal subgraph for a selected area (area node, object nodes and referenced resources)."
  })
  @ApiParam({ name: "areaId" })
  @ApiResponse({ status: 200, description: "Area subgraph payload." })
  @ApiResponse({ status: 404, description: "Area not found." })
  @ApiResponse({ status: 422, description: "Validation failed." })
  async getAreaSubgraph(
    @Req() request: AppRequest,
    @Param() params: Record<string, unknown>
  ) {
    const parsed = parseAreaSubgraphParams(params);
    const data = await this.service.getAreaSubgraph(parsed.areaId);
    return buildSuccessEnvelope(this.config.contractVersion, request, data);
  }
}
