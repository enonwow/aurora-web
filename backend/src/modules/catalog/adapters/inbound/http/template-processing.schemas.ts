import { z } from "zod";
import { AppException } from "../../../../../common/http/app-exception";

const creaturePartIdSchema = z.coerce.number().int().min(0).max(65535);
const creatureAppearanceTypeSchema = z.coerce.number().int().min(0).max(65535);
const creatureColorIdSchema = z.coerce.number().int().min(0).max(255);
const itemArmorPreviewModelPrefixSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^p[fm][a-z][0-9]_$/u,
    "armor preview model prefix must look like pmh0_ or pfh2_."
  );
const CREATURE_METADATA_LARGE_JSON_KEYS = new Set([
  "classListEntries",
  "featListEntries",
  "templateListEntries",
  "specAbilityListEntries",
  "inventoryItemListEntries",
  "equipItemListEntries",
  "itemPropertyListEntries",
  "storeListEntries",
  "encounterCreatureListEntries",
  "skillListEntries",
  "variableListEntries"
]);
const creatureMetadataPrimitiveSchema = z.union([
  z.string().max(512 * 1024),
  z.number().finite(),
  z.boolean()
]);
const creatureMetadataSchema = z
  .record(creatureMetadataPrimitiveSchema)
  .superRefine((metadata, context) => {
    Object.entries(metadata).forEach(([key, value]) => {
      if (
        typeof value === "string" &&
        value.length > 8000 &&
        !CREATURE_METADATA_LARGE_JSON_KEYS.has(key)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: "String must contain at most 8000 character(s)"
        });
      }
    });
  });

const armorBodyPartsSchema = z
  .object({
    rFoot: creaturePartIdSchema.optional(),
    lFoot: creaturePartIdSchema.optional(),
    rShin: creaturePartIdSchema.optional(),
    lShin: creaturePartIdSchema.optional(),
    lThigh: creaturePartIdSchema.optional(),
    rThigh: creaturePartIdSchema.optional(),
    pelvis: creaturePartIdSchema.optional(),
    torso: creaturePartIdSchema.optional(),
    belt: creaturePartIdSchema.optional(),
    neck: creaturePartIdSchema.optional(),
    rFArm: creaturePartIdSchema.optional(),
    lFArm: creaturePartIdSchema.optional(),
    rBicep: creaturePartIdSchema.optional(),
    lBicep: creaturePartIdSchema.optional(),
    rShoul: creaturePartIdSchema.optional(),
    lShoul: creaturePartIdSchema.optional(),
    rHand: creaturePartIdSchema.optional(),
    lHand: creaturePartIdSchema.optional(),
    robe: creaturePartIdSchema.optional()
  });

const creatureAppearanceOverrideSchema = z
  .object({
    appearanceType: creatureAppearanceTypeSchema.optional(),
    appearanceHead: creaturePartIdSchema.optional(),
    wingsNew: creaturePartIdSchema.optional(),
    tailNew: creaturePartIdSchema.optional(),
    bodyParts: armorBodyPartsSchema.optional(),
    colors: z
      .object({
        skin: creatureColorIdSchema.optional(),
        hair: creatureColorIdSchema.optional(),
        tattoo1: creatureColorIdSchema.optional(),
        tattoo2: creatureColorIdSchema.optional()
      })
      .optional()
  })
  .optional();

const itemVisualOverrideSchema = z
  .object({
    modelPart1: creaturePartIdSchema.optional(),
    modelPart2: creaturePartIdSchema.optional(),
    modelPart3: creaturePartIdSchema.optional(),
    armorContext: z
      .object({
        modelPrefix: itemArmorPreviewModelPrefixSchema.optional(),
        label: z.string().trim().min(1).max(64).optional(),
        gender: z.coerce.number().int().min(0).max(1).optional(),
        phenotype: z.coerce.number().int().min(0).max(9).optional(),
        raceModel: z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9_]{1,32}$/u, "race model may contain only letters, numbers and underscores.")
          .optional()
      })
      .optional(),
    armorParts: armorBodyPartsSchema.optional(),
    materialColors: z
      .object({
        leather1: creatureColorIdSchema.optional(),
        leather2: creatureColorIdSchema.optional(),
        cloth1: creatureColorIdSchema.optional(),
        cloth2: creatureColorIdSchema.optional(),
        metal1: creatureColorIdSchema.optional(),
        metal2: creatureColorIdSchema.optional()
      })
      .optional()
  })
  .optional();

