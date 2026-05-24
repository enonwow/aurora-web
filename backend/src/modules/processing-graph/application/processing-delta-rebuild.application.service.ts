import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AppException } from "../../../common/http/app-exception";
import { CatalogApplicationService } from "../../catalog/application/catalog.application.service";
import type {
  ProcessingDeltaActionType,
  ProcessingDeltaRebuildAction,
  ProcessingDeltaRebuildJob,
  ProcessingGraphCheckpointResult
} from "../domain/processing-graph.types";
import { ProcessingGraphApplicationService } from "./processing-graph.application.service";

@Injectable()
export class ProcessingDeltaRebuildApplicationService {
  private readonly jobs = new Map<string, ProcessingDeltaRebuildJob>();
  private readonly order: string[] = [];

  constructor(
    private readonly graphService: ProcessingGraphApplicationService,
    private readonly catalogService: CatalogApplicationService
  ) {}

  async startDeltaRebuild(triggeredBy: string): Promise<ProcessingDeltaRebuildJob> {
    const checkpoint = await this.graphService.checkpointLatestSnapshot(triggeredBy);
    const snapshot = await this.graphService.getGraphSnapshot();
    const templateKinds = buildTemplateKindMap(snapshot.resourceGraph.nodes);
    const actions = buildActions(checkpoint, templateKinds);

    const job: ProcessingDeltaRebuildJob = {
      jobId: randomUUID(),
      status: "queued",
      createdAt: new Date().toISOString(),
      triggeredBy,
      delta: {
        baseline: checkpoint.delta.baseline,
        changed: checkpoint.delta.changed,
        summary: checkpoint.delta.summary,
        impacted: checkpoint.delta.impacted,
        previousDatasetHash: checkpoint.delta.previousDatasetHash,
        currentDatasetHash: checkpoint.delta.currentDatasetHash
      },
      actions,
      stats: {
        total: actions.length,
        completed: 0,
        failed: 0,
        skipped: 0
      }
    };

    this.save(job);
    if (!checkpoint.delta.changed || actions.length === 0) {
      job.status = "completed";
      job.startedAt = new Date().toISOString();
      job.finishedAt = new Date().toISOString();
      this.save(job);
      return cloneJob(job);
    }

    job.status = "running";
    job.startedAt = new Date().toISOString();
    this.save(job);

    for (const action of job.actions) {
      await this.executeAction(job, action);
      this.save(job);
    }

    job.finishedAt = new Date().toISOString();
    job.status = job.stats.failed > 0 ? "failed" : "completed";
    this.save(job);
    return cloneJob(job);
  }

  getJob(jobId: string): ProcessingDeltaRebuildJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new AppException({
        status: 404,
        code: "PROCESSING_JOB_NOT_FOUND",
        message: "Processing delta rebuild job was not found."
      });
    }

    return cloneJob(job);
  }

  listJobs(limit = 20): ProcessingDeltaRebuildJob[] {
    const normalizedLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
    const selectedIds = this.order.slice(0, normalizedLimit);
    return selectedIds
      .map((jobId) => this.jobs.get(jobId))
      .filter((job): job is ProcessingDeltaRebuildJob => Boolean(job))
      .map((job) => cloneJob(job));
  }

  private async executeAction(
    job: ProcessingDeltaRebuildJob,
    action: ProcessingDeltaRebuildAction
  ): Promise<void> {
    action.status = "running";
    action.startedAt = new Date().toISOString();

    try {
      if (action.type === "rebuild_placeable_cache") {
        await this.catalogService.processPlaceable({
          templateId: action.targetId,
          bypassCache: true,
          includeBenchmarkMetadata: true
        });
        action.status = "completed";
        action.finishedAt = new Date().toISOString();
        job.stats.completed += 1;
        return;
      }

      action.status = "skipped";
      action.note = "Action type planned, execution will be implemented in next slice.";
      action.finishedAt = new Date().toISOString();
      job.stats.skipped += 1;
    } catch (error) {
      action.status = "failed";
      action.finishedAt = new Date().toISOString();
      action.error = extractError(error);
      job.stats.failed += 1;
    }
  }

  private save(job: ProcessingDeltaRebuildJob): void {
    this.jobs.set(job.jobId, cloneJob(job));
    if (!this.order.includes(job.jobId)) {
      this.order.unshift(job.jobId);
    }
  }
}

function buildTemplateKindMap(
  nodes: Array<{ id: string; kind: string; metadata: Record<string, string | number | boolean | null> }>
): Map<string, "placeable" | "creature" | "item"> {
  const map = new Map<string, "placeable" | "creature" | "item">();
  for (const node of nodes) {
    if (node.kind !== "template") {
      continue;
    }
    const templateId = parseTemplateNodeId(node.id);
    if (!templateId) {
      continue;
    }
    const value = node.metadata.kind;
    if (value === "placeable" || value === "creature" || value === "item") {
      map.set(templateId, value);
    }
  }
  return map;
}

function buildActions(
  checkpoint: ProcessingGraphCheckpointResult,
  templateKinds: Map<string, "placeable" | "creature" | "item">
): ProcessingDeltaRebuildAction[] {
  const actions: ProcessingDeltaRebuildAction[] = [];
  let cursor = 0;

  for (const areaId of checkpoint.delta.impacted.areas) {
    actions.push({
      actionId: `action-${cursor++}`,
      type: "rebuild_area_projection",
      targetId: areaId,
      status: "pending"
    });
  }

  for (const templateId of checkpoint.delta.impacted.templates) {
    const kind = templateKinds.get(templateId);
    const type: ProcessingDeltaActionType =
      kind === "placeable"
        ? "rebuild_placeable_cache"
        : kind === "creature"
          ? "rebuild_creature_projection"
          : "rebuild_item_projection";

    actions.push({
      actionId: `action-${cursor++}`,
      type,
      targetId: templateId,
      status: "pending"
    });
  }

  return actions;
}

function parseTemplateNodeId(nodeId: string): string | null {
  if (!nodeId.startsWith("template:")) {
    return null;
  }
  const value = nodeId.slice("template:".length);
  return value.length > 0 ? value : null;
}

function extractError(error: unknown): { code: string; message: string } {
  if (error instanceof AppException) {
    return {
      code: error.code,
      message: error.message
    };
  }

  if (error instanceof Error) {
    return {
      code: "PROCESSING_ACTION_FAILED",
      message: error.message
    };
  }

  return {
    code: "PROCESSING_ACTION_FAILED",
    message: "Unknown processing action failure."
  };
}

function cloneJob(job: ProcessingDeltaRebuildJob): ProcessingDeltaRebuildJob {
  return structuredClone(job);
}
