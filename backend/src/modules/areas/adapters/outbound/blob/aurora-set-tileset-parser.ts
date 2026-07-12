import { createHash } from "node:crypto";

export const AURORA_TILE_CORNERS = [
  "topLeft",
  "topRight",
  "bottomRight",
  "bottomLeft"
] as const;

export const AURORA_TILE_EDGES = ["top", "right", "bottom", "left"] as const;

export type AuroraTileCorner = (typeof AURORA_TILE_CORNERS)[number];
export type AuroraTileEdge = (typeof AURORA_TILE_EDGES)[number];

export interface AuroraTilesetDefinitionDiagnostic {
  code: string;
  message: string;
  section: string;
  severity: "warning" | "error";
}

export interface AuroraTilesetTerrainType {
  id: string;
  name: string;
}

export interface AuroraTilesetTransitionRule {
  placedTerrain: string;
  placedHeight: number;
  adjacentTerrain: string;
  adjacentHeight: number;
  changedTerrain: string;
  changedHeight: number;
}

export interface AuroraTilesetTileDefinition {
  tileId: number;
  modelResRef?: string;
  imageMap2D?: string;
  orientation?: 0 | 1 | 2 | 3;
  pathNode?: string;
  visibilityNode?: string;
  visibilityOrientation?: 0 | 1 | 2 | 3;
  doorVisibilityNode?: string;
  doorVisibilityOrientation?: 0 | 1 | 2 | 3;
  terrain: Partial<Record<AuroraTileCorner, string>>;
  crossers: Partial<Record<AuroraTileEdge, string>>;
  cornerHeights: Partial<Record<AuroraTileCorner, number>>;
  mainLight1?: number;
  mainLight2?: number;
  sourceLight1?: number;
  sourceLight2?: number;
  animLoop1?: number;
  animLoop2?: number;
  animLoop3?: number;
  groupId?: string;
}

export interface AuroraTilesetGroupDefinition {
  id: string;
  name: string;
  rows: number;
  columns: number;
  tileIds: readonly number[];
}

export interface AuroraTilesetDefaults {
  interior?: boolean;
  hasHeightTransition?: boolean;
  transition?: number;
  borderTerrain?: string;
  defaultTerrain?: string;
  floorTerrain?: string;
}

export interface AuroraTilesetEditingDefinition {
  schemaVersion: 1;
  tilesetResRef: string;
  fingerprint: string;
  defaults: AuroraTilesetDefaults;
  terrainTypes: readonly AuroraTilesetTerrainType[];
  crosserTypes: readonly AuroraTilesetTerrainType[];
  transitionRules: readonly AuroraTilesetTransitionRule[];
  tiles: readonly AuroraTilesetTileDefinition[];
  groups: readonly AuroraTilesetGroupDefinition[];
  diagnostics: readonly AuroraTilesetDefinitionDiagnostic[];
}

interface IniSection {
  name: string;
  values: ReadonlyMap<string, string>;
}

const CORNER_BY_FIELD: Readonly<Record<string, AuroraTileCorner>> = {
  topleft: "topLeft",
  topright: "topRight",
  bottomright: "bottomRight",
  bottomleft: "bottomLeft"
};

const EDGE_BY_FIELD: Readonly<Record<string, AuroraTileEdge>> = {
  top: "top",
  right: "right",
  bottom: "bottom",
  left: "left"
};

/** Parses the Toolset-relevant Area authoring contract from a retail .SET. */
export function parseAuroraTilesetEditingDefinition(
  bytes: Buffer,
  tilesetResRef: string
): AuroraTilesetEditingDefinition {
  const sections = parseIniSections(bytes);
  const diagnostics: AuroraTilesetDefinitionDiagnostic[] = [];
  const tiles = parseTiles(sections, diagnostics);
  const groups = parseGroups(sections, tiles, diagnostics);
  return {
    schemaVersion: 1,
    tilesetResRef: normalizeResRef(tilesetResRef),
    fingerprint: createHash("sha256").update(bytes).digest("hex"),
    defaults: parseDefaults(sections.get("general")),
    terrainTypes: parseNamedTypes(sections, "terrain", "TERRAIN TYPES", diagnostics),
    crosserTypes: parseNamedTypes(sections, "crosser", "CROSSER TYPES", diagnostics),
    transitionRules: parseTransitionRules(sections, diagnostics),
    tiles: tiles.sort((left, right) => left.tileId - right.tileId),
    groups: groups.sort((left, right) => left.id.localeCompare(right.id)),
    diagnostics
  };
}

