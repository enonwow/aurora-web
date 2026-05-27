import type { RuntimeSettingsRecord } from "../../domain/runtime-settings.types";

export const RUNTIME_SETTINGS_REPOSITORY = Symbol("RUNTIME_SETTINGS_REPOSITORY");

export interface RuntimeSettingsRepositoryPort {
  get(): Promise<RuntimeSettingsRecord>;
  save(settings: RuntimeSettingsRecord): Promise<void>;
}
