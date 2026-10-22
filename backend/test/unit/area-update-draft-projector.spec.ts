import {
  AreaUpdateDraftProjectionError,
  projectAreaUpdateDraft,
} from "../../src/modules/areas/domain/area-update-draft-projector";
import type { AreaDraftSnapshot } from "../../src/modules/areas/domain/area-draft.types";
import { AREA_ITEM_CONSTRUCTION_PROFILE } from "../../src/modules/areas/domain/area-item-construction-profile";
import {
  AreaPlaceableInventoryValidationError,
  areaPlaceableInventoryEntriesEqual,
  parseAreaPlaceableInventoryMutation,
  parseAreaPlaceableInventorySourceEntries,
  parseAreaPlaceableInventoryTargetEntries,
} from "../../src/modules/areas/domain/area-placeable-inventory";
import { AREA_CREATURE_BODY_PART_FIELDS } from
  "../../src/modules/areas/domain/area-creature-body-parts";

const DRAFT_HASH = "d".repeat(64);
const SOURCE_HASH = "s".repeat(64).replaceAll("s", "a");
const SET_HASH = "e".repeat(64);

function snapshot(): AreaDraftSnapshot {
  return {
    draftId: "draft_01",
    title: "Crypt working copy",
    revision: 7,
    updatedAt: "2026-08-12T08:00:00.000Z",
    normalizedSha256: DRAFT_HASH,
    source: { type: "production_area", areaId: "area_crypt01" },
    draft: {
      schemaVersion: "area-draft.v1",
      title: "Crypt working copy",
      source: { type: "production_area", areaId: "area_crypt01" },
      payload: {
        schemaVersion: "production-area-draft-payload.v1",
        sourceArea: { areaId: "area_crypt01", name: "Crypt 01", width: 2, height: 2 },
        provenance: {
          areaId: "area_crypt01",
          sourceUpdatedAt: "2026-08-12T07:00:00.000Z",
          processingCacheKey: "cache-key-01",
        },
        editableScene: {
          sceneId: "area_crypt01",
          areaName: "Crypt 01",
          width: 2,
          height: 2,
          tiles: [],
          objects: [],
          updatedAtUnixMs: 1,
          source: "local_draft",
          auroraAreaEditing: {
            state: {
              schemaVersion: 1,
              areaResRef: "crypt01",
              tilesetResRef: "tin01",
              tilesetFingerprint: SET_HASH,
              sourceAreaFingerprint: SOURCE_HASH,
              width: 2,
              height: 2,
              topology: {
                tokenWidth: 5,
                tokenHeight: 5,
                tokens: [],
                cornerWidth: 3,
                cornerHeight: 3,
                heights: [],
              },
              groupInstances: [],
              tiles: [
                tile(0, 0, 0),
                tile(0, 1, 1),
                tile(1, 0, 2),
                tile(1, 1, 3),
              ],
            },
            definition: {},
            terrainBrush: "floor",
          },
        },
      },
    },
  };
}

function tile(row: number, col: number, orientation: number) {
  return {
    id: `tile-${row}-${col}`,
    row,
    col,
    sourceRow: row,
    sourceCol: col,
    tileId: 12,
    orientation,
    height: 0,
    mainLight1: 0,
    mainLight2: 0,
    sourceLight1: 0,
    sourceLight2: 0,
    animLoop1: 1,
    animLoop2: 1,
    animLoop3: 1,
  };
}

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

