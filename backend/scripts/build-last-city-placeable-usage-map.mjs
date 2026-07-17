#!/usr/bin/env node
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: "CommonJS",
  moduleResolution: "node"
});
require("ts-node/register/transpile-only");

const {
  parseAreaMetadataFromAreGff,
  parseAreaObjectsFromGitGff
} = require("../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser");

const RESOURCE_TYPES = {
  are: 2012,
  git: 2023
};

const backendRoot = resolve(import.meta.dirname, "..");
const repoRoot = resolve(backendRoot, "..");
const outputSuffix = process.env.AURORA_LAST_CITY_PLACEABLE_MAP_SUFFIX
  ? `-${process.env.AURORA_LAST_CITY_PLACEABLE_MAP_SUFFIX.replace(/[^a-z0-9_-]/giu, "-")}`
  : "";
const outputRoot = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  `last-city-placeable-usage-map${outputSuffix}`
);
const docsOutputPath = resolve(repoRoot, "docs", `LAST_CITY_PLACEABLE_USAGE_MAP_2026-07-02${outputSuffix}.md`);

const MANUAL_AREA_CATEGORIES = new Map([
  ["claude_pr_01", ["apartment_poor", "named slums flat from housing audit"]],
  ["mtt_hire_pr_1", ["apartment_poor", "pr/hire residential interior"]],
  ["mtt_hire_pr_2", ["apartment_poor", "pr/hire residential interior"]],
  ["mtt_hire_pr_3", ["apartment_poor", "pr/hire residential interior"]],
  ["njkb_hire_pr_1", ["apartment_poor", "pr/hire residential interior"]],
  ["njkb_brglr_pr_1", ["apartment_poor", "poor burglary residential interior"]],
  ["njkb_brglr_pr_2", ["apartment_poor", "poor burglary residential interior"]],
  ["njkb_brglr_pr_3", ["apartment_poor", "poor burglary residential interior"]],
  ["njkb_brglr_pr_4", ["apartment_poor", "poor burglary residential interior"]],

  ["enon_house_2", ["apartment_middle", "small production house"]],
  ["enon_house_5", ["apartment_middle", "small production house"]],
  ["enon_house_7", ["apartment_middle", "production house"]],
  ["mtt_hire_md_1", ["apartment_middle", "md/hire residential interior"]],
  ["mtt_hire_md_2", ["apartment_middle", "md/hire residential interior"]],
  ["njkb_hire_md_1", ["apartment_middle", "md/hire residential interior"]],
  ["njkb_brglr_md_1", ["apartment_middle", "md burglary residential interior"]],
  ["njkb_brglr_md_2", ["apartment_middle", "md burglary residential interior"]],
  ["njkb_brglr_md_3", ["apartment_middle", "md burglary residential interior"]],

  ["enon_house_1", ["apartment_rich", "heavy furnished production house"]],
  ["enon_house_3", ["apartment_rich", "heavy furnished production house"]],
  ["enon_house_4", ["apartment_rich", "larger production house"]],
  ["enon_house_6", ["apartment_rich", "sic11 heavy furnished production house"]],
  ["mar_house_1", ["apartment_rich", "heavy furnished production house"]],
  ["mtt_hire_rch_1", ["apartment_rich", "rch/hire residential interior"]],
  ["njkb_brglr_rch_3", ["apartment_rich", "rich burglary residential interior"]],
  ["cdx_mapflat01", ["apartment_rich", "codex-built port cartographer apartment"]],

  ["wnd_tmplt_flat_1", ["apartment_template", "template flat"]],
  ["wnd_tmplt_flat_2", ["apartment_template", "template flat"]],
  ["wnd_tmplt_flat_3", ["apartment_template", "template flat"]],
  ["wnd_tmplt_flat_4", ["apartment_template", "template flat"]],
  ["wnd_tmplt_flat_5", ["apartment_template", "template flat"]],
  ["enon_test_house", ["apartment_template", "test copy of residential interior"]],
  ["enon_test_burgla", ["apartment_template", "burglary test area"]],
  ["_winds_study", ["apartment_template", "study/test fragment"]],
  ["_winds_houses", ["apartment_template", "house template/outdoor group"]],

  ["wnd_port_brothel", ["tavern_brothel", "brothel service interior"]],
  ["wnd_port_brthl_u", ["tavern_brothel", "brothel upper floor"]],
  ["mar_tavern_base", ["tavern_brothel", "tavern base"]],
  ["tavern_2", ["tavern_brothel", "tavern"]],
  ["pmpn_tygielv2", ["tavern_brothel", "tavern"]],
  ["wnd_tavern", ["tavern_brothel", "tavern"]],
  ["wnd_tavern_base", ["tavern_brothel", "tavern base"]],

  ["hx_descent_serw", ["residential_ruin", "destroyed tenement from housing audit"]],
  ["wnd_hyena", ["residential_ruin", "large old ruin from housing audit"]],
  ["wnd_rene_quarter", ["residential_ruin", "quarter/large residential-like area"]]
]);