function parseIniSections(bytes: Buffer): Map<string, IniSection> {
  const sections = new Map<string, IniSection>();
  let current: { name: string; values: Map<string, string> } | null = null;
  for (const rawLine of bytes.toString("utf8").replace(/^\uFEFF/u, "").split(/\r?\n/gu)) {
    const line = stripComment(rawLine).trim();
    if (!line) {
      continue;
    }
    const sectionMatch = line.match(/^\[\s*([^\]]+)\s*\]$/u);
    if (sectionMatch) {
      const name = sectionMatch[1].trim();
      current = { name, values: new Map<string, string>() };
      sections.set(normalizeKey(name), current);
      continue;
    }
    const assignment = line.match(/^([^=]+?)\s*=\s*(.*?)\s*$/u);
    if (current && assignment) {
      current.values.set(normalizeKey(assignment[1]), stripQuotes(assignment[2]).trim());
    }
  }
  return sections;
}

function parseDefaults(section: IniSection | undefined): AuroraTilesetDefaults {
  if (!section) {
    return {};
  }
  const interior = parseBoolean(section.values.get("interior"));
  const hasHeightTransition = parseBoolean(section.values.get("hasheighttransition"));
  const transition = parseInteger(section.values.get("transition"));
  return {
    ...(interior === undefined ? {} : { interior }),
    ...(hasHeightTransition === undefined ? {} : { hasHeightTransition }),
    ...(transition === undefined ? {} : { transition }),
    ...optionalToken("borderTerrain", section.values.get("border")),
    ...optionalToken("defaultTerrain", section.values.get("default")),
    ...optionalToken("floorTerrain", section.values.get("floor"))
  };
}

function parseNamedTypes(
  sections: ReadonlyMap<string, IniSection>,
  prefix: "terrain" | "crosser",
  countSection: string,
  diagnostics: AuroraTilesetDefinitionDiagnostic[]
): AuroraTilesetTerrainType[] {
  const count = parseCount(sections.get(normalizeKey(countSection)), countSection, diagnostics);
  if (count === undefined) {
    return [];
  }
  const output: AuroraTilesetTerrainType[] = [];
  for (let index = 0; index < count; index += 1) {
    const section = sections.get(`${prefix}${index}`);
    const rawName = section?.values.get("name");
    const id = normalizeToken(rawName);
    if (id) {
      output.push({ id, name: rawName?.trim() ?? id });
    }
  }
  return output;
}

function parseTransitionRules(
  sections: ReadonlyMap<string, IniSection>,
  diagnostics: AuroraTilesetDefinitionDiagnostic[]
): AuroraTilesetTransitionRule[] {
  const count = parseCount(sections.get("primaryrules"), "PRIMARY RULES", diagnostics);
  if (count === undefined) {
    return [];
  }
  const output: AuroraTilesetTransitionRule[] = [];
  for (let index = 0; index < count; index += 1) {
    const name = `PRIMARY RULE${index}`;
    const section = sections.get(normalizeKey(name));
    if (!section) {
      continue;
    }
    const placedTerrain = normalizeToken(section.values.get("placed"));
    const adjacentTerrain = normalizeToken(section.values.get("adjacent"));
    const changedTerrain = normalizeToken(section.values.get("changed"));
    const placedHeight = parseInteger(section.values.get("placedheight"));
    const adjacentHeight = parseInteger(section.values.get("adjacentheight"));
    const changedHeight = parseInteger(section.values.get("changedheight"));
    if (!placedTerrain || !adjacentTerrain || !changedTerrain) {
      continue;
    }
    if (placedHeight === undefined || adjacentHeight === undefined || changedHeight === undefined) {
      diagnostics.push({
        code: "INVALID_RULE_HEIGHT",
        message: "Primary rule heights must be integers.",
        section: name,
        severity: "warning"
      });
      continue;
    }
    output.push({
      placedTerrain,
      placedHeight,
      adjacentTerrain,
      adjacentHeight,
      changedTerrain,
      changedHeight
    });
  }
  return output;
}