const itemPropertyEntrySchema = z.object({
  propertyName: z.coerce.number().int().min(0).max(65535),
  subtype: z.coerce.number().int().min(0).max(65535).optional(),
  costTable: z.coerce.number().int().min(0).max(255).optional(),
  costValue: z.coerce.number().int().min(0).max(65535).optional(),
  param1: z.coerce.number().int().min(0).max(255).optional(),
  param1Value: z.coerce.number().int().min(0).max(255).optional(),
  chanceAppear: z.coerce.number().int().min(0).max(100).optional()
});

const resrefSchema = z
  .string()
  .trim()
  .min(1)
  .max(16)
  .regex(/^[A-Za-z0-9_]+$/u, "resref may contain only letters, numbers and underscores.");

const ITEM_SCRIPT_SLOT_ALIASES: Record<string, string> = {
  oninventorydisturbed: "oninvdisturbed"
};

const itemScriptSlotLabelSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine(
    (value) => /^[a-z0-9_]{1,16}$/u.test(value) || value in ITEM_SCRIPT_SLOT_ALIASES,
    "script slot labels must be GFF label-safe or a known Aurora alias."
  )
  .transform((value) => ITEM_SCRIPT_SLOT_ALIASES[value] ?? value);

const itemScriptSlotsSchema = z.record(
  itemScriptSlotLabelSchema,
  resrefSchema
).transform((scripts) =>
  Object.fromEntries(
    Object.entries(scripts).map(([key, value]) => [ITEM_SCRIPT_SLOT_ALIASES[key] ?? key, value])
  )
);

const embeddedItemBlueprintSchema = z.object({
  sourceStructTypeId: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  templateResRef: resrefSchema.optional(),
  localizedName: z.string().trim().min(1).max(128).optional(),
  localizedNameStrRef: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  description: z.string().max(4000).optional(),
  descriptionStrRef: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  identifiedDescription: z.string().max(4000).optional(),
  identifiedDescriptionStrRef: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  comments: z.string().max(4000).optional(),
  paletteId: z.coerce.number().int().min(0).max(255).optional(),
  tag: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9_]+$/u, "tag may contain only letters, numbers and underscores.")
    .optional(),
  plot: z.coerce.boolean().optional(),
  baseItem: z.coerce.number().int().min(0).max(65535).optional(),
  modelPart1: creaturePartIdSchema.optional(),
  modelPart2: creaturePartIdSchema.optional(),
  modelPart3: creaturePartIdSchema.optional(),
  cost: z.coerce.number().int().min(0).max(0x7fffffff).optional(),
  addCost: z.coerce.number().int().min(0).max(0x7fffffff).optional(),
  costTable: z.coerce.number().int().min(0).max(0x7fffffff).optional(),
  costValue: z.coerce.number().int().min(0).max(0x7fffffff).optional(),
  charges: z.coerce.number().int().min(0).max(0x7fffffff).optional(),
  stackSize: z.coerce.number().int().min(1).max(65535).optional(),
  identified: z.coerce.boolean().optional(),
  stolen: z.coerce.boolean().optional(),
  cursed: z.coerce.boolean().optional(),
  bodyPartRFoot: creaturePartIdSchema.optional(),
  bodyPartLFoot: creaturePartIdSchema.optional(),
  bodyPartRShin: creaturePartIdSchema.optional(),
  bodyPartLShin: creaturePartIdSchema.optional(),
  bodyPartLThigh: creaturePartIdSchema.optional(),
  bodyPartRThigh: creaturePartIdSchema.optional(),
  bodyPartPelvis: creaturePartIdSchema.optional(),
  bodyPartTorso: creaturePartIdSchema.optional(),
  bodyPartBelt: creaturePartIdSchema.optional(),
  bodyPartNeck: creaturePartIdSchema.optional(),
  bodyPartRFArm: creaturePartIdSchema.optional(),
  bodyPartLFArm: creaturePartIdSchema.optional(),
  bodyPartRBicep: creaturePartIdSchema.optional(),
  bodyPartLBicep: creaturePartIdSchema.optional(),
  bodyPartRShoul: creaturePartIdSchema.optional(),
  bodyPartLShoul: creaturePartIdSchema.optional(),
  bodyPartRHand: creaturePartIdSchema.optional(),
  bodyPartLHand: creaturePartIdSchema.optional(),
  bodyPartRobe: creaturePartIdSchema.optional(),
  leather1Color: creatureColorIdSchema.optional(),
  leather2Color: creatureColorIdSchema.optional(),
  cloth1Color: creatureColorIdSchema.optional(),
  cloth2Color: creatureColorIdSchema.optional(),
  metal1Color: creatureColorIdSchema.optional(),
  metal2Color: creatureColorIdSchema.optional(),
  itemPropertyListEntries: z.array(itemPropertyEntrySchema).max(255).optional(),
  scripts: itemScriptSlotsSchema.optional()
});

