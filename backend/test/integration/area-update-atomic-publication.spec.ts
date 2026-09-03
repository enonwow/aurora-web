import { createHash } from "node:crypto";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import { AuroraAreaUpdatePersistedReadbackVerifier } from "../../src/modules/areas/adapters/outbound/blob/aurora-area-update-persisted-readback-verifier";
import { AtomicAreaCreateTransactionStorageAdapter } from "../../src/modules/areas/adapters/outbound/snapshot/atomic-area-create-transaction-storage.adapter";
import { MemoryAreaCreateControlStore } from "../../src/modules/areas/adapters/outbound/memory/memory-area-create-control-store";
import { MemoryAreaLifecycleMutationControlStore } from "../../src/modules/areas/adapters/outbound/memory/memory-area-lifecycle-mutation-control-store";
import { MemoryAtomicModuleSnapshotRepository } from "../../src/modules/areas/adapters/outbound/memory/memory-atomic-module-snapshot.repository";
import { AreaUpdateTransactionCoordinator } from "../../src/modules/areas/application/area-update-transaction.coordinator";
import { validateAndNormalizeAreaUpdateCommand } from "../../src/modules/areas/domain/area-update-command.validation";
import type { AreaUpdateCompiledCandidate } from "../../src/modules/areas/domain/area-update-transaction.types";
import { createModuleSnapshotManifest } from "../../src/modules/areas/domain/module-snapshot-manifest";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import {
  inspectAreaGitGicPair,
  mutateExistingAreaObjectsInGitGic,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-object-pair-writer";
import { hashAreaStoreConstructionDependencies } from
  "../../src/modules/areas/domain/area-store-construction-profile";
import {
  readModuleIfoStartLocation,
  updateModuleIfoStartLocation,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-module-ifo-area-writer";
import { updateGitAreaAudioEnvironment } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-audio-writer";
import {
  parseAreaAudioEnvironmentFromGitGff,
  parseAreaVisualEnvironmentFromAreGff,
  parseAreaVisualEnvironmentScalarControlsFromAreGff,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import {
  dynamicPlaceableAdditionFixture,
  placeableAdditionFixture,
} from "../support/area-placeable-construction-fixture";
import { itemAdditionFixture } from "../support/area-item-construction-fixture";
import {
  creatureAdditionFixture,
  expectedCreatureGitFields,
} from "../support/area-creature-construction-fixture";
import {
  expectedStoreGitFields,
  storeAdditionFixture,
} from "../support/area-store-construction-fixture";
import {
  expectedTriggerGitFields,
  triggerAdditionFixture,
} from "../support/area-trigger-construction-fixture";
import {
  dynamicEncounterAdditionFixture,
  encounterAdditionFixture,
  expectedDynamicEncounterGitFields,
  expectedEncounterGitFields,
} from "../support/area-encounter-construction-fixture";
import {
  doorAdditionFixture,
  expectedDoorGitFields,
} from "../support/area-door-construction-fixture";
import {
  dynamicWaypointAdditionFixture,
  expectedDynamicWaypointGitFields,
} from "../support/area-waypoint-construction-fixture";

const MODULE_ID = "workspace:integration";
const AREA = "crypt01";

describe("Area Update atomic publication integration", () => {
  it("publishes one ARE successor, preserves companions, verifies readback, and replays without mutation", async () => {
    const harness = await createHarness();

    const first = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(first.idempotency).toBe("created");
    expect(first.receipt).toMatchObject({
      areaResRef: AREA,
      previousModuleRevision: harness.baselineRevision,
      sourceAreaSha256: sha(harness.baselineContents[`${AREA}.are`]),
      candidateAreaSha256: sha(harness.candidate.resources[0].bytes),
      unchangedCompanions: {
        gitSha256: sha(harness.baselineContents[`${AREA}.git`]),
        gicSha256: sha(harness.baselineContents[`${AREA}.gic`]),
        moduleIfoSha256: sha(harness.baselineContents["module.ifo"]),
      },
      readbackStatus: "verified",
    });
    const publishedHead = await harness.repository.readHead(MODULE_ID);
    expect(publishedHead?.revision).toBe(first.receipt.newModuleRevision);
    expect(publishedHead?.revision).not.toBe(harness.baselineRevision);
    const manifest = await harness.repository.readManifest(publishedHead!.manifestKey);
    for (const logicalKey of [`${AREA}.are`, `${AREA}.git`, `${AREA}.gic`, "module.ifo"] as const) {
      const descriptor = manifest?.objects.find((entry) => entry.logicalKey === logicalKey);
      const retained = await harness.repository.readContent(descriptor!.contentKey);
      if (logicalKey === `${AREA}.are`) {
        expect(retained?.bytes).toEqual(harness.candidate.resources[0].bytes);
      } else {
        expect(retained?.bytes).toEqual(harness.baselineContents[logicalKey]);
      }
    }

    const compileCalls = harness.compiler.compile.mock.calls.length;
    const replay = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });
    expect(replay).toEqual({ idempotency: "replayed", receipt: first.receipt });
    expect(harness.compiler.compile).toHaveBeenCalledTimes(compileCalls);
    expect((await harness.repository.readHead(MODULE_ID))?.revision).toBe(
      first.receipt.newModuleRevision,
    );
  });

  it("atomically publishes exact Area identity, Comments, scripts, and advanced flags with byte-identical companions", async () => {
    const harness = await createHarness({ areaComments: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-area-comments-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const are = await read(`${AREA}.are`);
    expect(parseRawGffDocument(are)?.fields.find((field) => field.label === "Name"))
      .toEqual({
        label: "Name",
        type: "cexolocstring",
        value: {
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, text: "Crypt Updated" }],
        },
      });
    expect(parseRawGffDocument(are)?.fields.find((field) => field.label === "Tag"))
      .toEqual({ label: "Tag", type: "cexostring", value: "CRYPT_UPDATED" });
    expect(parseRawGffDocument(are)?.fields.find((field) => field.label === "Comments"))
      .toEqual({ label: "Comments", type: "cexostring", value: " updated area note " });
    expect(parseRawGffDocument(are)?.fields.find((field) => field.label === "OnEnter"))
      .toEqual({ label: "OnEnter", type: "resref", value: "new_enter" });
    expect(parseRawGffDocument(are)?.fields.find((field) => field.label === "Flags"))
      .toEqual({ label: "Flags", type: "dword", value: 3 });
    expect(parseRawGffDocument(are)?.fields.find((field) => field.label === "PlayerVsPlayer"))
      .toEqual({ label: "PlayerVsPlayer", type: "byte", value: 3 });
    expect(parseRawGffDocument(are)?.fields.find((field) => field.label === "NoRest"))
      .toEqual({ label: "NoRest", type: "byte", value: 1 });
    expect(parseRawGffDocument(are)?.fields.find((field) => field.label === "ModListenCheck"))
      .toEqual({ label: "ModListenCheck", type: "int", value: 9 });
    expect(parseRawGffDocument(are)?.fields.find((field) => field.label === "ModSpotCheck"))
      .toEqual({ label: "ModSpotCheck", type: "int", value: -12 });
    expect(parseRawGffDocument(are)?.fields.find((field) => field.label === "LoadScreenID"))
      .toEqual({ label: "LoadScreenID", type: "word", value: 0xffff });
    expect(await read(`${AREA}.git`)).toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      unchangedCompanions: {
        gitSha256: sha(harness.baselineContents[`${AREA}.git`]),
        gicSha256: sha(harness.baselineContents[`${AREA}.gic`]),
        moduleIfoSha256: sha(harness.baselineContents["module.ifo"]),
      },
    });
  });

  it("atomically changes default and existing alternate Area Name entries in one ordered-list CAS", async () => {
    const harness = await createHarness({ areaComments: true, multiEntryAreaName: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-area-multi-entry-name-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const name = parseRawGffDocument(await read(`${AREA}.are`))?.fields.find(
      (field) => field.label === "Name",
    );
    expect(name).toEqual({
      label: "Name",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 2, text: "Stara krypta" },
          { languageId: 0, text: "Crypt Updated" },
          { languageId: 4, text: "Crypte ancienne" },
        ],
      },
    });
    expect(await read(`${AREA}.git`)).toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      unchangedCompanions: {
        gitSha256: sha(harness.baselineContents[`${AREA}.git`]),
        gicSha256: sha(harness.baselineContents[`${AREA}.gic`]),
        moduleIfoSha256: sha(harness.baselineContents["module.ifo"]),
      },
    });
  });

  it("atomically removes alternate Area Name entries and derives simple target storage", async () => {
    const harness = await createHarness({
      areaComments: true,
      multiEntryAreaName: true,
      removeAlternateAreaName: true,
    });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-area-remove-name-entries-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const name = parseRawGffDocument(await read(`${AREA}.are`))?.fields.find(
      (field) => field.label === "Name",
    );
    expect(name).toEqual({
      label: "Name",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Crypt Updated" }],
      },
    });
    expect(await read(`${AREA}.git`)).toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      unchangedCompanions: {
        gitSha256: sha(harness.baselineContents[`${AREA}.git`]),
        gicSha256: sha(harness.baselineContents[`${AREA}.gic`]),
        moduleIfoSha256: sha(harness.baselineContents["module.ifo"]),
      },
    });
  });

  it("atomically publishes and independently reads back only the complete Area visual environment", async () => {
    const harness = await createHarness({ visualEnvironment: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-area-visual-environment-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const publishedAre = await read(`${AREA}.are`);

    expect(parseAreaVisualEnvironmentFromAreGff(publishedAre)).toEqual(
      integrationVisualEnvironmentTarget(),
    );
    expect(publishedAre).not.toEqual(harness.baselineContents[`${AREA}.are`]);
    expect(await read(`${AREA}.git`)).toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      unchangedCompanions: {
        gitSha256: sha(harness.baselineContents[`${AREA}.git`]),
        gicSha256: sha(harness.baselineContents[`${AREA}.gic`]),
        moduleIfoSha256: sha(harness.baselineContents["module.ifo"]),
      },
    });
  });

  it("atomically publishes and independently reads back only the visual-environment scalar controls", async () => {
    const harness = await createHarness({ visualEnvironmentScalarControls: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-area-visual-environment-scalars-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const publishedAre = await read(`${AREA}.are`);

    expect(parseAreaVisualEnvironmentScalarControlsFromAreGff(publishedAre)).toEqual({
      fogClipDistance: 120,
      windPower: 2,
    });
    expect(parseAreaVisualEnvironmentFromAreGff(publishedAre)).toEqual(
      integrationVisualEnvironmentSource(),
    );
    expect(publishedAre).not.toEqual(harness.baselineContents[`${AREA}.are`]);
    expect(await read(`${AREA}.git`)).toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      unchangedCompanions: {
        gitSha256: sha(harness.baselineContents[`${AREA}.git`]),
        gicSha256: sha(harness.baselineContents[`${AREA}.gic`]),
        moduleIfoSha256: sha(harness.baselineContents["module.ifo"]),
      },
    });
  });

  it("atomically publishes and independently reads back the complete Area audio tuple", async () => {
    const harness = await createHarness({ audioEnvironment: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-area-audio-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const publishedGit = await read(`${AREA}.git`);
    const expected = areaAudioEnvironment();
    const value = {
      ...expected,
      ambientSoundNightVolume: 77,
      musicDelayMilliseconds: -4000,
    };

    expect(parseAreaAudioEnvironmentFromGitGff(publishedGit)).toEqual(value);
    expect(await read(`${AREA}.are`)).toEqual(harness.candidate.resources[0].bytes);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      audioEnvironmentMutation: {
        expectedValue: expected,
        value,
        sourceGitSha256: sha(harness.baselineContents[`${AREA}.git`]),
        candidateGitSha256: sha(publishedGit),
      },
    });
    expect(result.receipt.unchangedCompanions).toBeUndefined();
  });

  it("atomically publishes and independently reads back the complete module Start Location tuple", async () => {
    const harness = await createHarness({ moduleStartLocation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-module-start-location-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const persistedIfo = await read("module.ifo");
    expect(readModuleIfoStartLocation(persistedIfo)).toEqual({
      areaResRef: "other02",
      x: Math.fround(12.5),
      y: Math.fround(-4.25),
      z: Math.fround(0.5),
      directionX: Math.fround(-1),
      directionY: Math.fround(0),
    });
    expect(persistedIfo).not.toEqual(harness.baselineContents["module.ifo"]);
    expect(await read(`${AREA}.git`)).toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      moduleStartLocationMutation: {
        expectedValue: {
          areaResRef: AREA,
          x: 1,
          y: 2,
          z: 3,
          directionX: 0,
          directionY: 1,
        },
        value: {
          areaResRef: "other02",
          x: 12.5,
          y: -4.25,
          z: 0.5,
          directionX: -1,
          directionY: 0,
        },
        sourceIfoSha256: sha(harness.baselineContents["module.ifo"]),
        candidateIfoSha256: sha(persistedIfo),
      },
      moduleIfo: { sha256: sha(persistedIfo) },
    });
  });

  it("rejects a new command against the stale pre-publication revision", async () => {
    const harness = await createHarness();
    await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    await expect(harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-integration-2",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    })).rejects.toMatchObject({
      code: "AREA_UPDATE_MODULE_REVISION_CONFLICT",
      status: 412,
      mutationStarted: false,
    });
  });

  it("publishes paired GIT/GIC object deletion as one verified successor", async () => {
    const harness = await createHarness({ objectDeletion: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-object-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.unchangedCompanions).toBeUndefined();
    expect(result.receipt.objectMutation).toMatchObject({
      totalDeleted: 1,
      deletedCounts: expect.objectContaining({ item: 1, creature: 0 }),
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(inspectAreaGitGicPair(git, gic)).toEqual({
      counts: expect.objectContaining({ creature: 1, item: 0 }),
      total: 1,
    });
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(gic).not.toEqual(harness.baselineContents[`${AREA}.gic`]);
  });

  it("atomically publishes an exact retained Creature Tag while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ creatureTagMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-tag-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const creatureList = parseRawGffDocument(git)?.fields.find(
      (field) => field.label === "Creature List",
    );
    const creature = creatureList?.type === "list" ? creatureList.value[0] : undefined;

    expect(creature?.fields.find((field) => field.label === "Tag")).toEqual({
      label: "Tag",
      type: "cexostring",
      value: "  renamed creature  ",
    });
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes an exact retained Creature Conversation with the ARE candidate while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ creatureConversationMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-conversation-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const creatureList = parseRawGffDocument(git)?.fields.find(
      (field) => field.label === "Creature List",
    );
    const creature = creatureList?.type === "list" ? creatureList.value[0] : undefined;

    expect(creature?.fields.find((field) => field.label === "Conversation")).toEqual({
      label: "Conversation",
      type: "resref",
      value: "guard_dialog",
    });
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.are`)).not.toEqual(harness.baselineContents[`${AREA}.are`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes exact retained Creature Interruptable while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ creatureInterruptableMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-interruptable-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const creatureList = parseRawGffDocument(git)?.fields.find(
      (field) => field.label === "Creature List",
    );
    const creature = creatureList?.type === "list" ? creatureList.value[0] : undefined;

    expect(creature?.fields.find((field) => field.label === "Interruptable")).toEqual({
      label: "Interruptable",
      type: "byte",
      value: 0,
    });
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.are`)).not.toEqual(harness.baselineContents[`${AREA}.are`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes exact retained Creature advanced binary flags while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ creatureAdvancedFlagsMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-advanced-flags-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const creatureList = parseRawGffDocument(git)?.fields.find(
      (field) => field.label === "Creature List",
    );
    const creature = creatureList?.type === "list" ? creatureList.value[0] : undefined;

    expect(creature?.fields).toEqual(expect.arrayContaining([
      { label: "Disarmable", type: "byte", value: 0 },
      { label: "Plot", type: "byte", value: 1 },
      { label: "IsImmortal", type: "byte", value: 1 },
      { label: "Lootable", type: "byte", value: 0 },
      { label: "NoPermDeath", type: "byte", value: 1 },
    ]));
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.are`)).not.toEqual(harness.baselineContents[`${AREA}.are`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes exact retained Creature death-remains fields with Lootable while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ creatureDeathRemainsMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-death-remains-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const creatureList = parseRawGffDocument(git)?.fields.find(
      (field) => field.label === "Creature List",
    );
    const creature = creatureList?.type === "list" ? creatureList.value[0] : undefined;

    expect(creature?.fields).toEqual(expect.arrayContaining([
      { label: "Lootable", type: "byte", value: 1 },
      { label: "BodyBag", type: "byte", value: 3 },
      { label: "DecayTime", type: "dword", value: 12_000 },
    ]));
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.are`)).not.toEqual(harness.baselineContents[`${AREA}.are`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes exact retained Creature Appearance_Type while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ creatureAppearanceMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-appearance-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const creatureList = parseRawGffDocument(git)?.fields.find(
      (field) => field.label === "Creature List",
    );
    const creature = creatureList?.type === "list" ? creatureList.value[0] : undefined;

    expect(creature?.fields.find((field) => field.label === "Appearance_Type")).toEqual({
      label: "Appearance_Type",
      type: "word",
      value: 52,
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes one exact retained Creature Gender Byte while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ creatureGenderMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-gender-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const creatureList = parseRawGffDocument(git)?.fields.find(
      (field) => field.label === "Creature List",
    );
    const creature = creatureList?.type === "list" ? creatureList.value[0] : undefined;

    expect(creature?.fields.find((field) => field.label === "Gender")).toEqual({
      label: "Gender",
      type: "byte",
      value: 0,
    });
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes one selector-bound retained Creature PortraitId Word while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ creaturePortraitMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-portrait-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const creatureList = parseRawGffDocument(git)?.fields.find(
      (field) => field.label === "Creature List",
    );
    const creature = creatureList?.type === "list" ? creatureList.value[0] : undefined;

    expect(creature?.fields.find((field) => field.label === "PortraitId")).toEqual({
      label: "PortraitId",
      type: "word",
      value: 11,
    });
    expect(creature?.fields.find((field) => field.label === "Gender"))
      .toEqual({ label: "Gender", type: "byte", value: 0 });
    expect(creature?.fields.find((field) => field.label === "Race"))
      .toEqual({ label: "Race", type: "byte", value: 4 });
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes one exact retained Creature ChallengeRating Float while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ creatureChallengeRatingMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-challenge-rating-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const creatureList = parseRawGffDocument(git)?.fields.find(
      (field) => field.label === "Creature List",
    );
    const creature = creatureList?.type === "list" ? creatureList.value[0] : undefined;

    expect(creature?.fields.find((field) => field.label === "ChallengeRating")).toEqual({
      label: "ChallengeRating",
      type: "float",
      value: Math.fround(0.1),
    });
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes one exact retained Creature NaturalAC Byte while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ creatureNaturalArmorClassMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-natural-armor-class-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const creatureList = parseRawGffDocument(git)?.fields.find(
      (field) => field.label === "Creature List",
    );
    const creature = creatureList?.type === "list" ? creatureList.value[0] : undefined;

    expect(creature?.fields.find((field) => field.label === "NaturalAC")).toEqual({
      label: "NaturalAC",
      type: "byte",
      value: 2,
    });
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes exact retained Creature saving-throw Shorts while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ creatureSavingThrowBonusesMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-saving-throw-bonuses-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const creatureList = parseRawGffDocument(git)?.fields.find(
      (field) => field.label === "Creature List",
    );
    const creature = creatureList?.type === "list" ? creatureList.value[0] : undefined;

    expect(creature?.fields).toEqual(expect.arrayContaining([
      { label: "refbonus", type: "short", value: 4 },
      { label: "willbonus", type: "short", value: 2 },
      { label: "fortbonus", type: "short", value: 5 },
    ]));
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes one coupled retained Creature alignment mutation", async () => {
    const harness = await createHarness({ creatureAlignmentMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-alignment-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const creatureList = parseRawGffDocument(git)?.fields.find(
      (field) => field.label === "Creature List",
    );
    const creature = creatureList?.type === "list" ? creatureList.value[0] : undefined;

    expect(creature?.fields).toEqual(expect.arrayContaining([
      { label: "GoodEvil", type: "byte", value: 100 },
      { label: "LawfulChaotic", type: "byte", value: 100 },
    ]));
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes changed exact Creature base ability-score Bytes while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ creatureAbilityScoresMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-ability-scores-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const creatureList = parseRawGffDocument(git)?.fields.find(
      (field) => field.label === "Creature List",
    );
    const creature = creatureList?.type === "list" ? creatureList.value[0] : undefined;

    expect(creature?.fields).toEqual(expect.arrayContaining([
      { label: "Str", type: "byte", value: 17 },
      { label: "Dex", type: "byte", value: 12 },
      { label: "Con", type: "byte", value: 14 },
      { label: "Int", type: "byte", value: 10 },
      { label: "Wis", type: "byte", value: 11 },
      { label: "Cha", type: "byte", value: 10 },
    ]));
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes one coupled retained Creature HP Short triplet while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ creatureHitPointsMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-hit-points-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const creatureList = parseRawGffDocument(git)?.fields.find(
      (field) => field.label === "Creature List",
    );
    const creature = creatureList?.type === "list" ? creatureList.value[0] : undefined;

    expect(creature?.fields).toEqual(expect.arrayContaining([
      { label: "HitPoints", type: "short", value: 25 },
      { label: "CurrentHitPoints", type: "short", value: 20 },
      { label: "MaxHitPoints", type: "short", value: 35 },
      { label: "Con", type: "byte", value: 14 },
    ]));
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes one exact retained Creature FactionID Word while preserving GIC, FAC, and IFO bytes", async () => {
    const harness = await createHarness({ creatureFactionMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-faction-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const creatureList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Creature List",
    );
    expect(creatureList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "FactionID", type: "word", value: 2 },
        ]),
      })],
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(await read("repute.fac")).toEqual(harness.factionCatalogBytes);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        totalPropertyUpdated: 1,
        propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
      },
    });
  });

  it("atomically publishes one exact retained Creature TemplateResRef with expected ARE publication and byte-identical GIC/IFO", async () => {
    const harness = await createHarness({ creatureTemplateResRefMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-template-resref-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const creatureList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Creature List",
    );
    expect(creatureList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "TemplateResRef", type: "resref", value: "nw_guard_alt" },
        ]),
      })],
    });
    expect(await read(`${AREA}.are`)).toEqual(harness.candidate.resources[0].bytes);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        totalPropertyUpdated: 1,
        propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
      },
    });
  });

  it("atomically publishes exact retained Creature Subrace/Deity with expected ARE publication and byte-identical GIC/IFO", async () => {
    const harness = await createHarness({ creatureSpecialIdentityStringsMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-subrace-deity-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const creatureList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Creature List",
    );
    expect(creatureList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Subrace", type: "cexostring", value: "Sun Elf" },
          { label: "Deity", type: "cexostring", value: "Mystra" },
        ]),
      })],
    });
    expect(await read(`${AREA}.are`)).toEqual(harness.candidate.resources[0].bytes);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        totalPropertyUpdated: 1,
        propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
      },
    });
  });

  it("atomically publishes exact retained Creature script ResRefs with expected ARE publication and byte-identical GIC/IFO", async () => {
    const harness = await createHarness({ creatureScriptResRefsMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-script-resrefs-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const creatureList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Creature List",
    );
    expect(creatureList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "ScriptHeartbeat", type: "resref", value: "main" },
          { label: "ScriptSpawn", type: "resref", value: "spawn_probe" },
          { label: "ScriptDeath", type: "resref", value: "nw_c2_default7" },
        ]),
      })],
    });
    expect(await read(`${AREA}.are`)).toEqual(harness.candidate.resources[0].bytes);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        totalPropertyUpdated: 1,
        propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
      },
    });
  });

  it("atomically publishes exact retained Creature names while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ creatureLocalizedStringMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-name-localized-strings-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const creatureList = parseRawGffDocument(git)?.fields.find(
      (field) => field.label === "Creature List",
    );
    const creature = creatureList?.type === "list" ? creatureList.value[0] : undefined;

    expect(creature?.fields.filter(
      (field) => field.label === "FirstName" || field.label === "LastName",
    )).toEqual([
      {
        label: "FirstName",
        type: "cexolocstring",
        value: {
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, text: "  Captain  " }],
        },
      },
      {
        label: "LastName",
        type: "cexolocstring",
        value: {
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, text: "Aribeth" }],
        },
      },
    ]);
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes one exact retained Placeable Faction while preserving GIC, FAC, and IFO bytes", async () => {
    const harness = await createHarness({ placeableFactionMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-placeable-faction-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const placeableList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Faction", type: "dword", value: 2 },
        ]),
      })],
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(await read("repute.fac")).toEqual(harness.factionCatalogBytes);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        totalPropertyUpdated: 1,
        propertyUpdatedCounts: { placeable: 1 },
      },
    });
  });

  it("atomically publishes one exact retained Placeable PortraitId Word while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ placeablePortraitMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-placeable-portrait-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const placeableList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "PortraitId", type: "word", value: 15_157 },
        ]),
      })],
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        totalPropertyUpdated: 1,
        propertyUpdatedCounts: { placeable: 1 },
      },
    });
  });

  it("atomically publishes one exact retained Placeable TemplateResRef while preserving renderer-independent GIC and IFO bytes", async () => {
    const harness = await createHarness({ placeableTemplateResRefMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-placeable-template-resref-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const placeableList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "TemplateResRef", type: "resref", value: "plc_chest_alt" },
        ]),
      })],
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        totalPropertyUpdated: 1,
        propertyUpdatedCounts: { placeable: 1 },
      },
    });
  });

  it("atomically publishes one exact retained Placeable BodyBag Byte while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ placeableBodyBagMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-placeable-body-bag-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const placeableList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "BodyBag", type: "byte", value: 1 },
        ]),
      })],
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        totalPropertyUpdated: 1,
        propertyUpdatedCounts: { placeable: 1 },
      },
    });
  });

  it("atomically publishes one exact retained Placeable TrapType Byte while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ placeableTrapTypeMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-placeable-trap-type-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const placeableList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "TrapType", type: "byte", value: 1 },
        ]),
      })],
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        totalPropertyUpdated: 1,
        propertyUpdatedCounts: { placeable: 1 },
      },
    });
  });

  it("atomically publishes one exact retained Placeable AnimationState Byte while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ placeableAnimationStateMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-placeable-animation-state-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const placeableList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "AnimationState", type: "byte", value: 2 },
        ]),
      })],
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        totalPropertyUpdated: 1,
        propertyUpdatedCounts: { placeable: 1 },
      },
    });
  });

  it("atomically publishes exact retained Placeable Conversation and Interruptable fields while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ placeableConversationInterruptableMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-placeable-conversation-interruptable-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const placeableList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Conversation", type: "resref", value: "chest_dialog" },
          { label: "Interruptable", type: "byte", value: 0 },
        ]),
      })],
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        totalPropertyUpdated: 1,
        propertyUpdatedCounts: { placeable: 1 },
      },
    });
  });

  it("atomically publishes exact retained Placeable Static and Useable Bytes while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ placeableStaticUseableMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-placeable-static-useable-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const placeableList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Static", type: "byte", value: 0 },
          { label: "Useable", type: "byte", value: 1 },
        ]),
      })],
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        totalPropertyUpdated: 1,
        propertyUpdatedCounts: { placeable: 1 },
      },
    });
  });

  it("atomically publishes exact retained Placeable Plot and HasInventory Bytes while preserving ItemList, GIC, and IFO bytes", async () => {
    const harness = await createHarness({ placeablePlotHasInventoryMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-placeable-plot-has-inventory-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const placeableList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Plot", type: "byte", value: 1 },
          { label: "HasInventory", type: "byte", value: 1 },
        ]),
      })],
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        totalPropertyUpdated: 1,
        propertyUpdatedCounts: { placeable: 1 },
      },
    });
  });

  it("atomically publishes exact retained Placeable durability and save Bytes while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ placeableDurabilitySaveBytesMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-placeable-durability-save-bytes-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const placeableList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Hardness", type: "byte", value: 8 },
          { label: "Fort", type: "byte", value: 20 },
          { label: "Ref", type: "byte", value: 12 },
          { label: "Will", type: "byte", value: 10 },
        ]),
      })],
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        totalPropertyUpdated: 1,
        propertyUpdatedCounts: { placeable: 1 },
      },
    });
  });

  it("atomically publishes exact retained Placeable HP and derived CurrentHP Shorts while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ placeableHitPointsMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-placeable-hit-points-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const placeableList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "HP", type: "short", value: 30 },
          { label: "CurrentHP", type: "short", value: 90 },
        ]),
      })],
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        totalPropertyUpdated: 1,
        propertyUpdatedCounts: { placeable: 1 },
      },
    });
  });

  it("atomically publishes the exact paired Placeable GIC Comment while preserving GIT and IFO bytes", async () => {
    const harness = await createHarness({ placeableEditorCommentMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-placeable-editor-comment-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const gic = await read(`${AREA}.gic`);
    const placeableList = parseRawGffDocument(gic)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          {
            label: "Comment",
            type: "cexostring",
            value: "Water trough beside the west wall.",
          },
        ]),
      })],
    });
    expect(await read(`${AREA}.git`)).toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        totalPropertyUpdated: 1,
        propertyUpdatedCounts: { placeable: 1 },
      },
    });
  });

  it("atomically publishes the exact paired Store GIC Comment while preserving GIT and IFO bytes", async () => {
    const harness = await createHarness({ storeEditorCommentMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-store-editor-comment-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const gic = await read(`${AREA}.gic`);
    const storeList = parseRawGffDocument(gic)!.fields.find(
      (field) => field.label === "StoreList",
    );
    expect(storeList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([{
          label: "Comment",
          type: "cexostring",
          value: "  Storekeeper route\r\ne\u0301  ",
        }]),
      })],
    });
    expect(await read(`${AREA}.git`)).toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        totalPropertyUpdated: 1,
        propertyUpdatedCounts: { store: 1 },
      },
    });
  });

  it("atomically publishes the exact paired Creature GIC Comment while preserving GIT and IFO bytes", async () => {
    const harness = await createHarness({ creatureEditorCommentMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-editor-comment-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const gic = await read(`${AREA}.gic`);
    const creatureList = parseRawGffDocument(gic)!.fields.find(
      (field) => field.label === "Creature List",
    );
    expect(creatureList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([{
          label: "Comment",
          type: "cexostring",
          value: "  Guard route\r\ne\u0301  ",
        }]),
      })],
    });
    expect(await read(`${AREA}.git`)).toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        totalPropertyUpdated: 1,
        propertyUpdatedCounts: { creature: 1 },
      },
    });
  });

  it("publishes a paired waypoint addition and reads back its exact native fields", async () => {
    const harness = await createHarness({ waypointAddition: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-waypoint-addition-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalAdded: 1,
      addedCounts: expect.objectContaining({ waypoint: 1 }),
      blueprintSources: [expect.objectContaining({
        sourceProfileId: "nwn-base-key-utw-v1",
        templateResRef: "nw_waypoint001",
        addedCount: 1,
      })],
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(inspectAreaGitGicPair(git, gic)).toEqual({
      counts: expect.objectContaining({ waypoint: 1 }),
      total: 3,
    });
    const gitWaypoint = parseRawGffDocument(git)?.fields.find((field) => field.label === "WaypointList");
    const gicWaypoint = parseRawGffDocument(gic)?.fields.find((field) => field.label === "WaypointList");
    expect(gitWaypoint?.type === "list" ? gitWaypoint.value[0]?.fields : []).toEqual(
      expect.arrayContaining([
        { label: "TemplateResRef", type: "resref", value: "nw_waypoint001" },
        { label: "Tag", type: "cexostring", value: "NW_WAYPOINT001" },
        { label: "XPosition", type: "float", value: 35 },
        { label: "YPosition", type: "float", value: 47.5 },
      ]),
    );
    expect(gicWaypoint?.type === "list" ? gicWaypoint.value[0]?.fields : []).toEqual([
      { label: "Comment", type: "cexostring", value: "Patrol path waypoint." },
    ]);
    expect(result.receipt.readbackStatus).toBe("verified");
  });

  it("atomically publishes and independently reads back a dynamic effective-catalog Waypoint", async () => {
    const harness = await createHarness({ dynamicWaypointAddition: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-dynamic-waypoint-addition-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalAdded: 1,
      addedCounts: expect.objectContaining({ waypoint: 1 }),
      blueprintSources: [expect.objectContaining({
        sourceProfileId: "effective-catalog-utw-waypoint-copy-v1",
        templateResRef: "wp_dynamic",
        sourceSha256: dynamicWaypointAdditionFixture().sourceSha256,
        dependencyCount: 0,
        addedCount: 1,
      })],
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(inspectAreaGitGicPair(git, gic)).toEqual({
      counts: expect.objectContaining({ waypoint: 1 }),
      total: 3,
    });
    const gitWaypoints = parseRawGffDocument(git)?.fields.find(
      (field) => field.label === "WaypointList",
    );
    const gicWaypoints = parseRawGffDocument(gic)?.fields.find(
      (field) => field.label === "WaypointList",
    );
    const transform = { x: 3.25, y: 4.5, z: 0.125, bearing: Math.PI / 3 };
    expect(gitWaypoints?.type === "list" ? gitWaypoints.value.at(-1) : undefined).toEqual({
      typeId: 5,
      fields: expectedDynamicWaypointGitFields(transform),
    });
    expect(gicWaypoints?.type === "list" ? gicWaypoints.value.at(-1) : undefined).toEqual({
      typeId: 5,
      fields: [{
        label: "Comment",
        type: "cexostring",
        value: "Dynamic waypoint palette comment.",
      }],
    });
    expect(result.receipt.readbackStatus).toBe("verified");
  });

  it("publishes a paired sound addition and reads back its exact native fields", async () => {
    const harness = await createHarness({ soundAddition: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-sound-addition-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalAdded: 1,
      addedCounts: expect.objectContaining({ sound: 1, waypoint: 0 }),
      blueprintSources: [expect.objectContaining({
        sourceProfileId: "nwn-base-key-uts-animalcriesday-v1",
        templateResRef: "animalcriesday",
        addedCount: 1,
      })],
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(inspectAreaGitGicPair(git, gic)).toEqual({
      counts: expect.objectContaining({ sound: 1, waypoint: 0 }),
      total: 3,
    });
    const gitSound = parseRawGffDocument(git)?.fields.find((field) => field.label === "SoundList");
    const gicSound = parseRawGffDocument(gic)?.fields.find((field) => field.label === "SoundList");
    expect(gitSound?.type === "list" ? gitSound.value[0]?.fields : []).toEqual(
      expect.arrayContaining([
        { label: "TemplateResRef", type: "resref", value: "animalcriesday" },
        { label: "Tag", type: "cexostring", value: "AnimalCriesDay" },
        { label: "Priority", type: "byte", value: 20 },
        { label: "GeneratedType", type: "dword", value: 0 },
        { label: "XPosition", type: "float", value: 37.5 },
        { label: "YPosition", type: "float", value: 49 },
      ]),
    );
    expect(gicSound?.type === "list" ? gicSound.value[0]?.fields : []).toEqual([
      { label: "PlayInToolset", type: "byte", value: 1 },
      { label: "Comment", type: "cexostring", value: "" },
    ]);
    expect(result.receipt.readbackStatus).toBe("verified");
  });

  it("publishes a paired placeable addition and reads back its exact native fields", async () => {
    const harness = await createHarness({ placeableAddition: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-placeable-addition-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalAdded: 1,
      addedCounts: expect.objectContaining({ placeable: 1, sound: 0, waypoint: 0 }),
      blueprintSources: [expect.objectContaining({
        sourceProfileId: "nwn-base-key-utp-plc-watertrough-v1",
        templateResRef: "plc_watertrough",
        addedCount: 1,
      })],
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(inspectAreaGitGicPair(git, gic)).toEqual({
      counts: expect.objectContaining({ placeable: 1, sound: 0, waypoint: 0 }),
      total: 3,
    });
    const gitPlaceable = parseRawGffDocument(git)?.fields.find((field) => field.label === "Placeable List");
    const gicPlaceable = parseRawGffDocument(gic)?.fields.find((field) => field.label === "Placeable List");
    expect(gitPlaceable?.type === "list" ? gitPlaceable.value[0]?.fields : []).toEqual(
      expect.arrayContaining([
        { label: "TemplateResRef", type: "resref", value: "plc_watertrough" },
        { label: "Tag", type: "cexostring", value: "WaterTrough" },
        { label: "PortraitId", type: "word", value: 462 },
        { label: "Static", type: "byte", value: 1 },
        { label: "HasInventory", type: "byte", value: 0 },
        { label: "X", type: "float", value: Math.fround(27.44) },
        { label: "Y", type: "float", value: Math.fround(29.76) },
        { label: "Z", type: "float", value: Math.fround(1.25) },
        { label: "Bearing", type: "float", value: Math.fround(Math.PI / 3) },
      ]),
    );
    expect(gicPlaceable?.type === "list" ? gicPlaceable.value[0]?.fields : []).toEqual([
      { label: "Comment", type: "cexostring", value: "Water Trough" },
    ]);
    expect(result.receipt.readbackStatus).toBe("verified");
  });

  it("atomically publishes and independently reads back a dynamic effective-catalog Placeable", async () => {
    const harness = await createHarness({ dynamicPlaceableAddition: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-dynamic-placeable-addition-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalAdded: 1,
      addedCounts: expect.objectContaining({ placeable: 1 }),
      blueprintSources: [{
        sourceProfileId: "effective-catalog-utp-placeable-copy-v1",
        templateResRef: "plc_watertrough",
        sourceSha256: dynamicPlaceableAdditionFixture().sourceSha256,
        addedCount: 1,
      }],
    });
    expect(result.receipt.readbackStatus).toBe("verified");

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(inspectAreaGitGicPair(git, gic)).toEqual({
      counts: expect.objectContaining({ placeable: 1 }),
      total: 3,
    });

    const gitPlaceable = parseRawGffDocument(git)?.fields.find(
      (field) => field.label === "Placeable List",
    );
    const gicPlaceable = parseRawGffDocument(gic)?.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(gitPlaceable?.type === "list" ? gitPlaceable.value[0]?.fields : []).toEqual(
      expect.arrayContaining([
        { label: "TemplateResRef", type: "resref", value: "plc_watertrough" },
        { label: "Tag", type: "cexostring", value: "Water Trough" },
        { label: "PortraitId", type: "word", value: 462 },
        { label: "BodyBag", type: "byte", value: 0 },
        { label: "Static", type: "byte", value: 1 },
        { label: "OnClick", type: "resref", value: "" },
        { label: "X", type: "float", value: Math.fround(27.44) },
        { label: "Y", type: "float", value: Math.fround(29.76) },
        { label: "Z", type: "float", value: Math.fround(1.25) },
        { label: "Bearing", type: "float", value: Math.fround(Math.PI / 3) },
      ]),
    );
    expect(gicPlaceable?.type === "list" ? gicPlaceable.value[0]?.fields : []).toEqual([
      { label: "Comment", type: "cexostring", value: "Water Trough" },
    ]);
  });

  it("publishes a paired ground-item addition and reads back its exact native fields", async () => {
    const harness = await createHarness({ itemAddition: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-item-addition-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalAdded: 1,
      addedCounts: expect.objectContaining({ item: 1, placeable: 0, sound: 0, waypoint: 0 }),
      blueprintSources: [expect.objectContaining({
        sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
        templateResRef: "nw_cloth022",
        addedCount: 1,
      })],
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(inspectAreaGitGicPair(git, gic)).toEqual({
      counts: expect.objectContaining({ creature: 1, item: 2, placeable: 0, sound: 0, waypoint: 0 }),
      total: 3,
    });
    const gitItems = parseRawGffDocument(git)?.fields.find((field) => field.label === "List");
    const gicItems = parseRawGffDocument(gic)?.fields.find((field) => field.label === "List");
    const gitItemStructures = gitItems?.type === "list" ? gitItems.value : [];
    const gicItemStructures = gicItems?.type === "list" ? gicItems.value : [];
    const addedItemIndex = gitItemStructures.findIndex((structure) => structure.fields.some(
      (field) => field.label === "TemplateResRef" && field.type === "resref" && field.value === "nw_cloth022",
    ));
    expect(addedItemIndex).toBeGreaterThanOrEqual(0);
    expect(gitItemStructures[addedItemIndex]?.fields ?? []).toEqual(
      expect.arrayContaining([
        { label: "TemplateResRef", type: "resref", value: "nw_cloth022" },
        { label: "Tag", type: "cexostring", value: "NW_CLOTH022" },
        { label: "BaseItem", type: "int", value: 16 },
        { label: "StackSize", type: "word", value: 1 },
        { label: "Cursed", type: "byte", value: 0 },
        { label: "ArmorPart_Torso", type: "byte", value: 39 },
        { label: "xArmorPart_Torso", type: "word", value: 39 },
        { label: "XPosition", type: "float", value: Math.fround(15) },
        { label: "YPosition", type: "float", value: Math.fround(22.5) },
        { label: "ZPosition", type: "float", value: Math.fround(1) },
      ]),
    );
    expect(gicItemStructures[addedItemIndex]?.fields ?? []).toEqual([
      { label: "Comment", type: "cexostring", value: "1" },
    ]);
    expect(result.receipt.readbackStatus).toBe("verified");
  });

  it("publishes a paired creature addition and reads back its exact native fields", async () => {
    const harness = await createHarness({ creatureAddition: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-creature-addition-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalAdded: 1,
      addedCounts: expect.objectContaining({ creature: 1, item: 0, placeable: 0, sound: 0, waypoint: 0 }),
      blueprintSources: [expect.objectContaining({
        sourceProfileId: "nwn-base-key-utc-nw-chicken-v1",
        templateResRef: "nw_chicken",
        addedCount: 1,
      })],
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(inspectAreaGitGicPair(git, gic)).toEqual({
      counts: expect.objectContaining({ creature: 2, item: 1, placeable: 0, sound: 0, waypoint: 0 }),
      total: 3,
    });
    const gitCreatures = parseRawGffDocument(git)?.fields.find((field) => field.label === "Creature List");
    const gicCreatures = parseRawGffDocument(gic)?.fields.find((field) => field.label === "Creature List");
    const transform = { x: 1.5, y: 2.25, z: 0.1, bearing: Math.PI / 4 };
    expect(gitCreatures?.type === "list" ? gitCreatures.value.at(-1) : undefined).toEqual({
      typeId: 4,
      fields: expectedCreatureGitFields(transform),
    });
    expect(gicCreatures?.type === "list" ? gicCreatures.value.at(-1) : undefined).toEqual({
      typeId: 4,
      fields: [{ label: "Comment", type: "cexostring", value: "" }],
    });
    expect(result.receipt.readbackStatus).toBe("verified");
  });

  it("publishes a paired store addition and reads back its complete native inventory", async () => {
    const harness = await createHarness({ storeAddition: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-store-addition-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalAdded: 1,
      addedCounts: expect.objectContaining({ creature: 0, item: 0, placeable: 0, sound: 0, store: 1, waypoint: 0 }),
      blueprintSources: [expect.objectContaining({
        sourceProfileId: "nwn-base-key-utm-x2-merc-dye-v1",
        templateResRef: "x2_merc_dye",
        addedCount: 1,
      })],
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(inspectAreaGitGicPair(git, gic)).toEqual({
      counts: expect.objectContaining({ creature: 1, item: 1, placeable: 0, sound: 0, store: 1, waypoint: 0 }),
      total: 3,
    });
    const gitStores = parseRawGffDocument(git)?.fields.find((field) => field.label === "StoreList");
    const gicStores = parseRawGffDocument(gic)?.fields.find((field) => field.label === "StoreList");
    const transform = {
      x: 4.291445541381836,
      y: 5.039402770996094,
      z: 0.00000005,
      bearing: Math.PI * 1.5,
    };
    expect(gitStores?.type === "list" ? gitStores.value.at(-1) : undefined).toEqual({
      typeId: 11,
      fields: expectedStoreGitFields(transform),
    });
    expect(gicStores?.type === "list" ? gicStores.value.at(-1) : undefined).toEqual({
      typeId: 11,
      fields: [{ label: "Comment", type: "cexostring", value: "Sample Dye Store" }],
    });
    expect(result.receipt.readbackStatus).toBe("verified");
  });

  it("atomically publishes a dynamic effective-catalog Store and its expanded UTI inventory", async () => {
    const harness = await createHarness({ dynamicStoreAddition: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-dynamic-store-addition-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalAdded: 1,
      addedCounts: expect.objectContaining({ store: 1 }),
      blueprintSources: [expect.objectContaining({
        sourceProfileId: "effective-catalog-utm-store-copy-v1",
        templateResRef: "str_dynamic",
        dependencyCount: 1,
        addedCount: 1,
      })],
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const gitDescriptor = manifest!.objects.find((entry) => entry.logicalKey === `${AREA}.git`)!;
    const git = (await harness.repository.readContent(gitDescriptor.contentKey))!.bytes;
    const stores = parseRawGffDocument(git)?.fields.find((field) => field.label === "StoreList");
    const store = stores?.type === "list" ? stores.value.at(-1) : undefined;
    const repositories = store?.fields.find((field) => field.label === "StoreList");
    const itemList = repositories?.type === "list"
      ? repositories.value[0]?.fields.find((field) => field.label === "ItemList")
      : undefined;
    expect(itemList?.type === "list" ? itemList.value[0] : undefined).toMatchObject({
      fields: expect.arrayContaining([
        { label: "TemplateResRef", type: "resref", value: "itm_store_child" },
        { label: "BaseItem", type: "int", value: 22 },
      ]),
    });
    expect(result.receipt.readbackStatus).toBe("verified");
  });

  it("publishes a paired trigger addition and independently reads back its exact polygon", async () => {
    const harness = await createHarness({ triggerAddition: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-trigger-addition-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalAdded: 1,
      addedCounts: expect.objectContaining({ creature: 0, store: 0, trigger: 1, waypoint: 0 }),
      blueprintSources: [expect.objectContaining({
        sourceProfileId: "nwn-base-key-utt-newgeneric-v1",
        templateResRef: "newgeneric",
        addedCount: 1,
      })],
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(inspectAreaGitGicPair(git, gic)).toEqual({
      counts: expect.objectContaining({ creature: 1, item: 1, store: 0, trigger: 1, waypoint: 0 }),
      total: 3,
    });
    const gitTriggers = parseRawGffDocument(git)?.fields.find((field) => field.label === "TriggerList");
    const gicTriggers = parseRawGffDocument(gic)?.fields.find((field) => field.label === "TriggerList");
    const transform = { x: 3.547599411010742, y: 4.491108703613281, z: 0, bearing: 0 };
    expect(gitTriggers?.type === "list" ? gitTriggers.value.at(-1) : undefined).toEqual({
      typeId: 1,
      fields: expectedTriggerGitFields(transform),
    });
    expect(gicTriggers?.type === "list" ? gicTriggers.value.at(-1) : undefined).toEqual({
      typeId: 1,
      fields: [{ label: "Comment", type: "cexostring", value: "" }],
    });
    expect(result.receipt.readbackStatus).toBe("verified");
  });

  it("publishes a paired encounter addition and independently reads back its exact polygon", async () => {
    const harness = await createHarness({ encounterAddition: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-encounter-addition-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalAdded: 1,
      addedCounts: expect.objectContaining({ creature: 0, encounter: 1, trigger: 0, waypoint: 0 }),
      blueprintSources: [expect.objectContaining({
        sourceProfileId: "nwn-base-key-ute-x2-gnoll001-v1",
        templateResRef: "x2_gnoll001",
        addedCount: 1,
      })],
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(inspectAreaGitGicPair(git, gic)).toEqual({
      counts: expect.objectContaining({ creature: 1, encounter: 1, item: 1, trigger: 0, waypoint: 0 }),
      total: 3,
    });
    const gitEncounters = parseRawGffDocument(git)?.fields.find((field) => field.label === "Encounter List");
    const gicEncounters = parseRawGffDocument(gic)?.fields.find((field) => field.label === "Encounter List");
    const transform = { x: 2.241201591491699, y: 4.51970329284668, z: 0, bearing: 0 };
    expect(gitEncounters?.type === "list" ? gitEncounters.value.at(-1) : undefined).toEqual({
      typeId: 7,
      fields: expectedEncounterGitFields(transform),
    });
    expect(gicEncounters?.type === "list" ? gicEncounters.value.at(-1) : undefined).toEqual({
      typeId: 7,
      fields: [],
    });
    expect(result.receipt.readbackStatus).toBe("verified");
  });

  it("atomically publishes and independently reads back a dynamic effective-catalog Encounter", async () => {
    const harness = await createHarness({ dynamicEncounterAddition: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-dynamic-encounter-addition-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalAdded: 1,
      addedCounts: expect.objectContaining({ encounter: 1 }),
      blueprintSources: [expect.objectContaining({
        sourceProfileId: "effective-catalog-ute-encounter-copy-v1",
        templateResRef: "enc_dynamic",
        sourceSha256: dynamicEncounterAdditionFixture().sourceSha256,
        dependencyCount: 0,
        addedCount: 1,
      })],
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    const gitEncounters = parseRawGffDocument(git)?.fields.find(
      (field) => field.label === "Encounter List",
    );
    const gicEncounters = parseRawGffDocument(gic)?.fields.find(
      (field) => field.label === "Encounter List",
    );
    const transform = { x: 3.25, y: 4.5, z: 0.125, bearing: 0 };
    expect(gitEncounters?.type === "list" ? gitEncounters.value.at(-1) : undefined).toEqual({
      typeId: 7,
      fields: expectedDynamicEncounterGitFields(transform),
    });
    expect(gicEncounters?.type === "list" ? gicEncounters.value.at(-1) : undefined).toEqual({
      typeId: 7,
      fields: [],
    });
    expect(result.receipt.readbackStatus).toBe("verified");
  });

  it("atomically publishes and independently reads back the exact type-8 door-hook pair", async () => {
    const harness = await createHarness({ doorAddition: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-door-hook-addition-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalAdded: 1,
      addedCounts: expect.objectContaining({ door: 1, encounter: 0, trigger: 0 }),
      blueprintSources: [expect.objectContaining({
        sourceProfileId: "nwn-base-key-utd-nw-door-ttr-04-tin01-121-0-v1",
        templateResRef: "nw_door_ttr_04",
        sourceSha256: doorAdditionFixture(0, 0).sourceSha256,
        addedCount: 1,
      })],
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(inspectAreaGitGicPair(git, gic)).toEqual({
      counts: expect.objectContaining({ creature: 1, door: 1, encounter: 0, item: 1 }),
      total: 3,
    });
    const gitDoors = parseRawGffDocument(git)?.fields.find((field) => field.label === "Door List");
    const gicDoors = parseRawGffDocument(gic)?.fields.find((field) => field.label === "Door List");
    expect(gitDoors?.type === "list" ? gitDoors.value.at(-1) : undefined).toEqual({
      typeId: 8,
      fields: expectedDoorGitFields(0, 0),
    });
    expect(gicDoors?.type === "list" ? gicDoors.value.at(-1) : undefined).toEqual({
      typeId: 8,
      fields: [{ label: "Comment", type: "cexostring", value: "Barn 1 Door" }],
    });
    expect(result.receipt.readbackStatus).toBe("verified");
  });

  it("atomically publishes one exact retained Door transition trio while preserving GIC", async () => {
    const harness = await createHarness({ doorTransitionMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-door-transition-storage-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 0,
      totalPropertyUpdated: 1,
      totalAdded: 0,
      propertyUpdatedCounts: expect.objectContaining({ door: 1 }),
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(gic).toEqual(harness.baselineContents[`${AREA}.gic`]);
    const gitDoors = parseRawGffDocument(git)?.fields.find((field) => field.label === "Door List");
    expect(gitDoors?.type === "list" ? gitDoors.value[0]?.fields : undefined)
      .toEqual(expect.arrayContaining([
        { label: "LinkedTo", type: "cexostring", value: "NEW_DEST" },
        { label: "LinkedToFlags", type: "byte", value: 2 },
        { label: "LoadScreenID", type: "word", value: 7 },
      ]));
    expect(result.receipt.readbackStatus).toBe("verified");
  });

  it("publishes a creature transform while retaining the exact GIC companion", async () => {
    const harness = await createHarness({ objectTransform: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-transform-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 1,
      transformedCounts: expect.objectContaining({ creature: 1 }),
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(gic).toEqual(harness.baselineContents[`${AREA}.gic`]);
    const creatureList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Creature List",
    );
    expect(creatureList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "XPosition", type: "float", value: Math.fround(61.47) },
          { label: "YPosition", type: "float", value: Math.fround(27.18) },
          { label: "ZPosition", type: "float", value: Math.fround(0.25) },
        ]),
      })],
    });
  });

  it("publishes a placeable placement transform while retaining the exact GIC companion", async () => {
    const harness = await createHarness({ placeableTransform: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-placeable-transform-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 1,
      transformedCounts: expect.objectContaining({ creature: 0, placeable: 1 }),
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(gic).toEqual(harness.baselineContents[`${AREA}.gic`]);
    const placeableList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "X", type: "float", value: 45 },
          { label: "Y", type: "float", value: 55 },
          { label: "Z", type: "float", value: 2.5 },
          { label: "Bearing", type: "float", value: Math.fround(Math.PI / 4) },
        ]),
      })],
    });
  });

  it("publishes a waypoint transform while retaining the exact GIC companion", async () => {
    const harness = await createHarness({ waypointTransform: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-waypoint-transform-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 1,
      transformedCounts: expect.objectContaining({ creature: 0, placeable: 0, waypoint: 1 }),
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(gic).toEqual(harness.baselineContents[`${AREA}.gic`]);
    const waypointList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "WaypointList",
    );
    expect(waypointList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "XPosition", type: "float", value: 35 },
          { label: "YPosition", type: "float", value: 47.5 },
          { label: "ZPosition", type: "float", value: 3.5 },
          { label: "XOrientation", type: "float", value: Math.fround(Math.cos(Math.PI * 1.25)) },
          { label: "YOrientation", type: "float", value: Math.fround(-Math.sin(Math.PI * 1.25)) },
        ]),
      })],
    });
  });

  it("publishes a ground-item transform while retaining the exact GIC companion", async () => {
    const harness = await createHarness({ itemTransform: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-item-transform-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 1,
      transformedCounts: expect.objectContaining({ creature: 0, item: 1, waypoint: 0 }),
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(gic).toEqual(harness.baselineContents[`${AREA}.gic`]);
    const itemList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "List",
    );
    expect(itemList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "XPosition", type: "float", value: 35 },
          { label: "YPosition", type: "float", value: 42.5 },
          { label: "ZPosition", type: "float", value: 2 },
          { label: "XOrientation", type: "float", value: Math.fround(Math.cos(Math.PI / 3)) },
          { label: "YOrientation", type: "float", value: Math.fround(-Math.sin(Math.PI / 3)) },
        ]),
      })],
    });
  });

  it("publishes a position-only sound transform while retaining the exact GIC companion", async () => {
    const harness = await createHarness({ soundTransform: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-sound-transform-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 1,
      transformedCounts: expect.objectContaining({ creature: 0, item: 0, sound: 1 }),
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(gic).toEqual(harness.baselineContents[`${AREA}.gic`]);
    const soundList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "SoundList",
    );
    expect(soundList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "XPosition", type: "float", value: 27.5 },
          { label: "YPosition", type: "float", value: 32.5 },
          { label: "ZPosition", type: "float", value: 5 },
        ]),
      })],
    });
  });

  it("publishes a store transform while retaining the exact GIC companion", async () => {
    const harness = await createHarness({ storeTransform: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-store-transform-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 1,
      transformedCounts: expect.objectContaining({ sound: 0, store: 1, waypoint: 0 }),
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(gic).toEqual(harness.baselineContents[`${AREA}.gic`]);
    const storeList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "StoreList",
    );
    expect(storeList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "XPosition", type: "float", value: 47.5 },
          { label: "YPosition", type: "float", value: 52.5 },
          { label: "ZPosition", type: "float", value: 1 },
          { label: "XOrientation", type: "float", value: Math.fround(Math.cos(Math.PI / 3)) },
          { label: "YOrientation", type: "float", value: Math.fround(-Math.sin(Math.PI / 3)) },
        ]),
      })],
    });
  });

  it("publishes a trigger origin transform while retaining geometry, orientation, and exact GIC", async () => {
    const harness = await createHarness({ triggerTransform: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-trigger-transform-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 1,
      transformedCounts: expect.objectContaining({ store: 0, trigger: 1, waypoint: 0 }),
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(gic).toEqual(harness.baselineContents[`${AREA}.gic`]);
    const triggerList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "TriggerList",
    );
    expect(triggerList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "XPosition", type: "float", value: 42.5 },
          { label: "YPosition", type: "float", value: 57.5 },
          { label: "ZPosition", type: "float", value: 5 },
          { label: "XOrientation", type: "float", value: 0 },
          { label: "YOrientation", type: "float", value: 0 },
          { label: "ZOrientation", type: "float", value: 0 },
          expect.objectContaining({ label: "Geometry", type: "list", value: expect.arrayContaining([
            expect.objectContaining({ typeId: 3 }),
          ]) }),
        ]),
      })],
    });
  });

  it("publishes a retained Trigger polygon CAS mutation with verified receipt and exact GIC", async () => {
    const harness = await createHarness({ triggerPolygonMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-trigger-polygon-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        totalPolygonUpdated: 1,
        polygonUpdatedCounts: expect.objectContaining({ trigger: 1, encounter: 0 }),
      },
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(gic).toEqual(harness.baselineContents[`${AREA}.gic`]);
    const triggerList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "TriggerList",
    );
    const geometry = triggerList?.type === "list"
      ? triggerList.value[0]?.fields.find((field) => field.label === "Geometry")
      : undefined;
    expect(geometry).toEqual({
      label: "Geometry",
      type: "list",
      value: [
        geometryPoint(-1, -5, 0.25),
        geometryPoint(5, -5, 0.25),
        geometryPoint(5, 1, 0.25),
        geometryPoint(0, 0, 3.5),
      ],
    });
  });

  it("atomically publishes exact retained Trigger Tag, LocalizedName, and paired-GIC Comment while preserving IFO bytes", async () => {
    const harness = await createHarness({ triggerTagMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-trigger-tag-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    const triggerList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "TriggerList",
    );
    const tag = triggerList?.type === "list"
      ? triggerList.value[0]?.fields.find((field) => field.label === "Tag")
      : undefined;
    const localizedName = triggerList?.type === "list"
      ? triggerList.value[0]?.fields.find((field) => field.label === "LocalizedName")
      : undefined;
    const gicTriggerList = parseRawGffDocument(gic)!.fields.find(
      (field) => field.label === "TriggerList",
    );
    const editorComment = gicTriggerList?.type === "list"
      ? gicTriggerList.value[0]?.fields.find((field) => field.label === "Comment")
      : undefined;

    expect(tag).toEqual({
      label: "Tag",
      type: "cexostring",
      value: "  AREA_EXIT  ",
    });
    expect(localizedName).toEqual({
      label: "LocalizedName",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Inner Gate Trigger" }],
      },
    });
    expect(editorComment).toEqual({
      label: "Comment",
      type: "cexostring",
      value: "  West gate\r\ne\u0301  ",
    });
    expect(gic).not.toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ trigger: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes an exact retained Waypoint Tag while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ waypointTagMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-waypoint-tag-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const waypointList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "WaypointList",
    );
    const tag = waypointList?.type === "list"
      ? waypointList.value[0]?.fields.find((field) => field.label === "Tag")
      : undefined;

    expect(tag).toEqual({
      label: "Tag",
      type: "cexostring",
      value: "  PATROL_POINT_01  ",
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ waypoint: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes one exact retained Waypoint TemplateResRef with expected ARE publication and byte-identical GIC/IFO", async () => {
    const harness = await createHarness({ waypointTemplateResRefMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-waypoint-template-resref-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const waypointList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "WaypointList",
    );
    const templateResRef = waypointList?.type === "list"
      ? waypointList.value[0]?.fields.find((field) => field.label === "TemplateResRef")
      : undefined;

    expect(templateResRef).toEqual({
      label: "TemplateResRef",
      type: "resref",
      value: "wp_patrol_alt",
    });
    expect(await read(`${AREA}.are`)).toEqual(harness.candidate.resources[0].bytes);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ waypoint: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes exact Waypoint LocalizedName while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ waypointLocalizedNameMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-waypoint-localized-name-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const waypointList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "WaypointList",
    );
    const localizedName = waypointList?.type === "list"
      ? waypointList.value[0]?.fields.find((field) => field.label === "LocalizedName")
      : undefined;

    expect(localizedName).toEqual({
      label: "LocalizedName",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: " North Patrol Point " }],
      },
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ waypoint: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes exact Waypoint Description while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ waypointDescriptionMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-waypoint-description-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const waypointList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "WaypointList",
    );
    const description = waypointList?.type === "list"
      ? waypointList.value[0]?.fields.find((field) => field.label === "Description")
      : undefined;

    expect(description).toEqual({
      label: "Description",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Northern patrol route" }],
      },
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ waypoint: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes the exact Waypoint MapNote vector while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ waypointMapNoteMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-waypoint-map-note-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const waypointList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "WaypointList",
    );

    expect(waypointList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({ fields: expect.arrayContaining([
        { label: "HasMapNote", type: "byte", value: 1 },
        {
          label: "MapNote",
          type: "cexolocstring",
          value: {
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, text: " Northern gate " }],
          },
        },
        { label: "MapNoteEnabled", type: "byte", value: 0 },
      ]) })],
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ waypoint: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes one catalog-bound Waypoint Appearance Byte while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ waypointAppearanceMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-waypoint-appearance-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const waypointList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "WaypointList",
    );

    expect(waypointList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({ fields: expect.arrayContaining([
        { label: "Appearance", type: "byte", value: 4 },
      ]) })],
    });
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read(`${AREA}.are`)).not.toEqual(harness.baselineContents[`${AREA}.are`]);
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ waypoint: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes an exact ordered Waypoint VarTable while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ waypointVariableTableMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-waypoint-variable-table-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const waypointList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "WaypointList",
    );

    expect(waypointList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({ fields: expect.arrayContaining([{
        label: "VarTable",
        type: "list",
        value: [
          { typeId: 0, fields: [
            { label: "Name", type: "cexostring", value: "counter" },
            { label: "Type", type: "dword", value: 1 },
            { label: "Value", type: "int", value: 2 },
          ] },
          { typeId: 0, fields: [
            { label: "Name", type: "cexostring", value: "scale" },
            { label: "Type", type: "dword", value: 2 },
            { label: "Value", type: "float", value: Math.fround(1.5) },
          ] },
          { typeId: 0, fields: [
            { label: "Name", type: "cexostring", value: "label" },
            { label: "Type", type: "dword", value: 3 },
            { label: "Value", type: "cexostring", value: " north " },
          ] },
        ],
      }]) })],
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ waypoint: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes one paired-GIC Waypoint Comment while preserving GIT and IFO", async () => {
    const harness = await createHarness({ waypointEditorCommentMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-waypoint-comment-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find(
        (entry) => entry.logicalKey === logicalKey,
      )!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const gic = await read(`${AREA}.gic`);
    const waypointList = parseRawGffDocument(gic)!.fields.find(
      (field) => field.label === "WaypointList",
    );

    expect(waypointList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({ fields: expect.arrayContaining([
        { label: "Comment", type: "cexostring", value: "  updated waypoint note  " },
      ]) })],
    });
    expect(await read(`${AREA}.git`)).toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ waypoint: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes an exact retained Encounter Tag while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ encounterTagMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-encounter-tag-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const encounterList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Encounter List",
    );
    const tag = encounterList?.type === "list"
      ? encounterList.value[0]?.fields.find((field) => field.label === "Tag")
      : undefined;

    expect(tag).toEqual({
      label: "Tag",
      type: "cexostring",
      value: "  GNOLL_AMBUSH  ",
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes a structural Encounter CreatureList while preserving GIC and IFO", async () => {
    const harness = await createHarness({ encounterCreatureListMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-encounter-creature-list-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const encounterList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Encounter List",
    );
    const creatureList = encounterList?.type === "list"
      ? encounterList.value[0]?.fields.find((field) => field.label === "CreatureList")
      : undefined;

    expect(creatureList).toEqual({
      label: "CreatureList",
      type: "list",
      value: [
        { typeId: 0, fields: [
          { label: "Appearance", type: "int", value: 389 },
          { label: "CR", type: "float", value: 3 },
          { label: "ResRef", type: "resref", value: "nw_gnoll002" },
          { label: "SingleSpawn", type: "byte", value: 0 },
        ] },
        { typeId: 0, fields: [
          { label: "Appearance", type: "int", value: 225 },
          { label: "CR", type: "float", value: 2.5 },
          { label: "ResRef", type: "resref", value: "nw_wolf001" },
          { label: "SingleSpawn", type: "byte", value: 1 },
        ] },
      ],
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes an exact structural Encounter SpawnPointList while preserving GIC and IFO", async () => {
    const harness = await createHarness({ encounterSpawnPointListMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-encounter-spawn-point-list-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const encounterList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Encounter List",
    );
    const spawnPointList = encounterList?.type === "list"
      ? encounterList.value[0]?.fields.find(
          (field) => field.label === "SpawnPointList",
        )
      : undefined;

    expect(spawnPointList).toEqual({
      label: "SpawnPointList",
      type: "list",
      value: [
        { typeId: 2, fields: [
          { label: "X", type: "float", value: 22.5 },
          { label: "Y", type: "float", value: 45.25 },
          { label: "Z", type: "float", value: 0 },
          { label: "Orientation", type: "float", value: 1.5 },
        ] },
        { typeId: 2, fields: [
          { label: "X", type: "float", value: -3.75 },
          { label: "Y", type: "float", value: 9.5 },
          { label: "Z", type: "float", value: 0.125 },
          { label: "Orientation", type: "float", value: -2.25 },
        ] },
      ],
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes exact retained Encounter Active BYTE while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ encounterActiveMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-encounter-active-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const encounterList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Encounter List",
    );
    const active = encounterList?.type === "list"
      ? encounterList.value[0]?.fields.find((field) => field.label === "Active")
      : undefined;

    expect(active).toEqual({ label: "Active", type: "byte", value: 0 });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes exact retained Encounter PlayerOnly BYTE while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ encounterPlayerOnlyMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-encounter-player-only-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const encounterList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Encounter List",
    );
    const playerOnly = encounterList?.type === "list"
      ? encounterList.value[0]?.fields.find((field) => field.label === "PlayerOnly")
      : undefined;

    expect(playerOnly).toEqual({ label: "PlayerOnly", type: "byte", value: 0 });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes exact retained Encounter Reset BYTE while preserving GIC and IFO bytes", async () => {
    const harness = await createHarness({ encounterResetMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-encounter-reset-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const encounterList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Encounter List",
    );
    const fields = encounterList?.type === "list"
      ? encounterList.value[0]?.fields
      : undefined;

    expect(fields?.find((field) => field.label === "Reset"))
      .toEqual({ label: "Reset", type: "byte", value: 1 });
    expect(fields?.find((field) => field.label === "ResetTime"))
      .toEqual({ label: "ResetTime", type: "int", value: 60 });
    expect(fields?.find((field) => field.label === "Respawns"))
      .toEqual({ label: "Respawns", type: "int", value: 0 });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes exact retained Encounter ResetTime INT while preserving Reset, Respawns, GIC and IFO", async () => {
    const harness = await createHarness({ encounterResetTimeMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-encounter-reset-time-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const encounterList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Encounter List",
    );
    const fields = encounterList?.type === "list"
      ? encounterList.value[0]?.fields
      : undefined;

    expect(fields?.find((field) => field.label === "ResetTime"))
      .toEqual({ label: "ResetTime", type: "int", value: 90 });
    expect(fields?.find((field) => field.label === "Reset"))
      .toEqual({ label: "Reset", type: "byte", value: 0 });
    expect(fields?.find((field) => field.label === "Respawns"))
      .toEqual({ label: "Respawns", type: "int", value: 0 });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes exact retained Encounter SpawnOption INT while preserving Reset, ResetTime, Respawns, GIC and IFO", async () => {
    const harness = await createHarness({ encounterSpawnOptionMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-encounter-spawn-option-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const encounterList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Encounter List",
    );
    const fields = encounterList?.type === "list"
      ? encounterList.value[0]?.fields
      : undefined;

    expect(fields?.find((field) => field.label === "SpawnOption"))
      .toEqual({ label: "SpawnOption", type: "int", value: 0 });
    expect(fields?.find((field) => field.label === "Reset"))
      .toEqual({ label: "Reset", type: "byte", value: 0 });
    expect(fields?.find((field) => field.label === "ResetTime"))
      .toEqual({ label: "ResetTime", type: "int", value: 60 });
    expect(fields?.find((field) => field.label === "Respawns"))
      .toEqual({ label: "Respawns", type: "int", value: 0 });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes exact retained Encounter Respawns Infinite sentinel while preserving Reset, ResetTime, SpawnOption, GIC and IFO", async () => {
    const harness = await createHarness({ encounterRespawnsMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-encounter-respawns-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const encounterList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Encounter List",
    );
    const fields = encounterList?.type === "list"
      ? encounterList.value[0]?.fields
      : undefined;

    expect(fields?.find((field) => field.label === "Respawns"))
      .toEqual({ label: "Respawns", type: "int", value: -1 });
    expect(fields?.find((field) => field.label === "SpawnOption"))
      .toEqual({ label: "SpawnOption", type: "int", value: 1 });
    expect(fields?.find((field) => field.label === "Reset"))
      .toEqual({ label: "Reset", type: "byte", value: 0 });
    expect(fields?.find((field) => field.label === "ResetTime"))
      .toEqual({ label: "ResetTime", type: "int", value: 60 });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes exact retained Encounter creature-count pair while preserving Respawns, GIC and IFO", async () => {
    const harness = await createHarness({ encounterCreatureCountsMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-encounter-creature-counts-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const encounterList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Encounter List",
    );
    const fields = encounterList?.type === "list"
      ? encounterList.value[0]?.fields
      : undefined;

    expect(fields?.find((field) => field.label === "MaxCreatures"))
      .toEqual({ label: "MaxCreatures", type: "int", value: 3 });
    expect(fields?.find((field) => field.label === "RecCreatures"))
      .toEqual({ label: "RecCreatures", type: "int", value: 3 });
    expect(fields?.find((field) => field.label === "Respawns"))
      .toEqual({ label: "Respawns", type: "int", value: 0 });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes exact retained Encounter Faction DWord while preserving GIC and IFO", async () => {
    const harness = await createHarness({ encounterFactionMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-encounter-faction-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find(
        (entry) => entry.logicalKey === logicalKey,
      )!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const encounterList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Encounter List",
    );
    const fields = encounterList?.type === "list"
      ? encounterList.value[0]?.fields
      : undefined;

    expect(fields?.find((field) => field.label === "Faction"))
      .toEqual({ label: "Faction", type: "dword", value: 4 });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes retained Encounter Difficulty and inline LocalizedName CAS while preserving GIC and IFO", async () => {
    const harness = await createHarness({ encounterDifficultyMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-encounter-difficulty-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find(
        (entry) => entry.logicalKey === logicalKey,
      )!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const encounterList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Encounter List",
    );
    const fields = encounterList?.type === "list"
      ? encounterList.value[0]?.fields
      : undefined;

    expect(fields?.find((field) => field.label === "Difficulty"))
      .toEqual({ label: "Difficulty", type: "int", value: 3 });
    expect(fields?.find((field) => field.label === "DifficultyIndex"))
      .toEqual({ label: "DifficultyIndex", type: "int", value: 4 });
    expect(fields?.find((field) => field.label === "LocalizedName")).toEqual({
      label: "LocalizedName",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Night Ambush" }],
      },
    });
    expect(await read(`${AREA}.gic`)).toEqual(harness.baselineContents[`${AREA}.gic`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("atomically publishes one paired-GIC Encounter Comment while preserving GIT and IFO", async () => {
    const harness = await createHarness({ encounterEditorCommentMutation: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-encounter-comment-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find(
        (entry) => entry.logicalKey === logicalKey,
      )!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const gic = await read(`${AREA}.gic`);
    const encounterList = parseRawGffDocument(gic)!.fields.find(
      (field) => field.label === "Encounter List",
    );

    expect(encounterList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({ fields: expect.arrayContaining([
        { label: "Comment", type: "cexostring", value: "  updated encounter note  " },
      ]) })],
    });
    expect(await read(`${AREA}.git`)).toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(await read("module.ifo")).toEqual(harness.baselineContents["module.ifo"]);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      objectMutation: {
        propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
        totalPropertyUpdated: 1,
      },
    });
  });

  it("publishes an encounter origin transform while retaining geometry, empty spawn points, and exact GIC", async () => {
    const harness = await createHarness({ encounterTransform: true });

    const result = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-encounter-transform-integration-1",
      ifMatchHeader: `"${harness.baselineRevision}"`,
      command: harness.command,
      commandHash: harness.commandHash,
    });

    expect(result.receipt.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 1,
      transformedCounts: expect.objectContaining({ encounter: 1, trigger: 0 }),
    });
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      return (await harness.repository.readContent(descriptor.contentKey))!.bytes;
    };
    const git = await read(`${AREA}.git`);
    const gic = await read(`${AREA}.gic`);
    expect(git).not.toEqual(harness.baselineContents[`${AREA}.git`]);
    expect(gic).toEqual(harness.baselineContents[`${AREA}.gic`]);
    const encounterList = parseRawGffDocument(git)!.fields.find(
      (field) => field.label === "Encounter List",
    );
    expect(encounterList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "XPosition", type: "float", value: 42.5 },
          { label: "YPosition", type: "float", value: 57.5 },
          { label: "ZPosition", type: "float", value: 5 },
          expect.objectContaining({
            label: "Geometry",
            type: "list",
            value: expect.arrayContaining([expect.objectContaining({ typeId: 1 })]),
          }),
          { label: "SpawnPointList", type: "list", value: [] },
        ]),
      })],
    });
  });
});

