import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function normalizeToken(value) {
  return String(value ?? "").trim().toLowerCase();
}

function walkFiles(directory, predicate) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) return [];
  const files = [];
  const pending = [path.resolve(directory)];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(entryPath);
      else if (entry.isFile() && predicate(entryPath)) files.push(entryPath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

function sourcePriority(filePath) {
  const normalized = filePath.replaceAll("\\", "/").toLowerCase();
  if (!normalized.includes("/__aurora/sources/")) return 0;
  if (normalized.includes("/__aurora/sources/hak/")) return 1;
  if (normalized.includes("/__aurora/sources/vanilla/")) return 2;
  return 3;
}

function compareSources(left, right) {
  return sourcePriority(left) - sourcePriority(right) ||
    left.split(/[\\/]+/u).length - right.split(/[\\/]+/u).length ||
    left.localeCompare(right);
}

function parseSetInteger(value) {
  const token = String(value ?? "").trim();
  if (!/^-?\d+$/u.test(token)) return null;
  const parsed = Number(token);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

const TILE_TERRAIN_FIELDS = Object.freeze({
  topleft: "topLeft",
  topright: "topRight",
  bottomright: "bottomRight",
  bottomleft: "bottomLeft"
});

const TILE_CROSSER_FIELDS = Object.freeze({
  top: "top",
  right: "right",
  bottom: "bottom",
  left: "left"
});

function parseNamedSetTypes(sections, indexSection, itemPrefix, filePath) {
  const fields = sections.get(indexSection);
  if (!fields) return Object.freeze([]);
  const count = parseSetInteger(fields.get("count"));
  if (count === null || count < 0 || count > sections.size) {
    throw new Error(`Invalid SET ${indexSection} count in ${filePath}.`);
  }
  const types = [];
  for (let index = 0; index < count; index += 1) {
    const id = `${itemPrefix}${index}`;
    const typeFields = sections.get(id);
    if (!typeFields) continue;
    const name = normalizeToken(typeFields.get("name"));
    if (!name) {
      throw new Error(`SET ${id} has no valid Name in ${filePath}.`);
    }
    types.push(Object.freeze({ id, name }));
  }
  return Object.freeze(types);
}

function parseTileTopology(fields, fieldMap) {
  const values = {};
  let present = false;
  for (const [sourceField, outputField] of Object.entries(fieldMap)) {
    if (fields.has(sourceField)) present = true;
    values[outputField] = normalizeToken(fields.get(sourceField)) || null;
  }
  return present ? Object.freeze(values) : null;
}

function parseSetGroups(sections, tiles, filePath) {
  const groupIndex = sections.get("groups");
  if (!groupIndex) {
    return Object.freeze({ groups: Object.freeze([]), groupIdsByTile: new Map() });
  }
  const count = parseSetInteger(groupIndex.get("count"));
  if (count === null || count < 0 || count > sections.size) {
    throw new Error(`Invalid SET group count in ${filePath}.`);
  }
  const knownTileIds = new Set(tiles.map((tile) => tile.tileId));
  const groupIdsByTile = new Map();
  const groups = [];
  for (let index = 0; index < count; index += 1) {
    const groupId = `group${index}`;
    const fields = sections.get(groupId);
    if (!fields) {
      continue;
    }
    const rows = parseSetInteger(fields.get("rows"));
    const columns = parseSetInteger(fields.get("columns"));
    if (
      rows === null ||
      columns === null ||
      rows < 1 ||
      columns < 1 ||
      rows > Number.MAX_SAFE_INTEGER / columns ||
      rows * columns > fields.size
    ) {
      throw new Error(`Invalid SET group dimensions for ${groupId} in ${filePath}.`);
    }
    const tileIds = [];
    for (let memberIndex = 0; memberIndex < rows * columns; memberIndex += 1) {
      const tileId = parseSetInteger(fields.get(`tile${memberIndex}`));
      if (tileId === null) {
        throw new Error(`Group ${groupId} member Tile${memberIndex} is missing or invalid in ${filePath}.`);
      }
      if (tileId === -1) {
        tileIds.push(null);
        continue;
      }
      if (!knownTileIds.has(tileId)) {
        throw new Error(`Group ${groupId} member Tile${memberIndex} references unknown Tile${tileId} in ${filePath}.`);
      }
      tileIds.push(tileId);
    }
    for (const tileId of tileIds) {
      if (tileId === null) continue;
      const groupIds = groupIdsByTile.get(tileId) ?? [];
      groupIds.push(groupId);
      groupIdsByTile.set(tileId, groupIds);
    }
    groups.push(Object.freeze({
      id: groupId,
      name: fields.get("name")?.trim() || `Group ${index}`,
      rows,
      columns,
      tileIds: Object.freeze(tileIds)
    }));
  }
  return Object.freeze({ groups: Object.freeze(groups), groupIdsByTile });
}

function isSourceCorpusSection(section) {
  return section === "general" ||
    section === "groups" ||
    section === "terrain types" ||
    section === "crosser types" ||
    /^tile\d+$/u.test(section) ||
    /^group\d+$/u.test(section) ||
    /^terrain\d+$/u.test(section) ||
    /^crosser\d+$/u.test(section);
}

function parseSetDefinition(filePath) {
  const sections = new Map();
  let section = null;
  for (const [lineIndex, rawLine] of fs
    .readFileSync(filePath, "utf8")
    .replace(/^\uFEFF/u, "")
    .split(/\r?\n/gu)
    .entries()) {
    const line = rawLine.replace(/[;#].*$/u, "").trim();
    const header = line.match(/^\[\s*([^\]]+)\s*\]$/u);
    if (header) {
      section = normalizeToken(header[1]);
      if (!section) {
        throw new Error(`Duplicate or invalid SET section ${section || "<missing>"} at ${filePath}:${lineIndex + 1}.`);
      }
      if (!isSourceCorpusSection(section)) {
        section = null;
        continue;
      }
      if (sections.has(section)) {
        throw new Error(`Duplicate or invalid SET section ${section} at ${filePath}:${lineIndex + 1}.`);
      }
      sections.set(section, new Map());
      continue;
    }
    const assignment = line.match(/^([^=]+?)\s*=\s*(.*?)\s*$/u);
    if (!assignment || !section) continue;
    const key = normalizeToken(assignment[1]);
    const fields = sections.get(section);
    const value = assignment[2].trim().replace(/^"|"$/gu, "");
    if (!key || (fields.has(key) && fields.get(key) !== value)) {
      throw new Error(`Duplicate or invalid SET field ${key || "<missing>"} at ${filePath}:${lineIndex + 1}.`);
    }
    if (!fields.has(key)) fields.set(key, value);
  }
  const general = sections.get("general") ?? new Map();
  const tiles = [];
  const seenTileIds = new Set();
  for (const [name, fields] of sections) {
    const tile = name.match(/^tile(\d+)$/u);
    if (!tile) continue;
    const tileId = Number.parseInt(tile[1], 10);
    if (!Number.isSafeInteger(tileId) || seenTileIds.has(tileId)) {
      throw new Error(`Duplicate or invalid SET tile id ${tile[1]} in ${filePath}.`);
    }
    seenTileIds.add(tileId);
    const modelResRef = normalizeToken(fields.get("model"));
    const terrain = parseTileTopology(fields, TILE_TERRAIN_FIELDS);
    const crossers = parseTileTopology(fields, TILE_CROSSER_FIELDS);
    tiles.push({
      tileId,
      modelResRef: modelResRef || null,
      imageMap2D: fields.get("imagemap2d")?.trim() || null,
      orientation: fields.get("orientation")?.trim() || null,
      ...(terrain ? { terrain } : {}),
      ...(crossers ? { crossers } : {})
    });
  }
  tiles.sort((left, right) => left.tileId - right.tileId);
  const { groups, groupIdsByTile } = parseSetGroups(sections, tiles, filePath);
  const classifiedTiles = tiles.map((tile) => {
    const groupIds = groupIdsByTile.get(tile.tileId);
    return Object.freeze({
      ...tile,
      groupId: groupIds?.[0] ?? null,
      ...(groupIds?.length ? { groupIds: Object.freeze([...groupIds]) } : {})
    });
  });
  return Object.freeze({
    name: general.get("name")?.trim() || null,
    unlocalizedName: general.get("unlocalizedname")?.trim() || null,
    displayNameStrRef: general.get("displayname")?.trim() || null,
    terrainTypes: parseNamedSetTypes(sections, "terrain types", "terrain", filePath),
    crosserTypes: parseNamedSetTypes(sections, "crosser types", "crosser", filePath),
    tiles: Object.freeze(classifiedTiles),
    groups
  });
}

export function loadSelectedAreaTilesetCorpus(sourceRoot) {
  const resolvedSourceRoot = path.resolve(sourceRoot);
  if (!fs.existsSync(resolvedSourceRoot) || !fs.statSync(resolvedSourceRoot).isDirectory()) {
    throw new Error(`Area tileset source root does not exist: ${resolvedSourceRoot}.`);
  }
  const setVariantPaths = walkFiles(
    resolvedSourceRoot,
    (filePath) => filePath.toLowerCase().endsWith(".set")
  );
  const selectedSetByResRef = new Map();
  for (const filePath of [...setVariantPaths].sort(compareSources)) {
    const tilesetResRef = normalizeToken(path.basename(filePath, path.extname(filePath)));
    if (!tilesetResRef || selectedSetByResRef.has(tilesetResRef)) continue;
    selectedSetByResRef.set(tilesetResRef, filePath);
  }
  const selectedTilesets = [...selectedSetByResRef]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([tilesetResRef, setPath]) => Object.freeze({
      tilesetResRef,
      setPath,
      setSha256: createHash("sha256").update(fs.readFileSync(setPath)).digest("hex"),
      definition: parseSetDefinition(setPath)
    }));
  return Object.freeze({
    sourceRoot: resolvedSourceRoot,
    setVariantPaths: Object.freeze(setVariantPaths),
    selectedTilesets: Object.freeze(selectedTilesets),
    selectedByResRef: new Map(selectedTilesets.map((entry) => [entry.tilesetResRef, entry]))
  });
}