const itemBlueprintCreatePayloadSchema = z.object({
  templateResRef: resrefSchema,
  name: z.string().trim().min(1).max(128),
  localizedNameStrRef: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  tag: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9_]+$/u, "tag may contain only letters, numbers and underscores.")
    .optional(),
  description: z.string().max(4000).optional(),
  descriptionStrRef: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  identifiedDescription: z.string().max(4000).optional(),
  identifiedDescriptionStrRef: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  comments: z.string().max(4000).optional(),
  paletteId: z.coerce.number().int().min(0).max(255).optional(),
  baseItem: z.coerce.number().int().min(0).max(65535),
  modelPart1: creaturePartIdSchema.optional(),
  modelPart2: creaturePartIdSchema.optional(),
  modelPart3: creaturePartIdSchema.optional(),
  cost: z.coerce.number().int().min(0).max(0x7fffffff).optional(),
  addCost: z.coerce.number().int().min(0).max(0x7fffffff).optional(),
  costTable: z.coerce.number().int().min(0).max(0x7fffffff).optional(),
  costValue: z.coerce.number().int().min(0).max(0x7fffffff).optional(),
  charges: z.coerce.number().int().min(0).max(0x7fffffff).optional(),
  stackSize: z.coerce.number().int().min(1).max(65535).optional(),
  identified: z.coerce.boolean().optional(),
  stolen: z.coerce.boolean().optional(),
  plot: z.coerce.boolean().optional(),
  cursed: z.coerce.boolean().optional(),
  armorContext: z
    .object({
      modelPrefix: itemArmorPreviewModelPrefixSchema.optional(),
      label: z.string().trim().min(1).max(64).optional(),
      gender: z.coerce.number().int().min(0).max(1).optional(),
      phenotype: z.coerce.number().int().min(0).max(9).optional(),
      raceModel: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9_]{1,32}$/u, "race model may contain only letters, numbers and underscores.")
        .optional()
    })
    .optional(),
  armorParts: armorBodyPartsSchema.optional(),
  materialColors: z
    .object({
      leather1: creatureColorIdSchema.optional(),
      leather2: creatureColorIdSchema.optional(),
      cloth1: creatureColorIdSchema.optional(),
      cloth2: creatureColorIdSchema.optional(),
      metal1: creatureColorIdSchema.optional(),
      metal2: creatureColorIdSchema.optional()
    })
    .optional(),
  propertyList: z.array(itemPropertyEntrySchema).max(255).optional(),
  scripts: itemScriptSlotsSchema.optional(),
  overwrite: z.coerce.boolean().default(false)
});

const creatureSpellEntrySchema = z.object({
  spellId: z.coerce.number().int().min(0).max(65535).optional(),
  spellLevel: z.coerce.number().int().min(0).max(13).optional(),
  metaMagic: z.coerce.number().int().min(0).max(255).optional(),
  flags: z.coerce.number().int().min(0).max(255).optional()
});

const creatureClassEntrySchema = z.object({
  classId: z.coerce.number().int().min(0).max(255).optional(),
  level: z.coerce.number().int().min(0).max(255).optional(),
  knownSpells: z.array(creatureSpellEntrySchema).max(512).optional(),
  memorizedSpells: z.array(creatureSpellEntrySchema).max(512).optional()
});