function getNwnUserRoot() {
  const home = process.env.USERPROFILE ?? process.env.HOME;
  if (!home) {
    throw new Error("USERPROFILE/HOME is required to locate Neverwinter Nights documents.");
  }
  return join(home, "Documents", "Neverwinter Nights");
}

async function findTargetModulePath() {
  if (process.env.AURORA_LAST_CITY_MODULE_PATH) {
    return resolve(process.env.AURORA_LAST_CITY_MODULE_PATH);
  }
  const modulesDir = join(getNwnUserRoot(), "modules");
  const names = await readdir(modulesDir);
  const exact = names.find(
    (name) =>
      name.startsWith("the_last_city") &&
      name.endsWith("codex.mod") &&
      !name.includes("vfx") &&
      !name.includes("new") &&
      !name.includes("pre-")
  );
  if (!exact) {
    throw new Error(`Could not find exact the_last_city codex module in ${modulesDir}`);
  }
  return join(modulesDir, exact);
}

function readErfEntries(bytes, sourcePath) {
  if (bytes.length < 160) {
    throw new Error(`ERF file is too small: ${sourcePath}`);
  }

  const signature = bytes.toString("ascii", 0, 4);
  const version = bytes.toString("ascii", 4, 8);
  if (!["MOD ", "HAK ", "ERF ", "NWM "].includes(signature)) {
    throw new Error(`Unsupported ERF signature ${JSON.stringify(signature)} in ${sourcePath}`);
  }
  if (version !== "V1.0" && version !== "V1.1") {
    throw new Error(`Unsupported ERF version ${JSON.stringify(version)} in ${sourcePath}`);
  }

  const keyEntrySize = version === "V1.1" ? 40 : 24;
  const resrefLength = version === "V1.1" ? 32 : 16;
  const entryCount = bytes.readUInt32LE(16);
  const keyListOffset = bytes.readUInt32LE(24);
  const resourceListOffset = bytes.readUInt32LE(28);

  const entries = [];
  for (let index = 0; index < entryCount; index += 1) {
    const keyOffset = keyListOffset + index * keyEntrySize;
    const resourceOffset = resourceListOffset + index * 8;
    const resref = bytes
      .subarray(keyOffset, keyOffset + resrefLength)
      .toString("ascii")
      .replace(/\0.*$/u, "")
      .trim()
      .toLowerCase();
    const type = bytes.readUInt16LE(keyOffset + resrefLength + 4);
    const dataOffset = bytes.readUInt32LE(resourceOffset);
    const size = bytes.readUInt32LE(resourceOffset + 4);
    entries.push({
      resref,
      type,
      size,
      bytes: Buffer.from(bytes.subarray(dataOffset, dataOffset + size))
    });
  }
  return entries;
}

