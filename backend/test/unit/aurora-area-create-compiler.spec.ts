import { createHash } from "node:crypto";
import { buildGffBuffer } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import { MemoryAtomicModuleSnapshotRepository } from "../../src/modules/areas/adapters/outbound/memory/memory-atomic-module-snapshot.repository";
import { AuroraAreaCreateCompiler } from "../../src/modules/areas/adapters/outbound/blob/aurora-area-create-compiler";
import { AuroraAreaCreateCandidateValidator } from "../../src/modules/areas/adapters/outbound/blob/aurora-area-create-candidate-validator";
import { createModuleSnapshotManifest } from "../../src/modules/areas/domain/module-snapshot-manifest";
import {
  AUR_S05_05_CREATION_PROFILE_FINGERPRINT,
  getAurS0505CreationProfile,
} from "../../src/modules/areas/domain/area-create-profile";
import type { AreaCreateCommand } from "../../src/modules/areas/domain/area-create-command.types";

const NOW = "2026-08-07T12:00:00.000Z";
const SET_FINGERPRINT = "a".repeat(64);

describe("AuroraAreaCreateCompiler", () => {
  it("compiles and independently validates the exact narrow AUR-S05-05 candidate", async () => {
    const harness = await createHarness();
    const command = createCommand(harness.head.revision);
    const candidate = await harness.compiler.compile(
      command,
      { moduleId: "module-test", revision: harness.head.revision, quarantined: false },
      "transaction-1",
    );

    await expect(new AuroraAreaCreateCandidateValidator().validate(command, candidate)).resolves.toEqual({
      valid: true,
      issues: [],
    });
    expect(candidate.resources.map((resource) => [resource.extension, resource.resourceType])).toEqual([
      ["are", 2012],
      ["git", 2023],
      ["gic", 2046],
    ]);
    expect(candidate.moduleIfo.candidateBytes.equals(candidate.moduleIfo.baselineBytes)).toBe(false);
    const are = parseRawGffDocument(candidate.resources[0].bytes);
    expect(readLocStringText(readField(are, "Name"))).toBe("Created Area");
    expect(readField(are, "Tag")).toMatchObject({ type: "cexostring", value: "Created_Tag" });
    expect(readField(are, "ResRef")).toMatchObject({ type: "resref", value: "area_new" });
  });

  it("rejects unsupported profile identity and topology before reading module content", async () => {
    const harness = await createHarness();
    const unsupported = {
      ...createCommand(harness.head.revision),
      creationProfile: { id: "another-profile", fingerprintSha256: "b".repeat(64) },
    };
    await expect(
      harness.compiler.compile(unsupported, moduleState(harness.head.revision), "transaction-1"),
    ).rejects.toMatchObject({ code: "AREA_CREATE_PROFILE_UNSUPPORTED", status: 422 });

    const wrongGrid = {
      ...createCommand(harness.head.revision),
      tiles: createCommand(harness.head.revision).tiles.map((tile, index) =>
        index === 0 ? { ...tile, tileId: 13 } : tile,
      ),
    };
    await expect(
      harness.compiler.compile(wrongGrid, moduleState(harness.head.revision), "transaction-2"),
    ).rejects.toMatchObject({ code: "AREA_CREATE_PROFILE_UNSUPPORTED", status: 422 });
  });

  it("rejects stale profile and SET fingerprints with stable contract codes", async () => {
    const harness = await createHarness();
    const staleProfile = {
      ...createCommand(harness.head.revision),
      creationProfile: {
        id: getAurS0505CreationProfile().id,
        fingerprintSha256: "b".repeat(64),
      },
    };
    await expect(
      harness.compiler.compile(staleProfile, moduleState(harness.head.revision), "transaction-1"),
    ).rejects.toMatchObject({ code: "AREA_CREATE_PROFILE_STALE", status: 409 });

    const staleSet = {
      ...createCommand(harness.head.revision),
      tileset: { resRef: "tms01", setFingerprintSha256: "c".repeat(64) },
    };
    await expect(
      harness.compiler.compile(staleSet, moduleState(harness.head.revision), "transaction-2"),
    ).rejects.toMatchObject({ code: "AREA_CREATE_TILESET_STALE", status: 409 });
  });

  it("rejects a stale snapshot head and a duplicate IFO registration", async () => {
    const harness = await createHarness();
    const command = createCommand(harness.head.revision);
    await expect(
      harness.compiler.compile(command, moduleState("f".repeat(64)), "transaction-1"),
    ).rejects.toMatchObject({ code: "AREA_CREATE_STORAGE_UNAVAILABLE", status: 503 });

    const duplicateHarness = await createHarness("area_new");
    await expect(
      duplicateHarness.compiler.compile(
        createCommand(duplicateHarness.head.revision),
        moduleState(duplicateHarness.head.revision),
        "transaction-2",
      ),
    ).rejects.toMatchObject({ code: "AREA_CREATE_DRAFT_INVALID", status: 409 });
  });

  it("reports descriptor or semantic tampering independently of the compiler", async () => {
    const harness = await createHarness();
    const command = createCommand(harness.head.revision);
    const candidate = await harness.compiler.compile(command, moduleState(harness.head.revision), "transaction-1");
    const corrupt = {
      ...candidate,
      resources: candidate.resources.map((resource) =>
        resource.extension === "git" ? { ...resource, resourceType: 999 } : resource,
      ),
    };

    await expect(new AuroraAreaCreateCandidateValidator().validate(command, corrupt)).resolves.toMatchObject({
      valid: false,
      issues: expect.arrayContaining([expect.objectContaining({ code: "RESOURCE_DESCRIPTOR_INVALID" })]),
    });
  });
});