const creatureInventoryItemEntrySchema = z
  .object({
    resRef: resrefSchema.optional(),
    embeddedItem: embeddedItemBlueprintSchema.optional(),
    randomResRef: resrefSchema.optional(),
    randomList: resrefSchema.optional(),
    x: z.coerce.number().int().min(0).max(65535).optional(),
    y: z.coerce.number().int().min(0).max(65535).optional(),
    dropable: z.coerce.boolean().optional(),
    pickpocketable: z.coerce.boolean().optional(),
    infinite: z.coerce.boolean().optional()
  })
  .superRefine((value, context) => {
    if (!value.resRef && !value.randomResRef && !value.randomList && !value.embeddedItem) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resRef"],
        message: "Creature inventory item requires resRef, randomResRef, randomList, or embeddedItem."
      });
    }
  });

const creatureEquippedItemEntrySchema = z
  .object({
    resRef: resrefSchema.optional(),
    embeddedItem: embeddedItemBlueprintSchema.optional(),
    randomResRef: resrefSchema.optional(),
    randomList: resrefSchema.optional(),
    slotMask: z.coerce.number().int().min(0).max(0xffffffff).optional(),
    dropable: z.coerce.boolean().optional(),
    pickpocketable: z.coerce.boolean().optional(),
    infinite: z.coerce.boolean().optional()
  })
  .superRefine((value, context) => {
    if (!value.resRef && !value.randomResRef && !value.randomList && !value.embeddedItem) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resRef"],
        message: "Creature equipped item requires resRef, randomResRef, randomList, or embeddedItem."
      });
    }
  });

const creatureVariableEntrySchema = z.discriminatedUnion("type", [
  z.object({
    name: z.string().trim().min(1).max(64),
    type: z.literal("int"),
    value: z.coerce.number().int().min(-0x80000000).max(0x7fffffff)
  }),
  z.object({
    name: z.string().trim().min(1).max(64),
    type: z.literal("float"),
    value: z.coerce.number().finite()
  }),
  z.object({
    name: z.string().trim().min(1).max(64),
    type: z.literal("string"),
    value: z.string().max(16384)
  })
]);

