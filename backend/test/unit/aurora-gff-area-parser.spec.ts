import {
  parseAreaMetadataFromAreGff,
  parseAreaObjectsFromGitGicGff,
  parseAreaItemEditorCommentsFromGicGff,
  parseAreaObjectsFromGitGff,
  parseAreaEncounterEditorCommentsFromGicGff,
  parseAreaPlaceableEditorCommentsFromGicGff,
  parseAreaStoreEditorCommentsFromGicGff,
  parseAreaVariablesFromGitGff,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import { serializeAreaItemPlacementsToGitGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-item-writer";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  serializeAreaToAreGff,
  serializeAreaToGitGff
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-writer";
import type { AreaRecord } from "../../src/modules/areas/domain/area.types";
import { AREA_CREATURE_BODY_PART_FIELDS } from
  "../../src/modules/areas/domain/area-creature-body-parts";

type SupportedField =
  | { label: string; type: "byte"; value: number }
  | { label: string; type: "word"; value: number }
  | { label: string; type: "short"; value: number }
  | { label: string; type: "dword"; value: number }
  | { label: string; type: "int"; value: number }
  | { label: string; type: "float"; value: number }
  | { label: string; type: "cexostring"; value: string }
  | { label: string; type: "resref"; value: string }
  | { label: string; type: "cexolocstring"; value: string; strRef?: number }
  | {
      label: string;
      type: "cexolocstring";
      value: {
        strRef: number;
        entries: Array<{ languageId: number; textBytes: Buffer }>;
        trailingBytes?: Buffer;
        firstDeclaredTextLengthDelta?: number;
        declaredTotalSizeDelta?: number;
        declaredCountDelta?: number;
        truncatePayloadBytes?: number;
        fieldTypeIdOverride?: number;
      };
    }
  | { label: string; type: "struct"; value: number }
  | { label: string; type: "list"; value: number[] };

interface StructDef {
  typeId?: number;
  fields: SupportedField[];
}

const FIELD_TYPE = {
  BYTE: 0,
  WORD: 2,
  SHORT: 3,
  DWORD: 4,
  INT: 5,
  FLOAT: 8,
  CEXOSTRING: 10,
  RESREF: 11,
  CEXOLOCSTRING: 12,
  STRUCT: 14,
  LIST: 15
} as const;

const HEADER_SIZE = 56;
const STRUCT_ENTRY_SIZE = 12;
const FIELD_ENTRY_SIZE = 12;
const LABEL_ENTRY_SIZE = 16;

describe("aurora-gff-area-parser", () => {
  it("parses ARE metadata fields and tile list count", () => {
    const bytes = buildNestedGffBuffer(
      [
        {
          fields: [
            {
              label: "Name",
              type: "cexolocstring",
              value: "Market District",
              strRef: 0xffff_ffff,
            },
            { label: "Tag", type: "cexostring", value: "market_district" },
            { label: "Comments", type: "cexostring", value: " Exact area note\r\nline two " },
            { label: "OnEnter", type: "resref", value: "area_enter" },
            { label: "OnExit", type: "resref", value: "" },
            { label: "OnHeartbeat", type: "resref", value: "area_heartbeat" },
            { label: "OnUserDefined", type: "resref", value: "area_user" },
            { label: "Flags", type: "dword", value: 7 },
            { label: "PlayerVsPlayer", type: "byte", value: 2 },
            { label: "NoRest", type: "byte", value: 1 },
            { label: "ModListenCheck", type: "int", value: -4 },
            { label: "ModSpotCheck", type: "int", value: 7 },
            { label: "Width", type: "dword", value: 24 },
            { label: "Height", type: "dword", value: 18 },
            { label: "Tileset", type: "resref", value: "tno01" },
            { label: "Tile_List", type: "list", value: [1, 2, 3] },
            { label: "LightingScheme", type: "dword", value: 2 },
            { label: "ShadowOpacity", type: "byte", value: 80 },
            { label: "SunAmbientColor", type: "dword", value: 16764057 },
            { label: "SunFogAmount", type: "byte", value: 32 },
            { label: "MoonShadows", type: "byte", value: 1 },
            { label: "FogClipDist", type: "float", value: 45.5 },
            { label: "AmbientSndDay", type: "dword", value: 41 },
            { label: "AmbientSndNight", type: "dword", value: 52 },
            { label: "MusicDay", type: "dword", value: 11 },
            { label: "MusicNight", type: "dword", value: 12 },
            { label: "MusicBattle", type: "dword", value: 13 }
          ]
        },
        {
          fields: [
            { label: "Tile_ID", type: "dword", value: 101 },
            { label: "Orientation", type: "dword", value: 1 },
            { label: "Height", type: "float", value: 0.5 },
            { label: "ModelResRef", type: "resref", value: "tno01_a01_01" },
            { label: "Tile_MainLight1", type: "byte", value: 3 },
            { label: "Tile_MainLight2", type: "byte", value: 4 },
            { label: "Tile_SrcLight1", type: "byte", value: 5 },
            { label: "Tile_SrcLight2", type: "byte", value: 6 },
            { label: "Tile_AnimLoop1", type: "byte", value: 1 },
            { label: "Tile_AnimLoop2", type: "byte", value: 0 },
            { label: "Tile_AnimLoop3", type: "byte", value: 1 }
          ]
        },
        {
          fields: [
            { label: "Tile_ID", type: "dword", value: 102 },
            { label: "Orientation", type: "dword", value: 2 }
          ]
        },
        {
          fields: [
            { label: "Tile_ID", type: "dword", value: 103 },
            { label: "Orientation", type: "dword", value: 3 }
          ]
        }
      ],
      "ARE "
    );

    const parsed = parseAreaMetadataFromAreGff(bytes);

    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      sourceFileType: "ARE ",
      name: "Market District",
      tag: "market_district",
      comments: " Exact area note\r\nline two ",
      eventScripts: {
        onEnter: "area_enter",
        onExit: "",
        onHeartbeat: "area_heartbeat",
        onUserDefined: "area_user",
      },
      basicIdentity: {
        name: "Market District",
        tag: "market_district",
      },
      advancedFlags: {
        terrainType: { interior: true, natural: true, subterranean: true },
        playerVsPlayer: 2,
        noRest: true,
        listenCheckModifier: -4,
        spotCheckModifier: 7,
      },
      width: 24,
      height: 18,
      tileSet: "tno01",
      tileCount: 3,
      tiles: [
        {
          index: 0,
          row: 0,
          col: 0,
          tileId: 101,
          modelResRef: "tno01_a01_01",
          orientation: 1,
          height: 0.5,
          mainLight1: 3,
          mainLight2: 4,
          sourceLight1: 5,
          sourceLight2: 6,
          animLoop1: 1,
          animLoop2: 0,
          animLoop3: 1
        },
        {
          index: 1,
          row: 0,
          col: 1,
          tileId: 102,
          orientation: 2
        },
        {
          index: 2,
          row: 0,
          col: 2,
          tileId: 103,
          orientation: 3
        }
      ],
      soundIds: {
        ambientDay: 41,
        ambientNight: 52,
        musicDay: 11,
        musicNight: 12,
        musicBattle: 13
      },
      globalLighting: {
        fields: [
          { field: "LightingScheme", value: 2 },
          { field: "ShadowOpacity", value: 80 },
          { field: "FogClipDist", value: 45.5 },
          { field: "SunAmbientColor", value: 16764057 },
          { field: "SunFogAmount", value: 32 },
          { field: "MoonShadows", value: 1 }
        ]
      }
    });
  });

  it("parses placeable flags, scripts, animation state, and embedded inventory", () => {
    const bytes = buildNestedGffBuffer(
      [
        {
          fields: [{ label: "Placeable List", type: "list", value: [1] }]
        },
        {
          typeId: 9,
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_test_chest" },
            { label: "Tag", type: "cexostring", value: "PLC_TEST_CHEST" },
            { label: "LocName", type: "cexolocstring", value: "Test Chest", strRef: 7001 },
            { label: "Appearance", type: "dword", value: 77 },
            { label: "AnimationState", type: "byte", value: 2 },
            { label: "Static", type: "byte", value: 0 },
            { label: "Useable", type: "byte", value: 1 },
            { label: "HasInventory", type: "byte", value: 1 },
            { label: "Plot", type: "byte", value: 1 },
            { label: "Hardness", type: "byte", value: 5 },
            { label: "Fort", type: "byte", value: 16 },
            { label: "Ref", type: "byte", value: 7 },
            { label: "Will", type: "byte", value: 8 },
            { label: "Locked", type: "byte", value: 1 },
            { label: "Lockable", type: "byte", value: 1 },
            { label: "KeyRequired", type: "byte", value: 1 },
            { label: "KeyName", type: "cexostring", value: "test_key" },
            { label: "OnClick", type: "resref", value: "plc_click" },
            { label: "OnClosed", type: "resref", value: "plc_closed" },
            { label: "OnDamaged", type: "resref", value: "plc_damaged" },
            { label: "OnDeath", type: "resref", value: "plc_death" },
            { label: "OnDisarm", type: "resref", value: "plc_disarm" },
            { label: "OnHeartbeat", type: "resref", value: "plc_heartbeat" },
            { label: "OnInvDisturbed", type: "resref", value: "plc_inv" },
            { label: "OnLock", type: "resref", value: "plc_lock" },
            { label: "OnMeleeAttacked", type: "resref", value: "plc_melee" },
            { label: "OnOpen", type: "resref", value: "plc_open" },
            { label: "OnSpellCastAt", type: "resref", value: "plc_spell" },
            { label: "OnTrapTriggered", type: "resref", value: "plc_trap" },
            { label: "OnUnlock", type: "resref", value: "plc_unlock" },
            { label: "OnUsed", type: "resref", value: "plc_onused" },
            { label: "OnUserDefined", type: "resref", value: "plc_user" },
            { label: "ItemList", type: "list", value: [2] },
            { label: "XPosition", type: "float", value: 4 },
            { label: "YPosition", type: "float", value: 5 }
          ]
        },
        {
          typeId: 9,
          fields: [
            { label: "TemplateResRef", type: "resref", value: "nw_it_mpotion001" },
            { label: "Repos_PosX", type: "word", value: 1 },
            { label: "Repos_PosY", type: "word", value: 2 },
            { label: "Dropable", type: "byte", value: 1 },
            { label: "Pickpocketable", type: "byte", value: 0 },
            { label: "Infinite", type: "byte", value: 0 }
          ]
        }
      ],
      "GIT "
    );

    const placeable = parseAreaObjectsFromGitGff(bytes)?.placeables[0];
    expect(placeable).toMatchObject({
      templateResRef: "plc_test_chest",
      tag: "PLC_TEST_CHEST",
      appearanceType: 77,
      isStatic: false,
      placeableMetadata: {
        templateResRef: "plc_test_chest",
        tag: "PLC_TEST_CHEST",
        localizedName: "Test Chest",
        localizedNameStrRef: 7001,
        appearanceId: 77,
        animationState: 2,
        static: false,
        useable: true,
        hasInventory: true,
        plot: true,
        hardness: 5,
        fortitudeSave: 16,
        reflexSave: 7,
        willSave: 8,
        locked: true,
        lockable: true,
        keyRequired: true,
        keyName: "test_key",
        "script.onClick": "plc_click",
        "script.onClosed": "plc_closed",
        "script.onDamaged": "plc_damaged",
        "script.onDeath": "plc_death",
        "script.onDisarm": "plc_disarm",
        "script.onHeartbeat": "plc_heartbeat",
        "script.onInventoryDisturbed": "plc_inv",
        "script.onLock": "plc_lock",
        "script.onMeleeAttacked": "plc_melee",
        "script.onOpen": "plc_open",
        "script.onSpellCastAt": "plc_spell",
        "script.onTrapTriggered": "plc_trap",
        "script.onUnlock": "plc_unlock",
        "script.onUsed": "plc_onused",
        "script.onUserDefined": "plc_user",
        inventoryItemListCount: 1
      }
    });
    expect(JSON.parse(String(placeable?.placeableMetadata?.inventoryItemListEntries))).toEqual([
      {
        sourceIndex: 0,
        resRef: "nw_it_mpotion001",
        x: 1,
        y: 2
      }
    ]);
  });

  it("exposes the exact canonical Door transition storage trio", () => {
    const parsed = parseAreaObjectsFromGitGff(buildNestedGffBuffer([
      { fields: [{ label: "Door List", type: "list", value: [1] }] },
      {
        typeId: 8,
        fields: [
          { label: "TemplateResRef", type: "resref", value: "nw_door_ttr_04" },
          { label: "X", type: "float", value: 10 },
          { label: "Y", type: "float", value: 20 },
          { label: "LinkedTo", type: "cexostring", value: "destination_tag" },
          { label: "LinkedToFlags", type: "byte", value: 0xff },
          { label: "LoadScreenID", type: "word", value: 0xffff },
        ],
      },
    ], "GIT "));

    expect(parsed?.doors[0]?.doorTransition).toMatchObject({
      linkedTarget: "destination_tag",
      extra: { linkedToFlags: 0xff, loadScreenId: 0xffff },
      storage: {
        linkedTo: "destination_tag",
        linkedToFlags: 0xff,
        loadScreenId: 0xffff,
      },
    });
    expect(Object.isFrozen(parsed?.doors[0]?.doorTransition?.storage)).toBe(true);
  });

  it.each([
    ["wrong struct type", 9, [
      { label: "LinkedTo", type: "cexostring", value: "destination_tag" },
      { label: "LinkedToFlags", type: "byte", value: 1 },
      { label: "LoadScreenID", type: "word", value: 7 },
    ]],
    ["wrong case", 8, [
      { label: "LinkedTo", type: "cexostring", value: "destination_tag" },
      { label: "LinkedToFlags", type: "byte", value: 1 },
      { label: "LoadScreenId", type: "word", value: 7 },
    ]],
    ["wrong type", 8, [
      { label: "LinkedTo", type: "resref", value: "destination_tag" },
      { label: "LinkedToFlags", type: "byte", value: 1 },
      { label: "LoadScreenID", type: "word", value: 7 },
    ]],
    ["duplicate label", 8, [
      { label: "LinkedTo", type: "cexostring", value: "destination_tag" },
      { label: "linkedto", type: "cexostring", value: "other_tag" },
      { label: "LinkedToFlags", type: "byte", value: 1 },
      { label: "LoadScreenID", type: "word", value: 7 },
    ]],
    ["over-budget string", 8, [
      { label: "LinkedTo", type: "cexostring", value: "x".repeat(257) },
      { label: "LinkedToFlags", type: "byte", value: 1 },
      { label: "LoadScreenID", type: "word", value: 7 },
    ]],
  ] as const)("keeps Door transition storage preserve-only for %s", (_label, typeId, transitionFields) => {
    const parsed = parseAreaObjectsFromGitGff(buildNestedGffBuffer([
      { fields: [{ label: "Door List", type: "list", value: [1] }] },
      {
        typeId,
        fields: [
          { label: "TemplateResRef", type: "resref", value: "nw_door_ttr_04" },
          { label: "X", type: "float", value: 10 },
          { label: "Y", type: "float", value: 20 },
          ...transitionFields,
        ] as SupportedField[],
      },
    ], "GIT "));

    expect(parsed?.doors[0]?.doorTransition?.storage).toBeUndefined();
  });

  it("exposes exact presence-sensitive Placeable Tag and Appearance storage provenance", () => {
    const bytes = buildNestedGffBuffer(
      [
        { fields: [{ label: "Placeable List", type: "list", value: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }] },
        { typeId: 9, fields: [
          { label: "Tag", type: "cexostring", value: "" },
          { label: "Appearance", type: "dword", value: 0xffff_ffff },
          { label: "XPosition", type: "float", value: 1 },
          { label: "YPosition", type: "float", value: 1 }
        ] },
        { typeId: 9, fields: [
          { label: "XPosition", type: "float", value: 2 },
          { label: "YPosition", type: "float", value: 2 }
        ] },
        { typeId: 9, fields: [
          { label: "Tag", type: "cexostring", value: "legacy" },
          { label: "Appearance", type: "byte", value: 255 },
          { label: "XPosition", type: "float", value: 3 },
          { label: "YPosition", type: "float", value: 3 }
        ] },
        { typeId: 9, fields: [
          { label: "Tag", type: "resref", value: "wrong_tag_type" },
          { label: "Appearance", type: "dword", value: 42 },
          { label: "XPosition", type: "float", value: 4 },
          { label: "YPosition", type: "float", value: 4 }
        ] },
        { typeId: 9, fields: [
          { label: "Tag", type: "cexostring", value: "first" },
          { label: "Tag", type: "cexostring", value: "second" },
          { label: "Appearance", type: "dword", value: 7 },
          { label: "XPosition", type: "float", value: 5 },
          { label: "YPosition", type: "float", value: 5 }
        ] },
        { typeId: 9, fields: [
          { label: "tag", type: "cexostring", value: "noncanonical" },
          { label: "Appearance", type: "dword", value: 9 },
          { label: "XPosition", type: "float", value: 6 },
          { label: "YPosition", type: "float", value: 6 }
        ] },
        { typeId: 9, fields: [
          { label: "Tag", type: "cexostring", value: "valid_tag" },
          { label: "Appearance", type: "word", value: 10 },
          { label: "XPosition", type: "float", value: 7 },
          { label: "YPosition", type: "float", value: 7 }
        ] },
        { typeId: 9, fields: [
          { label: "Tag", type: "cexostring", value: "valid_tag" },
          { label: "Appearance", type: "dword", value: 11 },
          { label: "Appearance", type: "dword", value: 12 },
          { label: "XPosition", type: "float", value: 8 },
          { label: "YPosition", type: "float", value: 8 }
        ] },
        { typeId: 9, fields: [
          { label: "Tag", type: "cexostring", value: "valid_tag" },
          { label: "appearance", type: "dword", value: 13 },
          { label: "XPosition", type: "float", value: 9 },
          { label: "YPosition", type: "float", value: 9 }
        ] },
        { typeId: 8, fields: [
          { label: "Tag", type: "cexostring", value: "wrong_struct" },
          { label: "Appearance", type: "dword", value: 14 },
          { label: "XPosition", type: "float", value: 10 },
          { label: "YPosition", type: "float", value: 10 }
        ] }
      ],
      "GIT "
    );

    const placeables = parseAreaObjectsFromGitGff(bytes)?.placeables ?? [];
    expect(placeables[0]?.placeableBasicIdentity).toEqual({
      tag: { present: true, value: "" },
      appearance: { present: true, nativeType: "dword", value: 0xffff_ffff }
    });
    expect(placeables[1]?.placeableBasicIdentity).toEqual({
      tag: { present: false },
      appearance: { present: false }
    });
    expect(placeables[2]?.placeableBasicIdentity).toEqual({
      tag: { present: true, value: "legacy" },
      appearance: { present: true, nativeType: "byte", value: 255 }
    });
    expect(placeables[3]?.placeableBasicIdentity).toBeUndefined();
    expect(placeables[4]?.placeableBasicIdentity).toBeUndefined();
    expect(placeables[5]?.placeableBasicIdentity).toBeUndefined();
    expect(placeables[6]?.placeableBasicIdentity).toBeUndefined();
    expect(placeables[7]?.placeableBasicIdentity).toBeUndefined();
    expect(placeables[8]?.placeableBasicIdentity).toBeUndefined();
    expect(placeables[9]?.placeableBasicIdentity).toBeUndefined();

    const crossFamilyBytes = buildNestedGffBuffer([
      { fields: [{ label: "Door List", type: "list", value: [1] }] },
      { typeId: 9, fields: [
        { label: "Tag", type: "cexostring", value: "must_not_cross_family" },
        { label: "Appearance", type: "dword", value: 15 },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 1 }
      ] }
    ], "GIT ");
    expect(parseAreaObjectsFromGitGff(crossFamilyBytes)?.doors[0])
      .not.toHaveProperty("placeableBasicIdentity");

    const sameValueLegacyBytes = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
      { typeId: 9, fields: [
        { label: "Tag", type: "cexostring", value: "legacy" },
        { label: "Appearance", type: "byte", value: 7 },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 1 }
      ] }
    ], "GIT ");
    const sameValueDwordBytes = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
      { typeId: 9, fields: [
        { label: "Tag", type: "cexostring", value: "legacy" },
        { label: "Appearance", type: "dword", value: 7 },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 1 }
      ] }
    ], "GIT ");
    expect(parseAreaObjectsFromGitGff(sameValueLegacyBytes)?.dependencyFingerprint)
      .not.toBe(parseAreaObjectsFromGitGff(sameValueDwordBytes)?.dependencyFingerprint);
  });

  it("preserves exact raw Placeable LocName and Description storage provenance", () => {
    const bytes = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1, 2, 3, 4] }] },
      { typeId: 9, fields: [
        {
          label: "LocName",
          type: "cexolocstring",
          value: {
            strRef: 0xffff_ffff,
            entries: [
              { languageId: 0, textBytes: Buffer.from("Chest", "ascii") },
              { languageId: 0, textBytes: Buffer.alloc(0) },
            ],
          },
        },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 1 },
      ] },
      { typeId: 9, fields: [
        { label: "XPosition", type: "float", value: 2 },
        { label: "YPosition", type: "float", value: 2 },
      ] },
      { typeId: 9, fields: [
        {
          label: "Description",
          type: "cexolocstring",
          value: {
            strRef: 0,
            entries: [{ languageId: 0xffff_ffff, textBytes: Buffer.from([0x80, 0xff]) }],
          },
        },
        { label: "XPosition", type: "float", value: 3 },
        { label: "YPosition", type: "float", value: 3 },
      ] },
      { typeId: 9, fields: [
        {
          label: "LocName",
          type: "cexolocstring",
          value: { strRef: 0, entries: [] },
        },
        { label: "XPosition", type: "float", value: 4 },
        { label: "YPosition", type: "float", value: 4 },
      ] },
    ], "GIT ");

    const parsed = parseAreaObjectsFromGitGff(bytes);
    expect(parsed?.placeables[0]).toMatchObject({
      placeableLocalizedStrings: {
        locName: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [
            { languageId: 0, textBytesBase64: "Q2hlc3Q=" },
            { languageId: 0, textBytesBase64: "" },
          ],
        },
        description: { present: false },
      },
    });
    expect(parsed?.placeables[1]).toMatchObject({
      placeableLocalizedStrings: {
        locName: { present: false },
        description: { present: false },
      },
    });
    expect(parsed?.placeables[2]).toMatchObject({
      placeableLocalizedStrings: {
        locName: { present: false },
        description: {
          present: true,
          strRef: 0,
          entries: [{ languageId: 0xffff_ffff, textBytesBase64: "gP8=" }],
        },
      },
    });
    expect(parsed?.placeables[3]).toMatchObject({
      placeableLocalizedStrings: {
        locName: { present: true, strRef: 0, entries: [] },
        description: { present: false },
      },
    });

    const changedLanguageId = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
      { typeId: 9, fields: [
        {
          label: "LocName",
          type: "cexolocstring",
          value: {
            strRef: 0xffff_ffff,
            entries: [
              { languageId: 1, textBytes: Buffer.from("Chest", "ascii") },
              { languageId: 0, textBytes: Buffer.alloc(0) },
            ],
          },
        },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 1 },
      ] },
    ], "GIT ");
    expect(parsed?.dependencyFingerprint)
      .not.toBe(parseAreaObjectsFromGitGff(changedLanguageId)?.dependencyFingerprint);

    const wrongFamily = buildNestedGffBuffer([
      { fields: [{ label: "Door List", type: "list", value: [1] }] },
      { typeId: 9, fields: [
        {
          label: "LocName",
          type: "cexolocstring",
          value: { strRef: 1, entries: [] },
        },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 1 },
      ] },
    ], "GIT ");
    expect(parseAreaObjectsFromGitGff(wrongFamily)?.doors[0])
      .not.toHaveProperty("placeableLocalizedStrings");
  });

  it("omits Placeable localized-string provenance for malformed or over-budget storage", () => {
    const oversizedEntries = Array.from({ length: 65 }, (_, languageId) => ({
      languageId,
      textBytes: Buffer.alloc(0),
    }));
    const aggregateOverBudgetEntries = [
      ...Array.from({ length: 4 }, (_, languageId) => ({
        languageId,
        textBytes: Buffer.alloc(16_384, languageId),
      })),
      { languageId: 4, textBytes: Buffer.alloc(1) },
    ];
    const rawVariants: StructDef[] = [
      { typeId: 8, fields: [{ label: "LocName", type: "cexolocstring", value: { strRef: 1, entries: [] } }] },
      { typeId: 9, fields: [{ label: "locName", type: "cexolocstring", value: { strRef: 1, entries: [] } }] },
      { typeId: 9, fields: [{ label: "LocName", type: "cexostring", value: "wrong-type" }] },
      { typeId: 9, fields: [{ label: "LocName", type: "cexolocstring", value: {
        strRef: 1,
        entries: [],
        fieldTypeIdOverride: FIELD_TYPE.CEXOSTRING,
      } }] },
      { typeId: 9, fields: [
        { label: "LocName", type: "cexolocstring", value: { strRef: 1, entries: [] } },
        { label: "LocName", type: "cexolocstring", value: { strRef: 2, entries: [] } },
      ] },
      { typeId: 9, fields: [{
        label: "LocName",
        type: "cexolocstring",
        value: { strRef: 1, entries: [], trailingBytes: Buffer.from([0xaa]) },
      }] },
      { typeId: 9, fields: [{
        label: "LocName",
        type: "cexolocstring",
        value: {
          strRef: 1,
          entries: [{ languageId: 0, textBytes: Buffer.from("x"), }],
          firstDeclaredTextLengthDelta: 1,
        },
      }] },
      { typeId: 9, fields: [{ label: "LocName", type: "cexolocstring", value: { strRef: 1, entries: oversizedEntries } }] },
      { typeId: 9, fields: [{ label: "LocName", type: "cexolocstring", value: {
        strRef: 1,
        entries: [],
        declaredCountDelta: 1,
      } }] },
      { typeId: 9, fields: [{ label: "LocName", type: "cexolocstring", value: {
        strRef: 1,
        entries: [],
        truncatePayloadBytes: 1,
      } }] },
      { typeId: 9, fields: [{
        label: "LocName",
        type: "cexolocstring",
        value: { strRef: 1, entries: [{ languageId: 0, textBytes: Buffer.alloc(16_385) }] },
      }] },
      { typeId: 9, fields: [{
        label: "LocName",
        type: "cexolocstring",
        value: { strRef: 1, entries: aggregateOverBudgetEntries },
      }] },
      { typeId: 9, fields: [
        { label: "LocName", type: "cexolocstring", value: { strRef: 1, entries: [] } },
        { label: "Description", type: "cexolocstring", value: {
          strRef: 2,
          entries: [],
          trailingBytes: Buffer.from([0xbb]),
        } },
      ] },
    ];
    const variants = rawVariants.map((entry, index): StructDef => ({
      ...entry,
      fields: [
        ...entry.fields,
        { label: "XPosition", type: "float", value: index + 1 },
        { label: "YPosition", type: "float", value: index + 1 },
      ],
    }));
    const bytes = buildNestedGffBuffer([
      { fields: [{
        label: "Placeable List",
        type: "list",
        value: variants.map((_, index) => index + 1),
      }] },
      ...variants,
    ], "GIT ");

    const placeables = parseAreaObjectsFromGitGff(bytes)?.placeables ?? [];
    expect(placeables).toHaveLength(variants.length);
    placeables.forEach((placeable) => {
      expect(placeable).not.toHaveProperty("placeableLocalizedStrings");
    });

    const fieldDataOverrun = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
      { typeId: 9, fields: [
        { label: "LocName", type: "cexolocstring", value: {
          strRef: 1,
          entries: [{ languageId: 0, textBytes: Buffer.from("x") }],
          firstDeclaredTextLengthDelta: 4,
          declaredTotalSizeDelta: 4,
        } },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 1 },
      ] },
    ], "GIT ");
    expect(parseAreaObjectsFromGitGff(fieldDataOverrun)?.placeables[0])
      .not.toHaveProperty("placeableLocalizedStrings");

    const exactBoundaryBytes = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
      { typeId: 9, fields: [
        { label: "LocName", type: "cexolocstring", value: {
          strRef: 1,
          entries: Array.from({ length: 64 }, (_, languageId) => ({
            languageId,
            textBytes: languageId < 4 ? Buffer.alloc(16_384, languageId) : Buffer.alloc(0),
          })),
        } },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 1 },
      ] },
    ], "GIT ");
    const boundary = parseAreaObjectsFromGitGff(exactBoundaryBytes)?.placeables[0];
    expect(boundary).toHaveProperty("placeableLocalizedStrings.locName.entries", expect.any(Array));
    expect((boundary as any).placeableLocalizedStrings.locName.entries).toHaveLength(64);
  });

  it("preserves native Placeable ItemList count while omitting an entry without TemplateResRef", () => {
    const bytes = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
      { fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_chest" },
        { label: "ItemList", type: "list", value: [2] },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ] },
      { fields: [
        { label: "Repos_PosX", type: "word", value: 1 },
        { label: "Repos_Posy", type: "word", value: 2 },
      ] },
    ], "GIT ");

    const metadata = parseAreaObjectsFromGitGff(bytes)?.placeables[0]?.placeableMetadata;
    expect(metadata?.inventoryItemListCount).toBe(1);
    expect(metadata?.inventoryItemListEntries).toBe("[]");
  });

  it("exposes Placeable durability/save provenance only from exact native Byte fields", () => {
    const bytes = buildNestedGffBuffer(
      [
        { fields: [{ label: "Placeable List", type: "list", value: [1, 2] }] },
        {
          typeId: 9,
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_valid_bytes" },
            { label: "Hardness", type: "byte", value: 255 },
            { label: "Fort", type: "byte", value: 16 },
            { label: "Ref", type: "byte", value: 0 },
            { label: "Will", type: "byte", value: 1 },
            { label: "HP", type: "short", value: 15 },
            { label: "CurrentHP", type: "short", value: 10 },
            { label: "X", type: "float", value: 1 },
            { label: "Y", type: "float", value: 2 },
          ],
        },
        {
          typeId: 9,
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_wrong_bytes" },
            { label: "Hardness", type: "word", value: 5 },
            { label: "Fort", type: "int", value: 16 },
            { label: "Ref", type: "dword", value: 0 },
            { label: "Will", type: "short", value: 0 },
            { label: "X", type: "float", value: 3 },
            { label: "Y", type: "float", value: 4 },
          ],
        },
      ],
      "GIT ",
    );

    const [valid, wrongTypes] = parseAreaObjectsFromGitGff(bytes)!.placeables;
    expect(valid?.placeableMetadata).toEqual(expect.objectContaining({
      hardness: 255,
      fortitudeSave: 16,
      reflexSave: 0,
      willSave: 1,
    }));
    expect(wrongTypes?.placeableMetadata).not.toHaveProperty("hardness");
    expect(wrongTypes?.placeableMetadata).not.toHaveProperty("fortitudeSave");
    expect(wrongTypes?.placeableMetadata).not.toHaveProperty("reflexSave");
    expect(wrongTypes?.placeableMetadata).not.toHaveProperty("willSave");
  });

  it("exposes presence-sensitive Placeable animation state only from an admitted native Byte", () => {
    const bytes = buildNestedGffBuffer(
      [
        { fields: [{ label: "Placeable List", type: "list", value: [1, 2, 3, 4] }] },
        { fields: [
          { label: "TemplateResRef", type: "resref", value: "plc_animation_exact" },
          { label: "AnimationState", type: "byte", value: 2 },
          { label: "X", type: "float", value: 1 },
          { label: "Y", type: "float", value: 2 },
        ] },
        { fields: [
          { label: "TemplateResRef", type: "resref", value: "plc_animation_wrong_type" },
          { label: "AnimationState", type: "word", value: 1 },
          { label: "X", type: "float", value: 3 },
          { label: "Y", type: "float", value: 4 },
        ] },
        { fields: [
          { label: "TemplateResRef", type: "resref", value: "plc_animation_out_of_set" },
          { label: "AnimationState", type: "byte", value: 3 },
          { label: "X", type: "float", value: 5 },
          { label: "Y", type: "float", value: 6 },
        ] },
        { fields: [
          { label: "TemplateResRef", type: "resref", value: "plc_animation_absent" },
          { label: "X", type: "float", value: 7 },
          { label: "Y", type: "float", value: 8 },
        ] },
      ],
      "GIT ",
    );

    const [exact, wrongType, outOfSet, absent] = parseAreaObjectsFromGitGff(bytes)!.placeables;
    expect(exact?.placeableMetadata).toHaveProperty("animationState", 2);
    expect(wrongType?.placeableMetadata).not.toHaveProperty("animationState");
    expect(outOfSet?.placeableMetadata).not.toHaveProperty("animationState");
    expect(absent?.placeableMetadata).not.toHaveProperty("animationState");
  });

  it("exposes exact Placeable TemplateResRef provenance only for one admitted native ResRef", () => {
    const bytes = buildNestedGffBuffer(
      [
        { fields: [{ label: "Placeable List", type: "list", value: [1, 2, 3, 4, 5, 6] }] },
        { typeId: 9, fields: [
          { label: "TemplateResRef", type: "resref", value: "plc_exact" },
          { label: "X", type: "float", value: 1 },
          { label: "Y", type: "float", value: 1 },
        ] },
        { typeId: 9, fields: [
          { label: "TemplateResRef", type: "cexostring", value: "plc_wrong" },
          { label: "X", type: "float", value: 2 },
          { label: "Y", type: "float", value: 2 },
        ] },
        { typeId: 9, fields: [
          { label: "TemplateResRef", type: "resref", value: "plc_first" },
          { label: "TemplateResRef", type: "resref", value: "plc_second" },
          { label: "X", type: "float", value: 3 },
          { label: "Y", type: "float", value: 3 },
        ] },
        { typeId: 9, fields: [
          { label: "TemplateResRef", type: "resref", value: "PLC_UPPER" },
          { label: "X", type: "float", value: 4 },
          { label: "Y", type: "float", value: 4 },
        ] },
        { typeId: 9, fields: [
          { label: "TemplateResRef", type: "resref", value: "" },
          { label: "X", type: "float", value: 5 },
          { label: "Y", type: "float", value: 5 },
        ] },
        { typeId: 9, fields: [
          { label: "X", type: "float", value: 6 },
          { label: "Y", type: "float", value: 6 },
        ] },
      ],
      "GIT ",
    );

    const [exact, wrongType, duplicate, uppercase, empty, absent] =
      parseAreaObjectsFromGitGff(bytes)!.placeables;
    expect(exact).toHaveProperty("placeableTemplateResRef", "plc_exact");
    for (const placement of [wrongType, duplicate, uppercase, empty, absent]) {
      expect(placement).not.toHaveProperty("placeableTemplateResRef");
    }
  });

  it("emits HP and CurrentHP only from one complete exact native Placeable Short pair", () => {
    const definitions: StructDef[] = [
      { fields: [{ label: "Placeable List", type: "list", value: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }] },
      { typeId: 9, fields: [
        { label: "HP", type: "short", value: 15 },
        { label: "CurrentHP", type: "short", value: 45 },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 1 },
      ] },
      { typeId: 9, fields: [
        { label: "HP", type: "short", value: 10_000 },
        { label: "CurrentHP", type: "short", value: -32_768 },
        { label: "XPosition", type: "float", value: 2 },
        { label: "YPosition", type: "float", value: 2 },
      ] },
      { typeId: 9, fields: [
        { label: "HP", type: "short", value: 0 },
        { label: "CurrentHP", type: "short", value: 1 },
        { label: "XPosition", type: "float", value: 3 },
        { label: "YPosition", type: "float", value: 3 },
      ] },
      { typeId: 9, fields: [
        { label: "HP", type: "short", value: 15 },
        { label: "XPosition", type: "float", value: 4 },
        { label: "YPosition", type: "float", value: 4 },
      ] },
      { typeId: 9, fields: [
        { label: "HP", type: "word", value: 15 },
        { label: "CurrentHP", type: "short", value: 45 },
        { label: "XPosition", type: "float", value: 5 },
        { label: "YPosition", type: "float", value: 5 },
      ] },
      { typeId: 9, fields: [
        { label: "hp", type: "short", value: 15 },
        { label: "CurrentHP", type: "short", value: 45 },
        { label: "XPosition", type: "float", value: 6 },
        { label: "YPosition", type: "float", value: 6 },
      ] },
      { typeId: 9, fields: [
        { label: "HP", type: "short", value: 15 },
        { label: "HP", type: "short", value: 16 },
        { label: "CurrentHP", type: "short", value: 45 },
        { label: "XPosition", type: "float", value: 7 },
        { label: "YPosition", type: "float", value: 7 },
      ] },
      { typeId: 9, fields: [
        { label: "HP", type: "short", value: 15 },
        { label: "currenthp", type: "short", value: 45 },
        { label: "XPosition", type: "float", value: 8 },
        { label: "YPosition", type: "float", value: 8 },
      ] },
      { typeId: 8, fields: [
        { label: "HP", type: "short", value: 15 },
        { label: "CurrentHP", type: "short", value: 45 },
        { label: "XPosition", type: "float", value: 9 },
        { label: "YPosition", type: "float", value: 9 },
      ] },
      { typeId: 9, fields: [
        { label: "HP", type: "short", value: 15 },
        { label: "CurrentHP", type: "word", value: 45 },
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 10 },
      ] },
    ];
    const placeables = parseAreaObjectsFromGitGff(buildNestedGffBuffer(definitions, "GIT "))!.placeables;

    expect(placeables[0]?.placeableMetadata).toMatchObject({ hitPoints: 15, currentHitPoints: 45 });
    expect(placeables[1]?.placeableMetadata).toMatchObject({
      hitPoints: 10_000,
      currentHitPoints: -32_768,
    });
    for (const placeable of placeables.slice(2)) {
      expect(placeable?.placeableMetadata).not.toHaveProperty("hitPoints");
      expect(placeable?.placeableMetadata).not.toHaveProperty("currentHitPoints");
    }

    const crossFamily = buildNestedGffBuffer([
      { fields: [{ label: "Door List", type: "list", value: [1] }] },
      { typeId: 9, fields: [
        { label: "HP", type: "short", value: 15 },
        { label: "CurrentHP", type: "short", value: 45 },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 1 },
      ] },
    ], "GIT ");
    expect(parseAreaObjectsFromGitGff(crossFamily)?.doors[0]?.placeableMetadata).toBeUndefined();
  });

  it("omits HP provenance from a Placeable whose struct field-index table is malformed", () => {
    const bytes = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
      { typeId: 9, fields: [
        { label: "HP", type: "short", value: 15 },
        { label: "CurrentHP", type: "short", value: 45 },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 1 },
      ] },
    ], "GIT ");
    const malformed = Buffer.from(bytes);
    const structOffset = malformed.readUInt32LE(8);
    const fieldIndicesOffset = malformed.readUInt32LE(40);
    const placeableFieldIndicesRelativeOffset = malformed.readUInt32LE(structOffset + 12 + 4);
    malformed.writeUInt32LE(
      0xffff_ffff,
      fieldIndicesOffset + placeableFieldIndicesRelativeOffset,
    );

    const parsed = parseAreaObjectsFromGitGff(malformed);
    expect(parsed).not.toBeNull();
    expect(parsed?.placeables).toEqual([]);
  });

  it("pairs exact GIT/GIC Placeable ordinals and preserves present empty editor comments", () => {
    const git = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1, 2, 3] }] },
      {
        typeId: 9,
        fields: [
          { label: "TemplateResRef", type: "resref", value: "plc_watertrough" },
          { label: "XPosition", type: "float", value: 10 },
          { label: "YPosition", type: "float", value: 20 },
        ],
      },
      {
        typeId: 9,
        fields: [
          { label: "TemplateResRef", type: "resref", value: "plc_chest" },
          { label: "XPosition", type: "float", value: 30 },
          { label: "YPosition", type: "float", value: 40 },
        ],
      },
      {
        typeId: 9,
        fields: [
          { label: "TemplateResRef", type: "resref", value: "plc_statue" },
          { label: "XPosition", type: "float", value: 50 },
          { label: "YPosition", type: "float", value: 60 },
        ],
      },
    ], "GIT ");
    const gic = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1, 2, 3] }] },
      { typeId: 9, fields: [{ label: "Comment", type: "cexostring", value: "Water Trough" }] },
      { typeId: 9, fields: [{ label: "Comment", type: "cexostring", value: "" }] },
      { typeId: 9, fields: [] },
    ], "GIC ");

    const parsed = parseAreaObjectsFromGitGicGff(git, gic);

    expect(parsed?.placeables[0]?.placeableMetadata).toHaveProperty(
      "editorComment",
      "Water Trough",
    );
    expect(parsed?.placeables[1]?.placeableMetadata).toHaveProperty("editorComment", "");
    expect(parsed?.placeables[2]?.placeableMetadata).not.toHaveProperty("editorComment");
    expect(parsed?.dependencyFingerprint).not.toBe(parseAreaObjectsFromGitGff(git)?.dependencyFingerprint);
    const changedGic = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1, 2, 3] }] },
      { typeId: 9, fields: [{ label: "Comment", type: "cexostring", value: "Changed" }] },
      { typeId: 9, fields: [{ label: "Comment", type: "cexostring", value: "" }] },
      { typeId: 9, fields: [] },
    ], "GIC ");
    expect(parseAreaObjectsFromGitGicGff(git, changedGic)?.dependencyFingerprint)
      .not.toBe(parsed?.dependencyFingerprint);
    expect(parseAreaObjectsFromGitGicGff(git, gic)?.dependencyFingerprint)
      .toBe(parsed?.dependencyFingerprint);
  });

  it("pairs exact GIT/GIC Creature ordinals and preserves present empty editor comments", () => {
    const git = buildNestedGffBuffer([
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [1, 2] },
      ] },
      { typeId: 4, fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
      ] },
      { typeId: 4, fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_guard" },
        { label: "XPosition", type: "float", value: 30 },
        { label: "YPosition", type: "float", value: 40 },
      ] },
    ], "GIT ");
    const gic = buildNestedGffBuffer([
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [1, 2] },
      ] },
      { typeId: 4, fields: [{ label: "Comment", type: "cexostring", value: "" }] },
      { typeId: 4, fields: [{ label: "Comment", type: "cexostring", value: " west guard " }] },
    ], "GIC ");

    const parsed = parseAreaObjectsFromGitGicGff(git, gic);

    expect(parsed?.creatures[0]?.creatureMetadata).toHaveProperty("editorComment", "");
    expect(parsed?.creatures[1]?.creatureMetadata).toHaveProperty(
      "editorComment",
      " west guard ",
    );
    const changedGic = buildNestedGffBuffer([
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [1, 2] },
      ] },
      { typeId: 4, fields: [{ label: "Comment", type: "cexostring", value: "changed" }] },
      { typeId: 4, fields: [{ label: "Comment", type: "cexostring", value: " west guard " }] },
    ], "GIC ");
    expect(parseAreaObjectsFromGitGicGff(git, changedGic)?.dependencyFingerprint)
      .not.toBe(parsed?.dependencyFingerprint);
  });

  it("pairs exact GIT/GIC ground-item ordinals and fingerprints exact editor comments", () => {
    const git = buildNestedGffBuffer([
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [] },
        { label: "List", type: "list", value: [1, 2] },
      ] },
      { typeId: 0, fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_sword" },
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
      ] },
      { typeId: 0, fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_cloth022" },
        { label: "XPosition", type: "float", value: 30 },
        { label: "YPosition", type: "float", value: 40 },
      ] },
    ], "GIT ");
    const gic = buildNestedGffBuffer([
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [] },
        { label: "List", type: "list", value: [1, 2] },
      ] },
      { typeId: 0, fields: [{ label: "Comment", type: "cexostring", value: "" }] },
      { typeId: 0, fields: [{ label: "Comment", type: "cexostring", value: " west item " }] },
    ], "GIC ");

    expect(parseAreaItemEditorCommentsFromGicGff(gic, 2)).toEqual(["", " west item "]);
    const parsed = parseAreaObjectsFromGitGicGff(git, gic);
    expect(parsed?.items[0]?.itemMetadata).toHaveProperty("editorComment", "");
    expect(parsed?.items[1]?.itemMetadata).toHaveProperty("editorComment", " west item ");

    const changedGic = buildNestedGffBuffer([
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [] },
        { label: "List", type: "list", value: [1, 2] },
      ] },
      { typeId: 0, fields: [{ label: "Comment", type: "cexostring", value: "changed" }] },
      { typeId: 0, fields: [{ label: "Comment", type: "cexostring", value: " west item " }] },
    ], "GIC ");
    expect(parseAreaObjectsFromGitGicGff(git, changedGic)?.dependencyFingerprint)
      .not.toBe(parsed?.dependencyFingerprint);
  });

  it("pairs exact GIT/GIC Store ordinals and fingerprints exact editor comments", () => {
    const git = buildNestedGffBuffer([
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [] },
        { label: "List", type: "list", value: [] },
        { label: "StoreList", type: "list", value: [1, 2] },
      ] },
      { typeId: 11, fields: [
        { label: "TemplateResRef", type: "resref", value: "x2_merc_dye" },
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
      ] },
      { typeId: 11, fields: [
        { label: "TemplateResRef", type: "resref", value: "merchant_two" },
        { label: "XPosition", type: "float", value: 30 },
        { label: "YPosition", type: "float", value: 40 },
      ] },
    ], "GIT ");
    const gic = buildNestedGffBuffer([
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [] },
        { label: "List", type: "list", value: [] },
        { label: "StoreList", type: "list", value: [1, 2] },
      ] },
      { typeId: 11, fields: [{ label: "Comment", type: "cexostring", value: "" }] },
      { typeId: 11, fields: [{ label: "Comment", type: "cexostring", value: " west merchant " }] },
    ], "GIC ");

    expect(parseAreaStoreEditorCommentsFromGicGff(gic, 2)).toEqual([
      "",
      " west merchant ",
    ]);
    const parsed = parseAreaObjectsFromGitGicGff(git, gic);
    expect(parsed?.stores[0]?.storeMetadata).toHaveProperty("editorComment", "");
    expect(parsed?.stores[1]?.storeMetadata).toHaveProperty(
      "editorComment",
      " west merchant ",
    );

    const changedGic = buildNestedGffBuffer([
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [] },
        { label: "List", type: "list", value: [] },
        { label: "StoreList", type: "list", value: [1, 2] },
      ] },
      { typeId: 11, fields: [{ label: "Comment", type: "cexostring", value: "changed" }] },
      { typeId: 11, fields: [{ label: "Comment", type: "cexostring", value: " west merchant " }] },
    ], "GIC ");
    expect(parseAreaObjectsFromGitGicGff(git, changedGic)?.dependencyFingerprint)
      .not.toBe(parsed?.dependencyFingerprint);
  });

  it.each([
    ["a wrong paired struct type", 9, "comment"],
    ["a duplicate Comment", 11, "duplicate"],
    ["a wrong Comment type", 11, "wrong-type"],
    ["a NUL-containing Comment", 11, "nul"],
  ] as const)("fails closed for Store GIC with %s", (_label, typeId, shape) => {
    const commentFields: SupportedField[] = shape === "duplicate"
      ? [
          { label: "Comment", type: "cexostring", value: "one" },
          { label: "Comment", type: "cexostring", value: "two" },
        ]
      : shape === "wrong-type"
        ? [{ label: "Comment", type: "resref", value: "wrong" }]
        : [{
            label: "Comment",
            type: "cexostring",
            value: shape === "nul" ? "bad\0comment" : "comment",
          }];
    const gic = buildNestedGffBuffer([
      { fields: [{ label: "StoreList", type: "list", value: [1] }] },
      { typeId, fields: commentFields },
    ], "GIC ");

    expect(parseAreaStoreEditorCommentsFromGicGff(gic, 1)).toBeNull();
  });

  it("pairs exact retained Encounter GIC Comments without normalizing text", () => {
    const git = buildNestedGffBuffer([
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [] },
        { label: "List", type: "list", value: [] },
        { label: "StoreList", type: "list", value: [] },
        { label: "Encounter List", type: "list", value: [1, 2] },
      ] },
      { typeId: 7, fields: [
        { label: "TemplateResRef", type: "resref", value: "x2_gnoll001" },
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
      ] },
      { typeId: 7, fields: [
        { label: "TemplateResRef", type: "resref", value: "x2_gnoll002" },
        { label: "XPosition", type: "float", value: 30 },
        { label: "YPosition", type: "float", value: 40 },
      ] },
    ], "GIT ");
    const gic = buildNestedGffBuffer([
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [] },
        { label: "List", type: "list", value: [] },
        { label: "StoreList", type: "list", value: [] },
        { label: "Encounter List", type: "list", value: [1, 2] },
      ] },
      { typeId: 7, fields: [{ label: "Comment", type: "cexostring", value: "" }] },
      { typeId: 7, fields: [
        { label: "CommentProbe", type: "cexostring", value: "ignored" },
        { label: "Comment", type: "cexostring", value: " west gate " },
      ] },
    ], "GIC ");

    expect(parseAreaEncounterEditorCommentsFromGicGff(gic, 2)).toEqual([
      "",
      " west gate ",
    ]);
    const parsed = parseAreaObjectsFromGitGicGff(git, gic);
    expect(parsed?.encounters[0]?.encounterMetadata).toEqual({ editorComment: "" });
    expect(parsed?.encounters[1]?.encounterMetadata).toEqual({
      editorComment: " west gate ",
    });
  });

  it.each([
    ["wrong struct type", 9, [{ label: "Comment", type: "cexostring", value: "x" }]],
    ["duplicate Comment", 7, [
      { label: "Comment", type: "cexostring", value: "one" },
      { label: "Comment", type: "cexostring", value: "two" },
    ]],
    ["wrong Comment type", 7, [{ label: "Comment", type: "resref", value: "x" }]],
    ["NUL Comment", 7, [{ label: "Comment", type: "cexostring", value: "bad\0text" }]],
  ] as const)("rejects Encounter GIC Comment provenance with %s", (
    _label,
    typeId,
    fields,
  ) => {
    const gic = buildNestedGffBuffer([
      { fields: [{ label: "Encounter List", type: "list", value: [1] }] },
      { typeId, fields: fields as unknown as SupportedField[] },
    ], "GIC ");
    expect(parseAreaEncounterEditorCommentsFromGicGff(gic, 1)).toBeNull();
  });

  it.each([
    ["a missing paired ordinal", [
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [] },
        { label: "List", type: "list", value: [] },
      ] },
    ]],
    ["a wrong paired struct type", [
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [] },
        { label: "List", type: "list", value: [1] },
      ] },
      { typeId: 9, fields: [{ label: "Comment", type: "cexostring", value: "item" }] },
    ]],
    ["a duplicate Comment", [
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [] },
        { label: "List", type: "list", value: [1] },
      ] },
      { typeId: 0, fields: [
        { label: "Comment", type: "cexostring", value: "one" },
        { label: "Comment", type: "cexostring", value: "two" },
      ] },
    ]],
    ["a wrong Comment type", [
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [] },
        { label: "List", type: "list", value: [1] },
      ] },
      { typeId: 0, fields: [{ label: "Comment", type: "resref", value: "wrong" }] },
    ]],
  ])("fails closed instead of merging GIC ground items with %s", (_label, structs) => {
    const git = buildNestedGffBuffer([
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [] },
        { label: "List", type: "list", value: [1] },
      ] },
      { typeId: 0, fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_sword" },
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
      ] },
    ], "GIT ");
    expect(parseAreaObjectsFromGitGicGff(
      git,
      buildNestedGffBuffer(structs as StructDef[], "GIC "),
    )).toBeNull();
  });

  it.each([
    ["a missing paired ordinal", [
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [] },
      ] },
    ]],
    ["a wrong paired struct type", [
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [1] },
      ] },
      { typeId: 9, fields: [{ label: "Comment", type: "cexostring", value: "comment" }] },
    ]],
    ["a duplicate Comment field", [
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [1] },
      ] },
      { typeId: 4, fields: [
        { label: "Comment", type: "cexostring", value: "one" },
        { label: "Comment", type: "cexostring", value: "two" },
      ] },
    ]],
    ["a wrong Comment type", [
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [1] },
      ] },
      { typeId: 4, fields: [{ label: "Comment", type: "resref", value: "wrong" }] },
    ]],
  ])("fails closed instead of merging GIC Creatures with %s", (_label, gicStructs) => {
    const git = buildNestedGffBuffer([
      { fields: [
        { label: "Placeable List", type: "list", value: [] },
        { label: "Creature List", type: "list", value: [1] },
      ] },
      { typeId: 4, fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
      ] },
    ], "GIT ");

    expect(parseAreaObjectsFromGitGicGff(
      git,
      buildNestedGffBuffer(gicStructs as StructDef[], "GIC "),
    )).toBeNull();
  });

  it.each([
    ["a missing paired ordinal", [{ fields: [{ label: "Placeable List", type: "list", value: [] }] }]],
    ["a wrong paired struct type", [
      { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
      { typeId: 8, fields: [{ label: "Comment", type: "cexostring", value: "Water Trough" }] },
    ]],
    ["a duplicate Comment field", [
      { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
      { typeId: 9, fields: [
        { label: "Comment", type: "cexostring", value: "one" },
        { label: "Comment", type: "cexostring", value: "two" },
      ] },
    ]],
    ["a wrong Comment type", [
      { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
      { typeId: 9, fields: [{ label: "Comment", type: "resref", value: "wrong" }] },
    ]],
    ["a NUL-containing Comment", [
      { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
      { typeId: 9, fields: [{ label: "Comment", type: "cexostring", value: "bad\0comment" }] },
    ]],
  ])("fails closed instead of merging GIC Placeables with %s", (_label, gicStructs) => {
    const git = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_watertrough" },
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
      ] },
    ], "GIT ");

    expect(parseAreaObjectsFromGitGicGff(
      git,
      buildNestedGffBuffer(gicStructs as StructDef[], "GIC "),
    )).toBeNull();
  });

  it("parses only exact bounded GIC Comment fields and ignores unrelated paired fields", () => {
    const gic = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1, 2] }] },
      { typeId: 9, fields: [
        { label: "CommentProbe", type: "cexostring", value: "not provenance" },
        { label: "Comment", type: "cexostring", value: " exact comment " },
      ] },
      { typeId: 9, fields: [] },
    ], "GIC ");

    expect(parseAreaPlaceableEditorCommentsFromGicGff(gic, 2)).toEqual([
      " exact comment ",
      undefined,
    ]);
    expect(parseAreaPlaceableEditorCommentsFromGicGff(gic, -1)).toBeNull();
    expect(parseAreaPlaceableEditorCommentsFromGicGff(gic, 0.5)).toBeNull();
    expect(parseAreaPlaceableEditorCommentsFromGicGff(gic, 1)).toBeNull();
    expect(parseAreaPlaceableEditorCommentsFromGicGff(Buffer.from("not-gic"), 0)).toBeNull();
    expect(parseAreaPlaceableEditorCommentsFromGicGff(
      buildNestedGffBuffer([{ fields: [{ label: "Placeable List", type: "list", value: [] }] }], "GIT "),
      0,
    )).toBeNull();
    const wrongVersion = Buffer.from(gic);
    wrongVersion.write("V9.9", 4, 4, "ascii");
    expect(parseAreaPlaceableEditorCommentsFromGicGff(wrongVersion, 2)).toBeNull();
  });

  it.each([
    ["missing exact root list", [{ fields: [] }]],
    ["wrong root field type", [{ fields: [{ label: "Placeable List", type: "dword", value: 0 }] }]],
    ["duplicate root list", [{ fields: [
      { label: "Placeable List", type: "list", value: [] },
      { label: "Placeable List", type: "list", value: [] },
    ] }]],
    ["duplicate struct index", [
      { fields: [{ label: "Placeable List", type: "list", value: [1, 1] }] },
      { typeId: 9, fields: [] },
    ]],
    ["out-of-range struct index", [
      { fields: [{ label: "Placeable List", type: "list", value: [99] }] },
    ]],
  ])("rejects GIC Comment provenance with %s", (_label, structs) => {
    expect(parseAreaPlaceableEditorCommentsFromGicGff(
      buildNestedGffBuffer(structs as StructDef[], "GIC "),
      0,
    )).toBeNull();
  });

  it("rejects malformed exact-list and struct field index tables", () => {
    const valid = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
      { typeId: 9, fields: [{ label: "Comment", type: "cexostring", value: "comment" }] },
    ], "GIC ");
    expect(parseAreaPlaceableEditorCommentsFromGicGff(
      corruptGffFieldDataOffset(valid, "Placeable List"),
      1,
    )).toBeNull();

    const invalidRootFieldIndex = Buffer.from(valid);
    const structOffset = invalidRootFieldIndex.readUInt32LE(8);
    invalidRootFieldIndex.writeUInt32LE(0xffff_ffff, structOffset + 4);
    expect(parseAreaPlaceableEditorCommentsFromGicGff(invalidRootFieldIndex, 1)).toBeNull();

    const invalidRootLabelIndex = Buffer.from(valid);
    const fieldOffset = invalidRootLabelIndex.readUInt32LE(16);
    invalidRootLabelIndex.writeUInt32LE(0xffff_ffff, fieldOffset + 4);
    expect(parseAreaPlaceableEditorCommentsFromGicGff(invalidRootLabelIndex, 1)).toBeNull();
  });

  it("rejects a non-GIT, non-exact, or ordinal-incomplete GIT half before merging comments", () => {
    const validGic = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
      { typeId: 9, fields: [{ label: "Comment", type: "cexostring", value: "comment" }] },
    ], "GIC ");
    const wrongType = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_probe" },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ] },
    ], "ARE ");
    const missingPlacement = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
      { typeId: 9, fields: [{ label: "TemplateResRef", type: "resref", value: "plc_probe" }] },
    ], "GIT ");
    const wrongStructType = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
      { typeId: 8, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_probe" },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ] },
    ], "GIT ");
    const wrongGitVersion = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_probe" },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ] },
    ], "GIT ");
    wrongGitVersion.write("V9.9", 4, 4, "ascii");

    expect(parseAreaObjectsFromGitGicGff(Buffer.from("invalid"), validGic)).toBeNull();
    expect(parseAreaObjectsFromGitGicGff(wrongType, validGic)).toBeNull();
    expect(parseAreaObjectsFromGitGicGff(missingPlacement, validGic)).toBeNull();
    expect(parseAreaObjectsFromGitGicGff(wrongStructType, validGic)).toBeNull();
    expect(parseAreaObjectsFromGitGicGff(wrongGitVersion, validGic)).toBeNull();
  });

  it("exposes exact presence-sensitive Placeable Conversation and Interruptable provenance", () => {
    const bytes = buildNestedGffBuffer(
      [
        { fields: [{ label: "Placeable List", type: "list", value: [1, 2, 3, 4, 5] }] },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_exact" },
            { label: "Conversation", type: "resref", value: "" },
            { label: "Interruptable", type: "byte", value: 1 },
            { label: "X", type: "float", value: 1 },
            { label: "Y", type: "float", value: 2 },
          ],
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_absent" },
            { label: "X", type: "float", value: 3 },
            { label: "Y", type: "float", value: 4 },
          ],
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_wrong_types" },
            { label: "Conversation", type: "cexostring", value: "dialog" },
            { label: "Interruptable", type: "word", value: 1 },
            { label: "X", type: "float", value: 5 },
            { label: "Y", type: "float", value: 6 },
          ],
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_invalid_byte" },
            { label: "Conversation", type: "resref", value: "valid_dialog" },
            { label: "Interruptable", type: "byte", value: 2 },
            { label: "X", type: "float", value: 7 },
            { label: "Y", type: "float", value: 8 },
          ],
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_zero_byte" },
            { label: "Conversation", type: "resref", value: "zero_dialog" },
            { label: "Interruptable", type: "byte", value: 0 },
            { label: "X", type: "float", value: 9 },
            { label: "Y", type: "float", value: 10 },
          ],
        },
      ],
      "GIT ",
    );

    const [exact, absent, wrongTypes, invalidByte, zeroByte] = parseAreaObjectsFromGitGff(bytes)!.placeables;
    expect(exact?.placeableMetadata).toHaveProperty("conversation", "");
    expect(exact?.placeableMetadata).toHaveProperty("interruptable", 1);
    expect(absent?.placeableMetadata).not.toHaveProperty("conversation");
    expect(absent?.placeableMetadata).not.toHaveProperty("interruptable");
    expect(wrongTypes?.placeableMetadata).not.toHaveProperty("conversation");
    expect(wrongTypes?.placeableMetadata).not.toHaveProperty("interruptable");
    expect(invalidByte?.placeableMetadata).toHaveProperty("conversation", "valid_dialog");
    expect(invalidByte?.placeableMetadata).not.toHaveProperty("interruptable");
    expect(zeroByte?.placeableMetadata).toHaveProperty("interruptable", 0);
  });

  it("omits malformed Placeable Conversation ResRef data instead of inventing provenance", () => {
    const bytes = corruptGffFieldDataOffset(
      buildNestedGffBuffer(
        [
          { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
          {
            fields: [
              { label: "TemplateResRef", type: "resref", value: "plc_malformed" },
              { label: "Conversation", type: "resref", value: "dialog" },
              { label: "X", type: "float", value: 1 },
              { label: "Y", type: "float", value: 2 },
            ],
          },
        ],
        "GIT ",
      ),
      "Conversation",
    );

    const [placeable] = parseAreaObjectsFromGitGff(bytes)!.placeables;
    expect(placeable?.placeableMetadata).not.toHaveProperty("conversation");
  });

  it("exposes Placeable trap provenance only from the six exact native Byte fields", () => {
    const bytes = buildNestedGffBuffer(
      [
        { fields: [{ label: "Placeable List", type: "list", value: [1, 2, 3] }] },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_exact_trap" },
            { label: "TrapFlag", type: "byte", value: 0 },
            { label: "TrapDetectable", type: "byte", value: 1 },
            { label: "TrapDisarmable", type: "byte", value: 1 },
            { label: "TrapOneShot", type: "byte", value: 0 },
            { label: "TrapDetectDC", type: "byte", value: 17 },
            { label: "DetectDC", type: "byte", value: 99 },
            { label: "DisarmDC", type: "byte", value: 255 },
            { label: "X", type: "float", value: 1 },
            { label: "Y", type: "float", value: 2 },
          ],
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_wrong_trap_types" },
            { label: "TrapFlag", type: "word", value: 0 },
            { label: "TrapDetectable", type: "word", value: 1 },
            { label: "TrapDisarmable", type: "int", value: 1 },
            { label: "TrapOneShot", type: "dword", value: 0 },
            { label: "TrapDetectDC", type: "word", value: 17 },
            { label: "DisarmDC", type: "int", value: 15 },
            { label: "X", type: "float", value: 3 },
            { label: "Y", type: "float", value: 4 },
          ],
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_invalid_flags" },
            { label: "TrapFlag", type: "byte", value: 2 },
            { label: "TrapDetectable", type: "byte", value: 2 },
            { label: "TrapDisarmable", type: "byte", value: 2 },
            { label: "TrapOneShot", type: "byte", value: 2 },
            { label: "X", type: "float", value: 5 },
            { label: "Y", type: "float", value: 6 },
          ],
        },
      ],
      "GIT ",
    );

    const [exact, wrongTypes, invalidFlags] = parseAreaObjectsFromGitGff(bytes)!.placeables;
    expect(exact?.placeableMetadata).toEqual(expect.objectContaining({
      trapFlag: 0,
      trapDetectable: 1,
      trapDisarmable: 1,
      trapOneShot: 0,
      detectDc: 17,
      disarmDc: 255,
    }));
    for (const key of [
      "trapFlag",
      "trapDetectable",
      "trapDisarmable",
      "trapOneShot",
      "detectDc",
      "disarmDc",
    ]) {
      expect(wrongTypes?.placeableMetadata).not.toHaveProperty(key);
    }
    for (const key of ["trapFlag", "trapDetectable", "trapDisarmable", "trapOneShot"]) {
      expect(invalidFlags?.placeableMetadata).not.toHaveProperty(key);
    }
  });

  it("distinguishes exact, absent, and malformed Placeable TrapType storage", () => {
    const bytes = buildNestedGffBuffer(
      [
        { fields: [{ label: "Placeable List", type: "list", value: [1, 2, 3, 4] }] },
        {
          typeId: 9,
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_exact_trap_type" },
            { label: "TrapType", type: "byte", value: 47 },
            { label: "X", type: "float", value: 1 },
            { label: "Y", type: "float", value: 2 },
          ],
        },
        {
          typeId: 9,
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_absent_trap_type" },
            { label: "X", type: "float", value: 3 },
            { label: "Y", type: "float", value: 4 },
          ],
        },
        {
          typeId: 9,
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_wrong_trap_type" },
            { label: "TrapType", type: "word", value: 7 },
            { label: "X", type: "float", value: 5 },
            { label: "Y", type: "float", value: 6 },
          ],
        },
        {
          typeId: 9,
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_duplicate_trap_type" },
            { label: "TrapType", type: "byte", value: 1 },
            { label: "TrapType", type: "byte", value: 2 },
            { label: "X", type: "float", value: 7 },
            { label: "Y", type: "float", value: 8 },
          ],
        },
      ],
      "GIT ",
    );

    const wrongCaseBytes = buildNestedGffBuffer(
      [
        { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
        {
          typeId: 9,
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_wrong_case" },
            { label: "traptype", type: "byte", value: 7 },
            { label: "X", type: "float", value: 9 },
            { label: "Y", type: "float", value: 10 },
          ],
        },
      ],
      "GIT ",
    );

    const [exact, absent, wrongType, duplicate] = parseAreaObjectsFromGitGff(bytes)!.placeables;
    const [wrongCase] = parseAreaObjectsFromGitGff(wrongCaseBytes)!.placeables;
    expect(exact?.placeableTrapType).toEqual({
      present: true,
      nativeType: "byte",
      value: 47,
    });
    expect(absent?.placeableTrapType).toEqual({ present: false });
    expect(wrongType?.placeableTrapType).toBeUndefined();
    expect(duplicate?.placeableTrapType).toBeUndefined();
    expect(wrongCase).toBeDefined();
    expect(wrongCase?.placeableTrapType).toBeUndefined();
  });

  it("distinguishes exact, absent, and malformed Placeable BodyBag storage", () => {
    const bytes = buildNestedGffBuffer(
      [
        { fields: [{ label: "Placeable List", type: "list", value: [1, 2, 3, 4, 5] }] },
        { typeId: 9, fields: [
          { label: "TemplateResRef", type: "resref", value: "plc_bodybag_exact" },
          { label: "BodyBag", type: "byte", value: 6 },
          { label: "X", type: "float", value: 1 }, { label: "Y", type: "float", value: 2 },
        ] },
        { typeId: 9, fields: [
          { label: "TemplateResRef", type: "resref", value: "plc_bodybag_absent" },
          { label: "X", type: "float", value: 3 }, { label: "Y", type: "float", value: 4 },
        ] },
        { typeId: 9, fields: [
          { label: "TemplateResRef", type: "resref", value: "plc_bodybag_wrong_type" },
          { label: "BodyBag", type: "word", value: 2 },
          { label: "X", type: "float", value: 5 }, { label: "Y", type: "float", value: 6 },
        ] },
        { typeId: 9, fields: [
          { label: "TemplateResRef", type: "resref", value: "plc_bodybag_duplicate" },
          { label: "BodyBag", type: "byte", value: 1 },
          { label: "BodyBag", type: "byte", value: 2 },
          { label: "X", type: "float", value: 7 }, { label: "Y", type: "float", value: 8 },
        ] },
        { typeId: 9, fields: [
          { label: "TemplateResRef", type: "resref", value: "plc_bodybag_wrong_case" },
          { label: "bodybag", type: "byte", value: 2 },
          { label: "X", type: "float", value: 9 }, { label: "Y", type: "float", value: 10 },
        ] },
      ],
      "GIT ",
    );

    const [exact, absent, wrongType, duplicate, wrongCase] =
      parseAreaObjectsFromGitGff(bytes)!.placeables;
    expect(exact?.placeableBodyBag).toEqual({ present: true, nativeType: "byte", value: 6 });
    expect(absent?.placeableBodyBag).toEqual({ present: false });
    expect(wrongType?.placeableBodyBag).toBeUndefined();
    expect(duplicate?.placeableBodyBag).toBeUndefined();
    expect(wrongCase?.placeableBodyBag).toBeUndefined();
  });

  it("distinguishes exact, absent, and malformed canonical Placeable PortraitId storage", () => {
    const bytes = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1, 2, 3, 4, 5] }] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_portrait_exact" },
        { label: "PortraitId", type: "word", value: 462 },
        { label: "X", type: "float", value: 1 }, { label: "Y", type: "float", value: 2 },
      ] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_portrait_absent" },
        { label: "X", type: "float", value: 3 }, { label: "Y", type: "float", value: 4 },
      ] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_portrait_wrong_type" },
        { label: "PortraitId", type: "dword", value: 462 },
        { label: "X", type: "float", value: 5 }, { label: "Y", type: "float", value: 6 },
      ] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_portrait_duplicate" },
        { label: "PortraitId", type: "word", value: 462 },
        { label: "PortraitId", type: "word", value: 463 },
        { label: "X", type: "float", value: 7 }, { label: "Y", type: "float", value: 8 },
      ] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_portrait_wrong_case" },
        { label: "portraitid", type: "word", value: 462 },
        { label: "X", type: "float", value: 9 }, { label: "Y", type: "float", value: 10 },
      ] },
    ], "GIT ");
    const placeables = parseAreaObjectsFromGitGff(bytes)!.placeables;
    expect(placeables[0]?.placeablePortraitId).toEqual({
      present: true,
      nativeType: "word",
      value: 462,
    });
    expect(placeables[1]?.placeablePortraitId).toEqual({ present: false });
    expect(placeables[2]?.placeablePortraitId).toBeUndefined();
    expect(placeables[3]?.placeablePortraitId).toBeUndefined();
    expect(placeables[4]?.placeablePortraitId).toBeUndefined();
  });

  it("distinguishes exact, absent, and malformed canonical Placeable Faction storage", () => {
    const bytes = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1, 2, 3, 4, 5] }] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_faction_exact" },
        { label: "Faction", type: "dword", value: 2 },
        { label: "X", type: "float", value: 1 }, { label: "Y", type: "float", value: 2 },
      ] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_faction_absent" },
        { label: "X", type: "float", value: 3 }, { label: "Y", type: "float", value: 4 },
      ] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_faction_wrong_type" },
        { label: "Faction", type: "word", value: 2 },
        { label: "X", type: "float", value: 5 }, { label: "Y", type: "float", value: 6 },
      ] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_faction_duplicate" },
        { label: "Faction", type: "dword", value: 2 },
        { label: "Faction", type: "dword", value: 3 },
        { label: "X", type: "float", value: 7 }, { label: "Y", type: "float", value: 8 },
      ] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_faction_wrong_case" },
        { label: "faction", type: "dword", value: 2 },
        { label: "X", type: "float", value: 9 }, { label: "Y", type: "float", value: 10 },
      ] },
    ], "GIT ");
    const placeables = parseAreaObjectsFromGitGff(bytes)!.placeables as any[];
    expect(placeables[0]?.placeableFaction).toEqual({
      present: true,
      nativeType: "dword",
      value: 2,
    });
    expect(placeables[1]?.placeableFaction).toEqual({ present: false });
    expect(placeables[2]?.placeableFaction).toBeUndefined();
    expect(placeables[3]?.placeableFaction).toBeUndefined();
    expect(placeables[4]?.placeableFaction).toBeUndefined();
  });

  it("reads the exact canonical Placeable VarTable in physical order without deduplicating", () => {
    const bytes = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1, 5] }] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_variables_exact" },
        { label: "VarTable", type: "list", value: [2, 3, 4] },
        { label: "X", type: "float", value: 1 }, { label: "Y", type: "float", value: 2 },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "Counter" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: -7 },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "Counter" },
        { label: "Type", type: "dword", value: 2 },
        { label: "Value", type: "float", value: 1.5 },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "" },
        { label: "Type", type: "dword", value: 3 },
        { label: "Value", type: "cexostring", value: "" },
      ] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_variables_absent" },
        { label: "X", type: "float", value: 3 }, { label: "Y", type: "float", value: 4 },
      ] },
    ], "GIT ");

    const placeables = parseAreaObjectsFromGitGff(bytes)!.placeables as any[];
    expect(placeables[0]?.placeableVariables).toEqual({
      expectedEntries: [
        { sourceIndex: 0, name: "Counter", type: "int", value: -7 },
        { sourceIndex: 1, name: "Counter", type: "float", value: 1.5 },
        { sourceIndex: 2, name: "", type: "string", value: "" },
      ],
    });
    expect(placeables[1]?.placeableVariables).toEqual({ expectedEntries: [] });
  });

  it("fails closed on malformed canonical Placeable VarTable storage", () => {
    const bytes = buildNestedGffBuffer([
      { fields: [{ label: "Placeable List", type: "list", value: [1, 3, 5, 7] }] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_variables_wrong_case" },
        { label: "vartable", type: "list", value: [2] },
        { label: "X", type: "float", value: 1 }, { label: "Y", type: "float", value: 2 },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "x" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: 1 },
      ] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_variables_extra" },
        { label: "VarTable", type: "list", value: [4] },
        { label: "X", type: "float", value: 3 }, { label: "Y", type: "float", value: 4 },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "x" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: 1 },
        { label: "Extra", type: "int", value: 1 },
      ] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_variables_unsupported" },
        { label: "VarTable", type: "list", value: [6] },
        { label: "X", type: "float", value: 5 }, { label: "Y", type: "float", value: 6 },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "x" },
        { label: "Type", type: "dword", value: 4 },
        { label: "Value", type: "int", value: 1 },
      ] },
      { typeId: 9, fields: [
        { label: "TemplateResRef", type: "resref", value: "plc_variables_duplicate" },
        { label: "VarTable", type: "list", value: [8] },
        { label: "X", type: "float", value: 7 }, { label: "Y", type: "float", value: 8 },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "x" },
        { label: "Name", type: "cexostring", value: "y" },
        { label: "Type", type: "dword", value: 3 },
        { label: "Value", type: "cexostring", value: "z" },
      ] },
    ], "GIT ");

    const placeables = parseAreaObjectsFromGitGff(bytes)!.placeables as any[];
    expect(placeables).toHaveLength(4);
    for (const placeable of placeables) {
      expect(placeable.placeableVariables).toBeUndefined();
    }
  });

  it("reads the exact canonical Creature VarTable in physical order without deduplicating", () => {
    const bytes = buildNestedGffBuffer([
      { fields: [{ label: "Creature List", type: "list", value: [1, 5] }] },
      { typeId: 4, fields: [
        { label: "TemplateResRef", type: "resref", value: "cre_variables_exact" },
        { label: "VarTable", type: "list", value: [2, 3, 4] },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "Counter" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: -7 },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "Counter" },
        { label: "Type", type: "dword", value: 2 },
        { label: "Value", type: "float", value: 1.5 },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "" },
        { label: "Type", type: "dword", value: 3 },
        { label: "Value", type: "cexostring", value: "" },
      ] },
      { typeId: 4, fields: [
        { label: "TemplateResRef", type: "resref", value: "cre_variables_absent" },
        { label: "XPosition", type: "float", value: 3 },
        { label: "YPosition", type: "float", value: 4 },
      ] },
    ], "GIT ");

    const creatures = parseAreaObjectsFromGitGff(bytes)!.creatures as any[];
    expect(creatures[0]?.creatureVariables).toEqual({
      expectedEntries: [
        { sourceIndex: 0, name: "Counter", type: "int", value: -7 },
        { sourceIndex: 1, name: "Counter", type: "float", value: 1.5 },
        { sourceIndex: 2, name: "", type: "string", value: "" },
      ],
    });
    expect(creatures[1]?.creatureVariables).toEqual({ expectedEntries: [] });
  });

  it("fails closed on malformed canonical Creature VarTable storage", () => {
    const bytes = buildNestedGffBuffer([
      { fields: [{ label: "Creature List", type: "list", value: [1, 3, 5] }] },
      { typeId: 4, fields: [
        { label: "TemplateResRef", type: "resref", value: "cre_variables_wrong_case" },
        { label: "vartable", type: "list", value: [2] },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "x" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: 1 },
      ] },
      { typeId: 4, fields: [
        { label: "TemplateResRef", type: "resref", value: "cre_variables_extra" },
        { label: "VarTable", type: "list", value: [4] },
        { label: "XPosition", type: "float", value: 3 },
        { label: "YPosition", type: "float", value: 4 },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "x" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: 1 },
        { label: "Extra", type: "int", value: 1 },
      ] },
      { typeId: 4, fields: [
        { label: "TemplateResRef", type: "resref", value: "cre_variables_unsupported" },
        { label: "VarTable", type: "list", value: [6] },
        { label: "XPosition", type: "float", value: 5 },
        { label: "YPosition", type: "float", value: 6 },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "x" },
        { label: "Type", type: "dword", value: 4 },
        { label: "Value", type: "int", value: 1 },
      ] },
    ], "GIT ");

    const creatures = parseAreaObjectsFromGitGff(bytes)!.creatures as any[];
    expect(creatures).toHaveLength(3);
    for (const creature of creatures) {
      expect(creature.creatureVariables).toBeUndefined();
    }
  });

  it("reads the exact canonical Encounter VarTable in physical order", () => {
    const bytes = buildNestedGffBuffer([
      { fields: [{ label: "Encounter List", type: "list", value: [1, 5] }] },
      { typeId: 7, fields: [
        { label: "TemplateResRef", type: "resref", value: "enc_variables_exact" },
        { label: "VarTable", type: "list", value: [2, 3, 4] },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "Counter" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: -7 },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "Counter" },
        { label: "Type", type: "dword", value: 2 },
        { label: "Value", type: "float", value: 1.5 },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "" },
        { label: "Type", type: "dword", value: 3 },
        { label: "Value", type: "cexostring", value: "" },
      ] },
      { typeId: 7, fields: [
        { label: "TemplateResRef", type: "resref", value: "enc_variables_absent" },
        { label: "XPosition", type: "float", value: 3 },
        { label: "YPosition", type: "float", value: 4 },
      ] },
    ], "GIT ");

    const encounters = parseAreaObjectsFromGitGff(bytes)!.encounters as any[];
    expect(encounters[0]?.encounterVariables).toEqual({
      expectedEntries: [
        { sourceIndex: 0, name: "Counter", type: "int", value: -7 },
        { sourceIndex: 1, name: "Counter", type: "float", value: 1.5 },
        { sourceIndex: 2, name: "", type: "string", value: "" },
      ],
    });
    expect(encounters[1]?.encounterVariables).toEqual({ expectedEntries: [] });
  });

  it("fails closed on malformed canonical Encounter VarTable storage", () => {
    const bytes = buildNestedGffBuffer([
      { fields: [{ label: "Encounter List", type: "list", value: [1] }] },
      { typeId: 7, fields: [
        { label: "TemplateResRef", type: "resref", value: "enc_variables_wrong_case" },
        { label: "vartable", type: "list", value: [2] },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "x" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: 1 },
      ] },
    ], "GIT ");
    expect((parseAreaObjectsFromGitGff(bytes)!.encounters as any[])[0]?.encounterVariables)
      .toBeUndefined();
  });

  it("reads the exact ordered Encounter CreatureList SingleSpawn provenance", () => {
    const bytes = buildNestedGffBuffer([
      { fields: [{ label: "Encounter List", type: "list", value: [1] }] },
      { typeId: 7, fields: [
        { label: "TemplateResRef", type: "resref", value: "enc_creatures_exact" },
        { label: "CreatureList", type: "list", value: [2, 3] },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ] },
      { typeId: 0, fields: [
        { label: "Appearance", type: "int", value: 388 },
        { label: "CR", type: "float", value: 1 },
        { label: "ResRef", type: "resref", value: "nw_gnoll001" },
        { label: "SingleSpawn", type: "byte", value: 0 },
      ] },
      { typeId: 0, fields: [
        { label: "Appearance", type: "int", value: 389 },
        { label: "CR", type: "float", value: 3 },
        { label: "ResRef", type: "resref", value: "nw_gnoll002" },
        { label: "SingleSpawn", type: "byte", value: 1 },
      ] },
    ], "GIT ");

    expect((parseAreaObjectsFromGitGff(bytes)!.encounters as any[])[0]
      ?.encounterCreatureList).toEqual({ expectedEntries: [
      {
        sourceIndex: 0,
        appearance: 388,
        challengeRating: 1,
        resRef: "nw_gnoll001",
        singleSpawnByte: 0,
      },
      {
        sourceIndex: 1,
        appearance: 389,
        challengeRating: 3,
        resRef: "nw_gnoll002",
        singleSpawnByte: 1,
      },
    ] });
  });

  it("fails closed on structurally changed Encounter CreatureList storage", () => {
    const bytes = buildNestedGffBuffer([
      { fields: [{ label: "Encounter List", type: "list", value: [1] }] },
      { typeId: 7, fields: [
        { label: "TemplateResRef", type: "resref", value: "enc_creatures_bad" },
        { label: "CreatureList", type: "list", value: [2] },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ] },
      { typeId: 0, fields: [
        { label: "Appearance", type: "int", value: 388 },
        { label: "CR", type: "float", value: 1 },
        { label: "ResRef", type: "resref", value: "nw_gnoll001" },
        { label: "singlespawn", type: "byte", value: 0 },
      ] },
    ], "GIT ");
    expect((parseAreaObjectsFromGitGff(bytes)!.encounters as any[])[0]
      ?.encounterCreatureList).toBeUndefined();
  });

  it("reads exact ordered Encounter SpawnPointList provenance and retains polygon authoring", () => {
    const bytes = buildNestedGffBuffer([
      { fields: [{ label: "Encounter List", type: "list", value: [1] }] },
      { typeId: 7, fields: [
        { label: "TemplateResRef", type: "resref", value: "enc_spawn_points" },
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
        { label: "ZPosition", type: "float", value: 0 },
        { label: "Geometry", type: "list", value: [2, 3, 4] },
        { label: "SpawnPointList", type: "list", value: [5, 6] },
      ] },
      { typeId: 1, fields: [
        { label: "X", type: "float", value: 0 },
        { label: "Y", type: "float", value: 0 },
        { label: "Z", type: "float", value: 0 },
      ] },
      { typeId: 1, fields: [
        { label: "X", type: "float", value: 1 },
        { label: "Y", type: "float", value: 0 },
        { label: "Z", type: "float", value: 0 },
      ] },
      { typeId: 1, fields: [
        { label: "X", type: "float", value: 0 },
        { label: "Y", type: "float", value: 1 },
        { label: "Z", type: "float", value: 0 },
      ] },
      { typeId: 2, fields: [
        { label: "X", type: "float", value: 22.5 },
        { label: "Y", type: "float", value: 45.25 },
        { label: "Z", type: "float", value: 0 },
        { label: "Orientation", type: "float", value: 1.5 },
      ] },
      { typeId: 2, fields: [
        { label: "X", type: "float", value: -3.75 },
        { label: "Y", type: "float", value: 9.5 },
        { label: "Z", type: "float", value: 0.125 },
        { label: "Orientation", type: "float", value: -2.25 },
      ] },
    ], "GIT ");

    const encounter = (parseAreaObjectsFromGitGff(bytes)!.encounters as any[])[0];
    expect(encounter?.encounterSpawnPoints).toEqual({ expectedEntries: [
      { sourceIndex: 0, nativeX: 22.5, nativeY: 45.25, nativeZ: 0, orientation: 1.5 },
      { sourceIndex: 1, nativeX: -3.75, nativeY: 9.5, nativeZ: 0.125, orientation: -2.25 },
    ] });
    expect(encounter?.polygonGeometry).toEqual({
      coordinateSpace: "native_local",
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
      ],
    });
  });

  it("fails closed on malformed Encounter SpawnPointList while retaining the placement", () => {
    const bytes = buildNestedGffBuffer([
      { fields: [{ label: "Encounter List", type: "list", value: [1] }] },
      { typeId: 7, fields: [
        { label: "TemplateResRef", type: "resref", value: "enc_spawn_bad" },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
        { label: "Geometry", type: "list", value: [2, 3, 4] },
        { label: "SpawnPointList", type: "list", value: [5] },
      ] },
      { typeId: 1, fields: [
        { label: "X", type: "float", value: 0 },
        { label: "Y", type: "float", value: 0 },
        { label: "Z", type: "float", value: 0 },
      ] },
      { typeId: 1, fields: [
        { label: "X", type: "float", value: 1 },
        { label: "Y", type: "float", value: 0 },
        { label: "Z", type: "float", value: 0 },
      ] },
      { typeId: 1, fields: [
        { label: "X", type: "float", value: 0 },
        { label: "Y", type: "float", value: 1 },
        { label: "Z", type: "float", value: 0 },
      ] },
      { typeId: 2, fields: [
        { label: "X", type: "float", value: 22.5 },
        { label: "Y", type: "float", value: 45.25 },
        { label: "Z", type: "float", value: 0 },
        { label: "orientation", type: "float", value: 1.5 },
      ] },
    ], "GIT ");

    const encounter = (parseAreaObjectsFromGitGff(bytes)!.encounters as any[])[0];
    expect(encounter?.encounterSpawnPoints).toBeUndefined();
    expect(encounter?.polygonGeometry).toBeUndefined();
  });

  it("reads the exact Area-owned root GIT VarTable and admits exact absence as empty", () => {
    const present = buildNestedGffBuffer([
      {
        fields: [
          { label: "VarTable", type: "list", value: [1, 2, 3, 4] },
          { label: "Creature List", type: "list", value: [] },
        ],
      },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "Counter" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: -7 },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "Scale" },
        { label: "Type", type: "dword", value: 2 },
        { label: "Value", type: "float", value: Math.fround(1.25) },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "" },
        { label: "Type", type: "dword", value: 3 },
        { label: "Value", type: "cexostring", value: "" },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "Counter" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: -7 },
      ] },
    ], "GIT ");
    const expectedEntries = [
      { sourceIndex: 0, name: "Counter", type: "int", value: -7 },
      { sourceIndex: 1, name: "Scale", type: "float", value: Math.fround(1.25) },
      { sourceIndex: 2, name: "", type: "string", value: "" },
      { sourceIndex: 3, name: "Counter", type: "int", value: -7 },
    ];

    expect(parseAreaVariablesFromGitGff(present)).toEqual({ expectedEntries });
    expect(parseAreaObjectsFromGitGff(present)?.variables).toEqual({ expectedEntries });

    const absent = buildNestedGffBuffer([{
      fields: [{ label: "Creature List", type: "list", value: [] }],
    }], "GIT ");
    expect(parseAreaVariablesFromGitGff(absent)).toEqual({ expectedEntries: [] });
    expect(parseAreaObjectsFromGitGff(absent)?.variables).toEqual({ expectedEntries: [] });
    expect(parseAreaObjectsFromGitGff(absent)?.dependencyFingerprint)
      .not.toBe(parseAreaObjectsFromGitGff(present)?.dependencyFingerprint);
  });

  it.each([
    ["wrong root case", [
      { fields: [{ label: "vartable", type: "list", value: [1] }] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "x" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: 1 },
      ] },
    ]],
    ["duplicate root label", [
      { fields: [
        { label: "VarTable", type: "list", value: [1] },
        { label: "VarTable", type: "list", value: [1] },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "x" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: 1 },
      ] },
    ]],
    ["wrong root native type", [
      { fields: [{ label: "VarTable", type: "int", value: 1 }] },
    ]],
    ["wrong entry struct type", [
      { fields: [{ label: "VarTable", type: "list", value: [1] }] },
      { typeId: 9, fields: [
        { label: "Name", type: "cexostring", value: "x" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: 1 },
      ] },
    ]],
    ["unknown entry label", [
      { fields: [{ label: "VarTable", type: "list", value: [1] }] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "x" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: 1 },
        { label: "Extra", type: "int", value: 1 },
      ] },
    ]],
    ["duplicate entry label", [
      { fields: [{ label: "VarTable", type: "list", value: [1] }] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "x" },
        { label: "Name", type: "cexostring", value: "y" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: 1 },
      ] },
    ]],
    ["unsupported native type", [
      { fields: [{ label: "VarTable", type: "list", value: [1] }] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "x" },
        { label: "Type", type: "dword", value: 4 },
        { label: "Value", type: "int", value: 1 },
      ] },
    ]],
    ["wrong selected Value type", [
      { fields: [{ label: "VarTable", type: "list", value: [1] }] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "x" },
        { label: "Type", type: "dword", value: 2 },
        { label: "Value", type: "int", value: 1 },
      ] },
    ]],
    ["non-finite float", [
      { fields: [{ label: "VarTable", type: "list", value: [1] }] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "x" },
        { label: "Type", type: "dword", value: 2 },
        { label: "Value", type: "float", value: Number.POSITIVE_INFINITY },
      ] },
    ]],
  ] as const)("keeps malformed Area root VarTable preserve-only for %s", (_label, structs) => {
    const bytes = buildNestedGffBuffer(structs as unknown as StructDef[], "GIT ");
    expect(parseAreaVariablesFromGitGff(bytes)).toBeNull();
    expect(parseAreaObjectsFromGitGff(bytes)).not.toHaveProperty("variables");
  });

  it("preserves an explicitly empty placeable OnUsed ResRef and distinguishes an absent field", () => {
    const withEmptyOnUsed = buildNestedGffBuffer(
      [
        { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_empty_script" },
            { label: "OnUsed", type: "resref", value: "" },
            { label: "X", type: "float", value: 10 },
            { label: "Y", type: "float", value: 20 }
          ]
        }
      ],
      "GIT "
    );
    const withoutOnUsed = buildNestedGffBuffer(
      [
        { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_inherited_script" },
            { label: "X", type: "float", value: 10 },
            { label: "Y", type: "float", value: 20 }
          ]
        }
      ],
      "GIT "
    );

    const emptyMetadata = parseAreaObjectsFromGitGff(withEmptyOnUsed)
      ?.placeables[0]?.placeableMetadata;
    const absentMetadata = parseAreaObjectsFromGitGff(withoutOnUsed)
      ?.placeables[0]?.placeableMetadata;
    expect(emptyMetadata?.["script.onUsed"]).toBe("");
    expect(Object.prototype.hasOwnProperty.call(absentMetadata ?? {}, "script.onUsed")).toBe(false);
  });

  it("preserves exact empty, spaced, and absent KeyName provenance for placed placeables", () => {
    const buildPlaceable = (
      keyName: string | undefined,
      keyNameType: "cexostring" | "resref" = "cexostring"
    ) => buildNestedGffBuffer(
      [
        { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_key_probe" },
            ...(keyName === undefined
              ? []
              : keyNameType === "cexostring"
                ? [{ label: "KeyName", type: "cexostring" as const, value: keyName }]
                : [{ label: "KeyName", type: "resref" as const, value: keyName }]),
            { label: "X", type: "float", value: 10 },
            { label: "Y", type: "float", value: 20 }
          ]
        }
      ],
      "GIT "
    );

    const emptyMetadata = parseAreaObjectsFromGitGff(buildPlaceable(""))
      ?.placeables[0]?.placeableMetadata;
    const spacedMetadata = parseAreaObjectsFromGitGff(buildPlaceable(" key "))
      ?.placeables[0]?.placeableMetadata;
    const absentMetadata = parseAreaObjectsFromGitGff(buildPlaceable(undefined))
      ?.placeables[0]?.placeableMetadata;
    const wrongTypeMetadata = parseAreaObjectsFromGitGff(buildPlaceable("\0\0\0", "resref"))
      ?.placeables[0]?.placeableMetadata;
    expect(emptyMetadata).toHaveProperty("keyName", "");
    expect(spacedMetadata).toHaveProperty("keyName", " key ");
    expect(absentMetadata).not.toHaveProperty("keyName");
    expect(wrongTypeMetadata).not.toHaveProperty("keyName");
  });

  it("preserves empty versus absent values for every admitted placeable script ResRef", () => {
    const labels = [
      "OnClick", "OnClosed", "OnDamaged", "OnDeath", "OnHeartbeat", "OnInvDisturbed",
      "OnLock", "OnMeleeAttacked", "OnOpen", "OnSpellCastAt", "OnUnlock", "OnUserDefined",
    ];
    const keys = [
      "script.onClick", "script.onClosed", "script.onDamaged", "script.onDeath",
      "script.onHeartbeat", "script.onInventoryDisturbed", "script.onLock",
      "script.onMeleeAttacked", "script.onOpen", "script.onSpellCastAt", "script.onUnlock",
      "script.onUserDefined",
    ];
    const withEmptyScripts = buildNestedGffBuffer(
      [
        { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_empty_scripts" },
            ...labels.map((label) => ({ label, type: "resref" as const, value: "" })),
            { label: "X", type: "float", value: 10 },
            { label: "Y", type: "float", value: 20 },
          ],
        },
      ],
      "GIT ",
    );
    const withoutScripts = buildNestedGffBuffer(
      [
        { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_absent_scripts" },
            { label: "X", type: "float", value: 10 },
            { label: "Y", type: "float", value: 20 },
          ],
        },
      ],
      "GIT ",
    );

    const emptyMetadata = parseAreaObjectsFromGitGff(withEmptyScripts)
      ?.placeables[0]?.placeableMetadata;
    const absentMetadata = parseAreaObjectsFromGitGff(withoutScripts)
      ?.placeables[0]?.placeableMetadata;
    for (const key of keys) {
      expect(emptyMetadata?.[key]).toBe("");
      expect(Object.prototype.hasOwnProperty.call(absentMetadata ?? {}, key)).toBe(false);
    }
  });

  it("preserves empty versus absent values for both admitted placeable trap script ResRefs", () => {
    const withEmptyScripts = buildNestedGffBuffer(
      [
        { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_empty_trap_scripts" },
            { label: "OnDisarm", type: "resref", value: "" },
            { label: "OnTrapTriggered", type: "resref", value: "" },
            { label: "X", type: "float", value: 10 },
            { label: "Y", type: "float", value: 20 },
          ],
        },
      ],
      "GIT ",
    );
    const withoutScripts = buildNestedGffBuffer(
      [
        { fields: [{ label: "Placeable List", type: "list", value: [1] }] },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_absent_trap_scripts" },
            { label: "X", type: "float", value: 10 },
            { label: "Y", type: "float", value: 20 },
          ],
        },
      ],
      "GIT ",
    );

    const emptyMetadata = parseAreaObjectsFromGitGff(withEmptyScripts)
      ?.placeables[0]?.placeableMetadata;
    const absentMetadata = parseAreaObjectsFromGitGff(withoutScripts)
      ?.placeables[0]?.placeableMetadata;
    for (const key of ["script.onDisarm", "script.onTrapTriggered"]) {
      expect(emptyMetadata?.[key]).toBe("");
      expect(Object.prototype.hasOwnProperty.call(absentMetadata ?? {}, key)).toBe(false);
    }
  });

  it("parses GIT lists with placeables/doors/creatures/items and position struct fallback", () => {
    const bytes = buildNestedGffBuffer(
      [
        {
          fields: [
            { label: "Placeable List", type: "list", value: [1] },
            { label: "Door List", type: "list", value: [2] },
            { label: "Creature List", type: "list", value: [3] },
            { label: "Item List", type: "list", value: [4] },
            { label: "SoundList", type: "list", value: [6] }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_crate_01" },
            { label: "Tag", type: "cexostring", value: "crate_tag" },
            { label: "LocName", type: "cexolocstring", value: "Crate display" },
            { label: "Description", type: "cexolocstring", value: "Crate description" },
            { label: "XPosition", type: "float", value: 12.5 },
            { label: "YPosition", type: "float", value: 6.25 },
            { label: "ZPosition", type: "float", value: 0.5 },
            { label: "Bearing", type: "float", value: Math.PI / 2 },
            { label: "Static", type: "byte", value: 0 },
            { label: "VisTransformList", type: "list", value: [19] }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "utd_city_gate_01" },
            { label: "Tag", type: "cexostring", value: "north_gate" },
            { label: "XPosition", type: "float", value: 20.0 },
            { label: "YPosition", type: "float", value: 10.0 },
            { label: "XOrientation", type: "float", value: 0 },
            { label: "YOrientation", type: "float", value: 1 },
            { label: "LinkedTo", type: "cexostring", value: "area_market_south" },
            { label: "LinkedToModule", type: "cexostring", value: "the_last_city" },
            { label: "TransitionDestin", type: "cexostring", value: "south_gate" },
            { label: "LinkedWaypoint", type: "cexostring", value: "wp_market_entry" },
            { label: "LinkedToFlags", type: "byte", value: 3 },
            { label: "LoadScreenId", type: "word", value: 42 }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "cre_guard_01" },
            { label: "Tag", type: "cexostring", value: "guard_git_tag" },
            { label: "FirstName", type: "cexolocstring", value: "GIT Guard", strRef: 9101 },
            {
              label: "Description",
              type: "cexolocstring",
              value: "Source creature instance",
              strRef: 9102
            },
            { label: "Appearance_Type", type: "word", value: 42 },
            { label: "Race", type: "byte", value: 6 },
            { label: "Plot", type: "byte", value: 1 },
            { label: "Str", type: "byte", value: 15 },
            { label: "FortSave", type: "byte", value: 5 },
            { label: "RefSave", type: "byte", value: 4 },
            { label: "WillSave", type: "byte", value: 3 },
            { label: "StrAdjust", type: "byte", value: 1 },
            { label: "DexAdjust", type: "byte", value: 2 },
            { label: "ConAdjust", type: "byte", value: 3 },
            { label: "IntAdjust", type: "byte", value: 4 },
            { label: "WisAdjust", type: "byte", value: 5 },
            { label: "ChaAdjust", type: "byte", value: 6 },
            { label: "BodyPart_Robe", type: "byte", value: 19 },
            { label: "HP", type: "short", value: 22 },
            { label: "DecayTime", type: "dword", value: 45 },
            { label: "ScriptSpawn", type: "resref", value: "nw_c2_guardspawn" },
            { label: "ClassList", type: "list", value: [9] },
            { label: "SkillList", type: "list", value: [12, 13] },
            { label: "FeatList", type: "list", value: [14] },
            { label: "TemplateList", type: "list", value: [15] },
            { label: "SpecAbilityList", type: "list", value: [16] },
            { label: "ItemList", type: "list", value: [17] },
            { label: "Equip_ItemList", type: "list", value: [18] },
            { label: "XPosition", type: "float", value: 7.75 },
            { label: "YPosition", type: "float", value: 8.5 }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "itm_potion_01" },
            { label: "Tag", type: "cexostring", value: "item_git_tag" },
            { label: "LocName", type: "cexolocstring", value: "Area Potion", strRef: 9105 },
            { label: "Description", type: "cexolocstring", value: "Potion on the ground", strRef: 9106 },
            { label: "BaseItem", type: "dword", value: 49 },
            { label: "ModelPart1", type: "byte", value: 11 },
            { label: "ModelPart2", type: "byte", value: 13 },
            { label: "ModelPart3", type: "byte", value: 63 },
            { label: "Cost", type: "dword", value: 42 },
            { label: "StackSize", type: "word", value: 3 },
            { label: "Identified", type: "byte", value: 1 },
            { label: "Plot", type: "byte", value: 1 },
            { label: "Leather1Color", type: "byte", value: 5 },
            { label: "Metal2Color", type: "byte", value: 8 },
            { label: "OnUsed", type: "resref", value: "it_onuse" },
            { label: "PropertiesList", type: "list", value: [29] },
            { label: "Position", type: "struct", value: 5 }
          ]
        },
        {
          fields: [
            { label: "X", type: "float", value: 1.5 },
            { label: "Y", type: "float", value: 2.5 },
            { label: "Z", type: "float", value: 0 }
          ]
        },
        {
          typeId: 6,
          fields: [
            { label: "TemplateResRef", type: "resref", value: "snd_forge_loop" },
            { label: "Tag", type: "cexostring", value: "forge_sound" },
            { label: "XPosition", type: "float", value: 4.5 },
            { label: "YPosition", type: "float", value: 5.5 },
            { label: "ZPosition", type: "float", value: 1.25 },
            { label: "Active", type: "byte", value: 1 },
            { label: "Continuous", type: "byte", value: 0 },
            { label: "Looping", type: "byte", value: 1 },
            { label: "Positional", type: "byte", value: 1 },
            { label: "RandomPosition", type: "byte", value: 1 },
            { label: "Random", type: "byte", value: 1 },
            { label: "Elevation", type: "float", value: 1.25 },
            { label: "MaxDistance", type: "float", value: 14 },
            { label: "MinDistance", type: "float", value: 2 },
            { label: "RandomRangeX", type: "float", value: 3 },
            { label: "RandomRangeY", type: "float", value: 4 },
            { label: "Interval", type: "dword", value: 8000 },
            { label: "IntervalVrtn", type: "dword", value: 1200 },
            { label: "PitchVariation", type: "float", value: 0.1 },
            { label: "Priority", type: "byte", value: 3 },
            { label: "Hours", type: "dword", value: 0x800001 },
            { label: "Times", type: "byte", value: 0 },
            { label: "Volume", type: "byte", value: 80 },
            { label: "VolumeVrtn", type: "byte", value: 15 },
            { label: "Sounds", type: "list", value: [7, 8] }
          ]
        },
        {
          typeId: 0,
          fields: [{ label: "Sound", type: "resref", value: "forge_loop_a" }]
        },
        {
          typeId: 0,
          fields: [{ label: "Sound", type: "resref", value: "forge_loop_b" }]
        },
        {
          fields: [
            { label: "Class", type: "byte", value: 1 },
            { label: "ClassLevel", type: "byte", value: 4 },
            { label: "KnownList0", type: "list", value: [10] },
            { label: "MemorizedList2", type: "list", value: [11] }
          ]
        },
        {
          fields: [
            { label: "Spell", type: "word", value: 201 },
            { label: "SpellMetaMagic", type: "byte", value: 0 },
            { label: "SpellFlags", type: "byte", value: 0 }
          ]
        },
        {
          fields: [
            { label: "Spell", type: "word", value: 301 },
            { label: "SpellMetaMagic", type: "byte", value: 2 },
            { label: "SpellFlags", type: "byte", value: 4 }
          ]
        },
        {
          fields: [{ label: "Rank", type: "byte", value: 5 }]
        },
        {
          fields: [{ label: "Rank", type: "byte", value: 7 }]
        },
        {
          fields: [{ label: "Feat", type: "word", value: 1001 }]
        },
        {
          fields: [{ label: "TemplateId", type: "byte", value: 2 }]
        },
        {
          fields: [
            { label: "Spell", type: "word", value: 401 },
            { label: "SpellFlags", type: "byte", value: 0 },
            { label: "SpellCasterLevel", type: "byte", value: 50 }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "nw_it_potion" },
            { label: "Repos_PosX", type: "byte", value: 3 },
            { label: "Repos_PosY", type: "byte", value: 4 },
            { label: "Dropable", type: "byte", value: 1 },
            { label: "Pickpocketable", type: "byte", value: 1 },
            { label: "Infinite", type: "byte", value: 0 }
          ]
        },
        {
          typeId: 131072,
          fields: [
            { label: "TemplateResRef", type: "resref", value: "nw_wswss001" },
            { label: "Dropable", type: "byte", value: 0 },
            { label: "Pickpocketable", type: "byte", value: 0 },
            { label: "Infinite", type: "byte", value: 1 }
          ]
        },
        {
          fields: [
            { label: "ScaleX", type: "struct", value: 20 },
            { label: "ScaleY", type: "struct", value: 21 },
            { label: "ScaleZ", type: "struct", value: 22 },
            { label: "RotateX", type: "struct", value: 23 },
            { label: "RotateY", type: "struct", value: 24 },
            { label: "RotateZ", type: "struct", value: 25 },
            { label: "TranslateX", type: "struct", value: 26 },
            { label: "TranslateY", type: "struct", value: 27 },
            { label: "TranslateZ", type: "struct", value: 28 }
          ]
        },
        {
          fields: [{ label: "ValueTo", type: "float", value: 0.5 }]
        },
        {
          fields: [{ label: "ValueTo", type: "float", value: 0.5 }]
        },
        {
          fields: [{ label: "ValueTo", type: "float", value: 0.5 }]
        },
        {
          fields: [{ label: "ValueTo", type: "float", value: 270 }]
        },
        {
          fields: [{ label: "ValueTo", type: "float", value: 0 }]
        },
        {
          fields: [{ label: "ValueTo", type: "float", value: 90 }]
        },
        {
          fields: [{ label: "ValueTo", type: "float", value: 2 }]
        },
        {
          fields: [{ label: "ValueTo", type: "float", value: -3 }]
        },
        {
          fields: [{ label: "ValueTo", type: "float", value: 4 }]
        },
        {
          fields: [
            { label: "PropertyName", type: "word", value: 15 },
            { label: "Subtype", type: "word", value: 66 },
            { label: "CostTable", type: "byte", value: 3 },
            { label: "CostValue", type: "word", value: 1 },
            { label: "Param1", type: "byte", value: 255 },
            { label: "Param1Value", type: "byte", value: 0 },
            { label: "ChanceAppear", type: "byte", value: 100 }
          ]
        }
      ],
      "GIT "
    );

    const parsed = parseAreaObjectsFromGitGff(bytes);

    expect(parsed).not.toBeNull();
    expect(parsed?.placeables).toHaveLength(1);
    expect(parsed?.doors).toHaveLength(1);
    expect(parsed?.creatures).toHaveLength(1);
    expect(parsed?.items).toHaveLength(1);
    expect(parsed?.sounds).toHaveLength(1);

    expect(parsed?.placeables[0]).toMatchObject({
      templateResRef: "plc_crate_01",
      tag: "crate_tag",
      localizedName: "Crate display",
      description: "Crate description",
      x: 12.5,
      y: 6.25,
      z: 0.5,
      bearing: 90,
      isStatic: false,
      visualTransform: {
        scaleX: 0.5,
        scaleY: 0.5,
        scaleZ: 0.5,
        rotateX: 270,
        rotateY: 0,
        rotateZ: 90,
        translateX: 2,
        translateY: -3,
        translateZ: 4
      }
    });

    expect(parsed?.doors[0]).toMatchObject({
      templateResRef: "utd_city_gate_01",
      tag: "north_gate",
      x: 20,
      y: 10,
      z: 0,
      bearing: 270,
      doorTransition: {
        linkedTarget: "area_market_south",
        linkedModule: "the_last_city",
        linkedTag: "south_gate",
        linkedWaypoint: "wp_market_entry",
        loadScreen: "42",
        flags: {},
        extra: {
          linkedToFlags: 3,
          loadScreenId: 42
        }
      }
    });

    expect(parsed?.items[0]).toMatchObject({
      templateResRef: "itm_potion_01",
      tag: "item_git_tag",
      x: 1.5,
      y: 2.5,
      z: 0,
      bearing: 0,
      itemMetadata: {
        templateResRef: "itm_potion_01",
        tag: "item_git_tag",
        localizedName: "Area Potion",
        localizedNameStrRef: 9105,
        description: "Potion on the ground",
        descriptionStrRef: 9106,
        baseItem: 49,
        modelPart1: 11,
        modelPart2: 13,
        modelPart3: 63,
        cost: 42,
        stackSize: 3,
        identified: true,
        plot: true,
        leather1Color: 5,
        metal2Color: 8,
        "script.onused": "it_onuse",
        itemPropertyListCount: 1
      }
    });
    expect(JSON.parse(String(parsed?.items[0]?.itemMetadata?.itemPropertyListEntries))).toEqual([
      {
        propertyName: 15,
        subtype: 66,
        costTable: 3,
        costValue: 1,
        param1: 255,
        param1Value: 0,
        chanceAppear: 100
      }
    ]);
    expect(parsed?.creatures[0]).toMatchObject({
      templateResRef: "cre_guard_01",
      tag: "guard_git_tag",
      appearanceType: 42,
      creatureMetadata: {
        templateResRef: "cre_guard_01",
        tag: "guard_git_tag",
        firstName: "GIT Guard",
        firstNameStrRef: 9101,
        description: "Source creature instance",
        descriptionStrRef: 9102,
        appearanceId: 42,
        race: 6,
        plot: true,
        strength: 15,
        fortitudeBonus: 5,
        reflexBonus: 4,
        willBonus: 3,
        strengthAdjust: 1,
        dexterityAdjust: 2,
        constitutionAdjust: 3,
        intelligenceAdjust: 4,
        wisdomAdjust: 5,
        charismaAdjust: 6,
        hitPoints: 22,
        decayTime: 45,
        "script.scriptspawn": "nw_c2_guardspawn",
        classListCount: 1,
        skillListCount: 2,
        featListCount: 1,
        templateListCount: 1,
        specAbilityListCount: 1,
        inventoryItemListCount: 1,
        equipItemListCount: 1
      }
    });
    const creatureMetadata = parsed?.creatures[0].creatureMetadata;
    expect(creatureMetadata).not.toHaveProperty("bodyPartRobe");
    expect(JSON.parse(String(creatureMetadata?.classListEntries))).toEqual([
      {
        classId: 1,
        level: 4,
        knownSpellCount: 1,
        memorizedSpellCount: 1,
        knownSpells: [
          {
            spellId: 201,
            metaMagic: 0,
            flags: 1,
            spellLevel: 0
          }
        ],
        memorizedSpells: [
          {
            spellId: 301,
            metaMagic: 2,
            flags: 5,
            spellLevel: 2
          }
        ]
      }
    ]);
    const skillListEntries = JSON.parse(String(creatureMetadata?.skillListEntries));
    expect(skillListEntries).toHaveLength(28);
    expect(skillListEntries.slice(0, 3)).toEqual([
      { skillId: 0, rank: 5 },
      { skillId: 1, rank: 7 },
      { skillId: 2, rank: 0 }
    ]);
    expect(JSON.parse(String(creatureMetadata?.featListEntries))).toEqual([{ featId: 1001 }]);
    expect(JSON.parse(String(creatureMetadata?.templateListEntries))).toEqual([
      { templateId: 2 }
    ]);
    expect(JSON.parse(String(creatureMetadata?.specAbilityListEntries))).toEqual([
      { spellId: 401, flags: 1, casterLevel: 15 }
    ]);
    expect(JSON.parse(String(creatureMetadata?.inventoryItemListEntries))).toEqual([
      {
        sourceIndex: 0,
        resRef: "nw_it_potion",
        x: 3,
        y: 4,
        dropable: true,
        pickpocketable: true
      }
    ]);
    expect(JSON.parse(String(creatureMetadata?.equipItemListEntries))).toEqual([
      {
        resRef: "nw_wswss001",
        slotMask: 131072,
        dropable: false,
        pickpocketable: false,
        infinite: true
      }
    ]);
    expect(parsed?.sounds[0]).toMatchObject({
      templateResRef: "snd_forge_loop",
      tag: "forge_sound",
      x: 4.5,
      y: 5.5,
      z: 1.25,
      bearing: 0,
      soundIntervalVariation: {
        intervalMilliseconds: 8000,
        intervalVariationMilliseconds: 1200,
        pitchVariationHundredths: 10,
        volumeVariationByte: 15,
      },
      soundVolume: { volumeByte: 80 },
      soundActive: { activeByte: 1 },
      soundPlayOrder: { randomByte: 1 },
      soundPlayStyle: {
        loopingByte: 1,
        continuousByte: 0,
        priorityByte: 3,
        positionalByte: 1,
        soundsCount: 2,
        intervalDword: 8000,
        intervalVariationDword: 1200,
      },
      soundPlayback: {
        sounds: ["forge_loop_a", "forge_loop_b"],
        loopingByte: 1,
        continuousByte: 0,
        priorityByte: 3,
        positionalByte: 1,
        intervalDword: 8000,
        intervalVariationDword: 1200,
      },
      soundProfile: {
        sounds: ["forge_loop_a", "forge_loop_b"],
        loopingByte: 1,
        continuousByte: 0,
        priorityByte: 3,
        positionalByte: 1,
        randomPositionByte: 1,
        elevationFloat32: 1.25,
        maxDistanceFloat32: 14,
        minDistanceFloat32: 2,
        randomRangeXFloat32: 3,
        randomRangeYFloat32: 4,
        intervalDword: 8000,
        intervalVariationDword: 1200,
      },
      soundSchedule: { hoursMask: 0x800001, timesByte: 0 },
      soundPositioning: {
        mode: "random",
        elevation: 1.25,
        maxVolumeDistance: 2,
        cutoffDistance: 14,
        randomRangeWestEast: 3,
        randomRangeNorthSouth: 4,
        preserve: {
          active: true,
          playStyle: "loop",
          playOrder: "random",
          intervalMs: 8000,
          intervalVariationMs: 1200,
          volume: 0.8,
          volumeVariation: 0.15,
          pitchVariation: 0.1,
          priority: 3,
          extra: {
            auroraSoundList: "forge_loop_a\nforge_loop_b"
          }
        }
      }
    });
  });

  it.each([
    ["derivation-inconsistent Priority", 0, 20, "list"],
    ["ambiguous style flags", 1, 2, "list"],
    ["wrong-case/type Sounds", 0, 2, "cexostring"],
  ] as const)("keeps Sound Play Style preserve-only for %s", (
    _label,
    continuousByte,
    priorityByte,
    soundsType,
  ) => {
    const soundsField = soundsType === "list"
      ? { label: "Sounds", type: "list" as const, value: [2] }
      : { label: "sounds", type: "cexostring" as const, value: "snd_a" };
    const bytes = buildNestedGffBuffer([
      { fields: [{ label: "SoundList", type: "list", value: [1] }] },
      { fields: [
        { label: "TemplateResRef", type: "resref", value: "snd_probe" },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
        { label: "Continuous", type: "byte", value: continuousByte },
        { label: "Looping", type: "byte", value: 1 },
        { label: "Positional", type: "byte", value: 0 },
        { label: "Interval", type: "dword", value: 25_000 },
        { label: "IntervalVrtn", type: "dword", value: 5_000 },
        { label: "Priority", type: "byte", value: priorityByte },
        soundsField,
      ] },
      { fields: [{ label: "Sound", type: "resref", value: "snd_a" }] },
    ], "GIT ");

    expect(parseAreaObjectsFromGitGff(bytes)?.sounds[0]).not.toHaveProperty(
      "soundPlayStyle",
    );
  });

  it.each([
    ["wrong child struct type", { typeId: 7, fields: [
      { label: "Sound", type: "resref", value: "snd_a" },
    ] }],
    ["duplicate Sound field", { typeId: 0, fields: [
      { label: "Sound", type: "resref", value: "snd_a" },
      { label: "Sound", type: "resref", value: "snd_b" },
    ] }],
    ["wrong-case Sound field", { typeId: 0, fields: [
      { label: "sound", type: "resref", value: "snd_a" },
    ] }],
    ["wrong Sound field type", { typeId: 0, fields: [
      { label: "Sound", type: "cexostring", value: "snd_a" },
    ] }],
    ["noncanonical Sound ResRef", { typeId: 0, fields: [
      { label: "Sound", type: "resref", value: "Snd-A" },
    ] }],
    ["extra child field", { typeId: 0, fields: [
      { label: "Sound", type: "resref", value: "snd_a" },
      { label: "Extra", type: "byte", value: 1 },
    ] }],
  ] as const)("keeps Sound playback list preserve-only for %s", (_label, child) => {
    const bytes = buildNestedGffBuffer([{
      fields: [{ label: "SoundList", type: "list", value: [1] }],
    }, {
      typeId: 6,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "snd_probe" },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
        { label: "Continuous", type: "byte", value: 0 },
        { label: "Looping", type: "byte", value: 1 },
        { label: "Positional", type: "byte", value: 0 },
        { label: "Interval", type: "dword", value: 25_000 },
        { label: "IntervalVrtn", type: "dword", value: 5_000 },
        { label: "Priority", type: "byte", value: 2 },
        { label: "Sounds", type: "list", value: [2] },
      ],
    }, child as StructDef], "GIT ");

    const sound = parseAreaObjectsFromGitGff(bytes)?.sounds[0];
    expect(sound?.soundPlayStyle).toBeDefined();
    expect(sound).not.toHaveProperty("soundPlayback");
  });

  it.each([
    ["wrong-case spatial label", [
      { label: "randomPosition", type: "byte" as const, value: 1 },
    ]],
    ["duplicate spatial field", [
      { label: "RandomPosition", type: "byte" as const, value: 1 },
      { label: "RandomPosition", type: "byte" as const, value: 1 },
    ]],
    ["wrong spatial type", [
      { label: "RandomPosition", type: "word" as const, value: 1 },
    ]],
    ["invalid mode pair", [
      { label: "RandomPosition", type: "byte" as const, value: 1 },
    ], 0],
    ["out-of-range cutoff", [
      { label: "RandomPosition", type: "byte" as const, value: 0 },
    ], 1, 321],
  ] as const)("keeps the exact Sound profile preserve-only for %s", (
    _label,
    randomPositionFields,
    positionalByte = 1,
    maxDistance = 14,
  ) => {
    const bytes = buildNestedGffBuffer([{
      fields: [{ label: "SoundList", type: "list", value: [1] }],
    }, {
      typeId: 6,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "snd_probe" },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
        { label: "Continuous", type: "byte", value: 0 },
        { label: "Looping", type: "byte", value: 1 },
        { label: "Positional", type: "byte", value: positionalByte },
        ...randomPositionFields,
        { label: "Elevation", type: "float", value: 1.25 },
        { label: "MaxDistance", type: "float", value: maxDistance },
        { label: "MinDistance", type: "float", value: 2 },
        { label: "RandomRangeX", type: "float", value: 3 },
        { label: "RandomRangeY", type: "float", value: 4 },
        { label: "Interval", type: "dword", value: 25_000 },
        { label: "IntervalVrtn", type: "dword", value: 5_000 },
        { label: "Priority", type: "byte", value: positionalByte === 0 ? 2 : 3 },
        { label: "Sounds", type: "list", value: [2] },
      ],
    }, {
      typeId: 0,
      fields: [{ label: "Sound", type: "resref", value: "snd_a" }],
    }], "GIT ");

    const sound = parseAreaObjectsFromGitGff(bytes)?.sounds[0];
    expect(sound?.soundPlayback).toBeDefined();
    expect(sound).not.toHaveProperty("soundProfile");
  });

  it("uses the base Scope entry from VisTransformList", () => {
    const bytes = buildNestedGffBuffer(
      [
        {
          fields: [{ label: "Placeable List", type: "list", value: [1] }]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_scope_probe" },
            { label: "XPosition", type: "float", value: 10 },
            { label: "YPosition", type: "float", value: 20 },
            { label: "Bearing", type: "float", value: 0 },
            { label: "VisTransformList", type: "list", value: [2, 3] }
          ]
        },
        {
          fields: [
            { label: "Scope", type: "int", value: 7 },
            { label: "ScaleX", type: "float", value: 3 },
            { label: "ScaleY", type: "float", value: 3 },
            { label: "ScaleZ", type: "float", value: 3 },
            { label: "RotateZ", type: "float", value: 180 }
          ]
        },
        {
          fields: [
            { label: "Scope", type: "int", value: 0 },
            { label: "ScaleX", type: "float", value: 0.5 },
            { label: "ScaleY", type: "float", value: 0.75 },
            { label: "ScaleZ", type: "float", value: 1.25 },
            { label: "RotateX", type: "float", value: 15 },
            { label: "RotateY", type: "float", value: 30 },
            { label: "RotateZ", type: "float", value: 90 },
            { label: "TranslateX", type: "float", value: 2 },
            { label: "TranslateY", type: "float", value: -3 },
            { label: "TranslateZ", type: "float", value: 4 }
          ]
        }
      ],
      "GIT "
    );

    const parsed = parseAreaObjectsFromGitGff(bytes);

    expect(parsed?.placeables[0]?.visualTransform).toEqual({
      scaleX: 0.5,
      scaleY: 0.75,
      scaleZ: 1.25,
      rotateX: 15,
      rotateY: 30,
      rotateZ: 90,
      translateX: 2,
      translateY: -3,
      translateZ: 4
    });
  });

  it.each([
    ["missing", []],
    ["wrong case", [{ label: "comments", type: "cexostring" as const, value: "lower" }]],
    ["wrong type", [{ label: "Comments", type: "dword" as const, value: 7 }]],
    ["duplicate", [
      { label: "Comments", type: "cexostring" as const, value: "one" },
      { label: "Comments", type: "cexostring" as const, value: "two" },
    ]],
    ["case-ambiguous", [
      { label: "Comments", type: "cexostring" as const, value: "exact" },
      { label: "COMMENTS", type: "cexostring" as const, value: "ambiguous" },
    ]],
    ["NUL-containing", [{ label: "Comments", type: "cexostring" as const, value: "bad\0note" }]],
    ["over-budget", [{ label: "Comments", type: "cexostring" as const, value: "x".repeat(4097) }]],
  ])("keeps %s Area Comments preserve-only", (_label, commentFields) => {
    const bytes = buildNestedGffBuffer([
      {
        fields: [
          ...commentFields,
          { label: "Width", type: "dword", value: 1 },
          { label: "Height", type: "dword", value: 1 },
          { label: "Tileset", type: "resref", value: "tin01" },
          { label: "Tile_List", type: "list", value: [1] },
        ],
      },
      { fields: [{ label: "Tile_ID", type: "dword", value: 12 }] },
    ], "ARE ");

    expect(parseAreaMetadataFromAreGff(bytes)).toEqual(
      expect.not.objectContaining({ comments: expect.anything() }),
    );
  });

  it("distinguishes an exact empty Area Comments value from absence", () => {
    const parsed = parseAreaMetadataFromAreGff(buildNestedGffBuffer([
      {
        fields: [
          { label: "Comments", type: "cexostring", value: "" },
          { label: "Width", type: "dword", value: 1 },
          { label: "Height", type: "dword", value: 1 },
          { label: "Tileset", type: "resref", value: "tin01" },
          { label: "Tile_List", type: "list", value: [1] },
        ],
      },
      { fields: [{ label: "Tile_ID", type: "dword", value: 12 }] },
    ], "ARE "));

    expect(parsed).toEqual(expect.objectContaining({ comments: "" }));
  });

  it.each([
    ["wrong case", [{ label: "onenter", type: "resref" as const, value: "old_enter" }]],
    ["wrong type", [{ label: "OnEnter", type: "cexostring" as const, value: "old_enter" }]],
    ["duplicate", [
      { label: "OnEnter", type: "resref" as const, value: "old_enter" },
      { label: "OnEnter", type: "resref" as const, value: "other_enter" },
    ]],
    ["case ambiguity", [
      { label: "OnEnter", type: "resref" as const, value: "old_enter" },
      { label: "onenter", type: "resref" as const, value: "other_enter" },
    ]],
    ["uppercase non-canonical value", [
      { label: "OnEnter", type: "resref" as const, value: "Old_Enter" },
    ]],
  ])("keeps a %s Area OnEnter field preserve-only", (_label, fields) => {
    const parsed = parseAreaMetadataFromAreGff(buildNestedGffBuffer([
      { fields: [
        ...fields,
        { label: "Width", type: "dword", value: 1 },
        { label: "Height", type: "dword", value: 1 },
        { label: "Tileset", type: "resref", value: "tno01" },
        { label: "Tile_List", type: "list", value: [1] },
      ] },
      { fields: [{ label: "Tile_ID", type: "dword", value: 1 }] },
    ], "ARE "));

    expect(parsed?.eventScripts).toBeUndefined();
  });

  it("preserves exact per-slot presence and empty Area event ResRefs", () => {
    const parsed = parseAreaMetadataFromAreGff(buildNestedGffBuffer([
      { fields: [
        { label: "OnEnter", type: "resref", value: "" },
        { label: "OnUserDefined", type: "resref", value: "area_user" },
        { label: "Width", type: "dword", value: 1 },
        { label: "Height", type: "dword", value: 1 },
        { label: "Tileset", type: "resref", value: "tno01" },
        { label: "Tile_List", type: "list", value: [1] },
      ] },
      { fields: [{ label: "Tile_ID", type: "dword", value: 1 }] },
    ], "ARE "));

    expect(parsed?.eventScripts).toEqual({ onEnter: "", onUserDefined: "area_user" });
  });

  it("exposes only bounded exact existing Area Name and Tag provenance", () => {
    const exact = parseAreaMetadataFromAreGff(buildNestedGffBuffer([
      { fields: [
        {
          label: "Name",
          type: "cexolocstring",
          value: " Exact Name ",
          strRef: 0xffff_ffff,
        },
        { label: "Tag", type: "cexostring", value: "EXACT_TAG" },
      ] },
    ], "ARE "));
    expect(exact?.basicIdentity).toEqual({
      name: " Exact Name ",
      nameProfile: "simple_inline_ascii",
      nameEntries: [{ languageId: 0, text: " Exact Name " }],
      tag: "EXACT_TAG",
    });

    const multiEntry = parseAreaMetadataFromAreGff(buildNestedGffBuffer([
      { fields: [
        { label: "Name", type: "cexolocstring", value: {
          strRef: 0xffff_ffff,
          entries: [
            { languageId: 3, textBytes: Buffer.from("Nom", "ascii") },
            { languageId: 0, textBytes: Buffer.from("Exact Name", "ascii") },
            { languageId: 8, textBytes: Buffer.alloc(0) },
          ],
        } },
        { label: "Tag", type: "cexostring", value: "EXACT_TAG" },
      ] },
    ], "ARE "));
    expect(multiEntry?.basicIdentity).toEqual({
      name: "Exact Name",
      nameProfile: "multi_entry_inline_ascii",
      nameEntries: [
        { languageId: 3, text: "Nom" },
        { languageId: 0, text: "Exact Name" },
        { languageId: 8, text: "" },
      ],
      tag: "EXACT_TAG",
    });

    const unsupported = parseAreaMetadataFromAreGff(buildNestedGffBuffer([
      { fields: [
        { label: "Name", type: "cexolocstring", value: {
          strRef: 42,
          entries: [{ languageId: 0, textBytes: Buffer.from("Talk table") }],
        } },
        { label: "tag", type: "cexostring", value: "wrong_case" },
        { label: "Tag", type: "cexostring", value: "duplicate_case_ambiguity" },
      ] },
    ], "ARE "));
    expect(unsupported?.basicIdentity).toBeUndefined();

    for (const value of [
      { strRef: 0xffff_ffff, entries: [
        { languageId: 0, textBytes: Buffer.from("Exact Name", "ascii") },
        { languageId: 0, textBytes: Buffer.from("Duplicate", "ascii") },
      ] },
      { strRef: 0xffff_ffff, entries: [
        { languageId: 0, textBytes: Buffer.from("Exact Name", "ascii") },
        { languageId: 2, textBytes: Buffer.from([0xff]) },
      ] },
    ]) {
      const parsed = parseAreaMetadataFromAreGff(buildNestedGffBuffer([
        { fields: [{ label: "Name", type: "cexolocstring", value }] },
      ], "ARE "));
      expect(parsed?.basicIdentity).toBeUndefined();
    }
  });

  it("exposes each exact admitted existing Area advanced flag independently", () => {
    const parsed = parseAreaMetadataFromAreGff(buildNestedGffBuffer([
      { fields: [
        { label: "Flags", type: "dword", value: 6 },
        { label: "PlayerVsPlayer", type: "byte", value: 3 },
        { label: "NoRest", type: "byte", value: 0 },
        { label: "ModListenCheck", type: "int", value: -99 },
        { label: "ModSpotCheck", type: "int", value: 99 },
        { label: "LoadScreenID", type: "word", value: 0xffff },
      ] },
    ], "ARE "));

    expect(parsed?.advancedFlags).toEqual({
      terrainType: { interior: false, natural: true, subterranean: true },
      playerVsPlayer: 3,
      noRest: false,
      listenCheckModifier: -99,
      spotCheckModifier: 99,
      loadingScreenId: 0xffff,
    });
  });

  it.each([
    ["wrong case", "loadscreenid", "word", 7],
    ["wrong type", "LoadScreenID", "dword", 7],
    ["case ambiguity", "LOADSCREENID", "word", 8],
  ] as const)("keeps Area loading-screen provenance preserve-only for %s", (_label, label, type, value) => {
    const fields = [{ label: "LoadScreenID", type: "word" as const, value: 7 }];
    if (_label === "case ambiguity") fields.push({ label, type, value } as never);
    else fields[0] = { label, type, value } as never;
    const parsed = parseAreaMetadataFromAreGff(buildNestedGffBuffer([{ fields }], "ARE "));
    expect(parsed?.advancedFlags).toBeUndefined();
  });

  it.each([
    ["wrong case", "modlistencheck", "int", 0],
    ["wrong type", "ModListenCheck", "dword", 0],
    ["below Toolset range", "ModListenCheck", "int", -100],
    ["above Toolset range", "ModSpotCheck", "int", 100],
  ] as const)("keeps an Area check modifier preserve-only for %s", (_label, field, type, value) => {
    const parsed = parseAreaMetadataFromAreGff(buildNestedGffBuffer([
      { fields: [{ label: field, type, value }] },
    ], "ARE "));
    expect(parsed?.advancedFlags).toBeUndefined();
  });

  it("keeps duplicate case-ambiguous Area check modifiers preserve-only", () => {
    const parsed = parseAreaMetadataFromAreGff(buildNestedGffBuffer([
      { fields: [
        { label: "ModListenCheck", type: "int", value: 0 },
        { label: "MODLISTENCHECK", type: "int", value: 1 },
      ] },
    ], "ARE "));
    expect(parsed?.advancedFlags).toBeUndefined();
  });

  it.each([
    ["wrong case", [
      { label: "flags", type: "dword" as const, value: 7 },
      { label: "playervsplayer", type: "byte" as const, value: 2 },
      { label: "norest", type: "byte" as const, value: 1 },
    ]],
    ["wrong type", [
      { label: "Flags", type: "byte" as const, value: 7 },
      { label: "PlayerVsPlayer", type: "dword" as const, value: 2 },
      { label: "NoRest", type: "dword" as const, value: 1 },
    ]],
    ["out of domain", [
      { label: "Flags", type: "dword" as const, value: 8 },
      { label: "PlayerVsPlayer", type: "byte" as const, value: 4 },
      { label: "NoRest", type: "byte" as const, value: 2 },
    ]],
    ["case ambiguity", [
      { label: "Flags", type: "dword" as const, value: 7 },
      { label: "FLAGS", type: "dword" as const, value: 0 },
      { label: "PlayerVsPlayer", type: "byte" as const, value: 2 },
      { label: "PLAYERVSPLAYER", type: "byte" as const, value: 0 },
      { label: "NoRest", type: "byte" as const, value: 1 },
      { label: "NOREST", type: "byte" as const, value: 0 },
    ]],
  ])("keeps %s Area advanced fields preserve-only", (_label, fields) => {
    const parsed = parseAreaMetadataFromAreGff(buildNestedGffBuffer([
      { fields },
    ], "ARE "));
    expect(parsed?.advancedFlags).toBeUndefined();
  });

  it("parses VisualTransform globally for non-placeable GIT placement lists", () => {
    const bytes = buildNestedGffBuffer(
      [
        {
          fields: [
            { label: "SoundList", type: "list", value: [1] },
            { label: "StoreList", type: "list", value: [2] },
            { label: "TriggerList", type: "list", value: [3] },
            { label: "WaypointList", type: "list", value: [4] }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "snd_fireplace" },
            { label: "XPosition", type: "float", value: 1 },
            { label: "YPosition", type: "float", value: 2 },
            { label: "VisualTransform", type: "struct", value: 5 }
          ]
        },
        {
          fields: [
            { label: "ResRef", type: "resref", value: "sto_merchant" },
            { label: "XPosition", type: "float", value: 3 },
            { label: "YPosition", type: "float", value: 4 },
            { label: "VisualTransform", type: "struct", value: 6 }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "trg_exit" },
            { label: "XPosition", type: "float", value: 5 },
            { label: "YPosition", type: "float", value: 6 },
            { label: "VisualTransform", type: "struct", value: 7 }
          ]
        },
        {
          fields: [
            { label: "Tag", type: "cexostring", value: "wp_exit" },
            { label: "XPosition", type: "float", value: 7 },
            { label: "YPosition", type: "float", value: 8 },
            { label: "VisualTransform", type: "struct", value: 8 }
          ]
        },
        {
          fields: [{ label: "TranslateZ", type: "float", value: 1.5 }]
        },
        {
          fields: [{ label: "ScaleX", type: "float", value: 1.25 }]
        },
        {
          fields: [{ label: "RotateZ", type: "float", value: 45 }]
        },
        {
          fields: [{ label: "TranslateX", type: "float", value: -2 }]
        }
      ],
      "GIT "
    );

    const parsed = parseAreaObjectsFromGitGff(bytes);

    expect(parsed?.sounds[0]?.visualTransform).toMatchObject({ translateZ: 1.5 });
    expect(parsed?.stores[0]?.visualTransform).toMatchObject({ scaleX: 1.25 });
    expect(parsed?.triggers[0]?.visualTransform).toMatchObject({ rotateZ: 45 });
    expect(parsed?.waypoints[0]?.visualTransform).toMatchObject({ translateX: -2 });
  });

  it("parses all Aurora GIT placement lists including trigger geometry fallback", () => {
    const bytes = buildNestedGffBuffer(
      [
        {
          fields: [
            { label: "Encounter List", type: "list", value: [1] },
            { label: "List", type: "list", value: [2] },
            { label: "StoreList", type: "list", value: [3] },
            { label: "TriggerList", type: "list", value: [4] },
            { label: "WaypointList", type: "list", value: [7] }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "enc_city_patrol" },
            { label: "Tag", type: "cexostring", value: "enc_patrol_tag" },
            { label: "XPosition", type: "float", value: 10 },
            { label: "YPosition", type: "float", value: 20 },
            { label: "ZPosition", type: "float", value: 0.5 }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "itm_key_01" },
            { label: "XPosition", type: "float", value: 1 },
            { label: "YPosition", type: "float", value: 2 }
          ]
        },
        {
          fields: [
            { label: "ResRef", type: "resref", value: "sto_blacksmith" },
            { label: "Tag", type: "cexostring", value: "merchant_store" },
            { label: "XPosition", type: "float", value: 3 },
            { label: "YPosition", type: "float", value: 4 }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "trg_transition" },
            { label: "Tag", type: "cexostring", value: "exit_trigger" },
            { label: "Geometry", type: "list", value: [5, 6] }
          ]
        },
        {
          fields: [
            { label: "PointX", type: "float", value: 0 },
            { label: "PointY", type: "float", value: 0 },
            { label: "PointZ", type: "float", value: 0 }
          ]
        },
        {
          fields: [
            { label: "PointX", type: "float", value: 4 },
            { label: "PointY", type: "float", value: 2 },
            { label: "PointZ", type: "float", value: 2 }
          ]
        },
        {
          fields: [
            { label: "Tag", type: "cexostring", value: "wp_market_entry" },
            { label: "XPosition", type: "float", value: 8 },
            { label: "YPosition", type: "float", value: 9 }
          ]
        }
      ],
      "GIT "
    );

    const parsed = parseAreaObjectsFromGitGff(bytes);

    expect(parsed?.encounters).toHaveLength(1);
    expect(parsed?.items).toHaveLength(1);
    expect(parsed?.stores).toHaveLength(1);
    expect(parsed?.triggers).toHaveLength(1);
    expect(parsed?.waypoints).toHaveLength(1);
    expect(parsed?.encounters[0]).toMatchObject({
      listKind: "encounter",
      templateResRef: "enc_city_patrol",
      tag: "enc_patrol_tag",
      x: 10,
      y: 20,
      z: 0.5
    });
    expect(parsed?.items[0]).toMatchObject({
      listKind: "item",
      templateResRef: "itm_key_01",
      x: 1,
      y: 2
    });
    expect(parsed?.stores[0]).toMatchObject({
      listKind: "store",
      templateResRef: "sto_blacksmith",
      tag: "merchant_store",
      x: 3,
      y: 4
    });
    expect(parsed?.triggers[0]).toMatchObject({
      listKind: "trigger",
      templateResRef: "trg_transition",
      tag: "exit_trigger",
      x: 2,
      y: 1,
      z: 1,
      geometry: [
        { x: 0, y: 0, z: 0 },
        { x: 4, y: 2, z: 2 }
      ]
    });
    expect(parsed?.waypoints[0]).toMatchObject({
      listKind: "waypoint",
      tag: "wp_market_entry",
      x: 8,
      y: 9
    });
  });

  it("projects exact retained Trigger and empty-spawn Encounter polygons separately from centroid geometry", () => {
    const bytes = buildNestedGffBuffer(
      [
        {
          typeId: 0,
          fields: [
            { label: "TriggerList", type: "list", value: [1] },
            { label: "Encounter List", type: "list", value: [5] },
          ],
        },
        {
          typeId: 1,
          fields: [
            { label: "TemplateResRef", type: "resref", value: "newgeneric" },
            { label: "XPosition", type: "float", value: 10 },
            { label: "YPosition", type: "float", value: 20 },
            { label: "ZPosition", type: "float", value: 0 },
            { label: "Geometry", type: "list", value: [2, 3, 4] },
          ],
        },
        { typeId: 3, fields: triggerPoint(0, 0, 0) },
        { typeId: 3, fields: triggerPoint(4, 0, 0) },
        { typeId: 3, fields: triggerPoint(0, 2, 1) },
        {
          typeId: 7,
          fields: [
            { label: "TemplateResRef", type: "resref", value: "newencounter" },
            { label: "XPosition", type: "float", value: 30 },
            { label: "YPosition", type: "float", value: 40 },
            { label: "ZPosition", type: "float", value: 0.25 },
            { label: "Geometry", type: "list", value: [6, 7, 8] },
            { label: "SpawnPointList", type: "list", value: [] },
          ],
        },
        { typeId: 1, fields: encounterPoint(-1, -1, 0.25) },
        { typeId: 1, fields: encounterPoint(2, -1, 0.25) },
        { typeId: 1, fields: encounterPoint(0, 2, 0.25) },
      ],
      "GIT ",
    );

    const parsed = parseAreaObjectsFromGitGff(bytes);

    expect(parsed?.triggers[0]?.polygonGeometry).toEqual({
      coordinateSpace: "native_local",
      points: [
        { x: 0, y: 0, z: 0 },
        { x: 4, y: 0, z: 0 },
        { x: 0, y: 2, z: 1 },
      ],
    });
    expect(parsed?.encounters[0]?.polygonGeometry).toEqual({
      coordinateSpace: "native_local",
      points: [
        { x: -1, y: -1, z: 0.25 },
        { x: 2, y: -1, z: 0.25 },
        { x: 0, y: 2, z: 0.25 },
      ],
    });
  });

  it.each([
    [
      "wrong Trigger point struct type",
      [
        { typeId: 0, fields: [{ label: "TriggerList", type: "list" as const, value: [1] }] },
        {
          typeId: 1,
          fields: [
            { label: "XPosition", type: "float" as const, value: 0 },
            { label: "YPosition", type: "float" as const, value: 0 },
            { label: "Geometry", type: "list" as const, value: [2, 3, 4] },
          ],
        },
        { typeId: 1, fields: triggerPoint(0, 0, 0) },
        { typeId: 3, fields: triggerPoint(4, 0, 0) },
        { typeId: 3, fields: triggerPoint(0, 2, 0) },
      ],
      "triggers",
    ],
    [
      "wrong-case Trigger coordinate label",
      [
        { typeId: 0, fields: [{ label: "TriggerList", type: "list" as const, value: [1] }] },
        {
          typeId: 1,
          fields: [
            { label: "XPosition", type: "float" as const, value: 0 },
            { label: "YPosition", type: "float" as const, value: 0 },
            { label: "Geometry", type: "list" as const, value: [2, 3, 4] },
          ],
        },
        { typeId: 3, fields: [{ label: "pointx", type: "float" as const, value: 0 }, ...triggerPoint(0, 0, 0).slice(1)] },
        { typeId: 3, fields: triggerPoint(4, 0, 0) },
        { typeId: 3, fields: triggerPoint(0, 2, 0) },
      ],
      "triggers",
    ],
    [
      "non-empty Encounter SpawnPointList",
      [
        { typeId: 0, fields: [{ label: "Encounter List", type: "list" as const, value: [1] }] },
        {
          typeId: 7,
          fields: [
            { label: "XPosition", type: "float" as const, value: 0 },
            { label: "YPosition", type: "float" as const, value: 0 },
            { label: "Geometry", type: "list" as const, value: [2, 3, 4] },
            { label: "SpawnPointList", type: "list" as const, value: [5] },
          ],
        },
        { typeId: 1, fields: encounterPoint(0, 0, 0) },
        { typeId: 1, fields: encounterPoint(4, 0, 0) },
        { typeId: 1, fields: encounterPoint(0, 2, 0) },
        { typeId: 2, fields: [] },
      ],
      "encounters",
    ],
  ] satisfies ReadonlyArray<readonly [string, StructDef[], "triggers" | "encounters"]>)(
    "keeps $0 preserve-only instead of exposing editable polygon provenance",
    (_name, structs, family) => {
      const parsed = parseAreaObjectsFromGitGff(buildNestedGffBuffer(structs, "GIT "));
      expect(parsed?.[family][0]).not.toHaveProperty("polygonGeometry");
    },
  );

  it("parses GIT AreaProperties audio settings into soundIds", () => {
    const bytes = buildNestedGffBuffer(
      [
        {
          fields: [
            { label: "AreaProperties", type: "struct", value: 1 },
            { label: "Creature List", type: "list", value: [] }
          ]
        },
        {
          fields: [
            { label: "AmbientSndDay", type: "int", value: 41 },
            { label: "AmbientSndNight", type: "int", value: 52 },
            { label: "AmbientSndDayVol", type: "int", value: 100 },
            { label: "EnvAudio", type: "int", value: 7 },
            { label: "MusicDay", type: "int", value: 11 },
            { label: "MusicNight", type: "int", value: 12 },
            { label: "MusicBattle", type: "int", value: 13 },
            { label: "MusicDelay", type: "int", value: 30000 }
          ]
        }
      ],
      "GIT "
    );

    const parsed = parseAreaObjectsFromGitGff(bytes);

    expect(parsed).not.toBeNull();
    expect(parsed?.soundIds).toEqual({
      ambientDay: 41,
      ambientNight: 52,
      ambientDayVolume: 100,
      // Aurora defaults ambient volumes to 127 when the field is absent.
      ambientNightVolume: 127,
      envAudio: 7,
      musicDay: 11,
      musicNight: 12,
      musicBattle: 13,
      musicDelay: 30000
    });
  });

  it("returns empty soundIds when the GIT file has no AreaProperties struct", () => {
    const bytes = buildNestedGffBuffer(
      [{ fields: [{ label: "Creature List", type: "list", value: [] }] }],
      "GIT "
    );

    const parsed = parseAreaObjectsFromGitGff(bytes);

    expect(parsed).not.toBeNull();
    expect(parsed?.soundIds).toEqual({});
  });

  it("keeps DWORD lighting colors unsigned", () => {
    const bytes = buildNestedGffBuffer(
      [
        {
          fields: [
            { label: "Width", type: "dword", value: 2 },
            { label: "Height", type: "dword", value: 1 },
            { label: "SunAmbientColor", type: "dword", value: 0xff112233 },
            { label: "MoonAmbientColor", type: "dword", value: 0x80000001 }
          ]
        }
      ],
      "ARE "
    );

    const parsed = parseAreaMetadataFromAreGff(bytes);
    const lighting = Object.fromEntries(
      (parsed?.globalLighting.fields ?? []).map((field) => [field.field, field.value])
    );

    expect(lighting.SunAmbientColor).toBe(0xff112233);
    expect(lighting.MoonAmbientColor).toBe(0x80000001);
  });

  it("returns null when file type does not match parser expectation", () => {
    const areBytes = buildNestedGffBuffer([{ fields: [] }], "ARE ");
    const gitBytes = buildNestedGffBuffer([{ fields: [] }], "GIT ");

    expect(parseAreaObjectsFromGitGff(areBytes)).toBeNull();
    expect(parseAreaMetadataFromAreGff(gitBytes)).toBeNull();
  });

  it("includes placeable visual transforms in the GIT dependency fingerprint", () => {
    const buildGit = (scaleX: number) =>
      buildNestedGffBuffer(
        [
          {
            fields: [{ label: "Placeable List", type: "list", value: [1] }]
          },
          {
            fields: [
              { label: "TemplateResRef", type: "resref", value: "plc_floor_board" },
              { label: "XPosition", type: "float", value: 10 },
              { label: "YPosition", type: "float", value: 20 },
              { label: "Bearing", type: "float", value: 0 },
              { label: "VisualTransform", type: "struct", value: 2 }
            ]
          },
          {
            fields: [
              { label: "ScaleX", type: "float", value: scaleX },
              { label: "ScaleY", type: "float", value: 1 },
              { label: "ScaleZ", type: "float", value: 1 }
            ]
          }
        ],
        "GIT "
      );

    const first = parseAreaObjectsFromGitGff(buildGit(2));
    const second = parseAreaObjectsFromGitGff(buildGit(3));

    expect(first?.placeables[0]?.visualTransform?.scaleX).toBe(2);
    expect(second?.placeables[0]?.visualTransform?.scaleX).toBe(3);
    expect(first?.dependencyFingerprint).not.toBe(second?.dependencyFingerprint);
  });

  it("round-trips placed item properties through the GIT ItemList writer and parser", () => {
    const expectedItemMetadata = {
      baseItem: 16,
      modelPart1: 66,
      modelPart2: 13,
      modelPart3: 63,
      cost: 19463,
      addCost: 55,
      charges: 4,
      stackSize: 1,
      identified: true,
      stolen: true,
      plot: true,
      cursed: false,
      bodyPartRFoot: 4,
      bodyPartLFoot: 4,
      bodyPartRShin: 13,
      bodyPartLShin: 13,
      bodyPartLThigh: 3,
      bodyPartRThigh: 3,
      bodyPartPelvis: 8,
      bodyPartTorso: 43,
      bodyPartBelt: 0,
      bodyPartNeck: 1,
      bodyPartRFArm: 16,
      bodyPartLFArm: 16,
      bodyPartRBicep: 4,
      bodyPartLBicep: 4,
      bodyPartRShoul: 15,
      bodyPartLShoul: 15,
      bodyPartRHand: 3,
      bodyPartLHand: 3,
      bodyPartRobe: 0,
      leather1Color: 5,
      leather2Color: 7,
      cloth1Color: 2,
      cloth2Color: 3,
      metal1Color: 17,
      metal2Color: 8
    };
    const unsupportedRootItemMetadata = {
      costTable: 2,
      costValue: 4,
      paletteId: 9,
      "script.onused": "it_onuse",
      "script.onheartbeat": "it_heart",
      "script.onuserdefined": "it_user",
      "script.oninventorydisturbed": "it_invdst"
    };
    const expectedPropertyEntries = [
      {
        propertyName: 15,
        subtype: 66,
        costTable: 3,
        costValue: 1,
        param1: 255,
        param1Value: 0,
        chanceAppear: 100
      },
      {
        propertyName: 41,
        subtype: 13,
        costTable: 7,
        costValue: 4,
        param1: 2,
        param1Value: 8,
        chanceAppear: 65
      }
    ];
    const bytes = serializeAreaItemPlacementsToGitGff([
      {
        templateResRef: "itm_hide_armor",
        tag: "ITEM_GIT_TAG",
        localizedName: "Placed Hide Armor",
        localizedNameStrRef: 711,
        description: "Area instance description",
        descriptionStrRef: 712,
        identifiedDescription: "Known area instance",
        identifiedDescriptionStrRef: 713,
        comments: "instance comment",
        x: 12.25,
        y: 8.5,
        z: 0.75,
        bearing: 135,
        itemMetadata: {
          ...expectedItemMetadata,
          ...unsupportedRootItemMetadata,
          itemPropertyListEntries: JSON.stringify(expectedPropertyEntries)
        }
      }
    ]);

    const parsed = parseAreaObjectsFromGitGff(bytes);
    const rawDocument = parseRawGffDocument(bytes)!;
    const rawItemList = rawDocument.fields.find(
      (field) => field.label === "ItemList" && field.type === "list",
    );
    expect(rawItemList?.type).toBe("list");
    const rawItem = rawItemList?.type === "list" ? rawItemList.value[0] : undefined;
    const nativeInstanceStateLabels = new Set([
      "Charges",
      "Cost",
      "Stolen",
      "StackSize",
      "Plot",
      "AddCost",
      "Identified",
      "Cursed",
    ]);
    expect(rawItem?.fields.filter((field) => nativeInstanceStateLabels.has(field.label))).toEqual([
      { label: "Charges", type: "byte", value: 4 },
      { label: "Cost", type: "dword", value: 19463 },
      { label: "Stolen", type: "byte", value: 1 },
      { label: "StackSize", type: "word", value: 1 },
      { label: "Plot", type: "byte", value: 1 },
      { label: "AddCost", type: "dword", value: 55 },
      { label: "Identified", type: "byte", value: 1 },
      { label: "Cursed", type: "byte", value: 0 },
    ]);
    expect(rawItem?.fields.filter((field) => new Set([
      "CostTable",
      "CostValue",
      "PaletteID",
      "OnUsed",
      "OnHeartbeat",
      "OnUserDefined",
      "OnInvDisturbed",
      "Comment",
    ]).has(field.label))).toEqual([]);

    expect(parsed?.items).toHaveLength(1);
    expect(parsed?.items[0]).toMatchObject({
      templateResRef: "itm_hide_armor",
      tag: "ITEM_GIT_TAG",
      localizedName: "Placed Hide Armor",
      description: "Area instance description",
      x: 12.25,
      y: 8.5,
      z: 0.75,
      bearing: 135,
      itemMetadata: {
        templateResRef: "itm_hide_armor",
        tag: "ITEM_GIT_TAG",
        localizedName: "Placed Hide Armor",
        localizedNameStrRef: 711,
        description: "Area instance description",
        descriptionStrRef: 712,
        identifiedDescription: "Known area instance",
        identifiedDescriptionStrRef: 713,
        ...expectedItemMetadata,
        itemPropertyListCount: 2
      },
      itemInstanceState: {
        presentFields: [
          "charges",
          "cost",
          "stolen",
          "stackSize",
          "plot",
          "addCost",
          "identified",
          "cursed",
        ],
        values: {
          charges: 4,
          cost: 19463,
          stolen: true,
          stackSize: 1,
          plot: true,
          addCost: 55,
          identified: true,
          cursed: false,
        },
      },
    });
    expect(JSON.parse(String(parsed?.items[0]?.itemMetadata?.itemPropertyListEntries))).toEqual(
      expectedPropertyEntries
    );
  });

  it("round-trips supported whole-area GIT root lists without dropping item metadata", () => {
    const bytes = serializeAreaToGitGff(buildAreaRecordForWriter());
    const parsed = parseAreaObjectsFromGitGff(bytes);

    expect(parsed?.placeables).toHaveLength(1);
    expect(parsed?.creatures).toHaveLength(1);
    expect(parsed?.items).toHaveLength(1);
    expect(parsed?.placeables[0]).toMatchObject({
      templateResRef: "plc_market_stall",
      tag: "PLC_MARKET_STALL",
      localizedName: "Market Stall",
      x: 1,
      y: 2,
      bearing: 45
    });
    expect(parsed?.creatures[0]).toMatchObject({
      templateResRef: "nw_guard",
      tag: "NW_GUARD",
      x: 3,
      y: 4,
      bearing: 90,
      creatureMetadata: {
        inventoryItemListCount: 1,
        equipItemListCount: 1
      }
    });
    expect(
      JSON.parse(String(parsed?.creatures[0]?.creatureMetadata?.inventoryItemListEntries))
    ).toEqual([
      {
        sourceIndex: 0,
        resRef: "nw_it_mpotion001",
        x: 2,
        y: 3,
        dropable: true,
        pickpocketable: false
      }
    ]);
    expect(
      JSON.parse(String(parsed?.creatures[0]?.creatureMetadata?.equipItemListEntries))
    ).toEqual([
      {
        resRef: "nw_wswmls001",
        slotMask: 16,
        dropable: true,
        pickpocketable: false,
        infinite: false
      }
    ]);
    expect(parsed?.items[0]).toMatchObject({
      templateResRef: "itm_hide_armor",
      tag: "ITM_HIDE_ARMOR",
      localizedName: "Placed Hide Armor",
      itemMetadata: {
        baseItem: 16,
        modelPart1: 66,
        bodyPartTorso: 43,
        leather1Color: 5,
        metal2Color: 8,
        itemPropertyListCount: 1
      }
    });
  });

  it("does not write identity VisualTransform structs for non-static whole-area GIT objects", () => {
    const area = buildAreaRecordForWriter();
    area.objects[0] = {
      ...area.objects[0],
      isStatic: false,
      visualTransform: {
        scale: 1,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitch: 0,
        roll: 0,
        yaw: 0
      }
    };

    const bytes = serializeAreaToGitGff(area);
    const parsed = parseAreaObjectsFromGitGff(bytes);

    expect(bytes.includes(Buffer.from("VisualTransform"))).toBe(false);
    expect(parsed?.placeables[0]?.isStatic).toBe(false);
    expect(parsed?.placeables[0]?.visualTransform).toBeUndefined();
  });

  it("writes non-default VisualTransform structs for whole-area GIT objects", () => {
    const area = buildAreaRecordForWriter();
    area.objects[0] = {
      ...area.objects[0],
      isStatic: false,
      visualTransform: {
        scale: 1,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitch: 0,
        roll: 0,
        yaw: Math.PI / 2
      }
    };

    const bytes = serializeAreaToGitGff(area);
    const parsed = parseAreaObjectsFromGitGff(bytes);

    expect(bytes.includes(Buffer.from("VisualTransform"))).toBe(true);
    expect(parsed?.placeables[0]?.visualTransform?.rotateZ).toBeCloseTo(90, 5);
  });

  it("round-trips supported ARE metadata and tile list through the whole-area writer", () => {
    const bytes = serializeAreaToAreGff(buildAreaRecordForWriter());
    const parsed = parseAreaMetadataFromAreGff(bytes);

    expect(parsed).toMatchObject({
      name: "Writer Proof Area",
      tag: "writer_area_001",
      width: 2,
      height: 1,
      tileSet: "tno01",
      tiles: [
        {
          tileId: 101,
          modelResRef: "tno01_a01_01",
          orientation: 1,
          height: 0.5,
          mainLight1: 4,
          sourceLight2: 7,
          animLoop3: 1
        },
        {
          tileId: 102,
          modelResRef: "tno01_a01_02",
          orientation: 2
        }
      ],
      globalLighting: expect.objectContaining({
        fields: expect.arrayContaining([
          { field: "IsNight", value: 1 },
          { field: "ShadowOpacity", value: 50 }
        ])
      })
    });
  });

  it("exposes exact Creature Equip_ItemList mutation provenance in physical source order", () => {
    const metadata = parseCreatureEquipmentMetadata("Equip_ItemList", [
      {
        typeId: 0x10,
        fields: [
          { label: "TemplateResRef", type: "resref", value: "nw_wswmls001" },
          { label: "Dropable", type: "byte", value: 1 },
        ],
      },
      {
        typeId: 0x1,
        fields: [
          { label: "TemplateResRef", type: "resref", value: "nw_helm001" },
          { label: "Pickpocketable", type: "byte", value: 1 },
        ],
      },
    ]);

    expect(metadata?.equipItemListCount).toBe(2);
    expect(JSON.parse(String(metadata?.equipItemListMutationEntries))).toEqual([
      {
        sourceIndex: 0,
        resRef: "nw_wswmls001",
        slotMask: 0x10,
        dropable: true,
        pickpocketable: false,
      },
      {
        sourceIndex: 1,
        resRef: "nw_helm001",
        slotMask: 0x1,
        dropable: false,
        pickpocketable: true,
      },
    ]);
  });

  it("exposes exact presence-sensitive Creature Tag provenance without normalization", () => {
    expect(parseCreatureTag([{ label: "Tag", type: "cexostring", value: "  NW_GUARD  " }]))
      .toEqual({ present: true, value: "  NW_GUARD  " });
    expect(parseCreatureTag([])).toEqual({ present: false });
    expect(parseCreatureTag([{ label: "Tag", type: "cexostring", value: "" }]))
      .toEqual({ present: true, value: "" });
  });

  it("exposes exact presence-sensitive Creature Conversation provenance without normalization", () => {
    expect(parseCreatureConversation([
      { label: "Conversation", type: "resref", value: "Guard_Dialog" },
    ])).toEqual({ present: true, value: "Guard_Dialog" });
    expect(parseCreatureConversation([])).toEqual({ present: false });
    expect(parseCreatureConversation([
      { label: "Conversation", type: "resref", value: "" },
    ])).toEqual({ present: true, value: "" });
  });

  it("exposes exact presence-sensitive Creature Interruptable Byte provenance", () => {
    expect(parseCreatureInterruptable([
      { label: "Interruptable", type: "byte", value: 0 },
    ])).toEqual({ present: true, value: 0 });
    expect(parseCreatureInterruptable([
      { label: "Interruptable", type: "byte", value: 1 },
    ])).toEqual({ present: true, value: 1 });
    expect(parseCreatureInterruptable([])).toEqual({ present: false });
  });

  it("exposes the complete exact presence-sensitive Creature advanced flag group", () => {
    expect(parseCreatureAdvancedFlags([
      { label: "Disarmable", type: "byte", value: 1 },
      { label: "Plot", type: "byte", value: 0 },
      { label: "IsImmortal", type: "byte", value: 1 },
      { label: "Lootable", type: "byte", value: 0 },
      { label: "NoPermDeath", type: "byte", value: 1 },
    ])).toEqual({
      disarmable: { present: true, value: 1 },
      plot: { present: true, value: 0 },
      immortal: { present: true, value: 1 },
      lootable: { present: true, value: 0 },
      noPermanentDeath: { present: true, value: 1 },
    });
    expect(parseCreatureAdvancedFlags([])).toEqual({
      disarmable: { present: false },
      plot: { present: false },
      immortal: { present: false },
      lootable: { present: false },
      noPermanentDeath: { present: false },
    });
  });

  it("exposes exact independent Creature BodyBag Byte and DecayTime DWord storage", () => {
    expect(parseCreatureDeathRemains([
      { label: "BodyBag", type: "byte", value: 6 },
      { label: "DecayTime", type: "dword", value: 12_000 },
    ])).toEqual({
      creatureBodyBag: { present: true, nativeType: "byte", value: 6 },
      creatureDecayTime: {
        present: true,
        nativeType: "dword",
        valueMilliseconds: 12_000,
      },
    });
    expect(parseCreatureDeathRemains([])).toEqual({
      creatureBodyBag: { present: false },
      creatureDecayTime: { present: false },
    });
    expect(parseCreatureDeathRemains([
      { label: "BodyBag", type: "byte", value: 2 },
      { label: "DecayTime", type: "dword", value: 45 },
    ])).toEqual({
      creatureBodyBag: { present: true, nativeType: "byte", value: 2 },
      creatureDecayTime: {
        present: true,
        nativeType: "dword",
        valueMilliseconds: 45,
      },
    });
  });

  it("exposes only exact canonical Creature FactionID Word storage", () => {
    expect(parseCreatureFaction([
      { label: "FactionID", type: "word", value: 4 },
    ])).toEqual({ present: true, nativeType: "word", value: 4 });
    expect(parseCreatureFaction([])).toEqual({ present: false });
    expect(parseCreatureFaction([
      { label: "FactionID", type: "dword", value: 4 },
    ])).toBeUndefined();
  });

  it.each([
    ["wrong case", [{ label: "FactionId", type: "word", value: 1 }]],
    ["wrong type", [{ label: "FactionID", type: "dword", value: 1 }]],
    ["duplicate", [
      { label: "FactionID", type: "word", value: 1 },
      { label: "FactionID", type: "word", value: 4 },
    ]],
  ] as const)("suppresses exact Creature FactionID provenance for %s", (_label, fields) => {
    expect(parseCreatureFaction(fields as readonly SupportedField[])).toBeUndefined();
  });

  it("exposes only exact presence-sensitive Creature TemplateResRef storage", () => {
    expect(parseCreatureTemplateResRef([
      { label: "TemplateResRef", type: "resref", value: "nw_dwarfmerc001" },
    ])).toEqual({
      present: true,
      nativeType: "resref",
      value: "nw_dwarfmerc001",
    });
    expect(parseCreatureTemplateResRef([])).toEqual({ present: false });
  });

  it.each([
    ["wrong case", [{ label: "Templateresref", type: "resref", value: "nw_dwarfmerc001" }]],
    ["wrong type", [{ label: "TemplateResRef", type: "cexostring", value: "nw_dwarfmerc001" }]],
    ["uppercase value", [{ label: "TemplateResRef", type: "resref", value: "NW_DWARFMERC001" }]],
    ["empty value", [{ label: "TemplateResRef", type: "resref", value: "" }]],
    ["duplicate", [
      { label: "TemplateResRef", type: "resref", value: "nw_dwarfmerc001" },
      { label: "TemplateResRef", type: "resref", value: "nw_dwarfmerc002" },
    ]],
  ] as const)("suppresses exact Creature TemplateResRef provenance for %s", (_label, fields) => {
    expect(parseCreatureTemplateResRef(fields as readonly SupportedField[])).toBeUndefined();
  });

  it("exposes exact presence-sensitive Creature Subrace and Deity CExoString storage", () => {
    expect(parseCreatureSpecialIdentityStrings([
      { label: "Subrace", type: "cexostring", value: "Moon Elf" },
      { label: "Deity", type: "cexostring", value: "" },
    ])).toEqual({
      subrace: {
        present: true,
        nativeType: "cexostring",
        value: "Moon Elf",
      },
      deity: {
        present: true,
        nativeType: "cexostring",
        value: "",
      },
    });
    expect(parseCreatureSpecialIdentityStrings([])).toEqual({
      subrace: { present: false },
      deity: { present: false },
    });
  });

  it.each([
    ["wrong Subrace case", [{ label: "SubRace", type: "cexostring", value: "Moon Elf" }]],
    ["wrong Deity type", [{ label: "Deity", type: "resref", value: "mystra" }]],
    ["legacy Subrace locstring", [{ label: "Subrace", type: "cexolocstring", value: "Moon Elf" }]],
    ["non-ASCII Deity", [{ label: "Deity", type: "cexostring", value: "Mystra " }]],
    ["overlong Subrace", [{ label: "Subrace", type: "cexostring", value: "S".repeat(257) }]],
    ["duplicate Deity", [
      { label: "Deity", type: "cexostring", value: "Mystra" },
      { label: "Deity", type: "cexostring", value: "Selune" },
    ]],
  ] as const)("suppresses exact Creature Subrace/Deity provenance for %s", (_label, fields) => {
    expect(parseCreatureSpecialIdentityStrings(fields as readonly SupportedField[])).toBeUndefined();
  });

  it("exposes the exact presence-sensitive thirteen-member Creature script ResRef group", () => {
    const fields: SupportedField[] = [
      ["ScriptHeartbeat", "nw_c2_default1"],
      ["ScriptOnNotice", "nw_c2_default2"],
      ["ScriptSpellAt", "nw_c2_defaultb"],
      ["ScriptAttacked", "nw_c2_default5"],
      ["ScriptDamaged", "nw_c2_default6"],
      ["ScriptDisturbed", "nw_c2_default8"],
      ["ScriptEndRound", "nw_c2_default3"],
      ["ScriptDialogue", "nw_c2_default4"],
      ["ScriptRested", "nw_c2_defaulta"],
      ["ScriptDeath", "nw_c2_default7"],
      ["ScriptUserDefine", "nw_c2_defaultd"],
      ["ScriptOnBlocked", "nw_c2_defaulte"],
    ].map(([label, value]) => ({ label, type: "resref", value } as SupportedField));

    expect(parseCreatureScriptResRefs(fields)).toEqual({
      onHeartbeat: { present: true, nativeType: "resref", value: "nw_c2_default1" },
      onPerception: { present: true, nativeType: "resref", value: "nw_c2_default2" },
      onSpellCastAt: { present: true, nativeType: "resref", value: "nw_c2_defaultb" },
      onPhysicalAttacked: { present: true, nativeType: "resref", value: "nw_c2_default5" },
      onDamaged: { present: true, nativeType: "resref", value: "nw_c2_default6" },
      onDisturbed: { present: true, nativeType: "resref", value: "nw_c2_default8" },
      onCombatRoundEnd: { present: true, nativeType: "resref", value: "nw_c2_default3" },
      onConversation: { present: true, nativeType: "resref", value: "nw_c2_default4" },
      onSpawn: { present: false },
      onRested: { present: true, nativeType: "resref", value: "nw_c2_defaulta" },
      onDeath: { present: true, nativeType: "resref", value: "nw_c2_default7" },
      onUserDefined: { present: true, nativeType: "resref", value: "nw_c2_defaultd" },
      onBlocked: { present: true, nativeType: "resref", value: "nw_c2_defaulte" },
    });
  });

  it.each([
    ["wrong label case", [{ label: "ScriptHeartBeat", type: "resref", value: "main" }]],
    ["wrong native type", [{ label: "ScriptSpawn", type: "cexostring", value: "main" }]],
    ["invalid ResRef", [{ label: "ScriptSpawn", type: "resref", value: "bad-resref" }]],
    ["duplicate field", [
      { label: "ScriptSpawn", type: "resref", value: "main" },
      { label: "ScriptSpawn", type: "resref", value: "other" },
    ]],
  ] as const)("suppresses Creature script provenance for %s", (_label, fields) => {
    expect(parseCreatureScriptResRefs(fields as readonly SupportedField[])).toBeUndefined();
  });

  it("exposes exact presence-sensitive Creature Appearance_Type Word provenance", () => {
    expect(parseCreatureAppearance([
      { label: "Appearance_Type", type: "word", value: 249 },
    ])).toEqual({ present: true, nativeType: "word", value: 249 });
    expect(parseCreatureAppearance([])).toEqual({ present: false });
    expect(parseCreatureAppearance([
      { label: "Appearance_Type", type: "word", value: 0xffff },
    ])).toEqual({ present: true, nativeType: "word", value: 0xffff });
  });

  it("exposes exact presence-sensitive Creature Gender Byte provenance", () => {
    expect(parseCreatureGender([
      { label: "Gender", type: "byte", value: 4 },
    ])).toEqual({ present: true, nativeType: "byte", value: 4 });
    expect(parseCreatureGender([])).toEqual({ present: false });
    expect(parseCreatureGender([
      { label: "Gender", type: "byte", value: 0xff },
    ])).toEqual({ present: true, nativeType: "byte", value: 0xff });
  });

  it("exposes exact presence-sensitive Creature PerceptionRange Byte provenance", () => {
    expect(parseCreaturePerceptionRange([
      { label: "PerceptionRange", type: "byte", value: 11 },
    ])).toEqual({ present: true, nativeType: "byte", value: 11 });
    expect(parseCreaturePerceptionRange([])).toEqual({ present: false });
    expect(parseCreaturePerceptionRange([
      { label: "PerceptionRange", type: "byte", value: 0xff },
    ])).toEqual({ present: true, nativeType: "byte", value: 0xff });
  });

  it("exposes exact presence-sensitive Creature WalkRate Int provenance", () => {
    expect(parseCreatureWalkRate([
      { label: "WalkRate", type: "int", value: 4 },
    ])).toEqual({ present: true, nativeType: "int", value: 4 });
    expect(parseCreatureWalkRate([])).toEqual({ present: false });
    expect(parseCreatureWalkRate([
      { label: "WalkRate", type: "int", value: -0x8000_0000 },
    ])).toEqual({ present: true, nativeType: "int", value: -0x8000_0000 });
  });

  it("exposes exact presence-sensitive Creature SoundSetFile Word provenance", () => {
    expect(parseCreatureSoundSetFile([
      { label: "SoundSetFile", type: "word", value: 0 },
    ])).toEqual({ present: true, nativeType: "word", value: 0 });
    expect(parseCreatureSoundSetFile([])).toEqual({ present: false });
    expect(parseCreatureSoundSetFile([
      { label: "SoundSetFile", type: "word", value: 0xffff },
    ])).toEqual({ present: true, nativeType: "word", value: 0xffff });
  });

  it("exposes exact presence-sensitive Creature StartingPackage Byte with canonical ClassList", () => {
    expect(parseCreatureStartingPackage(
      [{ label: "StartingPackage", type: "byte", value: 0 }],
      [
        { label: "ClassLevel", type: "short", value: 4 },
        { label: "Class", type: "int", value: 4 },
      ],
    )).toEqual({ present: true, nativeType: "byte", value: 0, classIds: [4] });
    expect(parseCreatureStartingPackage([], [
      { label: "ClassLevel", type: "short", value: 4 },
      { label: "Class", type: "int", value: 4 },
    ])).toEqual({ present: false });
  });

  it("preserves StartingPackage without selector binding when ClassList is absent or malformed", () => {
    expect(parseCreatureStartingPackage([
      { label: "StartingPackage", type: "byte", value: 2 },
    ])).toEqual({ present: true, nativeType: "byte", value: 2 });
    expect(parseCreatureStartingPackage(
      [{ label: "StartingPackage", type: "byte", value: 2 }],
      [
        { label: "ClassLevel", type: "short", value: 4 },
        { label: "class", type: "int", value: 4 },
      ],
    )).toEqual({ present: true, nativeType: "byte", value: 2 });
  });

  it("exposes an exact physical Creature SkillList Byte vector with opaque sibling counts", () => {
    expect(parseCreatureSkillList(
      [{ label: "SkillList", type: "list", value: [2, 3] }],
      [
        {
          typeId: 0,
          fields: [
            { label: "Rank", type: "byte", value: 4 },
            { label: "Opaque", type: "cexostring", value: "preserve" },
          ],
        },
        { typeId: 0, fields: [{ label: "Rank", type: "byte", value: 0 }] },
      ],
    )).toEqual({
      present: true,
      nativeType: "list",
      structTypeId: 0,
      rankNativeType: "byte",
      ranks: [4, 0],
      opaqueSiblingFieldCounts: [1, 0],
    });
    expect(parseCreatureSkillList([], [])).toEqual({ present: false });
  });

  it.each([
    ["wrong list case", [{ label: "Skilllist", type: "list" as const, value: [2] }], [
      { typeId: 0, fields: [{ label: "Rank", type: "byte" as const, value: 1 }] },
    ]],
    ["wrong entry type", [{ label: "SkillList", type: "list" as const, value: [2] }], [
      { typeId: 1, fields: [{ label: "Rank", type: "byte" as const, value: 1 }] },
    ]],
    ["wrong Rank type", [{ label: "SkillList", type: "list" as const, value: [2] }], [
      { typeId: 0, fields: [{ label: "Rank", type: "word" as const, value: 1 }] },
    ]],
    ["duplicate Rank", [{ label: "SkillList", type: "list" as const, value: [2] }], [
      { typeId: 0, fields: [
        { label: "Rank", type: "byte" as const, value: 1 },
        { label: "Rank", type: "byte" as const, value: 2 },
      ] },
    ]],
  ])("suppresses exact Creature SkillList provenance for %s", (_label, fields, entries) => {
    expect(parseCreatureSkillList(
      fields as readonly SupportedField[],
      entries as readonly StructDef[],
    )).toBeUndefined();
  });

  it("exposes an exact ordered Creature FeatList Word vector with opaque sibling counts", () => {
    expect(parseCreatureFeatList(
      [{ label: "FeatList", type: "list", value: [2, 3, 4] }],
      [
        {
          typeId: 1,
          fields: [
            { label: "Feat", type: "word", value: 40 },
            { label: "Opaque", type: "cexostring", value: "preserve" },
          ],
        },
        { typeId: 1, fields: [{ label: "Feat", type: "word", value: 7 }] },
        { typeId: 1, fields: [{ label: "Feat", type: "word", value: 40 }] },
      ],
    )).toEqual({
      present: true,
      nativeType: "list",
      structTypeId: 1,
      featNativeType: "word",
      featIds: [40, 7, 40],
      opaqueSiblingFieldCounts: [1, 0, 0],
    });
    expect(parseCreatureFeatList([], [])).toEqual({ present: false });
    expect(parseCreatureFeatList([
      { label: "FeatList", type: "list", value: [] },
    ], [])).toEqual({
      present: true,
      nativeType: "list",
      structTypeId: 1,
      featNativeType: "word",
      featIds: [],
      opaqueSiblingFieldCounts: [],
    });
  });

  it.each([
    ["wrong list case", [{ label: "Featlist", type: "list" as const, value: [2] }], [
      { typeId: 1, fields: [{ label: "Feat", type: "word" as const, value: 1 }] },
    ]],
    ["wrong entry type", [{ label: "FeatList", type: "list" as const, value: [2] }], [
      { typeId: 0, fields: [{ label: "Feat", type: "word" as const, value: 1 }] },
    ]],
    ["wrong Feat type", [{ label: "FeatList", type: "list" as const, value: [2] }], [
      { typeId: 1, fields: [{ label: "Feat", type: "dword" as const, value: 1 }] },
    ]],
    ["duplicate Feat field", [{ label: "FeatList", type: "list" as const, value: [2] }], [
      { typeId: 1, fields: [
        { label: "Feat", type: "word" as const, value: 1 },
        { label: "Feat", type: "word" as const, value: 2 },
      ] },
    ]],
  ])("suppresses exact Creature FeatList provenance for %s", (_label, fields, entries) => {
    expect(parseCreatureFeatList(
      fields as readonly SupportedField[],
      entries as readonly StructDef[],
    )).toBeUndefined();
  });

  it("exposes exact same-roster Creature ClassList level provenance", () => {
    expect(parseCreatureClassLevelState(
      [{ label: "ClassList", type: "list", value: [2, 3] }],
      [
        {
          typeId: 2,
          fields: [
            { label: "Class", type: "int", value: 1 },
            { label: "ClassLevel", type: "short", value: 3 },
            { label: "KnownList0", type: "list", value: [] },
          ],
        },
        {
          typeId: 2,
          fields: [
            { label: "Class", type: "int", value: 9 },
            { label: "ClassLevel", type: "short", value: 2 },
          ],
        },
      ],
    )).toEqual({
      present: true,
      nativeType: "list",
      structTypeId: 2,
      classNativeType: "int",
      levelNativeType: "short",
      entries: [
        { classId: 1, level: 3, opaqueSiblingFieldCount: 1 },
        { classId: 9, level: 2, opaqueSiblingFieldCount: 0 },
      ],
    });
    expect(parseCreatureClassLevelState([], [])).toEqual({ present: false });
  });

  it.each([
    ["wrong list case", [{ label: "Classlist", type: "list" as const, value: [2] }], [
      { typeId: 2, fields: [
        { label: "Class", type: "int" as const, value: 1 },
        { label: "ClassLevel", type: "short" as const, value: 1 },
      ] },
    ]],
    ["wrong struct type", [{ label: "ClassList", type: "list" as const, value: [2] }], [
      { typeId: 1, fields: [
        { label: "Class", type: "int" as const, value: 1 },
        { label: "ClassLevel", type: "short" as const, value: 1 },
      ] },
    ]],
    ["wrong level type", [{ label: "ClassList", type: "list" as const, value: [2] }], [
      { typeId: 2, fields: [
        { label: "Class", type: "int" as const, value: 1 },
        { label: "ClassLevel", type: "byte" as const, value: 1 },
      ] },
    ]],
    ["duplicate Class", [{ label: "ClassList", type: "list" as const, value: [2] }], [
      { typeId: 2, fields: [
        { label: "Class", type: "int" as const, value: 1 },
        { label: "Class", type: "int" as const, value: 2 },
        { label: "ClassLevel", type: "short" as const, value: 1 },
      ] },
    ]],
    ["zero level", [{ label: "ClassList", type: "list" as const, value: [2] }], [
      { typeId: 2, fields: [
        { label: "Class", type: "int" as const, value: 1 },
        { label: "ClassLevel", type: "short" as const, value: 0 },
      ] },
    ]],
    ["duplicate class IDs", [{ label: "ClassList", type: "list" as const, value: [2, 3] }], [
      { typeId: 2, fields: [
        { label: "Class", type: "int" as const, value: 1 },
        { label: "ClassLevel", type: "short" as const, value: 1 },
      ] },
      { typeId: 2, fields: [
        { label: "Class", type: "int" as const, value: 1 },
        { label: "ClassLevel", type: "short" as const, value: 2 },
      ] },
    ]],
  ])("suppresses exact Creature ClassList level provenance for %s", (
    _label,
    fields,
    entries,
  ) => {
    expect(parseCreatureClassLevelState(
      fields as readonly SupportedField[],
      entries as readonly StructDef[],
    )).toBeUndefined();
  });

  it("exposes canonical Creature PortraitId Word with exact Gender/Race selector context", () => {
    expect(parseCreaturePortrait([
      { label: "PortraitId", type: "word", value: 462 },
      { label: "Gender", type: "byte", value: 0 },
      { label: "Race", type: "byte", value: 4 },
    ])).toEqual({
      present: true,
      nativeType: "word",
      value: 462,
      selectorContext: { genderValue: 0, raceValue: 4 },
    });
    expect(parseCreaturePortrait([
      { label: "Portrait", type: "resref", value: "po_hm_guard" },
    ])).toEqual({ present: false });
    expect(parseCreaturePortrait([
      { label: "PortraitId", type: "word", value: 462 },
    ])).toEqual({ present: true, nativeType: "word", value: 462 });
  });

  it("exposes exact presence-sensitive Creature ChallengeRating Float provenance", () => {
    expect(parseCreatureChallengeRating([
      { label: "ChallengeRating", type: "float", value: 0.1 },
    ])).toEqual({
      present: true,
      nativeType: "float",
      value: Math.fround(0.1),
    });
    expect(parseCreatureChallengeRating([])).toEqual({ present: false });
    expect(parseCreatureChallengeRating([
      { label: "ChallengeRating", type: "float", value: 1_000 },
    ])).toEqual({ present: true, nativeType: "float", value: 1_000 });
  });

  it("exposes exact presence-sensitive Creature NaturalAC Byte provenance", () => {
    expect(parseCreatureNaturalArmorClass([
      { label: "NaturalAC", type: "byte", value: 2 },
    ])).toEqual({ present: true, nativeType: "byte", value: 2 });
    expect(parseCreatureNaturalArmorClass([])).toEqual({ present: false });
    expect(parseCreatureNaturalArmorClass([
      { label: "NaturalAC", type: "byte", value: 0xff },
    ])).toEqual({ present: true, nativeType: "byte", value: 0xff });
  });

  it("exposes exact independently presence-sensitive Creature saving-throw Shorts", () => {
    expect(parseCreatureSavingThrowBonuses([
      { label: "fortbonus", type: "short", value: 3 },
      { label: "refbonus", type: "short", value: 1 },
      { label: "willbonus", type: "short", value: 2 },
    ])).toEqual({
      fortitude: { present: true, nativeType: "short", value: 3 },
      reflex: { present: true, nativeType: "short", value: 1 },
      will: { present: true, nativeType: "short", value: 2 },
    });
    expect(parseCreatureSavingThrowBonuses([
      { label: "fortbonus", type: "short", value: 250 },
    ])).toEqual({
      fortitude: { present: true, nativeType: "short", value: 250 },
      reflex: { present: false },
      will: { present: false },
    });
    expect(parseCreatureSavingThrowBonuses([])).toEqual({
      fortitude: { present: false },
      reflex: { present: false },
      will: { present: false },
    });
  });

  it("exposes exact coupled Creature alignment Byte provenance", () => {
    expect(parseCreatureAlignment([
      { label: "GoodEvil", type: "byte", value: 100 },
      { label: "LawfulChaotic", type: "byte", value: 0 },
    ])).toEqual({
      goodEvil: { present: true, nativeType: "byte", value: 100 },
      lawfulChaotic: { present: true, nativeType: "byte", value: 0 },
    });
    expect(parseCreatureAlignment([])).toEqual({
      goodEvil: { present: false },
      lawfulChaotic: { present: false },
    });
    expect(parseCreatureAlignment([
      { label: "GoodEvil", type: "byte", value: 50 },
    ])).toEqual({
      goodEvil: { present: true, nativeType: "byte", value: 50 },
      lawfulChaotic: { present: false },
    });
  });

  it("exposes exact independently presence-sensitive Creature base ability-score bytes", () => {
    expect(parseCreatureAbilityScores([
      { label: "Str", type: "byte", value: 15 },
      { label: "Dex", type: "byte", value: 13 },
      { label: "Con", type: "byte", value: 16 },
      { label: "Int", type: "byte", value: 10 },
      { label: "Wis", type: "byte", value: 12 },
      { label: "Cha", type: "byte", value: 8 },
    ])).toEqual({
      strength: { present: true, nativeType: "byte", value: 15 },
      dexterity: { present: true, nativeType: "byte", value: 13 },
      constitution: { present: true, nativeType: "byte", value: 16 },
      intelligence: { present: true, nativeType: "byte", value: 10 },
      wisdom: { present: true, nativeType: "byte", value: 12 },
      charisma: { present: true, nativeType: "byte", value: 8 },
    });
    expect(parseCreatureAbilityScores([
      { label: "Str", type: "byte", value: 0 },
      { label: "Cha", type: "byte", value: 255 },
    ])).toEqual({
      strength: { present: true, nativeType: "byte", value: 0 },
      dexterity: { present: false },
      constitution: { present: false },
      intelligence: { present: false },
      wisdom: { present: false },
      charisma: { present: true, nativeType: "byte", value: 255 },
    });
    expect(parseCreatureAbilityScores([])).toEqual({
      strength: { present: false },
      dexterity: { present: false },
      constitution: { present: false },
      intelligence: { present: false },
      wisdom: { present: false },
      charisma: { present: false },
    });
  });

  it("exposes exact independently presence-sensitive Creature appearance-color bytes", () => {
    expect(parseCreatureAppearanceColors([
      { label: "Color_Skin", type: "byte", value: 11 },
      { label: "Color_Hair", type: "byte", value: 22 },
      { label: "Color_Tattoo1", type: "byte", value: 33 },
      { label: "Color_Tattoo2", type: "byte", value: 44 },
    ])).toEqual({
      skin: { present: true, nativeType: "byte", value: 11 },
      hair: { present: true, nativeType: "byte", value: 22 },
      tattoo1: { present: true, nativeType: "byte", value: 33 },
      tattoo2: { present: true, nativeType: "byte", value: 44 },
    });
    expect(parseCreatureAppearanceColors([
      { label: "Color_Skin", type: "byte", value: 0 },
      { label: "Color_Tattoo2", type: "byte", value: 255 },
    ])).toEqual({
      skin: { present: true, nativeType: "byte", value: 0 },
      hair: { present: false },
      tattoo1: { present: false },
      tattoo2: { present: true, nativeType: "byte", value: 255 },
    });
  });

  it("exposes exact Creature body-part byte/word compatibility storage", () => {
    const absent = Object.fromEntries(
      AREA_CREATURE_BODY_PART_FIELDS.map(({ key }) => [key, { present: false }]),
    );
    expect(parseCreatureBodyParts([
      { label: "ArmorPart_RFoot", type: "byte", value: 12 },
      { label: "BodyPart_LFoot", type: "byte", value: 23 },
      { label: "xBodyPart_LFoot", type: "word", value: 23 },
      { label: "xBodyPart_RShin", type: "word", value: 4096 },
      { label: "Appearance_Head", type: "byte", value: 0 },
      { label: "xAppearance_Head", type: "word", value: 511 },
    ])).toEqual({
      ...absent,
      rightFoot: {
        present: true,
        value: 12,
        legacyByte: { present: true, nativeType: "byte", value: 12 },
        wideWord: { present: false },
      },
      leftFoot: {
        present: true,
        value: 23,
        legacyByte: { present: true, nativeType: "byte", value: 23 },
        wideWord: { present: true, nativeType: "word", value: 23 },
      },
      rightShin: {
        present: true,
        value: 4096,
        legacyByte: { present: false },
        wideWord: { present: true, nativeType: "word", value: 4096 },
      },
      head: {
        present: true,
        value: 511,
        legacyByte: { present: true, nativeType: "byte", value: 0 },
        wideWord: { present: true, nativeType: "word", value: 511 },
      },
    });
    expect(parseCreatureBodyParts([])).toEqual(absent);
  });

  it("exposes modern Creature appendage DWords with precedence over retained legacy Bytes", () => {
    expect(parseCreatureAppendages([
      { label: "Wings_New", type: "dword", value: 7 },
      { label: "Wings", type: "byte", value: 2 },
      { label: "Tail_New", type: "dword", value: 5 },
    ])).toEqual({
      wings: {
        present: true,
        value: 7,
        modernDword: { present: true, nativeType: "dword", value: 7 },
        legacyByte: { present: true, nativeType: "byte", value: 2 },
      },
      tail: {
        present: true,
        value: 5,
        modernDword: { present: true, nativeType: "dword", value: 5 },
        legacyByte: { present: false },
      },
    });
    expect(parseCreatureAppendages([
      { label: "Tail", type: "byte", value: 3 },
    ])).toEqual({
      wings: { present: false },
      tail: {
        present: true,
        value: 3,
        modernDword: { present: false },
        legacyByte: { present: true, nativeType: "byte", value: 3 },
      },
    });
  });

  it("exposes the exact coupled Creature HP triplet and native dependencies", () => {
    expect(parseCreatureHitPointState([
      { label: "HitPoints", type: "short", value: 10 },
      { label: "CurrentHitPoints", type: "short", value: 7 },
      { label: "MaxHitPoints", type: "short", value: 99 },
      { label: "Con", type: "byte", value: 14 },
      { label: "Race", type: "byte", value: 1 },
      { label: "ClassList", type: "list", value: [2, 3] },
      { label: "FeatList", type: "list", value: [4, 5] },
    ], [
      { fields: [{ label: "ClassLevel", type: "short", value: 3 }] },
      { fields: [{ label: "ClassLevel", type: "short", value: 2 }] },
      { fields: [{ label: "Feat", type: "word", value: 7 }] },
      { fields: [{ label: "Feat", type: "word", value: 40 }] },
    ])).toEqual({
      present: true,
      hitPoints: { nativeType: "short", value: 10 },
      currentHitPoints: { nativeType: "short", value: 7 },
      maxHitPoints: { nativeType: "short", value: 99 },
      constitution: { nativeType: "byte", value: 14 },
      race: { nativeType: "byte", value: 1 },
      classLevels: [3, 2],
      featRow40Present: true,
    });
    expect(parseCreatureHitPointState([])).toEqual({ present: false });
  });

  it.each([
    [{ label: "CurrentHitPoints", type: "word", value: 7 } as SupportedField],
    [{ label: "currentHitPoints", type: "short", value: 7 } as SupportedField],
    [{ label: "Con", type: "word", value: 14 } as SupportedField],
  ])("fails closed when one coupled Creature HP field is malformed %#", (replacement) => {
    const fields: SupportedField[] = [
      { label: "HitPoints", type: "short", value: 10 },
      replacement,
      { label: "MaxHitPoints", type: "short", value: 20 },
      { label: "Con", type: "byte", value: 14 },
      { label: "Race", type: "byte", value: 1 },
    ];
    expect(parseCreatureHitPointState(fields)).toBeUndefined();
  });

  it("preserves exact presence-sensitive Creature FirstName, LastName, and Description storage", () => {
    expect(parseCreatureNameLocalizedStrings([
      {
        label: "FirstName",
        type: "cexolocstring",
        value: {
          strRef: 12_416,
          entries: [],
        },
      },
      {
        label: "LastName",
        type: "cexolocstring",
        value: {
          strRef: 0xffff_ffff,
          entries: [
            { languageId: 0, textBytes: Buffer.from(" Guard ", "ascii") },
            { languageId: 0, textBytes: Buffer.alloc(0) },
          ],
        },
      },
      {
        label: "Description",
        type: "cexolocstring",
        value: {
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytes: Buffer.from("Old description", "ascii") }],
        },
      },
    ])).toEqual({
      firstName: { present: true, strRef: 12_416, entries: [] },
      lastName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 0, textBytesBase64: "IEd1YXJkIA==" },
          { languageId: 0, textBytesBase64: "" },
        ],
      },
      description: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "T2xkIGRlc2NyaXB0aW9u" }],
      },
    });
    expect(parseCreatureNameLocalizedStrings([])).toEqual({
      firstName: { present: false },
      lastName: { present: false },
      description: { present: false },
    });
  });

  it.each([
    ["wrong FirstName case", [{
      label: "firstname",
      type: "cexolocstring",
      value: { strRef: 0xffff_ffff, entries: [] },
    }]],
    ["wrong LastName type", [{ label: "LastName", type: "cexostring", value: "Guard" }]],
    ["wrong Description case", [{
      label: "description", type: "cexolocstring", value: { strRef: 0xffff_ffff, entries: [] },
    }]],
    ["duplicate FirstName", [
      { label: "FirstName", type: "cexolocstring", value: { strRef: 0xffff_ffff, entries: [] } },
      { label: "FirstName", type: "cexolocstring", value: { strRef: 7, entries: [] } },
    ]],
    ["over-budget FirstName entry", [{
      label: "FirstName",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytes: Buffer.alloc(16_385) }],
      },
    }]],
  ] as const)("suppresses the complete Creature name provenance pair for %s", (_label, fields) => {
    expect(parseCreatureNameLocalizedStrings(fields as readonly SupportedField[])).toBeUndefined();
  });

  it("preserves the exact presence-sensitive ground-Item localized-string triple", () => {
    expect(parseItemLocalizedStrings([
      {
        label: "LocalizedName",
        type: "cexolocstring",
        value: {
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytes: Buffer.from(" Sword ", "ascii") }],
        },
      },
      { label: "Description", type: "cexolocstring", value: { strRef: 7, entries: [] } },
      {
        label: "DescIdentified",
        type: "cexolocstring",
        value: {
          strRef: 0xffff_ffff,
          entries: [
            { languageId: 2, textBytes: Buffer.from("Known", "ascii") },
            { languageId: 0, textBytes: Buffer.alloc(0) },
          ],
        },
      },
    ])).toEqual({
      localizedName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "IFN3b3JkIA==" }],
      },
      description: { present: true, strRef: 7, entries: [] },
      identifiedDescription: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 2, textBytesBase64: "S25vd24=" },
          { languageId: 0, textBytesBase64: "" },
        ],
      },
    });
    expect(parseItemLocalizedStrings([])).toEqual({
      localizedName: { present: false },
      description: { present: false },
      identifiedDescription: { present: false },
    });
  });

  it.each([
    ["wrong LocalizedName case", [{
      label: "localizedName",
      type: "cexolocstring",
      value: { strRef: 0xffff_ffff, entries: [] },
    }]],
    ["wrong Description type", [{ label: "Description", type: "cexostring", value: "Unknown" }]],
    ["duplicate DescIdentified", [
      { label: "DescIdentified", type: "cexolocstring", value: { strRef: 0xffff_ffff, entries: [] } },
      { label: "DescIdentified", type: "cexolocstring", value: { strRef: 7, entries: [] } },
    ]],
    ["over-budget Description entry", [{
      label: "Description",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytes: Buffer.alloc(16_385) }],
      },
    }]],
  ] as const)("suppresses the complete Item localized-string provenance triple for %s", (
    _label,
    fields,
  ) => {
    expect(parseItemLocalizedStrings(fields as readonly SupportedField[])).toBeUndefined();
  });

  it("preserves the exact ordered ground-Item VarTable with all native value types", () => {
    expect(parseItemVariables([{
      label: "VarTable",
      type: "list",
      value: [
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Counter" },
          { label: "Type", type: "dword", value: 1 },
          { label: "Value", type: "int", value: -2 },
        ] },
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Scale" },
          { label: "Type", type: "dword", value: 2 },
          { label: "Value", type: "float", value: Math.fround(1.5) },
        ] },
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "" },
          { label: "Type", type: "dword", value: 3 },
          { label: "Value", type: "cexostring", value: "" },
        ] },
      ],
    }])).toEqual({ expectedEntries: [
      { sourceIndex: 0, name: "Counter", type: "int", value: -2 },
      { sourceIndex: 1, name: "Scale", type: "float", value: Math.fround(1.5) },
      { sourceIndex: 2, name: "", type: "string", value: "" },
    ] });
    expect(parseItemVariables([])).toEqual({ expectedEntries: [] });
  });

  it.each([
    ["wrong field case", [{ label: "vartable", type: "list" as const, value: [] }]],
    ["wrong root type", [{ label: "VarTable", type: "byte" as const, value: 0 }]],
    ["duplicate root", [
      { label: "VarTable", type: "list" as const, value: [] },
      { label: "VarTable", type: "list" as const, value: [] },
    ]],
    ["unsupported value type", [{
      label: "VarTable", type: "list" as const, value: [{ typeId: 0, fields: [
        { label: "Name", type: "cexostring" as const, value: "x" },
        { label: "Type", type: "dword" as const, value: 4 },
        { label: "Value", type: "dword" as const, value: 1 },
      ] }],
    }]],
  ] as const)("suppresses complete Item VarTable provenance for %s", (_label, fields) => {
    expect(parseItemVariables(fields as readonly SupportedField[])).toBeUndefined();
  });

  it("preserves exact native ground-Item BaseItem and ordered ModelType 2 appearance storage", () => {
    expect(parseItemBaseAppearanceRaw([
      { label: "BaseItem", type: "int", value: 49 },
      { label: "ModelPart1", type: "word", value: 11 },
      { label: "ModelPart2", type: "word", value: 13 },
      { label: "ModelPart3", type: "word", value: 63 },
    ])).toEqual({
      baseItem: 49,
      appearanceFields: { modelPart1: 11, modelPart2: 13, modelPart3: 63 },
      appearanceFieldOrder: ["modelPart1", "modelPart2", "modelPart3"],
    });
  });

  it.each([
    ["BaseItem DWord", [
      { label: "BaseItem", type: "dword" as const, value: 49 },
      { label: "ModelPart1", type: "word" as const, value: 11 },
    ]],
    ["appearance Byte", [
      { label: "BaseItem", type: "int" as const, value: 49 },
      { label: "ModelPart1", type: "byte" as const, value: 11 },
    ]],
    ["duplicate appearance", [
      { label: "BaseItem", type: "int" as const, value: 49 },
      { label: "ModelPart1", type: "word" as const, value: 11 },
      { label: "ModelPart1", type: "word" as const, value: 12 },
    ]],
  ] as const)("suppresses BaseItem/appearance provenance for %s", (_label, fields) => {
    expect(parseItemBaseAppearanceRaw(fields)).toBeUndefined();
  });

  it("preserves the exact canonical ground-Item PropertiesList", () => {
    const properties = [{
      typeId: 0,
      fields: [
        { label: "PropertyName", type: "word" as const, value: 1 },
        { label: "Subtype", type: "word" as const, value: 0xffff },
        { label: "CostTable", type: "byte" as const, value: 2 },
        { label: "CostValue", type: "word" as const, value: 3 },
        { label: "Param1", type: "byte" as const, value: 0xff },
        { label: "Param1Value", type: "byte" as const, value: 0 },
        { label: "ChanceAppear", type: "byte" as const, value: 100 },
      ],
    }, {
      typeId: 0,
      fields: [
        { label: "PropertyName", type: "word" as const, value: 48 },
        { label: "Subtype", type: "word" as const, value: 7 },
        { label: "CostTable", type: "byte" as const, value: 24 },
        { label: "CostValue", type: "word" as const, value: 8 },
        { label: "Param1", type: "byte" as const, value: 9 },
        { label: "Param1Value", type: "byte" as const, value: 10 },
        { label: "ChanceAppear", type: "byte" as const, value: 255 },
      ],
    }];

    expect(parseItemPropertyList([{
      label: "PropertiesList",
      type: "list",
      value: properties,
    }])).toEqual({
      present: true,
      expectedEntries: [
        { sourceIndex: 0, propertyName: 1, subtype: 0xffff, costTable: 2,
          costValue: 3, param1: 0xff, param1Value: 0, chanceAppear: 100 },
        { sourceIndex: 1, propertyName: 48, subtype: 7, costTable: 24,
          costValue: 8, param1: 9, param1Value: 10, chanceAppear: 255 },
      ],
    });
    expect(parseItemPropertyList([])).toEqual({ present: false, expectedEntries: [] });
    expect(parseItemPropertyList([{
      label: "PropertiesList",
      type: "list",
      value: [],
    }])).toEqual({ present: true, expectedEntries: [] });
  });

  it.each([
    ["wrong root case", [{ label: "propertiesList", type: "list" as const, value: [] }]],
    ["wrong root type", [{ label: "PropertiesList", type: "byte" as const, value: 0 }]],
    ["duplicate root", [
      { label: "PropertiesList", type: "list" as const, value: [] },
      { label: "PropertiesList", type: "list" as const, value: [] },
    ]],
    ["wrong entry type", [{ label: "PropertiesList", type: "list" as const, value: [{
      typeId: 1,
      fields: canonicalItemPropertyFields(),
    }] }]],
    ["missing field", [{ label: "PropertiesList", type: "list" as const, value: [{
      typeId: 0,
      fields: canonicalItemPropertyFields().slice(0, 6),
    }] }]],
    ["extra field", [{ label: "PropertiesList", type: "list" as const, value: [{
      typeId: 0,
      fields: [...canonicalItemPropertyFields(), { label: "Opaque", type: "byte" as const, value: 1 }],
    }] }]],
    ["reordered field", [{ label: "PropertiesList", type: "list" as const, value: [{
      typeId: 0,
      fields: [canonicalItemPropertyFields()[1]!, canonicalItemPropertyFields()[0]!,
        ...canonicalItemPropertyFields().slice(2)],
    }] }]],
    ["wrong field type", [{ label: "PropertiesList", type: "list" as const, value: [{
      typeId: 0,
      fields: canonicalItemPropertyFields().map((field) => field.label === "CostValue"
        ? { ...field, type: "dword" as const }
        : field),
    }] }]],
    ["noncanonical property 48", [{ label: "PropertiesList", type: "list" as const, value: [{
      typeId: 0,
      fields: canonicalItemPropertyFields({ propertyName: 48, costTable: 23 }),
    }] }]],
  ] as const)("suppresses complete Item PropertiesList provenance for %s", (_label, fields) => {
    expect(parseItemPropertyList(fields as readonly SupportedField[])).toBeUndefined();
  });

  it.each([
    ["wrong case", [{ label: "tag", type: "cexostring", value: "NW_GUARD" }]],
    ["wrong type", [{ label: "Tag", type: "resref", value: "nw_guard" }]],
    ["duplicate", [
      { label: "Tag", type: "cexostring", value: "NW_GUARD" },
      { label: "Tag", type: "cexostring", value: "NW_GUARD_2" },
    ]],
    ["over 32 code units", [{ label: "Tag", type: "cexostring", value: "x".repeat(33) }]],
    ["embedded NUL", [{ label: "Tag", type: "cexostring", value: "NW\0GUARD" }]],
  ] as const)("suppresses exact Creature Tag provenance for %s", (_label, tagFields) => {
    expect(parseCreatureTag(tagFields)).toBeUndefined();
  });

  it.each([
    ["wrong case", [{ label: "conversation", type: "resref", value: "guard_dialog" }]],
    ["wrong type", [{ label: "Conversation", type: "cexostring", value: "guard_dialog" }]],
    ["duplicate", [
      { label: "Conversation", type: "resref", value: "guard_dialog" },
      { label: "Conversation", type: "resref", value: "second_dialog" },
    ]],
    ["invalid byte", [{ label: "Conversation", type: "resref", value: "bad-dialog" }]],
    ["over 16 bytes", [{ label: "Conversation", type: "resref", value: "a2345678901234567" }]],
  ] as const)("suppresses exact Creature Conversation provenance for %s", (_label, fields) => {
    expect(parseCreatureConversation(fields as readonly SupportedField[])).toBeUndefined();
  });

  it.each([
    ["wrong case", [{ label: "interruptable", type: "byte", value: 1 }]],
    ["wrong type", [{ label: "Interruptable", type: "word", value: 1 }]],
    ["duplicate", [
      { label: "Interruptable", type: "byte", value: 1 },
      { label: "Interruptable", type: "byte", value: 0 },
    ]],
    ["invalid Byte value", [{ label: "Interruptable", type: "byte", value: 2 }]],
  ] as const)("suppresses exact Creature Interruptable provenance for %s", (_label, fields) => {
    expect(parseCreatureInterruptable(fields as readonly SupportedField[])).toBeUndefined();
  });

  it.each([
    ["wrong case", [{ label: "plot", type: "byte", value: 1 }]],
    ["wrong type", [{ label: "Lootable", type: "word", value: 1 }]],
    ["duplicate", [
      { label: "Disarmable", type: "byte", value: 1 },
      { label: "Disarmable", type: "byte", value: 0 },
    ]],
    ["invalid Byte value", [{ label: "NoPermDeath", type: "byte", value: 2 }]],
  ] as const)("suppresses the complete Creature advanced flag group for %s", (_label, fields) => {
    expect(parseCreatureAdvancedFlags(fields as readonly SupportedField[])).toBeUndefined();
  });

  it.each([
    ["wrong BodyBag case", [{ label: "bodybag", type: "byte", value: 1 }], "creatureBodyBag"],
    ["wrong BodyBag type", [{ label: "BodyBag", type: "word", value: 1 }], "creatureBodyBag"],
    ["duplicate BodyBag", [
      { label: "BodyBag", type: "byte", value: 1 },
      { label: "BodyBag", type: "byte", value: 2 },
    ], "creatureBodyBag"],
    ["wrong DecayTime case", [{ label: "decaytime", type: "dword", value: 5000 }], "creatureDecayTime"],
    ["wrong DecayTime type", [{ label: "DecayTime", type: "int", value: 5000 }], "creatureDecayTime"],
    ["duplicate DecayTime", [
      { label: "DecayTime", type: "dword", value: 5000 },
      { label: "DecayTime", type: "dword", value: 6000 },
    ], "creatureDecayTime"],
  ] as const)("suppresses exact Creature death-remains provenance for %s", (
    _label,
    fields,
    property,
  ) => {
    expect(parseCreatureDeathRemains(fields as readonly SupportedField[])[property]).toBeUndefined();
  });

  it.each([
    ["wrong case", [{ label: "appearance_type", type: "word", value: 249 }]],
    ["wrong type", [{ label: "Appearance_Type", type: "dword", value: 249 }]],
    ["duplicate", [
      { label: "Appearance_Type", type: "word", value: 249 },
      { label: "Appearance_Type", type: "word", value: 52 },
    ]],
  ] as const)("suppresses exact Creature Appearance provenance for %s", (_label, fields) => {
    expect(parseCreatureAppearance(fields as readonly SupportedField[])).toBeUndefined();
  });

  it.each([
    ["wrong case", [{ label: "gender", type: "byte", value: 4 }]],
    ["wrong type", [{ label: "Gender", type: "word", value: 4 }]],
    ["duplicate", [
      { label: "Gender", type: "byte", value: 4 },
      { label: "Gender", type: "byte", value: 0 },
    ]],
  ] as const)("suppresses exact Creature Gender provenance for %s", (_label, fields) => {
    expect(parseCreatureGender(fields as readonly SupportedField[])).toBeUndefined();
  });

  it.each([
    ["wrong case", [{ label: "perceptionrange", type: "byte", value: 11 }]],
    ["wrong type", [{ label: "PerceptionRange", type: "word", value: 11 }]],
    ["duplicate", [
      { label: "PerceptionRange", type: "byte", value: 11 },
      { label: "PerceptionRange", type: "byte", value: 9 },
    ]],
  ] as const)("suppresses exact Creature PerceptionRange provenance for %s", (_label, fields) => {
    expect(parseCreaturePerceptionRange(fields as readonly SupportedField[])).toBeUndefined();
  });

  it.each([
    ["wrong case", [{ label: "walkrate", type: "int", value: 4 }]],
    ["wrong type", [{ label: "WalkRate", type: "byte", value: 4 }]],
    ["duplicate", [
      { label: "WalkRate", type: "int", value: 4 },
      { label: "WalkRate", type: "int", value: 2 },
    ]],
  ] as const)("suppresses exact Creature WalkRate provenance for %s", (_label, fields) => {
    expect(parseCreatureWalkRate(fields as readonly SupportedField[])).toBeUndefined();
  });

  it.each([
    ["wrong case", [{ label: "SoundsetFile", type: "word", value: 0 }]],
    ["wrong type", [{ label: "SoundSetFile", type: "dword", value: 0 }]],
    ["duplicate", [
      { label: "SoundSetFile", type: "word", value: 0 },
      { label: "SoundSetFile", type: "word", value: 2 },
    ]],
  ] as const)("suppresses exact Creature SoundSetFile provenance for %s", (_label, fields) => {
    expect(parseCreatureSoundSetFile(fields as readonly SupportedField[])).toBeUndefined();
  });

  it.each([
    ["wrong case", [{ label: "Startingpackage", type: "byte", value: 0 }]],
    ["wrong type", [{ label: "StartingPackage", type: "word", value: 0 }]],
    ["duplicate", [
      { label: "StartingPackage", type: "byte", value: 0 },
      { label: "StartingPackage", type: "byte", value: 2 },
    ]],
  ] as const)("suppresses exact Creature StartingPackage provenance for %s", (_label, fields) => {
    expect(parseCreatureStartingPackage(fields as readonly SupportedField[])).toBeUndefined();
  });

  it.each([
    ["wrong case", [{ label: "PortraitID", type: "word", value: 462 }]],
    ["wrong type", [{ label: "PortraitId", type: "dword", value: 462 }]],
    ["duplicate", [
      { label: "PortraitId", type: "word", value: 462 },
      { label: "PortraitId", type: "word", value: 463 },
    ]],
  ] as const)("suppresses exact Creature PortraitId provenance for %s", (_label, fields) => {
    expect(parseCreaturePortrait(fields as readonly SupportedField[])).toBeUndefined();
  });

  it.each([
    ["wrong case", [{ label: "challengerating", type: "float", value: 1 }]],
    ["wrong type", [{ label: "ChallengeRating", type: "dword", value: 1 }]],
    ["duplicate", [
      { label: "ChallengeRating", type: "float", value: 1 },
      { label: "ChallengeRating", type: "float", value: 2 },
    ]],
    ["negative value", [{ label: "ChallengeRating", type: "float", value: -1 }]],
    ["negative zero", [{ label: "ChallengeRating", type: "float", value: -0 }]],
    ["over-budget value", [{ label: "ChallengeRating", type: "float", value: 1_001 }]],
    ["non-finite value", [{ label: "ChallengeRating", type: "float", value: Number.POSITIVE_INFINITY }]],
  ] as const)("suppresses exact Creature ChallengeRating provenance for %s", (_label, fields) => {
    expect(parseCreatureChallengeRating(fields as readonly SupportedField[])).toBeUndefined();
  });

  it.each([
    ["wrong case", [{ label: "NaturalAc", type: "byte", value: 2 }]],
    ["wrong type", [{ label: "NaturalAC", type: "word", value: 2 }]],
    ["duplicate", [
      { label: "NaturalAC", type: "byte", value: 1 },
      { label: "NaturalAC", type: "byte", value: 2 },
    ]],
  ] as const)("suppresses exact Creature NaturalAC provenance for %s", (_label, fields) => {
    expect(parseCreatureNaturalArmorClass(fields as readonly SupportedField[])).toBeUndefined();
  });

  it.each([
    ["wrong case", [{ label: "FortBonus", type: "short", value: 3 }]],
    ["wrong type", [{ label: "fortbonus", type: "word", value: 3 }]],
    ["duplicate", [
      { label: "fortbonus", type: "short", value: 3 },
      { label: "fortbonus", type: "short", value: 4 },
    ]],
    ["negative", [{ label: "refbonus", type: "short", value: -1 }]],
    ["over edit bound", [{ label: "willbonus", type: "short", value: 251 }]],
  ] as const)("suppresses exact Creature saving-throw provenance for %s", (_label, fields) => {
    expect(parseCreatureSavingThrowBonuses(fields as readonly SupportedField[])).toBeUndefined();
  });

  it.each([
    ["wrong case", [{ label: "Goodevil", type: "byte", value: 50 }]],
    ["wrong type", [{ label: "GoodEvil", type: "word", value: 50 }]],
    ["duplicate", [
      { label: "LawfulChaotic", type: "byte", value: 50 },
      { label: "LawfulChaotic", type: "byte", value: 100 },
    ]],
    ["non-canonical intermediate value", [{ label: "GoodEvil", type: "byte", value: 49 }]],
  ] as const)("suppresses exact Creature alignment provenance for %s", (_label, fields) => {
    expect(parseCreatureAlignment(fields as readonly SupportedField[])).toBeUndefined();
  });

  it.each([
    ["wrong case", [{ label: "str", type: "byte", value: 15 }]],
    ["wrong type", [{ label: "Str", type: "word", value: 15 }]],
    ["duplicate", [
      { label: "Str", type: "byte", value: 15 },
      { label: "Str", type: "byte", value: 17 },
    ]],
  ] as const)("suppresses exact Creature ability-score provenance for %s", (_label, fields) => {
    expect(parseCreatureAbilityScores(fields as readonly SupportedField[])).toBeUndefined();
  });

  it.each([
    ["wrong case", [{ label: "Color_skin", type: "byte", value: 15 }]],
    ["wrong type", [{ label: "Color_Skin", type: "word", value: 15 }]],
    ["duplicate", [
      { label: "Color_Hair", type: "byte", value: 15 },
      { label: "Color_Hair", type: "byte", value: 17 },
    ]],
  ] as const)("suppresses exact Creature appearance-color provenance for %s", (_label, fields) => {
    expect(parseCreatureAppearanceColors(fields as readonly SupportedField[])).toBeUndefined();
  });

  it.each([
    ["wrong legacy case", [{ label: "BodyPart_lfoot", type: "byte", value: 15 }]],
    ["wrong legacy type", [{ label: "BodyPart_LFoot", type: "word", value: 15 }]],
    ["wrong wide type", [{ label: "xBodyPart_LFoot", type: "byte", value: 15 }]],
    ["duplicate wide field", [
      { label: "xBodyPart_LFoot", type: "word", value: 15 },
      { label: "xBodyPart_LFoot", type: "word", value: 17 },
    ]],
    ["noncanonical compatibility pair", [
      { label: "BodyPart_LFoot", type: "byte", value: 15 },
      { label: "xBodyPart_LFoot", type: "word", value: 17 },
    ]],
  ] as const)("suppresses exact Creature body-part provenance for %s", (_label, fields) => {
    expect(parseCreatureBodyParts(fields as readonly SupportedField[])).toBeUndefined();
  });

  it.each([
    ["wrong modern case", [{ label: "wings_New", type: "dword", value: 7 }]],
    ["wrong modern type", [{ label: "Wings_New", type: "byte", value: 7 }]],
    ["wrong legacy case", [{ label: "tail", type: "byte", value: 3 }]],
    ["wrong legacy type", [{ label: "Tail", type: "dword", value: 3 }]],
    ["duplicate modern field", [
      { label: "Wings_New", type: "dword", value: 7 },
      { label: "Wings_New", type: "dword", value: 8 },
    ]],
  ] as const)("suppresses exact Creature appendage provenance for %s", (_label, fields) => {
    expect(parseCreatureAppendages(fields as readonly SupportedField[])).toBeUndefined();
  });

  it.each([
    ["aliased list label", "EquipItemList", [{
      typeId: 0x10,
      fields: [{ label: "TemplateResRef", type: "resref", value: "nw_wswmls001" }],
    }]],
    ["unsupported slot mask", "Equip_ItemList", [{
      typeId: 0x3,
      fields: [{ label: "TemplateResRef", type: "resref", value: "nw_wswmls001" }],
    }]],
    ["duplicate slot mask", "Equip_ItemList", [{
      typeId: 0x10,
      fields: [{ label: "TemplateResRef", type: "resref", value: "nw_wswmls001" }],
    }, {
      typeId: 0x10,
      fields: [{ label: "TemplateResRef", type: "resref", value: "nw_dagger001" }],
    }]],
    ["EquippedRes fallback", "Equip_ItemList", [{
      typeId: 0x10,
      fields: [{ label: "EquippedRes", type: "resref", value: "nw_wswmls001" }],
    }]],
    ["Infinite flag", "Equip_ItemList", [{
      typeId: 0x10,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_wswmls001" },
        { label: "Infinite", type: "byte", value: 1 },
      ],
    }]],
    ["explicit false flag", "Equip_ItemList", [{
      typeId: 0x10,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_wswmls001" },
        { label: "Dropable", type: "byte", value: 0 },
      ],
    }]],
  ])("suppresses mutation provenance for %s", (_label, listLabel, equipment) => {
    const metadata = parseCreatureEquipmentMetadata(listLabel, equipment);

    expect(metadata?.equipItemListCount).toBe(equipment.length);
    expect(metadata?.equipItemListMutationEntries).toBeUndefined();
  });

  it("exposes exact retained ground-Item ItemList provenance in physical order", () => {
    expect(parseItemInventoryItems("ItemList", [
      {
        typeId: 0,
        fields: [
          { label: "TemplateResRef", type: "resref", value: "nested_a" },
          { label: "Cost", type: "dword", value: 123 },
          { label: "Repos_PosX", type: "word", value: 1 },
          { label: "Repos_Posy", type: "word", value: 2 },
        ],
      },
      {
        typeId: 1,
        fields: [
          { label: "TemplateResRef", type: "resref", value: "nested_b" },
          { label: "Repos_PosX", type: "word", value: 3 },
          { label: "Repos_Posy", type: "word", value: 4 },
        ],
      },
    ])).toEqual([
      { sourceIndex: 0, resRef: "nested_a", x: 1, y: 2 },
      { sourceIndex: 1, resRef: "nested_b", x: 3, y: 4 },
    ]);
  });

  it("exposes exact absence as an editable empty ground-Item ItemList", () => {
    expect(parseItemInventoryItems(undefined, [])).toEqual([]);
  });

  it.each([
    ["wrong list case", "Itemlist", [{
      typeId: 0,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nested_a" },
        { label: "Repos_PosX", type: "word", value: 1 },
        { label: "Repos_Posy", type: "word", value: 2 },
      ],
    }]],
    ["wrong child type", "ItemList", [{
      typeId: 1,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nested_a" },
        { label: "Repos_PosX", type: "word", value: 1 },
        { label: "Repos_Posy", type: "word", value: 2 },
      ],
    }]],
    ["ResRef alias", "ItemList", [{
      typeId: 0,
      fields: [
        { label: "InventoryRes", type: "resref", value: "nested_a" },
        { label: "Repos_PosX", type: "word", value: 1 },
        { label: "Repos_Posy", type: "word", value: 2 },
      ],
    }]],
    ["coordinate alias", "ItemList", [{
      typeId: 0,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nested_a" },
        { label: "ReposPosX", type: "word", value: 1 },
        { label: "Repos_Posy", type: "word", value: 2 },
      ],
    }]],
    ["wrong coordinate type", "ItemList", [{
      typeId: 0,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nested_a" },
        { label: "Repos_PosX", type: "dword", value: 1 },
        { label: "Repos_Posy", type: "word", value: 2 },
      ],
    }]],
    ["mode-0 flag", "ItemList", [{
      typeId: 0,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nested_a" },
        { label: "Repos_PosX", type: "word", value: 1 },
        { label: "Repos_Posy", type: "word", value: 2 },
        { label: "Dropable", type: "byte", value: 1 },
      ],
    }]],
    ["mode-3 flag", "ItemList", [{
      typeId: 0,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nested_a" },
        { label: "Repos_PosX", type: "word", value: 1 },
        { label: "Repos_Posy", type: "word", value: 2 },
        { label: "Infinite", type: "byte", value: 1 },
      ],
    }]],
  ])("suppresses retained ground-Item ItemList provenance for %s", (
    _label,
    listLabel,
    entries,
  ) => {
    expect(parseItemInventoryItems(listLabel, entries as readonly StructDef[]))
      .toBeUndefined();
  });

  it("exposes exact canonical static ground-Item VisTransformList provenance", () => {
    expect(parseItemVisualTransform()).toEqual({
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
    });
  });

  it("exposes physical absence as exact default visual-transform provenance", () => {
    expect(parseItemVisualTransform({ absent: true })).toEqual({ present: false });
  });

  it.each([
    ["wrong list case", { listLabel: "VisTransformlist" }],
    ["legacy field collision", { addLegacyField: true }],
    ["multiple scope entries", { listIndices: [2, 2] }],
    ["wrong transform struct type", { transformTypeId: 0 }],
    ["non-base scope", { scope: 7 }],
    ["missing controller", { omitController: "RotateY" }],
    ["extra outer field", { addOuterField: true }],
    ["animated timer", { timerType: 1 }],
    ["animated lerp", { lerpType: 1 }],
    ["physically present default vector", { defaultVector: true }],
  ])("suppresses static ground-Item visual-transform provenance for %s", (
    _label,
    options,
  ) => {
    expect(parseItemVisualTransform(options)).toBeUndefined();
  });
});

