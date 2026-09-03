import { createHash } from "node:crypto";

import type { SupportedGffField } from
  "../../../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const MAX_CLASS_SLOTS = 8;
const MAX_CLASS_LEVEL = 60;
const MAX_TOTAL_LEVEL = 180;
const INT_MAX = 0x7fff_ffff;
const SPELL_LIST_LABEL = /^(?:KnownList|MemorizedList)(?:[0-9]|1[0-3])$/u;

export interface AreaCreatureClassListGraphEntry {
  readonly classId: number;
  readonly level: number;
  readonly opaqueSiblingFieldCount: number;
  readonly canonicalSpellListFieldCount: number;
  readonly spellEntryCount: number;
}

export interface AreaCreatureClassListGraphAnalysis {
  readonly classListGraphSha256: string;
  readonly entries: readonly AreaCreatureClassListGraphEntry[];
}

function isBoundedInteger(value: unknown, min: number, max: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
}

function exactField(
  fields: readonly SupportedGffField[],
  label: string,
  type: SupportedGffField["type"],
): SupportedGffField | null {
  const matches = fields.filter((field) => field.label === label);
  return matches.length === 1 && matches[0]?.type === type ? matches[0] : null;
}

function isCanonicalSpellList(field: SupportedGffField): boolean {
  if (!SPELL_LIST_LABEL.test(field.label) || field.type !== "list") return false;
  return field.value.every((entry) => {
    if (entry.typeId !== 3) return false;
    const spell = exactField(entry.fields, "Spell", "word");
    const metamagic = exactField(entry.fields, "SpellMetaMagic", "byte");
    const flags = exactField(entry.fields, "SpellFlags", "byte");
    return spell?.type === "word" && metamagic?.type === "byte" && flags?.type === "byte";
  });
}

function encodeNumber(value: number): string | number {
  if (Number.isNaN(value)) return "nan";
  if (value === Number.POSITIVE_INFINITY) return "+infinity";
  if (value === Number.NEGATIVE_INFINITY) return "-infinity";
  if (Object.is(value, -0)) return "-0";
  return value;
}

function normalizeField(field: SupportedGffField): unknown {
  switch (field.type) {
    case "byte":
    case "char":
    case "word":
    case "short":
    case "dword":
    case "int":
    case "float":
    case "double":
      return [field.label, field.type, encodeNumber(field.value)];
    case "dword64":
    case "int64":
      return [field.label, field.type, field.value.toString(10)];
    case "cexostring":
    case "resref":
      return [field.label, field.type, field.value];
    case "void":
      return [field.label, field.type, field.value.toString("base64")];
    case "cexolocstring":
      return [
        field.label,
        field.type,
        field.value.strRef === undefined ? null : field.value.strRef,
        field.value.text === undefined ? null : field.value.text,
        field.value.entries?.map((entry) => [entry.languageId, entry.text]) ?? null,
      ];
    case "struct":
      return [
        field.label,
        field.type,
        field.value.typeId,
        field.value.fields.map(normalizeField),
      ];
    case "list":
      return [
        field.label,
        field.type,
        field.value.map((entry) => [entry.typeId, entry.fields.map(normalizeField)]),
      ];
  }
}

export function fingerprintAreaCreatureClassListField(field: SupportedGffField): string {
  return createHash("sha256").update(JSON.stringify(normalizeField(field)), "utf8").digest("hex");
}

