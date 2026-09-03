import { describe, expect, it } from "vitest";
import {
  createAreaPropertiesFacade,
} from "../../../../src/modules/areas/application/areaPropertiesFacade";
import { effectiveAreaAudioCatalogBundle } from "./areaAudioCatalogFixture";
import { effectiveAreaLoadingScreenCatalog } from "./areaLoadingScreenCatalogFixture";
import { effectiveAreaVisualEnvironmentCatalogBundle } from "./areaVisualEnvironmentCatalogFixture";
import type { AreaScene } from "../../../../src/modules/scene/contracts";

function scene(
  areaComments?: string,
  areaEventScripts?: AreaScene["areaEventScripts"],
  areaBasicIdentity?: AreaScene["areaBasicIdentity"],
  areaAdvancedFlags?: AreaScene["areaAdvancedFlags"],
): AreaScene {
  return {
    sceneId: "area_comments_probe",
    areaName: areaBasicIdentity?.name ?? "Comments Probe",
    width: 1,
    height: 1,
    ...(areaComments !== undefined ? { areaComments } : {}),
    ...(areaEventScripts !== undefined ? { areaEventScripts } : {}),
    ...(areaBasicIdentity !== undefined ? { areaBasicIdentity } : {}),
    ...(areaBasicIdentity?.tag !== undefined ? { areaTag: areaBasicIdentity.tag } : {}),
    ...(areaAdvancedFlags !== undefined ? { areaAdvancedFlags } : {}),
    tiles: [],
    objects: [],
    updatedAtUnixMs: 100,
    source: "aurora_area",
  };
}