interface ItemVisualTransformFixtureOptions {
  absent?: boolean;
  listLabel?: string;
  addLegacyField?: boolean;
  listIndices?: number[];
  transformTypeId?: number;
  scope?: number;
  omitController?: string;
  addOuterField?: boolean;
  timerType?: number;
  lerpType?: number;
  defaultVector?: boolean;
}

function parseItemVisualTransform(options: ItemVisualTransformFixtureOptions = {}) {
  const values = options.defaultVector
    ? [1, 1, 1, 1, 0, 0, 0, 0, 0, 0]
    : [1, 0.5, 0.75, 1.25, -15, 30, 90, 20, -30, 40];
  const labels = [
    "AnimationSpeed",
    "ScaleX",
    "ScaleY",
    "ScaleZ",
    "RotateX",
    "RotateY",
    "RotateZ",
    "TranslateX",
    "TranslateY",
    "TranslateZ",
  ];
  const itemFields: SupportedField[] = [
    { label: "TemplateResRef", type: "resref", value: "nw_bag001" },
    ...(!options.absent
      ? [{
          label: options.listLabel ?? "VisTransformList",
          type: "list" as const,
          value: options.listIndices ?? [2],
        }]
      : []),
    ...(options.addLegacyField
      ? [{ label: "VisualTransform", type: "struct" as const, value: 2 }]
      : []),
    { label: "XPosition", type: "float", value: 1 },
    { label: "YPosition", type: "float", value: 2 },
  ];
  const transformFields: SupportedField[] = [
    { label: "Scope", type: "int", value: options.scope ?? 0 },
    ...labels.flatMap((label, index): SupportedField[] =>
      label === options.omitController
        ? []
        : [{ label, type: "struct", value: index + 3 }]
    ),
    ...(options.addOuterField
      ? [{ label: "Unexpected", type: "int" as const, value: 1 }]
      : []),
  ];
  const controllers: StructDef[] = values.map((value) => ({
    typeId: 0,
    fields: [
      { label: "TimerType", type: "int", value: options.timerType ?? 0 },
      { label: "ValueTo", type: "float", value },
      { label: "LerpType", type: "int", value: options.lerpType ?? 0 },
    ],
  }));
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "List", type: "list", value: [1] }] },
    { typeId: 0, fields: itemFields },
    { typeId: options.transformTypeId ?? 6, fields: transformFields },
    ...controllers,
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.items[0]?.itemVisualTransform;
}

