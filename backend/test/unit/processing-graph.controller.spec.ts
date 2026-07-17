import type { AppConfigService } from "../../src/common/config/app-config.service";
import { ProcessingDeltaRebuildApplicationService } from "../../src/modules/processing-graph/application/processing-delta-rebuild.application.service";
import { ProcessingGraphApplicationService } from "../../src/modules/processing-graph/application/processing-graph.application.service";
import { ProcessingGraphController } from "../../src/modules/processing-graph/adapters/inbound/http/processing-graph.controller";

describe("ProcessingGraphController", () => {
  let graphService: jest.Mocked<ProcessingGraphApplicationService>;
  let deltaRebuildService: jest.Mocked<ProcessingDeltaRebuildApplicationService>;
  let config: AppConfigService;
  let controller: ProcessingGraphController;

  beforeEach(() => {
    graphService = {
      getGraphSummary: jest.fn(),
      previewDeltaAgainstLatest: jest.fn(),
      checkpointLatestSnapshot: jest.fn(),
      getAreaSubgraph: jest.fn(),
      getGraphSnapshot: jest.fn()
    } as unknown as jest.Mocked<ProcessingGraphApplicationService>;

    deltaRebuildService = {
      startDeltaRebuild: jest.fn(),
      listJobs: jest.fn(),
      getJob: jest.fn()
    } as unknown as jest.Mocked<ProcessingDeltaRebuildApplicationService>;

    config = {
      contractVersion: "1.0.0"
    } as AppConfigService;

    controller = new ProcessingGraphController(
      graphService,
      deltaRebuildService,
      config
    );
  });

  it("returns graph summary envelope", async () => {
    graphService.getGraphSummary.mockResolvedValue({ datasetHash: "abc" } as never);

    const response = await controller.getSummary(requestWithUser("builder.user"));

    expect(graphService.getGraphSummary).toHaveBeenCalledTimes(1);
    expect(response).toEqual({
      contractVersion: "1.0.0",
      requestId: "req-test",
      data: { datasetHash: "abc" }
    });
  });

  it("returns delta preview envelope", async () => {
    deltaRebuildService.listJobs.mockReturnValue([]);
    graphService.previewDeltaAgainstLatest.mockResolvedValue({ changed: false } as never);

    const response = await controller.previewDelta(requestWithUser("builder.user"));

    expect(graphService.previewDeltaAgainstLatest).toHaveBeenCalledTimes(1);
    expect(response.data).toEqual({ changed: false });
  });

  it("runs checkpoint with username from auth context", async () => {
    graphService.checkpointLatestSnapshot.mockResolvedValue({
      checkpointUpdated: false
    } as never);

    const response = await controller.checkpointDelta(requestWithUser("builder.user"));

    expect(graphService.checkpointLatestSnapshot).toHaveBeenCalledWith(
      "builder.user"
    );
    expect(response.data).toEqual({ checkpointUpdated: false });
  });

  it("runs delta rebuild with username from auth context", async () => {
    deltaRebuildService.startDeltaRebuild.mockResolvedValue({
      jobId: "a91f4dd1-d460-4e67-996a-d8b2f36b57c9",
      status: "completed"
    } as never);

    const response = await controller.runDeltaRebuild(
      requestWithUser("builder.user")
    );

    expect(deltaRebuildService.startDeltaRebuild).toHaveBeenCalledWith(
      "builder.user"
    );
    expect(response.data).toEqual({
      jobId: "a91f4dd1-d460-4e67-996a-d8b2f36b57c9",
      status: "completed"
    });
  });

  it("lists delta jobs with parsed query limit", async () => {
    deltaRebuildService.listJobs.mockReturnValue([{ jobId: "job-1" }] as never);

    const response = await controller.listDeltaJobs(
      requestWithUser("builder.user"),
      { limit: "11" }
    );

    expect(deltaRebuildService.listJobs).toHaveBeenCalledWith(11);
    expect(response.data).toEqual([{ jobId: "job-1" }]);
  });

  it("uses default limit when query limit is missing", async () => {
    deltaRebuildService.listJobs.mockReturnValue([]);

    await controller.listDeltaJobs(requestWithUser("builder.user"), {});

    expect(deltaRebuildService.listJobs).toHaveBeenCalledWith(20);
  });

  it("returns selected delta job", async () => {
    const jobId = "f41f76df-a83f-4e19-ba71-2b5061d9c6a0";
    deltaRebuildService.getJob.mockReturnValue({ jobId, status: "completed" } as never);

    const response = await controller.getDeltaJob(requestWithUser("builder.user"), {
      jobId
    });

    expect(deltaRebuildService.getJob).toHaveBeenCalledWith(jobId);
    expect(response.data).toEqual({ jobId, status: "completed" });
  });

  it("rejects invalid delta job id in params", async () => {
    await expect(
      controller.getDeltaJob(requestWithUser("builder.user"), { jobId: "bad" })
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED"
    });
  });

  it("returns area subgraph for parsed area id", async () => {
    graphService.getAreaSubgraph.mockResolvedValue({
      areaId: "area_market_district_001"
    } as never);

    const response = await controller.getAreaSubgraph(
      requestWithUser("dm.user"),
      { areaId: "area_market_district_001" }
    );

    expect(graphService.getAreaSubgraph).toHaveBeenCalledWith(
      "area_market_district_001"
    );
    expect(response.data).toEqual({ areaId: "area_market_district_001" });
  });
});

function requestWithUser(username: string) {
  return {
    requestId: "req-test",
    auth: {
      user: {
        username
      }
    }
  } as never;
}
