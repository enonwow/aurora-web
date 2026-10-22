import { createHash } from "node:crypto";

import type { SupportedGffField } from
  "../../../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import type { AreaCreatureClassSpellReorder } from
  "../../../domain/area-creature-class-spell-reorder";
import type { AreaCreatureClassSpellReplacement } from
  "../../../domain/area-creature-class-spell-replacement";

const MAX_CLASS_SLOTS = 8;
const MAX_CLASS_LEVEL = 60;
const MAX_TOTAL_LEVEL = 180;
const MAX_DETAILED_SPELL_ENTRIES = 256;
const INT_MAX = 0x7fff_ffff;
const WORD_MAX = 0xffff;
const BYTE_MAX = 0xff;
const SPELL_LIST_LABEL = /^(KnownList|MemorizedList)([0-9]|1[0-3])$/u;

export type AreaCreatureClassSpellListKind = "known" | "memorized";

export interface AreaCreatureClassSpellGraphEntry {
  readonly spellId: number;
  readonly spellMetaMagic: number;
  readonly spellFlags: number;
  readonly opaqueSiblingFieldCount: number;
}

export interface AreaCreatureClassSpellListGraph {
  readonly listKind: AreaCreatureClassSpellListKind;
  readonly spellLevel: number;
  readonly entries: readonly AreaCreatureClassSpellGraphEntry[];
}

export interface AreaCreatureClassSpellRemovalTarget {
  readonly classSlotIndex: number;
  readonly listKind: AreaCreatureClassSpellListKind;
  readonly spellLevel: number;
  readonly entryIndex: number;
}

