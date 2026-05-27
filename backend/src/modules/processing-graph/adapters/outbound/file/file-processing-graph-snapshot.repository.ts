import { Injectable } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import type { ProcessingGraphSnapshotRepositoryPort } from "../../../application/ports/processing-graph-snapshot-repository.port";
import type { ProcessingGraphSnapshot } from "../../../domain/processing-graph.types";

@Injectable()
export class FileProcessingGraphSnapshotRepository
  implements ProcessingGraphSnapshotRepositoryPort
{
  private cached: ProcessingGraphSnapshot | null | undefined = undefined;

  constructor(private readonly config: AppConfigService) {}

  async getLatest(): Promise<ProcessingGraphSnapshot | null> {
    if (this.cached !== undefined) {
      return this.cached ? structuredClone(this.cached) : null;
    }

    const path = this.resolveSnapshotFilePath();
    try {
      const raw = await readFile(path, "utf-8");
      const parsed = JSON.parse(raw) as unknown;
      const snapshot = coerceSnapshot(parsed);
      if (snapshot) {
        this.cached = snapshot;
        return structuredClone(snapshot);
      }
    } catch (error) {
      if (!isMissingFileError(error)) {
        // Ignore malformed file and treat it as missing checkpoint.
      }
    }

    this.cached = null;
    return null;
  }

  async saveLatest(snapshot: ProcessingGraphSnapshot): Promise<void> {
    const path = this.resolveSnapshotFilePath();
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(snapshot, null, 2)}\n`, "utf-8");
    this.cached = structuredClone(snapshot);
  }

  private resolveSnapshotFilePath(): string {
    const configured = this.config.processingGraphSnapshotFile;
    if (isAbsolute(configured)) {
      return configured;
    }
    return resolve(process.cwd(), configured);
  }
}

function coerceSnapshot(value: unknown): ProcessingGraphSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const typed = value as Partial<ProcessingGraphSnapshot>;
  if (
    typeof typed.generatedAt !== "string" ||
    typeof typed.datasetHash !== "string" ||
    !typed.statistics ||
    !typed.resourceGraph ||
    !typed.sceneGraph ||
    !typed.indexes
  ) {
    return null;
  }

  return typed as ProcessingGraphSnapshot;
}

function isMissingFileError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  return "code" in error && (error as { code?: string }).code === "ENOENT";
}