function parseItemInventoryItems(
  listLabel: string | undefined,
  entries: readonly StructDef[],
) {
  const itemFields: SupportedField[] = [
    { label: "TemplateResRef", type: "resref", value: "nw_bag001" },
    ...(listLabel === undefined
      ? []
      : [{
          label: listLabel,
          type: "list" as const,
          value: entries.map((_entry, index) => index + 2),
        }]),
    { label: "XPosition", type: "float", value: 1 },
    { label: "YPosition", type: "float", value: 2 },
  ];
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "List", type: "list", value: [1] }] },
    { typeId: 0, fields: itemFields },
    ...entries,
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.items[0]?.itemInventoryItems;
}

function parseCreatureEquipmentMetadata(
  listLabel: string,
  equipment: readonly StructDef[],
): Record<string, string | number | boolean> | undefined {
  const equipmentIndices = equipment.map((_entry, index) => index + 2);
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        { label: "Tag", type: "cexostring", value: "NW_CHICKEN" },
        { label: listLabel, type: "list", value: equipmentIndices },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
    ...equipment,
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureMetadata;
}

function parseCreatureTag(
  tagFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...tagFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureTag;
}

function parseCreatureConversation(
  conversationFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...conversationFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureConversation;
}

function parseCreatureInterruptable(
  interruptableFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...interruptableFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureInterruptable;
}