const creatureBlueprintFieldsSchema = z.object({
  firstName: z.string().trim().min(1).max(128).optional(),
  firstNameStrRef: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  lastName: z.string().trim().max(128).optional(),
  lastNameStrRef: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  description: z.string().max(4000).optional(),
  descriptionStrRef: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  comments: z.string().max(4000).optional(),
  paletteId: z.coerce.number().int().min(0).max(255).optional(),
  tag: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_]+$/u).optional(),
  conversation: resrefSchema.optional(),
  gender: z.coerce.number().int().min(0).max(255).optional(),
  race: z.coerce.number().int().min(0).max(65535).optional(),
  subrace: z.string().trim().max(128).optional(),
  subraceStrRef: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  deity: z.string().trim().max(128).optional(),
  deityStrRef: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  phenotype: z.coerce.number().int().min(0).max(65535).optional(),
  portraitId: z.coerce.number().int().min(0).max(65535).optional(),
  portraitResRef: resrefSchema.optional(),
  soundSetFile: z.coerce.number().int().min(0).max(65535).optional(),
  appearanceId: z.coerce.number().int().min(0).max(65535).optional(),
  animationState: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  appearanceHead: creaturePartIdSchema.optional(),
  bodyPartRFoot: creaturePartIdSchema.optional(),
  bodyPartLFoot: creaturePartIdSchema.optional(),
  bodyPartRShin: creaturePartIdSchema.optional(),
  bodyPartLShin: creaturePartIdSchema.optional(),
  bodyPartLThigh: creaturePartIdSchema.optional(),
  bodyPartRThigh: creaturePartIdSchema.optional(),
  bodyPartPelvis: creaturePartIdSchema.optional(),
  bodyPartTorso: creaturePartIdSchema.optional(),
  bodyPartBelt: creaturePartIdSchema.optional(),
  bodyPartNeck: creaturePartIdSchema.optional(),
  bodyPartRFArm: creaturePartIdSchema.optional(),
  bodyPartLFArm: creaturePartIdSchema.optional(),
  bodyPartRBicep: creaturePartIdSchema.optional(),
  bodyPartLBicep: creaturePartIdSchema.optional(),
  bodyPartRShoul: creaturePartIdSchema.optional(),
  bodyPartLShoul: creaturePartIdSchema.optional(),
  bodyPartRHand: creaturePartIdSchema.optional(),
  bodyPartLHand: creaturePartIdSchema.optional(),
  bodyPartRobe: creaturePartIdSchema.optional(),
  colorSkin: creatureColorIdSchema.optional(),
  colorHair: creatureColorIdSchema.optional(),
  colorTattoo1: creatureColorIdSchema.optional(),
  colorTattoo2: creatureColorIdSchema.optional(),
  leather1Color: creatureColorIdSchema.optional(),
  leather2Color: creatureColorIdSchema.optional(),
  cloth1Color: creatureColorIdSchema.optional(),
  cloth2Color: creatureColorIdSchema.optional(),
  metal1Color: creatureColorIdSchema.optional(),
  metal2Color: creatureColorIdSchema.optional(),
  wingsNew: creaturePartIdSchema.optional(),
  tailNew: creaturePartIdSchema.optional(),
  walkRate: z.coerce.number().int().min(0).max(255).optional(),
  factionId: z.coerce.number().int().min(0).max(65535).optional(),
  challengeRating: z.coerce.number().min(0).max(1000).optional(),
  crAdjust: z.coerce.number().int().min(-0x80000000).max(0x7fffffff).optional(),
  perceptionRange: z.coerce.number().int().min(0).max(255).optional(),
  disarmable: z.coerce.boolean().optional(),
  plot: z.coerce.boolean().optional(),
  isPc: z.coerce.boolean().optional(),
  isImmortal: z.coerce.boolean().optional(),
  lootable: z.coerce.boolean().optional(),
  noPermDeath: z.coerce.boolean().optional(),
  bodyBag: z.coerce.boolean().optional(),
  startingPackage: z.coerce.boolean().optional(),
  interruptable: z.coerce.boolean().optional(),
  decayTime: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  naturalAc: z.coerce.number().int().min(0).max(255).optional(),
  hitPoints: z.coerce.number().int().min(-0x8000).max(0x7fff).optional(),
  currentHitPoints: z.coerce.number().int().min(-0x8000).max(0x7fff).optional(),
  maxHitPoints: z.coerce.number().int().min(-0x8000).max(0x7fff).optional(),
  reflexBonus: z.coerce.number().int().min(-128).max(127).optional(),
  willBonus: z.coerce.number().int().min(-128).max(127).optional(),
  fortitudeBonus: z.coerce.number().int().min(-128).max(127).optional(),
  strength: z.coerce.number().int().min(0).max(255).optional(),
  dexterity: z.coerce.number().int().min(0).max(255).optional(),
  constitution: z.coerce.number().int().min(0).max(255).optional(),
  intelligence: z.coerce.number().int().min(0).max(255).optional(),
  wisdom: z.coerce.number().int().min(0).max(255).optional(),
  charisma: z.coerce.number().int().min(0).max(255).optional(),
  strengthAdjust: z.coerce.number().int().min(-128).max(127).optional(),
  dexterityAdjust: z.coerce.number().int().min(-128).max(127).optional(),
  constitutionAdjust: z.coerce.number().int().min(-128).max(127).optional(),
  intelligenceAdjust: z.coerce.number().int().min(-128).max(127).optional(),
  wisdomAdjust: z.coerce.number().int().min(-128).max(127).optional(),
  charismaAdjust: z.coerce.number().int().min(-128).max(127).optional(),
  goodEvil: z.coerce.number().int().min(0).max(255).optional(),
  lawfulChaotic: z.coerce.number().int().min(0).max(255).optional(),
  scripts: itemScriptSlotsSchema.optional(),
  classListEntries: z.array(creatureClassEntrySchema).max(32).optional(),
  featListEntries: z.array(z.object({ featId: z.coerce.number().int().min(0).max(65535).optional() })).max(4096).optional(),
  templateListEntries: z.array(z.object({ templateId: z.coerce.number().int().min(0).max(65535).optional() })).max(1024).optional(),
  specAbilityListEntries: z.array(z.object({
    spellId: z.coerce.number().int().min(0).max(65535).optional(),
    flags: z.coerce.number().int().min(0).max(255).optional(),
    casterLevel: z.coerce.number().int().min(0).max(15).optional()
  })).max(1024).optional(),
  skillListEntries: z.array(z.object({ rank: z.coerce.number().int().min(0).max(255).optional() })).max(512).optional(),
  variableListEntries: z.array(creatureVariableEntrySchema).max(1024).optional(),
  inventoryItemListEntries: z.array(creatureInventoryItemEntrySchema).max(1024).optional(),
  equipItemListEntries: z.array(creatureEquippedItemEntrySchema).max(1024).optional()
});

