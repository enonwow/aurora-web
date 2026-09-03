import { serializeAreaEditingDraftToAreGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-editing-writer";
import {
  validateAreaUpdateCandidate,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-area-update-candidate-validator";
import type { ProjectedAreaUpdateDraft } from "../../src/modules/areas/domain/area-update-draft-projector";

function draft(): ProjectedAreaUpdateDraft {
  return {
    areaResRef: "crypt01",
    name: "Crypt 01",
    width: 2,
    height: 2,
    tilesetResRef: "tin01",
    tilesetFingerprint: "e".repeat(64),
    areaFingerprint: "a".repeat(64),
    tiles: [
      tile(0, 0, 0),
      tile(0, 1, 1),
      tile(1, 0, 2),
      tile(1, 1, 3),
    ],
  };
}

function tile(row: number, col: number, orientation: number) {
  return {
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

describe("validateAreaUpdateCandidate", () => {
  it("independently parses and accepts the exact emitted ARE topology", () => {
    const expected = draft();
    const bytes = serializeAreaEditingDraftToAreGff(expected);

    expect(validateAreaUpdateCandidate(expected, bytes)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("rejects non-ARE bytes", () => {
    expect(validateAreaUpdateCandidate(draft(), Buffer.from("not-gff"))).toEqual({
      valid: false,
      issues: [
        {
          code: "AREA_UPDATE_CANDIDATE_PARSE_FAILED",
          path: "candidate.are",
          message: "Candidate is not a readable ARE GFF.",
        },
      ],
    });
  });

  it("rejects a semantically different tile even when the candidate is valid GFF", () => {
    const expected = draft();
    const changed = {
      ...expected,
      tiles: expected.tiles.map((entry, index) =>
        index === 2 ? { ...entry, tileId: 99 } : entry,
      ),
    };
    const bytes = serializeAreaEditingDraftToAreGff(changed);

    expect(validateAreaUpdateCandidate(expected, bytes)).toEqual({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: "AREA_UPDATE_CANDIDATE_TILE_MISMATCH",
          path: "candidate.are.tiles.2.tileId",
        }),
      ]),
    });
  });

  it("independently accepts exact Area Comments candidate readback", () => {
    const expected = {
      ...draft(),
      comments: { expectedValue: "old", value: "new" },
    };
    const bytes = serializeAreaEditingDraftToAreGff(expected, commentsPreservation("old"));

    expect(validateAreaUpdateCandidate(expected, bytes)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("rejects a readable candidate whose Area Comments readback drifted", () => {
    const expected = {
      ...draft(),
      comments: { expectedValue: "old", value: "new" },
    };
    const bytes = serializeAreaEditingDraftToAreGff(
      { ...draft(), comments: { expectedValue: "old", value: "drifted" } },
      commentsPreservation("old"),
    );

    expect(validateAreaUpdateCandidate(expected, bytes)).toEqual({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: "AREA_UPDATE_CANDIDATE_ROOT_MISMATCH",
          path: "candidate.are.comments",
        }),
      ]),
    });
  });

  it("independently accepts and rejects exact Area event-script candidate readback", () => {
    const expected = {
      ...draft(),
      eventScripts: {
        onEnter: { expectedResRef: "old_enter", resRef: "new_enter" },
      },
    };
    const preservation = {
      ...commentsPreservation("note"),
      fields: [
        { label: "OnEnter", type: "resref" as const, value: "old_enter" },
        ...commentsPreservation("note").fields,
      ],
    };
    const accepted = serializeAreaEditingDraftToAreGff(expected, preservation);
    expect(validateAreaUpdateCandidate(expected, accepted)).toEqual({ valid: true, issues: [] });

    const drifted = serializeAreaEditingDraftToAreGff({
      ...draft(),
      eventScripts: {
        onEnter: { expectedResRef: "old_enter", resRef: "drifted" },
      },
    }, preservation);
    expect(validateAreaUpdateCandidate(expected, drifted)).toEqual({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ path: "candidate.are.eventScripts.onEnter" }),
      ]),
    });
  });

  it("independently validates exact Area Name and Tag candidate readback", () => {
    const expected = {
      ...draft(),
      name: "New Name",
      basicIdentity: {
        name: { expectedValue: "Old Name", value: "New Name" },
        tag: { expectedValue: "OLD_TAG", value: "NEW_TAG" },
      },
    };
    const preservation = {
      ...commentsPreservation("note"),
      fields: [
        { label: "Name", type: "cexolocstring" as const, value: {
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, text: "Old Name" }],
        } },
        { label: "Tag", type: "cexostring" as const, value: "OLD_TAG" },
        ...commentsPreservation("note").fields,
      ],
    };
    const sourceAre = serializeAreaEditingDraftToAreGff({
      ...draft(),
      name: "Old Name",
    }, preservation);
    const accepted = serializeAreaEditingDraftToAreGff(expected, preservation);
    expect(validateAreaUpdateCandidate(expected, accepted, sourceAre)).toEqual({
      valid: true,
      issues: [],
    });
    const drifted = serializeAreaEditingDraftToAreGff({
      ...draft(), name: "Drifted",
      basicIdentity: {
        name: { expectedValue: "Old Name", value: "Drifted" },
        tag: { expectedValue: "OLD_TAG", value: "NEW_TAG" },
      },
    }, preservation);
    expect(validateAreaUpdateCandidate(expected, drifted)).toEqual({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ path: "candidate.are.basicIdentity.name" }),
      ]),
    });
  });

  it("independently validates the retained multi-entry inline Name profile", () => {
    const expected = {
      ...draft(),
      name: "New Name",
      basicIdentity: {
        name: {
          expectedValue: "Old Name",
          value: "New Name",
          expectedProfile: "multi_entry_inline_ascii" as const,
        },
      },
    };
    const preservation = {
      ...commentsPreservation("note"),
      fields: [
        { label: "Name", type: "cexolocstring" as const, value: {
          strRef: 0xffff_ffff,
          entries: [
            { languageId: 0, text: "Old Name" },
            { languageId: 2, text: "Other" },
          ],
        } },
        ...commentsPreservation("note").fields,
      ],
    };
    const multiSourceAre = serializeAreaEditingDraftToAreGff({
      ...draft(),
      name: "Old Name",
    }, preservation);
    const accepted = serializeAreaEditingDraftToAreGff(expected, preservation);
    expect(validateAreaUpdateCandidate(expected, accepted, multiSourceAre)).toEqual({
      valid: true,
      issues: [],
    });

    const driftedProfile = serializeAreaEditingDraftToAreGff({
      ...draft(),
      name: "New Name",
      basicIdentity: { name: { expectedValue: "Old Name", value: "New Name" } },
    }, {
      ...preservation,
      fields: preservation.fields.map((field) => field.label === "Name"
        ? { label: "Name", type: "cexolocstring" as const, value: {
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, text: "Old Name" }],
          } }
        : field),
    });
    expect(validateAreaUpdateCandidate(expected, driftedProfile, multiSourceAre)).toEqual({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ path: "candidate.are.basicIdentity.nameProfile" }),
      ]),
    });

    const driftedSiblingPreservation = {
      ...preservation,
      fields: preservation.fields.map((field) => field.label === "Name"
        ? { label: "Name", type: "cexolocstring" as const, value: {
            strRef: 0xffff_ffff,
            entries: [
              { languageId: 0, text: "Old Name" },
              { languageId: 2, text: "Drifted sibling" },
            ],
          } }
        : field),
    };
    const driftedSibling = serializeAreaEditingDraftToAreGff(
      expected,
      driftedSiblingPreservation,
    );
    expect(validateAreaUpdateCandidate(expected, driftedSibling, multiSourceAre)).toEqual({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ path: "candidate.are.basicIdentity.nameSiblings" }),
      ]),
    });
  });

  it("independently validates the complete target list for an existing Name edit and reorder", () => {
    const expected = {
      ...draft(),
      name: "Old Name",
      basicIdentity: {
        name: {
          expectedValue: "Old Name",
          value: "Old Name",
          expectedProfile: "multi_entry_inline_ascii" as const,
          expectedEntries: [
            { languageId: 0, text: "Old Name" },
            { languageId: 2, text: "Old sibling" },
          ],
          valueEntries: [
            { languageId: 2, text: "New sibling" },
            { languageId: 0, text: "Old Name" },
          ],
        },
      },
    };
    const preservation = {
      ...commentsPreservation("note"),
      fields: [
        { label: "Name", type: "cexolocstring" as const, value: {
          strRef: 0xffff_ffff,
          entries: expected.basicIdentity.name.expectedEntries,
        } },
        ...commentsPreservation("note").fields,
      ],
    };
    const sourceAre = serializeAreaEditingDraftToAreGff({ ...draft(), name: "Old Name" }, preservation);
    const accepted = serializeAreaEditingDraftToAreGff(expected, preservation);
    expect(validateAreaUpdateCandidate(expected, accepted, sourceAre)).toEqual({
      valid: true,
      issues: [],
    });

    const drifted = serializeAreaEditingDraftToAreGff({
      ...expected,
      basicIdentity: {
        name: {
          ...expected.basicIdentity.name,
          valueEntries: [
            { languageId: 2, text: "Unexpected sibling" },
            { languageId: 0, text: "Old Name" },
          ],
        },
      },
    }, preservation);
    expect(validateAreaUpdateCandidate(expected, drifted, sourceAre)).toEqual({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ path: "candidate.are.basicIdentity.nameSiblings" }),
      ]),
    });
  });

  it("independently validates a bounded added Area Name entry and rejects added-entry drift", () => {
    const expected = {
      ...draft(),
      name: "Old Name",
      basicIdentity: {
        name: {
          expectedValue: "Old Name",
          value: "Old Name",
          expectedProfile: "simple_inline_ascii" as const,
          expectedEntries: [{ languageId: 0, text: "Old Name" }],
          valueEntries: [
            { languageId: 11, text: "Krypta" },
            { languageId: 0, text: "Old Name" },
          ],
        },
      },
    };
    const preservation = {
      ...commentsPreservation("note"),
      fields: [
        { label: "Name", type: "cexolocstring" as const, value: {
          strRef: 0xffff_ffff,
          entries: expected.basicIdentity.name.expectedEntries,
        } },
        ...commentsPreservation("note").fields,
      ],
    };
    const sourceAre = serializeAreaEditingDraftToAreGff(
      { ...draft(), name: "Old Name" },
      preservation,
    );
    const accepted = serializeAreaEditingDraftToAreGff(expected, preservation);
    expect(validateAreaUpdateCandidate(expected, accepted, sourceAre)).toEqual({
      valid: true,
      issues: [],
    });

    const drifted = serializeAreaEditingDraftToAreGff({
      ...expected,
      basicIdentity: { name: {
        ...expected.basicIdentity.name,
        valueEntries: [
          { languageId: 11, text: "Unexpected" },
          { languageId: 0, text: "Old Name" },
        ],
      } },
    }, preservation);
    expect(validateAreaUpdateCandidate(expected, drifted, sourceAre)).toEqual({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ path: "candidate.are.basicIdentity.nameSiblings" }),
      ]),
    });
  });

  it("independently validates an existing-identifier subset Area Name removal target", () => {
    const expected = {
      ...draft(),
      name: "Old Name",
      basicIdentity: {
        name: {
          expectedValue: "Old Name",
          value: "Old Name",
          expectedProfile: "multi_entry_inline_ascii" as const,
          expectedEntries: [
            { languageId: 3, text: "Nom" },
            { languageId: 0, text: "Old Name" },
            { languageId: 8, text: "Third" },
          ],
          valueEntries: [
            { languageId: 0, text: "Old Name" },
            { languageId: 8, text: "Retained" },
          ],
        },
      },
    };
    const preservation = {
      ...commentsPreservation("note"),
      fields: [
        { label: "Name", type: "cexolocstring" as const, value: {
          strRef: 0xffff_ffff,
          entries: expected.basicIdentity.name.expectedEntries,
        } },
        ...commentsPreservation("note").fields,
      ],
    };
    const sourceAre = serializeAreaEditingDraftToAreGff(
      { ...draft(), name: "Old Name" },
      preservation,
    );
    const accepted = serializeAreaEditingDraftToAreGff(expected, preservation);
    expect(validateAreaUpdateCandidate(expected, accepted, sourceAre)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("independently accepts and rejects exact Area advanced-flag candidate readback", () => {
    const expected = {
      ...draft(),
      advancedFlags: {
        terrainType: {
          expectedValue: { interior: false, natural: true, subterranean: false },
          value: { interior: true, natural: false, subterranean: true },
        },
        playerVsPlayer: { expectedValue: 0 as const, value: 3 as const },
        noRest: { expectedValue: false, value: true },
        listenCheckModifier: { expectedValue: -8, value: 9 },
        spotCheckModifier: { expectedValue: 11, value: -12 },
        loadingScreenId: { expectedValue: 0, value: 42 },
      },
    };
    const preservation = {
      ...commentsPreservation("note"),
      fields: [
        { label: "Flags", type: "dword" as const, value: 4 },
        { label: "PlayerVsPlayer", type: "byte" as const, value: 0 },
        { label: "NoRest", type: "byte" as const, value: 0 },
        { label: "ModListenCheck", type: "int" as const, value: -8 },
        { label: "ModSpotCheck", type: "int" as const, value: 11 },
        { label: "LoadScreenID", type: "word" as const, value: 0 },
        ...commentsPreservation("note").fields,
      ],
    };
    const accepted = serializeAreaEditingDraftToAreGff(expected, preservation);
    expect(validateAreaUpdateCandidate(expected, accepted)).toEqual({ valid: true, issues: [] });

    const drifted = serializeAreaEditingDraftToAreGff({
      ...draft(),
      advancedFlags: {
        terrainType: expected.advancedFlags.terrainType,
        playerVsPlayer: { expectedValue: 0, value: 2 },
        noRest: expected.advancedFlags.noRest,
        listenCheckModifier: expected.advancedFlags.listenCheckModifier,
        spotCheckModifier: { expectedValue: 11, value: -11 },
        loadingScreenId: { expectedValue: 0, value: 43 },
      },
    }, preservation);
    expect(validateAreaUpdateCandidate(expected, drifted)).toEqual({
      valid: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ path: "candidate.are.advancedFlags.playerVsPlayer" }),
        expect.objectContaining({ path: "candidate.are.advancedFlags.spotCheckModifier" }),
        expect.objectContaining({ path: "candidate.are.advancedFlags.loadingScreenId" }),
      ]),
    });
  });
});

function commentsPreservation(value: string) {
  return {
    rootStructTypeId: 0xffffffff,
    fields: [
      { label: "Comments", type: "cexostring" as const, value },
      { label: "Width", type: "dword" as const, value: 2 },
      { label: "Height", type: "dword" as const, value: 2 },
      { label: "Tileset", type: "resref" as const, value: "tin01" },
      {
        label: "Tile_List",
        type: "list" as const,
        value: Array.from({ length: 4 }, () => ({ typeId: 0, fields: [] })),
      },
    ],
  };
}
