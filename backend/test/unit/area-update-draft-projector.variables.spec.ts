import { projectAreaUpdateDraft } from "../../src/modules/areas/domain/area-update-draft-projector";
import type { AreaDraftSnapshot } from "../../src/modules/areas/domain/area-draft.types";

const DRAFT_HASH = "d".repeat(64);
const SOURCE_HASH = "a".repeat(64);
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
                tokenWidth: 3,
                tokenHeight: 3,
                tokens: [],
                cornerWidth: 2,
                cornerHeight: 2,
                heights: [],
              },
              groupInstances: [],
              tiles: [
                tile(0, 0),
                tile(0, 1),
                tile(1, 0),
                tile(1, 1),
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

function tile(row: number, col: number) {
  return {
    id: `tile-${row}-${col}`,
    row,
    col,
    sourceRow: row,
    sourceCol: col,
    tileId: 12,
    orientation: 0,
    height: 0,
  };
}

function project(value: AreaDraftSnapshot) {
  return projectAreaUpdateDraft(value, {
    areaResRef: "crypt01",
    draftId: "draft_01",
    draftRevision: 7,
    draftNormalizedSha256: DRAFT_HASH,
  });
}

describe("Area update draft variable projection", () => {
  it("projects one exact changed ordered Area VarTable with GIT provenance", () => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.sourceArea.variables = {
      expectedEntries: [
        { sourceIndex: 0, name: "DUPLICATE", type: "int", value: -7 },
        { sourceIndex: 1, name: "DUPLICATE", type: "float", value: Math.fround(1.25) },
        { sourceIndex: 2, name: "TEXT", type: "string", value: "source" },
      ],
    };
    payload.editableScene.areaVariables = [
      { name: "DUPLICATE", type: "float", value: Math.fround(1.25) },
      { name: "DUPLICATE", type: "int", value: 42 },
      { name: "TEXT", type: "string", value: " target " },
    ];

    expect(project(value).variables).toEqual({
      expectedEntries: payload.sourceArea.variables.expectedEntries,
      entries: payload.editableScene.areaVariables,
      sourceGitSha256: "b".repeat(64),
    });
  });

  it.each([
    [[], []],
    [[{ sourceIndex: 0, name: "SAME", type: "int", value: 1 }],
      [{ name: "SAME", type: "int", value: 1 }]],
  ])("omits one unchanged exact Area VarTable %#", (expectedEntries, entries) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.sourceArea.variables = { expectedEntries };
    payload.editableScene.areaVariables = entries;
    expect(project(value).variables).toBeUndefined();
  });

  it.each([
    ["source profile", false, true, "draft.payload.sourceArea.variables"],
    ["GIT digest", true, false, "draft.payload.provenance.sourceGitSha256"],
  ])("rejects a changed Area VarTable without exact %s", (_label, source, digest, path) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    if (source) payload.sourceArea.variables = { expectedEntries: [] };
    if (digest) payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.editableScene.areaVariables = [{ name: "CREATED", type: "int", value: 1 }];
    expect(() => project(value)).toThrow(expect.objectContaining({ path }));
  });

  it.each([
    [
      { expectedEntries: [{ sourceIndex: 1, name: "BAD", type: "int", value: 1 }] },
      [{ name: "GOOD", type: "int", value: 1 }],
      "draft.payload.sourceArea.variables",
    ],
    [
      { expectedEntries: [] },
      [{ name: "BAD", type: "float", value: 0.1 }],
      "draft.payload.editableScene.areaVariables",
    ],
  ])("rejects malformed Area VarTable state %#", (variables, areaVariables, path) => {
    const value = snapshot();
    const payload = value.draft.payload as Record<string, any>;
    payload.provenance.sourceGitSha256 = "b".repeat(64);
    payload.sourceArea.variables = variables;
    payload.editableScene.areaVariables = areaVariables;
    expect(() => project(value)).toThrow(expect.objectContaining({ path }));
  });
});