const creatureBlueprintCreatePayloadSchema = z.object({
  templateResRef: resrefSchema,
  name: z.string().trim().min(1).max(128),
  blueprint: creatureBlueprintFieldsSchema.default({}),
  overwrite: z.coerce.boolean().default(false)
});

const creatureBlueprintRenamePayloadSchema = z.object({
  templateResRef: resrefSchema
});

const creatureResourceOptionsQuerySchema = z.object({
  kind: z.enum(["conversation", "portrait", "script", "soundset"]),
  query: z.string().trim().max(128).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(200)
});

const storeItemEntrySchema = z
  .object({
    resRef: resrefSchema.optional(),
    embeddedItem: embeddedItemBlueprintSchema.optional(),
    randomResRef: resrefSchema.optional(),
    randomList: resrefSchema.optional(),
    x: z.coerce.number().int().min(0).max(65535).optional(),
    y: z.coerce.number().int().min(0).max(65535).optional(),
    infinite: z.coerce.boolean().optional()
  })
  .superRefine((value, context) => {
    if (!value.resRef && !value.randomResRef && !value.randomList && !value.embeddedItem) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resRef"],
        message: "Store item entry requires resRef, randomResRef, randomList, or embeddedItem."
      });
    }
  });

const storeBucketEntrySchema = z.object({
  bucketTypeId: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  itemListEntries: z.array(storeItemEntrySchema).max(1024).optional()
});

const storeBlueprintCreatePayloadSchema = z.object({
  resRef: resrefSchema,
  name: z.string().trim().min(1).max(128),
  tag: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9_]+$/u, "tag may contain only letters, numbers and underscores.")
    .optional(),
  comments: z.string().max(4000).optional(),
  markUp: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  markDown: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  blackMarket: z.coerce.boolean().optional(),
  bmMarkDown: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  onOpenStore: resrefSchema.optional(),
  storeId: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  storeListEntries: z.array(storeBucketEntrySchema).max(5).optional(),
  willNotBuyBaseItems: z.array(z.coerce.number().int().min(0).max(65535)).max(65535).optional(),
  willOnlyBuyBaseItems: z.array(z.coerce.number().int().min(0).max(65535)).max(65535).optional(),
  overwrite: z.coerce.boolean().default(false)
});

const placeableInventoryItemEntrySchema = z
  .object({
    resRef: resrefSchema.optional(),
    embeddedItem: embeddedItemBlueprintSchema.optional(),
    randomResRef: resrefSchema.optional(),
    randomList: resrefSchema.optional(),
    x: z.coerce.number().int().min(0).max(65535).optional(),
    y: z.coerce.number().int().min(0).max(65535).optional(),
    dropable: z.coerce.boolean().optional(),
    pickpocketable: z.coerce.boolean().optional(),
    infinite: z.coerce.boolean().optional()
  })
  .superRefine((value, context) => {
    if (!value.resRef && !value.randomResRef && !value.randomList && !value.embeddedItem) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resRef"],
        message: "Placeable inventory entry requires resRef, randomResRef, randomList, or embeddedItem."
      });
    }
  });

const placeableBlueprintCreatePayloadSchema = z.object({
  templateResRef: resrefSchema,
  name: z.string().trim().min(1).max(128),
  tag: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9_]+$/u, "tag may contain only letters, numbers and underscores.")
    .optional(),
  comments: z.string().max(4000).optional(),
  plot: z.coerce.boolean().optional(),
  useable: z.coerce.boolean().optional(),
  hasInventory: z.coerce.boolean().optional(),
  appearanceId: z.coerce.number().int().min(0).max(0xffffffff).optional(),
  isStatic: z.coerce.boolean().optional(),
  inventoryItemListEntries: z.array(placeableInventoryItemEntrySchema).max(1024).optional(),
  overwrite: z.coerce.boolean().default(false)
});

