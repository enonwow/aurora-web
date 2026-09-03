import { describe, expect, it } from "vitest";
import { parseAreaScene } from "../../../../src/modules/areas/application/areaWorkspaceDraft";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";
import { effectiveAreaAudioCatalogBundle } from "./areaAudioCatalogFixture";
import { effectiveAreaLoadingScreenCatalog } from "./areaLoadingScreenCatalogFixture";
import { effectiveAreaVisualEnvironmentCatalogBundle } from "./areaVisualEnvironmentCatalogFixture";
import { CREATURE_BODY_PART_FIELDS } from
  "../../../../src/modules/scene/domain/creatureBodyParts";

function scene(areaEventScripts?: unknown) {
  return {
    sceneId: "area_event_probe",
    areaName: "Event Probe",
    width: 1,
    height: 1,
    ...(areaEventScripts !== undefined ? { areaEventScripts } : {}),
    tiles: [],
    objects: [],
    updatedAtUnixMs: 100,
    source: "aurora_area",
  };
}

describe("Area workspace event-script draft boundary", () => {
  it("retains exact partial presence including an empty unbound ResRef", () => {
    const value = scene({ onEnter: "area_enter", onExit: "" });
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    {},
    { onEnter: "Bad-Enter" },
    { onEnter: "x".repeat(17) },
    { onLoad: "area_load" },
  ])("rejects malformed event-script state %#", (areaEventScripts) => {
    expect(parseAreaScene(scene(areaEventScripts))).toBeNull();
  });
});

describe("Area workspace Encounter CreatureList.SingleSpawn boundary", () => {
  it("retains only a target with the exact immutable ordered CreatureList identity", () => {
    const object = createNewSceneObject("encounters", 1, 2, 1);
    const geometry = {
      coordinateSpace: "native_local" as const,
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
      ],
    };
    object.polygonGeometry = geometry;
    object.source = {
      type: "aurora_git",
      sourceKind: "encounter",
      sourceIndex: 0,
      sourceObjectId: "encounter:0",
      polygonGeometry: geometry,
      encounterCreatureList: { expectedEntries: [{
        sourceIndex: 0,
        appearance: 388,
        challengeRating: 1,
        resRef: "nw_gnoll001",
        singleSpawnByte: 0,
      }] },
    };
    object.encounterProperties = { creatureList: [{
      appearance: 388,
      challengeRating: 1,
      resRef: "nw_gnoll001",
      singleSpawn: true,
    }] };
    const exact = { ...scene(), objects: [object] };

    expect(parseAreaScene(exact)).toEqual(exact);
    expect(parseAreaScene({
      ...exact,
      objects: [{
        ...object,
        encounterProperties: { creatureList: [{
          ...object.encounterProperties.creatureList![0],
          resRef: "nw_gnoll002",
        }] },
      }],
    })).toBeNull();
  });
});

describe("Area workspace Encounter SpawnPointList boundary", () => {
  it("retains an exact structural target and rejects non-float32 storage", () => {
    const object = createNewSceneObject("encounters", 1, 2, 1);
    const geometry = {
      coordinateSpace: "native_local" as const,
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
      ],
    };
    object.polygonGeometry = geometry;
    object.source = {
      type: "aurora_git",
      sourceKind: "encounter",
      sourceIndex: 0,
      sourceObjectId: "encounter:0",
      polygonGeometry: geometry,
      encounterSpawnPoints: { expectedEntries: [{
        sourceIndex: 0,
        nativeX: 22.5,
        nativeY: 45.25,
        nativeZ: 0,
        orientation: 1.5,
      }] },
    };
    object.encounterProperties = { spawnPoints: [
      { nativeX: -3.75, nativeY: 9.5, nativeZ: 0.125, orientation: -2.25 },
      { nativeX: 7.5, nativeY: -8.25, nativeZ: 0.5, orientation: 1.25 },
    ] };
    const exact = { ...scene(), objects: [object] };

    expect(parseAreaScene(exact)).toEqual(exact);
    expect(parseAreaScene({
      ...exact,
      objects: [{
        ...object,
        encounterProperties: { spawnPoints: [{
          ...object.encounterProperties.spawnPoints![0],
          nativeX: 0.1,
        }] },
      }],
    })).toBeNull();
  });
});

