import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";

const EXACT_X2_GNOLL001_UTE_DEFLATE_BASE64 =
  "XVNdTxNBFD3bpSIWRARE8SM8mPgZU+oLDyRC2ioklSVrMTyYkHH3tkyyO93sTmXxyQf8N/4M/4C/qDLbu+2USTY5594zd+7OnHvSbW99ff+usQPABfANwDMAfx1gE0DoAgcA/rhADuD5HLAIYDQajQDgAcbrFMAc43PGdzBdZo8DYBlADUAFwGPOuZyrWjWq/FU4dsvSzDM367YVX+BasM6u8nm7jBet+BLvNfm7AF4wNj2+ZHwPwCvGKwBeM74P4A1rV62aa9f9XjnjvtaL6K8PNb6nt6zbuKH/PaPf2yv1O5beYfyQ95n/e3T9Ti0AXdGHvTqDQETyJ4VHIiaTpziJhCafMp96wH6g5Q+a6luy15PBMNKXN/mhCinHRxFoOVAT/WeRN1MSephSZvhxJC4p9VTE+30KZvI+ZaSt/grelTFNeSIuVFbmvxjmJZMzPdVWmlIKOe+pdi6tgoafi2GmWeGpAxKp/k5CMz/JKG1RT6pCUTbXkVkh2E8SEqlQATfU9GeuE+W9TfqTqh9R0WXBj0VEWtNhi/PNQRyTmjZo3vO0cfbpyOt06vVt89T/wvGD1vLGWV8Noqhe3x4H1MUkYOFGWcvhmXB5Lqo8C/M8CwvsjRp7fYm9vcxeXmHvGs8+AfCUPbjOnttgjxlvbfKMVqxz/wM=";

export const ENCOUNTER_CONSTRUCTION_GEOMETRY = Object.freeze([
  Object.freeze({ x: -0.13086700439453125, y: -6.151325225830078, z: 0.0250005591660738 }),
  Object.freeze({ x: 6.059123992919922, y: -6.1513214111328125, z: 0.025000499561429024 }),
  Object.freeze({ x: 6.059125900268555, y: 0.038669586181640625, z: 0.025000059977173805 }),
  Object.freeze({ x: 0, y: 0, z: 0.02500000037252903 }),
] as const);

export function encounterBlueprintFixture(): Buffer {
  return inflateRawSync(Buffer.from(EXACT_X2_GNOLL001_UTE_DEFLATE_BASE64, "base64"));
}

export function encounterBlueprintFields(): SupportedGffField[] {
  const document = parseRawGffDocument(encounterBlueprintFixture());
  if (!document) throw new Error("Invalid exact x2_gnoll001 UTE fixture.");
  return document.fields.map((field) => structuredClone(field));
}

export function encounterAdditionFixture(
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }> = {
    x: 2.241201591491699,
    y: 4.51970329284668,
    z: 0,
    bearing: 0,
  },
) {
  const blueprintBytes = encounterBlueprintFixture();
  return {
    kind: "encounter" as const,
    localObjectId: "enc_001",
    sourceProfileId: "nwn-base-key-ute-x2-gnoll001-v1",
    templateResRef: "x2_gnoll001",
    resRef: "x2_gnoll001",
    tag: "X2_GNOLL001",
    sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
    blueprintBytes,
    ...transform,
  };
}

export function dynamicEncounterBlueprintFields(): SupportedGffField[] {
  const fields = encounterBlueprintFields()
    .filter((field) => field.label !== "PaletteID" && field.label !== "Comment")
    .map((field): SupportedGffField => {
      if (field.label === "Tag") {
        return { label: "Tag", type: "cexostring", value: "DYNAMIC_ENCOUNTER" };
      }
      if (field.label === "LocalizedName") {
        return {
          label: "LocalizedName",
          type: "cexolocstring",
          value: { strRef: 0xffffffff, entries: [{ id: 0, text: "Dynamic Encounter" }] },
        };
      }
      if (field.label === "TemplateResRef") {
        return { label: "TemplateResRef", type: "resref", value: "enc_dynamic" };
      }
      if (field.label === "CreatureList") {
        return {
          label: "CreatureList",
          type: "list",
          value: [{
            typeId: 0,
            fields: [
              { label: "Appearance", type: "int", value: 4 },
              { label: "CR", type: "float", value: Math.fround(0.25) },
              { label: "ResRef", type: "resref", value: "nw_wolf001" },
              { label: "SingleSpawn", type: "byte", value: 1 },
            ],
          }],
        };
      }
      return structuredClone(field);
    });
  const creatureIndex = fields.findIndex((field) => field.label === "CreatureList");
  fields.splice(creatureIndex, 0, {
    label: "VarTable",
    type: "list",
    value: [{
      typeId: 0,
      fields: [
        { label: "Name", type: "cexostring", value: "Counter" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: -2 },
      ],
    }],
  });
  fields.push(
    { label: "PaletteID", type: "byte", value: 9 },
    { label: "Comment", type: "cexostring", value: "Palette-only comment" },
  );
  return fields;
}