function parseCreatureAdvancedFlags(
  advancedFlagFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...advancedFlagFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureAdvancedFlags;
}

function parseCreatureDeathRemains(
  deathRemainsFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...deathRemainsFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  const creature = parseAreaObjectsFromGitGff(bytes)?.creatures[0];
  return {
    creatureBodyBag: creature?.creatureBodyBag,
    creatureDecayTime: creature?.creatureDecayTime,
  };
}

function parseCreatureFaction(
  factionFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...factionFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureFaction;
}

function parseCreatureTemplateResRef(
  templateResRefFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        ...templateResRefFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureTemplateResRef;
}

function parseCreatureSpecialIdentityStrings(
  specialIdentityStringFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...specialIdentityStringFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]
    ?.creatureSpecialIdentityStrings;
}

function parseCreatureScriptResRefs(scriptFields: readonly SupportedField[]) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_dwarfmerc001" },
        ...scriptFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureScriptResRefs;
}

function parseCreatureAppearance(
  appearanceFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...appearanceFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureAppearance;
}

function parseCreatureGender(
  genderFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...genderFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureGender;
}

function parseCreaturePerceptionRange(
  perceptionRangeFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...perceptionRangeFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creaturePerceptionRange;
}

function parseCreatureWalkRate(
  walkRateFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...walkRateFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureWalkRate;
}