async function createHarness(options: Readonly<{
  areaComments?: boolean;
  visualEnvironment?: boolean;
  visualEnvironmentScalarControls?: boolean;
  audioEnvironment?: boolean;
  moduleStartLocation?: boolean;
  objectDeletion?: boolean;
  creatureTagMutation?: boolean;
  creatureConversationMutation?: boolean;
  creatureInterruptableMutation?: boolean;
  creatureAdvancedFlagsMutation?: boolean;
  creatureDeathRemainsMutation?: boolean;
  creatureAppearanceMutation?: boolean;
  creatureGenderMutation?: boolean;
  creaturePortraitMutation?: boolean;
  creatureChallengeRatingMutation?: boolean;
  creatureAbilityScoresMutation?: boolean;
  creatureHitPointsMutation?: boolean;
  creatureNaturalArmorClassMutation?: boolean;
  creatureSavingThrowBonusesMutation?: boolean;
  creatureAlignmentMutation?: boolean;
  creatureFactionMutation?: boolean;
  creatureTemplateResRefMutation?: boolean;
  creatureSpecialIdentityStringsMutation?: boolean;
  creatureScriptResRefsMutation?: boolean;
  creatureLocalizedStringMutation?: boolean;
  creatureEditorCommentMutation?: boolean;
  placeableFactionMutation?: boolean;
  placeablePortraitMutation?: boolean;
  placeableTemplateResRefMutation?: boolean;
  placeableBodyBagMutation?: boolean;
  placeableTrapTypeMutation?: boolean;
  placeableAnimationStateMutation?: boolean;
  placeableConversationInterruptableMutation?: boolean;
  placeableStaticUseableMutation?: boolean;
  placeablePlotHasInventoryMutation?: boolean;
  placeableDurabilitySaveBytesMutation?: boolean;
  placeableHitPointsMutation?: boolean;
  placeableEditorCommentMutation?: boolean;
  storeEditorCommentMutation?: boolean;
  encounterTransform?: boolean;
  objectTransform?: boolean;
  itemTransform?: boolean;
  placeableTransform?: boolean;
  soundTransform?: boolean;
  storeTransform?: boolean;
  triggerTransform?: boolean;
  triggerPolygonMutation?: boolean;
  triggerTagMutation?: boolean;
  waypointTagMutation?: boolean;
  waypointTemplateResRefMutation?: boolean;
  waypointLocalizedNameMutation?: boolean;
  waypointDescriptionMutation?: boolean;
  waypointMapNoteMutation?: boolean;
  waypointAppearanceMutation?: boolean;
  waypointVariableTableMutation?: boolean;
  waypointEditorCommentMutation?: boolean;
  encounterTagMutation?: boolean;
  encounterActiveMutation?: boolean;
  encounterPlayerOnlyMutation?: boolean;
  encounterResetMutation?: boolean;
  encounterResetTimeMutation?: boolean;
  encounterSpawnOptionMutation?: boolean;
  encounterRespawnsMutation?: boolean;
  encounterCreatureCountsMutation?: boolean;
  encounterFactionMutation?: boolean;
  encounterDifficultyMutation?: boolean;
  encounterEditorCommentMutation?: boolean;
  encounterCreatureListMutation?: boolean;
  encounterSpawnPointListMutation?: boolean;
  waypointTransform?: boolean;
  waypointAddition?: boolean;
  dynamicWaypointAddition?: boolean;
  soundAddition?: boolean;
  placeableAddition?: boolean;
  dynamicPlaceableAddition?: boolean;
  itemAddition?: boolean;
  creatureAddition?: boolean;
  storeAddition?: boolean;
  dynamicStoreAddition?: boolean;
  triggerAddition?: boolean;
  encounterAddition?: boolean;
  dynamicEncounterAddition?: boolean;
  doorAddition?: boolean;
  doorTransitionMutation?: boolean;
  multiEntryAreaName?: boolean;
  removeAlternateAreaName?: boolean;
}> = {}) {
  const locks = new MemoryAreaCreateControlStore({
    nextLeaseId: (() => {
      let id = 0;
      return () => `lease-${++id}`;
    })(),
  });
  const control = new MemoryAreaLifecycleMutationControlStore(locks);
  const repository = new MemoryAtomicModuleSnapshotRepository(locks);
  const pair = objectPair({
    includeCreatureConversation: options.creatureConversationMutation,
    includeCreatureInterruptable: options.creatureInterruptableMutation,
    includeCreatureAdvancedFlags: options.creatureAdvancedFlagsMutation,
    includeCreatureDeathRemains: options.creatureDeathRemainsMutation,
    includeCreatureAppearance: options.creatureAppearanceMutation,
    includeCreatureGender: options.creatureGenderMutation,
    includeCreaturePortrait: options.creaturePortraitMutation,
    includeCreatureChallengeRating: options.creatureChallengeRatingMutation,
    includeCreatureAbilityScores: options.creatureAbilityScoresMutation,
    includeCreatureHitPoints: options.creatureHitPointsMutation,
    includeCreatureNaturalArmorClass: options.creatureNaturalArmorClassMutation,
    includeCreatureSavingThrowBonuses: options.creatureSavingThrowBonusesMutation,
    includeCreatureAlignment: options.creatureAlignmentMutation,
    includeCreatureFaction: options.creatureFactionMutation,
    includeCreatureTemplateResRef: options.creatureTemplateResRefMutation,
    includeCreatureSpecialIdentityStrings: options.creatureSpecialIdentityStringsMutation,
    includeCreatureScriptResRefs: options.creatureScriptResRefsMutation,
    includeEncounter: options.encounterTransform
      || options.encounterTagMutation
      || options.encounterActiveMutation
      || options.encounterPlayerOnlyMutation
      || options.encounterResetMutation
      || options.encounterResetTimeMutation
      || options.encounterSpawnOptionMutation
      || options.encounterRespawnsMutation
      || options.encounterCreatureCountsMutation
      || options.encounterFactionMutation
      || options.encounterDifficultyMutation
      || options.encounterEditorCommentMutation
      || options.encounterCreatureListMutation
      || options.encounterSpawnPointListMutation,
    includePlaceable: options.placeableTransform
      || options.placeableFactionMutation
      || options.placeablePortraitMutation
      || options.placeableTemplateResRefMutation
      || options.placeableBodyBagMutation
      || options.placeableTrapTypeMutation
      || options.placeableAnimationStateMutation
      || options.placeableConversationInterruptableMutation
      || options.placeableStaticUseableMutation
      || options.placeablePlotHasInventoryMutation
      || options.placeableDurabilitySaveBytesMutation
      || options.placeableHitPointsMutation
      || options.placeableEditorCommentMutation,
    includePlaceableBodyBag: options.placeableBodyBagMutation,
    includePlaceableFaction: options.placeableFactionMutation,
    includePlaceablePortrait: options.placeablePortraitMutation,
    includePlaceableTemplateResRef: options.placeableTemplateResRefMutation,
    includePlaceableTrapType: options.placeableTrapTypeMutation,
    includePlaceableAnimationState: options.placeableAnimationStateMutation,
    includePlaceableConversationInterruptable: options.placeableConversationInterruptableMutation,
    includePlaceableStaticUseable: options.placeableStaticUseableMutation,
    includePlaceablePlotHasInventory: options.placeablePlotHasInventoryMutation,
    includePlaceableDurabilitySaveBytes: options.placeableDurabilitySaveBytesMutation,
    includePlaceableHitPoints: options.placeableHitPointsMutation,
    includeSound: options.soundTransform,
    includeStore: options.storeTransform || options.storeEditorCommentMutation,
    includeTrigger: options.triggerTransform || options.triggerPolygonMutation || options.triggerTagMutation,
    includeWaypoint: options.waypointTransform || options.waypointTagMutation
      || options.waypointTemplateResRefMutation
      || options.waypointLocalizedNameMutation || options.waypointDescriptionMutation
      || options.waypointMapNoteMutation || options.waypointAppearanceMutation
      || options.waypointVariableTableMutation
      || options.waypointEditorCommentMutation,
    includeWaypointTemplateResRef: options.waypointTemplateResRefMutation,
    includeDoor: options.doorTransitionMutation,
  });
  const baselineAreaNameEntries = options.multiEntryAreaName
    ? [
        { languageId: 2, text: "Krypta" },
        { languageId: 0, text: "Crypt" },
        { languageId: 4, text: "Crypte" },
      ]
    : undefined;
  const candidateAreaNameEntries = options.multiEntryAreaName
    ? options.removeAlternateAreaName
      ? [{ languageId: 0, text: "Crypt Updated" }]
      : [
          { languageId: 2, text: "Stara krypta" },
          { languageId: 0, text: "Crypt Updated" },
          { languageId: 4, text: "Crypte ancienne" },
        ]
    : undefined;
  const factionCatalogBytes = moduleFactionCatalogBytes();
  const baselineContents = {
    [`${AREA}.are`]: areaBytes(
      1,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      baselineAreaNameEntries,
    ),
    [`${AREA}.git`]: pair.git,
    [`${AREA}.gic`]: pair.gic,
    "module.ifo": moduleIfo(),
    ...(options.placeableFactionMutation || options.creatureFactionMutation
      ? { "repute.fac": factionCatalogBytes }
      : {}),
  } as const;
  const manifest = createModuleSnapshotManifest({
    moduleId: MODULE_ID,
    parentRevision: null,
    objects: Object.entries(baselineContents).map(([logicalKey, bytes]) => ({
      logicalKey,
      resourceType: resourceType(logicalKey),
      size: bytes.length,
      sha256: sha(bytes),
    })),
  });
  await repository.bootstrap(manifest, baselineContents, "2026-08-12T12:00:00.000Z");
  const candidateAre = areaBytes(
    2,
    options.areaComments ? " updated area note " : " original area note ",
    options.areaComments ? "new_enter" : "old_enter",
    options.areaComments ? "Crypt Updated" : "Crypt",
    options.areaComments ? "CRYPT_UPDATED" : AREA,
    options.areaComments ? 3 : 4,
    options.areaComments ? 3 : 0,
    options.areaComments ? 1 : 0,
    options.areaComments ? 9 : -8,
    options.areaComments ? -12 : 11,
    options.areaComments ? 0xffff : 0,
    candidateAreaNameEntries,
    options.visualEnvironment
      ? integrationVisualEnvironmentTarget()
      : integrationVisualEnvironmentSource(),
    options.visualEnvironmentScalarControls
      ? { fogClipDistance: 120, windPower: 2 }
      : { fogClipDistance: 45, windPower: 0 },
  );
  const pairMutation = options.objectDeletion || options.creatureTagMutation || options.creatureConversationMutation || options.creatureInterruptableMutation || options.creatureAdvancedFlagsMutation || options.creatureDeathRemainsMutation || options.creatureAppearanceMutation || options.creatureGenderMutation || options.creaturePortraitMutation || options.creatureChallengeRatingMutation || options.creatureAbilityScoresMutation || options.creatureHitPointsMutation || options.creatureNaturalArmorClassMutation || options.creatureSavingThrowBonusesMutation || options.creatureAlignmentMutation || options.creatureFactionMutation || options.creatureTemplateResRefMutation || options.creatureSpecialIdentityStringsMutation || options.creatureScriptResRefsMutation || options.creatureLocalizedStringMutation || options.creatureEditorCommentMutation || options.placeableFactionMutation || options.placeablePortraitMutation || options.placeableTemplateResRefMutation || options.placeableBodyBagMutation || options.placeableTrapTypeMutation || options.placeableAnimationStateMutation || options.placeableConversationInterruptableMutation || options.placeableStaticUseableMutation || options.placeablePlotHasInventoryMutation || options.placeableDurabilitySaveBytesMutation || options.placeableHitPointsMutation || options.placeableEditorCommentMutation || options.storeEditorCommentMutation || options.doorTransitionMutation || options.encounterTransform || options.encounterTagMutation || options.encounterActiveMutation || options.encounterPlayerOnlyMutation || options.encounterResetMutation || options.encounterResetTimeMutation || options.encounterSpawnOptionMutation || options.encounterRespawnsMutation || options.encounterCreatureCountsMutation || options.encounterFactionMutation || options.encounterDifficultyMutation || options.encounterEditorCommentMutation || options.encounterCreatureListMutation || options.encounterSpawnPointListMutation || options.waypointTagMutation || options.waypointTemplateResRefMutation || options.waypointLocalizedNameMutation || options.waypointDescriptionMutation || options.waypointMapNoteMutation || options.waypointAppearanceMutation || options.waypointVariableTableMutation || options.waypointEditorCommentMutation || options.objectTransform || options.itemTransform ||
    options.placeableTransform || options.soundTransform || options.storeTransform || options.triggerTransform || options.triggerPolygonMutation || options.triggerTagMutation || options.waypointTransform || options.waypointAddition || options.dynamicWaypointAddition || options.soundAddition || options.placeableAddition || options.dynamicPlaceableAddition || options.itemAddition || options.creatureAddition || options.doorAddition || options.storeAddition || options.dynamicStoreAddition || options.triggerAddition || options.encounterAddition || options.dynamicEncounterAddition
    ? mutateExistingAreaObjectsInGitGic({
        sourceGit: baselineContents[`${AREA}.git`],
        sourceGic: baselineContents[`${AREA}.gic`],
        deletions: options.objectDeletion ? [{ kind: "item", sourceIndex: 0 }] : [],
        propertyMutations: options.creatureTagMutation
          ? [{
              kind: "creature",
              sourceIndex: 0,
              tag: {
                expectedValue: "Creature List",
                value: "  renamed creature  ",
              },
            }]
          : options.creatureConversationMutation
            ? [{
                kind: "creature",
                sourceIndex: 0,
                conversation: {
                  expectedResRef: "Guard_Dialog",
                  resRef: "guard_dialog",
                },
              }]
          : options.creatureInterruptableMutation
            ? [{
                kind: "creature",
                sourceIndex: 0,
                interruptable: { expectedValue: 1, value: 0 },
              }]
            : options.creatureAdvancedFlagsMutation
              ? [{
                  kind: "creature",
                  sourceIndex: 0,
                  advancedFlags: {
                    disarmable: { expectedValue: 1, value: 0 },
                    plot: { expectedValue: 0, value: 1 },
                    immortal: { expectedValue: 0, value: 1 },
                    lootable: { expectedValue: 1, value: 0 },
                    noPermanentDeath: { expectedValue: 0, value: 1 },
                  },
                }]
            : options.creatureDeathRemainsMutation
              ? [{
                  kind: "creature",
                  sourceIndex: 0,
                  advancedFlags: {
                    lootable: { expectedValue: 0, value: 1 },
                  },
                  bodyBag: {
                    expectedValue: 0,
                    value: 3,
                    tableSha256: "e".repeat(64),
                    tableRowCount: 7,
                  },
                  decayTime: {
                    expectedMilliseconds: 5_000,
                    valueMilliseconds: 12_000,
                  },
                }]
            : options.creatureAppearanceMutation
              ? [{
                  kind: "creature",
                  sourceIndex: 0,
                  appearance: {
                    expectedValue: 249,
                    value: 52,
                    tableSha256: "a".repeat(64),
                    rowCount: 1_000,
                  },
                }]
            : options.creatureGenderMutation
              ? [{
                  kind: "creature",
                  sourceIndex: 0,
                  gender: {
                    expectedValue: 4,
                    value: 0,
                    tableSha256: "c".repeat(64),
                    rowCount: 5,
                  },
                }]
            : options.creaturePortraitMutation
              ? [{
                  kind: "creature",
                  sourceIndex: 0,
                  portrait: {
                    expectedValue: 10,
                    value: 11,
                    tableSha256: "f".repeat(64),
                    rowCount: 16_001,
                    genderExpectedValue: 0,
                    raceExpectedValue: 4,
                  },
                }]
            : options.creatureChallengeRatingMutation
              ? [{
                  kind: "creature",
                  sourceIndex: 0,
                  challengeRating: {
                    expectedValue: 11.5,
                    value: 0.1,
                  },
                }]
            : options.creatureAbilityScoresMutation
              ? [{
                  kind: "creature",
                  sourceIndex: 0,
                  abilityScores: {
                    strength: { expectedValue: 15, value: 17 },
                    charisma: { expectedValue: 8, value: 10 },
                  },
                }]
            : options.creatureHitPointsMutation
              ? [{
                  kind: "creature",
                  sourceIndex: 0,
                  hitPoints: {
                    expectedHitPoints: 20,
                    expectedCurrentHitPoints: 77,
                    expectedMaxHitPoints: 88,
                    hitPoints: 25,
                    currentHitPoints: 20,
                    maxHitPoints: 35,
                    expectedConstitution: 14,
                    constitution: 14,
                    race: 1,
                    classLevels: [3, 2],
                    featRow40Present: false,
                    racialConstitutionAdjust: 0,
                    racialTypesSha256: "a".repeat(64),
                    racialTypesRowCount: 3,
                  },
                }]
            : options.creatureNaturalArmorClassMutation
              ? [{
                  kind: "creature",
                  sourceIndex: 0,
                  naturalArmorClass: { expectedValue: 0, value: 2 },
                }]
            : options.creatureSavingThrowBonusesMutation
              ? [{
                  kind: "creature",
                  sourceIndex: 0,
                  savingThrowBonuses: {
                    reflex: { expectedValue: 1, value: 4 },
                    fortitude: { expectedValue: 3, value: 5 },
                  },
                }]
            : options.creatureAlignmentMutation
              ? [{
                  kind: "creature",
                  sourceIndex: 0,
                  alignment: {
                    expectedGoodEvil: 50,
                    expectedLawfulChaotic: 50,
                    goodEvil: 100,
                    lawfulChaotic: 100,
                  },
                }]
            : options.creatureFactionMutation
              ? [{
                  kind: "creature",
                  sourceIndex: 0,
                  faction: {
                    expectedValue: 1,
                    value: 2,
                    catalogSha256: sha(factionCatalogBytes),
                    catalogFactionCount: 3,
                  },
                }]
          : options.creatureTemplateResRefMutation
            ? [{
                kind: "creature",
                sourceIndex: 0,
                templateResRef: {
                  expectedResRef: "nw_guard",
                  resRef: "nw_guard_alt",
                },
              }]
          : options.creatureSpecialIdentityStringsMutation
            ? [{
                kind: "creature",
                sourceIndex: 0,
                specialIdentityStrings: {
                  subrace: { expectedValue: "Moon Elf", value: "Sun Elf" },
                  deity: { expectedValue: "", value: "Mystra" },
                },
              }]
          : options.creatureScriptResRefsMutation
            ? [{
                kind: "creature",
                sourceIndex: 0,
                scripts: [
                  {
                    field: "ScriptHeartbeat",
                    expectedResRef: "NW_C2_DEFAULT1",
                    resRef: "main",
                  },
                  {
                    field: "ScriptSpawn",
                    expectedResRef: "nw_c2_default9",
                    resRef: "spawn_probe",
                  },
                ],
              }]
          : options.creatureLocalizedStringMutation
            ? [{
                kind: "creature",
                sourceIndex: 0,
                localizedStrings: [
                  { field: "FirstName", expectedValue: "Guard", value: "  Captain  " },
                  { field: "LastName", expectedValue: "", value: "Aribeth" },
                ],
              }]
          : options.creatureEditorCommentMutation
            ? [{
                kind: "creature",
                sourceIndex: 0,
                editorComment: {
                  expectedValue: "Creature List",
                  value: "  Guard route\r\ne\u0301  ",
                },
              }]
            : options.placeableFactionMutation
              ? [{
                  kind: "placeable",
                  sourceIndex: 0,
                  faction: {
                    expectedValue: 1,
                    value: 2,
                    catalogSha256: sha(factionCatalogBytes),
                    catalogFactionCount: 3,
                  },
                }]
              : options.placeablePortraitMutation
                ? [{
                    kind: "placeable",
                    sourceIndex: 0,
                    portrait: {
                      expectedValue: 462,
                      value: 15_157,
                      tableSha256: "a".repeat(64),
                      tableRowCount: 16_001,
                    },
                  }]
                : options.placeableTemplateResRefMutation
                  ? [{
                      kind: "placeable",
                      sourceIndex: 0,
                      templateResRef: {
                        expectedResRef: "plc_chest",
                        resRef: "plc_chest_alt",
                      },
                    }]
                  : options.placeableBodyBagMutation
                    ? [{
                        kind: "placeable",
                        sourceIndex: 0,
                        bodyBag: {
                          expectedValue: 0,
                          value: 1,
                          tableSha256: "d".repeat(64),
                          tableRowCount: 2,
                        },
                      }]
                    : options.placeableTrapTypeMutation
                      ? [{
                          kind: "placeable",
                          sourceIndex: 0,
                          trapType: {
                            expectedValue: 0,
                            value: 1,
                            tableSha256: "c".repeat(64),
                            tableRowCount: 2,
                          },
                        }]
                      : options.placeableAnimationStateMutation
                        ? [{
                            kind: "placeable",
                            sourceIndex: 0,
                            animationState: { expectedValue: 0, value: 2 },
                          }]
                        : options.placeableConversationInterruptableMutation
                          ? [{
                              kind: "placeable",
                              sourceIndex: 0,
                              conversation: { expectedResRef: "", resRef: "chest_dialog" },
                              interruptable: { expectedValue: 1, value: 0 },
                            }]
                          : options.placeableStaticUseableMutation
                            ? [{
                                kind: "placeable",
                                sourceIndex: 0,
                                expectedStatic: true,
                                static: false,
                                expectedUseable: false,
                                useable: true,
                              }]
                            : options.placeablePlotHasInventoryMutation
                              ? [{
                                  kind: "placeable",
                                  sourceIndex: 0,
                                  expectedPlot: false,
                                  plot: true,
                                  expectedHasInventory: false,
                                  hasInventory: true,
                                }]
                              : options.placeableDurabilitySaveBytesMutation
                                ? [{
                                    kind: "placeable",
                                    sourceIndex: 0,
                                    basicByteFields: [
                                      { field: "Hardness", expectedValue: 5, value: 8 },
                                      { field: "Fort", expectedValue: 16, value: 20 },
                                      { field: "Ref", expectedValue: 0, value: 12 },
                                      { field: "Will", expectedValue: 0, value: 10 },
                                    ],
                                  }]
                                : options.placeableHitPointsMutation
                                  ? [{
                                      kind: "placeable",
                                      sourceIndex: 0,
                                      hitPoints: {
                                        expectedHitPoints: 15,
                                        hitPoints: 30,
                                        expectedCurrentHitPoints: 45,
                                        currentHitPoints: 90,
                                      },
                                    }]
                                  : options.placeableEditorCommentMutation
                                    ? [{
                                        kind: "placeable",
                                        sourceIndex: 0,
                                        editorComment: {
                                          expectedValue: "Placeable List",
                                          value: "Water trough beside the west wall.",
                                        },
                                      }]
                                    : options.storeEditorCommentMutation
                                      ? [{
                                          kind: "store",
                                          sourceIndex: 0,
                                          editorComment: {
                                            expectedValue: "StoreList",
                                            value: "  Storekeeper route\r\ne\u0301  ",
                                          },
                                        }]
                                       : options.triggerTagMutation
                                         ? [{
                                             kind: "trigger",
                                            sourceIndex: 0,
                                             tag: {
                                               expectedValue: "TriggerList",
                                               value: "  AREA_EXIT  ",
                                             },
                                             localizedName: {
                                               expectedValue: "Gate Trigger",
                                               value: "Inner Gate Trigger",
                                             },
                                             editorComment: {
                                               expectedValue: "TriggerList",
                                               value: "  West gate\r\ne\u0301  ",
                                             },
                                             }]
                                         : options.waypointTagMutation
                                           ? [{
                                               kind: "waypoint",
                                               sourceIndex: 0,
                                               tag: {
                                                 expectedValue: "WaypointList",
                                                 value: "  PATROL_POINT_01  ",
                                                },
                                              }]
                                         : options.waypointTemplateResRefMutation
                                           ? [{
                                               kind: "waypoint",
                                               sourceIndex: 0,
                                               templateResRef: {
                                                 expectedResRef: "nw_waypoint001",
                                                 resRef: "wp_patrol_alt",
                                               },
                                             } as never]
                                         : options.waypointLocalizedNameMutation
                                           ? [{
                                               kind: "waypoint",
                                               sourceIndex: 0,
                                               localizedName: {
                                                 expectedValue: "Patrol Point",
                                                 value: " North Patrol Point ",
                                               },
                                             }]
                                         : options.waypointDescriptionMutation
                                           ? [{
                                               kind: "waypoint",
                                               sourceIndex: 0,
                                               description: {
                                                 expectedValue: "Patrol route",
                                                 value: "Northern patrol route",
                                               },
                                             } as never]
                                         : options.waypointMapNoteMutation
                                           ? [{
                                               kind: "waypoint",
                                               sourceIndex: 0,
                                               mapNote: {
                                                 expectedValue: {
                                                   hasMapNote: false,
                                                   mapNoteText: "Old marker",
                                                   mapNoteEnabled: true,
                                                 },
                                                 value: {
                                                   hasMapNote: true,
                                                   mapNoteText: " Northern gate ",
                                                   mapNoteEnabled: false,
                                                 },
                                               },
                                             } as never]
                                         : options.waypointAppearanceMutation
                                           ? [{
                                               kind: "waypoint",
                                               sourceIndex: 0,
                                               appearance: {
                                                 expectedValue: 1,
                                                 value: 4,
                                                 tableSha256: "a".repeat(64),
                                                 rowCount: 5,
                                               },
                                             } as never]
                                         : options.waypointVariableTableMutation
                                           ? [{
                                               kind: "waypoint",
                                               sourceIndex: 0,
                                               variables: {
                                                 expectedEntries: [],
                                                 entries: [
                                                   { name: "counter", type: "int", value: 2 },
                                                   { name: "scale", type: "float", value: Math.fround(1.5) },
                                                   { name: "label", type: "string", value: " north " },
                                                 ],
                                               },
                                             } as never]
                                         : options.waypointEditorCommentMutation
                                           ? [{
                                               kind: "waypoint",
                                               sourceIndex: 0,
                                               editorComment: {
                                                 expectedValue: "WaypointList",
                                                 value: "  updated waypoint note  ",
                                               },
                                             } as never]
                                         : options.encounterTagMutation
                                          ? [{
                                              kind: "encounter",
                                              sourceIndex: 0,
                                              tag: {
                                                expectedValue: "Encounter List",
                                                value: "  GNOLL_AMBUSH  ",
                                              },
                                            }]
                                          : options.encounterActiveMutation
                                            ? [{
                                                kind: "encounter",
                                                sourceIndex: 0,
                                                active: {
                                                  expectedValue: { activeByte: 1 },
                                                  value: { activeByte: 0 },
                                                },
                                              }]
                                            : options.encounterPlayerOnlyMutation
                                              ? [{
                                                  kind: "encounter",
                                                  sourceIndex: 0,
                                                  playerOnly: {
                                                    expectedValue: { playerOnlyByte: 1 },
                                                    value: { playerOnlyByte: 0 },
                                                  },
                                                }]
                                              : options.encounterResetMutation
                                                ? [{
                                                    kind: "encounter",
                                                    sourceIndex: 0,
                                                    reset: {
                                                      expectedValue: { resetByte: 0 },
                                                      value: { resetByte: 1 },
                                                    },
                                                  }]
                                                : options.encounterResetTimeMutation
                                                  ? [{
                                                      kind: "encounter",
                                                      sourceIndex: 0,
                                                      resetTime: {
                                                        expectedValue: { resetTime: 60 },
                                                        value: { resetTime: 90 },
                                                      },
                                                    }]
                                                  : options.encounterSpawnOptionMutation
                                                    ? [{
                                                        kind: "encounter",
                                                        sourceIndex: 0,
                                                        spawnOption: {
                                                          expectedValue: { spawnOption: 1 },
                                                          value: { spawnOption: 0 },
                                                        },
                                                      }]
                                                    : options.encounterRespawnsMutation
                                                      ? [{
                                                          kind: "encounter",
                                                          sourceIndex: 0,
                                                          respawns: {
                                                            expectedValue: { respawns: 0 },
                                                            value: { respawns: -1 },
                                                          },
                                                        }]
                                                      : options.encounterCreatureCountsMutation
                                                        ? [{
                                                            kind: "encounter",
                                                            sourceIndex: 0,
                                                            creatureCounts: {
                                                              expectedValue: { maxCreatures: 4, recCreatures: 2 },
                                                              value: { maxCreatures: 3, recCreatures: 3 },
                                                            },
                                                          }]
                                                        : options.encounterFactionMutation
                                                          ? [{
                                                              kind: "encounter",
                                                              sourceIndex: 0,
                                                              faction: {
                                                                expectedValue: 1,
                                                                value: 4,
                                                                catalogSha256: "f".repeat(64),
                                                                catalogFactionCount: 5,
                                                              },
                                                            }]
                                                          : options.encounterDifficultyMutation
                                                            ? [{
                                                                kind: "encounter",
                                                                sourceIndex: 0,
                                                              difficulty: {
                                                                  expectedValue: {
                                                                    difficulty: 1,
                                                                    difficultyIndex: 2,
                                                                  },
                                                                  value: {
                                                                    difficulty: 3,
                                                                    difficultyIndex: 4,
                                                                  },
                                                                  catalogSha256: "d".repeat(64),
                                                                catalogRowCount: 5,
                                                              },
                                                              localizedName: {
                                                                expectedValue: "Gnoll Ambush",
                                                                value: "Night Ambush",
                                                              },
                                                            }]
                                                            : options.encounterCreatureListMutation
                                                              ? [{
                                                                  kind: "encounter",
                                                                  sourceIndex: 0,
                                                                  creatureList: {
                                                                    expectedEntries: [
                                                                      {
                                                                        sourceIndex: 0,
                                                                        appearance: 388,
                                                                        challengeRating: 1,
                                                                        resRef: "nw_gnoll001",
                                                                        singleSpawnByte: 0,
                                                                      },
                                                                      {
                                                                        sourceIndex: 1,
                                                                        appearance: 389,
                                                                        challengeRating: 3,
                                                                        resRef: "nw_gnoll002",
                                                                        singleSpawnByte: 1,
                                                                      },
                                                                    ],
                                                                    entries: [
                                                                      {
                                                                        sourceIndex: 0,
                                                                        appearance: 389,
                                                                        challengeRating: 3,
                                                                        resRef: "nw_gnoll002",
                                                                        singleSpawnByte: 0,
                                                                      },
                                                                      {
                                                                        sourceIndex: 1,
                                                                        appearance: 225,
                                                                        challengeRating: 2.5,
                                                                        resRef: "nw_wolf001",
                                                                        singleSpawnByte: 1,
                                                                      },
                                                                    ],
                                                                  },
                                                                }]
                                                            : options.encounterSpawnPointListMutation
                                                              ? [{
                                                                  kind: "encounter",
                                                                  sourceIndex: 0,
                                                                  spawnPoints: {
                                                                    expectedEntries: [],
                                                                    entries: [
                                                                      {
                                                                        nativeX: 22.5,
                                                                        nativeY: 45.25,
                                                                        nativeZ: 0,
                                                                        orientation: 1.5,
                                                                      },
                                                                      {
                                                                        nativeX: -3.75,
                                                                        nativeY: 9.5,
                                                                        nativeZ: 0.125,
                                                                        orientation: -2.25,
                                                                      },
                                                                    ],
                                                                  },
                                                                }]
                                                            : options.encounterEditorCommentMutation
                                                              ? [{
                                                                  kind: "encounter",
                                                                  sourceIndex: 0,
                                                                  editorComment: {
                                                                    expectedValue: "Encounter List",
                                                                    value: "  updated encounter note  ",
                                                                  },
                                                                }]
                                            : [],
        transforms: options.encounterTransform
          ? [{
              kind: "encounter",
              sourceIndex: 0,
              x: 4.25,
              y: 5.75,
              z: 0.5,
            }]
          : options.objectTransform
          ? [{
              kind: "creature",
              sourceIndex: 0,
              x: 6.147,
              y: 2.718,
              z: 0.025,
              bearing: Math.PI * 1.5,
            }]
          : options.itemTransform
            ? [{
                kind: "item",
                sourceIndex: 0,
                x: 3.5,
                y: 4.25,
                z: 0.2,
                bearing: Math.PI / 3,
              }]
          : options.placeableTransform
            ? [{
                kind: "placeable",
                sourceIndex: 0,
                x: 4.5,
                y: 5.5,
                z: 0.25,
                bearing: Math.PI / 4,
              }]
            : options.soundTransform
              ? [{
                  kind: "sound",
                  sourceIndex: 0,
                  x: 2.75,
                  y: 3.25,
                  z: 0.5,
                }]
            : options.storeTransform
              ? [{
                  kind: "store",
                  sourceIndex: 0,
                  x: 4.75,
                  y: 5.25,
                  z: 0.1,
                  bearing: Math.PI / 3,
                }]
            : options.triggerTransform
              ? [{
                  kind: "trigger",
                  sourceIndex: 0,
                  x: 4.25,
                  y: 5.75,
                  z: 0.5,
                }]
            : options.waypointTransform
              ? [{
                  kind: "waypoint",
                  sourceIndex: 0,
                  x: 3.5,
                  y: 4.75,
                  z: 0.35,
                  bearing: Math.PI * 1.25,
                }]
            : [],
        doorTransitionMutations: options.doorTransitionMutation
          ? [{
              kind: "door",
              sourceIndex: 0,
              transition: {
                expectedValue: { linkedTo: "OLD_DEST", linkedToFlags: 1, loadScreenId: 0 },
                value: { linkedTo: "NEW_DEST", linkedToFlags: 2, loadScreenId: 7 },
              },
            }]
          : [],
        polygonMutations: options.triggerPolygonMutation
          ? [{
              kind: "trigger",
              sourceObjectId: "trigger:0:retained",
              sourceIndex: 0,
              expectedGeometry: integrationTriggerSourcePolygon(),
              geometry: integrationTriggerTargetPolygon(),
            }]
          : [],
        additions: options.creatureAddition
          ? [creatureAdditionFixture()]
          : options.doorAddition
            ? [doorAdditionFixture(0, 0)]
          : options.encounterAddition
            ? [encounterAdditionFixture()]
          : options.dynamicEncounterAddition
            ? [dynamicEncounterAdditionFixture()]
          : options.dynamicStoreAddition
            ? [dynamicStoreAdditionFixture()]
          : options.storeAddition
            ? [storeAdditionFixture()]
          : options.triggerAddition
            ? [triggerAdditionFixture()]
          : options.itemAddition
            ? [itemAdditionFixture()]
            : options.dynamicPlaceableAddition
              ? [dynamicPlaceableAdditionFixture()]
            : options.placeableAddition
            ? [placeableAdditionFixture()]
            : options.waypointAddition
            ? [waypointAdditionFixture()]
            : options.dynamicWaypointAddition
              ? [dynamicWaypointAdditionFixture()]
            : options.soundAddition
              ? [soundAdditionFixture()]
              : [],
      })
    : undefined;
  const objectCandidateGit = pairMutation?.gitBytes ?? baselineContents[`${AREA}.git`];
  const audioEnvironmentExpected = areaAudioEnvironment();
  const audioEnvironmentValue = Object.freeze({
    ...audioEnvironmentExpected,
    ambientSoundNightVolume: 77,
    musicDelayMilliseconds: -4000,
  });
  const candidateGit = options.audioEnvironment
    ? updateGitAreaAudioEnvironment(objectCandidateGit, {
        expectedValue: audioEnvironmentExpected,
        value: audioEnvironmentValue,
      }).bytes
    : objectCandidateGit;
  const candidateGic = pairMutation?.gicBytes ?? baselineContents[`${AREA}.gic`];
  const startLocationExpected = Object.freeze({
    areaResRef: AREA,
    x: Math.fround(1),
    y: Math.fround(2),
    z: Math.fround(3),
    directionX: Math.fround(0),
    directionY: Math.fround(1),
  });
  const startLocationValue = Object.freeze({
    areaResRef: "other02",
    x: Math.fround(12.5),
    y: Math.fround(-4.25),
    z: Math.fround(0.5),
    directionX: Math.fround(-1),
    directionY: Math.fround(0),
  });
  const candidateIfo = options.moduleStartLocation
    ? updateModuleIfoStartLocation(baselineContents["module.ifo"], {
        expectedValue: startLocationExpected,
        value: startLocationValue,
      }).bytes
    : baselineContents["module.ifo"];
  const candidate: AreaUpdateCompiledCandidate = Object.freeze({
    areaId: AREA,
    sourceAreaSha256: sha(baselineContents[`${AREA}.are`]),
    candidateAreaSha256: sha(candidateAre),
    setFingerprintSha256: "e".repeat(64),
    projectedDraft: Object.freeze({
      areaResRef: AREA,
      name: options.areaComments ? "Crypt Updated" : "Crypt",
      width: 2,
      height: 2,
      tilesetResRef: "tin01",
      tilesetFingerprint: "e".repeat(64),
      areaFingerprint: sha(baselineContents[`${AREA}.are`]),
      ...(options.areaComments
        ? {
            comments: Object.freeze({
              expectedValue: " original area note ",
              value: " updated area note ",
            }),
            eventScripts: Object.freeze({
              onEnter: Object.freeze({
                expectedResRef: "old_enter",
                resRef: "new_enter",
              }),
            }),
            basicIdentity: Object.freeze({
              name: Object.freeze({
                expectedValue: "Crypt",
                value: "Crypt Updated",
                expectedProfile: options.multiEntryAreaName
                  ? "multi_entry_inline_ascii" as const
                  : "simple_inline_ascii" as const,
                ...(options.multiEntryAreaName
                  ? {
                      expectedEntries: Object.freeze(
                        baselineAreaNameEntries!.map((entry) => Object.freeze({ ...entry })),
                      ),
                      valueEntries: Object.freeze(
                        candidateAreaNameEntries!.map((entry) => Object.freeze({ ...entry })),
                      ),
                    }
                  : {}),
              }),
              tag: Object.freeze({
                expectedValue: AREA,
                value: "CRYPT_UPDATED",
              }),
            }),
            advancedFlags: Object.freeze({
              terrainType: Object.freeze({
                expectedValue: Object.freeze({
                  interior: false,
                  natural: true,
                  subterranean: false,
                }),
                value: Object.freeze({
                  interior: true,
                  natural: false,
                  subterranean: true,
                }),
              }),
              playerVsPlayer: Object.freeze({ expectedValue: 0, value: 3 }),
              noRest: Object.freeze({ expectedValue: false, value: true }),
              listenCheckModifier: Object.freeze({ expectedValue: -8, value: 9 }),
              spotCheckModifier: Object.freeze({ expectedValue: 11, value: -12 }),
              loadingScreenId: Object.freeze({ expectedValue: 0, value: 0xffff }),
            }),
          }
        : {}),
      ...(options.moduleStartLocation
        ? {
            moduleStartLocation: Object.freeze({
              expectedValue: startLocationExpected,
              value: startLocationValue,
            }),
          }
        : {}),
      ...(options.visualEnvironment
        ? {
            visualEnvironment: Object.freeze({
              expectedValue: integrationVisualEnvironmentSource(),
              value: integrationVisualEnvironmentTarget(),
            }),
          }
        : {}),
      ...(options.visualEnvironmentScalarControls
        ? {
            visualEnvironmentScalarControls: Object.freeze({
              expectedValue: Object.freeze({ fogClipDistance: 45, windPower: 0 }),
              value: Object.freeze({ fogClipDistance: 120, windPower: 2 }),
            }),
          }
        : {}),
      ...(options.audioEnvironment
        ? {
            audioEnvironment: Object.freeze({
              expectedValue: audioEnvironmentExpected,
              value: audioEnvironmentValue,
              sourceGitSha256: sha(baselineContents[`${AREA}.git`]),
            }),
          }
        : {}),
      tiles: Object.freeze(Array.from({ length: 4 }, (_, index) => Object.freeze({
        row: Math.floor(index / 2),
        col: index % 2,
        sourceRow: Math.floor(index / 2),
        sourceCol: index % 2,
        tileId: 12,
        orientation: 0,
        height: 0,
        mainLight1: 0,
        mainLight2: 0,
        sourceLight1: 0,
        sourceLight2: 0,
        animLoop1: 1,
        animLoop2: 1,
        animLoop3: 1,
      }))),
    }),
    ...(pairMutation
      ? {
          objectMutation: Object.freeze({
            sourceGitSha256: sha(baselineContents[`${AREA}.git`]),
            sourceGicSha256: sha(baselineContents[`${AREA}.gic`]),
            candidateGitSha256: sha(candidateGit),
            candidateGicSha256: sha(candidateGic),
            sourceCounts: Object.freeze({ ...pairMutation.source.counts }),
            candidateCounts: Object.freeze({ ...pairMutation.candidate.counts }),
            deletedCounts: Object.freeze({ ...pairMutation.deletedCounts }),
            transformedCounts: Object.freeze({ ...pairMutation.transformedCounts }),
            propertyUpdatedCounts: Object.freeze({ ...pairMutation.propertyUpdatedCounts }),
            polygonUpdatedCounts: Object.freeze({ ...pairMutation.polygonUpdatedCounts }),
            addedCounts: Object.freeze({ ...pairMutation.addedCounts }),
            totalDeleted: options.objectDeletion ? 1 : 0,
            totalTransformed: options.encounterTransform || options.objectTransform || options.itemTransform || options.placeableTransform ||
              options.soundTransform || options.storeTransform || options.triggerTransform || options.waypointTransform ? 1 : 0,
            totalPropertyUpdated: options.doorTransitionMutation || options.creatureTagMutation || options.creatureConversationMutation || options.creatureInterruptableMutation || options.creatureAdvancedFlagsMutation || options.creatureDeathRemainsMutation || options.creatureAppearanceMutation || options.creatureGenderMutation || options.creaturePortraitMutation || options.creatureChallengeRatingMutation || options.creatureAbilityScoresMutation || options.creatureHitPointsMutation || options.creatureNaturalArmorClassMutation || options.creatureSavingThrowBonusesMutation || options.creatureAlignmentMutation || options.creatureFactionMutation || options.creatureTemplateResRefMutation || options.creatureSpecialIdentityStringsMutation || options.creatureScriptResRefsMutation || options.creatureLocalizedStringMutation || options.creatureEditorCommentMutation || options.placeableFactionMutation || options.placeablePortraitMutation || options.placeableTemplateResRefMutation || options.placeableBodyBagMutation || options.placeableTrapTypeMutation || options.placeableAnimationStateMutation || options.placeableConversationInterruptableMutation || options.placeableStaticUseableMutation || options.placeablePlotHasInventoryMutation || options.placeableDurabilitySaveBytesMutation || options.placeableHitPointsMutation || options.placeableEditorCommentMutation || options.storeEditorCommentMutation || options.triggerTagMutation || options.waypointTagMutation || options.waypointTemplateResRefMutation || options.waypointLocalizedNameMutation || options.waypointDescriptionMutation || options.waypointMapNoteMutation || options.waypointAppearanceMutation || options.waypointVariableTableMutation || options.waypointEditorCommentMutation || options.encounterTagMutation || options.encounterActiveMutation || options.encounterPlayerOnlyMutation || options.encounterResetMutation || options.encounterRespawnsMutation || options.encounterResetTimeMutation || options.encounterSpawnOptionMutation || options.encounterCreatureCountsMutation || options.encounterFactionMutation || options.encounterDifficultyMutation || options.encounterEditorCommentMutation || options.encounterCreatureListMutation || options.encounterSpawnPointListMutation ? 1 : 0,
            totalPolygonUpdated: options.triggerPolygonMutation ? 1 : 0,
            totalAdded: options.creatureAddition || options.doorAddition || options.encounterAddition || options.dynamicEncounterAddition || options.storeAddition || options.dynamicStoreAddition || options.triggerAddition || options.itemAddition || options.placeableAddition || options.dynamicPlaceableAddition || options.waypointAddition || options.dynamicWaypointAddition || options.soundAddition ? 1 : 0,
            blueprintSources: Object.freeze(options.creatureAddition || options.doorAddition || options.encounterAddition || options.dynamicEncounterAddition || options.storeAddition || options.dynamicStoreAddition || options.triggerAddition || options.itemAddition || options.placeableAddition || options.dynamicPlaceableAddition || options.waypointAddition || options.dynamicWaypointAddition || options.soundAddition
              ? [Object.freeze(options.creatureAddition ? {
                  sourceProfileId: "nwn-base-key-utc-nw-chicken-v1",
                  templateResRef: "nw_chicken",
                  sourceSha256: creatureAdditionFixture().sourceSha256,
                  addedCount: 1,
                } : options.doorAddition ? {
                  sourceProfileId: "nwn-base-key-utd-nw-door-ttr-04-tin01-121-0-v1",
                  templateResRef: "nw_door_ttr_04",
                  sourceSha256: doorAdditionFixture(0, 0).sourceSha256,
                  dependencyCount: 1,
                  dependencySetSha256: doorAdditionFixture(0, 0).doorHook.tilesetSha256,
                  addedCount: 1,
                } : options.encounterAddition ? {
                  sourceProfileId: "nwn-base-key-ute-x2-gnoll001-v1",
                  templateResRef: "x2_gnoll001",
                  sourceSha256: encounterAdditionFixture().sourceSha256,
                  addedCount: 1,
                } : options.dynamicEncounterAddition ? {
                  sourceProfileId: "effective-catalog-ute-encounter-copy-v1",
                  templateResRef: "enc_dynamic",
                  sourceSha256: dynamicEncounterAdditionFixture().sourceSha256,
                  dependencyCount: 0,
                  addedCount: 1,
                } : options.dynamicStoreAddition ? {
                  sourceProfileId: "effective-catalog-utm-store-copy-v1",
                  templateResRef: "str_dynamic",
                  sourceSha256: dynamicStoreAdditionFixture().sourceSha256,
                  dependencyCount: 1,
                  dependencySetSha256: hashAreaStoreConstructionDependencies(
                    dynamicStoreAdditionFixture().blueprintDependencies ?? [],
                  ),
                  addedCount: 1,
                } : options.storeAddition ? {
                  sourceProfileId: "nwn-base-key-utm-x2-merc-dye-v1",
                  templateResRef: "x2_merc_dye",
                  sourceSha256: storeAdditionFixture().sourceSha256,
                  addedCount: 1,
                } : options.triggerAddition ? {
                  sourceProfileId: "nwn-base-key-utt-newgeneric-v1",
                  templateResRef: "newgeneric",
                  sourceSha256: triggerAdditionFixture().sourceSha256,
                  addedCount: 1,
                } : options.itemAddition ? {
                  sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
                  templateResRef: "nw_cloth022",
                  sourceSha256: itemAdditionFixture().sourceSha256,
                  addedCount: 1,
                } : options.dynamicPlaceableAddition ? {
                  sourceProfileId: "effective-catalog-utp-placeable-copy-v1",
                  templateResRef: "plc_watertrough",
                  sourceSha256: dynamicPlaceableAdditionFixture().sourceSha256,
                  addedCount: 1,
                } : options.placeableAddition ? {
                  sourceProfileId: "nwn-base-key-utp-plc-watertrough-v1",
                  templateResRef: "plc_watertrough",
                  sourceSha256: placeableAdditionFixture().sourceSha256,
                  addedCount: 1,
                } : options.waypointAddition ? {
                  sourceProfileId: "nwn-base-key-utw-v1",
                  templateResRef: "nw_waypoint001",
                  sourceSha256: waypointAdditionFixture().sourceSha256,
                  addedCount: 1,
                } : options.dynamicWaypointAddition ? {
                  sourceProfileId: "effective-catalog-utw-waypoint-copy-v1",
                  templateResRef: "wp_dynamic",
                  sourceSha256: dynamicWaypointAdditionFixture().sourceSha256,
                  dependencyCount: 0,
                  addedCount: 1,
                } : {
                  sourceProfileId: "nwn-base-key-uts-animalcriesday-v1",
                  templateResRef: "animalcriesday",
                  sourceSha256: soundAdditionFixture().sourceSha256,
                  addedCount: 1,
                })]
              : []),
          }),
        }
      : options.audioEnvironment
        ? {}
        : {
          unchangedCompanions: Object.freeze({
            gitSha256: sha(baselineContents[`${AREA}.git`]),
            gicSha256: sha(baselineContents[`${AREA}.gic`]),
            moduleIfoSha256: sha(baselineContents["module.ifo"]),
          }),
        }),
    resources: Object.freeze([
      resource("are", 2012, candidateAre),
      resource("git", 2023, candidateGit),
      resource("gic", 2046, candidateGic),
    ]),
    ...(options.audioEnvironment
      ? {
          audioEnvironmentMutation: Object.freeze({
            expectedValue: audioEnvironmentExpected,
            value: audioEnvironmentValue,
            sourceGitSha256: sha(baselineContents[`${AREA}.git`]),
            candidateGitSha256: sha(candidateGit),
          }),
        }
      : {}),
    ...(options.moduleStartLocation
      ? {
          moduleStartLocationMutation: Object.freeze({
            expectedValue: startLocationExpected,
            value: startLocationValue,
            sourceIfoSha256: sha(baselineContents["module.ifo"]),
            candidateIfoSha256: sha(candidateIfo),
          }),
        }
      : {}),
    moduleIfo: Object.freeze({
      key: "module.ifo",
      fileName: "module.ifo",
      resourceType: 2014,
      baselineBytes: Buffer.from(baselineContents["module.ifo"]),
      baselineSha256: sha(baselineContents["module.ifo"]),
      candidateBytes: Buffer.from(candidateIfo),
      candidateSha256: sha(candidateIfo),
    }),
  });
  const parsed = validateAndNormalizeAreaUpdateCommand({
    schemaVersion: "area-update-command.v1",
    moduleId: MODULE_ID,
    areaResRef: AREA,
    expectedModuleRevision: manifest.revision,
    draft: { id: "draft-1", revision: 3, normalizedSha256: "d".repeat(64) },
    clientCommandId: "client-command-1",
  });
  if (!parsed.valid) throw new Error("Integration command must be valid.");
  const storage = new AtomicAreaCreateTransactionStorageAdapter(
    repository,
    new AuroraAreaUpdatePersistedReadbackVerifier(),
  );
  const compiler = { compile: jest.fn(async () => candidate) };
  const coordinator = new AreaUpdateTransactionCoordinator({
    authorization: { authorize: async () => true },
    lock: locks,
    idempotency: control,
    storage,
    compiler,
    tileAdmission: {
      evaluateProductionAdmission: async () => ({
        allowed: true as const,
        code: "AREA_TILE_PRODUCTION_ADMITTED" as const,
        tilesetResRef: "tin01",
        tileIds: Object.freeze([12]),
        diagnostics: Object.freeze([]) as readonly [],
        admission: Object.freeze({
          schemaVersion: "area-tile-production-admission.v1" as const,
          policyVersion: "area-tile-production-admission-policy.v1" as const,
          reportGeneratedAtIso: "2026-08-21T18:00:00.000Z",
          planId: "integration-plan",
          corpusHash: "c".repeat(64),
          profileId: "source-bound-v7",
          ledgerSha256: "3".repeat(64),
          reportSha256: "4".repeat(64),
          tilesetResRef: "tin01",
          uniqueTileIdCount: 1,
          tileIdSetSha256: "5".repeat(64),
        }),
      }),
    },
    journal: control,
    ids: { nextTransactionId: (() => {
      let id = 0;
      return () => `update-tx-${++id}`;
    })() },
    clock: { nowIso: () => "2026-08-12T12:00:01.000Z" },
  });
  return {
    repository,
    baselineContents,
    baselineRevision: manifest.revision,
    candidate,
    command: parsed.value,
    commandHash: parsed.commandHash,
    compiler,
    coordinator,
    factionCatalogBytes,
  };
}