describe("Area workspace basic-identity draft boundary", () => {
  it("retains coherent exact Area Name and empty Tag provenance", () => {
    const value = {
      ...scene(),
      areaName: " Exact Name ",
      areaTag: "",
      areaBasicIdentity: {
        name: " Exact Name ",
        nameProfile: "multi_entry_inline_ascii" as const,
        nameEntries: [
          { languageId: 3, text: "Nom exact" },
          { languageId: 0, text: " Exact Name " },
        ],
        tag: "",
      },
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    { areaName: "Other", areaBasicIdentity: { name: "Exact Name" } },
    { areaName: "Exact Name", areaTag: "OTHER", areaBasicIdentity: { tag: "EXACT" } },
    { areaName: "Exact Name", areaBasicIdentity: { name: "München" } },
    { areaName: "Exact Name", areaBasicIdentity: { name: "Exact Name", nameProfile: "tlk" } },
    { areaName: "Exact Name", areaBasicIdentity: { nameProfile: "simple_inline_ascii" } },
    { areaName: "Exact Name", areaBasicIdentity: {
      name: "Exact Name", nameProfile: "simple_inline_ascii",
      nameEntries: [{ languageId: 0, text: "Exact Name" }, { languageId: 2, text: "Other" }],
    } },
    { areaName: "Exact Name", areaBasicIdentity: {
      name: "Exact Name", nameProfile: "multi_entry_inline_ascii",
      nameEntries: [{ languageId: 0, text: "Exact Name" }, { languageId: 0, text: "Duplicate" }],
    } },
    { areaName: "Exact Name", areaBasicIdentity: {
      name: "Exact Name", nameProfile: "multi_entry_inline_ascii",
      nameEntries: [{ languageId: 0, text: "Different" }, { languageId: 2, text: "Other" }],
    } },
    { areaName: "Exact Name", areaBasicIdentity: { tag: "x".repeat(65) } },
    { areaName: "Exact Name", areaTag: "ORPHAN" },
  ])("rejects incoherent or non-canonical basic identity %#", (override) => {
    expect(parseAreaScene({ ...scene(), ...override })).toBeNull();
  });
});

describe("Area workspace advanced-flags draft boundary", () => {
  it("retains exact partial advanced source and target state", () => {
    const value = {
      ...scene(),
      areaAdvancedFlags: {
        terrainType: { interior: true, natural: false, subterranean: true },
        playerVsPlayer: 3,
        noRest: false,
        listenCheckModifier: -99,
        spotCheckModifier: 99,
        loadingScreenId: 0xffff,
      },
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    {},
    { playerVsPlayer: 4 },
    { noRest: 0 },
    { listenCheckModifier: -100 },
    { spotCheckModifier: 100 },
    { listenCheckModifier: 1.5 },
    { loadingScreenId: -1 },
    { loadingScreenId: 0x1_0000 },
    { loadingScreenId: 1.5 },
    { terrainType: { interior: true, natural: false } },
    { terrainType: { interior: true, natural: false, subterranean: true, extra: true } },
    { loadScreenId: 1 },
  ])("rejects malformed advanced state %#", (areaAdvancedFlags) => {
    expect(parseAreaScene({ ...scene(), areaAdvancedFlags })).toBeNull();
  });
});

describe("Area workspace module Start Location draft boundary", () => {
  it("retains the exact complete binary32 tuple", () => {
    const value = {
      ...scene(),
      moduleStartLocation: {
        areaResRef: "area_event_probe",
        x: Math.fround(1.25),
        y: Math.fround(2.5),
        z: Math.fround(3.75),
        directionX: Math.fround(0),
        directionY: Math.fround(1),
      },
      moduleStartLocationTargets: ["area_event_probe", "other_area"],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    { areaResRef: "Area-01", x: 1, y: 2, z: 3, directionX: 0, directionY: 1 },
    { areaResRef: "area_01", x: 0.1, y: 2, z: 3, directionX: 0, directionY: 1 },
    { areaResRef: "area_01", x: 1, y: 2, z: 3, directionX: 0 },
    {
      areaResRef: "area_01", x: 1, y: 2, z: 3, directionX: 0, directionY: 1,
      bearing: 0,
    },
  ])("rejects malformed module Start Location state %#", (moduleStartLocation) => {
    expect(parseAreaScene({ ...scene(), moduleStartLocation })).toBeNull();
  });

  it.each([
    { targets: [] },
    { targets: ["other_area", "area_event_probe"] },
    { targets: ["area_event_probe", "area_event_probe"] },
    { targets: ["Area_event_probe"] },
  ])("rejects malformed module Start Location targets %#", ({ targets }) => {
    expect(parseAreaScene({ ...scene(), moduleStartLocationTargets: targets })).toBeNull();
  });
});

describe("Area workspace audio-environment draft boundary", () => {
  const exact = {
    ambientSoundDayId: 41,
    ambientSoundNightId: 42,
    ambientSoundDayVolume: 101,
    ambientSoundNightVolume: 102,
    environmentAudioId: 7,
    musicBattleId: 13,
    musicDayId: 11,
    musicNightId: 12,
    musicDelayMilliseconds: 3000,
  };

  it("retains the complete exact tuple", () => {
    const value = { ...scene(), areaAudioEnvironment: exact };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    { ...exact, ambientSoundDayVolume: 128 },
    { ...exact, musicDelayMilliseconds: 3500 },
    { ...exact, musicNightId: undefined },
    { ...exact, guessedResRef: "amb_city" },
  ])("rejects malformed audio state %#", (areaAudioEnvironment) => {
    expect(parseAreaScene({ ...scene(), areaAudioEnvironment })).toBeNull();
  });
});

describe("Area workspace effective audio-catalog draft boundary", () => {
  it("retains one exact immutable catalog bundle", () => {
    const value = { ...scene(), areaAudioEnvironmentCatalogs: effectiveAreaAudioCatalogBundle() };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("rejects a partial bundle instead of persisting guessed lookup state", () => {
    const catalogs = effectiveAreaAudioCatalogBundle();
    expect(parseAreaScene({
      ...scene(),
      areaAudioEnvironmentCatalogs: { ...catalogs, environmentalAudio: undefined },
    })).toBeNull();
  });
});

describe("Area workspace effective loading-screen catalog draft boundary", () => {
  it("retains one exact immutable catalog with physical-row identity", () => {
    const value = { ...scene(), areaLoadingScreenCatalog: effectiveAreaLoadingScreenCatalog() };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("rejects an incoherent catalog instead of persisting guessed row state", () => {
    const catalog = effectiveAreaLoadingScreenCatalog();
    expect(parseAreaScene({
      ...scene(),
      areaLoadingScreenCatalog: {
        ...catalog,
        descriptor: { ...catalog.descriptor, rowCount: catalog.descriptor.rowCount + 1 },
      },
    })).toBeNull();
  });
});

describe("Area workspace effective visual-environment catalog draft boundary", () => {
  it("retains one exact immutable physical-row bundle", () => {
    const value = {
      ...scene(),
      areaVisualEnvironmentCatalogs: effectiveAreaVisualEnvironmentCatalogBundle(),
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("rejects a partial bundle instead of persisting guessed lookup state", () => {
    const catalogs = effectiveAreaVisualEnvironmentCatalogBundle();
    expect(parseAreaScene({
      ...scene(),
      areaVisualEnvironmentCatalogs: { ...catalogs, skyBoxes: undefined },
    })).toBeNull();
  });

  it("retains only one exact native catalog-selection Byte pair", () => {
    const value = {
      ...scene(),
      areaVisualEnvironmentCatalogSelection: {
        lightingSchemeRowIndex: 2,
        skyBoxRowIndex: 1,
      },
    };
    expect(parseAreaScene(value)).toEqual(value);
    expect(parseAreaScene({
      ...scene(),
      areaVisualEnvironmentCatalogSelection: { lightingSchemeRowIndex: 2 },
    })).toBeNull();
  });
});

describe("Area workspace variable-table draft boundary", () => {
  it("retains exact typed entries including order and duplicate names", () => {
    const value = {
      ...scene(),
      areaVariables: [
        { name: "DUPLICATE", type: "int", value: -7 },
        { name: "DUPLICATE", type: "float", value: Math.fround(1.25) },
        { name: "", type: "string", value: " exact value " },
      ],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    [[{ name: "BAD", type: "int", value: 0x80000000 }]],
    [[{ name: "BAD", type: "float", value: 0.1 }]],
    [[{ name: "BAD", type: "string", value: "bad\0value" }]],
    [[{ name: "BAD", type: "integer", value: 1 }]],
    [[{ sourceIndex: 0, name: "BAD", type: "int", value: 1 }]],
  ])("rejects malformed editable variable entries %#", (areaVariables) => {
    expect(parseAreaScene({ ...scene(), areaVariables })).toBeNull();
  });
});

describe("Area workspace Door transition storage draft boundary", () => {
  const storage = { linkedTo: "DESTINATION", linkedToFlags: 2, loadScreenId: 7 };

  it("retains one exact source-provenance and editable-target storage pair", () => {
    const value = {
      ...scene(),
      objects: [doorSceneObject({
        source: {
          type: "aurora_git",
          sourceKind: "door",
          sourceIndex: 0,
          sourceObjectId: "obj_door_0",
          doorTransitionStorage: storage,
        },
        doorTransition: { storage },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["partial source", {
      source: {
        type: "aurora_git", sourceKind: "door", sourceIndex: 0,
        doorTransitionStorage: { linkedTo: "DESTINATION", linkedToFlags: 2 },
      },
      doorTransition: { storage },
    }],
    ["target without provenance", {
      source: { type: "aurora_git", sourceKind: "door", sourceIndex: 0 },
      doorTransition: { storage },
    }],
    ["source without ordinal", {
      source: { type: "aurora_git", sourceKind: "door", doorTransitionStorage: storage },
      doorTransition: { storage },
    }],
    ["out-of-range target", {
      source: {
        type: "aurora_git", sourceKind: "door", sourceIndex: 0,
        doorTransitionStorage: storage,
      },
      doorTransition: {
        storage: { linkedTo: "DESTINATION", linkedToFlags: 256, loadScreenId: 7 },
      },
    }],
  ])("rejects %s Door transition storage", (_label, overrides) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [doorSceneObject(overrides)],
    })).toBeNull();
  });
});

describe("Area workspace Placeable BodyBag draft boundary", () => {
  const tableSha256 = "d".repeat(64);
  const bodyBagCatalog = {
    descriptor: {
      resourceName: "bodybag.2da",
      sourceObjectKey: "modules/current/__aurora/sources/vanilla/bodybag.2da",
      sourceLayer: "vanilla",
      sha256: tableSha256,
      sizeBytes: 502,
      rowCount: 2,
    },
    rows: [
      {
        rowIndex: 0,
        label: "default",
        nameStrRef: 6671,
        displayName: "Default",
        displaySource: "strref",
      },
      {
        rowIndex: 1,
        label: "Potion",
        nameStrRef: 66_483,
        displayName: "Potion",
        displaySource: "strref",
      },
    ],
  } as const;
  const exactSource = {
    type: "aurora_git",
    sourceKind: "placeable",
    sourceIndex: 0,
    sourceObjectId: "obj_placeable_0",
    placeableBodyBag: {
      expectedValue: 0,
      tableSha256,
      tableRowCount: 2,
    },
  } as const;

  it("retains one exact dense catalog, Byte provenance, and numeric target", () => {
    const value = {
      ...scene(),
      placeableBodyBagCatalog: bodyBagCatalog,
      objects: [placeableSceneObject({
        source: exactSource,
        placeableProperties: {
          advancedSettings: { treasureModelRow: 1, treasureModel: "Ignored legacy text" },
        },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["malformed dense catalog", {
      placeableBodyBagCatalog: {
        ...bodyBagCatalog,
        rows: [bodyBagCatalog.rows[1], bodyBagCatalog.rows[0]],
      },
      source: exactSource,
      advancedSettings: { treasureModelRow: 1 },
    }],
    ["missing catalog", {
      source: exactSource,
      advancedSettings: { treasureModelRow: 1 },
    }],
    ["wrong source family", {
      placeableBodyBagCatalog: bodyBagCatalog,
      source: { ...exactSource, sourceKind: "creature" },
      advancedSettings: { treasureModelRow: 1 },
    }],
    ["missing source ordinal", {
      placeableBodyBagCatalog: bodyBagCatalog,
      source: { ...exactSource, sourceIndex: undefined },
      advancedSettings: { treasureModelRow: 1 },
    }],
    ["stale table digest", {
      placeableBodyBagCatalog: bodyBagCatalog,
      source: {
        ...exactSource,
        placeableBodyBag: {
          ...exactSource.placeableBodyBag,
          tableSha256: "e".repeat(64),
        },
      },
      advancedSettings: { treasureModelRow: 1 },
    }],
    ["missing numeric target", {
      placeableBodyBagCatalog: bodyBagCatalog,
      source: exactSource,
      advancedSettings: { treasureModel: "Potion" },
    }],
    ["unknown physical target", {
      placeableBodyBagCatalog: bodyBagCatalog,
      source: exactSource,
      advancedSettings: { treasureModelRow: 2 },
    }],
    ["unproven retained target", {
      placeableBodyBagCatalog: bodyBagCatalog,
      source: {
        type: "aurora_git", sourceKind: "placeable", sourceIndex: 0,
        sourceObjectId: "obj_placeable_0",
      },
      advancedSettings: { treasureModelRow: 1 },
    }],
  ])("rejects %s", (_label, fixture) => {
    const value = {
      ...scene(),
      ...(fixture.placeableBodyBagCatalog
        ? { placeableBodyBagCatalog: fixture.placeableBodyBagCatalog }
        : {}),
      objects: [placeableSceneObject({
        source: fixture.source,
        placeableProperties: { advancedSettings: fixture.advancedSettings },
      })],
    };
    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace Placeable TrapType draft boundary", () => {
  const tableSha256 = "c".repeat(64);
  const trapTypeCatalog = {
    descriptor: {
      resourceName: "traps.2da",
      sourceObjectKey: "modules/current/__aurora/sources/vanilla/traps.2da",
      sourceLayer: "vanilla",
      sha256: tableSha256,
      sizeBytes: 2048,
      rowCount: 2,
    },
    rows: [
      {
        rowIndex: 0,
        label: "MinorSpike",
        trapNameStrRef: 100,
        setDc: 10,
        detectDcMod: 1,
        disarmDcMod: 2,
        displayName: "Spike Trap, Minor",
        displaySource: "strref",
      },
      {
        rowIndex: 1,
        label: "DeadlySpike",
        trapNameStrRef: 101,
        setDc: 20,
        detectDcMod: 3,
        disarmDcMod: 4,
        displayName: "Spike Trap, Deadly",
        displaySource: "strref",
      },
    ],
  } as const;
  const exactSource = {
    type: "aurora_git",
    sourceKind: "placeable",
    sourceIndex: 0,
    sourceObjectId: "obj_placeable_0",
    placeableTrapType: {
      expectedValue: 0,
      tableSha256,
      tableRowCount: 2,
    },
  } as const;
  const exactTarget = {
    trapTypeRow: 1,
    setDc: 20,
    detectDcModWhenSetByRogue: 3,
    disarmDcModWhenSetByRogue: 4,
  } as const;

  it("retains one exact dense catalog, Byte provenance, target row, and derived columns", () => {
    const value = {
      ...scene(),
      placeableTrapTypeCatalog: trapTypeCatalog,
      objects: [placeableSceneObject({
        source: exactSource,
        placeableProperties: { trapSettings: exactTarget },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["malformed dense catalog", {
      placeableTrapTypeCatalog: {
        ...trapTypeCatalog,
        rows: [trapTypeCatalog.rows[1], trapTypeCatalog.rows[0]],
      },
      source: exactSource,
      trapSettings: exactTarget,
    }],
    ["missing catalog", {
      source: exactSource,
      trapSettings: exactTarget,
    }],
    ["wrong source family", {
      placeableTrapTypeCatalog: trapTypeCatalog,
      source: { ...exactSource, sourceKind: "creature" },
      trapSettings: exactTarget,
    }],
    ["missing source ordinal", {
      placeableTrapTypeCatalog: trapTypeCatalog,
      source: { ...exactSource, sourceIndex: undefined },
      trapSettings: exactTarget,
    }],
    ["stale table digest", {
      placeableTrapTypeCatalog: trapTypeCatalog,
      source: {
        ...exactSource,
        placeableTrapType: { ...exactSource.placeableTrapType, tableSha256: "e".repeat(64) },
      },
      trapSettings: exactTarget,
    }],
    ["missing numeric target", {
      placeableTrapTypeCatalog: trapTypeCatalog,
      source: exactSource,
      trapSettings: { ...exactTarget, trapTypeRow: undefined },
    }],
    ["unknown physical target", {
      placeableTrapTypeCatalog: trapTypeCatalog,
      source: exactSource,
      trapSettings: { ...exactTarget, trapTypeRow: 2 },
    }],
    ["mismatched derived columns", {
      placeableTrapTypeCatalog: trapTypeCatalog,
      source: exactSource,
      trapSettings: { ...exactTarget, setDc: 19 },
    }],
    ["unproven retained target", {
      placeableTrapTypeCatalog: trapTypeCatalog,
      source: {
        type: "aurora_git", sourceKind: "placeable", sourceIndex: 0,
        sourceObjectId: "obj_placeable_0",
      },
      trapSettings: exactTarget,
    }],
  ])("rejects %s", (_label, fixture) => {
    const value = {
      ...scene(),
      ...(fixture.placeableTrapTypeCatalog
        ? { placeableTrapTypeCatalog: fixture.placeableTrapTypeCatalog }
        : {}),
      objects: [placeableSceneObject({
        source: fixture.source,
        placeableProperties: { trapSettings: fixture.trapSettings },
      })],
    };
    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace Placeable Faction draft boundary", () => {
  const catalogSha256 = "f".repeat(64);
  const factionCatalog = {
    descriptor: {
      resourceName: "repute.fac",
      sourceObjectKey: "modules/current/repute.fac",
      sha256: catalogSha256,
      sizeBytes: 1889,
      factionCount: 3,
    },
    rows: [
      { factionId: 0, name: "PC", parentFactionId: 0xffff_ffff, isGlobal: true },
      { factionId: 1, name: "Hostile", parentFactionId: 0xffff_ffff, isGlobal: true },
      { factionId: 2, name: "Commoner", parentFactionId: 0xffff_ffff, isGlobal: true },
    ],
  } as const;
  const exactSource = {
    type: "aurora_git",
    sourceKind: "placeable",
    sourceIndex: 0,
    sourceObjectId: "obj_placeable_0",
    placeableFaction: {
      expectedValue: 1,
      catalogSha256,
      catalogFactionCount: 3,
    },
  } as const;

  it("retains one exact digest-bound catalog, provenance, physical target, and derived name", () => {
    const value = {
      ...scene(),
      placeableFactionCatalog: factionCatalog,
      objects: [placeableSceneObject({
        source: exactSource,
        placeableProperties: {
          advancedSettings: { factionId: 2, belongsToFaction: "Commoner" },
        },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["malformed catalog", {
      placeableFactionCatalog: {
        ...factionCatalog,
        rows: [factionCatalog.rows[0], factionCatalog.rows[2], factionCatalog.rows[1]],
      },
      source: exactSource,
      advancedSettings: { factionId: 2, belongsToFaction: "Commoner" },
    }],
    ["missing catalog", {
      source: exactSource,
      advancedSettings: { factionId: 2, belongsToFaction: "Commoner" },
    }],
    ["wrong source family", {
      placeableFactionCatalog: factionCatalog,
      source: { ...exactSource, sourceKind: "creature" },
      advancedSettings: { factionId: 2, belongsToFaction: "Commoner" },
    }],
    ["missing source ordinal", {
      placeableFactionCatalog: factionCatalog,
      source: { ...exactSource, sourceIndex: undefined },
      advancedSettings: { factionId: 2, belongsToFaction: "Commoner" },
    }],
    ["stale catalog digest", {
      placeableFactionCatalog: factionCatalog,
      source: {
        ...exactSource,
        placeableFaction: {
          ...exactSource.placeableFaction,
          catalogSha256: "e".repeat(64),
        },
      },
      advancedSettings: { factionId: 2, belongsToFaction: "Commoner" },
    }],
    ["missing numeric target", {
      placeableFactionCatalog: factionCatalog,
      source: exactSource,
      advancedSettings: { belongsToFaction: "Commoner" },
    }],
    ["unknown physical target", {
      placeableFactionCatalog: factionCatalog,
      source: exactSource,
      advancedSettings: { factionId: 3, belongsToFaction: "Unknown" },
    }],
    ["mismatched derived name", {
      placeableFactionCatalog: factionCatalog,
      source: exactSource,
      advancedSettings: { factionId: 2, belongsToFaction: "Hostile" },
    }],
    ["unproven retained target", {
      placeableFactionCatalog: factionCatalog,
      source: {
        type: "aurora_git", sourceKind: "placeable", sourceIndex: 0,
        sourceObjectId: "obj_placeable_0",
      },
      advancedSettings: { factionId: 2, belongsToFaction: "Commoner" },
    }],
  ])("rejects %s", (_label, fixture) => {
    const value = {
      ...scene(),
      ...(fixture.placeableFactionCatalog
        ? { placeableFactionCatalog: fixture.placeableFactionCatalog }
        : {}),
      objects: [placeableSceneObject({
        source: fixture.source,
        placeableProperties: { advancedSettings: fixture.advancedSettings },
      })],
    };
    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace Placeable PortraitId draft boundary", () => {
  const tableSha256 = "a".repeat(64);
  const portraitCatalog = {
    descriptor: {
      resourceName: "portraits.2da",
      sourceObjectKey: "modules/current/__aurora/sources/vanilla/portraits.2da",
      sourceLayer: "vanilla",
      sha256: tableSha256,
      sizeBytes: 944_115,
      rowCount: 16_001,
    },
    rows: [
      { rowIndex: 462, baseResRef: "plc_n02_" },
      { rowIndex: 15_157, baseResRef: "plc_dagflag" },
    ],
  } as const;
  const exactSource = {
    type: "aurora_git",
    sourceKind: "placeable",
    sourceIndex: 0,
    sourceObjectId: "obj_placeable_0",
    placeablePortrait: {
      expectedValue: 462,
      tableSha256,
      tableRowCount: 16_001,
    },
  } as const;

  it("retains one exact sparse catalog, Word provenance, physical target, and derived ResRef", () => {
    const value = {
      ...scene(),
      placeablePortraitCatalog: portraitCatalog,
      objects: [placeableSceneObject({
        source: exactSource,
        placeableProperties: {
          advancedSettings: { portraitId: 15_157, portraitResRef: "plc_dagflag" },
        },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["malformed sparse catalog", {
      placeablePortraitCatalog: {
        ...portraitCatalog,
        rows: [portraitCatalog.rows[1], portraitCatalog.rows[0]],
      },
      source: exactSource,
      advancedSettings: { portraitId: 15_157, portraitResRef: "plc_dagflag" },
    }],
    ["missing catalog", {
      source: exactSource,
      advancedSettings: { portraitId: 15_157, portraitResRef: "plc_dagflag" },
    }],
    ["wrong source family", {
      placeablePortraitCatalog: portraitCatalog,
      source: { ...exactSource, sourceKind: "creature" },
      advancedSettings: { portraitId: 15_157, portraitResRef: "plc_dagflag" },
    }],
    ["missing source ordinal", {
      placeablePortraitCatalog: portraitCatalog,
      source: { ...exactSource, sourceIndex: undefined },
      advancedSettings: { portraitId: 15_157, portraitResRef: "plc_dagflag" },
    }],
    ["stale table digest", {
      placeablePortraitCatalog: portraitCatalog,
      source: {
        ...exactSource,
        placeablePortrait: {
          ...exactSource.placeablePortrait,
          tableSha256: "b".repeat(64),
        },
      },
      advancedSettings: { portraitId: 15_157, portraitResRef: "plc_dagflag" },
    }],
    ["missing numeric target", {
      placeablePortraitCatalog: portraitCatalog,
      source: exactSource,
      advancedSettings: { portraitResRef: "plc_dagflag" },
    }],
    ["unsupported sparse row", {
      placeablePortraitCatalog: portraitCatalog,
      source: exactSource,
      advancedSettings: { portraitId: 463, portraitResRef: "plc_missing" },
    }],
    ["mismatched derived ResRef", {
      placeablePortraitCatalog: portraitCatalog,
      source: exactSource,
      advancedSettings: { portraitId: 15_157, portraitResRef: "plc_n02_" },
    }],
    ["unproven retained target", {
      placeablePortraitCatalog: portraitCatalog,
      source: {
        type: "aurora_git", sourceKind: "placeable", sourceIndex: 0,
        sourceObjectId: "obj_placeable_0",
      },
      advancedSettings: { portraitId: 15_157, portraitResRef: "plc_dagflag" },
    }],
  ])("rejects %s", (_label, fixture) => {
    const value = {
      ...scene(),
      ...(fixture.placeablePortraitCatalog
        ? { placeablePortraitCatalog: fixture.placeablePortraitCatalog }
        : {}),
      objects: [placeableSceneObject({
        source: fixture.source,
        placeableProperties: { advancedSettings: fixture.advancedSettings },
      })],
    };
    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace Placeable TemplateResRef draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "placeable",
    sourceIndex: 0,
    sourceObjectId: "obj_placeable_0",
    placeableTemplateResRef: "plc_chest",
  } as const;

  it("retains exact source storage, an independent target, and renderer identity", () => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        resRef: "renderer_identity",
        source: exactSource,
        placeableProperties: {
          advancedSettings: { blueprintResRef: "plc_chest_alt" },
        },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", {
      source: { ...exactSource, sourceKind: "creature" },
      advancedSettings: { blueprintResRef: "plc_chest_alt" },
    }],
    ["missing source ordinal", {
      source: { ...exactSource, sourceIndex: undefined },
      advancedSettings: { blueprintResRef: "plc_chest_alt" },
    }],
    ["malformed source storage", {
      source: { ...exactSource, placeableTemplateResRef: "PLC_CHEST" },
      advancedSettings: { blueprintResRef: "plc_chest_alt" },
    }],
    ["missing target", {
      source: exactSource,
      advancedSettings: {},
    }],
    ["malformed target", {
      source: exactSource,
      advancedSettings: { blueprintResRef: "bad-resref" },
    }],
    ["unproven retained target", {
      source: {
        type: "aurora_git", sourceKind: "placeable", sourceIndex: 0,
        sourceObjectId: "obj_placeable_0",
      },
      advancedSettings: { blueprintResRef: "plc_chest_alt" },
    }],
  ])("rejects %s", (_label, fixture) => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        resRef: "renderer_identity",
        source: fixture.source,
        placeableProperties: { advancedSettings: fixture.advancedSettings },
      })],
    };
    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace Placeable AnimationState draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "placeable",
    sourceIndex: 0,
    sourceObjectId: "obj_placeable_0",
    placeableAnimationState: 0,
  } as const;

  it("retains exact Byte provenance and an independently edited frozen token", () => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        source: exactSource,
        placeableProperties: { advancedSettings: { initialState: "Opened 2" } },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", {
      source: { ...exactSource, sourceKind: "creature" },
      advancedSettings: { initialState: "Opened 2" },
    }],
    ["missing source ordinal", {
      source: { ...exactSource, sourceIndex: undefined },
      advancedSettings: { initialState: "Opened 2" },
    }],
    ["malformed source storage", {
      source: { ...exactSource, placeableAnimationState: 3 },
      advancedSettings: { initialState: "Opened 2" },
    }],
    ["missing target", {
      source: exactSource,
      advancedSettings: {},
    }],
    ["malformed target", {
      source: exactSource,
      advancedSettings: { initialState: "Default" },
    }],
    ["unproven retained target", {
      source: {
        type: "aurora_git", sourceKind: "placeable", sourceIndex: 0,
        sourceObjectId: "obj_placeable_0",
      },
      advancedSettings: { initialState: "Opened 2" },
    }],
  ])("rejects %s", (_label, fixture) => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        source: fixture.source,
        placeableProperties: { advancedSettings: fixture.advancedSettings },
      })],
    };
    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace Placeable Conversation/Interruptable draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "placeable",
    sourceIndex: 0,
    sourceObjectId: "obj_placeable_0",
    placeableConversation: "",
    placeableInterruptable: 1,
  } as const;

  it("retains exact independent source values and inverted boolean target", () => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        source: exactSource,
        placeableProperties: {
          advancedSettings: { conversation: "chest_dialog", noInterrupt: true },
        },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["Conversation only", {
      source: {
        type: "aurora_git", sourceKind: "placeable", sourceIndex: 0,
        sourceObjectId: "obj_placeable_0", placeableConversation: "",
      },
      advancedSettings: { conversation: "" },
    }],
    ["Interruptable only", {
      source: {
        type: "aurora_git", sourceKind: "placeable", sourceIndex: 0,
        sourceObjectId: "obj_placeable_0", placeableInterruptable: 0,
      },
      advancedSettings: { noInterrupt: false },
    }],
  ])("retains exact independently present %s state", (_label, fixture) => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        source: fixture.source,
        placeableProperties: { advancedSettings: fixture.advancedSettings },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", {
      source: { ...exactSource, sourceKind: "creature" },
      advancedSettings: { conversation: "chest_dialog", noInterrupt: true },
    }],
    ["missing source ordinal", {
      source: { ...exactSource, sourceIndex: undefined },
      advancedSettings: { conversation: "chest_dialog", noInterrupt: true },
    }],
    ["malformed Conversation source", {
      source: { ...exactSource, placeableConversation: "bad-dialog" },
      advancedSettings: { conversation: "chest_dialog", noInterrupt: true },
    }],
    ["malformed Interruptable source", {
      source: { ...exactSource, placeableInterruptable: 2 },
      advancedSettings: { conversation: "chest_dialog", noInterrupt: true },
    }],
    ["missing Conversation target", {
      source: exactSource,
      advancedSettings: { noInterrupt: true },
    }],
    ["missing Interruptable target", {
      source: exactSource,
      advancedSettings: { conversation: "chest_dialog" },
    }],
    ["malformed Conversation target", {
      source: exactSource,
      advancedSettings: { conversation: "bad-dialog", noInterrupt: true },
    }],
    ["malformed Interruptable target", {
      source: exactSource,
      advancedSettings: { conversation: "chest_dialog", noInterrupt: 1 },
    }],
    ["unproven Conversation target", {
      source: {
        type: "aurora_git", sourceKind: "placeable", sourceIndex: 0,
        sourceObjectId: "obj_placeable_0", placeableInterruptable: 1,
      },
      advancedSettings: { conversation: "chest_dialog", noInterrupt: true },
    }],
    ["unproven Interruptable target", {
      source: {
        type: "aurora_git", sourceKind: "placeable", sourceIndex: 0,
        sourceObjectId: "obj_placeable_0", placeableConversation: "",
      },
      advancedSettings: { conversation: "chest_dialog", noInterrupt: true },
    }],
  ])("rejects %s", (_label, fixture) => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        source: fixture.source,
        placeableProperties: { advancedSettings: fixture.advancedSettings },
      })],
    };
    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace Placeable Static/Useable draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "placeable",
    sourceIndex: 0,
    sourceObjectId: "obj_placeable_0",
    placeableStatic: true,
    placeableUseable: false,
  } as const;

  it("retains exact independent boolean provenance and edited targets", () => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        isStatic: false,
        source: exactSource,
        placeableProperties: { useable: true },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains presentation-only defaults when neither native field is proven", () => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        isStatic: true,
        source: {
          type: "aurora_git", sourceKind: "placeable", sourceIndex: 0,
          sourceObjectId: "obj_placeable_0",
        },
        placeableProperties: { useable: false },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", {
      source: { ...exactSource, sourceKind: "creature" },
      isStatic: false,
      useable: true,
    }],
    ["missing source ordinal", {
      source: { ...exactSource, sourceIndex: undefined },
      isStatic: false,
      useable: true,
    }],
    ["malformed Static source", {
      source: { ...exactSource, placeableStatic: 1 },
      isStatic: false,
      useable: true,
    }],
    ["malformed Useable source", {
      source: { ...exactSource, placeableUseable: 0 },
      isStatic: false,
      useable: true,
    }],
    ["missing Static target", {
      source: exactSource,
      useable: true,
    }],
    ["missing Useable target", {
      source: exactSource,
      isStatic: false,
    }],
    ["malformed Static target", {
      source: exactSource,
      isStatic: 0,
      useable: true,
    }],
    ["malformed Useable target", {
      source: exactSource,
      isStatic: false,
      useable: 1,
    }],
  ])("rejects %s", (_label, fixture) => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        ...(fixture.isStatic === undefined ? {} : { isStatic: fixture.isStatic }),
        source: fixture.source,
        ...(fixture.useable === undefined
          ? {}
          : { placeableProperties: { useable: fixture.useable } }),
      })],
    };
    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace Placeable Plot/HasInventory draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "placeable",
    sourceIndex: 0,
    sourceObjectId: "obj_placeable_0",
    placeablePlot: false,
    placeableHasInventory: false,
  } as const;

  it("retains exact independent boolean provenance and edited targets", () => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        source: exactSource,
        placeableProperties: { plot: true, hasInventory: true },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains presentation-only defaults when neither native field is proven", () => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        source: {
          type: "aurora_git", sourceKind: "placeable", sourceIndex: 0,
          sourceObjectId: "obj_placeable_0",
        },
        placeableProperties: { plot: false, hasInventory: false },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", {
      source: { ...exactSource, sourceKind: "creature" },
      plot: true,
      hasInventory: true,
    }],
    ["missing source ordinal", {
      source: { ...exactSource, sourceIndex: undefined },
      plot: true,
      hasInventory: true,
    }],
    ["malformed Plot source", {
      source: { ...exactSource, placeablePlot: 0 },
      plot: true,
      hasInventory: true,
    }],
    ["malformed HasInventory source", {
      source: { ...exactSource, placeableHasInventory: 0 },
      plot: true,
      hasInventory: true,
    }],
    ["missing Plot target", {
      source: exactSource,
      hasInventory: true,
    }],
    ["missing HasInventory target", {
      source: exactSource,
      plot: true,
    }],
    ["malformed Plot target", {
      source: exactSource,
      plot: 1,
      hasInventory: true,
    }],
    ["malformed HasInventory target", {
      source: exactSource,
      plot: true,
      hasInventory: 1,
    }],
  ])("rejects %s", (_label, fixture) => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        source: fixture.source,
        placeableProperties: {
          ...(fixture.plot === undefined ? {} : { plot: fixture.plot }),
          ...(fixture.hasInventory === undefined
            ? {}
            : { hasInventory: fixture.hasInventory }),
        },
      })],
    };
    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace Placeable durability/save Byte draft boundary", () => {
  const nativeBytes = {
    hardness: 5,
    fortitudeSave: 16,
    reflexSave: 0,
    willSave: 0,
  } as const;
  const exactSource = {
    type: "aurora_git",
    sourceKind: "placeable",
    sourceIndex: 0,
    sourceObjectId: "obj_placeable_0",
    placeableDurabilitySaveBytes: nativeBytes,
  } as const;

  it("retains the four exact native Bytes and independently edited targets", () => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        source: exactSource,
        placeableProperties: {
          hardness: 8,
          fortitudeSave: 20,
          reflexSave: 12,
          willSave: 10,
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains a partial proven source without promoting presentation-only targets", () => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        source: {
          ...exactSource,
          placeableDurabilitySaveBytes: { hardness: 5 },
        },
        placeableProperties: {
          hardness: 8,
          fortitudeSave: 99,
          reflexSave: 99,
          willSave: 99,
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains presentation-only defaults when no native Byte is proven", () => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        source: {
          type: "aurora_git", sourceKind: "placeable", sourceIndex: 0,
          sourceObjectId: "obj_placeable_0",
        },
        placeableProperties: nativeBytes,
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", {
      source: { ...exactSource, sourceKind: "creature" },
      target: nativeBytes,
    }],
    ["missing source ordinal", {
      source: { ...exactSource, sourceIndex: undefined },
      target: nativeBytes,
    }],
    ["non-object source map", {
      source: { ...exactSource, placeableDurabilitySaveBytes: 5 },
      target: nativeBytes,
    }],
    ["empty source map", {
      source: { ...exactSource, placeableDurabilitySaveBytes: {} },
      target: nativeBytes,
    }],
    ["unsupported source key", {
      source: { ...exactSource, placeableDurabilitySaveBytes: { hardness: 5, hitPoints: 10 } },
      target: nativeBytes,
    }],
    ["malformed Hardness source", {
      source: { ...exactSource, placeableDurabilitySaveBytes: { hardness: 256 } },
      target: nativeBytes,
    }],
    ["malformed Fort source", {
      source: { ...exactSource, placeableDurabilitySaveBytes: { fortitudeSave: -1 } },
      target: nativeBytes,
    }],
    ["malformed Ref source", {
      source: { ...exactSource, placeableDurabilitySaveBytes: { reflexSave: 1.5 } },
      target: nativeBytes,
    }],
    ["malformed Will source", {
      source: { ...exactSource, placeableDurabilitySaveBytes: { willSave: "0" } },
      target: nativeBytes,
    }],
    ["missing proven target", {
      source: exactSource,
      target: { hardness: 8, fortitudeSave: 20, reflexSave: 12 },
    }],
    ["malformed proven target", {
      source: exactSource,
      target: { hardness: 8, fortitudeSave: 20, reflexSave: 12, willSave: 256 },
    }],
  ])("rejects %s", (_label, fixture) => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        source: fixture.source,
        placeableProperties: fixture.target,
      })],
    };
    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace Placeable HP/CurrentHP draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "placeable",
    sourceIndex: 0,
    sourceObjectId: "obj_placeable_0",
    placeableHitPointState: { hitPoints: 15, currentHitPoints: 45 },
  } as const;

  it("retains the exact native Short pair and independently edited HP target", () => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        source: exactSource,
        placeableProperties: { hitPoints: 30 },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains presentation-only HP when the native pair is not proven", () => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        source: {
          type: "aurora_git", sourceKind: "placeable", sourceIndex: 0,
          sourceObjectId: "obj_placeable_0",
        },
        placeableProperties: { hitPoints: 10 },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", {
      source: { ...exactSource, sourceKind: "creature" }, target: 30,
    }],
    ["missing source ordinal", {
      source: { ...exactSource, sourceIndex: undefined }, target: 30,
    }],
    ["non-object source pair", {
      source: { ...exactSource, placeableHitPointState: 15 }, target: 30,
    }],
    ["missing CurrentHP source", {
      source: { ...exactSource, placeableHitPointState: { hitPoints: 15 } }, target: 30,
    }],
    ["extra source key", {
      source: {
        ...exactSource,
        placeableHitPointState: { hitPoints: 15, currentHitPoints: 45, extra: 1 },
      },
      target: 30,
    }],
    ["zero source HP", {
      source: { ...exactSource, placeableHitPointState: { hitPoints: 0, currentHitPoints: 45 } },
      target: 30,
    }],
    ["out-of-range source CurrentHP", {
      source: { ...exactSource, placeableHitPointState: { hitPoints: 15, currentHitPoints: 32_768 } },
      target: 30,
    }],
    ["missing HP target", { source: exactSource, target: undefined }],
    ["zero HP target", { source: exactSource, target: 0 }],
    ["over-limit HP target", { source: exactSource, target: 10_001 }],
    ["fractional HP target", { source: exactSource, target: 30.5 }],
  ])("rejects %s", (_label, fixture) => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        source: fixture.source,
        placeableProperties: fixture.target === undefined
          ? {}
          : { hitPoints: fixture.target },
      })],
    };
    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace Placeable editor Comment draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "placeable",
    sourceIndex: 0,
    sourceObjectId: "obj_placeable_0",
    placeableEditorComment: "",
  } as const;

  it("retains an exact empty GIC Comment and an independently edited target", () => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        source: exactSource,
        placeableProperties: { comments: "Water trough beside the west wall." },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains presentation-only comments when native GIC provenance is absent", () => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        source: {
          type: "aurora_git", sourceKind: "placeable", sourceIndex: 0,
          sourceObjectId: "obj_placeable_0",
        },
        placeableProperties: { comments: "presentation only" },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", {
      source: { ...exactSource, sourceKind: "creature" }, target: "changed",
    }],
    ["missing source ordinal", {
      source: { ...exactSource, sourceIndex: undefined }, target: "changed",
    }],
    ["non-string source", {
      source: { ...exactSource, placeableEditorComment: 1 }, target: "changed",
    }],
    ["NUL-containing source", {
      source: { ...exactSource, placeableEditorComment: "bad\u0000source" }, target: "changed",
    }],
    ["over-budget source", {
      source: { ...exactSource, placeableEditorComment: "s".repeat(4097) }, target: "changed",
    }],
    ["missing target", { source: exactSource, target: undefined }],
    ["non-string target", { source: exactSource, target: 1 }],
    ["NUL-containing target", { source: exactSource, target: "bad\u0000target" }],
    ["over-budget target", { source: exactSource, target: "t".repeat(4097) }],
  ])("rejects %s", (_label, fixture) => {
    const value = {
      ...scene(),
      objects: [placeableSceneObject({
        source: fixture.source,
        placeableProperties: fixture.target === undefined
          ? {}
          : { comments: fixture.target },
      })],
    };
    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace Creature editor Comment draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureEditorComment: "",
  } as const;

  it("retains an exact empty paired-GIC Comment and an edited target", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { comments: "Guard beside the west gate." },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains presentation-only Creature comments when provenance is absent", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: {
          type: "aurora_git", sourceKind: "creature", sourceIndex: 0,
          sourceObjectId: "obj_creature_0",
        },
        creatureProperties: { comments: "presentation only" },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", {
      source: { ...exactSource, sourceKind: "placeable" }, target: "changed",
    }],
    ["missing source ordinal", {
      source: { ...exactSource, sourceIndex: undefined }, target: "changed",
    }],
    ["non-string source", {
      source: { ...exactSource, creatureEditorComment: 1 }, target: "changed",
    }],
    ["NUL-containing source", {
      source: { ...exactSource, creatureEditorComment: "bad\u0000source" }, target: "changed",
    }],
    ["over-budget source", {
      source: { ...exactSource, creatureEditorComment: "s".repeat(4097) }, target: "changed",
    }],
    ["missing target", { source: exactSource, target: undefined }],
    ["non-string target", { source: exactSource, target: 1 }],
    ["NUL-containing target", { source: exactSource, target: "bad\u0000target" }],
    ["over-budget target", { source: exactSource, target: "t".repeat(4097) }],
  ])("rejects %s", (_label, fixture) => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: fixture.source,
        creatureProperties: fixture.target === undefined
          ? {}
          : { comments: fixture.target },
      })],
    };
    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace ground-item editor Comment draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "item",
    sourceIndex: 0,
    sourceObjectId: "obj_item_0",
    itemEditorComment: "",
  } as const;

  it("retains an exact empty paired-GIC Comment and an edited target", () => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({
        source: exactSource,
        itemProperties: { comments: "Item beside the west wall." },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", { source: { ...exactSource, sourceKind: "creature" }, target: "changed" }],
    ["missing source ordinal", { source: { ...exactSource, sourceIndex: undefined }, target: "changed" }],
    ["non-string source", { source: { ...exactSource, itemEditorComment: 1 }, target: "changed" }],
    ["NUL-containing source", { source: { ...exactSource, itemEditorComment: "bad\u0000source" }, target: "changed" }],
    ["over-budget source", { source: { ...exactSource, itemEditorComment: "s".repeat(4097) }, target: "changed" }],
    ["missing target", { source: exactSource, target: undefined }],
    ["non-string target", { source: exactSource, target: 1 }],
    ["NUL-containing target", { source: exactSource, target: "bad\u0000target" }],
    ["over-budget target", { source: exactSource, target: "t".repeat(4097) }],
  ])("rejects %s", (_label, fixture) => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({
        source: fixture.source,
        itemProperties: fixture.target === undefined ? {} : { comments: fixture.target },
      })],
    };
    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace Store editor Comment draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "store",
    sourceIndex: 0,
    sourceObjectId: "obj_store_0",
    storeEditorComment: "",
  } as const;

  it("retains an exact empty paired-GIC Comment and an independently edited target", () => {
    const value = {
      ...scene(),
      objects: [storeSceneObject({
        source: exactSource,
        storeProperties: { comments: "  Store beside the west wall.\r\n" },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", { source: { ...exactSource, sourceKind: "item" }, target: "changed" }],
    ["missing source ordinal", { source: { ...exactSource, sourceIndex: undefined }, target: "changed" }],
    ["non-string source", { source: { ...exactSource, storeEditorComment: 1 }, target: "changed" }],
    ["NUL-containing source", { source: { ...exactSource, storeEditorComment: "bad\u0000source" }, target: "changed" }],
    ["over-budget source", { source: { ...exactSource, storeEditorComment: "s".repeat(4097) }, target: "changed" }],
    ["missing target", { source: exactSource, target: undefined }],
    ["non-string target", { source: exactSource, target: 1 }],
    ["NUL-containing target", { source: exactSource, target: "bad\u0000target" }],
    ["over-budget target", { source: exactSource, target: "t".repeat(4097) }],
  ])("rejects %s", (_label, fixture) => {
    const value = {
      ...scene(),
      objects: [storeSceneObject({
        source: fixture.source,
        storeProperties: fixture.target === undefined ? {} : { comments: fixture.target },
      })],
    };
    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace Store commerce draft boundary", () => {
  const commerce = {
    markUp: 100,
    markDown: 65,
    blackMarket: false,
    blackMarketMarkDown: 25,
    identifyPrice: 100,
    maxBuyPrice: -1,
    storeGold: -1,
  } as const;
  const exactSource = {
    type: "aurora_git",
    sourceKind: "store",
    sourceIndex: 0,
    sourceObjectId: "obj_store_0",
    storeCommerce: commerce,
  } as const;

  it("retains complete detached source and independently edited target vectors", () => {
    const value = {
      ...scene(),
      objects: [storeSceneObject({
        source: exactSource,
        storeProperties: {
          comments: "",
          commerce: { ...commerce, markUp: 125, blackMarket: true },
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", { source: { ...exactSource, sourceKind: "item" }, target: commerce }],
    ["missing source ordinal", { source: { ...exactSource, sourceIndex: undefined }, target: commerce }],
    ["partial source", {
      source: { ...exactSource, storeCommerce: { ...commerce, storeGold: undefined } },
      target: commerce,
    }],
    ["missing target", { source: exactSource, target: undefined }],
    ["partial target", {
      source: exactSource,
      target: { ...commerce, identifyPrice: undefined },
    }],
    ["target without provenance", {
      source: { type: "aurora_git", sourceKind: "store", sourceIndex: 0 },
      target: commerce,
    }],
  ])("rejects %s", (_label, fixture) => {
    const value = {
      ...scene(),
      objects: [storeSceneObject({
        source: fixture.source,
        storeProperties: fixture.target === undefined
          ? { comments: "" }
          : { comments: "", commerce: fixture.target },
      })],
    };
    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace Store script-ResRef draft boundary", () => {
  const scriptResRefs = {
    onOpenStore: "store_open",
    onStoreClosed: "store_closed",
  } as const;
  const exactSource = {
    type: "aurora_git",
    sourceKind: "store",
    sourceIndex: 0,
    sourceObjectId: "obj_store_0",
    storeScriptResRefs: scriptResRefs,
  } as const;

  it("retains a complete source pair and independently edited canonical target", () => {
    const value = {
      ...scene(),
      objects: [storeSceneObject({
        source: exactSource,
        storeProperties: {
          comments: "",
          scriptResRefs: {
            onOpenStore: "nw_store_open",
            onStoreClosed: "nw_store_close",
          },
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", { source: { ...exactSource, sourceKind: "item" }, target: scriptResRefs }],
    ["missing source ordinal", { source: { ...exactSource, sourceIndex: undefined }, target: scriptResRefs }],
    ["partial source", {
      source: { ...exactSource, storeScriptResRefs: { onOpenStore: "store_open" } },
      target: scriptResRefs,
    }],
    ["missing target", { source: exactSource, target: undefined }],
    ["uppercase target", {
      source: exactSource,
      target: { onOpenStore: "STORE_OPEN", onStoreClosed: "store_closed" },
    }],
    ["target without provenance", {
      source: { type: "aurora_git", sourceKind: "store", sourceIndex: 0 },
      target: scriptResRefs,
    }],
  ])("rejects %s", (_label, fixture) => {
    const value = {
      ...scene(),
      objects: [storeSceneObject({
        source: fixture.source,
        storeProperties: fixture.target === undefined
          ? { comments: "" }
          : { comments: "", scriptResRefs: fixture.target },
      })],
    };
    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace Store VarTable draft boundary", () => {
  const variables = {
    expectedEntries: [
      { sourceIndex: 0, name: "Counter", type: "int" as const, value: 1 },
      { sourceIndex: 1, name: "Label", type: "string" as const, value: "before" },
    ],
  } as const;
  const exactSource = {
    type: "aurora_git",
    sourceKind: "store",
    sourceIndex: 0,
    sourceObjectId: "obj_store_0",
    storeVariables: variables,
  } as const;

  it("retains complete immutable provenance and an independently edited ordered target", () => {
    const value = {
      ...scene(),
      objects: [storeSceneObject({
        source: exactSource,
        storeProperties: {
          comments: "",
          variables: [
            { name: "Label", type: "string", value: "after" },
            { name: "Counter", type: "int", value: 2 },
          ],
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", { source: { ...exactSource, sourceKind: "item" }, target: [] }],
    ["missing source ordinal", { source: { ...exactSource, sourceIndex: undefined }, target: [] }],
    ["non-contiguous source", {
      source: {
        ...exactSource,
        storeVariables: {
          expectedEntries: [{ sourceIndex: 1, name: "Counter", type: "int", value: 1 }],
        },
      },
      target: [],
    }],
    ["malformed target", {
      source: exactSource,
      target: [{ name: "Scale", type: "float", value: 0.1 }],
    }],
    ["missing target", { source: exactSource, target: undefined }],
    ["target without provenance", {
      source: { type: "aurora_git", sourceKind: "store", sourceIndex: 0 },
      target: [{ name: "Counter", type: "int", value: 1 }],
    }],
  ])("rejects %s", (_label, fixture) => {
    const value = {
      ...scene(),
      objects: [storeSceneObject({
        source: fixture.source,
        storeProperties: fixture.target === undefined
          ? { comments: "" }
          : { comments: "", variables: fixture.target },
      })],
    };
    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace Store restriction draft boundary", () => {
  const itemBaseItemCatalog = {
    descriptor: {
      resourceName: "baseitems.2da",
      sourceObjectKey: "modules/current/baseitems.2da",
      sourceLayer: "module",
      sha256: "e".repeat(64),
      sizeBytes: 4096,
      rowCount: 4,
    },
    rows: Array.from({ length: 4 }, (_, rowIndex) => ({
      rowIndex,
      modelType: 0,
      displayName: `Base item ${rowIndex}`,
    })),
  } as const;
  const restrictions = {
    expectedValue: {
      willNotBuy: { present: true, baseItemIds: [2, 1, 2] },
      willOnlyBuy: { present: false, baseItemIds: [] },
    },
    tableSha256: "e".repeat(64),
    tableRowCount: 4,
  } as const;
  const source = {
    type: "aurora_git",
    sourceKind: "store",
    sourceIndex: 0,
    sourceObjectId: "obj_store_0",
    storeRestrictions: restrictions,
  } as const;

  it("retains catalog-bound provenance and independently edited ordered targets", () => {
    const value = {
      ...scene(),
      itemBaseItemCatalog,
      objects: [storeSceneObject({
        source,
        storeProperties: {
          comments: "",
          restrictions: { willNotBuy: [1, 2, 1], willOnlyBuy: [0] },
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["missing catalog", undefined, source, { willNotBuy: [], willOnlyBuy: [] }],
    ["stale catalog", itemBaseItemCatalog, {
      ...source,
      storeRestrictions: { ...restrictions, tableSha256: "f".repeat(64) },
    }, { willNotBuy: [], willOnlyBuy: [] }],
    ["out-of-catalog target", itemBaseItemCatalog, source, {
      willNotBuy: [4], willOnlyBuy: [],
    }],
    ["target without provenance", itemBaseItemCatalog, {
      type: "aurora_git", sourceKind: "store", sourceIndex: 0,
    }, { willNotBuy: [], willOnlyBuy: [] }],
  ])("rejects %s", (_label, catalog, storeSource, target) => {
    expect(parseAreaScene({
      ...scene(),
      ...(catalog ? { itemBaseItemCatalog: catalog } : {}),
      objects: [storeSceneObject({
        source: storeSource,
        storeProperties: { comments: "", restrictions: target },
      })],
    })).toBeNull();
  });
});

describe("Area workspace retained Store inventory draft boundary", () => {
  const itemBaseItemCatalog = {
    descriptor: {
      resourceName: "baseitems.2da",
      sourceObjectKey: "modules/current/baseitems.2da",
      sourceLayer: "module",
      sha256: "e".repeat(64),
      sizeBytes: 4096,
      rowCount: 2,
    },
    rows: [0, 1].map((rowIndex) => ({
      rowIndex,
      modelType: 0,
      displayName: `Base item ${rowIndex}`,
      invSlotWidth: 1,
      invSlotHeight: 1,
    })),
  } as const;
  const expectedBuckets = [
    {
      bucketTypeId: 0,
      entries: [
        {
          sourceIndex: 0, resRef: "itm_a", baseItemId: 0,
          slotWidth: 1, slotHeight: 1, x: 0, y: 0, infinite: true,
        },
        {
          sourceIndex: 1, resRef: "itm_b", baseItemId: 1,
          slotWidth: 1, slotHeight: 1, x: 1, y: 0, infinite: false,
        },
      ],
    },
    { bucketTypeId: 4, entries: [] },
    { bucketTypeId: 2, entries: [] },
    { bucketTypeId: 3, entries: [] },
    { bucketTypeId: 1, entries: [] },
  ] as const;
  const source = {
    type: "aurora_git",
    sourceKind: "store",
    sourceIndex: 0,
    sourceObjectId: "obj_store_0",
    storeInventory: {
      expectedBuckets,
      tableSha256: "e".repeat(64),
      tableRowCount: 2,
    },
  } as const;
  const target = [
    {
      bucketTypeId: 0,
      entries: [
        { sourceIndex: 1, resRef: "itm_b", baseItemId: 1, infinite: true },
        { sourceIndex: 0, resRef: "itm_a", baseItemId: 0, infinite: false },
      ],
    },
    { bucketTypeId: 4, entries: [] },
    { bucketTypeId: 2, entries: [] },
    { bucketTypeId: 3, entries: [] },
    { bucketTypeId: 1, entries: [] },
  ] as const;

  it("retains exact provenance and independently edited five-bucket targets", () => {
    const value = {
      ...scene(),
      itemBaseItemCatalog,
      objects: [storeSceneObject({
        source,
        storeProperties: { comments: "", inventoryBuckets: target },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["missing catalog", undefined, source, target],
    ["stale dimension", {
      ...itemBaseItemCatalog,
      rows: itemBaseItemCatalog.rows.map((row, index) => index === 0
        ? { ...row, invSlotWidth: 2 }
        : row),
    }, source, target],
    ["identity edit", itemBaseItemCatalog, source, target.map((bucket, index) => index === 0
      ? {
          ...bucket,
          entries: bucket.entries.map((entry, entryIndex) => entryIndex === 0
            ? { ...entry, resRef: "different" }
            : entry),
        }
      : bucket)],
    ["target without provenance", itemBaseItemCatalog, {
      type: "aurora_git", sourceKind: "store", sourceIndex: 0,
    }, target],
  ])("rejects %s", (_label, catalog, storeSource, inventoryBuckets) => {
    expect(parseAreaScene({
      ...scene(),
      ...(catalog ? { itemBaseItemCatalog: catalog } : {}),
      objects: [storeSceneObject({
        source: storeSource,
        storeProperties: { comments: "", inventoryBuckets },
      })],
    })).toBeNull();
  });
});

describe("Area workspace ground-item Tag draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "item",
    sourceIndex: 0,
    sourceObjectId: "obj_item_0",
    itemTag: { present: true, value: "NW_SWORD" },
  } as const;

  it("retains exact present provenance and a verbatim editable target", () => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({
        tag: "  WEST_WALL_LOOT  ",
        source: exactSource,
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains exact absent provenance as preserve-only", () => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({
        source: { ...exactSource, itemTag: { present: false } },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", { ...exactSource, sourceKind: "creature" }, "NEW_TAG"],
    ["missing source ordinal", { ...exactSource, sourceIndex: undefined }, "NEW_TAG"],
    ["malformed presence", { ...exactSource, itemTag: { present: true } }, "NEW_TAG"],
    ["unexpected absent value", {
      ...exactSource,
      itemTag: { present: false, value: "INVENTED" },
    }, "NEW_TAG"],
    ["over-budget target", exactSource, "x".repeat(33)],
    ["NUL-bearing target", exactSource, "bad\0tag"],
  ])("rejects %s", (_label, source, tag) => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({ source, tag })],
    };

    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace ground-item TemplateResRef draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "item",
    sourceIndex: 0,
    sourceObjectId: "obj_item_0",
    itemTemplateResRef: {
      present: true,
      nativeType: "resref",
      value: "nw_sword",
    },
  } as const;

  it("retains exact present provenance and one canonical changed target", () => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({
        resRef: "custom_sword",
        source: exactSource,
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains exact absent provenance as preserve-only", () => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({
        resRef: "display_fallback",
        source: {
          ...exactSource,
          itemTemplateResRef: { present: false },
        },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", { ...exactSource, sourceKind: "creature" }, "custom_sword"],
    ["wrong source type", { ...exactSource, type: "seed" }, "custom_sword"],
    ["missing source ordinal", { ...exactSource, sourceIndex: undefined }, "custom_sword"],
    ["malformed present storage", {
      ...exactSource,
      itemTemplateResRef: { present: true, nativeType: "resref" },
    }, "custom_sword"],
    ["wrong native type", {
      ...exactSource,
      itemTemplateResRef: { present: true, nativeType: "cexostring", value: "nw_sword" },
    }, "custom_sword"],
    ["unexpected absent value", {
      ...exactSource,
      itemTemplateResRef: { present: false, value: "nw_sword" },
    }, "custom_sword"],
    ["uppercase target", exactSource, "CUSTOM_SWORD"],
    ["invalid-character target", exactSource, "custom-sword"],
    ["over-budget target", exactSource, "x".repeat(17)],
  ])("rejects %s", (_label, source, resRef) => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({ source, resRef })],
    };

    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace ground-item instance-state draft boundary", () => {
  const exactStorage = {
    presentFields: ["charges", "plot"],
    values: {
      charges: 7,
      cost: 0,
      stolen: false,
      stackSize: 1,
      plot: true,
      addCost: 0,
      identified: false,
      cursed: false,
    },
  } as const;
  const exactSource = {
    type: "aurora_git",
    sourceKind: "item",
    sourceIndex: 0,
    sourceObjectId: "obj_item_0",
    itemInstanceState: exactStorage,
  } as const;
  const exactTarget = {
    charges: 8,
    cost: 12,
    stolen: true,
    stackSize: 2,
    plot: false,
    addCost: 3,
    identified: true,
    cursed: true,
  } as const;

  it("retains exact storage presence and one complete changed target tuple", () => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({
        source: exactSource,
        itemProperties: exactTarget,
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", { ...exactSource, sourceKind: "placeable" }, exactTarget],
    ["missing source ordinal", { ...exactSource, sourceIndex: undefined }, exactTarget],
    ["noncanonical presence order", {
      ...exactSource,
      itemInstanceState: { ...exactStorage, presentFields: ["plot", "charges"] },
    }, exactTarget],
    ["nondefault absent source value", {
      ...exactSource,
      itemInstanceState: {
        presentFields: [],
        values: { ...exactStorage.values, charges: 7, plot: false },
      },
    }, exactTarget],
    ["missing target member", exactSource, { ...exactTarget, charges: undefined }],
    ["out-of-range target member", exactSource, { ...exactTarget, stackSize: 0x1_0000 }],
    ["wrong target scalar type", exactSource, { ...exactTarget, stolen: 1 }],
  ])("rejects %s", (_label, source, target) => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({ source, itemProperties: target })],
    };

    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace ground-item localized-string draft boundary", () => {
  const exactStrings = {
    localizedName: {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "U3dvcmQ=" }],
    },
    description: {
      present: true,
      strRef: 0xffff_ffff,
      entries: [],
    },
    identifiedDescription: {
      present: true,
      strRef: 42,
      entries: [],
    },
  } as const;
  const exactSource = {
    type: "aurora_git",
    sourceKind: "item",
    sourceIndex: 0,
    sourceObjectId: "obj_item_0",
    itemLocalizedStrings: exactStrings,
  } as const;
  const exactTarget = {
    localizedName: " Exact Sword ",
    description: "Exact description",
    identifiedDescription: "TLK-backed display fallback",
  } as const;

  it("retains the complete source triple and independently admitted targets", () => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({
        source: exactSource,
        itemProperties: exactTarget,
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", { ...exactSource, sourceKind: "placeable" }, exactTarget],
    ["missing source ordinal", { ...exactSource, sourceIndex: undefined }, exactTarget],
    ["incomplete source triple", {
      ...exactSource,
      itemLocalizedStrings: {
        localizedName: exactStrings.localizedName,
        description: exactStrings.description,
      },
    }, exactTarget],
    ["missing target member", exactSource, { ...exactTarget, description: undefined }],
    ["non-ASCII admitted target", exactSource, { ...exactTarget, localizedName: "Żółć" }],
    ["over-budget admitted target", exactSource, {
      ...exactTarget,
      description: "x".repeat(4_097),
    }],
    ["non-string preserve-only target", exactSource, {
      ...exactTarget,
      identifiedDescription: 42,
    }],
  ])("rejects %s", (_label, source, target) => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({ source, itemProperties: target })],
    };

    expect(parseAreaScene(value)).toBeNull();
  });
});

describe("Area workspace Creature Tag draft boundary", () => {
  it("retains exact present provenance and a verbatim editable target", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        tag: "  NW_CHICKEN_RENAMED  ",
        source: {
          type: "aurora_git",
          sourceKind: "creature",
          sourceIndex: 0,
          sourceObjectId: "obj_creature_0",
          creatureTag: { present: true, value: "NW_CHICKEN" },
        },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains exact absence without treating the display Tag as an authored value", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        tag: "DISPLAY_FALLBACK",
        source: {
          type: "aurora_git",
          sourceKind: "creature",
          sourceIndex: 0,
          sourceObjectId: "obj_creature_0",
          creatureTag: { present: false },
        },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong family", {
      source: {
        type: "aurora_git", sourceKind: "placeable", sourceIndex: 0,
        sourceObjectId: "obj_creature_0", creatureTag: { present: true, value: "NW_CHICKEN" },
      },
    }],
    ["missing ordinal", {
      source: {
        type: "aurora_git", sourceKind: "creature",
        sourceObjectId: "obj_creature_0", creatureTag: { present: true, value: "NW_CHICKEN" },
      },
    }],
    ["malformed source", {
      source: {
        type: "aurora_git", sourceKind: "creature", sourceIndex: 0,
        sourceObjectId: "obj_creature_0", creatureTag: { present: true, value: "x".repeat(33) },
      },
    }],
    ["invalid target", {
      tag: "bad\0tag",
      source: {
        type: "aurora_git", sourceKind: "creature", sourceIndex: 0,
        sourceObjectId: "obj_creature_0", creatureTag: { present: true, value: "NW_CHICKEN" },
      },
    }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject(overrides)],
    })).toBeNull();
  });
});

describe("Area workspace Creature Conversation draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureConversation: { present: true, value: "Guard_Dialog" },
  } as const;

  it("retains exact source storage and one canonical lowercase editable target", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { conversation: "guard_dialog" },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains canonical absence without treating loose presentation as authored state", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: { ...exactSource, creatureConversation: { present: false } },
        creatureProperties: { conversation: "Loose-Display" },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong family", {
      source: { ...exactSource, sourceKind: "placeable" },
      creatureProperties: { conversation: "guard_dialog" },
    }],
    ["missing ordinal", {
      source: { ...exactSource, sourceIndex: undefined },
      creatureProperties: { conversation: "guard_dialog" },
    }],
    ["malformed source", {
      source: { ...exactSource, creatureConversation: { present: true, value: "bad-dialog" } },
      creatureProperties: { conversation: "guard_dialog" },
    }],
    ["noncanonical target", {
      source: exactSource,
      creatureProperties: { conversation: "Guard_Dialog" },
    }],
    ["missing target", {
      source: exactSource,
      creatureProperties: {},
    }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject(overrides as never)],
    })).toBeNull();
  });
});

describe("Area workspace Creature Interruptable draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureInterruptable: { present: true, value: 1 },
  } as const;

  it("retains exact source storage and one inverse boolean editable target", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { noInterrupt: true },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains canonical absence without requiring a presentation target", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: { ...exactSource, creatureInterruptable: { present: false } },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong family", {
      source: { ...exactSource, sourceKind: "placeable" },
      creatureProperties: { noInterrupt: true },
    }],
    ["missing ordinal", {
      source: { ...exactSource, sourceIndex: undefined },
      creatureProperties: { noInterrupt: true },
    }],
    ["malformed source", {
      source: { ...exactSource, creatureInterruptable: { present: true, value: 2 } },
      creatureProperties: { noInterrupt: true },
    }],
    ["non-boolean target", {
      source: exactSource,
      creatureProperties: { noInterrupt: 1 },
    }],
    ["missing target", {
      source: exactSource,
      creatureProperties: {},
    }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject(overrides as never)],
    })).toBeNull();
  });
});

describe("Area workspace Creature advanced flag draft boundary", () => {
  const exactFlags = {
    disarmable: { present: true, value: 1 },
    plot: { present: true, value: 0 },
    immortal: { present: true, value: 1 },
    lootable: { present: true, value: 0 },
    noPermanentDeath: { present: true, value: 1 },
  } as const;
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureAdvancedFlags: exactFlags,
  } as const;
  const advancedSettings = {
    disarmable: true,
    plot: false,
    immortal: true,
    leavesLootableCorpse: false,
    noPermanentDeath: true,
  };

  it("retains exact source storage and all five direct-polarity boolean targets", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { advancedSettings },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains canonical absence without requiring presentation targets", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: {
          ...exactSource,
          creatureAdvancedFlags: {
            disarmable: { present: false },
            plot: { present: false },
            immortal: { present: false },
            lootable: { present: false },
            noPermanentDeath: { present: false },
          },
        },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong family", {
      source: { ...exactSource, sourceKind: "placeable" },
      creatureProperties: { advancedSettings },
    }],
    ["missing ordinal", {
      source: { ...exactSource, sourceIndex: undefined },
      creatureProperties: { advancedSettings },
    }],
    ["malformed source", {
      source: {
        ...exactSource,
        creatureAdvancedFlags: { ...exactFlags, plot: { present: true, value: 2 } },
      },
      creatureProperties: { advancedSettings },
    }],
    ["missing target", {
      source: exactSource,
      creatureProperties: {
        advancedSettings: {
          disarmable: true,
          plot: false,
          immortal: true,
          leavesLootableCorpse: false,
        },
      },
    }],
    ["non-boolean target", {
      source: exactSource,
      creatureProperties: {
        advancedSettings: { ...advancedSettings, leavesLootableCorpse: 0 },
      },
    }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject(overrides as never)],
    })).toBeNull();
  });
});

