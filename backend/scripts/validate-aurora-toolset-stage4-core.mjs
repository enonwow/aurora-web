#!/usr/bin/env node
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(process.cwd());
const evidence = resolve(root, "backend/docs/aurora-reverse/evidence/stage4-live-2026-07-16");
const outIndex = process.argv.indexOf("--out");
const output = resolve(outIndex >= 0 ? process.argv[outIndex + 1] : `${evidence}/stage4-core-validation.json`);

const paths = {
  baseline: pack("baseline-with-placeable-metadata/demo-source-pack-2026-07-16T103856423Z"),
  itemPropertiesPositive: pack("s04-01-item-properties/after-save/demo-source-pack-2026-07-16T125222763Z"),
  itemPropertiesRollback: pack("s04-01-item-properties/rollback/demo-source-pack-2026-07-16T125424540Z"),
  stack: pack("s04-02-item-flags/stack/after-save/demo-source-pack-2026-07-16T125605689Z"),
  plotPositive: pack("s04-02-item-flags/plot/after-save/demo-source-pack-2026-07-16T125753772Z"),
  plotRollback: pack("s04-02-item-flags/plot/rollback/demo-source-pack-2026-07-16T125858584Z"),
  identified: pack("s04-02-item-flags/identified/after-save/demo-source-pack-2026-07-16T125953621Z"),
  droppablePositive: pack("s04-02-item-flags/droppable/after-save/demo-source-pack-2026-07-16T130038440Z"),
  droppableRollback: pack("s04-02-item-flags/droppable/rollback/demo-source-pack-2026-07-16T130222781Z"),
  scriptPositive: pack("s04-05-placeable-script/after-save/demo-source-pack-2026-07-16T114738585Z"),
  scriptRollback: pack("s04-05-placeable-script/rollback/demo-source-pack-2026-07-16T124534445Z"),
  lockedPositive: pack("s04-06-flags/locked/after-save/demo-source-pack-2026-07-16T105259615Z"),
  lockedRollback: pack("s04-06-flags/locked/rollback/demo-source-pack-2026-07-16T105335540Z"),
  useablePositive: pack("s04-06-flags/useable/after-save/demo-source-pack-2026-07-16T105411378Z"),
  useableRollback: pack("s04-06-flags/useable/rollback/demo-source-pack-2026-07-16T105451507Z"),
  staticPositive: pack("s04-06-flags/static/after-save/demo-source-pack-2026-07-16T105523202Z"),
  staticRollback: pack("s04-06-flags/static/rollback/demo-source-pack-2026-07-16T105552824Z"),
  finalBaseline: pack("s04-06-flags/final-baseline/demo-source-pack-2026-07-16T135141494Z"),
  appearancePositive: pack("s04-07-appearance/after-save/demo-source-pack-2026-07-16T110018618Z"),
  appearanceRollback: pack("s04-07-appearance/rollback/demo-source-pack-2026-07-16T110103774Z"),
  animationPositive: pack("s04-08-animation/after-save/demo-source-pack-2026-07-16T110157335Z"),
  animationRollback: pack("s04-08-animation/rollback/demo-source-pack-2026-07-16T111014695Z"),
};

const data = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, json(path)]));
const itemPropertiesTarget = { x: 58.3894, y: 49.8782 };
const itemTarget = { x: 53.2285, y: 27.1841 };
const leverTarget = { x: 38.24, y: 20.76 };
const troughTarget = { x: 27.44, y: 29.76 };

const checks01 = {
  visiblePositive: image("s04-01-item-properties/03-name-tag-resref-before-commit.png"),
  visibleRollback: image("s04-01-item-properties/04-rollback-before-commit.png"),
  positiveReadback: matchesItem(data.itemPropertiesPositive, itemPropertiesTarget, { templateResRef: "s04_itemproof", tag: "S04_ITEM_PROOF", localizedName: "S04 Proof Outfit" }),
  rollbackReadback: matchesItem(data.itemPropertiesRollback, itemPropertiesTarget, { templateResRef: "nw_cloth022", tag: "NW_CLOTH022", localizedName: null }),
  countsStable: stableCounts(data.itemPropertiesPositive, data.itemPropertiesRollback),
  isolatedTargetDelta: itemPropertyDeltaIsolated(data.itemPropertiesPositive, data.itemPropertiesRollback, itemPropertiesTarget),
};