function soundAdditionFixture() {
  const blueprintBytes = buildGffBuffer([
    { label: "Tag", type: "cexostring", value: "AnimalCriesDay" },
    { label: "LocName", type: "cexolocstring", value: { strRef: 67786, entries: [] } },
    { label: "TemplateResRef", type: "resref", value: "animalcriesday" },
    { label: "Active", type: "byte", value: 1 },
    { label: "Continuous", type: "byte", value: 1 },
    { label: "Looping", type: "byte", value: 0 },
    { label: "Positional", type: "byte", value: 1 },
    { label: "RandomPosition", type: "byte", value: 1 },
    { label: "Random", type: "byte", value: 1 },
    { label: "Elevation", type: "float", value: 1.5 },
    { label: "MaxDistance", type: "float", value: 10 },
    { label: "MinDistance", type: "float", value: 1 },
    { label: "RandomRangeX", type: "float", value: 10 },
    { label: "RandomRangeY", type: "float", value: 10 },
    { label: "Interval", type: "dword", value: 25000 },
    { label: "IntervalVrtn", type: "dword", value: 5000 },
    { label: "PitchVariation", type: "float", value: 0.2 },
    { label: "Priority", type: "byte", value: 18 },
    { label: "Hours", type: "dword", value: 0 },
    { label: "Times", type: "byte", value: 3 },
    { label: "Volume", type: "byte", value: 127 },
    { label: "VolumeVrtn", type: "byte", value: 0 },
    {
      label: "Sounds",
      type: "list",
      value: ["as_an_cryday1", "as_an_cryday2", "as_an_cryday3", "as_an_cryday4"].map((value) => ({
        typeId: 1243572,
        fields: [{ label: "Sound", type: "resref" as const, value }],
      })),
    },
    { label: "PaletteID", type: "byte", value: 6 },
    { label: "Comment", type: "cexostring", value: "" },
  ], "UTS ", 0xffffffff);
  return {
    kind: "sound" as const,
    localObjectId: "sou_001",
    sourceProfileId: "nwn-base-key-uts-animalcriesday-v1",
    templateResRef: "animalcriesday",
    resRef: "animalcriesday",
    tag: "AnimalCriesDay",
    sourceSha256: sha(blueprintBytes),
    blueprintBytes,
    x: 3.75,
    y: 4.9,
    z: 0.15,
    bearing: 0,
  };
}

