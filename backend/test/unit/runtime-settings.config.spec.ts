import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDefaultRuntimeSettings } from "../../src/modules/runtime-settings/domain/runtime-settings.defaults";

describe("runtime settings config", () => {
  it("keeps the checked lc_audio profile aligned with the Aurora sound catalog defaults", () => {
    const configPath = resolve(__dirname, "../../config/runtime-settings.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8")) as {
      hakProfiles?: Record<string, string[]>;
    };
    const defaults = buildDefaultRuntimeSettings("2026-06-16T00:00:00.000Z");

    expect(config.hakProfiles?.lc_audio).toEqual(defaults.hakProfiles.lc_audio);
    expect(config.hakProfiles?.lc_audio).toEqual([
      "lc_music.hak",
      "lc_sounds.hak",
      "npc_sounds.hak"
    ]);
  });
});