describe("Area workspace Creature death-remains draft boundary", () => {
  const tableSha256 = "e".repeat(64);
  const bodyBagCatalog = {
    descriptor: {
      resourceName: "bodybag.2da",
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/bodybag.2da",
      sourceLayer: "vanilla",
      sha256: tableSha256,
      sizeBytes: 502,
      rowCount: 3,
    },
    rows: [
      { rowIndex: 0, label: "Default", nameStrRef: 1, displayName: "Default", displaySource: "label" },
      { rowIndex: 1, label: "Bag", nameStrRef: 2, displayName: "Bag", displaySource: "label" },
      { rowIndex: 2, label: "Pile", nameStrRef: 3, displayName: "Pile", displaySource: "label" },
    ],
  } as const;
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureAdvancedFlags: {
      disarmable: { present: false },
      plot: { present: false },
      immortal: { present: false },
      lootable: { present: true, value: 1 },
      noPermanentDeath: { present: false },
    },
    creatureBodyBag: {
      expectedValue: 2,
      tableSha256,
      tableRowCount: 3,
    },
    creatureDecayTime: { expectedMilliseconds: 12_000 },
  } as const;

  it("retains independent exact CAS provenance and canonical numeric targets", () => {
    const value = {
      ...scene(),
      placeableBodyBagCatalog: bodyBagCatalog,
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: {
          advancedSettings: {
            leavesLootableCorpse: false,
            treasureModelRow: 1,
            corpseDecayTimeSeconds: 15,
          },
        },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["stale bodybag catalog digest", {
      source: {
        ...exactSource,
        creatureBodyBag: { ...exactSource.creatureBodyBag, tableSha256: "f".repeat(64) },
      },
      advancedSettings: {
        leavesLootableCorpse: false, treasureModelRow: 1, corpseDecayTimeSeconds: 15,
      },
    }],
    ["missing bodybag target", {
      source: exactSource,
      advancedSettings: { leavesLootableCorpse: false, corpseDecayTimeSeconds: 15 },
    }],
    ["unknown bodybag target row", {
      source: exactSource,
      advancedSettings: {
        leavesLootableCorpse: false, treasureModelRow: 3, corpseDecayTimeSeconds: 15,
      },
    }],
    ["noncanonical decay provenance", {
      source: { ...exactSource, creatureDecayTime: { expectedMilliseconds: 12_001 } },
      advancedSettings: {
        leavesLootableCorpse: false, treasureModelRow: 1, corpseDecayTimeSeconds: 15,
      },
    }],
    ["out-of-range decay target", {
      source: exactSource,
      advancedSettings: {
        leavesLootableCorpse: false, treasureModelRow: 1, corpseDecayTimeSeconds: 4,
      },
    }],
    ["unproven retained bodybag target", {
      source: {
        type: "aurora_git", sourceKind: "creature", sourceIndex: 0,
        sourceObjectId: "obj_creature_0",
      },
      advancedSettings: { treasureModelRow: 1 },
    }],
  ])("rejects %s", (_label, fixture) => {
    expect(parseAreaScene({
      ...scene(),
      placeableBodyBagCatalog: bodyBagCatalog,
      objects: [creatureSceneObject({
        source: fixture.source,
        creatureProperties: { advancedSettings: fixture.advancedSettings },
      })],
    })).toBeNull();
  });
});

