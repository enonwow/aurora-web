import { createHash } from "node:crypto";
import { AppException } from "../../src/common/http/app-exception";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import { serializeAreaEditingDraftToAreGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-editing-writer";
import { inspectAreaGitGicPair } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-object-pair-writer";
import { buildGffBuffer, type SupportedGffField } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import {
  AreaUpdateCandidateCompiler,
  AreaUpdateCompilerFailure,
} from "../../src/modules/areas/application/area-update-candidate.compiler";
import type { AtomicModuleSnapshotRepositoryPort } from "../../src/modules/areas/application/ports/atomic-module-snapshot.port";
import {
  MODULE_SNAPSHOT_HEAD_SCHEMA_VERSION,
  type ModuleSnapshotContentRecord,
} from "../../src/modules/areas/application/ports/atomic-module-snapshot.port";
import {
  AreaDraftRepositoryError,
  type AreaDraftRepositoryPort,
} from "../../src/modules/areas/application/ports/area-draft.repository.port";
import type { AreaUpdateCommand } from "../../src/modules/areas/domain/area-update-command.types";
import type { AreaDraftSnapshot } from "../../src/modules/areas/domain/area-draft.types";
import type { AreaObjectBlueprintSourcePort } from "../../src/modules/areas/application/ports/area-object-blueprint-source.port";
import { AreaObjectBlueprintSourceError } from "../../src/modules/areas/application/ports/area-object-blueprint-source.port";
import type { AreaDynamicItemBlueprintCopyTelemetryPort } from
  "../../src/modules/areas/application/ports/area-dynamic-item-blueprint-copy-telemetry.port";
import type { AreaStoreCommerceTelemetryPort } from
  "../../src/modules/areas/application/ports/area-store-commerce-telemetry.port";
import type { AreaStoreScriptResRefsTelemetryPort } from
  "../../src/modules/areas/application/ports/area-store-script-resrefs-telemetry.port";
import type { AreaTriggerScriptResRefsTelemetryPort } from
  "../../src/modules/areas/application/ports/area-trigger-script-resrefs-telemetry.port";
import type { AreaTriggerTransitionStorageTelemetryPort } from
  "../../src/modules/areas/application/ports/area-trigger-transition-storage-telemetry.port";
import type { AreaTriggerCorePropertiesTelemetryPort } from
  "../../src/modules/areas/application/ports/area-trigger-core-properties-telemetry.port";
import type { AreaTriggerTrapPropertiesTelemetryPort } from
  "../../src/modules/areas/application/ports/area-trigger-trap-properties-telemetry.port";
import type { AreaTriggerVariableTableTelemetryPort } from
  "../../src/modules/areas/application/ports/area-trigger-variable-table-telemetry.port";
import type { AreaStoreVariableTableTelemetryPort } from
  "../../src/modules/areas/application/ports/area-store-variable-table-telemetry.port";
import type { AreaStoreRestrictionsTelemetryPort } from
  "../../src/modules/areas/application/ports/area-store-restrictions-telemetry.port";
import type { AreaStoreInventoryTelemetryPort } from
  "../../src/modules/areas/application/ports/area-store-inventory-telemetry.port";
import type {
  EffectiveTemplateBlueprintResult,
  TemplateCatalogRepositoryPort,
} from "../../src/modules/catalog/application/ports/template-catalog-repository.port";
import {
  buildModuleSnapshotManifestKey,
  createModuleSnapshotManifest,
  hashModuleSnapshotManifest,
} from "../../src/modules/areas/domain/module-snapshot-manifest";
import { placeableBlueprintFixture } from "../support/area-placeable-construction-fixture";
import { itemBlueprintFixture } from "../support/area-item-construction-fixture";
import {
  creatureBlueprintFixture,
  expectedCreatureGitFields,
} from "../support/area-creature-construction-fixture";
import {
  expectedStoreGitFields,
  storeBlueprintDependencyFixtures,
  storeBlueprintFixture,
} from "../support/area-store-construction-fixture";
import {
  expectedTriggerGitFields,
  triggerBlueprintFixture,
} from "../support/area-trigger-construction-fixture";
import {
  encounterBlueprintFixture,
  dynamicEncounterBlueprintFixture,
  expectedEncounterGitFields,
  expectedDynamicEncounterGitFields,
} from "../support/area-encounter-construction-fixture";
import {
  doorBlueprintFixture,
  expectedDoorGitFields,
} from "../support/area-door-construction-fixture";
import {
  dynamicWaypointBlueprintFixture,
  expectedDynamicWaypointGitFields,
} from "../support/area-waypoint-construction-fixture";
import { readModuleIfoStartLocation } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-module-ifo-area-writer";
import { parseAreaAudioEnvironmentFromGitGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const MODULE_ID = "workspace:module-01";
const AREA = "crypt01";
const DRAFT_HASH = "d".repeat(64);

describe("AreaUpdateCandidateCompiler", () => {
  it("exposes a stable typed failure with empty details by default", () => {
    const failure = new AreaUpdateCompilerFailure(
      "AREA_UPDATE_INVALID",
      422,
      "invalid update",
    );

    expect(failure).toMatchObject({
      name: "AreaUpdateCompilerFailure",
      code: "AREA_UPDATE_INVALID",
      status: 422,
      message: "invalid update",
      details: [],
    });
  });

  it("binds the exact draft and snapshot while preserving GIT, GIC, and IFO bytes", async () => {
    const harness = createHarness();

    const candidate = await harness.compiler.compile(
      harness.command,
      { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
      "actor-01",
      "tx-01",
    );

    expect(harness.drafts.read).toHaveBeenCalledWith({
      actorId: "actor-01",
      draftId: "draft-01",
      revision: 3,
    });
    expect(harness.areaEditing.exportAre).toHaveBeenCalledTimes(1);
    expect(harness.areaEditing.exportAre).toHaveBeenCalledWith({
      areaResRef: AREA,
      name: "Crypt 01",
      width: 2,
      height: 2,
      tilesetResRef: "tin01",
      tilesetFingerprint: "e".repeat(64),
      areaFingerprint: sha256(harness.contents[`${AREA}.are`]),
      tiles: tiles(),
    });
    expect(candidate.areaId).toBe(AREA);
    expect(candidate.sourceAreaSha256).toBe(sha256(harness.contents[`${AREA}.are`]));
    expect(candidate.candidateAreaSha256).toBe(sha256(harness.candidateAre));
    expect(candidate.setFingerprintSha256).toBe("e".repeat(64));
    expect(candidate.resources.map((entry) => entry.fileName)).toEqual([
      `${AREA}.are`,
      `${AREA}.git`,
      `${AREA}.gic`,
    ]);
    expect(candidate.resources.find((entry) => entry.extension === "are")?.bytes).toEqual(
      harness.candidateAre,
    );
    expect(candidate.resources.find((entry) => entry.extension === "git")?.bytes).toEqual(
      harness.contents[`${AREA}.git`],
    );
    expect(candidate.resources.find((entry) => entry.extension === "gic")?.bytes).toEqual(
      harness.contents[`${AREA}.gic`],
    );
    expect(candidate.moduleIfo.baselineBytes).toEqual(harness.contents["module.ifo"]);
    expect(candidate.moduleIfo.candidateBytes).toEqual(harness.contents["module.ifo"]);
    expect(candidate.unchangedCompanions).toEqual({
      gitSha256: sha256(harness.contents[`${AREA}.git`]),
      gicSha256: sha256(harness.contents[`${AREA}.gic`]),
      moduleIfoSha256: sha256(harness.contents["module.ifo"]),
    });
  });

  it("compiles provenance-bound Area identity, Comments, scripts, and advanced flags while preserving every companion", async () => {
    const harness = createHarness();
    const snapshot = structuredClone(harness.snapshot);
    const payload = snapshot.draft.payload as Record<string, any>;
    payload.sourceArea.comments = " original note ";
    payload.editableScene.areaComments = " updated note ";
    payload.sourceArea.eventScripts = { onEnter: "old_enter", onExit: "" };
    payload.editableScene.areaEventScripts = { onEnter: "new_enter", onExit: "" };
    payload.sourceArea.basicIdentity = {
      name: "Crypt 01",
      nameProfile: "simple_inline_ascii",
      tag: "CRYPT_01",
    };
    payload.editableScene.areaName = "Crypt Updated";
    payload.editableScene.areaTag = "CRYPT_UPDATED";
    payload.editableScene.areaBasicIdentity = {
      name: "Crypt Updated",
      nameProfile: "simple_inline_ascii",
      tag: "CRYPT_UPDATED",
    };
    payload.sourceArea.advancedFlags = {
      terrainType: { interior: false, natural: true, subterranean: false },
      playerVsPlayer: 0,
      noRest: false,
      listenCheckModifier: -8,
      spotCheckModifier: 11,
    };
    payload.editableScene.areaAdvancedFlags = {
      terrainType: { interior: true, natural: false, subterranean: true },
      playerVsPlayer: 3,
      noRest: true,
      listenCheckModifier: 9,
      spotCheckModifier: -12,
    };
    harness.drafts.read.mockResolvedValueOnce(snapshot);
    const candidateAre = serializeAreaEditingDraftToAreGff({
      areaResRef: AREA,
      name: "Crypt Updated",
      width: 2,
      height: 2,
      tilesetResRef: "tin01",
      comments: { expectedValue: " original note ", value: " updated note " },
      eventScripts: {
        onEnter: { expectedResRef: "old_enter", resRef: "new_enter" },
      },
      basicIdentity: {
        name: {
          expectedValue: "Crypt 01",
          value: "Crypt Updated",
          expectedProfile: "simple_inline_ascii",
        },
        tag: { expectedValue: "CRYPT_01", value: "CRYPT_UPDATED" },
      },
      advancedFlags: {
        terrainType: {
          expectedValue: { interior: false, natural: true, subterranean: false },
          value: { interior: true, natural: false, subterranean: true },
        },
        playerVsPlayer: { expectedValue: 0, value: 3 },
        noRest: { expectedValue: false, value: true },
        listenCheckModifier: { expectedValue: -8, value: 9 },
        spotCheckModifier: { expectedValue: 11, value: -12 },
      },
      tiles: tiles(),
    }, areaCommentsPreservation(
      " original note ",
      "old_enter",
      "Crypt 01",
      "CRYPT_01",
      true,
    ));
    harness.areaEditing.exportAre.mockResolvedValueOnce({
      ...harness.exportResult,
      size: candidateAre.length,
      bytes: Buffer.from(candidateAre) as Buffer<ArrayBuffer>,
    });

    const candidate = await harness.compiler.compile(
      harness.command,
      { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
      "actor-01",
      "tx-area-comments",
    );

    expect(harness.areaEditing.exportAre).toHaveBeenCalledWith(expect.objectContaining({
      comments: { expectedValue: " original note ", value: " updated note " },
      eventScripts: {
        onEnter: { expectedResRef: "old_enter", resRef: "new_enter" },
      },
      basicIdentity: {
        name: {
          expectedValue: "Crypt 01",
          value: "Crypt Updated",
          expectedProfile: "simple_inline_ascii",
        },
        tag: { expectedValue: "CRYPT_01", value: "CRYPT_UPDATED" },
      },
      advancedFlags: {
        terrainType: {
          expectedValue: { interior: false, natural: true, subterranean: false },
          value: { interior: true, natural: false, subterranean: true },
        },
        playerVsPlayer: { expectedValue: 0, value: 3 },
        noRest: { expectedValue: false, value: true },
        listenCheckModifier: { expectedValue: -8, value: 9 },
        spotCheckModifier: { expectedValue: 11, value: -12 },
      },
    }));
    expect(candidate.projectedDraft.comments).toEqual({
      expectedValue: " original note ",
      value: " updated note ",
    });
    expect(candidate.projectedDraft.eventScripts).toEqual({
      onEnter: { expectedResRef: "old_enter", resRef: "new_enter" },
    });
    expect(candidate.projectedDraft.basicIdentity).toEqual({
      name: {
        expectedValue: "Crypt 01",
        value: "Crypt Updated",
        expectedProfile: "simple_inline_ascii",
      },
      tag: { expectedValue: "CRYPT_01", value: "CRYPT_UPDATED" },
    });
    expect(candidate.projectedDraft.advancedFlags).toEqual({
      terrainType: {
        expectedValue: { interior: false, natural: true, subterranean: false },
        value: { interior: true, natural: false, subterranean: true },
      },
      playerVsPlayer: { expectedValue: 0, value: 3 },
      noRest: { expectedValue: false, value: true },
      listenCheckModifier: { expectedValue: -8, value: 9 },
      spotCheckModifier: { expectedValue: 11, value: -12 },
    });
    expect(candidate.unchangedCompanions).toEqual({
      gitSha256: sha256(harness.contents[`${AREA}.git`]),
      gicSha256: sha256(harness.contents[`${AREA}.gic`]),
      moduleIfoSha256: sha256(harness.contents["module.ifo"]),
    });
  });

  it("compiles one complete module start-location tuple into the atomic IFO candidate", async () => {
    const harness = createHarness({ moduleStartLocationMutation: true });

    const candidate = await harness.compiler.compile(
      harness.command,
      { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
      "actor-01",
      "tx-start-location",
    );

    expect(candidate.moduleIfo.baselineBytes).toEqual(harness.contents["module.ifo"]);
    expect(candidate.moduleIfo.candidateBytes).not.toEqual(harness.contents["module.ifo"]);
    expect(readModuleIfoStartLocation(candidate.moduleIfo.candidateBytes)).toEqual({
      areaResRef: "other02",
      x: Math.fround(10.1),
      y: Math.fround(20.2),
      z: Math.fround(0.3),
      directionX: Math.fround(0.6),
      directionY: Math.fround(0.8),
    });
    expect(candidate.moduleStartLocationMutation).toEqual({
      expectedValue: {
        areaResRef: "other01", x: 1, y: 2, z: 3, directionX: 0, directionY: 1,
      },
      value: readModuleIfoStartLocation(candidate.moduleIfo.candidateBytes),
      sourceIfoSha256: sha256(harness.contents["module.ifo"]),
      candidateIfoSha256: sha256(candidate.moduleIfo.candidateBytes),
    });
    expect(candidate.unchangedCompanions).toEqual({
      gitSha256: sha256(harness.contents[`${AREA}.git`]),
      gicSha256: sha256(harness.contents[`${AREA}.gic`]),
      moduleIfoSha256: sha256(harness.contents["module.ifo"]),
    });
  });

  it("compiles one complete provenance-bound Area audio tuple into the atomic GIT candidate", async () => {
    const harness = createHarness({ audioEnvironmentMutation: true });

    const candidate = await harness.compiler.compile(
      harness.command,
      { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
      "actor-01",
      "tx-area-audio",
    );

    const git = candidate.resources.find((entry) => entry.extension === "git")!;
    expect(parseAreaAudioEnvironmentFromGitGff(git.bytes)).toEqual({
      ...areaAudioEnvironment(),
      ambientSoundNightVolume: 77,
      musicDelayMilliseconds: -4000,
    });
    expect(candidate.audioEnvironmentMutation).toEqual({
      expectedValue: areaAudioEnvironment(),
      value: {
        ...areaAudioEnvironment(),
        ambientSoundNightVolume: 77,
        musicDelayMilliseconds: -4000,
      },
      sourceGitSha256: sha256(harness.contents[`${AREA}.git`]),
      candidateGitSha256: git.sha256,
    });
    expect(candidate.unchangedCompanions).toBeUndefined();
  });

  it("fails closed when a required companion is absent", async () => {
    const harness = createHarness({ omit: `${AREA}.gic` });

    await expect(
      harness.compiler.compile(
        harness.command,
        { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
        "actor-01",
        "tx-02",
      ),
    ).rejects.toMatchObject({ code: "AREA_UPDATE_COMPANION_MISSING", status: 409 });
  });

  it("fails closed when the independently parsed ARE differs from the projected draft", async () => {
    const harness = createHarness({ invalidCandidate: true });

    await expect(
      harness.compiler.compile(
        harness.command,
        { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
        "actor-01",
        "tx-03",
      ),
    ).rejects.toMatchObject({ code: "AREA_UPDATE_CANDIDATE_INVALID", status: 422 });
  });

  it("atomically deletes the same source object ordinal from GIT and GIC", async () => {
    const harness = createHarness({ objectDeletion: true });

    const candidate = await harness.compiler.compile(
      harness.command,
      { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
      "actor-01",
      "tx-object-delete",
    );

    const git = candidate.resources.find((entry) => entry.extension === "git")!;
    const gic = candidate.resources.find((entry) => entry.extension === "gic")!;
    expect(inspectAreaGitGicPair(git.bytes, gic.bytes)).toEqual({
      counts: expect.objectContaining({ creature: 1, item: 0 }),
      total: 1,
    });
    expect(git.sha256).not.toBe(sha256(harness.contents[`${AREA}.git`]));
    expect(gic.sha256).not.toBe(sha256(harness.contents[`${AREA}.gic`]));
    expect(candidate.unchangedCompanions).toBeUndefined();
    expect(candidate.objectMutation).toMatchObject({
      sourceGitSha256: sha256(harness.contents[`${AREA}.git`]),
      sourceGicSha256: sha256(harness.contents[`${AREA}.gic`]),
      candidateGitSha256: git.sha256,
      candidateGicSha256: gic.sha256,
      totalDeleted: 1,
      totalTransformed: 0,
      totalAdded: 0,
      deletedCounts: expect.objectContaining({ item: 1, creature: 0 }),
      transformedCounts: expect.objectContaining({ creature: 0 }),
      addedCounts: expect.objectContaining({ waypoint: 0, creature: 0 }),
      blueprintSources: [],
      sourceCounts: expect.objectContaining({ item: 1, creature: 1 }),
      candidateCounts: expect.objectContaining({ item: 0, creature: 1 }),
    });
  });

  it("constructs a verified waypoint blueprint as an atomic paired GIT/GIC addition", async () => {
    const harness = createHarness({ waypointAddition: true });

    const candidate = await harness.compiler.compile(
      harness.command,
      { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
      "actor-01",
      "tx-waypoint-addition",
    );

    expect(harness.blueprints.resolve).toHaveBeenCalledWith({
      sourceKind: "waypoint",
      sourceProfileId: "nwn-base-key-utw-v1",
      templateResRef: "nw_waypoint001",
      expectedSha256: harness.blueprintSha256,
    });
    const git = candidate.resources.find((entry) => entry.extension === "git")!;
    const gic = candidate.resources.find((entry) => entry.extension === "gic")!;
    expect(inspectAreaGitGicPair(git.bytes, gic.bytes)).toEqual({
      counts: expect.objectContaining({ creature: 1, item: 1, waypoint: 1 }),
      total: 3,
    });
    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 0,
      totalAdded: 1,
      addedCounts: expect.objectContaining({ waypoint: 1, creature: 0 }),
      blueprintSources: [{
        sourceProfileId: "nwn-base-key-utw-v1",
        templateResRef: "nw_waypoint001",
        sourceSha256: harness.blueprintSha256,
        addedCount: 1,
      }],
      sourceCounts: expect.objectContaining({ waypoint: 0 }),
      candidateCounts: expect.objectContaining({ waypoint: 1 }),
    });
    const waypoint = parseRawGffDocument(git.bytes)?.fields
      .find((field) => field.label === "WaypointList");
    expect(waypoint?.type === "list" ? waypoint.value[0]?.fields : []).toEqual(
      expect.arrayContaining([
        { label: "TemplateResRef", type: "resref", value: "nw_waypoint001" },
        { label: "Tag", type: "cexostring", value: "NW_WAYPOINT001" },
        { label: "XPosition", type: "float", value: 35 },
        { label: "YPosition", type: "float", value: 47.5 },
      ]),
    );
  });

  it("constructs a verified creature blueprint as an atomic paired GIT/GIC addition", async () => {
    const harness = createHarness({ waypointAddition: true });
    const blueprintBytes = creatureBlueprintFixture();
    const blueprintSha256 = sha256(blueprintBytes);
    const transform = { x: 1.5, y: 2.25, z: 0.1, bearing: Math.PI / 4 };
    const payload = harness.snapshot.draft.payload as Record<string, any>;
    payload.editableScene.objects = [payload.editableScene.objects[0], newCreatureSceneObject(blueprintSha256, transform)];
    harness.blueprints.resolve.mockResolvedValueOnce({
      sourceKind: "creature",
      sourceProfileId: "nwn-base-key-utc-nw-chicken-v1",
      templateResRef: "nw_chicken",
      sha256: blueprintSha256,
      bytes: blueprintBytes,
    });

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).toHaveBeenCalledWith({
      sourceKind: "creature",
      sourceProfileId: "nwn-base-key-utc-nw-chicken-v1",
      templateResRef: "nw_chicken",
      expectedSha256: blueprintSha256,
    });
    const git = candidate.resources.find((entry) => entry.extension === "git")!;
    const gic = candidate.resources.find((entry) => entry.extension === "gic")!;
    expect(inspectAreaGitGicPair(git.bytes, gic.bytes)).toEqual({
      counts: expect.objectContaining({ creature: 2, item: 0, waypoint: 0 }),
      total: 2,
    });
    expect(candidate.objectMutation).toMatchObject({
      totalAdded: 1,
      addedCounts: expect.objectContaining({ creature: 1, item: 0, waypoint: 0 }),
      blueprintSources: [{
        sourceProfileId: "nwn-base-key-utc-nw-chicken-v1",
        templateResRef: "nw_chicken",
        sourceSha256: blueprintSha256,
        addedCount: 1,
      }],
    });
    const gitCreatures = parseRawGffDocument(git.bytes)?.fields.find((field) => field.label === "Creature List");
    const gicCreatures = parseRawGffDocument(gic.bytes)?.fields.find((field) => field.label === "Creature List");
    expect(gitCreatures?.type === "list" ? gitCreatures.value.at(-1) : undefined).toEqual({
      typeId: 4,
      fields: expectedCreatureGitFields(transform),
    });
    expect(gicCreatures?.type === "list" ? gicCreatures.value.at(-1) : undefined).toEqual({
      typeId: 4,
      fields: [{ label: "Comment", type: "cexostring", value: "" }],
    });
  });

  it("constructs a verified store blueprint as an atomic paired GIT/GIC addition", async () => {
    const harness = createHarness({ waypointAddition: true });
    const blueprintBytes = storeBlueprintFixture();
    const blueprintSha256 = sha256(blueprintBytes);
    const transform = {
      x: 4.291445541381836,
      y: 5.039402770996094,
      z: 0.00000005,
      bearing: Math.PI * 1.5,
    };
    const payload = harness.snapshot.draft.payload as Record<string, any>;
    payload.editableScene.objects = [payload.editableScene.objects[0], newStoreSceneObject(blueprintSha256, transform)];
    harness.blueprints.resolve.mockResolvedValueOnce({
      sourceKind: "store",
      sourceProfileId: "nwn-base-key-utm-x2-merc-dye-v1",
      templateResRef: "x2_merc_dye",
      sha256: blueprintSha256,
      bytes: blueprintBytes,
      dependencies: storeBlueprintDependencyFixtures(),
    });

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).toHaveBeenCalledWith({
      sourceKind: "store",
      sourceProfileId: "nwn-base-key-utm-x2-merc-dye-v1",
      templateResRef: "x2_merc_dye",
      expectedSha256: blueprintSha256,
    });
    const git = candidate.resources.find((entry) => entry.extension === "git")!;
    const gic = candidate.resources.find((entry) => entry.extension === "gic")!;
    expect(inspectAreaGitGicPair(git.bytes, gic.bytes)).toEqual({
      counts: expect.objectContaining({ creature: 1, item: 0, store: 1, waypoint: 0 }),
      total: 2,
    });
    expect(candidate.objectMutation).toMatchObject({
      totalAdded: 1,
      addedCounts: expect.objectContaining({ creature: 0, item: 0, store: 1, waypoint: 0 }),
      blueprintSources: [{
        sourceProfileId: "nwn-base-key-utm-x2-merc-dye-v1",
        templateResRef: "x2_merc_dye",
        sourceSha256: blueprintSha256,
        dependencyCount: 55,
        dependencySetSha256: "301639573ddc3bcdbf894d3c0f39ae79aeb271f7ac1f72b75e45081c14f4e2df",
        addedCount: 1,
      }],
    });
    const gitStores = parseRawGffDocument(git.bytes)?.fields.find((field) => field.label === "StoreList");
    const gicStores = parseRawGffDocument(gic.bytes)?.fields.find((field) => field.label === "StoreList");
    expect(gitStores?.type === "list" ? gitStores.value.at(-1) : undefined).toEqual({
      typeId: 11,
      fields: expectedStoreGitFields(transform),
    });
    expect(gicStores?.type === "list" ? gicStores.value.at(-1) : undefined).toEqual({
      typeId: 11,
      fields: [{ label: "Comment", type: "cexostring", value: "Sample Dye Store" }],
    });
  });

  it("constructs a verified trigger blueprint as an atomic paired GIT/GIC addition", async () => {
    const harness = createHarness({ waypointAddition: true });
    const blueprintBytes = triggerBlueprintFixture();
    const blueprintSha256 = sha256(blueprintBytes);
    const transform = { x: 3.547599411010742, y: 4.491108703613281, z: 0, bearing: 0 };
    const payload = harness.snapshot.draft.payload as Record<string, any>;
    payload.editableScene.objects = [payload.editableScene.objects[0], newTriggerSceneObject(blueprintSha256, transform)];
    harness.blueprints.resolve.mockResolvedValueOnce({
      sourceKind: "trigger",
      sourceProfileId: "nwn-base-key-utt-newgeneric-v1",
      templateResRef: "newgeneric",
      sha256: blueprintSha256,
      bytes: blueprintBytes,
    });

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).toHaveBeenCalledWith({
      sourceKind: "trigger",
      sourceProfileId: "nwn-base-key-utt-newgeneric-v1",
      templateResRef: "newgeneric",
      expectedSha256: blueprintSha256,
    });
    const git = candidate.resources.find((entry) => entry.extension === "git")!;
    const gic = candidate.resources.find((entry) => entry.extension === "gic")!;
    expect(inspectAreaGitGicPair(git.bytes, gic.bytes)).toEqual({
      counts: expect.objectContaining({ creature: 1, store: 0, trigger: 1, waypoint: 0 }),
      total: 2,
    });
    expect(candidate.objectMutation).toMatchObject({
      totalAdded: 1,
      addedCounts: expect.objectContaining({ creature: 0, store: 0, trigger: 1, waypoint: 0 }),
      blueprintSources: [{
        sourceProfileId: "nwn-base-key-utt-newgeneric-v1",
        templateResRef: "newgeneric",
        sourceSha256: blueprintSha256,
        addedCount: 1,
      }],
    });
    const gitTriggers = parseRawGffDocument(git.bytes)?.fields.find((field) => field.label === "TriggerList");
    const gicTriggers = parseRawGffDocument(gic.bytes)?.fields.find((field) => field.label === "TriggerList");
    expect(gitTriggers?.type === "list" ? gitTriggers.value.at(-1) : undefined).toEqual({
      typeId: 1,
      fields: expectedTriggerGitFields(transform),
    });
    expect(gicTriggers?.type === "list" ? gicTriggers.value.at(-1) : undefined).toEqual({
      typeId: 1,
      fields: [{ label: "Comment", type: "cexostring", value: "" }],
    });
  });

  it("constructs a verified encounter blueprint as an atomic paired GIT/GIC addition", async () => {
    const harness = createHarness({ waypointAddition: true });
    const blueprintBytes = encounterBlueprintFixture();
    const blueprintSha256 = sha256(blueprintBytes);
    const transform = { x: 2.241201591491699, y: 4.51970329284668, z: 0, bearing: 0 };
    const payload = harness.snapshot.draft.payload as Record<string, any>;
    payload.editableScene.objects = [payload.editableScene.objects[0], newEncounterSceneObject(blueprintSha256, transform)];
    harness.blueprints.resolve.mockResolvedValueOnce({
      sourceKind: "encounter",
      sourceProfileId: "nwn-base-key-ute-x2-gnoll001-v1",
      templateResRef: "x2_gnoll001",
      sha256: blueprintSha256,
      bytes: blueprintBytes,
    });

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).toHaveBeenCalledWith({
      sourceKind: "encounter",
      sourceProfileId: "nwn-base-key-ute-x2-gnoll001-v1",
      templateResRef: "x2_gnoll001",
      expectedSha256: blueprintSha256,
    });
    const git = candidate.resources.find((entry) => entry.extension === "git")!;
    const gic = candidate.resources.find((entry) => entry.extension === "gic")!;
    expect(inspectAreaGitGicPair(git.bytes, gic.bytes)).toEqual({
      counts: expect.objectContaining({ creature: 1, encounter: 1, trigger: 0, waypoint: 0 }),
      total: 2,
    });
    expect(candidate.objectMutation).toMatchObject({
      totalAdded: 1,
      addedCounts: expect.objectContaining({ creature: 0, encounter: 1, trigger: 0, waypoint: 0 }),
      blueprintSources: [{
        sourceProfileId: "nwn-base-key-ute-x2-gnoll001-v1",
        templateResRef: "x2_gnoll001",
        sourceSha256: blueprintSha256,
        addedCount: 1,
      }],
    });
    const gitEncounters = parseRawGffDocument(git.bytes)?.fields.find((field) => field.label === "Encounter List");
    const gicEncounters = parseRawGffDocument(gic.bytes)?.fields.find((field) => field.label === "Encounter List");
    expect(gitEncounters?.type === "list" ? gitEncounters.value.at(-1) : undefined).toEqual({
      typeId: 7,
      fields: expectedEncounterGitFields(transform),
    });
    expect(gicEncounters?.type === "list" ? gicEncounters.value.at(-1) : undefined).toEqual({
      typeId: 7,
      fields: [],
    });
  });

  it("re-resolves and constructs one exact effective-catalog UTE Encounter", async () => {
    const harness = createHarness({ waypointAddition: true });
    const blueprintBytes = dynamicEncounterBlueprintFixture();
    const sourceSha256 = sha256(blueprintBytes);
    const sourceObjectKey = "modules/current/blueprints/encounters/enc_dynamic.ute";
    const transform = { x: 3.25, y: 4.5, z: 0.125, bearing: 0 };
    const payload = harness.snapshot.draft.payload as Record<string, any>;
    payload.editableScene.objects = [
      payload.editableScene.objects[0],
      newDynamicEncounterSceneObject(
        sourceSha256,
        sourceObjectKey,
        blueprintBytes.length,
        transform,
      ),
    ];
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce({
      kind: "encounter",
      templateId: "enc_enc_dynamic",
      resref: "enc_dynamic",
      sourceObjectKey,
      sha256: sourceSha256,
      bytes: Buffer.from(blueprintBytes),
    });

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
    expect(harness.appearanceCatalog.resolveEffectiveTemplateBlueprint).toHaveBeenCalledWith({
      kind: "encounter",
      templateId: "enc_enc_dynamic",
      sourceObjectKey,
      expectedSha256: sourceSha256,
    });
    const git = candidate.resources.find((entry) => entry.extension === "git")!;
    const gic = candidate.resources.find((entry) => entry.extension === "gic")!;
    const gitEncounters = parseRawGffDocument(git.bytes)?.fields.find(
      (field) => field.label === "Encounter List",
    );
    const gicEncounters = parseRawGffDocument(gic.bytes)?.fields.find(
      (field) => field.label === "Encounter List",
    );
    expect(gitEncounters?.type === "list" ? gitEncounters.value.at(-1) : undefined).toEqual({
      typeId: 7,
      fields: expectedDynamicEncounterGitFields(transform),
    });
    expect(gicEncounters?.type === "list" ? gicEncounters.value.at(-1) : undefined).toEqual({
      typeId: 7,
      fields: [],
    });
    expect(candidate.objectMutation?.blueprintSources).toEqual([expect.objectContaining({
      sourceProfileId: "effective-catalog-ute-encounter-copy-v1",
      templateResRef: "enc_dynamic",
      sourceSha256,
      dependencyCount: 0,
      addedCount: 1,
    })]);
  });

  it("rejects a dynamic Encounter whose resolved byte size differs from draft provenance", async () => {
    const harness = createHarness({ waypointAddition: true });
    const blueprintBytes = dynamicEncounterBlueprintFixture();
    const sourceSha256 = sha256(blueprintBytes);
    const sourceObjectKey = "modules/current/blueprints/encounters/enc_dynamic.ute";
    const payload = harness.snapshot.draft.payload as Record<string, any>;
    payload.editableScene.objects = [
      payload.editableScene.objects[0],
      newDynamicEncounterSceneObject(
        sourceSha256,
        sourceObjectKey,
        blueprintBytes.length + 1,
        { x: 3.25, y: 4.5, z: 0.125, bearing: 0 },
      ),
    ];
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce({
      kind: "encounter",
      templateId: "enc_enc_dynamic",
      resref: "enc_dynamic",
      sourceObjectKey,
      sha256: sourceSha256,
      bytes: Buffer.from(blueprintBytes),
    });

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      status: 422,
    });
    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
  });

  it("fails stale when a dynamic Encounter is no longer the exact effective winner", async () => {
    const harness = createHarness({ waypointAddition: true });
    const blueprintBytes = dynamicEncounterBlueprintFixture();
    const sourceObjectKey = "modules/current/blueprints/encounters/enc_dynamic.ute";
    const payload = harness.snapshot.draft.payload as Record<string, any>;
    payload.editableScene.objects = [
      payload.editableScene.objects[0],
      newDynamicEncounterSceneObject(
        sha256(blueprintBytes),
        sourceObjectKey,
        blueprintBytes.length,
        { x: 3.25, y: 4.5, z: 0.125, bearing: 0 },
      ),
    ];
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce(null);

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
    });
    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
  });

  it("re-resolves and constructs one exact effective-catalog UTW Waypoint", async () => {
    const harness = createHarness({ waypointAddition: true });
    const blueprintBytes = dynamicWaypointBlueprintFixture();
    const sourceSha256 = sha256(blueprintBytes);
    const sourceObjectKey = "modules/current/blueprints/waypoints/wp_dynamic.utw";
    const transform = { x: 5.25, y: 6.5, z: 0.25, bearing: Math.PI / 3 };
    const payload = harness.snapshot.draft.payload as Record<string, any>;
    payload.editableScene.objects = [
      payload.editableScene.objects[0],
      newDynamicWaypointSceneObject(
        sourceSha256,
        sourceObjectKey,
        blueprintBytes.length,
        transform,
      ),
    ];
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce({
      kind: "waypoint",
      templateId: "wpt_wp_dynamic",
      resref: "wp_dynamic",
      sourceObjectKey,
      sha256: sourceSha256,
      bytes: Buffer.from(blueprintBytes),
    });

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
    expect(harness.appearanceCatalog.resolveEffectiveTemplateBlueprint).toHaveBeenCalledWith({
      kind: "waypoint",
      templateId: "wpt_wp_dynamic",
      sourceObjectKey,
      expectedSha256: sourceSha256,
    });
    const git = candidate.resources.find((entry) => entry.extension === "git")!;
    const gic = candidate.resources.find((entry) => entry.extension === "gic")!;
    const gitWaypoints = parseRawGffDocument(git.bytes)?.fields.find(
      (field) => field.label === "WaypointList",
    );
    const gicWaypoints = parseRawGffDocument(gic.bytes)?.fields.find(
      (field) => field.label === "WaypointList",
    );
    expect(gitWaypoints?.type === "list" ? gitWaypoints.value.at(-1) : undefined).toEqual({
      typeId: 5,
      fields: expectedDynamicWaypointGitFields(transform),
    });
    expect(gicWaypoints?.type === "list" ? gicWaypoints.value.at(-1) : undefined).toEqual({
      typeId: 5,
      fields: [{
        label: "Comment", type: "cexostring", value: "Dynamic waypoint palette comment.",
      }],
    });
    expect(candidate.objectMutation?.blueprintSources).toEqual([expect.objectContaining({
      sourceProfileId: "effective-catalog-utw-waypoint-copy-v1",
      templateResRef: "wp_dynamic",
      sourceSha256,
      dependencyCount: 0,
      addedCount: 1,
    })]);
  });

  it("constructs a verified hook-bound door as an atomic paired GIT/GIC addition", async () => {
    const harness = createHarness({ waypointAddition: true });
    const blueprintBytes = doorBlueprintFixture();
    const blueprintSha256 = sha256(blueprintBytes);
    const payload = harness.snapshot.draft.payload as Record<string, any>;
    const state = payload.editableScene.auroraAreaEditing.state;
    state.tilesetFingerprint = "e45bfba6f61442e7618b7477f0967943b6ff74a2c02593da6c031c641b3e6ac4";
    state.tiles[0] = { ...state.tiles[0], tileId: 121, orientation: 0, height: 0 };
    payload.editableScene.objects = [payload.editableScene.objects[0], newDoorSceneObject(blueprintSha256)];
    harness.blueprints.resolve.mockResolvedValueOnce({
      sourceKind: "door",
      sourceProfileId: "nwn-base-key-utd-nw-door-ttr-04-tin01-121-0-v1",
      templateResRef: "nw_door_ttr_04",
      sha256: blueprintSha256,
      bytes: blueprintBytes,
      dependencies: [{
        templateResRef: "tin01",
        resourceType: 2013,
        sha256: state.tilesetFingerprint,
        bytes: Buffer.from("tin01-set"),
      }],
    });
    const candidateTiles = tiles();
    candidateTiles[0] = { ...candidateTiles[0]!, tileId: 121, orientation: 0, height: 0 };
    const candidateBytes = serializeAreaEditingDraftToAreGff({
      areaResRef: AREA,
      name: "Crypt 01",
      width: 2,
      height: 2,
      tilesetResRef: "tin01",
      tiles: candidateTiles,
    });
    harness.areaEditing.exportAre.mockResolvedValueOnce({
      ...harness.exportResult,
      bytes: candidateBytes as typeof harness.exportResult.bytes,
      size: candidateBytes.length,
      tilesetFingerprint: state.tilesetFingerprint,
    });

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).toHaveBeenCalledWith({
      sourceKind: "door",
      sourceProfileId: "nwn-base-key-utd-nw-door-ttr-04-tin01-121-0-v1",
      templateResRef: "nw_door_ttr_04",
      expectedSha256: blueprintSha256,
    });
    const git = candidate.resources.find((entry) => entry.extension === "git")!;
    const gic = candidate.resources.find((entry) => entry.extension === "gic")!;
    expect(inspectAreaGitGicPair(git.bytes, gic.bytes)).toEqual({
      counts: expect.objectContaining({ creature: 1, door: 1, encounter: 0 }),
      total: 2,
    });
    expect(candidate.objectMutation).toMatchObject({
      totalAdded: 1,
      addedCounts: expect.objectContaining({ door: 1 }),
      blueprintSources: [{
        sourceProfileId: "nwn-base-key-utd-nw-door-ttr-04-tin01-121-0-v1",
        templateResRef: "nw_door_ttr_04",
        sourceSha256: blueprintSha256,
        dependencyCount: 1,
        dependencySetSha256: state.tilesetFingerprint,
        addedCount: 1,
      }],
    });
    expect(parseRawGffDocument(git.bytes)?.fields.find((field) => field.label === "Door List"))
      .toMatchObject({ type: "list", value: [{ typeId: 8, fields: expectedDoorGitFields() }] });
    expect(parseRawGffDocument(gic.bytes)?.fields.find((field) => field.label === "Door List"))
      .toMatchObject({ type: "list", value: [{ typeId: 8, fields: [{ label: "Comment", type: "cexostring", value: "Barn 1 Door" }] }] });
  });

  it("resolves one immutable blueprint once when multiple waypoint additions share its provenance", async () => {
    const harness = createHarness({ waypointAddition: true });
    const payload = harness.snapshot.draft.payload as Record<string, any>;
    payload.editableScene.objects.push({
      ...newWaypointSceneObject(),
      id: "wpt_002",
      x: 5,
      y: 6,
    });

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).toHaveBeenCalledTimes(1);
    expect(candidate.objectMutation).toMatchObject({
      totalAdded: 2,
      addedCounts: expect.objectContaining({ waypoint: 2 }),
      blueprintSources: [expect.objectContaining({ addedCount: 2 })],
    });
  });

  it("resolves and reports mixed blueprint families by exact provenance tuple", async () => {
    const harness = createHarness({ waypointAddition: true });
    const soundBytes = soundBlueprint();
    const soundSha256 = sha256(soundBytes);
    const placeableBytes = placeableBlueprintFixture();
    const placeableSha256 = sha256(placeableBytes);
    const itemBytes = itemBlueprintFixture();
    const itemSha256 = sha256(itemBytes);
    const payload = harness.snapshot.draft.payload as Record<string, any>;
    payload.editableScene.objects.push(newSoundSceneObject(soundSha256));
    payload.editableScene.objects.push(newPlaceableSceneObject(placeableSha256));
    payload.editableScene.objects.push(newItemSceneObject(itemSha256));
    harness.blueprints.resolve.mockImplementation(async (request) => request.sourceKind === "item"
      ? {
          sourceKind: "item",
          sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
          templateResRef: "nw_cloth022",
          sha256: itemSha256,
          bytes: Buffer.from(itemBytes),
        }
      : request.sourceKind === "placeable"
      ? {
          sourceKind: "placeable",
          sourceProfileId: "nwn-base-key-utp-plc-watertrough-v1",
          templateResRef: "plc_watertrough",
          sha256: placeableSha256,
          bytes: Buffer.from(placeableBytes),
        }
      : request.sourceKind === "sound" ? {
          sourceKind: "sound",
          sourceProfileId: "nwn-base-key-uts-animalcriesday-v1",
          templateResRef: "animalcriesday",
          sha256: soundSha256,
          bytes: Buffer.from(soundBytes),
        }
      : {
          sourceKind: "waypoint",
          sourceProfileId: "nwn-base-key-utw-v1",
          templateResRef: "nw_waypoint001",
          sha256: harness.blueprintSha256,
          bytes: waypointBlueprint(),
        });

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).toHaveBeenCalledTimes(4);
    const objectMutation = candidate.objectMutation!;
    expect(objectMutation.totalAdded).toBe(4);
    expect(objectMutation.addedCounts).toEqual(expect.objectContaining({ item: 1, placeable: 1, sound: 1, waypoint: 1 }));
    expect(objectMutation.blueprintSources).toEqual([
        {
          sourceProfileId: "nwn-base-key-utw-v1",
          templateResRef: "nw_waypoint001",
          sourceSha256: harness.blueprintSha256,
          addedCount: 1,
        },
        {
          sourceProfileId: "nwn-base-key-uts-animalcriesday-v1",
          templateResRef: "animalcriesday",
          sourceSha256: soundSha256,
          addedCount: 1,
        },
        {
          sourceProfileId: "nwn-base-key-utp-plc-watertrough-v1",
          templateResRef: "plc_watertrough",
          sourceSha256: placeableSha256,
          addedCount: 1,
        },
        {
          sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
          templateResRef: "nw_cloth022",
          sourceSha256: itemSha256,
          addedCount: 1,
        },
      ]);
  });

  it("re-resolves one dynamic catalog UTP and copies its direct PortraitId into the paired Area", async () => {
    const harness = createHarness({ waypointAddition: true });
    const blueprintBytes = dynamicPlaceableBlueprintWithPortraitId(15157);
    const sourceSha256 = sha256(blueprintBytes);
    const sourceObjectKey =
      "modules/current/__aurora/sources/vanilla/templates/plc_watertrough.utp";
    replaceNewBlueprintObject(
      harness.snapshot,
      newDynamicPlaceableSceneObject(sourceSha256, sourceObjectKey),
    );
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce({
      kind: "placeable",
      templateId: "plc_plc_watertrough",
      resref: "plc_watertrough",
      sourceObjectKey,
      sha256: sourceSha256,
      bytes: Buffer.from(blueprintBytes),
    });

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
    expect(harness.appearanceCatalog.resolveEffectiveTemplateBlueprint).toHaveBeenCalledWith({
      kind: "placeable",
      templateId: "plc_plc_watertrough",
      sourceObjectKey,
      expectedSha256: sourceSha256,
    });
    expect(harness.appearanceCatalog.resolveEffectivePortraitsTwoDaTable).not.toHaveBeenCalled();
    expect(candidate.objectMutation?.blueprintSources).toEqual([{
      sourceProfileId: "effective-catalog-utp-placeable-copy-v1",
      templateResRef: "plc_watertrough",
      sourceSha256,
      addedCount: 1,
    }]);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const placeable = (parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Placeable List",
    ) as Extract<SupportedGffField, { type: "list" }>).value.at(-1)!;
    expect(placeable.fields).toEqual(expect.arrayContaining([
      { label: "Tag", type: "cexostring", value: "Water Trough" },
      { label: "TemplateResRef", type: "resref", value: "plc_watertrough" },
      { label: "PortraitId", type: "word", value: 15157 },
    ]));
  });

  it("re-resolves one dynamic catalog UTI and derives its appearance profile from effective baseitems.2da", async () => {
    const harness = createHarness({ waypointAddition: true });
    const blueprintBytes = itemBlueprintFixture();
    const sourceSha256 = sha256(blueprintBytes);
    const sourceObjectKey =
      "modules/current/__aurora/sources/vanilla/templates/nw_cloth022.uti";
    replaceNewBlueprintObject(
      harness.snapshot,
      newDynamicItemSceneObject(
        sourceSha256,
        sourceObjectKey,
        blueprintBytes.length,
      ),
    );
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce({
      kind: "item",
      templateId: "itm_nw_cloth022",
      resref: "nw_cloth022",
      sourceObjectKey,
      sha256: sourceSha256,
      bytes: Buffer.from(blueprintBytes),
    });

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
    expect(harness.appearanceCatalog.resolveEffectiveTemplateBlueprint).toHaveBeenCalledWith({
      kind: "item",
      templateId: "itm_nw_cloth022",
      sourceObjectKey,
      expectedSha256: sourceSha256,
    });
    expect(harness.appearanceCatalog.resolveEffectiveItemBaseItemsTwoDaTable)
      .toHaveBeenCalledTimes(1);
    expect(candidate.objectMutation?.blueprintSources).toEqual([{
      sourceProfileId: "effective-catalog-uti-item-copy-v1",
      templateResRef: "nw_cloth022",
      sourceSha256,
      addedCount: 1,
    }]);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const item = (parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "List",
    ) as Extract<SupportedGffField, { type: "list" }>).value.at(-1)!;
    expect(item.fields).toEqual(expect.arrayContaining([
      { label: "TemplateResRef", type: "resref", value: "nw_cloth022" },
      { label: "Tag", type: "cexostring", value: "NW_CLOTH022" },
      { label: "BaseItem", type: "int", value: 16 },
      { label: "ArmorPart_Torso", type: "word", value: 39 },
      { label: "Leather1Color", type: "byte", value: 11 },
    ]));
    expect(harness.dynamicItemTelemetry.emit.mock.calls.map(([event]) => event.operation))
      .toEqual([
        "resolve_blueprint",
        "validate_identity",
        "parse_source",
        "resolve_baseitems",
        "admit_profile",
        "write",
        "readback",
      ]);
    expect(harness.dynamicItemTelemetry.emit).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "area_dynamic_item_blueprint_copy.v1",
      operation: "readback",
      outcome: "succeeded",
      resultCode: "readback_verified",
      modelType: 3,
      propertyCount: 0,
      variableCount: 0,
      nestedInventoryState: "absent",
      durationMs: expect.any(Number),
    }));
  });

  it("re-resolves one dynamic catalog UTM and expands its effective UTI inventory", async () => {
    const harness = createHarness({ waypointAddition: true });
    const itemBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "itm_store_child" },
      { label: "Tag", type: "cexostring", value: "ITM_STORE_CHILD" },
      { label: "BaseItem", type: "int", value: 22 },
    ], "UTI ", 0xffffffff);
    const storeBytes = dynamicStoreBlueprintFixture();
    const sourceSha256 = sha256(storeBytes);
    const sourceObjectKey =
      "modules/current/__aurora/sources/vanilla/templates/str_dynamic.utm";
    replaceNewBlueprintObject(
      harness.snapshot,
      newDynamicStoreSceneObject(sourceSha256, sourceObjectKey, storeBytes.length),
    );
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce({
      kind: "store",
      templateId: "str_str_dynamic",
      resref: "str_dynamic",
      sourceObjectKey,
      sha256: sourceSha256,
      bytes: Buffer.from(storeBytes),
      dependencies: [{
        templateResRef: "itm_store_child",
        resourceType: 2025,
        sha256: sha256(itemBytes),
        bytes: itemBytes,
      }],
    });

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
    expect(harness.appearanceCatalog.resolveEffectiveTemplateBlueprint).toHaveBeenCalledWith({
      kind: "store",
      templateId: "str_str_dynamic",
      sourceObjectKey,
      expectedSha256: sourceSha256,
    });
    expect(harness.appearanceCatalog.resolveEffectiveItemBaseItemsTwoDaTable)
      .toHaveBeenCalledTimes(1);
    expect(candidate.objectMutation?.blueprintSources).toEqual([expect.objectContaining({
      sourceProfileId: "effective-catalog-utm-store-copy-v1",
      templateResRef: "str_dynamic",
      sourceSha256,
      dependencyCount: 1,
      addedCount: 1,
    })]);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const store = (parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "StoreList",
    ) as Extract<SupportedGffField, { type: "list" }>).value.at(-1)!;
    const repositories = store.fields.find(
      (field) => field.label === "StoreList",
    ) as Extract<SupportedGffField, { type: "list" }>;
    const itemList = repositories.value[0]!.fields[0] as
      Extract<SupportedGffField, { type: "list" }>;
    expect(store.fields).toEqual(expect.arrayContaining([
      { label: "ResRef", type: "resref", value: "str_dynamic" },
      { label: "Tag", type: "cexostring", value: "Dynamic_Store" },
    ]));
    expect(itemList.value[0]!.fields).toEqual(expect.arrayContaining([
      { label: "TemplateResRef", type: "resref", value: "itm_store_child" },
      { label: "BaseItem", type: "int", value: 22 },
      { label: "Repos_PosX", type: "word", value: 1 },
      { label: "Repos_Posy", type: "word", value: 2 },
    ]));
  });

  it("re-resolves and embeds one dynamic catalog UTI into an absent retained ground-Item ItemList", async () => {
    const harness = createHarness({ itemTransform: true });
    const blueprintBytes = itemBlueprintFixture();
    const sourceSha256 = sha256(blueprintBytes);
    const sourceObjectKey =
      "modules/current/__aurora/sources/vanilla/templates/nw_cloth022.uti";
    const payload = (harness.snapshot.draft.payload as Record<string, any>);
    const item = payload.editableScene.objects.find(
      (candidate: Record<string, unknown>) => candidate.kind === "items",
    );
    item.source.sourceIndex = 0;
    item.source.itemInventoryItems = [];
    item.itemProperties = {
      inventoryItems: [{
        resRef: "nw_cloth022",
        itemTemplateId: "itm_nw_cloth022",
        itemResRef: "nw_cloth022",
        itemSourceProfileId: "effective-catalog-uti-item-copy-v1",
        itemSourceObjectKey: sourceObjectKey,
        itemSourceSizeBytes: blueprintBytes.length,
        itemSourceFingerprint: sourceSha256,
        itemTag: "NW_CLOTH022",
        x: 7,
        y: 8,
      }],
    };
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce({
      kind: "item",
      templateId: "itm_nw_cloth022",
      resref: "nw_cloth022",
      sourceObjectKey,
      sha256: sourceSha256,
      bytes: Buffer.from(blueprintBytes),
    });

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveEffectiveTemplateBlueprint).toHaveBeenCalledWith({
      kind: "item",
      templateId: "itm_nw_cloth022",
      sourceObjectKey,
      expectedSha256: sourceSha256,
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const parent = (parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "List",
    ) as Extract<SupportedGffField, { type: "list" }>).value[0]!;
    const itemList = parent.fields.find(
      (field): field is Extract<SupportedGffField, { type: "list" }> =>
        field.label === "ItemList" && field.type === "list",
    );
    expect(itemList?.value).toHaveLength(1);
    expect(itemList?.value[0]).toMatchObject({
      typeId: 0,
      fields: expect.arrayContaining([
        { label: "TemplateResRef", type: "resref", value: "nw_cloth022" },
        { label: "Repos_PosX", type: "word", value: 7 },
        { label: "Repos_Posy", type: "word", value: 8 },
        { label: "XPosition", type: "float", value: -1 },
        { label: "YOrientation", type: "float", value: 1 },
      ]),
    });
    expect(candidate.resources.find((resource) => resource.extension === "gic")!.bytes)
      .toEqual(harness.contents[`${AREA}.gic`]);
    expect(harness.dynamicItemTelemetry.emit).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "area_dynamic_item_blueprint_copy.v1",
      operation: "readback",
      outcome: "succeeded",
      resultCode: "readback_verified",
    }));
  });

  it("does not let a dynamic Item telemetry sink failure change compilation", async () => {
    const harness = createHarness({ waypointAddition: true });
    const blueprintBytes = itemBlueprintFixture();
    const sourceSha256 = sha256(blueprintBytes);
    const sourceObjectKey =
      "modules/current/__aurora/sources/vanilla/templates/nw_cloth022.uti";
    replaceNewBlueprintObject(
      harness.snapshot,
      newDynamicItemSceneObject(sourceSha256, sourceObjectKey, blueprintBytes.length),
    );
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce({
      kind: "item",
      templateId: "itm_nw_cloth022",
      resref: "nw_cloth022",
      sourceObjectKey,
      sha256: sourceSha256,
      bytes: Buffer.from(blueprintBytes),
    });
    harness.dynamicItemTelemetry.emit.mockImplementation(() => {
      throw new Error("telemetry unavailable");
    });

    await expect(compile(harness)).resolves.toMatchObject({
      objectMutation: {
        addedCounts: expect.objectContaining({ item: 1 }),
      },
    });
  });

  it("rejects a dynamic catalog UTI whose resolved byte size differs from draft provenance", async () => {
    const harness = createHarness({ waypointAddition: true });
    const blueprintBytes = itemBlueprintFixture();
    const sourceSha256 = sha256(blueprintBytes);
    const sourceObjectKey =
      "modules/current/__aurora/sources/vanilla/templates/nw_cloth022.uti";
    replaceNewBlueprintObject(
      harness.snapshot,
      newDynamicItemSceneObject(sourceSha256, sourceObjectKey, blueprintBytes.length + 1),
    );
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce({
      kind: "item",
      templateId: "itm_nw_cloth022",
      resref: "nw_cloth022",
      sourceObjectKey,
      sha256: sourceSha256,
      bytes: Buffer.from(blueprintBytes),
    });

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      status: 422,
    });
  });

  it("fails stale when a dynamic catalog UTI is no longer the exact effective winner", async () => {
    const harness = createHarness({ waypointAddition: true });
    const blueprintBytes = itemBlueprintFixture();
    const sourceObjectKey =
      "modules/current/__aurora/sources/vanilla/templates/nw_cloth022.uti";
    replaceNewBlueprintObject(
      harness.snapshot,
      newDynamicItemSceneObject(
        sha256(blueprintBytes),
        sourceObjectKey,
        blueprintBytes.length,
      ),
    );
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce(null);

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
    });
    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
  });

  it("fails stale when a dynamic catalog UTI BaseItem row is outside the effective table", async () => {
    const harness = createHarness({ waypointAddition: true });
    const sourceDocument = parseRawGffDocument(itemBlueprintFixture())!;
    const blueprintBytes = buildGffBuffer(
      sourceDocument.fields.map((field) =>
        field.label === "BaseItem"
          ? { label: "BaseItem", type: "int", value: 999 }
          : field),
      "UTI ",
      0xffffffff,
    );
    const sourceSha256 = sha256(blueprintBytes);
    const sourceObjectKey =
      "modules/current/__aurora/sources/vanilla/templates/nw_cloth022.uti";
    replaceNewBlueprintObject(
      harness.snapshot,
      newDynamicItemSceneObject(sourceSha256, sourceObjectKey, blueprintBytes.length),
    );
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce({
      kind: "item",
      templateId: "itm_nw_cloth022",
      resref: "nw_cloth022",
      sourceObjectKey,
      sha256: sourceSha256,
      bytes: Buffer.from(blueprintBytes),
    });

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
    });
  });

  it("derives dependency ModelTypes and expands a dynamic UTI ItemList closure", async () => {
    const harness = createHarness({ waypointAddition: true });
    const sourceDocument = parseRawGffDocument(itemBlueprintFixture())!;
    const blueprintBytes = buildGffBuffer([
      ...sourceDocument.fields,
      {
        label: "ItemList",
        type: "list",
        value: [{
          typeId: 0,
          fields: [
            { label: "InventoryRes", type: "resref", value: "nested_child" },
            { label: "Repos_PosX", type: "word", value: 3 },
            { label: "Repos_Posy", type: "word", value: 4 },
          ],
        }],
      },
    ], "UTI ", 0xffffffff);
    const dependencyBytes = buildGffBuffer(sourceDocument.fields.map((field) =>
      field.label === "TemplateResRef"
        ? { label: "TemplateResRef", type: "resref", value: "nested_child" }
        : field.label === "Tag"
          ? { label: "Tag", type: "cexostring", value: "NESTED_CHILD" }
          : field), "UTI ", 0xffffffff);
    const sourceSha256 = sha256(blueprintBytes);
    const sourceObjectKey =
      "modules/current/__aurora/sources/vanilla/templates/nw_cloth022.uti";
    replaceNewBlueprintObject(
      harness.snapshot,
      newDynamicItemSceneObject(sourceSha256, sourceObjectKey, blueprintBytes.length),
    );
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce({
      kind: "item",
      templateId: "itm_nw_cloth022",
      resref: "nw_cloth022",
      sourceObjectKey,
      sha256: sourceSha256,
      bytes: Buffer.from(blueprintBytes),
      dependencies: [{
        templateResRef: "nested_child",
        resourceType: 2025,
        sha256: sha256(dependencyBytes),
        bytes: Buffer.from(dependencyBytes),
      }],
    });

    const candidate = await compile(harness);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const item = (parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "List",
    ) as Extract<SupportedGffField, { type: "list" }>).value.at(-1)!;
    const itemList = item.fields.find((field) => field.label === "ItemList");
    expect(itemList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        typeId: 0,
        fields: expect.arrayContaining([
          { label: "TemplateResRef", type: "resref", value: "nested_child" },
          { label: "BaseItem", type: "int", value: 16 },
          { label: "ArmorPart_Torso", type: "word", value: 39 },
          { label: "Repos_PosX", type: "word", value: 3 },
          { label: "Repos_Posy", type: "word", value: 4 },
        ]),
      })],
    });
    expect(harness.appearanceCatalog.resolveEffectiveItemBaseItemsTwoDaTable)
      .toHaveBeenCalledTimes(1);
    expect(harness.dynamicItemTelemetry.emit).toHaveBeenCalledWith(expect.objectContaining({
      operation: "readback",
      outcome: "succeeded",
      nestedInventoryState: "expanded",
    }));
  });

  it("carries an effective UTI dependency closure into a dynamic plc_fenbush ItemList", async () => {
    const harness = createHarness({ waypointAddition: true });
    const blueprintBytes = dynamicPlaceableInventoryBlueprintFixture();
    const dependencyBytes = dynamicPlaceableMiscItemBlueprintFixture();
    const sourceSha256 = sha256(blueprintBytes);
    const sourceObjectKey =
      "modules/current/__aurora/sources/vanilla/templates/plc_fenbush.utp";
    const sceneObject = newDynamicPlaceableSceneObject(sourceSha256, sourceObjectKey);
    replaceNewBlueprintObject(harness.snapshot, {
      ...sceneObject,
      resRef: "plc_fenbush",
      tag: "Fern Bush",
      source: {
        ...sceneObject.source,
        templateId: "plc_plc_fenbush",
        templateResRef: "plc_fenbush",
      },
    });
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce({
      kind: "placeable",
      templateId: "plc_plc_fenbush",
      resref: "plc_fenbush",
      sourceObjectKey,
      sha256: sourceSha256,
      bytes: Buffer.from(blueprintBytes),
      dependencies: [{
        templateResRef: "nw_it_msmlmisc12",
        resourceType: 2025,
        sha256: sha256(dependencyBytes),
        bytes: Buffer.from(dependencyBytes),
      }],
    });

    const candidate = await compile(harness);

    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const placeable = (parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Placeable List",
    ) as Extract<SupportedGffField, { type: "list" }>).value.at(-1)!;
    const itemList = placeable.fields.find(
      (field): field is Extract<SupportedGffField, { type: "list" }> =>
        field.label === "ItemList" && field.type === "list",
    );
    expect(itemList?.value).toHaveLength(1);
    expect(itemList?.value[0]).toEqual(expect.objectContaining({
      typeId: 0,
      fields: expect.arrayContaining([
        { label: "TemplateResRef", type: "resref", value: "nw_it_msmlmisc12" },
        { label: "Cursed", type: "byte", value: 0 },
        { label: "Repos_PosX", type: "word", value: 0 },
        { label: "Repos_Posy", type: "word", value: 0 },
      ]),
    }));
  });

  it("converts a dynamic legacy UTP Portrait ResRef through one exact effective portraits.2da row", async () => {
    const harness = createHarness({ waypointAddition: true });
    const blueprintBytes = placeableBlueprintFixture();
    const sourceSha256 = sha256(blueprintBytes);
    const sourceObjectKey =
      "modules/current/__aurora/sources/vanilla/templates/plc_watertrough.utp";
    replaceNewBlueprintObject(
      harness.snapshot,
      newDynamicPlaceableSceneObject(sourceSha256, sourceObjectKey),
    );
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce({
      kind: "placeable",
      templateId: "plc_plc_watertrough",
      resref: "plc_watertrough",
      sourceObjectKey,
      sha256: sourceSha256,
      bytes: Buffer.from(blueprintBytes),
    });
    harness.appearanceCatalog.resolveEffectivePortraitsTwoDaTable.mockResolvedValueOnce({
      descriptor: {
        ...effectivePortraitsTable().descriptor,
        rowCount: 16_001,
      },
      rows: [{ rowIndex: 462, baseResRef: "plc_n02_" }],
    });

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveEffectivePortraitsTwoDaTable).toHaveBeenCalledTimes(1);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const placeable = (parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Placeable List",
    ) as Extract<SupportedGffField, { type: "list" }>).value.at(-1)!;
    expect(placeable.fields).toContainEqual({ label: "PortraitId", type: "word", value: 462 });
  });

  it.each([
    ["missing", dynamicPlaceableBlueprintWithoutPortraitIdentity()],
    ["ambiguous", dynamicPlaceableBlueprintWithBothPortraitIdentities()],
    ["wrongly typed", dynamicPlaceableBlueprintWithWrongPortraitIdType()],
  ])("rejects a dynamic UTP with %s portrait identity", async (_label, blueprintBytes) => {
    const harness = createHarness({ waypointAddition: true });
    const sourceSha256 = sha256(blueprintBytes);
    const sourceObjectKey =
      "modules/current/__aurora/sources/vanilla/templates/plc_watertrough.utp";
    replaceNewBlueprintObject(
      harness.snapshot,
      newDynamicPlaceableSceneObject(sourceSha256, sourceObjectKey),
    );
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce({
      kind: "placeable",
      templateId: "plc_plc_watertrough",
      resref: "plc_watertrough",
      sourceObjectKey,
      sha256: sourceSha256,
      bytes: Buffer.from(blueprintBytes),
    });

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      status: 422,
    });
  });

  it("rejects a legacy Portrait ResRef without one unique physical portraits.2da row", async () => {
    const harness = createHarness({ waypointAddition: true });
    const blueprintBytes = placeableBlueprintFixture();
    const sourceSha256 = sha256(blueprintBytes);
    const sourceObjectKey =
      "modules/current/__aurora/sources/vanilla/templates/plc_watertrough.utp";
    replaceNewBlueprintObject(
      harness.snapshot,
      newDynamicPlaceableSceneObject(sourceSha256, sourceObjectKey),
    );
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce({
      kind: "placeable",
      templateId: "plc_plc_watertrough",
      resref: "plc_watertrough",
      sourceObjectKey,
      sha256: sourceSha256,
      bytes: Buffer.from(blueprintBytes),
    });
    harness.appearanceCatalog.resolveEffectivePortraitsTwoDaTable.mockResolvedValueOnce({
      descriptor: {
        ...effectivePortraitsTable().descriptor,
        rowCount: 16_001,
      },
      rows: [
        { rowIndex: 462, baseResRef: "plc_n02_" },
        { rowIndex: 10_462, baseResRef: "plc_n02_" },
      ],
    });

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      status: 422,
    });
  });

  it("fails stale when a dynamic catalog UTP is no longer the exact effective winner", async () => {
    const harness = createHarness({ waypointAddition: true });
    const blueprintBytes = placeableBlueprintFixture();
    replaceNewBlueprintObject(
      harness.snapshot,
      newDynamicPlaceableSceneObject(
        sha256(blueprintBytes),
        "modules/current/__aurora/sources/vanilla/templates/plc_watertrough.utp",
      ),
    );
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce(null);

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
    });
    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
  });

  it.each([
    [
      "invalid source",
      new AreaObjectBlueprintSourceError(
        "AREA_OBJECT_BLUEPRINT_SOURCE_INVALID",
        "invalid blueprint",
        ["invalid_source"],
      ),
      "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      422,
    ],
    [
      "unavailable source",
      new AreaObjectBlueprintSourceError(
        "AREA_OBJECT_BLUEPRINT_SOURCE_UNAVAILABLE",
        "unavailable blueprint",
        ["source_unavailable"],
      ),
      "AREA_UPDATE_STORAGE_UNAVAILABLE",
      503,
    ],
  ])("maps %s failures without exposing source internals", async (_label, error, code, status) => {
    const harness = createHarness({ waypointAddition: true });
    harness.blueprints.resolve.mockRejectedValueOnce(error);

    await expect(compile(harness)).rejects.toMatchObject({
      code,
      status,
      message: error.message,
      details: error.diagnostics,
    });
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it.each([
    ["source kind", { sourceKind: "sound" as const }],
    ["profile", { sourceProfileId: "other-profile" }],
    ["template", { templateResRef: "nw_waypoint002" }],
    ["digest", { sha256: "f".repeat(64) }],
  ])("rejects a resolved waypoint blueprint with mismatched %s identity", async (_label, patch) => {
    const harness = createHarness({ waypointAddition: true });
    harness.blueprints.resolve.mockResolvedValueOnce({
      sourceKind: "waypoint",
      sourceProfileId: "nwn-base-key-utw-v1",
      templateResRef: "nw_waypoint001",
      sha256: harness.blueprintSha256,
      bytes: waypointBlueprint(),
      ...patch,
    });

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      status: 422,
      message: "Resolved waypoint blueprint identity differs from the retained draft provenance.",
      details: ["resolved_identity_mismatch"],
    });
  });

  it("rejects object mutation provenance bound to another exact GIT", async () => {
    const harness = createHarness({ objectDeletion: true, staleGitProvenance: true });

    const failure = await captureCompileFailure(harness);
    expect(failure).toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
      details: [
        `expected=${"f".repeat(64)}`,
        `actual=${sha256(harness.contents[`${AREA}.git`])}`,
      ],
    });
    expect(failure.message).toBe("The source GIT changed after the draft was opened.");
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it("rejects a snapshot head that changed after the module state was captured", async () => {
    const harness = createHarness();

    await expect(
      harness.compiler.compile(
        harness.command,
        { moduleId: MODULE_ID, revision: "f".repeat(64), quarantined: false },
        "actor-01",
        "tx-04",
      ),
    ).rejects.toMatchObject({ code: "AREA_UPDATE_STORAGE_UNAVAILABLE", status: 503 });
    expect(harness.drafts.read).not.toHaveBeenCalled();
  });

  it("rejects every unavailable or quarantined captured-head identity", async () => {
    const headVariants = [
      (_head: ReturnType<typeof createHarness>["head"]) => null,
      (head: ReturnType<typeof createHarness>["head"]) => ({ ...head, moduleId: "workspace:other" }),
      (head: ReturnType<typeof createHarness>["head"]) => ({ ...head, revision: "f".repeat(64) }),
      (head: ReturnType<typeof createHarness>["head"]) => ({ ...head, quarantined: true }),
    ];

    for (const headVariant of headVariants) {
      const harness = createHarness();
      harness.repository.readHead.mockResolvedValueOnce(headVariant(harness.head));

      await expect(compile(harness)).rejects.toEqual(expect.objectContaining({
        code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
        status: 503,
        message: "The captured module snapshot is unavailable, stale, or quarantined.",
        details: [],
      }));
      expect(harness.repository.readManifest).not.toHaveBeenCalled();
    }

    for (const moduleState of [
      { moduleId: "workspace:other", revision: createHarness().revision, quarantined: false },
      { moduleId: MODULE_ID, revision: createHarness().revision, quarantined: true },
    ]) {
      const harness = createHarness();
      await expect(compile(harness, moduleState)).rejects.toMatchObject({
        code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
        message: "The captured module snapshot is unavailable, stale, or quarantined.",
      });
      expect(harness.repository.readManifest).not.toHaveBeenCalled();
    }
  });

  it("distinguishes a missing manifest from an invalid retained manifest", async () => {
    const missing = createHarness();
    missing.repository.readManifest.mockResolvedValueOnce(null);
    await expect(compile(missing)).rejects.toMatchObject({
      code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
      status: 503,
      message: "The captured module snapshot manifest is missing.",
      details: [],
    });

    const invalid = createHarness();
    invalid.repository.readManifest.mockResolvedValueOnce({
      ...invalid.manifest,
      revision: "f".repeat(64),
    });
    const failure = await captureCompileFailure(invalid);
    expect(failure).toMatchObject({
      code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
      status: 503,
      details: [
        "AREA_SNAPSHOT_MANIFEST_INVALID: Module snapshot manifest revision does not match its canonical content.",
      ],
    });
    expect(failure.message).toBe("The captured module snapshot manifest is invalid.");
  });

  it("requires the retained manifest identity to match every captured-head field", async () => {
    const foreign = createHarness();
    const foreignManifest = createModuleSnapshotManifest({
      moduleId: "workspace:foreign",
      parentRevision: foreign.manifest.parentRevision,
      objects: foreign.manifest.objects,
    });
    foreign.repository.readHead.mockResolvedValueOnce({
      ...foreign.head,
      revision: foreignManifest.revision,
      manifestKey: buildModuleSnapshotManifestKey(foreignManifest),
      manifestSha256: hashModuleSnapshotManifest(foreignManifest),
    });
    foreign.repository.readManifest.mockResolvedValueOnce(foreignManifest);
    await expect(compile(foreign, {
      moduleId: MODULE_ID,
      revision: foreignManifest.revision,
      quarantined: false,
    })).rejects.toMatchObject({
      message: "The captured module head and manifest identities differ.",
    });

    const revisionMismatch = createHarness();
    revisionMismatch.repository.readHead.mockResolvedValueOnce({
      ...revisionMismatch.head,
      revision: "f".repeat(64),
    });
    await expect(compile(revisionMismatch, {
      moduleId: MODULE_ID,
      revision: "f".repeat(64),
      quarantined: false,
    })).rejects.toMatchObject({
      message: "The captured module head and manifest identities differ.",
    });

    const keyMismatch = createHarness();
    keyMismatch.repository.readHead.mockResolvedValueOnce({
      ...keyMismatch.head,
      manifestKey: `${keyMismatch.head.manifestKey}.wrong`,
    });
    await expect(compile(keyMismatch)).rejects.toMatchObject({
      message: "The captured module head and manifest identities differ.",
    });

    const hashMismatch = createHarness();
    hashMismatch.repository.readHead.mockResolvedValueOnce({
      ...hashMismatch.head,
      manifestSha256: "f".repeat(64),
    });
    await expect(compile(hashMismatch)).rejects.toMatchObject({
      code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
      status: 503,
      message: "The captured module head and manifest identities differ.",
      details: [],
    });
  });

  it("maps retained-draft repository failures without losing their boundary meaning", async () => {
    const cases = [
      {
        error: new AreaDraftRepositoryError("AREA_DRAFT_NOT_FOUND", "missing"),
        code: "AREA_UPDATE_DRAFT_NOT_FOUND",
        status: 404,
        message: "The requested retained draft revision was not found.",
        details: [],
      },
      {
        error: new AreaDraftRepositoryError("AREA_DRAFT_REVISION_CONFLICT", "stale"),
        code: "AREA_UPDATE_DRAFT_REVISION_CONFLICT",
        status: 412,
        message: "The requested retained draft revision is stale.",
        details: [],
      },
      {
        error: new AreaDraftRepositoryError("AREA_DRAFT_STORAGE_UNAVAILABLE", "offline"),
        code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
        status: 503,
        message: "Area draft storage is unavailable.",
        details: ["AREA_DRAFT_STORAGE_UNAVAILABLE: offline"],
      },
      {
        error: "draft transport unavailable",
        code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
        status: 503,
        message: "Area draft storage is unavailable.",
        details: ["draft transport unavailable"],
      },
    ] as const;

    for (const expected of cases) {
      const harness = createHarness();
      harness.drafts.read.mockRejectedValueOnce(expected.error);
      const failure = await captureCompileFailure(harness);
      expect(failure).toMatchObject({
        code: expected.code,
        status: expected.status,
        details: expected.details,
      });
      expect(failure.message).toBe(expected.message);
      expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
    }
  });

  it("maps draft projection diagnostics to an immutable invalid-update failure", async () => {
    const harness = createHarness();
    harness.drafts.read.mockResolvedValueOnce({
      ...harness.snapshot,
      draftId: "another-draft",
    });

    let failure: unknown;
    try {
      await compile(harness);
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({
      code: "AREA_UPDATE_INVALID",
      status: 422,
      message: "draft.id: Draft ID does not match the command.",
      details: ["draft.id"],
    });
    expect(Object.isFrozen((failure as AreaUpdateCompilerFailure).details)).toBe(true);
  });

  it("distinguishes a missing source ARE from every missing companion combination", async () => {
    const missingAre = createHarness({ omit: `${AREA}.are` });
    const sourceFailure = await captureCompileFailure(missingAre);
    expect(sourceFailure).toMatchObject({
      code: "AREA_UPDATE_SOURCE_MISSING",
      status: 404,
      details: [],
    });
    expect(sourceFailure.message).toBe(
      "The source ARE is missing from the captured module snapshot.",
    );

    for (const expectedMissing of [
      [`${AREA}.git`],
      [`${AREA}.gic`],
      ["module.ifo"],
    ]) {
      const harness = createHarness({ omit: expectedMissing[0] });
      const failure = await captureCompileFailure(harness);
      expect(failure).toMatchObject({
        code: "AREA_UPDATE_COMPANION_MISSING",
        status: 409,
        details: expectedMissing,
      });
      expect(failure.message).toBe(
        "The Area GIT/GIC or module IFO companion is missing.",
      );
    }
  });

  it("rejects each canonical Area resource under the wrong native resource type", async () => {
    for (const [logicalKey, extension] of [
      [`${AREA}.are`, "ARE"],
      [`${AREA}.git`, "GIT"],
      [`${AREA}.gic`, "GIC"],
    ] as const) {
      const harness = createHarness({
        resourceTypeOverrides: { [logicalKey]: 9999 },
      });
      const failure = await captureCompileFailure(harness);
      expect(failure).toMatchObject({
        code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
        status: 503,
        details: [],
      });
      expect(failure.message).toBe(
        `The ${extension} snapshot resource type is invalid.`,
      );
      expect(harness.repository.readContent).not.toHaveBeenCalled();
    }
  });

  it("requires every content-addressed source field and byte hash to read back exactly", async () => {
    const corruptions: readonly ((record: ModuleSnapshotContentRecord) => ModuleSnapshotContentRecord | null)[] = [
      () => null,
      (record) => ({ ...record, contentKey: `${record.contentKey}.wrong` }),
      (record) => ({ ...record, size: record.size + 1 }),
      (record) => ({ ...record, bytes: record.bytes.subarray(1) }),
      (record) => ({ ...record, sha256: "f".repeat(64) }),
      (record) => ({
        ...record,
        bytes: Buffer.from(record.bytes.map((value, index) => index === 0 ? value ^ 0xff : value)),
      }),
    ];

    for (const corrupt of corruptions) {
      const harness = createHarness();
      const descriptor = harness.manifest.objects.find(
        (entry) => entry.logicalKey === `${AREA}.are`,
      )!;
      const record = harness.contentRecords.get(descriptor.contentKey)!;
      harness.repository.readContent.mockResolvedValueOnce(corrupt(record));

      const failure = await captureCompileFailure(harness);
      expect(failure).toMatchObject({
        code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
        status: 503,
        details: [],
      });
      expect(failure.message).toBe(
        `Snapshot content failed exact readback for ${AREA}.are.`,
      );
      expect(harness.drafts.read).not.toHaveBeenCalled();
    }
  });

  it("rejects a draft whose retained ARE fingerprint is stale with exact hashes", async () => {
    const harness = createHarness({ staleAreaProvenance: true });
    const failure = await captureCompileFailure(harness);

    expect(failure).toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
      details: [
        `expected=${"f".repeat(64)}`,
        `actual=${sha256(harness.contents[`${AREA}.are`])}`,
      ],
    });
    expect(failure.message).toBe("The source ARE changed after the draft was opened.");
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it("maps every admitted preserve-first writer failure to the public Update contract", async () => {
    const cases = [
      {
        code: "AREA_SOURCE_MISSING",
        expectedCode: "AREA_UPDATE_SOURCE_MISSING",
        expectedStatus: 404,
        expectedMessage: "The source ARE is missing.",
      },
      {
        code: "AREA_FINGERPRINT_MISMATCH",
        expectedCode: "AREA_UPDATE_SOURCE_STALE",
        expectedStatus: 409,
        expectedMessage: "The source ARE changed after the draft was opened.",
      },
      {
        code: "TILESET_FINGERPRINT_MISMATCH",
        expectedCode: "AREA_UPDATE_TILESET_STALE",
        expectedStatus: 409,
        expectedMessage: "The SET source changed after the draft was opened.",
      },
      {
        code: "AREA_PRESERVE_UNAVAILABLE",
        expectedCode: "AREA_UPDATE_CANDIDATE_INVALID",
        expectedStatus: 422,
        expectedMessage: "writer rejected preserved fields",
      },
      {
        code: "INVALID_AREA_TOPOLOGY",
        expectedCode: "AREA_UPDATE_CANDIDATE_INVALID",
        expectedStatus: 422,
        expectedMessage: "writer rejected preserved fields",
      },
    ] as const;

    for (const expected of cases) {
      const harness = createHarness();
      harness.areaEditing.exportAre.mockRejectedValueOnce(new AppException({
        status: 422,
        code: expected.code,
        message: "writer rejected preserved fields",
      }));
      const failure = await captureCompileFailure(harness);
      expect(failure).toMatchObject({
        code: expected.expectedCode,
        status: expected.expectedStatus,
        details: [],
      });
      expect(failure.message).toBe(expected.expectedMessage);
    }
  });

  it("maps unknown writer failures to diagnosable storage unavailability", async () => {
    for (const error of [
      new Error("writer transport offline"),
      new AppException({
        status: 500,
        code: "UNEXPECTED_WRITER_FAILURE",
        message: "unexpected writer failure",
      }),
    ]) {
      const harness = createHarness();
      harness.areaEditing.exportAre.mockRejectedValueOnce(error);

      const failure = await captureCompileFailure(harness);
      expect(failure).toMatchObject({
        code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
        status: 503,
        details: [error.message],
      });
      expect(failure.message).toBe("The preserve-first ARE writer failed.");
    }
  });

  it("rejects independently inconsistent ARE writer file names and sizes", async () => {
    const wrongName = createHarness();
    wrongName.areaEditing.exportAre.mockResolvedValueOnce({
      ...wrongName.exportResult,
      fileName: "another.are",
    });
    const nameFailure = await captureCompileFailure(wrongName);
    expect(nameFailure).toMatchObject({
      code: "AREA_UPDATE_CANDIDATE_INVALID",
      status: 422,
      details: [],
    });
    expect(nameFailure.message).toBe(
      "The ARE writer returned inconsistent candidate metadata.",
    );

    const wrongSize = createHarness();
    wrongSize.areaEditing.exportAre.mockResolvedValueOnce({
      ...wrongSize.exportResult,
      size: wrongSize.exportResult.size + 1,
    });
    const sizeFailure = await captureCompileFailure(wrongSize);
    expect(sizeFailure).toMatchObject({
      code: "AREA_UPDATE_CANDIDATE_INVALID",
      status: 422,
      details: [],
    });
    expect(sizeFailure.message).toBe(
      "The ARE writer returned inconsistent candidate metadata.",
    );
  });

  it("preserves exact independent-candidate validation diagnostics", async () => {
    const harness = createHarness({ invalidCandidate: true });
    const failure = await captureCompileFailure(harness);

    expect(failure).toMatchObject({
      code: "AREA_UPDATE_CANDIDATE_INVALID",
      status: 422,
    });
    expect(failure.message).toBe(
      "The compiled ARE candidate failed independent validation.",
    );
    expect(failure.details).toEqual([
      "AREA_UPDATE_CANDIDATE_PARSE_FAILED:candidate.are:Candidate is not a readable ARE GFF.",
    ]);
  });

  it("compiles one existing creature transform together with an independent item deletion", async () => {
    const harness = createHarness({ objectDeletion: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: { objects: Array<{ x: number }> };
    };
    payload.editableScene.objects[0]!.x = 1.5;
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);
    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 1,
      totalTransformed: 1,
      deletedCounts: expect.objectContaining({ item: 1 }),
      transformedCounts: expect.objectContaining({ creature: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const parsed = parseRawGffDocument(git.bytes)!;
    const creatureList = parsed.fields.find((field) => field.label === "Creature List");
    expect(creatureList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "XPosition", type: "float", value: 15 },
          { label: "XOrientation", type: "float", value: 1 },
          { label: "YOrientation", type: "float", value: -0 },
        ]),
      })],
    });
    expect(harness.areaEditing.exportAre).toHaveBeenCalledTimes(1);
  });

  it("compiles one retained Door transition storage mutation while preserving the GIC byte-for-byte", async () => {
    const harness = createHarness({ doorTransitionMutation: true });

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 0,
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ door: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    const parsed = parseRawGffDocument(git.bytes)!;
    const doorList = parsed.fields.find((field) => field.label === "Door List");
    expect(doorList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        typeId: 8,
        fields: expect.arrayContaining([
          { label: "LinkedTo", type: "cexostring", value: "NEW_DEST" },
          { label: "LinkedToFlags", type: "byte", value: 2 },
          { label: "LoadScreenID", type: "word", value: 7 },
        ]),
      })],
    });
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
  });

  it("compiles one retained Trigger polygon CAS mutation with exact receipt counts", async () => {
    const harness = createHarness({ triggerTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as Record<string, any>;
    const trigger = payload.editableScene.objects.find(
      (object: Record<string, unknown>) => object.kind === "triggers",
    );
    trigger.x = Math.fround(35.47599411010742) / 10;
    trigger.source.sourceIndex = 0;
    trigger.source.polygonGeometry = candidatePolygon([
      [-0.2990303039550781, -4.833713531494141, 0.02500000037252903],
      [4.8592987060546875, -4.833709716796875, 0.025000499561429024],
      [4.8592987060546875, 0.324615478515625, 0.025000499561429024],
      [0, 0, 3.125],
    ]);
    trigger.polygonGeometry = candidatePolygon([
      [-1, -5, 0.25],
      [5, -5, 0.25],
      [5, 1, 0.25],
      [0, 0, 3.5],
    ]);
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 1,
      totalPolygonUpdated: 1,
      transformedCounts: expect.objectContaining({ trigger: 1 }),
      polygonUpdatedCounts: expect.objectContaining({ trigger: 1, encounter: 0 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    const parsed = parseRawGffDocument(git.bytes)!;
    const triggerList = parsed.fields.find((field) => field.label === "TriggerList");
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
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
  });

  it("compiles one existing placeable X/Y/Z/Bearing transform without a VisualTransform field", async () => {
    const harness = createHarness({ placeableTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: { objects: Array<{ x: number; y: number; z: number; bearing: number }> };
    };
    Object.assign(payload.editableScene.objects[1]!, {
      x: 4.5,
      y: 5.5,
      z: 0.25,
      bearing: Math.PI / 4,
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 1,
      totalTransformed: 1,
      deletedCounts: expect.objectContaining({ item: 1 }),
      transformedCounts: expect.objectContaining({ placeable: 1, creature: 0 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const parsed = parseRawGffDocument(git.bytes)!;
    const placeableList = parsed.fields.find((field) => field.label === "Placeable List");
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
    expect((placeableList as Extract<typeof placeableList, { type: "list" }>).value[0]!.fields
      .some((field) => field.label === "VisualTransform")).toBe(false);
  });

  it("compiles one existing waypoint position/orientation transform with an independent item deletion", async () => {
    const harness = createHarness({ waypointTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: { objects: Array<{ x: number; y: number; z: number; bearing: number }> };
    };
    Object.assign(payload.editableScene.objects[1]!, {
      x: 3.5,
      y: 4.75,
      z: 0.35,
      bearing: Math.PI * 1.25,
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 1,
      totalTransformed: 1,
      deletedCounts: expect.objectContaining({ item: 1 }),
      transformedCounts: expect.objectContaining({ waypoint: 1, creature: 0 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const parsed = parseRawGffDocument(git.bytes)!;
    const waypointList = parsed.fields.find((field) => field.label === "WaypointList");
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

  it("compiles one existing-placeable OnUsed update with exact property receipt counts", async () => {
    const harness = createHarness({ placeableTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      provenance: { sourceGicSha256?: string };
      editableScene: {
        objects: Array<{
          kind: string;
          placeableProperties?: { scriptSlots?: { onUsed?: string } };
        }>;
      };
    };
    payload.provenance.sourceGicSha256 = sha256(harness.contents[`${AREA}.gic`]);
    const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
    placeable.placeableProperties!.scriptSlots!.onUsed = "s04_plcprobe";
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 1,
      totalTransformed: 0,
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ placeable: 1, creature: 0 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const placeableList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "OnUsed", type: "resref", value: "s04_plcprobe" },
        ]),
      })],
    });
  });

  it("compiles provenance-bound existing-placeable script updates into exact native ResRefs", async () => {
    const harness = createHarness({ placeableTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          placeableProperties?: { scriptSlots?: Record<string, string> };
        }>;
      };
    };
    const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
    placeable.placeableProperties!.scriptSlots!.onClick = "new_click";
    placeable.placeableProperties!.scriptSlots!.onOpen = "new_open";
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 1,
      totalTransformed: 0,
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ placeable: 1, creature: 0 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const placeableList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "OnClick", type: "resref", value: "new_click" },
          { label: "OnOpen", type: "resref", value: "new_open" },
          { label: "OnUsed", type: "resref", value: "" },
        ]),
      })],
    });
  });

  it("compiles provenance-bound existing-placeable trap script updates into exact native ResRefs", async () => {
    const harness = createHarness({ placeableTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          placeableProperties?: {
            trapSettings?: {
              onDisarmScript?: string;
              onTrapTriggeredScript?: string;
            };
          };
        }>;
      };
    };
    const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
    placeable.placeableProperties!.trapSettings!.onDisarmScript = "new_disarm";
    placeable.placeableProperties!.trapSettings!.onTrapTriggeredScript = "new_trigger";
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 1,
      totalTransformed: 0,
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ placeable: 1, creature: 0 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const placeableList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "OnDisarm", type: "resref", value: "new_disarm" },
          { label: "OnTrapTriggered", type: "resref", value: "new_trigger" },
        ]),
      })],
    });
  });

  it("compiles provenance-bound existing-placeable Plot and HasInventory updates into native Bytes", async () => {
    const harness = createHarness({ placeableTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          placeableProperties?: { plot?: boolean; hasInventory?: boolean };
        }>;
      };
    };
    const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
    placeable.placeableProperties!.plot = true;
    placeable.placeableProperties!.hasInventory = true;
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ placeable: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const placeableList = parseRawGffDocument(git.bytes)!.fields.find(
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
  });

  it("compiles provenance-bound existing-placeable Hardness/Fort/Ref/Will updates into native Bytes", async () => {
    const harness = createHarness({ placeableTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          placeableProperties?: {
            hardness?: number;
            fortitudeSave?: number;
            reflexSave?: number;
            willSave?: number;
          };
        }>;
      };
    };
    const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
    Object.assign(placeable.placeableProperties!, {
      hardness: 6,
      fortitudeSave: 17,
      reflexSave: 1,
      willSave: 2,
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ placeable: 1 }),
      blueprintSources: [],
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const placeableList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Hardness", type: "byte", value: 6 },
          { label: "Fort", type: "byte", value: 17 },
          { label: "Ref", type: "byte", value: 1 },
          { label: "Will", type: "byte", value: 2 },
        ]),
      })],
    });
  });

  it("compiles one provenance-bound existing-placeable AnimationState without blueprint sources", async () => {
    const harness = createHarness({ placeableTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          source: { placeableAnimationState?: number };
          placeableProperties?: { advancedSettings?: { initialState?: number } };
        }>;
      };
    };
    const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
    placeable.source.placeableAnimationState = 0;
    placeable.placeableProperties!.advancedSettings = {
      ...placeable.placeableProperties!.advancedSettings,
      initialState: 1,
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ placeable: 1 }),
      blueprintSources: [],
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const placeableList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "AnimationState", type: "byte", value: 1 },
        ]),
      })],
    });
    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
  });

  it("compiles one provenance-bound existing-placeable HP / derived CurrentHP without blueprint sources", async () => {
    const harness = createHarness({ placeableTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          source: Record<string, unknown>;
          placeableProperties?: Record<string, unknown>;
        }>;
      };
    };
    const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
    placeable.source.placeableHitPointState = { hitPoints: 15, currentHitPoints: 15 };
    placeable.placeableProperties!.hitPoints = 30;
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ placeable: 1 }),
      blueprintSources: [],
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const placeableList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "HP", type: "short", value: 30 },
          { label: "CurrentHP", type: "short", value: 30 },
        ]),
      })],
    });
    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
    expect(harness.appearanceCatalog.resolveEffectivePlaceablesTwoDaDescriptor).not.toHaveBeenCalled();
  });

  it("compiles one ordinal-bound existing-placeable Tag verbatim without blueprint sources", async () => {
    const harness = createHarness({ placeableTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          tag: string;
          source: Record<string, unknown>;
        }>;
      };
    };
    const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
    placeable.source.sourceIndex = 0;
    placeable.source.placeableBasicIdentity = placeableBasicIdentity(104, "c".repeat(64), 200);
    placeable.tag = " New Chest ";
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ placeable: 1 }),
      blueprintSources: [],
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const placeableList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Tag", type: "cexostring", value: " New Chest " },
        ]),
      })],
    });
    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
    expect(harness.appearanceCatalog.resolveEffectivePlaceablesTwoDaDescriptor).not.toHaveBeenCalled();
  });

  it("compiles complete ordered inline-ASCII Placeable LocName and Description lists without blueprint sources", async () => {
    const harness = createHarness({ placeableTransform: true, itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          source: Record<string, unknown>;
          placeableProperties?: Record<string, unknown>;
        }>;
      };
    };
    const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
    placeable.source.sourceIndex = 0;
    placeable.source.placeableLocalizedStrings = {
      locName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "Q2hlc3Q=" }],
      },
      description: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "U3RvcmFnZQ==" }],
      },
    };
    placeable.placeableProperties = {
      ...placeable.placeableProperties,
      localizedName: " Chest 2 ",
      localizedNameEntries: [
        { languageId: 10, text: "Kufer" },
        { languageId: 0, text: " Chest 2 " },
        { languageId: 3, text: "Coffre" },
      ],
      description: "",
      descriptionEntries: [],
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.projectedDraft.objectEditing?.propertyMutations).toEqual([expect.objectContaining({
      kind: "placeable",
      sourceIndex: 0,
      localizedStrings: [
        {
          field: "LocName",
          expectedProfile: "simple_inline_ascii",
          expectedValue: "Chest",
          expectedEntries: [{ languageId: 0, text: "Chest" }],
          value: " Chest 2 ",
          valueEntries: [
            { languageId: 10, text: "Kufer" },
            { languageId: 0, text: " Chest 2 " },
            { languageId: 3, text: "Coffre" },
          ],
        },
        {
          field: "Description",
          expectedProfile: "simple_inline_ascii",
          expectedValue: "Storage",
          expectedEntries: [{ languageId: 0, text: "Storage" }],
          value: "",
          valueEntries: [],
        },
      ],
    })]);
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ placeable: 1 }),
      blueprintSources: [],
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    const placeableList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          {
            label: "LocName",
            type: "cexolocstring",
            value: {
              strRef: 0xffff_ffff,
              entries: [
                { languageId: 10, text: "Kufer" },
                { languageId: 0, text: " Chest 2 " },
                { languageId: 3, text: "Coffre" },
              ],
            },
          },
          {
            label: "Description",
            type: "cexolocstring",
            value: {
              strRef: 0xffff_ffff,
              entries: [],
            },
          },
        ]),
      })],
    });
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
    expect(harness.appearanceCatalog.resolveEffectivePlaceablesTwoDaDescriptor).not.toHaveBeenCalled();
  });

  it("compiles one digest-bound physical-row Placeable Appearance after authoritative catalog revalidation", async () => {
    const harness = createHarness({ placeableTransform: true, itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          source: Record<string, unknown>;
          placeableProperties?: Record<string, unknown>;
        }>;
      };
    };
    const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
    placeable.source.placeableBasicIdentity = placeableBasicIdentity(104, "c".repeat(64), 200);
    placeable.placeableProperties!.appearanceType = 105;
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveEffectivePlaceablesTwoDaDescriptor).toHaveBeenCalledTimes(1);
    expect(harness.appearanceCatalog.listEffectivePlaceablesTwoDaRows).toHaveBeenCalledWith({
      limit: 1,
      offset: 105,
    });
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ placeable: 1 }),
      blueprintSources: [],
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    const placeableList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Appearance", type: "dword", value: 105 },
        ]),
      })],
    });
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
  });

  it("rejects a Placeable Appearance mutation when the effective placeables.2da digest changed", async () => {
    const harness = createHarness({ placeableTransform: true, itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          source: Record<string, unknown>;
          placeableProperties?: Record<string, unknown>;
        }>;
      };
    };
    const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
    placeable.source.placeableBasicIdentity = placeableBasicIdentity(104, "d".repeat(64), 200);
    placeable.placeableProperties!.appearanceType = 105;
    harness.drafts.read.mockResolvedValueOnce(mutated);

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
      details: [
        `expected=${"d".repeat(64)}`,
        `actual=${"c".repeat(64)}`,
      ],
    });
    expect(harness.appearanceCatalog.listEffectivePlaceablesTwoDaRows).not.toHaveBeenCalled();
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it("rejects a Placeable Appearance target that is absent from the current physical row catalog", async () => {
    const harness = createHarness({ placeableTransform: true, itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          source: Record<string, unknown>;
          placeableProperties?: Record<string, unknown>;
        }>;
      };
    };
    const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
    placeable.source.placeableBasicIdentity = placeableBasicIdentity(104, "c".repeat(64), 200);
    placeable.placeableProperties!.appearanceType = 105;
    harness.drafts.read.mockResolvedValueOnce(mutated);
    harness.appearanceCatalog.listEffectivePlaceablesTwoDaRows.mockResolvedValueOnce({
      descriptor: effectivePlaceablesDescriptor(),
      items: [],
      total: 200,
      limit: 1,
      offset: 105,
    });

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      status: 422,
      details: ["placeable:Appearance:row=105:not_found"],
    });
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it("compiles one digest-bound Toolset-admitted Creature Appearance_Type physical row", async () => {
    const harness = createHarness({ creatureAppearance: true, itemTransform: true });
    retainCreatureAppearanceMutation(harness);

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveEffectiveCreatureAppearanceTwoDaDescriptor)
      .toHaveBeenCalledTimes(1);
    expect(harness.appearanceCatalog.resolveEffectiveCreatureAppearanceTwoDaRow)
      .toHaveBeenCalledWith(52);
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find((field) => field.label === "Creature List"))
      .toMatchObject({
        type: "list",
        value: [expect.objectContaining({ fields: expect.arrayContaining([
          { label: "Appearance_Type", type: "word", value: 52 },
        ]) })],
      });
    expect(candidate.resources.find((resource) => resource.extension === "gic")!.bytes)
      .toEqual(harness.contents[`${AREA}.gic`]);
  });

  it("compiles one digest-bound Toolset-admitted Creature Gender physical Byte row", async () => {
    const harness = createHarness({ creatureGender: true, itemTransform: true });
    retainCreatureGenderMutation(harness);

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveEffectiveCreatureGenderTwoDaDescriptor)
      .toHaveBeenCalledTimes(1);
    expect(harness.appearanceCatalog.resolveEffectiveCreatureGenderTwoDaRow)
      .toHaveBeenCalledWith(0);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find((field) => field.label === "Creature List"))
      .toMatchObject({
        type: "list",
        value: [expect.objectContaining({ fields: expect.arrayContaining([
          { label: "Gender", type: "byte", value: 0 },
        ]) })],
      });
    expect(candidate.resources.find((resource) => resource.extension === "gic")!.bytes)
      .toEqual(harness.contents[`${AREA}.gic`]);
  });

  it("compiles one digest-bound Toolset-admitted Creature WalkRate physical Int row", async () => {
    const harness = createHarness({ creatureWalkRate: true, itemTransform: true });
    retainCreatureWalkRateMutation(harness);

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveEffectiveCreatureWalkRatesTwoDaTable)
      .toHaveBeenCalledTimes(1);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find((field) => field.label === "Creature List"))
      .toMatchObject({
        type: "list",
        value: [expect.objectContaining({ fields: expect.arrayContaining([
          { label: "WalkRate", type: "int", value: 2 },
        ]) })],
      });
    expect(candidate.resources.find((resource) => resource.extension === "gic")!.bytes)
      .toEqual(harness.contents[`${AREA}.gic`]);
  });

  it("compiles one digest-bound Toolset-admitted Creature PortraitId physical Word row", async () => {
    const harness = createHarness({ creaturePortrait: true, itemTransform: true });
    retainCreaturePortraitMutation(harness);

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveEffectiveCreaturePortraitsTwoDaTable)
      .toHaveBeenCalledTimes(1);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find((field) => field.label === "Creature List"))
      .toMatchObject({
        type: "list",
        value: [expect.objectContaining({ fields: expect.arrayContaining([
          { label: "PortraitId", type: "word", value: 11 },
        ]) })],
      });
    expect(candidate.resources.find((resource) => resource.extension === "gic")!.bytes)
      .toEqual(harness.contents[`${AREA}.gic`]);
  });

  it("compiles one exact retained Creature ChallengeRating physical Float", async () => {
    const harness = createHarness({ creatureChallengeRating: true, itemTransform: true });
    retainCreatureChallengeRatingMutation(harness);

    const candidate = await compile(harness);

    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find((field) => field.label === "Creature List"))
      .toMatchObject({
        type: "list",
        value: [expect.objectContaining({ fields: expect.arrayContaining([
          { label: "ChallengeRating", type: "float", value: Math.fround(0.1) },
        ]) })],
      });
    expect(candidate.resources.find((resource) => resource.extension === "gic")!.bytes)
      .toEqual(harness.contents[`${AREA}.gic`]);
  });

  it("compiles one exact retained Creature NaturalAC physical Byte", async () => {
    const harness = createHarness({ creatureNaturalArmorClass: true, itemTransform: true });
    retainCreatureNaturalArmorClassMutation(harness);

    const candidate = await compile(harness);

    expect(candidate.projectedDraft.objectEditing?.propertyMutations).toEqual([
      expect.objectContaining({
        kind: "creature",
        sourceIndex: 0,
        naturalArmorClass: { expectedValue: 0, value: 2 },
      }),
    ]);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find((field) => field.label === "Creature List"))
      .toMatchObject({
        type: "list",
        value: [expect.objectContaining({ fields: expect.arrayContaining([
          { label: "NaturalAC", type: "byte", value: 2 },
        ]) })],
      });
    expect(candidate.resources.find((resource) => resource.extension === "gic")!.bytes)
      .toEqual(harness.contents[`${AREA}.gic`]);
  });

  it("compiles changed exact retained Creature saving-throw physical Shorts", async () => {
    const harness = createHarness({ creatureSavingThrowBonuses: true, itemTransform: true });
    retainCreatureSavingThrowBonusMutations(harness);

    const candidate = await compile(harness);

    expect(candidate.projectedDraft.objectEditing?.propertyMutations).toEqual([
      expect.objectContaining({
        kind: "creature",
        sourceIndex: 0,
        savingThrowBonuses: {
          reflex: { expectedValue: 1, value: 4 },
          fortitude: { expectedValue: 3, value: 5 },
        },
      }),
    ]);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find((field) => field.label === "Creature List"))
      .toMatchObject({
        type: "list",
        value: [expect.objectContaining({ fields: expect.arrayContaining([
          { label: "refbonus", type: "short", value: 4 },
          { label: "willbonus", type: "short", value: 2 },
          { label: "fortbonus", type: "short", value: 5 },
        ]) })],
      });
    expect(candidate.resources.find((resource) => resource.extension === "gic")!.bytes)
      .toEqual(harness.contents[`${AREA}.gic`]);
  });

  it("compiles one coupled retained Creature alignment Byte mutation", async () => {
    const harness = createHarness({ creatureAlignment: true, itemTransform: true });
    retainCreatureAlignmentMutation(harness);

    const candidate = await compile(harness);

    expect(candidate.projectedDraft.objectEditing?.propertyMutations).toEqual([
      expect.objectContaining({
        kind: "creature",
        sourceIndex: 0,
        alignment: {
          expectedGoodEvil: 50,
          expectedLawfulChaotic: 50,
          goodEvil: 100,
          lawfulChaotic: 100,
        },
      }),
    ]);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find((field) => field.label === "Creature List"))
      .toMatchObject({
        type: "list",
        value: [expect.objectContaining({ fields: expect.arrayContaining([
          { label: "GoodEvil", type: "byte", value: 100 },
          { label: "LawfulChaotic", type: "byte", value: 100 },
        ]) })],
      });
    expect(candidate.resources.find((resource) => resource.extension === "gic")!.bytes)
      .toEqual(harness.contents[`${AREA}.gic`]);
  });

  it("compiles changed exact retained Creature base ability-score physical Bytes", async () => {
    const harness = createHarness({ creatureAbilityScores: true, itemTransform: true });
    retainCreatureAbilityScoreMutations(harness);

    const candidate = await compile(harness);

    expect(candidate.projectedDraft.objectEditing?.propertyMutations).toEqual([
      expect.objectContaining({
        kind: "creature",
        sourceIndex: 0,
        abilityScores: {
          strength: { expectedValue: 15, value: 17 },
          charisma: { expectedValue: 8, value: 10 },
        },
      }),
    ]);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find((field) => field.label === "Creature List"))
      .toMatchObject({
        type: "list",
        value: [expect.objectContaining({ fields: expect.arrayContaining([
          { label: "Str", type: "byte", value: 17 },
          { label: "Dex", type: "byte", value: 12 },
          { label: "Con", type: "byte", value: 14 },
          { label: "Int", type: "byte", value: 10 },
          { label: "Wis", type: "byte", value: 11 },
          { label: "Cha", type: "byte", value: 10 },
        ]) })],
      });
    expect(candidate.resources.find((resource) => resource.extension === "gic")!.bytes)
      .toEqual(harness.contents[`${AREA}.gic`]);
  });

  it("compiles changed exact retained Creature appearance-color physical Bytes", async () => {
    const harness = createHarness({ creatureAppearanceColors: true, itemTransform: true });
    retainCreatureAppearanceColorMutations(harness);

    const candidate = await compile(harness);

    expect(candidate.projectedDraft.objectEditing?.propertyMutations).toEqual([
      expect.objectContaining({
        kind: "creature",
        sourceIndex: 0,
        appearanceColors: {
          skin: { expectedValue: 11, value: 12 },
          tattoo2: { expectedValue: 44, value: 45 },
        },
      }),
    ]);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find((field) => field.label === "Creature List"))
      .toMatchObject({
        type: "list",
        value: [expect.objectContaining({ fields: expect.arrayContaining([
          { label: "Color_Skin", type: "byte", value: 12 },
          { label: "Color_Hair", type: "byte", value: 22 },
          { label: "Color_Tattoo1", type: "byte", value: 33 },
          { label: "Color_Tattoo2", type: "byte", value: 45 },
        ]) })],
      });
    expect(candidate.resources.find((resource) => resource.extension === "gic")!.bytes)
      .toEqual(harness.contents[`${AREA}.gic`]);
  });

  it("compiles Creature body parts while preserving exact legacy/wide field presence", async () => {
    const harness = createHarness({ creatureBodyParts: true, itemTransform: true });
    retainCreatureBodyPartMutations(harness);

    const candidate = await compile(harness);

    expect(candidate.projectedDraft.objectEditing?.propertyMutations).toEqual([
      expect.objectContaining({
        kind: "creature",
        sourceIndex: 0,
        bodyParts: {
          rightFoot: { expectedValue: 12, value: 13 },
          torso: { expectedValue: 4096, value: 5000 },
          rightShoulder: { expectedValue: 1023, value: 1024 },
        },
      }),
    ]);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const creatureList = parseRawGffDocument(git.bytes)!.fields
      .find((field) => field.label === "Creature List") as any;
    const fields = creatureList.value[0].fields;
    expect(fields).toEqual(expect.arrayContaining([
      { label: "ArmorPart_RFoot", type: "byte", value: 13 },
      { label: "BodyPart_Torso", type: "byte", value: 0 },
      { label: "xBodyPart_Torso", type: "word", value: 5000 },
      { label: "xBodyPart_RShoul", type: "word", value: 1024 },
    ]));
    expect(fields.some((field: any) => field.label === "xArmorPart_RFoot")).toBe(false);
    expect(fields.some((field: any) => field.label === "BodyPart_RShoul")).toBe(false);
    expect(candidate.resources.find((resource) => resource.extension === "gic")!.bytes)
      .toEqual(harness.contents[`${AREA}.gic`]);
  });

  it("compiles one catalog-bound modern Creature appendage DWord", async () => {
    const harness = createHarness({ creatureAppendages: true, itemTransform: true });
    retainCreatureAppendageMutation(harness);

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveEffectiveCreatureAppendageTwoDaDescriptor)
      .toHaveBeenCalledWith("wingmodel.2da");
    expect(harness.appearanceCatalog.resolveEffectiveCreatureAppendageTwoDaRow)
      .toHaveBeenCalledWith("wingmodel.2da", 7);
    expect(candidate.projectedDraft.objectEditing?.propertyMutations).toEqual([
      expect.objectContaining({
        kind: "creature",
        sourceIndex: 0,
        appendages: {
          wings: {
            expectedValue: 1,
            value: 7,
            tableSha256: "a".repeat(64),
            rowCount: 8,
          },
        },
      }),
    ]);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const creatureList = parseRawGffDocument(git.bytes)!.fields
      .find((field) => field.label === "Creature List") as any;
    expect(creatureList.value[0].fields).toEqual(expect.arrayContaining([
      { label: "Wings_New", type: "dword", value: 7 },
      { label: "Wings", type: "byte", value: 2 },
      { label: "Tail_New", type: "dword", value: 3 },
    ]));
    expect(candidate.resources.find((resource) => resource.extension === "gic")!.bytes)
      .toEqual(harness.contents[`${AREA}.gic`]);
  });

  it("compiles one coupled Creature HP Short triplet after fresh racialtypes admission", async () => {
    const harness = createHarness({ creatureHitPoints: true, itemTransform: true });
    retainCreatureHitPointMutation(harness);

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveEffectiveCreatureRacialTypesTwoDaTable)
      .toHaveBeenCalledTimes(1);
    expect(candidate.projectedDraft.objectEditing?.propertyMutations).toEqual([
      expect.objectContaining({
        kind: "creature",
        sourceIndex: 0,
        hitPoints: expect.objectContaining({
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
        }),
      }),
    ]);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Creature List",
    )).toMatchObject({
      type: "list",
      value: [expect.objectContaining({ fields: expect.arrayContaining([
        { label: "HitPoints", type: "short", value: 25 },
        { label: "CurrentHitPoints", type: "short", value: 20 },
        { label: "MaxHitPoints", type: "short", value: 35 },
        { label: "Con", type: "byte", value: 14 },
      ]) })],
    });
    expect(candidate.resources.find((resource) => resource.extension === "gic")!.bytes)
      .toEqual(harness.contents[`${AREA}.gic`]);
  });

  it("rejects coupled Creature HP when the effective racialtypes digest changed", async () => {
    const harness = createHarness({ creatureHitPoints: true, itemTransform: true });
    retainCreatureHitPointMutation(harness, "b".repeat(64));

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
    });
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it("rejects Creature Appearance_Type when the effective appearance.2da digest changed", async () => {
    const harness = createHarness({ creatureAppearance: true, itemTransform: true });
    retainCreatureAppearanceMutation(harness, 52, "d".repeat(64));

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
      details: [],
    });
    expect(harness.appearanceCatalog.resolveEffectiveCreatureAppearanceTwoDaRow)
      .not.toHaveBeenCalled();
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it("rejects Creature Appearance_Type when the current Toolset selector omits the row", async () => {
    const harness = createHarness({ creatureAppearance: true, itemTransform: true });
    retainCreatureAppearanceMutation(harness);
    harness.appearanceCatalog.resolveEffectiveCreatureAppearanceTwoDaRow.mockResolvedValueOnce({
      descriptor: effectiveCreatureAppearanceDescriptor(),
      row: null,
    });

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      status: 422,
      details: ["creature:Appearance_Type:row=52:not_admitted"],
    });
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it("does not resolve the Appearance catalog when the update contains no Appearance mutation", async () => {
    const harness = createHarness({ placeableTransform: true, itemTransform: true });
    await compile(harness);
    expect(harness.appearanceCatalog.resolveEffectivePlaceablesTwoDaDescriptor)
      .not.toHaveBeenCalled();
    expect(harness.appearanceCatalog.listEffectivePlaceablesTwoDaRows).not.toHaveBeenCalled();
  });

  it("does not resolve the traps.2da catalog when the update contains no TrapType mutation", async () => {
    const harness = createHarness({ placeableTransform: true, itemTransform: true });
    await compile(harness);
    expect(harness.appearanceCatalog.resolveEffectiveTrapsTwoDaTable).not.toHaveBeenCalled();
  });

  it("compiles one digest-bound physical-row Placeable TrapType after authoritative catalog revalidation", async () => {
    const harness = createHarness({ placeableTransform: true, itemTransform: true });
    retainTrapTypeMutation(harness);

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveEffectiveTrapsTwoDaTable).toHaveBeenCalledTimes(1);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const placeableList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "TrapType", type: "byte", value: 7 },
        ]),
      })],
    });
  });

  it("rejects a Placeable TrapType mutation when effective traps.2da changed", async () => {
    const harness = createHarness({ placeableTransform: true, itemTransform: true });
    retainTrapTypeMutation(harness, 7, "e".repeat(64));

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
      details: [`expected=${"e".repeat(64)}`, `actual=${"d".repeat(64)}`],
    });
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it("compiles one digest-bound physical-row Placeable BodyBag after catalog revalidation", async () => {
    const harness = createHarness({ placeableTransform: true, itemTransform: true });
    retainBodyBagMutation(harness);
    const candidate = await compile(harness);
    expect(harness.appearanceCatalog.resolveEffectiveBodyBagTwoDaTable).toHaveBeenCalledTimes(1);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find((field) => field.label === "Placeable List"))
      .toMatchObject({
        type: "list",
        value: [expect.objectContaining({ fields: expect.arrayContaining([
          { label: "BodyBag", type: "byte", value: 3 },
        ]) })],
      });
  });

  it("rejects Placeable BodyBag when the effective table digest changed", async () => {
    const harness = createHarness({ placeableTransform: true, itemTransform: true });
    retainBodyBagMutation(harness, 3, "f".repeat(64));
    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
      details: [`expected=${"f".repeat(64)}`, `actual=${"e".repeat(64)}`],
    });
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it("rejects a malformed authoritative bodybag.2da response fail closed", async () => {
    const harness = createHarness({ placeableTransform: true, itemTransform: true });
    retainBodyBagMutation(harness);
    harness.appearanceCatalog.resolveEffectiveBodyBagTwoDaTable.mockResolvedValueOnce({
      descriptor: null,
      rows: [],
    } as never);

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
      status: 503,
      message: "The authoritative bodybag.2da catalog returned inconsistent data.",
    });
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it("compiles catalog-bound Creature BodyBag and canonical DecayTime after table revalidation", async () => {
    const harness = createHarness({ creatureDeathRemains: true, itemTransform: true });
    retainCreatureDeathRemainsMutation(harness);

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveEffectiveBodyBagTwoDaTable).toHaveBeenCalledTimes(1);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find((field) => field.label === "Creature List"))
      .toMatchObject({
        type: "list",
        value: [expect.objectContaining({ fields: expect.arrayContaining([
          { label: "BodyBag", type: "byte", value: 3 },
          { label: "DecayTime", type: "dword", value: 12_000 },
        ]) })],
      });
  });

  it("compiles one combined Lootable, BodyBag, and DecayTime mutation while preserving GIC and IFO", async () => {
    const harness = createHarness({
      creatureDeathRemains: true,
      creatureDeathRemainsLootable: 0,
      itemTransform: true,
    });
    retainCreatureDeathRemainsMutation(harness, "e".repeat(64), 0);

    const candidate = await compile(harness);

    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find((field) => field.label === "Creature List"))
      .toMatchObject({
        type: "list",
        value: [expect.objectContaining({ fields: expect.arrayContaining([
          { label: "Lootable", type: "byte", value: 1 },
          { label: "BodyBag", type: "byte", value: 3 },
          { label: "DecayTime", type: "dword", value: 12_000 },
        ]) })],
      });
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    expect(candidate.moduleIfo.baselineBytes).toEqual(harness.contents["module.ifo"]);
    expect(candidate.moduleIfo.candidateBytes).toEqual(harness.contents["module.ifo"]);
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
      candidateGicSha256: sha256(harness.contents[`${AREA}.gic`]),
    });
  });

  it("rejects Creature BodyBag when the effective table digest changed", async () => {
    const harness = createHarness({ creatureDeathRemains: true, itemTransform: true });
    retainCreatureDeathRemainsMutation(harness, "f".repeat(64));

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
      details: [`expected=${"f".repeat(64)}`, `actual=${"e".repeat(64)}`],
    });
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it("compiles one catalog-bound Creature FactionID Word after fresh repute.fac validation", async () => {
    const harness = createHarness({ creatureFaction: true, itemTransform: true });
    retainCreatureFactionMutation(harness);

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveModuleFactionCatalog).toHaveBeenCalledTimes(1);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find((field) => field.label === "Creature List"))
      .toMatchObject({
        type: "list",
        value: [expect.objectContaining({ fields: expect.arrayContaining([
          { label: "FactionID", type: "word", value: 4 },
        ]) })],
      });
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
    });
  });

  it("rejects Creature FactionID when the module repute.fac digest changed", async () => {
    const harness = createHarness({ creatureFaction: true, itemTransform: true });
    retainCreatureFactionMutation(harness, 4, "e".repeat(64));

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
      details: [`expected=${"e".repeat(64)}`, `actual=${"f".repeat(64)}`],
    });
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it("compiles one exact retained Creature TemplateResRef without catalog lookup", async () => {
    const harness = createHarness({ itemTransform: true });
    retainCreatureTemplateResRefMutation(harness);

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveModuleFactionCatalog).not.toHaveBeenCalled();
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find((field) => field.label === "Creature List"))
      .toMatchObject({
        type: "list",
        value: [expect.objectContaining({ fields: expect.arrayContaining([
          { label: "TemplateResRef", type: "resref", value: "nw_guard_alt" },
        ]) })],
      });
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
    });
  });

  it("compiles exact retained Creature Subrace and Deity without catalog lookup", async () => {
    const harness = createHarness({ creatureSpecialIdentityStrings: true, itemTransform: true });
    retainCreatureSpecialIdentityStringsMutation(harness);

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveModuleFactionCatalog).not.toHaveBeenCalled();
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find((field) => field.label === "Creature List"))
      .toMatchObject({
        type: "list",
        value: [expect.objectContaining({ fields: expect.arrayContaining([
          { label: "Subrace", type: "cexostring", value: "Sun Elf" },
          { label: "Deity", type: "cexostring", value: "Mystra" },
        ]) })],
      });
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
    });
  });

  it("compiles exact retained Creature script ResRefs without catalog lookup", async () => {
    const harness = createHarness({ creatureScriptResRefs: true, itemTransform: true });
    retainCreatureScriptResRefMutation(harness);

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveModuleFactionCatalog).not.toHaveBeenCalled();
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find((field) => field.label === "Creature List"))
      .toMatchObject({
        type: "list",
        value: [expect.objectContaining({ fields: expect.arrayContaining([
          { label: "ScriptHeartbeat", type: "resref", value: "main" },
          { label: "ScriptSpawn", type: "resref", value: "spawn_probe" },
          { label: "ScriptDeath", type: "resref", value: "nw_c2_default7" },
        ]) })],
      });
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
    });
  });

  it("compiles one digest-bound sparse physical-row Placeable PortraitId after catalog revalidation", async () => {
    const harness = createHarness({ placeableTransform: true, itemTransform: true });
    retainPortraitMutation(harness);

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveEffectivePortraitsTwoDaTable).toHaveBeenCalledTimes(1);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find((field) => field.label === "Placeable List"))
      .toMatchObject({
        type: "list",
        value: [expect.objectContaining({ fields: expect.arrayContaining([
          { label: "PortraitId", type: "word", value: 463 },
        ]) })],
      });
  });

  it("rejects Placeable PortraitId when the effective table digest changed", async () => {
    const harness = createHarness({ placeableTransform: true, itemTransform: true });
    retainPortraitMutation(harness, 463, "f".repeat(64));

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
      details: [`expected=${"f".repeat(64)}`, `actual=${"a".repeat(64)}`],
    });
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it("rejects a Placeable PortraitId whose physical row is not selectable", async () => {
    const harness = createHarness({ placeableTransform: true, itemTransform: true });
    retainPortraitMutation(harness, 464);

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      status: 422,
      details: ["PortraitId=464:not_selectable"],
    });
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it("compiles one digest-bound physical Placeable Faction after repute.fac revalidation", async () => {
    const harness = createHarness({ placeableTransform: true, itemTransform: true });
    retainFactionMutation(harness);

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveModuleFactionCatalog).toHaveBeenCalledTimes(1);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find((field) => field.label === "Placeable List"))
      .toMatchObject({
        type: "list",
        value: [expect.objectContaining({ fields: expect.arrayContaining([
          { label: "Faction", type: "dword", value: 3 },
        ]) })],
      });
  });

  it("rejects Placeable Faction when the module catalog digest changed", async () => {
    const harness = createHarness({ placeableTransform: true, itemTransform: true });
    retainFactionMutation(harness, 3, "e".repeat(64));

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
      details: [`expected=${"e".repeat(64)}`, `actual=${"f".repeat(64)}`],
    });
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: "catalog method is unavailable",
      arrange: (harness: ReturnType<typeof createHarness>) => {
        (harness.appearanceCatalog as any).resolveEffectiveTrapsTwoDaTable = undefined;
      },
      code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
      status: 503,
      details: [],
    },
    {
      label: "catalog resolution throws",
      arrange: (harness: ReturnType<typeof createHarness>) => {
        harness.appearanceCatalog.resolveEffectiveTrapsTwoDaTable
          .mockRejectedValueOnce(new Error("traps catalog offline"));
      },
      code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
      status: 503,
      details: ["traps catalog offline"],
    },
    {
      label: "effective table disappeared",
      arrange: (harness: ReturnType<typeof createHarness>) => {
        harness.appearanceCatalog.resolveEffectiveTrapsTwoDaTable.mockResolvedValueOnce(null as never);
      },
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
      details: ["actual=missing"],
    },
    {
      label: "row count changed",
      arrange: (harness: ReturnType<typeof createHarness>) => {
        harness.appearanceCatalog.resolveEffectiveTrapsTwoDaTable.mockResolvedValueOnce({
          descriptor: {
            resourceName: "traps.2da",
            sourceObjectKey: "modules/current/traps.2da",
            sourceLayer: "module",
            sha256: "d".repeat(64),
            sizeBytes: 2048,
            rowCount: 47,
          },
          rows: [],
        } as never);
      },
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
      details: ["expected=48", "actual=47"],
    },
    {
      label: "catalog row has an unknown key",
      arrange: (harness: ReturnType<typeof createHarness>) => {
        const table = effectiveTrapsTable();
        harness.appearanceCatalog.resolveEffectiveTrapsTwoDaTable.mockResolvedValueOnce({
          ...table,
          rows: table.rows.map((row, index) => index === 7 ? { ...row, unexpected: true } : row),
        } as never);
      },
      code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
      status: 503,
      details: [],
    },
    {
      label: "catalog rows are not in physical order",
      arrange: (harness: ReturnType<typeof createHarness>) => {
        const table = effectiveTrapsTable();
        harness.appearanceCatalog.resolveEffectiveTrapsTwoDaTable.mockResolvedValueOnce({
          ...table,
          rows: table.rows.map((row, index) => index === 7 ? { ...row, rowIndex: 8 } : row),
        } as never);
      },
      code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
      status: 503,
      details: [],
    },
  ])("fails closed when the Placeable TrapType $label", async ({ arrange, code, status, details }) => {
    const harness = createHarness({ placeableTransform: true, itemTransform: true });
    retainTrapTypeMutation(harness);
    arrange(harness);

    await expect(compile(harness)).rejects.toMatchObject({ code, status, details });
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it("fails closed for every unavailable, stale, inconsistent, or non-physical Appearance catalog result", async () => {
    const cases: Array<{
      label: string;
      mutate: (harness: ReturnType<typeof createHarness>) => void;
      code: string;
      status: number;
      details?: readonly string[];
      message?: string;
    }> = [
      {
        label: "missing descriptor method",
        mutate: (harness) => { (harness.appearanceCatalog as any).resolveEffectivePlaceablesTwoDaDescriptor = undefined; },
        code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
        status: 503,
        message: "The authoritative placeables.2da catalog is unavailable.",
      },
      {
        label: "missing row method",
        mutate: (harness) => { (harness.appearanceCatalog as any).listEffectivePlaceablesTwoDaRows = undefined; },
        code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
        status: 503,
        message: "The authoritative placeables.2da catalog is unavailable.",
      },
      {
        label: "descriptor read failure",
        mutate: (harness) => {
          harness.appearanceCatalog.resolveEffectivePlaceablesTwoDaDescriptor
            .mockRejectedValueOnce(new Error("descriptor offline"));
        },
        code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
        status: 503,
        details: ["descriptor offline"],
      },
      {
        label: "missing descriptor",
        mutate: (harness) => {
          harness.appearanceCatalog.resolveEffectivePlaceablesTwoDaDescriptor
            .mockResolvedValueOnce(null as never);
        },
        code: "AREA_UPDATE_SOURCE_STALE",
        status: 409,
        details: ["actual=missing"],
      },
      {
        label: "changed row count",
        mutate: (harness) => {
          harness.appearanceCatalog.resolveEffectivePlaceablesTwoDaDescriptor.mockResolvedValueOnce({
            ...effectivePlaceablesDescriptor(),
            rowCount: 201,
          });
        },
        code: "AREA_UPDATE_SOURCE_STALE",
        status: 409,
        details: ["expected=200", "actual=201"],
      },
      {
        label: "row read failure",
        mutate: (harness) => {
          harness.appearanceCatalog.listEffectivePlaceablesTwoDaRows
            .mockRejectedValueOnce(new Error("row offline"));
        },
        code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
        status: 503,
        details: ["row offline"],
      },
      {
        label: "missing row catalog",
        mutate: (harness) => {
          harness.appearanceCatalog.listEffectivePlaceablesTwoDaRows.mockResolvedValueOnce(null as never);
        },
        code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
        status: 503,
        details: ["row=105"],
      },
      {
        label: "digest changes during row read",
        mutate: (harness) => {
          harness.appearanceCatalog.listEffectivePlaceablesTwoDaRows.mockResolvedValueOnce({
            descriptor: { ...effectivePlaceablesDescriptor(), sha256: "d".repeat(64) },
            items: [{ rowIndex: 105, displayName: "Row 105", displaySource: "row_index" }],
            total: 200,
            limit: 1,
            offset: 105,
          });
        },
        code: "AREA_UPDATE_SOURCE_STALE",
        status: 409,
        details: [`expected=${"c".repeat(64)}:200`, `actual=${"d".repeat(64)}:200`],
      },
      {
        label: "row count changes during row read",
        mutate: (harness) => {
          harness.appearanceCatalog.listEffectivePlaceablesTwoDaRows.mockResolvedValueOnce({
            descriptor: { ...effectivePlaceablesDescriptor(), rowCount: 201 },
            items: [{ rowIndex: 105, displayName: "Row 105", displaySource: "row_index" }],
            total: 201,
            limit: 1,
            offset: 105,
          });
        },
        code: "AREA_UPDATE_SOURCE_STALE",
        status: 409,
        details: [`expected=${"c".repeat(64)}:200`, `actual=${"c".repeat(64)}:201`],
      },
      ...(["limit", "offset", "total"] as const).map((field) => ({
        label: `inconsistent ${field}`,
        mutate: (harness: ReturnType<typeof createHarness>) => {
          harness.appearanceCatalog.listEffectivePlaceablesTwoDaRows.mockResolvedValueOnce({
            descriptor: effectivePlaceablesDescriptor(),
            items: [{ rowIndex: 105, displayName: "Row 105", displaySource: "row_index" }],
            total: field === "total" ? 199 : 200,
            limit: field === "limit" ? 2 : 1,
            offset: field === "offset" ? 104 : 105,
          });
        },
        code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
        status: 503,
        details: ["row=105"],
      })),
      {
        label: "wrong returned ordinal",
        mutate: (harness) => {
          harness.appearanceCatalog.listEffectivePlaceablesTwoDaRows.mockResolvedValueOnce({
            descriptor: effectivePlaceablesDescriptor(),
            items: [{ rowIndex: 104, displayName: "Row 104", displaySource: "row_index" }],
            total: 200,
            limit: 1,
            offset: 105,
          });
        },
        code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        status: 422,
        details: ["placeable:Appearance:row=105:not_found"],
      },
      {
        label: "multiple returned rows",
        mutate: (harness) => {
          harness.appearanceCatalog.listEffectivePlaceablesTwoDaRows.mockResolvedValueOnce({
            descriptor: effectivePlaceablesDescriptor(),
            items: [
              { rowIndex: 105, displayName: "Row 105", displaySource: "row_index" },
              { rowIndex: 106, displayName: "Row 106", displaySource: "row_index" },
            ],
            total: 200,
            limit: 1,
            offset: 105,
          });
        },
        code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
        status: 422,
        details: ["placeable:Appearance:row=105:not_found"],
      },
    ];

    for (const scenario of cases) {
      const harness = createHarness({ placeableTransform: true, itemTransform: true });
      retainAppearanceMutation(harness);
      scenario.mutate(harness);
      await expect(compile(harness)).rejects.toMatchObject({
        code: scenario.code,
        status: scenario.status,
        ...(scenario.details ? { details: scenario.details } : {}),
        ...(scenario.message ? { message: scenario.message } : {}),
      });
      expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
    }
  });

  it("compiles one paired-GIC Placeable editor Comment while preserving every source GIT byte", async () => {
    const harness = createHarness({ placeableTransform: true, itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      provenance: { sourceGicSha256?: string };
      editableScene: {
        objects: Array<{
          kind: string;
          source: { placeableEditorComment?: string };
          placeableProperties?: { comments?: string };
        }>;
      };
    };
    payload.provenance.sourceGicSha256 = sha256(harness.contents[`${AREA}.gic`]);
    const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
    placeable.source.placeableEditorComment = "Placeable List";
    placeable.placeableProperties!.comments = "  west wall note  ";
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      sourceGicSha256: sha256(harness.contents[`${AREA}.gic`]),
      candidateGitSha256: sha256(harness.contents[`${AREA}.git`]),
      totalPropertyUpdated: 1,
      totalTransformed: 0,
      totalDeleted: 0,
      totalAdded: 0,
      propertyUpdatedCounts: expect.objectContaining({ placeable: 1 }),
      blueprintSources: [],
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(git.bytes).toEqual(harness.contents[`${AREA}.git`]);
    expect(gic.bytes).not.toEqual(harness.contents[`${AREA}.gic`]);
    expect(candidate.objectMutation).toMatchObject({ candidateGicSha256: gic.sha256 });
    expect(git.sha256).toBe(sha256(harness.contents[`${AREA}.git`]));
    expect(gic.sha256).not.toBe(sha256(harness.contents[`${AREA}.gic`]));
    const comment = parseRawGffDocument(gic.bytes)!.fields
      .find((field) => field.label === "Placeable List");
    expect(comment).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Comment", type: "cexostring", value: "  west wall note  " },
        ]),
      })],
    });
    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
  });

  it("compiles one paired-GIC Store editor Comment while preserving every source GIT byte", async () => {
    const harness = createHarness({ storeTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      provenance: { sourceGicSha256?: string };
      editableScene: {
        objects: Array<{
          kind: string;
          source: { sourceIndex?: number; storeEditorComment?: string };
          storeProperties?: { comments?: string };
        }>;
      };
    };
    payload.provenance.sourceGicSha256 = sha256(harness.contents[`${AREA}.gic`]);
    const store = payload.editableScene.objects.find((object) => object.kind === "stores")!;
    Object.assign(store, { x: 4.29145, y: 5.0394, z: 0, bearing: Math.PI * 1.5 });
    store.source.sourceIndex = 0;
    store.source.storeEditorComment = "StoreList";
    store.storeProperties = { comments: "  west store note  " };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      sourceGicSha256: sha256(harness.contents[`${AREA}.gic`]),
      candidateGitSha256: sha256(harness.contents[`${AREA}.git`]),
      totalPropertyUpdated: 1,
      totalTransformed: 0,
      totalDeleted: 0,
      totalAdded: 0,
      propertyUpdatedCounts: expect.objectContaining({ store: 1 }),
      blueprintSources: [],
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(git.bytes).toEqual(harness.contents[`${AREA}.git`]);
    expect(gic.bytes).not.toEqual(harness.contents[`${AREA}.gic`]);
    expect(candidate.objectMutation).toMatchObject({ candidateGicSha256: gic.sha256 });
    const storeList = parseRawGffDocument(gic.bytes)!.fields
      .find((field) => field.label === "StoreList");
    expect(storeList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Comment", type: "cexostring", value: "  west store note  " },
        ]),
      })],
    });
    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
  });

  it("compiles one paired-GIC Encounter editor Comment while preserving every source GIT byte", async () => {
    const harness = createHarness({ encounterTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as any;
    payload.provenance.sourceGicSha256 = sha256(harness.contents[`${AREA}.gic`]);
    const encounter = payload.editableScene.objects.find(
      (object: any) => object.kind === "encounters",
    )!;
    encounter.source.sourceIndex = 0;
    encounter.source.encounterEditorComment = "Encounter List";
    encounter.encounterProperties = { comments: "  west encounter note  " };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(git.bytes).toEqual(harness.contents[`${AREA}.git`]);
    expect(gic.bytes).not.toEqual(harness.contents[`${AREA}.gic`]);
    expect(candidate.objectMutation).toMatchObject({
      sourceGicSha256: sha256(harness.contents[`${AREA}.gic`]),
      candidateGitSha256: sha256(harness.contents[`${AREA}.git`]),
      candidateGicSha256: gic.sha256,
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
    });
    expect(parseRawGffDocument(gic.bytes)!.fields.find(
      (field) => field.label === "Encounter List",
    )).toMatchObject({
      type: "list",
      value: [expect.objectContaining({ fields: expect.arrayContaining([
        { label: "Comment", type: "cexostring", value: "  west encounter note  " },
      ]) })],
    });
    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
  });

  it("compiles and reads back one structural Encounter SpawnPointList CAS", async () => {
    const harness = createHarness({ encounterTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as any;
    const encounter = payload.editableScene.objects.find(
      (object: any) => object.kind === "encounters",
    )!;
    encounter.source.sourceIndex = 0;
    encounter.source.encounterSpawnPoints = { expectedEntries: [] };
    encounter.encounterProperties = {
      ...encounter.encounterProperties,
      spawnPoints: [
        { nativeX: 22.5, nativeY: 45.25, nativeZ: 0, orientation: 1.5 },
        { nativeX: -3.75, nativeY: 9.5, nativeZ: 0.125, orientation: -2.25 },
      ],
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(git.bytes).not.toEqual(harness.contents[`${AREA}.git`]);
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    expect(candidate.objectMutation).toMatchObject({
      candidateGitSha256: git.sha256,
      candidateGicSha256: sha256(harness.contents[`${AREA}.gic`]),
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
    });
    const encounterList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Encounter List",
    );
    expect(encounterList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({ fields: expect.arrayContaining([{
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
      }]) })],
    });
    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
  });

  it("compiles one exact Store commerce CAS while preserving GIC and module IFO bytes", async () => {
    const harness = createHarness({ storeTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          source: {
            sourceIndex?: number;
            storeCommerce?: {
              markUp: number;
              markDown: number;
              blackMarket: boolean;
              blackMarketMarkDown: number;
              identifyPrice: number;
              maxBuyPrice: number;
              storeGold: number;
            };
          };
          storeProperties?: {
            commerce?: {
              markUp: number;
              markDown: number;
              blackMarket: boolean;
              blackMarketMarkDown: number;
              identifyPrice: number;
              maxBuyPrice: number;
              storeGold: number;
            };
          };
        }>;
      };
    };
    const store = payload.editableScene.objects.find((object) => object.kind === "stores")!;
    Object.assign(store, { x: 4.29145, y: 5.0394, z: 0, bearing: Math.PI * 1.5 });
    store.source.sourceIndex = 0;
    store.source.storeCommerce = {
      markUp: 100,
      markDown: 65,
      blackMarket: false,
      blackMarketMarkDown: 25,
      identifyPrice: 100,
      maxBuyPrice: -1,
      storeGold: -1,
    };
    store.storeProperties = {
      commerce: {
        markUp: 125,
        markDown: 70,
        blackMarket: true,
        blackMarketMarkDown: 30,
        identifyPrice: 150,
        maxBuyPrice: 5000,
        storeGold: 20000,
      },
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      sourceGitSha256: sha256(harness.contents[`${AREA}.git`]),
      totalPropertyUpdated: 1,
      totalTransformed: 0,
      totalDeleted: 0,
      totalAdded: 0,
      propertyUpdatedCounts: expect.objectContaining({ store: 1 }),
      blueprintSources: [],
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(git.bytes).not.toEqual(harness.contents[`${AREA}.git`]);
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    expect(candidate.moduleIfo.baselineBytes).toEqual(harness.contents["module.ifo"]);
    expect(candidate.moduleIfo.candidateBytes).toEqual(harness.contents["module.ifo"]);
    expect(candidate.resources.map((resource) => resource.extension)).toEqual(["are", "git", "gic"]);
    const storeList = parseRawGffDocument(git.bytes)!.fields
      .find((field) => field.label === "StoreList");
    expect(storeList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "MarkUp", type: "int", value: 125 },
          { label: "MarkDown", type: "int", value: 70 },
          { label: "BlackMarket", type: "byte", value: 1 },
          { label: "BM_MarkDown", type: "int", value: 30 },
          { label: "IdentifyPrice", type: "int", value: 150 },
          { label: "MaxBuyPrice", type: "int", value: 5000 },
          { label: "StoreGold", type: "int", value: 20000 },
        ]),
      })],
    });
    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
    expect(harness.storeCommerceTelemetry.emit.mock.calls.map(([event]) => ({
      eventName: event.eventName,
      operation: event.operation,
      outcome: event.outcome,
      resultCode: event.resultCode,
      changedFieldCount: event.changedFieldCount,
      durationIsBounded: Number.isInteger(event.durationMs) && event.durationMs >= 0,
    }))).toEqual([
      {
        eventName: "area_store_commerce_cas.v1",
        operation: "parse_source",
        outcome: "succeeded",
        resultCode: "source_vector_parsed",
        changedFieldCount: 7,
        durationIsBounded: true,
      },
      {
        eventName: "area_store_commerce_cas.v1",
        operation: "admit_profile",
        outcome: "succeeded",
        resultCode: "complete_vector_admitted",
        changedFieldCount: 7,
        durationIsBounded: true,
      },
      {
        eventName: "area_store_commerce_cas.v1",
        operation: "plan",
        outcome: "succeeded",
        resultCode: "cas_planned",
        changedFieldCount: 7,
        durationIsBounded: true,
      },
      {
        eventName: "area_store_commerce_cas.v1",
        operation: "write",
        outcome: "succeeded",
        resultCode: "git_vector_written",
        changedFieldCount: 7,
        durationIsBounded: true,
      },
      {
        eventName: "area_store_commerce_cas.v1",
        operation: "readback",
        outcome: "succeeded",
        resultCode: "candidate_vector_verified",
        changedFieldCount: 7,
        durationIsBounded: true,
      },
    ]);
    for (const [event] of harness.storeCommerceTelemetry.emit.mock.calls) {
      expect(Object.keys(event).sort()).toEqual([
        "changedFieldCount",
        "durationMs",
        "eventName",
        "operation",
        "outcome",
        "resultCode",
      ]);
    }
  });

  it("keeps Store commerce compilation successful when its telemetry sink throws", async () => {
    const harness = createHarness({ storeTransform: true });
    harness.drafts.read.mockResolvedValueOnce(storeCommerceDraft(harness));
    harness.storeCommerceTelemetry.emit.mockImplementation(() => {
      throw new Error("telemetry unavailable");
    });

    await expect(compile(harness)).resolves.toMatchObject({
      objectMutation: { totalPropertyUpdated: 1 },
    });
    expect(harness.storeCommerceTelemetry.emit).toHaveBeenCalledTimes(5);
  });

  it("emits one content-free failed Store commerce planning event for stale GIT", async () => {
    const harness = createHarness({ storeTransform: true, staleGitProvenance: true });
    harness.drafts.read.mockResolvedValueOnce(storeCommerceDraft(harness));

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
    });
    expect(harness.storeCommerceTelemetry.emit).toHaveBeenCalledTimes(1);
    expect(harness.storeCommerceTelemetry.emit).toHaveBeenCalledWith({
      eventName: "area_store_commerce_cas.v1",
      operation: "plan",
      outcome: "failed",
      resultCode: "source_git_stale",
      changedFieldCount: 1,
      durationMs: expect.any(Number),
    });
  });

  it("re-resolves effective creature UTCs and compiles one structural Encounter CreatureList CAS", async () => {
    const harness = createHarness({ encounterTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as any;
    const encounter = payload.editableScene.objects.find(
      (object: any) => object.kind === "encounters",
    )!;
    const expectedEntries = [
      {
        sourceIndex: 0, appearance: 388, challengeRating: 1,
        resRef: "nw_gnoll001", singleSpawnByte: 0,
      },
      {
        sourceIndex: 1, appearance: 389, challengeRating: 3,
        resRef: "nw_gnoll002", singleSpawnByte: 1,
      },
    ];
    const blueprintBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "nw_wolf001" },
      { label: "Appearance_Type", type: "word", value: 225 },
      { label: "ChallengeRating", type: "float", value: Math.fround(2.5) },
    ], "UTC ", 0xffffffff);
    const sourceSha256 = sha256(blueprintBytes);
    const sourceObjectKey = "module/catalog/creatures/nw_wolf001.utc";
    encounter.source.sourceIndex = 0;
    encounter.source.encounterCreatureList = { expectedEntries };
    encounter.encounterProperties = {
      ...encounter.encounterProperties,
      creatureList: [
        {
          entryKind: "retained",
          sourceIndex: 1,
          appearance: 389,
          challengeRating: 3,
          resRef: "nw_gnoll002",
          singleSpawn: false,
        },
        {
          entryKind: "effective_blueprint",
          sourceProfileId: "effective-catalog-utc-encounter-creature-list-v1",
          templateId: "cre_wolf_alpha",
          resRef: "nw_wolf001",
          appearance: 225,
          challengeRating: Math.fround(2.5),
          sourceObjectKey,
          sourceSizeBytes: blueprintBytes.length,
          sourceSha256,
          singleSpawn: true,
        },
      ],
    };
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce({
      kind: "creature",
      templateId: "cre_wolf_alpha",
      resref: "nw_wolf001",
      sourceObjectKey,
      sha256: sourceSha256,
      bytes: Buffer.from(blueprintBytes),
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveEffectiveTemplateBlueprint).toHaveBeenCalledWith({
      kind: "creature",
      templateId: "cre_wolf_alpha",
      sourceObjectKey,
      expectedSha256: sourceSha256,
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(candidate.resources.find((resource) => resource.extension === "are")?.bytes).toEqual(
      harness.candidateAre,
    );
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    expect(candidate.moduleIfo.baselineBytes).toEqual(harness.contents["module.ifo"]);
    expect(candidate.moduleIfo.candidateBytes).toEqual(harness.contents["module.ifo"]);
    const encounterList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Encounter List",
    ) as Extract<SupportedGffField, { type: "list" }>;
    const creatureList = encounterList.value[0]!.fields.find(
      (field) => field.label === "CreatureList",
    );
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
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
    });
  });

  it("rejects a structural Encounter CreatureList CAS when the effective creature winner is stale", async () => {
    const harness = createHarness({ encounterTransform: true });
    const blueprintBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "nw_wolf001" },
      { label: "Appearance_Type", type: "word", value: 225 },
      { label: "ChallengeRating", type: "float", value: Math.fround(2.5) },
    ], "UTC ", 0xffffffff);
    const binding = encounterCreatureListBlueprintDraft(harness, blueprintBytes);
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce(null);
    harness.drafts.read.mockResolvedValueOnce(binding.draft);

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
      message: "The effective creature blueprint changed after the draft was created.",
    });
  });

  it("rejects a structural Encounter CreatureList CAS when the UTC tuple differs from its binding", async () => {
    const harness = createHarness({ encounterTransform: true });
    const blueprintBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "nw_wolf001" },
      { label: "Appearance_Type", type: "word", value: 226 },
      { label: "ChallengeRating", type: "float", value: Math.fround(2.5) },
    ], "UTC ", 0xffffffff);
    const binding = encounterCreatureListBlueprintDraft(harness, blueprintBytes);
    harness.appearanceCatalog.resolveEffectiveTemplateBlueprint.mockResolvedValueOnce({
      kind: "creature",
      templateId: binding.templateId,
      resref: binding.resRef,
      sourceObjectKey: binding.sourceObjectKey,
      sha256: binding.sourceSha256,
      bytes: Buffer.from(blueprintBytes),
    });
    harness.drafts.read.mockResolvedValueOnce(binding.draft);

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      status: 422,
      message: "The effective creature blueprint tuple differs from the retained draft binding.",
    });
  });

  it("compiles one exact Store script-ResRef CAS while preserving GIC and module IFO bytes", async () => {
    const harness = createHarness({ storeTransform: true });
    harness.drafts.read.mockResolvedValueOnce(storeScriptResRefsDraft(harness));

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      totalTransformed: 0,
      totalDeleted: 0,
      totalAdded: 0,
      propertyUpdatedCounts: expect.objectContaining({ store: 1 }),
      blueprintSources: [],
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(git.bytes).not.toEqual(harness.contents[`${AREA}.git`]);
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    expect(candidate.moduleIfo.baselineBytes).toEqual(harness.contents["module.ifo"]);
    expect(candidate.moduleIfo.candidateBytes).toEqual(harness.contents["module.ifo"]);
    expect(candidate.resources.map((resource) => resource.extension)).toEqual(["are", "git", "gic"]);
    const storeList = parseRawGffDocument(git.bytes)!.fields
      .find((field) => field.label === "StoreList");
    expect(storeList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "OnOpenStore", type: "resref", value: "nw_store_open" },
          { label: "OnStoreClosed", type: "resref", value: "nw_store_close" },
        ]),
      })],
    });
    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
    expect(harness.storeScriptResRefsTelemetry.emit.mock.calls.map(([event]) => ({
      eventName: event.eventName,
      operation: event.operation,
      outcome: event.outcome,
      resultCode: event.resultCode,
      changedFieldCount: event.changedFieldCount,
      durationIsBounded: Number.isInteger(event.durationMs) && event.durationMs >= 0,
    }))).toEqual([
      {
        eventName: "area_store_script_resrefs_cas.v1",
        operation: "parse_source",
        outcome: "succeeded",
        resultCode: "source_vector_parsed",
        changedFieldCount: 2,
        durationIsBounded: true,
      },
      {
        eventName: "area_store_script_resrefs_cas.v1",
        operation: "admit_profile",
        outcome: "succeeded",
        resultCode: "complete_vector_admitted",
        changedFieldCount: 2,
        durationIsBounded: true,
      },
      {
        eventName: "area_store_script_resrefs_cas.v1",
        operation: "plan",
        outcome: "succeeded",
        resultCode: "cas_planned",
        changedFieldCount: 2,
        durationIsBounded: true,
      },
      {
        eventName: "area_store_script_resrefs_cas.v1",
        operation: "write",
        outcome: "succeeded",
        resultCode: "git_vector_written",
        changedFieldCount: 2,
        durationIsBounded: true,
      },
      {
        eventName: "area_store_script_resrefs_cas.v1",
        operation: "readback",
        outcome: "succeeded",
        resultCode: "candidate_vector_verified",
        changedFieldCount: 2,
        durationIsBounded: true,
      },
    ]);
    for (const [event] of harness.storeScriptResRefsTelemetry.emit.mock.calls) {
      expect(Object.keys(event).sort()).toEqual([
        "changedFieldCount",
        "durationMs",
        "eventName",
        "operation",
        "outcome",
        "resultCode",
      ]);
    }
  });

  it("keeps Store script-ResRef compilation successful when its telemetry sink throws", async () => {
    const harness = createHarness({ storeTransform: true });
    harness.drafts.read.mockResolvedValueOnce(storeScriptResRefsDraft(harness));
    harness.storeScriptResRefsTelemetry.emit.mockImplementation(() => {
      throw new Error("telemetry unavailable");
    });

    await expect(compile(harness)).resolves.toMatchObject({
      objectMutation: { totalPropertyUpdated: 1 },
    });
    expect(harness.storeScriptResRefsTelemetry.emit).toHaveBeenCalledTimes(5);
  });

  it("compiles one exact Store VarTable CAS while preserving GIC and module IFO bytes", async () => {
    const harness = createHarness({ storeTransform: true });
    harness.drafts.read.mockResolvedValueOnce(storeVariablesDraft(harness));

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      totalTransformed: 0,
      totalDeleted: 0,
      totalAdded: 0,
      propertyUpdatedCounts: expect.objectContaining({ store: 1 }),
      blueprintSources: [],
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(git.bytes).not.toEqual(harness.contents[`${AREA}.git`]);
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    expect(candidate.moduleIfo.baselineBytes).toEqual(harness.contents["module.ifo"]);
    expect(candidate.moduleIfo.candidateBytes).toEqual(harness.contents["module.ifo"]);
    const storeList = parseRawGffDocument(git.bytes)!.fields
      .find((field) => field.label === "StoreList");
    expect(storeList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([{
          label: "VarTable",
          type: "list",
          value: [
            { typeId: 0, fields: [
              { label: "Name", type: "cexostring", value: "Label" },
              { label: "Type", type: "dword", value: 3 },
              { label: "Value", type: "cexostring", value: "ready" },
            ] },
            { typeId: 0, fields: [
              { label: "Name", type: "cexostring", value: "Counter" },
              { label: "Type", type: "dword", value: 1 },
              { label: "Value", type: "int", value: -4 },
            ] },
          ],
        }]),
      })],
    });
    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
    expect(harness.storeVariableTableTelemetry.emit.mock.calls.map(([event]) => ({
      eventName: event.eventName,
      operation: event.operation,
      outcome: event.outcome,
      resultCode: event.resultCode,
      entryCount: event.entryCount,
      durationIsBounded: Number.isInteger(event.durationMs) && event.durationMs >= 0,
    }))).toEqual([
      ["parse_source", "source_vector_parsed"],
      ["admit_profile", "complete_vector_admitted"],
      ["plan", "cas_planned"],
      ["write", "git_vector_written"],
      ["readback", "candidate_vector_verified"],
    ].map(([operation, resultCode]) => ({
      eventName: "area_store_variable_table_cas.v1",
      operation,
      outcome: "succeeded",
      resultCode,
      entryCount: 2,
      durationIsBounded: true,
    })));
    for (const [event] of harness.storeVariableTableTelemetry.emit.mock.calls) {
      expect(Object.keys(event).sort()).toEqual([
        "durationMs",
        "entryCount",
        "eventName",
        "operation",
        "outcome",
        "resultCode",
      ]);
    }
  });

  it("keeps Store VarTable compilation successful when its telemetry sink throws", async () => {
    const harness = createHarness({ storeTransform: true });
    harness.drafts.read.mockResolvedValueOnce(storeVariablesDraft(harness));
    harness.storeVariableTableTelemetry.emit.mockImplementation(() => {
      throw new Error("telemetry unavailable");
    });

    await expect(compile(harness)).resolves.toMatchObject({
      objectMutation: { totalPropertyUpdated: 1 },
    });
    expect(harness.storeVariableTableTelemetry.emit).toHaveBeenCalledTimes(5);
  });

  it("compiles one catalog-bound Store restrictions CAS with six content-free events", async () => {
    const harness = createHarness({ storeTransform: true });
    harness.drafts.read.mockResolvedValueOnce(storeRestrictionsDraft(harness));

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveEffectiveItemBaseItemsTwoDaTable)
      .toHaveBeenCalledTimes(1);
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      totalTransformed: 0,
      totalDeleted: 0,
      totalAdded: 0,
      propertyUpdatedCounts: expect.objectContaining({ store: 1 }),
      blueprintSources: [],
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    expect(candidate.moduleIfo.baselineBytes).toEqual(harness.contents["module.ifo"]);
    expect(candidate.moduleIfo.candidateBytes).toEqual(harness.contents["module.ifo"]);
    const store = (parseRawGffDocument(git.bytes)!.fields
      .find((field) => field.label === "StoreList") as any).value[0];
    expect(store.fields).toEqual(expect.arrayContaining([
      {
        label: "WillNotBuy",
        type: "list",
        value: [1, 2, 1].map((value) => ({
          typeId: 0x0001_7e4d,
          fields: [{ label: "BaseItem", type: "int", value }],
        })),
      },
      {
        label: "WillOnlyBuy",
        type: "list",
        value: [{
          typeId: 0x0001_7e4d,
          fields: [{ label: "BaseItem", type: "int", value: 0 }],
        }],
      },
    ]));
    expect(harness.storeRestrictionsTelemetry.emit.mock.calls.map(([event]) => ({
      eventName: event.eventName,
      operation: event.operation,
      outcome: event.outcome,
      resultCode: event.resultCode,
      entryCount: event.entryCount,
      changedListCount: event.changedListCount,
      durationIsBounded: Number.isInteger(event.durationMs) && event.durationMs >= 0,
    }))).toEqual([
      ["parse_source", "source_pair_parsed"],
      ["bind_catalog", "catalog_bound"],
      ["admit_profile", "complete_pair_admitted"],
      ["plan", "cas_planned"],
      ["write", "git_pair_written"],
      ["readback", "candidate_pair_verified"],
    ].map(([operation, resultCode]) => ({
      eventName: "area_store_restrictions_cas.v1",
      operation,
      outcome: "succeeded",
      resultCode,
      entryCount: 4,
      changedListCount: 2,
      durationIsBounded: true,
    })));
    for (const [event] of harness.storeRestrictionsTelemetry.emit.mock.calls) {
      expect(Object.keys(event).sort()).toEqual([
        "changedListCount",
        "durationMs",
        "entryCount",
        "eventName",
        "operation",
        "outcome",
        "resultCode",
      ]);
    }
  });

  it("rejects Store restrictions when the effective baseitems.2da identity drifts", async () => {
    const harness = createHarness({ storeTransform: true });
    harness.drafts.read.mockResolvedValueOnce(storeRestrictionsDraft(harness));
    harness.appearanceCatalog.resolveEffectiveItemBaseItemsTwoDaTable.mockResolvedValueOnce({
      ...effectiveItemBaseItemsTable(),
      descriptor: {
        ...effectiveItemBaseItemsTable().descriptor,
        sha256: "f".repeat(64),
      },
    });

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
    });
    expect(harness.storeRestrictionsTelemetry.emit).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "area_store_restrictions_cas.v1",
      operation: "bind_catalog",
      outcome: "failed",
      resultCode: "catalog_stale",
    }));
  });

  it("keeps Store restrictions compilation successful when its telemetry sink throws", async () => {
    const harness = createHarness({ storeTransform: true });
    harness.drafts.read.mockResolvedValueOnce(storeRestrictionsDraft(harness));
    harness.storeRestrictionsTelemetry.emit.mockImplementation(() => {
      throw new Error("telemetry unavailable");
    });

    await expect(compile(harness)).resolves.toMatchObject({
      objectMutation: { totalPropertyUpdated: 1 },
    });
    expect(harness.storeRestrictionsTelemetry.emit).toHaveBeenCalledTimes(6);
  });

  it("compiles one catalog-bound retained Store inventory CAS with seven content-free events", async () => {
    const harness = createHarness({ storeTransform: true, storeInventory: true });
    harness.drafts.read.mockResolvedValueOnce(storeInventoryDraft(harness));

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveEffectiveItemBaseItemsTwoDaTable)
      .toHaveBeenCalledTimes(1);
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      totalTransformed: 0,
      totalDeleted: 0,
      totalAdded: 0,
      propertyUpdatedCounts: expect.objectContaining({ store: 1 }),
      blueprintSources: [],
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const store = (parseRawGffDocument(git.bytes)!.fields
      .find((field) => field.label === "StoreList") as any).value[0];
    const buckets = store.fields.find((field: Record<string, unknown>) =>
      field.label === "StoreList").value;
    expect(buckets.map((bucket: Record<string, unknown>) => bucket.typeId))
      .toEqual([0, 4, 2, 3, 1]);
    const entries = buckets[0].fields[0].value;
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      typeId: 0,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "itm_b" },
        { label: "BaseItem", type: "int", value: 1 },
        { label: "OpaqueB", type: "cexostring", value: "preserve-b" },
        { label: "Repos_PosX", type: "word", value: 0 },
        { label: "Repos_Posy", type: "word", value: 0 },
        { label: "Infinite", type: "byte", value: 1 },
      ],
    });
    expect(entries[1]).toMatchObject({
      typeId: 1,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "itm_a" },
        { label: "BaseItem", type: "int", value: 0 },
        { label: "OpaqueA", type: "int", value: 77 },
        { label: "Repos_PosX", type: "word", value: 1 },
        { label: "Repos_Posy", type: "word", value: 0 },
      ],
    });
    expect(harness.storeInventoryTelemetry.emit.mock.calls.map(([event]) => ({
      eventName: event.eventName,
      operation: event.operation,
      outcome: event.outcome,
      resultCode: event.resultCode,
      bucketCount: event.bucketCount,
      entryCount: event.entryCount,
      changedEntryCount: event.changedEntryCount,
      durationIsBounded: Number.isInteger(event.durationMs) && event.durationMs >= 0,
    }))).toEqual([
      ["parse_source", "five_buckets_parsed"],
      ["bind_catalog", "catalog_bound"],
      ["admit_profile", "complete_inventory_admitted"],
      ["plan", "cas_planned"],
      ["pack", "repository_packed"],
      ["write", "git_inventory_written"],
      ["readback", "candidate_inventory_verified"],
    ].map(([operation, resultCode]) => ({
      eventName: "area_store_inventory_cas.v1",
      operation,
      outcome: "succeeded",
      resultCode,
      bucketCount: 5,
      entryCount: 2,
      changedEntryCount: 2,
      durationIsBounded: true,
    })));
    for (const [event] of harness.storeInventoryTelemetry.emit.mock.calls) {
      expect(Object.keys(event).sort()).toEqual([
        "bucketCount",
        "changedEntryCount",
        "durationMs",
        "entryCount",
        "eventName",
        "operation",
        "outcome",
        "resultCode",
      ]);
    }
  });

  it("rejects retained Store inventory when an effective slot dimension drifts", async () => {
    const harness = createHarness({ storeTransform: true, storeInventory: true });
    harness.drafts.read.mockResolvedValueOnce(storeInventoryDraft(harness));
    const table = effectiveItemBaseItemsTable();
    harness.appearanceCatalog.resolveEffectiveItemBaseItemsTwoDaTable.mockResolvedValueOnce({
      ...table,
      rows: table.rows.map((row) => row.rowIndex === 0
        ? { ...row, invSlotWidth: 2 }
        : row),
    });

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
    });
    expect(harness.storeInventoryTelemetry.emit).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "area_store_inventory_cas.v1",
      operation: "bind_catalog",
      outcome: "failed",
      resultCode: "catalog_stale",
    }));
  });

  it("keeps retained Store inventory compilation successful when telemetry throws", async () => {
    const harness = createHarness({ storeTransform: true, storeInventory: true });
    harness.drafts.read.mockResolvedValueOnce(storeInventoryDraft(harness));
    harness.storeInventoryTelemetry.emit.mockImplementation(() => {
      throw new Error("telemetry unavailable");
    });

    await expect(compile(harness)).resolves.toMatchObject({
      objectMutation: { totalPropertyUpdated: 1 },
    });
    expect(harness.storeInventoryTelemetry.emit).toHaveBeenCalledTimes(7);
  });

  it("rejects stale paired-GIC provenance before planning a Placeable editor Comment", async () => {
    const harness = createHarness({ placeableTransform: true, itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      provenance: { sourceGicSha256?: string };
      editableScene: {
        objects: Array<{
          kind: string;
          source: { placeableEditorComment?: string };
          placeableProperties?: { comments?: string };
        }>;
      };
    };
    payload.provenance.sourceGicSha256 = "f".repeat(64);
    const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
    placeable.source.placeableEditorComment = "Placeable List";
    placeable.placeableProperties!.comments = "changed";
    harness.drafts.read.mockResolvedValueOnce(mutated);

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
      message: "The source GIC changed after the draft was opened.",
      details: [
        `expected=${"f".repeat(64)}`,
        `actual=${sha256(harness.contents[`${AREA}.gic`])}`,
      ],
    });
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
  });

  it("compiles provenance-bound existing-placeable Conversation and Interruptable updates with exact receipt counts", async () => {
    const harness = createHarness({ placeableTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          source: {
            placeableConversation?: string;
            placeableInterruptable?: number;
          };
          placeableProperties?: {
            advancedSettings?: { conversation?: string; noInterrupt?: boolean };
          };
        }>;
      };
    };
    const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
    Object.assign(placeable.source, {
      placeableConversation: "",
      placeableInterruptable: 1,
    });
    placeable.placeableProperties!.advancedSettings = {
      conversation: "chest_dialog",
      noInterrupt: true,
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ placeable: 1 }),
      blueprintSources: [],
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const placeableList = parseRawGffDocument(git.bytes)!.fields.find(
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
  });

  it("compiles an ordinal-bound Placeable TemplateResRef update without blueprint resolution", async () => {
    const harness = createHarness({ placeableTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          resRef: string;
          source: { placeableTemplateResRef?: string };
          placeableProperties?: {
            advancedSettings?: { blueprintResRef?: string };
          };
        }>;
      };
    };
    const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
    const rendererResRef = placeable.resRef;
    placeable.source.placeableTemplateResRef = "plc_chest";
    placeable.placeableProperties!.advancedSettings = {
      ...(placeable.placeableProperties!.advancedSettings ?? {}),
      blueprintResRef: "plc_chest_alt",
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(placeable.resRef).toBe(rendererResRef);
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ placeable: 1 }),
      blueprintSources: [],
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const placeableList = parseRawGffDocument(git.bytes)!.fields.find(
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
    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
  });

  it("compiles provenance-bound existing-placeable trap updates into the six exact native Bytes", async () => {
    const harness = createHarness({ placeableTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          source: { placeableTrapSettings?: Record<string, boolean | number> };
          placeableProperties?: { trapSettings?: Record<string, boolean | number | string> };
        }>;
      };
    };
    const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
    placeable.source.placeableTrapSettings = {
      isTrapped: false,
      detectable: true,
      disarmable: true,
      oneShot: true,
      detectionDc: 0,
      disarmDc: 15,
    };
    Object.assign(placeable.placeableProperties!.trapSettings!, {
      isTrapped: true,
      detectable: false,
      disarmable: false,
      oneShot: false,
      detectionDc: 25,
      disarmDc: 30,
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ placeable: 1 }),
      blueprintSources: [],
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const placeableList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "TrapFlag", type: "byte", value: 1 },
          { label: "TrapDetectable", type: "byte", value: 0 },
          { label: "TrapDisarmable", type: "byte", value: 0 },
          { label: "TrapOneShot", type: "byte", value: 0 },
          { label: "TrapDetectDC", type: "byte", value: 25 },
          { label: "DisarmDC", type: "byte", value: 30 },
        ]),
      })],
    });
  });

  it("resolves and compiles an admitted UTI blueprint nested in a Placeable ItemList mutation", async () => {
    const harness = createHarness({ placeableTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const blueprintBytes = itemBlueprintFixture();
    const blueprintSha256 = sha256(blueprintBytes);
    harness.blueprints.resolve.mockResolvedValueOnce({
      sourceKind: "item",
      sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
      templateResRef: "nw_cloth022",
      sha256: blueprintSha256,
      bytes: Buffer.from(blueprintBytes),
    });
    const objects = (mutated.draft.payload as unknown as {
      editableScene: { objects: Array<Record<string, unknown>> };
    }).editableScene.objects;
    const placeable = objects.find((object) => object.kind === "placeables")! as {
      source: Record<string, unknown>;
      placeableProperties: Record<string, unknown>;
    };
    placeable.source.placeableInventoryItems = [];
    placeable.placeableProperties.inventoryItems = [{
      resRef: "nw_cloth022",
      itemResRef: "nw_cloth022",
      itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
      itemSourceFingerprint: blueprintSha256,
      x: 7,
      y: 8,
    }];
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).toHaveBeenCalledWith({
      sourceKind: "item",
      sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
      templateResRef: "nw_cloth022",
      expectedSha256: blueprintSha256,
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const placeableList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([{
          label: "ItemList",
          type: "list",
          value: [expect.objectContaining({
            typeId: 0,
            fields: expect.arrayContaining([
              { label: "TemplateResRef", type: "resref", value: "nw_cloth022" },
              { label: "Repos_PosX", type: "word", value: 7 },
              { label: "Repos_Posy", type: "word", value: 8 },
            ]),
          })],
        }]),
      })],
    });
    expect(candidate.objectMutation?.blueprintSources).toContainEqual({
      sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
      templateResRef: "nw_cloth022",
      sourceSha256: blueprintSha256,
      addedCount: 1,
    });
  });

  it("resolves only new UTI entries in a mixed retained/new Placeable ItemList", async () => {
    const harness = createHarness({ placeableTransform: true, placeableInventory: true });
    const mutated = structuredClone(harness.snapshot);
    const blueprintBytes = itemBlueprintFixture();
    const blueprintSha256 = sha256(blueprintBytes);
    harness.blueprints.resolve.mockResolvedValueOnce({
      sourceKind: "item",
      sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
      templateResRef: "nw_cloth022",
      sha256: blueprintSha256,
      bytes: Buffer.from(blueprintBytes),
    });
    const objects = (mutated.draft.payload as unknown as {
      editableScene: { objects: Array<Record<string, unknown>> };
    }).editableScene.objects;
    const placeable = objects.find((object) => object.kind === "placeables")! as {
      source: Record<string, unknown>;
      placeableProperties: Record<string, unknown>;
    };
    placeable.source.placeableInventoryItems = [
      { sourceIndex: 0, resRef: "first_item", x: 2, y: 3 },
    ];
    placeable.placeableProperties.inventoryItems = [
      { sourceIndex: 0, resRef: "first_item", x: 4, y: 5 },
      {
        resRef: "nw_cloth022",
        itemResRef: "nw_cloth022",
        itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
        itemSourceFingerprint: blueprintSha256,
        x: 7,
        y: 8,
      },
    ];
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).toHaveBeenCalledTimes(1);
    expect(candidate.objectMutation?.blueprintSources).toEqual([{
      sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
      templateResRef: "nw_cloth022",
      sourceSha256: blueprintSha256,
      addedCount: 1,
    }]);
  });

  it("resolves and compiles an admitted UTI blueprint nested in a Creature ItemList mutation", async () => {
    const harness = createHarness({ itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const blueprintBytes = itemBlueprintFixture();
    const blueprintSha256 = sha256(blueprintBytes);
    harness.blueprints.resolve.mockResolvedValueOnce({
      sourceKind: "item",
      sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
      templateResRef: "nw_cloth022",
      sha256: blueprintSha256,
      bytes: Buffer.from(blueprintBytes),
    });
    const objects = (mutated.draft.payload as unknown as {
      editableScene: { objects: Array<Record<string, unknown>> };
    }).editableScene.objects;
    const creature = objects.find((object) => object.kind === "creatures")! as {
      source: Record<string, unknown>;
      creatureProperties?: Record<string, unknown>;
    };
    creature.source.sourceIndex = 0;
    creature.source.creatureInventoryItems = [];
    creature.creatureProperties = {
      inventoryItems: [{
        resRef: "nw_cloth022",
        itemResRef: "nw_cloth022",
        itemSourceObjectKey: "nwn-base-key-uti-nw-cloth022-v1",
        itemSourceFingerprint: blueprintSha256,
        x: 13,
        y: 14,
        dropable: true,
        pickpocketable: false,
      }],
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).toHaveBeenCalledWith({
      sourceKind: "item",
      sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
      templateResRef: "nw_cloth022",
      expectedSha256: blueprintSha256,
    });
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const creatureList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Creature List",
    );
    expect(creatureList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([{
          label: "ItemList",
          type: "list",
          value: [expect.objectContaining({
            typeId: 0,
            fields: expect.arrayContaining([
              { label: "TemplateResRef", type: "resref", value: "nw_cloth022" },
              { label: "Repos_PosX", type: "word", value: 13 },
              { label: "Repos_Posy", type: "word", value: 14 },
              { label: "Dropable", type: "byte", value: 1 },
            ]),
          })],
        }]),
      })],
    });
    expect(candidate.objectMutation?.blueprintSources).toContainEqual({
      sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
      templateResRef: "nw_cloth022",
      sourceSha256: blueprintSha256,
      addedCount: 1,
    });
  });

  it("compiles a retained Creature Equip_ItemList change without resolving a new blueprint", async () => {
    const harness = createHarness({ creatureEquipment: true, itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const objects = (mutated.draft.payload as unknown as {
      editableScene: { objects: Array<Record<string, any>> };
    }).editableScene.objects;
    const creature = objects.find((object) => object.kind === "creatures")!;
    const equipmentEntries = [{
      sourceIndex: 0,
      resRef: "nw_helm001",
      slotMask: 1,
      dropable: false,
      pickpocketable: false,
    }];
    creature.source.sourceIndex = 0;
    creature.source.creatureEquippedItems = equipmentEntries;
    creature.creatureProperties = {
      equippedItems: [{ ...equipmentEntries[0], pickpocketable: true }],
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const creatureList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Creature List",
    );
    expect(creatureList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([{
          label: "Equip_ItemList",
          type: "list",
          value: [expect.objectContaining({
            typeId: 1,
            fields: expect.arrayContaining([
              { label: "TemplateResRef", type: "resref", value: "nw_helm001" },
              { label: "Pickpocketable", type: "byte", value: 1 },
            ]),
          })],
        }]),
      })],
    });
  });

  it("compiles an exact retained Creature Tag change without resolving a blueprint", async () => {
    const harness = createHarness({ creatureEquipment: true, itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const objects = (mutated.draft.payload as unknown as {
      editableScene: { objects: Array<Record<string, any>> };
    }).editableScene.objects;
    const creature = objects.find((object) => object.kind === "creatures")!;
    creature.source.sourceIndex = 0;
    creature.source.creatureTag = { present: true, value: "NW_GUARD" };
    creature.tag = "  renamed guard  ";
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const creatureList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Creature List",
    );
    expect(creatureList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([{
          label: "Tag",
          type: "cexostring",
          value: "  renamed guard  ",
        }]),
      })],
    });
  });

  it("compiles an exact retained Creature Conversation change without resolving a blueprint", async () => {
    const harness = createHarness({ creatureEquipment: true, itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const objects = (mutated.draft.payload as unknown as {
      editableScene: { objects: Array<Record<string, any>> };
    }).editableScene.objects;
    const creature = objects.find((object) => object.kind === "creatures")!;
    creature.source.sourceIndex = 0;
    creature.source.creatureConversation = { present: true, value: "Guard_Dialog" };
    creature.creatureProperties = {
      ...(creature.creatureProperties ?? {}),
      conversation: "guard_dialog",
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
    expect(candidate.projectedDraft.objectEditing?.propertyMutations).toEqual([
      expect.objectContaining({
        kind: "creature",
        sourceIndex: 0,
        conversation: { expectedResRef: "Guard_Dialog", resRef: "guard_dialog" },
      }),
    ]);
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const creatureList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Creature List",
    );
    expect(creatureList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([{
          label: "Conversation",
          type: "resref",
          value: "guard_dialog",
        }]),
      })],
    });
  });

  it("compiles an exact retained Creature Interruptable change from No Interrupt polarity", async () => {
    const harness = createHarness({ creatureEquipment: true, itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const objects = (mutated.draft.payload as unknown as {
      editableScene: { objects: Array<Record<string, any>> };
    }).editableScene.objects;
    const creature = objects.find((object) => object.kind === "creatures")!;
    creature.source.sourceIndex = 0;
    creature.source.creatureInterruptable = { present: true, value: 1 };
    creature.creatureProperties = {
      ...(creature.creatureProperties ?? {}),
      noInterrupt: true,
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
    expect(candidate.projectedDraft.objectEditing?.propertyMutations).toEqual([
      expect.objectContaining({
        kind: "creature",
        sourceIndex: 0,
        interruptable: { expectedValue: 1, value: 0 },
      }),
    ]);
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const creatureList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Creature List",
    );
    expect(creatureList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([{
          label: "Interruptable",
          type: "byte",
          value: 0,
        }]),
      })],
    });
  });

  it("compiles retained Creature FirstName/LastName/Description without resolving a blueprint", async () => {
    const harness = createHarness({
      creatureEquipment: true,
      creatureLocalizedStrings: true,
      itemTransform: true,
    });
    const mutated = structuredClone(harness.snapshot);
    const objects = (mutated.draft.payload as unknown as {
      editableScene: { objects: Array<Record<string, any>> };
    }).editableScene.objects;
    const creature = objects.find((object) => object.kind === "creatures")!;
    creature.source.sourceIndex = 0;
    creature.source.creatureLocalizedStrings = {
      firstName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 42, textBytesBase64: "TGVnYWN5" },
          { languageId: 0, textBytesBase64: "R3VhcmQ=" },
        ],
      },
      lastName: { present: true, strRef: 0xffff_ffff, entries: [] },
      description: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "T2xkIGRlc2NyaXB0aW9u" }],
      },
    };
    creature.creatureProperties = {
      ...(creature.creatureProperties ?? {}),
      firstName: " Captain ",
      firstNameEntries: [
        { languageId: 0, text: " Captain " },
        { languageId: 2, text: "Capitaine" },
        { languageId: 42, text: "Legacy 2" },
      ],
      lastName: "Aribeth",
      lastNameEntries: [{ languageId: 0, text: "Aribeth" }],
      description: "",
      descriptionEntries: [],
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(harness.blueprints.resolve).not.toHaveBeenCalled();
    expect(candidate.projectedDraft.objectEditing?.propertyMutations).toEqual([
      expect.objectContaining({
        kind: "creature",
        sourceIndex: 0,
        localizedStrings: [
          {
            field: "FirstName",
            expectedProfile: "multi_entry_inline_ascii",
            expectedValue: "Guard",
            expectedEntries: [
              { languageId: 42, text: "Legacy" },
              { languageId: 0, text: "Guard" },
            ],
            value: " Captain ",
            valueEntries: [
              { languageId: 0, text: " Captain " },
              { languageId: 2, text: "Capitaine" },
              { languageId: 42, text: "Legacy 2" },
            ],
          },
          {
            field: "LastName",
            expectedProfile: "empty_inline_ascii",
            expectedValue: "",
            expectedEntries: [],
            value: "Aribeth",
            valueEntries: [{ languageId: 0, text: "Aribeth" }],
          },
          {
            field: "Description",
            expectedProfile: "simple_inline_ascii",
            expectedValue: "Old description",
            expectedEntries: [{ languageId: 0, text: "Old description" }],
            value: "",
            valueEntries: [],
          },
        ],
      }),
    ]);
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ creature: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const creatureList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Creature List",
    );
    expect(creatureList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "FirstName", type: "cexolocstring", value: {
            strRef: 0xffff_ffff,
            entries: [
              { languageId: 0, text: " Captain " },
              { languageId: 2, text: "Capitaine" },
              { languageId: 42, text: "Legacy 2" },
            ],
          } },
          { label: "LastName", type: "cexolocstring", value: {
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, text: "Aribeth" }],
          } },
          { label: "Description", type: "cexolocstring", value: {
            strRef: 0xffff_ffff,
            entries: [],
          } },
        ]),
      })],
    });
  });

  it("compiles provenance-bound existing-placeable lock settings into exact native Bytes", async () => {
    const harness = createHarness({ placeableTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          placeableProperties?: {
            lockSettings?: {
              locked: boolean;
              canRelock: boolean;
              autoRemoveKeyAfterUse: boolean;
              keyRequiredToUnlockOrLock: boolean;
              openLockDc: number;
              closeLockDc: number;
              keyTag: string;
            };
          };
        }>;
      };
    };
    const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
    Object.assign(placeable.placeableProperties!.lockSettings!, {
      locked: true,
      canRelock: true,
      autoRemoveKeyAfterUse: true,
      keyRequiredToUnlockOrLock: true,
      openLockDc: 24,
      closeLockDc: 12,
      keyTag: "CHEST_KEY_01",
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ placeable: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const placeableList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Placeable List",
    );
    expect(placeableList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Locked", type: "byte", value: 1 },
          { label: "Lockable", type: "byte", value: 1 },
          { label: "AutoRemoveKey", type: "byte", value: 1 },
          { label: "KeyRequired", type: "byte", value: 1 },
          { label: "OpenLockDC", type: "byte", value: 24 },
          { label: "CloseLockDC", type: "byte", value: 12 },
          { label: "KeyName", type: "cexostring", value: "CHEST_KEY_01" },
        ]),
      })],
    });
  });

  it("compiles one existing ground-item position/orientation transform without deleting its paired entry", async () => {
    const harness = createHarness({ itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: { objects: Array<{ x: number; y: number; z: number; bearing: number }> };
    };
    Object.assign(payload.editableScene.objects[1]!, {
      x: 3.5,
      y: 4.25,
      z: 0.2,
      bearing: Math.PI / 3,
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 1,
      deletedCounts: expect.objectContaining({ item: 0 }),
      transformedCounts: expect.objectContaining({ item: 1, creature: 0 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const parsed = parseRawGffDocument(git.bytes)!;
    const itemList = parsed.fields.find((field) => field.label === "List");
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

  it("compiles one exact retained ground-item Tag CAS through candidate readback", async () => {
    const harness = createHarness({ itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          tag: string;
          source: Record<string, unknown>;
        }>;
      };
    };
    const item = payload.editableScene.objects.find((entry) => entry.kind === "items")!;
    item.tag = "  WEST_WALL_LOOT  ";
    Object.assign(item.source, {
      sourceIndex: 0,
      itemTag: { present: true, value: "NW_SWORD" },
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 0,
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ item: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const itemList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "List",
    );
    expect(itemList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Tag", type: "cexostring", value: "  WEST_WALL_LOOT  " },
        ]),
      })],
    });
  });

  it("compiles one exact retained Trigger Tag CAS through candidate readback", async () => {
    const harness = createHarness({ triggerTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          tag: string;
          source: Record<string, unknown>;
        }>;
      };
    };
    const trigger = payload.editableScene.objects.find(
      (entry) => entry.kind === "triggers",
    )!;
    trigger.tag = "  AREA_EXIT  ";
    Object.assign(trigger.source, {
      sourceIndex: 0,
      triggerTag: { present: true, value: "GenericTrigger" },
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 1,
      totalPropertyUpdated: 1,
      transformedCounts: expect.objectContaining({ trigger: 1 }),
      propertyUpdatedCounts: expect.objectContaining({ trigger: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const triggerList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "TriggerList",
    );
    expect(triggerList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Tag", type: "cexostring", value: "  AREA_EXIT  " },
        ]),
      })],
    });
  });

  it("keeps Trigger trap-properties compilation successful when telemetry throws", async () => {
    const harness = createHarness({ triggerTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as any;
    const trigger = payload.editableScene.objects.find(
      (object: any) => object.kind === "triggers",
    )!;
    trigger.source.sourceIndex = 0;
    trigger.source.triggerTrapProperties = {
      trapDetectable: 1,
      trapDetectDc: 0,
      trapDisarmable: 1,
      disarmDc: 15,
      trapFlag: 0,
      trapOneShot: 1,
      trapType: 0,
    };
    trigger.triggerTrapProperties = {
      ...trigger.source.triggerTrapProperties,
      trapFlag: 1,
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);
    harness.triggerTrapPropertiesTelemetry.emit.mockImplementation(() => {
      throw new Error("telemetry unavailable");
    });

    await expect(compile(harness)).resolves.toMatchObject({
      objectMutation: { totalPropertyUpdated: 1 },
    });
    expect(harness.triggerTrapPropertiesTelemetry.emit).toHaveBeenCalledTimes(4);
  });

  it("compiles one exact retained Trigger TemplateResRef CAS through candidate readback", async () => {
    const harness = createHarness({ triggerTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          triggerTemplateResRef?: string;
          source: Record<string, unknown>;
        }>;
      };
    };
    const trigger = payload.editableScene.objects.find(
      (entry) => entry.kind === "triggers",
    )!;
    trigger.triggerTemplateResRef = "custom_trigger";
    Object.assign(trigger.source, {
      sourceIndex: 0,
      triggerTemplateResRef: {
        present: true,
        nativeType: "resref",
        value: "newgeneric",
      },
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ trigger: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const triggerList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "TriggerList",
    );
    expect(triggerList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          {
            label: "TemplateResRef",
            type: "resref",
            value: "custom_trigger",
          },
        ]),
      })],
    });
  });

  it("keeps Trigger event-script compilation successful when telemetry throws", async () => {
    const harness = createHarness({ triggerTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as any;
    const trigger = payload.editableScene.objects.find(
      (object: any) => object.kind === "triggers",
    )!;
    trigger.source.sourceIndex = 0;
    trigger.source.triggerScriptResRefsStorage = {
      onDisarm: "On_Disarm",
      onTrapTriggered: "trg_trap",
      onClick: "",
      onHeartbeat: "trg_heartbeat",
      onEnter: "trg_enter",
      onExit: "trg_exit",
      onUserDefined: "trg_user",
    };
    trigger.triggerScriptResRefs = {
      ...trigger.source.triggerScriptResRefsStorage,
      onDisarm: "on_disarm",
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);
    harness.triggerScriptResRefsTelemetry.emit.mockImplementation(() => {
      throw new Error("telemetry unavailable");
    });

    await expect(compile(harness)).resolves.toMatchObject({
      objectMutation: { totalPropertyUpdated: 1 },
    });
    expect(harness.triggerScriptResRefsTelemetry.emit).toHaveBeenCalledTimes(4);
  });

  it("compiles one exact retained inline Trigger LocalizedName CAS through candidate readback", async () => {
    const harness = createHarness({ triggerTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          triggerLocalizedName?: string;
          source: Record<string, unknown>;
        }>;
      };
    };
    const trigger = payload.editableScene.objects.find(
      (entry) => entry.kind === "triggers",
    )!;
    trigger.triggerLocalizedName = "Inner Gate Trigger";
    Object.assign(trigger.source, {
      sourceIndex: 0,
      triggerLocalizedNameStorage: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "R2F0ZSBUcmlnZ2Vy" }],
      },
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ trigger: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const triggerList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "TriggerList",
    );
    expect(triggerList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({ fields: expect.arrayContaining([{
        label: "LocalizedName",
        type: "cexolocstring",
        value: {
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, text: "Inner Gate Trigger" }],
        },
      }]) })],
    });
  });

  it("compiles one paired-GIC Trigger editor Comment while preserving every source GIT byte", async () => {
    const harness = createHarness({ triggerTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as any;
    payload.provenance.sourceGicSha256 = sha256(harness.contents[`${AREA}.gic`]);
    const trigger = payload.editableScene.objects.find(
      (object: any) => object.kind === "triggers",
    )!;
    trigger.source.sourceIndex = 0;
    trigger.source.triggerEditorComment = "TriggerList";
    trigger.triggerEditorComment = "  west gate note  ";
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(git.bytes).toEqual(harness.contents[`${AREA}.git`]);
    expect(gic.bytes).not.toEqual(harness.contents[`${AREA}.gic`]);
    expect(candidate.objectMutation).toMatchObject({
      sourceGicSha256: sha256(harness.contents[`${AREA}.gic`]),
      candidateGitSha256: sha256(harness.contents[`${AREA}.git`]),
      candidateGicSha256: gic.sha256,
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ trigger: 1 }),
    });
    const triggerList = parseRawGffDocument(gic.bytes)!.fields.find(
      (field) => field.label === "TriggerList",
    );
    expect(triggerList).toMatchObject({
      type: "list",
      value: [{
        typeId: 1,
        fields: [{
          label: "Comment",
          type: "cexostring",
          value: "  west gate note  ",
        }],
      }],
    });
  });

  it("compiles one complete retained Trigger event-script tuple through candidate readback", async () => {
    const harness = createHarness({ triggerTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as any;
    const trigger = payload.editableScene.objects.find(
      (object: any) => object.kind === "triggers",
    )!;
    const sourceScripts = {
      onDisarm: "On_Disarm",
      onTrapTriggered: "trg_trap",
      onClick: "",
      onHeartbeat: "trg_heartbeat",
      onEnter: "trg_enter",
      onExit: "trg_exit",
      onUserDefined: "trg_user",
    };
    const targetScripts = {
      ...sourceScripts,
      onDisarm: "on_disarm",
      onClick: "trg_click",
    };
    trigger.source.sourceIndex = 0;
    trigger.source.triggerScriptResRefsStorage = sourceScripts;
    trigger.triggerScriptResRefs = targetScripts;
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ trigger: 1 }),
    });
    const triggerList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "TriggerList",
    );
    expect(triggerList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "OnDisarm", type: "resref", value: "on_disarm" },
          { label: "OnTrapTriggered", type: "resref", value: "trg_trap" },
          { label: "OnClick", type: "resref", value: "trg_click" },
          { label: "ScriptHeartbeat", type: "resref", value: "trg_heartbeat" },
          { label: "ScriptOnEnter", type: "resref", value: "trg_enter" },
          { label: "ScriptOnExit", type: "resref", value: "trg_exit" },
          { label: "ScriptUserDefine", type: "resref", value: "trg_user" },
        ]),
      })],
    });
    expect(harness.triggerScriptResRefsTelemetry.emit.mock.calls.map(([event]) => ({
      ...event,
      durationMs: Number.isInteger(event.durationMs) && event.durationMs >= 0,
    }))).toEqual([
      {
        eventName: "area_trigger_script_resrefs_cas.v1",
        operation: "parse_source",
        outcome: "succeeded",
        resultCode: "source_tuple_parsed",
        changedFieldCount: 2,
        durationMs: true,
      },
      {
        eventName: "area_trigger_script_resrefs_cas.v1",
        operation: "plan",
        outcome: "succeeded",
        resultCode: "cas_planned",
        changedFieldCount: 2,
        durationMs: true,
      },
      {
        eventName: "area_trigger_script_resrefs_cas.v1",
        operation: "write",
        outcome: "succeeded",
        resultCode: "git_tuple_written",
        changedFieldCount: 2,
        durationMs: true,
      },
      {
        eventName: "area_trigger_script_resrefs_cas.v1",
        operation: "readback",
        outcome: "succeeded",
        resultCode: "candidate_tuple_verified",
        changedFieldCount: 2,
        durationMs: true,
      },
    ]);
  });

  it("compiles one exact retained Trigger transition-storage tuple through candidate readback", async () => {
    const harness = createHarness({ triggerTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as any;
    const trigger = payload.editableScene.objects.find(
      (object: any) => object.kind === "triggers",
    )!;
    const sourceTransitionStorage = {
      linkedTo: "east_gate",
      linkedToFlags: 2,
      loadScreenId: 7,
    };
    const targetTransitionStorage = {
      linkedTo: "crypt_exit",
      linkedToFlags: 4,
      loadScreenId: 321,
    };
    trigger.source.sourceIndex = 0;
    trigger.source.triggerTransitionStorage = sourceTransitionStorage;
    trigger.triggerTransitionStorage = targetTransitionStorage;
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    const are = candidate.resources.find((resource) => resource.extension === "are")!;
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    const ifo = candidate.resources.find((resource) => resource.extension === "ifo");
    expect(are.bytes).toEqual(harness.candidateAre);
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    expect(ifo).toBeUndefined();
    expect(harness.contents["module.ifo"]).toEqual(Buffer.from("preserved-ifo"));
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ trigger: 1 }),
    });
    const triggerList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "TriggerList",
    );
    expect(triggerList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "LinkedTo", type: "cexostring", value: "crypt_exit" },
          { label: "LinkedToFlags", type: "byte", value: 4 },
          { label: "LoadScreenID", type: "word", value: 321 },
        ]),
      })],
    });
    expect(harness.triggerTransitionStorageTelemetry.emit.mock.calls.map(([event]) => ({
      ...event,
      durationMs: Number.isInteger(event.durationMs) && event.durationMs >= 0,
    }))).toEqual([
      {
        eventName: "area_trigger_transition_storage_cas.v1",
        operation: "parse_source",
        outcome: "succeeded",
        resultCode: "source_tuple_parsed",
        changedFieldCount: 3,
        durationMs: true,
      },
      {
        eventName: "area_trigger_transition_storage_cas.v1",
        operation: "plan",
        outcome: "succeeded",
        resultCode: "cas_planned",
        changedFieldCount: 3,
        durationMs: true,
      },
      {
        eventName: "area_trigger_transition_storage_cas.v1",
        operation: "write",
        outcome: "succeeded",
        resultCode: "git_tuple_written",
        changedFieldCount: 3,
        durationMs: true,
      },
      {
        eventName: "area_trigger_transition_storage_cas.v1",
        operation: "readback",
        outcome: "succeeded",
        resultCode: "candidate_tuple_verified",
        changedFieldCount: 3,
        durationMs: true,
      },
    ]);
  });

  it("keeps Trigger transition-storage compilation successful when telemetry throws", async () => {
    const harness = createHarness({ triggerTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as any;
    const trigger = payload.editableScene.objects.find(
      (object: any) => object.kind === "triggers",
    )!;
    trigger.source.sourceIndex = 0;
    trigger.source.triggerTransitionStorage = {
      linkedTo: "east_gate",
      linkedToFlags: 2,
      loadScreenId: 7,
    };
    trigger.triggerTransitionStorage = {
      linkedTo: "west_gate",
      linkedToFlags: 2,
      loadScreenId: 7,
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);
    harness.triggerTransitionStorageTelemetry.emit.mockImplementation(() => {
      throw new Error("telemetry unavailable");
    });

    await expect(compile(harness)).resolves.toMatchObject({
      objectMutation: { totalPropertyUpdated: 1 },
    });
    expect(harness.triggerTransitionStorageTelemetry.emit).toHaveBeenCalledTimes(4);
  });

  it("compiles one exact retained Trigger core-properties tuple through candidate readback", async () => {
    const harness = createHarness({ triggerTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as any;
    const trigger = payload.editableScene.objects.find(
      (object: any) => object.kind === "triggers",
    )!;
    const sourceCoreProperties = {
      autoRemoveKey: 0,
      factionId: 1,
      cursorId: 0,
      highlightHeight: 0,
      keyName: "",
      portraitId: 0,
      triggerType: 0,
    };
    const targetCoreProperties = {
      autoRemoveKey: 1,
      factionId: 2,
      cursorId: 3,
      highlightHeight: Math.fround(1.5),
      keyName: "gate_key",
      portraitId: 4,
      triggerType: 1,
    };
    trigger.source.sourceIndex = 0;
    trigger.source.triggerCoreProperties = sourceCoreProperties;
    trigger.triggerCoreProperties = targetCoreProperties;
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ trigger: 1 }),
    });
    const triggerList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "TriggerList",
    );
    expect(triggerList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "AutoRemoveKey", type: "byte", value: 1 },
          { label: "Faction", type: "dword", value: 2 },
          { label: "Cursor", type: "byte", value: 3 },
          { label: "HighlightHeight", type: "float", value: 1.5 },
          { label: "KeyName", type: "cexostring", value: "gate_key" },
          { label: "PortraitId", type: "word", value: 4 },
          { label: "Type", type: "int", value: 1 },
        ]),
      })],
    });
    expect(harness.triggerCorePropertiesTelemetry.emit.mock.calls.map(([event]) => ({
      ...event,
      durationMs: Number.isInteger(event.durationMs) && event.durationMs >= 0,
    }))).toEqual([
      ["parse_source", "source_tuple_parsed"],
      ["plan", "cas_planned"],
      ["write", "git_tuple_written"],
      ["readback", "candidate_tuple_verified"],
    ].map(([operation, resultCode]) => ({
      eventName: "area_trigger_core_properties_cas.v1",
      operation,
      outcome: "succeeded",
      resultCode,
      changedFieldCount: 7,
      durationMs: true,
    })));
  });

  it("keeps Trigger core-properties compilation successful when telemetry throws", async () => {
    const harness = createHarness({ triggerTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as any;
    const trigger = payload.editableScene.objects.find(
      (object: any) => object.kind === "triggers",
    )!;
    trigger.source.sourceIndex = 0;
    trigger.source.triggerCoreProperties = {
      autoRemoveKey: 0,
      factionId: 1,
      cursorId: 0,
      highlightHeight: 0,
      keyName: "",
      portraitId: 0,
      triggerType: 0,
    };
    trigger.triggerCoreProperties = {
      ...trigger.source.triggerCoreProperties,
      autoRemoveKey: 1,
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);
    harness.triggerCorePropertiesTelemetry.emit.mockImplementation(() => {
      throw new Error("telemetry unavailable");
    });

    await expect(compile(harness)).resolves.toMatchObject({
      objectMutation: { totalPropertyUpdated: 1 },
    });
    expect(harness.triggerCorePropertiesTelemetry.emit).toHaveBeenCalledTimes(4);
  });

  it("compiles one exact retained Trigger trap-properties tuple through candidate readback", async () => {
    const harness = createHarness({ triggerTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as any;
    const trigger = payload.editableScene.objects.find(
      (object: any) => object.kind === "triggers",
    )!;
    const sourceTrapProperties = {
      trapDetectable: 1,
      trapDetectDc: 0,
      trapDisarmable: 1,
      disarmDc: 15,
      trapFlag: 0,
      trapOneShot: 1,
      trapType: 0,
    };
    const targetTrapProperties = {
      trapDetectable: 0,
      trapDetectDc: 17,
      trapDisarmable: 0,
      disarmDc: 23,
      trapFlag: 1,
      trapOneShot: 0,
      trapType: 7,
    };
    trigger.source.sourceIndex = 0;
    trigger.source.triggerTrapProperties = sourceTrapProperties;
    trigger.triggerTrapProperties = targetTrapProperties;
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ trigger: 1 }),
    });
    const triggerList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "TriggerList",
    );
    expect(triggerList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "TrapDetectable", type: "byte", value: 0 },
          { label: "TrapDetectDC", type: "byte", value: 17 },
          { label: "TrapDisarmable", type: "byte", value: 0 },
          { label: "DisarmDC", type: "byte", value: 23 },
          { label: "TrapFlag", type: "byte", value: 1 },
          { label: "TrapOneShot", type: "byte", value: 0 },
          { label: "TrapType", type: "byte", value: 7 },
        ]),
      })],
    });
    expect(harness.triggerTrapPropertiesTelemetry.emit.mock.calls.map(([event]) => ({
      ...event,
      durationMs: Number.isInteger(event.durationMs) && event.durationMs >= 0,
    }))).toEqual([
      ["parse_source", "source_tuple_parsed"],
      ["plan", "cas_planned"],
      ["write", "git_tuple_written"],
      ["readback", "candidate_tuple_verified"],
    ].map(([operation, resultCode]) => ({
      eventName: "area_trigger_trap_properties_cas.v1",
      operation,
      outcome: "succeeded",
      resultCode,
      changedFieldCount: 7,
      durationMs: true,
    })));
  });

  it("compiles one exact retained Trigger VarTable CAS through candidate readback", async () => {
    const harness = createHarness({ triggerTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as any;
    const trigger = payload.editableScene.objects.find(
      (object: any) => object.kind === "triggers",
    )!;
    trigger.source.sourceIndex = 0;
    trigger.source.triggerVariables = { expectedEntries: [] };
    trigger.triggerVariables = [
      { name: "DoorState", type: "string", value: "locked" },
      { name: "AttemptCount", type: "int", value: 2 },
    ];
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ trigger: 1 }),
    });
    const triggerList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "TriggerList",
    );
    expect(triggerList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([{
          label: "VarTable",
          type: "list",
          value: [
            { typeId: 0, fields: [
              { label: "Name", type: "cexostring", value: "DoorState" },
              { label: "Type", type: "dword", value: 3 },
              { label: "Value", type: "cexostring", value: "locked" },
            ] },
            { typeId: 0, fields: [
              { label: "Name", type: "cexostring", value: "AttemptCount" },
              { label: "Type", type: "dword", value: 1 },
              { label: "Value", type: "int", value: 2 },
            ] },
          ],
        }]),
      })],
    });
    expect(harness.triggerVariableTableTelemetry.emit.mock.calls.map(([event]) => ({
      ...event,
      durationMs: Number.isInteger(event.durationMs) && event.durationMs >= 0,
    }))).toEqual([
      ["parse_source", "source_vector_parsed"],
      ["plan", "cas_planned"],
      ["write", "git_vector_written"],
      ["readback", "candidate_vector_verified"],
    ].map(([operation, resultCode]) => ({
      eventName: "area_trigger_variable_table_cas.v1",
      operation,
      outcome: "succeeded",
      resultCode,
      changedEntryCount: 2,
      durationMs: true,
    })));
    for (const [event] of harness.triggerVariableTableTelemetry.emit.mock.calls) {
      expect(Object.keys(event).sort()).toEqual([
        "changedEntryCount",
        "durationMs",
        "eventName",
        "operation",
        "outcome",
        "resultCode",
      ]);
    }
  });

  it("keeps Trigger VarTable compilation successful when telemetry throws", async () => {
    const harness = createHarness({ triggerTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as any;
    const trigger = payload.editableScene.objects.find(
      (object: any) => object.kind === "triggers",
    )!;
    trigger.source.sourceIndex = 0;
    trigger.source.triggerVariables = { expectedEntries: [] };
    trigger.triggerVariables = [{ name: "Ready", type: "int", value: 1 }];
    harness.drafts.read.mockResolvedValueOnce(mutated);
    harness.triggerVariableTableTelemetry.emit.mockImplementation(() => {
      throw new Error("telemetry unavailable");
    });

    await expect(compile(harness)).resolves.toMatchObject({
      objectMutation: { totalPropertyUpdated: 1 },
    });
    expect(harness.triggerVariableTableTelemetry.emit).toHaveBeenCalledTimes(4);
  });

  it("compiles one exact retained Waypoint Tag CAS with concurrent fixture changes through candidate readback", async () => {
    const harness = createHarness({ waypointTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          tag: string;
          source: Record<string, unknown>;
        }>;
      };
    };
    const waypoint = payload.editableScene.objects.find(
      (entry) => entry.kind === "waypoints",
    )!;
    waypoint.tag = "  PATROL_POINT_01  ";
    Object.assign(waypoint.source, {
      sourceIndex: 0,
      waypointTag: { present: true, value: "WAYPOINT" },
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 1,
      totalTransformed: 1,
      totalPropertyUpdated: 1,
      transformedCounts: expect.objectContaining({ waypoint: 1 }),
      propertyUpdatedCounts: expect.objectContaining({ waypoint: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const waypointList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "WaypointList",
    );
    expect(waypointList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Tag", type: "cexostring", value: "  PATROL_POINT_01  " },
        ]),
      })],
    });
  });

  it("compiles one exact retained Waypoint TemplateResRef CAS through whole-candidate readback", async () => {
    const harness = createHarness({ waypointTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          resRef: string;
          waypointTemplateResRef?: string;
          source: Record<string, unknown>;
        }>;
      };
    };
    const waypoint = payload.editableScene.objects.find(
      (entry) => entry.kind === "waypoints",
    )!;
    waypoint.waypointTemplateResRef = "custom_waypoint";
    Object.assign(waypoint.source, {
      sourceIndex: 0,
      waypointTemplateResRef: {
        present: true,
        nativeType: "resref",
        value: "nw_waypoint001",
      },
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 1,
      totalTransformed: 1,
      totalPropertyUpdated: 1,
      transformedCounts: expect.objectContaining({ waypoint: 1 }),
      propertyUpdatedCounts: expect.objectContaining({ waypoint: 1 }),
    });
    expect(waypoint.resRef).toBe("nw_waypoint001");
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    const sourceGic = parseRawGffDocument(harness.contents[`${AREA}.gic`])!;
    const candidateGic = parseRawGffDocument(gic.bytes)!;
    expect(candidateGic.fields.find((field) => field.label === "WaypointList"))
      .toEqual(sourceGic.fields.find((field) => field.label === "WaypointList"));
    const waypointList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "WaypointList",
    );
    expect(waypointList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "TemplateResRef", type: "resref", value: "custom_waypoint" },
          { label: "Tag", type: "cexostring", value: "WAYPOINT" },
        ]),
      })],
    });
  });

  it("compiles one exact retained inline Waypoint LocalizedName CAS through candidate readback", async () => {
    const harness = createHarness({ waypointTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          waypointLocalizedName?: string;
          source: Record<string, unknown>;
        }>;
      };
    };
    const waypoint = payload.editableScene.objects.find(
      (entry) => entry.kind === "waypoints",
    )!;
    waypoint.waypointLocalizedName = " North Patrol Point ";
    Object.assign(waypoint.source, {
      sourceIndex: 0,
      waypointLocalizedNameStorage: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIFBvaW50" }],
      },
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "WaypointList",
    )).toMatchObject({
      type: "list",
      value: [expect.objectContaining({ fields: expect.arrayContaining([{
        label: "LocalizedName",
        type: "cexolocstring",
        value: {
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, text: " North Patrol Point " }],
        },
      }]) })],
    });
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ waypoint: 1 }),
    });
  });

  it("compiles one exact retained inline Waypoint Description CAS through candidate readback", async () => {
    const harness = createHarness({ waypointTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          waypointDescription?: string;
          source: Record<string, unknown>;
        }>;
      };
    };
    const waypoint = payload.editableScene.objects.find(
      (entry) => entry.kind === "waypoints",
    )!;
    waypoint.waypointDescription = "Northern patrol route";
    Object.assign(waypoint.source, {
      sourceIndex: 0,
      waypointDescriptionStorage: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIHJvdXRl" }],
      },
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "WaypointList",
    )).toMatchObject({
      type: "list",
      value: [expect.objectContaining({ fields: expect.arrayContaining([{
        label: "Description",
        type: "cexolocstring",
        value: {
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, text: "Northern patrol route" }],
        },
      }]) })],
    });
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ waypoint: 1 }),
    });
  });

  it("compiles one exact retained Waypoint MapNote CAS vector through candidate readback", async () => {
    const harness = createHarness({ waypointTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          waypointMapNote?: {
            hasMapNote: boolean;
            mapNoteText: string;
            mapNoteEnabled: boolean;
          };
          source: Record<string, unknown>;
        }>;
      };
    };
    const waypoint = payload.editableScene.objects.find(
      (entry) => entry.kind === "waypoints",
    )!;
    waypoint.waypointMapNote = {
      hasMapNote: true,
      mapNoteText: " Northern gate ",
      mapNoteEnabled: false,
    };
    Object.assign(waypoint.source, {
      sourceIndex: 0,
      waypointMapNoteStorage: {
        hasMapNoteByte: 0,
        mapNoteStorage: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "T2xkIG1hcmtlcg==" }],
        },
        mapNoteEnabledByte: 1,
      },
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const waypointList = parseRawGffDocument(git.bytes)!.fields.find(
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
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ waypoint: 1 }),
    });
  });

  it("compiles one digest-bound Waypoint Appearance Byte CAS through current-row validation", async () => {
    const harness = createHarness({ waypointTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as Record<string, any>;
    const waypoint = payload.editableScene.objects.find(
      (entry: Record<string, unknown>) => entry.kind === "waypoints",
    );
    waypoint.waypointAppearance = 4;
    Object.assign(waypoint.source, {
      sourceIndex: 0,
      waypointAppearance: {
        present: true,
        nativeType: "byte",
        value: 1,
        table: { ...effectiveWaypointDescriptor(), rowIndex: 1 },
      },
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "WaypointList",
    )).toMatchObject({
      type: "list",
      value: [expect.objectContaining({ fields: expect.arrayContaining([
        { label: "Appearance", type: "byte", value: 4 },
      ]) })],
    });
    expect(harness.appearanceCatalog.resolveEffectiveWaypointTwoDaDescriptor)
      .toHaveBeenCalledTimes(1);
    expect(harness.appearanceCatalog.resolveEffectiveWaypointTwoDaRow)
      .toHaveBeenCalledWith(4);
  });

  it("compiles one exact ordered Waypoint VarTable CAS through candidate readback", async () => {
    const harness = createHarness({ waypointTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          waypointVariables?: Array<
            | { name: string; type: "int"; value: number }
            | { name: string; type: "float"; value: number }
            | { name: string; type: "string"; value: string }
          >;
          source: Record<string, unknown>;
        }>;
      };
    };
    const waypoint = payload.editableScene.objects.find(
      (entry) => entry.kind === "waypoints",
    )!;
    waypoint.waypointVariables = [
      { name: "counter", type: "int", value: 2 },
      { name: "scale", type: "float", value: Math.fround(1.5) },
      { name: "label", type: "string", value: " north " },
    ];
    Object.assign(waypoint.source, {
      sourceIndex: 0,
      waypointVariables: { expectedEntries: [] },
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const waypointList = parseRawGffDocument(git.bytes)!.fields.find(
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
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ waypoint: 1 }),
    });
  });

  it("compiles one exact paired-GIC Waypoint editor Comment CAS with concurrent fixture changes through candidate readback", async () => {
    const harness = createHarness({ waypointTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      provenance: { sourceGicSha256?: string };
      editableScene: {
        objects: Array<{
          kind: string;
          waypointEditorComment?: string;
          source: Record<string, unknown>;
        }>;
      };
    };
    payload.provenance.sourceGicSha256 = sha256(harness.contents[`${AREA}.gic`]);
    const waypoint = payload.editableScene.objects.find(
      (entry) => entry.kind === "waypoints",
    )!;
    waypoint.waypointEditorComment = "  updated waypoint note  ";
    Object.assign(waypoint.source, {
      sourceIndex: 0,
      waypointEditorComment: "WaypointList",
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(parseRawGffDocument(gic.bytes)!.fields.find(
      (field) => field.label === "WaypointList",
    )).toMatchObject({
      type: "list",
      value: [expect.objectContaining({ fields: [{
        label: "Comment",
        type: "cexostring",
        value: "  updated waypoint note  ",
      }] })],
    });
    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 1,
      totalTransformed: 1,
      totalPropertyUpdated: 1,
      transformedCounts: expect.objectContaining({ waypoint: 1 }),
      propertyUpdatedCounts: expect.objectContaining({ waypoint: 1 }),
    });
  });

  it("compiles one exact retained Encounter Tag CAS through candidate readback", async () => {
    const harness = createHarness({ encounterTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          tag: string;
          source: Record<string, unknown>;
        }>;
      };
    };
    const encounter = payload.editableScene.objects.find(
      (entry) => entry.kind === "encounters",
    )!;
    encounter.tag = "  GNOLL_AMBUSH  ";
    Object.assign(encounter.source, {
      sourceIndex: 0,
      encounterTag: { present: true, value: "X2_GNOLL001" },
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const encounterList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Encounter List",
    );
    expect(encounterList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Tag", type: "cexostring", value: "  GNOLL_AMBUSH  " },
        ]),
      })],
    });
  });

  it("compiles one exact retained Encounter TemplateResRef CAS through candidate readback", async () => {
    const harness = createHarness({ encounterTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          encounterTemplateResRef?: string;
          source: Record<string, unknown>;
        }>;
      };
    };
    const encounter = payload.editableScene.objects.find(
      (entry) => entry.kind === "encounters",
    )!;
    encounter.encounterTemplateResRef = "custom_encounter";
    Object.assign(encounter.source, {
      sourceIndex: 0,
      encounterTemplateResRef: {
        present: true,
        nativeType: "resref",
        value: "x2_gnoll001",
      },
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const encounterList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Encounter List",
    );
    expect(encounterList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          {
            label: "TemplateResRef",
            type: "resref",
            value: "custom_encounter",
          },
        ]),
      })],
    });
  });

  it("compiles one digest-bound physical Encounter Faction after repute.fac revalidation", async () => {
    const harness = createHarness({ encounterTransform: true });
    retainEncounterFactionMutation(harness);

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveModuleFactionCatalog).toHaveBeenCalledTimes(1);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Encounter List",
    )).toMatchObject({
      type: "list",
      value: [expect.objectContaining({ fields: expect.arrayContaining([
        { label: "Faction", type: "dword", value: 4 },
      ]) })],
    });
  });

  it("rejects Encounter Faction when the module catalog digest changed", async () => {
    const harness = createHarness({ encounterTransform: true });
    retainEncounterFactionMutation(harness, 4, "e".repeat(64));

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
      details: [`expected=${"e".repeat(64)}`, `actual=${"f".repeat(64)}`],
    });
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it("compiles one catalog-bound Encounter Difficulty pair after fresh encdifficulty.2da validation", async () => {
    const harness = createHarness({ encounterTransform: true });
    retainEncounterDifficultyMutation(harness);

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveEffectiveAreaEncounterDifficultyCatalog)
      .toHaveBeenCalledTimes(1);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Encounter List",
    )).toMatchObject({
      type: "list",
      value: [expect.objectContaining({ fields: expect.arrayContaining([
        { label: "Difficulty", type: "int", value: 3 },
        { label: "DifficultyIndex", type: "int", value: 4 },
      ]) })],
    });
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
    });
  });

  it("compiles one exact retained inline Encounter LocalizedName CAS through candidate readback", async () => {
    const harness = createHarness({ encounterTransform: true });
    retainEncounterLocalizedNameMutation(harness);

    const candidate = await compile(harness);

    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    expect(parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "Encounter List",
    )).toMatchObject({
      type: "list",
      value: [expect.objectContaining({ fields: expect.arrayContaining([{
        label: "LocalizedName",
        type: "cexolocstring",
        value: {
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, text: "Night Ambush" }],
        },
      }]) })],
    });
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ encounter: 1 }),
    });
  });

  it("rejects Encounter Difficulty when encdifficulty.2da changed", async () => {
    const harness = createHarness({ encounterTransform: true });
    retainEncounterDifficultyMutation(harness, { difficulty: 3, difficultyIndex: 4 },
      "e".repeat(64));

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
      details: [`expected=${"e".repeat(64)}`, `actual=${"d".repeat(64)}`],
    });
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it("rejects an Encounter Difficulty pair whose numeric value disagrees with its catalog row", async () => {
    const harness = createHarness({ encounterTransform: true });
    retainEncounterDifficultyMutation(harness, { difficulty: 2, difficultyIndex: 4 });

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      status: 422,
      details: ["Difficulty=2", "DifficultyIndex=4:not_selectable"],
    });
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });

  it("compiles one exact retained ground-item TemplateResRef CAS through candidate readback", async () => {
    const harness = createHarness({ itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          resRef: string;
          source: Record<string, unknown>;
        }>;
      };
    };
    const item = payload.editableScene.objects.find((entry) => entry.kind === "items")!;
    item.resRef = "custom_sword";
    Object.assign(item.source, {
      sourceIndex: 0,
      itemTemplateResRef: {
        present: true,
        nativeType: "resref",
        value: "nw_sword",
      },
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 0,
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ item: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const itemList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "List",
    );
    expect(itemList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([{
          label: "TemplateResRef",
          type: "resref",
          value: "custom_sword",
        }]),
      })],
    });
  });

  it("compiles one exact ground-item VarTable CAS through whole-candidate readback", async () => {
    const harness = createHarness({ itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          source: Record<string, unknown>;
          itemProperties?: Record<string, unknown>;
        }>;
      };
    };
    const item = payload.editableScene.objects.find((entry) => entry.kind === "items")!;
    Object.assign(item.source, {
      sourceIndex: 0,
      itemVariables: { expectedEntries: [] },
    });
    item.itemProperties = { variables: [
      { name: "Counter", type: "int", value: 2 },
      { name: "Scale", type: "float", value: Math.fround(1.5) },
      { name: "Label", type: "string", value: "exact" },
    ] };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ item: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const itemEntry = (parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "List",
    ) as any).value[0];
    expect(itemEntry.fields.find((field: any) => field.label === "VarTable")).toEqual({
      label: "VarTable",
      type: "list",
      value: [
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Counter" },
          { label: "Type", type: "dword", value: 1 },
          { label: "Value", type: "int", value: 2 },
        ] },
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Scale" },
          { label: "Type", type: "dword", value: 2 },
          { label: "Value", type: "float", value: Math.fround(1.5) },
        ] },
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Label" },
          { label: "Type", type: "dword", value: 3 },
          { label: "Value", type: "cexostring", value: "exact" },
        ] },
      ],
    });
  });

  it("compiles one exact ground-item PropertiesList CAS through whole-candidate readback", async () => {
    const harness = createHarness({ itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          source: Record<string, unknown>;
          itemProperties?: Record<string, unknown>;
        }>;
      };
    };
    const item = payload.editableScene.objects.find((entry) => entry.kind === "items")!;
    Object.assign(item.source, {
      sourceIndex: 0,
      itemPropertyList: { present: true, expectedEntries: [] },
    });
    item.itemProperties = {
      propertyList: [{
        propertyName: 48,
        subtype: 7,
        costTable: 24,
        costValue: 9,
        param1: 1,
        param1Value: 2,
        chanceAppear: 75,
      }],
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ item: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const itemEntry = (parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "List",
    ) as any).value[0];
    expect(itemEntry.fields.find((field: any) => field.label === "PropertiesList")).toEqual({
      label: "PropertiesList",
      type: "list",
      value: [{
        typeId: 0,
        fields: [
          { label: "PropertyName", type: "word", value: 48 },
          { label: "Subtype", type: "word", value: 7 },
          { label: "CostTable", type: "byte", value: 24 },
          { label: "CostValue", type: "word", value: 9 },
          { label: "Param1", type: "byte", value: 1 },
          { label: "Param1Value", type: "byte", value: 2 },
          { label: "ChanceAppear", type: "byte", value: 75 },
        ],
      }],
    });
  });

  it("compiles one exact ground-item VisTransformList CAS through whole-candidate readback", async () => {
    const harness = createHarness({ itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          source: Record<string, unknown>;
          itemProperties?: Record<string, unknown>;
          visualTransform: Record<string, number>;
        }>;
      };
    };
    const item = payload.editableScene.objects.find((entry) => entry.kind === "items")!;
    Object.assign(item.source, {
      sourceIndex: 0,
      itemVisualTransform: { present: false },
    });
    item.itemProperties = {
      visualTransform: {
        present: true,
        value: {
          scaleX: 2,
          scaleY: 3,
          scaleZ: 4,
          rotateX: 45,
          rotateY: -90,
          rotateZ: 180,
          translateX: 2,
          translateY: -3,
          translateZ: 4,
        },
      },
    };
    item.visualTransform = {
      scale: 3,
      scaleX: 2,
      scaleY: 3,
      scaleZ: 4,
      offsetX: 0.2,
      offsetY: -0.3,
      offsetZ: 0.4,
      pitch: Math.PI / 4,
      roll: -Math.PI / 2,
      yaw: Math.PI,
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ item: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const itemEntry = (parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "List",
    ) as any).value[0];
    const visualTransform = itemEntry.fields.find(
      (field: any) => field.label === "VisTransformList",
    );
    expect(visualTransform).toMatchObject({
      label: "VisTransformList",
      type: "list",
      value: [{
        typeId: 6,
        fields: [
          { label: "Scope", type: "int", value: 0 },
          expect.objectContaining({ label: "AnimationSpeed", type: "struct" }),
          expect.objectContaining({ label: "ScaleX", type: "struct" }),
          expect.objectContaining({ label: "ScaleY", type: "struct" }),
          expect.objectContaining({ label: "ScaleZ", type: "struct" }),
          expect.objectContaining({ label: "RotateX", type: "struct" }),
          expect.objectContaining({ label: "RotateY", type: "struct" }),
          expect.objectContaining({ label: "RotateZ", type: "struct" }),
          expect.objectContaining({ label: "TranslateX", type: "struct" }),
          expect.objectContaining({ label: "TranslateY", type: "struct" }),
          expect.objectContaining({ label: "TranslateZ", type: "struct" }),
        ],
      }],
    });
    const controllerValues = Object.fromEntries(
      visualTransform.value[0].fields.slice(1).map((field: any) => [
        field.label,
        field.value.fields.find((child: any) => child.label === "ValueTo")?.value,
      ]),
    );
    expect(controllerValues).toStrictEqual({
      AnimationSpeed: 1,
      ScaleX: 2,
      ScaleY: 3,
      ScaleZ: 4,
      RotateX: 45,
      RotateY: -90,
      RotateZ: 180,
      TranslateX: 2,
      TranslateY: -3,
      TranslateZ: 4,
    });
  });

  it("compiles one catalog-bound ground-item BaseItem/appearance CAS through whole-candidate readback", async () => {
    const harness = createHarness({ itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          source: Record<string, unknown>;
          itemProperties?: Record<string, unknown>;
        }>;
      };
    };
    const item = payload.editableScene.objects.find((entry) => entry.kind === "items")!;
    const table = effectiveItemBaseItemsTable();
    Object.assign(item.source, {
      sourceIndex: 0,
      itemBaseAppearance: {
        expectedValue: {
          baseItem: 24,
          modelType: 0,
          appearance: { modelPart1: 66 },
        },
        tableSha256: table.descriptor.sha256,
        tableRowCount: table.descriptor.rowCount,
      },
    });
    item.itemProperties = {
      baseAppearance: {
        baseItem: 49,
        modelType: 2,
        appearance: { modelPart1: 11, modelPart2: 13, modelPart3: 63 },
      },
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(harness.appearanceCatalog.resolveEffectiveItemBaseItemsTwoDaTable)
      .toHaveBeenCalledTimes(1);
    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ item: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const itemEntry = (parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "List",
    ) as any).value[0];
    expect(itemEntry.fields).toEqual(expect.arrayContaining([
      { label: "BaseItem", type: "int", value: 49 },
      { label: "ModelPart1", type: "word", value: 11 },
      { label: "ModelPart2", type: "word", value: 13 },
      { label: "ModelPart3", type: "word", value: 63 },
    ]));
  });

  it("fails stale before write when the effective baseitems.2da digest changed", async () => {
    const harness = createHarness({ itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as Record<string, any>;
    const item = payload.editableScene.objects.find((entry: any) => entry.kind === "items")!;
    const table = effectiveItemBaseItemsTable();
    item.source = {
      ...item.source,
      sourceIndex: 0,
      itemBaseAppearance: {
        expectedValue: {
          baseItem: 24,
          modelType: 0,
          appearance: { modelPart1: 66 },
        },
        tableSha256: "f".repeat(64),
        tableRowCount: table.descriptor.rowCount,
      },
    };
    item.itemProperties = {
      baseAppearance: {
        baseItem: 49,
        modelType: 2,
        appearance: { modelPart1: 11, modelPart2: 13, modelPart3: 63 },
      },
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    await expect(compile(harness)).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
    });
  });

  it("compiles complete ordered ground-item localized-string lists through whole-candidate readback", async () => {
    const harness = createHarness({ itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          source: Record<string, unknown>;
          itemProperties?: Record<string, unknown>;
        }>;
      };
    };
    const item = payload.editableScene.objects.find((entry) => entry.kind === "items")!;
    Object.assign(item.source, {
      sourceIndex: 0,
      itemLocalizedStrings: {
        localizedName: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "U3dvcmQ=" }],
        },
        description: { present: true, strRef: 0xffff_ffff, entries: [] },
        identifiedDescription: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "S25vd24=" }],
        },
      },
    });
    item.itemProperties = {
      localizedName: " Sword 2 ",
      localizedNameEntries: [
        { languageId: 10, text: "Miecz" },
        { languageId: 0, text: " Sword 2 " },
        { languageId: 2, text: "Schwert" },
      ],
      description: "",
      descriptionEntries: [],
      identifiedDescription: "Known 2",
      identifiedDescriptionEntries: [
        { languageId: 10, text: "Rozpoznany" },
        { languageId: 0, text: "Known 2" },
      ],
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ item: 1 }),
    });
    expect(candidate.projectedDraft.objectEditing?.propertyMutations).toEqual([
      expect.objectContaining({
        kind: "item",
        sourceIndex: 0,
        localizedStrings: [
          expect.objectContaining({
            field: "LocalizedName",
            expectedEntries: [{ languageId: 0, text: "Sword" }],
            valueEntries: [
              { languageId: 10, text: "Miecz" },
              { languageId: 0, text: " Sword 2 " },
              { languageId: 2, text: "Schwert" },
            ],
          }),
          expect.objectContaining({
            field: "DescIdentified",
            expectedEntries: [{ languageId: 0, text: "Known" }],
            valueEntries: [
              { languageId: 10, text: "Rozpoznany" },
              { languageId: 0, text: "Known 2" },
            ],
          }),
        ],
      }),
    ]);
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const itemList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "List",
    );
    expect(itemList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          {
            label: "LocalizedName",
            type: "cexolocstring",
            value: {
              strRef: 0xffff_ffff,
              entries: [
                { languageId: 10, text: "Miecz" },
                { languageId: 0, text: " Sword 2 " },
                { languageId: 2, text: "Schwert" },
              ],
            },
          },
          {
            label: "Description",
            type: "cexolocstring",
            value: {
              strRef: 0xffff_ffff,
              entries: [],
            },
          },
          {
            label: "DescIdentified",
            type: "cexolocstring",
            value: {
              strRef: 0xffff_ffff,
              entries: [
                { languageId: 10, text: "Rozpoznany" },
                { languageId: 0, text: "Known 2" },
              ],
            },
          },
        ]),
      })],
    });
  });

  it("compiles one complete ground-item instance-state CAS through the transactional candidate path", async () => {
    const harness = createHarness({ itemTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: {
        objects: Array<{
          kind: string;
          source: Record<string, unknown>;
          itemProperties?: Record<string, unknown>;
        }>;
      };
    };
    const item = payload.editableScene.objects.find((entry) => entry.kind === "items")!;
    Object.assign(item.source, {
      sourceIndex: 0,
      itemInstanceState: {
        presentFields: [],
        values: {
          charges: 50,
          cost: 0,
          stolen: false,
          stackSize: 1,
          plot: false,
          addCost: 0,
          identified: false,
          cursed: false,
        },
      },
    });
    item.itemProperties = {
      charges: 7,
      cost: 123,
      stolen: true,
      stackSize: 4,
      plot: true,
      addCost: 9,
      identified: true,
      cursed: true,
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 0,
      totalPropertyUpdated: 1,
      propertyUpdatedCounts: expect.objectContaining({ item: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const itemList = parseRawGffDocument(git.bytes)!.fields.find(
      (field) => field.label === "List",
    );
    expect(itemList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Charges", type: "byte", value: 7 },
          { label: "Cost", type: "dword", value: 123 },
          { label: "Stolen", type: "byte", value: 1 },
          { label: "StackSize", type: "word", value: 4 },
          { label: "Plot", type: "byte", value: 1 },
          { label: "AddCost", type: "dword", value: 9 },
          { label: "Identified", type: "byte", value: 1 },
          { label: "Cursed", type: "byte", value: 1 },
        ]),
      })],
    });
  });

  it("compiles one existing sound position transform without inventing orientation fields", async () => {
    const harness = createHarness({ soundTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: { objects: Array<{ x: number; y: number; z: number; bearing: number }> };
    };
    Object.assign(payload.editableScene.objects[1]!, {
      x: 2.75,
      y: 3.25,
      z: 0.5,
      bearing: 0,
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 1,
      deletedCounts: expect.objectContaining({ item: 0, sound: 0 }),
      transformedCounts: expect.objectContaining({ creature: 0, item: 0, sound: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const parsed = parseRawGffDocument(git.bytes)!;
    const soundList = parsed.fields.find((field) => field.label === "SoundList");
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
    const sound = (soundList as Extract<typeof soundList, { type: "list" }>).value[0]!;
    expect(sound.fields.some((field) =>
      field.label === "Bearing" ||
      field.label === "XOrientation" ||
      field.label === "YOrientation"
    )).toBe(false);
  });

  it("compiles one existing sound interval/variation storage CAS mutation and preserves its GIC companion", async () => {
    const harness = createHarness({ soundIntervalVariationMutation: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as Record<string, any>;
    const sound = payload.editableScene.objects.find(
      (object: Record<string, unknown>) => object.kind === "sounds",
    );
    sound.soundIntervalVariation = {
      intervalMilliseconds: 12_340,
      intervalVariationMilliseconds: 1_230,
      pitchVariationHundredths: 35,
      volumeVariationByte: 127,
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 0,
      totalSoundIntervalVariationUpdated: 1,
      soundIntervalVariationUpdatedCounts: expect.objectContaining({ sound: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const parsed = parseRawGffDocument(git.bytes)!;
    const soundList = parsed.fields.find((field) => field.label === "SoundList");
    expect(soundList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Interval", type: "dword", value: 12_340 },
          { label: "IntervalVrtn", type: "dword", value: 1_230 },
          { label: "PitchVariation", type: "float", value: Math.fround(0.35) },
          { label: "VolumeVrtn", type: "byte", value: 127 },
        ]),
      })],
    });
  });

  it("compiles one existing sound base-volume storage CAS mutation and preserves its GIC companion", async () => {
    const harness = createHarness({ soundIntervalVariationMutation: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as Record<string, any>;
    const sound = payload.editableScene.objects.find(
      (object: Record<string, unknown>) => object.kind === "sounds",
    );
    sound.soundVolume = { volumeByte: 127 };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 0,
      totalSoundIntervalVariationUpdated: 0,
      totalSoundVolumeUpdated: 1,
      soundVolumeUpdatedCounts: expect.objectContaining({ sound: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const parsed = parseRawGffDocument(git.bytes)!;
    const soundList = parsed.fields.find((field) => field.label === "SoundList");
    expect(soundList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Volume", type: "byte", value: 127 },
        ]),
      })],
    });
  });

  it("compiles one existing Sound Hours/Times schedule CAS mutation and preserves its GIC companion", async () => {
    const harness = createHarness({ soundIntervalVariationMutation: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as Record<string, any>;
    const sound = payload.editableScene.objects.find(
      (object: Record<string, unknown>) => object.kind === "sounds",
    );
    sound.soundSchedule = { hoursMask: 0x800001, timesByte: 0 };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 0,
      totalSoundIntervalVariationUpdated: 0,
      totalSoundVolumeUpdated: 0,
      totalSoundScheduleUpdated: 1,
      soundScheduleUpdatedCounts: expect.objectContaining({ sound: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const parsed = parseRawGffDocument(git.bytes)!;
    const soundList = parsed.fields.find((field) => field.label === "SoundList");
    expect(soundList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Hours", type: "dword", value: 0x800001 },
          { label: "Times", type: "byte", value: 0 },
        ]),
      })],
    });
  });

  it("compiles one existing Sound Active CAS mutation and preserves its GIC companion", async () => {
    const harness = createHarness({ soundIntervalVariationMutation: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as Record<string, any>;
    const sound = payload.editableScene.objects.find(
      (object: Record<string, unknown>) => object.kind === "sounds",
    );
    sound.soundActive = { activeByte: 0 };
    sound.soundPlayOrder = { randomByte: 1 };
    sound.soundPlayback = {
      sounds: ["snd_b", "snd_b", "snd_c"],
      loopingByte: 1, continuousByte: 0, priorityByte: 3, positionalByte: 1,
      intervalDword: 25_000, intervalVariationDword: 5_000,
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 0,
      totalSoundIntervalVariationUpdated: 0,
      totalSoundVolumeUpdated: 0,
      totalSoundScheduleUpdated: 0,
      totalSoundActiveUpdated: 1,
      soundActiveUpdatedCounts: expect.objectContaining({ sound: 1 }),
      totalSoundPlayOrderUpdated: 1,
      soundPlayOrderUpdatedCounts: expect.objectContaining({ sound: 1 }),
      totalSoundPlaybackUpdated: 1,
      soundPlaybackUpdatedCounts: expect.objectContaining({ sound: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const parsed = parseRawGffDocument(git.bytes)!;
    const soundList = parsed.fields.find((field) => field.label === "SoundList");
    expect(soundList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Active", type: "byte", value: 0 },
          { label: "Random", type: "byte", value: 1 },
          { label: "Continuous", type: "byte", value: 0 },
          { label: "Looping", type: "byte", value: 1 },
          { label: "Priority", type: "byte", value: 3 },
          { label: "Hours", type: "dword", value: 0 },
          { label: "Times", type: "byte", value: 3 },
        ]),
      })],
    });
  });

  it("compiles one authoritative existing Sound playback and spatial profile CAS", async () => {
    const harness = createHarness({ soundIntervalVariationMutation: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as Record<string, any>;
    const sound = payload.editableScene.objects.find(
      (object: Record<string, unknown>) => object.kind === "sounds",
    );
    sound.source.soundProfileStorage = {
      sounds: ["snd_a", "snd_b"],
      loopingByte: 0, continuousByte: 1, priorityByte: 20,
      positionalByte: 1, randomPositionByte: 0,
      elevationFloat32: 0, maxDistanceFloat32: 14, minDistanceFloat32: 2,
      randomRangeXFloat32: 0, randomRangeYFloat32: 0,
      intervalDword: 25_000, intervalVariationDword: 5_000,
    };
    sound.soundProfile = {
      ...sound.source.soundProfileStorage,
      sounds: ["snd_b", "snd_b", "snd_c"],
      loopingByte: 1, continuousByte: 0, priorityByte: 3,
      randomPositionByte: 1,
      elevationFloat32: 1.25, maxDistanceFloat32: 20, minDistanceFloat32: 4,
      randomRangeXFloat32: 8, randomRangeYFloat32: 9,
    };
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 0,
      totalSoundProfileUpdated: 1,
      soundProfileUpdatedCounts: expect.objectContaining({ sound: 1 }),
      totalSoundPlaybackUpdated: 0,
      totalSoundPlayStyleUpdated: 0,
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const parsed = parseRawGffDocument(git.bytes)!;
    const soundList = parsed.fields.find((field) => field.label === "SoundList");
    expect(soundList).toMatchObject({
      type: "list",
      value: [expect.objectContaining({
        fields: expect.arrayContaining([
          { label: "Continuous", type: "byte", value: 0 },
          { label: "Looping", type: "byte", value: 1 },
          { label: "Priority", type: "byte", value: 3 },
          { label: "RandomPosition", type: "byte", value: 1 },
          { label: "Elevation", type: "float", value: 1.25 },
          { label: "MaxDistance", type: "float", value: 20 },
          { label: "MinDistance", type: "float", value: 4 },
          { label: "RandomRangeX", type: "float", value: 8 },
          { label: "RandomRangeY", type: "float", value: 9 },
        ]),
      })],
    });
  });

  it("compiles one existing store transform while preserving the exact GIC companion", async () => {
    const harness = createHarness({ storeTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: { objects: Array<{ x: number; y: number; z: number; bearing: number }> };
    };
    Object.assign(payload.editableScene.objects[1]!, {
      x: 4.75,
      y: 5.25,
      z: 0.1,
      bearing: Math.PI / 3,
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 1,
      deletedCounts: expect.objectContaining({ item: 0, store: 0 }),
      transformedCounts: expect.objectContaining({ creature: 0, sound: 0, store: 1 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const parsed = parseRawGffDocument(git.bytes)!;
    const storeList = parsed.fields.find((field) => field.label === "StoreList");
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

  it("compiles one existing trigger origin transform while preserving geometry, orientation, and GIC", async () => {
    const harness = createHarness({ triggerTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: { objects: Array<{ x: number; y: number; z: number; bearing: number }> };
    };
    Object.assign(payload.editableScene.objects[1]!, {
      x: 4.25,
      y: 5.75,
      z: 0.5,
      bearing: 0,
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 1,
      deletedCounts: expect.objectContaining({ item: 0, trigger: 0 }),
      transformedCounts: expect.objectContaining({ store: 0, trigger: 1, waypoint: 0 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const triggerList = parseRawGffDocument(git.bytes)!.fields.find(
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

  it("compiles one existing encounter origin transform while preserving geometry, empty spawn points, and GIC", async () => {
    const harness = createHarness({ encounterTransform: true });
    const mutated = structuredClone(harness.snapshot);
    const payload = mutated.draft.payload as unknown as {
      editableScene: { objects: Array<{ x: number; y: number; z: number; bearing: number }> };
    };
    Object.assign(payload.editableScene.objects[1]!, {
      x: 4.25,
      y: 5.75,
      z: 0.5,
      bearing: 0,
    });
    harness.drafts.read.mockResolvedValueOnce(mutated);

    const candidate = await compile(harness);

    expect(candidate.objectMutation).toMatchObject({
      totalDeleted: 0,
      totalTransformed: 1,
      deletedCounts: expect.objectContaining({ encounter: 0, item: 0 }),
      transformedCounts: expect.objectContaining({ encounter: 1, trigger: 0 }),
    });
    const git = candidate.resources.find((resource) => resource.extension === "git")!;
    const gic = candidate.resources.find((resource) => resource.extension === "gic")!;
    expect(gic.bytes).toEqual(harness.contents[`${AREA}.gic`]);
    const encounterList = parseRawGffDocument(git.bytes)!.fields.find(
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

  it("maps a non-canonical GIT/GIC source pair to a companion mismatch", async () => {
    const harness = createHarness({ objectDeletion: true, gicPairMismatch: true });
    const failure = await captureCompileFailure(harness);

    expect(failure).toMatchObject({
      code: "AREA_UPDATE_COMPANION_MISMATCH",
      status: 409,
      details: [],
    });
    expect(failure.message).toBe(
      "Area GIT/GIC does not satisfy the canonical nine-family paired profile.",
    );
    expect(harness.areaEditing.exportAre).not.toHaveBeenCalled();
  });
});

function encounterCreatureListBlueprintDraft(
  harness: ReturnType<typeof createHarness>,
  blueprintBytes: Buffer,
) {
  const draft = structuredClone(harness.snapshot);
  const payload = draft.draft.payload as any;
  const encounter = payload.editableScene.objects.find(
    (object: any) => object.kind === "encounters",
  )!;
  const sourceObjectKey = "module/catalog/creatures/nw_wolf001.utc";
  const sourceSha256 = sha256(blueprintBytes);
  const templateId = "cre_wolf_alpha";
  const resRef = "nw_wolf001";
  encounter.source.sourceIndex = 0;
  encounter.source.encounterCreatureList = {
    expectedEntries: [
      {
        sourceIndex: 0, appearance: 388, challengeRating: 1,
        resRef: "nw_gnoll001", singleSpawnByte: 0,
      },
      {
        sourceIndex: 1, appearance: 389, challengeRating: 3,
        resRef: "nw_gnoll002", singleSpawnByte: 1,
      },
    ],
  };
  encounter.encounterProperties = {
    ...encounter.encounterProperties,
    creatureList: [
      {
        entryKind: "retained",
        sourceIndex: 1,
        appearance: 389,
        challengeRating: 3,
        resRef: "nw_gnoll002",
        singleSpawn: false,
      },
      {
        entryKind: "effective_blueprint",
        sourceProfileId: "effective-catalog-utc-encounter-creature-list-v1",
        templateId,
        resRef,
        appearance: 225,
        challengeRating: Math.fround(2.5),
        sourceObjectKey,
        sourceSizeBytes: blueprintBytes.length,
        sourceSha256,
        singleSpawn: true,
      },
    ],
  };
  return Object.freeze({ draft, sourceObjectKey, sourceSha256, templateId, resRef });
}

function createHarness(options: Readonly<{
  omit?: string;
  invalidCandidate?: boolean;
  objectDeletion?: boolean;
  creatureEquipment?: boolean;
  creatureLocalizedStrings?: boolean;
  creatureAppearance?: boolean;
  creatureGender?: boolean;
  creatureWalkRate?: boolean;
  creaturePortrait?: boolean;
  creatureChallengeRating?: boolean;
  creatureAbilityScores?: boolean;
  creatureAppearanceColors?: boolean;
  creatureBodyParts?: boolean;
  creatureAppendages?: boolean;
  creatureHitPoints?: boolean;
  creatureNaturalArmorClass?: boolean;
  creatureSavingThrowBonuses?: boolean;
  creatureAlignment?: boolean;
  creatureDeathRemains?: boolean;
  creatureFaction?: boolean;
  creatureSpecialIdentityStrings?: boolean;
  creatureScriptResRefs?: boolean;
  creatureDeathRemainsLootable?: 0 | 1;
  encounterTransform?: boolean;
  itemTransform?: boolean;
  placeableTransform?: boolean;
  placeableInventory?: boolean;
  soundTransform?: boolean;
  soundIntervalVariationMutation?: boolean;
  storeTransform?: boolean;
  storeInventory?: boolean;
  triggerTransform?: boolean;
  waypointTransform?: boolean;
  waypointTagMutation?: boolean;
  waypointAddition?: boolean;
  staleGitProvenance?: boolean;
  staleAreaProvenance?: boolean;
  gicPairMismatch?: boolean;
  moduleStartLocationMutation?: boolean;
  audioEnvironmentMutation?: boolean;
  doorTransitionMutation?: boolean;
  resourceTypeOverrides?: Readonly<Record<string, number>>;
}> = {}) {
  const sourceAre = buildGffBuffer([
    { label: "ResRef", type: "resref", value: AREA },
    { label: "Name", type: "cexolocstring", value: {
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, text: "Crypt 01" }],
    } },
    { label: "Tag", type: "cexostring", value: "CRYPT_01" },
  ], "ARE ", 0xffffffff);
  const pair = objectPair({
    omitItemGic: options.gicPairMismatch,
    includeEncounter: options.encounterTransform,
    includeDoor: options.doorTransitionMutation,
    includePlaceable: options.placeableTransform,
    includePlaceableInventory: options.placeableInventory,
    includeSound: options.soundTransform || options.soundIntervalVariationMutation,
    includeStore: options.storeTransform,
    includeStoreInventory: options.storeInventory,
    includeTrigger: options.triggerTransform,
    includeWaypoint: options.waypointTransform || options.waypointTagMutation,
    includeCreatureEquipment: options.creatureEquipment,
    creatureLocalizedStrings: options.creatureLocalizedStrings,
    includeCreatureAppearance: options.creatureAppearance,
    includeCreatureGender: options.creatureGender,
    includeCreatureWalkRate: options.creatureWalkRate,
    includeCreaturePortrait: options.creaturePortrait,
    includeCreatureChallengeRating: options.creatureChallengeRating,
    includeCreatureAbilityScores: options.creatureAbilityScores,
    includeCreatureAppearanceColors: options.creatureAppearanceColors,
    includeCreatureBodyParts: options.creatureBodyParts,
    includeCreatureAppendages: options.creatureAppendages,
    includeCreatureHitPoints: options.creatureHitPoints,
    includeCreatureNaturalArmorClass: options.creatureNaturalArmorClass,
    includeCreatureSavingThrowBonuses: options.creatureSavingThrowBonuses,
    includeCreatureAlignment: options.creatureAlignment,
    includeCreatureDeathRemains: options.creatureDeathRemains,
    includeCreatureFaction: options.creatureFaction,
    creatureSpecialIdentityStrings: options.creatureSpecialIdentityStrings,
    creatureScriptResRefs: options.creatureScriptResRefs,
    creatureDeathRemainsLootable: options.creatureDeathRemainsLootable,
  });
  const contents: Record<string, Buffer> = {
    [`${AREA}.are`]: sourceAre,
    [`${AREA}.git`]: options.objectDeletion || options.creatureEquipment || options.creatureAppearance || options.creatureGender || options.creatureWalkRate || options.creaturePortrait || options.creatureChallengeRating || options.creatureAbilityScores || options.creatureAppearanceColors || options.creatureBodyParts || options.creatureAppendages || options.creatureHitPoints || options.creatureNaturalArmorClass || options.creatureSavingThrowBonuses || options.creatureAlignment || options.creatureDeathRemains || options.creatureFaction || options.creatureSpecialIdentityStrings || options.creatureScriptResRefs || options.doorTransitionMutation || options.encounterTransform || options.itemTransform || options.placeableTransform || options.soundTransform || options.soundIntervalVariationMutation || options.storeTransform || options.triggerTransform || options.waypointTransform || options.waypointTagMutation || options.waypointAddition || options.audioEnvironmentMutation
      ? pair.git
      : Buffer.from("preserved-git"),
    [`${AREA}.gic`]: options.objectDeletion || options.creatureEquipment || options.creatureAppearance || options.creatureGender || options.creatureWalkRate || options.creaturePortrait || options.creatureChallengeRating || options.creatureAbilityScores || options.creatureAppearanceColors || options.creatureBodyParts || options.creatureAppendages || options.creatureHitPoints || options.creatureNaturalArmorClass || options.creatureSavingThrowBonuses || options.creatureAlignment || options.creatureDeathRemains || options.creatureFaction || options.creatureSpecialIdentityStrings || options.creatureScriptResRefs || options.doorTransitionMutation || options.encounterTransform || options.itemTransform || options.placeableTransform || options.soundTransform || options.soundIntervalVariationMutation || options.storeTransform || options.triggerTransform || options.waypointTransform || options.waypointTagMutation || options.waypointAddition || options.audioEnvironmentMutation
      ? pair.gic
      : Buffer.from("preserved-gic"),
    "module.ifo": options.moduleStartLocationMutation
      ? moduleIfoStartLocation()
      : Buffer.from("preserved-ifo"),
  };
  const allObjects = Object.entries(contents).map(([logicalKey, bytes]) => ({
    logicalKey,
    resourceType: options.resourceTypeOverrides?.[logicalKey] ?? resourceType(logicalKey),
    size: bytes.length,
    sha256: sha256(bytes),
  }));
  const manifest = createModuleSnapshotManifest({
    moduleId: MODULE_ID,
    parentRevision: null,
    objects: allObjects.filter((entry) => entry.logicalKey !== options.omit),
  });
  const byContentKey = new Map(
    manifest.objects.map((descriptor) => [descriptor.contentKey, {
      contentKey: descriptor.contentKey,
      size: descriptor.size,
      sha256: descriptor.sha256,
      bytes: Buffer.from(contents[descriptor.logicalKey]),
    }]),
  );
  const head = {
    schemaVersion: MODULE_SNAPSHOT_HEAD_SCHEMA_VERSION,
    moduleId: MODULE_ID,
    revision: manifest.revision,
    manifestKey: buildModuleSnapshotManifestKey(manifest),
    manifestSha256: hashModuleSnapshotManifest(manifest),
    quarantined: false,
    fencingToken: 0,
    updatedAt: "2026-08-12T10:00:00.000Z",
  };
  const repository = {
    readHead: jest.fn(async () => head),
    readManifest: jest.fn(async () => manifest),
    readContent: jest.fn(async (key: string) => byContentKey.get(key) ?? null),
  } as unknown as jest.Mocked<AtomicModuleSnapshotRepositoryPort>;
  const snapshot = draftSnapshot(
    options.staleAreaProvenance ? "f".repeat(64) : sha256(sourceAre),
    options.objectDeletion || options.creatureEquipment || options.creatureAppearance || options.creatureGender || options.creatureWalkRate || options.creaturePortrait || options.creatureChallengeRating || options.creatureAbilityScores || options.creatureAppearanceColors || options.creatureHitPoints || options.creatureNaturalArmorClass || options.creatureSavingThrowBonuses || options.creatureAlignment || options.creatureDeathRemains || options.creatureFaction || options.creatureSpecialIdentityStrings || options.creatureScriptResRefs || options.doorTransitionMutation || options.encounterTransform || options.itemTransform || options.placeableTransform || options.soundTransform || options.soundIntervalVariationMutation || options.storeTransform || options.triggerTransform || options.waypointTransform || options.waypointTagMutation || options.waypointAddition || options.audioEnvironmentMutation
      ? (options.staleGitProvenance ? "f".repeat(64) : sha256(contents[`${AREA}.git`]))
      : undefined,
    options.placeableTransform,
    options.waypointTransform || options.waypointTagMutation,
    options.doorTransitionMutation || options.encounterTransform || options.itemTransform || options.soundTransform || options.soundIntervalVariationMutation || options.storeTransform || options.triggerTransform || options.waypointTagMutation || options.waypointAddition,
    options.soundTransform || options.soundIntervalVariationMutation,
    options.storeTransform,
    options.triggerTransform,
    options.encounterTransform,
    options.waypointAddition,
    options.doorTransitionMutation,
  );
  if (options.moduleStartLocationMutation) {
    const payload = snapshot.draft.payload as Record<string, any>;
    payload.sourceArea.moduleStartLocation = {
      areaResRef: "other01", x: 1, y: 2, z: 3, directionX: 0, directionY: 1,
    };
    payload.sourceArea.moduleStartLocationTargets = [AREA, "other01", "other02"];
    payload.editableScene.moduleStartLocation = {
      areaResRef: "other02",
      x: 10.1,
      y: 20.2,
      z: 0.3,
      directionX: 0.6,
      directionY: 0.8,
    };
  }
  if (options.audioEnvironmentMutation) {
    const payload = snapshot.draft.payload as Record<string, any>;
    payload.sourceArea.audioEnvironment = areaAudioEnvironment();
    payload.editableScene.areaAudioEnvironment = {
      ...areaAudioEnvironment(),
      ambientSoundNightVolume: 77,
      musicDelayMilliseconds: -4000,
    };
  }
  const drafts = {
    read: jest.fn(async () => snapshot),
  } as unknown as jest.Mocked<AreaDraftRepositoryPort>;
  const projectedCandidate = serializeAreaEditingDraftToAreGff({
    areaResRef: AREA,
    name: "Crypt 01",
    width: 2,
    height: 2,
    tilesetResRef: "tin01",
    tiles: tiles(),
  });
  const candidateAre = options.invalidCandidate ? Buffer.from("not-an-are") : projectedCandidate;
  const exportResult = {
    fileName: `${AREA}.are`,
    contentType: "application/octet-stream" as const,
    size: candidateAre.length,
    bytes: Buffer.from(candidateAre),
    tileCount: 4,
    tilesetFingerprint: "e".repeat(64),
  };
  const areaEditing = {
    exportAre: jest.fn(async () => exportResult),
  };
  const blueprintBytes = waypointBlueprint();
  const blueprintSha256 = sha256(blueprintBytes);
  const blueprints = {
    resolve: jest.fn(async (_request) => ({
      sourceKind: "waypoint" as const,
      sourceProfileId: "nwn-base-key-utw-v1",
      templateResRef: "nw_waypoint001",
      sha256: blueprintSha256,
      bytes: Buffer.from(blueprintBytes),
    })),
  } as jest.Mocked<AreaObjectBlueprintSourcePort>;
  const appearanceCatalog = {
    resolveEffectiveTemplateBlueprint: jest.fn(
      async (): Promise<EffectiveTemplateBlueprintResult | null> => null,
    ),
    resolveEffectivePlaceablesTwoDaDescriptor: jest.fn(async () => effectivePlaceablesDescriptor()),
    listEffectivePlaceablesTwoDaRows: jest.fn(async ({ limit, offset }) => ({
      descriptor: effectivePlaceablesDescriptor(),
      items: [{ rowIndex: offset, displayName: `Row ${offset}`, displaySource: "row_index" as const }],
      total: 200,
      limit,
      offset,
    })),
    resolveEffectiveWaypointTwoDaDescriptor: jest.fn(async () => effectiveWaypointDescriptor()),
    resolveEffectiveWaypointTwoDaRow: jest.fn(async (rowIndex: number) => ({
      descriptor: effectiveWaypointDescriptor(),
      row: rowIndex >= 1 && rowIndex <= 4 ? {
        rowIndex,
        modelResRef: `gi_waypoint0${rowIndex}`,
        strRef: 67280 + rowIndex,
        label: ["", "blue", "red", "green", "yellow"][rowIndex],
        displayName: ["", "Blue", "Red", "Green", "Yellow"][rowIndex],
        displaySource: "strref" as const,
      } : null,
    })),
    resolveEffectiveCreatureAppearanceTwoDaDescriptor: jest.fn(
      async () => effectiveCreatureAppearanceDescriptor(),
    ),
    resolveEffectiveCreatureAppearanceTwoDaRow: jest.fn(async (rowIndex: number) => ({
      descriptor: effectiveCreatureAppearanceDescriptor(),
      row: {
        rowIndex,
        displayName: `Creature row ${rowIndex}`,
        displaySource: "label" as const,
        label: `Creature row ${rowIndex}`,
      },
    })),
    resolveEffectiveCreatureGenderTwoDaDescriptor: jest.fn(
      async () => effectiveCreatureGenderDescriptor(),
    ),
    resolveEffectiveCreatureGenderTwoDaRow: jest.fn(async (rowIndex: number) => ({
      descriptor: effectiveCreatureGenderDescriptor(),
      row: {
        rowIndex,
        displayName: `Gender row ${rowIndex}`,
        displaySource: "strref_id" as const,
        nameStrRef: 156 + rowIndex,
        genderToken: "M",
      },
    })),
    resolveEffectiveCreatureAppendageTwoDaDescriptor: jest.fn(
      async (resourceName: "wingmodel.2da" | "tailmodel.2da") =>
        effectiveCreatureAppendageDescriptor(resourceName),
    ),
    resolveEffectiveCreatureAppendageTwoDaRow: jest.fn(
      async (resourceName: "wingmodel.2da" | "tailmodel.2da", rowIndex: number) => ({
        descriptor: effectiveCreatureAppendageDescriptor(resourceName),
        row: rowIndex >= 0 && rowIndex < 8
          ? { rowIndex, displayName: `Appendage row ${rowIndex}` }
          : null,
      }),
    ),
    resolveEffectiveCreatureWalkRatesTwoDaTable: jest.fn(
      async () => effectiveCreatureWalkRatesTable(),
    ),
    resolveEffectiveCreaturePortraitsTwoDaTable: jest.fn(
      async () => effectiveCreaturePortraitsTable(),
    ),
    resolveEffectiveCreatureRacialTypesTwoDaTable: jest.fn(
      async () => effectiveCreatureRacialTypesTable(),
    ),
    resolveEffectiveTrapsTwoDaTable: jest.fn(async () => effectiveTrapsTable()),
    resolveEffectiveItemBaseItemsTwoDaTable: jest.fn(async () => effectiveItemBaseItemsTable()),
    resolveEffectiveBodyBagTwoDaTable: jest.fn(async () => effectiveBodyBagTable()),
    resolveEffectivePortraitsTwoDaTable: jest.fn(async () => effectivePortraitsTable()),
    resolveModuleFactionCatalog: jest.fn(async () => moduleFactionCatalog()),
    resolveEffectiveAreaEncounterDifficultyCatalog: jest.fn(
      async () => encounterDifficultyCatalog(),
    ),
  } satisfies Pick<
    TemplateCatalogRepositoryPort,
    "resolveEffectiveTemplateBlueprint" | "resolveEffectivePlaceablesTwoDaDescriptor" | "listEffectivePlaceablesTwoDaRows" | "resolveEffectiveWaypointTwoDaDescriptor" | "resolveEffectiveWaypointTwoDaRow" | "resolveEffectiveCreatureAppearanceTwoDaDescriptor" | "resolveEffectiveCreatureAppearanceTwoDaRow" | "resolveEffectiveCreatureGenderTwoDaDescriptor" | "resolveEffectiveCreatureGenderTwoDaRow" | "resolveEffectiveCreatureAppendageTwoDaDescriptor" | "resolveEffectiveCreatureAppendageTwoDaRow" | "resolveEffectiveCreatureWalkRatesTwoDaTable" | "resolveEffectiveCreaturePortraitsTwoDaTable" | "resolveEffectiveCreatureRacialTypesTwoDaTable" | "resolveEffectiveTrapsTwoDaTable" | "resolveEffectiveItemBaseItemsTwoDaTable" | "resolveEffectiveBodyBagTwoDaTable" | "resolveEffectivePortraitsTwoDaTable" | "resolveModuleFactionCatalog" | "resolveEffectiveAreaEncounterDifficultyCatalog"
  >;
  const dynamicItemTelemetry = {
    emit: jest.fn(),
  } satisfies AreaDynamicItemBlueprintCopyTelemetryPort;
  const storeCommerceTelemetry = {
    emit: jest.fn(),
  } satisfies AreaStoreCommerceTelemetryPort;
  const storeScriptResRefsTelemetry = {
    emit: jest.fn(),
  } satisfies AreaStoreScriptResRefsTelemetryPort;
  const triggerScriptResRefsTelemetry = {
    emit: jest.fn(),
  } satisfies AreaTriggerScriptResRefsTelemetryPort;
  const triggerTransitionStorageTelemetry = {
    emit: jest.fn(),
  } satisfies AreaTriggerTransitionStorageTelemetryPort;
  const triggerCorePropertiesTelemetry = {
    emit: jest.fn(),
  } satisfies AreaTriggerCorePropertiesTelemetryPort;
  const triggerTrapPropertiesTelemetry = {
    emit: jest.fn(),
  } satisfies AreaTriggerTrapPropertiesTelemetryPort;
  const triggerVariableTableTelemetry = {
    emit: jest.fn(),
  } satisfies AreaTriggerVariableTableTelemetryPort;
  const storeVariableTableTelemetry = {
    emit: jest.fn(),
  } satisfies AreaStoreVariableTableTelemetryPort;
  const storeRestrictionsTelemetry = {
    emit: jest.fn(),
  } satisfies AreaStoreRestrictionsTelemetryPort;
  const storeInventoryTelemetry = {
    emit: jest.fn(),
  } satisfies AreaStoreInventoryTelemetryPort;
  const command: AreaUpdateCommand = {
    schemaVersion: "area-update-command.v1",
    moduleId: MODULE_ID,
    areaResRef: AREA,
    expectedModuleRevision: manifest.revision,
    draft: { id: "draft-01", revision: 3, normalizedSha256: DRAFT_HASH },
    clientCommandId: "client-command-01",
  };
  return {
    compiler: new AreaUpdateCandidateCompiler({
      repository,
      drafts,
      areaEditing,
      blueprints,
      appearanceCatalog,
      dynamicItemTelemetry,
      storeCommerceTelemetry,
      storeScriptResRefsTelemetry,
      triggerScriptResRefsTelemetry,
      triggerTransitionStorageTelemetry,
      triggerCorePropertiesTelemetry,
      triggerTrapPropertiesTelemetry,
      triggerVariableTableTelemetry,
      storeVariableTableTelemetry,
      storeRestrictionsTelemetry,
      storeInventoryTelemetry,
    }),
    repository,
    drafts,
    areaEditing,
    blueprints,
    appearanceCatalog,
    dynamicItemTelemetry,
    storeCommerceTelemetry,
    storeScriptResRefsTelemetry,
    triggerScriptResRefsTelemetry,
    triggerTransitionStorageTelemetry,
    triggerCorePropertiesTelemetry,
    triggerTrapPropertiesTelemetry,
    triggerVariableTableTelemetry,
    storeVariableTableTelemetry,
    storeRestrictionsTelemetry,
    storeInventoryTelemetry,
    blueprintSha256,
    command,
    contents,
    contentRecords: byContentKey,
    candidateAre,
    exportResult,
    head,
    manifest,
    snapshot,
    revision: manifest.revision,
  };
}

function areaCommentsPreservation(
  value: string,
  onEnter?: string,
  name?: string,
  tag?: string,
  advanced = false,
) {
  return {
    rootStructTypeId: 0xffffffff,
    fields: [
      { label: "Comments", type: "cexostring" as const, value },
      ...(onEnter !== undefined
        ? [{ label: "OnEnter", type: "resref" as const, value: onEnter }]
        : []),
      ...(name !== undefined
        ? [{
            label: "Name",
            type: "cexolocstring" as const,
            value: {
              strRef: 0xffff_ffff,
              entries: [{ languageId: 0, text: name }],
            },
          }]
        : []),
      ...(tag !== undefined
        ? [{ label: "Tag", type: "cexostring" as const, value: tag }]
        : []),
      ...(advanced
        ? [
            { label: "Flags", type: "dword" as const, value: 4 },
            { label: "PlayerVsPlayer", type: "byte" as const, value: 0 },
            { label: "NoRest", type: "byte" as const, value: 0 },
            { label: "ModListenCheck", type: "int" as const, value: -8 },
            { label: "ModSpotCheck", type: "int" as const, value: 11 },
          ]
        : []),
      { label: "Width", type: "dword" as const, value: 2 },
      { label: "Height", type: "dword" as const, value: 2 },
      { label: "Tileset", type: "resref" as const, value: "tin01" },
      {
        label: "Tile_List",
        type: "list" as const,
        value: Array.from({ length: 4 }, () => ({ typeId: 0, fields: [] })),
      },
    ],
  };
}

function moduleIfoStartLocation(): Buffer {
  return buildGffBuffer([
    { label: "ModuleName", type: "cexostring", value: "Preserved Module" },
    { label: "Mod_Entry_Area", type: "resref", value: "other01" },
    { label: "Mod_Entry_X", type: "float", value: 1 },
    { label: "Mod_Entry_Y", type: "float", value: 2 },
    { label: "Mod_Entry_Z", type: "float", value: 3 },
    { label: "Mod_Entry_Dir_X", type: "float", value: 0 },
    { label: "Mod_Entry_Dir_Y", type: "float", value: 1 },
    {
      label: "Mod_Area_list",
      type: "list",
      value: ["other01", AREA, "other02"].map((areaResRef) => ({
        typeId: 6,
        fields: [{ label: "Area_Name", type: "resref" as const, value: areaResRef }],
      })),
    },
    { label: "CustomRoot", type: "void", value: Buffer.from([1, 2, 3]) },
  ], "IFO ", 0);
}

function effectivePlaceablesDescriptor() {
  return {
    resourceName: "placeables.2da" as const,
    sourceObjectKey: "modules/current/__aurora/sources/vanilla/placeables.2da",
    sourceLayer: "vanilla" as const,
    sha256: "c".repeat(64),
    sizeBytes: 3_019_695,
    rowCount: 200,
  };
}

function effectiveCreatureAppearanceDescriptor() {
  return {
    resourceName: "appearance.2da" as const,
    sourceObjectKey: "modules/current/__aurora/sources/vanilla/appearance.2da",
    sourceLayer: "vanilla" as const,
    sha256: "b".repeat(64),
    sizeBytes: 1_048_576,
    rowCount: 1000,
  };
}

function effectiveWaypointDescriptor() {
  return {
    resourceName: "waypoint.2da" as const,
    sourceObjectKey: "modules/current/__aurora/sources/vanilla/waypoint.2da",
    sourceLayer: "vanilla" as const,
    sha256: "f".repeat(64),
    sizeBytes: 272,
    rowCount: 5,
  };
}

function effectiveCreatureGenderDescriptor() {
  return {
    resourceName: "gender.2da" as const,
    sourceObjectKey: "modules/current/__aurora/sources/vanilla/gender.2da",
    sourceLayer: "vanilla" as const,
    sha256: "c".repeat(64),
    sizeBytes: 250,
    rowCount: 5,
  };
}

function effectiveCreatureAppendageDescriptor(
  resourceName: "wingmodel.2da" | "tailmodel.2da",
) {
  return {
    resourceName,
    sourceObjectKey: `modules/current/__aurora/sources/vanilla/${resourceName}`,
    sourceLayer: "vanilla" as const,
    sha256: "a".repeat(64),
    sizeBytes: 1_024,
    rowCount: 8,
  };
}

function effectiveCreatureWalkRatesTable() {
  return {
    descriptor: {
      resourceName: "creaturespeed.2da" as const,
      sourceObjectKey: "modules/current/__aurora/sources/vanilla/creaturespeed.2da",
      sourceLayer: "vanilla" as const,
      sha256: "d".repeat(64),
      sizeBytes: 4_096,
      rowCount: 9,
    },
    rows: Array.from({ length: 8 }, (_, index) => ({
      rowIndex: index + 1,
      displayName: `WalkRate ${index + 1}`,
      displaySource: "strref_id" as const,
      nameStrRef: 1001 + index,
      twoDaName: `RATE_${index + 1}`,
    })),
  };
}

function effectiveCreaturePortraitsTable() {
  return {
    descriptor: {
      resourceName: "portraits.2da" as const,
      sourceObjectKey: "modules/current/__aurora/sources/vanilla/portraits.2da",
      sourceLayer: "vanilla" as const,
      sha256: "f".repeat(64),
      sizeBytes: 100_000,
      rowCount: 16_001,
    },
    rows: [
      { rowIndex: 10, baseResRef: "po_hm_guard", sex: 0, race: 6, plot: 0 as const },
      { rowIndex: 11, baseResRef: "po_em_guard", sex: 0, race: 1, plot: 0 as const },
    ],
  };
}

function effectiveCreatureRacialTypesTable() {
  return {
    descriptor: {
      resourceName: "racialtypes.2da" as const,
      sourceObjectKey: "modules/current/racialtypes.2da",
      sourceLayer: "module" as const,
      sha256: "a".repeat(64),
      sizeBytes: 400,
      rowCount: 3,
    },
    rows: [{ rowIndex: 1, constitutionAdjust: 0 }],
  };
}

function effectiveItemBaseItemsTable() {
  const rows = Array.from({ length: 64 }, (_, rowIndex) => ({
    rowIndex,
    modelType: rowIndex === 16 ? 3 as const : rowIndex === 49 ? 2 as const : 0 as const,
    displayName: `Base item ${rowIndex}`,
    invSlotWidth: 1,
    invSlotHeight: 1,
  }));
  return {
    descriptor: {
      resourceName: "baseitems.2da" as const,
      sourceObjectKey: "modules/current/__aurora/sources/vanilla/2da/baseitems.2da",
      sourceLayer: "vanilla" as const,
      sha256: "e".repeat(64),
      sizeBytes: 4096,
      rowCount: rows.length,
    },
    rows,
  };
}

function retainCreatureAppearanceMutation(
  harness: ReturnType<typeof createHarness>,
  targetRow = 52,
  tableSha256 = "b".repeat(64),
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as unknown as {
    editableScene: {
      objects: Array<{
        kind: string;
        source: Record<string, unknown>;
        creatureProperties?: Record<string, unknown>;
      }>;
    };
  };
  const creature = payload.editableScene.objects.find((object) => object.kind === "creatures")!;
  creature.source.sourceIndex = 0;
  creature.source.creatureAppearance = {
    present: true,
    nativeType: "word",
    value: 249,
    table: {
      ...effectiveCreatureAppearanceDescriptor(),
      sha256: tableSha256,
      rowIndex: 249,
    },
  };
  creature.creatureProperties = {
    ...(creature.creatureProperties ?? {}),
    appearanceType: targetRow,
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainCreatureGenderMutation(
  harness: ReturnType<typeof createHarness>,
  targetRow = 0,
  tableSha256 = "c".repeat(64),
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as unknown as {
    editableScene: {
      objects: Array<{
        kind: string;
        source: Record<string, unknown>;
        creatureProperties?: Record<string, unknown>;
      }>;
    };
  };
  const creature = payload.editableScene.objects.find((object) => object.kind === "creatures")!;
  creature.source.sourceIndex = 0;
  creature.source.creatureGender = {
    present: true,
    nativeType: "byte",
    value: 4,
    table: {
      ...effectiveCreatureGenderDescriptor(),
      sha256: tableSha256,
      rowIndex: 4,
    },
  };
  creature.creatureProperties = {
    ...(creature.creatureProperties ?? {}),
    genderId: targetRow,
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainCreatureWalkRateMutation(
  harness: ReturnType<typeof createHarness>,
  targetRow = 2,
  tableSha256 = "d".repeat(64),
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as unknown as {
    editableScene: {
      objects: Array<{
        kind: string;
        source: Record<string, unknown>;
        creatureProperties?: Record<string, any>;
      }>;
    };
  };
  const creature = payload.editableScene.objects.find((object) => object.kind === "creatures")!;
  creature.source.sourceIndex = 0;
  creature.source.creatureWalkRate = {
    present: true,
    nativeType: "int",
    value: 4,
    table: {
      ...effectiveCreatureWalkRatesTable().descriptor,
      sha256: tableSha256,
      rowIndex: 4,
      twoDaName: "RATE_4",
    },
  };
  creature.creatureProperties = {
    ...(creature.creatureProperties ?? {}),
    advancedSettings: {
      ...(creature.creatureProperties?.advancedSettings ?? {}),
      walkRateId: targetRow,
    },
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainCreaturePortraitMutation(
  harness: ReturnType<typeof createHarness>,
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as unknown as {
    editableScene: {
      objects: Array<{
        kind: string;
        source: Record<string, unknown>;
        creatureProperties?: Record<string, unknown>;
      }>;
    };
  };
  const creature = payload.editableScene.objects.find((object) => object.kind === "creatures")!;
  creature.source.sourceIndex = 0;
  creature.source.creaturePortrait = {
    present: true,
    nativeType: "word",
    value: 10,
    selectorContext: { genderValue: 0, raceValue: 4 },
    table: {
      ...effectiveCreaturePortraitsTable().descriptor,
      rowIndex: 10,
      baseResRef: "po_hm_guard",
    },
  };
  creature.creatureProperties = {
    ...(creature.creatureProperties ?? {}),
    genderId: 0,
    portraitId: 11,
    portraitResRef: "po_em_guard",
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainCreatureChallengeRatingMutation(
  harness: ReturnType<typeof createHarness>,
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as unknown as {
    editableScene: {
      objects: Array<{
        kind: string;
        source: Record<string, unknown>;
        creatureProperties?: Record<string, unknown>;
      }>;
    };
  };
  const creature = payload.editableScene.objects.find((object) => object.kind === "creatures")!;
  creature.source.sourceIndex = 0;
  creature.source.creatureChallengeRating = {
    present: true,
    nativeType: "float",
    value: 11.5,
  };
  creature.creatureProperties = {
    ...(creature.creatureProperties ?? {}),
    challengeRating: 0.1,
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainCreatureAbilityScoreMutations(
  harness: ReturnType<typeof createHarness>,
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as unknown as {
    editableScene: {
      objects: Array<{
        kind: string;
        source: Record<string, unknown>;
        creatureProperties?: Record<string, any>;
      }>;
    };
  };
  const creature = payload.editableScene.objects.find((object) => object.kind === "creatures")!;
  creature.source.sourceIndex = 0;
  creature.source.creatureAbilityScores = {
    strength: { present: true, nativeType: "byte", value: 15 },
    dexterity: { present: true, nativeType: "byte", value: 12 },
    constitution: { present: true, nativeType: "byte", value: 14 },
    intelligence: { present: true, nativeType: "byte", value: 10 },
    wisdom: { present: true, nativeType: "byte", value: 11 },
    charisma: { present: true, nativeType: "byte", value: 8 },
  };
  creature.creatureProperties = {
    ...(creature.creatureProperties ?? {}),
    statistics: {
      ...(creature.creatureProperties?.statistics ?? {}),
      abilityScores: {
        strength: 17,
        dexterity: 12,
        constitution: 14,
        intelligence: 10,
        wisdom: 11,
        charisma: 10,
      },
    },
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainCreatureAppearanceColorMutations(
  harness: ReturnType<typeof createHarness>,
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as unknown as {
    editableScene: {
      objects: Array<{
        kind: string;
        source: Record<string, unknown>;
        creatureProperties?: Record<string, any>;
      }>;
    };
  };
  const creature = payload.editableScene.objects.find((object) => object.kind === "creatures")!;
  creature.source.sourceIndex = 0;
  creature.source.creatureAppearanceColors = {
    skin: { present: true, nativeType: "byte", value: 11 },
    hair: { present: true, nativeType: "byte", value: 22 },
    tattoo1: { present: true, nativeType: "byte", value: 33 },
    tattoo2: { present: true, nativeType: "byte", value: 44 },
  };
  creature.creatureProperties = {
    ...(creature.creatureProperties ?? {}),
    appearanceSettings: {
      ...(creature.creatureProperties?.appearanceSettings ?? {}),
      colors: { skin: "12", hair: "22", tattoo1: "33", tattoo2: "45" },
    },
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainCreatureBodyPartMutations(
  harness: ReturnType<typeof createHarness>,
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as unknown as {
    editableScene: {
      objects: Array<{
        kind: string;
        source: Record<string, unknown>;
        creatureProperties?: Record<string, any>;
      }>;
    };
  };
  const creature = payload.editableScene.objects.find((object) => object.kind === "creatures")!;
  creature.source.sourceIndex = 0;
  creature.source.creatureBodyParts = Object.fromEntries([
    "rightFoot", "leftFoot", "rightShin", "leftShin", "leftThigh", "rightThigh",
    "pelvis", "torso", "belt", "neck", "rightForearm", "leftForearm",
    "rightBicep", "leftBicep", "rightShoulder", "leftShoulder", "rightHand",
    "leftHand", "head",
  ].map((key) => [key, { present: false }]));
  Object.assign(creature.source.creatureBodyParts as Record<string, unknown>, {
    rightFoot: {
      present: true,
      value: 12,
      legacyByte: { present: true, nativeType: "byte", value: 12 },
      wideWord: { present: false },
    },
    torso: {
      present: true,
      value: 4096,
      legacyByte: { present: true, nativeType: "byte", value: 0 },
      wideWord: { present: true, nativeType: "word", value: 4096 },
    },
    rightShoulder: {
      present: true,
      value: 1023,
      legacyByte: { present: false },
      wideWord: { present: true, nativeType: "word", value: 1023 },
    },
  });
  creature.creatureProperties = {
    ...(creature.creatureProperties ?? {}),
    appearanceSettings: {
      ...(creature.creatureProperties?.appearanceSettings ?? {}),
      rightFoot: "13",
      torso: "5000",
      sourceOnlyParts: {
        ...(creature.creatureProperties?.appearanceSettings?.sourceOnlyParts ?? {}),
        rightShoulder: "1024",
      },
    },
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainCreatureAppendageMutation(
  harness: ReturnType<typeof createHarness>,
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as unknown as {
    editableScene: {
      objects: Array<{
        kind: string;
        source: Record<string, unknown>;
        creatureProperties?: Record<string, any>;
      }>;
    };
  };
  const creature = payload.editableScene.objects.find(
    (object) => object.kind === "creatures",
  )!;
  creature.source.sourceIndex = 0;
  creature.source.creatureAppendages = {
    wings: {
      present: true,
      value: 1,
      modernDword: {
        present: true,
        nativeType: "dword",
        value: 1,
        table: {
          ...effectiveCreatureAppendageDescriptor("wingmodel.2da"),
          rowIndex: 1,
        },
      },
      legacyByte: { present: true, nativeType: "byte", value: 2 },
    },
    tail: {
      present: true,
      value: 3,
      modernDword: {
        present: true,
        nativeType: "dword",
        value: 3,
        table: {
          ...effectiveCreatureAppendageDescriptor("tailmodel.2da"),
          rowIndex: 3,
        },
      },
      legacyByte: { present: false },
    },
  };
  creature.creatureProperties = {
    ...(creature.creatureProperties ?? {}),
    appearanceSettings: {
      ...(creature.creatureProperties?.appearanceSettings ?? {}),
      wings: "7",
      tail: "3",
    },
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainCreatureHitPointMutation(
  harness: ReturnType<typeof createHarness>,
  racialTypesSha256 = "a".repeat(64),
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as unknown as {
    editableScene: {
      objects: Array<{
        kind: string;
        source: Record<string, unknown>;
        creatureProperties?: Record<string, any>;
      }>;
    };
  };
  const creature = payload.editableScene.objects.find(
    (object) => object.kind === "creatures",
  )!;
  creature.source.sourceIndex = 0;
  creature.source.creatureHitPointState = {
    present: true,
    hitPoints: { nativeType: "short", value: 20 },
    currentHitPoints: { nativeType: "short", value: 77 },
    maxHitPoints: { nativeType: "short", value: 88 },
    constitution: { nativeType: "byte", value: 14 },
    race: { nativeType: "byte", value: 1 },
    classLevels: [3, 2],
    featRow40Present: false,
    racialTypes: {
      ...effectiveCreatureRacialTypesTable().descriptor,
      sha256: racialTypesSha256,
      rowIndex: 1,
      constitutionAdjust: 0,
    },
  };
  creature.creatureProperties = {
    ...(creature.creatureProperties ?? {}),
    statistics: {
      ...(creature.creatureProperties?.statistics ?? {}),
      abilityScores: {
        strength: 10,
        dexterity: 10,
        constitution: 14,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
      baseHitPoints: 25,
      hitPointBonuses: 10,
      currentHitPoints: 20,
      maxHitPoints: 35,
    },
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainCreatureNaturalArmorClassMutation(
  harness: ReturnType<typeof createHarness>,
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as unknown as {
    editableScene: {
      objects: Array<{
        kind: string;
        source: Record<string, unknown>;
        creatureProperties?: Record<string, any>;
      }>;
    };
  };
  const creature = payload.editableScene.objects.find((object) => object.kind === "creatures")!;
  creature.source.sourceIndex = 0;
  creature.source.creatureNaturalArmorClass = {
    present: true,
    nativeType: "byte",
    value: 0,
  };
  creature.creatureProperties = {
    ...(creature.creatureProperties ?? {}),
    statistics: {
      ...(creature.creatureProperties?.statistics ?? {}),
      naturalArmorClass: 2,
    },
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainCreatureSavingThrowBonusMutations(
  harness: ReturnType<typeof createHarness>,
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as unknown as {
    editableScene: {
      objects: Array<{
        kind: string;
        source: Record<string, unknown>;
        creatureProperties?: Record<string, any>;
      }>;
    };
  };
  const creature = payload.editableScene.objects.find((object) => object.kind === "creatures")!;
  creature.source.sourceIndex = 0;
  creature.source.creatureSavingThrowBonuses = {
    reflex: { present: true, nativeType: "short", value: 1 },
    will: { present: true, nativeType: "short", value: 2 },
    fortitude: { present: true, nativeType: "short", value: 3 },
  };
  creature.creatureProperties = {
    ...(creature.creatureProperties ?? {}),
    statistics: {
      ...(creature.creatureProperties?.statistics ?? {}),
      reflexBonus: 4,
      willBonus: 2,
      fortitudeBonus: 5,
    },
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainCreatureAlignmentMutation(
  harness: ReturnType<typeof createHarness>,
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as unknown as {
    editableScene: {
      objects: Array<{
        kind: string;
        source: Record<string, unknown>;
        creatureProperties?: Record<string, any>;
      }>;
    };
  };
  const creature = payload.editableScene.objects.find((object) => object.kind === "creatures")!;
  creature.source.sourceIndex = 0;
  creature.source.creatureAlignment = {
    goodEvil: { present: true, nativeType: "byte", value: 50 },
    lawfulChaotic: { present: true, nativeType: "byte", value: 50 },
  };
  creature.creatureProperties = {
    ...(creature.creatureProperties ?? {}),
    alignment: "Lawful Good",
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function placeableBasicIdentity(rowIndex: number, sha256: string, rowCount: number) {
  return {
    tag: { present: true, value: "CHEST" },
    appearance: {
      present: true,
      nativeType: "dword",
      value: rowIndex,
      table: {
        resourceName: "placeables.2da",
        sourceObjectKey: "modules/current/__aurora/sources/vanilla/placeables.2da",
        sourceLayer: "vanilla",
        sha256,
        sizeBytes: 3_019_695,
        rowCount,
        rowIndex,
      },
    },
  };
}

function retainAppearanceMutation(
  harness: ReturnType<typeof createHarness>,
  targetRow = 105,
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as unknown as {
    editableScene: {
      objects: Array<{
        kind: string;
        source: Record<string, unknown>;
        placeableProperties?: Record<string, unknown>;
      }>;
    };
  };
  const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
  placeable.source.placeableBasicIdentity = placeableBasicIdentity(104, "c".repeat(64), 200);
  placeable.placeableProperties!.appearanceType = targetRow;
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainTrapTypeMutation(
  harness: ReturnType<typeof createHarness>,
  targetRow = 7,
  tableSha256 = "d".repeat(64),
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as unknown as {
    editableScene: {
      objects: Array<{
        kind: string;
        source: Record<string, unknown>;
        placeableProperties?: Record<string, any>;
      }>;
    };
  };
  const placeable = payload.editableScene.objects.find((object) => object.kind === "placeables")!;
  placeable.source.placeableTrapType = {
    expectedValue: 3,
    tableSha256,
    tableRowCount: 48,
  };
  placeable.placeableProperties!.trapSettings = {
    ...(placeable.placeableProperties!.trapSettings ?? {}),
    trapTypeRow: targetRow,
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function effectiveTrapsTable() {
  return {
    descriptor: {
      resourceName: "traps.2da" as const,
      sourceObjectKey: "modules/current/traps.2da",
      sourceLayer: "module" as const,
      sha256: "d".repeat(64),
      sizeBytes: 2048,
      rowCount: 48,
    },
    rows: Array.from({ length: 48 }, (_, rowIndex) => ({
      rowIndex,
      setDc: 10 + rowIndex,
      detectDcMod: rowIndex,
      disarmDcMod: rowIndex + 1,
      displayName: `Trap ${rowIndex}`,
      displaySource: "row_index" as const,
    })),
  };
}

function effectiveBodyBagTable() {
  return {
    descriptor: {
      resourceName: "bodybag.2da" as const,
      sourceObjectKey: "modules/current/bodybag.2da",
      sourceLayer: "module" as const,
      sha256: "e".repeat(64),
      sizeBytes: 502,
      rowCount: 7,
    },
    rows: Array.from({ length: 7 }, (_, rowIndex) => ({
      rowIndex,
      nameStrRef: 6671 + rowIndex,
      displayName: `Body bag ${rowIndex}`,
      displaySource: "row_index" as const,
    })),
  };
}

function retainCreatureDeathRemainsMutation(
  harness: ReturnType<typeof createHarness>,
  tableSha256 = "e".repeat(64),
  sourceLootable: 0 | 1 = 1,
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as any;
  const creature = payload.editableScene.objects.find(
    (object: any) => object.kind === "creatures",
  )!;
  creature.source.sourceIndex = 0;
  creature.source.creatureAdvancedFlags = {
    disarmable: { present: false },
    plot: { present: false },
    immortal: { present: false },
    lootable: { present: true, value: sourceLootable },
    noPermanentDeath: { present: false },
  };
  creature.source.creatureBodyBag = {
    expectedValue: 0,
    tableSha256,
    tableRowCount: 7,
  };
  creature.source.creatureDecayTime = { expectedMilliseconds: 5000 };
  creature.creatureProperties = {
    advancedSettings: {
      leavesLootableCorpse: true,
      treasureModelRow: 3,
      corpseDecayTimeSeconds: 12,
    },
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainCreatureFactionMutation(
  harness: ReturnType<typeof createHarness>,
  targetFaction = 4,
  catalogSha256 = "f".repeat(64),
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as any;
  const creature = payload.editableScene.objects.find(
    (object: any) => object.kind === "creatures",
  )!;
  creature.source.sourceIndex = 0;
  creature.source.creatureFaction = {
    expectedValue: 1,
    catalogSha256,
    catalogFactionCount: 5,
  };
  creature.creatureProperties = {
    advancedSettings: { factionId: targetFaction },
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainEncounterFactionMutation(
  harness: ReturnType<typeof createHarness>,
  targetFaction = 4,
  catalogSha256 = "f".repeat(64),
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as any;
  const encounter = payload.editableScene.objects.find(
    (object: any) => object.kind === "encounters",
  )!;
  encounter.source.sourceIndex = 0;
  encounter.source.encounterFaction = {
    expectedValue: 1,
    catalogSha256,
    catalogFactionCount: 5,
  };
  encounter.encounterFactionId = targetFaction;
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainEncounterDifficultyMutation(
  harness: ReturnType<typeof createHarness>,
  target: Readonly<{ difficulty: number; difficultyIndex: number }> = {
    difficulty: 3,
    difficultyIndex: 4,
  },
  catalogSha256 = "d".repeat(64),
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as any;
  const encounter = payload.editableScene.objects.find(
    (object: any) => object.kind === "encounters",
  )!;
  encounter.source.sourceIndex = 0;
  encounter.source.encounterDifficulty = {
    expectedValue: { difficulty: 1, difficultyIndex: 2 },
    catalogSha256,
    catalogRowCount: 5,
  };
  encounter.encounterDifficulty = target;
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainEncounterLocalizedNameMutation(
  harness: ReturnType<typeof createHarness>,
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as any;
  const encounter = payload.editableScene.objects.find(
    (object: any) => object.kind === "encounters",
  )!;
  encounter.source.sourceIndex = 0;
  encounter.source.encounterLocalizedNameStorage = {
    present: true,
    strRef: 0xffff_ffff,
    entries: [{ languageId: 0, textBytesBase64: "R25vbGwgQW1idXNo" }],
  };
  encounter.encounterLocalizedName = "Night Ambush";
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainCreatureTemplateResRefMutation(
  harness: ReturnType<typeof createHarness>,
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as any;
  const creature = payload.editableScene.objects.find(
    (object: any) => object.kind === "creatures",
  )!;
  creature.source.sourceIndex = 0;
  creature.source.creatureTemplateResRef = { expectedResRef: "nw_guard" };
  creature.creatureProperties = {
    advancedSettings: { blueprintResRef: "nw_guard_alt" },
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainCreatureSpecialIdentityStringsMutation(
  harness: ReturnType<typeof createHarness>,
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as any;
  const creature = payload.editableScene.objects.find(
    (object: any) => object.kind === "creatures",
  )!;
  creature.source.sourceIndex = 0;
  creature.source.creatureSpecialIdentityStrings = {
    subrace: { expectedValue: "Moon Elf" },
    deity: { expectedValue: "" },
  };
  creature.creatureProperties = {
    advancedSettings: { subrace: "Sun Elf", deity: "Mystra" },
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainCreatureScriptResRefMutation(
  harness: ReturnType<typeof createHarness>,
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as any;
  const creature = payload.editableScene.objects.find(
    (object: any) => object.kind === "creatures",
  )!;
  creature.source.sourceIndex = 0;
  creature.source.creatureScriptResRefs = {
    onHeartbeat: { expectedResRef: "NW_C2_DEFAULT1" },
    onSpawn: { expectedResRef: "nw_c2_default9" },
    onDeath: { expectedResRef: "nw_c2_default7" },
  };
  creature.creatureProperties = {
    scriptSlots: {
      onHeartbeat: "main",
      onSpawn: "spawn_probe",
      onDeath: "nw_c2_default7",
    },
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function retainBodyBagMutation(
  harness: ReturnType<typeof createHarness>,
  targetRow = 3,
  tableSha256 = "e".repeat(64),
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as any;
  const placeable = payload.editableScene.objects.find((object: any) => object.kind === "placeables")!;
  placeable.source.placeableBodyBag = { expectedValue: 0, tableSha256, tableRowCount: 7 };
  placeable.placeableProperties.advancedSettings = {
    ...(placeable.placeableProperties.advancedSettings ?? {}),
    treasureModelRow: targetRow,
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function effectivePortraitsTable() {
  return {
    descriptor: {
      resourceName: "portraits.2da" as const,
      sourceObjectKey: "modules/current/portraits.2da",
      sourceLayer: "module" as const,
      sha256: "a".repeat(64),
      sizeBytes: 4096,
      rowCount: 700,
    },
    rows: [
      { rowIndex: 462, baseResRef: "po_hu_m_01_" },
      { rowIndex: 463, baseResRef: "po_hu_m_02_" },
    ],
  };
}

function retainPortraitMutation(
  harness: ReturnType<typeof createHarness>,
  targetRow = 463,
  tableSha256 = "a".repeat(64),
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as any;
  const placeable = payload.editableScene.objects.find((object: any) => object.kind === "placeables")!;
  placeable.source.placeablePortrait = {
    expectedValue: 462,
    tableSha256,
    tableRowCount: 700,
  };
  placeable.placeableProperties.advancedSettings = {
    ...(placeable.placeableProperties.advancedSettings ?? {}),
    portraitId: targetRow,
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

function moduleFactionCatalog() {
  return {
    descriptor: {
      resourceName: "repute.fac" as const,
      sourceObjectKey: "modules/current/repute.fac",
      sha256: "f".repeat(64),
      sizeBytes: 1889,
      factionCount: 5,
    },
    rows: ["PC", "Hostile", "Commoner", "Merchant", "Defender"].map(
      (name, factionId) => ({
        factionId,
        name,
        parentFactionId: 0xffffffff,
        isGlobal: true,
      }),
    ),
  };
}

function encounterDifficultyCatalog() {
  const values = [-2, -1, 1, 2, 3] as const;
  return {
    schemaVersion: "area-encounter-difficulty-catalog.v1" as const,
    descriptor: {
      resourceName: "encdifficulty.2da" as const,
      sourceObjectKey: "modules/current/encdifficulty.2da",
      sourceLayer: "module" as const,
      sha256: "d".repeat(64),
      sizeBytes: 256,
      rowCount: values.length,
    },
    rows: values.map((value, rowIndex) => ({
      rowIndex,
      strRef: 1000 + rowIndex,
      value,
      displayName: `Difficulty ${rowIndex}`,
      displaySource: "strref" as const,
    })),
  };
}

function retainFactionMutation(
  harness: ReturnType<typeof createHarness>,
  targetFaction = 3,
  catalogSha256 = "f".repeat(64),
): void {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as any;
  const placeable = payload.editableScene.objects.find((object: any) => object.kind === "placeables")!;
  placeable.source.placeableFaction = {
    expectedValue: 2,
    catalogSha256,
    catalogFactionCount: 5,
  };
  placeable.placeableProperties.advancedSettings = {
    ...(placeable.placeableProperties.advancedSettings ?? {}),
    factionId: targetFaction,
  };
  harness.drafts.read.mockResolvedValueOnce(mutated);
}

async function compile(
  harness: ReturnType<typeof createHarness>,
  moduleState: Readonly<{
    moduleId: string;
    revision: string;
    quarantined: boolean;
  }> = { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
) {
  return harness.compiler.compile(
    harness.command,
    moduleState,
    "actor-01",
    "tx-test",
  );
}

async function captureCompileFailure(
  harness: ReturnType<typeof createHarness>,
  moduleState?: Readonly<{
    moduleId: string;
    revision: string;
    quarantined: boolean;
  }>,
): Promise<AreaUpdateCompilerFailure> {
  try {
    await compile(harness, moduleState);
  } catch (error) {
    expect(error).toBeInstanceOf(AreaUpdateCompilerFailure);
    return error as AreaUpdateCompilerFailure;
  }
  throw new Error("Expected Area update compilation to fail.");
}

function storeCommerceDraft(
  harness: ReturnType<typeof createHarness>,
): AreaDraftSnapshot {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as Record<string, any>;
  const store = payload.editableScene.objects.find(
    (object: Record<string, unknown>) => object.kind === "stores",
  );
  Object.assign(store, { x: 4.29145, y: 5.0394, z: 0, bearing: Math.PI * 1.5 });
  store.source.sourceIndex = 0;
  store.source.storeCommerce = {
    markUp: 100,
    markDown: 65,
    blackMarket: false,
    blackMarketMarkDown: 25,
    identifyPrice: 100,
    maxBuyPrice: -1,
    storeGold: -1,
  };
  store.storeProperties = {
    commerce: {
      ...store.source.storeCommerce,
      markUp: 125,
    },
  };
  return mutated;
}

function storeScriptResRefsDraft(
  harness: ReturnType<typeof createHarness>,
): AreaDraftSnapshot {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as Record<string, any>;
  const store = payload.editableScene.objects.find(
    (object: Record<string, unknown>) => object.kind === "stores",
  );
  Object.assign(store, { x: 4.29145, y: 5.0394, z: 0, bearing: Math.PI * 1.5 });
  store.source.sourceIndex = 0;
  store.source.storeScriptResRefs = {
    onOpenStore: "store_open",
    onStoreClosed: "store_closed",
  };
  store.storeProperties = {
    scriptResRefs: {
      onOpenStore: "nw_store_open",
      onStoreClosed: "nw_store_close",
    },
  };
  return mutated;
}

function storeVariablesDraft(
  harness: ReturnType<typeof createHarness>,
): AreaDraftSnapshot {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as Record<string, any>;
  const store = payload.editableScene.objects.find(
    (object: Record<string, unknown>) => object.kind === "stores",
  );
  Object.assign(store, { x: 4.29145, y: 5.0394, z: 0, bearing: Math.PI * 1.5 });
  store.source.sourceIndex = 0;
  store.source.storeVariables = { expectedEntries: [] };
  store.storeProperties = {
    variables: [
      { name: "Label", type: "string", value: "ready" },
      { name: "Counter", type: "int", value: -4 },
    ],
  };
  return mutated;
}

function storeRestrictionsDraft(
  harness: ReturnType<typeof createHarness>,
): AreaDraftSnapshot {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as Record<string, any>;
  const catalog = effectiveItemBaseItemsTable();
  payload.editableScene.itemBaseItemCatalog = catalog;
  const store = payload.editableScene.objects.find(
    (object: Record<string, unknown>) => object.kind === "stores",
  );
  Object.assign(store, { x: 4.29145, y: 5.0394, z: 0, bearing: Math.PI * 1.5 });
  store.source.sourceIndex = 0;
  store.source.storeRestrictions = {
    expectedValue: {
      willNotBuy: { present: false, baseItemIds: [] },
      willOnlyBuy: { present: false, baseItemIds: [] },
    },
    tableSha256: catalog.descriptor.sha256,
    tableRowCount: catalog.descriptor.rowCount,
  };
  store.storeProperties = {
    restrictions: { willNotBuy: [1, 2, 1], willOnlyBuy: [0] },
  };
  return mutated;
}

function storeInventoryDraft(
  harness: ReturnType<typeof createHarness>,
): AreaDraftSnapshot {
  const mutated = structuredClone(harness.snapshot);
  const payload = mutated.draft.payload as Record<string, any>;
  const catalog = effectiveItemBaseItemsTable();
  payload.editableScene.itemBaseItemCatalog = catalog;
  const store = payload.editableScene.objects.find(
    (object: Record<string, unknown>) => object.kind === "stores",
  );
  Object.assign(store, { x: 4.29145, y: 5.0394, z: 0, bearing: Math.PI * 1.5 });
  store.source.sourceIndex = 0;
  store.source.storeInventory = {
    expectedBuckets: [
      {
        bucketTypeId: 0,
        entries: [
          {
            sourceIndex: 0,
            resRef: "itm_a",
            baseItemId: 0,
            slotWidth: 1,
            slotHeight: 1,
            x: 0,
            y: 0,
            infinite: true,
          },
          {
            sourceIndex: 1,
            resRef: "itm_b",
            baseItemId: 1,
            slotWidth: 1,
            slotHeight: 1,
            x: 1,
            y: 0,
            infinite: false,
          },
        ],
      },
      { bucketTypeId: 4, entries: [] },
      { bucketTypeId: 2, entries: [] },
      { bucketTypeId: 3, entries: [] },
      { bucketTypeId: 1, entries: [] },
    ],
    tableSha256: catalog.descriptor.sha256,
    tableRowCount: catalog.descriptor.rowCount,
  };
  store.storeProperties = {
    inventoryBuckets: [
      {
        bucketTypeId: 0,
        entries: [
          { sourceIndex: 1, resRef: "itm_b", baseItemId: 1, infinite: true },
          { sourceIndex: 0, resRef: "itm_a", baseItemId: 0, infinite: false },
        ],
      },
      { bucketTypeId: 4, entries: [] },
      { bucketTypeId: 2, entries: [] },
      { bucketTypeId: 3, entries: [] },
      { bucketTypeId: 1, entries: [] },
    ],
  };
  return mutated;
}

function draftSnapshot(
  sourceAreaSha256: string,
  sourceGitSha256?: string,
  includePlaceable = false,
  includeWaypoint = false,
  includeItem = false,
  includeSound = false,
  includeStore = false,
  includeTrigger = false,
  includeEncounter = false,
  includeNewWaypoint = false,
  includeDoor = false,
): AreaDraftSnapshot {
  return {
    draftId: "draft-01",
    title: "Crypt update",
    revision: 3,
    updatedAt: "2026-08-12T10:00:00.000Z",
    normalizedSha256: DRAFT_HASH,
    source: { type: "production_area", areaId: `area_${AREA}` },
    draft: {
      schemaVersion: "area-draft.v1",
      title: "Crypt update",
      source: { type: "production_area", areaId: `area_${AREA}` },
      payload: {
        schemaVersion: "production-area-draft-payload.v1",
        provenance: {
          areaId: `area_${AREA}`,
          sourceUpdatedAt: "2026-08-12T09:00:00.000Z",
          processingCacheKey: "cache-01",
          ...(sourceGitSha256 ? { sourceGitSha256 } : {}),
        },
        sourceArea: {
          areaId: `area_${AREA}`,
          name: "Crypt 01",
          width: 2,
          height: 2,
        },
        editableScene: {
          areaName: "Crypt 01",
          width: 2,
          height: 2,
          ...(sourceGitSha256
            ? {
                objects: [{
                  id: "area_crypt01:obj_cre_nw_guard",
                  kind: "creatures",
                  resRef: "nw_guard",
                  tag: "NW_GUARD",
                  x: 1,
                  y: 2,
                  z: 0,
                  bearing: 0,
                  source: {
                    type: "aurora_git",
                    areaId: "area_crypt01",
                    sourceObjectId: "obj_cre_nw_guard",
                    sourceKind: "creature",
                  },
                }, ...(includePlaceable ? [{
                  id: "area_crypt01:obj_plc_chest",
                  kind: "placeables",
                  resRef: "plc_chest",
                  tag: "CHEST",
                  x: 4,
                  y: 5,
                  z: 0,
                  bearing: 0,
                  source: {
                    type: "aurora_git",
                    areaId: "area_crypt01",
                    sourceObjectId: "obj_plc_chest",
                    sourceKind: "placeable",
                    placeableOnUsed: "",
                    placeableScriptResRefs: { onClick: "", onOpen: "old_open" },
                    placeableTrapScriptResRefs: {
                      onDisarmScript: "",
                      onTrapTriggeredScript: "old_trigger",
                    },
                    placeablePlot: false,
                    placeableHasInventory: false,
                    placeableDurabilitySaveBytes: {
                      hardness: 5,
                      fortitudeSave: 16,
                      reflexSave: 0,
                      willSave: 0,
                    },
                    placeableLockSettings: {
                      locked: false,
                      canRelock: false,
                      autoRemoveKeyAfterUse: false,
                      keyRequiredToUnlockOrLock: false,
                      openLockDc: 18,
                      closeLockDc: 0,
                      keyTag: "",
                    },
                  },
                  placeableProperties: {
                    plot: false,
                    hasInventory: false,
                    hardness: 5,
                    fortitudeSave: 16,
                    reflexSave: 0,
                    willSave: 0,
                    lockSettings: {
                      locked: false,
                      canRelock: false,
                      autoRemoveKeyAfterUse: false,
                      keyRequiredToUnlockOrLock: false,
                      openLockDc: 18,
                      closeLockDc: 0,
                      keyTag: "",
                    },
                    scriptSlots: { onUsed: "", onClick: "", onOpen: "old_open" },
                    trapSettings: {
                      onDisarmScript: "",
                      onTrapTriggeredScript: "old_trigger",
                    },
                  },
                }] : []), ...(includeDoor ? [{
                  id: "area_crypt01:obj_dr_door",
                  kind: "doors",
                  resRef: "nw_door",
                  tag: "DOOR",
                  x: 4,
                  y: 5,
                  z: 0,
                  bearing: 0,
                  source: {
                    type: "aurora_git",
                    areaId: "area_crypt01",
                    sourceObjectId: "obj_dr_door",
                    sourceIndex: 0,
                    sourceKind: "door",
                    doorTransitionStorage: {
                      linkedTo: "OLD_DEST",
                      linkedToFlags: 1,
                      loadScreenId: 0,
                    },
                  },
                  doorTransition: {
                    storage: {
                      linkedTo: "NEW_DEST",
                      linkedToFlags: 2,
                      loadScreenId: 7,
                    },
                  },
                }] : []), ...(includeWaypoint ? [{
                  id: "area_crypt01:obj_wpt_waypoint",
                  kind: "waypoints",
                  resRef: "nw_waypoint001",
                  tag: "WAYPOINT",
                  x: 3.31162,
                  y: 4.77472,
                  z: 0.35019426345825195,
                  bearing: Math.PI * 1.5,
                  source: {
                    type: "aurora_git",
                    areaId: "area_crypt01",
                    sourceObjectId: "obj_wpt_waypoint",
                    sourceKind: "waypoint",
                  },
                }] : []), ...(includeSound ? [{
                  id: "area_crypt01:obj_snd_animalcriesday",
                  kind: "sounds",
                  resRef: "animalcriesday",
                  tag: "AnimalCriesDay",
                  x: 4,
                  y: 5,
                  z: 0.15,
                  bearing: 0,
                   soundIntervalVariation: {
                    intervalMilliseconds: 25_000,
                    intervalVariationMilliseconds: 5_000,
                    pitchVariationHundredths: 20,
                     volumeVariationByte: 64,
                   },
                   soundVolume: { volumeByte: 64 },
                   soundSchedule: { hoursMask: 0, timesByte: 3 },
                   soundActive: { activeByte: 1 },
                   soundPlayOrder: { randomByte: 0 },
                   soundPlayStyle: {
                     loopingByte: 0, continuousByte: 1, priorityByte: 20,
                     positionalByte: 1, soundsCount: 2, intervalDword: 25_000,
                     intervalVariationDword: 5_000,
                   },
                   soundPlayback: {
                     sounds: ["snd_a", "snd_b"],
                     loopingByte: 0, continuousByte: 1, priorityByte: 20,
                     positionalByte: 1, intervalDword: 25_000,
                     intervalVariationDword: 5_000,
                   },
                   source: {
                    type: "aurora_git",
                    areaId: "area_crypt01",
                    sourceObjectId: "obj_snd_animalcriesday",
                    sourceIndex: 0,
                    sourceKind: "sound",
                     soundIntervalVariationStorage: {
                      intervalMilliseconds: 25_000,
                      intervalVariationMilliseconds: 5_000,
                      pitchVariationHundredths: 20,
                       volumeVariationByte: 64,
                     },
                     soundVolumeStorage: { volumeByte: 64 },
                     soundScheduleStorage: { hoursMask: 0, timesByte: 3 },
                     soundActiveStorage: { activeByte: 1 },
                     soundPlayOrderStorage: { randomByte: 0 },
                     soundPlayStyleStorage: {
                       loopingByte: 0, continuousByte: 1, priorityByte: 20,
                       positionalByte: 1, soundsCount: 2, intervalDword: 25_000,
                       intervalVariationDword: 5_000,
                     },
                     soundPlaybackStorage: {
                       sounds: ["snd_a", "snd_b"],
                       loopingByte: 0, continuousByte: 1, priorityByte: 20,
                       positionalByte: 1, intervalDword: 25_000,
                       intervalVariationDword: 5_000,
                     },
                   },
                }] : []), ...(includeStore ? [{
                  id: "area_crypt01:obj_sto_x2_merc_dye",
                  kind: "stores",
                  resRef: "x2_merc_dye",
                  tag: "x2_merc_dye",
                  x: 4.291445541381836,
                  y: 5.039402770996094,
                  z: 0.0000000499999987376214,
                  bearing: Math.PI * 1.5,
                  source: {
                    type: "aurora_git",
                    areaId: "area_crypt01",
                    sourceObjectId: "obj_sto_x2_merc_dye",
                    sourceKind: "store",
                  },
                }] : []), ...(includeTrigger ? [{
                  id: "area_crypt01:obj_trg_generictrigger",
                  kind: "triggers",
                  resRef: "newgeneric",
                  tag: "GenericTrigger",
                  x: 3.547599411010742,
                  y: 4.491108703613281,
                  z: 0,
                  bearing: 0,
                  source: {
                    type: "aurora_git",
                    areaId: "area_crypt01",
                    sourceObjectId: "obj_trg_generictrigger",
                    sourceKind: "trigger",
                  },
                }] : []), ...(includeEncounter ? [{
                  id: "area_crypt01:obj_enc_x2_gnoll001",
                  kind: "encounters",
                  resRef: "x2_gnoll001",
                  tag: "X2_GNOLL001",
                  x: 2.241201591491699,
                  y: 4.51970329284668,
                  z: 0,
                  bearing: 0,
                  source: {
                    type: "aurora_git",
                    areaId: "area_crypt01",
                    sourceObjectId: "obj_enc_x2_gnoll001",
                    sourceKind: "encounter",
                  },
                }] : []), ...(includeItem ? [{
                  id: "area_crypt01:obj_itm_nw_sword",
                  kind: "items",
                  resRef: "nw_sword",
                  tag: "NW_SWORD",
                  x: 3,
                  y: 4,
                  z: 0,
                  bearing: 0,
                  source: {
                    type: "aurora_git",
                    areaId: "area_crypt01",
                    sourceObjectId: "obj_itm_nw_sword",
                    sourceKind: "item",
                  },
                }] : []), ...(includeNewWaypoint ? [newWaypointSceneObject()] : [])],
              }
            : {}),
          auroraAreaEditing: {
            state: {
              schemaVersion: 1,
              areaResRef: AREA,
              tilesetResRef: "tin01",
              tilesetFingerprint: "e".repeat(64),
              sourceAreaFingerprint: sourceAreaSha256,
              width: 2,
              height: 2,
              tiles: tiles(),
            },
          },
        },
      },
    },
  };
}

function newWaypointSceneObject() {
  const bytes = waypointBlueprint();
  return {
    id: "wpt_001",
    kind: "waypoints",
    resRef: "nw_waypoint001",
    tag: "NW_WAYPOINT001",
    x: 3.5,
    y: 4.75,
    z: 0.35,
    bearing: Math.PI / 2,
    source: {
      type: "aurora_blueprint",
      sourceKind: "waypoint",
      sourceProfileId: "nwn-base-key-utw-v1",
      templateId: "nw_waypoint001",
      sourceEtag: sha256(bytes),
      sourceFileType: "UTW ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function waypointBlueprint(): Buffer {
  return buildGffBuffer([
    { label: "Comment", type: "cexostring", value: "Patrol path waypoint." },
    { label: "Description", type: "cexolocstring", value: { strRef: 0xffffffff, entries: [] } },
    { label: "LinkedTo", type: "cexostring", value: "" },
    { label: "TemplateResRef", type: "resref", value: "nw_waypoint001" },
    { label: "LocalizedName", type: "cexolocstring", value: { strRef: 14817, entries: [] } },
    { label: "Tag", type: "cexostring", value: "NW_WAYPOINT001" },
    { label: "HasMapNote", type: "byte", value: 0 },
    { label: "PaletteID", type: "byte", value: 5 },
  ], "UTW ", 0xffffffff);
}

function newSoundSceneObject(sourceEtag: string) {
  return {
    id: "sou_001",
    kind: "sounds",
    resRef: "animalcriesday",
    tag: "AnimalCriesDay",
    x: 3.75,
    y: 4.9,
    z: 0.15,
    bearing: 0,
    source: {
      type: "aurora_blueprint",
      sourceKind: "sound",
      sourceProfileId: "nwn-base-key-uts-animalcriesday-v1",
      templateId: "animalcriesday",
      sourceEtag,
      sourceFileType: "UTS ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function newPlaceableSceneObject(sourceEtag: string) {
  return {
    id: "pla_001",
    kind: "placeables",
    resRef: "plc_watertrough",
    tag: "WaterTrough",
    x: 2.744,
    y: 2.976,
    z: 0.125,
    bearing: Math.PI / 3,
    source: {
      type: "aurora_blueprint",
      sourceKind: "placeable",
      sourceProfileId: "nwn-base-key-utp-plc-watertrough-v1",
      templateId: "plc_watertrough",
      sourceEtag,
      sourceFileType: "UTP ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function newDynamicPlaceableSceneObject(sourceEtag: string, sourceObjectKey: string) {
  return {
    id: "pla_dynamic",
    kind: "placeables",
    resRef: "plc_watertrough",
    tag: "Water Trough",
    x: 2.744,
    y: 2.976,
    z: 0.125,
    bearing: Math.PI / 3,
    source: {
      type: "aurora_blueprint",
      sourceKind: "placeable",
      sourceProfileId: "effective-catalog-utp-placeable-copy-v1",
      templateId: "plc_plc_watertrough",
      templateResRef: "plc_watertrough",
      sourceObjectKey,
      sourceEtag,
      sourceFileType: "UTP ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function replaceNewBlueprintObject(
  snapshot: AreaDraftSnapshot,
  replacement: Record<string, unknown>,
): void {
  const payload = snapshot.draft.payload as any;
  const index = payload.editableScene.objects.findIndex(
    (object: any) => object.source?.type === "aurora_blueprint",
  );
  if (index < 0) throw new Error("Expected one new blueprint fixture object.");
  payload.editableScene.objects[index] = replacement;
}

function dynamicPlaceableBlueprintWithPortraitId(portraitId: number): Buffer {
  const source = parseRawGffDocument(placeableBlueprintFixture())!;
  return buildGffBuffer([
    ...source.fields.filter((field) => field.label !== "Portrait"),
    { label: "PortraitId", type: "word", value: portraitId },
  ] as SupportedGffField[], "UTP ", 0xffffffff);
}

function dynamicPlaceableInventoryBlueprintFixture(): Buffer {
  const source = parseRawGffDocument(dynamicPlaceableBlueprintWithPortraitId(462))!;
  return buildGffBuffer([
    ...source.fields
      .filter((field) => !["TemplateResRef", "Tag", "ItemList"].includes(field.label)),
    { label: "TemplateResRef", type: "resref", value: "plc_fenbush" },
    { label: "Tag", type: "cexostring", value: "Fern Bush" },
    {
      label: "ItemList",
      type: "list",
      value: [{
        typeId: 0,
        fields: [
          { label: "InventoryRes", type: "resref", value: "nw_it_msmlmisc12" },
          { label: "Repos_PosX", type: "word", value: 0 },
          { label: "Repos_Posy", type: "word", value: 0 },
        ],
      }],
    },
  ] as SupportedGffField[], "UTP ", 0xffffffff);
}

function dynamicPlaceableMiscItemBlueprintFixture(): Buffer {
  return buildGffBuffer([
    { label: "PaletteID", type: "byte", value: 54 },
    { label: "BaseItem", type: "int", value: 24 },
    { label: "PropertiesList", type: "list", value: [] },
    { label: "StackSize", type: "word", value: 1 },
    { label: "Cost", type: "dword", value: 0 },
    { label: "LocalizedName", type: "cexolocstring", value: { strRef: 13494, entries: [] } },
    { label: "ModelPart1", type: "byte", value: 66 },
    { label: "TemplateResRef", type: "resref", value: "nw_it_msmlmisc12" },
    { label: "Comment", type: "cexostring", value: "1" },
    { label: "DescIdentified", type: "cexolocstring", value: { strRef: 58566, entries: [] } },
    { label: "Tag", type: "cexostring", value: "NW_IT_MSMLMISC12" },
    { label: "Charges", type: "byte", value: 0 },
    { label: "Description", type: "cexolocstring", value: { strRef: 0xffffffff, entries: [] } },
    { label: "Stolen", type: "byte", value: 0 },
    { label: "AddCost", type: "dword", value: 0 },
    { label: "Plot", type: "byte", value: 0 },
    { label: "Identified", type: "byte", value: 1 },
  ] as SupportedGffField[], "UTI ", 0xffffffff);
}

function dynamicPlaceableBlueprintWithoutPortraitIdentity(): Buffer {
  const source = parseRawGffDocument(placeableBlueprintFixture())!;
  return buildGffBuffer(
    source.fields.filter(
      (field) => field.label !== "Portrait" && field.label !== "PortraitId",
    ),
    "UTP ",
    0xffffffff,
  );
}

function dynamicPlaceableBlueprintWithBothPortraitIdentities(): Buffer {
  const source = parseRawGffDocument(placeableBlueprintFixture())!;
  return buildGffBuffer([
    ...source.fields,
    { label: "PortraitId", type: "word", value: 462 },
  ] as SupportedGffField[], "UTP ", 0xffffffff);
}

function dynamicPlaceableBlueprintWithWrongPortraitIdType(): Buffer {
  const source = parseRawGffDocument(placeableBlueprintFixture())!;
  return buildGffBuffer([
    ...source.fields.filter((field) => field.label !== "Portrait"),
    { label: "PortraitId", type: "dword", value: 462 },
  ] as SupportedGffField[], "UTP ", 0xffffffff);
}

function newItemSceneObject(sourceEtag: string) {
  return {
    id: "itm_001",
    kind: "items",
    resRef: "nw_cloth022",
    tag: "NW_CLOTH022",
    x: 1.5,
    y: 2.25,
    z: 0.1,
    bearing: Math.PI / 4,
    source: {
      type: "aurora_blueprint",
      sourceKind: "item",
      sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
      templateId: "nw_cloth022",
      sourceEtag,
      sourceFileType: "UTI ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function newDynamicItemSceneObject(
  sourceEtag: string,
  sourceObjectKey: string,
  sourceSizeBytes: number,
) {
  return {
    id: "itm_dynamic",
    kind: "items",
    resRef: "nw_cloth022",
    tag: "NW_CLOTH022",
    x: 1.5,
    y: 2.25,
    z: 0.1,
    bearing: Math.PI / 4,
    source: {
      type: "aurora_blueprint",
      sourceKind: "item",
      sourceProfileId: "effective-catalog-uti-item-copy-v1",
      templateId: "itm_nw_cloth022",
      templateResRef: "nw_cloth022",
      sourceObjectKey,
      sourceSizeBytes,
      sourceEtag,
      sourceFileType: "UTI ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function dynamicStoreBlueprintFixture(): Buffer {
  return buildGffBuffer([
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
  ], "UTM ", 0xffffffff);
}

function newDynamicStoreSceneObject(
  sourceEtag: string,
  sourceObjectKey: string,
  sourceSizeBytes: number,
) {
  return {
    id: "sto_dynamic",
    kind: "stores",
    resRef: "str_dynamic",
    tag: "Dynamic_Store",
    x: 1.5,
    y: 2.25,
    z: 0.1,
    bearing: Math.PI / 4,
    source: {
      type: "aurora_blueprint",
      sourceKind: "store",
      sourceProfileId: "effective-catalog-utm-store-copy-v1",
      templateId: "str_str_dynamic",
      templateResRef: "str_dynamic",
      sourceObjectKey,
      sourceSizeBytes,
      sourceEtag,
      sourceFileType: "UTM ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function newCreatureSceneObject(
  sourceEtag: string,
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }>,
) {
  return {
    id: "cre_001",
    kind: "creatures",
    resRef: "nw_chicken",
    tag: "NW_CHICKEN",
    ...transform,
    source: {
      type: "aurora_blueprint",
      sourceKind: "creature",
      sourceProfileId: "nwn-base-key-utc-nw-chicken-v1",
      templateId: "nw_chicken",
      sourceEtag,
      sourceFileType: "UTC ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function newStoreSceneObject(
  sourceEtag: string,
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }>,
) {
  return {
    id: "sto_001",
    kind: "stores",
    resRef: "x2_merc_dye",
    tag: "x2_merc_dye",
    ...transform,
    source: {
      type: "aurora_blueprint",
      sourceKind: "store",
      sourceProfileId: "nwn-base-key-utm-x2-merc-dye-v1",
      templateId: "x2_merc_dye",
      sourceEtag,
      sourceFileType: "UTM ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function newTriggerSceneObject(
  sourceEtag: string,
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }>,
) {
  return {
    id: "tri_001",
    kind: "triggers",
    resRef: "newgeneric",
    tag: "GenericTrigger",
    ...transform,
    source: {
      type: "aurora_blueprint",
      sourceKind: "trigger",
      sourceProfileId: "nwn-base-key-utt-newgeneric-v1",
      templateId: "newgeneric",
      sourceEtag,
      sourceFileType: "UTT ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function newEncounterSceneObject(
  sourceEtag: string,
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }>,
) {
  return {
    id: "enc_001",
    kind: "encounters",
    resRef: "x2_gnoll001",
    tag: "X2_GNOLL001",
    ...transform,
    source: {
      type: "aurora_blueprint",
      sourceKind: "encounter",
      sourceProfileId: "nwn-base-key-ute-x2-gnoll001-v1",
      templateId: "x2_gnoll001",
      sourceEtag,
      sourceFileType: "UTE ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function newDynamicEncounterSceneObject(
  sourceEtag: string,
  sourceObjectKey: string,
  sourceSizeBytes: number,
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }>,
) {
  return {
    id: "enc_dynamic",
    kind: "encounters",
    resRef: "enc_dynamic",
    tag: "DYNAMIC_ENCOUNTER",
    ...transform,
    source: {
      type: "aurora_blueprint",
      sourceKind: "encounter",
      sourceProfileId: "effective-catalog-ute-encounter-copy-v1",
      templateId: "enc_enc_dynamic",
      templateResRef: "enc_dynamic",
      sourceObjectKey,
      sourceSizeBytes,
      sourceEtag,
      sourceFileType: "UTE ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function newDynamicWaypointSceneObject(
  sourceEtag: string,
  sourceObjectKey: string,
  sourceSizeBytes: number,
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }>,
) {
  return {
    id: "wpt_dynamic",
    kind: "waypoints",
    resRef: "wp_dynamic",
    tag: "WP_DYNAMIC",
    ...transform,
    source: {
      type: "aurora_blueprint",
      sourceKind: "waypoint",
      sourceProfileId: "effective-catalog-utw-waypoint-copy-v1",
      templateId: "wpt_wp_dynamic",
      templateResRef: "wp_dynamic",
      sourceObjectKey,
      sourceSizeBytes,
      sourceEtag,
      sourceFileType: "UTW ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };
}

function newDoorSceneObject(sourceEtag: string) {
  return {
    id: "doo_001",
    kind: "doors",
    resRef: "nw_door_ttr_04",
    tag: "Barn1Door",
    x: 0.5,
    y: 0.576,
    z: 0,
    bearing: Math.PI,
    source: {
      type: "aurora_blueprint",
      sourceKind: "door",
      sourceProfileId: "nwn-base-key-utd-nw-door-ttr-04-tin01-121-0-v1",
      templateId: "nw_door_ttr_04",
      sourceEtag,
      sourceFileType: "UTD ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      doorHook: {
        profileId: "tin01-tile121-orientation0-door0-v1",
        tilesetResRef: "tin01",
        tilesetSha256: "e45bfba6f61442e7618b7477f0967943b6ff74a2c02593da6c031c641b3e6ac4",
        tileId: 121,
        tileOrientation: 0,
        tileHeight: 0,
        hookIndex: 0,
        hookType: 0,
        localX: 0,
        localY: 0.76,
        localZ: 0,
        orientationDegrees: 180,
        row: 0,
        col: 0,
      },
    },
  };
}

function soundBlueprint(): Buffer {
  return buildGffBuffer([
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
}

function nativeStoreInventory(): Extract<SupportedGffField, { type: "list" }> {
  return {
    label: "StoreList",
    type: "list",
    value: [
      {
        typeId: 0,
        fields: [{
          label: "ItemList",
          type: "list",
          value: [
            {
              typeId: 0,
              fields: [
                { label: "TemplateResRef", type: "resref", value: "itm_a" },
                { label: "BaseItem", type: "int", value: 0 },
                { label: "OpaqueA", type: "int", value: 77 },
                { label: "Repos_PosX", type: "word", value: 0 },
                { label: "Repos_Posy", type: "word", value: 0 },
                { label: "Infinite", type: "byte", value: 1 },
              ],
            },
            {
              typeId: 1,
              fields: [
                { label: "TemplateResRef", type: "resref", value: "itm_b" },
                { label: "BaseItem", type: "int", value: 1 },
                { label: "OpaqueB", type: "cexostring", value: "preserve-b" },
                { label: "Repos_PosX", type: "word", value: 1 },
                { label: "Repos_Posy", type: "word", value: 0 },
              ],
            },
          ],
        }],
      },
      { typeId: 4, fields: [] },
      { typeId: 2, fields: [] },
      { typeId: 3, fields: [] },
      { typeId: 1, fields: [] },
    ],
  };
}

function objectPair(options: Readonly<{
  omitItemGic?: boolean;
  includeEncounter?: boolean;
  includeDoor?: boolean;
  includePlaceable?: boolean;
  includePlaceableInventory?: boolean;
  includeSound?: boolean;
  includeStore?: boolean;
  includeStoreInventory?: boolean;
  includeTrigger?: boolean;
  includeWaypoint?: boolean;
  includeCreatureEquipment?: boolean;
  creatureLocalizedStrings?: boolean;
  includeCreatureAppearance?: boolean;
  includeCreatureGender?: boolean;
  includeCreatureWalkRate?: boolean;
  includeCreaturePortrait?: boolean;
  includeCreatureChallengeRating?: boolean;
  includeCreatureAbilityScores?: boolean;
  includeCreatureAppearanceColors?: boolean;
  includeCreatureBodyParts?: boolean;
  includeCreatureAppendages?: boolean;
  includeCreatureHitPoints?: boolean;
  includeCreatureNaturalArmorClass?: boolean;
  includeCreatureSavingThrowBonuses?: boolean;
  includeCreatureAlignment?: boolean;
  includeCreatureDeathRemains?: boolean;
  includeCreatureFaction?: boolean;
  creatureSpecialIdentityStrings?: boolean;
  creatureScriptResRefs?: boolean;
  creatureDeathRemainsLootable?: 0 | 1;
}> = {}): { git: Buffer; gic: Buffer } {
  const profiles = [
    ["Creature List", 4], ["Door List", 8], ["Encounter List", 7],
    ["List", 0], ["Placeable List", 9], ["SoundList", 6],
    ["StoreList", 11], ["TriggerList", 1], ["WaypointList", 5],
  ] as const;
  const entries = (label: string, typeId: number): SupportedGffField["value"] => {
    if (
      label !== "Creature List" &&
      !(label === "Door List" && options.includeDoor) &&
      label !== "List" &&
      !(label === "Encounter List" && options.includeEncounter) &&
      !(label === "Placeable List" && options.includePlaceable) &&
      !(label === "SoundList" && options.includeSound) &&
      !(label === "StoreList" && options.includeStore) &&
      !(label === "TriggerList" && options.includeTrigger) &&
      !(label === "WaypointList" && options.includeWaypoint)
    ) return [];
    const creature = label === "Creature List";
    const door = label === "Door List";
    const item = label === "List";
    const encounter = label === "Encounter List";
    const placeable = label === "Placeable List";
    const sound = label === "SoundList";
    const store = label === "StoreList";
    const trigger = label === "TriggerList";
    const waypoint = label === "WaypointList";
    return [{
      typeId,
      fields: [
        { label: "TemplateResRef", type: "resref", value: creature ? "nw_guard" : door ? "nw_door" : encounter ? "x2_gnoll001" : placeable ? "plc_chest" : sound ? "animalcriesday" : store ? "x2_merc_dye" : trigger ? "newgeneric" : waypoint ? "nw_waypoint001" : "nw_sword" },
        { label: "Tag", type: "cexostring", value: creature ? "NW_GUARD" : door ? "DOOR" : encounter ? "X2_GNOLL001" : placeable ? "CHEST" : sound ? "AnimalCriesDay" : store ? "x2_merc_dye" : trigger ? "GenericTrigger" : waypoint ? "WAYPOINT" : "NW_SWORD" },
        ...(trigger ? [
          {
            label: "LocalizedName",
            type: "cexolocstring" as const,
            value: {
              strRef: 0xffff_ffff,
              entries: [{ languageId: 0, text: "Gate Trigger" }],
            },
          },
          { label: "OnDisarm", type: "resref" as const, value: "On_Disarm" },
          { label: "OnTrapTriggered", type: "resref" as const, value: "trg_trap" },
          { label: "OnClick", type: "resref" as const, value: "" },
          { label: "ScriptHeartbeat", type: "resref" as const, value: "trg_heartbeat" },
          { label: "ScriptOnEnter", type: "resref" as const, value: "trg_enter" },
          { label: "ScriptOnExit", type: "resref" as const, value: "trg_exit" },
          { label: "ScriptUserDefine", type: "resref" as const, value: "trg_user" },
          { label: "LinkedTo", type: "cexostring" as const, value: "east_gate" },
          { label: "LinkedToFlags", type: "byte" as const, value: 2 },
          { label: "LoadScreenID", type: "word" as const, value: 7 },
          { label: "AutoRemoveKey", type: "byte" as const, value: 0 },
          { label: "Faction", type: "dword" as const, value: 1 },
          { label: "Cursor", type: "byte" as const, value: 0 },
          { label: "HighlightHeight", type: "float" as const, value: 0 },
          { label: "KeyName", type: "cexostring" as const, value: "" },
          { label: "PortraitId", type: "word" as const, value: 0 },
          { label: "Type", type: "int" as const, value: 0 },
          { label: "TrapDetectable", type: "byte" as const, value: 1 },
          { label: "TrapDetectDC", type: "byte" as const, value: 0 },
          { label: "TrapDisarmable", type: "byte" as const, value: 1 },
          { label: "DisarmDC", type: "byte" as const, value: 15 },
          { label: "TrapFlag", type: "byte" as const, value: 0 },
          { label: "TrapOneShot", type: "byte" as const, value: 1 },
          { label: "TrapType", type: "byte" as const, value: 0 },
        ] : []),
        ...(waypoint ? [
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
        ...(creature ? [
          { label: "Interruptable", type: "byte" as const, value: 1 },
          { label: "FirstName", type: "cexolocstring" as const, value: {
            strRef: 0xffff_ffff,
            entries: options.creatureLocalizedStrings
              ? [
                  { languageId: 42, text: "Legacy" },
                  { languageId: 0, text: "Guard" },
                ]
              : [{ languageId: 0, text: "Guard" }],
          } },
          { label: "LastName", type: "cexolocstring" as const, value: {
            strRef: 0xffff_ffff,
            entries: [],
          } },
          { label: "Description", type: "cexolocstring" as const, value: {
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, text: "Old description" }],
          } },
          ...(options.includeCreatureAppearance
            ? [{ label: "Appearance_Type", type: "word" as const, value: 249 }]
            : []),
          ...(options.includeCreatureGender
            ? [{ label: "Gender", type: "byte" as const, value: 4 }]
            : []),
          ...(options.includeCreatureWalkRate
            ? [{ label: "WalkRate", type: "int" as const, value: 4 }]
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
          ...(options.includeCreatureAppearanceColors
            ? [
                { label: "Color_Skin", type: "byte" as const, value: 11 },
                { label: "Color_Hair", type: "byte" as const, value: 22 },
                { label: "Color_Tattoo1", type: "byte" as const, value: 33 },
                { label: "Color_Tattoo2", type: "byte" as const, value: 44 },
              ]
            : []),
          ...(options.includeCreatureBodyParts
            ? [
                { label: "ArmorPart_RFoot", type: "byte" as const, value: 12 },
                { label: "BodyPart_Torso", type: "byte" as const, value: 0 },
                { label: "xBodyPart_Torso", type: "word" as const, value: 4096 },
                { label: "xBodyPart_RShoul", type: "word" as const, value: 1023 },
              ]
            : []),
          ...(options.includeCreatureAppendages
            ? [
                { label: "Wings_New", type: "dword" as const, value: 1 },
                { label: "Wings", type: "byte" as const, value: 2 },
                { label: "Tail_New", type: "dword" as const, value: 3 },
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
          ...(options.includeCreatureDeathRemains
            ? [
                {
                  label: "Lootable",
                  type: "byte" as const,
                  value: options.creatureDeathRemainsLootable ?? 1,
                },
                { label: "BodyBag", type: "byte" as const, value: 0 },
                { label: "DecayTime", type: "dword" as const, value: 5000 },
              ]
            : []),
          ...(options.includeCreatureFaction
            ? [{ label: "FactionID", type: "word" as const, value: 1 }]
            : []),
          ...(options.creatureSpecialIdentityStrings
            ? [
                { label: "Subrace", type: "cexostring" as const, value: "Moon Elf" },
                { label: "Deity", type: "cexostring" as const, value: "" },
              ]
            : []),
          ...(options.creatureScriptResRefs
            ? [
                { label: "ScriptHeartbeat", type: "resref" as const, value: "NW_C2_DEFAULT1" },
                { label: "ScriptSpawn", type: "resref" as const, value: "nw_c2_default9" },
                { label: "ScriptDeath", type: "resref" as const, value: "nw_c2_default7" },
              ]
            : []),
        ] : []),
        ...(creature && options.includeCreatureEquipment ? [{
          label: "Conversation",
          type: "resref" as const,
          value: "Guard_Dialog",
        }, {
          label: "Equip_ItemList",
          type: "list" as const,
          value: [{
            typeId: 1,
            fields: [
              { label: "TemplateResRef", type: "resref" as const, value: "nw_helm001" },
              { label: "EquipmentProbe", type: "dword" as const, value: 0x12345678 },
            ],
          }],
        }] : []),
        ...(door ? [
          { label: "LinkedTo", type: "cexostring" as const, value: "OLD_DEST" },
          { label: "LinkedToFlags", type: "byte" as const, value: 1 },
          { label: "LoadScreenID", type: "word" as const, value: 0 },
        ] : []),
        ...(encounter
          ? [
              {
                label: "LocalizedName",
                type: "cexolocstring" as const,
                value: {
                  strRef: 0xffff_ffff,
                  entries: [{ languageId: 0, text: "Gnoll Ambush" }],
                },
              },
              { label: "Faction", type: "dword" as const, value: 1 },
              { label: "Difficulty", type: "int" as const, value: 1 },
              { label: "DifficultyIndex", type: "int" as const, value: 2 },
              {
                label: "CreatureList",
                type: "list" as const,
                value: [
                  {
                    typeId: 0,
                    fields: [
                      { label: "Appearance", type: "int" as const, value: 388 },
                      { label: "CR", type: "float" as const, value: 1 },
                      { label: "ResRef", type: "resref" as const, value: "nw_gnoll001" },
                      { label: "SingleSpawn", type: "byte" as const, value: 0 },
                    ],
                  },
                  {
                    typeId: 0,
                    fields: [
                      { label: "Appearance", type: "int" as const, value: 389 },
                      { label: "CR", type: "float" as const, value: 3 },
                      { label: "ResRef", type: "resref" as const, value: "nw_gnoll002" },
                      { label: "SingleSpawn", type: "byte" as const, value: 1 },
                    ],
                  },
                ],
              },
            ]
          : []),
        ...(item ? [
          { label: "BaseItem", type: "int" as const, value: 24 },
          { label: "ModelPart1", type: "word" as const, value: 66 },
        ] : []),
        ...(sound ? [
          { label: "Interval", type: "dword" as const, value: 25_000 },
          { label: "IntervalVrtn", type: "dword" as const, value: 5_000 },
          { label: "PitchVariation", type: "float" as const, value: Math.fround(0.2) },
          { label: "VolumeVrtn", type: "byte" as const, value: 64 },
          { label: "Volume", type: "byte" as const, value: 64 },
          { label: "Hours", type: "dword" as const, value: 0 },
          { label: "Times", type: "byte" as const, value: 3 },
          { label: "Active", type: "byte" as const, value: 1 },
          { label: "Random", type: "byte" as const, value: 0 },
          { label: "Continuous", type: "byte" as const, value: 1 },
          { label: "Looping", type: "byte" as const, value: 0 },
          { label: "Positional", type: "byte" as const, value: 1 },
          { label: "RandomPosition", type: "byte" as const, value: 0 },
          { label: "Elevation", type: "float" as const, value: 0 },
          { label: "MaxDistance", type: "float" as const, value: 14 },
          { label: "MinDistance", type: "float" as const, value: 2 },
          { label: "RandomRangeX", type: "float" as const, value: 0 },
          { label: "RandomRangeY", type: "float" as const, value: 0 },
          { label: "Priority", type: "byte" as const, value: 20 },
          {
            label: "Sounds",
            type: "list" as const,
            value: ["snd_a", "snd_b"].map((value) => ({
              typeId: 0,
              fields: [{ label: "Sound", type: "resref" as const, value }],
            })),
          },
        ] : []),
        ...(store ? [
          { label: "MarkUp", type: "int" as const, value: 100 },
          { label: "MarkDown", type: "int" as const, value: 65 },
          { label: "BlackMarket", type: "byte" as const, value: 0 },
          { label: "BM_MarkDown", type: "int" as const, value: 25 },
          { label: "IdentifyPrice", type: "int" as const, value: 100 },
          { label: "MaxBuyPrice", type: "int" as const, value: -1 },
          { label: "StoreGold", type: "int" as const, value: -1 },
          { label: "OnOpenStore", type: "resref" as const, value: "store_open" },
          { label: "OnStoreClosed", type: "resref" as const, value: "store_closed" },
          ...(options.includeStoreInventory ? [nativeStoreInventory()] : []),
        ] : []),
        ...(placeable ? [
          { label: "OnUsed", type: "resref" as const, value: "" },
          { label: "OnClick", type: "resref" as const, value: "" },
          { label: "OnOpen", type: "resref" as const, value: "old_open" },
          { label: "OnDisarm", type: "resref" as const, value: "" },
          { label: "OnTrapTriggered", type: "resref" as const, value: "old_trigger" },
          { label: "Plot", type: "byte" as const, value: 0 },
          { label: "HasInventory", type: "byte" as const, value: 0 },
          { label: "Hardness", type: "byte" as const, value: 5 },
          { label: "Fort", type: "byte" as const, value: 16 },
          { label: "Ref", type: "byte" as const, value: 0 },
          { label: "Will", type: "byte" as const, value: 0 },
          { label: "Conversation", type: "resref" as const, value: "" },
          { label: "Interruptable", type: "byte" as const, value: 1 },
          { label: "AnimationState", type: "byte" as const, value: 0 },
          { label: "Appearance", type: "dword" as const, value: 104 },
          { label: "TrapType", type: "byte" as const, value: 3 },
          { label: "BodyBag", type: "byte" as const, value: 0 },
          { label: "PortraitId", type: "word" as const, value: 462 },
          { label: "Faction", type: "dword" as const, value: 2 },
          {
            label: "LocName",
            type: "cexolocstring" as const,
            value: {
              strRef: 0xffff_ffff,
              entries: [{ languageId: 0, text: "Chest" }],
            },
          },
          {
            label: "Description",
            type: "cexolocstring" as const,
            value: {
              strRef: 0xffff_ffff,
              entries: [{ languageId: 0, text: "Storage" }],
            },
          },
          { label: "HP", type: "short" as const, value: 15 },
          { label: "CurrentHP", type: "short" as const, value: 15 },
          { label: "TrapFlag", type: "byte" as const, value: 0 },
          { label: "TrapDetectable", type: "byte" as const, value: 1 },
          { label: "TrapDisarmable", type: "byte" as const, value: 1 },
          { label: "TrapOneShot", type: "byte" as const, value: 1 },
          { label: "TrapDetectDC", type: "byte" as const, value: 0 },
          { label: "DisarmDC", type: "byte" as const, value: 15 },
          { label: "Locked", type: "byte" as const, value: 0 },
          { label: "Lockable", type: "byte" as const, value: 0 },
          { label: "AutoRemoveKey", type: "byte" as const, value: 0 },
          { label: "KeyRequired", type: "byte" as const, value: 0 },
          { label: "KeyName", type: "cexostring" as const, value: "" },
          { label: "OpenLockDC", type: "byte" as const, value: 18 },
          { label: "CloseLockDC", type: "byte" as const, value: 0 },
          ...(options.includePlaceableInventory ? [{
            label: "ItemList",
            type: "list" as const,
            value: [{
              typeId: 0,
              fields: [
                { label: "TemplateResRef", type: "resref" as const, value: "first_item" },
                { label: "Repos_PosX", type: "word" as const, value: 2 },
                { label: "Repos_Posy", type: "word" as const, value: 3 },
              ],
            }],
          }] : []),
          { label: "X", type: "float" as const, value: 40 },
          { label: "Y", type: "float" as const, value: 50 },
          { label: "Z", type: "float" as const, value: 0 },
          { label: "Bearing", type: "float" as const, value: 0 },
        ] : [
          ...(item ? [
            {
              label: "LocalizedName",
              type: "cexolocstring" as const,
              value: {
                strRef: 0xffff_ffff,
                entries: [{ languageId: 0, text: "Sword" }],
              },
            },
            {
              label: "Description",
              type: "cexolocstring" as const,
              value: { strRef: 0xffff_ffff, entries: [] },
            },
            {
              label: "DescIdentified",
              type: "cexolocstring" as const,
              value: {
                strRef: 0xffff_ffff,
                entries: [{ languageId: 0, text: "Known" }],
              },
            },
            { label: "PropertiesList", type: "list" as const, value: [] },
          ] : []),
          { label: "XPosition", type: "float" as const, value: creature ? 10 : door ? 40 : encounter ? 22.412015914916992 : sound ? 40 : store ? 42.91445541381836 : trigger ? 35.47599411010742 : waypoint ? 33.1162 : 30 },
          { label: "YPosition", type: "float" as const, value: creature ? 20 : door ? 50 : encounter ? 45.1970329284668 : sound ? 50 : store ? 50.39402770996094 : trigger ? 44.91108703613281 : waypoint ? 47.7472 : 40 },
          { label: "ZPosition", type: "float" as const, value: sound ? 1.5 : store ? 0.0000004999999987376214 : waypoint ? 3.5019426345825195 : 0 },
        ]),
        ...(creature || item || store || waypoint
          ? [
              { label: "XOrientation", type: "float" as const, value: store || waypoint ? 0 : 1 },
              { label: "YOrientation", type: "float" as const, value: store || waypoint ? 1 : 0 },
            ]
          : encounter
            ? [
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
              ]
          : trigger
            ? [
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
              ]
          : placeable || sound
            ? []
            : [{ label: "Bearing", type: "float" as const, value: 0 }]),
      ],
    }];
  };
  const gitFields: SupportedGffField[] = profiles.map(([label, typeId]) => ({
    label, type: "list", value: entries(label, typeId) as never,
  }));
  gitFields.push({
    label: "AreaProperties",
    type: "struct",
    value: {
      typeId: 100,
      fields: [
        { label: "AmbientSndDay", type: "int", value: 41 },
        { label: "AmbientSndNight", type: "int", value: 42 },
        { label: "AmbientSndDayVol", type: "int", value: 101 },
        { label: "AmbientSndNitVol", type: "int", value: 102 },
        { label: "EnvAudio", type: "int", value: 7 },
        { label: "MusicBattle", type: "int", value: 13 },
        { label: "MusicDay", type: "int", value: 11 },
        { label: "MusicNight", type: "int", value: 12 },
        { label: "MusicDelay", type: "int", value: 3000 },
      ],
    },
  });
  const gicFields: SupportedGffField[] = profiles.map(([label, typeId]) => ({
    label,
    type: "list",
    value: label === "Creature List" ||
              (label === "Door List" && options.includeDoor) ||
              (label === "Placeable List" && options.includePlaceable) ||
      (label === "Encounter List" && options.includeEncounter) ||
      (label === "SoundList" && options.includeSound) ||
      (label === "StoreList" && options.includeStore) ||
      (label === "TriggerList" && options.includeTrigger) ||
      (label === "WaypointList" && options.includeWaypoint) ||
      (label === "List" && !options.omitItemGic)
      ? [{
          typeId,
          fields: [
            ...(label === "SoundList"
              ? [{ label: "PlayInToolset", type: "byte" as const, value: 1 }]
              : []),
            { label: "Comment", type: "cexostring", value: label },
          ],
        }]
      : [],
  }));
  return {
    git: buildGffBuffer(gitFields, "GIT ", 0xffffffff),
    gic: buildGffBuffer(gicFields, "GIC ", 0xffffffff),
  };
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

function candidatePolygon(points: readonly (readonly [number, number, number])[]) {
  return {
    coordinateSpace: "native_local",
    points: points.map(([x, y, z]) => ({ x, y, z })),
  };
}

function tiles() {
  return [0, 1, 2, 3].map((index) => ({
    row: Math.floor(index / 2),
    col: index % 2,
    sourceRow: Math.floor(index / 2),
    sourceCol: index % 2,
    tileId: 12,
    orientation: index,
    height: 0,
    mainLight1: 0,
    mainLight2: 0,
    sourceLight1: 0,
    sourceLight2: 0,
    animLoop1: 1,
    animLoop2: 1,
    animLoop3: 1,
  }));
}

function areaAudioEnvironment() {
  return {
    ambientSoundDayId: 41,
    ambientSoundNightId: 42,
    ambientSoundDayVolume: 101,
    ambientSoundNightVolume: 102,
    environmentAudioId: 7,
    musicBattleId: 13,
    musicDayId: 11,
    musicNightId: 12,
    musicDelayMilliseconds: 3000,
  };
}

function resourceType(logicalKey: string): number {
  if (logicalKey.endsWith(".are")) return 2012;
  if (logicalKey.endsWith(".git")) return 2023;
  if (logicalKey.endsWith(".gic")) return 2046;
  return 2014;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