function areaBytes(
  version: number,
  comments = " original area note ",
  onEnter = "old_enter",
  name = "Crypt",
  tag = AREA,
  flags = 4,
  playerVsPlayer = 0,
  noRest = 0,
  listenCheckModifier = -8,
  spotCheckModifier = 11,
  loadingScreenId = 0,
  nameEntries?: ReadonlyArray<Readonly<{ languageId: number; text: string }>>,
  visualEnvironment = integrationVisualEnvironmentSource(),
  visualEnvironmentScalarControls = { fogClipDistance: 45, windPower: 0 },
): Buffer {
  const dayNight = visualEnvironment.dayNightMode === "cycle"
    ? { dayNightCycle: 1, isNight: 0 }
    : visualEnvironment.dayNightMode === "always_day"
      ? { dayNightCycle: 0, isNight: 0 }
      : { dayNightCycle: 0, isNight: 1 };
  return buildGffBuffer([
    { label: "ResRef", type: "resref", value: AREA },
    {
      label: "Name",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: nameEntries ?? [{ languageId: 0, text: name }],
      },
    },
    { label: "Tag", type: "cexostring", value: tag },
    { label: "Comments", type: "cexostring", value: comments },
    { label: "OnEnter", type: "resref", value: onEnter },
    { label: "OnExit", type: "resref", value: "" },
    { label: "Flags", type: "dword", value: flags },
    { label: "PlayerVsPlayer", type: "byte", value: playerVsPlayer },
    { label: "NoRest", type: "byte", value: noRest },
    { label: "ModListenCheck", type: "int", value: listenCheckModifier },
    { label: "ModSpotCheck", type: "int", value: spotCheckModifier },
    { label: "LoadScreenID", type: "word", value: loadingScreenId },
    { label: "DayNightCycle", type: "byte", value: dayNight.dayNightCycle },
    { label: "IsNight", type: "byte", value: dayNight.isNight },
    { label: "ShadowOpacity", type: "byte", value: visualEnvironment.shadowOpacity },
    { label: "ChanceRain", type: "int", value: visualEnvironment.chanceRain },
    { label: "ChanceSnow", type: "int", value: visualEnvironment.chanceSnow },
    { label: "ChanceLightning", type: "int", value: visualEnvironment.chanceLightning },
    { label: "SunAmbientColor", type: "dword", value: visualEnvironment.sun.ambientColor },
    { label: "SunDiffuseColor", type: "dword", value: visualEnvironment.sun.diffuseColor },
    { label: "SunFogColor", type: "dword", value: visualEnvironment.sun.fogColor },
    { label: "SunFogAmount", type: "byte", value: visualEnvironment.sun.fogAmount },
    { label: "SunShadows", type: "byte", value: visualEnvironment.sun.shadows ? 1 : 0 },
    { label: "MoonAmbientColor", type: "dword", value: visualEnvironment.moon.ambientColor },
    { label: "MoonDiffuseColor", type: "dword", value: visualEnvironment.moon.diffuseColor },
    { label: "MoonFogColor", type: "dword", value: visualEnvironment.moon.fogColor },
    { label: "MoonFogAmount", type: "byte", value: visualEnvironment.moon.fogAmount },
    { label: "MoonShadows", type: "byte", value: visualEnvironment.moon.shadows ? 1 : 0 },
    { label: "FogClipDist", type: "float", value: visualEnvironmentScalarControls.fogClipDistance },
    { label: "WindPower", type: "int", value: visualEnvironmentScalarControls.windPower },
    { label: "Width", type: "int", value: 2 },
    { label: "Height", type: "int", value: 2 },
    { label: "Tileset", type: "resref", value: "tin01" },
    {
      label: "Tile_List",
      type: "list",
      value: Array.from({ length: 4 }, () => ({
        typeId: 1,
        fields: [
          { label: "Tile_ID", type: "int" as const, value: 12 },
          { label: "Tile_Orientation", type: "int" as const, value: 0 },
          { label: "Tile_Height", type: "int" as const, value: 0 },
          { label: "Tile_MainLight1", type: "byte" as const, value: 0 },
          { label: "Tile_MainLight2", type: "byte" as const, value: 0 },
          { label: "Tile_SrcLight1", type: "byte" as const, value: 0 },
          { label: "Tile_SrcLight2", type: "byte" as const, value: 0 },
          { label: "Tile_AnimLoop1", type: "byte" as const, value: 1 },
          { label: "Tile_AnimLoop2", type: "byte" as const, value: 1 },
          { label: "Tile_AnimLoop3", type: "byte" as const, value: 1 },
        ],
      })),
    },
    { label: "Version", type: "dword", value: version },
  ], "ARE ", 0);
}