function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function classifyArea(resref, name, metadata, placeableCount) {
  const key = normalizeKey(resref);
  const manual = MANUAL_AREA_CATEGORIES.get(key);
  if (manual) {
    return { category: manual[0], reason: manual[1], method: "manual_audit_seed" };
  }

  const text = `${key} ${normalizeKey(name)} ${normalizeKey(metadata?.tileSet)}`;
  if (text.includes("warehouse") || text.includes("shipyard") || text.includes("port")) {
    return { category: "port_storage", reason: "name/resref suggests port or storage", method: "heuristic" };
  }
  if (text.includes("shop") || text.includes("market") || text.includes("bakery") || text.includes("butcher")) {
    return { category: "shop_market", reason: "name/resref suggests shop or market", method: "heuristic" };
  }
  if (text.includes("guild") || text.includes("merchant")) {
    return { category: "guild_merchant", reason: "name/resref suggests guild/merchant interior", method: "heuristic" };
  }
  if (text.includes("sewer") || text.includes("catacomb") || text.includes("crypt") || text.includes("necropolis")) {
    return { category: "underground_dungeon", reason: "name/resref suggests sewer/catacomb/crypt", method: "heuristic" };
  }
  if (text.includes("cave") || text.includes("mine")) {
    return { category: "cave_nature", reason: "name/resref suggests cave/nature", method: "heuristic" };
  }
  if (text.includes("test") || text.includes("tmplt") || text.startsWith("_")) {
    return { category: "test_template", reason: "test/template naming", method: "heuristic" };
  }
  if (placeableCount >= 300) {
    return { category: "dense_other", reason: "high placeable density without manual category", method: "heuristic" };
  }
  return { category: "other", reason: "no manual category or strong heuristic", method: "heuristic" };
}

function classifyPlaceable(templateResRef, tag, localizedName) {
  const text = `${normalizeKey(templateResRef)} ${normalizeKey(tag)} ${normalizeKey(localizedName)}`;
  const checks = [
    ["maps_books_papers", /map|chart|papier|paper|scroll|book|ksieg|ksiaz|shelf|hourglass|sphere|globe/u],
    ["sleep_private", /bed|mattress|pillow|wardrobe|clothing|commode|mirror|wash|laundry/u],
    ["tables_seating", /table|desk|chair|bench|stool|counter|tbl|biurko|krzes|lawka/u],
    ["lighting_fire", /candle|swiec|swiecz|lightnode|campfire|fireplace|torch|lantern|lamp/u],
    ["storage_containers", /crate|barrel|chest|cask|box|sack|bag|pallet|cabinet|safe|coffer|kuf|skrzyn|beczk/u],
    ["textiles_rugs", /rug|carpet|tapestry|curtain|fabric|fur|dywan|gobelin|zaslon/u],
    ["food_drink_kitchen", /bottle|cup|mug|jug|plate|food|bread|meat|fish|kitchen|bowl|ham|turkey|wine|beer/u],
    ["plants_vases", /plant|flower|vase|potted|planter|bonsai|tree|roslin|wazon|kwiet/u],
    ["decor_status", /painting|statue|trophy|armor|piano|bear|dekor|obraz|statua|trofe/u],
    ["tools_port_work", /rope|tool|broom|bucket|ladder|anchor|ship|sail|net|wheel|narzed|miot|wiadro/u],
    ["overlays_grime_floor", /floor|dirt|splat|blood|water|grass|fog|brud|bruk|podlog/u],
    ["structural_windows_walls", /window|wall|door|gate|fence|screen|okno|sciana|plot/u]
  ];
  const match = checks.find(([, pattern]) => pattern.test(text));
  return match?.[0] ?? "misc";
}

function incrementMap(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function addSetSample(set, value, limit = 8) {
  if (!value || set.size >= limit) {
    return;
  }
  set.add(value);
}

function topEntries(map, limit = 12) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/u.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function toMarkdownTable(rows, columns) {
  const markdownCell = (value) =>
    String(value ?? "")
      .replaceAll("|", "\\|")
      .replace(/\r?\n/gu, " ")
      .trim();
  return [
    `| ${columns.map((column) => column.label).join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${columns.map((column) => markdownCell(row[column.key])).join(" | ")} |`)
  ].join("\n");
}