function parseCreatureSoundSetFile(
  soundSetFileFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...soundSetFileFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureSoundSetFile;
}

function parseCreatureStartingPackage(
  startingPackageFields: readonly SupportedField[],
  classFields?: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...startingPackageFields,
        ...(classFields
          ? [{ label: "ClassList", type: "list" as const, value: [2] }]
          : []),
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
    { typeId: 2, fields: classFields ?? [] },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureStartingPackage;
}

function parseCreatureSkillList(
  skillListFields: readonly SupportedField[],
  entries: readonly StructDef[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_guard" },
        ...skillListFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
    ...entries,
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureSkillList;
}

function parseCreatureFeatList(
  featListFields: readonly SupportedField[],
  entries: readonly StructDef[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_guard" },
        ...featListFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
    ...entries,
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureFeatList;
}

function parseCreatureClassLevelState(
  classListFields: readonly SupportedField[],
  entries: readonly StructDef[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        ...classListFields,
        { label: "TemplateResRef", type: "resref", value: "wolf" },
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
    ...entries,
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureClassLevelState;
}

function parseCreaturePortrait(
  portraitFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...portraitFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creaturePortrait;
}

function parseCreatureChallengeRating(
  challengeRatingFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...challengeRatingFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureChallengeRating;
}

function parseCreatureAbilityScores(
  abilityScoreFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...abilityScoreFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureAbilityScores;
}

function parseCreatureAppearanceColors(
  appearanceColorFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...appearanceColorFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureAppearanceColors;
}

function parseCreatureBodyParts(
  bodyPartFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...bodyPartFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureBodyParts;
}

function parseCreatureAppendages(
  appendageFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...appendageFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureAppendages;
}

function parseCreatureHitPointState(
  fields: readonly SupportedField[],
  dependencyStructs: readonly StructDef[] = [],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...fields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
    ...dependencyStructs,
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureHitPointState;
}

function parseCreatureNaturalArmorClass(
  naturalArmorClassFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...naturalArmorClassFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureNaturalArmorClass;
}

function parseCreatureSavingThrowBonuses(
  savingThrowFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...savingThrowFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureSavingThrowBonuses;
}

function parseCreatureAlignment(alignmentFields: readonly SupportedField[]) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...alignmentFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureAlignment;
}

function parseCreatureNameLocalizedStrings(
  nameFields: readonly SupportedField[],
) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "Creature List", type: "list", value: [1] }] },
    {
      typeId: 4,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_chicken" },
        ...nameFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.creatures[0]?.creatureLocalizedStrings;
}