export function analyzeAreaCreatureClassListField(
  field: SupportedGffField,
): AreaCreatureClassListGraphAnalysis | null {
  if (field.label !== "ClassList" || field.type !== "list" || field.value.length < 1 ||
    field.value.length > MAX_CLASS_SLOTS) return null;
  const entries: AreaCreatureClassListGraphEntry[] = [];
  for (const entry of field.value) {
    if (entry.typeId !== 2) return null;
    const classField = exactField(entry.fields, "Class", "int");
    const levelField = exactField(entry.fields, "ClassLevel", "short");
    if (classField?.type !== "int" || levelField?.type !== "short" ||
      !isBoundedInteger(classField.value, 0, INT_MAX) ||
      !isBoundedInteger(levelField.value, 1, MAX_CLASS_LEVEL)) return null;
    const spellFields = entry.fields.filter((candidate) => SPELL_LIST_LABEL.test(candidate.label));
    if (new Set(spellFields.map((candidate) => candidate.label)).size !== spellFields.length ||
      spellFields.some((candidate) => !isCanonicalSpellList(candidate))) return null;
    entries.push(Object.freeze({
      classId: classField.value,
      level: levelField.value,
      opaqueSiblingFieldCount: entry.fields.length - 2 - spellFields.length,
      canonicalSpellListFieldCount: spellFields.length,
      spellEntryCount: spellFields.reduce(
        (sum, candidate) => sum + (candidate.type === "list" ? candidate.value.length : 0),
        0,
      ),
    }));
  }
  if (new Set(entries.map((entry) => entry.classId)).size !== entries.length ||
    entries.reduce((sum, entry) => sum + entry.level, 0) > MAX_TOTAL_LEVEL) return null;
  return Object.freeze({
    classListGraphSha256: fingerprintAreaCreatureClassListField(field),
    entries: Object.freeze(entries),
  });
}

export function replaceAreaCreatureClassIdsAndClearSpellLists(
  field: SupportedGffField,
  expectedClassIds: readonly number[],
  classIds: readonly number[],
  levels: readonly number[],
): SupportedGffField | null {
  const analysis = analyzeAreaCreatureClassListField(field);
  if (!analysis || expectedClassIds.length !== analysis.entries.length ||
    classIds.length !== analysis.entries.length ||
    levels.length !== analysis.entries.length ||
    analysis.entries.some((entry, index) => entry.classId !== expectedClassIds[index])) return null;
  return {
    label: "ClassList",
    type: "list",
    value: field.type === "list" ? field.value.map((entry, index) => {
      const classChanged = expectedClassIds[index] !== classIds[index];
      return {
        typeId: entry.typeId,
        fields: entry.fields
          .filter((candidate) => !classChanged || !SPELL_LIST_LABEL.test(candidate.label))
          .map((candidate) => {
            if (candidate.label === "Class" && candidate.type === "int") {
              return { ...candidate, value: classIds[index]! };
            }
            if (candidate.label === "ClassLevel" && candidate.type === "short") {
              return { ...candidate, value: levels[index]! };
            }
            return candidate;
          }),
      };
    }) : [],
  };
}

export function resizeAreaCreatureClassListTail(
  field: SupportedGffField,
  expectedClassIds: readonly number[],
  expectedLevels: readonly number[],
  classIds: readonly number[],
  levels: readonly number[],
): SupportedGffField | null {
  const analysis = analyzeAreaCreatureClassListField(field);
  if (!analysis || field.type !== "list" || expectedClassIds.length !== analysis.entries.length ||
    expectedLevels.length !== analysis.entries.length || classIds.length < 1 ||
    classIds.length > MAX_CLASS_SLOTS || levels.length !== classIds.length ||
    classIds.length === expectedClassIds.length ||
    analysis.entries.some((entry, index) =>
      entry.classId !== expectedClassIds[index] || entry.level !== expectedLevels[index]) ||
    classIds.some((classId) => !isBoundedInteger(classId, 0, INT_MAX)) ||
    levels.some((level) => !isBoundedInteger(level, 1, MAX_CLASS_LEVEL)) ||
    new Set(classIds).size !== classIds.length ||
    levels.reduce((sum, level) => sum + level, 0) > MAX_TOTAL_LEVEL) return null;

  const retainedCount = Math.min(expectedClassIds.length, classIds.length);
  for (let index = 0; index < retainedCount; index += 1) {
    if (expectedClassIds[index] !== classIds[index] || expectedLevels[index] !== levels[index]) {
      return null;
    }
  }

  const retained = field.value.slice(0, classIds.length);
  for (let index = expectedClassIds.length; index < classIds.length; index += 1) {
    retained.push({
      typeId: 2,
      fields: [
        { label: "Class", type: "int", value: classIds[index]! },
        { label: "ClassLevel", type: "short", value: levels[index]! },
      ],
    });
  }
  return { label: "ClassList", type: "list", value: retained };
}