describe("projectAreaUpdateDraft", () => {
  it("projects the exact immutable production draft revision into the preserve-first ARE writer contract", () => {
    const result = projectAreaUpdateDraft(snapshot(), {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result).toEqual({
      areaResRef: "crypt01",
      name: "Crypt 01",
      width: 2,
      height: 2,
      tilesetResRef: "tin01",
      tilesetFingerprint: SET_HASH,
      areaFingerprint: SOURCE_HASH,
      tiles: [
        expect.objectContaining({ row: 0, col: 0, sourceRow: 0, sourceCol: 0, tileId: 12, orientation: 0 }),
        expect.objectContaining({ row: 0, col: 1, sourceRow: 0, sourceCol: 1, tileId: 12, orientation: 1 }),
        expect.objectContaining({ row: 1, col: 0, sourceRow: 1, sourceCol: 0, tileId: 12, orientation: 2 }),
        expect.objectContaining({ row: 1, col: 1, sourceRow: 1, sourceCol: 1, tileId: 12, orientation: 3 }),
      ],
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.tiles)).toBe(true);
  });

  it("projects one exact changed Area audio-environment tuple with GIT provenance", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.sourceArea.audioEnvironment = audioEnvironment();
    payload.editableScene.areaAudioEnvironment = {
      ...audioEnvironment(),
      ambientSoundNightVolume: 77,
      musicDelayMilliseconds: -4000,
    };

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).audioEnvironment).toEqual({
      expectedValue: audioEnvironment(),
      value: {
        ...audioEnvironment(),
        ambientSoundNightVolume: 77,
        musicDelayMilliseconds: -4000,
      },
      sourceGitSha256: "b".repeat(64),
    });
  });

  it("omits an unchanged exact Area audio-environment tuple", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.sourceArea.audioEnvironment = audioEnvironment();
    payload.editableScene.areaAudioEnvironment = audioEnvironment();

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).audioEnvironment).toBeUndefined();
  });

  it.each([
    ["source tuple", false, true, "draft.payload.sourceArea.audioEnvironment"],
    ["GIT digest", true, false, "draft.payload.provenance.sourceGitSha256"],
  ])("rejects a changed Area audio tuple without exact %s", (_label, source, digest, path) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    if (source) payload.sourceArea.audioEnvironment = audioEnvironment();
    if (digest) payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.areaAudioEnvironment = {
      ...audioEnvironment(),
      musicDayId: 19,
    };

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path }));
  });

  it("rejects an incomplete Area audio-environment target", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.sourceArea.audioEnvironment = audioEnvironment();
    payload.editableScene.areaAudioEnvironment = {
      ...audioEnvironment(),
      musicDelayMilliseconds: undefined,
    };

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: "draft.payload.editableScene.areaAudioEnvironment",
    }));
  });

  it("projects one exact changed Area Comments compare-and-set pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.sourceArea.comments = " original\r\ncomment ";
    payload.editableScene.areaComments = " updated\r\ncomment ";

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).comments).toEqual({
      expectedValue: " original\r\ncomment ",
      value: " updated\r\ncomment ",
    });
  });

  it("projects exact changed Area event-script compare-and-set pairs", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.sourceArea.eventScripts = {
      onEnter: "old_enter",
      onExit: "",
      onHeartbeat: "old_heartbeat",
      onUserDefined: "old_user",
    };
    payload.editableScene.areaEventScripts = {
      ...payload.sourceArea.eventScripts,
      onEnter: "new_enter",
      onUserDefined: "",
    };

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).eventScripts).toEqual({
      onEnter: { expectedResRef: "old_enter", resRef: "new_enter" },
      onUserDefined: { expectedResRef: "old_user", resRef: "" },
    });
  });

  it("projects exact changed Area Name and Tag compare-and-set pairs", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.sourceArea.basicIdentity = { name: "Crypt 01", tag: "CRYPT_01" };
    payload.editableScene.areaName = " Crypt Hall ";
    payload.editableScene.areaTag = "CRYPT_HALL";

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).basicIdentity).toEqual({
      name: { expectedValue: "Crypt 01", value: " Crypt Hall " },
      tag: { expectedValue: "CRYPT_01", value: "CRYPT_HALL" },
    });
  });

  it("projects an exact multi-entry inline Area Name profile CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.sourceArea.basicIdentity = {
      name: "Crypt 01",
      nameProfile: "multi_entry_inline_ascii",
    };
    payload.editableScene.areaName = "Crypt Hall";
    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).basicIdentity).toEqual({
      name: {
        expectedValue: "Crypt 01",
        value: "Crypt Hall",
        expectedProfile: "multi_entry_inline_ascii",
      },
    });
  });

  it("projects a complete ordered CAS when existing Name entries are edited and reordered", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.sourceArea.basicIdentity = {
      name: "Crypt 01",
      nameProfile: "multi_entry_inline_ascii",
      nameEntries: [
        { languageId: 2, text: "Old sibling" },
        { languageId: 0, text: "Crypt 01" },
      ],
    };
    payload.editableScene.areaBasicIdentity = {
      name: "Crypt 01",
      nameProfile: "multi_entry_inline_ascii",
      nameEntries: [
        { languageId: 0, text: "Crypt 01" },
        { languageId: 2, text: "New sibling" },
      ],
    };

    const projected = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    expect(projected.basicIdentity?.name).toEqual({
      expectedValue: "Crypt 01",
      value: "Crypt 01",
      expectedProfile: "multi_entry_inline_ascii",
      expectedEntries: [
        { languageId: 2, text: "Old sibling" },
        { languageId: 0, text: "Crypt 01" },
      ],
      valueEntries: [
        { languageId: 0, text: "Crypt 01" },
        { languageId: 2, text: "New sibling" },
      ],
    });
    expect(Object.isFrozen(projected.basicIdentity?.name?.valueEntries)).toBe(true);
  });

  it("projects an exact bounded Area Name Add/Reinsert CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.sourceArea.basicIdentity = {
      name: "Crypt 01",
      nameProfile: "simple_inline_ascii",
      nameEntries: [{ languageId: 0, text: "Crypt 01" }],
    };
    payload.editableScene.areaBasicIdentity = {
      name: "Crypt 01",
      nameProfile: "multi_entry_inline_ascii",
      nameEntries: [
        { languageId: 11, text: "Krypta" },
        { languageId: 0, text: "Crypt 01" },
      ],
    };

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).basicIdentity?.name).toEqual({
      expectedValue: "Crypt 01",
      value: "Crypt 01",
      expectedProfile: "simple_inline_ascii",
      expectedEntries: [{ languageId: 0, text: "Crypt 01" }],
      valueEntries: [
        { languageId: 11, text: "Krypta" },
        { languageId: 0, text: "Crypt 01" },
      ],
    });
  });

  it("projects removal of an alternate Area Name entry and a derived simple target profile", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.sourceArea.basicIdentity = {
      name: "Crypt 01",
      nameProfile: "multi_entry_inline_ascii",
      nameEntries: [
        { languageId: 2, text: "Old sibling" },
        { languageId: 0, text: "Crypt 01" },
      ],
    };
    payload.editableScene.areaBasicIdentity = {
      name: "Crypt 01",
      nameProfile: "simple_inline_ascii",
      nameEntries: [{ languageId: 0, text: "Crypt 01" }],
    };

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).basicIdentity?.name).toEqual({
      expectedValue: "Crypt 01",
      value: "Crypt 01",
      expectedProfile: "multi_entry_inline_ascii",
      expectedEntries: [
        { languageId: 2, text: "Old sibling" },
        { languageId: 0, text: "Crypt 01" },
      ],
      valueEntries: [{ languageId: 0, text: "Crypt 01" }],
    });
  });

  it("rejects Area Name entries whose declared profile does not match their count", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.sourceArea.basicIdentity = {
      name: "Crypt 01",
      nameProfile: "simple_inline_ascii",
      nameEntries: [
        { languageId: 0, text: "Crypt 01" },
        { languageId: 2, text: "Old sibling" },
      ],
    };
    payload.editableScene.areaBasicIdentity = {
      name: "Crypt 01",
      nameProfile: "simple_inline_ascii",
      nameEntries: [
        { languageId: 0, text: "Crypt 01" },
        { languageId: 2, text: "New sibling" },
      ],
    };

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: "draft.payload.editableScene.areaBasicIdentity.nameEntries",
    }));
  });

  it("rejects an Area Name profile change without complete source and target entry lists", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.sourceArea.basicIdentity = {
      name: "Crypt 01",
      nameProfile: "simple_inline_ascii",
    };
    payload.editableScene.areaBasicIdentity = {
      name: "Crypt Hall",
      nameProfile: "multi_entry_inline_ascii",
    };
    payload.editableScene.areaName = "Crypt Hall";

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: "draft.payload.editableScene.areaBasicIdentity.nameProfile",
    }));
  });

  it("projects exact changed Area advanced-flag compare-and-set pairs", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.sourceArea.advancedFlags = {
      terrainType: { interior: false, natural: true, subterranean: false },
      playerVsPlayer: 0,
      noRest: false,
      listenCheckModifier: -8,
      spotCheckModifier: 11,
      loadingScreenId: 0,
    };
    payload.editableScene.areaAdvancedFlags = {
      terrainType: { interior: true, natural: false, subterranean: true },
      playerVsPlayer: 3,
      noRest: true,
      listenCheckModifier: 9,
      spotCheckModifier: -12,
      loadingScreenId: 0xffff,
    };

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).advancedFlags).toEqual({
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

  it("rejects a changed loading-screen Word without exact immutable source provenance", () => {
    const value = snapshot();
    (value.draft.payload as Record<string, any>).editableScene.areaAdvancedFlags = {
      loadingScreenId: 7,
    };
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: "draft.payload.sourceArea.advancedFlags.loadingScreenId",
    }));
  });

  it("projects one complete float32 cross-Area start-location pair from the immutable target catalog", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.sourceArea.moduleStartLocation = {
      areaResRef: "other01",
      x: 1,
      y: 2,
      z: 3,
      directionX: 0,
      directionY: 1,
    };
    payload.sourceArea.moduleStartLocationTargets = ["crypt01", "other02"];
    payload.editableScene.moduleStartLocation = {
      areaResRef: "other02",
      x: 10.1,
      y: 20.2,
      z: 0.3,
      directionX: 0.6,
      directionY: 0.8,
    };

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).moduleStartLocation).toEqual({
      expectedValue: payload.sourceArea.moduleStartLocation,
      value: {
        areaResRef: "other02",
        x: Math.fround(10.1),
        y: Math.fround(20.2),
        z: Math.fround(0.3),
        directionX: Math.fround(0.6),
        directionY: Math.fround(0.8),
      },
    });
  });

  it.each([
    ["missing source", undefined, {
      areaResRef: "crypt01", x: 1, y: 2, z: 3, directionX: 0, directionY: 1,
    }],
    ["another target Area", {
      areaResRef: "other01", x: 1, y: 2, z: 3, directionX: 0, directionY: 1,
    }, {
      areaResRef: "other02", x: 4, y: 5, z: 6, directionX: 1, directionY: 0,
    }],
    ["non-finite target", {
      areaResRef: "other01", x: 1, y: 2, z: 3, directionX: 0, directionY: 1,
    }, {
      areaResRef: "crypt01", x: Number.POSITIVE_INFINITY, y: 5, z: 6,
      directionX: 1, directionY: 0,
    }],
  ])("rejects a %s module start-location mutation", (_label, source, target) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    if (source !== undefined) payload.sourceArea.moduleStartLocation = source;
    payload.editableScene.moduleStartLocation = target;
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(AreaUpdateDraftProjectionError);
  });

  it.each([
    ["unsorted", ["other02", "crypt01"], "draft.payload.sourceArea.moduleStartLocationTargets"],
    ["duplicate", ["crypt01", "other02", "other02"], "draft.payload.sourceArea.moduleStartLocationTargets"],
    ["non-canonical", ["crypt01", "Other02"], "draft.payload.sourceArea.moduleStartLocationTargets[1]"],
    ["missing current Area", ["other02"], "draft.payload.sourceArea.moduleStartLocationTargets"],
  ])("rejects a %s immutable module start-location target catalog", (_label, targets, path) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.sourceArea.moduleStartLocation = {
      areaResRef: "crypt01", x: 1, y: 2, z: 3, directionX: 0, directionY: 1,
    };
    payload.sourceArea.moduleStartLocationTargets = targets;
    payload.editableScene.moduleStartLocation = {
      areaResRef: "other02", x: 4, y: 5, z: 6, directionX: 1, directionY: 0,
    };
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path,
    }));
  });

  it("rejects changed Area check modifiers without exact immutable source provenance", () => {
    const value = snapshot();
    (value.draft.payload as Record<string, any>).editableScene.areaAdvancedFlags = {
      listenCheckModifier: 1,
    };
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: "draft.payload.sourceArea.advancedFlags.listenCheckModifier",
    }));
  });

  it("rejects an advanced target without exact immutable source provenance", () => {
    const value = snapshot();
    (value.draft.payload as Record<string, any>).editableScene.areaAdvancedFlags = {
      noRest: true,
    };
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: "draft.payload.sourceArea.advancedFlags.noRest",
    }));
  });

  it("rejects changed Area Name or Tag without exact immutable provenance", () => {
    const name = snapshot();
    (name.draft.payload as Record<string, any>).editableScene.areaName = "Changed";
    expect(() => projectAreaUpdateDraft(name, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: "draft.payload.sourceArea.basicIdentity.name",
    }));

    const tag = snapshot();
    const tagPayload = tag.draft.payload as Record<string, any>;
    tagPayload.editableScene.areaTag = "NEW_TAG";
    expect(() => projectAreaUpdateDraft(tag, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: "draft.payload.sourceArea.basicIdentity.tag",
    }));
  });

  it("preserves an unchanged unsupported localized Area Name without treating it as editable", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.sourceArea.name = "Łódź — dzielnica";
    payload.editableScene.areaName = "Łódź — dzielnica";

    const projected = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    expect(projected.name).toBe("Łódź — dzielnica");
    expect(projected.basicIdentity).toBeUndefined();
  });

  it("fails closed for non-canonical or missing Area event-script provenance", () => {
    const invalid = snapshot();
    const invalidPayload = invalid.draft.payload as Record<string, any>;
    invalidPayload.sourceArea.eventScripts = { onEnter: "old_enter" };
    invalidPayload.editableScene.areaEventScripts = { onEnter: "Bad-Enter" };
    expect(() => projectAreaUpdateDraft(invalid, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: "draft.payload.editableScene.areaEventScripts.onEnter",
    }));

    const absent = snapshot();
    const absentPayload = absent.draft.payload as Record<string, any>;
    absentPayload.sourceArea.eventScripts = {};
    absentPayload.editableScene.areaEventScripts = { onEnter: "new_enter" };
    expect(() => projectAreaUpdateDraft(absent, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: "draft.payload.sourceArea.eventScripts.onEnter",
    }));
  });

  it.each([
    ["absent target", "source", undefined],
    ["unchanged target", "same", "same"],
  ])("preserves Area Comments for an %s", (_label, sourceComments, areaComments) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.sourceArea.comments = sourceComments;
    if (areaComments !== undefined) payload.editableScene.areaComments = areaComments;

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).comments).toBeUndefined();
  });

  it("rejects an editable Area Comments target without exact immutable source provenance", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.editableScene.areaComments = "cannot materialize";

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path: "draft.payload.sourceArea.comments" }));
  });

  it.each([
    ["NUL", "bad\0comment"],
    ["over-budget", "x".repeat(4097)],
  ])("rejects an %s Area Comments target", (_label, areaComments) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.sourceArea.comments = "source";
    payload.editableScene.areaComments = areaComments;

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path: "draft.payload.editableScene.areaComments" }));
  });

  it.each([
    ["wrong retained revision", (value: AreaDraftSnapshot) => ({ ...value, revision: 8 }), "draft.revision"],
    ["wrong retained hash", (value: AreaDraftSnapshot) => ({ ...value, normalizedSha256: "f".repeat(64) }), "draft.normalizedSha256"],
    ["new draft source", (value: AreaDraftSnapshot) => ({ ...value, source: { type: "new" as const } }), "draft.source"],
    ["wrong source Area", (value: AreaDraftSnapshot) => ({ ...value, source: { type: "production_area" as const, areaId: "area_other" } }), "draft.source.areaId"],
  ])("rejects %s", (_label, mutate, path) => {
    expect(() => projectAreaUpdateDraft(mutate(snapshot()), {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path }));
  });

  it("rejects placeable OnUsed provenance attached to another retained family", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature") as Record<string, any>;
    object.source.placeableOnUsed = "";
    object.placeableProperties = { scriptSlots: { onUsed: "s04_plcprobe" } };
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: "draft.payload.editableScene.objects.0.source.placeableOnUsed"
    }));
  });

  it("projects one changed provenance-bound Door transition storage trio", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("doors", "obj_dr_gate", "door") as Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.doorTransitionStorage = {
      linkedTo: "OLD_DEST",
      linkedToFlags: 1,
      loadScreenId: 0,
    };
    object.doorTransition = {
      linkedTarget: "OLD_DEST",
      linkedModule: "",
      linkedTag: "",
      linkedWaypoint: "",
      loadScreen: "7",
      flags: {},
      storage: {
        linkedTo: "NEW_DEST",
        linkedToFlags: 2,
        loadScreenId: 7,
      },
    };
    payload.editableScene.objects = [object];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.doorTransitionMutations).toEqual([{
      kind: "door",
      sourceObjectId: "obj_dr_gate",
      sourceIndex: 0,
      transition: {
        expectedValue: { linkedTo: "OLD_DEST", linkedToFlags: 1, loadScreenId: 0 },
        value: { linkedTo: "NEW_DEST", linkedToFlags: 2, loadScreenId: 7 },
      },
    }]);
    expect(Object.isFrozen(result.objectEditing?.doorTransitionMutations)).toBe(true);
  });

  it("does not project an unchanged Door transition storage trio", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("doors", "obj_dr_gate", "door") as Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.doorTransitionStorage = {
      linkedTo: "SAME_DEST",
      linkedToFlags: 1,
      loadScreenId: 0,
    };
    object.doorTransition = {
      linkedTarget: "SAME_DEST",
      linkedModule: "",
      linkedTag: "",
      linkedWaypoint: "",
      loadScreen: "0",
      flags: {},
      storage: { ...object.source.doorTransitionStorage },
    };
    payload.editableScene.objects = [object];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    expect(result.objectEditing?.doorTransitionMutations).toBeUndefined();
  });

  it("projects one complete changed retained Sound interval/variation CAS tuple", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.soundIntervalVariationStorage = {
      intervalMilliseconds: 25_000,
      intervalVariationMilliseconds: 5_000,
      pitchVariationHundredths: 20,
      volumeVariationByte: 64,
    };
    object.soundIntervalVariation = {
      intervalMilliseconds: 12_340,
      intervalVariationMilliseconds: 1_230,
      pitchVariationHundredths: 35,
      volumeVariationByte: 127,
    };
    payload.editableScene.objects = [object];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    expect(result.objectEditing?.soundIntervalVariationMutations).toEqual([{
      kind: "sound",
      sourceObjectId: "obj_snd_wind",
      sourceIndex: 0,
      expectedValue: object.source.soundIntervalVariationStorage,
      value: object.soundIntervalVariation,
    }]);
    expect(Object.isFrozen(result.objectEditing?.soundIntervalVariationMutations)).toBe(true);
  });

  it("preserves an unchanged or target-absent retained Sound tuple", () => {
    for (const includeTarget of [true, false]) {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
      object.source.sourceIndex = 0;
      object.source.soundIntervalVariationStorage = {
        intervalMilliseconds: 25_000,
        intervalVariationMilliseconds: 5_000,
        pitchVariationHundredths: 20,
        volumeVariationByte: 64,
      };
      if (includeTarget) {
        object.soundIntervalVariation = { ...object.source.soundIntervalVariationStorage };
      }
      payload.editableScene.objects = [object];
      expect(projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      }).objectEditing?.soundIntervalVariationMutations).toBeUndefined();
    }
  });

  it.each([
    ["target without provenance", undefined, {
      intervalMilliseconds: 10_000, intervalVariationMilliseconds: 1_000,
      pitchVariationHundredths: 10, volumeVariationByte: 32,
    }, ".source.soundIntervalVariationStorage"],
    ["malformed provenance", {
      intervalMilliseconds: 25_001, intervalVariationMilliseconds: 5_000,
      pitchVariationHundredths: 20, volumeVariationByte: 64,
    }, {
      intervalMilliseconds: 10_000, intervalVariationMilliseconds: 1_000,
      pitchVariationHundredths: 10, volumeVariationByte: 32,
    }, ".source.soundIntervalVariationStorage"],
    ["malformed target", {
      intervalMilliseconds: 25_000, intervalVariationMilliseconds: 5_000,
      pitchVariationHundredths: 20, volumeVariationByte: 64,
    }, {
      intervalMilliseconds: 10_000, intervalVariationMilliseconds: 1_000,
      pitchVariationHundredths: 10, volumeVariationByte: 128,
    }, ".soundIntervalVariation"],
  ])("rejects retained Sound interval/variation %s", (_label, provenance, target, pathSuffix) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
    object.source.sourceIndex = 0;
    if (provenance !== undefined) object.source.soundIntervalVariationStorage = provenance;
    object.soundIntervalVariation = target;
    payload.editableScene.objects = [object];
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("projects one changed retained Sound base-volume CAS pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.soundVolumeStorage = { volumeByte: 64 };
    object.soundVolume = { volumeByte: 127 };
    payload.editableScene.objects = [object];
    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    expect(result.objectEditing?.soundVolumeMutations).toEqual([{
      kind: "sound", sourceObjectId: "obj_snd_wind", sourceIndex: 0,
      expectedValue: { volumeByte: 64 }, value: { volumeByte: 127 },
    }]);
    expect(Object.isFrozen(result.objectEditing?.soundVolumeMutations)).toBe(true);
  });

  it("preserves unchanged or target-absent retained Sound base volume", () => {
    for (const includeTarget of [true, false]) {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
      object.source.sourceIndex = 0;
      object.source.soundVolumeStorage = { volumeByte: 64 };
      if (includeTarget) object.soundVolume = { volumeByte: 64 };
      payload.editableScene.objects = [object];
      expect(projectAreaUpdateDraft(value, {
        areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      }).objectEditing?.soundVolumeMutations).toBeUndefined();
    }
  });

  it.each([
    ["target without provenance", undefined, { volumeByte: 64 }, ".source.soundVolumeStorage"],
    ["malformed provenance", { volumeByte: 128 }, { volumeByte: 64 }, ".source.soundVolumeStorage"],
    ["malformed target", { volumeByte: 64 }, { volumeByte: 128 }, ".soundVolume"],
  ])("rejects retained Sound base volume %s", (_label, provenance, target, pathSuffix) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
    object.source.sourceIndex = 0;
    if (provenance !== undefined) object.source.soundVolumeStorage = provenance;
    object.soundVolume = target;
    payload.editableScene.objects = [object];
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("projects one changed retained Sound Hours/Times schedule CAS pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.soundScheduleStorage = { hoursMask: 0, timesByte: 3 };
    object.soundSchedule = { hoursMask: 0x800001, timesByte: 0 };
    payload.editableScene.objects = [object];
    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    expect(result.objectEditing?.soundScheduleMutations).toEqual([{
      kind: "sound", sourceObjectId: "obj_snd_wind", sourceIndex: 0,
      expectedValue: { hoursMask: 0, timesByte: 3 },
      value: { hoursMask: 0x800001, timesByte: 0 },
    }]);
    expect(Object.isFrozen(result.objectEditing?.soundScheduleMutations)).toBe(true);
  });

  it("preserves unchanged or target-absent retained Sound Hours/Times schedule", () => {
    for (const includeTarget of [true, false]) {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
      object.source.sourceIndex = 0;
      object.source.soundScheduleStorage = { hoursMask: 0, timesByte: 3 };
      if (includeTarget) object.soundSchedule = { hoursMask: 0, timesByte: 3 };
      payload.editableScene.objects = [object];
      expect(projectAreaUpdateDraft(value, {
        areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      }).objectEditing?.soundScheduleMutations).toBeUndefined();
    }
  });

  it.each([
    ["target without provenance", undefined, { hoursMask: 0, timesByte: 3 }, ".source.soundScheduleStorage"],
    ["malformed provenance", { hoursMask: 0x1000000, timesByte: 3 }, { hoursMask: 0, timesByte: 3 }, ".source.soundScheduleStorage"],
    ["malformed target", { hoursMask: 0, timesByte: 3 }, { hoursMask: 0, timesByte: 4 }, ".soundSchedule"],
  ])("rejects retained Sound Hours/Times schedule %s", (_label, provenance, target, pathSuffix) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
    object.source.sourceIndex = 0;
    if (provenance !== undefined) object.source.soundScheduleStorage = provenance;
    object.soundSchedule = target;
    payload.editableScene.objects = [object];
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("projects one changed retained Sound Active CAS pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.soundActiveStorage = { activeByte: 1 };
    object.soundActive = { activeByte: 0 };
    payload.editableScene.objects = [object];
    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    expect(result.objectEditing?.soundActiveMutations).toEqual([{
      kind: "sound", sourceObjectId: "obj_snd_wind", sourceIndex: 0,
      expectedValue: { activeByte: 1 }, value: { activeByte: 0 },
    }]);
    expect(Object.isFrozen(result.objectEditing?.soundActiveMutations)).toBe(true);
  });

  it("projects one changed retained Sound Play Order CAS pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.soundPlayOrderStorage = { randomByte: 0 };
    object.soundPlayOrder = { randomByte: 1 };
    payload.editableScene.objects = [object];
    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    expect(result.objectEditing?.soundPlayOrderMutations).toEqual([{
      kind: "sound", sourceObjectId: "obj_snd_wind", sourceIndex: 0,
      expectedValue: { randomByte: 0 }, value: { randomByte: 1 },
    }]);
    expect(Object.isFrozen(result.objectEditing?.soundPlayOrderMutations)).toBe(true);
  });

  it("projects one complete retained Sound Play Style and derived Priority CAS pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.soundPlayStyleStorage = {
      loopingByte: 0, continuousByte: 1, priorityByte: 20, positionalByte: 1,
      soundsCount: 2, intervalDword: 25_000, intervalVariationDword: 5_000,
    };
    object.soundPlayStyle = {
      loopingByte: 1, continuousByte: 0, priorityByte: 3, positionalByte: 1,
      soundsCount: 2, intervalDword: 25_000, intervalVariationDword: 5_000,
    };
    payload.editableScene.objects = [object];
    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    expect((result.objectEditing as any)?.soundPlayStyleMutations).toEqual([{
      kind: "sound", sourceObjectId: "obj_snd_wind", sourceIndex: 0,
      expectedValue: object.source.soundPlayStyleStorage,
      value: object.soundPlayStyle,
    }]);
    expect(Object.isFrozen((result.objectEditing as any)?.soundPlayStyleMutations)).toBe(true);
  });

  it("rejects a retained Sound Play Style target that changes a hidden dependency", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.soundPlayStyleStorage = {
      loopingByte: 0, continuousByte: 1, priorityByte: 20, positionalByte: 1,
      soundsCount: 2, intervalDword: 25_000, intervalVariationDword: 5_000,
    };
    object.soundPlayStyle = {
      ...object.source.soundPlayStyleStorage,
      loopingByte: 1, continuousByte: 0, priorityByte: 3, soundsCount: 3,
    };
    payload.editableScene.objects = [object];
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: "draft.payload.editableScene.objects.0.soundPlayStyle",
    }));
  });

  it("projects one atomic retained Sound playback-list plus Play Style CAS pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.soundPlaybackStorage = {
      sounds: ["wind_a", "wind_b"],
      loopingByte: 0, continuousByte: 1, priorityByte: 20, positionalByte: 1,
      intervalDword: 25_000, intervalVariationDword: 5_000,
    };
    object.soundPlayback = {
      sounds: ["wind_b", "wind_c"],
      loopingByte: 1, continuousByte: 0, priorityByte: 3, positionalByte: 1,
      intervalDword: 25_000, intervalVariationDword: 5_000,
    };
    payload.editableScene.objects = [object];
    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    expect((result.objectEditing as any)?.soundPlaybackMutations).toEqual([{
      kind: "sound", sourceObjectId: "obj_snd_wind", sourceIndex: 0,
      expectedValue: object.source.soundPlaybackStorage,
      value: object.soundPlayback,
    }]);
    expect(Object.isFrozen((result.objectEditing as any)?.soundPlaybackMutations)).toBe(true);
    expect((result.objectEditing as any)?.soundPlayStyleMutations).toBeUndefined();
  });

  it("rejects retained Sound playback target dependency drift", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.soundPlaybackStorage = {
      sounds: ["wind_a"],
      loopingByte: 0, continuousByte: 0, priorityByte: 20, positionalByte: 1,
      intervalDword: 25_000, intervalVariationDword: 5_000,
    };
    object.soundPlayback = {
      ...object.source.soundPlaybackStorage,
      sounds: ["wind_b"], intervalDword: 0,
    };
    payload.editableScene.objects = [object];
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: "draft.payload.editableScene.objects.0.soundPlayback",
    }));
  });

  it("projects one authoritative retained Sound playback and spatial profile CAS pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.soundProfileStorage = {
      sounds: ["wind_a", "wind_b"],
      loopingByte: 0, continuousByte: 1, priorityByte: 20,
      positionalByte: 1, randomPositionByte: 0,
      elevationFloat32: 0, maxDistanceFloat32: 14, minDistanceFloat32: 2,
      randomRangeXFloat32: 0, randomRangeYFloat32: 0,
      intervalDword: 25_000, intervalVariationDword: 5_000,
    };
    object.soundProfile = {
      ...object.source.soundProfileStorage,
      sounds: ["wind_b", "wind_c"],
      loopingByte: 1, continuousByte: 0, priorityByte: 3,
      randomPositionByte: 1,
      elevationFloat32: 1.25, maxDistanceFloat32: 20, minDistanceFloat32: 4,
      randomRangeXFloat32: 8, randomRangeYFloat32: 9,
    };
    payload.editableScene.objects = [object];
    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    expect((result.objectEditing as any)?.soundProfileMutations).toEqual([{
      kind: "sound", sourceObjectId: "obj_snd_wind", sourceIndex: 0,
      expectedValue: object.source.soundProfileStorage,
      value: object.soundProfile,
    }]);
    expect(Object.isFrozen((result.objectEditing as any)?.soundProfileMutations)).toBe(true);
    expect((result.objectEditing as any)?.soundPlaybackMutations).toBeUndefined();
    expect((result.objectEditing as any)?.soundPlayStyleMutations).toBeUndefined();
  });

  it("rejects a fallback Sound playback change when the complete profile is authoritative", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.soundProfileStorage = {
      sounds: ["wind_a"],
      loopingByte: 0, continuousByte: 0, priorityByte: 20,
      positionalByte: 1, randomPositionByte: 0,
      elevationFloat32: 0, maxDistanceFloat32: 14, minDistanceFloat32: 2,
      randomRangeXFloat32: 0, randomRangeYFloat32: 0,
      intervalDword: 25_000, intervalVariationDword: 5_000,
    };
    object.source.soundPlaybackStorage = {
      sounds: ["wind_a"], loopingByte: 0, continuousByte: 0, priorityByte: 20,
      positionalByte: 1, intervalDword: 25_000, intervalVariationDword: 5_000,
    };
    object.soundPlayback = {
      ...object.source.soundPlaybackStorage,
      sounds: ["wind_b"],
    };
    payload.editableScene.objects = [object];
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: "draft.payload.editableScene.objects.0.soundPlayback",
    }));
  });

  it.each([
    ["target without provenance", undefined, { randomByte: 1 }, ".source.soundPlayOrderStorage"],
    ["malformed provenance", { randomByte: 2 }, { randomByte: 1 }, ".source.soundPlayOrderStorage"],
    ["malformed target", { randomByte: 0 }, { randomByte: 2 }, ".soundPlayOrder"],
  ])("rejects retained Sound Play Order %s", (_label, provenance, target, pathSuffix) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
    object.source.sourceIndex = 0;
    if (provenance !== undefined) object.source.soundPlayOrderStorage = provenance;
    object.soundPlayOrder = target;
    payload.editableScene.objects = [object];
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("preserves unchanged or target-absent retained Sound Active storage", () => {
    for (const includeTarget of [true, false]) {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
      object.source.sourceIndex = 0;
      object.source.soundActiveStorage = { activeByte: 1 };
      if (includeTarget) object.soundActive = { activeByte: 1 };
      payload.editableScene.objects = [object];
      expect(projectAreaUpdateDraft(value, {
        areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      }).objectEditing?.soundActiveMutations).toBeUndefined();
    }
  });

  it.each([
    ["target without provenance", undefined, { activeByte: 0 }, ".source.soundActiveStorage"],
    ["malformed provenance", { activeByte: 2 }, { activeByte: 0 }, ".source.soundActiveStorage"],
    ["malformed target", { activeByte: 1 }, { activeByte: 2 }, ".soundActive"],
  ])("rejects retained Sound Active %s", (_label, provenance, target, pathSuffix) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("sounds", "obj_snd_wind", "sound") as Record<string, any>;
    object.source.sourceIndex = 0;
    if (provenance !== undefined) object.source.soundActiveStorage = provenance;
    object.soundActive = target;
    payload.editableScene.objects = [object];
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("projects one complete changed retained Trigger polygon CAS pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("triggers", "obj_trg_exit", "trigger") as Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.polygonGeometry = polygon([
      [0, 0, 0], [4, 0, 0], [0, 2, 0],
    ]);
    object.polygonGeometry = polygon([
      [-1, 0, 0], [4, 0, 0], [0, 3, 0.5],
    ]);
    payload.editableScene.objects = [object];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.polygonMutations).toEqual([{
      kind: "trigger",
      sourceObjectId: "obj_trg_exit",
      sourceIndex: 0,
      expectedGeometry: polygon([[0, 0, 0], [4, 0, 0], [0, 2, 0]]),
      geometry: polygon([[-1, 0, 0], [4, 0, 0], [0, 3, 0.5]]),
    }]);
    expect(Object.isFrozen(result.objectEditing?.polygonMutations)).toBe(true);
    expect(Object.isFrozen(result.objectEditing?.polygonMutations?.[0]?.geometry.points)).toBe(true);
  });

  it("preserves an unchanged or target-absent polygon without emitting a mutation", () => {
    for (const includeTarget of [true, false]) {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("encounters", "obj_enc_patrol", "encounter") as Record<string, any>;
      object.source.sourceIndex = 0;
      object.source.polygonGeometry = polygon([[0, 0, 0], [4, 0, 0], [0, 2, 0]]);
      if (includeTarget) object.polygonGeometry = polygon([[0, 0, 0], [4, 0, 0], [0, 2, 0]]);
      payload.editableScene.objects = [object];

      const result = projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
      expect(result.objectEditing?.polygonMutations).toBeUndefined();
    }
  });

  it.each([
    ["target without provenance", undefined, polygon([[0, 0, 0], [4, 0, 0], [0, 2, 0]]), ".source.polygonGeometry"],
    ["malformed provenance", { coordinateSpace: "native_local", points: [] }, polygon([[0, 0, 0], [4, 0, 0], [0, 2, 0]]), ".source.polygonGeometry"],
    ["malformed target", polygon([[0, 0, 0], [4, 0, 0], [0, 2, 0]]), { coordinateSpace: "native_local", points: [] }, ".polygonGeometry"],
  ])("rejects retained Trigger polygon %s", (_label, provenance, target, pathSuffix) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("triggers", "obj_trg_exit", "trigger") as Record<string, any>;
    object.source.sourceIndex = 0;
    if (provenance !== undefined) object.source.polygonGeometry = provenance;
    object.polygonGeometry = target;
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it.each([
    ["target without provenance", undefined, { linkedTo: "NEW", linkedToFlags: 1, loadScreenId: 0 }, ".source.doorTransitionStorage"],
    ["malformed provenance", { linkedTo: "OLD", linkedToFlags: 256, loadScreenId: 0 }, { linkedTo: "NEW", linkedToFlags: 1, loadScreenId: 0 }, ".source.doorTransitionStorage"],
    ["malformed target", { linkedTo: "OLD", linkedToFlags: 1, loadScreenId: 0 }, { linkedTo: "NEW", linkedToFlags: 1, loadScreenId: -1 }, ".doorTransition.storage"],
  ])("rejects Door transition storage %s", (_label, provenance, target, pathSuffix) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("doors", "obj_dr_gate", "door") as Record<string, any>;
    object.source.sourceIndex = 0;
    if (provenance !== undefined) object.source.doorTransitionStorage = provenance;
    object.doorTransition = {
      linkedTarget: "",
      linkedModule: "",
      linkedTag: "",
      linkedWaypoint: "",
      loadScreen: "",
      flags: {},
      storage: target,
    };
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("does not project an unchanged existing-placeable OnUsed binding", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
    object.source.placeableOnUsed = "same_script";
    object.placeableProperties = { scriptSlots: { onUsed: "same_script" } };
    payload.editableScene.objects = [object];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    expect(result.objectEditing?.propertyMutations).toBeUndefined();
  });

  it("rejects an absent editable scene instead of materializing the production snapshot", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, unknown>;
    delete payload.editableScene;

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(AreaUpdateDraftProjectionError);
  });

  it("rejects sparse or reordered tiles before the ARE writer is called", () => {
    const value = snapshot();
    const state = (((value.draft.payload as Record<string, any>).editableScene).auroraAreaEditing).state;
    state.tiles = [state.tiles[1], state.tiles[0], state.tiles[2], state.tiles[3]];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path: "draft.payload.editableScene.auroraAreaEditing.state.tiles.0" }));
  });

  it("rejects a source coordinate outside the source grid", () => {
    const value = snapshot();
    const state = (((value.draft.payload as Record<string, any>).editableScene).auroraAreaEditing).state;
    state.tiles[3].sourceRow = 2;

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path: "draft.payload.editableScene.auroraAreaEditing.state.tiles.3.sourceRow" }));
  });

  it("projects exact aurora_git provenance when the draft is bound to a source GIT hash", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [
      sceneObject("creatures", "obj_cre_guard", "creature"),
      sceneObject("items", "obj_itm_sword", "item"),
    ];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing).toEqual({
      sourceGitSha256: "b".repeat(64),
      retainedObjects: [
        {
          sourceObjectId: "obj_cre_guard",
          sourceKind: "creature",
          sceneKind: "creatures",
          resRef: "nw_guard",
          tag: "NW_GUARD",
          x: 1,
          y: 2,
          z: 0,
          bearing: 0,
        },
        {
          sourceObjectId: "obj_itm_sword",
          sourceKind: "item",
          sceneKind: "items",
          resRef: "nw_sword",
          tag: "NW_SWORD",
          x: 1,
          y: 2,
          z: 0,
          bearing: 0,
        },
      ],
      newObjects: [],
    });
  });

  it("projects only a changed, provenance-bound existing-placeable OnUsed ResRef", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, placeableOnUsed: "" },
      placeableProperties: { scriptSlots: { onUsed: "s04_plcprobe" } }
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      expectedOnUsed: "",
      onUsed: "s04_plcprobe"
    }]);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations)).toBe(true);
  });

  it("projects changed provenance-bound Placeable boolean bytes in the same mutation", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      isStatic: false,
      source: {
        ...object.source,
        placeableOnUsed: "old_script",
        placeableStatic: true,
        placeableUseable: false,
        placeablePlot: false,
        placeableHasInventory: false,
      },
      placeableProperties: {
        plot: true,
        useable: true,
        hasInventory: true,
        scriptSlots: { onUsed: "new_script" },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      expectedOnUsed: "old_script",
      onUsed: "new_script",
      expectedStatic: true,
      static: false,
      expectedUseable: false,
      useable: true,
      expectedPlot: false,
      plot: true,
      expectedHasInventory: false,
      hasInventory: true,
    }]);
  });

  it("projects changed provenance-bound Placeable lock bytes in frozen field order", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        placeableLockSettings: {
          locked: false,
          canRelock: false,
          autoRemoveKeyAfterUse: false,
          keyRequiredToUnlockOrLock: false,
          openLockDc: 18,
          closeLockDc: 0,
        },
      },
      placeableProperties: {
        plot: false,
        useable: false,
        hasInventory: false,
        lockSettings: {
          locked: true,
          canRelock: true,
          autoRemoveKeyAfterUse: true,
          keyRequiredToUnlockOrLock: true,
          openLockDc: 24,
          closeLockDc: 12,
          keyTag: "preserve_only",
        },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      lockFields: [
        { field: "Locked", expectedValue: false, value: true },
        { field: "Lockable", expectedValue: false, value: true },
        { field: "AutoRemoveKey", expectedValue: false, value: true },
        { field: "KeyRequired", expectedValue: false, value: true },
        { field: "OpenLockDC", expectedValue: 18, value: 24 },
        { field: "CloseLockDC", expectedValue: 0, value: 12 },
      ],
    }]);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0]?.lockFields)).toBe(true);
  });

  it("projects changed provenance-bound Placeable durability and save bytes in frozen native order", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        placeableDurabilitySaveBytes: {
          willSave: 0,
          reflexSave: 0,
          fortitudeSave: 16,
          hardness: 5,
        },
      },
      placeableProperties: {
        hardness: 8,
        fortitudeSave: 20,
        reflexSave: 12,
        willSave: 10,
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      basicByteFields: [
        { field: "Hardness", expectedValue: 5, value: 8 },
        { field: "Fort", expectedValue: 16, value: 20 },
        { field: "Ref", expectedValue: 0, value: 12 },
        { field: "Will", expectedValue: 0, value: 10 },
      ],
    }]);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0]?.basicByteFields)).toBe(true);
  });

  it("projects only present and changed Placeable durability/save provenance", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        placeableDurabilitySaveBytes: { hardness: 5, reflexSave: 0 },
      },
      placeableProperties: {
        hardness: 5,
        fortitudeSave: 99,
        reflexSave: 7,
        willSave: 99,
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      basicByteFields: [{ field: "Ref", expectedValue: 0, value: 7 }],
    }]);
  });

  it("does not project unchanged Placeable durability/save bytes", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    const values = { hardness: 5, fortitudeSave: 16, reflexSave: 0, willSave: 0 };
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, placeableDurabilitySaveBytes: { ...values } },
      placeableProperties: { ...values },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toBeUndefined();
  });

  it("projects changed Placeable Conversation and inverse Interruptable pairs", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        placeableConversation: "",
        placeableInterruptable: 1,
      },
      placeableProperties: {
        advancedSettings: {
          conversation: "chest_dialog",
          noInterrupt: true,
        },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      conversation: { expectedResRef: "", resRef: "chest_dialog" },
      interruptable: { expectedValue: 1, value: 0 },
    }]);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0]?.conversation)).toBe(true);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0]?.interruptable)).toBe(true);
  });

  it("projects one exact changed Placeable TemplateResRef without changing renderer ResRef", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, placeableTemplateResRef: "plc_chest" },
      placeableProperties: {
        advancedSettings: { blueprintResRef: "plc_chest_alt" },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.retainedObjects[0]?.resRef).toBe(object.resRef);
    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      templateResRef: {
        expectedResRef: "plc_chest",
        resRef: "plc_chest_alt",
      },
    }]);
    expect(Object.isFrozen(
      (result.objectEditing?.propertyMutations?.[0] as any).templateResRef,
    )).toBe(true);
  });

  it.each([
    ["unchanged", "plc_chest", undefined],
    ["uppercase target", "PLC_CHEST_ALT", ".placeableProperties.advancedSettings.blueprintResRef"],
    ["invalid target", "plc-chest-alt", ".placeableProperties.advancedSettings.blueprintResRef"],
  ])("handles Placeable TemplateResRef %s fail-closed", (_label, target, errorPath) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, placeableTemplateResRef: "plc_chest" },
      placeableProperties: { advancedSettings: { blueprintResRef: target } },
    }];
    const run = () => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    if (errorPath) {
      expect(run).toThrow(expect.objectContaining({ path: expect.stringContaining(errorPath) }));
    } else {
      expect(run().objectEditing?.propertyMutations).toBeUndefined();
    }
  });

  it("projects a changed Placeable Conversation without materializing unchanged trap bytes", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        placeableConversation: "",
        placeableTrapSettings: { detectable: true, detectionDc: 12 },
      },
      placeableProperties: {
        advancedSettings: { conversation: "chest_dialog" },
        trapSettings: { detectable: true, detectionDc: 12 },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      conversation: { expectedResRef: "", resRef: "chest_dialog" },
    }]);
    expect(result.objectEditing?.propertyMutations?.[0]).not.toHaveProperty("trapFields");
  });

  it("projects a changed Placeable Interruptable without a Conversation mutation", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, placeableInterruptable: 1 },
      placeableProperties: { advancedSettings: { noInterrupt: true } },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      interruptable: { expectedValue: 1, value: 0 },
    }]);
  });

  it("does not materialize absent Placeable Interruptable provenance", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, placeableConversation: "same_dialog" },
      placeableProperties: {
        advancedSettings: { conversation: "same_dialog", noInterrupt: true },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toBeUndefined();
  });

  it("does not project unchanged Placeable Conversation or Interruptable", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        placeableConversation: "same_dialog",
        placeableInterruptable: 0,
      },
      placeableProperties: {
        advancedSettings: { conversation: "same_dialog", noInterrupt: true },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toBeUndefined();
  });

  it("projects one exact changed Placeable AnimationState pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, placeableAnimationState: 0 },
      placeableProperties: { advancedSettings: { initialState: 2 } },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      animationState: { expectedValue: 0, value: 2 },
    }]);
    expect(Object.isFrozen((result.objectEditing?.propertyMutations?.[0] as any).animationState)).toBe(true);
  });

  it("projects one exact changed Placeable HP / derived CurrentHP pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
    object.source.placeableHitPointState = { hitPoints: 15, currentHitPoints: 45 };
    object.placeableProperties = { hitPoints: 30 };
    payload.editableScene.objects = [object];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      hitPoints: {
        expectedHitPoints: 15,
        hitPoints: 30,
        expectedCurrentHitPoints: 45,
        currentHitPoints: 90,
      },
    }]);
    expect(Object.isFrozen((result.objectEditing?.propertyMutations?.[0] as any).hitPoints))
      .toBe(true);
  });

  it("projects one exact ordinal-bound changed Placeable Tag pair verbatim", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
    object.source.sourceIndex = 7;
    object.source.placeableBasicIdentity = {
      tag: { present: true, value: "WaterTrough" },
      appearance: { present: false },
    };
    object.tag = " Water Trough ";
    payload.editableScene.objects = [object];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.retainedObjects[0]).toMatchObject({
      sourceObjectId: "obj_plc_chest",
      sourceKind: "placeable",
      sourceIndex: 7,
    });
    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      sourceIndex: 7,
      tag: { expectedValue: "WaterTrough", value: " Water Trough " },
    }]);
  });

  it("projects independently changed bounded LocName and Description pairs in native order", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
    object.source.sourceIndex = 7;
    object.source.placeableLocalizedStrings = {
      locName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "Q2hlc3Q=" }],
      },
      description: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "U3RvcmFnZQ==" }],
      },
    };
    object.placeableProperties = {
      localizedName: " Chest ",
      description: "Storage room",
    };
    payload.editableScene.objects = [object];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      sourceIndex: 7,
      localizedStrings: [
        { field: "LocName", expectedValue: "Chest", value: " Chest " },
        { field: "Description", expectedValue: "Storage", value: "Storage room" },
      ],
    }]);
    expect(Object.isFrozen((result.objectEditing?.propertyMutations?.[0] as any).localizedStrings))
      .toBe(true);
  });

  it("projects a complete ordered Placeable localized-string list CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
    object.source.sourceIndex = 7;
    object.source.placeableLocalizedStrings = {
      locName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 0, textBytesBase64: "Q2hlc3Q=" },
          { languageId: 2, textBytesBase64: "Q29mZnJl" },
        ],
      },
      description: { present: true, strRef: 0xffff_ffff, entries: [] },
    };
    object.placeableProperties = {
      localizedName: "Chest",
      localizedNameEntries: [
        { languageId: 10, text: "Skrzynia" },
        { languageId: 0, text: "Chest" },
      ],
      description: "",
      descriptionEntries: [],
    };
    payload.editableScene.objects = [object];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      sourceIndex: 7,
      localizedStrings: [{
        field: "LocName",
        expectedValue: "Chest",
        value: "Chest",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries: [
          { languageId: 0, text: "Chest" },
          { languageId: 2, text: "Coffre" },
        ],
        valueEntries: [
          { languageId: 10, text: "Skrzynia" },
          { languageId: 0, text: "Chest" },
        ],
      }],
    }]);
  });

  it("does not project absent target properties or unchanged bounded localized strings", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
    object.source.sourceIndex = 7;
    object.source.placeableLocalizedStrings = {
      locName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "Q2hlc3Q=" }],
      },
      description: { present: false },
    };
    object.placeableProperties = { localizedName: "Chest" };
    payload.editableScene.objects = [object];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    expect(result.objectEditing?.propertyMutations).toBeUndefined();
  });

  it.each([
    ["missing ordinal", undefined, {
      locName: { present: true, strRef: 0xffff_ffff, entries: [] },
      description: { present: false },
    }, { localizedName: "New" }, "source.sourceIndex"],
    ["TLK-backed source", 7, {
      locName: { present: true, strRef: 1, entries: [] },
      description: { present: false },
    }, { localizedName: "New" }, "source.placeableLocalizedStrings.locName"],
    ["source pair with an unexpected member", 7, {
      locName: { present: true, strRef: 0xffff_ffff, entries: [] },
      description: { present: false },
      extra: true,
    }, { localizedName: "New" }, "source.placeableLocalizedStrings"],
    ["source pair missing Description provenance", 7, {
      locName: { present: true, strRef: 0xffff_ffff, entries: [] },
    }, { localizedName: "New" }, "source.placeableLocalizedStrings"],
    ["explicit empty source entry", 7, {
      locName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "" }],
      },
      description: { present: false },
    }, { localizedName: "New" }, "source.placeableLocalizedStrings.locName"],
    ["non-ASCII target", 7, {
      locName: { present: true, strRef: 0xffff_ffff, entries: [] },
      description: { present: false },
    }, { localizedName: "Żółć" }, "placeableProperties.localizedName"],
    ["unsupported absent Description target", 7, {
      locName: { present: true, strRef: 0xffff_ffff, entries: [] },
      description: { present: false },
    }, { localizedName: "", description: "invented" }, "source.placeableLocalizedStrings.description"],
  ])("rejects a changed bounded localized string with %s", (
    _label,
    sourceIndex,
    localizedStrings,
    properties,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
    if (sourceIndex !== undefined) object.source.sourceIndex = sourceIndex;
    object.source.placeableLocalizedStrings = localizedStrings;
    object.placeableProperties = properties;
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path: expect.stringContaining(pathSuffix) }));
  });

  it("keeps multiple legacy retained family members without ordinal provenance backward-compatible", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [
      sceneObject("placeables", "obj_plc_first", "placeable"),
      sceneObject("placeables", "obj_plc_second", "placeable"),
    ];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    expect(result.objectEditing?.retainedObjects).toHaveLength(2);
    expect(result.objectEditing?.retainedObjects[0]).not.toHaveProperty("sourceIndex");
    expect(result.objectEditing?.retainedObjects[1]).not.toHaveProperty("sourceIndex");
  });

  it("rejects duplicate immutable family ordinals even when diagnostic IDs differ", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const first = sceneObject("placeables", "obj_plc_first", "placeable") as Record<string, any>;
    const second = sceneObject("placeables", "obj_plc_second", "placeable") as Record<string, any>;
    first.source.sourceIndex = 7;
    second.source.sourceIndex = 7;
    payload.editableScene.objects = [first, second];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: "draft.payload.editableScene.objects.1.source.sourceIndex",
    }));
  });

  it("does not invent a sourceIndex property for a legacy non-Tag property mutation", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
    object.source.placeableOnUsed = "";
    object.placeableProperties = { scriptSlots: { onUsed: "new_script" } };
    payload.editableScene.objects = [object];

    const mutation = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations?.[0];
    expect(mutation).toMatchObject({ expectedOnUsed: "", onUsed: "new_script" });
    expect(mutation).not.toHaveProperty("sourceIndex");
  });

  it("does not project an unchanged Placeable Tag", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
    object.source.sourceIndex = 7;
    object.source.placeableBasicIdentity = {
      tag: { present: true, value: "WaterTrough" },
      appearance: { present: false },
    };
    object.tag = "WaterTrough";
    payload.editableScene.objects = [object];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    expect(result.objectEditing?.propertyMutations).toBeUndefined();
  });

  it("keeps an absent native Placeable Tag preserve-only", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
    object.source.sourceIndex = 7;
    object.source.placeableBasicIdentity = {
      tag: { present: false },
      appearance: { present: false },
    };
    object.tag = "display_fallback_only";
    payload.editableScene.objects = [object];
    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    expect(result.objectEditing?.propertyMutations).toBeUndefined();
  });

  it.each([
    ["missing ordinal", undefined, { present: true, value: "old" }, "new", "source.sourceIndex"],
    ["negative ordinal", -1, { present: true, value: "old" }, "new", "source.sourceIndex"],
    ["unexpected source key", 7, { present: true, value: "old", extra: true }, "new", "source.placeableBasicIdentity.tag"],
    ["over-budget source", 7, { present: true, value: "x".repeat(33) }, "new", "source.placeableBasicIdentity.tag"],
    ["over-budget target", 7, { present: true, value: "old" }, "x".repeat(33), ".tag"],
  ])("rejects a changed Placeable Tag with %s", (_label, sourceIndex, tag, target, pathSuffix) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
    if (sourceIndex !== undefined) object.source.sourceIndex = sourceIndex;
    object.source.placeableBasicIdentity = { tag, appearance: { present: false } };
    object.tag = target;
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path: expect.stringContaining(pathSuffix) }));
  });

  it("does not materialize absent or unchanged Placeable HP provenance", () => {
    for (const source of [{}, { placeableHitPointState: { hitPoints: 15, currentHitPoints: 45 } }]) {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
      object.source = { ...object.source, ...source };
      object.placeableProperties = { hitPoints: 15 };
      payload.editableScene.objects = [object];

      const result = projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
      expect(result.objectEditing?.propertyMutations).toBeUndefined();
    }
  });

  it.each([
    ["another family", "creatures", "creature", { hitPoints: 15, currentHitPoints: 45 }, 30, "placeableHitPointState"],
    ["an extra source key", "placeables", "placeable", { hitPoints: 15, currentHitPoints: 45, extra: true }, 30, "placeableHitPointState"],
    ["a missing source member", "placeables", "placeable", { hitPoints: 15 }, 30, "placeableHitPointState"],
    ["zero source HP", "placeables", "placeable", { hitPoints: 0, currentHitPoints: 1 }, 30, "placeableHitPointState"],
    ["a fractional source CurrentHP", "placeables", "placeable", { hitPoints: 15, currentHitPoints: 45.5 }, 30, "placeableHitPointState"],
    ["zero target HP", "placeables", "placeable", { hitPoints: 15, currentHitPoints: 45 }, 0, "placeableProperties.hitPoints"],
    ["an over-limit target HP", "placeables", "placeable", { hitPoints: 15, currentHitPoints: 45 }, 10_001, "placeableProperties.hitPoints"],
    ["a fractional target HP", "placeables", "placeable", { hitPoints: 15, currentHitPoints: 45 }, 30.5, "placeableProperties.hitPoints"],
  ])("rejects Placeable HP input from %s", (
    _label,
    sceneKind,
    sourceKind,
    sourceState,
    target,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject(sceneKind as any, "obj_hp_probe", sourceKind as any) as Record<string, any>;
    object.source = { ...object.source, placeableHitPointState: sourceState };
    object.placeableProperties = { hitPoints: target };
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path: expect.stringContaining(pathSuffix) }));
  });

  it("projects one exact digest-bound changed Placeable Appearance pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
    object.source.placeableBasicIdentity = {
      tag: { present: true, value: "NW_CHEST" },
      appearance: {
        present: true,
        nativeType: "dword",
        value: 104,
        table: {
          resourceName: "placeables.2da",
          sourceObjectKey: "modules/current/__aurora/sources/vanilla/placeables.2da",
          sourceLayer: "vanilla",
          sha256: "c".repeat(64),
          sizeBytes: 3_019_695,
          rowCount: 16_500,
          rowIndex: 104,
        },
      },
    };
    object.placeableProperties = { appearanceType: 105 };
    payload.editableScene.objects = [object];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      appearance: {
        expectedValue: 104,
        value: 105,
        tableSha256: "c".repeat(64),
        rowCount: 16_500,
      },
    }]);
    expect(Object.isFrozen((result.objectEditing?.propertyMutations?.[0] as any).appearance)).toBe(true);
  });

  it("does not materialize an absent or unchanged Placeable Appearance target", () => {
    for (const target of [{}, { appearanceType: 104 }]) {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
      object.source.placeableBasicIdentity = {
        tag: { present: false },
        appearance: {
          present: true,
          nativeType: "dword",
          value: 104,
          table: {
            resourceName: "placeables.2da",
            sourceObjectKey: "modules/current/placeables.2da",
            sourceLayer: "module",
            sha256: "c".repeat(64),
            sizeBytes: 100,
            rowCount: 200,
            rowIndex: 104,
          },
        },
      };
      object.placeableProperties = target;
      payload.editableScene.objects = [object];

      const result = projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
      expect(result.objectEditing?.propertyMutations).toBeUndefined();
    }
  });

  it("projects one exact digest-bound changed Placeable TrapType pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
    object.source.placeableTrapType = {
      expectedValue: 3,
      tableSha256: "d".repeat(64),
      tableRowCount: 48,
    };
    object.placeableProperties = { trapSettings: { trapTypeRow: 7 } };
    payload.editableScene.objects = [object];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      trapType: {
        expectedValue: 3,
        value: 7,
        tableSha256: "d".repeat(64),
        tableRowCount: 48,
      },
    }]);
    expect(Object.isFrozen((result.objectEditing?.propertyMutations?.[0] as any).trapType)).toBe(true);
  });

  it("omits unchanged TrapType and rejects malformed or out-of-table provenance", () => {
    const project = (source: unknown, trapTypeRow: unknown) => {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
      object.source.placeableTrapType = source;
      object.placeableProperties = { trapSettings: { trapTypeRow } };
      payload.editableScene.objects = [object];
      return projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    };
    const source = {
      expectedValue: 3,
      tableSha256: "d".repeat(64),
      tableRowCount: 48,
    };
    expect(project(source, 3).objectEditing?.propertyMutations).toBeUndefined();
    for (const malformed of [
      { ...source, extra: true },
      { ...source, expectedValue: 48 },
      { ...source, tableSha256: "D".repeat(64) },
      { ...source, tableRowCount: 257 },
    ]) {
      expect(() => project(malformed, 7)).toThrow(AreaUpdateDraftProjectionError);
    }
    for (const target of [-1, 1.5, 48, "7"]) {
      expect(() => project(source, target)).toThrow(AreaUpdateDraftProjectionError);
    }
  });

  it("projects only one exact digest-bound changed Placeable BodyBag pair", () => {
    const project = (source: unknown, treasureModelRow: unknown) => {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
      object.source.placeableBodyBag = source;
      object.placeableProperties = { advancedSettings: { treasureModelRow } };
      payload.editableScene.objects = [object];
      return projectAreaUpdateDraft(value, {
        areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    };
    const source = { expectedValue: 0, tableSha256: "e".repeat(64), tableRowCount: 7 };
    const result = project(source, 3);
    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      bodyBag: { expectedValue: 0, value: 3, tableSha256: "e".repeat(64), tableRowCount: 7 },
    }]);
    expect(Object.isFrozen((result.objectEditing?.propertyMutations?.[0] as any).bodyBag)).toBe(true);
    expect(project(source, 0).objectEditing?.propertyMutations).toBeUndefined();
    for (const malformed of [{ ...source, extra: true }, { ...source, expectedValue: 7 }]) {
      expect(() => project(malformed, 3)).toThrow(AreaUpdateDraftProjectionError);
    }
    for (const target of [-1, 1.5, 7, "3"]) {
      expect(() => project(source, target)).toThrow(AreaUpdateDraftProjectionError);
    }
  });

  it("projects only one exact digest-bound changed Placeable PortraitId pair", () => {
    const project = (source: unknown, portraitId: unknown) => {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
      object.source.placeablePortrait = source;
      object.placeableProperties = { advancedSettings: { portraitId } };
      payload.editableScene.objects = [object];
      return projectAreaUpdateDraft(value, {
        areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    };
    const source = { expectedValue: 462, tableSha256: "a".repeat(64), tableRowCount: 700 };
    expect(project(source, 463).objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      portrait: { expectedValue: 462, value: 463, tableSha256: "a".repeat(64), tableRowCount: 700 },
    }]);
    expect(project(source, 462).objectEditing?.propertyMutations).toBeUndefined();
    for (const malformed of [{ ...source, extra: true }, { ...source, expectedValue: 700 }]) {
      expect(() => project(malformed, 463)).toThrow(AreaUpdateDraftProjectionError);
    }
    for (const target of [-1, 1.5, 700, "463"]) {
      expect(() => project(source, target)).toThrow(AreaUpdateDraftProjectionError);
    }
  });

  it("projects only one exact digest-bound changed Placeable Faction pair", () => {
    const project = (source: unknown, factionId: unknown) => {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
      object.source.placeableFaction = source;
      object.placeableProperties = { advancedSettings: { factionId } };
      payload.editableScene.objects = [object];
      return projectAreaUpdateDraft(value, {
        areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    };
    const source = {
      expectedValue: 2,
      catalogSha256: "f".repeat(64),
      catalogFactionCount: 5,
    };
    expect(project(source, 3).objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      faction: { ...source, value: 3 },
    }]);
    expect(project(source, 2).objectEditing?.propertyMutations).toBeUndefined();
    for (const malformed of [{ ...source, extra: true }, { ...source, expectedValue: 5 }]) {
      expect(() => project(malformed, 3)).toThrow(AreaUpdateDraftProjectionError);
    }
    for (const target of [-1, 1.5, 5, "3"]) {
      expect(() => project(source, target)).toThrow(AreaUpdateDraftProjectionError);
    }
  });

  it("projects an exact changed Placeable variable list while preserving physical order", () => {
    const project = (source: unknown, variables: unknown) => {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
      object.source.placeableVariables = source;
      object.placeableProperties = { variables };
      payload.editableScene.objects = [object];
      return projectAreaUpdateDraft(value, {
        areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    };
    const source = { expectedEntries: [
      { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
      { sourceIndex: 1, name: "Label", type: "string", value: "before" },
    ] };
    expect(project(source, [
      { name: "Label", type: "string", value: "after" },
      { name: "Counter", type: "int", value: 1 },
    ]).objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      variables: {
        expectedEntries: source.expectedEntries,
        entries: [
          { name: "Label", type: "string", value: "after" },
          { name: "Counter", type: "int", value: 1 },
        ],
      },
    }]);
    expect(project(source, [
      { name: "Counter", type: "int", value: 1 },
      { name: "Label", type: "string", value: "before" },
    ]).objectEditing?.propertyMutations).toBeUndefined();
    expect(() => project(source, [
      { name: "Counter", type: "int", value: 1, extra: true },
    ])).toThrow(AreaUpdateDraftProjectionError);
    expect(() => project({ expectedEntries: [{ sourceIndex: 1, name: "x", type: "int", value: 1 }] }, []))
      .toThrow(AreaUpdateDraftProjectionError);
  });

  it.each([
    ["legacy Byte provenance", { present: true, nativeType: "byte", value: 104 }, 105, "placeableBasicIdentity.appearance"],
    ["absent provenance", { present: false }, 105, "placeableBasicIdentity.appearance"],
    ["row equal to rowCount", {
      present: true,
      nativeType: "dword",
      value: 104,
      table: {
        resourceName: "placeables.2da",
        sourceObjectKey: "modules/current/placeables.2da",
        sourceLayer: "module",
        sha256: "c".repeat(64),
        sizeBytes: 100,
        rowCount: 200,
        rowIndex: 104,
      },
    }, 200, "placeableProperties.appearanceType"],
  ])("rejects a changed Placeable Appearance target with %s", (_label, appearance, target, expectedPath) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
    object.source.placeableBasicIdentity = {
      tag: { present: false },
      appearance,
    };
    object.placeableProperties = { appearanceType: target };
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: expect.stringContaining(expectedPath),
    }));
  });

  it("validates every exact Placeable Appearance table-provenance boundary before projection", () => {
    const makeAppearance = () => ({
      present: true,
      nativeType: "dword",
      value: 0,
      table: {
        resourceName: "placeables.2da",
        sourceObjectKey: "x",
        sourceLayer: "module",
        sha256: "c".repeat(64),
        sizeBytes: 1,
        rowCount: 2,
        rowIndex: 0,
      },
    });
    const project = (appearance: unknown, target: unknown, placeableProperties: unknown = {
      appearanceType: target,
    }) => {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
      object.source.placeableBasicIdentity = {
        tag: { present: false },
        appearance,
      };
      object.placeableProperties = placeableProperties;
      payload.editableScene.objects = [object];
      return projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    };

    const invalidMutations: Array<(appearance: any) => void> = [
      (appearance) => { appearance.extra = true; },
      (appearance) => { appearance.present = false; },
      (appearance) => { appearance.nativeType = "byte"; },
      (appearance) => { delete appearance.table; },
      (appearance) => { appearance.table.extra = true; },
      (appearance) => { delete appearance.table.rowIndex; },
      (appearance) => { appearance.table.resourceName = "appearance.2da"; },
      (appearance) => { appearance.table.sourceObjectKey = 1; },
      (appearance) => { appearance.table.sourceObjectKey = ""; },
      (appearance) => { appearance.table.sourceObjectKey = "x".repeat(2049); },
      (appearance) => { appearance.table.sourceLayer = "override"; },
      (appearance) => { appearance.table.sha256 = 1; },
      (appearance) => { appearance.table.sha256 = "C".repeat(64); },
      (appearance) => { appearance.table.sizeBytes = 1.5; },
      (appearance) => { appearance.table.sizeBytes = 0; },
      (appearance) => { appearance.table.sizeBytes = 64 * 1024 * 1024 + 1; },
      (appearance) => { appearance.table.rowCount = 1.5; },
      (appearance) => { appearance.table.rowCount = 0; },
      (appearance) => { appearance.table.rowCount = 1_000_001; },
      (appearance) => { appearance.table.rowIndex = 1; },
      (appearance) => { appearance.value = 2; appearance.table.rowIndex = 2; },
    ];
    for (const mutate of invalidMutations) {
      const appearance = makeAppearance();
      mutate(appearance);
      expect(() => project(appearance, 1)).toThrow();
    }
    for (const invalidTarget of [-1, 1.5, 2, 0x1_0000_0000, "1"]) {
      expect(() => project(makeAppearance(), invalidTarget)).toThrow();
    }

    for (const sourceLayer of ["module", "hak", "vanilla"]) {
      const appearance = makeAppearance();
      appearance.table.sourceLayer = sourceLayer;
      expect((project(appearance, 1).objectEditing?.propertyMutations?.[0] as any).appearance)
        .toMatchObject({ expectedValue: 0, value: 1, rowCount: 2 });
    }
    const singleton = makeAppearance();
    singleton.table.rowCount = 1;
    expect(project(singleton, 0).objectEditing?.propertyMutations).toBeUndefined();

    const oversizedUnchanged = makeAppearance();
    oversizedUnchanged.table.rowCount = 1_000_001;
    expect(() => project(oversizedUnchanged, 0)).toThrow();

    const outOfTableSource = makeAppearance();
    outOfTableSource.value = 2;
    outOfTableSource.table.rowIndex = 2;
    let outOfTableError: any;
    try {
      project(outOfTableSource, 1);
    } catch (error) {
      outOfTableError = error;
    }
    expect(outOfTableError).toMatchObject({
      path: expect.stringContaining("placeableBasicIdentity.appearance.table.rowIndex"),
    });

    const zeroRows = makeAppearance();
    zeroRows.table.rowCount = 0;
    let zeroRowsError: any;
    try {
      project(zeroRows, 1);
    } catch (error) {
      zeroRowsError = error;
    }
    expect(zeroRowsError?.path).toContain("placeableBasicIdentity.appearance.table");
    expect(zeroRowsError?.path).not.toContain("rowIndex");
    const maximums = makeAppearance();
    maximums.table.sourceObjectKey = "x".repeat(2048);
    maximums.table.sizeBytes = 64 * 1024 * 1024;
    maximums.table.rowCount = 1_000_000;
    expect((project(maximums, 999_999).objectEditing?.propertyMutations?.[0] as any).appearance)
      .toMatchObject({ expectedValue: 0, value: 999_999, rowCount: 1_000_000 });

    expect(project(makeAppearance(), undefined, null).objectEditing?.propertyMutations)
      .toBeUndefined();
    expect(project(makeAppearance(), undefined, []).objectEditing?.propertyMutations)
      .toBeUndefined();
  });

  it("does not materialize absent or unchanged Placeable AnimationState provenance", () => {
    for (const source of [{}, { placeableAnimationState: 1 }]) {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("placeables", "obj_plc_chest", "placeable");
      payload.editableScene.objects = [{
        ...object,
        source: { ...object.source, ...source },
        placeableProperties: { advancedSettings: { initialState: 1 } },
      }];

      const result = projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
      expect(result.objectEditing?.propertyMutations).toBeUndefined();
    }
  });

  it("projects one exact changed GIC editor-comment pair with its immutable source digest", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.provenance.sourceGicSha256 = "c".repeat(64);
    const object = sceneObject("placeables", "obj_plc_watertrough", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, placeableEditorComment: " Water Trough " },
      placeableProperties: { comments: "Water trough beside the west wall.\n" },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing).toEqual(expect.objectContaining({
      sourceGitSha256: "b".repeat(64),
      sourceGicSha256: "c".repeat(64),
      propertyMutations: [{
        kind: "placeable",
        sourceObjectId: "obj_plc_watertrough",
        editorComment: {
          expectedValue: " Water Trough ",
          value: "Water trough beside the west wall.\n",
        },
      }],
    }));
    expect(Object.isFrozen((result.objectEditing?.propertyMutations?.[0] as any).editorComment))
      .toBe(true);
  });

  it("projects one exact changed Creature GIC editor-comment pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.provenance.sourceGicSha256 = "c".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureEditorComment: " Guard note ",
      },
      creatureProperties: { comments: "Guard beside the west gate.\n" },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing).toEqual(expect.objectContaining({
      sourceGitSha256: "b".repeat(64),
      sourceGicSha256: "c".repeat(64),
      propertyMutations: [{
        kind: "creature",
        sourceObjectId: "obj_cre_guard",
        sourceIndex: 0,
        editorComment: {
          expectedValue: " Guard note ",
          value: "Guard beside the west gate.\n",
        },
      }],
    }));
    expect(Object.isFrozen((result.objectEditing?.propertyMutations?.[0] as any).editorComment))
      .toBe(true);
  });

  it("projects one exact changed ground-item GIC editor-comment pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.provenance.sourceGicSha256 = "c".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        itemEditorComment: " Ground item ",
      },
      itemProperties: { comments: "West wall ground item.\n" },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing).toEqual(expect.objectContaining({
      sourceGitSha256: "b".repeat(64),
      sourceGicSha256: "c".repeat(64),
      propertyMutations: [{
        kind: "item",
        sourceObjectId: "obj_itm_sword",
        sourceIndex: 0,
        editorComment: {
          expectedValue: " Ground item ",
          value: "West wall ground item.\n",
        },
      }],
    }));
  });

  it("projects one exact changed Store GIC editor-comment pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.provenance.sourceGicSha256 = "c".repeat(64);
    const object = sceneObject("stores", "obj_store_dye", "store");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        storeEditorComment: " Sample Dye Store ",
      },
      storeProperties: { comments: "Dye merchant beside the west wall.\n" },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing).toEqual(expect.objectContaining({
      sourceGitSha256: "b".repeat(64),
      sourceGicSha256: "c".repeat(64),
      propertyMutations: [{
        kind: "store",
        sourceObjectId: "obj_store_dye",
        sourceIndex: 0,
        editorComment: {
          expectedValue: " Sample Dye Store ",
          value: "Dye merchant beside the west wall.\n",
        },
      }],
    }));
    expect(Object.isFrozen((result.objectEditing?.propertyMutations?.[0] as any).editorComment))
      .toBe(true);
  });

  it("rejects a changed Store editor comment without the immutable GIC digest", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("stores", "obj_store_dye", "store");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        storeEditorComment: "Sample Dye Store",
      },
      storeProperties: { comments: "Changed" },
    }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow("A changed Store editor comment requires the immutable source GIC digest.");
  });

  it("projects one exact changed retained Store commerce-vector CAS without requiring GIC", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const sourceCommerce = {
      markUp: 100,
      markDown: 65,
      blackMarket: false,
      blackMarketMarkDown: 25,
      identifyPrice: 100,
      maxBuyPrice: -1,
      storeGold: -1,
    };
    const object = sceneObject("stores", "obj_store_dye", "store");
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, sourceIndex: 0, storeCommerce: sourceCommerce },
      storeProperties: {
        comments: "Sample Dye Store",
        commerce: { ...sourceCommerce, storeGold: 5000, blackMarket: true },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing).toEqual(expect.objectContaining({
      sourceGitSha256: "b".repeat(64),
      propertyMutations: [{
        kind: "store",
        sourceObjectId: "obj_store_dye",
        sourceIndex: 0,
        commerce: {
          expectedValue: sourceCommerce,
          value: { ...sourceCommerce, storeGold: 5000, blackMarket: true },
        },
      }],
    }));
    expect(Object.isFrozen((result.objectEditing?.propertyMutations?.[0] as any).commerce))
      .toBe(true);
  });

  it("projects one exact changed retained Store script-ResRef pair CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const sourceScripts = {
      onOpenStore: "",
      onStoreClosed: "old_closed",
    };
    const object = sceneObject("stores", "obj_store_dye", "store");
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, sourceIndex: 0, storeScriptResRefs: sourceScripts },
      storeProperties: {
        comments: "Sample Dye Store",
        scriptResRefs: { onOpenStore: "nw_store_open", onStoreClosed: "nw_store_close" },
      },
    }];

    const mutation = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations?.[0];

    expect(mutation).toEqual({
      kind: "store",
      sourceObjectId: "obj_store_dye",
      sourceIndex: 0,
      scripts: {
        expectedValue: sourceScripts,
        value: { onOpenStore: "nw_store_open", onStoreClosed: "nw_store_close" },
      },
    });
    expect(Object.isFrozen((mutation as any).scripts)).toBe(true);
  });

  it("rejects partial Store script provenance instead of synthesizing a missing hook", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("stores", "obj_store_dye", "store");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        storeScriptResRefs: { onOpenStore: "" },
      },
      storeProperties: { scriptResRefs: { onOpenStore: "nw_store_open" } },
    }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow("Store script ResRef provenance is malformed.");
  });

  it("projects one changed exact ordered retained Store VarTable CAS pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const expectedEntries = [
      { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
      { sourceIndex: 1, name: "Label", type: "string", value: "before" },
    ];
    const object = sceneObject("stores", "obj_store_dye", "store");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        storeVariables: { expectedEntries },
      },
      storeProperties: {
        variables: [
          { name: "Label", type: "string", value: "after" },
          { name: "Counter", type: "int", value: 1 },
        ],
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "store",
      sourceObjectId: "obj_store_dye",
      sourceIndex: 0,
      variables: {
        expectedEntries,
        entries: [
          { name: "Label", type: "string", value: "after" },
          { name: "Counter", type: "int", value: 1 },
        ],
      },
    }]);
  });

  it("does not project an unchanged retained Store VarTable", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("stores", "obj_store_dye", "store");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        storeVariables: {
          expectedEntries: [{ sourceIndex: 0, name: "Counter", type: "int", value: 1 }],
        },
      },
      storeProperties: { variables: [{ name: "Counter", type: "int", value: 1 }] },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toBeUndefined();
  });

  it("rejects a Store VarTable target without immutable exact provenance", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("stores", "obj_store_dye", "store");
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, sourceIndex: 0 },
      storeProperties: { variables: [{ name: "Counter", type: "int", value: 1 }] },
    }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: "draft.payload.editableScene.objects.0.source.storeVariables",
    }));
  });

  it("combines independently changed Store Comment and commerce in one ordinal mutation", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.provenance.sourceGicSha256 = "c".repeat(64);
    const sourceCommerce = {
      markUp: 100,
      markDown: 65,
      blackMarket: false,
      blackMarketMarkDown: 25,
      identifyPrice: 100,
      maxBuyPrice: -1,
      storeGold: -1,
    };
    const object = sceneObject("stores", "obj_store_dye", "store");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        storeEditorComment: "Sample Dye Store",
        storeCommerce: sourceCommerce,
      },
      storeProperties: {
        comments: "Updated",
        commerce: { ...sourceCommerce, identifyPrice: 250 },
      },
    }];

    const mutation = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations?.[0];
    expect(mutation).toEqual({
      kind: "store",
      sourceObjectId: "obj_store_dye",
      sourceIndex: 0,
      editorComment: { expectedValue: "Sample Dye Store", value: "Updated" },
      commerce: {
        expectedValue: sourceCommerce,
        value: { ...sourceCommerce, identifyPrice: 250 },
      },
    });
  });

  it("rejects partial Store commerce provenance instead of synthesizing Aurora defaults", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("stores", "obj_store_dye", "store");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        storeCommerce: { markUp: 100 },
      },
      storeProperties: {
        comments: "Sample Dye Store",
        commerce: { markUp: 100 },
      },
    }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow("Store commerce provenance is malformed.");
  });

  it("projects one exact changed retained ground-item Tag CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    payload.editableScene.objects = [{
      ...object,
      tag: "  WEST_WALL_LOOT  ",
      source: {
        ...object.source,
        sourceIndex: 0,
        itemTag: { present: true, value: "NW_SWORD" },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "item",
      sourceObjectId: "obj_itm_sword",
      sourceIndex: 0,
      tag: {
        expectedValue: "NW_SWORD",
        value: "  WEST_WALL_LOOT  ",
      },
    }]);
    expect(Object.isFrozen((result.objectEditing?.propertyMutations?.[0] as any).tag))
      .toBe(true);
  });

  it.each([
    ["malformed provenance", { present: true }, "NEW_TAG", ".source.itemTag"],
    ["an over-budget target", { present: true, value: "NW_SWORD" }, "x".repeat(33), ".tag"],
    ["a NUL-bearing target", { present: true, value: "NW_SWORD" }, "bad\0tag", ".tag"],
  ])("rejects retained ground-item Tag input with %s", (
    _label,
    itemTag,
    tag,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    payload.editableScene.objects = [{
      ...object,
      tag,
      source: { ...object.source, sourceIndex: 0, itemTag },
    }];

    let error: unknown;
    try {
      projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(AreaUpdateDraftProjectionError);
    expect(error).toEqual(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("keeps an absent retained ground-item Tag preserve-only", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    payload.editableScene.objects = [{
      ...object,
      tag: "DISPLAY_ONLY",
      source: {
        ...object.source,
        sourceIndex: 0,
        itemTag: { present: false },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toBeUndefined();
  });

  it("projects one exact changed retained Trigger Tag CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("triggers", "obj_trigger_exit", "trigger");
    payload.editableScene.objects = [{
      ...object,
      tag: "  AREA_EXIT  ",
      source: {
        ...object.source,
        sourceIndex: 0,
        triggerTag: { present: true, value: "GenericTrigger" },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "trigger",
      sourceObjectId: "obj_trigger_exit",
      sourceIndex: 0,
      tag: {
        expectedValue: "GenericTrigger",
        value: "  AREA_EXIT  ",
      },
    }]);
  });

  it.each([
    ["malformed provenance", { present: true }, "AREA_EXIT", ".source.triggerTag"],
    ["an over-budget target", { present: true, value: "GenericTrigger" }, "x".repeat(33), ".tag"],
    ["a NUL-bearing target", { present: true, value: "GenericTrigger" }, "bad\0tag", ".tag"],
  ])("rejects retained Trigger Tag input with %s", (
    _label,
    triggerTag,
    tag,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("triggers", "obj_trigger_exit", "trigger");
    payload.editableScene.objects = [{
      ...object,
      tag,
      source: { ...object.source, sourceIndex: 0, triggerTag },
    }];

    let error: unknown;
    try {
      projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(AreaUpdateDraftProjectionError);
    expect(error).toEqual(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("keeps an absent retained Trigger Tag preserve-only", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("triggers", "obj_trigger_exit", "trigger");
    payload.editableScene.objects = [{
      ...object,
      tag: "DISPLAY_ONLY",
      source: {
        ...object.source,
        sourceIndex: 0,
        triggerTag: { present: false },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toBeUndefined();
  });

  it("projects one exact changed retained Waypoint Tag CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("waypoints", "obj_wpt_nw_waypoint001", "waypoint");
    payload.editableScene.objects = [{
      ...object,
      tag: "  AREA_DESTINATION  ",
      source: {
        ...object.source,
        sourceIndex: 0,
        waypointTag: { present: true, value: "NW_WAYPOINT001" },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "waypoint",
      sourceObjectId: "obj_wpt_nw_waypoint001",
      sourceIndex: 0,
      tag: {
        expectedValue: "NW_WAYPOINT001",
        value: "  AREA_DESTINATION  ",
      },
    }]);
  });

  it.each([
    ["malformed provenance", { present: true }, "DEST", ".source.waypointTag"],
    ["an over-budget target", { present: true, value: "NW_WAYPOINT001" }, "x".repeat(33), ".tag"],
    ["a NUL-bearing target", { present: true, value: "NW_WAYPOINT001" }, "bad\0tag", ".tag"],
  ])("rejects retained Waypoint Tag input with %s", (
    _label,
    waypointTag,
    tag,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("waypoints", "obj_wpt_nw_waypoint001", "waypoint");
    payload.editableScene.objects = [{
      ...object,
      tag,
      source: { ...object.source, sourceIndex: 0, waypointTag },
    }];

    let error: unknown;
    try {
      projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(AreaUpdateDraftProjectionError);
    expect(error).toEqual(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("keeps an absent retained Waypoint Tag preserve-only", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("waypoints", "obj_wpt_nw_waypoint001", "waypoint");
    payload.editableScene.objects = [{
      ...object,
      tag: "DISPLAY_ONLY",
      source: {
        ...object.source,
        sourceIndex: 0,
        waypointTag: { present: false },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toBeUndefined();
  });

  it("projects one exact changed retained Encounter Tag CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter");
    payload.editableScene.objects = [{
      ...object,
      tag: "  GNOLL_AMBUSH  ",
      source: {
        ...object.source,
        sourceIndex: 0,
        encounterTag: { present: true, value: "X2_GNOLL001" },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "encounter",
      sourceObjectId: "obj_enc_x2_gnoll001",
      sourceIndex: 0,
      tag: {
        expectedValue: "X2_GNOLL001",
        value: "  GNOLL_AMBUSH  ",
      },
    }]);
  });

  it.each([
    ["malformed provenance", { present: true }, "GNOLL_AMBUSH", ".source.encounterTag"],
    ["an over-budget target", { present: true, value: "X2_GNOLL001" }, "x".repeat(33), ".tag"],
    ["a NUL-bearing target", { present: true, value: "X2_GNOLL001" }, "bad\0tag", ".tag"],
  ])("rejects retained Encounter Tag input with %s", (
    _label,
    encounterTag,
    tag,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter");
    payload.editableScene.objects = [{
      ...object,
      tag,
      source: { ...object.source, sourceIndex: 0, encounterTag },
    }];

    let error: unknown;
    try {
      projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(AreaUpdateDraftProjectionError);
    expect(error).toEqual(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("keeps an absent retained Encounter Tag preserve-only", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter");
    payload.editableScene.objects = [{
      ...object,
      tag: "DISPLAY_ONLY",
      source: {
        ...object.source,
        sourceIndex: 0,
        encounterTag: { present: false },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toBeUndefined();
  });

  it("projects exact retained Encounter flags, counts, scripts, and Tag in one property mutation", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter");
    payload.editableScene.objects = [{
      ...object,
      tag: "GNOLL_AMBUSH",
      encounterActive: { activeByte: 0 },
      encounterPlayerOnly: { playerOnlyByte: 0 },
      encounterReset: { resetByte: 0 },
      encounterResetTime: { resetTime: 90 },
      encounterSpawnOption: { spawnOption: 1 },
      encounterRespawns: { respawns: -1 },
      encounterCreatureCounts: { maxCreatures: 3, recCreatures: 3 },
      encounterScriptResRefs: {
        onEntered: "new_enter",
        onExit: "new_exit",
        onExhausted: "new_exhausted",
        onHeartbeat: "new_heartbeat",
        onUserDefined: "new_user",
      },
      source: {
        ...object.source,
        sourceIndex: 0,
        encounterTag: { present: true, value: "X2_GNOLL001" },
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
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "encounter",
      sourceObjectId: "obj_enc_x2_gnoll001",
      sourceIndex: 0,
      tag: { expectedValue: "X2_GNOLL001", value: "GNOLL_AMBUSH" },
      active: {
        expectedValue: { activeByte: 1 },
        value: { activeByte: 0 },
      },
      playerOnly: {
        expectedValue: { playerOnlyByte: 1 },
        value: { playerOnlyByte: 0 },
      },
      reset: {
        expectedValue: { resetByte: 1 },
        value: { resetByte: 0 },
      },
      resetTime: {
        expectedValue: { resetTime: 60 },
        value: { resetTime: 90 },
      },
      spawnOption: {
        expectedValue: { spawnOption: 0 },
        value: { spawnOption: 1 },
      },
      respawns: {
        expectedValue: { respawns: 0 },
        value: { respawns: -1 },
      },
      creatureCounts: {
        expectedValue: { maxCreatures: 4, recCreatures: 2 },
        value: { maxCreatures: 3, recCreatures: 3 },
      },
      scripts: {
        expectedValue: {
          onEntered: "enc_enter",
          onExit: "enc_exit",
          onExhausted: "",
          onHeartbeat: "enc_heartbeat",
          onUserDefined: "enc_user",
        },
        value: {
          onEntered: "new_enter",
          onExit: "new_exit",
          onExhausted: "new_exhausted",
          onHeartbeat: "new_heartbeat",
          onUserDefined: "new_user",
        },
      },
    }]);
  });

  it("projects only one exact digest-bound changed Encounter Faction pair", () => {
    const project = (source: unknown, factionId: unknown) => {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject(
        "encounters",
        "obj_enc_x2_gnoll001",
        "encounter",
      ) as Record<string, any>;
      object.source.sourceIndex = 0;
      object.source.encounterFaction = source;
      object.encounterFactionId = factionId;
      payload.editableScene.objects = [object];
      return projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    };
    const source = {
      expectedValue: 1,
      catalogSha256: "f".repeat(64),
      catalogFactionCount: 5,
    };
    expect(project(source, 4).objectEditing?.propertyMutations).toEqual([{
      kind: "encounter",
      sourceObjectId: "obj_enc_x2_gnoll001",
      sourceIndex: 0,
      faction: { ...source, value: 4 },
    }]);
    expect(project(source, 1).objectEditing?.propertyMutations).toBeUndefined();
    for (const malformed of [
      { ...source, extra: true },
      { ...source, expectedValue: 0 },
      { ...source, expectedValue: 5 },
    ]) {
      expect(() => project(malformed, 4)).toThrow(AreaUpdateDraftProjectionError);
    }
    for (const target of [0, 1.5, 5, "4"]) {
      expect(() => project(source, target)).toThrow(AreaUpdateDraftProjectionError);
    }
  });

  it("projects only one exact digest-bound changed Encounter Difficulty pair", () => {
    const project = (source: unknown, target: unknown) => {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject(
        "encounters",
        "obj_enc_x2_gnoll001",
        "encounter",
      ) as Record<string, any>;
      object.source.sourceIndex = 0;
      object.source.encounterDifficulty = source;
      object.encounterDifficulty = target;
      payload.editableScene.objects = [object];
      return projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    };
    const source = {
      expectedValue: { difficulty: 1, difficultyIndex: 2 },
      catalogSha256: "d".repeat(64),
      catalogRowCount: 5,
    };
    expect(project(source, {
      difficulty: 3,
      difficultyIndex: 4,
    }).objectEditing?.propertyMutations).toEqual([{
      kind: "encounter",
      sourceObjectId: "obj_enc_x2_gnoll001",
      sourceIndex: 0,
      difficulty: {
        ...source,
        value: { difficulty: 3, difficultyIndex: 4 },
      },
    }]);
    expect(project(source, source.expectedValue).objectEditing?.propertyMutations)
      .toBeUndefined();
    for (const malformed of [
      { ...source, extra: true },
      { ...source, expectedValue: { difficulty: 1, difficultyIndex: 5 } },
      { ...source, catalogRowCount: 0 },
    ]) {
      expect(() => project(malformed, { difficulty: 3, difficultyIndex: 4 }))
        .toThrow(AreaUpdateDraftProjectionError);
    }
    for (const target of [
      { difficulty: 21, difficultyIndex: 4 },
      { difficulty: 3, difficultyIndex: 5 },
      { difficulty: 3, difficultyIndex: "4" },
      { difficulty: 3, difficultyIndex: 4, extra: true },
    ]) {
      expect(() => project(source, target)).toThrow(AreaUpdateDraftProjectionError);
    }
  });

  it("projects only one changed admitted Encounter LocalizedName pair", () => {
    const project = (source: unknown, target: unknown) => {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject(
        "encounters",
        "obj_enc_x2_gnoll001",
        "encounter",
      ) as Record<string, any>;
      object.source.sourceIndex = 0;
      object.source.encounterLocalizedNameStorage = source;
      object.encounterLocalizedName = target;
      payload.editableScene.objects = [object];
      return projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    };
    const source = {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "R25vbGwgQW1idXNo" }],
    };
    expect(project(source, " Night Ambush ").objectEditing?.propertyMutations)
      .toEqual([{
        kind: "encounter",
        sourceObjectId: "obj_enc_x2_gnoll001",
        sourceIndex: 0,
        localizedName: {
          expectedValue: "Gnoll Ambush",
          value: " Night Ambush ",
        },
      }]);
    expect(project(source, "Gnoll Ambush").objectEditing?.propertyMutations)
      .toBeUndefined();
    for (const malformed of [
      { present: false },
      { present: true, strRef: 91345, entries: [] },
      { present: true, strRef: 0xffff_ffff, entries: [
        { languageId: 1, textBytesBase64: "R25vbGw=" },
      ] },
    ]) {
      expect(() => project(malformed, "Night Ambush"))
        .toThrow(AreaUpdateDraftProjectionError);
    }
    for (const target of ["Bad\nName", "Łowcy", "A".repeat(257), 7]) {
      expect(() => project(source, target)).toThrow(AreaUpdateDraftProjectionError);
    }
  });

  it("projects only one exact paired-GIC Encounter Comment CAS", () => {
    const project = (
      source: unknown,
      target: unknown,
      includeSourceGic = true,
    ) => {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      if (includeSourceGic) payload.provenance.sourceGicSha256 = "c".repeat(64);
      const object = sceneObject(
        "encounters",
        "obj_enc_x2_gnoll001",
        "encounter",
      ) as Record<string, any>;
      object.source.sourceIndex = 0;
      object.source.encounterEditorComment = source;
      object.encounterProperties = { comments: target };
      payload.editableScene.objects = [object];
      return projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    };

    expect(project(" source ", " target ").objectEditing).toMatchObject({
      sourceGicSha256: "c".repeat(64),
      propertyMutations: [{
        kind: "encounter",
        sourceObjectId: "obj_enc_x2_gnoll001",
        sourceIndex: 0,
        editorComment: { expectedValue: " source ", value: " target " },
      }],
    });
    expect(project("source", "source").objectEditing?.propertyMutations)
      .toBeUndefined();
    expect(() => project("source", "target", false))
      .toThrow(AreaUpdateDraftProjectionError);
    for (const value of [7, "bad\0comment", "A".repeat(4097)]) {
      expect(() => project("source", value)).toThrow(AreaUpdateDraftProjectionError);
    }
  });

  it("projects one exact changed ordered Encounter VarTable CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter") as
      Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.encounterVariables = { expectedEntries: [
      { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
      { sourceIndex: 1, name: "Counter", type: "string", value: "source" },
    ] };
    object.encounterProperties = { variables: [
      { name: "Counter", type: "string", value: "target" },
      { name: "Counter", type: "int", value: 1 },
    ] };
    payload.editableScene.objects = [object];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toEqual([{
      kind: "encounter",
      sourceObjectId: "obj_enc_x2_gnoll001",
      sourceIndex: 0,
      variables: {
        expectedEntries: object.source.encounterVariables.expectedEntries,
        entries: object.encounterProperties.variables,
      },
    }]);
  });

  it("projects one exact changed Encounter CreatureList SingleSpawn vector CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter") as
      Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.encounterCreatureList = { expectedEntries: [
      {
        sourceIndex: 0, appearance: 388, challengeRating: 1,
        resRef: "nw_gnoll001", singleSpawnByte: 0,
      },
      {
        sourceIndex: 1, appearance: 389, challengeRating: 3,
        resRef: "nw_gnoll002", singleSpawnByte: 1,
      },
    ] };
    object.encounterProperties = { creatureList: [
      { appearance: 388, challengeRating: 1, resRef: "nw_gnoll001", singleSpawn: true },
      { appearance: 389, challengeRating: 3, resRef: "nw_gnoll002", singleSpawn: true },
    ] };
    payload.editableScene.objects = [object];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toEqual([{
      kind: "encounter",
      sourceObjectId: "obj_enc_x2_gnoll001",
      sourceIndex: 0,
      creatureList: {
        expectedEntries: object.source.encounterCreatureList.expectedEntries,
        entries: [
          { ...object.source.encounterCreatureList.expectedEntries[0], singleSpawnByte: 1 },
          object.source.encounterCreatureList.expectedEntries[1],
        ],
      },
    }]);
  });

  it("projects one catalog-bound structural Encounter CreatureList vector CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter") as
      Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.encounterCreatureList = { expectedEntries: [
      {
        sourceIndex: 0, appearance: 388, challengeRating: 1,
        resRef: "nw_gnoll001", singleSpawnByte: 0,
      },
      {
        sourceIndex: 1, appearance: 389, challengeRating: 3,
        resRef: "nw_gnoll002", singleSpawnByte: 1,
      },
    ] };
    object.encounterProperties = { creatureList: [
      {
        entryKind: "retained",
        sourceIndex: 1,
        appearance: 389,
        challengeRating: 3,
        resRef: "nw_gnoll002",
        singleSpawn: false,
      },
      {
        entryKind: "effective_blueprint",
        sourceProfileId: "effective-catalog-utc-encounter-creature-list-v1",
        templateId: "cre_wolf_alpha",
        resRef: "nw_wolf001",
        appearance: 225,
        challengeRating: Math.fround(2.5),
        sourceObjectKey: "module/catalog/creatures/nw_wolf001.utc",
        sourceSizeBytes: 4096,
        sourceSha256: "a".repeat(64),
        singleSpawn: true,
      },
    ] };
    payload.editableScene.objects = [object];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toEqual([{
      kind: "encounter",
      sourceObjectId: "obj_enc_x2_gnoll001",
      sourceIndex: 0,
      creatureList: {
        expectedEntries: object.source.encounterCreatureList.expectedEntries,
        entries: object.encounterProperties.creatureList,
      },
    }]);
  });

  it("projects one exact structural Encounter SpawnPointList vector CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter") as
      Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.encounterSpawnPoints = { expectedEntries: [
      { sourceIndex: 0, nativeX: 22.5, nativeY: 45.25, nativeZ: 0, orientation: 1.5 },
      { sourceIndex: 1, nativeX: -3.75, nativeY: 9.5, nativeZ: 0.125, orientation: -2.25 },
    ] };
    object.encounterProperties = { spawnPoints: [
      { nativeX: -3.75, nativeY: 9.5, nativeZ: 0.125, orientation: -2.25 },
      { nativeX: 1, nativeY: 2, nativeZ: 3, orientation: 0 },
    ] };
    payload.editableScene.objects = [object];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toEqual([{
      kind: "encounter",
      sourceObjectId: "obj_enc_x2_gnoll001",
      sourceIndex: 0,
      spawnPoints: {
        expectedEntries: object.source.encounterSpawnPoints.expectedEntries,
        entries: object.encounterProperties.spawnPoints,
      },
    }]);
  });

  it("fails closed on malformed Encounter SpawnPointList targets", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter") as
      Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.encounterSpawnPoints = { expectedEntries: [] };
    object.encounterProperties = { spawnPoints: [
      { nativeX: 0.1, nativeY: 0, nativeZ: 0, orientation: 0 },
    ] };
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(AreaUpdateDraftProjectionError);
  });

  it("projects an exact retained Encounter Active-only CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter");
    payload.editableScene.objects = [{
      ...object,
      encounterActive: { activeByte: 1 },
      source: {
        ...object.source,
        sourceIndex: 0,
        encounterActiveStorage: { activeByte: 0 },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "encounter",
      sourceObjectId: "obj_enc_x2_gnoll001",
      sourceIndex: 0,
      active: {
        expectedValue: { activeByte: 0 },
        value: { activeByte: 1 },
      },
    }]);
  });

  it.each([
    ["missing provenance", undefined, { activeByte: 0 }, ".source.encounterActiveStorage"],
    ["noncanonical provenance", { activeByte: 2 }, { activeByte: 0 }, ".source.encounterActiveStorage"],
    ["boolean target alias", { activeByte: 1 }, true, ".encounterActive"],
  ])("rejects Encounter Active with %s", (_label, provenance, target, pathSuffix) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter");
    payload.editableScene.objects = [{
      ...object,
      encounterActive: target,
      source: {
        ...object.source,
        sourceIndex: 0,
        ...(provenance === undefined ? {} : { encounterActiveStorage: provenance }),
      },
    }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("projects an exact retained Encounter PlayerOnly-only CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter");
    payload.editableScene.objects = [{
      ...object,
      encounterPlayerOnly: { playerOnlyByte: 1 },
      source: {
        ...object.source,
        sourceIndex: 0,
        encounterPlayerOnlyStorage: { playerOnlyByte: 0 },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "encounter",
      sourceObjectId: "obj_enc_x2_gnoll001",
      sourceIndex: 0,
      playerOnly: {
        expectedValue: { playerOnlyByte: 0 },
        value: { playerOnlyByte: 1 },
      },
    }]);
  });

  it.each([
    ["missing provenance", undefined, { playerOnlyByte: 0 },
      ".source.encounterPlayerOnlyStorage"],
    ["noncanonical provenance", { playerOnlyByte: 2 }, { playerOnlyByte: 0 },
      ".source.encounterPlayerOnlyStorage"],
    ["boolean target alias", { playerOnlyByte: 1 }, true, ".encounterPlayerOnly"],
  ])("rejects Encounter PlayerOnly with %s", (_label, provenance, target, pathSuffix) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter");
    payload.editableScene.objects = [{
      ...object,
      encounterPlayerOnly: target,
      source: {
        ...object.source,
        sourceIndex: 0,
        ...(provenance === undefined
          ? {}
          : { encounterPlayerOnlyStorage: provenance }),
      },
    }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("projects an exact retained Encounter Reset-only CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter");
    payload.editableScene.objects = [{
      ...object,
      encounterReset: { resetByte: 1 },
      source: {
        ...object.source,
        sourceIndex: 0,
        encounterResetStorage: { resetByte: 0 },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "encounter",
      sourceObjectId: "obj_enc_x2_gnoll001",
      sourceIndex: 0,
      reset: {
        expectedValue: { resetByte: 0 },
        value: { resetByte: 1 },
      },
    }]);
  });

  it.each([
    ["missing provenance", undefined, { resetByte: 0 },
      ".source.encounterResetStorage"],
    ["noncanonical provenance", { resetByte: 2 }, { resetByte: 0 },
      ".source.encounterResetStorage"],
    ["boolean target alias", { resetByte: 1 }, true, ".encounterReset"],
  ])("rejects Encounter Reset with %s", (_label, provenance, target, pathSuffix) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter");
    payload.editableScene.objects = [{
      ...object,
      encounterReset: target,
      source: {
        ...object.source,
        sourceIndex: 0,
        ...(provenance === undefined ? {} : { encounterResetStorage: provenance }),
      },
    }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("projects an exact retained Encounter ResetTime-only CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter");
    payload.editableScene.objects = [{
      ...object,
      encounterResetTime: { resetTime: 90 },
      source: {
        ...object.source,
        sourceIndex: 0,
        encounterResetTimeStorage: { resetTime: 60 },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "encounter",
      sourceObjectId: "obj_enc_x2_gnoll001",
      sourceIndex: 0,
      resetTime: {
        expectedValue: { resetTime: 60 },
        value: { resetTime: 90 },
      },
    }]);
  });

  it.each([
    ["missing provenance", undefined, { resetTime: 90 },
      ".source.encounterResetTimeStorage"],
    ["out-of-range provenance", { resetTime: 0 }, { resetTime: 90 },
      ".source.encounterResetTimeStorage"],
    ["string target alias", { resetTime: 60 }, "90", ".encounterResetTime"],
    ["out-of-range target", { resetTime: 60 }, { resetTime: 32_001 },
      ".encounterResetTime"],
  ])("rejects Encounter ResetTime with %s", (
    _label,
    provenance,
    target,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter");
    payload.editableScene.objects = [{
      ...object,
      encounterResetTime: target,
      source: {
        ...object.source,
        sourceIndex: 0,
        ...(provenance === undefined
          ? {}
          : { encounterResetTimeStorage: provenance }),
      },
    }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("projects an exact retained Encounter SpawnOption-only CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter");
    payload.editableScene.objects = [{
      ...object,
      encounterSpawnOption: { spawnOption: 1 },
      source: {
        ...object.source,
        sourceIndex: 0,
        encounterSpawnOptionStorage: { spawnOption: 0 },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "encounter",
      sourceObjectId: "obj_enc_x2_gnoll001",
      sourceIndex: 0,
      spawnOption: {
        expectedValue: { spawnOption: 0 },
        value: { spawnOption: 1 },
      },
    }]);
  });

  it.each([
    ["missing provenance", undefined, { spawnOption: 1 },
      ".source.encounterSpawnOptionStorage"],
    ["out-of-range provenance", { spawnOption: 2 }, { spawnOption: 1 },
      ".source.encounterSpawnOptionStorage"],
    ["string target alias", { spawnOption: 0 }, "1", ".encounterSpawnOption"],
    ["out-of-range target", { spawnOption: 0 }, { spawnOption: 2 },
      ".encounterSpawnOption"],
  ])("rejects Encounter SpawnOption with %s", (
    _label,
    provenance,
    target,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter");
    payload.editableScene.objects = [{
      ...object,
      encounterSpawnOption: target,
      source: {
        ...object.source,
        sourceIndex: 0,
        ...(provenance === undefined
          ? {}
          : { encounterSpawnOptionStorage: provenance }),
      },
    }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("projects an exact retained Encounter Respawns-only CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter");
    payload.editableScene.objects = [{
      ...object,
      encounterRespawns: { respawns: -1 },
      source: {
        ...object.source,
        sourceIndex: 0,
        encounterRespawnsStorage: { respawns: 0 },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "encounter",
      sourceObjectId: "obj_enc_x2_gnoll001",
      sourceIndex: 0,
      respawns: {
        expectedValue: { respawns: 0 },
        value: { respawns: -1 },
      },
    }]);
  });

  it.each([
    ["missing provenance", undefined, { respawns: -1 },
      ".source.encounterRespawnsStorage"],
    ["below-sentinel provenance", { respawns: -2 }, { respawns: -1 },
      ".source.encounterRespawnsStorage"],
    ["string target alias", { respawns: 0 }, "-1", ".encounterRespawns"],
    ["above-range target", { respawns: 0 }, { respawns: 32_001 },
      ".encounterRespawns"],
  ])("rejects Encounter Respawns with %s", (
    _label,
    provenance,
    target,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("encounters", "obj_enc_x2_gnoll001", "encounter");
    payload.editableScene.objects = [{
      ...object,
      encounterRespawns: target,
      source: {
        ...object.source,
        sourceIndex: 0,
        ...(provenance === undefined
          ? {}
          : { encounterRespawnsStorage: provenance }),
      },
    }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("projects one exact changed retained ground-item TemplateResRef CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    payload.editableScene.objects = [{
      ...object,
      resRef: "custom_sword",
      source: {
        ...object.source,
        sourceIndex: 0,
        itemTemplateResRef: {
          present: true,
          nativeType: "resref",
          value: "nw_sword",
        },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "item",
      sourceObjectId: "obj_itm_sword",
      sourceIndex: 0,
      templateResRef: {
        expectedResRef: "nw_sword",
        resRef: "custom_sword",
      },
    }]);
    expect(Object.isFrozen(
      (result.objectEditing?.propertyMutations?.[0] as any).templateResRef,
    )).toBe(true);
  });

  it.each([
    ["malformed provenance", { present: true }, "custom_sword", ".source.itemTemplateResRef"],
    [
      "a noncanonical target",
      { present: true, nativeType: "resref", value: "nw_sword" },
      "CUSTOM_SWORD",
      ".resRef",
    ],
  ])("rejects retained ground-item TemplateResRef input with %s", (
    _label,
    itemTemplateResRef,
    resRef,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    payload.editableScene.objects = [{
      ...object,
      resRef,
      source: { ...object.source, sourceIndex: 0, itemTemplateResRef },
    }];

    let error: unknown;
    try {
      projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(AreaUpdateDraftProjectionError);
    expect(error).toEqual(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("keeps an absent retained ground-item TemplateResRef preserve-only", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    payload.editableScene.objects = [{
      ...object,
      resRef: "display_only",
      source: {
        ...object.source,
        sourceIndex: 0,
        itemTemplateResRef: { present: false },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toBeUndefined();
  });

  it("projects one changed exact ordered ground-item VarTable CAS pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    const expectedEntries = [
      { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
      { sourceIndex: 1, name: "Label", type: "string", value: "before" },
    ];
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        itemVariables: { expectedEntries },
      },
      itemProperties: { variables: [
        { name: "Label", type: "string", value: "after" },
        { name: "Counter", type: "int", value: 1 },
      ] },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "item",
      sourceObjectId: "obj_itm_sword",
      sourceIndex: 0,
      variables: {
        expectedEntries,
        entries: [
          { name: "Label", type: "string", value: "after" },
          { name: "Counter", type: "int", value: 1 },
        ],
      },
    }]);
  });

  it("does not project an unchanged ground-item VarTable", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        itemVariables: {
          expectedEntries: [{ sourceIndex: 0, name: "Counter", type: "int", value: 1 }],
        },
      },
      itemProperties: { variables: [{ name: "Counter", type: "int", value: 1 }] },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toBeUndefined();
  });

  it("projects one reordered retained ground-Item ItemList CAS pair", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    const expectedEntries = [
      { sourceIndex: 0, resRef: "nested_a", x: 1, y: 2 },
      { sourceIndex: 1, resRef: "nested_b", x: 3, y: 4 },
    ];
    const entries = [
      { sourceIndex: 1, resRef: "nested_b", x: 30, y: 40 },
      { sourceIndex: 0, resRef: "nested_a", x: 10, y: 20 },
    ];
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        itemInventoryItems: expectedEntries,
      },
      itemProperties: { inventoryItems: entries },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toEqual([{
      kind: "item",
      sourceObjectId: "obj_itm_sword",
      sourceIndex: 0,
      inventory: { expectedEntries, entries },
    }]);
  });

  it("projects one exact dynamic UTI addition to an absent retained ground-Item ItemList", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    const entry = {
      resRef: "nested_c",
      itemTemplateId: "itm_nested_c",
      itemResRef: "nested_c",
      itemSourceProfileId: "effective-catalog-uti-item-copy-v1",
      itemSourceObjectKey: "modules/current/items/nested_c.uti",
      itemSourceSizeBytes: 4096,
      itemSourceFingerprint: "a".repeat(64),
      itemTag: "NESTED_C",
      x: 5,
      y: 6,
    };
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, sourceIndex: 0, itemInventoryItems: [] },
      itemProperties: { inventoryItems: [entry] },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toEqual([{
      kind: "item",
      sourceObjectId: "obj_itm_sword",
      sourceIndex: 0,
      inventory: { expectedEntries: [], entries: [entry] },
    }]);
  });

  it("does not project an unchanged retained ground-Item ItemList", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    const itemInventoryItems = [
      { sourceIndex: 0, resRef: "nested_a", x: 1, y: 2 },
    ];
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, sourceIndex: 0, itemInventoryItems },
      itemProperties: { inventoryItems: itemInventoryItems },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toBeUndefined();
  });

  it.each([
    ["new entry", [{ resRef: "nested_b", x: 1, y: 2 }]],
    ["changed identity", [{ sourceIndex: 0, resRef: "nested_b", x: 1, y: 2 }]],
    ["mode flag", [{
      sourceIndex: 0,
      resRef: "nested_a",
      x: 1,
      y: 2,
      dropable: false,
    }]],
  ])("rejects retained ground-Item ItemList input with %s", (_label, inventoryItems) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        itemInventoryItems: [
          { sourceIndex: 0, resRef: "nested_a", x: 1, y: 2 },
        ],
      },
      itemProperties: { inventoryItems },
    }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(AreaUpdateDraftProjectionError);
  });

  it("projects one absent-to-present retained ground-Item visual-transform CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    const target = {
      present: true,
      value: {
        scaleX: Math.fround(0.5),
        scaleY: Math.fround(0.75),
        scaleZ: Math.fround(1.25),
        rotateX: Math.fround(-15),
        rotateY: Math.fround(30),
        rotateZ: Math.fround(90),
        translateX: Math.fround(20),
        translateY: Math.fround(-30),
        translateZ: Math.fround(40),
      },
    };
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        itemVisualTransform: { present: false },
      },
      itemProperties: { visualTransform: target },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toEqual([{
      kind: "item",
      sourceObjectId: "obj_itm_sword",
      sourceIndex: 0,
      visualTransform: {
        expectedValue: { present: false },
        value: target,
      },
    }]);
  });

  it("projects one present-to-absence retained ground-Item visual-transform CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    const source = {
      present: true,
      value: {
        scaleX: Math.fround(0.5),
        scaleY: Math.fround(0.75),
        scaleZ: Math.fround(1.25),
        rotateX: Math.fround(-15),
        rotateY: Math.fround(30),
        rotateZ: Math.fround(90),
        translateX: Math.fround(20),
        translateY: Math.fround(-30),
        translateZ: Math.fround(40),
      },
    };
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, sourceIndex: 0, itemVisualTransform: source },
      itemProperties: { visualTransform: { present: false } },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations?.[0]).toMatchObject({
      kind: "item",
      visualTransform: {
        expectedValue: source,
        value: { present: false },
      },
    });
  });

  it("does not project an unchanged retained ground-Item visual transform", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    const source = { present: false };
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, sourceIndex: 0, itemVisualTransform: source },
      itemProperties: { visualTransform: source },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toBeUndefined();
  });

  it("rejects an unsafe retained ground-Item visual-transform target", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        itemVisualTransform: { present: false },
      },
      itemProperties: {
        visualTransform: {
          present: true,
          value: {
            scaleX: 0.1,
            scaleY: 1,
            scaleZ: 1,
            rotateX: 0,
            rotateY: 0,
            rotateZ: 0,
            translateX: 0,
            translateY: 0,
            translateZ: 0,
          },
        },
      },
    }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(AreaUpdateDraftProjectionError);
  });

  it("projects one changed exact ground-item PropertiesList full-vector CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    const sourceEntry = {
      sourceIndex: 0,
      propertyName: 1,
      subtype: 0xffff,
      costTable: 2,
      costValue: 3,
      param1: 0xff,
      param1Value: 0,
      chanceAppear: 100,
    };
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        itemPropertyList: { present: true, expectedEntries: [sourceEntry] },
      },
      itemProperties: {
        propertyList: [
          { ...sourceEntry, sourceIndex: undefined, costValue: 9 },
          { propertyName: 48, subtype: 0, costTable: 24, costValue: 1,
            param1: 0xff, param1Value: 0, chanceAppear: 100 },
        ].map(({ sourceIndex: _, ...entry }) => entry),
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "item",
      sourceObjectId: "obj_itm_sword",
      sourceIndex: 0,
      propertyList: {
        expectedValue: { present: true, expectedEntries: [sourceEntry] },
        entries: [
          { propertyName: 1, subtype: 0xffff, costTable: 2, costValue: 9,
            param1: 0xff, param1Value: 0, chanceAppear: 100 },
          { propertyName: 48, subtype: 0, costTable: 24, costValue: 1,
            param1: 0xff, param1Value: 0, chanceAppear: 100 },
        ],
      },
    }]);
  });

  it("keeps an absent or unchanged ground-item PropertiesList preserve-only", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        itemPropertyList: { present: false, expectedEntries: [] },
      },
      itemProperties: { propertyList: [] },
    }];
    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toBeUndefined();
  });

  it("projects one complete catalog-bound ground-item BaseItem/appearance CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    const expectedValue = {
      baseItem: 24,
      modelType: 0,
      appearance: { modelPart1: 66 },
    };
    const targetValue = {
      baseItem: 49,
      modelType: 2,
      appearance: { modelPart1: 11, modelPart2: 13, modelPart3: 63 },
    };
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        itemBaseAppearance: {
          expectedValue,
          tableSha256: "c".repeat(64),
          tableRowCount: 128,
        },
      },
      itemProperties: { baseAppearance: targetValue },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "item",
      sourceObjectId: "obj_itm_sword",
      sourceIndex: 0,
      baseAppearance: {
        expectedValue,
        value: targetValue,
        tableSha256: "c".repeat(64),
        tableRowCount: 128,
      },
    }]);
  });

  it("does not project an unchanged ground-item BaseItem/appearance value", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    const expectedValue = {
      baseItem: 24,
      modelType: 0,
      appearance: { modelPart1: 66 },
    };
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        itemBaseAppearance: {
          expectedValue,
          tableSha256: "c".repeat(64),
          tableRowCount: 128,
        },
      },
      itemProperties: { baseAppearance: expectedValue },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toBeUndefined();
  });

  it("projects independently admitted changed ground-item localized-string CAS pairs in native order", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        itemLocalizedStrings: {
          localizedName: {
            present: true,
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, textBytesBase64: "U3dvcmQ=" }],
          },
          description: { present: true, strRef: 7, entries: [] },
          identifiedDescription: { present: true, strRef: 0xffff_ffff, entries: [] },
        },
      },
      itemProperties: {
        localizedName: " Sword 2 ",
        description: "display-only TLK text",
        identifiedDescription: "Known blade",
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "item",
      sourceObjectId: "obj_itm_sword",
      sourceIndex: 0,
      localizedStrings: [
        { field: "LocalizedName", expectedValue: "Sword", value: " Sword 2 " },
        { field: "DescIdentified", expectedValue: "", value: "Known blade" },
      ],
    }]);
    expect(Object.isFrozen(
      (result.objectEditing?.propertyMutations?.[0] as any).localizedStrings,
    )).toBe(true);
  });

  it("projects complete ordered ground-item localized-string list CAS entries", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        itemLocalizedStrings: {
          localizedName: {
            present: true,
            strRef: 0xffff_ffff,
            entries: [
              { languageId: 42, textBytesBase64: "TGVnYWN5" },
              { languageId: 0, textBytesBase64: "U3dvcmQ=" },
            ],
          },
          description: { present: true, strRef: 0xffff_ffff, entries: [] },
          identifiedDescription: {
            present: true,
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, textBytesBase64: "S25vd24=" }],
          },
        },
      },
      itemProperties: {
        localizedName: "Sword 2",
        localizedNameEntries: [
          { languageId: 0, text: "Sword 2" },
          { languageId: 2, text: "Epee" },
          { languageId: 42, text: "Legacy 2" },
        ],
        description: "",
        descriptionEntries: [],
        identifiedDescription: "Known",
        identifiedDescriptionEntries: [{ languageId: 0, text: "Known" }],
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "item",
      sourceObjectId: "obj_itm_sword",
      sourceIndex: 0,
      localizedStrings: [{
        field: "LocalizedName",
        expectedValue: "Sword",
        value: "Sword 2",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries: [
          { languageId: 42, text: "Legacy" },
          { languageId: 0, text: "Sword" },
        ],
        valueEntries: [
          { languageId: 0, text: "Sword 2" },
          { languageId: 2, text: "Epee" },
          { languageId: 42, text: "Legacy 2" },
        ],
      }],
    }]);
  });

  it("keeps unsupported ground-item localized-string members preserve-only", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        itemLocalizedStrings: {
          localizedName: { present: true, strRef: 12_416, entries: [] },
          description: { present: false },
          identifiedDescription: {
            present: true,
            strRef: 0xffff_ffff,
            entries: [{ languageId: 1, textBytesBase64: "S25vd24=" }],
          },
        },
      },
      itemProperties: {
        localizedName: "display name",
        description: "display description",
        identifiedDescription: "display identified description",
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toBeUndefined();
  });

  it("projects one complete exact retained ground-item instance-state CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    const sourceValues = {
      charges: 50,
      cost: 0,
      stolen: false,
      stackSize: 1,
      plot: false,
      addCost: 0,
      identified: false,
      cursed: false,
    };
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        itemInstanceState: { presentFields: [], values: sourceValues },
      },
      itemProperties: { ...sourceValues, charges: 12, stackSize: 3, identified: true },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing).toEqual(expect.objectContaining({
      propertyMutations: [{
        kind: "item",
        sourceObjectId: "obj_itm_sword",
        sourceIndex: 0,
        instanceState: {
          expectedValue: { presentFields: [], values: sourceValues },
          value: { ...sourceValues, charges: 12, stackSize: 3, identified: true },
        },
      }],
    }));
  });

  it("combines retained Item instance state and editor Comment into one mutation", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.provenance.sourceGicSha256 = "c".repeat(64);
    const object = sceneObject("items", "obj_itm_sword", "item");
    const sourceValues = {
      charges: 7, cost: 1, stolen: false, stackSize: 2,
      plot: false, addCost: 0, identified: true, cursed: false,
    };
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        itemEditorComment: " Ground item ",
        itemInstanceState: {
          presentFields: [
            "charges", "cost", "stolen", "stackSize", "plot", "addCost", "identified", "cursed",
          ],
          values: sourceValues,
        },
      },
      itemProperties: {
        ...sourceValues,
        charges: 9,
        comments: "Combined change",
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "item",
      sourceObjectId: "obj_itm_sword",
      sourceIndex: 0,
      instanceState: {
        expectedValue: expect.objectContaining({ values: sourceValues }),
        value: { ...sourceValues, charges: 9 },
      },
      editorComment: { expectedValue: " Ground item ", value: "Combined change" },
    }]);
  });

  it("does not materialize absent or unchanged Placeable editor-comment provenance", () => {
    for (const source of [{}, { placeableEditorComment: "" }]) {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("placeables", "obj_plc_chest", "placeable");
      payload.editableScene.objects = [{
        ...object,
        source: { ...object.source, ...source },
        placeableProperties: { comments: "" },
      }];

      const result = projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
      expect(result.objectEditing?.propertyMutations).toBeUndefined();
    }
  });

  it.each([
    ["another family", "creatures", "creature", "old", "new", true, ".source.placeableEditorComment"],
    ["a missing GIC digest", "placeables", "placeable", "old", "new", false, ".provenance.sourceGicSha256"],
    ["a non-string source", "placeables", "placeable", 12, "new", true, ".source.placeableEditorComment"],
    ["a non-string target", "placeables", "placeable", "old", 12, true, ".placeableProperties.comments"],
    ["an over-budget target", "placeables", "placeable", "old", "x".repeat(4097), true, ".placeableProperties.comments"],
    ["a NUL-containing target", "placeables", "placeable", "old", "bad\0comment", true, ".placeableProperties.comments"],
  ])("rejects Placeable editor-comment input from %s", (
    _label,
    sceneKind,
    sourceKind,
    sourceComment,
    targetComment,
    includeGicDigest,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    if (includeGicDigest) payload.provenance.sourceGicSha256 = "c".repeat(64);
    const object = sceneObject(sceneKind as any, "obj_comment_probe", sourceKind as any) as Record<string, any>;
    object.source = { ...object.source, placeableEditorComment: sourceComment };
    object.placeableProperties = { comments: targetComment };
    payload.editableScene.objects = [object];

    let error: unknown;
    try {
      projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(AreaUpdateDraftProjectionError);
    expect(error).toEqual(expect.objectContaining({
      path: `draft.payload${pathSuffix.startsWith(".provenance") ? pathSuffix : `.editableScene.objects.0${pathSuffix}`}`,
    }));
    if (!includeGicDigest) {
      expect(error).toEqual(expect.objectContaining({
        message: expect.stringContaining(
          "A changed Placeable editor comment requires the immutable source GIC digest.",
        ),
      }));
    }
  });

  it.each([
    ["provenance on another family", "creatures", "creature", 0, { initialState: 1 }, ".source.placeableAnimationState"],
    ["an out-of-set source", "placeables", "placeable", 3, { initialState: 1 }, ".source.placeableAnimationState"],
    ["a fractional source", "placeables", "placeable", 1.5, { initialState: 1 }, ".source.placeableAnimationState"],
    ["an out-of-set target", "placeables", "placeable", 0, { initialState: 3 }, ".placeableProperties.advancedSettings.initialState"],
    ["a boolean target", "placeables", "placeable", 0, { initialState: false }, ".placeableProperties.advancedSettings.initialState"],
    ["a missing target", "placeables", "placeable", 0, {}, ".placeableProperties.advancedSettings.initialState"],
  ])("rejects Placeable AnimationState input with %s", (
    _label,
    sceneKind,
    sourceKind,
    sourceState,
    advancedSettings,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject(sceneKind as any, "obj_animation_probe", sourceKind as any) as Record<string, any>;
    object.source = { ...object.source, placeableAnimationState: sourceState };
    object.placeableProperties = { advancedSettings };
    payload.editableScene.objects = [object];

    let error: unknown;
    try {
      projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(AreaUpdateDraftProjectionError);
    expect(error).toEqual(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("projects changed Placeable trap bytes in fixed native order", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        placeableTrapSettings: {
          disarmDc: 15,
          detectionDc: 0,
          oneShot: true,
          disarmable: true,
          detectable: true,
          isTrapped: false,
        },
      },
      placeableProperties: {
        trapSettings: {
          isTrapped: true,
          detectable: false,
          disarmable: false,
          oneShot: false,
          detectionDc: 24,
          disarmDc: 30,
        },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      trapFields: [
        { field: "TrapFlag", expectedValue: 0, value: 1 },
        { field: "TrapDetectable", expectedValue: 1, value: 0 },
        { field: "TrapDisarmable", expectedValue: 1, value: 0 },
        { field: "TrapOneShot", expectedValue: 1, value: 0 },
        { field: "TrapDetectDC", expectedValue: 0, value: 24 },
        { field: "DisarmDC", expectedValue: 15, value: 30 },
      ],
    }]);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0]?.trapFields)).toBe(true);
  });

  it("projects only present and changed Placeable trap byte provenance", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        placeableTrapSettings: { detectable: true, detectionDc: 0 },
      },
      placeableProperties: {
        trapSettings: {
          detectable: true,
          detectionDc: 12,
          trapType: "Preserve only",
          setDc: 99,
        },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      trapFields: [{ field: "TrapDetectDC", expectedValue: 0, value: 12 }],
    }]);
  });

  it("does not project unchanged Placeable trap bytes", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    const trapSettings = {
      isTrapped: false,
      detectable: true,
      disarmable: true,
      oneShot: true,
      detectionDc: 0,
      disarmDc: 15,
    };
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, placeableTrapSettings: { ...trapSettings } },
      placeableProperties: { trapSettings },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toBeUndefined();
  });

  it.each([
    [
      "provenance on another family",
      "creatures",
      "creature",
      { isTrapped: false },
      { isTrapped: true },
      ".source.placeableTrapSettings",
    ],
    [
      "a non-object provenance map",
      "placeables",
      "placeable",
      false,
      { isTrapped: true },
      ".source.placeableTrapSettings",
    ],
    [
      "excluded TrapType provenance",
      "placeables",
      "placeable",
      { trapType: 2 },
      { trapType: "Spike" },
      ".source.placeableTrapSettings.trapType",
    ],
    [
      "an excluded rogue modifier",
      "placeables",
      "placeable",
      { detectDcModWhenSetByRogue: 5 },
      { detectDcModWhenSetByRogue: 6 },
      ".source.placeableTrapSettings.detectDcModWhenSetByRogue",
    ],
    [
      "an invalid source flag",
      "placeables",
      "placeable",
      { detectable: 1 },
      { detectable: false },
      ".source.placeableTrapSettings.detectable",
    ],
    [
      "an invalid target flag",
      "placeables",
      "placeable",
      { oneShot: true },
      { oneShot: 0 },
      ".placeableProperties.trapSettings.oneShot",
    ],
    [
      "an invalid source DC",
      "placeables",
      "placeable",
      { detectionDc: 256 },
      { detectionDc: 12 },
      ".source.placeableTrapSettings.detectionDc",
    ],
    [
      "a missing target DC",
      "placeables",
      "placeable",
      { disarmDc: 15 },
      {},
      ".placeableProperties.trapSettings.disarmDc",
    ],
  ])("rejects Placeable trap byte input with %s", (
    _label,
    sceneKind,
    sourceKind,
    provenance,
    target,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject(sceneKind as any, "obj_trap_probe", sourceKind as any) as Record<string, any>;
    object.source = { ...object.source, placeableTrapSettings: provenance };
    object.placeableProperties = { trapSettings: target };
    payload.editableScene.objects = [object];

    let error: unknown;
    try {
      projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(AreaUpdateDraftProjectionError);
    expect(error).toEqual(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it.each([
    [
      "Conversation provenance on another family",
      "creatures",
      "creature",
      { placeableConversation: "" },
      { conversation: "dialog", noInterrupt: false },
      ".source.placeableConversation",
    ],
    [
      "Interruptable provenance on another family",
      "creatures",
      "creature",
      { placeableInterruptable: 1 },
      { conversation: "", noInterrupt: false },
      ".source.placeableInterruptable",
    ],
    [
      "an invalid source Conversation",
      "placeables",
      "placeable",
      { placeableConversation: "bad-dialog" },
      { conversation: "dialog", noInterrupt: false },
      ".source.placeableConversation",
    ],
    [
      "an invalid target Conversation",
      "placeables",
      "placeable",
      { placeableConversation: "" },
      { conversation: "bad-dialog", noInterrupt: false },
      ".placeableProperties.advancedSettings.conversation",
    ],
    [
      "a missing target Conversation",
      "placeables",
      "placeable",
      { placeableConversation: "" },
      { noInterrupt: false },
      ".placeableProperties.advancedSettings.conversation",
    ],
    [
      "an invalid source Interruptable byte",
      "placeables",
      "placeable",
      { placeableInterruptable: 2 },
      { conversation: "", noInterrupt: false },
      ".source.placeableInterruptable",
    ],
    [
      "an invalid target noInterrupt value",
      "placeables",
      "placeable",
      { placeableInterruptable: 1 },
      { conversation: "", noInterrupt: 0 },
      ".placeableProperties.advancedSettings.noInterrupt",
    ],
  ])("rejects Placeable Conversation/Interruptable input with %s", (
    _label,
    sceneKind,
    sourceKind,
    provenance,
    advancedSettings,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject(sceneKind as any, "obj_advanced_probe", sourceKind as any) as Record<string, any>;
    object.source = { ...object.source, ...provenance };
    object.placeableProperties = { advancedSettings };
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it.each([
    [
      "provenance on another family",
      "creatures",
      "creature",
      { hardness: 5 },
      { hardness: 6 },
      ".source.placeableDurabilitySaveBytes",
    ],
    [
      "a non-object provenance map",
      "placeables",
      "placeable",
      5,
      { hardness: 6 },
      ".source.placeableDurabilitySaveBytes",
    ],
    [
      "an unsupported source key",
      "placeables",
      "placeable",
      { hitPoints: 10 },
      { hitPoints: 12 },
      ".source.placeableDurabilitySaveBytes.hitPoints",
    ],
    [
      "an invalid source byte",
      "placeables",
      "placeable",
      { hardness: 256 },
      { hardness: 6 },
      ".source.placeableDurabilitySaveBytes.hardness",
    ],
    [
      "a missing target",
      "placeables",
      "placeable",
      { fortitudeSave: 16 },
      {},
      ".placeableProperties.fortitudeSave",
    ],
    [
      "an invalid target byte",
      "placeables",
      "placeable",
      { willSave: 0 },
      { willSave: 1.5 },
      ".placeableProperties.willSave",
    ],
  ])("rejects Placeable durability/save bytes with %s", (
    _label,
    sceneKind,
    sourceKind,
    provenance,
    target,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject(sceneKind as any, "obj_byte_probe", sourceKind as any) as Record<string, any>;
    object.source = { ...object.source, placeableDurabilitySaveBytes: provenance };
    object.placeableProperties = target;
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("projects a changed provenance-bound Placeable KeyName without normalizing it", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        placeableLockSettings: { keyTag: "" },
      },
      placeableProperties: {
        plot: false,
        useable: false,
        hasInventory: false,
        lockSettings: {
          locked: false,
          canRelock: false,
          autoRemoveKeyAfterUse: false,
          keyRequiredToUnlockOrLock: false,
          openLockDc: 18,
          closeLockDc: 0,
          keyTag: "K".repeat(32),
        },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      keyName: { expectedValue: "", value: "K".repeat(32) },
    }]);
  });

  it("does not project unchanged provenance-bound Placeable lock bytes", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    const lockSettings = {
      locked: false,
      canRelock: false,
      autoRemoveKeyAfterUse: false,
      keyRequiredToUnlockOrLock: false,
      openLockDc: 18,
      closeLockDc: 0,
      keyTag: "preserve_only",
    };
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        placeableLockSettings: { ...lockSettings },
      },
      placeableProperties: {
        plot: false,
        useable: false,
        hasInventory: false,
        lockSettings,
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    expect(result.objectEditing?.propertyMutations).toBeUndefined();
  });

  it("omits unchanged Placeable lock bytes from a different projected property mutation", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    const lockSettings = {
      locked: false,
      canRelock: false,
      autoRemoveKeyAfterUse: false,
      keyRequiredToUnlockOrLock: false,
      openLockDc: 18,
      closeLockDc: 0,
    };
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        placeableUseable: false,
        placeableLockSettings: { ...lockSettings },
      },
      placeableProperties: {
        plot: false,
        useable: true,
        hasInventory: false,
        lockSettings,
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });
    expect(result.objectEditing?.propertyMutations).toEqual([{
      sourceObjectId: "obj_plc_chest",
      kind: "placeable",
      expectedUseable: false,
      useable: true,
    }]);
    expect(result.objectEditing?.propertyMutations?.[0]).not.toHaveProperty("lockFields");
  });

  it.each([
    ["wrong family", { locked: false }, { locked: true }, "creatures", "creature", ".source.placeableLockSettings"],
    ["invalid source boolean", { locked: 0 }, { locked: true }, "placeables", "placeable", ".source.placeableLockSettings.locked"],
    ["invalid source DC", { openLockDc: 256 }, { openLockDc: 24 }, "placeables", "placeable", ".source.placeableLockSettings.openLockDc"],
    ["invalid target DC", { openLockDc: 18 }, { openLockDc: -1 }, "placeables", "placeable", ".placeableProperties.lockSettings.openLockDc"],
    ["invalid source KeyName", { keyTag: 7 }, { keyTag: "key" }, "placeables", "placeable", ".source.placeableLockSettings.keyTag"],
    ["over-limit source KeyName", { keyTag: "K".repeat(33) }, { keyTag: "key" }, "placeables", "placeable", ".source.placeableLockSettings.keyTag"],
    ["NUL source KeyName", { keyTag: "bad\0key" }, { keyTag: "key" }, "placeables", "placeable", ".source.placeableLockSettings.keyTag"],
    ["over-limit target KeyName", { keyTag: "" }, { keyTag: "K".repeat(33) }, "placeables", "placeable", ".placeableProperties.lockSettings.keyTag"],
    ["NUL target KeyName", { keyTag: "" }, { keyTag: "bad\0key" }, "placeables", "placeable", ".placeableProperties.lockSettings.keyTag"],
  ])("rejects %s for Placeable lock provenance", (
    _label,
    provenance,
    target,
    sceneKind,
    sourceKind,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject(sceneKind as any, "obj_lock_probe", sourceKind as any) as Record<string, any>;
    object.source = { ...object.source, placeableLockSettings: provenance };
    object.placeableProperties = {
      plot: false,
      useable: false,
      hasInventory: false,
      lockSettings: { keyTag: "", ...target },
    };
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("projects only changed provenance-bound placeable script ResRefs in frozen slot order", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        placeableScriptResRefs: {
          onOpen: "old_open",
          onClick: "",
          onLock: "same_lock",
        },
      },
      placeableProperties: {
        scriptSlots: {
          onClick: "new_click",
          onOpen: "new_open",
          onLock: "same_lock",
        },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      scripts: [
        { field: "OnClick", expectedResRef: "", resRef: "new_click" },
        { field: "OnOpen", expectedResRef: "old_open", resRef: "new_open" },
      ],
    }]);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0]?.scripts)).toBe(true);
  });

  it("does not project an unchanged provenance-bound placeable script ResRef", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, placeableScriptResRefs: { onOpen: "same_open" } },
      placeableProperties: { scriptSlots: { onOpen: "same_open" } },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toBeUndefined();
  });

  it("projects only changed provenance-bound placeable trap script ResRefs in frozen order", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        placeableTrapScriptResRefs: {
          onDisarmScript: "",
          onTrapTriggeredScript: "same_trap",
        },
      },
      placeableProperties: {
        trapSettings: {
          onDisarmScript: "new_disarm",
          onTrapTriggeredScript: "same_trap",
        },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      trapScripts: [
        { field: "OnDisarm", expectedResRef: "", resRef: "new_disarm" },
      ],
    }]);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0]?.trapScripts)).toBe(true);
  });

  it("does not project unchanged provenance-bound placeable trap script ResRefs", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        placeableTrapScriptResRefs: {
          onDisarmScript: "same_disarm",
          onTrapTriggeredScript: "same_trap",
        },
      },
      placeableProperties: {
        trapSettings: {
          onDisarmScript: "same_disarm",
          onTrapTriggeredScript: "same_trap",
        },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toBeUndefined();
  });

  it.each([
    ["another family", "creatures", "creature", { onDisarmScript: "" }, { onDisarmScript: "new_disarm" }, ".source.placeableTrapScriptResRefs"],
    ["a non-object provenance map", "placeables", "placeable", "invalid", { onDisarmScript: "new_disarm" }, ".source.placeableTrapScriptResRefs"],
    ["an unsupported source slot", "placeables", "placeable", { onOpen: "" }, { onOpen: "new_open" }, ".source.placeableTrapScriptResRefs.onOpen"],
    ["an invalid source ResRef", "placeables", "placeable", { onDisarmScript: "bad-script" }, { onDisarmScript: "new_disarm" }, ".source.placeableTrapScriptResRefs.onDisarmScript"],
    ["a missing target slot", "placeables", "placeable", { onDisarmScript: "" }, {}, ".placeableProperties.trapSettings.onDisarmScript"],
    ["an invalid target ResRef", "placeables", "placeable", { onDisarmScript: "" }, { onDisarmScript: "bad-script" }, ".placeableProperties.trapSettings.onDisarmScript"],
  ])("rejects placeable trap script provenance with %s", (
    _label,
    sceneKind,
    sourceKind,
    provenance,
    trapSettings,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject(sceneKind as any, "obj_probe", sourceKind as any) as Record<string, any>;
    object.source.placeableTrapScriptResRefs = provenance;
    object.placeableProperties = { trapSettings };
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it.each([
    ["another family", "creatures", "creature", { onOpen: "" }, { onOpen: "new_open" }, ".source.placeableScriptResRefs"],
    ["a non-object provenance map", "placeables", "placeable", "invalid", { onOpen: "new_open" }, ".source.placeableScriptResRefs"],
    ["an unsupported source slot", "placeables", "placeable", { onFailToOpen: "" }, { onFailToOpen: "new" }, ".source.placeableScriptResRefs.onFailToOpen"],
    ["an invalid source ResRef", "placeables", "placeable", { onOpen: "bad-script" }, { onOpen: "new_open" }, ".source.placeableScriptResRefs.onOpen"],
    ["a missing target slot", "placeables", "placeable", { onOpen: "" }, {}, ".placeableProperties.scriptSlots.onOpen"],
    ["an invalid target ResRef", "placeables", "placeable", { onOpen: "" }, { onOpen: "bad-script" }, ".placeableProperties.scriptSlots.onOpen"],
  ])("rejects placeable script provenance with %s", (
    _label,
    sceneKind,
    sourceKind,
    provenance,
    scriptSlots,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject(sceneKind as any, "obj_probe", sourceKind as any) as Record<string, any>;
    object.source.placeableScriptResRefs = provenance;
    object.placeableProperties = { scriptSlots };
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("does not project unchanged provenance-bound Placeable boolean bytes", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      isStatic: true,
      source: {
        ...object.source,
        placeableStatic: true,
        placeableUseable: false,
        placeablePlot: false,
        placeableHasInventory: false,
      },
      placeableProperties: { useable: false, plot: false, hasInventory: false },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toBeUndefined();
  });

  it("projects an exact retained Placeable inventory replacement with reorder, removal, coordinate edit, and admitted UTI addition", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    const sourceEntries = [
      { sourceIndex: 0, resRef: "nw_it_mpotion001", x: 0, y: 0 },
      { sourceIndex: 1, resRef: "nw_sword", x: 1, y: 0 },
    ];
    const targetEntries = [
      { sourceIndex: 1, resRef: "nw_sword", x: 4, y: 5 },
      {
        resRef: "nw_cloth022",
        itemResRef: "nw_cloth022",
        itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
        itemSourceFingerprint: "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
        x: 6,
        y: 7,
      },
    ];
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, placeableInventoryItems: sourceEntries },
      placeableProperties: { inventoryItems: targetEntries },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      inventory: { expectedEntries: sourceEntries, entries: targetEntries },
    }]);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0]?.inventory)).toBe(true);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0]?.inventory?.entries)).toBe(true);
  });

  it("does not project an unchanged provenance-bound Placeable inventory list", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    const inventoryItems = [{ sourceIndex: 0, resRef: "nw_it_mpotion001", x: 2, y: 3 }];
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, placeableInventoryItems: inventoryItems },
      placeableProperties: { inventoryItems: inventoryItems.map((entry) => ({ ...entry })) },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toBeUndefined();
  });

  it("projects an exact retained Creature ItemList replacement with mode-0 flags", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    const sourceEntries = [{
      sourceIndex: 0,
      resRef: "nw_sword",
      x: 1,
      y: 0,
      dropable: false,
      pickpocketable: true,
    }];
    const targetEntries = [
      {
        ...sourceEntries[0],
        x: 4,
        dropable: true,
        pickpocketable: false,
      },
      {
        resRef: "nw_cloth022",
        itemResRef: "nw_cloth022",
        itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
        itemSourceFingerprint: "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
        x: 0,
        y: 0,
        dropable: false,
        pickpocketable: false,
      },
    ];
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureInventoryItems: sourceEntries,
      },
      creatureProperties: { inventoryItems: targetEntries },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      inventory: {
        expectedEntries: sourceEntries,
        entries: targetEntries,
      },
    }]);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0]?.inventory)).toBe(true);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0]?.inventory?.entries)).toBe(true);
  });

  it("does not project an unchanged provenance-bound Creature ItemList", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    const inventoryItems = [{
      sourceIndex: 0,
      resRef: "nw_sword",
      x: 1,
      y: 0,
      dropable: false,
      pickpocketable: false,
    }];
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureInventoryItems: inventoryItems,
      },
      creatureProperties: {
        inventoryItems: inventoryItems.map((entry) => ({ ...entry })),
      },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toBeUndefined();
  });

  it("projects an exact retained Creature Equip_ItemList flag change", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    const sourceEntries = [
      {
        sourceIndex: 0,
        resRef: "nw_helm001",
        slotMask: 1,
        dropable: false,
        pickpocketable: false,
      },
      {
        sourceIndex: 1,
        resRef: "nw_sword001",
        slotMask: 16,
        dropable: true,
        pickpocketable: false,
      },
    ];
    const targetEntries = [
      { ...sourceEntries[0], pickpocketable: true },
      { ...sourceEntries[1] },
    ];
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureEquippedItems: sourceEntries,
      },
      creatureProperties: { equippedItems: targetEntries },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      equipment: {
        expectedEntries: sourceEntries,
        entries: targetEntries,
      },
    }]);
  });

  it("projects one exact retained Creature Tag change without trimming", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      tag: "  NW_GUARD  ",
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureTag: { present: true, value: "NW_GUARD" },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      tag: { expectedValue: "NW_GUARD", value: "  NW_GUARD  " },
    }]);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0])).toBe(true);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0]?.tag)).toBe(true);
  });

  it("projects one exact retained Creature Conversation change without normalizing source bytes", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureConversation: { present: true, value: "Guard_Dialog" },
      },
      creatureProperties: { conversation: "guard_dialog" },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      conversation: { expectedResRef: "Guard_Dialog", resRef: "guard_dialog" },
    }]);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0])).toBe(true);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0]?.conversation)).toBe(true);
  });

  it("projects one exact retained Creature Interruptable change from inverse No Interrupt polarity", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureInterruptable: { present: true, value: 1 },
      },
      creatureProperties: { noInterrupt: true },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      interruptable: { expectedValue: 1, value: 0 },
    }]);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0])).toBe(true);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0]?.interruptable)).toBe(true);
  });

  it("projects an independently changed retained Creature advanced flag subset", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureAdvancedFlags: {
          disarmable: { present: true, value: 1 },
          plot: { present: true, value: 0 },
          immortal: { present: false },
          lootable: { present: true, value: 0 },
          noPermanentDeath: { present: true, value: 1 },
        },
      },
      creatureProperties: {
        advancedSettings: {
          disarmable: false,
          plot: true,
          immortal: true,
          leavesLootableCorpse: true,
          noPermanentDeath: true,
        },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      advancedFlags: {
        disarmable: { expectedValue: 1, value: 0 },
        plot: { expectedValue: 0, value: 1 },
        lootable: { expectedValue: 0, value: 1 },
      },
    }]);
    const advancedFlags = result.objectEditing?.propertyMutations?.[0]?.advancedFlags;
    expect(Object.isFrozen(advancedFlags)).toBe(true);
    expect(Object.values(advancedFlags ?? {}).every(Object.isFrozen)).toBe(true);
  });

  it("projects catalog-bound Creature BodyBag and canonical DecayTime with proven Lootable gating", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureAdvancedFlags: {
          disarmable: { present: false },
          plot: { present: false },
          immortal: { present: false },
          lootable: { present: true, value: 0 },
          noPermanentDeath: { present: false },
        },
        creatureBodyBag: {
          expectedValue: 0,
          tableSha256: "e".repeat(64),
          tableRowCount: 7,
        },
        creatureDecayTime: { expectedMilliseconds: 5000 },
      },
      creatureProperties: {
        advancedSettings: {
          leavesLootableCorpse: true,
          treasureModelRow: 3,
          corpseDecayTimeSeconds: 12,
        },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      advancedFlags: { lootable: { expectedValue: 0, value: 1 } },
      bodyBag: {
        expectedValue: 0,
        value: 3,
        tableSha256: "e".repeat(64),
        tableRowCount: 7,
      },
      decayTime: {
        expectedMilliseconds: 5000,
        valueMilliseconds: 12_000,
      },
    }]);
    const mutation = result.objectEditing?.propertyMutations?.[0] as any;
    expect(Object.isFrozen(mutation.bodyBag)).toBe(true);
    expect(Object.isFrozen(mutation.decayTime)).toBe(true);
  });

  it("projects only one exact digest-bound changed Creature FactionID pair", () => {
    const project = (source: unknown, factionId: unknown) => {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("creatures", "obj_cre_guard", "creature") as Record<string, any>;
      object.source.sourceIndex = 0;
      object.source.creatureFaction = source;
      object.creatureProperties = { advancedSettings: { factionId } };
      payload.editableScene.objects = [object];
      return projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    };
    const source = {
      expectedValue: 1,
      catalogSha256: "f".repeat(64),
      catalogFactionCount: 5,
    };
    expect(project(source, 4).objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      faction: { ...source, value: 4 },
    }]);
    expect(project(source, 1).objectEditing?.propertyMutations).toBeUndefined();
    for (const malformed of [{ ...source, extra: true }, { ...source, expectedValue: 5 }]) {
      expect(() => project(malformed, 4)).toThrow(AreaUpdateDraftProjectionError);
    }
    for (const target of [-1, 1.5, 5, "4"]) {
      expect(() => project(source, target)).toThrow(AreaUpdateDraftProjectionError);
    }
  });

  it("projects one exact changed Creature TemplateResRef without changing renderer ResRef", () => {
    const project = (source: unknown, blueprintResRef: unknown) => {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("creatures", "obj_cre_guard", "creature") as Record<string, any>;
      object.resRef = "renderer_cre_guard";
      object.source.sourceIndex = 0;
      object.source.creatureTemplateResRef = source;
      object.creatureProperties = { advancedSettings: { blueprintResRef } };
      payload.editableScene.objects = [object];
      return projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    };
    expect(project(
      { expectedResRef: "nw_dwarfmerc001" },
      "nw_dwarfmerc002",
    ).objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      templateResRef: {
        expectedResRef: "nw_dwarfmerc001",
        resRef: "nw_dwarfmerc002",
      },
    }]);
    expect(project(
      { expectedResRef: "nw_dwarfmerc001" },
      "nw_dwarfmerc001",
    ).objectEditing?.propertyMutations).toBeUndefined();
    expect(() => project(
      { expectedResRef: "nw_dwarfmerc001", extra: true },
      "nw_dwarfmerc002",
    )).toThrow(AreaUpdateDraftProjectionError);
    for (const target of ["", "NW_DWARFMERC002", "bad-resref", 2]) {
      expect(() => project(
        { expectedResRef: "nw_dwarfmerc001" },
        target,
      )).toThrow(AreaUpdateDraftProjectionError);
    }
  });

  it("projects independently changed Creature Subrace and Deity values", () => {
    const project = (source: unknown, advancedSettings: Record<string, unknown>) => {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("creatures", "obj_cre_guard", "creature") as Record<string, any>;
      object.source.sourceIndex = 0;
      object.source.creatureSpecialIdentityStrings = source;
      object.creatureProperties = { advancedSettings };
      payload.editableScene.objects = [object];
      return projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    };

    expect(project(
      {
        subrace: { expectedValue: "Moon Elf" },
        deity: { expectedValue: "" },
      },
      { subrace: "Sun Elf", deity: "Mystra" },
    ).objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      specialIdentityStrings: {
        subrace: { expectedValue: "Moon Elf", value: "Sun Elf" },
        deity: { expectedValue: "", value: "Mystra" },
      },
    }]);
    expect(project(
      { deity: { expectedValue: "Mystra" } },
      { subrace: "must be ignored", deity: "Selune" },
    ).objectEditing?.propertyMutations?.[0]).toMatchObject({
      specialIdentityStrings: {
        deity: { expectedValue: "Mystra", value: "Selune" },
      },
    });
    expect(project(
      { subrace: { expectedValue: "Moon Elf" } },
      { subrace: "Moon Elf" },
    ).objectEditing?.propertyMutations).toBeUndefined();
  });

  it.each([
    ["empty provenance", {}, { subrace: "Sun Elf" }],
    ["unknown provenance member", { subrace: { expectedValue: "Moon Elf" }, extra: true }, { subrace: "Sun Elf" }],
    ["malformed expected value", { subrace: { expectedValue: "Moon\nElf" } }, { subrace: "Sun Elf" }],
    ["malformed target value", { deity: { expectedValue: "Mystra" } }, { deity: "Selûne" }],
  ] as const)("rejects Creature Subrace/Deity %s", (_label, source, advancedSettings) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature") as Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.creatureSpecialIdentityStrings = source;
    object.creatureProperties = { advancedSettings };
    payload.editableScene.objects = [object];
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(AreaUpdateDraftProjectionError);
  });

  it("projects only changed retained Creature script ResRefs in canonical native order", () => {
    const project = (source: unknown, scriptSlots: Record<string, unknown>) => {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("creatures", "obj_cre_guard", "creature") as Record<string, any>;
      object.source.sourceIndex = 0;
      object.source.creatureScriptResRefs = source;
      object.creatureProperties = { scriptSlots };
      payload.editableScene.objects = [object];
      return projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      });
    };

    const result = project(
      {
        onHeartbeat: { expectedResRef: "NW_C2_DEFAULT1" },
        onSpawn: { expectedResRef: "nw_c2_default9" },
        onDeath: { expectedResRef: "nw_c2_default7" },
      },
      {
        onHeartbeat: "main",
        onSpawn: "spawn_probe",
        onDeath: "nw_c2_default7",
        onBlocked: "must_be_ignored",
      },
    );
    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      scripts: [
        {
          field: "ScriptHeartbeat",
          expectedResRef: "NW_C2_DEFAULT1",
          resRef: "main",
        },
        {
          field: "ScriptSpawn",
          expectedResRef: "nw_c2_default9",
          resRef: "spawn_probe",
        },
      ],
    }]);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0]?.scripts)).toBe(true);
    expect(project(
      { onSpawn: { expectedResRef: "nw_c2_default9" } },
      { onSpawn: "nw_c2_default9" },
    ).objectEditing?.propertyMutations).toBeUndefined();
  });

  it.each([
    ["empty provenance", {}, { onSpawn: "main" }],
    [
      "unknown provenance member",
      { onSpawn: { expectedResRef: "nw_c2_default9" }, extra: true },
      { onSpawn: "main" },
    ],
    [
      "malformed expected ResRef",
      { onSpawn: { expectedResRef: "bad-resref" } },
      { onSpawn: "main" },
    ],
    [
      "noncanonical target ResRef",
      { onSpawn: { expectedResRef: "nw_c2_default9" } },
      { onSpawn: "MAIN" },
    ],
  ] as const)("rejects Creature script ResRef %s", (_label, source, scriptSlots) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature") as Record<string, any>;
    object.source.sourceIndex = 0;
    object.source.creatureScriptResRefs = source;
    object.creatureProperties = { scriptSlots };
    payload.editableScene.objects = [object];
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(AreaUpdateDraftProjectionError);
  });

  it.each([
    [
      "missing Lootable provenance",
      (source: Record<string, any>) => {
        source.creatureAdvancedFlags.lootable = { present: false };
      },
      "draft.payload.editableScene.objects.0.source.creatureAdvancedFlags",
    ],
    [
      "a current false Lootable target",
      (_source: Record<string, any>, advanced: Record<string, any>) => {
        advanced.leavesLootableCorpse = false;
      },
      "draft.payload.editableScene.objects.0.creatureProperties.advancedSettings.leavesLootableCorpse",
    ],
    [
      "an unknown physical BodyBag row",
      (_source: Record<string, any>, advanced: Record<string, any>) => {
        advanced.treasureModelRow = 7;
      },
      "draft.payload.editableScene.objects.0.creatureProperties.advancedSettings.treasureModelRow",
    ],
    [
      "a fractional DecayTime target",
      (_source: Record<string, any>, advanced: Record<string, any>) => {
        advanced.corpseDecayTimeSeconds = 5.5;
      },
      "draft.payload.editableScene.objects.0.creatureProperties.advancedSettings.corpseDecayTimeSeconds",
    ],
    [
      "noncanonical retained DecayTime provenance",
      (source: Record<string, any>) => {
        source.creatureDecayTime = { expectedMilliseconds: 5001 };
      },
      "draft.payload.editableScene.objects.0.source.creatureDecayTime",
    ],
  ])("rejects Creature death-remains mutation with %s", (_label, mutate, path) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    const source: Record<string, any> = {
      ...object.source,
      sourceIndex: 0,
      creatureAdvancedFlags: {
        disarmable: { present: false },
        plot: { present: false },
        immortal: { present: false },
        lootable: { present: true, value: 1 },
        noPermanentDeath: { present: false },
      },
      creatureBodyBag: {
        expectedValue: 0,
        tableSha256: "e".repeat(64),
        tableRowCount: 7,
      },
      creatureDecayTime: { expectedMilliseconds: 5000 },
    };
    const advanced: Record<string, any> = {
      leavesLootableCorpse: true,
      treasureModelRow: 3,
      corpseDecayTimeSeconds: 12,
    };
    mutate(source, advanced);
    payload.editableScene.objects = [{
      ...object,
      source,
      creatureProperties: { advancedSettings: advanced },
    }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path }));
  });

  it("projects one exact digest-bound retained Creature Appearance_Type Word change", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureAppearance: {
          present: true,
          nativeType: "word",
          value: 249,
          table: {
            resourceName: "appearance.2da",
            sourceObjectKey: "runtime-source/vanilla/appearance.2da",
            sourceLayer: "vanilla",
            sha256: "a".repeat(64),
            sizeBytes: 4096,
            rowCount: 1000,
            rowIndex: 249,
          },
        },
      },
      creatureProperties: { appearanceType: 52 },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      appearance: {
        expectedValue: 249,
        value: 52,
        tableSha256: "a".repeat(64),
        rowCount: 1000,
      },
    }]);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0])).toBe(true);
    expect(Object.isFrozen((result.objectEditing?.propertyMutations?.[0] as any)?.appearance))
      .toBe(true);
  });

  it("projects one exact digest-bound retained Creature Gender Byte change", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureGender: {
          present: true,
          nativeType: "byte",
          value: 4,
          table: {
            resourceName: "gender.2da",
            sourceObjectKey: "runtime-source/vanilla/gender.2da",
            sourceLayer: "vanilla",
            sha256: "c".repeat(64),
            sizeBytes: 250,
            rowCount: 5,
            rowIndex: 4,
          },
        },
      },
      creatureProperties: { genderId: 0 },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      gender: {
        expectedValue: 4,
        value: 0,
        tableSha256: "c".repeat(64),
        rowCount: 5,
      },
    }]);
    expect(Object.isFrozen((result.objectEditing?.propertyMutations?.[0] as any)?.gender)).toBe(true);
  });

  it("keeps absent or unbound Creature Gender preserve-only", () => {
    for (const creatureGender of [
      { present: false },
      { present: true, nativeType: "byte", value: 4 },
    ]) {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("creatures", "obj_cre_guard", "creature");
      payload.editableScene.objects = [{
        ...object,
        source: { ...object.source, sourceIndex: 0, creatureGender },
        creatureProperties: { genderId: 0 },
      }];
      expect(projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      }).objectEditing?.propertyMutations).toBeUndefined();
    }
  });

  it("projects one exact ranges.2da-bound Creature PerceptionRange Byte change", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creaturePerceptionRange: {
          present: true,
          nativeType: "byte",
          value: 11,
          table: {
            resourceName: "ranges.2da",
            sourceObjectKey: "runtime-source/vanilla/ranges.2da",
            sourceLayer: "vanilla",
            sha256: "e".repeat(64),
            sizeBytes: 1220,
            rowCount: 12,
            rowIndex: 11,
          },
        },
      },
      creatureProperties: { advancedSettings: { perceptionRangeId: 9 } },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      perceptionRange: {
        expectedValue: 11,
        value: 9,
        tableSha256: "e".repeat(64),
        rowCount: 12,
      },
    }]);
    expect(Object.isFrozen(
      (result.objectEditing?.propertyMutations?.[0] as any)?.perceptionRange,
    )).toBe(true);
  });

  it("keeps absent or unbound Creature PerceptionRange preserve-only", () => {
    for (const creaturePerceptionRange of [
      { present: false },
      { present: true, nativeType: "byte", value: 11 },
    ]) {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("creatures", "obj_cre_guard", "creature");
      payload.editableScene.objects = [{
        ...object,
        source: { ...object.source, sourceIndex: 0, creaturePerceptionRange },
        creatureProperties: { advancedSettings: { perceptionRangeId: 9 } },
      }];
      expect(projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      }).objectEditing?.propertyMutations).toBeUndefined();
    }
  });

  it("projects one exact creaturespeed.2da-bound Creature WalkRate Int change", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureWalkRate: {
          present: true,
          nativeType: "int",
          value: 4,
          table: {
            resourceName: "creaturespeed.2da",
            sourceObjectKey: "runtime-source/vanilla/creaturespeed.2da",
            sourceLayer: "vanilla",
            sha256: "d".repeat(64),
            sizeBytes: 4_096,
            rowCount: 9,
            rowIndex: 4,
            twoDaName: "NORM",
          },
        },
      },
      creatureProperties: { advancedSettings: { walkRateId: 2 } },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      walkRate: {
        expectedValue: 4,
        value: 2,
        tableSha256: "d".repeat(64),
        rowCount: 9,
      },
    }]);
    expect(Object.isFrozen(
      (result.objectEditing?.propertyMutations?.[0] as any)?.walkRate,
    )).toBe(true);
  });

  it("keeps absent or unbound Creature WalkRate preserve-only", () => {
    for (const creatureWalkRate of [
      { present: false },
      { present: true, nativeType: "int", value: 4 },
    ]) {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("creatures", "obj_cre_guard", "creature");
      payload.editableScene.objects = [{
        ...object,
        source: { ...object.source, sourceIndex: 0, creatureWalkRate },
        creatureProperties: { advancedSettings: { walkRateId: 2 } },
      }];
      expect(projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      }).objectEditing?.propertyMutations).toBeUndefined();
    }
  });

  it("projects one exact soundset.2da-bound Creature SoundSetFile Word change", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
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
      },
      creatureProperties: { advancedSettings: { soundSetFile: 27 } },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      soundSetFile: {
        expectedValue: 0,
        value: 27,
        tableSha256: "a".repeat(64),
        rowCount: 5_100,
      },
    }]);
    expect(Object.isFrozen(
      (result.objectEditing?.propertyMutations?.[0] as any)?.soundSetFile,
    )).toBe(true);
  });

  it("keeps absent or unbound Creature SoundSetFile preserve-only", () => {
    for (const creatureSoundSetFile of [
      { present: false },
      { present: true, nativeType: "word", value: 0 },
    ]) {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("creatures", "obj_cre_guard", "creature");
      payload.editableScene.objects = [{
        ...object,
        source: { ...object.source, sourceIndex: 0, creatureSoundSetFile },
        creatureProperties: { advancedSettings: { soundSetFile: 27 } },
      }];
      expect(projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      }).objectEditing?.propertyMutations).toBeUndefined();
    }
  });

  it("projects one exact packages.2da- and ClassList-bound Creature StartingPackage Byte change", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
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
      },
      creatureProperties: { advancedSettings: { startingPackageId: 2 } },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      startingPackage: {
        expectedValue: 0,
        value: 2,
        expectedClassIds: [4],
        tableSha256: "c".repeat(64),
        rowCount: 132,
      },
    }]);
    expect(Object.isFrozen(
      (result.objectEditing?.propertyMutations?.[0] as any)?.startingPackage,
    )).toBe(true);
  });

  it("keeps absent, class-unbound, table-unbound, and legacy boolean StartingPackage preserve-only", () => {
    for (const creatureStartingPackage of [
      { present: false },
      { present: true, nativeType: "byte", value: 0 },
      { present: true, nativeType: "byte", value: 0, classIds: [4] },
    ]) {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      const object = sceneObject("creatures", "obj_cre_guard", "creature");
      payload.editableScene.objects = [{
        ...object,
        source: { ...object.source, sourceIndex: 0, creatureStartingPackage },
        creatureProperties: { advancedSettings: { startingPackage: true } },
      }];
      expect(projectAreaUpdateDraft(value, {
        areaResRef: "crypt01",
        draftId: "draft_01",
        draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      }).objectEditing?.propertyMutations).toBeUndefined();
    }
  });

  it("projects one complete physical skills.2da-bound Creature SkillList expansion", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureSkillList: {
          present: true,
          nativeType: "list",
          structTypeId: 0,
          rankNativeType: "byte",
          ranks: [4, 0],
          opaqueSiblingFieldCounts: [1, 0],
          table: {
            resourceName: "skills.2da",
            sourceObjectKey: "runtime-source/vanilla/nwn_base.key/skills.2da",
            sourceLayer: "vanilla",
            sha256: "c".repeat(64),
            sizeBytes: 12_345,
            rowCount: 3,
          },
        },
      },
      creatureProperties: {
        skills: [
          { skillId: 2, skill: "Concentration", rank: 2 },
          { skillId: 0, skill: "Animal Empathy", rank: 7 },
          { skillId: 1, skill: "Hidden", rank: 0 },
        ],
        skillListTruncationConfirmed: false,
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      skillList: {
        expectedRanks: [4, 0],
        ranks: [7, 0, 2],
        tableSha256: "c".repeat(64),
        rowCount: 3,
        resizeMode: "expand_zero_tail",
        confirmTruncation: false,
      },
    }]);
  });

  it("projects one exact catalog- and selector-bound Creature PortraitId Word change", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creaturePortrait: {
          present: true,
          nativeType: "word",
          value: 10,
          selectorContext: { genderValue: 0, raceValue: 4 },
          table: {
            resourceName: "portraits.2da",
            sourceObjectKey: "runtime-source/vanilla/portraits.2da",
            sourceLayer: "vanilla",
            sha256: "f".repeat(64),
            sizeBytes: 100_000,
            rowCount: 16_001,
            rowIndex: 10,
            baseResRef: "po_hm_guard",
          },
        },
      },
      creatureProperties: { portraitId: 11, portraitResRef: "po_em_guard" },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      portrait: {
        expectedValue: 10,
        value: 11,
        tableSha256: "f".repeat(64),
        rowCount: 16_001,
        genderExpectedValue: 0,
        raceExpectedValue: 4,
      },
    }]);
    expect(Object.isFrozen((result.objectEditing?.propertyMutations?.[0] as any)?.portrait))
      .toBe(true);
  });

  it("rejects simultaneous retained Creature Gender and PortraitId changes", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureGender: {
          present: true,
          nativeType: "byte",
          value: 0,
          table: {
            resourceName: "gender.2da",
            sourceObjectKey: "runtime-source/vanilla/gender.2da",
            sourceLayer: "vanilla",
            sha256: "c".repeat(64),
            sizeBytes: 250,
            rowCount: 5,
            rowIndex: 0,
          },
        },
        creaturePortrait: {
          present: true,
          nativeType: "word",
          value: 10,
          selectorContext: { genderValue: 0, raceValue: 4 },
          table: {
            resourceName: "portraits.2da",
            sourceObjectKey: "runtime-source/vanilla/portraits.2da",
            sourceLayer: "vanilla",
            sha256: "f".repeat(64),
            sizeBytes: 100_000,
            rowCount: 16_001,
            rowIndex: 10,
            baseResRef: "po_hm_guard",
          },
        },
      },
      creatureProperties: { genderId: 1, portraitId: 11 },
    }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(/cannot be changed together with Gender/u);
  });

  it("projects one exact retained Creature ChallengeRating Float change", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureChallengeRating: {
          present: true,
          nativeType: "float",
          value: 11.5,
        },
      },
      creatureProperties: { challengeRating: 0.1 },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      challengeRating: {
        expectedValue: 11.5,
        value: Math.fround(0.1),
      },
    }]);
    expect(
      Object.isFrozen((result.objectEditing?.propertyMutations?.[0] as any)?.challengeRating),
    ).toBe(true);
  });

  it.each([
    ["absent source", { present: false }, { challengeRating: 1 }],
    ["missing target", {
      present: true,
      nativeType: "float",
      value: 11.5,
    }, {}],
    ["unchanged after Float32 normalization", {
      present: true,
      nativeType: "float",
      value: Math.fround(0.1),
    }, { challengeRating: 0.1 }],
  ])("keeps Creature ChallengeRating preserve-only for %s", (
    _label,
    creatureChallengeRating,
    creatureProperties,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, sourceIndex: 0, creatureChallengeRating },
      creatureProperties,
    }];
    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toBeUndefined();
  });

  it("projects one exact retained Creature NaturalAC Byte change", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureNaturalArmorClass: {
          present: true,
          nativeType: "byte",
          value: 0,
        },
      },
      creatureProperties: {
        statistics: { naturalArmorClass: 2 },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      naturalArmorClass: { expectedValue: 0, value: 2 },
    }]);
    expect(Object.isFrozen(
      (result.objectEditing?.propertyMutations?.[0] as any)?.naturalArmorClass,
    )).toBe(true);
  });

  it.each([
    ["absent source", { present: false }, 2],
    ["unchanged target", { present: true, nativeType: "byte", value: 2 }, 2],
  ])("keeps Creature NaturalAC preserve-only for %s", (
    _label,
    creatureNaturalArmorClass,
    naturalArmorClass,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, sourceIndex: 0, creatureNaturalArmorClass },
      creatureProperties: { statistics: { naturalArmorClass } },
    }];
    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toBeUndefined();
  });

  it("projects only changed present Creature saving-throw bonuses", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureSavingThrowBonuses: {
          fortitude: { present: true, nativeType: "short", value: 3 },
          reflex: { present: true, nativeType: "short", value: 1 },
          will: { present: false },
        },
      },
      creatureProperties: {
        statistics: {
          fortitudeBonus: 4,
          reflexBonus: 1,
          willBonus: 9,
        },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      savingThrowBonuses: {
        fortitude: { expectedValue: 3, value: 4 },
      },
    }]);
    expect(Object.isFrozen(
      (result.objectEditing?.propertyMutations?.[0] as any)?.savingThrowBonuses,
    )).toBe(true);
  });

  it.each([
    ["all absent", {
      fortitude: { present: false },
      reflex: { present: false },
      will: { present: false },
    }, { fortitudeBonus: 4, reflexBonus: 5, willBonus: 6 }],
    ["unchanged", {
      fortitude: { present: true, nativeType: "short", value: 3 },
      reflex: { present: true, nativeType: "short", value: 1 },
      will: { present: true, nativeType: "short", value: 2 },
    }, { fortitudeBonus: 3, reflexBonus: 1, willBonus: 2 }],
  ])("keeps Creature saving-throw bonuses preserve-only for %s", (
    _label,
    creatureSavingThrowBonuses,
    statistics,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, sourceIndex: 0, creatureSavingThrowBonuses },
      creatureProperties: { statistics },
    }];
    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toBeUndefined();
  });

  it("projects one coupled Creature alignment mutation from exact retained provenance", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureAlignment: {
          goodEvil: { present: true, nativeType: "byte", value: 50 },
          lawfulChaotic: { present: true, nativeType: "byte", value: 50 },
        },
      },
      creatureProperties: { alignment: "Lawful Good" },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      alignment: {
        expectedGoodEvil: 50,
        expectedLawfulChaotic: 50,
        goodEvil: 100,
        lawfulChaotic: 100,
      },
    }]);
    expect(Object.isFrozen(
      (result.objectEditing?.propertyMutations?.[0] as any)?.alignment,
    )).toBe(true);
  });

  it.each([
    ["both absent", {
      goodEvil: { present: false },
      lawfulChaotic: { present: false },
    }, "Lawful Good"],
    ["partially present", {
      goodEvil: { present: true, nativeType: "byte", value: 50 },
      lawfulChaotic: { present: false },
    }, "Lawful Good"],
    ["unchanged", {
      goodEvil: { present: true, nativeType: "byte", value: 50 },
      lawfulChaotic: { present: true, nativeType: "byte", value: 50 },
    }, "True Neutral"],
  ])("keeps Creature alignment preserve-only for %s", (
    _label,
    creatureAlignment,
    alignment,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, sourceIndex: 0, creatureAlignment },
      creatureProperties: { alignment },
    }];
    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toBeUndefined();
  });

  it("rejects a non-canonical Creature alignment target when exact edit authority exists", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureAlignment: {
          goodEvil: { present: true, nativeType: "byte", value: 50 },
          lawfulChaotic: { present: true, nativeType: "byte", value: 50 },
        },
      },
      creatureProperties: { alignment: "neutral" },
    }];
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow("creatureProperties.alignment");
  });

  it("projects only changed present Creature base ability scores", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureAbilityScores: {
          strength: { present: true, nativeType: "byte", value: 15 },
          dexterity: { present: true, nativeType: "byte", value: 13 },
          constitution: { present: true, nativeType: "byte", value: 16 },
          intelligence: { present: false },
          wisdom: { present: true, nativeType: "byte", value: 12 },
          charisma: { present: true, nativeType: "byte", value: 8 },
        },
      },
      creatureProperties: {
        statistics: {
          abilityScores: {
            strength: 17,
            dexterity: 13,
            constitution: 16,
            intelligence: 18,
            wisdom: 12,
            charisma: 10,
          },
        },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      abilityScores: {
        strength: { expectedValue: 15, value: 17 },
        charisma: { expectedValue: 8, value: 10 },
      },
    }]);
    const mutation = (result.objectEditing?.propertyMutations?.[0] as any)?.abilityScores;
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(Object.values(mutation).every(Object.isFrozen)).toBe(true);
  });

  it("projects only changed present Creature appearance colors", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureAppearanceColors: {
          skin: { present: true, nativeType: "byte", value: 11 },
          hair: { present: true, nativeType: "byte", value: 22 },
          tattoo1: { present: false },
          tattoo2: { present: true, nativeType: "byte", value: 44 },
        },
      },
      creatureProperties: {
        appearanceSettings: {
          colors: { skin: "12", hair: "22", tattoo1: "99", tattoo2: "45" },
        },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      appearanceColors: {
        skin: { expectedValue: 11, value: 12 },
        tattoo2: { expectedValue: 44, value: 45 },
      },
    }]);
    const mutation = (result.objectEditing?.propertyMutations?.[0] as any)?.appearanceColors;
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(Object.values(mutation).every(Object.isFrozen)).toBe(true);
  });

  it("rejects non-canonical Creature appearance-color draft strings", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureAppearanceColors: {
          skin: { present: true, nativeType: "byte", value: 11 },
          hair: { present: false },
          tattoo1: { present: false },
          tattoo2: { present: false },
        },
      },
      creatureProperties: {
        appearanceSettings: {
          colors: { skin: "011", hair: "", tattoo1: "", tattoo2: "" },
        },
      },
    }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow("appearanceSettings.colors.skin");
  });

  it("projects only changed present Creature body parts across direct and source-only targets", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    const creatureBodyParts = Object.fromEntries(
      AREA_CREATURE_BODY_PART_FIELDS.map(({ key }) => [key, { present: false }]),
    ) as Record<string, any>;
    creatureBodyParts.rightFoot = {
      present: true,
      value: 12,
      legacyByte: { present: true, nativeType: "byte", value: 12 },
      wideWord: { present: false },
    };
    creatureBodyParts.torso = {
      present: true,
      value: 4096,
      legacyByte: { present: true, nativeType: "byte", value: 0 },
      wideWord: { present: true, nativeType: "word", value: 4096 },
    };
    creatureBodyParts.belt = {
      present: true,
      value: 44,
      legacyByte: { present: true, nativeType: "byte", value: 44 },
      wideWord: { present: true, nativeType: "word", value: 44 },
    };
    creatureBodyParts.rightShoulder = {
      present: true,
      value: 1023,
      legacyByte: { present: false },
      wideWord: { present: true, nativeType: "word", value: 1023 },
    };
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, sourceIndex: 0, creatureBodyParts },
      creatureProperties: {
        appearanceSettings: {
          rightFoot: "13",
          torso: "5000",
          leftFoot: "99",
          sourceOnlyParts: {
            belt: "45",
            robe: "999",
            rightShoulder: "1024",
            leftShoulder: "88",
          },
        },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      bodyParts: {
        rightFoot: { expectedValue: 12, value: 13 },
        torso: { expectedValue: 4096, value: 5000 },
        belt: { expectedValue: 44, value: 45 },
        rightShoulder: { expectedValue: 1023, value: 1024 },
      },
    }]);
    const mutation = (result.objectEditing?.propertyMutations?.[0] as any)?.bodyParts;
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(Object.values(mutation).every(Object.isFrozen)).toBe(true);
  });

  it("rejects a Creature byte-only body-part target above 255", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    const creatureBodyParts = Object.fromEntries(
      AREA_CREATURE_BODY_PART_FIELDS.map(({ key }) => [key, { present: false }]),
    ) as Record<string, any>;
    creatureBodyParts.rightFoot = {
      present: true,
      value: 12,
      legacyByte: { present: true, nativeType: "byte", value: 12 },
      wideWord: { present: false },
    };
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, sourceIndex: 0, creatureBodyParts },
      creatureProperties: { appearanceSettings: { rightFoot: "256" } },
    }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow("appearanceSettings.rightFoot");
  });

  it("projects only changed catalog-bound modern Creature appendages", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    const tableSha256 = "a".repeat(64);
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
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
                sha256: tableSha256,
                sizeBytes: 123,
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
      },
      creatureProperties: {
        appearanceSettings: { wings: "7", tail: "4" },
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      appendages: {
        wings: { expectedValue: 1, value: 7, tableSha256, rowCount: 8 },
      },
    }]);
    const mutation = (result.objectEditing?.propertyMutations?.[0] as any)?.appendages;
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(Object.isFrozen(mutation.wings)).toBe(true);
  });

  it("rejects an out-of-range Creature appendage table row", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
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
                sizeBytes: 123,
                rowCount: 8,
                rowIndex: 1,
              },
            },
            legacyByte: { present: false },
          },
          tail: { present: false },
        },
      },
      creatureProperties: { appearanceSettings: { wings: "8" } },
    }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow("appearanceSettings.wings");
  });

  it("projects Base HP as one derived three-Short mutation", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureHitPointState: exactCreatureHitPointState(),
      },
      creatureProperties: {
        statistics: {
          baseHitPoints: 12,
          abilityScores: { constitution: 14 },
        },
      },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      hitPoints: {
        expectedHitPoints: 10,
        expectedCurrentHitPoints: 7,
        expectedMaxHitPoints: 99,
        hitPoints: 12,
        currentHitPoints: 10,
        maxHitPoints: 27,
        expectedConstitution: 14,
        constitution: 14,
        race: 1,
        classLevels: [3, 2],
        featRow40Present: false,
        racialConstitutionAdjust: 2,
        racialTypesSha256: "a".repeat(64),
        racialTypesRowCount: 5,
      },
    }]);
  });

  it("projects a same-roster ClassLevel vector with its derived HP triplet", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
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
        creatureHitPointState: exactCreatureHitPointState(),
      },
      creatureProperties: {
        classEntries: [
          { classId: 4, className: "Fighter", level: 4 },
          { classId: 7, className: "Wizard", level: 3 },
        ],
        statistics: {
          baseHitPoints: 10,
          abilityScores: { constitution: 14 },
        },
      },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      classLevels: {
        expectedClassIds: [4, 7],
        expectedLevels: [3, 2],
        levels: [4, 3],
        opaqueSiblingFieldCounts: [2, 1],
      },
      hitPoints: {
        expectedHitPoints: 10,
        expectedCurrentHitPoints: 7,
        expectedMaxHitPoints: 99,
        hitPoints: 10,
        currentHitPoints: 4,
        maxHitPoints: 31,
        expectedConstitution: 14,
        constitution: 14,
        race: 1,
        classLevels: [3, 2],
        targetClassLevels: [4, 3],
        featRow40Present: false,
        racialConstitutionAdjust: 2,
        racialTypesSha256: "a".repeat(64),
        racialTypesRowCount: 5,
      },
    }]);
  });

  it("couples a retained Constitution edit to HP even inside one modifier bucket", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureAbilityScores: {
          strength: { present: false },
          dexterity: { present: false },
          constitution: { present: true, nativeType: "byte", value: 14 },
          intelligence: { present: false },
          wisdom: { present: false },
          charisma: { present: false },
        },
        creatureHitPointState: exactCreatureHitPointState(),
      },
      creatureProperties: {
        statistics: {
          baseHitPoints: 10,
          abilityScores: { constitution: 15 },
        },
      },
    }];

    const mutation = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations?.[0] as any;
    expect(mutation.abilityScores.constitution).toEqual({ expectedValue: 14, value: 15 });
    expect(mutation.hitPoints).toMatchObject({
      hitPoints: 10,
      currentHitPoints: 10,
      maxHitPoints: 25,
      expectedConstitution: 14,
      constitution: 15,
    });
  });

  it("rejects a retained Constitution edit without complete HP provenance", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureAbilityScores: {
          strength: { present: false },
          dexterity: { present: false },
          constitution: { present: true, nativeType: "byte", value: 14 },
          intelligence: { present: false },
          wisdom: { present: false },
          charisma: { present: false },
        },
      },
      creatureProperties: {
        statistics: { abilityScores: { constitution: 15 } },
      },
    }];
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow("hit-point provenance");
  });

  it("keeps Creature base ability scores preserve-only when no exact member is present", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    const absent = { present: false };
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureAbilityScores: {
          strength: absent,
          dexterity: absent,
          constitution: absent,
          intelligence: absent,
          wisdom: absent,
          charisma: absent,
        },
      },
      creatureProperties: {
        statistics: {
          abilityScores: {
            strength: 17,
            dexterity: 13,
            constitution: 16,
            intelligence: 18,
            wisdom: 12,
            charisma: 10,
          },
        },
      },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toBeUndefined();
  });

  it.each([
    ["absent source", { present: false }, { appearanceType: 52 }],
    ["unbound source", { present: true, nativeType: "word", value: 249 }, { appearanceType: 52 }],
    ["missing target", {
      present: true,
      nativeType: "word",
      value: 249,
      table: {
        resourceName: "appearance.2da",
        sourceObjectKey: "runtime-source/vanilla/appearance.2da",
        sourceLayer: "vanilla",
        sha256: "a".repeat(64),
        sizeBytes: 4096,
        rowCount: 1000,
        rowIndex: 249,
      },
    }, {}],
  ])("keeps Creature Appearance_Type preserve-only for %s", (
    _label,
    creatureAppearance,
    creatureProperties,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: { ...object.source, sourceIndex: 0, creatureAppearance },
      creatureProperties,
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toBeUndefined();
  });

  it.each([
    ["wrong family", "placeable", 0, {
      present: true,
      nativeType: "word",
      value: 249,
      table: {
        resourceName: "appearance.2da",
        sourceObjectKey: "runtime-source/vanilla/appearance.2da",
        sourceLayer: "vanilla",
        sha256: "a".repeat(64),
        sizeBytes: 4096,
        rowCount: 1000,
        rowIndex: 249,
      },
    }, 52, ".source.creatureAppearance"],
    ["malformed source", "creature", 0, {
      present: true,
      nativeType: "dword",
      value: 249,
    }, 52, ".source.creatureAppearance"],
    ["missing ordinal", "creature", undefined, {
      present: true,
      nativeType: "word",
      value: 249,
      table: {
        resourceName: "appearance.2da",
        sourceObjectKey: "runtime-source/vanilla/appearance.2da",
        sourceLayer: "vanilla",
        sha256: "a".repeat(64),
        sizeBytes: 4096,
        rowCount: 1000,
        rowIndex: 249,
      },
    }, 52, ".source.sourceIndex"],
    ["non-integer target", "creature", 0, {
      present: true,
      nativeType: "word",
      value: 249,
      table: {
        resourceName: "appearance.2da",
        sourceObjectKey: "runtime-source/vanilla/appearance.2da",
        sourceLayer: "vanilla",
        sha256: "a".repeat(64),
        sizeBytes: 4096,
        rowCount: 1000,
        rowIndex: 249,
      },
    }, 52.5, ".creatureProperties.appearanceType"],
    ["row outside table", "creature", 0, {
      present: true,
      nativeType: "word",
      value: 249,
      table: {
        resourceName: "appearance.2da",
        sourceObjectKey: "runtime-source/vanilla/appearance.2da",
        sourceLayer: "vanilla",
        sha256: "a".repeat(64),
        sizeBytes: 4096,
        rowCount: 300,
        rowIndex: 249,
      },
    }, 300, ".creatureProperties.appearanceType"],
  ] as const)("rejects Creature Appearance_Type projection with %s", (
    _label,
    sourceKind,
    sourceIndex,
    creatureAppearance,
    appearanceType,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject(
      sourceKind === "creature" ? "creatures" : "placeables",
      "obj_probe",
      sourceKind,
    ) as Record<string, any>;
    object.source.sourceIndex = sourceIndex;
    object.source.creatureAppearance = creatureAppearance;
    object.creatureProperties = { appearanceType };
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("projects Creature FirstName, LastName, and Description changes independently in native order", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
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
      },
      creatureProperties: {
        firstName: " Captain ",
        lastName: "Aribeth",
        description: "New description",
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      localizedStrings: [
        { field: "FirstName", expectedValue: "Guard", value: " Captain " },
        { field: "LastName", expectedValue: "", value: "Aribeth" },
        { field: "Description", expectedValue: "Old description", value: "New description" },
      ],
    }]);
    expect(Object.isFrozen(result.objectEditing?.propertyMutations?.[0]?.localizedStrings)).toBe(true);
  });

  it("projects complete ordered Creature localized-string lists with exact source CAS", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureLocalizedStrings: {
          firstName: {
            present: true,
            strRef: 0xffff_ffff,
            entries: [
              { languageId: 42, textBytesBase64: "TGVnYWN5" },
              { languageId: 0, textBytesBase64: "R3VhcmQ=" },
            ],
          },
          lastName: { present: true, strRef: 0xffff_ffff, entries: [] },
          description: {
            present: true,
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, textBytesBase64: "T2xk" }],
          },
        },
      },
      creatureProperties: {
        firstName: "Captain",
        firstNameEntries: [
          { languageId: 0, text: "Captain" },
          { languageId: 2, text: "Capitaine" },
          { languageId: 42, text: "Legacy 2" },
        ],
        lastName: "Aribeth",
        lastNameEntries: [{ languageId: 0, text: "Aribeth" }],
        description: "",
        descriptionEntries: [],
      },
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      localizedStrings: [
        {
          field: "FirstName",
          expectedValue: "Guard",
          value: "Captain",
          expectedProfile: "multi_entry_inline_ascii",
          expectedEntries: [
            { languageId: 42, text: "Legacy" },
            { languageId: 0, text: "Guard" },
          ],
          valueEntries: [
            { languageId: 0, text: "Captain" },
            { languageId: 2, text: "Capitaine" },
            { languageId: 42, text: "Legacy 2" },
          ],
        },
        {
          field: "LastName",
          expectedValue: "",
          value: "Aribeth",
          expectedProfile: "empty_inline_ascii",
          expectedEntries: [],
          valueEntries: [{ languageId: 0, text: "Aribeth" }],
        },
        {
          field: "Description",
          expectedValue: "Old",
          value: "",
          expectedProfile: "simple_inline_ascii",
          expectedEntries: [{ languageId: 0, text: "Old" }],
          valueEntries: [],
        },
      ],
    }]);
  });

  it("keeps TLK-backed Creature names preserve-only while projecting an admitted sibling", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_chicken", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureLocalizedStrings: {
          firstName: { present: true, strRef: 12_416, entries: [] },
          lastName: { present: true, strRef: 0xffff_ffff, entries: [] },
        },
      },
      creatureProperties: { firstName: "Chicken", lastName: "Hen" },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_chicken",
      sourceIndex: 0,
      localizedStrings: [{ field: "LastName", expectedValue: "", value: "Hen" }],
    }]);
  });

  it.each([
    ["wrong family", "placeable", 0, {
      firstName: { present: true, strRef: 0xffff_ffff, entries: [] },
      lastName: { present: true, strRef: 0xffff_ffff, entries: [] },
    }, ".source.creatureLocalizedStrings"],
    ["malformed source", "creature", 0, {
      firstName: { present: true, strRef: 0xffff_ffff, entries: [], extra: true },
      lastName: { present: true, strRef: 0xffff_ffff, entries: [] },
    }, ".source.creatureLocalizedStrings"],
    ["missing ordinal", "creature", undefined, {
      firstName: { present: true, strRef: 0xffff_ffff, entries: [] },
      lastName: { present: true, strRef: 0xffff_ffff, entries: [] },
    }, ".source.sourceIndex"],
  ] as const)("rejects Creature name projection with %s", (
    _label,
    sourceKind,
    sourceIndex,
    creatureLocalizedStrings,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject(
      sourceKind === "creature" ? "creatures" : "placeables",
      "obj_probe",
      sourceKind,
    ) as Record<string, any>;
    object.source.sourceIndex = sourceIndex;
    object.source.creatureLocalizedStrings = creatureLocalizedStrings;
    object.creatureProperties = { firstName: "Changed", lastName: "" };
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("omits unchanged or canonically absent Creature Tag provenance", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const unchanged = sceneObject("creatures", "obj_cre_guard", "creature");
    const absent = sceneObject("creatures", "obj_cre_chicken", "creature");
    payload.editableScene.objects = [{
      ...unchanged,
      source: {
        ...unchanged.source,
        sourceIndex: 0,
        creatureTag: { present: true, value: unchanged.tag },
      },
    }, {
      ...absent,
      tag: "display-only-fallback",
      source: {
        ...absent.source,
        sourceIndex: 1,
        creatureTag: { present: false },
      },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toBeUndefined();
  });

  it("omits unchanged or canonically absent Creature Conversation provenance", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const unchanged = sceneObject("creatures", "obj_cre_guard", "creature");
    const absent = sceneObject("creatures", "obj_cre_chicken", "creature");
    payload.editableScene.objects = [{
      ...unchanged,
      source: {
        ...unchanged.source,
        sourceIndex: 0,
        creatureConversation: { present: true, value: "guard_dialog" },
      },
      creatureProperties: { conversation: "guard_dialog" },
    }, {
      ...absent,
      source: {
        ...absent.source,
        sourceIndex: 1,
        creatureConversation: { present: false },
      },
      creatureProperties: { conversation: "display_only" },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toBeUndefined();
  });

  it("omits unchanged or canonically absent Creature Interruptable provenance", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const unchanged = sceneObject("creatures", "obj_cre_guard", "creature");
    const absent = sceneObject("creatures", "obj_cre_chicken", "creature");
    payload.editableScene.objects = [{
      ...unchanged,
      source: {
        ...unchanged.source,
        sourceIndex: 0,
        creatureInterruptable: { present: true, value: 1 },
      },
      creatureProperties: { noInterrupt: false },
    }, {
      ...absent,
      source: {
        ...absent.source,
        sourceIndex: 1,
        creatureInterruptable: { present: false },
      },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toBeUndefined();
  });

  it("omits unchanged and absent retained Creature advanced flags", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureAdvancedFlags: {
          disarmable: { present: true, value: 1 },
          plot: { present: false },
          immortal: { present: true, value: 0 },
          lootable: { present: false },
          noPermanentDeath: { present: true, value: 1 },
        },
      },
      creatureProperties: {
        advancedSettings: {
          disarmable: true,
          plot: true,
          immortal: false,
          leavesLootableCorpse: true,
          noPermanentDeath: true,
        },
      },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations).toBeUndefined();
  });

  it.each([
    ["wrong family", "placeable", { present: true, value: "NW_GUARD" }, "NW_NEW", ".source.creatureTag"],
    ["malformed source", "creature", { present: true, value: "x".repeat(33) }, "NW_NEW", ".source.creatureTag"],
    ["missing ordinal", "creature", { present: true, value: "NW_GUARD" }, "NW_NEW", ".source.sourceIndex"],
    ["invalid target", "creature", { present: true, value: "NW_GUARD" }, "x".repeat(33), ".tag"],
  ] as const)("rejects Creature Tag projection with %s", (
    label,
    sourceKind,
    creatureTag,
    targetTag,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const sceneKind = sourceKind === "creature" ? "creatures" : "placeables";
    const object = sceneObject(sceneKind, "obj_probe", sourceKind) as Record<string, any>;
    object.tag = targetTag;
    object.source.creatureTag = creatureTag;
    if (label !== "missing ordinal") object.source.sourceIndex = 0;
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it.each([
    ["wrong family", "placeable", { present: true, value: "guard_dialog" }, "new_dialog", ".source.creatureConversation"],
    ["malformed source", "creature", { present: true, value: "bad-dialog" }, "new_dialog", ".source.creatureConversation"],
    ["missing ordinal", "creature", { present: true, value: "guard_dialog" }, "new_dialog", ".source.sourceIndex"],
    ["noncanonical target", "creature", { present: true, value: "Guard_Dialog" }, "New_Dialog", ".creatureProperties.conversation"],
    ["over-budget target", "creature", { present: true, value: "guard_dialog" }, "a2345678901234567", ".creatureProperties.conversation"],
  ] as const)("rejects Creature Conversation projection with %s", (
    label,
    sourceKind,
    creatureConversation,
    targetConversation,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const sceneKind = sourceKind === "creature" ? "creatures" : "placeables";
    const object = sceneObject(sceneKind, "obj_probe", sourceKind) as Record<string, any>;
    object.source.creatureConversation = creatureConversation;
    if (label !== "missing ordinal") object.source.sourceIndex = 0;
    object.creatureProperties = { conversation: targetConversation };
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it.each([
    ["wrong family", "placeable", { present: true, value: 1 }, true, ".source.creatureInterruptable"],
    ["malformed source", "creature", { present: true, value: 2 }, true, ".source.creatureInterruptable"],
    ["missing ordinal", "creature", { present: true, value: 1 }, true, ".source.sourceIndex"],
    ["non-boolean target", "creature", { present: true, value: 1 }, 1, ".creatureProperties.noInterrupt"],
  ] as const)("rejects Creature Interruptable projection with %s", (
    label,
    sourceKind,
    creatureInterruptable,
    targetNoInterrupt,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const sceneKind = sourceKind === "creature" ? "creatures" : "placeables";
    const object = sceneObject(sceneKind, "obj_probe", sourceKind) as Record<string, any>;
    object.source.creatureInterruptable = creatureInterruptable;
    if (label !== "missing ordinal") object.source.sourceIndex = 0;
    object.creatureProperties = { noInterrupt: targetNoInterrupt };
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it.each([
    ["wrong family", "placeable", {
      disarmable: { present: true, value: 1 },
      plot: { present: false },
      immortal: { present: false },
      lootable: { present: false },
      noPermanentDeath: { present: false },
    }, true, ".source.creatureAdvancedFlags"],
    ["malformed source", "creature", {
      disarmable: { present: true, value: 2 },
      plot: { present: false },
      immortal: { present: false },
      lootable: { present: false },
      noPermanentDeath: { present: false },
    }, true, ".source.creatureAdvancedFlags"],
    ["missing ordinal", "creature", {
      disarmable: { present: true, value: 1 },
      plot: { present: false },
      immortal: { present: false },
      lootable: { present: false },
      noPermanentDeath: { present: false },
    }, false, ".source.sourceIndex"],
    ["non-boolean target", "creature", {
      disarmable: { present: true, value: 1 },
      plot: { present: false },
      immortal: { present: false },
      lootable: { present: false },
      noPermanentDeath: { present: false },
    }, true, ".creatureProperties.advancedSettings.disarmable"],
  ] as const)("rejects Creature advanced flag projection with %s", (
    label,
    sourceKind,
    creatureAdvancedFlags,
    targetDisarmable,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const sceneKind = sourceKind === "creature" ? "creatures" : "placeables";
    const object = sceneObject(sceneKind, "obj_probe", sourceKind) as Record<string, any>;
    object.source.creatureAdvancedFlags = creatureAdvancedFlags;
    if (label !== "missing ordinal") object.source.sourceIndex = 0;
    object.creatureProperties = {
      advancedSettings: {
        disarmable: label === "non-boolean target" ? 1 : targetDisarmable,
      },
    };
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it("projects Creature Tag, ItemList and Equip_ItemList changes as one atomic property mutation", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature");
    const inventoryEntries = [{
      sourceIndex: 0,
      resRef: "nw_potion001",
      x: 0,
      y: 0,
      dropable: false,
      pickpocketable: false,
    }];
    const equipmentEntries = [{
      sourceIndex: 0,
      resRef: "nw_helm001",
      slotMask: 1,
      dropable: false,
      pickpocketable: false,
    }];
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureTag: { present: true, value: "NW_GUARD" },
        creatureConversation: { present: true, value: "guard_dialog" },
        creatureInventoryItems: inventoryEntries,
        creatureEquippedItems: equipmentEntries,
      },
      tag: "NW_GUARD_RENAMED",
      creatureProperties: {
        conversation: "new_dialog",
        inventoryItems: [],
        equippedItems: [{ ...equipmentEntries[0], dropable: true }],
      },
    }];

    const [mutation] = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.propertyMutations ?? [];

    expect(mutation).toMatchObject({
      kind: "creature",
      tag: { expectedValue: "NW_GUARD", value: "NW_GUARD_RENAMED" },
      conversation: { expectedResRef: "guard_dialog", resRef: "new_dialog" },
      inventory: { expectedEntries: inventoryEntries, entries: [] },
      equipment: {
        expectedEntries: equipmentEntries,
        entries: [{ ...equipmentEntries[0], dropable: true }],
      },
    });
  });

  it("rejects a reordered retained Creature Equip_ItemList target", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature") as Record<string, any>;
    const equipmentEntries = [
      { sourceIndex: 0, resRef: "nw_sword001", slotMask: 16, dropable: false, pickpocketable: false },
      { sourceIndex: 1, resRef: "nw_helm001", slotMask: 1, dropable: false, pickpocketable: false },
    ];
    object.source.sourceIndex = 0;
    object.source.creatureEquippedItems = equipmentEntries;
    object.creatureProperties = { equippedItems: equipmentEntries };
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: "draft.payload.editableScene.objects.0.creatureProperties.equippedItems.1.slotMask",
    }));
  });

  it.each([
    [
      "Infinite",
      [{ sourceIndex: 0, resRef: "item", x: 0, y: 0, dropable: false, pickpocketable: false }],
      [{ sourceIndex: 0, resRef: "item", x: 0, y: 0, dropable: false, pickpocketable: false, infinite: false }],
      ".creatureProperties.inventoryItems.0.infinite",
    ],
    [
      "missing immutable ordinal",
      [],
      [{
        resRef: "nw_cloth022",
        itemResRef: "nw_cloth022",
        itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
        itemSourceFingerprint: "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
        x: 0,
        y: 0,
        dropable: false,
        pickpocketable: false,
      }],
      ".source.sourceIndex",
    ],
  ])("rejects Creature ItemList input with %s", (
    _label,
    sourceEntries,
    targetEntries,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("creatures", "obj_cre_guard", "creature") as Record<string, any>;
    object.source.creatureInventoryItems = sourceEntries;
    if (_label !== "missing immutable ordinal") object.source.sourceIndex = 0;
    object.creatureProperties = { inventoryItems: targetEntries };
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it.each([
    [
      "inventory provenance on another family",
      "creatures",
      "creature",
      [{ sourceIndex: 0, resRef: "nw_sword", x: 0, y: 0 }],
      [{ sourceIndex: 0, resRef: "nw_sword", x: 0, y: 0 }],
      ".source.placeableInventoryItems",
    ],
    [
      "an unsupported source flag",
      "placeables",
      "placeable",
      [{ sourceIndex: 0, resRef: "nw_sword", x: 0, y: 0, dropable: false }],
      [{ sourceIndex: 0, resRef: "nw_sword", x: 0, y: 0 }],
      ".source.placeableInventoryItems.0.dropable",
    ],
    [
      "an unsupported target flag",
      "placeables",
      "placeable",
      [{ sourceIndex: 0, resRef: "nw_sword", x: 0, y: 0 }],
      [{ sourceIndex: 0, resRef: "nw_sword", x: 0, y: 0, infinite: false }],
      ".placeableProperties.inventoryItems.0.infinite",
    ],
    [
      "a non-sequential source ordinal",
      "placeables",
      "placeable",
      [{ sourceIndex: 1, resRef: "nw_sword", x: 0, y: 0 }],
      [],
      ".source.placeableInventoryItems.0.sourceIndex",
    ],
    [
      "an out-of-range target coordinate",
      "placeables",
      "placeable",
      [{ sourceIndex: 0, resRef: "nw_sword", x: 0, y: 0 }],
      [{ sourceIndex: 0, resRef: "nw_sword", x: 65536, y: 0 }],
      ".placeableProperties.inventoryItems.0.x",
    ],
    [
      "a changed retained item identity",
      "placeables",
      "placeable",
      [{ sourceIndex: 0, resRef: "nw_sword", x: 0, y: 0 }],
      [{ sourceIndex: 0, resRef: "changed", x: 1, y: 0 }],
      ".placeableProperties.inventoryItems.0.resRef",
    ],
    [
      "a duplicate retained source ordinal",
      "placeables",
      "placeable",
      [{ sourceIndex: 0, resRef: "nw_sword", x: 0, y: 0 }],
      [
        { sourceIndex: 0, resRef: "nw_sword", x: 0, y: 0 },
        { sourceIndex: 0, resRef: "nw_sword", x: 1, y: 0 },
      ],
      ".placeableProperties.inventoryItems.1.sourceIndex",
    ],
    [
      "an unadmitted item blueprint fingerprint",
      "placeables",
      "placeable",
      [],
      [{
        resRef: "nw_cloth022",
        itemResRef: "nw_cloth022",
        itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
        itemSourceFingerprint: "0".repeat(64),
        x: 0,
        y: 0,
      }],
      ".placeableProperties.inventoryItems.0.itemSourceFingerprint",
    ],
  ])("rejects Placeable ItemList input with %s", (
    _label,
    sceneKind,
    sourceKind,
    sourceEntries,
    targetEntries,
    pathSuffix,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject(sceneKind as any, "obj_probe", sourceKind as any) as Record<string, any>;
    object.source.placeableInventoryItems = sourceEntries;
    object.placeableProperties = { inventoryItems: targetEntries };
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it.each([
    ["Static", { placeableStatic: true }, false, { useable: false }, {
      expectedStatic: true,
      static: false,
    }],
    ["Useable", { placeableUseable: false }, true, { useable: true }, {
      expectedUseable: false,
      useable: true,
    }],
    ["Plot", { placeablePlot: false }, true, { plot: true }, {
      expectedPlot: false,
      plot: true,
    }],
    ["HasInventory", { placeableHasInventory: false }, true, { hasInventory: true }, {
      expectedHasInventory: false,
      hasInventory: true,
    }],
  ])("projects a changed %s pair when the other supported pairs are absent", (
    _label,
    provenance,
    isStatic,
    placeableProperties,
    expectedPair,
  ) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable");
    payload.editableScene.objects = [{
      ...object,
      isStatic,
      source: { ...object.source, ...provenance },
      placeableProperties,
    }];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.propertyMutations).toEqual([{
      kind: "placeable",
      sourceObjectId: "obj_plc_chest",
      ...expectedPair,
    }]);
  });

  it.each([
    ["Static on another family", "placeableStatic", true, "creatures", "creature", ".source.placeableStatic"],
    ["Useable on another family", "placeableUseable", false, "creatures", "creature", ".source.placeableUseable"],
    ["invalid source Static", "placeableStatic", "yes", "placeables", "placeable", ".source.placeableStatic"],
    ["invalid source Useable", "placeableUseable", 1, "placeables", "placeable", ".source.placeableUseable"],
    ["Plot on another family", "placeablePlot", false, "creatures", "creature", ".source.placeablePlot"],
    ["HasInventory on another family", "placeableHasInventory", false, "creatures", "creature", ".source.placeableHasInventory"],
    ["invalid source Plot", "placeablePlot", 0, "placeables", "placeable", ".source.placeablePlot"],
    ["invalid source HasInventory", "placeableHasInventory", "no", "placeables", "placeable", ".source.placeableHasInventory"],
  ])("rejects %s provenance", (_label, sourceField, sourceValue, sceneKind, sourceKind, pathSuffix) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject(sceneKind as any, "obj_probe", sourceKind as any) as Record<string, any>;
    object.source[sourceField] = sourceValue;
    object.isStatic = false;
    object.placeableProperties = { useable: true };
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it.each([
    ["missing Static target", { placeableStatic: true }, undefined, { useable: false }, ".isStatic"],
    ["invalid Static target", { placeableStatic: true }, "no", { useable: false }, ".isStatic"],
    ["missing Useable target", { placeableUseable: false }, true, {}, ".placeableProperties.useable"],
    ["invalid Useable target", { placeableUseable: false }, true, { useable: "yes" }, ".placeableProperties.useable"],
    ["missing Plot target", { placeablePlot: false }, true, {}, ".placeableProperties.plot"],
    ["invalid Plot target", { placeablePlot: false }, true, { plot: 1 }, ".placeableProperties.plot"],
    ["missing HasInventory target", { placeableHasInventory: false }, true, {}, ".placeableProperties.hasInventory"],
    ["invalid HasInventory target", { placeableHasInventory: false }, true, { hasInventory: "yes" }, ".placeableProperties.hasInventory"],
  ])("rejects %s", (_label, provenance, isStatic, placeableProperties, pathSuffix) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
    object.source = { ...object.source, ...provenance };
    if (isStatic === undefined) delete object.isStatic;
    else object.isStatic = isStatic;
    object.placeableProperties = placeableProperties;
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it.each([
    ["invalid source ResRef", "bad-script", "s04_plcprobe", ".source.placeableOnUsed"],
    ["invalid target ResRef", "", "bad-script", ".placeableProperties.scriptSlots.onUsed"],
    ["missing editable slot", "", undefined, ".placeableProperties.scriptSlots.onUsed"],
  ])("rejects a placeable OnUsed mutation with %s", (_label, sourceValue, targetValue, pathSuffix) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const object = sceneObject("placeables", "obj_plc_chest", "placeable") as Record<string, any>;
    object.source.placeableOnUsed = sourceValue;
    object.placeableProperties = targetValue === undefined
      ? { scriptSlots: {} }
      : { scriptSlots: { onUsed: targetValue } };
    payload.editableScene.objects = [object];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`
    }));
  });

  it("projects an explicitly provenance-bound base-UTW waypoint addition", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [blueprintWaypoint()];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing).toEqual({
      sourceGitSha256: "b".repeat(64),
      retainedObjects: [],
      newObjects: [{
        localObjectId: "wpt_001",
        sourceKind: "waypoint",
        sceneKind: "waypoints",
        sourceProfileId: "nwn-base-key-utw-v1",
        templateId: "nw_waypoint001",
        sourceSha256: "a".repeat(64),
        sourceFileType: "UTW ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
        resRef: "nw_waypoint001",
        tag: "NW_WAYPOINT001",
        x: 3.5,
        y: 4.75,
        z: 0.35,
        bearing: Math.PI / 2,
      }],
    });
    expect(Object.isFrozen(result.objectEditing?.newObjects)).toBe(true);
  });

  it("projects an explicitly provenance-bound base-UTS sound addition", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [blueprintSound()];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.newObjects).toEqual([{
      localObjectId: "sou_001",
      sourceKind: "sound",
      sceneKind: "sounds",
      sourceProfileId: "nwn-base-key-uts-animalcriesday-v1",
      templateId: "animalcriesday",
      sourceSha256: "a0d185c2813db9cd2649e104715e94c01511f83b97f3319a0ee3c31b8c3357b4",
      sourceFileType: "UTS ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      resRef: "animalcriesday",
      tag: "AnimalCriesDay",
      x: 3.75,
      y: 4.9,
      z: 0.15,
      bearing: 0,
    }]);
  });

  it("projects an explicitly provenance-bound base-UTP placeable addition", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [blueprintPlaceable()];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.newObjects).toEqual([{
      localObjectId: "pla_001",
      sourceKind: "placeable",
      sceneKind: "placeables",
      sourceProfileId: "nwn-base-key-utp-plc-watertrough-v1",
      templateId: "plc_watertrough",
      sourceSha256: "a1b00834837b3c516d823f63e00054b2331044bdbccca1d49f1bc121f854c531",
      sourceFileType: "UTP ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      resRef: "plc_watertrough",
      tag: "WaterTrough",
      x: 2.75,
      y: 5.125,
      z: 0.2,
      bearing: Math.PI / 3,
    }]);
  });

  it("projects an exact effective-catalog UTP placeable addition with repository-owned provenance", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [dynamicBlueprintPlaceable()];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.newObjects).toEqual([{
      localObjectId: "pla_dynamic",
      sourceKind: "placeable",
      sceneKind: "placeables",
      sourceProfileId: "effective-catalog-utp-placeable-copy-v1",
      templateId: "plc_plc_dynamic",
      sourceObjectKey: "modules/current/__aurora/sources/vanilla/templates/plc_dynamic.utp",
      sourceSha256: "c".repeat(64),
      sourceFileType: "UTP ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      resRef: "plc_dynamic",
      tag: "DYNAMIC_PLACEABLE",
      x: 7.25,
      y: 8.5,
      z: 0.4,
      bearing: Math.PI / 6,
    }]);
  });

  it.each([
    ["missing repository key", { source: { ...dynamicBlueprintPlaceable().source, sourceObjectKey: undefined } }],
    ["blank repository key", { source: { ...dynamicBlueprintPlaceable().source, sourceObjectKey: " " } }],
    ["NUL repository key", { source: { ...dynamicBlueprintPlaceable().source, sourceObjectKey: "templates/plc\0_dynamic.utp" } }],
    ["unexpected source property", { source: { ...dynamicBlueprintPlaceable().source, hostPath: "C:/private/plc_dynamic.utp" } }],
    ["wrong file type", { source: { ...dynamicBlueprintPlaceable().source, sourceFileType: "UTC " } }],
    ["wrong root struct", { source: { ...dynamicBlueprintPlaceable().source, sourceStructTypeId: 1 } }],
    ["mismatched object ResRef", { resRef: "plc_other" }],
    ["blank Tag", { tag: "" }],
    ["NUL Tag", { tag: "DYNAMIC\0_PLACEABLE" }],
  ])("rejects a dynamic placeable with %s", (_label, patch) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [{ ...dynamicBlueprintPlaceable(), ...patch }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(AreaUpdateDraftProjectionError);
  });

  it("projects an explicitly provenance-bound base-UTI ground-item addition", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [blueprintItem()];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.newObjects).toEqual([{
      localObjectId: "itm_001",
      sourceKind: "item",
      sceneKind: "items",
      sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
      templateId: "nw_cloth022",
      sourceSha256: "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
      sourceFileType: "UTI ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      resRef: "nw_cloth022",
      tag: "NW_CLOTH022",
      x: 1.5,
      y: 2.25,
      z: 0.1,
      bearing: Math.PI / 4,
    }]);
  });

  it("projects an exact effective-catalog UTI ground-item addition with repository-owned provenance", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [dynamicBlueprintItem()];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.newObjects).toEqual([{
      localObjectId: "itm_dynamic",
      sourceKind: "item",
      sceneKind: "items",
      sourceProfileId: "effective-catalog-uti-item-copy-v1",
      templateId: "itm_dynamic",
      sourceObjectKey: "modules/current/__aurora/sources/vanilla/templates/itm_dynamic.uti",
      sourceSizeBytes: 4_096,
      sourceSha256: "d".repeat(64),
      sourceFileType: "UTI ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      resRef: "itm_dynamic",
      tag: "DYNAMIC_ITEM",
      x: 6.25,
      y: 9.5,
      z: 0.3,
      bearing: Math.PI / 5,
    }]);
  });

  it.each([
    ["missing repository key", { source: { ...dynamicBlueprintItem().source, sourceObjectKey: undefined } }],
    ["blank repository key", { source: { ...dynamicBlueprintItem().source, sourceObjectKey: " " } }],
    ["NUL repository key", { source: { ...dynamicBlueprintItem().source, sourceObjectKey: "templates/itm\0_dynamic.uti" } }],
    ["missing source size", { source: { ...dynamicBlueprintItem().source, sourceSizeBytes: undefined } }],
    ["zero source size", { source: { ...dynamicBlueprintItem().source, sourceSizeBytes: 0 } }],
    ["oversized source", { source: { ...dynamicBlueprintItem().source, sourceSizeBytes: 1024 * 1024 + 1 } }],
    ["unexpected source property", { source: { ...dynamicBlueprintItem().source, hostPath: "C:/private/itm_dynamic.uti" } }],
    ["wrong file type", { source: { ...dynamicBlueprintItem().source, sourceFileType: "UTP " } }],
    ["wrong root struct", { source: { ...dynamicBlueprintItem().source, sourceStructTypeId: 1 } }],
    ["mismatched object ResRef", { resRef: "itm_other" }],
    ["blank Tag", { tag: "" }],
    ["NUL Tag", { tag: "DYNAMIC\0_ITEM" }],
  ])("rejects a dynamic item with %s", (_label, patch) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [{ ...dynamicBlueprintItem(), ...patch }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(AreaUpdateDraftProjectionError);
  });

  it("projects an explicitly provenance-bound base-UTC creature addition", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [blueprintCreature()];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.newObjects).toEqual([{
      localObjectId: "cre_001",
      sourceKind: "creature",
      sceneKind: "creatures",
      sourceProfileId: "nwn-base-key-utc-nw-chicken-v1",
      templateId: "nw_chicken",
      sourceSha256: "c1b0e194bb08b3e3d2946025c1e2f950b91e4cb844a32ba3b744c51a1d822a4a",
      sourceFileType: "UTC ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      resRef: "nw_chicken",
      tag: "NW_CHICKEN",
      x: 1.5,
      y: 2.25,
      z: 0.1,
      bearing: Math.PI / 4,
    }]);
  });

  it("projects an explicitly provenance-bound base-UTM store addition", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [blueprintStore()];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.newObjects).toEqual([{
      localObjectId: "sto_001",
      sourceKind: "store",
      sceneKind: "stores",
      sourceProfileId: "nwn-base-key-utm-x2-merc-dye-v1",
      templateId: "x2_merc_dye",
      sourceSha256: "99b3050edf8697dfd053dbb335c12273de79ae1a16eebb242c354e727ae166e2",
      sourceFileType: "UTM ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      resRef: "x2_merc_dye",
      tag: "x2_merc_dye",
      x: 4.291445541381836,
      y: 5.039402770996094,
      z: 0.00000005,
      bearing: Math.PI * 1.5,
    }]);
  });

  it("projects an exact effective-catalog UTM store addition with repository-owned provenance", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [dynamicBlueprintStore()];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.newObjects).toEqual([{
      localObjectId: "sto_dynamic",
      sourceKind: "store",
      sceneKind: "stores",
      sourceProfileId: "effective-catalog-utm-store-copy-v1",
      templateId: "str_dynamic",
      sourceObjectKey: "modules/current/__aurora/sources/vanilla/templates/str_dynamic.utm",
      sourceSizeBytes: 8_192,
      sourceSha256: "e".repeat(64),
      sourceFileType: "UTM ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      resRef: "str_dynamic",
      tag: "Dynamic_Store",
      x: 7.25,
      y: 8.5,
      z: 0.2,
      bearing: Math.PI / 6,
    }]);
  });

  it("projects an explicitly provenance-bound base-UTT trigger addition", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [blueprintTrigger()];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.newObjects).toEqual([{
      localObjectId: "tri_001",
      sourceKind: "trigger",
      sceneKind: "triggers",
      sourceProfileId: "nwn-base-key-utt-newgeneric-v1",
      templateId: "newgeneric",
      sourceSha256: "e855ae85a9b8511aca84ada06b9779126ff615f9bd816df4dbf39e1a1544001c",
      sourceFileType: "UTT ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      resRef: "newgeneric",
      tag: "GenericTrigger",
      x: 3.547599411010742,
      y: 4.491108703613281,
      z: 0,
      bearing: 0,
    }]);
  });

  it("projects an explicitly provenance-bound base-UTE encounter addition", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [blueprintEncounter()];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.newObjects).toEqual([{
      localObjectId: "enc_001",
      sourceKind: "encounter",
      sceneKind: "encounters",
      sourceProfileId: "nwn-base-key-ute-x2-gnoll001-v1",
      templateId: "x2_gnoll001",
      sourceSha256: "f3941f1eb580b55247f3ac226e8e0aa72841c3c81ba205c61319b8958a5daeed",
      sourceFileType: "UTE ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      resRef: "x2_gnoll001",
      tag: "X2_GNOLL001",
      x: 2.241201591491699,
      y: 4.51970329284668,
      z: 0,
      bearing: 0,
    }]);
  });

  it("projects an exact effective-catalog UTE encounter addition with repository provenance", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [dynamicBlueprintEncounter()];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.newObjects).toEqual([{
      localObjectId: "enc_dynamic",
      sourceKind: "encounter",
      sceneKind: "encounters",
      sourceProfileId: "effective-catalog-ute-encounter-copy-v1",
      templateId: "enc_enc_dynamic",
      sourceObjectKey: "modules/current/blueprints/encounters/enc_dynamic.ute",
      sourceSizeBytes: 4096,
      sourceSha256: "a".repeat(64),
      sourceFileType: "UTE ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      resRef: "enc_dynamic",
      tag: "Dynamic_Encounter",
      x: 3.25,
      y: 4.5,
      z: 0.125,
      bearing: 0,
    }]);
  });

  it("projects an exact effective-catalog UTW waypoint addition with repository provenance", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [dynamicBlueprintWaypoint()];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.newObjects).toEqual([{
      localObjectId: "wpt_dynamic",
      sourceKind: "waypoint",
      sceneKind: "waypoints",
      sourceProfileId: "effective-catalog-utw-waypoint-copy-v1",
      templateId: "wpt_wp_dynamic",
      sourceObjectKey: "modules/current/blueprints/waypoints/wp_dynamic.utw",
      sourceSizeBytes: 2048,
      sourceSha256: "c".repeat(64),
      sourceFileType: "UTW ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      resRef: "wp_dynamic",
      tag: "WP_DYNAMIC",
      x: 5.25,
      y: 6.5,
      z: 0.25,
      bearing: Math.PI / 3,
    }]);
  });

  it("projects an exact hook-bound door from the retained tin01 topology", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    const state = payload.editableScene.auroraAreaEditing.state;
    state.tilesetFingerprint = "e45bfba6f61442e7618b7477f0967943b6ff74a2c02593da6c031c641b3e6ac4";
    state.tiles[0] = { ...state.tiles[0], tileId: 121, orientation: 0, height: 0 };
    payload.editableScene.objects = [blueprintDoor()];

    const result = projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    });

    expect(result.objectEditing?.newObjects).toEqual([{
      localObjectId: "doo_001",
      sourceKind: "door",
      sceneKind: "doors",
      sourceProfileId: "nwn-base-key-utd-nw-door-ttr-04-tin01-121-0-v1",
      templateId: "nw_door_ttr_04",
      sourceSha256: "d7fc618b94e0b66c117d5e9d15dea3c0f34f5cc52810b50d146d7c73769406fa",
      sourceFileType: "UTD ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      resRef: "nw_door_ttr_04",
      tag: "Barn1Door",
      x: 0.5,
      y: 0.576,
      z: 0,
      bearing: Math.PI,
      doorHook: expect.objectContaining({ row: 0, col: 0, tileId: 121, hookIndex: 0 }),
    }]);
  });

  it.each([
    ["SET fingerprint", (value: any) => { value.draft.payload.editableScene.auroraAreaEditing.state.tilesetFingerprint = "f".repeat(64); }],
    ["tileset", (value: any) => { value.draft.payload.editableScene.auroraAreaEditing.state.tilesetResRef = "ttr01"; }],
    ["tile", (value: any) => { value.draft.payload.editableScene.auroraAreaEditing.state.tiles[0].tileId = 120; }],
    ["orientation", (value: any) => { value.draft.payload.editableScene.auroraAreaEditing.state.tiles[0].orientation = 1; }],
    ["height", (value: any) => { value.draft.payload.editableScene.auroraAreaEditing.state.tiles[0].height = 1; }],
    ["derived X", (value: any) => { value.draft.payload.editableScene.objects[0].x = 0.6; }],
    ["derived Y", (value: any) => { value.draft.payload.editableScene.objects[0].y = 0.7; }],
    ["derived Z", (value: any) => { value.draft.payload.editableScene.objects[0].z = 1; }],
    ["derived bearing", (value: any) => { value.draft.payload.editableScene.objects[0].bearing = 0; }],
    ["missing hook", (value: any) => { delete value.draft.payload.editableScene.objects[0].source.doorHook; }],
    ["unknown hook field", (value: any) => { value.draft.payload.editableScene.objects[0].source.doorHook.untrusted = true; }],
    ["negative row", (value: any) => { value.draft.payload.editableScene.objects[0].source.doorHook.row = -1; }],
    ["fractional row", (value: any) => { value.draft.payload.editableScene.objects[0].source.doorHook.row = 0.5; }],
    ["row beyond topology", (value: any) => { value.draft.payload.editableScene.objects[0].source.doorHook.row = 2; }],
    ["negative column", (value: any) => { value.draft.payload.editableScene.objects[0].source.doorHook.col = -1; }],
    ["fractional column", (value: any) => { value.draft.payload.editableScene.objects[0].source.doorHook.col = 0.5; }],
    ["column beyond topology", (value: any) => { value.draft.payload.editableScene.objects[0].source.doorHook.col = 2; }],
    ...Object.keys(blueprintDoor().source.doorHook)
      .filter((key) => key !== "row" && key !== "col")
      .map((key) => [`hook ${key}`, (value: any) => {
        value.draft.payload.editableScene.objects[0].source.doorHook[key] =
          key === "profileId" || key === "tilesetResRef" || key === "tilesetSha256" ? "wrong" : -999;
      }] as [string, (value: any) => void]),
  ] as Array<[string, (value: any) => void]>)("rejects a door with mismatched %s", (_label, mutate) => {
    const value = doorSnapshot();
    mutate(value);
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path: expect.stringContaining("editableScene") }));
  });

  it("projects a Door hook at the retained topology maximum row and column", () => {
    const value = doorSnapshot();
    const payload = value.draft.payload as Record<string, any>;
    const state = payload.editableScene.auroraAreaEditing.state;
    state.tiles[0] = tile(0, 0, 0);
    state.tiles[3] = { ...state.tiles[3], tileId: 121, orientation: 0, height: 0 };
    const door = payload.editableScene.objects[0];
    door.source.doorHook.row = 1;
    door.source.doorHook.col = 1;
    door.x = 1.5;
    door.y = 1.576;

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.newObjects).toEqual([
      expect.objectContaining({ x: 1.5, y: 1.576, doorHook: expect.objectContaining({ row: 1, col: 1 }) }),
    ]);
  });

  it("rejects a door hook occupied by a retained door or another addition", () => {
    for (const blocker of [
      {
        ...sceneObject("doors" as never, "obj_door", "door" as never),
        kind: "doors", resRef: "nw_door_ttr_04", tag: "Barn1Door",
        x: 0.5, y: 0.576, z: 0, bearing: Math.PI,
        source: { type: "aurora_git", areaId: "area_crypt01", sourceObjectId: "obj_door", sourceKind: "door" },
      },
      { ...blueprintDoor(), id: "doo_002" },
    ]) {
      const value = doorSnapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.editableScene.objects = [blocker, blueprintDoor()];
      expect(() => projectAreaUpdateDraft(value, {
        areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
        draftNormalizedSha256: DRAFT_HASH,
      })).toThrow("Door hook is already occupied");
    }
  });

  it.each([
    ["another family", { kind: "placeables", sourceKind: "placeable" }],
    ["different X", { x: 0.6 }],
    ["different Y", { y: 0.7 }],
    ["different Z", { z: 1 }],
  ])("does not report Door-hook occupancy for %s", (_label, patch) => {
    const value = doorSnapshot();
    const payload = value.draft.payload as Record<string, any>;
    const retained = {
      ...sceneObject("doors" as never, "obj_door", "door" as never),
      kind: "doors", resRef: "nw_door_ttr_04", tag: "Barn1Door",
      x: 0.5, y: 0.576, z: 0, bearing: Math.PI,
      source: { type: "aurora_git", areaId: "area_crypt01", sourceObjectId: "obj_door", sourceKind: "door" },
      ...patch,
    };
    if ("sourceKind" in patch) retained.source = { ...retained.source, sourceKind: patch.sourceKind };
    payload.editableScene.objects = [retained, blueprintDoor()];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01", draftId: "draft_01", draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    }).objectEditing?.newObjects).toHaveLength(1);
  });

  it.each([
    [blueprintEncounter(), "Encounter bearing must remain zero because UTE instances serialize no top-level orientation."],
    [blueprintTrigger(), "Trigger bearing must remain zero because the admitted UTT instance profile has zero orientation."],
    [blueprintSound(), "Sound bearing must remain zero because UTS instances serialize no orientation."],
  ])("reports the exact no-orientation diagnostic for %s", (object, message) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [{ ...object, bearing: 0.001 }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(message);
  });

  it.each([
    ["another scene family", { kind: "items" }],
    ["another source family", { source: { ...blueprintTrigger().source, sourceKind: "item" } }],
    ["another profile", { source: { ...blueprintTrigger().source, sourceProfileId: "custom-utt" } }],
    ["another template", { source: { ...blueprintTrigger().source, templateId: "newgeneric2" } }],
    ["another file type", { source: { ...blueprintTrigger().source, sourceFileType: "UTW " } }],
    ["another file version", { source: { ...blueprintTrigger().source, sourceFileVersion: "V3.1" } }],
    ["another root struct", { source: { ...blueprintTrigger().source, sourceStructTypeId: 0 } }],
    ["another scene ResRef", { resRef: "newgeneric2" }],
    ["an identity override", { tag: "OVERRIDE" }],
    ["an unexpected source property", { source: { ...blueprintTrigger().source, geometry: [] } }],
    ["a nonzero bearing", { bearing: 0.001 }],
  ])("rejects %s for the bounded trigger-construction profile", (_label, patch) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [{ ...blueprintTrigger(), ...patch }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path: expect.stringContaining("editableScene.objects") }));
  });

  it.each([
    ["another scene family", { kind: "items" }],
    ["another source family", { source: { ...blueprintStore().source, sourceKind: "item" } }],
    ["another profile", { source: { ...blueprintStore().source, sourceProfileId: "custom-utm" } }],
    ["another template", { source: { ...blueprintStore().source, templateId: "x2_merc_other" } }],
    ["another file type", { source: { ...blueprintStore().source, sourceFileType: "UTI " } }],
    ["another file version", { source: { ...blueprintStore().source, sourceFileVersion: "V3.1" } }],
    ["another root struct", { source: { ...blueprintStore().source, sourceStructTypeId: 0 } }],
    ["another scene ResRef", { resRef: "x2_merc_other" }],
    ["an identity override", { tag: "OVERRIDE" }],
    ["an unexpected source property", { source: { ...blueprintStore().source, hostPath: "C:/private.utm" } }],
    ["a non-finite transform", { bearing: Number.NaN }],
  ])("rejects %s for the bounded store-construction profile", (_label, patch) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [{ ...blueprintStore(), ...patch }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(AreaUpdateDraftProjectionError);
  });

  it.each([
    ["another scene family", { kind: "items" }],
    ["another source family", { source: { ...blueprintCreature().source, sourceKind: "item" } }],
    ["another profile", { source: { ...blueprintCreature().source, sourceProfileId: "custom-utc" } }],
    ["another template", { source: { ...blueprintCreature().source, templateId: "nw_chicken02" } }],
    ["another file type", { source: { ...blueprintCreature().source, sourceFileType: "UTI " } }],
    ["another file version", { source: { ...blueprintCreature().source, sourceFileVersion: "V3.1" } }],
    ["another root struct", { source: { ...blueprintCreature().source, sourceStructTypeId: 0 } }],
    ["another scene ResRef", { resRef: "nw_chicken02" }],
    ["an identity override", { tag: "OVERRIDE" }],
    ["an unexpected source property", { source: { ...blueprintCreature().source, hostPath: "C:/private.utc" } }],
    ["a non-finite transform", { bearing: Number.NaN }],
  ])("rejects %s for the bounded creature-construction profile", (_label, patch) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [{ ...blueprintCreature(), ...patch }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path: expect.stringContaining("editableScene.objects") }));
  });

  it.each([
    ["another scene family", { kind: "placeables" }],
    ["another source family", { source: { ...blueprintItem().source, sourceKind: "placeable" } }],
    ["another profile", { source: { ...blueprintItem().source, sourceProfileId: "custom-uti" } }],
    ["another template", { source: { ...blueprintItem().source, templateId: "nw_cloth021" } }],
    ["another file type", { source: { ...blueprintItem().source, sourceFileType: "UTP " } }],
    ["another file version", { source: { ...blueprintItem().source, sourceFileVersion: "V3.1" } }],
    ["another root struct", { source: { ...blueprintItem().source, sourceStructTypeId: 0 } }],
    ["another scene ResRef", { resRef: "nw_cloth021" }],
    ["an identity override", { tag: "OVERRIDE" }],
    ["an unexpected source property", { source: { ...blueprintItem().source, hostPath: "C:/private.uti" } }],
    ["a non-finite transform", { x: Number.NaN }],
  ])("rejects %s for the bounded ground-item construction profile", (_label, patch) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [{ ...blueprintItem(), ...patch }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path: expect.stringContaining("editableScene.objects") }));
  });

  it.each([
    ["another scene family", { kind: "waypoints" }],
    ["another source family", { source: { ...blueprintSound().source, sourceKind: "waypoint" } }],
    ["another profile", { source: { ...blueprintSound().source, sourceProfileId: "custom-uts" } }],
    ["another template", { resRef: "as_amb_forest" }],
    ["an identity override", { tag: "OVERRIDE" }],
    ["a nonzero bearing", { bearing: 0.001 }],
  ])("rejects %s for the bounded sound-construction profile", (_label, patch) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [{ ...blueprintSound(), ...patch }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path: expect.stringContaining("editableScene.objects") }));
  });

  it.each([
    ["another scene family", { kind: "items" }],
    ["another source family", { source: { ...blueprintWaypoint().source, sourceKind: "item" } }],
    ["another profile", { source: { ...blueprintWaypoint().source, sourceProfileId: "custom-utw" } }],
    ["another template", { resRef: "wp_generic" }],
    ["an identity override", { tag: "OVERRIDE" }],
    ["an unexpected source property", { source: { ...blueprintWaypoint().source, hostPath: "C:/private.utw" } }],
  ])("rejects %s for the bounded waypoint-construction profile", (_label, patch) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [{ ...blueprintWaypoint(), ...patch }];

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path: expect.stringContaining("editableScene.objects") }));
  });

  it("reports an unsupported blueprint source family before selecting a construction profile", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [{
      ...blueprintWaypoint(),
      source: { ...blueprintWaypoint().source, sourceKind: "module_door" },
    }];
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow("Unsupported Aurora blueprint object family.");
  });

  it.each([
    ["non-array object collection", {}],
    ["object budget overflow", Array.from({ length: 100_001 })],
  ])("rejects %s", (_label, objects) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = objects;
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path: "draft.payload.editableScene.objects" }));
  });

  it("admits the exact total scene-object budget before validating its first entry", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = Array.from({ length: 100_000 });
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path: "draft.payload.editableScene.objects.0" }));
  });

  it("shares the 1024-addition budget across admitted blueprint families", () => {
    const command = {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    };
    const build = (count: number) => {
      const value = snapshot();
      const payload = value.draft.payload as Record<string, any>;
      payload.provenance.sourceGitSha256 = "b".repeat(64);
      payload.editableScene.objects = Array.from({ length: count }, (_, index) => index === count - 1
        ? { ...blueprintSound(), id: `sou_${index}` }
        : { ...blueprintWaypoint(), id: `wpt_${index}` });
      return value;
    };

    expect(projectAreaUpdateDraft(build(1024), command).objectEditing?.newObjects).toHaveLength(1024);
    expect(() => projectAreaUpdateDraft(build(1025), command)).toThrow(expect.objectContaining({
      path: "draft.payload.editableScene.objects",
    }));
  });

  it("rejects duplicate new-object local identities", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [blueprintWaypoint(), blueprintWaypoint()];
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path: "draft.payload.editableScene.objects.1.id" }));
  });

  it.each([
    ["source type", { source: { ...blueprintWaypoint().source, type: "seed" } }, ".source.type"],
    ["file type", { source: { ...blueprintWaypoint().source, sourceFileType: "UTP " } }, ".source.sourceFileType"],
    ["file version", { source: { ...blueprintWaypoint().source, sourceFileVersion: "V3.1" } }, ".source.sourceFileVersion"],
    ["root type", { source: { ...blueprintWaypoint().source, sourceStructTypeId: 5 } }, ".source.sourceStructTypeId"],
    ["source digest", { source: { ...blueprintWaypoint().source, sourceEtag: "bad" } }, ".source.sourceEtag"],
    ["local identity", { id: "waypoint:1" }, ".id"],
    ["x", { x: Number.NaN }, ".x"],
    ["y", { y: Number.POSITIVE_INFINITY }, ".y"],
    ["z", { z: 1_000_001 }, ".z"],
    ["bearing", { bearing: -1_000_001 }, ".bearing"],
  ])("rejects an invalid waypoint %s boundary", (_label, patch, pathSuffix) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = [{ ...blueprintWaypoint(), ...patch }];
    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({
      path: `draft.payload.editableScene.objects.0${pathSuffix}`,
    }));
  });

  it.each([
    ["a newly constructed object", [sceneObject("items", "obj_itm_sword", "item"), { ...sceneObject("items", "new", "item"), source: { type: "seed" } }]],
    ["duplicate source provenance", [sceneObject("items", "obj_itm_sword", "item"), sceneObject("items", "obj_itm_sword", "item")]],
    ["cross-family provenance", [sceneObject("placeables", "obj_itm_sword", "item")]],
  ])("rejects %s in the existing-object deletion slice", (_label, objects) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.objects = objects;

    expect(() => projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: DRAFT_HASH,
    })).toThrow(expect.objectContaining({ path: expect.stringContaining("editableScene.objects") }));
  });
});

function exactCreatureHitPointState() {
  return {
    present: true,
    hitPoints: { nativeType: "short", value: 10 },
    currentHitPoints: { nativeType: "short", value: 7 },
    maxHitPoints: { nativeType: "short", value: 99 },
    constitution: { nativeType: "byte", value: 14 },
    race: { nativeType: "byte", value: 1 },
    classLevels: [3, 2],
    featRow40Present: false,
    racialTypes: {
      resourceName: "racialtypes.2da",
      sourceObjectKey: "module/racialtypes.2da",
      sourceLayer: "module",
      sha256: "a".repeat(64),
      sizeBytes: 100,
      rowCount: 5,
      rowIndex: 1,
      constitutionAdjust: 2,
    },
  };
}

function sceneObject(
  kind: "creatures" | "doors" | "items" | "placeables" | "triggers" |
    "encounters" | "waypoints",
  sourceObjectId: string,
  sourceKind: "creature" | "door" | "item" | "placeable" | "trigger" |
    "encounter" | "waypoint",
) {
  const token = sourceKind === "creature"
    ? "guard"
    : sourceKind === "door"
      ? "door"
      : sourceKind === "item"
        ? "sword"
        : sourceKind === "waypoint"
          ? "waypoint001"
          : sourceKind === "trigger"
            ? "generic"
            : sourceKind === "encounter"
              ? "encounter"
              : "chest";
  return {
    id: `area_crypt01:${sourceObjectId}`,
    kind,
    resRef: `nw_${token}`,
    tag: `NW_${token.toUpperCase()}`,
    x: 1,
    y: 2,
    z: 0,
    bearing: 0,
    source: {
      type: "aurora_git",
      areaId: "area_crypt01",
      sourceObjectId,
      sourceKind,
    },
  };
}

function polygon(points: ReadonlyArray<readonly [number, number, number]>) {
  return {
    coordinateSpace: "native_local" as const,
    points: points.map(([x, y, z]) => ({ x, y, z })),
  };
}

function blueprintWaypoint() {
  return {
    id: "wpt_001",
    kind: "waypoints",
    resRef: "nw_waypoint001",
    tag: "NW_WAYPOINT001",
    x: 3.5,
    y: 4.75,
    z: 0.35,
    bearing: Math.PI / 2,
    source: {
      type: "aurora_blueprint",
      sourceKind: "waypoint",
      sourceProfileId: "nwn-base-key-utw-v1",
      templateId: "nw_waypoint001",
      sourceEtag: "a".repeat(64),
      sourceFileType: "UTW ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function blueprintSound() {
  return {
    id: "sou_001",
    kind: "sounds",
    resRef: "animalcriesday",
    tag: "AnimalCriesDay",
    x: 3.75,
    y: 4.9,
    z: 0.15,
    bearing: 0,
    source: {
      type: "aurora_blueprint",
      sourceKind: "sound",
      sourceProfileId: "nwn-base-key-uts-animalcriesday-v1",
      templateId: "animalcriesday",
      sourceEtag: "a0d185c2813db9cd2649e104715e94c01511f83b97f3319a0ee3c31b8c3357b4",
      sourceFileType: "UTS ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function blueprintPlaceable() {
  return {
    id: "pla_001",
    kind: "placeables",
    resRef: "plc_watertrough",
    tag: "WaterTrough",
    x: 2.75,
    y: 5.125,
    z: 0.2,
    bearing: Math.PI / 3,
    source: {
      type: "aurora_blueprint",
      sourceKind: "placeable",
      sourceProfileId: "nwn-base-key-utp-plc-watertrough-v1",
      templateId: "plc_watertrough",
      sourceEtag: "a1b00834837b3c516d823f63e00054b2331044bdbccca1d49f1bc121f854c531",
      sourceFileType: "UTP ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function dynamicBlueprintPlaceable() {
  return {
    id: "pla_dynamic",
    kind: "placeables",
    resRef: "plc_dynamic",
    tag: "DYNAMIC_PLACEABLE",
    x: 7.25,
    y: 8.5,
    z: 0.4,
    bearing: Math.PI / 6,
    source: {
      type: "aurora_blueprint",
      sourceKind: "placeable",
      sourceProfileId: "effective-catalog-utp-placeable-copy-v1",
      templateId: "plc_plc_dynamic",
      templateResRef: "plc_dynamic",
      sourceObjectKey: "modules/current/__aurora/sources/vanilla/templates/plc_dynamic.utp",
      sourceEtag: "c".repeat(64),
      sourceFileType: "UTP ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function blueprintItem() {
  return {
    id: "itm_001",
    kind: "items",
    resRef: "nw_cloth022",
    tag: "NW_CLOTH022",
    x: 1.5,
    y: 2.25,
    z: 0.1,
    bearing: Math.PI / 4,
    source: {
      type: "aurora_blueprint",
      sourceKind: "item",
      sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
      templateId: "nw_cloth022",
      sourceEtag: "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
      sourceFileType: "UTI ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function dynamicBlueprintItem() {
  return {
    id: "itm_dynamic",
    kind: "items",
    resRef: "itm_dynamic",
    tag: "DYNAMIC_ITEM",
    x: 6.25,
    y: 9.5,
    z: 0.3,
    bearing: Math.PI / 5,
    source: {
      type: "aurora_blueprint",
      sourceKind: "item",
      sourceProfileId: "effective-catalog-uti-item-copy-v1",
      templateId: "itm_dynamic",
      templateResRef: "itm_dynamic",
      sourceObjectKey: "modules/current/__aurora/sources/vanilla/templates/itm_dynamic.uti",
      sourceSizeBytes: 4_096,
      sourceEtag: "d".repeat(64),
      sourceFileType: "UTI ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function dynamicBlueprintStore() {
  return {
    id: "sto_dynamic",
    kind: "stores",
    resRef: "str_dynamic",
    tag: "Dynamic_Store",
    x: 7.25,
    y: 8.5,
    z: 0.2,
    bearing: Math.PI / 6,
    source: {
      type: "aurora_blueprint",
      sourceKind: "store",
      sourceProfileId: "effective-catalog-utm-store-copy-v1",
      templateId: "str_dynamic",
      templateResRef: "str_dynamic",
      sourceObjectKey: "modules/current/__aurora/sources/vanilla/templates/str_dynamic.utm",
      sourceSizeBytes: 8_192,
      sourceEtag: "e".repeat(64),
      sourceFileType: "UTM ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function blueprintCreature() {
  return {
    id: "cre_001",
    kind: "creatures",
    resRef: "nw_chicken",
    tag: "NW_CHICKEN",
    x: 1.5,
    y: 2.25,
    z: 0.1,
    bearing: Math.PI / 4,
    source: {
      type: "aurora_blueprint",
      sourceKind: "creature",
      sourceProfileId: "nwn-base-key-utc-nw-chicken-v1",
      templateId: "nw_chicken",
      sourceEtag: "c1b0e194bb08b3e3d2946025c1e2f950b91e4cb844a32ba3b744c51a1d822a4a",
      sourceFileType: "UTC ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function blueprintStore() {
  return {
    id: "sto_001",
    kind: "stores",
    resRef: "x2_merc_dye",
    tag: "x2_merc_dye",
    x: 4.291445541381836,
    y: 5.039402770996094,
    z: 0.00000005,
    bearing: Math.PI * 1.5,
    source: {
      type: "aurora_blueprint",
      sourceKind: "store",
      sourceProfileId: "nwn-base-key-utm-x2-merc-dye-v1",
      templateId: "x2_merc_dye",
      sourceEtag: "99b3050edf8697dfd053dbb335c12273de79ae1a16eebb242c354e727ae166e2",
      sourceFileType: "UTM ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function blueprintTrigger() {
  return {
    id: "tri_001",
    kind: "triggers",
    resRef: "newgeneric",
    tag: "GenericTrigger",
    x: 3.547599411010742,
    y: 4.491108703613281,
    z: 0,
    bearing: 0,
    source: {
      type: "aurora_blueprint",
      sourceKind: "trigger",
      sourceProfileId: "nwn-base-key-utt-newgeneric-v1",
      templateId: "newgeneric",
      sourceEtag: "e855ae85a9b8511aca84ada06b9779126ff615f9bd816df4dbf39e1a1544001c",
      sourceFileType: "UTT ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function blueprintEncounter() {
  return {
    id: "enc_001",
    kind: "encounters",
    resRef: "x2_gnoll001",
    tag: "X2_GNOLL001",
    x: 2.241201591491699,
    y: 4.51970329284668,
    z: 0,
    bearing: 0,
    source: {
      type: "aurora_blueprint",
      sourceKind: "encounter",
      sourceProfileId: "nwn-base-key-ute-x2-gnoll001-v1",
      templateId: "x2_gnoll001",
      sourceEtag: "f3941f1eb580b55247f3ac226e8e0aa72841c3c81ba205c61319b8958a5daeed",
      sourceFileType: "UTE ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function dynamicBlueprintEncounter() {
  return {
    id: "enc_dynamic",
    kind: "encounters",
    resRef: "enc_dynamic",
    tag: "Dynamic_Encounter",
    x: 3.25,
    y: 4.5,
    z: 0.125,
    bearing: 0,
    source: {
      type: "aurora_blueprint",
      sourceKind: "encounter",
      sourceProfileId: "effective-catalog-ute-encounter-copy-v1",
      templateId: "enc_enc_dynamic",
      templateResRef: "enc_dynamic",
      sourceObjectKey: "modules/current/blueprints/encounters/enc_dynamic.ute",
      sourceSizeBytes: 4096,
      sourceEtag: "a".repeat(64),
      sourceFileType: "UTE ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function dynamicBlueprintWaypoint() {
  return {
    id: "wpt_dynamic",
    kind: "waypoints",
    resRef: "wp_dynamic",
    tag: "WP_DYNAMIC",
    x: 5.25,
    y: 6.5,
    z: 0.25,
    bearing: Math.PI / 3,
    source: {
      type: "aurora_blueprint",
      sourceKind: "waypoint",
      sourceProfileId: "effective-catalog-utw-waypoint-copy-v1",
      templateId: "wpt_wp_dynamic",
      templateResRef: "wp_dynamic",
      sourceObjectKey: "modules/current/blueprints/waypoints/wp_dynamic.utw",
      sourceSizeBytes: 2048,
      sourceEtag: "c".repeat(64),
      sourceFileType: "UTW ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function blueprintDoor() {
  return {
    id: "doo_001",
    kind: "doors",
    resRef: "nw_door_ttr_04",
    tag: "Barn1Door",
    x: 0.5,
    y: 0.576,
    z: 0,
    bearing: Math.PI,
    source: {
      type: "aurora_blueprint",
      sourceKind: "door",
      sourceProfileId: "nwn-base-key-utd-nw-door-ttr-04-tin01-121-0-v1",
      templateId: "nw_door_ttr_04",
      sourceEtag: "d7fc618b94e0b66c117d5e9d15dea3c0f34f5cc52810b50d146d7c73769406fa",
      sourceFileType: "UTD ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      doorHook: {
        profileId: "tin01-tile121-orientation0-door0-v1",
        tilesetResRef: "tin01",
        tilesetSha256: "e45bfba6f61442e7618b7477f0967943b6ff74a2c02593da6c031c641b3e6ac4",
        tileId: 121,
        tileOrientation: 0,
        tileHeight: 0,
        hookIndex: 0,
        hookType: 0,
        localX: 0,
        localY: 0.76,
        localZ: 0,
        orientationDegrees: 180,
        row: 0,
        col: 0,
      },
    },
  };
}

function doorSnapshot(): AreaDraftSnapshot {
  const value = snapshot();
  const payload = value.draft.payload as Record<string, any>;
  payload.provenance.sourceGitSha256 = "b".repeat(64);
  const state = payload.editableScene.auroraAreaEditing.state;
  state.tilesetFingerprint = "e45bfba6f61442e7618b7477f0967943b6ff74a2c02593da6c031c641b3e6ac4";
  state.tiles[0] = { ...state.tiles[0], tileId: 121, orientation: 0, height: 0 };
  payload.editableScene.objects = [blueprintDoor()];
  return value;
}

describe("Placeable ItemList domain validation", () => {
  const retained = Object.freeze({ sourceIndex: 0, resRef: "first_item", x: 0, y: 0 });
  const admitted = Object.freeze({
    resRef: AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef,
    itemResRef: AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef,
    itemSourceObjectKey: AREA_ITEM_CONSTRUCTION_PROFILE.id,
    itemSourceFingerprint: AREA_ITEM_CONSTRUCTION_PROFILE.sourceSha256,
    x: 0,
    y: 0,
  });
  const captureValidationError = (action: () => unknown): AreaPlaceableInventoryValidationError => {
    try {
      action();
    } catch (error) {
      expect(error).toBeInstanceOf(AreaPlaceableInventoryValidationError);
      return error as AreaPlaceableInventoryValidationError;
    }
    throw new Error("Expected Placeable inventory validation to fail.");
  };

  it.each([
    ["non-array", null],
    ["oversized", Array.from({ length: 1025 }, (_, sourceIndex) => ({
      sourceIndex, resRef: "item", x: 0, y: 0,
    }))],
    ["non-object entry", ["item"]],
    ["null entry", [null]],
    ["array entry", [[]]],
    ["missing key", [{ sourceIndex: 0, resRef: "item", x: 0 }]],
    ["unexpected key", [{ ...retained, extra: true }]],
    ["negative ordinal", [{ ...retained, sourceIndex: -1 }]],
    ["fractional ordinal", [{ ...retained, sourceIndex: 0.5 }]],
    ["string ordinal", [{ ...retained, sourceIndex: "0" }]],
    ["non-sequential ordinal", [{ ...retained, sourceIndex: 1 }]],
    ["non-string ResRef", [{ ...retained, resRef: 1 }]],
    ["invalid ResRef", [{ ...retained, resRef: "bad-item" }]],
    ["negative Word", [{ ...retained, x: -1 }]],
    ["fractional Word", [{ ...retained, x: 0.5 }]],
    ["oversized Word", [{ ...retained, x: 0x10000 }]],
  ])("rejects a %s source inventory", (_label, input) => {
    expect(() => parseAreaPlaceableInventorySourceEntries(input, "source"))
      .toThrow(AreaPlaceableInventoryValidationError);
  });

  it("accepts the exact source budget and Word boundaries", () => {
    const entries = Array.from({ length: 1024 }, (_, sourceIndex) => ({
      sourceIndex,
      resRef: "item",
      x: sourceIndex === 0 ? 0 : 0xffff,
      y: 0xffff,
    }));
    expect(parseAreaPlaceableInventorySourceEntries(entries, "source")).toHaveLength(1024);
  });

  it.each([
    ["non-array", null, [retained]],
    ["oversized", Array.from({ length: 1025 }, () => admitted), []],
    ["non-object entry", ["item"], []],
    ["null entry", [null], []],
    ["array entry", [[]], []],
    ["missing retained source", [retained], []],
    ["changed retained identity", [{ ...retained, resRef: "changed" }], [retained]],
    ["duplicate retained source", [retained, retained], [retained]],
    ["unadmitted ResRef", [{ ...admitted, resRef: "other" }], []],
    ["unadmitted item ResRef", [{ ...admitted, itemResRef: "other" }], []],
    ["mismatched item identity", [{ ...admitted, itemResRef: "first_item" }], []],
    ["unadmitted profile", [{ ...admitted, itemSourceObjectKey: "other" }], []],
    ["unadmitted fingerprint", [{ ...admitted, itemSourceFingerprint: "f".repeat(64) }], []],
    ["missing blueprint key", [{
      resRef: admitted.resRef,
      itemResRef: admitted.itemResRef,
      itemSourceObjectKey: admitted.itemSourceObjectKey,
      itemSourceFingerprint: admitted.itemSourceFingerprint,
      x: 0,
    }], []],
    ["unexpected blueprint key", [{ ...admitted, extra: true }], []],
  ])("rejects a %s target inventory", (_label, input, source) => {
    expect(() => parseAreaPlaceableInventoryTargetEntries(input, source, "target"))
      .toThrow(AreaPlaceableInventoryValidationError);
  });

  it("accepts the exact target budget", () => {
    expect(parseAreaPlaceableInventoryTargetEntries(
      Array.from({ length: 1024 }, () => admitted),
      [],
      "target",
    )).toHaveLength(1024);
  });

  it.each([
    ["source non-object", () => parseAreaPlaceableInventorySourceEntries(["item"], "source"), "source.0"],
    ["source missing key", () => parseAreaPlaceableInventorySourceEntries([{
      sourceIndex: 0, resRef: "item", x: 0,
    }], "source"), "source.0.y"],
    ["source invalid ResRef", () => parseAreaPlaceableInventorySourceEntries([{
      ...retained, resRef: "bad-item",
    }], "source"), "source.0.resRef"],
    ["source invalid Word", () => parseAreaPlaceableInventorySourceEntries([{
      ...retained, x: -1,
    }], "source"), "source.0.x"],
    ["target missing source", () => parseAreaPlaceableInventoryTargetEntries([retained], [], "target"), "target.0.sourceIndex"],
    ["target ResRef profile", () => parseAreaPlaceableInventoryTargetEntries([{
      ...admitted, resRef: "other",
    }], [], "target"), "target.0.resRef"],
    ["target item identity", () => parseAreaPlaceableInventoryTargetEntries([{
      ...admitted, itemResRef: "other",
    }], [], "target"), "target.0.itemResRef"],
    ["target profile", () => parseAreaPlaceableInventoryTargetEntries([{
      ...admitted, itemSourceObjectKey: "other",
    }], [], "target"), "target.0.itemSourceObjectKey"],
    ["target fingerprint", () => parseAreaPlaceableInventoryTargetEntries([{
      ...admitted, itemSourceFingerprint: "f".repeat(64),
    }], [], "target"), "target.0.itemSourceFingerprint"],
    ["target missing key", () => parseAreaPlaceableInventoryTargetEntries([{
      resRef: admitted.resRef,
      itemResRef: admitted.itemResRef,
      itemSourceObjectKey: admitted.itemSourceObjectKey,
      itemSourceFingerprint: admitted.itemSourceFingerprint,
      x: 0,
    }], [], "target"), "target.0.y"],
  ])("reports the exact %s path", (_label, action, path) => {
    expect(captureValidationError(action).path).toBe(path);
  });

  it("distinguishes a missing inventory field from an invalid field value", () => {
    expect(captureValidationError(() => parseAreaPlaceableInventorySourceEntries([{
      sourceIndex: 0,
      resRef: "item",
      x: 0,
    }], "source"))).toMatchObject({
      message: "Missing Placeable inventory field 'y'.",
      path: "source.0.y",
    });
  });

  it.each([
    ["length", [retained], []],
    ["source ordinal", [retained], [{ ...retained, sourceIndex: 1 }]],
    ["entry kind", [retained], [admitted]],
    ["blueprint", [admitted], [{ ...admitted, itemSourceFingerprint: "f".repeat(64) }]],
    ["ResRef", [retained], [{ ...retained, resRef: "changed" }]],
    ["x", [retained], [{ ...retained, x: 1 }]],
    ["y", [retained], [{ ...retained, y: 1 }]],
  ])("detects inventory inequality by %s", (_label, left, right) => {
    expect(areaPlaceableInventoryEntriesEqual(left as any, right as any)).toBe(false);
  });

  it("recognizes equal retained and admitted entries", () => {
    expect(areaPlaceableInventoryEntriesEqual([retained], [{ ...retained }])).toBe(true);
    expect(areaPlaceableInventoryEntriesEqual([admitted], [{ ...admitted }])).toBe(true);
  });

  it.each([
    ["non-object", null],
    ["missing pair key", { expectedEntries: [] }],
    ["unexpected pair key", { expectedEntries: [], entries: [], extra: true }],
  ])("rejects a %s mutation pair", (_label, input) => {
    expect(() => parseAreaPlaceableInventoryMutation(input, "inventory"))
      .toThrow(AreaPlaceableInventoryValidationError);
  });
});