export function dynamicEncounterBlueprintFixture(): Buffer {
  return buildGffBuffer(dynamicEncounterBlueprintFields(), "UTE ", 0xffffffff);
}

export function dynamicEncounterAdditionFixture(
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }> = {
    x: 3.25,
    y: 4.5,
    z: 0.125,
    bearing: 0,
  },
) {
  const blueprintBytes = dynamicEncounterBlueprintFixture();
  return {
    kind: "encounter" as const,
    localObjectId: "enc_dynamic",
    sourceProfileId: "effective-catalog-ute-encounter-copy-v1",
    sourceObjectKey: "modules/current/blueprints/encounters/enc_dynamic.ute",
    sourceSizeBytes: blueprintBytes.length,
    templateResRef: "enc_dynamic",
    resRef: "enc_dynamic",
    tag: "DYNAMIC_ENCOUNTER",
    sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
    blueprintBytes,
    ...transform,
  };
}

export function expectedDynamicEncounterGitFields(
  transform: Readonly<{ x: number; y: number; z: number }>,
): SupportedGffField[] {
  const document = parseRawGffDocument(dynamicEncounterBlueprintFixture());
  if (!document) throw new Error("Invalid dynamic Encounter UTE fixture.");
  const source = new Map(document.fields.map((field) => [field.label, field]));
  const field = (label: string): SupportedGffField => structuredClone(source.get(label)!);
  return [
    field("Tag"),
    field("LocalizedName"),
    field("TemplateResRef"),
    field("Active"),
    field("Difficulty"),
    field("DifficultyIndex"),
    field("Faction"),
    field("MaxCreatures"),
    field("PlayerOnly"),
    field("RecCreatures"),
    field("Reset"),
    field("ResetTime"),
    field("Respawns"),
    field("SpawnOption"),
    field("OnEntered"),
    field("OnExit"),
    field("OnExhausted"),
    field("OnHeartbeat"),
    field("OnUserDefined"),
    field("VarTable"),
    field("CreatureList"),
    { label: "XPosition", type: "float", value: Math.fround(transform.x * 10) },
    { label: "YPosition", type: "float", value: Math.fround(transform.y * 10) },
    { label: "ZPosition", type: "float", value: Math.fround(transform.z * 10) },
    {
      label: "Geometry",
      type: "list",
      value: ENCOUNTER_CONSTRUCTION_GEOMETRY.map((point) => ({
        typeId: 1,
        fields: [
          { label: "X", type: "float" as const, value: point.x },
          { label: "Y", type: "float" as const, value: point.y },
          { label: "Z", type: "float" as const, value: point.z },
        ],
      })),
    },
    { label: "SpawnPointList", type: "list", value: [] },
  ];
}

export function expectedEncounterGitFields(
  transform: Readonly<{ x: number; y: number; z: number }>,
): SupportedGffField[] {
  const source = new Map(encounterBlueprintFields().map((field) => [field.label, field]));
  const field = (label: string): SupportedGffField => structuredClone(source.get(label)!);
  return [
    field("Tag"),
    field("LocalizedName"),
    field("TemplateResRef"),
    field("Active"),
    field("Difficulty"),
    field("DifficultyIndex"),
    field("Faction"),
    field("MaxCreatures"),
    field("PlayerOnly"),
    field("RecCreatures"),
    field("Reset"),
    field("ResetTime"),
    field("Respawns"),
    field("SpawnOption"),
    field("OnEntered"),
    field("OnExit"),
    field("OnExhausted"),
    field("OnHeartbeat"),
    field("OnUserDefined"),
    field("CreatureList"),
    { label: "XPosition", type: "float", value: Math.fround(transform.x * 10) },
    { label: "YPosition", type: "float", value: Math.fround(transform.y * 10) },
    { label: "ZPosition", type: "float", value: Math.fround(transform.z * 10) },
    {
      label: "Geometry",
      type: "list",
      value: ENCOUNTER_CONSTRUCTION_GEOMETRY.map((point) => ({
        typeId: 1,
        fields: [
          { label: "X", type: "float" as const, value: point.x },
          { label: "Y", type: "float" as const, value: point.y },
          { label: "Z", type: "float" as const, value: point.z },
        ],
      })),
    },
    { label: "SpawnPointList", type: "list", value: [] },
  ];
}