describe("Area workspace Creature Appearance draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureAppearance: {
      present: true,
      nativeType: "word",
      value: 249,
      table: {
        resourceName: "appearance.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/appearance.2da",
        sourceLayer: "vanilla",
        sha256: "a".repeat(64),
        sizeBytes: 200_000,
        rowCount: 1_000,
        rowIndex: 249,
      },
    },
  } as const;

  it("retains exact source storage and a bounded numeric target", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { appearanceType: 52 },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains canonical absence without authorizing loose presentation", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: { ...exactSource, creatureAppearance: { present: false } },
        creatureProperties: { appearance: "loose-display" },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong family", { source: { ...exactSource, sourceKind: "placeable" }, creatureProperties: { appearanceType: 52 } }],
    ["missing ordinal", { source: { ...exactSource, sourceIndex: undefined }, creatureProperties: { appearanceType: 52 } }],
    ["malformed source", {
      source: {
        ...exactSource,
        creatureAppearance: { ...exactSource.creatureAppearance, nativeType: "dword" },
      },
      creatureProperties: { appearanceType: 52 },
    }],
    ["missing target", { source: exactSource, creatureProperties: {} }],
    ["noninteger target", { source: exactSource, creatureProperties: { appearanceType: 52.5 } }],
    ["out-of-table target", { source: exactSource, creatureProperties: { appearanceType: 1_000 } }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject(overrides)],
    })).toBeNull();
  });
});

describe("Area workspace Creature Gender draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureGender: {
      present: true,
      nativeType: "byte",
      value: 4,
      table: {
        resourceName: "gender.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/gender.2da",
        sourceLayer: "vanilla",
        sha256: "c".repeat(64),
        sizeBytes: 250,
        rowCount: 5,
        rowIndex: 4,
      },
    },
  } as const;

  it("retains exact source storage and a bounded numeric target", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { genderId: 0 },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains canonical absence without authorizing loose presentation", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: { ...exactSource, creatureGender: { present: false } },
        creatureProperties: { gender: "loose-display" },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong family", { source: { ...exactSource, sourceKind: "placeable" }, creatureProperties: { genderId: 0 } }],
    ["missing ordinal", { source: { ...exactSource, sourceIndex: undefined }, creatureProperties: { genderId: 0 } }],
    ["malformed source", {
      source: {
        ...exactSource,
        creatureGender: { ...exactSource.creatureGender, nativeType: "word" },
      },
      creatureProperties: { genderId: 0 },
    }],
    ["missing target", { source: exactSource, creatureProperties: {} }],
    ["noninteger target", { source: exactSource, creatureProperties: { genderId: 0.5 } }],
    ["out-of-table target", { source: exactSource, creatureProperties: { genderId: 5 } }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject(overrides)],
    })).toBeNull();
  });
});

describe("Area workspace Creature PerceptionRange draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creaturePerceptionRange: {
      present: true,
      nativeType: "byte",
      value: 11,
      table: {
        resourceName: "ranges.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/ranges.2da",
        sourceLayer: "vanilla",
        sha256: "d".repeat(64),
        sizeBytes: 1220,
        rowCount: 13,
        rowIndex: 11,
      },
    },
  } as const;

  it("retains exact source storage and one Toolset-admitted target row", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { advancedSettings: { perceptionRangeId: 9 } },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it("keeps unbound storage preserve-only", () => {
    const unboundSource = {
      ...exactSource,
      creaturePerceptionRange: {
        present: true as const,
        nativeType: "byte" as const,
        value: 11,
      },
    };
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source: unboundSource,
        creatureProperties: { advancedSettings: { perceptionRangeId: 11 } },
      })],
    })).not.toBeNull();
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source: unboundSource,
        creatureProperties: { advancedSettings: { perceptionRangeId: 9 } },
      })],
    })).toBeNull();
  });

  it.each([
    ["wrong native type", {
      source: {
        ...exactSource,
        creaturePerceptionRange: { ...exactSource.creaturePerceptionRange, nativeType: "word" },
      },
      creatureProperties: { advancedSettings: { perceptionRangeId: 9 } },
    }],
    ["invented target row", {
      source: exactSource,
      creatureProperties: { advancedSettings: { perceptionRangeId: 7 } },
    }],
    ["missing target", { source: exactSource, creatureProperties: { advancedSettings: {} } }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject(overrides)],
    })).toBeNull();
  });
});

describe("Area workspace Creature WalkRate draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureWalkRate: {
      present: true,
      nativeType: "int",
      value: 4,
      table: {
        resourceName: "creaturespeed.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/creaturespeed.2da",
        sourceLayer: "vanilla",
        sha256: "e".repeat(64),
        sizeBytes: 4_096,
        rowCount: 9,
        rowIndex: 4,
        twoDaName: "NORM",
      },
    },
  } as const;

  it("retains exact source storage and one Toolset-admitted target row", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { advancedSettings: { walkRateId: 2 } },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it("keeps unbound storage preserve-only", () => {
    const unboundSource = {
      ...exactSource,
      creatureWalkRate: {
        present: true as const,
        nativeType: "int" as const,
        value: 4,
      },
    };
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source: unboundSource,
        creatureProperties: { advancedSettings: { walkRateId: 4 } },
      })],
    })).not.toBeNull();
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source: unboundSource,
        creatureProperties: { advancedSettings: { walkRateId: 2 } },
      })],
    })).toBeNull();
  });

  it.each([
    ["wrong native type", {
      source: {
        ...exactSource,
        creatureWalkRate: { ...exactSource.creatureWalkRate, nativeType: "byte" },
      },
      creatureProperties: { advancedSettings: { walkRateId: 2 } },
    }],
    ["row zero", {
      source: exactSource,
      creatureProperties: { advancedSettings: { walkRateId: 0 } },
    }],
    ["missing target", { source: exactSource, creatureProperties: { advancedSettings: {} } }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject(overrides)],
    })).toBeNull();
  });
});

describe("Area workspace Creature SoundSetFile draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureSoundSetFile: {
      present: true,
      nativeType: "word",
      value: 0,
      table: {
        resourceName: "soundset.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/soundset.2da",
        sourceLayer: "vanilla",
        sha256: "a".repeat(64),
        sizeBytes: 336_678,
        rowCount: 5_100,
        rowIndex: 0,
        resRef: "c_aasimar",
      },
    },
  } as const;

  it("retains exact source storage and one catalog candidate including row zero", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { advancedSettings: { soundSetFile: 27 } },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it("keeps unbound storage preserve-only", () => {
    const unboundSource = {
      ...exactSource,
      creatureSoundSetFile: {
        present: true as const,
        nativeType: "word" as const,
        value: 0,
      },
    };
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source: unboundSource,
        creatureProperties: { advancedSettings: { soundSetFile: 0 } },
      })],
    })).not.toBeNull();
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source: unboundSource,
        creatureProperties: { advancedSettings: { soundSetFile: 27 } },
      })],
    })).toBeNull();
  });

  it.each([
    ["wrong native type", {
      source: {
        ...exactSource,
        creatureSoundSetFile: { ...exactSource.creatureSoundSetFile, nativeType: "int" },
      },
      creatureProperties: { advancedSettings: { soundSetFile: 27 } },
    }],
    ["outside Word", {
      source: exactSource,
      creatureProperties: { advancedSettings: { soundSetFile: 65_536 } },
    }],
    ["missing target", { source: exactSource, creatureProperties: { advancedSettings: {} } }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject(overrides)],
    })).toBeNull();
  });
});

describe("Area workspace Creature StartingPackage draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureStartingPackage: {
      present: true,
      nativeType: "byte",
      value: 0,
      classIds: [4],
      table: {
        resourceName: "packages.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
        sourceLayer: "vanilla",
        sha256: "c".repeat(64),
        sizeBytes: 30_510,
        rowCount: 132,
        rowIndex: 0,
        classId: 4,
      },
    },
  } as const;

  it("retains exact source storage and one ClassList-compatible candidate", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { advancedSettings: { startingPackageId: 2 } },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("keeps class- or table-unbound storage preserve-only", () => {
    for (const creatureStartingPackage of [
      { present: true as const, nativeType: "byte" as const, value: 0 },
      { present: true as const, nativeType: "byte" as const, value: 0, classIds: [4] },
    ]) {
      const unboundSource = { ...exactSource, creatureStartingPackage };
      expect(parseAreaScene({
        ...scene(),
        objects: [creatureSceneObject({
          source: unboundSource,
          creatureProperties: { advancedSettings: { startingPackageId: 0 } },
        })],
      })).not.toBeNull();
      expect(parseAreaScene({
        ...scene(),
        objects: [creatureSceneObject({
          source: unboundSource,
          creatureProperties: { advancedSettings: { startingPackageId: 2 } },
        })],
      })).toBeNull();
    }
  });

  it.each([
    ["wrong native type", {
      source: {
        ...exactSource,
        creatureStartingPackage: { ...exactSource.creatureStartingPackage, nativeType: "word" },
      },
      creatureProperties: { advancedSettings: { startingPackageId: 2 } },
    }],
    ["outside Byte", {
      source: exactSource,
      creatureProperties: { advancedSettings: { startingPackageId: 256 } },
    }],
    ["missing target", { source: exactSource, creatureProperties: { advancedSettings: {} } }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject(overrides)],
    })).toBeNull();
  });
});

describe("Area workspace Creature PortraitId draft boundary", () => {
  const descriptor = {
    resourceName: "portraits.2da",
    sourceObjectKey: "runtime-source/vanilla/nwn_base.key/portraits.2da",
    sourceLayer: "vanilla",
    sha256: "f".repeat(64),
    sizeBytes: 100_000,
    rowCount: 16_001,
  } as const;
  const catalog = {
    descriptor,
    rows: [
      { rowIndex: 10, baseResRef: "po_hm_guard", sex: 0, race: 6, plot: 0 },
      { rowIndex: 11, baseResRef: "po_em_guard", sex: 0, race: 1, plot: 0 },
      { rowIndex: 12, baseResRef: "po_hf_guard", sex: 1, race: 6, plot: 0 },
    ],
  } as const;
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creaturePortrait: {
      present: true,
      nativeType: "word",
      value: 10,
      selectorContext: { genderValue: 0, raceValue: 4 },
      table: { ...descriptor, rowIndex: 10, baseResRef: "po_hm_guard" },
    },
  } as const;

  it("retains one admitted physical row with its exact display ResRef", () => {
    const value = {
      ...scene(),
      creaturePortraitCatalog: catalog,
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: {
          genderId: 0,
          portraitId: 11,
          portraitResRef: "po_em_guard",
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong Sex", 12, "po_hf_guard", catalog],
    ["wrong ResRef", 11, "po_hm_guard", catalog],
    ["stale digest", 11, "po_em_guard", {
      ...catalog,
      descriptor: { ...descriptor, sha256: "e".repeat(64) },
    }],
  ])("rejects %s instead of persisting an unbound selector result", (
    _label,
    portraitId,
    portraitResRef,
    creaturePortraitCatalog,
  ) => {
    expect(parseAreaScene({
      ...scene(),
      creaturePortraitCatalog,
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { genderId: 0, portraitId, portraitResRef },
      })],
    })).toBeNull();
  });
});

describe("Area workspace Creature ChallengeRating draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureChallengeRating: {
      present: true,
      nativeType: "float",
      value: 11.5,
    },
  } as const;

  it("retains exact source storage and an admitted decimal target", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { challengeRating: 0.1 },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains canonical absence without authorizing loose presentation", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: { ...exactSource, creatureChallengeRating: { present: false } },
        creatureProperties: { challengeRating: 99 },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong family", {
      source: { ...exactSource, sourceKind: "placeable" },
      creatureProperties: { challengeRating: 1 },
    }],
    ["missing ordinal", {
      source: { ...exactSource, sourceIndex: undefined },
      creatureProperties: { challengeRating: 1 },
    }],
    ["malformed source", {
      source: {
        ...exactSource,
        creatureChallengeRating: {
          ...exactSource.creatureChallengeRating,
          nativeType: "dword",
        },
      },
      creatureProperties: { challengeRating: 1 },
    }],
    ["missing target", { source: exactSource, creatureProperties: {} }],
    ["negative target", { source: exactSource, creatureProperties: { challengeRating: -1 } }],
    ["negative zero target", { source: exactSource, creatureProperties: { challengeRating: -0 } }],
    ["over-budget target", { source: exactSource, creatureProperties: { challengeRating: 1_001 } }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject(overrides)],
    })).toBeNull();
  });
});

describe("Area workspace Creature base ability-score draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureAbilityScores: {
      strength: { present: true, nativeType: "byte", value: 15 },
      dexterity: { present: true, nativeType: "byte", value: 12 },
      constitution: { present: true, nativeType: "byte", value: 14 },
      intelligence: { present: false },
      wisdom: { present: true, nativeType: "byte", value: 11 },
      charisma: { present: true, nativeType: "byte", value: 8 },
    },
  } as const;
  const abilityScores = {
    strength: 17,
    dexterity: 12,
    constitution: 14,
    intelligence: 999,
    wisdom: 11,
    charisma: 10,
  };

  it("retains exact source storage and validates targets only for present members", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { statistics: { abilityScores } },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["missing present target", {
      strength: undefined,
    }],
    ["negative present target", { strength: -1 }],
    ["oversized present target", { charisma: 256 }],
    ["fractional present target", { wisdom: 11.5 }],
  ])("rejects %s", (_label, overrides) => {
    const target = { ...abilityScores, ...overrides };
    if (target.strength === undefined) delete (target as Partial<typeof target>).strength;
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { statistics: { abilityScores: target } },
      })],
    })).toBeNull();
  });

  it("rejects a malformed exact source group", () => {
    const malformedSource = structuredClone(exactSource) as any;
    malformedSource.creatureAbilityScores.strength.nativeType = "word";
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source: malformedSource,
        creatureProperties: { statistics: { abilityScores } },
      })],
    })).toBeNull();
  });

  it("rejects a retained Constitution mutation without coupled HP provenance", () => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: {
          statistics: {
            abilityScores: { ...abilityScores, constitution: 16 },
          },
        },
      })],
    })).toBeNull();
  });
});

describe("Area workspace Creature appearance-color draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureAppearanceColors: {
      skin: { present: true, nativeType: "byte", value: 11 },
      hair: { present: true, nativeType: "byte", value: 22 },
      tattoo1: { present: false },
      tattoo2: { present: true, nativeType: "byte", value: 44 },
    },
  } as const;
  const colors = { skin: "12", hair: "22", tattoo1: "not-owned", tattoo2: "45" };

  it("retains exact source storage and validates canonical targets only for present members", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { appearanceSettings: { colors } },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["missing present target", { skin: undefined }],
    ["leading-zero target", { skin: "012" }],
    ["negative target", { skin: "-1" }],
    ["oversized target", { tattoo2: "256" }],
    ["fractional target", { hair: "22.5" }],
  ])("rejects %s", (_label, overrides) => {
    const target = { ...colors, ...overrides };
    if (target.skin === undefined) delete (target as Partial<typeof target>).skin;
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { appearanceSettings: { colors: target } },
      })],
    })).toBeNull();
  });

  it("rejects a malformed exact source group", () => {
    const malformedSource = structuredClone(exactSource) as any;
    malformedSource.creatureAppearanceColors.hair.nativeType = "word";
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source: malformedSource,
        creatureProperties: { appearanceSettings: { colors } },
      })],
    })).toBeNull();
  });
});

describe("Area workspace Creature body-part compatibility boundary", () => {
  const bodyParts = Object.fromEntries(
    CREATURE_BODY_PART_FIELDS.map(({ key }) => [key, { present: false }]),
  ) as Record<string, any>;
  bodyParts.rightFoot = {
    present: true,
    value: 12,
    legacyByte: { present: true, nativeType: "byte", value: 12 },
    wideWord: { present: false },
  };
  bodyParts.torso = {
    present: true,
    value: 4096,
    legacyByte: { present: true, nativeType: "byte", value: 0 },
    wideWord: { present: true, nativeType: "word", value: 4096 },
  };
  bodyParts.rightShoulder = {
    present: true,
    value: 1023,
    legacyByte: { present: false },
    wideWord: { present: true, nativeType: "word", value: 1023 },
  };
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureBodyParts: bodyParts,
  } as const;

  it("retains exact source storage and canonical direct/source-only targets", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: {
          appearanceSettings: {
            partBasedAppearance: true,
            rightFoot: "13",
            torso: "5000",
            leftFoot: "not-owned",
            sourceOnlyParts: { rightShoulder: "1024", robe: "preserve" },
          },
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["byte overflow", { rightFoot: "256", torso: "5000" }],
    ["noncanonical decimal", { rightFoot: "013", torso: "5000" }],
    ["missing wide target", { rightFoot: "13" }],
  ])("rejects %s", (_label, appearanceSettings) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: {
          appearanceSettings: {
            partBasedAppearance: true,
            ...appearanceSettings,
            sourceOnlyParts: { rightShoulder: "1024" },
          },
        },
      })],
    })).toBeNull();
  });
});

