import {
  MODULE_SNAPSHOT_MAX_OBJECTS,
  applyModuleSnapshotChanges,
  applyModuleSnapshotMutation,
  buildModuleSnapshotContentKey,
  buildModuleSnapshotManifestKey,
  createModuleSnapshotManifest,
  hashModuleSnapshotManifest,
  normalizeModuleSnapshotLogicalKey,
  validateModuleSnapshotManifest,
} from "../../src/modules/areas/domain/module-snapshot-manifest";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const SHA_C = "c".repeat(64);
const SHA_D = "d".repeat(64);
const SHA_E = "e".repeat(64);

describe("atomic module snapshot manifest", () => {
  it("sorts descriptors canonically and derives a deterministic revision and CAS key", () => {
    const left = createModuleSnapshotManifest({
      moduleId: "module:test",
      parentRevision: null,
      objects: [
        descriptor("zeta.git", 2023, 3, SHA_B),
        descriptor("Module.ifo", 2014, 5, SHA_A),
      ],
    });
    const right = createModuleSnapshotManifest({
      moduleId: "module:test",
      parentRevision: null,
      objects: [
        descriptor("Module.ifo", 2014, 5, SHA_A),
        descriptor("zeta.git", 2023, 3, SHA_B),
      ],
    });

    expect(left).toEqual(right);
    expect(left.schemaVersion).toBe("aurora-module-snapshot-manifest.v1");
    expect(left.revision).toMatch(/^[a-f0-9]{64}$/u);
    expect(left.objects.map((entry) => entry.logicalKey)).toEqual([
      "Module.ifo",
      "zeta.git",
    ]);
    expect(left.objects[0].contentKey).toBe(
      `__aurora/cas/sha256/aa/${SHA_A}`,
    );
    expect(Object.isFrozen(left)).toBe(true);
    expect(Object.isFrozen(left.objects)).toBe(true);
    expect(Object.isFrozen(left.objects[0])).toBe(true);
  });

  it("changes revision for any material descriptor or parent change", () => {
    const baseline = createModuleSnapshotManifest({
      moduleId: "module:test",
      parentRevision: null,
      objects: [descriptor("module.ifo", 2014, 5, SHA_A)],
    });
    const variants = [
      createModuleSnapshotManifest({
        moduleId: "module:other",
        parentRevision: null,
        objects: baseline.objects,
      }),
      createModuleSnapshotManifest({
        moduleId: "module:test",
        parentRevision: SHA_E,
        objects: baseline.objects,
      }),
      createModuleSnapshotManifest({
        moduleId: "module:test",
        parentRevision: null,
        objects: [descriptor("module.ifo", 2014, 6, SHA_A)],
      }),
      createModuleSnapshotManifest({
        moduleId: "module:test",
        parentRevision: null,
        objects: [descriptor("module.ifo", 2015, 5, SHA_A)],
      }),
      createModuleSnapshotManifest({
        moduleId: "module:test",
        parentRevision: null,
        objects: [descriptor("module.ifo", 2014, 5, SHA_B)],
      }),
    ];

    expect(new Set(variants.map((variant) => variant.revision)).size).toBe(
      variants.length,
    );
    for (const variant of variants) {
      expect(variant.revision).not.toBe(baseline.revision);
    }
  });

  it("rejects case-insensitive and Unicode-normalization logical-key collisions", () => {
    for (const objects of [
      [descriptor("Area_New.are", 2012, 1, SHA_A), descriptor("area_new.ARE", 2012, 1, SHA_B)],
      [descriptor("café.set", 2013, 1, SHA_A), descriptor("cafe\u0301.set", 2013, 1, SHA_B)],
    ]) {
      expect(() =>
        createModuleSnapshotManifest({
          moduleId: "module:test",
          parentRevision: null,
          objects,
        }),
      ).toThrow(/logical key/u);
    }
  });

  it.each([
    "",
    "/module.ifo",
    "../module.ifo",
    "areas/../module.ifo",
    "areas/./module.ifo",
    "areas//module.ifo",
    "areas\\module.ifo",
    "__aurora/hidden.bin",
    "areas/__AURORA/hidden.bin",
    "areas/C:module.ifo",
    "areas/module?.ifo",
    "areas/module\u0000.ifo",
    `${"ż".repeat(257)}.are`,
  ])("rejects unsafe logical key %j", (logicalKey) => {
    expect(() => normalizeModuleSnapshotLogicalKey(logicalKey)).toThrow(
      /logical key/u,
    );
  });

  it("rejects malformed module, parent, hash, size, type, and content-key input", () => {
    const valid = descriptor("module.ifo", 2014, 5, SHA_A);
    for (const input of [
      { moduleId: "", parentRevision: null, objects: [valid] },
      { moduleId: "module with space", parentRevision: null, objects: [valid] },
      { moduleId: "module:test", parentRevision: "A".repeat(64), objects: [valid] },
      { moduleId: "module:test", parentRevision: null, objects: [{ ...valid, sha256: "A".repeat(64) }] },
      { moduleId: "module:test", parentRevision: null, objects: [{ ...valid, size: -1 }] },
      { moduleId: "module:test", parentRevision: null, objects: [{ ...valid, size: 1.5 }] },
      { moduleId: "module:test", parentRevision: null, objects: [{ ...valid, resourceType: -1 }] },
      {
        moduleId: "module:test",
        parentRevision: null,
        objects: [{ ...valid, contentKey: "__aurora/cas/sha256/ff/not-the-hash" }],
      },
    ]) {
      expect(() => createModuleSnapshotManifest(input)).toThrow();
    }
  });

  it("enforces the complete-manifest object-count budget", () => {
    const objects = Array.from({ length: MODULE_SNAPSHOT_MAX_OBJECTS + 1 }, (_, index) =>
      descriptor(`objects/${index}.bin`, 1, index, SHA_A),
    );

    expect(() =>
      createModuleSnapshotManifest({
        moduleId: "module:test",
        parentRevision: null,
        objects,
      }),
    ).toThrow(/50,000/u);
  });

  it("applies a complete Area successor as one deterministic manifest delta", () => {
    const baseline = createModuleSnapshotManifest({
      moduleId: "module:test",
      parentRevision: null,
      objects: [
        descriptor("module.ifo", 2014, 10, SHA_A),
        descriptor("existing.are", 2012, 20, SHA_B),
      ],
    });
    const successor = applyModuleSnapshotChanges(baseline, [
      descriptor("area_new.are", 2012, 30, SHA_C),
      descriptor("area_new.git", 2023, 40, SHA_D),
      descriptor("area_new.gic", 2046, 50, SHA_E),
      descriptor("module.ifo", 2014, 11, SHA_B),
    ]);

    expect(successor.parentRevision).toBe(baseline.revision);
    expect(successor.revision).not.toBe(baseline.revision);
    expect(successor.objects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ logicalKey: "existing.are", sha256: SHA_B }),
        expect.objectContaining({ logicalKey: "module.ifo", sha256: SHA_B, size: 11 }),
        expect.objectContaining({ logicalKey: "area_new.are", sha256: SHA_C }),
        expect.objectContaining({ logicalKey: "area_new.git", sha256: SHA_D }),
        expect.objectContaining({ logicalKey: "area_new.gic", sha256: SHA_E }),
      ]),
    );
    expect(successor.objects).toHaveLength(5);
  });

  it("rejects duplicate changes and a baseline with a mismatched revision", () => {
    const baseline = createModuleSnapshotManifest({
      moduleId: "module:test",
      parentRevision: null,
      objects: [descriptor("module.ifo", 2014, 10, SHA_A)],
    });
    expect(() =>
      applyModuleSnapshotChanges(baseline, [
        descriptor("area_new.are", 2012, 1, SHA_B),
        descriptor("AREA_NEW.ARE", 2012, 1, SHA_C),
      ]),
    ).toThrow(/logical key/u);
    expect(() =>
      applyModuleSnapshotChanges({ ...baseline, revision: SHA_E }, [
        descriptor("area_new.are", 2012, 1, SHA_B),
      ]),
    ).toThrow(/revision/u);
  });

  it("atomically removes an Area triplet and upserts IFO while preserving every survivor descriptor", () => {
    const baseline = createModuleSnapshotManifest({
      moduleId: "module:test",
      parentRevision: null,
      objects: [
        descriptor("module.ifo", 2014, 10, SHA_A),
        descriptor("delete01.are", 2012, 20, SHA_B),
        descriptor("delete01.git", 2023, 21, SHA_C),
        descriptor("delete01.gic", 2046, 22, SHA_D),
        descriptor("keep01.are", 2012, 30, SHA_E),
      ],
    });

    const successor = applyModuleSnapshotMutation(baseline, {
      upserts: [descriptor("module.ifo", 2014, 11, SHA_B)],
      removals: ["delete01.are", "DELETE01.GIT", "delete01.gic"],
    });

    expect(successor.parentRevision).toBe(baseline.revision);
    expect(successor.objects).toEqual([
      expect.objectContaining({ logicalKey: "keep01.are", sha256: SHA_E }),
      expect.objectContaining({ logicalKey: "module.ifo", size: 11, sha256: SHA_B }),
    ]);
  });

  it.each([
    { upserts: [], removals: [] },
    { upserts: [descriptor("delete01.are", 2012, 1, SHA_E)], removals: ["DELETE01.ARE"] },
    { upserts: [], removals: ["missing.are"] },
    { upserts: [], removals: ["delete01.are", "DELETE01.ARE"] },
  ])("rejects an ambiguous or empty snapshot mutation %#", (mutation) => {
    const baseline = createModuleSnapshotManifest({
      moduleId: "module:test",
      parentRevision: null,
      objects: [descriptor("delete01.are", 2012, 20, SHA_B)],
    });
    expect(() => applyModuleSnapshotMutation(baseline, mutation)).toThrow(
      "AREA_SNAPSHOT_MANIFEST_INVALID",
    );
  });

  it("builds content keys only for lowercase SHA-256", () => {
    expect(buildModuleSnapshotContentKey(SHA_A)).toBe(
      `__aurora/cas/sha256/aa/${SHA_A}`,
    );
    for (const hash of ["", "A".repeat(64), "a".repeat(63), `g${"a".repeat(63)}`]) {
      expect(() => buildModuleSnapshotContentKey(hash)).toThrow(/SHA-256/u);
    }
  });

  it("derives a stable manifest artifact identity and rejects a forged revision", () => {
    const manifest = createModuleSnapshotManifest({
      moduleId: "module:test",
      parentRevision: null,
      objects: [descriptor("module.ifo", 2014, 5, SHA_A)],
    });

    expect(buildModuleSnapshotManifestKey(manifest)).toBe(
      `__aurora/manifests/module/${Buffer.from("module:test").toString("base64url")}/${manifest.revision}.v1.json`,
    );
    expect(hashModuleSnapshotManifest(manifest)).toMatch(/^[a-f0-9]{64}$/u);
    expect(validateModuleSnapshotManifest(manifest)).toEqual(manifest);
    expect(() =>
      validateModuleSnapshotManifest({ ...manifest, revision: SHA_E }),
    ).toThrow("AREA_SNAPSHOT_MANIFEST_INVALID");
  });
});

function descriptor(
  logicalKey: string,
  resourceType: number,
  size: number,
  sha256: string,
) {
  return { logicalKey, resourceType, size, sha256 };
}
