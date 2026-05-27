import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { RuntimeSettingsApplicationService } from "./runtime-settings.application.service";

@Injectable()
export class RuntimeSettingsBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RuntimeSettingsBootstrapService.name);

  constructor(private readonly settingsService: RuntimeSettingsApplicationService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (isBootstrapSyncDisabled()) {
      this.logger.log(
        "Module cache bootstrap sync is disabled for current environment."
      );
      return;
    }

    const result = await this.settingsService.syncModuleBlobCache("system.bootstrap", {
      forceFull: false
    });
    if (result.sync.status === "noop") {
      this.logger.log(
        `Module cache is up to date (${result.source.type} source, hash ${result.sync.moduleHash}).`
      );
      return;
    }

    this.logger.log(
      [
        `Module cache sync updated (${result.mode}, ${result.source.type}).`,
        `uploaded=${result.sync.uploadedFiles}`,
        `deleted=${result.sync.deletedFiles}`,
        `unchanged=${result.sync.unchangedFiles}`,
        `hash=${result.sync.moduleHash}`
      ].join(" ")
    );
  }
}

function isBootstrapSyncDisabled(): boolean {
  const raw = process.env.RUNTIME_SETTINGS_BOOTSTRAP_SYNC?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "off") {
    return true;
  }
  return process.env.NODE_ENV === "test";
}