function parseTiles(
  sections: ReadonlyMap<string, IniSection>,
  diagnostics: AuroraTilesetDefinitionDiagnostic[]
): AuroraTilesetTileDefinition[] {
  const count = parseCount(sections.get("tiles"), "TILES", diagnostics);
  if (count === undefined) {
    return [];
  }
  const output: AuroraTilesetTileDefinition[] = [];
  for (let tileId = 0; tileId < count; tileId += 1) {
    const name = `TILE${tileId}`;
    const section = sections.get(normalizeKey(name));
    if (!section) {
      continue;
    }
    const terrain: Partial<Record<AuroraTileCorner, string>> = {};
    const crossers: Partial<Record<AuroraTileEdge, string>> = {};
    const cornerHeights: Partial<Record<AuroraTileCorner, number>> = {};
    for (const [field, corner] of Object.entries(CORNER_BY_FIELD)) {
      const terrainToken = normalizeToken(section.values.get(field));
      if (terrainToken) {
        terrain[corner] = terrainToken;
      }
      const height = parseInteger(section.values.get(`${field}height`));
      if (section.values.has(`${field}height`) && height === undefined) {
        diagnostics.push({
          code: "INVALID_TILE_HEIGHT",
          message: "Tile corner height must be an integer.",
          section: name,
          severity: "warning"
        });
      } else if (height !== undefined) {
        cornerHeights[corner] = height;
      }
    }
    for (const [field, edge] of Object.entries(EDGE_BY_FIELD)) {
      const crosser = normalizeToken(section.values.get(field));
      if (crosser) {
        crossers[edge] = crosser;
      }
    }
    const orientation = parseOrientation(section.values.get("orientation"));
    if (section.values.has("orientation") && orientation === undefined) {
      diagnostics.push({
        code: "INVALID_TILE_ORIENTATION",
        message: "Tile orientation must be a multiple of 90 degrees.",
        section: name,
        severity: "warning"
      });
    }
    const visibilityOrientation = parseOrientation(section.values.get("visibilityorientation"));
    const doorVisibilityOrientation = parseOrientation(section.values.get("doorvisibilityorientation"));
    output.push({
      tileId,
      ...optionalResRef("modelResRef", section.values.get("model")),
      ...optionalResRef("imageMap2D", section.values.get("imagemap2d")),
      ...(orientation === undefined ? {} : { orientation }),
      ...optionalToken("pathNode", section.values.get("pathnode")),
      ...optionalToken("visibilityNode", section.values.get("visibilitynode")),
      ...(visibilityOrientation === undefined ? {} : { visibilityOrientation }),
      ...optionalToken("doorVisibilityNode", section.values.get("doorvisibilitynode")),
      ...(doorVisibilityOrientation === undefined ? {} : { doorVisibilityOrientation }),
      terrain,
      crossers,
      cornerHeights,
      ...optionalInteger("mainLight1", section.values.get("mainlight1")),
      ...optionalInteger("mainLight2", section.values.get("mainlight2")),
      ...optionalInteger("sourceLight1", section.values.get("sourcelight1")),
      ...optionalInteger("sourceLight2", section.values.get("sourcelight2")),
      ...optionalInteger("animLoop1", section.values.get("animloop1")),
      ...optionalInteger("animLoop2", section.values.get("animloop2")),
      ...optionalInteger("animLoop3", section.values.get("animloop3"))
    });
  }
  return output;
}