describe("AreaPropertiesFacade", () => {
  it("projects a detached effective visual catalog bundle into the property draft", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const catalogs = effectiveAreaVisualEnvironmentCatalogBundle();
    const source = {
      ...scene(),
      areaVisualEnvironmentCatalogs: catalogs,
      areaVisualEnvironmentCatalogSelection: {
        lightingSchemeRowIndex: 0,
        skyBoxRowIndex: 0,
      },
      areaVisualEnvironment: catalogs.lightingSchemes.rows[0]!.visualEnvironment,
      areaVisualEnvironmentScalarControls: catalogs.lightingSchemes.rows[0]!
        .visualEnvironmentScalarControls,
      auroraAreaEditing: { state: { areaResRef: "area_comments_probe" } },
    } as AreaScene;

    const draft = facade.buildDraft(source);
    expect(draft.visualEnvironmentCatalogs).toEqual(catalogs);
    expect(draft.visualEnvironmentCatalogs).not.toBe(catalogs);
    expect(draft.visualEnvironmentCatalogs?.lightingSchemes.rows[0]?.visualEnvironment.sun)
      .not.toBe(catalogs.lightingSchemes.rows[0]?.visualEnvironment.sun);
    expect(draft.visualEnvironmentCatalogSelection).toEqual({
      value: { lightingSchemeRowIndex: 0, skyBoxRowIndex: 0 },
      sourceValue: { lightingSchemeRowIndex: 0, skyBoxRowIndex: 0 },
      state: "editable",
    });
  });

  it("applies and builds one catalog-bound Lighting Scheme selection CAS", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const catalogs = visualCatalogsWithSecondRow();
    const sourceVisual = catalogs.lightingSchemes.rows[0]!.visualEnvironment;
    const targetVisual = catalogs.lightingSchemes.rows[1]!.visualEnvironment;
    const sourceScalars = catalogs.lightingSchemes.rows[0]!
      .visualEnvironmentScalarControls;
    const targetScalars = catalogs.lightingSchemes.rows[1]!
      .visualEnvironmentScalarControls;
    const source = {
      ...scene(),
      areaVisualEnvironment: sourceVisual,
      areaVisualEnvironmentScalarControls: sourceScalars,
      areaVisualEnvironmentCatalogs: catalogs,
      areaVisualEnvironmentCatalogSelection: {
        lightingSchemeRowIndex: 0,
        skyBoxRowIndex: 0,
      },
      auroraAreaEditing: { state: { areaResRef: "area_comments_probe" } },
    } as AreaScene;
    const draft = facade.buildDraft(source);
    const result = facade.apply(source, {
      ...draft,
      visualEnvironmentCatalogSelection: {
        ...draft.visualEnvironmentCatalogSelection!,
        value: { lightingSchemeRowIndex: 1, skyBoxRowIndex: 1 },
      },
      visualEnvironment: {
        ...draft.visualEnvironment!,
        value: targetVisual,
      },
      visualEnvironmentScalarControls: {
        ...draft.visualEnvironmentScalarControls!,
        value: targetScalars,
      },
    });

    expect(result).toEqual({
      ok: true,
      changed: true,
      value: expect.objectContaining({
        areaVisualEnvironmentCatalogSelection: {
          lightingSchemeRowIndex: 1,
          skyBoxRowIndex: 1,
        },
        areaVisualEnvironment: targetVisual,
        areaVisualEnvironmentScalarControls: targetScalars,
        updatedAtUnixMs: 200,
      }),
    });
    if (!result.ok) throw new Error("Expected catalog-bound selection to apply.");
    expect(facade.buildVisualEnvironmentCatalogSelectionMutation(result.value, {
      visualEnvironmentCatalogs: catalogs,
      visualEnvironmentCatalogSelection: {
        lightingSchemeRowIndex: 0,
        skyBoxRowIndex: 0,
      },
      visualEnvironment: sourceVisual,
      visualEnvironmentScalarControls: sourceScalars,
    })).toEqual({
      catalogIdentity: {
        environmentSha256: "a".repeat(64),
        skyBoxesSha256: "b".repeat(64),
      },
      expectedValue: {
        lightingSchemeRowIndex: 0,
        skyBoxRowIndex: 0,
        visualEnvironment: sourceVisual,
        visualEnvironmentScalarControls: sourceScalars,
      },
      value: { lightingSchemeRowIndex: 1, skyBoxRowIndex: 1 },
    });
  });

  it("fails closed when a catalog selection draft is stale or targets an absent row", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const catalogs = visualCatalogsWithSecondRow();
    const source = {
      ...scene(),
      areaVisualEnvironment: catalogs.lightingSchemes.rows[0]!.visualEnvironment,
      areaVisualEnvironmentScalarControls: catalogs.lightingSchemes.rows[0]!
        .visualEnvironmentScalarControls,
      areaVisualEnvironmentCatalogs: catalogs,
      areaVisualEnvironmentCatalogSelection: {
        lightingSchemeRowIndex: 0,
        skyBoxRowIndex: 0,
      },
      auroraAreaEditing: { state: { areaResRef: "area_comments_probe" } },
    } as AreaScene;
    const draft = facade.buildDraft(source);

    expect(facade.apply(source, {
      ...draft,
      visualEnvironmentCatalogSelection: {
        ...draft.visualEnvironmentCatalogSelection!,
        sourceValue: { lightingSchemeRowIndex: 1, skyBoxRowIndex: 0 },
      },
    })).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: "AREA_VISUAL_ENVIRONMENT_CATALOG_SELECTION_PRESERVE_ONLY",
      }),
    });
    expect(facade.apply(source, {
      ...draft,
      visualEnvironmentCatalogSelection: {
        ...draft.visualEnvironmentCatalogSelection!,
        value: { lightingSchemeRowIndex: 7, skyBoxRowIndex: 0 },
      },
    })).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: "AREA_VISUAL_ENVIRONMENT_CATALOG_SELECTION_INVALID",
      }),
    });
  });

  it("projects a valid loading-screen catalog into the property draft as immutable query context", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const catalog = effectiveAreaLoadingScreenCatalog();
    const source = {
      ...scene(undefined, undefined, undefined, { loadingScreenId: 2 }),
      areaLoadingScreenCatalog: catalog,
    };

    const draft = facade.buildDraft(source);
    expect(draft.loadingScreenCatalog).toEqual(catalog);
    expect(draft.loadingScreenCatalog).not.toBe(catalog);
    expect(draft.loadingScreenCatalog?.rows[0]?.imageAsset)
      .not.toBe(catalog.rows[0]?.imageAsset);

    const result = facade.apply(source, draft);
    expect(result).toEqual({ ok: true, changed: false, value: source });
  });

  it("builds an exact editable draft when Area Comments provenance is present", () => {
    const facade = createAreaPropertiesFacade(() => 200);

    expect(facade.buildDraft(scene(" exact\r\nnote "))).toEqual({
      comments: " exact\r\nnote ",
      commentsState: "editable",
      maxCommentsCodeUnits: 4096,
      eventScripts: {
        onEnter: { value: "", state: "preserve_only" },
        onExit: { value: "", state: "preserve_only" },
        onHeartbeat: { value: "", state: "preserve_only" },
        onUserDefined: { value: "", state: "preserve_only" },
      },
      basicIdentity: {
        name: { value: "Comments Probe", state: "preserve_only" },
        tag: { value: "", state: "preserve_only" },
      },
      advancedFlags: {
        terrainType: {
          value: { interior: false, natural: false, subterranean: false },
          state: "preserve_only",
        },
        playerVsPlayer: { value: 0, state: "preserve_only" },
        noRest: { value: false, state: "preserve_only" },
        listenCheckModifier: { value: 0, state: "preserve_only" },
        spotCheckModifier: { value: 0, state: "preserve_only" },
        loadingScreenId: { value: 0, state: "preserve_only" },
      },
      moduleStartLocation: {
        value: {
          areaResRef: "",
          x: 0,
          y: 0,
          z: 0,
          directionX: 0,
          directionY: 0,
        },
        state: "preserve_only",
      },
      visualEnvironment: {
        value: {
          dayNightMode: "cycle",
          shadowOpacity: 0,
          chanceRain: 0,
          chanceSnow: 0,
          chanceLightning: 0,
          sun: {
            ambientColor: 0,
            diffuseColor: 0,
            fogColor: 0,
            fogAmount: 0,
            shadows: false,
          },
          moon: {
            ambientColor: 0,
            diffuseColor: 0,
            fogColor: 0,
            fogAmount: 0,
            shadows: false,
          },
        },
        state: "preserve_only",
      },
      visualEnvironmentScalarControls: {
        value: { fogClipDistance: 45, windPower: 0 },
        state: "preserve_only",
      },
      audioEnvironment: {
        value: {
          ambientSoundDayId: 0,
          ambientSoundNightId: 0,
          ambientSoundDayVolume: 0,
          ambientSoundNightVolume: 0,
          environmentAudioId: 0,
          musicBattleId: 0,
          musicDayId: 0,
          musicNightId: 0,
          musicDelayMilliseconds: 0,
        },
        state: "preserve_only",
      },
      variables: {
        value: [],
        state: "preserve_only",
      },
    });
  });

  it("builds, applies, and transfers exact ordered Area variables with duplicate names", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const sourceEntries = [
      { name: "DUPLICATE", type: "int" as const, value: -7 },
      { name: "DUPLICATE", type: "float" as const, value: Math.fround(1.25) },
      { name: "", type: "string" as const, value: " exact value " },
    ];
    const targetEntries = [
      sourceEntries[1]!,
      { ...sourceEntries[0]!, value: 42 },
      { name: "NEW_VALUE", type: "string" as const, value: "created" },
    ];
    const source = { ...scene(), areaVariables: sourceEntries };
    const draft = facade.buildDraft(source);

    expect(draft.variables).toEqual({
      value: sourceEntries,
      sourceValue: sourceEntries,
      state: "editable",
    });
    expect(draft.variables?.value).not.toBe(sourceEntries);

    const result = facade.apply(source, {
      ...draft,
      variables: { ...draft.variables!, value: targetEntries },
    });
    expect(result).toEqual({
      ok: true,
      changed: true,
      value: { ...source, areaVariables: targetEntries, updatedAtUnixMs: 200 },
    });
    if (!result.ok) throw new Error("Expected Area variable edit to succeed.");

    expect(facade.buildVariableMutation(result.value, {
      variables: {
        expectedEntries: sourceEntries.map((entry, sourceIndex) => ({ ...entry, sourceIndex })),
      },
      sourceResources: { gitSha256: "a".repeat(64) },
    })).toEqual({
      expectedEntries: sourceEntries.map((entry, sourceIndex) => ({ ...entry, sourceIndex })),
      entries: targetEntries,
      sourceGitSha256: "a".repeat(64),
    });
  });

  it("treats an admitted absent VarTable as an editable empty list", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const source = { ...scene(), areaVariables: [] };
    const draft = facade.buildDraft(source);

    expect(draft.variables).toEqual({ value: [], sourceValue: [], state: "editable" });
    const result = facade.apply(source, {
      ...draft,
      variables: {
        ...draft.variables!,
        value: [{ name: "CREATED", type: "int", value: 1 }],
      },
    });
    expect(result).toEqual({
      ok: true,
      changed: true,
      value: {
        ...source,
        areaVariables: [{ name: "CREATED", type: "int", value: 1 }],
        updatedAtUnixMs: 200,
      },
    });
  });

  it("fails closed for guessed, malformed, or unbound Area variable edits", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const missing = scene();
    expect(facade.apply(missing, {
      ...facade.buildDraft(missing),
      variables: {
        value: [{ name: "GUESSED", type: "int", value: 1 }],
        state: "editable",
      },
    })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "AREA_VARIABLES_PRESERVE_ONLY" }),
    });

    const source = { ...scene(), areaVariables: [{ name: "SAFE", type: "int" as const, value: 1 }] };
    const draft = facade.buildDraft(source);
    expect(facade.apply(source, {
      ...draft,
      variables: {
        ...draft.variables!,
        value: [{ name: "BAD", type: "float", value: 0.1 }],
      },
    })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "AREA_VARIABLES_INVALID" }),
    });
    expect(() => facade.buildVariableMutation(source, {
      variables: { expectedEntries: [{ sourceIndex: 0, name: "SAFE", type: "int", value: 1 }] },
      sourceResources: {},
    })).toThrow("immutable GIT source provenance");
  });

  it("builds, applies, and transfers one complete exact Area audio tuple", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const sourceAudio = audioEnvironment();
    const source = {
      ...scene(),
      areaAudioEnvironment: sourceAudio,
      areaAudioEnvironmentCatalogs: effectiveAreaAudioCatalogBundle(),
      auroraAreaEditing: { state: { areaResRef: "crypt01" } },
    } as AreaScene;
    const draft = facade.buildDraft(source);
    expect(draft.audioEnvironment).toEqual({
      value: sourceAudio,
      sourceValue: sourceAudio,
      catalogs: effectiveAreaAudioCatalogBundle(),
      state: "editable",
    });
    const target = { ...sourceAudio, ambientSoundDayVolume: 55, musicDelayMilliseconds: -4000 };
    const result = facade.apply(source, {
      ...draft,
      audioEnvironment: { ...draft.audioEnvironment!, value: target },
    });
    expect(result).toEqual({
      ok: true,
      changed: true,
      value: { ...source, areaAudioEnvironment: target, updatedAtUnixMs: 200 },
    });
    if (!result.ok) throw new Error("Expected Area audio edit to succeed.");
    expect(facade.buildAudioEnvironmentMutation(result.value, {
      audioEnvironment: sourceAudio,
    })).toEqual({ expectedValue: sourceAudio, value: target });
  });

  it("fails closed for missing or invalid Area audio storage", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const missing = scene();
    const missingDraft = facade.buildDraft(missing);
    expect(facade.apply(missing, {
      ...missingDraft,
      audioEnvironment: {
        ...missingDraft.audioEnvironment!,
        state: "editable",
        value: audioEnvironment(),
      },
    })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "AREA_AUDIO_ENVIRONMENT_PRESERVE_ONLY" }),
    });

    const source = {
      ...scene(),
      areaAudioEnvironment: audioEnvironment(),
      auroraAreaEditing: { state: { areaResRef: "crypt01" } },
    } as AreaScene;
    const draft = facade.buildDraft(source);
    expect(facade.apply(source, {
      ...draft,
      audioEnvironment: {
        ...draft.audioEnvironment!,
        value: { ...audioEnvironment(), ambientSoundNightVolume: 128 },
      },
    })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "AREA_AUDIO_ENVIRONMENT_INVALID" }),
    });
  });

  it("builds, applies, and transfers the complete module Start Location CAS tuple", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const sourceStartLocation = {
      areaResRef: "crypt01",
      x: Math.fround(1.25),
      y: Math.fround(2.5),
      z: Math.fround(3.75),
      directionX: Math.fround(0),
      directionY: Math.fround(1),
    };
    const source = {
      ...scene(),
      moduleStartLocation: sourceStartLocation,
      moduleStartLocationTargets: ["crypt01", "otherarea"],
      auroraAreaEditing: { state: { areaResRef: "crypt01" } },
    } as AreaScene;
    const draft = facade.buildDraft(source);
    expect(draft.moduleStartLocation).toEqual({
      value: sourceStartLocation,
      sourceValue: sourceStartLocation,
      currentAreaResRef: "crypt01",
      targetAreaResRefs: ["crypt01", "otherarea"],
      state: "editable",
    });

    const target = {
      areaResRef: "otherarea",
      x: Math.fround(12.5),
      y: Math.fround(-4.25),
      z: Math.fround(0.5),
      directionX: Math.fround(-1),
      directionY: Math.fround(0),
    };
    const result = facade.apply(source, {
      ...draft,
      moduleStartLocation: { ...draft.moduleStartLocation!, value: target },
    });

    expect(result).toEqual({
      ok: true,
      changed: true,
      value: { ...source, moduleStartLocation: target, updatedAtUnixMs: 200 },
    });
    if (!result.ok) throw new Error("Expected module Start Location edit to succeed.");
    expect(facade.buildModuleStartLocationMutation(result.value, {
      moduleStartLocation: sourceStartLocation,
      moduleStartLocationTargets: ["crypt01", "otherarea"],
    })).toEqual({
      expectedValue: sourceStartLocation,
      value: target,
    });
  });

  it("preserves an unavailable exact Start Location and rejects guessed or unsafe targets", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const retainedStartLocation = {
      areaResRef: "otherarea",
      x: Math.fround(1),
      y: Math.fround(2),
      z: Math.fround(3),
      directionX: Math.fround(0),
      directionY: Math.fround(1),
    };
    const preserveOnlySource = {
      ...scene(),
      moduleStartLocation: retainedStartLocation,
    } as AreaScene;
    const preserveDraft = facade.buildDraft(preserveOnlySource);
    expect(preserveDraft.moduleStartLocation?.state).toBe("preserve_only");
    expect(facade.apply(preserveOnlySource, preserveDraft)).toEqual({
      ok: true,
      changed: false,
      value: preserveOnlySource,
    });

    const absent = scene();
    expect(facade.apply(absent, {
      ...facade.buildDraft(absent),
      moduleStartLocation: {
        value: retainedStartLocation,
        state: "preserve_only",
      },
    })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "AREA_START_LOCATION_PRESERVE_ONLY" }),
    });

    const editable = {
      ...scene(),
      moduleStartLocation: { ...retainedStartLocation, areaResRef: "crypt01" },
      auroraAreaEditing: { state: { areaResRef: "crypt01" } },
    } as AreaScene;
    const editableDraft = facade.buildDraft(editable);
    expect(facade.apply(editable, {
      ...editableDraft,
      moduleStartLocation: {
        ...editableDraft.moduleStartLocation!,
        value: { ...editableDraft.moduleStartLocation!.value, areaResRef: "otherarea" },
      },
    })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "AREA_START_LOCATION_INVALID" }),
    });
    expect(facade.apply(editable, {
      ...editableDraft,
      moduleStartLocation: {
        ...editableDraft.moduleStartLocation!,
        value: { ...editableDraft.moduleStartLocation!.value, x: Number.POSITIVE_INFINITY },
      },
    })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "AREA_START_LOCATION_INVALID" }),
    });
    expect(() => facade.buildModuleStartLocationMutation(
      { ...editable, moduleStartLocation: retainedStartLocation },
      { moduleStartLocation: editable.moduleStartLocation },
    )).toThrow("immutable module membership");
  });

  it("builds, applies, and transfers exact Area Name and Tag CAS mutations", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const source = scene(undefined, undefined, {
      name: " Old Name ",
      nameProfile: "multi_entry_inline_ascii",
      nameEntries: [
        { languageId: 3, text: "Nom" },
        { languageId: 0, text: " Old Name " },
      ],
      tag: "OLD_TAG",
    });
    const draft = facade.buildDraft(source);
    expect(draft.basicIdentity).toEqual({
      name: {
        value: " Old Name ",
        state: "editable",
        profile: "multi_entry_inline_ascii",
        entries: [
          { languageId: 3, text: "Nom" },
          { languageId: 0, text: " Old Name " },
        ],
      },
      tag: { value: "OLD_TAG", state: "editable" },
    });

    const result = facade.apply(source, {
      ...draft,
      basicIdentity: {
        name: {
          value: " New Name ",
          state: "editable",
          profile: "multi_entry_inline_ascii",
          entries: [
            { languageId: 0, text: " New Name " },
            { languageId: 3, text: "Nouveau nom" },
          ],
        },
        tag: { value: "NEW_TAG", state: "editable" },
      },
    });
    expect(result).toEqual({
      ok: true,
      changed: true,
      value: {
        ...source,
        areaName: " New Name ",
        areaTag: "NEW_TAG",
        areaBasicIdentity: {
          name: " New Name ",
          nameProfile: "multi_entry_inline_ascii",
          nameEntries: [
            { languageId: 0, text: " New Name " },
            { languageId: 3, text: "Nouveau nom" },
          ],
          tag: "NEW_TAG",
        },
        updatedAtUnixMs: 200,
      },
    });
    if (!result.ok) throw new Error("Expected Area basic-identity edit to succeed.");
    expect(facade.buildBasicIdentityMutations(result.value, {
      basicIdentity: source.areaBasicIdentity,
    })).toEqual({
      name: {
        expectedValue: " Old Name ",
        value: " New Name ",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries: [
          { languageId: 3, text: "Nom" },
          { languageId: 0, text: " Old Name " },
        ],
        valueEntries: [
          { languageId: 0, text: " New Name " },
          { languageId: 3, text: "Nouveau nom" },
        ],
      },
      tag: { expectedValue: "OLD_TAG", value: "NEW_TAG" },
    });
  });

  it("applies alternate Area Name removal and derives the target storage profile", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const source = scene(undefined, undefined, {
      name: "Old Name",
      nameProfile: "multi_entry_inline_ascii",
      nameEntries: [
        { languageId: 3, text: "Nom" },
        { languageId: 0, text: "Old Name" },
      ],
    });
    const draft = facade.buildDraft(source);
    const result = facade.apply(source, {
      ...draft,
      basicIdentity: {
        ...draft.basicIdentity,
        name: {
          ...draft.basicIdentity.name,
          profile: "simple_inline_ascii",
          entries: [{ languageId: 0, text: "Old Name" }],
        },
      },
    });

    expect(result).toEqual({
      ok: true,
      changed: true,
      value: {
        ...source,
        areaBasicIdentity: {
          ...source.areaBasicIdentity,
          nameProfile: "simple_inline_ascii",
          nameEntries: [{ languageId: 0, text: "Old Name" }],
        },
        updatedAtUnixMs: 200,
      },
    });
    if (!result.ok) throw new Error("Expected Area Name entry removal to succeed.");
    expect(facade.buildBasicIdentityMutations(result.value, {
      basicIdentity: source.areaBasicIdentity,
    })).toEqual({
      name: {
        expectedValue: "Old Name",
        value: "Old Name",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries: [
          { languageId: 3, text: "Nom" },
          { languageId: 0, text: "Old Name" },
        ],
        valueEntries: [{ languageId: 0, text: "Old Name" }],
      },
    });
  });

  it("applies and exports a bounded added Area Name entry at the exact target position", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const source = scene(undefined, undefined, {
      name: "Old Name",
      nameProfile: "simple_inline_ascii",
      nameEntries: [{ languageId: 0, text: "Old Name" }],
    });
    const draft = facade.buildDraft(source);
    const result = facade.apply(source, {
      ...draft,
      basicIdentity: {
        ...draft.basicIdentity,
        name: {
          ...draft.basicIdentity.name,
          profile: "multi_entry_inline_ascii",
          entries: [
            { languageId: 11, text: "Krypta" },
            { languageId: 0, text: "Old Name" },
          ],
        },
      },
    });

    expect(result).toEqual({
      ok: true,
      changed: true,
      value: {
        ...source,
        areaBasicIdentity: {
          ...source.areaBasicIdentity,
          nameProfile: "multi_entry_inline_ascii",
          nameEntries: [
            { languageId: 11, text: "Krypta" },
            { languageId: 0, text: "Old Name" },
          ],
        },
        updatedAtUnixMs: 200,
      },
    });
    if (!result.ok) throw new Error("Expected bounded Area Name Add/Reinsert to succeed.");
    expect(facade.buildBasicIdentityMutations(result.value, {
      basicIdentity: source.areaBasicIdentity,
    })).toEqual({
      name: {
        expectedValue: "Old Name",
        value: "Old Name",
        expectedProfile: "simple_inline_ascii",
        expectedEntries: [{ languageId: 0, text: "Old Name" }],
        valueEntries: [
          { languageId: 11, text: "Krypta" },
          { languageId: 0, text: "Old Name" },
        ],
      },
    });
  });

  it("fails closed for preserve-only, invalid, or missing Area identity provenance", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const preserveOnly = scene();
    expect(facade.apply(preserveOnly, {
      ...facade.buildDraft(preserveOnly),
      basicIdentity: {
        name: { value: "New Name", state: "editable" },
        tag: { value: "", state: "preserve_only" },
      },
    })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "AREA_BASIC_IDENTITY_PRESERVE_ONLY" }),
    });

    const editable = scene(undefined, undefined, {
      name: "Old Name",
      nameProfile: "simple_inline_ascii",
      tag: "OLD_TAG",
    });
    expect(facade.apply(editable, {
      ...facade.buildDraft(editable),
      basicIdentity: {
        name: {
          value: "München",
          state: "editable",
          profile: "simple_inline_ascii",
        },
        tag: { value: "OLD_TAG", state: "editable" },
      },
    })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "AREA_BASIC_IDENTITY_INVALID" }),
    });
    expect(() => facade.buildBasicIdentityMutations(editable, {
      basicIdentity: { tag: "OLD_TAG" },
    })).toThrow("immutable source provenance");

    const simpleDraft = facade.buildDraft(editable);
    const spoofedProfile = {
      ...simpleDraft,
      basicIdentity: {
        ...simpleDraft.basicIdentity,
        name: {
          ...simpleDraft.basicIdentity.name,
          profile: "multi_entry_inline_ascii" as const,
        },
      },
    };
    expect(facade.apply(editable, spoofedProfile)).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "AREA_BASIC_IDENTITY_PRESERVE_ONLY" }),
    });
    expect(() => facade.buildBasicIdentityMutations({
      ...editable,
      areaBasicIdentity: {
        ...editable.areaBasicIdentity,
        nameProfile: "multi_entry_inline_ascii",
      },
    }, { basicIdentity: editable.areaBasicIdentity })).toThrow(
      "immutable source provenance",
    );

    const profileMismatch = scene(undefined, undefined, {
      name: "Old Name",
      nameProfile: "simple_inline_ascii",
      nameEntries: [
        { languageId: 0, text: "Old Name" },
        { languageId: 2, text: "Other" },
      ],
    });
    const mismatchDraft = facade.buildDraft(profileMismatch);
    expect(facade.apply(profileMismatch, {
      ...mismatchDraft,
      basicIdentity: {
        ...mismatchDraft.basicIdentity,
        name: {
          ...mismatchDraft.basicIdentity.name,
          entries: [
            { languageId: 0, text: "Old Name" },
            { languageId: 2, text: "Changed" },
          ],
        },
      },
    })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "AREA_BASIC_IDENTITY_PRESERVE_ONLY" }),
    });
    expect(() => facade.buildBasicIdentityMutations({
      ...profileMismatch,
      areaBasicIdentity: {
        ...profileMismatch.areaBasicIdentity,
        nameEntries: [
          { languageId: 0, text: "Old Name" },
          { languageId: 2, text: "Changed" },
        ],
      },
    }, { basicIdentity: profileMismatch.areaBasicIdentity })).toThrow(
      "retain identifier 0 and contain only unique source or verified catalog identifiers",
    );
  });

  it("builds, applies, and transfers exact Area event-script CAS mutations", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const source = scene(undefined, {
      onEnter: "old_enter",
      onExit: "",
      onHeartbeat: "old_heartbeat",
      onUserDefined: "old_user",
    });
    const draft = facade.buildDraft(source);
    expect(draft.eventScripts?.onExit).toEqual({ value: "", state: "editable" });

    const result = facade.apply(source, {
      ...draft,
      eventScripts: {
        ...draft.eventScripts!,
        onEnter: { value: "new_enter", state: "editable" },
        onUserDefined: { value: "", state: "editable" },
      },
    });
    expect(result).toEqual({
      ok: true,
      changed: true,
      value: {
        ...source,
        areaEventScripts: {
          onEnter: "new_enter",
          onExit: "",
          onHeartbeat: "old_heartbeat",
          onUserDefined: "",
        },
        updatedAtUnixMs: 200,
      },
    });
    if (!result.ok) throw new Error("Expected Area event-script edit to succeed.");
    expect(facade.buildEventScriptMutations(result.value, {
      eventScripts: source.areaEventScripts,
    })).toEqual({
      onEnter: { expectedResRef: "old_enter", resRef: "new_enter" },
      onUserDefined: { expectedResRef: "old_user", resRef: "" },
    });
  });

  it("fails closed for non-canonical or absent Area event-script provenance", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const source = scene(undefined, { onEnter: "old_enter" });
    const draft = facade.buildDraft(source);
    expect(facade.apply(source, {
      ...draft,
      eventScripts: {
        ...draft.eventScripts!,
        onEnter: { value: "Bad-Enter", state: "editable" },
      },
    })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "AREA_EVENT_SCRIPT_INVALID" }),
    });
    expect(() => facade.buildEventScriptMutations(
      scene(undefined, { onEnter: "new_enter" }),
      { eventScripts: {} },
    )).toThrow("immutable source provenance");
  });

  it("builds, applies, and transfers exact Area advanced-flag CAS mutations", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const source = scene(undefined, undefined, undefined, {
      terrainType: { interior: false, natural: true, subterranean: false },
      playerVsPlayer: 0,
      noRest: false,
      listenCheckModifier: -8,
      spotCheckModifier: 11,
      loadingScreenId: 0,
    });
    const draft = facade.buildDraft(source);
    expect(draft.advancedFlags).toEqual({
      terrainType: {
        value: { interior: false, natural: true, subterranean: false },
        state: "editable",
      },
      playerVsPlayer: { value: 0, state: "editable" },
      noRest: { value: false, state: "editable" },
      listenCheckModifier: { value: -8, state: "editable" },
      spotCheckModifier: { value: 11, state: "editable" },
      loadingScreenId: { value: 0, state: "editable" },
    });

    const result = facade.apply(source, {
      ...draft,
      advancedFlags: {
        terrainType: {
          value: { interior: true, natural: false, subterranean: true },
          state: "editable",
        },
        playerVsPlayer: { value: 3, state: "editable" },
        noRest: { value: true, state: "editable" },
        listenCheckModifier: { value: 9, state: "editable" },
        spotCheckModifier: { value: -12, state: "editable" },
        loadingScreenId: { value: 0xffff, state: "editable" },
      },
    });
    expect(result).toEqual({
      ok: true,
      changed: true,
      value: {
        ...source,
        areaAdvancedFlags: {
          terrainType: { interior: true, natural: false, subterranean: true },
          playerVsPlayer: 3,
          noRest: true,
          listenCheckModifier: 9,
          spotCheckModifier: -12,
          loadingScreenId: 0xffff,
        },
        updatedAtUnixMs: 200,
      },
    });
    if (!result.ok) throw new Error("Expected advanced Area edit to succeed.");
    expect(facade.buildAdvancedFlagMutations(result.value, {
      advancedFlags: source.areaAdvancedFlags,
    })).toEqual({
      terrainType: {
        expectedValue: { interior: false, natural: true, subterranean: false },
        value: { interior: true, natural: false, subterranean: true },
      },
      playerVsPlayer: { expectedValue: 0, value: 3 },
      noRest: { expectedValue: false, value: true },
      listenCheckModifier: { expectedValue: -8, value: 9 },
      spotCheckModifier: { expectedValue: 11, value: -12 },
      loadingScreenId: { expectedValue: 0, value: 0xffff },
    });
  });

  it("fails closed when an Area advanced target lacks exact source provenance", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const source = scene();
    expect(facade.apply(source, {
      ...facade.buildDraft(source),
      advancedFlags: {
        terrainType: {
          value: { interior: true, natural: false, subterranean: false },
          state: "editable",
        },
        playerVsPlayer: { value: 0, state: "preserve_only" },
        noRest: { value: false, state: "preserve_only" },
        listenCheckModifier: { value: 0, state: "preserve_only" },
        spotCheckModifier: { value: 0, state: "preserve_only" },
        loadingScreenId: { value: 0, state: "preserve_only" },
      },
    })).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: "AREA_ADVANCED_FLAG_PRESERVE_ONLY",
        path: "areaAdvancedFlags.terrainType",
      }),
    });
    expect(() => facade.buildAdvancedFlagMutations(
      scene(undefined, undefined, undefined, { noRest: true }),
      { advancedFlags: {} },
    )).toThrow("immutable source provenance");

    expect(() => facade.buildAdvancedFlagMutations(
      scene(undefined, undefined, undefined, { listenCheckModifier: 1 }),
      { advancedFlags: {} },
    )).toThrow("immutable source provenance");

    expect(() => facade.buildAdvancedFlagMutations(
      scene(undefined, undefined, undefined, { loadingScreenId: 1 }),
      { advancedFlags: {} },
    )).toThrow("immutable source provenance");

    const modifierSource = scene(undefined, undefined, undefined, {
      listenCheckModifier: 0,
    });
    const modifierDraft = facade.buildDraft(modifierSource);
    expect(facade.apply(modifierSource, {
      ...modifierDraft,
      advancedFlags: {
        ...modifierDraft.advancedFlags!,
        listenCheckModifier: { value: 100, state: "editable" },
      },
    })).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: "AREA_ADVANCED_FLAG_INVALID",
        path: "areaAdvancedFlags.listenCheckModifier",
      }),
    });

    const loadingSource = scene(undefined, undefined, undefined, { loadingScreenId: 0 });
    const loadingDraft = facade.buildDraft(loadingSource);
    expect(facade.apply(loadingSource, {
      ...loadingDraft,
      advancedFlags: {
        ...loadingDraft.advancedFlags!,
        loadingScreenId: { value: 0x1_0000, state: "editable" },
      },
    })).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: "AREA_ADVANCED_FLAG_INVALID",
        path: "areaAdvancedFlags.loadingScreenId",
      }),
    });
  });

  it("applies an exact valid target and advances the scene mutation identity", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const source = scene("old");

    expect(facade.apply(source, {
      comments: " new\r\nnote ",
      commentsState: "editable",
      maxCommentsCodeUnits: 4096,
    })).toEqual({
      ok: true,
      changed: true,
      value: { ...source, areaComments: " new\r\nnote ", updatedAtUnixMs: 200 },
    });
  });

  it("builds a complete direct-transfer mutation only from immutable source provenance", () => {
    const facade = createAreaPropertiesFacade(() => 200);

    expect(facade.buildMutation(scene("new"), { comments: "old" })).toEqual({
      expectedValue: "old",
      value: "new",
    });
    expect(facade.buildMutation(scene("same"), { comments: "same" })).toBeUndefined();
    expect(() => facade.buildMutation(scene("new"), {})).toThrow(
      "immutable source provenance",
    );
  });

  it("keeps an unchanged exact target as an identity-preserving no-op", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const source = scene("");
    const result = facade.apply(source, facade.buildDraft(source));

    expect(result).toEqual({ ok: true, changed: false, value: source });
    if (result.ok) expect(result.value).toBe(source);
  });

  it("fails closed when the native field is preserve-only", () => {
    const facade = createAreaPropertiesFacade(() => 200);
    const source = scene();

    expect(facade.buildDraft(source).commentsState).toBe("preserve_only");
    expect(facade.apply(source, {
      comments: "cannot materialize",
      commentsState: "editable",
      maxCommentsCodeUnits: 4096,
    })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "AREA_COMMENTS_PRESERVE_ONLY" }),
    });
  });

  it.each([
    ["NUL", "bad\0note"],
    ["over-budget", "x".repeat(4097)],
  ])("rejects an %s target without mutating the scene", (_label, comments) => {
    const facade = createAreaPropertiesFacade(() => 200);
    const source = scene("old");

    expect(facade.apply(source, {
      comments,
      commentsState: "editable",
      maxCommentsCodeUnits: 4096,
    })).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "AREA_COMMENTS_INVALID" }),
    });
    expect(source).toEqual(scene("old"));
  });
});