const plotPositive = item(data.plotPositive, itemTarget);
const plotRollback = item(data.plotRollback, itemTarget);
const stackItem = item(data.stack, itemTarget);
const identifiedItem = item(data.identified, itemTarget);
const checks02 = {
  stackUiAttemptVisible: image("s04-02-item-flags/stack/01-stack-2-ui.png"),
  stackBaseItemNormalizationReadback: stackItem.itemMetadata?.baseItem === 16 && stackItem.itemMetadata?.stackSize === 1,
  plotUiVisible: image("s04-02-item-flags/plot/01-plot-true-ui.png"),
  plotPositiveReadback: plotPositive.itemMetadata?.plot === true,
  plotRollbackReadback: plotRollback.itemMetadata?.plot === false,
  plotIsolated: deltaOnly(plotPositive.itemMetadata, plotRollback.itemMetadata, ["plot"]),
  identifiedUiVisible: image("s04-02-item-flags/identified/01-identified-false-ui.png"),
  identifiedReadOnlyReadback: identifiedItem.itemMetadata?.identified === true,
  cursedReadbackPresent: (data.identified.objects?.items ?? []).every((entry) => entry.itemMetadata?.cursed === false),
  droppableUiVisible: image("s04-02-item-flags/droppable/01-undroppable-true-ui.png"),
  droppableGroundInstanceNotSerialized: item(data.droppablePositive, itemTarget).itemMetadata?.droppable == null && item(data.droppableRollback, itemTarget).itemMetadata?.droppable == null,
  constraintsManifest: optionalJson("s04-02-item-flags/control-contract.json")?.ok === true,
};

