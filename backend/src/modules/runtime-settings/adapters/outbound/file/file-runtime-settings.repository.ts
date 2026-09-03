import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import {
  buildDefaultRuntimeSettings
} from "../../../domain/runtime-settings.defaults";
import {
  runtimeSettingsRecordSchema
} from "../../../domain/runtime-settings.schema";
import type {
  RuntimeSettingsRecord
} from "../../../domain/runtime-settings.types";
import type {
  RuntimeSettingsRepositoryPort
} from "../../../application/ports/runtime-settings-repository.port";

@Injectable()
export class FileRuntimeSettingsRepository implements RuntimeSettingsRepositoryPort {
  private cached: RuntimeSettingsRecord | null = null;
  private cachedMtimeMs = -1;

  constructor(private readonly config: AppConfigService) {}

  async get(): Promise<RuntimeSettingsRecord> {
    const path = this.resolveSettingsFilePath();
    const metadata = await stat(path).catch(() => null);
    if (this.cached && metadata?.mtimeMs === this.cachedMtimeMs) {
      return structuredClone(this.cached);
    }

    const loaded = await this.readOrCreate(path);
    this.cached = loaded;
    this.cachedMtimeMs = (await stat(path)).mtimeMs;
    return structuredClone(loaded);
  }

  async save(settings: RuntimeSettingsRecord): Promise<void> {
    const path = this.resolveSettingsFilePath();
    await mkdir(dirname(path), { recursive: true });
    const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await writeFile(
        temporaryPath,
        `${JSON.stringify(settings, null, 2)}\n`,
        "utf-8"
      );
      await rename(temporaryPath, path);
    } catch (error) {
      await rm(temporaryPath, { force: true }).catch(() => undefined);
      throw error;
    }
    this.cached = structuredClone(settings);
    this.cachedMtimeMs = (await stat(path)).mtimeMs;
  }

  private resolveSettingsFilePath(): string {
    const configured = this.config.runtimeSettingsFile;
    if (isAbsolute(configured)) {
      return configured;
    }
    return resolve(process.cwd(), configured);
  }

  private async readOrCreate(path: string): Promise<RuntimeSettingsRecord> {
    const fallback = buildDefaultRuntimeSettings();

    try {
      const raw = await readFile(path, "utf-8");
      const parsedJson = JSON.parse(raw);
      const parsed = runtimeSettingsRecordSchema.safeParse(parsedJson);
      if (parsed.success) {
        return parsed.data;
      }
    } catch (error) {
      if (!isMissingFileError(error)) {
        // Ignore parse/read errors and recover with defaults.
      }
    }

    await this.save(fallback);
    return fallback;
  }
}

function isMissingFileError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  return "code" in error && (error as { code?: string }).code === "ENOENT";
}