describe("Area workspace Creature appendage boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureAppendages: {
      wings: {
        present: true,
        value: 1,
        modernDword: {
          present: true,
          nativeType: "dword",
          value: 1,
          table: {
            resourceName: "wingmodel.2da",
            sourceObjectKey: "runtime-source/vanilla/nwn_base.key/wingmodel.2da",
            sourceLayer: "vanilla",
            sha256: "a".repeat(64),
            sizeBytes: 1_024,
            rowCount: 8,
            rowIndex: 1,
          },
        },
        legacyByte: { present: true, nativeType: "byte", value: 2 },
      },
      tail: {
        present: true,
        value: 3,
        modernDword: { present: false },
        legacyByte: { present: true, nativeType: "byte", value: 3 },
      },
    },
  } as const;

  it("accepts a changed in-range modern row while preserving a legacy-only member", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: {
          appearanceSettings: { wings: "7", tail: "3" },
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["out-of-range modern row", { wings: "8", tail: "3" }],
    ["noncanonical modern row", { wings: "07", tail: "3" }],
    ["changed legacy-only row", { wings: "7", tail: "4" }],
  ])("rejects %s", (_label, appearanceSettings) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { appearanceSettings },
      })],
    })).toBeNull();
  });
});

describe("Area workspace Creature coupled HP draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureAbilityScores: {
      strength: { present: false },
      dexterity: { present: false },
      constitution: { present: true, nativeType: "byte", value: 14 },
      intelligence: { present: false },
      wisdom: { present: false },
      charisma: { present: false },
    },
    creatureHitPointState: {
      present: true,
      hitPoints: { nativeType: "short", value: 20 },
      currentHitPoints: { nativeType: "short", value: 77 },
      maxHitPoints: { nativeType: "short", value: 88 },
      constitution: { nativeType: "byte", value: 14 },
      race: { nativeType: "byte", value: 1 },
      classLevels: [3, 2],
      featRow40Present: false,
      racialTypes: {
        resourceName: "racialtypes.2da",
        sourceObjectKey: "runtime-source/module/racialtypes.2da",
        sourceLayer: "module",
        sha256: "a".repeat(64),
        sizeBytes: 400,
        rowCount: 3,
        rowIndex: 1,
        constitutionAdjust: 0,
      },
    },
  } as const;
  const abilityScores = {
    strength: 10,
    dexterity: 10,
    constitution: 16,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  };
  const statistics = {
    abilityScores,
    baseHitPoints: 25,
    hitPointBonuses: 15,
    currentHitPoints: 15,
    maxHitPoints: 40,
  };

  it("retains one self-consistent Base HP/Constitution target", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { statistics },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains one same-roster ClassLevel target with its derived HP values", () => {
    const source = {
      ...exactSource,
      creatureClassLevelState: {
        present: true,
        nativeType: "list",
        structTypeId: 2,
        classNativeType: "int",
        levelNativeType: "short",
        entries: [
          { classId: 4, level: 3, opaqueSiblingFieldCount: 2 },
          { classId: 7, level: 2, opaqueSiblingFieldCount: 1 },
        ],
      },
    } as const;
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source,
        creatureProperties: {
          classEntries: [
            { classId: 4, className: "Fighter", level: 4 },
            { classId: 7, className: "Wizard", level: 3 },
          ],
          statistics: {
            abilityScores: { ...abilityScores, constitution: 14 },
            baseHitPoints: 20,
            hitPointBonuses: 14,
            currentHitPoints: 16,
            maxHitPoints: 34,
          },
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
    expect(parseAreaScene({
      ...value,
      objects: [{
        ...value.objects[0],
        creatureProperties: {
          ...value.objects[0]!.creatureProperties,
          classEntries: [
            { classId: 7, className: "Wizard", level: 4 },
            { classId: 4, className: "Fighter", level: 3 },
          ],
        },
      }],
    })).toBeNull();
  });

  it.each([
    ["direct bonus mutation", { ...statistics, hitPointBonuses: 16 }],
    ["stale CurrentHitPoints", { ...statistics, currentHitPoints: 16 }],
    ["stale MaxHitPoints", { ...statistics, maxHitPoints: 41 }],
    ["below dynamic minimum", {
      ...statistics,
      abilityScores: { ...abilityScores, constitution: 4 },
      baseHitPoints: 19,
      hitPointBonuses: -14,
      currentHitPoints: 44,
      maxHitPoints: 5,
    }],
  ])("rejects %s", (_label, targetStatistics) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { statistics: targetStatistics },
      })],
    })).toBeNull();
  });
});

describe("Area workspace Creature NaturalAC draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureNaturalArmorClass: {
      present: true,
      nativeType: "byte",
      value: 0,
    },
  } as const;

  it("retains exact source storage and an admitted Byte target", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { statistics: { naturalArmorClass: 2 } },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains canonical absence without authorizing loose presentation", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: { ...exactSource, creatureNaturalArmorClass: { present: false } },
        creatureProperties: { statistics: { naturalArmorClass: 99 } },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong family", {
      source: { ...exactSource, sourceKind: "placeable" },
      creatureProperties: { statistics: { naturalArmorClass: 2 } },
    }],
    ["missing ordinal", {
      source: { ...exactSource, sourceIndex: undefined },
      creatureProperties: { statistics: { naturalArmorClass: 2 } },
    }],
    ["malformed source", {
      source: {
        ...exactSource,
        creatureNaturalArmorClass: {
          ...exactSource.creatureNaturalArmorClass,
          nativeType: "word",
        },
      },
      creatureProperties: { statistics: { naturalArmorClass: 2 } },
    }],
    ["missing target", { source: exactSource, creatureProperties: { statistics: {} } }],
    ["negative target", {
      source: exactSource,
      creatureProperties: { statistics: { naturalArmorClass: -1 } },
    }],
    ["fractional target", {
      source: exactSource,
      creatureProperties: { statistics: { naturalArmorClass: 1.5 } },
    }],
    ["oversized target", {
      source: exactSource,
      creatureProperties: { statistics: { naturalArmorClass: 256 } },
    }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject(overrides)],
    })).toBeNull();
  });
});

describe("Area workspace Creature saving-throw bonus draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureSavingThrowBonuses: {
      fortitude: { present: true, nativeType: "short", value: 3 },
      reflex: { present: true, nativeType: "short", value: 1 },
      will: { present: false },
    },
  } as const;

  it("retains exact source storage and admitted targets for present Shorts", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: {
          statistics: { saves: { fortitudeBonus: 5, reflexBonus: 4, willBonus: 99 } },
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains canonical absence without authorizing loose presentation", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: {
          ...exactSource,
          creatureSavingThrowBonuses: {
            fortitude: { present: false },
            reflex: { present: false },
            will: { present: false },
          },
        },
        creatureProperties: {
          statistics: { saves: { fortitudeBonus: 999, reflexBonus: -4, willBonus: 1.5 } },
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong family", {
      source: { ...exactSource, sourceKind: "placeable" },
      creatureProperties: { statistics: { saves: { fortitudeBonus: 5, reflexBonus: 4 } } },
    }],
    ["missing ordinal", {
      source: { ...exactSource, sourceIndex: undefined },
      creatureProperties: { statistics: { saves: { fortitudeBonus: 5, reflexBonus: 4 } } },
    }],
    ["malformed source", {
      source: {
        ...exactSource,
        creatureSavingThrowBonuses: {
          ...exactSource.creatureSavingThrowBonuses,
          reflex: { present: true, nativeType: "word", value: 1 },
        },
      },
      creatureProperties: { statistics: { saves: { fortitudeBonus: 5, reflexBonus: 4 } } },
    }],
    ["missing present target", {
      source: exactSource,
      creatureProperties: { statistics: { saves: { fortitudeBonus: 5 } } },
    }],
    ["negative target", {
      source: exactSource,
      creatureProperties: { statistics: { saves: { fortitudeBonus: 5, reflexBonus: -1 } } },
    }],
    ["fractional target", {
      source: exactSource,
      creatureProperties: { statistics: { saves: { fortitudeBonus: 1.5, reflexBonus: 4 } } },
    }],
    ["oversized target", {
      source: exactSource,
      creatureProperties: { statistics: { saves: { fortitudeBonus: 251, reflexBonus: 4 } } },
    }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject(overrides)],
    })).toBeNull();
  });
});

describe("Area workspace Creature alignment draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureAlignment: {
      goodEvil: { present: true, nativeType: "byte", value: 50 },
      lawfulChaotic: { present: true, nativeType: "byte", value: 50 },
    },
  } as const;

  it("retains a complete exact pair with one canonical target label", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { alignment: "Lawful Good" },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains partial or absent source storage without authorizing loose presentation", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: {
          ...exactSource,
          creatureAlignment: {
            goodEvil: { present: true, nativeType: "byte", value: 50 },
            lawfulChaotic: { present: false },
          },
        },
        creatureProperties: { alignment: "legacy-intermediate" },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong family", {
      source: { ...exactSource, sourceKind: "placeable" },
      creatureProperties: { alignment: "Lawful Good" },
    }],
    ["missing ordinal", {
      source: { ...exactSource, sourceIndex: undefined },
      creatureProperties: { alignment: "Lawful Good" },
    }],
    ["non-canonical source axis", {
      source: {
        ...exactSource,
        creatureAlignment: {
          ...exactSource.creatureAlignment,
          goodEvil: { present: true, nativeType: "byte", value: 49 },
        },
      },
      creatureProperties: { alignment: "Lawful Good" },
    }],
    ["missing target", {
      source: exactSource,
      creatureProperties: {},
    }],
    ["non-canonical target", {
      source: exactSource,
      creatureProperties: { alignment: "Neutral" },
    }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject(overrides)],
    })).toBeNull();
  });
});

describe("Area workspace Creature FactionID draft boundary", () => {
  const catalogSha256 = "f".repeat(64);
  const factionCatalog = {
    descriptor: {
      resourceName: "repute.fac",
      sourceObjectKey: "modules/current/repute.fac",
      sha256: catalogSha256,
      sizeBytes: 1889,
      factionCount: 3,
    },
    rows: [
      { factionId: 0, name: "PC", parentFactionId: 0xffff_ffff, isGlobal: true },
      { factionId: 1, name: "Hostile", parentFactionId: 0xffff_ffff, isGlobal: true },
      { factionId: 2, name: "Commoner", parentFactionId: 0xffff_ffff, isGlobal: true },
    ],
  } as const;
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureFaction: {
      expectedValue: 1,
      catalogSha256,
      catalogFactionCount: 3,
    },
  } as const;

  it("retains one exact catalog-bound source, numeric target, and derived name", () => {
    const value = {
      ...scene(),
      placeableFactionCatalog: factionCatalog,
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { advancedSettings: { factionId: 2, faction: "Commoner" } },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["missing catalog", { source: exactSource, advancedSettings: { factionId: 2, faction: "Commoner" } }],
    ["wrong source family", {
      catalog: factionCatalog,
      source: { ...exactSource, sourceKind: "placeable" },
      advancedSettings: { factionId: 2, faction: "Commoner" },
    }],
    ["stale catalog digest", {
      catalog: factionCatalog,
      source: {
        ...exactSource,
        creatureFaction: { ...exactSource.creatureFaction, catalogSha256: "e".repeat(64) },
      },
      advancedSettings: { factionId: 2, faction: "Commoner" },
    }],
    ["missing numeric target", {
      catalog: factionCatalog,
      source: exactSource,
      advancedSettings: { faction: "Commoner" },
    }],
    ["unknown physical target", {
      catalog: factionCatalog,
      source: exactSource,
      advancedSettings: { factionId: 3, faction: "Unknown" },
    }],
    ["mismatched derived name", {
      catalog: factionCatalog,
      source: exactSource,
      advancedSettings: { factionId: 2, faction: "Hostile" },
    }],
  ])("rejects %s", (_label, fixture) => {
    expect(parseAreaScene({
      ...scene(),
      ...(fixture.catalog ? { placeableFactionCatalog: fixture.catalog } : {}),
      objects: [creatureSceneObject({
        source: fixture.source,
        creatureProperties: { advancedSettings: fixture.advancedSettings },
      })],
    })).toBeNull();
  });
});

describe("Area workspace Creature TemplateResRef draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureTemplateResRef: { expectedResRef: "nw_guard" },
  } as const;

  it("retains exact source provenance, an independent target, and renderer identity", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        resRef: "renderer_identity",
        source: exactSource,
        creatureProperties: { advancedSettings: { blueprintResRef: "nw_guard_alt" } },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", {
      source: { ...exactSource, sourceKind: "placeable" },
      advancedSettings: { blueprintResRef: "nw_guard_alt" },
    }],
    ["missing source ordinal", {
      source: { ...exactSource, sourceIndex: undefined },
      advancedSettings: { blueprintResRef: "nw_guard_alt" },
    }],
    ["malformed source provenance", {
      source: { ...exactSource, creatureTemplateResRef: { expectedResRef: "NW_GUARD" } },
      advancedSettings: { blueprintResRef: "nw_guard_alt" },
    }],
    ["missing target", { source: exactSource, advancedSettings: {} }],
    ["malformed target", {
      source: exactSource,
      advancedSettings: { blueprintResRef: "bad-resref" },
    }],
  ])("rejects %s", (_label, fixture) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source: fixture.source,
        creatureProperties: { advancedSettings: fixture.advancedSettings },
      })],
    })).toBeNull();
  });
});

describe("Area workspace Creature Subrace/Deity draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureSpecialIdentityStrings: {
      subrace: { expectedValue: "Moon Elf" },
      deity: { expectedValue: "" },
    },
  } as const;

  it("retains exact per-field provenance and independent Advanced targets", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: {
          advancedSettings: { subrace: "Sun Elf", deity: "Mystra" },
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("accepts an exact one-member provenance subset", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: {
          ...exactSource,
          creatureSpecialIdentityStrings: { deity: { expectedValue: "Mystra" } },
        },
        creatureProperties: {
          advancedSettings: { subrace: "presentation only", deity: "Selune" },
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", { ...exactSource, sourceKind: "placeable" }, { subrace: "Sun Elf", deity: "Mystra" }],
    ["missing source ordinal", { ...exactSource, sourceIndex: undefined }, { subrace: "Sun Elf", deity: "Mystra" }],
    ["empty provenance", { ...exactSource, creatureSpecialIdentityStrings: {} }, { subrace: "Sun Elf", deity: "Mystra" }],
    ["malformed provenance", {
      ...exactSource,
      creatureSpecialIdentityStrings: { subrace: { expectedValue: "Moon\nElf" } },
    }, { subrace: "Sun Elf" }],
    ["missing authorized target", exactSource, { subrace: "Sun Elf" }],
    ["malformed target", exactSource, { subrace: "Sun Elf", deity: "Mystra\n" }],
  ] as const)("rejects %s", (_label, source, advancedSettings) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source,
        creatureProperties: { advancedSettings },
      })],
    })).toBeNull();
  });
});

describe("Area workspace Creature script ResRef draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureScriptResRefs: {
      onHeartbeat: { expectedResRef: "NW_C2_DEFAULT1" },
      onSpawn: { expectedResRef: "nw_c2_default9" },
    },
  } as const;

  it("retains exact per-slot provenance and admits unchanged source case or canonical targets", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: {
          scriptSlots: {
            onHeartbeat: "NW_C2_DEFAULT1",
            onSpawn: "spawn_probe",
            onBlocked: "presentation_only",
          },
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong source family", { ...exactSource, sourceKind: "placeable" }, {
      onHeartbeat: "main", onSpawn: "spawn_probe",
    }],
    ["missing source ordinal", { ...exactSource, sourceIndex: undefined }, {
      onHeartbeat: "main", onSpawn: "spawn_probe",
    }],
    ["empty provenance", { ...exactSource, creatureScriptResRefs: {} }, {
      onHeartbeat: "main", onSpawn: "spawn_probe",
    }],
    ["unknown provenance member", {
      ...exactSource,
      creatureScriptResRefs: {
        onSpawn: { expectedResRef: "nw_c2_default9" },
        extra: true,
      },
    }, { onSpawn: "spawn_probe" }],
    ["malformed provenance", {
      ...exactSource,
      creatureScriptResRefs: { onSpawn: { expectedResRef: "bad-resref" } },
    }, { onSpawn: "spawn_probe" }],
    ["missing authorized target", exactSource, { onHeartbeat: "main" }],
    ["noncanonical changed target", exactSource, {
      onHeartbeat: "main", onSpawn: "SPAWN_PROBE",
    }],
  ] as const)("rejects %s", (_label, source, scriptSlots) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source,
        creatureProperties: { scriptSlots },
      })],
    })).toBeNull();
  });
});

describe("Area workspace Creature name localized-string draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureLocalizedStrings: {
      firstName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "R3VhcmQ=" }],
      },
      lastName: { present: true, strRef: 0xffff_ffff, entries: [] },
      description: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "T2xkIGRlc2NyaXB0aW9u" }],
      },
    },
  } as const;

  it("retains exact source storage and independently editable verbatim targets", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: {
          firstName: "  Captain  ", lastName: "", description: "New description",
        },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains a TLK-backed preserve-only member alongside one editable inline member", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: {
          ...exactSource,
          creatureLocalizedStrings: {
            firstName: { present: true, strRef: 12_416, entries: [] },
            lastName: exactSource.creatureLocalizedStrings.lastName,
            description: exactSource.creatureLocalizedStrings.description,
          },
        },
        creatureProperties: {
          firstName: "Kurczak łąkowy", lastName: "", description: "New description",
        },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong family", {
      source: { ...exactSource, sourceKind: "placeable" },
      creatureProperties: { firstName: "Captain", lastName: "" },
    }],
    ["missing ordinal", {
      source: { ...exactSource, sourceIndex: undefined },
      creatureProperties: { firstName: "Captain", lastName: "" },
    }],
    ["malformed source", {
      source: {
        ...exactSource,
        creatureLocalizedStrings: {
          firstName: {
            present: true,
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, textBytesBase64: "not canonical" }],
          },
          lastName: { present: false },
        },
      },
      creatureProperties: { firstName: "Captain", lastName: "" },
    }],
    ["missing target", { source: exactSource }],
    ["non-ASCII editable target", {
      source: exactSource,
      creatureProperties: { firstName: "Strażnik", lastName: "" },
    }],
    ["over-budget editable target", {
      source: exactSource,
      creatureProperties: { firstName: "x".repeat(257), lastName: "" },
    }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject(overrides)],
    })).toBeNull();
  });
});

describe("Area workspace Creature ItemList draft boundary", () => {
  const sourceEntries = [{
    sourceIndex: 0,
    resRef: "nw_it_potion",
    x: 1,
    y: 2,
    dropable: true,
    pickpocketable: false,
  }];
  const admittedBlueprint = {
    resRef: "nw_cloth022",
    itemResRef: "nw_cloth022",
    itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
    itemSourceFingerprint:
      "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
    x: 0,
    y: 0,
    dropable: false,
    pickpocketable: false,
  };

  it("retains one exact immutable source and reordered editable target", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: {
          type: "aurora_git",
          sourceKind: "creature",
          sourceIndex: 0,
          sourceObjectId: "obj_creature_0",
          creatureInventoryItems: sourceEntries,
        },
        creatureProperties: {
          inventoryItems: [admittedBlueprint, { ...sourceEntries[0], x: 7 }],
        },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["missing family ordinal", {
      source: {
        type: "aurora_git", sourceKind: "creature", sourceObjectId: "obj_creature_0",
        creatureInventoryItems: sourceEntries,
      },
      creatureProperties: { inventoryItems: sourceEntries },
    }],
    ["wrong family", {
      source: {
        type: "aurora_git", sourceKind: "placeable", sourceIndex: 0,
        sourceObjectId: "obj_creature_0", creatureInventoryItems: sourceEntries,
      },
      creatureProperties: { inventoryItems: sourceEntries },
    }],
    ["malformed source", {
      source: {
        type: "aurora_git", sourceKind: "creature", sourceIndex: 0,
        sourceObjectId: "obj_creature_0",
        creatureInventoryItems: [{ ...sourceEntries[0], infinite: false }],
      },
      creatureProperties: { inventoryItems: sourceEntries },
    }],
    ["target absent", {
      source: {
        type: "aurora_git", sourceKind: "creature", sourceIndex: 0,
        sourceObjectId: "obj_creature_0", creatureInventoryItems: sourceEntries,
      },
      creatureProperties: {},
    }],
    ["target identity changed", {
      source: {
        type: "aurora_git", sourceKind: "creature", sourceIndex: 0,
        sourceObjectId: "obj_creature_0", creatureInventoryItems: sourceEntries,
      },
      creatureProperties: { inventoryItems: [{ ...sourceEntries[0], resRef: "nw_cloth022" }] },
    }],
    ["target contains Infinite", {
      source: {
        type: "aurora_git", sourceKind: "creature", sourceIndex: 0,
        sourceObjectId: "obj_creature_0", creatureInventoryItems: sourceEntries,
      },
      creatureProperties: { inventoryItems: [{ ...sourceEntries[0], infinite: false }] },
    }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject(overrides)],
    })).toBeNull();
  });
});

describe("Area workspace Creature Equip_ItemList draft boundary", () => {
  const sourceEntries = [
    { sourceIndex: 0, resRef: "nw_sword001", slotMask: 16, dropable: true, pickpocketable: false },
    { sourceIndex: 1, resRef: "nw_helm001", slotMask: 1, dropable: false, pickpocketable: false },
  ];

  it("retains physical source provenance and a slot-sorted removable target", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: {
          type: "aurora_git",
          sourceKind: "creature",
          sourceIndex: 0,
          sourceObjectId: "obj_creature_0",
          creatureEquippedItems: sourceEntries,
        },
        creatureProperties: {
          equippedItems: [{ ...sourceEntries[1], pickpocketable: true }],
        },
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["target absent", {
      source: {
        type: "aurora_git", sourceKind: "creature", sourceIndex: 0,
        sourceObjectId: "obj_creature_0", creatureEquippedItems: sourceEntries,
      },
      creatureProperties: {},
    }],
    ["unsupported source slot", {
      source: {
        type: "aurora_git", sourceKind: "creature", sourceIndex: 0,
        sourceObjectId: "obj_creature_0",
        creatureEquippedItems: [{ ...sourceEntries[0], slotMask: 3 }],
      },
      creatureProperties: { equippedItems: [] },
    }],
    ["changed target slot", {
      source: {
        type: "aurora_git", sourceKind: "creature", sourceIndex: 0,
        sourceObjectId: "obj_creature_0", creatureEquippedItems: sourceEntries,
      },
      creatureProperties: { equippedItems: [{ ...sourceEntries[1], slotMask: 2 }] },
    }],
    ["reordered target", {
      source: {
        type: "aurora_git", sourceKind: "creature", sourceIndex: 0,
        sourceObjectId: "obj_creature_0", creatureEquippedItems: sourceEntries,
      },
      creatureProperties: { equippedItems: sourceEntries },
    }],
    ["new target", {
      source: {
        type: "aurora_git", sourceKind: "creature", sourceIndex: 0,
        sourceObjectId: "obj_creature_0", creatureEquippedItems: sourceEntries,
      },
      creatureProperties: { equippedItems: [{
        sourceIndex: 2, resRef: "nw_boots001", slotMask: 8,
        dropable: false, pickpocketable: false,
      }] },
    }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject(overrides)],
    })).toBeNull();
  });
});