const scriptSource = readFileSync(resolve(evidence, "s04-05-placeable-script/s04_plcprobe.nss"), "utf8");
const checks05 = {
  sourceVisible: image("s04-05-placeable-script/17-native-compile-with-runtime-marker.png"),
  rollbackVisible: image("s04-05-placeable-script/18-onused-rollback-ui.png"),
  exactlyOneMain: (scriptSource.match(/\bvoid\s+main\s*\(/g) ?? []).length === 1,
  runtimeMarkerInSource: scriptSource.includes("S04_PLACEABLE_USED"),
  positiveBindingReadback: placeable(data.scriptPositive, leverTarget).placeableMetadata?.["script.onUsed"] === "s04_plcprobe",
  rollbackBindingReadback: placeable(data.scriptRollback, leverTarget).placeableMetadata?.["script.onUsed"] === "test_sandbox",
  bindingDeltaIsolated: deltaOnly(placeable(data.scriptPositive, leverTarget).placeableMetadata, placeable(data.scriptRollback, leverTarget).placeableMetadata, ["script.onUsed"]),
};

const checks06 = {
  lockedVisible: image("s04-06-flags/locked/01-locked-ui.png"),
  lockedPositive: placeable(data.lockedPositive, leverTarget).placeableMetadata?.locked === true,
  lockedRollback: placeable(data.lockedRollback, leverTarget).placeableMetadata?.locked === false,
  lockedIsolated: deltaOnly(placeable(data.lockedPositive, leverTarget).placeableMetadata, placeable(data.lockedRollback, leverTarget).placeableMetadata, ["locked"]),
  useableVisible: image("s04-06-flags/useable/01-useable-false-ui.png"),
  useablePositive: placeable(data.useablePositive, leverTarget).placeableMetadata?.useable === false,
  useableRollback: placeable(data.useableRollback, leverTarget).placeableMetadata?.useable === true,
  useableIsolated: deltaOnly(placeable(data.useablePositive, leverTarget).placeableMetadata, placeable(data.useableRollback, leverTarget).placeableMetadata, ["useable"]),
  staticVisible: image("s04-06-flags/static/01-static-false-ui.png"),
  staticPositive: placeable(data.staticPositive, troughTarget).placeableMetadata?.static === false,
  staticRollback: placeable(data.staticRollback, troughTarget).placeableMetadata?.static === true,
  staticIsolated: deltaOnly(placeable(data.staticPositive, troughTarget).placeableMetadata, placeable(data.staticRollback, troughTarget).placeableMetadata, ["static"]),
  finalBaselineRestored: optionalJson("s04-06-flags/final-baseline-restoration.json")?.ok === true && finalBaselineOk(data.finalBaseline),
};

const checks07 = {
  propertyVisible: image("s04-07-appearance/01-appearance-ui.png"),
  renderVisible: image("s04-07-appearance/02-area-render.png"),
  positiveReadback: placeable(data.appearancePositive, leverTarget).appearanceType === 15107,
  rollbackReadback: placeable(data.appearanceRollback, leverTarget).appearanceType === 22,
  isolatedTargetDelta: deltaOnly(placeable(data.appearancePositive, leverTarget), placeable(data.appearanceRollback, leverTarget), ["appearanceType", "placeableMetadata"]),
  metadataReadback: placeable(data.appearancePositive, leverTarget).placeableMetadata?.appearanceId === 15107 && placeable(data.appearanceRollback, leverTarget).placeableMetadata?.appearanceId === 22,
};

const checks08 = {
  propertyVisible: image("s04-08-animation/01-initial-state-ui.png"),
  toolsetRenderVisible: image("s04-08-animation/02-toolset-render.png"),
  runtimeCaptureExists: image("s04-08-animation/runtime/01-destroyed-runtime.png"),
  positiveReadback: placeable(data.animationPositive, leverTarget).placeableMetadata?.animationState === 3,
  rollbackReadback: placeable(data.animationRollback, leverTarget).placeableMetadata?.animationState === 0,
  isolatedTargetDelta: deltaOnly(placeable(data.animationPositive, leverTarget).placeableMetadata, placeable(data.animationRollback, leverTarget).placeableMetadata, ["animationState"]),
  semanticRuntimeManifest: optionalJson("s04-08-animation/runtime/semantic-runtime-proof.json")?.ok === true,
};

const functions = {
  "AUR-S04-01": result(checks01),
  "AUR-S04-02": result(checks02),
  "AUR-S04-05": result(checks05),
  "AUR-S04-06": result(checks06),
  "AUR-S04-07": result(checks07),
  "AUR-S04-08": result(checks08),
};
const acceptedFunctions = Object.entries(functions).filter(([, value]) => value.ok).map(([id]) => id);
const report = { version: "aurora-toolset-stage4-core/v1", generatedAt: new Date().toISOString(), ok: acceptedFunctions.length === Object.keys(functions).length, acceptedFunctions, functions, evidenceRoot: relative(evidence) };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;

function pack(path) { return resolve(evidence, path, "raw.git.summary.json"); }
function json(path) { return JSON.parse(readFileSync(path, "utf8")); }
function optionalJson(path) { try { return json(resolve(evidence, path)); } catch { return null; } }
function image(path) { try { return statSync(resolve(evidence, path)).size > 5_000; } catch { return false; } }
function item(packValue, target) { return exact(packValue.objects?.items, target, "item"); }
function placeable(packValue, target) { return exact(packValue.objects?.placeables, target, "placeable"); }
function exact(values, target, kind) { const matches = (values ?? []).filter((entry) => entry.x === target.x && entry.y === target.y); if (matches.length !== 1) throw new Error(`Expected one ${kind} at ${JSON.stringify(target)}, got ${matches.length}.`); return matches[0]; }
function matchesItem(packValue, target, expected) { const value = item(packValue, target); return value.templateResRef === expected.templateResRef && value.tag === expected.tag && (expected.localizedName == null || value.itemMetadata?.localizedName === expected.localizedName); }
function stableCounts(left, right) { return JSON.stringify(left.counts) === JSON.stringify(right.counts) && left.counts?.total === 18; }
function deltaOnly(left, right, allowed) { const a = structuredClone(left ?? {}), b = structuredClone(right ?? {}); for (const key of allowed) { delete a[key]; delete b[key]; } return JSON.stringify(a) === JSON.stringify(b); }
function itemPropertyDeltaIsolated(leftPack, rightPack, target) { const left = structuredClone(item(leftPack, target)), right = structuredClone(item(rightPack, target)); for (const value of [left, right]) { delete value.templateResRef; delete value.tag; delete value.localizedName; if (value.itemMetadata) { delete value.itemMetadata.templateResRef; delete value.itemMetadata.tag; delete value.itemMetadata.localizedName; } } return JSON.stringify(left) === JSON.stringify(right); }
function finalBaselineOk(packValue) { const lever = placeable(packValue, leverTarget).placeableMetadata ?? {}, trough = placeable(packValue, troughTarget).placeableMetadata ?? {}; return packValue.counts?.total === 18 && lever.appearanceId === 22 && lever.animationState === 0 && lever.static === false && lever.useable === true && lever.locked === false && lever.hasInventory === false && lever["script.onUsed"] === "test_sandbox" && trough.appearanceId === 104 && trough.animationState === 0 && trough.static === true && trough.useable === false; }
function result(checks) { return { ok: Object.values(checks).every(Boolean), checks }; }
function relative(path) { return path.slice(root.length + 1).replaceAll("\\", "/"); }
