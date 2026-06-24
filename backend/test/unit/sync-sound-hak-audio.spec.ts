import {
  buildVanillaAudioDryRunManifest,
  buildVanillaAudioObjectKey,
  getVanillaSoundResourceCandidates,
  isSupportedSoundAssetName,
  resolveEffectiveSoundSyncSettings,
  resolveConfiguredSoundHakEntries,
  shouldSyncSoundSource
} from "../../scripts/sync-sound-hak-audio";
import { NWN_KEY_BIF_RESOURCE_TYPES } from "../../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";
import { buildDefaultRuntimeSettings } from "../../src/modules/runtime-settings/domain/runtime-settings.defaults";

describe("sync-sound-hak-audio script helpers", () => {
  it("resolves the configured Aurora audio HAK profile in order", () => {
    const settings = buildDefaultRuntimeSettings("2026-06-16T00:00:00.000Z");

    expect(resolveConfiguredSoundHakEntries(settings)).toEqual([
      "lc_music.hak",
      "lc_sounds.hak",
      "npc_sounds.hak"
    ]);
  });

  it("uses explicit sound HAK priority entries and normalizes extensions", () => {
    const settings = buildDefaultRuntimeSettings("2026-06-16T00:00:00.000Z");
    settings.sources.sound.hakPriorityList = ["custom_audio", "npc_sounds.hak", "custom_audio"];

    expect(resolveConfiguredSoundHakEntries(settings)).toEqual([
      "custom_audio.hak",
      "npc_sounds.hak"
    ]);
  });

  it("resolves selected sound sync sources", () => {
    expect(shouldSyncSoundSource("haks", "all")).toBe(true);
    expect(shouldSyncSoundSource("vanilla", "all")).toBe(true);
    expect(shouldSyncSoundSource("haks", "haks")).toBe(true);
    expect(shouldSyncSoundSource("vanilla", "haks")).toBe(false);
    expect(shouldSyncSoundSource("haks", "vanilla")).toBe(false);
    expect(shouldSyncSoundSource("vanilla", "vanilla")).toBe(true);
  });

  it("accepts only supported audio asset filenames", () => {
    expect(isSupportedSoundAssetName("port_1.wav")).toBe(true);
    expect(isSupportedSoundAssetName("music/theme.BMU")).toBe(true);
    expect(isSupportedSoundAssetName("ambient/day.ogg")).toBe(true);
    expect(isSupportedSoundAssetName("voice/line.mp3")).toBe(true);
    expect(isSupportedSoundAssetName("docs/readme.txt")).toBe(false);
    expect(isSupportedSoundAssetName("models/plc_city_gate.mdl")).toBe(false);
  });

  it("exposes bounded vanilla KEY/BIF audio resource candidates without enabling upload", () => {
    expect(getVanillaSoundResourceCandidates()).toEqual([
      { extension: "wav", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.WAV },
      { extension: "bmu", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.BMU },
      { extension: "mp3", resourceType: NWN_KEY_BIF_RESOURCE_TYPES.MP3 }
    ]);
  });

  it("builds vanilla audio manifest entries with stable source keys and content types", () => {
    const manifest = buildVanillaAudioDryRunManifest(
      [
        {
          resref: "Al_Chant-Loop",
          extension: "wav",
          resourceType: NWN_KEY_BIF_RESOURCE_TYPES.WAV,
          sizeBytes: 2048
        },
        {
          resref: "mus_theme",
          extension: "bmu",
          resourceType: NWN_KEY_BIF_RESOURCE_TYPES.BMU,
          sizeBytes: 4096
        }
      ],
      { candidateLimit: 10, maxBytes: 10_000 }
    );

    expect(manifest).toEqual(
      expect.objectContaining({
        candidateLimit: 10,
        maxBytes: 10_000,
        includedCount: 2,
        totalBytes: 6144,
        skippedDueToCandidateLimit: 0,
        skippedDueToByteLimit: 0,
        entries: [
          {
            resref: "al_chant-loop",
            extension: "wav",
            resourceType: NWN_KEY_BIF_RESOURCE_TYPES.WAV,
            sizeBytes: 2048,
            objectKey: "__aurora/sources/vanilla/audio/wav/al_chant-loop.wav",
            contentType: "audio/wav"
          },
          {
            resref: "mus_theme",
            extension: "bmu",
            resourceType: NWN_KEY_BIF_RESOURCE_TYPES.BMU,
            sizeBytes: 4096,
            objectKey: "__aurora/sources/vanilla/audio/bmu/mus_theme.bmu",
            contentType: "audio/mpeg"
          }
        ]
      })
    );
  });

  it("caps vanilla audio manifest by candidate count and byte budget", () => {
    const manifest = buildVanillaAudioDryRunManifest(
      [
        {
          resref: "small_one",
          extension: "wav",
          resourceType: NWN_KEY_BIF_RESOURCE_TYPES.WAV,
          sizeBytes: 4
        },
        {
          resref: "too_large",
          extension: "wav",
          resourceType: NWN_KEY_BIF_RESOURCE_TYPES.WAV,
          sizeBytes: 20
        },
        {
          resref: "not_considered",
          extension: "wav",
          resourceType: NWN_KEY_BIF_RESOURCE_TYPES.WAV,
          sizeBytes: 1
        }
      ],
      { candidateLimit: 2, maxBytes: 10 }
    );

    expect(manifest.includedCount).toBe(1);
    expect(manifest.totalBytes).toBe(4);
    expect(manifest.skippedDueToByteLimit).toBe(1);
    expect(manifest.skippedDueToCandidateLimit).toBe(1);
    expect(manifest.entries.map((entry) => entry.resref)).toEqual(["small_one"]);
  });

  it("normalizes vanilla audio object keys", () => {
    expect(buildVanillaAudioObjectKey(" Ambient City 001 ", "WAV")).toBe(
      "__aurora/sources/vanilla/audio/wav/ambient_city_001.wav"
    );
  });

  it("can enable vanilla audio discovery for dry-run without mutating runtime settings", () => {
    const settings = buildDefaultRuntimeSettings("2026-06-16T00:00:00.000Z");
    settings.sources.sound.includeVanilla = false;

    const effective = resolveEffectiveSoundSyncSettings(settings, {
      write: false,
      discoverVanilla: true,
      includeVanilla: false
    });

    expect(settings.sources.sound.includeVanilla).toBe(false);
    expect(effective.sources.sound.includeVanilla).toBe(true);
  });

  it("rejects vanilla discovery override when write mode is requested", () => {
    const settings = buildDefaultRuntimeSettings("2026-06-16T00:00:00.000Z");

    expect(() =>
      resolveEffectiveSoundSyncSettings(settings, {
        write: true,
        discoverVanilla: true,
        includeVanilla: false
      })
    ).toThrow("--discover-vanilla is dry-run only");
  });

  it("enables vanilla audio for explicitly guarded write mode", () => {
    const settings = buildDefaultRuntimeSettings("2026-06-16T00:00:00.000Z");
    settings.sources.sound.includeVanilla = false;

    const effective = resolveEffectiveSoundSyncSettings(settings, {
      write: true,
      discoverVanilla: false,
      includeVanilla: true
    });

    expect(settings.sources.sound.includeVanilla).toBe(false);
    expect(effective.sources.sound.includeVanilla).toBe(true);
  });

  it("leaves vanilla audio disabled for ordinary write mode", () => {
    const settings = buildDefaultRuntimeSettings("2026-06-16T00:00:00.000Z");
    settings.sources.sound.includeVanilla = false;

    const effective = resolveEffectiveSoundSyncSettings(settings, {
      write: true,
      discoverVanilla: false,
      includeVanilla: false
    });

    expect(effective).toBe(settings);
    expect(effective.sources.sound.includeVanilla).toBe(false);
  });
});
