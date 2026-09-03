import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  parseRawGffDocument,
  parseTemplateBlueprintFromGff
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  serializeCreatureBlueprintToUtcGff,
  serializeCreatureInventoryToUtcGff
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-utc-writer";
import { serializePlaceableBlueprintToUtpGff } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-utp-writer";
import {
  buildGffBuffer as buildSerializableGffBuffer,
  serializeItemBlueprintToUtiGff
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { serializeStoreBlueprintToUtmGff } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-utm-writer";

type SupportedField =
  | { label: string; type: "byte"; value: number }
  | { label: string; type: "word"; value: number }
  | { label: string; type: "short"; value: number }
  | { label: string; type: "dword"; value: number }
  | { label: string; type: "int"; value: number }
  | { label: string; type: "float"; value: number }
  | { label: string; type: "cexostring"; value: string }
  | { label: string; type: "resref"; value: string }
  | { label: string; type: "cexolocstring"; value: string }
  | { label: string; type: "struct"; value: { typeId: number; fields: SupportedField[] } }
  | {
      label: string;
      type: "list";
      value:
        | number
        | Array<SupportedField[] | { typeId: number; fields: SupportedField[] }>;
    }
  | { label: string; type: "unknown"; value: number };

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

describe("aurora-gff-template-parser", () => {
  it("parses root-level blueprint fields for template classification", () => {
    const bytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_test_anchor" },
      { label: "LocName", type: "cexolocstring", value: "Test Anchor" },
      { label: "Tag", type: "cexostring", value: "vvx_fire_anchor" },
      { label: "Conversation", type: "resref", value: "conv_anchor" },
      { label: "Appearance", type: "dword", value: 42 },
      { label: "HasInventory", type: "byte", value: 1 },
      { label: "Static", type: "byte", value: 0 },
      { label: "ModelName", type: "resref", value: "fx_fire_pillar" },
      { label: "OnUsed", type: "resref", value: "script_use_anchor" }
    ]);

    const parsed = parseTemplateBlueprintFromGff(bytes);

    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      sourceFileType: "UTP ",
      sourceFileVersion: "V3.2",
      templateResRef: "plc_test_anchor",
      displayName: "Test Anchor",
      tag: "vvx_fire_anchor",
      conversation: "conv_anchor",
      appearanceId: 42,
      hasInventory: true,
      isStatic: false,
      modelResRef: "fx_fire_pillar"
    });
    expect(parsed?.scripts).toMatchObject({
      onused: "script_use_anchor"
    });
    expect(parsed?.dependencyRefs).toEqual(
      expect.arrayContaining([
        "fx_fire_pillar",
        "conv_anchor",
        "script_use_anchor",
        "plc_test_anchor",
        "vvx_fire_anchor"
      ])
    );
    expect(parsed?.vfxEvidence).toEqual(expect.arrayContaining(["modelResRef", "tag"]));
  });

  it("parses Aurora placeable lock/trap/runtime aliases from UTP", () => {
    const bytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_magicdoor_prop" },
      { label: "LocName", type: "cexolocstring", value: "Magic Door" },
      { label: "KeyName", type: "resref", value: "key_magicdoor" },
      { label: "AnimationState", type: "dword", value: 2 },
      { label: "BodyBag", type: "byte", value: 1 },
      { label: "AutoRemoveKey", type: "byte", value: 1 },
      { label: "CloseLockDC", type: "dword", value: 18 },
      { label: "OpenLockDC", type: "dword", value: 20 },
      { label: "Interruptable", type: "byte", value: 0 },
      { label: "Invulnerable", type: "byte", value: 1 },
      { label: "KeyRequired", type: "byte", value: 1 },
      { label: "Lockable", type: "byte", value: 1 },
      { label: "Locked", type: "byte", value: 1 },
      { label: "TrapDetectable", type: "byte", value: 1 },
      { label: "TrapDetectDC", type: "dword", value: 12 },
      { label: "TrapDisarmable", type: "byte", value: 1 },
      { label: "DisarmDC", type: "dword", value: 15 },
      { label: "TrapFlag", type: "byte", value: 1 },
      { label: "TrapOneShot", type: "byte", value: 0 },
      { label: "TrapType", type: "dword", value: 7 },
      { label: "CurrentHP", type: "dword", value: 35 },
      { label: "Hardness", type: "dword", value: 4 },
      { label: "OnLock", type: "resref", value: "script_magicdoor_lock" },
      { label: "OnMeleeAttacked", type: "resref", value: "script_magicdoor_melee" }
    ]);

    const parsed = parseTemplateBlueprintFromGff(bytes);
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      keyName: "key_magicdoor",
      animationState: 2,
      bodyBag: true,
      autoRemoveKey: true,
      closeLockDc: 18,
      openLockDc: 20,
      interruptable: false,
      invulnerable: true,
      keyRequired: true,
      lockable: true,
      locked: true,
      trapDetectable: true,
      trapDetectDc: 12,
      trapDisarmable: true,
      disarmDc: 15,
      trapFlag: true,
      trapOneShot: false,
      trapType: 7,
      currentHitPoints: 35,
      hardness: 4
    });
    expect(parsed?.scripts).toMatchObject({
      onlock: "script_magicdoor_lock",
      onmeleeattacked: "script_magicdoor_melee"
    });
  });

  it("extracts creature runtime fields and list counters", () => {
    const bytes = buildGffBuffer(
      [
        { label: "TemplateResRef", type: "resref", value: "cre_city_guard_01" },
        { label: "LocName", type: "cexolocstring", value: "City Guard" },
        { label: "Comment", type: "cexostring", value: "Creature palette comment" },
        { label: "PaletteID", type: "byte", value: 7 },
        { label: "ScriptHeartbeat", type: "resref", value: "hb_guard" },
        { label: "ScriptOnBlocked", type: "resref", value: "block_guard" },
        { label: "Appearance_Type", type: "dword", value: 17 },
        { label: "Plot", type: "byte", value: 1 },
        { label: "IsPC", type: "byte", value: 1 },
        { label: "IsImmortal", type: "byte", value: 1 },
        { label: "Lootable", type: "byte", value: 1 },
        { label: "Interruptable", type: "byte", value: 0 },
        { label: "NoPermDeath", type: "byte", value: 1 },
        { label: "BodyBag", type: "byte", value: 1 },
        { label: "DecayTime", type: "dword", value: 30 },
        { label: "StartingPackage", type: "byte", value: 1 },
        { label: "Phenotype", type: "byte", value: 1 },
        { label: "WalkRate", type: "dword", value: 4 },
        { label: "FactionID", type: "dword", value: 3 },
        { label: "ChallengeRating", type: "dword", value: 6 },
        { label: "GoodEvil", type: "byte", value: 65 },
        { label: "LawfulChaotic", type: "byte", value: 35 },
        { label: "Str", type: "byte", value: 16 },
        { label: "Dex", type: "byte", value: 14 },
        { label: "Con", type: "byte", value: 13 },
        { label: "Int", type: "byte", value: 10 },
        { label: "Wis", type: "byte", value: 12 },
        { label: "Cha", type: "byte", value: 8 },
        { label: "FortSave", type: "byte", value: 5 },
        { label: "RefSave", type: "byte", value: 4 },
        { label: "WillSave", type: "byte", value: 3 },
        { label: "StrAdjust", type: "byte", value: 1 },
        { label: "DexAdjust", type: "byte", value: 2 },
        { label: "ConAdjust", type: "byte", value: 3 },
        { label: "IntAdjust", type: "byte", value: 4 },
        { label: "WisAdjust", type: "byte", value: 5 },
        { label: "ChaAdjust", type: "byte", value: 6 },
        { label: "Disarmable", type: "byte", value: 0 },
        { label: "ClassList", type: "list", value: 2 },
        { label: "SkillList", type: "list", value: 5 },
        { label: "FeatList", type: "list", value: 4 },
        { label: "ItemList", type: "list", value: 3 }
      ],
      "UTC "
    );

    const parsed = parseTemplateBlueprintFromGff(bytes);
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      sourceFileType: "UTC ",
      templateResRef: "cre_city_guard_01",
      comments: "Creature palette comment",
      paletteId: 7,
      appearanceId: 17,
      plot: true,
      isPc: true,
      isImmortal: true,
      lootable: true,
      interruptable: false,
      noPermDeath: true,
      bodyBag: true,
      decayTime: 30,
      startingPackage: true,
      phenotype: 0,
      walkRate: 4,
      factionId: 3,
      challengeRating: 6,
      goodEvil: 65,
      lawfulChaotic: 35,
      strength: 16,
      dexterity: 14,
      constitution: 13,
      intelligence: 10,
      wisdom: 12,
      charisma: 8,
      fortitudeBonus: 5,
      reflexBonus: 4,
      willBonus: 3,
      strengthAdjust: 1,
      dexterityAdjust: 2,
      constitutionAdjust: 3,
      intelligenceAdjust: 4,
      wisdomAdjust: 5,
      charismaAdjust: 6,
      disarmable: false,
      classListCount: 2,
      skillListCount: 5,
      featListCount: 4,
      inventoryItemListCount: 3
    });
    expect(parsed?.scripts).toMatchObject({
      scriptheartbeat: "hb_guard",
      scriptonblocked: "block_guard"
    });
  });

  it("extracts item runtime/pricing fields from UTI", () => {
    const bytes = buildGffBuffer(
      [
        { label: "TemplateResRef", type: "resref", value: "itm_scroll_fire_01" },
        { label: "LocName", type: "cexolocstring", value: "Scroll of Fire" },
        { label: "Description", type: "cexolocstring", value: "Unidentified description" },
        { label: "DescIdentified", type: "cexolocstring", value: "Identified description" },
        { label: "Tag", type: "cexostring", value: "itm_scroll_fire_tag" },
        { label: "BaseItem", type: "dword", value: 75 },
        { label: "ModelPart1", type: "byte", value: 2 },
        { label: "ModelPart2", type: "byte", value: 1 },
        { label: "ModelPart3", type: "byte", value: 3 },
        { label: "Cost", type: "dword", value: 1648 },
        { label: "AddCost", type: "dword", value: 50 },
        { label: "CostTable", type: "dword", value: 3 },
        { label: "CostValue", type: "dword", value: 11 },
        { label: "Charges", type: "dword", value: 8 },
        { label: "StackSize", type: "word", value: 5 },
        { label: "Identified", type: "byte", value: 0 },
        { label: "Stolen", type: "byte", value: 1 },
        { label: "Cursed", type: "byte", value: 1 },
        { label: "ArmorPart_RFoot", type: "byte", value: 4 },
        { label: "ArmorPart_Torso", type: "byte", value: 20 },
        { label: "Leather1Color", type: "byte", value: 12 },
        { label: "Leather2Color", type: "byte", value: 13 },
        { label: "Cloth1Color", type: "byte", value: 14 },
        { label: "Cloth2Color", type: "byte", value: 15 },
        { label: "Metal1Color", type: "byte", value: 16 },
        { label: "Metal2Color", type: "byte", value: 17 },
        {
          label: "PropertiesList",
          type: "list",
          value: [
            [
              { label: "PropertyName", type: "word", value: 15 },
              { label: "Subtype", type: "word", value: 66 },
              { label: "CostTable", type: "byte", value: 3 },
              { label: "CostValue", type: "word", value: 1 },
              { label: "Param1", type: "byte", value: 255 },
              { label: "Param1Value", type: "byte", value: 255 },
              { label: "ChanceAppear", type: "byte", value: 100 }
            ]
          ]
        }
      ],
      "UTI "
    );

    const parsed = parseTemplateBlueprintFromGff(bytes);
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      sourceFileType: "UTI ",
      templateResRef: "itm_scroll_fire_01",
      localizedName: "Scroll of Fire",
      displayName: "Scroll of Fire",
      description: "Unidentified description",
      identifiedDescription: "Identified description",
      tag: "itm_scroll_fire_tag",
      baseItem: 75,
      modelPart1: 2,
      modelPart2: 1,
      modelPart3: 3,
      cost: 1648,
      addCost: 50,
      costTable: 3,
      costValue: 11,
      charges: 8,
      stackSize: 5,
      identified: false,
      stolen: true,
      cursed: true,
      bodyPartRFoot: 4,
      bodyPartTorso: 20,
      leather1Color: 12,
      leather2Color: 13,
      cloth1Color: 14,
      cloth2Color: 15,
      metal1Color: 16,
      metal2Color: 17,
      itemPropertyListCount: 1,
      itemPropertyListEntries: [
        {
          propertyName: 15,
          subtype: 66,
          costTable: 3,
          costValue: 1,
          param1: 255,
          param1Value: 255,
          chanceAppear: 100
        }
      ]
    });
    expect(parsed?.scripts).not.toHaveProperty("oninventorydisturbed");
  });

  it("serializes item blueprints to UTI GFF and round-trips through the parser", () => {
    const bytes = serializeItemBlueprintToUtiGff({
      templateResRef: "wiz_hide_armor",
      localizedName: "Wizard Hide Armor",
      localizedNameStrRef: 12840,
      description: "Unidentified wizard armor",
      identifiedDescription: "Identified wizard armor",
      comments: "Created by Aurora Web item wizard",
      paletteId: 7,
      tag: "WIZ_HIDE_ARMOR",
      plot: false,
      baseItem: 16,
      cost: 19463,
      addCost: 12,
      charges: 0,
      stackSize: 1,
      identified: true,
      stolen: false,
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
      itemPropertyListEntries: [
        {
          propertyName: 1,
          subtype: 0,
          costTable: 2,
          costValue: 5,
          param1: 255,
          param1Value: 0,
          chanceAppear: 100
        },
        {
          propertyName: 15,
          subtype: 335,
          costTable: 3,
          costValue: 13,
          param1: 255,
          param1Value: 0,
          chanceAppear: 100
        }
      ],
      variableListEntries: [
        { name: " duplicate ", type: "int", value: -7 },
        { name: "duplicate", type: "float", value: Math.fround(1.25) },
        { name: "duplicate", type: "string", value: " exact value " }
      ]
    });

    expect(bytes.toString("ascii", 0, 4)).toBe("UTI ");
    expect(bytes.toString("ascii", 4, 8)).toBe("V3.2");

    const parsed = parseTemplateBlueprintFromGff(bytes);

    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      sourceFileType: "UTI ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      templateResRef: "wiz_hide_armor",
      localizedName: "Wizard Hide Armor",
      localizedNameStrRef: 12840,
      description: "Unidentified wizard armor",
      identifiedDescription: "Identified wizard armor",
      comments: "Created by Aurora Web item wizard",
      paletteId: 7,
      tag: "WIZ_HIDE_ARMOR",
      plot: false,
      baseItem: 16,
      cost: 19463,
      addCost: 12,
      charges: 0,
      stackSize: 1,
      identified: true,
      stolen: false,
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
      itemPropertyListCount: 2,
      itemPropertyListEntries: [
        {
          propertyName: 1,
          subtype: 0,
          costTable: 2,
          costValue: 5,
          param1: 255,
          param1Value: 0,
          chanceAppear: 100
        },
        {
          propertyName: 15,
          subtype: 335,
          costTable: 3,
          costValue: 13,
          param1: 255,
          param1Value: 0,
          chanceAppear: 100
        }
      ],
      variableListEntries: [
        { name: " duplicate ", type: "int", value: -7 },
        { name: "duplicate", type: "float", value: 1.25 },
        { name: "duplicate", type: "string", value: " exact value " }
      ]
    });
    expect(parsed?.scripts).toEqual({});
  });

  it("serializes creature inventory and equipment lists to UTC GFF", () => {
    const bytes = serializeCreatureInventoryToUtcGff({
      templateResRef: "cre_inv_guard",
      tag: "CRE_INV_GUARD",
      localizedName: "Inventory Guard",
      inventoryItemListEntries: [
        {
          resRef: "nw_it_mpotion001",
          x: 3,
          y: 4,
          dropable: true,
          pickpocketable: true,
          infinite: false
        },
        {
          randomResRef: "rnd_potion",
          randomList: "rl_potions",
          x: 5,
          y: 6,
          dropable: false,
          pickpocketable: false,
          infinite: true
        },
        {
          embeddedItem: {
            sourceStructTypeId: 0xffffffff,
            templateResRef: "emb_potion",
            localizedName: "Embedded Potion",
            localizedNameStrRef: 7001,
            tag: "EMB_POTION",
            baseItem: 49,
            itemPropertyListEntries: [
              {
                propertyName: 15,
                subtype: 0,
                costTable: 2,
                costValue: 5,
                param1: 255,
                param1Value: 0,
                chanceAppear: 100
              }
            ]
          },
          x: 7,
          y: 8,
          dropable: true,
          pickpocketable: false,
          infinite: false
        }
      ],
      equipItemListEntries: [
        {
          resRef: "nw_wswmls001",
          slotMask: 0x10,
          dropable: true,
          pickpocketable: false,
          infinite: true
        },
        {
          randomResRef: "rnd_sword",
          randomList: "rl_weapons",
          slotMask: 0x20,
          dropable: false,
          pickpocketable: true,
          infinite: false
        },
        {
          embeddedItem: {
            sourceStructTypeId: 0xffffffff,
            templateResRef: "emb_sword",
            localizedName: "Embedded Sword",
            tag: "EMB_SWORD",
            baseItem: 1
          },
          slotMask: 0x40,
          dropable: false,
          pickpocketable: false,
          infinite: true
        }
      ]
    });

    const parsed = parseTemplateBlueprintFromGff(bytes);
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      sourceFileType: "UTC ",
      templateResRef: "cre_inv_guard",
      tag: "CRE_INV_GUARD",
      inventoryItemListCount: 3,
      equipItemListCount: 3
    });
    expect(parsed?.inventoryItemListEntries).toEqual([
      {
        resRef: "nw_it_mpotion001",
        x: 3,
        y: 4,
        dropable: true,
        pickpocketable: true,
        infinite: false
      },
      {
        randomResRef: "rnd_potion",
        randomList: "rl_potions",
        x: 5,
        y: 6,
        dropable: false,
        pickpocketable: false,
        infinite: true
      },
      {
        embeddedItem: {
          sourceStructTypeId: 0xffffffff,
          templateResRef: "emb_potion",
          tag: "EMB_POTION",
          localizedName: "Embedded Potion",
          localizedNameStrRef: 7001,
          baseItem: 49,
          itemPropertyListCount: 1,
          itemPropertyListEntries: [
            {
              propertyName: 15,
              subtype: 0,
              costTable: 2,
              costValue: 5,
              param1: 255,
              param1Value: 0,
              chanceAppear: 100
            }
          ],
          fieldCount: 5
        },
        x: 7,
        y: 8,
        dropable: true,
        pickpocketable: false,
        infinite: false
      }
    ]);
    expect(parsed?.equipItemListEntries).toEqual([
      {
        resRef: "nw_wswmls001",
        slotMask: 0x10,
        dropable: true,
        pickpocketable: false,
        infinite: true
      },
      {
        randomResRef: "rnd_sword",
        randomList: "rl_weapons",
        slotMask: 0x20,
        dropable: false,
        pickpocketable: true,
        infinite: false
      },
      {
        embeddedItem: {
          sourceStructTypeId: 0xffffffff,
          templateResRef: "emb_sword",
          tag: "EMB_SWORD",
          localizedName: "Embedded Sword",
          baseItem: 1,
          itemPropertyListCount: undefined,
          fieldCount: 4
        },
        slotMask: 0x40,
        dropable: false,
        pickpocketable: false,
        infinite: true
      }
    ]);
  });

  it("round-trips the full supported creature UTC blueprint contract", () => {
    const bytes = serializeCreatureBlueprintToUtcGff({
      templateResRef: "cre_full_guard",
      tag: "CRE_FULL_GUARD",
      firstName: "Full",
      firstNameStrRef: 7101,
      lastName: "Guard",
      lastNameStrRef: 7102,
      description: "Full creature blueprint",
      descriptionStrRef: 7103,
      comments: "Authoring round-trip",
      paletteId: 7,
      conversation: "dlg_guard",
      gender: 1,
      race: 6,
      subrace: "City Watch",
      deity: "Tyr",
      phenotype: 2,
      portraitId: 42,
      portraitResRef: "po_guard",
      soundSetFile: 12,
      appearanceId: 102,
      animationState: 19,
      appearanceHead: 4,
      bodyPartTorso: 2,
      bodyPartRHand: 3,
      colorSkin: 5,
      colorHair: 6,
      wingsNew: 1,
      tailNew: 2,
      walkRate: 3,
      factionId: 8,
      challengeRating: 4.5,
      crAdjust: -2,
      perceptionRange: 11,
      disarmable: true,
      plot: true,
      isPc: false,
      isImmortal: true,
      lootable: true,
      noPermDeath: true,
      bodyBag: true,
      startingPackage: true,
      interruptable: false,
      decayTime: 90,
      naturalAc: 6,
      hitPoints: 40,
      currentHitPoints: 32,
      maxHitPoints: 48,
      reflexBonus: 3,
      willBonus: 4,
      fortitudeBonus: 5,
      strength: 16,
      dexterity: 14,
      constitution: 15,
      intelligence: 12,
      wisdom: 13,
      charisma: 11,
      strengthAdjust: 1,
      dexterityAdjust: -1,
      goodEvil: 70,
      lawfulChaotic: 30,
      scripts: {
        onHeartbeat: "guard_hb",
        onConversation: "guard_dlg",
        scriptdeath: "guard_die"
      },
      classListEntries: [
        {
          classId: 1,
          level: 5,
          knownSpells: [{ spellId: 7, spellLevel: 1, metaMagic: 2, flags: 4 }],
          memorizedSpells: [{ spellId: 8, spellLevel: 2, metaMagic: 0, flags: 1 }]
        },
        {
          classId: 2,
          level: 3,
          memorizedSpells: [{ spellId: 9, spellLevel: 1, flags: 0 }]
        }
      ],
      featListEntries: [{ featId: 11 }, { featId: 12 }],
      templateListEntries: [{ templateId: 21 }],
      specAbilityListEntries: [{ spellId: 33, flags: 2, casterLevel: 4 }],
      skillListEntries: [{ rank: 4 }, { rank: 5 }]
    });

    const raw = parseRawGffDocument(bytes);
    const parsed = parseTemplateBlueprintFromGff(bytes);
    expect(raw?.fields.find((field) => field.label === "WalkRate")).toEqual({
      label: "WalkRate",
      type: "int",
      value: 3
    });
    expect(raw?.fields.find((field) => field.label === "Wings_New")).toEqual({
      label: "Wings_New",
      type: "dword",
      value: 1
    });
    expect(raw?.fields.find((field) => field.label === "Tail_New")).toEqual({
      label: "Tail_New",
      type: "dword",
      value: 2
    });
    expect(parsed).toMatchObject({
      sourceFileType: "UTC ",
      templateResRef: "cre_full_guard",
      tag: "CRE_FULL_GUARD",
      firstName: "Full",
      firstNameStrRef: 7101,
      lastName: "Guard",
      lastNameStrRef: 7102,
      description: "Full creature blueprint",
      descriptionStrRef: 7103,
      comments: "Authoring round-trip",
      paletteId: 7,
      conversation: "dlg_guard",
      gender: 1,
      race: 6,
      subrace: "City Watch",
      deity: "Tyr",
      phenotype: 2,
      portraitId: 42,
      portraitResRef: "po_guard",
      soundSetFile: 12,
      appearanceId: 102,
      animationState: 19,
      appearanceHead: 4,
      bodyPartTorso: 2,
      bodyPartRHand: 3,
      colorSkin: 5,
      colorHair: 6,
      wingsNew: 1,
      tailNew: 2,
      walkRate: 3,
      factionId: 8,
      challengeRating: 4.5,
      crAdjust: -2,
      perceptionRange: 11,
      scripts: {
        scriptheartbeat: "guard_hb",
        scriptdialogue: "guard_dlg",
        scriptdeath: "guard_die"
      }
    });
    expect(parsed?.classListEntries).toEqual([
      {
        classId: 1,
        level: 5,
        knownSpellCount: 1,
        memorizedSpellCount: 1,
        knownSpells: [{ spellId: 7, spellLevel: 1, metaMagic: 2, flags: 5 }],
        memorizedSpells: [{ spellId: 8, spellLevel: 2, metaMagic: 0, flags: 1 }]
      },
      {
        classId: 2,
        level: 3,
        knownSpellCount: undefined,
        memorizedSpellCount: 1,
        knownSpells: undefined,
        memorizedSpells: [{ spellId: 9, spellLevel: 1, metaMagic: 0, flags: 1 }]
      }
    ]);
    expect(parsed?.featListEntries).toEqual([{ featId: 11 }, { featId: 12 }]);
    expect(parsed?.templateListEntries).toEqual([{ templateId: 21 }]);
    expect(parsed?.specAbilityListEntries).toEqual([{ spellId: 33, flags: 3, casterLevel: 4 }]);
    expect(parsed?.skillListEntries?.slice(0, 2)).toEqual([{ rank: 4 }, { rank: 5 }]);
  });

  it("never serializes non-native BodyPart_Robe into a Creature UTC", () => {
    const bytes = serializeCreatureBlueprintToUtcGff({
      templateResRef: "cre_robe_probe",
      bodyPartRobe: 19
    } as unknown as Parameters<typeof serializeCreatureBlueprintToUtcGff>[0]);

    const raw = parseRawGffDocument(bytes);
    expect(raw?.fields).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "BodyPart_Robe" })])
    );
  });

  it("preserves embedded Item structs in creature inventory and equipment summaries", () => {
    const bytes = buildGffBuffer(
      [
        { label: "TemplateResRef", type: "resref", value: "cre_embedded_items" },
        {
          label: "ItemList",
          type: "list",
          value: [
            [
              {
                label: "Item",
                type: "struct",
                value: {
                  typeId: 0xffffffff,
                  fields: [
                    { label: "TemplateResRef", type: "resref", value: "emb_potion" },
                    { label: "LocalizedName", type: "cexolocstring", value: "Embedded Potion" },
                    { label: "Tag", type: "cexostring", value: "EMB_POTION" },
                    { label: "BaseItem", type: "dword", value: 49 },
                    {
                      label: "PropertiesList",
                      type: "list",
                      value: [[{ label: "PropertyName", type: "word", value: 15 }]]
                    }
                  ]
                }
              },
              { label: "Repos_PosX", type: "word", value: 7 },
              { label: "Repos_Posy", type: "word", value: 8 },
              { label: "Dropable", type: "byte", value: 1 },
              { label: "Pickpocketable", type: "byte", value: 0 }
            ]
          ]
        },
        {
          label: "Equip_ItemList",
          type: "list",
          value: [
            {
              typeId: 0x10,
              fields: [
                {
                  label: "Item",
                  type: "struct",
                  value: {
                    typeId: 0xffffffff,
                    fields: [
                      { label: "TemplateResRef", type: "resref", value: "emb_sword" },
                      { label: "LocalizedName", type: "cexolocstring", value: "Embedded Sword" },
                      { label: "Tag", type: "cexostring", value: "EMB_SWORD" },
                      { label: "BaseItem", type: "dword", value: 1 }
                    ]
                  }
                },
                { label: "Dropable", type: "byte", value: 0 },
                { label: "Infinite", type: "byte", value: 1 }
              ]
            }
          ]
        }
      ],
      "UTC "
    );

    const parsed = parseTemplateBlueprintFromGff(bytes);

    expect(parsed?.inventoryItemListEntries).toEqual([
      {
        embeddedItem: {
          sourceStructTypeId: 0xffffffff,
          templateResRef: "emb_potion",
          tag: "EMB_POTION",
          localizedName: "Embedded Potion",
          localizedNameStrRef: 0,
          baseItem: 49,
          itemPropertyListCount: 1,
          itemPropertyListEntries: [
            {
              propertyName: 15,
              subtype: undefined,
              costTable: undefined,
              costValue: undefined,
              param1: undefined,
              param1Value: undefined,
              chanceAppear: undefined
            }
          ],
          fieldCount: 5
        },
        x: 7,
        y: 8,
        dropable: true,
        pickpocketable: false,
        infinite: false
      }
    ]);
    expect(parsed?.equipItemListEntries).toEqual([
      {
        embeddedItem: {
          sourceStructTypeId: 0xffffffff,
          templateResRef: "emb_sword",
          tag: "EMB_SWORD",
          localizedName: "Embedded Sword",
          localizedNameStrRef: 0,
          baseItem: 1,
          itemPropertyListCount: undefined,
          fieldCount: 4
        },
        slotMask: 0x10,
        dropable: false,
        pickpocketable: false,
        infinite: true
      }
    ]);
  });

  it("round-trips full embedded item fields through creature inventory and equipment GFF", () => {
    const expectedPropertyEntries = [
      {
        propertyName: 15,
        subtype: 2,
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
    const fullEmbeddedItemInput = {
      sourceStructTypeId: 0xffffffff,
      templateResRef: "emb_armor",
      localizedName: "Embedded Armor",
      localizedNameStrRef: 7001,
      description: "Embedded armor description",
      descriptionStrRef: 7002,
      identifiedDescription: "Identified embedded armor",
      identifiedDescriptionStrRef: 7003,
      comments: "Embedded comment",
      paletteId: 4,
      tag: "EMB_ARMOR",
      plot: true,
      baseItem: 16,
      modelPart1: 66,
      modelPart2: 13,
      modelPart3: 63,
      cost: 19463,
      addCost: 123,
      costTable: 2,
      costValue: 9,
      charges: 7,
      stackSize: 1,
      identified: true,
      stolen: false,
      cursed: true,
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
      itemPropertyListEntries: expectedPropertyEntries,
      scripts: {
        onused: "it_onuse",
        onheartbeat: "it_hb",
        onuserdefined: "it_user",
        oninventorydisturbed: "it_inv"
      }
    };
    const expectedFullEmbeddedItem = {
      ...fullEmbeddedItemInput,
      itemPropertyListCount: 2,
      costTable: undefined,
      costValue: undefined,
      scripts: undefined
    };
    const bytes = serializeCreatureInventoryToUtcGff({
      templateResRef: "cre_full_emb",
      localizedName: "Creature With Full Embedded Item",
      inventoryItemListEntries: [
        {
          embeddedItem: fullEmbeddedItemInput,
          x: 2,
          y: 3,
          dropable: true,
          pickpocketable: false,
          infinite: false
        }
      ],
      equipItemListEntries: [
        {
          embeddedItem: fullEmbeddedItemInput,
          slotMask: 0x10,
          dropable: false,
          pickpocketable: true,
          infinite: true
        }
      ]
    });

    const parsed = parseTemplateBlueprintFromGff(bytes);
    expect(parsed).toMatchObject({
      inventoryItemListCount: 1,
      equipItemListCount: 1
    });
    expect(parsed?.inventoryItemListEntries?.[0]).toMatchObject({
      x: 2,
      y: 3,
      dropable: true,
      pickpocketable: false,
      infinite: false,
      embeddedItem: expectedFullEmbeddedItem
    });
    expect(parsed?.equipItemListEntries?.[0]).toMatchObject({
      slotMask: 0x10,
      dropable: false,
      pickpocketable: true,
      infinite: true,
      embeddedItem: expectedFullEmbeddedItem
    });
    expect(parsed?.inventoryItemListEntries?.[0]?.embeddedItem).toEqual(
      expect.objectContaining({
        bodyPartLFoot: 4,
        bodyPartRShin: 13,
        bodyPartLShin: 13,
        bodyPartLThigh: 3,
        bodyPartRThigh: 3,
        bodyPartPelvis: 8,
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
        bodyPartRobe: 0
      })
    );
    expect(parsed?.equipItemListEntries?.[0]?.embeddedItem).toEqual(
      expect.objectContaining({
        itemPropertyListEntries: expectedPropertyEntries,
        costTable: undefined,
        costValue: undefined,
        scripts: undefined
      })
    );
  });

  it("serializes placeable inventory lists to UTP GFF", () => {
    const bytes = serializePlaceableBlueprintToUtpGff({
      templateResRef: "plc_loot_chest",
      tag: "PLC_LOOT_CHEST",
      localizedName: "Loot Chest",
      comments: "Container inventory",
      plot: false,
      useable: true,
      hasInventory: true,
      appearanceId: 42,
      isStatic: false,
      inventoryItemListEntries: [
        {
          resRef: "nw_it_mpotion001",
          x: 2,
          y: 3,
          dropable: true,
          pickpocketable: false,
          infinite: false
        },
        {
          randomResRef: "rnd_potion",
          randomList: "rl_potions",
          x: 4,
          y: 5,
          dropable: false,
          pickpocketable: true,
          infinite: true
        },
        {
          embeddedItem: {
            sourceStructTypeId: 0xffffffff,
            templateResRef: "emb_chest_gem",
            localizedName: "Embedded Chest Gem",
            tag: "EMB_CHEST_GEM",
            baseItem: 21
          },
          x: 6,
          y: 7,
          dropable: true,
          pickpocketable: false,
          infinite: false
        }
      ]
    });

    const parsed = parseTemplateBlueprintFromGff(bytes);
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      sourceFileType: "UTP ",
      templateResRef: "plc_loot_chest",
      tag: "PLC_LOOT_CHEST",
      localizedName: "Loot Chest",
      comments: "Container inventory",
      plot: false,
      useable: true,
      hasInventory: true,
      appearanceId: 42,
      isStatic: false,
      inventoryItemListCount: 3
    });
    expect(parsed?.inventoryItemListEntries).toEqual([
      {
        resRef: "nw_it_mpotion001",
        x: 2,
        y: 3,
        dropable: true,
        pickpocketable: false,
        infinite: false
      },
      {
        randomResRef: "rnd_potion",
        randomList: "rl_potions",
        x: 4,
        y: 5,
        dropable: false,
        pickpocketable: true,
        infinite: true
      },
      {
        embeddedItem: {
          sourceStructTypeId: 0xffffffff,
          templateResRef: "emb_chest_gem",
          tag: "EMB_CHEST_GEM",
          localizedName: "Embedded Chest Gem",
          baseItem: 21,
          itemPropertyListCount: undefined,
          fieldCount: 4
        },
        x: 6,
        y: 7,
        dropable: true,
        pickpocketable: false,
        infinite: false
      }
    ]);
  });

  it("round-trips full embedded item fields through placeable inventory UTP GFF", () => {
    const expectedPropertyEntries = [
      {
        propertyName: 15,
        subtype: 2,
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
    const fullEmbeddedItemInput = {
      sourceStructTypeId: 0xffffffff,
      templateResRef: "emb_chest_armor",
      localizedName: "Embedded Chest Armor",
      localizedNameStrRef: 7101,
      description: "Chest embedded armor description",
      descriptionStrRef: 7102,
      identifiedDescription: "Identified chest embedded armor",
      identifiedDescriptionStrRef: 7103,
      comments: "Chest embedded comment",
      paletteId: 4,
      tag: "EMB_CHEST_ARMOR",
      plot: true,
      baseItem: 16,
      modelPart1: 66,
      modelPart2: 13,
      modelPart3: 63,
      cost: 19463,
      addCost: 123,
      costTable: 2,
      costValue: 9,
      charges: 7,
      stackSize: 1,
      identified: true,
      stolen: false,
      cursed: true,
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
      itemPropertyListEntries: expectedPropertyEntries,
      scripts: {
        onused: "it_onuse",
        onheartbeat: "it_hb",
        onuserdefined: "it_user",
        oninventorydisturbed: "it_inv"
      }
    };

    const bytes = serializePlaceableBlueprintToUtpGff({
      templateResRef: "plc_full_chest",
      tag: "PLC_FULL_CHEST",
      localizedName: "Full Item Chest",
      hasInventory: true,
      inventoryItemListEntries: [
        {
          embeddedItem: fullEmbeddedItemInput,
          x: 6,
          y: 7,
          dropable: true,
          pickpocketable: false,
          infinite: false
        }
      ]
    });

    const parsed = parseTemplateBlueprintFromGff(bytes);

    expect(parsed).toMatchObject({
      sourceFileType: "UTP ",
      templateResRef: "plc_full_chest",
      inventoryItemListCount: 1
    });
    expect(parsed?.inventoryItemListEntries?.[0]).toMatchObject({
      x: 6,
      y: 7,
      dropable: true,
      pickpocketable: false,
      infinite: false,
      embeddedItem: {
        ...fullEmbeddedItemInput,
        itemPropertyListCount: 2,
        costTable: undefined,
        costValue: undefined,
        scripts: undefined
      }
    });
  });

  it("extracts UTM store buckets and restricted base item lists", () => {
    const bytes = buildGffBuffer(
      [
        { label: "ResRef", type: "resref", value: "test_store" },
        { label: "LocName", type: "cexolocstring", value: "Test Store" },
        { label: "Tag", type: "cexostring", value: "TEST_STORE" },
        { label: "MarkUp", type: "dword", value: 150 },
        { label: "MarkDown", type: "dword", value: 35 },
        { label: "BlackMarket", type: "byte", value: 1 },
        { label: "BM_MarkDown", type: "dword", value: 25 },
        { label: "OnOpenStore", type: "resref", value: "nw_d1_startstore" },
        { label: "ID", type: "dword", value: 77 },
        {
          label: "StoreList",
          type: "list",
          value: [
            {
              typeId: 0,
              fields: [
                {
                  label: "ItemList",
                  type: "list",
                  value: [
                    [
                      { label: "InventoryRes", type: "resref", value: "nw_it_mpotion021" },
                      { label: "Repos_PosX", type: "word", value: 0 },
                      { label: "Repos_Posy", type: "word", value: 1 },
                      { label: "Infinite", type: "byte", value: 1 }
                    ],
                    [
                      { label: "RandomResRef", type: "resref", value: "rnd_store_item" },
                      { label: "RandomList", type: "resref", value: "rl_store_loot" },
                      { label: "Repos_PosX", type: "word", value: 2 },
                      { label: "Repos_Posy", type: "word", value: 3 }
                    ],
                    [
                      {
                        label: "Item",
                        type: "struct",
                        value: {
                          typeId: 0xffffffff,
                          fields: [
                            { label: "TemplateResRef", type: "resref", value: "emb_store_ring" },
                            { label: "LocalizedName", type: "cexolocstring", value: "Embedded Ring" },
                            { label: "Tag", type: "cexostring", value: "EMB_STORE_RING" },
                            { label: "BaseItem", type: "dword", value: 52 }
                          ]
                        }
                      },
                      { label: "Repos_PosX", type: "word", value: 4 },
                      { label: "Repos_Posy", type: "word", value: 5 },
                      { label: "Infinite", type: "byte", value: 1 }
                    ]
                  ]
                }
              ]
            },
            { typeId: 1, fields: [] },
            { typeId: 2, fields: [] },
            { typeId: 3, fields: [] },
            { typeId: 4, fields: [] }
          ]
        },
        {
          label: "WillNotBuy",
          type: "list",
          value: [{ typeId: 0, fields: [{ label: "BaseItem", type: "dword", value: 16 }] }]
        },
        {
          label: "WillOnlyBuy",
          type: "list",
          value: [{ typeId: 0, fields: [{ label: "BaseItem", type: "dword", value: 22 }] }]
        }
      ],
      "UTM "
    );

    const parsed = parseTemplateBlueprintFromGff(bytes);
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      sourceFileType: "UTM ",
      templateResRef: "test_store",
      localizedName: "Test Store",
      tag: "TEST_STORE",
      markUp: 150,
      markDown: 35,
      blackMarket: true,
      bmMarkDown: 25,
      onOpenStore: "nw_d1_startstore",
      storeId: 77,
      storeListCount: 5,
      storeItemListTotal: 3,
      willNotBuyBaseItems: [16],
      willOnlyBuyBaseItems: [22],
      willNotBuyCount: 1,
      willOnlyBuyCount: 1
    });
    expect(parsed?.storeListEntries?.[0]).toMatchObject({
      bucketIndex: 0,
      bucketTypeId: 0,
      itemListCount: 3,
      itemListEntries: [
        {
          resRef: "nw_it_mpotion021",
          x: 0,
          y: 1,
          infinite: true
        },
        {
          randomResRef: "rnd_store_item",
          randomList: "rl_store_loot",
          x: 2,
          y: 3
        },
        {
          embeddedItem: {
            sourceStructTypeId: 0xffffffff,
            templateResRef: "emb_store_ring",
            tag: "EMB_STORE_RING",
            localizedName: "Embedded Ring",
            baseItem: 52,
            itemPropertyListCount: undefined,
            fieldCount: 4
          },
          x: 4,
          y: 5,
          infinite: true
        }
      ]
    });
  });

  it("serializes store blueprints to UTM GFF and round-trips through the parser", () => {
    const bytes = serializeStoreBlueprintToUtmGff({
      resRef: "wiz_store_01",
      localizedName: "Wizard Store",
      tag: "WIZ_STORE_01",
      comments: "Created by Aurora Web store wizard",
      markUp: 125,
      markDown: 55,
      blackMarket: true,
      bmMarkDown: 40,
      onOpenStore: "wiz_open_store",
      storeId: 12,
      storeListEntries: [
        {
          itemListEntries: [
            {
              resRef: "nw_it_mpotion021",
              x: 0,
              y: 0,
              infinite: true
            }
          ]
        },
        {
          itemListEntries: [
            {
              randomResRef: "rnd_store_weapon",
              randomList: "rl_store_weapons",
              x: 1,
              y: 2,
              infinite: false
            },
            {
              embeddedItem: {
                sourceStructTypeId: 0xffffffff,
                templateResRef: "emb_store_ring",
                localizedName: "Embedded Store Ring",
                tag: "EMB_STORE_RING",
                baseItem: 52
              },
              x: 3,
              y: 4,
              infinite: true
            }
          ]
        }
      ],
      willNotBuyBaseItems: [16, 22],
      willOnlyBuyBaseItems: [5]
    });

    expect(bytes.toString("ascii", 0, 4)).toBe("UTM ");
    expect(bytes.toString("ascii", 4, 8)).toBe("V3.2");

    const parsed = parseTemplateBlueprintFromGff(bytes);

    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      sourceFileType: "UTM ",
      sourceFileVersion: "V3.2",
      templateResRef: "wiz_store_01",
      localizedName: "Wizard Store",
      tag: "WIZ_STORE_01",
      comments: "Created by Aurora Web store wizard",
      markUp: 125,
      markDown: 55,
      blackMarket: true,
      bmMarkDown: 40,
      onOpenStore: "wiz_open_store",
      storeId: 12,
      storeListCount: 5,
      storeItemListTotal: 3,
      willNotBuyBaseItems: [16, 22],
      willOnlyBuyBaseItems: [5]
    });
    expect(parsed?.storeListEntries).toEqual([
      {
        bucketIndex: 0,
        bucketTypeId: 0,
        itemListCount: 1,
        itemListEntries: [{ resRef: "nw_it_mpotion021", x: 0, y: 0, infinite: true }]
      },
      {
        bucketIndex: 1,
        bucketTypeId: 4,
        itemListCount: 2,
        itemListEntries: [
          {
            randomResRef: "rnd_store_weapon",
            randomList: "rl_store_weapons",
            x: 1,
            y: 2,
            infinite: false
          },
          {
            embeddedItem: expect.objectContaining({
              sourceStructTypeId: 0xffffffff,
              templateResRef: "emb_store_ring",
              tag: "EMB_STORE_RING",
              localizedName: "Embedded Store Ring",
              baseItem: 52,
              itemPropertyListCount: undefined,
              fieldCount: 4
            }),
            x: 3,
            y: 4,
            infinite: true
          }
        ]
      },
      { bucketIndex: 2, bucketTypeId: 2, itemListCount: 0, itemListEntries: [] },
      { bucketIndex: 3, bucketTypeId: 3, itemListCount: 0, itemListEntries: [] },
      { bucketIndex: 4, bucketTypeId: 1, itemListCount: 0, itemListEntries: [] }
    ]);
  });

  it("round-trips full embedded item fields through store UTM StoreList", () => {
    const bytes = serializeStoreBlueprintToUtmGff({
      resRef: "full_emb_store",
      localizedName: "Full Embedded Store",
      storeListEntries: [
        {
          itemListEntries: [
            {
              embeddedItem: {
                sourceStructTypeId: 0xffffffff,
                templateResRef: "emb_store_arm",
                localizedName: "Embedded Store Armor",
                localizedNameStrRef: 8101,
                description: "Store embedded armor description",
                descriptionStrRef: 8102,
                identifiedDescription: "Identified store embedded armor",
                identifiedDescriptionStrRef: 8103,
                comments: "Store embedded item comment",
                paletteId: 2,
                tag: "EMB_STORE_ARM",
                plot: true,
                baseItem: 16,
                modelPart1: 66,
                modelPart2: 13,
                modelPart3: 63,
                cost: 19463,
                addCost: 321,
                costTable: 4,
                costValue: 11,
                charges: 3,
                stackSize: 1,
                identified: true,
                stolen: false,
                cursed: true,
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
                itemPropertyListEntries: [
                  {
                    propertyName: 15,
                    subtype: 2,
                    costTable: 3,
                    costValue: 13,
                    param1: 255,
                    param1Value: 0,
                    chanceAppear: 100
                  }
                ],
                scripts: {
                  onheartbeat: "st_hb",
                  oninventorydisturbed: "st_inv"
                }
              },
              x: 6,
              y: 7,
              infinite: true
            }
          ]
        }
      ]
    });

    const parsed = parseTemplateBlueprintFromGff(bytes);
    expect(parsed?.storeListEntries?.[0]?.itemListEntries[0]).toMatchObject({
      x: 6,
      y: 7,
      infinite: true,
      embeddedItem: {
        templateResRef: "emb_store_arm",
        localizedName: "Embedded Store Armor",
        localizedNameStrRef: 8101,
        description: "Store embedded armor description",
        descriptionStrRef: 8102,
        identifiedDescription: "Identified store embedded armor",
        identifiedDescriptionStrRef: 8103,
        comments: "Store embedded item comment",
        paletteId: 2,
        tag: "EMB_STORE_ARM",
        plot: true,
        baseItem: 16,
        modelPart1: 66,
        modelPart2: 13,
        modelPart3: 63,
        cost: 19463,
        addCost: 321,
        costTable: undefined,
        costValue: undefined,
        charges: 3,
        stackSize: 1,
        identified: true,
        stolen: false,
        cursed: true,
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
        itemPropertyListCount: 1,
        itemPropertyListEntries: [
          {
            propertyName: 15,
            subtype: 2,
            costTable: 3,
            costValue: 13,
            param1: 255,
            param1Value: 0,
            chanceAppear: 100
          }
        ],
        scripts: undefined
      }
    });
  });

  it("matches the local retail UTM aggregate when the decompilation extract is present", () => {
    const retailUtmDir = "C:\\Projects\\New Folder\\item-retail-extract\\utm";
    if (!existsSync(retailUtmDir)) {
      return;
    }

    const parsedStores = readdirSync(retailUtmDir)
      .filter((fileName) => fileName.toLowerCase().endsWith(".utm"))
      .map((fileName) => ({
        fileName,
        parsed: parseTemplateBlueprintFromGff(readFileSync(join(retailUtmDir, fileName)))
      }));

    expect(parsedStores).toHaveLength(42);
    expect(parsedStores.every((entry) => entry.parsed?.sourceFileType === "UTM ")).toBe(true);
    expect(
      parsedStores.reduce((sum, entry) => sum + (entry.parsed?.storeListCount ?? 0), 0)
    ).toBe(210);
    expect(
      parsedStores.reduce((sum, entry) => sum + (entry.parsed?.storeItemListTotal ?? 0), 0)
    ).toBe(4597);
    expect(
      Math.max(
        ...parsedStores.flatMap((entry) =>
          entry.parsed?.storeListEntries?.map((bucket) => bucket.itemListCount) ?? []
        )
      )
    ).toBe(136);

    const magicStore = parsedStores.find((entry) => entry.fileName === "nw_storemagic001.utm")
      ?.parsed;
    expect(magicStore).toMatchObject({
      tag: "NW_STOREMAGIC001",
      markUp: 150,
      markDown: 35,
      blackMarket: false,
      bmMarkDown: 25,
      onOpenStore: "nw_d1_startstore",
      storeListCount: 5,
      storeItemListTotal: 86
    });
    expect(magicStore?.storeListEntries?.[0]?.itemListEntries[0]).toMatchObject({
      resRef: "nw_cloth012",
      x: 0,
      y: 0
    });
  });

  it("extracts encounter runtime fields and creature list from UTE", () => {
    const bytes = buildGffBuffer(
      [
        { label: "TemplateResRef", type: "resref", value: "enc_forest_ambush_01" },
        { label: "LocalizedName", type: "cexolocstring", value: "Forest Ambush" },
        { label: "Tag", type: "cexostring", value: "enc_forest_ambush_tag" },
        { label: "Description", type: "cexolocstring", value: "Hidden ambush trigger" },
        { label: "Active", type: "byte", value: 1 },
        { label: "Difficulty", type: "dword", value: 2 },
        { label: "DifficultyIndex", type: "dword", value: 1 },
        { label: "Faction", type: "dword", value: 5 },
        { label: "MaxCreatures", type: "dword", value: 6 },
        { label: "PlayerOnly", type: "byte", value: 1 },
        { label: "RecCreatures", type: "dword", value: 3 },
        { label: "Reset", type: "byte", value: 1 },
        { label: "ResetTime", type: "dword", value: 120 },
        { label: "Respawns", type: "dword", value: 2 },
        { label: "SpawnOption", type: "dword", value: 1 },
        { label: "OnEntered", type: "resref", value: "enc_enter" },
        { label: "OnExit", type: "resref", value: "enc_exit" },
        { label: "OnExhausted", type: "resref", value: "enc_empty" },
        { label: "OnHeartbeat", type: "resref", value: "enc_heartbeat" },
        { label: "OnUserDefined", type: "resref", value: "enc_user" },
        {
          label: "CreatureList",
          type: "list",
          value: [
            [
              { label: "ResRef", type: "resref", value: "nw_wolf001" },
              { label: "Appearance", type: "dword", value: 11 },
              { label: "CR", type: "float", value: 1.5 },
              { label: "SingleSpawn", type: "byte", value: 0 }
            ],
            [
              { label: "ResRef", type: "resref", value: "nw_bandit001" },
              { label: "Appearance", type: "dword", value: 22 },
              { label: "CR", type: "float", value: 2.25 },
              { label: "SingleSpawn", type: "byte", value: 1 }
            ]
          ]
        }
      ],
      "UTE "
    );

    const parsed = parseTemplateBlueprintFromGff(bytes);

    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      sourceFileType: "UTE ",
      templateResRef: "enc_forest_ambush_01",
      localizedName: "Forest Ambush",
      displayName: "Forest Ambush",
      tag: "enc_forest_ambush_tag",
      description: "Hidden ambush trigger",
      active: true,
      difficulty: 2,
      difficultyIndex: 1,
      factionId: 5,
      maxCreatures: 6,
      playerOnly: true,
      recCreatures: 3,
      reset: true,
      resetTime: 120,
      respawns: 2,
      spawnOption: 1,
      encounterCreatureListCount: 2
    });
    expect(parsed?.encounterCreatureListEntries).toEqual([
      {
        resRef: "nw_wolf001",
        appearance: 11,
        challengeRating: 1.5,
        singleSpawn: false
      },
      {
        resRef: "nw_bandit001",
        appearance: 22,
        challengeRating: 2.25,
        singleSpawn: true
      }
    ]);
    expect(parsed?.scripts).toMatchObject({
      onentered: "enc_enter",
      onexit: "enc_exit",
      onexhausted: "enc_empty",
      onheartbeat: "enc_heartbeat",
      onuserdefined: "enc_user"
    });
    expect(parsed?.dependencyRefs).toEqual(
      expect.arrayContaining([
        "nw_wolf001",
        "nw_bandit001",
        "enc_enter",
        "enc_exit",
        "enc_forest_ambush_01",
        "enc_forest_ambush_tag"
      ])
    );
  });

  it("extracts creature visual body/color fields and equip list count", () => {
    const bytes = buildGffBuffer(
      [
        { label: "TemplateResRef", type: "resref", value: "cre_drow_scout_01" },
        { label: "FirstName", type: "cexolocstring", value: "Drow" },
        { label: "LastName", type: "cexolocstring", value: "Scout" },
        { label: "Subrace", type: "cexolocstring", value: "Udadrow" },
        { label: "Deity", type: "cexolocstring", value: "Lolth" },
        { label: "Appearance_Head", type: "dword", value: 22 },
        { label: "BodyPart_RFoot", type: "dword", value: 1 },
        { label: "BodyPart_LFoot", type: "dword", value: 2 },
        { label: "BodyPart_RShin", type: "dword", value: 3 },
        { label: "BodyPart_LShin", type: "dword", value: 4 },
        { label: "BodyPart_LThigh", type: "dword", value: 5 },
        { label: "BodyPart_RThigh", type: "dword", value: 6 },
        { label: "BodyPart_Pelvis", type: "dword", value: 7 },
        { label: "BodyPart_Torso", type: "dword", value: 8 },
        { label: "BodyPart_Belt", type: "dword", value: 9 },
        { label: "BodyPart_Neck", type: "dword", value: 10 },
        { label: "BodyPart_RFArm", type: "dword", value: 11 },
        { label: "BodyPart_LFArm", type: "dword", value: 12 },
        { label: "BodyPart_RBicep", type: "dword", value: 13 },
        { label: "BodyPart_LBicep", type: "dword", value: 14 },
        { label: "BodyPart_RShoul", type: "dword", value: 15 },
        { label: "BodyPart_LShoul", type: "dword", value: 16 },
        { label: "BodyPart_RHand", type: "dword", value: 17 },
        { label: "BodyPart_LHand", type: "dword", value: 18 },
        { label: "BodyPart_Robe", type: "dword", value: 19 },
        { label: "Color_Skin", type: "dword", value: 20 },
        { label: "Color_Hair", type: "dword", value: 21 },
        { label: "Color_Tattoo1", type: "dword", value: 22 },
        { label: "Color_Tattoo2", type: "dword", value: 23 },
        { label: "Wings", type: "byte", value: 24 },
        { label: "Tail", type: "byte", value: 25 },
        { label: "Equip_ItemList", type: "list", value: 4 }
      ],
      "UTC "
    );

    const parsed = parseTemplateBlueprintFromGff(bytes);
    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      firstName: "Drow",
      lastName: "Scout",
      displayName: "Drow Scout",
      subrace: "Udadrow",
      deity: "Lolth",
      appearanceHead: 22,
      bodyPartRFoot: 1,
      bodyPartLFoot: 2,
      bodyPartRShin: 3,
      bodyPartLShin: 4,
      bodyPartLThigh: 5,
      bodyPartRThigh: 6,
      bodyPartPelvis: 7,
      bodyPartTorso: 8,
      bodyPartBelt: 9,
      bodyPartNeck: 10,
      bodyPartRFArm: 11,
      bodyPartLFArm: 12,
      bodyPartRBicep: 13,
      bodyPartLBicep: 14,
      bodyPartRShoul: 15,
      bodyPartLShoul: 16,
      bodyPartRHand: 17,
      bodyPartLHand: 18,
      colorSkin: 20,
      colorHair: 21,
      colorTattoo1: 22,
      colorTattoo2: 23,
      wingsNew: 24,
      tailNew: 25,
      equipItemListCount: 4
    });
    expect(parsed).not.toHaveProperty("bodyPartRobe");
  });

  it("extracts creature class, feat and special ability list entries", () => {
    const bytes = buildGffBuffer(
      [
        { label: "TemplateResRef", type: "resref", value: "cre_spellblade_01" },
        {
          label: "ClassList",
          type: "list",
          value: [
            [
              { label: "Class", type: "dword", value: 1 },
              { label: "ClassLevel", type: "short", value: 7 },
              {
                label: "KnownList",
                type: "list",
                value: [
                  [
                    { label: "Spell", type: "word", value: 501 },
                    { label: "SpellMetaMagic", type: "byte", value: 2 },
                    { label: "SpellFlags", type: "byte", value: 1 }
                  ],
                  [{ label: "Spell", type: "word", value: 502 }],
                  []
                ]
              },
              {
                label: "KnownList2",
                type: "list",
                value: [
                  [
                    { label: "Spell", type: "word", value: 503 },
                    { label: "SpellMetaMagic", type: "byte", value: 1 },
                    { label: "SpellFlags", type: "byte", value: 0 }
                  ]
                ]
              },
              {
                label: "MemorizedList",
                type: "list",
                value: [
                  [
                    { label: "Spell", type: "word", value: 601 },
                    { label: "SpellMetaMagic", type: "byte", value: 4 },
                    { label: "SpellFlags", type: "byte", value: 3 }
                  ],
                  []
                ]
              },
              {
                label: "MemorizedList3",
                type: "list",
                value: [[{ label: "Spell", type: "word", value: 602 }]]
              }
            ],
            [
              { label: "Class", type: "dword", value: 9 },
              { label: "ClassLevel", type: "short", value: 3 }
            ],
            []
          ]
        },
        {
          label: "FeatList",
          type: "list",
          value: [
            [{ label: "Feat", type: "word", value: 42 }],
            [{ label: "Feat", type: "word", value: 99 }],
            []
          ]
        },
        {
          label: "SpecAbilityList",
          type: "list",
          value: [
            [
              { label: "Spell", type: "word", value: 123 },
              { label: "SpellFlags", type: "byte", value: 4 },
              { label: "SpellCasterLevel", type: "byte", value: 22 }
            ],
            []
          ]
        },
        {
          label: "TemplateList",
          type: "list",
          value: [[{ label: "TemplateID", type: "word", value: 77 }], []]
        },
        {
          label: "ItemList",
          type: "list",
          value: [
            [
              { label: "InventoryRes", type: "resref", value: "nw_it_mpotion001" },
              { label: "Repos_PosX", type: "word", value: 3 },
              { label: "Repos_Posy", type: "word", value: 4 },
              { label: "Dropable", type: "byte", value: 1 },
              { label: "Pickpocketable", type: "byte", value: 1 }
            ],
            []
          ]
        },
        {
          label: "SkillList",
          type: "list",
          value: [
            [{ label: "Rank", type: "byte", value: 4 }],
            [{ label: "Rank", type: "byte", value: 0 }]
          ]
        },
        {
          label: "Equip_ItemList",
          type: "list",
          value: [
            {
              typeId: 0x10,
              fields: [
                { label: "EquippedRes", type: "resref", value: "nw_wswmls001" },
                { label: "Dropable", type: "byte", value: 1 },
                { label: "Infinite", type: "byte", value: 0 }
              ]
            },
            []
          ]
        }
      ],
      "UTC "
    );

    const parsed = parseTemplateBlueprintFromGff(bytes);
    expect(parsed).not.toBeNull();
    expect(parsed?.classListCount).toBe(3);
    expect(parsed?.classListEntries).toEqual([
      {
        classId: 1,
        level: 7,
        knownSpellCount: 4,
        memorizedSpellCount: 3,
        knownSpells: [
          { spellId: 501, metaMagic: 2, flags: 1 },
          { spellId: 502, metaMagic: 0, flags: 1 },
          { spellId: 0, metaMagic: 0, flags: 1 },
          { spellId: 503, spellLevel: 2, metaMagic: 1, flags: 1 }
        ],
        memorizedSpells: [
          { spellId: 601, metaMagic: 4, flags: 3 },
          { spellId: 0, metaMagic: 0, flags: 1 },
          { spellId: 602, spellLevel: 3, metaMagic: 0, flags: 1 }
        ]
      },
      { classId: 9, level: 3, knownSpellCount: undefined, memorizedSpellCount: undefined },
      { classId: 0, level: 0, knownSpellCount: undefined, memorizedSpellCount: undefined }
    ]);
    expect(parsed?.featListEntries).toEqual([{ featId: 42 }, { featId: 99 }, { featId: 0 }]);
    expect(parsed?.specAbilityListEntries).toEqual([
      { spellId: 123, flags: 5, casterLevel: 15 },
      { spellId: 0, flags: 1, casterLevel: 1 }
    ]);
    expect(parsed?.templateListEntries).toEqual([{ templateId: 77 }, { templateId: 0 }]);
    expect(parsed?.skillListCount).toBe(2);
    expect(parsed?.skillListEntries).toHaveLength(28);
    expect(parsed?.skillListEntries?.slice(0, 3)).toEqual([
      { rank: 4 },
      { rank: 0 },
      { rank: 0 }
    ]);
    expect(parsed?.inventoryItemListEntries).toEqual([
      {
        resRef: "nw_it_mpotion001",
        x: 3,
        y: 4,
        dropable: true,
        pickpocketable: true,
        infinite: false
      }
    ]);
    expect(parsed?.equipItemListEntries).toEqual([
      {
        resRef: "nw_wswmls001",
        slotMask: 0x10,
        dropable: true,
        pickpocketable: false,
        infinite: false
      }
    ]);
  });

  it("returns null for invalid payload", () => {
    expect(parseTemplateBlueprintFromGff(Buffer.from([0x01, 0x02, 0x03]))).toBeNull();
  });

  it("parses empty and single-field root structs", () => {
    const emptyBytes = buildGffBuffer([]);
    const parsedEmpty = parseTemplateBlueprintFromGff(emptyBytes);

    expect(parsedEmpty).not.toBeNull();
    expect(parsedEmpty?.dependencyFingerprint).toBe("none");
    expect(parsedEmpty?.dependencyRefs).toEqual([]);

    const singleFieldBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_single" }
    ]);
    const parsedSingle = parseTemplateBlueprintFromGff(singleFieldBytes);

    expect(parsedSingle?.templateResRef).toBe("plc_single");
  });

  it("returns null for missing structs, invalid ranges and broken field-index tables", () => {
    const base = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_base" },
      { label: "LocName", type: "cexolocstring", value: "Base Name" }
    ]);

    const noStructs = Buffer.from(base);
    noStructs.writeUInt32LE(0, 12);
    expect(parseTemplateBlueprintFromGff(noStructs)).toBeNull();

    const invalidFieldIndices = Buffer.from(base);
    invalidFieldIndices.writeUInt32LE(0xfffffff0, HEADER_SIZE + 4);
    expect(parseTemplateBlueprintFromGff(invalidFieldIndices)).toBeNull();

    const invalidHeaderRange = Buffer.from(base);
    invalidHeaderRange.writeUInt32LE(0xfffffff0, 36);
    expect(parseTemplateBlueprintFromGff(invalidHeaderRange)).toBeNull();
  });

  it("parses word/float fields and skips unsupported or empty script fields", () => {
    const bytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "vvx_dup_anchor" },
      { label: "LocName", type: "cexostring", value: "   " },
      { label: "DisplayName", type: "cexolocstring", value: "Fallback Display Name" },
      { label: "Race", type: "word", value: 65530 },
      { label: "ChallengeRating", type: "float", value: 1.5 },
      { label: "OnUsed", type: "resref", value: "" },
      { label: "ModelName", type: "resref", value: "dup_ref" },
      { label: "Conversation", type: "resref", value: "dup_ref" },
      { label: "UnknownField", type: "unknown", value: 123 },
      { label: "   ", type: "dword", value: 77 }
    ]);

    writeFieldIndex(bytes, 0, 999_999);

    const parsed = parseTemplateBlueprintFromGff(bytes);
    expect(parsed).not.toBeNull();
    expect(parsed?.displayName).toBe("Fallback Display Name");
    expect(parsed?.race).toBe(65530);
    expect(parsed?.challengeRating).toBeCloseTo(1.5);
    expect(parsed?.scripts).not.toHaveProperty("onused");
    expect(parsed?.dependencyRefs.filter((value) => value === "dup_ref")).toHaveLength(1);
  });

  it("ignores malformed string, resref, locstring and list payloads", () => {
    const baseFields: SupportedField[] = [
      { label: "TemplateResRef", type: "resref", value: "plc_valid_ref" },
      { label: "Description", type: "cexostring", value: "Valid Description" },
      { label: "LocName", type: "cexolocstring", value: "Visible Name" },
      { label: "ClassList", type: "list", value: 2 }
    ];

    const outOfRangeString = buildGffBuffer(baseFields);
    writeFieldDataOffset(outOfRangeString, 1, 0xfffffff0);
    expect(parseTemplateBlueprintFromGff(outOfRangeString)?.description).toBeUndefined();

    const truncatedString = buildGffBuffer(baseFields);
    const descriptionOffset = getFieldDataAbsoluteOffset(truncatedString, 1);
    truncatedString.writeUInt32LE(0xfffffff0, descriptionOffset);
    expect(parseTemplateBlueprintFromGff(truncatedString)?.description).toBeUndefined();

    const outOfRangeResref = buildGffBuffer(baseFields);
    writeFieldDataOffset(outOfRangeResref, 0, 0xfffffff0);
    expect(parseTemplateBlueprintFromGff(outOfRangeResref)?.templateResRef).toBeUndefined();

    const truncatedResref = buildGffBuffer(baseFields);
    const resrefOffset = getFieldDataAbsoluteOffset(truncatedResref, 0);
    truncatedResref.writeUInt8(250, resrefOffset);
    expect(parseTemplateBlueprintFromGff(truncatedResref)?.templateResRef).toBeUndefined();

    const outOfRangeLocString = buildGffBuffer(baseFields);
    writeFieldDataOffset(outOfRangeLocString, 2, 0xfffffff0);
    expect(parseTemplateBlueprintFromGff(outOfRangeLocString)?.displayName).toBeUndefined();

    const truncatedLocTotalSize = buildGffBuffer(baseFields);
    const locOffset = getFieldDataAbsoluteOffset(truncatedLocTotalSize, 2);
    truncatedLocTotalSize.writeUInt32LE(0xfffffff0, locOffset);
    expect(parseTemplateBlueprintFromGff(truncatedLocTotalSize)?.displayName).toBeUndefined();

    const brokenLocCursor = buildGffBuffer(baseFields);
    const locCursorOffset = getFieldDataAbsoluteOffset(brokenLocCursor, 2);
    brokenLocCursor.writeUInt32LE(2, locCursorOffset + 8);
    expect(parseTemplateBlueprintFromGff(brokenLocCursor)?.displayName).toBe("Visible Name");

    const brokenLocTextLength = buildGffBuffer(baseFields);
    const locTextLengthOffset = getFieldDataAbsoluteOffset(brokenLocTextLength, 2);
    brokenLocTextLength.writeUInt32LE(0xfffffff0, locTextLengthOffset + 16);
    expect(parseTemplateBlueprintFromGff(brokenLocTextLength)?.displayName).toBeUndefined();

    const outOfRangeList = buildGffBuffer(baseFields);
    writeFieldDataOffset(outOfRangeList, 3, 0xfffffff0);
    expect(parseTemplateBlueprintFromGff(outOfRangeList)?.classListCount).toBeUndefined();

    const brokenListBody = buildGffBuffer(baseFields);
    const listOffset = getListDataAbsoluteOffset(brokenListBody, 3);
    brokenListBody.writeUInt32LE(0xfffffff0, listOffset);
    expect(parseTemplateBlueprintFromGff(brokenListBody)?.classListCount).toBeUndefined();
  });

  it("defensively handles non-standard buffer inputs", () => {
    const nonFiniteHeader = createFakeHeaderBuffer((offset) => {
      if (offset === 8) {
        return Number.NaN;
      }
      return 0;
    });
    expect(parseTemplateBlueprintFromGff(nonFiniteHeader)).toBeNull();

    const negativeLengthHeader = createFakeHeaderBuffer((offset) => {
      if (offset === 36) {
        return -1;
      }
      return 0;
    });
    expect(parseTemplateBlueprintFromGff(negativeLengthHeader)).toBeNull();

    const offsetBeyondBufferHeader = createFakeHeaderBuffer((offset) => {
      if (offset === 8) {
        return HEADER_SIZE + 1;
      }
      return 0;
    });
    expect(parseTemplateBlueprintFromGff(offsetBeyondBufferHeader)).toBeNull();

    const overflowingRangeHeader = createFakeHeaderBuffer((offset) => {
      if (offset === 8) {
        return 50;
      }
      if (offset === 12) {
        return 1;
      }
      return 0;
    });
    expect(parseTemplateBlueprintFromGff(overflowingRangeHeader)).toBeNull();

    const throwingReaderHeader = createFakeHeaderBuffer(() => {
      throw new Error("synthetic parser failure");
    });
    expect(parseTemplateBlueprintFromGff(throwingReaderHeader)).toBeNull();
  });

  it("detects VFX evidence from template resref and handles truncated locstring cursor scans", () => {
    const vfxTemplateBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "vvx_magic_burst" }
    ]);
    const parsedVfx = parseTemplateBlueprintFromGff(vfxTemplateBytes);
    expect(parsedVfx?.vfxEvidence).toContain("templateResRef");

    const locOnlyBytes = buildGffBuffer([
      { label: "LocName", type: "cexolocstring", value: "CursorBreak" }
    ]);
    const locOffset = getFieldDataAbsoluteOffset(locOnlyBytes, 0);
    locOnlyBytes.writeUInt32LE(2, locOffset + 8);
    const parsedLocOnly = parseTemplateBlueprintFromGff(locOnlyBytes);
    expect(parsedLocOnly?.displayName).toBe("CursorBreak");
  });

  it("preserves unknown UTC GFF fields while replacing Aurora VarTable entries", () => {
    const source = buildSerializableGffBuffer(
      [
        { label: "TemplateResRef", type: "resref", value: "cre_preserve" },
        { label: "Legacy64", type: "dword64", value: 0x1020304050607080n },
        { label: "LegacyBlob", type: "void", value: Buffer.from([1, 2, 3, 4]) },
        {
          label: "VarTable",
          type: "list",
          value: [
            {
              typeId: 0,
              fields: [
                { label: "Name", type: "cexostring", value: "OldValue" },
                { label: "Type", type: "int", value: 1 },
                { label: "Value", type: "int", value: 7 }
              ]
            }
          ]
        }
      ],
      "UTC ",
      0x42
    );
    const rawSource = parseRawGffDocument(source);
    expect(rawSource).not.toBeNull();

    const written = serializeCreatureBlueprintToUtcGff(
      {
        templateResRef: "cre_preserve",
        firstName: "Preserved Creature",
        variableListEntries: [
          { name: "HitCounter", type: "int", value: 12 },
          { name: "Scale", type: "float", value: 1.25 },
          { name: "Greeting", type: "string", value: "hello" }
        ]
      },
      {
        preservedFields: rawSource!.fields,
        rootStructTypeId: rawSource!.rootStructTypeId
      }
    );
    const rawWritten = parseRawGffDocument(written);
    const parsedWritten = parseTemplateBlueprintFromGff(written);
    const legacy64 = rawWritten?.fields.find((field) => field.label === "Legacy64");
    const legacyBlob = rawWritten?.fields.find((field) => field.label === "LegacyBlob");

    expect(rawWritten?.rootStructTypeId).toBe(0x42);
    expect(legacy64).toEqual({ label: "Legacy64", type: "dword64", value: 0x1020304050607080n });
    expect(legacyBlob).toMatchObject({ label: "LegacyBlob", type: "void" });
    expect(legacyBlob?.type === "void" && legacyBlob.value.equals(Buffer.from([1, 2, 3, 4]))).toBe(
      true
    );
    expect(parsedWritten?.variableListEntries).toEqual([
      { name: "HitCounter", type: "int", value: 12 },
      { name: "Scale", type: "float", value: 1.25 },
      { name: "Greeting", type: "string", value: "hello" }
    ]);
  });
});

