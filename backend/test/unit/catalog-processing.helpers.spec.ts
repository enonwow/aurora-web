import {
  addSeed,
  buildAssetId,
  buildBenchmarkFingerprint,
  buildEmptyPlaceableAssetManifest,
  buildLookupSeeds,
  buildModuleSnapshotIndex,
  buildRenderContract,
  buildTemplateRenderContract,
  collectPlaceableAssetsFromSnapshot,
  compareAssetRole,
  extractBasename,
  extractExtension,
  extractFileName,
  inferContentTypeForExtension,
  maybeStripBenchmarkMetadata,
  maybeStripTemplateBenchmarkMetadata,
  normalizePlaceableSubtypeHint,
  normalizePrefixForLookup,
  percentile,
  resolvePlaceableClassification,
  roundMetric,
  summarizeDurations
} from "../../src/modules/catalog/application/catalog-processing.helpers";
import { createHash } from "node:crypto";
import type { ModuleBlobSnapshotSummary } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";

describe("catalog-processing.helpers", () => {
  it("buildAssetId is deterministic and returns 24 chars", () => {
    const first = buildAssetId("modules/current/a.mdl", "etag1", 10);
    const second = buildAssetId("modules/current/a.mdl", "etag1", 10);
    const different = buildAssetId("modules/current/a.mdl", "etag2", 10);
    const withoutEtag = buildAssetId("modules/current/a.mdl", undefined, 10);
    const explicitEmptyEtag = buildAssetId("modules/current/a.mdl", "", 10);

    expect(first).toHaveLength(24);
    expect(first).toBe(second);
    expect(first).not.toBe(different);
    expect(withoutEtag).toBe(explicitEmptyEtag);
  });

  it("extractFileName normalizes path separators", () => {
    expect(extractFileName("modules/current/models/a.mdl")).toBe("a.mdl");
    expect(extractFileName("modules\\current\\models\\b.dds")).toBe("b.dds");
  });

  it("extractExtension and extractBasename handle edge cases", () => {
    expect(extractExtension("a.mdl")).toBe("mdl");
    expect(extractExtension("A.TGA")).toBe("tga");
    expect(extractExtension("  FILE.DDS  ")).toBe("dds");
    expect(extractExtension(".hidden")).toBe("");
    expect(extractExtension("noext")).toBe("");
    expect(extractExtension("noext.")).toBe("");

    expect(extractBasename("a.mdl")).toBe("a");
    expect(extractBasename("A.TGA")).toBe("a");
    expect(extractBasename("  FILE.DDS  ")).toBe("file");
    expect(extractBasename(".hidden")).toBe(".hidden");
    expect(extractBasename("noext")).toBe("noext");
  });

  it("inferContentTypeForExtension maps known extensions", () => {
    expect(inferContentTypeForExtension("dds")).toBe("image/vnd-ms.dds");
    expect(inferContentTypeForExtension("tga")).toBe("image/x-tga");
    expect(inferContentTypeForExtension("mdl")).toBe("application/octet-stream");
    expect(inferContentTypeForExtension("unknown")).toBe("application/octet-stream");
  });

  it("compareAssetRole keeps expected order", () => {
    expect(compareAssetRole("model", "texture")).toBeLessThan(0);
    expect(compareAssetRole("metadata", "vfx")).toBeGreaterThan(0);
    expect(compareAssetRole("unknown", "unknown")).toBe(0);
  });

  it("normalizePrefixForLookup trims slashes and keeps trailing slash", () => {
    expect(normalizePrefixForLookup(" modules/current ")).toBe("modules/current/");
    expect(normalizePrefixForLookup("//modules/current")).toBe("modules/current/");
    expect(normalizePrefixForLookup("/modules/current/")).toBe("modules/current/");
    expect(normalizePrefixForLookup("assets////")).toBe("assets/");
    expect(normalizePrefixForLookup("///")).toBe("");
    expect(normalizePrefixForLookup("")).toBe("");
  });

  it("normalizePlaceableSubtypeHint maps aliases and rejects invalid values", () => {
    expect(normalizePlaceableSubtypeHint("vvx")).toBe("vfx");
    expect(normalizePlaceableSubtypeHint("vvxy")).toBe("vfx");
    expect(normalizePlaceableSubtypeHint("vfx")).toBe("vfx");
    expect(normalizePlaceableSubtypeHint("generic")).toBe("generic");
    expect(normalizePlaceableSubtypeHint("door")).toBe("door");
    expect(normalizePlaceableSubtypeHint("container")).toBe("container");
    expect(normalizePlaceableSubtypeHint("light_source")).toBe("light_source");
    expect(normalizePlaceableSubtypeHint(" trigger_proxy ")).toBe("trigger_proxy");
    expect(normalizePlaceableSubtypeHint("bad")).toBeNull();
    expect(normalizePlaceableSubtypeHint(undefined)).toBeNull();
  });

  it("resolvePlaceableClassification prefers template subtype and exposes mismatch", () => {
    const same = resolvePlaceableClassification("door", "door");
    const mismatch = resolvePlaceableClassification("door", "vvx");
    const fromHint = resolvePlaceableClassification(undefined, "vvxy");
    const fallback = resolvePlaceableClassification(undefined, "invalid");

    expect(same).toMatchObject({
      source: "template",
      normalizedSubtype: "door",
      mismatchWithTemplate: false
    });
    expect(mismatch).toMatchObject({
      source: "template",
      normalizedSubtype: "door",
      mismatchWithTemplate: true
    });
    expect(fromHint).toMatchObject({
      source: "hint",
      normalizedSubtype: "vfx",
      mismatchWithTemplate: false
    });
    expect(fallback.normalizedSubtype).toBe("generic");
  });

  it("buildRenderContract returns subtype-specific presets", () => {
    expect(buildRenderContract("door")).toMatchObject({
      frontendType: "door",
      rendererPreset: "door-standard",
      isDoor: true,
      isVfx: false
    });
    expect(buildRenderContract("vfx")).toMatchObject({
      frontendType: "vfx",
      rendererPreset: "vfx-emitter",
      isDoor: false,
      isVfx: true
    });
    expect(buildRenderContract("container")).toMatchObject({
      frontendType: "placeable",
      rendererPreset: "placeable-container",
      isDoor: false,
      isVfx: false
    });
    expect(buildRenderContract("light_source")).toMatchObject({
      rendererPreset: "placeable-light",
      isDoor: false,
      isVfx: false
    });
    expect(buildRenderContract("trigger_proxy")).toMatchObject({
      rendererPreset: "placeable-trigger-proxy",
      isDoor: false,
      isVfx: false
    });
    expect(buildRenderContract("generic")).toMatchObject({
      rendererPreset: "placeable-generic",
      isDoor: false,
      isVfx: false
    });
  });

  it("strips benchmark metadata only when requested", () => {
    const placeable = {
      templateId: "plc_1",
      resref: "plc_1",
      name: "Placeable",
      category: "test",
      placeableSubtype: "generic" as const,
      render: buildRenderContract("generic"),
      benchmarkCandidate: true,
      benchmarkBucket: "bucket",
      metadata: {},
      classification: {
        source: "hint" as const,
        normalizedSubtype: "generic" as const,
        mismatchWithTemplate: false
      },
      assetManifest: buildEmptyPlaceableAssetManifest(),
      processedAt: "2026-05-25T00:00:00.000Z"
    };

    expect(maybeStripBenchmarkMetadata(placeable, true)).toBe(placeable);
    expect(maybeStripBenchmarkMetadata(placeable, false)).toMatchObject({
      benchmarkBucket: undefined
    });

    const withoutBucket = {
      ...placeable,
      benchmarkBucket: undefined
    };
    expect(maybeStripBenchmarkMetadata(withoutBucket, false)).toBe(withoutBucket);
  });

  it("strips template benchmark metadata only when requested", () => {
    const template = {
      templateId: "cre_1",
      kind: "creature" as const,
      resref: "cre_1",
      name: "Creature",
      category: "test",
      benchmarkCandidate: true,
      benchmarkBucket: "bucket",
      metadata: {},
      render: buildTemplateRenderContract("creature"),
      processedAt: "2026-05-25T00:00:00.000Z"
    };

    expect(maybeStripTemplateBenchmarkMetadata(template, true)).toBe(template);
    expect(maybeStripTemplateBenchmarkMetadata(template, false)).toMatchObject({
      benchmarkBucket: undefined
    });

    const withoutBucket = {
      ...template,
      benchmarkBucket: undefined
    };
    expect(maybeStripTemplateBenchmarkMetadata(withoutBucket, false)).toBe(withoutBucket);
  });

  it("buildTemplateRenderContract maps creature and item", () => {
    expect(buildTemplateRenderContract("creature")).toMatchObject({
      backendType: "creature",
      frontendType: "creature",
      rendererPreset: "creature-standard"
    });
    expect(buildTemplateRenderContract("item")).toMatchObject({
      backendType: "item",
      frontendType: "item",
      rendererPreset: "item-standard"
    });
  });

  it("buildLookupSeeds and addSeed include expected values and skip short ones", () => {
    const input = {
      templateId: "plc_demo_001",
      resref: "plc_demo",
      subtype: "vfx" as const,
      metadata: {
        modelResref: "plc_demo_model",
        appearanceResref: "ap_demo",
        model: "plc_demo_model",
        texturePrefix: "tx_demo",
        materialPrefix: "mt_demo",
        vfxPreset: "vfx_demo",
        ignored: "ab"
      }
    };

    const seeds = buildLookupSeeds(input);
    expect(seeds).toContain("plc_demo");
    expect(seeds).toContain("plc_demo_001");
    expect(seeds).toContain("plc_demo_model");
    expect(seeds).toContain("tx_demo");
    expect(seeds).toContain("vfx_demo");
    expect(seeds).toContain("plc_demo_vfx");

    const set = new Set<string>();
    addSeed(set, "ab");
    addSeed(set, "abc");
    expect([...set]).toEqual(["abc"]);
  });

  it("buildLookupSeeds consumes each metadata lookup key", () => {
    const seeds = buildLookupSeeds({
      templateId: "tpl",
      resref: "aa",
      subtype: "generic",
      metadata: {
        modelResref: "x_modelresref",
        appearanceResref: "x_appearance",
        model: "x_model",
        texturePrefix: "x_tex",
        materialPrefix: "x_mat",
        vfxPreset: "x_vfx"
      }
    });

    expect(seeds).toEqual(
      expect.arrayContaining([
        "x_modelresref",
        "x_appearance",
        "x_model",
        "x_tex",
        "x_mat",
        "x_vfx"
      ])
    );
  });

  it("buildLookupSeeds adds vfx suffix only for vfx subtype", () => {
    const genericSeeds = buildLookupSeeds({
      templateId: "plc_generic_001",
      resref: "plc_generic",
      subtype: "generic",
      metadata: {}
    });

    expect(genericSeeds).not.toContain("plc_generic_vfx");
  });

  it("buildModuleSnapshotIndex groups by basename/prefix and counts scanned files", () => {
    const snapshot = buildSnapshot([
      { key: "modules/current/models/plc_gate.mdl", size: 10, etag: "e1" },
      { key: "modules/current/textures/plc_gate.dds", size: 20, etag: "e2" },
      { key: "modules/current/fx/plc_gate_vfx.vis", size: 30, etag: "e3" },
      { key: "modules/current/misc/plc_gate.custom", size: 5, etag: "e5" },
      { key: "modules/current/fx/", size: 40, etag: "e4" }
    ]);

    const index = buildModuleSnapshotIndex(snapshot);
    expect(index.moduleHash).toBe("hash-v1");
    expect(index.candidatesScanned).toBe(5);
    expect(index.byBasename.get("plc_gate")?.length).toBe(3);
    expect(index.byPrefix.get("plc_")?.length).toBe(4);
    expect(index.byBasename.has("")).toBe(false);
    expect(index.byBasename.get("plc_gate")?.some((asset) => asset.role === "unknown")).toBe(true);
  });

  it("collectPlaceableAssetsFromSnapshot deduplicates and sorts by role then name", () => {
    const snapshot = buildSnapshot([
      { key: "modules/current/models/plc_gate.mdl", size: 10, etag: "1" },
      { key: "modules/current/textures/plc_gate_a.dds", size: 10, etag: "5" },
      { key: "modules/current/textures/plc_gate_b.dds", size: 10, etag: "6" },
      { key: "modules/current/materials/plc_gate.mtr", size: 10, etag: "2" },
      { key: "modules/current/textures/plc_gate.dds", size: 10, etag: "3" },
      { key: "modules/current/fx/plc_gate_vfx.vis", size: 10, etag: "4" },
      { key: "modules/current/models/plc_other.mdl", size: 10, etag: "7" }
    ]);
    const index = buildModuleSnapshotIndex(snapshot);

    const result = collectPlaceableAssetsFromSnapshot(index, {
      templateId: "plc_gate_001",
      resref: "plc_gate",
      subtype: "vfx",
      metadata: {}
    });

    expect(result.length).toBe(6);
    expect(new Set(result.map((entry) => entry.objectKey)).size).toBe(6);
    expect(result.map((entry) => entry.role)).toEqual([
      "model",
      "texture",
      "texture",
      "texture",
      "material",
      "vfx"
    ]);
    const textureNames = result
      .filter((entry) => entry.role === "texture")
      .map((entry) => entry.fileName);
    expect(textureNames).toHaveLength(3);
    expect(textureNames).toEqual([...textureNames].sort((left, right) => left.localeCompare(right)));
  });

  it("collectPlaceableAssetsFromSnapshot breaks ties with objectKey for identical file names", () => {
    const snapshot = buildSnapshot([
      { key: "modules/current/z/plc_gate.dds", size: 1, etag: "a" },
      { key: "modules/current/a/plc_gate.dds", size: 1, etag: "b" }
    ]);
    const index = buildModuleSnapshotIndex(snapshot);

    const result = collectPlaceableAssetsFromSnapshot(index, {
      templateId: "plc_gate",
      resref: "plc_gate",
      subtype: "generic",
      metadata: {}
    });

    const tie = result.filter((entry) => entry.fileName === "plc_gate.dds");
    expect(tie).toHaveLength(2);
    expect(tie.map((entry) => entry.objectKey)).toEqual([
      "modules/current/a/plc_gate.dds",
      "modules/current/z/plc_gate.dds"
    ]);
  });

  it("collectPlaceableAssetsFromSnapshot sorts by file name before object key for same role", () => {
    const snapshot = buildSnapshot([
      { key: "modules/current/z/plc_gate_a.dds", size: 1, etag: "a" },
      { key: "modules/current/0/plc_gate_b.dds", size: 1, etag: "b" }
    ]);
    const index = buildModuleSnapshotIndex(snapshot);

    const result = collectPlaceableAssetsFromSnapshot(index, {
      templateId: "plc_gate",
      resref: "plc_gate",
      subtype: "generic",
      metadata: {}
    });

    expect(result.filter((entry) => entry.role === "texture").map((entry) => entry.fileName)).toEqual([
      "plc_gate_a.dds",
      "plc_gate_b.dds"
    ]);
  });

  it("collectPlaceableAssetsFromSnapshot enforces 200 items cap", () => {
    const objects = Array.from({ length: 220 }, (_, index) => ({
      key: `modules/current/models/plc_big_${String(index).padStart(3, "0")}.mdl`,
      size: index + 1,
      etag: `etag-${index}`
    }));
    const index = buildModuleSnapshotIndex(buildSnapshot(objects));

    const result = collectPlaceableAssetsFromSnapshot(index, {
      templateId: "plc_big_template",
      resref: "plc_big",
      subtype: "generic",
      metadata: {}
    });

    expect(result).toHaveLength(200);
  });

  it("summarizeDurations and percentile produce stable metrics", () => {
    const values = [4, 1, 3, 2];
    const summary = summarizeDurations(values);

    expect(summary).toEqual({
      minMs: 1,
      maxMs: 4,
      avgMs: 2.5,
      p50Ms: 2,
      p95Ms: 4,
      p99Ms: 4
    });
    expect(summarizeDurations([])).toEqual({
      minMs: 0,
      maxMs: 0,
      avgMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0
    });
    expect(percentile([1, 2, 3], 0)).toBe(1);
    expect(percentile([1, 2, 3], 2)).toBe(3);
    expect(roundMetric(1.23456)).toBe(1.2346);
  });

  it("buildBenchmarkFingerprint is deterministic and sensitive to input", () => {
    const query = {
      iterations: 10,
      warmupIterations: 2,
      bypassCache: true
    };
    const candidates = [
      { templateId: "a", resref: "ra", placeableSubtype: "generic" as const },
      { templateId: "b", resref: "rb", placeableSubtype: "vfx" as const }
    ];

    const first = buildBenchmarkFingerprint(candidates, query);
    const second = buildBenchmarkFingerprint(candidates, query);
    const changed = buildBenchmarkFingerprint(
      [{ templateId: "a", resref: "ra", placeableSubtype: "generic" as const }],
      query
    );

    expect(first).toHaveLength(64);
    expect(first).toBe(second);
    expect(first).not.toBe(changed);
  });

  it("buildBenchmarkFingerprint uses canonical payload shape", () => {
    const query = {
      iterations: 7,
      warmupIterations: 3,
      bypassCache: false
    };
    const candidates = [
      { templateId: "x", resref: "rx", placeableSubtype: undefined },
      { templateId: "y", resref: "ry", placeableSubtype: "vfx" as const }
    ];

    const expected = createHash("sha256")
      .update(
        JSON.stringify({
          type: "placeable-benchmark/v1",
          iterations: 7,
          warmupIterations: 3,
          bypassCache: false,
          candidates: [
            { templateId: "x", resref: "rx", placeableSubtype: "generic" },
            { templateId: "y", resref: "ry", placeableSubtype: "vfx" }
          ]
        })
      )
      .digest("hex");

    expect(buildBenchmarkFingerprint(candidates, query)).toBe(expected);
  });

  it("buildEmptyPlaceableAssetManifest returns empty manifest descriptor", () => {
    const manifest = buildEmptyPlaceableAssetManifest();
    expect(manifest.version).toBe("placeable-asset-manifest/v1");
    expect(manifest.source).toBe("module-blob-snapshot");
    expect(manifest.assetCount).toBe(0);
    expect(manifest.assets).toEqual([]);
  });
});

function buildSnapshot(
  objects: Array<{ key: string; size: number; etag?: string }>
): ModuleBlobSnapshotSummary {
  return {
    bucket: "aurora-module-assets",
    prefix: "modules/current/",
    moduleHash: "hash-v1",
    totalFiles: objects.length,
    totalBytes: objects.reduce((sum, object) => sum + object.size, 0),
    objects,
    truncated: false
  };
}
