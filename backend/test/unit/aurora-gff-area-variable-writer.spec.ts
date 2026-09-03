import { createHash } from "node:crypto";
import {
  parseAreaVariablesFromGitGff,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import {
  updateGitAreaVariables,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-variable-writer";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import type { ExistingAreaVariableMutation } from "../../src/modules/areas/domain/area-variable-table";

describe("Aurora top-level GIT Area VarTable writer", () => {
  const sourceEntries = [
    { sourceIndex: 0, name: "DUPLICATE", type: "int" as const, value: -7 },
    { sourceIndex: 1, name: "DUPLICATE", type: "float" as const, value: Math.fround(1.25) },
    { sourceIndex: 2, name: "TEXT", type: "string" as const, value: " source " },
  ];

  it("replaces one exact root VarTable and preserves siblings, type, order, and duplicates", () => {
    const source = git([variableField(sourceEntries)], [
      { label: "CustomRoot", type: "void", value: Buffer.from([1, 2, 3, 4]) },
    ]);
    const target = [
      { name: "DUPLICATE", type: "float" as const, value: Math.fround(-2.5) },
      { name: "DUPLICATE", type: "int" as const, value: 42 },
      { name: "TEXT", type: "string" as const, value: " target " },
      { name: "NEW", type: "string" as const, value: "created" },
    ];

    const result = updateGitAreaVariables(source, {
      expectedEntries: sourceEntries,
      entries: target,
      sourceGitSha256: sha256(source),
    });

    expect(result.variables).toEqual({
      expectedEntries: target.map((entry, sourceIndex) => ({ ...entry, sourceIndex })),
    });
    expect(parseAreaVariablesFromGitGff(result.bytes)).toEqual(result.variables);
    const document = parseRawGffDocument(result.bytes);
    expect(document).toMatchObject({
      fileType: "GIT ",
      fileVersion: "V3.2",
      rootStructTypeId: 0xffff_ffff,
    });
    expect(document?.fields.find((field) => field.label === "CustomRoot")).toEqual({
      label: "CustomRoot",
      type: "void",
      value: Buffer.from([1, 2, 3, 4]),
    });
    expect(document?.fields.find((field) => field.label === "VarTable")).toEqual(
      variableField(target.map((entry, sourceIndex) => ({ ...entry, sourceIndex }))),
    );
    expect(source.equals(git([variableField(sourceEntries)], [
      { label: "CustomRoot", type: "void", value: Buffer.from([1, 2, 3, 4]) },
    ]))).toBe(true);
  });

  it("materializes an admitted absent VarTable before native object lists", () => {
    const source = git([], [{ label: "CustomRoot", type: "int", value: 9 }]);
    const target = [{ name: "CREATED", type: "int" as const, value: 1 }];
    expect(parseAreaVariablesFromGitGff(source)).toEqual({ expectedEntries: [] });

    const result = updateGitAreaVariables(source, {
      expectedEntries: [],
      entries: target,
      sourceGitSha256: sha256(source),
    });
    const document = parseRawGffDocument(result.bytes);
    expect(document?.fields.map((field) => field.label)).toEqual([
      "CustomRoot",
      "VarTable",
      "Placeable List",
    ]);
    expect(result.variables.expectedEntries).toEqual([
      { sourceIndex: 0, name: "CREATED", type: "int", value: 1 },
    ]);
  });

  it("removes VarTable completely for an empty target", () => {
    const source = git([variableField(sourceEntries)]);
    const result = updateGitAreaVariables(source, {
      expectedEntries: sourceEntries,
      entries: [],
      sourceGitSha256: sha256(source),
    });

    expect(parseRawGffDocument(result.bytes)?.fields.map((field) => field.label))
      .not.toContain("VarTable");
    expect(result.variables).toEqual({ expectedEntries: [] });
  });

  it("is deterministic for the same exact source and mutation", () => {
    const source = git([variableField(sourceEntries)]);
    const mutation = {
      expectedEntries: sourceEntries,
      entries: [{ name: "ONLY", type: "string" as const, value: "same" }],
      sourceGitSha256: sha256(source),
    };
    expect(updateGitAreaVariables(source, mutation).bytes)
      .toEqual(updateGitAreaVariables(source, mutation).bytes);
  });

  it("composes after an independent GIT mutation while retaining original source lineage", () => {
    const source = git([variableField(sourceEntries)], [
      { label: "CustomRoot", type: "int", value: 1 },
    ]);
    const parsed = parseRawGffDocument(source)!;
    const candidate = buildGffBuffer(
      parsed.fields.map((field) => field.label === "CustomRoot"
        ? { label: "CustomRoot", type: "int" as const, value: 2 }
        : field),
      parsed.fileType,
      parsed.rootStructTypeId,
    );
    const target = [{ name: "NEXT", type: "string" as const, value: "composed" }];

    const result = updateGitAreaVariables(candidate, {
      expectedEntries: sourceEntries,
      entries: target,
      sourceGitSha256: sha256(source),
    }, source);

    expect(parseRawGffDocument(result.bytes)?.fields.find(
      (field) => field.label === "CustomRoot",
    )).toEqual({ label: "CustomRoot", type: "int", value: 2 });
    expect(result.variables.expectedEntries).toEqual([
      { sourceIndex: 0, name: "NEXT", type: "string", value: "composed" },
    ]);
  });

  it.each([
    ["stale source digest", (source: Buffer) => ({
      expectedEntries: sourceEntries,
      entries: [{ name: "NEXT", type: "int" as const, value: 1 }],
      sourceGitSha256: "0".repeat(64),
    })],
    ["stale expected entries", (source: Buffer) => ({
      expectedEntries: [{ ...sourceEntries[0]!, value: 99 }],
      entries: [{ name: "NEXT", type: "int" as const, value: 1 }],
      sourceGitSha256: sha256(source),
    })],
    ["unchanged entries", (source: Buffer) => ({
      expectedEntries: sourceEntries,
      entries: sourceEntries.map(({ sourceIndex: _sourceIndex, ...entry }) => entry),
      sourceGitSha256: sha256(source),
    })],
    ["invalid target", (source: Buffer) => ({
      expectedEntries: sourceEntries,
      entries: [{ name: "BAD", type: "float" as const, value: 0.1 }],
      sourceGitSha256: sha256(source),
    })],
  ])("rejects %s", (_label, mutation) => {
    const source = git([variableField(sourceEntries)]);
    expect(() => updateGitAreaVariables(
      source,
      mutation(source) as unknown as ExistingAreaVariableMutation,
    )).toThrow();
  });

  it.each([
    ["wrong-case root", [{ ...variableField(sourceEntries), label: "vartable" }]],
    ["duplicate root", [variableField(sourceEntries), variableField(sourceEntries)]],
    ["wrong root type", [{ label: "VarTable", type: "cexostring" as const, value: "bad" }]],
  ])("rejects a malformed %s profile", (_label, fields) => {
    const source = git(fields);
    expect(parseAreaVariablesFromGitGff(source)).toBeNull();
    expect(() => updateGitAreaVariables(source, {
      expectedEntries: sourceEntries,
      entries: [{ name: "NEXT", type: "int", value: 1 }],
      sourceGitSha256: sha256(source),
    })).toThrow();
  });
});

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function git(
  prefixFields: SupportedGffField[],
  extraPrefixFields: SupportedGffField[] = [],
): Buffer {
  return buildGffBuffer([
    ...extraPrefixFields,
    ...prefixFields,
    {
      label: "Placeable List",
      type: "list",
      value: [{
        typeId: 9,
        fields: [{ label: "Tag", type: "cexostring", value: "untouched" }],
      }],
    },
  ], "GIT ", 0xffff_ffff);
}

function variableField(
  entries: readonly Readonly<{
    sourceIndex: number;
    name: string;
    type: "int" | "float" | "string";
    value: number | string;
  }>[],
): SupportedGffField {
  return {
    label: "VarTable",
    type: "list",
    value: entries.map((entry) => ({
      typeId: 0,
      fields: [
        { label: "Name", type: "cexostring", value: entry.name },
        { label: "Type", type: "dword", value: entry.type === "int" ? 1 : entry.type === "float" ? 2 : 3 },
        entry.type === "int"
          ? { label: "Value", type: "int", value: entry.value as number }
          : entry.type === "float"
            ? { label: "Value", type: "float", value: entry.value as number }
            : { label: "Value", type: "cexostring", value: entry.value as string },
      ],
    })),
  };
}