function buildGffBuffer(fields: SupportedField[], fileType = "UTP "): Buffer {
  const uniqueLabels = [...new Set(collectFieldLabels(fields))];
  const labelIndexByName = new Map(uniqueLabels.map((label, index) => [label, index]));

  const fieldDataChunks: Buffer[] = [];
  const listIndicesChunks: Buffer[] = [];
  const fieldIndicesChunks: Buffer[] = [];
  const structEntries: Array<{ typeId: number; dataOrOffset: number; fieldCount: number }> = [];
  const fieldEntries: Array<{ typeId: number; labelIndex: number; dataOrOffset: number }> = [];

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

  const pushFieldIndicesData = (indices: number[]): number => {
    const payload = Buffer.alloc(indices.length * 4);
    indices.forEach((fieldIndex, index) => {
      payload.writeUInt32LE(fieldIndex, index * 4);
    });
    const offset = fieldIndicesChunks.reduce((sum, entry) => sum + entry.length, 0);
    fieldIndicesChunks.push(payload);
    return offset;
  };

  const addStruct = (structFields: SupportedField[], typeId = 1): number => {
    const structIndex = structEntries.length;
    structEntries.push({
      typeId,
      dataOrOffset: 0,
      fieldCount: 0
    });
    const fieldIndices = structFields.map((field) => addField(field));
    structEntries[structIndex] = {
      typeId,
      dataOrOffset:
        fieldIndices.length <= 1 ? fieldIndices[0] ?? 0 : pushFieldIndicesData(fieldIndices),
      fieldCount: fieldIndices.length
    };
    return structIndex;
  };

  const addField = (field: SupportedField): number => {
    const labelIndex = labelIndexByName.get(field.label);
    if (labelIndex === undefined) {
      throw new Error(`Unknown label index for ${field.label}`);
    }

    if (field.type === "byte") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.BYTE,
        labelIndex,
        dataOrOffset: field.value & 0xff
      });
    }

    if (field.type === "word") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.WORD,
        labelIndex,
        dataOrOffset: field.value & 0xffff
      });
    }

    if (field.type === "short") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.SHORT,
        labelIndex,
        dataOrOffset: field.value & 0xffff
      });
    }

    if (field.type === "dword") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.DWORD,
        labelIndex,
        dataOrOffset: field.value >>> 0
      });
    }

    if (field.type === "int") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.INT,
        labelIndex,
        dataOrOffset: field.value >>> 0
      });
    }

    if (field.type === "float") {
      const inline = Buffer.allocUnsafe(4);
      inline.writeFloatLE(field.value, 0);
      return pushFieldEntry({
        typeId: FIELD_TYPE.FLOAT,
        labelIndex,
        dataOrOffset: inline.readUInt32LE(0)
      });
    }

    if (field.type === "cexostring") {
      const valueBytes = Buffer.from(field.value, "utf-8");
      const payload = Buffer.alloc(4 + valueBytes.length);
      payload.writeUInt32LE(valueBytes.length, 0);
      valueBytes.copy(payload, 4);
      return pushFieldEntry({
        typeId: FIELD_TYPE.CEXOSTRING,
        labelIndex,
        dataOrOffset: pushFieldData(payload)
      });
    }

    if (field.type === "resref") {
      const valueBytes = Buffer.from(field.value, "ascii");
      const payload = Buffer.alloc(1 + valueBytes.length);
      payload.writeUInt8(valueBytes.length, 0);
      valueBytes.copy(payload, 1);
      return pushFieldEntry({
        typeId: FIELD_TYPE.RESREF,
        labelIndex,
        dataOrOffset: pushFieldData(payload)
      });
    }

    if (field.type === "list") {
      const childStructIndices = Array.isArray(field.value)
        ? field.value.map((entry) =>
            Array.isArray(entry)
              ? addStruct(entry, 0)
              : addStruct(entry.fields, entry.typeId)
          )
        : Array.from({ length: field.value }, () => 0xffffffff);
      const payload = Buffer.alloc(4 + childStructIndices.length * 4);
      payload.writeUInt32LE(childStructIndices.length, 0);
      childStructIndices.forEach((structIndex, index) => {
        payload.writeUInt32LE(structIndex >>> 0, 4 + index * 4);
      });
      return pushFieldEntry({
        typeId: FIELD_TYPE.LIST,
        labelIndex,
        dataOrOffset: pushListIndicesData(payload)
      });
    }

    if (field.type === "struct") {
      return pushFieldEntry({
        typeId: FIELD_TYPE.STRUCT,
        labelIndex,
        dataOrOffset: addStruct(field.value.fields, field.value.typeId)
      });
    }

    if (field.type === "unknown") {
      return pushFieldEntry({
        typeId: 255,
        labelIndex,
        dataOrOffset: field.value >>> 0
      });
    }

    const valueBytes = Buffer.from(field.value, "utf-8");
    const entryPayload = Buffer.alloc(8 + valueBytes.length);
    entryPayload.writeUInt32LE(0, 0); // language id
    entryPayload.writeUInt32LE(valueBytes.length, 4);
    valueBytes.copy(entryPayload, 8);

    const locPayload = Buffer.alloc(12 + entryPayload.length);
    const totalSize = 8 + entryPayload.length;
    locPayload.writeUInt32LE(totalSize, 0);
    locPayload.writeUInt32LE(0, 4); // strRef
    locPayload.writeUInt32LE(1, 8); // string count
    entryPayload.copy(locPayload, 12);

    return pushFieldEntry({
      typeId: FIELD_TYPE.CEXOLOCSTRING,
      labelIndex,
      dataOrOffset: pushFieldData(locPayload)
    });
  };

  const pushFieldEntry = (entry: {
    typeId: number;
    labelIndex: number;
    dataOrOffset: number;
  }): number => {
    const index = fieldEntries.length;
    fieldEntries.push(entry);
    return index;
  };

  addStruct(fields, 1);

  const fieldData = Buffer.concat(fieldDataChunks);
  const listIndices = Buffer.concat(listIndicesChunks);
  const fieldIndices = Buffer.concat(fieldIndicesChunks);

  const structTable = Buffer.alloc(structEntries.length * STRUCT_ENTRY_SIZE);
  structEntries.forEach((entry, index) => {
    const offset = index * STRUCT_ENTRY_SIZE;
    structTable.writeUInt32LE(entry.typeId, offset);
    structTable.writeUInt32LE(entry.dataOrOffset, offset + 4);
    structTable.writeUInt32LE(entry.fieldCount, offset + 8);
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

function collectFieldLabels(fields: SupportedField[]): string[] {
  const labels: string[] = [];
  for (const field of fields) {
    labels.push(field.label);
    if (field.type === "list" && Array.isArray(field.value)) {
      for (const entry of field.value) {
        labels.push(...collectFieldLabels(Array.isArray(entry) ? entry : entry.fields));
      }
    }
    if (field.type === "struct") {
      labels.push(...collectFieldLabels(field.value.fields));
    }
  }
  return labels;
}

function getFieldEntryOffset(fieldIndex: number): number {
  return HEADER_SIZE + STRUCT_ENTRY_SIZE + fieldIndex * FIELD_ENTRY_SIZE;
}

function writeFieldIndex(bytes: Buffer, index: number, value: number): void {
  const fieldIndicesOffset = bytes.readUInt32LE(40);
  bytes.writeUInt32LE(value >>> 0, fieldIndicesOffset + index * 4);
}

function writeFieldDataOffset(bytes: Buffer, fieldIndex: number, value: number): void {
  bytes.writeUInt32LE(value >>> 0, getFieldEntryOffset(fieldIndex) + 8);
}

function getFieldDataAbsoluteOffset(bytes: Buffer, fieldIndex: number): number {
  const fieldDataOffset = bytes.readUInt32LE(32);
  const dataOrOffset = bytes.readUInt32LE(getFieldEntryOffset(fieldIndex) + 8);
  return fieldDataOffset + dataOrOffset;
}

function getListDataAbsoluteOffset(bytes: Buffer, fieldIndex: number): number {
  const listIndicesOffset = bytes.readUInt32LE(48);
  const dataOrOffset = bytes.readUInt32LE(getFieldEntryOffset(fieldIndex) + 8);
  return listIndicesOffset + dataOrOffset;
}

function createFakeHeaderBuffer(readUInt32LE: (offset: number) => number): Buffer {
  const fake = {
    length: HEADER_SIZE,
    toString: (_encoding: string, start: number, end: number): string => {
      if (start === 0 && end === 4) {
        return "UTP ";
      }
      if (start === 4 && end === 8) {
        return "V3.2";
      }
      return "";
    },
    readUInt32LE
  };

  return fake as unknown as Buffer;
}