async function createHarness(existingArea?: string) {
  const repository = new MemoryAtomicModuleSnapshotRepository({ assertCurrent: jest.fn() });
  const ifo = buildModuleIfo(existingArea);
  const hash = sha256(ifo);
  const manifest = createModuleSnapshotManifest({
    moduleId: "module-test",
    parentRevision: null,
    objects: [{ logicalKey: "module.ifo", resourceType: 2014, size: ifo.length, sha256: hash }],
  });
  const head = await repository.bootstrap(manifest, { "module.ifo": ifo }, NOW);
  const compiler = new AuroraAreaCreateCompiler(repository, {
    resolve: jest.fn(async () => ({ resRef: "tms01", fingerprintSha256: SET_FINGERPRINT })),
  });
  return { repository, compiler, head };
}

function createCommand(revision: string): AreaCreateCommand {
  const profile = getAurS0505CreationProfile();
  return {
    schemaVersion: "area-create-command.v1",
    moduleId: "module-test",
    expectedModuleRevision: revision,
    creationProfile: {
      id: profile.id,
      fingerprintSha256: AUR_S05_05_CREATION_PROFILE_FINGERPRINT,
    },
    area: { name: "Created Area", resRef: "area_new", tag: "Created_Tag" },
    tileset: { resRef: "tms01", setFingerprintSha256: SET_FINGERPRINT },
    dimensions: { width: 2, height: 2 },
    initializer: {
      algorithmVersion: profile.initializerAlgorithmVersion,
      seed: profile.initializerSeed,
    },
    tiles: profile.tiles,
    groupInstances: [],
    draft: { id: "draft-1", revision: 1, normalizedSha256: "d".repeat(64) },
    clientCommandId: "command-1",
  };
}

function moduleState(revision: string) {
  return { moduleId: "module-test", revision, quarantined: false };
}

function buildModuleIfo(existingArea?: string): Buffer {
  return buildGffBuffer(
    [
      {
        label: "Mod_Area_list",
        type: "list",
        value: existingArea
          ? [{ typeId: 6, fields: [{ label: "Area_Name", type: "resref", value: existingArea }] }]
          : [],
      },
      { label: "Mod_Name", type: "cexolocstring", value: { text: "Test Module" } },
    ],
    "IFO ",
    0xffffffff,
  );
}

function readField(document: ReturnType<typeof parseRawGffDocument>, label: string) {
  if (!document) throw new Error("Expected parsed GFF");
  const field = document.fields.find((candidate) => candidate.label === label);
  if (!field) throw new Error(`Missing ${label}`);
  return field;
}

function readLocStringText(field: ReturnType<typeof readField>): string | undefined {
  if (field.type !== "cexolocstring") return undefined;
  return field.value.text ?? field.value.entries?.[0]?.text;
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
