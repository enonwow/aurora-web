import { Injectable } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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

  constructor(private readonly config: AppConfigService) {}

  async get(): Promise<RuntimeSettingsRecord> {
    if (this.cached) {
      return structuredClone(this.cached);
    }

    const path = this.resolveSettingsFilePath();
    const loaded = await this.readOrCreate(path);
    this.cached = loaded;
    return structuredClone(loaded);
  }

  async save(settings: RuntimeSettingsRecord): Promise<void> {
    const path = this.resolveSettingsFilePath();
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(settings, null, 2)}\n`, "utf-8");
    this.cached = structuredClone(settings);
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
