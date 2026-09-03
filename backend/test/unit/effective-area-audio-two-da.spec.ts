import {
  MAX_EFFECTIVE_AREA_AUDIO_CATALOG_BUNDLE_BYTES,
  buildEffectiveAreaAudioCatalog,
  isExactEffectiveAreaAudioCatalogBundle,
  parseEffectiveAreaAudioTwoDa,
} from "../../src/modules/catalog/domain/effective-area-audio-two-da";

describe("effective Area audio 2DA catalogs", () => {
  it("parses physical ambientsound rows and resolves bounded display provenance", () => {
    const table = parseEffectiveAreaAudioTwoDa({
      resourceName: "ambientsound.2da",
      bytes: twoDa(
        "Description Resource DisplayName",
        [
          "0 7028 **** ****",
          "1 66957 al_pl_whispersm Whispering",
          "7 **** al_pl_tavhubbub1 Tavern",
        ],
      ),
      sourceObjectKey: "module/ambientsound.2da",
      sourceLayer: "module",
    });

    expect(table).toMatchObject({
      descriptor: {
        resourceName: "ambientsound.2da",
        sourceObjectKey: "module/ambientsound.2da",
        sourceLayer: "module",
        sizeBytes: expect.any(Number),
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        rowCount: 3,
      },
      rows: [
        { rowIndex: 0, descriptionStrRef: 7028 },
        {
          rowIndex: 1,
          descriptionStrRef: 66957,
          resourceResRef: "al_pl_whispersm",
          displayNameRaw: "Whispering",
        },
        {
          rowIndex: 7,
          resourceResRef: "al_pl_tavhubbub1",
          displayNameRaw: "Tavern",
        },
      ],
    });
    const catalog = buildEffectiveAreaAudioCatalog(table!, (strRef) =>
      strRef === 66957 ? "Small whispers" : undefined,
    );
    expect(catalog.rows).toEqual([
      { rowIndex: 0, descriptionStrRef: 7028, displayName: "Row 0", displaySource: "row_index" },
      {
        rowIndex: 1,
        descriptionStrRef: 66957,
        resourceResRef: "al_pl_whispersm",
        displayNameRaw: "Whispering",
        displayName: "Small whispers",
        displaySource: "strref",
      },
      {
        rowIndex: 7,
        resourceResRef: "al_pl_tavhubbub1",
        displayNameRaw: "Tavern",
        displayName: "Tavern",
        displaySource: "display_name",
      },
    ]);
  });

  it("derives battle eligibility only from the native music resource prefix", () => {
    const table = parseEffectiveAreaAudioTwoDa({
      resourceName: "ambientmusic.2da",
      bytes: twoDa("Description Resource DisplayName", [
        "0 61901 **** ****",
        "1 61842 mus_ruralday1 Rural",
        "2 61843 mus_bat_boss BossBattle",
        "3 61844 MUS_BAT_ARENA ArenaBattle",
      ]),
      sourceObjectKey: "hak/music/ambientmusic.2da",
      sourceLayer: "hak",
    });

    expect(buildEffectiveAreaAudioCatalog(table!, () => undefined).rows).toEqual([
      {
        rowIndex: 0,
        descriptionStrRef: 61901,
        battleEligible: false,
        displayName: "Row 0",
        displaySource: "row_index",
      },
      {
        rowIndex: 1,
        descriptionStrRef: 61842,
        resourceResRef: "mus_ruralday1",
        displayNameRaw: "Rural",
        battleEligible: false,
        displayName: "Rural",
        displaySource: "display_name",
      },
      expect.objectContaining({ rowIndex: 2, battleEligible: true }),
      expect.objectContaining({ rowIndex: 3, battleEligible: true }),
    ]);
  });

  it("parses soundeax Label/Description without substituting environment.2da", () => {
    const table = parseEffectiveAreaAudioTwoDa({
      resourceName: "soundeax.2da",
      bytes: twoDa("Label Description", [
        "0 EAX30_PRESET_GENERIC 63451",
        "8 EAX30_PRESET_CAVE ****",
      ]),
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/soundeax.2da",
      sourceLayer: "vanilla",
    });

    expect(buildEffectiveAreaAudioCatalog(table!, (strRef) =>
      strRef === 63451 ? "Generic" : undefined,
    ).rows).toEqual([
      {
        rowIndex: 0,
        label: "EAX30_PRESET_GENERIC",
        descriptionStrRef: 63451,
        displayName: "Generic",
        displaySource: "strref",
      },
      {
        rowIndex: 8,
        label: "EAX30_PRESET_CAVE",
        displayName: "EAX30_PRESET_CAVE",
        displaySource: "label",
      },
    ]);
    expect(parseEffectiveAreaAudioTwoDa({
      resourceName: "environment.2da" as never,
      bytes: twoDa("Label Description", ["0 Wrong 1"]),
      sourceObjectKey: "module/environment.2da",
      sourceLayer: "module",
    })).toBeNull();
  });

  it.each([
    ["duplicate required column", "Description Resource Resource DisplayName", ["0 1 foo foo Label"]],
    ["invalid description", "Description Resource DisplayName", ["0 -1 foo Label"]],
    ["invalid ResRef", "Description Resource DisplayName", ["0 1 ../escape Label"]],
    ["duplicate physical row", "Description Resource DisplayName", ["0 1 foo Label", "0 2 bar Other"]],
  ])("rejects %s", (_label, header, rows) => {
    expect(parseEffectiveAreaAudioTwoDa({
      resourceName: "ambientsound.2da",
      bytes: twoDa(header, rows),
      sourceObjectKey: "module/ambientsound.2da",
      sourceLayer: "module",
    })).toBeNull();
  });

  it("validates one exact all-or-nothing catalog bundle", () => {
    const build = (
      resourceName: "ambientsound.2da" | "ambientmusic.2da" | "soundeax.2da",
      header: string,
      row: string,
    ) => buildEffectiveAreaAudioCatalog(parseEffectiveAreaAudioTwoDa({
      resourceName,
      bytes: twoDa(header, [row]),
      sourceObjectKey: `module/${resourceName}`,
      sourceLayer: "module",
    })!, () => undefined);
    const bundle = {
      schemaVersion: "area-audio-environment-catalogs.v1",
      ambientSound: build("ambientsound.2da", "Description Resource DisplayName", "0 1 foo Sound"),
      ambientMusic: build("ambientmusic.2da", "Description Resource DisplayName", "0 2 mus_bat_x Music"),
      environmentalAudio: build("soundeax.2da", "Label Description", "0 EAX_GENERIC 3"),
    };

    expect(isExactEffectiveAreaAudioCatalogBundle(bundle)).toBe(true);
    expect(isExactEffectiveAreaAudioCatalogBundle({
      ...bundle,
      ambientSound: {
        ...bundle.ambientSound,
        rows: [...bundle.ambientSound.rows, bundle.ambientSound.rows[0]],
      },
    })).toBe(false);
    expect(isExactEffectiveAreaAudioCatalogBundle({ ...bundle, extra: true })).toBe(false);
  });

  it("rejects an otherwise exact bundle above the serialized response budget", () => {
    const rowCount = 700;
    const displayName = "A".repeat(1024);
    const catalog = (
      resourceName: "ambientsound.2da" | "ambientmusic.2da" | "soundeax.2da",
    ) => ({
      descriptor: {
        resourceName,
        sourceObjectKey: `module/${resourceName}`,
        sourceLayer: "module" as const,
        sha256: "a".repeat(64),
        sizeBytes: 64,
        rowCount,
      },
      rows: Array.from({ length: rowCount }, (_, rowIndex) => ({
        rowIndex,
        ...(resourceName === "ambientmusic.2da" ? { battleEligible: false } : {}),
        displayName,
        displaySource: "row_index" as const,
      })),
    });
    const bundle = {
      schemaVersion: "area-audio-environment-catalogs.v1",
      ambientSound: catalog("ambientsound.2da"),
      ambientMusic: catalog("ambientmusic.2da"),
      environmentalAudio: catalog("soundeax.2da"),
    };

    expect(Buffer.byteLength(JSON.stringify(bundle), "utf8")).toBeGreaterThan(
      MAX_EFFECTIVE_AREA_AUDIO_CATALOG_BUNDLE_BYTES,
    );
    expect(isExactEffectiveAreaAudioCatalogBundle(bundle)).toBe(false);
  });
});

function twoDa(header: string, rows: readonly string[]): Buffer {
  return Buffer.from(["2DA V2.0", "", header, ...rows, ""].join("\n"), "utf8");
}