async function main() {
  const generatedAt = new Date().toISOString();
  const modulePath = await findTargetModulePath();
  const moduleBytes = await readFile(modulePath);
  const entries = readErfEntries(moduleBytes, modulePath);

  const areByResref = new Map(entries.filter((entry) => entry.type === RESOURCE_TYPES.are).map((entry) => [entry.resref, entry]));
  const gitByResref = new Map(entries.filter((entry) => entry.type === RESOURCE_TYPES.git).map((entry) => [entry.resref, entry]));

  const areaSummaries = [];
  const templateSummaries = new Map();
  const categoryStats = new Map();
  const instanceRows = [];

  for (const [resref, areEntry] of areByResref.entries()) {
    const gitEntry = gitByResref.get(resref);
    if (!gitEntry) {
      continue;
    }

    const metadata = parseAreaMetadataFromAreGff(areEntry.bytes);
    const objects = parseAreaObjectsFromGitGff(gitEntry.bytes);
    const placeables = objects.placeables ?? [];
    const areaCategory = classifyArea(resref, metadata.name ?? resref, metadata, placeables.length);
    const areaTemplateCounts = new Map();
    const areaRoleCounts = new Map();

    const categoryRecord =
      categoryStats.get(areaCategory.category) ??
      {
        category: areaCategory.category,
        areaCount: 0,
        placeableInstances: 0,
        uniqueTemplates: new Set(),
        roleCounts: new Map(),
        topTemplates: new Map(),
        exampleAreas: []
      };
    categoryRecord.areaCount += 1;
    categoryRecord.placeableInstances += placeables.length;
    if (categoryRecord.exampleAreas.length < 12) {
      categoryRecord.exampleAreas.push(resref);
    }
    categoryStats.set(areaCategory.category, categoryRecord);

    placeables.forEach((placeable, index) => {
      const templateResRef = placeable.templateResRef ?? "";
      const templateKey = normalizeKey(templateResRef || placeable.tag || "unknown");
      const role = classifyPlaceable(templateResRef, placeable.tag, placeable.localizedName);
      incrementMap(areaTemplateCounts, templateKey);
      incrementMap(areaRoleCounts, role);
      incrementMap(categoryRecord.roleCounts, role);
      incrementMap(categoryRecord.topTemplates, templateKey);
      categoryRecord.uniqueTemplates.add(templateKey);

      const templateRecord =
        templateSummaries.get(templateKey) ??
        {
          templateResRef: templateKey,
          roles: new Map(),
          totalInstances: 0,
          areaCounts: new Map(),
          categoryCounts: new Map(),
          displayNames: new Set(),
          tags: new Set(),
          sampleInstances: []
        };
      templateRecord.totalInstances += 1;
      incrementMap(templateRecord.roles, role);
      incrementMap(templateRecord.areaCounts, resref);
      incrementMap(templateRecord.categoryCounts, areaCategory.category);
      addSetSample(templateRecord.displayNames, placeable.localizedName);
      addSetSample(templateRecord.tags, placeable.tag);
      if (templateRecord.sampleInstances.length < 5) {
        templateRecord.sampleInstances.push({
          areaResref: resref,
          areaName: metadata.name ?? resref,
          category: areaCategory.category,
          tag: placeable.tag,
          x: placeable.x,
          y: placeable.y,
          z: placeable.z,
          bearing: placeable.bearing
        });
      }
      templateSummaries.set(templateKey, templateRecord);

      instanceRows.push({
        areaResref: resref,
        areaName: metadata.name ?? resref,
        areaCategory: areaCategory.category,
        tileSet: metadata.tileSet ?? "",
        templateResRef,
        role,
        tag: placeable.tag ?? "",
        localizedName: placeable.localizedName ?? "",
        x: placeable.x,
        y: placeable.y,
        z: placeable.z,
        bearing: placeable.bearing,
        instanceIndex: index
      });
    });

    areaSummaries.push({
      resref,
      name: metadata.name ?? resref,
      category: areaCategory.category,
      categoryReason: areaCategory.reason,
      categoryMethod: areaCategory.method,
      tileSet: metadata.tileSet,
      width: metadata.width,
      height: metadata.height,
      tileCount: metadata.tiles?.length ?? metadata.tileCount ?? 0,
      counts: {
        placeables: placeables.length,
        doors: objects.doors?.length ?? 0,
        creatures: objects.creatures?.length ?? 0,
        items: objects.items?.length ?? 0,
        sounds: objects.sounds?.length ?? 0,
        stores: objects.stores?.length ?? 0,
        triggers: objects.triggers?.length ?? 0,
        waypoints: objects.waypoints?.length ?? 0
      },
      uniquePlaceableTemplates: areaTemplateCounts.size,
      topPlaceableRoles: topEntries(areaRoleCounts, 8),
      topPlaceableTemplates: topEntries(areaTemplateCounts, 16)
    });
  }

  const templateArray = [...templateSummaries.values()]
    .map((record) => ({
      templateResRef: record.templateResRef,
      primaryRole: topEntries(record.roles, 1)[0]?.key ?? "misc",
      totalInstances: record.totalInstances,
      areaCount: record.areaCounts.size,
      categoryCounts: topEntries(record.categoryCounts, 12),
      topAreas: topEntries(record.areaCounts, 12),
      displayNames: [...record.displayNames],
      tags: [...record.tags],
      sampleInstances: record.sampleInstances
    }))
    .sort((a, b) => b.totalInstances - a.totalInstances || a.templateResRef.localeCompare(b.templateResRef));

  const categoryArray = [...categoryStats.values()]
    .map((record) => ({
      category: record.category,
      areaCount: record.areaCount,
      placeableInstances: record.placeableInstances,
      uniqueTemplateCount: record.uniqueTemplates.size,
      topRoles: topEntries(record.roleCounts, 10),
      topTemplates: topEntries(record.topTemplates, 16),
      exampleAreas: record.exampleAreas
    }))
    .sort((a, b) => b.placeableInstances - a.placeableInstances || a.category.localeCompare(b.category));

  const summary = {
    version: "last-city-placeable-usage-map/v1",
    generatedAt,
    modulePath,
    areaCount: areaSummaries.length,
    placeableInstanceCount: instanceRows.length,
    uniquePlaceableTemplateCount: templateArray.length,
    categories: Object.fromEntries(categoryArray.map((category) => [category.category, {
      areaCount: category.areaCount,
      placeableInstances: category.placeableInstances,
      uniqueTemplateCount: category.uniqueTemplateCount
    }]))
  };

  const payload = {
    ...summary,
    note:
      "First-pass map from packed module GIT/ARE data. Categories combine manual housing-audit seeds with simple naming heuristics. Enrich later with Aurora Web catalog/render payload data.",
    categoryMap: categoryArray,
    areas: areaSummaries.sort((a, b) => a.category.localeCompare(b.category) || a.resref.localeCompare(b.resref)),
    templates: templateArray
  };

  await mkdir(outputRoot, { recursive: true });
  await writeFile(join(outputRoot, "placeable-usage-map.json"), JSON.stringify(payload, null, 2), "utf-8");

  const csvHeader = [
    "areaResref",
    "areaName",
    "areaCategory",
    "tileSet",
    "templateResRef",
    "role",
    "tag",
    "localizedName",
    "x",
    "y",
    "z",
    "bearing",
    "instanceIndex"
  ];
  const csv = [
    csvHeader.join(","),
    ...instanceRows.map((row) => csvHeader.map((key) => csvCell(row[key])).join(","))
  ].join("\n");
  await writeFile(join(outputRoot, "placeable-instances.csv"), `${csv}\n`, "utf-8");

  const categoryRows = categoryArray.map((category) => ({
    category: category.category,
    areas: category.areaCount,
    instances: category.placeableInstances,
    templates: category.uniqueTemplateCount,
    topRoles: category.topRoles.map((entry) => `${entry.key}:${entry.count}`).join(", "),
    examples: category.exampleAreas.slice(0, 8).join(", ")
  }));
  const apartmentRows = areaSummaries
    .filter((area) => area.category.startsWith("apartment_"))
    .sort((a, b) => a.category.localeCompare(b.category) || b.counts.placeables - a.counts.placeables)
    .map((area) => ({
      category: area.category,
      resref: area.resref,
      name: area.name,
      tileset: area.tileSet,
      size: `${area.width}x${area.height}`,
      placeables: area.counts.placeables,
      uniqueTemplates: area.uniquePlaceableTemplates,
      topRoles: area.topPlaceableRoles.slice(0, 4).map((entry) => `${entry.key}:${entry.count}`).join(", ")
    }));
  const topTemplateRows = templateArray.slice(0, 40).map((template) => ({
    template: template.templateResRef,
    role: template.primaryRole,
    instances: template.totalInstances,
    areas: template.areaCount,
    categories: template.categoryCounts.slice(0, 4).map((entry) => `${entry.key}:${entry.count}`).join(", "),
    names: template.displayNames.slice(0, 3).join(" / ")
  }));

  const md = [
    "# Last City placeable usage map",
    "",
    `Generated: ${generatedAt}`,
    "",
    `Module: \`${modulePath}\``,
    "",
    "This is a first-pass map of placeables actually used by Area GIT instances. It is meant as a durable seed for future location building: apartment richness, poor interiors, port storage, shops, taverns, ruins, and other buckets.",
    "",
    "Important: categories are partly manual seeds from the housing audit and partly naming heuristics. Treat them as an editable map, not final lore.",
    "",
    "## Summary",
    "",
    `- Areas with ARE+GIT parsed: ${summary.areaCount}`,
    `- Placeable instances: ${summary.placeableInstanceCount}`,
    `- Unique placeable templates: ${summary.uniquePlaceableTemplateCount}`,
    "",
    "## Category map",
    "",
    toMarkdownTable(categoryRows, [
      { key: "category", label: "Category" },
      { key: "areas", label: "Areas" },
      { key: "instances", label: "Placeables" },
      { key: "templates", label: "Unique templates" },
      { key: "topRoles", label: "Top roles" },
      { key: "examples", label: "Example areas" }
    ]),
    "",
    "## Apartment buckets",
    "",
    toMarkdownTable(apartmentRows, [
      { key: "category", label: "Bucket" },
      { key: "resref", label: "Area" },
      { key: "name", label: "Name" },
      { key: "tileset", label: "Tileset" },
      { key: "size", label: "Size" },
      { key: "placeables", label: "Placeables" },
      { key: "uniqueTemplates", label: "Unique templates" },
      { key: "topRoles", label: "Top roles" }
    ]),
    "",
    "## Most reused templates",
    "",
    toMarkdownTable(topTemplateRows, [
      { key: "template", label: "Template" },
      { key: "role", label: "Role" },
      { key: "instances", label: "Instances" },
      { key: "areas", label: "Areas" },
      { key: "categories", label: "Categories" },
      { key: "names", label: "Names" }
    ]),
    "",
    "## Files",
    "",
    `- Full JSON map: \`${join(outputRoot, "placeable-usage-map.json")}\``,
    `- Instance CSV: \`${join(outputRoot, "placeable-instances.csv")}\``,
    "",
    "## Next enrichment pass",
    "",
    "Use Aurora Web placeables/catalog data to add these fields per template:",
    "",
    "- render status / thumbnail availability;",
    "- appearance type and resolved model path;",
    "- light metadata from `placeables.2da` and UTP;",
    "- editor palette family if exposed;",
    "- curated semantic tags like `rich_bedroom`, `poor_storage`, `port_rope`, `merchant_counter`, `paperwork`, `warm_light`.",
    "",
    "The CSV is intentionally flat so it can be joined later by `templateResRef` with catalog/export data."
  ].join("\n");
  await writeFile(docsOutputPath, `${md}\n`, "utf-8");

  console.log(JSON.stringify({
    generatedAt,
    modulePath,
    areaCount: summary.areaCount,
    placeableInstanceCount: summary.placeableInstanceCount,
    uniquePlaceableTemplateCount: summary.uniquePlaceableTemplateCount,
    jsonPath: join(outputRoot, "placeable-usage-map.json"),
    csvPath: join(outputRoot, "placeable-instances.csv"),
    markdownPath: docsOutputPath,
    topCategories: categoryRows.slice(0, 8)
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