function integrationVisualEnvironmentSource() {
  return Object.freeze({
    dayNightMode: "cycle" as const,
    shadowOpacity: 65,
    chanceRain: 25,
    chanceSnow: 5,
    chanceLightning: 10,
    sun: Object.freeze({
      ambientColor: 0x112233,
      diffuseColor: 0x445566,
      fogColor: 0x778899,
      fogAmount: 7,
      shadows: true,
    }),
    moon: Object.freeze({
      ambientColor: 0x223344,
      diffuseColor: 0x556677,
      fogColor: 0x8899aa,
      fogAmount: 11,
      shadows: false,
    }),
  });
}

function integrationVisualEnvironmentTarget() {
  return Object.freeze({
    dayNightMode: "always_night" as const,
    shadowOpacity: 40,
    chanceRain: 90,
    chanceSnow: 1,
    chanceLightning: 75,
    sun: Object.freeze({
      ambientColor: 0xaabbcc,
      diffuseColor: 0x010203,
      fogColor: 0x040506,
      fogAmount: 4,
      shadows: false,
    }),
    moon: Object.freeze({
      ambientColor: 0xddeeff,
      diffuseColor: 0x070809,
      fogColor: 0x0a0b0c,
      fogAmount: 15,
      shadows: true,
    }),
  });
}

