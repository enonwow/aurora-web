import type { AreaDraftSnapshot } from
  "../../src/modules/areas/domain/area-draft.types";

export const AREA_UPDATE_DRAFT_HASH = "d".repeat(64);

export function areaUpdateDraftProjectorSnapshot(): AreaDraftSnapshot {
  return {
    draftId: "draft_01",
    title: "Crypt working copy",
    revision: 7,
    updatedAt: "2026-08-12T08:00:00.000Z",
    normalizedSha256: AREA_UPDATE_DRAFT_HASH,
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
          sourceGitSha256: "b".repeat(64),
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
              tilesetFingerprint: "e".repeat(64),
              sourceAreaFingerprint: "a".repeat(64),
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

export function retainedCreatureSceneObject() {
  return {
    id: "area_crypt01:obj_cre_guard",
    kind: "creatures",
    resRef: "nw_guard",
    tag: "NW_GUARD",
    x: 1,
    y: 2,
    z: 0,
    bearing: 0,
    source: {
      type: "aurora_git",
      areaId: "area_crypt01",
      sourceObjectId: "obj_cre_guard",
      sourceKind: "creature",
    },
  };
}

export function exactCreatureHitPointState() {
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
