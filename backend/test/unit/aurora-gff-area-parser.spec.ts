import {
  parseAreaMetadataFromAreGff,
  parseAreaObjectsFromGitGff
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import { serializeAreaItemPlacementsToGitGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-item-writer";
import {
  serializeAreaToAreGff,
  serializeAreaToGitGff
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-writer";
import type { AreaRecord } from "../../src/modules/areas/domain/area.types";

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
            { label: "Name", type: "cexolocstring", value: "Market District" },
            { label: "Tag", type: "cexostring", value: "market_district" },
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
          fields: [
            { label: "TemplateResRef", type: "resref", value: "snd_forge_loop" },
            { label: "Tag", type: "cexostring", value: "forge_sound" },
            { label: "XPosition", type: "float", value: 4.5 },
            { label: "YPosition", type: "float", value: 5.5 },
            { label: "ZPosition", type: "float", value: 1.25 },
            { label: "Active", type: "byte", value: 1 },
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
            { label: "Priority", type: "byte", value: 2 },
            { label: "Volume", type: "byte", value: 80 },
            { label: "VolumeVrtn", type: "byte", value: 15 },
            { label: "Sounds", type: "list", value: [7, 8] }
          ]
        },
        {
          fields: [{ label: "Sound", type: "resref", value: "forge_loop_a" }]
        },
        {
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
            { label: "InventoryRes", type: "resref", value: "nw_it_potion" },
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
            { label: "EquippedRes", type: "resref", value: "nw_wswss001" },
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
        resRef: "nw_it_potion",
        x: 3,
        y: 4,
        dropable: true,
        pickpocketable: true,
        infinite: false
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
          priority: 2,
          extra: {
            auroraSoundList: "forge_loop_a\nforge_loop_b"
          }
        }
      }
    });
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
      z: 1
    });
    expect(parsed?.waypoints[0]).toMatchObject({
      listKind: "waypoint",
      tag: "wp_market_entry",
      x: 8,
      y: 9
    });
  });

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
      costTable: 2,
      costValue: 4,
      charges: 4,
      stackSize: 1,
      paletteId: 9,
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
      metal2Color: 8,
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
          itemPropertyListEntries: JSON.stringify(expectedPropertyEntries)
        }
      }
    ]);

    const parsed = parseAreaObjectsFromGitGff(bytes);

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
        comments: "instance comment",
        ...expectedItemMetadata,
        itemPropertyListCount: 2
      }
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
      bearing: 90
    });
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
        "script.onused": "it_onuse",
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
});

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
        const valueBytes = Buffer.from(field.value, "utf-8");
        const entryPayload = Buffer.alloc(8 + valueBytes.length);
        entryPayload.writeUInt32LE(0, 0);
        entryPayload.writeUInt32LE(valueBytes.length, 4);
        valueBytes.copy(entryPayload, 8);

        const locPayload = Buffer.alloc(12 + entryPayload.length);
        const totalSize = 8 + entryPayload.length;
        locPayload.writeUInt32LE(totalSize, 0);
        locPayload.writeUInt32LE(field.strRef ?? 0, 4);
        locPayload.writeUInt32LE(1, 8);
        entryPayload.copy(locPayload, 12);

        entry = {
          typeId: FIELD_TYPE.CEXOLOCSTRING,
          labelIndex,
          dataOrOffset: pushFieldData(locPayload)
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