function parseItemLocalizedStrings(localizedStringFields: readonly SupportedField[]) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "ItemList", type: "list", value: [1] }] },
    {
      typeId: 0,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_sword" },
        ...localizedStringFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.items[0]?.itemLocalizedStrings;
}

function parseItemVariables(variableFields: readonly any[]) {
  const nestedStructs: StructDef[] = [];
  const normalizedFields = variableFields.map((field) => {
    if (field.type !== "list" || !Array.isArray(field.value) ||
      !field.value.every((entry: unknown) => typeof entry === "object" && entry !== null)) {
      return field as SupportedField;
    }
    const indices = field.value.map((entry: { typeId?: number; fields: SupportedField[] }) => {
      const index = 2 + nestedStructs.length;
      nestedStructs.push({ typeId: entry.typeId, fields: entry.fields });
      return index;
    });
    return { label: field.label, type: "list" as const, value: indices };
  });
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "ItemList", type: "list", value: [1] }] },
    {
      typeId: 0,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_sword" },
        ...normalizedFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
    ...nestedStructs,
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.items[0]?.itemVariables;
}

function parseItemBaseAppearanceRaw(fields: readonly SupportedField[]) {
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "ItemList", type: "list", value: [1] }] },
    {
      typeId: 0,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_sword" },
        ...fields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.items[0]?.itemBaseAppearanceRaw;
}

