import { createHash } from "node:crypto";
import { z } from "zod";
import {
  AREA_CREATE_COMMAND_SCHEMA_VERSION,
  type AreaCreateCommand,
  type AreaCreateCommandValidationIssue,
  type AreaCreateCommandValidationResult,
  type AreaCreateGroupInstance,
} from "./area-create-command.types";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;
const OPAQUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

const opaqueIdSchema = z.string().regex(OPAQUE_ID_PATTERN);
const opaqueRevisionSchema = z
  .string()
  .min(1)
  .max(256)
  .refine((value) => value.trim() === value, "Revision cannot have surrounding whitespace.");
const sha256Schema = z.string().toLowerCase().regex(SHA256_PATTERN);
const resRefSchema = z.string().trim().toLowerCase().regex(RESREF_PATTERN);
const preservedNonBlankSchema = z
  .string()
  .min(1)
  .max(256)
  .refine((value) => value.trim().length > 0, "Value cannot be blank.");
const byteSchema = z.number().int().min(0).max(255);
const orientationSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);
const coordinateSchema = z.number().int().min(0).max(31);

const tileSchema = z
  .object({
    row: coordinateSchema,
    col: coordinateSchema,
    tileId: z.number().int().min(0).max(0x7fffffff),
    orientation: orientationSchema,
    height: z.number().int().min(0).max(32),
    mainLight1: byteSchema,
    mainLight2: byteSchema,
    sourceLight1: byteSchema,
    sourceLight2: byteSchema,
    animLoop1: byteSchema,
    animLoop2: byteSchema,
    animLoop3: byteSchema,
  })
  .strict();

const groupCellSchema = z
  .object({
    row: coordinateSchema,
    col: coordinateSchema,
  })
  .strict();

const groupInstanceSchema = z
  .object({
    groupId: z.string().trim().toLowerCase().regex(OPAQUE_ID_PATTERN),
    anchorRow: coordinateSchema,
    anchorCol: coordinateSchema,
    orientation: orientationSchema,
    cells: z.array(groupCellSchema).min(1).max(1024),
  })
  .strict();

const commandSchema = z
  .object({
    schemaVersion: z.literal(AREA_CREATE_COMMAND_SCHEMA_VERSION),
    moduleId: opaqueIdSchema,
    expectedModuleRevision: opaqueRevisionSchema,
    creationProfile: z
      .object({
        id: opaqueIdSchema,
        fingerprintSha256: sha256Schema,
      })
      .strict(),
    area: z
      .object({
        name: preservedNonBlankSchema,
        resRef: resRefSchema,
        tag: preservedNonBlankSchema,
      })
      .strict(),
    tileset: z
      .object({
        resRef: resRefSchema,
        setFingerprintSha256: sha256Schema,
      })
      .strict(),
    dimensions: z
      .object({
        width: z.number().int().min(2).max(32),
        height: z.number().int().min(2).max(32),
      })
      .strict(),
    initializer: z
      .object({
        algorithmVersion: opaqueIdSchema,
        seed: z.number().int().min(0).max(0xffffffff),
      })
      .strict(),
    tiles: z.array(tileSchema).max(1024),
    groupInstances: z.array(groupInstanceSchema).max(1024),
    draft: z
      .object({
        id: opaqueIdSchema,
        revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
        normalizedSha256: sha256Schema,
      })
      .strict(),
    clientCommandId: opaqueIdSchema,
  })
  .strict();

type ParsedCommand = z.infer<typeof commandSchema>;

export function validateAndNormalizeAreaCreateCommand(
  input: unknown,
): AreaCreateCommandValidationResult {
  const parsed = commandSchema.safeParse(input);
  if (!parsed.success) {
    return Object.freeze({
      valid: false,
      issues: Object.freeze(
        parsed.error.issues.map((issue) =>
          Object.freeze({
            code:
              issue.code === z.ZodIssueCode.unrecognized_keys
                ? "unknown_field"
                : "invalid_field",
            path: issue.path.length === 0 ? "$" : issue.path.join("."),
            message: issue.message,
          } satisfies AreaCreateCommandValidationIssue),
        ),
      ),
    });
  }

  const structuralIssues = validateStructure(parsed.data);
  if (structuralIssues.length > 0) {
    return Object.freeze({
      valid: false,
      issues: Object.freeze(structuralIssues),
    });
  }

  const normalized = normalizeCommand(parsed.data);
  const canonicalJson = canonicalizeJson(normalized);
  return Object.freeze({
    valid: true,
    value: deepFreeze(normalized),
    canonicalJson,
    commandHash: createHash("sha256").update(canonicalJson, "utf8").digest("hex"),
  });
}