describe("Area workspace Sound interval/variation storage draft boundary", () => {
  const storage = {
    intervalMilliseconds: 25_000,
    intervalVariationMilliseconds: 5_000,
    pitchVariationHundredths: 20,
    volumeVariationByte: 64,
  };

  it("retains one exact source-provenance and editable-target storage pair", () => {
    const value = {
      ...scene(),
      objects: [soundSceneObject({
        source: {
          type: "aurora_git",
          sourceKind: "sound",
          sourceIndex: 0,
          sourceObjectId: "obj_sound_0",
          soundIntervalVariationStorage: storage,
        },
        soundIntervalVariation: { ...storage, volumeVariationByte: 127 },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["target without provenance", {
      source: { type: "aurora_git", sourceKind: "sound", sourceIndex: 0 },
      soundIntervalVariation: storage,
    }],
    ["source without ordinal", {
      source: {
        type: "aurora_git", sourceKind: "sound",
        soundIntervalVariationStorage: storage,
      },
      soundIntervalVariation: storage,
    }],
    ["wrong family", {
      source: {
        type: "aurora_git", sourceKind: "door", sourceIndex: 0,
        soundIntervalVariationStorage: storage,
      },
      soundIntervalVariation: storage,
    }],
    ["off-grid target", {
      source: {
        type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
        soundIntervalVariationStorage: storage,
      },
      soundIntervalVariation: { ...storage, intervalMilliseconds: 25_001 },
    }],
    ["out-of-range target", {
      source: {
        type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
        soundIntervalVariationStorage: storage,
      },
      soundIntervalVariation: { ...storage, volumeVariationByte: 128 },
    }],
  ])("rejects %s Sound interval/variation storage", (_label, overrides) => {
    expect(parseAreaScene({ ...scene(), objects: [soundSceneObject(overrides)] })).toBeNull();
  });
});

describe("Area workspace Sound base-volume storage draft boundary", () => {
  it("retains one exact source-provenance and editable-target storage pair", () => {
    const value = {
      ...scene(),
      objects: [soundSceneObject({
        source: {
          type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
          sourceObjectId: "obj_sound_0", soundVolumeStorage: { volumeByte: 64 },
        },
        soundVolume: { volumeByte: 127 },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["target without provenance", {
      source: { type: "aurora_git", sourceKind: "sound", sourceIndex: 0 },
      soundVolume: { volumeByte: 64 },
    }],
    ["source without ordinal", {
      source: { type: "aurora_git", sourceKind: "sound", soundVolumeStorage: { volumeByte: 64 } },
      soundVolume: { volumeByte: 64 },
    }],
    ["wrong family", {
      source: {
        type: "aurora_git", sourceKind: "door", sourceIndex: 0,
        soundVolumeStorage: { volumeByte: 64 },
      },
      soundVolume: { volumeByte: 64 },
    }],
    ["out-of-range target", {
      source: {
        type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
        soundVolumeStorage: { volumeByte: 64 },
      },
      soundVolume: { volumeByte: 128 },
    }],
  ])("rejects %s Sound base-volume storage", (_label, overrides) => {
    expect(parseAreaScene({ ...scene(), objects: [soundSceneObject(overrides)] })).toBeNull();
  });
});

describe("Area workspace Sound Hours/Times schedule storage draft boundary", () => {
  it("retains one exact source-provenance and editable-target schedule pair", () => {
    const value = {
      ...scene(),
      objects: [soundSceneObject({
        source: {
          type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
          sourceObjectId: "obj_sound_0",
          soundScheduleStorage: { hoursMask: 0, timesByte: 3 },
        },
        soundSchedule: { hoursMask: 0x800001, timesByte: 0 },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["target without provenance", {
      source: { type: "aurora_git", sourceKind: "sound", sourceIndex: 0 },
      soundSchedule: { hoursMask: 0, timesByte: 3 },
    }],
    ["source without ordinal", {
      source: {
        type: "aurora_git", sourceKind: "sound",
        soundScheduleStorage: { hoursMask: 0, timesByte: 3 },
      },
      soundSchedule: { hoursMask: 0, timesByte: 3 },
    }],
    ["wrong family", {
      source: {
        type: "aurora_git", sourceKind: "door", sourceIndex: 0,
        soundScheduleStorage: { hoursMask: 0, timesByte: 3 },
      },
      soundSchedule: { hoursMask: 0, timesByte: 3 },
    }],
    ["out-of-range source mask", {
      source: {
        type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
        soundScheduleStorage: { hoursMask: 0x1000000, timesByte: 3 },
      },
      soundSchedule: { hoursMask: 0, timesByte: 3 },
    }],
    ["out-of-range target Times", {
      source: {
        type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
        soundScheduleStorage: { hoursMask: 0, timesByte: 3 },
      },
      soundSchedule: { hoursMask: 0, timesByte: 4 },
    }],
  ])("rejects %s Sound Hours/Times schedule storage", (_label, overrides) => {
    expect(parseAreaScene({ ...scene(), objects: [soundSceneObject(overrides)] })).toBeNull();
  });
});

describe("Area workspace Sound Active storage draft boundary", () => {
  it("retains one exact source-provenance and editable-target Active pair", () => {
    const value = {
      ...scene(),
      objects: [soundSceneObject({
        source: {
          type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
          sourceObjectId: "obj_sound_0", soundActiveStorage: { activeByte: 1 },
        },
        soundActive: { activeByte: 0 },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["target without provenance", {
      source: { type: "aurora_git", sourceKind: "sound", sourceIndex: 0 },
      soundActive: { activeByte: 0 },
    }],
    ["source without ordinal", {
      source: { type: "aurora_git", sourceKind: "sound", soundActiveStorage: { activeByte: 1 } },
      soundActive: { activeByte: 0 },
    }],
    ["wrong family", {
      source: {
        type: "aurora_git", sourceKind: "door", sourceIndex: 0,
        soundActiveStorage: { activeByte: 1 },
      },
      soundActive: { activeByte: 0 },
    }],
    ["noncanonical source byte", {
      source: {
        type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
        soundActiveStorage: { activeByte: 2 },
      },
      soundActive: { activeByte: 0 },
    }],
    ["noncanonical target byte", {
      source: {
        type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
        soundActiveStorage: { activeByte: 1 },
      },
      soundActive: { activeByte: 2 },
    }],
  ])("rejects %s Sound Active storage", (_label, overrides) => {
    expect(parseAreaScene({ ...scene(), objects: [soundSceneObject(overrides)] })).toBeNull();
  });
});

describe("Area workspace Sound Play Order storage draft boundary", () => {
  it("retains one exact source-provenance and editable-target Play Order pair", () => {
    const value = {
      ...scene(),
      objects: [soundSceneObject({
        source: {
          type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
          sourceObjectId: "obj_sound_0", soundPlayOrderStorage: { randomByte: 0 },
        },
        soundPlayOrder: { randomByte: 1 },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["target without provenance", {
      source: { type: "aurora_git", sourceKind: "sound", sourceIndex: 0 },
      soundPlayOrder: { randomByte: 1 },
    }],
    ["source without ordinal", {
      source: {
        type: "aurora_git", sourceKind: "sound",
        soundPlayOrderStorage: { randomByte: 0 },
      },
      soundPlayOrder: { randomByte: 1 },
    }],
    ["wrong family", {
      source: {
        type: "aurora_git", sourceKind: "door", sourceIndex: 0,
        soundPlayOrderStorage: { randomByte: 0 },
      },
      soundPlayOrder: { randomByte: 1 },
    }],
    ["noncanonical source byte", {
      source: {
        type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
        soundPlayOrderStorage: { randomByte: 2 },
      },
      soundPlayOrder: { randomByte: 1 },
    }],
    ["noncanonical target byte", {
      source: {
        type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
        soundPlayOrderStorage: { randomByte: 0 },
      },
      soundPlayOrder: { randomByte: 2 },
    }],
  ])("rejects %s Sound Play Order storage", (_label, overrides) => {
    expect(parseAreaScene({ ...scene(), objects: [soundSceneObject(overrides)] })).toBeNull();
  });
});

describe("Area workspace Sound Play Style storage draft boundary", () => {
  const sourceStorage = {
    loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
    positionalByte: 1 as const, soundsCount: 2, intervalDword: 25_000,
    intervalVariationDword: 5_000,
  };
  const targetStorage = {
    ...sourceStorage,
    loopingByte: 1 as const,
    continuousByte: 0 as const,
    priorityByte: 3 as const,
  };

  it("retains one complete immutable-source and editable-target tuple", () => {
    const value = {
      ...scene(),
      objects: [soundSceneObject({
        source: {
          type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
          sourceObjectId: "obj_sound_0", soundPlayStyleStorage: sourceStorage,
        },
        soundPlayStyle: targetStorage,
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["target without provenance", {
      source: { type: "aurora_git", sourceKind: "sound", sourceIndex: 0 },
      soundPlayStyle: targetStorage,
    }],
    ["source without ordinal", {
      source: { type: "aurora_git", sourceKind: "sound", soundPlayStyleStorage: sourceStorage },
      soundPlayStyle: targetStorage,
    }],
    ["derivation-inconsistent source", {
      source: {
        type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
        soundPlayStyleStorage: { ...sourceStorage, priorityByte: 3 },
      },
      soundPlayStyle: targetStorage,
    }],
    ["changed hidden dependency", {
      source: {
        type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
        soundPlayStyleStorage: sourceStorage,
      },
      soundPlayStyle: { ...targetStorage, soundsCount: 3 },
    }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseAreaScene({ ...scene(), objects: [soundSceneObject(overrides)] })).toBeNull();
  });
});

describe("Area workspace Sound playback storage draft boundary", () => {
  const sourceStorage = {
    sounds: ["wind_a", "wind_b"],
    loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
    positionalByte: 1 as const, intervalDword: 25_000,
    intervalVariationDword: 5_000,
  };
  const targetStorage = {
    ...sourceStorage,
    sounds: ["wind_b", "wind_c"],
    loopingByte: 1 as const,
    continuousByte: 0 as const,
    priorityByte: 3 as const,
  };

  it("retains one complete immutable-source and editable playback tuple", () => {
    const value = {
      ...scene(),
      objects: [soundSceneObject({
        source: {
          type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
          sourceObjectId: "obj_sound_0", soundPlaybackStorage: sourceStorage,
        },
        soundPlayback: targetStorage,
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["target without provenance", {
      source: { type: "aurora_git", sourceKind: "sound", sourceIndex: 0 },
      soundPlayback: targetStorage,
    }],
    ["malformed source child", {
      source: {
        type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
        soundPlaybackStorage: { ...sourceStorage, sounds: ["Wind-A"] },
      },
      soundPlayback: targetStorage,
    }],
    ["changed hidden dependency", {
      source: {
        type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
        soundPlaybackStorage: sourceStorage,
      },
      soundPlayback: { ...targetStorage, intervalDword: 0 },
    }],
  ])("rejects %s", (_label, overrides) => {
    expect(parseAreaScene({ ...scene(), objects: [soundSceneObject(overrides)] })).toBeNull();
  });
});

describe("Area workspace authoritative Sound profile draft boundary", () => {
  const sourceProfile = {
    sounds: ["wind_a", "wind_b"],
    loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
    positionalByte: 1 as const, randomPositionByte: 0 as const,
    elevationFloat32: 0, maxDistanceFloat32: 14, minDistanceFloat32: 2,
    randomRangeXFloat32: 0, randomRangeYFloat32: 0,
    intervalDword: 25_000, intervalVariationDword: 5_000,
  };
  const targetProfile = {
    ...sourceProfile,
    sounds: ["wind_b", "wind_c"],
    loopingByte: 1 as const, continuousByte: 0 as const, priorityByte: 3 as const,
    randomPositionByte: 1 as const,
    elevationFloat32: 1.25, maxDistanceFloat32: 20, minDistanceFloat32: 4,
    randomRangeXFloat32: 8, randomRangeYFloat32: 9,
  };

  it("retains one complete immutable-source and editable profile tuple", () => {
    const value = {
      ...scene(),
      objects: [soundSceneObject({
        source: {
          type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
          sourceObjectId: "obj_sound_0", soundProfileStorage: sourceProfile,
        },
        soundProfile: targetProfile,
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("rejects a changed playback fallback when the complete profile is authoritative", () => {
    const playback = {
      sounds: ["wind_a", "wind_b"],
      loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
      positionalByte: 1 as const, intervalDword: 25_000, intervalVariationDword: 5_000,
    };
    expect(parseAreaScene({
      ...scene(),
      objects: [soundSceneObject({
        source: {
          type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
          sourceObjectId: "obj_sound_0", soundProfileStorage: sourceProfile,
          soundPlaybackStorage: playback,
        },
        soundProfile: targetProfile,
        soundPlayback: { ...playback, sounds: ["wind_c"] },
      })],
    })).toBeNull();
  });

  it("rejects profile interval dependency drift", () => {
    expect(parseAreaScene({
      ...scene(),
      objects: [soundSceneObject({
        source: {
          type: "aurora_git", sourceKind: "sound", sourceIndex: 0,
          sourceObjectId: "obj_sound_0", soundProfileStorage: sourceProfile,
        },
        soundProfile: { ...targetProfile, intervalDword: 0 },
      })],
    })).toBeNull();
  });
});

describe("Area workspace Waypoint Tag draft boundary", () => {
  function waypointObject(waypointTag: unknown, tag = "  PATROL_POINT_01  ") {
    const object = createNewSceneObject("waypoints", 1, 2, 1);
    object.tag = tag;
    object.source = {
      type: "aurora_git",
      sourceKind: "waypoint",
      sourceIndex: 0,
      sourceObjectId: "obj_waypoint_0",
      waypointTag: waypointTag as { present: boolean; value?: string },
    };
    return object;
  }

  it("retains one exact Waypoint Tag source and target without normalization", () => {
    const value = {
      ...scene(),
      objects: [waypointObject({ present: true, value: "NW_WAYPOINT001" })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains exact Waypoint LocalizedName source and printable-ASCII target", () => {
    const object = waypointObject({ present: true, value: "NW_WAYPOINT001" });
    object.waypointLocalizedName = " North Patrol Point ";
    object.source!.waypointLocalizedNameStorage = {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIFBvaW50" }],
    };
    const value = { ...scene(), objects: [object] };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it("rejects a non-ASCII Waypoint LocalizedName target", () => {
    const object = waypointObject({ present: true, value: "NW_WAYPOINT001" });
    object.waypointLocalizedName = "Północ";
    object.source!.waypointLocalizedNameStorage = {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIFBvaW50" }],
    };

    expect(parseAreaScene({ ...scene(), objects: [object] })).toBeNull();
  });

  it("retains exact Waypoint Description source and printable-ASCII target", () => {
    const object = waypointObject({ present: true, value: "NW_WAYPOINT001" });
    object.waypointDescription = " Northern patrol route ";
    object.source!.waypointDescriptionStorage = {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIHJvdXRl" }],
    };
    const value = { ...scene(), objects: [object] };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains one complete Waypoint MapNote source and target vector", () => {
    const object = waypointObject({ present: true, value: "NW_WAYPOINT001" });
    object.waypointMapNote = {
      hasMapNote: true,
      mapNoteText: " Northern gate ",
      mapNoteEnabled: false,
    };
    object.source!.waypointMapNoteStorage = {
      hasMapNoteByte: 0,
      mapNoteStorage: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "T2xkIG1hcmtlcg==" }],
      },
      mapNoteEnabledByte: 1,
    };
    const value = { ...scene(), objects: [object] };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains one exact waypoint.2da-bound Waypoint Appearance source and target", () => {
    const object = waypointObject({ present: true, value: "NW_WAYPOINT001" });
    object.waypointAppearance = 4;
    object.source!.waypointAppearance = {
      present: true,
      nativeType: "byte",
      value: 1,
      table: {
        resourceName: "waypoint.2da",
        sourceObjectKey: "vanilla:waypoint.2da",
        sourceLayer: "vanilla",
        sha256: "a".repeat(64),
        sizeBytes: 321,
        rowCount: 5,
        rowIndex: 1,
      },
    };
    const value = { ...scene(), objects: [object] };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["out-of-range target", 5, {}],
    ["missing source identity", 4, { sourceObjectKey: undefined }],
    ["mismatched retained row", 4, { rowIndex: 2 }],
  ])("rejects Waypoint Appearance with %s", (_label, target, tableOverrides) => {
    const object = waypointObject({ present: true, value: "NW_WAYPOINT001" });
    if (target !== undefined) object.waypointAppearance = target;
    object.source!.waypointAppearance = {
      present: true,
      nativeType: "byte",
      value: 1,
      table: {
        resourceName: "waypoint.2da",
        sourceObjectKey: "vanilla:waypoint.2da",
        sourceLayer: "vanilla",
        sha256: "a".repeat(64),
        sizeBytes: 321,
        rowCount: 5,
        rowIndex: 1,
        ...tableOverrides,
      },
    } as never;

    expect(parseAreaScene({ ...scene(), objects: [object] })).toBeNull();
  });

  it("preserves exact Waypoint Appearance provenance when an older draft has no target", () => {
    const object = waypointObject({ present: true, value: "NW_WAYPOINT001" });
    object.source!.waypointAppearance = {
      present: true,
      nativeType: "byte",
      value: 1,
      table: {
        resourceName: "waypoint.2da",
        sourceObjectKey: "vanilla:waypoint.2da",
        sourceLayer: "vanilla",
        sha256: "a".repeat(64),
        sizeBytes: 321,
        rowCount: 5,
        rowIndex: 1,
      },
    };
    const value = { ...scene(), objects: [object] };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains one complete ordered Waypoint VarTable source and target", () => {
    const object = waypointObject({ present: true, value: "NW_WAYPOINT001" });
    object.waypointVariables = [
      { name: "dup", type: "int", value: 1 },
      { name: "dup", type: "string", value: "north" },
    ];
    object.source!.waypointVariables = { expectedEntries: [
      { sourceIndex: 0, name: "dup", type: "int", value: 1 },
      { sourceIndex: 1, name: "dup", type: "string", value: "old" },
    ] };
    const value = { ...scene(), objects: [object] };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("rejects a Waypoint VarTable target without exact retained provenance", () => {
    const object = waypointObject({ present: true, value: "NW_WAYPOINT001" });
    object.waypointVariables = [];
    expect(parseAreaScene({ ...scene(), objects: [object] })).toBeNull();
  });

  it.each([
    ["partial target", { hasMapNote: true, mapNoteText: "Marker" }],
    ["non-ASCII target", {
      hasMapNote: true, mapNoteText: "Północ", mapNoteEnabled: true,
    }],
  ])("rejects Waypoint MapNote with %s", (_label, target) => {
    const object = waypointObject({ present: true, value: "NW_WAYPOINT001" });
    object.waypointMapNote = target as never;
    object.source!.waypointMapNoteStorage = {
      hasMapNoteByte: 0,
      mapNoteStorage: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "T2xkIG1hcmtlcg==" }],
      },
      mapNoteEnabledByte: 1,
    };

    expect(parseAreaScene({ ...scene(), objects: [object] })).toBeNull();
  });

  it("retains exact Waypoint editor Comment source and target", () => {
    const object = waypointObject({ present: true, value: "NW_WAYPOINT001" });
    object.waypointEditorComment = " updated note ";
    object.source!.waypointEditorComment = " source note ";
    const value = { ...scene(), objects: [object] };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["missing target", "source", undefined],
    ["missing source", undefined, "target"],
    ["NUL source", "bad\0source", "target"],
    ["over-budget target", "source", "x".repeat(4097)],
  ])("rejects Waypoint editor Comment with %s", (_label, source, target) => {
    const object = waypointObject({ present: true, value: "NW_WAYPOINT001" });
    if (source !== undefined) object.source!.waypointEditorComment = source;
    if (target !== undefined) object.waypointEditorComment = target;
    expect(parseAreaScene({ ...scene(), objects: [object] })).toBeNull();
  });

  it("rejects a non-ASCII Waypoint Description target", () => {
    const object = waypointObject({ present: true, value: "NW_WAYPOINT001" });
    object.waypointDescription = "Północ";
    object.source!.waypointDescriptionStorage = {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIHJvdXRl" }],
    };

    expect(parseAreaScene({ ...scene(), objects: [object] })).toBeNull();
  });

  it.each([
    ["missing value", { present: true }],
    ["invented absent value", { present: false, value: "INVENTED" }],
    ["over budget", { present: true, value: "x".repeat(33) }],
    ["embedded NUL", { present: true, value: "bad\0tag" }],
  ])("rejects malformed Waypoint Tag provenance: %s", (_label, waypointTag) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [waypointObject(waypointTag, "PATROL_POINT_01")],
    })).toBeNull();
  });
});

describe("Area workspace Waypoint TemplateResRef draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "waypoint",
    sourceIndex: 0,
    sourceObjectId: "obj_waypoint_0",
    waypointTemplateResRef: {
      present: true,
      nativeType: "resref",
      value: "nw_waypoint001",
    },
  } as const;

  function waypointObject(source: unknown, target?: unknown) {
    const object = createNewSceneObject("waypoints", 1, 2, 1) as any;
    object.resRef = "renderer_identity";
    object.source = source;
    if (target !== undefined) object.waypointTemplateResRef = target;
    return object;
  }

  it("retains exact source and target while keeping renderer identity independent", () => {
    const value = {
      ...scene(),
      objects: [waypointObject(exactSource, "custom_waypoint")],
    };

    const parsed = parseAreaScene(value);

    expect(parsed).toEqual(value);
    expect(parsed?.objects[0]?.resRef).toBe("renderer_identity");
    expect(parsed?.objects[0]?.waypointTemplateResRef).toBe("custom_waypoint");
  });

  it("retains exact absence only without an invented target", () => {
    const source = {
      ...exactSource,
      waypointTemplateResRef: { present: false },
    };
    expect(parseAreaScene({
      ...scene(),
      objects: [waypointObject(source)],
    })).not.toBeNull();
    expect(parseAreaScene({
      ...scene(),
      objects: [waypointObject(source, "custom_waypoint")],
    })).toBeNull();
  });

  it.each([
    ["target without source", { ...exactSource, waypointTemplateResRef: undefined }, "custom_waypoint"],
    ["wrong family", { ...exactSource, sourceKind: "item" }, "custom_waypoint"],
    ["missing ordinal", { ...exactSource, sourceIndex: undefined }, "custom_waypoint"],
    ["malformed storage", {
      ...exactSource,
      waypointTemplateResRef: { present: true, nativeType: "resref" },
    }, "custom_waypoint"],
    ["uppercase target", exactSource, "CUSTOM_WAYPOINT"],
    ["invalid-character target", exactSource, "custom-waypoint"],
    ["overlength target", exactSource, "abcdefghijklmnopq"],
  ])("rejects %s", (_label, source, target) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [waypointObject(source, target)],
    })).toBeNull();
  });
});

describe("Area workspace Encounter TemplateResRef draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "encounter",
    sourceIndex: 0,
    sourceObjectId: "obj_encounter_0",
    encounterTemplateResRef: {
      present: true,
      nativeType: "resref",
      value: "x2_gnoll001",
    },
  } as const;

  function encounterObject(source: unknown, target?: unknown) {
    const object = createNewSceneObject("encounters", 1, 2, 1) as any;
    object.resRef = "renderer_identity";
    object.source = source;
    if (target !== undefined) object.encounterTemplateResRef = target;
    return object;
  }

  it("retains exact source and target while keeping renderer identity independent", () => {
    const value = {
      ...scene(),
      objects: [encounterObject(exactSource, "custom_encounter")],
    };

    const parsed = parseAreaScene(value);

    expect(parsed).toEqual(value);
    expect(parsed?.objects[0]?.resRef).toBe("renderer_identity");
    expect(parsed?.objects[0]?.encounterTemplateResRef).toBe("custom_encounter");
  });

  it("retains exact absence only without an invented target", () => {
    const source = {
      ...exactSource,
      encounterTemplateResRef: { present: false },
    };
    expect(parseAreaScene({
      ...scene(),
      objects: [encounterObject(source)],
    })).not.toBeNull();
    expect(parseAreaScene({
      ...scene(),
      objects: [encounterObject(source, "custom_encounter")],
    })).toBeNull();
  });

  it.each([
    ["target without source", { ...exactSource, encounterTemplateResRef: undefined }, "custom_encounter"],
    ["wrong family", { ...exactSource, sourceKind: "item" }, "custom_encounter"],
    ["missing ordinal", { ...exactSource, sourceIndex: undefined }, "custom_encounter"],
    ["malformed storage", {
      ...exactSource,
      encounterTemplateResRef: { present: true, nativeType: "resref" },
    }, "custom_encounter"],
    ["uppercase target", exactSource, "CUSTOM_ENCOUNTER"],
    ["invalid-character target", exactSource, "custom-encounter"],
    ["overlength target", exactSource, "abcdefghijklmnopq"],
  ])("rejects %s", (_label, source, target) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [encounterObject(source, target)],
    })).toBeNull();
  });
});

describe("Area workspace Trigger TemplateResRef draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "trigger",
    sourceIndex: 0,
    sourceObjectId: "obj_trigger_0",
    triggerTemplateResRef: {
      present: true,
      nativeType: "resref",
      value: "newgeneric",
    },
  } as const;

  function triggerObject(source: unknown, target?: unknown) {
    const object = createNewSceneObject("triggers", 1, 2, 1) as any;
    object.resRef = "renderer_identity";
    object.source = source;
    if (target !== undefined) object.triggerTemplateResRef = target;
    return object;
  }

  it("retains exact source and target while keeping renderer identity independent", () => {
    const value = {
      ...scene(),
      objects: [triggerObject(exactSource, "custom_trigger")],
    };

    const parsed = parseAreaScene(value);

    expect(parsed).toEqual(value);
    expect(parsed?.objects[0]?.resRef).toBe("renderer_identity");
    expect(parsed?.objects[0]?.triggerTemplateResRef).toBe("custom_trigger");
  });

  it("retains exact absence only without an invented target", () => {
    const source = {
      ...exactSource,
      triggerTemplateResRef: { present: false },
    };
    expect(parseAreaScene({
      ...scene(),
      objects: [triggerObject(source)],
    })).not.toBeNull();
    expect(parseAreaScene({
      ...scene(),
      objects: [triggerObject(source, "custom_trigger")],
    })).toBeNull();
  });

  it.each([
    ["target without source", { ...exactSource, triggerTemplateResRef: undefined }, "custom_trigger"],
    ["wrong family", { ...exactSource, sourceKind: "item" }, "custom_trigger"],
    ["missing ordinal", { ...exactSource, sourceIndex: undefined }, "custom_trigger"],
    ["malformed storage", {
      ...exactSource,
      triggerTemplateResRef: { present: true, nativeType: "resref" },
    }, "custom_trigger"],
    ["uppercase target", exactSource, "CUSTOM_TRIGGER"],
    ["invalid-character target", exactSource, "custom-trigger"],
    ["overlength target", exactSource, "abcdefghijklmnopq"],
  ])("rejects %s", (_label, source, target) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [triggerObject(source, target)],
    })).toBeNull();
  });
});

describe("Area workspace Trigger LocalizedName draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "trigger",
    sourceIndex: 0,
    sourceObjectId: "obj_trigger_0",
    triggerLocalizedNameStorage: {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "R2F0ZSBUcmlnZ2Vy" }],
    },
  } as const;

  function triggerObject(source: unknown, target?: unknown) {
    const object = createNewSceneObject("triggers", 1, 2, 1) as any;
    object.resRef = "renderer_identity";
    object.source = source;
    if (target !== undefined) object.triggerLocalizedName = target;
    return object;
  }

  it("retains detached exact source and a bounded target", () => {
    const value = {
      ...scene(),
      objects: [triggerObject(exactSource, " Inner Gate Trigger ")],
    };
    const parsed = parseAreaScene(value);
    expect(parsed).toEqual(value);
    expect(parsed?.objects[0]?.resRef).toBe("renderer_identity");
    expect(parsed?.objects[0]?.triggerLocalizedName).toBe(" Inner Gate Trigger ");
  });

  it("keeps absent and TLK-backed storage only without an invented target", () => {
    for (const storage of [
      { present: false },
      { present: true, strRef: 14759, entries: [] },
    ]) {
      const source = { ...exactSource, triggerLocalizedNameStorage: storage };
      expect(parseAreaScene({
        ...scene(),
        objects: [triggerObject(source)],
      })).not.toBeNull();
      expect(parseAreaScene({
        ...scene(),
        objects: [triggerObject(source, "Invented")],
      })).toBeNull();
    }
  });

  it.each([
    ["target without source", { ...exactSource, triggerLocalizedNameStorage: undefined }, "Inner Gate Trigger"],
    ["wrong family", { ...exactSource, sourceKind: "encounter" }, "Inner Gate Trigger"],
    ["missing ordinal", { ...exactSource, sourceIndex: undefined }, "Inner Gate Trigger"],
    ["malformed storage", {
      ...exactSource,
      triggerLocalizedNameStorage: { present: true, strRef: 0xffff_ffff },
    }, "Inner Gate Trigger"],
    ["control-byte target", exactSource, "Bad\nName"],
    ["non-ASCII target", exactSource, "Łowcy"],
    ["overlength target", exactSource, "A".repeat(257)],
  ])("rejects %s", (_label, source, target) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [triggerObject(source, target)],
    })).toBeNull();
  });
});

describe("Area workspace Trigger editor Comment draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "trigger",
    sourceIndex: 0,
    sourceObjectId: "obj_trigger_0",
    triggerEditorComment: " source note ",
  } as const;

  function triggerObject(source: unknown, target?: unknown) {
    const object = createNewSceneObject("triggers", 1, 2, 1) as any;
    object.resRef = "renderer_identity";
    object.source = source;
    if (target !== undefined) object.triggerEditorComment = target;
    return object;
  }

  it("retains exact source and target text", () => {
    const value = {
      ...scene(),
      objects: [triggerObject(exactSource, " updated note ")],
    };
    const parsed = parseAreaScene(value);
    expect(parsed).toEqual(value);
    expect(parsed?.objects[0]?.triggerEditorComment).toBe(" updated note ");
    expect(parsed?.objects[0]?.source?.triggerEditorComment).toBe(" source note ");
  });

  it.each([
    ["missing target", exactSource, undefined],
    ["missing source", { ...exactSource, triggerEditorComment: undefined }, "target"],
    ["wrong family", { ...exactSource, sourceKind: "encounter" }, "target"],
    ["missing ordinal", { ...exactSource, sourceIndex: undefined }, "target"],
    ["NUL source", { ...exactSource, triggerEditorComment: "bad\0source" }, "target"],
    ["over-budget target", exactSource, "x".repeat(4097)],
  ])("rejects %s", (_label, source, target) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [triggerObject(source, target)],
    })).toBeNull();
  });
});

