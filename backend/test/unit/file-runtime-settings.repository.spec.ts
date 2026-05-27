import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppConfigService } from "../../src/common/config/app-config.service";
import { FileRuntimeSettingsRepository } from "../../src/modules/runtime-settings/adapters/outbound/file/file-runtime-settings.repository";
import { buildDefaultRuntimeSettings } from "../../src/modules/runtime-settings/domain/runtime-settings.defaults";

describe("FileRuntimeSettingsRepository", () => {
  it("creates default settings file when missing", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "aurora-runtime-settings-"));
    const filePath = join(tempDir, "runtime-settings.json");

    try {
      const repository = new FileRuntimeSettingsRepository({
        runtimeSettingsFile: filePath
      } as AppConfigService);
      const loaded = await repository.get();

      const raw = await readFile(filePath, "utf-8");
      const parsedFromDisk = JSON.parse(raw);

      expect(loaded.revision).toBe(buildDefaultRuntimeSettings().revision);
      expect(parsedFromDisk.paths).toBeDefined();
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("falls back to defaults on invalid file and supports save/get caching", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "aurora-runtime-settings-"));
    const filePath = join(tempDir, "runtime-settings.json");

    try {
      await writeFile(filePath, "{ invalid", "utf-8");
      const repository = new FileRuntimeSettingsRepository({
        runtimeSettingsFile: filePath
      } as AppConfigService);

      const defaults = await repository.get();
      expect(defaults.revision).toBe(buildDefaultRuntimeSettings().revision);

      const updated = {
        ...defaults,
        revision: defaults.revision + 1,
        telemetryDebugMode: "basic" as const
      };
      await repository.save(updated);
      const loaded = await repository.get();

      expect(loaded).toEqual(updated);
      loaded.paths.modulePackedPath = "MUTATED";
      const loadedAgain = await repository.get();
      expect(loadedAgain.paths.modulePackedPath).toBe(updated.paths.modulePackedPath);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("resolves relative settings path against cwd", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "aurora-runtime-settings-"));
    const previousCwd = process.cwd();

    try {
      process.chdir(tempDir);
      const repository = new FileRuntimeSettingsRepository({
        runtimeSettingsFile: "./config/runtime-settings.json"
      } as AppConfigService);

      await repository.get();
      const raw = await readFile(join(tempDir, "config", "runtime-settings.json"), "utf-8");
      expect(raw).toContain("\"revision\":");
    } finally {
      process.chdir(previousCwd);
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