export function canonicalizeAreaCreateCommand(command: AreaCreateCommand): string {
  return canonicalizeJson(command);
}

function validateStructure(
  command: ParsedCommand,
): AreaCreateCommandValidationIssue[] {
  const issues: AreaCreateCommandValidationIssue[] = [];
  const expectedTileCount = command.dimensions.width * command.dimensions.height;

  if (command.tiles.length !== expectedTileCount) {
    issues.push(
      validationIssue(
        "invalid_tile_grid",
        "tiles",
        `Tile count must equal width * height (${expectedTileCount}).`,
      ),
    );
  }

  for (let index = 0; index < command.tiles.length; index += 1) {
    const tile = command.tiles[index];
    const expectedRow = Math.floor(index / command.dimensions.width);
    const expectedCol = index % command.dimensions.width;
    if (tile.row !== expectedRow || tile.col !== expectedCol) {
      issues.push(
        validationIssue(
          "invalid_tile_grid",
          `tiles.${index}`,
          `Tile ${index} must be the row-major cell (${expectedRow}, ${expectedCol}).`,
        ),
      );
    }
  }

  const groupKeys = new Set<string>();
  const occupiedGroupCells = new Set<string>();
  command.groupInstances.forEach((group, groupIndex) => {
    const key = `${group.groupId}:${group.anchorRow}:${group.anchorCol}:${group.orientation}`;
    if (groupKeys.has(key)) {
      issues.push(
        validationIssue(
          "invalid_group_instance",
          `groupInstances.${groupIndex}`,
          "Group instance identity must be unique.",
        ),
      );
    }
    groupKeys.add(key);

    const ownCells = new Set<string>();
    group.cells.forEach((cell, cellIndex) => {
      const cellKey = `${cell.row}:${cell.col}`;
      if (
        cell.row >= command.dimensions.height ||
        cell.col >= command.dimensions.width ||
        ownCells.has(cellKey) ||
        occupiedGroupCells.has(cellKey)
      ) {
        issues.push(
          validationIssue(
            "invalid_group_instance",
            `groupInstances.${groupIndex}.cells.${cellIndex}`,
            "Group cells must be unique, in bounds, and owned by only one declared group.",
          ),
        );
      }
      ownCells.add(cellKey);
      occupiedGroupCells.add(cellKey);
    });
  });

  return issues;
}

function normalizeCommand(command: ParsedCommand): AreaCreateCommand {
  const groupInstances = command.groupInstances
    .map<AreaCreateGroupInstance>((group) => ({
      groupId: group.groupId,
      anchorRow: group.anchorRow,
      anchorCol: group.anchorCol,
      orientation: group.orientation,
      cells: [...group.cells]
        .sort((left, right) => left.row - right.row || left.col - right.col)
        .map((cell) => ({ row: cell.row, col: cell.col })),
    }))
    .sort(compareGroups);

  return {
    schemaVersion: AREA_CREATE_COMMAND_SCHEMA_VERSION,
    moduleId: command.moduleId,
    expectedModuleRevision: command.expectedModuleRevision,
    creationProfile: { ...command.creationProfile },
    area: { ...command.area },
    tileset: { ...command.tileset },
    dimensions: { ...command.dimensions },
    initializer: { ...command.initializer },
    tiles: command.tiles.map((tile) => ({ ...tile })),
    groupInstances,
    draft: { ...command.draft },
    clientCommandId: command.clientCommandId,
  };
}

function compareGroups(
  left: AreaCreateGroupInstance,
  right: AreaCreateGroupInstance,
): number {
  return (
    left.anchorRow - right.anchorRow ||
    left.anchorCol - right.anchorCol ||
    left.groupId.localeCompare(right.groupId) ||
    left.orientation - right.orientation
  );
}

function validationIssue(
  code: AreaCreateCommandValidationIssue["code"],
  path: string,
  message: string,
): AreaCreateCommandValidationIssue {
  return Object.freeze({ code, path, message });
}

function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalizeJson(entry)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(record[key])}`)
    .join(",")}}`;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}