describe("Area workspace Trigger event-script draft boundary", () => {
  const tuple = {
    onDisarm: "trg_disarm",
    onTrapTriggered: "trg_trapped",
    onClick: "",
    onHeartbeat: "trg_heartbeat",
    onEnter: "trg_enter",
    onExit: "trg_exit",
    onUserDefined: "trg_user",
  };
  const exactSource = {
    type: "aurora_git",
    sourceKind: "trigger",
    sourceIndex: 0,
    sourceObjectId: "obj_trigger_0",
    triggerScriptResRefsStorage: tuple,
  } as const;

  function triggerObject(source: unknown, target?: unknown) {
    const object = createNewSceneObject("triggers", 1, 2, 1) as any;
    object.resRef = "newgeneric";
    object.source = source;
    if (target !== undefined) object.triggerScriptResRefs = target;
    return object;
  }

  it("retains one exact source tuple and canonical lowercase target tuple", () => {
    const target = { ...tuple, onClick: "trg_click" };
    const value = { ...scene(), objects: [triggerObject(exactSource, target)] };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("keeps exact source provenance preserve-only when no target exists", () => {
    expect(parseAreaScene({
      ...scene(),
      objects: [triggerObject(exactSource)],
    })).not.toBeNull();
  });

  it("accepts an unchanged mixed-case legacy target without rewriting it", () => {
    const mixedCaseTuple = { ...tuple, onDisarm: "Trg_Disarm" };
    const source = {
      ...exactSource,
      triggerScriptResRefsStorage: mixedCaseTuple,
    };
    const value = {
      ...scene(),
      objects: [triggerObject(source, { ...mixedCaseTuple })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["target without source", { ...exactSource, triggerScriptResRefsStorage: undefined }, tuple],
    ["wrong family", { ...exactSource, sourceKind: "encounter" }, tuple],
    ["missing ordinal", { ...exactSource, sourceIndex: undefined }, tuple],
    ["partial source", { ...exactSource, triggerScriptResRefsStorage: { onClick: "" } }, tuple],
    ["partial target", exactSource, { ...tuple, onUserDefined: undefined }],
    ["uppercase changed target", exactSource, { ...tuple, onClick: "TRG_CLICK" }],
  ])("rejects %s", (_label, source, target) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [triggerObject(source, target)],
    })).toBeNull();
  });
});

describe("Area workspace Trigger transition-storage draft boundary", () => {
  const storage = {
    linkedTo: "east_gate",
    linkedToFlags: 2,
    loadScreenId: 321,
  };
  const exactSource = {
    type: "aurora_git",
    sourceKind: "trigger",
    sourceIndex: 0,
    sourceObjectId: "obj_trigger_0",
    triggerTransitionStorage: storage,
  } as const;

  function triggerObject(source: unknown, target?: unknown) {
    const object = createNewSceneObject("triggers", 1, 2, 1) as any;
    object.resRef = "newgeneric";
    object.source = source;
    if (target !== undefined) object.triggerTransitionStorage = target;
    return object;
  }

  it("retains exact source and target tuples without semantic coercion", () => {
    const target = { linkedTo: "crypt_exit", linkedToFlags: 4, loadScreenId: 7 };
    const value = { ...scene(), objects: [triggerObject(exactSource, target)] };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("keeps exact source provenance preserve-only when no target exists", () => {
    expect(parseAreaScene({
      ...scene(),
      objects: [triggerObject(exactSource)],
    })).not.toBeNull();
  });

  it.each([
    ["target without source", { ...exactSource, triggerTransitionStorage: undefined }, storage],
    ["wrong family", { ...exactSource, sourceKind: "encounter" }, storage],
    ["missing ordinal", { ...exactSource, sourceIndex: undefined }, storage],
    ["partial source", { ...exactSource, triggerTransitionStorage: { linkedTo: "east" } }, storage],
    ["partial target", exactSource, { ...storage, loadScreenId: undefined }],
    ["out-of-range flags", exactSource, { ...storage, linkedToFlags: 256 }],
    ["out-of-range load screen", exactSource, { ...storage, loadScreenId: 65536 }],
    ["NUL LinkedTo", exactSource, { ...storage, linkedTo: "bad\0target" }],
  ])("rejects %s", (_label, source, target) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [triggerObject(source, target)],
    })).toBeNull();
  });
});

describe("Area workspace Trigger/Encounter polygon draft boundary", () => {
  const sourceGeometry = polygon([[0, 0, 0], [4, 0, 0], [0, 2, 0]]);
  const targetGeometry = polygon([[-1, 0, 0], [4, 0, 0], [0, 3, 0.5]]);

  it("retains one exact Trigger Tag source and target without normalization", () => {
    const value = {
      ...scene(),
      objects: [polygonSceneObject("triggers", {
        tag: "  AREA_EXIT  ",
        source: {
          type: "aurora_git",
          sourceKind: "trigger",
          sourceIndex: 0,
          sourceObjectId: "obj_trigger_0",
          triggerTag: { present: true, value: "GenericTrigger" },
          polygonGeometry: sourceGeometry,
        },
        polygonGeometry: targetGeometry,
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["missing value", { present: true }],
    ["invented absent value", { present: false, value: "INVENTED" }],
    ["over budget", { present: true, value: "x".repeat(33) }],
    ["embedded NUL", { present: true, value: "bad\0tag" }],
  ])("rejects malformed Trigger Tag provenance: %s", (_label, triggerTag) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [polygonSceneObject("triggers", {
        tag: "AREA_EXIT",
        source: {
          type: "aurora_git",
          sourceKind: "trigger",
          sourceIndex: 0,
          sourceObjectId: "obj_trigger_0",
          triggerTag,
          polygonGeometry: sourceGeometry,
        },
        polygonGeometry: targetGeometry,
      })],
    })).toBeNull();
  });

  it("retains one exact Encounter Tag source and target without normalization", () => {
    const value = {
      ...scene(),
      objects: [polygonSceneObject("encounters", {
        tag: "  GNOLL_AMBUSH  ",
        source: {
          type: "aurora_git",
          sourceKind: "encounter",
          sourceIndex: 0,
          sourceObjectId: "obj_encounter_0",
          encounterTag: { present: true, value: "X2_GNOLL001" },
          polygonGeometry: sourceGeometry,
        },
        polygonGeometry: targetGeometry,
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["missing value", { present: true }],
    ["invented absent value", { present: false, value: "INVENTED" }],
    ["over budget", { present: true, value: "x".repeat(33) }],
    ["embedded NUL", { present: true, value: "bad\0tag" }],
  ])("rejects malformed Encounter Tag provenance: %s", (_label, encounterTag) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [polygonSceneObject("encounters", {
        tag: "GNOLL_AMBUSH",
        source: {
          type: "aurora_git",
          sourceKind: "encounter",
          sourceIndex: 0,
          sourceObjectId: "obj_encounter_0",
          encounterTag,
          polygonGeometry: sourceGeometry,
        },
        polygonGeometry: targetGeometry,
      })],
    })).toBeNull();
  });

  it("retains exact Encounter scalar, script, Faction, and Difficulty source and target tuples", () => {
    const value = {
      ...scene(),
      placeableFactionCatalog: {
        descriptor: {
          resourceName: "repute.fac",
          sourceObjectKey: "modules/current/repute.fac",
          sha256: "f".repeat(64),
          sizeBytes: 1889,
          factionCount: 5,
        },
        rows: [
          { factionId: 0, name: "PC", parentFactionId: 0xffffffff, isGlobal: true },
          { factionId: 1, name: "Hostile", parentFactionId: 0xffffffff, isGlobal: true },
          { factionId: 2, name: "Commoner", parentFactionId: 0xffffffff, isGlobal: true },
          { factionId: 3, name: "Merchant", parentFactionId: 0xffffffff, isGlobal: true },
          { factionId: 4, name: "Defender", parentFactionId: 0xffffffff, isGlobal: true },
        ],
      },
      encounterDifficultyCatalog: {
        schemaVersion: "area-encounter-difficulty-catalog.v1",
        descriptor: {
          resourceName: "encdifficulty.2da",
          sourceObjectKey: "modules/current/encdifficulty.2da",
          sourceLayer: "module",
          sha256: "d".repeat(64),
          sizeBytes: 256,
          rowCount: 5,
        },
        rows: [-2, -1, 1, 2, 3].map((difficulty, rowIndex) => ({
          rowIndex,
          strRef: 1000 + rowIndex,
          value: difficulty,
          displayName: `Difficulty ${rowIndex}`,
          displaySource: "strref",
        })),
      },
      objects: [polygonSceneObject("encounters", {
        encounterActive: { activeByte: 0 },
        encounterPlayerOnly: { playerOnlyByte: 0 },
        encounterReset: { resetByte: 0 },
        encounterResetTime: { resetTime: 90 },
        encounterSpawnOption: { spawnOption: 1 },
        encounterRespawns: { respawns: -1 },
        encounterCreatureCounts: { maxCreatures: 3, recCreatures: 3 },
        encounterScriptResRefs: {
          onEntered: "new_enter",
          onExit: "enc_exit",
          onExhausted: "",
          onHeartbeat: "enc_heartbeat",
          onUserDefined: "enc_user",
        },
        encounterFactionId: 4,
        encounterDifficulty: { difficulty: 3, difficultyIndex: 4 },
        encounterLocalizedName: "Night Ambush",
        source: {
          type: "aurora_git",
          sourceKind: "encounter",
          sourceIndex: 0,
          sourceObjectId: "obj_encounter_0",
          encounterActiveStorage: { activeByte: 1 },
          encounterPlayerOnlyStorage: { playerOnlyByte: 1 },
          encounterResetStorage: { resetByte: 1 },
          encounterResetTimeStorage: { resetTime: 60 },
          encounterSpawnOptionStorage: { spawnOption: 0 },
          encounterRespawnsStorage: { respawns: 0 },
          encounterCreatureCountsStorage: { maxCreatures: 4, recCreatures: 2 },
          encounterScriptResRefsStorage: {
            onEntered: "enc_enter",
            onExit: "enc_exit",
            onExhausted: "",
            onHeartbeat: "enc_heartbeat",
            onUserDefined: "enc_user",
          },
          encounterFaction: {
            expectedValue: 1,
            catalogSha256: "f".repeat(64),
            catalogFactionCount: 5,
          },
          encounterDifficulty: {
            expectedValue: { difficulty: 1, difficultyIndex: 2 },
            catalogSha256: "d".repeat(64),
            catalogRowCount: 5,
          },
          encounterLocalizedNameStorage: {
            present: true,
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, textBytesBase64: "R25vbGwgQW1idXNo" }],
          },
          polygonGeometry: sourceGeometry,
        },
        polygonGeometry: targetGeometry,
      })],
    };

    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["numeric mismatch", { difficulty: 2, difficultyIndex: 4 }],
    ["missing index", { difficulty: 3 }],
    ["out-of-range index", { difficulty: 3, difficultyIndex: 5 }],
  ])("rejects catalog-incoherent Encounter Difficulty target: %s", (_label, target) => {
    const exact = {
      ...scene(),
      encounterDifficultyCatalog: {
        schemaVersion: "area-encounter-difficulty-catalog.v1",
        descriptor: {
          resourceName: "encdifficulty.2da",
          sourceObjectKey: "modules/current/encdifficulty.2da",
          sourceLayer: "module",
          sha256: "d".repeat(64),
          sizeBytes: 256,
          rowCount: 5,
        },
        rows: [-2, -1, 1, 2, 3].map((difficulty, rowIndex) => ({
          rowIndex,
          strRef: 1000 + rowIndex,
          value: difficulty,
          displayName: `Difficulty ${rowIndex}`,
          displaySource: "strref",
        })),
      },
      objects: [polygonSceneObject("encounters", {
        encounterDifficulty: target,
        source: {
          type: "aurora_git",
          sourceKind: "encounter",
          sourceIndex: 0,
          sourceObjectId: "obj_encounter_0",
          encounterDifficulty: {
            expectedValue: { difficulty: 1, difficultyIndex: 2 },
            catalogSha256: "d".repeat(64),
            catalogRowCount: 5,
          },
          polygonGeometry: sourceGeometry,
        },
        polygonGeometry: targetGeometry,
      })],
    };
    expect(parseAreaScene(exact)).toBeNull();
  });

  it.each([
    ["missing source", undefined, { activeByte: 0 }],
    ["noncanonical source", { activeByte: 2 }, { activeByte: 0 }],
    ["boolean target alias", { activeByte: 1 }, true],
    ["unexpected target key", { activeByte: 1 }, { activeByte: 0, extra: true }],
  ])("rejects malformed Encounter Active state: %s", (_label, sourceStorage, target) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [polygonSceneObject("encounters", {
        encounterActive: target,
        source: {
          type: "aurora_git",
          sourceKind: "encounter",
          sourceIndex: 0,
          sourceObjectId: "obj_encounter_0",
          ...(sourceStorage === undefined
            ? {}
            : { encounterActiveStorage: sourceStorage }),
          polygonGeometry: sourceGeometry,
        },
        polygonGeometry: targetGeometry,
      })],
    })).toBeNull();
  });

  it.each([
    ["missing source", undefined, { playerOnlyByte: 0 }],
    ["noncanonical source", { playerOnlyByte: 2 }, { playerOnlyByte: 0 }],
    ["boolean target alias", { playerOnlyByte: 1 }, true],
    ["unexpected target key", { playerOnlyByte: 1 }, {
      playerOnlyByte: 0,
      extra: true,
    }],
  ])("rejects malformed Encounter PlayerOnly state: %s", (
    _label,
    sourceStorage,
    target,
  ) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [polygonSceneObject("encounters", {
        encounterPlayerOnly: target,
        source: {
          type: "aurora_git",
          sourceKind: "encounter",
          sourceIndex: 0,
          sourceObjectId: "obj_encounter_0",
          ...(sourceStorage === undefined
            ? {}
            : { encounterPlayerOnlyStorage: sourceStorage }),
          polygonGeometry: sourceGeometry,
        },
        polygonGeometry: targetGeometry,
      })],
    })).toBeNull();
  });

  it.each([
    ["missing source", undefined, { resetByte: 0 }],
    ["noncanonical source", { resetByte: 2 }, { resetByte: 0 }],
    ["boolean target alias", { resetByte: 1 }, true],
    ["unexpected target key", { resetByte: 1 }, { resetByte: 0, extra: true }],
  ])("rejects malformed Encounter Reset state: %s", (
    _label,
    sourceStorage,
    target,
  ) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [polygonSceneObject("encounters", {
        encounterReset: target,
        source: {
          type: "aurora_git",
          sourceKind: "encounter",
          sourceIndex: 0,
          sourceObjectId: "obj_encounter_0",
          ...(sourceStorage === undefined
            ? {}
            : { encounterResetStorage: sourceStorage }),
          polygonGeometry: sourceGeometry,
        },
        polygonGeometry: targetGeometry,
      })],
    })).toBeNull();
  });

  it.each([
    ["missing source", undefined, { resetTime: 90 }],
    ["below-minimum source", { resetTime: 0 }, { resetTime: 90 }],
    ["string target alias", { resetTime: 60 }, "90"],
    ["above-maximum target", { resetTime: 60 }, { resetTime: 32_001 }],
    ["unexpected target key", { resetTime: 60 }, { resetTime: 90, extra: true }],
  ])("rejects malformed Encounter ResetTime state: %s", (
    _label,
    sourceStorage,
    target,
  ) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [polygonSceneObject("encounters", {
        encounterResetTime: target,
        source: {
          type: "aurora_git",
          sourceKind: "encounter",
          sourceIndex: 0,
          sourceObjectId: "obj_encounter_0",
          ...(sourceStorage === undefined
            ? {}
            : { encounterResetTimeStorage: sourceStorage }),
          polygonGeometry: sourceGeometry,
        },
        polygonGeometry: targetGeometry,
      })],
    })).toBeNull();
  });

  it.each([
    ["missing source", undefined, { spawnOption: 1 }],
    ["noncanonical source", { spawnOption: 2 }, { spawnOption: 1 }],
    ["string target alias", { spawnOption: 0 }, "1"],
    ["negative target", { spawnOption: 0 }, { spawnOption: -1 }],
    ["above-maximum target", { spawnOption: 0 }, { spawnOption: 2 }],
    ["unexpected target key", { spawnOption: 0 }, { spawnOption: 1, extra: true }],
  ])("rejects malformed Encounter SpawnOption state: %s", (
    _label,
    sourceStorage,
    target,
  ) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [polygonSceneObject("encounters", {
        encounterSpawnOption: target,
        source: {
          type: "aurora_git",
          sourceKind: "encounter",
          sourceIndex: 0,
          sourceObjectId: "obj_encounter_0",
          ...(sourceStorage === undefined
            ? {}
            : { encounterSpawnOptionStorage: sourceStorage }),
          polygonGeometry: sourceGeometry,
        },
        polygonGeometry: targetGeometry,
      })],
    })).toBeNull();
  });

  it.each(["triggers", "encounters"] as const)(
    "retains one exact %s immutable-source and editable-target polygon pair",
    (kind) => {
      const value = {
        ...scene(),
        objects: [polygonSceneObject(kind, {
          source: {
            type: "aurora_git",
            sourceKind: kind === "triggers" ? "trigger" : "encounter",
            sourceIndex: 0,
            sourceObjectId: `obj_${kind}_0`,
            polygonGeometry: sourceGeometry,
          },
          polygonGeometry: targetGeometry,
        })],
      };

      expect(parseAreaScene(value)).toEqual(value);
    },
  );

  it("retains source-only polygon provenance without inventing an editable target", () => {
    const value = {
      ...scene(),
      objects: [polygonSceneObject("triggers", {
        source: {
          type: "aurora_git",
          sourceKind: "trigger",
          sourceIndex: 0,
          sourceObjectId: "obj_trigger_0",
          polygonGeometry: sourceGeometry,
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["target without provenance", {
      source: { type: "aurora_git", sourceKind: "trigger", sourceIndex: 0 },
      polygonGeometry: targetGeometry,
    }],
    ["source without ordinal", {
      source: { type: "aurora_git", sourceKind: "trigger", polygonGeometry: sourceGeometry },
      polygonGeometry: targetGeometry,
    }],
    ["wrong family", {
      source: {
        type: "aurora_git", sourceKind: "encounter", sourceIndex: 0,
        polygonGeometry: sourceGeometry,
      },
      polygonGeometry: targetGeometry,
    }],
    ["malformed target", {
      source: {
        type: "aurora_git", sourceKind: "trigger", sourceIndex: 0,
        polygonGeometry: sourceGeometry,
      },
      polygonGeometry: { coordinateSpace: "native_local", points: [] },
    }],
  ])("rejects Trigger polygon %s", (_label, overrides) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [polygonSceneObject("triggers", overrides)],
    })).toBeNull();
  });
});