function canonicalItemPropertyFields(
  overrides: { propertyName?: number; costTable?: number } = {},
): SupportedField[] {
  return [
    { label: "PropertyName", type: "word", value: overrides.propertyName ?? 1 },
    { label: "Subtype", type: "word", value: 0xffff },
    { label: "CostTable", type: "byte", value: overrides.costTable ?? 2 },
    { label: "CostValue", type: "word", value: 3 },
    { label: "Param1", type: "byte", value: 0xff },
    { label: "Param1Value", type: "byte", value: 0 },
    { label: "ChanceAppear", type: "byte", value: 100 },
  ];
}

function parseItemPropertyList(propertyFields: readonly any[]) {
  const nestedStructs: StructDef[] = [];
  const normalizedFields = propertyFields.map((field) => {
    if (field.type !== "list" || !Array.isArray(field.value) ||
      !field.value.every((entry: unknown) => typeof entry === "object" && entry !== null)) {
      return field as SupportedField;
    }
    const indices = field.value.map((entry: { typeId?: number; fields: SupportedField[] }) => {
      const index = 2 + nestedStructs.length;
      nestedStructs.push({ typeId: entry.typeId, fields: entry.fields });
      return index;
    });
    return { label: field.label, type: "list" as const, value: indices };
  });
  const bytes = buildNestedGffBuffer([
    { fields: [{ label: "ItemList", type: "list", value: [1] }] },
    {
      typeId: 0,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_sword" },
        ...normalizedFields,
        { label: "XPosition", type: "float", value: 1 },
        { label: "YPosition", type: "float", value: 2 },
      ],
    },
    ...nestedStructs,
  ], "GIT ");
  return parseAreaObjectsFromGitGff(bytes)?.items[0]?.itemPropertyList;
}