function objectPair(options: Readonly<{
  includeCreatureConversation?: boolean;
  includeCreatureInterruptable?: boolean;
  includeCreatureAdvancedFlags?: boolean;
  includeCreatureDeathRemains?: boolean;
  includeCreatureAppearance?: boolean;
  includeCreatureGender?: boolean;
  includeCreaturePortrait?: boolean;
  includeCreatureChallengeRating?: boolean;
  includeCreatureNaturalArmorClass?: boolean;
  includeCreatureSavingThrowBonuses?: boolean;
  includeCreatureAlignment?: boolean;
  includeCreatureAbilityScores?: boolean;
  includeCreatureHitPoints?: boolean;
  includeCreatureFaction?: boolean;
  includeCreatureTemplateResRef?: boolean;
  includeCreatureSpecialIdentityStrings?: boolean;
  includeCreatureScriptResRefs?: boolean;
  includeDoor?: boolean;
  includeEncounter?: boolean;
  includePlaceable?: boolean;
  includePlaceableBodyBag?: boolean;
  includePlaceableFaction?: boolean;
  includePlaceablePortrait?: boolean;
  includePlaceableTemplateResRef?: boolean;
  includeWaypointTemplateResRef?: boolean;
  includePlaceableTrapType?: boolean;
  includePlaceableAnimationState?: boolean;
  includePlaceableConversationInterruptable?: boolean;
  includePlaceableStaticUseable?: boolean;
  includePlaceablePlotHasInventory?: boolean;
  includePlaceableDurabilitySaveBytes?: boolean;
  includePlaceableHitPoints?: boolean;
  includeSound?: boolean;
  includeStore?: boolean;
  includeTrigger?: boolean;
  includeWaypoint?: boolean;
}> = {}): { git: Buffer; gic: Buffer } {
  const profiles = [
    ["Creature List", 4], ["Door List", 8], ["Encounter List", 7],
    ["List", 0], ["Placeable List", 9], ["SoundList", 6],
    ["StoreList", 11], ["TriggerList", 1], ["WaypointList", 5],
  ] as const;
  const fields = (fileType: "GIT " | "GIC ") => profiles.map(([label, typeId]) => ({
    label,
    type: "list" as const,
    value: label === "Creature List" || label === "List" ||
      (label === "Door List" && options.includeDoor) ||
      (label === "Encounter List" && options.includeEncounter) ||
      (label === "Placeable List" && options.includePlaceable) ||
      (label === "SoundList" && options.includeSound) ||
      (label === "StoreList" && options.includeStore) ||
      (label === "TriggerList" && options.includeTrigger) ||
      (label === "WaypointList" && options.includeWaypoint)
      ? [{
          typeId,
          fields: fileType === "GIT "
            ? [
                ...(label === "Creature List" ? [
                  ...(options.includeCreatureConversation
                    ? [{ label: "Conversation", type: "resref" as const, value: "Guard_Dialog" }]
                    : []),
                  ...(options.includeCreatureInterruptable
                    ? [{ label: "Interruptable", type: "byte" as const, value: 1 }]
                    : []),
                  ...(options.includeCreatureAdvancedFlags
                    ? [
                        { label: "Disarmable", type: "byte" as const, value: 1 },
                        { label: "Plot", type: "byte" as const, value: 0 },
                        { label: "IsImmortal", type: "byte" as const, value: 0 },
                        { label: "Lootable", type: "byte" as const, value: 1 },
                        { label: "NoPermDeath", type: "byte" as const, value: 0 },
                      ]
                    : []),
                  ...(options.includeCreatureDeathRemains
                    ? [
                        { label: "Lootable", type: "byte" as const, value: 0 },
                        { label: "BodyBag", type: "byte" as const, value: 0 },
                        { label: "DecayTime", type: "dword" as const, value: 5_000 },
                      ]
                    : []),
                  ...(options.includeCreatureAppearance
                    ? [{ label: "Appearance_Type", type: "word" as const, value: 249 }]
                    : []),
                  ...(options.includeCreatureGender
                    ? [{ label: "Gender", type: "byte" as const, value: 4 }]
                    : []),
                  ...(options.includeCreaturePortrait
                    ? [
                        { label: "PortraitId", type: "word" as const, value: 10 },
                        { label: "Gender", type: "byte" as const, value: 0 },
                        { label: "Race", type: "byte" as const, value: 4 },
                      ]
                    : []),
                  ...(options.includeCreatureChallengeRating
                    ? [{ label: "ChallengeRating", type: "float" as const, value: 11.5 }]
                    : []),
                  ...(options.includeCreatureNaturalArmorClass
                    ? [{ label: "NaturalAC", type: "byte" as const, value: 0 }]
                    : []),
                  ...(options.includeCreatureSavingThrowBonuses
                    ? [
                        { label: "refbonus", type: "short" as const, value: 1 },
                        { label: "willbonus", type: "short" as const, value: 2 },
                        { label: "fortbonus", type: "short" as const, value: 3 },
                      ]
                    : []),
                  ...(options.includeCreatureAlignment
                    ? [
                        { label: "GoodEvil", type: "byte" as const, value: 50 },
                        { label: "LawfulChaotic", type: "byte" as const, value: 50 },
                      ]
                    : []),
                  ...(options.includeCreatureAbilityScores
                    ? [
                        { label: "Str", type: "byte" as const, value: 15 },
                        { label: "Dex", type: "byte" as const, value: 12 },
                        { label: "Con", type: "byte" as const, value: 14 },
                        { label: "Int", type: "byte" as const, value: 10 },
                        { label: "Wis", type: "byte" as const, value: 11 },
                        { label: "Cha", type: "byte" as const, value: 8 },
                      ]
                    : []),
                  ...(options.includeCreatureHitPoints
                    ? [
                        { label: "HitPoints", type: "short" as const, value: 20 },
                        { label: "CurrentHitPoints", type: "short" as const, value: 77 },
                        { label: "MaxHitPoints", type: "short" as const, value: 88 },
                        { label: "Con", type: "byte" as const, value: 14 },
                        { label: "Race", type: "byte" as const, value: 1 },
                        {
                          label: "ClassList",
                          type: "list" as const,
                          value: [3, 2].map((level) => ({
                            typeId: 2,
                            fields: [{ label: "ClassLevel", type: "short" as const, value: level }],
                          })),
                        },
                      ]
                    : []),
                  ...(options.includeCreatureFaction
                    ? [{ label: "FactionID", type: "word" as const, value: 1 }]
                    : []),
                  ...(options.includeCreatureTemplateResRef
                    ? [{ label: "TemplateResRef", type: "resref" as const, value: "nw_guard" }]
                    : []),
                  ...(options.includeCreatureSpecialIdentityStrings
                    ? [
                        { label: "Subrace", type: "cexostring" as const, value: "Moon Elf" },
                        { label: "Deity", type: "cexostring" as const, value: "" },
                      ]
                    : []),
                  ...(options.includeCreatureScriptResRefs
                    ? [
                        { label: "ScriptHeartbeat", type: "resref" as const, value: "NW_C2_DEFAULT1" },
                        { label: "ScriptSpawn", type: "resref" as const, value: "nw_c2_default9" },
                        { label: "ScriptDeath", type: "resref" as const, value: "nw_c2_default7" },
                      ]
                    : []),
                  {
                    label: "FirstName",
                    type: "cexolocstring" as const,
                    value: {
                      strRef: 0xffff_ffff,
                      entries: [{ languageId: 0, text: "Guard" }],
                    },
                  },
                  {
                    label: "LastName",
                    type: "cexolocstring" as const,
                    value: { strRef: 0xffff_ffff, entries: [] },
                  },
                ] : []),
                { label: "Tag", type: "cexostring" as const, value: label },
                ...(label === "WaypointList" ? [
                  ...(options.includeWaypointTemplateResRef
                    ? [{ label: "TemplateResRef", type: "resref" as const, value: "nw_waypoint001" }]
                    : []),
                  { label: "Appearance", type: "byte" as const, value: 1 },
                  {
                    label: "LocalizedName",
                    type: "cexolocstring" as const,
                    value: {
                      strRef: 0xffff_ffff,
                      entries: [{ languageId: 0, text: "Patrol Point" }],
                    },
                  },
                  {
                    label: "Description",
                    type: "cexolocstring" as const,
                    value: {
                      strRef: 0xffff_ffff,
                      entries: [{ languageId: 0, text: "Patrol route" }],
                    },
                  },
                  { label: "HasMapNote", type: "byte" as const, value: 0 },
                  {
                    label: "MapNote",
                    type: "cexolocstring" as const,
                    value: {
                      strRef: 0xffff_ffff,
                      entries: [{ languageId: 0, text: "Old marker" }],
                    },
                  },
                  { label: "MapNoteEnabled", type: "byte" as const, value: 1 },
                ] : []),
                ...(label === "Encounter List" ? [
                  {
                    label: "LocalizedName",
                    type: "cexolocstring" as const,
                    value: {
                      strRef: 0xffff_ffff,
                      entries: [{ languageId: 0, text: "Gnoll Ambush" }],
                    },
                  },
                  { label: "Active", type: "byte" as const, value: 1 },
                  { label: "PlayerOnly", type: "byte" as const, value: 1 },
                  { label: "Reset", type: "byte" as const, value: 0 },
                  { label: "ResetTime", type: "int" as const, value: 60 },
                  { label: "SpawnOption", type: "int" as const, value: 1 },
                  { label: "Respawns", type: "int" as const, value: 0 },
                  { label: "MaxCreatures", type: "int" as const, value: 4 },
                  { label: "RecCreatures", type: "int" as const, value: 2 },
                  { label: "Faction", type: "dword" as const, value: 1 },
                  { label: "Difficulty", type: "int" as const, value: 1 },
                  { label: "DifficultyIndex", type: "int" as const, value: 2 },
                  {
                    label: "CreatureList",
                    type: "list" as const,
                    value: [
                      { typeId: 0, fields: [
                        { label: "Appearance", type: "int" as const, value: 388 },
                        { label: "CR", type: "float" as const, value: 1 },
                        { label: "ResRef", type: "resref" as const, value: "nw_gnoll001" },
                        { label: "SingleSpawn", type: "byte" as const, value: 0 },
                      ] },
                      { typeId: 0, fields: [
                        { label: "Appearance", type: "int" as const, value: 389 },
                        { label: "CR", type: "float" as const, value: 3 },
                        { label: "ResRef", type: "resref" as const, value: "nw_gnoll002" },
                        { label: "SingleSpawn", type: "byte" as const, value: 1 },
                      ] },
                    ],
                  },
                  { label: "XPosition", type: "float" as const, value: 22.412015914916992 },
                  { label: "YPosition", type: "float" as const, value: 45.1970329284668 },
                  { label: "ZPosition", type: "float" as const, value: 0 },
                  {
                    label: "Geometry",
                    type: "list" as const,
                    value: [
                      encounterGeometryPoint(-0.13086700439453125, -6.151325225830078, 0.0250005591660738),
                      encounterGeometryPoint(6.059123992919922, -6.1513214111328125, 0.025000499561429024),
                      encounterGeometryPoint(6.059125900268555, 0.038669586181640625, 0.025000059977173805),
                      encounterGeometryPoint(0, 0, 0.02500000037252903),
                    ],
                  },
                  { label: "SpawnPointList", type: "list" as const, value: [] },
                ] : label === "TriggerList" ? [
                  {
                    label: "LocalizedName",
                    type: "cexolocstring" as const,
                    value: {
                      strRef: 0xffff_ffff,
                      entries: [{ languageId: 0, text: "Gate Trigger" }],
                    },
                  },
                  { label: "XPosition", type: "float" as const, value: 35.47599411010742 },
                  { label: "YPosition", type: "float" as const, value: 44.91108703613281 },
                  { label: "ZPosition", type: "float" as const, value: 0 },
                  { label: "XOrientation", type: "float" as const, value: 0 },
                  { label: "YOrientation", type: "float" as const, value: 0 },
                  { label: "ZOrientation", type: "float" as const, value: 0 },
                  {
                    label: "Geometry",
                    type: "list" as const,
                    value: [
                      geometryPoint(-0.2990303039550781, -4.833713531494141, 0.02500000037252903),
                      geometryPoint(4.8592987060546875, -4.833709716796875, 0.025000499561429024),
                      geometryPoint(4.8592987060546875, 0.324615478515625, 0.025000499561429024),
                      geometryPoint(0, 0, 3.125),
                    ],
                  },
                ] : label === "Door List" ? [
                  { label: "LinkedTo", type: "cexostring" as const, value: "OLD_DEST" },
                  { label: "LinkedToFlags", type: "byte" as const, value: 1 },
                  { label: "LoadScreenID", type: "word" as const, value: 0 },
                ] : label === "Creature List" || label === "List" || label === "StoreList" || label === "WaypointList" ? [
                  { label: "XPosition", type: "float" as const, value: label === "StoreList" ? 42.91445541381836 : 60.9686 },
                  { label: "YPosition", type: "float" as const, value: label === "StoreList" ? 50.39402770996094 : 27.1816 },
                  { label: "ZPosition", type: "float" as const, value: label === "StoreList" ? 0.0000004999999987376214 : 0 },
                  { label: "XOrientation", type: "float" as const, value: label === "StoreList" || label === "WaypointList" ? 0 : 1 },
                  { label: "YOrientation", type: "float" as const, value: label === "StoreList" || label === "WaypointList" ? 1 : 0 },
                ] : label === "Placeable List" ? [
                  ...(options.includePlaceableBodyBag
                    ? [{ label: "BodyBag", type: "byte" as const, value: 0 }]
                    : []),
                  ...(options.includePlaceableTrapType
                    ? [{ label: "TrapType", type: "byte" as const, value: 0 }]
                    : []),
                  ...(options.includePlaceableAnimationState
                    ? [{ label: "AnimationState", type: "byte" as const, value: 0 }]
                    : []),
                  ...(options.includePlaceableConversationInterruptable
                    ? [
                        { label: "Conversation", type: "resref" as const, value: "" },
                        { label: "Interruptable", type: "byte" as const, value: 1 },
                      ]
                    : []),
                  ...(options.includePlaceableStaticUseable
                    ? [
                        { label: "Static", type: "byte" as const, value: 1 },
                        { label: "Useable", type: "byte" as const, value: 0 },
                      ]
                    : []),
                  ...(options.includePlaceablePlotHasInventory
                    ? [
                        { label: "Plot", type: "byte" as const, value: 0 },
                        { label: "HasInventory", type: "byte" as const, value: 0 },
                      ]
                    : []),
                  ...(options.includePlaceableDurabilitySaveBytes
                    ? [
                        { label: "Hardness", type: "byte" as const, value: 5 },
                        { label: "Fort", type: "byte" as const, value: 16 },
                        { label: "Ref", type: "byte" as const, value: 0 },
                        { label: "Will", type: "byte" as const, value: 0 },
                      ]
                    : []),
                  ...(options.includePlaceableHitPoints
                    ? [
                        { label: "HP", type: "short" as const, value: 15 },
                        { label: "CurrentHP", type: "short" as const, value: 45 },
                      ]
                    : []),
                  ...(options.includePlaceableTemplateResRef
                    ? [{ label: "TemplateResRef", type: "resref" as const, value: "plc_chest" }]
                    : []),
                  ...(options.includePlaceableFaction
                    ? [{ label: "Faction", type: "dword" as const, value: 1 }]
                    : []),
                  ...(options.includePlaceablePortrait
                    ? [{ label: "PortraitId", type: "word" as const, value: 462 }]
                    : []),
                  { label: "X", type: "float" as const, value: 40 },
                  { label: "Y", type: "float" as const, value: 50 },
                  { label: "Z", type: "float" as const, value: 0 },
                  { label: "Bearing", type: "float" as const, value: 0 },
                ] : label === "SoundList" ? [
                  { label: "XPosition", type: "float" as const, value: 40 },
                  { label: "YPosition", type: "float" as const, value: 50 },
                  { label: "ZPosition", type: "float" as const, value: 1.5 },
                ] : []),
              ]
            : [
                ...(label === "SoundList"
                  ? [{ label: "PlayInToolset", type: "byte" as const, value: 1 }]
                  : []),
                { label: "Comment", type: "cexostring" as const, value: label },
              ],
        }]
      : [],
  }));
  const gitFields: SupportedGffField[] = [...fields("GIT ")];
  gitFields.push({
    label: "AreaProperties",
    type: "struct" as const,
    value: {
      typeId: 100,
      fields: [
        { label: "AmbientSndDay", type: "int" as const, value: 41 },
        { label: "AmbientSndNight", type: "int" as const, value: 42 },
        { label: "AmbientSndDayVol", type: "int" as const, value: 101 },
        { label: "AmbientSndNitVol", type: "int" as const, value: 102 },
        { label: "EnvAudio", type: "int" as const, value: 7 },
        { label: "MusicBattle", type: "int" as const, value: 13 },
        { label: "MusicDay", type: "int" as const, value: 11 },
        { label: "MusicNight", type: "int" as const, value: 12 },
        { label: "MusicDelay", type: "int" as const, value: 3000 },
      ],
    },
  });
  return {
    git: buildGffBuffer(gitFields, "GIT ", 0),
    gic: buildGffBuffer(fields("GIC "), "GIC ", 0),
  };
}