function doorSceneObject(overrides: Record<string, unknown>) {
  return {
    id: "area_event_probe:obj_door_0",
    kind: "doors",
    resRef: "nw_door",
    tag: "DOOR",
    x: 4,
    y: 5,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0,
    },
    ...overrides,
  };
}

function soundSceneObject(overrides: Record<string, unknown>) {
  return {
    id: "area_event_probe:obj_sound_0",
    kind: "sounds",
    resRef: "wind",
    tag: "WIND",
    x: 4,
    y: 5,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0,
    },
    ...overrides,
  };
}

describe("Area workspace Creature VarTable draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureVariables: { expectedEntries: [
      { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
      { sourceIndex: 1, name: "Label", type: "string", value: "old" },
    ] },
  } as const;

  it("retains exact physical provenance and a reordered supported target", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: exactSource,
        creatureProperties: { variables: [
          { name: "Label", type: "string", value: "ready" },
          { name: "Scale", type: "float", value: 2.5 },
          { name: "Counter", type: "int", value: -4 },
        ] },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["non-contiguous source ordinals", {
      ...exactSource,
      creatureVariables: { expectedEntries: [
        { sourceIndex: 1, name: "Counter", type: "int", value: 1 },
      ] },
    }, [{ name: "Counter", type: "int", value: 2 }]],
    ["wrong family", { ...exactSource, sourceKind: "placeable" }, [
      { name: "Counter", type: "int", value: 2 },
    ]],
    ["missing target", exactSource, undefined],
    ["unsupported target type", exactSource, [
      { name: "Object", type: "object", value: 1 },
    ]],
    ["non-f32 Float target", exactSource, [
      { name: "Scale", type: "float", value: 0.1 },
    ]],
  ])("rejects %s", (_label, source, variables) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source,
        creatureProperties: variables === undefined ? {} : { variables },
      })],
    })).toBeNull();
  });

  it("keeps a retained Creature without exact VarTable provenance preserve-only", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source: {
          type: "aurora_git",
          sourceKind: "creature",
          sourceIndex: 0,
          sourceObjectId: "obj_creature_0",
        },
        creatureProperties: {},
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });
});

describe("Area workspace Item VarTable draft boundary", () => {
  const exactSource = {
    type: "aurora_git",
    sourceKind: "item",
    sourceIndex: 0,
    sourceObjectId: "obj_item_0",
    itemVariables: { expectedEntries: [
      { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
      { sourceIndex: 1, name: "Label", type: "string", value: "old" },
    ] },
  } as const;

  it("retains exact physical provenance and a reordered supported target", () => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({
        source: exactSource,
        itemProperties: { variables: [
          { name: "Label", type: "string", value: "ready" },
          { name: "Scale", type: "float", value: 2.5 },
          { name: "Counter", type: "int", value: -4 },
        ] },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["non-contiguous source ordinals", {
      ...exactSource,
      itemVariables: { expectedEntries: [
        { sourceIndex: 1, name: "Counter", type: "int", value: 1 },
      ] },
    }, [{ name: "Counter", type: "int", value: 2 }]],
    ["wrong family", { ...exactSource, sourceKind: "placeable" }, [
      { name: "Counter", type: "int", value: 2 },
    ]],
    ["missing target", exactSource, undefined],
    ["unsupported target type", exactSource, [
      { name: "Object", type: "object", value: 1 },
    ]],
    ["non-f32 Float target", exactSource, [
      { name: "Scale", type: "float", value: 0.1 },
    ]],
  ])("rejects %s", (_label, source, variables) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [itemSceneObject({
        source,
        itemProperties: variables === undefined ? {} : { variables },
      })],
    })).toBeNull();
  });

  it("keeps a retained Item without exact VarTable provenance preserve-only", () => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({
        source: {
          type: "aurora_git",
          sourceKind: "item",
          sourceIndex: 0,
          sourceObjectId: "obj_item_0",
        },
        itemProperties: {},
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });
});

describe("Area workspace Item PropertiesList draft boundary", () => {
  const entry = {
    propertyName: 1,
    subtype: 0xffff,
    costTable: 2,
    costValue: 3,
    param1: 0xff,
    param1Value: 0,
    chanceAppear: 100,
  } as const;
  const exactSource = {
    type: "aurora_git",
    sourceKind: "item",
    sourceIndex: 0,
    sourceObjectId: "obj_item_0",
    itemPropertyList: {
      present: true,
      expectedEntries: [{ sourceIndex: 0, ...entry }],
    },
  } as const;

  it("retains exact physical provenance and a complete supported target", () => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({
        source: exactSource,
        itemProperties: { propertyList: [{
          ...entry,
          propertyName: 48,
          costTable: 24,
        }] },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["non-contiguous source ordinals", {
      ...exactSource,
      itemPropertyList: {
        present: true,
        expectedEntries: [{ sourceIndex: 1, ...entry }],
      },
    }, [entry]],
    ["wrong family", { ...exactSource, sourceKind: "placeable" }, [entry]],
    ["missing target", exactSource, undefined],
    ["partial target", exactSource, [{ propertyName: 1 }]],
    ["property-48 invariant failure", exactSource, [{
      ...entry,
      propertyName: 48,
      costTable: 23,
    }]],
  ])("rejects %s", (_label, source, propertyList) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [itemSceneObject({
        source,
        itemProperties: propertyList === undefined ? {} : { propertyList },
      })],
    })).toBeNull();
  });

  it("keeps a physically absent PropertiesList preserve-only", () => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({
        source: {
          ...exactSource,
          itemPropertyList: { present: false, expectedEntries: [] },
        },
        itemProperties: { propertyList: [{ propertyLabel: "display only" }] },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });
});

describe("Area workspace retained ground-Item inventory draft boundary", () => {
  const sourceEntries = [
    { sourceIndex: 0, resRef: "nw_it_gold001", x: 1, y: 2 },
    { sourceIndex: 1, resRef: "nw_it_gem001", x: 3, y: 4 },
  ] as const;
  const exactSource = {
    type: "aurora_git",
    sourceKind: "item",
    sourceIndex: 0,
    sourceObjectId: "obj_item_0",
    itemInventoryItems: sourceEntries,
  } as const;

  it("retains exact provenance with reorder, Word coordinate change, and removal", () => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({
        source: exactSource,
        itemProperties: {
          inventoryItems: [{ ...sourceEntries[1], x: 12, y: 13 }],
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains exact physical absence only with an empty target", () => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({
        source: { ...exactSource, itemInventoryItems: [] },
        itemProperties: { inventoryItems: [] },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["non-contiguous source ordinals", {
      ...exactSource,
      itemInventoryItems: [{ ...sourceEntries[0], sourceIndex: 1 }],
    }, [sourceEntries[0]]],
    ["wrong family", { ...exactSource, sourceKind: "placeable" }, sourceEntries],
    ["missing target", exactSource, undefined],
    ["changed identity", exactSource, [{ ...sourceEntries[0], resRef: "different" }]],
    ["duplicate retained source", exactSource, [sourceEntries[0], sourceEntries[0]]],
    ["mode flag", exactSource, [{ ...sourceEntries[0], infinite: false }]],
    ["nonempty target on absence", { ...exactSource, itemInventoryItems: [] }, [sourceEntries[0]]],
  ])("rejects %s", (_label, source, inventoryItems) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [itemSceneObject({
        source,
        itemProperties: inventoryItems === undefined ? {} : { inventoryItems },
      })],
    })).toBeNull();
  });
});

describe("Area workspace retained ground-Item static visual-transform boundary", () => {
  const sourceStorage = {
    present: true,
    value: {
      scaleX: 0.5,
      scaleY: 0.75,
      scaleZ: 1.25,
      rotateX: -15,
      rotateY: 30,
      rotateZ: 90,
      translateX: 20,
      translateY: -30,
      translateZ: 40,
    },
  } as const;
  const targetStorage = {
    present: true,
    value: {
      ...sourceStorage.value,
      scaleX: 2,
      scaleY: 3,
      scaleZ: 4,
      rotateX: 45,
      rotateY: -90,
      rotateZ: 180,
      translateX: -125,
      translateY: 250,
      translateZ: 500,
    },
  } as const;
  const exactSource = {
    type: "aurora_git",
    sourceKind: "item",
    sourceIndex: 0,
    sourceObjectId: "obj_item_0",
    itemVisualTransform: sourceStorage,
  } as const;
  const targetPresentation = {
    scale: 3,
    scaleX: 2,
    scaleY: 3,
    scaleZ: 4,
    offsetX: -12.5,
    offsetY: 25,
    offsetZ: 50,
    pitch: Math.PI / 4,
    roll: -Math.PI / 2,
    yaw: Math.PI,
  } as const;

  it("retains detached exact source and a coherent changed native target", () => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({
        source: exactSource,
        itemProperties: { visualTransform: targetStorage },
        visualTransform: targetPresentation,
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("admits exact physical absence with one coherent non-default create target", () => {
    const value = {
      ...scene(),
      objects: [itemSceneObject({
        source: { ...exactSource, itemVisualTransform: { present: false } },
        itemProperties: { visualTransform: targetStorage },
        visualTransform: targetPresentation,
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["wrong family", { ...exactSource, sourceKind: "placeable" }, targetStorage, targetPresentation],
    ["missing target", exactSource, undefined, targetPresentation],
    ["target without provenance", {
      type: "aurora_git", sourceKind: "item", sourceIndex: 0, sourceObjectId: "obj_item_0",
    }, targetStorage, targetPresentation],
    ["inexact target", exactSource, {
      ...targetStorage,
      value: { ...targetStorage.value, scaleX: 0.1 },
    }, targetPresentation],
    ["presentation/target drift", exactSource, targetStorage, {
      ...targetPresentation,
      offsetZ: 51,
    }],
  ])("rejects %s", (_label, source, visualTransform, presentation) => {
    expect(parseAreaScene({
      ...scene(),
      objects: [itemSceneObject({
        source,
        itemProperties: visualTransform === undefined ? {} : { visualTransform },
        visualTransform: presentation,
      })],
    })).toBeNull();
  });
});

describe("Area workspace Item BaseItem/appearance draft boundary", () => {
  const itemBaseItemCatalog = {
    descriptor: {
      resourceName: "baseitems.2da",
      sourceObjectKey: "modules/current/baseitems.2da",
      sourceLayer: "module",
      sha256: "b".repeat(64),
      sizeBytes: 4096,
      rowCount: 2,
    },
    rows: [
      { rowIndex: 0, modelType: 0, displayName: "Simple" },
      { rowIndex: 1, modelType: 2, itemClass: "WSwLs", displayName: "Weapon" },
    ],
  } as const;
  const source = {
    type: "aurora_git",
    sourceKind: "item",
    sourceIndex: 0,
    sourceObjectId: "obj_item_0",
    itemBaseAppearance: {
      expectedValue: {
        baseItem: 0,
        modelType: 0,
        appearance: { modelPart1: 66 },
      },
      tableSha256: "b".repeat(64),
      tableRowCount: 2,
    },
  } as const;

  it("retains exact catalog provenance and a complete cross-profile target", () => {
    const value = {
      ...scene(),
      itemBaseItemCatalog,
      objects: [itemSceneObject({
        source,
        itemProperties: {
          baseItem: 1,
          modelPart1: 7,
          modelPart2: 8,
          modelPart3: 9,
          baseAppearance: {
            baseItem: 1,
            modelType: 2,
            appearance: { modelPart1: 7, modelPart2: 8, modelPart3: 9 },
          },
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it.each([
    ["missing catalog", undefined, source, {
      baseItem: 0, modelType: 0, appearance: { modelPart1: 66 },
    }],
    ["stale catalog digest", itemBaseItemCatalog, {
      ...source,
      itemBaseAppearance: {
        ...source.itemBaseAppearance,
        tableSha256: "c".repeat(64),
      },
    }, { baseItem: 0, modelType: 0, appearance: { modelPart1: 66 } }],
    ["partial target", itemBaseItemCatalog, source, {
      baseItem: 1, modelType: 2, appearance: { modelPart1: 7, modelPart2: 8 },
    }],
  ])("rejects %s", (_label, catalog, itemSource, baseAppearance) => {
    expect(parseAreaScene({
      ...scene(),
      ...(catalog ? { itemBaseItemCatalog: catalog } : {}),
      objects: [itemSceneObject({
        source: itemSource,
        itemProperties: { baseAppearance },
      })],
    })).toBeNull();
  });
});

describe("Area workspace Creature class-identity destructive-clear boundary", () => {
  const source = {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    sourceObjectId: "obj_creature_0",
    creatureClassIdentityState: {
      present: true,
      nativeType: "list",
      structTypeId: 2,
      classNativeType: "int",
      levelNativeType: "short",
      classListGraphSha256: "c".repeat(64),
      entries: [{
        classId: 4,
        level: 3,
        opaqueSiblingFieldCount: 1,
        canonicalSpellListFieldCount: 2,
        spellEntryCount: 3,
      }],
      classesTable: {
        resourceName: "classes.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/classes.2da",
        sourceLayer: "vanilla",
        sha256: "a".repeat(64),
        sizeBytes: 12_000,
        rowCount: 64,
      },
    },
    creatureStartingPackage: {
      present: true,
      nativeType: "byte",
      value: 0,
      classIds: [4],
      table: {
        resourceName: "packages.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
        sourceLayer: "vanilla",
        sha256: "b".repeat(64),
        sizeBytes: 30_510,
        rowCount: 132,
        rowIndex: 0,
        classId: 4,
      },
    },
    creatureClassLevelState: {
      present: true,
      nativeType: "list",
      structTypeId: 2,
      classNativeType: "int",
      levelNativeType: "short",
      entries: [{ classId: 4, level: 3, opaqueSiblingFieldCount: 1 }],
    },
    creatureHitPointState: {
      present: true,
      hitPoints: { nativeType: "short", value: 10 },
      currentHitPoints: { nativeType: "short", value: 7 },
      maxHitPoints: { nativeType: "short", value: 19 },
      constitution: { nativeType: "byte", value: 14 },
      race: { nativeType: "byte", value: 1 },
      classLevels: [3],
      featRow40Present: false,
      racialTypes: {
        resourceName: "racialtypes.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/racialtypes.2da",
        sourceLayer: "vanilla",
        sha256: "d".repeat(64),
        sizeBytes: 8_000,
        rowCount: 64,
        rowIndex: 1,
        constitutionAdjust: 2,
      },
    },
  };

  it("retains one confirmed same-roster target with unchanged levels and a bounded package", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source,
        creatureProperties: {
          classEntries: [{ classId: 5, className: "Wizard", level: 3 }],
          classIdentityDestructiveSpellClearConfirmed: true,
          advancedSettings: { startingPackageId: 2 },
          statistics: {
            abilityScores: { constitution: 14 },
            baseHitPoints: 10,
            hitPointBonuses: 9,
            currentHitPoints: 10,
            maxHitPoints: 19,
          },
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains one confirmed simultaneous class and level target with HP provenance", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source,
        creatureProperties: {
          classEntries: [{ classId: 5, className: "Wizard", level: 4 }],
          classIdentityDestructiveSpellClearConfirmed: true,
          advancedSettings: { startingPackageId: 2 },
          statistics: {
            abilityScores: { constitution: 14 },
            baseHitPoints: 10,
            hitPointBonuses: 12,
            currentHitPoints: 7,
            maxHitPoints: 22,
          },
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("retains one exact append-tail class-slot target with coupled HP provenance", () => {
    const value = {
      ...scene(),
      objects: [creatureSceneObject({
        source,
        creatureProperties: {
          classEntries: [
            { classId: 4, className: "Fighter", level: 3 },
            { classId: 5, className: "Wizard", level: 1 },
          ],
          classIdentityDestructiveSpellClearConfirmed: false,
          classSlotResizeDestructiveRemovalConfirmed: false,
          advancedSettings: { startingPackageId: 2 },
          statistics: {
            abilityScores: { constitution: 14 },
            baseHitPoints: 10,
            hitPointBonuses: 12,
            currentHitPoints: 7,
            maxHitPoints: 22,
          },
        },
      })],
    };
    expect(parseAreaScene(value)).toEqual(value);
  });

  it("rejects append-tail class-slot targets without an explicit non-destructive flag", () => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source,
        creatureProperties: {
          classEntries: [
            { classId: 4, className: "Fighter", level: 3 },
            { classId: 5, className: "Wizard", level: 1 },
          ],
          classIdentityDestructiveSpellClearConfirmed: false,
          advancedSettings: { startingPackageId: 2 },
          statistics: {
            abilityScores: { constitution: 14 },
            baseHitPoints: 10,
            hitPointBonuses: 12,
            currentHitPoints: 7,
            maxHitPoints: 22,
          },
        },
      })],
    })).toBeNull();
  });

  it("rejects zero-slot and non-prefix class-slot targets", () => {
    const invalidClassEntries = [
      [],
      [
        { classId: 5, className: "Wizard", level: 3 },
        { classId: 4, className: "Fighter", level: 1 },
      ],
    ];
    for (const classEntries of invalidClassEntries) {
      expect(parseAreaScene({
        ...scene(),
        objects: [creatureSceneObject({
          source,
          creatureProperties: {
            classEntries,
            classIdentityDestructiveSpellClearConfirmed: false,
            classSlotResizeDestructiveRemovalConfirmed: false,
            advancedSettings: { startingPackageId: 2 },
            statistics: {
              abilityScores: { constitution: 14 },
              baseHitPoints: 10,
              hitPointBonuses: 12,
              currentHitPoints: 7,
              maxHitPoints: 22,
            },
          },
        })],
      })).toBeNull();
    }
  });

  it("rejects a class change without destructive-clear confirmation", () => {
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source,
        creatureProperties: {
          classEntries: [{ classId: 5, className: "Wizard", level: 4 }],
          classIdentityDestructiveSpellClearConfirmed: false,
          advancedSettings: { startingPackageId: 2 },
          statistics: {
            abilityScores: { constitution: 14 },
            baseHitPoints: 10,
            hitPointBonuses: 12,
            currentHitPoints: 7,
            maxHitPoints: 22,
          },
        },
      })],
    })).toBeNull();
  });

  it("rejects a simultaneous level edit when coupled HP provenance is absent", () => {
    const { creatureHitPointState: _missing, ...sourceWithoutHitPoints } = source;
    expect(parseAreaScene({
      ...scene(),
      objects: [creatureSceneObject({
        source: sourceWithoutHitPoints,
        creatureProperties: {
          classEntries: [{ classId: 5, className: "Wizard", level: 4 }],
          classIdentityDestructiveSpellClearConfirmed: true,
          advancedSettings: { startingPackageId: 2 },
          statistics: {
            abilityScores: { constitution: 14 },
            baseHitPoints: 10,
            hitPointBonuses: 12,
            currentHitPoints: 7,
            maxHitPoints: 22,
          },
        },
      })],
    })).toBeNull();
  });
});

function placeableSceneObject(overrides: Record<string, unknown>) {
  return {
    id: "area_event_probe:obj_placeable_0",
    kind: "placeables",
    resRef: "plc_chest",
    tag: "CHEST",
    x: 4,
    y: 5,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0,
    },
    ...overrides,
  };
}

function creatureSceneObject(overrides: Record<string, unknown>) {
  return {
    id: "area_event_probe:obj_creature_0",
    kind: "creatures",
    resRef: "nw_chicken",
    tag: "NW_CHICKEN",
    x: 4,
    y: 5,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0,
    },
    ...overrides,
  };
}

function itemSceneObject(overrides: Record<string, unknown>) {
  return {
    id: "area_event_probe:obj_item_0",
    kind: "items",
    resRef: "nw_sword",
    tag: "NW_SWORD",
    x: 4,
    y: 5,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0,
    },
    ...overrides,
  };
}

function storeSceneObject(overrides: Record<string, unknown>) {
  return {
    id: "area_event_probe:obj_store_0",
    kind: "stores",
    resRef: "x2_merc_dye",
    tag: "STORE_DYE",
    x: 4,
    y: 5,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0,
    },
    ...overrides,
  };
}

function polygonSceneObject(
  kind: "triggers" | "encounters",
  overrides: Record<string, unknown>,
) {
  return {
    id: `area_event_probe:obj_${kind}_0`,
    kind,
    resRef: kind === "triggers" ? "newgeneric" : "x2_gnoll001",
    tag: kind.toUpperCase(),
    x: 4,
    y: 5,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0,
    },
    ...overrides,
  };
}

function polygon(points: ReadonlyArray<readonly [number, number, number]>) {
  return {
    coordinateSpace: "native_local",
    points: points.map(([x, y, z]) => ({ x, y, z })),
  };
}
