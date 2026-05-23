import { Inject, Injectable } from "@nestjs/common";
import { isAbsolute, resolve } from "node:path";
import type {
  RuntimeAssetKind,
  RuntimeSourceSettings,
  RuntimeSettingsPayload,
  RuntimeSettingsRecord
} from "../domain/runtime-settings.types";
import {
  RUNTIME_SETTINGS_REPOSITORY,
  type RuntimeSettingsRepositoryPort
} from "./ports/runtime-settings-repository.port";

const RUNTIME_ASSET_KINDS = ["placeable", "tile", "area", "sound"] as const;

export interface ResolvedHakSourceSettings {
  mode: "disabled" | "inline" | "profile" | "none";
  includeHaks: boolean;
  hakProfileId: string | null;
  hakPriorityList: string[];
  hakPaths: string[];
}

export type ResolvedHakSettingsByAsset = Record<
  RuntimeAssetKind,
  ResolvedHakSourceSettings
>;

@Injectable()
export class RuntimeSettingsApplicationService {
  constructor(
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly repository: RuntimeSettingsRepositoryPort
  ) {}

  async getRuntimeSettings(): Promise<RuntimeSettingsRecord> {
    return this.repository.get();
  }

  async getResolvedHakSettings(): Promise<ResolvedHakSettingsByAsset> {
    const settings = await this.repository.get();
    return resolveHakSettingsByAsset(settings);
  }

  async replaceRuntimeSettings(
    payload: RuntimeSettingsPayload,
    updatedBy: string
  ): Promise<RuntimeSettingsRecord> {
    const current = await this.repository.get();
    const next: RuntimeSettingsRecord = {
      ...payload,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
      updatedBy
    };
    await this.repository.save(next);
    return next;
  }
}

export function resolveHakSettingsByAsset(
  settings: RuntimeSettingsRecord
): ResolvedHakSettingsByAsset {
  const resolved = {} as ResolvedHakSettingsByAsset;
  for (const assetKind of RUNTIME_ASSET_KINDS) {
    resolved[assetKind] = resolveSingleSourceHakSettings(
      settings.paths.hakDirectoryPath,
      settings.hakProfiles,
      settings.sources[assetKind]
    );
  }

  return resolved;
}

function resolveSingleSourceHakSettings(
  hakDirectoryPath: string,
  hakProfiles: Record<string, string[]>,
  source: RuntimeSourceSettings
): ResolvedHakSourceSettings {
  if (!source.includeHaks) {
    return {
      mode: "disabled",
      includeHaks: false,
      hakProfileId: null,
      hakPriorityList: [],
      hakPaths: []
    };
  }

  if (source.hakPriorityList.length > 0) {
    const list = deduplicateOrdered(source.hakPriorityList);
    return {
      mode: "inline",
      includeHaks: true,
      hakProfileId: source.hakProfileId.trim() || null,
      hakPriorityList: list,
      hakPaths: list.map((hakEntry) => resolveHakPath(hakDirectoryPath, hakEntry))
    };
  }

  const hakProfileId = source.hakProfileId.trim();
  if (hakProfileId.length > 0) {
    const list = deduplicateOrdered(hakProfiles[hakProfileId] ?? []);
    return {
      mode: "profile",
      includeHaks: true,
      hakProfileId,
      hakPriorityList: list,
      hakPaths: list.map((hakEntry) => resolveHakPath(hakDirectoryPath, hakEntry))
    };
  }

  return {
    mode: "none",
    includeHaks: true,
    hakProfileId: null,
    hakPriorityList: [],
    hakPaths: []
  };
}

function deduplicateOrdered(values: string[]): string[] {
  const unique = new Set<string>();
  const ordered: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value || unique.has(value)) {
      continue;
    }
    unique.add(value);
    ordered.push(value);
  }
  return ordered;
}

function resolveHakPath(hakDirectoryPath: string, entry: string): string {
  return isAbsolute(entry) ? entry : resolve(hakDirectoryPath, entry);
}
