import { createHash } from "node:crypto";
import { AtomicAreaCreateTransactionStorageAdapter } from "../../src/modules/areas/adapters/outbound/snapshot/atomic-area-create-transaction-storage.adapter";
import { MemoryAtomicModuleSnapshotRepository } from "../../src/modules/areas/adapters/outbound/memory/memory-atomic-module-snapshot.repository";
import {
  createModuleSnapshotManifest,
  type ModuleSnapshotManifest,
} from "../../src/modules/areas/domain/module-snapshot-manifest";
import type { AreaCreateLeaseGuardPort } from "../../src/modules/areas/application/ports/atomic-module-snapshot.port";
import type { AreaCreatePersistedReadbackVerifierPort } from "../../src/modules/areas/application/ports/area-create-readback-verifier.port";
import type { AreaCreateModuleLease } from "../../src/modules/areas/application/ports/area-create-transaction.port";
import type { AreaCreateCompiledCandidate } from "../../src/modules/areas/domain/area-create-transaction.types";
import type { AreaUpdateCompiledCandidate } from "../../src/modules/areas/domain/area-update-transaction.types";

describe("AtomicAreaCreateTransactionStorageAdapter", () => {
  it("reads the captured head and checks collisions against its complete manifest", async () => {
    const harness = await createHarness();

    await expect(harness.storage.readModuleState(MODULE_ID)).resolves.toEqual({
      moduleId: MODULE_ID,
      revision: harness.baseline.revision,
      quarantined: false,
    });
    await expect(
      harness.storage.findResourceCollisions(MODULE_ID, "EXISTING", ["are", "git", "gic"]),
    ).resolves.toEqual(["existing.are"]);
  });

  it("keeps baseline visible through stage/resources and publishes all four objects at IFO CAS", async () => {
    const harness = await createHarness();
    await harness.storage.stage(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE);
    expect((await harness.repository.readHead(MODULE_ID))?.revision).toBe(
      harness.baseline.revision,
    );

    await harness.storage.commitResources(
      TRANSACTION_ID,
      MODULE_ID,
      harness.candidate,
      LEASE,
    );
    expect((await harness.repository.readHead(MODULE_ID))?.revision).toBe(
      harness.baseline.revision,
    );

    await harness.storage.commitModuleIfo(
      TRANSACTION_ID,
      MODULE_ID,
      harness.candidate,
      LEASE,
    );
    const published = await harness.repository.readHead(MODULE_ID);
    expect(published?.revision).not.toBe(harness.baseline.revision);
    const manifest = await harness.repository.readManifest(published!.manifestKey);
    expect(manifest?.objects.map((object) => object.logicalKey)).toEqual([
      "area_new.are",
      "area_new.gic",
      "area_new.git",
      "existing.are",
      "module.ifo",
    ]);

    await expect(
      harness.storage.readBack(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE),
    ).resolves.toEqual(
      expect.objectContaining({
        verified: true,
        newModuleRevision: published!.revision,
        diagnostics: [],
      }),
    );
    expect(harness.verifier.verify).toHaveBeenCalledWith(
      expect.objectContaining({
        areaId: harness.candidate.areaId,
        resources: expect.arrayContaining([
          expect.objectContaining({ extension: "are", bytes: harness.candidate.resources[0].bytes }),
        ]),
        moduleIfo: expect.objectContaining({ bytes: harness.candidate.moduleIfo.candidateBytes }),
      }),
    );
  });

  it("replays an already retained stage without depending on a new wall-clock value", async () => {
    const harness = await createHarness();
    await harness.storage.stage(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE);
    harness.setNow("2026-08-07T12:00:05.000Z");

    await expect(
      harness.storage.stage(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE),
    ).resolves.toBeUndefined();
    expect((await harness.repository.readStage(TRANSACTION_ID))?.createdAt).toBe(NOW);
  });

  it("rejects a candidate compiled from another baseline IFO before retaining a stage", async () => {
    const harness = await createHarness();
    const candidate = {
      ...harness.candidate,
      moduleIfo: {
        ...harness.candidate.moduleIfo,
        baselineBytes: Buffer.from("wrong-baseline"),
        baselineSha256: sha(Buffer.from("wrong-baseline")),
      },
    };

    await expect(
      harness.storage.stage(TRANSACTION_ID, MODULE_ID, candidate, LEASE),
    ).rejects.toThrow("AREA_SNAPSHOT_BASELINE_IFO_MISMATCH");
    await expect(harness.repository.readStage(TRANSACTION_ID)).resolves.toBeNull();
  });

  it("fails readback when the independent persisted-byte verifier rejects semantics", async () => {
    const harness = await createHarness();
    harness.verifier.verify.mockResolvedValueOnce({
      valid: false,
      diagnostics: ["GFF semantic mismatch"],
    });
    await publish(harness);

    await expect(
      harness.storage.readBack(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE),
    ).resolves.toEqual(
      expect.objectContaining({
        verified: false,
        diagnostics: ["GFF semantic mismatch"],
      }),
    );
  });

  it("passes the compiled Area variable target into persisted-byte semantic readback", async () => {
    const harness = await createHarness();
    const entries = Object.freeze([
      Object.freeze({ name: "COUNT", type: "int" as const, value: 7 }),
    ]);
    const candidate = {
      ...harness.candidate,
      variableMutation: Object.freeze({
        expectedEntries: Object.freeze([
          Object.freeze({ sourceIndex: 0, name: "COUNT", type: "int" as const, value: 3 }),
        ]),
        entries,
        sourceGitSha256: "1".repeat(64),
        candidateGitSha256: harness.candidate.resources[1]!.sha256,
      }),
    } as unknown as AreaUpdateCompiledCandidate;

    await harness.storage.stage(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.commitResources(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.commitModuleIfo(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.readBack(TRANSACTION_ID, MODULE_ID, candidate, LEASE);

    expect(harness.verifier.verify).toHaveBeenCalledWith(expect.objectContaining({
      expectedAreaVariables: entries,
    }));
  });

  it("passes the compiled Area basic-identity target into persisted-byte semantic readback", async () => {
    const harness = await createHarness();
    const candidate = {
      ...harness.candidate,
      projectedDraft: {
        basicIdentity: {
          name: {
            expectedValue: "Old Name",
            value: "New Name",
            expectedProfile: "multi_entry_inline_ascii",
            expectedEntries: [
              { languageId: 0, text: "Old Name" },
              { languageId: 2, text: "Other" },
            ],
            valueEntries: [
              { languageId: 2, text: "Other renamed" },
              { languageId: 0, text: "New Name" },
            ],
          },
          tag: { expectedValue: "OLD_TAG", value: "NEW_TAG" },
        },
      },
    } as unknown as AreaUpdateCompiledCandidate;

    await harness.storage.stage(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.commitResources(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.commitModuleIfo(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.readBack(TRANSACTION_ID, MODULE_ID, candidate, LEASE);

    expect(harness.verifier.verify).toHaveBeenCalledWith(expect.objectContaining({
      expectedAreaBasicIdentity: {
        name: "New Name",
        nameProfile: "multi_entry_inline_ascii",
        nameEntries: [
          { languageId: 2, text: "Other renamed" },
          { languageId: 0, text: "New Name" },
        ],
        tag: "NEW_TAG",
      },
    }));
  });

  it("derives the persisted Area Name target profile after alternate-entry removal", async () => {
    const harness = await createHarness();
    const candidate = {
      ...harness.candidate,
      projectedDraft: {
        basicIdentity: {
          name: {
            expectedValue: "Old Name",
            value: "Old Name",
            expectedProfile: "multi_entry_inline_ascii",
            expectedEntries: [
              { languageId: 0, text: "Old Name" },
              { languageId: 2, text: "Other" },
            ],
            valueEntries: [{ languageId: 0, text: "Old Name" }],
          },
        },
      },
    } as unknown as AreaUpdateCompiledCandidate;

    await harness.storage.stage(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.commitResources(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.commitModuleIfo(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.readBack(TRANSACTION_ID, MODULE_ID, candidate, LEASE);

    expect(harness.verifier.verify).toHaveBeenCalledWith(expect.objectContaining({
      expectedAreaBasicIdentity: {
        name: "Old Name",
        nameProfile: "simple_inline_ascii",
        nameEntries: [{ languageId: 0, text: "Old Name" }],
      },
    }));
  });

  it("transfers an exact bounded added Area Name entry into persisted-byte readback", async () => {
    const harness = await createHarness();
    const valueEntries = [
      { languageId: 11, text: "Krypta" },
      { languageId: 0, text: "Old Name" },
    ];
    const candidate = {
      ...harness.candidate,
      projectedDraft: {
        basicIdentity: {
          name: {
            expectedValue: "Old Name",
            value: "Old Name",
            expectedProfile: "simple_inline_ascii",
            expectedEntries: [{ languageId: 0, text: "Old Name" }],
            valueEntries,
          },
        },
      },
    } as unknown as AreaUpdateCompiledCandidate;

    await harness.storage.stage(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.commitResources(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.commitModuleIfo(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.readBack(TRANSACTION_ID, MODULE_ID, candidate, LEASE);

    expect(harness.verifier.verify).toHaveBeenCalledWith(expect.objectContaining({
      expectedAreaBasicIdentity: {
        name: "Old Name",
        nameProfile: "multi_entry_inline_ascii",
        nameEntries: valueEntries,
      },
    }));
  });

  it("passes the compiled Area visual-environment target into persisted-byte semantic readback", async () => {
    const harness = await createHarness();
    const value = Object.freeze({
      dayNightMode: "always_night" as const,
      shadowOpacity: 65,
      chanceRain: 20,
      chanceSnow: 0,
      chanceLightning: 35,
      sun: Object.freeze({
        ambientColor: 0x112233,
        diffuseColor: 0x445566,
        fogColor: 0x778899,
        fogAmount: 8,
        shadows: true,
      }),
      moon: Object.freeze({
        ambientColor: 0xaabbcc,
        diffuseColor: 0xddeeff,
        fogColor: 0x010203,
        fogAmount: 15,
        shadows: false,
      }),
    });
    const candidate = {
      ...harness.candidate,
      projectedDraft: {
        visualEnvironment: {
          expectedValue: { ...value, dayNightMode: "cycle" as const },
          value,
        },
      },
    } as unknown as AreaUpdateCompiledCandidate;

    await harness.storage.stage(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.commitResources(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.commitModuleIfo(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.readBack(TRANSACTION_ID, MODULE_ID, candidate, LEASE);

    expect(harness.verifier.verify).toHaveBeenCalledWith(expect.objectContaining({
      expectedAreaVisualEnvironment: value,
    }));
  });

  it("passes the compiled visual-environment scalar-controls target into semantic readback", async () => {
    const harness = await createHarness();
    const value = Object.freeze({ fogClipDistance: 120, windPower: 2 });
    const candidate = {
      ...harness.candidate,
      projectedDraft: {
        visualEnvironmentScalarControls: {
          expectedValue: { fogClipDistance: 45, windPower: 0 },
          value,
        },
      },
    } as unknown as AreaUpdateCompiledCandidate;

    await harness.storage.stage(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.commitResources(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.commitModuleIfo(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.readBack(TRANSACTION_ID, MODULE_ID, candidate, LEASE);

    expect(harness.verifier.verify).toHaveBeenCalledWith(expect.objectContaining({
      expectedAreaVisualEnvironmentScalarControls: value,
    }));
  });

  it("passes the resolved catalog selection and Lighting Scheme targets into semantic readback", async () => {
    const harness = await createHarness();
    const visualEnvironment = Object.freeze({
      dayNightMode: "always_night" as const,
      shadowOpacity: 65,
      chanceRain: 20,
      chanceSnow: 0,
      chanceLightning: 35,
      sun: Object.freeze({
        ambientColor: 0x112233,
        diffuseColor: 0x445566,
        fogColor: 0x778899,
        fogAmount: 8,
        shadows: true,
      }),
      moon: Object.freeze({
        ambientColor: 0xaabbcc,
        diffuseColor: 0xddeeff,
        fogColor: 0x010203,
        fogAmount: 15,
        shadows: false,
      }),
    });
    const candidate = {
      ...harness.candidate,
      projectedDraft: {},
      visualEnvironmentCatalogSelectionMutation: {
        catalogIdentity: {
          environmentSha256: "a".repeat(64),
          skyBoxesSha256: "b".repeat(64),
        },
        expectedValue: {
          lightingSchemeRowIndex: 0,
          skyBoxRowIndex: 0,
          visualEnvironment,
          visualEnvironmentScalarControls: { fogClipDistance: 45, windPower: 0 },
        },
        value: {
          lightingSchemeRowIndex: 1,
          skyBoxRowIndex: 2,
          visualEnvironment,
          visualEnvironmentScalarControls: { fogClipDistance: 120, windPower: 2 },
        },
        lightingSchemeChanged: true,
      },
    } as unknown as AreaUpdateCompiledCandidate;

    await harness.storage.stage(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.commitResources(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.commitModuleIfo(TRANSACTION_ID, MODULE_ID, candidate, LEASE);
    await harness.storage.readBack(TRANSACTION_ID, MODULE_ID, candidate, LEASE);

    expect(harness.verifier.verify).toHaveBeenCalledWith(expect.objectContaining({
      expectedAreaVisualEnvironmentCatalogSelection: {
        lightingSchemeRowIndex: 1,
        skyBoxRowIndex: 2,
      },
      expectedAreaVisualEnvironment: visualEnvironment,
      expectedAreaVisualEnvironmentScalarControls: {
        fogClipDistance: 120,
        windPower: 2,
      },
    }));
  });

  it("compensates a published successor to the exact retained baseline", async () => {
    const harness = await createHarness();
    await publish(harness);
    const recoveryLease = { ...LEASE, leaseId: "lease-recovery", fencingToken: 8 };

    await expect(
      harness.storage.compensate(
        TRANSACTION_ID,
        MODULE_ID,
        harness.candidate,
        recoveryLease,
      ),
    ).resolves.toEqual({ restored: true, diagnostics: [] });
    expect((await harness.repository.readHead(MODULE_ID))?.revision).toBe(
      harness.baseline.revision,
    );
  });

  it("certifies an unchanged baseline when recovery finds no retained stage", async () => {
    const harness = await createHarness();

    await expect(
      harness.storage.compensate(
        TRANSACTION_ID,
        MODULE_ID,
        harness.candidate,
        LEASE,
      ),
    ).resolves.toEqual({ restored: true, diagnostics: [] });
  });

  it("quarantines a module and denies every later publication", async () => {
    const harness = await createHarness();
    await harness.storage.stage(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE);
    await harness.storage.quarantine(
      MODULE_ID,
      TRANSACTION_ID,
      ["operator quarantine"],
      LEASE,
    );

    await expect(
      harness.storage.commitModuleIfo(
        TRANSACTION_ID,
        MODULE_ID,
        harness.candidate,
        LEASE,
      ),
    ).rejects.toThrow("AREA_SNAPSHOT_MODULE_QUARANTINED");
    expect((await harness.repository.readHead(MODULE_ID))?.quarantined).toBe(true);
  });
});

const MODULE_ID = "module:test";
const TRANSACTION_ID = "transaction-1";
const NOW = "2026-08-07T12:00:00.000Z";
const LEASE: AreaCreateModuleLease = {
  moduleId: MODULE_ID,
  leaseId: "lease-1",
  ownerTransactionId: TRANSACTION_ID,
  fencingToken: 7,
  expiresAt: "2026-08-07T12:00:30.000Z",
};

async function createHarness() {
  let now = NOW;
  const guard: jest.Mocked<AreaCreateLeaseGuardPort> = {
    assertCurrent: jest.fn(async (_lease: AreaCreateModuleLease) => undefined),
  };
  const repository = new MemoryAtomicModuleSnapshotRepository(
    guard,
    () => new Date(NOW),
  );
  const baselineContents = {
    "module.ifo": Buffer.from("baseline-ifo"),
    "existing.are": Buffer.from("existing-area"),
  };
  const baseline = manifestFor(baselineContents);
  await repository.bootstrap(baseline, baselineContents, NOW);
  const candidate = candidateFixture(baselineContents["module.ifo"]);
  const verifier: jest.Mocked<AreaCreatePersistedReadbackVerifierPort> = {
    version: "test-independent-gff-verifier.v1",
    verify: jest.fn(async (_input) => ({ valid: true, diagnostics: [] })),
  };
  return {
    baseline,
    candidate,
    repository,
    verifier,
    storage: new AtomicAreaCreateTransactionStorageAdapter(repository, verifier, {
      nowIso: () => now,
    }),
    setNow(value: string) {
      now = value;
    },
  };
}

async function publish(harness: Awaited<ReturnType<typeof createHarness>>) {
  await harness.storage.stage(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE);
  await harness.storage.commitResources(
    TRANSACTION_ID,
    MODULE_ID,
    harness.candidate,
    LEASE,
  );
  await harness.storage.commitModuleIfo(
    TRANSACTION_ID,
    MODULE_ID,
    harness.candidate,
    LEASE,
  );
}

function candidateFixture(baselineIfo: Buffer): AreaCreateCompiledCandidate {
  const resources = ([
    ["are", 2012, "candidate-are"],
    ["git", 2023, "candidate-git"],
    ["gic", 2046, "candidate-gic"],
  ] as const).map(([extension, resourceType, value]) => {
    const bytes = Buffer.from(value);
    return {
      extension,
      key: `modules/current/area_new.${extension}`,
      fileName: `area_new.${extension}`,
      resourceType,
      bytes,
      size: bytes.length,
      sha256: sha(bytes),
    };
  });
  const candidateBytes = Buffer.from("candidate-ifo");
  return {
    areaId: "area_new",
    resources,
    moduleIfo: {
      key: "modules/current/module.ifo",
      fileName: "module.ifo",
      resourceType: 2014,
      baselineBytes: Buffer.from(baselineIfo),
      baselineSha256: sha(baselineIfo),
      candidateBytes,
      candidateSha256: sha(candidateBytes),
    },
  };
}

function manifestFor(contents: Record<string, Buffer>): ModuleSnapshotManifest {
  return createModuleSnapshotManifest({
    moduleId: MODULE_ID,
    parentRevision: null,
    objects: Object.entries(contents).map(([logicalKey, bytes]) => ({
      logicalKey,
      resourceType: logicalKey.endsWith(".ifo") ? 2014 : 2012,
      size: bytes.length,
      sha256: sha(bytes),
    })),
  });
}

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