function parseGroups(
  sections: ReadonlyMap<string, IniSection>,
  tiles: AuroraTilesetTileDefinition[],
  diagnostics: AuroraTilesetDefinitionDiagnostic[]
): AuroraTilesetGroupDefinition[] {
  const count = parseCount(sections.get("groups"), "GROUPS", diagnostics);
  if (count === undefined) {
    return [];
  }
  const knownTileIds = new Set(tiles.map((tile) => tile.tileId));
  const groupByTile = new Map<number, string>();
  const output: AuroraTilesetGroupDefinition[] = [];
  for (let index = 0; index < count; index += 1) {
    const name = `GROUP${index}`;
    const section = sections.get(normalizeKey(name));
    if (!section) {
      continue;
    }
    const rows = parseInteger(section.values.get("rows"));
    const columns = parseInteger(section.values.get("columns"));
    if (rows === undefined || columns === undefined || rows < 1 || columns < 1) {
      diagnostics.push({
        code: "INVALID_GROUP_DIMENSIONS",
        message: "Group Rows and Columns must be positive integers.",
        section: name,
        severity: "error"
      });
      continue;
    }
    const id = `group${index}`;
    const members: number[] = [];
    let complete = true;
    for (let memberIndex = 0; memberIndex < rows * columns; memberIndex += 1) {
      const tileId = parseInteger(section.values.get(`tile${memberIndex}`));
      if (tileId === undefined) {
        diagnostics.push({
          code: "GROUP_MEMBER_MISSING",
          message: `Group member Tile${memberIndex} is missing.`,
          section: name,
          severity: "error"
        });
        complete = false;
      } else if (!knownTileIds.has(tileId)) {
        diagnostics.push({
          code: "GROUP_MEMBER_UNKNOWN_TILE",
          message: `Group member Tile${memberIndex} references missing Tile${tileId}.`,
          section: name,
          severity: "error"
        });
        complete = false;
      } else if (groupByTile.has(tileId)) {
        diagnostics.push({
          code: "TILE_IN_MULTIPLE_GROUPS",
          message: `Tile${tileId} already belongs to ${groupByTile.get(tileId)}.`,
          section: name,
          severity: "error"
        });
        complete = false;
      } else {
        members.push(tileId);
      }
    }
    if (!complete) {
      continue;
    }
    for (const tileId of members) {
      groupByTile.set(tileId, id);
    }
    output.push({
      id,
      name: section.values.get("name")?.trim() || `Group ${index}`,
      rows,
      columns,
      tileIds: members
    });
  }
  for (const tile of tiles) {
    const groupId = groupByTile.get(tile.tileId);
    if (groupId) {
      tile.groupId = groupId;
    }
  }
  return output;
}

function parseCount(
  section: IniSection | undefined,
  sectionName: string,
  diagnostics: AuroraTilesetDefinitionDiagnostic[]
): number | undefined {
  if (!section) {
    return undefined;
  }
  const count = parseInteger(section.values.get("count"));
  if (count === undefined || count < 0) {
    diagnostics.push({
      code: "INVALID_COUNT",
      message: "Count must be a non-negative integer.",
      section: sectionName,
      severity: "warning"
    });
    return undefined;
  }
  return count;
}

function parseInteger(value: string | undefined): number | undefined {
  const normalized = value?.trim();
  if (!normalized || !/^[+-]?\d+$/u.test(normalized)) {
    return undefined;
  }
  const parsed = Number.parseInt(normalized, 10);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  const normalized = value?.trim().toLowerCase();
  if (["1", "true", "yes"].includes(normalized ?? "")) {
    return true;
  }
  if (["0", "false", "no"].includes(normalized ?? "")) {
    return false;
  }
  return undefined;
}

function parseOrientation(value: string | undefined): 0 | 1 | 2 | 3 | undefined {
  const degrees = Number.parseFloat(value ?? "");
  if (!Number.isFinite(degrees) || Math.abs(degrees % 90) > 1e-6) {
    return undefined;
  }
  const quarterTurns = Math.round(degrees / 90);
  return ((quarterTurns % 4 + 4) % 4) as 0 | 1 | 2 | 3;
}

function optionalToken<TKey extends string>(
  key: TKey,
  value: string | undefined
): { [K in TKey]?: string } {
  const normalized = normalizeToken(value);
  return normalized ? ({ [key]: normalized } as { [K in TKey]: string }) : {};
}

function optionalResRef<TKey extends string>(
  key: TKey,
  value: string | undefined
): { [K in TKey]?: string } {
  const normalized = normalizeResRef(value ?? "");
  return normalized ? ({ [key]: normalized } as { [K in TKey]: string }) : {};
}

function optionalInteger<TKey extends string>(
  key: TKey,
  value: string | undefined
): { [K in TKey]?: number } {
  const parsed = parseInteger(value);
  return parsed === undefined ? {} : ({ [key]: parsed } as { [K in TKey]: number });
}

function normalizeToken(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized || undefined;
}

function normalizeResRef(value: string): string {
  return value.trim().replace(/^"|"$/gu, "").toLowerCase().slice(0, 16);
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')
    ? trimmed.slice(1, -1)
    : trimmed;
}

function stripComment(line: string): string {
  const positions = [line.indexOf(";"), line.indexOf("//")].filter((index) => index >= 0);
  return positions.length === 0 ? line : line.slice(0, Math.min(...positions));
}