function audioEnvironment() {
  return {
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
}

function visualCatalogsWithSecondRow() {
  const source = effectiveAreaVisualEnvironmentCatalogBundle();
  const sourceVisual = source.lightingSchemes.rows[0]!.visualEnvironment;
  return {
    ...source,
    lightingSchemes: {
      ...source.lightingSchemes,
      descriptor: { ...source.lightingSchemes.descriptor, rowCount: 2 },
      rows: [
        source.lightingSchemes.rows[0]!,
        {
          rowIndex: 1,
          label: "Night",
          displayName: "Night",
          displaySource: "label" as const,
          visualEnvironment: {
            ...sourceVisual,
            dayNightMode: "always_night" as const,
            shadowOpacity: 70,
            sun: { ...sourceVisual.sun, fogAmount: 9 },
            moon: { ...sourceVisual.moon, shadows: true },
          },
          visualEnvironmentScalarControls: {
            fogClipDistance: 120,
            windPower: 2,
          },
          skyBoxRowIndex: 1,
        },
      ],
    },
    skyBoxes: {
      ...source.skyBoxes,
      descriptor: { ...source.skyBoxes.descriptor, rowCount: 2 },
      rows: [
        source.skyBoxes.rows[0]!,
        {
          rowIndex: 1,
          label: "Clear",
          displayName: "Clear",
          displaySource: "label" as const,
        },
      ],
    },
  };
}