export interface AreaCreatureClassListGraphEntry {
  readonly classId: number;
  readonly level: number;
  readonly opaqueSiblingFieldCount: number;
  readonly canonicalSpellListFieldCount: number;
  readonly spellEntryCount: number;
  readonly spellLists?: readonly AreaCreatureClassSpellListGraph[];
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

function analyzeCanonicalSpellList(
  field: SupportedGffField,
): AreaCreatureClassSpellListGraph | null {
  const label = SPELL_LIST_LABEL.exec(field.label);
  if (!label || field.type !== "list") return null;
  const entries: AreaCreatureClassSpellGraphEntry[] = [];
  for (const entry of field.value) {
    if (entry.typeId !== 3) return null;
    const spell = exactField(entry.fields, "Spell", "word");
    const metamagic = exactField(entry.fields, "SpellMetaMagic", "byte");
    const flags = exactField(entry.fields, "SpellFlags", "byte");
    if (spell?.type !== "word" || metamagic?.type !== "byte" || flags?.type !== "byte" ||
      !isBoundedInteger(spell.value, 0, WORD_MAX) ||
      !isBoundedInteger(metamagic.value, 0, BYTE_MAX) ||
      !isBoundedInteger(flags.value, 0, BYTE_MAX)) return null;
    entries.push(Object.freeze({
      spellId: spell.value,
      spellMetaMagic: metamagic.value,
      spellFlags: flags.value,
      opaqueSiblingFieldCount: entry.fields.length - 3,
    }));
  }
  return Object.freeze({
    listKind: label[1] === "KnownList" ? "known" : "memorized",
    spellLevel: Number(label[2]),
    entries: Object.freeze(entries),
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
  const entries: Array<AreaCreatureClassListGraphEntry & {
    readonly spellLists: readonly AreaCreatureClassSpellListGraph[];
  }> = [];
  for (const entry of field.value) {
    if (entry.typeId !== 2) return null;
    const classField = exactField(entry.fields, "Class", "int");
    const levelField = exactField(entry.fields, "ClassLevel", "short");
    if (classField?.type !== "int" || levelField?.type !== "short" ||
      !isBoundedInteger(classField.value, 0, INT_MAX) ||
      !isBoundedInteger(levelField.value, 1, MAX_CLASS_LEVEL)) return null;
    const spellFields = entry.fields.filter((candidate) => SPELL_LIST_LABEL.test(candidate.label));
    const spellLists = spellFields.map(analyzeCanonicalSpellList);
    if (new Set(spellFields.map((candidate) => candidate.label)).size !== spellFields.length ||
      spellLists.some((candidate) => candidate === null)) return null;
    const orderedSpellLists = (spellLists as AreaCreatureClassSpellListGraph[]).sort(
      (left, right) => spellListOrder(left) - spellListOrder(right),
    );
    entries.push(Object.freeze({
      classId: classField.value,
      level: levelField.value,
      opaqueSiblingFieldCount: entry.fields.length - 2 - spellFields.length,
      canonicalSpellListFieldCount: spellFields.length,
      spellEntryCount: spellFields.reduce(
        (sum, candidate) => sum + (candidate.type === "list" ? candidate.value.length : 0),
        0,
      ),
      spellLists: Object.freeze(orderedSpellLists),
    }));
  }
  if (new Set(entries.map((entry) => entry.classId)).size !== entries.length ||
    entries.reduce((sum, entry) => sum + entry.level, 0) > MAX_TOTAL_LEVEL) return null;
  const detailed = entries.reduce((sum, entry) => sum + entry.spellEntryCount, 0) <=
    MAX_DETAILED_SPELL_ENTRIES;
  return Object.freeze({
    classListGraphSha256: fingerprintAreaCreatureClassListField(field),
    entries: Object.freeze(entries.map((entry) => detailed
      ? entry
      : Object.freeze({
          classId: entry.classId,
          level: entry.level,
          opaqueSiblingFieldCount: entry.opaqueSiblingFieldCount,
          canonicalSpellListFieldCount: entry.canonicalSpellListFieldCount,
          spellEntryCount: entry.spellEntryCount,
        }))),
  });
}

function spellListOrder(value: AreaCreatureClassSpellListGraph): number {
  return (value.listKind === "known" ? 0 : 14) + value.spellLevel;
}

export function removeAreaCreatureClassSpellEntries(
  field: SupportedGffField,
  expectedClassIds: readonly number[],
  expectedLevels: readonly number[],
  targets: readonly AreaCreatureClassSpellRemovalTarget[],
): SupportedGffField | null {
  const analysis = analyzeAreaCreatureClassListField(field);
  if (!analysis || field.type !== "list" || targets.length < 1 ||
    targets.length > MAX_DETAILED_SPELL_ENTRIES ||
    expectedClassIds.length !== analysis.entries.length ||
    expectedLevels.length !== analysis.entries.length ||
    analysis.entries.some((entry, index) => entry.classId !== expectedClassIds[index] ||
      entry.level !== expectedLevels[index] || !entry.spellLists)) return null;

  let previous = -1;
  const selected = new Set<string>();
  for (const target of targets) {
    const order = target.classSlotIndex * 28 * MAX_DETAILED_SPELL_ENTRIES +
      (target.listKind === "known" ? 0 : 14) * MAX_DETAILED_SPELL_ENTRIES +
      target.spellLevel * MAX_DETAILED_SPELL_ENTRIES + target.entryIndex;
    if (!isBoundedInteger(target.classSlotIndex, 0, analysis.entries.length - 1) ||
      (target.listKind !== "known" && target.listKind !== "memorized") ||
      !isBoundedInteger(target.spellLevel, 0, 13) ||
      !isBoundedInteger(target.entryIndex, 0, MAX_DETAILED_SPELL_ENTRIES - 1) ||
      order <= previous) return null;
    const list = analysis.entries[target.classSlotIndex]!.spellLists!.find((candidate) =>
      candidate.listKind === target.listKind && candidate.spellLevel === target.spellLevel);
    if (!list || target.entryIndex >= list.entries.length) return null;
    previous = order;
    selected.add(spellRemovalTargetKey(target));
  }

  return {
    label: "ClassList",
    type: "list",
    value: field.value.map((entry, classSlotIndex) => ({
      typeId: entry.typeId,
      fields: entry.fields.flatMap<SupportedGffField>((candidate): SupportedGffField[] => {
        if (candidate.type !== "list") return [candidate];
        const list = analyzeCanonicalSpellList(candidate);
        if (!list) return [candidate];
        const survivors = candidate.value.filter((_spell, entryIndex) =>
          !selected.has(spellRemovalTargetKey({
            classSlotIndex,
            listKind: list.listKind,
            spellLevel: list.spellLevel,
            entryIndex,
          })));
        if (survivors.length === 0 && candidate.value.length > 0) return [];
        const replacement: SupportedGffField = {
          label: candidate.label,
          type: "list",
          value: survivors,
        };
        return [replacement];
      }),
    })),
  };
}

function spellRemovalTargetKey(target: AreaCreatureClassSpellRemovalTarget): string {
  return `${target.classSlotIndex}:${target.listKind}:${target.spellLevel}:${target.entryIndex}`;
}

export function reorderAreaCreatureClassSpellEntries(
  field: SupportedGffField,
  expectedClassIds: readonly number[],
  expectedLevels: readonly number[],
  reorders: readonly AreaCreatureClassSpellReorder[],
): SupportedGffField | null {
  const analysis = analyzeAreaCreatureClassListField(field);
  if (!analysis || field.type !== "list" || reorders.length < 1 ||
    expectedClassIds.length !== analysis.entries.length ||
    expectedLevels.length !== analysis.entries.length ||
    analysis.entries.some((entry, index) => entry.classId !== expectedClassIds[index] ||
      entry.level !== expectedLevels[index] || !entry.spellLists)) return null;

  const selected = new Map<string, readonly number[]>();
  let previous = -1;
  let totalEntries = 0;
  for (const reorder of reorders) {
    if (!isBoundedInteger(reorder.classSlotIndex, 0, analysis.entries.length - 1) ||
      (reorder.listKind !== "known" && reorder.listKind !== "memorized") ||
      !isBoundedInteger(reorder.spellLevel, 0, 13) || !Array.isArray(reorder.entryOrder)) {
      return null;
    }
    const order = reorder.classSlotIndex * 28 +
      (reorder.listKind === "known" ? 0 : 14) + reorder.spellLevel;
    const list = analysis.entries[reorder.classSlotIndex]!.spellLists!.find((candidate) =>
      candidate.listKind === reorder.listKind && candidate.spellLevel === reorder.spellLevel);
    if (!list || list.entries.length < 2 || reorder.entryOrder.length !== list.entries.length ||
      reorder.entryOrder.some((entry) =>
        !isBoundedInteger(entry, 0, list.entries.length - 1)) ||
      new Set(reorder.entryOrder).size !== list.entries.length ||
      reorder.entryOrder.every((entry, index) => entry === index) || order <= previous) return null;
    totalEntries += reorder.entryOrder.length;
    if (totalEntries > MAX_DETAILED_SPELL_ENTRIES) return null;
    previous = order;
    selected.set(spellListTargetKey(reorder), Object.freeze([...reorder.entryOrder]));
  }

  return {
    label: "ClassList",
    type: "list",
    value: field.value.map((entry, classSlotIndex) => ({
      typeId: entry.typeId,
      fields: entry.fields.map((candidate) => {
        if (candidate.type !== "list") return candidate;
        const list = analyzeCanonicalSpellList(candidate);
        if (!list) return candidate;
        const entryOrder = selected.get(spellListTargetKey({
          classSlotIndex,
          listKind: list.listKind,
          spellLevel: list.spellLevel,
        }));
        return entryOrder
          ? { label: candidate.label, type: "list" as const,
              value: entryOrder.map((index) => candidate.value[index]!) }
          : candidate;
      }),
    })),
  };
}

export function replaceAreaCreatureClassSpellEntries(
  field: SupportedGffField,
  expectedClassIds: readonly number[],
  expectedLevels: readonly number[],
  replacements: readonly AreaCreatureClassSpellReplacement[],
): SupportedGffField | null {
  const analysis = analyzeAreaCreatureClassListField(field);
  if (!analysis || field.type !== "list" || replacements.length < 1 ||
    expectedClassIds.length !== analysis.entries.length ||
    expectedLevels.length !== analysis.entries.length ||
    analysis.entries.some((entry, index) => entry.classId !== expectedClassIds[index] ||
      entry.level !== expectedLevels[index])) return null;

  const byList = new Map<string, Map<number, AreaCreatureClassSpellReplacement>>();
  for (const replacement of replacements) {
    if (!isBoundedInteger(replacement.classSlotIndex, 0, field.value.length - 1) ||
      (replacement.listKind !== "known" && replacement.listKind !== "memorized") ||
      !isBoundedInteger(replacement.spellLevel, 0, 13) ||
      !isBoundedInteger(replacement.entryIndex, 0, MAX_DETAILED_SPELL_ENTRIES - 1) ||
      !isBoundedInteger(replacement.expectedSpellId, 0, WORD_MAX) ||
      !isBoundedInteger(replacement.targetSpellId, 0, WORD_MAX) ||
      replacement.expectedSpellId === replacement.targetSpellId) return null;
    const key = `${replacement.classSlotIndex}:${replacement.listKind}:${replacement.spellLevel}`;
    const entries = byList.get(key) ?? new Map<number, AreaCreatureClassSpellReplacement>();
    if (entries.has(replacement.entryIndex)) return null;
    entries.set(replacement.entryIndex, replacement);
    byList.set(key, entries);
  }

  let changedCount = 0;
  const classEntries: Extract<SupportedGffField, { type: "list" }>["value"] =
    field.value.map((classEntry, classSlotIndex) => ({
    typeId: classEntry.typeId,
    fields: classEntry.fields.map((classField) => {
      const match = SPELL_LIST_LABEL.exec(classField.label);
      if (!match || classField.type !== "list") return classField;
      const listKind = match[1] === "KnownList" ? "known" : "memorized";
      const spellLevel = Number(match[2]);
      const targets = byList.get(`${classSlotIndex}:${listKind}:${spellLevel}`);
      if (!targets) return classField;
      if ([...targets.keys()].some((entryIndex) => entryIndex >= classField.value.length)) {
        return classField;
      }
      const value = classField.value.map((spellEntry, entryIndex) => {
        const replacement = targets.get(entryIndex);
        if (!replacement) return spellEntry;
        const spellMatches = spellEntry.fields.filter((candidate) =>
          candidate.label.toLowerCase() === "spell");
        const spell = spellMatches[0];
        const metamagicMatches = spellEntry.fields.filter((candidate) =>
          candidate.label.toLowerCase() === "spellmetamagic");
        const metamagic = metamagicMatches[0];
        if (spellEntry.typeId !== 3 || spellMatches.length !== 1 ||
          spell?.label !== "Spell" || spell.type !== "word" ||
          spell.value !== replacement.expectedSpellId || metamagicMatches.length !== 1 ||
          metamagic?.label !== "SpellMetaMagic" || metamagic.type !== "byte" ||
          metamagic.value !== 0) return spellEntry;
        changedCount += 1;
        return {
          typeId: spellEntry.typeId,
          fields: spellEntry.fields.map((candidate) => candidate === spell
            ? { label: "Spell", type: "word" as const, value: replacement.targetSpellId }
            : candidate),
        };
      });
      return { label: classField.label, type: "list" as const, value };
    }),
    }));
  return changedCount === replacements.length
    ? { label: "ClassList", type: "list", value: classEntries }
    : null;
}

function spellListTargetKey(target: Pick<AreaCreatureClassSpellReorder,
  "classSlotIndex" | "listKind" | "spellLevel">): string {
  return `${target.classSlotIndex}:${target.listKind}:${target.spellLevel}`;
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

export function clearAreaCreatureClassSpellLists(
  field: SupportedGffField,
  expectedClassIds: readonly number[],
  expectedLevels: readonly number[],
  classSlotIndices: readonly number[],
): SupportedGffField | null {
  const analysis = analyzeAreaCreatureClassListField(field);
  if (!analysis || field.type !== "list" ||
    expectedClassIds.length !== analysis.entries.length ||
    expectedLevels.length !== analysis.entries.length ||
    analysis.entries.some((entry, index) =>
      entry.classId !== expectedClassIds[index] || entry.level !== expectedLevels[index]) ||
    classSlotIndices.length < 1 || classSlotIndices.length > analysis.entries.length ||
    classSlotIndices.some((slotIndex, index) =>
      !Number.isSafeInteger(slotIndex) || slotIndex < 0 ||
      slotIndex >= analysis.entries.length ||
      index > 0 && slotIndex <= classSlotIndices[index - 1]!) ||
    classSlotIndices.some((slotIndex) =>
      analysis.entries[slotIndex]!.canonicalSpellListFieldCount === 0)) return null;

  const selected = new Set(classSlotIndices);
  return {
    label: "ClassList",
    type: "list",
    value: field.value.map((entry, index) => selected.has(index)
      ? {
          typeId: entry.typeId,
          fields: entry.fields.filter((candidate) => !SPELL_LIST_LABEL.test(candidate.label)),
        }
      : entry),
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