function areaAudioEnvironment() {
  return Object.freeze({
    ambientSoundDayId: 41,
    ambientSoundNightId: 42,
    ambientSoundDayVolume: 101,
    ambientSoundNightVolume: 102,
    environmentAudioId: 7,
    musicBattleId: 13,
    musicDayId: 11,
    musicNightId: 12,
    musicDelayMilliseconds: 3000,
  });
}

function geometryPoint(x: number, y: number, z: number) {
  return {
    typeId: 3,
    fields: [
      { label: "PointX", type: "float" as const, value: x },
      { label: "PointY", type: "float" as const, value: y },
      { label: "PointZ", type: "float" as const, value: z },
    ],
  };
}

function integrationTriggerSourcePolygon() {
  return {
    coordinateSpace: "native_local" as const,
    points: [
      { x: -0.2990303039550781, y: -4.833713531494141, z: 0.02500000037252903 },
      { x: 4.8592987060546875, y: -4.833709716796875, z: 0.025000499561429024 },
      { x: 4.8592987060546875, y: 0.324615478515625, z: 0.025000499561429024 },
      { x: 0, y: 0, z: 3.125 },
    ],
  };
}

function integrationTriggerTargetPolygon() {
  return {
    coordinateSpace: "native_local" as const,
    points: [
      { x: -1, y: -5, z: 0.25 },
      { x: 5, y: -5, z: 0.25 },
      { x: 5, y: 1, z: 0.25 },
      { x: 0, y: 0, z: 3.5 },
    ],
  };
}