type ItemPaletteCustomNodeInput = {
  label?: string;
  strRef?: number;
  id?: number;
  resRef?: string;
  children?: ItemPaletteCustomNodeInput[];
};

const itemPaletteCustomNodeSchema: z.ZodType<ItemPaletteCustomNodeInput> = z.lazy(() =>
  z.object({
    label: z.string().trim().min(1).max(128).optional(),
    strRef: z.coerce.number().int().min(0).max(0xffffffff).optional(),
    id: z.coerce.number().int().min(0).max(0xffffffff).optional(),
    resRef: resrefSchema.optional(),
    children: z.array(itemPaletteCustomNodeSchema).max(512).optional()
  })
);

const itemPaletteCustomWritePayloadSchema = z.object({
  roots: z.array(itemPaletteCustomNodeSchema).max(512)
});

const templateProcessPayloadSchema = z
  .object({
    templateId: z.string().trim().min(1).optional(),
    resref: z.string().trim().min(1).optional(),
    creatureMetadata: creatureMetadataSchema.optional(),
    creatureAppearanceOverride: creatureAppearanceOverrideSchema,
    itemVisualOverride: itemVisualOverrideSchema,
    bypassCache: z.coerce.boolean().default(false),
    includeBenchmarkMetadata: z.coerce.boolean().default(true)
  })
  .superRefine((value, context) => {
    if (!value.templateId && !value.resref) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["templateId"],
        message: "Either templateId or resref must be provided."
      });
    }
  });

const cacheKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(128)
  .regex(/^[a-f0-9]+$/iu, "cacheKey must be hexadecimal.");

export function parseTemplateProcessPayload(input: unknown) {
  const parsed = templateProcessPayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Template process payload validation failed.");
}

export function parseItemBlueprintCreatePayload(input: unknown) {
  const parsed = itemBlueprintCreatePayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Item blueprint payload validation failed.");
}

export function parseCreatureBlueprintCreatePayload(input: unknown) {
  const parsed = creatureBlueprintCreatePayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Creature blueprint payload validation failed.");
}

export function parseCreatureBlueprintRenamePayload(input: unknown) {
  const parsed = creatureBlueprintRenamePayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Creature blueprint rename payload validation failed.");
}

export function parseCreatureResourceOptionsQuery(input: unknown) {
  const parsed = creatureResourceOptionsQuerySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Creature resource options query validation failed.");
}

export function parseItemBlueprintResRef(input: unknown): string {
  const parsed = resrefSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Item blueprint resref validation failed.");
}

export function parseCreatureBlueprintResRef(input: unknown): string {
  const parsed = resrefSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Creature blueprint resref validation failed.");
}

export function parseStoreBlueprintCreatePayload(input: unknown) {
  const parsed = storeBlueprintCreatePayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Store blueprint payload validation failed.");
}

export function parsePlaceableBlueprintCreatePayload(input: unknown) {
  const parsed = placeableBlueprintCreatePayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Placeable blueprint payload validation failed.");
}

export function parseItemPaletteCustomWritePayload(input: unknown) {
  const parsed = itemPaletteCustomWritePayloadSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Item palette payload validation failed.");
}

export function parseStoreBlueprintResRef(input: unknown): string {
  const parsed = resrefSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Store blueprint resref validation failed.");
}

export function parsePlaceableBlueprintResRef(input: unknown): string {
  const parsed = resrefSchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Placeable blueprint resref validation failed.");
}

export function parseTemplateCacheKey(input: unknown): string {
  const parsed = cacheKeySchema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  }

  throwValidationError(parsed.error.issues, "Template cache key validation failed.");
}

function throwValidationError(
  issues: Array<{ path: Array<string | number>; message: string }>,
  message: string
): never {
  throw new AppException({
    status: 422,
    code: "VALIDATION_FAILED",
    message,
    details: issues.map((issue) => ({
      path: issue.path.join("."),
      reason: issue.message
    }))
  });
}
