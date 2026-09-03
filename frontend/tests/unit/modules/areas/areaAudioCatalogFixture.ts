export function effectiveAreaAudioCatalogBundle() {
  const descriptor = (
    resourceName: "ambientsound.2da" | "ambientmusic.2da" | "soundeax.2da",
    sha256: string,
    rowCount: number,
  ) => ({
    resourceName,
    sourceObjectKey: `modules/current/${resourceName}`,
    sourceLayer: "module" as const,
    sha256,
    sizeBytes: 256,
    rowCount,
  });
  return {
    schemaVersion: "area-audio-environment-catalogs.v1" as const,
    ambientSound: {
      descriptor: descriptor("ambientsound.2da", "a".repeat(64), 2),
      rows: [
        {
          rowIndex: 41,
          descriptionStrRef: 7001,
          resourceResRef: "as_forestday",
          displayName: "Forest day",
          displaySource: "strref" as const,
        },
        {
          rowIndex: 42,
          resourceResRef: "as_forestnight",
          displayNameRaw: "Forest Night",
          displayName: "Forest Night",
          displaySource: "display_name" as const,
        },
      ],
    },
    ambientMusic: {
      descriptor: descriptor("ambientmusic.2da", "b".repeat(64), 3),
      rows: [
        {
          rowIndex: 11,
          resourceResRef: "mus_ruralday1",
          battleEligible: false,
          displayName: "Rural day",
          displaySource: "resource" as const,
        },
        {
          rowIndex: 12,
          resourceResRef: "mus_ruralnight",
          battleEligible: false,
          displayName: "Rural night",
          displaySource: "resource" as const,
        },
        {
          rowIndex: 13,
          resourceResRef: "mus_bat_boss",
          battleEligible: true,
          displayName: "Boss battle",
          displaySource: "strref" as const,
        },
      ],
    },
    environmentalAudio: {
      descriptor: descriptor("soundeax.2da", "c".repeat(64), 1),
      rows: [{
        rowIndex: 7,
        label: "EAX30_PRESET_CAVE",
        descriptionStrRef: 7100,
        displayName: "Cave",
        displaySource: "strref" as const,
      }],
    },
  };
}