function buildAreaRecordForWriter(): AreaRecord {
  return {
    areaId: "writer_area_001",
    name: "Writer Proof Area",
    biome: "urban",
    width: 2,
    height: 1,
    tags: ["writer-proof"],
    benchmark: false,
    previewImageUrl: "/previews/writer_area_001.webp",
    textureAtlasId: "atlas_writer",
    textureAtlasObjectKey: "modules/current/areas/atlases/atlas_writer.webp",
    textureAtlasContentType: "image/webp",
    textureAtlasSizeBytes: 128,
    textureAtlasFingerprint: "writer",
    tileSet: "tno01",
    tiles: [
      {
        tileInstanceId: "writer_area_001:tile:0",
        areaId: "writer_area_001",
        tilesetResRef: "tno01",
        row: 0,
        col: 0,
        tileIndex: 0,
        tileId: 101,
        modelResRef: "tno01_a01_01",
        orientation: 1,
        height: 0.5,
        mainLight1: 4,
        mainLight2: 5,
        sourceLight1: 6,
        sourceLight2: 7,
        animLoop1: 0,
        animLoop2: 0,
        animLoop3: 1,
        source: "are-tile-list"
      },
      {
        tileInstanceId: "writer_area_001:tile:1",
        areaId: "writer_area_001",
        tilesetResRef: "tno01",
        row: 0,
        col: 1,
        tileIndex: 1,
        tileId: 102,
        modelResRef: "tno01_a01_02",
        orientation: 2,
        height: 0,
        source: "are-tile-list"
      }
    ],
    lighting: {
      source: "are-root-fields",
      fields: [
        { field: "IsNight", value: 1 },
        { field: "ShadowOpacity", value: 50 }
      ]
    },
    soundscape: {
      bindingKeys: {
        areaKey: "GI_sound_area",
        randomKey: "GI_sound_rndm",
        positionalKey: "GI_sound_pos"
      },
      area: [],
      random: [],
      positional: []
    },
    objects: [
      {
        objectId: "writer_area_001:plc:0",
        kind: "placeable",
        templateId: "plc_market_stall",
        resRef: "plc_market_stall",
        tag: "PLC_MARKET_STALL",
        localizedName: "Market Stall",
        x: 1,
        y: 2,
        z: 0,
        bearing: 45
      },
      {
        objectId: "writer_area_001:cre:0",
        kind: "creature",
        templateId: "nw_guard",
        resRef: "nw_guard",
        tag: "NW_GUARD",
        creatureMetadata: {
          inventoryItemListEntries: JSON.stringify([
            {
              sourceIndex: 0,
              resRef: "nw_it_mpotion001",
              x: 2,
              y: 3,
              dropable: true,
              pickpocketable: false
            }
          ]),
          equipItemListEntries: JSON.stringify([
            {
              resRef: "nw_wswmls001",
              slotMask: 16,
              dropable: true,
              pickpocketable: false,
              infinite: false
            }
          ])
        },
        x: 3,
        y: 4,
        z: 0,
        bearing: 90
      },
      {
        objectId: "writer_area_001:item:0",
        kind: "item",
        templateId: "itm_hide_armor",
        resRef: "itm_hide_armor",
        tag: "ITM_HIDE_ARMOR",
        localizedName: "Placed Hide Armor",
        x: 5,
        y: 6,
        z: 0,
        bearing: 180,
        itemMetadata: {
          baseItem: 16,
          modelPart1: 66,
          bodyPartTorso: 43,
          leather1Color: 5,
          metal2Color: 8,
          "script.onused": "it_onuse",
          itemPropertyListEntries: JSON.stringify([
            {
              propertyName: 15,
              subtype: 66,
              costTable: 3,
              costValue: 1,
              chanceAppear: 100
            }
          ])
        }
      }
    ],
    updatedAt: "2026-07-06T00:00:00.000Z"
  };
}

function buildNestedGffBuffer(structs: StructDef[], fileType: string): Buffer {
  const uniqueLabels = [
    ...new Set(structs.flatMap((struct) => struct.fields.map((field) => field.label)))
  ];
  const labelIndexByName = new Map(uniqueLabels.map((label, index) => [label, index]));

  const fieldDataChunks: Buffer[] = [];
  const listIndicesChunks: Buffer[] = [];
  const fieldEntries: Array<{ typeId: number; labelIndex: number; dataOrOffset: number }> = [];
  const structFieldIndices: number[][] = structs.map(() => []);

  const pushFieldData = (chunk: Buffer): number => {
    const offset = fieldDataChunks.reduce((sum, entry) => sum + entry.length, 0);
    fieldDataChunks.push(chunk);
    return offset;
  };

  const pushListIndicesData = (chunk: Buffer): number => {
    const offset = listIndicesChunks.reduce((sum, entry) => sum + entry.length, 0);
    listIndicesChunks.push(chunk);
    return offset;
  };

  structs.forEach((struct, structIndex) => {
    struct.fields.forEach((field) => {
      const labelIndex = labelIndexByName.get(field.label);
      if (labelIndex === undefined) {
        throw new Error(`Unknown label index for ${field.label}`);
      }

      let entry: { typeId: number; labelIndex: number; dataOrOffset: number };

      if (field.type === "byte") {
        entry = {
          typeId: FIELD_TYPE.BYTE,
          labelIndex,
          dataOrOffset: field.value & 0xff
        };
      } else if (field.type === "word") {
        entry = {
          typeId: FIELD_TYPE.WORD,
          labelIndex,
          dataOrOffset: field.value & 0xffff
        };
      } else if (field.type === "short") {
        entry = {
          typeId: FIELD_TYPE.SHORT,
          labelIndex,
          dataOrOffset: field.value & 0xffff
        };
      } else if (field.type === "dword") {
        entry = {
          typeId: FIELD_TYPE.DWORD,
          labelIndex,
          dataOrOffset: field.value >>> 0
        };
      } else if (field.type === "int") {
        entry = {
          typeId: FIELD_TYPE.INT,
          labelIndex,
          dataOrOffset: field.value >>> 0
        };
      } else if (field.type === "float") {
        const inline = Buffer.allocUnsafe(4);
        inline.writeFloatLE(field.value, 0);
        entry = {
          typeId: FIELD_TYPE.FLOAT,
          labelIndex,
          dataOrOffset: inline.readUInt32LE(0)
        };
      } else if (field.type === "cexostring") {
        const valueBytes = Buffer.from(field.value, "utf-8");
        const payload = Buffer.alloc(4 + valueBytes.length);
        payload.writeUInt32LE(valueBytes.length, 0);
        valueBytes.copy(payload, 4);
        entry = {
          typeId: FIELD_TYPE.CEXOSTRING,
          labelIndex,
          dataOrOffset: pushFieldData(payload)
        };
      } else if (field.type === "resref") {
        const valueBytes = Buffer.from(field.value, "ascii");
        const payload = Buffer.alloc(1 + valueBytes.length);
        payload.writeUInt8(valueBytes.length, 0);
        valueBytes.copy(payload, 1);
        entry = {
          typeId: FIELD_TYPE.RESREF,
          labelIndex,
          dataOrOffset: pushFieldData(payload)
        };
      } else if (field.type === "cexolocstring") {
        const legacyText = typeof field.value === "string" ? field.value : undefined;
        const rawValue = typeof field.value === "string" ? undefined : field.value;
        const rawEntries = rawValue === undefined
          ? [{ languageId: 0, textBytes: Buffer.from(legacyText ?? "", "utf-8") }]
          : rawValue.entries;
        const entryPayloads = rawEntries.map((rawEntry, rawEntryIndex) => {
          const entryPayload = Buffer.alloc(8 + rawEntry.textBytes.length);
          entryPayload.writeUInt32LE(rawEntry.languageId >>> 0, 0);
          entryPayload.writeUInt32LE(
            rawEntry.textBytes.length + (
              rawEntryIndex === 0 && rawValue !== undefined
                ? rawValue.firstDeclaredTextLengthDelta ?? 0
                : 0
            ),
            4,
          );
          rawEntry.textBytes.copy(entryPayload, 8);
          return entryPayload;
        });
        const trailingBytes = rawValue === undefined
          ? Buffer.alloc(0)
          : rawValue.trailingBytes ?? Buffer.alloc(0);
        const entryPayload = Buffer.concat([...entryPayloads, trailingBytes]);
        const locPayload = Buffer.alloc(12 + entryPayload.length);
        const totalSize = 8 + entryPayload.length + (rawValue?.declaredTotalSizeDelta ?? 0);
        locPayload.writeUInt32LE(totalSize, 0);
        locPayload.writeUInt32LE(
          (rawValue === undefined
            ? ("strRef" in field ? field.strRef ?? 0 : 0)
            : rawValue.strRef) >>> 0,
          4,
        );
        locPayload.writeUInt32LE(
          rawEntries.length + (rawValue?.declaredCountDelta ?? 0),
          8,
        );
        entryPayload.copy(locPayload, 12);

        const payloadToWrite = rawValue?.truncatePayloadBytes
          ? locPayload.subarray(0, Math.max(0, locPayload.length - rawValue.truncatePayloadBytes))
          : locPayload;

        entry = {
          typeId: rawValue?.fieldTypeIdOverride ?? FIELD_TYPE.CEXOLOCSTRING,
          labelIndex,
          dataOrOffset: pushFieldData(payloadToWrite)
        };
      } else if (field.type === "struct") {
        entry = {
          typeId: FIELD_TYPE.STRUCT,
          labelIndex,
          dataOrOffset: field.value >>> 0
        };
      } else {
        const payload = Buffer.alloc(4 + field.value.length * 4);
        payload.writeUInt32LE(field.value.length, 0);
        field.value.forEach((structIndexFromList, index) => {
          payload.writeUInt32LE(structIndexFromList >>> 0, 4 + index * 4);
        });
        entry = {
          typeId: FIELD_TYPE.LIST,
          labelIndex,
          dataOrOffset: pushListIndicesData(payload)
        };
      }

      const fieldIndex = fieldEntries.length;
      fieldEntries.push(entry);
      structFieldIndices[structIndex].push(fieldIndex);
    });
  });

  const fieldData = Buffer.concat(fieldDataChunks);
  const listIndices = Buffer.concat(listIndicesChunks);

  const fieldIndicesChunks: Buffer[] = [];
  const structEntries: Array<{ typeId: number; dataOrOffset: number; fieldCount: number }> = [];

  structs.forEach((struct, index) => {
    const indices = structFieldIndices[index];
    if (indices.length === 0) {
      structEntries.push({
        typeId: struct.typeId ?? 1,
        dataOrOffset: 0,
        fieldCount: 0
      });
      return;
    }

    if (indices.length === 1) {
      structEntries.push({
        typeId: struct.typeId ?? 1,
        dataOrOffset: indices[0],
        fieldCount: 1
      });
      return;
    }

    const currentOffset = fieldIndicesChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const chunk = Buffer.alloc(indices.length * 4);
    indices.forEach((fieldIndex, fieldPos) => {
      chunk.writeUInt32LE(fieldIndex >>> 0, fieldPos * 4);
    });
    fieldIndicesChunks.push(chunk);

    structEntries.push({
      typeId: struct.typeId ?? 1,
      dataOrOffset: currentOffset,
      fieldCount: indices.length
    });
  });

  const fieldIndices = Buffer.concat(fieldIndicesChunks);

  const structTable = Buffer.alloc(structEntries.length * STRUCT_ENTRY_SIZE);
  structEntries.forEach((entry, index) => {
    const offset = index * STRUCT_ENTRY_SIZE;
    structTable.writeUInt32LE(entry.typeId >>> 0, offset);
    structTable.writeUInt32LE(entry.dataOrOffset >>> 0, offset + 4);
    structTable.writeUInt32LE(entry.fieldCount >>> 0, offset + 8);
  });

  const fieldTable = Buffer.alloc(fieldEntries.length * FIELD_ENTRY_SIZE);
  fieldEntries.forEach((entry, index) => {
    const offset = index * FIELD_ENTRY_SIZE;
    fieldTable.writeUInt32LE(entry.typeId, offset);
    fieldTable.writeUInt32LE(entry.labelIndex, offset + 4);
    fieldTable.writeUInt32LE(entry.dataOrOffset, offset + 8);
  });

  const labels = Buffer.alloc(uniqueLabels.length * LABEL_ENTRY_SIZE);
  uniqueLabels.forEach((label, index) => {
    const offset = index * LABEL_ENTRY_SIZE;
    const bytes = Buffer.from(label.slice(0, LABEL_ENTRY_SIZE), "ascii");
    bytes.copy(labels, offset);
  });

  const structOffset = HEADER_SIZE;
  const fieldOffset = structOffset + structTable.length;
  const labelOffset = fieldOffset + fieldTable.length;
  const fieldDataOffset = labelOffset + labels.length;
  const fieldIndicesOffset = fieldDataOffset + fieldData.length;
  const listIndicesOffset = fieldIndicesOffset + fieldIndices.length;

  const header = Buffer.alloc(HEADER_SIZE);
  header.write(fileType, 0, "ascii");
  header.write("V3.2", 4, "ascii");
  header.writeUInt32LE(structOffset, 8);
  header.writeUInt32LE(structEntries.length, 12);
  header.writeUInt32LE(fieldOffset, 16);
  header.writeUInt32LE(fieldEntries.length, 20);
  header.writeUInt32LE(labelOffset, 24);
  header.writeUInt32LE(uniqueLabels.length, 28);
  header.writeUInt32LE(fieldDataOffset, 32);
  header.writeUInt32LE(fieldData.length, 36);
  header.writeUInt32LE(fieldIndicesOffset, 40);
  header.writeUInt32LE(fieldIndices.length, 44);
  header.writeUInt32LE(listIndicesOffset, 48);
  header.writeUInt32LE(listIndices.length, 52);

  return Buffer.concat([
    header,
    structTable,
    fieldTable,
    labels,
    fieldData,
    fieldIndices,
    listIndices
  ]);
}

function triggerPoint(x: number, y: number, z: number): SupportedField[] {
  return [
    { label: "PointX", type: "float", value: x },
    { label: "PointY", type: "float", value: y },
    { label: "PointZ", type: "float", value: z },
  ];
}

function encounterPoint(x: number, y: number, z: number): SupportedField[] {
  return [
    { label: "X", type: "float", value: x },
    { label: "Y", type: "float", value: y },
    { label: "Z", type: "float", value: z },
  ];
}

function corruptGffFieldDataOffset(source: Buffer, label: string): Buffer {
  const bytes = Buffer.from(source);
  const fieldOffset = bytes.readUInt32LE(16);
  const fieldCount = bytes.readUInt32LE(20);
  const labelOffset = bytes.readUInt32LE(24);
  const labelCount = bytes.readUInt32LE(28);
  let labelIndex = -1;

  for (let index = 0; index < labelCount; index += 1) {
    const start = labelOffset + (index * LABEL_ENTRY_SIZE);
    const end = bytes.indexOf(0, start);
    const actualEnd = end >= start && end < start + LABEL_ENTRY_SIZE
      ? end
      : start + LABEL_ENTRY_SIZE;
    if (bytes.toString("ascii", start, actualEnd) === label) {
      labelIndex = index;
      break;
    }
  }
  if (labelIndex < 0) {
    throw new Error(`Missing GFF label ${label}`);
  }

  for (let index = 0; index < fieldCount; index += 1) {
    const entryOffset = fieldOffset + (index * FIELD_ENTRY_SIZE);
    if (bytes.readUInt32LE(entryOffset + 4) === labelIndex) {
      bytes.writeUInt32LE(0xffff_ffff, entryOffset + 8);
      return bytes;
    }
  }
  throw new Error(`Missing GFF field ${label}`);
}