function encounterGeometryPoint(x: number, y: number, z: number) {
  return {
    typeId: 1,
    fields: [
      { label: "X", type: "float" as const, value: x },
      { label: "Y", type: "float" as const, value: y },
      { label: "Z", type: "float" as const, value: z },
    ],
  };
}

function moduleIfo(): Buffer {
  return buildGffBuffer([
    { label: "Mod_Entry_Area", type: "resref", value: AREA },
    { label: "Mod_Entry_X", type: "float", value: 1 },
    { label: "Mod_Entry_Y", type: "float", value: 2 },
    { label: "Mod_Entry_Z", type: "float", value: 3 },
    { label: "Mod_Entry_Dir_X", type: "float", value: 0 },
    { label: "Mod_Entry_Dir_Y", type: "float", value: 1 },
    {
      label: "Mod_Area_list",
      type: "list",
      value: [AREA, "other02"].map((areaResRef) => ({
        typeId: 6,
        fields: [{ label: "Area_Name", type: "resref" as const, value: areaResRef }],
      })),
    },
  ], "IFO ", 0);
}

function moduleFactionCatalogBytes(): Buffer {
  return buildGffBuffer([
    {
      label: "FactionList",
      type: "list",
      value: ["PC", "Hostile", "Commoner"].map((name, factionId) => ({
        typeId: factionId,
        fields: [
          { label: "FactionName", type: "cexostring" as const, value: name },
          { label: "FactionParentID", type: "dword" as const, value: 0xffff_ffff },
          { label: "FactionGlobal", type: "word" as const, value: 1 },
        ],
      })),
    },
    { label: "RepList", type: "list", value: [] },
  ], "FAC ", 0xffff_ffff);
}

function resource(extension: "are" | "git" | "gic", type: number, bytes: Buffer) {
  return Object.freeze({
    extension,
    key: `${AREA}.${extension}`,
    fileName: `${AREA}.${extension}`,
    resourceType: type,
    bytes: Buffer.from(bytes),
    size: bytes.length,
    sha256: sha(bytes),
  });
}

function resourceType(logicalKey: string): number {
  if (logicalKey.endsWith(".are")) return 2012;
  if (logicalKey.endsWith(".git")) return 2023;
  if (logicalKey.endsWith(".gic")) return 2046;
  if (logicalKey.endsWith(".fac")) return 2038;
  return 2014;
}

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function dynamicStoreAdditionFixture() {
  const itemBytes = buildGffBuffer([
    { label: "TemplateResRef", type: "resref", value: "itm_store_child" },
    { label: "Tag", type: "cexostring", value: "ITM_STORE_CHILD" },
    { label: "BaseItem", type: "int", value: 22 },
  ], "UTI ", 0xffffffff);
  const blueprintBytes = buildGffBuffer([
    { label: "ResRef", type: "resref", value: "str_dynamic" },
    { label: "LocName", type: "cexolocstring", value: "Dynamic Store" },
    { label: "Tag", type: "cexostring", value: "Dynamic_Store" },
    {
      label: "StoreList",
      type: "list",
      value: [
        {
          typeId: 0,
          fields: [{
            label: "ItemList",
            type: "list",
            value: [{
              typeId: 0,
              fields: [
                { label: "InventoryRes", type: "resref", value: "itm_store_child" },
                { label: "Repos_PosX", type: "word", value: 1 },
                { label: "Repos_Posy", type: "word", value: 2 },
              ],
            }],
          }],
        },
        { typeId: 4, fields: [] },
        { typeId: 2, fields: [] },
        { typeId: 3, fields: [] },
        { typeId: 1, fields: [] },
      ],
    },
    { label: "Comment", type: "cexostring", value: "Dynamic comment" },
  ], "UTM ", 0xffffffff);
  return {
    kind: "store" as const,
    localObjectId: "sto_dynamic",
    sourceProfileId: "effective-catalog-utm-store-copy-v1",
    sourceObjectKey: "modules/current/blueprints/stores/str_dynamic.utm",
    sourceSizeBytes: blueprintBytes.length,
    templateResRef: "str_dynamic",
    resRef: "str_dynamic",
    tag: "Dynamic_Store",
    sourceSha256: sha(blueprintBytes),
    blueprintBytes,
    blueprintDependencies: [{
      templateResRef: "itm_store_child",
      resourceType: 2025,
      sha256: sha(itemBytes),
      bytes: itemBytes,
      resolvedModelType: 0 as const,
    }],
    x: 4.25,
    y: 5.5,
    z: 0.125,
    bearing: Math.PI / 3,
  };
}

function waypointAdditionFixture() {
  const blueprintBytes = buildGffBuffer([
    { label: "Comment", type: "cexostring", value: "Patrol path waypoint." },
    { label: "Description", type: "cexolocstring", value: { strRef: 0xffffffff, entries: [] } },
    { label: "LinkedTo", type: "cexostring", value: "" },
    { label: "TemplateResRef", type: "resref", value: "nw_waypoint001" },
    { label: "LocalizedName", type: "cexolocstring", value: { strRef: 14817, entries: [] } },
    { label: "Tag", type: "cexostring", value: "NW_WAYPOINT001" },
    { label: "HasMapNote", type: "byte", value: 0 },
    { label: "PaletteID", type: "byte", value: 5 },
  ], "UTW ", 0xffffffff);
  return {
    kind: "waypoint" as const,
    localObjectId: "wpt_001",
    sourceProfileId: "nwn-base-key-utw-v1",
    templateResRef: "nw_waypoint001",
    resRef: "nw_waypoint001",
    tag: "NW_WAYPOINT001",
    sourceSha256: sha(blueprintBytes),
    blueprintBytes,
    x: 3.5,
    y: 4.75,
    z: 0.35,
    bearing: Math.PI / 2,
  };
}
